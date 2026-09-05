from pathlib import Path
idx=Path('index.html')
s=idx.read_text(encoding='utf-8')
addon=Path('scripts/hlgb_v9141_addon.html').read_text(encoding='utf-8')
marker='HLGB v91.41 PRICING + DAILY PLAN + SOURCE DELIVERY + MATERIAL BALANCE'
if marker not in addon: raise SystemExit('v91.41 marker missing')
if marker not in s:
    pos=s.rfind('</body></html>')
    if pos<0: raise SystemExit('final body marker not found')
    s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('v91.40 Multiusuário','v91.41 Multiusuário')
s=s.replace('Versão v91.40','Versão v91.41')
s=s.replace('>v91.40</small>','>v91.41</small>')
idx.write_text(s,encoding='utf-8')
print('Applied HLGB v91.41 workflow fixes')
# deployment trigger: v91.41
