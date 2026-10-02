/* HLGB — voz contínua: só envia quando o usuário termina */
(function(){
'use strict';
const V='2026.10.01-assistant-voice-continuous-v1';
let rec=null,listening=false,manualStop=false,finalText='',lastInterim='';
function Ctor(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
function input(){return document.getElementById('hlgbAssistantInput')}
function answer(){return document.getElementById('hlgbAssistantAnswer')}
function setLabel(t){const b=document.getElementById('hlgbAssistantMicBtn');if(b)b.textContent=t}
function clearOld(){
 window.__hlgbAssistantInvoicePending=null;
 const a=answer();if(a){a.innerHTML='<div class="sub">Ouvindo uma nova solicitação…</div>';a.dataset.pendingKind=''}
}
function currentText(){return [finalText,lastInterim].filter(Boolean).join(' ').replace(/\s+/g,' ').trim()}
function updateInput(){
 const e=input();if(!e)return;e.value=currentText();try{e.dispatchEvent(new Event('input',{bubbles:true}))}catch(_){}
}
function submit(){
 const e=input(),txt=(e?.value||'').trim();if(!txt)return;
 setTimeout(()=>{try{window.hlgbAssistantAsk?.()}catch(err){console.warn('[HLGB voz envio]',err)}},40);
}
function endAndSend(){
 if(!listening)return;
 manualStop=true;listening=false;setLabel('🎙️ Falar');
 try{rec?.stop?.()}catch(e){try{rec?.abort?.()}catch(_){}}
 updateInput();submit();
}
function start(){
 if(listening){endAndSend();return}
 const C=Ctor();if(!C)return alert('O reconhecimento de voz não está disponível neste navegador.');
 try{window.speechSynthesis?.cancel?.()}catch(e){}
 clearOld();finalText='';lastInterim='';manualStop=false;
 const e=input();if(e)e.value='';
 const r=new C();rec=r;r.lang='pt-BR';r.interimResults=true;r.continuous=true;r.maxAlternatives=1;
 r.onstart=()=>{if(rec!==r)return;listening=true;setLabel('⏹️ Terminar e enviar')};
 r.onresult=ev=>{
  if(rec!==r)return;
  let interim='';
  for(let i=ev.resultIndex||0;i<ev.results.length;i++){
   const part=(ev.results[i]?.[0]?.transcript||'').trim();if(!part)continue;
   if(ev.results[i].isFinal)finalText=(finalText+' '+part).trim();else interim=(interim+' '+part).trim();
  }
  lastInterim=interim;updateInput();
 };
 r.onerror=ev=>{
  if(ev?.error==='aborted'||ev?.error==='no-speech')return;
  console.warn('[HLGB voz contínua]',ev?.error||ev);
 };
 r.onend=()=>{
  if(rec!==r)return;
  if(listening&&!manualStop){
   setTimeout(()=>{try{r.start()}catch(e){listening=false;setLabel('🎙️ Falar')}},180);
  }else{rec=null;setLabel('🎙️ Falar')}
 };
 r.start();
}
function stopReading(){
 try{window.speechSynthesis?.cancel?.()}catch(e){}
 const read=document.getElementById('hlgbAssistantSpeakBtn'),stop=document.getElementById('hlgbAssistantStopSpeakBtn');
 if(read)read.disabled=false;if(stop)stop.disabled=true;
}
function speak(){
 const a=answer(),txt=String(a?.innerText||a?.textContent||'').replace(/\s+/g,' ').trim();
 if(!txt)return alert('Ainda não há uma resposta para ler.');
 if(!window.speechSynthesis)return alert('A leitura em voz alta não está disponível neste navegador.');
 stopReading();
 const u=new SpeechSynthesisUtterance(txt);u.lang='pt-BR';
 u.onstart=()=>{const read=document.getElementById('hlgbAssistantSpeakBtn'),stop=document.getElementById('hlgbAssistantStopSpeakBtn');if(read)read.disabled=true;if(stop)stop.disabled=false};
 u.onend=stopReading;u.onerror=stopReading;window.speechSynthesis.speak(u);
}
function install(){
 const e=input();if(!e)return;
 let old=document.getElementById('hlgbAssistantVoiceControls');
 const wrap=document.createElement('div');wrap.id='hlgbAssistantVoiceControls';wrap.style.cssText='display:flex;gap:6px;flex-wrap:wrap';
 wrap.innerHTML='<button type="button" id="hlgbAssistantMicBtn" class="secondary">🎙️ Falar</button><button type="button" id="hlgbAssistantSpeakBtn" class="secondary">🔊 Ler resposta</button><button type="button" id="hlgbAssistantStopSpeakBtn" class="secondary" disabled>⏹️ Parar leitura</button>';
 if(old)old.replaceWith(wrap);else (e.closest?.('.hlgb-assistant-input')||e.parentElement)?.insertAdjacentElement('afterend',wrap);
 wrap.dataset.continuous='1';
 const mic=wrap.querySelector('#hlgbAssistantMicBtn'),read=wrap.querySelector('#hlgbAssistantSpeakBtn'),stop=wrap.querySelector('#hlgbAssistantStopSpeakBtn');
 if(mic)mic.onclick=start;if(read)read.onclick=speak;if(stop)stop.onclick=stopReading;
 if(!Ctor()&&mic)mic.disabled=true;
}
function boot(){if(input())install()}
setTimeout(boot,2100);
setInterval(()=>{if(input()&&!document.getElementById('hlgbAssistantVoiceControls')?.dataset?.continuous){install();const w=document.getElementById('hlgbAssistantVoiceControls');if(w)w.dataset.continuous='1'}},3000);
window.hlgbAssistantVoiceContinuous={start,endAndSend,submit,currentText,install};
window.HLGB_ASSISTANT_VOICE_CONTINUOUS_GUARD=V;
console.info('[HLGB] voz contínua ativa: o usuário termina antes do envio');
})();