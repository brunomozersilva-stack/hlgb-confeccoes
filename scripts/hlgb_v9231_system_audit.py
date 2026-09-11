from pathlib import Path
import re

SRC=Path('app9230.html')
OUT=Path('app9231.html')
s=SRC.read_text(encoding='utf-8')
VER='92.31'

# 1) Versão visual: vários blocos antigos ainda regravavam v92.22/v92.13 no cabeçalho.
s=re.sub(r'<title>HLGB Confecções — Sistema de Gestão v\d+\.\d+ Multiusuário</title>',f'<title>HLGB Confecções — Sistema de Gestão v{VER} Multiusuário</title>',s)
s=re.sub(r'(<div id="appShell"[^>]*>.*?<div class="logo">HLGB <b>CONFECÇÕES</b> <small[^>]*>)v\d+\.\d+(</small>)',rf'\1v{VER}\2',s,count=1,flags=re.S)
s=re.sub(r"(document\.title\s*=\s*['\"]HLGB Confecções — Sistema de Gestão )v\d+\.\d+( Multiusuário['\"])",rf'\1v{VER}\2',s)
s=re.sub(r"(\.textContent\s*=\s*['\"])v\d+\.\d+(['\"])",rf'\1v{VER}\2',s)
s=re.sub(r"(\.textContent\s*!==\s*['\"])v\d+\.\d+(['\"])",rf'\1v{VER}\2',s)

# 2) Corrige verificações antigas de variáveis top-level `let` que não existem em window.
s=s.replace("const appOpen9189=()=>document.getElementById('appShell')?.style.display==='block'&&!!(window.cloudUser||window.cloudAccessToken);",
            "const appOpen9189=()=>document.getElementById('appShell')?.style.display==='block'&&!!((typeof cloudUser!=='undefined'&&cloudUser)||(typeof cloudAccessToken!=='undefined'&&cloudAccessToken));")
s=s.replace("typeof window.hlgbRecordReady!=='undefined'&&!window.hlgbRecordReady","typeof hlgbRecordReady!=='undefined'&&!hlgbRecordReady")
s=s.replace("if(!window.hlgbRecordReady&&typeof hlgbEnsureRecordsOnlineAfterLogin==='function')","if(!(typeof hlgbRecordReady!=='undefined'&&hlgbRecordReady)&&typeof hlgbEnsureRecordsOnlineAfterLogin==='function')")
old_ready="function cloudReady955(){try{const tokenReady=((typeof cloudAccessToken!=='undefined'&&!!cloudAccessToken)||!!(typeof cloudAccessToken!=='undefined'&&cloudAccessToken));const recordsReady=((typeof hlgbRecordReady!=='undefined'&&!!hlgbRecordReady)||!!window.hlgbRecordReady);return !!(navigator.onLine!==false&&tokenReady&&recordsReady&&typeof rawSave955==='function')}catch(e){return false}}"
new_ready="function cloudReady955(){try{const tokenReady=(typeof cloudAccessToken!=='undefined'&&!!cloudAccessToken);const recordsReady=(typeof hlgbRecordReady!=='undefined'&&!!hlgbRecordReady);return !!(navigator.onLine!==false&&tokenReady&&recordsReady&&typeof rawSave955==='function')}catch(e){return false}}"
if old_ready in s:s=s.replace(old_ready,new_ready)

# 3) Fila local de segurança: recuperação ativa e mais rápida quando a sessão oscila.
old_timer="installTimer955=setInterval(()=>{install955();wrapGeneric955();update955();if(count955())flush955(false)},5000);"
new_timer="installTimer955=setInterval(async()=>{install955();wrapGeneric955();update955();if(count955()){try{if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false)}catch(_){}try{if(typeof hlgbRecordReady!=='undefined'&&!hlgbRecordReady&&typeof hlgbEnsureRecordsOnlineAfterLogin==='function')await hlgbEnsureRecordsOnlineAfterLogin()}catch(_){}await flush955(false)}},2500);"
if old_timer not in s: raise SystemExit('Timer WAL v91.55 não encontrado')
s=s.replace(old_timer,new_timer,1)
s=s.replace("b.className='wait';b.textContent=`⏳ ${n} aguardando nuvem`;b.title='As alterações estão protegidas no diário local e serão reenviadas.'",
            "b.className='wait';b.textContent=`☁️ Salvando ${n} alteração(ões)…`;b.title='A alteração está protegida localmente e o sistema está confirmando no Supabase.'")

# 4) Carimbo final leve. Sem MutationObserver para não criar loop de renderização.
addon=f'''\n<!-- HLGB_V9231_SYSTEM_AUDIT_START -->\n<script>\n(function(){{\n'use strict';\nconst CURRENT9231='v{VER}';\nfunction stamp9231(){{\n  try{{document.title='HLGB Confecções — Sistema de Gestão '+CURRENT9231+' Multiusuário'}}catch(e){{}}\n  try{{const x=document.querySelector('#appShell .logo small');if(x&&x.textContent!==CURRENT9231)x.textContent=CURRENT9231}}catch(e){{}}\n}}\nfunction healCloud9231(){{\n  try{{stamp9231();if(typeof window.hlgb955PendingCount==='function'&&window.hlgb955PendingCount()>0){{\n    Promise.resolve(typeof cloudEnsureFreshSession==='function'?cloudEnsureFreshSession(false):null).catch(()=>{{}}).finally(()=>{{\n      try{{if(typeof hlgbRecordReady!=='undefined'&&!hlgbRecordReady&&typeof hlgbEnsureRecordsOnlineAfterLogin==='function')hlgbEnsureRecordsOnlineAfterLogin().catch(()=>{{}})}}catch(e){{}}\n      setTimeout(()=>{{try{{window.hlgb955FlushNow?.()}}catch(e){{}}}},250);\n    }});\n  }}}}catch(e){{}}\n}}\nif(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{{setTimeout(stamp9231,80);setTimeout(healCloud9231,1200)}},0);\nwindow.addEventListener('focus',()=>setTimeout(healCloud9231,120));\ndocument.addEventListener('visibilitychange',()=>{{if(!document.hidden)setTimeout(healCloud9231,120)}});\nsetInterval(()=>{{try{{stamp9231()}}catch(e){{}}}},15000);\nconsole.log('[HLGB] v92.31 pente fino de versão e estabilidade da nuvem carregado');\n}})();\n</script>\n<!-- HLGB_V9231_SYSTEM_AUDIT_END -->\n'''
pos=s.rfind('</body>')
if pos<0: raise SystemExit('</body> não encontrado')
s=s[:pos]+addon+s[pos:]

# 5) Lançador sem cache.
Path('abrir.html').write_text(f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v{VER}</title><script>(function(){{window.location.replace('./app9231.html?v={VER}&fresh='+Date.now())}})();</script></head><body>Abrindo HLGB...</body></html>''',encoding='utf-8')

OUT.write_text(s,encoding='utf-8')
print('v92.31 criada: versão unificada, readiness lexical corrigido, WAL com recuperação rápida e carimbo final leve.')
