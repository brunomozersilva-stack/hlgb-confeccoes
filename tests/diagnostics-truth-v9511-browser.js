'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:850}});
  await page.goto('http://127.0.0.1:4173/tests/diagnostics-truth-v9511-fixture.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.hlgbDiagnosticsCenter?.issueSummary9511==='function',null,{timeout:20000});
  const initial=await page.evaluate(async()=>{
   const old=Array.from({length:127},(_,i)=>({id:'old-'+i,status:'Aberto',priority:'Alta',title:'Falha antiga',
    sourceType:'save',lastSeenAt:'2026-09-01T10:00:00Z'}));
   const current={id:'new',status:'Aberto',priority:'Crítica',title:'Falha agora',sourceType:'save',lastSeenAt:new Date().toISOString()};
   window.__fakeCloudData.systemIssues=[...old,current];
   window.openHlgbDiagnosticsCenter();
   await window.hlgbDiagnosticsRefresh();
   const a=window.hlgbDiagnosticsCenter.issueSummary9511();
   const cards=document.getElementById('hlgbDgCards').innerText;
   return {a,cards,refresh:window.hlgbDiagnosticsCenter.refreshStatus9511()};
  });
  assert.equal(initial.a.recent,1,'historical 127 must not be counted as fresh');
  assert.equal(initial.a.highRecent,1);
  assert.equal(initial.a.historical,127);
  assert.equal(initial.a.openTotal,128);
  assert(initial.cards.includes('Ocorrências recentes (15 min)'));
  assert(initial.cards.includes('Última atualização confirmada'));
  assert(initial.refresh.confirmed===true);
  const updated=await page.evaluate(async()=>{
   window.__fakeCloudData.systemIssues.push({
    id:'new-2',status:'Aberto',priority:'Média',title:'Outro erro recente',lastSeenAt:new Date().toISOString()});
   const ok=await window.hlgbDiagnosticsRefresh();
   return {ok,summary:window.hlgbDiagnosticsCenter.issueSummary9511(),
    cards:document.getElementById('hlgbDgCards').innerText};
  });
  assert.equal(updated.summary.recent,2,'Refresh must read the newest cloud issues');
  assert.equal(updated.summary.highRecent,1);
  assert.equal(updated.summary.historical,127);
  assert(updated.cards.includes('Última atualização confirmada'));
  const failure=await page.evaluate(async()=>{
   window.__fakeCloudError=true;
   const ok=await window.hlgbDiagnosticsRefresh();
   return {ok,summary:window.hlgbDiagnosticsCenter.issueSummary9511(),
    cards:document.getElementById('hlgbDgCards').innerText,
    state:window.hlgbDiagnosticsCenter.refreshStatus9511()};
  });
  assert.equal(failure.ok,false,'cloud fetch error must be disclosed');
  assert.equal(failure.summary.recent,2,'a failed refresh must not erase cached issues');
  assert(failure.state.error.includes('não foi confirmada'));
  assert(failure.cards.includes('Falha na atualização'));
  console.log('PASS v95.11 '+engine.name()+': 127 historical do not become live, cloud refresh changes numbers, failed refresh warns');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});