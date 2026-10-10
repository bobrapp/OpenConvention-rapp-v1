import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox'],
});
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
const alertCleaner = setInterval(() => {
  void page.evaluate(() => document.querySelector('#alert-root .alert-pop')?.remove()).catch(() => {});
}, 250);
alertCleaner.unref?.();
const base = process.env.BASE_URL || 'http://127.0.0.1:8080/';
const shots = process.env.SHOT_DIR || '/Users/devin/shots/v2';
const englishLeaks = ['you both care about', 'coffee bar', 'lounge', 'atrium', 'garden room', 'could a', 'agree'];
const shot = async (name, selector = 'body') => {
  const target = page.locator(selector).first();
  if (await target.count()) {
    try { await target.scrollIntoViewIfNeeded({ timeout: 3000 }); } catch {}
    const inSheet = await target.evaluate((el) => Boolean(el.closest('.sheet-backdrop'))).catch(() => false);
    if (inSheet) await page.waitForTimeout(selector.includes('reveal-sheet') ? 900 : 500);
  }
  await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: false });
};
const shotOn = async (targetPage, name, selector = 'body') => {
  const target = targetPage.locator(selector).first();
  if (await target.count()) {
    try { await target.scrollIntoViewIfNeeded({ timeout: 3000 }); } catch {}
    const inSheet = await target.evaluate((el) => Boolean(el.closest('.sheet-backdrop'))).catch(() => false);
    if (inSheet) await targetPage.waitForTimeout(selector.includes('reveal-sheet') ? 900 : 500);
  }
  await targetPage.screenshot({ path: path.join(shots, `${name}.png`), fullPage: false });
};
const makeScenario = async () => {
  const scenarioContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const scenarioPage = await scenarioContext.newPage();
  await scenarioPage.addInitScript(() => {
    setInterval(() => document.querySelector('#alert-root .alert-pop')?.remove(), 250);
  });
  scenarioPage.on('console', (msg) => { if (msg.type() === 'error') errors.push(`scenario console: ${msg.text()}`); });
  scenarioPage.on('pageerror', (error) => errors.push(`scenario pageerror: ${error.message}`));
  await scenarioPage.goto(base, { waitUntil: 'domcontentloaded' });
  await scenarioPage.waitForSelector('#sheet-root .sheet');
  await scenarioPage.locator('input[name="give"]').fill('facilitation');
  await scenarioPage.locator('input[name="ask"]').fill('AI adoption');
  await scenarioPage.locator('[data-action="charter-start"]').click();
  await scenarioPage.waitForFunction(() => JSON.parse(localStorage.getItem('r4-networking-v2') || '{}').backstage?.onboarded);
  await scenarioPage.waitForFunction(() => !document.querySelector('#sheet-root .sheet'));
  return { scenarioContext, scenarioPage };
};
const fastForwardScenario = async (scenarioPage, attempts = 12) => {
  await scenarioPage.waitForTimeout(500);
  await scenarioPage.waitForLoadState('domcontentloaded').catch(() => {});
  for (let i = 0; i < attempts; i++) {
    if (await scenarioPage.locator('[data-action="charter-start"]').count()) {
      await scenarioPage.locator('[data-action="charter-start"]').click();
      await scenarioPage.waitForFunction(() => !document.querySelector('#sheet-root .sheet'));
    }
    if (await scenarioPage.locator('.alert-pop').count()) await scenarioPage.locator('.alert-pop').evaluate((el) => el.click());
    await scenarioPage.locator('.tab[data-tab="backstage"]').evaluate((el) => el.click());
    await scenarioPage.locator('[data-action="fast-forward"]').evaluate((el) => el.click());
    if (await scenarioPage.locator('.needs-you-card, .draft-card').count()) break;
  }
};
const setCharterSwitch = async (scenarioPage, key, checked) => {
  if (await scenarioPage.locator('.alert-pop').count()) await scenarioPage.locator('.alert-pop').evaluate((el) => el.click());
  await scenarioPage.locator('.tab[data-tab="backstage"]').evaluate((el) => el.click());
  if (await scenarioPage.locator('.alert-pop').count()) await scenarioPage.locator('.alert-pop').evaluate((el) => el.click());
  await scenarioPage.locator('.charter-card [data-action="open-charter"]').evaluate((el) => el.click());
  const toggle = scenarioPage.locator(`[data-action="charter-toggle"][data-key="${key}"]`);
  if (await toggle.isChecked() !== checked) await toggle.click();
  await scenarioPage.locator('[data-action="close-sheet"]').first().click();
};
const widthCheck = async () => {
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(width <= 390, `horizontal overflow: scrollWidth=${width}`);
};
await page.addInitScript(() => {
  if (sessionStorage.getItem('r4-smoke-initialized') !== '1') {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('r4-smoke-initialized', '1');
  }
});
await page.goto(base, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#sheet-root .sheet');
assert.match(await page.locator('#sheet-root').innerText(), /meet your agent/i);
const pwa = await page.evaluate(async () => {
  const manifestLink = document.querySelector('link[rel="manifest"]');
  const response = await fetch(manifestLink.href);
  const manifest = await response.json();
  const icons = await Promise.all([...manifest.icons.map(async (icon) => {
    const image = new Image();
    image.src = new URL(icon.src, manifestLink.href).href;
    await image.decode();
    return { size: `${image.naturalWidth}x${image.naturalHeight}`, purpose: icon.purpose };
  }), (async () => {
    const image = new Image();
    image.src = document.querySelector('link[rel="apple-touch-icon"]').href;
    await image.decode();
    return { size: `${image.naturalWidth}x${image.naturalHeight}`, purpose: 'apple' };
  })()]);
  return { status: response.status, manifest, icons };
});
assert.equal(pwa.status, 200, 'PWA manifest should be fetchable');
assert.equal(pwa.manifest.name, 'r4 networking');
assert.deepEqual(pwa.icons.map((icon) => icon.size).sort(), ['180x180', '192x192', '512x512', '512x512']);
assert.ok(pwa.icons.some((icon) => icon.purpose === 'maskable'), 'manifest should include a maskable icon');
const foundationFooter = page.locator('#view .foundation-footer');
assert.match(await foundationFooter.innerText(), /© 2026 AiGovOps Foundation/);
assert.equal(await foundationFooter.locator('a').getAttribute('href'), 'https://www.aigovops-foundation.com');
await shot('charter-sheet', '#sheet-root .sheet');
await page.locator('input[name="give"]').fill('facilitation');
await page.locator('input[name="ask"]').fill('AI adoption');
await page.locator('[data-form="charter"] button[type="submit"], [data-form="charter"] button').click();
await page.waitForFunction(() => JSON.parse(localStorage.getItem('r4-networking-v2') || '{}').backstage?.onboarded);
assert.equal(await page.locator('html').getAttribute('data-brand'), 'slalom', 'missing brand migrates to Slalom');
for (const language of ['es', 'pt']) {
  await page.locator('[data-action="open-settings"]').click();
  await page.locator(`.sheet [data-action="set-lang"][data-lang="${language}"]`).click();
  await page.locator(`.sheet [data-action="brand-select"][data-brand="aigovops"]`).click();
  assert.equal(await page.locator('html').getAttribute('data-brand'), 'aigovops');
  assert.equal(await page.locator('html').getAttribute('lang'), language);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2') || '{}').me?.brand), 'aigovops', `brand is saved before reload in ${language}`);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.documentElement.dataset.brand === 'aigovops');
  assert.equal(await page.locator('html').getAttribute('data-brand'), 'aigovops', `brand persists after reload in ${language}`);
  await page.locator('[data-action="open-settings"]').click();
  await page.locator('.sheet [data-action="set-lang"][data-lang="en"]').click();
  await page.locator('.sheet [data-action="brand-select"][data-brand="slalom"]').click();
  await page.locator('[data-action="close-sheet"]').click();
}

for (let i = 0; i < 8 && !(await page.locator('.needs-you-card').count()); i++) {
  await page.locator('.tab[data-tab="backstage"]').click();
  await page.locator('[data-action="fast-forward"]').click();
  await page.locator('[data-tab="today"]').click();
}
const needsYouCount = await page.locator('.needs-you-card').count();
if (!needsYouCount) {
  const debug = await page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage);
  throw new Error(`fast-forward should surface a needs-you card: ${JSON.stringify({ stats: debug.stats, threads: debug.threads.map((t) => ({ stage: t.stage, kind: t.kind, day: t.day, start: t.start, expiresAt: t.expiresAt })), mode: debug.beacon.mode })}`);
}
await widthCheck();
await shot('now-light', '.needs-you-card');
await shot('now-needs-you', '.needs-you-card');
for (const language of ['es', 'pt']) {
  await page.locator(`[data-action="set-lang"][data-lang="${language}"]`).first().click();
  const footerText = await page.locator('#view .foundation-footer').innerText();
  assert.match(footerText, /© 2026 AiGovOps Foundation/);
  assert.ok(footerText.includes(language === 'es' ? 'código abierto (MIT)' : 'código aberto (MIT)'), `${language} footer should name the MIT license`);
  assert.equal(await page.locator('#view .foundation-footer a').getAttribute('href'), 'https://www.aigovops-foundation.com');
  await page.locator('.tab[data-tab="today"]').click();
  assert.ok((await page.locator('.needs-you-card').first().innerText()).length, `${language} needs-you card should render`);
  assert.doesNotMatch((await page.locator('.needs-you-card').first().innerText()).toLowerCase(), new RegExp(englishLeaks.join('|')));
  await shot(`${language}-now-needs-you`, '.needs-you-card');
  await page.locator('.tab[data-tab="backstage"]').click();
  if (!(await page.locator('.island-expanded').count())) await page.locator('[data-action="island-toggle"]').click();
  assert.doesNotMatch((await page.locator('.island-expanded').innerText()).toLowerCase(), new RegExp(englishLeaks.join('|')));
  await page.locator('[data-action="thread-open"]').first().click();
  assert.doesNotMatch((await page.locator('#sheet-root').innerText()).toLowerCase(), new RegExp(englishLeaks.join('|')));
  if (language === 'es') await shot('es-thread-sheet', '#sheet-root .thread-sheet');
  await page.locator('[data-action="close-sheet"]').first().click();
}
await page.locator('[data-action="set-lang"][data-lang="en"]').first().click();
await page.locator('.tab[data-tab="today"]').click();
await page.emulateMedia({ colorScheme: 'dark' });
await page.locator('.tab[data-tab="report"]').click();
const reportBackground = await page.locator('.report').evaluate((el) => getComputedStyle(el).backgroundColor);
assert.notEqual(reportBackground, 'rgb(255, 255, 255)', 'report surface should not stay white in dark mode');
await page.locator('.tab[data-tab="today"]').click();
await widthCheck();
await shot('now-dark', '.needs-you-card');
await page.emulateMedia({ colorScheme: 'light' });

let reveal = false;
for (let i = 0; i < 8 && !reveal; i++) {
  const card = page.locator('.needs-you-card').first();
  if (!(await card.count())) {
    await page.locator('.tab[data-tab="backstage"]').click();
    await page.locator('[data-action="fast-forward"]').click();
    await page.locator('[data-tab="today"]').click();
    continue;
  }
  await card.locator('[data-action="thread-yes"]').click();
  reveal = await page.locator('#sheet-root .reveal-sheet').count() > 0;
  if (!reveal) {
    await page.locator('.tab[data-tab="backstage"]').click();
    await page.locator('[data-action="fast-forward"]').click();
    await page.locator('[data-tab="today"]').click();
  }
}
assert.ok(reveal, 'a mutual yes should open the reveal sheet');
const revealColor = await page.locator('#sheet-root .reveal-sheet').evaluate((el) => getComputedStyle(el).backgroundColor);
const revealAlpha = revealColor.startsWith('rgba(') ? Number(revealColor.match(/,\s*([\d.]+)\)$/)?.[1]) : 1;
assert.equal(revealAlpha, 1, `reveal sheet background must be opaque; got ${revealColor}`);
await shot('reveal-sheet', '#sheet-root .reveal-sheet');
await page.locator('[data-form="icebreaker"] input[name="answer"]').fill('Try a tiny experiment with the team.');
await page.locator('[data-form="icebreaker"] button').click();
await page.waitForSelector('.ice-answer');
await page.locator('[data-action="close-sheet"]').last().click();
const revealedState = await page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')));
const revealedThread = revealedState.backstage.threads.find((thread) => thread.revealed);
const revealedSession = revealedState.sessions.find((session) => session.momentId === revealedThread?.id);
await page.locator('.tab[data-tab="agenda"]').click();
if (revealedSession) await page.locator(`[data-action="pick-day"][data-key="day"][data-day="${revealedSession.day}"]`).click();
assert.match(await page.locator('#view').innerText(), /moment with/i);
assert.ok(revealedState.backstage.threads.some((thread) => thread.revealed && thread.momentId && revealedState.sessions.some((session) => session.momentId === thread.id)), 'mutual reveal should create a linked agenda session');
await widthCheck();

await page.locator('.tab[data-tab="backstage"]').click();
await page.waitForSelector('.backstage-graph');
assert.ok(await page.locator('.backstage-stats').count(), 'backstage stats should render');
assert.doesNotMatch(await page.locator('.story-card').innerText(), /\s0\s/, 'story must omit zero-count clauses');
await shot('backstage-top', '.page-title');
for (let i = 0; i < 3; i++) await page.locator('[data-action="fast-forward"]').click();
const uniqueAfterThree = await page.evaluate(() => {
  const threads = JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.filter((thread) => thread.stage !== 'declined');
  const firstIds = threads.map((thread) => thread.personIds[0]);
  return new Set(firstIds).size === firstIds.length;
});
assert.ok(uniqueAfterThree, 'three fast-forwards must not reuse a non-declined primary peer');
const needsYouId = await page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((thread) => thread.stage === 'needs-you')?.id);
if (needsYouId) {
  await page.locator(`[data-action="thread-open"][data-id="${needsYouId}"]`).first().click();
  await page.locator(`[data-action="thread-not-now"][data-id="${needsYouId}"]`).click();
  await page.locator(`[data-action="thread-reason"][data-id="${needsYouId}"]`).first().click();
}
for (let i = 0; i < 12 && await page.locator('.backstage-graph .graph-node').count() < 5; i++) {
  await page.locator('[data-action="fast-forward"]').click();
}
const graphNodeCount = await page.locator('.backstage-graph .graph-node').count();
const graphThreads = await page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.map((thread) => thread.stage));
assert.ok(graphNodeCount >= 5, `graph screenshot needs at least five nodes; got ${graphNodeCount} (${graphThreads.join(', ')})`);
await shot('backstage-graph', '.backstage-graph');
await page.waitForFunction(() => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2') || '{}');
  return state.backstage?.threads?.some((t) => t.msgs?.length);
});
await shot('backstage-threads', '.backstage-stats');
await page.locator('[data-action="thread-open"]').first().click();
assert.ok(await page.locator('.thread-transcript details').evaluateAll((details) => details.every((item) => !item.open)), 'A2A details must be collapsed by default');
await shot('thread-sheet', '.thread-sheet');
await page.locator('.thread-transcript details summary').first().click();
assert.match(await page.locator('#sheet-root').innerText(), /a2a json/i);
await page.locator('[data-action="close-sheet"]').first().click();
for (let i = 0; i < 8; i++) {
  await page.locator('[data-action="fast-forward"]').click();
  const blockedNow = await page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2') || '{}').backstage?.stats?.blocked > 0);
  if (blockedNow) break;
}
const blocked = await page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.stats.blocked);
assert.equal(blocked, 1, 'exactly one injection should be blocked');

await page.locator('[data-action="open-charter"]').click();
await shot('charter-sheet', '#sheet-root .sheet');
await page.locator('input[data-key="maxPerHour"]').uncheck();
await page.locator('[data-action="close-sheet"]').first().click();
await shot('charter-card-switch-off', '.charter-card');
await page.locator('[data-action="island-toggle"]').click();
await shot('island-expanded', '.agent-island');

const liveId = await page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((t) => t.stage === 'confirmed')?.id);
if (liveId) {
  const start = page.locator(`[data-action="moment-start"][data-id="${liveId}"]`).first();
  if (await start.count()) await start.click();
  else {
    await page.locator(`[data-action="thread-open"][data-id="${liveId}"]`).first().click();
    await page.locator(`[data-action="moment-start"][data-id="${liveId}"]`).click();
  }
} else {
  throw new Error('expected a confirmed moment to start');
}
await shot('moment-live-sheet', '.moment-live');
await page.locator('[data-action="moment-here"]').click();
await page.waitForTimeout(1700);
await page.locator('[data-action="moment-end"]').click();
await page.locator('[data-action="moment-rate"][data-outcome="spark"]').click();
const stateAfterSpark = await page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')));
const sparkedThread = stateAfterSpark.backstage.threads.find((t) => t.outcome === 'spark');
assert.ok(sparkedThread?.personIds.some((id) => stateAfterSpark.people.find((p) => p.id === id)?.status === 'met'), 'spark should mark the peer as met');

for (const language of ['es', 'pt']) {
  await page.locator(`[data-action="set-lang"][data-lang="${language}"]`).click();
  for (const tab of ['today', 'backstage', 'people', 'meet', 'agenda', 'connect', 'pitch', 'report']) {
    await page.locator(`.tab[data-tab="${tab}"]`).click();
    await widthCheck();
  }
  if (language === 'es') {
    await page.locator('.tab[data-tab="backstage"]').click();
    await shot('es-backstage', '.backstage-graph');
  }
  await page.locator('.tab[data-tab="agenda"]').click();
  const agendaMoment = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
    const thread = state.backstage.threads.find((item) => item.revealed);
    return { id: thread?.momentId, day: state.sessions.find((session) => session.id === thread?.momentId)?.day };
  });
  if (agendaMoment.day !== undefined) await page.locator(`[data-action="pick-day"][data-key="day"][data-day="${agendaMoment.day}"]`).click();
  const agendaMomentCard = page.locator(`[data-action="session"][data-id="${agendaMoment.id}"]`);
  assert.ok(await agendaMomentCard.count(), `${language} agenda should show the mutual reveal session`);
  assert.doesNotMatch((await agendaMomentCard.innerText()).toLowerCase(), new RegExp(englishLeaks.join('|')));
}
const oldVersion = await page.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  delete state.backstage;
  return JSON.stringify(state);
});
const migrationContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const migrationPage = await migrationContext.newPage();
migrationPage.on('console', (msg) => { if (msg.type() === 'error') errors.push(`migration console: ${msg.text()}`); });
migrationPage.on('pageerror', (error) => errors.push(`migration pageerror: ${error.message}`));
await migrationPage.addInitScript((legacy) => localStorage.setItem('r4-networking-v1', legacy), oldVersion);
await migrationPage.goto(base, { waitUntil: 'domcontentloaded' });
await migrationPage.waitForFunction(() => !!localStorage.getItem('r4-networking-v2'));
const migrated = await migrationPage.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')));
assert.ok(migrated.people.length, 'existing people should survive migration');
assert.ok(migrated.backstage && migrated.backstage.onboarded === false, 'v1 state should receive backstage defaults');
assert.ok(migrated.me.interests.length, 'profile should survive migration');
assert.ok(JSON.parse(oldVersion).people.length, 'legacy profile should include people for migration coverage');
const preserved = await migrationPage.evaluate(() => !!localStorage.getItem('r4-networking-v1'));
assert.ok(preserved, 'migration should preserve the v1 key');
await migrationContext.close();

const capScenario = await makeScenario();
await capScenario.scenarioPage.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  state.backstage.charter.maxPerHour = 1;
  localStorage.setItem('r4-networking-v2', JSON.stringify(state));
  location.reload();
});
await fastForwardScenario(capScenario.scenarioPage, 16);
const firstCapCard = capScenario.scenarioPage.locator('.needs-you-card').first();
if (await firstCapCard.count()) {
  await firstCapCard.locator('[data-action="thread-yes"]').click();
  if (await capScenario.scenarioPage.locator('#sheet-root .reveal-sheet').count()) await capScenario.scenarioPage.locator('[data-action="close-sheet"]').first().click();
}
await fastForwardScenario(capScenario.scenarioPage, 16);
const capResult = await capScenario.scenarioPage.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')));
const capDeclines = capResult.backstage.threads.filter((thread) => thread.msgs.some((msg) => msg.json?.params?.message?.parts?.some((part) => part.data?.status === 'charter-limit')));
assert.equal(capDeclines.length, 0, 'hourly cap must not decline a mutual yes');
const secondCapCard = capScenario.scenarioPage.locator('.needs-you-card').first();
if (await secondCapCard.count()) {
  await secondCapCard.locator('[data-action="thread-yes"]').click();
  const secondId = await secondCapCard.getAttribute('data-id');
  const secondState = await capScenario.scenarioPage.evaluate((id) => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((thread) => thread.id === id), secondId);
  assert.notEqual(secondState?.stage, 'declined', 'a second offered yes must not be declined by revealMoment');
}
await capScenario.scenarioContext.close();

const namesScenario = await makeScenario();
await setCharterSwitch(namesScenario.scenarioPage, 'hideNameUntilYes', false);
await fastForwardScenario(namesScenario.scenarioPage);
await namesScenario.scenarioPage.locator('.tab[data-tab="today"]').evaluate((el) => el.click());
const visibleName = await namesScenario.scenarioPage.locator('.blur-avatar').first().innerText();
const nameState = await namesScenario.scenarioPage.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')));
assert.notEqual(visibleName, '?', `names should be visible when hideNameUntilYes is false (avatar=${visibleName}, charter=${nameState.backstage.charter.hideNameUntilYes})`);
await setCharterSwitch(namesScenario.scenarioPage, 'hideNameUntilYes', true);
await namesScenario.scenarioPage.locator('.tab[data-tab="today"]').evaluate((el) => el.click());
assert.equal(await namesScenario.scenarioPage.locator('.blur-avatar').first().innerText(), '?', 'names should be hidden until yes');
await namesScenario.scenarioContext.close();

const topicsScenario = await makeScenario();
await fastForwardScenario(topicsScenario.scenarioPage, 4);
const topicsOnlyJson = await topicsScenario.scenarioPage.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.flatMap((thread) => thread.msgs).flatMap((msg) => msg.json?.params?.message?.parts || []).filter((part) => part.data?.skill === 'discover').map((part) => part.data.card)));
assert.doesNotMatch(topicsOnlyJson, /role|company|phone|email|linkedin/i, 'topics-only discover messages must not expose profile or contact fields');
await setCharterSwitch(topicsScenario.scenarioPage, 'shareTopicsOnly', false);
await topicsScenario.scenarioPage.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  state.backstage.threads = [];
  state.backstage.stats.agents = 0;
  state.backstage.seed = 1;
  localStorage.setItem('r4-networking-v2', JSON.stringify(state));
  location.reload();
});
await fastForwardScenario(topicsScenario.scenarioPage, 4);
const sharedProfileJson = await topicsScenario.scenarioPage.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.flatMap((thread) => thread.msgs).flatMap((msg) => msg.json?.params?.message?.parts || []).filter((part) => part.data?.skill === 'discover').map((part) => part.data.card)));
assert.match(sharedProfileJson, /role/i, 'sharing roles should include role in discover payload');
assert.doesNotMatch(sharedProfileJson, /phone|email|linkedin/i, 'discover payload must never expose contact fields');
await topicsScenario.scenarioContext.close();

const askScenario = await makeScenario();
const askState = await askScenario.scenarioPage.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  state.backstage.autonomy = 'ask';
  const peer = state.people.find((person) => person.topics.length);
  state.backstage.threads = [{
    id: 'ask-draft-test', kind: '1:1', personIds: [peer.id], inbound: false, stage: 'overlap',
    minutes: 7, day: 0, start: '16:00', place: 'coffee bar', hookData: { topic: peer.topics[0], complement: null },
    hook: '', opener: '', exitLine: '', expiresAt: 0, youSaid: null, theySaid: null, revealed: false,
    icebreaker: { index: 0, mine: '' }, outcome: null, msgs: [], createdAt: Date.now(), seed: 1,
    draftPending: false, proposeApproved: false,
  }];
  state.backstage.stats.agents = 1;
  return JSON.stringify(state);
});
await askScenario.scenarioPage.addInitScript((serialized) => localStorage.setItem('r4-networking-v2', serialized), askState);
await askScenario.scenarioPage.reload();
assert.equal(await askScenario.scenarioPage.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.autonomy), 'ask');
await fastForwardScenario(askScenario.scenarioPage, 1);
assert.ok(await askScenario.scenarioPage.locator('.draft-card').count(), `ask mode should surface an outbound draft: ${JSON.stringify(await askScenario.scenarioPage.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  return { autonomy: state.backstage.autonomy, threads: state.backstage.threads.map(({ id, stage, draftPending, proposeApproved }) => ({ id, stage, draftPending, proposeApproved })), tickCount: state.backstage.tickCount };
}))}`);
await shotOn(askScenario.scenarioPage, 'ask-mode-draft', '.draft-card');
const draftId = await askScenario.scenarioPage.locator('.draft-card [data-action="thread-send-draft"]').first().getAttribute('data-id');
await askScenario.scenarioPage.locator('.draft-card [data-action="thread-send-draft"]').first().click();
await askScenario.scenarioPage.locator('[data-action="fast-forward"]').evaluate((el) => el.click());
const sentDraft = await askScenario.scenarioPage.evaluate((id) => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((thread) => thread.id === id), draftId);
assert.equal(sentDraft.draftPending, false, 'send it should clear draftPending');
assert.ok(sentDraft.msgs.some((msg) => msg.text?.includes('could a')), 'send it should allow the proposal message to proceed');
await askScenario.scenarioPage.evaluate((id) => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  const sent = state.backstage.threads.find((thread) => thread.id === id);
  const peer = state.people.find((person) => !sent.personIds.includes(person.id) && person.topics.length);
  state.backstage.threads = [sent, {
    ...sent, id: 'ask-skip-test', personIds: [peer.id], inbound: false, stage: 'overlap',
    draftPending: false, proposeApproved: false, msgs: [], createdAt: Date.now() + 1,
  }];
  state.backstage.stats.agents = 2;
  localStorage.setItem('r4-networking-v2', JSON.stringify(state));
}, draftId);
await askScenario.scenarioPage.reload();
await fastForwardScenario(askScenario.scenarioPage, 1);
const skipCard = askScenario.scenarioPage.locator('.draft-card').first();
assert.ok(await skipCard.count(), 'ask mode should produce another outbound draft to skip');
const skipId = await skipCard.locator('[data-action="thread-skip-draft"]').getAttribute('data-id');
const beforeNos = await askScenario.scenarioPage.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.stats.nosAbsorbed);
await skipCard.locator('[data-action="thread-skip-draft"]').click();
const skipped = await askScenario.scenarioPage.evaluate((id) => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((thread) => thread.id === id), skipId);
const afterNos = await askScenario.scenarioPage.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.stats.nosAbsorbed);
assert.equal(skipped.stage, 'declined', 'skip should decline the draft');
assert.equal(afterNos, beforeNos, 'skipping a draft must not increment absorbed no stats');
await askScenario.scenarioContext.close();

const classicScenario = await makeScenario();
await classicScenario.scenarioPage.locator('.tab[data-tab="backstage"]').click();
await classicScenario.scenarioPage.locator('.classic-tools > summary').click();
await classicScenario.scenarioPage.locator('[data-action="agent-run"]').click();
await classicScenario.scenarioPage.waitForFunction(() => JSON.parse(localStorage.getItem('r4-networking-v2')).agents?.runs > 0, null, { timeout: 30000 });
const classicState = await classicScenario.scenarioPage.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')));
assert.ok(classicState.agents.log.length || classicState.agents.proposals.length, 'classic agent run should produce logs or proposals');
await classicScenario.scenarioContext.close();

const pastScenario = await makeScenario();
const pastScenarioData = await pastScenario.scenarioPage.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  const old = new Date(Date.now() - 10 * 86400000);
  state.backstage.threads = [];
  state.backstage.stats = { agents: 0, convos: 0, nosAbsorbed: 0, blocked: 0, moments: 0, sparks: 0 };
  state.backstage.seed = 1;
  state.me.eventStart = old.toISOString().slice(0, 10);
  state.me.days = 1;
  return JSON.stringify(state);
});
await pastScenario.scenarioPage.addInitScript((serialized) => localStorage.setItem('r4-networking-v2', serialized), pastScenarioData);
await pastScenario.scenarioPage.reload();
await fastForwardScenario(pastScenario.scenarioPage, 4);
const pastState = await pastScenario.scenarioPage.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')));
assert.ok(pastState.backstage.threads.every((thread) => !thread.start || new Date(`${pastState.me.eventStart}T${thread.start}:00`) >= new Date()), 'past events must not create past starts');
assert.equal(await pastScenario.scenarioPage.locator('.moment-live').count(), 0, 'past events must not open moment sheets');
assert.match(await pastScenario.scenarioPage.locator('#view').innerText(), /event dates are over/i);
await pastScenario.scenarioContext.close();

const counterScenario = await makeScenario();
await fastForwardScenario(counterScenario.scenarioPage);
const counterSetup = await counterScenario.scenarioPage.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  const thread = state.backstage.threads.find((item) => item.stage === 'needs-you');
  if (!thread) return null;
  const hash = (value) => {
    let h = 2166136261;
    for (const char of String(value)) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967295;
  };
  const today = new Date();
  state.me.eventStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  state.me.days = 1;
  state.backstage.charter.quietAfter = '00:00';
  state.backstage.threads = [thread];
  state.backstage.stats.agents = 1;
  state.backstage.injectionDone = true;
  Object.assign(thread, { stage: 'negotiate', day: 0, start: '15:00', minutes: 7, countered: false, expiresAt: 0 });
  thread.seed = Array.from({ length: 10000 }, (_x, seed) => seed + 1)
    .find((seed) => hash(`${thread.personIds[0]}${seed}outcome`) >= 0.2 && hash(`${thread.personIds[0]}${seed}outcome`) < 0.4);
  const before = { id: thread.id, day: thread.day, start: thread.start, minutes: thread.minutes };
  localStorage.setItem('r4-networking-v2', JSON.stringify(state));
  return before;
});
assert.ok(counterSetup, 'counteroffer regression needs a seeded thread');
await counterScenario.scenarioPage.reload();
await counterScenario.scenarioPage.locator('.tab[data-tab="backstage"]').click();
await counterScenario.scenarioPage.locator('[data-action="fast-forward"]').click();
const counterResult = await counterScenario.scenarioPage.evaluate((id) => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((thread) => thread.id === id), counterSetup.id);
assert.equal(counterResult.countered, true, 'a counteroffer must be marked as attempted even without a slot');
assert.equal(counterResult.stage, 'needs-you', 'a counteroffer without an available slot must ask the human');
assert.deepEqual({ day: counterResult.day, start: counterResult.start, minutes: counterResult.minutes }, { day: counterSetup.day, start: counterSetup.start, minutes: counterSetup.minutes }, 'an unavailable counteroffer must preserve the booked slot');
await counterScenario.scenarioContext.close();

const expiryScenario = await makeScenario();
await fastForwardScenario(expiryScenario.scenarioPage);
const expiryId = await expiryScenario.scenarioPage.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  const thread = state.backstage.threads.find((item) => item.stage === 'needs-you');
  if (!thread) return null;
  thread.expiresAt = Date.now() + 200;
  state.backstage.live = false;
  localStorage.setItem('r4-networking-v2', JSON.stringify(state));
  return thread.id;
});
assert.ok(expiryId, 'expiry regression needs a needs-you offer');
await expiryScenario.scenarioPage.reload();
await expiryScenario.scenarioPage.waitForTimeout(400);
await expiryScenario.scenarioPage.locator(`.needs-you-card [data-action="thread-yes"][data-id="${expiryId}"]`).click();
assert.match(await expiryScenario.scenarioPage.locator('#toast').innerText(), /this offer expired/i);
let expiredState = await expiryScenario.scenarioPage.evaluate((id) => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((thread) => thread.id === id), expiryId);
assert.equal(expiredState.stage, 'declined', 'tapping an expired offer while paused must not reveal it');
await expiryScenario.scenarioPage.evaluate((id) => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  const thread = state.backstage.threads.find((item) => item.id === id);
  thread.stage = 'needs-you'; thread.expiresAt = Date.now() - 1;
  localStorage.setItem('r4-networking-v2', JSON.stringify(state));
}, expiryId);
await expiryScenario.scenarioPage.reload();
await expiryScenario.scenarioPage.waitForFunction((id) => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((thread) => thread.id === id)?.stage === 'declined', expiryId);
expiredState = await expiryScenario.scenarioPage.evaluate((id) => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((thread) => thread.id === id), expiryId);
assert.ok(expiredState.msgs.some((msg) => msg.text?.includes('offer expired')), 'paused tick must record offer expiry');
await expiryScenario.scenarioContext.close();

const syncScenario = await makeScenario();
await fastForwardScenario(syncScenario.scenarioPage);
await syncScenario.scenarioPage.locator('.tab[data-tab="today"]').click();
await syncScenario.scenarioPage.locator('.needs-you-card [data-action="thread-yes"]').first().click();
await syncScenario.scenarioPage.waitForSelector('#sheet-root .reveal-sheet');
await syncScenario.scenarioPage.locator('[data-action="close-sheet"]').last().click();
const syncIds = await syncScenario.scenarioPage.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  const thread = state.backstage.threads.find((item) => item.revealed);
  return { threadId: thread?.id, sessionId: thread?.momentId, day: thread?.day };
});
assert.ok(syncIds.sessionId, 'revealed moment should have an agenda session');
await syncScenario.scenarioPage.locator('.tab[data-tab="agenda"]').click();
await syncScenario.scenarioPage.locator(`[data-action="pick-day"][data-key="day"][data-day="${syncIds.day}"]`).click();
await syncScenario.scenarioPage.locator(`[data-action="session"][data-id="${syncIds.sessionId}"]`).evaluate((el) => el.click());
await syncScenario.scenarioPage.locator('[data-action="edit-session"]').click();
const syncForm = syncScenario.scenarioPage.locator('[data-form="session"]');
await syncForm.locator('input[name="title"]').fill('my private moment title');
await syncForm.locator('input[name="start"]').fill('16:00');
await syncForm.locator('input[name="end"]').fill('16:30');
await syncForm.locator('input[name="location"]').fill('QA terrace');
await syncForm.locator('textarea[name="notes"]').fill('my private notes');
await syncForm.locator('button').last().click();
await syncScenario.scenarioPage.locator('[data-action="close-sheet"]').first().click();
const savedSchedule = await syncScenario.scenarioPage.evaluate((id) => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  const thread = state.backstage.threads.find((item) => item.id === id);
  const session = state.sessions.find((item) => item.momentId === id);
  return { thread: { day: thread.day, start: thread.start, minutes: thread.minutes, placeOverride: thread.placeOverride }, session: { day: session.day, start: session.start, location: session.location, duration: Number(session.end.slice(0, 2)) * 60 + Number(session.end.slice(3)) - (Number(session.start.slice(0, 2)) * 60 + Number(session.start.slice(3))) } };
}, syncIds.threadId);
assert.deepEqual(savedSchedule.thread, { day: syncIds.day, start: '16:00', minutes: 30, placeOverride: 'QA terrace' }, 'editing a linked session must update the thread schedule and location');
assert.equal(savedSchedule.session.duration, 30, 'linked agenda session should keep the edited duration');
await syncScenario.scenarioPage.locator('[data-action="set-lang"][data-lang="pt"]').first().click();
await syncScenario.scenarioPage.reload();
await syncScenario.scenarioPage.locator('.tab[data-tab="backstage"]').click();
await syncScenario.scenarioPage.locator(`.thread-card[data-id="${syncIds.threadId}"]`).click();
assert.match(await syncScenario.scenarioPage.locator('#sheet-root').innerText(), /QA terrace/, 'thread detail should show the custom location after reload in Portuguese');
await syncScenario.scenarioPage.locator('[data-action="close-sheet"]').first().click();
await syncScenario.scenarioPage.locator('.tab[data-tab="agenda"]').click();
await syncScenario.scenarioPage.locator(`[data-action="pick-day"][data-key="day"][data-day="${syncIds.day}"]`).click();
await syncScenario.scenarioPage.locator(`[data-action="session"][data-id="${syncIds.sessionId}"]`).evaluate((el) => el.click());
await syncScenario.scenarioPage.locator('[data-action="edit-session"]').click();
const restoreForm = syncScenario.scenarioPage.locator('[data-form="session"]');
const autoLocation = await syncScenario.scenarioPage.evaluate((id) => JSON.parse(localStorage.getItem('r4-networking-v2')).sessions.find((session) => session.id === id).autoLocation, syncIds.sessionId);
await restoreForm.locator('input[name="location"]').fill(autoLocation);
await restoreForm.locator('button').last().click();
await syncScenario.scenarioPage.locator('[data-action="close-sheet"]').first().click();
const localizedSession = await syncScenario.scenarioPage.evaluate((id) => JSON.parse(localStorage.getItem('r4-networking-v2')).sessions.find((session) => session.momentId === id), syncIds.threadId);
assert.equal(localizedSession.title, 'my private moment title', 'sync must preserve a manually edited title');
assert.equal(localizedSession.notes, 'my private notes', 'sync must preserve manually edited notes');
assert.equal(localizedSession.location, localizedSession.autoLocation, 'restoring the auto location should restore the translated location');
assert.doesNotMatch(localizedSession.topic, /you both care about/i, 'automatic moment topic should follow the selected language');
const restoredThread = await syncScenario.scenarioPage.evaluate((id) => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((thread) => thread.id === id), syncIds.threadId);
assert.equal(restoredThread.placeOverride, null, 'restoring the auto location should clear the thread override');
assert.doesNotMatch(localizedSession.location, /coffee bar|lounge|atrium|garden room/i, 'automatic location should follow the selected language');
await syncScenario.scenarioPage.locator('.tab[data-tab="backstage"]').click();
await syncScenario.scenarioPage.locator(`.thread-card[data-id="${syncIds.threadId}"]`).click();
const restoredDetail = await syncScenario.scenarioPage.locator('#sheet-root').innerText();
assert.ok(restoredDetail.includes(localizedSession.location), 'thread detail should render the translated automatic location again');
assert.doesNotMatch(restoredDetail, /QA terrace/, 'restoring the automatic location should remove the custom location from thread detail');
await syncScenario.scenarioPage.locator('[data-action="close-sheet"]').first().click();
await syncScenario.scenarioPage.locator('.tab[data-tab="agenda"]').click();
await syncScenario.scenarioPage.locator(`[data-action="pick-day"][data-key="day"][data-day="${syncIds.day}"]`).click();
await syncScenario.scenarioPage.locator(`[data-action="session"][data-id="${syncIds.sessionId}"]`).evaluate((el) => el.click());
await syncScenario.scenarioPage.locator('[data-action="edit-session"]').click();
const emptyLocationForm = syncScenario.scenarioPage.locator('[data-form="session"]');
await emptyLocationForm.locator('input[name="location"]').fill('');
await emptyLocationForm.locator('button').last().click();
await syncScenario.scenarioPage.locator('[data-action="close-sheet"]').first().click();
const emptyLocationResult = await syncScenario.scenarioPage.evaluate((id) => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  return {
    thread: state.backstage.threads.find((thread) => thread.id === id),
    session: state.sessions.find((session) => session.momentId === id),
  };
}, syncIds.threadId);
assert.equal(emptyLocationResult.thread.placeOverride, '', 'an explicitly empty agenda location should remain an empty override');
assert.equal(emptyLocationResult.session.location, '', 'an explicitly empty agenda location should be saved as empty');
await syncScenario.scenarioPage.locator('.tab[data-tab="backstage"]').click();
const emptyLocationCard = syncScenario.scenarioPage.locator(`.thread-card[data-id="${syncIds.threadId}"]`);
assert.ok(!(await emptyLocationCard.innerText()).includes(localizedSession.location), 'Backstage card should not show the old venue after clearing the location');
await emptyLocationCard.click();
const emptyLocationDetail = await syncScenario.scenarioPage.locator('#sheet-root').innerText();
assert.ok(!emptyLocationDetail.includes(localizedSession.location), 'thread detail should not show the old venue after clearing the location');
await syncScenario.scenarioContext.close();

const earlyStartScenario = await makeScenario();
await earlyStartScenario.scenarioPage.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  const today = new Date();
  state.me.eventStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  state.me.days = 1; state.me.dayStart = '00:00'; state.me.dayEnd = '23:55';
  state.backstage.charter.quietAfter = '23:55';
  localStorage.setItem('r4-networking-v2', JSON.stringify(state));
});
await earlyStartScenario.scenarioPage.reload();
await fastForwardScenario(earlyStartScenario.scenarioPage);
await earlyStartScenario.scenarioPage.locator('.tab[data-tab="today"]').click();
await earlyStartScenario.scenarioPage.locator('.needs-you-card [data-action="thread-yes"]').first().click();
await earlyStartScenario.scenarioPage.waitForSelector('#sheet-root .reveal-sheet');
await earlyStartScenario.scenarioPage.locator('[data-action="close-sheet"]').last().click();
const earlyId = await earlyStartScenario.scenarioPage.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((thread) => thread.revealed)?.id);
await earlyStartScenario.scenarioPage.locator('.tab[data-tab="backstage"]').click();
await earlyStartScenario.scenarioPage.locator(`[data-action="thread-open"][data-id="${earlyId}"]`).first().click();
await earlyStartScenario.scenarioPage.locator(`[data-action="moment-start"][data-id="${earlyId}"]`).click();
const earlyResult = await earlyStartScenario.scenarioPage.evaluate((id) => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  const thread = state.backstage.threads.find((item) => item.id === id);
  const session = state.sessions.find((item) => item.momentId === id);
  const now = new Date();
  return { thread: { day: thread.day, start: thread.start, minutes: thread.minutes }, session: { day: session.day, start: session.start, end: session.end }, now: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` };
}, earlyId);
assert.ok(Math.abs((Number(earlyResult.thread.start.slice(0, 2)) * 60 + Number(earlyResult.thread.start.slice(3))) - (Number(earlyResult.now.slice(0, 2)) * 60 + Number(earlyResult.now.slice(3)))) <= 1, 'early start should rebook the thread to now');
const earlyEndMinutes = (Number(earlyResult.thread.start.slice(0, 2)) * 60 + Number(earlyResult.thread.start.slice(3)) + earlyResult.thread.minutes) % 1440;
assert.deepEqual(earlyResult.session, { day: earlyResult.thread.day, start: earlyResult.thread.start, end: `${String(Math.floor(earlyEndMinutes / 60)).padStart(2, '0')}:${String(earlyEndMinutes % 60).padStart(2, '0')}` }, 'early start must update the linked session time');
await earlyStartScenario.scenarioPage.locator('[data-action="close-sheet"]').first().click();
await earlyStartScenario.scenarioPage.evaluate((id) => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  state.me.eventStart = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  state.me.days = 1;
  const thread = state.backstage.threads.find((item) => item.id === id);
  thread.stage = 'confirmed'; thread.day = 0; thread.start = '09:00';
  delete thread.liveStartedAt; thread.liveSheetShown = false;
  const session = state.sessions.find((item) => item.momentId === id);
  session.day = 0; session.start = '09:00';
  const end = 540 + thread.minutes;
  session.end = `${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
  localStorage.setItem('r4-networking-v2', JSON.stringify(state));
}, earlyId);
await earlyStartScenario.scenarioPage.reload();
await earlyStartScenario.scenarioPage.locator('.tab[data-tab="backstage"]').click();
await earlyStartScenario.scenarioPage.locator(`[data-action="thread-open"][data-id="${earlyId}"]`).first().click();
await earlyStartScenario.scenarioPage.locator(`[data-action="moment-start"][data-id="${earlyId}"]`).click();
const outsideWindowResult = await earlyStartScenario.scenarioPage.evaluate((id) => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  const thread = state.backstage.threads.find((item) => item.id === id);
  const session = state.sessions.find((item) => item.momentId === id);
  return { thread: { stage: thread.stage, day: thread.day, start: thread.start }, session: { day: session.day, start: session.start, end: session.end } };
}, earlyId);
const futureEnd = (540 + earlyResult.thread.minutes) % 1440;
assert.deepEqual(outsideWindowResult, {
  thread: { stage: 'live', day: 0, start: '09:00' },
  session: { day: 0, start: '09:00', end: `${String(Math.floor(futureEnd / 60)).padStart(2, '0')}:${String(futureEnd % 60).padStart(2, '0')}` },
}, 'an early start outside the event window must go live without rescheduling the thread or session');
await earlyStartScenario.scenarioContext.close();

const unratedScenario = await makeScenario();
await fastForwardScenario(unratedScenario.scenarioPage);
await unratedScenario.scenarioPage.locator('.tab[data-tab="today"]').click();
await unratedScenario.scenarioPage.locator('.needs-you-card [data-action="thread-yes"]').first().click();
await unratedScenario.scenarioPage.waitForSelector('#sheet-root .reveal-sheet');
await unratedScenario.scenarioPage.locator('[data-action="close-sheet"]').last().click();
const unratedId = await unratedScenario.scenarioPage.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((thread) => thread.revealed)?.id);
assert.ok(unratedId, 'timeout regression needs a revealed moment');
await unratedScenario.scenarioPage.locator('.tab[data-tab="backstage"]').click();
await unratedScenario.scenarioPage.locator(`[data-action="thread-open"][data-id="${unratedId}"]`).first().click();
await unratedScenario.scenarioPage.locator(`[data-action="moment-start"][data-id="${unratedId}"]`).click();
await unratedScenario.scenarioPage.waitForSelector('#sheet-root .moment-live');
await unratedScenario.scenarioPage.locator('[data-action="moment-end"]').click();
await unratedScenario.scenarioPage.waitForSelector('#sheet-root .rating-options');
const unratedStats = await unratedScenario.scenarioPage.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.stats);
const unratedMinutes = await unratedScenario.scenarioPage.evaluate((id) => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((thread) => thread.id === id).minutes, unratedId);
await unratedScenario.scenarioPage.evaluate(() => {
  window.__testNow = Date.now();
  Date.now = () => window.__testNow;
});
await unratedScenario.scenarioPage.evaluate((minutes) => { window.__testNow += (minutes + 16) * 60000; }, unratedMinutes);
await unratedScenario.scenarioPage.locator('[data-action="fast-forward"]').evaluate((el) => el.click());
await unratedScenario.scenarioPage.waitForFunction((id) => {
  const thread = JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((item) => item.id === id);
  return thread?.stage === 'done' && thread.outcome === 'unrated';
}, unratedId);
const unratedResult = await unratedScenario.scenarioPage.evaluate((id) => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  const thread = state.backstage.threads.find((item) => item.id === id);
  return { thread, stats: state.backstage.stats };
}, unratedId);
assert.equal(await unratedScenario.scenarioPage.locator('#sheet-root .sheet').count(), 0, 'timeout should close the open rating sheet');
assert.equal(unratedResult.stats.moments, unratedStats.moments, 'an abandoned live moment must not change the moments stat');
assert.equal(unratedResult.thread.outcome, 'unrated');
await unratedScenario.scenarioContext.close();

const momentHereScenario = await makeScenario();
await fastForwardScenario(momentHereScenario.scenarioPage);
await momentHereScenario.scenarioPage.locator('.tab[data-tab="today"]').click();
await momentHereScenario.scenarioPage.locator('.needs-you-card [data-action="thread-yes"]').first().click();
await momentHereScenario.scenarioPage.waitForSelector('#sheet-root .reveal-sheet');
await momentHereScenario.scenarioPage.locator('[data-action="close-sheet"]').last().click();
const momentHereId = await momentHereScenario.scenarioPage.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((thread) => thread.revealed)?.id);
assert.ok(momentHereId, 'moment-here timeout regression needs a revealed moment');
await momentHereScenario.scenarioPage.locator('.tab[data-tab="backstage"]').click();
await momentHereScenario.scenarioPage.locator(`[data-action="thread-open"][data-id="${momentHereId}"]`).first().click();
await momentHereScenario.scenarioPage.locator(`[data-action="moment-start"][data-id="${momentHereId}"]`).click();
await momentHereScenario.scenarioPage.waitForSelector('#sheet-root .moment-live');
await momentHereScenario.scenarioPage.evaluate(() => {
  const realSetTimeout = window.setTimeout.bind(window);
  window.__momentHereCallback = null;
  window.setTimeout = (callback, delay, ...args) => {
    if (delay === 1500) {
      window.__momentHereCallback = () => callback(...args);
      return 0;
    }
    return realSetTimeout(callback, delay, ...args);
  };
});
await momentHereScenario.scenarioPage.locator(`[data-action="moment-here"][data-id="${momentHereId}"]`).click();
const momentHereMinutes = await momentHereScenario.scenarioPage.evaluate((id) => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((thread) => thread.id === id).minutes, momentHereId);
await momentHereScenario.scenarioPage.evaluate(() => {
  window.__testNow = Date.now();
  Date.now = () => window.__testNow;
});
await momentHereScenario.scenarioPage.evaluate((minutes) => { window.__testNow += (minutes + 16) * 60000; }, momentHereMinutes);
await momentHereScenario.scenarioPage.locator('[data-action="fast-forward"]').evaluate((el) => el.click());
await momentHereScenario.scenarioPage.waitForFunction((id) => {
  const thread = JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((item) => item.id === id);
  return thread?.stage === 'done' && thread.outcome === 'unrated';
}, momentHereId);
await momentHereScenario.scenarioPage.evaluate(() => {
  if (!window.__momentHereCallback) throw new Error('moment-here did not schedule its delayed callback');
  window.__momentHereCallback();
});
const momentHereResult = await momentHereScenario.scenarioPage.evaluate((id) => {
  const thread = JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((item) => item.id === id);
  return { peerHere: Boolean(thread.peerHere), promised: Boolean(thread.promised) };
}, momentHereId);
assert.equal(await momentHereScenario.scenarioPage.locator('#sheet-root .sheet').count(), 0, 'timed-out moment-here callback must not reopen the sheet');
assert.deepEqual(momentHereResult, { peerHere: false, promised: false }, 'timed-out moment-here callback must not update the completed thread');
await momentHereScenario.scenarioContext.close();

const privacyScenario = await makeScenario();
await privacyScenario.scenarioPage.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  state.me.name = 'preconsent privacy owner';
  state.me.email = 'private-owner@example.test';
  state.me.phone = '+1-555-0100';
  state.backstage.charter.hideNameUntilYes = true;
  state.backstage.threads = [];
  state.backstage.stats.agents = 0;
  state.backstage.injectionDone = false;
  localStorage.setItem('r4-networking-v2', JSON.stringify(state));
});
await privacyScenario.scenarioPage.reload();
await fastForwardScenario(privacyScenario.scenarioPage);
const privateThreadRecords = await privacyScenario.scenarioPage.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  return { identity: [state.me.name, state.me.email, state.me.phone], records: state.backstage.threads.flatMap((thread) => thread.msgs).map((msg) => JSON.stringify({ text: msg.text, params: msg.params, json: msg.json })) };
});
for (const secret of privateThreadRecords.identity.filter(Boolean)) {
  assert.ok(privateThreadRecords.records.every((record) => !record.includes(secret)), `pre-consent thread transcript must not contain ${secret}`);
}
await privacyScenario.scenarioContext.close();

await page.locator('[data-action="set-lang"][data-lang="en"]').first().click();
await page.locator('[data-action="open-settings"]').click();
await page.waitForSelector('.foundation-about');
assert.equal(await page.locator('.foundation-about a[href="https://www.aigovops-foundation.com"]').count(), 1);
assert.equal(await page.locator('.foundation-about a[href="https://github.com/bobrapp/OpenConvention-rapp-v1"]').count(), 1);
await page.locator('[data-action="close-sheet"]').first().click();

assert.deepEqual(errors, [], `browser errors:\n${errors.join('\n')}`);
console.log('smoke ok: onboarding, review fixes 1-6, reveal, agenda, A2A ledger, privacy, v1 migration and es/pt tabs; no console/page errors or horizontal overflow.');
console.log(`screenshots: ${shots}`);
await browser.close();
