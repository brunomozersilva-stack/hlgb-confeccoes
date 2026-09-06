from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
addon=Path('scripts/hlgb_v9148_addon.html').read_text(encoding='utf-8')
marker='HLGB v91.48 DATA INTEGRITY + RECOVERY + CONFIRMED PAYROLL'

if marker not in s:
    if '</body>' not in s:
        raise SystemExit('index.html without </body>')
    s=s.replace('</body>',addon+'\n</body>',1)

s=s.replace('v91.47 Multiusuário','v91.48 Multiusuário')
s=s.replace('Versão v91.47','Versão v91.48')
s=s.replace('>v91.47<','>v91.48<')

p.write_text(s,encoding='utf-8')
print('v91.48 integrity addon applied')
