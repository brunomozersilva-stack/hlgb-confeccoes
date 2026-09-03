from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

old='''      <div class="field"><label>Condição de pagamento</label><select id="projectionInvoiceTerms"><option>À vista</option><option>7 dias</option><option>14 dias</option><option>21 dias</option><option>28 dias</option><option>30 dias</option><option>Personalizado</option></select></div>'''
new='''      <div class="field"><label>Condição de pagamento</label><select id="projectionInvoiceTerms" onchange="toggleProjectionInvoiceTermsDetail()"><option>À vista</option><option>7 dias</option><option>14 dias</option><option>21 dias</option><option>28 dias</option><option>30 dias</option><option>Cheque</option><option>Personalizado</option></select></div>
      <div class="field" id="projectionInvoiceTermsDetailField" style="display:none"><label id="projectionInvoiceTermsDetailLabel">Detalhes da condição</label><input id="projectionInvoiceTermsDetail" placeholder="Informe os detalhes da condição de pagamento"></div>'''
if old not in s:
    raise SystemExit('projection payment terms select target not found')
s=s.replace(old,new,1)

marker='''function recalcProjectionInvoiceModal(){'''
helper='''function toggleProjectionInvoiceTermsDetail(){
 let sel=document.getElementById("projectionInvoiceTerms"),field=document.getElementById("projectionInvoiceTermsDetailField"),label=document.getElementById("projectionInvoiceTermsDetailLabel"),inp=document.getElementById("projectionInvoiceTermsDetail");
 if(!sel||!field)return;
 let value=sel.value||"";
 let show=value==="Personalizado"||value==="Cheque";
 field.style.display=show?"block":"none";
 if(label)label.textContent=value==="Cheque"?"Detalhes dos cheques":"Detalhes da condição personalizada";
 if(inp){
   inp.placeholder=value==="Cheque"?"Ex.: 2 cheques — 15/09 e 30/09":"Ex.: entrada + 2 parcelas, 10/20/30 dias";
   if(!show)inp.value="";
 }
}
'''
if marker not in s:
    raise SystemExit('recalc marker not found')
s=s.replace(marker,helper+marker,1)

old='''     let due=document.getElementById("projectionInvoiceDue")?.value||issueDate;
     let terms=document.getElementById("projectionInvoiceTerms")?.value||"À vista",invoiceId=Date.now();'''
new='''     let due=document.getElementById("projectionInvoiceDue")?.value||issueDate;
     let terms=document.getElementById("projectionInvoiceTerms")?.value||"À vista";
     let termsDetail=document.getElementById("projectionInvoiceTermsDetail")?.value?.trim()||"";
     if(terms==="Personalizado"&&!termsDetail){alert("Informe os detalhes da condição de pagamento personalizada.");return}
     let invoiceId=Date.now();'''
if old not in s:
    raise SystemExit('projection invoice terms read target not found')
s=s.replace(old,new,1)

old='''       date:issueDate,issueDate:issueDate,dueDate:due,value:totalValue,terms,status:"Pendente"
     });'''
new='''       date:issueDate,issueDate:issueDate,dueDate:due,value:totalValue,terms,termsDetail,status:"Pendente"
     });'''
if old not in s:
    raise SystemExit('projection invoice save target not found')
s=s.replace(old,new,1)

old='''       value:totalValue,status:"Pendente",paid:0,remaining:totalValue,date:due,dueDate:due,issueDate:issueDate,paymentTerms:terms,
       clientId:targetClient.id,clientName:targetClient.name,projectionInvoiceId:invoiceId'''
new='''       value:totalValue,status:"Pendente",paid:0,remaining:totalValue,date:due,dueDate:due,issueDate:issueDate,paymentTerms:terms,paymentTermsDetail:termsDetail,
       clientId:targetClient.id,clientName:targetClient.name,projectionInvoiceId:invoiceId'''
if old not in s:
    raise SystemExit('finance payment terms save target not found')
s=s.replace(old,new,1)

old='''       f.type,esc(f.desc||"-"),money(displayValue),fmtDate(f.date),esc(f.paymentTerms||"-"),'''
new='''       f.type,esc(f.desc||"-"),money(displayValue),fmtDate(f.date),esc([f.paymentTerms,f.paymentTermsDetail].filter(Boolean).join(" — ")||"-"),'''
if old not in s:
    raise SystemExit('finance payment terms display target not found')
s=s.replace(old,new,1)

s=s.replace('v91.19 Multiusuário','v91.20 Multiusuário')
s=s.replace('Versão v91.19','Versão v91.20')
s=s.replace('>v91.19</small>','>v91.20</small>')

p.write_text(s,encoding='utf-8')
print('patched v91.20 projection payment terms')
