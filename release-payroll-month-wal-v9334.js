/* HLGB v93.34 — evita WAL infinito da linha mensal consolidada da folha.
   Escopo estrito: hubFinanceEntries com sourceType=payroll_month.
   Só trata como redundante quando todos os campos, exceto updatedAt, são idênticos. */
(function(){
'use strict';
const V='93.34',WAL_KEY='hlgb_durable_wal_v1',DB_NAME='hlgb_durable_wal',STORE='entries';
if(window.HLGB_PAYROLL_MONTH_WAL_9334)return;
window.HLGB_PAYROLL_MONTH_WAL_9334=V;
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function payrollMonth(v){return !!(v&&v.sourceType==='payroll_month'&&sid(v.sourceId||'').trim())}
function canonical(v){
 if(!v||typeof v!=='object'||Array.isArray(v))return v;
 const out={};for(const k of Object.keys(v).sort()){if(k==='updatedAt')continue;const x=v[k];out[k]=x&&typeof x==='object'&&!Array.isArray(x)?canonical(x):Array.isArray(x)?x.map(y=>y&&typeof y==='object'?canonical(y):y):x}return out;
}
function sameMeaning(a,b){try{return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}catch(e){return false}}
function snapshot(id){try{return window.hlgbRecordSnapshots?.hubFinanceEntries?.get?.(sid(id))||null}catch(e){return null}}
function localRows(){try{if(typeof db!=='undefined'&&db){db.hubFinanceEntries=Array.isArray(db.hubFinanceEntries)?db.hubFinanceEntries:[];return db.hubFinanceEntries}}catch(e){}try{window.db.hubFinanceEntries=Array.isArray(window.db?.hubFinanceEntries)?window.db.hubFinanceEntries:[];return window.db.hubFinanceEntries}catch(e){return []}}
function normalizeLocalTimestamp(id,canonicalRow){
 try{if(!canonicalRow)return false;const row=localRows().find(x=>sid(x?.id??x?.__hlgbId)===sid(id));if(!row||!sameMeaning(row,canonicalRow))return false;const wanted=canonicalRow.updatedAt||'';if(sid(row.updatedAt)===sid(wanted))return false;row.updatedAt=wanted;try{window.localSaveOnly?.()}catch(e){try{localSaveOnly?.()}catch(_){}}return true}catch(e){return false}
}
function noopResult(s){return {applied:true,data:clone(s.data),deleted_at:s.deleted_at||null,revision:+s.revision||1,updated_at:s.updated_at||'',updated_by:s.updated_by||null,hlgbNoop:true,hlgbNoopReason:'payroll-month-updatedAt-only-v9334'}}
function install(){
 const base=window.hlgbRecordSaveWithRetry;if(typeof base!=='function'||base.__hlgbPayrollMonthWal9334)return false;
 const wrapped=async function(module,id,data,deleted=false){
  if(module==='hubFinanceEntries'&&!deleted&&payrollMonth(data)){
   const s=snapshot(id);
   if(s&&!s.deleted_at&&s.data&&sameMeaning(data,s.data)){
    normalizeLocalTimestamp(id,s.data);
    return noopResult(s);
   }
  }
  return base.apply(this,arguments);
 };
 wrapped.__hlgbPayrollMonthWal9334=true;wrapped.__original=base;window.hlgbRecordSaveWithRetry=wrapped;return true;
}
function readWal(){try{const w=JSON.parse(localStorage.getItem(WAL_KEY)||'null');return w&&typeof w==='object'?w:null}catch(e){return null}}
function writeWal(w){try{const entries=w?.entries&&typeof w.entries==='object'?w.entries:{};w.entries=entries;if(Object.keys(entries).length)localStorage.setItem(WAL_KEY,JSON.stringify(w));else localStorage.removeItem(WAL_KEY);return true}catch(e){return false}}
function idbDeleteSame(key,opId){return new Promise(resolve=>{if(typeof indexedDB==='undefined'){resolve(false);return}let r;try{r=indexedDB.open(DB_NAME)}catch(e){resolve(false);return}r.onupgradeneeded=()=>{try{r.transaction.abort()}catch(e){};resolve(false)};r.onerror=()=>resolve(false);r.onsuccess=()=>{const d=r.result;try{if(!d.objectStoreNames.contains(STORE)){d.close();resolve(false);return}const tx=d.transaction(STORE,'readwrite'),s=tx.objectStore(STORE),g=s.get(key);g.onsuccess=()=>{const cur=g.result;if(cur&&sid(cur.opId)===sid(opId))s.delete(key)};tx.oncomplete=()=>{d.close();resolve(true)};tx.onerror=tx.onabort=()=>{d.close();resolve(false)}}catch(e){try{d.close()}catch(_){}resolve(false)}}})}
async function pruneRedundantPayrollMonthWal(){
 const w=readWal();if(!w?.entries)return {removed:0};const removed=[];
 for(const [key,op] of Object.entries(w.entries)){
  if(op?.module!=='hubFinanceEntries'||!payrollMonth(op?.data)||!op?.baseData||!sameMeaning(op.data,op.baseData))continue;
  const s=snapshot(op.id),canonicalRow=s&&!s.deleted_at&&s.data&&sameMeaning(op.data,s.data)?s.data:op.baseData;
  normalizeLocalTimestamp(op.id,canonicalRow);
  delete w.entries[key];removed.push({key,opId:op.opId});
 }
 if(!removed.length)return {removed:0};writeWal(w);
 for(const x of removed)await idbDeleteSame(x.key,x.opId);
 return {removed:removed.length,keys:removed.map(x=>x.key)};
}
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<93.34){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}}
async function boot(){install();stamp();const out=await pruneRedundantPayrollMonthWal();if(out.removed)console.info('[HLGB] v'+V+' removeu WAL mensal redundante da folha',out.keys);setTimeout(()=>{install();stamp();window.hlgbWalConfirmedReplay9333?.run?.('v9334-after-prune',true)},350)}
install();stamp();setTimeout(()=>boot().catch(e=>console.warn('[HLGB v93.34] folha mensal',e)),500);setTimeout(()=>{install();stamp()},1800);setTimeout(()=>{install();stamp()},4500);
window.hlgbPayrollMonthWal9334={version:V,install,prune:pruneRedundantPayrollMonthWal,sameMeaning};
console.info('[HLGB] v'+V+' proteção da linha mensal da folha ativa');
})();
