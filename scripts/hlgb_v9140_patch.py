from pathlib import Path
import base64,gzip

idx=Path('index.html')
s=idx.read_text(encoding='utf-8')
marker='HLGB v91.40 CAPACITY QUEUE + GOALS LIVE + MISSING AT INVOICE + FACTION SYNC'
addon=gzip.decompress(base64.b64decode(Path('scripts/hlgb_v9140_addon.gz.b64').read_text().strip())).decode('utf-8')
assert marker in addon
if marker not in s:
    pos=s.rfind('</body></html>')
    if pos<0: raise SystemExit('final body marker not found')
    s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('v91.39 Multiusuário','v91.40 Multiusuário')
s=s.replace('Versão v91.39','Versão v91.40')
s=s.replace('>v91.39</small>','>v91.40</small>')
idx.write_text(s,encoding='utf-8')
print('Applied HLGB v91.40 capacity queue, missing pieces and faction/projection sync')
