/* HLGB v93.36 — reenvio confirmado do WAL durável.
   Usa exclusivamente hlgbRecordSaveWithRetry; remove do WAL apenas após confirmação applied:true.
   Preserva conflitos, erros e operações substituídas durante o replay.
   v93.36: boot garantido mesmo quando a sessão já está aberta + espelho IDB aguardado antes do envio. */
(function(){
'use strict';
const V='93.36', WAL_KEY='hlgb_durable_wal_v1', DB='hlgb_durable_wal', STORE='entries';
if(window.HLGB_WAL_CONFIRMED_REPLAY_9333)return;
window.HLGB_WAL_CONFIRMED_REPLAY_9333=V;
const state={busy:false,booted:false,runs:0,confirmed:0,failed:0,lastRunAt:'',lastError:'',lastResult:null};
const sid=v=>String(v??'');
function clone(v){try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}}
function loggedIn(){try{const l=document.getElementById('loginScreen'),a=document.getElementById('appShell');if(!a)return false;if(l&&getComputedStyle(l).display!=='none')return false;return getComputedStyle(a).display!=='none'}catch(e){return false}}
function editing(){try{if(document.querySelector('#modal.show'))return true;const a=document.activeElement;return !!(a&&/^(INPUT|TEXTAREA|SELECT)$/i.test(a.tagName)&&a.closest?.('#appShell'))}catch(e){return false}}
function readWal(){try{const w=JSON.parse(localStorage.getItem(WAL_KEY)||'null');if(!w||typeof w!=='object')return {version:1,entries:{}};w.entries=w.entries&&typeof w.entries==='object'?w.entries:{};return w}catch(e){return {version:1,entries:{}}}}
function writeWal(w){try{localStorage.setItem(WAL_KEY,JSON.stringify(w));return true}catch(e){state.lastError=sid(e?.message||e);return false}}
function idbPut(entry,key){return new Promise(resolve=>{if(typeof indexedDB==='undefined'){resolve(false);return}let r;try{r=indexedDB.open(DB)}catch(e){resolve(false);return}r.onupgradeneeded=()=>{try{const d=r.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'key'})}catch(e){}};r.onerror=()=>resolve(false);r.onsuccess=()=>{const d=r.result;try{const tx=d.transaction(STORE,'readwrite'),s=tx.objectStore(STORE),v={...clone(entry),key:key||entry?.key};s.put(v);tx.oncomplete=()=>{d.close();resolve(true)};tx.onerror=tx.onabort=()=>{d.close();resolve(false)}}catch(e){try{d.close()}catch(_){}resolve(false)}}})}
function idbDeleteIfSame(key,opId){return new Promise(resolve=>{if(typeof indexedDB==='undefined'){resolve(false);return}let r;try{r=indexedDB.open(DB)}catch(e){resolve(false);return}r.onupgradeneeded=()=>{try{r.transaction.abort()}catch(e){};resolve(false)};r.onerror=()=>resolve(false);r.onsuccess=()=>{const d=r.result;try{if(!d.objectStoreNames.contains(STORE)){d.close();resolve(false);return}const tx=d.transaction(STORE,'readwrite'),s=tx.objectStore(STORE),g=s.get(key);g.onsuccess=()=>{const cur=g.result;if(!cur||sid(cur.opId)===sid(opId))s.delete(key)};tx.oncomplete=()=>{d.close();resolve(true)};tx.onerror=tx.onabort=()=>{d.close();resolve(false)}}catch(e){try{d.close()}catch(_){}resolve(false)}}})}
async function markAttempt(key,op){const w=readWal(),cur=w.entries?.[key];if(!cur||sid(cur.opId)!==sid(op.opId))return null;const now=new Date().toISOString();cur.attempts=(+cur.attempts||0)+1;cur.lastAttemptAt=now;cur.updatedAt=now;cur.lastError='';cur.state='sending';w.entries[key]=cur;if(!writeWal(w))return null;await idbPut(cur,key);return clone(cur)}
async function markFailure(key,opId,err){const w=readWal(),cur=w.entries?.[key];if(!cur||sid(cur.opId)!==sid(opId))return false;cur.lastError=sid(err?.message||err).slice(0,1200);cur.updatedAt=new Date().toISOString();cur.state='pending';w.entries[key]=cur;writeWal(w);await idbPut(cur,key);return true}
async function confirmRemove(key,opId){const w=readWal(),cur=w.entries?.[key];if(cur&&sid(cur.opId)===sid(opId)){delete w.entries[key];writeWal(w)}await idbDeleteIfSame(key,opId);return true}
async function replayOne(key,op){const marked=await markAttempt(key,op);if(!marked)return {key,ok:false,reason:'replaced-before-send'};try{const save=window.hlgbRecordSaveWithRetry;if(typeof save!=='function')throw new Error('hlgbRecordSaveWithRetry indisponível');const out=await save(marked.module,sid(marked.id),clone(marked.data),marked.deleted===true);if(out?.applied===true){await confirmRemove(key,marked.opId);state.confirmed++;return {key,ok:true,applied:true}}const msg=out?.reason||'Nuvem não confirmou applied:true';await markFailure(key,marked.opId,msg);state.failed++;return {key,ok:false,reason:msg}}catch(e){await markFailure(key,marked.opId,e);state.failed++;return {key,ok:false,reason:sid(e?.message||e)}}}
async function run(reason='manual',force=false){if(state.busy||navigator.onLine===false||!loggedIn()||(!force&&editing()))return false;const w=readWal(),items=Object.entries(w.entries||{});if(!items.length)return true;state.busy=true;state.runs++;state.lastRunAt=new Date().toISOString();state.lastError='';const results=[];try{for(const [key,op] of items){if(!op?.module||op?.id==null){results.push({key,ok:false,reason:'entrada-invalida'});continue}results.push(await replayOne(key,op))}state.lastResult={reason,at:new Date().toISOString(),results,remaining:Object.keys(readWal().entries||{}).length};try{window.hlgbSyncRecovery9301?.fullSync?.('v9336-after-replay',true)}catch(e){}return state.lastResult.remaining===0}catch(e){state.lastError=sid(e?.message||e);return false}finally{state.busy=false}}
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<93.36){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}}
let intervalId=null;
function boot(){if(state.booted)return true;state.booted=true;stamp();setTimeout(()=>run('boot',true).catch(()=>{}),650);intervalId=setInterval(()=>{if(Object.keys(readWal().entries||{}).length)run('interval',false).catch(()=>{})},15000);return true}
function tryBoot(){if(state.booted)return true;if(loggedIn())return boot();return false}
function loadPayrollMonthGuard(){try{if(window.HLGB_PAYROLL_MONTH_WAL_9334||document.querySelector('script[data-hlgb-payroll-month-wal="9334"]'))return;const s=document.createElement('script');s.dataset.hlgbPayrollMonthWal='9334';s.src='./release-payroll-month-wal-v9334.js?fresh='+Date.now();s.onerror=()=>console.warn('[HLGB v93.36] proteção v93.34 não carregou');(document.head||document.documentElement).appendChild(s)}catch(e){console.warn('[HLGB v93.36] proteção v93.34 indisponível',e)}}
window.hlgbWalConfirmedReplay9333={version:V,state,run,boot,tryBoot,pending:()=>Object.keys(readWal().entries||{}).length};
window.addEventListener('online',()=>{tryBoot();run('online',true).catch(()=>{})});window.addEventListener('focus',()=>{tryBoot();run('focus',false).catch(()=>{})});
if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>setTimeout(boot,180),0);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(tryBoot,120),{once:true});
[120,700,1800,4000].forEach(ms=>setTimeout(tryBoot,ms));
loadPayrollMonthGuard();
console.info('[HLGB] v'+V+' reenvio confirmado do WAL ativo');
})();
