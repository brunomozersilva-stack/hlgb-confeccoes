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
const stable9723=v=>Array.isArray(v)?v.map(stable9723):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable9723(v[k])])):v;
const equal9723=(a,b)=>JSON.stringify(stable9723(a))===JSON.stringify(stable9723(b));
function editable9723(c){return !!c?.modelSplitChildV1&&!/finalizado|cancel|desmembrado/i.test(sid(c.status))&&!c.modelSplitParentV1&&!c.hiddenByModelSplitV1&&!(typeof window.hlgbCutModelSplit?.competingModelCuts==='function'&&window.hlgbCutModelSplit.competingModelCuts(c).length>1)}
async function readGradeCut9723(id){
 if(window.__HLGB_AUTH_READY!==true||typeof window.cloudRequest!=='function')throw Error('Sessão ou consulta remota indisponível.');
 const rows=await window.cloudRequest('hlgb_records?select=module,entity_id,data,revision,deleted_at&module=eq.cuts&entity_id=eq.'+encodeURIComponent(id)+'&limit=1',{method:'GET'});
 const row=Array.isArray(rows)&&rows.length===1?rows[0]:null;
 if(window.__HLGB_AUTH_READY!==true||row?.module!=='cuts'||sid(row?.entity_id)!==id||sid(row?.data?.id)!==id||row.deleted_at!==null||!Number.isSafeInteger(Number(row.revision))||Number(row.revision)<1)throw Error('Identidade ou revisão do corte não confirmada.');
 return row;
}
async function confirmGradeQueue9724(id){
 const guard=window.hlgbWalIdbGuard9536;
 if(typeof guard?.probe!=='function'||typeof guard?.ids!=='function'||typeof window.hlgbRecordPendingIdentitySet9535!=='function')throw Error('Proteção de sincronização indisponível.');
 await guard.probe({timeoutMs:32000});
 const status=guard.status?.(),durable=guard.ids(),normal=window.hlgbRecordPendingIdentitySet9535();
 if(!status||status.readFailed!==false||status.unsupported===true||status.localReadFailed===true||!(status.probes>0)||!durable||typeof durable.has!=='function'||status.entryCount!==durable.size||!normal||typeof normal.has!=='function')throw Error('Fila de sincronização não comprovada.');
 const pending=new Set([...durable,...normal].map(sid));
 // Read the persisted queues as well: a legacy reader can swallow malformed JSON.
 for(const [key,field] of [['hlgb_durable_wal_v1','entries'],['hlgb_records_pending_v91','modules']]){
  const raw=localStorage.getItem(key);if(raw===null)continue;
  const rows=JSON.parse(raw)?.[field];
  if(!rows||typeof rows!=='object'||Array.isArray(rows))throw Error('Fila local ilegível.');
  if(field==='entries'){for(const [k,x] of Object.entries(rows)){if(!x||typeof x!=='object')throw Error('Operação local inválida.');pending.add(k);if(x.module&&x.id!=null)pending.add(sid(x.module)+'::'+sid(x.id));}}
  else{for(const [m,list] of Object.entries(rows)){if(!Array.isArray(list))throw Error('Fila local inválida.');for(const x of list){if(x?.id==null)throw Error('Pendência sem identidade.');pending.add(m+'::'+sid(x.id));}}}
 }
 if(pending.has('cuts::'+id)||pending.has('cuts|'+id))throw Error('Existe alteração pendente neste corte. Confira a sincronização antes de salvar.');
}
async function openAdjust(id){
 const found=cuts().filter(x=>sid(x?.id)===sid(id)),c=found.length===1?JSON.parse(JSON.stringify(found[0])):null;
 if(!c||!c.modelSplitChildV1)return;
 if(String(c.status||'').toLowerCase()==='finalizado')return alert('Este modelo já foi finalizado. A grade continua disponível em “📐 Grade”, mas não pode mais ser alterada.');
 if(!editable9723(c))return alert('Corte duplicado ou indisponível para ajuste.');
 let saving=false,attempt=null;
 const grade=(Array.isArray(c.originalGrade)?c.originalGrade:[]).map(x=>({...x}));if(!grade.length)return alert('Este modelo não possui grade.');
 const editor=buildHorizontalEditor(grade,c);
 openModal('Ajustar grade do corte','<div class="sub">Grade em formato horizontal: cores nas linhas e tamanhos nas colunas. Altera apenas este modelo; o pedido original continua igual.</div>'+editor.html+'<div class="field"><label>Observação</label><textarea id="hlgbAdjNote">'+escSafe(c.cutGradeAdjustmentNote||'')+'</textarea></div><button type="button" class="primary modalSave">Salvar grade</button>',async()=>{
  if(saving)return false;
  const btn=document.querySelector('#modal .modalSave'),active=()=>!!btn&&btn.isConnected&&document.querySelector('#modal.show .modalSave')===btn;
  const draft=()=>{
   const g2=editor.cells.map(cell=>{const field=document.getElementById(cell.id),v=Number(field?.value);if(!field||String(field.value).trim()===''||!Number.isSafeInteger(v)||v<0)throw Error('Informe quantidades inteiras e não negativas.');return {...cell.base,qty:v}}).filter(x=>x.qty>0);
   if(!g2.length)throw Error('A grade não pode ficar zerada.');
   const pieces=g2.reduce((a,x)=>a+x.qty,0);if(!Number.isSafeInteger(pieces))throw Error('Total inválido.');
   return {g2,pieces,note:document.getElementById('hlgbAdjNote')?.value||''};
  };
  saving=true;if(btn)btn.disabled=true;
  try{
   const input=draft(),id=sid(c.id),current=cuts().filter(x=>sid(x?.id)===id);
   if(current.length!==1||!editable9723(current[0])||(!equal9723(current[0],c)&&!(attempt&&equal9723(current[0],attempt.next))))throw Error('O corte mudou. Confira antes de ajustar.');
   if(attempt){
    if(!equal9723(input,attempt.input))throw Error('Existe uma tentativa anterior; restaure os campos enviados antes de conferir.');
   }else{
    if(typeof hlgbRecordCanWrite==='function'&&!hlgbRecordCanWrite('cuts'))throw Error('Sem permissão para gravar cortes.');
    await confirmGradeQueue9724(id);
    const before=await readGradeCut9723(id);
    const snap=typeof hlgbRecordSnapshots!=='undefined'?hlgbRecordSnapshots.cuts?.get(id):null;
    if(!snap||snap.deleted_at||Number(snap.revision)!==Number(before.revision)||!equal9723(snap.data,before.data))throw Error('A versão carregada não corresponde à nuvem. Atualize antes de salvar.');
    if(!equal9723(before.data,c)||!active()||!equal9723(input,draft())||!equal9723(cuts().find(x=>sid(x.id)===id),c)||!editable9723(cuts().find(x=>sid(x.id)===id)))throw Error('O corte ou formulário mudou durante a conferência.');
    const next={...c,originalGrade:input.g2,actualCutGrade:input.g2.map(x=>({...x})),pieces:input.pieces,cutGradeAdjustmentNote:input.note,cutGradeAdjustedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(!Array.isArray(next.plannedGradeBeforeAdjustmentV9243)||!next.plannedGradeBeforeAdjustmentV9243.length)next.plannedGradeBeforeAdjustmentV9243=grade.map(x=>({...x}));
    attempt={input,next,revision:Number(before.revision)};
    try{await hlgbRecordSaveWithRetry('cuts',id,next,false)}catch(e){console.warn('[HLGB grade] tentativa sem resposta',e)}
   }
   const proof=await readGradeCut9723(id);
   if(Number(proof.revision)<=attempt.revision||!equal9723(proof.data,attempt.next))throw Error('A nuvem ainda não confirmou o ajuste. Confira novamente sem reenviar.');
   const i=cuts().findIndex(x=>sid(x.id)===id);
   if(i<0||(!equal9723(cuts()[i],c)&&!equal9723(cuts()[i],proof.data)))throw Error('Outra atualização local foi recebida. Confira o corte.');
   if(!active()||!equal9723(draft(),attempt.input))throw Error('A edição mudou; confira o ajuste confirmado antes de fechar.');
   db.cuts[i]=proof.data;try{localSaveOnly?.()}catch(e){}closeModal();renderCuts?.();return true;
  }catch(e){console.warn('[HLGB '+V+'] salvar grade',e);alert('Não foi possível confirmar a grade. '+sid(e?.message||e));return false}
  finally{saving=false;if(btn?.isConnected){btn.disabled=false;btn.textContent=attempt?'Conferir ajuste na nuvem':'Salvar grade'}}

 });
}
function decorate(){
 const panel=document.getElementById('hlgbCutSplitPanel');if(!panel)return;
 panel.querySelectorAll('button[onclick*="hlgbFinishSplitCut"]').forEach(b=>{
  const m=(b.getAttribute('onclick')||'').match(/hlgbFinishSplitCut\(['"]?([^'"\)]+)['"]?\)/);if(!m)return;
  const host=b.parentElement,card=b.closest?.('[data-hlgb-cut-model-id]')||host;if(!host||!card)return;
  const canonical=card.querySelector('[data-hlgb-grade-group9711] .hlgbAdjustSplitGradeBtn');
  if(canonical){
   // Only remove fallback controls created by this module, not unrelated grade/print actions.
   card.querySelectorAll('[data-hlgb-grade-fallback9711]').forEach(n=>{if(n.dataset.hlgbGradeFallback9711===m[1])n.remove()});
   return;
  }
  if(card.querySelector('.hlgbAdjustSplitGradeBtn'))return;
  // Do not make an ambiguous model editable merely because its old action is absent.
  const cut=cuts().filter(x=>sid(x?.id)===sid(m[1]));
  if(cut.length!==1||!cut[0].modelSplitChildV1||String(cut[0].status||'').toLowerCase()==='finalizado')return;
  const n=document.createElement('button');n.type='button';n.className='secondary hlgbAdjustSplitGradeBtn';n.textContent='Ajustar grade';n.dataset.hlgbGradeFallback9711=m[1];
  const competitors=window.hlgbCutModelSplit?.competingModelCuts;
  if(typeof competitors==='function'&&competitors(cut[0]).length>1){n.disabled=true;n.title='Corte duplicado: conferência necessária'}
  n.onclick=()=>openAdjust(m[1]);host.insertBefore(n,b);
 });
}

window.hlgbOpenSplitGradeAdjust=openAdjust;
const old=window.renderCuts;if(typeof old==='function'&&!old.__hlgbAdjust9423){const w=function(){const r=old.apply(this,arguments);setTimeout(decorate,0);return r};w.__hlgbAdjustV1=true;w.__hlgbAdjust9423=true;window.renderCuts=w}
setTimeout(decorate,1200);
try{if(!window.HLGB_STAGE_FLOW_INTEGRITY_GUARD&&!document.querySelector('script[data-hlgb-stage-flow-v9423]')){const s=document.createElement('script');s.dataset.hlgbStageFlowV9423='1';s.src='./release-stage-flow-integrity-v9423.js?fresh='+Date.now();document.head.appendChild(s)}}catch(e){console.warn('[HLGB '+V+'] carregar integridade de etapas',e)}
try{if(!window.HLGB_AUDITOR_SINGLE_ACTION_9429&&!document.querySelector('script[data-hlgb-auditor-single-v9429]')){const s=document.createElement('script');s.dataset.hlgbAuditorSingleV9429='1';s.src='./release-auditor-single-action-v9429.js?fresh='+Date.now();document.head.appendChild(s)}}catch(e){console.warn('[HLGB '+V+'] carregar Auditor v94.29',e)}
try{if(!window.HLGB_GOALS_STABILITY_9430&&!document.querySelector('script[data-hlgb-goals-stability-v9430]')){const s=document.createElement('script');s.dataset.hlgbGoalsStabilityV9430='1';s.src='./release-goals-stability-v9430.js?fresh='+Date.now();document.head.appendChild(s)}}catch(e){console.warn('[HLGB '+V+'] carregar estabilidade Metas v94.30',e)}
try{if(!window.HLGB_AUDITOR_INTEGRITY_9430&&!document.querySelector('script[data-hlgb-auditor-integrity-v9430]')){const s=document.createElement('script');s.dataset.hlgbAuditorIntegrityV9430='1';s.src='./release-auditor-integrity-v9430.js?fresh='+Date.now();document.head.appendChild(s)}}catch(e){console.warn('[HLGB '+V+'] carregar integridade Auditor v94.30',e)}
// The canonical parser loads persistence later in its own ordered list.
// Do not race it from the grade module. The legacy standalone route still
// receives at most one fallback after parsing, if the persistence guard is absent.
function ensurePrinterPersistence9694(){
 try{
  if(window.HLGB_PRINTER3D_PERSISTENCE_9431||window.__HLGB_PRINTER3D_FALLBACK_9694)return;
  if(document.querySelector('script[data-hlgb-printer3d-persistence-v9431]'))return;
  window.__HLGB_PRINTER3D_FALLBACK_9694='loading';
  const s=document.createElement('script');s.dataset.hlgbPrinter3dPersistenceV9431='1';
  s.src='./release-printer3d-persistence-v9431.js?fresh='+Date.now();
  s.onload=()=>{window.__HLGB_PRINTER3D_FALLBACK_9694=window.HLGB_PRINTER3D_PERSISTENCE_9431?'ready':'unavailable'};
  s.onerror=()=>{window.__HLGB_PRINTER3D_FALLBACK_9694='failed';console.warn('[HLGB] persistência 3D indisponível após fallback')};
  document.head.appendChild(s);
 }catch(e){window.__HLGB_PRINTER3D_FALLBACK_9694='failed';console.warn('[HLGB '+V+'] carregar persistência Impressora 3D v94.31',e)}
}
if(!window.__HLGB_PRINTER3D_FALLBACK_SCHEDULED_9694){
 window.__HLGB_PRINTER3D_FALLBACK_SCHEDULED_9694=true;
 if(document.readyState==='loading'&&typeof document.addEventListener==='function')document.addEventListener('DOMContentLoaded',ensurePrinterPersistence9694,{once:true});
 else ensurePrinterPersistence9694();
}
try{if(!window.HLGB_ASSISTANT_IMAGE_SAFETY_9432&&!document.querySelector('script[data-hlgb-assistant-image-safety-v9432]')){const s=document.createElement('script');s.dataset.hlgbAssistantImageSafetyV9432='1';s.src='./release-assistant-image-safety-v9432.js?fresh='+Date.now();document.head.appendChild(s)}}catch(e){console.warn('[HLGB '+V+'] carregar segurança de imagem do Assistente v94.32',e)}
window.HLGB_CUT_MODEL_GRADE_ADJUST_GUARD=V;
})();