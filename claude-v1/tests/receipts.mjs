// Set BEACON_VERIFY=/path/to/beacon_verify.py to run the optional independent verifier.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox']});
const page = await browser.newPage({viewport:{width:390,height:844}});
const base = process.env.BASE_URL || 'http://127.0.0.1:8084/';
try {
  await page.addInitScript(() => {
    window.__sharedTouches=[];
    const open=indexedDB.open.bind(indexedDB);
    indexedDB.open=(name,...args)=>{if(name==='r4-beacon')window.__sharedTouches.push(`idb:${name}`);return open(name,...args)};
    for(const method of ['getItem','setItem','removeItem']){const original=Storage.prototype[method];Storage.prototype[method]=function(key,...args){if(key==='r4-beacon-head')window.__sharedTouches.push(`ls:${key}`);return original.call(this,key,...args)}}
    const sample=async()=>{};
    sample.limits=async()=>({});
    sample.json=async()=>[{name:'Maya Test',role:'VP',company:'Example',persona:'exec',topics:['ai'],note:'test'}];
    window.claude={use:async name=>name==='sample'?sample:null};
  });
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.R4Receipts);
  await page.locator('.tab[data-tab="people"]').click();
  await page.locator('[data-act="importOpen"][data-kind="people"]').click();
  await page.locator('#f-paste').fill('Maya Test, VP, Example');
  await page.locator('#sheet-form button[type="submit"]').click();
  await page.waitForSelector('#sheet-form');
  await page.locator('#sheet-form button[type="submit"]').click();
  await page.waitForFunction(async()=> (await R4Receipts.list()).some(r=>r.event_type==='ai.inference'));
  const receipts=await page.evaluate(()=>R4Receipts.list());
  const inference=receipts.find(r=>r.event_type==='ai.inference');
  assert.equal(inference.app,'claude');
  assert.equal(inference.action,'claude.people.parse');
  assert.equal(inference.vendor,'anthropic'); assert.equal(inference.model,'claude-artifact-sample');
  assert.ok(inference.action_detail.modelTier); assert.ok(inference.latency_ms>=0);
  assert.match(inference.prompt_hash,/^sha256:/); assert.match(inference.result_hash,/^sha256:/);
  assert.ok(receipts.some(r=>r.event_type==='ai.accepted'));
  assert.equal((await page.evaluate(()=>R4Receipts.verify())).ok,true);
  const exported=await page.evaluate(()=>R4Receipts.exportData());
  const manifest=JSON.parse(exported.bundle).manifest;
  assert.equal(manifest.app,'claude');
  if (process.env.BEACON_VERIFY) {
    const work=mkdtempSync(path.join(tmpdir(),'claude-beacon-'));
    try {
      const ndjson=path.join(work,'receipts.ndjson'), pem=path.join(work,'public-key.pem');
      writeFileSync(ndjson,exported.ndjson); writeFileSync(pem,exported.pem);
      const result=spawnSync('python3',[process.env.BEACON_VERIFY,'--format=runtime','--public-key',pem,ndjson],{encoding:'utf8'});
      assert.equal(result.status,0,`${result.stdout}\n${result.stderr}`);
      console.log(result.stdout.trim());
    } finally { rmSync(work,{recursive:true,force:true}); }
  } else {
    console.log('beacon-verify step skipped (set BEACON_VERIFY=/path/to/beacon_verify.py)');
  }
  for (let iteration = 0; iteration < 5; iteration++) {
    const context = await browser.newContext({viewport:{width:390,height:844}});
    const [first, second] = await Promise.all([context.newPage(), context.newPage()]);
    await Promise.all([first.goto(base,{waitUntil:'domcontentloaded'}), second.goto(base,{waitUntil:'domcontentloaded'})]);
    await Promise.all([first.waitForFunction(()=>window.R4Receipts), second.waitForFunction(()=>window.R4Receipts)]);
    await Promise.all([
      first.evaluate(()=>R4Receipts.record('test.concurrent','claude.first-launch.a',{iteration:0},{ok:true})),
      second.evaluate(()=>R4Receipts.record('test.concurrent','claude.first-launch.b',{iteration:0},{ok:true})),
    ]);
    const fresh = await first.evaluate(async()=>{
      const entries=await R4Receipts.list();
      const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('r4-beacon-claude');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
      const keys=await new Promise((resolve,reject)=>{const r=db.transaction('keys','readonly').objectStore('keys').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
      return {entries,keys,verification:await R4Receipts.verify()};
    });
    assert.equal(fresh.entries[0].seq,1); assert.equal(fresh.entries[0].action,'key.created');
    assert.equal(fresh.entries.filter(r=>r.action==='key.created').length,1);
    assert.deepEqual(fresh.entries.map(r=>r.seq),fresh.entries.map((_r,i)=>i+1));
    assert.equal(fresh.keys.filter(k=>k.id==='signing').length,1);
    assert.equal(fresh.keys.filter(k=>k.id==='device').length,1);
    assert.equal(fresh.verification.ok,true);
    await context.close();
  }
  console.log('first-launch concurrency ok: five fresh two-page contexts; key.created seq 1; contiguous; one signing key; verify ok');
  const shared = await browser.newContext({viewport:{width:390,height:844}});
  const [listPage, writePage] = await Promise.all([shared.newPage(), shared.newPage()]);
  await Promise.all([listPage.goto(base,{waitUntil:'domcontentloaded'}), writePage.goto(base,{waitUntil:'domcontentloaded'})]);
  await Promise.all([listPage.waitForFunction(()=>window.R4Receipts), writePage.waitForFunction(()=>window.R4Receipts)]);
  await Promise.all([listPage, writePage].map((tab) => tab.evaluate(() => R4Receipts.init())));
  await listPage.locator('#settings-trigger').click();
  await listPage.waitForSelector('#receipt-list .receipt-row');
  const expectedCount = (await listPage.evaluate(() => R4Receipts.list().then(entries=>entries.length))) + 3;
  await Promise.all([0,1,2].map(i=>writePage.evaluate(i=>R4Receipts.record('test.cross-tab',`claude.cross-tab.${i}`,{i},{ok:true}),i)));
  await listPage.waitForFunction(async(expected)=>{
    const matches = async () => document.querySelectorAll('#receipt-list .receipt-row').length===expected&&(await R4Receipts.list()).length===expected;
    if (!await matches()) return false;
    await new Promise(resolve=>setTimeout(resolve,500));
    return matches();
  },expectedCount,{timeout:1500});
  await shared.close();
  console.log('cross-tab refresh ok: settings receipt list matched 3 remote writes without interaction');
  const dbName='r4-beacon-claude';
  const mutate=async(seq, mode, receipt)=>page.evaluate(async({seq,mode,receipt,dbName})=>{
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(dbName);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
    await new Promise((resolve,reject)=>{const tx=db.transaction('receipts','readwrite');if(mode==='delete')tx.objectStore('receipts').delete(seq);else tx.objectStore('receipts').put(receipt);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
  },{seq,mode,receipt,dbName});
  const target=receipts.find(r=>r.event_type==='ai.inference');
  await mutate(target.seq,'put',{...target,action:'tampered'});
  const tampered=await page.evaluate(()=>R4Receipts.verify()); assert.equal(tampered.ok,false);
  await mutate(target.seq,'put',target); assert.equal((await page.evaluate(()=>R4Receipts.verify())).ok,true);
  const final=await page.evaluate(()=>R4Receipts.list());
  await mutate(final.length,'delete');
  const truncated=await page.evaluate(()=>R4Receipts.verify()); assert.equal(truncated.ok,false); assert.equal(truncated.reason,'truncated');
  assert.deepEqual(await page.evaluate(()=>window.__sharedTouches),[]);
  assert.equal(await page.evaluate(()=>localStorage.getItem('r4-beacon-head-claude')!==null),true);
  console.log(`receipts ok: ${receipts.length} records; tamper seq ${tampered.firstBadSeq}; truncation seq ${truncated.firstBadSeq}; isolated storage`);
} finally { await browser.close(); }
