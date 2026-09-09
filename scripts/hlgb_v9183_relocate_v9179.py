from pathlib import Path
import re, subprocess, tempfile, os, sys

p=Path('index.html')
s=p.read_text(encoding='utf-8')

START='<!-- HLGB_V9179_START -->'
END='<!-- HLGB_V9179_END -->'

if START not in s or END not in s:
    raise SystemExit('ERRO: bloco v91.79 não encontrado; abortando sem alterar index.html')

a=s.index(START)
b=s.index(END,a)+len(END)
block=s[a:b]

# Remove o bloco do local incorreto. Ele havia sido inserido dentro de uma
# template string usada por printCustomerNote, quebrando o JavaScript inteiro.
s=s[:a]+s[b:]

# Reinsere no fechamento REAL do body. Usamos rfind porque existem strings de
# impressão contendo </body> antes do fechamento efetivo do documento.
pos=s.rfind('</body>')
if pos < 0:
    raise SystemExit('ERRO: fechamento real de </body> não encontrado')
s=s[:pos]+'\n'+block+'\n'+s[pos:]

# Atualiza identificação da versão.
s=s.replace('v91.82','v91.83').replace('V91.82','V91.83')

# Garantias básicas antes de salvar.
if s.count(START)!=1 or s.count(END)!=1:
    raise SystemExit('ERRO: bloco v91.79 duplicado após realocação')
if 'function doLogin()' not in s:
    raise SystemExit('ERRO: doLogin desapareceu')
if 'hlgbFastBootstrap9182' not in s:
    raise SystemExit('ERRO: bootstrap v91.82 desapareceu')

p.write_text(s,encoding='utf-8')

# Valida especificamente o script principal que contém doLogin, usando a mesma
# estratégia do diagnóstico que revelou a falha. Este teste DEVE passar.
text=p.read_text(encoding='utf-8')
pat=re.compile(r'<script(?:\s[^>]*)?>(.*?)</script\s*>',re.I|re.S)
found=False
for i,m in enumerate(pat.finditer(text)):
    body=m.group(1)
    if 'function doLogin()' not in body:
        continue
    found=True
    tf=Path(tempfile.gettempdir())/f'hlgb_v9183_main_{i}.js'
    tf.write_text(body,encoding='utf-8')
    r=subprocess.run(['node','--check',str(tf)],capture_output=True,text=True)
    if r.returncode!=0:
        print(r.stderr)
        raise SystemExit('ERRO: JavaScript principal ainda contém erro de sintaxe')
    print('OK: JavaScript principal com doLogin passou no node --check')
    break
if not found:
    raise SystemExit('ERRO: não foi possível localizar o script principal para validação')

print('v91.83 aplicada: bloco v91.79 realocado para fora da string de impressão')
