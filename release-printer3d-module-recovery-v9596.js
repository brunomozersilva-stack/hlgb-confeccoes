/* HLGB v95.96 — recuperação finita e não destrutiva de dois módulos opcionais 3D.
   Só tenta reimportar o JS depois da autenticação, se a API ainda não existir.
   Não lê ou escreve WAL/IndexedDB, não cria registros nem altera dados financeiros. */
(function(){
'use strict';
if(window.hlgbPrinter3dModuleRecovery9596)return;
const V='95.96',MODULES=[
 {file:'release-printer3d-nav-guard-v9516.js',api:'hlgbPrinter3dNavGuard9516'},
 {file:'release-printer3d-cloud-hydration-v9517.js',api:'hlgbPrinter3dCloud9517'}
];
const state={version:V,installedAt:new Date().toISOString(),attempts:{},recovered:[],missing:[],failed:[],lastCheckAt:'',lastReason:'',lastError:''};
const loading=new Set();
const sid=v=>String(v??'');
const ready=()=>window.__HLGB_AUTH_READY===true&&window.__HLGB_BOOT_READY_9477===true;
function status(){
 return {version:V,ready:ready(),attempts:{...state.attempts},recovered:[...state.recovered],
  missing:[...state.missing],failed:[...state.failed],lastCheckAt:state.lastCheckAt,lastReason:state.lastReason,lastError:state.lastError};
}
function check(reason='manual'){
 state.lastCheckAt=new Date().toISOString();state.lastReason=reason;
 if(!ready())return {skipped:'not-authenticated',...status()};
 for(const item of MODULES){
  if(window[item.api])continue;
  if(loading.has(item.file)||state.attempts[item.file])continue;
  const found=document.querySelector?.('script[data-hlgb-3d-retry-9596="'+item.file+'"]');
  if(found)continue;
  state.attempts[item.file]=1;loading.add(item.file);
  try{
   const script=document.createElement('script');
   script.src='./'+item.file+'?hlgb_recovery_9596='+Date.now();
   script.async=true;
   script.setAttribute('data-hlgb-3d-retry-9596',item.file);
   script.onload=()=>{
    loading.delete(item.file);
    if(window[item.api]){
     if(!state.recovered.includes(item.file))state.recovered.push(item.file);
     state.missing=state.missing.filter(v=>v!==item.file);
    }else{
     if(!state.missing.includes(item.file))state.missing.push(item.file);
     state.lastError='Arquivo retornou, mas a API 3D continua indisponível: '+item.file;
    }
   };
   script.onerror=()=>{
    loading.delete(item.file);
    if(!state.failed.includes(item.file))state.failed.push(item.file);
    state.lastError='Falha ao recuperar módulo 3D: '+item.file;
   };
   (document.head||document.documentElement).appendChild(script);
  }catch(e){
   loading.delete(item.file);
   if(!state.failed.includes(item.file))state.failed.push(item.file);
   state.lastError='Falha ao inserir módulo 3D '+item.file+': '+sid(e?.message||e);
  }
 }
 return status();
}
function defer(reason){
 setTimeout(()=>check(reason),2300);
}
window.hlgbPrinter3dModuleRecovery9596={state,status,check};
window.addEventListener('hlgb:authenticated',()=>defer('authenticated'));
window.addEventListener('pageshow',()=>{if(ready())defer('pageshow')});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(ready())defer('DOMContentLoaded')},{once:true});
else if(ready())defer('loaded-after-auth');
})();
