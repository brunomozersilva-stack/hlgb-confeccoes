from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
if 'HLGB v91.33 EXPLICIT DELETE HARDENING' in s:
    print('v91.33 already applied')
    raise SystemExit(0)
assert 'Sistema de Gestão v91.32 Multiusuário' in s, 'Expected v91.32 base'
for marker in ['HLGB v91.32 EMPLOYEE MASTER SAFETY','HLGB v91.31 RECONCILIACAO OPERACIONAL','HLGB v91.26 DATA INTEGRITY GUARD','HLGB v91.28 AUTHORITATIVE RECORD MERGE']:
    assert marker in s, f'Missing safety marker: {marker}'

s=s.replace('Sistema de Gestão v91.32 Multiusuário','Sistema de Gestão v91.33 Multiusuário',1)
s=s.replace('Versão v91.32</b>','Versão v91.33</b>',1)
s=s.replace('>v91.32</small>','>v91.33</small>',1)
old='materialLots:"materiais",separations:"materiais",projectionInvoices:"projecao",colors:"cadastros",sizes:"cadastros",finishedPieces:"producao",factionSettings:"faccoes"'
new='materialLots:"materiais",separations:"materiais",projectionInvoices:"projecao",colors:"cadastros",sizes:"cadastros",hubFinanceEntries:"hubFinanceiro",finishedPieces:"producao",factionSettings:"faccoes"'
assert old in s, 'HLGB_RECORD_WRITE_AREA anchor not found'
s=s.replace(old,new,1)

addon=Path('scripts/hlgb_v9133_addon.html').read_text(encoding='utf-8')
pos=s.rfind('</body>')
assert pos>=0, 'final </body> not found'
s=s[:pos]+'\n'+addon+'\n'+s[pos:]
p.write_text(s,encoding='utf-8')
print('Applied HLGB v91.33 integrity hardening')
