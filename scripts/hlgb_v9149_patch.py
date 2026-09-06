from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
addon=Path('scripts/hlgb_v9149_recovery_addon.html').read_text(encoding='utf-8')
marker='HLGB v91.49 FORENSIC PAYROLL + HUB RECOVERY'

if marker not in s:
    pos=s.rfind('</body>')
    if pos<0:
        raise SystemExit('index.html without real </body>')
    s=s[:pos]+addon+'\n'+s[pos:]

s=s.replace('v91.48 Multiusuário','v91.49 Multiusuário')
s=s.replace('Versão v91.48','Versão v91.49')
s=s.replace('>v91.48<','>v91.49<')

p.write_text(s,encoding='utf-8')
print('v91.49 forensic recovery addon applied')
