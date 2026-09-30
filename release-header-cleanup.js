/* HLGB — limpeza da barra superior e ferramentas em Sistema */
(function(){
'use strict';
const V='2026.09.30-header-cleanup-v2';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();

function systemMenu(){
  const groups=[...document.querySelectorAll('#nav .nav-group')];
  const sys=groups.find(g=>norm(g.querySelector('.nav-group-title span')?.textContent||'')==='sistema');
  return sys?.querySelector('.nav-submenu')||null;
}
function addButton(id,label,handler){
  const menu=systemMenu();if(!menu)return null;
  let b=document.getElementById(id);
  if(!b){b=document.createElement('button');b.id=id;b.type='button';b.textContent=label;b.onclick=handler;menu.appendChild(b)}
  return b;
}
function injectStyles(){
  if(document.getElementById('hlgbHeaderCleanupStyle'))return;
  const st=document.createElement('style');st.id='hlgbHeaderCleanupStyle';
  st.textContent=
    '#appShell header{gap:10px}'+
    '#appShell header>div:last-child{display:flex;align-items:center;justify-content:flex-end;gap:7px;min-width:0;flex-wrap:nowrap}'+
    '#appShell header #backupBtn,#appShell header #importBackupBtn,#appShell header #backupImportInput,#appShell header #cloudSaveBtn,#appShell header #hlgbAssistantBtn{display:none!important}'+
    '#appShell header #cloudStatus{white-space:nowrap;margin-right:0!important}'+
    '#appShell header #currentUserLabel{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:360px;margin-right:0!important}'+
    '#hlgb955SaveBadge{top:auto!important;right:16px!important;bottom:16px!important}'+
    '#hlgb955SaveBadge.ok,#hlgb955SaveBadge.off{display:none!important}'+
    '#hlgb955SaveBadge.wait,#hlgb955SaveBadge.bad{display:block!important}'+
    '#hlgb955Panel{top:auto!important;right:16px!important;bottom:58px!important;max-height:min(70vh,620px)!important}'+
    '@media(max-width:900px){#appShell header #currentUserLabel{max-width:170px}#hlgb955SaveBadge{right:10px!important;bottom:10px!important}#hlgb955Panel{right:10px!important;bottom:52px!important;width:min(430px,calc(100vw - 20px))!important}}';
  document.head.appendChild(st);
}
function reorganize(){
  injectStyles();
  const assistant=document.getElementById('hlgbAssistantBtn');if(assistant)assistant.remove();

  addButton('hlgbSystemBackupExport','⬇️ Exportar backup',()=>{
    if(typeof backup==='function')backup();
    else document.getElementById('backupBtn')?.click();
  });
  addButton('hlgbSystemBackupImport','⬆️ Importar backup',()=>{
    document.getElementById('backupImportInput')?.click();
  });

  const input=document.getElementById('backupImportInput');
  if(input)input.style.setProperty('display','none','important');

  const exportBtn=document.getElementById('backupBtn');
  if(exportBtn)exportBtn.style.setProperty('display','none','important');
  const importBtn=document.getElementById('importBackupBtn');
  if(importBtn)importBtn.style.setProperty('display','none','important');
  const cloudSave=document.getElementById('cloudSaveBtn');
  if(cloudSave)cloudSave.style.setProperty('display','none','important');

  // O selo flutuante só aparece quando há algo que exige atenção.
  const badge=document.getElementById('hlgb955SaveBadge');
  if(badge){
    badge.style.setProperty('top','auto','important');
    badge.style.setProperty('right','16px','important');
    badge.style.setProperty('bottom','16px','important');
    if(badge.classList.contains('ok')||badge.classList.contains('off'))badge.style.setProperty('display','none','important');
    else badge.style.setProperty('display','block','important');
  }
}
function boot(){
  reorganize();
  try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(reorganize,350),0)}catch(e){}
  setTimeout(reorganize,900);
  setTimeout(reorganize,1800);
  try{
    const observer=new MutationObserver(reorganize);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    window.__hlgbHeaderCleanupObserver=observer;
  }catch(e){}
}
window.hlgbHeaderCleanup={version:V,reorganize,systemMenu};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
console.info('[HLGB] barra superior simplificada '+V);
})();