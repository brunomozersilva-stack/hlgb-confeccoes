from pathlib import Path
import re, subprocess, tempfile
s=Path('index.html').read_text(encoding='utf-8')
needle='const finRows=fin.map'
i=s.find(needle)
out=[f'needle position={i}\n']
if i>=0:
    j=s.find('\n',i)
    if j<0:j=len(s)
    oldline=s[i:j]
    out.append('OLDLINE REPR:\n'+repr(oldline)+'\n')
    newline="const finRows=fin.map(f=>[fmt9179(f.date),esc9179(f.desc),money9179(f.value),money9179(f.paid),money9179(f.remaining),'<span class=\"badge '+(f.status==='Pago'?'ok':f.status==='Parcial'?'':'warn')+'\">'+esc9179(f.status)+'</span>']);"
    t=s[:i]+newline+s[j:]
    blocks=re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>',t,flags=re.S|re.I)
    lbs=[b for b in blocks if 'function doLogin(){' in b]
    out.append(f'login blocks after hypothetical fix={len(lbs)}\n')
    if lbs:
        p=Path(tempfile.gettempdir())/'hlgb_after_fix.js';p.write_text(lbs[0],encoding='utf-8')
        r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
        out.append('NODE STATUS='+str(r.returncode)+'\n'+(r.stderr or r.stdout)[:8000]+'\n')
Path('debug').mkdir(exist_ok=True)
Path('debug/login-9182-snippets.txt').write_text(''.join(out),encoding='utf-8')
