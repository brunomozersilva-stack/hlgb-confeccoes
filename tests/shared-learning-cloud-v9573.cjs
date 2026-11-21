'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('release-learning-cloud-v9573.js','utf8');
const boot=fs.readFileSync('app-stable3.html','utf8');
const auditor=fs.readFileSync('release-internal-auditor.js','utf8');
assert(boot.includes("'release-learning-cloud-v9573.js'"),'bridge must be loaded by real router');
assert(auditor.includes('&entity_id=not.like.learnv9573-*'),'audit run history must not show technical learning');
new vm.Script(src);
const server=new Map();
const sanitize=x=>JSON.parse(JSON.stringify(x));
const calls=[];
const cloudRequest=async(path,opts={method:'GET'})=>{
 calls.push({path,method:opts.method});
 if(path==='rpc/hlgb_save_record'){
  const b=JSON.parse(opts.body);
  assert.equal(b.p_module,'systemAuditRuns');
  assert(String(b.p_entity_id).startsWith('learnv9573-'));
  assert.equal(b.p_expected_revision,0);
  if(!server.has(b.p_entity_id))server.set(b.p_entity_id,{module:b.p_module,entity_id:b.p_entity_id,data:sanitize(b.p_data),revision:1,deleted_at:null});
  return [{applied:true,revision:1,data:sanitize(b.p_data)}];
 }
 if(path.includes('entity_id=eq.')){
  const id=decodeURIComponent(path.match(/entity_id=eq\.([^&]+)/)?.[1]||'');
  return server.has(id)?[sanitize(server.get(id))]:[];
 }
 if(path.includes('entity_id=like.learnv9573-*'))return [...server.values()].map(sanitize);
 throw Error('Unexpected request '+path);
};
const create=(which,run='run-1')=>{
 const storage=new Map();
 const localStorage={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
 const w={__HLGB_AUTH_READY:true,__HLGB_TEST__:true,addEventListener(){},cloudRequest,
  hlgbAuditorLearningAssistant9556:{pack:()=>({sourceRunId:run,disabled:false,diagnoses:[{kind:'wal',affectedInReport:2},{kind:'script',affectedInReport:1}]})},
  hlgbAuditorAutoCorrect9448:{exportReport:()=>({run:{runId:run,corrected:[{id:'production123',module:'production',action:'production-reconcile',verification:'remote-proof-and-queue-readback'}],unverified:[]}})},
  hlgbHubLearning9568:{history:()=>({timeline:[{category:'ui-confirmed',at:'2026-11-13T01:00:00Z',source:'modal-save',traceOutcome:'confirmed',clickObserved:true,hasAck:true,hasReadback:true}]})}};
 const ctx={window:w,console,Date,Math,JSON,Map,Promise,localStorage,navigator:{onLine:true},document:{getElementById:()=>null,hidden:false},setTimeout:()=>{},setInterval:()=>{},encodeURIComponent};
 vm.createContext(ctx);vm.runInContext(src,ctx);
 return {api:w.hlgbLearningCloud9573,w,localStorage,storage,which};
};
(async()=>{
 const safari=create('Safari');assert.equal(safari.api.version,'95.73');
 const count=safari.api.collect();
 assert(count>=6,'fixes, observations and confirmed technical repair should enter outbox');
 assert.equal(safari.api.status().outboxCount,count);
 const result=await safari.api.publish();assert(result.ok,JSON.stringify(result));
 assert.equal(safari.api.status().outboxCount,0);
 assert(safari.api.snapshot().verifiedServer);
 assert(safari.api.snapshot().cases.some(x=>x.category==='hub-status'));
 assert(safari.api.snapshot().cases.some(x=>x.category==='ui-confirmed'));
 assert([...server.keys()].every(x=>x.startsWith('learnv9573-')));
 assert([...server.values()].every(x=>x.data.kind==='technical_learning_event'));
 assert(!JSON.stringify([...server.values()]).includes('Quesia'),'do not store clients');
 const before=server.size;safari.api.collect();await safari.api.publish();assert.equal(server.size,before,'same observations deduplicated by stable technical IDs');
 const chrome=create('Chrome','different-run');
 await chrome.api.refresh();
 assert.equal(chrome.api.snapshot().events,before,'fresh device reads the same server knowledge without localStorage');
 assert(chrome.api.snapshot().cases.some(x=>x.category==='auditor-dates'&&x.fixes.some(f=>f.status==='verified_fix')));
 chrome.api.disable();assert.equal(chrome.api.collect(),0,'disabled optional module does not record');
 const denied=create('unauthorized');denied.w.__HLGB_AUTH_READY=false;
 assert.equal(denied.api.collect(),0,'no learning write without authenticated HLGB session');
 const rpc=calls.filter(x=>x.path==='rpc/hlgb_save_record');
 assert.equal(rpc.length,before,'duplicate observations never re-sent');
 console.log('PASS v95.73: shared server-side technical learning, cross-device read, verified fix distinction, dedupe, auth, privacy and no WAL writes');
})().catch(e=>{console.error(e);process.exitCode=1});
