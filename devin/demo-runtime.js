(() => {
  const id = new URLSearchParams(location.search).get('demo');
  const personas = {
    maya: {
      name: 'Maya Torres',
      who: { en: 'social first-timer', es: 'asistente social por primera vez', pt: 'estreante em networking social' },
      quote: {
        en: '“I don’t want to eat lunch alone, and I want a dinner crew by tonight.”',
        es: '«No quiero almorzar sola y quiero encontrar un grupo para cenar hoy».',
        pt: '“Não quero almoçar sozinha e quero encontrar um grupo para jantar hoje.”',
      },
    },
    diego: {
      name: 'Diego Alvarez',
      who: { en: 'sales networker', es: 'networker de ventas', pt: 'networker de vendas' },
      quote: {
        en: '“Five real client conversations and two partner co-sells, or this trip didn’t pay for itself.”',
        es: '«Cinco conversaciones reales con clientes y dos ventas conjuntas con socios, o este viaje no habrá valido la pena».',
        pt: '“Cinco conversas reais com clientes e duas vendas conjuntas com parceiros, ou esta viagem não terá valido a pena.”',
      },
    },
    priya: {
      name: 'Dr. Priya Natarajan',
      who: { en: 'academic researcher', es: 'investigadora académica', pt: 'pesquisadora acadêmica' },
      quote: {
        en: '“I’m here to see where practice is ahead of the papers.”',
        es: '«Vengo a descubrir dónde la práctica va por delante de los artículos».',
        pt: '“Estou aqui para descobrir onde a prática está à frente dos artigos.”',
      },
    },
  };
  if (!personas[id]) return;
  const persona = personas[id];
  const key = `r4-networking-v2-demo-${id}`;
  const copy = {
    en: { tour: 'tour', exit: 'exit demo', reset: 'reset this demo', close: 'close tour', show: 'show me', why: 'Why it matters to', demo: 'demo', region: 'demo mode', entry: 'Try a demo persona', desc: 'Start an isolated guided tour', confirm: 'Reset this persona demo? Its demo data and receipts will be cleared.' },
    es: { tour: 'recorrido', exit: 'salir de la demo', reset: 'reiniciar esta demo', close: 'cerrar recorrido', show: 'mostrar', why: 'Por qué le importa a', demo: 'demo', region: 'modo demo', entry: 'Probar una persona demo', desc: 'Inicia un recorrido guiado aislado', confirm: '¿Reiniciar esta demo? Se borrarán sus datos y recibos.' },
    pt: { tour: 'visita', exit: 'sair da demo', reset: 'reiniciar esta demo', close: 'fechar visita', show: 'mostrar', why: 'Por que isso importa para', demo: 'demo', region: 'modo demo', entry: 'Experimente uma persona demo', desc: 'Inicie uma visita guiada isolada', confirm: 'Reiniciar esta demo? Os dados e recibos serão apagados.' },
  };
  const stepTitles = {
    es: [
      ['Hoy: momentos y agente', 'Abre la carta y elige el modo actuar', 'Entre bastidores: aprobaciones y momentos confirmados', 'Personas: conexiones y seguimientos', 'Conoce: comparte tu tarjeta y únete a un grupo', 'Agenda: sesiones y planes sociales', 'Conecta: tríos y temas de conversación', 'Momento confirmado y salida amable', 'Informe: resumen y resultados del equipo', 'Recibos: verificar y exportar', 'Cambia idioma y marca'],
      ['Hoy: prioridades comerciales y primera recomendación', 'Aprobaciones pendientes', 'Grafo de agentes y negociación A2A', 'Rechazos gestionados por tu agente', 'Empareja ofertas, pedidos y prioridades', 'Tarjeta del agente, QR y compartir', 'Estudio de presentaciones y temporizador', 'Borradores de seguimiento', 'Informe por persona', 'Recibos: verificar y exportar', 'Marca y perfil'],
      ['Hoy: concentración protegida y próxima sesión', 'Carta y límite por hora', 'Agenda: bloque de escritura protegido', 'Toma notas y registra conclusiones', 'Red de conexiones: temas en común', 'Entrevistas con profesionales y seguimientos', 'Conoce: tarjeta de investigadora', 'Resumen e informe', 'Aprobación pendiente: decide sobre una conexión prometedora', 'Recibos firmados y verificación offline', 'Idioma, marca y perfil'],
    ],
    pt: [
      ['Hoje: momentos e agente', 'Abra a carta e escolha o modo agir', 'Bastidores: decisões e encontros confirmados', 'Pessoas: conexões e acompanhamentos', 'Conheça: compartilhe seu cartão e entre em um grupo', 'Agenda: sessões e planos sociais', 'Conexões: trios e temas de conversa', 'Encontro confirmado e saída cordial', 'Relatório: resumo e resultados da equipe', 'Recibos: verificar e exportar', 'Idioma e marca'],
      ['Hoje: foco comercial e primeira recomendação', 'Aprovações pendentes', 'Grafo de agentes e negociação A2A', 'Recusas absorvidas pelo seu agente', 'Combine ofertas, pedidos e prioridades', 'Cartão do agente, QR e compartilhamento', 'Estúdio de apresentações e cronômetro', 'Rascunhos de acompanhamento', 'Relatório por persona', 'Recibos: verificar e exportar', 'Marca e perfil'],
      ['Hoje: foco protegido e próxima sessão', 'Carta e limite por hora', 'Agenda: bloco de escrita protegido', 'Faça anotações e registre aprendizados', 'Rede de conexões: temas em comum', 'Entrevistas com profissionais e acompanhamentos', 'Conheça: cartão de pesquisadora', 'Resumo e relatório', 'Aprovação pendente: decida sobre uma conexão promissora', 'Recibos assinados e verificação offline', 'Idioma, marca e perfil'],
    ],
  };
  const language = () => {
    try { return JSON.parse(localStorage.getItem(key) || '{}').me?.lang || 'en'; } catch { return 'en'; }
  };
  const locale = () => copy[language()] || copy.en;
  const steps = {
    maya: [
      ['Today: moments and agent island', 'today', '.goal-hero'],
      ['Open charter and choose act mode', 'backstage', '.charter-form', 'open-charter'],
      ['Backstage: needs-you and confirmed moments', 'backstage', '.thread-card'],
      ['People: mutual connections and follow-ups', 'people', '#people-list .list-item'],
      ['Meet: share a card and start a pod', 'meet', '.mycard'],
      ['Agenda: BOF and social plans', 'agenda', '.timeline .t-card, .t-item'],
      ['Connect: trios and conversation starters', 'connect', '.group-card', 'connect-groups'],
      ['Confirmed moment and polite exit', 'backstage', '.thread-sheet [data-action="moment-start"]', 'confirmed-thread'],
      ['Report: recap and team outcomes', 'report', '.report'],
      ['Receipts: verify and export', 'receipts', '.receipt-row', null, 'I want proof my agent kept my boundaries and the choices I made.'],
      ['Switch language and brand', 'settings', '.field .seg'],
    ],
    diego: [
      ['Today: business focus and first recommendation', 'today', '.goal-hero', null, 'I need the next step to move my pipeline forward, not just add another meeting.'],
      ['Needs-you approvals', 'backstage', '.thread-card'],
      ['Backstage graph and A2A negotiation', 'backstage', '.backstage-graph'],
      ['Declines absorbed on your behalf', 'backstage', '.decline-summary'],
      ['Give/ask pairing and prospect priorities', 'connect', '.list-item[data-action="person"]', 'connect-match'],
      ['Agent card, QR and share', 'meet', '.mycard'],
      ['Pitch studio and live timer', 'pitch', '#pitch-stage'],
      ['Follow-up drafts', 'people', '#people-list .list-item'],
      ['Report by persona', 'report', '.report'],
      ['Receipts: verify and export', 'receipts', '.receipt-row'],
      ['Brand switch and profile', 'settings', '.design-picker'],
    ],
    priya: [
      ['Today: protected focus and next session', 'today', '.goal-hero', null, 'Protected focus matters only if I can still make room for useful conversations.'],
      ['Heads-down charter and hourly cap', 'backstage', '.charter-form', 'open-charter'],
      ['Agent protects a writing block', 'agenda', '.timeline .t-card, .t-item'],
      ['Take notes and talk takeaways', 'agenda', '.sheet [data-form="session-notes"] textarea[name="takeaways"]', 'open-session'],
      ['Connection web: spot topic themes', 'connect', '.web-wrap'],
      ['Practitioner interviews and follow-ups', 'people', '#people-list .list-item'],
      ['Meet: researcher card and contact tools', 'meet', '.mycard'],
      ['Recap and report', 'report', '.report'],
      ['Needs-you approval: decide on a promising connection', 'today', '.needs-you-card', null, 'I want my agent to find a promising connection, but the final yes is mine.'],
      ['Signed receipts and offline verification', 'receipts', '.receipt-row'],
      ['Language, brand and profile settings', 'settings', '.design-picker'],
    ],
  }[id];
  const quick = {
    maya: [0, 2, 6, 7, 9],
    diego: [0, 2, 6, 1, 9],
    priya: [0, 1, 4, 8, 9],
  }[id];
  const localized = (source) => (window.R4_I18N || {})[language()]?.[source] || source;
  const stepTitle = (index) => {
    const source = steps[index][0];
    const translated = localized(source);
    return translated !== source ? translated : stepTitles[language()]?.[id === 'maya' ? 0 : id === 'diego' ? 1 : 2]?.[index] || source;
  };
  const stepWhy = (index) => steps[index][4] ? localized(steps[index][4]) : `${locale().why} ${persona.name}.`;
  const tourMode = () => {
    try { return JSON.parse(localStorage.getItem(key) || '{}').demo?.tourMode === 'full' ? 'full' : 'quick'; } catch { return 'quick'; }
  };
  const modeIndices = () => tourMode() === 'quick' ? quick : steps.map((_step, index) => index);
  const countDone = () => {
    try {
      const done = JSON.parse(localStorage.getItem(key) || '{}').demo?.tour || {};
      return modeIndices().filter((index) => done[index]).length;
    } catch { return 0; }
  };
  const updateProgress = () => {
    if (banner) banner.querySelector('[data-progress]').textContent = `${locale().tour} ${countDone()}/${modeIndices().length}`;
  };
  const saveTourMode = (mode) => {
    try {
      const state = JSON.parse(localStorage.getItem(key) || '{}');
      state.demo = { ...(state.demo || {}), tourMode: mode };
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  };
  const ensureTourMode = () => {
    try {
      const state = JSON.parse(localStorage.getItem(key) || '{}');
      const demo = state.demo || {};
      const tourMode = ['quick', 'full'].includes(demo.tourMode) ? demo.tourMode : 'quick';
      if (demo.tourVersion !== 2) {
        state.demo = { ...demo, tourVersion: 2, tourMode, tour: {} };
        localStorage.setItem(key, JSON.stringify(state));
      } else if (!['quick', 'full'].includes(demo.tourMode)) {
        state.demo = { ...demo, tourMode: 'quick' };
        localStorage.setItem(key, JSON.stringify(state));
      }
    } catch {}
  };
  const storeDone = (index) => {
    try {
      const state = JSON.parse(localStorage.getItem(key) || '{}');
      state.demo = { ...(state.demo || {}), tour: { ...(state.demo?.tour || {}), [index]: true } };
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  };
  const addStyles = () => {
    if (document.getElementById('demo-runtime-style')) return;
    const style = document.createElement('style');
    style.id = 'demo-runtime-style';
    style.textContent = `
      .demo-banner{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0;padding:8px 12px;background:var(--blue,#0c2bd8);color:#fff}
      .demo-banner .demo-copy{flex:1 1 180px;min-width:0;overflow-wrap:anywhere}
      .demo-banner button,.demo-banner a,.demo-tour button,.demo-personas a{min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center}
      .demo-banner button,.demo-tour button{border:0;border-radius:999px;padding:8px 12px;background:#fff;color:#0c2bd8;font:inherit;font-weight:700;cursor:pointer}
      .demo-banner a{color:#fff;padding:6px 10px}
      .demo-tour-backdrop{position:fixed;inset:0;z-index:1000;background:#07152de8;display:flex;align-items:flex-end;justify-content:center}
      .demo-tour{width:min(100%,620px);max-height:90dvh;overflow:auto;background:var(--bg,#fff);color:var(--ink,#14213d);border-radius:18px 18px 0 0;padding:20px;box-shadow:0 -10px 40px #0005}
      .demo-tour li{padding:10px 0;border-bottom:1px solid #d9dfeb}
      .demo-tour h2{margin:0 0 8px}.demo-tour p{margin:6px 0}
      .demo-tour-target{outline:4px solid #ffb900!important;outline-offset:3px!important;scroll-margin:100px}
      .demo-tour-active #alert-root{display:none!important}
      .demo-personas{margin:14px 0;padding:14px}.demo-personas a{margin:4px}
      @media(max-width:390px){.demo-banner{align-items:flex-start}.demo-banner .demo-copy{flex-basis:100%}}
    `;
    document.head.append(style);
  };
  const urlFor = (personaId) => {
    const url = new URL(location.href);
    url.searchParams.set('demo', personaId);
    return `${url.pathname}${url.search}${url.hash}`;
  };
  let banner;
  let tourDialog;
  let opener;
  let stepHighlightObserver = null;
  let stepHighlightFrame = null;
  let stepHighlightSelector = '';
  let stepHighlightTarget = null;
  const disconnectStepHighlight = () => {
    stepHighlightObserver?.disconnect();
    stepHighlightObserver = null;
    if (stepHighlightFrame !== null) cancelAnimationFrame(stepHighlightFrame);
    stepHighlightFrame = null;
    stepHighlightSelector = '';
    stepHighlightTarget = null;
  };
  const resolveStepTarget = (selector) => [...document.querySelectorAll(selector)].find((el) => el.getClientRects().length);
  const observeStepHighlight = (selector, target) => {
    disconnectStepHighlight();
    const root = document.querySelector('#view');
    if (!root) return;
    stepHighlightSelector = selector;
    stepHighlightTarget = target;
    stepHighlightObserver = new MutationObserver(() => {
      if (stepHighlightFrame !== null) return;
      stepHighlightFrame = requestAnimationFrame(() => {
        stepHighlightFrame = null;
        if (!document.body.classList.contains('demo-tour-active')) {
          disconnectStepHighlight();
          return;
        }
        const nextTarget = resolveStepTarget(stepHighlightSelector);
        if (!nextTarget) {
          stepHighlightTarget?.classList.remove('demo-tour-target');
          stepHighlightTarget = null;
          return;
        }
        if (nextTarget === stepHighlightTarget) return;
        stepHighlightTarget?.classList.remove('demo-tour-target');
        stepHighlightTarget = nextTarget;
        nextTarget.classList.add('demo-tour-target');
      });
    });
    stepHighlightObserver.observe(root, { childList: true, subtree: true });
  };
  const closeTour = (restore = true) => {
    if (restore) disconnectStepHighlight();
    tourDialog?.remove();
    tourDialog = null;
    if (restore) {
      document.body.classList.remove('demo-tour-active');
      opener?.focus();
    }
  };
  const renderBanner = () => {
    if (document.querySelector('[data-demo-banner]')) return;
    banner = document.createElement('div');
    banner.className = 'demo-banner';
    banner.dataset.demoBanner = '';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', locale().region);
    const exit = new URL(location.href);
    exit.searchParams.delete('demo');
    banner.innerHTML = `<span class="demo-copy"><b>${locale().demo} · ${persona.name}</b>, ${persona.who[language()] || persona.who.en} · <span data-progress></span></span><button type="button" data-tour>${locale().tour}</button><a data-exit href="${exit.pathname}${exit.search}${exit.hash}">${locale().exit}</a>`;
    document.querySelector('.topbar')?.after(banner);
    banner.querySelector('[data-tour]').addEventListener('click', openTour);
    banner.querySelector('[data-exit]').addEventListener('click', () => {
      disconnectStepHighlight();
      document.body.classList.remove('demo-tour-active');
    });
    updateProgress();
  };
  const ensureSettingsEntry = () => {
    const body = document.querySelector('#sheet-root .sheet-body, #sheet-root .sheet-content, #sheet-root .sheet');
    if (!body || body.querySelector('.demo-personas')) return;
    const section = document.createElement('section');
    section.className = 'card demo-personas';
    section.innerHTML = `<h3>${locale().entry}</h3><p class="small muted">${locale().desc}</p>${Object.entries(personas).map(([pid, p]) => `<a class="btn secondary sm" href="${urlFor(pid)}">${p.name}</a>`).join('')}`;
    body.append(section);
  };
  const renderTourContent = (backdrop, focusMode = false) => {
    const dialog = backdrop.querySelector('.demo-tour');
    const modeLabel = tourMode() === 'quick'
      ? localized('show all {n} features').replace('{n}', steps.length)
      : localized('show 2-minute tour');
    dialog.innerHTML = `<h2 id="demo-tour-title">${persona.name}</h2><p>${persona.quote[language()] || persona.quote.en}</p><button type="button" data-mode-toggle>${modeLabel}</button><ol>${modeIndices().map((index) => `<li><b>${stepTitle(index)}</b><p>${stepWhy(index)}</p><button type="button" data-show="${index}">${locale().show}</button> <span data-done="${index}" aria-live="polite"></span></li>`).join('')}</ol><button type="button" data-reset>${locale().reset}</button> <button type="button" data-exit>${locale().exit}</button> <button type="button" data-close>${locale().close}</button>`;
    dialog.querySelector('[data-mode-toggle]').addEventListener('click', () => {
      saveTourMode(tourMode() === 'quick' ? 'full' : 'quick');
      updateProgress();
      renderTourContent(backdrop, true);
    });
    dialog.querySelectorAll('[data-show]').forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.show))));
    dialog.querySelector('[data-close]').addEventListener('click', () => closeTour());
    dialog.querySelector('[data-exit]').addEventListener('click', () => { closeTour(false); banner.querySelector('[data-exit]').click(); });
    dialog.querySelector('[data-reset]').addEventListener('click', resetDemo);
    dialog.querySelector('[data-close]').focus();
    if (focusMode) dialog.querySelector('[data-mode-toggle]').focus();
  };
  const openTour = (event) => {
    opener = event?.currentTarget || banner?.querySelector('[data-tour]');
    closeTour(false);
    const backdrop = document.createElement('div');
    backdrop.className = 'demo-tour-backdrop';
    backdrop.innerHTML = '<section class="demo-tour" role="dialog" aria-modal="true" aria-labelledby="demo-tour-title"></section>';
    document.body.append(backdrop);
    tourDialog = backdrop;
    renderTourContent(backdrop);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeTour(); });
    backdrop.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeTour(); }
      if (e.key === 'Tab') {
        const controls = [...backdrop.querySelectorAll('button,a[href]')].filter((x) => x.getClientRects().length && !x.disabled);
        const first = controls[0], last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  };
  const tabGroups = {
    today: 'today',
    people: 'people', meet: 'people', connect: 'people',
    agenda: 'agenda', pitch: 'agenda',
    backstage: 'backstage', report: 'backstage', receipts: 'backstage',
  };
  const tabFor = (id) => document.querySelector(`.tabbar .tab[data-tab="${tabGroups[id] || id}"]`);
  const showStep = async (index) => {
    disconnectStepHighlight();
    const step = steps[index];
    document.body.classList.add('demo-tour-active');
    closeTour(false);
    document.querySelector('.demo-tour-target')?.classList.remove('demo-tour-target');
    if (document.querySelector('#sheet-root .sheet')) document.querySelector('#sheet-root [data-action="close-sheet"]')?.click();
    if (step[1] === 'settings') {
      document.querySelector('[data-action="open-settings"]')?.click();
    } else {
      tabFor(step[1])?.click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (step[1] !== 'receipts' && tabGroups[step[1]] !== step[1]) {
        document.querySelector(`#view .subnav [data-tab="${step[1]}"]`)?.click();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }
      if (step[1] === 'receipts') document.querySelector('[data-action="open-receipts"]')?.click();
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
    if (step[3] === 'open-charter') document.querySelector('[data-action="open-charter"]')?.click();
    if (step[3] === 'connect-groups' || step[3] === 'connect-match') {
      document.querySelector(`[data-action="seg"][data-key="connectSeg"][data-val="${step[3] === 'connect-groups' ? 'groups' : 'match'}"]`)?.click();
    }
    if (step[3] === 'confirmed-thread') {
      let confirmedId;
      try { confirmedId = JSON.parse(localStorage.getItem(key) || '{}').backstage?.threads?.find((thread) => thread.stage === 'confirmed')?.id; } catch {}
      if (confirmedId) document.querySelector(`.thread-card[data-id="${CSS.escape(confirmedId)}"]`)?.click();
    }
    if (step[3] === 'open-session') document.querySelector('#view .t-card[data-action="session"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const selector = step[2];
    const target = resolveStepTarget(selector);
    if (!target) {
      updateProgress();
      document.dispatchEvent(new CustomEvent('r4-demo-step', { detail: {
        index, title: stepTitle(index), target: false, selector, usedFallback: false,
      } }));
      return;
    }
    target.classList.add('demo-tour-target');
    target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    target.tabIndex = target.tabIndex < 0 ? -1 : target.tabIndex;
    target.focus({ preventScroll: true });
    storeDone(index);
    updateProgress();
    observeStepHighlight(selector, target);
    document.dispatchEvent(new CustomEvent('r4-demo-step', { detail: {
      index, title: stepTitle(index), target: !!target, selector,
      usedFallback: !!target && !target.matches(selector),
    } }));
  };
  const resetDemo = async () => {
    if (!window.confirm(locale().confirm)) return;
    disconnectStepHighlight();
    closeTour(false);
    await window.R4Receipts.clearDemo();
    localStorage.removeItem(key);
    localStorage.removeItem(`r4-backend-demo-${id}`);
    localStorage.removeItem(`r4-community-demo-v1-demo-${id}`);
    location.reload();
  };
  const boot = () => {
    addStyles();
    ensureTourMode();
    renderBanner();
    const observer = new MutationObserver(ensureSettingsEntry);
    observer.observe(document.body, { childList: true, subtree: true });
    let activeLanguage = language();
    const languageObserver = new MutationObserver(() => {
      const nextLanguage = language();
      if (nextLanguage === activeLanguage) return;
      activeLanguage = nextLanguage;
      const wasOpen = !!tourDialog;
      closeTour(false);
      banner?.remove();
      banner = null;
      document.querySelector('.demo-personas')?.remove();
      renderBanner();
      ensureSettingsEntry();
      if (wasOpen) openTour({ currentTarget: banner.querySelector('[data-tour]') });
    });
    languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    ensureSettingsEntry();
    let state = {};
    try { state = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
    if (!state.demo?.tourOpened) {
      state.demo = { ...(state.demo || {}), tourOpened: true, tour: state.demo?.tour || {} };
      localStorage.setItem(key, JSON.stringify(state));
      setTimeout(() => banner?.querySelector('[data-tour]')?.click(), 250);
    }
  };
  addEventListener('load', boot, { once: true });
  setTimeout(boot, 250);
})();
