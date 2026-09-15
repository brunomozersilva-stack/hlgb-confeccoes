/* HLGB v92.42 — vínculo seguro de falta por registro + grade resumida no checklist */
(function(){
'use strict';
const V='92.42';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
const numText=v=>{
  let s=String(v??'').trim().replace(/\s/g,'');
  if(!s)return 0;
  if(s.includes('.')&&s.includes(','))s=s.replace(/\./g,'').replace(',','.');
  else if(s.includes(','))s=s.replace(',','.');
  else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
  const n=Number(s.replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0;
};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function arr(name){try{return Array.isArray(db?.[name])?db[name]:[]}catch(e){return []}}
function productName(f){
  const p=arr('products').find(x=>String(x?.id)===String(f?.productId));
  return String(p?.name||f?.description||f?.product||'').trim();
}
function displayedOrderForFaction(f){
  const o=arr('orders').find(x=>String(x?.id)===String(f?.orderId));
  if(!o)return '';
  try{if(typeof displayOrderNumber==='function')return String(displayOrderNumber(o)??'')}catch(e){}
  return String(o.orderNumber??o.number??o.displayNumber??o.id??'');
}
function cellText(td){return String(td?.textContent||'').replace(/\s+/g,' ').trim()}
function resolveFactionFromDeliveryRow(tr){
  const t=[...tr.querySelectorAll('td')];if(t.length<5)return null;
  const fac=norm(cellText(t[0])),ord=norm(cellText(t[1]).replace(/^#/,'').trim()),model=norm(cellText(t[2]));
  const sent=numText(cellText(t[3])),done=numText(cellText(t[4]));
  let best=null,bestScore=-1;
  for(const f of arr('factions')){
    if(!f)continue;
    let score=0;
    const fn=norm(f.name),pn=norm(productName(f)),on=norm(displayedOrderForFaction(f));
    if(fac&&fn===fac)score+=120;else if(fac)continue;
    if(model&&pn===model)score+=140;else if(model&&(pn.includes(model)||model.includes(pn)))score+=70;else if(model)continue;
    if(Math.abs((+f.sent||0)-sent)<0.001)score+=60;
    if(Math.abs((+f.done||0)-done)<0.001)score+=30;
    if(ord&&on===ord)score+=100;
    if(score>bestScore){best=f;bestScore=score}
  }
  return bestScore>=260?best:null;
}
function resolveFactionFromMainRow(tr){
  const t=[...tr.querySelectorAll('td')];if(!t.length)return null;
  const edit=[...tr.querySelectorAll('button')].find(b=>/editFaction\(\d+\)/.test(String(b.getAttribute('onclick')||'')));
  if(edit){const m=String(edit.getAttribute('onclick')||'').match(/editFaction\((\d+)\)/);if(m){const f=arr('factions').find(x=>String(x?.id)===String(m[1]));if(f)return f}}
  const rowText=norm(tr.textContent||'');
  let candidates=arr('factions').filter(f=>rowText.includes(norm(f?.name))&&rowText.includes(norm(productName(f))));
  if(candidates.length===1)return candidates[0];
  const ids=[...tr.querySelectorAll('[onclick]')].flatMap(el=>(String(el.getAttribute('onclick')||'').match(/\((\d+)\)/g)||[]).map(x=>x.replace(/\D/g,'')));
  const exact=candidates.find(f=>ids.includes(String(f.id)));return exact||null;
}
function callMissing(f){
  if(!f)return;
  const fn=window.hlgbRegisterFactionMissing9197||window.hlgbRegisterFactionMissing9198;
  if(typeof fn==='function')return fn(String(f.id));
  alert('A função de peças faltantes ainda não carregou. Atualize a página e tente novamente.');
}
function fixMissingButtons(){
  const delivery=document.getElementById('factionDeliveryTable935');
  if(delivery){
    delivery.querySelectorAll('tbody tr').forEach(tr=>{
      const f=resolveFactionFromDeliveryRow(tr);if(!f)return;
      const bs=[...tr.querySelectorAll('button')].filter(b=>norm(b.textContent).includes('registrar falta'));
      if(!bs.length)return;
      const keep=bs[0];keep.classList.add('hlgb9198-delivery-missing','hlgb9242-safe-missing');keep.dataset.factionId=String(f.id);keep.title='Registrar falta de '+productName(f)+' — '+(f.name||'facção');
      keep.removeAttribute('onclick');keep.onclick=e=>{e.preventDefault();e.stopPropagation();callMissing(f)};
      bs.slice(1).forEach(b=>b.remove());
    });
  }
  const main=document.getElementById('factionTable');
  if(main){
    main.querySelectorAll('tbody tr').forEach(tr=>{
      const f=resolveFactionFromMainRow(tr);if(!f)return;
      const bs=[...tr.querySelectorAll('button')].filter(b=>norm(b.textContent).includes('registrar falta'));
      if(!bs.length)return;
      const keep=bs[0];keep.classList.add('hlgb9198-faction-missing','hlgb9242-safe-missing');keep.dataset.factionId=String(f.id);
      keep.removeAttribute('onclick');keep.onclick=e=>{e.preventDefault();e.stopPropagation();callMissing(f)};
      bs.slice(1).forEach(b=>b.remove());
    });
  }
}
function compactChecklistGrades(){
  const box=document.getElementById('factionChecklistTable9176');if(!box)return;
  box.querySelectorAll('table').forEach(tbl=>{
    const heads=[...tbl.querySelectorAll('thead th')];
    const gi=heads.findIndex(h=>norm(h.textContent)==='grade'),pi=heads.findIndex(h=>norm(h.textContent)==='pecas');
    if(gi<0)return;
    tbl.querySelectorAll('tbody tr').forEach(tr=>{
      const td=[...tr.children];if(!td[gi])return;
      const current=norm(td[gi].textContent);
      if(!current||current.startsWith('sem grade')||current.startsWith('com grade'))return;
      const qty=pi>=0&&td[pi]?numText(cellText(td[pi])):0;
      td[gi].innerHTML='<span class="badge">Com grade'+(qty?' · '+esc(qty.toLocaleString('pt-BR'))+' pç':'')+'</span>';
      td[gi].title='A grade detalhada continua disponível em Conferir e na impressão.';
    });
  });
}
function patch(){fixMissingButtons();compactChecklistGrades();stamp()}
function stamp(){
  try{document.title='HLGB Confecções — Sistema de Gestão v'+V+' Multiusuário'}catch(e){}
  try{const e=document.querySelector('#appShell .logo small');if(e)e.textContent='v'+V}catch(e){}
}
/* Intercepta o clique antes de qualquer manipulador antigo que ainda esteja preso ao índice da linha. */
document.addEventListener('click',function(e){
  const b=e.target?.closest?.('button');if(!b||!norm(b.textContent).includes('registrar falta'))return;
  const delivery=b.closest('#factionDeliveryTable935');const main=b.closest('#factionTable');if(!delivery&&!main)return;
  const tr=b.closest('tr');if(!tr)return;
  const f=delivery?resolveFactionFromDeliveryRow(tr):resolveFactionFromMainRow(tr);if(!f)return;
  e.preventDefault();e.stopImmediatePropagation();callMissing(f);
},true);
let queued=false;
const mo=new MutationObserver(()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;patch()},30)});
function boot(){
  stamp();patch();
  try{mo.observe(document.documentElement,{childList:true,subtree:true})}catch(e){}
}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(patch,150);setTimeout(patch,900);setTimeout(patch,2500)},0)}catch(e){}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
setTimeout(patch,400);setTimeout(patch,1500);setTimeout(patch,4000);
console.info('[HLGB] hotfix v'+V+' ativo — falta vinculada ao registro e grade resumida no checklist');
})();