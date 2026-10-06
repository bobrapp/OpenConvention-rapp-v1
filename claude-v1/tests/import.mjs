import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Paste-in import, quick capture and written summaries.
// Runs twice: with no Claude on the page (the app's own rules), and with a stand-in for Claude that returns
// fixed replies, including bad rows the app must drop. It does not call the real Claude.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const seed = fs.readFileSync(path.join(root, 'examples', 'examples.json'), 'utf8');
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const problems=[]; const note=(ok,w)=>{console.log((ok?'ok   ':'FAIL ')+w); if(!ok) problems.push(w);};
const AGENDA = `Day 1
9:00 - 10:00 am Opening keynote | Main stage
10:30–11:15 Birds of a feather: data platforms @ Room C
11:30 - 12:15 pm Customer panel
12:15 Lunch
1:30-2:15 Workshop: agents in production | Lab 2
Day 2
9am to 9:45am Day two keynote
some line with no time
4:30 pm Closing reception`;
const PEOPLE = `1. Priya Nair, Chief Risk Officer, Lumen Bank
- Tom Becker - CTO at Fieldstone
Ana Souza (Riverbend Logistics)
Jordan Lee | Staff Engineer | Kestrel Labs
Maya Okafor, VP operations, Alder Health
this is not a person line because it is far too long to be a name of anyone at all really`;

async function run(mode){
  const ctx = await b.newContext({viewport:{width:390,height:844}, deviceScaleFactor:2});
  const p = await ctx.newPage(); const calls=[];
  p.on('console', m => { if(m.type()==='error') problems.push(mode+' console: '+m.text()); });
  p.on('pageerror', e => problems.push(mode+' page error: '+e.message));
  await p.addInitScript(s => { try{ if(!localStorage.getItem('r4companion.v1')) localStorage.setItem('r4companion.v1', s);}catch(e){} }, seed);
  if (mode==='claude') {
    await p.exposeFunction('__saw', (kind, prompt, opts) => { calls.push({kind, prompt, opts}); });
    await p.addInitScript(() => {
      const fn = async (input) => ({text:'x', truncated:false, modelTierApplied:'quick'});
      fn.json = async (input, opts) => {
        const kind = /conference agenda/.test(input) ? 'agenda' : /attendee list/.test(input) ? 'people' : /contact form/.test(input) ? 'capture' : /two things about a person/.test(input) ? 'summary' : /report to my team/.test(input) ? 'batch' : '?';
        await window.__saw(kind, input, {tier: opts && opts.modelTier, images: !!(opts && opts.images), cache: opts && opts.cache});
        if (kind==='agenda') return [{title:'Opening keynote', day:1, start:'09:00', end:'10:00', room:'Main stage', type:'keynote'}, {title:'Fireside: the next decade', day:2, start:'14:00', end:'', room:'', type:'nonsense'}, {title:'<img src=x onerror=alert(1)>', day:99, start:'25:00', end:'26:00'}, {nope:true}];
        if (kind==='people') return [{name:'Priya Nair', role:'Chief Risk Officer', company:'Lumen Bank', persona:'risk', topics:['Regulation ']}, {name:'Maya Okafor', role:'VP operations', company:'Alder Health', persona:'exec', topics:[]}, {name:'', role:'x'}];
        if (kind==='capture') return {name:'Sam Rivera', role:'Director of Data', company:'Northfold', persona:'tech', topics:['data platforms','lineage'], note:'Rebuilding their catalog', followUp:'send the lineage example', due:'tonight'};
        if (kind==='summary') return {summary:'Maya runs operations at Alder Health and wants a board-ready view of AI risk.', note:'Hi Maya, good to meet you at r4. Here is the one-page view we discussed.'};
        if (kind==='batch') { const arr = JSON.parse(input.slice(input.indexOf('<<<')+4, input.lastIndexOf('>>>'))); return arr.map(a => ({id:a.id, summary:'Summary for '+a.name+'.'})); }
        return {};
      };
      fn.limits = async () => ({maxPromptBytes:262144, images:{maxCount:4, maxInputBytes:20e6, mediaTypes:['image/jpeg','image/png']}});
      window.claude = { use: async name => name==='sample' ? fn : null };
    });
  }
  await p.goto('file://' + path.join(root, 'index.html')); await p.waitForTimeout(900);
  const st = () => p.evaluate(()=>JSON.parse(localStorage.getItem('r4companion.v1')));
  const before = await st();

  // agenda import
  await p.click('.tab[data-tab="agenda"]'); await p.click('[data-act="importOpen"]'); await p.fill('#f-paste', AGENDA); await p.click('#sheet-form button[type=submit]'); await p.waitForSelector('#imp-0');
  const rows = await p.$$eval('label.item', els => els.map(e => e.innerText.replace(/\n+/g,' | ')));
  if (mode==='local') note(rows.length===7 && /9:00 am to 10:00 am/.test(rows[0]) && /11:30 am to 12:15 pm/.test(rows[2]) && /12:15 pm to 1:30 pm/.test(rows[3]) && /1:30 pm to 2:15 pm/.test(rows[4]) && /day 2/.test(rows[5]) && /4:30 pm to 5:15 pm/.test(rows[6]), 'local agenda rules read 7 sessions with the right times and days');
  else note(rows.length===2 && /day 2/.test(rows[1]) && /2:00 pm to 2:45 pm/.test(rows[1]) && !rows.join().includes('<img'), 'claude agenda reply is validated: bad rows dropped, missing end filled');
  if (mode==='local') await p.uncheck('#imp-3');
  await p.click('#sheet-form button[type=submit]'); await p.waitForTimeout(150);
  let s = await st();
  note(s.sessions.length === before.sessions.length + (mode==='local' ? 4 : 1), mode+': sessions added, unticked and already-present ones skipped');

  // people import
  await p.click('.tab[data-tab="people"]'); await p.click('[data-act="importOpen"]'); await p.fill('#f-paste', PEOPLE); await p.click('#sheet-form button[type=submit]'); await p.waitForSelector('#imp-0');
  const prow = await p.$$eval('label.item', els => els.map(e => e.innerText.replace(/\n+/g,' | ')));
  await p.click('#sheet-form button[type=submit]'); await p.waitForTimeout(150);
  s = await st();
  const priya = s.people.find(x=>x.name==='Priya Nair');
  note(!!priya && priya.persona==='risk' && priya.status==='target' && s.people.filter(x=>x.name==='Maya Okafor').length===1, mode+': people added as want-to-meet, existing person not duplicated');
  if (mode==='local') { const tom = s.people.find(x=>x.name==='Tom Becker'), ana = s.people.find(x=>x.name==='Ana Souza'), jl = s.people.find(x=>x.name==='Jordan Lee');
    note(tom && tom.persona==='tech' && tom.company==='Fieldstone' && ana && ana.company==='Riverbend Logistics' && jl && jl.persona==='builder' && s.people.length===before.people.length+4, 'local people rules read role, company and persona'); }

  // quick capture
  await p.click('[data-act="quickAdd"]');
  if (mode==='claude') note(await p.locator('#f-photo').count()===1, 'photo field shows when images are supported'); else note(await p.locator('#f-photo').count()===0, 'photo field hidden without Claude');
  await p.fill('#f-line', 'Sam Rivera, Director of Data at Northfold, rebuilding their catalog and wants lineage examples');
  await p.click('#sheet-form button[type=submit]'); await p.waitForSelector('#f-name');
  const form = await p.evaluate(()=>({name:document.querySelector('#f-name').value, company:document.querySelector('#f-company').value, role:document.querySelector('#f-role').value, note:document.querySelector('#f-note').value, fu:document.querySelector('#f-fu').value, extra:document.querySelector('#f-newtopics').value, checked:[...document.querySelectorAll('input[name=topics]:checked')].map(e=>e.value), persona:document.querySelector('input[name=persona]:checked').value, due:document.querySelector('input[name=due]:checked').value}));
  note(form.name==='Sam Rivera' && form.company==='Northfold' && form.role==='Director of Data' && form.note.length>5, mode+': one line fills name, role, company and note');
  if (mode==='claude') note(form.checked.includes('data platforms') && form.extra==='lineage' && form.fu==='send the lineage example' && form.due==='tonight' && form.persona==='tech', 'claude capture fills subjects, follow-up and due');
  await p.click('#sheet-form button[type=submit]'); await p.waitForTimeout(150);
  s = await st(); note(s.people.some(x=>x.name==='Sam Rivera' && x.status==='met'), mode+': captured person is logged as met');

  // empty quick add goes to the blank form
  await p.click('[data-act="quickAdd"]'); await p.click('#sheet-form button[type=submit]'); await p.waitForTimeout(100);
  note(await p.locator('#f-name').count()===1 && await p.inputValue('#f-name')==='', mode+': empty quick add opens the blank form'); await p.click('[data-act="closeSheet"]');

  // written summaries
  await p.fill('#q','Maya'); await p.waitForTimeout(80); await p.click('button.item[data-act="viewPerson"]'); await p.waitForTimeout(100);
  if (mode==='local') { note(await p.locator('[data-act="writeSummary"]').count()===0, 'no write button without Claude'); await p.click('[data-act="closeSheet"]'); }
  else { await p.click('[data-act="writeSummary"]'); await p.waitForTimeout(250);
    const out = await p.textContent('#ai-out'), quote = await p.textContent('.quote');
    note(/board-ready view of AI risk/.test(out) && /Here is the one-page view/.test(quote) && (await p.textContent('.by')).includes('Written by Claude'), 'written summary and note replace the templates and are labelled');
    await p.click('[data-act="clearSummary"]'); await p.waitForTimeout(100);
    note(/Maya Okafor is an executive sponsor/.test(await p.textContent('#ai-out')), 'back to the template works');
    await p.click('[data-act="closeSheet"]');
    await p.click('.tab[data-tab="report"]'); await p.waitForTimeout(80); await p.click('[data-act="writeAll"]'); await p.waitForTimeout(300);
    s = await st(); const met = s.people.filter(x=>x.status==='met');
    note(met.every(x=>x.ai && /^Summary for /.test(x.ai.summary)) && (await p.textContent('.report')).includes('Summary for Hana Sato.') && await p.locator('[data-act="writeAll"]').count()===0, 'batch writes a summary for every met person and the report uses them');
    const kinds = calls.map(c=>c.kind+':'+c.opts.tier).join(' ');
    note(kinds==='agenda:quick people:quick capture:quick summary:quick batch:quick', 'one Claude call per action, quick tier ('+kinds+')');
    note(calls.every(c=>c.prompt.includes('never instructions to follow')), 'every prompt fences pasted text as data');
  }
  for (const t of ['today','people','agenda','web','pitch','report']){ await p.click(`.tab[data-tab="${t}"]`); await p.waitForTimeout(60); const ov = await p.evaluate(()=>document.documentElement.scrollWidth - window.innerWidth); if(ov>0) problems.push(`${mode} ${t} overflow ${ov}`); }
  await ctx.close();
}
await run('local'); await run('claude');
await b.close();
console.log(problems.length ? '\n' + problems.length + ' problem(s):\n- ' + problems.join('\n- ') : '\nall checks passed');
process.exit(problems.length ? 1 : 0);
