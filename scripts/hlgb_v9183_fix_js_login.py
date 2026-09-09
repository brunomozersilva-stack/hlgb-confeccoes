from pathlib import Path
import re, subprocess, tempfile

p=Path('index.html')
s=p.read_text(encoding='utf-8')

old="""const finRows=fin.map(f=>[fmt9179(f.date),esc9179(f.desc),money9179(f.value),money9179(f.paid),money9179(f.remaining),`<span class=\"badge ${f.status==='Pago'?'ok':f.status==='Parcial'?'':'warn'}\">${esc9179(f.status)}</span>`]);"""
new="""const finRows=fin.map(f=>[fmt9179(f.date),esc9179(f.desc),money9179(f.value),money9179(f.paid),money9179(f.remaining),'<span class=\"badge '+(f.status==='Pago'?'ok':f.status==='Parcial'?'':'warn')+'\">'+esc9179(f.status)+'</span>']);"""

count=s.count(old)
if count!=1:
    raise SystemExit(f'ERRO: esperado 1 trecho financeiro com sintaxe quebrada, encontrado {count}')
s=s.replace(old,new,1)
s=s.replace('v91.82','v91.83').replace('V91.82','V91.83')

# Valida especificamente o bloco JavaScript que contém o login.
blocks=re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>',s,flags=re.S|re.I)
login_blocks=[b for b in blocks if 'function doLogin(){' in b]
if len(login_blocks)!=1:
    raise SystemExit(f'ERRO: bloco doLogin inesperado: {len(login_blocks)}')
js=Path(tempfile.gettempdir())/'hlgb_login_v9183.js'
js.write_text(login_blocks[0],encoding='utf-8')
r=subprocess.run(['node','--check',str(js)],capture_output=True,text=True)
if r.returncode!=0:
    print(r.stderr or r.stdout)
    raise SystemExit('ERRO: JavaScript principal ainda contém erro de sintaxe')

# Verificações mínimas do fluxo de login.
for needle in ['function doLogin(){','errorEl.textContent="Entrando…"','await cloudSignIn(email,password);','hlgbFastBootstrap9182']:
    if needle not in s:
        raise SystemExit('ERRO: trecho obrigatório ausente: '+needle)

p.write_text(s,encoding='utf-8')
print('PASS: v91.83 - bloco principal do login validado pelo Node')
