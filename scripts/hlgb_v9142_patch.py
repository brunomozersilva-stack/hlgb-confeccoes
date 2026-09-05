from pathlib import Path
idx=Path('index.html')
s=idx.read_text(encoding='utf-8')
addon=Path('scripts/hlgb_v9142_addon.html').read_text(encoding='utf-8')
marker='HLGB v91.42 CROSS-VERSION CLOUD RECOVERY + HUB FINANCE SAFETY'
if marker not in addon: raise SystemExit('v91.42 marker missing')
if marker not in s:
    pos=s.rfind('</body></html>')
    if pos<0: raise SystemExit('final body marker not found')
    s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('v91.41 Multiusuário','v91.42 Multiusuário')
s=s.replace('Versão v91.41','Versão v91.42')
s=s.replace('>v91.41</small>','>v91.42</small>')
idx.write_text(s,encoding='utf-8')
print('Applied HLGB v91.42 cross-version cloud recovery')
