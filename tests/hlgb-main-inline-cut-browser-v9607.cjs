'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'hlgb-modules/producao/corte-producao-quantidade-v9607.js'),'utf8');
const app=fs.readFileSync(path.join(root,'app9240.html'),'utf8');
const marker='<script src="./hlgb-modules/producao/corte-producao-quantidade-v9607.js"></script>';
assert.equal(app.split(marker).length-1,1,'a script precisa carregar exatamente uma vez e sem async');
const mode=process.env.HLGB_BROWSER||'chromium';
if(!['chromium','webkit'].includes(mode))throw Error('Unsupported browser '+mode);
async function main(){
 const browser=await ({chromium,webkit})[mode].launch({headless:true});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  const page=await context.newPage();
  let sourceRequests=0,blocked=0;
  await page.route('**/*',route=>{
   const url=route.request().url();
   if(url==='http://hlgb.test/'){
    return route.fulfill({status:200,contentType:'text/html;charset=utf-8',
      body:'<!doctype html><html><body><script>'+
       'window.db={products:[{id:"p1",name:"Produto"}],orders:[{id:"o1",grade:[{productId:"p1",qty:100}]}],cuts:[{id:"c1",orderId:"o1",productId:"p1",status:"Finalizado",actualCutGrade:[{productId:"p1",qty:80}],pieces:100,finishedAt:"2026-11-19"}],production:[]};'+
       'window.__testSaves=0;window.localSaveOnly=()=>window.__testSaves++;window.hlgbRecordPendingStore=()=>{};window.hlgbQueueNormalizedSync=()=>{};'+
       '</script>'+marker+'</body></html>'});
   }
   if(url==='http://hlgb.test/hlgb-modules/producao/corte-producao-quantidade-v9607.js'){
    sourceRequests++;
    return route.fulfill({status:200,contentType:'application/javascript;charset=utf-8',body:js});
   }
   blocked++;return route.abort('blockedbyclient');
  });
  await page.goto('http://hlgb.test/',{waitUntil:'load',timeout:15000});
  const outcome=await page.evaluate(()=>{
   const found=typeof window.syncFinalizedCutsToProduction==='function';
   const alias=window.hlgbSyncFinalizedCutsToProductionV9240===window.syncFinalizedCutsToProduction;
   if(!found)return {found,alias};
   const updated=window.syncFinalizedCutsToProduction();
   return {found,alias,updated,planned:window.db.production.map(p=>p.planned),
    saves:window.__testSaves,remoteConnections:performance.getEntriesByType('resource').filter(x=>/supabase|http/i.test(x.name)&&!x.name.includes('hlgb.test')).length};
  });
  assert.equal(sourceRequests,1,'um único carregamento síncrono na posição do HTML comercial');
  assert.equal(blocked,0,'nenhuma requisição comercial/externa disparada');
  assert.equal(outcome.found,true);
  assert.equal(outcome.alias,true);
  assert.equal(outcome.updated,true);
  assert.deepEqual(outcome.planned,[80]);
  assert.equal(outcome.saves,1);
  assert.equal(outcome.remoteConnections,0);
  console.log('PASS '+mode+' HLGB cut production external script loaded once; effective quantity 80, no production network');
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
