const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('release-save-actions-v9322.js','utf8');
const loader=fs.readFileSync('app-stable3.html','utf8');
new vm.Script(src,{filename:'release-save-actions-v9322.js'});
assert(src.includes("const V='93.22'"),'v93.22 save actions missing');
assert(loader.includes("'release-save-actions-v9322.js'"),'v93.22 save actions not loaded by canonical entry');
assert(loader.indexOf("'release-hub-integrity.js'")<loader.indexOf("'release-save-actions-v9322.js'"),'Hub integrity must load before save actions');
assert(loader.indexOf("'release-hub-editor-v9270.js'")<loader.indexOf("'release-save-actions-v9322.js'"),'Hub editor must load before authoritative save actions');

(async()=>{
  const storage={};
  const db={hubFinanceEntries:[{id:'h1',description:'Antigo',value:10,status:'Previsto'}]};
  const queueCalls=[],cloudCalls=[],statuses=[];
  let localSaves=0,deleteCalls=0;
  function editorOpen(){}
  const context={
    console,Date,Promise,JSON,Object,Math,structuredClone,
    db,
    setTimeout:(fn)=>{Promise.resolve().then(fn);return 1},clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},
    localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>{storage[k]=v},removeItem:k=>{delete storage[k]}},
    document:{querySelector:()=>null},
    localSaveOnly:()=>{localSaves++},
    setCloudStatus:(m,t)=>statuses.push([String(m),String(t||'')]),
    hlgbRecordId:(m,row)=>String(row.id),
    hlgbHubEditor9270:{open:editorOpen},
    editHubFinanceEntry:()=>false,
    quickEditHub9185:()=>false,
    hlgbHubSaveConfirmed:async(row,deleted)=>{if(deleted){deleteCalls++;return {applied:true,deleted_at:new Date().toISOString()}};return {applied:true,data:row}},
    hlgbHubQueuePending:(id,payload,deleted)=>{queueCalls.push([String(id),JSON.parse(JSON.stringify(payload)),!!deleted]);const p={version:1,modules:{hubFinanceEntries:[{id:String(id),data:JSON.parse(JSON.stringify(payload)),deleted:false}]}};storage.hlgb_records_pending_v91=JSON.stringify(p);return true},
    hlgbRecordSaveWithRetry:async(module,id,payload,deleted)=>{cloudCalls.push([module,String(id),JSON.parse(JSON.stringify(payload)),!!deleted]);return {applied:true,data:{...payload,cloudConfirmed:true},deleted_at:null}},
    hlgbSaveTransport9320:{retry:()=>{}},hlgbSyncRecovery9301:{fullSync:()=>Promise.resolve(true)}
  };
  context.window=context;
  vm.createContext(context);vm.runInContext(src,context,{filename:'release-save-actions-v9322.js'});
  assert.strictEqual(context.editHubFinanceEntry,editorOpen,'authoritative Hub editor not installed');
  const next={id:'h1',description:'Alterado',value:25,status:'Previsto'};
  const out=await context.hlgbHubSaveConfirmed(next,false);
  assert(out?.applied===true&&out?.localFirst===true,'Hub save must succeed local-first');
  assert.equal(db.hubFinanceEntries[0].description,'Alterado','Hub edit was not kept locally');
  assert.equal(db.hubFinanceEntries[0].value,25,'Hub value was not kept locally');
  assert.equal(queueCalls.length,1,'Hub save must enter pending queue once');
  assert(localSaves>0,'Hub save must persist locally');
  await Promise.resolve();await Promise.resolve();
  assert.equal(cloudCalls.length,1,'Hub save must confirm in cloud once');
  assert.equal(cloudCalls[0][0],'hubFinanceEntries');
  assert.equal(context.hlgbSaveActions9322.state().saveAuthoritative,true,'save action lost authority');
  const del=await context.hlgbHubSaveConfirmed({id:'h1'},true);
  assert(del?.applied===true&&deleteCalls===1,'delete path must remain delegated to prior confirmed delete handler');
  console.log('PASS save actions v93.22: Hub edit is local-first, queues once, confirms in cloud, and authoritative editor remains installed.');
})().catch(e=>{console.error(e);process.exit(1)});
