/* HLGB v95.16 — proteção não destrutiva de navegação da Impressora 3D.
   Recria somente elementos de interface quando o menu/telas forem removidos por um rerender.
   Não lê/escreve registros, não altera WAL, não navega automaticamente. */
(function(){
'use strict';
if(window.hlgbPrinter3dNavGuard9516)return;
const PAGES=['printer3dHome9400','printer3dProducts9400','printer3dSales9400','printer3dCatalog9400'];
const BUTTONS=['p3HomeNav9400','p3ProductsNav9400','p3SalesNav9400','p3CatalogNav9400'];
const state={version:'95.16',checks:0,repairs:0,lastError:'',lastReason:'',missing:[]};
let navObserved=null,observer=null,scheduled=false;
function missing(){
 const ids=[...PAGES,'printer3dNav9400',...BUTTONS];
 return ids.filter(id=>!document.getElementById(id));
}
function diagnose(){
 const x=missing();
 state.missing=x;
 return {version:state.version,status:!x.length?'pass':'fail',missing:x,checks:state.checks,repairs:state.repairs,lastError:state.lastError,lastReason:state.lastReason};
}
function verify(reason){
 state.checks++;state.lastReason=reason;
 if(!document.getElementById('appShell')||!document.getElementById('nav'))return diagnose();
 const before=missing();
 if(before.length){
  try{
   if(typeof window.hlgbBusinessExpansion9400?.install==='function'){
    if(window.hlgbBusinessExpansion9400.install()===true&&!missing().length){
     state.repairs++;state.lastError='';
    }else state.lastError='O instalador 3D não restaurou todos os atalhos e telas.';
   }else state.lastError='Módulo da Impressora 3D não carregado.';
  }catch(e){state.lastError=String(e?.message||e);console.warn('[HLGB 3D v95.16] menu',e)}
 }
 watch();
 return diagnose();
}
function schedule(reason){
 if(scheduled)return;
 scheduled=true;
 setTimeout(()=>{scheduled=false;verify(reason)},80);
}
function watch(){
 const n=document.getElementById('nav');
 if(n===navObserved)return;
 try{observer?.disconnect()}catch(e){}
 navObserved=n;
 if(n&&typeof MutationObserver==='function'){
  observer=new MutationObserver(()=>{if(missing().length)schedule('nav-change')});
  observer.observe(n,{childList:true,subtree:true});
 }
}
function boot(){
 verify('boot');
 window.addEventListener('hlgb:authenticated',()=>schedule('authenticated'));
 window.addEventListener('focus',()=>schedule('focus'));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule('visible')});
 setInterval(()=>{if(!document.hidden)verify('periodic')},30000);
}
window.hlgbPrinter3dNavGuard9516={state,diagnose,verify};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();