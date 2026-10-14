/* HLGB v93.56 — trava final da folha mensal acima dos wrappers legados.
   Impede que uma gravação tecnicamente idêntica chegue à WAL v91.59.
   v93.49: mantém o timestamp local alinhado ao snapshot confirmado.
   v93.51: tenta bloquear a recriação pelo scanDirty955 quando o snapshot não está presente.
   v93.53: quando existir WAL técnica da folha sem snapshot, confere o registro na nuvem,
   restaura o snapshot confirmado e só então solicita a poda da WAL. Alterações reais continuam preservadas.
   v93.55: torna a instalação dos guards idempotente em toda a cadeia __original para impedir reempacotamento infinito.
   v93.56: reconhece ponteiros legados v93.06/grade e preserva o marker do wrapper genérico de save. */
(function(){
'use strict';
const V='93.56',WAL_KEY='hlgb_durable_wal_v1',ARC_KEY='hlgb_durable_wal_archive_v1';
if(window.HLGB_PAYROLL_WAL_RACE_9346===V)return;
window.HLGB_PAYROLL_WAL_RACE_9346=V;
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function payrollMonth(v){return !!(v&&v.sourceType==='payroll_month'&&sid(v.sourceId||'').trim())}
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(!v||typeof v!=='object')return v;const o={};for(const k of Object.keys(v).sort()){if(k==='updatedAt'||k==='updated_at'||k==='revision'||k.startsWith('__'))continue;o[k]=canonical(v[k])}return o}
function sameMeaning(a,b){try{return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}catch(e){return false}}
function snapshot(id){try{return window.hlgbRecordSnapshots?.hubFinanceEntries?.get?.(sid(id))||null}catch(e){return null}}
function localRows(){
 try{if(typeof db!=='undefined'&&db){db.hubFinanceEntries=Array.isArray(db.hubFinanceEntries)?db.hubFinanceEntries:[];return db.hubFinanceEntries}}catch(e){}
 try{if(window.db){window.db.hubFinanceEntries=Array.isArray(window.db.hubFinanceEntries)?window.db.hubFinanceEntries:[];return window.db.hubFinanceEntries}}catch(e){}
 return [];
}
function readWal(){try{const w=JSON.parse(localStorage.getItem(WAL_KEY)||'null');return w&&typeof w==='object'?w:null}catch(e){return null}}
function readArchive(){try{const a=JSON.parse(localStorage.getItem(ARC_KEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return []}}
function baselineFor(id,data){
 const key='hubFinanceEntries|'+sid(id);
 const s=snapshot(id);
 if(s&&!s.deleted_at&&s.data&&sameMeaning(data,s.data))return {data:s.data,source:'snapshot'};
 try{const op=readWal()?.entries?.[key];if(op?.baseData&&sameMeaning(data,op.baseData))return {data:op.baseData,source:'wal-base'}}catch(e){}
 const a=readArchive();
 for(let i=a.length-1;i>=0;i--){const x=a[i];if(sid(x?.key)!==key||!x?.baseData)continue;if(sameMeaning(data,x.baseData))return {data:x.baseData,source:'archive-base'}}
 return null;
}
function noop(s,reason){return {applied:true,data:clone(s.data),deleted_at:s.deleted_at||null,revision:+s.revision||1,updated_at:s.updated_at||'',updated_by:s.updated_by||null,hlgbNoop:true,hlgbNoopReason:reason}}
function nextOriginal(f){return f?.__original||f?.__hlgb9306Original||f?.__originalGradeLink||f?.__hlgb9313Original||f?.__hlgb9312Original||f?.__hlgb9320Original||f?.__hlgbRecordIntegrityOriginal||f?.__hlgb955Original||f?.__hlgb9339Original||null}
function chainHasMarker(fn,marker){let f=fn,n=0,seen=new Set();while(typeof f==='function'&&n++<64&&!seen.has(f)){seen.add(f);if(f?.[marker])return true;f=nextOriginal(f)}return false}
function chainHas955(fn){return chainHasMarker(fn,'__hlgb955Wrapped')}
let recordInstalls=0,reliableInstalls=0,saveInstalls=0,enqueueInstalls=0,suppressedEnqueues=0,lastNoopAt='',lastNoopId='',lastPath='',lastBaselineSource='',normalizedAt='',normalizedCount=0;
let remoteBusy=false,remoteChecks=0,snapshotRecovered=0,lastRemoteAt='',lastRemoteId='',lastRemoteError='';
function shouldNoop(module,id,data,deleted){
 if(module!=='hubFinanceEntries'||deleted||!payrollMonth(data))return null;
 const s=snapshot(id);
 if(!s||s.deleted_at||!s.data||!sameMeaning(data,s.data))return null;
 return s;
}
function normalizePayrollLocal(reason='maintain'){
 let changed=0;
 try{
  for(const row of localRows()){
   if(!payrollMonth(row))continue;
   const id=sid(row?.id??row?.__hlgbId);if(!id)continue;
   const s=snapshot(id);if(!s||s.deleted_at||!s.data||!sameMeaning(row,s.data))continue;
   const wanted=sid(s.data.updatedAt||'');
   if(sid(row.updatedAt||'')===wanted)continue;
   row.updatedAt=wanted;changed++;
  }
  if(changed){normalizedCount+=changed;normalizedAt=new Date().toISOString();try{window.localSaveOnly?.()}catch(e){}}
  return {changed,reason};
 }catch(e){return {changed,error:sid(e?.message||e),reason}}
}
function pruneTechnicalWal(){
 try{return Promise.resolve(window.hlgbPayrollMonthWal9334?.prune?.()).catch(()=>null)}catch(e){return Promise.resolve(null)}
}
async function reconcileMissingPayrollSnapshot(){
 if(remoteBusy||navigator.onLine===false||typeof window.cloudRequest!=='function')return false;
 const entries=Object.values(readWal()?.entries||{});
 const op=entries.find(x=>x&&x.module==='hubFinanceEntries'&&x.deleted!==true&&payrollMonth(x.data)&&x.baseData&&sameMeaning(x.data,x.baseData)&&!snapshot(x.id));
 if(!op)return false;
 remoteBusy=true;remoteChecks++;lastRemoteAt=new Date().toISOString();lastRemoteId=sid(op.id);lastRemoteError='';
 try{
  const q=`hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at,updated_by&module=eq.hubFinanceEntries&entity_id=eq.${encodeURIComponent(sid(op.id))}&limit=1`;
  const out=await Promise.race([Promise.resolve(window.cloudRequest(q,{method:'GET'})),new Promise((_,rej)=>setTimeout(()=>rej(new Error('Timeout conferindo snapshot da folha')),12000))]);
  const row=Array.isArray(out)&&out.length?out[0]:null;
  if(!row||row.deleted_at||!row.data||!sameMeaning(row.data,op.data))return false;
  const maps=window.hlgbRecordSnapshots;
  const map=maps?.hubFinanceEntries;
  if(!(map instanceof Map))return false;
  map.set(sid(op.id),clone(row));snapshotRecovered++;
  normalizePayrollLocal('remote-snapshot-recovered');
  try{await window.hlgbWalSingleAuthority9339?.pruneConfirmed?.(true,8)}catch(e){}
  try{await pruneTechnicalWal()}catch(e){}
  return true;
 }catch(e){lastRemoteError=sid(e?.message||e);return false}
 finally{remoteBusy=false}
}
function installRecordGuard(){
 const base=window.hlgbRecordSaveWithRetry;
 if(typeof base!=='function')return false;
 if(chainHasMarker(base,'__hlgbPayrollWalRace9346'))return true;
 const had955=chainHas955(base);
 const wrapped=async function(module,id,data,deleted=false){
  const s=shouldNoop(module,id,data,deleted);
  if(s){lastNoopAt=new Date().toISOString();lastNoopId=sid(id);lastPath='record';normalizePayrollLocal('record-noop');return noop(s,'payroll-month-updatedAt-only-v9356-record')}
  return base.apply(this,arguments);
 };
 wrapped.__hlgbPayrollWalRace9346=true;
 if(had955)wrapped.__hlgb955Wrapped=true;
 wrapped.__original=base;
 window.hlgbRecordSaveWithRetry=wrapped;recordInstalls++;return true;
}
function installReliableGuard(){
 const base=window.hlgb955ReliableSave;
 if(typeof base!=='function')return false;
 if(chainHasMarker(base,'__hlgbPayrollWalRace9346'))return true;
 const wrapped=async function(module,id,data,deleted=false){
  const s=shouldNoop(module,id,data,deleted);
  if(s){lastNoopAt=new Date().toISOString();lastNoopId=sid(id);lastPath='reliable';normalizePayrollLocal('reliable-noop');return noop(s,'payroll-month-updatedAt-only-v9356-reliable')}
  return base.apply(this,arguments);
 };
 wrapped.__hlgbPayrollWalRace9346=true;
 wrapped.__original=base;
 window.hlgb955ReliableSave=wrapped;reliableInstalls++;return true;
}
function installEnqueueGuard(){
 const base=window.enqueue955;
 if(typeof base!=='function')return false;
 if(chainHasMarker(base,'__hlgbPayrollDirtyGuard9351'))return true;
 const wrapped=async function(module,id,data,deleted=false){
  if(module==='hubFinanceEntries'&&!deleted&&payrollMonth(data)){
   const b=baselineFor(id,data);
   if(b){
    suppressedEnqueues++;lastNoopAt=new Date().toISOString();lastNoopId=sid(id);lastPath='enqueue';lastBaselineSource=b.source;
    return {key:'hubFinanceEntries|'+sid(id),opId:'suppressed-v9356-'+Date.now(),module,id:sid(id),data:clone(data),deleted:false,state:'suppressed',hlgbSuppressed:true,hlgbNoopReason:'payroll-month-dirty-scan-v9356'};
   }
  }
  return base.apply(this,arguments);
 };
 wrapped.__hlgbPayrollDirtyGuard9351=true;
 wrapped.__original=base;
 window.enqueue955=wrapped;enqueueInstalls++;return true;
}
function installSaveGuard(){
 const base=window.save;
 if(typeof base!=='function')return false;
 if(chainHasMarker(base,'__hlgbPayrollWalRace9349Save'))return true;
 const hadGeneric=chainHasMarker(base,'__hlgb955Generic');
 const wrapped=function(){
  const out=base.apply(this,arguments);
  try{queueMicrotask(()=>normalizePayrollLocal('save-microtask'))}catch(e){Promise.resolve().then(()=>normalizePayrollLocal('save-promise'))}
  setTimeout(()=>normalizePayrollLocal('save-50ms'),50);
  return out;
 };
 wrapped.__hlgbPayrollWalRace9349Save=true;
 if(hadGeneric)wrapped.__hlgb955Generic=true;
 wrapped.__original=base;
 window.save=wrapped;saveInstalls++;return true;
}
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<93.56){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}}
function install(){installRecordGuard();installReliableGuard();installEnqueueGuard();installSaveGuard();normalizePayrollLocal('install');stamp()}
function maintain(){install();normalizePayrollLocal('maintain');pruneTechnicalWal();reconcileMissingPayrollSnapshot().catch(()=>{})}
window.hlgbPayrollWalRace9346={version:V,install,maintain,normalizePayrollLocal,reconcileMissingPayrollSnapshot,status:()=>({version:V,recordInstalls,reliableInstalls,enqueueInstalls,saveInstalls,suppressedEnqueues,lastNoopAt,lastNoopId,lastPath,lastBaselineSource,normalizedAt,normalizedCount,remoteBusy,remoteChecks,snapshotRecovered,lastRemoteAt,lastRemoteId,lastRemoteError,recordInstalled:chainHasMarker(window.hlgbRecordSaveWithRetry,'__hlgbPayrollWalRace9346'),reliableInstalled:chainHasMarker(window.hlgb955ReliableSave,'__hlgbPayrollWalRace9346'),enqueueInstalled:chainHasMarker(window.enqueue955,'__hlgbPayrollDirtyGuard9351'),saveInstalled:chainHasMarker(window.save,'__hlgbPayrollWalRace9349Save'),recordCarries955:chainHas955(window.hlgbRecordSaveWithRetry),saveCarriesGeneric:chainHasMarker(window.save,'__hlgb955Generic')})};
install();
[100,350,900,1800,3500,7000,12000,20000].forEach(ms=>setTimeout(maintain,ms));
let guardTimer=setInterval(()=>{if(document.visibilityState==='visible')maintain()},5000);
window.addEventListener('focus',maintain);window.addEventListener('online',maintain);window.addEventListener('pageshow',maintain);
console.info('[HLGB] v'+V+' trava final da WAL técnica da folha + cadeia legada idempotente ativa');
})();
