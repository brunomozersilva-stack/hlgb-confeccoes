/* HLGB v94.23 — integridade entre etapas: grade visível, baixa ao enviar para Nota e estabilidade visual */
(function(){
'use strict';
const V='94.23',EPS=0.000001;
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function arr(name){try{return Array.isArray(db?.[name])?db[name]:[]}catch(e){return []}}
function upsertLocal(module,row){const a=arr(module),id=sid(row?.id??row?.__hlgbId);if(!id)return;const i=a.findIndex(x=>sid(x?.id??x?.__hlgbId)===id);if(i>=0)a[i]=clone(row);else a.push(clone(row))}
function productName(id,fallback='Produto'){return arr('products').find(p=>sid(p?.id)===sid(id))?.name||fallback}
function cutGrade(c){if(!c)return[];const done=norm(c.status)==='finalizado';const actual=Array.isArray(c.actualCutGrade)?c.actualCutGrade:[];const original=Array.isArray(c.originalGrade)?c.originalGrade:[];return clone(done&&actual.length?actual:(actual.length?actual:original))}
function orderByAnyId(id){const x=sid(id);if(!x)return null;return arr('orders').find(o=>sid(o?.id)===x||sid(o?.noteSourceOrderId)===x)||null}
function orderAliases(id){const out=new Set(),o=orderByAnyId(id);if(id!=null)out.add(sid(id));if(o){out.add(sid(o.id));if(o.noteSourceOrderId!=null)out.add(sid(o.noteSourceOrderId))}return out}
function matchingCut(orderId,productId,sourceCutId){
 const cuts=arr('cuts');
 if(sourceCutId!=null){const c=cuts.find(x=>sid(x?.id)===sid(sourceCutId));if(c)return c}
 const aliases=orderAliases(orderId),pid=sid(productId);
 const rows=cuts.filter(c=>aliases.has(sid(c?.orderId))&&(!pid||sid(c?.productId)===pid));
 return rows.find(c=>norm(c?.status)==='finalizado')||rows[0]||null;
}
function gradeFor(module,row,meta={}){
 if(!row&&module!=='projection')return[];
 if(module==='cuts')return cutGrade(row);
 if(Array.isArray(row?.actualCutGrade)&&row.actualCutGrade.length)return clone(row.actualCutGrade);
 if(Array.isArray(row?.originalGrade)&&row.originalGrade.length)return clone(row.originalGrade);
 if(Array.isArray(row?.grade)&&row.grade.length)return clone(row.grade);
 const orderId=meta.orderId??row?.orderId??row?.readyOrderId??row?.sourceOrderId;
 const productId=meta.productId??row?.productId??row?.itemKey;
 const sourceCutId=row?.sourceCutId??row?.legacySourceCutId??row?.cutId;
 const c=matchingCut(orderId,productId,sourceCutId);if(c){const g=cutGrade(c);if(g.length)return g}
 const o=orderByAnyId(orderId);if(o&&Array.isArray(o.grade)){
   const pid=sid(productId),g=o.grade.filter(x=>!pid||sid(x?.productId)===pid);if(g.length)return clone(g)
 }
 return [];
}
function matrixHtml(grade,title='Grade do produto'){
 const g=(Array.isArray(grade)?grade:[]).filter(x=>q(x?.qty)>0);if(!g.length)return '<div class="empty">Grade não encontrada para esta etapa.</div>';
 const byProduct=new Map();for(const x of g){const pid=sid(x.productId)||'sem-produto';if(!byProduct.has(pid))byProduct.set(pid,[]);byProduct.get(pid).push(x)}
 let html='';for(const [pid,items] of byProduct){
   const sizes=[...new Set(items.map(x=>sid(x.size)).filter(Boolean))],colors=[...new Set(items.map(x=>sid(x.color)||'-'))];
   const name=productName(pid,items[0]?.product||title),total=items.reduce((s,x)=>s+q(x.qty),0);
   html+='<div style="margin:0 0 14px"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:6px"><b>'+esc(name)+'</b><span class="badge">'+total.toLocaleString('pt-BR')+' pç</span></div><div style="overflow:auto;max-width:100%"><table style="min-width:max-content"><thead><tr><th style="position:sticky;left:0;background:var(--card,#fff);z-index:1">Cor</th>'+sizes.map(s=>'<th style="min-width:68px;text-align:center">'+esc(s)+'</th>').join('')+'<th>Total</th></tr></thead><tbody>';
   for(const color of colors){const vals=sizes.map(size=>items.filter(x=>sid(x.color||'-')===color&&sid(x.size)===size).reduce((s,x)=>s+q(x.qty),0)),rt=vals.reduce((a,b)=>a+b,0);html+='<tr><td style="position:sticky;left:0;background:var(--card,#fff);font-weight:600">'+esc(color)+'</td>'+vals.map(v=>'<td style="text-align:center">'+v.toLocaleString('pt-BR')+'</td>').join('')+'<td><b>'+rt.toLocaleString('pt-BR')+'</b></td></tr>'}
   html+='</tbody></table></div></div>';
 }
 return html;
}
function openGrade(module,id,meta){
 let row=null;if(module==='projection'){row={orderId:meta?.orderId,productId:meta?.productId}}else row=arr(module).find(x=>sid(x?.id??x?.__hlgbId)===sid(id));
 const grade=gradeFor(module,row,meta||{}),label=row?.product||row?.productName||productName(meta?.productId??row?.productId,'Produto');
 if(typeof openModal==='function')openModal('Grade — '+esc(label),'<div class="sub" style="margin-bottom:10px">A grade permanece disponível mesmo depois que a etapa é finalizada.</div>'+matrixHtml(grade,label));
 else alert('Grade: '+grade.map(x=>(x.color||'-')+' '+(x.size||'-')+': '+q(x.qty)).join('\n'));
}
window.hlgbOpenStageGradeV9423=openGrade;
function extractId(onclick,fn){const m=sid(onclick).match(new RegExp(fn+'\\([\\\'\\\"]?([^\\\'\\\") ,]+)'));return m?m[1]:''}
function addButton(host,module,id,meta,key){if(!host||!id||[...(host.querySelectorAll?.('[data-hlgb-grade-key]')||[])].some(x=>x.dataset.hlgbGradeKey===key))return;const b=document.createElement('button');b.type='button';b.className='secondary hlgbStageGradeBtn9423';b.dataset.hlgbGradeKey=key;b.textContent='📐 Grade';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openGrade(module,id,meta)});host.appendChild(b)}
function decorateGrades(){
 try{
  document.querySelectorAll('#hlgbCutSplitPanel button[onclick*="hlgbFinishSplitCut"],#hlgbCutSplitPanel button[onclick*="editCut"]').forEach(b=>{const oc=b.getAttribute('onclick')||'',id=extractId(oc,oc.includes('hlgbFinishSplitCut')?'hlgbFinishSplitCut':'editCut');if(id)addButton(b.parentElement,'cuts',id,null,'cut-'+id)});
  document.querySelectorAll('button[onclick*="editProd("]').forEach(b=>{const id=extractId(b.getAttribute('onclick'),'editProd');if(id)addButton(b.parentElement,'production',id,null,'prod-'+id)});
  document.querySelectorAll('#projectionProductsTable .projectionSelect').forEach(cb=>{const tr=cb.closest('tr'),parts=sid(cb.value).split('::'),oid=parts[0],itemKey=parts.slice(1).join('::'),o=orderByAnyId(oid);if(!tr||!o)return;let item=null;try{item=typeof window.projectionItemsForOrder==='function'?window.projectionItemsForOrder(o).find(x=>sid(x.key)===sid(itemKey)):null}catch(e){}const pid=item?.productId||itemKey,cell=tr.lastElementChild;if(cell)addButton(cell,'projection',oid,{orderId:oid,productId:pid},'projection-'+oid+'-'+pid)});
  document.querySelectorAll('.nqSelect9202').forEach(cb=>{const tr=cb.closest('tr'),row=arr('noteQueue').find(x=>sid(x?.id)===sid(cb.value));if(tr&&row)addButton(tr.lastElementChild,'noteQueue',row.id,null,'note-'+sid(row.id))});
  document.querySelectorAll('button[onclick*="viewOrderDetails("]').forEach(b=>{const id=extractId(b.getAttribute('onclick'),'viewOrderDetails');if(id)addButton(b.parentElement,'orders',id,null,'order-'+id)});
 }catch(e){console.warn('[HLGB '+V+'] grade decorate',e)}
}
let decoratePending=false;function scheduleDecorate(){if(decoratePending)return;decoratePending=true;(window.requestAnimationFrame||setTimeout)(()=>{decoratePending=false;decorateGrades()},0)}

function activeQueueRows(){return arr('noteQueue').filter(x=>x&&!['faturado','cancelado','cancelada'].includes(norm(x.status))&&q(x.remainingQty??x.qty)>0)}
function queueMatchesProduction(row,p){
 const pid=sid(row?.productId||row?.itemKey),ppid=sid(p?.productId);if(pid&&ppid&&pid!==ppid)return false;
 const aliases=orderAliases(p?.orderId),refs=[row?.orderId,row?.readyOrderId,row?.sourceOrderId].map(sid).filter(Boolean);if(aliases.size&&refs.length&&!refs.some(x=>aliases.has(x)))return false;
 const qloc=sid(row?.locationId??row?.teamId),ploc=sid(p?.teamId??p?.productionLocationId??p?.locationId);if(qloc&&ploc&&qloc!==ploc)return false;
 return true;
}
function queuedForProduction(p){return activeQueueRows().filter(r=>queueMatchesProduction(r,p)).reduce((s,r)=>s+q(r.remainingQty??r.qty),0)}
function invoicedForProduction(p){
 let total=0;const aliases=orderAliases(p?.orderId),pid=sid(p?.productId),ploc=sid(p?.teamId??p?.productionLocationId??p?.locationId);
 for(const inv of arr('projectionInvoices')){if(inv?.manualNote)continue;for(const it of Array.isArray(inv?.items)?inv.items:[]){
   const ipid=sid(it?.productId||it?.itemKey),refs=[it?.orderId,it?.readyOrderId,it?.sourceOrderId,inv?.orderId,inv?.sourceOrderId].map(sid).filter(Boolean),iloc=sid(it?.locationId??it?.teamId);
   if(pid&&ipid&&pid!==ipid)continue;if(aliases.size&&refs.length&&!refs.some(x=>aliases.has(x)))continue;if(ploc&&iloc&&ploc!==iloc)continue;
   if((pid&&ipid===pid)||(aliases.size&&refs.some(x=>aliases.has(x))))total+=q(it?.qty);
 }}return total;
}
let reconciling=false,lastSignature='';
async function reconcileNoteCommit(reason='auto'){
 if(reconciling||window.__HLGB_AUTH_READY!==true)return false;const production=arr('production');if(!production.length)return false;
 const sig=JSON.stringify([activeQueueRows().map(x=>[sid(x.id),q(x.remainingQty??x.qty),sid(x.status)]),arr('projectionInvoices').map(x=>[sid(x.id),q(x.qty),sid(x.status)])]);if(reason==='auto'&&sig===lastSignature)return false;lastSignature=sig;reconciling=true;let changed=0;
 try{
  for(const p of production){const id=sid(p?.id??p?.__hlgbId),planned=q(p?.qty);if(!id||planned<=0)continue;
   const queued=Math.min(planned,queuedForProduction(p)),billed=Math.min(planned,invoicedForProduction(p)),oldOwned=q(p.noteCommittedQtyV9423),currentDone=q(p.done);
   if(queued<=EPS&&billed<=EPS&&p.noteCommitAppliedV9423!==true)continue;
   const committed=Math.min(planned,Math.max(queued,billed));
   let baseline=p.noteDoneBaselineV9423==null?currentDone:q(p.noteDoneBaselineV9423);
   if(currentDone>Math.max(baseline,oldOwned)+EPS)baseline=currentDone;
   const nextDone=Math.min(planned,Math.max(baseline,committed));
   if(Math.abs(oldOwned-committed)<EPS&&Math.abs(currentDone-nextDone)<EPS&&q(p.noteAvailableQtyV9423)===Math.max(0,planned-committed))continue;
   const next={...p,done:nextDone,noteDoneBaselineV9423:baseline,noteCommittedQtyV9423:committed,noteQueuedQtyV9423:queued,noteBilledQtyV9423:billed,noteAvailableQtyV9423:Math.max(0,planned-committed),noteCommitAppliedV9423:true,noteCommitReasonV9423:reason,noteCommitUpdatedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
   try{if(typeof window.hlgbRecordSaveWithRetry==='function'){const out=await window.hlgbRecordSaveWithRetry('production',id,clone(next),false);if(!out?.applied)throw new Error(out?.reason||'Nuvem não confirmou');upsertLocal('production',out.data||next)}else upsertLocal('production',next);changed++}catch(e){console.warn('[HLGB '+V+'] baixa Nota produção '+id,e)}
  }
  if(changed){try{localSaveOnly?.()}catch(e){};try{window.renderProduction?.()}catch(e){};try{window.renderProjection?.()}catch(e){}}
  return changed>0;
 }finally{reconciling=false}
}
window.hlgbReconcileNoteCommitV9423=reconcileNoteCommit;
function patchSend(){const fn=window.sendProjectionToNotes9202;if(typeof fn!=='function'||fn.__hlgbStageFlow9423)return false;const w=function(){const r=fn.apply(this,arguments),after=()=>{setTimeout(()=>reconcileNoteCommit('enviado_para_nota'),80);setTimeout(()=>reconcileNoteCommit('enviado_para_nota'),500);setTimeout(scheduleDecorate,120)};if(r&&typeof r.then==='function')return r.finally(after);after();return r};Object.assign(w,{__hlgbStageFlow9423:true,__original:fn});window.sendProjectionToNotes9202=w;return true}
function patchIncoming(){const fn=window.hlgbRenderIncomingRecord;if(typeof fn!=='function'||fn.__hlgbStageFlow9423)return false;let timer=null;const w=function(module){const r=fn.apply(this,arguments);if(['noteQueue','projectionInvoices','production','cuts','orders'].includes(module)){clearTimeout(timer);timer=setTimeout(()=>{reconcileNoteCommit('sincronizacao');scheduleDecorate()},120)}return r};w.__hlgbStageFlow9423=true;w.__original=fn;window.hlgbRenderIncomingRecord=w;return true}

let lastUserScrollAt=0;['wheel','touchmove','pointerdown','keydown'].forEach(ev=>window.addEventListener(ev,()=>{lastUserScrollAt=Date.now()},{passive:true,capture:true}));
function activePageKey(){const p=document.querySelector('.page.active');return p?.id||''}
function patchStableRender(name){const fn=window[name];if(typeof fn!=='function'||fn.__hlgbStable9423)return false;const w=function(){const x=window.scrollX||0,y=window.scrollY||0,page=activePageKey(),focus=document.activeElement?.id||'',stamp=Date.now(),r=fn.apply(this,arguments);const restore=()=>{if(activePageKey()!==page||lastUserScrollAt>stamp)return;try{window.scrollTo(x,y)}catch(e){}if(focus){try{document.getElementById(focus)?.focus?.({preventScroll:true})}catch(e){}}scheduleDecorate()};if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>requestAnimationFrame(restore));else setTimeout(restore,0);return r};w.__hlgbStable9423=true;w.__original=fn;window[name]=w;return true}
function install(){
 patchSend();patchIncoming();['renderCuts','renderDailyCuts','renderProduction','renderProjection','renderOrders'].forEach(patchStableRender);scheduleDecorate();reconcileNoteCommit('boot');
 try{document.documentElement.style.scrollbarGutter='stable'}catch(e){}
}
const observer=new MutationObserver(m=>{if(m.some(x=>x.addedNodes?.length))scheduleDecorate()});try{observer.observe(document.body,{childList:true,subtree:true})}catch(e){}
setTimeout(install,900);setTimeout(install,2200);setInterval(()=>{patchSend();patchIncoming();['renderCuts','renderDailyCuts','renderProduction','renderProjection','renderOrders'].forEach(patchStableRender);reconcileNoteCommit('auto');scheduleDecorate()},5000);
window.hlgbStageFlowStatusV9423=()=>({version:V,gradeButtons:document.querySelectorAll('.hlgbStageGradeBtn9423').length,noteRows:activeQueueRows().length,productionRows:arr('production').length,sendPatched:!!window.sendProjectionToNotes9202?.__hlgbStageFlow9423,incomingPatched:!!window.hlgbRenderIncomingRecord?.__hlgbStageFlow9423,stableRenderers:['renderCuts','renderDailyCuts','renderProduction','renderProjection','renderOrders'].filter(n=>window[n]?.__hlgbStable9423)});
window.HLGB_STAGE_FLOW_INTEGRITY_GUARD=V;
console.info('[HLGB] v'+V+' integridade de etapas ativa: grade, baixa da Nota e estabilidade visual');
})();
