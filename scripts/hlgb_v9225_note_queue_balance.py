from pathlib import Path
src=Path('app9224.html')
out=Path('app9225.html')
s=src.read_text(encoding='utf-8')
old="if(x.source==='Planejamento'&&x.orderId!=null)"
new="if(x.orderId!=null&&x.itemKey!=null&&x.sourceType!=='resale')"
if old not in s:
    raise SystemExit('Condição antiga da fila de notas não encontrada')
s=s.replace(old,new,1)
addon=r'''<!-- HLGB_V9225_NOTE_QUEUE_BALANCE_START -->
<script>
(function(){
'use strict';
function setVersion9225(){let el=document.querySelector('#appShell .logo small');if(el)el.textContent='v92.25'}
hlgbAfterLogin(()=>{setTimeout(setVersion9225,250);setTimeout(setVersion9225,1600)},0);
console.log('[HLGB] v92.25 saldo da montagem é baixado ao criar a nota para qualquer item de pedido');
})();
</script>
<!-- HLGB_V9225_NOTE_QUEUE_BALANCE_END -->'''
pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento body não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('<title>HLGB Confecções — Sistema de Gestão v92.24 Multiusuário</title>','<title>HLGB Confecções — Sistema de Gestão v92.25 Multiusuário</title>')
out.write_text(s,encoding='utf-8')
Path('abrir.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.25</title><script>(function(){window.location.replace('./app9225.html?v=92.25&fresh='+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>''',encoding='utf-8')
print('v92.25 preparada')