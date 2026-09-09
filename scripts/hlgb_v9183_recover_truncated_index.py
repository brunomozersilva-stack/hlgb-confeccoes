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

# 1) Recupera o trecho que foi literalmente substituido pelo aviso de truncamento.
count=s.count(PLACEHOLDER)
print('placeholder count=',count)
if count!=1:
    raise SystemExit(f'ERRO: esperado exatamente 1 placeholder de truncamento, encontrado {count}')
pos=s.index(PLACEHOLDER)
left=s[:pos]
right=s[pos+len(PLACEHOLDER):]

# As bordas imediatas do truncamento podem estar cortadas no meio de uma linha.
# Por isso procuramos, perto de cada borda, o bloco de linhas completo mais proximo
# que exista uma unica vez tanto no index atual quanto no backup v91.74.
def nearest_left_anchor(text, source, max_lines=800):
    lines=text.splitlines(keepends=True)
    start=max(0,len(lines)-max_lines)
    for i in range(len(lines)-1,start-1,-1):
        for k in (4,3,2,1):
            a=max(start,i-k+1)
            cand=''.join(lines[a:i+1])
            if len(cand.strip())<30: continue
            if text.count(cand)==1 and source.count(cand)==1:
                return cand, text.rfind(cand), source.index(cand), i, k
    return None,None,None,None,None

def nearest_right_anchor(text, source, max_lines=800):
    lines=text.splitlines(keepends=True)
    stop=min(len(lines),max_lines)
    for i in range(0,stop):
        for k in (4,3,2,1):
            j=min(stop,i+k)
            cand=''.join(lines[i:j])
            if len(cand.strip())<30: continue
            if text.count(cand)==1 and source.count(cand)==1:
                return cand, text.find(cand), source.index(cand), i, k
    return None,None,None,None,None

la,lcur,lbak,li,lk=nearest_left_anchor(left,b)
ra,rcur,rbak,ri,rk=nearest_right_anchor(right,b)
print(f'left anchor current={lcur} backup={lbak} lineIndex={li} lines={lk}')
print(f'right anchor current={rcur} backup={rbak} lineIndex={ri} lines={rk}')
if not la or not ra:
    raise SystemExit('ERRO: nao foi possivel localizar ancoras de linhas no backup v91.74')
print('LEFT ANCHOR:',repr(la[-300:]))
print('RIGHT ANCHOR:',repr(ra[:300]))

backup_start=lbak+len(la)
backup_end=rbak
if backup_end<=backup_start:
    raise SystemExit(f'ERRO: ancoras invertidas no backup: {backup_start} >= {backup_end}')
recovered=b[backup_start:backup_end]
print(f'recovered chars={len(recovered)} bytes={len(recovered.encode("utf-8"))}')
if len(recovered)<100000 or len(recovered)>600000:
    raise SystemExit('ERRO: tamanho recuperado fora da faixa segura de 100k-600k')

# Mantem o que existe no index ate a ancora esquerda e a partir da ancora direita;
# somente o miolo perdido vem do backup.
prefix=left[:lcur+len(la)]
suffix=right[rcur:]
s=prefix+recovered+suffix
if PLACEHOLDER in s or 'bytes omitted ...' in s:
    raise SystemExit('ERRO: placeholder ainda presente apos recuperacao')
print(f'index reconstruido chars={len(s)} bytes={len(s.encode("utf-8"))}')

# 2) Realoca o bloco v91.79 que havia sido inserido dentro da string de impressao.
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

# 3) Atualiza a identificacao visual.
s=s.replace('v91.82','v91.83').replace('V91.82','V91.83')

# 4) Validacoes obrigatorias antes de salvar.
for needle in ['function doLogin()','hlgbFastBootstrap9182',START,END]:
    if needle not in s:
        raise SystemExit('ERRO: trecho obrigatorio ausente: '+needle)
if s.count(START)!=1 or s.count(END)!=1:
    raise SystemExit('ERRO: bloco v91.79 duplicado depois do reparo')

# O bloco que contem doLogin deve ser JavaScript valido.
pat=re.compile(r'<script(?:\s[^>]*)?>(.*?)</script\s*>',re.I|re.S)
login=[m.group(1) for m in pat.finditer(s) if 'function doLogin()' in m.group(1)]
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

# A pagina de impressao deve fechar antes de continuar o codigo principal.
pos_print=s.find('function printCustomerNote')
pos_sync=s.find('function syncFinalizedCutsToProduction',pos_print)
segment=s[pos_print:pos_sync if pos_sync>pos_print else pos_print+250000]
if '</body></html>`);' not in segment:
    raise SystemExit('ERRO: fechamento da pagina de impressao nao foi recomposto')

INDEX.write_text(s,encoding='utf-8')
print('PASS v91.83: trecho truncado recuperado, bloco v91.79 realocado e login validado')
