/* HLGB — dois conferentes obrigatórios em notas de compra */
(function(){
'use strict';
const V='2026.10.01-purchase-checkers-v1';
const sid=v=>String(v??''),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function people(){
 const out=[];
 for(const e of arr('employees'))if(e&&e.active!==false&&e.name)out.push({id:'emp:'+sid(e.id),name:e.name,type:'Funcionário'});
 for(const u of arr('users'))if(u&&u.active!==false&&(u.name||u.user))out.push({id:'usr:'+sid(u.id||u.user||u.email),name:u.name||u.user||u.email,type:'Usuário'});
 const seen=new Set();return out.filter(x=>{const k=norm(x.name);if(!k||seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
function optionHtml(selected){
 return '<option value="">Selecione</option>'+people().map(p=>'<option value="'+escSafe(p.id)+'" '+(sid(selected)===sid(p.id)?'selected':'')+'>'+escSafe(p.name)+' — '+escSafe(p.type)+'</option>').join('');
}
function nameFor(id){return people().find(x=>sid(x.id)===sid(id))?.name||''}
const oldForm=window.purchaseForm;
if(typeof oldForm==='function'&&!oldForm.__hlgbCheckersV1){
 window.purchaseForm=function(p={}){
  const html=oldForm.apply(this,arguments);
  const c1=p.checker1Id||'',c2=p.checker2Id||'';
  return html+'<div class="panel" style="margin-top:12px;background:#fff8fb"><h3 style="margin-top:0">✅ Conferência da nota</h3><div class="sub">Toda nota de compra precisa de <b>dois conferentes diferentes</b>.</div><div class="grid" style="margin-top:8px"><div class="field"><label>Conferente 1 *</label><select id="purchaseChecker1">'+optionHtml(c1)+'</select></div><div class="field"><label>Conferente 2 *</label><select id="purchaseChecker2">'+optionHtml(c2)+'</select></div></div></div>';
 };
 window.purchaseForm.__hlgbCheckersV1=true;window.purchaseForm.__original=oldForm;
}
const oldSave=window.savePurchaseFromForm;
if(typeof oldSave==='function'&&!oldSave.__hlgbCheckersV1){
 window.savePurchaseFromForm=function(p){
  const c1=document.getElementById('purchaseChecker1')?.value||'',c2=document.getElementById('purchaseChecker2')?.value||'';
  if(!c1||!c2){alert('Informe os dois conferentes da nota de compra.');return false}
  if(c1===c2){alert('Os dois conferentes precisam ser pessoas diferentes.');return false}
  const ok=oldSave.apply(this,arguments);if(!ok)return false;
  p.checker1Id=c1;p.checker1Name=nameFor(c1);p.checker2Id=c2;p.checker2Name=nameFor(c2);
  p.checkedBy=[{id:c1,name:p.checker1Name},{id:c2,name:p.checker2Name}];
  p.checkedAt=new Date().toISOString();
  return true;
 };
 window.savePurchaseFromForm.__hlgbCheckersV1=true;window.savePurchaseFromForm.__original=oldSave;
}
function decorate(){
 const root=document.getElementById('purchaseTable');if(!root)return;
 root.querySelectorAll('tbody tr').forEach(tr=>{
  if(tr.querySelector('.hlgbPurchaseCheckers'))return;
  const edit=[...tr.querySelectorAll('button[onclick]')].find(b=>/editPurchase\(([^)]+)\)/.test(b.getAttribute('onclick')||''));if(!edit)return;
  const m=(edit.getAttribute('onclick')||'').match(/editPurchase\(([^)]+)\)/);if(!m)return;
  const p=arr('purchases').find(x=>sid(x?.id)===sid(m[1].replace(/['"]/g,'')));if(!p)return;
  const div=document.createElement('div');div.className='sub hlgbPurchaseCheckers';div.style.marginTop='5px';
  div.innerHTML=p.checker1Name&&p.checker2Name?'✅ Conferentes: <b>'+escSafe(p.checker1Name)+'</b> + <b>'+escSafe(p.checker2Name)+'</b>':'⚠️ <b>Faltam os dois conferentes</b>';
  edit.parentElement?.appendChild(div);
 });
}
const oldRender=window.renderPurchases;
if(typeof oldRender==='function'&&!oldRender.__hlgbCheckersV1){
 const w=function(){const r=oldRender.apply(this,arguments);setTimeout(decorate,0);return r};w.__hlgbCheckersV1=true;w.__original=oldRender;window.renderPurchases=w;
}
window.hlgbPurchaseCheckers={people,nameFor,decorate};
function boot(){try{decorate()}catch(e){console.warn('[HLGB conferentes compra]',e)}}try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,900),0)}catch(e){}setTimeout(boot,1600);
window.HLGB_PURCHASE_CHECKERS_GUARD=V;
console.info('[HLGB] dois conferentes obrigatórios em notas de compra ativos');
})();