import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const shotDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../docs/demo/devin');
const requestedShotDir = '/Users/devin/design-review/devin-build';
mkdirSync(shotDir, { recursive: true });
mkdirSync(requestedShotDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox'],
});
const base = process.env.BASE_URL || 'http://127.0.0.1:60802/';
const personas = [
  ['maya', 'Maya Torres', 8, 6, ['dinner crew', 'birds-of-a-feather', 'oprah keynote']],
  ['diego', 'Diego Alvarez', 10, 9, ['five client conversations', 'two partner co-sells']],
  ['priya', 'Dr. Priya Natarajan', 8, 10, ['practitioner interviews', 'writing block', 'research trend notes']],
];
const quickIndices = { maya: [0, 2, 6, 7, 9], diego: [0, 2, 6, 1, 9], priya: [0, 1, 4, 8, 9] };
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
const crc32 = (data) => {
  let value = 0xffffffff;
  for (const byte of data) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
};
const optimizePng = (file) => {
  const image = readFileSync(file);
  const chunks = [];
  const imageData = [];
  let offset = 8;
  while (offset < image.length) {
    const start = offset;
    const length = image.readUInt32BE(offset);
    const type = image.toString('ascii', offset + 4, offset + 8);
    const data = image.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;
    if (type === 'IDAT') imageData.push(data);
    chunks.push({ type, raw: image.subarray(start, offset) });
  }
  const compressed = deflateSync(inflateSync(Buffer.concat(imageData)), { level: 9 });
  const type = Buffer.from('IDAT');
  const size = Buffer.alloc(4);
  size.writeUInt32BE(compressed.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([type, compressed])));
  const optimized = [image.subarray(0, 8)];
  let inserted = false;
  for (const chunk of chunks) {
    if (chunk.type === 'IDAT') {
      if (!inserted) {
        optimized.push(size, type, compressed, checksum);
        inserted = true;
      }
    } else {
      optimized.push(chunk.raw);
    }
  }
  writeFileSync(file, Buffer.concat(optimized));
};

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
  for (const [index, [id, name, count, agendaCount, goalLabels]] of personas.entries()) {
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
    const quickSequence = quickIndices[id];
    assert.equal(demoState.demo.tourMode, 'quick', `${id}: quick tour is the default persisted mode`);
    assert.equal(demoState.demo.tourVersion, 2, `${id}: current tour version is stored`);
    assert.equal(await page.locator('.demo-banner [data-progress]').textContent(), 'tour 0/5', `${id}: quick progress starts at zero`);
    assert.deepEqual(await page.locator('.demo-tour [data-show]').evaluateAll((buttons) => buttons.map((button) => Number(button.dataset.show))), quickSequence, `${id}: quick list uses the selected full-tour indices`);
    const minute = (time) => {
      const [hour, minutes] = time.split(':').map(Number);
      return hour * 60 + minutes;
    };
    assert.equal(demoState.me.name, name);
    assert.equal(demoState.me.startSkipped, false, `${id}: demo onboarding state is unchanged`);
    assert.equal(demoState.people.length, count);
    assert.equal(demoState.sessions.filter((session) => !session.agentBooked).length, agendaCount, `${id}: exact attendee agenda count is seeded`);
    assert.ok(goalLabels.every((label) => demoState.goals.some((goal) => goal.text.toLowerCase().includes(label))), `${id}: goals are persona-specific`);
    assert.ok(demoState.pitches.some((pitch) => pitch.name === name), `${id}: persona does not own a seeded pitch`);
    if (id === 'diego') assert.ok(demoState.pitches[0].idea.toLowerCase().includes('client transformation'), 'Diego pitch describes client transformation');
    assert.deepEqual(
      [...new Set(demoState.backstage.threads.map((thread) => thread.stage))].sort(),
      ['blocked', 'confirmed', 'declined', 'needs-you'].sort(),
      `${id}: backstage seeds every toured agent outcome`,
    );
    if (id === 'priya') assert.ok(demoState.backstage.threads.some((thread) => thread.stage === 'needs-you'), 'Priya has a real needs-you approval target');
    for (const thread of demoState.backstage.threads.filter((item) => item.stage === 'confirmed')) {
      const session = demoState.sessions.find((item) => item.id === thread.momentId);
      assert.ok(session, `${id}: confirmed thread has no linked meeting`);
      assert.equal(session.momentId, thread.id);
      assert.equal(session.day, thread.day);
      assert.equal(session.start, thread.start);
      const endMinutes = minute(thread.start) + thread.minutes;
      assert.equal(session.end, `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`);
    }
    const serializedState = JSON.stringify(demoState).toLowerCase();
    assert.ok(!serializedState.includes('bob'), `${id}: demo state contains Bob`);
    assert.ok(!serializedState.includes('this r4 networking app'), `${id}: demo state contains the default pitch`);
    assert.equal(demoState.backstage.beacon.lengths, undefined, `${id}: demo state contains unenforced meeting lengths`);
    for (const proposal of demoState.agents.proposals) {
      const linked = proposal.status === 'booked' ? demoState.sessions.find((session) => session.id === proposal.sessionId) : null;
      if (proposal.status === 'booked') {
        assert.ok(linked, `${id}: booked proposal has no session`);
        assert.equal(linked.day, proposal.day);
        assert.equal(linked.start, proposal.start);
        assert.equal(linked.end, proposal.end);
      }
      for (const session of demoState.sessions) {
        if (session.id === linked?.id || session.day !== proposal.day) continue;
        assert.ok(minute(proposal.start) >= minute(session.end) || minute(proposal.end) <= minute(session.start), `${id}: proposal overlaps ${session.title}`);
      }
    }
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
        assert.equal(await page.locator('.demo-tour [data-mode-toggle]').textContent(), lang === 'es' ? 'ver las 11 funciones' : lang === 'pt' ? 'ver todos os 11 recursos' : 'show all 11 features');
        await page.locator('.demo-tour [data-mode-toggle]').click();
        assert.equal(await page.locator('.demo-tour [data-show]').count(), 11, `${lang}: full tour toggle shows all features`);
        assert.equal(await page.locator('.demo-tour [data-mode-toggle]').textContent(), lang === 'es' ? 'ver recorrido de 2 minutos' : lang === 'pt' ? 'ver visita de 2 minutos' : 'show 2-minute tour');
        await page.locator('.demo-tour [data-mode-toggle]').click();
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

    for (const [position, fullIndex] of quickSequence.entries()) {
      if (!(await page.locator('.demo-tour[role="dialog"]').count())) await page.locator('.demo-banner [data-tour]').evaluate((button) => button.click());
      assert.deepEqual(await page.locator('.demo-tour [data-show]').evaluateAll((buttons) => buttons.map((button) => Number(button.dataset.show))), quickSequence, `${id}: quick mode remains selected`);
      await page.locator(`.demo-tour [data-show="${fullIndex}"]`).click();
      await page.waitForFunction((expected) => window.__demoStepResult?.index === expected && window.__demoStepResult?.target, fullIndex);
      assert.equal(await page.locator('.demo-banner [data-progress]').textContent(), `tour ${position + 1}/5`, `${id}: quick progress advances to ${position + 1}/5`);
      const quickResult = await page.evaluate(() => window.__demoStepResult);
      assert.equal(quickResult.usedFallback, false, `${id}: quick step ${position + 1} resolves ${quickResult.selector}`);
      assert.ok(await page.locator('.demo-tour-target').count(), `${id}: quick step ${position + 1} highlights a real target`);
    }
    assert.equal(await page.locator('.demo-banner [data-progress]').textContent(), 'tour 5/5', `${id}: quick tour completion is counted`);
    await page.locator('.demo-banner [data-tour]').evaluate((button) => button.click());
    await page.locator('.demo-tour [data-mode-toggle]').click();
    assert.equal(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).demo.tourMode, `r4-networking-v2-demo-${id}`), 'full');
    assert.equal(await page.locator('.demo-tour [data-show]').count(), 11, `${id}: full mode shows all 11 features`);
    assert.equal(await page.locator('.demo-tour [data-mode-toggle]').textContent(), 'show 2-minute tour');
    assert.equal(await page.locator('.demo-banner [data-progress]').textContent(), 'tour 5/11', `${id}: full progress carries over quick completions`);
    if (id === 'diego') {
      await page.locator('.demo-tour [data-close]').click();
      await page.locator('.tab[data-tab="backstage"]').click();
      await page.locator('[data-action="fast-forward"]').click();
      assert.equal(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).demo.tourMode, `r4-networking-v2-demo-${id}`), 'full', 'Diego full mode survives an app save');
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!document.querySelector('.demo-banner [data-tour]'));
    assert.equal(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).demo.tourMode, `r4-networking-v2-demo-${id}`), 'full', `${id}: full mode survives reload`);
    assert.equal(await page.locator('.demo-banner [data-progress]').textContent(), 'tour 5/11');
    await page.locator('.demo-banner [data-tour]').click();
    await page.locator('.demo-tour [data-close]').waitFor();
    assert.equal(await page.locator('.demo-tour [data-show]').count(), 11, `${id}: reloaded dialog keeps full mode`);
    if (id === 'diego') {
      await page.locator('.demo-tour [data-mode-toggle]').click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(requestedShotDir, 'quick-tour-diego-en.png') });
      await page.evaluate((key) => {
        const state = JSON.parse(localStorage.getItem(key));
        state.me.lang = 'es';
        localStorage.setItem(key, JSON.stringify(state));
      }, `r4-networking-v2-demo-${id}`);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('.demo-banner [data-tour]')?.textContent === 'recorrido');
      await page.locator('.demo-banner [data-tour]').click();
      await page.locator('.demo-tour [data-close]').waitFor();
      assert.equal(await page.locator('.demo-tour [data-mode-toggle]').textContent(), 'ver las 11 funciones');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(requestedShotDir, 'quick-tour-diego-es.png') });
      await page.evaluate((key) => {
        const state = JSON.parse(localStorage.getItem(key));
        state.me.lang = 'en';
        state.demo.tourMode = 'full';
        localStorage.setItem(key, JSON.stringify(state));
      }, `r4-networking-v2-demo-${id}`);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('.demo-banner [data-tour]')?.textContent === 'tour');
      await page.locator('.demo-banner [data-tour]').click();
      await page.locator('.demo-tour [data-close]').waitFor();
    }
    await page.locator('.demo-tour [data-close]').click();

    if (await page.locator('.demo-tour [data-close]').count()) await page.locator('.demo-tour [data-close]').click();
    await page.locator('.tab[data-tab="backstage"]').click();
    await page.locator('.classic-tools > summary').click();
    const clipboardHooked = await page.evaluate(() => {
      try {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: async (text) => { window.__demoCopiedCardLink = text; } },
        });
        return true;
      } catch {
        return false;
      }
    });
    assert.ok(clipboardHooked, `${id}: could not intercept the demo card copy`);
    await page.locator('[data-action="agent-copy-link"]').click();
    await page.waitForFunction(() => Boolean(window.__demoCopiedCardLink));
    const cardLink = await page.evaluate(() => window.__demoCopiedCardLink);
    const cardUrl = new URL(cardLink);
    assert.equal(cardUrl.searchParams.get('demo'), id, `${id}: demo card link is missing its demo query`);
    const card = JSON.parse(Buffer.from(cardUrl.hash.slice('#agent='.length), 'base64url').toString('utf8'));
    assert.equal(card.demo, true, `${id}: demo card payload is not marked as demo`);
    const realStoredState = await page.evaluate(() => localStorage.getItem('r4-networking-v2'));
    const realPage = await context.newPage();
    realPage.on('pageerror', (error) => pageErrors.push(error.message));
    await realPage.goto(`${base}${cardUrl.hash}`, { waitUntil: 'domcontentloaded' });
    await realPage.getByText('this is a demo card — open it from a demo', { exact: true }).waitFor();
    assert.equal(await realPage.evaluate(() => localStorage.getItem('r4-networking-v2')), realStoredState, `${id}: demo card changed real storage`);
    await realPage.close();
    await page.locator('.demo-banner [data-tour]').evaluate((button) => button.click());

    await page.addScriptTag({ path: axePath });
    const violations = await page.evaluate(async () => (await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    })).violations.filter((violation) => ['serious', 'critical'].includes(violation.impact)));
    assert.deepEqual(violations, [], `${id}: no serious/critical axe findings`);
    await page.waitForFunction(() => !document.querySelector('#toast')?.classList.contains('show'));
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
    assert.equal(stepCount, 11, `${id}: full tour exposes all 11 steps`);
    const screenshotSteps = { maya: [0, 3], diego: [2, 6], priya: [1, 9] }[id];
    const completedIndices = new Set(quickSequence);
    for (let step = 0; step < stepCount; step++) {
      if (!(await page.locator('.demo-tour[role="dialog"]').count())) {
        await closeFeatureSheet(page);
        await page.locator('.demo-banner [data-tour]').evaluate((button) => button.click());
      }
      if (step === 0) {
        await page.evaluate(() => {
          const alert = document.createElement('div');
          alert.className = 'alert-pop';
          alert.dataset.demoTestAlert = 'true';
          document.querySelector('#alert-root').replaceChildren(alert);
        });
      }
      await page.locator(`.demo-tour [data-show="${step}"]`).click();
      await page.waitForFunction((expected) => window.__demoStepResult?.index === expected && window.__demoStepResult?.target, step);
      completedIndices.add(step);
      assert.equal(await page.locator('.demo-banner [data-progress]').textContent(), `tour ${completedIndices.size}/${stepCount}`, `${id}: full progress counts completed indices`);
      assert.equal(await page.locator('#alert-root').evaluate((root) => getComputedStyle(root).display), 'none', `${id}: demo countdown alert is suppressed while showing a tour step`);
      if (step === 0) await page.evaluate(() => document.querySelector('#alert-root')?.replaceChildren());
      const stepResult = await page.evaluate(() => window.__demoStepResult);
      assert.equal(stepResult.usedFallback, false, `${id}: show-me step ${step} resolves mapped selector ${stepResult.selector}`);
      assert.ok(await page.locator('.demo-tour-target').count(), `${id}: show-me step ${step} highlights a real target`);
      assert.equal(await page.locator('.demo-tour-target').evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return Boolean(hit && (hit === el || el.contains(hit)));
      }), true, `${id}: step ${step + 1} target is unobscured at its center`);
      if (index === 0 && step === 0) {
        assert.equal(await page.evaluate(() => document.body.classList.contains('demo-tour-active')), true, 'show step keeps the tour-active class');
        const featureSheet = page.locator('#sheet-root .sheet');
        if (await featureSheet.count()) await closeFeatureSheet(page);
        assert.equal(await featureSheet.count(), 0, 'no sheet is open while testing tour alert routing');
        const firePreview = () => page.evaluate((demoId) => {
          const state = JSON.parse(localStorage.getItem(`r4-networking-v2-demo-${demoId}`));
          const button = document.createElement('button');
          button.dataset.action = 'alert-preview';
          button.dataset.id = state.sessions.find((session) => session.featured)?.id;
          document.body.append(button);
          button.click();
          button.remove();
        }, id);
        await firePreview();
        await page.waitForFunction(() => document.querySelector('#toast')?.classList.contains('show'));
        assert.equal(await page.locator('.alert-pop').count(), 0, 'an alert during a tour is a toast');
        await page.locator('.demo-banner [data-tour]').click();
        await page.locator('.demo-tour [data-close]').click();
        assert.equal(await page.evaluate(() => document.body.classList.contains('demo-tour-active')), false, 'closing the tour removes its active class');
        await firePreview();
        await page.locator('.alert-pop').waitFor();
        await page.locator('[data-action="alert-close"]').click();
        await page.locator('#alert-root .alert-pop').waitFor({ state: 'detached' });
        await page.locator('.demo-banner [data-tour]').click();
        await page.evaluate(() => document.body.classList.add('demo-tour-active'));
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('.demo-tour'));
        assert.equal(await page.evaluate(() => document.body.classList.contains('demo-tour-active')), false, 'Escape removes the tour-active class');
      }
      if (stepResult.selector === '.receipt-row') {
        assert.ok(await page.locator('.receipt-explanation').filter({ hasText: 'Built on AiGovOps Foundation governance-as-code: Beacon receipts in the OVERT evidence format, verifiable offline.' }).count());
      }
      const screenshotIndex = screenshotSteps.indexOf(step);
      if (screenshotIndex >= 0) {
        const shotPath = path.join(shotDir, `${id}-${String(screenshotIndex + 1).padStart(2, '0')}.png`);
        await page.screenshot({ path: shotPath });
        optimizePng(shotPath);
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
    await page.evaluate(() => {
      document.querySelector('.demo-banner [data-exit]').addEventListener('click', (event) => event.preventDefault(), { capture: true, once: true });
    });
    await page.locator('.demo-tour [data-exit]').click();
    assert.equal(await page.evaluate(() => document.body.classList.contains('demo-tour-active')), false, `${id}: exiting clears the tour-active class`);
    if (id === 'priya') {
      const demoKey = `r4-networking-v2-demo-${id}`;
      await page.evaluate((key) => {
        const state = JSON.parse(localStorage.getItem(key));
        const thread = state.backstage.threads.find((item) => item.stage === 'needs-you');
        thread.expiresAt = 1;
        state.demo.tourMode = 'quick';
        state.demo.tourOpened = true;
        localStorage.setItem(key, JSON.stringify(state));
      }, demoKey);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).backstage.threads.some((item) => item.stage === 'needs-you'), demoKey);
      assert.ok(await page.locator('.needs-you-card').count(), 'Priya expired demo approval remains visible');
      const persistedApproval = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).backstage.threads.find((item) => item.stage === 'needs-you'), demoKey);
      assert.equal(persistedApproval.demoSeed, true, 'Priya approval is marked as a demo seed');
      await page.locator('.demo-banner [data-tour]').click();
      await page.locator('.demo-tour [data-show="8"]').click();
      await page.waitForFunction(() => window.__demoStepResult?.index === 8 && window.__demoStepResult.target);
      assert.ok(await page.locator('.demo-tour-target.needs-you-card').count(), 'Priya quick approval step highlights the needs-you card');
      const statuses = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).people.map((person) => person.status), demoKey);
      await page.evaluate((key) => {
        const state = JSON.parse(localStorage.getItem(key));
        state.backstage.threads = state.backstage.threads.filter((item) => item.stage !== 'needs-you');
        state.backstage.beacon.mode = 'heads-down';
        state.demo.tourOpened = true;
        localStorage.setItem(key, JSON.stringify(state));
      }, demoKey);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).backstage.threads.some((item) => item.stage === 'needs-you'), demoKey);
      const reseeded = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), demoKey);
      assert.equal(reseeded.backstage.beacon.mode, 'heads-down', 'Priya remains heads-down while reseeding');
      assert.ok(reseeded.backstage.threads.some((item) => item.stage === 'needs-you' && item.demoSeed), 'Priya gets a demo approval seed in heads-down mode');
      assert.deepEqual(reseeded.people.map((person) => person.status), statuses, 'Priya seed does not mutate person statuses');
      if (await page.locator('.demo-tour').count()) await page.locator('.demo-tour [data-close]').click();
    }
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
    await page.goto(`${base}?demo=${id}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('region', { name: 'demo mode' }).waitFor();
    await page.evaluate((key) => {
      const state = JSON.parse(localStorage.getItem(key));
      state.demo = { ...(state.demo || {}), tourMode: 'quick', tour: { 0: true, 1: true } };
      delete state.demo.tourVersion;
      localStorage.setItem(key, JSON.stringify(state));
    }, `r4-networking-v2-demo-${id}`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('.demo-banner [data-progress]')?.textContent === 'tour 0/5');
    const guardedTour = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).demo, `r4-networking-v2-demo-${id}`);
    assert.equal(guardedTour.tourVersion, 2);
    assert.deepEqual(guardedTour.tour, {});
    assert.deepEqual(pageErrors, [], `${id}: no uncaught page errors`);
    assert.deepEqual(consoleErrors, [], `${id}: no console errors`);
    await context.close();
  }
  const highlightContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const highlightPage = await highlightContext.newPage();
  await highlightPage.addInitScript(() => {
    const nativeSetInterval = window.setInterval.bind(window);
    window.setInterval = (callback, delay, ...args) => {
      if (delay === 3000) {
        window.__tickBackstage = callback;
        return 0;
      }
      return nativeSetInterval(callback, delay, ...args);
    };
  });
  const mayaKey = 'r4-networking-v2-demo-maya';
  await highlightPage.goto(`${base}?demo=maya`, { waitUntil: 'domcontentloaded' });
  await highlightPage.locator('.demo-tour [data-close]').waitFor();
  await highlightPage.locator('.demo-tour [data-close]').click();
  await highlightPage.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    state.backstage.threads = state.backstage.threads.filter((thread) => !['confirmed', 'live'].includes(thread.stage));
    state.backstage.live = true;
    state.backstage.onboarded = true;
    state.backstage.autonomy = 'ask';
    state.backstage.beacon.mode = 'open';
    state.demo.tourOpened = true;
    localStorage.setItem(key, JSON.stringify(state));
  }, mayaKey);
  await highlightPage.reload({ waitUntil: 'domcontentloaded' });
  await highlightPage.getByRole('region', { name: 'demo mode' }).waitFor();
  await highlightPage.waitForFunction(() => typeof window.__tickBackstage === 'function');
  await highlightPage.locator('.demo-banner [data-tour]').click();
  await highlightPage.locator('.demo-tour [data-show="0"]').click();
  await highlightPage.locator('.goal-hero.demo-tour-target').waitFor();
  assert.equal(await highlightPage.locator('.demo-banner [data-progress]').textContent(), 'tour 1/5');
  await highlightPage.locator('.demo-banner [data-tour]').click();
  await highlightPage.locator('.demo-tour [data-show="2"]').click();
  await highlightPage.locator('.thread-card.demo-tour-target').waitFor();
  assert.equal(await highlightPage.locator('.demo-banner [data-progress]').textContent(), 'tour 2/5');
  await highlightPage.evaluate(() => {
    window.__highlightBeforeTick = document.querySelector('.thread-card.demo-tour-target');
    window.__tickBackstage();
  });
  await highlightPage.waitForFunction(() => {
    const previous = window.__highlightBeforeTick;
    const current = document.querySelector('.thread-card.demo-tour-target');
    return previous && current && current !== previous;
  });
  assert.equal(await highlightPage.locator('.thread-card.demo-tour-target').count(), 1, 'Maya backstage highlight survives a tickBackstage rerender');
  assert.equal(await highlightPage.locator('.demo-banner [data-progress]').textContent(), 'tour 2/5', 'rerender does not change tour progress');
  await highlightContext.close();

  const prepareBackgroundReveal = async (tourActive) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      const nativeSetInterval = window.setInterval.bind(window);
      window.setInterval = (callback, delay, ...args) => {
        if (delay === 3000) {
          window.__tickBackstage = callback;
          return 0;
        }
        return nativeSetInterval(callback, delay, ...args);
      };
    });
    const key = 'r4-networking-v2-demo-maya';
    await page.goto(`${base}?demo=maya`, { waitUntil: 'domcontentloaded' });
    await page.locator('.demo-tour [data-close]').waitFor();
    await page.locator('.demo-tour [data-close]').click();
    const personName = await page.evaluate((storageKey) => {
      const state = JSON.parse(localStorage.getItem(storageKey));
      const thread = state.backstage.threads.find((item) => item.stage === 'needs-you');
      const hash = (value) => {
        let result = 2166136261;
        for (const character of String(value)) {
          result ^= character.charCodeAt(0);
          result = Math.imul(result, 16777619);
        }
        return (result >>> 0) / 4294967295;
      };
      let seed = 0;
      while (hash(`${thread.personIds[0]}${seed}outcome`) < 0.4) seed++;
      thread.seed = seed;
      thread.stage = 'negotiate';
      thread.youSaid = null;
      thread.theySaid = null;
      thread.revealed = false;
      thread.countered = false;
      thread.draftPending = false;
      thread.expiresAt = 0;
      state.backstage.threads = [thread];
      state.backstage.autonomy = 'act';
      state.backstage.live = true;
      state.backstage.onboarded = true;
      state.backstage.beacon.mode = 'open';
      state.backstage.tickCount = 0;
      state.demo.tourOpened = true;
      localStorage.setItem(storageKey, JSON.stringify(state));
      return state.people.find((person) => person.id === thread.personIds[0]).name.split(/\s+/)[0];
    }, key);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('region', { name: 'demo mode' }).waitFor();
    await page.waitForFunction(() => typeof window.__tickBackstage === 'function');
    if (tourActive) {
      await page.locator('.demo-banner [data-tour]').click();
      await page.locator('.demo-tour [data-show="0"]').click();
      await page.waitForFunction(() => document.body.classList.contains('demo-tour-active'));
    } else {
      assert.equal(await page.locator('.demo-tour').count(), 0, 'background reveal scenario has no open tour');
    }
    assert.equal(await page.locator('#sheet-root .sheet').count(), 0, 'background reveal scenario has no open sheet');
    return { context, page, personName, key };
  };
  const touringReveal = await prepareBackgroundReveal(true);
  await touringReveal.page.evaluate(() => window.__tickBackstage());
  await touringReveal.page.waitForFunction(() => document.querySelector('#toast')?.classList.contains('show'));
  assert.equal(await touringReveal.page.locator('.reveal-sheet').count(), 0, 'a background reveal does not cover Maya’s active tour');
  assert.match(await touringReveal.page.locator('#toast').textContent(), new RegExp(`you both said yes with ${touringReveal.personName}`));
  const touringState = await touringReveal.page.evaluate((key) => JSON.parse(localStorage.getItem(key)), touringReveal.key);
  assert.ok(touringState.backstage.threads.some((thread) => thread.stage === 'confirmed' && thread.revealed), 'a background reveal confirms the mutual yes during Maya’s tour');
  await touringReveal.context.close();

  const idleReveal = await prepareBackgroundReveal(false);
  await idleReveal.page.evaluate(() => window.__tickBackstage());
  await idleReveal.page.locator('.reveal-sheet').waitFor();
  const idleState = await idleReveal.page.evaluate((key) => JSON.parse(localStorage.getItem(key)), idleReveal.key);
  assert.ok(idleState.backstage.threads.some((thread) => thread.stage === 'confirmed' && thread.revealed), 'a background reveal opens normally when no tour or sheet is active');
  await idleReveal.context.close();
  console.log('Devin persona demo ok: isolated real state/receipts; persona seeds; quick/full tour modes and progress; localized toggles; every mapped feature target; rerender-persistent tour highlights; background reveals do not interrupt tours; tour class cleanup/alert routing; exit/reset; axe; 44px controls at 390px and 200% text');
} finally {
  await browser.close();
}
