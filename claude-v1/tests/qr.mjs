import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import fs from 'node:fs';
import { offline, browserArgs } from './offline.mjs';

const seed = JSON.parse(fs.readFileSync(new URL('../examples/examples.json', import.meta.url), 'utf8'));
seed.settings.agent = { name: 'Synthetic local agent', principal: 'Synthetic owner', org: 'Synthetic team', can: 'Plan meetings' };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: browserArgs });
for (const mode of ['available', 'missing', 'error']) {
  const context = await browser.newContext(), problems = [];
  await offline(context, problems);
  const page = await context.newPage();
  page.on('pageerror', error => problems.push(error.message));
  await page.addInitScript(seed => localStorage.setItem('r4companion.v1', JSON.stringify(seed)), seed);
  await page.goto(new URL('../index.html', import.meta.url).href);
  await page.click('[data-tab=people]');
  await page.click('[data-mode=agents]');
  await page.evaluate(mode => {
    if (mode === 'missing') window.qrcode = undefined;
    else if (mode === 'error') window.qrcode = () => { throw new Error('Synthetic QR generation failure'); };
    else {
      const native = window.qrcode;
      window.qrcode = Object.assign((...args) => {
        const qr = native(...args), add = qr.addData;
        qr.addData = (text, ...rest) => { window.syntheticQRPayload = text; return add(text, ...rest); };
        return qr;
      }, native);
    }
  }, mode);
  await page.click('[data-act=showCard]');
  if (mode === 'available') {
    const result = await page.evaluate(() => ({ path: document.querySelector('#sheet-body .qr svg path')?.getAttribute('d'), payload: window.syntheticQRPayload }));
    assert.ok(result.path?.length > 1000 && result.payload.includes('Synthetic local agent'), 'actual local generator must encode the card into a nonempty QR matrix');
    assert.equal(await page.locator('[data-qr-unavailable]').count(), 0);
  } else {
    assert.match(await page.locator('[data-qr-unavailable]').innerText(), /Copy the card text/);
    assert.equal(await page.locator('#sheet-body [data-act=copyCard]').count(), 1);
  }
  assert.deepEqual(problems, []);
  await context.close();
}
await browser.close();
console.log('3 QR scenarios passed (local generator, missing library, generation error)');
