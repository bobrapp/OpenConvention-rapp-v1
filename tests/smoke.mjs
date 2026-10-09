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
  await scenarioPage.locator('[data-action="open-charter"]').evaluate((el) => el.click());
  const toggle = scenarioPage.locator(`[data-action="charter-toggle"][data-key="${key}"]`);
  if (await toggle.isChecked() !== checked) await toggle.click();
  await scenarioPage.locator('[data-action="close-sheet"]').first().click();
};
const widthCheck = async () => {
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(width <= 390, `horizontal overflow: scrollWidth=${width}`);
};
await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
await page.goto(base, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#sheet-root .sheet');
assert.match(await page.locator('#sheet-root').innerText(), /meet your agent/i);
await shot('charter-sheet', '#sheet-root .sheet');
await page.locator('input[name="give"]').fill('facilitation');
await page.locator('input[name="ask"]').fill('AI adoption');
await page.locator('[data-form="charter"] button[type="submit"], [data-form="charter"] button').click();
await page.waitForFunction(() => JSON.parse(localStorage.getItem('r4-networking-v2') || '{}').backstage?.onboarded);

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
  const agendaMomentId = await page.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((thread) => thread.revealed)?.momentId);
  const agendaMoment = page.locator(`[data-action="session"][data-id="${agendaMomentId}"]`);
  assert.ok(await agendaMoment.count(), `${language} agenda should show the mutual reveal session`);
  assert.doesNotMatch((await agendaMoment.innerText()).toLowerCase(), new RegExp(englishLeaks.join('|')));
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
await askScenario.scenarioPage.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  state.backstage.autonomy = 'ask';
  localStorage.setItem('r4-networking-v2', JSON.stringify(state));
  location.reload();
});
await fastForwardScenario(askScenario.scenarioPage, 16);
assert.ok(await askScenario.scenarioPage.locator('.draft-card').count(), 'ask mode should surface an outbound draft');
await shotOn(askScenario.scenarioPage, 'ask-mode-draft', '.draft-card');
const draftId = await askScenario.scenarioPage.locator('.draft-card [data-action="thread-send-draft"]').first().getAttribute('data-id');
await askScenario.scenarioPage.locator('.draft-card [data-action="thread-send-draft"]').first().click();
await askScenario.scenarioPage.locator('[data-action="fast-forward"]').evaluate((el) => el.click());
const sentDraft = await askScenario.scenarioPage.evaluate((id) => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((thread) => thread.id === id), draftId);
assert.equal(sentDraft.draftPending, false, 'send it should clear draftPending');
for (let i = 0; i < 16 && !(await askScenario.scenarioPage.locator('.draft-card').count()); i++) {
  if (await askScenario.scenarioPage.locator('.alert-pop').count()) await askScenario.scenarioPage.locator('.alert-pop').evaluate((el) => el.click());
  await askScenario.scenarioPage.locator('[data-action="fast-forward"]').evaluate((el) => el.click());
}
const skipCard = askScenario.scenarioPage.locator('.draft-card').first();
if (await skipCard.count()) {
  const skipId = await skipCard.locator('[data-action="thread-skip-draft"]').getAttribute('data-id');
  const beforeNos = await askScenario.scenarioPage.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.stats.nosAbsorbed);
  await skipCard.locator('[data-action="thread-skip-draft"]').click();
  const skipped = await askScenario.scenarioPage.evaluate((id) => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.threads.find((thread) => thread.id === id), skipId);
  const afterNos = await askScenario.scenarioPage.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')).backstage.stats.nosAbsorbed);
  assert.equal(skipped.stage, 'declined', 'skip should decline the draft');
  assert.equal(afterNos, beforeNos, 'skipping a draft must not increment absorbed no stats');
}
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
await pastScenario.scenarioPage.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('r4-networking-v2'));
  const old = new Date(Date.now() - 10 * 86400000);
  state.backstage.threads = [];
  state.backstage.stats = { agents: 0, convos: 0, nosAbsorbed: 0, blocked: 0, moments: 0, sparks: 0 };
  state.backstage.seed = 1;
  state.me.eventStart = old.toISOString().slice(0, 10);
  state.me.days = 1;
  localStorage.setItem('r4-networking-v2', JSON.stringify(state));
  location.reload();
});
await fastForwardScenario(pastScenario.scenarioPage, 4);
const pastState = await pastScenario.scenarioPage.evaluate(() => JSON.parse(localStorage.getItem('r4-networking-v2')));
assert.ok(pastState.backstage.threads.every((thread) => !thread.start || new Date(`${pastState.me.eventStart}T${thread.start}:00`) >= new Date()), 'past events must not create past starts');
assert.equal(await pastScenario.scenarioPage.locator('.moment-live').count(), 0, 'past events must not open moment sheets');
assert.match(await pastScenario.scenarioPage.locator('#view').innerText(), /event dates are over/i);
await pastScenario.scenarioContext.close();

assert.deepEqual(errors, [], `browser errors:\n${errors.join('\n')}`);
console.log('smoke ok: onboarding, needs-you, reveal, agenda, A2A ledger, injection block, live spark, v1 migration, es/pt tabs; no console/page errors or horizontal overflow.');
console.log(`screenshots: ${shots}`);
await browser.close();
