from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
patterns=[
 'function saveFaction','factionMasters.push','cadFaccoes','hubFinanceEntries','function renderHub','Erro ao carregar dados',
 'Separação / compra de material','function pedidosQuePrecisamDeCorte','function syncOrdersToCuts','materialChecklists.push',
 'function openMaterialChecklist','function printMaterialChecklist','function renderSeparation','function printMaterialSeparationSheet',
 'hlgbRegisterFactionMissing9197','factionTable','Atendido por produção'
]
lines=s.splitlines()
for p in patterns:
 print('\n===== PATTERN:',p,'=====')
 hits=[i for i,l in enumerate(lines) if p.lower() in l.lower()]
 print('hits',hits[:20])
 for i in hits[:6]:
  a=max(0,i-10); b=min(len(lines),i+35)
  print(f'--- lines {a+1}-{b} ---')
  for j in range(a,b): print(f'{j+1}: {lines[j]}')
