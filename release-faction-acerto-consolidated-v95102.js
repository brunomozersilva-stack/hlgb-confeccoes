/* HLGB v95.102 — Acertos pendentes consolidados por pessoa, leitura segura.
 * Jamais regrava pagamento, baixa, nota, financeiro, WAL ou cadastro.
 * Um agrupamento visual NÃO equivale a uma liquidação bancária.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.hlgbFactionAcertoUnified95102=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const VERSION='95.102';
 const sid=x=>String(x??'').trim();
 const norm=x=>sid(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
 const esc=x=>sid(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=c=>(Math.round(c)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const num=x=>Number.isFinite(Number(x))?Number(x):0;
 const cents=x=>Math.round(num(x)*100);
 const active=status=>norm(status)==='pendente';
 const canceled=p=>p?.manualCanceledV9590===true||p?.deleted===true||!!(p?.deleted_at||p?.deletedAt)||['cancelado','cancelada','excluido','excluida'].includes(norm(p?.status));
 const validId=id=>sid(id).length>0;
 function consolidate(data){
  const payments=Array.isArray(data?.payments)?data.payments:[],
   masters=Array.isArray(data?.masters)?data.masters:[],
   manualGroups=Array.isArray(data?.manualGroups)?data.manualGroups:[],
   possible=new Map(),seenEntries=new Set(),errors=[];
  const countIds=rows=>{const m=new Map();for(const x of rows){const k=sid(x?.id);if(k)m.set(k,(m.get(k)||0)+1)}return m};
  const paymentCounts=countIds(payments.filter(x=>x&&!canceled(x))),groupCounts=countIds(manualGroups);
  const perName=new Map();
  for(const m of masters.filter(x=>x?.active!==false&&sid(x.name)&&validId(x.id))){
   const n=norm(m.name),set=perName.get(n)||new Set();set.add(sid(m.id));perName.set(n,set);
  }
  // Nomes homônimos não podem receber o mesmo acerto por coincidência visual.
  for(const p of payments.filter(x=>x&&sid(x.factionMasterId)&&sid(x.factionName))){
   const n=norm(p.factionName),ids=perName.get(n)||new Set();
   ids.add(sid(p.factionMasterId));perName.set(n,ids);
  }
  for(const g of manualGroups){
   for(const p of Array.isArray(g?.rows)?g.rows:[]){
    if(!sid(p?.factionMasterId)||!sid(p?.factionName))continue;
    const n=norm(p.factionName),ids=perName.get(n)||new Set();
    ids.add(sid(p.factionMasterId));perName.set(n,ids);
   }
  }
  function owner(name,masterId){
   const label=sid(name),n=norm(label),known=perName.get(n)||new Set();
   const id=sid(masterId);
   const ambiguous=known.size>1||id&&known.size&&(!known.has(id));
   const key=ambiguous?(id?'master:'+id:'ambiguous:'+n):
    known.size===1?'master:'+([...known][0]):'person:'+n;
   return {key,name:label,ambiguous:!!ambiguous,
    masterId:id||(!ambiguous&&known.size===1?[...known][0]:null)};
  }
  function append(p,entry){
   if(!p?.name||!Number.isSafeInteger(entry.amountCents)||entry.amountCents<=0)
    return;
   const old=possible.get(p.key)||{key:p.key,factionName:p.name,masterId:p.masterId,
    identityAmbiguous:p.ambiguous,totalCents:0,manualCents:0,regularCents:0,
    entries:[],groupIds:[],paymentIds:[],dates:[]};
   old.identityAmbiguous=old.identityAmbiguous||p.ambiguous;
   if(!old.masterId&&p.masterId)old.masterId=p.masterId;
   old.totalCents+=entry.amountCents;
   if(entry.kind==='avulso')old.manualCents+=entry.amountCents;else old.regularCents+=entry.amountCents;
   old.entries.push(entry);
   if(entry.groupId)old.groupIds.push(entry.groupId);
   if(entry.paymentId)old.paymentIds.push(entry.paymentId);
   if(entry.date&&!old.dates.includes(entry.date))old.dates.push(entry.date);
   possible.set(p.key,old);
  }
  // Cada grupo avulso conta uma vez, incluindo seus ajustes e abatimentos já
  // calculados pelo módulo original; nunca somamos suas linhas individualmente.
  const seenManual=new Set(),manualRowIds=new Set();
  for(const g of manualGroups){
   const gid=sid(g?.id),items=Array.isArray(g?.rows)?g.rows:[],
    unique=items.filter(x=>validId(x?.id)&&x?.manual===true);
   for(const row of unique)manualRowIds.add(sid(row.id));
   if(!gid||groupCounts.get(gid)!==1||seenManual.has(gid)){errors.push('grupo-avulso-duplicado-ou-sem-id');continue}
   seenManual.add(gid);
   if(!active(g.status)){
    if(norm(g.status)==='revisar')errors.push('grupo-avulso-requer-revisao:'+gid);
    continue;
   }
   const live=unique.filter(x=>!canceled(x)),liveIds=new Set(live.map(x=>sid(x.id))),source=payments.filter(p=>p?.manual===true&&!canceled(p)&&sid(p.manualGroupId)===gid);
   const ownerKey=x=>JSON.stringify([sid(x.factionMasterId),norm(x.factionName)]);
   if(!live.length||unique.length!==items.length||unique.some(x=>sid(x.manualGroupId)!==gid)||liveIds.size!==live.length||live.some(x=>paymentCounts.get(sid(x.id))!==1)||source.length!==live.length||source.some(x=>!liveIds.has(sid(x.id)))||new Set(live.map(ownerKey)).size!==1||source.some(x=>!live.some(y=>sid(y.id)===sid(x.id)&&ownerKey(y)===ownerKey(x)&&norm(y.status)===norm(x.status)&&cents(y.value)===cents(x.value)&&cents(y.paidAmount)===cents(x.paidAmount)))){
    errors.push('grupo-avulso-sem-evidencia:'+gid);continue;
   }
   if(unique.some(x=>!canceled(x)&&norm(x.status)!=='pendente')){
    errors.push('grupo-avulso-misto:'+gid);continue;
   }
   const amountCents=cents(g.total);
   if(amountCents<=0){errors.push('valor-avulso-invalido:'+gid);continue}
   const first=unique.find(x=>!canceled(x))||unique[0];
   const factionName=sid(first.factionName||g.factionName);
   const actor=owner(factionName,first.factionMasterId);
   append(actor,{kind:'avulso',groupId:gid,amountCents,
    date:sid(g.date||first.scheduledPaymentDate),
    label:'Pagamento avulso · '+unique.filter(x=>!canceled(x)).length+' item(ns)',
    lineIds:unique.map(x=>sid(x.id))});
  }
  // Normal and partial settlements retain their original identities. Discount
  // reduces the obligation but is never counted as money already transferred.
  const exact=v=>{if(typeof v!=='number'&&!(typeof v==='string'&&/^\d+(?:\.\d{1,2})?$/.test(v)))return null;const n=Number(v),c=Math.round(n*100);return Number.isSafeInteger(c)&&c>=0&&Math.abs(n*100-c)<.00001?c:null};
  for(const row of payments){
   if(!row||row.manual===true||canceled(row)||!['pendente','parcial'].includes(norm(row.status)))continue;
   const id=sid(row.id);
   if(!id||paymentCounts.get(id)!==1||seenEntries.has(id)||manualRowIds.has(id)){
    errors.push('pagamento-duplicado-ou-sem-id:'+id);continue;
   }
   seenEntries.add(id);
   const total=exact(row.value),paid=exact(row.paidAmount??0),discount=exact(row.discountAmount??0);
   if([total,paid,discount].some(v=>v===null)||!Number.isSafeInteger(paid+discount)||total<=0||paid+discount>=total){
    errors.push('valor-normal-invalido:'+id);continue;
   }
   const partial=norm(row.status)==='parcial';
   if(!partial&&paid!==0||partial&&paid+discount===0){errors.push('pagamento-parcial-requer-conferencia:'+id);continue}
   const history=row.paymentHistory??[];let historyPaid=0,historyDiscount=0,valid=Array.isArray(history);const eventIds=new Set();
   if(valid)for(const h of history){const eventId=sid(h?.id),p=exact(h?.paid??0),d=exact(h?.discount??0);if(!eventId||eventIds.has(eventId)||p===null||d===null||p+d<=0){valid=false;break}eventIds.add(eventId);historyPaid+=p;historyDiscount+=d}
   if(!valid||!Number.isSafeInteger(historyPaid)||!Number.isSafeInteger(historyDiscount)||history.length&&(historyPaid!==paid||historyDiscount!==discount)||partial&&!history.length){errors.push('pagamento-parcial-requer-conferencia:'+id);continue}
   const balance=total-paid-discount;
   const actor=owner(row.factionName,row.factionMasterId);
   if(!actor.name){errors.push('pagamento-sem-pessoa:'+id);continue}
   append(actor,{kind:'normal',paymentId:id,amountCents:balance,totalCents:total,paidCents:paid,discountCents:discount,partial,
    date:sid(row.scheduledPaymentDate||row.serviceFinishedAt||row.paymentDate),
    label:sid(row.description||row.productName||'Pagamento de facção'),lineIds:[id]});
  }
  return {version:VERSION,scope:'apenas_visual_sem_baixa',productionPayment:false,
   groups:[...possible.values()].map(g=>({...g,sourceCount:g.entries.length,
    uniqueDates:g.dates.sort()})).sort((a,b)=>a.factionName.localeCompare(b.factionName,'pt-BR')),
   warnings:errors,rowsScanned:payments.length,manualGroupsScanned:manualGroups.length};
 }
 function dbRef(){
  try{return typeof db!=='undefined'&&db?db:window.db||{}}catch(e){return (typeof window!=='undefined'&&window.db)||{}}
 }
 function currentData(){
  const d=dbRef(),api=typeof window!=='undefined'?window.hlgbFactionManual9566:null;
  return {payments:Array.isArray(d.factionPayments)?d.factionPayments:[],
   masters:Array.isArray(d.factionMasters)?d.factionMasters:[],
   manualGroups:typeof api?.receiptGroups==='function'?api.receiptGroups():[]};
 }
 function printablePending(data,key,allowed){
  if(allowed!==true||data?.scope!=='apenas_visual_sem_baixa'||!Array.isArray(data.groups)||!Array.isArray(data.warnings))throw Error('Consulta indisponível');
  const matches=data.groups.filter(g=>g.key===key),g=matches[0];
  if(matches.length!==1||!g.masterId||g.identityAmbiguous||!Array.isArray(g.entries)||!g.entries.length||g.entries.length>500||g.sourceCount!==g.entries.length)throw Error('Identidade ou quantidade de registros a conferir');
  const valid=n=>Number.isSafeInteger(n)&&n>=0,ids=new Set();let total=0,normal=0,manual=0;
  for(const e of g.entries){const id=e.kind==='normal'?'n:'+sid(e.paymentId):'a:'+sid(e.groupId);if(!['normal','avulso'].includes(e.kind)||id.length<=2||ids.has(id)||!valid(e.amountCents)||e.amountCents===0)throw Error('Linha inválida');ids.add(id);
   if(e.kind==='normal'){if(![e.totalCents,e.paidCents,e.discountCents].every(valid)||e.totalCents-e.paidCents-e.discountCents!==e.amountCents)throw Error('Saldo divergente');normal+=e.amountCents}else manual+=e.amountCents;total+=e.amountCents;
  }
  if(![total,normal,manual].every(valid)||total!==g.totalCents||normal!==g.regularCents||manual!==g.manualCents)throw Error('Totais divergentes');
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>HLGB — Conferência de acerto</title><style>@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{font:11px Arial,sans-serif;color:#222;margin:0}h1{font-size:17px;margin:0 0 6px}h2{font-size:14px;margin:6px 0}p{margin:5px 0}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border-bottom:1px solid #bbb;padding:5px 3px;vertical-align:top;overflow-wrap:anywhere}th{text-align:left;background:#eee}thead{display:table-header-group}tr{break-inside:avoid}td:nth-child(n+3),th:nth-child(n+3){text-align:right}.muted{color:#555;font-size:10px}.total{font-weight:bold;border-top:2px solid #333;padding-top:6px}@media print{button{display:none}}</style></head><body><h1>HLGB Confecções — Conferência de acerto</h1><h2>'+esc(g.factionName)+' · cadastro '+esc(g.masterId)+'</h2><p>Consulta dos saldos locais disponíveis. Não é recibo, não confirma pagamento e não dá baixa.</p><p>'+g.entries.length+' lançamento(s) · '+data.warnings.length+' alerta(s) na consulta geral (registros excluídos ou a revisar).</p><table><colgroup><col style="width:43%"><col style="width:13%"><col style="width:11%"><col style="width:11%"><col style="width:11%"><col style="width:11%"></colgroup><thead><tr><th>Serviço / referência</th><th>Data de origem</th><th>Bruto</th><th>Pago</th><th>Desconto</th><th>Saldo</th></tr></thead><tbody>'+
  g.entries.map(e=>'<tr><td>'+esc(e.label)+'<br><span class="muted">'+esc(e.kind==='normal'?'Normal · '+e.paymentId:'Avulso · '+e.groupId)+' · '+esc((e.lineIds||[]).join(', '))+'</span></td><td>'+esc(e.date||'Não informada')+'</td>'+ (e.kind==='normal'?'<td>'+money(e.totalCents)+'</td><td>'+money(e.paidCents)+'</td><td>'+money(e.discountCents)+'</td>':'<td colspan="3">Total líquido do grupo</td>')+'<td>'+money(e.amountCents)+'</td></tr>').join('')+
  '</tbody></table><p class="total">Normal: '+money(normal)+' · Avulso: '+money(manual)+' · Saldo identificado: '+money(total)+'</p><p class="muted">As datas podem representar programação ou serviço, não data de pagamento. Avulsos têm ajustes já incorporados. Confira a origem e os alertas antes de pagar.</p><button type="button" onclick="window.print()">Imprimir / salvar PDF</button></body></html>';
 }
 function authorized(){try{return window.__HLGB_AUTH_READY===true&&typeof canOpenPage==='function'&&canOpenPage('pagamentosFaccoes')===true&&canOpenPage('faccoes')===true}catch(_){return false}}
 let signature='';
 function render(){
  if(typeof document==='undefined')return false;
  if(!authorized()){document.getElementById('hlgb-unified-acertos-v95102')?.remove();signature='';return false}
  const anchor=document.getElementById('factionPaymentTable');
  if(!anchor)return false;
  const data=consolidate(currentData()),json=JSON.stringify(data);
  let host=document.getElementById('hlgb-unified-acertos-v95102');
  if(!host){host=document.createElement('section');host.id='hlgb-unified-acertos-v95102';
   host.className='panel';host.style.cssText='margin:12px 0;padding:12px';
   signature='';
   const manual=document.getElementById('fm66-receipts');
   if(manual)manual.insertAdjacentElement('beforebegin',host);
   else anchor.insertAdjacentElement('afterend',host);
  }
  if(signature===json)return true;
  signature=json;
  host.innerHTML='<h3 style="margin:0 0 8px">🧾 Acerto consolidado por pessoa</h3>'+
   '<p class="sub">Uma visão por facção/embaladeira: soma saldos <b>pendentes e parciais conciliados</b> normais e avulsos da mesma pessoa, preservando os registros e datas originais. <b>Não dá baixa nem cria um novo lançamento financeiro.</b></p>'+
   (data.warnings.length?'<p class="sub" style="color:#934">⚠ Existem '+data.warnings.length+
    ' registro(s) que precisam de conferência e não entram na soma para evitar pagamento incorreto.</p>':'')+
   (data.groups.length?'<div style="overflow-x:auto"><table style="width:100%"><thead><tr>'+
    '<th>Profissional</th><th>Acertos pendentes</th><th>Normal</th><th>Avulso</th>'+
    '<th>Total do acerto</th><th>Detalhamento</th></tr></thead><tbody>'+
    data.groups.map(g=>'<tr><td><b>'+esc(g.factionName)+'</b>'+
      (g.identityAmbiguous?'<div class="sub" style="color:#934">Nome duplicado: conferir identidade</div>':'')+
      '</td><td>'+g.sourceCount+' lançamento(s)</td><td>'+money(g.regularCents)+
      '</td><td>'+money(g.manualCents)+'</td><td><b>'+money(g.totalCents)+'</b></td>'+
      '<td>'+(g.masterId&&!g.identityAmbiguous?'<button type="button" class="secondary" data-faction-print9777="'+esc(g.key)+'">Imprimir / PDF do acerto</button>':'')+'<details><summary>Ver itens e datas</summary>'+
      g.entries.map(e=>'<div style="padding:5px;border-bottom:1px solid #ddd">'+
       esc(e.kind==='avulso'?'Avulso':'Normal')+' · '+esc(e.label)+' · '+
       esc(e.date||'Sem data')+' · Saldo '+money(e.amountCents)+(e.kind==='normal'?' · Bruto '+money(e.totalCents)+' · Pago '+money(e.paidCents)+' · Desconto '+money(e.discountCents):'')+'<br><small>'+
       esc(e.groupId||e.paymentId||'')+'</small>'+       (e.kind==='normal'&&!e.partial?        ' <button type="button" class="secondary" data-payee104-id="'+esc(e.paymentId)+'">↔ Trocar facção</button>'+        ' <button type="button" class="secondary" data-already-paid104-id="'+esc(e.paymentId)+'">✓ Já estava pago</button>':e.kind==='avulso'?        ' <button type="button" class="secondary" data-manual-payee104-group="'+esc(e.groupId)+'">↔ Trocar facção avulsa</button>':' <span class="sub">Parcial: continuar no acerto original</span>')+       '</div>').join('')+
      '</details></td></tr>').join('')+'</tbody></table></div>':
    '<div class="sub">Nenhum acerto pendente nos dados disponíveis neste computador.</div>')+
   '<p class="sub">A conferência da mesma pessoa usa o cadastro e o nome normalizado. Se houver homônimos ou pagamento parcial, revise os registros antes de pagar. Para registrar uma única saída bancária, será necessário homologar uma transação financeira unificada com confirmação remota; as baixas atuais continuam separadas e protegidas.</p>';
  host.querySelectorAll('[data-faction-print9777]').forEach(b=>b.onclick=()=>{
   if(!authorized()||!host.isConnected)return;
   const fresh=consolidate(currentData());if(JSON.stringify(fresh)!==signature){render();return alert('Os acertos mudaram. Confira os valores e solicite a impressão novamente.')}
   let w;try{const html=printablePending(fresh,b.dataset.factionPrint9777,true);w=window.open('','_blank');if(!w)return alert('Permita pop-ups para imprimir.');if(!authorized()){w.close();return}w.opener=null;w.document.open();w.document.write(html);w.document.close();w.focus()}catch(_){try{w?.close()}catch(e){}alert('Relatório indisponível. Confira a identidade e os saldos.')}
  });
  return true;
 }
 function install(){return render()}
 if(typeof document!=='undefined'){
  [0,600,1800].forEach(ms=>setTimeout(install,ms));
  try{window.hlgbAfterLogin?.(()=>setTimeout(install,300),0)}catch(e){}
  window.addEventListener?.('hlgb:authenticated',()=>setTimeout(install,250));
  window.addEventListener?.('hlgb:logout',()=>{document.getElementById('hlgb-unified-acertos-v95102')?.remove();signature=''});
 }
 return Object.freeze({version:VERSION,consolidate,printablePending,currentData,render,install});
});
