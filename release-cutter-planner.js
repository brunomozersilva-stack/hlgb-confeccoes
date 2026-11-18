/* HLGB — programação rápida dos cortadores por MODELO */
(function(){
'use strict';
const V='2026.11.18-cutter-planner-v5';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),today=()=>new Date().toISOString().slice(0,10);
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function orderById(id){return arr('orders').find(o=>sid(o?.id)===sid(id))||null}
function productById(id){return arr('products').find(p=>sid(p?.id)===sid(id))||null}
function cutterById(id){return arr('cutters').find(c=>sid(c?.id)===sid(id))||null}
function displayNo(o){try{return typeof displayOrderNumber==='function'?displayOrderNumber(o):(o?.orderNumber||o?.id)}catch(e){return o?.id}}
// Os cálculos puros vivem em hlgb-modules/corte/grade-modelo-v9602.js.
// Fallback mantém o comportamento antigo caso o navegador não carregue o arquivo opcional.
const gradeCore9602=window.HLGB_CUTTER_GRADE_9602||null;
function modelGrade(o,pid){return gradeCore9602?.modelGrade?
 gradeCore9602.modelGrade(o,pid):(Array.isArray(o?.grade)?o.grade:[]).filter(g=>sid(g?.productId)===sid(pid)&&q(g?.qty)>0)}
function modelPieces(o,pid){return gradeCore9602?.modelPieces?
 gradeCore9602.modelPieces(o,pid):modelGrade(o,pid).reduce((s,g)=>s+q(g.qty),0)}
function modelIds(o){return gradeCore9602?.modelIds?
 gradeCore9602.modelIds(o):[...new Set((Array.isArray(o?.grade)?o.grade:[]).map(g=>sid(g?.productId)).filter(Boolean))]}
function productName(pid){return productById(pid)?.name||'Produto'}
function modelAlreadyCut(o,pid){
 // A finalização é por modelo, não pelo status geral do pedido.
 const ids=modelIds(o);
 return arr('cuts').some(c=>c&&sid(c.orderId)===sid(o.id)&&norm(c.status)==='finalizado'&&
   (sid(c.productId)===sid(pid)||(!c.productId&&ids.length===1)));
}
function relevantOrders(){
  return arr('orders').filter(o=>{
    if(!o||!Array.isArray(o.grade)||!o.grade.length)return false;
    const st=norm(o.status||'');return !['entregue','cancelado','cancelada'].includes(st);
  });
}
function modelRows(){
  const out=[];
  for(const o of relevantOrders()){
    for(const pid of modelIds(o)){
      const pieces=modelPieces(o,pid);if(pieces<=0||modelAlreadyCut(o,pid))continue;
      const cuts=arr('cuts').filter(c=>c&&sid(c.orderId)===sid(o.id)&&sid(c.productId)===sid(pid)&&norm(c.status)!=='finalizado');
      const exact=cuts.find(c=>c.modelPlanningSplitV1)||cuts.find(c=>!c.size&&!c.color)||cuts[0]||null;
      const aggregate=arr('cuts').find(c=>c&&sid(c.orderId)===sid(o.id)&&!c.productId&&norm(c.status)!=='finalizado')||null;
      out.push({
        key:sid(o.id)+'|'+pid,order:o,orderId:o.id,orderNo:displayNo(o),productId:pid,productName:productName(pid),
        client:o.client||'-',priority:o.priority||'Padrão',pieces,grade:modelGrade(o,pid),
        cut:exact,aggregateCut:aggregate,cutterId:exact?.cutterId||'',date:String(exact?.plannedCutDate||exact?.date||'').slice(0,10)
      });
    }
  }
  return out.sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999'))||String(a.productName).localeCompare(String(b.productName),'pt-BR'));
}
function matches(term){
  const n=norm(term);if(!n)return [];
  return modelRows().filter(x=>norm([x.productName,x.client,x.orderNo,x.priority].join(' ')).includes(n)).slice(0,50);
}

function orderSearchRows(term){
  const n=norm(term);if(!n)return [];
  const seen=new Set(),rows=[];
  for(const r of modelRows()){
    const key=sid(r.orderId);if(seen.has(key))continue;
    if(!norm([r.orderNo,r.client].join(' ')).includes(n))continue;
    seen.add(key);rows.push(r.order);
  }
  return rows.slice(0,30);
}
function renderOrderSearch(){
  const box=document.getElementById('hlgbCutterOrderResults');if(!box)return;
  const term=document.getElementById('hlgbCutterOrderSearch')?.value||'';
  if(!norm(term)){box.innerHTML='<div class="empty">Digite o número do pedido ou cliente para separar os modelos.</div>';return}
  const rows=orderSearchRows(term);
  box.innerHTML=rows.length?rows.map(o=>{
    const count=modelIds(o).length,total=(o.grade||[]).reduce((s,g)=>s+q(g.qty),0);
    return '<button type="button" class="secondary" data-order="'+escSafe(o.id)+'" style="width:100%;text-align:left;margin:4px 0;padding:10px 12px"><b>Pedido #'+escSafe(displayNo(o))+'</b> · '+escSafe(o.client||'-')+' · '+count+' modelo(s) · '+total.toLocaleString('pt-BR')+' peças</button>';
  }).join(''):'<div class="empty">Nenhum pedido encontrado.</div>';
  box.querySelectorAll('button[data-order]').forEach(b=>b.onclick=()=>showOrderModels(b.dataset.order));
}
function showOrderModels(orderId){
  const o=orderById(orderId),box=document.getElementById('hlgbCutterOrderModels');if(!o||!box)return;
  const rows=modelIds(o).filter(pid=>!modelAlreadyCut(o,pid)).map(pid=>{
    const p=productById(pid),pieces=modelPieces(o,pid);
    const planned=modelRows().find(r=>sid(r.orderId)===sid(o.id)&&sid(r.productId)===sid(pid));
    const status=planned?.date?('Programado '+planned.date+(planned.cutterId?' · '+(cutterById(planned.cutterId)?.name||'Cortador'):'')):'Ainda sem programação';
    return '<div class="panel" style="margin:8px 0;background:#fff"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div><b>'+escSafe(p?.name||'Produto')+'</b><div class="sub">'+pieces.toLocaleString('pt-BR')+' peças · '+escSafe(status)+'</div></div><button type="button" class="primary" data-model="'+escSafe(sid(o.id)+'|'+sid(pid))+'">Programar este modelo</button></div></div>';
  }).join('');
  box.innerHTML='<h3 style="margin-bottom:6px">Pedido #'+escSafe(displayNo(o))+' — '+escSafe(o.client||'-')+'</h3><div class="sub">'+(rows?'Somente modelos ainda não finalizados aparecem para programar.':'Nenhum modelo pendente de corte. Os modelos finalizados estão preservados no histórico.')+'</div>'+rows;
  box.querySelectorAll('button[data-model]').forEach(b=>b.onclick=()=>{
    selectModel(b.dataset.model);
    document.getElementById('hlgbCutterPlanner')?.scrollIntoView?.({behavior:'smooth',block:'start'});
  });
}
function renderMatches(){
  const box=document.getElementById('hlgbCutterPlannerResults');if(!box)return;
  const term=document.getElementById('hlgbCutterPlannerSearch')?.value||'';
  if(!norm(term)){box.innerHTML='<div class="empty">Digite o nome do produto, cliente ou número do pedido para pesquisar.</div>';return}
  const rows=matches(term);
  box.innerHTML=rows.length?rows.map(x=>'<button type="button" class="secondary hlgbCutterPlanChoice" data-key="'+escSafe(x.key)+'" style="text-align:left;width:100%;margin:4px 0;padding:10px 12px"><b>'+escSafe(x.productName)+'</b> · Pedido #'+escSafe(x.orderNo)+' · '+escSafe(x.client)+' · '+x.pieces.toLocaleString('pt-BR')+' pç · '+escSafe(x.priority)+(x.date?' · programado '+escSafe(x.date):'')+'</button>').join(''):'<div class="empty">Nenhum modelo encontrado para essa busca.</div>';
  box.querySelectorAll('.hlgbCutterPlanChoice').forEach(b=>b.onclick=()=>selectModel(b.dataset.key));
}
let selectedKey='',saving=false;
const uncertainDrafts=new Map();
const proofState={attempts:0,confirmed:0,uncertain:0,lastId:'',lastError:'',lastAt:''};
function criticalGrade(grade){
 return (Array.isArray(grade)?grade:[]).map(g=>JSON.stringify([sid(g.productId),sid(g.color),sid(g.size),Number(g.qty)])).sort().join('|');
}
function sameScheduledModel(remote,desired){
 return !!(remote&&desired&&sid(remote.orderId)===sid(desired.orderId)&&
  sid(remote.productId)===sid(desired.productId)&&
  sid(remote.cutterId)===sid(desired.cutterId)&&
  sid(remote.plannedCutDate)===sid(desired.plannedCutDate)&&
  Number(remote.pieces)===Number(desired.pieces)&&
  criticalGrade(remote.originalGrade)===criticalGrade(desired.originalGrade));
}
async function fetchRemoteCut(id){
 if(typeof window.cloudRequest!=='function')throw new Error('Consulta de confirmação na nuvem indisponível. Não reenviar sem verificar.');
 const query='hlgb_records?select=module,entity_id,data,deleted_at,revision&module=eq.cuts&entity_id=eq.'+
  encodeURIComponent(sid(id))+'&limit=1';
 const rows=await window.cloudRequest(query,{method:'GET'});
 if(!Array.isArray(rows))throw new Error('Servidor não devolveu confirmação legível do corte.');
 const row=rows.find(r=>sid(r?.module)==='cuts'&&sid(r?.entity_id)===sid(id));
 if(!row||row.deleted_at)return null;
 return row.data||null;
}
function showSaveFailure(err){
 const message='⚠️ Sem confirmação remota. A programação foi mantida na tela. '+
 'Não cadastre o mesmo modelo novamente antes de conferir o salvamento. '+sid(err?.message||err);
 const target=document.getElementById('hlgbCutterPlannerFeedback');
 if(target)target.textContent=message;
 return message;
}
function setSaveBusy(busy){
 const btn=document.querySelector?.('#hlgbCutterPlanner button[onclick*="hlgbCutterPlannerSave"]');
 if(btn){btn.disabled=busy;btn.textContent=busy?'Conferindo gravação...':'Salvar este modelo';}
}

function selected(){return modelRows().find(r=>r.key===selectedKey)||null}
function selectModel(key){
  selectedKey=sid(key);const x=selected();if(!x)return;
  const info=document.getElementById('hlgbCutterPlannerSelected');if(info)info.innerHTML='<b>'+escSafe(x.productName)+'</b> · Pedido #'+escSafe(x.orderNo)+' · '+escSafe(x.client)+' · '+x.pieces.toLocaleString('pt-BR')+' peças · '+escSafe(x.priority)+'<div class="sub">Somente este modelo será programado. Os outros modelos do mesmo pedido podem ter outra data.</div>';
  const date=document.getElementById('hlgbCutterPlannerDate');if(date)date.value=x.date||today();
  const cutter=document.getElementById('hlgbCutterPlannerCutter');if(cutter&&x.cutterId)cutter.value=sid(x.cutterId);
}
function newChildId(orderId,productId){
  const s=(sid(orderId)+sid(productId)).replace(/\D/g,'').slice(-12);let base=Number(s)||Date.now()%1e12;
  let id=410000000000000+base;
  while(arr('cuts').some(c=>sid(c?.id)===sid(id)))id++;
  return id;
}
function productText(x){
  return x.grade.map(g=>q(g.qty)+' '+x.productName+(g.color?' '+g.color:'')+(g.size?' Tam '+g.size:'')).join(' | ');
}
async function saveRecord(row,{isNew=false}={}){
  if(typeof hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação oficial indisponível.');
  // Uma tentativa anterior pode ter sido recebida pelo servidor mesmo com timeout no aparelho.
  // Não reenviar automaticamente: compare primeiro a identidade e os campos de negócio.
  if(isNew){
   const exists=await fetchRemoteCut(row.id);
   if(exists){
    if(!sameScheduledModel(exists,row))throw new Error('ID de corte já existe com dados diferentes na nuvem. Não sobrescrever: conferir o registro e o pedido.');
    db.cuts=Array.isArray(db.cuts)?db.cuts:[];const index=db.cuts.findIndex(c=>sid(c?.id)===sid(row.id));
    if(index>=0)db.cuts[index]=exists;else db.cuts.push(exists);
    return exists;
   }
  }
  const out=await hlgbRecordSaveWithRetry('cuts',sid(row.id),row,false);
  if(!out?.applied)throw new Error('A nuvem não confirmou a programação; o WAL pode estar pendente. Não repetir como novo corte.');
  const proof=await fetchRemoteCut(row.id);
  if(!sameScheduledModel(proof,row))
   throw new Error('A resposta de gravação chegou, mas a releitura não confirmou modelo, grade, data e cortador. Mantenha a tela e confira o servidor antes de repetir.');
  db.cuts=Array.isArray(db.cuts)?db.cuts:[];const i=db.cuts.findIndex(c=>sid(c?.id)===sid(row.id));if(i>=0)db.cuts[i]=proof;else db.cuts.push(proof);
  return proof;
}
async function save(){
  if(saving)throw new Error('A gravação deste cortador ainda está em andamento. Não clique novamente.');
  saving=true;setSaveBusy(true);proofState.attempts++;proofState.lastAt=new Date().toISOString();
  try{
  const x=selected();if(!x)throw new Error('Selecione um modelo.');
  const date=document.getElementById('hlgbCutterPlannerDate')?.value||'',cutterId=document.getElementById('hlgbCutterPlannerCutter')?.value||'';
  if(!date)throw new Error('Escolha a data do corte.');if(!cutterId)throw new Error('Escolha o cortador.');
  let target=x.cut||uncertainDrafts.get(x.key)||null;
  const isNew=!x.cut;
  if(!target){
    const source=x.aggregateCut||arr('cuts').find(c=>c&&sid(c.orderId)===sid(x.orderId)&&norm(c.status)!=='finalizado')||{};
    target={
      id:newChildId(x.orderId,x.productId),
      op:(source.op||('PED-'+sid(x.orderId)))+'-'+sid(x.productId).slice(-4),
      date:source.date||date,client:x.client,pieces:x.pieces,status:'Planejado',orderId:x.orderId,
      product:productText(x),productId:Number.isFinite(+x.productId)?+x.productId:x.productId,
      originalGrade:x.grade.map(g=>({...g})),clientAllocations:[],materialSeparationParallel:true,
      modelPlanningSplitV1:true,sourceAggregateCutId:source.id||null,createdAt:new Date().toISOString()
    };
  }
  const next={...target,productId:Number.isFinite(+x.productId)?+x.productId:x.productId,product:productText(x),pieces:x.pieces,
    originalGrade:x.grade.map(g=>({...g})),plannedCutDate:date,cutterId:Number.isFinite(+cutterId)&&String(+cutterId)===String(cutterId)?+cutterId:cutterId,
    modelPlanningSplitV1:true,updatedAt:new Date().toISOString()};
  const dup=arr('cuts').find(c=>sid(c?.id)!==sid(next.id)&&sid(c?.orderId)===sid(x.orderId)&&sid(c?.productId)===sid(x.productId)&&c.modelPlanningSplitV1&&norm(c?.status)!=='finalizado');
  if(dup){next.id=dup.id;next.createdAt=dup.createdAt||next.createdAt;target=dup}
  // Mantém sempre o MESMO id do modelo após falha incerta, sem criar outro corte.
  uncertainDrafts.set(x.key,next);proofState.lastId=sid(next.id);
  await saveRecord(next,{isNew});
  uncertainDrafts.delete(x.key);proofState.confirmed++;proofState.lastError='';
  try{localSaveOnly?.()}catch(e){}
  try{renderCuts?.();renderCutters?.();renderProjection?.();drawCutterChart?.()}catch(e){}
  const ok=document.getElementById('hlgbCutterPlannerFeedback');if(ok)ok.innerHTML='<span class="badge ok">'+escSafe(x.productName)+' programado para '+escSafe(date)+' · '+escSafe(cutterById(cutterId)?.name||'Cortador')+'</span>';
  selectedKey='';const s=document.getElementById('hlgbCutterPlannerSearch');if(s)s.value='';renderMatches();return true;
  }catch(e){proofState.uncertain++;proofState.lastError=sid(e?.message||e);showSaveFailure(e);throw e}
  finally{saving=false;setSaveBusy(false)}
}
function ensurePanel(){
  const page=document.getElementById('cortadores');if(!page||document.getElementById('hlgbCutterPlanner'))return;
  const first=page.querySelector(':scope > .panel');const panel=document.createElement('div');panel.id='hlgbCutterPlanner';panel.className='panel';
  panel.innerHTML='<h2>✂️ Separar modelos do pedido para cortar</h2><div class="sub">Primeiro procure o pedido. O sistema mostra todos os modelos separados para você escolher qual será cortado e em qual data.</div><div class="field" style="margin-top:10px"><label>Pedido / cliente</label><input id="hlgbCutterOrderSearch" placeholder="Ex.: pedido 101 ou Gisele" oninput="hlgbCutterOrderSearchRender()"></div><div id="hlgbCutterOrderResults" style="max-height:220px;overflow:auto;margin-top:8px"><div class="empty">Digite o pedido ou cliente.</div></div><div id="hlgbCutterOrderModels" style="margin-top:10px"></div><hr style="margin:18px 0;border:0;border-top:1px solid #e5e5e5"><h3>Programar o modelo escolhido</h3><div class="toolbar" style="align-items:flex-end;flex-wrap:wrap;margin-top:10px"><div class="field" style="min-width:260px;flex:1"><label>Ou buscar direto por modelo</label><input id="hlgbCutterPlannerSearch" placeholder="Ex.: Camisola, Gisele ou pedido 87" oninput="hlgbCutterPlannerRender()"></div><div class="field"><label>Data deste modelo</label><input id="hlgbCutterPlannerDate" type="date" value="'+today()+'"></div><div class="field" style="min-width:200px"><label>Cortador</label><select id="hlgbCutterPlannerCutter"><option value="">Selecione</option>'+arr('cutters').filter(c=>c.active!==false).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR')).map(c=>'<option value="'+escSafe(c.id)+'">'+escSafe(c.name||'Cortador')+'</option>').join('')+'</select></div><button type="button" class="primary" onclick="hlgbCutterPlannerSave()">Salvar este modelo</button></div><div id="hlgbCutterPlannerSelected" class="sub" style="margin-top:8px">Nenhum modelo selecionado.</div><div id="hlgbCutterPlannerFeedback" style="margin-top:6px"></div><div id="hlgbCutterPlannerResults" style="max-height:320px;overflow:auto;margin-top:10px"><div class="empty">Digite para pesquisar.</div></div>';
  if(first)page.insertBefore(panel,first);else page.appendChild(panel);
}
window.hlgbCutterPlannerRender=renderMatches;window.hlgbCutterOrderSearchRender=renderOrderSearch;window.hlgbCutterPlannerSave=async()=>{try{return await save()}catch(e){if(!saving)alert(String(e?.message||e));return false}};
window.hlgbCutterPlanner={modelRows,matches,orderSearchRows,showOrderModels,selectModel,save,modelGrade,modelPieces,modelIds,modelAlreadyCut,productText,
 diagnostic:()=>({...proofState,pendingDraftCount:uncertainDrafts.size}),
 verifyPending:async key=>{
  const pending=uncertainDrafts.get(sid(key));if(!pending)return {status:'none'};
  const remote=await fetchRemoteCut(pending.id);
  if(!remote)return {status:'missing',id:sid(pending.id)};
  if(!sameScheduledModel(remote,pending))return {status:'different',id:sid(pending.id)};
  db.cuts=Array.isArray(db.cuts)?db.cuts:[];const i=db.cuts.findIndex(c=>sid(c?.id)===sid(pending.id));
  if(i>=0)db.cuts[i]=remote;else db.cuts.push(remote);
  uncertainDrafts.delete(sid(key));return {status:'confirmed',id:sid(pending.id)};
 }};
const old=window.renderCutters;if(typeof old==='function'&&!old.__hlgbPlannerV3){const w=function(){const r=old.apply(this,arguments);setTimeout(ensurePanel,0);return r};w.__hlgbPlannerV3=true;w.__original=old;window.renderCutters=w}
function boot(){try{ensurePanel()}catch(e){console.warn('[HLGB cutter planner]',e)}}try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,900),0)}catch(e){}setTimeout(boot,1600);
window.HLGB_CUTTER_PLANNER_GUARD=V;
console.info('[HLGB] programação dos cortadores por modelo v3 ativa');
})();