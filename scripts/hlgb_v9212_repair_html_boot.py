from pathlib import Path
import re, subprocess

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Remove TODOS os blocos de selo v92.08 inseridos anteriormente dentro de templates de impressão.
# Esses blocos continham </script> literal dentro de outro <script>, o que interrompia o JavaScript do navegador.
marker='<!-- HLGB_V9208_VERSION_BADGE -->'
removed=0
while marker in s:
    a=s.index(marker)
    b=s.find('</script>', a)
    if b < 0:
        raise SystemExit('Marcador v92.08 sem fechamento de script')
    b += len('</script>')
    # remove também barras de continuação e quebras imediatamente adjacentes
    start=a
    while start>0 and s[start-1] in '\\n\\r\\':
        start-=1
    end=b
    while end < len(s) and s[end] in '\\n\\r\\':
        end+=1
    s=s[:start] + '\n' + s[end:]
    removed += 1

# Remove eventual bloco v92.10 que não deve existir mais.
start='<!-- HLGB_V9210_START -->'; end='<!-- HLGB_V9210_END -->'
while start in s:
    a=s.index(start); b=s.find(end,a)
    if b<0: raise SystemExit('Bloco v92.10 incompleto')
    s=s[:a] + s[b+len(end):]

# Corrige referências incorretas ao token no objeto window. O token real é variável do módulo principal.
s=s.replace('!window.cloudAccessToken', "!(typeof cloudAccessToken!=='undefined'&&cloudAccessToken)")

# Versão visual estática, sem observadores nem injeções em templates.
s=re.sub(r'<title>HLGB Confecções — Sistema de Gestão v[0-9.]+ Multiusuário</title>', '<title>HLGB Confecções — Sistema de Gestão v92.12 Multiusuário</title>', s, count=1)
s=s.replace('Versão v91.90</b>', 'Versão v92.12</b>', 1)
s=s.replace('>v92.04</small>', '>v92.12</small>', 1)

# Injeta um selo final SOMENTE antes do último </body>, nunca dentro de templates de impressão.
addon='''\n<!-- HLGB_V9212_BOOT_REPAIR -->\n<script>\n(function(){\n  function v(){\n    try{\n      var a=document.querySelector('#appShell .logo small'); if(a)a.textContent='v92.12';\n      var b=document.querySelector('#loginScreen b'); if(b && /Versão v/i.test(b.textContent||''))b.textContent='Versão v92.12';\n      document.title='HLGB Confecções — Sistema de Gestão v92.12 Multiusuário';\n    }catch(e){}\n  }\n  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',v,{once:true}); else v();\n  try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(function(){setTimeout(v,50)},0)}catch(e){}\n})();\n</script>\n'''
pos=s.rfind('</body>')
if pos<0: raise SystemExit('Sem fechamento </body> final')
s=s[:pos]+addon+s[pos:]

# Validações estruturais obrigatórias.
required=['id="loginUser"','id="loginPass"','onclick="return doLogin()"','function doLogin','HLGB_V9200_START','HLGB_V9201_START','HLGB_V9202_START','HLGB_V9209_START','HLGB_V9212_BOOT_REPAIR']
missing=[x for x in required if x not in s]
if missing: raise SystemExit('Itens essenciais ausentes: '+repr(missing))
if marker in s or 'HLGB_V9210_START' in s:
    raise SystemExit('Bloco quebrado ainda presente')

p.write_text(s,encoding='utf-8')
# URL totalmente nova para furar cache do Safari/Chrome.
Path('app9212.html').write_text(s,encoding='utf-8')
Path('abrir.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB v92.12</title><script>location.replace('./app9212.html?v=92.12&fresh='+Date.now())</script></head><body>Abrindo HLGB Confecções v92.12…</body></html>''',encoding='utf-8')
print('v92.12 preparado; blocos de selo removidos:',removed)
