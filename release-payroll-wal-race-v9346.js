/* HLGB v94.51 — trava final + reconciliação segura da WAL mensal da folha.
   Impede que um no-op técnico da folha seja reempacotado por wrappers legados acima da trava.
   Reconciliador remove somente cópias WAL de hubFinanceEntries comprovadamente idênticas ao servidor.
   Campos financeiros reais nunca são ignorados; ausência de prova remota preserva a pendência. */
(function(){
'use strict';
const V='94.51',WAL_KEY='hlgb_durable_wal_v1',ARC_KEY='hlgb_durable_wal_archive_v1',DB_NAME='hlgb_durable_wal',STORE='entries',MAX_ARCH=250;
if(window.HLGB_PAYROLL_WAL_RACE_9346===V){try{window.hlgbHubFinanceWal9451?.maintain?.('reload')}catch(e){}return}
window.HLGB_PAYROLL_WAL_RACE_9346=V;
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const parseMs=v=>{const n=Date.parse(String(v||''));return Number.isFinite(n)?n:NaN};
function payrollMonth(v){return !!(v&&v.sourceType==='payroll_month'&&sid(v.sourceId||'').trim())}
const TECH_META=new Set(['updatedAt','updated_at','revision','clientVersion','baseUpdatedAt','opId','operationId','state','attempts','lastAttemptAt','lastError','key']);
function canonicalBusiness(v){
 if(Array.isArray(v))return v.map(canonicalBusiness);
 if(!v||typeof v!=='object')return v;
 const o={};
 for(const k of Object.keys(v).sort()){
  if(TECH_META.has(k)||/^__hlgb/i.test(k)||/^__storage/i.test(k))continue;
  o[k]=canonicalBusiness(v[k]);
 }
 return o;
}
function sameBusiness(a,b){try{return JSON.stringify(canonicalBusiness(a))===JSON.stringify(canonicalBusiness(b))}catch(e){return false}}
function businessDiff(serverData,desired){
 const a=canonicalBusiness(serverData||{}),b=canonicalBusiness(desired||{}),keys=[...new Set([...Object.keys(a),...Object.keys(b)])].sort(),out=[];
 for(const field of keys){let same=false;try{same=JSON.stringify(a[field])===JSON.stringify(b[field])}catch(e){}if(!same)out.push({field,server:a[field]===undefined?null:a[field],local:b[field]===undefined?null:b[field]});if(out.length>=20)break}
 return out;
}
function snapshot(id){try{return window.hlgbRecordSnapshots?.hubFinanceEntries?.get?.(sid(id))||null}catch(e){return null}}
function localRows(){
 try{if(typeof db!=='undefined'&&db){db.hubFinanceEntries=Array.isArray(db.hubFinanceEntries)?db.hubFinanceEntries:[];return db.hubFinanceEntries}}catch(e){}
 try{if(window.db){window.db.hubFinanceEntries=Array.isArray(window.db.hubFinanceEntries)?window.db.hubFinanceEntries:[];return window.db.hubFinanceEntries}}catch(e){}
 return [];
}
function readWal(){try{const w=JSON.parse(localStorage.getItem(WAL_KEY)||'null');return w&&typeof w==='object'?w:{entries:{}}}catch(e){return {entries:{}}}}
function writeWal(w){try{w=w&&typeof w==='object'?w:{entries:{}};w.entries=w.entries&&typeof w.entries==='object'?w.entries:{};if(Object.keys(w.entries).length)localStorage.setItem(WAL_KEY,JSON.stringify(w));else localStorage.removeItem(WAL_KEY);return true}catch(e){return false}}
function readArchive(){try{const a=JSON.parse(localStorage.getItem(ARC_KEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return []}}
function baselineFor(id,data){
 const key='hubFinanceEntries|'+sid(id),s=snapshot(id);
 if(s&&!s.deleted_at&&s.data&&sameBusiness(data,s.data))return {data:s.data,source:'snapshot'};
 try{const op=readWal()?.entries?.[key];if(op?.baseData&&sameBusiness(data,op.baseData))return {data:op.baseData,source:'wal-base'}}catch(e){}
 const a=readArchive();for(let i=a.length-1;i>=0;i--){const x=a[i];if(sid(x?.key)!==key||!x?.baseData)continue;if(sameBusiness(data,x.baseData))return {data:x.baseData,source:'archive-base'}}
 return null;
}
function noop(s,reason){return {applied:true,data:clone(s.data),deleted_at:s.deleted_at||null,revision:+s.revision||1,updated_at:s.updated_at||'',updated_by:s.updated_by||null,hlgbNoop:true,hlgbNoopReason:reason}}
function nextOriginal(f){return f?.__original||f?.__hlgb9306Original||f?.__originalGradeLink||f?.__hlgb9313Original||f?.__hlgb9312Original||f?.__hlgb9320Original||f?.__hlgbRecordIntegrityOriginal||f?.__hlgb955Original||f?.__hlgb9339Original||null}
function chainHasMarker(fn,marker){let f=fn,n=0,seen=new Set();while(typeof f==='function'&&n++<64&&!seen.has(f)){seen.add(f);if(f?.[marker])return true;f=nextOriginal(f)}return false}
function chainHas955(fn){return chainHasMarker(fn,'__hlgb955Wrapped')}
const state={version:V,recordInstalls:0,reliableInstalls:0,enqueueInstalls:0,saveInstalls:0,suppressedEnqueues:0,lastNoopAt:'',lastNoopId:'',lastPath:'',lastBaselineSource:'',normalizedAt:'',normalizedCount:0,reconcileRuns:0,reconcileBusy:false,confirmedLogical:0,prunedLocal:0,prunedIdb:0,blockedBusiness:0,incompleteProof:0,lastReconcileAt:'',lastError:'',lastResult:null,auditorHooked:false,remoteNoops:0,remoteProofFailures:0,lastRemoteNoopAt:'',lastRemoteNoopId:'',lastRemoteProofError:'',realDelegations:0};
function shouldNoop(module,id,data,deleted){if(module!=='hubFinanceEntries'||deleted||!payrollMonth(data))return null;const s=snapshot(id);if(!s||s.deleted_at||!s.data||!sameBusiness(data,s.data))return null;return s}
function normalizePayrollLocal(reason='maintain'){
 let changed=0;try{for(const row of localRows()){if(!payrollMonth(row))continue;const id=sid(row?.id??row?.__hlgbId);if(!id)continue;const s=snapshot(id);if(!s||s.deleted_at||!s.data||!sameBusiness(row,s.data))continue;const wanted=sid(s.data.updatedAt||'');if(sid(row.updatedAt||'')===wanted)continue;row.updatedAt=wanted;changed++}if(changed){state.normalizedCount+=changed;state.normalizedAt=new Date().toISOString();try{window.localSaveOnly?.()}catch(e){}}return {changed,reason}}catch(e){return {changed,error:sid(e?.message||e),reason}}
}
function idbAll(){return new Promise(resolve=>{if(typeof indexedDB==='undefined'){resolve([]);return}let r;try{r=indexedDB.open(DB_NAME)}catch(e){resolve([]);return}let created=false;r.onupgradeneeded=()=>{created=true;try{r.transaction.abort()}catch(_){}};r.onerror=()=>resolve([]);r.onsuccess=()=>{const d=r.result;try{if(!d.objectStoreNames.contains(STORE)){d.close();resolve([]);return}const tx=d.transaction(STORE,'readonly'),g=tx.objectStore(STORE).getAll();g.onsuccess=()=>{const out=Array.isArray(g.result)?g.result:[];d.close();resolve(out)};g.onerror=()=>{d.close();resolve([])}}catch(e){try{d.close()}catch(_){}resolve([])}}})}
function idbDeleteExact(key,opId){return new Promise(resolve=>{if(typeof indexedDB==='undefined'){resolve(false);return}let r;try{r=indexedDB.open(DB_NAME)}catch(e){resolve(false);return}r.onupgradeneeded=()=>{try{r.transaction.abort()}catch(_){};resolve(false)};r.onerror=()=>resolve(false);r.onsuccess=()=>{const d=r.result;try{if(!d.objectStoreNames.contains(STORE)){d.close();resolve(false);return}const tx=d.transaction(STORE,'readwrite'),s=tx.objectStore(STORE),g=s.get(key);let removed=false;g.onsuccess=()=>{const cur=g.result;if(cur&&sid(cur.opId)===sid(opId)){s.delete(key);removed=true}};tx.oncomplete=()=>{d.close();resolve(removed)};tx.onerror=tx.onabort=()=>{d.close();resolve(false)}}catch(e){try{d.close()}catch(_){}resolve(false)}}})}
async function timed(p,ms,label){let t;try{return await Promise.race([Promise.resolve(p),new Promise((_,rej)=>{t=setTimeout(()=>rej(new Error(label)),ms)})])}finally{clearTimeout(t)}}
async function cloudRow(id){if(typeof window.cloudRequest!=='function')throw new Error('cloudRequest indisponível');const q='hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at,updated_by&module=eq.hubFinanceEntries&entity_id=eq.'+encodeURIComponent(sid(id))+'&limit=1';const rows=await timed(window.cloudRequest(q,{method:'GET'}),12000,'Timeout confirmando hubFinanceEntries');return Array.isArray(rows)&&rows.length?rows[0]:null}
function serverProof(server,id){if(!server||typeof server!=='object')return {ok:false,reason:'no-server-proof'};if(sid(server.module)!=='hubFinanceEntries'||sid(server.entity_id)!==sid(id))return {ok:false,reason:'server-identity-mismatch'};const rev=Number(server.revision);if(!Number.isInteger(rev)||rev<=0)return {ok:false,reason:'server-revision-missing'};if(!Number.isFinite(parseMs(server.updated_at)))return {ok:false,reason:'server-updated-at-missing'};if(server.deleted_at)return {ok:false,reason:'server-deleted'};if(!server.data||typeof server.data!=='object')return {ok:false,reason:'no-server-data'};return {ok:true,reason:'server-identity-revision-confirmed'}}
function operationProof(server,op){const structural=serverProof(server,op?.id);if(!structural.ok)return structural;if(op?.deleted===true)return {ok:false,reason:'delete-requires-separate-proof'};if(!op?.data||typeof op.data!=='object')return {ok:false,reason:'no-desired-data'};if(!payrollMonth(op.data))return {ok:false,reason:'not-payroll-month'};if(sameBusiness(server.data,op.data))return {ok:true,reason:'server-semantic-match'};return {ok:false,reason:'business-difference',diff:businessDiff(server.data,op.data)}}
function logicalKey(op,index=0){const oid=sid(op?.opId||op?.operationId);if(oid)return 'op:'+oid;const key=sid(op?.key||('hubFinanceEntries|'+sid(op?.id)));let body='';try{body=JSON.stringify(canonicalBusiness(op?.data||{}))}catch(e){}return 'fallback:'+key+'|'+body+'|'+index}
async function candidates(){
 const rows=[],w=readWal();for(const [key,e] of Object.entries(w?.entries||{})){if(sid(e?.module)!=='hubFinanceEntries'||!payrollMonth(e?.data)||e?.id==null)continue;rows.push({source:'wal-local',key:sid(key),op:clone(e)})}
 for(const e of await idbAll()){if(sid(e?.module)!=='hubFinanceEntries'||!payrollMonth(e?.data)||e?.id==null)continue;rows.push({source:'wal-idb',key:sid(e.key||('hubFinanceEntries|'+sid(e.id))),op:clone(e)})}
 const map=new Map();let anon=0;for(const row of rows){const k=logicalKey(row.op,++anon);if(!map.has(k))map.set(k,{logicalKey:k,id:sid(row.op.id),opId:sid(row.op.opId||row.op.operationId),copies:[]});map.get(k).copies.push(row)}
 return {logical:[...map.values()],physical:rows.length,duplicates:Math.max(0,rows.length-map.size)};
}
function archiveProof(op,server,proof){try{let a=readArchive();const tag=sid(op?.opId)+'|'+sid(op?.key||('hubFinanceEntries|'+sid(op?.id)));if(!a.some(x=>sid(x?.opId)+'|'+sid(x?.key)===tag)){a.push({...clone(op),key:sid(op?.key||('hubFinanceEntries|'+sid(op?.id))),ackedAt:new Date().toISOString(),applied:true,hlgbTechnicalNoop:true,hlgbNoopReason:'hub-finance-server-proof-v9451',hlgbServerRevision:+server?.revision||0,hlgbServerUpdatedAt:sid(server?.updated_at),hlgbProof:proof?.reason||''});if(a.length>MAX_ARCH)a=a.slice(-MAX_ARCH);localStorage.setItem(ARC_KEY,JSON.stringify(a))}return true}catch(e){return false}}
function updateSnapshot(server){try{const all=window.hlgbRecordSnapshots;if(!all)return false;let m=all.hubFinanceEntries;if(!(m instanceof Map)){m=new Map();all.hubFinanceEntries=m}m.set(sid(server.entity_id),{data:clone(server.data),deleted_at:server.deleted_at||null,revision:+server.revision||0,updated_at:server.updated_at||'',updated_by:server.updated_by||null});return true}catch(e){return false}}
async function removeLogical(group,server,proof){
 let local=0,idb=0,w=readWal();
 for(const row of group.copies){const op=row.op,key=row.key||sid(op.key||('hubFinanceEntries|'+sid(op.id))),oid=sid(op.opId||op.operationId);if(row.source==='wal-local'){const cur=w?.entries?.[key];if(cur&&sid(cur.opId||cur.operationId)===oid){archiveProof({...op,key},server,proof);delete w.entries[key];local++}}}
 if(local)writeWal(w);
 const seen=new Set();for(const row of group.copies){if(row.source!=='wal-idb')continue;const op=row.op,key=row.key||sid(op.key||('hubFinanceEntries|'+sid(op.id))),oid=sid(op.opId||op.operationId),tag=key+'|'+oid;if(seen.has(tag))continue;seen.add(tag);archiveProof({...op,key},server,proof);if(await idbDeleteExact(key,oid))idb++}
 return {local,idb,total:local+idb};
}
async function reconcileHubFinanceWal(reason='manual'){
 if(state.reconcileBusy)return {version:V,busy:true,reason};state.reconcileBusy=true;state.reconcileRuns++;state.lastReconcileAt=new Date().toISOString();state.lastError='';
 try{
  const before=await candidates(),results=[],serverCache=new Map();
  for(const group of before.logical){
   const op=group.copies[0]?.op;if(!op)continue;let server;
   try{if(serverCache.has(group.id))server=serverCache.get(group.id);else{server=await cloudRow(group.id);serverCache.set(group.id,server)}}catch(e){state.incompleteProof++;results.push({id:group.id,opId:group.opId,ok:false,reason:'no-server-proof',error:sid(e?.message||e),physicalCopies:group.copies.length});continue}
   const proof=operationProof(server,op);
   if(!proof.ok){if(proof.reason==='business-difference')state.blockedBusiness++;else state.incompleteProof++;results.push({id:group.id,opId:group.opId,ok:false,reason:proof.reason,diff:clone(proof.diff||[]),physicalCopies:group.copies.length,serverRevision:+server?.revision||0});continue}
   const removed=await removeLogical(group,server,proof);if(removed.total){state.confirmedLogical++;state.prunedLocal+=removed.local;state.prunedIdb+=removed.idb;updateSnapshot(server)}
   results.push({id:group.id,opId:group.opId,ok:true,proof:proof.reason,removed,physicalCopies:group.copies.length,serverRevision:+server?.revision||0,serverUpdatedAt:sid(server?.updated_at)});
  }
  const after=await candidates();const out={version:V,reason,at:new Date().toISOString(),logicalBefore:before.logical.length,physicalBefore:before.physical,duplicateBefore:before.duplicates,logicalAfter:after.logical.length,physicalAfter:after.physical,duplicateAfter:after.duplicates,clearedPhysical:Math.max(0,before.physical-after.physical),results};state.lastResult=clone(out);return out;
 }catch(e){state.lastError=sid(e?.message||e);const out={version:V,reason,error:state.lastError,results:[]};state.lastResult=clone(out);return out}finally{state.reconcileBusy=false}
}
/* v94.87: remote compare prevents boot/sync from rewriting payroll_month solely
   for an updatedAt stamp when local snapshots have not loaded yet.
   Read-only preflight; never masks a change in any actual business field. */
async function remotePayrollNoop(module,id,data,deleted=false){
 if(module!=='hubFinanceEntries'||deleted===true||!payrollMonth(data))return null;
 try{
  const server=await cloudRow(id);
  const proof=operationProof(server,{id,data,deleted:false});
  if(!proof.ok)return null;
  state.remoteNoops++;
  state.lastRemoteNoopAt=new Date().toISOString();
  state.lastRemoteNoopId=sid(id);
  updateSnapshot(server);
  const out=noop(server,'payroll-month-readonly-remote-match-v9487');
  out.remoteVerified=true;out.hlgbReadOnlyProof=true;
  return out;
 }catch(e){
  state.remoteProofFailures++;state.lastRemoteProofError=sid(e?.message||e).slice(0,180);
  return null; // Keep existing write path; do not pretend a failed GET is a proof.
 }
}
function installRecordGuard(){
 const base=window.hlgbRecordSaveWithRetry;if(typeof base!=='function')return false;
 /* v94.51: só considera instalado quando o PRÓPRIO topo é a trava. Se houver um wrapper 955 por cima de uma trava antiga, reenvolve por fora. */
 if(base.__hlgbPayrollWalRace9346===true)return true;
 const had955=chainHas955(base),wrapped=async function(module,id,data,deleted=false){const s=shouldNoop(module,id,data,deleted);if(s){state.lastNoopAt=new Date().toISOString();state.lastNoopId=sid(id);state.lastPath='record';normalizePayrollLocal('record-noop');Promise.resolve().then(()=>reconcileHubFinanceWal('record-noop')).catch(()=>{});return noop(s,'payroll-month-updatedAt-only-v9451-record')}const remote=await remotePayrollNoop(module,id,data,deleted);if(remote)return remote;state.realDelegations++;return base.apply(this,arguments)};
 wrapped.__hlgbPayrollWalRace9346=true;if(had955)wrapped.__hlgb955Wrapped=true;wrapped.__original=base;window.hlgbRecordSaveWithRetry=wrapped;state.recordInstalls++;return true;
}
function installReliableGuard(){const base=window.hlgb955ReliableSave;if(typeof base!=='function')return false;if(base.__hlgbPayrollWalRace9346===true)return true;const wrapped=async function(module,id,data,deleted=false){const s=shouldNoop(module,id,data,deleted);if(s){state.lastNoopAt=new Date().toISOString();state.lastNoopId=sid(id);state.lastPath='reliable';normalizePayrollLocal('reliable-noop');Promise.resolve().then(()=>reconcileHubFinanceWal('reliable-noop')).catch(()=>{});return noop(s,'payroll-month-updatedAt-only-v9451-reliable')}const remote=await remotePayrollNoop(module,id,data,deleted);if(remote)return remote;return base.apply(this,arguments)};wrapped.__hlgbPayrollWalRace9346=true;wrapped.__original=base;window.hlgb955ReliableSave=wrapped;state.reliableInstalls++;return true}
function installEnqueueGuard(){const base=window.enqueue955;if(typeof base!=='function')return false;if(base.__hlgbPayrollDirtyGuard9351===true)return true;const wrapped=async function(module,id,data,deleted=false){if(module==='hubFinanceEntries'&&!deleted&&payrollMonth(data)){const b=baselineFor(id,data);if(b){state.suppressedEnqueues++;state.lastNoopAt=new Date().toISOString();state.lastNoopId=sid(id);state.lastPath='enqueue';state.lastBaselineSource=b.source;return {key:'hubFinanceEntries|'+sid(id),opId:'suppressed-v9451-'+Date.now(),module,id:sid(id),data:clone(data),deleted:false,state:'suppressed',hlgbSuppressed:true,hlgbNoopReason:'payroll-month-dirty-scan-v9451'}}}return base.apply(this,arguments)};wrapped.__hlgbPayrollDirtyGuard9351=true;wrapped.__original=base;window.enqueue955=wrapped;state.enqueueInstalls++;return true}
function installSaveGuard(){const base=window.save;if(typeof base!=='function')return false;if(base.__hlgbPayrollWalRace9349Save===true)return true;const hadGeneric=chainHasMarker(base,'__hlgb955Generic'),wrapped=function(){const out=base.apply(this,arguments);try{queueMicrotask(()=>normalizePayrollLocal('save-microtask'))}catch(e){Promise.resolve().then(()=>normalizePayrollLocal('save-promise'))}setTimeout(()=>normalizePayrollLocal('save-50ms'),50);return out};wrapped.__hlgbPayrollWalRace9349Save=true;if(hadGeneric)wrapped.__hlgb955Generic=true;wrapped.__original=base;window.save=wrapped;state.saveInstalls++;return true}
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<94.51){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}}
function installAuditorHook(){
 const api=window.hlgbAuditorRepair9440;if(!api||typeof api.run!=='function')return false;if(api.run.__hlgbHubFinance9451Wrapped){state.auditorHooked=true;return true}
 const base=api.run,wrapped=async function(){const pre=await reconcileHubFinanceWal('auditor-preflight');const out=await base.apply(this,arguments);try{if(out&&typeof out==='object')out.hubFinanceWal9451=pre}catch(e){}return out};wrapped.__hlgbHubFinance9451Wrapped=true;wrapped.__original=base;api.run=wrapped;state.auditorHooked=true;return true;
}
function install(){installRecordGuard();installReliableGuard();installEnqueueGuard();installSaveGuard();installAuditorHook();normalizePayrollLocal('install');stamp()}
function maintain(reason='maintain'){install();normalizePayrollLocal(reason);if(window.__HLGB_AUTH_READY===true)reconcileHubFinanceWal(reason).catch(()=>{})}
window.hlgbHubFinanceWal9451={version:V,state,install,maintain,reconcile:reconcileHubFinanceWal,candidates,proof:operationProof,canonicalBusiness,businessDiff,status:()=>({...state,recordTopGuard:window.hlgbRecordSaveWithRetry?.__hlgbPayrollWalRace9346===true,reliableTopGuard:window.hlgb955ReliableSave?.__hlgbPayrollWalRace9346===true,enqueueTopGuard:window.enqueue955?.__hlgbPayrollDirtyGuard9351===true,auditorHooked:state.auditorHooked}) ,_test:{canonicalBusiness,sameBusiness,businessDiff,serverProof,operationProof,logicalKey,remotePayrollNoop}};
window.hlgbPayrollWalRace9346={version:V,install,maintain,normalizePayrollLocal,reconcileMissingPayrollSnapshot:()=>reconcileHubFinanceWal('legacy-reconcile'),status:()=>({...state,recordInstalled:window.hlgbRecordSaveWithRetry?.__hlgbPayrollWalRace9346===true,reliableInstalled:window.hlgb955ReliableSave?.__hlgbPayrollWalRace9346===true,enqueueInstalled:window.enqueue955?.__hlgbPayrollDirtyGuard9351===true,saveInstalled:window.save?.__hlgbPayrollWalRace9349Save===true,recordCarries955:chainHas955(window.hlgbRecordSaveWithRetry),saveCarriesGeneric:chainHasMarker(window.save,'__hlgb955Generic')})};
install();
[100,350,900,1800,3500,7000,12000,20000].forEach(ms=>setTimeout(()=>maintain('boot-'+ms),ms));
/* Sem setInterval: manutenção só em eventos naturais ou na execução do Auditor. */
window.addEventListener('online',()=>maintain('online'));window.addEventListener('pageshow',()=>maintain('pageshow'));window.addEventListener('focus',()=>maintain('focus'));
document.addEventListener('click',()=>{[0,100,500,1200].forEach(ms=>setTimeout(installAuditorHook,ms))},true);
console.info('[HLGB] v'+V+' trava superior + reconciliação segura da WAL financeira ativa');
})();
