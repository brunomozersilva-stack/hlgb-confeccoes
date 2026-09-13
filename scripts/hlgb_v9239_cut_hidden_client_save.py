from pathlib import Path

src=Path('app9238.html')
out=Path('app9239.html')
s=src.read_text(encoding='utf-8').replace('v92.38','v92.39')

addon=r'''<!-- HLGB_V9239_CUT_HIDDEN_CLIENT_SAVE_START -->
<style>
.hlgb9239-hidden-cuts{margin:0 0 12px;padding:9px 10px;border:1px solid #e5c98a;border-radius:10px;background:#fffaf0}
.hlgb9239-hidden-cuts h3{font-size:14px;margin:0 0 3px;color:#765117}.hlgb9239-hidden-cuts .sub{font-size:11px}
.hlgb9239-hidden-row{display:grid;grid-template-columns:minmax(150px,1.3fr) 78px 118px 128px 145px 70px;gap:6px;align-items:end;padding:7px 0;border-top:1px solid #eee0bc}
.hlgb9239-hidden-row:first-of-type{border-top:0}.hlgb9239-hidden-row label{display:block;font-size:9px;color:#786b73;margin-bottom:2px}.hlgb9239-hidden-row input,.hlgb9239-hidden-row select{height:29px;padding:3px 5px;font-size:10px;border:1px solid #d8ccd2;border-radius:6px;background:#fff;width:100%}.hlgb9239-hidden-row button{height:29px;padding:3px 7px;font-size:10px}
.hlgb9239-client-row{display:grid;grid-template-columns:minmax(220px,2fr) minmax(110px,.8fr) auto;gap:8px;align-items:end;margin:7px 0}.hlgb9239-client-row .danger{height:38px}
.hlgb9239-save-note{font-size:12px;margin:9px 0;color:#6f3f59;font-weight:700}
.hlgb9239-quickedit{display:flex;gap:5px;align-items:center;flex-wrap:wrap;border-left:1px solid #e5d8df;padding-left:6px;margin-left:2px}.hlgb9239-quickedit select{max-width:180px}
@media(max-width:900px){.hlgb9239-hidden-row{grid-template-columns:1fr 1fr 1fr}.hlgb9239-hidden-row>div:first-child{grid-column:1/-1}}
</style>
<script>
(function(){
'use strict';
const clone9239=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
const norm9239=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const esc9239=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const date9239=v=>String(v||'').slice(0,10);

async function ensureCloud9239(){
  if(typeof hlgbRecordSaveWithRetry!=='function')throw new Error('Sincronização por registro indisponível.');
  if(typeof hlgbRecordReady!=='undefined'&&!hlgbRecordReady){
    const ok=typeof hlgbEnsureRecordsOnlineAfterLogin==='function'?await hlgbEnsureRecordsOnlineAfterLogin():false;
    if(!ok)throw new Error('A nuvem não está pronta.');
  }
}
async function saveRecord9239(module,row){
  await ensureCloud9239();
  const out=await hlgbRecordSaveWithRetry(module,String(row.id),clone9239(row),false);
  if(!out||out.applied!==true)throw new Error('A nuvem não confirmou a alteração.');
  const arr=db[module]=Array.isArray(db[module])?db[module]:[];
  const i=arr.findIndex(x=>String(x?.id)===String(row.id));
  const final=clone9239(out.data||row);
  if(i>=0)arr[i]=final;else arr.push(final);
  try{localSaveOnly()}catch(e){}
  try{hlgbRecordPendingStore()}catch(e){}
  return final;
}

/* -------- Atribuir clientes: gravação direta do PEDIDO -------- */
function clientRows9239(list=[]){
  const clients=(db.clients||[]).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
  const rows=list.length?list:[{clientId:'',qty:''}];
  return rows.map(x=>`<div class="hlgb9239-client-row"><div class="field"><label>Cliente</label><select class="hlgb9239-client"><option value="">Selecione</option>${clients.map(c=>`<option value="${c.id}" ${String(c.id)===String(x.clientId)?'selected':''}>${esc9239(c.name||'')}</option>`).join('')}</select></div><div class="field"><label>Quantidade</label><input class="hlgb9239-qty" type="number" min="0" step="1" value="${+x.qty||''}"></div><button type="button" class="danger" onclick="this.closest('.hlgb9239-client-row').remove()">×</button></div>`).join('');
}
window.hlgbAddProjectionClient9239=function(){document.getElementById('hlgbClientList9239')?.insertAdjacentHTML('beforeend',clientRows9239())};
window.openProjectionClientAssign9166=function(oid,key){
  const o=(db.orders||[]).find(x=>String(x.id)===String(oid));
  const it=o&&(typeof projectionItemsForOrder==='function'?projectionItemsForOrder(o):[]).find(x=>String(x.key)===String(key));
  if(!o||!it){alert('Não encontrei esse produto no pedido.');return}
  const base=clone9239(o), saved=o.projectionItems?.[it.key]||{};
  const list=Array.isArray(saved.clientAllocations)?saved.clientAllocations:[];
  const available=Math.max(0,+(typeof projectionDeliverableQty==='function'?projectionDeliverableQty(o,it):it.qty)||0);
  openModal(`Atribuir clientes — ${esc9239(it.name||'Produto')}`,`<div class="cards"><div class="card"><small>Quantidade disponível</small><strong>${available.toLocaleString('pt-BR')}</strong></div><div class="card"><small>Já atribuída</small><strong>${list.reduce((s,x)=>s+(+x.qty||0),0).toLocaleString('pt-BR')}</strong></div></div><div id="hlgbClientList9239">${clientRows9239(list)}</div><button type="button" class="secondary" onclick="hlgbAddProjectionClient9239()">+ Outro cliente</button><div class="sub" style="margin:10px 0">Pode dividir o mesmo modelo entre vários clientes. A soma não pode ultrapassar a quantidade disponível.</div><div id="hlgbClientSave9239" class="hlgb9239-save-note"></div><button type="button" class="primary modalSave">☁️ Salvar clientes</button>`,async()=>{
    const clients=db.clients||[], seen=new Set(), out=[];
    for(const r of document.querySelectorAll('#hlgbClientList9239 .hlgb9239-client-row')){
      const cid=r.querySelector('.hlgb9239-client')?.value||'',qty=Math.max(0,+r.querySelector('.hlgb9239-qty')?.value||0);
      if(!cid||qty<=0)continue;
      if(seen.has(String(cid))){alert('O mesmo cliente aparece duas vezes. Junte a quantidade em uma única linha.');return false}
      seen.add(String(cid));const cl=clients.find(c=>String(c.id)===String(cid));if(cl)out.push({clientId:cl.id,clientName:cl.name,qty});
    }
    const total=out.reduce((s,x)=>s+x.qty,0);if(total>available){alert(`A distribuição soma ${total.toLocaleString('pt-BR')} peças, mas há ${available.toLocaleString('pt-BR')} disponíveis.`);return false}
    const desired=clone9239(base);desired.projectionItems=(desired.projectionItems&&typeof desired.projectionItems==='object')?desired.projectionItems:{};
    desired.projectionItems[it.key]={...(desired.projectionItems[it.key]||{}),clientAllocations:out,clientAllocationUpdatedAt:new Date().toISOString()};
    const btn=document.querySelector('#modal .modalSave'),msg=document.getElementById('hlgbClientSave9239');if(btn){btn.disabled=true;btn.textContent='☁️ Confirmando na nuvem…'}if(msg)msg.textContent='Salvando…';
    try{
      await ensureCloud9239();
      const latest=(typeof hlgbRecordSnapshots!=='undefined'?hlgbRecordSnapshots?.orders?.get(String(o.id))?.data:null)||base;
      const payload=typeof cloudMergeThreeWay==='function'?cloudMergeThreeWay(base,desired,latest):desired;
      const confirmed=await hlgbRecordSaveWithRetry('orders',String(o.id),payload,false);
      if(!confirmed||confirmed.applied!==true)throw new Error('O banco não confirmou a gravação.');
      const final=clone9239(confirmed.data||payload),idx=(db.orders||[]).findIndex(x=>String(x.id)===String(o.id));if(idx>=0)db.orders[idx]=final;
      try{localSaveOnly();hlgbRecordPendingStore()}catch(e){}
      if(msg)msg.textContent='✓ Clientes confirmados na nuvem.';try{setCloudStatus('⚡ Online · clientes confirmados','ok')}catch(e){}
      setTimeout(()=>{closeModal();try{renderProjection();window.renderProjectionDeliveryTracking?.()}catch(e){}},250);
      return true;
    }catch(e){console.error('[HLGB 92.39] clientes',e);if(btn){btn.disabled=false;btn.textContent='☁️ Salvar clientes'}if(msg)msg.textContent='✕ Não foi confirmado: '+String(e?.message||e);return false}
  });
};

/* -------- cortes que existem na nuvem mas eram escondidos pelo status do pedido -------- */
function hiddenPendingCuts9239(){
  const orders=db.orders||[],cuts=db.cuts||[];
  const visibleOrders=new Set((typeof pedidosQuePrecisamDeCorte==='function'?pedidosQuePrecisamDeCorte():[]).map(o=>String(o.id)));
  const hasFinal=(oid,pid)=>cuts.some(c=>String(c.orderId||'')===String(oid||'')&&String(c.productId||'')===String(pid||'')&&norm9239(c.status)==='finalizado');
  return cuts.filter(c=>{
    if(norm9239(c.status)==='finalizado'||!c.productId||!(+c.pieces>0))return false;
    const o=orders.find(x=>String(x.id)===String(c.orderId||''));if(!o)return false;
    if(hasFinal(c.orderId,c.productId))return false;
    return !visibleOrders.has(String(o.id));
  }).sort((a,b)=>String(a.product||'').localeCompare(String(b.product||''),'pt-BR'));
}
function cutterOptions9239(current){return `<option value="">Sem cortador</option>${(db.cutters||[]).filter(x=>x.active!==false).map(x=>`<option value="${x.id}" ${String(x.id)===String(current||'')?'selected':''}>${esc9239(x.name||'Cortador')}</option>`).join('')}`}
function renderHiddenCuts9239(){
  const cutTable=document.getElementById('cutTable');if(!cutTable)return;
  let box=document.getElementById('hlgbHiddenCuts9239');if(!box){box=document.createElement('div');box.id='hlgbHiddenCuts9239';cutTable.insertAdjacentElement('beforebegin',box)}
  const arr=hiddenPendingCuts9239();if(!arr.length){box.innerHTML='';box.style.display='none';return}box.style.display='block';
  box.className='hlgb9239-hidden-cuts';box.innerHTML=`<h3>⚠️ Cortes pendentes que estavam ocultos (${arr.length})</h3><div class="sub">O pedido já avançou de etapa, mas o corte ainda está como não finalizado. Aqui ele não some mais.</div>${arr.map(c=>{const o=(db.orders||[]).find(x=>String(x.id)===String(c.orderId||'')),no=o?(typeof displayOrderNumber==='function'?displayOrderNumber(o):o.id):(c.orderId||'-');return `<div class="hlgb9239-hidden-row" data-id="${c.id}"><div><b>${esc9239(c.product||'Produto')}</b><div class="sub">Pedido #${esc9239(no)} · ${(+c.pieces||0).toLocaleString('pt-BR')} pç</div></div><div><label>Status</label><select class="h9239status"><option value="Planejado" ${norm9239(c.status)!=='finalizado'?'selected':''}>A cortar</option><option value="Finalizado" ${norm9239(c.status)==='finalizado'?'selected':''}>Finalizado</option></select></div><div><label>Data</label><input class="h9239date" type="date" value="${date9239(c.plannedCutDate||c.finishedAt||'')}"></div><div><label>Cortador</label><select class="h9239cutter">${cutterOptions9239(c.cutterId)}</select></div><div><label>Situação do pedido</label><input value="${esc9239(o?.status||'-')}" disabled></div><button type="button" class="primary" onclick="hlgbSaveHiddenCut9239('${c.id}')">Salvar</button></div>`}).join('')}`;
}
window.hlgbSaveHiddenCut9239=async function(id){
  const cur=(db.cuts||[]).find(x=>String(x.id)===String(id)),row=document.querySelector(`#hlgbHiddenCuts9239 [data-id="${CSS.escape(String(id))}"]`);if(!cur||!row)return;
  const next=clone9239(cur),status=row.querySelector('.h9239status')?.value||'Planejado',date=row.querySelector('.h9239date')?.value||'',cid=row.querySelector('.h9239cutter')?.value||'';
  if(status==='Finalizado'&&!date){alert('Informe a data do corte para finalizar.');return}
  next.status=status;next.cutterId=cid?(isNaN(+cid)?cid:+cid):null;next.plannedCutDate=date||next.plannedCutDate||'';next.updatedAt=new Date().toISOString();
  if(status==='Finalizado')next.finishedAt=date;else if(norm9239(cur.status)==='finalizado')next.finishedAt='';
  const btn=row.querySelector('button');if(btn){btn.disabled=true;btn.textContent='Salvando…'}
  try{await saveRecord9239('cuts',next);try{setCloudStatus('⚡ Online · corte atualizado','ok')}catch(e){};try{renderCuts();renderDailyCuts();hlgbRenderCutterExcel9179?.()}catch(e){}}
  catch(e){if(btn){btn.disabled=false;btn.textContent='Salvar'}alert('Não foi possível confirmar o corte na nuvem: '+String(e?.message||e))}
};
const oldCuts9239=window.renderCuts;if(typeof oldCuts9239==='function')window.renderCuts=function(){const r=oldCuts9239.apply(this,arguments);setTimeout(renderHiddenCuts9239,0);return r};

/* -------- editor mínimo no topo de Cortadores: corte + status + data -------- */
function quickCuts9239(){return (db.cuts||[]).filter(c=>c?.id!=null&&+c.pieces>0).sort((a,b)=>String(a.product||'').localeCompare(String(b.product||''),'pt-BR'))}
window.hlgbLoadQuickCut9239=function(id){const c=(db.cuts||[]).find(x=>String(x.id)===String(id));const st=document.getElementById('hlgbQuickStatus9239'),dt=document.getElementById('hlgbQuickDate9239');if(st)st.value=norm9239(c?.status)==='finalizado'?'Finalizado':'Planejado';if(dt)dt.value=date9239(c?.plannedCutDate||c?.finishedAt||'')};
window.hlgbSaveQuickCut9239=async function(){const id=document.getElementById('hlgbQuickCut9239')?.value,c=(db.cuts||[]).find(x=>String(x.id)===String(id));if(!c){alert('Escolha um corte.');return}const next=clone9239(c),st=document.getElementById('hlgbQuickStatus9239')?.value||'Planejado',dt=document.getElementById('hlgbQuickDate9239')?.value||'';if(st==='Finalizado'&&!dt){alert('Informe a data para finalizar.');return}next.status=st;next.plannedCutDate=dt||next.plannedCutDate||'';next.updatedAt=new Date().toISOString();if(st==='Finalizado')next.finishedAt=dt;else if(norm9239(c.status)==='finalizado')next.finishedAt='';try{await saveRecord9239('cuts',next);try{hlgbRenderCutterExcel9179?.();renderCuts();renderDailyCuts()}catch(e){};try{setCloudStatus('⚡ Online · corte atualizado','ok')}catch(e){}}catch(e){alert('Não foi possível salvar o corte: '+String(e?.message||e))}};
function enhanceCutterQuick9239(){
  const box=document.getElementById('hlgbCutterFilter9238');if(!box||document.getElementById('hlgbQuickCut9239'))return;
  const cuts=quickCuts9239();const wrap=document.createElement('div');wrap.className='hlgb9239-quickedit';wrap.innerHTML=`<span>Editar</span><select id="hlgbQuickCut9239" onchange="hlgbLoadQuickCut9239(this.value)"><option value="">Corte…</option>${cuts.map(c=>`<option value="${c.id}">${esc9239(c.product||'Produto')} · ${(+c.pieces||0).toLocaleString('pt-BR')}</option>`).join('')}</select><select id="hlgbQuickStatus9239"><option value="Planejado">A cortar</option><option value="Finalizado">Finalizado</option></select><input id="hlgbQuickDate9239" type="date"><button type="button" class="primary" onclick="hlgbSaveQuickCut9239()">Salvar</button>`;box.appendChild(wrap);
}
const oldCutter9239=window.hlgbRenderCutterExcel9179;if(typeof oldCutter9239==='function')window.hlgbRenderCutterExcel9179=function(){const r=oldCutter9239.apply(this,arguments);setTimeout(enhanceCutterQuick9239,0);return r};

function stamp9239(){const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v92.39';document.title='HLGB Confecções — Sistema de Gestão v92.39 Multiusuário'}
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(()=>{stamp9239();renderHiddenCuts9239();enhanceCutterQuick9239()},700);[3000,6500,11000,15000].forEach(t=>setTimeout(stamp9239,t))},0);else setTimeout(stamp9239,900);
console.log('[HLGB] v92.39 cortes ocultos + confirmação real de atribuição de clientes');
})();
</script>
<!-- HLGB_V9239_CUT_HIDDEN_CLIENT_SAVE_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('body não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
out.write_text(s,encoding='utf-8')
Path('abrir.html').write_text('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.39</title><script>(function(){window.location.replace(\'./app9239.html?v=92.39&fresh=\'+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>',encoding='utf-8')
print('v92.39 preparada')
