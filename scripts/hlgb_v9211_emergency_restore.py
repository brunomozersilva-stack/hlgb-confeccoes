from pathlib import Path
import subprocess

BASE='0dfc49d05286ed8e564cb5ddee4f22c8b168ac63'
html=subprocess.check_output(['git','show',f'{BASE}:index.html'],text=True)

# Corrige falsos negativos de nuvem causados por variáveis globais léxicas (let),
# sem adicionar nenhum bloco novo dentro do HTML.
html=html.replace("typeof window.hlgbRecordReady!=='undefined'&&!window.hlgbRecordReady","typeof hlgbRecordReady!=='undefined'&&!hlgbRecordReady")
html=html.replace("!window.cloudAccessToken","!(typeof cloudAccessToken!=='undefined'&&cloudAccessToken)")

# Identificação visual desta restauração emergencial.
html=html.replace('v92.09','v92.11')

if 'HLGB_V9210_START' in html or 'HLGB_V9210_END' in html:
    raise SystemExit('Bloco quebrado v92.10 ainda presente')
if '!window.cloudAccessToken' in html:
    raise SystemExit('Checagem incorreta window.cloudAccessToken ainda presente')
if "typeof window.hlgbRecordReady!=='undefined'&&!window.hlgbRecordReady" in html:
    raise SystemExit('Checagem incorreta window.hlgbRecordReady ainda presente')

Path('index.html').write_text(html,encoding='utf-8')

abrir='''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<title>Abrindo HLGB Confecções v92.11</title>
<style>body{font-family:Arial,sans-serif;background:#fbf6f8;color:#30262c;display:grid;place-items:center;min-height:100vh;margin:0}.box{background:#fff;padding:28px;border-radius:16px;box-shadow:0 6px 24px #0001;text-align:center;max-width:420px}a{display:inline-block;margin-top:14px;padding:12px 18px;border-radius:9px;background:#6f3f59;color:#fff;text-decoration:none;font-weight:700}</style>
<script>
(function(){
  var target='./?v=92.11&fresh='+Date.now();
  window.location.replace(target);
})();
</script>
</head>
<body><div class="box"><h2>HLGB Confecções</h2><p>Abrindo a versão 92.11 mais recente do sistema…</p><a href="./?v=92.11&fresh=manual">Abrir agora</a></div></body>
</html>
'''
Path('abrir.html').write_text(abrir,encoding='utf-8')
print('HLGB v92.11 restaurada a partir da v92.09 estável e checagens de nuvem corrigidas.')
