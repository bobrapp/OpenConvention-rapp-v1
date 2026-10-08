import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const i18n = fs.readFileSync(new URL('../i18n.js', import.meta.url), 'utf8');
const calls = /\b(?:t|_)\s*\(\s*('(?:\\.|[^'\\])*')/g;
const keys = new Set();
for (const match of source.matchAll(calls)) keys.add(vm.runInNewContext(match[1]));

const window = {};
vm.runInNewContext(i18n, { window });
const missing = Object.fromEntries(['es', 'pt'].map((lang) => [
  lang, [...keys].filter((key) => !Object.hasOwn(window.R4_I18N[lang] || {}, key)),
]));
for (const [lang, list] of Object.entries(missing)) {
  if (list.length) console.error(`${lang} is missing ${list.length} key(s):\n${list.map((x) => `  ${JSON.stringify(x)}`).join('\n')}`);
}
if (Object.values(missing).some((list) => list.length)) process.exitCode = 1;
else console.log(`i18n ok: ${keys.size} literal keys found; all translated in es and pt.`);
