import assert from 'node:assert/strict';
import { mkdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const screenshotDir = path.join(root, 'docs', 'demo', 'claude');
const base = process.env.BASE_URL || 'http://127.0.0.1:60805/claude-v1/';
const browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || process.env.CHROME_PATH || undefined,args:['--no-sandbox']});
mkdirSync(screenshotDir,{recursive:true});
const personaRows = [['maya','Maya Torres',8,6],['diego','Diego Alvarez',10,9],['priya','Dr. Priya Natarajan',8,10]];
const shotIndexes = {maya:[0,3],diego:[0,3],priya:[0,3]};
try {
  for (const [id,name,peopleCount,agendaCount] of personaRows) {
    const context = await browser.newContext({viewport:{width:390,height:844},colorScheme:'light'});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror',(error)=>errors.push(error.message));
    page.on('console',(message)=>{if(message.type()==='error')errors.push(message.text());});
    page.on('dialog',(dialog)=>dialog.accept());
    await page.route('**/favicon.ico',(route)=>route.fulfill({status:204,body:''}));
    await page.addInitScript(()=>{
      localStorage.setItem('r4companion.v1','real-user-sentinel');
      window.__realDbTouches=[];
      const open=indexedDB.open.bind(indexedDB);
      indexedDB.open=(name,...args)=>{
        if(name==='r4-beacon-claude')window.__realDbTouches.push(String(name));
        return open(name,...args);
      };
    });
    await page.goto(`${base}?demo=${id}`,{waitUntil:'domcontentloaded'});
    await page.getByRole('region',{name:'demo mode'}).waitFor();
    await page.waitForFunction((key)=>!!localStorage.getItem(key),`r4companion.v1-demo-${id}`);
    await page.waitForFunction(()=>window.R4Receipts);
    await page.waitForFunction(async()=> (await R4Receipts.list()).length>0);
    assert.equal(await page.evaluate(()=>localStorage.getItem('r4companion.v1')),'real-user-sentinel',`${id}: real user state remains untouched`);
    assert.deepEqual(await page.evaluate(()=>window.__realDbTouches),[],`${id}: demo does not open the real-user receipt database`);
    const state=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)),`r4companion.v1-demo-${id}`);
    assert.equal(state.settings.me,name);
    assert.equal(state.settings.brand,'slalom');
    assert.equal(state.people.length,peopleCount);
    assert.equal(state.sessions.length+state.blocks.length,agendaCount);
    assert.ok(state.goals.length>=3);
    assert.ok(state.pitches.length>=1);
    await page.addScriptTag({path:axePath});
    const tour=page.getByRole('dialog');
    await tour.waitFor();
    const stepCount=await tour.getByRole('button',{name:'show me'}).count();
    assert.ok(stepCount>=7,`${id}: the tour covers multiple real app features`);
    const imageIndexes=shotIndexes[id];
    let screenshotIndex=0;
    for(let index=0;index<stepCount;index++){
      if(!(await page.getByRole('dialog').count())){
        await page.locator('.demo-banner [data-demo-tour]').click();
        await page.getByRole('dialog').waitFor();
      }
      const step=page.getByRole('dialog').getByRole('button',{name:'show me'}).nth(index);
      const title=await step.locator('xpath=..').locator('strong').textContent();
      await step.click();
      await page.waitForFunction((expected)=>window.__demoLastStep?.title===expected&&window.__demoLastStep.target&&!document.querySelector('.demo-tour')&&!document.querySelector('.demo-tour-scrim'),title);
      assert.equal(await page.locator('.demo-banner [data-demo-progress]').textContent(),`${index+1}/${stepCount}`,`${id}: banner advances after Show Me step ${index+1}`);
      const feature=await page.evaluate(()=>{
        const target=document.querySelector('[data-demo-highlight]');
        if(!target)return null;
        const rect=target.getBoundingClientRect();
        const hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
        return {
          name:window.__demoLastStep.title,
          width:rect.width,
          height:rect.height,
          visible:!!target.getClientRects().length,
          tourClosed:!document.querySelector('.demo-tour')&&!document.querySelector('.demo-tour-scrim'),
          featureUncovered:!!hit&&(hit===target||target.contains(hit)),
        };
      });
      assert.ok(feature&&feature.visible&&feature.width>0&&feature.height>0&&feature.tourClosed&&feature.featureUncovered,`${id}: show-me step ${index+1} leaves the highlighted feature visible and unobscured: ${JSON.stringify(feature)}`);
      if(imageIndexes.includes(index)){
        const imagePath=path.join(screenshotDir,`${id}-${String(++screenshotIndex).padStart(2,'0')}.png`);
        assert.equal(await page.locator('.demo-tour, .demo-tour-scrim').count(),0,`${id}: screenshot ${screenshotIndex} is captured after Show Me closes the tour`);
        await page.screenshot({path:imagePath,scale:'css'});
        assert.ok(statSync(imagePath).size<=150*1024,`${imagePath} should be reasonably small`);
      }
      await page.evaluate(()=>{
        if(!document.querySelector('#sheet')?.hidden)document.querySelector('#sheet-foot [data-act="closeSheet"]')?.click();
      });
      await page.locator('#sheet').waitFor({state:'hidden'});
    }
    for(let index=stepCount-1;index>=0;index--){
      if(!(await page.getByRole('dialog').count())){
        await page.locator('.demo-banner [data-demo-tour]').click();
        await page.getByRole('dialog').waitFor();
      }
      const step=page.getByRole('dialog').getByRole('button',{name:'show me'}).nth(index);
      const title=await step.locator('xpath=..').locator('strong').textContent();
      await step.click();
      await page.waitForFunction((expected)=>window.__demoLastStep?.title===expected&&window.__demoLastStep.target&&!document.querySelector('.demo-tour')&&!document.querySelector('.demo-tour-scrim'),title);
      const target=await page.evaluate(()=>{
        const result=window.__demoLastStep;
        const element=result&&document.querySelector(result.selector);
        return {found:!!result?.target,visible:!!element?.getClientRects().length,selector:result?.selector};
      });
      assert.ok(target.found&&target.visible,`${id}: reverse Show Me step ${index+1} resolves ${target.selector}`);
      await page.evaluate(()=>{
        if(!document.querySelector('#sheet')?.hidden)document.querySelector('#sheet-foot [data-act="closeSheet"]')?.click();
      });
      await page.locator('#sheet').waitFor({state:'hidden'});
    }
    await page.locator('.demo-banner [data-demo-tour]').click();
    await page.getByRole('dialog').waitFor();
    const axe=await page.evaluate(async()=>{
      const report=await axe.run([document.querySelector('[data-demo-banner]'),document.querySelector('.demo-tour')],{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});
      return report.violations.filter((item)=>['serious','critical'].includes(item.impact)).map((item)=>`${item.id}: ${item.nodes.map(node=>node.target.join(' ')).join(', ')}`);
    });
    assert.deepEqual(axe,[],`${id}: demo banner and tour have no serious or critical axe findings`);
    const small=await page.evaluate(()=>[...document.querySelectorAll('[data-demo-banner] button,[data-demo-banner] a[href],.demo-tour button,.demo-tour a[href]')].map((element)=>{
      const rect=element.getBoundingClientRect();
      return {text:element.textContent.trim(),width:rect.width,height:rect.height};
    }).filter((target)=>target.width<43.9||target.height<43.9));
    assert.deepEqual(small,[],`${id}: demo banner and tour controls meet 44px targets`);
    const applyTextZoom=()=>page.evaluate(()=>{
      const elements=[document.documentElement,...document.querySelectorAll('body *')].filter((element)=>element.dataset.demoZoomApplied!=='1');
      const sizes=elements.map((element)=>Number.parseFloat(getComputedStyle(element).fontSize));
      const before=Number.parseFloat(getComputedStyle(document.querySelector('#brand')).fontSize);
      elements.forEach((element,index)=>{
        element.dataset.demoZoomOriginal=JSON.stringify([element.style.getPropertyValue('font-size'),element.style.getPropertyPriority('font-size')]);
        if(Number.isFinite(sizes[index]))element.style.setProperty('font-size',`${sizes[index]*2}px`,'important');
        element.dataset.demoZoomApplied='1';
      });
      return {before,after:Number.parseFloat(getComputedStyle(document.querySelector('#brand')).fontSize)};
    });
    const resetTextZoom=()=>page.evaluate(()=>{
      for(const element of [document.documentElement,...document.querySelectorAll('body *')]){
        if(!element.dataset.demoZoomOriginal)continue;
        const [value,priority]=JSON.parse(element.dataset.demoZoomOriginal);
        if(value)element.style.setProperty('font-size',value,priority);
        else element.style.removeProperty('font-size');
        delete element.dataset.demoZoomOriginal;
        delete element.dataset.demoZoomApplied;
      }
    });
    const headerOverlaps=()=>page.evaluate(()=>{
      const groups=[...document.querySelectorAll('.top-in,.brand')].map((parent)=>[...parent.children].filter((element)=>element.getClientRects().length));
      for(const group of groups)for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
        const a=group[i].getBoundingClientRect(),b=group[j].getBoundingClientRect();
        if(a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1)return true;
      }
      return false;
    });
    const zoom=await applyTextZoom();
    assert.ok(zoom.after>=zoom.before*1.99,`${id}: 200% text test doubles the computed header font size`);
    const demoWidth=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
    assert.ok(demoWidth.scroll<=390,`${id}: banner and tour reflow at 200% text: ${JSON.stringify(demoWidth)}`);
    await page.getByRole('button',{name:'close tour'}).click();
    for(const tab of ['today','people','agenda','web','pitch','report']){
      await resetTextZoom();
      await page.locator(`#tabs [data-tab="${tab}"]`).click();
      const tabZoom=await applyTextZoom();
      assert.ok(tabZoom.after>=tabZoom.before*1.99,`${id}: ${tab} test doubles the computed header font size`);
      const width=await page.evaluate(()=>document.documentElement.scrollWidth);
      assert.ok(width<=390,`${id}: ${tab} stays within 390px at 200% text (scrollWidth ${width})`);
      const overlap=await headerOverlaps();
      assert.equal(overlap,false,`${id}: ${tab} header controls do not overlap at 200% text`);
    }
    await resetTextZoom();
    await page.locator('#settings-trigger').click();
    const settingsZoom=await applyTextZoom();
    assert.ok(settingsZoom.after>=settingsZoom.before*1.99,`${id}: settings test doubles the computed header font size`);
    const settingsWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
    assert.ok(settingsWidth<=390,`${id}: settings stay within 390px at 200% text`);
    assert.equal(await headerOverlaps(),false,`${id}: settings header controls do not overlap at 200% text`);
    const beforeReset=await page.evaluate(async()=>({key:(await R4Receipts.keyInfo()).keyFpr,entries:await R4Receipts.list()}));
    await resetTextZoom();
    await page.evaluate(()=>document.querySelector('#sheet-foot [data-act="closeSheet"]')?.click());
    await page.locator('#sheet').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'tour'}).click();
    await page.getByRole('dialog').getByRole('button',{name:'reset this demo'}).waitFor();
    await page.evaluate(()=>{
      const clear=R4Receipts.clearDemo;
      R4Receipts.clearDemo=async()=>{
        await clear();
        const demoId=new URLSearchParams(location.search).get('demo');
        const db=await new Promise((resolve,reject)=>{
          const request=indexedDB.open(`r4-beacon-claude-demo-${demoId}`);
          request.onsuccess=()=>resolve(request.result);
          request.onerror=()=>reject(request.error);
        });
        const tx=db.transaction(['receipts','keys'],'readonly');
        const request=(store,key)=>new Promise((resolve,reject)=>{
          const result=key===undefined?tx.objectStore(store).count():tx.objectStore(store).get(key);
          result.onsuccess=()=>resolve(result.result);
          result.onerror=()=>reject(result.error);
        });
        const [receipts,head,device,signing]=await Promise.all([
          request('receipts'),request('keys','head'),request('keys','device'),request('keys','signing'),
        ]);
        sessionStorage.setItem('r4-demo-reset-snapshot',JSON.stringify({receipts,head:!!head,device:!!device,signing:!!signing}));
        db.close();
      };
    });
    const reloaded=page.waitForEvent('load');
    await page.getByRole('dialog').getByRole('button',{name:'reset this demo'}).click();
    await reloaded;
    await page.waitForFunction((key)=>!!localStorage.getItem(key),`r4companion.v1-demo-${id}`);
    await page.waitForFunction(async()=> (await R4Receipts.list()).length===1);
    const cleared=JSON.parse(await page.evaluate(()=>sessionStorage.getItem('r4-demo-reset-snapshot')));
    assert.deepEqual(cleared,{receipts:0,head:false,device:false,signing:false},`${id}: reset clears demo receipts, head and signing key before reseeding`);
    const afterReset=await page.evaluate(async()=>({key:(await R4Receipts.keyInfo()).keyFpr,entries:await R4Receipts.list(),verification:await R4Receipts.verify()}));
    assert.notEqual(afterReset.key,beforeReset.key,`${id}: reset generates a fresh demo signing key`);
    assert.equal(afterReset.entries[0].action,'key.created');
    assert.equal(afterReset.verification.ok,true);
    assert.ok(afterReset.entries.every((entry)=>!beforeReset.entries.some((old)=>old.id===entry.id)));
    assert.equal(await page.evaluate(()=>localStorage.getItem('r4companion.v1')),'real-user-sentinel');
    assert.deepEqual(await page.evaluate(()=>window.__realDbTouches),[],`${id}: reset never opens the real-user receipt database`);
    await page.getByRole('link',{name:'exit demo'}).click();
    await page.waitForFunction(()=>!new URL(location.href).searchParams.has('demo'));
    assert.equal(await page.evaluate(()=>localStorage.getItem('r4companion.v1')),'real-user-sentinel',`${id}: exiting preserves real-user state`);
    assert.deepEqual(errors,[],`${id}: no browser errors`);
    await context.close();
  }
  console.log('Claude persona demo ok: seeds and counts, real feature tours, 390px/200% reflow, axe, 44px controls, screenshots, reset and exit isolation');
} finally {
  await browser.close();
}
