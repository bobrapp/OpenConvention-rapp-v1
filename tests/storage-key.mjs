import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.BASE_URL || 'http://127.0.0.1:60804/R4%20Muse%20V1';
const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, executablePath });
const viewport = { width: 390, height: 844 };
const errors = [];

const openPage = async (storage = null) => {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  if (storage) {
    await page.addInitScript((values) => {
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
    }, storage);
  }
  await page.goto(base);
  await page.locator('#view').waitFor();
  await page.evaluate(() => document.querySelector('#alert-root')?.replaceChildren());
  return { context, page };
};

const readStorage = (page) => page.evaluate(() => ({
  muse: localStorage.getItem('r4-muse-v1'),
  legacy: localStorage.getItem('r4-networking-v1'),
  keys: Object.keys(localStorage),
}));

const fresh = await openPage();
await fresh.page.waitForFunction(() => localStorage.getItem('r4-muse-v1') !== null);
const freshStorage = await readStorage(fresh.page);
const seedState = JSON.parse(freshStorage.muse);
assert.ok(freshStorage.keys.includes('r4-muse-v1'));
assert.equal(freshStorage.legacy, null);
assert.equal(freshStorage.keys.includes('r4-networking-v1'), false);
assert.equal(freshStorage.keys.some((key) => key.startsWith('r4-networking-v1-demo-')), false);
await fresh.context.close();

const legacyState = structuredClone(seedState);
legacyState.me.name = 'Legacy Storage Attendee';
const legacyRaw = JSON.stringify(legacyState);
const migrated = await openPage({ 'r4-networking-v1': legacyRaw });
await migrated.page.getByRole('button', { name: 'settings' }).click();
const migratedName = migrated.page.locator('[data-form="settings"] input[name="name"]');
await migratedName.waitFor();
assert.equal(await migratedName.inputValue(), 'Legacy Storage Attendee');
const migratedStorage = await readStorage(migrated.page);
assert.equal(JSON.parse(migratedStorage.muse).me.name, 'Legacy Storage Attendee');
assert.equal(migratedStorage.legacy, legacyRaw, 'migration preserves legacy bytes');

await migrated.page.getByRole('dialog').getByRole('button', { name: 'português', exact: true }).click();
const changedStorage = await readStorage(migrated.page);
assert.equal(JSON.parse(changedStorage.muse).me.lang, 'pt', 'UI setting is saved to the Muse key');
assert.equal(changedStorage.legacy, legacyRaw, 'saving Muse settings leaves legacy bytes unchanged');
await migrated.context.close();

const museState = structuredClone(seedState);
museState.me.name = 'Muse Storage Attendee';
const existingMuseRaw = JSON.stringify(museState);
const differentLegacyState = structuredClone(seedState);
differentLegacyState.me.name = 'Legacy Different Attendee';
const differentLegacyRaw = JSON.stringify(differentLegacyState);
const precedence = await openPage({
  'r4-muse-v1': existingMuseRaw,
  'r4-networking-v1': differentLegacyRaw,
});
await precedence.page.getByRole('button', { name: 'settings' }).click();
const precedenceName = precedence.page.locator('[data-form="settings"] input[name="name"]');
await precedenceName.waitFor();
assert.equal(await precedenceName.inputValue(), 'Muse Storage Attendee');
const precedenceStorage = await readStorage(precedence.page);
assert.equal(JSON.parse(precedenceStorage.muse).me.name, 'Muse Storage Attendee');
assert.equal(precedenceStorage.legacy, differentLegacyRaw);
await precedence.context.close();

assert.deepEqual(errors, []);
await browser.close();
console.log('Muse storage-key ok: legacy migration and byte preservation, Muse-key precedence, UI persistence, fresh storage isolation');
