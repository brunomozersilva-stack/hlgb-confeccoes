from pathlib import Path
import re, subprocess, tempfile

p=Path('index.html')
s=p.read_text(encoding='utf-8')
addon_path=Path('scripts/hlgb_v9154_browser_local_recovery_addon.html')
addon=addon_path.read_text(encoding='utf-8')
marker='HLGB v91.54 READ-ONLY BROWSER LOCAL PAYROLL RECOVERY'

before=len(s)
if addon in s:
    s=s.replace(addon,'',1)
elif marker in s:
    # Fallback conservador para versões onde só houve pequenas mudanças de espaço.
    # Remove do comentário marcador até o fechamento do script da ferramenta.
    start=s.find('<!-- HLGB v91.54 READ-ONLY BROWSER LOCAL PAYROLL RECOVERY -->')
    if start < 0:
        raise SystemExit('Marcador v91.54 encontrado, mas início do bloco não localizado')
    script_start=s.find('<script>', start)
    script_end=s.find('</script>', script_start)
    if script_start < 0 or script_end < 0:
        raise SystemExit('Bloco v91.54 incompleto; abortando para não alterar index parcialmente')
    script_end += len('</script>')
    s=s[:start]+s[script_end:]
else:
    print('Aviso: auditoria v91.54 já não está presente no index')

# Remove qualquer chamada residual que pudesse iniciar a varredura automaticamente.
for forbidden in [
    "setTimeout(run954,700)",
    "document.addEventListener('DOMContentLoaded',start,{once:true})",
    'hlgb954RunLocalAudit=run954'
]:
    if forbidden in s:
        raise SystemExit('Ainda existe gatilho residual da auditoria v91.54: '+forbidden)

# Atualiza somente a identificação da versão vigente.
s=s.replace('v91.85','v91.86').replace('V91.85','V91.86')

if marker in s or 'hlgb954LocalAudit' in s or 'scanIndexedDB(out)' in s:
    raise SystemExit('Auditoria local pesada v91.54 ainda presente; abortando')
if 'function doLogin()' not in s:
    raise SystemExit('doLogin ausente após patch; abortando')

p.write_text(s,encoding='utf-8')

# Valida todos os scripts inline que não sejam JSON/importmap.
text=p.read_text(encoding='utf-8')
pat=re.compile(r'<script([^>]*)>(.*?)</script\s*>',re.I|re.S)
checked=0
for i,m in enumerate(pat.finditer(text)):
    attrs=m.group(1) or ''
    body=m.group(2) or ''
    if not body.strip():
        continue
    if re.search(r'type=["\'](?:application/json|importmap)["\']',attrs,re.I):
        continue
    tf=Path(tempfile.gettempdir())/f'hlgb_v9186_{i}.js'
    tf.write_text(body,encoding='utf-8')
    r=subprocess.run(['node','--check',str(tf)],capture_output=True,text=True)
    if r.returncode!=0:
        print('Erro no script inline',i)
        print(r.stderr)
        raise SystemExit('JavaScript inválido após patch')
    checked+=1

print(f'OK v91.86: auditoria automática removida. {checked} scripts JS validados. Bytes: {before} -> {len(s)}')
