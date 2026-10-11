import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.env.BASE_URL || 'http://127.0.0.1:60804/R4%20Muse%20V1';
const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const personas = [
  { id: 'maya', name: 'Maya Torres', people: 8, agenda: 6, shots: [2, 4] },
  { id: 'diego', name: 'Diego Alvarez', people: 10, agenda: 5, shots: [2, 5] },
  { id: 'priya', name: 'Dr. Priya Natarajan', people: 8, agenda: 10, shots: [0, 7] },
];
const browser = await chromium.launch({ headless: true, executablePath });

for (const persona of personas) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('r4-networking-v1', 'real-state-sentinel');
    localStorage.setItem('r4-beacon-head-muse', 'null');
    window.__realTouches = [];
    for (const method of ['getItem', 'setItem', 'removeItem']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (key, ...args) {
        if (key === 'r4-networking-v1' || key === 'r4-beacon-head-muse') window.__realTouches.push(`${method}:${key}`);
        return original.call(this, key, ...args);
      };
    }
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (name, ...args) {
      if (name === 'r4-beacon-muse') window.__realTouches.push(`open:${name}`);
      return open.call(this, name, ...args);
    };
  });
  await page.goto(`${base}?demo=${persona.id}&keep=1#persona`);
  await page.getByRole('region', { name: 'demo mode' }).waitFor();
  await page.getByRole('dialog').waitFor();
  const stateKey = `r4-networking-v1-demo-${persona.id}`;
  const demoState = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), stateKey);
  assert.equal(demoState.me.name, persona.name);
  assert.equal(demoState.people.length, persona.people);
  assert.equal(demoState.sessions.length, persona.agenda);
  assert.equal(demoState.me.eventName, 'r4');
  assert.equal(demoState.me.brand, 'slalom');
  assert.ok(demoState.agents.proposals.some((proposal) => proposal.status === 'pending'));
  assert.ok(demoState.agents.proposals.some((proposal) => proposal.status === 'booked'));
  assert.ok(demoState.agents.log.some((message) => message.json.status === 'declined'));
  assert.ok(demoState.agents.log.some((message) => message.json.status === 'blocked-injection'));
  const realSentinels = await page.evaluate(() => {
    const values = [localStorage.getItem('r4-networking-v1'), localStorage.getItem('r4-beacon-head-muse')];
    window.__realTouches = [];
    return values;
  });
    assert.deepEqual(realSentinels, ['real-state-sentinel', 'null']);
  assert.deepEqual(await page.evaluate(() => window.__realTouches), []);
  assert.ok((await page.evaluate(() => indexedDB.databases())).some((db) => db.name === `r4-beacon-muse-demo-${persona.id}`));
  assert.equal((await page.evaluate(() => indexedDB.databases())).some((db) => db.name === 'r4-beacon-muse'), false);

  const axePath = new URL('./node_modules/axe-core/axe.min.js', import.meta.url).pathname;
  await page.addScriptTag({ path: axePath });
  const axeViolations = await page.evaluate(async () => (await axe.run({ include: ['[data-demo-banner]', '[data-demo-tour]'] })).violations.filter((violation) => ['serious', 'critical'].includes(violation.impact)));
  assert.deepEqual(axeViolations, [], `${persona.id} demo has serious/critical axe findings`);
  const baseFont = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize));
  await page.evaluate(() => {
    const elements = [document.documentElement, ...document.body.querySelectorAll('*')];
    const sizes = elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    elements.forEach((element, index) => {
      if (Number.isFinite(sizes[index]) && sizes[index] > 0) element.style.setProperty('font-size', `${sizes[index] * 2}px`, 'important');
    });
  });
  assert.ok(await page.evaluate((size) => Number.parseFloat(getComputedStyle(document.documentElement).fontSize) >= size * 1.99, baseFont), `${persona.id} text did not scale to 200%`);
  assert.ok(await page.evaluate(() => {
    const banner = document.querySelector('[data-demo-banner]');
    const sheet = document.querySelector('[data-demo-tour] .demo-sheet');
    return banner.scrollWidth <= banner.clientWidth && sheet.scrollWidth <= sheet.clientWidth && banner.getBoundingClientRect().right <= 390 && sheet.getBoundingClientRect().right <= 390;
  }), `${persona.id} banner or tour overflows at 200% text`);
  const smallTargets = () => page.evaluate(() => [...document.querySelectorAll('[data-demo-banner] button,[data-demo-banner] a[href],[data-demo-tour] button,[data-demo-tour] a[href]')]
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      return el.getClientRects().length && (rect.width < 44 || rect.height < 44);
    }).map((el) => `${el.outerHTML} ${el.getBoundingClientRect().width}x${el.getBoundingClientRect().height}`));
  assert.deepEqual(await smallTargets(), [], `${persona.id} banner/tour controls are below 44px`);
  assert.deepEqual(await smallTargets(), [], `${persona.id} banner/tour controls are below 44px at 200% text`);
  await page.locator('[data-demo-close]').click();

  for (let index = 0; index < 10; index++) {
    const count = persona.id === 'priya' ? 9 : 10;
    if (index >= count) break;
    if (!(await page.locator('[data-demo-tour]').count())) await page.locator('[data-demo-tour-button]').click();
    await page.locator(`[data-demo-show="${index}"]`).click();
    await page.waitForFunction((i) => window.__r4DemoStep?.index === i, index, { timeout: 5000 });
    const targetInfo = await page.evaluate(() => window.__r4DemoStep);
    assert.equal(targetInfo.fallback, false, `${persona.id} step ${index + 1} fell back (${targetInfo.selector})`);
    const target = page.locator(targetInfo.selector).first();
    await target.waitFor({ state: 'visible', timeout: 5000 });
    const hasContent = await target.evaluate((el) => Boolean((el.innerText || '').trim() || el.innerHTML.trim()));
    assert.equal(hasContent, true, `${persona.id} step ${index + 1} target is empty (${targetInfo.selector})`);
    if (persona.shots.includes(index)) {
      const shotIndex = persona.shots.indexOf(index) + 1;
      const path = new URL(`../docs/demo/muse/${persona.id}-${String(shotIndex).padStart(2, '0')}.png`, import.meta.url).pathname;
      fs.mkdirSync(new URL('../docs/demo/muse/', import.meta.url).pathname, { recursive: true });
      assert.equal(await page.evaluate(() => document.documentElement.dataset.brand), 'slalom');
      await page.screenshot({ path, fullPage: false });
    }
    await page.locator('#sheet-root [data-action="close-sheet"]').click().catch(() => {});
  }
  assert.equal(await page.evaluate((key) => Object.values(JSON.parse(localStorage.getItem(key)).demo.tour).filter(Boolean).length, stateKey), persona.id === 'priya' ? 9 : 10);

  await page.locator('#sheet-root [data-action="close-sheet"]').click().catch(() => {});
  await page.locator('[data-demo-tour-button]').click();
  const beforeReset = await page.evaluate(async () => ({
    ids: (await R4Receipts.list()).map((receipt) => receipt.id),
    key: (await R4Receipts.keyInfo()).keyFpr,
  }));
  await page.evaluate(() => {
    const clear = R4Receipts.clearDemo;
    R4Receipts.clearDemo = async () => {
      await clear();
      const demoId = new URLSearchParams(location.search).get('demo');
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(`r4-beacon-muse-demo-${demoId}`);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const tx = db.transaction(['receipts', 'keys'], 'readonly');
      const read = (store, operation) => new Promise((resolve, reject) => {
        const request = operation === 'count' ? tx.objectStore(store).count() : tx.objectStore(store).get(operation);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const [receipts, head, device, signing] = await Promise.all([
        read('receipts', 'count'), read('keys', 'head'), read('keys', 'device'), read('keys', 'signing'),
      ]);
      sessionStorage.setItem('r4-demo-reset-records', JSON.stringify({ receipts, head: !!head, device: !!device, signing: !!signing }));
      db.close();
    };
  });
  page.once('dialog', (dialog) => dialog.accept());
  const reloaded = page.waitForEvent('load');
  await page.locator('[data-demo-reset]').click();
  await reloaded;
  await page.getByRole('region', { name: 'demo mode' }).waitFor();
  await page.waitForFunction((key) => !!localStorage.getItem(key), stateKey);
  await page.waitForFunction(async () => window.R4Receipts && (await R4Receipts.list()).length > 0, null, { timeout: 5000 });
  const afterReset = await page.evaluate(async () => ({
    entries: await R4Receipts.list(),
    verification: await R4Receipts.verify(),
    key: (await R4Receipts.keyInfo()).keyFpr,
  }));
  assert.deepEqual(JSON.parse(await page.evaluate(() => sessionStorage.getItem('r4-demo-reset-records'))), {
    receipts: 0, head: false, device: false, signing: false,
  }, 'reset clears demo receipts, IDB head and signing key in the persona database');
  assert.equal(afterReset.verification.ok, true);
  assert.equal(afterReset.entries[0].action, 'key.created');
  assert.equal(afterReset.entries.filter((receipt) => receipt.action === 'key.created').length, 1);
  assert.ok(afterReset.entries.every((receipt) => !beforeReset.ids.includes(receipt.id)));
  assert.notEqual(afterReset.key, beforeReset.key);
  const resetSentinels = await page.evaluate(() => {
    const values = [localStorage.getItem('r4-networking-v1'), localStorage.getItem('r4-beacon-head-muse')];
    window.__realTouches = [];
    return values;
  });
  assert.deepEqual(resetSentinels, ['real-state-sentinel', 'null']);
  assert.deepEqual(await page.evaluate(() => window.__realTouches), []);
  await page.locator('[data-demo-exit]').click();
  await page.waitForFunction(() => !new URL(location.href).searchParams.has('demo'));
  assert.equal(new URL(page.url()).searchParams.get('keep'), '1');
  assert.equal(new URL(page.url()).hash, '#persona');
  assert.ok(await page.evaluate((key) => Boolean(localStorage.getItem(key)), stateKey));
  assert.deepEqual(errors, [], `${persona.id} has browser errors`);

  await context.close();
}
await browser.close();
console.log('Muse persona demo ok: isolated state/receipts, 8/10/8 people, 6/5/10 agenda items, every real tour target, exit/reset, axe, and 44px banner/tour controls at 390px');
