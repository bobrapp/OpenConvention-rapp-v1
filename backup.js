'use strict';
(() => {
  const identifier = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
  function validateIds(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Backup must be an object');
    let count = 0;
    function walk(value, depth) {
      if (++count > 100000 || depth > 30) throw new Error('Backup is too complex');
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) {
        const seen = new Set();
        value.forEach(item => {
          if (item && typeof item === 'object' && Object.hasOwn(item, 'id')) {
            if (!identifier(item.id) || seen.has(item.id)) throw new Error('Invalid or duplicate backup identifier');
            seen.add(item.id);
          }
        });
      }
      Object.entries(value).forEach(([key, item]) => {
        if (['__proto__', 'constructor', 'prototype'].includes(key) || (key === 'id' && !identifier(item))) throw new Error('Invalid backup identifier');
        walk(item, depth + 1);
      });
    }
    walk(data, 0);
    return data;
  }
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const text = value => typeof value === 'string' && value.length <= 200000;
  const number = value => Number.isSafeInteger(value) && value >= 0 && value <= 1e15;
  const time = value => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  function validate(data) {
    validateIds(data);
    const check = (yes, field) => { if (!yes) throw new Error('Invalid backup: ' + field); };
    const fields = (value, names) => { check(object(value), names.join('/')); names.forEach(key => check(text(value[key]), key)); };
    const list = value => Array.isArray(value) && value.length <= 10000;
    const strings = value => list(value) && value.every(text);
    const ids = value => list(value) && value.every(identifier);
    const optional = (value, key, test) => { if (value[key] != null) check(test(value[key]), key); };
    check(data.version === 1, 'unsupported version (only version 1 is supported)');
    check(number(data.pitchSeconds) && data.pitchSeconds >= 15 && data.pitchSeconds <= 3600, 'pitch timer');
    fields(data.me, ['name', 'team', 'eventName', 'eventStart', 'dayStart', 'dayEnd']);
    const m = data.me;
    check(/^\d{4}-\d{2}-\d{2}$/.test(m.eventStart) && Number.isFinite(Date.parse(m.eventStart)) && new Date(m.eventStart).toISOString().slice(0, 10) === m.eventStart, 'event date');
    check(Number.isInteger(m.days) && m.days >= 1 && m.days <= 7 && time(m.dayStart) && time(m.dayEnd) && m.dayStart < m.dayEnd, 'event days/hours');
    check(strings(m.interests), 'interests'); optional(m, 'role', text); optional(m, 'lang', x => ['en', 'es', 'pt'].includes(x));
    ['people', 'sessions', 'goals', 'bofTopics', 'pitches'].forEach(key => check(list(data[key]), key));
    const item = value => check(object(value) && identifier(value.id), 'item');
    data.people.forEach(p => {
      item(p); fields(p, ['name', 'role', 'company', 'lookingFor', 'canOffer', 'notes', 'metAt']);
      check(['exec', 'tech', 'peer', 'client', 'partner', 'talent', 'cos'].includes(p.persona), 'persona');
      check(['met', 'want'].includes(p.status) && ['hot', 'warm', 'cold'].includes(p.priority), 'person status/priority');
      check(strings(p.topics) && number(p.day), 'person topics/day');
      fields(p.followUp, ['action']); check(number(p.followUp.due) && typeof p.followUp.done === 'boolean', 'follow-up');
      optional(p, 'createdAt', number); optional(p, 'imported', x => typeof x === 'boolean');
    });
    data.sessions.forEach(s => {
      item(s); fields(s, ['title', 'location', 'notes', 'takeaways', 'topic']);
      check(['session', 'bof', 'pitch', 'meeting', 'work', 'social'].includes(s.type) && ['going', 'maybe'].includes(s.status), 'session type/status');
      check(Number.isInteger(s.day) && s.day >= 0 && s.day < m.days && time(s.start) && time(s.end) && s.start < s.end && ids(s.attendees), 'session time/attendees');
      optional(s, 'speaker', text); optional(s, 'featured', x => typeof x === 'boolean'); optional(s, 'agentBooked', x => typeof x === 'boolean');
    });
    data.goals.forEach(g => { item(g); fields(g, ['text']); check(number(g.target) && g.target > 0 && number(g.count) && ['', 'people', 'execclient', 'followups', 'bof'].includes(g.auto), 'goal'); });
    data.bofTopics.forEach(b => { item(b); fields(b, ['title', 'by']); check(number(b.votes) && typeof b.voted === 'boolean', 'topic votes'); });
    data.pitches.forEach(p => { item(p); fields(p, ['name', 'idea']); check(typeof p.done === 'boolean' && ids(p.sparked), 'pitch'); });
    ['headlinerSeeded', 'cosSeeded'].forEach(key => optional(data, key, x => typeof x === 'boolean'));
    ['fired', 'prep'].forEach(key => optional(data, key, x => object(x) && Object.values(x).every(v => typeof v === 'boolean' || v === 0 || v === 1)));
    if (data.agents != null) {
      const a = data.agents; check(object(a), 'agents');
      optional(a, 'on', x => object(x) && Object.values(x).every(v => typeof v === 'boolean'));
      optional(a, 'autoBook', x => typeof x === 'boolean'); optional(a, 'runs', number);
      if (a.log != null) {
        check(list(a.log), 'agent log'); a.log.forEach(x => { item(x); fields(x, ['from', 'to', 'text']); check(identifier(x.fromKind) && number(x.ts), 'agent log metadata'); });
      }
      if (a.proposals != null) {
        check(list(a.proposals), 'proposals'); a.proposals.forEach(x => {
          item(x); fields(x, ['location', 'brief']);
          check(identifier(x.personId) && ['pending', 'booked', 'declined'].includes(x.status) && number(x.day) && x.day < m.days && time(x.start) && time(x.end) && x.start < x.end && typeof x.inbound === 'boolean', 'proposal');
          optional(x, 'sessionId', identifier);
        });
      }
    }
    return data;
  }
  function prepare(data, migrate) {
    validate(data);
    const candidate = JSON.parse(JSON.stringify(data));
    migrate(candidate);
    return validate(candidate);
  }
  function restore(data, current, storage, key, migrate) {
    const candidate = prepare(data, migrate);
    storage.setItem(key + '.previous', JSON.stringify(current));
    storage.setItem(key, JSON.stringify(candidate));
    return candidate;
  }
  window.R4_BACKUP = { validateIds, validate, prepare, restore };
})();
