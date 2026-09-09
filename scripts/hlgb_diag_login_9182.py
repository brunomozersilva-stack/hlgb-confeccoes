from pathlib import Path
import re
s=Path('index.html').read_text(encoding='utf-8')
blocks=re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>',s,flags=re.S|re.I)
lbs=[b for b in blocks if 'function doLogin(){' in b]
out=[f'login blocks={len(lbs)}\n']
if lbs:
    lines=lbs[0].splitlines()
    out.append(f'lines={len(lines)}\n')
    for n in range(4880,min(4960,len(lines))+1):
        out.append(f'{n:04d}: {lines[n-1]}\n')
Path('debug').mkdir(exist_ok=True)
Path('debug/login-9182-snippets.txt').write_text(''.join(out),encoding='utf-8')
