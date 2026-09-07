from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

old="function cloudReady955(){try{return !!(navigator.onLine!==false&&window.cloudAccessToken&&window.hlgbRecordReady&&typeof rawSave955==='function')}catch(e){return false}}"
new="function cloudReady955(){try{const tokenReady=((typeof cloudAccessToken!=='undefined'&&!!cloudAccessToken)||!!window.cloudAccessToken);const recordsReady=((typeof hlgbRecordReady!=='undefined'&&!!hlgbRecordReady)||!!window.hlgbRecordReady);return !!(navigator.onLine!==false&&tokenReady&&recordsReady&&typeof rawSave955==='function')}catch(e){return false}}"
if old not in s:
    raise SystemExit('cloudReady955 target not found')
s=s.replace(old,new,1)

s=s.replace('v91.56 Multiusuário','v91.57 Multiusuário')
s=s.replace('Versão v91.56','Versão v91.57')
s=s.replace('>v91.56<','>v91.57<')
s=s.replace("const VER955='91.56';","const VER955='91.57';",1)
s=s.replace('Segurança de gravação v91.55','Segurança de gravação v91.57')

p.write_text(s,encoding='utf-8')
print('v91.57 cloud readiness fix applied')
