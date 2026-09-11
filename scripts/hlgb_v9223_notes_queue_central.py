from pathlib import Path

src=Path('app9222.html')
out=Path('app9223.html')
s=src.read_text(encoding='utf-8')

# Entregas de facção não criam mais nota/financeiro automaticamente: vão para noteQueue.
s=s.replace('rpc/hlgb_register_faction_delivery_v9140','rpc/hlgb_register_faction_delivery_to_note_queue_v9223')
s=s.replace("[['factions',data?.faction],['factionPayments',data?.payment],['production',data?.production],['projectionInvoices',data?.projectionInvoice],['finance',data?.finance]]",
            "[['factions',data?.faction],['factionPayments',data?.payment],['production',data?.production],['noteQueue',data?.noteQueue],['projectionInvoices',data?.projectionInvoice],['finance',data?.finance]]")
s=s.replace('entra em Entregas da projeção e gera a nota/recebimento do cliente.','entra em Montagem de notas. A nota e o recebimento só serão criados quando você usar Criar nota agrupada.')
s=s.replace('baixada na projeção e nota gerada para ${c.name}.','enviada para a Montagem de notas de ${c.name}.')
s=s.replace('renderOrderNotes();renderCapacityPlanning()','renderOrderNotes();renderCapacityPlanning();try{window.renderNoteQueue9202?.()}catch(_e){}')

addon=r'''<!-- HLGB_V9223_NOTES_QUEUE_CENTRAL_START -->
<style>
#legacyNotes9223{margin:12px 0;border:1px solid #e9d5df;background:#fffafb}
#legacyNotes9223 .cyrlene9223{background:#fff3f7}
#legacyNotes9223 .tag9223{display:inline-block;padding:3px 7px;border-radius:999px;background:#f3dbe5;color:#6f3f59;font-size:11px;font-weight:700}
#noteQueue9202 .nq9202-src{font-size:11px;color:#786b73}
</style>
<script>
(function(){
'use strict';
const q9223=v=>Math.max(0,+v||0);
const esc9223=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money9223=v=>{try{return (+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+(+v||0).toFixed(2)}};
function oldRealNotes9223(){
 return (db.projectionInvoices||[]).filter(inv=>{
   if(inv?.migratedToNoteQueueV9223)return false;
   const items=Array.isArray(inv?.items)?inv.items:[];
   return !items.some(i=>String(i?.source||'')==='faction_delivery_v9140');
 }).sort((a,b)=>String(b.issueDate||b.date||'').localeCompare(String(a.issueDate||a.date||'')));
}
function renderLegacy9223(){
 const host=document.getElementById('hlgbNotesHistoryHost9215')||document.querySelector('#notas .page-body')||document.getElementById('notas');if(!host)return;
 let box=document.getElementById('legacyNotes9223');if(!box){box=document.createElement('div');box.id='legacyNotes9223';box.className='panel';const before=document.getElementById('projectionNotes9200')||host.firstElementChild;host.insertBefore(box,before||null)}
 const list=oldRealNotes9223();
 const rows=list.map(inv=>{const names=(inv.items||[]).map(i=>i.productName).filter(Boolean).join(', '),pieces=(inv.items||[]).reduce((a,i)=>a+q9223(i.qty),0),cy=/cyrlene|celene/i.test(names);return `<tr class="${cy?'cyrlene9223':''}"><td><b>${esc9223(inv.client||'')}</b></td><td>${esc9223(inv.issueDate||inv.date||'')}</td><td>${esc9223(names)} ${cy?'<span class="tag9223">nota antiga recuperada</span>':''}</td><td>${pieces.toLocaleString('pt-BR')}</td><td>${money9223(inv.value)}</td><td>${esc9223(inv.status||'Pendente')}</td><td><button class="primary" type="button" onclick="window.openProjectionAcerto9200?.('${esc9223(inv.id)}')">💰 Acerto</button></td></tr>`}).join('');
 box.innerHTML=`<h3 style="margin-top:0">📚 Histórico antigo de notas</h3><div class="sub">Aqui ficam somente as notas que já tinham sido realmente fechadas no modo antigo. As entregas novas aparecem acima em <b>Itens aguardando nota</b> até você montar a nota agrupada.</div>${rows?`<div style="overflow:auto;margin-top:10px"><table><thead><tr><th>Cliente</th><th>Data</th><th>Produto</th><th>Peças</th><th>Total</th><th>Status</th><th>Ação</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty">Nenhuma nota antiga encontrada.</div>'}`;
}
function forceQueueCopy9223(){
 const title=document.querySelector('#noteQueue9202 .nq9202-sub');if(title)title.innerHTML='Tudo que foi entregue entra primeiro aqui. <b>Nenhuma nota é finalizada automaticamente.</b> Selecione itens do mesmo cliente e use Criar nota agrupada.';
}
const oldRefresh9223=window.hlgbRefreshNotes9215;
if(typeof oldRefresh9223==='function')window.hlgbRefreshNotes9215=async function(){const r=await oldRefresh9223.apply(this,arguments);setTimeout(()=>{try{window.renderNoteQueue9202?.();forceQueueCopy9223();renderLegacy9223()}catch(e){console.warn('[HLGB 92.23] notas',e)}},30);return r};
const oldRenderQueue9223=window.renderNoteQueue9202;
if(typeof oldRenderQueue9223==='function')window.renderNoteQueue9202=function(){const r=oldRenderQueue9223.apply(this,arguments);forceQueueCopy9223();return r};
function setVersion9223(){let el=document.querySelector('#appShell .logo small');if(el)el.textContent='v92.23'}
function boot9223(){setVersion9223();try{window.renderNoteQueue9202?.()}catch(e){};try{forceQueueCopy9223();renderLegacy9223()}catch(e){};}
hlgbAfterLogin(()=>{setTimeout(boot9223,250);setTimeout(()=>window.hlgbRefreshNotes9215?.(false),800);setTimeout(boot9223,1800)},0);
console.log('[HLGB] v92.23 entregas centralizadas na montagem de notas');
})();
</script>
<!-- HLGB_V9223_NOTES_QUEUE_CENTRAL_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('<title>HLGB Confecções — Sistema de Gestão v92.22 Multiusuário</title>','<title>HLGB Confecções — Sistema de Gestão v92.23 Multiusuário</title>')
# Troca apenas as etiquetas finais conhecidas; o bloco final força a versão após login.
s=s.replace('Abrindo HLGB Confecções v92.22','Abrindo HLGB Confecções v92.23')
out.write_text(s,encoding='utf-8')
Path('abrir.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.23</title><script>(function(){window.location.replace('./app9223.html?v=92.23&fresh='+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>''',encoding='utf-8')
print('v92.23 preparada: entrega -> montagem de notas; histórico antigo preservado')
