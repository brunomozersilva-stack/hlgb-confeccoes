from pathlib import Path
import subprocess,re

STABLE='8414bf2b308e9a2731da0bca06e6c60771ec6451'
# Busca exatamente a versão que a usuária conseguiu abrir normalmente (v92.07).
subprocess.run(['git','fetch','origin',STABLE,'--depth=1'],check=True)
raw=subprocess.check_output(['git','show','FETCH_HEAD:index.html'])
s=raw.decode('utf-8')

# Correção segura da checagem de token usada por rotinas antigas.
s=s.replace('!window.cloudAccessToken', "!(typeof cloudAccessToken!=='undefined'&&cloudAccessToken)")

# Apenas textos estáticos de versão; nada de injetar scripts dentro do HTML.
s=re.sub(r'<title>HLGB Confecções — Sistema de Gestão v[0-9.]+ Multiusuário</title>', '<title>HLGB Confecções — Sistema de Gestão v92.13 Multiusuário</title>', s, count=1)
s=s.replace('Versão v91.90</b>','Versão v92.13</b>',1)
s=s.replace('>v92.04</small>','>v92.13</small>',1)

required=['id="loginUser"','id="loginPass"','onclick="return doLogin()"','function doLogin','HLGB_V9200_START','HLGB_V9201_START','HLGB_V9202_START','HLGB_V9206_FREEZE_FIX']
miss=[x for x in required if x not in s]
if miss: raise SystemExit('Versão estável sem itens essenciais: '+repr(miss))
if 'HLGB_V9208_VERSION_BADGE' in s or 'HLGB_V9209_START' in s or 'HLGB_V9210_START' in s:
    raise SystemExit('Fonte estável contaminada por atualização posterior')

Path('index.html').write_text(s,encoding='utf-8')
Path('app9213.html').write_text(s,encoding='utf-8')
Path('abrir.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB v92.13</title><script>location.replace('./app9213.html?v=92.13&fresh='+Date.now())</script></head><body>Abrindo HLGB Confecções v92.13…</body></html>''',encoding='utf-8')
print('v92.13 montada a partir da v92.07 estável')
