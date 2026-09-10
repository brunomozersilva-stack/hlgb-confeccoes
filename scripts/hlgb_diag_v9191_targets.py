from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')
lines=s.splitlines()
terms=[
 'Projeção semanal dos cortadores','Projecao semanal dos cortadores','visão tipo Excel','visao tipo Excel',
 'Fila por local','fila por local','facção','faccao','Modelos ainda sem destino','Planejamento de capacidade',
 'renderCutters','renderDailyCuts','renderCapacityPlanning','renderProduction','renderFactions','capacityAssignments',
 'actualCutGrade','originalGrade','finishCut','adjust','grade','produção por local','producao por local'
]
out=[]
seen=set()
for term in terms:
    for i,line in enumerate(lines):
        if term.lower() in line.lower():
            key=(i,term.lower())
            if key in seen: continue
            seen.add(key)
            a=max(0,i-18); b=min(len(lines),i+85)
            out.append(f'===== TERM {term!r} line {i+1} =====')
            out.extend(f'{j+1}: {lines[j]}' for j in range(a,b))
            out.append('')

# funções de interesse completas/maiores
for pat in [r'function\s+renderCutters\b',r'function\s+renderDailyCuts\b',r'function\s+renderCapacityPlanning\b',r'function\s+renderProduction\b',r'function\s+finishCut\b',r'window\.finishCut\s*=']:
    rx=re.compile(pat,re.I)
    for i,line in enumerate(lines):
        if rx.search(line):
            a=max(0,i-15); b=min(len(lines),i+220)
            out.append(f'===== FUNC {pat!r} line {i+1} =====')
            out.extend(f'{j+1}: {lines[j]}' for j in range(a,b))
            out.append('')

Path('debug').mkdir(exist_ok=True)
Path('debug/v9191-targets.txt').write_text('\n'.join(out),encoding='utf-8')
print('matches',len(out),'lines')