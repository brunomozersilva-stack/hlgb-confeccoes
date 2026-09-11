from pathlib import Path

src=Path('app9234.html')
out=Path('app9235.html')
s=src.read_text(encoding='utf-8')
s=s.replace('v92.34','v92.35')

addon=r'''<!-- HLGB_V9235_REVENDA_NOTES_SELECTION_START -->
<style>
#revenda9235 .panel{margin-top:0}
#noteQueue9202 .hlgb9235-selection{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border:1px solid #eadde4;border-radius:999px;background:#fff8fb;font-size:12px;color:#6f3f59;font-weight:700}
#hlgbQueuePicker9235{max-height:55vh;overflow:auto;border:1px solid #eadde4;border-radius:10px;margin-top:10px}
#hlgbQueuePicker9235 thead th{position:sticky;top:0;z-index:2}
</style>
<script>
(function(){
'use strict';
const selected9235=new Set();
const q9235=v=>Math.max(0,+v||0);
const esc9235=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money9235=v=>{try{return (+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+(+v||0).toFixed(2)}};
function openQueue9235(){return (db.noteQueue||[]).filter(x=>x&&x.status!=='Faturado'&&q9235(x.remainingQty??x.qty)>0)}
function activeMap9235(){return new Map(openQueue9235().map(x=>[String(x.id),x]))}
function prune9235(){const m=activeMap9235();[...selected9235].forEach(id=>{if(!m.has(String(id)))selected9235.delete(String(id))})}
function captureChecked9235(){document.querySelectorAll('.nqSelect9202:checked').forEach(cb=>selected9235.add(String(cb.value)))}
function updateCount9235(){
  prune9235();
  const top=document.querySelector('#noteQueue9202 .nq9202-top');if(!top)return;
  let badge=top.querySelector('.hlgb9235-selection');if(!badge){badge=document.createElement('span');badge.className='hlgb9235-selection';const btn=top.querySelector('button');if(btn)btn.parentElement.insertBefore(badge,btn);else top.appendChild(badge)}
  badge.textContent=selected9235.size?`${selected9235.size} item(ns) selecionado(s)`:'Nenhum item selecionado';
}
function applySelection9235(){
  prune9235();
  document.querySelectorAll('.nqSelect9202').forEach(cb=>{cb.checked=selected9235.has(String(cb.value))});
  updateCount9235();
}
document.addEventListener('change',function(e){const cb=e.target?.closest?.('.nqSelect9202');if(!cb)return;const id=String(cb.value);if(cb.checked)selected9235.add(id);else selected9235.delete(id);updateCount9235()},true);

const baseRenderQueue9235=window.renderNoteQueue9202;
if(typeof baseRenderQueue9235==='function')window.renderNoteQueue9202=function(){
  captureChecked9235();
  const r=baseRenderQueue9235.apply(this,arguments);
  setTimeout(applySelection9235,0);
  return r;
};

function callOriginalGroup9235(){
  const active=activeMap9235();prune9235();
  document.querySelectorAll('.nqSelect9202').forEach(cb=>{cb.checked=selected9235.has(String(cb.value))&&active.has(String(cb.value))});
  if(typeof baseGroup9235==='function')return baseGroup9235();
  alert('A montagem de notas não está disponível nesta versão.');
}
function openAllQueuePicker9235(){
  const items=openQueue9235().slice().sort((a,b)=>String(a.clientName||'').localeCompare(String(b.clientName||''))||String(a.deliveryDate||'').localeCompare(String(b.deliveryDate||''))||String(a.productName||'').localeCompare(String(b.productName||'')));
  if(!items.length){alert('Não há itens aguardando montagem de nota.');return}
  const rows=items.map((x,i)=>`<tr><td><input class="pickQueue9235" data-i="${i}" type="checkbox" ${selected9235.has(String(x.id))?'checked':''}></td><td><b>${esc9235(x.clientName||'Sem cliente')}</b></td><td>${esc9235(x.productName||'Produto')}</td><td>${q9235(x.remainingQty??x.qty).toLocaleString('pt-BR')}</td><td>${money9235(x.unitPrice)}</td><td>${esc9235(x.deliveryDate||'')}</td><td>${esc9235(x.origin||x.source||'')}</td></tr>`).join('');
  openModal('Escolher itens para criar nota agrupada',`<div class="sub">Aqui aparecem <b>todos os itens que estão aguardando nota</b>. Marque vários produtos do mesmo cliente para montar uma única nota.</div><div id="hlgbQueuePicker9235"><table><thead><tr><th></th><th>Cliente</th><th>Produto</th><th>Disponível</th><th>Valor/peça</th><th>Entrega</th><th>Origem</th></tr></thead><tbody>${rows}</tbody></table></div><button type="button" class="primary modalSave">Continuar para montar a nota</button>`,()=>{
    const chosen=[...document.querySelectorAll('.pickQueue9235:checked')].map(cb=>items[+cb.dataset.i]).filter(Boolean);
    if(!chosen.length){alert('Marque pelo menos um item.');return false}
    const clients=new Set(chosen.map(x=>String(x.clientId||x.clientName||'')));if(clients.size!==1){alert('Selecione somente produtos do mesmo cliente para montar uma nota agrupada.');return false}
    selected9235.clear();chosen.forEach(x=>selected9235.add(String(x.id)));
    closeModal();
    try{window.renderNoteQueue9202?.()}catch(e){}
    applySelection9235();
    setTimeout(callOriginalGroup9235,20);
    return true;
  });
}
const baseGroup9235=window.groupNote9202;
if(typeof baseGroup9235==='function')window.groupNote9202=function(){
  captureChecked9235();prune9235();
  if(selected9235.size){applySelection9235();return callOriginalGroup9235()}
  return openAllQueuePicker9235();
};
window.hlgbOpenAllQueuePicker9235=openAllQueuePicker9235;
window.hlgbSelectedNotes9235=selected9235;

function ensureResalePage9235(){
  let sec=document.getElementById('revenda9235');
  if(!sec){
    sec=document.createElement('section');sec.id='revenda9235';sec.className='page';sec.innerHTML='<h1>Revenda / Mercadoria de terceiros</h1><div class="sub">Mercadorias compradas prontas de outros fornecedores para revender aos seus clientes.</div><div id="revendaHost9235" style="margin-top:14px"></div>';
    const fornecedores=document.getElementById('fornecedores');if(fornecedores?.parentElement)fornecedores.parentElement.insertBefore(sec,fornecedores.nextSibling);
  }
  const fbtn=[...document.querySelectorAll('.nav-submenu button')].find(b=>String(b.textContent||'').trim()==='Fornecedores');
  if(fbtn&&!document.getElementById('revendaNav9235')){
    const b=document.createElement('button');b.id='revendaNav9235';b.type='button';b.textContent='🛍️ Revenda / Mercadoria de terceiros';b.onclick=function(){window.hlgbOpenResale9235(b)};fbtn.insertAdjacentElement('afterend',b);
  }
  return sec;
}
function moveResale9235(){
  ensureResalePage9235();
  try{window.hlgbRenderResale9224?.()}catch(e){console.warn('[HLGB 92.35] render revenda',e)}
  const panel=document.getElementById('resalePanel9224'),host=document.getElementById('revendaHost9235');
  if(panel&&host&&panel.parentElement!==host)host.appendChild(panel);
  if(host&&!panel)host.innerHTML='<div class="empty">A área de revenda não pôde ser carregada. Atualize/sincronize e tente novamente.</div>';
}
window.hlgbOpenResale9235=function(btn){
  try{if(typeof canOpenPage==='function'&&!canOpenPage('fornecedores')){alert('Seu usuário não tem permissão para acessar fornecedores/revenda.');return}}
  catch(e){}
  ensureResalePage9235();
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  document.getElementById('revenda9235')?.classList.add('active');
  document.querySelectorAll('#nav button').forEach(x=>x.classList.remove('active'));if(btn)btn.classList.add('active');
  moveResale9235();
};

function stamp9235(){try{document.title='HLGB Confecções — Sistema de Gestão v92.35 Multiusuário'}catch(e){}const v=document.querySelector('#appShell .logo small');if(v)v.textContent='v92.35'}
function boot9235(){stamp9235();ensureResalePage9235();moveResale9235();applySelection9235()}
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(boot9235,700);setTimeout(stamp9235,2500)},0);else setTimeout(boot9235,1200);
setTimeout(stamp9235,400);
console.log('[HLGB] v92.35 aba de revenda e seleção persistente da montagem de notas carregadas');
})();
</script>
<!-- HLGB_V9235_REVENDA_NOTES_SELECTION_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
out.write_text(s,encoding='utf-8')
Path('abrir.html').write_text('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.35</title><script>(function(){window.location.replace(\'./app9235.html?v=92.35&fresh=\'+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>',encoding='utf-8')
print('v92.35 preparada: revenda em aba própria e seleção de notas persistente')
