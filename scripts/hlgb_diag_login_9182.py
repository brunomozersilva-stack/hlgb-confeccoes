from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
needle='const finRows=fin.map'
i=s.find(needle)
out=[f'needle position={i}\n']
if i>=0:
    out.append(s[max(0,i-12000):min(len(s),i+5000)])
Path('debug').mkdir(exist_ok=True)
Path('debug/login-9182-snippets.txt').write_text(''.join(out),encoding='utf-8')
