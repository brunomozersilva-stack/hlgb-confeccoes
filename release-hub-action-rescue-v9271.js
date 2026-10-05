/* HLGB v92.71 — resgate de ações do Hub sem onclick inline */
(function(){
'use strict';
const V='92.71';
const sid=v=>String(v??'');
const HUB_SELECTOR='#hubFinanceiro,#hubDue9166';
const ACTIONS={
 editHubFinanceEntry:'edit',quickEditHub9185:'edit',
 toggleHubFinanceEntry:'toggle',toggleHubQuick9185:'toggle',
 deleteHubFinanceEntry:'delete'
};
function insideHub(el){return !!el?.closest?.(HUB_SELECTOR)}
function parseCall(code){
 code=sid(code).trim();if(!code)return null;
 const name=Object.keys(ACTIONS).find(n=>new RegExp('\\b'+n+'\\s*\\(').test(code));if(!name)return null;
 const start=code.indexOf('(',code.indexOf(name));if(start<0)return null;
 let raw=code.slice(start+1);const close=raw.lastIndexOf(')');if(close>=0)raw=raw.slice(0,close);raw=raw.trim();
 let id;
 try{id=JSON.parse(raw)}catch(_){
   const quoted=raw.match(/^["']([^"']*)["']/);if(quoted)id=quoted[1];
   else{const num=raw.match(/^-?\d+(?:\.\d+)?/);if(num)id=Number(num[0]);else id=raw.replace(/[}\]\s;]+$/g,'').trim()}
 }
 return {name,kind:ACTIONS[name],id};
}
function entryById(id){try{return (Array.isArray(window.db?.hubFinanceEntries)?window.db.hubFinanceEntries:[]).find(x=>sid(x?.id??x?.__hlgbId)===sid(id))||null}catch(e){return null}}
function run(call){
 if(!call)return false;
 if(call.kind==='edit'){
   const fn=window.hlgbHubEditor9270?.open||window.editHubFinanceEntry||window.quickEditHub9185;
   if(typeof fn!=='function')throw new Error('Editor do Hub não está disponível.');
   return fn(call.id)!==false;
 }
 if(call.kind==='toggle'){
   const fn=window.toggleHubFinanceEntry||window.toggleHubQuick9185;
   if(typeof fn!=='function')throw new Error('Ação Pago/Recebido do Hub não está disponível.');
   return fn(call.id)!==false;
 }
 if(call.kind==='delete'){
   const fn=window.deleteHubFinanceEntry;
   if(typeof fn!=='function')throw new Error('Exclusão do Hub não está disponível.');
   return fn(call.id)!==false;
 }
 return false;
}
function onClick(ev){
 const btn=ev.target?.closest?.('button,[role="button"]');if(!btn||!insideHub(btn))return;
 const code=btn.getAttribute('onclick')||'';const call=parseCall(code);if(!call)return;
 // Intercepta antes do navegador compilar/executar onclick inline quebrado.
 ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation?.();
 try{run(call)}catch(err){console.error('[HLGB Hub Rescue '+V+']',err);try{alert('Não foi possível executar esta ação do Hub: '+String(err?.message||err))}catch(_){}}
}
function repairButtons(){
 document.querySelectorAll(HUB_SELECTOR+' button[onclick]').forEach(btn=>{
   const call=parseCall(btn.getAttribute('onclick'));if(!call)return;
   btn.dataset.hlgbHubAction=call.kind;btn.dataset.hlgbHubId=sid(call.id);
 });
}
document.addEventListener('click',onClick,true);
const mo=new MutationObserver(()=>repairButtons());
function boot(){repairButtons();const hub=document.getElementById('hubFinanceiro');if(hub)try{mo.observe(hub,{subtree:true,childList:true})}catch(e){}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.hlgbHubActionRescue9271={version:V,parseCall,run,repairButtons,entryById};
console.info('[HLGB] Hub Action Rescue v'+V+' ativo');
})();
