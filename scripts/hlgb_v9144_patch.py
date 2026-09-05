from pathlib import Path

idx=Path('index.html')
s=idx.read_text(encoding='utf-8')
addon=Path('scripts/hlgb_v9144_addon.html').read_text(encoding='utf-8')
marker='HLGB v91.44 DEFINITIVE PRICING + MATERIAL BALANCE + CAPACITY VALUE'
if marker not in addon:
    raise SystemExit('v91.44 marker missing')
if marker not in s:
    pos=s.rfind('</body></html>')
    if pos<0:
        raise SystemExit('final body marker not found')
    s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('v91.43 Multiusuário','v91.44 Multiusuário')
s=s.replace('Versão v91.43','Versão v91.44')
s=s.replace('>v91.43</small>','>v91.44</small>')
idx.write_text(s,encoding='utf-8')
print('Applied HLGB v91.44 definitive pricing, material balance and capacity value fixes')
