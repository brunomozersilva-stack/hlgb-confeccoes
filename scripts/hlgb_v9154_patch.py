from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
addon=Path('scripts/hlgb_v9154_browser_local_recovery_addon.html').read_text(encoding='utf-8')
marker='HLGB v91.54 READ-ONLY BROWSER LOCAL PAYROLL RECOVERY'
if marker not in s:
    pos=s.rfind('</body>')
    if pos<0: raise SystemExit('index.html without real </body>')
    s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('v91.53 Multiusuário','v91.54 Multiusuário')
s=s.replace('Versão v91.53','Versão v91.54')
s=s.replace('>v91.53<','>v91.54<')
p.write_text(s,encoding='utf-8')
print('v91.54 browser-local payroll recovery audit applied')
