/* HLGB v94.24 — travetada + valor unitário/total da facção no checklist */
(function(){
'use strict';
const V='94.24';
if(window.HLGB_FACTION_TRAVETA_PAYMENT_9424===V)return;
window.HLGB_FACTION_TRAVETA_PAYMENT_9424=V;

const sid=v=>String(v??'');
const qty=v=>Math.max(0,Number(v)||0);
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const rawNumber=v=>{const s=sid(v).trim().replace(',','.');if(!s)return NaN;const n=Number(s);return Number.isFinite(n)?n:NaN};
const finiteOrNull=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const money=v=>(Math.max(0,Number(v)||0)).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}try{return window.db||null}catch(e){return null}}
function arr(n){const d=dbRef();return Array.isArray(d?.[n])?d[n]:[]}

const state={mode:'',faction:null,formRepairs:0,saves:0,checklists:0,lastInstall:''};

function calc(base,decision,deduction){
  base=Math.max(0,Number(base)||0);deduction=Math.max(0,Number(deduction)||0);
  const applied=decision==='nao'?deduction:0;
  return {base,decision,deduction:applied,finalUnit:Math.max(0,base-applied)};
}
function validatePricing(baseRaw,decision,deductionRaw){
  if(decision!=='sim'&&decision!=='nao')return {ok:false,code:'decision'};
  const base=rawNumber(baseRaw);if(!Number.isFinite(base)||base<0)return {ok:false,code:'base'};
  let deduction=0;
  if(decision==='nao'){
    deduction=rawNumber(deductionRaw);if(!Number.isFinite(deduction)||deduction<0)return {ok:false,code:'deduction'};
    if(deduction>base)return {ok:false,code:'deduction_gt_base'};
  }
  return {ok:true,...calc(base,decision,deduction)};
}
function factionByArg(arg){
  if(arg&&typeof arg==='object'&&arr('factions').includes(arg))return arg;
  const id=arg&&typeof arg==='object'?(arg.id??arg.__hlgbId):arg;
  return arr('factions').find(f=>sid(f?.id??f?.__hlgbId)===sid(id))||null;
}
function findFactionForModal(){
  if(state.mode==='edit'&&state.faction)return state.faction;
  return null;
}
function decisionOf(f){return typeof f?.doesTraveta==='boolean'?(f.doesTraveta?'sim':'nao'):''}
function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
function setDisplay(el,value){if(el&&el.style.display!==value)el.style.display=value}

function refreshTravetaPreview(){
  const box=document.getElementById('hlgbFactionTravetaBox9424');if(!box)return null;
  const decision=document.getElementById('mtraveta9424')?.value||'';
  const base=qty(document.getElementById('mprice')?.value);
  const sent=qty(document.getElementById('msent')?.value);
  const deduction=qty(document.getElementById('mtravetaDiscount9424')?.value);
  setDisplay(document.getElementById('mtravetaDiscountField9424'),decision==='nao'?'block':'none');
  const out=calc(base,decision,deduction);
  setText(document.getElementById('mtravetaFinalUnit9424'),money(out.finalUnit));
  setText(document.getElementById('mtravetaTotal9424'),money(out.finalUnit*sent));
  setText(document.getElementById('mtravetaHint9424'),!decision?'Escolha Sim ou Não antes de salvar.':decision==='nao'?'O desconto da travetada será abatido de cada peça.':'Sem desconto de travetada.');
  return {...out,qty:sent,total:out.finalUnit*sent};
}
function ensureTravetaFields(explicitFaction){
  const price=document.getElementById('mprice'),name=document.getElementById('mname'),sent=document.getElementById('msent');
  if(!price||!name||!sent)return false;
  const f=explicitFaction||findFactionForModal();
  let box=document.getElementById('hlgbFactionTravetaBox9424');
  if(!box){
    const decision=decisionOf(f),deduction=Math.max(0,finiteOrNull(f?.travetaDeductionUnit)??0);
    const storedBase=finiteOrNull(f?.baseUnitPrice);
    if(storedBase!=null&&state.mode==='edit')price.value=storedBase.toFixed(2);
    box=document.createElement('div');box.id='hlgbFactionTravetaBox9424';box.className='panel';
    box.style.cssText='margin:12px 0;background:#fff8fb;border:1px solid #f1cbd9;padding:12px;border-radius:12px';
    box.innerHTML='<h3 style="margin:0 0 8px">✂️ Travetada e valor da facção</h3>'+
      '<div class="sub" style="margin-bottom:10px">O valor por peça acima é o valor base, antes do desconto da travetada.</div>'+
      '<div class="grid">'+
        '<div class="field"><label>Esta facção faz a travetada?</label><select id="mtraveta9424" required><option value="">Selecione</option><option value="sim"'+(decision==='sim'?' selected':'')+'>Sim</option><option value="nao"'+(decision==='nao'?' selected':'')+'>Não</option></select></div>'+
        '<div class="field" id="mtravetaDiscountField9424" style="display:'+(decision==='nao'?'block':'none')+'"><label>Desconto da travetada por peça (R$)</label><input id="mtravetaDiscount9424" type="number" min="0" step="0.01" value="'+deduction.toFixed(2)+'"></div>'+
      '</div>'+
      '<div id="mtravetaHint9424" class="sub" style="margin-top:6px"></div>'+
      '<div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:10px"><div><b>Valor final por peça:</b> <span id="mtravetaFinalUnit9424">R$ 0,00</span></div><div><b>Total previsto:</b> <span id="mtravetaTotal9424">R$ 0,00</span></div></div>';
    const anchor=price.closest?.('.field')||price.parentElement;
    const grid=anchor?.parentElement;
    if(grid?.parentElement)grid.insertAdjacentElement('afterend',box);
    else (document.querySelector('#modal .modal-content,#modal .modal-card,#modal .modalCard')||document.getElementById('modal'))?.appendChild(box);
    for(const id of ['mtraveta9424','mtravetaDiscount9424','mprice','msent']){
      const el=document.getElementById(id);if(!el||el.dataset.hlgbTraveta9424)return;
      el.dataset.hlgbTraveta9424='1';el.addEventListener('input',refreshTravetaPreview);el.addEventListener('change',refreshTravetaPreview);
    }
    state.formRepairs++;
  }
  refreshTravetaPreview();return true;
}
function alertValidation(code){
  if(code==='decision'){alert('Informe se esta facção faz a travetada antes de salvar.');document.getElementById('mtraveta9424')?.focus();return}
  if(code==='base'){alert('Informe um valor por peça válido.');document.getElementById('mprice')?.focus();return}
  if(code==='deduction'){alert('Informe um desconto da travetada por peça válido.');document.getElementById('mtravetaDiscount9424')?.focus();return}
  if(code==='deduction_gt_base'){alert('O desconto da travetada não pode ser maior que o valor da peça.');document.getElementById('mtravetaDiscount9424')?.focus();}
}
function snapshotPricing(f){if(!f||typeof f!=='object')return null;const keys=['price','baseUnitPrice','doesTraveta','travetaDeductionUnit','payableUnitPrice','payableTotal','travetaPricingVersion','travetaPricingUpdatedAt'];const out={};for(const k of keys)out[k]={has:Object.prototype.hasOwnProperty.call(f,k),value:f[k]};return out}
function restorePricing(f,snap){if(!f||!snap)return;for(const [k,x] of Object.entries(snap)){if(x.has)f[k]=x.value;else delete f[k]}}
function prepareTravetaSave(f){
  ensureTravetaFields(f);
  const decision=document.getElementById('mtraveta9424')?.value||'';
  const baseEl=document.getElementById('mprice'),discountEl=document.getElementById('mtravetaDiscount9424');
  const valid=validatePricing(baseEl?.value,decision,discountEl?.value);
  if(!valid.ok){alertValidation(valid.code);return {ok:false}}
  const sent=qty(document.getElementById('msent')?.value??f?.sent),total=valid.finalUnit*sent;
  if(f&&typeof f==='object'){
    f.price=valid.finalUnit;
    f.baseUnitPrice=valid.base;
    f.doesTraveta=decision==='sim';
    f.travetaDeductionUnit=valid.deduction;
    f.payableUnitPrice=valid.finalUnit;
    f.payableTotal=total;
    f.travetaPricingVersion=V;
    f.travetaPricingUpdatedAt=new Date().toISOString();
  }
  if(baseEl)baseEl.value=valid.finalUnit.toFixed(2);
  return {ok:true,...valid,qty:sent,total,baseEl};
}
function chainHas(fn,marker){let x=fn,n=0;const seen=new Set();while(typeof x==='function'&&!seen.has(x)&&n++<48){if(x[marker])return true;seen.add(x);x=x.__original||x.__hlgbOriginal}return false}
function installSaveGuard(){
  const old=window.saveFactionServiceFromForm;if(typeof old!=='function'||chainHas(old,'__hlgb9424Traveta'))return false;
  const w=function(f){
    const snap=snapshotPricing(f),prepared=prepareTravetaSave(f);if(!prepared.ok)return false;
    state.saves++;
    try{return old.apply(this,arguments)}catch(e){restorePricing(f,snap);throw e}finally{if(prepared.baseEl?.isConnected)prepared.baseEl.value=prepared.base.toFixed(2)}
  };
  w.__hlgb9424Traveta=true;w.__original=old;window.saveFactionServiceFromForm=w;return true;
}
function installOpenWrapper(name,mode){
  const old=window[name];if(typeof old!=='function'||chainHas(old,'__hlgb9424Open'))return false;
  const w=function(){
    state.mode=mode;state.faction=mode==='edit'?factionByArg(arguments[0]):null;
    const out=old.apply(this,arguments);
    setTimeout(()=>ensureTravetaFields(state.faction),0);setTimeout(()=>ensureTravetaFields(state.faction),80);
    return out;
  };
  w.__hlgb9424Open=true;w.__original=old;window[name]=w;return true;
}

function checklistById(id){return arr('materialChecklists').find(x=>sid(x?.id)===sid(id))||null}
function latestFaction(rows){return rows.slice().sort((a,b)=>sid(b?.sentAt||b?.date||b?.createdAt||b?.id).localeCompare(sid(a?.sentAt||a?.date||a?.createdAt||a?.id)))[0]||null}
function factionForChecklist(c){
  if(!c)return null;
  let f=arr('factions').find(x=>c.factionId!=null&&sid(x?.id)===sid(c.factionId));if(f)return f;
  f=arr('factions').find(x=>c.productionId!=null&&sid(x?.productionId)===sid(c.productionId)&&(!c.productId||sid(x?.productId)===sid(c.productId)));if(f)return f;
  let rows=arr('factions').filter(x=>norm(x?.name)===norm(c?.destinationName)&&(!c?.productId||sid(x?.productId)===sid(c.productId)));
  const exactQty=rows.filter(x=>c?.qty!=null&&qty(x?.sent)===qty(c.qty));if(exactQty.length)rows=exactQty;
  return latestFaction(rows);
}
function pricingForChecklist(c){
  const f=factionForChecklist(c);
  const final=Math.max(0,finiteOrNull(f?.price)??finiteOrNull(c?.price)??finiteOrNull(c?.unitPrice)??finiteOrNull(f?.payableUnitPrice)??finiteOrNull(c?.payableUnitPrice)??0);
  const doesTraveta=typeof f?.doesTraveta==='boolean'?f.doesTraveta:(typeof c?.doesTraveta==='boolean'?c.doesTraveta:null);
  const deduction=doesTraveta===false?Math.max(0,finiteOrNull(f?.travetaDeductionUnit)??finiteOrNull(c?.travetaDeductionUnit)??0):0;
  let base=finiteOrNull(f?.baseUnitPrice)??finiteOrNull(c?.baseUnitPrice);
  if(base==null)base=doesTraveta===false?final+deduction:final;base=Math.max(0,base);
  const pieces=qty(c?.qty!=null?c.qty:(f?.sent!=null?f.sent:f?.done));
  return {f,base,final,deduction,doesTraveta,qty:pieces,total:final*pieces};
}
function payHtml(c,forPrint){
  const p=pricingForChecklist(c),trav=p.doesTraveta===true?'Sim':p.doesTraveta===false?'Não':'Não informado';
  const style=forPrint?'border:1px solid #bbb;padding:12px;margin:12px 0':'margin:12px 0;background:#f7fbff;border:1px solid #b9d8ef;padding:12px;border-radius:12px';
  return '<div class="hlgbFactionChecklistPay9424" style="'+style+'"><div style="font-size:16px;font-weight:800;margin-bottom:8px">💰 Valor da facção</div><div style="display:flex;gap:18px;flex-wrap:wrap">'+
    '<div><b>Valor base/peça:</b> '+money(p.base)+'</div><div><b>Travetada:</b> '+trav+'</div>'+
    (p.doesTraveta===false?'<div><b>Desconto travetada/peça:</b> '+money(p.deduction)+'</div>':'')+
    '<div><b>Valor final/peça:</b> '+money(p.final)+'</div><div><b>Quantidade:</b> '+p.qty.toLocaleString('pt-BR')+'</div><div><b>Total a receber:</b> '+money(p.total)+'</div></div></div>';
}
function ensureChecklistPay(id){
  const c=checklistById(id),modal=document.getElementById('modal');if(!c||!modal)return false;
  modal.querySelectorAll?.('.hlgb9423ChecklistValue').forEach(x=>x.remove());
  if(modal.querySelector?.('.hlgbFactionChecklistPay9424'))return true;
  const host=modal.querySelector?.('.modal-content,.modalCard,.modal-card')||modal,wrap=document.createElement('div');wrap.innerHTML=payHtml(c,false);const box=wrap.firstElementChild;if(!box)return false;
  const title=host.querySelector?.('h2,h3');if(title)title.insertAdjacentElement('afterend',box);else host.insertAdjacentElement('afterbegin',box);
  state.checklists++;return true;
}
function installChecklist(){
  const old=window.openMaterialChecklist;if(typeof old!=='function'||chainHas(old,'__hlgb9424Checklist'))return false;
  const w=function(id){const out=old.apply(this,arguments);setTimeout(()=>ensureChecklistPay(id),0);setTimeout(()=>ensureChecklistPay(id),100);return out};
  w.__hlgb9424Checklist=true;w.__original=old;window.openMaterialChecklist=w;return true;
}
function printChecklist9424(id){
  const c=checklistById(id);if(!c)return false;
  const matrix=typeof window.hlgbFactionChecklistGrade?.matrix==='function'?window.hlgbFactionChecklistGrade.matrix(c):'<div>Grade não disponível.</div>';
  const mats=(c.materials||[]).map(m=>'<tr><td>☐</td><td>'+esc(m.name||'')+'</td><td>'+esc(m.cat||'-')+'</td><td>'+esc(m.color||'Total')+'</td><td>'+qty(m.qty).toLocaleString('pt-BR',{maximumFractionDigits:3})+'</td><td>'+esc(m.unit||'')+'</td><td>'+(m.rolls!=null?qty(m.rolls)+' rolo'+(qty(m.rolls)===1?'':'s'):'-')+'</td></tr>').join('');
  const w=window.open('','_blank');if(!w){alert('Permita pop-ups para imprimir.');return false}
  w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Checklist — '+esc(c.destinationName||'')+'</title><style>body{font-family:Arial;padding:26px;color:#222}table{width:100%;border-collapse:collapse;margin:10px 0 18px}th,td{border:1px solid #aaa;padding:7px;font-size:12px;text-align:center}th:first-child,td:first-child{text-align:left}h1{font-size:21px}h2{font-size:16px}</style></head><body><h1>HLGB Confecções — Checklist da facção</h1><p><b>Destino:</b> '+esc(c.destinationName||'-')+'<br><b>Modelo:</b> '+esc(c.productName||'-')+'<br><b>Quantidade:</b> '+qty(c.qty).toLocaleString('pt-BR')+' peças</p>'+payHtml(c,true)+'<h2>Grade do produto enviado</h2>'+matrix+'<h2>Matéria-prima / aviamentos</h2><table><tr><th>OK</th><th>Material</th><th>Categoria</th><th>Cor</th><th>Quantidade</th><th>Unidade</th><th>Rolos</th></tr>'+(mats||'<tr><td colspan="7">Sem materiais cadastrados.</td></tr>')+'</table><p>Conferido por: __________________________ Data: ____/____/________</p><p>Observação: ______________________________________________________________</p><script>window.onload=()=>window.print();<\/script></body></html>');
  w.document.close();return true;
}
function installPrint(){
  const old=window.printMaterialChecklist;if(typeof old!=='function'||chainHas(old,'__hlgb9424Print'))return false;
  const w=function(id){if(checklistById(id))return printChecklist9424(id);return old.apply(this,arguments)};
  w.__hlgb9424Print=true;w.__original=old;window.printMaterialChecklist=w;return true;
}
function install(){
  state.lastInstall=new Date().toISOString();
  installOpenWrapper('newFaction','new');installOpenWrapper('editFaction','edit');installSaveGuard();installChecklist();installPrint();
  try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<94.24){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector?.('#appShell .logo small');if(l)l.textContent='v'+V}}catch(e){}
  return true;
}
function scheduleFormRepair(){setTimeout(()=>ensureTravetaFields(state.faction),0);setTimeout(()=>ensureTravetaFields(state.faction),100)}
document.addEventListener?.('click',e=>{const b=e.target?.closest?.('button');if(!b)return;const t=norm(b.textContent),oc=sid(b.getAttribute?.('onclick'));if(t.includes('enviar para faccao')||t==='editar'||/newFaction|editFaction|hlgbOpenFactionModelSend/.test(oc))scheduleFormRepair()},true);

window.hlgbFactionTraveta9424={version:V,calc,validatePricing,pricingForChecklist,payHtml,ensureTravetaFields,install,state};
install();setTimeout(install,350);setTimeout(install,1200);setTimeout(install,3500);
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(install,200);setTimeout(install,900)},0)}catch(e){}
console.info('[HLGB] v'+V+' travetada + valor unitário/total da facção ativos');
})();
