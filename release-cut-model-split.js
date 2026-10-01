/* HLGB — desvincular corte do pedido e separar por modelo */
(function(){
'use strict';
const V='2026.10.01-cut-model-split-v1';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function order(id){return arr('orders').find(o=>sid(o?.id)===sid(id))||null}
function product(id){return arr('products').find(p=>sid(p?.id)===sid(id))||null}
function cutter(id){return arr('cutters').find(c=>sid(c?.id)===sid(id))||null}
function orderNo(o){try{return typeof displayOrderNumber==='function'?displayOrderNumber(o):(o?.orderNumber||o?.id)}catch(e){return o?.orderNumber||o?.id}}
function modelIds(o){return [...new Set((Array.isArray(o?.grade)?o.grade:[]).map(g=>sid(g?.productId)).filter(Boolean))]}
function modelGrade(o,pid){return (Array.isArray(o?.grade)?o.grade:[]).filter(g=>sid(g?.productId)===sid(pid)&&q(g?.qty)>0)}
function modelPieces(o,pid){return modelGrade(o,pid).reduce((a,g)=>a+q(g.qty),0)}
function isFinal(c){return norm(c?.status)==='finalizado'}
function splitChildren(orderId){return arr('cuts').filter(c=>sid(c?.orderId)===sid(orderId)&&c?.modelSplitChildV1)}
function hasCompleteSplit(o){
 const ids=modelIds(o);if(ids.length<2)return false;
 const got=new Set(splitChildren(o.id).map(c=>sid(c.productId)));
 return ids.every(id=>got.has(id));
}
function parentCut(o){
 const cuts=arr('cuts').filter(c=>sid(c?.orderId)===sid(o.id)&&!c?.modelSplitChildV1&&!isFinal(c));
 return cuts.find(c=>c.autoOrderCutV9199)||cuts[0]||null;
}
function newId(){
 let id=Date.now()+Math.floor(Math.random()*100000);
 while(arr('cuts').some(c=>sid(c.id)===sid(id)))id++;
 return id;
}
async function saveRecord(module,row){
 if(typeof hlgbRecordSaveWithRetry==='function'){
  const out=await hlgbRecordSaveWithRetry(module,sid(row.id),row,false);
  if(!out?.applied)throw new Error('A nuvem não confirmou '+module+'.');
  return out.data||row;
 }
 if(typeof persistDb==='function'){persistDb();return row}
 throw new Error('Gravação indisponível.');
}
function upsert(module,row){
 db[module]=Array.isArray(db[module])?db[module]:[];
 const i=db[module].findIndex(x=>sid(x?.id)===sid(row.id));if(i>=0)db[module][i]=row;else db[module].push(row);
}
async function splitOrder(orderId){
 const o=order(orderId);if(!o)throw new Error('Pedido não encontrado.');
 const ids=modelIds(o);if(ids.length<2)throw new Error('Este pedido possui somente um modelo.');
 const parent=parentCut(o);
 const savedChildren=[];
 for(const pid of ids){
  const grade=modelGrade(o,pid),pieces=modelPieces(o,pid),p=product(pid);
  let child=splitChildren(o.id).find(c=>sid(c.productId)===sid(pid))
    ||arr('cuts').find(c=>sid(c.orderId)===sid(o.id)&&sid(c.productId)===sid(pid)&&!c.modelSplitParentV1&&!isFinal(c));
  const base=child||{
    id:newId(),orderId:o.id,client:o.client||'',op:(parent?.op||('PED-'+o.id))+'-'+sid(pid).slice(-4),
    date:parent?.date||o.date||new Date().toISOString().slice(0,10),
    productionLocationId:parent?.productionLocationId||null,cutterId:parent?.cutterId||null,cutType:parent?.cutType||'',
    plannedCutDate:parent?.plannedCutDate||'',status:'Planejado',createdAt:new Date().toISOString()
  };
  const next={...base,productId:Number.isFinite(+pid)?+pid:pid,product:p?.name||'Produto',pieces,
    originalPieces:pieces,originalGrade:grade.map(x=>({...x})),actualCutGrade:Array.isArray(base.actualCutGrade)&&base.actualCutGrade.length?base.actualCutGrade:grade.map(x=>({...x})),
    modelSplitChildV1:true,modelSplitFromOrderId:o.id,modelSplitFromParentCutId:parent?.id||base.modelSplitFromParentCutId||null,
    materialSeparationParallel:true,updatedAt:new Date().toISOString()};
  const saved=await saveRecord('cuts',next);upsert('cuts',saved);savedChildren.push(saved);
 }
 if(parent){
  const nextParent={...parent,modelSplitParentV1:true,hiddenByModelSplitV1:true,modelSplitAt:new Date().toISOString(),status:'Desmembrado por modelo',updatedAt:new Date().toISOString()};
  const savedParent=await saveRecord('cuts',nextParent);upsert('cuts',savedParent);
 }
 o.cutSplitByModelV1=true;o.cutSplitAt=new Date().toISOString();
 const savedOrder=await saveRecord('orders',o);upsert('orders',savedOrder);
 try{localSaveOnly?.()}catch(e){}
 try{renderCuts?.();renderDailyCuts?.()}catch(e){}
 return savedChildren;
}
function cutterOptions(selected){
 return '<option value="">Cortador</option>'+arr('cutters').filter(c=>c.active!==false).map(c=>'<option value="'+escSafe(c.id)+'" '+(sid(c.id)===sid(selected)?'selected':'')+'>'+escSafe(c.name||'Cortador')+'</option>').join('');
}
function cutTypeOptions(selected){
 return '<option value="">Tipo</option><option value="Interno" '+(selected==='Interno'?'selected':'')+'>Interno</option><option value="Externo" '+(selected==='Externo'?'selected':'')+'>Externo</option>';
}
async function saveSchedule(id){
 const c=arr('cuts').find(x=>sid(x.id)===sid(id));if(!c)return;
 const d=document.getElementById('hlgbSplitDate_'+id)?.value||'',ct=document.getElementById('hlgbSplitCutter_'+id)?.value||'',type=document.getElementById('hlgbSplitType_'+id)?.value||'';
 const next={...c,plannedCutDate:d,cutterId:ct?(Number.isFinite(+ct)?+ct:ct):null,cutType:type,scheduleUpdatedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
 const saved=await saveRecord('cuts',next);upsert('cuts',saved);try{localSaveOnly?.()}catch(e){};renderSplitPanel();
}
function allChildrenDone(o){
 const ids=modelIds(o),children=splitChildren(o.id);return ids.length>0&&ids.every(pid=>children.some(c=>sid(c.productId)===sid(pid)&&isFinal(c)));
}
async function finishChild(id){
 const c=arr('cuts').find(x=>sid(x.id)===sid(id)&&x.modelSplitChildV1);if(!c)return;
 const o=order(c.orderId),orig=(Array.isArray(c.originalGrade)?c.originalGrade:[]).map(x=>({...x}));
 const rows=orig.map((it,i)=>'<tr><td>'+escSafe(product(it.productId)?.name||c.product||'Produto')+'</td><td>'+escSafe(it.color||'-')+'</td><td>'+escSafe(it.size||'-')+'</td><td>'+q(it.qty)+'</td><td><input id="hlgbSplitActual_'+i+'" type="number" min="0" step="1" value="'+q((c.actualCutGrade||[]).find(a=>sid(a.productId)===sid(it.productId)&&String(a.color||'')===String(it.color||'')&&String(a.size||'')===String(it.size||''))?.qty??it.qty)+'" style="width:80px"></td></tr>').join('');
 openModal('Finalizar modelo — '+escSafe(c.product||'Produto'),'<div class="sub">Este fechamento afeta somente este modelo. Os outros modelos do pedido continuam separados.</div><div style="overflow:auto;margin-top:10px"><table><thead><tr><th>Produto</th><th>Cor</th><th>Tamanho</th><th>Previsto</th><th>Cortado</th></tr></thead><tbody>'+rows+'</tbody></table></div><div class="field" style="margin-top:10px"><label>Observação</label><textarea id="hlgbSplitNote">'+escSafe(c.cutAdjustmentNote||'')+'</textarea></div><button type="button" class="primary modalSave">✅ Confirmar este modelo</button>',async()=>{
  const actual=orig.map((it,i)=>({...it,qty:q(document.getElementById('hlgbSplitActual_'+i)?.value)})),pieces=actual.reduce((a,x)=>a+q(x.qty),0);
  const next={...c,actualCutGrade:actual,pieces,cutAdjustmentNote:document.getElementById('hlgbSplitNote')?.value||'',status:'Finalizado',finishedAt:new Date().toISOString().slice(0,10),finishedAtTime:new Date().toISOString(),updatedAt:new Date().toISOString()};
  try{
   const saved=await saveRecord('cuts',next);upsert('cuts',saved);
   const oo=order(c.orderId);
   if(oo&&allChildrenDone(oo)){const on={...oo,status:'Corte finalizado',updatedAt:new Date().toISOString()};const os=await saveRecord('orders',on);upsert('orders',os)}
   try{localSaveOnly?.();syncFinalizedCutsToProduction?.()}catch(e){}
   closeModal();renderCuts?.();renderDailyCuts?.();renderProduction?.();renderOrders?.();return true;
  }catch(e){alert('Não foi possível finalizar este modelo.\n\n'+String(e?.message||e));return false}
 });
}
function gradeMini(c){
 const sizes=[...new Set((c.originalGrade||[]).map(g=>g.size).filter(Boolean))],colors=[...new Set((c.originalGrade||[]).map(g=>g.color||'-'))];
 if(!sizes.length)return '';
 const rows=colors.map(color=>'<tr><td>'+escSafe(color)+'</td>'+sizes.map(s=>'<td>'+q((c.originalGrade||[]).filter(g=>String(g.color||'-')===String(color)&&String(g.size||'')===String(s)).reduce((a,g)=>a+q(g.qty),0))+'</td>').join('')+'</tr>').join('');
 return '<details style="margin-top:6px"><summary>Ver grade deste modelo</summary><div style="overflow:auto"><table><thead><tr><th>Cor</th>'+sizes.map(s=>'<th>'+escSafe(s)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div></details>';
}
function renderSplitPanel(){
 const root=document.getElementById('cutTable');if(!root)return;
 let panel=document.getElementById('hlgbCutSplitPanel');
 if(!panel){panel=document.createElement('div');panel.id='hlgbCutSplitPanel';panel.className='panel';panel.style.marginBottom='14px';root.insertAdjacentElement('beforebegin',panel)}
 const orders=arr('orders').filter(o=>hasCompleteSplit(o));
 if(!orders.length){panel.innerHTML='<h2>✂️ Cortes separados por modelo</h2><div class="empty">Nenhum pedido foi separado por modelo ainda.</div>';return}
 let html='<h2>✂️ Cortes separados por modelo</h2><div class="sub">Cada linha abaixo é um modelo independente do pedido. Materiais, cortador, data e finalização ficam separados.</div>';
 for(const o of orders){
  const children=splitChildren(o.id).sort((a,b)=>String(a.product||'').localeCompare(String(b.product||''),'pt-BR'));
  html+='<div class="panel" style="margin-top:10px;background:#fff8fb"><h3 style="margin:0 0 8px">Pedido #'+escSafe(orderNo(o))+' · '+escSafe(o.client||'-')+'</h3>';
  for(const c of children){
   const done=isFinal(c),ct=cutter(c.cutterId);
   html+='<div class="panel" style="margin:8px 0;background:#fff"><div style="display:grid;grid-template-columns:minmax(180px,1.4fr) 110px minmax(260px,1.4fr) minmax(260px,1.6fr);gap:10px;align-items:center"><div><b>'+escSafe(c.product||product(c.productId)?.name||'Produto')+'</b><div class="sub">'+q(c.pieces).toLocaleString('pt-BR')+' peças · '+(done?'✅ Finalizado':'A cortar')+(ct?' · '+escSafe(ct.name):'')+'</div>'+gradeMini(c)+'</div><div>'+q(c.pieces).toLocaleString('pt-BR')+' pç</div><div class="cut-schedule-inline"><input id="hlgbSplitDate_'+escSafe(c.id)+'" type="date" value="'+escSafe(c.plannedCutDate||'')+'" '+(done?'disabled':'')+'><select id="hlgbSplitCutter_'+escSafe(c.id)+'" '+(done?'disabled':'')+'>'+cutterOptions(c.cutterId)+'</select><select id="hlgbSplitType_'+escSafe(c.id)+'" '+(done?'disabled':'')+'>'+cutTypeOptions(c.cutType||'')+'</select>'+(done?'':'<button class="secondary" onclick="hlgbSaveSplitCutSchedule(\''+escSafe(c.id)+'\')">Salvar</button>')+'</div><div class="toolbar">'+(typeof printCuttingSheet==='function'?'<button class="secondary" onclick="printCuttingSheet(\''+escSafe(o.id)+'\',\''+escSafe(c.id)+'\')">🖨️ Imprimir grade</button>':'')+'<button class="secondary" onclick="viewOrderDetails(\''+escSafe(o.id)+'\')">Pedido original</button>'+(typeof editCut==='function'&&!done?'<button class="secondary" onclick="editCut(\''+escSafe(c.id)+'\')">Detalhes</button>':'')+(window.openHlgbCutMaterialSheet?'<button class="secondary" onclick="openHlgbCutMaterialSheet(\''+escSafe(c.id)+'\')">⚖️ Materiais</button>':'')+(done?'<span class="badge ok">Finalizado</span>':'<button class="primary" onclick="hlgbFinishSplitCut(\''+escSafe(c.id)+'\')">✅ Finalizar modelo</button>')+'</div></div></div>';
  }
  html+='</div>';
 }
 panel.innerHTML=html;
 hideAggregateRows();
}
function decorateUnsplitRows(){
 const root=document.getElementById('cutTable');if(!root)return;
 root.querySelectorAll('tbody tr').forEach(tr=>{
  if(tr.querySelector('.hlgbSplitOrderBtn'))return;
  const cells=tr.children;if(cells.length<2)return;
  const displayed=String(cells[1]?.textContent||'').trim(),o=arr('orders').find(x=>sid(orderNo(x))===displayed||('#'+sid(orderNo(x)))===displayed);
  if(!o||modelIds(o).length<2||hasCompleteSplit(o))return;
  const cell=tr.lastElementChild;if(!cell)return;
  const b=document.createElement('button');b.type='button';b.className='secondary hlgbSplitOrderBtn';b.textContent='✂️ Separar por modelo';b.onclick=()=>confirmSplit(o.id);cell.appendChild(document.createTextNode(' '));cell.appendChild(b);
 });
}
function hideAggregateRows(){
 const root=document.getElementById('cutTable');if(!root)return;
 const splitNos=new Set(arr('orders').filter(hasCompleteSplit).map(o=>sid(orderNo(o))));
 root.querySelectorAll('tbody tr').forEach(tr=>{const n=String(tr.children?.[1]?.textContent||'').trim().replace(/^#/,'');if(splitNos.has(n))tr.style.display='none'});
}
async function confirmSplit(orderId){
 const o=order(orderId);if(!o)return;
 const names=modelIds(o).map(pid=>product(pid)?.name||'Produto');
 if(!confirm('Separar o pedido #'+orderNo(o)+' em '+names.length+' cortes independentes?\n\n'+names.join('\n')+'\n\nDepois cada modelo terá data, cortador, materiais e finalização próprios.'))return;
 try{await splitOrder(orderId);renderSplitPanel();decorateUnsplitRows()}catch(e){alert('Não foi possível separar o pedido.\n\n'+String(e?.message||e))}
}
window.hlgbSplitOrderCuts=confirmSplit;
window.hlgbSaveSplitCutSchedule=async id=>{try{await saveSchedule(id)}catch(e){alert(String(e?.message||e))}};
window.hlgbFinishSplitCut=finishChild;
window.hlgbCutModelSplit={splitOrder,splitChildren,hasCompleteSplit,modelGrade,modelPieces,renderSplitPanel};
const oldRender=window.renderCuts;
if(typeof oldRender==='function'&&!oldRender.__hlgbSplitV1){
 const w=function(){const r=oldRender.apply(this,arguments);setTimeout(()=>{decorateUnsplitRows();renderSplitPanel();hideAggregateRows()},0);return r};w.__hlgbSplitV1=true;w.__original=oldRender;window.renderCuts=w;
}
function boot(){try{decorateUnsplitRows();renderSplitPanel();hideAggregateRows()}catch(e){console.warn('[HLGB split corte]',e)}}try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,900),0)}catch(e){}setTimeout(boot,1600);
window.HLGB_CUT_MODEL_SPLIT_GUARD=V;
console.info('[HLGB] corte separado por modelo ativo');
})();