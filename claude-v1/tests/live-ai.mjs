import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const seed = fs.readFileSync(path.join(root, 'examples', 'examples.json'), 'utf8');
const appUrl = 'file://' + path.join(root, 'index.html');
const key = 'sk-ant-test-1234';
const apiUrl = 'https://api.anthropic.com/v1/messages';
const cors = {
  'access-control-allow-origin':'*',
  'access-control-allow-methods':'POST, OPTIONS',
  'access-control-allow-headers':'anthropic-version, anthropic-dangerous-direct-browser-access, content-type, x-api-key',
  'content-type':'application/json'
};
const defaultReply = {
  content:[{type:'text', text:'```json\n[{"name":"Live Person","role":"VP Operations","company":"Example Corp","persona":"exec","topics":[]}]\n```'}]
};
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined});
const problems = [];
const note = (ok, message) => { console.log((ok ? 'ok   ' : 'FAIL ') + message); if (!ok) problems.push(message); };

async function openApp({storedKey = '', demo = false, artifact = false} = {}){
  const context = await browser.newContext({viewport:{width:390,height:844}, deviceScaleFactor:2});
  const page = await context.newPage(), calls = [];
  let response = () => ({status:200, body:defaultReply});
  page.on('console', message => {
    if (message.type() === 'error' && !/status of (401|429) \(/.test(message.text())) problems.push('console: ' + message.text());
  });
  page.on('pageerror', error => problems.push('page error: ' + error.message));
  await page.route(apiUrl, async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({status:204, headers:cors, body:''});
      return;
    }
    calls.push({headers:request.headers(), body:JSON.parse(request.postData() || '{}')});
    const result = response(request);
    await route.fulfill({status:result.status, headers:cors, body:JSON.stringify(result.body)});
  });
  await page.addInitScript(({state, savedKey, withArtifact}) => {
    localStorage.setItem('r4companion.v1', state);
    if (savedKey) localStorage.setItem('r4-claude-anthropic-key', savedKey);
    if (withArtifact) {
      const sample = async () => null;
      sample.json = async () => [{name:'Artifact Person', role:'Researcher', company:'Example University', persona:'peer', topics:[]}];
      sample.limits = async () => ({images:{mediaTypes:['image/jpeg','image/png']}});
      window.claude = {use:async name => name === 'sample' ? sample : null};
    }
  }, {state:seed, savedKey:storedKey, withArtifact:artifact});
  await page.goto(appUrl + (demo ? '?demo=maya' : ''));
  await page.waitForTimeout(350);
  return {context, page, calls, setResponse(value){ response = typeof value === 'function' ? value : () => value; }};
}

async function openSettings(page){
  await page.click('#settings-trigger');
  await page.waitForSelector('#ai-key-state');
}
async function closeSheet(page){
  await page.locator('#sheet-foot [data-act="closeSheet"]').click();
}
async function importPeople(page, text){
  await page.click('.tab[data-tab="people"]');
  await page.click('[data-act="importOpen"]');
  await page.fill('#f-paste', text);
  await page.click('#sheet-form button[type="submit"]');
  await page.waitForSelector('#imp-0');
}

try {
  const local = await openApp();
  await importPeople(local.page, 'NoKey Person, Senior Engineer, Northwind Labs');
  note((await local.page.textContent('#sheet-body')).includes('Read by the app’s own rules.') && local.calls.length === 0,
    'without a key, people import uses local rules and makes no API request');
  await closeSheet(local.page);
  await local.context.close();

  const live = await openApp();
  await openSettings(live.page);
  note((await live.page.textContent('#ai-key-state')).includes("Off · using the app's own rules"), 'settings starts with live AI off');
  await live.page.fill('#f-ai-key', key);
  await live.page.click('[data-act="saveAiKey"]');
  await live.page.waitForFunction(() => document.querySelector('#ai-key-state')?.textContent.includes('…1234'));
  note((await live.page.inputValue('#f-ai-key')) === '' &&
    (await live.page.textContent('#ai-key-state')).includes('…1234') &&
    (await live.page.textContent('#toast')).includes('Key saved on this device'),
    'saving trims and stores the key, shows only its last four characters, and clears the password field');
  const beforeTestReceipts = await live.page.evaluate(async () => (await window.R4Receipts.list()).length);
  await live.page.click('[data-act="testAiKey"]');
  await live.page.waitForFunction(() => document.querySelector('#ai-key-test-status')?.textContent.includes('responded successfully'));
  const afterTestReceipts = await live.page.evaluate(async () => (await window.R4Receipts.list()).length);
  note(live.calls.length === 1 && live.calls[0].body.model === 'claude-haiku-5-5' && beforeTestReceipts === afterTestReceipts,
    'Test sends a quick request directly and does not write a receipt');
  await closeSheet(live.page);
  await importPeople(live.page, 'Live Person, VP Operations, Example Corp');
  note((await live.page.textContent('#sheet-body')).includes('Read by Claude.'), 'fenced JSON is parsed and the import is marked Read by Claude');
  assert.equal(live.calls.length, 2, 'one live API request for the test and one for a people import');
  const call = live.calls[1];
  assert.equal(call.headers['x-api-key'], key);
  assert.equal(call.headers['anthropic-version'], '2023-06-01');
  assert.equal(call.headers['anthropic-dangerous-direct-browser-access'], 'true');
  assert.equal(call.headers['content-type'], 'application/json');
  assert.equal(call.body.model, 'claude-haiku-5-5');
  note(call.body.max_tokens === 4096 && call.body.messages[0].role === 'user' &&
    call.body.messages[0].content.at(-1).type === 'text',
    'live request uses the quick model and the Messages API body shape');
  await live.page.waitForFunction(async () => (await window.R4Receipts.list()).some(entry => JSON.stringify(entry).includes('claude.people.parse')));
  const receipts = await live.page.evaluate(() => window.R4Receipts.list());
  const inference = receipts.find(entry => JSON.stringify(entry).includes('claude.people.parse'));
  const inferenceJson = JSON.stringify(inference);
  note(inferenceJson.includes('"model":"claude-haiku-5-5"') && inferenceJson.includes('"provider":"user-key"'),
    'live inference receipt records its model and user-key provider');
  const privacy = await live.page.evaluate(async keyValue => {
    const rows = Array.from({length:localStorage.length}, (_, index) => {
      const storageKey = localStorage.key(index);
      return [storageKey, localStorage.getItem(storageKey)];
    });
    const state = JSON.parse(localStorage.getItem('r4companion.v1') || '{}');
    const exported = await window.R4Receipts.exportData();
    return {
      leakedStorage:rows.some(([storageKey, value]) => storageKey !== 'r4-claude-anthropic-key' && String(value).includes(keyValue)),
      settings:JSON.stringify(state.settings || {}),
      ndjson:exported.ndjson,
      bundle:exported.bundle,
      bodyText:document.body.innerText
    };
  }, key);
  note(!privacy.leakedStorage && !privacy.settings.includes(key) &&
    !privacy.ndjson.includes(key) && !privacy.bundle.includes(key) && !privacy.bodyText.includes(key),
    'the key appears only in its dedicated localStorage value, not settings, receipts, exports, or UI text');
  await closeSheet(live.page);
  await live.page.click('[data-act="quickAdd"]');
  await live.page.locator('#f-photo').setInputFiles({name:'badge.svg', mimeType:'image/svg+xml', buffer:Buffer.from('<svg/>')});
  await live.page.fill('#f-line', 'Photo Test, Engineer, Example Corp');
  await live.page.click('#sheet-form button[type="submit"]');
  await live.page.waitForSelector('#f-name');
  note(live.calls.length === 2 && (await live.page.textContent('#toast')).includes('That photo could not be read'),
    'unsupported photo types are rejected before making an API request');
  await live.context.close();

  const failures = await openApp({storedKey:key});
  failures.setResponse({status:401, body:{error:{message:'invalid API key'}}});
  await importPeople(failures.page, 'Fallback Person, Director, Example Corp');
  note((await failures.page.textContent('#sheet-body')).includes('Read by the app’s own rules.') &&
    (await failures.page.textContent('#toast')).includes('Your Anthropic key was not accepted'),
    '401 shows the invalid-key message and falls back to local rules');
  note(await failures.page.evaluate(() => localStorage.getItem('r4-claude-anthropic-key')) === key,
    '401 leaves the key stored for a later attempt');
  await closeSheet(failures.page);
  failures.setResponse({status:429, body:{error:{message:'rate limit reached'}}});
  await importPeople(failures.page, 'Rate Person, Director, Example Corp');
  note((await failures.page.textContent('#sheet-body')).includes('Read by the app’s own rules.') &&
    (await failures.page.textContent('#toast')).includes('Claude is busy or at your usage limit'),
    '429 shows the rate-limit message and falls back to local rules');
  await closeSheet(failures.page);
  await openSettings(failures.page);
  await failures.page.click('[data-act="removeAiKey"]');
  note((await failures.page.textContent('#ai-key-state')).includes("Off · using the app's own rules") &&
    (await failures.page.textContent('#toast')).includes('Key removed'),
    'removing the key immediately turns live AI off');
  await closeSheet(failures.page);
  const callsBeforeLocalImport = failures.calls.length;
  await importPeople(failures.page, 'Removed Key Person, Director, Example Corp');
  note(failures.calls.length === callsBeforeLocalImport &&
    (await failures.page.textContent('#sheet-body')).includes('Read by the app’s own rules.'),
    'the next import after removal uses local rules without contacting Anthropic');
  await failures.context.close();

  const demo = await openApp({storedKey:key, demo:true});
  await demo.page.locator('[data-demo-close]').click();
  await openSettings(demo.page);
  note((await demo.page.textContent('#ai-key-state')).includes('Off in demos') &&
    await demo.page.locator('#f-ai-key').count() === 0,
    'demo mode ignores a stored key and hides key entry');
  await closeSheet(demo.page);
  await importPeople(demo.page, 'Demo Person, Researcher, Example University');
  note(demo.calls.length === 0 && (await demo.page.textContent('#sheet-body')).includes('Read by the app’s own rules.'),
    'demo import remains deterministic and never calls the live API');
  await demo.context.close();

  const artifact = await openApp({storedKey:key, artifact:true});
  await openSettings(artifact.page);
  note((await artifact.page.textContent('#ai-key-state')).includes('Using Claude in the Claude app') &&
    await artifact.page.locator('#f-ai-key').count() === 0,
    'Claude artifact settings show the artifact provider and hide the key input');
  await closeSheet(artifact.page);
  await importPeople(artifact.page, 'Artifact Person, Researcher, Example University');
  note(artifact.calls.length === 0 && (await artifact.page.textContent('#sheet-body')).includes('Read by Claude.'),
    'the artifact sample provider wins and liveAsk is not used');
  await artifact.context.close();

  const layout = await openApp();
  await openSettings(layout.page);
  const normal = await layout.page.evaluate(() => ({
    width:document.documentElement.scrollWidth,
    viewport:innerWidth,
    heights:[...document.querySelectorAll('[data-act="saveAiKey"],[data-act="testAiKey"],[data-act="removeAiKey"]')].map(el => el.getBoundingClientRect().height)
  }));
  note(normal.width <= normal.viewport && normal.heights.length === 3 && normal.heights.every(height => height >= 44),
    'live AI settings fit at 390px and all actions meet 44px targets');
  await layout.page.evaluate(() => {
    for (const element of [document.documentElement, ...document.querySelectorAll('body *')]) {
      const size = Number.parseFloat(getComputedStyle(element).fontSize);
      if (size && element.dataset.liveAiZoomApplied !== '1') {
        element.style.setProperty('font-size', `${size * 2}px`, 'important');
        element.dataset.liveAiZoomApplied = '1';
      }
    }
  });
  const zoom = await layout.page.evaluate(() => ({
    width:document.documentElement.scrollWidth,
    viewport:innerWidth,
    heights:[...document.querySelectorAll('[data-act="saveAiKey"],[data-act="testAiKey"],[data-act="removeAiKey"]')].map(el => el.getBoundingClientRect().height)
  }));
  note(zoom.width <= zoom.viewport && zoom.heights.length === 3 && zoom.heights.every(height => height >= 44),
    'live AI settings reflow at 200% text without overflow and preserve 44px actions');
  await layout.context.close();
} finally {
  await browser.close();
}

console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join('\n- ')}` : '\nlive AI checks passed');
process.exit(problems.length ? 1 : 0);
