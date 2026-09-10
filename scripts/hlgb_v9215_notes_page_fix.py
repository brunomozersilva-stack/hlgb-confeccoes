from pathlib import Path

src=Path('app9214.html')
out=Path('app9215.html')
s=src.read_text(encoding='utf-8')

anchor='<section id="notas" class="page"><h1>🧾 Notas prontas</h1><div class="sub">Aqui ficam os pedidos que já tiveram a nota preparada. Você pode imprimir, acompanhar o pagamento e reabrir uma nota paga.</div>'
if anchor not in s:
    raise SystemExit('Âncora da página Notas não encontrada')

central=r'''
<div class="panel" id="hlgbNotesCentral9215" style="border:2px solid #ead6df;background:#fffafb">
  <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap">
    <div><h2 style="margin:0">🧩 Montagem de notas</h2><div class="sub">Selecione vários produtos do mesmo cliente que foram enviados para Notas e gere uma única nota.</div></div>
    <button type="button" class="secondary" onclick="window.hlgbRefreshNotes9215(true)">🔄 Atualizar da nuvem</button>
  </div>
  <div id="hlgbNotesStatus9215" class="sub" style="margin-top:8px">Carregando itens aguardando nota...</div>
  <div id="hlgbNoteAssemblyHost9215" style="margin-top:10px"></div>
</div>
<div class="panel" id="hlgbNotesHistoryHostPanel9215" style="border:2px solid #ead6df;background:#fffafb">
  <h2 style="margin:0 0 6px">📚 Notas de entregas já feitas</h2>
  <div class="sub">Aqui também aparecem as notas antigas feitas pela Projeção/entrega, inclusive as da Camisola Plus Cyrlene.</div>
  <div id="hlgbNotesHistoryHost9215" style="margin-top:10px"></div>
</div>
'''

s=s.replace(anchor,anchor+central,1)

addon=r'''<!-- HLGB_V9215_NOTES_PAGE_FIX_START -->
<script>
(function(){
'use strict';
const clone9215=x=>{try{return structuredClone(x)}catch(e){return JSON.parse(JSON.stringify(x))}};
function status9215(msg,bad){const e=document.getElementById('hlgbNotesStatus9215');if(e){e.textContent=msg||'';e.style.color=bad?'#a51d2d':'#786b73'}}
async function loadExact9215(module){
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  if(typeof cloudRequest!=='function')throw new Error('Conexão com a nuvem indisponível');
  const rows=await cloudRequest('hlgb_records?select=entity_id,data,deleted_at&module=eq.'+encodeURIComponent(module)+'&order=updated_at.asc&limit=3000',{method:'GET'});
  if(!Array.isArray(rows))throw new Error('Resposta inválida da nuvem para '+module);
  const active=rows.filter(r=>!r.deleted_at&&r.data).map(r=>clone9215(r.data));
  db[module]=active;
  return active;
}
function moveHistory9215(){
  try{if(typeof window.renderNotes9214==='function')window.renderNotes9214();else if(typeof window.renderNotes9200==='function')window.renderNotes9200()}catch(e){console.warn('[HLGB 92.15] render histórico',e)}
  const host=document.getElementById('hlgbNotesHistoryHost9215');
  const panel=document.getElementById('projectionNotes9214')||document.getElementById('projectionNotes9200');
  if(host&&panel&&panel.parentElement!==host){host.innerHTML='';host.appendChild(panel)}
  if(host&&!panel)host.innerHTML='<div class="empty">A área de notas não pôde ser montada. Clique em Atualizar da nuvem.</div>';
}
function moveAssembly9215(){
  try{if(typeof window.renderNoteQueue9202==='function')window.renderNoteQueue9202()}catch(e){console.warn('[HLGB 92.15] render montagem',e)}
  const host=document.getElementById('hlgbNoteAssemblyHost9215');
  const panel=document.getElementById('noteQueue9202');
  if(host&&panel&&panel.parentElement!==host){host.innerHTML='';host.appendChild(panel)}
  if(host&&!panel)host.innerHTML='<div class="empty">Nenhum item foi enviado para a montagem de notas ainda.</div>';
}
function render9215(){moveAssembly9215();moveHistory9215()}
window.hlgbRefreshNotes9215=async function(showStatus){
  if(showStatus!==false)status9215('Atualizando diretamente da nuvem...');
  try{
    const r=await Promise.all([loadExact9215('projectionInvoices'),loadExact9215('noteQueue')]);
    render9215();
    const inv=r[0]?.length||0,q=(r[1]||[]).filter(x=>x&&x.status!=='Faturado'&&(+((x.remainingQty??x.qty)||0))>0).length;
    status9215('Nuvem atualizada: '+inv+' nota(s) de entrega e '+q+' item(ns) aguardando montagem.');
    return true;
  }catch(e){
    render9215();status9215('Não foi possível atualizar a Central de Notas: '+String(e?.message||e),true);return false;
  }
};
const oldPage9215=window.page;
if(typeof oldPage9215==='function')window.page=function(id){const r=oldPage9215.apply(this,arguments);if(String(id)==='notas')setTimeout(()=>window.hlgbRefreshNotes9215(false),60);return r};
document.addEventListener('click',function(e){const b=e.target&&e.target.closest?e.target.closest('button'):null;if(!b)return;const t=String(b.textContent||'').trim().toLowerCase();if(t.includes('notas prontas'))setTimeout(()=>window.hlgbRefreshNotes9215(false),120)},true);
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(()=>window.hlgbRefreshNotes9215(false),500),0);
setTimeout(()=>{if(document.querySelector('#notas.page.active'))window.hlgbRefreshNotes9215(false)},1200);
console.log('[HLGB] v92.15 Central de Notas fixada na página correta');
})();
</script>
<!-- HLGB_V9215_NOTES_PAGE_FIX_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]

s=s.replace('<title>HLGB Confecções — Sistema de Gestão v92.14 Multiusuário</title>','<title>HLGB Confecções — Sistema de Gestão v92.15 Multiusuário</title>')
s=s.replace('Versão v92.14</b>','Versão v92.15</b>')
s=s.replace('<small style="font-size:10px;opacity:.8">v92.14</small>','<small style="font-size:10px;opacity:.8">v92.15</small>')
out.write_text(s,encoding='utf-8')

Path('abrir.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.15</title><script>(function(){window.location.replace('./app9215.html?v=92.15&fresh='+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>''',encoding='utf-8')
print('v92.15 preparada: Central de Notas na página correta e carga direta da nuvem')
