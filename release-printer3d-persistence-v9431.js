/* HLGB v94.31 — persistência/hidratação da Impressora 3D.
   Garante que módulos 3D existentes na nuvem voltem ao db após login/sync.
   Não cria dados, não apaga dados e preserva alterações locais pendentes. */
(function(){
'use strict';
if(window.HLGB_PRINTER3D_PERSISTENCE_9431)return;
window.HLGB_PRINTER3D_PERSISTENCE_9431=true;
const V='94.31';
const MODULES=['printer3dProducts','printer3dSales','printer3dSettings'];
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const state={version:V,installedAt:new Date().toISOString(),loads:0,hydrates:0,lastReason:'',lastAt:'',lastError:'',forcedLoadDone:false,lastStatus:null};
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}return window.db||null}
function ensureArrays(){const d=dbRef();if(!d)return false;for(const m of MODULES)if(!Array.isArray(d[m]))d[m]=[];return true}
function pendingIds(module){
 const out=new Set();
 try{const p=JSON.parse(localStorage.getItem('hlgb_records_pending_v91')||'null'),a=p?.modules?.[module];if(Array.isArray(a))for(const x of a)if(x&&x.deleted!==true)out.add(sid(x.id))}catch(e){}
 try{const w=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||'null'),entries=w?.entries&&typeof w.entries==='object'?Object.values(w.entries):[];for(const x of entries)if(x&&x.module===module&&x.deleted!==true)out.add(sid(x.id))}catch(e){}
 return out;
}
function snapshotMap(module){try{const m=window.hlgbRecordSnapshots?.[module];return m&&typeof m.forEach==='function'?m:null}catch(e){return null}}
function snapshotRows(module){
 const map=snapshotMap(module);if(!map)return null;const rows=[];
 try{map.forEach((snap,id)=>{if(!snap||snap.deleted_at||snap.deletedAt||!snap.data)return;const row=clone(snap.data);if(row&&row.id==null)row.id=id;rows.push(row)})}catch(e){return null}
 return rows;
}
function sameRows(a,b){
 try{const norm=x=>(Array.isArray(x)?x:[]).map(r=>[sid(r?.id),sid(r?.updatedAt),sid(r?.updated_at)]).sort((x,y)=>x[0].localeCompare(y[0]));return JSON.stringify(norm(a))===JSON.stringify(norm(b))}catch(e){return false}
}
function hydrateModule(module){
 const d=dbRef();if(!d)return {module,available:false,changed:false,reason:'db-unavailable'};
 if(!Array.isArray(d[module]))d[module]=[];
 const remote=snapshotRows(module);if(remote===null)return {module,available:false,changed:false,local:d[module].length};
 const pending=pendingIds(module),remoteIds=new Set(remote.map(x=>sid(x?.id))),keepLocal=d[module].filter(x=>pending.has(sid(x?.id))&&!remoteIds.has(sid(x?.id)));
 const merged=[...remote,...keepLocal];const changed=!sameRows(d[module],merged);
 if(changed)d[module]=merged;
 return {module,available:true,changed,remote:remote.length,local:d[module].length,preservedPending:keepLocal.length};
}
function redraw(){
 const active=document.querySelector('.page.active')?.id||'';
 try{if(active==='printer3dHome9400')window.hlgbBusinessExpansion9400?.render3dHome?.()}catch(e){}
 try{if(active==='printer3dProducts9400')window.hlgbBusinessExpansion9400?.render3dProducts?.()}catch(e){}
 try{if(active==='printer3dSales9400')window.hlgbBusinessExpansion9400?.render3dSales?.()}catch(e){}
 try{if(active==='printer3dCatalog9400')window.hlgbBusinessExpansion9400?.render3dCatalog?.()}catch(e){}
}
function hydrate(reason='manual'){
 ensureArrays();const results=MODULES.map(hydrateModule),changed=results.some(x=>x.changed);state.hydrates++;state.lastReason=reason;state.lastAt=new Date().toISOString();state.lastError='';
 if(changed){try{typeof localSaveOnly==='function'&&localSaveOnly()}catch(e){};redraw()}
 state.lastStatus=status();return {changed,results,status:state.lastStatus};
}
function status(){
 ensureArrays();const d=dbRef()||{},modules={},missing=[];let snapshotAvailable=false;
 for(const m of MODULES){const local=Array.isArray(d[m])?d[m]:[],remote=snapshotRows(m);if(remote!==null)snapshotAvailable=true;const remoteIds=new Set((remote||[]).map(x=>sid(x?.id))),localIds=new Set(local.map(x=>sid(x?.id)));const missingIds=(remote||[]).filter(x=>!localIds.has(sid(x?.id))).map(x=>sid(x?.id));if(missingIds.length)missing.push(...missingIds.map(id=>({module:m,id})));modules[m]={local:local.length,snapshot:remote===null?null:remote.length,missingLocally:missingIds.length,extraLocal:remote===null?null:[...localIds].filter(id=>!remoteIds.has(id)).length}}
 return {version:V,at:new Date().toISOString(),snapshotAvailable,modules,missingCount:missing.length,missing,status:missing.length?'fail':'pass',state:{loads:state.loads,hydrates:state.hydrates,lastReason:state.lastReason,lastAt:state.lastAt,lastError:state.lastError,forcedLoadDone:state.forcedLoadDone}};
}
function persistAudit(){
 const out=status();state.lastStatus=out;
 try{
  const last=window.HLGB_AUDITOR_SINGLE_ACTION_LAST||window.hlgbAuditorSingleAction9429?.last||null;
  if(last&&typeof last==='object'){last.printer3dPersistenceV9431=clone(out);if(last.daily&&typeof last.daily==='object')last.daily.printer3dPersistenceV9431=clone(out)}
  for(const key of ['hlgb_auditor_daily_report_latest_v9429','hlgb_auditor_daily_report_latest_v9427']){
   const raw=localStorage.getItem(key);if(!raw)continue;const daily=JSON.parse(raw);daily.printer3dPersistenceV9431=clone(out);localStorage.setItem(key,JSON.stringify(daily));
   const date=daily.date||new Date().toISOString().slice(0,10),prefix=key.includes('9429')?'hlgb_auditor_daily_report_v9429_':'hlgb_auditor_daily_report_v9427_';localStorage.setItem(prefix+date,JSON.stringify(daily));
  }
 }catch(e){console.warn('[HLGB v94.31] auditor 3D',e)}
 return out;
}
function wrapLoader(){
 const fn=window.hlgbRecordLoadBundle;if(typeof fn!=='function'||fn.__hlgbPrinter3d9431)return false;
 const w=async function(){ensureArrays();state.loads++;const out=await fn.apply(this,arguments);hydrate('record-load');return out};w.__hlgbPrinter3d9431=true;w.__original=fn;window.hlgbRecordLoadBundle=w;return true;
}
function wrapIncoming(){
 const fn=window.hlgbRenderIncomingRecord;if(typeof fn!=='function'||fn.__hlgbPrinter3d9431)return false;
 const w=function(module){ensureArrays();const r=fn.apply(this,arguments);if(MODULES.includes(module))setTimeout(()=>hydrate('realtime-'+module),0);return r};w.__hlgbPrinter3d9431=true;w.__original=fn;window.hlgbRenderIncomingRecord=w;return true;
}
function authenticated(){try{return window.__HLGB_AUTH_READY===true||document.getElementById('appShell')&&getComputedStyle(document.getElementById('appShell')).display!=='none'}catch(e){return false}}
async function forceRepair(reason='boot'){
 if(state.forcedLoadDone||!authenticated())return false;ensureArrays();hydrate(reason+'-snapshot');const st=status();
 const localTotal=MODULES.reduce((n,m)=>n+(Array.isArray(dbRef()?.[m])?dbRef()[m].length:0),0),hasSnapshot=Object.values(st.modules).some(x=>x.snapshot!==null);
 if(localTotal>0&&st.missingCount===0)return true;
 if(typeof window.hlgbRecordLoadBundle!=='function')return false;
 state.forcedLoadDone=true;
 try{state.loads++;await window.hlgbRecordLoadBundle({preserveLocal:true,since:null});hydrate(reason+'-forced-load');return status().missingCount===0}catch(e){state.lastError=sid(e?.message||e);console.warn('[HLGB v94.31] recarga 3D',e);return false}
}
function install(){ensureArrays();wrapLoader();wrapIncoming();hydrate('install');
 [800,2200,5000].forEach(ms=>setTimeout(()=>{wrapLoader();wrapIncoming();hydrate('settle-'+ms);if(ms>=2200)forceRepair('settle-'+ms).catch(()=>{})},ms));
 try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{ensureArrays();setTimeout(()=>forceRepair('login').catch(()=>{}),500)},0)}catch(e){}
 window.addEventListener('hlgb:authenticated',()=>{ensureArrays();setTimeout(()=>forceRepair('authenticated').catch(()=>{}),500)});
 document.addEventListener('click',e=>{if(e.target?.closest?.('#hlgbAuditorUnifiedRun9429,#hlgbAuditorUnifiedRun9427'))[1200,4500].forEach(ms=>setTimeout(persistAudit,ms))},{capture:true});
 try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<94.31)window.HLGB_RELEASE_VERSION=V}catch(e){}
}
window.hlgbPrinter3dPersistence9431={version:V,state,ensureArrays,hydrate,status,forceRepair,persistAudit};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
console.info('[HLGB] v94.31 persistência da Impressora 3D ativa');
})();