/* HLGB — programação rápida dos cortadores por MODELO */
(function(){
'use strict';
const V='2026.10.01-cutter-planner-v3';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),today=()=>new Date().toISOString().slice(0,10);
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function orderById(id){return arr('orders').find(o=>sid(o?.id)===sid(id))||null}
function productById(id){return arr('products').find(p=>sid(p?.id)===sid(id))||null}
function cutterById(id){return arr('cutters').find(c=>sid(c?.id)===sid(id))||null}
function displayNo(o){try{return typeof displayOrderNumber==='function'?displayOrderNumber(o):(o?.orderNumber||o?.id)}catch(e){return o?.id}}
function modelGrade(o,pid){return (Array.isArray(o?.grade)?o.grade:[]).filter(g=>sid(g?.productId)===sid(pid)&&q(g?.qty)>0)}
function modelPieces(o,pid){return modelGrade(o,pid).reduce((s,g)=>s+q(g.qty),0)}
function modelIds(o){return [...new Set((Array.isArray(o?.grade)?o.grade:[]).map(g=>sid(g?.productId)).filter(Boolean))]}
function productName(pid){return productById(pid)?.name||'Produto'}
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
      const pieces=modelPieces(o,pid);if(pieces<=0)continue;
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
function renderMatches(){
  const box=document.getElementById('hlgbCutterPlannerResults');if(!box)return;
  const term=document.getElementById('hlgbCutterPlannerSearch')?.value||'';
  if(!norm(term)){box.innerHTML='<div class="empty">Digite o nome do produto, cliente ou número do pedido para pesquisar.</div>';return}
  const rows=matches(term);
  box.innerHTML=rows.length?rows.map(x=>'<button type="button" class="secondary hlgbCutterPlanChoice" data-key="'+escSafe(x.key)+'" style="text-align:left;width:100%;margin:4px 0;padding:10px 12px"><b>'+escSafe(x.productName)+'</b> · Pedido #'+escSafe(x.orderNo)+' · '+escSafe(x.client)+' · '+x.pieces.toLocaleString('pt-BR')+' pç · '+escSafe(x.priority)+(x.date?' · programado '+escSafe(x.date):'')+'</button>').join(''):'<div class="empty">Nenhum modelo encontrado para essa busca.</div>';
  box.querySelectorAll('.hlgbCutterPlanChoice').forEach(b=>b.onclick=()=>selectModel(b.dataset.key));
}
let selectedKey='';
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
async function saveRecord(row){
  if(typeof hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação oficial indisponível.');
  const out=await hlgbRecordSaveWithRetry('cuts',sid(row.id),row,false);if(!out?.applied)throw new Error('A nuvem não confirmou a programação do modelo.');
  db.cuts=Array.isArray(db.cuts)?db.cuts:[];const i=db.cuts.findIndex(c=>sid(c?.id)===sid(row.id));if(i>=0)db.cuts[i]=out.data||row;else db.cuts.push(out.data||row);
  return out.data||row;
}
async function save(){
  const x=selected();if(!x)throw new Error('Selecione um modelo.');
  const date=document.getElementById('hlgbCutterPlannerDate')?.value||'',cutterId=document.getElementById('hlgbCutterPlannerCutter')?.value||'';
  if(!date)throw new Error('Escolha a data do corte.');if(!cutterId)throw new Error('Escolha o cortador.');
  let target=x.cut;
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
  await saveRecord(next);
  try{localSaveOnly?.()}catch(e){}
  try{renderCuts?.();renderCutters?.();renderProjection?.();drawCutterChart?.()}catch(e){}
  const ok=document.getElementById('hlgbCutterPlannerFeedback');if(ok)ok.innerHTML='<span class="badge ok">'+escSafe(x.productName)+' programado para '+escSafe(date)+' · '+escSafe(cutterById(cutterId)?.name||'Cortador')+'</span>';
  selectedKey='';const s=document.getElementById('hlgbCutterPlannerSearch');if(s)s.value='';renderMatches();return true;
}
function ensurePanel(){
  const page=document.getElementById('cortadores');if(!page||document.getElementById('hlgbCutterPlanner'))return;
  const first=page.querySelector(':scope > .panel');const panel=document.createElement('div');panel.id='hlgbCutterPlanner';panel.className='panel';
  panel.innerHTML='<h2>🔎 Programar corte por modelo</h2><div class="sub">Cada modelo do pedido aparece separado. Você pode colocar datas e cortadores diferentes para cada modelo, mesmo quando pertencem ao mesmo pedido.</div><div class="toolbar" style="align-items:flex-end;flex-wrap:wrap;margin-top:10px"><div class="field" style="min-width:260px;flex:1"><label>Modelo / cliente / pedido</label><input id="hlgbCutterPlannerSearch" placeholder="Ex.: Camisola, Gisele ou pedido 87" oninput="hlgbCutterPlannerRender()"></div><div class="field"><label>Data deste modelo</label><input id="hlgbCutterPlannerDate" type="date" value="'+today()+'"></div><div class="field" style="min-width:200px"><label>Cortador</label><select id="hlgbCutterPlannerCutter"><option value="">Selecione</option>'+arr('cutters').filter(c=>c.active!==false).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR')).map(c=>'<option value="'+escSafe(c.id)+'">'+escSafe(c.name||'Cortador')+'</option>').join('')+'</select></div><button type="button" class="primary" onclick="hlgbCutterPlannerSave()">Salvar este modelo</button></div><div id="hlgbCutterPlannerSelected" class="sub" style="margin-top:8px">Nenhum modelo selecionado.</div><div id="hlgbCutterPlannerFeedback" style="margin-top:6px"></div><div id="hlgbCutterPlannerResults" style="max-height:320px;overflow:auto;margin-top:10px"><div class="empty">Digite para pesquisar.</div></div>';
  if(first)page.insertBefore(panel,first);else page.appendChild(panel);
}
window.hlgbCutterPlannerRender=renderMatches;window.hlgbCutterPlannerSave=async()=>{try{return await save()}catch(e){alert(String(e?.message||e));return false}};
window.hlgbCutterPlanner={modelRows,matches,selectModel,save,modelGrade,modelPieces,modelIds,productText};
const old=window.renderCutters;if(typeof old==='function'&&!old.__hlgbPlannerV3){const w=function(){const r=old.apply(this,arguments);setTimeout(ensurePanel,0);return r};w.__hlgbPlannerV3=true;w.__original=old;window.renderCutters=w}
function boot(){try{ensurePanel()}catch(e){console.warn('[HLGB cutter planner]',e)}}try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,900),0)}catch(e){}setTimeout(boot,1600);
window.HLGB_CUTTER_PLANNER_GUARD=V;
console.info('[HLGB] programação dos cortadores por modelo v3 ativa');
})();