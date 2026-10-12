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
  const alert = page.locator('#alert-root .alert-pop');
  if (await alert.count()) {
    await alert.evaluate(async (element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
    const alertClose = page.locator('#alert-root [data-action="alert-close"]');
    if (await alertClose.count()) {
      await alertClose.evaluate((element) => element.click());
      await alert.waitFor({ state: 'detached' });
    }
  }
  const sheet = page.locator('#sheet-root .sheet');
  if (await sheet.count()) {
    await sheet.evaluate(async (element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
    const close = page.locator('#sheet-root .sheet-head [data-action="close-sheet"]');
    if (await close.count()) {
      await close.evaluate((element) => element.click());
      await sheet.waitFor({ state: 'detached' });
    }
  }
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
  assert.equal(selectedSessionId, await page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).sessions.find((session) => session.featured)?.id), 'the current headliner is preselected');
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
  assert.equal(result.backstage.beaconAuto, true);
  assert.equal(result.backstage.beacon.give, 'gtm & sales');
  assert.equal(result.backstage.beacon.ask, 'ai & data');
  assert.equal(result.backstage.autonomy, 'act');
  assert.equal(result.sessions.find((s) => s.featured)?.id, selectedSessionId);
  assert.ok(await page.locator('.goal-hero').count(), 'Today shows the business hero');
  assert.ok(await page.locator('.first-recommendation').count(), 'Today shows the first recommendation');
  await checkAxe(page, 'Today');
  await assertLayout(page, '390px Today');
  await page.waitForFunction(async () => (await R4Receipts.list()).some((r) => r.action === 'charter.updated'));
  await goTab(page, 'backstage');
  await page.locator('.charter-card [data-action="open-charter"]').click();
  await page.locator('.charter-form [name="give"]').fill('custom business offer');
  await page.locator('.charter-form [name="ask"]').fill('custom business request');
  await page.locator('.charter-form [data-action="charter-start"]').click();
  await page.waitForFunction(() => {
    const saved = JSON.parse(localStorage.getItem('r4-networking-v2'));
    return saved.backstage.beaconAuto === false
      && saved.backstage.beacon.give === 'custom business offer'
      && saved.backstage.beacon.ask === 'custom business request';
  });

  const alternate = await freshPage();
  await alternate.page.locator('[data-action="start-goal"][data-goal="business"]').click();
  await alternate.page.locator('[data-action="start-next"]').click();
  const picker = alternate.page.locator('.start-session-options');
  const goingCount = await alternate.page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).sessions.filter((session) => session.status === 'going').length);
  const pickerLayout = await picker.evaluate((element) => ({
    overflowY: getComputedStyle(element).overflowY,
    scrollable: element.scrollHeight > element.clientHeight,
  }));
  assert.equal(await alternate.page.locator('.start-session-option').count(), goingCount + 1, 'all going sessions plus none are listed');
  assert.equal(await alternate.page.locator('.start-session-option').last().getAttribute('data-session'), 'none', 'none is last in the session picker');
  assert.equal(pickerLayout.overflowY, 'auto');
  assert.equal(pickerLayout.scrollable, true, 'the full session list scrolls');
  const closingKeynote = alternate.page.locator('.start-session-option').filter({ hasText: /closing keynote/i });
  const closingSessionId = await closingKeynote.getAttribute('data-session');
  assert.ok(closingSessionId, 'the seeded closing keynote is selectable');
  assert.equal(await alternate.page.evaluate((id) => JSON.parse(localStorage.getItem('r4-networking-v2')).sessions.find((session) => session.id === id)?.day, closingSessionId), 2, 'the closing keynote is on day 3');
  const selected = alternate.page.locator('.start-session-option[aria-checked="true"]');
  const selectedIndex = await selected.evaluate((element) => [...element.parentElement.querySelectorAll('.start-session-option')].indexOf(element));
  const closingIndex = await closingKeynote.evaluate((element) => [...element.parentElement.querySelectorAll('.start-session-option')].indexOf(element));
  const arrow = closingIndex > selectedIndex ? 'ArrowDown' : 'ArrowUp';
  for (let i = 0; i < Math.abs(closingIndex - selectedIndex); i++) await alternate.page.keyboard.press(arrow);
  assert.equal(await alternate.page.locator('.start-session-option[aria-checked="true"]').getAttribute('data-session'), closingSessionId, 'roving radio keys select the closing keynote');
  const focusScroll = await closingKeynote.evaluate((element) => {
    const list = element.parentElement;
    const optionRect = element.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    return {
      focused: document.activeElement === element,
      visible: optionRect.top >= listRect.top && optionRect.bottom <= listRect.bottom,
      scrollTop: list.scrollTop,
    };
  });
  assert.equal(focusScroll.focused, true, 'keyboard selection keeps focus on the selected radio');
  assert.equal(focusScroll.visible, true, 'keyboard focus scrolls the selected radio into view');
  assert.ok(focusScroll.scrollTop > 0, 'the picker scrolls to later sessions');
  await alternate.page.locator('[data-action="start-next"]').click();
  await alternate.page.locator('[data-action="start-finish"]').click();
  await alternate.page.waitForFunction(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.onboarded);
  const alternateState = await alternate.page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')));
  assert.equal(alternateState.sessions.find((s) => s.featured)?.id, closingSessionId);
  assert.equal(alternateState.backstage.charter.protectHeadliner, true);

  const research = await freshPage();
  await research.page.locator('[data-action="start-goal"][data-goal="research"]').click();
  await research.page.locator('[data-action="start-next"]').click();
  await research.page.locator('[data-action="start-next"]').click();
  await research.page.locator('[data-action="start-finish"]').click();
  await research.page.waitForFunction(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.onboarded);
  const researchState = await research.page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')));
  assert.equal(researchState.me.goal, 'research');
  assert.equal(researchState.backstage.beacon.mode, 'selective');
  assert.equal(researchState.backstage.charter.maxPerHour, true);
  assert.equal(researchState.backstage.charter.protectHeadliner, true);
  assert.ok(researchState.backstage.threads.length > 0, 'research onboarding fast-forward creates an introduction thread');
  assert.match(await research.page.locator('.goal-hero .goal-kicker').innerText(), /your focus time is protected/i);
  assert.match(await research.page.locator('.goal-hero .goal-mode').innerText(), /selective.*quiet after.*21:00/i);

  const none = await freshPage();
  await none.page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
    state.backstage.beaconAuto = false;
    state.backstage.beacon.give = 'my custom offer';
    state.backstage.beacon.ask = 'my custom request';
    localStorage.setItem('r4-networking-v2', JSON.stringify(state));
  });
  await none.page.reload({ waitUntil: 'domcontentloaded' });
  await none.page.waitForSelector('#sheet-root .sheet');
  await none.page.locator('[data-action="start-goal"][data-goal="social"]').click();
  await none.page.locator('[data-action="start-next"]').click();
  await none.page.locator('.start-session-option[data-session="none"]').click();
  await none.page.locator('[data-action="start-next"]').click();
  await none.page.locator('[data-action="start-finish"]').click();
  await none.page.waitForFunction(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.onboarded);
  const noneState = await none.page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')));
  assert.equal(noneState.backstage.charter.protectHeadliner, false);
  assert.equal(noneState.sessions.some((s) => s.featured), false);
  assert.equal(noneState.backstage.beaconAuto, false);
  assert.equal(noneState.backstage.beacon.give, 'my custom offer');
  assert.equal(noneState.backstage.beacon.ask, 'my custom request');

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

  const setHeadlinerOffset = async (minutes) => {
    const navigation = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
    const mutation = page.evaluate((offset) => {
      const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
      const headliner = state.sessions.find((session) => session.featured);
      const today = new Date();
      const start = new Date(Date.now() + offset * 60000);
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      headliner.day = Math.round((startDay - todayStart) / 86400000);
      headliner.start = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
      headliner.end = `${String((start.getHours() + 1) % 24).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
      state.me.eventStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      state.fired = {};
      localStorage.setItem('r4-networking-v2', JSON.stringify(state));
      location.reload();
    }, minutes).catch((error) => {
      if (!/Execution context was destroyed/.test(error.message)) throw error;
    });
    await Promise.all([navigation, mutation]);
  };
  await setHeadlinerOffset(30);
  await page.waitForSelector('.goal-hero');
  await page.waitForSelector('#toast.show');
  assert.equal(await page.locator('.alert-pop').count(), 0, '30-minute alert is a toast');
  await setHeadlinerOffset(4);
  await page.waitForSelector('.alert-pop');
  await page.locator('[data-action="alert-close"]').click();
  await page.locator('[data-action="open-settings"]').click();
  await page.evaluate(() => document.querySelector('[data-action="alert-preview"]')?.click());
  assert.equal(await page.locator('.alert-pop').count(), 0, 'an open sheet suppresses the alert modal');

  const fallback = await freshPage();
  await fallback.page.evaluate(() => {
    const key = 'r4-networking-v2';
    const state = JSON.parse(localStorage.getItem(key));
    const today = new Date();
    state.me.eventStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    state.me.days = 3;
    state.backstage.onboarded = true;
    state.backstage.live = true;
    state.backstage.threads = [];
    localStorage.setItem(key, JSON.stringify(state));
  });
  await fallback.page.reload({ waitUntil: 'domcontentloaded' });
  await fallback.page.waitForSelector('#agent-island .agent-island');
  assert.match(await fallback.page.locator('#agent-island .agent-island').innerText(), /looking for good fits/i);

  const inProgress = await freshPage();
  await inProgress.page.evaluate(() => {
    const key = 'r4-networking-v2';
    const state = JSON.parse(localStorage.getItem(key));
    const today = new Date();
    const nowM = today.getHours() * 60 + today.getMinutes();
    const time = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    state.me.eventStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    state.me.days = 3;
    state.me.startSkipped = true;
    state.backstage.onboarded = true;
    state.backstage.threads = [];
    state.sessions.forEach((session) => { session.status = 'maybe'; });
    Object.assign(state.sessions[0], { day: 0, start: time(Math.max(0, nowM - 5)), end: time(nowM + 15), status: 'going' });
    localStorage.setItem(key, JSON.stringify(state));
  });
  await inProgress.page.reload({ waitUntil: 'domcontentloaded' });
  await inProgress.page.waitForSelector('.stats .stat:nth-child(3)');
  assert.match(await inProgress.page.locator('.stats .stat:nth-child(3)').innerText(), /now\s+happening now/i);

  const skip = await freshPage();
  await skip.page.locator('[data-action="start-skip"]').click();
  assert.equal(await skip.page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.onboarded), false);
  assert.equal(await skip.page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).me.startSkipped), true);
  await skip.page.reload({ waitUntil: 'domcontentloaded' });
  await skip.page.waitForSelector('#agent-island .setup-island');
  assert.equal(await skip.page.locator('#sheet-root .sheet').count(), 0, 'skipped onboarding stays closed after reload');
  await skip.page.locator('[data-action="open-charter"]').click();
  assert.ok(await skip.page.locator('[data-action="start-goal"]').count(), 'island reopens start sheet');
  await completeSocial(skip.page);
  const completedSkip = await skip.page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')));
  assert.equal(completedSkip.me.startSkipped, false, 'finishing setup clears the skip flag');

  const layout = await freshPage(320);
  await assertLayout(layout.page, '320px start');
  await completeSocial(layout.page);
  const socialState = await layout.page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')));
  assert.equal(socialState.backstage.beaconAuto, true);
  assert.equal(socialState.backstage.beacon.give, 'community & belonging');
  assert.equal(socialState.backstage.beacon.ask, 'wellbeing');
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
  await research.context.close();
  await none.context.close();
  await skip.context.close();
  await fallback.context.close();
  await inProgress.context.close();
  await zoom.context.close();
  console.log(`easy-start ok: business onboarding, 5 taps, goal state/receipt, four grouped tabs, skip/reopen, responsive 44px targets/overflow, axe, screenshots`);
} finally {
  await browser.close();
}
