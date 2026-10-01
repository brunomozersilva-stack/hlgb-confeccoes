/* HLGB — pagamento avulso de facções */
(function(){
'use strict';
const V='2026.10.01-faction-manual-payment-v1';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),now=()=>new Date().toISOString(),today=()=>new Date().toISOString().slice(0,10);
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function uid(prefix){return prefix+'-'+Date.now()+'-'+Math.floor(Math.random()*900000)}
function factions(){
  const names=[];
  for(const f of arr('factions')){const n=String(f?.name||'').trim();if(n)names.push(n)}
  for(const l of arr('productionLocations')){const n=String(l?.name||'').trim();if(n)names.push(n)}
  const seen=new Set();return names.filter(n=>{const k=n.toLowerCase();if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
function products(){return arr('products').filter(p=>p&&p.id!=null).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR'))}
function productById(id){return products().find(p=>sid(p.id)===sid(id))||null}
function ensureRowsHost(){
  let host=document.getElementById('hlgbManualFactionLines');if(host)return host;
  return null;
}
function addLine(data={}){
  const host=ensureRowsHost();if(!host)return;
  const row=document.createElement('div');row.className='hlgb-manual-faction-line grid';row.style.cssText='grid-template-columns:minmax(220px,2fr) 110px 120px 120px auto;align-items:end;margin-top:8px';
  const opts=products().map(p=>'<option value="'+escSafe(p.id)+'">'+escSafe(p.name||'Produto')+'</option>').join('');
  row.innerHTML='<div class="field"><label>Produto</label><select class="hlgbMfpProduct"><option value="">Selecione</option>'+opts+'</select></div><div class="field"><label>Qtd.</label><input class="hlgbMfpQty" type="number" min="0" step="1" value="'+q(data.qty||1)+'"></div><div class="field"><label>Valor un.</label><input class="hlgbMfpUnit" type="number" min="0" step="0.01" value="'+q(data.unitPrice||0)+'"></div><div class="field"><label>Total</label><input class="hlgbMfpTotal" disabled></div><button type="button" class="secondary hlgbMfpRemove">Remover</button>';
  host.appendChild(row);
  const sel=row.querySelector('.hlgbMfpProduct'),qty=row.querySelector('.hlgbMfpQty'),unit=row.querySelector('.hlgbMfpUnit'),total=row.querySelector('.hlgbMfpTotal');
  if(data.productId)sel.value=sid(data.productId);
  const recalc=()=>{total.value=(q(qty.value)*q(unit.value)).toFixed(2);renderGrandTotal()};
  qty.addEventListener('input',recalc);unit.addEventListener('input',recalc);
  sel.addEventListener('change',()=>{const p=productById(sel.value);if(p&&q(unit.value)<=0&&q(p.factionCost)>0)unit.value=q(p.factionCost).toFixed(2);recalc()});
  row.querySelector('.hlgbMfpRemove').addEventListener('click',()=>{row.remove();renderGrandTotal()});
  recalc();
}
function lineData(){
  return [...document.querySelectorAll('.hlgb-manual-faction-line')].map(row=>{
    const productId=row.querySelector('.hlgbMfpProduct')?.value||'',p=productById(productId),quantity=q(row.querySelector('.hlgbMfpQty')?.value),unitPrice=q(row.querySelector('.hlgbMfpUnit')?.value);
    return {productId,productName:p?.name||'',quantity,unitPrice,value:quantity*unitPrice};
  }).filter(x=>x.productId&&x.quantity>0);
}
function renderGrandTotal(){const el=document.getElementById('hlgbMfpGrandTotal');if(el)el.textContent=(typeof money==='function'?money(lineData().reduce((s,x)=>s+x.value,0)):'R$ '+lineData().reduce((s,x)=>s+x.value,0).toFixed(2))}
async function saveRecord(module,row){
  if(typeof hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação oficial indisponível.');
  const out=await hlgbRecordSaveWithRetry(module,sid(row.id),row,false);
  if(!out?.applied)throw new Error('A nuvem não confirmou '+module+'.');
  db[module]=Array.isArray(db[module])?db[module]:[];const i=db[module].findIndex(x=>sid(x?.id)===sid(row.id));if(i>=0)db[module][i]=out.data||row;else db[module].push(out.data||row);
  try{localSaveOnly?.()}catch(e){}
  return out.data||row;
}
function hubId(groupId){let n=0;for(const ch of sid(groupId))n=(n*31+ch.charCodeAt(0))%9999999999999;return 300000000000000+n}
async function persist(){
  const factionName=String(document.getElementById('hlgbMfpFaction')?.value||'').trim(),date=document.getElementById('hlgbMfpDate')?.value||today(),status=document.getElementById('hlgbMfpStatus')?.value||'Pendente',method=document.getElementById('hlgbMfpMethod')?.value||'',note=document.getElementById('hlgbMfpNote')?.value||'',lines=lineData();
  if(!factionName)throw new Error('Informe a facção.');if(!lines.length)throw new Error('Adicione pelo menos um produto com quantidade.');
  const groupId=uid('faction-manual'),createdAt=now(),paid=status==='Pago',saved=[];
  for(const x of lines){
    const id=uid('fmp');
    saved.push(await saveRecord('factionPayments',{id,source:'faction_manual_payment_v1',manual:true,manualGroupId:groupId,status:paid?'Pago':'Pendente',factionName,productId:x.productId,description:x.productName,quantity:x.quantity,unitPrice:x.unitPrice,value:x.value,paidAmount:paid?x.value:0,paymentDate:paid?date:'',scheduledPaymentDate:date,paymentMethod:method,paymentHistory:[],discountAmount:0,observation:note||'Pagamento avulso de facção',createdAt,updatedAt:now()}));
  }
  const total=lines.reduce((s,x)=>s+x.value,0);
  await saveRecord('hubFinanceEntries',{id:hubId(groupId),flow:'Saída',description:'Pagamento avulso de facção — '+factionName,value:total,date,category:'Facções',subcategory:'Pagamento avulso',person:factionName,status:paid?'Realizado':'Previsto',acceptedMethods:method?[method]:[],paymentMethod:method,realizedAt:paid?date:'',note:(note?note+' · ':'')+lines.map(x=>x.productName+' '+x.quantity+'x').join(', '),sourceType:'faction_manual_payment',sourceId:groupId,createdAt,updatedAt:now()});
  return {groupId,total,saved};
}
function openForm(){
  const factionOptions=factions().map(n=>'<option value="'+escSafe(n)+'"></option>').join('');
  openModal('Pagamento avulso de facção','<div class="grid"><div class="field"><label>Facção</label><input id="hlgbMfpFaction" list="hlgbMfpFactions" placeholder="Escolha ou digite a facção"><datalist id="hlgbMfpFactions">'+factionOptions+'</datalist></div><div class="field"><label>Data</label><input id="hlgbMfpDate" type="date" value="'+today()+'"></div><div class="field"><label>Status</label><select id="hlgbMfpStatus"><option>Pendente</option><option>Pago</option></select></div><div class="field"><label>Forma de pagamento</label><input id="hlgbMfpMethod" placeholder="Pix, dinheiro..."></div></div><div style="margin-top:12px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b>Produtos / serviços</b><button type="button" class="secondary" onclick="hlgbFactionManualAddLine()">+ Adicionar produto</button></div><div id="hlgbManualFactionLines"></div></div><div class="field" style="margin-top:10px"><label>Observação</label><input id="hlgbMfpNote" placeholder="Ex.: retrabalho, serviço extra..."></div><div style="margin-top:12px;font-size:18px"><b>Total: <span id="hlgbMfpGrandTotal">R$ 0,00</span></b></div><button type="button" class="primary modalSave">☁️ Salvar pagamento avulso</button>',async()=>{
    const btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='☁️ Salvando…'}
    try{await persist();closeModal();try{renderFactionPayments?.()}catch(e){}try{renderHubFinance?.()}catch(e){}return true}catch(e){if(btn){btn.disabled=false;btn.textContent='☁️ Salvar pagamento avulso'}alert(String(e?.message||e));return false}
  });
  setTimeout(()=>addLine(),0);
}
function injectButton(){
  const root=document.getElementById('factionPaymentTable');if(!root||document.getElementById('hlgbFactionManualPaymentBtn'))return;
  const panel=root.closest?.('.panel')||root.parentElement;if(!panel)return;
  const btn=document.createElement('button');btn.id='hlgbFactionManualPaymentBtn';btn.type='button';btn.className='primary';btn.textContent='➕ Pagamento avulso';btn.onclick=openForm;
  const h=panel.querySelector('h2,h3');if(h)h.insertAdjacentElement('afterend',btn);else panel.insertBefore(btn,panel.firstChild);
}
window.openHlgbFactionManualPayment=openForm;window.hlgbFactionManualAddLine=addLine;window.hlgbFactionManualPayment={lineData,persist,factions,products};
const old=window.renderFactionPayments;if(typeof old==='function'&&!old.__hlgbManualPaymentV1){const w=function(){const r=old.apply(this,arguments);setTimeout(injectButton,0);return r};w.__hlgbManualPaymentV1=true;w.__original=old;window.renderFactionPayments=w}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(injectButton,1000),0)}catch(e){}setTimeout(injectButton,1800);
window.HLGB_FACTION_MANUAL_PAYMENT_GUARD=V;
console.info('[HLGB] pagamento avulso de facções ativo');
})();