from pathlib import Path

p = Path('app9240.html')
s = p.read_text(encoding='utf-8')

START = '<!-- HLGB_V9240_MATERIAL_SEPARATION_NAV_START -->'
END = '<!-- HLGB_V9240_MATERIAL_SEPARATION_NAV_END -->'
if START in s and END in s:
    a = s.index(START)
    b = s.index(END, a) + len(END)
    s = s[:a] + s[b:]

if 'separationOrder' not in s:
    raise SystemExit('ERRO: página/controle separationOrder não existe em app9240.html')

legacy_guard = '''const oldSep939=window.renderSeparation;window.renderSeparation=function(){let id=+document.getElementById('separationOrder')?.value,o=ord939(id);if(o&&sepState939(o).done){let box=document.getElementById('separationTable');if(box)box.innerHTML='<div class="panel"><span class="badge ok" style="font-size:14px;padding:10px 14px">✅ Este pedido já teve a separação concluída e já foi liberado para a próxima etapa.</span></div>';let s=document.getElementById('separationOrder');if(s)s.value='';window.fillSeparationOrders();return}return oldSep939?oldSep939.apply(this,arguments):undefined};'''
legacy_passthrough = '''const oldSep939=window.renderSeparation;window.renderSeparation=function(){return oldSep939?oldSep939.apply(this,arguments):undefined};'''
legacy_replaced = 0
if legacy_guard in s:
    s = s.replace(legacy_guard, legacy_passthrough, 1)
    legacy_replaced = 1

addon = r'''<!-- HLGB_V9240_MATERIAL_SEPARATION_NAV_START -->
<script>
(function(){
'use strict';
const VERSION='92.40-material-separation-stable';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();

function targetPage(){
  const control=document.getElementById('separationOrder');
  return control?.closest('.page') || document.getElementById('materiais') || null;
}
function activatePageDirect(pageEl){
  if(!pageEl)return false;
  document.querySelectorAll('.page.active').forEach(x=>x.classList.remove('active'));
  pageEl.classList.add('active');
  pageEl.removeAttribute('hidden');
  return true;
}
function orderById(id){
  try{return (db?.orders||[]).find(o=>String(o?.id)===String(id))||null}catch(e){return null}
}
function optionLabel(id){
  const o=orderById(id);
  if(!o)return 'Pedido '+id;
  let num=o.id;
  try{if(typeof displayOrderNumber==='function')num=displayOrderNumber(o)}catch(e){}
  return '#'+num+' — '+String(o.client||'');
}
function ensureSelectedOrder(id){
  const sel=document.getElementById('separationOrder');
  if(!sel||!id)return false;
  id=String(id);
  let opt=[...sel.options].find(o=>String(o.value)===id);
  if(!opt){
    opt=document.createElement('option');
    opt.value=id;
    opt.textContent=optionLabel(id);
    sel.appendChild(opt);
  }
  sel.value=id;
  return String(sel.value)===id;
}
function resolveOpenOrderId(btn){
  const sel=document.getElementById('separationOrder');
  if(!sel)return '';
  const nodes=[btn,btn.closest?.('.separation-row'),btn.closest?.('[data-order-id]'),btn.closest?.('[data-id]')].filter(Boolean);
  for(const n of nodes){
    const vals=[n?.dataset?.orderId,n?.dataset?.order,n?.dataset?.pedidoId,n?.dataset?.pedido,n?.dataset?.id].filter(Boolean);
    for(const v of vals)if(orderById(v))return String(v);
  }
  const js=btn.getAttribute('onclick')||'';
  const valueMatch=js.match(/value\s*=\s*['"]([^'"]+)['"]/i);
  if(valueMatch&&orderById(valueMatch[1]))return String(valueMatch[1]);
  const nums=js.match(/\d{6,}/g)||[];
  for(const v of nums)if(orderById(v))return String(v);
  const row=btn.closest?.('.separation-row');
  const shown=(row?.querySelector?.('.sep-order-id b')?.textContent||'').replace(/\D/g,'');
  if(shown){
    try{
      const hit=(db?.orders||[]).find(o=>{
        let num=o.id;
        try{if(typeof displayOrderNumber==='function')num=displayOrderNumber(o)}catch(e){}
        return String(num).replace(/\D/g,'')===shown;
      });
      if(hit)return String(hit.id);
    }catch(e){}
  }
  return '';
}
function renderOpened(id,scroll){
  if(!ensureSelectedOrder(id))return false;
  try{
    if(typeof window.renderSeparation==='function')window.renderSeparation();
    else if(typeof renderSeparation==='function')renderSeparation();
  }catch(e){
    console.error('[HLGB '+VERSION+'] renderSeparation',e);
    return false;
  }
  if(scroll)setTimeout(()=>document.getElementById('separationTable')?.scrollIntoView({behavior:'smooth',block:'start'}),20);
  return true;
}
function stabilizeOpened(id){
  if(String(window.__hlgbOpenSeparation9240||'')!==String(id))return;
  const box=document.getElementById('separationTable');
  const sel=document.getElementById('separationOrder');
  const lost=String(sel?.value||'')!==String(id);
  const empty=!box||!String(box.innerHTML||'').trim()||norm(box.textContent||'').includes('selecione um pedido');
  if(lost||empty)renderOpened(id,false);
}
function wrapFill(){
  const fn=window.fillSeparationOrders;
  if(typeof fn!=='function'||fn.__hlgb9240Stable)return;
  const wrapped=function(){
    const keep=String(window.__hlgbOpenSeparation9240||document.getElementById('separationOrder')?.value||'');
    const out=fn.apply(this,arguments);
    if(keep)ensureSelectedOrder(keep);
    return out;
  };
  wrapped.__hlgb9240Stable=true;
  wrapped.__hlgb9240Original=fn;
  window.fillSeparationOrders=wrapped;
}
function refreshSeparation(){
  wrapFill();
  try{if(typeof window.fillSeparationOrders==='function')window.fillSeparationOrders()}catch(e){console.error('[HLGB '+VERSION+'] fillSeparationOrders',e)}
  const keep=String(window.__hlgbOpenSeparation9240||'');
  if(keep)renderOpened(keep,false);
  try{if(typeof window.renderDestinationChecklists==='function')window.renderDestinationChecklists()}catch(e){console.error('[HLGB '+VERSION+'] renderDestinationChecklists',e)}
  try{if(typeof window.renderFactionChecklists9198==='function')window.renderFactionChecklists9198()}catch(e){console.error('[HLGB '+VERSION+'] renderFactionChecklists9198',e)}
}
window.openMaterialSeparationV9240=function(sourceButton){
  const pageEl=targetPage();
  if(!pageEl){alert('Não foi possível abrir Separação de Materiais. A página não foi encontrada.');return false}
  let routed=false;
  try{
    if(pageEl.id&&typeof window.page==='function'){
      window.page(pageEl.id,sourceButton||null);
      routed=pageEl.classList.contains('active');
    }
  }catch(e){console.warn('[HLGB '+VERSION+'] rota padrão falhou',e)}
  if(!routed)activatePageDirect(pageEl);
  setTimeout(refreshSeparation,0);
  setTimeout(refreshSeparation,180);
  return true;
};
window.openSeparationOrderV9240=function(btn){
  const id=resolveOpenOrderId(btn);
  if(!id){alert('Não foi possível identificar o pedido desta separação.');return false}
  window.__hlgbOpenSeparation9240=String(id);
  wrapFill();
  renderOpened(id,true);
  setTimeout(()=>stabilizeOpened(id),80);
  setTimeout(()=>stabilizeOpened(id),260);
  setTimeout(()=>stabilizeOpened(id),700);
  return true;
};
document.addEventListener('click',function(ev){
  const btn=ev.target?.closest?.('button,a,[role="button"]');
  if(!btn)return;
  const text=norm(btn.textContent||btn.getAttribute('aria-label')||btn.getAttribute('title')||'');

  if(text==='abrir separacao'||text.startsWith('abrir separacao ')){
    ev.preventDefault();
    ev.stopImmediatePropagation();
    window.openSeparationOrderV9240(btn);
    return;
  }

  const isMaterialSeparation=
    text==='separacao de materiais'||
    text==='separacao de material'||
    (text.includes('separacao')&&text.includes('materia'));
  if(!isMaterialSeparation)return;

  const pageEl=targetPage();
  if(pageEl&&pageEl.contains(btn)&&!btn.closest('nav,.sidebar,.menu,.submenu'))return;
  ev.preventDefault();
  ev.stopImmediatePropagation();
  window.openMaterialSeparationV9240(btn);
},true);
wrapFill();
setTimeout(wrapFill,300);
setTimeout(wrapFill,1200);
console.info('[HLGB] Separação de Materiais estável carregada '+VERSION);
})();
</script>
<!-- HLGB_V9240_MATERIAL_SEPARATION_NAV_END -->'''

if '</body>' not in s:
    raise SystemExit('ERRO: fechamento </body> não encontrado em app9240.html')
head, tail = s.rsplit('</body>', 1)
s = head + addon + '\n</body>' + tail
p.write_text(s, encoding='utf-8')

print('hotfix Separação de Materiais aplicado')
print('trava legada v91.39 removida:', legacy_replaced)
print('separationOrder ocorrências:', s.count('separationOrder'))
print('Abrir separação ocorrências:', s.count('Abrir separação'))
print('openMaterialChecklist ocorrências:', s.count('openMaterialChecklist'))
