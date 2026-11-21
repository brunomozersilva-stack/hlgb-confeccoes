'use strict';
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const kind=process.env.HLGB_BROWSER==='webkit'?'webkit':'chromium';
const moduleName='routePlans';
async function launch(){
 const browser=await ({chromium,webkit})[kind].launch({headless:true});
 const context=await browser.newContext({serviceWorkers:'block'});
 const page=await context.newPage();
 await page.route('http://hlgb.test/',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"></head><body><main id="appShell"></main><div id="modal"><div id="modalContent"></div></div></body></html>'}));
 await page.goto('http://hlgb.test/');
 await page.evaluate(()=>{
  window.db={routePlans:[],factionMasters:[{id:'f1',name:'Facção Teste',address:'Endereço fictício'}],
    productionLocations:[],capacityAssignments:[],products:[],orders:[],production:[],labels:[],users:[]};
  window.localSaveOnly=()=>{};
  window.cloudAccessToken='synthetic-test';
  window.__saves=[];window.__remote=[];window.__confirmCalls=0;window.__confirmResult=false;
  window.confirm=()=>{window.__confirmCalls++;return window.__confirmResult};
  window.cloudRequest=async(path,opts)=>{
   if(opts?.method!=='GET'||!path.includes('module=eq.routePlans'))throw Error('Unexpected cloud access');
   if(path.includes('entity_id=eq.'))return window.__remote.filter(x=>String(x.entity_id)===decodeURIComponent(path.split('entity_id=eq.')[1].split('&')[0]));
   return window.__remote;
  };
  window.hlgbRecordSaveWithRetry=async(module,id,row)=>{
   if(module!=='routePlans')throw Error('Unexpected save module');
   window.__saves.push(JSON.parse(JSON.stringify(row)));
   const result={entity_id:String(row.id),module:'routePlans',revision:1,updated_at:new Date().toISOString(),deleted_at:null,data:JSON.parse(JSON.stringify(row))};
   window.__remote.push(result);
   return {applied:true,data:row,revision:1};
  };
  window.openModal=(title,html,fn)=>{
   document.getElementById('modalContent').innerHTML='<h2>'+title+'</h2>'+html;
   document.getElementById('modal').classList.add('show');window.modalSave=fn;
  };
  window.closeModal=()=>{
   document.getElementById('modal').classList.remove('show');window.modalSave=null;
  };
 });
 await page.addScriptTag({path:'release-operations-pack.js'});
 return {browser,context,page};
}
async function createWal(page,row){
 await page.evaluate(async row=>{
  await new Promise((resolve,reject)=>{
   const req=indexedDB.open('hlgb_durable_wal',1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('entries'))req.result.createObjectStore('entries',{keyPath:'key'})};
   req.onsuccess=()=>{const db=req.result,tx=db.transaction('entries','readwrite');
    tx.objectStore('entries').put({key:'routePlans|'+row.id,module:'routePlans',id:row.id,opId:'op-'+row.id,deleted:false,data:row,state:'pending'});
    tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)};
   req.onerror=()=>reject(req.error);
  });
 },row);
}
async function protectRemote(){
 const {browser,context,page}=await launch();
 try{
  const local={id:'r-pending',date:'2026-11-21',driver:'Teste',status:'Planejada',notes:'',
   stops:[{name:'ALTERAÇÃO LOCAL PENDENTE',order:1}],createdAt:'2026-11-21T10:00:00Z',updatedAt:'2026-11-21T10:00:00Z'};
  const remote={...local,stops:[{name:'VERSÃO REMOTA ANTIGA',order:1}],updatedAt:'2026-11-21T15:00:00Z'};
  const normal={...local,id:'r-normal',stops:[{name:'NOVO DO SERVIDOR',order:1}]};
  const oldNormal={...normal,stops:[{name:'ANTIGO NO COMPUTADOR',order:1}],updatedAt:'2026-11-20T10:00:00Z'};
  await page.evaluate(({local,oldNormal,remote,normal})=>{
   window.db.routePlans=[local,oldNormal];
   window.__remote=[
    {entity_id:local.id,module:'routePlans',revision:2,updated_at:'2026-11-21T15:00:00Z',deleted_at:null,data:remote},
    {entity_id:normal.id,module:'routePlans',revision:2,updated_at:'2026-11-21T15:00:00Z',deleted_at:null,data:normal}
   ];
  },{local,oldNormal,remote,normal});
  await createWal(page,local);
  const observed=await page.evaluate(async()=>{
   await window.hlgbRouteSync9453.refresh(true);
   const rows=window.db.routePlans.map(x=>({id:x.id,stops:x.stops?.map(y=>y.name)}));
   const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('hlgb_durable_wal');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
   const wal=await new Promise((resolve,reject)=>{const tx=db.transaction('entries','readonly'),req=tx.objectStore('entries').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
   db.close();
   return {rows,wal:wal.map(x=>({id:x.id,opId:x.opId}))};
  });
  assert.equal(observed.rows.find(x=>x.id==='r-pending').stops[0],'ALTERAÇÃO LOCAL PENDENTE',
   'IndexedDB WAL must protect pending local route from remote replacement');
  assert.equal(observed.rows.find(x=>x.id==='r-normal').stops[0],'NOVO DO SERVIDOR',
   'Unrelated server route must continue refreshing');
  assert.deepEqual(observed.wal,[{id:'r-pending',opId:'op-r-pending'}],
   'Read-only refresh must not remove or change WAL');
  console.log('PASS '+kind+' IndexedDB-only WAL protects route; unrelated remote refresh survives; no WAL write');
 }finally{await context.close();await browser.close()}
}
async function preventUnintendedDuplicate(){
 const {browser,context,page}=await launch();
 try{
  await page.evaluate(()=>window.newRoute9249());
  await page.evaluate(()=>window.addRouteStop9249());
  await page.locator('#opsRouteStops .ops-route-loc').first().selectOption('0');
  await page.evaluate(()=>window.modalSave());
  let first=await page.evaluate(()=>({saved:window.__saves.length,rows:window.db.routePlans.length}));
  assert.equal(first.saved,1);assert.equal(first.rows,1);
  await page.evaluate(()=>window.newRoute9249());
  await page.evaluate(()=>window.addRouteStop9249());
  await page.locator('#opsRouteStops .ops-route-loc').first().selectOption('0');
  await page.evaluate(()=>window.modalSave());
  let blocked=await page.evaluate(()=>({saved:window.__saves.length,modal:document.getElementById('modal').classList.contains('show'),
   confirmations:window.__confirmCalls,status:document.getElementById('opsRouteCloudStatus9534').textContent}));
  assert.equal(blocked.saved,1,'Identical new route without consent must not be saved twice');
  assert.equal(blocked.modal,true,'User must be able to edit or confirm');
  assert.ok(blocked.confirmations>0);
  assert.match(blocked.status,/Rota igual/);
  await page.evaluate(()=>{window.__confirmResult=true});
  await page.evaluate(()=>window.modalSave());
  const allowed=await page.evaluate(()=>({saved:window.__saves.length,ids:window.__saves.map(x=>x.id)}));
  assert.equal(allowed.saved,2,'Explicit confirmation preserves ability to create intentional duplicate');
  assert.notEqual(allowed.ids[0],allowed.ids[1],'Distinct routes must have distinct IDs');
  console.log('PASS '+kind+' duplicate route confirmation protects from extra saves, explicit creation still works');
 }finally{await context.close();await browser.close()}
}
(async()=>{await protectRemote();await preventUnintendedDuplicate()})().catch(e=>{console.error(e);process.exitCode=1});
