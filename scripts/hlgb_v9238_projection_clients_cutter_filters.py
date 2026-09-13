from pathlib import Path

src=Path('app9237.html')
out=Path('app9238.html')
s=src.read_text(encoding='utf-8').replace('v92.37','v92.38')

addon=r'''<!-- HLGB_V9238_PROJECTION_CLIENTS_CUTTER_FILTERS_START -->
<style>
.hlgb9238-cut-filter{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:8px 0;padding:6px 8px;border:1px solid var(--line);border-radius:9px;background:#fffafb;width:max-content;max-width:100%}
.hlgb9238-cut-filter span{font-size:11px;font-weight:700;color:#6f3f59}
.hlgb9238-cut-filter select,.hlgb9238-cut-filter input{height:30px;padding:3px 7px;border:1px solid #d8ccd2;border-radius:7px;background:#fff;font-size:11px;width:auto}
.hlgb9238-cut-filter button{height:30px;padding:4px 8px;font-size:11px}
.hlgb9238-client-lines{font-size:12px;line-height:1.35}.hlgb9238-client-lines b{color:#6f3f59}
</style>
<script>
(function(){
function q9238(v){return Math.max(0,+v||0)}
function n9238(v){return String(v??'').trim().toLowerCase()}
function esc9238(v){return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function currentClient9238(o,item){
  const pid=String(item?.productId??item?.key??''), key=String(item?.key??item?.itemKey??pid);
  const saved=o?.projectionItems?.[key]||o?.projectionItems?.[pid]||{};
  const allocs=Array.isArray(saved.clientAllocations)?saved.clientAllocations.filter(a=>q9238(a?.qty)>0):[];
  if(allocs.length)return allocs.map(a=>({clientId:a.clientId??null,clientName:a.clientName||'Sem cliente',qty:q9238(a.qty)}));
  const a=o?.productClientAssignments?.[pid]||null;
  return [{clientId:a?.clientId??item?.clientId??o?.clientId??null,clientName:a?.clientName||item?.clientName||o?.client||'Sem cliente',qty:null}];
}
function match9238(o,item,clientName){
  const cf=n9238(document.getElementById('projectionClientFilter')?.value),pf=n9238(document.getElementById('projectionProductFilter')?.value),of=n9238(document.getElementById('projectionOrderFilter')?.value);
  const no=n9238(o?(typeof displayOrderNumber==='function'?displayOrderNumber(o):o.id):'');
  if(cf&&!n9238(clientName).includes(cf))return false;
  if(pf&&!n9238(item?.name||item?.productName).includes(pf))return false;
  if(of&&!no.includes(of))return false;
  return true;
}
function invoiceDelivered9238(o,item,client){
  let sum=0;
  (db.projectionInvoices||[]).forEach(inv=>(inv?.items||[]).forEach(it=>{
    if(String(it?.orderId??'')!==String(o?.id??''))return;
    const ip=String(it?.productId??it?.itemKey??''), p=String(item?.productId??item?.key??'');if(ip&&p&&ip!==p)return;
    const iid=String(it?.clientId??inv?.clientId??''), iname=n9238(it?.clientName||inv?.client||'');
    const cid=String(client?.clientId??''), cname=n9238(client?.clientName||'');
    if(cid?(iid===cid):(cname&&iname===cname))sum+=q9238(it?.qty);
  }));
  return sum;
}
function splitRemaining9238(o,item){
  const total=q9238(typeof projectionDeliverableQty==='function'?projectionDeliverableQty(o,item):item?.remainingQty);
  const clients=currentClient9238(o,item);
  if(clients.length===1&&clients[0].qty==null){
    const raw=q9238(typeof projectionRemainingQty==='function'?projectionRemainingQty(item):item?.remainingQty),done=Math.max(0,q9238(item?.qty)-raw);
    return [{...clients[0],original:q9238(item?.qty),done,remaining:total}];
  }
  let left=total,out=[];
  clients.forEach(c=>{
    const already=invoiceDelivered9238(o,item,c),target=Math.max(0,q9238(c.qty)-already),rem=Math.min(left,target);left=Math.max(0,left-rem);
    out.push({...c,original:q9238(c.qty),done:Math.max(0,q9238(c.qty)-rem),remaining:rem});
  });
  if(left>0){
    const a=o?.productClientAssignments?.[String(item?.productId??item?.key??'')]||null;
    out.push({clientId:a?.clientId??o?.clientId??null,clientName:a?.clientName||item?.clientName||o?.client||'Sem cliente',original:left,done:0,remaining:left,residual:true});
  }
  return out.filter(x=>x.remaining>0||x.done>0);
}

window.renderProjectionDeliveryTracking=function(){
  const sEl=document.getElementById('projectionStart'),eEl=document.getElementById('projectionEnd');if(!sEl||!eEl)return;
  const startS=sEl.value||'0000-01-01',endS=eEl.value||'9999-12-31';
  let remaining=[];
  (typeof allProjectionRows==='function'?allProjectionRows():[]).forEach(({order:o,item})=>{
    if(!item?.date||item.date<startS||item.date>endS||q9238(projectionDeliverableQty(o,item))<=0)return;
    splitRemaining9238(o,item).forEach(part=>{if(part.remaining>0&&match9238(o,item,part.clientName))remaining.push({o,item,part})});
  });
  const delivered=(typeof projectionDeliveredRows==='function'?projectionDeliveredRows(startS,endS):[]).filter(r=>{
    const client=r.item?.clientName||r.invoice?.client||r.order?.client||'Sem cliente';return match9238(r.order,{name:r.item?.productName},client);
  });
  const plannedQty=remaining.reduce((a,x)=>a+q9238(x.part.remaining),0),plannedValue=remaining.reduce((a,x)=>a+q9238(x.part.remaining)*(q9238(x.item?.qty)?q9238(x.item?.value)/q9238(x.item?.qty):0),0);
  const deliveredQty=delivered.reduce((a,x)=>a+q9238(x.qty),0),deliveredValue=delivered.reduce((a,x)=>a+q9238(x.value),0);
  const cards=document.getElementById('projectionDeliverySummaryCards');if(cards)cards.innerHTML=`<div class="card"><small>Peças previstas / falta entregar</small><strong>${plannedQty.toLocaleString('pt-BR')}</strong></div><div class="card"><small>Peças entregues no período</small><strong>${deliveredQty.toLocaleString('pt-BR')}</strong></div><div class="card"><small>Valor previsto / falta entregar</small><strong>${money(plannedValue)}</strong></div><div class="card"><small>Valor entregue no período</small><strong>${money(deliveredValue)}</strong></div>`;
  const rem=document.getElementById('projectionRemainingTable');if(rem)rem.innerHTML=remaining.length?table(['Data prevista','Pedido','Cliente','Produto','Original','Já entregue','Falta entregar','Valor restante','Ação'],remaining.sort((a,b)=>String(a.item.date).localeCompare(String(b.item.date))).map(x=>{const safe=String(x.item.key).replace(/'/g,"\\'");const unit=q9238(x.item.qty)?q9238(x.item.value)/q9238(x.item.qty):0;return [fmtDate(x.item.date),'#'+(typeof displayOrderNumber==='function'?displayOrderNumber(x.o):x.o.id),esc9238(x.part.clientName),esc9238(x.item.name||'-'),q9238(x.part.original).toLocaleString('pt-BR'),q9238(x.part.done).toLocaleString('pt-BR'),`<strong>${q9238(x.part.remaining).toLocaleString('pt-BR')}</strong>`,money(q9238(x.part.remaining)*unit),`<button type="button" class="secondary" onclick="changeProjectionRemainingDate(${x.o.id},'${safe}')">📅 Mudar data do restante</button>`]})):'<div class="empty">Nada pendente para entregar neste período.</div>';
  const del=document.getElementById('projectionDeliveredTable');if(del)del.innerHTML=delivered.length?table(['Entregue / emissão','Nota','Pedido','Cliente','Produto','Qtd. entregue','Valor','Condição'],delivered.sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(r=>{const inv=r.invoice||{},cond=String(inv.terms||'-')+(inv.termsDetail?` — ${inv.termsDetail}`:'');return [fmtDate(r.date),'#'+String(inv.id||'-'),r.order?'#'+(typeof displayOrderNumber==='function'?displayOrderNumber(r.order):r.order.id):'-',esc9238(r.item?.clientName||inv.client||r.order?.client||'-'),esc9238(r.item?.productName||'-'),q9238(r.qty).toLocaleString('pt-BR'),money(q9238(r.value)),esc9238(cond)]})):'<div class="empty">Nenhuma entrega registrada neste período.</div>';
  if(typeof setProjectionDeliveryTabVisualOnly==='function')setProjectionDeliveryTabVisualOnly();
};

function enhanceTopClients9238(){
  document.querySelectorAll('#projectionProductsTable tbody tr').forEach(tr=>{
    const cb=tr.querySelector('.projectionSelect');if(!cb)return;const [oid,key]=String(cb.value||'').split('::'),o=(db.orders||[]).find(x=>String(x.id)===String(oid));if(!o)return;
    const item=(typeof projectionItemsForOrder==='function'?projectionItemsForOrder(o):[]).find(i=>String(i.key)===String(key));if(!item)return;
    const cs=currentClient9238(o,item),cell=tr.children[2];if(!cell)return;
    if(cs.some(x=>x.qty!=null))cell.innerHTML=`<div class="hlgb9238-client-lines">${cs.map(x=>`<div><b>${esc9238(x.clientName)}</b>${x.qty!=null?` · ${q9238(x.qty).toLocaleString('pt-BR')} pç`:''}</div>`).join('')}</div>`;
  });
}
const oldProjection9238=window.renderProjection;
if(typeof oldProjection9238==='function')window.renderProjection=function(){const r=oldProjection9238.apply(this,arguments);setTimeout(()=>{enhanceTopClients9238();try{window.renderProjectionDeliveryTracking()}catch(e){console.error(e)}},0);return r};

window.hlgbCutterStatus9238='';window.hlgbCutterDate9238='';
function cutFilter9238(c){
  const st=n9238(c?.status),f=window.hlgbCutterStatus9238,d=window.hlgbCutterDate9238,day=String(c?.plannedCutDate||c?.finishedAt||c?.date||'').slice(0,10),done=st==='finalizado';
  if(d&&day!==d)return false;if(f==='open'&&done)return false;if(f==='done'&&!done)return false;if(f==='production'&&!st.includes('atendido por produção'))return false;return true;
}
function ensureCutterFilter9238(){
  const panel=document.getElementById('hlgbCutterExcelPanel9179'),anchor=document.getElementById('hlgbCutterExcel9179');if(!panel||!anchor)return;
  let box=document.getElementById('hlgbCutterFilter9238');if(!box){box=document.createElement('div');box.id='hlgbCutterFilter9238';box.className='hlgb9238-cut-filter';anchor.insertAdjacentElement('beforebegin',box)}
  box.innerHTML=`<span>Filtro rápido</span><select onchange="hlgbSetCutterFilter9238('status',this.value)"><option value="" ${!window.hlgbCutterStatus9238?'selected':''}>Todos</option><option value="open" ${window.hlgbCutterStatus9238==='open'?'selected':''}>A cortar</option><option value="done" ${window.hlgbCutterStatus9238==='done'?'selected':''}>Finalizados</option><option value="production" ${window.hlgbCutterStatus9238==='production'?'selected':''}>Atendido produção</option></select><input type="date" value="${window.hlgbCutterDate9238||''}" onchange="hlgbSetCutterFilter9238('date',this.value)" title="Filtrar por data"><button type="button" class="secondary" onclick="hlgbClearCutterFilter9238()">Limpar</button>`;
}
window.hlgbSetCutterFilter9238=function(field,value){if(field==='status')window.hlgbCutterStatus9238=value||'';if(field==='date'){window.hlgbCutterDate9238=value||'';if(value&&typeof hlgbSetCutterWeek9179==='function'){hlgbSetCutterWeek9179(value);return}}if(typeof hlgbRenderCutterExcel9179==='function')hlgbRenderCutterExcel9179()};
window.hlgbClearCutterFilter9238=function(){window.hlgbCutterStatus9238='';window.hlgbCutterDate9238='';if(typeof hlgbRenderCutterExcel9179==='function')hlgbRenderCutterExcel9179()};
const oldCutter9238=window.hlgbRenderCutterExcel9179;
if(typeof oldCutter9238==='function')window.hlgbRenderCutterExcel9179=function(){const full=db.cuts;db.cuts=(Array.isArray(full)?full:[]).filter(cutFilter9238);try{return oldCutter9238.apply(this,arguments)}finally{db.cuts=full;setTimeout(ensureCutterFilter9238,0)}};

function stamp9238(){const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v92.38';document.title='HLGB Confecções — Sistema de Gestão v92.38 Multiusuário'}
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(()=>{stamp9238();enhanceTopClients9238();ensureCutterFilter9238()},700);[3000,6500,11000,14000].forEach(t=>setTimeout(stamp9238,t))},0);else setTimeout(stamp9238,1000);
})();
</script>
<!-- HLGB_V9238_PROJECTION_CLIENTS_CUTTER_FILTERS_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('body não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
out.write_text(s,encoding='utf-8')
Path('abrir.html').write_text('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.38</title><script>(function(){window.location.replace(\'./app9238.html?v=92.38&fresh=\'+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>',encoding='utf-8')
print('v92.38 preparada')
