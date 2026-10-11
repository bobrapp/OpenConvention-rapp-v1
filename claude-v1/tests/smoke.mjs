// Smoke test: loads the standalone page with the example data and walks every tab and the main flows.
// Run from this folder: npm install && npm test   (set CHROMIUM_PATH to use an existing Chromium)
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const seed = fs.readFileSync(path.join(root, 'examples', 'examples.json'), 'utf8');
const page = 'file://' + path.join(root, 'index.html');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const problems = [];
const note = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) problems.push(what); };

for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') problems.push(scheme + ' console: ' + m.text()); });
  p.on('pageerror', e => problems.push(scheme + ' page error: ' + e.message));
  await p.addInitScript(s => { try { if (!localStorage.getItem('r4companion.v1')) localStorage.setItem('r4companion.v1', s); } catch (e) {} }, seed);
  await p.goto(page); await p.waitForTimeout(800);
  const stored = () => p.evaluate(() => JSON.parse(localStorage.getItem('r4companion.v1')));
  const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

  for (const t of ['today', 'people', 'agenda', 'web', 'pitch', 'report']) {
    await p.click(`.tab[data-tab="${t}"]`); await p.waitForTimeout(80);
    note((await overflow()) <= 0, `${scheme}: ${t} tab fits a phone width`);
  }
  if (scheme === 'dark') { await ctx.close(); continue; }

  await p.click('.tab[data-tab="people"]'); await p.click('[data-act="quickAdd"]'); await p.click('#sheet-body [data-act="addPerson"]');
  await p.fill('#f-name', 'Quinn Test'); await p.fill('#f-newtopics', 'ai governance, testing'); await p.fill('#f-fu', 'send notes');
  await p.fill('#f-aname', 'Scout'); await p.fill('#f-ahandles', 'chief of staff');
  await p.click('#sheet-form button[type=submit]'); await p.waitForTimeout(100);
  const q = (await stored()).people.find(x => x.name === 'Quinn Test');
  note(!!q && q.fu.text === 'send notes' && q.topics.includes('testing') && q.agent.name === 'Scout', 'a logged person keeps their subjects, follow-up and agent');

  await p.click('[data-mode="agents"]'); await p.waitForTimeout(100);
  note((await p.locator('[data-act="copyAgentAsk"]').count()) >= 3, 'agents view lists every logged agent');
  note((await overflow()) <= 0, 'agents view fits a phone width');

  await p.click('.tab[data-tab="agenda"]'); await p.waitForTimeout(80);
  note((await p.locator('.chip.flag').count()) >= 2, 'agenda flags the clash between a session and a work block');
  note((await p.locator('.slot.free').count()) >= 1, 'agenda shows free windows');

  await p.click('.tab[data-tab="web"]'); await p.click('button.chip[data-t="ai governance"]'); await p.waitForTimeout(80);
  note((await p.locator('.group').count()) >= 1, 'a subject builds at least one small group');

  await p.click('.tab[data-tab="pitch"]'); await p.click('[data-act="tToggle"]'); await p.waitForTimeout(1300);
  note((await p.textContent('#t-num')) === '1:59', 'pitch timer counts down from two minutes');
  await p.click('[data-act="spark"]'); await p.waitForTimeout(80);
  note((await stored()).pitches.some(x => x.sparked), 'a pitch that sparked something is recorded');

  await p.click('.tab[data-tab="report"]'); await p.waitForTimeout(80);
  const report = await p.textContent('.report');
  note(report.includes('who I met, by persona') && report.includes('agents met') && report.includes('Quinn Test'), 'team report covers personas, agents and the new person');

  await p.click('.tab[data-tab="today"]'); await p.click('[data-act="clearExamples"]'); await p.waitForTimeout(100);
  const s = await stored();
  note(s.people.length === 1 && s.sessions.length === 0 && s.goals.length === 0 && s.settings.example === false, 'clearing examples leaves only real entries');
  if (scheme === 'light') {
    await p.click('[data-act="settings"]');
    await p.click('[role="radio"][data-brand="aigovops"]');
    note(await p.locator('html').getAttribute('data-brand') === 'aigovops', 'brand choice applies immediately');
    note((await stored()).settings.brand === 'aigovops', 'brand choice persists in local storage');
    await p.reload(); await p.waitForTimeout(100);
    note(await p.locator('html').getAttribute('data-brand') === 'aigovops', 'brand choice persists after reload');
  }
  await ctx.close();
}
await browser.close();
console.log(problems.length ? `\n${problems.length} problem(s):\n- ` + problems.join('\n- ') : '\nall checks passed');
process.exit(problems.length ? 1 : 0);
