/* HLGB v93.54 — fecha o ciclo da WAL técnica da folha mensal.
   Para payroll_month, quando a WAL difere da base confirmada apenas por metadados
   técnicos (updatedAt/revision/__*), repõe o snapshot local com a base confirmada
   e pede à autoridade WAL que faça a poda somente após confirmação remota.
   Alterações reais continuam na fila e seguem o fluxo normal. */
(function(){
'use strict';
const V='93.54', WAL_KEY='hlgb_durable_wal_v1';
if(window.HLGB_PAYROLL_SNAPSHOT_WATCH_9354===V)return;
window.HLGB_PAYROLL_SNAPSHOT_WATCH_9354=V;
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function canonical(v){
 if(Array.isArray(v))return v.map(canonical);
 if(!v||typeof v!=='object')return v;
 const o={};
 for(const k of Object.keys(v).sort()){
  if(k==='updatedAt'||k==='updated_at'||k==='revision'||k.startsWith('__'))continue;
  o[k]=canonical(v[k]);
 }
 return o;
}
function sameMeaning(a,b){try{return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}catch(e){return false}}
function payroll(v){return !!(v&&v.sourceType==='payroll_month'&&sid(v.sourceId).trim())}
function readWal(){try{const w=JSON.parse(localStorage.getItem(WAL_KEY)||'null');return w&&typeof w==='object'?w:null}catch(e){return null}}
function snapshotMap(){
 try{
  window.hlgbRecordSnapshots=window.hlgbRecordSnapshots||{};
  let m=window.hlgbRecordSnapshots.hubFinanceEntries;
  if(!(m instanceof Map)){m=new Map();window.hlgbRecordSnapshots.hubFinanceEntries=m}
  return m;
 }catch(e){return null}
}
let scans=0,recovered=0,pruneRequests=0,lastRecoveredAt='',lastRecoveredId='',lastError='';
let busy=false;
async function recover(){
 if(busy)return;
 busy=true;scans++;
 try{
  const wal=readWal();const entries=Object.values(wal?.entries||{});
  if(!entries.length)return;
  const map=snapshotMap();if(!map)return;
  let changed=0;
  for(const op of entries){
   if(op?.module!=='hubFinanceEntries'||op?.deleted===true||!payroll(op?.data)||!op?.baseData)continue;
   if(!sameMeaning(op.data,op.baseData))continue;
   const id=sid(op.id);if(!id)continue;
   const cur=map.get(id);
   if(cur&&!cur.deleted_at&&cur.data&&sameMeaning(cur.data,op.baseData))continue;
   map.set(id,{
    module:'hubFinanceEntries',entity_id:id,data:clone(op.baseData),deleted_at:null,
    revision:Number(op.baseRevision||cur?.revision||1)||1,
    updated_at:sid(op.baseUpdatedAt||cur?.updated_at||''),updated_by:cur?.updated_by||null
   });
   changed++;recovered++;lastRecoveredAt=new Date().toISOString();lastRecoveredId=id;
  }
  if(changed&&typeof window.hlgbWalSingleAuthority9339?.pruneConfirmed==='function'){
   pruneRequests++;
   Promise.resolve(window.hlgbWalSingleAuthority9339.pruneConfirmed(true,8)).catch(e=>{lastError=sid(e?.message||e)});
  }
 }catch(e){lastError=sid(e?.message||e)}finally{busy=false}
}
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<93.54){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}}
function installRecordGuard(){
 const base=window.hlgbRecordSaveWithRetry;
 if(typeof base!=='function'||base.__hlgb9354)return false;
 const wrapped=async function(module,id,data,deleted=false){
  if(module==='hubFinanceEntries'&&!deleted&&payroll(data)){
   try{const s=window.hlgbRecordSnapshots?.hubFinanceEntries?.get?.(sid(id));if(s&&!s.deleted_at&&s.data&&sameMeaning(data,s.data))return {applied:true,data:clone(s.data),deleted_at:null,revision:+s.revision||1,updated_at:s.updated_at||'',updated_by:s.updated_by||null,hlgbNoop:true,hlgbNoopReason:'payroll-technical-noop-v9354'}}catch(e){}
  }
  return base.apply(this,arguments);
 };
 wrapped.__hlgb9354=true;wrapped.__original=base;
 if(base.__hlgb955Wrapped)wrapped.__hlgb955Wrapped=true;
 window.hlgbRecordSaveWithRetry=wrapped;return true;
}
function maintain(){stamp();installRecordGuard();recover()}
window.hlgbPayrollSnapshotWatch9354={version:V,recover,maintain,status:()=>({version:V,scans,recovered,pruneRequests,lastRecoveredAt,lastRecoveredId,lastError,busy,installed:!!window.hlgbRecordSaveWithRetry?.__hlgb9354})};
stamp();maintain();
[100,300,700,1200,2000,3500,5000,8000,12000,20000].forEach(ms=>setTimeout(maintain,ms));
setInterval(()=>{if(document.visibilityState==='visible')maintain()},750);
window.addEventListener('focus',maintain);window.addEventListener('pageshow',maintain);window.addEventListener('online',maintain);
console.info('[HLGB] v'+V+' vigia de snapshot da folha ativa');
})();
