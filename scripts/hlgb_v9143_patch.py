from pathlib import Path

idx=Path('index.html')
s=idx.read_text(encoding='utf-8')
addon=Path('scripts/hlgb_v9143_addon.html').read_text(encoding='utf-8')
marker='HLGB v91.43 PRICING FILTERS + MATERIAL IMMEDIATE BALANCE + CAPACITY VALUE'
if marker not in addon:
    raise SystemExit('v91.43 marker missing')
if marker not in s:
    pos=s.rfind('</body></html>')
    if pos<0:
        raise SystemExit('final body marker not found')
    s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('v91.42 Multiusuário','v91.43 Multiusuário')
s=s.replace('Versão v91.42','Versão v91.43')
s=s.replace('>v91.42</small>','>v91.43</small>')
idx.write_text(s,encoding='utf-8')
print('Applied HLGB v91.43 pricing, material balance and capacity value fixes')
