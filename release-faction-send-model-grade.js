/* HLGB — envio para facções por modelo + grade padrão da Folha dos Cortadores */
(function(){
'use strict';
const V='2026.10.01-faction-send-model-grade-v1';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0);
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function product(id){return arr('products').find(p=>sid(p?.id)===sid(id))||null}
function order(id){return arr('orders').find(o=>sid(o?.id)===sid(id))||null}
function displayNo(o){try{return typeof displayOrderNumber==='function'?displayOrderNumber(o):(o?.orderNumber||o?.id)}catch(e){return o?.orderNumber||o?.id}}
function modelGrade(o,pid){return (Array.isArray(o?.grade)?o.grade:[]).filter(g=>sid(g?.productId)===sid(pid)&&q(g?.qty)>0)}
function modelPieces(o,pid){return modelGrade(o,pid).reduce((s,g)=>s+q(g.qty),0)}
function modelIds(o){return [...new Set((Array.isArray(o?.grade)?o.grade:[]).map(g=>sid(g?.productId)).filter(Boolean))]}
function sizes(){
  try{if(typeof hlgbSortedSizes==='function')return hlgbSortedSizes(db.sizes)}catch(e){}
  return ['P','M','G','GG'];
}
function gradeHTML(o,pid){
  try{
    if(window.hlgbMaterialTools?.cutterSheetGradeForModel)return window.hlgbMaterialTools.cutterSheetGradeForModel(o,pid);
  }catch(e){}
  const grade=modelGrade(o,pid);if(!grade.length)return '<div class="empty">Este modelo não possui grade cadastrada.</div>';
  const sz=sizes(),p=product(pid),groups={};
  for(const it of grade){const color=it.color||'-';if(!groups[color])groups[color]={color,qty:{}};groups[color].qty[it.size]=(groups[color].qty[it.size]||0)+q(it.qty)}
  const body=Object.values(groups).map(g=>'<tr><td>'+escSafe(p?.name||'-')+'</td><td>'+escSafe(g.color)+'</td>'+sz.map(s=>'<td>'+q(g.qty[s])+'</td>').join('')+'<td><b>'+sz.reduce((a,s)=>a+q(g.qty[s]),0)+'</b></td></tr>').join('');
  return '<div style="overflow:auto"><table><tr><th>Produto</th><th>Cor</th>'+sz.map(s=>'<th>'+escSafe(s)+'</th>').join('')+'<th>Total</th></tr>'+body+'<tr><td colspan="'+(sz.length+2)+'" style="text-align:right"><b>Total do modelo</b></td><td><b>'+modelPieces(o,pid)+'</b></td></tr></table></div>';
}
function releaseEvidence(o,pid){
  const prods=arr('production').filter(p=>sid(p?.orderId)===sid(o.id)&&sid(p?.productId)===sid(pid));
  const cuts=arr('cuts').filter(c=>sid(c?.orderId)===sid(o.id));
  const exactCuts=cuts.filter(c=>sid(c?.productId)===sid(pid));
  const aggregate=cuts.filter(c=>!c?.productId);
  const exactDone=exactCuts.some(c=>/final|pronto|conclu/i.test(String(c.status||'')));
  const aggregateDone=aggregate.some(c=>/final|pronto|conclu/i.test(String(c.status||'')));
  return {prods,exactCuts,aggregate,released:prods.length>0||exactDone||aggregateDone};
}
function modelCandidates(){
  const out=[];
  for(const o of arr('orders')){
    if(!o||o.deletedAt||o.cancelledAt||['entregue','cancelado','cancelada'].includes(norm(o.status||'')))continue;
    for(const pid of modelIds(o)){
      const pieces=modelPieces(o,pid);if(pieces<=0)continue;
      const ev=releaseEvidence(o,pid);if(!ev.released)continue;
      const sent=arr('factions').filter(f=>sid(f?.orderId)===sid(o.id)&&sid(f?.productId)===sid(pid)).reduce((s,f)=>s+q(f.sent),0);
      const remaining=Math.max(0,pieces-sent);if(remaining<=0)continue;
      const p=product(pid),prod=ev.prods[0],cut=ev.exactCuts[0]||ev.aggregate[0];
      out.push({
        key:'m:'+sid(o.id)+':'+sid(pid),orderId:o.id,productId:Number.isFinite(+pid)?+pid:pid,productionId:prod?.id||null,
        op:prod?.op||cut?.op||('PED-'+sid(o.id)),model:p?.name||'Produto',remaining,dueDate:o.date||prod?.factionDueDate||'',
        stage:prod?.stage||((ev.exactCuts.length||ev.aggregate.length)?'Corte finalizado':'Liberado'),client:o.client||'-',grade:modelGrade(o,pid)
      });
    }
  }
  return out.sort((a,b)=>String(a.dueDate||'9999-12-31').localeCompare(String(b.dueDate||'9999-12-31'))||String(a.model).localeCompare(String(b.model),'pt-BR'));
}
function renderAvailable(){
  const el=document.getElementById('factionAvailableModels');if(!el)return;
  const rows=modelCandidates();
  el.innerHTML=rows.length?table(['Pedido','Cliente','Modelo','Etapa','Disponível','Previsão','Ação'],rows.map(r=>[
    '#'+escSafe(displayNo(order(r.orderId))),escSafe(r.client),'<b>'+escSafe(r.model)+'</b>',escSafe(r.stage),r.remaining.toLocaleString('pt-BR'),r.dueDate?fmtDate(r.dueDate):'-',
    '<button type="button" class="primary" onclick=\'hlgbOpenFactionModelSend('+JSON.stringify(r.key)+')\'>Enviar para facção</button>'
  ])):'<div class="empty">Nenhum modelo liberado para envio no momento.</div>';
}
function form(f={}){
  const o=order(f.orderId),p=product(f.productId),model=p?.name||f.description||'';
  const candidates=modelCandidates();
  return '<div class="grid">'+
   '<input id="mfproductionid" type="hidden" value="'+escSafe(f.productionId??'')+'">'+
   '<input id="mforderid" type="hidden" value="'+escSafe(f.orderId??'')+'">'+
   '<input id="mfproductid" type="hidden" value="'+escSafe(f.productId??'')+'">'+
   '<div class="field"><label>Facção</label><select id="mname">'+arr('factionMasters').map(x=>'<option value="'+escSafe(x.name)+'" '+(String(x.name)===String(f.name||'')?'selected':'')+'>'+escSafe(x.name)+'</option>').join('')+'</select></div>'+
   '<div class="field"><label>OP</label><input id="mop" value="'+escSafe(f.op||'')+'"></div>'+
   '<div class="field"><label>Modelo</label><input id="mfdesc" value="'+escSafe(model)+'" readonly></div>'+
   '<div class="field"><label>Local de produção</label><select id="mfactionlocation"><option value="">Selecione</option>'+arr('productionLocations').filter(x=>x.active!==false).map(x=>'<option value="'+x.id+'" '+(+x.id===+f.productionLocationId?'selected':'')+'>'+escSafe(x.name)+'</option>').join('')+'</select></div>'+
   '<div class="field"><label>Quantidade enviada</label><input id="msent" type="number" min="0" max="'+q(f.sent||f.remaining||0)+'" value="'+q(f.sent??f.remaining??0)+'"></div>'+
   '<div class="field"><label>Produzido / quantidade a pagar</label><input id="mdone" type="number" value="'+q(f.done??0)+'"></div>'+
   '<div class="field"><label>Retorno</label><input id="mret" type="number" value="'+q(f.returned??0)+'"></div>'+
   '<div class="field"><label>Defeitos</label><input id="mdef" type="number" value="'+q(f.defects??0)+'"></div>'+
   '<div class="field"><label>Perdas / desperdício</label><input id="mwaste" type="number" value="'+q(f.waste??0)+'"></div>'+
   '<div class="field"><label>Valor por peça</label><input id="mprice" type="number" step=".01" value="'+q(f.price??p?.factionCost??0)+'"></div>'+
   '<div class="field"><label>Status do serviço</label><select id="mfstatus">'+['Enviado','Em produção','Finalizado'].map(x=>'<option '+(x===(f.status||'Enviado')?'selected':'')+'>'+x+'</option>').join('')+'</select></div>'+
   '<div class="field"><label>Data de envio</label><input id="mfsentat" type="date" value="'+escSafe(f.sentAt||f.date||(typeof isoDate==='function'?isoDate(new Date()):new Date().toISOString().slice(0,10)))+'"></div>'+
   '<div class="field"><label>Previsão de entrega</label><input id="mfdue" type="date" value="'+escSafe(f.dueDate||'')+'"></div>'+
   '<div class="field"><label>Data de finalização</label><input id="mffinished" type="date" value="'+escSafe(f.finishedAt||'')+'"></div>'+
   '</div>'+
   (o&&f.productId?'<div class="panel" style="margin-top:12px;background:#fff8fb"><h3 style="margin-top:0">📋 Grade enviada para a facção</h3><div class="sub">Mesmo formato da Folha dos Cortadores — somente este modelo.</div>'+gradeHTML(o,f.productId)+'</div>':'');
}
function openModel(key){
  const r=modelCandidates().find(x=>String(x.key)===String(key));if(!r){alert('Este modelo já não está disponível para envio.');renderAvailable();return}
  if(typeof newFaction!=='function')return alert('A tela oficial de envio para facção não está disponível.');
  newFaction({productionId:r.productionId,orderId:r.orderId,productId:r.productId,op:r.op,description:r.model,sent:r.remaining,remaining:r.remaining,dueDate:r.dueDate});
}
const oldSave=window.saveFactionServiceFromForm;
function saveFromForm(f){
  if(typeof oldSave==='function')oldSave(f);
  const pid=document.getElementById('mfproductid')?.value||f.productId,o=order(document.getElementById('mforderid')?.value||f.orderId),p=product(pid);
  if(pid)f.productId=Number.isFinite(+pid)?+pid:pid;
  if(o)f.orderId=o.id;
  if(p)f.description=p.name;
  if(o&&pid){
    const max=modelPieces(o,pid),otherSent=arr('factions').filter(x=>x!==f&&sid(x?.orderId)===sid(o.id)&&sid(x?.productId)===sid(pid)).reduce((s,x)=>s+q(x.sent),0);
    const allowed=Math.max(0,max-otherSent);
    if(q(f.sent)>allowed)throw new Error('A quantidade enviada deste modelo não pode passar de '+allowed.toLocaleString('pt-BR')+' peças.');
  }
}
window.hlgbOpenFactionModelSend=openModel;
window.hlgbFactionSendModelGrade={modelCandidates,gradeHTML,modelGrade,modelPieces,releaseEvidence,renderAvailable,form,saveFromForm};
window.factionAvailableModels=modelCandidates;
window.renderFactionAvailableModels=renderAvailable;
window.openFactionAvailableModel=openModel;
window.factionForm=form;
window.saveFactionServiceFromForm=saveFromForm;
const oldRender=window.renderFactions;
if(typeof oldRender==='function'&&!oldRender.__hlgbModelSendV1){
  const w=function(){const r=oldRender.apply(this,arguments);setTimeout(renderAvailable,0);return r};w.__hlgbModelSendV1=true;w.__original=oldRender;window.renderFactions=w;
}
function boot(){try{renderAvailable()}catch(e){console.warn('[HLGB facção por modelo]',e)}}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,900),0)}catch(e){}
setTimeout(boot,1600);
window.HLGB_FACTION_SEND_MODEL_GRADE_GUARD=V;
console.info('[HLGB] envio para facções por modelo + grade padrão ativo');
})();