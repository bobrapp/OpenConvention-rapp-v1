(() => {
  const id = new URLSearchParams(location.search).get('demo');
  const personas = {
    maya: {name:'Maya Torres', role:'social first-timer', team:'Slalom Denver', topics:['cx & design','community & belonging','wellbeing']},
    diego: {name:'Diego Alvarez', role:'sales networker', team:'Slalom Chicago', topics:['gtm & sales','cloud','ai & data','financial services']},
    priya: {name:'Dr. Priya Natarajan', role:'academic researcher', team:'University of Washington Information School', topics:['ai governance','agentic ai','data platforms','org change']},
  };
  const persona = personas[id];
  if (!persona) return;
  const stateKey = `r4companion.v1-demo-${id}`;
  const today = new Date().toISOString().slice(0, 10);
  const contact = (key, name, company, role, kind, topics, status, follow, star = false, agent = null) => ({
    id:`demo-${id}-${key}`, name, company, role, persona:kind, topics, status,
    note:`Discussed ${topics.slice(0, 2).join(' and ')} at r4.`, fu:follow ? {text:follow, due:'week', done:false} : null,
    day:0, star, agent,
  });
  const sessions = (rows) => rows.map(([key,title,type,day,start,end,room,notes,takeaways=[]]) => ({
    id:`demo-${id}-${key}`, title, type, day, start, end, room, going:true,
    attendees:[], notes, takeaways, proposals:[],
  }));
  const blocks = (rows) => rows.map(([key,title,day,start,end]) => ({id:`demo-${id}-${key}`, title, day, start, end}));
  const goal = (key,text,target,count,kind='custom') => ({id:`demo-${id}-${key}`,text,target,count,kind,persona:'peer'});
  const seed = {
    settings:{
      v:1,event:'r4',start:today,days:3,me:persona.name,team:persona.team,topics:persona.topics,links:{},brand:'slalom',example:false,
      agent:{name:`${id === 'priya' ? 'Sage' : id === 'diego' ? 'Scout' : 'Maya'} assistant`,role:'event agent',principal:persona.name,org:persona.team,
        can:'suggest people and draft follow-ups',cannot:'share contact details without consent',hours:'08:00–21:00',contact:'on this device'},
    },
    people:[],sessions:[],blocks:[],goals:[],pitches:[],
  };
  if (id === 'maya') {
    seed.people = [
      contact('a','Avery Brooks','Slalom Austin','senior consultant','consultant',['cx & design','community & belonging'],'met','Share the first-timer dinner plan',true),
      contact('b','Lina Chen','Northstar Design','service designer','builder',['cx & design','wellbeing'],'met','Send the warm-up exercise'),
      contact('c','Marco Ruiz','r4 community','run-club organiser','peer',['wellbeing','community & belonging'],'met','Meet at the 6:30 run'),
      contact('d','Nora Patel','Harbor Mutual','product lead','product',['cx & design','community & belonging'],'target','Ask about the belonging BOF',true),
      contact('e','Sam Wilson','r4 community','first-time attendee','peer',['community & belonging'],'met','Join the dinner crew'),
      contact('f','Tess Morgan','Slalom Denver','talent-team host','consultant',['community & belonging','wellbeing'],'met','Thank her for hosting'),
      contact('g','Jordan Lee','Brightpath','experience strategist','builder',['cx & design','wellbeing'],'target','Compare workshop notes'),
      contact('h','Riley Park','Copperline','researcher','peer',['cx & design','community & belonging'],'met','Share the interview notes'),
    ];
    seed.sessions = sessions([
      ['oprah','Oprah keynote','keynote',0,'09:00','10:00','Main hall','Protect the headliner.',['Make room for human connection.']],
      ['bof','Design for belonging','bof',0,'10:30','11:15','Room B','A birds-of-a-feather conversation.',['Small rituals help first-timers belong.']],
      ['lunch','First-timers lunch crew','meeting',0,'12:00','12:45','Garden table','A relaxed lunch with new attendees.'],
      ['social','First-timers social hour','social',0,'16:00','17:00','Atrium','Meet a few people before dinner.'],
      ['run','6:30am run club','social',1,'06:30','07:15','East entrance','Easy pace, all welcome.'],
      ['karaoke','Karaoke night','social',1,'20:00','21:30','Lounge','An optional way to keep the conversation going.'],
    ]);
    seed.goals = [goal('dinner','Find a dinner crew tonight',1,0),goal('people','Meet 10 new people',10,6,'meet'),goal('bof','Join one birds-of-a-feather',1,0)];
    seed.pitches = [{id:'demo-maya-pitch',name:'Tess Morgan',topic:'Designing belonging into the first event hour',status:'queued',sparked:false}];
  } else if (id === 'diego') {
    seed.people = [
      contact('a','Morgan Ellis','Cobalt Bank','CIO','exec',['financial services','ai & data'],'target','Book a core-banking discovery',true),
      contact('b','Taylor James','Cobalt Bank','COO','exec',['financial services','gtm & sales'],'target','Share the modernization case study',true),
      contact('c','Amara Okafor','Lakeview Credit','head of digital','product',['financial services','cloud'],'target','Schedule a follow-up meeting',true),
      contact('d','Omar Haddad','Stratus Cloud','AWS partner manager','partner',['cloud','ai & data'],'met','Draft a co-sell intro',false,{name:'Atlas',handles:'partner scheduling',contact:'atlas@example.test',ok:true}),
      contact('e','Priya Shah','Snowflake','alliance director','partner',['ai & data','financial services'],'target','Compare two co-sell accounts'),
      contact('f','Jamie Ortiz','Slalom Chicago','client partner','consultant',['gtm & sales','financial services'],'met','Align on the pursuit plan'),
      contact('g','Chris Nguyen','Meridian Capital','VP operations','exec',['financial services','ai & data'],'target','Ask about their data platform',true),
      contact('h','Elliot King','Riverbend Bank','chief risk officer','risk',['financial services','ai governance'],'target','Send the risk-control checklist'),
      contact('i','Robin Park','Cobalt Bank','director of architecture','tech',['cloud','ai & data'],'met','Send the reference architecture'),
      contact('j','Alex Morgan','Harbor Finance','transformation lead','product',['financial services','gtm & sales'],'target','Offer an intro to the delivery lead'),
    ];
    seed.sessions = sessions([
      ['fintech','Fintech opening keynote','keynote',0,'09:00','10:00','Main hall','Protect the featured session.'],
      ['cloud','Modern core banking on cloud','session',0,'10:30','11:15','Room A','Client track discussion.',['Start with the operating model.']],
      ['risk','Governing AI in financial services','session',0,'11:30','12:15','Room C','Risk and controls.'],
      ['expo','Partner expo: AWS and Snowflake','meeting',0,'13:00','14:00','Expo hall','Compare partner opportunities.'],
      ['pitch','Pitch fest: client modernization','pitch',1,'14:00','15:00','Main hall','Diego has a pitch slot.'],
      ['dinner','Financial services leaders dinner','social',1,'18:30','20:00','North room','Qualified client conversations.'],
    ]);
    seed.blocks = blocks([
      ['client-call','Client status call',0,'08:00','08:30'],
      ['prep','Core-banking pitch preparation',1,'10:00','10:30'],
      ['followup','Protected follow-up writing',2,'14:00','15:00'],
    ]);
    seed.goals = [goal('clients','Five qualified client conversations',5,2),goal('cosell','Two partner co-sell introductions',2,1),goal('meetings','Book three follow-up meetings',3,1,'followups')];
    seed.pitches = [
      {id:'demo-diego-pitch-1',name:'Diego Alvarez',topic:'Responsible core-banking modernization',status:'queued',sparked:false},
      {id:'demo-diego-pitch-2',name:'Omar Haddad',topic:'Cloud foundations for regulated AI',status:'queued',sparked:false},
      {id:'demo-diego-pitch-3',name:'Amara Okafor',topic:'A practical path to trusted data',status:'queued',sparked:false},
    ];
  } else {
    seed.people = [
      contact('a','Dr. Lena Okafor','Alder Health','AI governance lead','risk',['ai governance','agentic ai'],'met','Ask about agents in clinical workflows'),
      contact('b','Mei Tanaka','Cascade Bank','director of responsible AI','exec',['ai governance','data platforms'],'target','Book a 15-minute interview',true),
      contact('c','Rafael Santos','RetailWorks','principal engineer','builder',['agentic ai','org change'],'met','Compare deployment notes'),
      contact('d','Anika Bose','Civic Data Lab','research director','tech',['data platforms','ai governance'],'target','Request an interview',true),
      contact('e','Morgan Price','Open Systems Forum','standards fellow','peer',['ai governance','org change'],'met','Follow up on evidence formats'),
      contact('f','Tariq Ali','Northstar Health','platform architect','tech',['agentic ai','data platforms'],'target','Ask about production agents'),
      contact('g','Elena Fischer','Slalom Seattle','principal consultant','consultant',['org change','ai governance'],'met','Share the interview protocol'),
      contact('h','Noah Kim','UW Information School','doctoral fellow','peer',['ai governance','agentic ai'],'met','Compare emerging themes'),
    ];
    seed.sessions = sessions([
      ['keynote','Oprah keynote: technology and belonging','keynote',0,'09:00','10:00','Main hall','Protect the keynote.',['Governance is also a human practice.']],
      ['talk-1','Agents in production: what changed','session',0,'10:15','11:00','Room A','Interview practitioners after the talk.',['Observe the handoffs.']],
      ['talk-2','Evidence for governed AI','session',0,'11:15','12:00','Room B','Research notes on evidence.',['Separate claims from evidence.']],
      ['poster','Poster session: evaluation practice','session',0,'13:00','14:00','Atrium','A chance to compare methods.'],
      ['talk-3','Data platforms and agent access','session',1,'09:00','09:45','Room C','Track talk.'],
      ['talk-4','Organizational change with agents','session',1,'10:00','10:45','Room A','Track talk.'],
      ['talk-5','Safety cases for agentic systems','session',1,'11:00','11:45','Room B','Track talk.'],
      ['talk-6','From pilot to production','session',2,'09:00','09:45','Room C','Track talk.'],
    ]);
    seed.blocks = blocks([['writing-1','Writing focus block',0,'14:30','15:30'],['writing-2','Interview synthesis focus block',1,'14:00','15:00']]);
    seed.goals = [goal('talks','Attend six agentic-AI and governance talks',6,3),goal('interviews','Book four 15-minute practitioner interviews',4,1),goal('themes','Leave with three research themes',3,1)];
    seed.pitches = [
      {id:'demo-priya-pitch-1',name:'Dr. Lena Okafor',topic:'Evidence from AI governance in healthcare',status:'queued',sparked:false},
      {id:'demo-priya-pitch-2',name:'Rafael Santos',topic:'Agent deployment lessons from retail',status:'queued',sparked:false},
    ];
  }
  if (!localStorage.getItem(stateKey)) {
    localStorage.setItem(stateKey, JSON.stringify(seed));
    location.reload();
    return;
  }
  const parserNote = 'In the Claude artifact this step uses Claude; here it uses the local parser.';
  const step = (title, tab, target, explanation, open = '') => ({title,tab,target,explanation,open});
  const tours = {
    maya:[
      step('Quick capture and AI parsing','people','#sheet-body #f-line',`Log a conversation while it is fresh. ${parserNote}`,'quickAdd'),
      step('People, follow-ups and event goals','people','#view [data-act="viewPerson"]','Keep next steps attached to the people Maya wants to meet.'),
      step('Agenda and the belonging conversation','agenda','#view [data-act="editSession"]','See the keynote, birds-of-a-feather session and social plans without losing the agenda.'),
      step('Connection web by shared subject','web','#view .webbox','Find people connected by belonging, design and wellbeing.'),
      step('Progress toward a dinner crew','today','#view .goal','Track the goals that turn a first event into a set of real connections.'),
      step('Recap and team report','report','#view [data-act="copyReport"]','Carry useful follow-ups and outcomes beyond the event.'),
      step('Event profile and Slalom design','','#sheet-body .brand-picker','Set the event context and switch between the Slalom and AiGovOps Foundation themes.','settings'),
      step('Beacon receipts and offline verification','','#sheet-body .receipt-card','Review the signed evidence and offline export controls.','settings'),
      step('Person summaries and follow-up drafts','people','#sheet-body #ai-out','Claude can write a summary in the artifact; this browser shows the local template without making an AI call.','person'),
    ],
    diego:[
      step('People, priorities and follow-ups','people','#view [data-act="viewPerson"]','Keep high-priority client and partner conversations connected to a next step.'),
      step('Agent card and consent-aware handoffs','people','#sheet-body .quote','Share a readable agent card and keep contact permission visible.','agentsCard'),
      step('Goals by persona','today','#view .goal','Measure qualified conversations, co-sells and follow-up meetings.'),
      step('Protect client work blocks','agenda','#sheet-body #f-title','Keep immovable client calls visible beside event sessions.','block'),
      step('Pitch fest queue and timer','pitch','#view #timer','Rehearse a short pitch and move through the queue.'),
      step('Connection web and introductions','web','#view .webbox','Spot shared topics and useful introductions across accounts and partners.'),
      step('Report outcomes to the team','report','#view [data-act="copyReport"]','Share outcomes and next steps rather than attendee tracking.'),
      step('Verify and export receipts','','#sheet-body .receipt-card','Review the signed evidence and offline export controls.','settings'),
    ],
    priya:[
      step('Agenda, notes and writing blocks','agenda','#sheet-body #f-take','Capture talk takeaways while keeping protected writing time visible.','session'),
      step('Parse an agenda or badge list','agenda','#sheet-body #f-paste',`Turn pasted text into reviewable sessions. ${parserNote}`,'importAgenda'),
      step('Quick capture after an interview','people','#sheet-body #f-line',`Capture a practitioner conversation and confirm the structured record. ${parserNote}`,'quickAdd'),
      step('Person summaries and follow-up drafts','people','#sheet-body #ai-out','Claude can write a summary in the artifact; this browser shows the local template without making an AI call.','person'),
      step('Connection web and research themes','web','#view .webbox','Group practitioners by AI governance, agentic AI, data platforms and organizational change.'),
      step('Research goals and next interviews','today','#view .goal','Track talks attended, practitioner interviews and emerging themes.'),
      step('Recap and report','report','#view [data-act="copyReport"]','Carry session takeaways and interview follow-ups into the methods workflow.'),
      step('Receipts, verification and offline export','','#sheet-body .receipt-card','Verify the content-free signed receipt chain and export its evidence.','settings'),
    ],
  };
  const steps = tours[id];
  const style = document.createElement('style');
  style.textContent = `
    .demo-banner{position:sticky;top:0;z-index:80;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:8px 12px;background:var(--blue,#0c62fb);color:#fff;box-sizing:border-box}
    .demo-banner__copy,.demo-banner__controls{min-width:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap;overflow-wrap:anywhere}
    .demo-banner button,.demo-banner a{min-height:44px;min-width:44px;box-sizing:border-box;border:1px solid currentColor;border-radius:999px;padding:8px 12px;background:transparent;color:inherit;font:inherit;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
    .demo-tour-scrim{position:fixed;inset:0;z-index:100;background:rgba(8,20,36,.14);pointer-events:none}
    .demo-tour{position:fixed;z-index:110;left:0;right:0;bottom:0;max-height:45vh;max-width:100vw;box-sizing:border-box;overflow:auto;pointer-events:auto;padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));background:var(--surface,#fff);color:var(--ink,#162235);border:1px solid var(--line,#d8e0ea);border-radius:16px 16px 0 0;box-shadow:0 -8px 32px rgba(10,20,35,.2)}
    .demo-tour h2{margin:0 0 8px;overflow-wrap:anywhere}
    .demo-tour ol{margin:0;padding-left:24px}
    .demo-tour li{padding:8px 0;overflow-wrap:anywhere}
    .demo-tour p{margin:4px 0 8px;overflow-wrap:anywhere}
    .demo-tour button{min-width:44px;min-height:44px;max-width:100%;box-sizing:border-box;white-space:normal;overflow-wrap:anywhere}
    [data-demo-highlight]{outline:3px solid #f6b500!important;outline-offset:3px!important;box-shadow:0 0 0 6px rgba(246,181,0,.18)!important;scroll-margin-top:100px}
    @media(max-width:520px){.demo-banner{grid-template-columns:minmax(0,1fr)}.demo-banner__controls{justify-content:flex-start}.demo-tour{max-height:44vh;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px))}}
  `;
  document.head.append(style);
  const banner = document.createElement('section');
  banner.className = 'demo-banner';
  banner.dataset.demoBanner = 'true';
  banner.setAttribute('role','region');
  banner.setAttribute('aria-label','demo mode');
  const exitUrl = new URL(location.href);
  exitUrl.searchParams.delete('demo');
  banner.innerHTML = `<div class="demo-banner__copy"><strong>demo · ${persona.name}</strong><span>${persona.role} · <span data-demo-progress>0/${steps.length}</span> tour steps</span></div><div class="demo-banner__controls"><button type="button" data-demo-tour>tour</button><a href="${exitUrl.pathname}${exitUrl.search}${exitUrl.hash}" data-demo-exit>exit demo</a></div>`;
  document.body.prepend(banner);
  let dialog;
  const completedSteps = new Set();
  const updateProgress = () => {
    banner.querySelector('[data-demo-progress]').textContent = `${completedSteps.size}/${steps.length}`;
  };
  const wait = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));
  const closeAppSheet = () => {
    if (!document.querySelector('#sheet')?.hidden) document.querySelector('#sheet-foot [data-act="closeSheet"]')?.click();
  };
  const openStep = async (item) => {
    document.querySelectorAll('[data-demo-highlight]').forEach((element) => element.removeAttribute('data-demo-highlight'));
    closeAppSheet();
    if (item.tab) document.querySelector(`#tabs [data-act="tab"][data-tab="${item.tab}"]`)?.click();
    await wait();
    if (item.tab === 'people') {
      const mode = item.open === 'agentsCard' ? 'agents' : 'people';
      const control = document.querySelector(`#view [data-act="mode"][data-mode="${mode}"]`);
      if (control?.getAttribute('aria-pressed') !== 'true') control?.click();
      await wait();
    }
    if (item.open === 'settings') document.querySelector('#settings-trigger')?.click();
    if (item.open === 'quickAdd') document.querySelector('#view [data-act="quickAdd"]')?.click();
    if (item.open === 'importAgenda') document.querySelector('#view [data-act="importOpen"][data-kind="agenda"]')?.click();
    if (item.open === 'importPeople') document.querySelector('#view [data-act="importOpen"][data-kind="people"]')?.click();
    if (item.open === 'block') document.querySelector('#view [data-act="editBlock"]')?.click();
    if (item.open === 'session') document.querySelector('#view [data-act="editSession"]')?.click();
    if (item.open === 'person') document.querySelector('#view [data-act="viewPerson"]')?.click();
    if (item.open === 'agentsCard') {
      document.querySelector('#view [data-act="showCard"]')?.click();
    }
    await wait();
    const target = document.querySelector(item.target);
    if (target) {
      target.setAttribute('data-demo-highlight','true');
      target.scrollIntoView({block:'center',inline:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    }
    window.__demoLastStep = {title:item.title,target:!!target,selector:item.target,tab:item.tab || ''};
    return target;
  };
  const closeTour = (restore = true, preserveHighlight = false) => {
    if (!dialog) return;
    dialog.remove();
    dialog = null;
    document.querySelector('.demo-tour-scrim')?.remove();
    if (!preserveHighlight) {
      const target = window.__demoLastStep?.selector && document.querySelector(window.__demoLastStep.selector);
      target?.removeAttribute('data-demo-highlight');
    }
    if (restore) banner.querySelector('[data-demo-tour]').focus();
  };
  const showTour = () => {
    if (dialog) return;
    const scrim = document.createElement('div');
    scrim.className = 'demo-tour-scrim';
    scrim.dataset.demoTour = 'true';
    scrim.setAttribute('role','presentation');
    dialog = document.createElement('section');
    dialog.className = 'demo-tour';
    dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-modal','true');
    dialog.setAttribute('aria-labelledby','demo-tour-title');
    dialog.innerHTML = `<h2 id="demo-tour-title">${persona.name}: “${id === 'maya' ? "I want a dinner crew by tonight." : id === 'diego' ? "Five client conversations and two co-sells." : "Four practitioner interviews without losing focus."}”</h2><ol>${steps.map((item,index)=>`<li><strong>${item.title}</strong><p>${item.explanation}</p><button type="button" data-demo-show="${index}">show me</button><span data-demo-done="${index}" aria-live="polite"></span></li>`).join('')}</ol><div class="demo-tour__controls"><button type="button" data-demo-reset>reset this demo</button><button type="button" data-demo-close>close tour</button></div>`;
    document.body.append(scrim,dialog);
    dialog.querySelectorAll('[data-demo-done]').forEach((node) => {
      if (completedSteps.has(Number(node.dataset.demoDone))) node.textContent = ' ✓ shown';
    });
    updateProgress();
    dialog.querySelectorAll('[data-demo-show]').forEach((button) => button.addEventListener('click', async () => {
      const index = Number(button.dataset.demoShow);
      const target = await openStep(steps[index]);
      if (target) {
        completedSteps.add(index);
        dialog.querySelector(`[data-demo-done="${index}"]`).textContent = ' ✓ shown';
        updateProgress();
        closeTour(false, true);
        if (!target.matches('a,button,input,select,textarea,[tabindex]')) target.tabIndex = -1;
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
      }
    }));
    dialog.querySelector('[data-demo-close]').addEventListener('click', closeTour);
    dialog.querySelector('[data-demo-reset]').addEventListener('click', async () => {
      if (!window.confirm('Reset this persona demo? Its demo data and receipts will be cleared.')) return;
      await window.R4Receipts.clearDemo();
      localStorage.removeItem(stateKey);
      location.reload();
    });
    dialog.addEventListener('keydown',(event)=>{
      if(event.key==='Escape'){event.preventDefault();closeTour();return;}
      if(event.key==='Tab'){
        const items=[...dialog.querySelectorAll('button:not([disabled]),a[href]')];
        const first=items[0],last=items.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    });
    dialog.querySelector('[data-demo-show]')?.focus();
  };
  banner.querySelector('[data-demo-tour]').addEventListener('click',showTour);
  if (!sessionStorage.getItem(`r4-demo-tour-${id}`)) {
    sessionStorage.setItem(`r4-demo-tour-${id}`,'1');
    setTimeout(showTour,250);
  }
})();
