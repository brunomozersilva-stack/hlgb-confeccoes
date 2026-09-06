from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
addon=Path('scripts/hlgb_v9152_payroll_display_addon.html').read_text(encoding='utf-8')
marker='HLGB v91.52 PAYROLL CLOUD STATUS DISPLAY + RECOVERY SHUTDOWN'
if marker not in s:
    pos=s.rfind('</body>')
    if pos<0: raise SystemExit('index.html without real </body>')
    s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('v91.51 Multiusuário','v91.52 Multiusuário')
s=s.replace('Versão v91.51','Versão v91.52')
s=s.replace('>v91.51<','>v91.52<')
p.write_text(s,encoding='utf-8')
print('v91.52 payroll cloud status display applied')
