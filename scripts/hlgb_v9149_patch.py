from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
addons=[
 ('HLGB v91.49 FORENSIC PAYROLL + HUB RECOVERY',Path('scripts/hlgb_v9149_recovery_addon.html').read_text(encoding='utf-8')),
 ('HLGB v91.49 LEGACY CLOUD PAYROLL RECOVERY',Path('scripts/hlgb_v9149_legacy_recovery_addon.html').read_text(encoding='utf-8')),
]
for marker,addon in addons:
    if marker in s: continue
    pos=s.rfind('</body>')
    if pos<0: raise SystemExit('index.html without real </body>')
    s=s[:pos]+addon+'\n'+s[pos:]

s=s.replace('v91.48 Multiusuário','v91.49 Multiusuário')
s=s.replace('Versão v91.48','Versão v91.49')
s=s.replace('>v91.48<','>v91.49<')

p.write_text(s,encoding='utf-8')
print('v91.49 forensic + legacy cloud recovery applied')
