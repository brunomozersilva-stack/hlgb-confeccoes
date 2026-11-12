/* HLGB v95.67 — Entrega observável do botão Salvar do Hub.
 * Escopo restrito ao modal de entradas/saídas do Hub. O script não grava
 * diretamente, não descarta dados e nunca interpreta status-only como clique.
 * Reusa exclusivamente window.modalSave, que valida e exige ACK + readback.
 */
(function(){
'use strict';
const VERSION='95.67';
if(window.hlgbHubSaveProof9567?.version===VERSION)return;
const state={clicks:0,created:0,validated:0,confirmed:0,failed:0,blocked:0,
 last:{phase:'not-tested',outcome:'not-tested',at:'',source:'',traceAttempt:0,traceOutcome:'not-tested',clickObserved:false},
 events:[]};
let busy=false;
const iso=()=>new Date().toISOString(),sid=v=>String(v??'');
function trace(){try{return window.hlgbHubSaveTrace9483?.status?.()||null}catch(_){return null}}
function put(phase,outcome,detail={}){
 const item={at:iso(),phase,outcome,source:detail.source||'hub-modal-save',
  traceAttempt:Number(detail.traceAttempt)||0,traceOutcome:detail.traceOutcome||'not-tested',
  clickObserved:detail.clickObserved===true,errorCode:detail.errorCode||''};
 state.last=item;state.events.push(item);if(state.events.length>24)state.events.shift();
 try{window.dispatchEvent?.(new CustomEvent('hlgb:hub-save-ui-proof',{detail:item}))}catch(_){}
 renderMessage();
 return item;
}
function host(){
 const modal=document.getElementById('modal');
 if(!modal||!modal.querySelector('#hubEntryDesc,#hubEntryValue'))return null;
 let el=modal.querySelector('#hlgbHubSaveStatus9567');
 if(!el){el=document.createElement('div');el.id='hlgbHubSaveStatus9567';el.setAttribute('role','status');
  el.style.cssText='margin:8px 0;padding:8px 10px;border:1px solid #d9c6d3;border-radius:8px;background:#fffbfd;font-size:13px;white-space:normal';
  const btn=modal.querySelector('button.modalSave');if(btn)btn.insertAdjacentElement('beforebegin',el);
  else modal.querySelector('#modalContent')?.appendChild(el);
 }
 return el;
}
function renderMessage(message){
 const target=host();if(!target)return false;
 const last=state.last;
 const label=message||({
  'not-tested':'Aguardando clique em Salvar.',
  'click-received':'Clique recebido. Conferindo os dados antes do envio…',
  'sending':'Salvando e aguardando confirmação do servidor…',
  'confirmed':'Salvo e confirmado na nuvem por releitura.',
  'blocked':'Salvamento não iniciado. Verifique a mensagem abaixo.',
  'failed':'Não foi possível confirmar o salvamento. Os dados permanecem no formulário.',
  'unverified':'O clique foi processado, mas o servidor não comprovou a gravação. Verifique o Auditor.'
 }[last.phase]||'Verifique o salvamento.');
 target.textContent=label;
 target.dataset.status=last.phase;
 return true;
}
function selectHubButton(target){
 const btn=target?.closest?.('button.modalSave');
 if(!btn||!btn.closest('#modal'))return null;
 const modal=btn.closest('#modal');
 if(!modal.querySelector('#hubEntryDesc,#hubEntryValue'))return null;
 return btn;
}
async function submit(btn){
 state.clicks++;
 if(busy){state.blocked++;put('blocked','blocked',{errorCode:'duplicate-click'});return false}
 const save=window.modalSave;
 if(typeof save!=='function'){
  state.failed++;put('failed','failed',{errorCode:'no-modal-callback'});
  renderMessage('O botão não possui uma função de salvamento ativa. O formulário foi preservado. Reabra esta janela sem limpar dados.');
  return false;
 }
 busy=true;
 const before=trace(),beforeAttempts=Number(before?.attempts||0);
 put('click-received','in-progress',{traceAttempt:beforeAttempts});
 const original=btn.textContent;
 btn.disabled=true;btn.textContent='☁️ Conferindo salvamento…';
 let warning=null;
 try{
  warning=setTimeout(()=>{
   if(busy)renderMessage('O servidor ainda não confirmou o lançamento. Mantenha esta janela aberta; não salve novamente.');
  },10000);
  const result=await Promise.resolve(save());
  const after=trace(),fresh=Number(after?.attempts||0)>beforeAttempts;
  const verified=fresh&&(after?.outcome==='confirmed'||after?.outcome==='already-saved')&&
   (after?.confirmation==='rpc-ack-and-readback'||after?.confirmation==='readback-only')&&
   !!after?.readbackAt&&after?.clickObserved===true;
  if(result===true&&verified){
   state.confirmed++;put('confirmed','confirmed',{traceAttempt:after.attemptId,traceOutcome:after.outcome,clickObserved:true});
   return true;
  }
  if(result===false){state.blocked++;put('blocked','blocked',{traceAttempt:after?.attemptId||0,traceOutcome:after?.outcome||'not-tested',errorCode:'form-rejected'});
   renderMessage('O formulário não foi enviado. Confira os campos obrigatórios e a mensagem de validação.');return false}
  state.failed++;put('unverified','unverified',{traceAttempt:after?.attemptId||0,traceOutcome:after?.outcome||'not-tested',errorCode:'no-ack-readback'});
  renderMessage('O retorno não comprovou o salvamento desta tentativa. Não foi informado sucesso. Confira o Auditor.');
  return false;
 }catch(e){
  state.failed++;
  const msg=sid(e?.message||e);
  put('failed','failed',{errorCode:/conflito/i.test(msg)?'revision-conflict':/network|fetch|timeout|conexão/i.test(msg)?'network':'unverified'});
  renderMessage('Falha ao salvar. Os dados devem permanecer no formulário. '+msg.slice(0,240));
  return false;
 }finally{
  if(warning!=null)clearTimeout(warning);
  busy=false;
  if(btn.isConnected){btn.disabled=false;btn.textContent=original}
 }
}
function onClick(event){
 const btn=selectHubButton(event.target);
 if(!btn)return;
 // The legacy submitModal() forwards a click without awaiting a promise.
 // Handle exactly one Hub submission here, and keep the existing confirmed
 // save callback as the only authority; prevent the legacy document listener
 // from submitting it a second time.
 event.preventDefault();event.stopImmediatePropagation();
 submit(btn).catch(e=>{state.failed++;put('failed','failed',{errorCode:'unexpected-handler-error'});console.error('[HLGB Hub v95.67]',e)});
}
function onEditorClick(event){
 const btn=event.target?.closest?.('button.he-save9286');
 if(!btn||!btn.closest('#hlgbHubEditor9270'))return;
 // The editor has its own verified async handler; do not intercept it.
 // Capture intent only, never claim a remote save here.
 put('click-received','in-progress',{source:'edit-button'});
}
function status(){
 return {version:VERSION,clicks:state.clicks,confirmed:state.confirmed,failed:state.failed,
  blocked:state.blocked,last:{...state.last},recent:state.events.slice(-12),busy,
  transportTrace:trace()?{outcome:trace().outcome,source:trace().source,clickObserved:trace().clickObserved,
    confirmation:trace().confirmation,attempts:trace().attempts}:null};
}
document.addEventListener('click',onClick,true);
document.addEventListener('click',onEditorClick,true);
window.hlgbHubSaveProof9567={version:VERSION,submit,status,renderMessage,selectHubButton,readOnlyOutsideExistingSave:true};
console.info('[HLGB] Hub v95.67: botão Salvar com confirmação rastreável e feedback sem duplicar RPC');
})();