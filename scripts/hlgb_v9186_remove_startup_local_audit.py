from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')
before=len(s)
marker='HLGB v91.54 READ-ONLY BROWSER LOCAL PAYROLL RECOVERY'

# A ferramenta v91.54 pode permanecer no arquivo para uso manual, mas NUNCA
# deve iniciar sozinha no carregamento normal. Era isso que travava o Chrome.
exact="if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();"
replacement="/* HLGB v91.86: auditoria local v91.54 disponível somente sob comando manual; auto-start desativado */"
count=0
if exact in s:
    count=s.count(exact)
    s=s.replace(exact,replacement)
else:
    pat=re.compile(r"if\s*\(\s*document\.readyState\s*===\s*['\"]loading['\"]\s*\)\s*document\.addEventListener\(\s*['\"]DOMContentLoaded['\"]\s*,\s*start\s*,\s*\{\s*once\s*:\s*true\s*\}\s*\)\s*;\s*else\s+start\(\)\s*;",re.I)
    s,count=pat.subn(replacement,s)

if marker in s and count < 1 and replacement not in s:
    raise SystemExit('Auditoria v91.54 presente, mas não foi possível localizar seu auto-start; abortando')

# Garante que a sequência automática não permaneceu ativa.
if exact in s:
    raise SystemExit('Auto-start v91.54 ainda presente; abortando')

# Atualiza apenas rótulos de versão visíveis/atuais, sem alterar nomes históricos
# de scripts ou marcadores antigos.
s=re.sub(r'Versão\s+v91\.\d+', 'Versão v91.86', s)
s=re.sub(r'v91\.\d+\s+Multiusuário', 'v91.86 Multiusuário', s)

# Marcador independente para a automação poder confirmar a versão mesmo se a UI
# antiga não tiver um dos rótulos acima.
ver_marker='<!-- HLGB_STABILITY_V9186 -->'
if ver_marker not in s:
    pos=s.rfind('</body>')
    if pos < 0:
        raise SystemExit('Fechamento </body> ausente; abortando')
    s=s[:pos]+ver_marker+'\n'+s[pos:]

# Guardas essenciais de integridade.
for required in ['function doLogin()', 'HLGB_SUPABASE_URL', '</body>', '</html>']:
    if required not in s:
        raise SystemExit('Trecho essencial ausente após patch: '+required)
if '329474 bytes omitted' in s:
    raise SystemExit('index.html contém marcador de truncamento; abortando')
if len(s) < 1000000:
    raise SystemExit('index.html ficou pequeno demais; abortando por segurança')

p.write_text(s,encoding='utf-8')
print(f'OK v91.86: {count} auto-start(s) pesado(s) desativado(s). Bytes: {before} -> {len(s)}')
