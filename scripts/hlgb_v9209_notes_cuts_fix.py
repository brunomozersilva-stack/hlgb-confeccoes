from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9209_START -->'
END='<!-- HLGB_V9209_END -->'
if START in s and END in s:
    a=s.index(START); b=s.index(END,a)+len(END); s=s[:a]+s[b:]

addon=r'''<!-- HLGB_V9209_START -->
<style id="hlgb-v9209-style">
#orderedCutModels9209{margin-top:14px}
#orderedCutModels9209 .cut-model9209{font-weight:800}
#orderedCutModels9209 .cut-sub9209{font-size:11px;color:var(--muted);margin-top:3px}
#notesStatus9209{margin:10px 0;padding:9px 11px;border-radius:9px;background:#fff8fb;border:1px solid var(--line);font-size:12px;color:#5f4251}
</style>
<script id="hlgb-v9209-script">
(function(){
'use strict';
const clone9209=o=>{try{return structuredClone(o)}catch(e){return JSON.parse(JSON.stringify(o))}};
const norm9209=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const esc9209=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const iso9209=()=>typeof isoDate==='function'?isoDate(new Date()):new Date().toISOString().slice(0,10);
const product9209=id=>(db.products||[]).find(p=>String(p.id)===String(id))||null;
const cutter9209=id=>(db.cutters||[]).find(c=>String(c.id)===String(id))||null;
const orderNo9209=o=>{try{return typeof displayOrderNumber==='function'?(displayOrderNumber(o)||o.orderNumber||o.id):(o.orderNumber||o.id)}catch(e){return o.orderNumber||o.id}};
const doneCut9209=c=>{let st=norm9209(c?.status);return !c||c.done===true||st.includes('finalizado')||st.includes('concluido')||st.includes('cancelado')};

function appOpen9209(){
  const app=document.getElementById('appShell');
  if(!app)return false;
  try{return getComputedStyle(app).display!=='none'}catch(e){return app.style.display==='block'}
}
function activeOrders9209(){
  try{if(typeof pedidosQuePrecisamDeCorte==='function')return pedidosQuePrecisamDeCorte().slice()}catch(e){}
  return (db.orders||[]).filter(o=>{let st=norm9209(o?.status);return !o?.invoiceReady&&!o?.noteReady&&!st.includes('cancel')&&!st.includes('corte finalizado')&&!st.includes('pedido finalizado')&&!st.includes('pedido em producao')&&!st.includes('producao')});
}
function groups9209(o){
  let map=new Map(),seq=0;
  (Array.isArray(o?.grade)?o.grade:[]).forEach(g=>{
    let pid=String(g?.productId||''),q=Math.max(0,+g?.qty||0);if(!pid||!q)return;
    if(!map.has(pid))map.set(pid,{productId:pid,qty:0,seq:seq++});
    map.get(pid).qty+=q;
  });
  if(!map.size&&o?.productId){let q=Math.max(0,+o.qty||+o.totalQty||0);if(q)map.set(String(o.productId),{productId:String(o.productId),qty:q,seq:0})}
  return [...map.values()].sort((a,b)=>a.seq-b.seq).map(g=>({...g,product:product9209(g.productId)}));
}
function demandRows9209(){
  let out=[];
  activeOrders9209().forEach(o=>groups9209(o).forEach(g=>{
    let scheduled=(db.cuts||[]).filter(c=>!doneCut9209(c)&&String(c.demandOrderId||'')===String(o.id)&&String(c.productId||c.demandProductId||'')===String(g.productId)).reduce((a,c)=>a+(+c.pieces||0),0);
    let plans=(db.cuts||[]).filter(c=>String(c.demandOrderId||'')===String(o.id)&&String(c.productId||c.demandProductId||'')===String(g.productId)&&!doneCut9209(c));
    out.push({o,productId:g.productId,product:g.product,qty:g.qty,scheduled,remaining:Math.max(0,g.qty-scheduled),plans});
  }));
  return out.sort((a,b)=>String(orderNo9209(a.o)).localeCompare(String(orderNo9209(b.o)),'pt-BR',{numeric:true})||String(a.product?.name||'').localeCompare(String(b.product?.name||''),'pt-BR'));
}

async function saveCut9209(row,backup=null){
  try{
    if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
    if(typeof hlgbEnsureRecordsOnlineAfterLogin==='function'){
      let ready=true;try{ready=typeof hlgbRecordReady==='undefined'||!!hlgbRecordReady}catch(e){}
      if(!ready)await hlgbEnsureRecordsOnlineAfterLogin();
    }
    if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('A gravação na nuvem ainda não está pronta.');
    const out=await window.hlgbRecordSaveWithRetry('cuts',String(row.id),clone9209(row),false);
    if(!out||out.applied!==true)throw new Error('A nuvem não confirmou o corte.');
    const saved=clone9209(out.data||row);db.cuts=Array.isArray(db.cuts)?db.cuts:[];let i=db.cuts.findIndex(x=>String(x.id)===String(saved.id));if(i>=0)db.cuts[i]=saved;else db.cuts.push(saved);
    try{localSaveOnly()}catch(e){}
    return saved;
  }catch(err){
    if(backup){let i=(db.cuts||[]).findIndex(x=>String(x.id)===String(row.id));if(i>=0)db.cuts[i]=backup}else db.cuts=(db.cuts||[]).filter(x=>String(x.id)!==String(row.id));
    try{localSaveOnly()}catch(e){}
    throw err;
  }
}

function cutterOptions9209(selected=''){
  return '<option value="">Definir depois</option>'+((db.cutters||[]).filter(c=>c.active!==false).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR')).map(c=>`<option value="${esc9209(c.id)}" ${String(c.id)===String(selected)?'selected':''}>${esc9209(c.name||'Cortador')}</option>`).join(''));
}

window.hlgbOpenOrderedModelPlan9209=function(orderId,productId){
  if(!appOpen9209()){alert('Sua sessão ainda não abriu o sistema. Entre novamente e tente de novo.');return}
  const row=demandRows9209().find(r=>String(r.o.id)===String(orderId)&&String(r.productId)===String(productId));
  if(!row){alert('Este modelo não está mais na fila de pedidos a cortar.');return}
  const existing=row.plans[0]||null,prod=row.product||product9209(row.productId),max=Math.max(1,row.remaining+(existing?+existing.pieces||0:0));
  const selected=document.getElementById('cutDayDate')?.value||document.getElementById('dailyCutDate')?.value||existing?.plannedCutDate||iso9209();
  const currentQty=existing?Math.max(1,+existing.pieces||0):Math.max(1,row.remaining||row.qty);
  const html=`<div class="panel" style="margin-top:0"><b>Pedido #${esc9209(orderNo9209(row.o))} — ${esc9209(row.o.client||'Sem cliente')}</b><div style="font-size:18px;font-weight:900;margin-top:5px">${esc9209(prod?.name||'Modelo')}</div><div class="sub">Pedido: ${row.qty.toLocaleString('pt-BR')} pç · já programado: ${row.scheduled.toLocaleString('pt-BR')} pç · saldo para programar: ${row.remaining.toLocaleString('pt-BR')} pç</div></div><div class="grid"><div class="field"><label>Quantidade *</label><input id="cutQty9209" type="number" min="1" max="${max}" step="1" value="${currentQty}"></div><div class="field"><label>Dia do corte *</label><input id="cutDate9209" type="date" value="${esc9209(selected)}"></div><div class="field"><label>Cortador</label><select id="cutCutter9209">${cutterOptions9209(existing?.cutterId||'')}</select></div><div class="field"><label>Tipo de corte</label><select id="cutType9209"><option value="" ${!existing?.cutType?'selected':''}>Não definido</option><option value="Interno" ${existing?.cutType==='Interno'?'selected':''}>Interno</option><option value="Externo" ${existing?.cutType==='Externo'?'selected':''}>Externo</option></select></div><div class="field"><label>Observação</label><input id="cutNote9209" value="${esc9209(existing?.note||'')}"></div></div><button type="button" class="primary modalSave">☁️ ${existing?'Salvar programação':'Programar corte'}</button>`;
  openModal('Programar modelo pedido',html,async()=>{
    let q=Math.floor(+document.getElementById('cutQty9209')?.value||0),day=document.getElementById('cutDate9209')?.value||'',cid=document.getElementById('cutCutter9209')?.value||'';
    if(q<=0||q>max){alert('Informe uma quantidade válida, até '+max.toLocaleString('pt-BR')+' peças.');return false}if(!day){alert('Escolha o dia do corte.');return false}
    let backup=existing?clone9209(existing):null;
    let cut=existing||{id:Date.now()+Math.floor(Math.random()*100000),orderId:null,manual:true,isAdHoc:true,source:'ordered_model_planning',demandOrderId:row.o.id,demandOrderNumber:orderNo9209(row.o),demandProductId:row.productId,op:'PED-'+orderNo9209(row.o)+'-'+String(row.productId),productId:prod?.id||row.productId,product:prod?.name||'Modelo',client:row.o.client||'',date:iso9209(),status:'Planejado',createdAt:new Date().toISOString()};
    cut.pieces=q;cut.plannedCutDate=day;cut.cutterId=cid?+cid:null;cut.cutType=document.getElementById('cutType9209')?.value||'';cut.note=document.getElementById('cutNote9209')?.value||'';cut.updatedAt=new Date().toISOString();cut.source='ordered_model_planning';cut.demandOrderId=row.o.id;cut.demandProductId=row.productId;cut.requestedQty=row.qty;
    let btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='☁️ Confirmando…'}
    try{await saveCut9209(cut,backup);closeModal();try{renderDailyCuts()}catch(e){}try{renderCuts()}catch(e){}setTimeout(()=>{renderOrderedModels9209();decorateCuts9209()},50);return true}catch(err){if(btn){btn.disabled=false;btn.textContent='☁️ Tentar novamente'}alert('Não foi possível confirmar a programação na nuvem: '+String(err?.message||err));return false}
  });
};

window.hlgbOpenModelCut9209=function(){
  if(!appOpen9209()){alert('Sua sessão ainda não abriu o sistema. Entre novamente e tente de novo.');return}
  const rows=demandRows9209().filter(r=>r.remaining>0||r.plans.length);
  if(!rows.length){alert('Não há modelos de pedidos aguardando programação de corte.');return}
  const opts=rows.map(r=>`<option value="${esc9209(r.o.id)}::${esc9209(r.productId)}">Pedido #${esc9209(orderNo9209(r.o))} · ${esc9209(r.o.client||'Sem cliente')} · ${esc9209(r.product?.name||'Modelo')} · saldo ${r.remaining.toLocaleString('pt-BR')} pç</option>`).join('');
  openModal('Escolher modelo pedido para cortar',`<div class="sub" style="margin-bottom:12px">Agora aparecem somente modelos que estão em pedidos ainda aguardando corte — não o catálogo inteiro de produtos.</div><div class="field"><label>Modelo pedido *</label><select id="pickDemand9209"><option value="">Selecione</option>${opts}</select></div><button type="button" class="primary modalSave">Continuar</button>`,()=>{let v=document.getElementById('pickDemand9209')?.value||'';if(!v){alert('Escolha um modelo.');return false}let [oid,pid]=v.split('::');closeModal();setTimeout(()=>window.hlgbOpenOrderedModelPlan9209(oid,pid),20);return true});
};
window.hlgbOpenModelCut9189=window.hlgbOpenModelCut9209;
window.openDailyCutPlanner=window.hlgbOpenModelCut9209;

function renderOrderedModels9209(){
  const anchor=document.getElementById('cutTable');if(!anchor)return;
  let box=document.getElementById('orderedCutModels9209');if(!box){box=document.createElement('div');box.id='orderedCutModels9209';box.className='panel';anchor.insertAdjacentElement('afterend',box)}
  const rows=demandRows9209();
  if(!rows.length){box.innerHTML='<h2>🧵 Modelos pedidos a serem cortados</h2><div class="empty">Nenhum modelo aguardando corte.</div>';return}
  const body=rows.map(r=>{let plans=r.plans||[],assigned=plans.map(c=>{let ct=cutter9209(c.cutterId);return `${ct?esc9209(ct.name):'Sem cortador'} · ${esc9209(c.plannedCutDate||'-')} · ${(+c.pieces||0).toLocaleString('pt-BR')} pç`}).join('<br>')||'<span class="badge warn">Ainda não programado</span>';return `<tr><td><b>#${esc9209(orderNo9209(r.o))}</b><div class="cut-sub9209">${esc9209(r.o.client||'Sem cliente')}</div></td><td><div class="cut-model9209">${esc9209(r.product?.name||'Modelo')}</div></td><td>${r.qty.toLocaleString('pt-BR')}</td><td>${r.scheduled.toLocaleString('pt-BR')}</td><td><b>${r.remaining.toLocaleString('pt-BR')}</b></td><td>${assigned}</td><td><button type="button" class="primary" onclick="hlgbOpenOrderedModelPlan9209('${esc9209(r.o.id)}','${esc9209(r.productId)}')">${plans.length?'Alterar / completar':'Atribuir cortador'}</button></td></tr>`}).join('');
  box.innerHTML=`<div class="toolbar" style="justify-content:space-between;align-items:center"><div><h2 style="margin:0">🧵 Modelos pedidos a serem cortados</h2><div class="sub">Somente modelos dos pedidos que ainda precisam passar pelo corte.</div></div><button type="button" class="primary" onclick="hlgbOpenModelCut9209()">+ Programar modelo pedido</button></div><div style="overflow:auto"><table><thead><tr><th>Pedido</th><th>Modelo</th><th>Pedido</th><th>Programado</th><th>Saldo</th><th>Cortador / data</th><th>Ação</th></tr></thead><tbody>${body}</tbody></table></div>`;
}
window.renderOrderedModels9209=renderOrderedModels9209;

function decorateCuts9209(){
  renderOrderedModels9209();
  document.querySelectorAll('#corte button, #dailyCutsTable button').forEach(b=>{let t=norm9209(b.textContent),oc=String(b.getAttribute('onclick')||'');if(t.includes('programar corte por modelo')||oc.includes('hlgbOpenModelCut9189')){b.textContent='+ Programar modelo pedido';b.setAttribute('onclick','hlgbOpenModelCut9209()')}});
  document.querySelectorAll('#cutTable button').forEach(b=>{let oc=String(b.getAttribute('onclick')||''),m=oc.match(/editCut\((['"]?)(\d+)\1\)/);if(!m||b.dataset.v9209)return;let cid=m[2],c=(db.cuts||[]).find(x=>String(x.id)===String(cid));if(!c?.orderId)return;b.dataset.v9209='1';b.textContent='Dados gerais';let x=document.createElement('button');x.type='button';x.className='primary';x.style.marginRight='5px';x.textContent='👤 Atribuir modelos';x.onclick=()=>window.hlgbOpenOrderModels9209(cid);b.parentElement.insertBefore(x,b)});
}
window.hlgbOpenOrderModels9209=function(cutId){
  let c=(db.cuts||[]).find(x=>String(x.id)===String(cutId)),o=(db.orders||[]).find(x=>String(x.id)===String(c?.orderId));if(!o){alert('Não localizei o pedido deste corte.');return}
  let rows=demandRows9209().filter(r=>String(r.o.id)===String(o.id));if(!rows.length){alert('Este pedido não possui mais modelos aguardando corte.');return}
  let body=rows.map(r=>`<tr><td><b>${esc9209(r.product?.name||'Modelo')}</b></td><td>${r.qty.toLocaleString('pt-BR')}</td><td>${r.scheduled.toLocaleString('pt-BR')}</td><td><b>${r.remaining.toLocaleString('pt-BR')}</b></td><td><button type="button" class="primary" onclick="closeModal();setTimeout(()=>hlgbOpenOrderedModelPlan9209('${esc9209(o.id)}','${esc9209(r.productId)}'),20)">Atribuir</button></td></tr>`).join('');
  openModal('Modelos do pedido #'+orderNo9209(o),`<div class="sub" style="margin-bottom:10px">Aqui aparecem somente os modelos deste pedido. Escolha o modelo e atribua o cortador/data.</div><div style="overflow:auto"><table><thead><tr><th>Modelo</th><th>Pedido</th><th>Programado</th><th>Saldo</th><th>Ação</th></tr></thead><tbody>${body}</tbody></table></div>` ,()=>{});
};

// ---------- NOTAS: atualização explícita, sem depender de observer ----------
async function reloadRecordModule9209(module){
  if(typeof cloudRequest!=='function')return false;
  try{if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false)}catch(e){}
  try{
    const rows=await cloudRequest('hlgb_records?select=entity_id,data,updated_at,deleted_at&module=eq.'+encodeURIComponent(module)+'&order=updated_at.asc&limit=3000',{method:'GET'});
    if(!Array.isArray(rows))return false;
    const remoteIds=new Set(rows.map(r=>String(r.entity_id))),out=[];
    rows.forEach(r=>{if(!r.deleted_at&&r.data&&typeof r.data==='object')out.push(clone9209(r.data))});
    (Array.isArray(db[module])?db[module]:[]).forEach(x=>{if(x?.id!=null&&!remoteIds.has(String(x.id)))out.push(clone9209(x))});
    db[module]=out;try{localSaveOnly()}catch(e){};return true;
  }catch(e){console.warn('[HLGB 92.09] recarga '+module,e);return false}
}
let notesBusy9209=false;
window.hlgbRefreshNotes9209=async function(withCloud=true){
  if(notesBusy9209)return false;notesBusy9209=true;
  try{
    if(withCloud){await reloadRecordModule9209('projectionInvoices');await reloadRecordModule9209('noteQueue')}
    try{if(typeof window.renderOrderNotes==='function')window.renderOrderNotes()}catch(e){console.warn('[HLGB 92.09] renderOrderNotes',e)}
    try{if(typeof window.renderNotes9200==='function')window.renderNotes9200()}catch(e){console.warn('[HLGB 92.09] renderNotes9200',e)}
    try{if(typeof window.renderNoteQueue9202==='function')window.renderNoteQueue9202()}catch(e){console.warn('[HLGB 92.09] renderNoteQueue9202',e)}
    let page=document.getElementById('notas');if(page){let status=document.getElementById('notesStatus9209');if(!status){status=document.createElement('div');status.id='notesStatus9209';let h=page.querySelector('h1');h?.insertAdjacentElement('afterend',status)}status.textContent='✅ Central de Notas atualizada: itens aguardando nota, notas agrupadas e Acertos parciais ficam nesta tela.'}
    return true;
  }finally{notesBusy9209=false}
};
function decorateProjection9209(){
  const roots=[document.getElementById('projecao'),document.getElementById('capacity940Root')].filter(Boolean);
  roots.forEach(root=>root.querySelectorAll('button').forEach(b=>{let t=norm9209(b.textContent);if(t.includes('finalizar nota')||t.includes('abrir finalizador de nota'))b.style.display='none'}));
  const checks=[...document.querySelectorAll('.projectionSelect')];if(!checks.length)return;
  let root=checks[0].closest('.panel')||document.getElementById('projecao');if(!root||root.querySelector('.sendNotes9209'))return;
  let bar=document.createElement('div');bar.className='toolbar sendNotes9209';bar.style.marginTop='10px';bar.innerHTML='<button type="button" class="primary" onclick="sendProjectionToNotes9202()">🧾 Enviar selecionados para Notas</button><span class="sub">A nota financeira será montada e agrupada somente na Central de Notas.</span>';root.prepend(bar);
}

const oldPage9209=window.page;
if(typeof oldPage9209==='function')window.page=function(id,btn){let r=oldPage9209.apply(this,arguments);setTimeout(()=>{if(id==='notas')window.hlgbRefreshNotes9209(true);if(id==='projecao')decorateProjection9209();if(id==='corte'){decorateCuts9209();try{renderDailyCuts()}catch(e){}}},80);return r};
const oldCuts9209=window.renderCuts;if(typeof oldCuts9209==='function')window.renderCuts=function(){let r=oldCuts9209.apply(this,arguments);setTimeout(decorateCuts9209,30);return r};
const oldDaily9209=window.renderDailyCuts;if(typeof oldDaily9209==='function')window.renderDailyCuts=function(){let r=oldDaily9209.apply(this,arguments);setTimeout(decorateCuts9209,30);return r};

function boot9209(){
  try{let ver=document.querySelector('#appShell .logo small');if(ver)ver.textContent='v92.09';document.title='HLGB Confecções — Sistema de Gestão v92.09 Multiusuário'}catch(e){}
  setTimeout(()=>{try{decorateCuts9209();decorateProjection9209()}catch(e){}},250);
  setTimeout(()=>{if(document.getElementById('notas')?.classList.contains('active'))window.hlgbRefreshNotes9209(true)},600);
}
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>boot9209(),0);else setTimeout(boot9209,700);
document.addEventListener('click',e=>{let b=e.target?.closest?.('button');if(!b)return;let t=norm9209(b.textContent);if(t==='notas prontas')setTimeout(()=>window.hlgbRefreshNotes9209(true),100);if(t.includes('plano de corte')||t.includes('cortes do dia'))setTimeout(decorateCuts9209,100)},true);
console.log('[HLGB] v92.09 notas + modelos pedidos no corte carregado');
})();
</script>
<!-- HLGB_V9209_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> nao encontrado')
s=s[:pos]+addon+'\n'+s[pos:]

# Atualiza somente a identificação atual. O patch v92.08 passa a exibir 92.09 também.
s=s.replace('v92.08','v92.09').replace('V92.08','V92.09')
s=re.sub(r'<title>HLGB Confecções — Sistema de Gestão v[0-9.]+ Multiusuário</title>','<title>HLGB Confecções — Sistema de Gestão v92.09 Multiusuário</title>',s,count=1)

req=['HLGB_V9200_START','HLGB_V9201_START','HLGB_V9202_START','HLGB_V9203_START','__hlgbLocalCacheQuotaBlocked','HLGB_V9208_VERSION_BADGE','HLGB_V9209_START','hlgbRefreshNotes9209','hlgbOpenModelCut9209','hlgbOpenOrderedModelPlan9209','Modelos pedidos a serem cortados','v92.09']
miss=[x for x in req if x not in s]
if miss: raise SystemExit('Fluxos ausentes apos v92.09: '+repr(miss))

p.write_text(s,encoding='utf-8')
print('v92.09 aplicada: notas reativadas + corte limitado a modelos pedidos + login do programador corrigido')
