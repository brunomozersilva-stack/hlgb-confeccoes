from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
terms=['projectionInvoices','renderProjection','renderFactionDelivery935','Finalizar nota','finalizar nota','Acerto','acerto','paymentHistory','Nota pronta','nota pronta','factionMasters','mfpix']
out=[]
for term in terms:
    out.append('\n===== '+term+' =====\n')
    start=0; n=0
    while n<20:
        i=s.find(term,start)
        if i<0: break
        a=max(0,i-3500); b=min(len(s),i+len(term)+3500)
        out.append(f'\n--- occurrence {n+1} @ {i} ---\n'+s[a:b]+'\n')
        start=i+len(term); n+=1
    if n==0: out.append('NOT FOUND\n')
Path('scripts/diag_notes_context.txt').write_text(''.join(out),encoding='utf-8')
print('wrote',len(''.join(out)))
