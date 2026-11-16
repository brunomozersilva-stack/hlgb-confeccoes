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
   purchases=arr(source,'purchaseOrders'),materials=arr(source,'materials'),
   settlements=arr(source,'settlements'),comps=arr(source,'settlementCompensations'),
   finance=arr(source,'finance'),ledger=arr(source,'stockLedger'),
   errors=arr(source,'errors'),events=arr(source,'log');
  const findings=[];
  const push=(code,severity,module,record,message,action,evidence)=>findings.push({
   code,severity,module,recordId:String(record??''),message,action,
   evidence:String(evidence??'')
  });
  const one=(items,sourceId,kind)=>items.filter(x=>x.sourceId===sourceId&&
   (!kind||x.kind===kind));
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
   const movements=ledger.filter(x=>x.sourceId===p.id&&x.type==='compra');
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
   const movements=ledger.filter(x=>x.cutPlanId===plan.id);
   if(movements.length!==1||movements[0]?.deltaGrams!==-(plan.usefulGrams+plan.scrapGrams))
    push('CORTE_ESTOQUE','alta','corte',plan.id,
     'Folha concluída não corresponde a uma única baixa de material.',
     'Conferir pesos útil/lixo e a movimentação; não repetir baixa.',plan.id);
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
  const recommendations=[];
  for(const f of findings){
   if(recommendations.some(x=>x.code===f.code&&x.module===f.module))continue;
   recommendations.push({code:f.code,priority:f.severity,module:f.module,
    action:f.action,why:f.message,
    evidence:findings.filter(x=>x.code===f.code).length+' ocorrência(s) · '+f.recordId,
    mode:'orientacao_sem_execucao'});
  }
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
  const bySeverity={critica:0,alta:0,media:0,informativa:0};
  for(const f of findings)bySeverity[f.severity]++;
  const summary={
   findings:findings.length,bySeverity,events:events.length,openIncidents:openErrors.length,
   orders:orders.length,settlements:settlements.length,compensations:comps.length,
   titles:finance.length,openTitles:unpaid,stockMovements:ledger.length,
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
   summary,findings,recommendations,history,moduleActivity,repeatedOperations};
 }
 return Object.freeze({id:'observabilidade',version:'2.0.0',analyze});
});
