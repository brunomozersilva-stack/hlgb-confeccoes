/* HLGB v92.45 — correção definitiva: falta por ID real + sem grade na listagem externa */
(function(){
'use strict';
const V='92.45';
const originalMissing=window.hlgbRegisterFactionMissing9197;
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
function factions(){try{return Array.isArray(db?.factions)?db.factions:[]}catch(e){return []}}
function getFaction(id){return factions().find(f=>String(f?.id)===String(id))||null}
function factionIdFromOnclick(el,fnName){
  if(!el)return null;
  const s=String(el.getAttribute('onclick')||'');
  const m=s.match(new RegExp(fnName+'\\((\\d+)\\)'));
  return m?m[1]:null;
}
function exactFactionIdForRow(tr){
  if(!tr)return null;
  // 1) Um botão já explicitamente corrigido.
  const marked=tr.querySelector('[data-faction-id]');
  if(marked?.dataset?.factionId&&getFaction(marked.dataset.factionId))return marked.dataset.factionId;
  // 2) Na tabela de entrega, "Registrar entrega" já nasce com o ID real da facção.
  for(const b of tr.querySelectorAll('button[onclick]')){
    const id=factionIdFromOnclick(b,'registerFactionDelivery935');
    if(id&&getFaction(id))return id;
  }
  // 3) Na tabela principal, "Editar" já nasce com o ID real da facção.
  for(const b of tr.querySelectorAll('button[onclick]')){
    const id=factionIdFromOnclick(b,'editFaction');
    if(id&&getFaction(id))return id;
  }
  // 4) Se já houver botão oficial de falta com ID explícito, usa o próprio ID.
  for(const b of tr.querySelectorAll('button[onclick]')){
    const s=String(b.getAttribute('onclick')||'');
    const m=s.match(/hlgbRegisterFactionMissing(?:9197|9198)\((\d+)\)/);
    if(m&&getFaction(m[1]))return m[1];
  }
  return null;
}
function callExactMissing(id){
  const f=getFaction(id);
  if(!f){alert('Não foi possível identificar este envio de facção. Atualize a página e tente novamente.');return false}
  const fn=typeof originalMissing==='function'?originalMissing:window.hlgbRegisterFactionMissing9197;
  if(typeof fn!=='function'){alert('A função de registrar falta não carregou. Atualize a página.');return false}
  return fn(String(f.id));
}
function fixMissingButtonsIn(root){
  if(!root)return;
  const rows=[...root.querySelectorAll('tr')].filter(tr=>tr.querySelector('td'));
  rows.forEach(tr=>{
    const buttons=[...tr.querySelectorAll('button')].filter(b=>norm(b.textContent).includes('registrar falta'));
    if(!buttons.length)return;
    const id=exactFactionIdForRow(tr);
    if(!id)return;
    const f=getFaction(id);
    const keep=buttons[0];
    keep.dataset.factionId=String(id);
    keep.classList.add('hlgb9245-safe-missing');
    keep.removeAttribute('onclick');
    keep.onclick=function(ev){ev.preventDefault();ev.stopPropagation();return callExactMissing(id)};
    keep.title='Registrar falta — '+String(f?.description||f?.product||'produto')+' — '+String(f?.name||'facção');
    buttons.slice(1).forEach(b=>b.remove());
  });
}
function fixAllMissingButtons(){
  fixMissingButtonsIn(document.getElementById('factionTable'));
  fixMissingButtonsIn(document.getElementById('factionDeliveryTable935'));
}
function removeExternalGradeColumn(){
  const box=document.getElementById('factionChecklistTable9176');if(!box)return;
  box.querySelectorAll('table').forEach(tbl=>{
    const rows=[...tbl.querySelectorAll('tr')];if(!rows.length)return;
    let gradeIndex=-1;
    const headCells=[...rows[0].children];
    headCells.forEach((c,i)=>{if(norm(c.textContent)==='grade')gradeIndex=i});
    if(gradeIndex<0)return;
    rows.forEach(r=>{const cells=[...r.children];if(cells[gradeIndex])cells[gradeIndex].remove()});
  });
}
function postProcess(){fixAllMissingButtons();removeExternalGradeColumn();stamp()}
function stamp(){
  try{document.title='HLGB Confecções — Sistema de Gestão v'+V+' Multiusuário'}catch(e){}
  try{const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}catch(e){}
}
// Intercepta qualquer Registrar falta nas duas tabelas usando o ID real já existente na própria linha.
document.addEventListener('click',function(ev){
  const b=ev.target?.closest?.('button');
  if(!b||!norm(b.textContent).includes('registrar falta'))return;
  const root=b.closest('#factionTable,#factionDeliveryTable935');if(!root)return;
  const tr=b.closest('tr');if(!tr)return;
  const id=b.dataset.factionId||exactFactionIdForRow(tr);if(!id)return;
  ev.preventDefault();ev.stopImmediatePropagation();callExactMissing(id);
},true);
// Sempre que qualquer rotina antiga redesenhar as tabelas, aplica de novo a correção.
let scheduled=false;
const obs=new MutationObserver(()=>{if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;postProcess()},20)});
function boot(){
  stamp();postProcess();
  try{obs.observe(document.body,{childList:true,subtree:true})}catch(e){}
}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(postProcess,80);setTimeout(postProcess,450);setTimeout(postProcess,1200);setTimeout(postProcess,2800)},0)}catch(e){}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
setTimeout(postProcess,500);setTimeout(postProcess,1800);setTimeout(postProcess,4200);
console.info('[HLGB] hotfix v'+V+' ativo — falta por ID real e grade removida da listagem externa');
})();