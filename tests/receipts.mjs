import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const base = process.env.BASE_URL || 'http://127.0.0.1:8082/';
try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.R4Receipts);
  if (await page.locator('[data-form="charter"]').count()) {
    await page.locator('input[name="give"]').fill('facilitation');
    await page.locator('input[name="ask"]').fill('AI adoption');
    await page.locator('[data-action="charter-start"]').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('r4-networking-v2') || '{}').backstage?.onboarded);
  }
  await page.evaluate(async () => {
    await R4Receipts.init();
    let parentReceiptId;
    for (let i = 0; i < 24; i++) {
      const event = i === 7 ? 'gate.failed' : i === 8 || i === 9 ? 'gate.evaluated' : 'inference.observed';
      const action = i === 7 ? 'charter.injection-blocked' : i === 8 ? 'consent.mutual' : i === 9 ? 'charter.check' : i === 10 ? 'followup.drafted' : 'a2a.message';
      const receipt = await R4Receipts.record(event, action, { index: i, envelope: 'message/send' }, `result-${i}`, { threadId: 'thread-test', parentReceiptId });
      parentReceiptId = receipt.id;
    }
  });
  const before = await page.evaluate(() => R4Receipts.verify());
  assert.equal(before.ok, true, JSON.stringify(before));
  assert.ok(before.count >= 25, `expected 20+ receipts, got ${before.count}`);
  const sample = await page.evaluate(() => R4Receipts.list());
  assert.ok(['a2a.message', 'consent.mutual', 'charter.injection-blocked', 'followup.drafted'].every((action) => sample.some((receipt) => receipt.action === action)));
  assert.equal(sample[0].profile, 'aigovops-beacon.v1');
  assert.equal(sample[0].schema_version, 'r4-beacon-receipt.v1');
  assert.match(sample[0].signature.key_fpr, /^SHA256:/);
  assert.equal(sample[0].signature.canonical_form, 'json/c14n-rfc8785');
  assert.ok(sample.some((receipt) => receipt.parent_receipt_id));
  const exported = await page.evaluate(() => R4Receipts.exportData());
  const work = mkdtempSync(path.join(tmpdir(), 'r4-beacon-test-'));
  try {
    const ndjsonPath = path.join(work, 'receipts.ndjson');
    const pemPath = path.join(work, 'public-key.pem');
    writeFileSync(ndjsonPath, exported.ndjson);
    writeFileSync(pemPath, exported.pem);
    const result = spawnSync('python3', [
      '/Users/devin/refs/aigovops-beacon/src/beacon_verify.py', '--format=runtime', '--public-key', pemPath, ndjsonPath,
    ], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    console.log(`beacon_verify.py:\n${result.stdout.trim()}`);
  } finally { rmSync(work, { recursive: true, force: true }); }
  for (let iteration = 0; iteration < 5; iteration++) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const [first, second] = await Promise.all([context.newPage(), context.newPage()]);
    await Promise.all([first.goto(base, { waitUntil: 'domcontentloaded' }), second.goto(base, { waitUntil: 'domcontentloaded' })]);
    await Promise.all([first.waitForFunction(() => window.R4Receipts), second.waitForFunction(() => window.R4Receipts)]);
    await Promise.all([
      first.evaluate(() => R4Receipts.record('test.concurrent', 'devin.first-launch.a', { iteration: 0 }, { ok: true })),
      second.evaluate(() => R4Receipts.record('test.concurrent', 'devin.first-launch.b', { iteration: 0 }, { ok: true })),
    ]);
    const fresh = await first.evaluate(async () => {
      const entries = await R4Receipts.list();
      const db = await new Promise((resolve, reject) => { const r = indexedDB.open('r4-beacon'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
      const keys = await new Promise((resolve, reject) => { const r = db.transaction('keys', 'readonly').objectStore('keys').getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
      return { entries, keys, verification: await R4Receipts.verify() };
    });
    assert.equal(fresh.entries[0].seq, 1); assert.equal(fresh.entries[0].action, 'key.created');
    assert.equal(fresh.entries.filter((r) => r.action === 'key.created').length, 1);
    assert.deepEqual(fresh.entries.map((r) => r.seq), fresh.entries.map((_r, i) => i + 1));
    assert.equal(fresh.keys.filter((key) => key.id === 'signing').length, 1);
    assert.equal(fresh.keys.filter((key) => key.id === 'device').length, 1);
    assert.equal(fresh.verification.ok, true);
    await context.close();
  }
  console.log('first-launch concurrency ok: five fresh two-page contexts; key.created seq 1; contiguous; one signing key; verify ok');
  const shared = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const [listPage, writePage] = await Promise.all([shared.newPage(), shared.newPage()]);
  await Promise.all([listPage.goto(base, { waitUntil: 'domcontentloaded' }), writePage.goto(base, { waitUntil: 'domcontentloaded' })]);
  await Promise.all([listPage.waitForFunction(() => window.R4Receipts), writePage.waitForFunction(() => window.R4Receipts)]);
  await Promise.all([listPage, writePage].map((tab) => tab.evaluate(() => R4Receipts.init())));
  if (await listPage.locator('[data-form="charter"]').count()) {
    await listPage.locator('input[name="give"]').fill('facilitation');
    await listPage.locator('input[name="ask"]').fill('AI adoption');
    await listPage.locator('[data-action="charter-start"]').click();
    await listPage.keyboard.press('Escape');
  }
  await listPage.locator('[data-tab="backstage"]').click();
  await listPage.locator('[data-action="open-receipts"]').click();
  await listPage.waitForSelector('.receipt-row');
  const expectedCount = (await listPage.evaluate(() => R4Receipts.list().then((entries) => entries.length))) + 3;
  await Promise.all([0, 1, 2].map((i) => writePage.evaluate((index) => R4Receipts.record('test.cross-tab', `devin.cross-tab.${index}`, { index }, { ok: true }), i)));
  await listPage.waitForFunction(async (expected) => {
    const matches = async () => document.querySelectorAll('.receipt-row').length === expected && (await R4Receipts.list()).length === expected;
    if (!await matches()) return false;
    await new Promise((resolve) => setTimeout(resolve, 500));
    return matches();
  }, expectedCount, { timeout: 1500 });
  await shared.close();
  console.log('cross-tab refresh ok: receipts list matched 3 remote writes without interaction');
  const original = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('r4-beacon');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('receipts', 'readonly');
      const request = tx.objectStore('receipts').get(3);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
  await page.evaluate(async (receipt) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('r4-beacon');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('receipts', 'readwrite');
      tx.objectStore('receipts').put({ ...receipt, action: 'tampered' });
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
  }, original);
  const tampered = await page.evaluate(() => R4Receipts.verify());
  assert.equal(tampered.ok, false);
  assert.equal(tampered.firstBadSeq, 3);
  await page.evaluate(async (receipt) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('r4-beacon');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('receipts', 'readwrite');
      tx.objectStore('receipts').put(receipt);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
  }, original);
  assert.equal((await page.evaluate(() => R4Receipts.verify())).ok, true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.R4Receipts);
  const afterReload = await page.evaluate(async () => ({ verification: await R4Receipts.verify(), key: (await R4Receipts.keyInfo()).keyFpr }));
  assert.equal(afterReload.verification.ok, true, 'receipts survive reload');
  assert.equal(afterReload.verification.count, exported.bundle ? sample.length + 1 : sample.length);
  assert.equal(afterReload.key, before.keyFpr, 'signing key survives reload');
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-action="open-settings"]').click();
  await page.locator('.sheet [data-action="clear-all"]').click();
  const persisted = await page.evaluate(async () => ({ count: (await R4Receipts.list()).length, key: (await R4Receipts.keyInfo()).keyFpr }));
  assert.equal(persisted.key, before.keyFpr);
  assert.equal(persisted.count, afterReload.verification.count, 'app reset preserves receipts');
  assert.equal((await page.evaluate(() => R4Receipts.verify())).ok, true);
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('r4-beacon');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const count = await new Promise((resolve, reject) => {
      const tx = db.transaction('receipts', 'readonly');
      const request = tx.objectStore('receipts').count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('receipts', 'readwrite');
      tx.objectStore('receipts').delete(count);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
  });
  const truncated = await page.evaluate(() => R4Receipts.verify());
  assert.equal(truncated.ok, false);
  assert.equal(truncated.reason, 'truncated');
  assert.equal(truncated.firstBadSeq, persisted.count);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.R4Receipts);
  const afterTruncationReload = await page.evaluate(async () => ({ verification: await R4Receipts.verify(), key: (await R4Receipts.keyInfo()).keyFpr }));
  assert.equal(afterTruncationReload.verification.ok, false, 'truncation remains detectable after reload');
  assert.equal(afterTruncationReload.key, before.keyFpr);
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('r4-beacon');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('receipts', 'readwrite');
      tx.objectStore('receipts').clear();
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
    db.close();
    localStorage.removeItem('r4-beacon-head');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(async () => { const rows = await R4Receipts.list(); return rows.length === 1 && rows[0].seq === 1 && rows[0].action === 'key.created'; });
  const recovered = await page.evaluate(() => R4Receipts.record('test.recovery', 'devin.recovered-action', {}, { ok: true }));
  assert.equal(recovered.seq, 2);
  assert.equal((await page.evaluate(() => R4Receipts.verify())).ok, true);
  console.log('interrupted first launch recovery ok: key.created seq 1; action seq 2; verify ok');
  console.log(`receipts ok: ${persisted.count} persisted; tamper seq ${tampered.firstBadSeq}; truncation seq ${truncated.firstBadSeq}; key ${persisted.key}`);
} finally {
  await browser.close();
}
