from pathlib import Path
import re
s=Path('index.html').read_text(encoding='utf-8')
lines=s.splitlines()
Path('debug').mkdir(exist_ok=True)

def grab(name,patterns,before=20,after=140,max_matches=4):
    out=[]; hits=0
    regs=[re.compile(p,re.I) for p in patterns]
    for i,line in enumerate(lines):
        if any(r.search(line) for r in regs):
            out.append(f'===== line {i+1} =====')
            a=max(0,i-before); b=min(len(lines),i+after)
            out.extend(f'{j+1}: {lines[j]}' for j in range(a,b))
            out.append('')
            hits+=1
            if hits>=max_matches: break
    Path('debug',name).write_text('\n'.join(out),encoding='utf-8')
    print(name,hits,len(out))

grab('v9191-cutter-excel.txt',[r'hlgbRenderCutterExcel9179',r'Projeção semanal dos cortadores',r'visão tipo Excel'],20,180,3)
grab('v9191-capacity.txt',[r'renderCapacityPlanning',r'capacityAssignments',r'Planejamento de capacidade'],25,220,5)
grab('v9191-queue-local.txt',[r'Modelos ainda sem destino',r'Fila por local',r'productionLocationId',r'Escolher quem vai produzir'],25,220,5)
grab('v9191-grade.txt',[r'actualCutGrade',r'originalGrade',r'cutAdjustmentNote',r'function finishCut',r'window\.finishCut'],25,240,6)