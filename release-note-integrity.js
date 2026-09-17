/* HLGB audit guard v1: integridade das notas migradas e bloqueio de fila excedente */
(function(){
'use strict';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const KNOWN_MIGRATED_9223=new Set([
'1788874475152333','1788874522423544','1788874542096539','1788874889299282','1788874924647632',
'1788978362128883','1789038304155523','1789038339322457','1789038421886580','1789038586467975',
'1789038616478193','1789038657141291','1789038710850339','1789038724881934','1789038757238922',
'1789038788431611','1789038828506727','1789063942527458','1789063987933758'
]);
function arr(name){try{return Array.isArray(db?.[name])?db[name]:[]}catch(e){return []}}
function legacyShadowIds(){
 const out=new Set(KNOWN_MIGRATED_9223);
 for(const row of arr('noteQueue')){const m=sid(row?.id).match(/^m9223-(\d+)-\d+$/);if(m)out.add(m[1])}
 return out;
}
function isLegacyDeliveryShadow(inv){
 if(!inv)return false;
 if(legacyShadowIds().has(sid(inv.id)))return true;
 if(inv.migratedToNoteQueueV9223===true)return true;
 return (Array.isArray(inv.items)?inv.items:[]).some(i=>sid(i?.source)==='faction_delivery_v9140');
}
function canonicalInvoices(){return arr('projectionInvoices').filter(x=>!isLegacyDeliveryShadow(x))}
function withCanonicalInvoices(fn,ctx,args){
 const full=arr('projectionInvoices'),filtered=full.filter(x=>!isLegacyDeliveryShadow(x));
 if(filtered.length===full.length)return fn.apply(ctx,args||[]);
 let changed=false;try{db.projectionInvoices=filtered;changed=true;return fn.apply(ctx,args||[])}finally{if(changed)db.projectionInvoices=full}
}
function patchRenderer(name){
 const fn=window[name];if(typeof fn!=='function'||fn.__hlgbNoteIntegrityV1)return;
 const w=function(){return withCanonicalInvoices(fn,this,arguments)};w.__hlgbNoteIntegrityV1=true;w.__original=fn;window[name]=w;
}
function shadowIdFromRow(tr){
 const b=tr?.querySelector?.('[data-acerto9214]');if(b)return sid(b.getAttribute('data-acerto9214'));
 const btns=[...(tr?.querySelectorAll?.('button')||[])];
 for(const x of btns){const m=sid(x.getAttribute?.('onclick')).match(/openProjectionAcerto9200\(['\"]([^'\"]+)/);if(m)return m[1]}
 return '';
}
function cleanRenderedHistory(){
 const shadows=legacyShadowIds();
 for(const boxId of ['projectionNotes9214','projectionNotes9200']){
  const box=document.getElementById(boxId);if(!box)continue;
  box.querySelectorAll('tbody tr').forEach(tr=>{const id=shadowIdFromRow(tr);if(id&&shadows.has(id))tr.remove()});
 }
 const legacy=document.getElementById('legacyNotes9223');if(legacy){legacy.style.setProperty('display','none','important');legacy.setAttribute('aria-hidden','true')}
 const info=document.querySelector('#hlgbNotesHistoryHostPanel9215 > .sub');
 if(info)info.textContent='Uma única lista das notas realmente feitas. Entregas antigas já migradas para a fila atual não são repetidas aqui.';
}
function productQtyInOrder(order,pid){
 if(!order||!pid)return 0;
 const grade=Array.isArray(order.grade)?order.grade:[];
 return grade.filter(g=>sid(g?.productId)===sid(pid)).reduce((s,g)=>s+q(g?.qty),0);
}
function expectedForQueue(row){
 const pid=sid(row?.productId||row?.itemKey);if(!pid)return null;
 const refs=[row?.orderId,row?.readyOrderId,row?.sourceOrderId].map(sid).filter(Boolean);
 for(const id of refs){const o=arr('orders').find(x=>sid(x?.id)===id);const expected=productQtyInOrder(o,pid);if(expected>0)return {orderId:id,productId:pid,expected}}
 return null;
}
function activeQueueRows(){return arr('noteQueue').filter(x=>x&&!['faturado','cancelado','cancelada'].includes(norm(x.status))&&q(x.remainingQty??x.qty)>0)}
function queueOverages(){
 const groups=new Map();
 for(const row of activeQueueRows()){
  const e=expectedForQueue(row);if(!e)continue;
  const key=e.orderId+'::'+e.productId,cur=groups.get(key)||{...e,queued:0,ids:[],productName:row.productName||''};
  cur.queued+=q(row.remainingQty??row.qty);cur.ids.push(sid(row.id));groups.set(key,cur);
 }
 return [...groups.values()].filter(x=>x.queued>x.expected+0.000001);
}
function unsafeQueueIds(){const s=new Set();queueOverages().forEach(g=>g.ids.forEach(id=>s.add(id)));return s}
function decorateQueueSafety(){
 const unsafe=unsafeQueueIds(),groups=queueOverages(),byId=new Map();groups.forEach(g=>g.ids.forEach(id=>byId.set(id,g)));
 document.querySelectorAll('.nqSelect9202').forEach(cb=>{
  const id=sid(cb.value),tr=cb.closest('tr'),old=tr?.querySelector('.hlgb-note-integrity-warning');if(old)old.remove();
  if(!unsafe.has(id)){cb.disabled=false;if(cb.dataset.hlgbIntegrityTitle){cb.title=cb.dataset.hlgbIntegrityTitle;delete cb.dataset.hlgbIntegrityTitle}return}
  if(!cb.dataset.hlgbIntegrityTitle)cb.dataset.hlgbIntegrityTitle=cb.title||'';cb.checked=false;cb.disabled=true;cb.title='Bloqueado: a fila deste produto ultrapassa a quantidade do pedido.';
  try{window.hlgbSelectedNotes9235?.delete?.(id)}catch(e){}
  const g=byId.get(id),cell=tr?.children?.[2];if(cell&&g){const b=document.createElement('div');b.className='badge bad hlgb-note-integrity-warning';b.style.marginTop='4px';b.textContent='⚠ Conferir duplicidade: fila '+g.queued.toLocaleString('pt-BR')+' / pedido '+g.expected.toLocaleString('pt-BR')+' pç';cell.appendChild(b)}
 });
}
function patchGroup(){
 const fn=window.groupNote9202;if(typeof fn!=='function'||fn.__hlgbNoteIntegrityV1)return;
 const w=function(){
  const unsafe=unsafeQueueIds(),checked=[...document.querySelectorAll('.nqSelect9202:checked')].map(x=>sid(x.value));
  if(checked.some(id=>unsafe.has(id))){alert('Esta montagem foi bloqueada porque a fila contém quantidade maior que o pedido. Confira as entregas duplicadas antes de criar a nota.');return false}
  return fn.apply(this,arguments);
 };w.__hlgbNoteIntegrityV1=true;w.__original=fn;window.groupNote9202=w;
}
function apply(){patchRenderer('renderNotes9200');patchRenderer('renderNotes9214');patchGroup();cleanRenderedHistory();decorateQueueSafety()}
const css=document.createElement('style');css.id='hlgb-note-integrity-style';css.textContent='#legacyNotes9223{display:none!important}';document.head.appendChild(css);
let timer=null;const mo=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(apply,20)});try{mo.observe(document.documentElement,{childList:true,subtree:true})}catch(e){}
const oldIncoming=window.hlgbRenderIncomingRecord;
if(typeof oldIncoming==='function'&&!oldIncoming.__hlgbNoteIntegrityV1){const w=function(module){const r=oldIncoming.apply(this,arguments);if(['noteQueue','projectionInvoices','orders'].includes(module))setTimeout(apply,30);return r};w.__hlgbNoteIntegrityV1=true;window.hlgbRenderIncomingRecord=w}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>[100,700,1800,3500].forEach(ms=>setTimeout(apply,ms)),0)}catch(e){}
[50,500,1500,3200].forEach(ms=>setTimeout(apply,ms));
window.hlgbNoteLegacyShadowIds=legacyShadowIds;
window.hlgbCanonicalProjectionInvoices=canonicalInvoices;
window.hlgbNoteQueueOverages=queueOverages;
window.hlgbNoteUnsafeQueueIds=unsafeQueueIds;
window.HLGB_NOTE_INTEGRITY_GUARD='v1';
console.info('[HLGB] integridade de notas: histórico migrado deduplicado e filas excedentes bloqueadas');
})();