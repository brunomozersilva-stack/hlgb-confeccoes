from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
addon=Path('scripts/hlgb_v9155_durable_save_addon.html').read_text(encoding='utf-8')
marker='HLGB v91.55 DURABLE WRITE-AHEAD LOG + CLOUD ACK + DEPLOY SAFE'
if marker not in s:
    pos=s.rfind('</body>')
    if pos<0: raise SystemExit('index.html without real </body>')
    s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('v91.54 Multiusuário','v91.55 Multiusuário')
s=s.replace('Versão v91.54','Versão v91.55')
s=s.replace('>v91.54<','>v91.55<')
p.write_text(s,encoding='utf-8')
print('v91.55 durable write-ahead save layer applied')
