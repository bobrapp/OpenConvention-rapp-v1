import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(new URL('../backup.js', import.meta.url), 'utf8'), context);
const validate = context.window.R4_BACKUP.validateIds;
assert.doesNotThrow(() => validate({ people: [{ id: 'person-1' }], sessions: [{ id: 'session_1' }] }));
assert.doesNotThrow(() => validate({ people: [], sessions: [] }));
for (const id of ['x" data-marker="person', "x' data-marker='session", '__proto__', 'constructor', '', 7, {}]) {
  for (const key of ['people', 'sessions', 'goals', 'bofTopics', 'pitches']) assert.throws(() => validate({ [key]: [{ id }] }));
}
assert.throws(() => validate({ people: [{ id: 'same' }, { id: 'same' }] }));
assert.throws(() => validate({ agents: { proposals: [{ id: 'x" data-marker="proposal' }] } }));
assert.throws(() => validate(null));
assert.throws(() => validate([]));
console.log('backup identifiers: valid, empty, malicious, duplicate and nested cases passed');
