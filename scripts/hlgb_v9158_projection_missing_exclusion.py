from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

if 'function projectionDeliverableQty(order,item)' in s:
    print('v91.58 projection shortage exclusion already applied')
    raise SystemExit(0)

def one(old,new,label):
    global s
    n=s.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 target, found {n}')
    s=s.replace(old,new,1)

# 1) Fonte única: saldo em "Peças faltantes" não é mercadoria prevista para sair.
anchor='''function projectionRemainingValue(item){
 return projectionRemainingQty(item)*projectionUnitForItem(item);
}
'''
helpers='''function projectionRemainingValue(item){
 return projectionRemainingQty(item)*projectionUnitForItem(item);
}
function projectionOpenMissingQty(order,item){
 const oid=String(order?.id??'').trim();
 const pid=String(item?.productId??'').trim();
 if(!oid||!pid)return 0;
 return (db.missingPieces||[]).reduce((sum,m)=>{
   if(String(m?.orderId??'').trim()!==oid)return sum;
   if(String(m?.productId??'').trim()!==pid)return sum;
   if(String(m?.issueType||'Peça faltante')!=='Peça faltante')return sum;
   return sum+Math.max(0,+m?.remainingQty||0);
 },0);
}
function projectionDeliverableQty(order,item){
 return Math.max(0,projectionRemainingQty(item)-projectionOpenMissingQty(order,item));
}
function projectionDeliverableValue(order,item){
 return projectionDeliverableQty(order,item)*projectionUnitForItem(item);
}
'''
one(anchor,helpers,'insert deliverable helpers')

# 2) Aba de acompanhamento: só mostra o que realmente ainda está previsto para entrega.
one(
''' let remaining=projectionRemainingQty(item),delivered=Math.max(0,(+item.qty||0)-remaining);''',
''' let rawRemaining=projectionRemainingQty(item),remaining=projectionDeliverableQty(o,item),delivered=Math.max(0,(+item.qty||0)-rawRemaining);''',
'change remaining date qty')
one(
''' let remainingRows=allProjectionRows().filter(({order:o,item})=>item.date&&item.date>=startS&&item.date<=endS&&projectionRemainingQty(item)>0&&projectionTrackingMatches(o,item.name));''',
''' let remainingRows=allProjectionRows().filter(({order:o,item})=>item.date&&item.date>=startS&&item.date<=endS&&projectionDeliverableQty(o,item)>0&&projectionTrackingMatches(o,item.name));''',
'delivery tracking filter')
one(
''' let plannedQty=remainingRows.reduce((a,x)=>a+projectionRemainingQty(x.item),0);
 let plannedValue=remainingRows.reduce((a,x)=>a+projectionRemainingValue(x.item),0);''',
''' let plannedQty=remainingRows.reduce((a,x)=>a+projectionDeliverableQty(x.order,x.item),0);
 let plannedValue=remainingRows.reduce((a,x)=>a+projectionDeliverableValue(x.order,x.item),0);''',
'delivery tracking totals')
one(
'''     let rem=projectionRemainingQty(item),done=Math.max(0,(+item.qty||0)-rem);
     let safeKey=String(item.key).replace(/'/g,"\\\\'");
     return [fmtDate(item.date),"#"+(typeof displayOrderNumber==="function"?displayOrderNumber(o):o.id),esc(o.client||"-"),esc(item.name||"-"),(+item.qty||0).toLocaleString("pt-BR"),done.toLocaleString("pt-BR"),`<strong>${rem.toLocaleString("pt-BR")}</strong>`,money(projectionRemainingValue(item)),`<button type="button" class="secondary" onclick="changeProjectionRemainingDate(${o.id},'${safeKey}')">📅 Mudar data do restante</button>`];''',
'''     let rawRem=projectionRemainingQty(item),rem=projectionDeliverableQty(o,item),done=Math.max(0,(+item.qty||0)-rawRem);
     let safeKey=String(item.key).replace(/'/g,"\\\\'");
     return [fmtDate(item.date),"#"+(typeof displayOrderNumber==="function"?displayOrderNumber(o):o.id),esc(o.client||"-"),esc(item.name||"-"),(+item.qty||0).toLocaleString("pt-BR"),done.toLocaleString("pt-BR"),`<strong>${rem.toLocaleString("pt-BR")}</strong>`,money(projectionDeliverableValue(o,item)),`<button type="button" class="secondary" onclick="changeProjectionRemainingDate(${o.id},'${safeKey}')">📅 Mudar data do restante</button>`];''',
'delivery tracking row')

# 3) Projeção principal: falta aberta deixa de ser "produto previsto para entrega".
one(
''' let scheduledBase=rows.filter(x=>x.item.date&&x.item.date>=startS&&x.item.date<=endS&&projectionRemainingQty(x.item)>0);''',
''' let scheduledBase=rows.filter(x=>x.item.date&&x.item.date>=startS&&x.item.date<=endS&&projectionDeliverableQty(x.order,x.item)>0);''',
'scheduled projection filter')
one(
''' let totalQty=scheduled.reduce((a,x)=>a+projectionRemainingQty(x.item),0);
 let totalValue=scheduled.reduce((a,x)=>a+projectionRemainingValue(x.item),0);''',
''' let totalQty=scheduled.reduce((a,x)=>a+projectionDeliverableQty(x.order,x.item),0);
 let totalValue=scheduled.reduce((a,x)=>a+projectionDeliverableValue(x.order,x.item),0);''',
'projection totals')
one(
'''     projectionRemainingQty(item).toLocaleString("pt-BR"),
     money(projectionRemainingValue(item)),''',
'''     projectionDeliverableQty(o,item).toLocaleString("pt-BR"),
     money(projectionDeliverableValue(o,item)),''',
'projection exit row')
one(
'''    let available=item.remainingQty!=null?item.remainingQty:Math.max(0,item.qty-(item.invoicedQty||0));''',
'''    let available=projectionDeliverableQty(o,item);''',
'products forecast available qty')
one(
'''   clients[k].qty+=item.qty;clients[k].value+=item.value||0;clients[k].products++;if(item.invoiced)clients[k].invoiced+=item.value||0;''',
'''   const deliverableQty=projectionDeliverableQty(o,item),deliverableValue=projectionDeliverableValue(o,item);
   clients[k].qty+=deliverableQty;clients[k].value+=deliverableValue;clients[k].products++;if(item.invoiced)clients[k].invoiced+=deliverableValue;''',
'client projection summary')

# 4) Nota pela projeção: nem o modal pode oferecer quantidade já classificada como falta.
old="let rows=selected.map((x,i)=>{let rem=x.item.remainingQty!=null?x.item.remainingQty:Math.max(0,x.item.qty-(x.item.invoicedQty||0)),unit="
new="let rows=selected.map((x,i)=>{let rem=projectionDeliverableQty(x.o,x.item),unit="
one(old,new,'invoice modal available qty')
old="available=ctx.item.remainingQty!=null?ctx.item.remainingQty:Math.max(0,ctx.item.qty-(ctx.item.invoicedQty||0)),unit="
new="available=projectionDeliverableQty(ctx.o,ctx.item),unit="
one(old,new,'invoice finalize available qty')

# 5) Versão.
s=s.replace('v91.57 Multiusuário','v91.58 Multiusuário')
s=s.replace('Versão v91.57','Versão v91.58')
s=s.replace('>v91.57<','>v91.58<')
s=s.replace("const VER955='91.57';","const VER955='91.58';",1)
s=s.replace('Segurança de gravação v91.57','Segurança de gravação v91.58')

p.write_text(s,encoding='utf-8')
print('v91.58 projection shortage exclusion applied')
