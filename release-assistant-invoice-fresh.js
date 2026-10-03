/* HLGB — Assistente de notas sempre usa a consulta atual */
(function(){
'use strict';
const V='2026.10.01-assistant-invoice-fresh-v1';
const escSafe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function isInvoiceIntent(raw){
 const s=String(raw||'');
 return /\b(nota|fatura)\b/i.test(s)&&/\b(fazer|faça|faca|criar|emitir|gerar|preciso|quero|montar|finalizar)\b/i.test(s);
}
function renderAnswer(a){
 const out=document.getElementById('hlgbAssistantAnswer');if(!out)return;
 let actions='';
 if(a?.kind==='invoice-action'){
  window.__hlgbAssistantInvoicePending=a;
  actions='<div class="toolbar" style="margin-top:12px"><button type="button" class="primary" onclick="hlgbAssistantOpenInvoice()">🧾 Confirmar e abrir nota oficial</button></div>';
 }
 out.innerHTML='<h3 style="margin-top:0">'+escSafe(a?.title||'Nota de cliente')+'</h3>'+(a?.text||'')+actions;
 out.dataset.pendingKind=a?.kind||'';
}
function ensureTop(){
 const current=window.hlgbAssistantAsk;
 if(typeof current!=='function'||current.__hlgbFreshInvoiceV1)return;
 const base=current;
 const w=function(){
  const input=document.getElementById('hlgbAssistantInput'),raw=input?.value||'';
  window.__hlgbAssistantInvoicePending=null;
  if(!isInvoiceIntent(raw))return base.apply(this,arguments);
  const api=window.hlgbAssistantInvoice;
  let a=null;
  try{a=api?.parseV3?.(raw)||api?.parse?.(raw)||null}catch(e){console.warn('[HLGB nota atual]',e)}
  if(!a){
   a={kind:'invoice-empty',title:'Complete a nota',text:'Informe nesta solicitação o <b>cliente, os produtos e as quantidades</b>. Ex.: “330 Camisola Liliane, 264 Body Ritinha e 93 Calcinha Ariana para Bianca”.'};
  }
  renderAnswer(a);
  try{auditAction?.('Consultou Assistente HLGB',String(raw).slice(0,160))}catch(e){}
 };
 w.__hlgbFreshInvoiceV1=true;w.__original=base;window.hlgbAssistantAsk=w;
}
function boot(){ensureTop()}
setTimeout(boot,1900);
setInterval(()=>{if(window.HLGB_ASSISTANT_FINAL_V9250)return;if(typeof window.hlgbAssistantAsk==='function'&&!window.hlgbAssistantAsk.__hlgbFreshInvoiceV1)ensureTop()},3000);
window.HLGB_ASSISTANT_INVOICE_FRESH_GUARD=V;
console.info('[HLGB] notas do Assistente usam somente a consulta atual');
})();