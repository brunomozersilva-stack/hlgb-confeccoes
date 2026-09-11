from pathlib import Path

src=Path('app9228.html')
out=Path('app9229.html')
s=src.read_text(encoding='utf-8')

addon=r'''<!-- HLGB_V9229_ORDERS_COMPACT_FINALIZE_START -->
<style>
#orderViewControls9229{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:10px 0 12px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:#fffafb}
#orderViewControls9229 .order-tabs9229{display:flex;gap:7px;flex-wrap:wrap}
#orderViewControls9229 .order-tab9229{border:1px solid #d9c4ce;background:#fff;padding:8px 12px;border-radius:999px;cursor:pointer;font-weight:700;color:#65505b}
#orderViewControls9229 .order-tab9229.active{background:#6f3f59;color:#fff;border-color:#6f3f59}
#orderViewControls9229 .order-page9229{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
#orderViewControls9229 select{padding:7px;border:1px solid #ccd2dc;border-radius:7px;background:#fff}
#orderPagerBottom9229{display:flex;justify-content:center;align-items:center;gap:8px;margin:14px 0 3px;flex-wrap:wrap}
#orderPagerBottom9229 button{min-width:90px}
.hlgb9229-final{background:#e9f7ef!important;color:#24643a!important}
</style>
<script>
(function(){
'use strict';
const q9229=v=>Math.max(0,+v||0);
const n9229=v=>String(v??'').trim().toLowerCase();
const clone9229=x=>{try{return structuredClone(x)}catch(e){return JSON.parse(JSON.stringify(x))}};
let mode9229='open',page9229=1,size9229=20,lastFilter9229='';

function baseItems9229(o){
  try{let a=typeof projectionItemsForOrder==='function'?(projectionItemsForOrder(o)||[]):[];if(a.length)return a.map(x=>({...x,key:String(x.key??x.productId??''),productId:x.productId??x.key??null,qty:q9229(x.qty)})).filter(x=>x.qty>0)}catch(e){}
  let m=new Map();(o?.grade||[]).forEach(g=>{let k=String(g?.productId||'legacy'),x=m.get(k)||{key:k,productId:g?.productId||null,name:'Produto',qty:0};x.qty+=q9229(g?.qty);m.set(k,x)});
  if(!m.size&&q9229(o?.qty||o?.totalQty)>0)m.set('legacy',{key:'legacy',productId:null,name:o?.items||'Pedido',qty:q9229(o?.qty||o?.totalQty)});
  return [...m.values()];
}
function sameProduct9229(row,item,o){
  const pid=String(item?.productId??item?.key??'');
  if(pid&&String(row?.productId??'')===pid)return true;
  if(!pid){let its=baseItems9229(o);return its.length===1}
  return false;
}
function deliveredForItem9229(o,item){
  const key=String(item?.key??item?.productId??''),pid=String(item?.productId??item?.key??'');
  const saved=o?.projectionItems?.[key]||o?.projectionItems?.[pid]||{};
  let byProjection=Math.max(q9229(item?.invoicedQty),q9229(saved?.invoicedQty));
  let hist=Array.isArray(saved?.deliveryHistory)?saved.deliveryHistory:[];if(hist.length)byProjection=Math.max(byProjection,hist.reduce((a,h)=>a+q9229(h?.qty),0));
  let byFaction=(db.factions||[]).filter(f=>String(f?.orderId??'')===String(o.id)&&sameProduct9229(f,item,o)).reduce((a,f)=>a+q9229(f?.done),0);
  let byNotes=(db.noteQueue||[]).filter(r=>String(r?.orderId??'')===String(o.id)&&sameProduct9229(r,item,o)&&n9229(r?.status)!=='cancelado').reduce((a,r)=>a+q9229(r?.qty??r?.originalQty),0);
  let byInvoices=0;(db.projectionInvoices||[]).forEach(inv=>(inv?.items||[]).forEach(it=>{if(String(it?.orderId??'')===String(o.id)&&sameProduct9229(it,item,o))byInvoices+=q9229(it?.qty)}));
  return Math.min(q9229(item.qty),Math.max(byProjection,byFaction,byNotes,byInvoices));
}
function fullyDelivered9229(o){
  if(!o||o.cancelled||n9229(o.status)==='cancelado')return false;
  const items=baseItems9229(o);if(!items.length)return n9229(o.status)==='pedido finalizado';
  return items.every(it=>q9229(it.qty)>0&&deliveredForItem9229(o,it)>=q9229(it.qty)-0.0001);
}
function final9229(o){return n9229(o?.status)==='pedido finalizado'||fullyDelivered9229(o)}
window.hlgbOrderFullyDelivered9229=fullyDelivered9229;

async function persistFinal9229(o){
  if(!o||n9229(o.status)==='pedido finalizado'||!fullyDelivered9229(o)||o.__finalizing9229)return;
  o.__finalizing9229=true;let next=clone9229(o);delete next.__finalizing9229;next.status='Pedido finalizado';next.deliveryFinalized=true;next.deliveryFinalizedAt=next.deliveryFinalizedAt||new Date().toISOString();next.updatedAt=new Date().toISOString();
  try{
    if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
    if(typeof window.hlgbRecordSaveWithRetry==='function'){
      let r=await window.hlgbRecordSaveWithRetry('orders',String(next.id),next,false);if(!r||r.applied===false)throw new Error(r?.reason||'Nuvem não confirmou o pedido');Object.assign(o,r.data||next);
    }else Object.assign(o,next);
    try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}
  }catch(e){console.warn('[HLGB 92.29] status final não confirmado',o.id,e)}finally{delete o.__finalizing9229}
}
function reconcileAll9229(){(db.orders||[]).forEach(o=>{if(fullyDelivered9229(o)&&n9229(o.status)!=='pedido finalizado')persistFinal9229(o)})}
window.hlgbReconcileOrdersDelivered9229=reconcileAll9229;

const oldStatus9229=window.hlgb930OrderStatus;
window.hlgb930OrderStatus=function(o){if(final9229(o))return 'Pedido finalizado';return typeof oldStatus9229==='function'?oldStatus9229(o):(o?.status||'-')};

function filterSignature9229(){return ['orderSearch','orderNumberFilter','orderStatusFilter','orderPriorityFilter','orderStartFilter','orderEndFilter'].map(id=>document.getElementById(id)?.value||'').join('|')}
function ensureControls9229(){
  let fs=document.getElementById('orderFilterSummary'),tbl=document.getElementById('ordersTable');if(!fs||!tbl)return null;
  let box=document.getElementById('orderViewControls9229');if(!box){box=document.createElement('div');box.id='orderViewControls9229';fs.insertAdjacentElement('afterend',box)}
  box.innerHTML=`<div class="order-tabs9229"><button type="button" class="order-tab9229 ${mode9229==='open'?'active':''}" onclick="hlgbSetOrderView9229('open')">📂 Em aberto</button><button type="button" class="order-tab9229 ${mode9229==='final'?'active':''}" onclick="hlgbSetOrderView9229('final')">✅ Finalizados</button><button type="button" class="order-tab9229 ${mode9229==='all'?'active':''}" onclick="hlgbSetOrderView9229('all')">Todos</button></div><div class="order-page9229"><span class="sub">Mostrar</span><select onchange="hlgbSetOrderPageSize9229(this.value)"><option value="15" ${size9229===15?'selected':''}>15</option><option value="20" ${size9229===20?'selected':''}>20</option><option value="30" ${size9229===30?'selected':''}>30</option><option value="50" ${size9229===50?'selected':''}>50</option></select><span class="sub">por página</span></div>`;
  return box;
}
window.hlgbSetOrderView9229=function(v){mode9229=['open','final','all'].includes(v)?v:'open';page9229=1;renderOrders()};
window.hlgbSetOrderPageSize9229=function(v){size9229=Math.max(10,+v||20);page9229=1;renderOrders()};
window.hlgbOrderPage9229=function(p){page9229=Math.max(1,+p||1);renderOrders();try{document.getElementById('orderViewControls9229')?.scrollIntoView({behavior:'smooth',block:'start'})}catch(e){}};

function matchesFilters9229(o){
  const q=n9229(document.getElementById('orderSearch')?.value||''),num=String(document.getElementById('orderNumberFilter')?.value||'').trim(),status=document.getElementById('orderStatusFilter')?.value||'',priority=document.getElementById('orderPriorityFilter')?.value||'',start=document.getElementById('orderStartFilter')?.value||'',end=document.getElementById('orderEndFilter')?.value||'',st=window.hlgb930OrderStatus(o);
  if(num&&!(String(typeof displayOrderNumber==='function'?displayOrderNumber(o):o.id).includes(num)||String(o.id||'').includes(num)))return false;
  let hay=n9229([o.client,o.items,typeof orderProductSummary==='function'?orderProductSummary(o):''].join(' '));if(q&&!hay.includes(q))return false;
  if(status&&st!==status&&String(o.status||'')!==status)return false;
  if(priority&&String(o.priority||'Padrão')!==priority)return false;
  let d=String(o.date||'').slice(0,10);if(start&&d<start)return false;if(end&&d>end)return false;
  return true;
}
function row9229(o){
  let st=window.hlgb930OrderStatus(o),assign=(o.clientId==null||Object.keys(o.productClientAssignments||{}).length)?` <button class="secondary" onclick="assignOrderProductsToClient(${o.id})">👤 Clientes por produto</button>`:'',prodDone=st==='Produção finalizada';
  let finalActions=o.workflowV9130&&prodDone?` <button class="primary" onclick="notaPronta(${o.id})">Nota</button> <button class="secondary" onclick="markOrderReadyForStock(${o.id})">📦 Pronta entrega</button>`:(!o.workflowV9130&&st!=='Pedido finalizado'?` <button class="secondary" onclick="notaPronta(${o.id})">Nota pronta</button>`:'');
  let cls=st==='Pedido finalizado'?'hlgb9229-final':'';
  return [typeof esc==='function'?esc(typeof displayOrderNumber==='function'?displayOrderNumber(o):o.id):String(o.id),typeof esc==='function'?esc(typeof hlgb930OrderClientLabel==='function'?hlgb930OrderClientLabel(o):(o.client||'-')):(o.client||'-'),o.date?new Date(o.date+'T12:00').toLocaleDateString('pt-BR'):'-',q9229(typeof qtyOfOrder==='function'?qtyOfOrder(o):(o.qty||o.totalQty)).toLocaleString('pt-BR'),typeof money==='function'?money(o.total):String(o.total||0),typeof priorityBadge==='function'?priorityBadge(o.priority||'Padrão'):(o.priority||'Padrão'),`<span class="badge ${cls}">${typeof esc==='function'?esc(st):st}</span>${typeof timeline930==='function'?timeline930(o):''}`,`<button class="secondary" onclick="editOrder(${o.id})">Editar</button>${st!=='Pedido finalizado'?assign+' <button class="secondary" onclick="registerMissingPieces('+o.id+')">⚠️ Faltas</button>'+finalActions:''} <button class="danger" onclick="moveOrderToTrash(${o.id})">Excluir</button>`];
}
window.renderOrders=function(){
  try{if(typeof ensureOrderNumbers==='function')ensureOrderNumbers();if(typeof fillSeparationOrders==='function')fillSeparationOrders()}catch(e){}
  reconcileAll9229();
  const sig=filterSignature9229();if(sig!==lastFilter9229){lastFilter9229=sig;page9229=1}
  let filtered=(db.orders||[]).filter(matchesFilters9229),closedAll=filtered.filter(final9229),cancelled=filtered.filter(o=>n9229(o.status)==='cancelado'||o.cancelled),openAll=filtered.filter(o=>!final9229(o)&&!cancelled.includes(o));
  let arr=mode9229==='final'?closedAll:(mode9229==='all'?filtered:openAll);arr=arr.slice().sort((a,b)=>(+(typeof displayOrderNumber==='function'?displayOrderNumber(b):b.id)||0)-(+(typeof displayOrderNumber==='function'?displayOrderNumber(a):a.id)||0));
  const pages=Math.max(1,Math.ceil(arr.length/size9229));if(page9229>pages)page9229=pages;const start=(page9229-1)*size9229,shown=arr.slice(start,start+size9229);
  let qty=arr.reduce((a,o)=>a+q9229(typeof qtyOfOrder==='function'?qtyOfOrder(o):(o.qty||o.totalQty)),0),value=arr.reduce((a,o)=>a+q9229(o.total),0),cards=document.getElementById('orderSummaryCards');
  if(cards)cards.innerHTML=`<div class="card"><small>${mode9229==='open'?'Pedidos em aberto':mode9229==='final'?'Pedidos finalizados':'Pedidos encontrados'}</small><strong>${arr.length}</strong></div><div class="card"><small>Peças desta visão</small><strong>${qty.toLocaleString('pt-BR')}</strong></div><div class="card"><small>Valor desta visão</small><strong>${typeof money==='function'?money(value):value.toFixed(2)}</strong></div><div class="card"><small>Finalizados encontrados</small><strong>${closedAll.length}</strong></div>`;
  let fs=document.getElementById('orderFilterSummary');if(fs)fs.textContent=`${arr.length} pedido(s) nesta visão. Exibindo ${shown.length?start+1:0}–${Math.min(start+shown.length,arr.length)}. Use a busca acima para localizar pedidos antigos sem aumentar a página.`;
  ensureControls9229();
  let nextEl=document.getElementById('nextOrderNumber');if(nextEl&&document.activeElement!==nextEl&&typeof nextAvailableOrderNumber==='function')nextEl.value=nextAvailableOrderNumber();
  let tbl=document.getElementById('ordersTable')||window.ordersTable;if(tbl)tbl.innerHTML=shown.length?(typeof table==='function'?table(['Nº pedido','Cliente','Entrega','Qtd.','Valor','Prioridade','Etapa atual','Ações'],shown.map(row9229)):''):'<div class="empty">Nenhum pedido encontrado nesta visão.</div>';
  let pager=document.getElementById('orderPagerBottom9229');if(!pager){pager=document.createElement('div');pager.id='orderPagerBottom9229';tbl?.insertAdjacentElement('afterend',pager)}
  if(pager)pager.innerHTML=`<button type="button" class="secondary" ${page9229<=1?'disabled':''} onclick="hlgbOrderPage9229(${page9229-1})">← Anterior</button><span class="sub">Página <b>${page9229}</b> de <b>${pages}</b> · ${arr.length} pedido(s)</span><button type="button" class="secondary" ${page9229>=pages?'disabled':''} onclick="hlgbOrderPage9229(${page9229+1})">Próxima →</button>`;
};

const oldIncoming9229=window.hlgbRenderIncomingRecord;
window.hlgbRenderIncomingRecord=function(module){let r=oldIncoming9229?oldIncoming9229.apply(this,arguments):undefined;if(['orders','factions','noteQueue','projectionInvoices'].includes(module))setTimeout(()=>{try{reconcileAll9229();if(document.querySelector('#pedidos.page.active'))renderOrders()}catch(e){}},100);return r};
const oldPage9229=window.page;if(typeof oldPage9229==='function')window.page=function(id){let r=oldPage9229.apply(this,arguments);if(String(id)==='pedidos')setTimeout(()=>{reconcileAll9229();renderOrders()},120);return r};
function stamp9229(){try{document.title='HLGB Confecções — Sistema de Gestão v92.29 Multiusuário'}catch(e){}const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v92.29'}
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(()=>{reconcileAll9229();try{renderOrders()}catch(e){}},700);[900,3200,5200,7600,10500,12500].forEach(ms=>setTimeout(stamp9229,ms))},0);else [900,3200,5200,7600,10500,12500].forEach(ms=>setTimeout(stamp9229,ms));
console.log('[HLGB] v92.29 pedidos compactos, paginação e finalização automática por entrega');
})();
</script>
<!-- HLGB_V9229_ORDERS_COMPACT_FINALIZE_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('<title>HLGB Confecções — Sistema de Gestão v92.28 Multiusuário</title>','<title>HLGB Confecções — Sistema de Gestão v92.29 Multiusuário</title>',1)
out.write_text(s,encoding='utf-8')
Path('abrir.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.29</title><script>(function(){window.location.replace('./app9229.html?v=92.29&fresh='+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>''',encoding='utf-8')
print('v92.29 preparada')
