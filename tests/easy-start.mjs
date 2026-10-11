import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const shots = '/Users/devin/design-review/devin-build';
mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox'],
});
const base = process.env.BASE_URL || 'http://127.0.0.1:60802/';
const groupFor = (id) => ({ today: 'today', people: 'people', meet: 'people', connect: 'people', agenda: 'agenda', pitch: 'agenda', backstage: 'backstage', report: 'backstage', receipts: 'backstage' })[id];
const freshPage = async (width = 390) => {
  const context = await browser.newContext({ viewport: { width, height: 844 } });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#sheet-root .sheet');
  await page.locator('#sheet-root .sheet').evaluate(async (el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
  return { context, page };
};
const goTab = async (page, id) => {
  const group = groupFor(id);
  const close = page.locator('#sheet-root [data-action="close-sheet"]');
  if (await close.count()) await close.click({ force: true });
  await page.locator(`#tabbar .tab[data-tab="${group}"]`).click({ force: true });
  await page.locator(`#tabbar .tab[data-tab="${group}"][aria-current="page"]`).waitFor();
  if (id === 'receipts') await page.locator('#view [data-action="open-receipts"]').click();
  else if (id !== group) {
    await page.locator(`#view .subnav [data-tab="${id}"]`).click();
    await page.locator(`#view .subnav [data-tab="${id}"][aria-current="page"]`).waitFor();
  }
};
const checkTargets = async (page) => page.evaluate(() => {
  const small = [...document.querySelectorAll('#tabbar .tab, #view .subnav button, .start-option')]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width < 44 || r.height < 44; });
  return { width: document.documentElement.scrollWidth, inner: innerWidth, small: small.map((el) => el.outerHTML) };
});
const checkAxe = async (page, label) => {
  const serious = await page.evaluate(async () => (await axe.run(document)).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html} ${n.failureSummary}`).join(', ')}`));
  assert.deepEqual(serious, [], `${label}: ${serious.join('; ')}`);
};
const completeSocial = async (page) => {
  await page.locator('[data-action="start-goal"][data-goal="social"]').click();
  await page.locator('[data-action="start-next"]').click();
  await page.locator('[data-action="start-next"]').click();
  await page.locator('[data-action="start-finish"]').click();
};
const assertLayout = async (page, label) => {
  const result = await checkTargets(page);
  assert.ok(result.width <= result.inner, `${label}: horizontal overflow ${result.width}/${result.inner}`);
  assert.deepEqual(result.small, [], `${label}: undersized targets`);
};
const assertOpaqueStartSheet = async (page, label) => {
  const result = await page.evaluate(() => {
    const alpha = (color) => {
      const match = color.match(/^rgba?\((.*)\)$/);
      const channels = match ? match[1].split(/[,/ ]+/).filter(Boolean) : [];
      return channels.length > 3 ? Number(channels[3]) : 1;
    };
    const sheet = document.querySelector('#sheet-root .sheet');
    const options = [...document.querySelectorAll('.start-option')];
    const selected = document.querySelector('.start-option.selected');
    return {
      sheet: alpha(getComputedStyle(sheet).backgroundColor),
      options: options.map((el) => alpha(getComputedStyle(el).backgroundColor)),
      selected: selected ? alpha(getComputedStyle(selected).backgroundColor) : null,
      opacity: Number(getComputedStyle(sheet).opacity),
    };
  });
  assert.equal(result.sheet, 1, `${label}: sheet background is translucent`);
  assert.ok(result.options.length >= 3 && result.options.every((value) => value === 1), `${label}: option background is translucent`);
  assert.equal(result.opacity, 1, `${label}: sheet fades through the page`);
  if (result.selected !== null) assert.equal(result.selected, 1, `${label}: selected option tint is translucent`);
};
try {
  const { context, page } = await freshPage();
  await page.addScriptTag({ path: axePath });
  assert.match(await page.locator('.start-progress').innerText(), /1 of 3/);
  await page.screenshot({ path: path.join(shots, 'start-step-1.png') });
  await assertOpaqueStartSheet(page, 'Slalom/light');
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const brand of ['slalom', 'aigovops']) {
      await page.evaluate((value) => {
        if (value === 'aigovops') document.documentElement.dataset.brand = value;
        else document.documentElement.removeAttribute('data-brand');
      }, brand);
      await assertOpaqueStartSheet(page, `${brand}/${scheme}`);
      await page.locator('[data-action="start-goal"][data-goal="business"]').click();
      await page.locator('#sheet-root .sheet').evaluate(async (el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
      await assertOpaqueStartSheet(page, `${brand}/${scheme} selected`);
    }
  }
  await checkAxe(page, 'start sheet');
  await assertLayout(page, '390px start');

  let taps = 0;
  const tap = async (selector) => { await page.locator(selector).click(); taps++; };
  await tap('[data-action="start-goal"][data-goal="business"]');
  await tap('[data-action="start-next"]');
  const selectedHeadliner = page.locator('.start-session-option[aria-checked="true"]');
  const selectedSessionId = await selectedHeadliner.getAttribute('data-session');
  assert.notEqual(selectedSessionId, 'none', 'headliner is preselected');
  await page.screenshot({ path: path.join(shots, 'start-step-2.png') });
  await tap('[data-action="start-next"]');
  await page.screenshot({ path: path.join(shots, 'start-step-3.png') });
  await tap('[data-action="start-autonomy"][data-value="act"]');
  await tap('[data-action="start-finish"]');
  assert.equal(taps, 5, 'preselected headliner keeps the flow to five taps');
  await page.evaluate(() => document.querySelector('#sheet-root [data-action="close-sheet"]')?.click());
  await goTab(page, 'today');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.onboarded);
  const result = await page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')));
  assert.equal(result.me.goal, 'business');
  assert.equal(result.backstage.beacon.mode, 'selective');
  assert.equal(result.backstage.autonomy, 'act');
  assert.equal(result.sessions.find((s) => s.featured)?.id, selectedSessionId);
  assert.ok(await page.locator('.goal-hero').count(), 'Today shows the business hero');
  assert.ok(await page.locator('.first-recommendation').count(), 'Today shows the first recommendation');
  await checkAxe(page, 'Today');
  await assertLayout(page, '390px Today');
  await page.waitForFunction(async () => (await R4Receipts.list()).some((r) => r.action === 'charter.updated'));

  const alternate = await freshPage();
  await alternate.page.locator('[data-action="start-goal"][data-goal="business"]').click();
  await alternate.page.locator('[data-action="start-next"]').click();
  const otherSession = alternate.page.locator('.start-session-option:not([aria-checked="true"]):not([data-session="none"])').first();
  const otherSessionId = await otherSession.getAttribute('data-session');
  await otherSession.click();
  await alternate.page.locator('[data-action="start-next"]').click();
  await alternate.page.locator('[data-action="start-finish"]').click();
  await alternate.page.waitForFunction(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.onboarded);
  const alternateState = await alternate.page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')));
  assert.equal(alternateState.sessions.find((s) => s.featured)?.id, otherSessionId);
  assert.equal(alternateState.backstage.charter.protectHeadliner, true);

  const none = await freshPage();
  await none.page.locator('[data-action="start-goal"][data-goal="social"]').click();
  await none.page.locator('[data-action="start-next"]').click();
  await none.page.locator('.start-session-option[data-session="none"]').click();
  await none.page.locator('[data-action="start-next"]').click();
  await none.page.locator('[data-action="start-finish"]').click();
  await none.page.waitForFunction(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.onboarded);
  const noneState = await none.page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')));
  assert.equal(noneState.backstage.charter.protectHeadliner, false);
  assert.equal(noneState.sessions.some((s) => s.featured), false);

  assert.equal(await page.locator('#tabbar .tab').count(), 4);
  for (const id of ['today', 'people', 'meet', 'connect', 'agenda', 'pitch', 'backstage', 'report', 'receipts']) {
    await goTab(page, id);
    assert.ok((await page.locator('#view').innerText()).trim().length, `${id} renders`);
    assert.equal(await page.locator('#tabbar .tab[aria-current="page"]').getAttribute('data-tab'), groupFor(id), `${id} activates its root`);
    if (id !== 'today') {
      const sub = id === 'receipts' ? 'backstage' : id;
      assert.equal(await page.locator('#view .subnav [aria-current="page"]').getAttribute('data-tab'), sub, `${id} marks its subnav item`);
    }
  }
  await goTab(page, 'people');
  await page.screenshot({ path: path.join(shots, 'people-subnav.png') });

  const setHeadlinerOffset = async (minutes) => page.evaluate((offset) => {
    const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
    const headliner = state.sessions.find((session) => session.featured);
    const start = new Date(Date.now() + offset * 60000);
    headliner.day = 0;
    headliner.start = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
    headliner.end = `${String((start.getHours() + 1) % 24).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
    state.me.eventStart = new Date().toISOString().slice(0, 10);
    state.fired = {};
    localStorage.setItem('r4-networking-v2', JSON.stringify(state));
  }, minutes);
  await setHeadlinerOffset(30);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.goal-hero');
  await page.waitForSelector('#toast.show');
  assert.equal(await page.locator('.alert-pop').count(), 0, '30-minute alert is a toast');
  await setHeadlinerOffset(4);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.alert-pop');
  await page.locator('[data-action="alert-close"]').click();
  await page.locator('[data-action="open-settings"]').click();
  await page.evaluate(() => document.querySelector('[data-action="alert-preview"]')?.click());
  assert.equal(await page.locator('.alert-pop').count(), 0, 'an open sheet suppresses the alert modal');

  const skip = await freshPage();
  await skip.page.locator('[data-action="start-skip"]').click();
  assert.equal(await skip.page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.onboarded), false);
  await skip.page.locator('[data-action="open-charter"]').click();
  assert.ok(await skip.page.locator('[data-action="start-goal"]').count(), 'island reopens start sheet');

  const layout = await freshPage(320);
  await assertLayout(layout.page, '320px start');
  await completeSocial(layout.page);
  await goTab(layout.page, 'people');
  await assertLayout(layout.page, '320px people');
  await layout.page.screenshot({ path: path.join(shots, 'four-tabs-320.png') });
  await layout.page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await assertLayout(layout.page, '320px/200% people');
  await layout.context.close();

  const zoom = await freshPage(390);
  await zoom.page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await assertLayout(zoom.page, '390px/200% start');
  await completeSocial(zoom.page);
  await goTab(zoom.page, 'people');
  await assertLayout(zoom.page, '390px/200% people');

  for (const persona of ['maya', 'diego', 'priya']) {
    const demo = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const url = new URL(base);
    url.searchParams.set('demo', persona);
    await demo.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    await demo.waitForSelector('.goal-hero');
    assert.equal(await demo.evaluate(() => {
      const view = document.querySelector('#view');
      const hero = view.querySelector('.goal-hero');
      const cards = view.querySelectorAll('.card');
      return hero !== null && cards[0] === hero;
    }), true, `${persona}: goal hero is not the first Today card`);
    await demo.screenshot({ path: path.join(shots, `today-${persona}.png`) });
    await demo.close();
  }
  await context.close();
  await alternate.context.close();
  await none.context.close();
  await skip.context.close();
  await zoom.context.close();
  console.log(`easy-start ok: business onboarding, 5 taps, goal state/receipt, four grouped tabs, skip/reopen, responsive 44px targets/overflow, axe, screenshots`);
} finally {
  await browser.close();
}
