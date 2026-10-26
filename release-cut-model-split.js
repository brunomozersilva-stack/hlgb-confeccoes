/* HLGB v94.12 — corte e produção independentes por modelo */
(function(){
'use strict';
const V='94.12';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const selected=window.hlgbCutAssignmentSelection9412 instanceof Set?window.hlgbCutAssignmentSelection9412:new Set();
window.hlgbCutAssignmentSelection9412=selected;
function arr(n){try{db[n]=Array.isArray(db?.[n])?db[n]:[];return db[n]}catch(e){return []}}
function order(id){return arr('orders').find(o=>sid(o?.id)===sid(id))||null}
function product(id){return arr('products').find(p=>sid(p?.id)===sid(id))||null}
function cutter(id){return arr('cutters').find(c=>sid(c?.id)===sid(id))||null}
function orderNo(o){try{return typeof displayOrderNumber==='function'?displayOrderNumber(o):(o?.orderNumber||o?.id)}catch(e){return o?.orderNumber||o?.id}}
function modelIds(o){return [...new Set((Array.isArray(o?.grade)?o.grade:[]).map(g=>sid(g?.productId)).filter(Boolean))]}
function modelGrade(o,pid){return (Array.isArray(o?.grade)?o.grade:[]).filter(g=>sid(g?.productId)===sid(pid)&&q(g?.qty)>0)}
function modelPieces(o,pid){return modelGrade(o,pid).reduce((a,g)=>a+q(g.qty),0)}
function isFinal(c){return norm(c?.status)==='finalizado'}
function isTerminal(c){const s=norm(c?.status);return s==='finalizado'||s.includes('cancel')||s.includes('desmembrado')}
function splitChildren(orderId){return arr('cuts').filter(c=>sid(c?.orderId)===sid(orderId)&&c?.modelSplitChildV1)}
function hasCompleteSplit(o){
 const ids=modelIds(o);if(ids.length<2)return false;
 const got=new Set(splitChildren(o.id).map(c=>sid(c.productId)));
 return ids.every(id=>got.has(id));
}
function parentCut(o){
 const cuts=arr('cuts').filter(c=>sid(c?.orderId)===sid(o.id)&&!c?.modelSplitChildV1&&!isTerminal(c));
 return cuts.find(c=>c.autoOrderCutV9199||c.autoOrderCutV9203)||cuts[0]||null;
}
function newId(module='cuts'){
 let id=Date.now()*1000+Math.floor(Math.random()*900+100),a=arr(module);
 while(a.some(x=>sid(x?.id)===sid(id)))id++;
 return id;
}
async function saveRecord(module,row){
 if(typeof window.hlgbRecordSaveWithRetry==='function'){
  const out=await window.hlgbRecordSaveWithRetry(module,sid(row.id??row.__hlgbId),clone(row),false);
  if(!out?.applied)throw new Error('A nuvem não confirmou '+module+'.');
  return out.data||row;
 }
 if(typeof persistDb==='function'){persistDb();return row}
 throw new Error('Gravação indisponível.');
}
function upsert(module,row){
 const a=arr(module),id=sid(row?.id??row?.__hlgbId),i=a.findIndex(x=>sid(x?.id??x?.__hlgbId)===id);
 if(i>=0)a[i]=clone(row);else a.push(clone(row));
}
async function splitOrder(orderId,{automatic=false}={}){
 const o=order(orderId);if(!o)throw new Error('Pedido não encontrado.');
 const ids=modelIds(o);if(ids.length<2)return [];
 if(hasCompleteSplit(o))return splitChildren(o.id);
 const parent=parentCut(o);if(!parent)return [];
 const savedChildren=[];
 for(const pid of ids){
  const grade=modelGrade(o,pid),pieces=modelPieces(o,pid),p=product(pid);
  if(pieces<=0)continue;
  let child=splitChildren(o.id).find(c=>sid(c.productId)===sid(pid))
    ||arr('cuts').find(c=>sid(c.orderId)===sid(o.id)&&sid(c.productId)===sid(pid)&&!c.modelSplitParentV1&&!isTerminal(c));
  const base=child||{
    id:newId('cuts'),orderId:o.id,client:o.client||'',op:(parent.op||('PED-'+o.id))+'-'+sid(pid).slice(-4),
    date:parent.date||o.date||new Date().toISOString().slice(0,10),
    productionLocationId:null,factionId:null,cutterId:parent.cutterId||null,cutType:parent.cutType||'',
    plannedCutDate:parent.plannedCutDate||'',status:'Planejado',createdAt:new Date().toISOString()
  };
  const next={...base,
    productId:Number.isFinite(+pid)?+pid:pid,product:p?.name||base.product||'Produto',pieces,
    productionLocationId:null,factionId:null,
    originalPieces:pieces,originalGrade:grade.map(x=>({...x})),
    actualCutGrade:Array.isArray(base.actualCutGrade)&&base.actualCutGrade.length?base.actualCutGrade:grade.map(x=>({...x})),
    modelSplitChildV1:true,modelSplitFromOrderId:o.id,modelSplitFromParentCutId:parent.id,
    orderReferenceNumber:orderNo(o),materialSeparationParallel:true,autoModelSplitV9412:automatic||base.autoModelSplitV9412===true,
    updatedAt:new Date().toISOString()
  };
  const saved=await saveRecord('cuts',next);upsert('cuts',saved);savedChildren.push(saved);
 }
 const nextParent={...parent,modelSplitParentV1:true,hiddenByModelSplitV1:true,modelSplitAt:new Date().toISOString(),status:'Desmembrado por modelo',updatedAt:new Date().toISOString()};
 const savedParent=await saveRecord('cuts',nextParent);upsert('cuts',savedParent);
 const nextOrder={...o,cutSplitByModelV1:true,cutSplitAt:new Date().toISOString(),cutSplitAutomaticV9412:automatic||o.cutSplitAutomaticV9412===true,updatedAt:new Date().toISOString()};
 const savedOrder=await saveRecord('orders',nextOrder);upsert('orders',savedOrder);
 try{localSaveOnly?.()}catch(e){}
 return savedChildren;
}
let autoBusy=false;
async function autoSplitPendingOrders(){
 if(autoBusy||window.__HLGB_AUTH_READY!==true)return 0;
 if(typeof hlgbRecordReady!=='undefined'&&hlgbRecordReady===false)return 0;
 const list=arr('orders').filter(o=>modelIds(o).length>1&&!hasCompleteSplit(o)&&!!parentCut(o));
 if(!list.length)return 0;
 autoBusy=true;let done=0;
 try{
  for(const o of list){
   try{const rows=await splitOrder(o.id,{automatic:true});if(rows.length)done++}
   catch(e){console.warn('[HLGB corte '+V+'] auto desmembrar pedido '+sid(o.id),e)}
  }
  if(done){try{renderCuts?.();renderDailyCuts?.()}catch(e){}}
  return done;
 }finally{autoBusy=false}
}
function cutterOptions(selectedId){
 return '<option value="">Cortador</option>'+arr('cutters').filter(c=>c.active!==false).map(c=>'<option value="'+escSafe(c.id)+'" '+(sid(c.id)===sid(selectedId)?'selected':'')+'>'+escSafe(c.name||'Cortador')+'</option>').join('');
}
function cutTypeOptions(selectedValue){
 return '<option value="">Tipo</option><option value="Interno" '+(selectedValue==='Interno'?'selected':'')+'>Interno</option><option value="Externo" '+(selectedValue==='Externo'?'selected':'')+'>Externo</option>';
}
async function saveSchedule(id){
 const c=arr('cuts').find(x=>sid(x.id)===sid(id));if(!c)return false;
 const d=document.getElementById('hlgbSplitDate_'+id)?.value||'',ct=document.getElementById('hlgbSplitCutter_'+id)?.value||'',type=document.getElementById('hlgbSplitType_'+id)?.value||'';
 const next={...c,plannedCutDate:d,cutterId:ct?(Number.isFinite(+ct)?+ct:ct):null,cutType:type,scheduleUpdatedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
 const saved=await saveRecord('cuts',next);upsert('cuts',saved);try{localSaveOnly?.()}catch(e){};renderSplitPanel();return true;
}
function allChildrenDone(o){const ids=modelIds(o),children=splitChildren(o.id);return ids.length>0&&ids.every(pid=>children.some(c=>sid(c.productId)===sid(pid)&&isFinal(c)))}
async function finishChild(id){
 const c=arr('cuts').find(x=>sid(x.id)===sid(id)&&x.modelSplitChildV1);if(!c)return;
 const o=order(c.orderId),orig=(Array.isArray(c.originalGrade)?c.originalGrade:[]).map(x=>({...x}));
 const rows=orig.map((it,i)=>'<tr><td>'+escSafe(product(it.productId)?.name||c.product||'Produto')+'</td><td>'+escSafe(it.color||'-')+'</td><td>'+escSafe(it.size||'-')+'</td><td>'+q(it.qty)+'</td><td><input id="hlgbSplitActual_'+i+'" type="number" min="0" step="1" value="'+q((c.actualCutGrade||[]).find(a=>sid(a.productId)===sid(it.productId)&&String(a.color||'')===String(it.color||'')&&String(a.size||'')===String(it.size||''))?.qty??it.qty)+'" style="width:80px"></td></tr>').join('');
 openModal('Finalizar modelo — '+escSafe(c.product||'Produto'),'<div class="sub">Este fechamento afeta somente este modelo. O pedido #'+escSafe(orderNo(o))+' continua apenas como referência.</div><div style="overflow:auto;margin-top:10px"><table><thead><tr><th>Produto</th><th>Cor</th><th>Tamanho</th><th>Previsto</th><th>Cortado</th></tr></thead><tbody>'+rows+'</tbody></table></div><div class="field" style="margin-top:10px"><label>Observação</label><textarea id="hlgbSplitNote">'+escSafe(c.cutAdjustmentNote||'')+'</textarea></div><button type="button" class="primary modalSave">✅ Confirmar este modelo</button>',async()=>{
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
 if(!orders.length){panel.innerHTML='<h2>✂️ Cortes separados por modelo</h2><div class="empty">Os pedidos com vários modelos serão desmembrados automaticamente quando entrarem no corte.</div>';return}
 let html='<h2>✂️ Cortes separados por modelo</h2><div class="sub">Cada modelo é um corte independente. O número do pedido aparece apenas como referência.</div>';
 for(const o of orders){
  const children=splitChildren(o.id).sort((a,b)=>String(a.product||'').localeCompare(String(b.product||''),'pt-BR'));
  html+='<div class="panel" style="margin-top:10px;background:#fff8fb"><h3 style="margin:0 0 8px">Pedido #'+escSafe(orderNo(o))+' · '+escSafe(o.client||'-')+'</h3>';
  for(const c of children){
   const done=isFinal(c),ct=cutter(c.cutterId);
   html+='<div class="panel" style="margin:8px 0;background:#fff"><div style="display:grid;grid-template-columns:minmax(180px,1.4fr) 100px minmax(260px,1.4fr) minmax(260px,1.6fr);gap:10px;align-items:center"><div><b>'+escSafe(c.product||product(c.productId)?.name||'Produto')+'</b><div class="sub">Pedido #'+escSafe(orderNo(o))+' · '+(done?'✅ Finalizado':'A cortar')+(ct?' · '+escSafe(ct.name):'')+'</div>'+gradeMini(c)+'</div><div>'+q(c.pieces).toLocaleString('pt-BR')+' pç</div><div class="cut-schedule-inline"><input id="hlgbSplitDate_'+escSafe(c.id)+'" type="date" value="'+escSafe(c.plannedCutDate||'')+'" '+(done?'disabled':'')+'><select id="hlgbSplitCutter_'+escSafe(c.id)+'" '+(done?'disabled':'')+'>'+cutterOptions(c.cutterId)+'</select><select id="hlgbSplitType_'+escSafe(c.id)+'" '+(done?'disabled':'')+'>'+cutTypeOptions(c.cutType||'')+'</select>'+(done?'':'<button class="secondary" onclick="hlgbSaveSplitCutSchedule(\''+escSafe(c.id)+'\')">Salvar</button>')+'</div><div class="toolbar">'+(typeof printCuttingSheet==='function'?'<button class="secondary" onclick="printCuttingSheet(\''+escSafe(o.id)+'\',\''+escSafe(c.id)+'\')">🖨️ Imprimir grade</button>':'')+'<button class="secondary" onclick="viewOrderDetails(\''+escSafe(o.id)+'\')">Pedido original</button>'+(typeof editCut==='function'&&!done?'<button class="secondary" onclick="editCut(\''+escSafe(c.id)+'\')">Detalhes</button>':'')+(window.openHlgbCutMaterialSheet?'<button class="secondary" onclick="openHlgbCutMaterialSheet(\''+escSafe(c.id)+'\')">⚖️ Materiais</button>':'')+(done?'<span class="badge ok">Finalizado</span>':'<button class="primary" onclick="hlgbFinishSplitCut(\''+escSafe(c.id)+'\')">✅ Finalizar modelo</button>')+'</div></div></div>';
  }
  html+='</div>';
 }
 panel.innerHTML=html;hideAggregateRows();
}
function hideAggregateRows(){
 const root=document.getElementById('cutTable');if(!root)return;
 const splitNos=new Set(arr('orders').filter(hasCompleteSplit).map(o=>sid(orderNo(o))));
 root.querySelectorAll('tbody tr').forEach(tr=>{const n=String(tr.children?.[1]?.textContent||'').trim().replace(/^#/,'');if(splitNos.has(n))tr.style.display='none'});
}
async function confirmSplit(orderId){
 const o=order(orderId);if(!o)return;
 const names=modelIds(o).map(pid=>product(pid)?.name||'Produto');
 if(!confirm('Separar o pedido #'+orderNo(o)+' em '+names.length+' cortes independentes?\n\n'+names.join('\n')+'\n\nCada modelo terá corte e produção próprios.'))return;
 try{await splitOrder(orderId,{automatic:false});renderSplitPanel()}catch(e){alert('Não foi possível separar o pedido.\n\n'+String(e?.message||e))}
}
function isWaitingProduction(p){
 const s=norm(p?.stage);return !p?.assignedAt&&!p?.finishedAt&&q(p?.done)===0&&(s===''||s.includes('aguardando atribuicao')||s.includes('aguardando producao'));
}
async function repairInheritedDestinations(){
 if(window.__HLGB_AUTH_READY!==true)return {checked:0,repaired:0};
 if(typeof hlgbRecordReady!=='undefined'&&hlgbRecordReady===false)return {checked:0,repaired:0};
 const bad=arr('production').filter(p=>isWaitingProduction(p)&&(p.productionLocationId||p.factionId));
 let repaired=0;
 for(const p of bad){
  const next={...clone(p),productionLocationId:null,factionId:null,assignedAt:'',sentToFactionAt:'',updatedAt:new Date().toISOString(),destinationRepairV9412:true};
  try{const saved=await saveRecord('production',next);upsert('production',saved);try{removeProductionFactionLink?.(saved)}catch(e){};repaired++}
  catch(e){console.warn('[HLGB corte '+V+'] limpar destino herdado '+sid(p.id),e)}
 }
 if(repaired){try{localSaveOnly?.();renderCutTracking9173?.();renderCutAssignmentQueue?.();renderProduction?.()}catch(e){}}
 return {checked:bad.length,repaired};
}
function commonDestinations(rows){
 let map=null;
 for(const p of rows){
  const service=typeof hlgb916ServiceNameForProduction==='function'?hlgb916ServiceNameForProduction(p):'';
  const list=typeof hlgb916EligibleDestinations==='function'?hlgb916EligibleDestinations(service):[];
  const cur=new Map(list.map(d=>[d.type+':'+d.id,d]));
  if(map===null)map=cur;else for(const k of [...map.keys()])if(!cur.has(k))map.delete(k);
 }
 return [...(map||new Map()).values()];
}
function trackingProductionId(row){
 const b=[...(row?.querySelectorAll?.('button[onclick]')||[])].find(x=>/openCutAssignment\(/.test(String(x.getAttribute('onclick')||'')));
 const m=String(b?.getAttribute('onclick')||'').match(/openCutAssignment\(\s*['"]?(\d+)/);return m?m[1]:'';
}
function decorateTrackingSelection(){
 const panel=document.getElementById('cutTracking9173');if(!panel)return false;
 let tools=document.getElementById('hlgbCutGroupTools9412');
 if(!tools){
  tools=document.createElement('div');tools.id='hlgbCutGroupTools9412';tools.className='toolbar';tools.style.margin='10px 0';
  tools.innerHTML='<button type="button" class="secondary" id="hlgbCutSelectAll9412">✓ Selecionar todos aguardando</button><button type="button" class="primary" id="hlgbCutAssignSelected9412">🏭 Atribuir selecionados em grupo</button><button type="button" class="secondary" id="hlgbCutClearSelected9412">Limpar seleção</button><span class="sub" id="hlgbCutSelectedCount9412"></span>';
  const rows=panel.querySelector('#cutTrackRows9173');if(rows)panel.insertBefore(tools,rows);else panel.appendChild(tools);
  tools.querySelector('#hlgbCutSelectAll9412').onclick=()=>{panel.querySelectorAll('.hlgb-cut-select9412:not(:disabled)').forEach(cb=>{if(cb.closest('.cut-track9173')?.offsetParent!==null){cb.checked=true;selected.add(sid(cb.value))}});updateTrackingSelectionCount()};
  tools.querySelector('#hlgbCutClearSelected9412').onclick=()=>{selected.clear();panel.querySelectorAll('.hlgb-cut-select9412').forEach(cb=>cb.checked=false);updateTrackingSelectionCount()};
  tools.querySelector('#hlgbCutAssignSelected9412').onclick=openGroupAssignment;
 }
 panel.querySelectorAll('.cut-track9173').forEach(row=>{
  const pid=trackingProductionId(row);if(!pid)return;
  let cb=row.querySelector('.hlgb-cut-select9412');
  if(!cb){cb=document.createElement('input');cb.type='checkbox';cb.className='hlgb-cut-select9412';cb.value=pid;cb.title='Selecionar este modelo para atribuição em grupo';row.insertBefore(cb,row.firstChild);cb.onchange=()=>{if(cb.checked)selected.add(sid(pid));else selected.delete(sid(pid));updateTrackingSelectionCount()}}
  cb.checked=selected.has(sid(pid));
 });
 for(const id of [...selected])if(!arr('production').some(p=>sid(p.id)===id&&isWaitingProduction(p)))selected.delete(id);
 updateTrackingSelectionCount();return true;
}
function updateTrackingSelectionCount(){const e=document.getElementById('hlgbCutSelectedCount9412');if(e)e.textContent=selected.size?selected.size+' modelo(s) selecionado(s)':''}
function todayIso(){return new Date().toISOString().slice(0,10)}
function groupDestinationChanged(){
 const raw=document.getElementById('hlgbGroupDest9412')?.value||'',show=raw.startsWith('F:');
 const w=document.getElementById('hlgbGroupRateWrap9412');if(w)w.style.display=show?'':'none';
}
async function openGroupAssignment(){
 const rows=[...selected].map(id=>arr('production').find(p=>sid(p.id)===sid(id))).filter(p=>p&&isWaitingProduction(p));
 if(!rows.length)return alert('Selecione pelo menos um modelo que esteja aguardando atribuição.');
 const dests=commonDestinations(rows);if(!dests.length)return alert('Os modelos selecionados não possuem um mesmo local/facção compatível. Atribua separadamente ou ajuste os tipos de serviço.');
 const opts=dests.map(d=>'<option value="'+escSafe(d.type+':'+d.id)+'">'+(d.type==='F'?'Facção':'Local')+' — '+escSafe(d.name||'Destino')+'</option>').join('');
 openModal('Atribuir '+rows.length+' modelo(s) em grupo','<div class="sub">Somente os modelos marcados serão enviados. O pedido continua apenas como referência.</div><div style="margin:10px 0">'+rows.map(p=>'<span class="badge" style="margin:3px">'+escSafe(product(p.productId)?.name||p.product||'Produto')+' · '+q(p.planned)+' pç</span>').join('')+'</div><div class="grid"><div class="field"><label>Local / facção comum</label><select id="hlgbGroupDest9412"><option value="">Selecione</option>'+opts+'</select></div><div class="field"><label>Semana</label><input id="hlgbGroupWeek9412" type="date" value="'+todayIso()+'"></div><div class="field"><label>Previsão</label><input id="hlgbGroupDue9412" type="date" value="'+todayIso()+'"></div><div class="field" id="hlgbGroupRateWrap9412" style="display:none"><label>Valor da facção por peça</label><input id="hlgbGroupRate9412" type="number" min="0" step=".01"><div class="sub">Use o mesmo valor somente se servir para todos os modelos selecionados; caso contrário atribua a facção separadamente.</div></div></div><button type="button" class="primary modalSave">Confirmar atribuição dos selecionados</button>',async()=>{
  const raw=document.getElementById('hlgbGroupDest9412')?.value||'',dest=dests.find(d=>d.type+':'+d.id===raw);if(!dest)return alert('Selecione o destino.');
  const rate=q(document.getElementById('hlgbGroupRate9412')?.value);if(dest.type==='F'&&rate<=0)return alert('Informe o valor por peça da facção.');
  const week=document.getElementById('hlgbGroupWeek9412')?.value||todayIso(),due=document.getElementById('hlgbGroupDue9412')?.value||todayIso(),btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='Salvando modelos…'}
  try{
   for(const p0 of rows){
    const latest=arr('production').find(p=>sid(p.id)===sid(p0.id));if(!latest||!isWaitingProduction(latest))continue;
    const next={...clone(latest),stage:'Em produção',assignedAt:todayIso(),assignedWeekStart:week,factionDueDate:due,updatedAt:new Date().toISOString()};
    if(dest.type==='F'){next.factionId=dest.id;next.productionLocationId=dest.locationId||null}else{next.factionId=null;next.productionLocationId=dest.id}
    const saved=await saveRecord('production',next);upsert('production',saved);
    if(dest.type==='F'&&typeof syncProductionToFaction==='function'){
      syncProductionToFaction(saved);const fr=arr('factions').find(x=>sid(x.productionId)===sid(saved.id));if(fr){fr.price=rate;fr.sent=q(saved.planned);fr.description=product(saved.productId)?.name||saved.product||'';try{const fs=await saveRecord('factions',fr);upsert('factions',fs)}catch(e){console.warn('[HLGB corte '+V+'] comprovante facção',e)}}
    }else{try{removeProductionFactionLink?.(saved)}catch(e){}}
   }
   selected.clear();try{localSaveOnly?.()}catch(e){};closeModal();try{renderCutTracking9173?.();renderCutAssignmentQueue?.();renderProduction?.();renderProjection?.()}catch(e){};setTimeout(decorateTrackingSelection,40);return true;
  }catch(e){if(btn){btn.disabled=false;btn.textContent='Confirmar atribuição dos selecionados'}alert('Não foi possível confirmar toda a atribuição.\n\n'+String(e?.message||e));return false}
 });
 setTimeout(()=>{const d=document.getElementById('hlgbGroupDest9412');if(d)d.onchange=groupDestinationChanged},20);
}
function installTrackingHook(){
 const f=window.renderCutTracking9173;
 if(typeof f==='function'&&!f.__hlgbModelIndependent9412){const w=function(){const r=f.apply(this,arguments);setTimeout(decorateTrackingSelection,0);return r};w.__hlgbModelIndependent9412=true;w.__original=f;window.renderCutTracking9173=w}
 const filter=window.filterCutTracking9173;
 if(typeof filter==='function'&&!filter.__hlgbModelIndependent9412){const w=function(){const r=filter.apply(this,arguments);setTimeout(decorateTrackingSelection,0);return r};w.__hlgbModelIndependent9412=true;w.__original=filter;window.filterCutTracking9173=w}
}
window.hlgbSplitOrderCuts=confirmSplit;
window.hlgbSaveSplitCutSchedule=async id=>{try{await saveSchedule(id)}catch(e){alert(String(e?.message||e))}};
window.hlgbFinishSplitCut=finishChild;
window.hlgbRepairInheritedProductionDestinations9412=repairInheritedDestinations;
window.hlgbOpenCutGroupAssignment9412=openGroupAssignment;
window.hlgbCutModelSplit={version:V,splitOrder,splitChildren,hasCompleteSplit,modelGrade,modelPieces,renderSplitPanel,autoSplitPendingOrders,repairInheritedDestinations,decorateTrackingSelection};
const oldRender=window.renderCuts;
if(typeof oldRender==='function'&&!oldRender.__hlgbSplitV2){
 const w=function(){const r=oldRender.apply(this,arguments);setTimeout(()=>{renderSplitPanel();hideAggregateRows();decorateTrackingSelection();autoSplitPendingOrders()},0);return r};w.__hlgbSplitV1=true;w.__hlgbSplitV2=true;w.__original=oldRender;window.renderCuts=w;
}
function boot(){
 try{installTrackingHook();renderSplitPanel();hideAggregateRows();decorateTrackingSelection()}catch(e){console.warn('[HLGB corte '+V+'] boot',e)}
 setTimeout(()=>autoSplitPendingOrders(),500);
 setTimeout(()=>repairInheritedDestinations(),1300);
}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,900),0)}catch(e){}
setTimeout(()=>{if(window.__HLGB_AUTH_READY===true)boot()},1800);
window.addEventListener('pageshow',()=>setTimeout(()=>{installTrackingHook();decorateTrackingSelection()},100));
window.HLGB_CUT_MODEL_SPLIT_GUARD=V;
console.info('[HLGB] v'+V+' modelo independente: corte automático, atribuição separada/em grupo e reparo de destino herdado');
})();