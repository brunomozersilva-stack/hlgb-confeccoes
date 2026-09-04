from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
if 'HLGB v91.34 HUB CALENDAR + CUT READY QUEUE' in s:
    print('v91.34 already applied')
    raise SystemExit(0)
assert 'Sistema de Gestão v91.33 Multiusuário' in s, 'Expected v91.33 base'
for marker in [
    'HLGB v91.33 EXPLICIT DELETE HARDENING',
    'HLGB v91.32 EMPLOYEE MASTER SAFETY',
    'HLGB v91.31 RECONCILIACAO OPERACIONAL',
    'HLGB v91.28 AUTHORITATIVE RECORD MERGE',
    'HLGB v91.26 DATA INTEGRITY GUARD'
]:
    assert marker in s, f'Missing safety marker: {marker}'

s=s.replace('Sistema de Gestão v91.33 Multiusuário','Sistema de Gestão v91.34 Multiusuário',1)
s=s.replace('Versão v91.33</b>','Versão v91.34</b>',1)
s=s.replace('>v91.33</small>','>v91.34</small>',1)
addon=Path('scripts/hlgb_v9134_addon.html').read_text(encoding='utf-8')
pos=s.rfind('</body>')
assert pos>=0, 'final </body> not found'
s=s[:pos]+'\n'+addon+'\n'+s[pos:]
p.write_text(s,encoding='utf-8')
print('Applied HLGB v91.34 Hub calendar and ready-cuts queue')
