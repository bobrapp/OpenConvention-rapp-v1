import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { chromium } from 'playwright-core';

// WCAG 2.5.8 inline exception: anchors inside paragraphs are exempt; no other target-size exemptions apply.
const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const shots = process.env.SHOT_DIR || '/Users/devin/shots/brand-receipts-a11y';
mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox'],
});
const base = process.env.BASE_URL || 'http://127.0.0.1:8082/';
const tabs = ['today', 'backstage', 'people', 'agenda', 'meet', 'connect', 'pitch', 'report'];
const targetErrors = [];
const axeCheck = async (page, label) => {
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('#alert-root')?.replaceChildren());
  const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations);
  const serious = violations.filter((item) => ['serious', 'critical'].includes(item.impact));
  if (serious.length) targetErrors.push(`${label}: ${serious.map((x) => `${x.id}: ${x.nodes.map((n) => `${n.target.join(' ')} (${n.failureSummary?.replace(/\s+/g, ' ').trim()})`).join(', ')}`).join('; ')}`);
  const small = await page.evaluate(() => [...document.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="radio"], [role="switch"], [role="tab"], [data-action]')]
    .filter((el) => el.offsetParent && !el.closest('svg') && !(el.matches('a[href]') && el.closest('p')))
    .map((el) => { const r = el.getBoundingClientRect(); return { name: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 30) || el.tagName, width: r.width, height: r.height }; })
    .filter((el) => el.width < 43.9 || el.height < 43.9));
  if (small.length) targetErrors.push(`${label}: sub-44 targets ${JSON.stringify(small.slice(0, 12))}`);
};
const setBrand = async (page, brand) => {
  await page.locator('[data-action="open-settings"]').click();
  await page.locator(`.sheet [data-action="brand-select"][data-brand="${brand}"]`).click();
};
try {
  for (const brand of ['slalom', 'aigovops']) for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme });
    const page = await context.newPage();
    await page.addInitScript(() => {
      setInterval(() => document.querySelector('#alert-root .alert-pop')?.remove(), 250);
    });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#sheet-root .sheet');
    if (await page.locator('[data-form="charter"]').count()) {
      await page.locator('input[name="give"]').fill('facilitation');
      await page.locator('input[name="ask"]').fill('AI adoption');
      await page.locator('[data-action="charter-start"]').click();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('r4-networking-v2') || '{}').backstage?.onboarded);
    }
    await page.addScriptTag({ path: axePath });
    if (brand !== 'slalom') await setBrand(page, brand);
    else await page.locator('[data-action="open-settings"]').click();
    if (colorScheme === 'light') {
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(shots, `settings-picker-${brand}.png`) });
    }
    await axeCheck(page, `${brand}/${colorScheme}/settings`);
    await page.locator('[data-action="close-sheet"]').click();
    await page.locator('[data-tab="today"]').click();
    await page.waitForTimeout(400);
    if (brand === 'slalom' && colorScheme === 'light') await page.screenshot({ path: path.join(shots, 'now-slalom-light.png') });
    if (brand === 'aigovops' && colorScheme === 'light') await page.screenshot({ path: path.join(shots, 'now-aigovops-light.png') });
    if (brand === 'aigovops' && colorScheme === 'dark') await page.screenshot({ path: path.join(shots, 'now-aigovops-dark.png') });
    for (const tab of tabs) {
      await page.locator(`[data-tab="${tab}"]`).first().click();
      await axeCheck(page, `${brand}/${colorScheme}/${tab}`);
    }
    await page.locator('[data-action="open-settings"]').click();
    await axeCheck(page, `${brand}/${colorScheme}/settings sheet`);
    await page.locator('[data-action="close-sheet"]').click();
    await page.locator('[data-tab="backstage"]').click();
    await page.locator('[data-action="open-receipts"]').click();
    await page.waitForFunction(() => document.querySelector('.receipt-row') || document.querySelector('.receipt-entry'));
    await axeCheck(page, `${brand}/${colorScheme}/receipts`);
    if (brand === 'slalom' && colorScheme === 'light') {
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(shots, 'receipts.png') });
    }
    if (await page.locator('.receipt-row').count()) {
      const row = page.locator('.receipt-row').first();
      const rowTitle = await row.locator('b').innerText();
      const rowMeta = await row.locator('small > span').innerText();
      const accessibleName = await row.getAttribute('aria-label');
      assert.equal(accessibleName, `${rowTitle} ${rowMeta}`, 'receipt row accessible name is the title and metadata');
      assert.equal(await row.locator('.receipt-icon').getAttribute('aria-hidden'), 'true', 'receipt icon is decorative');
      const fingerprint = page.locator('code[title]').first();
      const fullFingerprint = await fingerprint.getAttribute('title');
      assert.match(await fingerprint.innerText(), /^SHA256:.{6}….{6}$/u, 'fingerprint display is abbreviated');
      assert.equal(await page.locator('[data-action="receipt-copy"]').first().getAttribute('data-value'), fullFingerprint, 'fingerprint copy retains full value');
      await row.click();
      assert.equal(await page.locator('#sheet-root .sheet-head h2').innerText(), rowTitle, 'receipt detail title is human-readable');
      assert.ok(await page.locator('.receipt-detail-header p').count(), 'receipt detail includes localized date and time');
      assert.ok(await page.locator('.receipt-field dt').filter({ hasText: 'ts_utc' }).count(), 'receipt detail retains raw ISO timestamp');
      assert.ok(await page.locator('.receipt-nested .receipt-field').count(), 'user and signature are rendered as nested fields');
      await axeCheck(page, `${brand}/${colorScheme}/receipt detail`);
      if (brand === 'slalom' && colorScheme === 'light') {
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(shots, 'receipt-detail.png') });
      }
      await page.locator('[data-action="close-sheet"]').click();
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const overflow = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      elements: [...document.querySelectorAll('body *')].map((el) => {
        const rect = el.getBoundingClientRect();
        return { tag: el.tagName.toLowerCase(), class: typeof el.className === 'string' ? el.className : '', text: el.textContent.trim().slice(0, 80), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), scrollWidth: el.scrollWidth };
      }).filter((el) => el.right > 390 || el.left < 0 || el.scrollWidth > el.width + 1).slice(0, 12),
    }));
    assert.ok(overflow.width <= 390, `${brand}/${colorScheme}: horizontal overflow at 200% (${overflow.width}px): ${JSON.stringify(overflow.elements)}`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const running = await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running').length);
    assert.equal(running, 0, `${brand}/${colorScheme}: running CSS animations under reduced motion`);
    await context.close();
  }
  assert.deepEqual(targetErrors, [], targetErrors.join('\n'));
  console.log('a11y ok: 4 brand/scheme combinations; tabs, settings, receipts, details; targets >=44px; no serious/critical axe findings; no 200% overflow or reduced-motion animations.');
} finally {
  await browser.close();
}
