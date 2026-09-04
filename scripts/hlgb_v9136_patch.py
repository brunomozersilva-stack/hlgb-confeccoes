from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
if 'HLGB v91.36 CUTTER PRINT + LIVE PERMISSIONS' in s:
    print('v91.36 already applied')
    raise SystemExit(0)

assert 'Sistema de Gestão v91.35 Multiusuário' in s, 'Expected v91.35 base'
for marker in [
    'HLGB v91.35 PROJECTION + CAPACITY + FACTION DELIVERY + PIX COPY',
    'HLGB v91.34 HUB CALENDAR + CUT READY QUEUE',
    'HLGB v91.33 EXPLICIT DELETE HARDENING',
    'HLGB v91.32 EMPLOYEE MASTER SAFETY',
    'HLGB v91.31 RECONCILIACAO OPERACIONAL',
    'HLGB v91.28 AUTHORITATIVE RECORD MERGE',
    'HLGB v91.26 DATA INTEGRITY GUARD'
]:
    assert marker in s, f'Missing safety marker: {marker}'

s=s.replace('Sistema de Gestão v91.35 Multiusuário','Sistema de Gestão v91.36 Multiusuário',1)
s=s.replace('Versão v91.35</b>','Versão v91.36</b>',1)
s=s.replace('>v91.35</small>','>v91.36</small>',1)

addon=Path('scripts/hlgb_v9136_addon.html').read_text(encoding='utf-8')
pos=s.rfind('</body>')
assert pos>=0, 'final </body> not found'
s=s[:pos]+'\n'+addon+'\n'+s[pos:]
p.write_text(s,encoding='utf-8')
print('Applied HLGB v91.36 cutter print and live permissions')
