/* HLGB Auditor v93.70 — linha do tempo real no pacote de diagnóstico */
(function(){
'use strict';
if(window.HLGB_AUDITOR_RUNTIME_FIX_9370||window.hlgbAuditorReady9370?.state==='waiting')return;
const readiness={state:'waiting',attempts:0,maxAttempts:40,error:''};
window.hlgbAuditorReady9370=readiness;
function install(){
 if(window.HLGB_AUDITOR_RUNTIME_FIX_9370){readiness.state='ready';return true}
 const smart=window.hlgbAuditorSmart;
 if(!smart||typeof window.hlgbAuditorSmartProblem!=='function')return false;

const MAX_AGE=120000,MAX_EVENTS=240,ring=[];
const now=()=>new Date().toISOString();
function page(){return document.querySelector('.page.active')?.id||''}
function clean(){const cutoff=Date.now()-MAX_AGE;while(ring.length&&ring[0].ts<cutoff)ring.shift();if(ring.length>MAX_EVENTS)ring.splice(0,ring.length-MAX_EVENTS)}
function add(type,data={}){ring.push({at:now(),ts:Date.now(),type,page:page(),...data});clean()}
function snapshot(){clean();return ring.map(x=>({...x}))}
function short(v,n=160){return String(v||'').trim().replace(/\s+/g,' ').slice(0,n)}
function onClick(e){const t=e.target?.closest?.('button,a,[role="button"],input,select,textarea');if(t)add('ui-action',{id:t.id||'',tag:t.tagName||'',text:short(t.textContent,120)})}
function onVisibility(){add('visibility',{state:document.visibilityState})}
function onError(e){add('js-error',{message:short(e?.message||'Erro JavaScript',300)})}
function onReject(e){add('promise-error',{message:short(e?.reason?.message||e?.reason||'Promise rejeitada',300)})}
document.addEventListener('click',onClick,true);
document.addEventListener('visibilitychange',onVisibility,true);
window.addEventListener('error',onError,true);
window.addEventListener('unhandledrejection',onReject,true);
add('runtime-fix-ready',{version:'93.70'});
const originalProblem=window.hlgbAuditorSmartProblem;
const wrappedProblem=async function(){
  add('problem-capture-start');
  const data=await originalProblem.apply(this,arguments);
  data.events=snapshot();
  data.captureMeta={...(data.captureMeta||{}),timelineVersion:'93.70',windowMs:MAX_AGE,eventCount:data.events.length};
  if(smart.safariDownload?.renderReady)smart.safariDownload.renderReady();
  return data;
};
wrappedProblem.__hlgb9370=true;
wrappedProblem.__original=originalProblem;
window.hlgbAuditorSmartProblem=wrappedProblem;
smart.problem=wrappedProblem;
smart.eventsSnapshot=snapshot;
smart.runtimeFix9370={version:'93.70',eventsSnapshot:snapshot,windowMs:MAX_AGE,maxEvents:MAX_EVENTS,listenerCount:4};
console.info('[HLGB] Auditor runtime fix v93.70 ativo');
window.HLGB_AUDITOR_RUNTIME_FIX_9370=true;
readiness.state='ready';return true;
}
function tick(){
 if(readiness.state!=='waiting')return;
 readiness.attempts++;
 try{if(install())return}catch(e){readiness.state='failed';readiness.error='initialization-error';console.warn('[HLGB] Auditor 9370 inicialização falhou',e);return}
 if(readiness.attempts>=readiness.maxAttempts||typeof setTimeout!=='function'){readiness.state='unavailable';readiness.error='dependency-not-ready';console.warn('[HLGB] Auditor 9370 dependência indisponível após espera limitada');return}
 setTimeout(tick,250);
}
tick();
})();
