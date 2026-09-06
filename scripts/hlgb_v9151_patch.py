from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
addon=Path('scripts/hlgb_v9151_diagnostic_addon.html').read_text(encoding='utf-8')
marker='HLGB v91.51 READ-ONLY PAYROLL + HUB DIAGNOSTIC'
if marker not in s:
    pos=s.rfind('</body>')
    if pos<0: raise SystemExit('index.html without real </body>')
    s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('v91.50 Multiusuário','v91.51 Multiusuário')
s=s.replace('Versão v91.50','Versão v91.51')
s=s.replace('>v91.50<','>v91.51<')
p.write_text(s,encoding='utf-8')
print('v91.51 read-only diagnostic applied')
