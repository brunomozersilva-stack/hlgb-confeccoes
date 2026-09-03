from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

old_field='''      <div class="field"><label>Cliente que vai receber esta nota</label><select id="projectionInvoiceClient" onchange="updateProjectionInvoiceClientPrices()">${clientOptions}</select><div class="sub">Pode escolher outro cliente sem alterar o pedido original.</div></div>\n      <div class="field"><label>Vencimento</label><input id="projectionInvoiceDue" type="date" value="${selected[0]?.item.date||isoDate(new Date())}"></div>'''
new_field='''      <div class="field"><label>Cliente que vai receber esta nota</label><select id="projectionInvoiceClient" onchange="updateProjectionInvoiceClientPrices()">${clientOptions}</select><div class="sub">Pode escolher outro cliente sem alterar o pedido original.</div></div>\n      <div class="field"><label>Data de emissão da nota</label><input id="projectionInvoiceIssueDate" type="date" value="${isoDate(new Date())}"></div>\n      <div class="field"><label>Vencimento</label><input id="projectionInvoiceDue" type="date" value="${selected[0]?.item.date||isoDate(new Date())}"></div>'''
if old_field not in s:
    raise SystemExit('projection invoice field target not found')
s=s.replace(old_field,new_field,1)

old_dates='''     db.finance=db.finance||[];db.projectionInvoices=db.projectionInvoices||[];\n     let due=document.getElementById("projectionInvoiceDue")?.value||isoDate(new Date());\n     let terms=document.getElementById("projectionInvoiceTerms")?.value||"À vista",invoiceId=Date.now();'''
new_dates='''     db.finance=db.finance||[];db.projectionInvoices=db.projectionInvoices||[];\n     let issueDate=document.getElementById("projectionInvoiceIssueDate")?.value||isoDate(new Date());\n     let due=document.getElementById("projectionInvoiceDue")?.value||issueDate;\n     let terms=document.getElementById("projectionInvoiceTerms")?.value||"À vista",invoiceId=Date.now();'''
if old_dates not in s:
    raise SystemExit('projection invoice date capture target not found')
s=s.replace(old_dates,new_dates,1)

old_invoice='''       items:invoiceItems.map(x=>({orderId:x.ctx.o.id,itemKey:x.ctx.item.key,productName:x.ctx.item.name,productId:x.ctx.item.productId||null,qty:x.qty,unitPrice:x.unit,value:x.value})),\n       date:isoDate(new Date()),dueDate:due,value:totalValue,terms,status:"Pendente"'''
new_invoice='''       items:invoiceItems.map(x=>({orderId:x.ctx.o.id,itemKey:x.ctx.item.key,productName:x.ctx.item.name,productId:x.ctx.item.productId||null,qty:x.qty,unitPrice:x.unit,value:x.value})),\n       date:issueDate,issueDate:issueDate,dueDate:due,value:totalValue,terms,status:"Pendente"'''
if old_invoice not in s:
    raise SystemExit('projection invoice object target not found')
s=s.replace(old_invoice,new_invoice,1)

old_fin='''       value:totalValue,status:"Pendente",paid:0,remaining:totalValue,date:due,paymentTerms:terms,\n       clientId:targetClient.id,clientName:targetClient.name,projectionInvoiceId:invoiceId'''
new_fin='''       value:totalValue,status:"Pendente",paid:0,remaining:totalValue,date:due,dueDate:due,issueDate:issueDate,paymentTerms:terms,\n       clientId:targetClient.id,clientName:targetClient.name,projectionInvoiceId:invoiceId'''
if old_fin not in s:
    raise SystemExit('finance projection object target not found')
s=s.replace(old_fin,new_fin,1)

s=s.replace('v91.18 Multiusuário','v91.19 Multiusuário')
s=s.replace('Versão v91.18','Versão v91.19')
s=s.replace('>v91.18</small>','>v91.19</small>')

p.write_text(s,encoding='utf-8')
print('patched v91.19 projection invoice issue date')
