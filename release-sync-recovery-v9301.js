/* HLGB v93.01 — recuperação conservadora das filas de sincronização */
(function(){
'use strict';
if(window.hlgbSyncRecovery9301)return;
const V='93.01',PENDING_KEY='hlgb_records_pending_v91',WAL_KEY='hlgb_durable_wal_v1',STATE_KEY='hlgb_sync_recovery_9301';
const sid=v=>String(v??'');
let busy=false,lastRun='',lastResult=null;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function clone(v){try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}}
function stable(v){if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(v&&typeof v==='object'){return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}'}return JSON.stringify(v)}
function read(key,fallback){try{const x=JSON.parse(localStorage.getItem(key)||'null');return x??fallback}catch(e){return fallback}}
function writeState(extra={}){try{localStorage.setItem(STATE_KEY,JSON.stringify({version:V,at:new Date().toISOString(),busy,lastRun,lastResult,...extra}))}catch(e){}}
function pendingEnvelope(){const p=read(PENDING_KEY,{version:1,at:Date.now(),modules:{}});p.modules=p?.modules&&typeof p.modules==='object'?p.modules:{};return p}
function walEntries(){const w=read(WAL_KEY,{entries:{}}),out=[];for(const [key,e] of Object.entries(w?.entries||{}))if(e&&e.module)out.push({...clone(e),__storageKey:key});return out}
function isConflict(e){return e?.state==='conflict'||Number(e?.attempts||0)>=20||/(mudou em outra m[aá]quina|conflit|evitar perda)/i.test(sid(e?.lastError))}
function keyOf(e){return sid(e?.module)+'|'+sid(e?.id)}
function normalizedOps(){const p=pendingEnvelope(),out=[];for(const [module,ops] of Object.entries(p.modules))for(const op of (Array.isArray(ops)?ops:[]))if(op&&op.id!=null)out.push({module,id:sid(op.id),data:clone(op.data),deleted:!!op.deleted,queuedAt:op.__hlgb_pending_at||op.queuedAt||p.at||0});return out}
function removeConfirmedNormalized(captured){
 try{
  const p=pendingEnvelope(),list=Array.isArray(p.modules?.[captured.module])?p.modules[captured.module]:[];
  const before=list.length,expected=stable(captured.data),next=list.filter(op=>{
   if(sid(op?.id)!==sid(captured.id)||!!op?.deleted!==!!captured.deleted)return true;
   // Só remove a mesma versão que acabou de ser confirmada. Uma edição mais nova permanece protegida.
   return stable(op?.data)!==expected;
  });
  if(next.length)p.modules[captured.module]=next;else delete p.modules[captured.module];
  if(next.length!==before){p.at=Date.now();if(Object.values(p.modules).some(x=>Array.isArray(x)&&x.length))localStorage.setItem(PENDING_KEY,JSON.stringify(p));else localStorage.removeItem(PENDING_KEY);return true}
 }catch(e){console.warn('[HLGB sync '+V+'] limpeza confirmada',e)}return false;
}
async function ensureOnline(){
 if(!navigator.onLine)return false;
 try{if(typeof window.cloudEnsureFreshSession==='function')await window.cloudEnsureFreshSession(false);else if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false)}catch(e){}
 try{
  const fn=window.hlgbEnsureRecordsOnlineAfterAuth||(typeof hlgbEnsureRecordsOnlineAfterAuth==='function'?hlgbEnsureRecordsOnlineAfterAuth:null);
  if(typeof fn==='function')await Promise.race([Promise.resolve(fn()),wait(12000)]);
 }catch(e){console.info('[HLGB sync '+V+'] inicialização normalizada pendente',sid(e?.message||e))}
 return typeof window.hlgbRecordSaveWithRetry==='function';
}
async function send(op){
 if(!op||!op.module||!op.id)return {ok:false,reason:'invalid'};
 try{
  const result=await window.hlgbRecordSaveWithRetry(op.module,sid(op.id),clone(op.data),!!op.deleted);
  if(result?.applied===true){removeConfirmedNormalized(op);return {ok:true,applied:true,module:op.module,id:sid(op.id),deleted:!!op.deleted,noop:!!result.hlgbNoop}}
  return {ok:false,module:op.module,id:sid(op.id),reason:sid(result?.reason||'not-confirmed')};
 }catch(e){return {ok:false,module:op.module,id:sid(op.id),reason:sid(e?.message||e).slice(0,500)} }
}
function queue(){
 const wal=walEntries(),walKeys=new Set(wal.map(keyOf)),conflicts=wal.filter(isConflict),safeWal=wal.filter(e=>!isConflict(e));
 const norm=normalizedOps(),normOnly=norm.filter(e=>!walKeys.has(keyOf(e)));
 // WAL primeiro, pois é a fila que aparece no topo. Depois as pendências normalizadas ainda sem WAL.
 return {items:[...safeWal.map(e=>({module:e.module,id:sid(e.id),data:clone(e.data),deleted:!!e.deleted,source:'wal'})),...normOnly.map(e=>({...e,source:'normalized'}))],conflicts,walCount:wal.length,normalizedCount:norm.length};
}
async function run(limit=3){
 if(busy)return lastResult||{ok:false,reason:'busy'};busy=true;lastRun=new Date().toISOString();writeState();
 const q=queue(),summary={ok:true,startedAt:lastRun,wal:q.walCount,normalized:q.normalizedCount,conflicts:q.conflicts.map(e=>({module:e.module,id:sid(e.id),attempts:Number(e.attempts||0),error:sid(e.lastError)})),attempted:0,confirmed:0,failed:0,results:[]};
 try{
  const ready=await ensureOnline();if(!ready){summary.ok=false;summary.reason='record-save-unavailable';return summary}
  for(const op of q.items.slice(0,Math.max(1,Number(limit)||3))){summary.attempted++;const r=await send(op);summary.results.push(r);if(r.ok)summary.confirmed++;else summary.failed++;await wait(120)}
  return summary;
 }finally{busy=false;summary.finishedAt=new Date().toISOString();lastResult=summary;writeState({lastResult:summary})}
}
function status(){const q=queue();return {version:V,busy,lastRun,lastResult,wal:q.walCount,normalized:q.normalizedCount,conflicts:q.conflicts.map(e=>({module:e.module,id:sid(e.id),attempts:Number(e.attempts||0),lastError:sid(e.lastError)})),queued:q.items.length}}
function schedule(){setTimeout(()=>run(3).catch(e=>console.warn('[HLGB sync '+V+']',e)),1800)}
schedule();const timer=setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)run(3).catch(e=>console.warn('[HLGB sync '+V+']',e))},8000);
window.addEventListener('online',schedule);window.addEventListener('pageshow',schedule);
window.hlgbSyncRecovery9301={version:V,run,status,queue,ensureOnline,timer};
window.HLGB_SYNC_RECOVERY_9301=V;
console.info('[HLGB] v'+V+' recuperação conservadora de sincronização ativa');
})();
