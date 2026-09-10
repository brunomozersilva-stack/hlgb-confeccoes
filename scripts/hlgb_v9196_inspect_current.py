from pathlib import Path

s=Path('index.html').read_text(encoding='utf-8')

def fn(name):
    needles=[f'function {name}(', f'async function {name}(', f'window.{name}=function(', f'window.{name}=async function(']
    poss=[(s.find(n),n) for n in needles if s.find(n)>=0]
    if not poss:return f'### {name}\nNOT FOUND\n'
    i,n=min(poss)
    b=s.find('{',i)
    if b<0:return f'### {name}\nNO BRACE\n'
    depth=0; quote=None; esc=False; line=False; block=False; j=b
    while j<len(s):
        c=s[j]; d=s[j+1] if j+1<len(s) else ''
        if line:
            if c=='\n': line=False
        elif block:
            if c=='*' and d=='/': block=False; j+=1
        elif quote:
            if esc: esc=False
            elif c=='\\': esc=True
            elif c==quote: quote=None
        else:
            if c=='/' and d=='/': line=True; j+=1
            elif c=='/' and d=='*': block=True; j+=1
            elif c in ('\"',"'",'`'): quote=c
            elif c=='{': depth+=1
            elif c=='}':
                depth-=1
                if depth==0:
                    return f'### {name} @ {i}\n'+s[i:j+1]+'\n'
        j+=1
    return f'### {name}\nUNTERMINATED\n'

names=['abateMissingPiece','save','persistDb','renderProduction','renderAll','projectionItemsForOrder','projectionOpenMissingQty','finalizeSelectedProjection','finalizeProjectionInvoice','closeProjectionInvoice','syncAllProductionIssuesToMissing','syncProductionIssuesToMissing','recordProjectionDelivery','registerFactionDelivery9135']
out=['TITLE/VERSION\n'+s[s.find('<title>'):s.find('</title>')+8]]
for n in names: out.append(fn(n))
for term in ['data-page="production"',"showPage('production')",'Produção diária por local','Notas','projectionInvoices','Pedido em produção']:
    out.append('\n### CONTEXT '+term+'\n')
    start=0;hits=0
    while hits<8:
        i=s.find(term,start)
        if i<0:break
        hits+=1
        out.append(s[max(0,i-900):min(len(s),i+1800)])
        start=i+len(term)
Path('debug/v9196-current-flow.txt').write_text('\n\n'.join(out),encoding='utf-8')
print('wrote',len('\n\n'.join(out)))
