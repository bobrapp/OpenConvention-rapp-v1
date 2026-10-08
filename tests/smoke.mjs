import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(process.env.UX_PACKAGE || '/Users/devin/ux/package.json');
const { chromium } = require('playwright-core');
const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
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
const shot = async (name, selector = 'body') => {
  const target = page.locator(selector).first();
  if (await target.count()) await target.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: false });
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
  await page.locator('[data-tab="backstage"]').click();
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
await page.emulateMedia({ colorScheme: 'dark' });
await widthCheck();
await shot('now-dark', '.needs-you-card');
await page.emulateMedia({ colorScheme: 'light' });

let reveal = false;
for (let i = 0; i < 8 && !reveal; i++) {
  const card = page.locator('.needs-you-card').first();
  if (!(await card.count())) {
    await page.locator('[data-tab="backstage"]').click();
    await page.locator('[data-action="fast-forward"]').click();
    await page.locator('[data-tab="today"]').click();
    continue;
  }
  await card.locator('[data-action="thread-yes"]').click();
  reveal = await page.locator('#sheet-root .reveal-sheet').count() > 0;
  if (!reveal) {
    await page.locator('[data-tab="backstage"]').click();
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
await page.locator('.tab[data-tab="agenda"]').click();
assert.match(await page.locator('#view').innerText(), /moment with/i);
await widthCheck();

await page.locator('[data-tab="backstage"]').click();
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
await page.locator('[data-action="close-sheet"]').first().click();
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
assert.deepEqual(errors, [], `browser errors:\n${errors.join('\n')}`);
console.log('smoke ok: onboarding, needs-you, reveal, agenda, A2A ledger, injection block, live spark, v1 migration, es/pt tabs; no console/page errors or horizontal overflow.');
console.log(`screenshots: ${shots}`);
await browser.close();
