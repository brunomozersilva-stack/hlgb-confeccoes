from pathlib import Path
import re
s=Path('index.html').read_text(encoding='utf-8')
terms=['id="corte"','Cortes do dia','Programar corte','renderCuts','renderDailyCuts','plannedCutDate','cutterId','cutAssignmentQueue','renderCutters','openDailyCutPlanner','saveCutSchedule','function finishCut','function editCut','function cutValue','syncFinalizedCutsToProduction']
out=[]
lines=s.splitlines()
for term in terms:
    out.append('\n===== '+term+' =====\n')
    pos=0; count=0
    while True:
        i=s.find(term,pos)
        if i<0 or count>=10: break
        line=s.count('\n',0,i)+1
        a=max(0,line-25); b=min(len(lines),line+95)
        out.append(f'--- line {line} ---\n'+'\n'.join(f'{j+1}: {lines[j]}' for j in range(a,b))+'\n')
        pos=i+len(term);count+=1
Path('debug/cut-planning-9188.txt').write_text('\n'.join(out),encoding='utf-8')
print('diag cut planning written')
# trigger2
