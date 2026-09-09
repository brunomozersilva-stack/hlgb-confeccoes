from pathlib import Path

s=Path('index.html').read_text(encoding='utf-8')
lines=s.splitlines()
targets=[
 'Gastos previstos por vencimento',
 'Modelos ainda sem destino',
 'Escolher quem vai produzir',
 'renderHubFinance',
 'hubFinanceEntries',
 'renderCapacityPlanning',
]
out=[]
for t in targets:
    hits=[i for i,l in enumerate(lines) if t.lower() in l.lower()]
    out.append(f'===== TARGET {t!r} HITS {len(hits)} =====')
    for i in hits[:12]:
        a=max(0,i-35); b=min(len(lines),i+55)
        out.append(f'--- context line {i+1} ---')
        out.extend(f'{j+1}: {lines[j]}' for j in range(a,b))
        out.append('')
Path('debug').mkdir(exist_ok=True)
Path('debug/v9185-requests.txt').write_text('\n'.join(out),encoding='utf-8')
print('diag saved')
