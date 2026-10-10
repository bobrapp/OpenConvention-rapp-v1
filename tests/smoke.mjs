import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.BASE_URL || 'http://127.0.0.1:60804/R4%20Muse%20V1';
const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(() => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { window.__copied = text; } } });
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(base);
assert.equal(await page.evaluate(() => document.documentElement.dataset.brand), 'slalom');
await page.getByRole('button', { name: 'settings' }).click();
await page.getByRole('radio', { name: 'AiGovOps' }).click();
assert.equal(await page.evaluate(() => document.documentElement.dataset.brand), 'aigovops');
await page.getByRole('button', { name: 'close' }).click();
await page.reload();
assert.equal(await page.evaluate(() => document.documentElement.dataset.brand), 'aigovops');
await page.getByRole('button', { name: 'agents', exact: true }).click();
await page.waitForTimeout(250);
const shareBase = await page.locator('meta[name="r4-share-base"]').getAttribute('content');
await page.locator('[data-action="agent-copy-link"]').click();
if (shareBase) assert.ok((await page.evaluate(() => window.__copied)).startsWith(shareBase));
assert.deepEqual(errors, []);
await browser.close();
console.log('Muse smoke ok: brand persistence, agents tab, no page errors');
