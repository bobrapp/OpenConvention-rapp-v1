import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

// Inline links inside paragraphs are excluded under WCAG 2.5.8; no other target-size exemptions apply.
const base = process.env.BASE_URL || 'http://127.0.0.1:60804/R4%20Muse%20V1';
const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto(base);
const dismissAlert = async () => {
  const close = page.locator('[data-action="alert-close"]');
  if (await close.count()) await close.click({ force: true });
};
await dismissAlert();
const axePath = new URL('./node_modules/axe-core/axe.min.js', import.meta.url).pathname;
await page.addScriptTag({ path: axePath });
await page.waitForFunction(() => !document.querySelector('.toast.show'));
const severeFindings = async () => (await page.evaluate(async () => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] } }))).violations.filter((v) => ['serious','critical'].includes(v.impact));
const checkTargets = async () => page.evaluate(() => [...document.querySelectorAll('button, a[href], [role="button"], [role="radio"], [role="switch"], [role="tab"], input:not([type="hidden"]), select, textarea')]
  .filter((el) => {
    if (el.matches('a[href]') && el.closest('p')) return false;
    const rect = el.getBoundingClientRect();
    return !el.matches(':disabled') && !el.closest('[hidden], [inert]') && rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
  }).map((el) => el.outerHTML));
const headerOverlaps = async () => page.evaluate(() => {
  const header = document.querySelector('.topbar');
  const groups = [header, header?.querySelector('.brand'), header?.querySelector('.topbar-right')].filter(Boolean)
    .map((parent) => [...parent.children].filter((el) => el.getClientRects().length));
  const overlaps = [];
  for (const group of groups) for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
    const a = group[i].getBoundingClientRect(), b = group[j].getBoundingClientRect();
    if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) {
      overlaps.push(`${group[i].className || group[i].tagName} / ${group[j].className || group[j].tagName}`);
    }
  }
  return overlaps;
});
const settingsTrigger = page.getByRole('button', { name: 'settings' });
await dismissAlert();
await settingsTrigger.click();
const dlg = page.getByRole('dialog');
assert.equal(await dlg.getAttribute('aria-modal'), 'true');
fs.mkdirSync('/Users/devin/shots/muse-brand', { recursive: true });
await page.screenshot({ path: '/Users/devin/shots/muse-brand/settings-slalom.png', fullPage: true });
assert.deepEqual(await severeFindings(), []);
assert.deepEqual(await checkTargets(), []);
await dismissAlert();
await page.getByRole('radio', { name: 'AiGovOps' }).click();
await page.screenshot({ path: '/Users/devin/shots/muse-brand/settings-aigovops.png', fullPage: true });
assert.deepEqual(await severeFindings(), []);
assert.deepEqual(await checkTargets(), []);
const close = page.getByRole('button', { name: 'close' });
const lastSettingsControl = page.getByRole('button', { name: 'start fresh (empty)' });
await lastSettingsControl.focus();
await page.keyboard.press('Tab');
assert.equal(await close.evaluate((el) => document.activeElement === el), true);
await close.focus();
await page.keyboard.press('Shift+Tab');
assert.equal(await lastSettingsControl.evaluate((el) => document.activeElement === el), true);
await page.keyboard.press('Escape');
assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'settings');
const textScale = await page.evaluate(() => {
  const elements = [document.documentElement, ...document.querySelectorAll('body *')];
  const sizes = elements.map((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  elements.forEach((el, index) => el.style.setProperty('font-size', `${sizes[index] * 2}px`, 'important'));
  return { before: sizes[0], after: Number.parseFloat(getComputedStyle(document.documentElement).fontSize) };
});
assert.ok(textScale.after >= textScale.before * 1.99, '200% text test doubles computed font sizes');
const reflowCheck = async (label) => {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${label} overflows at 390px with 200% text`);
  assert.deepEqual(await headerOverlaps(), [], `${label} header elements overlap at 200% text`);
  assert.deepEqual(await checkTargets(), [], `${label} has a target smaller than 44px at 200% text`);
};
for (const tab of ['prep', 'today', 'people', 'agenda', 'connect', 'agents', 'pitch fest', 'report']) {
  await dismissAlert();
  await page.getByRole('button', { name: tab, exact: true }).click();
  assert.deepEqual(await checkTargets(), [], `${tab} has a target smaller than 44px`);
  await reflowCheck(tab);
}
await dismissAlert();
await settingsTrigger.click();
await reflowCheck('settings sheet');
await page.getByRole('button', { name: 'close' }).click();
await dismissAlert();
await page.getByRole('button', { name: 'people', exact: true }).click();
await page.locator('[data-action="person"]').first().click();
assert.deepEqual(await checkTargets(), [], 'person detail sheet has a target smaller than 44px');
const personDialog = page.getByRole('dialog');
const personButtons = personDialog.locator('button:visible:not([disabled])');
const firstPersonButton = personButtons.first();
await personButtons.last().focus();
await page.keyboard.press('Tab');
assert.equal(await firstPersonButton.evaluate((el) => document.activeElement === el), true);
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'agents', exact: true }).click();
assert.deepEqual(await checkTargets(), [], 'Agents tab has a target smaller than 44px');
await page.screenshot({ path: '/Users/devin/shots/muse-brand/receipts.png', fullPage: true });
await browser.close();
console.log('Muse a11y ok: 390px, 200% text, modal focus, no serious/critical axe findings');
