(() => {
  const id = new URLSearchParams(location.search).get('demo');
  const personas = {
    maya: {
      name: 'Maya Torres', descriptor: 'social first-timer',
      quote: 'I want a dinner crew by tonight.',
      steps: [
        ['Prepare around a personal goal', 'prep', '#sheet-root .sheet', 'goals'],
        ['Today view and the backstage agent', 'today', '.agent-today'],
        ['Agent negotiation and absorbed declines', 'agents', '#agent-log .msg', null, {
          en: 'I want my agent to handle the awkward first ask so I can save my energy for real conversations.',
          es: 'Quiero que mi agente haga la primera pregunta incómoda para reservar mi energía para conversaciones reales.',
          pt: 'Quero que meu agente faça a primeira pergunta difícil para eu guardar energia para conversas de verdade.',
        }],
        ['People, mutual connection and follow-up', 'people', '#sheet-root .sheet', 'person'],
        ['Agenda and the Oprah keynote', 'agenda', '.t-card.featured'],
        ['Join the belonging birds-of-a-feather', 'agenda', '.t-card.t-bof', null, {
          en: 'A small conversation around belonging feels easier than trying to meet everyone at once.',
          es: 'Una conversación pequeña sobre pertenencia se siente más fácil que intentar conocer a todos de una vez.',
          pt: 'Uma conversa pequena sobre pertencimento parece mais fácil do que tentar conhecer todo mundo de uma vez.',
        }],
        ['Agents and a needs-you proposal', 'agents', '[data-action="agent-approve"]'],
        ['Connection web and community groups', 'connect', '.web-wrap'],
        ['Pitch fest and the live timer', 'pitch', '#pitch-stage'],
        ['End-of-day recap and team report', 'report-recap', '#view .page-title'],
        ['Signed receipts and offline trust', 'receipts', '.receipt-panel'],
        ['Slalom / AiGovOps design and language', 'settings', '.brand-picker'],
      ],
    },
    diego: {
      name: 'Diego Alvarez', descriptor: 'sales networker',
      quote: 'Five real client conversations and two partner co-sells.',
      steps: [
        ['Today: pipeline goals and next move', 'today', '.agent-today', null, {
          en: 'I need each hour tied to client priorities so I can turn this event into useful pipeline.',
          es: 'Necesito vincular cada hora con las prioridades de mis clientes para convertir el evento en oportunidades reales.',
          pt: 'Preciso ligar cada hora às prioridades dos clientes para transformar o evento em oportunidades reais.',
        }],
        ['Qualified client and partner priorities', 'people', '#sheet-root .sheet', 'person'],
        ['Give/ask matching and warm introductions', 'connect-match', '.list-item[data-action="person"]'],
        ['Needs-you approvals and confirmed meetings', 'agents', '[data-action="agent-approve"]'],
        ['Agent negotiation and absorbed declines', 'agents', '#agent-log .msg'],
        ['Share the agent card by QR and link', 'agents', '.qr'],
        ['Pitch rehearsal, timer and pitch length', 'pitch', '#pitch-stage'],
        ['Follow-up drafts and sequences', 'people-follow', '[data-action="copy-followup"]'],
        ['Report by persona and export', 'report-team', '[data-action="report-copy"]'],
        ['Verify and export signed receipts', 'receipts', '.receipt-list .receipt-row'],
        ['Sales profile and goals', 'settings', '[data-form="settings"]'],
      ],
    },
    priya: {
      name: 'Dr. Priya Natarajan', descriptor: 'academic researcher',
      quote: 'Four practitioner interviews without wrecking my focus.',
      steps: [
        ['Today: protected focus and next session', 'today', '.agent-today', null, {
          en: 'Protected focus matters only if I can still make room for useful conversations.',
          es: 'Proteger mi concentración importa si todavía puedo hacer espacio para conversaciones útiles.',
          pt: 'Proteger meu foco só importa se ainda houver espaço para conversas úteis.',
        }],
        ['Focus blocks and the keynote on her agenda', 'agenda', '.t-card.featured'],
        ['Session notes and takeaways', 'agenda', '#sheet-root .sheet', 'session'],
        ['Heads-down agent proposals and blocked instructions', 'agents', '#agent-log .msg'],
        ['Needs-you approval: decide on a promising connection', 'agents', '[data-action="agent-approve"]', null, {
          en: 'I want my agent to find a promising connection, but the final yes is mine.',
          es: 'Quiero que mi agente encuentre una conexión prometedora, pero la decisión final es mía.',
          pt: 'Quero que meu agente encontre uma conexão promissora, mas a decisão final é minha.',
        }],
        ['Practitioner people and research interests', 'people', '#sheet-root .sheet', 'person'],
        ['Connection web by topic', 'connect', '.web-wrap'],
        ['Prepare and capture a useful question', 'prep', '#view .page-title'],
        ['Research recap and report', 'report-recap', '#view .page-title'],
        ['Verify and export the evidence trail', 'receipts', '.receipt-panel'],
        ['Larger text, language and design controls', 'settings', '.brand-picker'],
      ],
    },
  };
  const quick = {
    maya: [1, 2, 5, 6, 10],
    diego: [0, 4, 6, 3, 9],
    priya: [0, 3, 6, 4, 9],
  }[id];
  const persona = personas[id];
  if (!persona) return;
  const strings = {
    en: { tour: 'tour', tourShort: 'tour', exit: 'exit demo', exitShort: 'exit', show: 'show me', reset: 'reset this demo', close: 'exit tour', why: 'Why this matters for {name}: it makes the event valuable on your terms.', showAll: 'show all {n} features', showQuick: 'show 2-minute tour', confirm: 'Reset this persona demo?', done: '✓ done' },
    es: { tour: 'recorrido', tourShort: 'tour', exit: 'salir de demo', exitShort: 'salir', show: 'ver', reset: 'reiniciar esta demo', close: 'salir del recorrido', why: 'Por qué importa para {name}: hace que el evento sea valioso en sus propios términos.', showAll: 'ver las {n} funciones', showQuick: 'ver recorrido de 2 minutos', confirm: '¿Reiniciar la demo de esta persona?', done: '✓ hecho' },
    pt: { tour: 'tour', tourShort: 'tour', exit: 'sair da demo', exitShort: 'sair', show: 'ver', reset: 'redefinir esta demo', close: 'sair do tour', why: 'Por que isso importa para {name}: torna o evento valioso nos termos de cada pessoa.', showAll: 'ver todos os {n} recursos', showQuick: 'ver visita de 2 minutos', confirm: 'Redefinir esta demo?', done: '✓ concluído' },
  };
  const personaTranslations = {
    es: {
      maya: {
        descriptor: 'asistente social por primera vez',
        quote: 'Quiero encontrar un grupo para cenar hoy.',
        steps: ['Prepárate con un objetivo personal', 'Vista de Hoy y agente entre bastidores', 'Negociación del agente y rechazos gestionados', 'Personas, conexión mutua y seguimiento', 'Agenda y la conferencia de Oprah', 'Únete al grupo de afinidad sobre pertenencia', 'Agentes y propuesta que requiere tu atención', 'Red de conexiones y grupos comunitarios', 'Ronda de presentaciones y cronómetro en vivo', 'Resumen del día e informe del equipo', 'Recibos firmados y confianza sin conexión', 'Diseño e idioma de Slalom / AiGovOps'],
      },
      diego: {
        descriptor: 'profesional de ventas y alianzas',
        quote: 'Cinco conversaciones reales con clientes y dos ventas conjuntas con socios.',
        steps: ['Hoy: metas de ventas y próximo paso', 'Prioridades de clientes potenciales y socios', 'Empareja ofertas y pedidos con presentaciones cálidas', 'Aprobaciones pendientes y reuniones confirmadas', 'Negociación del agente y rechazos gestionados', 'Comparte la tarjeta del agente por QR y enlace', 'Ensayo de presentación, cronómetro y duración', 'Borradores y secuencias de seguimiento', 'Informe por persona y exportación', 'Verifica y exporta recibos firmados', 'Perfil de ventas y objetivos'],
      },
      priya: {
        descriptor: 'investigadora académica',
        quote: 'Cuatro entrevistas con profesionales sin sacrificar mi concentración.',
        steps: ['Hoy: concentración protegida y próxima sesión', 'Bloques de concentración y conferencia principal en su agenda', 'Notas de la sesión y conclusiones', 'Propuestas del agente en modo concentración e instrucciones bloqueadas', 'Aprobación pendiente: decide sobre una conexión prometedora', 'Profesionales y temas de investigación', 'Red de conexiones por tema', 'Prepárate y anota una pregunta útil', 'Resumen de investigación e informe', 'Verifica y exporta el registro de evidencia', 'Texto más grande, idioma y controles de diseño'],
      },
    },
    pt: {
      maya: {
        descriptor: 'estreante em networking social',
        quote: 'Quero encontrar um grupo para jantar ainda hoje.',
        steps: ['Prepare-se com um objetivo pessoal', 'Visão de Hoje e agente nos bastidores', 'Negociação do agente e recusas gerenciadas', 'Pessoas, conexão mútua e acompanhamento', 'Agenda e a palestra principal de Oprah', 'Participe do grupo sobre pertencimento', 'Agentes e proposta que precisa da sua atenção', 'Rede de conexões e grupos da comunidade', 'Rodada de apresentações e cronômetro ao vivo', 'Resumo do dia e relatório da equipe', 'Recibos assinados e confiança offline', 'Design e idioma do Slalom / AiGovOps'],
      },
      diego: {
        descriptor: 'profissional de vendas e parcerias',
        quote: 'Cinco conversas reais com clientes e duas vendas conjuntas com parceiros.',
        steps: ['Hoje: metas de vendas e próximo passo', 'Prioridades de clientes e parceiros qualificados', 'Combine ofertas e pedidos com apresentações calorosas', 'Aprovações que precisam de você e reuniões confirmadas', 'Negociação do agente e recusas absorvidas', 'Compartilhe o cartão do agente por QR e link', 'Ensaio da apresentação, cronômetro e duração', 'Rascunhos e sequências de acompanhamento', 'Relatório por persona e exportação', 'Verifique e exporte recibos assinados', 'Perfil de vendas e metas'],
      },
      priya: {
        descriptor: 'pesquisadora acadêmica',
        quote: 'Quatro entrevistas com profissionais sem prejudicar meu foco.',
        steps: ['Hoje: foco protegido e próxima sessão', 'Blocos de foco e palestra principal na agenda', 'Anotações da sessão e aprendizados', 'Propostas do agente em modo foco e instruções bloqueadas', 'Aprovação pendente: decida sobre uma conexão promissora', 'Profissionais e interesses de pesquisa', 'Rede de conexões por tema', 'Prepare-se e registre uma pergunta útil', 'Resumo de pesquisa e relatório', 'Verifique e exporte o registro de evidências', 'Texto maior, idioma e controles de design'],
      },
    },
  };
  const locale = () => {
    try { return strings[JSON.parse(localStorage.getItem(`r4-networking-v1-demo-${id}`) || '{}').me?.lang] ? JSON.parse(localStorage.getItem(`r4-networking-v1-demo-${id}`) || '{}').me.lang : 'en'; }
    catch { return 'en'; }
  };
  const tr = (key, vars = {}) => {
    const [type, personaId, index] = key.split('.');
    const localized = personaTranslations[locale()]?.[personaId];
    const english = personas[personaId];
    const value = strings[locale()][key] ||
      (type === 'step' ? localized?.steps?.[Number(index)] : localized?.[type]) ||
      strings.en[key] ||
      (type === 'step' ? english?.steps?.[Number(index)]?.[0] : english?.[type]);
    return (value || '').replace(/\{(\w+)\}/g, (_match, name) => vars[name] || '');
  };
  const stepTitle = (index) => tr(`step.${id}.${index}`);
  const updateControlLabels = (banner) => {
    for (const [selector, key] of [['[data-demo-tour-button]', 'tour'], ['[data-demo-exit]', 'exit']]) {
      const control = banner.querySelector(selector);
      if (!control) continue;
      const shortLabel = tr(`${key}Short`);
      const fullLabel = tr(key);
      control.title = fullLabel;
      control.querySelector('[data-demo-control-label]').textContent = shortLabel;
      if (shortLabel === fullLabel) {
        control.removeAttribute('aria-label');
      } else {
        const accessibleName = fullLabel.toLowerCase().startsWith(shortLabel.toLowerCase()) ? fullLabel : `${shortLabel} · ${fullLabel}`;
        control.setAttribute('aria-label', accessibleName);
      }
    }
  };
  const updateDemoStack = (banner) => {
    const copy = banner.querySelector('[data-demo-copy]');
    if (copy.dataset.demoWrap === 'true') {
      delete banner.dataset.demoStack;
      return;
    }
    const name = copy.querySelector('[data-demo-name]');
    const count = copy.querySelector('[data-demo-progress]');
    const controls = banner.querySelector('[data-demo-controls]');
    const bannerStyle = getComputedStyle(banner);
    const controlsStyle = getComputedStyle(controls);
    const copyStyle = getComputedStyle(copy);
    const controlsGap = Number.parseFloat(controlsStyle.columnGap) || 0;
    const controlsWidth = [...controls.children].reduce((width, control) => width + control.getBoundingClientRect().width, 0) +
      Math.max(0, controls.children.length - 1) * controlsGap;
    const twoColumnCopyWidth = banner.clientWidth -
      (Number.parseFloat(bannerStyle.paddingLeft) || 0) -
      (Number.parseFloat(bannerStyle.paddingRight) || 0) -
      (Number.parseFloat(bannerStyle.columnGap) || 0) -
      controlsWidth;
    const requiredCopyWidth = name.scrollWidth + count.scrollWidth + (Number.parseFloat(copyStyle.columnGap) || 0);
    if (requiredCopyWidth > twoColumnCopyWidth) banner.dataset.demoStack = 'true';
    else delete banner.dataset.demoStack;
  };

  const stateKey = `r4-networking-v1-demo-${id}`;
  const readDemoState = () => {
    try { return JSON.parse(localStorage.getItem(stateKey) || '{}'); } catch { return {}; }
  };
  const tourMode = () => readDemoState().demo?.tourMode === 'full' ? 'full' : 'quick';
  const modeIndices = () => tourMode() === 'quick' ? quick : persona.steps.map((_step, index) => index);
  const stepWhy = (index) => persona.steps[index][4]?.[locale()] || tr('why', { name: persona.name });
  const saveTourMode = (mode) => {
    const state = readDemoState();
    state.demo = { ...(state.demo || {}), tourMode: mode };
    try { localStorage.setItem(stateKey, JSON.stringify(state)); } catch {}
  };
  const ensureTourMode = () => {
    const state = readDemoState();
    const demo = state.demo || {};
    const tourMode = demo.tourMode === 'full' ? 'full' : 'quick';
    if (demo.tourVersion !== 2) {
      state.demo = { ...demo, tourVersion: 2, tourMode, tour: {} };
      try { localStorage.setItem(stateKey, JSON.stringify(state)); } catch {}
    } else if (demo.tourMode !== 'quick' && demo.tourMode !== 'full') {
      state.demo = { ...demo, tourMode: 'quick' };
      try { localStorage.setItem(stateKey, JSON.stringify(state)); } catch {}
    }
  };
  const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
  const style = document.createElement('style');
  style.textContent = `
    [data-demo-banner] { position: sticky; top: 0; z-index: 40; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 6px 8px; background: var(--blue, #0c62fb); color: white; }
    [data-demo-copy] { display: flex; gap: 4px; min-width: 0; max-width: 100%; font-size: 14px; line-height: 1.25; overflow: hidden; }
    [data-demo-name], [data-demo-progress] { flex: 0 0 auto; white-space: nowrap; }
    [data-demo-descriptor] { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    [data-demo-banner][data-demo-wrap="true"] { grid-template-columns: minmax(0, 1fr); }
    [data-demo-banner][data-demo-wrap="true"] [data-demo-controls] { flex-wrap: wrap; }
    [data-demo-banner][data-demo-stack="true"] { grid-template-columns: minmax(0, 1fr); }
    [data-demo-banner][data-demo-stack="true"] [data-demo-controls] { flex-wrap: wrap; }
    [data-demo-copy][data-demo-wrap="true"] { flex-wrap: wrap; overflow: visible; overflow-wrap: anywhere; }
    [data-demo-copy][data-demo-wrap="true"] > span { flex: 1 1 auto; min-width: 0; overflow: visible; text-overflow: clip; white-space: normal; overflow-wrap: anywhere; }
    .demo-text-wrap .row.between > * { min-width: 0; }
    .demo-text-wrap .row.between > :first-child { overflow-wrap: anywhere; }
    .demo-text-wrap .row.between > .chip { max-width: 35%; white-space: normal; overflow-wrap: anywhere; }
    [data-demo-controls] { min-width: 0; display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; }
    [data-demo-banner] a, [data-demo-banner] button { box-sizing: border-box; flex: 0 0 auto; min-width: 44px; min-height: 44px; color: inherit; }
    [data-demo-banner] button { border: 0; border-radius: 24px; background: white; color: #0c2bd8; padding: 8px 4px; font: inherit; font-size: 13px; font-weight: 700; }
    [data-demo-banner] a { display: inline-flex; align-items: center; justify-content: center; padding: 8px 4px; font-size: 13px; }
    [data-demo-tour] { position: fixed; inset: 0; z-index: 100; display: grid; place-items: end center; background: rgb(8 16 40 / 55%); padding: 12px; }
    [data-demo-tour] .demo-sheet { width: 100%; max-width: 100vw; box-sizing: border-box; max-height: min(90vh, 780px); overflow: auto; background: var(--bg, #fff); color: var(--ink, #171a22); border-radius: 22px; padding: 20px; box-shadow: 0 18px 60px #0004; }
    [data-demo-tour] h2 { margin: 0 0 8px; font-size: 1.35rem; }
    [data-demo-tour] p { margin: 4px 0 10px; }
    [data-demo-tour] ol { min-width: 0; padding-left: 24px; overflow-wrap: anywhere; }
    [data-demo-tour] h2, [data-demo-tour] li, [data-demo-tour] p, [data-demo-tour] b { min-width: 0; overflow-wrap: anywhere; }
    [data-demo-tour] li { padding: 8px 0; border-bottom: 1px solid var(--line, #ddd); }
    [data-demo-tour] button { max-width: 100%; min-width: 44px; min-height: 44px; padding: 8px 14px; white-space: normal; overflow-wrap: anywhere; }
    .demo-feature-highlight { outline: 4px solid #ffc23d !important; outline-offset: 3px !important; border-radius: 12px; }
    .demo-tour-active #alert-root{display:none!important}
    @media (max-width: 359px) { [data-demo-banner] { grid-template-columns: minmax(0, 1fr); } [data-demo-controls] { flex-wrap: wrap; } }
    @media (max-width: 480px) { [data-demo-tour] { padding: 0; } [data-demo-tour] .demo-sheet { max-height: 92vh; border-radius: 22px 22px 0 0; } }
  `;
  document.head.append(style);

  const routeStep = async (step, index) => {
    document.querySelector('.demo-feature-highlight')?.classList.remove('demo-feature-highlight');
    document.querySelector('#sheet-root [data-action="close-sheet"]')?.click();
    await wait(80);
    const route = step[1];
    if (route === 'settings') {
      document.querySelector('[data-action="open-settings"]')?.click();
    } else if (route === 'goals') {
      document.querySelector('[data-action="go"][data-tab="today"]')?.click();
      await wait();
      document.querySelector('[data-action="edit-goals"]')?.click();
    } else if (route === 'receipts') {
      document.querySelector('[data-action="go"][data-tab="agents"]')?.click();
    } else if (route === 'agenda') {
      document.querySelector('[data-action="go"][data-tab="agenda"]')?.click();
      await wait();
      if (step[2] === '.t-card.t-bof') {
        document.querySelector('[data-action="seg"][data-key="agendaSeg"][data-val="timeline"]')?.click();
        await wait();
        const belonging = (readDemoState().sessions || []).find((session) => session.type === 'bof' && /belonging/i.test(session.title || ''));
        if (belonging) {
          document.querySelector(`[data-action="pick-day"][data-key="day"][data-day="${Number(belonging.day)}"]`)?.click();
          await wait();
        }
      }
    } else if (route === 'report-recap' || route === 'report-team') {
      document.querySelector('[data-action="go"][data-tab="report"]')?.click();
      await wait();
      document.querySelector(`[data-action="seg"][data-key="reportSeg"][data-val="${route === 'report-recap' ? 'recap' : 'team'}"]`)?.click();
    } else {
      const tab = route.startsWith('connect') ? 'connect' : route.startsWith('people') ? 'people' : route;
      document.querySelector(`[data-action="go"][data-tab="${tab}"]`)?.click();
      await wait();
      if (route === 'connect-match') document.querySelector('[data-action="seg"][data-key="connectSeg"][data-val="match"]')?.click();
      if (route === 'people-follow') document.querySelector('[data-action="seg"][data-key="peopleSeg"][data-val="follow"]')?.click();
    }
    await wait();
    if (step[3] === 'person') {
      document.querySelector('#people-list .list-item')?.click();
    } else if (step[3] === 'session') {
      document.querySelector('.t-card[data-action="session"]')?.click();
    } else if (step[3] === 'goals') {
      document.querySelector('[data-action="edit-goals"]')?.click();
    }
    await wait();
    const target = document.querySelector(step[2]);
    if (!target || !target.getClientRects().length) {
      window.__r4DemoStep = { index, title: stepTitle(index), selector: step[2], fallback: true };
      return;
    }
    target.classList.add('demo-feature-highlight');
    if (!target.matches('a,button,input,select,textarea,[tabindex]')) target.tabIndex = -1;
    target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    target.focus({ preventScroll: true });
    window.__r4DemoStep = { index, title: stepTitle(index), selector: step[2], fallback: false };
    window.dispatchEvent(new CustomEvent('r4-demo-step', { detail: window.__r4DemoStep }));
    return target;
  };

  const updateProgress = (banner) => {
    const state = readDemoState();
    const active = modeIndices();
    const done = active.filter((index) => state.demo?.tour?.[index]).length;
    const copy = banner.querySelector('[data-demo-copy]');
    const descriptor = tr(`descriptor.${id}`);
    const progress = `${tr('tour')} ${done}/${active.length}`;
    const text = `demo · ${persona.name}, ${descriptor} · ${progress}`;
    copy.querySelector('[data-demo-name]').textContent = `demo · ${persona.name},`;
    copy.querySelector('[data-demo-descriptor]').textContent = descriptor;
    copy.querySelector('[data-demo-progress]').textContent = `· ${progress}`;
    copy.title = text;
    copy.setAttribute('aria-label', text);
    updateDemoStack(banner);
  };
  const markDone = (index) => {
    const state = readDemoState();
    state.demo = { ...(state.demo || {}), id, tourOpened: true, tour: { ...(state.demo?.tour || {}), [index]: true } };
    localStorage.setItem(stateKey, JSON.stringify(state));
  };
  let tourOpener;
  let tourOpenedInSession = false;
  const openTour = (banner) => {
    if (document.querySelector('[data-demo-tour]')) return;
    tourOpenedInSession = true;
    ensureTourMode();
    tourOpener = document.activeElement && document.activeElement !== document.body
      ? document.activeElement
      : banner.querySelector('[data-demo-tour-button]');
    const state = readDemoState();
    state.demo = { ...(state.demo || {}), id, tourOpened: true };
    localStorage.setItem(stateKey, JSON.stringify(state));
    const dialog = document.createElement('div');
    dialog.dataset.demoTour = 'true';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'demo-tour-title');
    const renderTourContent = (focusToggle = false) => {
      const saved = readDemoState();
      const indices = modeIndices();
      const toggle = tourMode() === 'quick'
        ? tr('showAll', { n: persona.steps.length })
        : tr('showQuick');
      dialog.innerHTML = `<section class="demo-sheet"><h2 id="demo-tour-title">${persona.name}: “${tr(`quote.${id}`)}”</h2><button type="button" data-demo-mode>${toggle}</button><ol>${indices.map((index) => `<li><b>${stepTitle(index)}</b><p>${stepWhy(index)}</p><button type="button" data-demo-show="${index}">${tr('show')}</button> <span data-demo-done="${index}"></span></li>`).join('')}</ol><div class="row wrap"><button type="button" data-demo-reset>${tr('reset')}</button><button type="button" data-demo-close>${tr('close')}</button></div></section>`;
      indices.forEach((index) => {
        if (saved.demo?.tour?.[index]) dialog.querySelector(`[data-demo-done="${index}"]`).textContent = tr('done');
      });
      dialog.querySelector('[data-demo-mode]').addEventListener('click', () => {
        saveTourMode(tourMode() === 'quick' ? 'full' : 'quick');
        updateProgress(banner);
        renderTourContent(true);
      });
      dialog.querySelectorAll('[data-demo-show]').forEach((button) => button.addEventListener('click', async () => {
        const index = Number(button.dataset.demoShow);
        dialog.remove();
        document.body.classList.add('demo-tour-active');
        const target = await routeStep(persona.steps[index], index);
        if (!target) {
          document.body.classList.remove('demo-tour-active');
          updateProgress(banner);
          return;
        }
        markDone(index);
        updateProgress(banner);
      }));
      dialog.querySelector('[data-demo-close]').addEventListener('click', closeTour);
      dialog.querySelector('[data-demo-reset]').addEventListener('click', async () => {
        if (!confirm(tr('confirm'))) return;
        await window.R4Receipts.clearDemo();
        localStorage.removeItem(stateKey);
        location.reload();
      });
      if (focusToggle) dialog.querySelector('[data-demo-mode]').focus();
      else dialog.querySelector('button')?.focus();
    };
    document.body.append(dialog);
    updateProgress(banner);
    const closeTour = () => {
      dialog.remove();
      document.body.classList.remove('demo-tour-active');
      tourOpener?.focus();
    };
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeTour(); }
      if (event.key !== 'Tab') return;
      const items = [...dialog.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')].filter((el) => el.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    dialog.addEventListener('click', (event) => { if (event.target === dialog) closeTour(); });
    renderTourContent();
  };

  const mount = () => {
    if (document.querySelector('[data-demo-banner]')) return;
    const banner = document.createElement('div');
    banner.dataset.demoBanner = 'true';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'demo mode');
    const exitUrl = new URL(location.href);
    exitUrl.searchParams.delete('demo');
    banner.innerHTML = `<div data-demo-copy><span data-demo-name></span><span data-demo-descriptor></span><span data-demo-progress></span></div><div data-demo-controls><button type="button" data-demo-tour-button title="${tr('tour')}"><span data-demo-control-label>${tr('tourShort')}</span></button><a href="${exitUrl.pathname}${exitUrl.search}${exitUrl.hash}" data-demo-exit title="${tr('exit')}"><span data-demo-control-label>${tr('exitShort')}</span></a></div>`;
    document.body.prepend(banner);
    ensureTourMode();
    updateControlLabels(banner);
    updateProgress(banner);
    const copy = banner.querySelector('[data-demo-copy]');
    const updateCopyWrap = () => {
      copy.dataset.demoWrap = Number.parseFloat(getComputedStyle(copy).fontSize) > 16 ? 'true' : 'false';
      banner.dataset.demoWrap = copy.dataset.demoWrap;
      document.body.classList.toggle('demo-text-wrap', copy.dataset.demoWrap === 'true');
      updateDemoStack(banner);
    };
    updateCopyWrap();
    new ResizeObserver(updateCopyWrap).observe(copy);
    new MutationObserver(updateCopyWrap).observe(copy, { attributes: true, attributeFilter: ['style'] });
    banner.querySelector('[data-demo-tour-button]').addEventListener('click', () => openTour(banner));
    if (!JSON.parse(localStorage.getItem(stateKey) || '{}').demo?.tourOpened) setTimeout(() => {
      if (!tourOpenedInSession && !JSON.parse(localStorage.getItem(stateKey) || '{}').demo?.tourOpened) openTour(banner);
    }, 300);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
  new MutationObserver(() => {
    const banner = document.querySelector('[data-demo-banner]');
    if (!banner) return;
    updateControlLabels(banner);
    const descriptor = banner.querySelector('[data-demo-descriptor]');
    if (descriptor) descriptor.textContent = tr(`descriptor.${id}`);
    updateProgress(banner);
    if (banner.isConnected) {
      const copy = banner.querySelector('[data-demo-copy]');
      copy.dataset.demoWrap = Number.parseFloat(getComputedStyle(copy).fontSize) > 16 ? 'true' : 'false';
      banner.dataset.demoWrap = copy.dataset.demoWrap;
      document.body.classList.toggle('demo-text-wrap', copy.dataset.demoWrap === 'true');
      const name = copy.querySelector('[data-demo-name]');
      const progress = copy.querySelector('[data-demo-progress]');
      const controls = banner.querySelector('[data-demo-controls]');
      const copyStyle = getComputedStyle(copy);
      const controlsStyle = getComputedStyle(controls);
      const controlsGap = Number.parseFloat(controlsStyle.columnGap) || 0;
      const controlsWidth = [...controls.children].reduce((width, control) => width + control.getBoundingClientRect().width, 0) +
        Math.max(0, controls.children.length - 1) * controlsGap;
      const bannerStyle = getComputedStyle(banner);
      const twoColumnCopyWidth = banner.clientWidth -
        (Number.parseFloat(bannerStyle.paddingLeft) || 0) -
        (Number.parseFloat(bannerStyle.paddingRight) || 0) -
        (Number.parseFloat(bannerStyle.columnGap) || 0) -
        controlsWidth;
      const requiredCopyWidth = name.scrollWidth + progress.scrollWidth + (Number.parseFloat(copyStyle.columnGap) || 0);
      if (copy.dataset.demoWrap === 'true' || requiredCopyWidth > twoColumnCopyWidth) banner.dataset.demoStack = 'true';
      else delete banner.dataset.demoStack;
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
