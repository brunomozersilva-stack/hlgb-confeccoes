from pathlib import Path
import re, subprocess, tempfile
s=Path('index.html').read_text(encoding='utf-8')
blocks=re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>',s,flags=re.S|re.I)
out=[f'inline scripts: {len(blocks)}\n']
for i,code in enumerate(blocks,1):
    if not code.strip(): continue
    p=Path(tempfile.gettempdir())/f'hlgb_script_{i}.js'
    p.write_text(code,encoding='utf-8')
    r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
    marker=[]
    if 'function doLogin' in code: marker.append('CONTAINS_doLogin')
    if 'hlgbFastBootstrap9182' in code: marker.append('CONTAINS_9182')
    if 'cloudSignIn' in code: marker.append('CONTAINS_cloudSignIn')
    if r.returncode!=0 or marker:
        out.append(f'\nSCRIPT {i} chars={len(code)} status={"OK" if r.returncode==0 else "ERRO"} {" ".join(marker)}\n')
        if r.returncode!=0:
            out.append((r.stderr or r.stdout)[:5000]+'\n')
# also show exact active doLogin start
pos=s.find('function doLogin(){')
out.append(f'\ndoLogin position={pos}\n')
if pos>=0: out.append(s[pos:pos+9000])
Path('debug').mkdir(exist_ok=True)
Path('debug/login-9182-snippets.txt').write_text(''.join(out),encoding='utf-8')
