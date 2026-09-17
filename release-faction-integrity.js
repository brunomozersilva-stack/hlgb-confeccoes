/* HLGB audit — integridade da descrição por modelo nas facções */
(function(){
'use strict';
const sid=v=>String(v??'');
function productById(id){return (Array.isArray(db?.products)?db.products:[]).find(x=>sid(x?.id)===sid(id))||null}
function productionById(id){return (Array.isArray(db?.production)?db.production:[]).find(x=>sid(x?.id)===sid(id))||null}
function factionById(id){return (Array.isArray(db?.factions)?db.factions:[]).find(x=>sid(x?.id)===sid(id))||null}
function canonicalDescription(f){
 if(!f)return '';
 const p=productionById(f.productionId);
 const pid=f.productId??p?.productId;
 const pr=productById(pid);
 const exact=String(pr?.name||p?.product||'').trim();
 if(exact)return exact;
 const current=String(f.description||f.product||'').trim();
 try{return typeof cleanFactionProductName==='function'?cleanFactionProductName(current):current}catch(e){return current}
}
function normalizeOne(f){const exact=canonicalDescription(f);if(!f||!exact||String(f.description||'')===exact)return false;f.description=exact;if(f.productId==null){const p=productionById(f.productionId);if(p?.productId!=null)f.productId=p.productId}return true}
function normalizeAll(){let n=0;for(const f of (Array.isArray(db?.factions)?db.factions:[]))if(normalizeOne(f))n++;return n}
function patchTable(){
 const box=document.getElementById('factionTable');if(!box)return;
 box.querySelectorAll('tbody tr').forEach(tr=>{
  const btn=[...tr.querySelectorAll('button')].find(b=>/editFaction\(([^)]+)\)/.test(String(b.getAttribute('onclick')||'')));
  if(!btn)return;const m=String(btn.getAttribute('onclick')||'').match(/editFaction\(([^)]+)\)/);if(!m)return;
  const f=factionById(String(m[1]).replace(/["']/g,''));if(!f)return;
  const cells=tr.querySelectorAll('td');if(cells[2])cells[2].textContent=canonicalDescription(f)||cells[2].textContent;
 });
}
const oldRender=window.renderFactions;
if(typeof oldRender==='function'&&!oldRender.__hlgbFactionDescriptionGuard){
 const wrapped=function(){normalizeAll();const r=oldRender.apply(this,arguments);normalizeAll();try{patchTable()}catch(e){console.warn('[HLGB faction integrity] tabela',e)}return r};
 wrapped.__hlgbFactionDescriptionGuard=true;wrapped.__original=oldRender;window.renderFactions=wrapped;
}
const oldForm=window.factionForm;
if(typeof oldForm==='function'&&!oldForm.__hlgbFactionDescriptionGuard){
 const wrapped=function(f){
  if(!f)return oldForm.apply(this,arguments);
  const exact=canonicalDescription(f),oid=f.orderId,proxy={...f,description:exact||f.description,orderId:null};
  let html=oldForm.call(this,proxy);
  if(oid!=null&&String(oid)!=='')html=String(html).replace(/(<input id="mforderid" type="hidden" value=")[^"]*(">)/,'$1'+String(oid).replace(/"/g,'')+'$2');
  return html;
 };
 wrapped.__hlgbFactionDescriptionGuard=true;wrapped.__original=oldForm;window.factionForm=wrapped;
}
const oldSaveForm=window.saveFactionServiceFromForm;
if(typeof oldSaveForm==='function'&&!oldSaveForm.__hlgbFactionDescriptionGuard){
 const wrapped=function(f){const r=oldSaveForm.apply(this,arguments);normalizeOne(f);return r};
 wrapped.__hlgbFactionDescriptionGuard=true;wrapped.__original=oldSaveForm;window.saveFactionServiceFromForm=wrapped;
}
const oldSync=window.syncProductionToFaction;
if(typeof oldSync==='function'&&!oldSync.__hlgbFactionDescriptionGuard){
 const wrapped=function(p){const r=oldSync.apply(this,arguments);if(p?.id!=null){const f=(db.factions||[]).find(x=>sid(x?.productionId)===sid(p.id));if(f)normalizeOne(f)}return r};
 wrapped.__hlgbFactionDescriptionGuard=true;wrapped.__original=oldSync;window.syncProductionToFaction=wrapped;
}
window.hlgbFactionCanonicalDescription=canonicalDescription;
window.hlgbNormalizeFactionDescriptions=normalizeAll;
window.HLGB_FACTION_DESCRIPTION_GUARD='v1';
try{normalizeAll();setTimeout(()=>{normalizeAll();try{patchTable()}catch(e){}},0)}catch(e){}
console.info('[HLGB] facções: descrição vinculada ao modelo específico, não ao resumo inteiro do pedido');
})();