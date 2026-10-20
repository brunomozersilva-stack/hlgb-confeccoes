/* HLGB v93.90 — vigia leve da WAL técnica da folha mensal.
   Só inspeciona quando existe WAL payroll_month relevante e reduz polling agressivo.
   Mantém a proteção contra diferenças puramente técnicas sem criar nova camada de salvamento. */
(function(){
'use strict';
const V='93.90',WAL_KEY='hlgb_durable_wal_v1',WATCH_INTERVAL_MS=5000;
if(window.HLGB_PAYROLL_SNAPSHOT_WATCH_9354===V)return;
window.HLGB_PAYROLL_SNAPSHOT_WATCH_9354=V;
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(!v||typeof v!=='object')return v;const o={};for(const k of Object.keys(v).sort()){if(k==='updatedAt'||k==='updated_at'||k==='revision'||k.startsWith('__'))continue;o[k]=canonical(v[k])}return o}
function sameMeaning(a,b){try{return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}catch(e){return false}}
function nextOriginal(f){return f?.__original||f?.__hlgb9306Original||f?.__originalGradeLink||f?.__hlgb9313Original||f?.__hlgb9312Original||f?.__hlgb9320Original||f?.__hlgbRecordIntegrityOriginal||f?.__hlgb955Original||f?.__hlgb9339Original||null}
function chainHasMarker(fn,marker){let f=fn,n=0,seen=new Set();while(typeof f==='function'&&n++<64&&!seen.has(f)){seen.add(f);if(f?.[marker])return true;f=nextOriginal(f)}return false}
function payroll(v){return !!(v&&v.sourceType==='payroll_month'&&sid(v.sourceId).trim())}
function readWal(){try{const w=JSON.parse(localStorage.getItem(WAL_KEY)||'null');return w&&typeof w==='object'?w:null}catch(e){return null}}
function payrollEntries(w=readWal()){return Object.values(w?.entries||{}).filter(op=>op?.module==='hubFinanceEntries'&&op?.deleted!==true&&payroll(op?.data))}
function hasPayrollWal(){return payrollEntries().length>0}
function snapshotMap(){try{window.hlgbRecordSnapshots=window.hlgbRecordSnapshots||{};let m=window.hlgbRecordSnapshots.hubFinanceEntries;if(!(m instanceof Map)){m=new Map();window.hlgbRecordSnapshots.hubFinanceEntries=m}return m}catch(e){return null}}
let scans=0,recovered=0,pruneRequests=0,skippedNoWal=0,lastRecoveredAt='',lastRecoveredId='',lastError='';
let busy=false;
async function recover(){if(busy)return false;const entries=payrollEntries();if(!entries.length){skippedNoWal++;return false}busy=true;scans++;try{const map=snapshotMap();if(!map)return false;let changed=0;for(const op of entries){if(!op?.baseData||!sameMeaning(op.data,op.baseData))continue;const id=sid(op.id);if(!id)continue;const cur=map.get(id);if(cur&&!cur.deleted_at&&cur.data&&sameMeaning(cur.data,op.baseData))continue;map.set(id,{module:'hubFinanceEntries',entity_id:id,data:clone(op.baseData),deleted_at:null,revision:Number(op.baseRevision||cur?.revision||1)||1,updated_at:sid(op.baseUpdatedAt||cur?.updated_at||''),updated_by:cur?.updated_by||null});changed++;recovered++;lastRecoveredAt=new Date().toISOString();lastRecoveredId=id}if(changed&&typeof window.hlgbWalSingleAuthority9339?.pruneConfirmed==='function'){pruneRequests++;Promise.resolve(window.hlgbWalSingleAuthority9339.pruneConfirmed(true,8)).catch(e=>{lastError=sid(e?.message||e)})}return changed>0}catch(e){lastError=sid(e?.message||e);return false}finally{busy=false}}
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<93.90){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}}
function installRecordGuard(){const base=window.hlgbRecordSaveWithRetry;if(typeof base!=='function'||chainHasMarker(base,'__hlgb9354'))return false;const had955=chainHasMarker(base,'__hlgb955Wrapped');const wrapped=async function(module,id,data,deleted=false){if(module==='hubFinanceEntries'&&!deleted&&payroll(data)){try{const s=window.hlgbRecordSnapshots?.hubFinanceEntries?.get?.(sid(id));if(s&&!s.deleted_at&&s.data&&sameMeaning(data,s.data))return {applied:true,data:clone(s.data),deleted_at:null,revision:+s.revision||1,updated_at:s.updated_at||'',updated_by:s.updated_by||null,hlgbNoop:true,hlgbNoopReason:'payroll-technical-noop-v9390'}}catch(e){}}return base.apply(this,arguments)};wrapped.__hlgb9354=true;wrapped.__original=base;if(had955)wrapped.__hlgb955Wrapped=true;window.hlgbRecordSaveWithRetry=wrapped;return true}
function maintain(force=false){stamp();installRecordGuard();if(force||hasPayrollWal())return recover();skippedNoWal++;return Promise.resolve(false)}
window.hlgbPayrollSnapshotWatch9354={version:V,recover,maintain,hasPayrollWal,status:()=>({version:V,scans,recovered,pruneRequests,skippedNoWal,lastRecoveredAt,lastRecoveredId,lastError,busy,watchIntervalMs:WATCH_INTERVAL_MS,hasPayrollWal:hasPayrollWal(),installed:chainHasMarker(window.hlgbRecordSaveWithRetry,'__hlgb9354')})};
stamp();installRecordGuard();[250,900,2200,5000].forEach(ms=>setTimeout(()=>maintain(false),ms));
setInterval(()=>{if(document.visibilityState==='visible'&&hasPayrollWal())maintain(false)},WATCH_INTERVAL_MS);
window.addEventListener('focus',()=>maintain(false));window.addEventListener('pageshow',()=>maintain(false));window.addEventListener('online',()=>maintain(false));
console.info('[HLGB] v'+V+' vigia leve de snapshot da folha ativo · '+WATCH_INTERVAL_MS+'ms sob demanda');
})();
