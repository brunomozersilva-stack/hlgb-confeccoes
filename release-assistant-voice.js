/* HLGB — voz para o Assistente */
(function(){
'use strict';
const V='2026.10.01-assistant-voice-v1';
let recognition=null,listening=false;
function assistantOpen(){return !!document.getElementById('hlgbAssistantInput')}
function speechCtor(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
function ensureControls(){
  if(!assistantOpen()||document.getElementById('hlgbAssistantVoiceControls'))return;
  const input=document.getElementById('hlgbAssistantInput');if(!input)return;
  const host=input.closest?.('.hlgb-assistant-input')||input.parentElement;if(!host)return;
  const wrap=document.createElement('div');wrap.id='hlgbAssistantVoiceControls';wrap.style.cssText='display:flex;gap:6px;flex-wrap:wrap';
  wrap.innerHTML='<button type="button" id="hlgbAssistantMicBtn" class="secondary">🎙️ Falar</button><button type="button" id="hlgbAssistantSpeakBtn" class="secondary">🔊 Ler resposta</button>';
  host.insertAdjacentElement('afterend',wrap);
  wrap.querySelector('#hlgbAssistantMicBtn').onclick=toggleMic;
  wrap.querySelector('#hlgbAssistantSpeakBtn').onclick=speakAnswer;
  if(!speechCtor()){const b=wrap.querySelector('#hlgbAssistantMicBtn');b.disabled=true;b.title='Reconhecimento de voz não disponível neste navegador.'}
  if(!window.speechSynthesis){const b=wrap.querySelector('#hlgbAssistantSpeakBtn');b.disabled=true;b.title='Leitura em voz alta não disponível neste navegador.'}
}
function stopMic(){
  try{recognition?.stop?.()}catch(e){}
  listening=false;const b=document.getElementById('hlgbAssistantMicBtn');if(b)b.textContent='🎙️ Falar';
}
function toggleMic(){
  if(listening){stopMic();return}
  const C=speechCtor();if(!C)return alert('O reconhecimento de voz não está disponível neste navegador.');
  try{
    recognition=new C();recognition.lang='pt-BR';recognition.interimResults=false;recognition.continuous=false;
    recognition.onstart=()=>{listening=true;const b=document.getElementById('hlgbAssistantMicBtn');if(b)b.textContent='⏹️ Parar'};
    recognition.onend=()=>{listening=false;const b=document.getElementById('hlgbAssistantMicBtn');if(b)b.textContent='🎙️ Falar'};
    recognition.onerror=e=>{listening=false;const b=document.getElementById('hlgbAssistantMicBtn');if(b)b.textContent='🎙️ Falar';if(e?.error!=='aborted')console.warn('[HLGB voz]',e?.error||e)};
    recognition.onresult=e=>{const text=Array.from(e.results||[]).map(r=>r?.[0]?.transcript||'').join(' ').trim(),input=document.getElementById('hlgbAssistantInput');if(input&&text){input.value=text;try{window.hlgbAssistantAsk?.()}catch(_){}}};
    recognition.start();
  }catch(e){alert('Não foi possível iniciar o microfone. Confira a permissão do navegador.')}
}
function plainAnswer(){
  const out=document.getElementById('hlgbAssistantAnswer');if(!out)return '';
  return String(out.innerText||out.textContent||'').replace(/\s+/g,' ').trim();
}
function speakAnswer(){
  const text=plainAnswer();if(!text)return alert('Ainda não há uma resposta para ler.');
  if(!window.speechSynthesis)return alert('A leitura em voz alta não está disponível neste navegador.');
  try{window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='pt-BR';window.speechSynthesis.speak(u)}catch(e){console.warn('[HLGB voz leitura]',e)}
}
const oldOpen=window.openHlgbAssistant;
if(typeof oldOpen==='function'&&!oldOpen.__hlgbVoiceV1){
  const w=function(){const r=oldOpen.apply(this,arguments);setTimeout(ensureControls,0);setTimeout(ensureControls,150);return r};w.__hlgbVoiceV1=true;w.__original=oldOpen;window.openHlgbAssistant=w;
}
function boot(){if(assistantOpen())ensureControls()}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,1000),0)}catch(e){}
setInterval?.(()=>{if(assistantOpen())ensureControls()},3000);
window.hlgbAssistantVoice={ensureControls,toggleMic,stopMic,speakAnswer,plainAnswer};
window.HLGB_ASSISTANT_VOICE_GUARD=V;
console.info('[HLGB] voz do Assistente ativa');
})();