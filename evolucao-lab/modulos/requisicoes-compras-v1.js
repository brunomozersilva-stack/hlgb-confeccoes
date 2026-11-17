/* HLGB Evolução — Requisições de compra vinculadas ao planejamento, LAB FICTÍCIO.
 * Sem rede, sem armazenamento próprio. Todas as alterações ocorrem no clone
 * transacional do core.apply; nunca aprovar automaticamente ou receber estoque.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGBLabPurchaseRequestsV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const byId=(xs,id)=>xs.find(x=>x.id===id);
 const norm=x=>String(x||'').trim().toLocaleUpperCase('pt-BR');
 const text=(value,label)=>{
  const x=String(value??'').trim();
  if(!x||x.length>95)throw Error(label+' obrigatório (até 95 caracteres).');
  return x;
 };
 const active=new Set(['rascunho','aprovada','emitida']);
 const canCancel=new Set(['rascunho','aprovada']);
 const money=(grams,price)=>Math.ceil(grams*price/1000);
 function ensure(s){
  if(!Array.isArray(s.purchaseRequests))s.purchaseRequests=[];
 }
 function source(s,materialId,planner){
  if(!planner||typeof planner.preview!=='function')
   throw Error('Planejador de materiais indisponível. Nenhuma requisição alterada.');
  const material=byId(s.materials,materialId);
  if(!material)throw Error('Material não cadastrado.');
  const forecast=planner.preview(s);
  const row=forecast.materials.find(x=>x.materialId===material.id);
  if(!row||row.missingGrams<1)
   throw Error('Não há falta calculada para este material no cenário atual.');
  const components=forecast.detail.filter(x=>x.materialId===material.id)
   .map(x=>[x.lineId,x.productId,x.color,x.size,x.qty,x.requiredGrams,x.ruleId])
   .sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  // Cálculo é amarrado ao consumo efetivo, versão de receita, linha,
  // saldo e custo deste material; mudanças em outro material não invalidam.
  const basis=JSON.stringify({materialId:material.id,components,
   requiredGrams:row.requiredGrams,availableGrams:row.availableGrams,
   missingGrams:row.missingGrams,priceCentsKg:row.priceCentsKg});
  return {row,basis,componentCount:components.length,
   planLineIds:[...new Set(components.map(x=>x[0]))]};
 }
 function preview(s,planner){
  const data=planner.preview(s),requests=s.purchaseRequests||[];
  return {...data,requests:requests.map(x=>({
   id:x.id,materialId:x.materialId,status:x.status,
   qtyGrams:x.qtyGrams,estimatedCents:x.estimatedCents,
   purchaseId:x.purchaseId||null
  })),pendingMaterials:data.materials.filter(x=>
   x.missingGrams>0&&!requests.some(r=>
    r.materialId===x.materialId&&active.has(r.status)))};
 }
 function create(s,p,ctx,planner){
  ensure(s);
  const current=source(s,p.materialId,planner);
  if(s.purchaseRequests.some(r=>r.materialId===p.materialId&&active.has(r.status)))
   throw Error('Já existe requisição ativa deste material. Confira antes de criar outra.');
  if(s.purchaseRequests.length>=200)throw Error('Limite de requisições fictícias atingido.');
  const requester=text(p.requester,'Solicitante fictício'),
   reason=text(p.reason,'Justificativa da necessidade');
  const row=current.row;
  if(!Number.isSafeInteger(row.missingGrams)||row.missingGrams>1000000)
   throw Error('Falta calculada fora do limite seguro de 1.000.000 g.');
  const r={id:ctx.next(s,'REQ'),materialId:row.materialId,
   requiredGrams:row.requiredGrams,availableGrams:row.availableGrams,
   qtyGrams:row.missingGrams,priceCentsKg:row.priceCentsKg,
   estimatedCents:money(row.missingGrams,row.priceCentsKg),
   planLineIds:current.planLineIds,componentCount:current.componentCount,
   basis:current.basis,requester,reason,status:'rascunho',
   createdCommandId:ctx.uid,approvedCommandId:null,issuedCommandId:null,
   receiptCommandId:null,cancelCommandId:null,purchaseId:null};
  s.purchaseRequests.push(r);
  return r.id+' · '+row.name+' · '+r.qtyGrams+' g · somente rascunho';
 }
 function currentBasis(s,r,planner){
  const current=source(s,r.materialId,planner);
  if(current.basis!==r.basis||current.row.missingGrams!==r.qtyGrams)
   throw Error('Planejamento ou estoque mudou. Cancele a requisição e gere uma nova previsão; nenhum valor antigo será aprovado.');
  return current;
 }
 function approve(s,p,ctx,planner){
  ensure(s);
  const r=byId(s.purchaseRequests,p.id);
  if(!r||r.status!=='rascunho')throw Error('Somente requisição em rascunho pode ser aprovada.');
  const approver=text(p.approver,'Aprovador fictício'),
   reason=text(p.reason,'Motivo da aprovação');
  if(norm(approver)===norm(r.requester))
   throw Error('Solicitante e aprovador devem ser pessoas diferentes.');
  currentBasis(s,r,planner);
  r.status='aprovada';r.approver=approver;r.approvalReason=reason;
  r.approvedCommandId=ctx.uid;
  return r.id+' · aprovada por '+approver+' · nenhuma compra emitida';
 }
 function issue(s,p,ctx,planner){
  ensure(s);
  const r=byId(s.purchaseRequests,p.id);
  if(!r||r.status!=='aprovada')throw Error('Apenas requisição aprovada pode emitir compra fictícia.');
  currentBasis(s,r,planner);
  if(s.purchaseOrders.some(x=>x.purchaseRequestId===r.id)||r.purchaseId)
   throw Error('Requisição já possui compra. Evitar duplicidade.');
  const supplier=byId(s.suppliers,p.supplierId);
  if(!supplier)throw Error('Fornecedor de compra não cadastrado.');
  const one=text(p.checkerOne,'Conferente 1'),two=text(p.checkerTwo,'Conferente 2');
  if(norm(one)===norm(two))throw Error('Conferentes 1 e 2 devem ser pessoas diferentes.');
  const note=text(p.reason,'Justificativa de emissão');
  const obj={id:ctx.next(s,'COM'),materialId:r.materialId,
   supplierId:supplier.id,qtyGrams:r.qtyGrams,priceCentsKg:r.priceCentsKg,
   checkerOne:one,checkerTwo:two,received:false,purchaseRequestId:r.id};
  s.purchaseOrders.push(obj);
  r.status='emitida';r.purchaseId=obj.id;r.supplierId=supplier.id;
  r.issuedCommandId=ctx.uid;r.issueReason=note;
  return r.id+' → '+obj.id+' · '+r.qtyGrams+' g · aguardando recebimento';
 }
 function cancel(s,p,ctx){
  ensure(s);
  const r=byId(s.purchaseRequests,p.id);
  if(!r||!canCancel.has(r.status))
   throw Error('Só requisições não emitidas podem ser canceladas; compra existente deve seguir processo próprio.');
  if(s.purchaseOrders.some(x=>x.purchaseRequestId===r.id))
   throw Error('Requisição já vinculada à compra; cancelamento direto bloqueado.');
  r.previousStatus=r.status;r.status='cancelada';
  r.cancelReason=text(p.reason,'Motivo do cancelamento');
  r.cancelCommandId=ctx.uid;
  return r.id+' · cancelada com histórico preservado';
 }
 function receive(s,purchase,ctx){
  ensure(s);
  if(!purchase.purchaseRequestId)return;
  const r=byId(s.purchaseRequests,purchase.purchaseRequestId);
  if(!r||r.status!=='emitida'||r.purchaseId!==purchase.id||r.receiptCommandId)
   throw Error('Requisição não conciliada com esta compra. Recebimento bloqueado.');
  if(!purchase.received||!s.stockLedger.some(x=>
   x.sourceId===purchase.id&&x.type==='compra'&&x.commandId===ctx.uid)||
   !s.finance.some(x=>x.sourceId===purchase.id&&x.kind==='pagar'))
   throw Error('Baixa de compra e título não conciliados; não concluir requisição.');
  r.status='recebida';r.receiptCommandId=ctx.uid;
 }
 function inspect(s){
  const problems=[],rs=s.purchaseRequests||[],seen=new Set(),pending=new Set();
  for(const r of rs){
   const purchase=s.purchaseOrders.filter(x=>x.purchaseRequestId===r.id);
   const event=type=>s.log.some(x=>x.commandId===r[type+'CommandId']&&
    x.type==='purchase.request.'+({created:'create',approved:'approve',
     issued:'issue',cancel:'cancel',receipt:'receive'}[type]||type));
   const existsCommand=(id,type)=>s.log.some(x=>x.commandId===id&&x.type===type);
   const legal=['rascunho','aprovada','emitida','recebida','cancelada'].includes(r.status);
   if(!r.id||seen.has(r.id)||!legal||!byId(s.materials,r.materialId)||
     !Number.isSafeInteger(r.requiredGrams)||r.requiredGrams<1||
     !Number.isSafeInteger(r.availableGrams)||r.availableGrams<0||
     !Number.isSafeInteger(r.qtyGrams)||r.qtyGrams<1||
     r.qtyGrams!==Math.max(0,r.requiredGrams-r.availableGrams)||
     !Number.isSafeInteger(r.priceCentsKg)||r.priceCentsKg<1||
     r.estimatedCents!==money(r.qtyGrams,r.priceCentsKg)||
     !Array.isArray(r.planLineIds)||r.planLineIds.length<1||
     !Number.isSafeInteger(r.componentCount)||r.componentCount<1||
     typeof r.basis!=='string'||!r.basis||
     !r.requester||!r.reason||
     !existsCommand(r.createdCommandId,'purchase.request.create'))
    problems.push(String(r.id)+': requisição sem origem, quantidade, preço ou estado válido');
   seen.add(r.id);
   if(active.has(r.status)){
    if(pending.has(r.materialId))
     problems.push(String(r.id)+': requisições ativas duplicadas do material');
    pending.add(r.materialId);
   }
   if(['aprovada','emitida','recebida'].includes(r.status)){
    if(!r.approver||norm(r.approver)===norm(r.requester)||!r.approvalReason||
      !existsCommand(r.approvedCommandId,'purchase.request.approve'))
     problems.push(String(r.id)+': aprovação sem conferência separada ou evento');
   }
   if(['emitida','recebida'].includes(r.status)){
    const po=purchase[0];
    if(purchase.length!==1||!po||r.purchaseId!==po.id||
      r.materialId!==po.materialId||r.qtyGrams!==po.qtyGrams||
      r.priceCentsKg!==po.priceCentsKg||r.supplierId!==po.supplierId||
      !r.issueReason||!existsCommand(r.issuedCommandId,'purchase.request.issue'))
     problems.push(String(r.id)+': compra emitida divergente da requisição');
   }else if(purchase.length||r.purchaseId)
    problems.push(String(r.id)+': compra vinculada a requisição não emitida');
   if(r.status==='emitida'&&
     (purchase[0]?.received||r.receiptCommandId))
    problems.push(String(r.id)+': requisição emitida marcada como recebida indevidamente');
   if(r.status==='recebida'&&
     (!purchase[0]?.received||
      !existsCommand(r.receiptCommandId,'purchase.receive')||
      s.stockLedger.filter(x=>x.type==='compra'&&x.sourceId===r.purchaseId).length!==1||
      s.finance.filter(x=>x.kind==='pagar'&&x.sourceId===r.purchaseId).length!==1))
    problems.push(String(r.id)+': requisição recebida não conciliada com estoque e título');
   if(r.status==='cancelada'&&
     (!canCancel.has(r.previousStatus)||!r.cancelReason||
      !existsCommand(r.cancelCommandId,'purchase.request.cancel')))
    problems.push(String(r.id)+': cancelamento sem motivo ou evento');
  }
  for(const po of s.purchaseOrders){
   if(po.purchaseRequestId&&!rs.some(x=>x.id===po.purchaseRequestId))
    problems.push(String(po.id)+': compra órfã de requisição');
  }
  return problems;
 }
 return Object.freeze({version:'1.0.0',ensure,source,preview,create,approve,issue,
  cancel,receive,inspect});
});
