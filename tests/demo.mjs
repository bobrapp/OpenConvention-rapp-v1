import assert from 'node:assert/strict';
import { mkdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const shotDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../docs/demo/devin');
mkdirSync(shotDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox'],
});
const base = process.env.BASE_URL || 'http://127.0.0.1:60802/';
const personas = [['maya', 'Maya Torres', 8, 6], ['diego', 'Diego Alvarez', 10, 9], ['priya', 'Dr. Priya Natarajan', 8, 10]];

const snapshot = (page) => page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('r4-beacon');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const entries = await new Promise((resolve, reject) => {
    const request = db.transaction('receipts', 'readonly').objectStore('receipts').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return {
    state: localStorage.getItem('r4-networking-v2'),
    head: localStorage.getItem('r4-beacon-head'),
    entries,
  };
});
const closeFeatureSheet = async (page) => {
  const closeButton = page.locator('#sheet-root [data-action="close-sheet"]');
  if (await closeButton.count()) await closeButton.click();
};

try {
  for (const [index, [id, name, count, agendaCount]] of personas.entries()) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await page.addInitScript(() => {
      document.addEventListener('r4-demo-step', (event) => { window.__demoStepResult = event.detail; });
    });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.R4Receipts);
    await page.evaluate(async () => {
      await R4Receipts.init();
      const state = JSON.parse(localStorage.getItem('r4-networking-v2') || '{}');
      state.demoIsolationSentinel = 'real-state-untouched';
      localStorage.setItem('r4-networking-v2', JSON.stringify(state));
    });
    const realBefore = await snapshot(page);
    await page.goto(`${base}?demo=${id}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('region', { name: 'demo mode' }).waitFor();
    await page.waitForFunction((key) => !!localStorage.getItem(key), `r4-networking-v2-demo-${id}`);
    await page.waitForFunction(() => !!document.querySelector('.demo-tour[role="dialog"]'));
    const demoState = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), `r4-networking-v2-demo-${id}`);
    assert.equal(demoState.me.name, name);
    assert.equal(demoState.people.length, count);
    assert.equal(demoState.sessions.filter((session) => !session.agentBooked).length, agendaCount, `${id}: exact attendee agenda count is seeded`);
    assert.deepEqual(
      [...new Set(demoState.backstage.threads.map((thread) => thread.stage))].sort(),
      ['blocked', 'confirmed', 'declined', 'needs-you'].sort(),
      `${id}: backstage seeds every toured agent outcome`,
    );
    if (index === 0) {
      const testLanguage = async (lang, button, firstStep) => {
        await page.evaluate(([key, nextLang]) => {
          const state = JSON.parse(localStorage.getItem(key));
          state.me.lang = nextLang;
          localStorage.setItem(key, JSON.stringify(state));
        }, [`r4-networking-v2-demo-${id}`, lang]);
        await page.reload();
        await page.waitForFunction((label) => document.querySelector('.demo-banner [data-tour]')?.textContent === label, button);
        await page.locator('.demo-banner [data-tour]').click();
        assert.equal(await page.locator('.demo-tour [data-show]').first().textContent(), lang === 'en' ? 'show me' : 'mostrar');
        assert.ok(await page.getByText(firstStep, { exact: true }).count(), `${lang}: persona tour title is translated`);
        await page.locator('.demo-tour [data-close]').click();
      };
      await testLanguage('es', 'recorrido', 'Hoy: momentos y agente');
      await testLanguage('pt', 'visita', 'Hoje: momentos e agente');
      await testLanguage('en', 'tour', 'Today: moments and agent island');
      await page.locator('.demo-banner [data-tour]').click();
    }
    assert.equal(await page.evaluate(() => localStorage.getItem('r4-networking-v2')), realBefore.state);
    const realAfter = await snapshot(page);
    assert.equal(realAfter.head, realBefore.head, `${id}: real receipt head stays isolated`);
    assert.deepEqual(realAfter.entries, realBefore.entries, `${id}: real receipt DB stays isolated`);

    await page.addScriptTag({ path: axePath });
    const violations = await page.evaluate(async () => (await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    })).violations.filter((violation) => ['serious', 'critical'].includes(violation.impact)));
    assert.deepEqual(violations, [], `${id}: no serious/critical axe findings`);
    const targetSizes = await page.evaluate(() => [...document.querySelectorAll('.demo-banner button,.demo-banner a,.demo-tour button')]
      .filter((element) => element.getClientRects().length)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { label: element.textContent.trim(), width: rect.width, height: rect.height };
      }));
    assert.ok(targetSizes.length >= 4);
    assert.ok(targetSizes.every(({ width, height }) => width >= 44 && height >= 44), `${id}: undersized demo controls ${JSON.stringify(targetSizes)}`);
    const showButtons = page.locator('.demo-tour [data-show]');
    const stepCount = await showButtons.count();
    assert.ok(stepCount >= 8, `${id}: expected full tour coverage`);
    const screenshotSteps = { maya: [0, 3], diego: [0, 5], priya: [0, 7] }[id];
    for (let step = 0; step < stepCount; step++) {
      if (!(await page.locator('.demo-tour[role="dialog"]').count())) {
        await closeFeatureSheet(page);
        await page.locator('.demo-banner [data-tour]').click();
      }
      await page.locator(`.demo-tour [data-show="${step}"]`).click();
      await page.waitForFunction((expected) => window.__demoStepResult?.index === expected && window.__demoStepResult?.target, step);
      const stepResult = await page.evaluate(() => window.__demoStepResult);
      assert.equal(stepResult.usedFallback, false, `${id}: show-me step ${step} resolves mapped selector ${stepResult.selector}`);
      assert.ok(await page.locator('.demo-tour-target').count(), `${id}: show-me step ${step} highlights a real target`);
      if (stepResult.selector === '.receipt-row') {
        assert.ok(await page.locator('.receipt-explanation').filter({ hasText: 'Built on AiGovOps Foundation governance-as-code: Beacon receipts in the OVERT evidence format, verifiable offline.' }).count());
      }
      const screenshotIndex = screenshotSteps.indexOf(step);
      if (screenshotIndex >= 0) {
        const shotPath = path.join(shotDir, `${id}-${String(screenshotIndex + 1).padStart(2, '0')}.png`);
        await page.screenshot({ path: shotPath });
        assert.ok(statSync(shotPath).size <= 150 * 1024, `${shotPath} must stay at or below 150 KB`);
      }
    }
    const completed = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).demo.tour, `r4-networking-v2-demo-${id}`);
    assert.equal(Object.values(completed).filter(Boolean).length, stepCount, `${id}: all show-me steps are stored`);
    await closeFeatureSheet(page);
    await page.locator('.demo-banner [data-tour]').click();
    const beforeScale = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
    await page.evaluate(() => {
      const elements = [document.documentElement, ...document.querySelectorAll('body *')];
      const sizes = elements.map((element) => parseFloat(getComputedStyle(element).fontSize));
      elements.forEach((element, index) => {
        if (Number.isFinite(sizes[index])) element.style.setProperty('font-size', `${sizes[index] * 2}px`, 'important');
      });
    });
    const afterScale = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
    assert.ok(afterScale >= beforeScale * 1.99, '200% text test doubles computed font sizes');
    const scaledTargets = await page.evaluate(() => [...document.querySelectorAll('.demo-banner button,.demo-banner a,.demo-tour button')]
      .filter((element) => element.getClientRects().length)
      .map((element) => { const rect = element.getBoundingClientRect(); return [rect.width, rect.height]; }));
    assert.ok(scaledTargets.every(([width, height]) => width >= 44 && height >= 44), `${id}: 200% demo targets remain at least 44px`);
    assert.ok(await page.locator('.demo-banner').evaluate((element) => element.scrollWidth <= element.clientWidth), `${id}: 200% banner wraps without horizontal overflow`);
    await page.locator('.demo-tour [data-close]').click();
    await page.locator('.demo-banner [data-exit]').click();
    await page.waitForFunction(() => !new URL(location.href).searchParams.has('demo'));
    assert.equal(await page.evaluate(() => localStorage.getItem('r4-networking-v2')), realBefore.state, `${id}: exiting preserves real state`);
    assert.equal((await snapshot(page)).head, realBefore.head, `${id}: exiting preserves real receipts`);

    if (index === 0) {
      await page.goto(`${base}?demo=${id}`, { waitUntil: 'domcontentloaded' });
      await page.locator('.demo-banner [data-tour]').click();
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
            const request = indexedDB.open(`r4-beacon-demo-${demoId}`);
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
      await page.locator('.demo-tour [data-reset]').click();
      await reloaded;
      await page.waitForFunction((key) => {
        try { return JSON.parse(localStorage.getItem(key) || 'null')?.me?.name === 'Maya Torres'; } catch { return false; }
      }, `r4-networking-v2-demo-${id}`);
      await page.waitForFunction(async () => !!window.R4Receipts && (await R4Receipts.list()).length === 1);
      const resetCount = await page.evaluate(async (dbName) => {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open(dbName);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const count = await new Promise((resolve, reject) => {
          const request = db.transaction('receipts', 'readonly').objectStore('receipts').count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        db.close();
        return count;
      }, `r4-beacon-demo-${id}`);
      assert.ok(resetCount >= 1, 'reset recreates the persona demo receipt DB');
      assert.deepEqual(
        JSON.parse(await page.evaluate(() => sessionStorage.getItem('r4-demo-reset-records'))),
        { receipts: 0, head: false, device: false, signing: false },
        'reset clears the demo receipts, IDB head, device and signing key in the demo database',
      );
      const afterReset = await page.evaluate(async () => ({ entries: await R4Receipts.list(), verification: await R4Receipts.verify(), key: (await R4Receipts.keyInfo()).keyFpr }));
      assert.equal(afterReset.verification.ok, true, 'reset receipts verify');
      assert.equal(afterReset.entries[0].action, 'key.created', 'reset starts a new receipt chain with key creation');
      assert.equal(afterReset.entries.filter((receipt) => receipt.action === 'key.created').length, 1, 'reset records key creation once');
      assert.ok(afterReset.entries.every((receipt) => !beforeReset.ids.includes(receipt.id)), 'reset removes all earlier persona receipt entries');
      assert.notEqual(afterReset.key, beforeReset.key, 'reset generates a fresh persona signing key');
      assert.equal(await page.evaluate(() => localStorage.getItem('r4-networking-v2')), realBefore.state, 'reset preserves real state');
    }
    assert.deepEqual(pageErrors, [], `${id}: no uncaught page errors`);
    assert.deepEqual(consoleErrors, [], `${id}: no console errors`);
    await context.close();
  }
  console.log('Devin persona demo ok: isolated real state/receipts; persona seeds; every mapped feature target; exit/reset; axe; 44px controls at 390px and 200% text');
} finally {
  await browser.close();
}
