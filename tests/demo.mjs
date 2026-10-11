import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.env.BASE_URL || 'http://127.0.0.1:60804/R4%20Muse%20V1';
const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const personas = [
  {
    id: 'maya', name: 'Maya Torres', descriptor: 'social first-timer', quote: 'I want a dinner crew by tonight.',
    people: 8, agenda: 7, goals: ['dinner crew', 'birds-of-a-feather', 'oprah keynote'], shots: [3, 6], stepCount: 12, quick: [1, 2, 5, 6, 10],
    copy: { es: { descriptor: 'asistente social por primera vez', quote: 'Quiero encontrar un grupo para cenar hoy.', done: '✓ hecho' }, pt: { descriptor: 'estreante em networking social', quote: 'Quero encontrar um grupo para jantar ainda hoje.', done: '✓ concluído' } },
  },
  {
    id: 'diego', name: 'Diego Alvarez', descriptor: 'sales networker', quote: 'Five real client conversations and two partner co-sells.',
    people: 10, agenda: 6, goals: ['five client conversations', 'two partner co-sells'], shots: [3, 6], stepCount: 11, quick: [0, 4, 6, 3, 9],
    copy: { es: { descriptor: 'profesional de ventas y alianzas', quote: 'Cinco conversaciones reales con clientes y dos ventas conjuntas con socios.', done: '✓ hecho' }, pt: { descriptor: 'profissional de vendas e parcerias', quote: 'Cinco conversas reais com clientes e duas vendas conjuntas com parceiros.', done: '✓ concluído' } },
  },
  {
    id: 'priya', name: 'Dr. Priya Natarajan', descriptor: 'academic researcher', quote: 'Four practitioner interviews without wrecking my focus.',
    people: 8, agenda: 11, goals: ['practitioner interviews', 'writing block', 'research trend notes'], shots: [1, 9], stepCount: 11, quick: [0, 3, 6, 4, 9],
    copy: { es: { descriptor: 'investigadora académica', quote: 'Cuatro entrevistas con profesionales sin sacrificar mi concentración.', done: '✓ hecho' }, pt: { descriptor: 'pesquisadora acadêmica', quote: 'Quatro entrevistas com profissionais sem prejudicar meu foco.', done: '✓ concluído' } },
  },
];
const browser = await chromium.launch({ headless: true, executablePath });

for (const persona of personas) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('r4-muse-v1', 'real-state-sentinel');
    localStorage.setItem('r4-networking-v1', 'legacy-state-sentinel');
    localStorage.setItem('r4-beacon-head-muse', 'null');
    window.__realTouches = [];
    for (const method of ['getItem', 'setItem', 'removeItem']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (key, ...args) {
        if (key === 'r4-muse-v1' || key === 'r4-networking-v1' || key === 'r4-beacon-head-muse') window.__realTouches.push(`${method}:${key}`);
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
  await page.waitForFunction(() => {
    const banner = document.querySelector('[data-demo-banner]');
    if (!banner) return false;
    const copy = banner.querySelector('[data-demo-copy]');
    const fontSize = Number.parseFloat(getComputedStyle(copy).fontSize);
    return banner.getBoundingClientRect().height <= 100 && fontSize >= 14 && fontSize <= 15;
  }, null, { timeout: 5000 });
  const stateKey = `r4-networking-v1-demo-${persona.id}`;
  const demoState = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), stateKey);
  const minute = (time) => {
    const [hour, minutes] = time.split(':').map(Number);
    return hour * 60 + minutes;
  };
  assert.equal(demoState.me.name, persona.name);
  assert.equal(demoState.people.length, persona.people);
  assert.equal(demoState.sessions.length, persona.agenda);
  assert.equal(demoState.me.eventName, 'r4');
  assert.equal(demoState.me.brand, 'slalom');
  assert.ok(demoState.agents.proposals.some((proposal) => proposal.status === 'pending'));
  assert.ok(demoState.agents.proposals.some((proposal) => proposal.status === 'booked'));
  assert.ok(persona.goals.every((goal) => demoState.goals.some((item) => item.text.toLowerCase().includes(goal))), `${persona.id} goals are not persona-specific`);
  assert.ok(demoState.pitches.some((pitch) => pitch.name === persona.name), `${persona.id} pitch is not owned by the persona`);
  assert.ok(demoState.pitchDraft.trim(), `${persona.id} pitch draft is empty`);
  const serializedState = JSON.stringify(demoState).toLowerCase();
  assert.ok(!serializedState.includes('bob'), `${persona.id} demo state contains Bob`);
  assert.ok(!serializedState.includes('this r4 networking app'), `${persona.id} demo state contains the default pitch`);
  assert.equal(demoState.backstage.charter, undefined, `${persona.id} demo state contains unenforced charter fields`);
  assert.equal(demoState.backstage.beacon.lengths, undefined, `${persona.id} demo state contains unenforced meeting lengths`);
  assert.equal(demoState.demo.tourMode, 'quick', `${persona.id}: quick mode is the default`);
  for (const proposal of demoState.agents.proposals) {
    const linked = proposal.status === 'booked' ? demoState.sessions.find((session) => session.id === proposal.sessionId) : null;
    if (proposal.status === 'booked') {
      assert.ok(linked, `${persona.id} booked proposal has no session`);
      assert.equal(linked.day, proposal.day);
      assert.equal(linked.start, proposal.start);
      assert.equal(linked.end, proposal.end);
    }
    for (const session of demoState.sessions) {
      if (session.id === linked?.id || session.day !== proposal.day) continue;
      assert.ok(minute(proposal.start) >= minute(session.end) || minute(proposal.end) <= minute(session.start), `${persona.id} proposal overlaps ${session.title}`);
    }
  }
  assert.ok(demoState.agents.log.some((message) => message.json.status === 'declined'));
  assert.ok(demoState.agents.log.some((message) => message.json.status === 'blocked-injection'));
  const realSentinels = await page.evaluate(() => {
    const values = [localStorage.getItem('r4-muse-v1'), localStorage.getItem('r4-networking-v1'), localStorage.getItem('r4-beacon-head-muse')];
    window.__realTouches = [];
    return values;
  });
  assert.deepEqual(realSentinels, ['real-state-sentinel', 'legacy-state-sentinel', 'null']);
  assert.deepEqual(await page.evaluate(() => window.__realTouches), []);
  assert.ok((await page.evaluate(() => indexedDB.databases())).some((db) => db.name === `r4-beacon-muse-demo-${persona.id}`));
  assert.equal((await page.evaluate(() => indexedDB.databases())).some((db) => db.name === 'r4-beacon-muse'), false);

  assert.equal(await page.locator('[data-demo-show]').count(), 5, `${persona.id}: quick tour contains five steps`);
  assert.ok((await page.locator('[data-demo-copy]').textContent()).endsWith('tour 0/5'), `${persona.id}: quick tour starts at 0/5`);
  for (const [order, index] of persona.quick.entries()) {
    if (!(await page.locator('[data-demo-tour]').count())) {
      await page.locator('[data-demo-tour-button]').click();
      await page.getByRole('dialog').waitFor();
    }
    assert.equal(await page.locator(`[data-demo-show="${index}"]`).count(), 1, `${persona.id}: quick step ${index} is listed`);
    await page.locator(`[data-demo-show="${index}"]`).click();
    await page.waitForFunction((expected) => window.__r4DemoStep?.index === expected, index);
    assert.equal((await page.evaluate(() => window.__r4DemoStep)).fallback, false, `${persona.id}: quick target ${index} resolves`);
    assert.ok((await page.locator('[data-demo-copy]').textContent()).endsWith(`tour ${order + 1}/5`), `${persona.id}: quick progress is ${order + 1}/5`);
    await page.locator('#sheet-root [data-action="close-sheet"]').click().catch(() => {});
  }
  await page.locator('[data-demo-tour-button]').click();
  await page.getByRole('dialog').waitFor();
  assert.equal(await page.getByRole('button', { name: `show all ${persona.stepCount} features` }).count(), 1, `${persona.id}: quick mode offers the full tour`);
  await page.locator('[data-demo-mode]').click();
  assert.equal(await page.locator('[data-demo-show]').count(), persona.stepCount, `${persona.id}: full toggle shows all steps`);
  assert.ok((await page.locator('[data-demo-copy]').textContent()).endsWith(`tour 5/${persona.stepCount}`), `${persona.id}: completed quick steps carry into full progress`);
  assert.equal(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).demo.tourMode, stateKey), 'full');
  await page.locator('[data-demo-close]').click();
  assert.equal(await page.evaluate(() => document.body.classList.contains('demo-tour-active')), false, `${persona.id}: closing tour clears its active class`);
  assert.equal(await page.evaluate(() => document.activeElement.matches('[data-demo-tour-button]')), true, `${persona.id}: closing tour returns focus`);
  await page.reload();
  await page.getByRole('region', { name: 'demo mode' }).waitFor();
  await page.locator('[data-demo-tour-button]').click();
  await page.getByRole('dialog').waitFor();
  assert.equal(await page.locator('[data-demo-show]').count(), persona.stepCount, `${persona.id}: full mode survives reload`);
  assert.equal(await page.getByRole('button', { name: 'show 2-minute tour' }).count(), 1);
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    state.demo = { ...(state.demo || {}), tourMode: 'full', tourOpened: false };
    localStorage.setItem(key, JSON.stringify(state));
  }, stateKey);
  await page.reload();
  await page.getByRole('region', { name: 'demo mode' }).waitFor();
  await page.getByRole('dialog').waitFor();
  assert.equal(await page.locator('[data-demo-show]').count(), persona.stepCount, `${persona.id}: restored full tour opens automatically`);
  await page.locator('[data-demo-mode]').click();
  assert.equal(await page.locator('[data-demo-show]').count(), 5, `${persona.id}: quick mode selected after full reload`);
  await page.locator('[data-demo-close]').click();
  await page.locator('[data-action="open-settings"]').click();
  await page.locator('[data-form="settings"] button').click();
  const savedDemo = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).demo, stateKey);
  assert.equal(savedDemo.tourMode, 'quick', `${persona.id}: app save preserves the selected quick mode`);
  assert.equal(savedDemo.tourOpened, true, `${persona.id}: app save preserves the opened-tour state`);
  await page.reload();
  await page.getByRole('region', { name: 'demo mode' }).waitFor();
  await page.locator('[data-demo-tour-button]').click();
  await page.getByRole('dialog').waitFor();
  assert.equal(await page.locator('[data-demo-show]').count(), 5, `${persona.id}: saved quick mode survives reload`);
  await page.locator('[data-demo-close]').click();
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    state.demo = { ...(state.demo || {}), tourMode: 'full', tourOpened: false, tour: {} };
    localStorage.setItem(key, JSON.stringify(state));
  }, stateKey);
  await page.reload();
  await page.getByRole('region', { name: 'demo mode' }).waitFor();
  await page.locator('[data-demo-tour-button]').click();
  await page.getByRole('dialog').waitFor();
  const englishStepTitles = await page.locator('[data-demo-tour] li > b').allTextContents();
  for (const language of ['en', 'es', 'pt']) {
    await page.evaluate(([key, lang]) => {
      const state = JSON.parse(localStorage.getItem(key));
      state.me.lang = lang;
      state.demo = { ...(state.demo || {}), tourMode: 'full', tourOpened: false, tour: { 0: true } };
      localStorage.setItem(key, JSON.stringify(state));
    }, [stateKey, language]);
    await page.reload();
    await page.getByRole('region', { name: 'demo mode' }).waitFor();
    await page.locator('[data-demo-tour-button]').click();
    await page.getByRole('dialog').waitFor();
    const banner = await page.locator('[data-demo-copy]').textContent();
    const translatedCopy = persona.copy[language] || { descriptor: persona.descriptor, quote: persona.quote, done: '✓ done' };
    assert.ok(banner.includes(translatedCopy.descriptor), `${persona.id}: ${language} banner has its translated descriptor`);
    if (language !== 'en') assert.ok(!banner.includes(persona.descriptor), `${persona.id}: ${language} banner falls back to its English descriptor`);
    const quickLabel = language === 'en' ? `show all ${persona.stepCount} features` : language === 'es' ? 'ver las' : 'ver todos os';
    const fullLabel = language === 'en' ? 'show 2-minute tour' : language === 'es' ? 'ver recorrido de 2 minutos' : 'ver visita de 2 minutos';
    assert.equal(await page.getByRole('button', { name: fullLabel }).count(), 1, `${persona.id}: ${language} full toggle is translated`);
    await page.locator('[data-demo-mode]').click();
    assert.ok((await page.locator('[data-demo-mode]').textContent()).startsWith(quickLabel), `${persona.id}: ${language} quick toggle is translated`);
    assert.equal(await page.locator('[data-demo-show]').count(), 5, `${persona.id}: ${language} quick toggle shows five steps`);
    await page.locator('[data-demo-mode]').click();
    for (const width of [320, 360, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const visible = await page.evaluate(() => {
        const banner = document.querySelector('[data-demo-banner]');
        const name = banner.querySelector('[data-demo-name]');
        const progress = banner.querySelector('[data-demo-progress]');
        const fits = (element) => {
          const rect = element.getBoundingClientRect();
          return !!element.getClientRects().length && rect.left >= 0 && rect.right <= innerWidth && element.scrollWidth <= element.clientWidth;
        };
        return { name: name.textContent, progress: progress.textContent, nameFits: fits(name), progressFits: fits(progress), pageWidth: document.documentElement.scrollWidth };
      });
      assert.equal(visible.name, persona.name, `${persona.id}: name remains visible at ${width}px in ${language}`);
      assert.ok(visible.progress.endsWith(`1/${persona.stepCount}`), `${persona.id}: progress remains visible at ${width}px in ${language}: ${visible.progress}`);
      assert.ok(visible.nameFits && visible.progressFits && visible.pageWidth <= width, `${persona.id}: banner fits at ${width}px in ${language}: ${JSON.stringify(visible)}`);
    }
    const quote = await page.locator('#demo-tour-title').textContent();
    assert.ok(quote.includes(translatedCopy.quote), `${persona.id}: ${language} tour quote is translated`);
    if (language !== 'en') assert.ok(!quote.includes(persona.quote), `${persona.id}: ${language} tour quote falls back to English`);
    const translatedTitles = await page.locator('[data-demo-tour] li > b').allTextContents();
    assert.equal(translatedTitles.length, englishStepTitles.length, `${persona.id}: ${language} has a title for every tour step`);
    translatedTitles.forEach((title, index) => {
      assert.ok(title.trim(), `${persona.id}: ${language} step ${index + 1} has a translation`);
      if (language !== 'en') assert.notEqual(title, englishStepTitles[index], `${persona.id}: ${language} step ${index + 1} is not English`);
    });
    assert.equal(await page.locator('[data-demo-done="0"]').textContent(), translatedCopy.done || '✓ done', `${persona.id}: ${language} completion text is translated`);
  }
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key));
    state.me.lang = 'en';
    state.demo = { ...(state.demo || {}), tourMode: 'full', tourOpened: false, tour: {} };
    localStorage.setItem(key, JSON.stringify(state));
  }, stateKey);
  await page.reload();
  await page.getByRole('region', { name: 'demo mode' }).waitFor();
  await page.locator('[data-demo-tour-button]').click();
  await page.getByRole('dialog').waitFor();
  await page.setViewportSize({ width: 390, height: 844 });

  const axePath = new URL('./node_modules/axe-core/axe.min.js', import.meta.url).pathname;
  await page.addScriptTag({ path: axePath });
  const axeViolations = await page.evaluate(async () => (await axe.run({ include: ['[data-demo-banner]', '[data-demo-tour]'] })).violations.filter((violation) => ['serious', 'critical'].includes(violation.impact)));
  assert.deepEqual(axeViolations, [], `${persona.id} demo has serious/critical axe findings`);
  const baseFont = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize));
  await page.evaluate(() => {
    const elements = [document.documentElement, ...document.body.querySelectorAll('*')];
    const sizes = elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    elements.forEach((element, index) => {
      if (Number.isFinite(sizes[index]) && sizes[index] > 0) {
        element.dataset.demoFontOriginal = JSON.stringify([element.style.getPropertyValue('font-size'), element.style.getPropertyPriority('font-size')]);
        element.style.setProperty('font-size', `${sizes[index] * 2}px`, 'important');
      }
    });
  });
  assert.ok(await page.evaluate((size) => Number.parseFloat(getComputedStyle(document.documentElement).fontSize) >= size * 1.99, baseFont), `${persona.id} text did not scale to 200%`);
  await page.waitForFunction(() => document.querySelector('[data-demo-copy]')?.dataset.demoWrap === 'true');
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
  await page.evaluate(() => {
    for (const element of [document.documentElement, ...document.body.querySelectorAll('*')]) {
      if (!element.dataset.demoFontOriginal) continue;
      const [value, priority] = JSON.parse(element.dataset.demoFontOriginal);
      if (value) element.style.setProperty('font-size', value, priority);
      else element.style.removeProperty('font-size');
      delete element.dataset.demoFontOriginal;
    }
  });
  await page.waitForFunction(() => document.querySelector('[data-demo-copy]')?.dataset.demoWrap === 'false');
  assert.ok(await page.evaluate(() => document.querySelector('[data-demo-banner]').getBoundingClientRect().height <= 100), `${persona.id} demo banner should return to <=100px at 100% text`);
  await page.locator('[data-demo-close]').click();

  const stepCount = persona.stepCount;
  for (let index = 0; index < stepCount; index++) {
    if (!(await page.locator('[data-demo-tour]').count())) {
      await page.locator('[data-demo-tour-button]').evaluate((button) => button.click());
    }
    if (index === 0) {
      await page.evaluate(() => {
        const alert = document.createElement('div');
        alert.className = 'alert-pop';
        alert.dataset.demoTestAlert = 'true';
        document.querySelector('#alert-root').replaceChildren(alert);
      });
    }
    await page.locator(`[data-demo-show="${index}"]`).click();
    await page.waitForFunction((i) => window.__r4DemoStep?.index === i, index, { timeout: 5000 });
    const progress = await page.locator('[data-demo-copy]').textContent();
    assert.ok(progress.endsWith(`tour ${index + 1}/${stepCount}`), `${persona.id}: banner advances after Show Me step ${index + 1}`);
    assert.equal(await page.locator('#alert-root').evaluate((root) => getComputedStyle(root).display), 'none', `${persona.id}: demo countdown alert is suppressed while showing a tour step`);
    const targetInfo = await page.evaluate(() => window.__r4DemoStep);
    assert.equal(targetInfo.fallback, false, `${persona.id} step ${index + 1} fell back (${targetInfo.selector})`);
    const target = page.locator(targetInfo.selector).first();
    await target.waitFor({ state: 'visible', timeout: 5000 });
    const hasContent = await target.evaluate((el) => Boolean((el.innerText || '').trim() || el.innerHTML.trim()));
    assert.equal(hasContent, true, `${persona.id} step ${index + 1} target is empty (${targetInfo.selector})`);
    await target.scrollIntoViewIfNeeded();
    const centerUnobscured = await page.waitForFunction((selector) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return Boolean(hit && (hit === el || el.contains(hit)));
    }, targetInfo.selector, { timeout: 5000 }).then(() => true, () => false);
    assert.equal(centerUnobscured, true, `${persona.id} step ${index + 1} target is unobscured at its center`);
    if (persona.shots.includes(index)) {
      const shotIndex = persona.shots.indexOf(index) + 1;
      const path = new URL(`../docs/demo/muse/${persona.id}-${String(shotIndex).padStart(2, '0')}.png`, import.meta.url).pathname;
      fs.mkdirSync(new URL('../docs/demo/muse/', import.meta.url).pathname, { recursive: true });
      assert.equal(await page.evaluate(() => document.documentElement.dataset.brand), 'slalom');
      await page.evaluate(() => {
        const toast = document.querySelector('#toast');
        if (toast) {
          toast.classList.remove('show');
          toast.textContent = '';
        }
      });
      await page.screenshot({ path, fullPage: false });
    }
    await page.locator('#sheet-root [data-action="close-sheet"]').click().catch(() => {});
  }
  assert.equal(await page.evaluate((key) => Object.values(JSON.parse(localStorage.getItem(key)).demo.tour).filter(Boolean).length, stateKey), persona.stepCount);

  await page.locator('[data-action="go"][data-tab="agents"]').click();
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
  assert.ok(clipboardHooked, `${persona.id} could not intercept the demo card copy`);
  await page.locator('[data-action="agent-copy-link"]').click();
  await page.waitForFunction(() => Boolean(window.__demoCopiedCardLink), null, { timeout: 5000 });
  const cardLink = await page.evaluate(() => window.__demoCopiedCardLink);
  const cardUrl = new URL(cardLink);
  assert.equal(cardUrl.searchParams.get('demo'), persona.id);
  const card = JSON.parse(Buffer.from(cardUrl.hash.slice('#agent='.length), 'base64url').toString('utf8'));
  assert.equal(card.demo, true);
  const realState = structuredClone(demoState);
  realState.me.name = 'Real attendee';
  delete realState.demo;
  const beforePeople = realState.people;
  const beforeStoredState = JSON.stringify(realState);
  await page.evaluate((value) => localStorage.setItem('r4-muse-v1', value), beforeStoredState);
  const realPage = await context.newPage();
  realPage.on('pageerror', (error) => errors.push(error.message));
  await realPage.goto(`${base}?keep=1${cardUrl.hash}`);
  await realPage.getByText('this is a demo card — open it from a demo', { exact: true }).waitFor();
  const afterStoredState = await realPage.evaluate(() => localStorage.getItem('r4-muse-v1'));
  assert.deepEqual(JSON.parse(afterStoredState).people, beforePeople, `${persona.id} demo card changed real people`);
  assert.equal(afterStoredState, beforeStoredState, `${persona.id} demo card changed real storage`);
  await realPage.close();
  await page.evaluate(() => localStorage.setItem('r4-muse-v1', 'real-state-sentinel'));

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
    const values = [localStorage.getItem('r4-muse-v1'), localStorage.getItem('r4-networking-v1'), localStorage.getItem('r4-beacon-head-muse')];
    window.__realTouches = [];
    return values;
  });
  assert.deepEqual(resetSentinels, ['real-state-sentinel', 'legacy-state-sentinel', 'null']);
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
console.log('Muse persona demo ok: isolated state/receipts, 8/10/8 people, booked session links/times, persona-specific goals/pitches, blocked demo-card import, every real tour target, exit/reset, axe, and 44px banner/tour controls at 390px');
