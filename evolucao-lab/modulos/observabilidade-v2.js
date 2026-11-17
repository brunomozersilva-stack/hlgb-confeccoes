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
   purchases=arr(source,'purchaseOrders'),materials=arr(source,'materials'),
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
  const all=[...orders,...cutPlans,...purchases,...settlements,...comps,
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
  const sourceIds=new Set([...orders,...purchases,...settlements,...comps].map(x=>x.id));
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
   factionDispatches:assignments.length,distributedOrders,openFactionPieces,
   ordersWithColorGrade:colorOrders.length,
   gradeItems:gradeInventory.length,
   gradePiecesOpen:gradeInventory.reduce((n,x)=>n+Number(x.open||0),0),
   partialFactionTransfers:partialTransfers.length,
   piecesTransferred:partialTransfers.reduce((n,m)=>n+Number(m.qty||0),0),
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
   colorGradeSummary,gradeInventory,bomCutHistory,
   paymentBatchHistory:batches.map(b=>({id:b.id,reference:b.reference,
    reason:b.reason,count:b.count,totalCents:b.totalCents,status:b.status,
    items:(b.items||[]).map(i=>({...i}))}))};
 }
 return Object.freeze({id:'observabilidade',version:'2.0.0',analyze});
});
