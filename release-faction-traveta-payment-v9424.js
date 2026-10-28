/* HLGB v94.24 — preço da facção, travetada e total no checklist */
(function(){
'use strict';
const V='94.24';
if(window.HLGB_FACTION_TRAVETA_PAYMENT_9424===V)return;
window.HLGB_FACTION_TRAVETA_PAYMENT_9424=V;
const sid=v=>String(v??''), q=v=>Math.max(0,Number(v)||0);
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const arr=n=>{try{return Array.isArray(window.db?.[n])?window.db[n]:[]}catch(_){return[]}};
const money=v=>q(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const rawNumber=v=>{const s=sid(v).trim().replace(',','.');if(!s)return NaN;const n=Number(s);return Number.isFinite(n)?n:NaN};
const state={version:V,formRepairs:0,saves:0,checklists:0,lastInstall:''};

function findFactionForModal(){
 const productionId=document.getElementById('mfproductionid')?.value;
 const orderId=document.getElementById('mforderid')?.value;
 const productId=document.getElementById('mfproductid')?.value;
 const name=document.getElementById('mname')?.value;
 const rows=arr('factions');
 return rows.find(f=>productionId&&sid(f?.productionId)===sid(productionId))
   ||rows.find(f=>orderId&&productId&&sid(f?.orderId)===sid(orderId)&&sid(f?.productId)===sid(productId)&&(!name||norm(f?.name)===norm(name)))
   ||null;
}
function travetaDecision(f){return typeof f?.doesTraveta==='boolean'?(f.doesTraveta?'sim':'nao'):''}
function calc(base,decision,deduction){
 base=q(base);deduction=q(deduction);
 const applied=decision==='nao'?deduction:0;
 const finalUnit=Math.max(0,base-applied);
 return {base,decision,deduction:applied,finalUnit};
}
function refreshTravetaPreview(){
 const box=document.getElementById('hlgbFactionTravetaBox9424');if(!box)return null;
 const decision=document.getElementById('mtraveta9424')?.value||'';
 const base=q(document.getElementById('mprice')?.value);
 const qty=q(document.getElementById('msent')?.value);
 const discount=q(document.getElementById('mtravetaDiscount9424')?.value);
 const discountField=document.getElementById('mtravetaDiscountField9424');
 if(discountField)discountField.style.display=decision==='nao'?'block':'none';
 const out=calc(base,decision,discount);
 const final=document.getElementById('mtravetaFinalUnit9424');if(final)final.textContent=money(out.finalUnit);
 const total=document.getElementById('mtravetaTotal9424');if(total)total.textContent=money(out.finalUnit*qty);
 const hint=document.getElementById('mtravetaHint9424');
 if(hint)hint.textContent=!decision?'Escolha Sim ou Não antes de salvar.':decision==='nao'?'O desconto da travetada será abatido de cada peça.':'Sem desconto de travetada.';
 return {...out,qty};
}
function ensureTravetaFields(){
 const price=document.getElementById('mprice'),name=document.getElementById('mname');if(!price||!name)return false;
 let box=document.getElementById('hlgbFactionTravetaBox9424');
 if(!box){
   const f=findFactionForModal(),decision=travetaDecision(f),discount=q(f?.travetaDeductionUnit);
   box=document.createElement('div');box.id='hlgbFactionTravetaBox9424';box.className='panel';
   box.style.cssText='margin:12px 0;background:#fff8fb;border:1px solid #f1cbd9;padding:12px;border-radius:12px';
   box.innerHTML='<h3 style="margin:0 0 8px">✂️ Travetada e valor da facção</h3>'+
    '<div class="sub" style="margin-bottom:10px">O valor por peça acima é o valor antes do desconto da travetada.</div>'+
    '<div class="grid">'+
      '<div class="field"><label>Esta facção faz a travetada?</label><select id="mtraveta9424" required><option value="">Selecione</option><option value="sim"'+(decision==='sim'?' selected':'')+'>Sim</option><option value="nao"'+(decision==='nao'?' selected':'')+'>Não</option></select></div>'+
      '<div class="field" id="mtravetaDiscountField9424" style="display:'+(decision==='nao'?'block':'none')+'"><label>Desconto da travetada por peça (R$)</label><input id="mtravetaDiscount9424" type="number" min="0" step="0.01" value="'+discount.toFixed(2)+'"></div>'+
    '</div>'+
    '<div id="mtravetaHint9424" class="sub" style="margin-top:6px"></div>'+
    '<div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:10px"><div><b>Valor final por peça:</b> <span id="mtravetaFinalUnit9424">R$ 0,00</span></div><div><b>Total previsto:</b> <span id="mtravetaTotal9424">R$ 0,00</span></div></div>';
   const anchor=price.closest('.field')||price.parentElement;
   if(anchor?.parentElement)anchor.parentElement.insertAdjacentElement('afterend',box);else (document.querySelector('#modal .modal-content,#modal .modal-card')||document.getElementById('modal'))?.appendChild(box);
   for(const id of ['mtraveta9424','mtravetaDiscount9424','mprice','msent'])document.getElementById(id)?.addEventListener('input',refreshTravetaPreview);
   document.getElementById('mtraveta9424')?.addEventListener('change',refreshTravetaPreview);
   state.formRepairs++;
 }
 refreshTravetaPreview();return true;
}
function applyTravetaToFaction(f){
 ensureTravetaFields();
 const decision=document.getElementById('mtraveta9424')?.value||'';
 if(!decision){alert('Informe se esta facção faz a travetada antes de salvar.');document.getElementById('mtraveta9424')?.focus();return {ok:false}}
 const baseEl=document.getElementById('mprice'),discountEl=document.getElementById('mtravetaDiscount9424');
 const base=rawNumber(baseEl?.value);
 if(!Number.isFinite(base)||base<0){alert('Informe um valor por peça válido.');baseEl?.focus();return {ok:false}}
 let discount=0;
 if(decision==='nao'){
   discount=rawNumber(discountEl?.value);
   if(!Number.isFinite(discount)||discount<0){alert('Informe o desconto da travetada por peça.');discountEl?.focus();return {ok:false}}
   if(discount>base){alert('O desconto da travetada não pode ser maior que o valor da peça.');discountEl?.focus();return {ok:false}}
 }
 const qty=q(document.getElementById('msent')?.value||f?.sent),out=calc(base,decision,discount);
 if(f&&typeof f==='object'){
   f.baseUnitPrice=out.base;
   f.doesTraveta=decision==='sim';
   f.travetaDeductionUnit=out.deduction;
   f.payableUnitPrice=out.finalUnit;
   f.payableTotal=out.finalUnit*qty;
   f.travetaPricingVersion=V;
   f.travetaPricingUpdatedAt=new Date().toISOString();
 }
 if(baseEl)baseEl.value=out.finalUnit.toFixed(2);
 return {ok:true,...out,qty,total:out.finalUnit*qty};
}
function chainHas(fn,marker){let x=fn,n=0;const seen=new Set();while(typeof x==='function'&&!seen.has(x)&&n++<48){if(x[marker])return true;seen.add(x);x=x.__original||x.__hlgbOriginal}return false}
function installSaveGuard(){
 const old=window.saveFactionServiceFromForm;if(typeof old!=='function'||chainHas(old,'__hlgb9424Traveta'))return false;
 const w=function(f){const applied=applyTravetaToFaction(f);if(!applied.ok)return false;state.saves++;return old.apply(this,arguments)};
 w.__hlgb9424Traveta=true;w.__original=old;window.saveFactionServiceFromForm=w;return true;
}

function checklistById(id){return arr('materialChecklists').find(x=>sid(x?.id)===sid(id))||null}
function factionForChecklist(c){
 if(!c)return null;
 return arr('factions').find(f=>c?.factionId!=null&&sid(f?.id)===sid(c.factionId))
  ||arr('factions').find(f=>c?.productionId!=null&&sid(f?.productionId)===sid(c.productionId))
  ||arr('factions').find(f=>norm(f?.name)===norm(c?.destinationName)&&(!c?.productId||sid(f?.productId)===sid(c.productId)))
  ||null;
}
function pricingForChecklist(c){
 const f=factionForChecklist(c);
 const final=q(c?.payableUnitPrice??f?.payableUnitPrice??c?.unitPrice??c?.price??f?.price??f?.unitPrice);
 const base=q(c?.baseUnitPrice??f?.baseUnitPrice??final);
 const decision=typeof c?.doesTraveta==='boolean'?c.doesTraveta:(typeof f?.doesTraveta==='boolean'?f.doesTraveta:null);
 const deduction=decision===false?q(c?.travetaDeductionUnit??f?.travetaDeductionUnit??Math.max(0,base-final)):0;
 const qty=q(c?.qty||f?.sent||f?.done);
 return {f,base,final,deduction,doesTraveta:decision,qty,total:final*qty};
}
function payHtml(c,forPrint){
 const p=pricingForChecklist(c),trav=p.doesTraveta===true?'Sim':p.doesTraveta===false?'Não':'Não informado';
 const style=forPrint?'border:1px solid #bbb;padding:12px;margin:12px 0':'margin:12px 0;background:#f7fbff;border:1px solid #b9d8ef;padding:12px;border-radius:12px';
 return '<div class="hlgbFactionChecklistPay9424" id="hlgbFactionChecklistPay9424" style="'+style+'"><div style="font-size:16px;font-weight:800;margin-bottom:8px">💰 Valor da facção</div>'+
  '<div style="display:flex;gap:18px;flex-wrap:wrap"><div><b>Valor base/peça:</b> '+money(p.base)+'</div><div><b>Travetada:</b> '+trav+'</div>'+
  (p.doesTraveta===false?'<div><b>Desconto travetada/peça:</b> '+money(p.deduction)+'</div>':'')+
  '<div><b>Valor final/peça:</b> '+money(p.final)+'</div><div><b>Quantidade:</b> '+p.qty.toLocaleString('pt-BR')+'</div><div><b>Total a receber:</b> '+money(p.total)+'</div></div></div>';
}
function ensureChecklistPay(id){
 const c=checklistById(id),modal=document.getElementById('modal');if(!c||!modal)return false;
 modal.querySelectorAll('.hlgb9423ChecklistValue').forEach(x=>x.remove());
 let box=modal.querySelector('.hlgbFactionChecklistPay9424');
 if(!box){
   const host=modal.querySelector('.modal-content,.modalCard,.modal-card')||modal;
   const wrap=document.createElement('div');wrap.innerHTML=payHtml(c,false);box=wrap.firstElementChild;
   const title=host.querySelector('h2,h3');if(title)title.insertAdjacentElement('afterend',box);else host.insertAdjacentElement('afterbegin',box);
   state.checklists++;
 }else box.outerHTML=payHtml(c,false);
 return true;
}
function installChecklist(){
 const old=window.openMaterialChecklist;if(typeof old!=='function'||chainHas(old,'__hlgb9424Checklist'))return false;
 const w=function(id){const out=old.apply(this,arguments);setTimeout(()=>ensureChecklistPay(id),0);setTimeout(()=>ensureChecklistPay(id),100);return out};
 w.__hlgb9424Checklist=true;w.__original=old;window.openMaterialChecklist=w;return true;
}
function printChecklist9424(id){
 const c=checklistById(id);if(!c)return false;
 const matrix=typeof window.hlgbFactionChecklistGrade?.matrix==='function'?window.hlgbFactionChecklistGrade.matrix(c):'<div>Grade não disponível.</div>';
 const mats=(c.materials||[]).map(m=>'<tr><td>☐</td><td>'+esc(m.name||'')+'</td><td>'+esc(m.cat||'-')+'</td><td>'+esc(m.color||'Total')+'</td><td>'+q(m.qty).toLocaleString('pt-BR',{maximumFractionDigits:3})+'</td><td>'+esc(m.unit||'')+'</td><td>'+(m.rolls!=null?q(m.rolls)+' rolo'+(q(m.rolls)===1?'':'s'):'-')+'</td></tr>').join('');
 const w=window.open('','_blank');if(!w){alert('Permita pop-ups para imprimir.');return false}
 w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Checklist — '+esc(c.destinationName||'')+'</title><style>body{font-family:Arial;padding:26px;color:#222}table{width:100%;border-collapse:collapse;margin:10px 0 18px}th,td{border:1px solid #aaa;padding:7px;font-size:12px;text-align:center}th:first-child,td:first-child{text-align:left}h1{font-size:21px}h2{font-size:16px}</style></head><body><h1>HLGB Confecções — Checklist da facção</h1><p><b>Destino:</b> '+esc(c.destinationName||'-')+'<br><b>Modelo:</b> '+esc(c.productName||'-')+'<br><b>Quantidade:</b> '+q(c.qty).toLocaleString('pt-BR')+' peças</p>'+payHtml(c,true)+'<h2>Grade do produto enviado</h2>'+matrix+'<h2>Matéria-prima / aviamentos</h2><table><tr><th>OK</th><th>Material</th><th>Categoria</th><th>Cor</th><th>Quantidade</th><th>Unidade</th><th>Rolos</th></tr>'+(mats||'<tr><td colspan="7">Sem materiais cadastrados.</td></tr>')+'</table><p>Conferido por: __________________________ Data: ____/____/________</p><p>Observação: ______________________________________________________________</p><script>window.onload=()=>window.print();<\/script></body></html>');
 w.document.close();return true;
}
function installPrint(){
 const old=window.printMaterialChecklist;if(typeof old!=='function'||chainHas(old,'__hlgb9424Print'))return false;
 const w=function(id){if(checklistById(id))return printChecklist9424(id);return old.apply(this,arguments)};
 w.__hlgb9424Print=true;w.__original=old;window.printMaterialChecklist=w;return true;
}
function repairVisible(){ensureTravetaFields();const modal=document.getElementById('modal');if(modal?.querySelector('.hlgbFactionChecklistPay9424'))modal.querySelectorAll('.hlgb9423ChecklistValue').forEach(x=>x.remove())}
function install(){
 state.lastInstall=new Date().toISOString();installSaveGuard();installChecklist();installPrint();repairVisible();
 try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<94.24){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V}}catch(_){}
 return true;
}
const modal=document.getElementById('modal');if(modal&&typeof MutationObserver==='function')new MutationObserver(()=>setTimeout(repairVisible,0)).observe(modal,{childList:true,subtree:true});
document.addEventListener('change',e=>{if(['mname','mprice','msent','mtraveta9424','mtravetaDiscount9424'].includes(e.target?.id))setTimeout(refreshTravetaPreview,0)},true);
window.hlgbFactionTraveta9424={version:V,state,calc,ensureTravetaFields,refreshTravetaPreview,applyTravetaToFaction,pricingForChecklist,payHtml,ensureChecklistPay,install};
install();let tries=0;const timer=setInterval(()=>{tries++;install();if(tries>=60)clearInterval(timer)},250);
try{if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>setTimeout(install,350),0)}catch(_){}
window.addEventListener('focus',install);
console.info('[HLGB] facções: travetada + valor unitário/total no checklist v'+V+' ativo');
})();