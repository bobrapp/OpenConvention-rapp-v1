import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { chromium } from 'playwright';

// WCAG 2.5.8 inline exception: anchors inside paragraphs are exempt; no other target-size exemptions apply.
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
    const undersized = await page.evaluate(()=>[...document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,[role=button],[role=radio],[role=switch],[role=tab]')].filter(e=>e.offsetParent && !(e.matches('a[href]')&&e.closest('p'))).map(e=>{const r=e.getBoundingClientRect();return {name:e.getAttribute('aria-label')||e.textContent.trim(),w:r.width,h:r.height}}).filter(e=>e.w<43.9||e.h<43.9));
    if (undersized.length) problems.push(`${brand}/${scheme}: undersized controls ${JSON.stringify(undersized.slice(0,8))}`);
    const width = await page.evaluate(()=>({w:document.documentElement.scrollWidth,v:innerWidth}));
    if(width.w>width.v) problems.push(`${brand}/${scheme}: horizontal overflow ${JSON.stringify(width)}`);
    if (scheme === 'light') await page.screenshot({path:path.join(shots,`settings-${brand}.png`)});
    const opener = page.locator('#settings-trigger');
    await page.keyboard.press('Escape');
    assert.equal(await opener.evaluate(e=>document.activeElement===e), true, 'focus returns to settings opener');
    const zoomText = async () => page.evaluate(() => {
      const elements=[document.documentElement,...document.querySelectorAll('body *')].filter(el=>el.dataset.a11yZoomApplied!=='1');
      const before=Number.parseFloat(getComputedStyle(document.querySelector('#brand')).fontSize);
      for(const el of elements){const size=Number.parseFloat(getComputedStyle(el).fontSize);el.style.setProperty('font-size',`${size*2}px`,'important');el.dataset.a11yZoomApplied='1';}
      return {before,after:Number.parseFloat(getComputedStyle(document.querySelector('#brand')).fontSize)};
    });
    const zoom = await zoomText();
    assert.ok(zoom.after>=zoom.before*1.99,`${brand}/${scheme}: text zoom doubles computed header text`);
    const checkReflow = async label => {
      await zoomText();
      const metrics=await page.evaluate(()=>{
        const groups=[...document.querySelectorAll('.top-in,.brand')].map(parent=>[...parent.children].filter(el=>el.getClientRects().length));
        const overlap=[];
        for(const group of groups)for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
          const a=group[i].getBoundingClientRect(),b=group[j].getBoundingClientRect();
          if(a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1)overlap.push(`${group[i].className||group[i].tagName}/${group[j].className||group[j].tagName}`);
        }
        return {width:document.documentElement.scrollWidth,overlap};
      });
      if(metrics.width>390)problems.push(`${brand}/${scheme}/${label}: 200% text overflow ${metrics.width}px`);
      if(metrics.overlap.length)problems.push(`${brand}/${scheme}/${label}: header overlap ${metrics.overlap.join(', ')}`);
    };
    for(const tab of ['today','people','agenda','web','pitch','report']){
      await page.locator(`[data-tab="${tab}"]`).click();
      await checkReflow(tab);
      const small=await page.evaluate(()=>[...document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,[role=button],[role=radio],[role=switch],[role=tab]')].filter(e=>e.offsetParent&&!(e.matches('a[href]')&&e.closest('p'))).map(e=>{const r=e.getBoundingClientRect();return {name:e.getAttribute('aria-label')||e.textContent.trim(),w:r.width,h:r.height}}).filter(e=>e.w<43.9||e.h<43.9));
      if(small.length)problems.push(`${brand}/${scheme}/${tab}: 200% target size ${JSON.stringify(small.slice(0,8))}`);
      if(tab==='web'){
        const graphTargets=await page.evaluate(()=>[...document.querySelectorAll('.web-p circle.web-hit,.web-sub rect.web-hit')].map(el=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height}}).filter(r=>r.w<43.9||r.h<43.9));
        if(graphTargets.length)problems.push(`${brand}/${scheme}/web: undersized graph hit areas ${JSON.stringify(graphTargets)}`);
      }
    }
    await page.locator('#settings-trigger').click();
    await checkReflow('settings');
    const settingWidth=await page.evaluate(()=>[...document.querySelectorAll('.sheet-body input:not([type=checkbox]),.sheet-body select,.sheet-body textarea')].some(el=>el.getBoundingClientRect().right>390));
    if(settingWidth)problems.push(`${brand}/${scheme}: settings field exceeds 390px`);
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
  const receiptRow=page.locator('#receipt-list .receipt-row').first();
  const receiptSeq=await receiptRow.getAttribute('data-seq');
  await receiptRow.click();
  await page.waitForFunction(seq=>document.querySelector('#sheet-title')?.textContent===`Receipt ${seq}`,receiptSeq);
  await page.keyboard.press('Escape');
  await page.waitForFunction(seq=>document.activeElement?.matches(`[data-act="receiptDetail"][data-seq="${seq}"]`),receiptSeq);
  assert.equal(await page.locator('#receipt-list .receipt-row:focus').getAttribute('data-seq'),receiptSeq,'Escape returns focus to the receipt row in Settings');
  console.log(problems.length?problems.join('\n'):`a11y ok: 2 brands × light/dark, 44px targets, dialog focus, and no serious/critical axe findings or overflow`);
  assert.deepEqual(problems,[]);
  await page.close();
} finally { await browser.close(); }
