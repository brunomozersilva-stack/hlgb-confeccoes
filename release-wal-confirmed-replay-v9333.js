/* HLGB v94.38 — reenvio confirmado do WAL durável, com agendador único.
   Usa hlgbRecordSaveWithRetry e remove do WAL somente após applied:true.
   Quando a ponte v94.33 está ativa, ela é a única autoridade de timer/eventos;
   este módulo mantém apenas a execução de replay para evitar retries duplicados. */
(function(){
'use strict';
const V='94.38', WAL_KEY='hlgb_durable_wal_v1', DB='hlgb_durable_wal', STORE='entries', SAVE_TIMEOUT_MS=22000;
if(window.HLGB_WAL_CONFIRMED_REPLAY_9333)return;
window.HLGB_WAL_CONFIRMED_REPLAY_9333=V;
const delegatedScheduler=!!window.hlgbWalReplayBridge9332;
const state={busy:false,booted:false,runs:0,confirmed:0,failed:0,lastRunAt:'',lastError:'',lastResult:null,currentKey:'',currentSince:'',postReplayFullSyncSuppressed:0,scheduler:delegatedScheduler?'bridge':'standalone',intervalSuppressed:delegatedScheduler,eventsSuppressed:delegatedScheduler};
const sid=v=>String(v??'');
function clone(v){try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}}
function loggedIn(){try{const l=document.getElementById('loginScreen'),a=document.getElementById('appShell');if(!a)return false;if(l&&getComputedStyle(l).display!=='none')return false;return getComputedStyle(a).display!=='none'}catch(e){return false}}
function editing(){try{if(document.querySelector('#modal.show'))return true;const a=document.activeElement;return !!(a&&/^(INPUT|TEXTAREA|SELECT)$/i.test(a.tagName)&&a.closest?.('#appShell'))}catch(e){return false}}
function readWal(){try{const w=JSON.parse(localStorage.getItem(WAL_KEY)||'null');if(!w||typeof w!=='object')return {version:1,entries:{}};w.entries=w.entries&&typeof w.entries==='object'?w.entries:{};return w}catch(e){return {version:1,entries:{}}}}
function writeWal(w){try{localStorage.setItem(WAL_KEY,JSON.stringify(w));return true}catch(e){state.lastError=sid(e?.message||e);return false}}
function idbPut(entry,key){return new Promise(resolve=>{if(typeof indexedDB==='undefined'){resolve(false);return}let r;try{r=indexedDB.open(DB)}catch(e){resolve(false);return}r.onupgradeneeded=()=>{try{const d=r.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'key'})}catch(e){}};r.onerror=()=>resolve(false);r.onsuccess=()=>{const d=r.result;try{const tx=d.transaction(STORE,'readwrite'),s=tx.objectStore(STORE),v={...clone(entry),key:key||entry?.key};s.put(v);tx.oncomplete=()=>{d.close();resolve(true)};tx.onerror=tx.onabort=()=>{d.close();resolve(false)}}catch(e){try{d.close()}catch(_){}resolve(false)}}})}
function idbAll(){return new Promise(resolve=>{if(typeof indexedDB==='undefined'){resolve([]);return}let r;try{r=indexedDB.open(DB)}catch(e){resolve([]);return}r.onupgradeneeded=()=>{try{r.transaction.abort()}catch(e){};resolve([])};r.onerror=()=>resolve([]);r.onsuccess=()=>{const d=r.result;try{if(!d.objectStoreNames.contains(STORE)){d.close();resolve([]);return}const tx=d.transaction(STORE,'readonly'),s=tx.objectStore(STORE),g=s.getAll();g.onsuccess=()=>{const out=Array.isArray(g.result)?g.result:[];try{d.close()}catch(_){}resolve(out)};g.onerror=()=>{try{d.close()}catch(_){}resolve([])}}catch(e){try{d.close()}catch(_){}resolve([])}}})}
function newerWal(a,b){const ta=Date.parse(a?.updatedAt||a?.createdAt||'')||0,tb=Date.parse(b?.updatedAt||b?.createdAt||'')||0;return tb>ta?b:a}
async function combinedEntries(){const w=readWal(),out={...(w.entries||{})};try{for(const e of await idbAll()){const key=sid(e?.key);if(!key)continue;out[key]=out[key]?newerWal(out[key],e):e}}catch(e){}return out}
/* v94.86: an ACK from a save only authorizes the EXACT operation sent.
   A newer edit with same opId is never deleted in the IndexedDB transaction. */
function exactData(v){
 if(Array.isArray(v))return v.map(exactData);
 if(!v||typeof v!=='object')return v;
 const out={};for(const k of Object.keys(v).sort())out[k]=exactData(v[k]);return out
}
function sameOperation(current,expected,key){
 return !!(current&&expected&&sid(current.key)===sid(key)&&sid(expected.key)===sid(key)&&
  sid(current.module)===sid(expected.module)&&sid(current.id)===sid(expected.id)&&
  sid(current.opId)===sid(expected.opId)&&(current.deleted===true)===(expected.deleted===true)&&
  JSON.stringify(exactData(current.data))===JSON.stringify(exactData(expected.data)))
}
function idbDeleteIfSame(key,expected){
 return new Promise(resolve=>{
  if(typeof indexedDB==='undefined'){resolve(false);return}
  let req;try{req=indexedDB.open(DB)}catch(_){resolve(false);return}
  req.onupgradeneeded=()=>{try{req.transaction.abort()}catch(_){}resolve(false)};
  req.onerror=()=>resolve(false);
  req.onsuccess=()=>{
   const db=req.result;
   try{
    if(!db.objectStoreNames.contains(STORE)){db.close();resolve(false);return}
    const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),get=store.get(key);
    let removed=false;
    get.onsuccess=()=>{if(sameOperation(get.result,expected,key)){store.delete(key);removed=true}};
    tx.oncomplete=()=>{db.close();resolve(removed)};
    tx.onerror=tx.onabort=()=>{db.close();resolve(false)}
   }catch(_){try{db.close()}catch(_){}resolve(false)}
  }
 })
}
async function markAttempt(key,op){const w=readWal();let cur=w.entries?.[key]||null;if(!cur||sid(cur.opId)!==sid(op.opId)){try{cur=(await idbAll()).find(x=>sid(x?.key)===sid(key)&&sid(x?.opId)===sid(op.opId))||null}catch(e){cur=null}}if(!cur)return null;const now=new Date().toISOString();cur.attempts=(+cur.attempts||0)+1;cur.lastAttemptAt=now;cur.updatedAt=now;cur.lastError='';cur.state='sending';if(w.entries?.[key]&&sid(w.entries[key].opId)===sid(cur.opId)){w.entries[key]=cur;writeWal(w)}await idbPut(cur,key);return clone(cur)}
async function markFailure(key,opId,err){const w=readWal();let cur=w.entries?.[key]||null;if(!cur||sid(cur.opId)!==sid(opId)){try{cur=(await idbAll()).find(x=>sid(x?.key)===sid(key)&&sid(x?.opId)===sid(opId))||null}catch(e){cur=null}}if(!cur)return false;cur.lastError=sid(err?.message||err).slice(0,1200);cur.updatedAt=new Date().toISOString();cur.state='pending';if(w.entries?.[key]&&sid(w.entries[key].opId)===sid(cur.opId)){w.entries[key]=cur;writeWal(w)}await idbPut(cur,key);return true}
async function confirmRemove(key,expected){
 if(!expected?.opId||!expected?.module||expected.id==null)return false;
 const wal=readWal(),local=wal?.entries?.[key]||null;
 const idb=(await idbAll()).find(x=>sid(x?.key)===sid(key))||null;
 if(local&&!sameOperation(local,expected,key))return false;
 if(idb&&!sameOperation(idb,expected,key))return false;
 if(!local&&!idb)return false;
 let removed=false;
 if(idb){if(!await idbDeleteIfSame(key,expected))return false;removed=true}
 const fresh=readWal(),cur=fresh?.entries?.[key]||null;
 if(cur&&sameOperation(cur,expected,key)){
  delete fresh.entries[key];
  if(writeWal(fresh))removed=true;
 }
 return removed;
}
function saveWithTimeout(save,args,key){let timer=null;return new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(new Error('Timeout v94.38 aguardando confirmação de '+key+' após '+SAVE_TIMEOUT_MS+'ms')),SAVE_TIMEOUT_MS);Promise.resolve().then(()=>save.apply(window,args)).then(v=>{clearTimeout(timer);resolve(v)},e=>{clearTimeout(timer);reject(e)})})}
async function protectCutReplay(op){
 if(String(op?.module||'')!=='cuts')return '';
 try{
  if(typeof window.cloudRequest!=='function')return 'cut-proof-unavailable';
  const q='hlgb_records?select=module,entity_id,data,deleted_at,revision&module=eq.cuts&entity_id=eq.'+encodeURIComponent(String(op.id))+'&limit=1';
  const rows=await window.cloudRequest(q,{method:'GET'});
  if(!Array.isArray(rows))return 'cut-proof-invalid';
  const remote=rows.find(x=>String(x?.module)==='cuts'&&String(x?.entity_id)===String(op.id));
  if(!remote)return op.deleted===true?'cut-delete-not-proven':'';
  if(remote.deleted_at)return 'cut-deleted-on-server';
  if(remote.data?.hiddenByModelSplitV1===true||remote.data?.status==='Desmembrado por modelo')return 'cut-already-split-by-model';
  if(JSON.stringify(remote.data)!==JSON.stringify(op.data))return 'cut-remote-difference';
  return 'cut-content-already-on-server';
 }catch(_){return 'cut-remote-proof-failed'}
}
async function replayOne(key,op){const cutBlock=await protectCutReplay(op);if(cutBlock)return {key,ok:false,blocked:true,reason:cutBlock};const marked=await markAttempt(key,op);if(!marked)return {key,ok:false,reason:'replaced-before-send'};state.currentKey=key;state.currentSince=new Date().toISOString();try{const save=window.hlgbRecordSaveWithRetry;if(typeof save!=='function')throw new Error('hlgbRecordSaveWithRetry indisponível');const out=await saveWithTimeout(save,[marked.module,sid(marked.id),clone(marked.data),marked.deleted===true],key);if(out?.applied===true){const removed=await confirmRemove(key,marked);if(!removed){state.failed++;return {key,ok:false,applied:true,reason:'Gravação confirmada, mas operação WAL mudou antes de concluir a limpeza; manter pendência para inspeção'}}state.confirmed++;return {key,ok:true,applied:true,verifiedBy:out?.verifiedBy||''}}const msg=out?.reason||'Nuvem não confirmou applied:true';await markFailure(key,marked.opId,msg);state.failed++;return {key,ok:false,reason:msg}}catch(e){await markFailure(key,marked.opId,e);state.failed++;return {key,ok:false,reason:sid(e?.message||e)}}finally{state.currentKey='';state.currentSince=''}}
async function run(reason='manual',force=false){if(state.busy||navigator.onLine===false||!loggedIn()||(!force&&editing()))return false;const items=Object.entries(await combinedEntries());if(!items.length)return true;state.busy=true;state.runs++;state.lastRunAt=new Date().toISOString();state.lastError='';const results=[];try{for(const [key,op] of items){if(!op?.module||op?.id==null){results.push({key,ok:false,reason:'entrada-invalida'});continue}results.push(await replayOne(key,op))}const left=await combinedEntries();const remainingKeys=Object.keys(left);
 state.lastResult={reason,at:new Date().toISOString(),results,remaining:remainingKeys.length,remainingKeys:remainingKeys.slice(0,30)};
 state.postReplayFullSyncSuppressed++;return state.lastResult.remaining===0&&results.every(r=>r.ok===true)}catch(e){state.lastError=sid(e?.message||e);return false}finally{state.busy=false;state.currentKey='';state.currentSince=''}}
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<94.38){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}}
let intervalId=null;
function bridgeActive(){return !!window.hlgbWalReplayBridge9332}
function boot(){
 if(state.booted)return true;state.booted=true;stamp();
 if(bridgeActive()){
  state.scheduler='bridge';state.intervalSuppressed=true;state.eventsSuppressed=true;
  /* A ponte v94.33 executa recover() no boot e a cada 30s. Não criamos um
     segundo relógio aqui. O método run permanece disponível para o fallback. */
  return true;
 }
 state.scheduler='standalone';state.intervalSuppressed=false;state.eventsSuppressed=false;
 setTimeout(()=>run('boot',true).catch(()=>{}),650);
 intervalId=setInterval(()=>{run('interval',false).catch(()=>{})},30000);return true;
}
function tryBoot(){if(state.booted)return true;if(loggedIn())return boot();return false}
function payrollMonthGuardReady(){return !!window.HLGB_PAYROLL_MONTH_WAL_9334}
window.hlgbWalConfirmedReplay9333={version:V,state,run,boot,tryBoot,pending:()=>Object.keys(readWal().entries||{}).length,timeoutMs:SAVE_TIMEOUT_MS,payrollMonthGuardReady};
if(!delegatedScheduler){
 window.addEventListener('online',()=>{tryBoot();run('online',true).catch(()=>{})});
 window.addEventListener('focus',()=>{tryBoot();run('focus',false).catch(()=>{})});
}
if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>setTimeout(boot,180),0);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(tryBoot,120),{once:true});
[120,700,1800,4000].forEach(ms=>setTimeout(tryBoot,ms));
console.info('[HLGB] v'+V+' replay WAL confirmado · agendador '+(delegatedScheduler?'delegado à ponte':'standalone'));
})();
