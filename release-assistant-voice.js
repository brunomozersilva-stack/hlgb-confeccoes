/* HLGB — voz para o Assistente */
(function(){
'use strict';
const V='2026.10.01-assistant-voice-v2';
let recognition=null,listening=false,speaking=false;
function assistantOpen(){return !!document.getElementById('hlgbAssistantInput')}
function speechCtor(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
function setMicLabel(t){const b=document.getElementById('hlgbAssistantMicBtn');if(b)b.textContent=t}
function setSpeakState(on){
  speaking=!!on;
  const read=document.getElementById('hlgbAssistantSpeakBtn'),stop=document.getElementById('hlgbAssistantStopSpeakBtn');
  if(read)read.disabled=!!on;
  if(stop)stop.disabled=!on;
}
function ensureControls(){
  if(!assistantOpen()||document.getElementById('hlgbAssistantVoiceControls'))return;
  const input=document.getElementById('hlgbAssistantInput');if(!input)return;
  const host=input.closest?.('.hlgb-assistant-input')||input.parentElement;if(!host)return;
  const wrap=document.createElement('div');wrap.id='hlgbAssistantVoiceControls';wrap.style.cssText='display:flex;gap:6px;flex-wrap:wrap';
  wrap.innerHTML='<button type="button" id="hlgbAssistantMicBtn" class="secondary">🎙️ Falar</button><button type="button" id="hlgbAssistantSpeakBtn" class="secondary">🔊 Ler resposta</button><button type="button" id="hlgbAssistantStopSpeakBtn" class="secondary" disabled>⏹️ Parar leitura</button>';
  host.insertAdjacentElement('afterend',wrap);
  wrap.querySelector('#hlgbAssistantMicBtn').onclick=toggleMic;
  wrap.querySelector('#hlgbAssistantSpeakBtn').onclick=speakAnswer;
  wrap.querySelector('#hlgbAssistantStopSpeakBtn').onclick=stopSpeaking;
  if(!speechCtor()){const b=wrap.querySelector('#hlgbAssistantMicBtn');b.disabled=true;b.title='Reconhecimento de voz não disponível neste navegador.'}
  if(!window.speechSynthesis){for(const id of ['hlgbAssistantSpeakBtn','hlgbAssistantStopSpeakBtn']){const b=wrap.querySelector('#'+id);if(b){b.disabled=true;b.title='Leitura em voz alta não disponível neste navegador.'}}}
}
function cleanupRecognition(){
  listening=false;recognition=null;setMicLabel('🎙️ Falar');
}
function stopMic(){
  const r=recognition;
  cleanupRecognition();
  try{r?.abort?.()}catch(e){try{r?.stop?.()}catch(_){}}
}
function submitRecognized(text){
  const input=document.getElementById('hlgbAssistantInput');if(!input||!text)return;
  input.value=text;
  input.dispatchEvent?.(new Event('input',{bubbles:true}));
  setTimeout(()=>{try{window.hlgbAssistantAsk?.()}catch(e){console.warn('[HLGB voz pergunta]',e)}},30);
}
function toggleMic(){
  if(listening){stopMic();return}
  try{window.speechSynthesis?.cancel?.();setSpeakState(false)}catch(e){}
  const C=speechCtor();if(!C)return alert('O reconhecimento de voz não está disponível neste navegador.');
  try{
    const r=new C();recognition=r;r.lang='pt-BR';r.interimResults=false;r.continuous=false;r.maxAlternatives=1;
    r.onstart=()=>{if(recognition!==r)return;listening=true;setMicLabel('⏹️ Parar microfone')};
    r.onend=()=>{if(recognition===r)cleanupRecognition()};
    r.onerror=e=>{if(recognition===r)cleanupRecognition();if(e?.error!=='aborted'&&e?.error!=='no-speech')console.warn('[HLGB voz]',e?.error||e)};
    r.onresult=e=>{
      const text=Array.from(e.results||[]).map(x=>x?.[0]?.transcript||'').join(' ').trim();
      if(recognition===r)cleanupRecognition();
      if(text)submitRecognized(text);
    };
    r.start();
  }catch(e){cleanupRecognition();alert('Não foi possível iniciar o microfone. Confira a permissão do navegador.')}
}
function plainAnswer(){
  const out=document.getElementById('hlgbAssistantAnswer');if(!out)return '';
  return String(out.innerText||out.textContent||'').replace(/\s+/g,' ').trim();
}
function stopSpeaking(){
  try{window.speechSynthesis?.cancel?.()}catch(e){}
  setSpeakState(false);
}
function speakAnswer(){
  const text=plainAnswer();if(!text)return alert('Ainda não há uma resposta para ler.');
  if(!window.speechSynthesis)return alert('A leitura em voz alta não está disponível neste navegador.');
  try{
    stopSpeaking();
    const u=new SpeechSynthesisUtterance(text);u.lang='pt-BR';
    u.onstart=()=>setSpeakState(true);u.onend=()=>setSpeakState(false);u.onerror=()=>setSpeakState(false);
    window.speechSynthesis.speak(u);
  }catch(e){setSpeakState(false);console.warn('[HLGB voz leitura]',e)}
}
const oldOpen=window.openHlgbAssistant;
if(typeof oldOpen==='function'&&!oldOpen.__hlgbVoiceV2){
  const w=function(){const r=oldOpen.apply(this,arguments);setTimeout(ensureControls,0);setTimeout(ensureControls,150);return r};w.__hlgbVoiceV2=true;w.__original=oldOpen;window.openHlgbAssistant=w;
}
function boot(){if(assistantOpen())ensureControls()}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,1000),0)}catch(e){}
setInterval?.(()=>{if(assistantOpen())ensureControls()},2500);
window.hlgbAssistantVoice={ensureControls,toggleMic,stopMic,speakAnswer,stopSpeaking,plainAnswer,submitRecognized};
window.HLGB_ASSISTANT_VOICE_GUARD=V;
console.info('[HLGB] voz do Assistente v2 ativa');
})();