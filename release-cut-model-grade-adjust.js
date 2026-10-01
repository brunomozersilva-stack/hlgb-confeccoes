/* HLGB — ajuste da grade do corte separado */
(function(){
'use strict';
const V='2026.10.01-cut-model-grade-adjust-v1',sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0);
function cuts(){return Array.isArray(db?.cuts)?db.cuts:[]}
function products(){return Array.isArray(db?.products)?db.products:[]}
async function openAdjust(id){
 const c=cuts().find(x=>sid(x?.id)===sid(id));if(!c||!c.modelSplitChildV1)return;
 if(String(c.status||'').toLowerCase()==='finalizado')return alert('Este modelo já foi finalizado.');
 const grade=(Array.isArray(c.originalGrade)?c.originalGrade:[]).map(x=>({...x}));
 if(!grade.length)return alert('Este modelo não possui grade.');
 const rows=grade.map((g,i)=>'<tr><td>'+(products().find(p=>sid(p.id)===sid(g.productId))?.name||c.product||'Produto')+'</td><td>'+(g.color||'-')+'</td><td>'+(g.size||'-')+'</td><td><input id="hlgbAdj_'+i+'" type="number" min="0" value="'+q(g.qty)+'"></td></tr>').join('');
 openModal('Ajustar grade do corte','<div class="sub">Altera apenas este modelo; o pedido original continua igual.</div><table><tr><th>Produto</th><th>Cor</th><th>Tamanho</th><th>Quantidade</th></tr>'+rows+'</table><div class="field"><label>Observação</label><textarea id="hlgbAdjNote">'+(c.cutGradeAdjustmentNote||'')+'</textarea></div><button type="button" class="primary modalSave">Salvar grade</button>',async()=>{
  const g2=grade.map((g,i)=>({...g,qty:q(document.getElementById('hlgbAdj_'+i)?.value)})).filter(x=>q(x.qty)>0);
  if(!g2.length){alert('A grade não pode ficar zerada.');return false}
  const next={...c,originalGrade:g2,actualCutGrade:g2.map(x=>({...x})),pieces:g2.reduce((a,x)=>a+q(x.qty),0),cutGradeAdjustmentNote:document.getElementById('hlgbAdjNote')?.value||'',cutGradeAdjustedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  if(!Array.isArray(next.plannedGradeBeforeAdjustmentV9243)||!next.plannedGradeBeforeAdjustmentV9243.length)next.plannedGradeBeforeAdjustmentV9243=grade.map(x=>({...x}));
  try{
   const out=await hlgbRecordSaveWithRetry('cuts',sid(next.id),next,false);if(!out?.applied)throw new Error('Nuvem não confirmou.');
   const i=cuts().findIndex(x=>sid(x.id)===sid(next.id));if(i>=0)db.cuts[i]=out.data||next;
   try{localSaveOnly?.()}catch(e){} closeModal();renderCuts?.();return true;
  }catch(e){alert('Não foi possível salvar a grade.');return false}
 });
}
function decorate(){
 const panel=document.getElementById('hlgbCutSplitPanel');if(!panel)return;
 panel.querySelectorAll('button[onclick*="hlgbFinishSplitCut"]').forEach(b=>{
  const m=(b.getAttribute('onclick')||'').match(/hlgbFinishSplitCut\(['"]?([^'")]+)['"]?\)/);if(!m)return;
  const host=b.parentElement;if(!host||host.querySelector('.hlgbAdjustSplitGradeBtn'))return;
  const n=document.createElement('button');n.type='button';n.className='secondary hlgbAdjustSplitGradeBtn';n.textContent='Ajustar grade';n.onclick=()=>openAdjust(m[1]);host.insertBefore(n,b);
 });
}
window.hlgbOpenSplitGradeAdjust=openAdjust;
const old=window.renderCuts;if(typeof old==='function'&&!old.__hlgbAdjustV1){const w=function(){const r=old.apply(this,arguments);setTimeout(decorate,0);return r};w.__hlgbAdjustV1=true;window.renderCuts=w}
setTimeout(decorate,1200);
window.HLGB_CUT_MODEL_GRADE_ADJUST_GUARD=V;
})();