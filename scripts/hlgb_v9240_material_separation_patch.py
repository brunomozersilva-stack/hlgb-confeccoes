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

addon = r'''<!-- HLGB_V9240_MATERIAL_SEPARATION_NAV_START -->
<script>
(function(){
'use strict';
const VERSION='92.40-material-separation-nav';
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
  try{pageEl.scrollTop=0}catch(e){}
  try{window.scrollTo({top:0,behavior:'instant'})}catch(e){try{window.scrollTo(0,0)}catch(_) {}}
  return true;
}

function refreshSeparation(){
  try{if(typeof window.fillSeparationOrders==='function')window.fillSeparationOrders()}catch(e){console.error('[HLGB '+VERSION+'] fillSeparationOrders',e)}
  try{
    const select=document.getElementById('separationOrder');
    if(select?.value && typeof window.renderSeparation==='function')window.renderSeparation();
  }catch(e){console.error('[HLGB '+VERSION+'] renderSeparation',e)}
  try{if(typeof window.renderDestinationChecklists==='function')window.renderDestinationChecklists()}catch(e){console.error('[HLGB '+VERSION+'] renderDestinationChecklists',e)}
  try{if(typeof window.renderFactionChecklists9198==='function')window.renderFactionChecklists9198()}catch(e){console.error('[HLGB '+VERSION+'] renderFactionChecklists9198',e)}
}

window.openMaterialSeparationV9240=function(sourceButton){
  const pageEl=targetPage();
  if(!pageEl){
    console.error('[HLGB '+VERSION+'] página de separação de materiais não encontrada');
    alert('Não foi possível abrir Separação de Materiais. A página não foi encontrada.');
    return false;
  }
  let routed=false;
  try{
    if(pageEl.id && typeof window.page==='function'){
      window.page(pageEl.id,sourceButton||null);
      routed=pageEl.classList.contains('active');
    }
  }catch(e){console.warn('[HLGB '+VERSION+'] roteamento padrão falhou; usando abertura direta',e)}
  if(!routed)activatePageDirect(pageEl);
  setTimeout(refreshSeparation,0);
  setTimeout(refreshSeparation,180);
  return true;
};

// Corrige inclusive botões antigos com onclick quebrado/renomeado.
// O listener em captura executa antes do onclick inline legado.
document.addEventListener('click',function(ev){
  const btn=ev.target?.closest?.('button,a,[role="button"]');
  if(!btn)return;
  const text=norm(btn.textContent||btn.getAttribute('aria-label')||btn.getAttribute('title')||'');
  const isMaterialSeparation =
    text==='separacao de materiais' ||
    text==='separacao de material' ||
    (text.includes('separacao') && text.includes('materia'));
  if(!isMaterialSeparation)return;

  // Não interfere em controles internos da própria página, a menos que sejam o botão de navegação.
  const pageEl=targetPage();
  if(pageEl && pageEl.contains(btn) && !btn.closest('nav,.sidebar,.menu,.submenu'))return;

  ev.preventDefault();
  ev.stopImmediatePropagation();
  window.openMaterialSeparationV9240(btn);
},true);

// Se a aplicação recriar o menu depois do login, não é necessário reanexar nada:
// a delegação acima permanece no document.
console.info('[HLGB] correção do botão Separação de Materiais carregada '+VERSION);
})();
</script>
<!-- HLGB_V9240_MATERIAL_SEPARATION_NAV_END -->'''

if '</body>' not in s:
    raise SystemExit('ERRO: fechamento </body> não encontrado em app9240.html')
head, tail = s.rsplit('</body>', 1)
s = head + addon + '\n</body>' + tail
p.write_text(s, encoding='utf-8')

print('hotfix Separação de Materiais aplicado')
print('separationOrder ocorrências:', s.count('separationOrder'))
print('id="materiais" ocorrências:', s.count('id="materiais"'))
print('openMaterialChecklist ocorrências:', s.count('openMaterialChecklist'))
