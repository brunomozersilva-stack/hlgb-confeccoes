/* HLGB stable module: fila de notas como reserva real da projeção */
(function(){
'use strict';
const q=v=>Math.max(0,Number(v)||0),sid=v=>String(v??'');
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function activeQueues(orderId,item){const key=sid(item?.key||item?.productId),pid=sid(item?.productId);return arr('noteQueue').filter(x=>x&&sid(x.orderId)===sid(orderId)&&String(x.status||'').toLowerCase()!=='faturado'&&q(x.remainingQty??x.qty)>0&&(sid(x.itemKey)===key||(!x.itemKey&&sid(x.productId)===pid)))}
function queued(orderId,item){return activeQueues(orderId,item).reduce((s,x)=>s+q(x.remainingQty??x.qty),0)}
function syncLocal(){try{for(const o of arr('orders')){if(!o)continue;o.projectionItems=o.projectionItems&&typeof o.projectionItems==='object'?o.projectionItems:{};const items=typeof window.projectionItemsForOrder==='function'?window.projectionItemsForOrder(o):[];for(const it of items){const k=sid(it.key||it.productId);if(!k)continue;const sv=o.projectionItems[k]||{},base=q(it.remainingQty!=null?it.remainingQty:it.qty),z=Math.min(base,queued(o.id,it));o.projectionItems[k]={...sv,noteQueuedQty:z}}}return true}catch(e){console.warn('[HLGB notes] sync',e);return false}}
const oldDeliver=window.projectionDeliverableQty;
if(typeof oldDeliver==='function'&&!oldDeliver.__hlgbNotes){const w=function(order,item){const base=q(oldDeliver.apply(this,arguments)),z=Math.min(base,queued(order?.id,item));return Math.max(0,base-z)};w.__hlgbNotes=true;window.projectionDeliverableQty=w}
const oldSend=window.sendProjectionToNotes9202;
if(typeof oldSend==='function'&&!oldSend.__hlgbNotes){const w=function(){syncLocal();return oldSend.apply(this,arguments)};w.__hlgbNotes=true;window.sendProjectionToNotes9202=w}
const oldRender=window.renderProjection;
if(typeof oldRender==='function'&&!oldRender.__hlgbNotes){const w=function(){syncLocal();return oldRender.apply(this,arguments)};w.__hlgbNotes=true;window.renderProjection=w}
const oldIncoming=window.hlgbRenderIncomingRecord;
window.hlgbRenderIncomingRecord=function(module){const r=typeof oldIncoming==='function'?oldIncoming.apply(this,arguments):undefined;if(module==='noteQueue'||module==='orders'||module==='projectionInvoices'){setTimeout(()=>{syncLocal();try{window.renderProjection?.()}catch(e){}},30)}return r};
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(()=>{syncLocal();try{window.renderProjection?.()}catch(e){}},900);setTimeout(syncLocal,2600)},0)}catch(e){}
window.HLGB_NOTE_QUEUE_GUARD='v1';console.info('[HLGB] fila de notas descontada da projeção');
})();