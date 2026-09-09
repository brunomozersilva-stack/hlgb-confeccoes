from pathlib import Path
import re
s=Path('index.html').read_text(encoding='utf-8')
terms=['id="corte"','id="cortesDoDia"','Cortes do dia','Programar corte','programar corte','renderCuts','plannedCutDate','cutterId','cutAssignmentQueue','renderCutters','openCut','cutSchedule']
out=[]
for term in terms:
    out.append('\n===== '+term+' =====\n')
    pos=0; count=0
    while True:
        i=s.find(term,pos)
        if i<0 or count>=8: break
        line=s.count('\n',0,i)+1
        lines=s.splitlines()
        a=max(0,line-18); b=min(len(lines),line+45)
        out.append(f'--- line {line} ---\n'+'\n'.join(f'{j+1}: {lines[j]}' for j in range(a,b))+'\n')
        pos=i+len(term);count+=1
Path('debug/cut-planning-9188.txt').write_text('\n'.join(out),encoding='utf-8')
print('diag cut planning written')
