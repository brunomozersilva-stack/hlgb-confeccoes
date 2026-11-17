/* HLGB v95.103 — reconcilia preço confirmado antes de enviar Projeção para Notas.
 * Não altera pedido, produto, grade, fila, nota, WAL ou Supabase.
 * Protege contra produto local desatualizado com preço já salvo na nuvem.
 */
(function(root){
'use strict';
if(!root||root.hlgbNotePriceReconcile95103)return;
const sid=v=>String(v??'').trim(),q=v=>Number.isFinite(Number(v))?Math.max(0,Number(v)):0;
const verified=new Map(),pending=new Map();
function data(){try{return typeof db!=='undefined'&&db?db:root.db||{}}catch(_){return root.db||{}}}
function product(pid){return (data().products||[]).find(p=>sid(p?.id)===sid(pid))||null}
function clientPrice(cid,pid){const c=(data().clients||[]).find(x=>sid(x?.id)===sid(cid));return q(c?.prices?.[sid(pid)])}
function effective(cid,pid){
 const local=clientPrice(cid,pid);
 if(local>0)return local;
 const p=product(pid),special=q(p?.clientPrices?.[sid(cid)]);
 if(special>0)return special;
 const fallback=q(p?.price);
 if(fallback>0)return fallback;
 const confirmed=verified.get(sid(pid));
 if(!confirmed)return 0;
 const cloudSpecial=q(confirmed.clientPrices?.[sid(cid)]);
 return cloudSpecial>0?cloudSpecial:q(confirmed.price);
}
async function verify(pid){
 const id=sid(pid);if(!id)throw Error('Produto sem identificação; não é possível conferir o preço.');
 if(pending.has(id))return pending.get(id);
 const request=(async()=>{
  if(typeof root.cloudRequest!=='function'||root.__HLGB_AUTH_READY!==true)
    throw Error('Sem sessão autenticada para conferir o preço do produto na nuvem.');
  const url='hlgb_records?select=entity_id,data,deleted_at&module=eq.products&entity_id=eq.'+encodeURIComponent(id)+'&limit=1';
  const rows=await root.cloudRequest(url,{method:'GET'});
  if(!Array.isArray(rows))throw Error('A nuvem não confirmou a leitura do preço.');
  const row=rows.find(r=>!r?.deleted_at&&sid(r?.entity_id)===id&&sid(r?.data?.id)===id);
  if(!row)throw Error('Produto '+id+' não localizado ou não confirmado no servidor.');
  const price=q(row.data?.price),cp=row.data?.clientPrices;
  if(price<=0&&!Object.values(cp||{}).some(v=>q(v)>0))
    throw Error('Produto '+id+' realmente está sem preço de venda positivo na nuvem.');
  const record={price,clientPrices:cp&&typeof cp==='object'?cp:{}};
  verified.set(id,record);return record;
 })().finally(()=>pending.delete(id));
 pending.set(id,request);return request;
}
function selectedProducts(){
 const orders=data().orders||[],out=[],seen=new Set();
 if(typeof document==='undefined')return out;
 for(const cb of document.querySelectorAll('.projectionSelect:checked')){
  const value=sid(cb?.value),separator=value.indexOf('::');
  if(separator<0)continue;
  const oid=value.slice(0,separator),key=value.slice(separator+2);
  const order=orders.find(o=>sid(o?.id)===oid);
  if(!order)continue;
  // Não chamar projectionItemsForOrder aqui: o legado pode inicializar
  // o.projectionItems durante uma simples leitura e sujar um pedido local.
  const grade=Array.isArray(order.grade)?order.grade:[];
  const pid=grade.some(x=>sid(x?.productId)===key)?key:
   sid(order?.projectionItems?.[key]?.productId||order?.productId||'');
  const cid=sid(order.clientId),name=sid(product(pid)?.name||order.items||key);
  if(!pid){out.push({pid:'',name,cid});continue}
  const token=cid+'::'+pid;
  if(seen.has(token))continue;seen.add(token);
  out.push({pid,cid,name});
 }
 return out;
}
const originalSuggested=root.suggestedPrice;
function suggestedWithVerified(cid,pid){
 let original=0;
 try{if(typeof originalSuggested==='function')original=q(originalSuggested(cid,pid))}catch(_){}
 return original>0?original:effective(cid,pid);
}
const originalSend=root.sendProjectionToNotes9202;
if(typeof originalSend==='function'){
 const wrapped=async function(){
  const items=selectedProducts();
  for(const it of items){
   if(!it.pid){alert('O modelo '+it.name+' não possui identificação válida. Confira o pedido antes de enviar para Notas.');return false}
   if(effective(it.cid,it.pid)>0)continue;
   try{await verify(it.pid)}catch(err){
    alert('Não foi possível enviar '+it.name+' para Notas: '+sid(err?.message||err)+
      ' O pedido e a fila continuam inalterados.');return false;
   }
   if(effective(it.cid,it.pid)<=0){
    alert('O modelo '+it.name+' continua sem preço de venda válido para a nota. Nenhuma fila foi criada.');
    return false;
   }
  }
  return originalSend.apply(this,arguments);
 };
 wrapped.__hlgbNotePrice95103=true;wrapped.__original=originalSend;root.sendProjectionToNotes9202=wrapped;
 root.suggestedPrice=suggestedWithVerified;
}
root.hlgbNotePriceReconcile95103={version:'95.103',verify,effective,selectedProducts,verifiedCount:()=>verified.size};
})(typeof window!=='undefined'?window:null);
