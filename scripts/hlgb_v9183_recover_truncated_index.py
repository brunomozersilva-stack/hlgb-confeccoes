from pathlib import Path
import re, subprocess, tempfile

INDEX=Path('index.html')
BACKUP=Path('sistema-v9174.html')
PLACEHOLDER='... 329474 bytes omitted ...'
START='<!-- HLGB_V9179_START -->'
END='<!-- HLGB_V9179_END -->'

s=INDEX.read_text(encoding='utf-8')
b=BACKUP.read_text(encoding='utf-8')
print(f'index bytes={len(s.encode("utf-8"))} backup bytes={len(b.encode("utf-8"))}')

# 1) Recupera o grande trecho que foi substituido acidentalmente por um texto de truncamento.
count=s.count(PLACEHOLDER)
print('placeholder count=',count)
if count!=1:
    raise SystemExit(f'ERRO: esperado exatamente 1 placeholder de truncamento, encontrado {count}')
pos=s.index(PLACEHOLDER)
left=s[:pos]
right=s[pos+len(PLACEHOLDER):]

def unique_suffix(text, source):
    for n in [2000,1500,1200,1000,800,600,500,400,300,250,200,160,120,100,80,60,50,40,30,20]:
        if len(text)<n: continue
        c=text[-n:]
        k=source.count(c)
        if k==1:
            return c,n,source.index(c)
    return None,None,None

def unique_prefix(text, source):
    for n in [2000,1500,1200,1000,800,600,500,400,300,250,200,160,120,100,80,60,50,40,30,20]:
        if len(text)<n: continue
        c=text[:n]
        k=source.count(c)
        if k==1:
            return c,n,source.index(c)
    return None,None,None

la,ln,lp=unique_suffix(left,b)
ra,rn,rp=unique_prefix(right,b)
print(f'left anchor len={ln} pos={lp}; right anchor len={rn} pos={rp}')
if not la or not ra:
    raise SystemExit('ERRO: nao foi possivel localizar ancoras unicas no backup v91.74')
start=lp+len(la)
end=rp
if end<=start:
    raise SystemExit(f'ERRO: ancoras invertidas no backup: {start} >= {end}')
recovered=b[start:end]
print(f'recovered chars={len(recovered)} bytes={len(recovered.encode("utf-8"))}')
if len(recovered)<100000 or len(recovered)>600000:
    raise SystemExit('ERRO: tamanho recuperado fora da faixa segura de 100k-600k')
s=left+recovered+right
if PLACEHOLDER in s:
    raise SystemExit('ERRO: placeholder ainda presente apos recuperacao')

# 2) Realoca o bloco v91.79, que havia sido inserido dentro da string de impressao da nota.
if s.count(START)!=1 or s.count(END)!=1:
    raise SystemExit(f'ERRO: marcadores v91.79 inesperados START={s.count(START)} END={s.count(END)}')
a=s.index(START)
z=s.index(END,a)+len(END)
block=s[a:z]
s=s[:a]+s[z:]
real_body=s.rfind('</body>')
if real_body<0:
    raise SystemExit('ERRO: fechamento real </body> nao encontrado')
s=s[:real_body]+'\n'+block+'\n'+s[real_body:]

# 3) Atualiza apenas a identificacao visual da versao atual.
s=s.replace('v91.82','v91.83').replace('V91.82','V91.83')

# 4) Validacoes de integridade antes de tocar no index oficial.
for needle in ['function doLogin()','hlgbFastBootstrap9182','<!-- HLGB_V9179_START -->','<!-- HLGB_V9179_END -->']:
    if needle not in s:
        raise SystemExit('ERRO: trecho obrigatorio ausente: '+needle)
if s.count(START)!=1 or s.count(END)!=1:
    raise SystemExit('ERRO: bloco v91.79 duplicado depois do reparo')

# Extrai o script que contem o login e valida sintaxe com Node.
pat=re.compile(r'<script(?:\s[^>]*)?>(.*?)</script\s*>',re.I|re.S)
login=[]
for m in pat.finditer(s):
    body=m.group(1)
    if 'function doLogin()' in body:
        login.append(body)
print('login script blocks=',len(login))
if len(login)!=1:
    raise SystemExit(f'ERRO: esperado 1 bloco de script contendo doLogin, encontrado {len(login)}')
js=Path(tempfile.gettempdir())/'hlgb_v9183_recovered_main.js'
js.write_text(login[0],encoding='utf-8')
r=subprocess.run(['node','--check',str(js)],capture_output=True,text=True)
if r.returncode!=0:
    print(r.stderr or r.stdout)
    raise SystemExit('ERRO: JavaScript principal ainda contem erro de sintaxe')
print('PASS node --check do script principal')

# Confere que a nota de impressao voltou a fechar antes do restante do codigo.
pos_print=s.find('function printCustomerNote')
pos_sync=s.find('function syncFinalizedCutsToProduction',pos_print)
segment=s[pos_print:pos_sync if pos_sync>pos_print else pos_print+200000]
if '</body></html>`);' not in segment and '</body></html>`);w.document.close' not in segment:
    raise SystemExit('ERRO: fechamento da pagina de impressao nao foi recomposto')

INDEX.write_text(s,encoding='utf-8')
print('PASS v91.83: truncamento recuperado do backup v91.74, v91.79 realocada e login validado')
