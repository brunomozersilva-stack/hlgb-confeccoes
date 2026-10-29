/* HLGB v94.30 — estabilidade visual da tela Metas */
(function(){
'use strict';
if(window.HLGB_GOALS_STABILITY_9430)return;
window.HLGB_GOALS_STABILITY_9430=true;
let lastUserMove=0,token=0;
['wheel','touchmove','pointerdown','keydown'].forEach(ev=>window.addEventListener(ev,()=>{lastUserMove=Date.now()},{capture:true,passive:true}));
function fields(){return [document.getElementById('goalStart'),document.getElementById('goalEnd')].filter(Boolean)}
function style(){
 let s=document.getElementById('hlgbGoalsStability9430');if(s)return;
 s=document.createElement('style');s.id='hlgbGoalsStability9430';s.textContent='#goalStart,#goalEnd{overflow-anchor:auto!important} #goalStart:focus,#goalEnd:focus{scroll-margin-top:96px}';document.head.appendChild(s);
}
function arm(reason){
 const my=++token,started=performance.now();let anchor=null,lastTop=null,stableFrames=0;
 function tick(){
  if(my!==token)return;
  const fs=fields();if(!fs.length){if(performance.now()-started<3500)requestAnimationFrame(tick);return}
  style();anchor=anchor&&document.contains(anchor)?anchor:(fs.find(x=>{const r=x.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight})||fs[0]);
  const r=anchor.getBoundingClientRect(),top=r.top;
  if(lastTop!=null){const delta=top-lastTop;if(Math.abs(delta)>=3&&Date.now()-lastUserMove>350){try{window.scrollBy({top:delta,left:0,behavior:'auto'});window.HLGB_GOALS_STABILITY_LAST_9430={reason,at:new Date().toISOString(),correctedPx:delta}}catch(e){}stableFrames=0}else if(Math.abs(delta)<1)stableFrames++;}
  lastTop=anchor.getBoundingClientRect().top;
  if(performance.now()-started<3500&&stableFrames<45)requestAnimationFrame(tick);
 }
 requestAnimationFrame(()=>requestAnimationFrame(tick));
}
function wrap(name){const fn=window[name];if(typeof fn!=='function'||fn.__hlgbGoalsStability9430)return;const w=function(){const r=fn.apply(this,arguments);arm(name);return r};w.__hlgbGoalsStability9430=true;w.__original=fn;window[name]=w}
function install(){style();['renderGoals','renderMetas','renderTargets','renderGoalsPage'].forEach(wrap);if(fields().length)arm('boot');setTimeout(()=>['renderGoals','renderMetas','renderTargets','renderGoalsPage'].forEach(wrap),1200);}
document.addEventListener('click',e=>{const t=e.target?.closest?.('button,a,[role="button"],.nav-item,.tab');if(!t)return;const txt=(t.textContent||'').trim().toLowerCase();if(txt==='metas'||txt.includes(' metas'))setTimeout(()=>arm('navigation'),0)},{capture:true});
window.addEventListener('hashchange',()=>setTimeout(()=>{if(fields().length)arm('hashchange')},0));
window.hlgbStabilizeGoals9430=arm;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();