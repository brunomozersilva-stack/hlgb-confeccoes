/* HLGB v94.07 — base fresca da Impressora 3D + diagnóstico do gate de login.
   Não cria autoridade de save: usa hlgbRecordLoadBundle e hlgbRecordSaveWithRetry existentes. */
(function(){
'use strict';
const V='94.07',BUILD='2026-10-25-login-3d-baseline-v9407';
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
let installs=0,refreshes=0,lastRefresh='',lastError='',lastResult=null;
function loadBundleFn(){try{if(typeof hlgbRecordLoadBundle==='function')return hlgbRecordLoadBundle}catch(e){}return window.hlgbRecordLoadBundle}
function sessionFn(){try{if(typeof cloudEnsureFreshSession==='function')return cloudEnsureFreshSession}catch(e){}return window.cloudEnsureFreshSession}
function snapshot(){try{return hlgbRecordSnapshots?.printer3dSettings?.get?.('settings-main')||null}catch(e){try{return window.hlgbRecordSnapshots?.printer3dSettings?.get?.('settings-main')||null}catch(_){return null}}}
async function refresh3dBase(){
 const session=sessionFn();if(typeof session==='function')await session(false);
 const load=loadBundleFn();if(typeof load!=='function')throw new Error('Leitura atual da nuvem indisponível. Atualize a página e tente novamente.');
 /* preserveLocal mantém exatamente o que o usuário digitou/tem pendente; a carga atualiza
    a base/snapshot usada pelo merge de três vias antes do próximo save. */
 const out=await load({preserveLocal:true,since:null});
 refreshes++;lastRefresh=new Date().toISOString();lastResult={rows:Array.isArray(out?.rows)?out.rows.length:null,snapshotRevision:+snapshot()?.revision||0};
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
 wrapped.__hlgb3dFreshBase9407=true;wrapped.__original=old;window.save3dSettings9400=wrapped;installs++;
 return true;
}
function install(){install3d();window.HLGB_3D_FRESH_BASE_9407=V;return !!window.save3dSettings9400?.__hlgb3dFreshBase9407}
let tries=0;function boot(){if(install())return;if(++tries<40)setTimeout(boot,250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('hlgb:authenticated',()=>setTimeout(install,120),true);
window.hlgbLogin3dBaseline9407={version:V,build:BUILD,refresh3dBase,install,status:()=>({version:V,build:BUILD,installed:!!window.save3dSettings9400?.__hlgb3dFreshBase9407,installs,refreshes,lastRefresh,lastError,lastResult,loginGate:window.hlgbLoginConfirmGate9407?.status?.()||null,snapshot:clone(snapshot())})};
console.info('[HLGB] v'+V+' base fresca 3D ativa; sem nova autoridade de save');
})();
