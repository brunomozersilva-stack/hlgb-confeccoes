from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# 1) Add explicit delivery tracking tabs to Projection.
anchor='''<div id="projectionProductsTable"></div>
</div>

<div class="panel">
<h2>Valor projetado por cliente</h2>'''
insert='''<div id="projectionProductsTable"></div>
</div>

<div class="panel" id="projectionDeliveryTrackingPanel">
<h2>📦 Entregas da projeção</h2>
<div class="sub">Acompanhe separadamente o que ainda falta entregar e o que já foi entregue. Entregas parciais vão sendo somadas automaticamente; o saldo restante pode ser reagendado sem alterar o histórico do que já saiu.</div>
<div id="projectionDeliverySummaryCards" class="cards"></div>
<div class="toolbar" style="margin-top:8px">
  <button type="button" id="projectionTabRemaining" class="primary" onclick="setProjectionDeliveryTab('remaining')">📋 Falta entregar</button>
  <button type="button" id="projectionTabDelivered" class="secondary" onclick="setProjectionDeliveryTab('delivered')">✅ Entregue</button>
</div>
<div id="projectionRemainingPane"><div id="projectionRemainingTable"></div></div>
<div id="projectionDeliveredPane" style="display:none"><div id="projectionDeliveredTable"></div></div>
</div>

<div class="panel">
<h2>Valor projetado por cliente</h2>'''
if anchor not in s:
    raise SystemExit('projection tracking HTML anchor not found')
s=s.replace(anchor,insert,1)

# 2) Helpers for remaining/delivered tracking + rescheduling only the outstanding balance.
fn_anchor='''function projectionProductionSplit(orderId,itemKey){'''
helpers=r'''function projectionRemainingQty(item){
 return Math.max(0,item?.remainingQty!=null?(+item.remainingQty||0):((+item?.qty||0)-(+item?.invoicedQty||0)));
}
function projectionUnitForItem(item){
 return (+item?.qty||0)>0?(+item?.value||0)/(+item?.qty||0):0;
}
function projectionRemainingValue(item){
 return projectionRemainingQty(item)*projectionUnitForItem(item);
}
function projectionDeliveredRows(startS="0000-01-01",endS="9999-12-31"){
 let out=[];
 (db.projectionInvoices||[]).forEach(inv=>{
   let date=String(inv.issueDate||inv.date||"").slice(0,10);
   if(!date||date<startS||date>endS)return;
   (inv.items||[]).forEach(it=>{
     let o=(db.orders||[]).find(x=>+x.id===+it.orderId)||null;
     out.push({invoice:inv,order:o,item:it,date,qty:+it.qty||0,value:+it.value||((+it.qty||0)*(+it.unitPrice||0))});
   });
 });
 return out;
}
function projectionTrackingMatches(order,productName){
 let clientF=(document.getElementById("projectionClientFilter")?.value||"").trim().toLowerCase();
 let productF=(document.getElementById("projectionProductFilter")?.value||"").trim().toLowerCase();
 let orderF=(document.getElementById("projectionOrderFilter")?.value||"").trim().toLowerCase();
 let displayNo=String(order?(typeof displayOrderNumber==="function"?displayOrderNumber(order):order.id):"").toLowerCase();
 if(clientF&&!String(order?.client||"").toLowerCase().includes(clientF))return false;
 if(productF&&!String(productName||"").toLowerCase().includes(productF))return false;
 if(orderF&&!displayNo.includes(orderF))return false;
 return true;
}
let projectionDeliveryTab="remaining";
function setProjectionDeliveryTab(tab){
 projectionDeliveryTab=tab==="delivered"?"delivered":"remaining";
 let rem=document.getElementById("projectionRemainingPane"),del=document.getElementById("projectionDeliveredPane");
 let br=document.getElementById("projectionTabRemaining"),bd=document.getElementById("projectionTabDelivered");
 if(rem)rem.style.display=projectionDeliveryTab==="remaining"?"block":"none";
 if(del)del.style.display=projectionDeliveryTab==="delivered"?"block":"none";
 if(br)br.className=projectionDeliveryTab==="remaining"?"primary":"secondary";
 if(bd)bd.className=projectionDeliveryTab==="delivered"?"primary":"secondary";
 renderProjectionDeliveryTracking();
}
function changeProjectionRemainingDate(orderId,itemKey){
 let o=(db.orders||[]).find(x=>+x.id===+orderId);if(!o)return;
 let item=projectionItemsForOrder(o).find(i=>String(i.key)===String(itemKey));if(!item)return;
 let remaining=projectionRemainingQty(item),delivered=Math.max(0,(+item.qty||0)-remaining);
 if(remaining<=0){alert("Este produto já foi entregue por completo.");return}
 openModal("Mudar data do restante",`
   <div class="grid">
    <div class="field"><label>Pedido</label><input value="#${typeof displayOrderNumber==="function"?displayOrderNumber(o):o.id}" disabled></div>
    <div class="field"><label>Cliente</label><input value="${esc(o.client||"")}" disabled></div>
    <div class="field"><label>Produto</label><input value="${esc(item.name||"")}" disabled></div>
    <div class="field"><label>Quantidade original</label><input value="${(+item.qty||0).toLocaleString("pt-BR")}" disabled></div>
    <div class="field"><label>Já entregue</label><input value="${delivered.toLocaleString("pt-BR")}" disabled></div>
    <div class="field"><label>Falta entregar</label><input value="${remaining.toLocaleString("pt-BR")}" disabled></div>
    <div class="field"><label>Data atual do restante</label><input value="${item.date?fmtDate(item.date):"-"}" disabled></div>
    <div class="field"><label>Nova data para o restante</label><input id="projectionRemainingNewDate" type="date" value="${item.date||isoDate(new Date())}"></div>
   </div>
   <div class="sub" style="margin:10px 0">Somente as ${remaining.toLocaleString("pt-BR")} peça(s) que ainda faltam serão movidas. O que já foi entregue permanece no histórico.</div>
   <button type="button" class="primary modalSave">💾 Salvar nova data do restante</button>`,()=>{
     let d=document.getElementById("projectionRemainingNewDate")?.value||"";
     if(!d){alert("Informe a nova data.");return}
     saveProjectionItemDate(o,item.key,d);
     o.projectionItems[item.key]={...(o.projectionItems[item.key]||{}),remainingRescheduledAt:isoDate(new Date())};
     closeModal();save();renderProjection();
   });
}
function renderProjectionDeliveryTracking(){
 let sEl=document.getElementById("projectionStart"),eEl=document.getElementById("projectionEnd");
 if(!sEl||!eEl)return;
 let startS=sEl.value||"0000-01-01",endS=eEl.value||"9999-12-31";
 let remainingRows=allProjectionRows().filter(({order:o,item})=>item.date&&item.date>=startS&&item.date<=endS&&projectionRemainingQty(item)>0&&projectionTrackingMatches(o,item.name));
 let deliveredRows=projectionDeliveredRows(startS,endS).filter(r=>projectionTrackingMatches(r.order,r.item.productName));
 let plannedQty=remainingRows.reduce((a,x)=>a+projectionRemainingQty(x.item),0);
 let plannedValue=remainingRows.reduce((a,x)=>a+projectionRemainingValue(x.item),0);
 let deliveredQty=deliveredRows.reduce((a,x)=>a+(+x.qty||0),0);
 let deliveredValue=deliveredRows.reduce((a,x)=>a+(+x.value||0),0);
 let cards=document.getElementById("projectionDeliverySummaryCards");
 if(cards)cards.innerHTML=`
   <div class="card"><small>Peças previstas / falta entregar</small><strong>${plannedQty.toLocaleString("pt-BR")}</strong></div>
   <div class="card"><small>Peças entregues no período</small><strong>${deliveredQty.toLocaleString("pt-BR")}</strong></div>
   <div class="card"><small>Valor previsto / falta entregar</small><strong>${money(plannedValue)}</strong></div>
   <div class="card"><small>Valor entregue no período</small><strong>${money(deliveredValue)}</strong></div>`;
 let remEl=document.getElementById("projectionRemainingTable");
 if(remEl)remEl.innerHTML=remainingRows.length?table(
   ["Data prevista","Pedido","Cliente","Produto","Original","Já entregue","Falta entregar","Valor restante","Ação"],
   remainingRows.slice().sort((a,b)=>String(a.item.date).localeCompare(String(b.item.date))).map(({order:o,item})=>{
     let rem=projectionRemainingQty(item),done=Math.max(0,(+item.qty||0)-rem);
     let safeKey=String(item.key).replace(/'/g,"\\'");
     return [fmtDate(item.date),"#"+(typeof displayOrderNumber==="function"?displayOrderNumber(o):o.id),esc(o.client||"-"),esc(item.name||"-"),(+item.qty||0).toLocaleString("pt-BR"),done.toLocaleString("pt-BR"),`<strong>${rem.toLocaleString("pt-BR")}</strong>`,money(projectionRemainingValue(item)),`<button type="button" class="secondary" onclick="changeProjectionRemainingDate(${o.id},'${safeKey}')">📅 Mudar data do restante</button>`];
   })
 ):'<div class="empty">Nada pendente para entregar neste período.</div>';
 let delEl=document.getElementById("projectionDeliveredTable");
 if(delEl)delEl.innerHTML=deliveredRows.length?table(
   ["Entregue / emissão","Nota","Pedido","Cliente","Produto","Qtd. entregue","Valor","Condição"],
   deliveredRows.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(r=>{
     let inv=r.invoice||{},cond=String(inv.terms||"-")+(inv.termsDetail?` — ${inv.termsDetail}`:"");
     return [fmtDate(r.date),"#"+String(inv.id||"-"),r.order?"#"+(typeof displayOrderNumber==="function"?displayOrderNumber(r.order):r.order.id):"-",esc(inv.client||r.order?.client||"-"),esc(r.item.productName||"-"),(+r.qty||0).toLocaleString("pt-BR"),money(+r.value||0),esc(cond)];
   })
 ):'<div class="empty">Nenhuma entrega registrada neste período.</div>';
 setProjectionDeliveryTabVisualOnly();
}
function setProjectionDeliveryTabVisualOnly(){
 let rem=document.getElementById("projectionRemainingPane"),del=document.getElementById("projectionDeliveredPane");
 let br=document.getElementById("projectionTabRemaining"),bd=document.getElementById("projectionTabDelivered");
 if(rem)rem.style.display=projectionDeliveryTab==="remaining"?"block":"none";
 if(del)del.style.display=projectionDeliveryTab==="delivered"?"block":"none";
 if(br)br.className=projectionDeliveryTab==="remaining"?"primary":"secondary";
 if(bd)bd.className=projectionDeliveryTab==="delivered"?"primary":"secondary";
}

'''
if fn_anchor not in s:
    raise SystemExit('projection helper anchor not found')
s=s.replace(fn_anchor,helpers+fn_anchor,1)

# 3) Keep only outstanding quantities in the forecast period; completed deliveries live in Entregue.
old='let scheduledBase=rows.filter(x=>x.item.date&&x.item.date>=startS&&x.item.date<=endS);'
new='let scheduledBase=rows.filter(x=>x.item.date&&x.item.date>=startS&&x.item.date<=endS&&projectionRemainingQty(x.item)>0);'
if old not in s:
    raise SystemExit('scheduledBase target not found')
s=s.replace(old,new,1)

# 4) Forecast totals must use only the outstanding balance, not the original full quantity after a partial delivery.
old=''' let totalValue=scheduled.reduce((a,x)=>a+(+x.item.value||0),0),totalQty=scheduled.reduce((a,x)=>a+(+x.item.qty||0),0);
 let invoicedValue=scheduled.filter(x=>x.item.invoiced).reduce((a,x)=>a+(+x.item.value||0),0),openQty=scheduled.filter(x=>!x.item.invoiced).reduce((a,x)=>a+(+x.item.qty||0),0);'''
new=''' let totalQty=scheduled.reduce((a,x)=>a+projectionRemainingQty(x.item),0);
 let totalValue=scheduled.reduce((a,x)=>a+projectionRemainingValue(x.item),0);
 let deliveredPeriodRows=projectionDeliveredRows(startS,endS).filter(r=>projectionTrackingMatches(r.order,r.item.productName));
 let invoicedValue=deliveredPeriodRows.reduce((a,x)=>a+(+x.value||0),0),openQty=totalQty;'''
if old not in s:
    raise SystemExit('projection totals target not found')
s=s.replace(old,new,1)

# 5) Forecast list shows the balance still to be delivered.
old='''     esc(item.name||"-"),
     (+item.qty||0).toLocaleString("pt-BR"),
     money(+item.value||0),
     esc(projectionLocationForOrder(o)||"Sem local"),'''
new='''     esc(item.name||"-"),
     projectionRemainingQty(item).toLocaleString("pt-BR"),
     money(projectionRemainingValue(item)),
     esc(projectionLocationForOrder(o)||"Sem local"),'''
if old not in s:
    raise SystemExit('projection exit row target not found')
s=s.replace(old,new,1)

# 6) Per-product action changes only the outstanding balance; keep an optional all-dates action.
old='''    noteStatus,`<button type="button" class="primary" onclick="openProjectionProductionSplit(${o.id},'${String(item.key).replace(/'/g,"\\\\'")}')">Dividir produção</button> <button type="button" class="secondary" onclick="changeProjectionDate(${o.id})">Mudar datas</button>`'''
new='''    noteStatus,`<button type="button" class="primary" onclick="openProjectionProductionSplit(${o.id},'${String(item.key).replace(/'/g,"\\\\'")}')">Dividir produção</button> <button type="button" class="secondary" onclick="changeProjectionRemainingDate(${o.id},'${String(item.key).replace(/'/g,"\\\\'")}')">Mudar data do restante</button> <button type="button" class="secondary" onclick="changeProjectionDate(${o.id})">Todas as datas</button>`'''
if old not in s:
    raise SystemExit('projection product action target not found')
s=s.replace(old,new,1)

# 7) Persist a delivery ledger on the projection item as well as the projection invoice.
old='''         ...saved,date:item.date,invoicedQty:newQty,invoiced:newQty>=item.qty,
         invoiceIds:[...((saved.invoiceIds)||[]),invoiceId]
       };'''
new='''         ...saved,date:item.date,invoicedQty:newQty,invoiced:newQty>=item.qty,
         invoiceIds:[...((saved.invoiceIds)||[]),invoiceId],
         deliveryHistory:[...((saved.deliveryHistory)||[]),{invoiceId,date:issueDate,qty}]
       };'''
if old not in s:
    raise SystemExit('delivery history target not found')
s=s.replace(old,new,1)

# 8) Render the new tracking panel whenever Projection refreshes.
old=''' drawClientChart(clientRows.map(([n,d])=>[n,{...d,orders:d.products}]));
}'''
new=''' drawClientChart(clientRows.map(([n,d])=>[n,{...d,orders:d.products}]));
 renderProjectionDeliveryTracking();
}'''
if old not in s:
    raise SystemExit('renderProjection tail target not found')
s=s.replace(old,new,1)

# 9) Version bump.
s=s.replace('v91.20 Multiusuário','v91.21 Multiusuário')
s=s.replace('Versão v91.20','Versão v91.21')
s=s.replace('>v91.20</small>','>v91.21</small>')

p.write_text(s,encoding='utf-8')
print('patched v91.21 projection delivery tracking')
