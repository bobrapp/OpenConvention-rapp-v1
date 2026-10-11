import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:60805/';
for (const [id, name, count] of [['maya','Maya Torres',8],['diego','Diego Alvarez',10],['priya','Dr. Priya Natarajan',8]]) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('r4companion.v1', 'real-sentinel'));
  await page.goto(`${base}?demo=${id}`);
  await page.getByRole('region', { name: 'demo mode' }).waitFor();
  await page.waitForFunction((key) => !!localStorage.getItem(key), `r4companion.v1-demo-${id}`);
  assert.equal(await page.evaluate(() => localStorage.getItem('r4companion.v1')), 'real-sentinel');
  const state = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), `r4companion.v1-demo-${id}`);
  assert.equal(state.settings.me, name);
  assert.equal(state.people.length, count);
  await page.getByRole('button', { name: 'tour' }).click();
  const dialog = page.getByRole('dialog');
  for (const button of await dialog.getByRole('button', { name: 'show me' }).all()) {
    await button.click();
    assert.ok((await page.locator('#app').innerText().catch(() => page.locator('body').innerText())).trim().length > 0);
  }
  await page.getByRole('link', { name: 'exit demo' }).click();
  await page.waitForFunction(() => !new URL(location.href).searchParams.has('demo'));
  assert.equal(await page.evaluate(() => localStorage.getItem('r4companion.v1')), 'real-sentinel');
  await context.close();
}
await browser.close();
console.log('Claude persona demo: three personas, isolated keys, seeded counts, tour and exit passed');
