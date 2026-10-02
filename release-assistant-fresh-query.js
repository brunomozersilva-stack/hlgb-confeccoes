/* HLGB — garante que cada pergunta do Assistente seja processada do zero */
(function(){
'use strict';
const V='2026.10.01-assistant-fresh-query-v1';
const escSafe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let lastQuery='',lastHtml='';
function directFallback(raw){
 try{
  const sys=window.hlgbAssistantSystemWide?.parse?.(raw);if(sys)return sys;
 }catch(e){}
 try{
  const base=window.hlgbAssistant?.query?.(raw);if(base)return base;
 }catch(e){}
 return {title:'Não encontrei com segurança',text:'Não consegui responder essa pergunta com segurança usando os dados atuais do sistema. Tente citar cliente, pedido, produto, fornecedor, período ou valor.',kind:'help'};
}
function render(a){
 const out=document.getElementById('hlgbAssistantAnswer');if(!out||!a)return;
 let actions='';
 if(a.kind==='invoice-action')actions='<div class="toolbar" style="margin-top:12px"><button type="button" class="primary" onclick="hlgbAssistantOpenInvoice()">🧾 Confirmar e abrir nota oficial</button></div>';
 out.innerHTML='<h3 style="margin-top:0">'+escSafe(a.title||'Assistente HLGB')+'</h3>'+(a.text||'')+actions;
 out.dataset.pendingKind=a.kind||'';
}
function install(){
 const current=window.hlgbAssistantAsk;if(typeof current!=='function'||current.__hlgbFreshQueryV1)return;
 const base=current;
 const w=function(){
  const input=document.getElementById('hlgbAssistantInput'),out=document.getElementById('hlgbAssistantAnswer'),raw=String(input?.value||'').trim();
  if(!input||!out)return;
  window.__hlgbAssistantInvoicePending=null;
  out.dataset.pendingKind='';out.dataset.pendingText='';
  const priorHtml=out.innerHTML;
  out.innerHTML='<div class="sub">Consultando esta pergunta…</div>';
  const before=out.innerHTML;
  if(!raw){render({title:'Assistente HLGB',text:'Digite sua pergunta.',kind:'help'});return}
  try{
    const sys=window.hlgbAssistantSystemWide?.parse?.(raw);
    if(sys){render(sys);lastQuery=raw;lastHtml=out.innerHTML;return}
  }catch(e){console.warn('[HLGB consulta direcionada]',e)}
  try{base.apply(this,arguments)}catch(e){console.warn('[HLGB pergunta atual]',e)}
  const after=out.innerHTML;
  if(raw!==lastQuery&&(after===lastHtml||after===priorHtml||after===before||/Digite uma pergunta para começar/i.test(after))){
    render(directFallback(raw));
  }
  lastQuery=raw;lastHtml=out.innerHTML;
 };
 w.__hlgbFreshQueryV1=true;w.__original=base;window.hlgbAssistantAsk=w;
}
setTimeout(install,3200);
setInterval(()=>{if(typeof window.hlgbAssistantAsk==='function'&&!window.hlgbAssistantAsk.__hlgbFreshQueryV1)install()},3500);
window.HLGB_ASSISTANT_FRESH_QUERY_GUARD=V;
})();