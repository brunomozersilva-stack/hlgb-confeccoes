/* HLGB v94.09 — base fresca da Impressora 3D + snapshots da expansão + reparo seguro de baseline WAL.
   Não cria autoridade de save: usa hlgbRecordLoadBundle, a WAL durável e hlgbRecordSaveWithRetry existentes.
   O reparo só ocorre quando a linha remota prova que o registro já existia antes da pendência local. */
(function(){
'use strict';
const V='94.09',BUILD='2026-10-25-3d-expansion-snapshot-hydration-v9409';
const WAL_KEY='hlgb_durable_wal_v1',WAL_DB='hlgb_durable_wal',WAL_STORE='entries';
const EXPANSION_MODULES=new Set(['printer3dSettings','printer3dProducts','printer3dSales']);
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
let installs=0,refreshes=0,repairs=0,hydratedSnapshots=0,lastRefresh='',lastError='',lastResult=null,lastRepair=null,lastHydration=null;
function loadBundleFn(){try{if(typeof hlgbRecordLoadBundle==='function')return hlgbRecordLoadBundle}catch(e){}return window.hlgbRecordLoadBundle}
function sessionFn(){try{if(typeof cloudEnsureFreshSession==='function')return cloudEnsureFreshSession}catch(e){}return window.cloudEnsureFreshSession}
function snapshotRoot(){try{if(hlgbRecordSnapshots&&typeof hlgbRecordSnapshots==='object')return hlgbRecordSnapshots}catch(e){}try{if(window.hlgbRecordSnapshots&&typeof window.hlgbRecordSnapshots==='object')return window.hlgbRecordSnapshots}catch(e){}return null}
function snapshotFor(module,id){const root=snapshotRoot();try{return root?.[module]?.get?.(sid(id))||null}catch(e){return null}}
function snapshot(){return snapshotFor('printer3dSettings','settings-main')}
function bundleRows(out){if(Array.isArray(out?.rows))return out.rows;if(Array.isArray(out))return out;if(Array.isArray(out?.data?.rows))return out.data.rows;return []}
function hydrateExpansionSnapshots(out){
 const root=snapshotRoot(),rows=bundleRows(out);let count=0;const modules=new Set();
 if(!root){lastHydration={count:0,modules:[],reason:'snapshot-root-unavailable',rows:rows.length};return lastHydration}
 for(const row of rows){
  const module=sid(row?.module),id=sid(row?.entity_id??row?.entityId);
  if(!EXPANSION_MODULES.has(module)||!id)continue;
  if(!(root[module] instanceof Map))root[module]=new Map();
  root[module].set(id,{module,entity_id:id,data:clone(row?.data??null),deleted_at:row?.deleted_at??null,revision:Number(row?.revision||0),updated_at:sid(row?.updated_at||row?.updatedAt),updated_by:row?.updated_by??row?.updatedBy??null});
  count++;modules.add(module);
 }
 hydratedSnapshots+=count;lastHydration={count,modules:[...modules],reason:count?'bundle-rows-hydrated':'no-expansion-rows',rows:rows.length};return lastHydration;
}
function readWal(){try{const x=JSON.parse(localStorage.getItem(WAL_KEY)||'null');if(x&&x.entries&&typeof x.entries==='object')return x}catch(e){}return {schema:1,updatedAt:new Date().toISOString(),entries:{}}}
function writeWal(w){w.schema=1;w.updatedAt=new Date().toISOString();localStorage.setItem(WAL_KEY,JSON.stringify(w));return w}
function pendingWal(module,id){try{return readWal()?.entries?.[sid(module)+'|'+sid(id)]||null}catch(e){return null}}
function openWalDb(){return new Promise((resolve,reject)=>{try{const r=indexedDB.open(WAL_DB,1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(WAL_STORE))d.createObjectStore(WAL_STORE,{keyPath:'key'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('IndexedDB indisponível'))}catch(e){reject(e)}})}
async function putWalDb(entry){const d=await openWalDb();try{await new Promise((resolve,reject)=>{const tx=d.transaction(WAL_STORE,'readwrite');tx.objectStore(WAL_STORE).put(clone(entry));tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('Falha ao atualizar WAL no IndexedDB'));tx.onabort=()=>reject(tx.error||new Error('Atualização da WAL abortada'))})}finally{try{d.close()}catch(e){}}}
async function repairMissingWalBaseline(module,id){
 const key=sid(module)+'|'+sid(id),s=snapshotFor(module,id),w=readWal(),cur=w?.entries?.[key];
 if(!cur){lastRepair={key,repaired:false,reason:'no-pending'};return lastRepair}
 if(cur.baseData!==null&&cur.baseData!==undefined){lastRepair={key,repaired:false,reason:'baseline-present'};return lastRepair}
 if(!s||s.deleted_at||s.data===null||s.data===undefined){lastRepair={key,repaired:false,reason:'snapshot-missing'};return lastRepair}
 const pendingCreated=Date.parse(sid(cur.createdAt)),remoteUpdated=Date.parse(sid(s.updated_at||s.updatedAt));
 if(!Number.isFinite(pendingCreated)||!Number.isFinite(remoteUpdated)){
  lastRepair={key,repaired:false,reason:'timestamps-invalid',pendingCreated:sid(cur.createdAt),remoteUpdated:sid(s.updated_at||s.updatedAt)};return lastRepair
 }
 if(remoteUpdated>pendingCreated){
  lastRepair={key,repaired:false,reason:'remote-newer-than-pending',pendingCreated:sid(cur.createdAt),remoteUpdated:sid(s.updated_at||s.updatedAt)};return lastRepair
 }
 const repairedAt=new Date().toISOString();
 const next={...cur,baseData:clone(s.data),baseUpdatedAt:sid(s.updated_at||s.updatedAt),updatedAt:repairedAt,baselineRepairVersion:V,baselineRepairedAt:repairedAt};
 w.entries[key]=next;writeWal(w);await putWalDb(next);
 repairs++;lastRepair={key,repaired:true,reason:'remote-predates-pending',pendingCreated:sid(cur.createdAt),remoteUpdated:sid(s.updated_at||s.updatedAt),attempts:Number(cur.attempts||0),state:sid(cur.state||''),storage:'localStorage+indexedDB'};
 return lastRepair;
}
async function refresh3dBase(){
 const session=sessionFn();if(typeof session==='function')await session(false);
 const load=loadBundleFn();if(typeof load!=='function')throw new Error('Leitura atual da nuvem indisponível. Atualize a página e tente novamente.');
 const out=await load({preserveLocal:true,since:null});
 const hydration=hydrateExpansionSnapshots(out);
 const pending=pendingWal('printer3dSettings','settings-main');
 if(pending&&!snapshot())throw new Error('A configuração 3D possui uma alteração pendente, mas a revisão atual da nuvem não foi recebida. Nada foi salvo.');
 const repair=await repairMissingWalBaseline('printer3dSettings','settings-main');
 refreshes++;lastRefresh=new Date().toISOString();lastResult={rows:bundleRows(out).length,snapshotRevision:+snapshot()?.revision||0,hydration:clone(hydration),repair:clone(repair)};
 return out;
}
function saveButton(){try{return document.querySelector('#printer3dHome9400Host button.primary[onclick*="save3dSettings9400"]')}catch(e){return null}}
function install3d(){
 const old=window.save3dSettings9400;
 if(typeof old!=='function')return false;
 if(old.__hlgb3dFreshBase9409)return true;
 const wrapped=async function(){
  const btn=saveButton(),oldDisabled=btn?.disabled,oldText=btn?.textContent;
  if(btn){btn.disabled=true;btn.textContent='☁️ Conferindo versão atual…'}
  try{
   await refresh3dBase();
   return await old.apply(this,arguments);
  }catch(e){
   lastError=sid(e?.message||e);console.error('[HLGB '+V+'] base 3D',e);
   alert('Não foi possível conferir a versão atual na nuvem. Nada foi sobrescrito.\n\n'+lastError);
   return false;
  }finally{
   const b=saveButton();if(b){b.disabled=!!oldDisabled;b.textContent=oldText||'Salvar configuração'}
  }
 };
 wrapped.__hlgb3dFreshBase9407=true;wrapped.__hlgb3dWalBaselineRepair9408=true;wrapped.__hlgb3dFreshBase9409=true;wrapped.__original=old;window.save3dSettings9400=wrapped;installs++;
 return true;
}
function install(){install3d();window.HLGB_3D_FRESH_BASE_9407=V;window.HLGB_WAL_BASELINE_REPAIR_9408=V;window.HLGB_3D_SNAPSHOT_HYDRATION_9409=V;return !!window.save3dSettings9400?.__hlgb3dFreshBase9409}
let tries=0;function boot(){if(install())return;if(++tries<40)setTimeout(boot,250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('hlgb:authenticated',()=>setTimeout(install,120),true);
window.hlgbLogin3dBaseline9407={version:V,build:BUILD,refresh3dBase,hydrateExpansionSnapshots,repairMissingWalBaseline,install,status:()=>({version:V,build:BUILD,installed:!!window.save3dSettings9400?.__hlgb3dFreshBase9409,walRepairInstalled:!!window.save3dSettings9400?.__hlgb3dWalBaselineRepair9408,snapshotHydrationInstalled:true,installs,refreshes,repairs,hydratedSnapshots,lastRefresh,lastError,lastResult:clone(lastResult),lastRepair:clone(lastRepair),lastHydration:clone(lastHydration),loginGate:window.hlgbLoginConfirmGate9407?.status?.()||null,snapshot:clone(snapshot())})};
console.info('[HLGB] v'+V+' base 3D + hidratação de snapshots + reparo seguro WAL ativos; sem nova autoridade de save');
})();
