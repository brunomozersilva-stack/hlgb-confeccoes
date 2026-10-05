/* HLGB v92.66 — Assistente híbrido: IA no servidor + fallback local + aprendizado controlado */
(function(){
'use strict';
const V='92.66';
const ENDPOINT='https://huhrgvijgsshqlsnqeuz.supabase.co/functions/v1/hlgb-assistant-ai';
const HISTORY_KEY='hlgb_assistant_server_history_v9266';
let status='boot',lastExchange=null,installTries=0;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function inputEl(){return document.getElementById('hlgbAssistantInput')}
function outputEl(){return document.getElementById('hlgbAssistantAnswer')}
function token(){
 try{if(typeof cloudAccessToken!=='undefined'&&cloudAccessToken)return String(cloudAccessToken)}catch(e){}
 try{if(window.cloudAccessToken)return String(window.cloudAccessToken)}catch(e){}
 for(const store of [localStorage,sessionStorage]){try{const raw=store.getItem('hlgb_supabase_auth_v1');if(!raw)continue;const a=JSON.parse(raw);if(a?.access_token)return String(a.access_token)}catch(e){}}
 return '';
}
function history(){try{const a=JSON.parse(sessionStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(a)?a.slice(-10):[]}catch(e){return []}}
function saveHistory(rows){try{sessionStorage.setItem(HISTORY_KEY,JSON.stringify((rows||[]).slice(-10)))}catch(e){}}
function append(role,content){const h=history();h.push({role,content:String(content||'').slice(0,3500)});saveHistory(h);return h}
function plainToHtml(s){return esc(s).replace(/\n/g,'<br>')}
function setBusy(on){
 const b=document.getElementById('hlgbAssistantSend')||document.getElementById('hlgbVoiceSend9255');
 if(b){if(on){b.dataset.hlgbAiOldText=b.textContent||'';b.disabled=true;b.textContent='Pensando…'}else{b.disabled=false;if(b.dataset.hlgbAiOldText)b.textContent=b.dataset.hlgbAiOldText;delete b.dataset.hlgbAiOldText}}
}
function renderServer(answer,model){
 const out=outputEl();if(!out)return;
 out.innerHTML='<div class="sub" style="margin-bottom:7px">☁️ IA avançada HLGB'+(model?' · '+esc(model):'')+'</div><div>'+plainToHtml(answer)+'</div><div id="hlgbAiFeedback9266" style="display:flex;gap:7px;flex-wrap:wrap;margin-top:12px"><button type="button" class="secondary" onclick="hlgbAssistantServer9266.rate(\'up\')">👍 Útil</button><button type="button" class="secondary" onclick="hlgbAssistantServer9266.rate(\'down\')">👎 Não ajudou</button><button type="button" class="secondary" onclick="hlgbAssistantServer9266.teach()">🧠 Ensinar correção</button></div>';
 out.dataset.pendingKind='server-ai';
}
async function post(payload,timeoutMs=30000){
 const t=token();if(!t)throw Object.assign(new Error('no-session'),{code:'no-session'});
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeoutMs);
 try{
  const r=await fetch(ENDPOINT,{method:'POST',headers:{'Authorization':'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:ctrl.signal,cache:'no-store'});
  let j={};try{j=await r.json()}catch(e){}
  if(!r.ok){const err=new Error(j?.error||('HTTP '+r.status));err.status=r.status;err.payload=j;throw err}
  return j;
 }finally{clearTimeout(timer)}
}
async function askServer(raw){
 const h=history();status='thinking';window.HLGB_SERVER_AI_STATUS=status;setBusy(true);
 try{
  const j=await post({mode:'chat',message:raw,history:h});
  if(!j?.ok||!j?.answer)throw new Error(j?.error||'Resposta vazia');
  append('user',raw);append('assistant',j.answer);lastExchange={question:raw,answer:j.answer,model:j.model||'',at:Date.now()};
  status='online';window.HLGB_SERVER_AI_STATUS=status;renderServer(j.answer,j.model||'');return true;
 }catch(e){
  status=e?.payload?.setup_required?'setup-required':(e?.code==='no-session'?'no-session':'fallback');window.HLGB_SERVER_AI_STATUS=status;
  if(e?.payload?.setup_required)window.HLGB_SERVER_AI_SETUP_REQUIRED=true;
  console.info('[HLGB IA servidor] fallback local:',e?.message||e);return false;
 }finally{setBusy(false)}
}
async function rate(rating){
 if(!lastExchange)return false;
 try{await post({mode:'feedback',rating,question:lastExchange.question,answer:lastExchange.answer,model:lastExchange.model,context:{version:V}} ,12000);status='online';const box=document.getElementById('hlgbAiFeedback9266');if(box)box.insertAdjacentHTML('beforeend','<span class="sub">Feedback salvo.</span>');return true}catch(e){console.info('[HLGB feedback]',e);return false}
}
async function teach(){
 if(!lastExchange)return false;
 const correction=prompt('O que o Assistente deveria ter entendido ou respondido? Esta correção ficará na memória dele, mas não altera o código nem dados operacionais.');
 if(!correction||!String(correction).trim())return false;
 try{await post({mode:'feedback',rating:'correction',question:lastExchange.question,answer:lastExchange.answer,correction:String(correction).trim(),model:lastExchange.model,context:{version:V}},15000);append('user','Correção ensinada: '+String(correction).trim());const box=document.getElementById('hlgbAiFeedback9266');if(box)box.insertAdjacentHTML('beforeend','<span class="sub">🧠 Correção aprendida.</span>');return true}catch(e){alert('Não consegui salvar essa correção agora.');return false}
}
function install(){
 const cur=window.hlgbAssistantAsk;if(typeof cur!=='function')return false;
 if(cur.__hlgbServerAi9266)return true;
 const base=cur;
 const wrapped=async function(){
  const raw=String(inputEl()?.value||'').trim();if(!raw)return base.apply(this,arguments);
  const ok=await askServer(raw);if(ok)return true;
  return base.apply(this,arguments);
 };
 wrapped.__hlgbServerAi9266=true;wrapped.__original=base;window.hlgbAssistantAsk=wrapped;window.HLGB_ASSISTANT_SERVER_9266=true;return true;
}
function ensureInstalled(){
 installTries++;if(install())status=status==='boot'?'ready':status;
 // módulos antigos podem reembrulhar hlgbAssistantAsk durante o boot; reinstala por janela limitada.
 if(installTries<50)setTimeout(ensureInstalled,400);
}
setTimeout(ensureInstalled,8200);
window.hlgbAssistantServer9266={version:V,endpoint:ENDPOINT,askServer,rate,teach,history,clearHistory:()=>saveHistory([]),status:()=>status,install};
try{const cur=Number(window.HLGB_RELEASE_VERSION)||0;if(cur<=92.66)window.HLGB_RELEASE_VERSION=V}catch(e){}
console.info('[HLGB] Assistente híbrido servidor v'+V+' carregado — escrita operacional continua bloqueada');
})();
