from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
addon=Path('scripts/hlgb_v9153_legacy_diff_addon.html').read_text(encoding='utf-8')
marker='HLGB v91.53 READ-ONLY LEGACY PAYROLL + HUB DIFF'
if marker not in s:
    pos=s.rfind('</body>')
    if pos<0: raise SystemExit('index.html without real </body>')
    s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('v91.52 Multiusuário','v91.53 Multiusuário')
s=s.replace('Versão v91.52','Versão v91.53')
s=s.replace('>v91.52<','>v91.53<')
p.write_text(s,encoding='utf-8')
print('v91.53 read-only legacy diff applied')
