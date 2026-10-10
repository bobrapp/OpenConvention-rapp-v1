// Set BEACON_VERIFY=/path/to/beacon_verify.py to run the optional independent verifier.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const base = process.env.BASE_URL || 'http://127.0.0.1:60804/R4%20Muse%20V1';
const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const secondPage = await context.newPage();
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
const dismissAlert = async () => {
  const close = page.locator('[data-action="alert-close"]');
  if (await close.count()) await close.click({ force: true });
};
const clickAfterAlert = async (locator) => {
  await dismissAlert();
  try { await locator.click({ timeout: 1000 }); }
  catch { await dismissAlert(); await locator.click(); }
};
await Promise.all([page.goto(base), secondPage.goto(base)]);
await dismissAlert();
await clickAfterAlert(page.getByRole('button', { name: 'settings' }));
await page.locator('[data-form="settings"] input[name="name"]').fill('Beacon Test');
await clickAfterAlert(page.locator('[data-form="settings"] button').last());
await clickAfterAlert(page.getByRole('button', { name: 'agents', exact: true }));
await clickAfterAlert(page.getByRole('button', { name: /let my agents network/i }));
await page.waitForTimeout(500);
await clickAfterAlert(page.locator('[data-action="receipts-verify"]'));
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
const beforeConcurrent = await page.evaluate(async () => (await window.R4Receipts.list()).length);
const concurrentWrites = [];
for (let i = 0; i < 10; i++) {
  concurrentWrites.push(page.evaluate((index) => window.R4Receipts.record('test.concurrent', 'muse.concurrent', { page: 1, index }, { ok: true }), i));
  concurrentWrites.push(secondPage.evaluate((index) => window.R4Receipts.record('test.concurrent', 'muse.concurrent', { page: 2, index }, { ok: true }), i));
}
assert.ok((await Promise.all(concurrentWrites)).every(Boolean));
const concurrentResult = await page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => { const req = indexedDB.open('r4-beacon-muse'); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  const keys = await new Promise((resolve, reject) => { const req = db.transaction('keys').objectStore('keys').getAll(); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  db.close();
  const rows = await window.R4Receipts.list();
  return { rows, verification: await window.R4Receipts.verify(), signingKeys: keys.filter((entry) => entry.id === 'signing') };
});
assert.equal(concurrentResult.verification.ok, true);
assert.equal(concurrentResult.rows.length, beforeConcurrent + 20);
assert.deepEqual(concurrentResult.rows.map((entry) => entry.seq), Array.from({ length: concurrentResult.rows.length }, (_, index) => index + 1));
assert.equal(concurrentResult.signingKeys.length, 1);
await page.waitForFunction((count) => document.querySelectorAll('.receipt-list .receipt-row').length === count, concurrentResult.rows.length);
assert.equal(await page.locator('.receipt-list .receipt-row').count(), concurrentResult.rows.length);
await secondPage.close();
if (process.env.BEACON_VERIFY) {
  const work = mkdtempSync(path.join(tmpdir(), 'r4-muse-beacon-'));
  try {
    const ndjsonPath = path.join(work, 'receipts.ndjson');
    const pemPath = path.join(work, 'public-key.pem');
    writeFileSync(ndjsonPath, result.exported.ndjson);
    writeFileSync(pemPath, result.exported.pem);
    const checked = spawnSync('python3', [process.env.BEACON_VERIFY, '--format=runtime', '--public-key', pemPath, ndjsonPath], { encoding: 'utf8' });
    assert.equal(checked.status, 0, `${checked.stdout}\n${checked.stderr}`);
    console.log(`beacon-verify: ${checked.stdout.trim()}`);
  } finally { rmSync(work, { recursive: true, force: true }); }
} else {
  console.log('beacon-verify step skipped (set BEACON_VERIFY=/path/to/beacon_verify.py)');
}
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
