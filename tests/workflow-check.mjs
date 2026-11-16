import assert from 'node:assert/strict';
import fs from 'node:fs';
const workflow = fs.readFileSync(new URL('../.github/workflows/check.yml', import.meta.url), 'utf8');
for (const [, ref] of workflow.matchAll(/uses:\s*(\S+)/g)) assert.match(ref, /@[a-f0-9]{40}$/);
assert.ok(!workflow.includes('contents: write') && !workflow.includes('pages: write'));
console.log('CI: actions SHA-pinned; read-only, non-deploying workflow');
