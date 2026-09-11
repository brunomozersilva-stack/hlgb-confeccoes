from pathlib import Path

src=Path('app9235.html')
out=Path('app9236.html')
s=src.read_text(encoding='utf-8')
s=s.replace('v92.35','v92.36')

addon=r'''<!-- HLGB_V9236_NOTES_CLOUD_PICKER_START -->
<style>
#hlgbCloudQueue9236{max-height:58vh;overflow:auto;border:1px solid #eadde4;border-radius:10px;margin-top:10px}
#hlgbCloudQueue9236 thead th{position:sticky;top:0;z-index:2;background:#fafbfc}
.hlgb9236-cloud-count{display:inline-block;margin-top:8px;padding:6px 10px;border-radius:999px;background:#e9f7ef;color:#23633d;font-size:12px;font-weight:800}
</style>
<script>
(function(){
'use strict';
const q9236=v=>Math.max(0,+v||0);
const esc9236=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money9236=v=>{try{return (+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+(+v||0).toFixed(2)}};
const clone9236=x=>{try{return structuredClone(x)}catch(e){return JSON.parse(JSON.stringify(x))}};
function isOpen9236(x){return x&&String(x.status||'')!=='Faturado'&&q9236(x.remainingQty??x.qty)>0}
function currentOpen9236(){return (db.noteQueue||[]).filter(isOpen9236)}
async function loadCloudQueue9236(){
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  if(typeof cloudRequest!=='function')throw new Error('Conexão com a nuvem indisponível.');
  const path='hlgb_records?select=entity_id,data,updated_at,deleted_at&module=eq.noteQueue&order=updated_at.asc&limit=5000';
  const rows=await cloudRequest(path,{method:'GET'});
  if(!Array.isArray(rows))throw new Error('A nuvem não retornou a fila de notas.');
  const active=[];
  rows.forEach(r=>{
    if(!r||r.deleted_at||!r.data||typeof r.data!=='object')return;
    const x=clone9236(r.data);if(x.id==null||String(x.id)==='')x.id=r.entity_id;
    if(isOpen9236(x))active.push(x);
  });
  db.noteQueue=active;
  try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}
  return active;
}
function clearLegacySelection9236(){
  try{if(window.hlgbSelectedNotes9235&&typeof window.hlgbSelectedNotes9235.clear==='function')window.hlgbSelectedNotes9235.clear()}catch(e){}
  document.querySelectorAll('.nqSelect9202').forEach(cb=>cb.checked=false);
}
function setSelection9236(ids){
  const set=new Set((ids||[]).map(String));
  try{
    if(window.hlgbSelectedNotes9235&&typeof window.hlgbSelectedNotes9235.clear==='function'){
      window.hlgbSelectedNotes9235.clear();set.forEach(id=>window.hlgbSelectedNotes9235.add(id));
    }
  }catch(e){}
  document.querySelectorAll('.nqSelect9202').forEach(cb=>cb.checked=set.has(String(cb.value)));
}
function renderFresh9236(ids){
  clearLegacySelection9236();
  try{if(typeof window.renderNoteQueue9202==='function')window.renderNoteQueue9202()}catch(e){console.warn('[HLGB 92.36] render fila',e)}
  setSelection9236(ids||[]);
}
const previousGroup9236=window.groupNote9202;
function continueExistingGroup9236(ids){
  renderFresh9236(ids);
  const checked=[...document.querySelectorAll('.nqSelect9202:checked')];
  if(!checked.length){alert('Os itens escolhidos não puderam ser marcados na montagem. Atualize a página e tente novamente.');return false}
  if(typeof previousGroup9236!=='function'){alert('A montagem de notas não está disponível.');return false}
  return previousGroup9236();
}
function openCloudPicker9236(items,preselected){
  const pre=new Set((preselected||[]).map(String));
  const sorted=(items||[]).slice().sort((a,b)=>String(a.clientName||'').localeCompare(String(b.clientName||''))||String(a.deliveryDate||'').localeCompare(String(b.deliveryDate||''))||String(a.productName||'').localeCompare(String(b.productName||'')));
  if(!sorted.length){alert('Não há itens aguardando nota na nuvem.');return false}
  const rows=sorted.map((x,i)=>`<tr><td><input class="pickQueue9236" data-i="${i}" type="checkbox" ${pre.has(String(x.id))?'checked':''}></td><td><b>${esc9236(x.clientName||'Sem cliente')}</b></td><td>${esc9236(x.productName||'Produto')}</td><td>${q9236(x.remainingQty??x.qty).toLocaleString('pt-BR')}</td><td>${money9236(x.unitPrice)}</td><td>${esc9236(x.deliveryDate||'')}</td><td>${esc9236(x.origin||x.source||'')}</td></tr>`).join('');
  openModal('Escolher itens para criar nota agrupada',`<div class="sub">Esta lista foi carregada <b>diretamente da nuvem agora</b>, sem usar o filtro antigo de “produtos prontos”. Marque os produtos do mesmo cliente que deseja juntar.</div><div class="hlgb9236-cloud-count">${sorted.length} item(ns) disponível(is) na nuvem</div><div id="hlgbCloudQueue9236"><table><thead><tr><th></th><th>Cliente</th><th>Produto</th><th>Disponível</th><th>Valor/peça</th><th>Entrega</th><th>Origem</th></tr></thead><tbody>${rows}</tbody></table></div><button type="button" class="primary modalSave">Continuar para montar a nota</button>`,()=>{
    const chosen=[...document.querySelectorAll('.pickQueue9236:checked')].map(cb=>sorted[+cb.dataset.i]).filter(Boolean);
    if(!chosen.length){alert('Marque pelo menos um item.');return false}
    const clients=new Set(chosen.map(x=>String(x.clientId||x.clientName||'')));if(clients.size!==1){alert('Selecione somente produtos do mesmo cliente para montar uma nota agrupada.');return false}
    const ids=chosen.map(x=>String(x.id));
    closeModal();
    setTimeout(()=>continueExistingGroup9236(ids),20);
    return true;
  });
  return true;
}
window.hlgbOpenCloudQueue9236=async function(preselected){
  try{
    const items=await loadCloudQueue9236();
    renderFresh9236(preselected||[]);
    return openCloudPicker9236(items,preselected||[]);
  }catch(e){alert('Não foi possível carregar os itens da nuvem: '+String(e?.message||e));return false}
};
if(typeof previousGroup9236==='function')window.groupNote9202=async function(){
  const before=[...document.querySelectorAll('.nqSelect9202:checked')].map(cb=>String(cb.value));
  try{
    const items=await loadCloudQueue9236();
    const valid=new Set(items.map(x=>String(x.id)));
    const selected=before.filter(id=>valid.has(id));
    renderFresh9236(selected);
    if(selected.length)return continueExistingGroup9236(selected);
    return openCloudPicker9236(items,[]);
  }catch(e){alert('Não foi possível atualizar os itens aguardando nota: '+String(e?.message||e));return false}
};
const prevRefresh9236=window.hlgbRefreshNotes9215;
if(typeof prevRefresh9236==='function')window.hlgbRefreshNotes9215=async function(){
  const r=await prevRefresh9236.apply(this,arguments);
  try{await loadCloudQueue9236();renderFresh9236([])}catch(e){console.warn('[HLGB 92.36] fila direta da nuvem',e)}
  return r;
};
function stamp9236(){try{document.title='HLGB Confecções — Sistema de Gestão v92.36 Multiusuário'}catch(e){}const v=document.querySelector('#appShell .logo small');if(v)v.textContent='v92.36'}
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(stamp9236,500),0);setTimeout(stamp9236,600);
console.log('[HLGB] v92.36 montagem de nota agrupada usa fila autoritativa da nuvem');
})();
</script>
<!-- HLGB_V9236_NOTES_CLOUD_PICKER_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
out.write_text(s,encoding='utf-8')
Path('abrir.html').write_text('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.36</title><script>(function(){window.location.replace(\'./app9236.html?v=92.36&fresh=\'+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>',encoding='utf-8')
print('v92.36 preparada: nota agrupada carregada diretamente da nuvem')
