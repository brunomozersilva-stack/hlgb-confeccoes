/* HLGB v94.08 — base fresca da Impressora 3D + reparo seguro de baseline WAL + diagnóstico do gate de login.
   Não cria autoridade de save: usa hlgbRecordLoadBundle, a WAL durável e hlgbRecordSaveWithRetry existentes.
   O reparo só ocorre quando o snapshot prova que o registro remoto já existia antes da pendência local. */
(function(){
'use strict';
const V='94.08',BUILD='2026-10-25-3d-missing-wal-baseline-repair-v9408';
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
let installs=0,refreshes=0,repairs=0,lastRefresh='',lastError='',lastResult=null,lastRepair=null;
function loadBundleFn(){try{if(typeof hlgbRecordLoadBundle==='function')return hlgbRecordLoadBundle}catch(e){}return window.hlgbRecordLoadBundle}
function sessionFn(){try{if(typeof cloudEnsureFreshSession==='function')return cloudEnsureFreshSession}catch(e){}return window.cloudEnsureFreshSession}
function snapshotFor(module,id){try{return hlgbRecordSnapshots?.[module]?.get?.(sid(id))||null}catch(e){try{return window.hlgbRecordSnapshots?.[module]?.get?.(sid(id))||null}catch(_){return null}}}
function snapshot(){return snapshotFor('printer3dSettings','settings-main')}
function fn(name){try{const v=window[name];if(typeof v==='function')return v}catch(e){}try{return eval('typeof '+name+'==="function"?'+name+':null')}catch(e){return null}}
async function repairMissingWalBaseline(module,id){
 const key=sid(module)+'|'+sid(id),read=fn('read955'),write=fn('write955'),put=fn('idbPut955'),update=fn('update955');
 const s=snapshotFor(module,id);
 if(typeof read!=='function'||typeof write!=='function'){lastRepair={key,repaired:false,reason:'wal-api-unavailable'};return lastRepair}
 const w=read(),cur=w?.entries?.[key];
 if(!cur){lastRepair={key,repaired:false,reason:'no-pending'};return lastRepair}
 if(cur.baseData!==null&&cur.baseData!==undefined){lastRepair={key,repaired:false,reason:'baseline-present'};return lastRepair}
 if(!s||s.deleted_at||s.data===null||s.data===undefined){lastRepair={key,repaired:false,reason:'snapshot-missing'};return lastRepair}
 const pendingCreated=Date.parse(sid(cur.createdAt)),remoteUpdated=Date.parse(sid(s.updated_at||s.updatedAt));
 if(!Number.isFinite(pendingCreated)||!Number.isFinite(remoteUpdated)){
  lastRepair={key,repaired:false,reason:'timestamps-invalid',pendingCreated:sid(cur.createdAt),remoteUpdated:sid(s.updated_at||s.updatedAt)};return lastRepair
 }
 /* Segurança: se o servidor mudou depois que a pendência nasceu, não sabemos qual era a base
    original e o conflito deve continuar. Só preenchemos a base quando a linha remota comprovadamente
    é anterior (ou igual) ao nascimento da pendência. */
 if(remoteUpdated>pendingCreated){
  lastRepair={key,repaired:false,reason:'remote-newer-than-pending',pendingCreated:sid(cur.createdAt),remoteUpdated:sid(s.updated_at||s.updatedAt)};return lastRepair
 }
 const next={...cur,baseData:clone(s.data),baseUpdatedAt:sid(s.updated_at||s.updatedAt),updatedAt:new Date().toISOString(),baselineRepairVersion:V,baselineRepairedAt:new Date().toISOString()};
 w.entries[key]=next;write(w);if(typeof put==='function')await put(next);if(typeof update==='function')update();
 repairs++;lastRepair={key,repaired:true,reason:'remote-predates-pending',pendingCreated:sid(cur.createdAt),remoteUpdated:sid(s.updated_at||s.updatedAt),attempts:Number(cur.attempts||0),state:sid(cur.state||'')};
 return lastRepair;
}
async function refresh3dBase(){
 const session=sessionFn();if(typeof session==='function')await session(false);
 const load=loadBundleFn();if(typeof load!=='function')throw new Error('Leitura atual da nuvem indisponível. Atualize a página e tente novamente.');
 /* preserveLocal mantém exatamente o que o usuário digitou/tem pendente; a carga atualiza
    a base/snapshot usada pelo merge de três vias antes do próximo save. */
 const out=await load({preserveLocal:true,since:null});
 const repair=await repairMissingWalBaseline('printer3dSettings','settings-main');
 refreshes++;lastRefresh=new Date().toISOString();lastResult={rows:Array.isArray(out?.rows)?out.rows.length:null,snapshotRevision:+snapshot()?.revision||0,repair:clone(repair)};
 return out;
}
function saveButton(){try{return document.querySelector('#printer3dHome9400Host button.primary[onclick*="save3dSettings9400"]')}catch(e){return null}}
function install3d(){
 const old=window.save3dSettings9400;
 if(typeof old!=='function')return false;
 if(old.__hlgb3dFreshBase9407)return true;
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
 wrapped.__hlgb3dFreshBase9407=true;wrapped.__hlgb3dWalBaselineRepair9408=true;wrapped.__original=old;window.save3dSettings9400=wrapped;installs++;
 return true;
}
function install(){install3d();window.HLGB_3D_FRESH_BASE_9407=V;window.HLGB_WAL_BASELINE_REPAIR_9408=V;return !!window.save3dSettings9400?.__hlgb3dFreshBase9407}
let tries=0;function boot(){if(install())return;if(++tries<40)setTimeout(boot,250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('hlgb:authenticated',()=>setTimeout(install,120),true);
window.hlgbLogin3dBaseline9407={version:V,build:BUILD,refresh3dBase,repairMissingWalBaseline,install,status:()=>({version:V,build:BUILD,installed:!!window.save3dSettings9400?.__hlgb3dFreshBase9407,walRepairInstalled:!!window.save3dSettings9400?.__hlgb3dWalBaselineRepair9408,installs,refreshes,repairs,lastRefresh,lastError,lastResult:clone(lastResult),lastRepair:clone(lastRepair),loginGate:window.hlgbLoginConfirmGate9407?.status?.()||null,snapshot:clone(snapshot())})};
console.info('[HLGB] v'+V+' base fresca 3D + reparo seguro de baseline WAL ativos; sem nova autoridade de save');
})();
