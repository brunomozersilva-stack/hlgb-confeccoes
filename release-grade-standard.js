/* HLGB — padrão único de grade igual à Folha dos Cortadores */
(function(){
'use strict';
const V='2026.10.01-grade-standard-v1';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0);
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function product(id){return arr('products').find(p=>sid(p?.id)===sid(id))||null}
function order(id){return arr('orders').find(o=>sid(o?.id)===sid(id))||null}
function cut(id){return arr('cuts').find(c=>sid(c?.id)===sid(id))||null}
function sizes(){
 try{if(typeof hlgbSortedSizes==='function')return hlgbSortedSizes(db.sizes)}catch(e){}
 const from=[...new Set(arr('cuts').flatMap(c=>(c.originalGrade||[]).map(g=>g.size)).filter(Boolean))];
 return from.length?from:['P','M','G','GG'];
}
function keyOf(g){return sid(g?.productId)+'|'+String(g?.color||'-')}
function mapGrade(grade){
 const m=new Map();
 for(const g of Array.isArray(grade)?grade:[]){
  const k=keyOf(g);if(!m.has(k))m.set(k,{productId:g.productId,color:g.color||'-',qty:{}});
  m.get(k).qty[String(g.size||'')]=(m.get(k).qty[String(g.size||'')]||0)+q(g.qty);
 }
 return m;
}
function matrixEditable(planned,actual,prefix){
 const ss=sizes(),pm=mapGrade(planned),am=mapGrade(actual),heads=ss.map(s=>'<th>'+escSafe(s)+'</th>').join('');
 let body='';
 for(const row of pm.values()){
  const p=product(row.productId),a=am.get(keyOf(row))||{qty:{}};
  const cells=ss.map(s=>{
   const pv=q(row.qty[s]),av=a.qty[s]==null?pv:q(a.qty[s]);
   return '<td><div class="sub" style="margin-bottom:3px">Prev. '+pv+'</div><input class="hlgbStdGradeInput" data-product="'+escSafe(row.productId)+'" data-color="'+escSafe(row.color)+'" data-size="'+escSafe(s)+'" type="number" min="0" step="1" value="'+av+'" style="width:76px"></td>';
  }).join('');
  body+='<tr><td><b>'+escSafe(p?.name||'Produto')+'</b></td><td>'+escSafe(row.color)+'</td>'+cells+'<td class="hlgbStdRowTotal"></td></tr>';
 }
 return '<div style="overflow:auto"><table class="hlgbStdGradeTable"><thead><tr><th>Produto</th><th>Cor</th>'+heads+'<th>Total</th></tr></thead><tbody>'+body+'</tbody></table></div>';
}
function matrixReadOnly(planned,actual){
 const ss=sizes(),pm=mapGrade(planned),am=mapGrade(actual),keys=new Set([...pm.keys(),...am.keys()]),heads=ss.map(s=>'<th>'+escSafe(s)+'</th>').join('');
 let body='';
 for(const k of keys){
  const row=pm.get(k)||am.get(k),p=product(row.productId),po=pm.get(k)||{qty:{}},ac=am.get(k)||{qty:{}};
  const cells=ss.map(s=>{const a=q(po.qty[s]),b=q(ac.qty[s]),diff=b-a;return '<td><b>'+b+'</b><div class="sub">orig. '+a+(diff?' · '+(diff>0?'+':'')+diff:'')+'</div></td>'}).join('');
  const total=ss.reduce((n,s)=>n+q(ac.qty[s]),0);
  body+='<tr><td><b>'+escSafe(p?.name||'Produto')+'</b></td><td>'+escSafe(row.color)+'</td>'+cells+'<td><b>'+total+'</b></td></tr>';
 }
 return '<div style="overflow:auto"><table><thead><tr><th>Produto</th><th>Cor</th>'+heads+'<th>Total cortado</th></tr></thead><tbody>'+body+'</tbody></table></div>';
}
function collect(){
 return [...document.querySelectorAll('.hlgbStdGradeInput')].map(e=>({productId:Number.isFinite(+e.dataset.product)?+e.dataset.product:e.dataset.product,color:e.dataset.color==='-'?'':e.dataset.color,size:e.dataset.size,qty:q(e.value)})).filter(x=>x.qty>0);
}
function refreshTotals(){
 document.querySelectorAll('.hlgbStdGradeTable tbody tr').forEach(tr=>{const total=[...tr.querySelectorAll('.hlgbStdGradeInput')].reduce((a,e)=>a+q(e.value),0),td=tr.querySelector('.hlgbStdRowTotal');if(td)td.innerHTML='<b>'+total.toLocaleString('pt-BR')+'</b>'});
}
async function saveRecord(module,row){
 if(typeof hlgbRecordSaveWithRetry==='function'){
  const out=await hlgbRecordSaveWithRetry(module,sid(row.id),row,false);if(!out?.applied)throw new Error('A nuvem não confirmou '+module+'.');
  const data=out.data||row,box=arr(module),i=box.findIndex(x=>sid(x?.id)===sid(row.id));if(i>=0)box[i]=data;else box.push(data);return data;
 }
 const box=arr(module),i=box.findIndex(x=>sid(x?.id)===sid(row.id));if(i>=0)box[i]=row;else box.push(row);persistDb?.();return row;
}
function wireTotals(){document.querySelectorAll('.hlgbStdGradeInput').forEach(e=>e.addEventListener('input',refreshTotals));refreshTotals()}
async function finishRegular(id){
 const c=cut(id);if(!c)return;
 const o=order(c.orderId),planned=(Array.isArray(c.plannedGradeBeforeAdjustmentV9243)&&c.plannedGradeBeforeAdjustmentV9243.length?c.plannedGradeBeforeAdjustmentV9243:Array.isArray(c.originalGrade)&&c.originalGrade.length?c.originalGrade:(o?.grade||[])).map(x=>({...x}));
 const actual=(Array.isArray(c.actualCutGrade)&&c.actualCutGrade.length?c.actualCutGrade:planned).map(x=>({...x}));
 if(!planned.length){return window.__hlgbOriginalFinishCut?.(id)}
 openModal('Finalizar corte — grade padrão','<div class="sub">Mesmo formato da Folha dos Cortadores. O pedido original fica preservado.</div>'+matrixEditable(planned,actual,'regular')+'<div class="field" style="margin-top:12px"><label>Observação / motivo da alteração</label><textarea id="hlgbStdGradeNote">'+escSafe(c.cutAdjustmentNote||'')+'</textarea></div><button type="button" class="primary modalSave">✅ Confirmar corte finalizado</button>',async()=>{
  const finalGrade=collect();if(!finalGrade.length){alert('A grade cortada não pode ficar zerada.');return false}
  const next={...c,originalPieces:c.originalPieces||planned.reduce((a,x)=>a+q(x.qty),0),originalGrade:Array.isArray(c.originalGrade)&&c.originalGrade.length?c.originalGrade:planned.map(x=>({...x})),actualCutGrade:finalGrade,pieces:finalGrade.reduce((a,x)=>a+q(x.qty),0),cutAdjustmentNote:document.getElementById('hlgbStdGradeNote')?.value||'',status:'Finalizado',finishedAt:typeof isoDate==='function'?isoDate(new Date()):new Date().toISOString().slice(0,10),finishedAtTime:new Date().toISOString(),updatedAt:new Date().toISOString()};
  try{
   await saveRecord('cuts',next);
   if(o){await saveRecord('orders',{...o,status:'Corte finalizado',updatedAt:new Date().toISOString()})}
   try{localSaveOnly?.();syncFinalizedCutsToProduction?.()}catch(e){}
   closeModal();renderCuts?.();renderOrders?.();renderCutters?.();renderProduction?.();return true;
  }catch(e){alert('Não foi possível finalizar o corte.\n\n'+String(e?.message||e));return false}
 });
 setTimeout(wireTotals,0);
}
async function finishSplit(id){
 const c=cut(id);if(!c||!c.modelSplitChildV1)return;
 const o=order(c.orderId),planned=(c.originalGrade||[]).map(x=>({...x})),actual=(c.actualCutGrade?.length?c.actualCutGrade:planned).map(x=>({...x}));
 openModal('Finalizar modelo — '+escSafe(c.product||'Produto'),'<div class="sub">Mesmo formato da Folha dos Cortadores. Este fechamento afeta somente este modelo.</div>'+matrixEditable(planned,actual,'split')+'<div class="field" style="margin-top:12px"><label>Observação</label><textarea id="hlgbStdGradeNote">'+escSafe(c.cutAdjustmentNote||'')+'</textarea></div><button type="button" class="primary modalSave">✅ Confirmar este modelo</button>',async()=>{
  const finalGrade=collect();if(!finalGrade.length){alert('A grade cortada não pode ficar zerada.');return false}
  const saved=await saveRecord('cuts',{...c,actualCutGrade:finalGrade,pieces:finalGrade.reduce((a,x)=>a+q(x.qty),0),cutAdjustmentNote:document.getElementById('hlgbStdGradeNote')?.value||'',status:'Finalizado',finishedAt:new Date().toISOString().slice(0,10),finishedAtTime:new Date().toISOString(),updatedAt:new Date().toISOString()});
  const children=arr('cuts').filter(x=>sid(x?.orderId)===sid(c.orderId)&&x?.modelSplitChildV1),allDone=children.length&&children.every(x=>sid(x.id)===sid(saved.id)||String(x.status||'').toLowerCase()==='finalizado');
  if(o&&allDone)await saveRecord('orders',{...o,status:'Corte finalizado',updatedAt:new Date().toISOString()});
  try{localSaveOnly?.();syncFinalizedCutsToProduction?.()}catch(e){}
  closeModal();renderCuts?.();renderDailyCuts?.();renderProduction?.();renderOrders?.();return true;
 });
 setTimeout(wireTotals,0);
}
function adjustSplit(id){
 const c=cut(id);if(!c||!c.modelSplitChildV1)return;
 if(String(c.status||'').toLowerCase()==='finalizado')return alert('Este modelo já foi finalizado.');
 const planned=(c.originalGrade||[]).map(x=>({...x}));if(!planned.length)return alert('Este modelo não possui grade.');
 openModal('Ajustar grade do corte — '+escSafe(c.product||'Produto'),'<div class="sub">Mesmo formato da Folha dos Cortadores. A alteração vale somente para este modelo.</div>'+matrixEditable(planned,planned,'adjust')+'<div class="field" style="margin-top:12px"><label>Observação</label><textarea id="hlgbStdGradeNote">'+escSafe(c.cutGradeAdjustmentNote||'')+'</textarea></div><button type="button" class="primary modalSave">💾 Salvar grade deste modelo</button>',async()=>{
  const g=collect();if(!g.length){alert('A grade não pode ficar zerada.');return false}
  const next={...c,plannedGradeBeforeAdjustmentV9243:Array.isArray(c.plannedGradeBeforeAdjustmentV9243)&&c.plannedGradeBeforeAdjustmentV9243.length?c.plannedGradeBeforeAdjustmentV9243:planned.map(x=>({...x})),originalGrade:g,actualCutGrade:g.map(x=>({...x})),pieces:g.reduce((a,x)=>a+q(x.qty),0),cutGradeAdjustmentNote:document.getElementById('hlgbStdGradeNote')?.value||'',cutGradeAdjustedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  try{await saveRecord('cuts',next);try{localSaveOnly?.()}catch(e){}closeModal();renderCuts?.();return true}catch(e){alert('Não foi possível salvar a grade.');return false}
 });
 setTimeout(wireTotals,0);
}
function compare(id){
 const c=cut(id);if(!c)return;const o=order(c.orderId),planned=(Array.isArray(c.plannedGradeBeforeAdjustmentV9243)&&c.plannedGradeBeforeAdjustmentV9243.length?c.plannedGradeBeforeAdjustmentV9243:Array.isArray(c.originalGrade)&&c.originalGrade.length?c.originalGrade:(o?.grade||[])),actual=(c.actualCutGrade?.length?c.actualCutGrade:planned);
 openModal('Pedido original × corte realizado',matrixReadOnly(planned,actual)+'<div class="sub" style="margin-top:8px"><b>Observação:</b> '+escSafe(c.cutAdjustmentNote||c.cutGradeAdjustmentNote||'-')+'</div>',()=>{});
}
function install(){
 if(typeof window.finishCut==='function'&&!window.__hlgbOriginalFinishCut)window.__hlgbOriginalFinishCut=window.finishCut;
 window.finishCut=finishRegular;
 window.hlgbFinishSplitCut=finishSplit;
 window.hlgbOpenSplitGradeAdjust=adjustSplit;
 window.viewCutGradeComparison=compare;
 window.hlgbGradeMatrix={matrixEditable,matrixReadOnly,collect,refreshTotals};
}
install();setTimeout(install,1800);
window.HLGB_GRADE_STANDARD_GUARD=V;
console.info('[HLGB] padrão único de grade instalado');
})();