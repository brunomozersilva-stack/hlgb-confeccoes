/* HLGB — nota de compra gera/atualiza Hub Financeiro na data correta */
(function(){
'use strict';
const V='2026.10.01-purchase-hub-due-v1';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0);
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function conditionFromForm(){
 const checked=document.querySelector('input[name="hlgbPurchaseCondition"]:checked');
 return checked?.value||((document.getElementById('purchaseStatus')?.value||'Pendente')==='Pago'?'paid_now':'term');
}
function ensureConditionUI(){
 const due=document.getElementById('purchaseDue');if(!due||document.getElementById('hlgbPurchaseConditionBox'))return;
 const host=due.closest('.grid')||due.parentElement?.parentElement;if(!host)return;
 const box=document.createElement('div');box.id='hlgbPurchaseConditionBox';box.className='field';box.innerHTML='<label>Condição de pagamento</label><div style="display:flex;gap:14px;flex-wrap:wrap"><label><input type="radio" name="hlgbPurchaseCondition" value="paid_now"> Pago no ato</label><label><input type="radio" name="hlgbPurchaseCondition" value="term" checked> A prazo</label></div><div class="sub">A prazo entra no Hub na data do vencimento. Pago no ato entra como realizado na data da compra/pagamento.</div>';
 host.appendChild(box);
 const p=window.__hlgbEditingPurchase||null,status=document.getElementById('purchaseStatus');
 let mode=p?.paymentCondition||(status?.value==='Pago'?'paid_now':'term');
 const radio=box.querySelector('input[value="'+mode+'"]');if(radio)radio.checked=true;
 box.querySelectorAll('input[name="hlgbPurchaseCondition"]').forEach(r=>r.addEventListener('change',syncConditionFields));
 syncConditionFields();
}
function syncConditionFields(){
 const mode=conditionFromForm(),status=document.getElementById('purchaseStatus'),due=document.getElementById('purchaseDue'),pay=document.getElementById('purchasePaymentDate'),date=document.getElementById('purchaseDate');
 if(mode==='paid_now'){
  if(status)status.value='Pago';
  if(pay&&!pay.value)pay.value=date?.value||new Date().toISOString().slice(0,10);
 }else{
  if(status)status.value='Pendente';
  if(pay)pay.value='';
 }
 if(due)due.required=(mode==='term');
}
function hubEntryFor(p){
 const mode=p.paymentCondition||((p.status==='Pago')?'paid_now':'term');
 const paid=mode==='paid_now'||p.status==='Pago';
 const date=paid?(p.paymentDate||p.date):(p.dueDate||p.date);
 return {
  id:'purchase-hub-'+sid(p.id),
  flow:'Saída',
  category:'Matéria-prima',
  subcategory:p.supplierName||'Fornecedor',
  description:'Nota '+(p.invoiceNumber||'-')+' · '+(p.supplierName||'Fornecedor'),
  value:q(p.total),
  date,
  status:paid?'Realizado':'Previsto',
  method:'',
  sourceType:'purchase_note',
  sourcePurchaseId:sid(p.id),
  purchaseId:sid(p.id),
  supplierId:p.supplierId||null,
  supplierName:p.supplierName||'',
  noteNumber:p.invoiceNumber||'',
  dueDate:p.dueDate||'',
  paymentDate:p.paymentDate||'',
  realizedAt:paid?(p.paymentDate||p.date):'',
  createdAt:p.createdAt||new Date().toISOString(),
  updatedAt:new Date().toISOString()
 };
}
async function saveHub(row){
 db.hubFinanceEntries=Array.isArray(db.hubFinanceEntries)?db.hubFinanceEntries:[];
 const i=db.hubFinanceEntries.findIndex(x=>sid(x?.sourcePurchaseId)===sid(row.sourcePurchaseId)||sid(x?.id)===sid(row.id));
 if(typeof hlgbRecordSaveWithRetry==='function'){
  const out=await hlgbRecordSaveWithRetry('hubFinanceEntries',sid(row.id),row,false);
  if(!out?.applied)throw new Error('O Hub Financeiro não confirmou o lançamento da nota.');
  const saved=out.data||row;if(i>=0)db.hubFinanceEntries[i]=saved;else db.hubFinanceEntries.push(saved);
 }else{
  if(i>=0)db.hubFinanceEntries[i]=row;else db.hubFinanceEntries.push(row);
  try{persistDb?.()}catch(e){}
 }
 try{localSaveOnly?.();renderHubFinance?.()}catch(e){}
 return row;
}
async function syncPurchaseToHub(p){
 if(!p||!p.id||q(p.total)<=0)return null;
 return saveHub(hubEntryFor(p));
}
const oldSave=window.savePurchaseFromForm;
if(typeof oldSave==='function'&&!oldSave.__hlgbPurchaseHubDueV1){
 const w=function(p){
  const ok=oldSave.apply(this,arguments);if(!ok)return false;
  const mode=conditionFromForm();
  p.paymentCondition=mode;
  if(mode==='term'){
   if(!p.dueDate){alert('Informe a data de vencimento para compra a prazo.');return false}
   p.status='Pendente';p.paymentDate='';
  }else{
   p.status='Pago';p.paymentDate=p.paymentDate||p.date||new Date().toISOString().slice(0,10);
  }
  setTimeout(()=>syncPurchaseToHub(p).catch(err=>{console.error('[HLGB compra→Hub]',err);alert('A nota foi salva, mas o lançamento no Hub não foi confirmado. Abra o Hub e sincronize antes de considerar concluído.')}),120);
  return true;
 };
 w.__hlgbPurchaseHubDueV1=true;w.__original=oldSave;window.savePurchaseFromForm=w;
}
const oldNew=window.newPurchase;
if(typeof oldNew==='function'&&!oldNew.__hlgbPurchaseHubDueV1){
 const w=function(){window.__hlgbEditingPurchase=null;const r=oldNew.apply(this,arguments);setTimeout(ensureConditionUI,40);return r};w.__hlgbPurchaseHubDueV1=true;w.__original=oldNew;window.newPurchase=w;
}
const oldEdit=window.editPurchase;
if(typeof oldEdit==='function'&&!oldEdit.__hlgbPurchaseHubDueV1){
 const w=function(id){window.__hlgbEditingPurchase=arr('purchases').find(x=>sid(x?.id)===sid(id))||null;const r=oldEdit.apply(this,arguments);setTimeout(ensureConditionUI,40);return r};w.__hlgbPurchaseHubDueV1=true;w.__original=oldEdit;window.editPurchase=w;
}
window.hlgbPurchaseHubDue={conditionFromForm,ensureConditionUI,syncConditionFields,hubEntryFor,syncPurchaseToHub};
setTimeout(ensureConditionUI,1600);
window.HLGB_PURCHASE_HUB_DUE_GUARD=V;
console.info('[HLGB] compras vinculadas ao Hub por vencimento/pagamento');
})();