/* HLGB v94.23 — ajuste horizontal da grade do corte separado */
(function(){
'use strict';
const V='94.23-cut-model-grade-adjust',sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0);
const escSafe=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
function cuts(){return Array.isArray(db?.cuts)?db.cuts:[]}
function products(){return Array.isArray(db?.products)?db.products:[]}
function productName(id,fallback){return products().find(p=>sid(p?.id)===sid(id))?.name||fallback||'Produto'}
function buildHorizontalEditor(grade,c){
 const groups=new Map();for(const g of grade){const pid=sid(g?.productId)||sid(c?.productId)||'produto';if(!groups.has(pid))groups.set(pid,[]);groups.get(pid).push(g)}
 const cells=[];let html='';let seq=0;
 for(const [pid,items] of groups){
  const sizes=[...new Set(items.map(x=>sid(x.size)).filter(Boolean))],colors=[...new Set(items.map(x=>sid(x.color)||'-'))];
  html+='<div style="margin:12px 0 16px"><div style="font-weight:700;margin-bottom:6px">'+escSafe(productName(pid,c?.product))+'</div><div style="overflow-x:auto;max-width:100%"><table style="min-width:max-content"><thead><tr><th style="position:sticky;left:0;background:var(--card,#fff);z-index:2">Cor</th>'+sizes.map(s=>'<th style="min-width:82px;text-align:center">'+escSafe(s)+'</th>').join('')+'<th>Total</th></tr></thead><tbody>';
  for(const color of colors){let rowTotal=0;html+='<tr><td style="position:sticky;left:0;background:var(--card,#fff);font-weight:600">'+escSafe(color)+'</td>';
   for(const size of sizes){const matches=items.filter(x=>sid(x.color||'-')===color&&sid(x.size)===size),qty=matches.reduce((s,x)=>s+q(x.qty),0),base={...(matches[0]||items[0]||{}),productId:(matches[0]||items[0]||{}).productId??c?.productId,color:color==='-'?'':color,size};const id='hlgbAdjCell_'+seq++;cells.push({id,base});rowTotal+=qty;html+='<td style="text-align:center"><input id="'+id+'" type="number" min="0" step="1" inputmode="numeric" value="'+qty+'" style="width:72px;text-align:center"></td>'}
   html+='<td><b>'+rowTotal.toLocaleString('pt-BR')+'</b></td></tr>';
  }
  html+='</tbody></table></div></div>';
 }
 return {html,cells};
}
async function openAdjust(id){
 const c=cuts().find(x=>sid(x?.id)===sid(id));if(!c||!c.modelSplitChildV1)return;
 if(String(c.status||'').toLowerCase()==='finalizado')return alert('Este modelo já foi finalizado. A grade continua disponível em “📐 Grade”, mas não pode mais ser alterada.');
 const grade=(Array.isArray(c.originalGrade)?c.originalGrade:[]).map(x=>({...x}));if(!grade.length)return alert('Este modelo não possui grade.');
 const editor=buildHorizontalEditor(grade,c);
 openModal('Ajustar grade do corte','<div class="sub">Grade em formato horizontal: cores nas linhas e tamanhos nas colunas. Altera apenas este modelo; o pedido original continua igual.</div>'+editor.html+'<div class="field"><label>Observação</label><textarea id="hlgbAdjNote">'+escSafe(c.cutGradeAdjustmentNote||'')+'</textarea></div><button type="button" class="primary modalSave">Salvar grade</button>',async()=>{
  const g2=editor.cells.map(cell=>({...cell.base,qty:q(document.getElementById(cell.id)?.value)})).filter(x=>q(x.qty)>0);if(!g2.length){alert('A grade não pode ficar zerada.');return false}
  const next={...c,originalGrade:g2,actualCutGrade:g2.map(x=>({...x})),pieces:g2.reduce((a,x)=>a+q(x.qty),0),cutGradeAdjustmentNote:document.getElementById('hlgbAdjNote')?.value||'',cutGradeAdjustedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  if(!Array.isArray(next.plannedGradeBeforeAdjustmentV9243)||!next.plannedGradeBeforeAdjustmentV9243.length)next.plannedGradeBeforeAdjustmentV9243=grade.map(x=>({...x}));
  try{const out=await hlgbRecordSaveWithRetry('cuts',sid(next.id),next,false);if(!out?.applied)throw new Error('Nuvem não confirmou.');const i=cuts().findIndex(x=>sid(x.id)===sid(next.id));if(i>=0)db.cuts[i]=out.data||next;try{localSaveOnly?.()}catch(e){}closeModal();renderCuts?.();return true}catch(e){console.warn('[HLGB '+V+'] salvar grade',e);alert('Não foi possível salvar a grade.');return false}
 });
}
function decorate(){const panel=document.getElementById('hlgbCutSplitPanel');if(!panel)return;panel.querySelectorAll('button[onclick*="hlgbFinishSplitCut"]').forEach(b=>{const m=(b.getAttribute('onclick')||'').match(/hlgbFinishSplitCut\(['"]?([^'")]+)['"]?\)/);if(!m)return;const host=b.parentElement;if(!host||host.querySelector('.hlgbAdjustSplitGradeBtn'))return;const n=document.createElement('button');n.type='button';n.className='secondary hlgbAdjustSplitGradeBtn';n.textContent='Ajustar grade';n.onclick=()=>openAdjust(m[1]);host.insertBefore(n,b)})}
window.hlgbOpenSplitGradeAdjust=openAdjust;
const old=window.renderCuts;if(typeof old==='function'&&!old.__hlgbAdjust9423){const w=function(){const r=old.apply(this,arguments);setTimeout(decorate,0);return r};w.__hlgbAdjustV1=true;w.__hlgbAdjust9423=true;window.renderCuts=w}
setTimeout(decorate,1200);
try{if(!window.HLGB_STAGE_FLOW_INTEGRITY_GUARD&&!document.querySelector('script[data-hlgb-stage-flow-v9423]')){const s=document.createElement('script');s.dataset.hlgbStageFlowV9423='1';s.src='./release-stage-flow-integrity-v9423.js?fresh='+Date.now();document.head.appendChild(s)}}catch(e){console.warn('[HLGB '+V+'] carregar integridade de etapas',e)}
try{if(!window.HLGB_AUDITOR_SINGLE_ACTION_9429&&!document.querySelector('script[data-hlgb-auditor-single-v9429]')){const s=document.createElement('script');s.dataset.hlgbAuditorSingleV9429='1';s.src='./release-auditor-single-action-v9429.js?fresh='+Date.now();document.head.appendChild(s)}}catch(e){console.warn('[HLGB '+V+'] carregar Auditor v94.29',e)}
try{if(!window.HLGB_GOALS_STABILITY_9430&&!document.querySelector('script[data-hlgb-goals-stability-v9430]')){const s=document.createElement('script');s.dataset.hlgbGoalsStabilityV9430='1';s.src='./release-goals-stability-v9430.js?fresh='+Date.now();document.head.appendChild(s)}}catch(e){console.warn('[HLGB '+V+'] carregar estabilidade Metas v94.30',e)}
try{if(!window.HLGB_AUDITOR_INTEGRITY_9430&&!document.querySelector('script[data-hlgb-auditor-integrity-v9430]')){const s=document.createElement('script');s.dataset.hlgbAuditorIntegrityV9430='1';s.src='./release-auditor-integrity-v9430.js?fresh='+Date.now();document.head.appendChild(s)}}catch(e){console.warn('[HLGB '+V+'] carregar integridade Auditor v94.30',e)}
try{if(!window.HLGB_PRINTER3D_PERSISTENCE_9431&&!document.querySelector('script[data-hlgb-printer3d-persistence-v9431]')){const s=document.createElement('script');s.dataset.hlgbPrinter3dPersistenceV9431='1';s.src='./release-printer3d-persistence-v9431.js?fresh='+Date.now();document.head.appendChild(s)}}catch(e){console.warn('[HLGB '+V+'] carregar persistência Impressora 3D v94.31',e)}
window.HLGB_CUT_MODEL_GRADE_ADJUST_GUARD=V;
})();