/* HLGB v92.67 — experiência visual premium do Assistente HLGB */
(function(){
'use strict';
const V='92.67';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
function css(){
 if(document.getElementById('hlgbAssistantUi9267Css'))return;
 const s=document.createElement('style');s.id='hlgbAssistantUi9267Css';s.textContent=`
 .modalbox.hlgb-assistant-modal{width:min(980px,96vw)!important;max-width:980px!important;max-height:92vh!important;border-radius:24px!important;overflow:auto!important;border:1px solid #eadce5!important;box-shadow:0 28px 85px rgba(62,28,49,.24)!important;background:#fbf8fa!important}
 .modalbox.hlgb-assistant-modal>.modalhead{background:transparent!important;border:0!important;padding-bottom:0!important}
 .hlgb-assistant-box{display:flex;flex-direction:column;gap:13px}
 .hlgb-ai-hero9267{position:relative;overflow:hidden;border-radius:20px;padding:20px 22px;background:linear-gradient(135deg,#5f2d4d 0%,#8a4569 55%,#b56c8e 100%);color:#fff;box-shadow:0 12px 30px rgba(92,45,72,.18)}
 .hlgb-ai-hero9267:after{content:'';position:absolute;right:-75px;top:-80px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.11)}
 .hlgb-ai-top9267{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;position:relative;z-index:1}.hlgb-ai-brand9267{display:flex;gap:13px;align-items:flex-start}.hlgb-ai-logo9267{width:48px;height:48px;border-radius:15px;background:rgba(255,255,255,.16);display:grid;place-items:center;font-size:24px;border:1px solid rgba(255,255,255,.22);box-shadow:inset 0 1px 0 rgba(255,255,255,.2)}
 .hlgb-ai-eyebrow9267{font-size:11px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;opacity:.82;margin-bottom:3px}.hlgb-ai-hero9267 h2{margin:0;font-size:24px;line-height:1.12}.hlgb-ai-hero9267 p{margin:6px 0 0;max-width:690px;opacity:.88;font-size:13px;line-height:1.45}.hlgb-ai-status9267{white-space:nowrap;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);border-radius:999px;padding:7px 11px;font-size:12px;font-weight:700}
 .hlgb-ai-cap9267{position:relative;z-index:1;display:flex;gap:7px;flex-wrap:wrap;margin-top:15px}.hlgb-ai-cap9267 span{border-radius:999px;padding:6px 9px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.16);font-size:11px;font-weight:700}
 .hlgb-assistant-box>.sub:first-of-type{margin:0!important;padding:10px 12px!important;background:#fff!important;border:1px solid #eee2e9!important;border-radius:12px!important;color:#6f5965!important}
 .hlgb-assistant-input{display:grid!important;grid-template-columns:1fr auto!important;gap:8px!important;padding:10px!important;background:#fff!important;border:1px solid #e9dce4!important;border-radius:15px!important;box-shadow:0 5px 16px rgba(62,28,49,.05)}
 .hlgb-assistant-input input{min-height:44px!important;border:0!important;background:transparent!important;outline:none!important;box-shadow:none!important;font-size:14px!important}.hlgb-assistant-input .primary{min-width:108px!important;border-radius:11px!important;padding:10px 15px!important}
 #hlgbQuick9267{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px}#hlgbQuick9267 button{min-height:54px;border:1px solid #e8dce3;background:#fff;border-radius:13px;padding:8px 7px;color:#4b3440;font-size:11px;font-weight:700;cursor:pointer;text-align:center;transition:.16s ease}#hlgbQuick9267 button:hover{transform:translateY(-1px);border-color:#ba8ca4;box-shadow:0 6px 14px rgba(78,41,62,.08)}#hlgbQuick9267 b{display:block;font-size:16px;margin-bottom:3px}
 .hlgb-assistant-examples{display:flex!important;gap:7px!important;flex-wrap:wrap!important}.hlgb-assistant-examples .secondary{border-radius:999px!important;background:#f5eef2!important;border-color:#eadce4!important;font-size:11px!important;padding:7px 10px!important}
 #hlgbAssistantVoiceControls{padding:9px 0!important;display:flex!important;gap:7px!important;flex-wrap:wrap!important}#hlgbAssistantVoiceControls button{border-radius:10px!important}
 #hlgbVoiceBox9255{margin-top:0!important;padding:14px!important;background:#fff!important;border:1px solid #eadde5!important;border-radius:16px!important;box-shadow:0 5px 14px rgba(55,27,44,.045)!important}#hlgbVoiceBox9255 textarea{min-height:120px!important;max-height:210px!important;border-radius:12px!important;background:#fcfafb!important}#hlgbVoiceBox9255>div:first-child b{font-size:13px!important}
 #hlgbAssistantAnswer{position:relative!important;min-height:112px!important;padding:17px 18px!important;background:#fff!important;border:1px solid #e7d9e2!important;border-radius:17px!important;box-shadow:0 8px 20px rgba(54,25,43,.055)!important;line-height:1.55!important;color:#3c2b34!important}#hlgbAssistantAnswer:before{content:'RESPOSTA';display:block;font-size:10px;letter-spacing:.13em;font-weight:800;color:#9b7087;margin-bottom:8px}#hlgbAssistantAnswer h3{font-size:18px!important;margin:0 0 8px!important;color:#573549!important}
 #hlgbAiFeedback9266 button{border-radius:999px!important;font-size:11px!important;padding:7px 10px!important}.hlgb-ai-footer9267{display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;padding:0 2px;color:#826d78;font-size:10px}.hlgb-ai-footer9267 strong{color:#684657}
 @media(max-width:820px){#hlgbQuick9267{grid-template-columns:repeat(3,minmax(0,1fr))}.hlgb-ai-top9267{flex-direction:column}.hlgb-ai-status9267{white-space:normal}.modalbox.hlgb-assistant-modal{width:96vw!important}.hlgb-assistant-input{grid-template-columns:1fr!important}.hlgb-assistant-input .primary{width:100%!important}}
 @media(max-width:520px){#hlgbQuick9267{grid-template-columns:repeat(2,minmax(0,1fr))}.hlgb-ai-hero9267{padding:17px}.hlgb-ai-hero9267 h2{font-size:21px}.hlgb-ai-logo9267{width:42px;height:42px}.hlgb-assistant-box{gap:10px}}
 `;document.head.appendChild(s);
}
function serverLabel(){
 const s=String(window.HLGB_SERVER_AI_STATUS||'');
 if(s==='online')return '● IA avançada online';
 if(s==='thinking')return '● Analisando…';
 if(s==='setup-required')return '● IA local ativa';
 if(s==='fallback'||s==='no-session')return '● IA local ativa';
 return '● Assistente pronto';
}
function runPrompt(q){
 const input=document.getElementById('hlgbAssistantInput');if(!input)return;
 input.value=q;input.dispatchEvent(new Event('input',{bubbles:true}));
 if(typeof window.hlgbAssistantAsk==='function')window.hlgbAssistantAsk();
}
function hero(){
 const box=document.querySelector('.hlgb-assistant-box');if(!box||document.getElementById('hlgbAiHero9267'))return;
 const h=document.createElement('div');h.id='hlgbAiHero9267';h.className='hlgb-ai-hero9267';h.innerHTML='<div class="hlgb-ai-top9267"><div class="hlgb-ai-brand9267"><div class="hlgb-ai-logo9267">✦</div><div><div class="hlgb-ai-eyebrow9267">Inteligência da fábrica</div><h2>Assistente HLGB</h2><p>Consulta pedidos, produção, cortes, facções, financeiro, compras, clientes e auditoria em um só lugar — com contexto, voz, importação e aprendizado por correções.</p></div></div><div id="hlgbAiStatus9267" class="hlgb-ai-status9267">'+serverLabel()+'</div></div><div class="hlgb-ai-cap9267"><span>📦 Pedidos</span><span>🏭 Produção</span><span>✂️ Cortes</span><span>🧵 Facções</span><span>💰 Financeiro</span><span>📊 Análises</span><span>🎙️ Voz</span><span>🧠 Aprende correções</span></div>';
 box.insertBefore(h,box.firstChild);
}
function quicks(){
 const input=document.querySelector('.hlgb-assistant-input');if(!input||document.getElementById('hlgbQuick9267'))return;
 const d=document.createElement('div');d.id='hlgbQuick9267';
 const rows=[['📊','Resumo geral','Me dê um resumo geral da fábrica'],['📦','Pedidos','Quais pedidos precisam de atenção?'],['🏭','Produção','Como está a produção por local?'],['💰','Financeiro','Me dê a posição financeira atual'],['🚚','Entregas','O que entrega hoje e amanhã?'],['⚠️','Problemas','Quais erros estão abertos?']];
 d.innerHTML=rows.map((x,i)=>'<button type="button" data-q="'+i+'"><b>'+x[0]+'</b>'+x[1]+'</button>').join('');d.querySelectorAll('button').forEach((b,i)=>b.onclick=()=>runPrompt(rows[i][2]));input.insertAdjacentElement('afterend',d);
}
function footer(){
 const box=document.querySelector('.hlgb-assistant-box');if(!box||document.getElementById('hlgbAiFooter9267'))return;
 const f=document.createElement('div');f.id='hlgbAiFooter9267';f.className='hlgb-ai-footer9267';f.innerHTML='<span><strong>HLGB AI v'+V+'</strong> · contexto da conversa + dados do sistema</span><span>Alterações operacionais continuam exigindo prévia e confirmação.</span>';box.appendChild(f);
}
function cleanVoiceSend(){
 const box=document.getElementById('hlgbVoiceBox9255');if(!box)return;
 const preferred=document.getElementById('hlgbVoiceSend9255');
 const buttons=[...box.querySelectorAll('button')].filter(b=>/enviar pergunta|usar texto e enviar|enviar ao assistente/.test(norm(b.textContent))||b.id==='hlgbVoiceSendBackup9256');
 const keep=preferred||buttons[0];for(const b of buttons){if(b!==keep)b.remove()}
 if(keep){keep.textContent='Enviar ao Assistente';keep.title='Enviar o texto revisado para o Assistente HLGB'}
}
let observed=null,observer=null;
function watchModal(){
 const modal=document.querySelector('.modalbox.hlgb-assistant-modal');if(!modal||modal===observed)return;
 try{observer?.disconnect()}catch(e){};observed=modal;observer=new MutationObserver(()=>{cleanVoiceSend();quicks();footer();hero()});observer.observe(modal,{childList:true,subtree:true});
}
function enhance(){
 css();hero();quicks();footer();cleanVoiceSend();watchModal();const st=document.getElementById('hlgbAiStatus9267');if(st)st.textContent=serverLabel();
 const ans=document.getElementById('hlgbAssistantAnswer');if(ans&&norm(ans.textContent)==='digite uma pergunta para comecar.')ans.innerHTML='<h3>Como posso ajudar agora?</h3><div class="sub">Use os atalhos acima, escreva normalmente ou fale. Posso cruzar informações de vários módulos quando sua pergunta exigir.</div>';
}
document.addEventListener('click',e=>{if(e.target?.closest?.('#hlgbAssistantFloatingBtn,[onclick*="openHlgbAssistant"]'))setTimeout(enhance,80)},true);
setInterval(()=>{if(document.getElementById('hlgbAssistantInput'))enhance()},1200);
window.hlgbAssistantUi9267={version:V,enhance,runPrompt,cleanVoiceSend};
console.info('[HLGB] Assistente visual v'+V+' ativo');
})();
