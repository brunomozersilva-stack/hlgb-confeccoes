from pathlib import Path
import base64

p=Path('index.html')
s=p.read_text(encoding='utf-8')
marker='HLGB v91.39 UI BINDINGS + LOCAL PRODUCTION + SEPARATION CLEANUP'
if marker in s:
    print('v91.39 already applied')
    raise SystemExit(0)

assert 'Sistema de Gestão v91.38 Multiusuário' in s, 'Expected v91.38 base'
for old_marker in [
    'HLGB v91.38 WORKFLOW CLARITY + GRADE SPLIT + PARTIAL MATERIAL',
    'HLGB v91.37 HUB CADASTROS + PRICING PICKER + DAILY PRODUCTION LABEL',
    'HLGB v91.36 CUTTER PRINT + LIVE PERMISSIONS',
    'HLGB v91.35 PROJECTION + CAPACITY + FACTION DELIVERY + PIX COPY',
    'HLGB v91.34 HUB CALENDAR + CUT READY QUEUE',
    'HLGB v91.33 EXPLICIT DELETE HARDENING',
    'HLGB v91.32 EMPLOYEE MASTER SAFETY',
    'HLGB v91.31 RECONCILIACAO OPERACIONAL',
    'HLGB v91.28 AUTHORITATIVE RECORD MERGE',
    'HLGB v91.26 DATA INTEGRITY GUARD',
]:
    assert old_marker in s, f'Missing safety marker: {old_marker}'

parts=sorted(Path('scripts/v9139_parts').glob('part*.b64'))
assert len(parts)==5, f'Expected 5 v91.39 parts, got {len(parts)}'
raw=''.join(x.read_text(encoding='utf-8').strip() for x in parts)
addon=base64.b64decode(raw).decode('utf-8')
assert marker in addon, 'v91.39 marker missing from decoded addon'

s=s.replace('Sistema de Gestão v91.38 Multiusuário','Sistema de Gestão v91.39 Multiusuário',1)
s=s.replace('Versão v91.38</b>','Versão v91.39</b>',1)
s=s.replace('>v91.38</small>','>v91.39</small>',1)
pos=s.rfind('</body>')
assert pos>=0, 'final </body> not found'
s=s[:pos]+'\n'+addon+'\n'+s[pos:]
p.write_text(s,encoding='utf-8')
print('Applied HLGB v91.39 UI bindings, local production and separation cleanup')
