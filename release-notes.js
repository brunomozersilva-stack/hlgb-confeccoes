/* HLGB stable module v2: fila de notas reserva sem esconder o planejamento */
(function(){
'use strict';
const q=v=>Math.max(0,Number(v)||0),sid=v=>String(v??''),norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function activeQueues(orderId,item){
  const key=sid(item?.key||item?.productId),pid=sid(item?.productId);
  return arr('noteQueue').filter(x=>x&&sid(x.orderId)===sid(orderId)&&!['faturado','cancelado','cancelada'].includes(norm(x.status))&&q(x.remainingQty??x.qty)>0&&(sid(x.itemKey)===key||sid(x.productId)===pid));
}
function queued(orderId,item){return activeQueues(orderId,item).reduce((s,x)=>s+q(x.remainingQty??x.qty),0)}
function syncLocal(){
  try{
    for(const o of arr('orders')){
      if(!o)continue;o.projectionItems=o.projectionItems&&typeof o.projectionItems==='object'?o.projectionItems:{};
      const items=typeof window.projectionItemsForOrder==='function'?window.projectionItemsForOrder(o):[];
      for(const it of items){
        const k=sid(it.key||it.productId);if(!k)continue;
        const sv=o.projectionItems[k]||{},base=q(it.remainingQty!=null?it.remainingQty:it.qty),z=Math.min(base,queued(o.id,it));
        o.projectionItems[k]={...sv,noteQueuedQty:z};
      }
    }
    return true;
  }catch(e){console.warn('[HLGB notes v2] sync',e);return false}
}
function decorateProjection(){
  try{
    const table=document.getElementById('projectionProductsTable');if(!table)return;
    const heads=[...table.querySelectorAll('thead th')];
    let noteIndex=heads.findIndex(h=>norm(h.textContent)==='nota');if(noteIndex<0)noteIndex=8;
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const cb=tr.querySelector('.projectionSelect');if(!cb)return;
      const parts=String(cb.value||'').split('::'),o=arr('orders').find(x=>sid(x.id)===sid(parts[0]));if(!o)return;
      const item=(typeof window.projectionItemsForOrder==='function'?window.projectionItemsForOrder(o):[]).find(i=>sid(i.key)===sid(parts[1]));if(!item)return;
      const z=queued(o.id,item),cells=[...tr.children],cell=cells[noteIndex];
      tr.querySelectorAll('.hlgb-note-queued').forEach(x=>x.remove());
      if(z>0&&cell){
        const b=document.createElement('div');b.className='badge ok hlgb-note-queued';b.style.marginTop='4px';b.textContent='Na fila de Notas · '+z.toLocaleString('pt-BR')+' pç';cell.appendChild(b);
        const remaining=q(item.remainingQty!=null?item.remainingQty:item.qty);
        if(z>=remaining&&remaining>0){cb.checked=false;cb.disabled=true;cb.title='Quantidade já reservada na fila de Notas';}
      }
    });
  }catch(e){console.warn('[HLGB notes v2] decorate',e)}
}
const oldSend=window.sendProjectionToNotes9202;
if(typeof oldSend==='function'&&!oldSend.__hlgbNotesV2){const w=function(){syncLocal();return oldSend.apply(this,arguments)};w.__hlgbNotesV2=true;window.sendProjectionToNotes9202=w}
const oldRender=window.renderProjection;
if(typeof oldRender==='function'&&!oldRender.__hlgbNotesV2){const w=function(){syncLocal();const r=oldRender.apply(this,arguments);setTimeout(decorateProjection,0);return r};w.__hlgbNotesV2=true;window.renderProjection=w}
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
window.HLGB_NOTE_QUEUE_GUARD='v2';console.info('[HLGB] fila de notas preserva planejamento visível e bloqueia envio duplicado');
})();