from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
patterns=[
'function openCutAssignment','function saveCutAssignment','assignmentQty','assignDestination','function renderDailyCuts','function saveCutSchedule','function finishCut',
'function productForm','function saveProductFromForm','ffaction','function renderFactionPayments','function renderFactionReport','factionPayments','function settleFaction','function closeFaction',
'function renderEmployeeAdvances','advancePaid','paidAt','Valores já pagos','terminationPaidVacation','vacationThird','1/3',
'function renderOrderNotes','function renderAllOrderNotes','allOrderNotesSummary','orderNotesSummary','noteReady','invoiceReady','function renderNotes',
'function newOrder','function editOrder','function orderForm','orderStatus','statusSelect','<label>Status</label>','Sem cliente','Pedido avulso','clientId',
'function fillSeparationOrders','materialChecklists','Compra de material','confirmar compra','function renderMaterialChecklists','function saveMaterialChecklist',
'projectionInvoiceQty','projectionInvoiceUnit','function openProjectionInvoice','function finishProjectionInvoice','deliveryHistory',
'function productionHubRows','function advanceProd','stage:"Pronto"','finishedAt','Mercadoria sem nota pronta','stock',
'<section id="folhaPagamento"','<section id="faccoes"','<section id="pedidos"','<section id="produtos"'
]
print('INDEX LEN',len(s),'LINES',s.count('\n')+1)
for pat in patterns:
    print('\n===',pat,'===')
    start=0; found=0
    while True:
        i=s.find(pat,start)
        if i<0: break
        found+=1
        a=max(0,i-1500); b=min(len(s),i+4200)
        print(f'-- hit {found} at {i} --')
        print(s[a:b])
        start=i+len(pat)
        if found>=4: break
    if not found: print('NOT FOUND')
