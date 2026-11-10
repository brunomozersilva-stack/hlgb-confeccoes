'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),{chromium,webkit}=require('playwright');
const app=fs.readFileSync('app9240.html','utf8');
function section(a,b){
 const x=app.indexOf(a),y=app.indexOf(b,x+a.length);
 assert.ok(x>=0&&y>x,'Required source section '+a);
 return app.slice(x,y);
}
const modules=section('const HLGB_RECORD_MODULES=[','const HLGB_RECORD_RPC_OMITTED_9535=');
const gaps=section('const HLGB_RECORD_RPC_OMITTED_9535=[','const HLGB_RECORD_PENDING_KEY=');
const pending=section('function hlgbRecordPendingIdentitySet9535(){','function hlgbRecordPendingClear()');
const load=section('async function hlgbRecordLoadDirect(since=null){','async function hlgbLoadNormalizedCore(');
const rpc=section('async function hlgbRecordRpcSave(','async function hlgbNormalizedSyncModule(');
const inbound=section('function hlgbApplyRecordRow(row){','function hlgbRenderIncomingRecord(');
const prelude=[
 "const HLGB_OWNER_EMAIL='owner@example.invalid';",
 "let cloudUser={email:HLGB_OWNER_EMAIL};",
 "let db={orders:[],routePlans:[],labelTemplates:[],operationalWriteoffs:[]};window.db=db;",
 "let hlgbRecordSnapshots={},hlgbRecordLastSeen={},hlgbRecordGlobalLastSeen='';",
 "const hlgbRecordReadable=new Set();",
 "const HLGB_RECORD_PENDING_KEY='hlgb_records_pending_v91';",
 "for(const m of HLGB_RECORD_MODULES){hlgbRecordSnapshots[m]=new Map();hlgbRecordLastSeen[m]=''}",
 "function hlgbRecordPendingRead(){try{return JSON.parse(localStorage.getItem(HLGB_RECORD_PENDING_KEY)||'null')}catch(_){return null}}",
 "function hlgbRecordPendingAuthoritativeRows917(){return Promise.resolve([])}",
 "function hlgbRecordClone(v){return JSON.parse(JSON.stringify(v))}",
 "function normEmail(v){return String(v||'').trim().toLowerCase()}",
 "function hlgbRecordId(module,row){return String(row?.id??row?.__hlgbId??'')}",
 "function hlgbRecordDataEqual(a,b){return JSON.stringify(a)===JSON.stringify(b)}",
 "function hlgbRecordHydrateData(module,row){return {...row.data}}",
 "function hlgbRecordRowValue(row){return {...row.data}}",
 "function hlgbRecordLocalMap(module){return new Map((db[module]||[]).map(x=>[String(x.id),x]))}",
 "function hlgbRecordSnapshotRows(module,rows){hlgbRecordSnapshots[module]=new Map(rows.map(r=>[String(r.entity_id),{data:r.data,revision:r.revision,updated_at:r.updated_at,deleted_at:r.deleted_at}]))}",
 "function hlgbPendingExplicitRestore917(){return false}",
 "function cloudMergeThreeWay(base,local,remote){return {...remote,...local}}",
 "async function cloudRequest(path,options={}){return window.__mockSupabase(path,options)}"
].join('\n')+'\n';
async function main(){
 const remote=new Map(),calls=[];
 const now='2026-11-10T18:00:00.000Z';
 const rpcModules=new Set(['orders','production','cuts','products','materials','factions','payroll','operationalWriteoffs']);
 async function backend(path,opts={}){
  calls.push({path,method:opts.method});
  if(path==='rpc/hlgb_save_record'){
   const input=JSON.parse(opts.body),key=input.p_module+'|'+input.p_entity_id,old=remote.get(key);
   if(old&&input.p_expected_revision!==old.revision)
    return [{applied:false,revision:old.revision,data:old.data}];
   const row={module:input.p_module,entity_id:input.p_entity_id,data:input.p_data,
    revision:(old?.revision||0)+1,updated_at:now,deleted_at:null,updated_by:null};
   remote.set(key,row);
   return [{applied:true,...row}];
  }
  if(path==='rpc/hlgb_load_records_page'){
   const input=JSON.parse(opts.body);
   const rows=[...remote.values()].filter(r=>rpcModules.has(r.module)&&(input.p_since==null||r.updated_at>=input.p_since));
   return {rows,has_more:false,server_time:now};
  }
  if(path.startsWith('hlgb_records?')){
   const url=new URL('https://hlgb.invalid/'+path),params=url.searchParams;
   let rows=[...remote.values()];
   if(params.get('module')?.startsWith('in.(')){
    const allowed=new Set(params.get('module').slice(4,-1).split(','));
    rows=rows.filter(r=>allowed.has(r.module));
   }
   const since=params.get('updated_at');
   if(since?.startsWith('gte.'))rows=rows.filter(r=>r.updated_at>=since.slice(4));
   if(params.get('deleted_at')==='is.null')rows=rows.filter(r=>!r.deleted_at);
   const id=params.get('entity_id');
   if(id?.startsWith('eq.'))rows=rows.filter(r=>r.entity_id===id.slice(3));
   const offset=Number(params.get('offset')||0),limit=Number(params.get('limit')||500);
   return rows.slice(offset,offset+limit);
  }
  throw Error('Unexpected mock path '+path);
 }
 const chrome=await chromium.launch({headless:true}),safari=await webkit.launch({headless:true});
 try{
  async function pageFor(browser,label){
   const context=await browser.newContext(),page=await context.newPage();
   await page.route('https://hlgb.invalid/**',route=>route.fulfill({
    status:200,contentType:'text/html',body:'<!doctype html><html lang="pt-BR"><body>HLGB '+label+'</body></html>'
   }));
   await page.exposeFunction('__mockSupabase',(path,opts)=>backend(path,opts));
   await page.goto('https://hlgb.invalid/app');
   await page.addScriptTag({content:modules+gaps+prelude+pending+load+rpc+inbound});
   return {context,page};
  }
  const source=await pageFor(safari,'Safari'),receiver=await pageFor(chrome,'Chrome');
  try{
   await source.page.evaluate(async()=>{
    const row={id:'route-safari-1',date:'2026-11-10',driver:'Bruno',
     stops:[{name:'Roseli',carry:['Modelo A']},{name:'Luana',carry:['Modelo B']}]};
    const ack=await hlgbRecordSaveWithRetry('routePlans',row.id,row,false);
    if(ack.applied!==true)throw Error('Safari route write failed');
    db.routePlans=[row];
   });
   await receiver.page.evaluate(async()=>{await hlgbRecordLoadBundle({preserveLocal:false,since:null})});
   const chromeRoute=await receiver.page.evaluate(()=>db.routePlans.find(x=>x.id==='route-safari-1'));
   assert.equal(chromeRoute?.stops?.[1]?.name,'Luana');
   assert.equal(chromeRoute?.stops?.[0]?.name,'Roseli');
   await receiver.page.evaluate(async()=>{
    const row={id:'order-chrome-1',orderNumber:99,client:'Click Sophia',qty:2};
    await hlgbRecordSaveWithRetry('orders',row.id,row,false);db.orders.push(row);
   });
   await source.page.evaluate(async()=>await hlgbRecordLoadBundle({
    preserveLocal:true,since:'2026-11-10T16:00:00.000Z'}));
   const orderInSafari=await source.page.evaluate(()=>db.orders.find(x=>x.id==='order-chrome-1'));
   assert.equal(orderInSafari?.orderNumber,99);
   await source.page.evaluate(()=>{
    db.orders[0]={...db.orders[0],client:'Safeguarded Safari edit'};
    localStorage.setItem('hlgb_durable_wal_v1',JSON.stringify({entries:{
     'orders|order-chrome-1':{module:'orders',id:'order-chrome-1',opId:'abc-123'}
    }}));
   });
   const remoteRow=remote.get('orders|order-chrome-1');
   const protect=await source.page.evaluate(row=>hlgbApplyRecordRow({...row,revision:2,data:{...row.data,client:'Older Chrome copy'}}),remoteRow);
   assert.equal(protect,false);
   assert.equal(await source.page.evaluate(()=>db.orders[0].client),'Safeguarded Safari edit');
   assert.equal(remote.get('orders|order-chrome-1').data.client,'Click Sophia');
   assert.ok(calls.some(x=>x.path.includes('module=in.(routePlans')&&x.method==='GET'));
   console.log('PASS Safari→Chrome route + Chrome→Safari order + local WAL edit protected; mock writes only');
  }finally{await source.context.close();await receiver.context.close()}
 }finally{await safari.close();await chrome.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
