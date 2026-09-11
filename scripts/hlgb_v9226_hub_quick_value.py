from pathlib import Path

src=Path('app9225.html')
out=Path('app9226.html')
s=src.read_text(encoding='utf-8')

old_help="Altere somente a data e se já foi ${entrada?'recebido':'pago'}."
new_help="Altere a data, o valor e se já foi ${entrada?'recebido':'pago'}."
if old_help not in s:
    raise SystemExit('Texto do editor rápido do Hub não encontrado')
s=s.replace(old_help,new_help,1)

old_status='<div class="field"><label>Status</label><select id="hubQuickStatus9185">'
new_status='<div class="field"><label>Valor</label><input id="hubQuickValue9185" type="number" min="0" step="0.01" value="${(+e.value||0).toFixed(2)}"></div>'+old_status
if old_status not in s:
    raise SystemExit('Campo de status do editor rápido não encontrado')
s=s.replace(old_status,new_status,1)

old_save="let st=document.getElementById('hubQuickStatus9185')?.value||'Previsto',date=document.getElementById('hubQuickDate9185')?.value||due9185(e),next={...e,date,status:st,updatedAt:new Date().toISOString()};"
new_save="let st=document.getElementById('hubQuickStatus9185')?.value||'Previsto',date=document.getElementById('hubQuickDate9185')?.value||due9185(e),value=Number(document.getElementById('hubQuickValue9185')?.value);if(!Number.isFinite(value)||value<0){if(btn){btn.disabled=false;btn.textContent='☁️ Salvar alteração'}alert('Informe um valor válido.');return}let next={...e,date,value:+value.toFixed(2),status:st,updatedAt:new Date().toISOString()};"
if old_save not in s:
    raise SystemExit('Gravação do editor rápido não encontrada')
s=s.replace(old_save,new_save,1)

old_sub='Edite a data ou marque Pago/Recebido diretamente aqui.'
new_sub='Edite a data, o valor ou marque Pago/Recebido diretamente aqui.'
if old_sub not in s:
    raise SystemExit('Subtítulo do Hub não encontrado')
s=s.replace(old_sub,new_sub,1)

addon=r'''<!-- HLGB_V9226_HUB_QUICK_VALUE_START -->
<script>
(function(){
'use strict';
function setVersion9226(){let el=document.querySelector('#appShell .logo small');if(el)el.textContent='v92.26'}
hlgbAfterLogin(()=>{setTimeout(setVersion9226,250);setTimeout(setVersion9226,1600)},0);
console.log('[HLGB] v92.26 editor rápido do Hub permite alterar data, valor e status');
})();
</script>
<!-- HLGB_V9226_HUB_QUICK_VALUE_END -->'''
pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento body não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('<title>HLGB Confecções — Sistema de Gestão v92.25 Multiusuário</title>','<title>HLGB Confecções — Sistema de Gestão v92.26 Multiusuário</title>')
out.write_text(s,encoding='utf-8')
Path('abrir.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.26</title><script>(function(){window.location.replace('./app9226.html?v=92.26&fresh='+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>''',encoding='utf-8')
print('v92.26 preparada')