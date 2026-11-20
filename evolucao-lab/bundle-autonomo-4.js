/* modulos/registro-v1.js */
/* HLGB Evolução: registro de módulos opcionais do LAB. Nenhuma rede, storage ou escrita financeira. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGBLabModules=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const registry=new Map();
 const validId=id=>typeof id==='string'&&/^[a-z][a-z0-9-]{1,59}$/.test(id);
 function register(module){
  if(!module||!validId(module.id)||typeof module.version!=='string'||typeof module.analyze!=='function')
   throw Error('Contrato do módulo inválido.');
  if(registry.has(module.id))throw Error('Módulo duplicado: '+module.id);
  registry.set(module.id,{id:module.id,version:module.version,
   analyze:module.analyze,enabled:true,failures:0,lastFailure:null});
  return module.id;
 }
 function setEnabled(id,enabled){
  const item=registry.get(id);
  if(!item)throw Error('Módulo não encontrado: '+id);
  if(typeof enabled!=='boolean')throw Error('Flag de módulo inválida.');
  item.enabled=enabled;return item.enabled;
 }
 function list(){
  return [...registry.values()].map(x=>({id:x.id,version:x.version,
   enabled:x.enabled,failures:x.failures,lastFailure:x.lastFailure}));
 }
 function call(id,method,document){
  const item=registry.get(id);
  if(!item)return {ok:false,reason:'missing',id};
  if(!item.enabled)return {ok:false,reason:'disabled',id};
  if(method!=='analyze')return {ok:false,reason:'unsupported',id};
  try{
   const data=item.analyze(document);
   if(!data||typeof data!=='object')throw Error('Resultado do módulo inválido.');
   return {ok:true,id,version:item.version,data};
  }catch(error){
   item.failures++;
   item.lastFailure=String(error&&error.message||error).slice(0,160);
   return {ok:false,reason:'error',id};
  }
 }
 return Object.freeze({register,setEnabled,list,call});
});

;
/* modulos/observabilidade-v2.js */
/* HLGB Evolução — Observabilidade 2.0. Somente leitura e somente dados inventados.
 * Interface pública: analyze(document) => {findings, summary, history, recommendations}.
 * Não modifica o documento, não faz RPC, não reenvia WAL e não autocorrige pagamentos.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root){
  root.HLGBLabObservabilityV2=api;
  if(root.HLGBLabModules&&typeof root.HLGBLabModules.register==='function')
   root.HLGBLabModules.register(api);
 }
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const severityOrder={critica:0,alta:1,media:2,informativa:3};
 const areas={
  order:'pedidos',cut:'corte',purchase:'compras',material:'estoque',
  settlement:'acertos',compensation:'acertos',finance:'hub',
  error:'central',faction:'faccoes',payroll:'folha',print:'impressora3d'
 };
 const eventArea=type=>{
  const key=String(type||'').split('.')[0];
  return ({order:'pedidos',cut:'corte',faction:'faccoes',settlement:'acertos',
   finance:'hub',purchase:'compras',stock:'estoque',material:'cadastros',
   product:'produtos',client:'cadastros',supplier:'cadastros',
   payroll:'folha',print:'impressora3d',error:'central'})[key]||'nucleo';
 };
 const normalize=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .trim().toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
 const arr=(s,k)=>Array.isArray(s[k])?s[k]:[];
 const byId=(items,id)=>items.find(x=>x.id===id);
 const eqStatus=(x,y)=>String(x||'')===String(y||'');
 function analyze(source){
  if(!source||typeof source!=='object'||source.schema!=='hlgb-evolucao-operacao-ficticia-v1')
   throw Error('Documento do laboratório não compatível com o observador.');
  const orders=arr(source,'orders'),cutPlans=arr(source,'cutPlans'),
   bomCuts=arr(source,'bomCutRuns'),
   purchases=arr(source,'purchaseOrders'),requests=arr(source,'purchaseRequests'),
   purchaseReturns=arr(source,'purchaseReturns'),
   materials=arr(source,'materials'),
   settlements=arr(source,'settlements'),comps=arr(source,'settlementCompensations'),
   finance=arr(source,'finance'),ledger=arr(source,'stockLedger'),
   errors=arr(source,'errors'),events=arr(source,'log'),batches=arr(source,'paymentBatches'),
   assignments=arr(source,'factionAssignments'),
   partialTransfers=arr(source,'factionPartialTransfers');
  const findings=[];
  const push=(code,severity,module,record,message,action,evidence)=>findings.push({
   code,severity,module,recordId:String(record??''),message,action,
   evidence:String(evidence??'')
  });
  // Índices locais evitam percorrer todo o Hub para cada pedido/acerto.
  const groupBy=(list,key)=>{
   const result=new Map();
   for(const item of list){
    const k=key(item);
    if(!result.has(k))result.set(k,[]);
    result.get(k).push(item);
   }
   return result;
  };
  const billsBySource=groupBy(finance,x=>x.sourceId);
  const billsById=new Map(finance.map(x=>[x.id,x]));
  const movementsBySource=groupBy(ledger,x=>x.sourceId);
  const movementsByPlan=groupBy(ledger,x=>x.cutPlanId);
  const compensationBySettlement=groupBy(comps,x=>x.settlementId);
  const orderByProduct=groupBy(orders,x=>x.productId);
  const settlementByFaction=groupBy(settlements,x=>x.factionId);
  const compensationByFaction=groupBy(comps,x=>x.factionId);
  const assignmentsByOrder=groupBy(assignments,x=>x.orderId);
  const settlementByAssignment=groupBy(settlements,x=>x.assignmentId);
  const findFinance=id=>billsById.get(id);
  const one=(items,sourceId,kind)=>{
   const local=items===finance?(billsBySource.get(sourceId)||[]):items.filter(x=>x.sourceId===sourceId);
   return kind?local.filter(x=>x.kind===kind):local;
  };
  const cents=x=>Number.isSafeInteger(x)&&x>=0;
  // Inventário histórico e unicidade: critérios de bloqueio antes de promover qualquer versão.
  const all=[...orders,...cutPlans,...purchases,...purchaseReturns,...settlements,...comps,
   ...finance,...materials,...arr(source,'factions'),...arr(source,'products'),
   ...arr(source,'clients'),...arr(source,'suppliers'),...arr(source,'employees'),
   ...arr(source,'prints')];
  const seenIds=new Set();
  for(const x of all){
   if(typeof x?.id!=='string'||seenIds.has(x.id))
    push('ID_DUPLICADO','critica','nucleo',x?.id,
     'ID inexistente ou duplicado entre módulos.',
     'Bloquear novas gravações, exportar evidência e verificar identidade dos registros.',x?.id);
   if(typeof x?.id==='string')seenIds.add(x.id);
  }
  const seenCommands=new Set();
  for(const ev of events){
   if(!ev.commandId||seenCommands.has(ev.commandId))
    push('EVENTO_DUPLICADO','critica','auditor',ev.commandId,
     'Comando sem identificador ou repetido no histórico.',
     'Conferir idempotência e persistência; nunca repetir pagamento no escuro.',ev.commandId);
   seenCommands.add(ev.commandId);
  }
  if(events.length&&events[events.length-1].revision!==source.revision)
   push('REVISAO_HISTORICO','alta','nucleo',source.revision,
    'Revisão atual diferente do último evento registrado.',
    'Comparar snapshot e trilha antes de qualquer operação.',source.revision);
  // Contas a receber: vínculo e valor pelo total de peças.
  for(const o of orders){
   const bills=one(finance,o.id,'receber');
   const qty=Object.values(o.grade||{}).reduce((sum,n)=>sum+Number(n||0),0);
   if(bills.length!==1||!cents(o.priceCents)||!Number.isSafeInteger(qty)||
       bills[0]?.amountCents!==qty*o.priceCents)
    push('PEDIDO_TITULO','alta','pedidos',o.id,
     'Conta a receber ausente, repetida ou divergente do pedido.',
     'Conferir grade, preço e título no Hub; não gerar título automático.',o.id);
  }
  // Requisições: diagnosticar trajetória e compras órfãs sem criar correção.
  const activeRequests=new Set(),seenReqs=new Set(),seenIssueCancelRefs=new Set();
  for(const req of requests){
   const linked=purchases.filter(p=>p.purchaseRequestId===req.id);
   const origin=events.some(e=>e.commandId===req.createdCommandId&&
    e.type==='purchase.request.create');
   if(!req.id||seenReqs.has(req.id)||!byId(materials,req.materialId)||
      !['rascunho','aprovada','emitida','recebida','cancelada','emissao_cancelada'].includes(req.status)||
      !Number.isSafeInteger(req.qtyGrams)||req.qtyGrams<1||
      !Number.isSafeInteger(req.requiredGrams)||req.requiredGrams<1||
      !Number.isSafeInteger(req.availableGrams)||req.availableGrams<0||
      req.qtyGrams!==req.requiredGrams-req.availableGrams||
      !Number.isSafeInteger(req.priceCentsKg)||req.priceCentsKg<1||
      req.estimatedCents!==Math.ceil(req.qtyGrams*req.priceCentsKg/1000)||
      !req.requester||!req.reason||!origin)
    push('REQUISICAO_ORIGEM','critica','compras',req.id,
     'Requisição sem base de cálculo, evento ou preço original conciliado.',
     'Conferir planejamento, estoque de origem e revisão antes de aprovar.',req.materialId);
   seenReqs.add(req.id);
   if(['rascunho','aprovada','emitida'].includes(req.status)){
    if(activeRequests.has(req.materialId))
     push('REQUISICAO_DUPLICADA','critica','compras',req.id,
      'Há requisições ativas duplicadas para o mesmo material.',
      'Bloquear nova emissão e conferir a primeira solicitação.',req.materialId);
    activeRequests.add(req.materialId);
   }
   if(['aprovada','emitida','recebida','emissao_cancelada'].includes(req.status)&&
     (!req.approver||normalize(req.approver)===normalize(req.requester)||
      !events.some(e=>e.commandId===req.approvedCommandId&&
       e.type==='purchase.request.approve')))
    push('REQUISICAO_APROVACAO','critica','compras',req.id,
     'Aprovação sem evento verificável ou separação entre solicitante e aprovador.',
     'Reconciliar identidade e evidência; aprovação digitada não é permissão real.',req.id);
   if(['emitida','recebida','emissao_cancelada'].includes(req.status)){
    const purchase=linked[0];
    if(linked.length!==1||!purchase||purchase.id!==req.purchaseId||
      purchase.materialId!==req.materialId||purchase.qtyGrams!==req.qtyGrams||
      purchase.priceCentsKg!==req.priceCentsKg||
      (req.status!=='emissao_cancelada'&&purchase.cancelled===true)||
      !events.some(e=>e.commandId===req.issuedCommandId&&
       e.type==='purchase.request.issue'))
     push('REQUISICAO_COMPRA','critica','compras',req.id,
      'Compra emitida não corresponde a uma requisição aprovada.',
      'Conferir ID da compra, material, quantidade, preço e comando.',req.purchaseId);
    if(req.status==='emissao_cancelada'){
    const po=linked[0],ref=String(req.cancelIssueReference||'').trim().toLocaleUpperCase('pt-BR');
    if(!ref||seenIssueCancelRefs.has(ref))
     push('REQUISICAO_CANCEL_REFERENCIA','critica','compras',req.id,
      'Cancelamento emitido com referência vazia ou repetida.',
      'Conferir protocolo e não repetir o cancelamento.',ref);
    seenIssueCancelRefs.add(ref);
    if(!po||po.cancelled!==true||po.received||
      req.cancelIssueReference!==po.cancelReference||
      req.cancelIssueReason!==po.cancelReason||
      req.cancelIssueCommandId!==po.cancelCommandId||
      req.cancelledBy!==po.cancelledBy||
      req.cancelReviewedBy!==po.cancelReviewedBy||
      !req.cancelIssueReason||!req.cancelledBy||!req.cancelReviewedBy||
      normalize(req.cancelledBy)===normalize(req.cancelReviewedBy)||
      normalize(req.cancelReviewedBy)===normalize(req.requester)||
      !events.some(e=>e.commandId===req.cancelIssueCommandId&&
       e.type==='purchase.request.cancelIssued')||
      req.receiptCommandId||
      ledger.some(m=>m.sourceId===req.purchaseId)||
      finance.some(t=>t.sourceId===req.purchaseId))
     push('REQUISICAO_CANCEL_EMITIDA','critica','compras',req.id,
      'Compra cancelada com vínculo, dupla conferência, estoque ou título inconsistente.',
      'Não dar entrada, estornar ou reativar sem processo formal validado.',req.purchaseId);
   }
   if(req.status==='recebida'&&(!purchase?.received||
      !events.some(e=>e.commandId===req.receiptCommandId&&e.type==='purchase.receive')||
      ledger.filter(m=>m.sourceId===req.purchaseId&&m.type==='compra').length!==1||
      one(finance,req.purchaseId,'pagar').length!==1))
     push('REQUISICAO_RECEBIMENTO','critica','compras',req.id,
      'Recebimento da requisição não conciliado com estoque ou Hub.',
      'Comparar movimento e título da compra antes de qualquer nova entrada.',req.purchaseId);
   }else if(linked.length>0||req.purchaseId)
    push('REQUISICAO_VINCULO_INDEVIDO','critica','compras',req.id,
     'Compra vinculada a solicitação que ainda não foi emitida.',
     'Bloquear recebimento e conferir histórico da requisição.',req.id);
   if(req.status==='cancelada'&&
     (!req.cancelReason||!events.some(e=>e.commandId===req.cancelCommandId&&
       e.type==='purchase.request.cancel')))
    push('REQUISICAO_CANCELAMENTO','alta','compras',req.id,
     'Requisição cancelada sem justificativa ou evento conciliado.',
     'Conferir cancelamento e manter o registro histórico.',req.id);
  }
  for(const po of purchases.filter(x=>x.purchaseRequestId)){
   if(po.cancelled===true&&!requests.some(x=>x.id===po.purchaseRequestId&&
       x.status==='emissao_cancelada'))
    push('REQUISICAO_CANCEL_COMPRA','critica','compras',po.id,
     'Compra cancelada sem requisição cancelada vinculada.',
     'Conferir o cancelamento original; não dar entrada no estoque.',po.purchaseRequestId);
   if(po.cancelled===true&&(po.received||
     ledger.some(m=>m.sourceId===po.id)||
     finance.some(t=>t.sourceId===po.id)))
    push('REQUISICAO_CANCEL_COM_MOVIMENTO','critica','compras',po.id,
     'Compra cancelada possui movimento de estoque ou título financeiro.',
     'Suspender recebimentos e conferir provas sem apagar registros.',po.id);
   if(!requests.some(x=>x.id===po.purchaseRequestId))
    push('REQUISICAO_COMPRA_ORFA','critica','compras',po.id,
     'Compra sem requisição de origem localizada.',
     'Conferir o registro original antes de receber.',po.purchaseRequestId);
  }
  // Devoluções: auditor independente e exclusivamente readonly.
  const returnRefs=new Set(),returnPurchases=new Set();
  for(const ret of purchaseReturns){
   const po=byId(purchases,ret.purchaseId),req=po&&byId(requests,po.purchaseRequestId),
    original=findFinance(ret.originalFinanceId),move=movementsBySource.get(ret.id)||[],
    credit=one(finance,ret.id),reference=normalize(ret.reference);
   if(!reference||returnRefs.has(reference)||returnPurchases.has(ret.purchaseId))
    push('DEVOLUCAO_REFERENCIA_DUPLA','critica','compras',ret.id,
     'Referência ou compra repetida em devoluções de material.',
     'Bloquear novos documentos e conferir histórico da compra.',ret.reference);
   returnRefs.add(reference);returnPurchases.add(ret.purchaseId);
   if(!po||!req||!po.received||po.cancelled||req.status!=='recebida'||
      po.returnId!==ret.id||req.returnId!==ret.id||
      ret.requestId!==req.id||ret.materialId!==po.materialId||
      ret.supplierId!==po.supplierId||ret.qtyGrams!==po.qtyGrams)
    push('DEVOLUCAO_ORIGEM','critica','compras',ret.id,
     'Devolução sem compra recebida e requisição original conciliadas.',
     'Consultar COM/REQ e preservar entrada e pagamento originais.',ret.purchaseId);
   if(move.length!==1||move[0].type!=='devolucao_compra'||
      move[0].id!==ret.stockMovementId||
      move[0].materialId!==ret.materialId||move[0].deltaGrams!==-ret.qtyGrams||
      move[0].commandId!==ret.commandId)
    push('DEVOLUCAO_ESTOQUE','critica','estoque',ret.id,
     'Devolução sem saída única e equivalente no estoque.',
     'Bloquear repetição e conferir MOV ligado ao protocolo.',ret.stockMovementId);
   if(!original||original.kind!=='pagar'||original.sourceId!==ret.purchaseId||
      original.amountCents!==ret.amountCents||
      credit.length!==1||credit[0].id!==ret.creditFinanceId||
      credit[0].kind!=='receber'||credit[0].amountCents!==ret.amountCents||
      credit[0].status!==(ret.status==='credito_recebido'?'pago':'aberto'))
    push('DEVOLUCAO_CREDITO','critica','hub',ret.id,
     'Crédito da devolução não corresponde ao título e valor originais.',
     'Conferir origem, crédito e status sem reescrever títulos.',ret.creditFinanceId);
   if(!ret.reason||!ret.returnedBy||!ret.reviewedBy||
      normalize(ret.returnedBy)===normalize(ret.reviewedBy)||
      normalize(ret.reviewedBy)===normalize(req?.requester)||
      !events.some(e=>e.commandId===ret.commandId&&e.type==='purchase.return.full'))
    push('DEVOLUCAO_CONFERENCIA','alta','compras',ret.id,
     'Devolução sem justificativa, dupla conferência ou evento.',
     'Exigir responsável independente e rever documento.',ret.commandId);
  }
  for(const m of ledger.filter(x=>x.type==='devolucao_compra'))
   if(!purchaseReturns.some(r=>r.id===m.sourceId&&r.stockMovementId===m.id))
    push('DEVOLUCAO_MOVIMENTO_ORFAO','critica','estoque',m.id,
     'Saída de devolução sem documento correspondente.',
     'Impedir baixas repetidas e conferir vínculo.',m.sourceId);
  for(const title of finance.filter(x=>x.relatedPurchaseId))
   if(!purchaseReturns.some(r=>r.id===title.sourceId&&r.creditFinanceId===title.id))
    push('DEVOLUCAO_TITULO_ORFAO','critica','hub',title.id,
     'Crédito de devolução sem documento de origem.',
     'Verificar compra e fornecedor antes de liquidar.',title.sourceId);
  // Recebimento e duplo lançamento de compras.
  for(const p of purchases.filter(x=>x.received)){
   const movements=(movementsBySource.get(p.id)||[]).filter(x=>x.type==='compra');
   const bills=one(finance,p.id,'pagar');
   const expected=Math.ceil(Number(p.qtyGrams)*Number(p.priceCentsKg)/1000);
   if(movements.length!==1||movements[0]?.deltaGrams!==p.qtyGrams)
    push('COMPRA_ESTOQUE','alta','compras',p.id,
     'Compra recebida sem entrada única e conciliada no estoque.',
     'Comparar pedido, recibo e movimento antes de qualquer nova entrada.',p.id);
   if(bills.length!==1||!Number.isSafeInteger(expected)||bills[0]?.amountCents!==expected)
    push('COMPRA_FINANCEIRO','alta','hub',p.id,
     'Conta do fornecedor ausente, repetida ou com valor divergente.',
     'Conferir título vinculado, sem recriar pagamento.',p.id);
  }
  for(const plan of cutPlans.filter(x=>x.status==='concluido')){
   const movements=movementsByPlan.get(plan.id)||[];
   if(movements.length!==1||movements[0]?.deltaGrams!==-(plan.usefulGrams+plan.scrapGrams))
    push('CORTE_ESTOQUE','alta','corte',plan.id,
     'Folha concluída não corresponde a uma única baixa de material.',
     'Conferir pesos útil/lixo e a movimentação; não repetir baixa.',plan.id);
  }
  // Corte multimatéria: a trilha garante exatamente uma baixa por insumo.
  const seenBomIds=new Set();
  for(const lot of bomCuts){
   const order=byId(orders,lot.orderId),
    moves=ledger.filter(m=>m.bomCutId===lot.id);
   const variants=order?.colorGrades||[];
   if(!lot.id||seenBomIds.has(lot.id)||!order||
      !variants.some(x=>x.color===lot.color)||!['P','M','G','GG'].includes(lot.size)||
      !Number.isSafeInteger(lot.qty)||lot.qty<1||
      !Array.isArray(lot.materials)||lot.materials.length<1||
      moves.length!==lot.materials?.length||!lot.reason||
      !events.some(e=>e.commandId===lot.commandId&&e.type==='cut.bom.execute')||
      !lot.signatureOne||!lot.signatureTwo||
      String(lot.cutterOne||'').toLocaleUpperCase('pt-BR')!==
       String(lot.signatureOne||'').toLocaleUpperCase('pt-BR')||
      String(lot.cutterTwo||'').toLocaleUpperCase('pt-BR')!==
       String(lot.signatureTwo||'').toLocaleUpperCase('pt-BR'))
    push('CORTE_BOM_ORIGEM','critica','corte',lot.id,
     'Lote BOM sem pedido, grade, evento ou dupla conferência válida.',
     'Conferir lote, corte físico e assinaturas antes de qualquer correção.',lot.orderId);
   seenBomIds.add(lot.id);
   const used=new Set();
   for(const line of lot.materials||[]){
    const transactions=moves.filter(m=>m.materialId===line.materialId);
    if(used.has(line.materialId)||!byId(materials,line.materialId)||
      !line.ruleId||!Number.isSafeInteger(line.gramsPerUnit)||line.gramsPerUnit<1||
      !Number.isSafeInteger(line.requiredGrams)||
      line.requiredGrams!==lot.qty*line.gramsPerUnit||
      !Number.isSafeInteger(line.scrapGrams)||line.scrapGrams<0||
      line.totalGrams!==line.requiredGrams+line.scrapGrams||
      !Number.isSafeInteger(line.priceCentsKg)||line.priceCentsKg<1||
      line.theoreticalCostCents!==Math.ceil(line.totalGrams*line.priceCentsKg/1000)||
      transactions.length!==1||transactions[0]?.type!=='corte-bom'||
      transactions[0]?.commandId!==lot.commandId||
      transactions[0]?.sourceId!==lot.orderId||
      transactions[0]?.deltaGrams!==-line.totalGrams||
      transactions[0]?.usefulGrams!==line.requiredGrams||
      transactions[0]?.scrapGrams!==line.scrapGrams)
     push('CORTE_BOM_ESTOQUE','critica','corte',lot.id,
      'Baixa ausente, duplicada ou divergente do consumo útil e do desperdício.',
      'Conferir cada movimento MOV com o lote BOM e saldo físico; não repetir baixa.',
      line.materialId);
    used.add(line.materialId);
   }
   if(lot.totalGrams!==(lot.materials||[]).reduce((n,x)=>n+Number(x.totalGrams||0),0)||
      lot.estimatedCostCents!==(lot.materials||[]).reduce((n,x)=>n+Number(x.theoreticalCostCents||0),0))
    push('CORTE_BOM_TOTAIS','critica','corte',lot.id,
     'Somatório de peso ou custo do lote diverge dos materiais.',
     'Conferir versões congeladas e movimentos, sem recalcular lotes antigos.',lot.id);
  }
  for(const order of orders){
   const items=bomCuts.filter(x=>x.orderId===order.id);
   if(!items.length)continue;
   for(const size of ['P','M','G','GG']){
    const done=items.filter(x=>x.size===size).reduce((n,x)=>n+Number(x.qty||0),0);
    if(done!==order.cut[size])
     push('CORTE_BOM_PEDIDO','critica','corte',order.id,
      'Quantidades da grade cortada divergem dos lotes BOM para '+size+'.',
      'Conferir lote por cor/tamanho e bloquear baixa duplicada.',size);
   }
  }
  for(const mov of ledger.filter(x=>x.type==='corte-bom')){
   if(!bomCuts.some(lot=>lot.id===mov.bomCutId&&lot.orderId===mov.sourceId))
    push('CORTE_BOM_MOVIMENTO_ORFAO','critica','estoque',mov.id,
     'Movimento sem lote BOM de origem ou pedido correspondente.',
     'Conferir documento e saldo antes de qualquer estorno.',mov.bomCutId);
  }
  // Acerto quitado é imutável. Correção deve ser um novo título.
  for(const a of settlements){
   const bills=one(finance,a.id,'pagar');
   if(bills.length!==1||bills[0]?.amountCents!==a.amountCents||
     !eqStatus(bills[0]?.status,a.status))
    push('ACERTO_FINANCEIRO','critica','acertos',a.id,
     'Acerto e título a pagar não conciliados (valor ou situação).',
     'Não efetuar nova baixa; comparar acerto, título original e histórico.',a.id);
  }
  // Auditoria por facção: detectar distribuição duplicada e retornos
  // contabilizados na facção errada sem alterar um único lançamento.
  if(Array.isArray(source.factionAssignments)){
   const assignPairs=new Set(),assignIds=new Set();
   for(const entry of assignments){
    const key=entry.orderId+'|'+entry.factionId,order=byId(orders,entry.orderId);
    if(!entry.id||assignIds.has(entry.id)||assignPairs.has(key)||!order||
       !byId(arr(source,'factions'),entry.factionId)||
       !Number.isSafeInteger(entry.qtySent)||entry.qtySent<1||
       !Number.isSafeInteger(entry.qtyReturned)||entry.qtyReturned<0||
       entry.qtyReturned>entry.qtySent)
     push('FACCAO_ENVIO_INVALIDO','critica','faccoes',entry.id,
      'Envio sem facção/pedido, com ID repetido ou quantidade inválida.',
      'Conferir ID do lote, pedido, facção e notas anteriores; não criar envio compensatório.',key);
    assignPairs.add(key);assignIds.add(entry.id);
    const returned=settlements.filter(x=>x.orderId===entry.orderId&&
     x.factionId===entry.factionId).reduce((n,x)=>n+Number(x.qty||0),0);
    if(returned!==entry.qtyReturned)
     push('FACCAO_RETORNO_DIVERGENTE','alta','faccoes',entry.id,
      'Quantidade devolvida pela facção não coincide com os acertos vinculados.',
      'Comparar retornos, devoluções e títulos dessa facção antes de qualquer baixa.',
      'acertos '+returned+' / saldo '+entry.qtyReturned);
    for(const a of settlementByAssignment.get(entry.id)||[]){
     if(a.orderId!==entry.orderId||a.factionId!==entry.factionId)
      push('FACCAO_ACERTO_TROCADO','critica','acertos',a.id,
       'Acerto aponta para um envio de outra facção ou pedido.',
       'Bloquear compensação automática; conferir IDs originais e auditoria.',
       entry.id);
    }
   }
   for(const o of orders){
    const rows=assignmentsByOrder.get(o.id)||[];
    if(rows.reduce((n,x)=>n+x.qtySent,0)!==o.allocated||
      rows.reduce((n,x)=>n+x.qtyReturned,0)!==o.returned)
     push('FACCAO_SALDO_PEDIDO','alta','faccoes',o.id,
      'Soma dos envios/retornos por facção não coincide com o pedido.',
      'Comparar grade cortada, envios e retornos de cada facção sem zerar saldo.',
      o.id);
   }
  }
  // Conciliar grade por cor e tamanho com pedido, corte, facção e acertos.
  // Somente leitura, inclusive quando algum registro malformado precisar ser diagnosticado.
  const gradeSizes=['P','M','G','GG'],colorOrders=orders.filter(o=>Array.isArray(o.colorGrades)&&o.colorGrades.length);
  const gradeInventory=[];
  for(const o of colorOrders){
   const rows=assignmentsByOrder.get(o.id)||[],names=new Set(),
    totals=Object.fromEntries(gradeSizes.map(sz=>[sz,0]));
   for(const c of o.colorGrades){
    const normalized=normalize(c.color);
    if(!normalized||names.has(normalized)||gradeSizes.some(sz=>
      !Number.isSafeInteger(c.grade?.[sz])||c.grade[sz]<0))
     push('GRADE_COR_CADASTRO','alta','faccoes',o.id,
      'Cor duplicada ou quantidades inválidas no cadastro do pedido.',
      'Conferir P/M/G/GG e nomes das cores antes de enviar peças.',c.color);
    names.add(normalized);
    for(const sz of gradeSizes)totals[sz]+=Number(c.grade?.[sz]||0);
   }
   if(gradeSizes.some(sz=>totals[sz]>o.grade[sz]||
       o.allocated>0&&totals[sz]!==o.grade[sz]))
    push('GRADE_TOTAL_PEDIDO','critica','pedidos',o.id,
     'Total por cor e tamanho não corresponde ao pedido já distribuído ou ultrapassa a grade.',
     'Reconciliar cadastro de cores com o pedido e corte, sem apagar movimentações.',o.id);
   const gradeBySize=Object.fromEntries(gradeSizes.map(sz=>[sz,0]));
   for(const row of rows){
    const lines=Array.isArray(row.gradeLines)?row.gradeLines:[];
    if(!Array.isArray(row.gradeLines))
     push('GRADE_ENVIO_SEM_DETALHE','alta','faccoes',row.id,
      'Envio do pedido classificado está sem grade por cor e tamanho.',
      'Conferir a origem da remessa e não preencher automaticamente com cor inventada.',o.id);
    let sent=0,returned=0;
    const rowKeys=new Set();
    for(const l of lines){
     const key=normalize(l.color)+'|'+l.size;
     const config=o.colorGrades.find(x=>normalize(x.color)===normalize(l.color));
     if(rowKeys.has(key)||!config||!gradeSizes.includes(l.size)||
       !Number.isSafeInteger(l.sent)||l.sent<1||!Number.isSafeInteger(l.returned)||
       l.returned<0||l.returned>l.sent)
      push('GRADE_LINHA_INVALIDA','critica','faccoes',row.id,
       'Cor/tamanho duplicado, desconhecido ou com quantidade impossível.',
       'Conferir o envio físico e as grades antes de qualquer retorno.',key);
     rowKeys.add(key);
     sent+=Number(l.sent||0);returned+=Number(l.returned||0);
     if(gradeSizes.includes(l.size))gradeBySize[l.size]+=Number(l.sent||0);
     gradeInventory.push({orderId:o.id,assignmentId:row.id,factionId:row.factionId,
      factionName:String(byId(arr(source,'factions'),row.factionId)?.name||row.factionId),
      color:String(l.color||''),size:String(l.size||''),
      sent:l.sent,returned:l.returned,open:l.sent-l.returned,
      settlementIds:(settlementByAssignment.get(row.id)||[])
       .filter(x=>x.color===l.color&&x.size===l.size).map(x=>x.id)});
    }
    if(sent!==row.qtySent||returned!==row.qtyReturned)
     push('GRADE_SALDO_ENVIO','critica','faccoes',row.id,
      'Detalhe por cor/tamanho não coincide com as quantidades gerais do envio.',
      'Comparar grades, peças retornadas e títulos, sem reprocessar baixa.',o.id);
   }
   for(const sz of gradeSizes){
    if(gradeBySize[sz]>o.cut[sz])
     push('GRADE_EXCEDE_CORTE','critica','corte',o.id,
      'Peças classificadas enviadas ultrapassam o corte registrado em '+sz+'.',
      'Conferir folhas e distribuição por tamanho antes de movimentar peças.',sz);
   }
   for(const c of o.colorGrades)for(const sz of gradeSizes){
    const sent=gradeInventory.filter(g=>g.orderId===o.id&&
     normalize(g.color)===normalize(c.color)&&g.size===sz)
     .reduce((n,g)=>n+Number(g.sent||0),0);
    if(sent>c.grade[sz])
     push('GRADE_EXCEDE_COR','critica','faccoes',o.id,
      'Distribuição ultrapassa a quantidade registrada para '+c.color+' '+sz+'.',
      'Reconciliar facções por cor/tamanho sem fazer envios duplicados.',sz);
   }
   for(const a of settlements.filter(x=>x.orderId===o.id)){
    if(!a.gradeTracked||!o.colorGrades.some(x=>normalize(x.color)===normalize(a.color))||
      !gradeSizes.includes(a.size))
     push('GRADE_ACERTO_INDEFINIDO','critica','acertos',a.id,
      'Acerto de pedido classificado está sem vínculo seguro de cor/tamanho.',
      'Conferir retorno, envio e título antes de alterar pagamento.',o.id);
   }
  }
  // Confere fichas de planejamento sem executar compra ou movimentar materiais.
  const colors=arr(source,'colorCatalog'),recipeRules=arr(source,'materialRecipeRules'),
   planLines=arr(source,'materialPlanLines'),productCatalog=arr(source,'products'),
   validSizes=new Set(['P','M','G','GG']),seenColors=new Set(),seenRules=new Set(),
   seenPlanLines=new Set(),knownColors=new Set(colors.map(x=>normalize(x.name)));
  for(const c of colors){
   const normalized=normalize(c.name);
   if(!normalized||seenColors.has(normalized))
    push('PALETA_COR_DUPLICADA','alta','produtos',c.id,
     'Cor cadastrada sem nome ou repetida na paleta central.',
     'Unificar a opção exibida sem alterar cores já usadas em pedidos.',c.name);
   seenColors.add(normalized);
  }
  for(const r of recipeRules){
   const k=[r.productId,r.materialId,normalize(r.color),r.size].join('|');
   if(r.active&&seenRules.has(k))
    push('RECEITA_DUPLICADA','alta','produtos',r.id,
     'Há duas regras de consumo ativas para o mesmo modelo, material, cor e tamanho.',
     'Comparar versões e desativar somente a regra incorreta mediante conferência.',k);
   if(r.active)seenRules.add(k);
   if(!byId(productCatalog,r.productId)||!byId(materials,r.materialId)||
     !(r.color==='*'||knownColors.has(normalize(r.color)))||
     !(r.size==='*'||validSizes.has(r.size))||
     !Number.isSafeInteger(r.gramsPerUnit)||r.gramsPerUnit<1||r.gramsPerUnit>5000||
     !r.reason||!events.some(e=>e.commandId===r.createdCommandId&&e.type==='material.recipe.set'))
    push('RECEITA_INCONSISTENTE','critica','produtos',r.id,
     'Regra de materiais sem origem, variação, produto ou consumo verificável.',
     'Bloquear a compra baseada na simulação e conferir a receita do modelo.',r.id);
  }
  for(const p of planLines){
   const k=[p.productId,normalize(p.color),p.size].join('|');
   if(p.active&&seenPlanLines.has(k))
    push('PLANO_DUPLICADO','alta','compras',p.id,
     'Modelo, cor e tamanho aparecem em duas linhas ativas; o consumo pode duplicar.',
     'Conferir linhas antes de interpretar a quantidade total.',k);
   if(p.active)seenPlanLines.add(k);
   if(!byId(productCatalog,p.productId)||!knownColors.has(normalize(p.color))||
     !validSizes.has(p.size)||!Number.isSafeInteger(p.qty)||p.qty<1||p.qty>10000||
     !events.some(e=>e.commandId===p.createdCommandId&&['materials.plan.add','materials.plan.grade.add'].includes(e.type))||
     (!p.active&&!events.some(e=>e.commandId===p.cancelCommandId&&e.type==='materials.plan.archive')))
    push('PLANO_INCONSISTENTE','critica','compras',p.id,
     'Cenário de produção sem modelo, cor, quantidade ou histórico conciliado.',
     'Conferir documento original e corrigir a linha sem alterar estoque real.',p.id);
  }
  // Rastros de transferência de saldo pendente: conferir snapshots antes/depois.
  const seenPartialMoves=new Set();
  for(const move of partialTransfers){
   const from=byId(assignments,move.fromAssignmentId);
   const to=byId(assignments,move.toAssignmentId);
   const event=events.find(x=>x.commandId===move.commandId&&['faction.multi.transfer','faction.grade.transfer'].includes(x.type));
   const valid=!!(move.id&&!seenPartialMoves.has(move.id)&&
    from&&to&&event&&from.orderId===move.orderId&&
    to.orderId===move.orderId&&from.id!==to.id&&
    from.factionId===move.fromFactionId&&to.factionId===move.toFactionId&&
    from.factionId!==to.factionId&&Number.isSafeInteger(move.qty)&&move.qty>0&&
    Number.isSafeInteger(move.fromBefore)&&Number.isSafeInteger(move.fromAfter)&&
    Number.isSafeInteger(move.toBefore)&&Number.isSafeInteger(move.toAfter)&&
    move.fromBefore-move.fromAfter===move.qty&&
    move.toAfter-move.toBefore===move.qty&&move.fromAfter>=1&&move.toBefore>=0&&
    typeof move.reason==='string'&&move.reason.trim());
   if(!valid)push('FACCAO_TRANSFERENCIA_DIVERGENTE','critica','faccoes',move.id,
    'Transferência parcial sem origem, destino ou histórico de quantidades conciliados.',
    'Conferir IDs, comprovante da remessa e comando; não repetir transferência automaticamente.',
    move.orderId);
   if(move.id)seenPartialMoves.add(move.id);
  }
  const batchRefs=new Set(),batchTitleIds=new Set();
  for(const batch of batches){
   const reference=normalize(batch.reference);
   if(!reference||batchRefs.has(reference))
    push('LOTE_REFERENCIA','critica','hub',batch.id,
     'Referência do fechamento em lote inválida ou duplicada.',
     'Localizar o lote anterior pelo ID antes de repetir qualquer baixa.',batch.reference);
   batchRefs.add(reference);
   const items=Array.isArray(batch.items)?batch.items:[];
   if(batch.scope==='faccao'&&(
      !byId(arr(source,'factions'),batch.factionId)||
      !batch.factionNameSnapshot||
      items.some(i=>i.factionId!==batch.factionId)||
      !events.some(e=>e.commandId===batch.commandId&&e.type==='finance.faction.close')))
    push('LOTE_FACCAO_DIVERGENTE','critica','hub',batch.id,
     'Fechamento por pessoa com título de outra facção ou origem não comprovada.',
     'Conferir acertos e IDs sem repetir pagamento.',batch.factionId);
   let total=0;
   for(const item of items){
    const bill=findFinance(item.financeId);
    const src=item.sourceType==='acerto'?byId(settlements,item.sourceId):
     item.sourceType==='compensacao'?byId(comps,item.sourceId):null;
    if(batchTitleIds.has(item.financeId)||!bill||!src||bill.sourceId!==item.sourceId||
      bill.status!=='pago'||src.status!=='pago'||bill.kind!=='pagar'||
      bill.amountCents!==item.amountCents||item.factionId!==src.factionId||
      (item.sourceType==='acerto'&&src.amountCents!==item.amountCents)||
      (item.sourceType==='compensacao'&&src.deltaCents!==item.amountCents))
     push('LOTE_VINCULO','critica','hub',batch.id,
      'Item de lote duplicado ou sem acerto, compensação e título conciliados.',
      'Não repetir a quitação; conferir cada origem e o título antes de qualquer correção.',
      item.financeId);
    batchTitleIds.add(item.financeId);
    total+=Number(item.amountCents||0);
   }
   if(items.length<2||batch.count!==items.length||batch.totalCents!==total||
      !Number.isSafeInteger(total)||total<=0||batch.status!=='pago')
    push('LOTE_TOTAL','alta','hub',batch.id,
     'Valor, situação ou quantidade do lote incompatíveis com seus itens.',
     'Conferir os títulos originais e os valores detalhados sem apagar lançamentos.',
     batch.totalCents);
  }
  // Tarifas negociadas: os retornos guardam a versão original da negociação.
  const agreementCommands=new Map(),agreementEvents=new Set();
  for(const row of assignments){
   const rates=Array.isArray(row.rateAgreementHistory)?row.rateAgreementHistory:[];
   for(const rate of rates){
    const event=events.find(e=>e.commandId===rate.commandId),
     valid=rate.mode==='negociado'?
      event?.type==='faction.assignment.rate.set'&&Number.isSafeInteger(rate.gross)&&
       Number.isSafeInteger(rate.discount)&&rate.gross>rate.discount&&rate.discount>=0&&
       Number.isSafeInteger(rate.pendingQty)&&rate.pendingQty>0&&
       !!byId(arr(source,'products'),rate.productId):
      rate.mode==='reset'&&event?.type==='faction.reassign';
    if(!valid||!rate.reason||!byId(arr(source,'factions'),rate.factionId)||
       agreementEvents.has(rate.commandId))
     push('TARIFA_ENVIO_HISTORICO','critica','faccoes',row.id,
      'Acordo de mão de obra sem evento, preço ou facção válida.',
      'Conferir negociação antes de aceitar retorno.',rate.commandId);
    agreementEvents.add(rate.commandId);
    if(rate.mode==='negociado')agreementCommands.set(rate.commandId,{row,rate});
   }
   if(rates.length&&rates.at(-1).factionId!==row.factionId)
    push('TARIFA_ENVIO_DESTINO','critica','faccoes',row.id,
     'Tarifa pertence à facção anterior.','Conferir transferência e negociação.',row.factionId);
  }
  for(const x of settlements.filter(x=>x.rateAgreementCommandId)){
   const linked=agreementCommands.get(x.rateAgreementCommandId),
    original=x.rateHistory?.[0]?.before||x;
   if(!linked||linked.row.id!==x.assignmentId||linked.rate.factionId!==x.factionId||
      linked.rate.productId!==x.productId||linked.rate.gross!==(original.listUnitCents??original.unitCents)||
      linked.rate.discount!==(original.travetaCents||0))
    push('TARIFA_ENVIO_RETORNO','critica','acertos',x.id,
     'Preço efetivo do retorno diverge do acordo registrado.',
     'Verificar a tarifa original, não o cadastro atual.',x.rateAgreementCommandId);
  }
  for(const e of events.filter(x=>x.type==='faction.assignment.rate.set'))
   if(!agreementEvents.has(e.commandId))
    push('TARIFA_ENVIO_SEM_HISTORICO','critica','faccoes',e.commandId,
     'Negociação sem histórico correspondente.','Recuperar evidência sem inventar preço.',e.description);
  // Conferência independente de correções em acertos, sem alterar dados.
  const revisionCommands=new Set();
  const validRate=x=>!!x&&Number.isSafeInteger(x.qty)&&x.qty>0&&
   Number.isSafeInteger(x.listUnitCents)&&x.listUnitCents>0&&
   Number.isSafeInteger(x.travetaCents)&&x.travetaCents>=0&&
   Number.isSafeInteger(x.unitCents)&&x.unitCents>0&&
   x.listUnitCents-x.travetaCents===x.unitCents&&
   Number.isSafeInteger(x.adjustmentCents)&&Number.isSafeInteger(x.amountCents)&&
   x.amountCents>0&&x.qty*x.unitCents+x.adjustmentCents===x.amountCents;
  for(const x of settlements){
   const history=Array.isArray(x.rateHistory)?x.rateHistory:[];
   let prior=null;
   for(const h of history){
    const b=h.before,a=h.after,bill=one(finance,x.id,'pagar');
    if(!h.reason||!h.fromFactionName||!h.toFactionName||
       revisionCommands.has(h.commandId)||
       !events.some(e=>e.commandId===h.commandId&&e.type==='settlement.revise')||
       bill.length!==1||bill[0].id!==h.financeId||!validRate(b)||!validRate(a)||
       !byId(arr(source,'factions'),b?.factionId)||!byId(arr(source,'factions'),a?.factionId)||
       b.qty!==a.qty||b.adjustmentCents!==a.adjustmentCents||
       (b.factionId!==a.factionId&&(x.kind!=='avulso'||x.orderId||x.assignmentId))||
       (prior&&(prior.factionId!==b.factionId||prior.listUnitCents!==b.listUnitCents||
        prior.travetaCents!==b.travetaCents)))
     push('ACERTO_REVISAO_DIVERGENTE','critica','acertos',x.id,
      'Correção de facção/mão de obra sem histórico, cálculo ou título conciliado.',
      'Conferir eventos e valores anteriores; não repetir pagamento.',h.commandId);
    revisionCommands.add(h.commandId);prior=a;
   }
   if(prior&&(prior.factionId!==x.factionId||prior.listUnitCents!==x.listUnitCents||
      prior.travetaCents!==x.travetaCents||prior.unitCents!==x.unitCents||
      x.amountCents!==x.qty*x.unitCents+(x.adjustmentCents||0)))
    push('ACERTO_REVISAO_ATUAL','critica','acertos',x.id,
     'Preço ou facção atual sem correspondência com a última correção.',
     'Consultar a revisão e título original antes de fechar o acerto.',x.id);
  }
  for(const e of events.filter(x=>x.type==='settlement.revise'))
   if(!revisionCommands.has(e.commandId))
    push('ACERTO_REVISAO_SEM_HISTORICO','critica','acertos',e.commandId,
     'Evento de correção sem registro correspondente.',
     'Recuperar evidência original; não inventar valor ou destinatário.',e.description);
  const refs=new Set();
  for(const c of comps){
   const original=byId(settlements,c.settlementId),
    originalBill=byId(finance,c.originalFinanceId),
    bills=one(finance,c.id),
    key=c.settlementId+'|'+normalize(c.reference);
   if(refs.has(key)||!normalize(c.reference))
    push('COMP_REFERENCIA','critica','acertos',c.id,
     'Referência de compensação vazia ou duplicada no mesmo acerto.',
     'Preservar o pagamento original e reconciliar os IDs antes de novo lançamento.',key);
   refs.add(key);
   if(!original||original.status!=='pago'||originalBill?.sourceId!==c.settlementId||
       originalBill?.status!=='pago'||originalBill?.amountCents!==c.originalAmountCents||
       original?.amountCents!==c.originalAmountCents)
    push('COMP_ORIGINAL','critica','acertos',c.id,
     'Compensação sem prova consistente do pagamento original imutável.',
     'Localizar o acerto e seu título antigo; não corrigir valores retroativamente.',c.settlementId);
   if(bills.length!==1||bills[0]?.kind!==(c.deltaCents>0?'pagar':'receber')||
      bills[0]?.amountCents!==Math.abs(c.deltaCents)||bills[0]?.status!==c.status)
    push('COMP_TITULO','critica','hub',c.id,
     'Compensação sem título novo único, sinal ou situação conciliados.',
     'Conferir o título separado e sua situação; evitar quitação repetida.',c.id);
  }
  // Comprovantes: conferir vínculo com quitação, versões e presença dos bytes.
  // O núcleo também valida assinatura, codificação, checksum e limites dos PDFs.
  const paymentReceipts=arr(source,'paymentReceipts'),receiptIds=new Set(),
   receiptCommands=new Set(),receiptContents=new Set(),currentReceipts=new Map();
  for(const r of paymentReceipts){
   const batch=byId(batches,r.targetId),bill=byId(finance,r.targetId),
    prev=currentReceipts.get(r.targetId);
   const wanted=batch?batch.items?.map(i=>i.financeId).slice().sort():[r.targetId],
    amount=batch?batch.totalCents:bill?.amountCents;
   if(!r.id||receiptIds.has(r.id)||receiptCommands.has(r.commandId)||
      !r.reason||r.fictitious!==true||!r.fileName||!Number.isSafeInteger(r.size)||r.size<=0||
      typeof r.contentBase64!=='string'||!r.contentBase64||
      receiptContents.has(r.contentBase64)||
      r.version!==(prev?.version||0)+1||r.previousId!==(prev?.id||null)||
      !events.some(e=>e.commandId===r.commandId&&e.type==='finance.receipt.attach'))
    push('COMPROVANTE_HISTORICO','critica','hub',r.id,
     'Comprovante com arquivo, versão, conteúdo ou evento ausente/duplicado.',
     'Conferir histórico; não duplicar pagamento.',r.targetId);
   if((batch?batch.status!=='pago'||r.kind!=='lote':
       !bill||bill.status!=='pago'||bill.kind!=='pagar'||r.kind!=='titulo'||
       batches.some(b=>b.items?.some(i=>i.financeId===r.targetId)))||
      r.amountCents!==amount||JSON.stringify(r.financeIds)!==JSON.stringify(wanted))
    push('COMPROVANTE_VINCULO','critica','hub',r.id,
     'PDF associado a título ou lote diferente da quitação original.',
     'Conferir documento e referência antes de utilizar.',r.targetId);
   receiptIds.add(r.id);receiptCommands.add(r.commandId);receiptContents.add(r.contentBase64);
   currentReceipts.set(r.targetId,r);
  }
  for(const e of events.filter(e=>e.type==='finance.receipt.attach'))
   if(!receiptCommands.has(e.commandId))
    push('COMPROVANTE_AUSENTE','critica','hub',e.commandId,
     'Evento de anexo sem comprovante correspondente.','Recuperar evidência sem repetir pagamento.',e.description);
  const sourceIds=new Set([...orders,...purchases,...purchaseReturns,...settlements,...comps,...arr(source,'payrollPeriods')].map(x=>x.id));
  for(const bill of finance){
   if(bill.sourceId!=null&&!sourceIds.has(bill.sourceId))
    push('TITULO_ORFAO','alta','hub',bill.id,
     'Título financeiro aponta para um registro inexistente.',
     'Rastrear origem e revisão; não apagar nem recriar o título.',bill.sourceId);
   if(!cents(bill.amountCents)||bill.amountCents===0)
    push('TITULO_VALOR','critica','hub',bill.id,
     'Título financeiro com valor inválido ou zerado.',
     'Bloquear confirmação e conferir origem antes de corrigir.',bill.amountCents);
  }
  for(const mat of materials){
   if(!Number.isSafeInteger(mat.stockGrams)||mat.stockGrams<0)
    push('ESTOQUE_INVALIDO','critica','estoque',mat.id,
     'Estoque negativo ou não inteiro.',
     'Conferir documentos de entrada/saída, sem zerar o material.',mat.stockGrams);
  }
  const openErrors=errors.filter(x=>x.status==='aberto');
  const grouped=new Map();
  for(const x of errors){
   const key=normalize(x.message);
   if(key)grouped.set(key,(grouped.get(key)||0)+1);
  }
  for(const x of openErrors){
   const recurrence=grouped.get(normalize(x.message))||1;
   push('OCORRENCIA_ABERTA',recurrence>1?'alta':'media','central',x.id,
    recurrence>1?'Ocorrência recorrente registrada '+recurrence+' vezes.':'Ocorrência ainda não encerrada.',
    'Investigar origem, registrar evidência e testar regressão antes de encerrar.',
    x.message);
  }
  findings.sort((a,b)=>(severityOrder[a.severity]-severityOrder[b.severity])||
   a.code.localeCompare(b.code)||a.recordId.localeCompare(b.recordId));
  const history=events.slice().reverse().map(ev=>({
   commandId:String(ev.commandId||''),revision:Number(ev.revision)||0,
   module:eventArea(ev.type),type:String(ev.type||''),actor:String(ev.actor||''),
   description:String(ev.description||'')
  }));
  const activity=new Map();
  for(const h of history)activity.set(h.module,(activity.get(h.module)||0)+1);
  const eventTypes=new Map();
  for(const h of history)eventTypes.set(h.type,(eventTypes.get(h.type)||0)+1);
  const recommendationCounts=new Map();
  for(const f of findings)recommendationCounts.set(f.code,(recommendationCounts.get(f.code)||0)+1);
  const recommendations=[],seenRecommendations=new Set();
  for(const f of findings){
   const key=f.code+'|'+f.module;
   if(seenRecommendations.has(key))continue;
   seenRecommendations.add(key);
   recommendations.push({code:f.code,priority:f.severity,module:f.module,
    action:f.action,why:f.message,
    evidence:recommendationCounts.get(f.code)+' ocorrência(s) · '+f.recordId,
    mode:'orientacao_sem_execucao'});
  }
  const purchaseRequestHistory=requests.map(r=>({
   id:r.id,materialId:r.materialId,
   materialName:String(byId(materials,r.materialId)?.name||r.materialId),
   qtyGrams:r.qtyGrams,requiredGrams:r.requiredGrams,
   availableGrams:r.availableGrams,estimatedCents:r.estimatedCents,
   status:r.status,requester:r.requester,approver:r.approver||null,
   purchaseId:r.purchaseId||null,
   cancelIssueReference:r.cancelIssueReference||null,
   cancelIssueCommandId:r.cancelIssueCommandId||null,
   cancelledBy:r.cancelledBy||null,cancelReviewedBy:r.cancelReviewedBy||null,
   createdCommandId:r.createdCommandId,
   approvedCommandId:r.approvedCommandId,
   issuedCommandId:r.issuedCommandId,
   receiptCommandId:r.receiptCommandId,
   cancelCommandId:r.cancelCommandId
  }));
  const bomCutHistory=bomCuts.map(c=>({
   id:c.id,orderId:c.orderId,color:c.color,size:c.size,qty:c.qty,
   cutterOne:c.cutterOne,cutterTwo:c.cutterTwo,spreader:c.spreader,
   commandId:c.commandId,totalGrams:c.totalGrams,
   estimatedCostCents:c.estimatedCostCents,
   materials:(c.materials||[]).map(m=>({...m,
    materialName:String(byId(materials,m.materialId)?.name||m.materialId)}))
  }));
  const factionDispatches=assignments.map(a=>{
   const order=byId(orders,a.orderId),faction=byId(arr(source,'factions'),a.factionId);
   const product=byId(arr(source,'products'),order?.productId);
   return {id:a.id,orderId:a.orderId,factionId:a.factionId,
    factionName:String(faction?.name||a.factionId),
    productName:String(product?.name||'—'),
    qtySent:a.qtySent,qtyReturned:a.qtyReturned,qtyOpen:a.qtySent-a.qtyReturned,
    settlementIds:settlements.filter(x=>x.orderId===a.orderId&&
     x.factionId===a.factionId).map(x=>x.id),
    origin:String(a.origin||'legado-local')};
  }).sort((a,b)=>a.orderId.localeCompare(b.orderId)||a.factionName.localeCompare(b.factionName));
  const factionTransferHistory=partialTransfers.map(m=>({
   id:m.id,orderId:m.orderId,fromAssignmentId:m.fromAssignmentId,
   toAssignmentId:m.toAssignmentId,
   fromFactionId:m.fromFactionId,toFactionId:m.toFactionId,
   fromName:String(byId(arr(source,'factions'),m.fromFactionId)?.name||m.fromFactionId),
   toName:String(byId(arr(source,'factions'),m.toFactionId)?.name||m.toFactionId),
   qty:m.qty,fromBefore:m.fromBefore,fromAfter:m.fromAfter,
   toBefore:m.toBefore,toAfter:m.toAfter,
   commandId:m.commandId,reason:String(m.reason||'')
  }));
  const colorGradeSummary=colorOrders.map(o=>{
   const byColor=o.colorGrades.map(g=>({color:g.color,
    sizes:Object.fromEntries(gradeSizes.map(sz=>[sz,g.grade[sz]]))}));
   const pending=Object.fromEntries(gradeSizes.map(sz=>[sz,
    o.grade[sz]-o.colorGrades.reduce((n,c)=>n+Number(c.grade?.[sz]||0),0)]));
   return {orderId:o.id,productId:o.productId,byColor,pending,
    ready:gradeSizes.every(sz=>pending[sz]===0),allocated:o.allocated,
    returned:o.returned};
  });
  const distributedOrders=orders.filter(o=>(assignmentsByOrder.get(o.id)||[]).length>1).length;
  const openFactionPieces=assignments.reduce((n,a)=>n+a.qtySent-a.qtyReturned,0);
  const pendingReturn=orders.filter(o=>o.allocated>o.returned).length,
   pendingShipment=orders.filter(o=>o.separated>o.shipped).length,
   unpaid=finance.filter(x=>x.status==='aberto').length;
  for(const [code,module,count,why,action] of [
   ['PRODUCAO_PENDENTE','faccoes',pendingReturn,'Pedidos enviados com retorno pendente',
    'Conferir facções responsáveis e o histórico antes de cobrar a entrega.'],
   ['EXPEDICAO_PENDENTE','separacao',pendingShipment,'Pedidos separados sem expedição completa',
    'Conferir saldo físico e grade antes do despacho.'],
   ['FINANCEIRO_PENDENTE','hub',unpaid,'Títulos em aberto no Hub fictício',
    'Priorizar conferência e conciliação por origem; não registrar baixa automática.']
  ]){
   if(count>0)recommendations.push({code,priority:'informativa',module,
    action,why,evidence:count+' registro(s)',mode:'orientacao_sem_execucao'});
  }
  // Relatórios analíticos sem confundir valor previsto com recebimento efetivo.
  const modelSummary=arr(source,'products').map(product=>{
   const associated=orderByProduct.get(product.id)||[];
   const total=fn=>associated.reduce((n,o)=>n+fn(o),0);
   const grade=o=>Object.values(o.grade||{}).reduce((n,v)=>n+Number(v||0),0);
   const cut=o=>Object.values(o.cut||{}).reduce((n,v)=>n+Number(v||0),0);
   return {productId:product.id,sku:String(product.sku||''),name:String(product.name||''),
    orders:associated.length,ordered:total(grade),cut:total(cut),
    returned:total(o=>Number(o.returned||0)),shipped:total(o=>Number(o.shipped||0)),
    plannedReceivablesCents:total(o=>grade(o)*Number(o.priceCents||0))};
  }).sort((a,b)=>b.ordered-a.ordered||a.name.localeCompare(b.name));
  const factionSummary=arr(source,'factions').map(faction=>{
   const ss=settlementByFaction.get(faction.id)||[];
   const fs=compensationByFaction.get(faction.id)||[];
   return {factionId:faction.id,name:String(faction.name||''),
    settlements:ss.length,pieces:ss.reduce((n,x)=>n+Number(x.qty||0),0),
    totalSettlementsCents:ss.reduce((n,x)=>n+Number(x.amountCents||0),0),
    paidSettlementsCents:ss.filter(x=>x.status==='pago')
     .reduce((n,x)=>n+Number(x.amountCents||0),0),
    openSettlementsCents:ss.filter(x=>x.status==='aberto')
     .reduce((n,x)=>n+Number(x.amountCents||0),0),
    compensationNetCents:fs.reduce((n,x)=>n+Number(x.deltaCents||0),0)};
  }).sort((a,b)=>b.totalSettlementsCents-a.totalSettlementsCents||a.name.localeCompare(b.name));
  // Linha do tempo do acerto com versões anteriores de valor e devoluções preservadas.
  const settlementHistory=settlements.flatMap(x=>[
   ...(Array.isArray(x.rateHistory)?x.rateHistory:[]).map(h=>({
    settlementId:x.id,event:'correcao_faccao_mao_obra',commandId:String(h.commandId||''),
    beforeCents:h.before?.amountCents||0,afterCents:h.after?.amountCents||0,
    reason:String(h.fromFactionName||'')+' → '+String(h.toFactionName||'')+
     ' · bruto '+String(h.before?.listUnitCents)+' → '+String(h.after?.listUnitCents)+
     ' centavos · '+String(h.reason||'')})),
   ...(Array.isArray(x.history)?x.history:[]).map(h=>({
    settlementId:x.id,event:'alteracao_valor',commandId:String(h.commandId||''),
    beforeCents:h.beforeCents,afterCents:h.afterCents,reason:String(h.reason||'')})),
   ...(Array.isArray(x.returns)?x.returns:[]).map(h=>({
    settlementId:x.id,event:'devolucao_pecas',commandId:String(h.commandId||''),
    beforeCents:h.beforeCents,afterCents:h.afterCents,reason:String(h.reason||'')})),
   ...(compensationBySettlement.get(x.id)||[]).map(c=>({
    settlementId:x.id,event:'compensacao_separada',commandId:String(c.commandId||''),
    beforeCents:c.originalAmountCents,afterCents:c.originalAmountCents,
    reason:String(c.reference||'')+' · '+String(c.reason||'')+
     ' · diferença '+String(c.deltaCents)+' centavos'}))
  ]);
  const bySeverity={critica:0,alta:0,media:0,informativa:0};
  for(const f of findings)bySeverity[f.severity]++;
  const summary={
   findings:findings.length,bySeverity,events:events.length,openIncidents:openErrors.length,
   orders:orders.length,settlements:settlements.length,compensations:comps.length,
   titles:finance.length,openTitles:unpaid,stockMovements:ledger.length,
   paymentBatches:batches.length,batchedPayablesCents:batches.reduce((n,b)=>n+Number(b.totalCents||0),0),
   factionClosures:batches.filter(b=>b.scope==='faccao').length,
   factionClosureCents:batches.filter(b=>b.scope==='faccao').reduce((n,b)=>n+Number(b.totalCents||0),0),
   negotiatedAssignmentRates:agreementCommands.size,
   settlementCorrections:revisionCommands.size,
   paymentReceipts:paymentReceipts.length,paymentsWithReceipt:currentReceipts.size,
   factionDispatches:assignments.length,distributedOrders,openFactionPieces,
   ordersWithColorGrade:colorOrders.length,
   gradeItems:gradeInventory.length,
   gradePiecesOpen:gradeInventory.reduce((n,x)=>n+Number(x.open||0),0),
   partialFactionTransfers:partialTransfers.length,
   piecesTransferred:partialTransfers.reduce((n,m)=>n+Number(m.qty||0),0),
   purchaseRequests:requests.length,
   pendingPurchaseRequests:requests.filter(x=>['rascunho','aprovada','emitida'].includes(x.status)).length,
   receivedPurchaseRequests:requests.filter(x=>x.status==='recebida').length,
   cancelledIssuedPurchases:requests.filter(x=>x.status==='emissao_cancelada').length,
   purchaseReturns:purchaseReturns.length,
   returnGrams:purchaseReturns.reduce((sum,x)=>sum+Number(x.qtyGrams||0),0),
   returnCreditsOpenCents:purchaseReturns.filter(x=>x.status==='credito_pendente').reduce((sum,x)=>sum+Number(x.amountCents||0),0),
   bomCuts:bomCuts.length,
   bomUsefulGrams:bomCuts.reduce((n,c)=>n+(c.materials||[]).reduce((a,m)=>a+Number(m.requiredGrams||0),0),0),
   bomScrapGrams:bomCuts.reduce((n,c)=>n+(c.materials||[]).reduce((a,m)=>a+Number(m.scrapGrams||0),0),0),
   centralColors:colors.length,materialRecipeRules:recipeRules.length,
   activePlanLines:planLines.filter(x=>x.active).length,
   planPieces:planLines.filter(x=>x.active).reduce((n,x)=>n+Number(x.qty||0),0),
   lastRevision:source.revision,historyExported:history.length,
   coverage:'regras locais parciais; nenhuma garantia de ausência de bugs'
  };
  const moduleActivity=[...activity].map(([module,count])=>({module,count}))
   .sort((a,b)=>b.count-a.count||a.module.localeCompare(b.module));
  const repeatedOperations=[...eventTypes].map(([type,count])=>({type,count}))
   .sort((a,b)=>b.count-a.count||a.type.localeCompare(b.type)).slice(0,12);
  return {schema:'hlgb-lab-observabilidade-v2',version:'2.0.0',productionApproval:false,
   status:findings.some(x=>x.severity==='critica')?'investigar_critico':
    findings.length?'investigar':'sem_alertas_nas_regras_cobertas',
   summary,findings,recommendations,history,moduleActivity,repeatedOperations,
   modelSummary,factionSummary,settlementHistory,factionDispatches,factionTransferHistory,
   colorGradeSummary,gradeInventory,bomCutHistory,purchaseRequestHistory,
   paymentReceiptHistory:paymentReceipts.map(({contentBase64,...r})=>({...r,current:currentReceipts.get(r.targetId)?.id===r.id})),
   paymentBatchHistory:batches.map(b=>({id:b.id,reference:b.reference,
    scope:b.scope||'manual',factionId:b.factionId||null,
    factionNameSnapshot:b.factionNameSnapshot||null,
    reason:b.reason,count:b.count,totalCents:b.totalCents,status:b.status,
    items:(b.items||[]).map(i=>({...i}))}))};
 }
 return Object.freeze({id:'observabilidade',version:'2.0.0',analyze});
});

;
/* modulos/pesquisa-global-v1.js */
/* Pesquisa global HLGB — índice local, somente leitura, sem conteúdo de anexos. */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGBLabGlobalSearchV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
 const arr=(s,k)=>Array.isArray(s[k])?s[k]:[];
 const sum=x=>Object.values(x||{}).reduce((n,v)=>n+(Number.isSafeInteger(v)?v:0),0);
 const money=n=>Number.isSafeInteger(n)?(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—';
 const labels={produtos:'Produtos',pedidos:'Pedidos',corte:'Cortes',faccoes:'Facções',acertos:'Acertos',hub:'Financeiro',compras:'Compras',estoque:'Estoque',cadastros:'Cadastros',folha:'Folha',impressora3d:'Impressora 3D',central:'Ocorrências',nucleo:'Histórico'};
 function build(s){
  const rows=[],keys=new Set();
  const maps={};for(const k of ['products','orders','clients','factions','materials','suppliers','settlements','finance','purchaseOrders','purchaseRequests','paymentBatches','factionAssignments','settlementCompensations'])maps[k]=new Map(arr(s,k).map(x=>[x.id,x]));
  const get=(k,id)=>maps[k]?.get(id),name=(k,id)=>get(k,id)?.name||'';
  const orderInfo=id=>{const o=get('orders',id);return o?[o.id,name('products',o.productId),get('products',o.productId)?.sku,name('clients',o.clientId)]:[id]};
  const productInfo=id=>[name('products',id),get('products',id)?.sku,id];
  const materialInfo=id=>[name('materials',id),id];
  const orderOf=x=>x.orderId||get('settlements',x.settlementId)?.orderId||null;
  const sourceInfo=id=>{const a=get('settlements',id),c=get('settlementCompensations',id),o=get('orders',id),p=get('purchaseOrders',id);
   if(a)return [a.id,...orderInfo(a.orderId),...productInfo(a.productId),name('factions',a.factionId)];
   if(c)return [c.id,...sourceInfo(c.settlementId),c.reference];
   if(o)return orderInfo(id);
   if(p)return [p.id,...materialInfo(p.materialId),name('suppliers',p.supplierId)];
   return [id];
  };
  const add=(type,module,id,title,status,detail,terms=[],orderId=null)=>{
   if(typeof id!=='string'||!id)return;
   const key=type+'|'+id;if(keys.has(key))return;keys.add(key);
   const text=[id,title,status,detail,labels[module],...terms].filter(x=>typeof x==='string'||typeof x==='number').map(String).join(' ');
   rows.push({key,type,module,id,title:String(title||id),status:String(status||'Cadastro'),detail:String(detail||''),orderId:orderId||null,haystack:norm(text),titleKey:norm(title),idKey:norm(id),skuKey:type==='produto'?norm(terms[0]):''});
  };
  for(const p of arr(s,'products'))add('produto','produtos',p.id,p.name,'Cadastro',p.sku+' · '+name('materials',p.materialId),[p.sku,...materialInfo(p.materialId)]);
  const assignmentsFor=new Map();for(const a of arr(s,'factionAssignments')){const list=assignmentsFor.get(a.orderId)||[];list.push(a);assignmentsFor.set(a.orderId,list)}
  const cutsFor=new Map();for(const x of arr(s,'cutPlans')){const list=cutsFor.get(x.orderId)||[];list.push(x.id);cutsFor.set(x.orderId,list)}
  for(const o of arr(s,'orders')){
   const ordered=sum(o.grade),cut=sum(o.cut),sent=Number(o.allocated)||0,ret=Number(o.returned)||0,sep=Number(o.separated)||0,ship=Number(o.shipped)||0;
   const stage=ship>=ordered&&ordered>0?'Expedido':ship>0?'Expedição parcial':sep>0?'Separação':ret>0?'Retorno / acerto':sent>0?'Na facção':cut>=ordered&&ordered>0?'Corte concluído':cut>0?'Corte parcial':'Aguardando corte';
   const detail=ordered+' pedidas · '+cut+' cortadas · '+Math.max(0,sent-ret)+' na facção · '+ret+' retornadas · '+sep+' separadas · '+ship+' expedidas';
   add('pedido','pedidos',o.id,name('products',o.productId),stage,detail,[...orderInfo(o.id),...(cutsFor.get(o.id)||[]),...(assignmentsFor.get(o.id)||[]).map(a=>name('factions',a.factionId))],o.id);
   if(cut>0)add('corte-resumo','corte',o.id,'Corte · '+name('products',o.productId),cut>=ordered?'Concluído':'Parcial',cut+' de '+ordered+' peças cortadas · '+stage,[...orderInfo(o.id),'finalizado cortado corte'],o.id);
  }
  for(const x of arr(s,'cutPlans'))add('folha','corte',x.id,'Folha · '+name('products',get('orders',x.orderId)?.productId),x.status,sum(x.grade)+' peças · '+x.orderId,[...orderInfo(x.orderId),x.cutterOne,x.cutterTwo,x.spreader,x.workMode],x.orderId);
  for(const x of arr(s,'bomCutRuns'))add('corte-bom','corte',x.id,'Corte BOM · '+name('products',get('orders',x.orderId)?.productId),'Concluído',x.qty+' peças · '+x.color+' '+x.size,[...orderInfo(x.orderId),x.commandId,'finalizado'],x.orderId);
  for(const x of arr(s,'factions'))add('faccao','faccoes',x.id,x.name,'Cadastro',money(x.unitCents)+' / peça',[x.traveta?'faz travetada':'não faz travetada']);
  for(const x of arr(s,'factionAssignments'))add('envio','faccoes',x.id,name('factions',x.factionId)+' · '+name('products',get('orders',x.orderId)?.productId),x.qtySent===x.qtyReturned?'Retornado':'Pendente',x.qtySent+' enviadas · '+x.qtyReturned+' retornadas · '+(x.qtySent-x.qtyReturned)+' pendentes',[...orderInfo(x.orderId),x.factionId],x.orderId);
  for(const x of [...arr(s,'factionTransfers'),...arr(s,'factionPartialTransfers')])add('transferencia','faccoes',x.id,'Transferência de facção','Histórico',name('factions',x.fromFactionId)+' → '+name('factions',x.toFactionId)+' · '+x.qty+' peças',[...orderInfo(x.orderId),x.reason],x.orderId);
  for(const x of arr(s,'settlements'))add('acerto','acertos',x.id,name('factions',x.factionId)+' · '+(name('products',x.productId)||name('products',get('orders',x.orderId)?.productId)),x.status,x.qty+' peças · '+money(x.amountCents)+' · '+(x.serviceType||'costura'),[...orderInfo(x.orderId),...productInfo(x.productId),x.reason,x.serviceType,...(x.rateHistory||[]).flatMap(h=>[h.fromFactionName,h.toFactionName,h.reason])],x.orderId);
  for(const x of arr(s,'settlementCompensations'))add('compensacao','acertos',x.id,'Compensação · '+name('factions',x.factionId),x.status,money(x.deltaCents)+' · '+x.reference,[...sourceInfo(x.settlementId),x.reason],orderOf(x));
  for(const x of arr(s,'finance'))add('titulo','hub',x.id,x.description,x.status,money(x.amountCents)+' · '+x.kind,[...sourceInfo(x.sourceId),x.kind],get('orders',x.sourceId)?.id||orderOf(get('settlements',x.sourceId)||get('settlementCompensations',x.sourceId)||{})||null);
  for(const x of arr(s,'paymentBatches'))add('fechamento','hub',x.id,'Fechamento · '+(x.factionNameSnapshot||x.reference),x.status,money(x.totalCents)+' · '+x.count+' títulos',[x.reference,x.reason,...(x.items||[]).flatMap(i=>[i.financeId,...sourceInfo(i.sourceId)])]);
  for(const x of arr(s,'paymentReceipts'))add('comprovante','hub',x.id,x.fileName,'Versão '+x.version,money(x.amountCents)+' · '+x.targetId,[x.targetId,...(x.financeIds||[]),x.reason]);
  for(const x of arr(s,'purchaseRequests'))add('requisicao','compras',x.id,'Requisição · '+name('materials',x.materialId),x.status,x.qtyGrams+' g',[...materialInfo(x.materialId),x.purchaseId,x.requester,x.reason]);
  for(const x of arr(s,'purchaseOrders'))add('compra','compras',x.id,'Compra · '+name('materials',x.materialId),x.cancelled?'Cancelada':x.returnId?'Devolvida':x.received?'Recebida':'Pendente',x.qtyGrams+' g · '+name('suppliers',x.supplierId),[...materialInfo(x.materialId),x.purchaseRequestId,x.returnId]);
  for(const x of arr(s,'purchaseReturns'))add('devolucao','compras',x.id,'Devolução · '+name('materials',x.materialId),x.status,x.qtyGrams+' g · '+money(x.amountCents),[x.purchaseId,x.requestId,x.reference,x.reason]);
  for(const x of arr(s,'materials'))add('material','estoque',x.id,x.name,'Estoque',x.stockGrams+' g',[x.id]);
  for(const x of arr(s,'stockLedger'))add('movimento','estoque',x.id,'Movimento · '+name('materials',x.materialId),x.type,x.deltaGrams+' g · '+x.sourceId,[...sourceInfo(x.sourceId),x.commandId,x.note]);
  for(const [k,type,module] of [['clients','cliente','cadastros'],['suppliers','fornecedor','cadastros'],['employees','funcionario','folha'],['prints','impressao','impressora3d']])for(const x of arr(s,k))add(type,module,x.id,x.name,'Cadastro','',[]);
  for(const x of arr(s,'errors'))add('ocorrencia','central',x.id,x.message,x.status,x.module||'Ocorrência',[x.severity,x.reason]);
  for(const x of arr(s,'log'))add('evento','nucleo',x.commandId,x.type,'Histórico','Revisão '+x.revision+' · '+x.description,[x.actor]);
  return rows;
 }
 function search(index,query='',options={}){
  const q=norm(query).slice(0,150),tokens=q.split(' ').filter(Boolean);
  const module=options.module||'todos',limit=Math.max(1,Math.min(50,Number(options.limit)||20)),page=Math.max(1,Math.floor(Number(options.page)||1));
  const matches=[];
  for(const row of index){
   if(module!=='todos'&&row.module!==module)continue;
   if(tokens.length&&!tokens.every(t=>row.haystack.includes(t)))continue;
   const score=(row.idKey===q?1000:0)+(q&&row.skuKey===q?900:0)+(row.titleKey===q?200:0)+(row.titleKey.startsWith(q)?100:0)+(row.haystack.includes(q)?30:0)+(row.type==='produto'?15:row.type==='pedido'?8:0);
   matches.push({row,score});
  }
  matches.sort((a,b)=>b.score-a.score||a.row.id.localeCompare(b.row.id,'pt-BR',{numeric:true})||a.row.type.localeCompare(b.row.type));
  const counts={};for(const {row} of matches)counts[row.module]=(counts[row.module]||0)+1;
  return {total:matches.length,page,limit,counts,items:matches.slice((page-1)*limit,page*limit).map(({row})=>{const {haystack,titleKey,idKey,skuKey,...safe}=row;return safe})};
 }
 return Object.freeze({version:'1.0.0',build,search,labels,normalize:norm});
});

;
/* modulos/hub-financeiro-v1.js */
/* Hub analítico fictício, leitura do mesmo razão. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabFinanceV1=api;})(typeof window!=='undefined'?window:null,function factory(){
 const valid=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 const categories=['Vendas','Facções','Compras','Folha','Aluguel','Impostos','Transporte','Outras despesas','Outras receitas','Compensações','Devoluções'];
 const classify=(f,s)=>{if(!f.sourceId)return categories.includes(f.category)?f.category:(f.kind==='pagar'?'Outras despesas':'Outras receitas');for(const [k,c] of [['orders','Vendas'],['settlements','Facções'],['purchaseOrders','Compras'],['settlementCompensations','Compensações'],['purchaseReturns','Devoluções'],['payrollPeriods','Folha']])if((s[k]||[]).some(x=>x.id===f.sourceId))return c;return 'Vínculo não identificado';};
 const empty=()=>({receber:0,pagar:0,net:0,count:0});
 const add=(a,r)=>{a[r.kind]+=r.amountCents;a.net=a.receber-a.pagar;a.count++;if(![a.receber,a.pagar,a.net].every(Number.isSafeInteger))throw Error('Total excede limite seguro');};
 function report(s,{from='2026-11-01',to='2026-12-31',asOf='2026-11-17',category='todos'}={}){
 if(!valid(from)||!valid(to)||!valid(asOf)||from>to)throw Error('Período financeiro inválido.');
 const actual=empty(),forecast=empty(),undated=empty(),overdue=empty(),open=empty(),groups=new Map(),days=new Map(),rows=[],issues=[],seen=new Set();
 for(const f of s.finance||[]){
 if(!f.id||seen.has(f.id))throw Error('ID financeiro duplicado ou ausente.');seen.add(f.id);
 if(!['pagar','receber'].includes(f.kind)||!Number.isSafeInteger(f.amountCents)||f.amountCents<=0)throw Error('Título financeiro inválido: '+f.id);
 if(!['aberto','pago'].includes(f.status)){issues.push(f.id+' · situação excluída: '+f.status);continue;}
 const cat=classify(f,s);if(category!=='todos'&&cat!==category)continue;
 const d=f.status==='pago'?f.paidDate:f.dueDate,has=valid(d);
 const row={id:f.id,description:f.description,kind:f.kind,amountCents:f.amountCents,status:f.status,category:cat,date:has?d:null,reconciliation:f.status!=='pago'?'Não quitado':f.reconciliation?.amountCents===f.amountCents&&f.reconciliation?.reference?'Conferido manualmente':'Sem conferência'};
 if(f.status==='aberto'){add(open,row);if(has&&d<asOf)add(overdue,row);}
 if(!has){add(undated,row);rows.push(row);continue;}
 if(d<from||d>to)continue;
 rows.push(row);const key=f.status==='pago'?'actual':'forecast';add(key==='actual'?actual:forecast,row);
 if(!days.has(d))days.set(d,{date:d,actual:empty(),forecast:empty()});add(days.get(d)[key],row);
 if(!groups.has(cat))groups.set(cat,{category:cat,actual:empty(),forecast:empty()});add(groups.get(cat)[key],row);
 }
 const projectedNet=actual.net+forecast.net;if(!Number.isSafeInteger(projectedNet))throw Error('Projeção excede limite seguro.');
 return {actual,forecast,open,overdue,undated,projectedNet,categories:[...groups.values()],days:[...days.values()].sort((a,b)=>a.date.localeCompare(b.date)),rows:rows.sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||a.id.localeCompare(b.id)),issues};
 }return {valid,categories,classify,report};
});

;
/* modulos/assistente-v3.js */
/* Assistente 3.0: consultas determinísticas, somente leitura e evidências locais. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabAssistantV3=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
 const arr=(s,k)=>Array.isArray(s[k])?s[k]:[];
 const sum=(rows,f)=>rows.reduce((n,x)=>n+f(x),0);
 const brl=n=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 const topics=[
 ['prioridades','O que devo priorizar?', 'nucleo'],
 ['pedidos','Quais pedidos estão atrasados ou em risco?', 'producao'],
 ['faccoes','Quais facções têm peças pendentes?', 'faccoes'],
 ['financeiro','Quanto tenho a pagar e receber?', 'hub'],
 ['caixa','Quanto foi pago e recebido no período?', 'hub'],
 ['estoque','Quais materiais estão abaixo do limite?', 'estoque'],
 ['producao','Quantas peças foram produzidas no período?', 'relatorios'],
 ['auditoria','Quais erros precisam de atenção?', 'auditor'],
 ['aprendizado','Quais falhas são recorrentes?', 'bot'],
 ['pedido','Consultar pedido por ID ou nome do modelo', 'pedidos']
 ];
 function classify(q){const v=norm(q);if(!v)return 'prioridades';
 // Nunca interpretar operações de escrita como autorização para executá-las.
 if(/\b(exclua|excluir|apague|apagar|delete|pague|quite|altere|alterar|transfira|transfere|corrija|corrigir|lance|lancar|salve|salvar|remova|remover|execute|executar|ignore|invente)\b/.test(v))return 'unsupported_write';
 if(/\b(lucro|rentabilidade|margem|dre|saldo bancario|extrato bancario real|previsao de lucro)\b/.test(v))return 'unsupported_cost';
 if(/\bped-\d+\b/.test(v))return 'pedido';
 const rules=[['prioridades',/\b(priorizar|prioridade|urgente|atencao|comecar)\b/],['aprendizado',/\b(recorrentes?|recorrencia|persistentes?|aprendizado|bot)\b/],['auditoria',/\b(erros?|falhas?|auditor|auditoria|integridade)\b/],['faccoes',/\b(faccoes?|faccao|costureiras?|oficinas?)\b/],['caixa',/\b(pago|pagos|recebido|recebidos|recebi|paguei|caixa|receitas|despesas)\b/],['financeiro',/\b(pagar|receber|titulos?|financeiro|vencid[oa]s?)\b/],['estoque',/\b(estoque|materiais|insumos|malha|renda|tule)\b/],['pedidos',/\b(atrasad[oa]s?|atraso|prazo|gargalo|risco|entrega)\b/],['producao',/\b(producao|produzidas?|cortadas?|expedidas?|separadas?)\b/]];
 const matched=rules.filter(([,r])=>r.test(v));if(matched.length>1)return 'ambiguous';if(matched.length)return matched[0][0];return 'unknown';}
 function ask(s,d,{question='',topic='auto',reference='',from='2026-11-01',to='2026-11-30',asOf='2026-11-17',stockLimitGrams=5000}={}){
 if(s?.schema!=='hlgb-evolucao-operacao-ficticia-v1')throw Error('Documento fora do laboratório.');
 if(!validDate(from)||!validDate(to)||from>to||!validDate(asOf)||!Number.isSafeInteger(stockLimitGrams)||stockLimitGrams<0)throw Error('Filtros inválidos.');
 const chosen=topic==='auto'?classify(question):topic;
 const result={schema:'hlgb-lab-assistente-v3',revision:s.revision,environment:'ficticio',readOnly:true,topic:chosen,question,from,to,asOf,summary:[],rows:[],warnings:[],module:'bot',sources:[],status:'ok'};
 const warn=x=>result.warnings.push(x),metric=(label,value)=>result.summary.push({label,value}),row=(id,label,detail,module)=>result.rows.push({id,label,detail,module});
 const load=(key,fn)=>{try{if(typeof fn!=='function')throw Error('Módulo ausente');const a=fn();if(!a)throw Error('Resultado vazio');return a;}catch(e){warn(key+': consulta indisponível · '+e.message);result.status='partial';return null;}};
 const audit=load('Auditor',()=>d.audit.analyze(s));if(audit){result.sources.push('Auditor 3.0');if(audit.revision!==s.revision)throw Error('Auditoria desatualizada.');if(audit.bySeverity.critica)warn('Existem '+audit.bySeverity.critica+' alertas críticos. Não use números afetados para autorizar pagamentos ou baixas.');if(audit.status==='cobertura_parcial')warn('Cobertura de auditoria parcial.');}
 else warn('Integridade não confirmada.');
 const financial=()=>{result.sources.push('Hub Financeiro / títulos');return load('Financeiro',()=>d.finance.report(s,{from,to,asOf}));};
 const production=()=>{result.sources.push('PCP / pedidos e facções');return load('PCP',()=>d.pcp.report(s,{asOf}));};
 const blocked=modules=>!audit||audit.checks.some(x=>x.status==='erro_de_verificacao')||audit.findings.some(x=>x.severity==='critica'&&(modules.includes(x.module)||x.module==='nucleo'||x.module==='auditor'));
 const guard=modules=>{if(!blocked(modules))return true;warn('Indicadores desta área bloqueados por integridade não confirmada. Confira o Auditor.');result.status='blocked';return false;};
 const titleRows=rows=>rows.forEach(x=>row(x.id,x.description,brl(x.amountCents)+' · '+x.kind+' · '+(x.date||'Sem data')+' · '+x.status,'hub'));
 if(chosen==='unsupported_write'){result.status='unsupported';warn('O Assistente é somente consulta. Nenhum pagamento, alteração ou exclusão é executado.');return result;}
 if(chosen==='unsupported_cost'){result.status='unsupported';warn('Lucro, margem e saldo bancário real ainda não podem ser apurados com segurança: custos históricos, rateios e saldo inicial não foram homologados.');return result;}
 if(chosen==='ambiguous'||chosen==='unknown'){result.status='unsupported';warn('Selecione uma consulta específica. O texto não foi interpretado com segurança.');return result;}
 result.module=topics.find(x=>x[0]===chosen)?.[2]||'bot';
 switch(chosen){
 case 'prioridades':{
 if(audit){metric('Alertas críticos',audit.bySeverity.critica);metric('Alertas altos',audit.bySeverity.alta);audit.findings.slice(0,10).forEach(x=>row(x.recordId,x.severity+' · '+x.code,x.action,x.module));}
 if(guard(['producao','pedidos','faccoes','estoque'])){const p=production();if(p){metric('Pedidos atrasados',p.late);metric('Pedidos em risco',p.risk);p.rows.filter(x=>['Atrasado','Risco de atraso'].includes(x.status)).slice(0,10).forEach(x=>row(x.id,x.model,x.status+' · prazo '+x.due,'producao'));}}
 if(guard(['hub','acertos','compras'])){const f=financial();if(f){metric('Contas vencidas a pagar',brl(f.overdue.pagar));metric('Contas vencidas a receber',brl(f.overdue.receber));}}
 break;}
 case 'pedidos':case 'faccoes':case 'pedido':{
 if(!guard(['producao','pedidos','faccoes','estoque']))break;const p=production();if(!p)break;
 if(chosen==='pedidos'){metric('Pedidos atrasados',p.late);metric('Em risco estimado',p.risk);metric('Peças a expedir',p.remaining);metric('Gargalo estimado',p.bottleneck||'Sem carga');p.rows.filter(x=>x.remaining>0).forEach(x=>row(x.id,x.model,x.status+' · '+x.remaining+' peças · prazo '+(x.due||'não informado')+' · previsão '+(x.estimated||'—'),'producao'));warn('Previsões conservadoras em dias corridos; não são garantia de entrega.');}
 else if(chosen==='faccoes'){metric('Peças pendentes',sum(p.factions,x=>x.pending));p.factions.slice().sort((a,b)=>b.pending-a.pending).forEach(x=>row(x.id,x.name,x.pending+' pendentes · '+x.returned+' retornadas de '+x.sent+' enviadas','faccoes'));warn('Volume acumulado, não produtividade por hora.');}
 else {const id=norm(reference||question).match(/\bped-\d+\b/)?.[0],query=norm(reference);if(!id&&!query){warn('Informe ID do pedido ou nome do modelo.');result.status='unsupported';break;}const found=p.rows.filter(x=>id?norm(x.id)===id:norm(x.model).includes(query));metric('Pedidos encontrados',found.length);found.forEach(x=>row(x.id,x.model,x.client+' · '+x.ordered+' pedidas · '+x.shipped+' expedidas · '+x.remaining+' pendentes · '+x.status,'pedidos'));}break;}
 case 'financeiro':case 'caixa':{
 if(!guard(['hub','acertos','compras']))break;const f=financial();if(!f)break;
 if(chosen==='financeiro'){metric('Total aberto a pagar',brl(f.open.pagar));metric('Total aberto a receber',brl(f.open.receber));metric('A pagar vencido',brl(f.overdue.pagar));metric('A receber vencido',brl(f.overdue.receber));titleRows(arr(s,'finance').filter(x=>x.status==='aberto').map(x=>({...x,date:x.dueDate||null})));warn('Saldo em aberto e vencidos são globais; vencimento comparado à data de referência.');}
 else{metric('Recebido no período',brl(f.actual.receber));metric('Pago no período',brl(f.actual.pagar));metric('Movimento líquido realizado',brl(f.actual.net));metric('Previsão líquida em aberto',brl(f.forecast.net));titleRows(f.rows.filter(x=>x.status==='pago'&&x.date));warn('Movimento líquido não é lucro nem saldo bancário; títulos sem data não entram no período.');}
 metric('Títulos sem data',f.undated.count);break;}
 case 'estoque':{if(!guard(['estoque','compras']))break;result.sources.push('Cadastro de materiais / saldo atual');const m=arr(s,'materials').filter(x=>Number.isSafeInteger(x.stockGrams)&&x.stockGrams<stockLimitGrams).sort((a,b)=>a.stockGrams-b.stockGrams);metric('Materiais abaixo do limite',m.length);metric('Limite de referência',stockLimitGrams+' g');m.forEach(x=>row(x.id,x.name,x.stockGrams+' g disponíveis','estoque'));warn('Limite de consulta, não ponto de reposição calculado por consumo.');break;}
 case 'producao':{if(!guard(['producao','pedidos','relatorios','estoque','faccoes']))break;result.sources.push('Histórico gerencial / eventos datados');const m=load('Relatórios',()=>d.management.report(s,{from,to}));if(!m)break;for(const [k,label] of [['cut','Cortadas'],['returned','Retornadas'],['shipped','Expedidas']])metric(label+' (líquido)',m.totals[k]);metric('Eventos datados',m.datedEvents);m.models.forEach(x=>row(x.productId,x.name,x.cut+' cortadas · '+x.returned+' retornadas · '+x.shipped+' expedidas','relatorios'));warn(m.undated+' eventos sem data e '+m.withoutMetrics+' sem métricas; não são reconstruídos.');break;}
 case 'auditoria':{if(!audit)break;metric('Críticos',audit.bySeverity.critica);metric('Altos',audit.bySeverity.alta);metric('Regras avaliadas',audit.checks.length);audit.findings.forEach(x=>row(x.recordId,x.code,x.severity+' · '+x.evidence+' · '+x.action,x.module));warn('Ausência de alertas nas regras cobertas não certifica todo o programa.');break;}
 case 'aprendizado':{if(!audit)break;result.sources.push('Bot 3.0 / observações');const b=load('Bot',()=>d.bot.analyze(s,audit));if(!b)break;if(b.integrity.length){result.status='blocked';warn('Histórico de aprendizado inconsistente.');break;}metric('Observações',b.observations);metric('Falhas persistentes',b.persistent);b.recurring.forEach(x=>row(x.code,x.code,x.observations+' observações distintas · '+x.active+' ocorrências ativas','bot'));warn('Recorrência depende das observações registradas; não é prova de monitoramento remoto.');break;}
 default:result.status='unsupported';warn('Consulta não disponível.');
 }
 result.totalRows=result.rows.length;return result;
 }
 return {topics,classify,ask};
});

;
/* modulos/monitor-v1.js */
/* Verificações periódicas de sessão fictícia, sem escrita empresarial. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabMonitorV1=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const path=x=>String(x||'').split(/[?#]/)[0].replace(/^\.\//,'');
 function scripts(actual,expected,globals={}){
 const rows=actual.map(path),want=expected.map(path),seen=new Map(),issues=[];
 for(const x of rows)seen.set(x,(seen.get(x)||0)+1);
 for(const [x,n] of seen){if(n>1)issues.push({code:'SCRIPT_DUPLICADO',path:x,detail:n+' carregamentos'});if(!want.includes(x))issues.push({code:'SCRIPT_NAO_PREVISTO',path:x,detail:'Fora do manifesto desta interface'});}
 for(const x of want){if(!seen.has(x))issues.push({code:'SCRIPT_AUSENTE',path:x,detail:'Módulo obrigatório ausente'});if(Object.hasOwn(globals,x)&&globals[x]!==true)issues.push({code:'GLOBAL_AUSENTE',path:x,detail:'Exportação do módulo não localizada'});}
 if(new Set(want).size!==want.length)issues.push({code:'MANIFESTO_DUPLICADO',path:'manifesto',detail:'Manifesto de scripts inválido'});
 const order=rows.filter(x=>want.includes(x));if(rows.length===want.length&&order.some((x,i)=>x!==want[i]))issues.push({code:'ORDEM_SCRIPT',path:'manifesto',detail:'Ordem de inicialização divergente'});
 return {count:rows.length,expected:want.length,issues,ok:issues.length===0};}
 function evaluate({state,integrity,audit,scriptReport,source,at,round,trigger}){
 const issues=[];
 if(!state||!Number.isSafeInteger(state.revision))issues.push({code:'LEITURA_INCONCLUSIVA',detail:'Revisão não comprovada'});
 if(!integrity?.ok)issues.push({code:'INTEGRIDADE',detail:(integrity?.problems||['Verificação indisponível']).join('; ').slice(0,600)});
 if(!audit||!Array.isArray(audit.checks)||!Array.isArray(audit.findings))issues.push({code:'AUDITOR_INDISPONIVEL',detail:'Diagnóstico não executado'});
 else{for(const c of audit.checks)if(c.status==='erro_de_verificacao')issues.push({code:'REGRA_INCONCLUSIVA',detail:c.id});for(const f of audit.findings)if(['critica','alta'].includes(f.severity))issues.push({code:f.code,detail:String(f.recordId||'')+' · '+String(f.message||'').slice(0,180)});}
 for(const i of scriptReport?.issues||[])issues.push({code:i.code,detail:i.path+' · '+i.detail});
 if(!scriptReport)issues.push({code:'SCRIPTS_INCONCLUSIVOS',detail:'Inventário indisponível'});
 return {schema:'hlgb-monitor-ficticio-v1',at,round,trigger,source,revision:state?.revision??null,status:issues.length?'investigar':audit?.status==='cobertura_parcial'?'cobertura_parcial':'sem_alertas_nas_regras_cobertas',issues,scriptReport:scriptReport||null,productionApproval:false,readOnly:true};}
 return {scripts,evaluate};
});

;
/* operacao-integrada-ui.js */
/* HLGB Evolução: UI do laboratório integrado. Sem rede, sem dados da confecção. */
(function(){
'use strict';
const api=window.HLGBOperationalLab,$=id=>document.getElementById(id);
const modules=[
 ['nucleo','Salvamento e sincronização','Resumo do documento IndexedDB, revisão, trilha de eventos e proteção contra concorrência.'],
 ['autenticacao','Login e permissões','Papéis e limitações demonstrativas; nenhuma autenticação empresarial ou autorização real.'],
 ['pedidos','Pedidos','Cadastre encomendas fictícias por grade e acompanhe o histórico entre etapas.'],
 ['produtos','Produtos e ficha técnica','Cadastre modelo, SKU, preço e consumo de material para simular corte e custo.'],
 ['corte','Corte','Baixe parcialmente por tamanho com consumo material e bloqueio de estoque negativo.'],
 ['producao','Produção e PCP','Acompanhe as quantidades cortadas, enviadas, retornadas e ainda pendentes.'],
 ['separacao','Separação e expedição','Realize separação parcial e despacho sem ultrapassar o que retornou.'],
 ['faccoes','Facções e rotas','Cadastre facções, configure travetada, envie e registre retornos parciais.'],
 ['acertos','Acertos e pagamentos avulsos','Veja os acertos gerados pelos retornos e ajuste o valor com rastreabilidade.'],
 ['hub','Hub Financeiro','Cadastre conta fictícia, confira títulos vinculados e marque pagamento sem repetição.'],
 ['folha','Folha e provisões','Edite passagem por pessoa e confira os totais sem misturar salário e transporte.'],
 ['compras','Compras e fornecedores','Cadastre compra de material, conferência por duas pessoas e recebimento de estoque.'],
 ['estoque','Estoque e materiais','Consulte saldos, movimentações e ajustes documentados sem valores negativos.'],
 ['relatorios','Relatórios e análises','Conferência cruzada das quantidades, contas abertas e exportação de evidências.'],
 ['auditor','Auditor e autocorreção','Diagnóstico determinístico; nenhuma autocorreção em produção.'],
 ['bot','Assistente e aprendizado','Alertas gerados por regras verificáveis, sem IA autônoma nem mutação dos dados.'],
 ['central','Central de erros e saúde','Registro, acompanhamento e encerramento manual de ocorrências fictícias.'],
 ['impressora3d','Impressora 3D','Cadastro fictício de produtos 3D com preço, filamento e quantidade pronta.'],
 ['cadastros','Clientes e cadastros','Cadastros de clientes, fornecedores e insumos vinculados aos módulos.'],
 ['utilidades','Utilidades · Rotas e Etiquetas','Rota LEVAR/BUSCAR no laboratório; etiquetas e regularização dependem de paridade com o legado.']
];
const ids=new Map(modules.map((m,i)=>[m[0],i])),visitedModules=new Set();
// Avaliações ficam em chaves SEPARADAS no IndexedDB fictício, sem alterar a
// revisão do documento, o WAL ou o histórico de operação.
const programReviews=Object.create(null);
const reviewKey=id=>'program-review:'+id;
async function reviewLoad(){
 if(!db)return;
 const rows=await new Promise((resolve,reject)=>{
  const t=db.transaction(STORE,'readonly'),
   q=t.objectStore(STORE).getAll(IDBKeyRange.bound('program-review:','program-review:\uffff'));
  q.onsuccess=()=>resolve(q.result);
  q.onerror=()=>reject(q.error||Error('Falha ao ler avaliações locais.'));
 });
 for(const x of rows)if(x&&ids.has(x.module)&&
  ['sem_erro_no_ensaio','precisa_ajuste'].includes(x.outcome)&&
  typeof x.note==='string'&&x.note.length<=600)
  programReviews[x.module]={outcome:x.outcome,note:x.note,
   checkedAt:String(x.checkedAt||''),revision:Number(x.revision)||0};
}
async function reviewStore(module,entry){
 if(!db)return false; // Banco remoto de CI não guarda avaliação local nesta página.
 await new Promise((resolve,reject)=>{
  const t=db.transaction(STORE,'readwrite');
  t.objectStore(STORE).put({key:reviewKey(module),module,...entry});
  t.oncomplete=resolve;
  t.onerror=()=>reject(t.error||Error('Não foi possível guardar a avaliação.'));
  t.onabort=()=>reject(t.error||Error('Avaliação interrompida.'));
 });
 return true;
}

let active=ids.has(window.location.hash.slice(1))?window.location.hash.slice(1):'nucleo',db=null,doc=null,busy=false,journeyOrderId=null,routeDraft=null;
let labelDraft=[{name:'',model:'',size:'',pieceQty:0,volumes:0,copies:1,date:new Date().toISOString().slice(0,10)}],labelLayout='10',templateEditId=null,packerEditId=null,templatePreviewId=null,packerPreviewId=null;
let historicalDraft='cliente;modelo;quantidade;data;referencia;status\n',historicalResult=null;
const settlementFilters={query:'',status:'todos',faction:'todas',service:'todos',compensation:'todos'};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const str=x=>escape(String(x??''));
const fmt=api.money;
const nr=c=>(c/100).toFixed(2).replace('.',',');
const sum=g=>Object.values(g).reduce((a,b)=>a+b,0);
function options(items,selected=null){return items.map(([value,label])=>'<option value="'+escape(value)+'"'+(selected===value?' selected':'')+'>'+escape(label)+'</option>').join('')}
let selectFieldSerial=0;
function field(name,label,kind='text',value='',list=null){
 let input;
 if(kind==='select'){
  const id='lab-select-'+(++selectFieldSerial);
  return '<div class="field"><label for="'+id+'">'+escape(label)+'</label>'+
   '<select id="'+id+'" class="input" name="'+name+'" required>'+options(list||[],value===''?null:String(value))+'</select></div>';
 }
 else if(kind==='checkbox')input='<input name="'+name+'" type="checkbox" value="true">';
 else input='<input class="input" name="'+name+'" type="'+(kind==='int'?'number':'text')+'"'+(kind==='int'?' min="0" step="1" inputmode="numeric"':kind==='money'?' inputmode="decimal"':'')+' value="'+escape(value)+'" required maxlength="96">';
 return '<div class="field"><label>'+escape(label)+input+'</label></div>';
}
function form(type,title,fields,button='Registrar'){
 return '<form data-command="'+escape(type)+'"><h3>'+escape(title)+'</h3><div class="fields">'+fields.join('')+'</div><div class="actions"><button class="btn primary" type="submit">'+escape(button)+'</button></div></form>';
}
function panel(title,content,wide=false){return '<section class="panel'+(wide?' wide':'')+'"><h2>'+escape(title)+'</h2>'+content+'</section>'}
function table(headers,rows){
 if(!rows.length)return '<div class="empty">Nenhum registro fictício nesta área. Use o formulário para começar.</div>';
 return '<div class="table-wrap"><table><thead><tr>'+headers.map(h=>'<th>'+escape(h)+'</th>').join('')+'</tr></thead><tbody>'+
 rows.map(cells=>'<tr>'+cells.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
const selector=(list,text)=>list.map(x=>[x.id,text(x)]);
const ref=(list,id)=>list.find(x=>x.id===id);
const orderOptions=s=>selector(s.orders,o=>o.id+' · '+(ref(s.products,o.productId)?.name||'Modelo')+' · '+sum(o.grade)+' pç');
const blank='<p>Selecione um pedido ou cadastre um novo na guia Pedidos.</p>';
function status(msg,style='success'){$('flash').className=style;$('flash').textContent=msg}
function getGrade(order){return api.sizes.map(sz=>sz+': '+order.grade[sz]+' / cortadas '+order.cut[sz]).join(' · ')}
function colorMatrixRow(color='',values={P:0,M:0,G:0,GG:0}){
 return '<div class="color-matrix-row" data-color-row role="group" aria-label="Cor e tamanhos">'+
  '<label>Cor<input name="color" class="input" maxlength="40" required placeholder="Ex.: Preto" value="'+escape(color)+'"></label>'+
  api.sizes.map(sz=>'<label>'+escape(sz)+'<input class="input" type="number" name="'+escape(sz)+'" min="0" max="10000" step="1" inputmode="numeric" required value="'+escape(values[sz]||0)+'"></label>').join('')+
  '<div class="color-row-action"><button type="button" class="btn" data-remove-color-row aria-label="Remover cor">Remover</button></div></div>';
}
function colorMatrixCreateForm(s){
 const clients=selector(s.clients,x=>x.name),products=selector(s.products,x=>x.name+' · '+x.sku);
 return '<form data-command="order.add.with.colors" id="order-color-matrix-form">'+
  '<h3>Novo pedido por cor e tamanho — grade horizontal</h3>'+
  '<p>Uma linha por cor; tamanhos nas colunas. O pedido e a grade inteira são salvos juntos. Por enquanto, um modelo por pedido nesta demonstração.</p>'+
  '<div class="fields">'+field('clientId','Cliente','select','',clients)+field('productId','Modelo','select','',products)+'</div>'+
  '<div class="color-grid-scroll"><div class="color-matrix-head" aria-hidden="true"><span>Cor</span>'+api.sizes.map(sz=>'<span>'+sz+'</span>').join('')+'<span>Ação</span></div>'+
  '<div id="order-color-rows">'+colorMatrixRow('Preto',{P:0,M:10,G:0,GG:0})+'</div></div>'+
  '<div class="actions"><button type="button" class="btn" data-add-color-row>+ Adicionar outra cor</button></div>'+
  '<p id="order-color-total" class="caption" role="status" aria-live="polite">Confira a grade antes de cadastrar.</p>'+
  '<div class="actions"><button type="submit" class="btn primary">Cadastrar pedido com todas as cores</button></div></form>';
}
function readColorMatrix(form){
 const rows=[...form.querySelectorAll('[data-color-row]')];
 if(rows.length<1||rows.length>30)throw Error('Cadastre de 1 a 30 cores.');
 const colorGrades=[],seen=new Set(),totals=Object.fromEntries(api.sizes.map(sz=>[sz,0]));
 for(const row of rows){
  const color=row.querySelector('[name=color]').value.trim().replace(/\s+/g,' '),
   key=color.toLocaleLowerCase('pt-BR'),grade={};
  if(!color||color.length>40||seen.has(key))throw Error('Informe cores diferentes, até 40 caracteres.');
  seen.add(key);
  for(const sz of api.sizes){
   const raw=row.querySelector('[name="'+sz+'"]').value;
   if(!/^\d+$/.test(raw))throw Error('Informe quantidade inteira para '+color+' / '+sz);
   const qty=Number(raw);
   if(!Number.isSafeInteger(qty)||qty>10000)throw Error('Quantidade fora do limite para '+color+' / '+sz);
   grade[sz]=qty;totals[sz]+=qty;
  }
  if(sum(grade)<1)throw Error('Cada cor deve ter ao menos uma peça: '+color);
  colorGrades.push({color,grade});
 }
 if(sum(totals)<1||sum(totals)>30000)throw Error('Total do pedido deve estar entre 1 e 30000 peças.');
 return {clientId:form.elements.namedItem('clientId').value,productId:form.elements.namedItem('productId').value,colorGrades,totals};
}
function updateColorMatrixPreview(){
 const form=document.getElementById('order-color-matrix-form');if(!form||!doc)return;
 const line=document.getElementById('order-color-total');if(!line)return;
 try{
  const p=readColorMatrix(form),model=ref(doc.products,p.productId);
  line.textContent='Total: '+sum(p.totals)+' peças · '+p.colorGrades.length+' cor(es) · '+
   api.sizes.map(sz=>sz+': '+p.totals[sz]).join(' | ')+
   (model?' · valor fictício '+fmt(sum(p.totals)*model.priceCents):'')+
   '. Conferência antes de salvar.';
  line.dataset.valid='true';
 }catch(err){line.textContent='Confira a matriz: '+err.message;line.dataset.valid='false';}
}
function orderColorGradePanel(s){
 const eligible=s.orders.filter(o=>o.allocated===0&&!s.settlements.some(x=>x.orderId===o.id));
 const colors=s.colorCatalog||[],rows=s.orders.flatMap(o=>(o.colorGrades||[]).map(g=>[
  str(o.id+' · '+(ref(s.products,o.productId)?.name||'')),str(g.color),...api.sizes.map(sz=>str(g.grade[sz])),str(sum(g.grade))
 ]));
 return panel('Gerenciar cores de pedidos já cadastrados',
  '<p>Complete ou corrija a cor antes do primeiro envio. Esta edição conserva o pedido, o histórico e os totais.</p>'+
  form('order.color.grade.set','Incluir, alterar ou remover cor existente',[
   field('orderId','Pedido ainda sem envio','select','',selector(eligible,x=>x.id+' · '+(ref(s.products,x.productId)?.name||''))),
   field('color','Nome da cor','text','Preto'),
   ...api.sizes.map(sz=>field(sz,sz+' — quantidade desta cor','int','0')),
   field('removeColor','Remover esta cor existente (confirmação obrigatória)','checkbox')
  ],'Salvar cor na grade')+
  '<p id="order-color-edit-hint" role="status">Selecione uma cor para preencher a grade existente.</p>'+
  '<p>Para remover uma cor, marque explicitamente a opção de remoção. Apenas zerar os campos não exclui a cor. A grade geral do pedido permanece preservada.</p>'+
  table(['Pedido / modelo','Cor',...api.sizes,'Total'],rows),true);
}
function fillOrderColorEdit(){
 if(active!=='pedidos'||!doc)return;
 const form=document.querySelector('#module-content form[data-command="order.color.grade.set"]');
 if(!form)return;
 const order=doc.orders.find(x=>x.id===form.elements.namedItem('orderId').value);
 const color=String(form.elements.namedItem('color').value||'').trim().toLocaleLowerCase('pt-BR');
 const row=order?.colorGrades?.find(x=>x.color.trim().toLocaleLowerCase('pt-BR')===color);
 for(const sz of api.sizes)form.elements.namedItem(sz).value=String(row?.grade?.[sz]||0);
 const remove=form.elements.namedItem('removeColor');if(remove)remove.checked=false;
 const hint=document.getElementById('order-color-edit-hint');
 if(hint)hint.textContent=row?'Cor existente carregada: '+row.color+' · '+sum(row.grade)+' peças. Alterar e salvar mantém o histórico do pedido.':
  'Cor ainda não cadastrada neste pedido. Informe as quantidades para incluí-la.';
}

const multiBaseSizes=['PP','P','M','G','GG','XG','G1'];
function multiSizes(form){
 return [...form.querySelectorAll('[data-multi-size]')].map(x=>x.dataset.multiSize);
}
function multiColumns(sizes){
 return 'minmax(125px,2fr) repeat('+sizes.length+',minmax(58px,1fr)) minmax(88px,100px)';
}
function multiColorRow(sizes,color='Preto',amount=0){
 return '<div data-multi-color-row class="multi-matrix-line" style="grid-template-columns:'+multiColumns(sizes)+'">'+
 '<label>Cor<input class="input" name="color" maxlength="40" required value="'+escape(color)+'"></label>'+
 sizes.map(size=>'<label>'+escape(size)+'<input class="input" name="size_'+escape(size)+'" type="number" min="0" max="10000" inputmode="numeric" step="1" required value="'+(size==='M'?amount:0)+'"></label>').join('')+
 '<div><button type="button" class="btn" data-remove-multi-color aria-label="Remover linha de cor">Remover cor</button></div></div>';
}
function multiModelCard(products,sizes,index){
 const modelOptions=options(selector(products,x=>x.name+' · '+x.sku),products[Math.min(index,products.length-1)]?.id||null);
 return '<section class="multi-model-card" data-multi-model><h4>Modelo '+(index+1)+'</h4>'+
 '<div class="fields"><div class="field"><label>Produto cadastrado<select name="productId" class="input" required>'+modelOptions+'</select></label></div></div>'+
 '<div class="multi-matrix-scroll"><div class="multi-matrix-line multi-matrix-header" data-multi-col-head style="grid-template-columns:'+multiColumns(sizes)+'">'+
 '<span>Cor</span>'+sizes.map(size=>'<span>'+escape(size)+'</span>').join('')+'<span>Ação</span></div>'+
 '<div data-multi-colors>'+multiColorRow(sizes,index===0?'Preto':'Rubi',index===0?10:5)+'</div></div>'+
 '<div class="actions"><button type="button" class="btn" data-add-multi-color>+ Nova cor</button>'+
 '<button type="button" class="btn" data-remove-multi-model>Remover modelo</button></div></section>';
}
function multiOrderRevisionPanel(s){
 const rows=(s.multiOrders||[]).map(order=>{
  const planned=(s.multiCutPlans||[]).filter(p=>p.orderId===order.id&&p.status!=='cancelado');
  const reservations=new Map();
  for(const plan of planned)for(const line of plan.lines){
   const key=plan.itemId+'|'+line.color+'|'+line.size;
   reservations.set(key,(reservations.get(key)||0)+line.qty);
  }
  const models=order.items.map(item=>'<fieldset data-revise-item="'+escape(item.id)+'"><legend>'+
   escape(item.name)+' · '+escape(item.id)+'</legend>'+
   item.colors.map(color=>'<div class="multi-matrix-scroll"><strong>'+escape(color.color)+'</strong><div class="fields">'+
    order.sizes.map(size=>{
     const qty=color.grade[size],minimum=reservations.get(item.id+'|'+color.color+'|'+size)||0;
     return '<label>'+escape(size)+' · reservado '+minimum+
      '<input class="input" type="number" min="'+minimum+'" max="10000" step="1" required data-revise-qty'+
      ' data-item-id="'+escape(item.id)+'" data-color="'+escape(color.color)+'" data-size="'+escape(size)+
      '" value="'+qty+'"></label>';
    }).join('')+'</div></div>').join('')+'</fieldset>').join('');
  return '<details class="panel" data-revise-order="'+escape(order.id)+'"><summary>Editar grade do pedido '+
   escape(order.id)+' · '+order.totals.pieces+' peças · '+(order.revisions||[]).length+' revisão(ões)</summary>'+
   '<p class="caption">Altere somente quantidades. Modelos, cores, tamanhos e preços históricos são preservados. Não é permitido reduzir abaixo da quantidade já programada ou cortada.</p>'+
   '<form data-command="order.multi.revise" data-revise-order-form="'+escape(order.id)+'">'+
   '<input type="hidden" name="id" value="'+escape(order.id)+'">'+models+
   '<label>Justificativa obrigatória<input class="input" name="reason" maxlength="240" required placeholder="Motivo da mudança de quantidades"></label>'+
   '<div class="actions"><button type="submit" class="btn primary">Conferir e salvar revisão fictícia</button></div></form>'+
   (order.revisions?.length?'<p class="caption">Histórico: '+
    order.revisions.map(r=>'revisão '+r.revision+' · '+escape(r.reason)).join(' | ')+'</p>':'')+'</details>';
 }).join('');
 return rows?panel('Revisar quantidades de pedidos multimodelo (histórico protegido)',
  '<p>As alterações são registradas com antes/depois, revisão e justificativa; o total e os cortes são reconferidos antes da gravação.</p>'+rows,true):'';
}
function multiOrderPanel(s){
 const sizeList=multiBaseSizes,existing=s.multiOrders||[],clients=selector(s.clients,x=>x.name);
 const summaries=table(['Pedido','Cliente','Modelos','Cores','Peças','Valor ilustrativo','Condição'],
  existing.map(o=>[str(o.id),str(ref(s.clients,o.clientId)?.name||o.clientId),str(o.totals.models),
   str(o.totals.colors),str(o.totals.pieces),fmt(o.totals.amountCents),'<strong>Preparação · corte em laboratório separado</strong>']));
 return panel('Vários modelos no mesmo pedido — preparação segura',
  '<p><b>Teste de estrutura, não lançamento comercial:</b> este formulário guarda os modelos em um único pedido fictício. Ainda NÃO gera financeiro, baixa de estoque, facções nem expedição. A programação de corte existe como ensaio independente na guia Corte. O cadastro anterior continua disponível abaixo.</p>'+
  '<form id="multi-order-form" data-command="order.multi.create">'+
  '<div class="fields">'+field('clientId','Cliente','select','',clients)+'</div>'+
  '<div data-multi-size-head style="display:none">'+sizeList.map(size=>'<span data-multi-size="'+escape(size)+'"></span>').join('')+'</div>'+
  '<div id="multi-model-list">'+multiModelCard(s.products,sizeList,0)+'</div>'+
  '<div class="actions"><button type="button" class="btn" data-add-multi-model>+ Adicionar outro modelo</button></div>'+
  '<div class="fields"><label>Outro tamanho (ex.: G2, 36, Único)<input class="input" id="multi-new-size" maxlength="12" placeholder="G2"></label></div>'+
  '<div class="actions"><button type="button" class="btn" data-add-multi-size>+ Acrescentar tamanho a todas as grades</button></div>'+
  '<p class="caption">Todos os modelos compartilham os tamanhos selecionados. Uma cor pode ter zero em alguns tamanhos, mas não pode ficar inteiramente zerada.</p>'+
  '<p class="multi-order-summary" id="multi-order-preview" aria-live="polite">Calculando quantidades...</p>'+
  '<div class="actions"><button type="submit" class="btn primary">Salvar pedido multimodelo fictício</button></div></form>'+
  multiOrderRevisionPanel(s)+'<h3>Pedidos multimodelo em preparação</h3>'+summaries+
  '<p class="caption">Os IDs e os totais ficam no histórico do laboratório, mas nenhum pedido desta lista pode ser baixado ou enviado para uma facção até a homologação da integração.</p>',true);
}
function multiOrderInput(form){
 const sizes=multiSizes(form),models=[...form.querySelectorAll('[data-multi-model]')];
 if(!models.length||models.length>20)throw Error('Informe entre 1 e 20 modelos.');
 const items=models.map((model,index)=>{
  const productId=model.querySelector('[name=productId]').value;
  const lines=[...model.querySelectorAll('[data-multi-color-row]')];
  if(!lines.length||lines.length>30)throw Error('Informe as cores do modelo '+(index+1));
  return {productId,colors:lines.map(line=>{
   const color=line.querySelector('[name=color]').value,grade={};
   for(const size of sizes){
    const input=line.querySelector('[name="size_'+size+'"]');
    const raw=input?.value??'';
    if(!/^\d+$/.test(raw))throw Error('Quantidade inválida na cor '+color+' / '+size);
    grade[size]=Number(raw);
   }
   return {color,grade};
  })};
 });
 return {clientId:form.elements.namedItem('clientId').value,sizes,items};
}
function multiOrderPreview(){
 const form=document.getElementById('multi-order-form'),summary=document.getElementById('multi-order-preview');
 if(!form||!summary||!doc)return;
 try{
  const payload=multiOrderInput(form),p=window.HLGBLabMultiOrdersV1.prepare(doc,payload);
  summary.dataset.valid='true';
  summary.textContent=p.totals.models+' modelo(s) · '+p.totals.colors+' cores · '+p.totals.pieces+' peças. '+
   p.sizes.map(size=>size+': '+p.totals.bySize[size]).join(' · ')+
   ' · valor ilustrativo '+fmt(p.totals.amountCents)+
   '. Apenas preparo: NÃO registra contas, corte ou saída.';
 }catch(e){summary.dataset.valid='false';summary.textContent='Confira a matriz: '+e.message;}
}
function multiAfterSizeAdded(form,size){
 const holder=form.querySelector('[data-multi-size-head]');
 const span=document.createElement('span');span.dataset.multiSize=size;holder.append(span);
 for(const model of form.querySelectorAll('[data-multi-model]')){
  const header=model.querySelector('[data-multi-col-head]');
  const title=document.createElement('span');title.textContent=size;
  header.insertBefore(title,header.lastElementChild);
  for(const line of model.querySelectorAll('[data-multi-color-row]')){
   const label=document.createElement('label');label.textContent=size;
   const input=document.createElement('input');input.type='number';input.min='0';input.max='10000';input.step='1';
   input.inputMode='numeric';input.required=true;input.name='size_'+size;input.value='0';input.className='input';
   label.append(input);line.insertBefore(label,line.lastElementChild);
  }
 }
 const columns=multiColumns(multiSizes(form));
 form.querySelectorAll('.multi-matrix-line').forEach(node=>node.style.gridTemplateColumns=columns);
}


function multiCutEditor(s,order,item,plan=null){
 const v=window.HLGBLabMultiCutsV1;
 const available=v.balance(s,order.id,item.id,plan?.id||null).filter(x=>x.qty>0);
 const old=new Map((plan?.lines||[]).map(x=>[x.color+'|'+x.size,x.qty]));
 const matrix=available.map(x=>'<label class="field">'+escape(x.color)+' / '+escape(x.size)+
  ' · saldo '+x.remaining+' de '+x.qty+
  '<input class="input" data-mcut-qty data-mcut-color="'+escape(x.color)+'" data-mcut-size="'+escape(x.size)+
  '" type="number" min="0" max="'+x.remaining+'" step="1" inputmode="numeric" value="'+(old.get(x.color+'|'+x.size)||0)+'"></label>').join('');
 const priority=plan?.priority||'normal';
 return '<form data-command="'+(plan?'multi.cut.revise':'multi.cut.plan')+'">'+
  '<h3>'+(plan?'Revisar '+str(plan.id):'Nova programação '+str(item.name))+'</h3>'+
  '<input type="hidden" name="'+(plan?'id':'orderId')+'" value="'+escape(plan?plan.id:order.id)+'">'+
  (plan?'':'<input type="hidden" name="itemId" value="'+escape(item.id)+'">')+
  '<div class="fields">'+
  '<div class="field"><label>Data do corte<input class="input" type="date" name="scheduledDate" required value="'+escape(plan?.scheduledDate||new Date().toISOString().slice(0,10))+'"></label></div>'+
  '<div class="field"><label>Prioridade<select class="input" name="priority">'+options([['normal','Normal'],['urgente','Urgente'],['alta','Alta'],['baixa','Baixa']],priority)+'</select></label></div>'+
  field('cutterOne','Cortador 1','text',plan?.cutterOne||'Cortador fictício A')+
  field('cutterTwo','Cortador 2','text',plan?.cutterTwo||'Cortador fictício B')+
  field('spreader','Infestador','text',plan?.spreader||'Infestador fictício')+
  (plan?field('reason','Motivo da revisão','text','Reprogramação fictícia'):'')+'</div>'+
  '<p class="caption">Quantidades de um único modelo. Zeros não entram no lote. Nenhuma baixa física ou lançamento financeiro.</p>'+
  '<div class="fields">'+matrix+'</div>'+
  '<button type="submit" class="btn primary">'+(plan?'Salvar alteração':'Programar este modelo')+'</button></form>';
}
function multiCutPanel(s){
 const orders=s.multiOrders||[],plans=s.multiCutPlans||[],v=window.HLGBLabMultiCutsV1;
 if(!v)return panel('Corte multimodelo','<p>Motor de laboratório indisponível. Gravações bloqueadas.</p>',true);
 const forms=orders.flatMap(o=>o.items.map(item=>{
  const free=v.balance(s,o.id,item.id).reduce((n,x)=>n+Math.max(0,x.remaining),0);
  return '<details class="panel" data-mf-record="'+escape(o.id+'|'+item.id)+'"><summary>'+str(o.id)+' · '+str(item.name)+' ('+str(item.id)+') — '+free+' peças disponíveis</summary>'+
   (free?multiCutEditor(s,o,item):'<p>Saldo totalmente reservado ou concluído. Confira folhas anteriores.</p>')+'</details>';
 })).join('');
 const history=table(['Folha','Modelo','Grade por cor/tamanho','Total','Data','Status','Eventos','Impressão'],plans.map(p=>{
  const o=orders.find(x=>x.id===p.orderId),item=o?.items.find(x=>x.id===p.itemId);
  return [str(p.id),str(p.orderId)+' / '+str(item?.name||p.itemId),
   p.lines.map(x=>str(x.color)+' '+str(x.size)+': '+x.qty).join(' · '),str(p.qty),
   str(p.scheduledDate)+' · '+str(p.priority),str(p.status),str(p.history.length)+((p.weightEvents||[]).length?' · '+p.weightEvents.length+' pesagem(ns)':''),
   '<button type="button" class="btn" data-print-multi="'+escape(p.id)+'">Folha A4 deste modelo</button>'];
 }));
 const open=plans.filter(x=>x.status==='aberto');
 const editing=open.map(p=>{
  const o=orders.find(x=>x.id===p.orderId),item=o?.items.find(x=>x.id===p.itemId);
  return o&&item?'<details class="panel"><summary>Alterar grade e equipe '+str(p.id)+'</summary>'+multiCutEditor(s,o,item,p)+'</details>':'';
 }).join('');
 const finished=plans.filter(x=>x.status==='concluido');
 const weightForm=finished.length?form('multi.cut.weight.record','Pesagem após conclusão · histórico sem reabrir Corte',[
  field('id','Corte concluído','select','',selector(finished,x=>x.id+' · '+x.orderId+' / '+x.itemId)),
  field('totalGrams','Peso total recebido (g)','int','1000'),
  field('usedGrams','Peso útil cortado (g)','int','800'),
  field('wasteGrams','Lixo / retalho (g)','int','200'),
  field('checker','Responsável pela pesagem','text','Conferente fictício A'),
  field('reason','Motivo / conferência','text','Primeira conferência fictícia')
 ],'Registrar pesagem fictícia'):'<p>Pesagem posterior disponível após concluir uma programação.</p>';
 const choice=selector(open,x=>x.id+' · '+x.qty+' peças');
 const actions=open.length?form('multi.cut.complete','Concluir ensaio de corte (sem estoque)',[
  field('id','Folha','select','',choice),
  field('checkerOne','Conferente 1','text','Conferente fictício A'),
  field('checkerTwo','Conferente 2','text','Conferente fictício B')
 ],'Concluir teste')+form('multi.cut.cancel','Cancelar folha com histórico',[
  field('id','Folha','select','',choice),field('reason','Motivo','text','Reprogramação fictícia')
 ],'Cancelar folha'):'<p>Nenhuma folha aberta para concluir ou cancelar.</p>';
 return panel('Corte multimodelo · programação por modelo/cor/tamanho',
  '<p>Somente homologação. Os modelos têm saldos independentes, inclusive em PP, XG ou G2. Cada folha A4 apresenta cinco seções e assinaturas físicas em branco; pesagens posteriores são registradas em histórico. Nada disso movimenta estoque, facções, acertos ou financeiro.</p>'+ 
  (orders.length?forms:'<p>Primeiro cadastre um pedido multimodelo na guia Pedidos.</p>')+
  '<h3>Programações realizadas</h3>'+history+editing+actions+weightForm,true);
}
function labelRowHtml(row,index){
 const line=(title,part,value,kind='text')=>'<div class="field"><label>'+escape(title)+'<input class="input" data-label="'+part+'" type="'+kind+'"'+
  (kind==='number'?' min="0" max="100000" step="1"':'')+' value="'+escape(value)+'"></label></div>';
 return '<div class="panel" data-label-row><h3>Modelo / etiqueta '+(index+1)+'</h3><div class="fields">'+
  line('Nome / local','name',row.name)+line('Modelo','model',row.model)+line('Tamanho','size',row.size)+
  line('Peças informadas','pieceQty',row.pieceQty,'number')+line('Volumes — 0 para cópias simples','volumes',row.volumes,'number')+
  line('Cópias (ignorado se tiver volumes)','copies',row.copies,'number')+line('Data','date',row.date,'date')+
  '</div><button type="button" class="btn" data-label-remove="'+index+'">Remover modelo</button></div>';
}
function labelPanel(){
 if(!window.HLGBLabLabelsV1)return panel('Etiquetas A4','Gerador de etiquetas indisponível.',true);
 const rows=labelDraft.map(labelRowHtml).join('');
 const layouts=[['10','Grande · 10 por folha'],['18','Média · 18 por folha'],['21','Pequena · 21 por folha']];
 return panel('Utilidades · Etiquetas A4 com vários modelos',
  '<p>Monte um lote com vários modelos. Informando cinco volumes, o gerador cria automaticamente <b>1 de 5, 2 de 5, 3 de 5, 4 de 5 e 5 de 5</b>. A última folha conserva os espaços vazios para alinhamento. Prévia fictícia, sem gravação no HLGB comercial.</p>'+
  '<div class="field"><label>Formato A4<select class="input" id="label-layout">'+options(layouts,labelLayout)+'</select></label></div>'+
  '<div id="label-editor-rows">'+rows+'</div><div class="actions">'+
  '<button type="button" class="btn" id="label-add">+ Adicionar modelo</button>'+
  '<button type="button" class="btn" id="label-preview">Conferir total</button>'+
  '<button type="button" class="btn primary" id="label-print">Imprimir todas as etiquetas</button></div>'+
  '<p id="label-batch-preview" class="caption" role="status">Escolha os modelos e confira a quantidade antes de imprimir.</p>',true);
}
function labelCapture(){
 const n=x=>{const v=String(x??'').trim();if(!/^(0|[1-9]\d*)$/.test(v))throw Error('Quantidades de etiqueta devem ser inteiros sem sinal.');return Number(v)};
 return [...document.querySelectorAll('[data-label-row]')].map(el=>{
  const v=k=>el.querySelector('[data-label="'+k+'"]')?.value||'';
  return {name:v('name'),model:v('model'),size:v('size'),pieceQty:n(v('pieceQty')),
   volumes:n(v('volumes')),copies:n(v('copies')),date:v('date')};
 });
}
function labelBatch(){
 if(!window.HLGBLabLabelsV1)throw Error('Gerador de etiquetas indisponível.');
 return window.HLGBLabLabelsV1.plan(labelCapture(),$('label-layout').value);
}

function optionalField(name,label,value='',type='text'){
 return '<div class="field"><label>'+escape(label)+'<input class="input" type="'+type+'" name="'+escape(name)+
  '" value="'+escape(value??'')+'" maxlength="500"></label></div>';
}
function optionalSelect(name,label,choices,selected=''){
 return '<div class="field"><label>'+escape(label)+'<select class="input" name="'+escape(name)+'">'+options(choices,selected)+'</select></label></div>';
}
function labelTemplatesPanel(s){
 const service=window.HLGBLabPackersV1;
 if(!service)return panel('Etiquetas por cliente','Módulo de etiquetas personalizadas não carregado.',true);
 const templates=s.labelTemplatesLab||[],active=templates.filter(x=>x.active);
 const preview=templates.find(x=>x.id===templatePreviewId);
 const edit=templateEditId&&active.find(x=>x.id===templateEditId);
 const clients=selector(s.clients,x=>x.name),products=[['','Padrão deste cliente — todos os modelos'],...selector(s.products,x=>x.name+' · '+x.sku)];
 const fields=[
  ...(edit?[field('id','Modelo de etiqueta','text',edit.id)]:[]),
  field('clientId','Cliente','select',edit?.clientId||s.clients[0]?.id,clients),
  optionalSelect('productId','Produto específico (opcional)',products,edit?.productId||''),
  optionalField('sku','SKU impresso',edit?.sku||''),
  optionalField('cnpj','CNPJ impresso (opcional)',edit?.cnpj||''),
  optionalField('productUrl','URL HTTPS (opcional)',edit?.productUrl||''),
  optionalField('fileName','Referência PDF / imagem (nome, não anexo)',edit?.fileName||''),
  '<div class="field"><label>Campos variáveis / observações<textarea class="input" name="fieldsNote" rows="2" maxlength="500">'+
   escape(edit?.fieldsNote||'')+'</textarea></label></div>',
  ...(edit?[field('reason','Motivo da alteração','text','Correção fictícia de etiqueta')]:[])
 ];
 const rows=table(['Código','Cliente','Modelo','SKU','Arquivo referenciado','Versão','Estado','Ações'],
  templates.map(t=>[str(t.id),str(t.clientName),str(t.productName||'Padrão do cliente'),
   str(t.sku||'—'),str(t.fileName||'Não enviado'),str(t.version),t.active?'Ativo':'Arquivado',
   '<button type="button" class="btn" data-template-preview="'+escape(t.id)+'">Conferir dados</button> '+
   (t.active?'<button type="button" class="btn" data-template-edit="'+escape(t.id)+'">Editar</button>':'Histórico preservado')]));
 return panel('Utilidades · Modelos de etiqueta por cliente/produto',
  '<p>O cliente pode ter uma etiqueta padrão e uma específica por produto. Uma tarefa já enviada guarda a versão aplicada, mesmo após alteração ou arquivamento. <b>Cadastro de referência do arquivo</b>: o envio e a prévia visual de PDF/imagem ainda precisam ser integrados e testados.</p>'+
  form(edit?'label.template.edit':'label.template.add',edit?'Editar etiqueta '+str(edit.id):'Cadastrar modelo de etiqueta',fields,
  edit?'Salvar nova versão':'Cadastrar etiqueta fictícia')+
  (edit?'<button type="button" class="btn" id="template-new">Novo modelo</button>':'')+
  '<h3>Modelos e versões</h3>'+rows+
  (preview?'<div class="panel"><h3>Conferência de '+str(preview.id)+' · versão '+str(preview.version)+'</h3>'+
   '<p><b>Cliente:</b> '+str(preview.clientName)+' · <b>Modelo:</b> '+str(preview.productName||'Padrão do cliente')+'</p>'+
   '<p><b>SKU:</b> '+str(preview.sku||'—')+' · <b>CNPJ:</b> '+str(preview.cnpj||'—')+'</p>'+
   '<p><b>URL informada:</b> '+str(preview.productUrl||'—')+' · <b>Arquivo apenas referenciado:</b> '+str(preview.fileName||'—')+'</p>'+
   '<p><b>Campos:</b> '+str(preview.fieldsNote||'—')+' · <b>Alterações:</b> '+str(preview.history.length)+'</p>'+
   '<p>Prévia dos dados, não uma imagem/PDF de etiqueta nem comprovante de impressão.</p></div>':'')+
  (active.length?form('label.template.archive','Arquivar sem perder etiquetas já atribuídas',[
    field('id','Modelo ativo','select','',selector(active,x=>x.clientName+' · '+(x.productName||'Padrão'))),
    field('reason','Motivo','text','Substituição de referência fictícia')
   ],'Arquivar modelo'):'<p>Nenhuma etiqueta ativa.</p>'),true);
}
function packerAssignmentsPanel(s){
 const service=window.HLGBLabPackersV1;
 if(!service)return panel('Embaladeira','Módulo de embaladeira indisponível.',true);
 const report=service.dashboard(s),rows=s.packerAssignmentsLab||[];
 const assignmentPreview=rows.find(x=>x.id===packerPreviewId);
 const editing=packerEditId&&rows.find(x=>x.id===packerEditId&&['aguardando','parcial'].includes(x.status));
 const clients=selector(s.clients,x=>x.name),products=selector(s.products,x=>x.name),people=selector(s.employees,x=>x.name);
 const base=[
  ...(editing?[field('id','Tarefa em edição','text',editing.id)]:[]),
  field('packerId','Embaladeira','select',editing?.packerId||s.employees[0]?.id,people),
  field('clientId','Cliente','select',editing?.clientId||s.clients[0]?.id,clients),
  field('productId','Modelo','select',editing?.productId||s.products[0]?.id,products),
  field('size','Tamanho','text',editing?.size||'M'),
  optionalField('color','Cor',editing?.color||''),
  '<div class="field"><label>Data<input class="input" type="date" name="date" value="'+escape(editing?.date||new Date().toISOString().slice(0,10))+'" required></label></div>',
  field('qty','Peças atribuídas','int',editing?.qty??10),
  field('labelQty','Quantidade de etiquetas','int',editing?.labelQty??10),
  optionalField('notes','Observações',editing?.notes||''),
  ...(editing?[field('reason','Justificativa da edição','text','Redistribuição de embalagem fictícia')]:[])
 ];
 const active=rows.filter(x=>x.status!=='cancelado');
 const pending=rows.filter(x=>['aguardando','parcial'].includes(x.status));
 const rowTable=table(['Tarefa','Embaladeira','Cliente / modelo','Cor / tamanho','Enviadas','Prontas','Restantes','Etiqueta vinculada','Status','Ações'],rows.map(x=>[
  str(x.id),str(x.packerName),str(x.clientName)+' · '+str(x.productName),
  str(x.color||'—')+' · '+str(x.size),str(x.qty),str(x.doneQty),
  str(x.status==='cancelado'?0:x.qty-x.doneQty),
  x.labelSnapshot?str(x.labelSnapshot.id)+' v'+str(x.labelSnapshot.version)+' · '+str(x.labelSnapshot.fileName||'sem arquivo'):'Sem modelo de etiqueta',
  str(x.status)+(x.history.length>1?' · '+(x.history.length-1)+' mov.':''),
  '<button type="button" class="btn" data-packer-preview="'+escape(x.id)+'">Conferir etiqueta</button> '+
   (pending.some(y=>y.id===x.id)?'<button type="button" class="btn" data-packer-edit="'+escape(x.id)+'">Editar</button>':'Histórico preservado')
 ]));
 const workerRows=table(['Embaladeira','Atribuídas','Prontas','Pendentes'],
  report.byPacker.map(x=>[str(x.name),str(x.assigned),str(x.ready),str(x.pending)]));
 return panel('Embalagem individual por funcionária · laboratório',
  '<p>Controle complementar às embalagens por facção já existentes acima. Atribuições abaixo <b>não retiram peças de pedidos, não criam facção/acerto, não liberam Separação</b>. A integração com o estoque e a liberação por grade ainda depende da homologação.</p>'+
  '<div class="metrics">'+[['Peças atribuídas',report.total],['Prontas',report.done],['Pendentes',report.pending],
   ['Sem etiqueta vinculada',report.missingLabel]].map(([k,v])=>'<div class="metric"><span>'+str(k)+'</span><strong>'+str(v)+'</strong></div>').join('')+'</div>'+
  form(editing?'packer.revise':'packer.assign',editing?'Editar '+str(editing.id):'Atribuir peças à embaladeira',base,
   editing?'Salvar alteração com histórico':'Registrar tarefa fictícia')+
  (editing?'<button type="button" class="btn" id="packer-new">Nova tarefa</button>':'')+
  (active.length?form('packer.progress','Lançar quantidade pronta ou corrigir com histórico',[
   field('id','Tarefa','select','',selector(active,x=>x.id+' · '+x.doneQty+' de '+x.qty+' prontas')),
   field('doneQty','Total pronto atualizado','int','0'),
   field('reason','Motivo / conferência','text','Conferência fictícia'),
   field('correction','Correção para menos (exige justificativa)','checkbox')
  ],'Registrar conferência'):'')+
  (pending.some(x=>x.doneQty===0)?form('packer.cancel','Cancelar tarefa sem peças prontas',[
   field('id','Tarefa sem conclusão','select','',selector(pending.filter(x=>x.doneQty===0),x=>x.id)),
   field('reason','Motivo','text','Reprogramação fictícia')
  ],'Cancelar sem apagar histórico'):'')+
  (assignmentPreview?'<div class="panel"><h3>Conferir etiqueta da tarefa '+str(assignmentPreview.id)+'</h3>'+
    '<p><b>Cliente:</b> '+str(assignmentPreview.clientName)+' · <b>Modelo:</b> '+str(assignmentPreview.productName)+
    ' · <b>Cor:</b> '+str(assignmentPreview.color||'—')+' · <b>Tamanho:</b> '+str(assignmentPreview.size)+'</p>'+
    '<p><b>Peças:</b> '+str(assignmentPreview.qty)+' · <b>Etiquetas:</b> '+str(assignmentPreview.labelQty)+
    ' · <b>Concluídas:</b> '+str(assignmentPreview.doneQty)+'</p>'+
    (assignmentPreview.labelSnapshot?'<p><b>Etiqueta utilizada:</b> '+str(assignmentPreview.labelSnapshot.id)+
      ' versão '+str(assignmentPreview.labelSnapshot.version)+' · SKU '+str(assignmentPreview.labelSnapshot.sku)+
      ' · CNPJ '+str(assignmentPreview.labelSnapshot.cnpj||'—')+' · Arquivo referenciado '+
      str(assignmentPreview.labelSnapshot.fileName||'—')+'</p>':'<p><b>ATENÇÃO:</b> cliente/produto sem etiqueta cadastrada na atribuição.</p>')+
    '<p>Histórico preservado: '+str(assignmentPreview.history.length)+' evento(s). Esta conferência não imprime arquivo nem dá baixa.</p></div>':'')+
  '<h3>Fila por embaladeira</h3>'+workerRows+
  '<h3>Itens e histórico</h3>'+rowTable,true);
}

function historicalReviewPanel(s){
 const svc=window.HLGBLabHistoryReviewV1;
 if(!svc)return panel('Regularização histórica','Prévia indisponível. Nenhuma importação permitida.',true);
 const r=historicalResult?.revision===s.revision&&historicalResult.raw===historicalDraft?historicalResult.report:null;
 const counts=r?'<div class="metrics">'+[['Linhas',r.lines],['Conciliáveis',r.ready],['Bloqueadas',r.blocked],
  ['Peças identificadas',r.readyPieces]].map(([k,v])=>'<div class="metric"><span>'+str(k)+'</span><strong>'+str(v)+'</strong></div>').join('')+'</div>':'';
 const rows=r?table(['Linha','Referência','Cliente','Modelo','Quantidade','Resultado'],r.rows.map(x=>[
  str(x.line),str(x.reference||'—'),str(x.client||'—')+' · '+str(x.clientId||'?'),
  str(x.product||'—')+' · '+str(x.productId||'?'),str(x.qty),
  str(x.status)+' · '+str(x.issues.join(' · ')||'sem pendências de identificação')
 ])):'';
 return panel('Utilidades · Regularização histórica (prévia isolada)',
  '<p>Somente CSV com dados inventados. Confere correspondência exata de cliente e modelo, referência repetida, quantidade e data. Não vincula nomes parecidos automaticamente.</p>'+
  '<div class="field"><label>CSV com seis colunas<textarea class="input" id="historical-raw" rows="5">'+escape(historicalDraft)+'</textarea></label></div>'+
  '<div class="actions"><button type="button" class="btn" id="historical-template">Baixar modelo CSV</button>'+
  '<button type="button" class="btn primary" id="historical-preview">Conferir sem gravar</button>'+
  (r?'<button type="button" class="btn" id="historical-export">Exportar diagnóstico</button>':'')+'</div>'+
  counts+rows+'<p><b>Importação BLOQUEADA:</b> esta prévia não lê PDFs/fotos e não cria pedidos, estoque, financeiro, notas ou acertos. Migração/regularização e verificação em outro computador ainda não foram desenvolvidas.</p>',true);
}

function routeStopFormHtml(s,stop=null){
 const selected=stop?.type==='faccao'?'faccao:'+stop.locationId:stop?.type==='confeccao'?'confeccao:HLGB-LAB':'';
 const places=[['','Escolha a facção ou confecção — obrigatório'],...s.factions.map(f=>['faccao:'+f.id,'Facção · '+f.name]),
  ['confeccao:HLGB-LAB','HLGB Confecções — local fictício']];
 return '<fieldset class="panel" data-route-stop><legend>Parada</legend>'+
  '<div class="field"><label>Destino<select class="input" data-route-loc required>'+
  places.map(([v,label])=>'<option value="'+escape(v)+'"'+(selected===v?' selected':'')+'>'+escape(label)+'</option>').join('')+
  '</select></label></div><div class="fields">'+
  '<div class="field"><label>LEVAR — um item por linha<textarea class="input" data-route-carry rows="4" placeholder="Ex.: Pedido PDM-0001 · Camisola Melina · 40 peças">'+escape((stop?.carry||[]).join('\n'))+'</textarea></label></div>'+
  '<div class="field"><label>BUSCAR — um item por linha<textarea class="input" data-route-pickup rows="4" placeholder="Ex.: 30 peças retornadas, a conferir">'+escape((stop?.pickup||[]).join('\n'))+'</textarea></label></div>'+
  '</div><div class="field"><label>Observações da parada<input class="input" data-route-notes maxlength="300" value="'+escape(stop?.notes||'')+'"></label></div>'+
  '<button type="button" class="btn" data-route-stop-remove>Remover esta parada</button></fieldset>';
}
function routePanel(s){
 const service=window.HLGBLabRoutesV1;
 if(!service)return panel('Rotas LEVAR/BUSCAR','Módulo não carregado; nenhuma gravação autorizada.',true);
 const r=routeDraft&&s.routePlans.find(x=>x.id===routeDraft.id)||null;
 const plan=r||null;
 const data=plan?plan:{date:new Date().toISOString().slice(0,10),driver:'',status:'planejada',notes:'',stops:[null]};
 const mode=plan?'route.revise':'route.plan';
 const statuses=[['planejada','Planejada'],['em_rota','Em rota (fictícia)'],['finalizada','Finalizada (fictícia)']];
 const editor='<form id="route-editor-form" data-command="'+mode+'">'+
  '<h3>'+(plan?'Editar rota '+str(plan.id):'Montar nova rota')+'</h3>'+
  (plan?'<input type="hidden" name="id" value="'+escape(plan.id)+'">':'')+
  '<div class="fields">'+
  '<div class="field"><label>Data<input class="input" type="date" name="date" value="'+escape(data.date)+'" required></label></div>'+
  field('driver','Responsável / motorista','text',data.driver)+
  field('status','Etapa','select',data.status,statuses)+
  '<div class="field"><label>Observações gerais<input class="input" name="notes" maxlength="800" value="'+escape(data.notes)+'"></label></div>'+
  (plan?field('reason','Motivo da edição','text','Atualização fictícia da rota'):'')+
  '</div><h3>Paradas na ordem de execução</h3><div id="route-stop-forms">'+
  (data.stops.length?data.stops:[null]).map(x=>routeStopFormHtml(s,x)).join('')+'</div>'+
  '<div class="actions"><button type="button" class="btn" id="route-stop-add">+ Adicionar parada</button>'+
  '<button class="btn primary" type="submit">'+(plan?'Salvar revisão':'Salvar rota fictícia')+'</button>'+
  (plan?'<button class="btn" id="route-new" type="button">Nova rota</button>':'')+'</div>'+
  '<p class="caption">O destino deve ser escolhido em cada parada; não há seleção automática da primeira facção. Salva apenas no laboratório e exige releitura confirmada.</p></form>';
 const hist=table(['Data','Rota','Responsável','Paradas','Status','Ações'],
  service.rows(s).map(x=>[str(x.date),str(x.id),str(x.driver),str(x.stops.length),
   str(x.status)+(x.history.length>1?' · '+(x.history.length-1)+' alteração(ões)':''),
   '<button type="button" class="btn" data-route-edit="'+escape(x.id)+'">Editar</button> '+
   '<button type="button" class="btn" data-print-route="'+escape(x.id)+'">Imprimir checklists</button>']));
 const open=service.rows(s).filter(x=>!['finalizada','cancelada'].includes(x.status));
 const cancel=open.length?form('route.cancel','Cancelar rota com justificativa',[
   field('id','Rota','select','',open.map(x=>[x.id,x.id+' · '+x.date+' · '+x.driver])),
   field('reason','Motivo','text','Reprogramação fictícia')
 ],'Cancelar mantendo histórico'):'<p>Sem rotas abertas para cancelar.</p>';
 return panel('Utilidades · Rotas LEVAR/BUSCAR (homologação isolada)',
 '<p>Rota de teste com várias paradas, itens para levar e buscar, revisão sem perda do histórico e impressão A4 de resumo e checklists. A releitura em outro computador ainda NÃO está comprovada.</p>'+
 editor+'<h3>Histórico de rotas</h3>'+hist+cancel,true)+labelPanel()+labelTemplatesPanel(s)+historicalReviewPanel(s)+
 panel('Outras Utilidades · ainda não homologadas',
 '<p><b>Upload e prévia de PDF/imagem, migração real e integração de saldos</b> permanecem pendentes. A regularização acima é apenas uma conferência textual.</p>'+
 '<button type="button" class="btn" data-goto="separacao">Ver Separação fictícia</button>',true);
}
function routeInput(form){
 const stops=[...form.querySelectorAll('[data-route-stop]')].map(el=>{
  const raw=el.querySelector('[data-route-loc]').value;
  if(!raw)throw Error('Escolha a facção ou confecção de cada parada, antes de salvar.');
  const idx=raw.indexOf(':'),type=raw.slice(0,idx),locationId=raw.slice(idx+1);
  const list=selector=>el.querySelector(selector).value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  return {type,locationId,carry:list('[data-route-carry]'),pickup:list('[data-route-pickup]'),
   notes:el.querySelector('[data-route-notes]').value};
 });
 const payload={date:form.elements.namedItem('date').value,driver:form.elements.namedItem('driver').value,
  status:form.elements.namedItem('status').value,notes:form.elements.namedItem('notes').value,stops};
 const id=form.elements.namedItem('id'),reason=form.elements.namedItem('reason');
 if(id)payload.id=id.value;
 if(reason)payload.reason=reason.value;
 return payload;
}
function renderRouteSheet(id){
 const plan=(doc.routePlans||[]).find(x=>x.id===id);
 if(!plan)throw Error('Rota de teste não encontrada; não imprimir.');
 const heading='<h1>HLGB EVOLUÇÃO · ROTA FICTÍCIA LEVAR/BUSCAR</h1><p><b>ID:</b> '+str(plan.id)+' · <b>Data:</b> '+str(plan.date)+
 ' · <b>Responsável:</b> '+str(plan.driver)+' · <b>Estado:</b> '+str(plan.status)+'</p>'+
 '<p class="print-note">DOCUMENTO FICTÍCIO — não é comprovante de entrega, baixa de estoque ou confirmação de servidor.</p>';
 const summary='<section class="mc-route-page">'+heading+'<h2>Resumo de todas as paradas</h2>'+
 '<table><thead><tr><th>#</th><th>Local</th><th>LEVAR</th><th>BUSCAR</th><th>Conf.</th></tr></thead><tbody>'+
 plan.stops.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+str(x.name)+'</td><td>'+x.carry.map(str).join('; ')+'</td>'+
 '<td>'+x.pickup.map(str).join('; ')+'</td><td>☐</td></tr>').join('')+'</tbody></table></section>';
 const pages=plan.stops.map((x,i)=>'<section class="mc-route-page">'+heading+
  '<h2>CHECKLIST '+(i+1)+' · '+str(x.name)+'</h2>'+
  '<h2>LEVAR</h2>'+(x.carry.length?x.carry.map(t=>'<p>☐ '+str(t)+'</p>').join(''):'<p>☐ Sem itens</p>')+
  '<h2>BUSCAR</h2>'+(x.pickup.length?x.pickup.map(t=>'<p>☐ '+str(t)+'</p>').join(''):'<p>☐ Sem itens</p>')+
  '<h2>Observações</h2><p>'+str(x.notes||'Sem observações')+'</p><p>Conferido por: _________________________ &nbsp; Horário: ____:____</p></section>').join('');
 $('cut-print').innerHTML='<article class="mc-route">'+summary+pages+'</article>';
 return $('cut-print').textContent;
}

function orderTable(s){
 return table(['Pedido / modelo','Cliente','Grade e corte','Fluxo','Recebimento'],s.orders.map(o=>{
 const q=api.quantities(o);
 return ['<strong>'+str(o.id)+'</strong><div class="caption">'+str(ref(s.products,o.productId)?.name)+'</div>',
 str(ref(s.clients,o.clientId)?.name),str(getGrade(o)),
 'Corte '+q.cut+' · facção '+q.allocated+' · retorno '+q.returned+' · separado '+q.separated+' · enviado '+q.shipped,
 fmt(q.ordered*o.priceCents)];
 }));
}
function financeTable(s){
 return table(['Título','Tipo','Descrição','Valor','Estado','Comprovante'],s.finance.map(f=>[str(f.id),str(f.kind),
 str(f.description),fmt(f.amountCents),'<span class="chip '+(f.status==='aberto'?'wait':'')+'">'+str(f.status)+'</span>',receiptSummary(s,f.id)]));
}

function receiptPanel(s){
 const service=window.HLGBLabPaymentBatchV1;
 if(!service?.receiptTargets)return panel('Comprovantes','<p>Módulo indisponível.</p>',true);
 const metadata=service.receiptMetadata(s),targets=service.receiptTargets(s);
 const choices=targets.map(t=>{const bill=ref(s.finance,t.targetId),lot=ref(s.paymentBatches||[],t.targetId);
  return [t.targetId,t.targetId+' · '+(lot?.factionNameSnapshot||lot?.reference||bill?.description||'Pagamento')+' · '+fmt(t.amountCents)]});
 return panel('Comprovantes PDF de teste — títulos e fechamentos',
  '<p><strong>Use somente arquivo inteiramente fictício.</strong> O PDF fica neste navegador, não comprova pagamento bancário e não integra exportações gerais. Limite: 256 KiB por PDF e 2 MiB no total.</p>'+
  (choices.length?
  '<form data-command="finance.receipt.attach"><h3>Anexar ou substituir comprovante sem apagar versões</h3><div class="fields">'+
   field('targetId','Título ou fechamento já quitado','select','',choices)+
   '<div class="field"><label>PDF de exercício<input class="input" type="file" name="receiptFile" accept=".pdf,application/pdf" required></label></div>'+
   field('reason','Motivo / identificação da conferência','text','')+
   '<div class="field"><label><input type="checkbox" name="fictitious" required> Confirmo que o PDF não contém dados reais.</label></div>'+
   '</div><p id="receipt-current" class="caption" role="status"></p>'+
   '<button type="submit" class="btn primary">Salvar comprovante fictício</button></form>':
   '<p>Nenhum pagamento a pagar foi quitado neste exercício.</p>')+
   '<div class="field"><label>Buscar comprovantes<input class="input" type="search" data-filter-for="payment-receipt-history" placeholder="CPV, FIN, PAG ou nome do arquivo"></label></div>'+
 '<div id="payment-receipt-history">'+table(['Comprovante','Pagamento','Valor vinculado','Arquivo / tamanho','Versão','Motivo','Consultar'],
    metadata.slice().reverse().map(r=>[str(r.id),str(r.targetId)+' · '+str(r.financeIds.join(', ')),fmt(r.amountCents),
     str(r.fileName)+' · '+Math.ceil(r.size/1024)+' KiB',
     str(r.version)+' · '+(r.current?'Atual':'Anterior'),str(r.reason),
     '<button class="btn" type="button" data-receipt-download="'+str(r.id)+'">Baixar PDF</button>']))+'</div>',true);
}
function receiptSummary(s,financeId){
 const service=window.HLGBLabPaymentBatchV1;
 if(!service?.receiptMetadata)return '—';
 const lot=(s.paymentBatches||[]).find(b=>b.items?.some(i=>i.financeId===financeId));
 const r=service.receiptMetadata(s).find(x=>x.targetId===(lot?.id||financeId)&&x.current);
 return r?'<button type="button" class="btn" data-receipt-download="'+str(r.id)+'">'+str(r.id)+' · v'+str(r.version)+'</button>':'—';
}
function updateReceiptTarget(form){
 const targetId=form.elements.namedItem('targetId')?.value;
 const latest=window.HLGBLabPaymentBatchV1.receiptMetadata(doc).find(x=>x.targetId===targetId&&x.current);
 const el=$('receipt-current');
 if(el)el.textContent=latest?'Atual: '+latest.fileName+' · v'+latest.version+'. A nova versão preservará a anterior.':'Ainda não há comprovante para este pagamento.';
}
async function readReceiptPayload(form){
 const file=form.elements.namedItem('receiptFile')?.files?.[0],service=window.HLGBLabPaymentBatchV1;
 if(!form.elements.namedItem('fictitious')?.checked)throw Error('Confirme que o arquivo é fictício.');
 if(!file||file.size>service.MAX_PDF)throw Error('Selecione um PDF fictício de até 256 KiB.');
 if(file.type&&file.type!=='application/pdf')throw Error('Formato aceito: PDF.');
 const targetId=form.elements.namedItem('targetId')?.value;
 const previousId=service.receiptMetadata(doc).find(x=>x.targetId===targetId&&x.current)?.id||null;
 const reason=form.elements.namedItem('reason')?.value;
 const bytes=new Uint8Array(await file.arrayBuffer());
 let content='';for(let i=0;i<bytes.length;i+=8192)content+=String.fromCharCode(...bytes.slice(i,i+8192));
 return {targetId,previousId,fileName:file.name,contentBase64:btoa(content),reason,fictitious:true};
}
function factionClosingPanel(s){
 const comps=s.settlementCompensations||[];
 const groups=window.HLGBLabPaymentBatchV1?.groups?.(s)||[];
 const groupForms=groups.map(g=>
  '<div class="panel"><h3>'+str(g.name)+' · '+str(g.count)+' título(s)'+
  (g.ready?' · '+fmt(g.totalCents):' · bloqueado')+'</h3>'+
  (g.ready?
   '<form data-command="finance.faction.close" class="faction-close-form">'+
   '<input type="hidden" name="factionId" value="'+str(g.factionId)+'">'+
   g.financeIds.map(id=>'<input type="hidden" name="financeIds" value="'+str(id)+'">').join('')+
   '<input type="hidden" name="expectedTotalCents" value="'+g.totalCents+'">'+
   '<p class="caption">Composição completa da facção, com cada acerto individual preservado.</p>'+
   table(['Título','Acerto / modelo','Serviço','Valor'],g.financeIds.map(id=>{
    const title=s.finance.find(x=>x.id===id),
     settlement=s.settlements.find(x=>x.id===title?.sourceId),
     comp=comps.find(x=>x.id===title?.sourceId),
     original=comp?s.settlements.find(x=>x.id===comp.settlementId):settlement,
     product=ref(s.products,original?.productId||ref(s.orders,original?.orderId)?.productId);
    return [str(id),str((settlement?.id||comp?.id||'—')+' · '+(original?.serviceQuote?.model||product?.name||'Modelo não cadastrado')),
     str(comp?'Compensação':original?.serviceType||'costura'),fmt(title.amountCents)];
   }))+
   '<div class="fields">'+
   field('reference','Referência única do fechamento','text','FAC-'+g.factionId+'-R'+s.revision)+
   '<div class="field"><label>Data da baixa<input type="date" class="input" name="paidDate" value="2026-11-16" required></label></div>'+
   field('reason','Motivo da conferência','text','Acerto consolidado fictício da facção')+'</div>'+
   '<div class="actions"><button class="btn" type="button" data-preview-faction="true">Validar total sem pagar</button>'+
   '<button class="btn primary" type="submit">Fechar todos os acertos desta pessoa</button></div></form>':
   '<p class="error">'+str(g.error)+'</p>')+'</div>').join('');

 return panel('Fechamento automático por facção · sem misturar pessoas',
 '<p>Todos os títulos abertos da mesma pessoa (2 a 50) são conferidos e quitados juntos, com uma referência única. Créditos a receber ficam separados. A composição e o total serão revalidados antes da baixa.</p>'+
 (groupForms||'<div class="empty">Nenhuma facção tem dois ou mais acertos abertos para consolidar.</div>'),true);
}
function groupedAccountPanel(s){
 let report;try{report=window.HLGBLabPaymentBatchV1.groupedAccounts(s);}catch(e){return panel('Extrato consolidado por prestador','<div class="error">'+str(e.message)+'</div>',true);}
 return panel('Extrato consolidado por prestador','<p>Um resumo por pessoa, identificado pelo cadastro, não pelo nome. Todos os lançamentos permanecem individuais no Hub; a soma não cria outra dívida nem compensa créditos automaticamente.</p>'+
 '<div class="metrics">'+[['A pagar',report.totals.payablesCents],['Créditos a receber',report.totals.creditsCents],['Já pagos',report.totals.paidCents],['Créditos recebidos',report.totals.receivedCents]].map(([k,v])=>'<div class="metric"><span>'+str(k)+'</span><strong>'+fmt(v)+'</strong></div>').join('')+'</div>'+
 (report.totals.blocked?'<p class="error">Há prestadores com divergências. Totais acima são parciais e não autorizam quitação.</p>':'')+
 '<div class="field"><label>Pesquisar prestador<input class="input" type="search" data-filter-for="grouped-accounts" placeholder="Nome ou ID"></label></div>'+
 '<div id="grouped-accounts">'+table(['Prestador','A pagar / linhas','Créditos em aberto','Pago','Créditos recebidos','Conferência'],report.groups.map(g=>[str(g.name)+' · '+str(g.factionId),fmt(g.payablesCents)+' · '+g.payables.length,fmt(g.creditsCents),fmt(g.paidCents),fmt(g.receivedCents),g.complete?(g.ready?'Pronto para conferir':g.payables.length===1?'Baixa individual':'Sem lote elegível'):str(g.issues.join('; '))]))+'</div>'+
 report.groups.map(g=>'<details class="panel"><summary><strong>'+str(g.name)+' · '+str(g.factionId)+'</strong> · '+fmt(g.payablesCents)+' a pagar</summary>'+
 table(['Título / acerto','Modelo / serviço','Peças','Valor','Situação','Fechamento / data'],[...g.payables,...g.credits,...g.paid,...g.received].map(x=>[str(x.financeId)+' · '+str(x.sourceId),str(x.model)+' · '+str(x.service),str(x.qty??'—'),fmt(x.amountCents),str(x.kind)+' · '+str(x.status),str([x.batchId,x.reference,x.paidDate].filter(Boolean).join(' · ')||'—')]))+'</details>').join('')+
 '<button class="btn" type="button" id="grouped-export">Exportar extrato consolidado JSON</button>',true);
}
function financialBatchPanel(s){
 const comps=s.settlementCompensations||[],batches=s.paymentBatches||[];
 const open=s.finance.filter(t=>t.kind==='pagar'&&t.status==='aberto').map(t=>{
  const settlement=s.settlements.find(x=>x.id===t.sourceId);
  const compensation=comps.find(x=>x.id===t.sourceId);
  const src=settlement||compensation;
  if(!src||src.status!=='aberto'||(settlement&&settlement.amountCents!==t.amountCents)||
   (compensation&&compensation.deltaCents!==t.amountCents))return null;
  return {title:t,source:src,faction:ref(s.factions,src.factionId)?.name||'—'};
 }).filter(Boolean);
 const checks=open.map(({title,source,faction})=>
  '<label class="batch-choice"><input type="checkbox" name="financeIds" value="'+str(title.id)+'" data-batch-cents="'+title.amountCents+'">'+
  '<span><strong>'+str(title.id)+'</strong> · '+str(source.id)+' · '+str(faction)+
  ' · '+fmt(title.amountCents)+'</span></label>').join('');
 return groupedAccountPanel(s)+factionClosingPanel(s)+
 panel('Fechamento manual de títulos · Facções e Acertos fictícios',
  '<p>Selecione de 2 a 50 títulos a pagar de acertos ou compensações. Antes da baixa, o núcleo confere todos os vínculos e valores. <strong>Se um falhar, o lote inteiro será recusado</strong>, sem pagamento parcial.</p>'+
  '<form data-command="finance.batch.pay" id="finance-batch-form">'+
  '<div class="batch-choices">'+(checks||'<div class="empty">Nenhum acerto elegível aberto para o lote.</div>')+'</div>'+
  '<p id="finance-batch-summary" class="caption" role="status">Nenhum título selecionado.</p>'+
  '<div class="fields">'+field('reference','Referência única do fechamento','text','LOTE-TESTE-001')+
  field('reason','Justificativa do fechamento','text','Conferência coletiva fictícia')+'</div>'+
  '<div class="actions"><button class="btn" type="button" id="preview-finance-batch">Validar sem pagar</button>'+
  '<button class="btn primary" type="submit">Conferir e quitar lote fictício</button></div></form>'+
  '<p class="caption">Pagamento somente demonstrativo: sem banco real, PIX, comprovante fiscal ou liquidação externa. O pagamento unitário anterior continua disponível.</p>',true)+
 panel('Histórico de lotes sem reescrever acertos',
  table(['Lote','Referência','Títulos','Total','Situação','Motivo','IDs vinculados'],
   batches.map(b=>[str(b.id)+(b.scope==='faccao'?' · '+str(b.factionNameSnapshot):''),str(b.reference),str(b.count),
    fmt(b.totalCents),str(b.status),str(b.reason),
    (b.items||[]).map(i=>str(i.financeId)+' ('+str(i.sourceId)+')').join(' · ')]))+
  '<p class="caption">Lotes são imutáveis no laboratório; comprovantes fictícios são anexados separadamente. Autenticação real permanece pendente.</p>',true);
}
function updateBatchPreview(){
 const form=document.querySelector('#finance-batch-form');
 if(!form||!doc)return;
 const selected=[...form.querySelectorAll('[name="financeIds"]:checked')];
 const total=selected.reduce((n,x)=>n+Number(x.dataset.batchCents||0),0);
 const summary=$('finance-batch-summary');
 if(summary)summary.textContent=selected.length+' título(s) selecionado(s) · '+fmt(total)+
  ' · conferência final do núcleo obrigatória (somente dados fictícios)';
}
function refDocs(s){return '<div class="flow"><span>Pedido</span>→<span>Corte</span>→<span>Facção</span>→<span>Retorno</span>→<span>Acerto</span>→<span>Separação</span>→<span>Expedição</span>→<span>Financeiro</span></div>'+
 '<p>Todos os passos alteram o mesmo estado fictício, guardado no IndexedDB deste navegador. Cada operação tem revisão e histórico.</p>'}
function guidedJourney(s){
 if(!s.orders.some(x=>x.id===journeyOrderId))journeyOrderId=s.orders[s.orders.length-1]?.id||null;
 const guide=api.journey(s,journeyOrderId);
 const choice=s.orders.length?'<div class="field"><label for="journey-order">Pedido fictício acompanhado</label>'+
  '<select class="input" id="journey-order">'+
  options(s.orders.map(o=>[o.id,o.id+' · '+(ref(s.products,o.productId)?.name||'Modelo')]),guide.orderId)+
  '</select></div>':'<p>Comece em Compras para testar o recebimento de material; depois cadastre um pedido fictício.</p>';
 const rows=guide.steps.map((step,i)=>
  '<li class="journey-step" data-step-id="'+str(step.id)+'" data-completed="'+String(step.completed)+'">'+
  '<div><strong>'+(i+1)+'. '+str(step.title)+'</strong>'+
  '<p class="caption">'+str(step.detail)+'</p></div>'+
  '<div class="journey-actions"><span class="chip '+(step.completed?'':'wait')+'">'+
  (step.completed?'Evidência local':'Pendente')+'</span>'+
  '<button type="button" class="btn" data-goto="'+str(step.module)+'">'+
  (step.completed?'Conferir':'Testar')+'</button></div></li>').join('');
 const optional=guide.optional;
 return '<p><strong>Jornada por pedido, sem lançamentos automáticos.</strong> Os indicadores são calculados a partir do IndexedDB fictício e não comprovam o sistema de produção. A compra deve se referir ao material do pedido escolhido.</p>'+
 choice+
 '<p id="journey-progress" class="caption" role="status" aria-live="polite"><strong>'+
 guide.completed+' de '+guide.total+' etapas com evidência local</strong> · Pedido '+
 str(guide.orderId||'a cadastrar')+'</p>'+
 '<ol class="journey-list" id="journey-steps">'+rows+'</ol>'+
 '<div class="journey-step" data-step-id="compensacao" data-completed="'+String(optional.completed)+'">'+
 '<div><strong>Etapa opcional: '+str(optional.title)+'</strong><p class="caption">'+str(optional.detail)+'</p></div>'+
 '<div class="journey-actions"><span class="chip '+(optional.completed?'':'wait')+'">'+
 (optional.completed?'Evidência local':'Não realizada')+'</span>'+
 '<button type="button" class="btn" data-goto="acertos">Abrir Acertos</button></div></div>'+
 '<p class="caption">Depois do teste, atualize a página, confira os mesmos IDs e exporte JSON/CSV. A atualização e a conferência humana não são marcadas automaticamente como concluídas.</p>';
}

function fullProgramTestPanel(s){
 // "Visitada" não significa testada/aprovada; nenhuma marca altera dados da operação.
 const opened=modules.filter(x=>visitedModules.has(x[0])).length;
 const reviewed=modules.filter(([id])=>Boolean(programReviews[id])).length;
 const issues=modules.filter(([id])=>programReviews[id]?.outcome==='precisa_ajuste').length;
 const rows=modules.map(([id,title],index)=>
  '<div class="journey-step" data-general-test-module="'+escape(id)+'">'+
  '<div><strong>'+(index+1)+'. '+escape(title)+'</strong>'+
  '<p class="caption">'+(visitedModules.has(id)?'Tela visitada nesta sessão':'Ainda não aberta nesta sessão')+
  ' · '+(programReviews[id]?.outcome==='precisa_ajuste'?'Problema informado pela pessoa que testou':
   programReviews[id]?.outcome==='sem_erro_no_ensaio'?'Sem erro observado no exercício (ainda NÃO aprovado)':
   'Sem avaliação registrada neste navegador')+
  ' · A aprovação funcional requer gravar, reler e comparar com o HLGB antigo.</p>'+
  (programReviews[id]?'<p class="caption" data-general-review-note="'+escape(id)+'"><strong>Última avaliação registrada:</strong> '+
   escape(programReviews[id].note)+' · Revisão local '+escape(programReviews[id].revision)+
   ' · '+escape(programReviews[id].checkedAt||'Data indisponível')+
   '. Registro local, não é aceite de produção.</p>':'')+'</div>'+
  '<button class="btn" type="button" data-goto="'+escape(id)+'">Abrir área</button></div>').join('');
 const reviewForm='<form id="whole-program-review-form"><h3>Registrar resultado de uma área</h3>'+
  '<div class="fields"><div class="field"><label for="program-review-module">Área testada</label>'+
  '<select class="input" id="program-review-module" name="area" required>'+
  options(modules.map(([id,name])=>[id,name]))+'</select></div>'+
  '<div class="field"><label for="program-review-outcome">Resultado do exercício</label>'+
  '<select class="input" id="program-review-outcome" name="outcome" required>'+
  options([['sem_erro_no_ensaio','Não encontrei erro neste exercício'],['precisa_ajuste','Encontrei problema / precisa ajustar']])+
  '</select></div></div>'+
  '<div class="field"><label for="program-review-note">O que testou e qual resultado obteve (sem informações reais)</label>'+
  '<textarea class="input" id="program-review-note" name="note" rows="3" maxlength="600" required placeholder="Ex.: salvei 40 peças, atualizei a página e o saldo não mudou."></textarea></div>'+
  '<div class="actions"><button class="btn primary" type="submit">Guardar avaliação neste navegador</button></div></form>';
 return panel('Teste do programa completo · '+modules.length+' áreas',
  '<p><strong>Um único programa de ensaio.</strong> Passe pelas áreas, cadastre apenas dados inventados, execute o percurso Pedido → Corte → Facção → Retorno → Separação → Acerto → Hub e confira cada lançamento depois de atualizar a página.</p>'+
  '<p id="whole-program-progress" role="status"><strong>'+opened+' de '+modules.length+
  ' áreas visitadas nesta sessão.</strong> Avaliações manuais: '+reviewed+
  ' · Problemas anotados: '+issues+
  '. Visitar não aprova uma função; a lista de visitas reinicia ao fechar a sessão.</p>'+
  '<div class="actions"><button class="btn primary" type="button" id="whole-program-export">Exportar relatório completo desta sessão</button>'+
  '<button class="btn" type="button" data-goto="pedidos">Começar por Pedidos</button></div>'+
  '<p class="caption">Ao exportar, confira no JSON os campos modulesVisited, userReview, checks, data.log e journey. Envie o arquivo de exercício com a descrição de qualquer problema. Não contém aprovação empresarial e não deve receber informações reais.</p>'+
  reviewForm+
  '<div class="journey-list" id="whole-program-areas">'+rows+'</div>',true);
}

/* Painéis observáveis como plug-in independente; erro ou desativação retorna às telas legadas. */
function observerResult(s){
 try{
  const reg=window.HLGBLabModules;
  const r=reg&&reg.call('observabilidade','analyze',s);
  return r&&r.ok?r.data:null;
 }catch(error){return null}
}


function bomCutPanels(s){
 const eligible=s.orders.filter(o=>Array.isArray(o.colorGrades)&&o.colorGrades.length&&
  (Object.values(o.cut).every(n=>n===0)||(s.bomCutRuns||[]).some(r=>r.orderId===o.id)));
 const colors=[...new Set(eligible.flatMap(o=>o.colorGrades.map(x=>x.color)))];
 const cuts=s.bomCutRuns||[];
 return panel('Corte BOM · vários materiais por cor/tamanho, somente laboratório',
  '<p>Antes de cortar, complete a grade por cor em Facções. A prévia é somente leitura. A conclusão desconta todos os materiais juntos, sem misturar com o Corte antigo.</p>'+
  form('cut.bom.execute','Conferir e concluir lote multimatéria',[
   field('orderId','Pedido ainda sem corte tradicional','select','',
    selector(eligible,o=>o.id+' · '+(ref(s.products,o.productId)?.name||'Modelo'))),
   field('color','Cor','select','',colors.map(c=>[c,c])),
   field('size','Tamanho','select','',api.sizes.map(z=>[z,z])),
   field('qty','Peças para cortar','int','1'),
   field('workMode','Origem do corte','select','',[['interno','Interno'],['externo','Externo']]),
   field('cutterOne','Cortador 1','text','Ana Cortadora'),
   field('cutterTwo','Cortador 2','text','Beto Cortador'),
   field('spreader','Enfestador','text','Carla Enfestadora'),
   ...s.materials.map(m=>field('waste_'+m.id,'Lixo de '+m.name+' (g)','int','0')),
   field('signatureOne','Conferência do cortador 1','text','Ana Cortadora'),
   field('signatureTwo','Conferência do cortador 2','text','Beto Cortador'),
   field('reason','Observação obrigatória','text','Corte BOM fictício')
  ],'Concluir e baixar estoque fictício')+
  '<div class="actions"><button class="btn" type="button" id="preview-bom-cut">Prévia de materiais e estoque (sem baixa)</button></div>'+
  '<p class="caption">Informe desperdício somente para materiais usados na ficha da variação. Conferências digitadas não equivalem a assinatura legal.</p>',true)+
 panel('Histórico de corte BOM — por cor e material',
  table(['Lote','Pedido','Cor','Tamanho','Qtd','Materiais','Total (g)','Comando'],
   cuts.map(x=>[str(x.id),str(x.orderId),str(x.color),str(x.size),
    str(x.qty),str(x.materials.length),str(x.totalGrams),str(x.commandId)]))+
  '<h3>Baixas auditáveis por material</h3>'+
  table(['Lote','Material','Útil (g)','Desperdício (g)','Total (g)','Regra congelada','Custo estimado'],
   cuts.flatMap(x=>x.materials.map(m=>[str(x.id),
    str(ref(s.materials,m.materialId)?.name||m.materialId),
    str(m.requiredGrams),str(m.scrapGrams),str(m.totalGrams),
    str(m.ruleId),fmt(m.theoreticalCostCents)]))),true);
}
function materialPlannerResult(s){
 try{return window.HLGBLabMaterialsPlannerV1?.preview(s)||null}
 catch(error){return {error:String(error.message||error)}}
}
function materialRecipePanels(s){
 const catalog=(s.colorCatalog||window.HLGBLabMaterialsPlannerV1?.seed?.()||[]),
   colorChoices=[['*','Todas as cores'],...catalog.map(x=>[x.name,x.name])],
   sizeChoices=[['*','Todos os tamanhos'],...api.sizes.map(sz=>[sz,sz])],
   materials=selector(s.materials,x=>x.name),products=selector(s.products,x=>x.name);
 const recipes=s.materialRecipeRules||[];
 return panel('Paleta central de cores — reaproveitar no pedido e na produção',
  '<p>Cadastre cada cor uma única vez. O cadastro não renomeia cores usadas em pedidos anteriores.</p>'+
  form('color.catalog.add','Incluir cor reutilizável',[
   field('name','Nome único da cor','text','Azul-marinho')
  ],'Cadastrar nova cor')+
  table(['Código','Cor','Origem'],catalog.map(x=>[
   str(x.id),str(x.name),str(x.origin)])),true)+
 panel('Ficha técnica de materiais por modelo, cor e tamanho',
  '<p>Defina consumo específico em gramas por peça. Para o material principal, a regra substitui <strong>apenas na previsão</strong> o consumo básico; materiais adicionais, como renda ou tule, são somados ao principal. Regras mais específicas prevalecem sobre regras gerais.</p>'+
  form('material.recipe.set','Nova versão da receita de planejamento',[
   field('productId','Modelo','select','',products),
   field('materialId','Material ou aviamento','select','',materials),
   field('color','Cor aplicável','select','',colorChoices),
   field('size','Tamanho aplicável','select','',sizeChoices),
   field('gramsPerUnit','Consumo deste componente por peça (g)','int','15'),
   field('reason','Justificativa da receita','text','Estimativa fictícia aprovada para previsão')
  ],'Registrar regra sem alterar corte')+
  table(['Versão','Modelo','Material','Cor','Tamanho','g/peça','Situação','Motivo'],
   recipes.map(r=>[str(r.id),str(ref(s.products,r.productId)?.name||r.productId),
    str(ref(s.materials,r.materialId)?.name||r.materialId),
    str(r.color==='*'?'Todas':r.color),str(r.size==='*'?'Todos':r.size),
    str(r.gramsPerUnit),r.active?'Atual':'Substituída',str(r.reason)]))+
  '<p class="caption">Nunca altera silenciosamente o estoque nem as folhas de corte concluídas. O consumo efetivo do Corte permanece na rotina antiga até homologação posterior.</p>',true);
}

function requestPanels(s){
 const mod=window.HLGBLabPurchaseRequestsV1,planner=window.HLGBLabMaterialsPlannerV1;
 let result,error='';
 try{result=mod?.preview(s,planner)}catch(e){error=String(e.message||e)}
 const requests=s.purchaseRequests||[],drafts=requests.filter(x=>x.status==='rascunho'),
  approved=requests.filter(x=>x.status==='aprovada'),
  cancelable=requests.filter(x=>['rascunho','aprovada'].includes(x.status)),
  issuedNotReceived=requests.filter(x=>x.status==='emitida'&&
   s.purchaseOrders.some(p=>p.id===x.purchaseId&&!p.received&&!p.cancelled)),
  choices=(items)=>selector(items,x=>x.id+' · '+
   (ref(s.materials,x.materialId)?.name||x.materialId)+' · '+x.qtyGrams+'g · '+x.status),
  missing=result?.pendingMaterials||[],
  materials=missing.map(m=>[m.materialId,m.name+' · falta '+m.missingGrams+
   'g · custo '+fmt(m.purchaseCents)]);
 return panel('Requisições de compra · origem e aprovação antes de emitir',
  '<p>O déficit vem do planejamento semanal de produção. Criar requisição apenas registra um rascunho. Aprovação por outra pessoa e emissão são etapas separadas; <b>nenhuma etapa baixa estoque ou gera título financeiro</b>. Só o recebimento da compra faz isso.</p>'+
  (error?'<p class="caption">Previsão indisponível: '+str(error)+'</p>':'')+
  form('purchase.request.create','1. Solicitar material faltante',[
   field('materialId','Material com déficit no cenário','select','',materials),
   field('requester','Solicitante fictício','text','Comprador Exemplo'),
   field('reason','Necessidade da produção','text','Reposição para a programação semanal fictícia')
  ],'Criar rascunho da requisição')+
  form('purchase.request.approve','2. Aprovar com responsável diferente',[
   field('id','Requisição em rascunho','select','',choices(drafts)),
   field('approver','Responsável pela aprovação','text','Supervisora Exemplo'),
   field('reason','Motivo da aprovação','text','Quantidade e necessidade conferidas no laboratório')
  ],'Aprovar requisição fictícia')+
  form('purchase.request.issue','3. Emitir compra após aprovação',[
   field('id','Requisição aprovada','select','',choices(approved)),
   field('supplierId','Fornecedor da compra','select','',selector(s.suppliers,x=>x.name)),
   field('checkerOne','Conferente 1','text','Aline Teste'),
   field('checkerTwo','Conferente 2','text','Beto Exemplo'),
   field('reason','Observação de emissão','text','Compra fictícia autorizada no laboratório')
  ],'Emitir compra sem receber estoque')+
  form('purchase.request.cancel','Cancelar rascunho ou requisição aprovada',[
   field('id','Requisição não emitida','select','',choices(cancelable)),
   field('reason','Justificativa para cancelamento','text','Revisão de programação ou estoque')
  ],'Cancelar e manter histórico')+
  form('purchase.request.cancelIssued','Cancelar formalmente compra emitida ainda não recebida',[
   field('id','Requisição emitida','select','',choices(issuedNotReceived)),
   field('reference','Referência única do cancelamento','text','CANCEL-EXEMPLO-001'),
   field('cancelledBy','Responsável fictício','text','Compradora Exemplo'),
   field('reviewedBy','Conferente independente','text','Supervisora Exemplo'),
   field('reason','Motivo formal da desistência','text','Fornecedor e produção reprogramados na simulação')
  ],'Cancelar emissão sem apagar a compra')+
  '<p class="caption">A requisição emitida só pode ser cancelada se não houver recebimento, entrada de material nem título financeiro. A compra é conservada como cancelada e deixa de aparecer no formulário de recebimento. Nomes digitados não comprovam identidade nem comunicação ao fornecedor.</p>',true)+
 panel('Histórico de requisições e compras vinculadas',
  table(['Requisição','Insumo','Necessidade (g)','Saldo na origem (g)','Falta (g)',
   'Valor estimado','Solicitante / aprovador','Situação','Compra'],
   requests.map(x=>[str(x.id),str(ref(s.materials,x.materialId)?.name||x.materialId),
    str(x.requiredGrams),str(x.availableGrams),str(x.qtyGrams),fmt(x.estimatedCents),
    str(x.requester)+' / '+str(x.approver||'—'),str(x.status),
    str(x.purchaseId||'—')+
    (x.cancelIssueReference?' · ref. '+str(x.cancelIssueReference):'')]))+
  '<p class="caption">Rascunhos, aprovações, cancelamentos, emissões e recebimentos mantêm seus IDs e eventos; exporte JSON/CSV para conferência.</p>',true);
}
function materialsPlanningPanels(s){
 const catalog=(s.colorCatalog||window.HLGBLabMaterialsPlannerV1?.seed?.()||[]),
  colors=catalog.map(x=>[x.name,x.name]),
  products=selector(s.products,x=>x.name+' · '+x.sku),
  current=(s.materialPlanLines||[]),active=current.filter(x=>x.active),
  result=materialPlannerResult(s);
 return panel('Planejador semanal de produção — várias peças e vários modelos',
  '<p>Monte um cenário fictício com a quantidade de cada modelo, cor e tamanho. Cada linha pode ser arquivada, mas o histórico é preservado. O cálculo <strong>não cria compra, não reserva material e não baixa estoque</strong>.</p>'+
  form('materials.plan.grade.add','Adicionar a grade P/M/G/GG de uma vez',[
   field('productId','Modelo','select','',products),
   field('color','Cor','select','',colors),
   ...api.sizes.map(sz=>field(sz,'Quantidade '+sz,'int',sz==='M'?'20':'0'))
  ],'Adicionar todos os tamanhos em uma única operação')+
  form('materials.plan.add','Adicionar uma quantidade ao cenário',[
   field('productId','Modelo','select','',products),
   field('color','Cor','select','',colors),
   field('size','Tamanho','select','',api.sizes.map(sz=>[sz,sz])),
   field('qty','Quantidade prevista de peças','int','50')
  ],'Adicionar ao planejamento')+
  form('materials.plan.archive','Arquivar linha sem excluir o histórico',[
   field('id','Linha ativa','select','',
    selector(active,x=>x.id+' · '+ref(s.products,x.productId)?.name+' · '+x.color+' '+x.size+' · '+x.qty+' peças')),
   field('reason','Motivo da alteração','text','Replanejamento da produção fictícia')
  ],'Arquivar linha e manter registro')+
  table(['Linha','Modelo','Cor','Tamanho','Peças','Situação'],
   current.map(x=>[str(x.id),str(ref(s.products,x.productId)?.name||x.productId),
    str(x.color),str(x.size),str(x.qty),x.active?'No cenário':'Arquivada'])),true)+
 panel('Lista consolidada de materiais e compra sugerida',
  result?.error?'<p class="error">'+str(result.error)+'</p>':
  (result?'<p>'+str(result.lines)+' linha(s), '+str(result.pieces)+' peça(s) planejadas · custo teórico '+fmt(result.estimatedCostCents)+' · compra faltante estimada '+fmt(result.missingCostCents)+'.</p>'+
  table(['Material','Necessidade (g)','Saldo fictício (g)','Falta comprar (g)','Custo teórico','Valor estimado da falta'],
   result.materials.map(x=>[str(x.name),str(x.requiredGrams),str(x.availableGrams),
    str(x.missingGrams),fmt(x.costCents),fmt(x.purchaseCents)]))+
  '<h3>Resumo por modelo</h3>'+
  table(['Modelo','Peças','Linhas','Material total (g)'],result.products.map(x=>[
   str(x.name)+' · '+str(x.sku),str(x.pieces),str(x.lines),str(x.requiredGrams)]))+
  '<h3>Detalhes da receita por cor e tamanho</h3>'+
  table(['Modelo','Cor','Tamanho','Qtd','Material','g/peça','Total (g)','Regra utilizada'],
   result.detail.map(x=>[str(x.productName),str(x.color),str(x.size),str(x.qty),
    str(x.materialName),str(x.gramsPerUnit),str(x.requiredGrams),
    str(x.ruleId==='ficha-basica'?'Ficha básica':x.ruleId)])):
  '<p>Planejador indisponível nesta versão de testes.</p>')+
  '<div class="actions"><button type="button" class="btn" id="export-shopping-csv">Baixar lista exclusiva de materiais CSV</button></div>'+
  '<p class="caption">A comparação considera uma nova produção hipotética e os saldos atuais do laboratório. Não desconta material de pedidos futuros já existentes nem calcula perdas por cor; confira o estoque físico, desperdício, unidade e preços antes de uma compra real.</p>',true);
}
function observationPanels(s,area){
 const o=observerResult(s);
 if(!o)return null;
 const f=o.findings,metric=[
  ['Eventos históricos',str(o.summary.events)],
  ['Ocorrências em aberto',str(o.summary.openIncidents)],
  ['Alertas críticos',str(o.summary.bySeverity.critica)],
  ['Revisão do documento',str(o.summary.lastRevision)]
 ];
 const summary=panel('Observabilidade 2.0 · dados locais de teste',
  '<p>Diagnóstico independente por módulo, sem autocorreção ou gravação. Não comprova ausência de bugs no HLGB real.</p>'+
  table(['Indicador','Resultado'],metric));
 if(area==='auditor'){
  return summary+panel('Inconsistências e origem provável',
   '<p><strong>'+str(f.length)+' alertas</strong> · '+str(o.status)+
   '. Cada linha indica o registro, a regra verificável e a orientação sem executar alterações.</p>'+
   table(['Gravidade','Regra','Módulo','Registro','Evidência','Próxima conferência'],
    f.slice(0,100).map(x=>[str(x.severity),str(x.code),str(x.module),
    str(x.recordId),str(x.message)+'<div class="caption">'+str(x.evidence)+'</div>',str(x.action)]))+
   (f.length>100?'<p class="caption">Exibidos 100 alertas; exporte JSON para todos os detalhes.</p>':'')+
   '<p class="caption">Sem alertas significa apenas que as regras cobertas não encontraram divergência.</p>',true)+
   panel('Cobertura e limitações',
    table(['Conferência','Escopo'],[
     ['Identificadores e eventos','Duplicidade de IDs, comandos e revisão'],
     ['Pedidos e financeiro','Conta a receber correspondente'],
     ['Compras e estoque','Entrada única e título de fornecedor'],
     ['Corte e materiais','Baixa única por folha concluída'],
     ['Corte BOM com múltiplos materiais','Baixa por material, lote, desperdício, versão e dupla conferência'],
     ['Acertos e compensações','Valor/status, pagamento original, referência e novo título'],
     ['Grade por cor e tamanho','Pedido ↔ corte por tamanho ↔ oficina ↔ retorno ↔ acerto'],
     ['Saúde do HLGB real','Não verificada (sem Supabase ou autenticação)']
    ]),true);
 }
 if(area==='bot'){
  return summary+panel('Assistente de triagem orientado por evidências',
   '<p>Em vez de mensagens genéricas, cada orientação informa o motivo, a quantidade de registros envolvidos e o módulo para conferir. Repetições são agrupadas por regra; <strong>não é IA autônoma</strong> e nenhuma correção é executada.</p>'+
   (o.recommendations.length?o.recommendations.map(x=>
    '<div class="journey-step"><div><strong>'+str(x.priority.toUpperCase())+
    ' · '+str(x.code)+'</strong><p class="caption">'+str(x.why)+
    ' · '+str(x.evidence)+'</p><p>'+str(x.action)+'</p></div>'+
    '<button class="btn" type="button" data-goto="'+str(x.module)+'">Conferir módulo</button></div>'
   ).join(''):'<div class="success">Nenhuma recomendação nas regras locais cobertas.</div>'),true)+
   panel('Aprendizado verificável do histórico (não autônomo)',
    table(['Operação','Vezes registrada'],o.repeatedOperations.map(x=>
     [str(x.type),str(x.count)]))+
    '<p class="caption">Contagens por tipo de evento; não inferem causas nem alteram código.</p>',true);
 }
 if(area==='relatorios'){
  return summary+panel('Histórico completo de operações fictícias',
   '<p>'+str(o.summary.historyExported)+' eventos registrados. Exiba as últimas 150 linhas na tela e exporte o histórico completo em CSV/JSON. Eventos anteriores não são apagados por este módulo.</p>'+
   '<div class="field"><label for="history-search">Pesquisar comando, revisão, módulo, pessoa ou descrição</label>'+
   '<input class="input" type="search" id="history-search" data-filter-for="audit-history-table" placeholder="Ex.: finance.pay, ACE-0001"></div>'+
   '<div id="audit-history-table">'+table(['Revisão','Comando','Área','Operação','Operador','Descrição'],
    o.history.slice(0,150).map(x=>[str(x.revision),str(x.commandId),
     str(x.module),str(x.type),str(x.actor),str(x.description)]))+'</div>'+
   '<div class="actions"><button type="button" class="btn primary" id="export-observer-csv">Exportar auditoria completa CSV</button></div>',true)+
   panel('Atividade por módulo',
    table(['Módulo','Ações registradas'],o.moduleActivity.map(x=>[str(x.module),str(x.count)])),true)+
   panel('Produção e pedidos por modelo',
    '<p>Quantidades do fluxo e <strong>valor previsto</strong> das encomendas, que não representa dinheiro recebido.</p>'+
    table(['Modelo','Pedidos','Pedidas','Cortadas','Retornadas','Expedidas','Valor previsto'],
     o.modelSummary.map(x=>[str(x.name)+' · '+str(x.sku),str(x.orders),
      str(x.ordered),str(x.cut),str(x.returned),str(x.shipped),
      fmt(x.plannedReceivablesCents)])),true)+
   panel('Corte BOM: materiais, custo teórico e desperdício conferidos',
    '<p>'+str(o.summary.bomCuts)+' lote(s) com baixa fictícia · '+
    str(o.summary.bomUsefulGrams)+' g úteis · '+str(o.summary.bomScrapGrams)+
    ' g de lixo. Cada componente possui um movimento de estoque vinculado ao lote.</p>'+
    table(['Lote','Pedido','Cor','Tamanho','Peças','Útil + lixo (g)','Custo teórico'],
     o.bomCutHistory.map(c=>[
      str(c.id),str(c.orderId),str(c.color),str(c.size),str(c.qty),
      str(c.totalGrams),fmt(c.estimatedCostCents)]))+
    table(['Lote','Insumo','Útil (g)','Lixo (g)','Movimentado (g)','Versão da receita'],
     o.bomCutHistory.flatMap(c=>c.materials.map(m=>[
      str(c.id),str(m.materialName),str(m.requiredGrams),
      str(m.scrapGrams),str(m.totalGrams),str(m.ruleId)]))),true)+
   panel('Grade por cor e tamanho — pedidos classificados',
    '<p>'+str(o.summary.ordersWithColorGrade)+' pedido(s) com cores e tamanhos · '+
    str(o.summary.gradePiecesOpen)+' peça(s) pendentes nas facções. Cada tamanho precisa bater com o pedido e com o corte.</p>'+
    table(['Pedido','Cor','P','M','G','GG','Situação'],
     o.colorGradeSummary.flatMap(o=>o.byColor.map(g=>[
      str(o.orderId),str(g.color),...api.sizes.map(sz=>str(g.sizes[sz])),
      o.ready?'Grade completa':'Faltam cores/tamanhos']))),true)+
   panel('Saldo real por facção, cor e tamanho (laboratório)',
    table(['Pedido','Envio','Oficina','Cor','Tamanho','Enviadas','Retornadas','Pendentes','Acertos'],
     o.gradeInventory.map(g=>[str(g.orderId),str(g.assignmentId),
      str(g.factionName),str(g.color),str(g.size),str(g.sent),
      str(g.returned),str(g.open),g.settlementIds.map(str).join(' · ')||'—'])),true)+
   panel('Distribuição e retorno por facção em cada pedido',
    '<p>'+str(o.summary.distributedOrders)+' pedido(s) dividido(s) entre várias facções · '+
    str(o.summary.openFactionPieces)+' peça(s) ainda não retornadas nos envios. Dados fictícios com rastreio por envio.</p>'+
    table(['Envio','Pedido','Produto','Facção','Enviadas','Retornadas','Pendentes','Acertos vinculados'],
     o.factionDispatches.map(x=>[
      str(x.id),str(x.orderId),str(x.productName),str(x.factionName),
      str(x.qtySent),str(x.qtyReturned),str(x.qtyOpen),
      x.settlementIds.map(str).join(' · ')||'—'])),true)+
   panel('Rastro de transferências entre facções · antes e depois',
    '<p>'+str(o.summary.partialFactionTransfers)+' transferência(s), '+
    str(o.summary.piecesTransferred)+' peça(s) redistribuídas. O histórico de acertos anteriores não é regravado.</p>'+
    table(['Transferência','Pedido','Origem → destino','Peças','Origem antes/depois','Destino antes/depois','Motivo'],
     o.factionTransferHistory.map(t=>[
      str(t.id),str(t.orderId),str(t.fromName)+' → '+str(t.toName),
      str(t.qty),str(t.fromBefore)+' → '+str(t.fromAfter),
      str(t.toBefore)+' → '+str(t.toAfter),str(t.reason)])),true)+
   panel('Acertos e pagamentos por facção',
    '<p>Os valores quitados são somente confirmações fictícias. Correções pós-pagamento aparecem à parte.</p>'+
    table(['Facção','Acertos','Peças','Total','Pago fictício','Em aberto','Compensações líquidas'],
     o.factionSummary.map(x=>[str(x.name),str(x.settlements),str(x.pieces),
      fmt(x.totalSettlementsCents),fmt(x.paidSettlementsCents),
      fmt(x.openSettlementsCents),(x.compensationNetCents<0?'−':x.compensationNetCents>0?'+':'')+
       fmt(Math.abs(x.compensationNetCents))])),true)+
   panel('Fechamentos coletivos por referência',
    '<p>Lotes de títulos de Acertos/Facções e compensações; verifique separadamente cada origem e sem reescrever valores quitados.</p>'+
    table(['Lote','Referência','Motivo','Quantidade','Total fictício','Títulos vinculados'],
     o.paymentBatchHistory.map(b=>[
      str(b.id),str(b.reference),str(b.reason),str(b.count),fmt(b.totalCents),
      b.items.map(i=>str(i.financeId)+' · '+str(i.sourceId)).join(' | ')])),true)+
   panel('Histórico de acertos: antes, depois e justificativas',
    table(['Acerto','Evento','ID do comando','Antes','Depois','Justificativa'],
     o.settlementHistory.slice().reverse().slice(0,120).map(x=>[
      str(x.settlementId),str(x.event),str(x.commandId),fmt(x.beforeCents),
      fmt(x.afterCents),str(x.reason)]))+
    (o.settlementHistory.length>120?'<p class="caption">Mostrados 120 eventos; o JSON preserva o histórico completo.</p>':''),true);
 }
 return null;
}
const financeFilters={from:'2026-11-01',to:'2026-12-31',category:'todos'};
function financeAnalytics(s){
 const service=window.HLGBLabFinanceV1;
 if(!service)return panel('Hub analítico','<p>Módulo indisponível.</p>',true);
 const filter='<div class="fields"><div class="field"><label>De<input class="input" type="date" data-fin-filter="from" value="'+str(financeFilters.from)+'"></label></div><div class="field"><label>Até<input class="input" type="date" data-fin-filter="to" value="'+str(financeFilters.to)+'"></label></div><div class="field"><label>Categoria<select class="input" data-fin-filter="category">'+options([['todos','Todas'],...service.categories.map(x=>[x,x]),['Vínculo não identificado','Vínculo não identificado']],financeFilters.category)+'</select></label></div></div>';
 let r;try{r=service.report(s,financeFilters)}catch(e){return panel('Hub analítico',filter+'<div class="error">'+str(e.message)+'</div>',true)}
 const metrics=[['Entradas realizadas',r.actual.receber],['Saídas realizadas',r.actual.pagar],['A receber no período',r.forecast.receber],['A pagar no período',r.forecast.pagar],['Movimento líquido realizado',r.actual.net],['Movimento líquido projetado',r.projectedNet],['Vencidos a pagar (total)',r.overdue.pagar],['Vencidos a receber (total)',r.overdue.receber]];
 return panel('Hub Financeiro 2.0 · visão gerencial',filter+'<div class="metrics">'+metrics.map(([k,v])=>'<div class="metric"><span>'+str(k)+'</span><strong>'+fmt(v)+'</strong></div>').join('')+'</div><p>Movimento líquido não é saldo bancário: saldo inicial não informado. Referência fictícia: 17/11/2026. Títulos sem data: '+fmt(r.undated.pagar)+' a pagar / '+fmt(r.undated.receber)+' a receber, fora dos totais datados.</p><p>Contas abertas em todos os períodos: '+fmt(r.open.pagar)+' a pagar / '+fmt(r.open.receber)+' a receber.</p>'+ (r.issues.length?'<div class="error">'+str(r.issues.join('; '))+'</div>':'')+'<button type="button" id="finance-report-export" class="btn">Exportar relatório filtrado CSV</button>',true)+
 panel('Fluxo de caixa por dia',table(['Data','Entradas realizadas','Saídas realizadas','Entradas previstas','Saídas previstas','Líquido previsto + realizado'],r.days.map(x=>[str(x.date),fmt(x.actual.receber),fmt(x.actual.pagar),fmt(x.forecast.receber),fmt(x.forecast.pagar),fmt(x.actual.net+x.forecast.net)])),true)+
 panel('Despesas e receitas por categoria',table(['Categoria','Recebido','Pago','A receber','A pagar'],r.categories.map(x=>[str(x.category),fmt(x.actual.receber),fmt(x.actual.pagar),fmt(x.forecast.receber),fmt(x.forecast.pagar)])),true)+
 panel('Relatório filtrado e conferência',table(['Título / descrição','Categoria','Data','Tipo','Valor','Estado','Conferência'],r.rows.map(x=>[str(x.id)+' · '+str(x.description),str(x.category),str(x.date||'Sem data'),str(x.kind),fmt(x.amountCents),str(x.status),str(x.reconciliation)])),true);
}
function financeRevisionPanels(s){
 const eligible=s.finance.filter(x=>!x.sourceId&&x.status==='aberto'&&!x.reconciliation&&!(s.costAllocations||[]).some(a=>a.financeId===x.id));
 const first=eligible[0],optionsFor=selector(eligible,x=>x.id+' · '+x.description+' · '+fmt(x.amountCents));
 const cats=window.HLGBLabFinanceV1.categories.map(x=>[x,x]);
 return panel('Editar lançamento manual aberto',
 form('finance.revise','Corrigir sem apagar o original',[field('id','Título','select',first?.id||'',optionsFor),
 field('description','Descrição','text',first?.description||''),field('amountCents','Valor','money',first?nr(first.amountCents):'0,00'),
 field('category','Categoria','select',first?window.HLGBLabFinanceV1.classify(first,s):'Outras despesas',cats),
 '<div class="field"><label>Vencimento (opcional)<input class="input" type="date" name="dueDate" value="'+str(first?.dueDate||'')+'"></label></div>',
 field('reason','Motivo da alteração','text','')],'Salvar correção')+
 '<p>Somente título manual aberto sem rateio. Não muda tipo, não reabre pagamento e não apaga registro. Títulos gerados por pedido, compra ou acerto exigem correção na origem.</p>'+
 table(['Título','Antes','Depois','Justificativa','Comando'],s.finance.flatMap(x=>(x.revisions||[]).map(v=>[str(x.id),str(v.before.description)+' · '+fmt(v.before.amountCents)+' · '+str(v.before.category||'—')+' · '+str(v.before.dueDate||'—'),str(v.after.description)+' · '+fmt(v.after.amountCents)+' · '+str(v.after.category||'—')+' · '+str(v.after.dueDate||'—'),str(v.reason),str(v.commandId)]))),true);
}
function fillFinanceRevision(f){const x=doc.finance.find(y=>y.id===f.elements.namedItem('id').value);if(!x)return;for(const [k,v] of Object.entries({description:x.description,amountCents:nr(x.amountCents),category:window.HLGBLabFinanceV1.classify(x,doc),dueDate:x.dueDate||'',reason:''}))f.elements.namedItem(k).value=v;}
function financeControlPanels(s){
 const dated=(id,label)=>'<div class="field"><label>'+str(label)+'<input class="input" type="date" name="'+id+'" value="2026-11-17" required></label></div>';
 const open=selector(s.finance.filter(x=>x.status==='aberto'),x=>x.id+' · '+x.description+' · '+fmt(x.amountCents));
 const paid=selector(s.finance.filter(x=>x.status==='pago'&&!x.reconciliation),x=>x.id+' · '+x.description+' · '+fmt(x.amountCents));
 return panel('Programar vencimento e conciliar manualmente',
 form('finance.schedule','Definir ou corrigir vencimento',[field('id','Título aberto','select','',open),dated('dueDate','Vencimento'),field('reason','Motivo','text','Programação fictícia')],'Salvar vencimento')+
 form('finance.reconcile','Conferir título quitado com extrato fictício',[field('id','Título pago sem conferência','select','',paid),field('reference','Referência única do extrato','text','EXT-TESTE-001'),field('amountCents','Valor do extrato R$','money','100,00'),dated('reconcileDate','Data de conferência')],'Conferir valor')+
 '<p>Conferência manual de valor, não integra banco, não paga novamente e não comprova transferência.</p>');
}


let pcpFilter='todos',pcpDate='2026-11-17';
function pcpPanels(s){
 const service=window.HLGBLabPCPV1;if(!service)return '';
 const filters='<div class="fields"><div class="field"><label>Data de referência<input type="date" class="input" id="pcp-date" value="'+str(pcpDate)+'"></label></div><div class="field"><label>Filtrar situação<select class="input" id="pcp-filter">'+options(['todos','Atrasado','Risco de atraso','No prazo estimado','Sem prazo','Expedido'].map(x=>[x,x]),pcpFilter)+'</select></label></div></div>';
 let r;try{r=service.report(s,{asOf:pcpDate})}catch(e){return panel('PCP avançado',filters+'<div class="error">'+str(e.message)+'</div>',true);}
 const m=[['Peças a expedir',r.remaining],['Pedidos atrasados',r.late],['Risco de atraso',r.risk],['Gargalo estimado',r.bottleneck||'Sem carga']];
 const pending=selector(s.orders.filter(o=>o.shipped<sum(o.grade)),o=>o.id+' · '+(ref(s.products,o.productId)?.name||o.productId));
 return panel('PCP avançado · planejamento da produção',filters+'<div class="metrics">'+m.map(([k,v])=>'<div class="metric"><span>'+str(k)+'</span><strong>'+str(v)+'</strong></div>').join('')+'</div><p>Estimativa conservadora em dias corridos, com capacidade diária global e fila por prioridade e prazo. Soma as etapas em sequência; não representa promessa de entrega, feriados, jornada ou paralelismo real. Capacidades iniciais são fictícias e editáveis.</p><button class="btn" type="button" id="pcp-export">Exportar planejamento CSV</button>',true)+
 panel('Programar pedido e prazo',
 form('pcp.plan','Definir prioridade e prazo',[field('orderId','Pedido','select','',pending),'<div class="field"><label>Prazo combinado<input class="input" type="date" name="dueDate" value="2026-11-30" required></label></div>',field('priority','Prioridade','select','',[['normal','Normal'],['urgente','Urgente'],['alta','Alta'],['baixa','Baixa']]),field('reason','Justificativa','text','Planejamento fictício')],'Salvar planejamento'))+
 panel('Capacidade diária prevista',form('pcp.capacity','Peças por dia (capacidade total)',[...service.stages.map(k=>field(k,service.labels[k],'int',String(r.capacity[k]))),field('reason','Justificativa','text','Ajuste de capacidade fictícia')],'Salvar capacidades'))+
 panel('Mapa de carga e gargalos',table(['Etapa','Fila atual','Trabalho futuro total','Capacidade/dia','Dias estimados de carga'],r.loads.map(x=>[str(x.label),str(x.queue),str(x.required),str(x.capacity),str(x.days)]))+'<p>A fila atual distribui cada peça uma única vez; trabalho futuro conta todas as operações ainda necessárias.</p>',true)+
 panel('Pedidos por prioridade e prazo',table(['Pedido / modelo','Cliente','Prioridade','Prazo','Previsão','A expedir','Situação'],r.rows.filter(x=>pcpFilter==='todos'||x.status===pcpFilter).map(x=>[str(x.id)+' · '+str(x.model),str(x.client),str(x.priority),str(x.due||'Sem prazo'),str(x.estimated||'—'),str(x.remaining),str(x.status)])),true)+
 panel('Acompanhamento de facções',table(['Facção','Enviadas','Retornadas','Pendentes','% retorno acumulado','Pedidos'],r.factions.map(x=>[str(x.name),str(x.sent),str(x.returned),str(x.pending),x.returnPercent===null?'—':str(x.returnPercent)+'%',str(x.orders)]))+'<p>Volume acumulado e taxa de retorno, não produtividade por hora: tempos de execução ainda não registrados.</p>',true);
}


const managementFilters={from:'2026-11-01',to:'2026-11-30',module:'todos',query:'',page:1};
function managementPanels(s){
 const svc=window.HLGBLabManagementV1,finance=window.HLGBLabFinanceV1;if(!svc||!finance)return '';
 const filters='<div class="fields"><div class="field"><label>De<input class="input" type="date" data-mgmt-filter="from" value="'+str(managementFilters.from)+'"></label></div><div class="field"><label>Até<input class="input" type="date" data-mgmt-filter="to" value="'+str(managementFilters.to)+'"></label></div><div class="field"><label>Módulo (histórico)<select class="input" data-mgmt-filter="module">'+options([['todos','Todos'],...modules.map(m=>[m[0],m[1]])],managementFilters.module)+'</select></label></div><div class="field"><label>Buscar no histórico<input class="input" type="search" data-mgmt-filter="query" value="'+str(managementFilters.query)+'" placeholder="ID, operador, operação"></label></div></div>';
 let r,p,f,fp;try{r=svc.report(s,managementFilters);p=svc.report(s,svc.previousPeriod(r.from,r.to));f=finance.report(s,{from:r.from,to:r.to});fp=finance.report(s,{from:p.from,to:p.to});}catch(e){return panel('Central gerencial',filters+'<div class="error">'+str(e.message)+'</div>',true);}
 const kpis=[['Peças cortadas (líquido)',r.totals.cut],['Peças retornadas (líquido)',r.totals.returned],['Peças expedidas (líquido)',r.totals.shipped],['Movimento financeiro realizado',fmt(f.actual.net)]];
 const captions={ordered:'Pedidas',cut:'Cortadas',allocated:'Enviadas',returned:'Retornadas',separated:'Separadas',shipped:'Expedidas'};
 const compare=svc.fields.map(k=>[captions[k],str(r.totals[k]),str(p.totals[k]),str(r.totals[k]-p.totals[k])]);
 const hist=table(['Revisão','Data UTC','Módulo','Comando','Operador','Descrição'],r.history.map(x=>[str(x.revision),str(x.date||'Sem data'),str(x.module),str(x.commandId)+' · '+str(x.type),str(x.actor),str(x.description)]));
 return panel('Central de Relatórios Gerenciais · 2.0',filters+'<div class="metrics">'+kpis.map(([k,v])=>'<div class="metric"><span>'+str(k)+'</span><strong>'+str(v)+'</strong></div>').join('')+'</div><p>Período por registro UTC desta prévia. Quantidades são movimentos líquidos, incluindo devoluções e correções; não são saldos acumulados. '+str(r.undated)+' evento(s) sem data e '+str(r.withoutMetrics)+' sem métricas detalhadas não são reconstruídos nem usados como prova de produção por período. Financeiro usa a data de baixa do título, não a data do evento. Os filtros de módulo e texto se aplicam somente ao histórico.</p><div class="actions"><button type="button" class="btn" id="mgmt-export">Exportar relatório gerencial CSV</button><button type="button" class="btn" id="mgmt-json">Exportar relatório gerencial JSON</button></div>',true)+
 panel('Comparativo com período anterior de mesma duração', '<p>'+str(p.from)+' a '+str(p.to)+' · '+str(p.datedEvents)+' eventos datados anteriores. Sem dados não implica ausência de produção.</p>'+table(['Indicador','Período atual','Período anterior','Diferença'],[...compare,['Recebido',fmt(f.actual.receber),fmt(fp.actual.receber),fmt(f.actual.receber-fp.actual.receber)],['Pago',fmt(f.actual.pagar),fmt(fp.actual.pagar),fmt(f.actual.pagar-fp.actual.pagar)]]),true)+
 panel('Produção por dia',table(['Data','Eventos',...svc.fields.map(k=>captions[k])],r.days.map(x=>[str(x.date),str(x.events),...svc.fields.map(k=>str(x[k]))])),true)+
 panel('Produção por modelo no período',table(['Modelo',...svc.fields.map(k=>captions[k])],r.models.map(x=>[str(x.name),...svc.fields.map(k=>str(x[k]))])),true)+
 panel('Estoque movimentado no período',table(['Material','Entradas (g)','Saídas (g)','Variação (g)'],r.materials.map(x=>[str(x.name),str(x.inGrams),str(x.outGrams),str(x.inGrams-x.outGrams)]))+'<p>Não é custo contábil: preços históricos e rateios ainda não foram homologados.</p>',true)+
 panel('Histórico pesquisável · '+r.historyCount+' eventos',hist+'<div class="actions"><button type="button" class="btn" data-mgmt-page="-1" '+(r.page===1?'disabled':'')+'>Anterior</button><span>Página '+r.page+' de '+r.pages+'</span><button type="button" class="btn" data-mgmt-page="1" '+(r.page===r.pages?'disabled':'')+'>Próxima</button></div><p>Eventos sem data continuam pesquisáveis e aparecem identificados. Exportação inclui todas as páginas do filtro.</p>',true);
}
function exportManagement(json){
 const svc=window.HLGBLabManagementV1;try{const r=svc.report(doc,managementFilters),prev=svc.report(doc,svc.previousPeriod(r.from,r.to)),fin=window.HLGBLabFinanceV1.report(doc,{from:r.from,to:r.to}),finPrev=window.HLGBLabFinanceV1.report(doc,{from:prev.from,to:prev.to});
 if(json){download('HLGB-RELATORIO-GERENCIAL-FICTICIO.json',JSON.stringify({environment:'ficticio',revision:doc.revision,current:r,previous:prev,finance:fin,previousFinance:finPrev},null,2),'application/json');return;}
 const rows=[['Tipo','Data/ID','Descrição','Pedidas','Cortadas','Enviadas','Retornadas','Separadas','Expedidas','Entradas g','Saídas g','Recebido centavos','Pago centavos'],['Total',r.from+' a '+r.to,'Período atual',...svc.fields.map(k=>r.totals[k]),'','',fin.actual.receber,fin.actual.pagar],['Total',prev.from+' a '+prev.to,'Período anterior',...svc.fields.map(k=>prev.totals[k]),'','',finPrev.actual.receber,finPrev.actual.pagar],...r.days.map(x=>['Dia',x.date,'Eventos: '+x.events,...svc.fields.map(k=>x[k])]),...r.models.map(x=>['Modelo',x.productId,x.name,...svc.fields.map(k=>x[k])]),...r.materials.map(x=>['Material',x.materialId,x.name,'','','','','','',x.inGrams,x.outGrams]),...r.historyAll.map(x=>['Histórico',x.date||'Sem data',x.commandId+' · '+x.type+' · '+x.actor+' · '+x.description])];
 download('HLGB-RELATORIO-GERENCIAL-FICTICIO.csv','\uFEFF'+rows.map(x=>x.map(safeCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');}catch(e){status(e.message,'error');}
}


let auditFilter='todos';
function auditorV3(s){try{return window.HLGBLabAuditorV3?.analyze(s)||null;}catch(e){return null;}}
function auditV3Panels(s){
 const r=auditorV3(s);if(!r)return panel('Auditor 3.0','<div class="error">Diagnóstico indisponível. Nenhuma aprovação pode ser inferida.</div>',true);
 const active=r.findings.filter(x=>x.code!=='AUDITOR_REGRA_FALHOU').map(x=>[x.key,x.key+' · '+x.message]);
 const ready=r.previously.filter(x=>x.state==='aguarda_verificacao'&&r.checks.find(c=>c.id===x.checkId)?.status==='conforme').map(x=>[x.key,x.key]);
 const rows=r.findings.filter(x=>auditFilter==='todos'||x.severity===auditFilter);
 return panel('Auditor 3.0 · diagnóstico e prevenção', '<div class="metrics">'+[['Críticas',r.bySeverity.critica],['Altas',r.bySeverity.alta],['Regras avaliadas',r.checks.length],['Estado',r.status==='sem_alertas_nas_regras_cobertas'?'Sem alertas nas regras cobertas':r.status==='cobertura_parcial'?'Cobertura parcial':'Investigar']].map(([k,v])=>'<div class="metric"><span>'+str(k)+'</span><strong>'+str(v)+'</strong></div>').join('')+'</div><p>Revisão '+str(r.revision)+' · '+str(r.legacyEvents)+' eventos sem métricas · '+str(r.undatedEvents)+' sem data. Avalia somente a cópia local fictícia; não verifica disponibilidade do servidor, não corrige automaticamente nem aprova produção.</p><div class="actions"><button type="button" class="btn" id="audit-v3-run">Reexecutar diagnóstico local</button><button type="button" class="btn" id="audit-v3-export">Exportar evidência JSON</button></div>',true)+
 panel('Cobertura por regra',table(['Regra','Resultado','Ocorrências'],r.checks.map(x=>[str(x.label),str(x.status),str(x.findings)])),true)+
 panel('Ocorrências verificáveis','<div class="field"><label>Gravidade<select class="input" id="audit-v3-filter">'+options([['todos','Todas'],['critica','Crítica'],['alta','Alta'],['media','Média'],['informativa','Informativa']],auditFilter)+'</select></label></div>'+table(['Gravidade / regra','Registro','Evidência','Orientação','Investigação'],rows.map(x=>[str(x.severity)+' · '+str(x.code),str(x.recordId),str(x.message)+'<div class="caption">'+str(x.evidence)+'</div>',str(x.action)+(ids.has(x.module)?'<div class="actions"><button class="btn" type="button" data-goto="'+str(x.module)+'">Abrir módulo</button></div>':''),x.review?str(x.review.note)+' · revisão '+str(x.review.revision):'Não registrada'])),true)+
 panel('Investigar ocorrência sem ocultar alerta',form('audit.review','Registrar evidência da investigação',[field('key','Ocorrência ativa','select','',active),field('status','Ação','select','',[['investigado','Registrar investigação']]),field('note','Evidência / observação','text','Conferência fictícia')],'Registrar investigação')+'<p>Registrar uma nota nunca elimina a ocorrência ativa.</p>')+
 panel('Confirmar resolução somente após rechecagem',form('audit.review','Registrar verificação',[field('key','Ocorrência ausente com regra conforme','select','',ready),field('status','Ação','select','',[['verificado','Confirmar verificação']]),field('note','Evidência da rechecagem','text','Regra reexecutada')],'Confirmar verificação')+table(['Ocorrência anterior','Situação','Última evidência'],r.previously.map(x=>[str(x.key),str(x.state),str(x.note)])));
}


function botV3(s){try{const a=auditorV3(s);return a?window.HLGBLabBotV3?.analyze(s,a)||null:null;}catch(e){return null;}}
function botV3Panels(s){
 const r=botV3(s);if(!r)return panel('Bot 3.0','<div class="error">Aprendizado indisponível. Confira o Auditor.</div>',true);
 const active=r.active,choices=active.filter(x=>x.observationId).map(x=>[x.key,x.key+' · '+x.message]),first=active.find(x=>x.observationId);
 const obs=(s.botObservations||[]).slice().reverse().map(x=>[x.commandId,'Revisão '+x.operationalRevision+' · '+x.findings.length+' ocorrências']);
 return panel('Bot 3.0 · aprendizado baseado em evidências','<div class="metrics">'+[['Observações registradas',r.observations],['Erros persistentes',r.persistent],['Regras recorrentes',r.recurring.length],['Feedback útil',r.outcomes.util]].map(([k,v])=>'<div class="metric"><span>'+str(k)+'</span><strong>'+str(v)+'</strong></div>').join('')+'</div><p>Aprende por comparação de observações de revisões operacionais distintas. A prioridade começa pela gravidade do Auditor, depois pela persistência comprovada. Não é treinamento de IA; não executa pagamentos, alterações nem reparos. Feedback não encerra alertas.</p>'+(r.integrity.length?'<div class="error">'+str(r.integrity.join('; '))+'</div>':'')+(r.canObserve?form('bot.observe','Registrar diagnóstico desta revisão',[],'Registrar observação'):'<p>Nova observação indisponível: mesma revisão operacional, integridade ou diagnóstico incompleto.</p>')+'<div class="actions"><button type="button" class="btn" id="bot-v3-export">Exportar aprendizado JSON</button></div>',true)+
 panel('Fila de recomendações por gravidade e recorrência',table(['Regra / registro','Prioridade','Observações','Evidências / orientação','Feedback'],active.map(x=>[str(x.key),str(x.severity)+' · '+str(x.priorityReason),str(x.observations),str(x.evidence)+'<div class="caption">'+str(x.action)+'</div>'+(ids.has(x.module)?'<button class="btn" type="button" data-goto="'+str(x.module)+'">Conferir módulo</button>':''),str(x.feedback?.outcome||'Sem feedback')])),true)+
 panel('Registrar resultado da recomendação',form('bot.feedback','Avaliar orientação documentada',[field('observationId','Observação que contém a ocorrência','select','',obs),field('key','Ocorrência','select','',choices),field('outcome','Resultado','select','',[['investigando','Investigando'],['util','Útil'],['nao_util','Não útil']]),field('note','Evidência / motivo','text','Conferência fictícia')],'Registrar feedback')+'<p>Escolha uma observação que contenha a ocorrência. O sistema valida o vínculo.</p>')+
 panel('Padrões recorrentes',table(['Regra','Observações distintas','Ocorrências ativas'],r.recurring.map(x=>[str(x.code),str(x.observations),str(x.active)]))+table(['Ocorrência manual','Registros','Abertos'],r.incidentPatterns.map(x=>[str(x.message),str(x.count),str(x.open)])),true)+
 panel('Ocorrências não detectadas atualmente',table(['Registro','Última observação','Estado'],r.inactive.map(x=>[str(x.key),str(x.last),x.verified?'Verificado pelo Auditor':'Ausente agora; resolução não comprovada'])),true)+
 panel('Histórico de aprendizado',table(['Comando','Revisão operacional','Ocorrências'],r.history.slice().reverse().map(x=>[str(x.commandId),str(x.operationalRevision),str(x.findings)]))+table(['Ocorrência','Resultado','Evidência'],r.feedbackHistory.slice().reverse().map(x=>[str(x.key),str(x.outcome),str(x.note)])),true);
}


const assistantFilters={topic:'prioridades',question:'',reference:'',from:'2026-11-01',to:'2026-11-30',asOf:'2026-11-17',stockLimitGrams:5000};
let assistantRequested=false;
function assistantAsk(s){return window.HLGBLabAssistantV3?.ask(s,{audit:window.HLGBLabAuditorV3,bot:window.HLGBLabBotV3,finance:window.HLGBLabFinanceV1,pcp:window.HLGBLabPCPV1,management:window.HLGBLabManagementV1},assistantFilters);}
function assistantPanels(s){
 const svc=window.HLGBLabAssistantV3;if(!svc)return panel('Assistente HLGB 3.0','<p>Consulta indisponível.</p>',true);
 const input=(k,label,type='text')=>'<div class="field"><label>'+str(label)+'<input class="input" type="'+type+'" data-assistant-filter="'+k+'" value="'+str(assistantFilters[k])+'"></label></div>';
 const fields='<div class="fields"><div class="field"><label>Consulta<select class="input" data-assistant-filter="topic">'+options([['auto','Interpretar pergunta'],...svc.topics.map(x=>[x[0],x[1]])],assistantFilters.topic)+'</select></label></div>'+input('question','Pergunta curta (modo interpretar)')+input('reference','ID ou nome do modelo')+input('from','De','date')+input('to','Até','date')+input('asOf','Data de referência','date')+input('stockLimitGrams','Limite de estoque em gramas','number')+'</div>';
 let response='<p>Escolha uma consulta ou escreva uma pergunta curta. Clique em consultar para ler a revisão local atual.</p>';
 if(assistantRequested){try{const r=assistantAsk(s);response='<p>Revisão '+str(r.revision)+' · '+str(r.status)+' · somente leitura</p><div class="metrics">'+r.summary.map(x=>'<div class="metric"><span>'+str(x.label)+'</span><strong>'+str(x.value)+'</strong></div>').join('')+'</div>'+r.warnings.map(x=>'<p class="caption">'+str(x)+'</p>').join('')+table(['Registro','Descrição','Evidência / resultado','Origem'],r.rows.slice(0,100).map(x=>[str(x.id),str(x.label),str(x.detail),ids.has(x.module)?'<button class="btn" type="button" data-goto="'+str(x.module)+'">'+str(x.module)+'</button>':str(x.module)]))+'<p>Fontes: '+str(r.sources.join(', '))+' · '+str(r.rows.length)+' registros; até 100 exibidos. Exportação inclui todos.</p><button type="button" class="btn" id="assistant-export">Exportar resposta JSON</button>';}catch(e){response='<div class="error">'+str(e.message)+'</div>';}}
 return panel('Assistente HLGB 3.0 · consultas de gestão',fields+'<div class="actions"><button type="button" class="btn primary" id="assistant-query">Consultar dados</button></div><p>Consultas determinísticas na base fictícia, sem IA generativa, sem execução de comandos e sem acesso ao banco real. Perguntas desconhecidas não recebem respostas inventadas.</p>'+response,true);
}


function costsResult(s){return window.HLGBLabCostsV1?.report(s);}
function costsPanels(s){
 let r;try{r=costsResult(s);if(!r)throw Error('Módulo indisponível');}catch(e){return panel('Custos e rentabilidade','<div class="error">'+str(e.message)+'</div>',true);}
 const val=x=>x===null?'Não apurado':fmt(x),g=t=>table(['Grupo','Pedidos','Peças','Receita contratada','Custos conhecidos','Pedidos com resultado parcial','Diferença parcial (só estes pedidos)'],t.map(x=>[str(x.name),str(x.orders),str(x.pieces),fmt(x.revenue),fmt(x.knownCost),str(x.complete),x.complete?fmt(x.partialDifference):'Não apurado']));
 const available=r.manual.filter(x=>x.remaining>0).map(x=>[x.id,x.id+' · '+x.description+' · saldo '+fmt(x.remaining)]);
 return panel('Custos e rentabilidade · controle gerencial','<p>Valores acumulados por pedido, não DRE nem lucro líquido. Materiais são valorados pelo preço de referência registrado no corte (não custo médio contábil). Mão de obra usa acertos e compensações vinculados, pagos ou não. Não soma novamente o título financeiro do acerto. Receita contratada não significa recebimento. Margem parcial somente para pedido expedido, com consumo valorado e retorno integral; despesas não vinculadas, impostos e outros custos podem faltar.</p><div class="metrics">'+[['Receita contratada',fmt(r.totals.revenue)],['Custos conhecidos',fmt(r.totals.knownCost)],['Material sem preço histórico',r.totals.unknownGrams+' g'],['Despesas manuais não rateadas',fmt(r.totals.unallocated)]].map(([k,v])=>'<div class="metric"><span>'+str(k)+'</span><strong>'+str(v)+'</strong></div>').join('')+'</div><button type="button" class="btn" id="cost-export">Exportar custos e evidências JSON</button>',true)+
 panel('Custos por pedido',table(['Pedido / modelo','Expedidas / pedidas','Receita','Material de referência','Mão de obra','Rateio','Custo conhecido','Diferença parcial','Margem parcial','Base atual de material / peça'],r.rows.map(x=>[str(x.id)+' · '+str(x.model),str(x.shipped)+' / '+str(x.pieces),fmt(x.revenue),fmt(x.referenceCents)+(x.unknownGrams?' · '+str(x.unknownGrams)+' g sem preço':''),fmt(x.labor),fmt(x.overhead),fmt(x.knownCost),val(x.difference),x.partialMarginPercent===null?'Não apurada':str(x.partialMarginPercent)+'%',val(x.theoreticalMaterial)]))+'<p>Base atual de material por peça usa somente a ficha simples, não substitui BOM completo nem histórico.</p>',true)+
 panel('Custo agrupado por modelo',g(r.models),true)+panel('Custo agrupado por cliente',g(r.clients),true)+
 panel('Consumo e desperdício por pedido',table(['Pedido','Desperdício medido (g)','Consumo sem medição de desperdício (g)','Material sem preço (g)'],r.rows.map(x=>[str(x.id),str(x.wasteGrams),str(x.unknownWasteGrams),str(x.unknownGrams)])),true)+
 panel('Rateio de despesas manuais',form('cost.allocate','Vincular parte do título ao pedido',[field('financeId','Despesa com saldo','select','',available),field('orderId','Pedido','select','',orderOptions(s)),field('amountCents','Valor deste rateio','money','10,00'),field('reason','Critério / justificativa','text','Rateio fictício')],'Registrar rateio')+'<p>Não gera pagamento nem outro título. Limita a soma de rateios ao valor original. Compras e acertos já vinculados não são elegíveis.</p>'+table(['Título','Categoria','Valor','Rateado','Saldo'],r.manual.map(x=>[str(x.id)+' · '+str(x.description),str(x.category),fmt(x.total),fmt(x.allocated),fmt(x.remaining)])),true)+
 panel('Serviços avulsos sem pedido',table(['Acerto','Modelo','Serviço','Valor com ajustes'],r.loose.map(x=>[str(x.id),str(x.model),str(x.service),fmt(x.amountCents)]))+'<p>Total não apropriado: '+fmt(r.totals.looseCost)+'. Não é distribuído automaticamente entre pedidos.</p>',true);
}


let recoveryIntents=[],recoveryPlan=null;
function recoveryPanels(s){
 const svc=window.HLGBLabRecoveryV1;if(!svc)return panel('Recuperação segura','<p>Módulo indisponível.</p>',true);
 let plan;try{plan=svc.simulate(s,api.inspect,window.HLGBLabAuditorV3.analyze);}catch(e){return panel('Recuperação segura','<div class="error">'+str(e.message)+'</div>',true);}
 recoveryPlan=plan;
 const repairForm=plan.status==='ready'?form('recovery.repair','Aplicar somente reparo simulado de metadado',[field('before','Prova anterior','text',plan.before),field('expected','Prova derivada da trilha','text',plan.expected),field('revision','Revisão simulada','int',String(plan.revision)),field('reason','Justificativa','text','Conferência de trilha')],'Confirmar reparo'):'';
 return panel('Recuperação segura · autocorreção limitada','<p>Simulação de metadado de revisão: '+str(plan.status)+'. Nunca altera pedidos, estoque, pagamentos ou valores para resolver um diagnóstico. Sem reenvio automático de comandos.</p>'+table(['Antes','Prova esperada','Revisão'],[[str(plan.before),str(plan.expected),str(plan.revision)]])+plan.blocked.map(x=>'<p>'+str(x)+'</p>').join('')+repairForm+'<div class="actions"><button type="button" class="btn" id="recovery-check">Reler intenções locais</button><button type="button" class="btn" id="recovery-export">Exportar diagnóstico JSON</button></div>',true)+
 panel('Intenções pendentes de confirmação',table(['Comando','Operação','Revisão esperada','Diagnóstico','Ação'],recoveryIntents.map(x=>[str(x.commandId),str(x.type),str(x.expectedRevision),str(svc.classify(s,x,api.inspect).message),!remoteLab&&svc.review(s,x,api.inspect).allowed?'<button type="button" class="btn" data-intent-review="'+str(x.commandId)+'">Arquivar após revisar</button>':'—']))+'<p>Intenções novas gravadas junto com o documento na mesma transação local; intenções antigas podem exigir revisão. Não contêm dados de pagamento ou conteúdo do formulário. Não representam fila de envio; ausência de prova não autoriza repetir.</p>',true)+
 panel('Histórico de reparos autorizados',table(['Comando','Antes','Prova conferida','Motivo'],(s.repairHistory||[]).map(x=>[str(x.commandId),str(x.before),str(x.expected),str(x.reason)])),true);
}
function intentRead(){
 return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).getAll(IDBKeyRange.bound('intent:','intent:\uffff'));req.onsuccess=()=>resolve(req.result.filter(x=>String(x.key).startsWith('intent:')&&x.intent).map(x=>x.intent));req.onerror=()=>reject(req.error||Error('Falha ao reler intenções.'));});
}


const remoteLab=window.HLGBRemoteLab||null;

let syncNoticeTimer=null,syncNoticeChecking=false,syncNoticeRevision=null;
async function checkSharedRevision(){
 if(!remoteLab||!doc||busy||syncNoticeChecking||document.hidden)return;
 syncNoticeChecking=true;const notice=$('shared-revision-notice');
 try{
  const revision=await remoteLab.revision();
  if(revision>doc.revision){syncNoticeRevision=revision;notice.hidden=false;notice.textContent='Há alterações confirmadas por outra sessão (revisão '+revision+'). Confira e atualize antes de salvar. Seus campos atuais ainda não foram alterados.';}
  else if(revision===doc.revision){syncNoticeRevision=null;notice.hidden=true;notice.textContent='';}
  else{notice.hidden=false;notice.textContent='O servidor apresentou revisão anterior à tela. Confira a sincronização; não repita lançamentos.';}
 }catch(e){notice.hidden=false;notice.textContent='Releitura do servidor indisponível. A tela não foi alterada; confira a conexão e o WAL.';}
 finally{syncNoticeChecking=false;}
}
function startSharedNotice(){if(!remoteLab||syncNoticeTimer!==null)return;syncNoticeTimer=setInterval(()=>{void checkSharedRevision();},15000);window.addEventListener('focus',()=>{void checkSharedRevision();});}

function remotePanel(){
 if(!remoteLab)return '';
 const v=remoteLab.info(),q=v.pending;
 return panel('Sincronização integrada · laboratório remoto','<p>'+str(v.actor||'Sessão fictícia')+' · '+str(v.permissions?.label||'Perfil não identificado')+' · PostgreSQL descartável. Nenhum dado real. <strong>Perfil administrativo fictício; visão integral restrita no servidor. Produção recebe somente projeção operacional.</strong> '+(q?'Comando pendente: '+str(q.command.commandId)+' · '+str(q.stage):'Sem comando pendente nesta sessão.')+'</p><div class="actions"><button type="button" class="btn" id="remote-check">Conferir servidor / WAL</button><button type="button" class="btn" id="remote-retry" '+(q?.stage==='not_found'?'':'disabled')+'>Reenviar mesmo ID</button><button type="button" class="btn" id="remote-discard" '+(q&&['not_found','conflict','rejected'].includes(q.stage)?'':'disabled')+'>Cancelar no servidor e arquivar intenção local</button><button type="button" class="btn" id="remote-pending-export" '+(q?'':'disabled')+'>Exportar intenção ainda pendente</button><button type="button" class="btn" id="remote-history-export">Exportar histórico local de conflitos</button></div><p class="caption">Após cancelamento com prova remota, a intenção original fica arquivada neste navegador para conferência. Não foi aceita no servidor. Não use dados reais.</p>',true);
}
async function remoteAction(action){
 if(busy||!remoteLab)return;busy=true;
 try{const r=await action();if(r.state){doc=r.state;draw();}else{const banner=document.querySelector('#remote-check');if(banner)banner.closest('section').outerHTML=remotePanel();}status(r.status==='confirmed'?'Salvo e confirmado no PostgreSQL · '+str(r.result):'Sincronização: '+r.status+(r.message?' · '+r.message:''),r.status==='confirmed'?'success':'');}
 catch(e){status(e.message+' · Confira servidor / WAL antes de repetir.','error');}
 finally{busy=false;void checkSharedRevision();}
}



let serviceGroupDraft=null,serviceGroupResult=null;
const emptyGroupLine=()=>({productId:doc.products[0]?.id||'manual',manualName:'—',manualCategory:'camisola',qty:10,priceMode:'auto',unit:'0,00'});
function serviceGroupPanel(s){
 const staff=selector(s.factions.filter(x=>x.serviceRole),x=>x.name+' · '+x.serviceRole);
 const draft=serviceGroupDraft||{factionId:staff[0]?.[0]||'',reference:'GRUPO-R'+s.revision,lines:[emptyGroupLine(),emptyGroupLine()]};
 const productChoices=selector(s.products,x=>x.name+' · '+x.sku).concat([['manual','Modelo avulso (embalagem)']]);
 const cats=window.HLGBLabServicesV1.categories.map(x=>[x,x]),modes=[['auto','Preço cadastrado'],['manual','Preço manual']];
 const rows=draft.lines.map((x,i)=>'<div class="panel" data-group-line><h3>Linha '+(i+1)+'</h3><div class="fields">'+field('productId','Modelo','select',x.productId,productChoices)+field('manualName','Modelo avulso','text',x.manualName)+field('manualCategory','Categoria avulsa','select',x.manualCategory,cats)+field('qty','Peças','int',String(x.qty))+field('priceMode','Preço','select',x.priceMode,modes)+field('unit','Preço manual R$','money',x.unit)+'</div>'+(draft.lines.length>2?'<button class="btn danger" type="button" data-group-remove="'+i+'">Retirar linha do rascunho</button>':'')+'</div>').join('');
 const q=serviceGroupResult?.revision===s.revision?serviceGroupResult:null;
 return panel('Montar um acerto com várias linhas','<p>Uma pessoa por grupo; atividade e preços seguem o cadastro. Confira a prévia antes de gravar. Nenhuma baixa financeira é feita ao criar o grupo.</p><div class="fields"><div class="field"><label>Prestador<select class="input" id="group-service-faction">'+options(staff,draft.factionId)+'</select></label></div><div class="field"><label>Referência<input class="input" id="group-service-reference" value="'+str(draft.reference)+'"></label></div></div><div id="group-service-lines">'+rows+'</div><div class="actions"><button class="btn" id="group-line-add" type="button" '+(draft.lines.length>=20?'disabled':'')+'>Adicionar linha</button><button class="btn" id="group-service-preview" type="button">Conferir total</button></div>'+
 (q?table(['Modelo','Atividade','Peças','Bruto/peça','Desconto/peça','Total'],q.rows.map(x=>[str(x.model),str(x.service),str(x.qty),fmt(x.gross),fmt(x.discount),fmt(x.amount)]))+'<p><strong>Total da prévia: '+fmt(q.total)+'</strong></p>'+form('settlement.service.group','Confirmar acerto',[field('reason','Justificativa','text','Grupo de serviços fictício')],'Registrar todas as linhas'):'')+
 table(['Grupo','Prestador','Referência','Linhas','Total original'],(s.serviceEntryGroups||[]).map(x=>[str(x.id),str(x.factionName),str(x.reference),str(x.items.map(i=>i.settlementId).join(' · ')),fmt(x.totalCents)])),true);
}
function captureServiceGroup(){
 const lines=[...document.querySelectorAll('[data-group-line]')].map(row=>{const val=k=>row.querySelector('[name="'+k+'"]').value;return {productId:val('productId'),manualName:val('manualName'),manualCategory:val('manualCategory'),qty:val('qty'),priceMode:val('priceMode'),unit:val('unit')};});
 return {factionId:$('group-service-faction').value,reference:$('group-service-reference').value,lines};
}
function serviceGroupInput(d){return {...d,lines:d.lines.map(x=>{const {unit,...row}=x;return {...row,qty:Number(row.qty),unitCents:row.priceMode==='manual'?parseCents(unit):0};})};}

function servicePanels(s,area){
 const svc=window.HLGBLabServicesV1;if(!svc)return '';
 const roleOptions=svc.roles.map(x=>[x,x]),categories=svc.categories.map(x=>[x,x]),products=selector(s.products,x=>x.name+' · '+x.sku),factions=selector(s.factions,x=>x.name+' · '+(x.serviceRole||'não classificado')),r=svc.rates(s);
 if(area==='produtos')return panel('Ficha técnica · pontos de travetada',form('service.points.set','Definir pontos por peça',[field('productId','Modelo','select','',products),field('category','Categoria de serviço','select','',categories),field('points','Pontos de travetada por peça','int','0'),field('reason','Justificativa','text','Conferência da ficha')],'Salvar ficha')+table(['Modelo','Categoria','Pontos'],s.products.map(x=>[str(x.name),str(svc.cat(x)),str(x.travetaPoints??'Não cadastrado')])),true);
 if(area==='faccoes')return panel('Cadastro de atividades e tabela de serviços',form('service.profile.set','Classificar prestador',[field('factionId','Prestador','select','',factions),field('serviceRole','Atividade','select','',roleOptions),field('reason','Justificativa','text','Cadastro de atividade')],'Salvar atividade')+form('service.rates.set','Preços em R$ por peça ou por ponto',[...svc.categories.map(k=>field(k,'Embalagem '+k,'money',nr(r[k]||0))),field('pointCents','Travetada por ponto','money',nr(r.pointCents||0)),field('reason','Motivo','text','Tabela fictícia')],'Salvar tabela')+'<p>Preços das camisolas/dolls e calcinhas iniciam como sugestões de laboratório. Revise os valores. Zero não é preço de pagamento, deve ser informado manualmente.</p>'+table(['Prestador','Atividade','Faz travetada'],s.factions.map(x=>[str(x.name),str(x.serviceRole||'Não classificado'),x.traveta?'Sim':'Não'])),true);
 const formHtml=form('settlement.service.add','Novo serviço com preço e pontos calculados',[field('serviceType','Atividade','select','',roleOptions),field('factionId','Prestador classificado','select','',factions),field('productId','Modelo','select','',products.concat([['manual','Modelo não cadastrado (só embalagem)']])),field('manualName','Nome avulso (quando necessário)','text','—'),field('manualCategory','Categoria avulsa','select','',categories),field('qty','Peças','int','20'),field('priceMode','Preço','select','',[['auto','Tabela / ficha'],['manual','Informar preço manual']]),field('unitCents','Preço manual por peça ou ponto','money','0,00'),field('reason','Justificativa','text','Serviço fictício')],'Gerar acerto');
 return panel('Acerto por atividade · travetada por pontos',formHtml+'<p id="service-preview" role="status"></p><p>Travetada paga por ponto × pontos por peça × quantidade; costura de quem não traveta desconta os pontos da ficha. Embalagem usa categoria, inclusive modelo avulso. Acerto preserva tabela, quantidade e valores originais; não depende do preço de venda.</p>'+table(['Acerto','Modelo','Atividade','Peças','Pontos/peça','Tarifa/ponto','Total original'],s.settlements.filter(x=>x.serviceQuote).map(x=>{const q=x.serviceQuote;return [str(x.id),str(q.model),str(q.service),str(q.qty),str(q.pointCount??'—'),q.pointRate===null?'—':fmt(q.pointRate),fmt(q.amount)];})),true);
}
function refreshServicePreview(){const f=document.querySelector('form[data-command="settlement.service.add"]'),node=$('service-preview');if(!f||!node)return;const type=f.elements.namedItem('serviceType').value,select=f.elements.namedItem('factionId'),valid=doc.factions.filter(x=>x.serviceRole===type);const value=select.value;select.innerHTML=options(valid.map(x=>[x.id,x.name]),value);try{const q=window.HLGBLabServicesV1.quote(doc,parseData('settlement.service.add',f));node.textContent=q.model+' · '+q.qty+' peças · bruto '+fmt(q.gross)+' / peça · desconto '+fmt(q.discount)+' / peça · total '+fmt(q.amount);}catch(e){node.textContent=e.message;}}


let quoteQuery={materialId:'MAT-0001',qtyGrams:1000,asOf:'2026-11-17'};
function factionMaterialsPanel(s,area){
 const svc=window.HLGBLabComplementsV1;if(!svc)return '';
 const products=selector(s.products,x=>x.name),materials=selector(s.materials,x=>x.name);
 if(area==='produtos')return panel('Materiais destinados à facção',form('faction.material.scope','Selecionar aviamento da ficha',[field('productId','Modelo','select','',products),field('materialId','Material','select','',materials),field('action','Ação','select','',[['incluir','Incluir no checklist'],['excluir','Retirar dos próximos checklists']]),field('reason','Motivo','text','Conferência da ficha')],'Salvar escopo')+'<p>Cadastre o consumo na receita de materiais. Não inclua tecido já consumido no corte. O checklist é conferência logística e não nova baixa.</p>'+table(['Modelo','Material','Incluir'],(s.factionMaterialScopes||[]).filter(x=>x.active).map(x=>[str(ref(s.products,x.productId)?.name),str(ref(s.materials,x.materialId)?.name),x.include?'Sim':'Não'])),true);
 const rows=(s.factionAssignments||[]).filter(x=>x.qtySent>x.qtyReturned);
 return panel('Materiais das facções — conferir ficha atual',rows.map(a=>{let q;try{q=svc.materialPreview(s,a.id);}catch(e){return '<p>'+str(a.id)+' · '+str(e.message)+'</p>';}
 const old=(s.factionMaterialChecklists||[]).filter(x=>x.assignmentId===a.id).at(-1),same=old?.signature===q.signature;
 return '<details class="panel"><summary>'+str(a.id)+' · '+str(ref(s.factions,a.factionId)?.name)+' · '+q.pending+' pendentes</summary>'+
 table(['Material','Anterior (g)','Ficha atual (g)','Diferença (g)'],[...new Set([...(old?.materials||[]).map(x=>x.materialId),...q.materials.map(x=>x.materialId)])].map(id=>{const before=old?.materials.find(x=>x.materialId===id)?.grams||0,after=q.materials.find(x=>x.materialId===id)?.grams||0;return [str(ref(s.materials,id)?.name),str(before),str(after),str(after-before)];}))+
 (same?'<p>Checklist atual registrado.</p>':form('faction.material.checklist','Registrar versão conferida',['<input type="hidden" name="assignmentId" value="'+str(a.id)+'"><input type="hidden" name="signature" value="'+str(q.signature)+'">',field('reason','Motivo','text','Conferência do envio')],'Registrar checklist'))+
 (same?q.materials.map(m=>form('faction.material.confirm','Conferir '+m.name,['<input type="hidden" name="id" value="'+str(old.id)+'"><input type="hidden" name="materialId" value="'+str(m.materialId)+'">',field('actualGrams','Quantidade conferida (g)','int',String(m.grams)),field('reason','Observação','text','Conferência fictícia')],'Registrar quantidade')).join(''):'')+'</details>';}).join('')+
 '<p>Transferência ou mudança de ficha exige nova conferência. Não altera estoque nem pagamentos.</p>'+table(['Checklist','Envio','Versão anterior','Motivo'],(s.factionMaterialChecklists||[]).map(x=>[str(x.id),str(x.assignmentId),str(x.previousId||'—'),str(x.reason)]))+
 table(['Checklist','Material','Previsto','Conferido','Diferença','Motivo'],(s.factionMaterialChecks||[]).map(x=>[str(x.checklistId),str(ref(s.materials,x.materialId)?.name),str(x.expectedGrams),str(x.actualGrams),str(x.differenceGrams),str(x.reason)]))+
 '<button type="button" class="btn" id="faction-material-export">Exportar comparação CSV</button>',true);
}
function supplierQuotePanel(s){
 const svc=window.HLGBLabComplementsV1;if(!svc)return '';
 const materials=selector(s.materials,x=>x.name),suppliers=selector(s.suppliers,x=>x.name);
 let out;try{out=svc.compare(s,quoteQuery);}catch(e){out={rows:[],best:null,error:e.message};}
 return panel('Comprador inteligente · comparar fornecedores',form('supplier.quote.add','Registrar cotação',[field('supplierId','Fornecedor','select','',suppliers),field('materialId','Material','select','',materials),field('qtyGrams','Quantidade (g)','int','1000'),field('priceCentsKg','Preço por kg (R$)','money','28,00'),field('freightCents','Frete total (R$)','money','0,00'),'<div class="field"><label>Data da cotação<input class="input" name="quotedAt" type="date" value="2026-11-17" required></label></div><div class="field"><label>Validade<input class="input" name="validUntil" type="date" value="2026-11-30" required></label></div>',field('reference','Referência','text','COT-TESTE'),field('reason','Observação','text','Cotação fictícia')],'Salvar cotação')+
 '<div class="fields"><div class="field"><label>Material comparado<select class="input" id="quote-material">'+options(materials,quoteQuery.materialId)+'</select></label></div><div class="field"><label>Quantidade exata (g)<input class="input" type="number" id="quote-qty" value="'+str(quoteQuery.qtyGrams)+'"></label></div><div class="field"><label>Data de referência<input type="date" class="input" id="quote-date" value="'+str(quoteQuery.asOf)+'"></label></div></div><button class="btn" type="button" id="quote-compare">Comparar</button>'+
 (out.error?'<p class="error">'+str(out.error)+'</p>':'')+table(['Fornecedor','R$/kg','Frete','Total','Validade','Conferência'],out.rows.map(q=>[str(q.supplierName),fmt(q.priceCentsKg),fmt(q.freightCents),fmt(q.totalCents),str(q.validUntil),q.id===out.best?'Menor total válido':q.valid?'Válida':'Vencida']))+
 '<p>Compara mesma quantidade e material, incluindo frete. Não presume equivalência nem cria compras automaticamente.</p>'+
 table(['Fornecedor','A pagar aberto','Pago'],s.suppliers.map(f=>{const titles=s.finance.filter(t=>t.kind==='pagar'&&s.purchaseOrders.some(p=>p.supplierId===f.id&&p.id===t.sourceId));return [str(f.name),fmt(titles.filter(t=>t.status==='aberto').reduce((n,t)=>n+t.amountCents,0)),fmt(titles.filter(t=>t.status==='pago').reduce((n,t)=>n+t.amountCents,0))];})),true);
}
async function readPrintPhoto(form){
 const file=form.elements.namedItem('photoFile').files?.[0],id=form.elements.namedItem('productId').value;
 if(!form.elements.namedItem('fictitious').checked||!file||!['image/jpeg','image/png'].includes(file.type)||file.size>5*1024*1024)throw Error('Selecione JPEG/PNG fictício de até 5 MiB.');
 const url=URL.createObjectURL(file);try{
 const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Imagem inválida'));img.src=url;});
 if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>25000000)throw Error('Imagem excede limite de dimensões.');
 const canvas=document.createElement('canvas'),ratio=Math.min(1,600/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));const c=canvas.getContext('2d');c.fillStyle='#ffffff';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(img,0,0,canvas.width,canvas.height);
 let contentBase64=canvas.toDataURL('image/jpeg',0.72).split(',')[1];if(!window.HLGBLabComplementsV1.imageOK(contentBase64))contentBase64=canvas.toDataURL('image/jpeg',0.45).split(',')[1];
 if(!window.HLGBLabComplementsV1.imageOK(contentBase64))throw Error('Foto comprimida ultrapassa limite.');
 return {productId:id,contentBase64,previousId:(doc.printPhotos||[]).filter(x=>x.productId===id).at(-1)?.id||null,reason:form.elements.namedItem('reason').value,fictitious:true};
 }finally{URL.revokeObjectURL(url);}
}
function photoPanel(s){
 const svc=window.HLGBLabComplementsV1;if(!svc)return '';const choices=selector(s.prints,x=>x.name);
 return panel('Catálogo 3D · fotos de exercício','<form data-command="print.photo.attach"><h3>Adicionar ou substituir foto</h3><div class="fields">'+field('productId','Produto','select','',choices)+'<div class="field"><label>JPEG ou PNG<input class="input" type="file" name="photoFile" accept="image/jpeg,image/png" required></label></div>'+field('reason','Motivo','text','Foto de teste')+'<label><input type="checkbox" name="fictitious" required> Confirmo imagem fictícia sem dados pessoais.</label></div><button class="btn primary" type="submit">Salvar foto</button></form>'+
 '<div class="metrics">'+s.prints.map(x=>{const photo=(s.printPhotos||[]).filter(y=>y.productId===x.id).at(-1);return '<div class="metric">'+(photo?'<img alt="'+str(x.name)+'" src="data:image/jpeg;base64,'+str(photo.contentBase64)+'" style="width:100%;max-width:180px;aspect-ratio:1;object-fit:contain;border-radius:8px">':'<p>Sem foto</p>')+'<strong>'+str(x.name)+'</strong><span>'+fmt(x.priceCents)+' · '+x.stock+' peças</span></div>';}).join('')+'</div>'+
 table(['Foto','Produto','Versão','Motivo'],svc.photoMetadata(s).map(x=>[str(x.id),str(ref(s.prints,x.productId)?.name),x.current?'Atual':'Anterior',str(x.reason)]))+'<p>Fotos de laboratório comprimidas, histórico preservado; imagens reais exigirão armazenamento privado.</p>',true);
}


let payrollMonth='2026-11',payrollDraft={period:'2026-11',dueDate:'2026-12-05',employeeId:'todos'},payrollPreview=null,importDraft='',importResult=null;
function payrollIntegratedPanel(s){
 const service=window.HLGBLabPayrollOrdersV1,r=service.payrollReport(s,payrollMonth),staff=selector(s.employees,e=>e.name).sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'));
 return panel('Folha por competência · integrada ao Hub','<div class="field"><label>Competência consultada<input class="input" type="month" id="payroll-month" value="'+str(payrollMonth)+'"></label></div><button class="btn" id="payroll-show" type="button">Consultar competência</button>'+
 '<div class="metrics">'+[['Líquido',r.netCents],['Passagem',r.passageCents],['Desembolso',r.cashCents],['Pendente',r.openCents],['Pago',r.paidCents],['Provisões estimadas',r.provisionsCents]].map(([k,v])=>'<div class="metric"><span>'+str(k)+'</span><strong>'+fmt(v)+'</strong></div>').join('')+'</div>'+
 '<div class="fields"><div class="field"><label>Competência da criação<input class="input" type="month" id="payroll-new-period" value="'+str(payrollDraft.period)+'"></label></div><div class="field"><label>Vencimento<input class="input" type="date" id="payroll-new-due" value="'+str(payrollDraft.dueDate)+'"></label></div><div class="field"><label>Funcionário<select class="input" id="payroll-new-person">'+options([['todos','Todos sem folha nesta competência'],...staff],payrollDraft.employeeId)+'</select></label></div></div><button class="btn" type="button" id="payroll-preview">Conferir folha</button>'+
 (payrollPreview&&payrollPreview.revision===s.revision?table(['Funcionário','Líquido','Passagem','Total'],payrollPreview.rows.map(x=>[str(x.employeeName),fmt(x.amounts.netCents),fmt(x.amounts.passageCents),fmt(x.amounts.cashCents)]))+
 form('payroll.period.create','Confirmar títulos da competência',['<input type="hidden" name="period" value="'+str(payrollDraft.period)+'"><input type="hidden" name="dueDate" value="'+str(payrollDraft.dueDate)+'"><input type="hidden" name="employeeId" value="'+str(payrollDraft.employeeId)+'"><input type="hidden" name="signature" value="'+str(payrollPreview.signature)+'">',field('reason','Motivo','text','Folha de teste')],'Gerar títulos no Hub'):'')+
 table(['Funcionário','Salário','Passagem','Despesa total','Situação','Data / título'],r.rows.map(x=>[str(x.employeeName),fmt(x.amounts.salaryCents),fmt(x.amounts.passageCents),fmt(x.amounts.cashCents),str(x.status),str(x.paidDate||x.dueDate)+' · '+str(x.financeId)]))+
 form('payroll.period.revise','Atualizar folha aberta pelos valores individuais atuais',[field('id','Folha em aberto','select','',selector(r.rows.filter(x=>x.status==='aberto'),x=>x.employeeName+' · '+x.id)),field('reason','Justificativa','text','Conferência')],'Recalcular título aberto')+
 '<p>O pagamento no Hub atualiza a folha correspondente. Valores já pagos não mudam; passagem integra o desembolso, não o salário líquido. Provisões meramente ilustrativas, sem encargos, tributos ou cálculo trabalhista legal.</p>',true);
}
function importOrdersPanel(s){
 const preview=importResult?.revision===s.revision?importResult:null;
 return panel('Importação assistida de pedidos em lote','<p>Cole CSV separado por ponto e vírgula, com referências únicas, ID de cliente e SKU cadastrado. Até 50 linhas, sem correspondência por nome aproximado. Nenhum pedido criado na prévia.</p><div class="field"><label>CSV de pedidos<textarea class="input" id="order-import-raw" rows="6" placeholder="referencia;cliente_id;sku;P;M;G;GG">'+str(importDraft)+'</textarea></label></div><div class="actions"><button class="btn" type="button" id="order-import-preview">Conferir CSV</button><button class="btn" type="button" id="order-import-template">Baixar modelo CSV</button></div>'+
 (preview?table(['Referência','Cliente','Modelo','Peças','Valor'],preview.rows.map(x=>[str(x.reference),str(x.clientName),str(x.productName),str(x.qty),fmt(x.totalCents)]))+
 form('order.import.batch','Confirmar todos os pedidos da prévia',['<input type="hidden" name="raw" value="'+str(importDraft)+'"><input type="hidden" name="signature" value="'+str(preview.signature)+'">',field('reason','Justificativa','text','Importação de teste')],'Importar '+preview.rows.length+' pedidos'):'')+
 table(['Lote','Pedidos','Total'],(s.orderImports||[]).map(x=>[str(x.id),str(x.items.map(y=>y.reference+' → '+y.orderId).join(' · ')),fmt(x.totalCents)]))+
 '<p>Importação atômica: se uma linha estiver inválida, nenhuma entra. Referência importada não pode ser repetida.</p>',true);
}


let assistedDraft=null,assistedPreview=null,invoiceDraft=null,invoicePreview=null;
function cutSplitPanel(s){
 return panel('Dividir folha aberta · manter grade e histórico',form('cut.plan.split','Criar segundo lote do mesmo modelo',[field('id','Folha em aberto','select','',selector(s.cutPlans.filter(x=>x.status==='aberto'),x=>x.id+' · '+x.orderId+' · '+sum(x.grade)+' peças')),...api.sizes.map(x=>field(x,'Mover tamanho '+x,'int','0')),field('reason','Motivo','text','Divisão do corte')],'Dividir folha')+'<p>O segundo lote herda a equipe e material; nenhum corte ou estoque é baixado. Folhas concluídas ou canceladas permanecem intactas.</p>'+table(['Origem','Novo lote','Peças movidas','Motivo'],(s.cutSplits||[]).map(x=>[str(x.parentId),str(x.childId),str(sum(x.moved)),str(x.reason)])),true);
}
function packagingPanel(s){
 const service=window.HLGBLabOperationsV2,orders=selector(s.orders.filter(o=>service.packagingSummary(s,o.id).available>0),o=>o.id+' · '+ref(s.products,o.productId)?.name),staff=selector(s.factions.filter(f=>f.serviceRole==='embalagem'),f=>f.name),lots=s.packagingLots||[],open=selector(lots.filter(x=>x.status==='aberto'),x=>x.id+' · '+x.qty+' peças');
 return panel('Embalagem · acompanhamento por lote',form('packaging.assign','Enviar peças retornadas à embaladeira',[field('orderId','Pedido','select','',orders),field('factionId','Embaladeira','select','',staff),field('qty','Quantidade','int','10'),field('priceMode','Preço','select','',[['auto','Tabela de embalagem'],['manual','Preço manual']]),field('unitCents','Preço manual (R$)','money','0,25'),field('reason','Motivo','text','Embalagem fictícia')],'Enviar lote')+
 form('packaging.complete','Conferir lote completo e gerar acerto',[field('id','Lote aberto','select','',open),field('qty','Quantidade conferida','int','10'),field('reason','Conferência','text','Lote conferido')],'Concluir embalagem')+
 form('packaging.cancel','Cancelar somente lote aberto',[field('id','Lote aberto','select','',open),field('reason','Justificativa','text','Reorganização do lote')],'Cancelar envio')+
 table(['Pedido','Retornado','Disponível para embalagem','Em embalagem','Embalado','Liberado para separar'],s.orders.map(o=>{const q=service.packagingSummary(s,o.id);return [str(o.id),str(o.returned),str(q.available),str(q.waiting),str(q.done),q.tracked?str(q.canSeparate):'Fluxo anterior'];}))+
 table(['Lote','Pedido','Embaladeira','Peças','Valor previsto','Situação','Acerto'],lots.map(x=>[str(x.id),str(x.orderId),str(ref(s.factions,x.factionId)?.name),str(x.qty),fmt(x.quotedCents),str(x.status),str(x.settlementId||'—')]))+
 '<p>Após o primeiro envio de embalagem, a separação desse pedido só usa lotes concluídos, além do saldo já separado anteriormente. O acerto usa a tarifa registrada no envio. Cancelamento não gera pagamento. Este exercício não movimenta materiais.</p>',true);
}
function assistedOrderPanel(s){
 const draft=assistedDraft||{clientId:s.clients[0]?.id,productId:s.products[0]?.id,reference:'ASSIST-'+s.revision,grade:{P:0,M:10,G:0,GG:0}},p=assistedPreview?.revision===s.revision?assistedPreview:null;
 return panel('Assistente · inclusão guiada de pedido','<p>Escolha cliente, modelo e grade. O Assistente prepara uma prévia; nenhuma gravação ocorre até sua confirmação explícita. Não interpreta pedidos livres automaticamente.</p>'+
 '<div class="fields"><div class="field"><label>Cliente<select class="input" id="assisted-client">'+options(selector(s.clients,x=>x.name),draft.clientId)+'</select></label></div><div class="field"><label>Modelo<select class="input" id="assisted-product">'+options(selector(s.products,x=>x.name+' · '+x.sku),draft.productId)+'</select></label></div><div class="field"><label>Referência única<input class="input" id="assisted-ref" value="'+str(draft.reference)+'"></label></div>'+api.sizes.map(k=>'<div class="field"><label>'+k+'<input class="input" type="number" min="0" id="assisted-'+k+'" value="'+str(draft.grade[k])+'"></label></div>').join('')+'</div><button class="btn" type="button" id="assisted-preview">Conferir pedido</button>'+
 (p?table(['Cliente','Modelo','Peças','Valor'],p.rows.map(x=>[str(x.clientName),str(x.productName),str(x.qty),fmt(x.totalCents)]))+form('assistant.order.create','Confirmar pedido da prévia',[field('reason','Justificativa','text','Pedido assistido fictício')],'Confirmar inclusão'):'')+
 '<p>Usa a rotina única de inclusão de pedidos e gera a conta a receber correspondente; a referência impede reimportações acidentais.</p>',true);
}
function invoicePanel(s){
 const draft=invoiceDraft||{supplierId:s.suppliers[0]?.id,reference:'NF-'+s.revision,issueDate:'2026-11-17',declaredCents:'28,00',raw:'material_id;gramas;centavos_por_kg\nMAT-0001;1000;2800'},p=invoicePreview?.revision===s.revision?invoicePreview:null,notes=s.purchaseInvoices||[],pdfs=window.HLGBLabOperationsV2.pdfMetadata(s);
 return panel('Notas de compra · importação estruturada','<p>Transcreva itens conferidos da nota (CSV em gramas e centavos por kg). A prévia exige total declarado idêntico à soma. Não lê XML/PDF automaticamente, não consulta NFe e não importa tributos.</p>'+
 '<div class="fields"><div class="field"><label>Fornecedor<select class="input" id="invoice-supplier">'+options(selector(s.suppliers,x=>x.name),draft.supplierId)+'</select></label></div><div class="field"><label>Referência da nota<input class="input" id="invoice-reference" value="'+str(draft.reference)+'"></label></div><div class="field"><label>Data da nota<input type="date" class="input" id="invoice-date" value="'+str(draft.issueDate)+'"></label></div><div class="field"><label>Total declarado R$<input class="input" id="invoice-total" value="'+str(draft.declaredCents)+'"></label></div></div><div class="field"><label>Itens CSV<textarea class="input" id="invoice-raw" rows="5">'+str(draft.raw)+'</textarea></label></div><button type="button" class="btn" id="invoice-preview">Conferir nota</button>'+
 (p?table(['Material','Gramas','R$/kg','Total'],p.items.map(x=>[str(x.materialName),str(x.qtyGrams),fmt(x.priceCentsKg),fmt(x.amountCents)]))+form('purchase.invoice.import','Registrar compras pendentes da nota',[field('checkerOne','Conferente 1','text','Ana Teste'),field('checkerTwo','Conferente 2','text','Beto Teste'),field('reason','Motivo','text','Nota fictícia')],'Importar nota'):'')+
 table(['Nota','Fornecedor','Referência','Total','Compras','Recebidas'],notes.map(x=>[str(x.id),str(ref(s.suppliers,x.supplierId)?.name),str(x.reference),fmt(x.totalCents),str(x.items.map(i=>i.purchaseId).join(' · ')),str(x.items.filter(i=>ref(s.purchaseOrders,i.purchaseId)?.received).length)+' / '+str(x.items.length)]))+
 '<p>As compras só entram no estoque e no financeiro quando recebidas pelos controles existentes. Não duplica entradas nem títulos ao importar.</p>'+
 '<form data-command="purchase.invoice.pdf"><h3>Anexar PDF fictício da nota</h3><div class="fields">'+field('id','Nota importada','select','',selector(notes,x=>x.reference+' · '+x.id))+'<div class="field"><label>PDF de até 256 KiB<input type="file" name="invoiceFile" accept=".pdf,application/pdf" class="input" required></label></div>'+field('reason','Motivo','text','Documento fictício')+'<label><input type="checkbox" name="fictitious" required> Confirmo PDF inteiramente fictício.</label></div><button class="btn primary" type="submit">Salvar documento</button></form>'+
 table(['Documento','Nota','Versão','Arquivo','Consultar'],pdfs.map(x=>[str(x.id),str(x.invoiceId),x.current?'Atual':'Anterior',str(x.fileName),'<button type="button" class="btn" data-invoice-pdf="'+str(x.id)+'">Baixar PDF</button>'])),true);
}
function readAssistedDraft(){return {clientId:$('assisted-client').value,productId:$('assisted-product').value,reference:$('assisted-ref').value,grade:Object.fromEntries(api.sizes.map(k=>[k,Number($('assisted-'+k).value)]))};}
function readInvoiceDraft(){return {supplierId:$('invoice-supplier').value,reference:$('invoice-reference').value,issueDate:$('invoice-date').value,declaredCents:$('invoice-total').value,raw:$('invoice-raw').value};}
async function readInvoicePdf(f){const file=f.elements.namedItem('invoiceFile').files?.[0],id=f.elements.namedItem('id').value;if(!file||file.size>window.HLGBLabPaymentBatchV1.MAX_PDF||!f.elements.namedItem('fictitious').checked)throw Error('PDF fictício obrigatório.');const bytes=new Uint8Array(await file.arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.slice(i,i+8192));return {id,fileName:file.name,contentBase64:btoa(text),previousId:(doc.invoicePdfs||[]).filter(x=>x.invoiceId===id).at(-1)?.id||null,reason:f.elements.namedItem('reason').value,fictitious:true};}


const monitorExpected=["modulos/pagamento-lote-v1.js","modulos/faccoes-multidestino-v1.js","modulos/grade-faccoes-v1.js","modulos/planejamento-materiais-v1.js","modulos/corte-bom-v1.js","modulos/requisicoes-compras-v1.js","modulos/devolucoes-compras-v1.js","modulos/pcp-v1.js","modulos/relatorios-gerenciais-v1.js","modulos/auditor-v3.js","modulos/bot-v3.js","modulos/custos-v1.js","modulos/recuperacao-v1.js","modulos/servicos-faccao-v1.js","modulos/complementos-v1.js","modulos/folha-pedidos-v1.js","modulos/operacoes-v2.js","modulos/pedidos-multimodelo-v1.js","modulos/corte-multimodelo-v1.js","modulos/fluxo-multimodelo-v1.js","modulos/fluxo-multimodelo-ui-v1.js","modulos/folha-corte-multimodelo-v1.js","modulos/rotas-utilidades-v1.js","modulos/etiquetas-a4-v1.js","modulos/embalagem-etiquetas-v1.js","modulos/regularizacao-historica-preview-v1.js","operacao-integrada-core.js","modulos/registro-v1.js","modulos/observabilidade-v2.js","modulos/pesquisa-global-v1.js","modulos/hub-financeiro-v1.js","modulos/assistente-v3.js","modulos/monitor-v1.js","operacao-integrada-ui.js"];
let monitorRuns=[],monitorRunning=false,monitorClock=null,monitorLastAttempt=null,monitorRound=0;
const MONITOR_INTERVAL=60*60*1000;
function monitorScriptReport(){
 const expected=[...monitorExpected];if(remoteLab)expected.splice(expected.indexOf('operacao-integrada-ui.js'),0,'integrado-remoto.js');
 const globals={'operacao-integrada-core.js':!!window.HLGBOperationalLab,'modulos/monitor-v1.js':!!window.HLGBLabMonitorV1,'modulos/registro-v1.js':!!window.HLGBLabModules,'modulos/auditor-v3.js':!!window.HLGBLabAuditorV3,'modulos/operacoes-v2.js':!!window.HLGBLabOperationsV2,'modulos/folha-pedidos-v1.js':!!window.HLGBLabPayrollOrdersV1,'modulos/complementos-v1.js':!!window.HLGBLabComplementsV1,'modulos/servicos-faccao-v1.js':!!window.HLGBLabServicesV1,'modulos/pagamento-lote-v1.js':!!window.HLGBLabPaymentBatchV1,'modulos/custos-v1.js':!!window.HLGBLabCostsV1,'modulos/bot-v3.js':!!window.HLGBLabBotV3};
 return window.HLGBLabMonitorV1.scripts([...document.querySelectorAll('script[src]')].map(x=>x.getAttribute('src')),expected,globals);
}
function monitorPanel(){
 const r=monitorRuns.at(-1);
 return '<div id="monitor-area">'+panel('Monitor periódico · sessão de homologação',
 '<p>Verifica releitura do documento, integridade do núcleo, Auditor 3.0 e scripts carregados. A cada hora enquanto a página permanecer aberta; o navegador pode suspender o relógio. Não constitui monitoramento 24 horas nem aprovação do banco empresarial.</p>'+
 '<div class="metrics">'+[['Última leitura',r?.at||'Ainda não executada'],['Rodadas da sessão',monitorRound],['Resultado',r?.status||'Pendente'],['Revisão lida',r?.revision??'—']].map(([k,v])=>'<div class="metric"><span>'+str(k)+'</span><strong>'+str(v)+'</strong></div>').join('')+'</div>'+
 '<div class="actions"><button class="btn" type="button" id="monitor-run">Verificar agora</button><button class="btn" type="button" id="monitor-export">Exportar evidência JSON</button></div>'+
 table(['Regra','Detalhe'],(r?.issues||[]).map(x=>[str(x.code),str(x.detail)]))+
 table(['Rodada','Horário','Origem','Revisão','Resultado'],monitorRuns.slice().reverse().map(x=>[str(x.round),str(x.at),str(x.source),str(x.revision??'—'),str(x.status)]))+
 '<p>Histórico desta sessão limitado às últimas 48 verificações, exportável. Nunca altera lançamentos, fecha acertos, reenvia WAL ou esconde falhas.</p>',true)+'</div>';
}
async function runMonitor(trigger){
 if(monitorRunning||busy||!doc)return;
 monitorRunning=true;monitorLastAttempt=Date.now();const at=new Date().toISOString(),round=++monitorRound;let state=null,integrity=null,audit=null,scriptReport=null,readError='';
 try{state=await (remoteLab?remoteLab.state():read());if(state){integrity=api.inspect(state);audit=window.HLGBLabAuditorV3?.analyze(state);}}catch(e){readError=String(e.message||e);}
 try{scriptReport=monitorScriptReport();}catch(e){readError+=(readError?' · ':'')+String(e.message||e);}
 try{const r=window.HLGBLabMonitorV1.evaluate({state,integrity,audit,scriptReport,source:remoteLab?'postgres_local':'indexeddb',at,round,trigger});if(readError){r.issues.push({code:'ERRO_LEITURA',detail:readError});r.status='investigar';}monitorRuns.push(r);monitorRuns=monitorRuns.slice(-48);}
 finally{monitorRunning=false;const node=$('monitor-area');if(node)node.outerHTML=monitorPanel();}
}
function startMonitor(){if(monitorClock!==null)return;void runMonitor('abertura');monitorClock=setInterval(()=>{void runMonitor('horario');},MONITOR_INTERVAL);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-(monitorLastAttempt||0)>=MONITOR_INTERVAL)void runMonitor('retorno_aba');});}

function multiFlowLabPart(s,part){
 const ui=window.HLGBLabMultiFlowUiV1,model=window.HLGBLabMultiFlowV1;
 if(!ui||!model)return panel('Fluxo multimodelo indisponível',
  '<p>Os movimentos não podem ser realizados: módulo ainda não carregado.</p>',true);
 if(part==='balance')return ui.balancePanel(s,model);
 if(part==='faction')return ui.factionPanel(s,model);
 if(part==='separacao')return ui.separationPanel(s,model);
 if(part==='acerto')return ui.acertoPanel(s,model);
 if(part==='fila')return ui.queuePanel(s,model);
 return '';
}
function moduleHtml(s){
 const o=orderOptions(s),openPlans=(s.cutPlans||[]).filter(p=>p.status==='aberto'),
  planOptions=selector(openPlans,p=>p.id+' · '+p.orderId+' · '+sum(p.grade)+' peças'),
  defaultOrder=s.orders[0],defaultPlan=openPlans[0],
  materials=selector(s.materials,m=>m.name+' · '+m.stockGrams+'g'),clients=selector(s.clients,x=>x.name),
 products=selector(s.products,x=>x.name+' · '+x.sku),factions=selector(s.factions,x=>x.name+' · '+fmt(x.unitCents)+'/peça'),
 suppliers=selector(s.suppliers,x=>x.name),settlements=selector(s.settlements,x=>x.id+' · '+fmt(x.amountCents)+' · '+x.status),
 purchases=selector(s.purchaseOrders.filter(x=>!x.received&&!x.cancelled),
  x=>x.id+' · '+x.qtyGrams+'g'),
 finance=selector(s.finance.filter(x=>x.status==='aberto'),x=>x.id+' · '+fmt(x.amountCents)+' · '+x.description),
 employees=selector(s.employees,x=>x.name),incidents=selector(s.errors.filter(x=>x.status==='aberto'),x=>x.id+' · '+x.message);
 switch(active){
 case 'nucleo':return fullProgramTestPanel(s)+multiFlowLabPart(s,'fila')+panel('Assistente HLGB 3.0','<p>Consulte prioridades, produção, financeiro, estoque e auditoria com evidências.</p><button type="button" class="btn" data-goto="bot">Abrir Assistente</button>')+panel('Módulos opcionais com desativação segura',
 (window.HLGBLabModules?table(['Módulo','Versão','Ativo','Falhas isoladas'],window.HLGBLabModules.list().map(x=>[
 str(x.id),str(x.version),x.enabled?'Sim':'Não',str(x.failures)])):
 '<p>Registro modular indisponível; funções legadas permanecem acessíveis.</p>')+
 '<div class="actions"><button type="button" class="btn" data-toggle-observer="true">Alternar Observabilidade 2.0 (apenas nesta aba)</button></div>'+
 '<p class="caption">Uma falha no módulo de diagnóstico não bloqueia pedidos, acertos, títulos ou qualquer função anterior. Flag apenas em memória desta aba.</p>',true)+
 panel('Roteiro guiado do fluxo integrado',guidedJourney(s),true)+
 panel('Como testar o fluxo completo',refDocs(s)+
 '<ol class="tips"><li>Em <b>Pedidos</b>, crie uma encomenda P/M/G.</li><li>Em <b>Corte</b>, corte algumas peças; o material será consumido.</li>'+
 '<li>Em <b>Facções</b>, envie as peças cortadas e registre retorno parcial.</li><li>Em <b>Acertos</b>, verifique o título criado; em <b>Separação</b>, dê baixa e despache.</li>'+
 '<li>Em <b>Hub Financeiro</b>, confira a conta a receber do pedido e a conta a pagar do acerto.</li><li>Atualize a página e volte aos módulos. Os registros devem permanecer.</li></ol>',true)+
 panel('Saúde do documento',table(['Regra','Resultado'],Object.entries(api.inspect(s)).filter(([k,v])=>typeof v!=='object').map(([k,v])=>[str(k),str(v)])))+
 panel('Confiabilidade e limites','<p><b>O que funciona aqui:</b> transação local IndexedDB, revisão para evitar sobrescrita por outra aba, confirmação por releitura do comando, auditoria e validações de quantidade.</p>'+
 '<p><b>O que falta:</b> sincronização entre computadores, login real, WAL remoto, RLS empresarial, PDF e pagamentos efetivos. Use o simulador de duas sessões do laboratório para testes de falhas mais amplos.</p>');
 case 'autenticacao':return panel('Permissões — demonstração isolada',
 (remoteLab?'<p>O laboratório remoto tem três funcionários fictícios com acesso segregado e desativação no PostgreSQL local. Os PINs demonstrativos não são autenticação empresarial. <a href="./acessos-lab.html">Abrir gestão de acessos do laboratório</a></p>':
 '<p>Os perfis abaixo são apenas referência para o futuro controle de acesso; esta página offline não usa login.</p>')+
 table(['Perfil','Escopo proposto','Situação empresarial'],[['Supervisor','Cadastros, aprovações e relatórios','Pendente'],['Produção','Pedidos, corte, facções e separação','Pendente'],
 ['Financeiro','Acertos, Hub, compras e comprovantes','Pendente'],['Consulta','Visualização sem alterar','Pendente']]),true);
 case 'pedidos':return importOrdersPanel(s)+panel('Grade por cor e tamanho no próprio Pedido',colorMatrixCreateForm(s),true)+
 orderColorGradePanel(s)+multiOrderPanel(s)+multiFlowLabPart(s,'balance')+panel('Incluir pedido com grade — modo antigo sem cores',
 form('order.add','Novo pedido fictício',[
 field('clientId','Cliente','select','',clients),field('productId','Modelo','select','',products),
 ...api.sizes.map(z=>field(z,'Quantidade '+z,'int',z==='M'?10:0))],'Cadastrar pedido'))+
 panel('Fluxo e integridade',refDocs(s)+
 '<p>O pedido já gera uma conta fictícia a receber. Corte, produção e separação precisam respeitar a grade.</p>')+
 panel('Pedidos e seus saldos',orderTable(s),true);
 case 'produtos':return factionMaterialsPanel(s,'produtos')+servicePanels(s,'produtos')+materialRecipePanels(s)+panel('Ficha técnica básica e SKU',
 form('product.add','Cadastrar modelo',[field('name','Nome do modelo'),field('sku','SKU único'),
 field('materialId','Material principal','select','',materials),
 field('gramsPerUnit','Consumo por unidade (g)','int','80'),
 field('priceCents','Preço de venda R$','money','39,90')],'Cadastrar modelo'))+
 panel('Referência dos materiais','<p>O corte fictício continua utilizando o consumo principal registrado ao cadastrar o modelo. A nova receita detalhada é usada somente na previsão de materiais, sem alterar baixas antigas.</p>')+
 panel('Modelos cadastrados',table(['SKU','Modelo','Material','Consumo','Preço'],s.products.map(x=>[
 str(x.sku),str(x.name),str(ref(s.materials,x.materialId)?.name),str(x.gramsPerUnit)+'g',fmt(x.priceCents)])),true);
 case 'corte':{
  const gradeFields=(g)=>api.sizes.map(z=>field(z,'Quantidade '+z,'int',g?.[z]||0));
  const planned=(s.cutPlans||[]),done=planned.filter(x=>x.status==='concluido');
  const rows=planned.map(p=>[
   str(p.id)+'<div class="caption">'+str(p.orderId)+'</div>',
   api.sizes.map(z=>z+': '+p.grade[z]).join(' / '),
   str(p.workMode)+'<div class="caption">'+str(p.cutterOne)+' / '+str(p.cutterTwo)+' / '+str(p.spreader)+'</div>',
   str(p.theoreticalGrams)+' g',
   p.status==='concluido'?str(p.usefulGrams)+' g útil + '+str(p.scrapGrams)+' g lixo':'—',
   '<span class="chip '+(p.status==='aberto'?'wait':'')+'">'+str(p.status)+'</span>',
   '<button type="button" class="btn" data-print-plan="'+str(p.id)+'">Imprimir folha</button>'
  ]);
  return multiCutPanel(s)+cutSplitPanel(s)+bomCutPanels(s)+panel('Grade editável do pedido',
   form('order.grade.update','Ajustar quantidades por tamanho',[
    field('orderId','Pedido','select','',o),...gradeFields(defaultOrder?.grade)
   ],'Salvar grade e conferir valor do pedido')+
   '<p>O pedido não pode ser reduzido abaixo de cortes já executados nem das quantidades reservadas. O título a receber é recalculado apenas quando está aberto.</p>')+
  panel('Lotes de corte e equipe',
   form('cut.plan','Nova folha de corte',[
    field('orderId','Pedido','select','',o),...gradeFields(api.makeGrade()),
    field('workMode','Origem do serviço','select','',[['interno','Interno'],['externo','Externo']]),
    field('cutterOne','Cortador 1','text','Ana Cortadora'),
    field('cutterTwo','Cortador 2','text','Beto Cortador'),
    field('spreader','Enfestador','text','Carla Enfestadora')
   ],'Planejar lote')+
   '<p>Crie várias folhas para dividir a grade de um pedido. Uma folha aberta reserva quantidades, mas não consome material até a conclusão.</p>')+
  panel('Modificar ou cancelar folha em aberto',
   form('cut.plan.update','Alterar equipe e grade do lote',[
    field('id','Folha aberta','select','',planOptions),...gradeFields(defaultPlan?.grade),
    field('workMode','Origem do serviço','select','',[['interno','Interno'],['externo','Externo']]),
    field('cutterOne','Cortador 1','text',defaultPlan?.cutterOne||'Ana Cortadora'),
    field('cutterTwo','Cortador 2','text',defaultPlan?.cutterTwo||'Beto Cortador'),
    field('spreader','Enfestador','text',defaultPlan?.spreader||'Carla Enfestadora')
   ],'Atualizar planejamento')+
   form('cut.plan.cancel','Cancelar folha sem apagar histórico',[
    field('id','Folha aberta','select','',planOptions)
   ],'Cancelar folha aberta'))+
  panel('Conferir peso e concluir o corte',
   form('cut.plan.complete','Baixa auditada com duas conferências',[
    field('id','Folha em aberto','select','',planOptions),
    field('usefulGrams','Peso útil utilizado (g)','int',defaultPlan?.theoreticalGrams||0),
    field('scrapGrams','Peso do lixo/desperdício (g)','int',0),
    field('signatureOne','Conferência digitada do cortador 1','text',''),
    field('signatureTwo','Conferência digitada do cortador 2','text','')
   ],'Concluir lote e baixar estoque')+
   '<p>O sistema desconta <b>peso útil + lixo</b>. As duas conferências digitadas devem coincidir com os nomes dos cortadores, mas não representam assinatura legal.</p>')+
  panel('Corte simplificado — função preservada',
   form('cut.record','Corte avulso por tamanho',[
    field('orderId','Pedido','select','',o),
    field('size','Tamanho','select','',api.sizes.map(z=>[z,z])),
    field('qty','Quantidade','int','5')
   ],'Baixar corte manual')+
   '<p>Para preservar o exercício anterior, esta baixa continua disponível. Não consome peças reservadas por folhas abertas.</p>')+
  panel('Quantidade de pedidos e corte',orderTable(s),true)+
  panel('Folhas e indicadores de peso',
   table(['Folha','Grade','Equipe','Peso teórico','Baixa real','Status','Impressão'],rows)+
   '<div class="flow"><span>Peso útil: '+str(done.reduce((a,p)=>a+p.usefulGrams,0))+' g</span>'+
   '<span>Lixo: '+str(done.reduce((a,p)=>a+p.scrapGrams,0))+' g</span></div>'+
   '<p>Imprimir folha abre o diálogo de impressão do navegador para gerar papel ou salvar como PDF. Somente informações fictícias.</p>',true);
 }
 case 'producao':return pcpPanels(s)+panel('Acompanhamento PCP',refDocs(s)+
 '<p>Envio e retorno são registrados na guia <b>Facções</b>; não são permitidas baixas que excedam etapas anteriores.</p>'+
 table(['Pedido','Cortadas','Enviadas','Retornadas','Pendentes retorno'],s.orders.map(x=>[
 str(x.id),str(sum(x.cut)),str(x.allocated),str(x.returned),str(x.allocated-x.returned)])))+
 panel('Próximas operações','<div class="actions"><button class="btn primary" type="button" data-goto="faccoes">Gerenciar facções</button>'+
 '<button class="btn" type="button" data-goto="separacao">Separação</button></div>');
 case 'separacao':return multiFlowLabPart(s,'separacao')+packagingPanel(s)+packerAssignmentsPanel(s)+panel('Baixa de separação / expedição',
 form('order.separate','Separar parcialmente',[field('orderId','Pedido','select','',o),
 field('qty','Quantidade para separar','int','5')],'Confirmar separação')+
 form('order.ship','Expedir peças separadas',[field('orderId','Pedido','select','',o),
 field('qty','Peças expedidas','int','5')],'Registrar despacho'))+
 panel('Validação da etapa','<p>Separação só pode usar quantidade já retornada. O despacho não pode ser maior que a separação registrada. Cada ação gera evento local.</p>')+
 panel('Saldo a separar e expedir',table(['Pedido','Retornado','Separado','Despachado'],s.orders.map(x=>[
 str(x.id),str(x.returned),str(x.separated),str(x.shipped)])),true);
 case 'faccoes':{
 const rows=s.factionAssignments||[];
 const unclassified=selector(s.orders.filter(x=>!x.colorGrades?.length),
  x=>x.id+' · '+(ref(s.products,x.productId)?.name||'Modelo')+' · '+sum(x.grade)+' peças');
 const classified=s.orders.filter(x=>x.colorGrades?.length);
 const colorOptions=[...new Set([
  ...(s.colorCatalog||window.HLGBLabMaterialsPlannerV1?.seed?.()||[]).map(x=>x.name),
  ...classified.flatMap(x=>x.colorGrades.map(g=>g.color))
 ])].map(x=>[x,x]);
 const sizeOptions=api.sizes.map(x=>[x,x]);
 const colorAssignmentOptions=selector(rows.filter(x=>classified.some(o=>o.id===x.orderId)),
  x=>x.id+' · '+x.orderId+' · '+(ref(s.factions,x.factionId)?.name||'—')+
   ' · '+(x.qtySent-x.qtyReturned)+' peças pendentes');
 const pendingTransfer=selector(s.orders.filter(x=>!x.colorGrades?.length&&x.allocated>0&&x.returned===0&&
  rows.filter(a=>a.orderId===x.id).length<=1),
  x=>x.id+' · '+(ref(s.factions,x.factionId)?.name||'—')+' · '+x.allocated+' peças');
 const pendingSimple=selector(s.orders.filter(x=>!x.colorGrades?.length&&x.allocated>x.returned&&
  rows.filter(a=>a.orderId===x.id).length<=1),
  x=>x.id+' · '+(ref(s.factions,x.factionId)?.name||'—')+' · '+(x.allocated-x.returned)+' peças');
 const pendingAssignments=selector(rows.filter(x=>!classified.some(o=>o.id===x.orderId)&&x.qtySent>x.qtyReturned),
  x=>x.id+' · '+x.orderId+' · '+(ref(s.factions,x.factionId)?.name||'—')+
  ' · '+(x.qtySent-x.qtyReturned)+' peças aguardando');
 const transferable=selector(rows.filter(x=>!classified.some(o=>o.id===x.orderId)&&x.qtySent>1&&x.qtySent>x.qtyReturned),
  x=>x.id+' · '+x.orderId+' · '+(ref(s.factions,x.factionId)?.name||'—')+
  ' · '+(x.qtySent-x.qtyReturned)+' peças disponíveis');
 return multiFlowLabPart(s,'faction')+factionMaterialsPanel(s,'faccoes')+servicePanels(s,'faccoes')+panel('Preço específico das peças que já estão na facção',
   form('faction.assignment.rate.set','Negociar mão de obra por envio pendente',[
    field('assignmentId','Envio / pedido / facção','select','',selector(rows.filter(x=>x.qtySent>x.qtyReturned),x=>
      x.id+' · '+x.orderId+' · '+(ref(s.factions,x.factionId)?.name||'—')+
      ' · '+(x.qtySent-x.qtyReturned)+' pendentes')),
    field('unitCents','Preço bruto por peça (R$)','money','0,00'),
    field('travetaCents','Desconto de travetada por peça (R$)','money','0,00'),
    field('reason','Justificativa da negociação','text','')
   ],'Salvar tarifa deste envio')+
   '<p id="assignment-rate-preview" class="caption" role="status"></p>'+
   '<p>A tarifa vale apenas para os próximos retornos deste envio, incluindo devoluções e retornos por cor/tamanho. Não altera o preço geral do modelo nem os acertos existentes. A troca integral de facção desativa o acordo da origem, conservando o histórico.</p>'+
   table(['Envio','Facção','Bruto/peça','Travetada/peça','Peças pendentes na negociação','Justificativa'],
    rows.flatMap(x=>(x.rateAgreementHistory||[]).map(h=>[
     str(x.id),str(ref(s.factions,h.factionId)?.name||h.factionId),
     h.mode==='reset'?'Acordo encerrado':fmt(h.gross),h.mode==='reset'?'—':fmt(h.discount),
     str(h.pendingQty??'—'),str(h.reason)
    ]))),true)+
  panel('Cadastro e regras por facção',
 form('faction.add','Cadastrar facção fictícia',[
  field('name','Nome da facção'),field('unitCents','Preço padrão por peça (R$)','money','6,00'),
  field('traveta','Faz travetada?','select','',[['true','Sim'],['false','Não']])
 ],'Cadastrar facção')+
 form('faction.rate.set','Definir preço específico por modelo',[
  field('factionId','Facção','select','',factions),
  field('productId','Modelo','select','',products),
  field('unitCents','Preço bruto por peça (R$)','money','6,00'),
  field('reason','Motivo da alteração','text','Preço específico fictício')
 ],'Salvar preço para próximos retornos')+
 form('faction.traveta.set','Alterar regra de travetada',[
  field('factionId','Facção','select','',factions),
  field('traveta','Faz travetada?','select','',[['true','Sim'],['false','Não']]),
  field('reason','Motivo','text','Nova regra para retornos futuros')
 ],'Salvar regra futura')+
 '<p>Preços e travetada alterados só valem para novos retornos. Acertos existentes mantêm os valores que tinham quando foram criados.</p>')+
 panel('Envio, troca controlada e retorno',
 form('faction.allocate','Enviar peças cortadas',[
  field('orderId','Pedido','select','',unclassified),field('factionId','Facção','select','',factions),
  field('qty','Quantidade a enviar','int','5')
 ],'Enviar peças')+
 form('faction.reassign','Transferir antes do primeiro retorno',[
  field('orderId','Pedido já enviado, sem retorno','select','',pendingTransfer),
  field('factionId','Nova facção','select','',factions),
  field('reason','Motivo obrigatório','text','Troca de facção no teste')
 ],'Registrar transferência com histórico')+
 form('faction.return','Registrar retorno parcial',[
  field('orderId','Pedido','select','',pendingSimple),field('qty','Quantidade devolvida','int','3')
 ],'Confirmar retorno e gerar acerto')+
 '<p>A troca fica bloqueada se já existir retorno/acerto. Ela é um exemplo de transferência total antes do primeiro retorno, não uma redistribuição avançada entre várias facções.</p>')+
 panel('Grade por cor e tamanho — cada facção recebe a quantidade certa',
 form('order.color.grade.set','Cadastrar ou corrigir uma cor antes do primeiro envio',[
  field('orderId','Pedido sem envios','select','',
   selector(s.orders.filter(x=>x.allocated===0),
    x=>x.id+' · '+(ref(s.products,x.productId)?.name||'Modelo'))),
  field('color','Cor cadastrada','select','',colorOptions),
  ...api.sizes.map(sz=>field(sz,sz+' — peças desta cor','int','0'))
 ],'Salvar quantidades da cor')+
 '<p class="caption">Cadastre uma linha para cada cor, usando P, M, G e GG. A soma de todas as cores deve corresponder à grade total do pedido antes de enviar. Digitar tudo zero remove uma cor já cadastrada, enquanto não houver envios. A grade geral do pedido permanece preservada.</p>'+
 table(['Pedido','Cor','P','M','G','GG','Total'],
  classified.flatMap(o=>o.colorGrades.map(g=>[str(o.id),str(g.color),
   ...api.sizes.map(sz=>str(g.grade[sz])),str(sum(g.grade))])))+
 '<h3>Conferência antes de alocar</h3>'+
 table(['Pedido','Situação','Falta P','Falta M','Falta G','Falta GG'],
  classified.map(o=>{
   const totals=Object.fromEntries(api.sizes.map(sz=>[sz,
    o.grade[sz]-o.colorGrades.reduce((n,g)=>n+g.grade[sz],0)]));
   const complete=api.sizes.every(sz=>totals[sz]===0);
   return [str(o.id),complete?'Completa para alocar':'Incompleta — finalize as cores',
    ...api.sizes.map(sz=>str(totals[sz]))];
  })),true)+
 panel('Distribuição, retornos e transferências por cor/tamanho',
 form('faction.grade.allocate','Enviar peças identificadas por cor/tamanho',[
  field('orderId','Pedido com cores cadastradas','select','',
   selector(classified,x=>x.id+' · '+(ref(s.products,x.productId)?.name||'Modelo'))),
  field('factionId','Facção de destino','select','',factions),
  field('color','Cor','select','',colorOptions),
  field('size','Tamanho','select','',sizeOptions),
  field('qty','Quantidade a enviar','int','1')
 ],'Enviar peças da grade')+
 form('faction.grade.return','Retornar peças com identificação exata',[
  field('assignmentId','Envio da facção','select','',colorAssignmentOptions),
  field('color','Cor retornada','select','',colorOptions),
  field('size','Tamanho retornado','select','',sizeOptions),
  field('qty','Quantidade retornada','int','1')
 ],'Gerar acerto da cor/tamanho')+
 form('faction.grade.transfer','Transferir saldo identificado para outra facção',[
  field('fromAssignmentId','Envio de origem','select','',colorAssignmentOptions),
  field('toFactionId','Facção que receberá','select','',factions),
  field('color','Cor','select','',colorOptions),
  field('size','Tamanho','select','',sizeOptions),
  field('qty','Quantidade a transferir','int','1'),
  field('reason','Justificativa','text','Redistribuição fictícia da grade')
 ],'Transferir com histórico por cor/tamanho')+
 '<p class="caption">Se uma facção recebeu 3 peças pretas M, ela não poderá devolver 4 peças pretas M nem substituir por outra cor. Valores de acertos já pagos continuam imutáveis. Os formulários simples anteriores não deixam enviar pedidos já classificados por cor.</p>'+
 '<h3>Saldo por oficina, cor e tamanho</h3>'+
 table(['Envio','Pedido','Facção','Cor','Tamanho','Enviadas','Retornadas','Pendentes'],
  rows.flatMap(row=>(row.gradeLines||[]).map(line=>[
   str(row.id),str(row.orderId),
   str(ref(s.factions,row.factionId)?.name||row.factionId),
   str(line.color),str(line.size),str(line.sent),str(line.returned),
   str(line.sent-line.returned)]))),true)+
 panel('Distribuir um pedido entre múltiplas facções',
 form('faction.multi.allocate','Enviar lote parcial a uma facção',[
  field('orderId','Pedido com peças cortadas','select','',unclassified),
  field('factionId','Facção que receberá o lote','select','',factions),
  field('qty','Peças desse envio','int','2')
 ],'Alocar peças sem sobrescrever outros destinos')+
 form('faction.multi.transfer','Transferir parte das peças ainda não retornadas',[
  field('fromAssignmentId','Envio da facção de origem','select','',transferable),
  field('toFactionId','Facção de destino','select','',factions),
  field('qty','Peças para transferir','int','1'),
  field('reason','Justificativa obrigatória','text','Redistribuição de saldo pendente fictício')
 ],'Registrar transferência parcial com histórico')+
 '<p class="caption">A transferência não altera acertos anteriores nem aumenta o total enviado do pedido. Não permite esvaziar completamente a origem nesta rotina parcial.</p>'+
 form('faction.multi.return','Registrar retorno da facção correta',[
  field('assignmentId','Envio específico e saldo a retornar','select','',pendingAssignments),
  field('qty','Quantidade que retornou','int','1')
 ],'Registrar retorno e gerar acerto dessa facção')+
 '<p class="caption">As quantidades de cada facção são independentes. O envio antigo continua disponível para pedidos com destino único. Para pedidos divididos, use o retorno pelo envio específico; assim o acerto e o título financeiro mostram a facção correta.</p>',true)+
 panel('Distribuição por pedido e facção — rastreabilidade',
 table(['Envio','Pedido','Facção','Peças enviadas','Retornadas','Faltam retornar','Origem'],
  rows.map(x=>[str(x.id),str(x.orderId),
   str(ref(s.factions,x.factionId)?.name||x.factionId),
   str(x.qtySent),str(x.qtyReturned),str(x.qtySent-x.qtyReturned),
   str(x.origin||'legado-local')]))+
 '<p class="caption">As peças devolvidas antes do pagamento ajustam o saldo da facção original, sem afetar as outras. Não é um extrato da base real.</p>',true)+
 panel('Histórico permanente de transferências parciais entre facções',
 table(['ID','Pedido','De','Para','Peças','Antes → depois (origem)','Antes → depois (destino)','Justificativa'],
  (s.factionPartialTransfers||[]).map(m=>[
   str(m.id),str(m.orderId),
   str(ref(s.factions,m.fromFactionId)?.name||m.fromFactionId),
   str(ref(s.factions,m.toFactionId)?.name||m.toFactionId),
   str(m.qty),str(m.fromBefore)+' → '+str(m.fromAfter),
   str(m.toBefore)+' → '+str(m.toAfter),str(m.reason)]))+
 '<p class="caption">Somente o saldo pendente muda de responsável; a trilha de cada transferência fica vinculada ao comando que a criou.</p>',true)+
 panel('Lista de facções e preços',
 '<div class="field"><label for="faction-search">Buscar facção</label>'+
 '<input id="faction-search" class="input" data-filter-for="faction-table" type="search" placeholder="Nome, modelo, preço..."></div>'+
 '<div id="faction-table">'+table(['Facção','Preço padrão','Travetada','Preços por modelo'],s.factions.map(x=>[
  str(x.name),fmt(x.unitCents),x.traveta?'Sim':'Não',
  Object.entries(x.productRates||{}).map(([productId,cents])=>
    str(ref(s.products,productId)?.name||productId)+': '+fmt(cents)).join(' · ')||'Padrão'
 ]))+'</div>'+
 '<p class="caption">A prévia usa, quando aplicável, um desconto ilustrativo de R$ 0,50/peça para facções que não travetam. Configure preço específico e confira o valor líquido no acerto. Não representa a tabela oficial.</p>')+
 panel('Pedidos, transferências e rastreabilidade',
 orderTable(s)+
 '<h3>Trocas registradas</h3>'+
 table(['ID','Pedido','De','Para','Peças','Motivo'],(s.factionTransfers||[]).map(x=>[
 str(x.id),str(x.orderId),str(ref(s.factions,x.fromFactionId)?.name),
 str(ref(s.factions,x.toFactionId)?.name),str(x.qty),str(x.reason)
 ])),true);
 }
 case 'acertos':{
 const open=selector(s.settlements.filter(x=>x.status==='aberto'&&!x.gradeTracked),
  x=>x.id+' · '+fmt(x.amountCents)+' · '+(ref(s.factions,x.factionId)?.name||'—'));
 const trackedOpen=selector(s.settlements.filter(x=>x.status==='aberto'&&x.gradeTracked&&x.qty>1),
  x=>x.id+' · '+x.color+' '+x.size+' · '+fmt(x.amountCents));
 const allOpen=selector(s.settlements.filter(x=>x.status==='aberto'),
  x=>x.id+' · '+fmt(x.amountCents)+' · '+(ref(s.factions,x.factionId)?.name||'—'));
 const paid=selector(s.settlements.filter(x=>x.status==='pago'),
  x=>x.id+' · Pago '+fmt(x.amountCents)+' · '+(ref(s.factions,x.factionId)?.name||'—'));
 const compensations=s.settlementCompensations||[];
 return multiFlowLabPart(s,'acerto')+groupedAccountPanel(s)+factionClosingPanel(s)+serviceGroupPanel(s)+servicePanels(s,'acertos')+panel('Serviços avulsos e embalagem',
 form('settlement.add','Novo acerto avulso fictício',[
  field('serviceType','Tipo de serviço','select','',[['costura','Costura avulsa'],['embalagem','Embalagem']]),
  field('factionId','Facção / embaladeira','select','',factions),
  field('productId','Modelo','select','',products),
  field('qty','Quantidade','int','20'),
  field('unitCents','Preço por peça (R$)','money','0,25'),
  field('travetaCents','Desconto de travetada por peça (R$)','money','0,00'),
  field('reason','Descrição / justificativa','text','Embalagem fictícia')
 ],'Gerar acerto e título a pagar')+
 '<p>O tipo <strong>Embalagem</strong> usa valor por peça independente da mão de obra de costura. As sugestões de R$ 0,25 para camisola/doll e R$ 0,15 para calcinha são exemplos editáveis, não preços confirmados da empresa.</p>')+
 panel('Corrigir facção e mão de obra de acerto em aberto',
   form('settlement.revise','Alterar sem criar outro pagamento',[
    field('id','Acerto em aberto','select','',allOpen),
    field('factionId','Facção / embaladeira do acerto','select','',factions),
    field('unitCents','Preço bruto por peça (R$)','money','0,00'),
    field('travetaCents','Desconto de travetada por peça (R$)','money','0,00'),
    field('reason','Justificativa da correção','text','')
   ],'Salvar correção e atualizar o mesmo título')+
   '<p id="settlement-revise-preview" class="caption" role="status"></p>'+
   '<p>Em serviço avulso, pode corrigir a pessoa e o preço. Em retorno vinculado ao pedido, o preço pode ser corrigido, mas a facção física não pode ser trocada aqui. O título existente é atualizado, nunca duplicado. Acertos pagos exigem compensação separada.</p>',true)+
  panel('Devolver peças com motivo e histórico',
 form('settlement.pieces.return','Devolução parcial sem apagar o acerto',[
  field('id','Acerto em aberto','select','',open),
  field('qty','Quantidade devolvida','int','1'),
  field('reason','Justificativa obrigatória','text','Peças devolvidas na conferência fictícia')
 ],'Registrar devolução e recalcular Hub')+
 '<p>Somente antes do pagamento. O pedido não pode ficar com retorno abaixo das peças já separadas. A operação mantém o acerto original, o histórico de quantidade anterior e a nova quantia no Hub.</p>')+
 panel('Devolução detalhada antes de pagar — conserva a grade',
 form('settlement.grade.pieces.return','Devolver peças de um acerto com cor/tamanho',[
  field('id','Acerto identificado em aberto','select','',trackedOpen),
  field('qty','Peças devolvidas desta cor/tamanho','int','1'),
  field('reason','Justificativa obrigatória','text','Correção da grade antes da quitação')
 ],'Atualizar acerto, saldo da facção e Hub')+
 '<p class="caption">A devolução só pode usar o mesmo tamanho e cor do acerto. Acertos pagos são protegidos.</p>',true)+
 panel('Ajustar apenas acerto em aberto',
 form('settlement.adjust','Abatimento ou acréscimo rastreado',[
  field('id','Acerto ainda não pago','select','',allOpen),
  field('adjustmentCents','Ajuste total (R$), aceita negativo','signed-money','0,00'),
  field('reason','Motivo','text','Conferência do valor fictício')
 ],'Salvar ajuste e reconciliar Hub')+
 '<p>Se o título vinculado já estiver quitado, não é permitido alterar o pagamento original. A correção pós-pagamento exigirá uma rotina separada de compensação.</p>')+
 panel('Compensação separada de acertos pagos',
 form('settlement.compensate','Corrigir sem reescrever pagamento anterior',[
  field('id','Acerto original já pago','select','',paid),
  field('deltaCents','Diferença em R$ (positiva = pagar; negativa = receber)','signed-money','1,00'),
  field('reference','Referência única para evitar duplicidade','text','CORRECAO-TESTE-001'),
  field('reason','Justificativa obrigatória','text','Compensação fictícia após conferência')
 ],'Criar compensação separada e título novo')+
 '<p><strong>O pagamento original não muda.</strong> Uma diferença positiva gera título fictício a pagar; negativa gera título fictício a receber. A mesma referência não pode ser usada duas vezes no mesmo acerto. É apenas uma demonstração de compensação, não devolução bancária automática nem documento fiscal.</p>')+
 panel('Pesquisar acertos e histórico',
 '<div class="fields" id="settlement-filters">'+
 '<div class="field"><label for="settlement-search">Busca única: acerto, modelo, facção, referência ou motivo</label>'+
 '<input id="settlement-search" class="input" type="search" placeholder="Ex.: ACE-0004, embalagem, AJ-TESTE"></div>'+
 '<div class="field"><label for="settlement-status">Situação do acerto</label><select class="input" id="settlement-status" data-settlement-filter="status">'+
 options([['todos','Todos'],['aberto','Em aberto'],['pago','Pago']])+'</select></div>'+
 '<div class="field"><label for="settlement-faction">Facção ou embaladeira</label><select class="input" id="settlement-faction" data-settlement-filter="faction">'+
 options([['todas','Todas'],...s.factions.map(x=>[x.id,x.name])])+'</select></div>'+
 '<div class="field"><label for="settlement-service">Tipo de serviço</label><select class="input" id="settlement-service" data-settlement-filter="service">'+
 options([['todos','Todos'],['costura','Costura'],['embalagem','Embalagem']])+'</select></div>'+
 '<div class="field"><label for="settlement-compensation">Situação das compensações</label><select class="input" id="settlement-compensation" data-settlement-filter="compensation">'+
 options([['todos','Todas'],['aberto','Em aberto'],['pago','Quitadas']])+'</select></div></div>'+
 '<div class="actions"><button type="button" class="btn" id="settlement-clear-filters">Limpar filtros</button></div>'+
 '<p class="caption" role="status" aria-live="polite" id="settlement-query-summary">Calculando a consulta local...</p>'+
 '<div id="settlement-table">'+table(
 ['Acerto','Facção / serviço','Modelo','Peças','Bruto/peça','Travetada/peça','Ajuste total','Total','Situação','Comprovante'],
 s.settlements.map(x=>[
  str(x.id)+'<div class="caption">'+str(x.orderId||'Avulso')+'</div>',
  str(ref(s.factions,x.factionId)?.name)+'<div class="caption">'+str(x.serviceType||'costura')+'</div>',
  str(ref(s.products,x.productId)?.name||ref(s.products,ref(s.orders,x.orderId)?.productId)?.name||'—'),
  str(x.qty),fmt(x.listUnitCents??x.unitCents),fmt(x.travetaCents||0),
  fmt(x.adjustmentCents),fmt(x.amountCents),
  '<span class="chip '+(x.status==='aberto'?'wait':'')+'">'+str(x.status)+'</span>',
  receiptSummary(s,s.finance.find(f=>f.sourceId===x.id&&f.kind==='pagar')?.id)
 ]))+'</div>'+
 '<h3>Alterações de valores</h3>'+
 table(['Acerto','Evento','Antes','Depois','Motivo'],s.settlements.flatMap(x=>
  (x.history||[]).map(e=>[str(x.id),str(e.commandId),fmt(e.beforeCents),fmt(e.afterCents),str(e.reason)])
  ))+
 '<h3>Histórico de correções de facção e mão de obra</h3>'+
  table(['Acerto / título','Facção anterior → nova','Preço bruto anterior → novo','Travetada anterior → nova','Total anterior → novo','Motivo'],
   s.settlements.flatMap(x=>(x.rateHistory||[]).map(h=>[
    str(x.id)+' · '+str(h.financeId),str(h.fromFactionName)+' → '+str(h.toFactionName),
    fmt(h.before.listUnitCents)+' → '+fmt(h.after.listUnitCents),
    fmt(h.before.travetaCents)+' → '+fmt(h.after.travetaCents),
    fmt(h.before.amountCents)+' → '+fmt(h.after.amountCents),str(h.reason)
   ])))+
  '<h3>Devoluções de peças</h3>'+
 table(['Acerto','Comando','Devolvidas','Antes','Depois','Motivo'],s.settlements.flatMap(x=>
  (x.returns||[]).map(ev=>[str(x.id),str(ev.commandId),str(ev.qty),
   str(ev.beforeQty)+' pç / '+fmt(ev.beforeCents),str(ev.afterQty)+' pç / '+fmt(ev.afterCents),str(ev.reason)])
  ))+
 '<h3>Compensações após pagamento (sem alterar título original)</h3><div id="settlement-compensation-table">'+
 table(['Compensação','Acerto pago','Referência','Diferença','Novo título','Situação','Justificativa','Imprimir'],
 compensations.map(c=>[
  str(c.id),str(c.settlementId),str(c.reference),
  (c.deltaCents>0?'+':'−')+fmt(Math.abs(c.deltaCents)),
  str(c.kind)+' · '+fmt(Math.abs(c.deltaCents)),
  '<span class="chip '+(c.status==='aberto'?'wait':'')+'">'+str(c.status)+'</span>',
  str(c.reason),
  '<button type="button" class="btn" data-print-comp="'+str(c.id)+'">Conferência PDF</button>'
 ]))+'</div>'+
 '<p class="caption">Conferência PDF abre a impressão do navegador. O arquivo gerado não comprova uma transferência bancária real.</p>',true);
 }
 case 'hub':return financeAnalytics(s)+panel('Lançamento do Hub fictício',
 form('finance.add','Novo título',[field('description','Descrição'),field('kind','Tipo','select','',[['pagar','Pagar'],['receber','Receber']]),
 field('amountCents','Valor em R$','money','100,00'),field('category','Categoria','select','',window.HLGBLabFinanceV1.categories.map(x=>[x,x])), '<div class="field"><label>Vencimento (opcional)<input class="input" type="date" name="dueDate"></label></div>'],'Cadastrar título')+
 form('finance.pay','Confirmar lançamento',[field('id','Título aberto','select','',finance),'<div class="field"><label>Data da baixa<input class="input" type="date" name="paidDate" value="2026-11-16" required></label></div>'],'Marcar como quitado ficticiamente')+
 '<p class="caption">Esta ação não movimenta dinheiro. Confirme apenas valores fictícios.</p>')+
 financeRevisionPanels(s)+financeControlPanels(s)+financialBatchPanel(s)+receiptPanel(s)+
 panel('Conferência financeira','<p>Pedidos geram contas a receber; retornos, acertos a pagar. Compensações de acertos pagos criam títulos separados a pagar ou receber, sem alterar o pagamento original. Nenhuma operação movimenta dinheiro real.</p>')+
 panel('Contas do laboratório',financeTable(s),true);
 case 'folha':return payrollIntegratedPanel(s)+panel('Editar salário e passagem por pessoa',
 form('payroll.update','Alterar registro da folha',[field('id','Funcionário','select','',employees),
 field('salaryCents','Salário-base R$','money','2000,00'),
 field('passageCents','Passagem R$','money','120,00'),
 field('extrasCents','Extras R$','money','0,00'),
 field('discountCents','Descontos R$','money','0,00')],'Salvar valores individuais'))+
 panel('Não é cálculo trabalhista','<p>A passagem entra no desembolso separado do salário. Não calcula encargos, FGTS, INSS ou rescisão real. A Folha 2.0 separada possui testes adicionais de ordenação e conflitos.</p>'+
 '<a href="./folha-homologacao.html" class="btn link">Abrir Folha 2.0 detalhada</a>')+
 panel('Saldos da folha fictícia',table(['Funcionário','Base','Passagem','Extras','Descontos','Desembolso'],s.employees.map(e=>[
 str(e.name),fmt(e.salaryCents),fmt(e.passageCents),fmt(e.extrasCents),fmt(e.discountCents),
 fmt(e.salaryCents+e.extrasCents-e.discountCents+e.passageCents)])),true);
 case 'compras':{
 const devolucoes=(s.purchaseReturns||[]),elegiveis=s.purchaseOrders.filter(x=>
  x.received&&!x.cancelled&&!x.returnId&&x.purchaseRequestId&&
  s.purchaseRequests.some(r=>r.id===x.purchaseRequestId&&r.status==='recebida')&&
  s.finance.some(f=>f.sourceId===x.id&&f.kind==='pagar'&&f.status==='aberto')&&
  s.materials.some(m=>m.id===x.materialId&&m.stockGrams>=x.qtyGrams));
 return invoicePanel(s)+supplierQuotePanel(s)+materialsPlanningPanels(s)+requestPanels(s)+panel('Compra com dupla conferência',
 form('purchase.add','Planejar compra',[field('supplierId','Fornecedor','select','',suppliers),
 field('materialId','Material','select','',materials),
 field('qtyGrams','Quantidade (g)','int','3000'),
 field('checkerOne','Conferente 1','text','Aline Teste'),
 field('checkerTwo','Conferente 2','text','Beto Exemplo')],'Registrar compra')+
 form('purchase.receive','Receber compra',[field('id','Compra pendente','select','',purchases)],'Conferir e dar entrada no estoque'))+
 panel('Controle de compras','<p>O recebimento atualiza o estoque e cria uma única conta a pagar. Não é possível receber duas vezes o mesmo pedido de compras. Compras avulsas antigas continuam disponíveis e não são transformadas em requisições sem autorização.</p>')+
 panel('Devolução integral após recebimento — fluxo formal de teste',
  '<p>Uma compra recebida não pode ser simplesmente cancelada. Nesta prévia, a devolução integral exige estoque disponível, documento original e título a pagar aberto. Ela cria uma saída separada de estoque e um crédito a receber do fornecedor, sem apagar a entrada e o título originais. Devolução parcial e compras já pagas continuam bloqueadas.</p>'+
  form('purchase.return.full','Registrar devolução total de uma compra recebida',[
   field('id','Compra recebida e apta à devolução','select','',selector(elegiveis,x=>
    x.id+' · '+str(ref(s.materials,x.materialId)?.name||x.materialId)+
    ' · '+x.qtyGrams+'g · '+fmt(Math.ceil(x.qtyGrams*x.priceCentsKg/1000)))),
   field('reference','Referência única do protocolo','text','DEV-EXEMPLO-001'),
   field('returnedBy','Responsável fictício pela devolução','text','Almoxarife Exemplo'),
   field('reviewedBy','Conferente independente','text','Supervisora Exemplo'),
   field('reason','Justificativa documentada','text','Material recebido com divergência na inspeção fictícia')
  ],'Registrar devolução com novo crédito')+
  '<p class="caption">Não libera movimentação bancária, Nota Fiscal, aprovação autenticada ou devolução física real. Se o estoque já foi consumido, a operação é recusada sem nenhum estorno.</p>',true)+
 panel('Histórico de devoluções e créditos fictícios',
  table(['Devolução','Compra original','Material','Quantidade devolvida','Crédito','Referência','Conferência','Situação'],
   devolucoes.map(x=>[
    str(x.id),str(x.purchaseId),str(ref(s.materials,x.materialId)?.name||x.materialId),
    str(x.qtyGrams)+' g',fmt(x.amountCents),str(x.reference),
    str(x.returnedBy)+' / '+str(x.reviewedBy),str(x.status)+' · '+str(x.creditFinanceId)
   ]))+
  '<p class="caption">Os movimentos de estoque, a conta original e o crédito de devolução continuam nos relatórios e no JSON de evidências.</p>',true)+
 panel('Compras do laboratório',table(['Compra','Fornecedor','Material','Quantidade','Conferentes','Status'],s.purchaseOrders.map(x=>[
 str(x.id),str(ref(s.suppliers,x.supplierId)?.name),str(ref(s.materials,x.materialId)?.name),
 str(x.qtyGrams)+'g',str(x.checkerOne)+' / '+str(x.checkerTwo),
  (x.cancelled?'Cancelada':x.returnId?'Devolvida integralmente':x.received?'Recebida':'Pendente')+
  (x.purchaseRequestId?' · '+str(x.purchaseRequestId):'') ])),true);
 }
 case 'estoque':return panel('Ajuste controlado de materiais',
 form('stock.adjust','Ajustar saldo',[field('materialId','Material','select','',materials),
 field('deltaGrams','Entrada/saída em gramas (ex.: -500)','signed-int','500'),
 field('note','Justificativa','text','Conferência fictícia')],'Registrar ajuste')+
 '<p>Bloqueia saldo negativo. O ajuste exige justificativa e ID de evento.</p>')+
 panel('Saldos disponíveis',table(['Material','Saldo (g)','Custo/kg'],s.materials.map(x=>[
 str(x.name),str(x.stockGrams),fmt(x.priceCentsKg)])))+
 panel('Movimentação de material',table(['ID','Tipo','Material','Variação','Origem'],s.stockLedger.map(x=>[
 str(x.id),str(x.type),str(ref(s.materials,x.materialId)?.name),(x.deltaGrams>0?'+':'')+x.deltaGrams+'g',str(x.sourceId)])),true);
 case 'relatorios':{
 const planning=materialPlannerResult(s);
 const planPanel=planning&&!planning.error?panel('Planejamento teórico de compras por material',
  '<p>'+str(planning.pieces)+' peça(s) simuladas, '+fmt(planning.missingCostCents)+
  ' de falta estimada, sem compras ou baixas automáticas.</p>'+
  table(['Material','Previsto (g)','Faltante (g)','Valor da compra sugerida'],
   planning.materials.map(m=>[str(m.name),str(m.requiredGrams),str(m.missingGrams),
    fmt(m.purchaseCents)])),true):'';
 const requestReport=panel('Histórico de requisições, aprovações e compras vinculadas',
  '<p>Solicitações locais fictícias. A aprovação exige um nome diferente do solicitante; não representa login nem permissão empresarial.</p>'+
  table(['Requisição','Material','Falta na criação (g)','Valor estimado',
   'Solicitante','Aprovador','Status','Compra vinculada'],
   (s.purchaseRequests||[]).map(r=>[
    str(r.id),str(ref(s.materials,r.materialId)?.name||r.materialId),
    str(r.qtyGrams),fmt(r.estimatedCents),str(r.requester),
    str(r.approver||'—'),str(r.status),str(r.purchaseId||'—')])),true);
 const returnsReport=panel('Devoluções formais de compras recebidas',
  table(['Documento','Compra','Fornecedor','Material','Devolvido','Crédito a receber','Protocolo','Motivo'],
   (s.purchaseReturns||[]).map(x=>[
    str(x.id),str(x.purchaseId),str(ref(s.suppliers,x.supplierId)?.name||x.supplierId),
    str(ref(s.materials,x.materialId)?.name||x.materialId),
    str(x.qtyGrams)+' g',fmt(x.amountCents),str(x.reference),str(x.reason)
   ])),true);
 const advanced=observationPanels(s,'relatorios');if(advanced)return costsPanels(s)+managementPanels(s)+advanced+planPanel+requestReport+returnsReport;
 const t=api.totals(s);
 return costsPanels(s)+managementPanels(s)+panel('Indicadores vinculados',table(['Indicador','Valor'],Object.entries(t).map(([k,v])=>[
 str(k),k.includes('Payables')||k.includes('Receivables')||k==='passage'||k==='salaryCash'?fmt(v):str(v)])))+
 panel('Como auditar o relatório','<p>Compare pedidos, corte, retorno, expedição e Hub. Exporte o JSON e confira que cada evento tem ID e revisão.</p>'+
 '<div class="actions"><button class="btn" type="button" data-goto="auditor">Executar integridade</button></div>')+
 panel('Pedidos × Financeiro',orderTable(s)+financeTable(s),true)+requestReport+returnsReport;
 }
 case 'auditor':{
 const advanced=observationPanels(s,'auditor');if(advanced)return monitorPanel()+recoveryPanels(s)+auditV3Panels(s)+advanced;
 const check=api.inspect(s),issues=check.problems;
 return monitorPanel()+recoveryPanels(s)+auditV3Panels(s)+panel('Diagnóstico determinístico',
 (check.ok?'<div class="success">Sem inconsistências nas regras simuladas.</div>':
 '<div class="error">Inconsistências detectadas: '+escape(issues.join('; '))+'</div>')+
 table(['Verificação','Estado'],[['Quantidade cortada ≤ pedida',check.ok?'Conforme':'Verificar'],
 ['Estoque nunca negativo',s.materials.every(x=>x.stockGrams>=0)?'Conforme':'Falha'],
 ['IDs dos eventos únicos',new Set(s.log.map(x=>x.commandId)).size===s.log.length?'Conforme':'Falha'],
 ['Provas de duas sessões empresariais','Não realizadas']]))+
 panel('Limites do auditor','<p>O diagnóstico não aplica autocorreção. Sem banco empresarial, não há prova de saúde do sistema atual, monitoramento remoto ou aprendizagem automática.</p>');
 }
 case 'bot':{
 const advanced=observationPanels(s,'bot');if(advanced)return assistedOrderPanel(s)+assistantPanels(s)+botV3Panels(s)+advanced;
 return assistedOrderPanel(s)+assistantPanels(s)+botV3Panels(s)+panel('Recomendações baseadas em regras fixas',
 '<p>O assistente apenas lê indicadores locais para sugerir o próximo passo. Não usa IA treinada, não aprende, não faz ações sozinho.</p>'+
 '<ol class="tips">'+api.tips(s).map(x=>'<li>'+escape(x)+'</li>').join('')+'</ol>')+
 panel('Ações rápidas','<div class="actions"><button class="btn" data-goto="pedidos">Pedidos</button>'+
 '<button class="btn" data-goto="faccoes">Facções</button><button class="btn" data-goto="hub">Hub</button></div>');}
 case 'central':return panel('Auditor 3.0 e ocorrências','<p>Confira as verificações automáticas e as evidências sem encerrar alertas ativos.</p><button class="btn" type="button" data-goto="auditor">Abrir Auditor 3.0</button>')+panel('Registrar e acompanhar ocorrência',
 form('error.add','Nova falha fictícia',[field('message','Descrição do problema')],'Registrar ocorrência')+
 form('error.resolve','Encerrar ocorrência fictícia',[field('id','Ocorrência em aberto','select','',incidents)],'Encerrar ocorrência'))+
 panel('Saúde do laboratório','<p>O monitor avalia apenas este estado local. Não consulta GitHub Actions, logs de produção ou integrações externas.</p>')+
 panel('Ocorrências',table(['ID','Descrição','Estado'],s.errors.map(x=>[
 str(x.id),str(x.message),str(x.status)])),true);
 case 'impressora3d':return photoPanel(s)+panel('Catálogo 3D fictício',
 form('print.add','Novo item de impressão 3D',[field('name','Produto 3D'),
 field('grams','Filamento por unidade (g)','int','35'),field('priceCents','Preço (R$)','money','12,90'),
 field('stock','Estoque de peças','int','3')],'Cadastrar item 3D'))+
 panel('Estoque 3D fictício',table(['Item','Gramas/unidade','Valor','Estoque'],s.prints.map(x=>[
 str(x.name),str(x.grams)+'g',fmt(x.priceCents),str(x.stock)])),true);
 case 'utilidades':return routePanel(s);
 case 'cadastros':return panel('Clientes e fornecedores',
 form('client.add','Novo cliente fictício',[field('name','Nome do cliente')],'Cadastrar cliente')+
 form('supplier.add','Novo fornecedor fictício',[field('name','Nome do fornecedor')],'Cadastrar fornecedor')+
 form('material.add','Novo material fictício',[field('name','Nome do material'),
 field('priceCentsKg','Custo por kg (R$)','money','28,00')],'Cadastrar material'))+
 panel('Cadastros ativos',table(['Tipo','ID','Descrição'],[
 ...s.clients.map(x=>['Cliente',str(x.id),str(x.name)]),
 ...s.suppliers.map(x=>['Fornecedor',str(x.id),str(x.name)]),
 ...s.materials.map(x=>['Material',str(x.id),str(x.name)]),
 ...s.factions.map(x=>['Facção',str(x.id),str(x.name)])]),true);
 default:return panel('Área de demonstração ainda não selecionada',blank);
 }
}
const searchState={page:1,selected:null,snapshot:null,index:[],results:[]};
function renderGlobalSearch(){
 const service=window.HLGBLabGlobalSearchV1,host=$('global-search-results'),input=$('global-search-query'),filter=$('global-search-module');
 if(!host||!input||!filter||!doc)return;
 if(!service){host.textContent='Pesquisa global temporariamente indisponível. Os módulos continuam acessíveis.';return}
 try{
  if(searchState.snapshot!==doc){searchState.index=service.build(doc);searchState.snapshot=doc}
  if(filter.options.length===1)for(const [id,label] of Object.entries(service.labels))filter.add(new Option(label,id));
  if(!input.value.trim()){host.innerHTML='<p class="caption">Digite um termo ou código para localizar registros, inclusive finalizados.</p>';searchState.results=[];return}
  const r=service.search(searchState.index,input.value,{module:filter.value,page:searchState.page,limit:15});
  if(r.page>Math.max(1,Math.ceil(r.total/r.limit))){searchState.page=1;renderGlobalSearch();return}
  searchState.results=r.items;
  host.innerHTML='<p class="caption" id="global-search-count">'+r.total+' resultado(s) · somente leitura · revisão '+doc.revision+'</p>'+
  (r.items.length?r.items.map((x,i)=>'<div class="search-result"><div><strong>'+str(x.title)+'</strong>'+
    '<p>'+str(x.id)+' · '+str(service.labels[x.module])+' · '+str(x.status)+'</p><p>'+str(x.detail)+'</p></div>'+
    '<button class="btn" type="button" data-search-open="'+i+'">Localizar registro</button></div>').join(''):'<p>Nenhum registro encontrado nesta área.</p>')+
  (r.total>r.limit?'<div class="actions"><button type="button" class="btn" data-search-page="-1" '+(r.page===1?'disabled':'')+'>Anterior</button><span>Página '+r.page+' de '+Math.ceil(r.total/r.limit)+'</span><button type="button" class="btn" data-search-page="1" '+(r.page*r.limit>=r.total?'disabled':'')+'>Próxima</button></div>':'');
 }catch(e){host.textContent='Não foi possível consultar a busca. Os módulos originais continuam disponíveis.'}
}
function openGlobalResult(index){
 const result=searchState.results[index];
 if(!result||!ids.has(result.module)||busy)return;
 searchState.selected=result.key;
 if(result.orderId)journeyOrderId=result.orderId;
 active=result.module;window.location.hash=active;
 if(active==='acertos'){Object.assign(settlementFilters,{query:result.type==='acerto'?result.id:'',status:'todos',faction:'todas',service:'todos',compensation:'todos'})}
 draw();renderGlobalDetail();
}
function renderGlobalDetail(){
 const el=$('global-search-detail');if(!el)return;
 const row=searchState.index.find(x=>x.key===searchState.selected);
 if(!row){el.hidden=true;el.innerHTML='';return}
 el.hidden=false;el.className='search-detail';
 el.innerHTML='<h3>'+str(row.title)+' · '+str(row.id)+'</h3><p>'+str(row.status)+' · '+str(row.detail)+'</p>'+
  (row.orderId?'<p>Pedido vinculado: '+str(row.orderId)+'</p>':'')+
  '<p class="caption">Área aberta: '+str(window.HLGBLabGlobalSearchV1.labels[row.module])+'. Nenhum lançamento alterado.</p>'+
  '<button type="button" class="btn" id="global-search-close">Fechar localização</button>';
 // Destacar somente célula que contenha o ID exato; não selecionar formulários nem gravar.
 const candidates=[...$('module-content').querySelectorAll('tbody tr')];
 const target=candidates.find(tr=>[...tr.querySelectorAll('td')].some(td=>td.textContent.trim().split(/\s+|·/)[0]===row.id)&&!tr.hidden);
 if(target){target.classList.add('search-hit');target.scrollIntoView({block:'nearest'});}
}
const navigationGroups=[["Operação",["pedidos","produtos","corte","producao","faccoes","separacao"]],["Administração",["acertos","hub","folha","compras","estoque","cadastros"]],["Gestão",["relatorios","bot","impressora3d","utilidades"]],["Sistema",["nucleo","autenticacao","auditor","central"]]];
function drawNav(){
 const host=$('module-nav'),focused=document.activeElement?.dataset?.module;host.replaceChildren();
 for(const [label,keys] of navigationGroups){
  const group=document.createElement('div');group.className='nav-group';const title=document.createElement('div');title.className='nav-label';title.textContent=label;group.append(title);
  for(const key of keys){const i=ids.get(key),m=modules[i];
   const b=document.createElement('button');b.type='button';b.dataset.module=key;b.setAttribute('aria-current',active===key?'page':'false');
   const num=document.createElement('span');num.className='n';num.textContent=String(i+1).padStart(2,'0');
   b.append(num,document.createTextNode(m[1]));group.append(b);}
  host.append(group);}
 if(focused){const target=host.querySelector('[data-module="'+focused+'"]');target?.focus({preventScroll:true});}
 const choice=$('mobile-module');if(choice){if(!choice.options.length){for(const [label,keys] of navigationGroups){const g=document.createElement('optgroup');g.label=label;for(const key of keys){const o=document.createElement('option');o.value=key;o.textContent=modules[ids.get(key)][1];g.append(o);}choice.append(g);}}choice.value=active;}
}
function draw(){
 if(!doc)return;
 const mod=modules[ids.get(active)];$('module-title').textContent=mod[1];$('module-description').textContent=mod[2];
 $('top-revision').textContent=(remoteLab?'Revisão servidor ':'Revisão local ')+doc.revision+' · '+doc.log.length+' evento(s) · Sem banco de produção';
 $('environment-mode').textContent=remoteLab?'PostgreSQL de teste · compartilhado':'Banco fictício neste navegador';
 $('environment-warning').textContent=remoteLab?'Homologação local compartilhada em PostgreSQL. Não use dados reais. Não há integração com Supabase, pagamentos ou emissão fiscal.':'Homologação no IndexedDB deste navegador. Abas do mesmo perfil compartilham dados; computadores distintos não. Não use dados ou documentos reais.';
 const t=api.totals(doc),metrics=[
 ['Pedidos fictícios',String(t.orders)],['Peças pedidas',String(t.pieces)],['Peças cortadas',String(t.cut)],
 ['Títulos a pagar abertos',fmt(t.openPayables)]];
 $('global-metrics').innerHTML=metrics.map(([label,value])=>'<div class="metric"><span>'+escape(label)+'</span><strong>'+escape(value)+'</strong></div>').join('');
 try{$('module-content').innerHTML=remotePanel()+moduleHtml(doc);visitedModules.add(active);if(active==='pedidos'){updateColorMatrixPreview();fillOrderColorEdit();multiOrderPreview();}}catch(e){$('module-content').innerHTML=remotePanel()+panel('Não foi possível exibir esta área','<div class="error">'+str(e.message)+'</div><p>Os dados não foram modificados. Abra outro módulo, exporte as evidências ou tente recarregar.</p><button type="button" class="btn" data-goto="auditor">Abrir Auditor</button>',true);}
 if(remoteLab){const allowed=new Set(remoteLab.info().permissions?.allowedCommands||[]);
 for(const f of document.querySelectorAll('#module-content form[data-command]')){if(allowed.has(f.dataset.command))continue;for(const button of f.querySelectorAll('button[type="submit"]')){button.disabled=true;button.title='Ação não autorizada para o perfil fictício';}const notice=document.createElement('p');notice.className='caption';notice.textContent='Permissão de escrita restrita a outro perfil. Não use dados reais.';f.append(notice);}}
 if(active==='acertos'){refreshServicePreview();applySettlementFilters();const f=document.querySelector('form[data-command="settlement.revise"]');if(f)fillSettlementRevision(f);}
 if(active==='faccoes'){const f=document.querySelector('form[data-command="faction.assignment.rate.set"]');if(f)fillAssignmentRate(f);}
 if(active==='hub'){const f=document.querySelector('form[data-command="finance.receipt.attach"]');if(f)updateReceiptTarget(f);const g=document.querySelector('form[data-command="finance.revise"]');if(g)fillFinanceRevision(g);}
 $('audit-trail').innerHTML=doc.log.length?doc.log.slice().reverse().slice(0,28).map(e=>
 '<div class="log-item"><strong>'+escape(e.type)+' · '+escape(e.commandId)+'</strong>'+
 'Revisão '+e.revision+' · '+escape(e.description)+'</div>').join(''):
 '<div class="empty">Sem operações na demonstração. Cadastre um pedido para iniciar.</div>';
 drawNav();renderGlobalSearch();renderGlobalDetail();
}
function parseCents(value,signed=false){
 let raw=String(value).trim();
 if(signed&&raw.startsWith('-'))return -parseCents(raw.slice(1),false);
 if(signed&&raw.startsWith('+'))raw=raw.slice(1);
 if(!/^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw))
  throw Error('Informe reais com até duas casas decimais, ex.: 2.000,00.');
 const parts=raw.split(',');
 const val=Number(parts[0].replace(/\./g,''))*100+Number((parts[1]||'').padEnd(2,'0'));
 if(!Number.isSafeInteger(val))throw Error('Valor monetário inválido.');
 return val;
}
const NUM=['totalGrams','usedGrams','wasteGrams','actualGrams','points','revision','corte','envio','costura','separacao','expedicao','qty','labelQty','gramsPerUnit','qtyGrams','grams','stock','P','M','G','GG','usefulGrams','scrapGrams'];
const SIGNED=['deltaGrams'];
const PRICES=['freightCents','camisola','doll','calcinha','outros','pointCents','priceCents','unitCents','travetaCents','priceCentsKg','amountCents','salaryCents','passageCents','extrasCents','discountCents'];
function parseData(type,form){
 if(['multi.flow.allocate','multi.flow.return','multi.flow.separate','multi.flow.ship'].includes(type)){
  if(!window.HLGBLabMultiFlowUiV1)throw Error('Grade multimodelo indisponível.');
  const data=Object.fromEntries(new FormData(form).entries());
  const lines=window.HLGBLabMultiFlowUiV1.readLines(form);
  return {...data,lines,...(data.unitCents!==undefined?{unitCents:parseCents(data.unitCents)}:{})};
 }
 if(type==='route.plan'||type==='route.revise')return routeInput(form);
 if(type==='packer.progress'){const data=Object.fromEntries(new FormData(form).entries());return {id:data.id,doneQty:Number(data.doneQty),reason:data.reason,correction:data.correction==='true'};}
 if(type==='order.multi.create')return multiOrderInput(form);
 if(type==='order.multi.revise'){
  const id=form.elements.namedItem('id').value,order=doc.multiOrders.find(x=>x.id===id);
  if(!order)throw Error('Pedido multimodelo não encontrado.');
  const changes=[...form.querySelectorAll('[data-revise-qty]')];
  const items=order.items.map(item=>({id:item.id,productId:item.productId,colors:item.colors.map(color=>{
   const grade={};
   for(const size of order.sizes){
    const matches=changes.filter(el=>el.dataset.itemId===item.id&&
      el.dataset.color===color.color&&el.dataset.size===size);
    if(matches.length!==1||!/^(0|[1-9]\d*)$/.test(matches[0].value))
     throw Error('Grade inválida em '+item.name+' / '+color.color+' / '+size);
    grade[size]=Number(matches[0].value);
   }
   return {color:color.color,grade};
  })}));
  return {id,items,reason:form.elements.namedItem('reason').value};
 }

 if(type==='multi.cut.plan'||type==='multi.cut.revise'){
  const data=new FormData(form),lines=[];
  for(const input of form.querySelectorAll('[data-mcut-qty]')){
   const raw=input.value.trim();
   if(!/^(0|[1-9]\d*)$/.test(raw))throw Error('Quantidade inválida em '+input.dataset.mcutColor+' / '+input.dataset.mcutSize);
   const qty=Number(raw);if(!Number.isSafeInteger(qty)||qty>Number(input.max))throw Error('Quantidade maior que o saldo disponível.');
   if(qty)lines.push({color:input.dataset.mcutColor,size:input.dataset.mcutSize,qty});
  }
  if(!lines.length)throw Error('Selecione pelo menos uma peça para programar.');
  return {...Object.fromEntries(data.entries()),lines};
 }
 if(type==='order.add.with.colors'){
  const p=readColorMatrix(form);
  return {clientId:p.clientId,productId:p.productId,colorGrades:p.colorGrades};
 }
 if(type==='order.color.grade.set'&&active==='pedidos'){
  // Na edição de cor o usuário precisa marcar remoção explicitamente.
  const removal=form.elements.namedItem('removeColor')?.checked;
  // A grade é montada pelo bloco genérico abaixo; validação final no retorno.
  if(removal){
   const order=doc.orders.find(x=>x.id===form.elements.namedItem('orderId').value);
   const color=String(form.elements.namedItem('color').value||'').trim().toLocaleLowerCase('pt-BR');
   if(!order?.colorGrades?.some(x=>x.color.trim().toLocaleLowerCase('pt-BR')===color))
    throw Error('Só é possível remover uma cor já cadastrada.');
  }
 }
 if(type==='settlement.service.group'){const p=serviceGroupInput(captureServiceGroup()),q=window.HLGBLabServicesV1.groupPreview(doc,p);if(!serviceGroupResult||serviceGroupResult.revision!==doc.revision||q.signature!==serviceGroupResult.signature)throw Error('Acerto mudou. Confira o total novamente.');return {...p,signature:q.signature,expectedTotalCents:q.total,reason:form.elements.namedItem('reason').value};}
 if(type==='assistant.order.create'){const p=readAssistedDraft();if(!assistedPreview||assistedPreview.revision!==doc.revision||JSON.stringify(p)!==JSON.stringify(assistedDraft))throw Error('Confira nova prévia.');return {...p,signature:assistedPreview.signature,reason:form.elements.namedItem('reason').value};}
 if(type==='purchase.invoice.import'){const p=readInvoiceDraft();if(!invoicePreview||invoicePreview.revision!==doc.revision||JSON.stringify(p)!==JSON.stringify(invoiceDraft))throw Error('Confira nova prévia da nota.');return {...p,declaredCents:parseCents(p.declaredCents),signature:invoicePreview.signature,checkerOne:form.elements.namedItem('checkerOne').value,checkerTwo:form.elements.namedItem('checkerTwo').value,reason:form.elements.namedItem('reason').value};}
 if(type==='order.import.batch'){if(!importResult||importResult.revision!==doc.revision||$('order-import-raw').value!==importDraft)throw Error('CSV mudou. Gere nova prévia.');return {raw:importDraft,signature:importResult.signature,reason:String(form.elements.namedItem('reason').value)};}
 if(type==='payroll.period.create'){if(!payrollPreview||payrollPreview.revision!==doc.revision||$('payroll-new-period').value!==payrollDraft.period||$('payroll-new-due').value!==payrollDraft.dueDate||$('payroll-new-person').value!==payrollDraft.employeeId)throw Error('Folha mudou. Gere nova prévia.');return {...payrollDraft,signature:payrollPreview.signature,reason:String(form.elements.namedItem('reason').value)};}
 if(type==='finance.faction.close'){
  return {factionId:String(form.querySelector('[name="factionId"]')?.value||''),
   financeIds:[...form.querySelectorAll('input[name="financeIds"]')].map(x=>x.value),
   paidDate:String(form.elements.namedItem('paidDate')?.value||''),expectedTotalCents:Number(form.elements.namedItem('expectedTotalCents')?.value),
   reference:String(form.querySelector('[name="reference"]')?.value||''),
   reason:String(form.querySelector('[name="reason"]')?.value||'')};
 }
 if(type==='finance.batch.pay'){
  const ids=[...form.querySelectorAll('input[name="financeIds"]:checked')].map(x=>x.value);
  return {financeIds:ids,reference:String(form.elements.namedItem('reference')?.value||''),
   reason:String(form.elements.namedItem('reason')?.value||'')};
 }
 const raw=Object.fromEntries(new FormData(form).entries()),p={};
 for(const [k,v] of Object.entries(raw)){
  if(NUM.includes(k)||k.startsWith('waste_'))p[k]=Number(v);
  else if(SIGNED.includes(k)){if(!/^[+-]?\d+$/.test(v))throw Error('Ajuste em gramas inválido.');p[k]=Number(v)}
  else if(PRICES.includes(k))p[k]=parseCents(v);
  else if(k==='adjustmentCents'||k==='deltaCents')p[k]=parseCents(v,true);
  else if(k==='traveta')p[k]=v==='true';
  else p[k]=String(v);
 }
 if(type==='cut.bom.execute'){
  p.scrapByMaterial={};
  for(const name of Object.keys(p)){
   if(name.startsWith('waste_')){
    p.scrapByMaterial[name.slice(6)]=p[name];
    delete p[name];
   }
  }
 }
 if(['order.add','order.grade.update','cut.plan','cut.plan.update','cut.plan.split','order.color.grade.set','materials.plan.grade.add'].includes(type)){
  p.grade={};for(const sz of api.sizes){p.grade[sz]=p[sz];delete p[sz]}
 }
 if(type==='order.color.grade.set'&&active==='pedidos'){
  const removal=form.elements.namedItem('removeColor')?.checked;
  if(removal)p.grade=Object.fromEntries(api.sizes.map(sz=>[sz,0]));
  else if(api.sizes.every(sz=>p.grade[sz]===0))
   throw Error('Grade zerada não remove cor. Marque a opção explícita de remoção.');
  delete p.removeColor;
 }
 return p;
}
const DB='HLGB_EVOLUCAO_OPERACAO_INTEGRADA_FICTICIA_V1',STORE='documentos',KEY='operacao-ficticia';
function openDB(){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB,2);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))
   request.result.createObjectStore(STORE,{keyPath:'key'})};
  request.onerror=()=>reject(request.error||Error('IndexedDB indisponível.'));
  request.onblocked=()=>reject(Error('Armazenamento bloqueado por outra aba.'));
  request.onsuccess=()=>{const connection=request.result;connection.onversionchange=()=>{connection.close();status('Nova versão da homologação disponível. Feche as outras abas e recarregue.','error');};resolve(connection);};
 });
}
async function transact(edit,{intent=null,requireClear=false}={}){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),get=store.get(KEY);
  let output=null,err=null;
  const fail=e=>{err=e;try{tx.abort();}catch(ignore){}};
  get.onsuccess=()=>{
   const previous=get.result?.data||api.initial();
   const execute=()=>{
    try{
     output=edit(previous);
     if(output?.state){
      if(intent){
       const e=output.state.log.find(x=>x.commandId===intent.commandId);
       if(!e||e.revision!==intent.expectedRevision+1||e.type!==intent.type||e.actor!==intent.actor)throw Error('Intenção não corresponde à gravação.');
       store.add({key:'intent:'+intent.commandId,intent});
      }
      store.put({key:KEY,data:output.state});
     }else if(!get.result)store.put({key:KEY,data:previous});
    }catch(e){fail(e);}
   };
   if(intent||requireClear){const requests=store.getAll(IDBKeyRange.bound('intent:','intent:\uffff'));requests.onsuccess=()=>{
    try{for(const item of requests.result){const p=item.intent,verdict=window.HLGBLabRecoveryV1.review(previous,p,api.inspect);
     if(!verdict.allowed||verdict.resolution!=='confirmed')throw Error('Existe intenção anterior sem confirmação. Confira no Auditor antes de repetir.');
     store.put({key:'intent-history:'+p.commandId,intent:p,resolution:'confirmed',reviewedAt:new Date().toISOString(),reviewedRevision:previous.revision});
     store.delete(item.key);
    }execute();}catch(e){fail(e);}
   };requests.onerror=()=>{err=requests.error;};}
   else execute();
  };
  get.onerror=()=>{err=get.error;};
  tx.oncomplete=()=>resolve(output);
  tx.onabort=()=>reject(err||tx.error||Error('Transação local abortada.'));
  tx.onerror=()=>{if(!err)err=tx.error;};
 });
}
function archiveIntent(commandId,explicitLegacy=false){
 return new Promise((resolve,reject)=>{
 const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),get=store.get(KEY);let err=null;
 get.onsuccess=()=>{const current=get.result?.data,req=store.get('intent:'+commandId);
 req.onsuccess=()=>{try{const item=req.result;if(!item)throw Error('Intenção já revisada em outra aba.');
 const v=window.HLGBLabRecoveryV1.review(current,item.intent,api.inspect);
 if(!v.allowed||v.resolution==='legacy_absent'&&!explicitLegacy)throw Error(v.message);
 store.put({key:'intent-history:'+commandId,intent:item.intent,resolution:v.resolution,reviewedAt:new Date().toISOString(),reviewedRevision:current.revision});store.delete(item.key);
 }catch(e){err=e;tx.abort();}};};
 tx.oncomplete=()=>resolve();tx.onabort=()=>reject(err||tx.error||Error('Revisão da intenção abortada.'));tx.onerror=()=>{if(!err)err=tx.error;};
 });
}
function intentHistory(){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).getAll(IDBKeyRange.bound('intent-history:','intent-history:\uffff'));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function read(){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),request=tx.objectStore(STORE).get(KEY);
  request.onsuccess=()=>resolve(request.result?.data||null);
  request.onerror=()=>reject(request.error||Error('Falha na releitura.'));
 });
}
async function submit(form,type){
 if(busy||!doc)return;
 if(['settlement.service.group','payroll.period.create','order.import.batch','assistant.order.create','purchase.invoice.import','packaging.complete','cut.plan.split'].includes(type)&&!confirm('Confirmar a prévia e criar os registros fictícios?'))return;
 if(type==='finance.faction.close'&&!confirm('Confirmar somente a baixa fictícia de todos os títulos e o total conferido deste prestador?'))return;
 if(type==='recovery.repair'&&!confirm('Aplicar exclusivamente o reparo de metadado simulado?'))return;
 if(type==='cut.plan.cancel'&&!confirm('Cancelar somente a folha aberta, preservando o histórico?'))return;
 if(type==='order.multi.revise'&&!confirm('Confirmar revisão da grade fictícia com histórico antes/depois? O sistema bloqueará alterações inferiores ao corte programado.'))return;
 if(type==='multi.cut.cancel'&&!confirm('Cancelar somente esta folha de ensaio, mantendo todo o histórico?'))return;
 if(type==='route.cancel'&&!confirm('Cancelar esta rota fictícia mantendo o histórico de todas as paradas?'))return;
 if(type==='order.color.grade.set'&&active==='pedidos'&&form.elements.namedItem('removeColor')?.checked&&
    !confirm('Remover esta cor do pedido? Esta operação registra o histórico e não altera a grade geral.'))return;
 busy=true;
 const button=form.querySelector('button[type=submit]');if(button)button.disabled=true;
 try{
  const expectedRevision=doc.revision;
  if(remoteLab){
   if(syncNoticeRevision!==null&&syncNoticeRevision>expectedRevision)throw Error('Há revisão nova no servidor. Confira as alterações antes de enviar outra operação.');
   const payload=type==='finance.receipt.attach'?await readReceiptPayload(form):type==='print.photo.attach'?await readPrintPhoto(form):type==='purchase.invoice.pdf'?await readInvoicePdf(form):parseData(type,form);
   const result=await remoteLab.submit(type,payload,expectedRevision);
   if(result.status!=='confirmed'){const banner=document.querySelector('#remote-check');if(banner){banner.closest('section').outerHTML=remotePanel();}throw Error('Servidor: '+result.status+' · '+(result.message||'Revise a intenção sem repetir.'));}
   doc=result.state;if(type==='settlement.service.group'){serviceGroupDraft=null;serviceGroupResult=null;}if(type.startsWith('route.'))routeDraft=null;if(type.startsWith('label.template.'))templateEditId=null;if(type.startsWith('packer.'))packerEditId=null;draw();status('Salvo e confirmado no PostgreSQL · '+result.result+' · revisão '+doc.revision+'.');return;
  }
  const payload=type==='finance.receipt.attach'?await readReceiptPayload(form):type==='print.photo.attach'?await readPrintPhoto(form):type==='purchase.invoice.pdf'?await readInvoicePdf(form):parseData(type,form),
   id='OP-DEMO-'+crypto.randomUUID(),actor='Operador fictício';
  const intent={commandId:id,type,expectedRevision,actor,atomicVersion:2,recordedAt:new Date().toISOString()};
  const tx=await transact(previous=>api.apply(previous,{type,payload,commandId:id,actor,expectedRevision,recordedAt:intent.recordedAt}),{intent});
  const saved=await read();
  if(!saved||saved.revision<expectedRevision+1||!saved.log.some(x=>x.commandId===id&&x.revision===expectedRevision+1&&x.type===type&&x.actor===actor))
   throw Error('Gravação inconclusiva: não foi encontrada na releitura. Não repetir sem conferir.');
  const integrity=api.inspect(saved);
  if(!integrity.ok)throw Error('Gravação sem integridade comprovada: '+integrity.problems.join('; '));
  doc=saved;if(type==='settlement.service.group'){serviceGroupDraft=null;serviceGroupResult=null;}if(type.startsWith('route.'))routeDraft=null;if(type.startsWith('label.template.'))templateEditId=null;if(type.startsWith('packer.'))packerEditId=null;try{await archiveIntent(intent.commandId);recoveryIntents=await intentRead();}catch(ignore){}draw();
  if(type==='settlement.compensate'&&payload.id){
   const el=document.querySelector('form[data-command="settlement.compensate"] [name="id"]');
   if(el&&[...el.options].some(opt=>opt.value===payload.id))el.value=payload.id;
  }
  status('Salvo e confirmado por releitura local · '+tx.result+' · revisão '+saved.revision+'.');
 }catch(e){
  if(remoteLab){const banner=document.querySelector('#remote-check');if(banner)banner.closest('section').outerHTML=remotePanel();}
  status(e.message,'error');
  // Não redesenhar o formulário em erro. O rascunho permanece visível.
 }finally{busy=false;if(button&&button.isConnected)button.disabled=false}
}
async function reload(){
 if(remoteLab)return remoteAction(()=>remoteLab.reconcile());
 if(busy)return;busy=true;
 try{
  const latest=await read();if(!latest)throw Error('Documento local não encontrado.');
  const checked=api.inspect(latest);
  if(!checked.ok)throw Error('Integridade do documento local não aprovada: '+checked.problems.join('; '));
  doc=latest;try{recoveryIntents=await intentRead();}catch(ignore){}draw();status('Documento fictício relido do IndexedDB · revisão '+doc.revision+'.');
 }catch(e){status(e.message,'error')}finally{busy=false}
}
async function reset(){
 if(remoteLab){status('Restauração indisponível no banco remoto compartilhado.','error');return;}
 if(busy||!confirm('Restaurar APENAS os cadastros e lançamentos fictícios deste navegador? Todos os exercícios desta prévia serão reiniciados.'))return;
 busy=true;
 try{
  if((await intentRead()).length)throw Error('Existem intenções pendentes. Não restaurar o exercício antes da conferência.');
  const revised=await transact(current=>{
   if(current.revision!==doc.revision)throw Error('CONFLITO: outra aba alterou a prévia. Recarregue primeiro.');
   const next=api.initial();next.revision=current.revision+1;
   const id='OP-DEMO-'+crypto.randomUUID();
   next.revisionProof=id;next.log=[{commandId:id,revision:next.revision,type:'demo.reset',
    actor:'Operador fictício',description:'Dados fictícios restaurados com confirmação'}];
   return {state:next,result:'reset'};
  },{requireClear:true});
  const saved=await read();if(!saved.log.some(e=>e.commandId===revised.state.revisionProof))throw Error('Restauração não confirmada.');
  doc=saved;recoveryIntents=await intentRead();active='nucleo';draw();status('Exemplo fictício restaurado. Nenhum dado empresarial foi afetado.');
 }catch(e){status(e.message,'error')}finally{busy=false}
}
function download(name,content,type){
 const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1400);
}
function exportReport(){
 if(!doc)return;const report={schema:'hlgb-evolucao-operacao-integrada-report-v1',environment:remoteLab?'postgres-local-fictitious':'indexeddb-local-fictitious',
  productionApproval:false,parityApproved:false,modulesAvailable:modules.length,modulesVisited:visitedModules.size,visitedModuleIds:[...visitedModules],exportedAt:new Date().toISOString(),
  userReview:{schema:'hlgb-avaliacao-manual-ficticia-v1',approved:false,items:modules.filter(([id])=>programReviews[id]).map(([id])=>({module:id,...programReviews[id]}))},
  journey:api.journey(doc,journeyOrderId),
  observability:observerResult(doc),auditorV3:auditorV3(doc),botV3:botV3(doc),materialPlanning:materialPlannerResult(doc),
  checks:api.inspect(doc),totals:api.totals(doc),data:{...doc,invoicePdfs:window.HLGBLabOperationsV2.pdfMetadata(doc),printPhotos:window.HLGBLabComplementsV1.photoMetadata(doc),paymentReceipts:window.HLGBLabPaymentBatchV1.receiptMetadata(doc)},receiptBinaryExported:false};
 download('HLGB-EVOLUCAO-OPERACAO-INTEGRADA-FICTICIA.json',JSON.stringify(report,null,2),'application/json');
}
function safeCell(x){let s=String(x??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
function exportCsv(){
 if(!doc)return;
 const rows=[['Tipo','ID','Descrição','Status','Quantidade/valor'],...doc.orders.map(x=>['Pedido',x.id,
 ref(doc.products,x.productId)?.name||'', 'Enviadas: '+x.shipped,sum(x.grade)]),
 ...doc.finance.map(x=>['Financeiro',x.id,x.description,x.status,x.amountCents]),
 ...window.HLGBLabPaymentBatchV1.receiptMetadata(doc).map(x=>['Comprovante fictício',x.id,x.targetId+' · versão '+x.version,x.current?'Atual':'Anterior',x.amountCents]),
 ...(doc.settlementCompensations||[]).map(x=>['Compensação',x.id,x.settlementId+' · '+x.reference,x.status,x.deltaCents]),
 ...(doc.purchaseReturns||[]).map(x=>['Devolução integral',x.id,
  x.purchaseId+' · '+x.reference+' · '+x.reason,x.status,x.qtyGrams]),
 ...doc.purchaseOrders.map(x=>['Compra',x.id,ref(doc.materials,x.materialId)?.name||'',
  (x.cancelled?'Cancelada':x.received?'Recebido':'Pendente')+
   (x.purchaseRequestId?' · '+x.purchaseRequestId:''),x.qtyGrams]),
 ...(doc.purchaseRequests||[]).map(x=>['Requisição',x.id,
  (ref(doc.materials,x.materialId)?.name||x.materialId)+' · '+x.reason,
  x.status+' · '+(x.purchaseId||'sem compra')+
   (x.cancelIssueReference?' · cancelamento '+x.cancelIssueReference:''),x.qtyGrams]),
 ...doc.orders.flatMap(o=>(o.colorGrades||[]).map(c=>
  ['Grade por cor',o.id,c.color,'P/M/G/GG',
   api.sizes.map(sz=>sz+': '+c.grade[sz]).join(' · ')])),
 ...(doc.factionAssignments||[]).flatMap(a=>(a.gradeLines||[]).map(g=>
  ['Peças por facção/cor',a.id,a.orderId+' · '+a.factionId+
   ' · '+g.color+' '+g.size,'Enviadas '+g.sent,g.returned])),
 ...(doc.multiCutPlans||[]).flatMap(c=>c.lines.map(l=>['Corte multimodelo fictício',c.id,c.orderId+' / '+c.itemId+' · '+l.color+' '+l.size,c.status,l.qty])),
 ...(doc.multiCutPlans||[]).flatMap(c=>(c.weightEvents||[]).map(w=>['Peso posterior fictício',c.id,'Total '+w.totalGrams+' g · útil '+w.usedGrams+' g · lixo '+w.wasteGrams+' g',w.commandId,w.revision])),
 ...(doc.bomCutRuns||[]).map(c=>['Corte BOM concluído',c.id,
  c.orderId+' · '+c.color+' '+c.size+' · '+c.qty+' pç',
  c.commandId,c.totalGrams]),
 ...(doc.bomCutRuns||[]).flatMap(c=>c.materials.map(m=>[
  'Material do corte BOM',c.id,m.materialId+' · '+m.ruleId,
  'Útil '+m.requiredGrams+'g · Lixo '+m.scrapGrams+'g',m.totalGrams])),
 ...(doc.colorCatalog||[]).map(c=>['Paleta de cores',c.id,c.name,c.origin,'']),
 ...(doc.materialRecipeRules||[]).map(r=>['Receita de planejamento',r.id,
  r.productId+' · '+r.materialId+' · '+r.color+' '+r.size,
  r.active?'Atual':'Substituída',r.gramsPerUnit]),
 ...(doc.materialPlanLines||[]).map(l=>['Cenário de produção',l.id,
  l.productId+' · '+l.color+' '+l.size,l.active?'Ativo':'Arquivado',l.qty]),
 ...(materialPlannerResult(doc)?.materials||[]).map(m=>['Necessidade de material',m.materialId,
  m.name+' · faltam '+m.missingGrams+' g','Previsto',m.requiredGrams]),
 ...(doc.factionPartialTransfers||[]).map(t=>['Transferência parcial',t.id,
  t.orderId+' · '+t.fromFactionId+' → '+t.toFactionId+' · '+t.reason,
  t.commandId,t.qty]),
 ...(doc.paymentBatches||[]).map(x=>['Pagamento em lote',x.id,
  (x.scope==='faccao'?'Facção '+x.factionNameSnapshot+' · ':'')+x.reference+' · '+x.reason,
  x.status,x.totalCents]),
 ...(doc.paymentBatches||[]).flatMap(x=>x.items.map(i=>
  ['Título quitado no lote',i.financeId,x.id+' · '+i.sourceId,i.sourceType,i.amountCents]))];
 download('HLGB-EVOLUCAO-OPERACAO-INTEGRADA-FICTICIA.csv','\uFEFF'+rows.map(r=>r.map(safeCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');
}
function exportShoppingCsv(){
 if(!doc)return;
 const forecast=materialPlannerResult(doc);
 if(!forecast||forecast.error){status('Lista de materiais não disponível: revise a ficha técnica.','error');return}
 const rows=[
  ['LISTA DE MATERIAIS — PLANEJAMENTO FICTÍCIO, SEM COMPRA EFETIVA'],
  ['Material','Necessidade (g)','Saldo simulado (g)','Falta comprar (g)','Preço/kg (R$)','Custo da falta (R$)'],
  ...forecast.materials.map(x=>[x.name,x.requiredGrams,x.availableGrams,x.missingGrams,
   nr(x.priceCentsKg),nr(x.purchaseCents)]),
  [],
  ['DETALHAMENTO POR MODELO, COR E TAMANHO'],
  ['Modelo','SKU','Cor','Tamanho','Peças','Material','Gramas/peça','Necessidade (g)','Versão da receita'],
  ...forecast.detail.map(x=>[x.productName,x.sku,x.color,x.size,x.qty,
   x.materialName,x.gramsPerUnit,x.requiredGrams,x.ruleId])
 ];
 download('HLGB-LAB-LISTA-MATERIAIS-FICTICIA.csv',
  '\uFEFF'+rows.map(row=>row.map(safeCell).join(';')).join('\r\n'),
  'text/csv;charset=utf-8');
 status('Lista de materiais fictícia exportada. Não foi criada compra nem reserva.');
}
function exportObserverCsv(){
 const report=doc&&observerResult(doc);
 if(!report){status('Observabilidade indisponível ou desativada; exporte o JSON básico.','error');return}
 const rows=[['Tipo','Módulo','Revisão/ID','Regra/Operação','Gravidade','Descrição'],
  ...report.findings.map(x=>['Alerta',x.module,x.recordId,x.code,x.severity,x.message+' · '+x.action]),
  ...report.history.map(x=>['Evento',x.module,x.revision,x.type,'',x.commandId+' · '+x.description]),
  ...(report.paymentReceiptHistory||[]).map(x=>['Comprovante fictício','hub',x.id,x.targetId,x.current?'Atual':'Anterior','Versão '+x.version+' · '+x.fileName+' · '+x.amountCents+' centavos']),
   ...report.settlementHistory.map(x=>['Histórico do acerto','acertos',x.settlementId,
   x.event,'',x.commandId+' · antes '+x.beforeCents+' depois '+x.afterCents+' · '+x.reason]),
  ...report.modelSummary.map(x=>['Resumo por modelo','produtos',x.productId,
   x.sku,'',x.name+' · pedidas '+x.ordered+' · cortadas '+x.cut+' · expedidas '+x.shipped]),
  ...report.factionSummary.map(x=>['Resumo por facção','faccoes',x.factionId,
   x.name,'',x.settlements+' acertos · pago '+x.paidSettlementsCents]),
  ...report.colorGradeSummary.flatMap(o=>o.byColor.map(c=>
   ['Grade do pedido','pedidos',o.orderId,c.color,
    o.ready?'Completa':'Incompleta',
    api.sizes.map(sz=>sz+': '+c.sizes[sz]).join(' · ')])),
  ...report.purchaseRequestHistory.map(r=>[
   'Requisição de compra','compras',r.id,r.materialName,r.status,
   r.qtyGrams+'g · '+r.estimatedCents+' centavos · compra '+(r.purchaseId||'—')+
    ' · solicitante '+r.requester+' · aprovador '+(r.approver||'—')]),
  ...report.bomCutHistory.map(c=>['Corte BOM','corte',c.id,c.orderId,
   c.color+' '+c.size,c.qty+' peças · '+c.totalGrams+'g · '+
    c.estimatedCostCents+' centavos · comando '+c.commandId]),
  ...report.bomCutHistory.flatMap(c=>c.materials.map(m=>[
   'Consumo e lixo BOM','estoque',c.id,m.materialId,m.ruleId,
   'Útil '+m.requiredGrams+'g · lixo '+m.scrapGrams+
    'g · baixa '+m.totalGrams+'g'])),
  ...report.gradeInventory.map(g=>['Saldo por cor e tamanho','faccoes',g.assignmentId,
   g.orderId,g.factionName,g.color+' '+g.size+' · enviado '+g.sent+
    ' · retornado '+g.returned+' · pendente '+g.open+
    ' · acertos '+g.settlementIds.join(' / ')]),
  ...report.factionDispatches.map(x=>['Envio para facção','faccoes',x.id,
   x.orderId,x.factionName,x.productName+' · enviadas '+x.qtySent+
    ' · retornadas '+x.qtyReturned+' · pendentes '+x.qtyOpen+
    ' · acertos '+x.settlementIds.join(' / ')]),
  ...report.factionTransferHistory.map(t=>
   ['Transferência parcial','faccoes',t.id,t.orderId,t.fromName+' → '+t.toName,
    t.qty+' peças · origem '+t.fromBefore+' → '+t.fromAfter+
    ' · destino '+t.toBefore+' → '+t.toAfter+' · '+t.reason+
    ' · comando '+t.commandId]),
  ...report.paymentBatchHistory.map(b=>['Fechamento em lote','hub',b.id,
   b.reference,b.status,b.reason+' · '+b.count+' títulos · '+b.totalCents+' centavos']),
  ...report.paymentBatchHistory.flatMap(b=>b.items.map(i=>
   ['Título vinculado ao lote','hub',i.financeId,b.id,i.sourceType,
    i.sourceId+' · '+i.amountCents+' centavos']))];
 download('HLGB-LAB-OBSERVABILIDADE-V2-FICTICIA.csv',
  '\uFEFF'+rows.map(row=>row.map(safeCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');
 status('Histórico fictício e alertas exportados sem alterações no documento.');
}
function renderMultiCutSheet(planId){
 const service=window.HLGBLabMultiCutSheetV1;
 if(!service)throw Error('A folha de corte A4 está indisponível. Confira o carregamento do módulo.');
 const preview=service.preview(doc,planId);
 if(!preview.sampleOnly||preview.stockWritten)throw Error('A folha deixou de ser isolada. Não imprimir.');
 $('cut-print').innerHTML=service.render(doc,planId);
 return $('cut-print').textContent;
}
function renderCutSheet(planId){
 const plan=(doc.cutPlans||[]).find(p=>p.id===planId);
 if(!plan)throw Error('Folha não localizada nesta revisão.');
 const order=doc.orders.find(o=>o.id===plan.orderId);
 const product=doc.products.find(p=>p.id===order?.productId);
 const material=doc.materials.find(m=>m.id===plan.materialId);
 const client=doc.clients.find(c=>c.id===order?.clientId);
 const grades=api.sizes.map(sz=>'<tr><td>'+escape(sz)+'</td><td>'+plan.grade[sz]+'</td></tr>').join('');
 const status=plan.status==='concluido'?'Concluído e auditado':
  plan.status==='cancelado'?'Cancelado — não utilizar':'Aberto — ainda sem baixa';
 const box=$('cut-print');
 box.innerHTML='<h1>HLGB Evolução · Folha de Corte FICTÍCIA</h1>'+
  '<p><strong>Folha:</strong> '+escape(plan.id)+' · <strong>Pedido:</strong> '+escape(plan.orderId)+
  ' · <strong>Competência de teste:</strong> '+escape(doc.period)+'</p>'+
  '<p><strong>Cliente:</strong> '+escape(client?.name||'')+' · <strong>Modelo:</strong> '+escape(product?.name||'')+
  ' · <strong>SKU:</strong> '+escape(product?.sku||'')+'</p>'+
  '<p><strong>Material:</strong> '+escape(material?.name||'')+
  ' · <strong>Execução:</strong> '+(plan.workMode==='interno'?'Interna':'Externa')+
  ' · <strong>Estado:</strong> '+status+'</p>'+
  '<h2>Grade deste lote</h2><table><thead><tr><th>Tamanho</th><th>Peças</th></tr></thead><tbody>'+grades+
  '<tr><th>Total de peças</th><th>'+sum(plan.grade)+'</th></tr></tbody></table>'+
  '<h2>Pesos conferidos</h2><table><tbody><tr><td>Peso útil teórico</td><td>'+plan.theoreticalGrams+' g</td></tr>'+
  '<tr><td>Peso útil confirmado</td><td>'+(plan.usefulGrams??'Não concluído')+' g</td></tr>'+
  '<tr><td>Desperdício / lixo</td><td>'+(plan.scrapGrams??'Não concluído')+' g</td></tr>'+
  '<tr><td>Peso total debitado do estoque</td><td>'+(
   plan.status==='concluido'?plan.usefulGrams+plan.scrapGrams+' g':'Ainda sem baixa')+
  '</td></tr></tbody></table>'+
  '<p><strong>Cortador 1:</strong> '+escape(plan.cutterOne)+'</p>'+
  '<p><strong>Cortador 2:</strong> '+escape(plan.cutterTwo)+'</p>'+
  '<p><strong>Enfestador:</strong> '+escape(plan.spreader)+'</p>'+
  '<div class="signature"><div>Conferência digitada 1: '+escape(plan.signatureOne||'Pendente')+
  '</div><div>Conferência digitada 2: '+escape(plan.signatureTwo||'Pendente')+'</div></div>'+
  '<p class="print-note">DOCUMENTO DEMONSTRATIVO — não é ordem de produção válida, assinatura eletrônica legal, ou comprovante de estoque. Não contém dados da empresa.</p>';
 return box.textContent;
}
function suggestServicePrice(form){
 const service=form.elements.namedItem('serviceType')?.value;
 const price=form.elements.namedItem('unitCents');
 if(!price)return;
 const productId=form.elements.namedItem('productId')?.value;
 const product=doc.products.find(p=>p.id===productId);
 if(service==='embalagem'){
  const n=(product?.name||'').toLocaleLowerCase('pt-BR');
  price.value=n.includes('calcinha')?'0,15':'0,25';
 }else{
  const fac=doc.factions.find(f=>f.id===form.elements.namedItem('factionId')?.value);
  price.value=nr(fac?.productRates?.[productId]??fac?.unitCents??0);
 }
}
function fillAssignmentRate(form){
 const row=doc?.factionAssignments?.find(x=>x.id===form.elements.namedItem('assignmentId')?.value);
 const order=row&&ref(doc.orders,row.orderId),fac=row&&ref(doc.factions,row.factionId),
  product=order&&ref(doc.products,order.productId);
 if(!row||!fac||!product)return;
 const rate=window.HLGBLabFactionRoutingV1.resolveRate(row,fac,product,doc);
 form.elements.namedItem('unitCents').value=nr(rate.gross);
 form.elements.namedItem('travetaCents').value=nr(rate.traveta);
 const preview=$('assignment-rate-preview');
 if(preview)preview.textContent=(row.qtySent-row.qtyReturned)+' peças pendentes · tarifa líquida atual '+fmt(rate.unit)+' por peça.';
}
function fillSettlementRevision(form){
 const x=doc?.settlements.find(a=>a.id===form.elements.namedItem('id')?.value);
 if(!x)return;
 form.elements.namedItem('factionId').value=x.factionId;
 form.elements.namedItem('unitCents').value=nr(x.listUnitCents??x.unitCents);
 form.elements.namedItem('travetaCents').value=nr(x.travetaCents||0);
 const only=x.kind!=='avulso'||!!x.orderId||!!x.assignmentId||!!x.gradeTracked;
 for(const option of form.elements.namedItem('factionId').options)
  option.disabled=only&&option.value!==x.factionId;
 previewSettlementRevision(form);
}
function previewSettlementRevision(form){
 const el=$('settlement-revise-preview'),x=doc?.settlements.find(a=>a.id===form.elements.namedItem('id')?.value);
 if(!el||!x)return;
 try{
  const gross=parseCents(form.elements.namedItem('unitCents').value),
   discount=parseCents(form.elements.namedItem('travetaCents').value),
   total=x.qty*(gross-discount)+(x.adjustmentCents||0);
  el.textContent=gross>discount&&total>0?
   x.qty+' peças · total atual '+fmt(x.amountCents)+' → novo total '+fmt(total)+' · mantém ajuste de '+fmt(x.adjustmentCents||0):
   'Informe valores válidos: o líquido e o total precisam ser positivos.';
 }catch(_){el.textContent='Informe preço e desconto válidos.'}
}
function applySettlementFilters(){
 if(active!=='acertos'||!doc||!$('settlement-filters'))return;
 const f=settlementFilters;
 const normal=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
 const text=normal(f.query.trim());
 $('settlement-search').value=f.query;
 for(const [id,key] of [['settlement-status','status'],['settlement-faction','faction'],
   ['settlement-service','service'],['settlement-compensation','compensation']]){
  const el=$(id);
  if(el&&[...el.options].some(o=>o.value===f[key]))el.value=f[key];
 }
 const matchesBase=x=>(f.status==='todos'||x.status===f.status)&&
  (f.faction==='todas'||x.factionId===f.faction)&&
  (f.service==='todos'||(x.serviceType||'costura')===f.service);
 const settlementText=x=>{
  const parts=[x.id,x.orderId,x.serviceType,x.status,x.reason,
   ref(doc.factions,x.factionId)?.name,ref(doc.products,x.productId)?.name,
   ref(doc.products,ref(doc.orders,x.orderId)?.productId)?.name,
   ...(x.history||[]).flatMap(h=>[h.reason,h.commandId]),
   ...(x.rateHistory||[]).flatMap(h=>[h.reason,h.commandId,h.fromFactionName,h.toFactionName,h.financeId]),
   ...(x.returns||[]).flatMap(h=>[h.reason,h.commandId]),
    ...window.HLGBLabPaymentBatchV1.receiptMetadata(doc).filter(r=>r.financeIds.includes(doc.finance.find(f=>f.sourceId===x.id&&f.kind==='pagar')?.id)).flatMap(r=>[r.id,r.fileName,r.targetId,r.reason])];
  return normal(parts.join(' '));
 };
 const compensationText=c=>normal([c.id,c.settlementId,c.reference,c.reason,c.kind,c.status,
  doc.finance.find(x=>x.sourceId===c.id)?.id,
  ref(doc.factions,c.factionId)?.name].join(' '));
 const comps=doc.settlementCompensations||[];
 const settlements=doc.settlements||[];
 const matchSettlement=x=>matchesBase(x)&&(!text||settlementText(x).includes(text)||
  comps.some(c=>c.settlementId===x.id&&compensationText(c).includes(text)));
 const visibleSet=settlements.map(matchSettlement);
 const visibleComp=comps.map(c=>{
  const original=settlements.find(x=>x.id===c.settlementId);
  return !!original&&matchesBase(original)&&
   (f.compensation==='todos'||c.status===f.compensation)&&
   (!text||compensationText(c).includes(text)||settlementText(original).includes(text));
 });
 for(const [id,flags] of [['settlement-table',visibleSet],['settlement-compensation-table',visibleComp]]){
  const rows=$(id)?.querySelectorAll('tbody tr')||[];
  rows.forEach((row,i)=>{row.hidden=!flags[i]});
 }
 const shown=settlements.filter((_,i)=>visibleSet[i]);
 const shownComp=comps.filter((_,i)=>visibleComp[i]);
 const settlementValue=shown.reduce((total,x)=>total+x.amountCents,0);
 const compValue=shownComp.reduce((total,x)=>total+x.deltaCents,0);
 $('settlement-query-summary').textContent=shown.length+' de '+settlements.length+
  ' acertos · total '+fmt(settlementValue)+' · '+shownComp.length+' de '+comps.length+
  ' compensações · diferença líquida '+(compValue>0?'+':compValue<0?'−':'')+fmt(Math.abs(compValue))+
  ' (valores fictícios; filtro local, sem alterar lançamentos)';
}
document.addEventListener('input',event=>{
 if(event.target.id==='global-search-query'){searchState.page=1;searchState.selected=null;renderGlobalSearch();renderGlobalDetail();return;}
 if(event.target.id==='settlement-search'){
  settlementFilters.query=event.target.value;applySettlementFilters();return;
 }
 const filter=event.target.closest('input[data-filter-for]');
 if(!filter)return;
 const target=$(filter.dataset.filterFor);
 if(!target)return;
 const term=filter.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
 for(const row of target.querySelectorAll('tbody tr')){
  const text=row.textContent.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  row.hidden=!text.includes(term);
 }
});
function renderCompensationSheet(compId){
 const comp=(doc.settlementCompensations||[]).find(x=>x.id===compId);
 if(!comp)throw Error('Compensação não encontrada no documento fictício.');
 const original=doc.settlements.find(x=>x.id===comp.settlementId);
 const originalTitle=doc.finance.find(x=>x.id===comp.originalFinanceId);
 const newTitle=doc.finance.find(x=>x.sourceId===comp.id);
 const faction=doc.factions.find(x=>x.id===comp.factionId);
 if(!original||!originalTitle||!newTitle)throw Error('Vínculos da compensação incompletos.');
 const html='<h1>HLGB Evolução · Conferência de Compensação FICTÍCIA</h1>'+
  '<p><strong>Competência de teste:</strong> '+escape(doc.period)+
  ' · <strong>Revisão local:</strong> '+doc.revision+'</p>'+
  '<p><strong>Facção:</strong> '+escape(faction?.name||'—')+
  ' · <strong>Acerto original:</strong> '+escape(original.id)+'</p>'+
  '<h2>Pagamento original preservado</h2>'+
  '<table><thead><tr><th>Acerto</th><th>Título original</th><th>Valor</th><th>Status</th></tr></thead>'+
  '<tbody><tr><td>'+escape(original.id)+'</td><td>'+escape(originalTitle.id)+'</td>'+
  '<td>'+fmt(original.amountCents)+'</td><td>'+escape(originalTitle.status)+'</td></tr></tbody></table>'+
  '<h2>Correção criada como novo lançamento</h2>'+
  '<table><tbody>'+
  '<tr><th>Compensação</th><td>'+escape(comp.id)+'</td></tr>'+
  '<tr><th>Referência única</th><td>'+escape(comp.reference)+'</td></tr>'+
  '<tr><th>Justificativa</th><td>'+escape(comp.reason)+'</td></tr>'+
  '<tr><th>Diferença</th><td>'+(comp.deltaCents>0?'+':'−')+fmt(Math.abs(comp.deltaCents))+'</td></tr>'+
  '<tr><th>Novo título</th><td>'+escape(newTitle.id)+' · '+escape(newTitle.kind)+
  ' · '+fmt(newTitle.amountCents)+'</td></tr>'+
  '<tr><th>Situação</th><td>'+escape(newTitle.status)+'</td></tr>'+
  '<tr><th>Comando registrado</th><td>'+escape(comp.commandId)+'</td></tr></tbody></table>'+
  '<p class="print-note">DOCUMENTO DE TESTE — dados inventados. Não é comprovante de pagamento bancário, assinatura legal, documento fiscal ou prova de conciliação com a empresa. A impressão ou PDF não envia arquivos ao servidor.</p>';
 $('cut-print').innerHTML=html;
 return $('cut-print').textContent;
}
document.addEventListener('change',event=>{
 if(event.target.closest('form[data-command="settlement.service.add"]')){refreshServicePreview();return;}
 const revisionForm=event.target.closest('form[data-command="finance.revise"]');if(revisionForm&&event.target.name==='id'){fillFinanceRevision(revisionForm);return;}
 if(event.target.matches('[data-assistant-filter]')){const k=event.target.dataset.assistantFilter;assistantFilters[k]=k==='stockLimitGrams'?Number(event.target.value):event.target.value;assistantRequested=false;return;}
 if(event.target.id==='audit-v3-filter'){auditFilter=event.target.value;draw();return;}
 if(event.target.matches('[data-mgmt-filter]')){managementFilters[event.target.dataset.mgmtFilter]=event.target.value;managementFilters.page=1;draw();return;}
 if(event.target.id==='pcp-date'){pcpDate=event.target.value;draw();return;}
 if(event.target.id==='pcp-filter'){pcpFilter=event.target.value;draw();return;}
 if(event.target.matches('[data-fin-filter]')){financeFilters[event.target.dataset.finFilter]=event.target.value;draw();return;}
 if(event.target.matches('#finance-batch-form [name="financeIds"]')){
  updateBatchPreview();return;
 }
 if(event.target.id==='journey-order'){
  journeyOrderId=event.target.value;draw();return;
 }
 if(event.target.matches('[data-settlement-filter]')){
  settlementFilters[event.target.dataset.settlementFilter]=event.target.value;
  applySettlementFilters();return;
 }
 const form=event.target.closest('form[data-command]');
 if(!form)return;
 const type=form.dataset.command;
 const selected=event.target.name;
 if(type==='settlement.add'&&['serviceType','productId','factionId'].includes(selected))suggestServicePrice(form);
 if(type==='finance.receipt.attach'&&selected==='targetId')updateReceiptTarget(form);
 if(type==='settlement.revise'&&selected==='id')fillSettlementRevision(form);
 if(type==='faction.assignment.rate.set'&&selected==='assignmentId')fillAssignmentRate(form);
 if(type==='settlement.revise'&&['unitCents','travetaCents','factionId'].includes(selected))previewSettlementRevision(form);
 if(type==='order.grade.update'&&selected==='orderId'){
  const order=doc.orders.find(o=>o.id===event.target.value);if(!order)return;
  for(const sz of api.sizes)form.elements.namedItem(sz).value=order.grade[sz];
 }
 if(type==='cut.plan.update'&&selected==='id'){
  const plan=(doc.cutPlans||[]).find(p=>p.id===event.target.value);if(!plan)return;
  for(const sz of api.sizes)form.elements.namedItem(sz).value=plan.grade[sz];
  for(const key of ['workMode','cutterOne','cutterTwo','spreader'])
   form.elements.namedItem(key).value=plan[key];
 }
 if(type==='cut.plan.complete'&&selected==='id'){
  const plan=(doc.cutPlans||[]).find(p=>p.id===event.target.value);if(!plan)return;
  form.elements.namedItem('usefulGrams').value=plan.theoreticalGrams;
  form.elements.namedItem('scrapGrams').value=0;
  form.elements.namedItem('signatureOne').value='';
  form.elements.namedItem('signatureTwo').value='';
 }
});
document.addEventListener('click',async e=>{
 if(e.target.closest('#whole-program-export')){exportReport();return;}
 const multiForm=e.target.closest('#multi-order-form');
 if(multiForm){
  const addItem=e.target.closest('[data-add-multi-model]');
  if(addItem){
   const list=document.getElementById('multi-model-list'),count=list.querySelectorAll('[data-multi-model]').length;
   if(count>=20){status('Limite de 20 modelos fictícios.','error');return;}
   list.insertAdjacentHTML('beforeend',multiModelCard(doc.products,multiSizes(multiForm),count));
   multiOrderPreview();return;
  }
  const removeItem=e.target.closest('[data-remove-multi-model]');
  if(removeItem){
   if(multiForm.querySelectorAll('[data-multi-model]').length<=1){status('Pedido precisa de um modelo.','error');return;}
   removeItem.closest('[data-multi-model]').remove();multiOrderPreview();return;
  }
  const addColor=e.target.closest('[data-add-multi-color]');
  if(addColor){
   const card=addColor.closest('[data-multi-model]'),body=card.querySelector('[data-multi-colors]');
   if(body.querySelectorAll('[data-multi-color-row]').length>=30){status('Limite de 30 cores por modelo.','error');return;}
   body.insertAdjacentHTML('beforeend',multiColorRow(multiSizes(multiForm),'',0));
   multiOrderPreview();return;
  }
  const removeColor=e.target.closest('[data-remove-multi-color]');
  if(removeColor){
   const body=removeColor.closest('[data-multi-colors]');
   if(body.querySelectorAll('[data-multi-color-row]').length<=1){status('Cada modelo precisa ter uma cor.','error');return;}
   removeColor.closest('[data-multi-color-row]').remove();multiOrderPreview();return;
  }
  const addSize=e.target.closest('[data-add-multi-size]');
  if(addSize){
   const input=document.getElementById('multi-new-size'),value=input.value.trim().replace(/\s+/g,' ');
   const sizes=multiSizes(multiForm);
   if(sizes.length>=16){status('Limite de 16 tamanhos neste pedido fictício.','error');return;}
   if(!value||value.length>12||!/^[\p{L}\p{N} .-]+$/u.test(value)||sizes.some(x=>x.toLocaleLowerCase('pt-BR')===value.toLocaleLowerCase('pt-BR'))){
    status('Tamanho repetido ou inválido; use letras/números e até 12 caracteres.','error');return;
   }
   multiAfterSizeAdded(multiForm,value);input.value='';multiOrderPreview();return;
  }
 }
 if(e.target.closest('[data-add-color-row]')){
  const holder=$('order-color-rows');
  if(holder?.querySelectorAll('[data-color-row]').length>=30){status('Limite de 30 cores por pedido fictício.','error');return;}
  holder?.insertAdjacentHTML('beforeend',colorMatrixRow());
  updateColorMatrixPreview();return;
 }
 const removeColor=e.target.closest('[data-remove-color-row]');
 if(removeColor){
  const holder=$('order-color-rows');
  if(holder?.querySelectorAll('[data-color-row]').length>1)removeColor.closest('[data-color-row]').remove();
  else status('O pedido precisa de ao menos uma cor.','error');
  updateColorMatrixPreview();return;
 }
 if(e.target.closest('#remote-pending-export')){
  if(!remoteLab)return;
  try{
   const pending=await remoteLab.load();
   if(!pending)throw Error('Não existe intenção pendente neste navegador.');
   download('HLGB-INTENCAO-WAL-PENDENTE-FICTICIA.json',JSON.stringify({
    schema:'hlgb-intencao-wal-pendente-ficticia-v1',environment:'postgres-local-fictitious',
    origin:'somente este navegador',pending,productionApproval:false,committed:false
   },null,2),'application/json');
   status('Cópia da intenção pendente exportada. Não foi reenviada nem descartada.');
  }catch(e){status('Não foi possível exportar a intenção pendente: '+e.message,'error');}
  return;
 }
 if(e.target.closest('#remote-history-export')){
  if(!remoteLab)return;
  try{
   const archived=await remoteLab.history();
   download('HLGB-CONFLITOS-REVISTOS-FICTICIOS.json',JSON.stringify({
    schema:'hlgb-historico-conflitos-wal-v1',environment:'postgres-local-fictitious',
    origin:'somente este navegador',reviewCount:archived.length,
    archived,productionApproval:false,serverStateUnaffected:true
   },null,2),'application/json');
   status('Histórico local de conflitos exportado: '+archived.length+' tentativa(s).');
  }catch(e){status('Não foi possível exportar histórico de conflitos: '+e.message,'error');}
  return;
 }
 if(e.target.closest('#remote-check')){await remoteAction(()=>remoteLab.reconcile());return;}
 if(e.target.closest('#remote-retry')){await remoteAction(()=>remoteLab.retry());return;}
 if(e.target.closest('#remote-discard')){if(confirm('Descartar somente a intenção local revisada, sem excluir registros do servidor?'))await remoteAction(()=>remoteLab.discard());return;}
 if(e.target.closest('#recovery-check')){if(remoteLab){await remoteAction(()=>remoteLab.reconcile());return;}if(busy)return;busy=true;try{recoveryIntents=await intentRead();const latest=await read();if(latest&&api.inspect(latest).ok)doc=latest;draw();status('Intenções locais relidas · '+recoveryIntents.length+' pendentes.');}catch(err){status(err.message,'error');}finally{busy=false;}return;}
 const intentReview=e.target.closest('[data-intent-review]');if(intentReview&&!remoteLab&&!busy){if(!confirm('Feche as outras abas antigas. Confirmar arquivamento apenas da intenção revisada, sem excluir nenhum registro de negócio e sem reenviar?'))return;busy=true;try{await archiveIntent(intentReview.dataset.intentReview,true);recoveryIntents=await intentRead();doc=await read();draw();status('Intenção arquivada com histórico. Nenhum lançamento reenviado.');}catch(err){status(err.message,'error');}finally{busy=false;}return;}
 if(e.target.closest('#recovery-export')){try{download('HLGB-RECUPERACAO-FICTICIO.json',JSON.stringify({plan:recoveryPlan,intents:recoveryIntents.map(x=>({...x,diagnosis:window.HLGBLabRecoveryV1.classify(doc,x,api.inspect)})),history:doc.repairHistory||[],intentHistory:remoteLab?[]:await intentHistory()},null,2),'application/json');}catch(err){status(err.message,'error');}return;}
 if(e.target.closest('#monitor-run')){await runMonitor('manual');return;}
 if(e.target.closest('#monitor-export')){download('HLGB-MONITOR-FICTICIO.json',JSON.stringify({schema:'hlgb-monitor-sessao-v1',runs:monitorRuns,productionApproval:false},null,2),'application/json');return;}
 if(e.target.closest('#assisted-preview')){assistedDraft=readAssistedDraft();try{assistedPreview={...window.HLGBLabOperationsV2.assistantPreview(doc,assistedDraft,window.HLGBLabPayrollOrdersV1),revision:doc.revision};draw();status('Prévia do pedido, nada gravado.');}catch(err){assistedPreview=null;status(err.message,'error');}return;}
 if(e.target.closest('#invoice-preview')){invoiceDraft=readInvoiceDraft();try{invoicePreview={...window.HLGBLabOperationsV2.invoicePreview(doc,{...invoiceDraft,declaredCents:parseCents(invoiceDraft.declaredCents)}),revision:doc.revision};draw();status('Nota conferida, nenhuma entrada registrada.');}catch(err){invoicePreview=null;status(err.message,'error');}return;}
 const invoicePdf=e.target.closest('[data-invoice-pdf]');if(invoicePdf){const x=(doc.invoicePdfs||[]).find(v=>v.id===invoicePdf.dataset.invoicePdf);if(x){try{const f=window.HLGBLabPaymentBatchV1.decodePdf(x.contentBase64);download(x.fileName,f.bytes,'application/pdf');}catch(err){status(err.message,'error');}}return;}
 if(e.target.closest('#payroll-show')){payrollMonth=$('payroll-month').value;try{window.HLGBLabPayrollOrdersV1.payrollReport(doc,payrollMonth);draw();}catch(err){payrollMonth='2026-11';status(err.message,'error');}return;}
 if(e.target.closest('#payroll-preview')){payrollDraft={period:$('payroll-new-period').value,dueDate:$('payroll-new-due').value,employeeId:$('payroll-new-person').value};try{payrollPreview={...window.HLGBLabPayrollOrdersV1.payrollPreview(doc,payrollDraft),revision:doc.revision};draw();status('Prévia da folha, nenhuma conta criada.');}catch(err){status(err.message,'error');}return;}
 if(e.target.closest('#order-import-preview')){importDraft=$('order-import-raw').value;try{importResult={...window.HLGBLabPayrollOrdersV1.importPreview(doc,importDraft),revision:doc.revision};draw();status('Prévia conferida, nenhum pedido criado.');}catch(err){importResult=null;status(err.message,'error');}return;}
 if(e.target.closest('#order-import-template')){download('HLGB-MODELO-PEDIDOS-FICTICIO.csv','referencia;cliente_id;sku;P;M;G;GG\nREF-001;CLI-0001;DEMO-MELINA;10;20;0;0','text/csv;charset=utf-8');return;}
 if(e.target.closest('#quote-compare')){quoteQuery={materialId:$('quote-material').value,qtyGrams:Number($('quote-qty').value),asOf:$('quote-date').value};draw();return;}
 if(e.target.closest('#faction-material-export')){const rows=[['Checklist','Envio','Material','Previsto (g)','Conferido (g)','Diferença (g)'],...(doc.factionMaterialChecklists||[]).flatMap(c=>c.materials.map(m=>{const x=(doc.factionMaterialChecks||[]).filter(y=>y.checklistId===c.id&&y.materialId===m.materialId).at(-1);return [c.id,c.assignmentId,m.name,m.grams,x?.actualGrams??'Não conferido',x?.differenceGrams??''];}))];download('HLGB-MATERIAIS-FACCOES-FICTICIO.csv','\uFEFF'+rows.map(r=>r.map(safeCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');return;}
 const lineRemove=e.target.closest('[data-group-remove]');
 if(e.target.closest('#group-line-add')||lineRemove){serviceGroupDraft=captureServiceGroup();if(lineRemove&&serviceGroupDraft.lines.length>2)serviceGroupDraft.lines.splice(Number(lineRemove.dataset.groupRemove),1);else if(!lineRemove&&serviceGroupDraft.lines.length<20)serviceGroupDraft.lines.push(emptyGroupLine());serviceGroupResult=null;draw();return;}
 if(e.target.closest('#group-service-preview')){serviceGroupDraft=captureServiceGroup();try{serviceGroupResult={...window.HLGBLabServicesV1.groupPreview(doc,serviceGroupInput(serviceGroupDraft)),revision:doc.revision};draw();status('Prévia do acerto conferida; nenhum lançamento gravado.');}catch(err){serviceGroupResult=null;status(err.message,'error');}return;}
 if(e.target.closest('#grouped-export')){try{download('HLGB-ACERTOS-CONSOLIDADOS-FICTICIOS.json',JSON.stringify(window.HLGBLabPaymentBatchV1.groupedAccounts(doc),null,2),'application/json');}catch(err){status(err.message,'error');}return;}
 if(e.target.closest('#cost-export')){try{download('HLGB-CUSTOS-FICTICIO.json',JSON.stringify(costsResult(doc),null,2),'application/json');}catch(err){status(err.message,'error');}return;}
 if(e.target.closest('#assistant-query')){assistantRequested=true;draw();return;}
 if(e.target.closest('#assistant-export')){if(!assistantRequested){status('Faça uma nova consulta antes de exportar.','error');return;}try{download('HLGB-ASSISTENTE-V3-FICTICIO.json',JSON.stringify(assistantAsk(doc),null,2),'application/json');}catch(err){status(err.message,'error');}return;}
 if(e.target.closest('#bot-v3-export')){const r=botV3(doc);if(!r){status('Aprendizado indisponível.','error');return;}download('HLGB-BOT-V3-FICTICIO.json',JSON.stringify(r,null,2),'application/json');return;}
 if(e.target.closest('#audit-v3-run')){draw();status('Diagnóstico local reexecutado. Confira as regras e evidências.');return;}
 if(e.target.closest('#audit-v3-export')){const r=auditorV3(doc);if(!r){status('Diagnóstico indisponível.','error');return;}download('HLGB-AUDITOR-V3-FICTICIO.json',JSON.stringify(r,null,2),'application/json');return;}
 if(e.target.closest('#mgmt-export')){exportManagement(false);return;}
 if(e.target.closest('#mgmt-json')){exportManagement(true);return;}
 const mgmtPage=e.target.closest('[data-mgmt-page]');if(mgmtPage){managementFilters.page=Math.max(1,managementFilters.page+Number(mgmtPage.dataset.mgmtPage));draw();return;}
 if(e.target.closest('#pcp-export')){try{const r=window.HLGBLabPCPV1.report(doc,{asOf:pcpDate});const rows=[['Pedido','Modelo','Cliente','Prioridade','Prazo','Previsão','A expedir','Situação'],...r.rows.filter(x=>pcpFilter==='todos'||x.status===pcpFilter).map(x=>[x.id,x.model,x.client,x.priority,x.due||'',x.estimated||'',x.remaining,x.status])];download('HLGB-PCP-FICTICIO.csv','\uFEFF'+rows.map(x=>x.map(safeCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');}catch(err){status(err.message,'error')}return;}
 if(e.target.closest('#finance-report-export')){try{const r=window.HLGBLabFinanceV1.report(doc,financeFilters);const rows=[['Título','Descrição','Categoria','Tipo','Valor centavos','Data','Estado','Conferência'],...r.rows.map(x=>[x.id,x.description,x.category,x.kind,x.amountCents,x.date||'Sem data',x.status,x.reconciliation])];download('HLGB-HUB-FICTICIO.csv','\uFEFF'+rows.map(x=>x.map(safeCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');}catch(err){status(err.message,'error')}return;}
 const searchOpen=e.target.closest('[data-search-open]');if(searchOpen){openGlobalResult(Number(searchOpen.dataset.searchOpen));return}
 const searchPage=e.target.closest('[data-search-page]');if(searchPage){searchState.page+=Number(searchPage.dataset.searchPage);renderGlobalSearch();return}
 if(e.target.closest('#global-search-close')){searchState.selected=null;renderGlobalDetail();$('module-content').querySelectorAll('.search-hit').forEach(x=>x.classList.remove('search-hit'));return}

 const receiptButton=e.target.closest('[data-receipt-download]');
 if(receiptButton){
  try{
   const r=(doc?.paymentReceipts||[]).find(x=>x.id===receiptButton.dataset.receiptDownload);
   if(!r)throw Error('Comprovante não encontrado na cópia local.');
   const service=window.HLGBLabPaymentBatchV1,file=service.decodePdf(r.contentBase64);
   if(file.size!==r.size||file.checksum!==r.checksum)throw Error('Arquivo divergente; não baixar.');
   download(r.id+'-FICTICIO-'+r.fileName,file.bytes,'application/pdf');
   status('Download local solicitado · '+r.id+' · versão '+r.version+'.');
  }catch(error){status(error.message,'error')}
  return;
 }
 if(e.target.closest('#preview-bom-cut')){
  const form=document.querySelector('form[data-command="cut.bom.execute"]');
  try{
   if(!form)throw Error('Formulário de Corte BOM indisponível.');
   const payload=parseData('cut.bom.execute',form);
   const pre=window.HLGBLabBomCutV1?.preview(doc,payload,window.HLGBLabMaterialsPlannerV1);
   if(!pre)throw Error('Simulador BOM indisponível.');
   status((pre.canExecute?'Prévia validada: ':'Falta estoque: ')+
    pre.qty+' peça(s) '+pre.color+' '+pre.size+' · '+
    pre.materials.map(x=>x.materialName+' '+x.totalGrams+
     'g (após '+x.afterGrams+'g)').join(' · ')+
    '. Nenhuma baixa executada.',pre.canExecute?'success':'error');
  }catch(error){status(error.message,'error')}
  return;
 }
 if(e.target.closest('#export-shopping-csv')){exportShoppingCsv();return}
 if(e.target.closest('#preview-finance-batch')){
  const form=$('finance-batch-form');
  try{
   const payload=parseData('finance.batch.pay',form),fn=window.HLGBLabPaymentBatchV1?.preview;
   if(typeof fn!=='function')throw Error('Validador de lote indisponível.');
   const result=fn(doc,payload);
   status('Prévia validada: '+result.count+' título(s), '+fmt(result.totalCents)+
    ', referência '+result.reference+'. Nenhuma baixa executada.');
  }catch(error){status(error.message,'error')}
  return;
 }
 if(e.target.closest('[data-preview-faction]')){
  const form=e.target.closest('form[data-command="finance.faction.close"]');
  try{
   if(!form)throw Error('Formulário de fechamento da facção indisponível.');
   const input=parseData('finance.faction.close',form);
   const result=window.HLGBLabPaymentBatchV1.previewFaction(doc,input);
   status('Prévia de '+result.factionName+': '+result.count+' título(s), '+fmt(result.totalCents)+
    '. Referência '+result.reference+'. Nenhum pagamento lançado.');
  }catch(error){status(error.message,'error')}
  return;
 }
 if(e.target.closest('#export-observer-csv')){exportObserverCsv();return}
 if(e.target.closest('[data-toggle-observer]')){
  const registry=window.HLGBLabModules;
  const observer=registry?.list().find(x=>x.id==='observabilidade');
  if(observer){registry.setEnabled('observabilidade',!observer.enabled);draw();
   status('Módulo Observabilidade 2.0 '+(!observer.enabled?'ativado':'desativado')+
    ' somente nesta aba. Funções anteriores continuam disponíveis.');}
  else status('Módulo opcional indisponível. Sistema legado preservado.','error');
  return;
 }
 if(e.target.closest('#settlement-clear-filters')){
  Object.assign(settlementFilters,{query:'',status:'todos',faction:'todas',service:'todos',compensation:'todos'});
  applySettlementFilters();return;
 }
 const labelAdd=e.target.closest('#label-add'),labelRemove=e.target.closest('[data-label-remove]');
 if(labelAdd||labelRemove){
  try{labelDraft=labelCapture();labelLayout=$('label-layout').value;
   if(labelRemove){if(labelDraft.length===1)throw Error('Mantenha ao menos um modelo na impressão.');labelDraft.splice(Number(labelRemove.dataset.labelRemove),1);}
   else if(labelDraft.length<100)labelDraft.push({name:'',model:'',size:'',pieceQty:0,volumes:0,copies:1,date:new Date().toISOString().slice(0,10)});
   draw();
  }catch(error){status(error.message,'error')}return;
 }
 if(e.target.closest('#historical-template')){
  download('HLGB-MODELO-HISTORICO-FICTICIO.csv',
   'cliente;modelo;quantidade;data;referencia;status\nCLI-0001;PRO-0001;120;2026-11-15;EXEMPLO-001;A conferir',
   'text/csv;charset=utf-8');return;
 }
 if(e.target.closest('#historical-preview')){
  try{historicalDraft=$('historical-raw').value;
   const report=window.HLGBLabHistoryReviewV1.preview(doc,historicalDraft);
   historicalResult={revision:doc.revision,raw:historicalDraft,report};
   draw();status('Prévia: '+report.ready+' conciliáveis e '+report.blocked+' bloqueadas. Nada foi importado.');
  }catch(error){historicalResult=null;status(error.message,'error');}return;
 }
 if(e.target.closest('#historical-export')){
  try{
   if(!historicalResult||historicalResult.revision!==doc.revision||
      historicalResult.raw!==$('historical-raw').value)throw Error('Conferência desatualizada. Refazer prévia.');
   download('HLGB-REGULARIZACAO-HISTORICA-FICTICIA.json',JSON.stringify(historicalResult.report,null,2),'application/json');
  }catch(error){status(error.message,'error');}return;
 }
 const previewTemplate=e.target.closest('[data-template-preview]');if(previewTemplate){templatePreviewId=previewTemplate.dataset.templatePreview;draw();return;}
 const previewPacker=e.target.closest('[data-packer-preview]');if(previewPacker){packerPreviewId=previewPacker.dataset.packerPreview;draw();return;}
 const editTemplate=e.target.closest('[data-template-edit]');
 if(editTemplate){templateEditId=editTemplate.dataset.templateEdit;draw();return;}
 if(e.target.closest('#template-new')){templateEditId=null;draw();return;}
 const editPacker=e.target.closest('[data-packer-edit]');
 if(editPacker){packerEditId=editPacker.dataset.packerEdit;draw();return;}
 if(e.target.closest('#packer-new')){packerEditId=null;draw();return;}
 if(e.target.closest('#label-preview')||e.target.closest('#label-print')){
  try{const batch=labelBatch();labelLayout=batch.layout;labelDraft=batch.definitions;
   const summary=batch.total+' etiqueta(s) · '+batch.modelCount+' modelo(s) · '+batch.pages.length+
    ' folha(s) A4 · '+batch.per+' por folha · '+batch.emptyCells+' espaço(s) vazio(s) na última folha.';
   if(e.target.closest('#label-preview'))$('label-batch-preview').textContent=summary;
   else{$('cut-print').innerHTML=window.HLGBLabLabelsV1.render(batch);window.print();status('Lote fictício preparado: '+summary);}
  }catch(error){status(error.message,'error')}return;
 }
 if(e.target.closest('#route-stop-add')){const host=$('route-stop-forms');if(host&&host.children.length<30)host.insertAdjacentHTML('beforeend',routeStopFormHtml(doc));return;}
 const rmStop=e.target.closest('[data-route-stop-remove]');if(rmStop){const host=$('route-stop-forms');if(host&&host.children.length>1)rmStop.closest('[data-route-stop]').remove();else status('Uma rota precisa manter ao menos uma parada.','error');return;}
 const editRoute=e.target.closest('[data-route-edit]');if(editRoute){const r=(doc.routePlans||[]).find(x=>x.id===editRoute.dataset.routeEdit);if(r&&r.status!=='cancelada'){routeDraft=r;active='utilidades';draw();}return;}
 if(e.target.closest('#route-new')){routeDraft=null;draw();return;}
 const routePrint=e.target.closest('[data-print-route]');if(routePrint){try{renderRouteSheet(routePrint.dataset.printRoute);window.print()}catch(error){status(error.message,'error')}return;}
 const comp=e.target.closest('button[data-print-comp]');
 if(comp){try{renderCompensationSheet(comp.dataset.printComp);window.print()}catch(error){status(error.message,'error')}return}
 const printMulti=e.target.closest('button[data-print-multi]');
 if(printMulti){try{renderMultiCutSheet(printMulti.dataset.printMulti);window.print()}catch(error){status(error.message,'error')}return}
 const print=e.target.closest('button[data-print-plan]');
 if(print){try{renderCutSheet(print.dataset.printPlan);window.print()}catch(error){status(error.message,'error')}return}
 const mod=e.target.closest('button[data-module]');
 if(mod){searchState.selected=null;active=mod.dataset.module;window.location.hash=active;draw();window.scrollTo(0,0);return}
 const goto=e.target.closest('button[data-goto]');
 if(goto){
  searchState.selected=null;active=goto.dataset.goto;window.location.hash=active;draw();
  const focus=goto.dataset.mfFocus;
  if(focus){
   const target=[...document.querySelectorAll('#module-content [data-mf-record]')]
    .find(el=>el.dataset.mfRecord===focus);
   if(target){
    if(target.tagName==='DETAILS')target.open=true;
    target.dataset.mfFocused='true';
    target.style.outline='2px solid var(--accent, currentColor)';
    target.style.outlineOffset='3px';
    target.scrollIntoView({block:'center'});
   }else{window.scrollTo(0,0);status('Módulo aberto. O registro mudou de estado; consulte a grade atual antes de agir.');}
  }else window.scrollTo(0,0);
 }
});
document.addEventListener('input',e=>{if(e.target.id==='historical-raw'){historicalDraft=e.target.value;historicalResult=null;}if(e.target.closest('#order-color-matrix-form'))updateColorMatrixPreview();if(e.target.closest('#multi-order-form'))multiOrderPreview();});
document.addEventListener('change',e=>{
 if(e.target.closest('#order-color-matrix-form'))updateColorMatrixPreview();
 if(e.target.closest('#multi-order-form'))multiOrderPreview();
 const editing=e.target.closest('form[data-command="order.color.grade.set"]');
 if(editing&&active==='pedidos'&&['orderId','color'].includes(e.target.name))fillOrderColorEdit();
});
document.addEventListener('submit',async e=>{
 if(e.target.id==='whole-program-review-form'){
  e.preventDefault();
  const form=e.target,area=form.elements.namedItem('area')?.value,
   outcome=form.elements.namedItem('outcome')?.value,
   note=String(form.elements.namedItem('note')?.value||'').trim();
  if(!ids.has(area)||!['sem_erro_no_ensaio','precisa_ajuste'].includes(outcome)||
   !note||note.length>600){status('Avaliação inválida. Escolha a área, o resultado e escreva o teste realizado.','error');return;}
  programReviews[area]={outcome,note,checkedAt:new Date().toISOString(),revision:doc?.revision||0};
  let stored=false;
  try{stored=await reviewStore(area,programReviews[area]);}catch(_e){stored=false;}
  draw();
  status(stored?'Avaliação guardada apenas neste navegador. Exporte o relatório para enviar.':
   'Avaliação na memória desta sessão; armazenamento bloqueado. Exporte o JSON antes de sair.',stored?'success':'error');
  return;
 }
 const form=e.target.closest('form[data-command]');if(!form)return;
 e.preventDefault();submit(form,form.dataset.command);
});
window.addEventListener('hashchange',()=>{
 const next=window.location.hash.slice(1);
 if(ids.has(next)&&doc&&next!==active){searchState.selected=null;active=next;draw()}
});
$('mobile-module').addEventListener('change',()=>{const key=$('mobile-module').value;if(ids.has(key)){searchState.selected=null;active=key;window.location.hash=key;draw();window.scrollTo(0,0);}});
$('global-search-module').addEventListener('change',()=>{searchState.page=1;searchState.selected=null;renderGlobalSearch();renderGlobalDetail()});
$('export-json').addEventListener('click',exportReport);
$('export-csv').addEventListener('click',exportCsv);
$('refresh').addEventListener('click',reload);
$('reset').addEventListener('click',reset);
(async()=>{
 try{
  if(remoteLab){doc=await remoteLab.init();$('reset').disabled=true;draw();startMonitor();startSharedNotice();status('Laboratório compartilhado iniciado · banco fictício.','success');return;}
  db=await openDB();
  await transact(()=>null);
  doc=await read();
  if(!doc)throw Error('Não foi possível iniciar a base fictícia.');
  if(!api.inspect(doc).ok)throw Error('Documento inicial inconsistente.');
  recoveryIntents=await intentRead();
  try{await reviewLoad();}catch(_e){/* Uma avaliação ilegível não bloqueia o programa fictício. */}
  draw();startMonitor();status('Prévia iniciada. Faça suas operações com dados fictícios e confira as revisões.','success');
 }catch(err){
  status('Não foi possível abrir o armazenamento de teste neste navegador: '+err.message+
   '. Experimente pelo Chrome ou por uma URL HTTPS. Nenhum dado real foi acessado.','error');
 }
})();
})();
