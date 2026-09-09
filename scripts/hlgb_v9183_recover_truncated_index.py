from pathlib import Path
import re, subprocess, tempfile

INDEX=Path('index.html')
GOOD_SHA='b8608fb4ced59e084a73c037a724b3b4ff557404'  # v91.77, ultima versao sem o placeholder
PLACEHOLDER='... 329474 bytes omitted ...'
START='<!-- HLGB_V9179_START -->'
END='<!-- HLGB_V9179_END -->'

s=INDEX.read_text(encoding='utf-8')
good=subprocess.check_output(['git','show',f'{GOOD_SHA}:index.html']).decode('utf-8')
print(f'index bytes={len(s.encode("utf-8"))} good(v91.77) bytes={len(good.encode("utf-8"))}')

count=s.count(PLACEHOLDER)
print('placeholder count=',count)
if count!=1:
    raise SystemExit(f'ERRO: esperado exatamente 1 placeholder de truncamento, encontrado {count}')
pos=s.index(PLACEHOLDER)
left=s[:pos]
right=s[pos+len(PLACEHOLDER):]

# Procura, de cada lado do trecho perdido, linhas completas que existam uma unica
# vez no index atual e na ultima versao integra (v91.77). Assim preservamos todas
# as alteracoes posteriores que ficaram fora do trecho perdido.
def nearest_left_anchor(text, source, max_lines=1000):
    lines=text.splitlines(keepends=True)
    start=max(0,len(lines)-max_lines)
    for i in range(len(lines)-1,start-1,-1):
        for k in (5,4,3,2,1):
            a=max(start,i-k+1)
            cand=''.join(lines[a:i+1])
            if len(cand.strip())<40: continue
            if text.count(cand)==1 and source.count(cand)==1:
                return cand,text.rfind(cand),source.index(cand)
    return None,None,None

def nearest_right_anchor(text, source, max_lines=1000):
    lines=text.splitlines(keepends=True)
    stop=min(len(lines),max_lines)
    for i in range(stop):
        for k in (5,4,3,2,1):
            cand=''.join(lines[i:min(stop,i+k)])
            if len(cand.strip())<40: continue
            if text.count(cand)==1 and source.count(cand)==1:
                return cand,text.find(cand),source.index(cand)
    return None,None,None

la,lcur,lgood=nearest_left_anchor(left,good)
ra,rcur,rgood=nearest_right_anchor(right,good)
print(f'left anchor current={lcur} good={lgood}')
print(f'right anchor current={rcur} good={rgood}')
if not la or not ra:
    raise SystemExit('ERRO: nao foi possivel localizar ancoras seguras na v91.77')

start=lgood+len(la)
end=rgood
if end<=start:
    raise SystemExit(f'ERRO: ancoras invertidas na v91.77: {start} >= {end}')
recovered=good[start:end]
print(f'recovered chars={len(recovered)} bytes={len(recovered.encode("utf-8"))}')
if len(recovered)<200000 or len(recovered)>450000:
    raise SystemExit('ERRO: tamanho recuperado fora da faixa segura de 200k-450k')

prefix=left[:lcur+len(la)]
suffix=right[rcur:]
s=prefix+recovered+suffix
if PLACEHOLDER in s or 'bytes omitted ...' in s:
    raise SystemExit('ERRO: placeholder ainda presente apos recuperacao')
print(f'index reconstruido bytes={len(s.encode("utf-8"))}')

# O bloco v91.79 foi inserido dentro da string de impressao de nota. Retira dali
# e move para o final real do documento.
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

# Atualiza a identificacao da versao publicada.
s=s.replace('v91.82','v91.83').replace('V91.82','V91.83')

for needle in ['function doLogin()','hlgbFastBootstrap9182',START,END]:
    if needle not in s:
        raise SystemExit('ERRO: trecho obrigatorio ausente: '+needle)
if s.count(START)!=1 or s.count(END)!=1:
    raise SystemExit('ERRO: bloco v91.79 duplicado depois do reparo')

# Valida sintaxe do script principal. Se falhar, index.html nao sera publicado.
pat=re.compile(r'<script(?:\s[^>]*)?>(.*?)</script\s*>',re.I|re.S)
login=[m.group(1) for m in pat.finditer(s) if 'function doLogin()' in m.group(1)]
print('login script blocks=',len(login))
if len(login)!=1:
    raise SystemExit(f'ERRO: esperado 1 bloco de script contendo doLogin, encontrado {len(login)}')
js=Path(tempfile.gettempdir())/'hlgb_v9183_main.js'
js.write_text(login[0],encoding='utf-8')
r=subprocess.run(['node','--check',str(js)],capture_output=True,text=True)
if r.returncode!=0:
    print(r.stderr or r.stdout)
    raise SystemExit('ERRO: JavaScript principal ainda contem erro de sintaxe')
print('PASS node --check do script principal')

# A pagina de impressao deve voltar a fechar antes do proximo bloco funcional.
pos_print=s.find('function printCustomerNote')
pos_sync=s.find('function syncFinalizedCutsToProduction',pos_print)
segment=s[pos_print:pos_sync if pos_sync>pos_print else pos_print+250000]
if '</body></html>`);' not in segment:
    raise SystemExit('ERRO: fechamento da pagina de impressao nao foi recomposto')

INDEX.write_text(s,encoding='utf-8')
print('PASS v91.83: trecho perdido recuperado da v91.77, bloco v91.79 realocado e login validado')
