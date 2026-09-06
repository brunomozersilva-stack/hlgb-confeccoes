from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
addon=Path('scripts/hlgb_v9150_recovery_launcher.html').read_text(encoding='utf-8')
marker='HLGB v91.50 RECOVERY LAUNCHER + CLOUD READY RETRY'

if marker not in s:
    pos=s.rfind('</body>')
    if pos<0:
        raise SystemExit('index.html without real </body>')
    s=s[:pos]+addon+'\n'+s[pos:]

s=s.replace('v91.49 Multiusuário','v91.50 Multiusuário')
s=s.replace('Versão v91.49','Versão v91.50')
s=s.replace('>v91.49<','>v91.50<')

p.write_text(s,encoding='utf-8')
print('v91.50 recovery launcher applied')
