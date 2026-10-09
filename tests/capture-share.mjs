import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.PAGES_URL || 'http://127.0.0.1:8090/';
const shots = '/Users/devin/shots/share';
await mkdir(shots, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox'],
});
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(base).origin });
const page = await context.newPage();
const dismissAlert = async () => page.evaluate(() => document.querySelector('.alert-pop')?.click());
const scrollFooterIntoView = async () => {
  await page.locator('#view .foundation-footer').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
};
await page.goto(base, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#share-qr svg');
assert.match(await page.locator('#v2-url').innerText(), /\/devin-v2\/$/);
assert.ok(await page.locator('.card-url').count(), 'live app cards should expose absolute URLs');
await page.screenshot({ path: path.join(shots, 'pages-390.png'), fullPage: false });
await page.locator('#v2-copy').click();
await page.waitForFunction(() => !document.querySelector('#share-feedback').hidden);
assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await page.locator('#v2-url').innerText());
await page.locator('#v2-share').click();
await page.waitForFunction(() => document.querySelector('#share-feedback').textContent === 'copied');
await page.evaluate(() => { document.querySelector('#share-feedback').hidden = true; });
await page.setViewportSize({ width: 1280, height: 800 });
await page.screenshot({ path: path.join(shots, 'pages-1280.png'), fullPage: false });

await page.setViewportSize({ width: 390, height: 844 });
const appUrl = new URL('devin-v2/', base).href;
await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#sheet-root .sheet');
await page.locator('input[name="give"]').fill('facilitation');
await page.locator('input[name="ask"]').fill('AI adoption');
await page.locator('[data-action="charter-start"]').click();
await page.waitForFunction(() => JSON.parse(localStorage.getItem('r4-networking-v2') || '{}').backstage?.onboarded);
await page.waitForFunction(() => !document.querySelector('#sheet-root .sheet'));
await page.emulateMedia({ colorScheme: 'light' });
await scrollFooterIntoView();
await dismissAlert();
await page.screenshot({ path: path.join(shots, 'app-footer-en-light.png'), fullPage: false });
assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 390), 'app footer should not overflow on mobile');

await dismissAlert();
await page.locator('[data-action="open-settings"]').click();
await page.locator('.foundation-about').scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
assert.equal(await page.locator('.foundation-about a[href="https://www.aigovops-foundation.com"]').count(), 1);
assert.equal(await page.locator('.foundation-about a[href="https://github.com/bobrapp/OpenConvention-rapp-v1"]').count(), 1);
await dismissAlert();
await page.screenshot({ path: path.join(shots, 'settings-about.png'), fullPage: false });
await page.locator('#sheet-root [data-action="set-lang"][data-lang="es"]').evaluate((el) => el.click());
await page.locator('[data-action="close-sheet"]').first().evaluate((el) => el.click());
await dismissAlert();
await page.emulateMedia({ colorScheme: 'dark' });
await scrollFooterIntoView();
assert.match(await page.locator('#view .foundation-footer').innerText(), /código abierto/i);
await page.screenshot({ path: path.join(shots, 'app-footer-es-dark.png'), fullPage: false });
assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 390), 'translated app footer should not overflow on mobile');

await browser.close();
console.log(`share screenshots saved to ${shots}`);
