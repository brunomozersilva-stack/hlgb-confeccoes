/* HLGB v92.97 — Assistente canônico: um único roteador, UI estável e diagnóstico */
(function(){
'use strict';
if(window.hlgbAssistantCanonical9297)return;
const V='92.97';
const sid=v=>String(v??'');
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let lastRoute='';
let lastQuery='';
let lastAt='';
let lastError='';
function bridgeDb(){try{if(typeof db!=='undefined'&&db&&window.db!==db)window.db=db}catch(e){}return !!window.db}
function deepest(fn){const seen=new Set();let cur=fn,last=fn,depth=0;while(typeof cur==='function'&&!seen.has(cur)&&depth++<40){seen.add(cur);last=cur;cur=cur.__original||cur.__hlgbOriginal||null}return typeof last==='function'?last:null}
function chainDepth(fn){const seen=new Set();let cur=fn,depth=0;while(typeof cur==='function'&&!seen.has(cur)&&depth<60){seen.add(cur);depth++;cur=cur.__original||cur.__hlgbOriginal||null}return depth}
const capturedAtLoad=window.hlgbAssistantAsk;
const coreAsk=deepest(capturedAtLoad);
function render(a,raw,route){
 const out=document.getElementById('hlgbAssistantAnswer');if(!out||!a)return false;
 let actions='';
 if(a.kind==='invoice-action'){window.__hlgbAssistantInvoicePending=a;actions='<div class="toolbar" style="margin-top:12px"><button type="button" class="primary" onclick="hlgbAssistantOpenInvoice()">🧾 Confirmar e abrir nota oficial</button></div>'}
 if(a.kind==='order-create-action'){window.__hlgbAssistantOrderPending=a;actions='<div class="toolbar" style="margin-top:12px"><button type="button" class="primary" onclick="hlgbAssistantOpenCreateOrder()">🧾 Confirmar e abrir Novo pedido</button></div>'}
 if(a.kind==='order-edit-action'){window.__hlgbAssistantOrderPending=a;actions='<div class="toolbar" style="margin-top:12px"><button type="button" class="primary" onclick="hlgbAssistantOpenEditOrder()">✏️ Confirmar e abrir pedido</button></div>'}
 out.dataset.pendingKind=a.kind||'';out.dataset.hlgbAssistantRoute=route||'';
 out.innerHTML='<h3 style="margin-top:0">'+esc(a.title||'Assistente HLGB')+'</h3>'+(a.text||'')+actions;
 try{window.auditAction?.('Consultou Assistente HLGB',sid(raw).slice(0,160))}catch(e){}
 return true;
}
function invoiceIntent(raw){return /\b(nota|fatura)\b/i.test(raw)&&/\b(fazer|faça|faca|criar|emitir|gerar|preciso|quero|montar|finalizar)\b/i.test(raw)}
function call(route,fn,raw){if(typeof fn!=='function')return null;try{const a=fn(raw);if(a){lastRoute=route;lastError='';return a}}catch(e){lastError=route+': '+sid(e?.message||e);console.warn('[HLGB Assistente '+V+'] '+route,e)}return null}
function dispatch(){
 bridgeDb();const input=document.getElementById('hlgbAssistantInput'),raw=sid(input?.value).trim();lastQuery=raw;lastAt=new Date().toISOString();lastRoute='';lastError='';
 if(!raw){if(typeof coreAsk==='function')return coreAsk.apply(this,arguments);return null}
 let a=null;
 if(invoiceIntent(raw))a=call('invoice-v3',window.hlgbAssistantInvoice?.parseV3||window.hlgbAssistantInvoice?.parse,raw);
 if(!a)a=call('order-draft',window.hlgbAssistantPrecisionV2?.handleDraft,raw);
 if(!a)a=call('orders',window.hlgbAssistantOrders?.parse,raw);
 if(!a)a=call('grade-preview',window.hlgbPatch9257?.splitGradePreview,raw);
 if(!a)a=call('precision-scoped',window.hlgbAssistantPrecisionV2?.strictScoped,raw);
 if(!a)a=call('intent-router',window.hlgbAssistantIntentRouter?.direct,raw);
 if(!a)a=call('mobile-smart',window.hlgbAssistantMobile9250?.smart,raw);
 if(!a)a=call('brain',window.hlgbAssistantBrain9265?.advanced,raw);
 if(!a)a=call('system-wide',window.hlgbAssistantSystemWide?.parse,raw);
 if(a){render(a,raw,lastRoute);return a}
 lastRoute='core';if(typeof coreAsk==='function')return coreAsk.apply(this,arguments);return null;
}
function markCanonical(fn){if(typeof fn!=='function')return fn;const marks=['__hlgbCanonical9297','__hlgbCanonical9284','__v9257','__hlgbBrain9265','__hlgbPrecisionV2','__brain9250','__hlgbSystemWideV1','__hlgbIntentRouterV2','__hlgbFreshInvoiceV1','__hlgbInvoiceV3','__hlgbInvoiceV1','__hlgbOrdersV1'];for(const k of marks)try{fn[k]=true}catch(e){}return fn}
function install(){bridgeDb();window.HLGB_ASSISTANT_FINAL_V9250=true;markCanonical(dispatch);dispatch.__original=coreAsk||null;window.hlgbAssistantAsk=dispatch;window.HLGB_ASSISTANT_ROUTER_STABLE=V;return true}
function injectCss(){
 let s=document.getElementById('hlgbAssistantCanonical9297Css');if(s)s.remove();s=document.createElement('style');s.id='hlgbAssistantCanonical9297Css';s.textContent=`
 body .modalbox.hlgb-assistant-modal{width:min(820px,94vw)!important;max-width:820px!important;max-height:88vh!important;padding:16px!important;overflow:auto!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
 body .modalbox.hlgb-assistant-modal .hlgb-assistant-box{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:10px!important;max-height:none!important;overflow:visible!important}
 body .modalbox.hlgb-assistant-modal .hlgb-assistant-box>*{grid-column:1!important;grid-row:auto!important;min-width:0!important}
 body .modalbox.hlgb-assistant-modal #hlgbAiSidebar9269{display:none!important}
 body .modalbox.hlgb-assistant-modal .hlgb-studio-main9269{grid-column:1!important;min-width:0!important}
 body .modalbox.hlgb-assistant-modal .hlgb-assistant-input{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important;padding:8px!important}
 body .modalbox.hlgb-assistant-modal #hlgbAssistantAnswer{max-height:44vh!important;overflow:auto!important;min-height:90px!important;padding:12px!important}
 body .modalbox.hlgb-assistant-modal .hlgb-assistant-examples,body .modalbox.hlgb-assistant-modal .hlgb-assistant-quick9250{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important}
 body .modalbox.hlgb-assistant-modal #hlgbVoiceBox9255 textarea{min-height:105px!important;max-height:180px!important}
 @media(max-width:700px){body .modalbox.hlgb-assistant-modal{width:100vw!important;max-width:100vw!important;max-height:94vh!important;border-radius:20px 20px 0 0!important;padding:12px!important}body .modalbox.hlgb-assistant-modal .hlgb-assistant-examples,body .modalbox.hlgb-assistant-modal .hlgb-assistant-quick9250{grid-template-columns:1fr 1fr!important}}
 `;document.head.appendChild(s)
}
function fixOpenUi(){injectCss();bridgeDb();const input=document.getElementById('hlgbAssistantInput');if(!input)return false;const modal=input.closest?.('.modalbox');if(modal)modal.classList.add('hlgb-assistant-modal');try{window.hlgbCriticalUi9255?.ensureVoice?.()}catch(e){}try{if(!document.getElementById('hlgbAssistantVoiceControls'))window.hlgbAssistantVoice?.ensureControls?.()}catch(e){}return true}
function wrapOpen(){const fn=window.openHlgbAssistant;if(typeof fn!=='function'||fn.__hlgbCanonical9297Open)return false;const w=function(){const out=fn.apply(this,arguments);setTimeout(fixOpenUi,0);setTimeout(fixOpenUi,160);setTimeout(fixOpenUi,500);return out};w.__hlgbCanonical9297Open=true;w.__original=fn;window.openHlgbAssistant=w;return true}
function diagnostic(){bridgeDb();const input=document.getElementById('hlgbAssistantInput'),voice=document.querySelectorAll('#hlgbAssistantVoiceControls').length;return {kind:'hlgb_assistant_diagnostic',version:V,generatedAt:new Date().toISOString(),dbBridge:!!window.db,routerStable:window.hlgbAssistantAsk===dispatch,routerChainDepth:chainDepth(window.hlgbAssistantAsk),capturedChainDepth:chainDepth(capturedAtLoad),lastRoute,lastQuery,lastAt,lastError,ui:{open:!!input,modal:!!input?.closest?.('.modalbox'),voiceControlSets:voice,answer:!!document.getElementById('hlgbAssistantAnswer')},modules:{precision:!!window.hlgbAssistantPrecisionV2,brain:!!window.hlgbAssistantBrain9265,intent:!!window.hlgbAssistantIntentRouter,systemWide:!!window.hlgbAssistantSystemWide,orders:!!window.hlgbAssistantOrders,invoice:!!window.hlgbAssistantInvoice,mobile:!!window.hlgbAssistantMobile9250,voice:!!window.hlgbAssistantVoice,voiceContinuous:!!window.hlgbAssistantVoiceContinuous,criticalVoice:!!window.hlgbCriticalUi9255}}}
function downloadDiagnostic(){const d=diagnostic(),b=new Blob([JSON.stringify(d,null,2)],{type:'application/json;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='HLGB-DIAGNOSTICO-ASSISTENTE-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{try{URL.revokeObjectURL(a.href)}catch(e){}a.remove()},900);return d}
function injectAuditor(){const result=document.getElementById('hlgbAuditorResult'),actions=result?.parentElement?.querySelector('.hlgb-auditor-actions');if(!actions||document.getElementById('hlgbAssistantDebug9297'))return false;const b=document.createElement('button');b.id='hlgbAssistantDebug9297';b.type='button';b.className='secondary';b.textContent='🤖 Diagnóstico Assistente';b.onclick=()=>{const d=downloadDiagnostic();alert('Diagnóstico do Assistente exportado.\n\nRoteador único: '+(d.routerStable?'sim':'não')+'\nPonte de dados: '+(d.dbBridge?'ok':'falha')+'\nÚltima rota: '+(d.lastRoute||'-')+'\nControles de voz: '+d.ui.voiceControlSets)};actions.appendChild(b);return true}
function boot(){install();injectCss();wrapOpen();injectAuditor()}
boot();setTimeout(()=>{install();wrapOpen();injectAuditor()},250);setTimeout(()=>{install();wrapOpen();injectAuditor()},1200);
document.addEventListener('click',e=>{const b=e.target?.closest?.('button');if(!b)return;if(b.id==='hlgbAssistantFloatingBtn'||String(b.getAttribute('onclick')||'').includes('openHlgbAssistant'))setTimeout(fixOpenUi,80);if(b.id==='hlgbAuditorNavBtn'||b.id==='hlgbAuditorOpenBtn'||/Auditor\s*\/\s*Testes/i.test(sid(b.textContent)))setTimeout(injectAuditor,100)},true);
window.addEventListener('pageshow',()=>{install();wrapOpen();bridgeDb()});
window.hlgbAssistantCanonical9297={version:V,install,dispatch,diagnostic,downloadDiagnostic,fixOpenUi,bridgeDb,coreAsk};
window.HLGB_ASSISTANT_CANONICAL_9297=V;
console.info('[HLGB] Assistente canônico v'+V+' ativo — roteador único + UI estável');
})();
