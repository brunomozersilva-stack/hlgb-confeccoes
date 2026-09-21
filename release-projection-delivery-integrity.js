/* HLGB audit — valor entregue da Projeção sem duplicar sombras históricas */
(function(){
'use strict';
const V='v1';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0);
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
const meaningful=v=>{const n=norm(v);return !!n&&!['sem cliente','cliente','-'].includes(n)};
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
function orderFor(row){
 if(row?.order)return row.order;
 const oid=row?.item?.orderId??row?.invoice?.orderId;
 return (Array.isArray(db?.orders)?db.orders:[]).find(o=>sid(o?.id)===sid(oid))||null;
}
function productKey(row){
 return sid(row?.item?.productId??row?.item?.itemKey??'');
}
function expectedQty(order,row){
 if(!order)return 0;
 const pid=productKey(row),ikey=sid(row?.item?.itemKey??pid);
 try{
  if(typeof window.projectionItemsForOrder==='function'){
   const it=(window.projectionItemsForOrder(order)||[]).find(x=>
    (ikey&&sid(x?.key)===ikey)||(pid&&sid(x?.productId)===pid));
   if(q(it?.qty)>0)return q(it.qty);
  }
 }catch(e){}
 const grade=Array.isArray(order?.grade)?order.grade:[];
 const total=grade.filter(g=>pid&&sid(g?.productId)===pid).reduce((s,g)=>s+q(g?.qty),0);
 return total;
}
function savedMeta(order,row){
 if(!order)return {};
 const pid=productKey(row),ikey=sid(row?.item?.itemKey??pid),p=order.projectionItems||{};
 return p[ikey]||p[pid]||{};
}
function resolveClient(order,row){
 const item=row?.item||{},inv=row?.invoice||{};
 if(meaningful(item.clientName))return {clientId:item.clientId??inv.clientId??null,clientName:item.clientName};
 if(meaningful(inv.client))return {clientId:inv.clientId??item.clientId??null,clientName:inv.client};
 const meta=savedMeta(order,row),invoiceId=sid(inv.id);
 const hist=Array.isArray(meta?.deliveryHistory)?meta.deliveryHistory:[];
 const h=hist.find(x=>invoiceId&&sid(x?.invoiceId)===invoiceId&&meaningful(x?.clientName))
   ||hist.slice().reverse().find(x=>meaningful(x?.clientName));
 if(h)return {clientId:h.clientId??null,clientName:h.clientName};
 const pid=productKey(row),a=order?.productClientAssignments?.[pid]||null;
 if(a&&meaningful(a.clientName))return {clientId:a.clientId??null,clientName:a.clientName};
 if(meaningful(meta?.lastDeliveryClientName))return {clientId:meta.lastDeliveryClientId??null,clientName:meta.lastDeliveryClientName};
 if(meaningful(order?.client))return {clientId:order.clientId??null,clientName:order.client};
 return {clientId:item.clientId??inv.clientId??order?.clientId??null,clientName:'Sem cliente'};
}
function canonicalize(rows){
 const used=new Map(),out=[];
 for(const raw of (Array.isArray(rows)?rows:[])){
  const row={...raw,item:clone(raw?.item||{}),invoice:raw?.invoice||{}},order=orderFor(row);
  const oid=sid(order?.id??row.item?.orderId??row.invoice?.orderId),pid=productKey(row);
  const key=oid&&pid?oid+'::'+pid:'';
  const rawQty=q(row.qty??row.item?.qty);if(rawQty<=0)continue;
  const expected=expectedQty(order,row);
  let take=rawQty;
  if(key&&expected>0){
   const already=q(used.get(key)),left=Math.max(0,expected-already);
   take=Math.min(rawQty,left);used.set(key,already+take);
  }
  if(take<=0)continue;
  const unit=rawQty>0?q(row.value)/rawQty:q(row.item?.unitPrice);
  const client=resolveClient(order,row);
  row.order=order||row.order||null;
  row.qty=take;
  row.value=unit>0?take*unit:q(row.value);
  row.item={...row.item,clientId:client.clientId,clientName:client.clientName};
  row.hlgbProjectionCanonical=true;
  if(take<rawQty)row.hlgbCappedDuplicateQty=rawQty-take;
  out.push(row);
 }
 return out;
}
const original=window.projectionDeliveredRows;
if(typeof original==='function'&&!original.__hlgbProjectionDeliveryIntegrityV1){
 const wrapped=function(startS='0000-01-01',endS='9999-12-31'){
  // Canoniza o histórico completo antes de filtrar o período para que uma sombra
  // duplicada fora/dentro da janela não consiga furar o teto do produto.
  const raw=original.call(this,'0000-01-01','9999-12-31');
  return canonicalize(raw).filter(r=>{
   const d=sid(r?.projectionDate||r?.date).slice(0,10);
   return (!startS||d>=startS)&&(!endS||d<=endS);
  });
 };
 wrapped.__hlgbProjectionDeliveryIntegrityV1=true;wrapped.__original=original;
 window.projectionDeliveredRows=wrapped;
}
window.hlgbCanonicalProjectionDeliveredRows=canonicalize;
window.hlgbResolveProjectionDeliveryClient=resolveClient;
window.HLGB_PROJECTION_DELIVERY_INTEGRITY_GUARD=V;
console.info('[HLGB] Projeção entregue '+V+': valor/cliente deduplicado pelo teto real do produto');
})();