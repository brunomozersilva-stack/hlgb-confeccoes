from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')
before=len(s)

old=("function boot955(){mount955();install955();wrapGeneric955();mergeIdb955().then(()=>{update955();setTimeout(()=>flush955(false),700)});try{if(navigator.storage?.persisted)navigator.storage.persisted().then(x=>{storagePersistent955=x;update955()});if(navigator.storage?.persist)navigator.storage.persist().then(x=>{storagePersistent955=x;update955()})}catch(_){}installTimer955=setInterval(()=>{install955();wrapGeneric955();update955();if(count955())flush955(false)},5000);window.addEventListener('online',()=>flush955(false));window.addEventListener('focus',()=>flush955(false));document.addEventListener('visibilitychange',()=>{if(!document.hidden)flush955(false)});window.addEventListener('beforeunload',e=>{if(count955()>0){e.preventDefault();e.returnValue=''}})}")

new=("let bootStarted955=false,bootWaitTimer955=null;\n"
"function startActive955(){\n"
" if(bootStarted955)return true;\n"
" if(typeof cloudAccessToken==='undefined'||!cloudAccessToken)return false;\n"
" bootStarted955=true;\n"
" mount955();install955();wrapGeneric955();\n"
" mergeIdb955().then(()=>{update955();setTimeout(()=>flush955(false),700)}).catch(()=>{});\n"
" try{if(navigator.storage?.persisted)navigator.storage.persisted().then(x=>{storagePersistent955=x;update955()});if(navigator.storage?.persist)navigator.storage.persist().then(x=>{storagePersistent955=x;update955()})}catch(_){}\n"
" installTimer955=setInterval(()=>{install955();wrapGeneric955();update955();if(count955())flush955(false)},5000);\n"
" window.addEventListener('online',()=>flush955(false));window.addEventListener('focus',()=>flush955(false));document.addEventListener('visibilitychange',()=>{if(!document.hidden)flush955(false)});window.addEventListener('beforeunload',e=>{if(count955()>0){e.preventDefault();e.returnValue=''}});\n"
" return true;\n"
"}\n"
"function boot955(){\n"
" if(startActive955())return;\n"
" try{document.getElementById('hlgb955SaveBadge')?.remove()}catch(_){}\n"
" if(bootWaitTimer955)return;\n"
" bootWaitTimer955=setInterval(()=>{\n"
"   try{if(typeof cloudAccessToken!=='undefined'&&cloudAccessToken){clearInterval(bootWaitTimer955);bootWaitTimer955=null;startActive955()}}catch(_){}\n"
" },1000);\n"
"}\n")

if old not in s:
    if 'let bootStarted955=false,bootWaitTimer955=null;' not in s:
        raise SystemExit('Bloco boot955 esperado não localizado; abortando sem alterar index')
else:
    s=s.replace(old,new,1)

# Atualiza rótulos visíveis sem tocar em marcadores históricos.
s=re.sub(r'Versão\s+v91\.\d+', 'Versão v91.87', s)
s=re.sub(r'v91\.\d+\s+Multiusuário', 'v91.87 Multiusuário', s)

marker='<!-- HLGB_STABILITY_V9187_DEFER_WAL_UNTIL_AUTH -->'
if marker not in s:
    pos=s.rfind('</body>')
    if pos<0: raise SystemExit('</body> ausente')
    s=s[:pos]+marker+'\n'+s[pos:]

# Guardas: o WAL continua existente, mas não pode executar carga pesada antes de token.
for required in ['function doLogin()', 'HLGB_SUPABASE_URL', 'async function mergeIdb955()', 'function startActive955()', 'function boot955()', marker, '</body>', '</html>']:
    if required not in s: raise SystemExit('Trecho essencial ausente: '+required)
if old in s: raise SystemExit('Boot antigo ainda presente')
if '329474 bytes omitted' in s: raise SystemExit('index truncado')
if len(s)<1000000: raise SystemExit('index pequeno demais; abortando')

p.write_text(s,encoding='utf-8')
print(f'OK v91.87: WAL/IndexedDB adiado até autenticação. Bytes {before} -> {len(s)}')
