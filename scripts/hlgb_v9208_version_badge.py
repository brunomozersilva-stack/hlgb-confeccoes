from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Corrige o observador antigo da v91.90 que ficava forçando o selo do cabeçalho
old="hlgbAfterLogin(()=>{let ver=document.querySelector('#appShell .logo small');if(ver&&window.MutationObserver)new MutationObserver(setVersion9185).observe(ver,{childList:true,characterData:true,subtree:true});},0);"
if old in s:
    s=s.replace(old,"/* v92.08: observador antigo da v91.90 desativado para não sobrescrever o selo atual */")

# Atualiza identificação geral
s=s.replace('Sistema de Gestão v92.07 Multiusuário','Sistema de Gestão v92.08 Multiusuário')
s=s.replace('Versão v92.07','Versão v92.08')

marker='<!-- HLGB_V9208_VERSION_BADGE -->'
if marker not in s:
    addon=r'''\n<!-- HLGB_V9208_VERSION_BADGE -->\n<script>\n(function(){\n'use strict';\nfunction setVersion9208(){\n  try{\n    const ver=document.querySelector('#appShell .logo small');\n    if(ver)ver.textContent='v92.08';\n    const loginVersion=document.querySelector('#loginScreen .version, #loginVersion, .login-version');\n    if(loginVersion && /v\\d+/i.test(loginVersion.textContent||'')) loginVersion.textContent='Versão v92.08';\n    document.title='HLGB Confecções — Sistema de Gestão v92.08 Multiusuário';\n  }catch(e){}\n}\nif(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(setVersion9208,50);setTimeout(setVersion9208,800);setTimeout(setVersion9208,2500);},0);\ndocument.addEventListener('DOMContentLoaded',()=>setTimeout(setVersion9208,50));\nsetTimeout(setVersion9208,500);\nconsole.log('[HLGB] v92.08 selo de versão corrigido');\n})();\n</script>\n'''
    s=s.replace('</body>',addon+'\n</body>')

p.write_text(s,encoding='utf-8')
print('v92.08 version badge patch applied')
