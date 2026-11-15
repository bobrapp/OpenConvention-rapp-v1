import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { emptyBackup } from './fixtures.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const server = http.createServer((req, res) => {
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (!file.startsWith(root + path.sep) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    res.end(fs.readFileSync(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`, key = 'r4-networking-v1';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--disable-background-networking', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
async function context() {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 860 }, timezoneId: 'UTC', serviceWorkers: 'block' });
  await ctx.route('**/*', route => {
    const url = new URL(route.request().url());
    if (/^https?:$/.test(url.protocol) && url.origin !== origin) throw new Error('Unexpected external request: ' + url.origin);
    return route.continue();
  });
  return ctx;
}
try {
  for (const entry of ['index.html', 'R4%20Muse%20V1']) {
    const ctx = await context(), page = await ctx.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/' + entry);
    await page.waitForSelector('#tabbar button');
    const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    const initial = await stored();
    check(initial.people.length > 0 && initial.sessions.length > 0, entry + ': demo loads');
    for (const tab of await page.locator('#tabbar button').evaluateAll(nodes => nodes.map(n => n.dataset.tab))) {
      await page.click(`#tabbar [data-tab="${tab}"]`);
      check(await page.locator('#view').innerText(), entry + ': tab ' + tab);
    }
    for (const lang of ['es', 'pt', 'en']) {
      await page.click(`[data-action=set-lang][data-lang=${lang}]`);
      check(await page.getAttribute('html', 'lang') === lang, entry + ': language ' + lang);
    }
    const baseline = await stored();
    async function load(value, raw = false) {
      if (!await page.locator('#json-file').count()) await page.click('[data-action=open-settings]');
      await page.locator('#json-file').setInputFiles({ name: 'synthetic-backup.json', mimeType: 'application/json', buffer: Buffer.from(raw ? value : JSON.stringify(value)) });
      await page.waitForTimeout(100);
    }
    await load('{malformed JSON', true);
    check(JSON.stringify(await stored()) === JSON.stringify(baseline), entry + ': malformed JSON preserves the current project');
    await page.locator('#json-file').setInputFiles({ name: 'oversized.json', mimeType: 'application/json', buffer: Buffer.alloc(20 * 1024 * 1024 + 1, 32) });
    await page.waitForTimeout(100);
    check(JSON.stringify(await stored()) === JSON.stringify(baseline) && (await page.locator('#toast').innerText()).includes('20 MiB'), entry + ': oversized backup rejected before reading');
    for (const modify of [
      x => { x.people[0].id = 'x" data-marker="person'; },
      x => { x.sessions[0].id = 'x" data-marker="session'; },
      x => { x.sessions = {}; }, x => { x.people[0].topics = {}; },
      x => { x.me.days = 'x" data-marker="days'; },
      x => { x.version = 0; }, x => { delete x.me; }
    ]) {
      const bad = structuredClone(baseline); modify(bad); await load(bad);
      check(JSON.stringify(await stored()) === JSON.stringify(baseline) && !await page.locator('[data-marker]').count(), entry + ': invalid import is atomic and cannot inject attributes');
    }
    await page.evaluate(key => {
      window.syntheticSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, value) { if (k === key) throw new Error('Synthetic quota'); return syntheticSet.call(this, k, value); };
    }, key);
    const replacement = structuredClone(baseline); replacement.me.eventName = 'Must not activate';
    await load(replacement);
    await page.evaluate(() => { Storage.prototype.setItem = syntheticSet; delete window.syntheticSet; });
    await page.click('[data-action=close-sheet]');
    await page.click('#tabbar [data-tab=today]');
    check(JSON.stringify(await stored()) === JSON.stringify(baseline) && !(await page.title()).includes('Must not activate'), entry + ': failed storage does not replace live or stored state');
    await load(emptyBackup());
    const empty = await stored();
    check(!empty.people.length && !empty.sessions.length, entry + ': valid empty backup');
    check((await page.evaluate(key => JSON.parse(localStorage.getItem(key + '.previous')), key)).people.length === baseline.people.length, entry + ': previous snapshot retained');
    await page.click('[data-action=open-settings]');
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-action=export-previous]')]);
    check(JSON.parse(fs.readFileSync(await download.path(), 'utf8')).people.length === baseline.people.length, entry + ': previous snapshot can be exported through the UI');
    const legacy = emptyBackup(); delete legacy.cosSeeded; delete legacy.headlinerSeeded; delete legacy.agents; delete legacy.me.lang;
    await load(legacy);
    check((await stored()).cosSeeded && (await stored()).agents.on.researcher, entry + ': legacy v1 migration');
    await load(emptyBackup());
    await page.click('#tabbar [data-tab=agenda]');
    const calendar = 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART;TZID=America/New_York:20261114T090000\nDTEND;TZID=America/New_York:20261114T100000\nSUMMARY:Synthetic TZ check\nEND:VEVENT\nEND:VCALENDAR';
    await page.locator('#ics-file').setInputFiles({ name: 'synthetic.ics', mimeType: 'text/calendar', buffer: Buffer.from(calendar) });
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).sessions.some(x => x.title === 'Synthetic TZ check'), key);
    check((await stored()).sessions.find(x => x.title === 'Synthetic TZ check').start === '14:00', entry + ': actual calendar import preserves instant under UTC');
    const before = JSON.stringify(await stored());
    await page.locator('#ics-file').setInputFiles({ name: 'unsupported.ics', mimeType: 'text/calendar', buffer: Buffer.from(calendar.replaceAll('America/New_York', 'Unknown/Zone')) });
    await page.waitForTimeout(100);
    check(JSON.stringify(await stored()) === before && (await page.locator('#toast').innerText()).includes('Unsupported calendar TZID'), entry + ': unsupported TZID warns and leaves agenda unchanged');
    const shorter = emptyBackup(); shorter.agents.proposals = [{ id: 'synthetic-proposal', personId: 'synthetic-person', status: 'pending', day: 2, start: '10:00', end: '10:30', location: 'Hall', brief: 'Synthetic', inbound: false }];
    await load(shorter);
    await page.click('[data-action=open-settings]');
    await page.fill('form[data-form=settings] [name=days]', '1');
    await page.click('form[data-form=settings] button.btn.block');
    await page.reload(); await page.waitForSelector('#tabbar button');
    check((await stored()).me.days === 1 && (await stored()).agents.proposals[0].day === 0 && (await page.title()).includes('Synthetic event'), entry + ': shortening the event keeps the saved project valid');
    await page.reload(); await page.waitForSelector('#tabbar button');
    check(!errors.length, entry + ': no page errors, including after reload');
    await ctx.close();
    for (const previous of [false, true]) {
      const recovery = await context(), p = await recovery.newPage();
      const valid = emptyBackup(); valid.me.eventName = 'Recovered synthetic project';
      await p.addInitScript(({ key, valid, previous }) => { localStorage.setItem(key, '{"version":1,"sessions":{}}'); if (previous) localStorage.setItem(key + '.previous', JSON.stringify(valid)); }, { key, valid, previous });
      await p.goto(origin + '/' + entry); await p.waitForSelector('#tabbar button');
      check(await p.evaluate(key => localStorage.getItem(key) === '{"version":1,"sessions":{}}', key), entry + ': boot preserves invalid snapshot');
      check((await p.locator('#toast').innerText()).includes('original was kept'), entry + ': boot reports recovery');
      if (previous) check((await p.title()).includes('Recovered synthetic project'), entry + ': boot selects valid previous snapshot');
      await p.click('#tabbar [data-tab=today]');
      await p.waitForTimeout(1600);
      check(await p.evaluate(key => localStorage.getItem(key) === '{"version":1,"sessions":{}}', key), entry + ': automatic rendering and alert bookkeeping preserve rejected data');
      if (previous) {
        const prior = await p.evaluate(key => localStorage.getItem(key + '.previous'), key);
        await p.click('#tabbar [data-tab=agenda]');
        await p.locator('#ics-file').setInputFiles({ name: 'synthetic.ics', mimeType: 'text/calendar', buffer: Buffer.from(calendar) });
        await p.waitForFunction(() => document.querySelector('#toast').innerText.includes('imported'));
        check(await p.evaluate(({ key, prior }) => localStorage.getItem(key) === '{"version":1,"sessions":{}}' && localStorage.getItem(key + '.previous') === prior, { key, prior }), entry + ': calendar import during recovery keeps rejected and previous snapshots');
      }
      await p.click('[data-action=accept-recovery]');
      check(await p.evaluate(key => Array.isArray(JSON.parse(localStorage.getItem(key)).sessions), key), entry + ': explicit recovery resumes persistence');
      await recovery.close();
    }
  }
  console.log(`root/Muse browser: ${checks} checks passed; imports, recovery, calendar and localization are offline`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
