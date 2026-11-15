import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { emptyBackup } from './fixtures.mjs';

const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(new URL('../backup.js', import.meta.url), 'utf8'), context);
const { validate, prepare, restore } = context.window.R4_BACKUP;
const original = emptyBackup(), noMigration = () => {};
assert.doesNotThrow(() => validate(original));
assert.doesNotThrow(() => prepare(original, noMigration));
for (const alter of [
  x => { x.sessions = {}; }, x => { x.people = null; }, x => { delete x.me; },
  x => { x.me.interests = {}; }, x => { x.me.eventStart = '2026-02-30'; },
  x => { x.me.days = 100000; }, x => { x.agents.log = {}; },
  x => { x.version = 0; }, x => { x.version = 2; },
  x => { x.pitchSeconds = 'x" data-marker="timer'; },
  x => { x.people = [{ id: 'person1', name: 'Synthetic', topics: {} }]; }
]) {
  const bad = structuredClone(original); alter(bad);
  let writes = 0;
  assert.throws(() => restore(bad, original, { setItem() { writes++; } }, 'synthetic', noMigration));
  assert.equal(writes, 0, 'validate completely before writing any storage');
  assert.deepEqual(original, emptyBackup());
}
const legacy = emptyBackup(); delete legacy.cosSeeded; delete legacy.agents; delete legacy.me.lang;
const migrated = prepare(legacy, candidate => { candidate.cosSeeded = true; candidate.agents = emptyBackup().agents; candidate.me.lang = 'en'; });
assert.equal(migrated.cosSeeded, true);
assert.equal(legacy.cosSeeded, undefined, 'migration must not mutate its input');
assert.throws(() => prepare(original, candidate => { candidate.sessions = {}; }));
assert.throws(() => prepare(original, () => { throw new Error('synthetic migration error'); }));
for (const failAt of [1, 2]) {
  const values = new Map([['synthetic', JSON.stringify(original)]]); let writes = 0;
  assert.throws(() => restore(original, original, { setItem(k, v) { if (++writes === failAt) throw new Error('synthetic quota'); values.set(k, v); } }, 'synthetic', noMigration));
  assert.equal(values.get('synthetic'), JSON.stringify(original));
}
const values = new Map(), storage = { setItem(k, v) { values.set(k, v); } };
const incoming = emptyBackup(); incoming.me.name = 'Restored';
const accepted = restore(incoming, original, storage, 'synthetic', noMigration);
assert.equal(accepted.me.name, 'Restored');
assert.equal(JSON.parse(values.get('synthetic.previous')).me.name, original.me.name);
assert.equal(JSON.parse(values.get('synthetic')).me.name, 'Restored');
context.window.R4_VARIANT = 'muse';
const muse = { ...emptyBackup(), badges: {}, streak: [], debriefs: {}, promises: [], pitchRevisions: [], pitchDraft: '', matchWeights: { shared: 22, goal: 18, hot: 18, bridges: 4 } };
assert.doesNotThrow(() => validate(muse));
const meetup = structuredClone(muse);
meetup.sessions.push({ id: 'meetup1', type: 'meetup', status: 'going', title: 'Synthetic meetup', location: '', notes: '', takeaways: '', topic: '', attendees: [], day: 0, start: '09:00', end: '10:00', why: 'Synthetic reason', polls: [{ id: 'poll1', q: 'Synthetic question', opts: [{ t: 'Yes', v: 1 }] }] });
assert.doesNotThrow(() => validate(meetup));
for (const polls of [{}, [{ id: 'poll1', q: 'Synthetic question', opts: {} }], [{ id: 'poll1', q: 'Synthetic question', opts: [{ t: 'Yes', v: 'x" data-marker="vote' }] }]]) {
  const bad = structuredClone(meetup); bad.sessions[0].polls = polls; assert.throws(() => validate(bad));
}
context.window.R4_VARIANT = undefined;
assert.throws(() => validate(meetup), 'root must reject unsupported Muse session types before rendering');
context.window.R4_VARIANT = 'muse';
for (const alter of [x => { x.promises = {}; }, x => { x.debriefs = { 0: { moments: {} } }; }, x => { x.matchWeights.hot = 'x" data-marker="weight'; }, x => { x.pitchRevisions = [{ id: 'safe', text: {}, ts: 1 }]; }]) {
  const bad = structuredClone(muse); alter(bad); assert.throws(() => validate(bad));
}
console.log('backup state: root/Muse schemas, empty projects, detached migration, unsupported versions and save failures passed');
