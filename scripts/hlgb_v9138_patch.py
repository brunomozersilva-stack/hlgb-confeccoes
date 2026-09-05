from pathlib import Path
import base64

p = Path('index.html')
s = p.read_text(encoding='utf-8')
marker = 'HLGB v91.38 WORKFLOW CLARITY + GRADE SPLIT + PARTIAL MATERIAL'

if marker in s:
    print('v91.38 already applied')
    raise SystemExit(0)

assert 'Sistema de Gestão v91.37 Multiusuário' in s, 'Expected v91.37 base'
for old_marker in [
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

parts = sorted(Path('scripts/v9138_parts').glob('part*.b64'))
assert len(parts) == 9, f'Expected 9 v91.38 parts, got {len(parts)}'
encoded = ''.join(''.join(x.read_text(encoding='utf-8').split()) for x in parts)
addon = base64.b64decode(encoded).decode('utf-8')
assert marker in addon, 'Decoded v91.38 marker missing'

# Corrige um typo detectado durante a revisão do addon antes de publicar.
addon = addon.replace("if(main) tmain.style.display='none';", "if(main) main.style.display='none';")
addon = addon.replace('if(main)tmain.style.display=\'none\';', 'if(main)main.style.display=\'none\';')
addon = addon.replace(' tmain.style.', ' main.style.')
assert 'tmain.style' not in addon, 'Unsafe tmain typo still present'

s = s.replace('Sistema de Gestão v91.37 Multiusuário', 'Sistema de Gestão v91.38 Multiusuário', 1)
s = s.replace('Versão v91.37</b>', 'Versão v91.38</b>', 1)
s = s.replace('>v91.37</small>', '>v91.38</small>', 1)

pos = s.rfind('</body>')
assert pos >= 0, 'final </body> not found'
s = s[:pos] + '\n' + addon + '\n' + s[pos:]
p.write_text(s, encoding='utf-8')
print('Applied HLGB v91.38 workflow clarity, grade split and partial material flow')
