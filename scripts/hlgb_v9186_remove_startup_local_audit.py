from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
addon_path=Path('scripts/hlgb_v9154_browser_local_recovery_addon.html')
addon=addon_path.read_text(encoding='utf-8')
marker='HLGB v91.54 READ-ONLY BROWSER LOCAL PAYROLL RECOVERY'

before=len(s)
removed=False
if addon in s:
    s=s.replace(addon,'',1)
    removed=True
elif marker in s:
    # Fallback conservador: remove somente o bloco marcado da ferramenta v91.54.
    start=s.find('<!-- HLGB v91.54 READ-ONLY BROWSER LOCAL PAYROLL RECOVERY -->')
    script_start=s.find('<script>', start)
    script_end=s.find('</script>', script_start)
    if start < 0 or script_start < 0 or script_end < 0:
        raise SystemExit('Bloco v91.54 incompleto; abortando sem alterar index')
    script_end += len('</script>')
    s=s[:start]+s[script_end:]
    removed=True
else:
    print('Aviso: auditoria v91.54 já não está presente no index')

# A ferramenta não pode mais existir nem iniciar no carregamento normal.
for forbidden in [
    marker,
    'hlgb954LocalAudit',
    'hlgb954RunLocalAudit',
    'setTimeout(run954,700)',
    'function scanIndexedDB(out)'
]:
    if forbidden in s:
        raise SystemExit('Ainda existe trecho da auditoria local pesada: '+forbidden)

# Atualiza a identificação visual da versão atual.
s=s.replace('v91.85','v91.86').replace('V91.85','V91.86')

# Guardas essenciais de integridade.
for required in ['function doLogin()', 'HLGB_SUPABASE_URL', '</body>', '</html>']:
    if required not in s:
        raise SystemExit('Trecho essencial ausente após patch: '+required)
if '329474 bytes omitted' in s:
    raise SystemExit('index.html contém marcador de truncamento; abortando')
if len(s) < 500000:
    raise SystemExit('index.html ficou pequeno demais; abortando por segurança')

p.write_text(s,encoding='utf-8')
print(f'OK v91.86: auditoria automática removida={removed}. Bytes: {before} -> {len(s)}')
