const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('app9240.html','utf8');
const start=html.indexOf('async function cloudSaveNow(showMessage=false){');
const source=html.slice(start,html.indexOf('\nasync function cloudUploadCurrentDb',start));
const helperStart=html.indexOf('function cloudApplyLegacySnapshot(');
const helper=helperStart<0?'':html.slice(helperStart,html.indexOf('\nasync function cloudPullRemoteIfNewer',helperStart));
const clone=x=>JSON.parse(JSON.stringify(x)),noop=()=>{};
const ctx={console,Date,JSON,encodeURIComponent,setTimeout:noop,cloudAccessToken:'mock',cloudReady:true,cloudSaving:false,cloudPending:false,cloudDirty:false,cloudRowId:1,cloudVersion:1,cloudBaseSnapshot:{},cloudUser:{id:'mock'},hlgbRecordReady:true,hlgbNormalizedReady:true,HLGB_RECORD_MODULES:['orders','cuts','production'],cloudApplying:false,db:{cuts:[{id:1,status:'Finalizado'}],orders:[{id:2,status:'Pedido em produção'}],production:[{id:3,stage:'Em produção',assignedAt:'2026-09-25'}],config:{theme:'old'}},cloudClone:clone,cloudPayload:x=>clone(x),cloudMergeThreeWay:(_b,_l,r)=>clone(r),setCloudStatus:noop,cloudMarkLocalDirty:noop,ensureCloudUserAccessOnline:async()=>{},localSaveOnly:noop,hlgbBroadcastDbUpdate:noop,cloudQueueSave:noop};
let patchCalls=0;
const legacy={cuts:[{id:1,status:'Planejado'}],orders:[{id:2,status:'Separação / compra de material'}],production:[{id:3,stage:'Aguardando atribuição'}],config:{theme:'new'}};
ctx.cloudRequest=async(_path,opts)=>{
 if(opts.method==='GET')return [{dados:legacy,versao:2}];
 if(opts.method==='PATCH'){
  patchCalls++;
  // Another async module sync can read db while the legacy request is pending.
  assert.equal(ctx.db.cuts[0].status,'Finalizado','legacy merge must never expose stale cuts to record autosave');
  assert.equal(ctx.db.production[0].assignedAt,'2026-09-25');
  ctx.db.orders[0]={...ctx.db.orders[0],concurrentEdit:'preserve'};
  return [{id:1}];
 }
};
vm.createContext(ctx);vm.runInContext(helper+'\n'+source,ctx);
(async()=>{
 assert.equal(await ctx.cloudSaveNow(),true);
 assert.equal(patchCalls,1);
 assert.equal(ctx.db.config.theme,'new','legacy configuration still updates');
 assert.equal(ctx.db.orders[0].concurrentEdit,'preserve');
 console.log('PASS legacy sync cannot regress migrated records during asynchronous save');
})().catch(e=>{console.error(e);process.exitCode=1});
