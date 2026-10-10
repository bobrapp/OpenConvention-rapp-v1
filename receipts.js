'use strict';
(() => {
  const DB_NAME = 'r4-beacon';
  const ZERO = '0'.repeat(64);
  const encoder = new TextEncoder();
  let dbPromise;
  let keyPromise;
  let queue = Promise.resolve();
  const keyState = { logged: false };
  const withLock = (fn) => navigator.locks?.request ? navigator.locks.request(`${DB_NAME}-write`, fn) : fn();
  const withKeyLock = (fn) => navigator.locks?.request ? navigator.locks.request(`${DB_NAME}-key`, fn) : fn();
  const changeChannel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(`${DB_NAME}-changes`);
  changeChannel?.addEventListener('message', () => window.dispatchEvent(new CustomEvent('r4-receipts-changed')));
  const announceChanged = () => {
    window.dispatchEvent(new CustomEvent('r4-receipts-changed'));
    changeChannel?.postMessage('changed');
  };

  const jcs = (value) => {
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new TypeError('non-finite JCS number');
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) return `[${value.map(jcs).join(',')}]`;
    if (typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${jcs(value[key])}`).join(',')}}`;
    throw new TypeError('unsupported JCS value');
  };
  const hex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const sha = async (value) => {
    const bytes = value instanceof ArrayBuffer || ArrayBuffer.isView(value)
      ? value
      : encoder.encode(typeof value === 'string' ? value : jcs(value));
    return hex(await crypto.subtle.digest('SHA-256', bytes));
  };
  const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
  const fromB64 = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  const ulid = () => {
    let value = BigInt(Date.now()) << 80n;
    const random = crypto.getRandomValues(new Uint8Array(10));
    let randomValue = 0n;
    random.forEach((b) => { randomValue = (randomValue << 8n) | BigInt(b); });
    value |= randomValue;
    let out = '';
    const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    for (let i = 0; i < 26; i++) { out = chars[Number(value & 31n)] + out; value >>= 5n; }
    return out;
  };
  const openDb = () => {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('keys')) db.createObjectStore('keys', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('receipts')) db.createObjectStore('receipts', { keyPath: 'seq' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  };
  const request = (store, method, value) => openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(store, method === 'getAll' || method === 'count' ? 'readonly' : 'readwrite');
    const req = value === undefined ? tx.objectStore(store)[method]() : tx.objectStore(store)[method](value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
  const getOrCreateKey = () => {
    if (!keyPromise) keyPromise = withKeyLock(async () => {
      const found = await request('keys', 'get', 'signing');
      if (found) return found;
      const device = await request('keys', 'get', 'device');
      const deviceId = device?.value || ulid().toLowerCase();
      if (!device) await request('keys', 'put', { id: 'device', value: deviceId });
      try {
        const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify']);
        const rawPublicKey = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
        const record = { id: 'signing', keyKind: 'hardware', privateKey: pair.privateKey, publicKey: pair.publicKey, rawPublicKey };
        await request('keys', 'put', record);
        return { ...record, created: true };
      } catch (error) {
        if (!window.nacl?.sign?.keyPair) throw error;
        const pair = window.nacl.sign.keyPair();
        const record = { id: 'signing', keyKind: 'software', secretKey: pair.secretKey, rawPublicKey: pair.publicKey };
        await request('keys', 'put', record);
        return { ...record, created: true };
      }
    });
    return keyPromise;
  };
  const fingerprint = async (key) => `SHA256:${b64(await crypto.subtle.digest('SHA-256', key.rawPublicKey)).replace(/=+$/, '')}`;
  const sign = async (key, bytes) => key.keyKind === 'hardware'
    ? new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, key.privateKey, bytes))
    : window.nacl.sign.detached(bytes, key.secretKey);
  const verifySignature = async (key, bytes, signature) => {
    if (key.keyKind === 'hardware') return crypto.subtle.verify({ name: 'Ed25519' }, key.publicKey, signature, bytes);
    return window.nacl.sign.detached.verify(bytes, signature, key.rawPublicKey);
  };
  const pem = async (key) => {
    let der;
    if (key.keyKind === 'hardware') der = new Uint8Array(await crypto.subtle.exportKey('spki', key.publicKey));
    else {
      const prefix = Uint8Array.from([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00]);
      der = new Uint8Array(prefix.length + key.rawPublicKey.length); der.set(prefix); der.set(key.rawPublicKey, prefix.length);
    }
    const encoded = b64(der).match(/.{1,64}/g).join('\n');
    return `-----BEGIN PUBLIC KEY-----\n${encoded}\n-----END PUBLIC KEY-----`;
  };
  const fullReceipts = () => request('receipts', 'getAll').then((all) => all.sort((a, b) => a.seq - b.seq));
  async function writeReceipt(key, eventType, action, options = {}) {
    const entries = await fullReceipts();
    const previous = entries.at(-1);
    const head = JSON.parse(localStorage.getItem('r4-beacon-head') || 'null');
    const previousHash = previous ? await sha(jcs(previous)) : ZERO;
    if ((head && (head.seq !== entries.length || head.sha256 !== previousHash)) || (!head && entries.length)) {
      throw new Error('Beacon receipt chain head does not match stored receipts');
    }
    const body = {
      id: ulid(), ts_utc: new Date().toISOString(),
      user: { sub: `device:${(await request('keys', 'get', 'device')).value}`, email: null, oidc_issuer: 'local-device' },
      vendor: 'in-house', model: 'r4-backstage-agent', version: 'r4-backstage-agent-2026.10.1',
      prompt: null, prompt_hash: `sha256:${options.promptHash || await sha(options.prompt ?? null)}`,
      result: null, result_hash: `sha256:${options.resultHash || await sha(options.result ?? null)}`,
      event_type: eventType, environment: 'edge',
      profile: 'aigovops-beacon.v1', schema_version: 'r4-beacon-receipt.v1', app: 'devin',
      seq: entries.length + 1, prev_receipt_sha256: previousHash,
      action,
    };
    if (options.latencyMs != null) body.latency_ms = options.latencyMs;
    if (options.parentReceiptId) body.parent_receipt_id = options.parentReceiptId;
    if (options.threadId) body.thread_id = options.threadId;
    const sig = await sign(key, encoder.encode(jcs(body)));
    body.signature = { alg: 'Ed25519', key_fpr: await fingerprint(key), sig_b64: b64(sig), canonical_form: 'json/c14n-rfc8785' };
    await request('receipts', 'put', body);
    const chainHead = await sha(jcs(body));
    localStorage.setItem('r4-beacon-head', JSON.stringify({ seq: body.seq, sha256: chainHead }));
    return body;
  }
  const ensureKey = async () => {
    const key = await getOrCreateKey();
    if (!keyState.logged) {
      const receiptCount = await request('receipts', 'count');
      const head = JSON.parse(localStorage.getItem('r4-beacon-head') || 'null');
      if (key.created || (receiptCount === 0 && !head)) {
        keyState.logged = true;
        try {
          await writeReceipt(key, 'key.rotated', 'key.created', { result: 'first signing key created' });
          announceChanged();
        } catch (error) {
          keyState.logged = false;
          throw error;
        }
      } else if (receiptCount > 0 || head) {
        keyState.logged = true;
      }
    }
    return key;
  };
  const append = (eventType, action, options = {}) => {
    queue = queue.then(() => withLock(async () => {
      const key = await ensureKey();
      const receipt = await writeReceipt(key, eventType, action, options);
      announceChanged();
      return receipt;
    })).catch((error) => { console.warn('Beacon receipt write failed', error); return null; });
    return queue;
  };
  const record = (eventType, action, prompt, result, options = {}) => Promise.all([
    sha(jcs(prompt ?? null)), sha(typeof result === 'string' ? result : jcs(result ?? null)),
  ]).then(([promptHash, resultHash]) => append(eventType, action, { ...options, promptHash, resultHash }));
  async function verify() {
    await queue;
    return withLock(async () => {
    const entries = await fullReceipts();
    const key = await ensureKey();
    const keyFpr = await fingerprint(key);
    let firstBadSeq = null, reason = null, previousHash = ZERO;
    const verifierKey = key.keyKind === 'hardware' ? key.publicKey : await crypto.subtle.importKey('raw', key.rawPublicKey, { name: 'Ed25519' }, true, ['verify']).catch(() => null);
    for (let i = 0; i < entries.length; i++) {
      const receipt = entries[i];
      const { signature, ...body } = receipt;
      const signatureOk = verifierKey
        ? await crypto.subtle.verify({ name: 'Ed25519' }, verifierKey, fromB64(signature.sig_b64), encoder.encode(jcs(body))).catch(() => false)
        : window.nacl?.sign?.detached?.verify(encoder.encode(jcs(body)), fromB64(signature.sig_b64), key.rawPublicKey);
      if (receipt.seq !== i + 1) { firstBadSeq = receipt.seq; reason = 'sequence-mismatch'; break; }
      if (receipt.prev_receipt_sha256 !== previousHash) { firstBadSeq = receipt.seq; reason = 'chain-mismatch'; break; }
      if (signature.key_fpr !== keyFpr) { firstBadSeq = receipt.seq; reason = 'key-mismatch'; break; }
      if (!signatureOk) { firstBadSeq = receipt.seq; reason = 'signature-invalid'; break; }
      previousHash = await sha(jcs(receipt));
    }
    const head = JSON.parse(localStorage.getItem('r4-beacon-head') || 'null');
    if (firstBadSeq == null && !head && entries.length) { firstBadSeq = entries.length; reason = 'head-missing'; }
    else if (firstBadSeq == null && head && head.seq > entries.length) { firstBadSeq = entries.length + 1; reason = 'truncated'; }
    else if (firstBadSeq == null && head && (head.seq !== entries.length || head.sha256 !== previousHash)) { firstBadSeq = Math.max(1, entries.length); reason = 'head-mismatch'; }
    return { ok: firstBadSeq == null, count: entries.length, keyFpr, keyKind: key.keyKind, firstBadSeq, reason };
    });
  }
  async function exportData() {
    await append('bundle.signed', 'bundle.exported', { result: 'signed receipt export' });
    const entries = await fullReceipts(), key = await withLock(ensureKey), verification = await verify();
    const publicKeyPem = await pem(key);
    return {
      ndjson: entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n',
      pem: publicKeyPem,
      bundle: JSON.stringify({ manifest: { format: 'r4-beacon-bundle.v1', app: 'devin', created: new Date().toISOString(), count: entries.length, head_sha256: verification.ok ? JSON.parse(localStorage.getItem('r4-beacon-head') || '{}').sha256 : '', public_key_pem: publicKeyPem, key_fpr: verification.keyFpr }, receipts: entries }, null, 2),
    };
  }
  window.R4Receipts = {
    init: () => withLock(ensureKey),
    append, record, jcs, sha256: (value) => sha(typeof value === 'string' ? value : jcs(value)),
    verify, list: fullReceipts,
    get: async (id) => (await fullReceipts()).find((item) => item.id === id || item.seq === Number(id)),
    keyInfo: () => withLock(async () => { const key = await ensureKey(); return { keyFpr: await fingerprint(key), keyKind: key.keyKind, publicKeyPem: await pem(key) }; }),
    exportData,
  };
})();
