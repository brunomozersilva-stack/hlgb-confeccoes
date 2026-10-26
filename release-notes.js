/* HLGB stable module v6: fila de notas derivada + seleção estável da Projeção */
(function(){
'use strict';
const V='6-selection-stable';
const q=v=>Math.max(0,Number(v)||0),sid=v=>String(v??''),norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
const selected=window.hlgbProjectionSelectedKeys instanceof Set?window.hlgbProjectionSelectedKeys:new Set();
window.hlgbProjectionSelectedKeys=selected;
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
   if(!map||typeof map.get!=='function'||typeof map.keys!=='function'||typeof map[Symbol.iterator]!=='function'||Number(map.size||0)===0)return null;
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
        const z=src.authoritative?calculated:Math.max(calculated,q(sv.noteQueuedQty));
        if(q(sv.noteQueuedQty)!==z)o.projectionItems[k]={...sv,noteQueuedQty:z};
      }
    }
    return true;
  }catch(e){console.warn('[HLGB notes '+V+'] sync',e);return false}
}
function captureProjectionSelection(){
 try{document.querySelectorAll('#projectionProductsTable .projectionSelect').forEach(cb=>{if(cb.checked)selected.add(sid(cb.value))});return selected.size}catch(e){return selected.size}
}
function projectionRowVisible(cb){
 try{const tr=cb.closest('tr');if(!tr)return false;const s=getComputedStyle(tr);return s.display!=='none'&&s.visibility!=='hidden'&&tr.offsetParent!==null}catch(e){return true}
}
function bindProjectionSelection(){
 document.querySelectorAll('#projectionProductsTable .projectionSelect').forEach(cb=>{
  const key=sid(cb.value);
  if(cb.disabled){selected.delete(key);cb.checked=false}
  else cb.checked=selected.has(key);
  if(!cb.dataset.hlgbSelectionV6){cb.dataset.hlgbSelectionV6='1';cb.addEventListener('change',()=>{const k=sid(cb.value);if(cb.checked&&!cb.disabled)selected.add(k);else selected.delete(k)})}
 });
}
function selectAllVisible(){
 const boxes=[...document.querySelectorAll('#projectionProductsTable .projectionSelect')].filter(cb=>!cb.disabled&&projectionRowVisible(cb));
 boxes.forEach(cb=>{cb.checked=true;selected.add(sid(cb.value))});
 return boxes.length;
}
function clearSelection(){selected.clear();document.querySelectorAll('#projectionProductsTable .projectionSelect').forEach(cb=>{cb.checked=false});return true}
window.hlgbSelectAllProjectionVisible9412=selectAllVisible;
window.hlgbClearProjectionSelection9412=clearSelection;
function ensureSelectAllButton(){
 const table=document.getElementById('projectionProductsTable');if(!table)return false;
 const panel=table.closest('.panel'),toolbar=panel?.querySelector('.toolbar');if(!toolbar)return false;
 if(!toolbar.querySelector('#hlgbSelectAllProjection9412')){
   const b=document.createElement('button');b.type='button';b.id='hlgbSelectAllProjection9412';b.className='secondary';b.textContent='✓ Selecionar todos';b.onclick=()=>selectAllVisible();
   const clear=[...toolbar.querySelectorAll('button')].find(x=>/limpar sele/i.test(x.textContent||''));if(clear)toolbar.insertBefore(b,clear);else toolbar.appendChild(b);
 }
 return true;
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
        if(z>=remaining&&remaining>0){selected.delete(sid(cb.value));cb.checked=false;cb.disabled=true;cb.title='Quantidade já reservada na fila de Notas';}
      }
    });
    bindProjectionSelection();ensureSelectAllButton();
  }catch(e){console.warn('[HLGB notes '+V+'] decorate',e)}
}
function canRenderProjection(){
  if(window.__HLGB_AUTH_READY!==true)return false;
  try{
    const shell=document.getElementById('appShell');if(shell){const s=getComputedStyle(shell);if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0')return false}
    const table=document.getElementById('projectionProductsTable');if(!table)return false;
    const page=table.closest?.('.page');if(page)return page.classList.contains('active');
    const active=document.querySelector('.page.active');if(active)return active.contains(table);
    return table.offsetParent!==null;
  }catch(e){return false}
}
const oldClear=window.clearProjectionSelection;
window.clearProjectionSelection=function(){clearSelection();try{return typeof oldClear==='function'?oldClear.apply(this,arguments):true}catch(e){return true}};
const oldSend=window.sendProjectionToNotes9202;
if(typeof oldSend==='function'&&!oldSend.__hlgbNotesV6){const w=function(){captureProjectionSelection();syncLocal();return oldSend.apply(this,arguments)};w.__hlgbNotesV3=true;w.__hlgbNotesV4=true;w.__hlgbNotesV6=true;window.sendProjectionToNotes9202=w}
const oldRender=window.renderProjection;
if(typeof oldRender==='function'&&!oldRender.__hlgbNotesV6){
 const w=function(){
  if(!canRenderProjection())return false;
  captureProjectionSelection();const y=window.scrollY||window.pageYOffset||0,active=document.activeElement,activeId=active?.id||'';
  const r=oldRender.apply(this,arguments);
  const restore=()=>{decorateProjection();try{window.scrollTo(0,y)}catch(e){};if(activeId){try{document.getElementById(activeId)?.focus?.({preventScroll:true})}catch(e){}}};
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>requestAnimationFrame(restore));else setTimeout(restore,0);
  return r;
 };
 w.__hlgbNotesV3=true;w.__hlgbNotesV4=true;w.__hlgbNotesV5=true;w.__hlgbNotesV6=true;window.renderProjection=w
}
const oldIncoming=window.hlgbRenderIncomingRecord;
window.hlgbRenderIncomingRecord=function(module){
  const y=window.scrollY||0,r=typeof oldIncoming==='function'?oldIncoming.apply(this,arguments):undefined;
  if(['noteQueue','orders','projectionInvoices'].includes(module))setTimeout(()=>{if(!canRenderProjection())return;captureProjectionSelection();try{window.renderProjection?.()}catch(e){};try{decorateProjection()}catch(e){};try{window.scrollTo(0,y)}catch(e){}},40);
  return r;
};
function refresh(){if(!canRenderProjection())return false;captureProjectionSelection();const y=window.scrollY||0;try{window.renderProjection?.()}catch(e){};setTimeout(()=>{decorateProjection();try{window.scrollTo(0,y)}catch(e){}},40);return true}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(refresh,700);setTimeout(refresh,2200)},0)}catch(e){}
setTimeout(refresh,1100);setTimeout(refresh,3200);
try{if(!window.HLGB_UI_CLEANUP&&!document.querySelector('script[data-hlgb-ui-cleanup]')){const s=document.createElement('script');s.dataset.hlgbUiCleanup='1';s.src='./release-ui-cleanup.js?fresh='+Date.now();document.head.appendChild(s)}}catch(e){}
try{if(!document.querySelector('script[data-hlgb-note-document-v9412]')){const s=document.createElement('script');s.dataset.hlgbNoteDocumentV9412='1';s.src='./release-note-document-v9412.js?fresh='+Date.now();document.head.appendChild(s)}}catch(e){console.warn('[HLGB notes '+V+'] documento v94.12',e)}
try{if(!document.querySelector('script[data-hlgb-note-edit-v9414]')){const s=document.createElement('script');s.dataset.hlgbNoteEditV9414='1';s.src='./release-note-edit-v9414.js?fresh='+Date.now();document.head.appendChild(s)}}catch(e){console.warn('[HLGB notes '+V+'] edição v94.14',e)}
window.hlgbNotesQueueSource=queueSource;
window.hlgbNotesSyncLocal=syncLocal;
window.hlgbNotesCanRenderProjection=canRenderProjection;
window.hlgbNotesCaptureProjectionSelection=captureProjectionSelection;
window.HLGB_NOTE_QUEUE_RENDER_GUARD='v8-selection-stable';
window.HLGB_NOTE_QUEUE_GUARD='v6';console.info('[HLGB] fila de notas v6: seleção persistente, selecionar todos e rolagem estável');
})();