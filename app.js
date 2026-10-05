'use strict';
(() => {
  const KEY = 'r4-networking-v1';

  // ---------- helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const toMin = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
  const fromMin = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const fmtTime = (t) => {
    const m = toMin(t); let h = Math.floor(m / 60); const mm = m % 60; const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
    return mm ? `${h}:${String(mm).padStart(2, '0')}${ap}` : `${h}${ap}`;
  };
  const fmtDur = (min) => (min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ''}` : `${min}m`);
  const initials = (n) => String(n).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const first = (n) => String(n).split(/\s+/)[0] || n;
  const pad = (n) => String(n).padStart(2, '0');
  const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseTopics = (s) => [...new Set(String(s || '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))];
  const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };

  // ---------- domain ----------
  const PERSONAS = {
    exec: {
      label: 'executive sponsor', cls: 'p-exec', color: '#0c2bd8',
      gist: 'a senior decision-maker who thinks in outcomes, risk and investment',
      wants: 'clear business outcomes, peer perspectives, low-risk ways to start',
      approach: 'lead with a crisp point of view and one relevant outcome story. keep it short, then ask what is on their agenda for next year.',
      resources: [['📈', 'outcome story', 'a one-page case study with measurable results in {topic}'], ['🧭', 'point of view', 'a short exec brief on where {topic} is heading'], ['🤝', 'warm intro', 'an intro to the slalom leader who owns their account or market']],
      followup: 'hi {first},\n\ngreat to connect at {event}. you mentioned {hook}. i\'d love to share a short outcome story from similar work and hear what\'s on your roadmap. would 20 minutes in the next couple of weeks work?\n\n{me}',
    },
    tech: {
      label: 'technical leader', cls: 'p-tech', color: '#8b5cf6',
      gist: 'an architect or engineering lead who cares how things actually work',
      wants: 'real architectures, honest trade-offs, people who have done it before',
      approach: 'go deep fast. ask about their stack and current constraints, and offer a working session rather than a pitch.',
      resources: [['🛠', 'reference architecture', 'a reference architecture or accelerator for {topic}'], ['🧪', 'hands-on session', 'a working session or demo with a slalom engineer'], ['📚', 'deep dive', 'a technical write-up or repo on {topic}']],
      followup: 'hey {first},\n\nenjoyed digging into {hook} at {event}. here\'s the thing i mentioned: [link]. happy to set up a working session with our {topic} folks if it\'s useful.\n\n{me}',
    },
    peer: {
      label: 'practice peer', cls: 'p-peer', color: '#18c39a',
      gist: 'a slalom colleague from another market or practice',
      wants: 'collaboration, shared pursuits, reusable assets, community',
      approach: 'trade what you are each working on and look for one shared pursuit or asset to reuse.',
      resources: [['♻️', 'reusable asset', 'swap the decks / accelerators you each built for {topic}'], ['💬', 'community', 'add each other to the {topic} community channel'], ['📅', 'cross-market sync', 'a 30-minute sync next month']],
      followup: '{first}!\n\ngreat to meet at {event}. let\'s keep the {hook} thread going. i\'ll send my deck over, would love to see yours. 30 min sync next month?\n\n{me}',
    },
    client: {
      label: 'client / prospect', cls: 'p-client', color: '#ff5a4e',
      gist: 'a buyer or influencer at a client or prospective client',
      wants: 'help with a specific problem, and confidence that you understand their world',
      approach: 'listen for the problem behind the problem. capture it in their words and agree one concrete next step before you part.',
      resources: [['🎯', 'tailored idea', 'a one-page "how we might help" on {topic}'], ['🏢', 'industry proof', 'a relevant client story from their industry'], ['👥', 'the right people', 'an intro to the slalom team in their local market']],
      followup: 'hi {first},\n\nthank you for the conversation at {event} about {hook}. i\'ve been thinking about it and have a couple of ideas. could we grab 30 minutes so i can learn more and share them?\n\n{me}',
    },
    partner: {
      label: 'partner / vendor', cls: 'p-partner', color: '#3fb6ff',
      gist: 'an alliance or ecosystem partner (cloud, data, platform)',
      wants: 'joint pursuits, co-selling, field alignment',
      approach: 'map overlapping accounts together and agree one joint opportunity to go after.',
      resources: [['🔗', 'joint offer', 'the joint slalom + partner offer for {topic}'], ['🗺', 'account map', 'a shared list of overlapping accounts'], ['🎟', 'co-marketing', 'a joint event or webinar idea on {topic}']],
      followup: 'hi {first},\n\ngood catching up at {event}. following up on {hook}: want to map a few overlapping accounts and pick one to go after together?\n\n{me}',
    },
    talent: {
      label: 'rising talent', cls: 'p-talent', color: '#e09a00',
      gist: 'an early-career consultant or someone exploring their next move',
      wants: 'guidance, sponsorship, visibility, stretch opportunities',
      approach: 'be generous. ask about their ambitions and offer one concrete intro or opportunity.',
      resources: [['🌱', 'mentoring', 'a recurring 30-minute coffee chat'], ['🚀', 'stretch role', 'a spot on an upcoming {topic} pursuit or project'], ['📣', 'visibility', 'an intro to a leader in {topic}']],
      followup: 'hi {first},\n\nreally enjoyed meeting you at {event}. you mentioned {hook}, and i\'d be glad to help. coffee chat in the next couple of weeks?\n\n{me}',
    },
  };
  const TYPES = {
    session: { label: 'session', cls: 't-session', color: '#0c2bd8' },
    bof: { label: 'birds of a feather', cls: 't-bof', color: '#18c39a' },
    meeting: { label: '1:1 / meeting', cls: 't-meeting', color: '#8b5cf6' },
    pitch: { label: 'pitch fest', cls: 't-pitch', color: '#ff5a4e' },
    social: { label: 'social', cls: 't-social', color: '#ffc23d' },
    work: { label: 'work block', cls: 't-work', color: '#8a93b2' },
  };
  const SUGGESTED_TOPICS = ['ai & data', 'cloud', 'cx & design', 'org change', 'product', 'security', 'sustainability', 'gtm & sales', 'healthcare', 'financial services'];
  const PROMPTS = [
    'what\'s one thing about {t} you\'d do differently if you started today?',
    'what\'s the hardest {t} problem on your desk right now?',
    'where have you seen {t} actually move the needle for a client?',
    'what would you want a client to know about {t} before they start?',
  ];

  // ---------- seed ----------
  function seed() {
    const P = (o) => ({ id: uid(), role: '', company: '', topics: [], status: 'met', priority: 'warm', lookingFor: '', canOffer: '', notes: '', metAt: '', day: 0, followUp: { action: '', due: 1, done: false }, createdAt: Date.now(), ...o });
    const people = [
      P({ name: 'maya chen', role: 'chief data officer', company: 'northwind health', persona: 'client', topics: ['ai & data', 'healthcare'], priority: 'hot', lookingFor: 'a path from ai pilots to production', notes: 'has 11 genai pilots, none in prod. board is asking why.', metAt: 'opening keynote', followUp: { action: 'send pilot-to-production case study', due: 1, done: false } }),
      P({ name: 'david okafor', role: 'vp engineering', company: 'contoso bank', persona: 'tech', topics: ['cloud', 'ai & data', 'security'], lookingFor: 'a platform team operating model', notes: 'migrating 400 apps; platform team is a bottleneck.', metAt: 'ai from pilot to production', followUp: { action: 'intro to our platform engineering lead', due: 1, done: false } }),
      P({ name: 'priya raman', role: 'director, data & ai', company: 'slalom chicago', persona: 'peer', topics: ['ai & data', 'gtm & sales'], lookingFor: 'a reusable genai accelerator', canOffer: 'her rag starter kit', metAt: 'bof: genai in regulated industries', followUp: { action: 'swap genai decks', due: 1, done: true } }),
      P({ name: 'luis ortega', role: 'partner development manager', company: 'aws', persona: 'partner', topics: ['cloud', 'gtm & sales'], lookingFor: 'joint pursuits in financial services', metAt: 'welcome coffee', followUp: { action: 'map 5 overlapping accounts', due: 2, done: false } }),
      P({ name: 'hannah berg', role: 'consultant', company: 'slalom seattle', persona: 'talent', topics: ['cx & design', 'product'], lookingFor: 'moving into product strategy', metAt: 'pitch fest round 1', followUp: { action: 'coffee chat + intro to product lead', due: 2, done: false } }),
      P({ name: 'james whitfield', role: 'chief operating officer', company: 'fabrikam retail', persona: 'exec', topics: ['org change', 'cx & design'], status: 'want', priority: 'hot', lookingFor: 'a store-operations transformation', followUp: { action: '', due: 2, done: false } }),
      P({ name: 'aisha mohammed', role: 'director of customer experience', company: 'tailspin airlines', persona: 'client', topics: ['cx & design', 'ai & data'], status: 'want', priority: 'hot', lookingFor: 'ai in the contact center' }),
      P({ name: 'tom becker', role: 'principal, org & change', company: 'slalom denver', persona: 'peer', topics: ['org change', 'product'], status: 'want', lookingFor: 'change-readiness assessments' }),
      P({ name: 'sofia rossi', role: 'principal architect', company: 'snowflake', persona: 'partner', topics: ['ai & data', 'cloud'], status: 'want', lookingFor: 'co-built industry data products' }),
      P({ name: 'ken watanabe', role: 'cto', company: 'litware manufacturing', persona: 'exec', topics: ['ai & data', 'sustainability'], status: 'want', priority: 'warm', lookingFor: 'carbon data for the supply chain' }),
      P({ name: 'grace liu', role: 'senior manager, security', company: 'slalom san francisco', persona: 'peer', topics: ['security', 'cloud'], status: 'want', priority: 'cold' }),
      P({ name: 'marcus johnson', role: 'head of product', company: 'woodgrove insurance', persona: 'client', topics: ['product', 'cx & design'], status: 'want', lookingFor: 'a faster claims experience' }),
      P({ name: 'elena petrova', role: 'senior consultant', company: 'slalom new york', persona: 'talent', topics: ['ai & data', 'sustainability'], status: 'want', priority: 'cold', lookingFor: 'a stretch role on an ai pursuit' }),
      P({ name: 'noah kim', role: 'sustainability lead', company: 'adventure works', persona: 'client', topics: ['sustainability', 'org change'], status: 'want', lookingFor: 'a credible net-zero roadmap' }),
    ];
    const byName = (n) => people.find((p) => p.name.startsWith(n)).id;
    const S = (o) => ({ id: uid(), location: '', notes: '', takeaways: '', topic: '', attendees: [], status: 'going', ...o });
    const sessions = [
      S({ type: 'work', title: 'inbox + team standup', day: 0, start: '08:00', end: '08:45' }),
      S({ type: 'session', title: 'opening keynote: reimagine what\'s next', day: 0, start: '09:00', end: '10:00', location: 'main hall' }),
      S({ type: 'session', title: 'ai from pilot to production', day: 0, start: '10:15', end: '11:00', location: 'room b' }),
      S({ type: 'work', title: 'client call: q4 roadmap', day: 0, start: '10:30', end: '11:15', location: 'teams' }),
      S({ type: 'bof', title: 'genai in regulated industries', day: 0, start: '11:30', end: '12:15', location: 'garden room', topic: 'ai & data', attendees: [byName('maya'), byName('david'), byName('priya')], notes: 'model risk management is the blocker for everyone, not the tech.', takeaways: 'start with an ai governance "minimum viable policy"\nreuse priya\'s rag starter kit for regulated clients' }),
      S({ type: 'pitch', title: 'pitch fest round 1', day: 0, start: '13:30', end: '14:30', location: 'atrium' }),
      S({ type: 'session', title: 'cx in the age of ai', day: 0, start: '15:00', end: '15:45', location: 'room a', status: 'maybe' }),
      S({ type: 'social', title: 'welcome reception', day: 0, start: '17:30', end: '19:00', location: 'rooftop' }),
      S({ type: 'work', title: 'team check-in', day: 1, start: '08:30', end: '09:00' }),
      S({ type: 'session', title: 'keynote: the people side of change', day: 1, start: '09:00', end: '09:45', location: 'main hall' }),
      S({ type: 'bof', title: 'org change for ai adoption', day: 1, start: '10:00', end: '11:00', location: 'garden room', topic: 'org change' }),
      S({ type: 'meeting', title: '1:1 with maya chen', day: 1, start: '11:00', end: '11:30', location: 'lounge', attendees: [byName('maya')] }),
      S({ type: 'work', title: 'deep work: proposal draft', day: 1, start: '13:00', end: '14:00' }),
      S({ type: 'pitch', title: 'pitch fest finals', day: 1, start: '14:00', end: '15:00', location: 'atrium' }),
      S({ type: 'session', title: 'platform engineering at scale', day: 1, start: '15:30', end: '16:15', location: 'room c' }),
      S({ type: 'session', title: 'closing keynote', day: 2, start: '09:00', end: '10:00', location: 'main hall' }),
      S({ type: 'bof', title: 'sustainability + data', day: 2, start: '10:30', end: '11:15', location: 'garden room', topic: 'sustainability' }),
      S({ type: 'work', title: 'travel home', day: 2, start: '13:00', end: '16:00' }),
    ];
    return {
      version: 1,
      me: { name: 'bob', role: '', team: 'my team', interests: ['ai & data', 'cx & design', 'org change'], eventName: 'r4', eventStart: isoOf(new Date()), days: 3, dayStart: '08:00', dayEnd: '18:00' },
      goals: [
        { id: uid(), text: 'meet new people', target: 15, auto: 'people', count: 0 },
        { id: uid(), text: 'meet execs & clients', target: 4, auto: 'execclient', count: 0 },
        { id: uid(), text: 'follow-ups sent', target: 10, auto: 'followups', count: 0 },
        { id: uid(), text: 'birds-of-a-feather sessions', target: 3, auto: 'bof', count: 0 },
        { id: uid(), text: 'pitch at pitch fest', target: 1, auto: '', count: 0 },
      ],
      people,
      sessions,
      bofTopics: [
        { id: uid(), title: 'genai in regulated industries', by: 'priya', votes: 12, voted: false },
        { id: uid(), title: 'ai literacy for non-tech teams', by: 'tom', votes: 9, voted: false },
        { id: uid(), title: 'measuring cx roi', by: 'aisha', votes: 7, voted: false },
        { id: uid(), title: 'partner co-sell playbooks', by: 'luis', votes: 4, voted: false },
      ],
      pitches: [
        { id: uid(), name: 'hannah berg', idea: 'an ai coach for new consultants', done: true, sparked: [] },
        { id: uid(), name: 'tom becker', idea: 'change-readiness pulse in 5 questions', done: false, sparked: [] },
        { id: uid(), name: 'priya raman', idea: 'a genai accelerator marketplace', done: false, sparked: [] },
        { id: uid(), name: 'luis ortega', idea: 'aws + slalom co-innovation sprints', done: false, sparked: [] },
        { id: uid(), name: 'bob', idea: 'this r4 networking app', done: false, sparked: [] },
      ],
      pitchSeconds: 120,
    };
  }

  // ---------- state ----------
  let state;
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch { state = null; }
  if (!state || state.version !== 1) state = seed();
  const save = () => localStorage.setItem(KEY, JSON.stringify(state));
  save();

  const ui = {
    tab: 'today', day: null,
    peopleSeg: 'all', peopleQuery: '', personaFilter: '',
    agendaSeg: 'timeline', connectSeg: 'web', reportSeg: 'team',
    webFocus: null, groupSize: 4, groupPool: 'all', groupSeed: 1,
    recapDay: null, reportPersonas: true,
  };

  const dayDate = (i) => { const [y, m, d] = state.me.eventStart.split('-').map(Number); return new Date(y, m - 1, d + i); };
  const dayLabel = (i, long) => dayDate(i).toLocaleDateString('en-US', long ? { weekday: 'long', month: 'short', day: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric' }).toLowerCase();
  const currentDay = () => {
    const now = new Date();
    const diff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - dayDate(0)) / 86400000);
    return Math.max(0, Math.min(state.me.days - 1, diff));
  };
  const isEventDay = () => isoOf(new Date()) >= state.me.eventStart && isoOf(new Date()) <= isoOf(dayDate(state.me.days - 1));
  const personById = (id) => state.people.find((p) => p.id === id);
  const sessionById = (id) => state.sessions.find((s) => s.id === id);
  const persona = (p) => PERSONAS[p.persona] || PERSONAS.peer;
  const met = () => state.people.filter((p) => p.status === 'met');

  function goalValue(g) {
    switch (g.auto) {
      case 'people': return met().length;
      case 'execclient': return met().filter((p) => p.persona === 'exec' || p.persona === 'client').length;
      case 'followups': return state.people.filter((p) => p.followUp?.action && p.followUp.done).length;
      case 'bof': return state.sessions.filter((s) => s.type === 'bof' && s.status === 'going').length;
      default: return g.count || 0;
    }
  }

  // ---------- persona summary ----------
  function summary(p) {
    const ps = persona(p);
    const topic = p.topics[0] || 'their focus area';
    const hook = p.lookingFor || (p.notes ? p.notes.split(/[.!?]/)[0] : '') || topic;
    const fill = (s) => s.replace(/\{topic\}/g, topic).replace(/\{first\}/g, first(p.name)).replace(/\{hook\}/g, hook)
      .replace(/\{event\}/g, state.me.eventName).replace(/\{me\}/g, state.me.name);
    const who = [p.role, p.company].filter(Boolean).join(' at ');
    return {
      headline: `${first(p.name)}${who ? `, ${who},` : ''} is ${/^[aeiou]/.test(ps.label) ? 'an' : 'a'} ${ps.label}: ${ps.gist}.`,
      focus: p.topics.join(', ') || 'not captured yet',
      wants: p.lookingFor || ps.wants,
      offer: p.canOffer || fill(ps.resources[0][2]),
      approach: ps.approach,
      resources: ps.resources.map(([ico, t, d]) => ({ ico, title: t, desc: fill(d) })),
      followup: fill(ps.followup),
    };
  }

  // ---------- agenda logic ----------
  function dayItems(day) {
    return state.sessions.filter((s) => s.day === day).sort((a, b) => toMin(a.start) - toMin(b.start) || toMin(a.end) - toMin(b.end));
  }
  function analyzeDay(day) {
    const items = dayItems(day);
    const conflicts = new Set(); const pairs = [];
    const active = items.filter((s) => s.status !== 'maybe');
    for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
      const a = active[i], b = active[j];
      if (toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end)) { conflicts.add(a.id); conflicts.add(b.id); pairs.push([a, b]); }
    }
    const ds = toMin(state.me.dayStart), de = toMin(state.me.dayEnd);
    const free = []; let cursor = ds;
    for (const s of active) {
      const st = toMin(s.start), en = toMin(s.end);
      if (st - cursor >= 30 && st > ds) free.push({ start: fromMin(Math.max(cursor, ds)), end: fromMin(Math.min(st, de)), mins: Math.min(st, de) - Math.max(cursor, ds) });
      cursor = Math.max(cursor, en);
    }
    if (de - cursor >= 30) free.push({ start: fromMin(cursor), end: fromMin(de), mins: de - cursor });
    const freeOk = free.filter((f) => f.mins >= 30);
    const warnings = pairs.map(([a, b]) => {
      const work = [a, b].find((x) => x.type === 'work');
      return work ? `"${work.title}" (work) overlaps "${(work === a ? b : a).title}". move it or mark one as maybe.`
        : `"${a.title}" and "${b.title}" overlap. pick one and mark the other as maybe.`;
    });
    const lunch = active.some((s) => toMin(s.start) < toMin('13:30') && toMin(s.end) > toMin('11:30'));
    const lunchFree = freeOk.some((f) => toMin(f.start) < toMin('13:30') && toMin(f.end) > toMin('11:30') && Math.min(toMin(f.end), toMin('13:30')) - Math.max(toMin(f.start), toMin('11:30')) >= 30);
    if (lunch && !lunchFree) warnings.push('no 30-minute window for lunch between 11:30am and 1:30pm.');
    let runStart = null, runEnd = null;
    for (const s of active) {
      const st = toMin(s.start), en = toMin(s.end);
      if (runStart === null || st - runEnd >= 15) { runStart = st; runEnd = en; } else runEnd = Math.max(runEnd, en);
      if (runEnd - runStart >= 180) { warnings.push(`back-to-back from ${fmtTime(fromMin(runStart))} to ${fmtTime(fromMin(runEnd))}, no break. block 15 minutes to recharge.`); break; }
    }
    const workMins = active.filter((s) => s.type === 'work').reduce((t, s) => t + toMin(s.end) - toMin(s.start), 0);
    if (workMins > 180) warnings.push(`${fmtDur(workMins)} of work blocks today. that's time you won't be networking.`);
    return { items, conflicts, free: freeOk, warnings };
  }
  function nextFreeSlot(day, mins = 30) {
    const { free } = analyzeDay(day);
    const nowM = day === currentDay() && isEventDay() ? new Date().getHours() * 60 + new Date().getMinutes() : 0;
    const f = free.find((x) => toMin(x.end) - Math.max(toMin(x.start), nowM) >= mins);
    if (!f) return null;
    const st = Math.ceil(Math.max(toMin(f.start), nowM) / 15) * 15;
    return { start: fromMin(st), end: fromMin(st + mins) };
  }

  // ---------- matching ----------
  function scorePerson(p) {
    let s = 10; const reasons = [];
    const shared = p.topics.filter((t) => state.me.interests.includes(t));
    s += shared.length * 22; shared.forEach((t) => reasons.push(`shares ${t}`));
    const g = state.goals.find((x) => x.auto === 'execclient');
    if (g && (p.persona === 'exec' || p.persona === 'client') && goalValue(g) < g.target) { s += 18; reasons.push('fits goal: execs & clients'); }
    if (p.priority === 'hot') { s += 18; reasons.push('flagged hot'); } else if (p.priority === 'warm') s += 6;
    const bridges = met().filter((m) => m.id !== p.id && m.topics.some((t) => p.topics.includes(t))).length;
    if (bridges) { s += Math.min(15, bridges * 4); reasons.push(`connects to ${bridges} of your contacts`); }
    return { score: Math.min(99, s), reasons };
  }
  function suggestions(limit = 50) {
    return state.people.filter((p) => p.status === 'want').map((p) => ({ p, ...scorePerson(p) })).sort((a, b) => b.score - a.score).slice(0, limit);
  }
  function intros() {
    const m = met(); const out = [];
    const comp = { client: ['partner', 'tech', 'peer'], exec: ['peer', 'partner'], talent: ['exec', 'peer'], tech: ['partner', 'tech'] };
    for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) {
      const a = m[i], b = m[j];
      if (a.company === b.company) continue;
      const shared = a.topics.filter((t) => b.topics.includes(t));
      if (!shared.length) continue;
      let sc = shared.length * 2;
      if ((comp[a.persona] || []).includes(b.persona) || (comp[b.persona] || []).includes(a.persona)) sc += 2;
      out.push({ a, b, shared, sc });
    }
    return out.sort((x, y) => y.sc - x.sc).slice(0, 5);
  }
  function buildGroups(pool, size, seedN) {
    const shuffled = (arr, salt) => [...arr].sort((x, y) => hash(x.id + seedN + salt) - hash(y.id + seedN + salt));
    const counts = {}; pool.forEach((p) => p.topics.forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    const topics = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || (hash(a + seedN) - hash(b + seedN)));
    const used = new Set(); const groups = [];
    for (const t of topics) {
      const members = shuffled(pool.filter((p) => !used.has(p.id) && p.topics.includes(t)), t);
      while (members.length >= size) { const g = members.splice(0, size); g.forEach((p) => used.add(p.id)); groups.push({ topic: t, members: g }); }
      if (members.length >= Math.max(2, size - 1)) { members.forEach((p) => used.add(p.id)); groups.push({ topic: t, members }); }
    }
    const rest = shuffled(pool.filter((p) => !used.has(p.id)), 'rest');
    while (rest.length) {
      const g = rest.splice(0, size);
      if (g.length < 2 && groups.length) groups[groups.length - 1].members.push(...g);
      else groups.push({ topic: 'open mix', members: g });
    }
    return groups.map((g, i) => ({ ...g, prompt: PROMPTS[Math.floor(hash(g.topic + i + seedN) * PROMPTS.length)].replace('{t}', g.topic), ...(g.topic === 'open mix' ? { prompt: `what are you each hoping to get out of ${state.me.eventName}?` } : {}) }));
  }

  // ---------- markdown ----------
  function md2html(md) {
    const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/_(.+?)_/g, '<i>$1</i>');
    let html = ''; let inList = false;
    for (const line of md.split('\n')) {
      if (/^- /.test(line)) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${inline(line.slice(2))}</li>`; continue; }
      if (inList) { html += '</ul>'; inList = false; }
      if (/^# /.test(line)) html += `<div class="report-head"><b>${inline(line.slice(2))}</b>`;
      else if (/^> /.test(line)) html += `<span class="muted small">${inline(line.slice(2))}</span></div>`;
      else if (/^## /.test(line)) html += `<h3>${inline(line.slice(3))}</h3>`;
      else if (line.trim()) html += `<p>${inline(line)}</p>`;
    }
    if (inList) html += '</ul>';
    return html;
  }
  function teamReport() {
    const m = met(); const L = [];
    const fu = state.people.filter((p) => p.followUp?.action);
    L.push(`# ${state.me.eventName} networking report — ${state.me.name}`);
    L.push(`> ${dayLabel(0)} – ${dayLabel(state.me.days - 1)} · prepared for ${state.me.team}`);
    L.push('## headline');
    const topicCounts = {}; m.forEach((p) => p.topics.forEach((t) => { topicCounts[t] = (topicCounts[t] || 0) + 1; }));
    const topTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    L.push(`- met **${m.length}** people (${m.filter((p) => p.persona === 'exec' || p.persona === 'client').length} execs / clients, ${m.filter((p) => p.persona === 'partner').length} partners, ${m.filter((p) => p.persona === 'peer').length} slalom peers)`);
    L.push(`- **${fu.filter((p) => p.followUp.done).length} of ${fu.length}** follow-ups done`);
    if (topTopics.length) L.push(`- hottest topics: ${topTopics.map(([t, n]) => `${t} (${n})`).join(', ')}`);
    L.push('## goals');
    state.goals.forEach((g) => L.push(`- ${g.text}: ${goalValue(g)} / ${g.target}${goalValue(g) >= g.target ? ' ✓' : ''}`));
    const hot = m.filter((p) => p.priority === 'hot');
    if (hot.length) {
      L.push('## opportunities to act on');
      hot.forEach((p) => L.push(`- **${p.name}** (${p.role}${p.company ? `, ${p.company}` : ''}): ${p.lookingFor || p.notes || 'follow up'}`));
    }
    if (ui.reportPersonas) {
      Object.entries(PERSONAS).forEach(([k, ps]) => {
        const group = m.filter((p) => p.persona === k);
        if (!group.length) return;
        L.push(`## ${ps.label} (${group.length})`);
        group.forEach((p) => {
          const s = summary(p);
          L.push(`- **${p.name}**, ${[p.role, p.company].filter(Boolean).join(', ')}. focus: ${s.focus}. looking for: ${s.wants}.${p.notes ? ` note: ${p.notes}` : ''} next: ${p.followUp?.action || 'no follow-up set'}${p.followUp?.done ? ' (done)' : ''}. resources: ${s.resources.map((r) => r.title).join(', ')}.`);
        });
      });
    }
    const bofs = state.sessions.filter((s) => s.type === 'bof' && (s.notes || s.takeaways));
    if (bofs.length) {
      L.push('## birds-of-a-feather takeaways');
      bofs.forEach((s) => {
        L.push(`- **${s.title}**${s.attendees.length ? ` (with ${s.attendees.map((id) => personById(id)?.name).filter(Boolean).join(', ')})` : ''}`);
        s.takeaways.split('\n').filter(Boolean).forEach((t) => L.push(`- ↳ ${t}`));
        if (s.notes) L.push(`- ↳ discussion: ${s.notes}`);
      });
    }
    const sparks = state.pitches.filter((p) => p.sparked.length);
    if (sparks.length) {
      L.push('## pitch fest sparks');
      sparks.forEach((p) => L.push(`- "${p.idea}" (${p.name}) → ${p.sparked.map((id) => personById(id)?.name).filter(Boolean).join(', ')}`));
    }
    const ints = intros();
    if (ints.length) {
      L.push('## intros the team could make');
      ints.forEach((x) => L.push(`- ${x.a.name} ↔ ${x.b.name}: both into ${x.shared.join(', ')}`));
    }
    const open = fu.filter((p) => !p.followUp.done);
    if (open.length) {
      L.push('## open follow-ups');
      open.forEach((p) => L.push(`- ${p.name}: ${p.followUp.action} (due ${dayLabel(p.followUp.due)})`));
    }
    return L.join('\n');
  }
  function recap(day) {
    const L = [];
    const m = met().filter((p) => p.day === day);
    const items = dayItems(day).filter((s) => s.status === 'going');
    L.push(`# end-of-day recap — ${dayLabel(day, true)}`);
    L.push(`> day ${day + 1} of ${state.me.eventName} · ${state.me.name}`);
    L.push('## people i met');
    if (m.length) m.forEach((p) => L.push(`- **${p.name}** (${persona(p).label}, ${p.company || 'n/a'})${p.lookingFor ? `: looking for ${p.lookingFor}` : ''}`));
    else L.push('- nobody logged yet');
    L.push('## where my time went');
    const byType = {}; items.forEach((s) => { byType[s.type] = (byType[s.type] || 0) + toMin(s.end) - toMin(s.start); });
    Object.entries(byType).forEach(([t, mins]) => L.push(`- ${TYPES[t].label}: ${fmtDur(mins)}`));
    const tk = items.filter((s) => s.takeaways);
    if (tk.length) {
      L.push('## takeaways');
      tk.forEach((s) => s.takeaways.split('\n').filter(Boolean).forEach((t) => L.push(`- ${t} _(${s.title})_`)));
    }
    const due = state.people.filter((p) => p.followUp?.action && !p.followUp.done && p.followUp.due <= day + 1);
    L.push('## follow-ups for tomorrow');
    if (due.length) due.forEach((p) => L.push(`- ${p.name}: ${p.followUp.action}`)); else L.push('- all clear');
    if (day + 1 < state.me.days) {
      L.push('## tomorrow');
      dayItems(day + 1).filter((s) => s.status === 'going').slice(0, 6).forEach((s) => L.push(`- ${fmtTime(s.start)} ${s.title}`));
      const sug = suggestions(3);
      if (sug.length) L.push(`- people to find: ${sug.map((x) => x.p.name).join(', ')}`);
    }
    return L.join('\n');
  }

  // ---------- io ----------
  function download(name, text, mime = 'text/plain') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  async function copy(text, msg = 'copied') {
    try { await navigator.clipboard.writeText(text); } catch {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    toast(msg);
  }
  const icsEsc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`);
  function ics(items) {
    const d2 = (day, t) => { const d = dayDate(day); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${t.replace(':', '')}00`; };
    const now = new Date(); const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//r4 networking//EN', 'CALSCALE:GREGORIAN'];
    items.forEach((s) => {
      const who = s.attendees.map((id) => personById(id)?.name).filter(Boolean).join(', ');
      L.push('BEGIN:VEVENT', `UID:${s.id}@r4-networking`, `DTSTAMP:${stamp}`, `DTSTART:${d2(s.day, s.start)}`, `DTEND:${d2(s.day, s.end)}`,
        `SUMMARY:${icsEsc(`${state.me.eventName} · ${s.title}`)}`, `LOCATION:${icsEsc(s.location)}`,
        `DESCRIPTION:${icsEsc([TYPES[s.type].label, who && `with ${who}`, s.notes].filter(Boolean).join('\n'))}`, 'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.join('\r\n');
  }
  function parseIcs(text) {
    const lines = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
    const events = []; let cur = null;
    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') cur = {};
      else if (line === 'END:VEVENT') { if (cur) events.push(cur); cur = null; } else if (cur) {
        const i = line.indexOf(':'); if (i < 0) continue;
        const [name, ...params] = line.slice(0, i).split(';'); cur[name] = { value: line.slice(i + 1), params: params.join(';') };
      }
    }
    const toDate = (f) => {
      if (!f || /VALUE=DATE(?!-)/.test(f.params) || f.value.length < 15) return null;
      const v = f.value; const [y, mo, d, h, mi] = [v.slice(0, 4), v.slice(4, 6), v.slice(6, 8), v.slice(9, 11), v.slice(11, 13)].map(Number);
      return v.endsWith('Z') ? new Date(Date.UTC(y, mo - 1, d, h, mi)) : new Date(y, mo - 1, d, h, mi);
    };
    return events.map((e) => ({ title: (e.SUMMARY?.value || 'busy').replace(/\\([,;\\])/g, '$1').replace(/\\n/gi, ' '), start: toDate(e.DTSTART), end: toDate(e.DTEND), location: (e.LOCATION?.value || '').replace(/\\([,;\\])/g, '$1') })).filter((e) => e.start && e.end);
  }

  // ---------- toast / sheet ----------
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
  function openSheet(title, body) {
    $('#sheet-root').innerHTML = `<div class="sheet-backdrop" data-action="close-sheet-bg"><div class="sheet" role="dialog" aria-label="${esc(title)}">
      <div class="sheet-handle"></div><div class="sheet-head"><h2>${esc(title)}</h2><button class="btn ghost" data-action="close-sheet">close</button></div>${body}</div></div>`;
    const f = $('#sheet-root input:not([type=hidden]):not([type=checkbox]), #sheet-root textarea');
    if (f && f.dataset.autofocus !== undefined) f.focus();
  }
  const closeSheet = () => { $('#sheet-root').innerHTML = ''; };

  // ---------- icons ----------
  const I = {
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16.5 14.6c2.8.2 5 1.9 5 4.9"/></svg>',
    agenda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    connect: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2.5"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M6.5 6.5l3.7 3.7M17.5 6.5l-3.7 3.7M6.5 17.5l3.7-3.7M17.5 17.5l-3.7-3.7"/></svg>',
    pitch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
    report: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  };
  const TABS = [['today', 'today'], ['people', 'people'], ['agenda', 'agenda'], ['connect', 'connect'], ['pitch', 'pitch fest'], ['report', 'report']];

  // ---------- components ----------
  const personaTag = (p) => `<span class="persona-tag ${persona(p).cls}">${esc(persona(p).label)}</span>`;
  const avatar = (p, lg) => `<span class="avatar ${lg ? 'lg' : ''} ${persona(p).cls}">${esc(initials(p.name))}</span>`;
  const prioChip = (p) => (p.priority === 'hot' ? '<span class="chip bad">hot</span>' : p.priority === 'cold' ? '' : '');
  const personRow = (p, extra = '') => `<button class="list-item" data-action="person" data-id="${p.id}">${avatar(p)}
      <div class="grow"><div class="row between"><span class="name">${esc(p.name)}</span>${prioChip(p)}</div>
      <div class="sub">${esc([p.role, p.company].filter(Boolean).join(' · ') || '—')}</div>
      <div class="row wrap" style="margin-top:4px;gap:6px">${personaTag(p)}${p.status === 'want' ? '<span class="chip warn">to meet</span>' : ''}${extra}</div></div></button>`;
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${ui[key] === v ? 'on' : ''}" data-action="seg" data-key="${key}" data-val="${v}">${l}</button>`).join('')}</div>`;
  const dayPicker = (key) => `<div class="scroller">${Array.from({ length: state.me.days }, (_, i) => `<button class="chip ${ui[key] === i ? 'on' : ''}" data-action="pick-day" data-key="${key}" data-day="${i}">day ${i + 1} · ${esc(dayLabel(i))}</button>`).join('')}</div>`;
  const tItem = (s, conflict) => `<div class="t-item"><div class="t-time">${fmtTime(s.start)}</div>
      <div class="t-card ${TYPES[s.type].cls} ${conflict ? 'conflict' : ''}" data-action="session" data-id="${s.id}">
      <div class="row between"><span class="t-title">${esc(s.title)}</span>${s.status === 'maybe' ? '<span class="chip">maybe</span>' : ''}</div>
      <div class="t-meta">${fmtTime(s.start)}–${fmtTime(s.end)}${s.location ? ` · ${esc(s.location)}` : ''} · ${TYPES[s.type].label}${s.attendees.length ? ` · ${s.attendees.length} people` : ''}</div>
      ${conflict ? '<div style="margin-top:6px"><span class="chip bad">conflict</span></div>' : ''}</div></div>`;

  // ---------- views ----------
  function viewToday() {
    const d = currentDay();
    const nowM = isEventDay() ? new Date().getHours() * 60 + new Date().getMinutes() : 0;
    const items = dayItems(d).filter((s) => s.status === 'going' && toMin(s.end) > nowM);
    const metToday = met().filter((p) => p.day === d).length;
    const due = state.people.filter((p) => p.followUp?.action && !p.followUp.done).sort((a, b) => a.followUp.due - b.followUp.due);
    const nextIn = items[0] ? Math.max(0, toMin(items[0].start) - nowM) : null;
    const sug = suggestions(3);
    return `
      <section class="hero">
        <h1>hi ${esc(state.me.name)}, let's make<br/>${esc(state.me.eventName)} count.</h1>
        <p>day ${d + 1} of ${state.me.days} · ${esc(dayLabel(d, true))}</p>
      </section>
      <div class="stats">
        <div class="stat"><b>${metToday}</b><span>met today</span></div>
        <div class="stat"><b>${due.length}</b><span>follow-ups open</span></div>
        <div class="stat"><b>${nextIn === null ? '—' : isEventDay() ? fmtDur(nextIn) : fmtTime(items[0].start)}</b><span>${isEventDay() ? 'until next up' : 'first up'}</span></div>
      </div>
      <div class="row" style="gap:8px">
        <button class="btn block" data-action="add-person">log someone i met</button>
        <button class="btn secondary block" data-action="go" data-tab="pitch">pitch fest</button>
      </div>
      <h2 class="section">next up <button class="btn ghost sm" data-action="go" data-tab="agenda">full agenda</button></h2>
      ${items.length ? items.slice(0, 3).map((s) => tItem(s, analyzeDay(d).conflicts.has(s.id))).join('')
        : d + 1 < state.me.days ? `<p class="small muted" style="margin:-4px 2px 8px">done for today. first up on ${esc(dayLabel(d + 1))}:</p>${dayItems(d + 1).filter((s) => s.status === 'going').slice(0, 3).map((s) => tItem(s, analyzeDay(d + 1).conflicts.has(s.id))).join('')}`
        : '<div class="card empty"><b>nothing else today</b>time to write that recap.</div>'}
      <h2 class="section">my goals <button class="btn ghost sm" data-action="edit-goals">edit</button></h2>
      <div class="card">${state.goals.map((g) => {
        const v = goalValue(g); const pct = Math.min(100, Math.round((v / Math.max(1, g.target)) * 100));
        return `<div class="goal-row"><div class="grow"><div class="row between"><span>${esc(g.text)}</span><b>${v}/${g.target}</b></div>
          <div class="progress"><i style="width:${pct}%"></i></div></div>
          ${g.auto ? '' : `<div class="stepper"><button data-action="goal-step" data-id="${g.id}" data-d="-1" aria-label="minus">−</button><button data-action="goal-step" data-id="${g.id}" data-d="1" aria-label="plus">+</button></div>`}</div>`;
      }).join('')}</div>
      <h2 class="section">follow-ups <button class="btn ghost sm" data-action="go-followups">see all</button></h2>
      ${due.length ? due.slice(0, 3).map((p) => followRow(p)).join('') : '<div class="card empty"><b>inbox zero</b>all follow-ups done.</div>'}
      <h2 class="section">who to find next <button class="btn ghost sm" data-action="go-connect" data-seg="match">more</button></h2>
      ${sug.map((x) => personRow(x.p, `<span class="chip good">${x.score}% match</span>`)).join('') || '<div class="card empty">no one on your to-meet list.</div>'}
      <div class="card" style="margin-top:16px;background:var(--navy);color:#fff">
        <h3>end of day?</h3><p style="opacity:.8;margin-bottom:12px">get a one-tap recap of who you met, takeaways and tomorrow's plan.</p>
        <button class="btn coral" data-action="go-recap">write my recap</button>
      </div>`;
  }
  const followRow = (p) => `<div class="card tight ${persona(p).cls}"><div class="row">${avatar(p)}
      <div class="grow"><div class="row between"><b>${esc(p.name)}</b><span class="chip ${p.followUp.done ? 'good' : p.followUp.due <= currentDay() ? 'bad' : 'warn'}">${p.followUp.done ? 'done' : `due ${esc(dayLabel(p.followUp.due))}`}</span></div>
      <div class="small muted">${esc(p.followUp.action)}</div></div></div>
      <div class="row" style="margin-top:10px;gap:6px;justify-content:flex-end">
        <button class="btn ghost sm" data-action="person" data-id="${p.id}">open</button>
        <button class="btn secondary sm" data-action="copy-followup" data-id="${p.id}">copy message</button>
        <button class="btn sm" data-action="toggle-followup" data-id="${p.id}">${p.followUp.done ? 'reopen' : 'mark done'}</button>
      </div></div>`;

  function viewPeople() {
    return `<h1 class="page-title">people</h1><p class="page-sub">${met().length} met · ${state.people.filter((p) => p.status === 'want').length} on your to-meet list</p>
      ${seg('peopleSeg', [['all', 'everyone'], ['met', 'met'], ['want', 'to meet'], ['follow', 'follow-ups']])}
      ${ui.peopleSeg === 'follow' ? '' : `<input class="search" placeholder="search name, company, topic…" value="${esc(ui.peopleQuery)}" data-input="peopleQuery" />
      <div class="scroller"><button class="chip ${!ui.personaFilter ? 'on' : ''}" data-action="persona-filter" data-val="">all personas</button>${Object.entries(PERSONAS).map(([k, p]) => `<button class="chip ${ui.personaFilter === k ? 'on' : ''}" data-action="persona-filter" data-val="${k}">${p.label}</button>`).join('')}</div>`}
      <div id="people-list">${peopleList()}</div>
      <button class="fab" data-action="add-person" aria-label="log a person">${I.plus}</button>`;
  }
  function peopleList() {
    if (ui.peopleSeg === 'follow') {
      const fu = state.people.filter((p) => p.followUp?.action);
      const open = fu.filter((p) => !p.followUp.done).sort((a, b) => a.followUp.due - b.followUp.due);
      const done = fu.filter((p) => p.followUp.done);
      return `${open.length ? open.map(followRow).join('') : '<div class="card empty"><b>no open follow-ups</b>nice work.</div>'}
        ${done.length ? `<h2 class="section">done <small>${done.length}</small></h2>${done.map(followRow).join('')}` : ''}`;
    }
    const q = ui.peopleQuery.trim().toLowerCase();
    const list = state.people.filter((p) => (ui.peopleSeg === 'all' || p.status === ui.peopleSeg) && (!ui.personaFilter || p.persona === ui.personaFilter)
      && (!q || [p.name, p.company, p.role, p.topics.join(' '), p.notes].join(' ').toLowerCase().includes(q)))
      .sort((a, b) => (a.status === b.status ? 0 : a.status === 'met' ? -1 : 1) || b.createdAt - a.createdAt);
    return list.length ? list.map((p) => personRow(p)).join('') : '<div class="card empty"><b>no one here yet</b>tap + to log someone.</div>';
  }

  function viewAgenda() {
    if (ui.day === null) ui.day = currentDay();
    let body = '';
    if (ui.agendaSeg === 'timeline') {
      const { items, conflicts, free, warnings } = analyzeDay(ui.day);
      const merged = [...items.map((s) => ({ k: 's', t: toMin(s.start), s })), ...free.map((f) => ({ k: 'f', t: toMin(f.start), f }))].sort((a, b) => a.t - b.t || (a.k === 's' ? -1 : 1));
      body = `${dayPicker('day')}
        ${warnings.length ? `<div class="warn-box"><b>heads up</b><ul>${warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>` : '<div class="warn-box" style="background:#dcf7ef;color:#0b7d61"><b>looking good</b>no conflicts on this day.</div>'}
        <div class="legend">${Object.values(TYPES).map((t) => `<span><i style="background:${t.color}"></i>${t.label}</span>`).join('')}<span><i style="border:2px dashed #b9c5ef"></i>free</span></div>
        <div class="timeline">${merged.length ? merged.map((x) => (x.k === 's' ? tItem(x.s, conflicts.has(x.s.id))
          : `<div class="t-item t-free"><div class="t-time">${fmtTime(x.f.start)}</div><div class="t-card" data-action="add-session" data-day="${ui.day}" data-start="${x.f.start}" data-end="${fromMin(Math.min(toMin(x.f.end), toMin(x.f.start) + 30))}">
            free ${fmtDur(x.f.mins)} · ${x.f.mins >= 60 ? 'good for a 1:1 or work block' : 'grab a coffee chat'} <b>+ add</b></div></div>`)).join('') : '<div class="card empty"><b>empty day</b>add sessions and work blocks.</div>'}</div>
        <div class="row wrap" style="gap:8px;margin-top:14px">
          <button class="btn secondary sm" data-action="add-session" data-day="${ui.day}" data-type="work">+ work block</button>
          <button class="btn secondary sm" data-action="export-day">add day to calendar (.ics)</button>
          <button class="btn secondary sm" data-action="import-ics">import work calendar (.ics)</button>
        </div>
        <p class="small muted" style="margin-top:10px">your work calendar isn't connected. add work blocks by hand, or export an .ics from outlook / google calendar and import it here. events on conference days become work blocks.</p>
        <input type="file" id="ics-file" accept=".ics,text/calendar" hidden />`;
    } else {
      const topics = [...state.bofTopics].sort((a, b) => b.votes - a.votes);
      const bofs = state.sessions.filter((s) => s.type === 'bof').sort((a, b) => a.day - b.day || toMin(a.start) - toMin(b.start));
      body = `<div class="card"><h3>birds of a feather</h3><p class="muted small">small, self-organized circles on a shared topic. propose one, vote, then schedule the winners and link who joined.</p>
        <form data-form="propose-bof" class="row" style="margin-top:12px"><input class="search" style="margin:0" name="title" placeholder="propose a topic…" required /><button class="btn">add</button></form></div>
        <h2 class="section">proposed topics <small>${topics.length}</small></h2>
        ${topics.map((t) => `<div class="card tight row"><div class="vote"><button class="${t.voted ? 'on' : ''}" data-action="vote" data-id="${t.id}" aria-label="vote">▲</button><span>${t.votes}</span></div>
          <div class="grow"><b>${esc(t.title)}</b><div class="small muted">proposed by ${esc(t.by)}</div></div>
          <button class="btn secondary sm" data-action="schedule-bof" data-id="${t.id}">schedule</button></div>`).join('')}
        <h2 class="section">scheduled <small>${bofs.length}</small></h2>
        ${bofs.map((s) => `<div class="card tight t-bof" data-action="session" data-id="${s.id}" style="cursor:pointer;border-left:5px solid var(--mint)">
          <div class="row between"><b>${esc(s.title)}</b><span class="chip">day ${s.day + 1} · ${fmtTime(s.start)}</span></div>
          <div class="small muted">${s.attendees.length} people linked${s.takeaways ? ` · ${s.takeaways.split('\n').filter(Boolean).length} takeaways` : ''}${s.location ? ` · ${esc(s.location)}` : ''}</div></div>`).join('') || '<div class="card empty">none scheduled yet.</div>'}`;
    }
    return `<h1 class="page-title">agenda</h1><p class="page-sub">conference sessions and your work blocks, in one timeline.</p>
      ${seg('agendaSeg', [['timeline', 'my day'], ['bof', 'birds of a feather']])}${body}
      <button class="fab" data-action="add-session" data-day="${ui.day}" aria-label="add to agenda">${I.plus}</button>`;
  }

  function webSvg() {
    const people = state.people;
    const counts = {}; people.forEach((p) => p.topics.forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    const topics = Object.keys(counts).sort();
    const W = 360, H = 420, cx = W / 2, cy = H / 2;
    const nodes = []; const idx = {};
    topics.forEach((t, i) => { const a = (i / topics.length) * Math.PI * 2; idx[`t:${t}`] = nodes.length; nodes.push({ id: `t:${t}`, kind: 't', label: t, x: cx + Math.cos(a) * 85, y: cy + Math.sin(a) * 95, r: 15 + Math.sqrt(counts[t]) * 4 }); });
    people.forEach((p) => {
      const ts = p.topics.map((t) => nodes[idx[`t:${t}`]]);
      const ax = ts.reduce((s, n) => s + n.x, 0) / (ts.length || 1) || cx, ay = ts.reduce((s, n) => s + n.y, 0) / (ts.length || 1) || cy;
      const ang = hash(p.id) * Math.PI * 2;
      idx[p.id] = nodes.length; nodes.push({ id: p.id, kind: 'p', p, label: first(p.name), x: ax + (ax - cx) * 0.6 + Math.cos(ang) * 30, y: ay + (ay - cy) * 0.6 + Math.sin(ang) * 30, r: p.status === 'met' ? 8 : 6 });
    });
    const links = []; people.forEach((p) => p.topics.forEach((t) => links.push([idx[p.id], idx[`t:${t}`]])));
    for (let it = 0; it < 220; it++) {
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j]; let dx = b.x - a.x, dy = b.y - a.y; let d2 = dx * dx + dy * dy || 0.01; const d = Math.sqrt(d2);
        const min = a.r + b.r + 22; if (d > min * 2.2) continue;
        const f = (a.kind === 't' && b.kind === 't' ? 900 : 260) / d2; dx /= d; dy /= d;
        a.x -= dx * f; a.y -= dy * f; b.x += dx * f; b.y += dy * f;
      }
      links.forEach(([pi, ti]) => { const a = nodes[pi], b = nodes[ti]; const dx = b.x - a.x, dy = b.y - a.y; const d = Math.sqrt(dx * dx + dy * dy) || 1; const f = (d - 62) * 0.02; a.x += (dx / d) * f; a.y += (dy / d) * f; if (b.kind === 't') { b.x -= (dx / d) * f * 0.3; b.y -= (dy / d) * f * 0.3; } });
      nodes.forEach((n) => { n.x += (cx - n.x) * 0.006; n.y += (cy - n.y) * 0.006; n.x = Math.max(n.r + 4, Math.min(W - n.r - 4, n.x)); n.y = Math.max(n.r + 4, Math.min(H - n.r - 14, n.y)); });
    }
    const xs = nodes.map((n) => [n.x - n.r, n.x + n.r]).flat(), ys = nodes.map((n) => [n.y - n.r, n.y + n.r + 12]).flat();
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const k = Math.min((W - 16) / (x1 - x0 || 1), (H - 16) / (y1 - y0 || 1), 1.8);
    nodes.forEach((n) => { n.x = W / 2 + (n.x - (x0 + x1) / 2) * k; n.y = H / 2 + (n.y - (y0 + y1) / 2) * k; });
    nodes.forEach((n) => { if (n.kind === 't') { const longest = Math.max(...n.label.split(' ').map((w) => w.length)); n.fs = Math.min(11, (2 * n.r - 6) / (longest * 0.58)).toFixed(1); } });
    const f = ui.webFocus; const lit = new Set();
    if (f) { lit.add(f); links.forEach(([pi, ti]) => { const a = nodes[pi].id, b = nodes[ti].id; if (a === f || b === f) { lit.add(a); lit.add(b); } }); }
    const dim = (id) => (f && !lit.has(id) ? 'web-dim' : '');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="connection web">
      ${links.map(([pi, ti]) => { const a = nodes[pi], b = nodes[ti]; const on = f && (a.id === f || b.id === f); return `<line class="web-edge ${on ? 'hl' : f ? 'web-dim' : ''}" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"/>`; }).join('')}
      ${nodes.map((n) => (n.kind === 't'
        ? `<g class="web-node web-node-topic ${dim(n.id)}" data-action="web-focus" data-id="${esc(n.id)}"><circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${n.r.toFixed(1)}" ${f === n.id ? 'stroke="#ffc23d" stroke-width="3"' : ''}/>${n.label.split(' ').length > 1 ? n.label.split(' ').map((w, k, arr) => `<text x="${n.x.toFixed(1)}" y="${(n.y + (k - (arr.length - 1) / 2) * 12 + 4).toFixed(1)}" text-anchor="middle" style="font-size:${n.fs}px">${esc(w)}</text>`).join('') : `<text x="${n.x.toFixed(1)}" y="${(n.y + 4).toFixed(1)}" text-anchor="middle" style="font-size:${n.fs}px">${esc(n.label)}</text>`}</g>`
        : `<g class="web-node web-node-person ${dim(n.id)}" data-action="web-focus" data-id="${n.id}"><circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${n.r}" fill="${persona(n.p).color}" ${n.p.status === 'want' ? `fill-opacity=".25" stroke="${persona(n.p).color}" stroke-width="2"` : 'stroke="#fff" stroke-width="2"'}/><text x="${n.x.toFixed(1)}" y="${(n.y + n.r + 11).toFixed(1)}" text-anchor="middle">${esc(n.label)}</text></g>`)).join('')}
    </svg>`;
  }
  function viewConnect() {
    let body = '';
    if (ui.connectSeg === 'web') {
      const f = ui.webFocus; let panel = '';
      if (f && f.startsWith('t:')) {
        const t = f.slice(2); const ppl = state.people.filter((p) => p.topics.includes(t));
        panel = `<div class="card"><div class="row between"><h3>${esc(t)}</h3><span class="chip">${ppl.length} people</span></div>
          <p class="small muted" style="margin-bottom:10px">${ppl.filter((p) => p.status === 'met').length} met, ${ppl.filter((p) => p.status === 'want').length} still to meet</p>
          ${ppl.map((p) => personRow(p)).join('')}
          <div class="row" style="gap:8px"><button class="btn sm" data-action="topic-bof" data-topic="${esc(t)}">start a bof on ${esc(t)}</button><button class="btn secondary sm" data-action="topic-groups" data-topic="${esc(t)}">make small groups</button></div></div>`;
      } else if (f) {
        const p = personById(f); if (p) panel = `${personRow(p, `<span class="chip">${p.topics.length} topics</span>`)}`;
      }
      body = `<p class="page-sub" style="margin-top:-4px">subjects in blue. people are colored by persona; solid = met, outline = still to meet. tap anything to focus.</p>
        <div class="web-wrap">${webSvg()}</div>
        <div class="legend">${Object.values(PERSONAS).map((p) => `<span><i style="background:${p.color};border-radius:50%"></i>${p.label}</span>`).join('')}</div>
        ${f ? '<button class="btn ghost sm" data-action="web-focus" data-id="">clear focus</button>' : ''}${panel}`;
    } else if (ui.connectSeg === 'match') {
      const sug = suggestions(); const ints = intros();
      body = `<div class="card tight small muted">ranked by shared interests (${esc(state.me.interests.join(', '))}), your goals, priority, and how many of your contacts they connect to. <button class="btn ghost sm" data-action="open-settings">edit interests</button></div>
        <h2 class="section">who should i meet <small>${sug.length}</small></h2>
        ${sug.map((x) => `<button class="list-item" data-action="person" data-id="${x.p.id}">${avatar(x.p)}<div class="grow"><span class="name">${esc(x.p.name)}</span>
          <div class="sub">${esc([x.p.role, x.p.company].filter(Boolean).join(' · '))}</div><div class="chips" style="margin-top:5px">${x.reasons.map((r) => `<span class="chip">${esc(r)}</span>`).join('')}</div></div>
          <span class="match-score">${x.score}</span></button>`).join('') || '<div class="card empty"><b>to-meet list is empty</b>add people with status "to meet".</div>'}
        <h2 class="section">intros you could make <small>${ints.length}</small></h2>
        ${ints.map((x) => `<div class="card tight"><div class="row">${avatar(x.a)}<span style="font-weight:700;color:var(--blue)">↔</span>${avatar(x.b)}
          <div class="grow"><b>${esc(first(x.a.name))} & ${esc(first(x.b.name))}</b><div class="small muted">both into ${esc(x.shared.join(', '))}</div></div>
          <button class="btn secondary sm" data-action="copy-intro" data-a="${x.a.id}" data-b="${x.b.id}">copy intro</button></div></div>`).join('') || '<div class="card empty">log a few more people to see intros.</div>'}`;
    } else {
      const pool = state.people.filter((p) => ui.groupPool === 'all' || p.status === ui.groupPool).filter((p) => !ui.groupTopic || p.topics.includes(ui.groupTopic));
      const groups = pool.length >= 2 ? buildGroups(pool, ui.groupSize, ui.groupSeed) : [];
      const colors = ['#0c2bd8', '#18c39a', '#ff5a4e', '#8b5cf6', '#3fb6ff', '#e09a00'];
      body = `<div class="card"><div class="row between"><b>group size</b><div class="stepper"><button data-action="group-size" data-d="-1">−</button><b style="min-width:20px;text-align:center">${ui.groupSize}</b><button data-action="group-size" data-d="1">+</button></div></div>
        <div class="row wrap" style="margin-top:10px;gap:6px">${[['all', 'everyone'], ['met', 'people i met'], ['want', 'to meet']].map(([v, l]) => `<button class="chip ${ui.groupPool === v ? 'on' : ''}" data-action="group-pool" data-val="${v}">${l}</button>`).join('')}
        ${ui.groupTopic ? `<button class="chip on" data-action="group-topic-clear">topic: ${esc(ui.groupTopic)} ✕</button>` : ''}</div>
        <button class="btn secondary sm" style="margin-top:12px" data-action="group-shuffle">shuffle groups</button></div>
        <p class="small muted" style="margin:0 2px 10px">${pool.length} people → ${groups.length} groups, clustered by shared subject.</p>
        ${groups.map((g, i) => `<div class="card group-card" style="--gc:${colors[i % colors.length]}"><div class="row between"><h3>group ${i + 1} · ${esc(g.topic)}</h3><span class="chip">${g.members.length}</span></div>
          <div class="chips" style="margin:8px 0">${g.members.map((p) => `<button class="chip" data-action="person" data-id="${p.id}">${esc(p.name)}</button>`).join('')}</div>
          <p class="small muted">conversation starter: “${esc(g.prompt)}”</p>
          <div class="row" style="gap:6px;margin-top:10px"><button class="btn sm" data-action="group-bof" data-i="${i}">schedule as bof</button><button class="btn ghost sm" data-action="group-copy" data-i="${i}">copy</button></div></div>`).join('') || '<div class="card empty">need at least 2 people.</div>'}`;
      ui._groups = groups;
    }
    return `<h1 class="page-title">connect</h1><p class="page-sub">see who connects to what, and plan who to bring together.</p>
      ${seg('connectSeg', [['web', 'connection web'], ['match', 'who to meet'], ['groups', 'small groups']])}${body}`;
  }

  // pitch timer
  const timer = { running: false, remaining: state.pitchSeconds, endAt: 0, iv: null, warned: false, buzzed: false };
  let audio;
  function beep(freq, dur) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = freq; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.2, audio.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur); o.start(); o.stop(audio.currentTime + dur);
    } catch { /* audio not available */ }
  }
  const clockText = (r) => { const neg = r < 0; const s = Math.ceil(Math.abs(r) - (neg ? 0.999 : 0)); return `${neg ? '+' : ''}${Math.floor(s / 60)}:${pad(s % 60)}`; };
  function tick() {
    if (timer.running) timer.remaining = (timer.endAt - Date.now()) / 1000;
    if (timer.running && timer.remaining <= 15 && !timer.warned) { timer.warned = true; beep(660, 0.15); }
    if (timer.running && timer.remaining <= 0 && !timer.buzzed) { timer.buzzed = true; beep(440, 0.7); }
    const stage = $('#pitch-stage'); if (!stage) return;
    $('#clock').textContent = clockText(timer.remaining);
    const frac = Math.max(0, timer.remaining / state.pitchSeconds);
    $('#ring-fg').setAttribute('stroke-dashoffset', String(2 * Math.PI * 100 * (1 - frac)));
    stage.classList.toggle('hurry', timer.remaining <= 15 && timer.remaining > 0);
    stage.classList.toggle('over', timer.remaining <= 0);
    $('#timer-toggle').textContent = timer.running ? 'pause' : timer.remaining < state.pitchSeconds ? 'resume' : 'start 2:00';
  }
  function startTimer() { timer.running = true; timer.endAt = Date.now() + timer.remaining * 1000; clearInterval(timer.iv); timer.iv = setInterval(tick, 200); tick(); }
  function pauseTimer() { timer.running = false; clearInterval(timer.iv); tick(); }
  function resetTimer() { pauseTimer(); timer.remaining = state.pitchSeconds; timer.warned = false; timer.buzzed = false; tick(); }

  function viewPitch() {
    const queue = state.pitches.filter((p) => !p.done); const done = state.pitches.filter((p) => p.done);
    const cur = queue[0]; const C = 2 * Math.PI * 100;
    return `<h1 class="page-title">pitch fest</h1><p class="page-sub">two minutes each. pitch, then go talk to whoever lit up.</p>
      <div class="pitch-stage" id="pitch-stage">
        <div class="pitch-now">${cur ? 'now pitching' : 'queue empty'}</div>
        <div class="pitch-name">${cur ? esc(cur.name) : 'add a pitcher below'}</div>
        <div class="pitch-idea">${cur ? esc(cur.idea) : '&nbsp;'}</div>
        <div class="ring"><svg viewBox="0 0 230 230"><circle cx="115" cy="115" r="100" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="14"/>
          <circle id="ring-fg" cx="115" cy="115" r="100" fill="none" stroke="#ff5a4e" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
          <div class="clock" id="clock">2:00</div></div>
        <div class="pitch-controls">
          <button class="btn coral" id="timer-toggle" data-action="timer-toggle">start 2:00</button>
          <button class="btn secondary" data-action="timer-reset">reset</button>
          <button class="btn secondary" data-action="timer-add">+30s</button>
        </div>
        <div class="pitch-controls" style="margin-top:10px">
          <button class="btn secondary" data-action="spark" ${cur ? '' : 'disabled'}>⚡ sparked a connection</button>
          <button class="btn secondary" data-action="pitch-next" ${cur ? '' : 'disabled'}>next pitcher →</button>
        </div>
      </div>
      <form class="card" data-form="add-pitch"><h3>add to the queue</h3>
        <div class="field-row"><div class="field"><label>who</label><input name="name" required placeholder="name" /></div>
        <div class="field"><label>the idea</label><input name="idea" required placeholder="one line" /></div></div>
        <button class="btn sm">add pitcher</button></form>
      <h2 class="section">up next <small>${Math.max(0, queue.length - 1)}</small></h2>
      ${queue.slice(1).map((p, i) => `<div class="card tight row"><span class="chip">${i + 2}</span><div class="grow"><b>${esc(p.name)}</b><div class="small muted">${esc(p.idea)}</div></div><button class="btn ghost sm" data-action="pitch-remove" data-id="${p.id}">remove</button></div>`).join('') || '<div class="card empty small">nobody else queued.</div>'}
      ${done.length ? `<h2 class="section">pitched <small>${done.length}</small></h2>${done.map((p) => `<div class="card tight"><div class="row between"><b>${esc(p.name)}</b><span class="chip ${p.sparked.length ? 'good' : ''}">${p.sparked.length} sparks</span></div><div class="small muted">${esc(p.idea)}</div>${p.sparked.length ? `<div class="chips" style="margin-top:6px">${p.sparked.map((id) => personById(id)).filter(Boolean).map((x) => `<button class="chip" data-action="person" data-id="${x.id}">${esc(x.name)}</button>`).join('')}</div>` : ''}</div>`).join('')}` : ''}
      <div class="card tight row" style="margin-top:12px"><span class="grow small muted">pitch length</span>${[60, 90, 120, 180].map((s) => `<button class="chip ${state.pitchSeconds === s ? 'on' : ''}" data-action="pitch-len" data-s="${s}">${s / 60}m</button>`).join('')}</div>`;
  }

  function viewReport() {
    if (ui.recapDay === null) ui.recapDay = currentDay();
    const md = ui.reportSeg === 'team' ? teamReport() : recap(ui.recapDay);
    ui._md = md;
    return `<h1 class="page-title">report</h1><p class="page-sub">share what you learned with ${esc(state.me.team)}.</p>
      ${seg('reportSeg', [['team', 'team report'], ['recap', 'end-of-day recap']])}
      ${ui.reportSeg === 'recap' ? dayPicker('recapDay') : `<label class="check card tight no-print"><input type="checkbox" data-action="toggle-personas" ${ui.reportPersonas ? 'checked' : ''}/> include persona summaries for each person</label>`}
      <div class="row wrap no-print" style="gap:8px;margin-bottom:12px">
        <button class="btn sm" data-action="report-copy">copy</button>
        <button class="btn secondary sm" data-action="report-download">download .md</button>
        <button class="btn secondary sm" data-action="report-email">email</button>
        <button class="btn secondary sm" data-action="report-print">print / pdf</button>
      </div>
      <div class="report">${md2html(md)}</div>`;
  }

  // ---------- sheets ----------
  function personDetail(id) {
    const p = personById(id); if (!p) return;
    const s = summary(p);
    openSheet(p.name, `
      <div class="row" style="margin-bottom:14px">${avatar(p, true)}<div class="grow"><div style="font-weight:600">${esc(p.role || '—')}</div><div class="muted">${esc(p.company || '')}</div>
        <div class="row wrap" style="gap:6px;margin-top:6px">${personaTag(p)}<span class="chip ${p.status === 'met' ? 'good' : 'warn'}">${p.status === 'met' ? `met day ${p.day + 1}` : 'to meet'}</span><span class="chip ${p.priority === 'hot' ? 'bad' : ''}">${p.priority}</span></div></div></div>
      <div class="card ${persona(p).cls}" style="border-top:5px solid var(--pc)"><h3>persona summary</h3><p style="margin-bottom:10px">${esc(s.headline)}</p>
        <dl class="kv"><dt>focus</dt><dd>${esc(s.focus)}</dd><dt>looking for</dt><dd>${esc(s.wants)}</dd><dt>you can offer</dt><dd>${esc(s.offer)}</dd>${p.metAt ? `<dt>met at</dt><dd>${esc(p.metAt)}</dd>` : ''}${p.notes ? `<dt>notes</dt><dd>${esc(p.notes)}</dd>` : ''}</dl>
        <p class="small" style="margin-top:10px;background:var(--blue-soft);padding:10px;border-radius:10px"><b>how to approach:</b> ${esc(s.approach)}</p></div>
      <div class="card"><h3>resources to share</h3>${s.resources.map((r, i) => `<div class="resource"><span class="ico">${i + 1}</span><div><b>${esc(r.title)}</b><div class="muted">${esc(r.desc)}</div></div></div>`).join('')}</div>
      <form class="card" data-form="followup" data-id="${p.id}"><h3>follow-up</h3>
        <div class="field"><label>next step</label><input name="action" value="${esc(p.followUp?.action)}" placeholder="e.g. send case study" /></div>
        <div class="field-row"><div class="field"><label>due</label><select name="due">${Array.from({ length: state.me.days + 3 }, (_, i) => `<option value="${i}" ${p.followUp?.due === i ? 'selected' : ''}>${i < state.me.days ? `day ${i + 1}` : `+${i - state.me.days + 1} after`} · ${esc(dayLabel(i))}</option>`).join('')}</select></div>
        <div class="field"><label>status</label><select name="done"><option value="0">open</option><option value="1" ${p.followUp?.done ? 'selected' : ''}>done</option></select></div></div>
        <label style="font-size:13px;font-weight:600;color:var(--muted)">message template (${esc(persona(p).label)})</label>
        <div class="template-box" style="margin:6px 0 10px">${esc(s.followup)}</div>
        <div class="row wrap" style="gap:6px"><button class="btn sm">save follow-up</button><button type="button" class="btn secondary sm" data-action="copy-followup" data-id="${p.id}">copy message</button></div></form>
      <div class="row wrap" style="gap:8px">
        ${p.status === 'want' ? `<button class="btn sm" data-action="mark-met" data-id="${p.id}">i met them</button>` : ''}
        <button class="btn secondary sm" data-action="book-1on1" data-id="${p.id}">book a 1:1</button>
        <button class="btn secondary sm" data-action="edit-person" data-id="${p.id}">edit</button>
        <button class="btn danger sm" data-action="delete-person" data-id="${p.id}">delete</button>
      </div>`);
  }
  function personForm(p, opts = {}) {
    const isNew = !p; p = p || { name: '', role: '', company: '', persona: 'client', topics: [], status: opts.status || 'met', priority: 'warm', lookingFor: '', canOffer: '', notes: '', metAt: opts.metAt || '', day: currentDay(), followUp: { action: '', due: Math.min(currentDay() + 1, state.me.days + 2), done: false } };
    const allTopics = [...new Set([...SUGGESTED_TOPICS, ...state.people.flatMap((x) => x.topics), ...state.me.interests])];
    openSheet(isNew ? (opts.title || 'log a person') : `edit ${p.name}`, `
      <form data-form="person" data-id="${isNew ? '' : p.id}" data-pitch="${opts.pitchId || ''}">
        <div class="field"><label>name *</label><input name="name" required value="${esc(p.name)}" placeholder="first last" data-autofocus /></div>
        <div class="field-row"><div class="field"><label>role</label><input name="role" value="${esc(p.role)}" /></div><div class="field"><label>company</label><input name="company" value="${esc(p.company)}" /></div></div>
        <div class="field"><label>persona</label><div class="chips">${Object.entries(PERSONAS).map(([k, ps]) => `<label class="chip ${p.persona === k ? 'on' : ''}" style="cursor:pointer"><input type="radio" name="persona" value="${k}" ${p.persona === k ? 'checked' : ''} hidden />${ps.label}</label>`).join('')}</div></div>
        <div class="field"><label>topics (tap or type, comma separated)</label><input name="topics" value="${esc(p.topics.join(', '))}" placeholder="ai & data, cloud" />
          <div class="chips" style="margin-top:6px">${allTopics.map((t) => `<button type="button" class="chip ${p.topics.includes(t) ? 'on' : ''}" data-action="toggle-topic" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
        <div class="field"><label>what they're looking for</label><input name="lookingFor" value="${esc(p.lookingFor)}" placeholder="their problem, in their words" /></div>
        <div class="field"><label>next step (follow-up)</label><input name="followAction" value="${esc(p.followUp?.action)}" placeholder="e.g. send the case study" /></div>
        <details ${isNew ? '' : 'open'}><summary class="small muted" style="cursor:pointer;margin-bottom:10px">more details</summary>
          <div class="field-row"><div class="field"><label>status</label><select name="status"><option value="met" ${p.status === 'met' ? 'selected' : ''}>met</option><option value="want" ${p.status === 'want' ? 'selected' : ''}>want to meet</option></select></div>
          <div class="field"><label>priority</label><select name="priority">${['hot', 'warm', 'cold'].map((x) => `<option ${p.priority === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>
          <div class="field-row"><div class="field"><label>met where</label><input name="metAt" value="${esc(p.metAt)}" /></div><div class="field"><label>day met</label><select name="day">${Array.from({ length: state.me.days }, (_, i) => `<option value="${i}" ${p.day === i ? 'selected' : ''}>day ${i + 1}</option>`).join('')}</select></div></div>
          <div class="field"><label>what i can offer them</label><input name="canOffer" value="${esc(p.canOffer)}" /></div>
          <div class="field"><label>notes</label><textarea name="notes">${esc(p.notes)}</textarea></div>
        </details>
        <button class="btn block">${isNew ? 'save' : 'save changes'}</button>
      </form>`);
  }
  function sessionForm(s, defaults = {}) {
    const isNew = !s;
    s = s || { type: defaults.type || 'session', title: defaults.title || '', day: defaults.day ?? ui.day ?? currentDay(), start: defaults.start || '09:00', end: defaults.end || fromMin(toMin(defaults.start || '09:00') + (defaults.type === 'work' ? 60 : 45)), location: '', topic: defaults.topic || '', status: 'going', notes: '', attendees: defaults.attendees || [] };
    openSheet(isNew ? 'add to agenda' : 'edit', `
      <form data-form="session" data-id="${isNew ? '' : s.id}" data-attendees="${esc(s.attendees.join(','))}">
        <div class="field"><label>type</label><div class="chips">${Object.entries(TYPES).map(([k, t]) => `<label class="chip ${s.type === k ? 'on' : ''}" style="cursor:pointer"><input type="radio" name="type" value="${k}" ${s.type === k ? 'checked' : ''} hidden />${t.label}</label>`).join('')}</div></div>
        <div class="field"><label>title *</label><input name="title" required value="${esc(s.title)}" data-autofocus /></div>
        <div class="field"><label>day</label><select name="day">${Array.from({ length: state.me.days }, (_, i) => `<option value="${i}" ${s.day === i ? 'selected' : ''}>day ${i + 1} · ${esc(dayLabel(i))}</option>`).join('')}</select></div>
        <div class="field-row"><div class="field"><label>start</label><input type="time" name="start" value="${s.start}" required step="300" /></div><div class="field"><label>end</label><input type="time" name="end" value="${s.end}" required step="300" /></div></div>
        <div class="field-row"><div class="field"><label>location</label><input name="location" value="${esc(s.location)}" /></div><div class="field"><label>status</label><select name="status"><option value="going">going</option><option value="maybe" ${s.status === 'maybe' ? 'selected' : ''}>maybe</option></select></div></div>
        <div class="field"><label>topic (for bof)</label><input name="topic" value="${esc(s.topic)}" /></div>
        <div class="field"><label>notes</label><textarea name="notes">${esc(s.notes)}</textarea></div>
        <button class="btn block">${isNew ? 'add' : 'save'}</button>
      </form>`);
  }
  function sessionDetail(id) {
    const s = sessionById(id); if (!s) return;
    const { conflicts } = analyzeDay(s.day);
    const people = s.attendees.map(personById).filter(Boolean);
    const others = state.people.filter((p) => !s.attendees.includes(p.id));
    openSheet(s.title, `
      <div class="row wrap" style="gap:6px;margin-bottom:12px"><span class="chip" style="background:${TYPES[s.type].color};color:#fff">${TYPES[s.type].label}</span><span class="chip">day ${s.day + 1} · ${fmtTime(s.start)}–${fmtTime(s.end)}</span>${s.location ? `<span class="chip">${esc(s.location)}</span>` : ''}${conflicts.has(s.id) ? '<span class="chip bad">conflict</span>' : ''}${s.topic ? `<span class="chip good">${esc(s.topic)}</span>` : ''}</div>
      <div class="card"><div class="row between"><h3>people here</h3><span class="chip">${people.length}</span></div>
        ${people.map((p) => `<div class="row" style="padding:6px 0">${avatar(p)}<div class="grow" data-action="person" data-id="${p.id}" style="cursor:pointer"><b>${esc(p.name)}</b><div class="small muted">${esc(p.company)}</div></div><button class="btn ghost sm" data-action="unlink" data-sid="${s.id}" data-pid="${p.id}">remove</button></div>`).join('') || '<p class="small muted">no one linked yet.</p>'}
        <div class="row" style="margin-top:10px"><select id="link-person" class="search" style="margin:0"><option value="">link someone…</option>${others.map((p) => `<option value="${p.id}">${esc(p.name)}${p.company ? ` (${esc(p.company)})` : ''}</option>`).join('')}</select><button class="btn sm" data-action="link" data-sid="${s.id}">link</button></div>
        <button class="btn ghost sm" style="margin-top:6px" data-action="add-person-at" data-sid="${s.id}">+ log someone new here</button></div>
      <form class="card" data-form="session-notes" data-id="${s.id}">
        <div class="field"><label>${s.type === 'bof' ? 'discussion notes' : 'notes'}</label><textarea name="notes">${esc(s.notes)}</textarea></div>
        <div class="field"><label>takeaways (one per line, goes in your report)</label><textarea name="takeaways">${esc(s.takeaways)}</textarea></div>
        <button class="btn sm">save notes</button></form>
      <div class="row wrap" style="gap:8px">
        <button class="btn secondary sm" data-action="toggle-going" data-id="${s.id}">${s.status === 'going' ? 'mark as maybe' : 'mark as going'}</button>
        <button class="btn secondary sm" data-action="export-one" data-id="${s.id}">add to calendar</button>
        <button class="btn secondary sm" data-action="edit-session" data-id="${s.id}">edit</button>
        <button class="btn danger sm" data-action="delete-session" data-id="${s.id}">delete</button></div>`);
  }
  function settingsSheet() {
    const m = state.me;
    openSheet('me & event', `
      <form data-form="settings">
        <div class="field-row"><div class="field"><label>my name</label><input name="name" value="${esc(m.name)}" /></div><div class="field"><label>my team (for reports)</label><input name="team" value="${esc(m.team)}" /></div></div>
        <div class="field"><label>my interests (drives matching)</label><input name="interests" value="${esc(m.interests.join(', '))}" /></div>
        <div class="field-row"><div class="field"><label>event name</label><input name="eventName" value="${esc(m.eventName)}" /></div><div class="field"><label>first day</label><input type="date" name="eventStart" value="${m.eventStart}" /></div></div>
        <div class="field-row"><div class="field"><label>days</label><input type="number" min="1" max="7" name="days" value="${m.days}" /></div><div class="field"><label>day hours</label><div class="row"><input type="time" name="dayStart" value="${m.dayStart}" /><input type="time" name="dayEnd" value="${m.dayEnd}" /></div></div></div>
        <button class="btn block">save</button></form>
      <div class="card" style="margin-top:14px"><h3>your data</h3><p class="small muted" style="margin-bottom:10px">everything stays on this device (browser storage). back it up or move it to another device with export / import.</p>
        <div class="row wrap" style="gap:8px"><button class="btn secondary sm" data-action="export-json">export</button><button class="btn secondary sm" data-action="import-json">import</button>
        <button class="btn secondary sm" data-action="reset-demo">reset to demo data</button><button class="btn danger sm" data-action="clear-all">start fresh (empty)</button></div>
        <input type="file" id="json-file" accept="application/json,.json" hidden /></div>`);
  }
  function goalsSheet() {
    openSheet('my goals', `<form data-form="goals">${state.goals.map((g) => `<div class="card tight"><div class="field"><label>${g.auto ? 'goal (auto-tracked)' : 'goal (tracked by hand)'}</label><input name="text-${g.id}" value="${esc(g.text)}" /></div>
      <div class="row between"><div class="field" style="margin:0;max-width:120px"><label>target</label><input type="number" min="1" name="target-${g.id}" value="${g.target}" /></div><button type="button" class="btn ghost sm" data-action="del-goal" data-id="${g.id}">remove</button></div></div>`).join('')}
      <div class="card tight"><div class="field"><label>new goal (tracked by hand)</label><input name="newText" placeholder="e.g. find 2 pursuit partners" /></div><div class="field" style="max-width:120px"><label>target</label><input type="number" min="1" name="newTarget" value="3" /></div></div>
      <button class="btn block">save goals</button></form>`);
  }

  // ---------- render ----------
  function render() {
    $('#tabbar').innerHTML = TABS.map(([k, l]) => `<button class="tab ${ui.tab === k ? 'active' : ''}" data-action="go" data-tab="${k}"><span class="tab-ico">${I[k]}</span>${l}</button>`).join('');
    const views = { today: viewToday, people: viewPeople, agenda: viewAgenda, connect: viewConnect, pitch: viewPitch, report: viewReport };
    $('#view').innerHTML = views[ui.tab]();
    if (ui.tab === 'pitch') tick();
  }
  const go = (tab) => { ui.tab = tab; render(); window.scrollTo(0, 0); };

  // ---------- actions ----------
  const A = {
    go: (el) => go(el.dataset.tab),
    seg: (el) => { ui[el.dataset.key] = el.dataset.val; render(); },
    'pick-day': (el) => { ui[el.dataset.key] = Number(el.dataset.day); render(); },
    'go-followups': () => { ui.peopleSeg = 'follow'; go('people'); },
    'go-connect': (el) => { ui.connectSeg = el.dataset.seg; go('connect'); },
    'go-recap': () => { ui.reportSeg = 'recap'; ui.recapDay = currentDay(); go('report'); },
    'open-settings': settingsSheet,
    'close-sheet': closeSheet,
    'close-sheet-bg': (el, e) => { if (e.target === el) closeSheet(); },
    'persona-filter': (el) => { ui.personaFilter = el.dataset.val; render(); },
    'add-person': () => personForm(null),
    'add-person-at': (el) => { const s = sessionById(el.dataset.sid); personForm(null, { metAt: s.title, sessionId: s.id }); ui._linkSession = s.id; },
    person: (el) => personDetail(el.dataset.id),
    'edit-person': (el) => personForm(personById(el.dataset.id)),
    'delete-person': (el) => {
      const p = personById(el.dataset.id); if (!confirm(`delete ${p.name}?`)) return;
      state.people = state.people.filter((x) => x.id !== p.id);
      state.sessions.forEach((s) => { s.attendees = s.attendees.filter((id) => id !== p.id); });
      state.pitches.forEach((x) => { x.sparked = x.sparked.filter((id) => id !== p.id); });
      save(); closeSheet(); render(); toast('deleted');
    },
    'mark-met': (el) => { const p = personById(el.dataset.id); p.status = 'met'; p.day = currentDay(); save(); personDetail(p.id); render(); toast(`met ${first(p.name)} ✓`); },
    'toggle-followup': (el) => { const p = personById(el.dataset.id); p.followUp.done = !p.followUp.done; save(); render(); toast(p.followUp.done ? 'follow-up done' : 'reopened'); },
    'copy-followup': (el) => copy(summary(personById(el.dataset.id)).followup, 'message copied'),
    'book-1on1': (el) => {
      const p = personById(el.dataset.id); let day = currentDay(); let slot = null;
      for (; day < state.me.days && !(slot = nextFreeSlot(day)); day++);
      closeSheet();
      sessionForm(null, { type: 'meeting', title: `1:1 with ${p.name}`, day: slot ? day : currentDay(), start: slot?.start || '12:00', end: slot?.end, attendees: [p.id] });
      if (slot) toast(`first free slot: day ${day + 1} ${fmtTime(slot.start)}`);
    },
    'toggle-topic': (el) => {
      const input = el.closest('form').elements.topics; const ts = parseTopics(input.value); const t = el.dataset.t;
      const i = ts.indexOf(t); if (i >= 0) ts.splice(i, 1); else ts.push(t);
      input.value = ts.join(', '); el.classList.toggle('on', i < 0);
    },
    session: (el) => sessionDetail(el.dataset.id),
    'add-session': (el) => sessionForm(null, { day: el.dataset.day !== undefined ? Number(el.dataset.day) : ui.day, start: el.dataset.start, end: el.dataset.end, type: el.dataset.type }),
    'edit-session': (el) => sessionForm(sessionById(el.dataset.id)),
    'delete-session': (el) => { if (!confirm('delete this item?')) return; state.sessions = state.sessions.filter((s) => s.id !== el.dataset.id); save(); closeSheet(); render(); toast('deleted'); },
    'toggle-going': (el) => { const s = sessionById(el.dataset.id); s.status = s.status === 'going' ? 'maybe' : 'going'; save(); sessionDetail(s.id); render(); },
    link: (el) => { const v = $('#link-person').value; if (!v) return; const s = sessionById(el.dataset.sid); s.attendees.push(v); save(); sessionDetail(s.id); render(); },
    unlink: (el) => { const s = sessionById(el.dataset.sid); s.attendees = s.attendees.filter((x) => x !== el.dataset.pid); save(); sessionDetail(s.id); render(); },
    'export-one': (el) => { const s = sessionById(el.dataset.id); download(`${s.title.replace(/[^a-z0-9]+/gi, '-')}.ics`, ics([s]), 'text/calendar'); toast('calendar file downloaded'); },
    'export-day': () => { const items = dayItems(ui.day).filter((s) => s.status === 'going' && s.type !== 'work'); download(`${state.me.eventName}-day-${ui.day + 1}.ics`, ics(items), 'text/calendar'); toast(`${items.length} events exported`); },
    'import-ics': () => $('#ics-file').click(),
    vote: (el) => { const t = state.bofTopics.find((x) => x.id === el.dataset.id); t.voted = !t.voted; t.votes += t.voted ? 1 : -1; save(); render(); },
    'schedule-bof': (el) => { const t = state.bofTopics.find((x) => x.id === el.dataset.id); const slot = nextFreeSlot(ui.day ?? currentDay(), 45); sessionForm(null, { type: 'bof', title: t.title, day: ui.day ?? currentDay(), start: slot?.start, end: slot?.end }); },
    'web-focus': (el) => { const id = el.dataset.id; if (id && ui.webFocus === id && !id.startsWith('t:')) { personDetail(id); return; } ui.webFocus = id && ui.webFocus !== id ? id : null; render(); },
    'topic-bof': (el) => { const t = el.dataset.topic; const ppl = state.people.filter((p) => p.topics.includes(t) && p.status === 'met').map((p) => p.id); const slot = nextFreeSlot(currentDay(), 45); sessionForm(null, { type: 'bof', title: `${t} circle`, topic: t, day: currentDay(), start: slot?.start, end: slot?.end, attendees: ppl }); },
    'topic-groups': (el) => { ui.groupTopic = el.dataset.topic; ui.connectSeg = 'groups'; render(); },
    'group-topic-clear': () => { ui.groupTopic = null; render(); },
    'group-size': (el) => { ui.groupSize = Math.max(2, Math.min(8, ui.groupSize + Number(el.dataset.d))); render(); },
    'group-pool': (el) => { ui.groupPool = el.dataset.val; render(); },
    'group-shuffle': () => { ui.groupSeed++; render(); },
    'group-bof': (el) => { const g = ui._groups[Number(el.dataset.i)]; const slot = nextFreeSlot(currentDay(), 45); sessionForm(null, { type: 'bof', title: `${g.topic} small group`, topic: g.topic === 'open mix' ? '' : g.topic, day: currentDay(), start: slot?.start, end: slot?.end, attendees: g.members.map((p) => p.id) }); },
    'group-copy': (el) => { const g = ui._groups[Number(el.dataset.i)]; copy(`${g.topic} group: ${g.members.map((p) => p.name).join(', ')}\nconversation starter: ${g.prompt}`); },
    'copy-intro': (el) => { const a = personById(el.dataset.a), b = personById(el.dataset.b); const sh = a.topics.filter((t) => b.topics.includes(t)); copy(`${first(a.name)}, meet ${first(b.name)} (${b.role}, ${b.company}). ${first(b.name)}, meet ${first(a.name)} (${a.role}, ${a.company}).\n\nyou're both deep in ${sh.join(' and ')}${a.lookingFor ? `, and ${first(a.name)} is looking for ${a.lookingFor}` : ''}. thought you should talk. i'll let you take it from here!\n\n${state.me.name}`, 'intro copied'); },
    'timer-toggle': () => { if (timer.running) pauseTimer(); else startTimer(); },
    'timer-reset': resetTimer,
    'timer-add': () => { timer.remaining += 30; if (timer.running) timer.endAt += 30000; if (timer.remaining > 15) timer.warned = false; if (timer.remaining > 0) timer.buzzed = false; tick(); },
    'pitch-next': () => { const cur = state.pitches.find((p) => !p.done); if (cur) cur.done = true; save(); resetTimer(); render(); },
    'pitch-remove': (el) => { state.pitches = state.pitches.filter((p) => p.id !== el.dataset.id); save(); render(); },
    'pitch-len': (el) => { state.pitchSeconds = Number(el.dataset.s); save(); resetTimer(); render(); },
    spark: () => { const cur = state.pitches.find((p) => !p.done); personForm(null, { title: '⚡ sparked connection', metAt: `pitch fest: ${cur.idea}`, pitchId: cur.id }); },
    'goal-step': (el) => { const g = state.goals.find((x) => x.id === el.dataset.id); g.count = Math.max(0, (g.count || 0) + Number(el.dataset.d)); save(); render(); },
    'edit-goals': goalsSheet,
    'del-goal': (el) => { state.goals = state.goals.filter((g) => g.id !== el.dataset.id); save(); goalsSheet(); render(); },
    'toggle-personas': () => { ui.reportPersonas = !ui.reportPersonas; render(); },
    'report-copy': () => copy(ui._md, 'report copied (markdown)'),
    'report-download': () => download(`${state.me.eventName}-${ui.reportSeg === 'team' ? 'team-report' : `recap-day-${ui.recapDay + 1}`}.md`, ui._md, 'text/markdown'),
    'report-email': () => { const subj = ui.reportSeg === 'team' ? `${state.me.eventName} networking report` : `${state.me.eventName} day ${ui.recapDay + 1} recap`; location.href = `mailto:?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(ui._md.slice(0, 1800))}`; },
    'report-print': () => window.print(),
    'export-json': () => download(`r4-networking-backup-${isoOf(new Date())}.json`, JSON.stringify(state, null, 2), 'application/json'),
    'import-json': () => $('#json-file').click(),
    'reset-demo': () => { if (!confirm('replace everything with demo data?')) return; state = seed(); save(); closeSheet(); resetTimer(); render(); toast('demo data loaded'); },
    'clear-all': () => {
      if (!confirm('start fresh? this clears all people, sessions and pitches.')) return;
      const me = state.me; const goals = seed().goals; state = { ...seed(), me, goals, people: [], sessions: [], bofTopics: [], pitches: [] };
      save(); closeSheet(); render(); toast('cleared');
    },
  };

  // ---------- forms ----------
  const F = {
    person: (fd, form) => {
      const id = form.dataset.id; const isNew = !id;
      const p = isNew ? { id: uid(), createdAt: Date.now(), followUp: { action: '', due: currentDay() + 1, done: false } } : personById(id);
      Object.assign(p, {
        name: fd.get('name').trim(),
        role: fd.get('role').trim(), company: fd.get('company').trim(), persona: fd.get('persona') || 'peer', topics: parseTopics(fd.get('topics')),
        lookingFor: fd.get('lookingFor').trim(), status: fd.get('status'), priority: fd.get('priority'), metAt: fd.get('metAt').trim(),
        day: Number(fd.get('day')), canOffer: fd.get('canOffer').trim(), notes: fd.get('notes').trim(),
      });
      p.followUp = { ...p.followUp, action: fd.get('followAction').trim() };
      if (isNew) state.people.unshift(p);
      if (isNew && form.dataset.pitch) { const pitch = state.pitches.find((x) => x.id === form.dataset.pitch); pitch?.sparked.push(p.id); }
      if (isNew && ui._linkSession) { sessionById(ui._linkSession)?.attendees.push(p.id); }
      const linked = ui._linkSession; ui._linkSession = null;
      save(); render();
      if (linked) sessionDetail(linked); else personDetail(p.id);
      toast(isNew ? `${first(p.name)} saved` : 'saved');
    },
    followup: (fd, form) => { const p = personById(form.dataset.id); p.followUp = { action: fd.get('action').trim(), due: Number(fd.get('due')), done: fd.get('done') === '1' }; save(); render(); toast('follow-up saved'); },
    session: (fd, form) => {
      const id = form.dataset.id; const isNew = !id;
      if (toMin(fd.get('end')) <= toMin(fd.get('start'))) { toast('end time must be after start'); return; }
      const s = isNew ? { id: uid(), takeaways: '', attendees: form.dataset.attendees ? form.dataset.attendees.split(',').filter(Boolean) : [] } : sessionById(id);
      Object.assign(s, { type: fd.get('type'), title: fd.get('title').trim(), day: Number(fd.get('day')), start: fd.get('start'), end: fd.get('end'), location: fd.get('location').trim(), status: fd.get('status'), topic: fd.get('topic').trim().toLowerCase(), notes: fd.get('notes').trim() });
      if (isNew) state.sessions.push(s);
      save(); ui.day = s.day; render(); sessionDetail(s.id);
      const { conflicts } = analyzeDay(s.day);
      toast(conflicts.has(s.id) ? 'saved, but it conflicts with something' : 'added to agenda');
    },
    'session-notes': (fd, form) => { const s = sessionById(form.dataset.id); s.notes = fd.get('notes').trim(); s.takeaways = fd.get('takeaways').trim(); save(); render(); toast('notes saved'); },
    'propose-bof': (fd) => { state.bofTopics.push({ id: uid(), title: fd.get('title').trim().toLowerCase(), by: state.me.name, votes: 1, voted: true }); save(); render(); toast('topic proposed'); },
    'add-pitch': (fd) => { state.pitches.push({ id: uid(), name: fd.get('name').trim(), idea: fd.get('idea').trim(), done: false, sparked: [] }); save(); render(); toast('added to queue'); },
    settings: (fd) => {
      const days = Math.max(1, Math.min(7, Number(fd.get('days')) || 3));
      Object.assign(state.me, { name: fd.get('name').trim() || 'me', team: fd.get('team').trim() || 'my team', interests: parseTopics(fd.get('interests')), eventName: fd.get('eventName').trim() || 'r4', eventStart: fd.get('eventStart') || state.me.eventStart, days, dayStart: fd.get('dayStart') || '08:00', dayEnd: fd.get('dayEnd') || '18:00' });
      state.sessions.forEach((s) => { if (s.day >= days) s.day = days - 1; });
      ui.day = null; ui.recapDay = null;
      save(); closeSheet(); render(); toast('saved');
    },
    goals: (fd) => {
      state.goals.forEach((g) => { g.text = fd.get(`text-${g.id}`).trim() || g.text; g.target = Math.max(1, Number(fd.get(`target-${g.id}`)) || g.target); });
      if (fd.get('newText').trim()) state.goals.push({ id: uid(), text: fd.get('newText').trim(), target: Math.max(1, Number(fd.get('newTarget')) || 1), auto: '', count: 0 });
      save(); closeSheet(); render(); toast('goals saved');
    },
  };

  // ---------- events ----------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]'); if (!el) return;
    const fn = A[el.dataset.action]; if (!fn) return;
    if (el.tagName === 'BUTTON' && el.type === 'submit' && el.closest('form') && !el.dataset.action) return;
    if (el.dataset.action !== 'close-sheet-bg') e.preventDefault();
    fn(el, e);
  });
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-form]'); if (!form) return;
    e.preventDefault(); const fn = F[form.dataset.form]; if (fn) fn(new FormData(form), form);
  });
  document.addEventListener('input', (e) => {
    const key = e.target.dataset.input;
    if (key) { ui[key] = e.target.value; $('#people-list').innerHTML = peopleList(); }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.type === 'radio' && t.closest('.chips')) {
      t.closest('.chips').querySelectorAll('label.chip').forEach((l) => l.classList.toggle('on', l.contains(t)));
    }
    if (t.id === 'ics-file' && t.files[0]) {
      t.files[0].text().then((text) => {
        const evs = parseIcs(text); let added = 0;
        evs.forEach((ev) => {
          const day = Math.round((new Date(ev.start.getFullYear(), ev.start.getMonth(), ev.start.getDate()) - dayDate(0)) / 86400000);
          if (day < 0 || day >= state.me.days) return;
          const start = fromMin(ev.start.getHours() * 60 + ev.start.getMinutes());
          let endM = ev.end.getHours() * 60 + ev.end.getMinutes(); if (ev.end.getDate() !== ev.start.getDate()) endM = 23 * 60 + 55;
          if (state.sessions.some((s) => s.type === 'work' && s.day === day && s.start === start && s.title === ev.title)) return;
          state.sessions.push({ id: uid(), type: 'work', title: ev.title, day, start, end: fromMin(Math.max(endM, toMin(start) + 15)), location: ev.location, notes: 'imported from work calendar', takeaways: '', topic: '', attendees: [], status: 'going' });
          added++;
        });
        save(); render(); toast(added ? `${added} work events imported` : `no events found on conference days (${evs.length} in file)`);
      });
      t.value = '';
    }
    if (t.id === 'json-file' && t.files[0]) {
      t.files[0].text().then((text) => {
        try { const data = JSON.parse(text); if (!data.people || !data.sessions) throw new Error('bad file'); state = data; save(); closeSheet(); render(); toast('imported'); } catch { toast('that file doesn\'t look like a backup'); }
      });
      t.value = '';
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  render();
})();
