import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const shots = process.env.SHOT_DIR || '/Users/devin/shots/claude-brand';
const base = process.env.BASE_URL || 'http://127.0.0.1:8084/';
mkdirSync(shots, {recursive:true});
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args:['--no-sandbox']});
const problems = [];
try {
  for (const brand of ['slalom', 'aigovops']) for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage({viewport:{width:390,height:844}, colorScheme:scheme});
    await page.goto(base, {waitUntil:'domcontentloaded'});
    await page.locator('#settings-trigger').click();
    await page.locator(`[role="radio"][data-brand="${brand}"]`).click();
    await page.addScriptTag({path:axePath});
    assert.equal(await page.locator('html').getAttribute('data-brand'), brand);
    const axe = await page.evaluate(async()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
    problems.push(...axe.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>`${brand}/${scheme}: ${v.id} ${v.nodes.map(n=>n.target.join(' ')).join(', ')}`));
    const undersized = await page.evaluate(()=>[...document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,[role=button],[role=radio]')].filter(e=>e.offsetParent).map(e=>{const r=e.getBoundingClientRect();return {name:e.getAttribute('aria-label')||e.textContent.trim(),w:r.width,h:r.height}}).filter(e=>e.w<43.9||e.h<43.9));
    if (undersized.length) problems.push(`${brand}/${scheme}: undersized controls ${JSON.stringify(undersized.slice(0,8))}`);
    const width = await page.evaluate(()=>({w:document.documentElement.scrollWidth,v:innerWidth}));
    if(width.w>width.v) problems.push(`${brand}/${scheme}: horizontal overflow ${JSON.stringify(width)}`);
    if (scheme === 'light') await page.screenshot({path:path.join(shots,`settings-${brand}.png`)});
    const opener = page.locator('#settings-trigger');
    await page.keyboard.press('Escape');
    assert.equal(await opener.evaluate(e=>document.activeElement===e), true, 'focus returns to settings opener');
    await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
    const zoomWidth = await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    if(zoomWidth>0) problems.push(`${brand}/${scheme}: 200% text overflow ${zoomWidth}px`);
    await page.close();
  }
  const page = await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(base); await page.waitForFunction(()=>window.R4Receipts);
  await page.locator('#settings-trigger').click();
  await page.waitForFunction(()=>document.querySelector('#receipt-list')?.children.length);
  await page.locator('#receipt-list').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(shots,'receipts.png')});
  const status = await page.locator('#sheet-form').getAttribute('aria-modal');
  assert.equal(status,'true');
  console.log(problems.length?problems.join('\n'):`a11y ok: 2 brands × light/dark, 44px targets, dialog focus, and no serious/critical axe findings or overflow`);
  assert.deepEqual(problems,[]);
  await page.close();
} finally { await browser.close(); }
