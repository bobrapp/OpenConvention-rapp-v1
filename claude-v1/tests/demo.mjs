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
const shotIndexes = {maya:[0,3],diego:[0,4],priya:[0,4]};
const quickIndexes = {maya:[4,0,2,1,7],diego:[2,1,4,7,8],priya:[5,1,4,2,7]};
try {
  for (const [id,name,peopleCount,agendaCount] of personaRows) {
    const stepCount={maya:9,diego:9,priya:8}[id];
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
    assert.equal(state.demo.tourMode,'quick',`${id}: quick mode is the default`);
    await page.addScriptTag({path:axePath});
    const tour=page.getByRole('dialog');
    await tour.waitFor();
    assert.equal(await tour.getByRole('button',{name:'show me'}).count(),5,`${id}: quick tour has five steps`);
    assert.equal(await page.locator('.demo-banner [data-demo-progress]').textContent(),'tour 0/5',`${id}: quick tour starts at 0/5`);
    for(const [order,index] of quickIndexes[id].entries()){
      if(!(await page.getByRole('dialog').count())){
        await page.locator('.demo-banner [data-demo-tour]').click();
        await page.getByRole('dialog').waitFor();
      }
      const quickStep=page.locator(`.demo-tour [data-demo-show="${index}"]`);
      assert.equal(await quickStep.count(),1,`${id}: quick index ${index} is listed`);
      const title=await quickStep.locator('xpath=..').locator('strong').textContent();
      await quickStep.click();
      await page.waitForFunction((expected)=>window.__demoLastStep?.title===expected&&window.__demoLastStep.target&&!document.querySelector('.demo-tour')&&!document.querySelector('.demo-tour-scrim'),title);
      assert.equal(await page.locator('.demo-banner [data-demo-progress]').textContent(),`tour ${order+1}/5`,`${id}: quick progress advances to ${order+1}/5`);
      const target=await page.evaluate(()=>{const last=window.__demoLastStep;return {selector:last?.selector,found:!!last?.target,visible:!!document.querySelector(last?.selector)?.getClientRects().length};});
      assert.ok(target.found&&target.visible,`${id}: quick target ${index} resolves at ${target.selector}`);
      if(id==='diego'&&index===7){
        const draft=page.locator('#view .fu-draft').first();
        assert.ok(await draft.isVisible(),'Diego draft is visible during its tour step');
        assert.ok((await draft.textContent()).trim().length>0,'Diego draft has readable message text');
        const layout=await draft.evaluate(element=>{
          const copy=element.parentElement.querySelector('[data-act="copyFu"]');
          return {draft:element.getBoundingClientRect().toJSON(),copy:copy.getBoundingClientRect().toJSON()};
        });
        assert.ok(layout.draft.bottom<=layout.copy.top,`Diego draft appears above its copy control: ${JSON.stringify(layout)}`);
      }
      await page.evaluate(()=>{if(!document.querySelector('#sheet')?.hidden)document.querySelector('#sheet-foot [data-act="closeSheet"]')?.click();});
      await page.locator('#sheet').waitFor({state:'hidden'});
      if(order===1){
        await page.reload();
        await page.getByRole('region',{name:'demo mode'}).waitFor();
        assert.equal(await page.locator('.demo-banner [data-demo-progress]').textContent(),'tour 2/5',`${id}: quick progress survives reload`);
        await page.locator('.demo-banner [data-demo-tour]').click();
        await page.getByRole('dialog').waitFor();
        await page.locator('[data-demo-mode]').click();
        assert.equal(await page.getByRole('dialog').getByRole('button',{name:'show me'}).count(),stepCount,`${id}: full mode shows N steps`);
        assert.equal(await page.locator('.demo-banner [data-demo-progress]').textContent(),`tour 2/${stepCount}`,`${id}: two quick completions count in full mode`);
        await page.getByRole('button',{name:'close tour'}).click();
        await page.locator('#tabs [data-tab="today"]').click();
        await page.locator('#view [data-act="bumpGoal"]').first().click();
        await page.reload();
        await page.getByRole('region',{name:'demo mode'}).waitFor();
        assert.equal(await page.locator('.demo-banner [data-demo-progress]').textContent(),`tour 2/${stepCount}`,`${id}: full mode and progress survive an app save and reload`);
        await page.locator('.demo-banner [data-demo-tour]').click();
        await page.getByRole('dialog').waitFor();
        assert.equal(await page.getByRole('dialog').getByRole('button',{name:'show me'}).count(),stepCount,`${id}: reloaded full mode still shows N steps`);
        await page.locator('[data-demo-mode]').click();
        assert.equal(await page.locator('.demo-banner [data-demo-progress]').textContent(),'tour 2/5',`${id}: returning to quick mode restores quick progress`);
        await page.getByRole('button',{name:'close tour'}).click();
      }
    }
    await page.locator('.demo-banner [data-demo-tour]').click();
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.getByRole('button',{name:`show all ${stepCount} features`}).count(),1,`${id}: quick tour offers the full list`);
    await page.locator('[data-demo-mode]').click();
    assert.equal(await page.getByRole('dialog').getByRole('button',{name:'show me'}).count(),stepCount,`${id}: full toggle shows N steps`);
    assert.equal(await page.locator('.demo-banner [data-demo-progress]').textContent(),`tour 5/${stepCount}`,`${id}: full progress carries quick completions`);
    assert.equal(await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)).demo.tourMode,`r4companion.v1-demo-${id}`),'full',`${id}: full mode is stored on demo state`);
    for(const lang of ['es','pt']){
      await page.goto(`${base}?demo=${id}&lang=${lang}`,{waitUntil:'domcontentloaded'});
      await page.getByRole('region',{name:'demo mode'}).waitFor();
      await page.locator('.demo-banner [data-demo-tour]').click();
      await page.getByRole('dialog').waitFor();
      const fullLabel=lang==='es'?'ver recorrido de 2 minutos':'ver visita de 2 minutos';
      const allLabel=lang==='es'?`ver las ${stepCount} funciones`:`ver todos os ${stepCount} recursos`;
      assert.equal(await page.getByRole('button',{name:fullLabel}).count(),1,`${id}: ${lang} full toggle is localized`);
      await page.locator('[data-demo-mode]').click();
      assert.equal(await page.getByRole('button',{name:allLabel}).count(),1,`${id}: ${lang} all-features toggle is localized`);
      assert.equal(await page.locator('[data-demo-show]').count(),5,`${id}: ${lang} quick mode contains five steps`);
      if(id==='diego'){
        const approval=page.locator('.demo-tour [data-demo-show="7"]').locator('xpath=..');
        const expectedTitle=lang==='es'?'Revisa un borrador antes de copiarlo':'Revise o rascunho antes de copiá-lo';
        const expectedWhy=lang==='es'?'No envío a ciegas un seguimiento escrito por un agente; reviso el borrador y decido cuándo copiarlo.':'Não envio às cegas um acompanhamento escrito pelo agente; reviso o rascunho e decido quando copiá-lo.';
        assert.equal(await approval.locator('strong').textContent(),expectedTitle,`${id}: ${lang} approval-step title is localized`);
        assert.equal(await approval.locator('p').textContent(),expectedWhy,`${id}: ${lang} approval rationale is localized`);
      }
      await page.locator('[data-demo-mode]').click();
      await page.getByRole('button',{name:lang==='es'?'cerrar recorrido':'fechar tour'}).click();
    }
    await page.goto(`${base}?demo=${id}`,{waitUntil:'domcontentloaded'});
    await page.getByRole('region',{name:'demo mode'}).waitFor();
    await page.evaluate((key)=>{
      const state=JSON.parse(localStorage.getItem(key));
      state.demo={...(state.demo||{}),tourMode:'quick',tour:{0:true,1:true}};
      delete state.demo.tourVersion;
      localStorage.setItem(`${key}:tour`,JSON.stringify(state.demo));
      localStorage.setItem(key,JSON.stringify(state));
    },`r4companion.v1-demo-${id}`);
    await page.reload();
    await page.getByRole('region',{name:'demo mode'}).waitFor();
    assert.equal(await page.locator('.demo-banner [data-demo-progress]').textContent(),'tour 0/5',`${id}: old unversioned tour progress resets`);
    const versioned=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)).demo,`r4companion.v1-demo-${id}`);
    assert.equal(versioned.tourVersion,2,`${id}: current tour version is stored`);
    assert.deepEqual(versioned.tour,{},`${id}: old completion keys are cleared`);
    await page.evaluate((key)=>{
      const state=JSON.parse(localStorage.getItem(key));
      state.demo={...(state.demo||{}),tourMode:'full',tour:{},tourVersion:2};
      localStorage.setItem(`${key}:tour`,JSON.stringify(state.demo));
      localStorage.setItem(key,JSON.stringify(state));
    },`r4companion.v1-demo-${id}`);
    await page.reload();
    await page.getByRole('region',{name:'demo mode'}).waitFor();
    await page.locator('.demo-banner [data-demo-tour]').click();
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.locator('.demo-banner [data-demo-progress]').textContent(),`tour 0/${stepCount}`,`${id}: full-mode progress initializes on banner creation`);
    assert.equal(await page.getByRole('dialog').getByRole('button',{name:'show me'}).count(),stepCount,`${id}: full mode survives reload`);
    assert.equal(await page.getByRole('button',{name:'show 2-minute tour'}).count(),1);
    await page.locator('[data-demo-close]').click();
    assert.equal(await page.evaluate(()=>document.body.classList.contains('demo-tour-active')),false,`${id}: closing tour clears the active class`);
    assert.equal(await page.evaluate(()=>document.activeElement.matches('.demo-banner [data-demo-tour]')),true,`${id}: closing tour returns focus`);
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
      assert.equal(await page.locator('.demo-banner [data-demo-progress]').textContent(),`tour ${index+1}/${stepCount}`,`${id}: banner advances after Show Me step ${index+1}`);
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
    const showAndAssertCenter=async(index,label)=>{
      if(!(await page.getByRole('dialog').count())){
        await page.locator('.demo-banner [data-demo-tour]').click();
        await page.getByRole('dialog').waitFor();
      }
      const step=page.getByRole('dialog').getByRole('button',{name:'show me'}).nth(index);
      const title=await step.locator('xpath=..').locator('strong').textContent();
      await step.click();
      await page.waitForFunction((expected)=>{
        const result=window.__demoLastStep;
        const element=result&&document.querySelector(result.selector);
        if(!result?.target||!element?.getClientRects().length||document.querySelector('.demo-tour')||document.querySelector('.demo-tour-scrim'))return false;
        const rect=element.getBoundingClientRect();
        const hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
        return result.title===expected&&!!hit&&(hit===element||element.contains(hit));
      },title);
      const target=await page.evaluate(()=>{
        const result=window.__demoLastStep;
        const element=result&&document.querySelector(result.selector);
        if(!element)return {found:false,visible:false,centerHit:false,selector:result?.selector};
        const rect=element.getBoundingClientRect();
        const hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
        return {found:!!result.target,visible:!!element.getClientRects().length,centerHit:!!hit&&(hit===element||element.contains(hit)),selector:result.selector};
      });
      assert.ok(target.found&&target.visible&&target.centerHit,`${id}: ${label} resolves a visible, unobscured target at ${target.selector}`);
      await page.evaluate(()=>{
        if(!document.querySelector('#sheet')?.hidden)document.querySelector('#sheet-foot [data-act="closeSheet"]')?.click();
      });
      await page.locator('#sheet').waitFor({state:'hidden'});
    };
    await showAndAssertCenter(0,'People row before Agents');
    await showAndAssertCenter(1,'Agents subview');
    await showAndAssertCenter(0,'People row after Agents');
    await showAndAssertCenter(stepCount-1,'last step before first step');
    await showAndAssertCenter(0,'first step after last step');
    await page.locator('.demo-banner [data-demo-tour]').click();
    await page.getByRole('dialog').waitFor();
    await page.addScriptTag({path:axePath});
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
      if(tab==='people'){
        await page.locator('#view [data-act="mode"][data-mode="followups"]').click();
        await resetTextZoom();
        await applyTextZoom();
        const draftLayout=await page.evaluate(()=>{
          const draft=document.querySelector('#view .fu-draft');
          const copy=draft?.parentElement.querySelector('[data-act="copyFu"]');
          return {
            scroll:document.documentElement.scrollWidth,
            width:innerWidth,
            draftWidth:draft?.clientWidth,
            draftScroll:draft?.scrollWidth,
            copyHeight:copy?.getBoundingClientRect().height,
          };
        });
        assert.ok(draftLayout.draftWidth>0&&draftLayout.draftScroll<=draftLayout.draftWidth,`${id}: follow-up draft reflows at 200% text: ${JSON.stringify(draftLayout)}`);
        assert.ok(draftLayout.scroll<=draftLayout.width,`${id}: follow-up view has no horizontal overflow at 200% text: ${JSON.stringify(draftLayout)}`);
        assert.ok(draftLayout.copyHeight>=44,`${id}: copy-note control keeps a 44px target at 200% text: ${JSON.stringify(draftLayout)}`);
      }
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
