'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('release-hub-delivery-v9324.js','utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
const initial={id:'hub-test-1',flow:'Saída',date:'2026-11-23',description:'Fornecedor teste',category:'Matéria-prima',
 value:25,status:'Previsto',updatedAt:'2026-11-01T00:00:00Z'};
function setup(){
 const server=new Map([['hub-test-1',{module:'hubFinanceEntries',entity_id:'hub-test-1',revision:4,
  data:clone(initial),deleted_at:null,updated_at:'2026-11-01T00:00:00Z'}]]);
 const db={hubFinanceEntries:[clone(initial)]},snaps={hubFinanceEntries:new Map([['hub-test-1',{revision:4,data:clone(initial),deleted_at:null}]])};
 const status=[],calls=[],events=[];let writes=0,dropAck=false,corruptRead=false,forceOkOnly=false;
 const win={db,HLGB_RELEASE_VERSION:'94.82',hlgbRecordSnapshots:snaps,dispatchEvent:e=>events.push(e.detail||{})};
 const navigator={onLine:true};
 win.cloudRequest=async(p,o)=>{
  assert.match(p,/hlgb_records\?select/);assert.equal(o.method,'GET');
  const id=decodeURIComponent((p.match(/entity_id=eq\.([^&]+)/)||[])[1]||'');
  const row=server.get(id);if(!row)return [];
  const result=clone(row);if(corruptRead)result.data.value=Number(result.data.value)+100;
  return [result];
 };
 win.hlgbRecordRpcSave=async(m,id,payload,rev,del)=>{
  assert.equal(m,'hubFinanceEntries');assert.equal(del,false);calls.push({id,rev,payload:clone(payload)});
  const existing=server.get(id);
  if(rev!==(existing?.revision||0))return {applied:false,reason:'revision-conflict'};
  if(forceOkOnly)return {ok:true};
  const next={module:m,entity_id:id,data:clone(payload),revision:rev+1,deleted_at:null,
   updated_at:new Date().toISOString()};
  server.set(id,next);
  if(dropAck)throw new Error('network timeout after remote commit');
  return {applied:true,revision:next.revision,data:clone(payload),deleted_at:null};
 };
 const ctx={window:win,db,document:{querySelector:()=>null},navigator,console,
   localStorage:{getItem:()=>null,setItem:()=>{writes++;throw new Error('QuotaExceededError')}},
   setInterval:()=>1,clearInterval:()=>{},setTimeout:()=>1,Date,Math,JSON,
   structuredClone,CustomEvent:function(_type,opts){this.detail=opts.detail},
   setCloudStatus:(s,t)=>status.push({s,t})};
 ctx.localSaveOnly=()=>ctx.localStorage.setItem('large-db',JSON.stringify(db));
 vm.createContext(ctx);vm.runInContext(src,ctx);
 return {win,db,snaps,server,calls,status,events,navigator,
  get writes(){return writes},setDropAck:v=>dropAck=v,setCorruptRead:v=>corruptRead=v,setForceOkOnly:v=>forceOkOnly=v};
}
(async()=>{
 // REAL bottleneck from user's Safari: localStorage quota fails; cloud must still save.
 const a=setup(),updated={...clone(initial),value:56.4,updatedAt:new Date().toISOString()};
 const out=await a.win.hlgbHubSaveConfirmed(updated,false,{source:'edit-button',original:initial});
 assert.equal(out.applied,true);assert.equal(out.remoteVerified,true);assert.equal(out.revision,5);
 assert.equal(a.calls.length,1);assert.equal(a.calls[0].rev,4);
 assert.equal(a.server.get('hub-test-1').data.value,56.4);
 assert.equal(a.db.hubFinanceEntries[0].value,56.4);
 assert.equal(a.writes,1,'only local cache attempt may fail; no queue dependency');
 assert.equal(a.win.hlgbHubSaveTrace9483.status().outcome,'confirmed');
 assert.equal(a.win.hlgbHubSaveTrace9483.status().history.some(x=>x.phase==='rpc-ack'),true);
 // Same-ID retry after ACK lost must return readback, not issue a second CREATE.
 const b=setup(),creation={...clone(initial),id:'hub-test-2',value:81};
 b.setDropAck(true);
 await assert.rejects(b.win.hlgbHubSaveConfirmed(creation,false,{source:'create-button'}),/network timeout/);
 assert.equal(b.server.has('hub-test-2'),true);
 assert.equal(b.db.hubFinanceEntries.some(x=>x.id==='hub-test-2'),false);
 b.setDropAck(false);
 const retry=await b.win.hlgbHubSaveConfirmed(creation,false,{source:'create-button'});
 assert.equal(retry.fromReadback,true);assert.equal(retry.revision,1);
 assert.equal(b.calls.length,1,'retry must not send duplicate CREATE');
 // The opposite site changed revision while editing.
 const c=setup();c.server.get('hub-test-1').revision=5;
 await assert.rejects(c.win.hlgbHubSaveConfirmed(updated,false,{source:'edit-button',original:initial}),/Conflito/);
 assert.equal(c.calls.length,0);
 assert.equal(c.db.hubFinanceEntries[0].value,25);
 // Offline must not lie or close a form.
 const d=setup();d.navigator.onLine=false;
 await assert.rejects(d.win.hlgbHubSaveConfirmed(updated,false,{source:'edit-button',original:initial}),/Sem conexão/);
 assert.equal(d.calls.length,0);
 assert.equal(d.win.hlgbHubSaveTrace9483.status().outcome,'failed');
 // A truthy local/ok response is not remote ACK.
 const e=setup();e.setForceOkOnly(true);
 await assert.rejects(e.win.hlgbHubSaveConfirmed(updated,false,{source:'edit-button',original:initial}),/gravação recusada/);
 assert.equal(e.db.hubFinanceEntries[0].value,25);
 // ACK without matching data in GET must NOT claim victory.
 const f=setup();f.setCorruptRead(true);
 await assert.rejects(f.win.hlgbHubSaveConfirmed(updated,false,{source:'edit-button',original:initial}),/releitura|Conflito/);
 assert.equal(f.db.hubFinanceEntries[0].value,25);
 console.log('PASS v94.83: localStorage quota, ACK, revision, readback, retry-ID, conflict, offline, and false-ok are guarded');
})().catch(e=>{console.error(e);process.exitCode=1});