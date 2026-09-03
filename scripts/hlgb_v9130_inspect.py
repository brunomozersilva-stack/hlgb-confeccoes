from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
patterns=[
'function renderCutAssignmentQueue','function assignProduction','function renderFactionPaymentPlanner','Modelos disponíveis para envio','Envios para facções',
'function renderPayroll','employeeAdvances','function openPayrollModal','function renderInvoices','function finalizeProjection','projectionInvoices',
'function renderCuts','Cortes do dia','function markSeparation','function finalizeCut','function renderOrders','status',
'Ficha técnica','technical','travet','Mercadoria pronta','Notas prontas','function renderProduction','function saveOrder','function openOrderModal',
'function openProductModal','function saveProduct'
]
print('INDEX LEN',len(s),'LINES',s.count('\n')+1)
for pat in patterns:
    print('\n===',pat,'===')
    start=0; found=0
    while True:
        i=s.find(pat,start)
        if i<0: break
        found+=1
        a=max(0,i-900); b=min(len(s),i+2200)
        print(f'-- hit {found} at {i} --')
        print(s[a:b])
        start=i+len(pat)
        if found>=5: break
    if not found: print('NOT FOUND')
