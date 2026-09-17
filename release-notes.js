/* HLGB stable module v4: fila de notas autoritativa sem oscilação para zero */
(function(){
'use strict';
const q=v=>Math.max(0,Number(v)||0),sid=v=>String(v??''),norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function orderAliases(orderId,item){
  const ids=new Set(),id=sid(orderId);if(id)ids.add(id);
  const o=arr('orders').find(x=>sid(x?.id)===id);if(!o)return ids;
  if(o.noteSourceOrderId!=null)ids.add(sid(o.noteSourceOrderId));
  const key=sid(item?.key||item?.productId),pid=sid(item?.productId||key),map=o.fulfillmentByProduct&&typeof o.fulfillmentByProduct==='object'?o.fulfillmentByProduct:{};
  const link=map[pid]||map[key];if(link?.sourceOrderId!=null)ids.add(sid(link.sourceOrderId));
  return ids;
}
function snapshotQueueSource(){
 try{
   const map=hlgbRecordSnapshots?.noteQueue;
   if(!(map instanceof Map)||map.size===0)return null;
   const rows=[];for(const [id,s] of map){if(s&&!s.deleted_at&&s.data)rows.push({...s.data,id:s.data.id??id})}
   const known=new Set([...map.keys()].map(sid));
   for(const x of arr('noteQueue'))if(x?.id!=null&&!known.has(sid(x.id)))rows.push(x);
   return rows;
 }catch(e){return null}
}
function queueSource(){const s=snapshotQueueSource();return s?{rows:s,authoritative:true}:{rows:arr('noteQueue'),authoritative:false}}
function activeQueues(orderId,item,sourceRows){
  const key=sid(item?.key||item?.productId),pid=sid(item?.productId),aliases=orderAliases(orderId,item),rows=Array.isArray(sourceRows)?sourceRows:queueSource().rows;
  return rows.filter(x=>x&&!['faturado','cancelado','cancelada'].includes(norm(x.status))&&q(x.remainingQty??x.qty)>0&&[x.orderId,x.readyOrderId,x.sourceOrderId].some(v=>aliases.has(sid(v)))&&(sid(x.itemKey)===key||sid(x.productId)===pid));
}
function queued(orderId,item,sourceRows){return activeQueues(orderId,item,sourceRows).reduce((s,x)=>s+q(x.remainingQty??x.qty),0)}
function syncLocal(){
  try{
    const src=queueSource();
    for(const o of arr('orders')){
      if(!o)continue;o.projectionItems=o.projectionItems&&typeof o.projectionItems==='object'?o.projectionItems:{};
      const items=typeof window.projectionItemsForOrder==='function'?window.projectionItemsForOrder(o):[];
      for(const it of items){
        const k=sid(it.key||it.productId);if(!k)continue;
        const sv=o.projectionItems[k]||{},base=q(it.remainingQty!=null?it.remainingQty:it.qty),calculated=Math.min(base,queued(o.id,it,src.rows));
        // Antes do snapshot autoritativo terminar de carregar, uma lista local vazia NÃO prova que a fila é zero.
        // Preserva reserva já conhecida; quando o snapshot chega, exclusões reais podem reduzir o saldo normalmente.
        const z=src.authoritative?calculated:Math.max(calculated,q(sv.noteQueuedQty));
        if(q(sv.noteQueuedQty)!==z)o.projectionItems[k]={...sv,noteQueuedQty:z};
      }
    }
    return true;
  }catch(e){console.warn('[HLGB notes v4] sync',e);return false}
}
function decorateProjection(){
  try{
    const table=document.getElementById('projectionProductsTable');if(!table)return;
    const src=queueSource(),heads=[...table.querySelectorAll('thead th')];
    let noteIndex=heads.findIndex(h=>norm(h.textContent)==='nota');if(noteIndex<0)noteIndex=8;
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const cb=tr.querySelector('.projectionSelect');if(!cb)return;
      const parts=String(cb.value||'').split('::'),o=arr('orders').find(x=>sid(x.id)===sid(parts[0]));if(!o)return;
      const item=(typeof window.projectionItemsForOrder==='function'?window.projectionItemsForOrder(o):[]).find(i=>sid(i.key)===sid(parts[1]));if(!item)return;
      const sv=o.projectionItems?.[item.key]||{},calc=queued(o.id,item,src.rows),z=src.authoritative?calc:Math.max(calc,q(sv.noteQueuedQty)),cells=[...tr.children],cell=cells[noteIndex];
      tr.querySelectorAll('.hlgb-note-queued').forEach(x=>x.remove());
      if(z>0&&cell){
        const b=document.createElement('div');b.className='badge ok hlgb-note-queued';b.style.marginTop='4px';b.textContent='Na fila de Notas · '+z.toLocaleString('pt-BR')+' pç';cell.appendChild(b);
        const remaining=q(item.remainingQty!=null?item.remainingQty:item.qty);
        if(z>=remaining&&remaining>0){cb.checked=false;cb.disabled=true;cb.title='Quantidade já reservada na fila de Notas';}
      }
    });
  }catch(e){console.warn('[HLGB notes v4] decorate',e)}
}
const oldSend=window.sendProjectionToNotes9202;
if(typeof oldSend==='function'&&!oldSend.__hlgbNotesV4){const w=function(){syncLocal();return oldSend.apply(this,arguments)};w.__hlgbNotesV3=true;w.__hlgbNotesV4=true;window.sendProjectionToNotes9202=w}
const oldRender=window.renderProjection;
if(typeof oldRender==='function'&&!oldRender.__hlgbNotesV4){const w=function(){syncLocal();const r=oldRender.apply(this,arguments);setTimeout(decorateProjection,0);return r};w.__hlgbNotesV3=true;w.__hlgbNotesV4=true;window.renderProjection=w}
const oldIncoming=window.hlgbRenderIncomingRecord;
window.hlgbRenderIncomingRecord=function(module){
  const r=typeof oldIncoming==='function'?oldIncoming.apply(this,arguments):undefined;
  if(['noteQueue','orders','projectionInvoices'].includes(module))setTimeout(()=>{syncLocal();try{window.renderProjection?.()}catch(e){}},40);
  return r;
};
function refresh(){syncLocal();try{window.renderProjection?.()}catch(e){};setTimeout(decorateProjection,40)}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(refresh,700);setTimeout(refresh,2200)},0)}catch(e){}
setTimeout(refresh,1100);setTimeout(refresh,3200);
try{if(!window.HLGB_UI_CLEANUP&&!document.querySelector('script[data-hlgb-ui-cleanup]')){const s=document.createElement('script');s.dataset.hlgbUiCleanup='1';s.src='./release-ui-cleanup.js?fresh='+Date.now();document.head.appendChild(s)}}catch(e){}
window.hlgbNotesQueueSource=queueSource;
window.hlgbNotesSyncLocal=syncLocal;
window.HLGB_NOTE_QUEUE_GUARD='v4';console.info('[HLGB] fila de notas v4: snapshot autoritativo impede oscilação temporária para zero');
})();