from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
lines=s.splitlines()
targets=['cutProductKey','corte finalizado','cutPlans','cutting','db.cuts','db.cutting','editHubFinanceEntry','toggleHubFinanceEntry','hlgb916HubForm','realizedAt','hubFinanceEntries']
out=[]
for t in targets:
    hits=[i for i,l in enumerate(lines) if t.lower() in l.lower()]
    out.append(f'===== {t!r} HITS {len(hits)} =====')
    for i in hits[:18]:
        a=max(0,i-16);b=min(len(lines),i+26)
        out.append(f'--- line {i+1} ---')
        out.extend(f'{j+1}: {lines[j]}' for j in range(a,b))
        out.append('')
Path('debug/v9185-cut-finance.txt').write_text('\n'.join(out),encoding='utf-8')
print('saved')
