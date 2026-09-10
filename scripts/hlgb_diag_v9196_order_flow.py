from pathlib import Path

s=Path('index.html').read_text(encoding='utf-8')
terms=[
 'function recoverMissing', 'recoverMissing', 'remainingQty', 'recoveredQty',
 'missingPieces', 'finalizeSelectedProjection', 'projectionInvoices',
 'Pedido em produção', 'Pedido finalizado', 'function renderProduction',
 'renderProduction', 'data-page="production"', "showPage('production')",
 'Produção / capacidade', 'projectionOpenMissingQty'
]
print('TITLE', next((x.strip() for x in s.splitlines() if '<title>' in x), ''))
for term in terms:
    print('\n===== TERM:',term,'=====')
    start=0; hits=0
    while hits<8:
        i=s.find(term,start)
        if i<0: break
        hits+=1
        a=max(0,i-1800); b=min(len(s),i+3800)
        print(f'--- hit {hits} at {i} ---')
        print(s[a:b].replace('\x00',''))
        start=i+len(term)
    if not hits: print('NO HITS')
