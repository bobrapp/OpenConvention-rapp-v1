import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const base = process.env.BASE_URL || 'http://127.0.0.1:60804/R4%20Muse%20V1';
const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(() => {
  window.__beaconLegacyTouches = [];
  for (const method of ['getItem', 'setItem', 'removeItem']) {
    const original = Storage.prototype[method];
    Storage.prototype[method] = function (key, ...args) {
      if (key === 'r4-beacon-head') window.__beaconLegacyTouches.push(`${method}:${key}`);
      return original.call(this, key, ...args);
    };
  }
  const open = IDBFactory.prototype.open;
  IDBFactory.prototype.open = function (name, ...args) {
    if (name === 'r4-beacon') window.__beaconLegacyTouches.push(`open:${name}`);
    return open.call(this, name, ...args);
  };
});
await page.goto(base);
await page.getByRole('button', { name: 'settings' }).click();
await page.locator('[data-form="settings"] input[name="name"]').fill('Beacon Test');
await page.locator('[data-form="settings"] button').last().click();
await page.getByRole('button', { name: 'agents', exact: true }).click();
await page.getByRole('button', { name: /let my agents network/i }).click();
await page.waitForTimeout(500);
await page.locator('[data-action="receipts-verify"]').click();
await page.waitForFunction(() => document.querySelector('#receipts-status')?.textContent.startsWith('OK'));
const result = await page.evaluate(async () => {
  const rows = await window.R4Receipts.list();
  const verification = await window.R4Receipts.verify();
  const exported = await window.R4Receipts.exportData();
  return { rows, verification, exported, dbs: await indexedDB.databases() };
});
assert.ok(result.rows.some((r) => r.event_type === 'a2a.message'));
assert.ok(result.rows.some((r) => r.action === 'settings.saved'));
assert.ok(result.rows.some((r) => r.action === 'key.created'));
assert.ok(result.rows.every((r) => r.app === 'muse'));
assert.equal(result.verification.ok, true);
assert.equal(JSON.parse(result.exported.bundle).manifest.app, 'muse');
assert.ok(result.exported.ndjson.includes('"action":"bundle.exported"'));
assert.equal(result.dbs.some((x) => x.name === 'r4-beacon'), false);
assert.deepEqual(await page.evaluate(() => window.__beaconLegacyTouches), []);
const work = mkdtempSync(path.join(tmpdir(), 'r4-muse-beacon-'));
try {
  const ndjsonPath = path.join(work, 'receipts.ndjson');
  const pemPath = path.join(work, 'public-key.pem');
  writeFileSync(ndjsonPath, result.exported.ndjson);
  writeFileSync(pemPath, result.exported.pem);
  const checked = spawnSync('python3', [new URL('./beacon_verify.py', import.meta.url).pathname, '--format=runtime', '--public-key', pemPath, ndjsonPath], { encoding: 'utf8' });
  assert.equal(checked.status, 0, `${checked.stdout}\n${checked.stderr}`);
  console.log(`beacon-verify: ${checked.stdout.trim()}`);
} finally { rmSync(work, { recursive: true, force: true }); }
const tampered = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const req = indexedDB.open('r4-beacon-muse'); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
    const receipt = await new Promise((resolve, reject) => { const req = db.transaction('receipts').objectStore('receipts').get(2); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
    await new Promise((resolve, reject) => { const tx = db.transaction('receipts', 'readwrite'); tx.objectStore('receipts').put({ ...receipt, action: 'tampered' }); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    db.close();
    return window.R4Receipts.verify();
  });
assert.equal(tampered.ok, false);
assert.equal(tampered.firstBadSeq, 2);
await page.evaluate(async (original) => {
  const db = await new Promise((resolve, reject) => { const req = indexedDB.open('r4-beacon-muse'); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  await new Promise((resolve, reject) => { const tx = db.transaction('receipts', 'readwrite'); tx.objectStore('receipts').put(original); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
  db.close();
}, result.rows.find((r) => r.seq === 2));
const truncated = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const req = indexedDB.open('r4-beacon-muse'); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
    const entries = await new Promise((resolve, reject) => { const req = db.transaction('receipts').objectStore('receipts').getAll(); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
    const last = entries.at(-1).seq;
    await new Promise((resolve, reject) => { const tx = db.transaction('receipts', 'readwrite'); tx.objectStore('receipts').delete(last); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    db.close();
    return window.R4Receipts.verify();
  });
assert.equal(truncated.ok, false);
assert.equal(truncated.reason, 'truncated');
assert.equal(await page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => { const r = indexedDB.open('r4-beacon-muse'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const entries = await new Promise((resolve, reject) => { const r = db.transaction('receipts').objectStore('receipts').getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  db.close(); return entries.length > 1;
}), true);
await browser.close();
console.log(`Muse receipts ok: ${result.rows.length} signed records; tamper seq ${tampered.firstBadSeq}; truncation seq ${truncated.firstBadSeq}; storage isolated`);
