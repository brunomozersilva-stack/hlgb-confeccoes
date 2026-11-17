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
 const canceled=p=>p?.manualCanceledV9590===true||['cancelado','cancelada'].includes(norm(p?.status));
 const validId=id=>sid(id).length>0;
 function consolidate(data){
  const payments=Array.isArray(data?.payments)?data.payments:[],
   masters=Array.isArray(data?.masters)?data.masters:[],
   manualGroups=Array.isArray(data?.manualGroups)?data.manualGroups:[],
   possible=new Map(),seenEntries=new Set(),errors=[];
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
   if(!gid||seenManual.has(gid)){errors.push('grupo-avulso-duplicado-ou-sem-id');continue}
   seenManual.add(gid);
   if(!active(g.status)){
    if(norm(g.status)==='revisar')errors.push('grupo-avulso-requer-revisao:'+gid);
    continue;
   }
   if(!unique.some(x=>!canceled(x))||unique.some(x=>sid(x.manualGroupId)!==gid)){
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
  // Lançamentos normais não são convertidos em avulsos, apenas contabilizados
  // ao lado deles. IDs repetidos e saldos parciais tornam a prévia inconclusiva.
  for(const row of payments){
   if(!row||row.manual===true||canceled(row)||!active(row.status))continue;
   const id=sid(row.id);
   if(!id||seenEntries.has(id)||manualRowIds.has(id)){
    errors.push('pagamento-duplicado-ou-sem-id:'+id);continue;
   }
   seenEntries.add(id);
   const balance=cents(row.value)-cents(row.paidAmount);
   if(cents(row.paidAmount)!==0){
    errors.push('pagamento-parcial-requer-conferencia:'+id);continue;
   }
   if(balance<=0){errors.push('pagamento-sem-saldo:'+id);continue}
   const actor=owner(row.factionName,row.factionMasterId);
   append(actor,{kind:'normal',paymentId:id,amountCents:balance,
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
 let signature='';
 function render(){
  if(typeof document==='undefined')return false;
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
   '<p class="sub">Uma visão por facção/embaladeira: soma pagamentos <b>pendentes</b> normais e avulsos da mesma pessoa, preservando os registros e datas originais. <b>Não dá baixa nem cria um novo lançamento financeiro.</b></p>'+
   (data.warnings.length?'<p class="sub" style="color:#934">⚠ Existem '+data.warnings.length+
    ' registro(s) que precisam de conferência e não entram na soma para evitar pagamento incorreto.</p>':'')+
   (data.groups.length?'<div style="overflow-x:auto"><table style="width:100%"><thead><tr>'+
    '<th>Profissional</th><th>Acertos pendentes</th><th>Normal</th><th>Avulso</th>'+
    '<th>Total do acerto</th><th>Detalhamento</th></tr></thead><tbody>'+
    data.groups.map(g=>'<tr><td><b>'+esc(g.factionName)+'</b>'+
      (g.identityAmbiguous?'<div class="sub" style="color:#934">Nome duplicado: conferir identidade</div>':'')+
      '</td><td>'+g.sourceCount+' lançamento(s)</td><td>'+money(g.regularCents)+
      '</td><td>'+money(g.manualCents)+'</td><td><b>'+money(g.totalCents)+'</b></td>'+
      '<td><details><summary>Ver itens e datas</summary>'+
      g.entries.map(e=>'<div style="padding:5px;border-bottom:1px solid #ddd">'+
       esc(e.kind==='avulso'?'Avulso':'Normal')+' · '+esc(e.label)+' · '+
       esc(e.date||'Sem data')+' · '+money(e.amountCents)+'<br><small>'+
       esc(e.groupId||e.paymentId||'')+'</small></div>').join('')+
      '</details></td></tr>').join('')+'</tbody></table></div>':
    '<div class="sub">Nenhum acerto pendente nos dados disponíveis neste computador.</div>')+
   '<p class="sub">A conferência da mesma pessoa usa o cadastro e o nome normalizado. Se houver homônimos ou pagamento parcial, revise os registros antes de pagar. Para registrar uma única saída bancária, será necessário homologar uma transação financeira unificada com confirmação remota; as baixas atuais continuam separadas e protegidas.</p>';
  return true;
 }
 function install(){return render()}
 if(typeof document!=='undefined'){
  [0,600,1800].forEach(ms=>setTimeout(install,ms));
  try{window.hlgbAfterLogin?.(()=>setTimeout(install,300),0)}catch(e){}
  window.addEventListener?.('hlgb:authenticated',()=>setTimeout(install,250));
 }
 return Object.freeze({version:VERSION,consolidate,currentData,render,install});
});
