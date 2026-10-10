import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.BASE_URL || 'http://127.0.0.1:60804/R4%20Muse%20V1';
const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage();
await page.goto(base);
const missing = await page.evaluate(() => {
  const keys = ['design','Slalom','AiGovOps','receipts','agent receipts','verified on this device','signed device receipts; changes or missing records are detectable on this device. it is not a server-side immutable ledger.','verify','export ndjson + pem bundle','no receipts yet','receipt {n}','receipt verification','receipt verification failed at sequence {seq}: {reason}','sequence mismatch','chain mismatch','key mismatch','signature invalid','head missing','truncated','head mismatch','unknown verification error','settings saved','day start','day end'];
  return Object.fromEntries(['es','pt'].map((locale) => [locale, keys.filter((key) => !window.R4_I18N[locale]?.[key])]));
});
assert.deepEqual(missing, { es: [], pt: [] });
await browser.close();
console.log('Muse i18n ok: all new keys translated in es and pt');
