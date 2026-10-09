'use strict';
// Community backend: Supabase when configured (config.js or settings), otherwise a local demo
// with simulated attendees. Both adapters expose the same async API.
(() => {
  const CFG_KEY = 'r4-backend';
  const DEMO_KEY = 'r4-community-demo-v1';
  const H = 3600e3, D = 24 * H;
  const now = () => Date.now();
  const iso = (ms) => new Date(ms).toISOString();
  const rid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Math.random().toString(36).slice(2)}${now().toString(36)}`);
  const code6 = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
  const overlap = (a = [], b = []) => a.filter((x) => b.includes(x)).length;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const SPOTS = ['coffee bar by the main hall', 'registration desk', 'garden room terrace', 'lobby window seats', 'snack table, level 2'];
  const visible = (p) => new Date(p.expires_at).getTime() > now() - D || (p.reunion_at && now() < new Date(p.reunion_at).getTime() + 7 * D);
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => (v && k in v ? v[k] : m));

  function config() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch { saved = {}; }
    const c = window.R4_CONFIG || {};
    return { url: (saved.url || c.supabaseUrl || '').trim(), key: (saved.key || c.supabaseAnonKey || '').trim(), demo: !!saved.demo };
  }
  const setConfig = (c) => localStorage.setItem(CFG_KEY, JSON.stringify(c));

  // ---------- demo ----------
  const BOTS = [
    { name: 'maya chen', role: 'chief data officer', company: 'northwind health', topics: ['ai & data', 'healthcare'], looking_for: 'a path from ai pilots to production', can_offer: 'a seat at her ai council' },
    { name: 'david okafor', role: 'vp engineering', company: 'contoso bank', topics: ['cloud', 'ai & data', 'security'], looking_for: 'a platform team operating model', can_offer: 'a platform engineering playbook' },
    { name: 'priya raman', role: 'director, data & ai', company: 'slalom chicago', topics: ['ai & data', 'gtm & sales'], looking_for: 'a reusable genai accelerator', can_offer: 'her rag starter kit' },
    { name: 'luis ortega', role: 'partner development manager', company: 'aws', topics: ['cloud', 'gtm & sales'], looking_for: 'joint pursuits in financial services', can_offer: 'funding programs for pilots' },
    { name: 'hannah berg', role: 'consultant', company: 'slalom seattle', topics: ['cx & design', 'product'], looking_for: 'a product strategy mentor', can_offer: 'design research help' },
    { name: 'olivia grant', role: 'chief of staff to the ceo', company: 'fabrikam retail', topics: ['operating rhythm', 'org change'], looking_for: 'a better quarterly planning cadence', can_offer: 'her ceo staff meeting template' },
    { name: 'rafael souza', role: 'chief of staff, coo', company: 'woodgrove logistics', topics: ['operating rhythm', 'ai & data'], looking_for: 'ai tools for the exec office', can_offer: 'an okr review playbook' },
    { name: 'carmen díaz', role: 'chief of staff, cio office', company: 'contoso bank', topics: ['operating rhythm', 'security', 'ai & data'], looking_for: 'an ai adoption scorecard', can_offer: 'board update templates' },
    { name: 'sofia rossi', role: 'principal architect', company: 'snowflake', topics: ['ai & data', 'cloud'], looking_for: 'co-built industry data products', can_offer: 'reference architectures' },
    { name: 'tom becker', role: 'principal, org & change', company: 'slalom denver', topics: ['org change', 'product'], looking_for: 'change-readiness stories', can_offer: 'a change-readiness survey' },
    { name: 'aisha mohammed', role: 'director of customer experience', company: 'tailspin airlines', topics: ['cx & design', 'ai & data'], looking_for: 'ai in the contact center', can_offer: 'cx metrics that worked' },
    { name: 'kenji watanabe', role: 'founder', company: 'tidewater ai', topics: ['ai & data', 'product', 'gtm & sales'], looking_for: 'design partners', can_offer: 'early access to his agent platform' },
  ].map((b, i) => ({ id: `bot-${i + 1}`, persona: '', linkedin: '', discoverable: true, ...b }));
  const LINES = {
    greet: ['hi all! {name} here, {role} at {company}.', 'glad this exists. who is going to the next session?', 'happy to share my notes from this morning.', 'anyone up for coffee after this?'],
    reply: ['+1, count me in.', 'good point. we tried that last year and it worked.', 'let us pick this up over coffee.', 'can you share the link?'],
    question: ['how do you measure value in the first 90 days?', 'what would you do differently if you started again?', 'how do you get the board behind it?', 'what is the smallest team that can pull this off?'],
    line: ['saving a seat in row f if anyone wants it.', 'first time seeing her live!', 'what do you hope she talks about?', 'i brought extra phone chargers.'],
    intro: ['thanks for the intro, happy to meet.', 'count me in. when works?', 'great group. i will bring a story about {topic}.'],
  };

  function demoAdapter(opts) {
    const t = opts.t || fill;
    const ME = 'me';
    const subs = new Set();
    let db;
    try { db = JSON.parse(localStorage.getItem(DEMO_KEY)); } catch { db = null; }
    if (!db || db.v !== 1) db = seedDemo();
    function seedDemo() {
      const d = { v: 1, profiles: {}, pods: [], members: [], messages: [], votes: [], offers: [], roulette: [] };
      BOTS.forEach((b) => { d.profiles[b.id] = b; });
      const o = (b, kind, body, topics) => d.offers.push({ id: rid(), user_id: b.id, author: b.name, kind, body, topics, created_at: iso(now() - Math.random() * 6 * H), expires_at: iso(now() + 3 * D) });
      o(BOTS[2], 'give', 'a rag starter kit for regulated data', ['ai & data']);
      o(BOTS[0], 'ask', 'someone who has taken genai from pilot to production in healthcare', ['ai & data', 'healthcare']);
      o(BOTS[5], 'give', 'a ceo staff meeting template that cut meetings by a third', ['operating rhythm']);
      o(BOTS[6], 'ask', 'ai tools that actually help an exec office', ['operating rhythm', 'ai & data']);
      o(BOTS[3], 'give', 'aws funding programs for pilots', ['cloud']);
      o(BOTS[11], 'ask', '3 design partners for an agent platform', ['ai & data', 'product']);
      o(BOTS[4], 'give', 'an hour of design research help', ['cx & design']);
      return d;
    }
    const persist = () => localStorage.setItem(DEMO_KEY, JSON.stringify(db));
    const emit = (table) => { persist(); subs.forEach((f) => { try { f(table); } catch (e) { console.warn(e); } }); };
    const later = (ms, fn) => setTimeout(() => { fn(); emit('demo'); }, ms);
    const prof = (id) => db.profiles[id] || { id, name: '?' };
    const isMember = (podId, id = ME) => db.members.some((m) => m.pod_id === podId && m.user_id === id);
    const addMember = (podId, id, status = 'joined') => {
      const m = db.members.find((x) => x.pod_id === podId && x.user_id === id);
      if (m) { if (status === 'joined') m.status = 'joined'; return; }
      db.members.push({ pod_id: podId, user_id: id, status, joined_at: iso(now()) });
    };
    const say = (podId, id, body, kind = 'msg') => db.messages.push({ id: rid(), pod_id: podId, user_id: id, author: prof(id).name, kind, body, created_at: iso(now()) });
    const podView = (p) => ({ ...p, members: db.members.filter((m) => m.pod_id === p.id).map((m) => ({ user_id: m.user_id, status: m.status, profile: prof(m.user_id) })) });
    const byTopic = (topic, n, exclude = []) => BOTS.filter((b) => !exclude.includes(b.id))
      .map((b) => ({ b, s: (topic && b.topics.includes(topic) ? 2 : 0) + Math.random() })).sort((x, y) => y.s - x.s).slice(0, n).map((x) => x.b);
    function botsJoin(pod, n, kind) {
      const ids = db.members.filter((m) => m.pod_id === pod.id).map((m) => m.user_id);
      byTopic(pod.topic, n, ids).forEach((b, i) => later(900 + i * 1100, () => {
        addMember(pod.id, b.id);
        const lines = LINES[kind] || LINES.greet;
        say(pod.id, b.id, t(pick(lines), { name: b.name.split(' ')[0], role: b.role, company: b.company, topic: pod.topic || '' }), kind === 'question' ? 'question' : 'msg');
      }));
    }
    const mkPod = (o) => {
      const p = { id: rid(), code: code6(), kind: 'pod', room_key: null, topic: '', created_by: ME, created_at: iso(now()), expires_at: iso(now() + D), reunion_at: null, ...o };
      db.pods.push(p); return p;
    };
    return {
      mode: 'demo', me: ME,
      async upsertProfile(p) { db.profiles[ME] = { ...p, id: ME }; persist(); },
      async directory() { return Object.values(db.profiles).filter((p) => p.id !== ME); },
      async myPods() {
        return db.pods.filter((p) => isMember(p.id) && visible(p)).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(podView);
      },
      async createPod({ title, topic = '', hours = 24, reunionDays = 14, kind = 'pod' }) {
        const p = mkPod({ kind, title, topic, expires_at: iso(now() + Math.max(1, Math.min(96, hours)) * H), reunion_at: reunionDays > 0 ? iso(now() + reunionDays * D) : null });
        addMember(p.id, ME); emit('pods');
        if (kind === 'pod') botsJoin(p, 2 + Math.floor(Math.random() * 2), 'greet');
        return podView(p);
      },
      async joinPod(code) {
        const p = db.pods.find((x) => x.code === String(code).trim().toUpperCase() && new Date(x.expires_at).getTime() > now());
        if (!p) throw new Error('no open pod with that code');
        addMember(p.id, ME); emit('pod_members'); return podView(p);
      },
      async openRoom({ key, title, kind, expiresAt, topic = '' }) {
        let p = db.pods.find((x) => x.room_key === key);
        const fresh = !p;
        if (!p) p = mkPod({ kind, room_key: key, title, topic, expires_at: iso(Math.min(Math.max(expiresAt, now() + H), now() + 7 * D)) });
        addMember(p.id, ME); emit('pods');
        if (fresh) botsJoin(p, kind === 'line' ? 3 : 2, kind === 'line' ? 'line' : 'question');
        return podView(p);
      },
      async invite(podId, userIds) {
        userIds.forEach((id) => addMember(podId, id, 'invited')); emit('pod_members');
        userIds.filter((id) => id.startsWith('bot-')).forEach((id, i) => later(1500 + i * 1300, () => {
          addMember(podId, id); const p = db.pods.find((x) => x.id === podId);
          say(podId, id, t(pick(LINES.intro), { topic: p?.topic || '' }));
        }));
        return userIds.length;
      },
      async acceptInvite(podId) { addMember(podId, ME); emit('pod_members'); },
      async leavePod(podId) { db.members = db.members.filter((m) => !(m.pod_id === podId && m.user_id === ME)); emit('pod_members'); },
      async messages(podId) {
        return db.messages.filter((m) => m.pod_id === podId).map((m) => {
          const vs = db.votes.filter((v) => v.message_id === m.id);
          return { ...m, votes: vs.length, mine: vs.some((v) => v.user_id === ME) };
        });
      },
      async post(podId, body, kind = 'msg', author = '') {
        db.messages.push({ id: rid(), pod_id: podId, user_id: ME, author, kind, body, created_at: iso(now()) }); emit('messages');
        const others = db.members.filter((m) => m.pod_id === podId && m.user_id !== ME && m.status === 'joined').map((m) => m.user_id);
        const last = db.messages[db.messages.length - 1];
        if (others.length && kind === 'question') later(1800, () => { db.votes.push({ message_id: last.id, user_id: pick(others) }); });
        else if (others.length && Math.random() < 0.6) later(2000, () => say(podId, pick(others), t(pick(LINES.reply))));
      },
      async vote(messageId) {
        const i = db.votes.findIndex((v) => v.message_id === messageId && v.user_id === ME);
        if (i >= 0) db.votes.splice(i, 1); else db.votes.push({ message_id: messageId, user_id: ME });
        emit('votes');
      },
      async offers() { return db.offers.filter((o) => new Date(o.expires_at).getTime() > now()).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
      async addOffer({ kind, body, topics = [], author = '' }) {
        db.offers.push({ id: rid(), user_id: ME, author, kind, body, topics, created_at: iso(now()), expires_at: iso(now() + 3 * D) }); emit('offers');
      },
      async removeOffer(id) { db.offers = db.offers.filter((o) => !(o.id === id && o.user_id === ME)); emit('offers'); },
      async rouletteJoin(round, topics = []) {
        db.roulette = db.roulette.filter((r) => r.user_id !== ME);
        const row = { user_id: ME, round, topics, partner: null, spot: null, joined_at: iso(now()) };
        db.roulette.push(row); emit('roulette');
        later(2500, () => {
          const r = db.roulette.find((x) => x.user_id === ME && !x.partner); if (!r) return;
          const b = BOTS.map((x) => ({ x, s: overlap(x.topics, topics) + Math.random() })).sort((a, c) => c.s - a.s)[0].x;
          r.partner = b.id; r.spot = pick(SPOTS);
        });
        return row;
      },
      async rouletteMine() {
        const r = db.roulette.find((x) => x.user_id === ME); if (!r) return null;
        return { ...r, partnerProfile: r.partner ? prof(r.partner) : null };
      },
      async rouletteLeave() { db.roulette = db.roulette.filter((r) => r.user_id !== ME); emit('roulette'); },
      subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
      reset() { localStorage.removeItem(DEMO_KEY); db = seedDemo(); emit('reset'); },
      _db: () => db, _save: () => emit('debug'),
    };
  }

  // ---------- supabase ----------
  async function supabaseAdapter({ url, key }) {
    if (!window.supabase?.createClient) throw new Error('supabase library did not load');
    const sb = window.supabase.createClient(url, key, { auth: { persistSession: true, storageKey: 'r4-sb-auth', autoRefreshToken: true } });
    let { data: { session } } = await sb.auth.getSession();
    if (!session) {
      const { data, error } = await sb.auth.signInAnonymously();
      if (error) throw error;
      session = data.session;
    }
    const me = session.user.id;
    const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
    const mapPod = (p) => ({ ...p, members: (p.pod_members || []).map((m) => ({ user_id: m.user_id, status: m.status, profile: m.profiles || { name: '?' } })) });
    const POD_SELECT = '*, pod_members(user_id,status,profiles(id,name,role,company,topics,linkedin))';
    const getPod = async (id) => mapPod(ok(await sb.from('pods').select(POD_SELECT).eq('id', id).single()));
    return {
      mode: 'live', me,
      async upsertProfile(p) {
        ok(await sb.from('profiles').upsert({ id: me, name: p.name || '', role: p.role || '', company: p.company || '', linkedin: p.linkedin || '', persona: p.persona || '', topics: p.topics || [], looking_for: p.looking_for || '', can_offer: p.can_offer || '', discoverable: p.discoverable !== false, updated_at: new Date().toISOString() }));
      },
      async directory() { return ok(await sb.from('profiles').select('*').neq('id', me).order('updated_at', { ascending: false }).limit(300)); },
      async myPods() { return ok(await sb.from('pods').select(POD_SELECT).order('created_at', { ascending: false })).map(mapPod); },
      async createPod({ title, topic = '', hours = 24, reunionDays = 14, kind = 'pod' }) {
        const p = ok(await sb.rpc('create_pod', { p_title: title, p_topic: topic, p_hours: hours, p_reunion_days: reunionDays, p_kind: kind }));
        return getPod(p.id);
      },
      async joinPod(code) { const p = ok(await sb.rpc('join_pod', { p_code: code })); return getPod(p.id); },
      async openRoom({ key, title, kind, expiresAt, topic = '' }) {
        const p = ok(await sb.rpc('open_room', { p_key: key, p_title: title, p_kind: kind, p_expires: new Date(expiresAt).toISOString(), p_topic: topic }));
        return getPod(p.id);
      },
      async invite(podId, userIds) { return ok(await sb.rpc('invite_to_pod', { p_pod: podId, p_users: userIds })); },
      async acceptInvite(podId) { ok(await sb.from('pod_members').update({ status: 'joined' }).eq('pod_id', podId).eq('user_id', me)); },
      async leavePod(podId) { ok(await sb.from('pod_members').delete().eq('pod_id', podId).eq('user_id', me)); },
      async messages(podId) {
        return ok(await sb.from('messages').select('*, votes(user_id)').eq('pod_id', podId).order('created_at').limit(500))
          .map((m) => ({ ...m, votes: (m.votes || []).length, mine: (m.votes || []).some((v) => v.user_id === me) }));
      },
      async post(podId, body, kind = 'msg', author = '') { ok(await sb.from('messages').insert({ pod_id: podId, body, kind, author, user_id: me })); },
      async vote(messageId) {
        const mine = ok(await sb.from('votes').select('message_id').eq('message_id', messageId).eq('user_id', me));
        if (mine.length) ok(await sb.from('votes').delete().eq('message_id', messageId).eq('user_id', me));
        else ok(await sb.from('votes').insert({ message_id: messageId, user_id: me }));
      },
      async offers() { return ok(await sb.from('offers').select('*').order('created_at', { ascending: false }).limit(200)); },
      async addOffer({ kind, body, topics = [], author = '' }) { ok(await sb.from('offers').insert({ kind, body, topics, author, user_id: me })); },
      async removeOffer(id) { ok(await sb.from('offers').delete().eq('id', id).eq('user_id', me)); },
      async rouletteJoin(round, topics = []) { return ok(await sb.rpc('roulette_join', { p_round: round, p_topics: topics })); },
      async rouletteMine() {
        const r = ok(await sb.from('roulette').select('*').eq('user_id', me).maybeSingle());
        if (!r) return null;
        const partnerProfile = r.partner ? ok(await sb.from('profiles').select('*').eq('id', r.partner).maybeSingle()) : null;
        return { ...r, partnerProfile };
      },
      async rouletteLeave() { ok(await sb.from('roulette').delete().eq('user_id', me)); },
      subscribe(fn) {
        const ch = sb.channel(`r4-${me}`);
        ['pods', 'pod_members', 'messages', 'votes', 'offers', 'roulette'].forEach((table) => ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => fn(table)));
        ch.subscribe();
        return () => sb.removeChannel(ch);
      },
      reset() {},
    };
  }

  async function start(opts = {}) {
    const c = config();
    if (c.url && c.key && !c.demo) {
      try { return await supabaseAdapter(c); } catch (e) { const d = demoAdapter(opts); d.error = String(e.message || e); return d; }
    }
    return demoAdapter(opts);
  }
  window.R4Backend = { start, config, setConfig };
})();
