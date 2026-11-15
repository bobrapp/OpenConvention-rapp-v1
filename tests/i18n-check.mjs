import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(new URL('../i18n.js', import.meta.url), 'utf8'), context);
const dictionaries = context.window.R4_I18N;
assert.deepEqual(Object.keys(dictionaries).sort(), ['es', 'pt']);
assert.deepEqual(Object.keys(dictionaries.es).sort(), Object.keys(dictionaries.pt).sort());
const variables = value => [...value.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
let count = 0;
for (const [language, dictionary] of Object.entries(dictionaries)) {
  for (const [key, translated] of Object.entries(dictionary)) {
    assert.ok(typeof translated === 'string' && translated.trim(), language + ': ' + key);
    // The localized summary does not use the English a/an article.
    const expected = key === '{first}{who} is {a} {persona}: {gist}.' ? variables(key).filter(x => x !== 'a') : variables(key);
    assert.deepEqual(variables(translated), expected, language + ' placeholders: ' + key);
    count++;
  }
}
console.log(`i18n: ${count} translations checked; dictionary parity and placeholders passed`);
