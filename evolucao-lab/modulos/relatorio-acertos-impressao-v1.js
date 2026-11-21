/* HLGB Evolucao - relatorios imprimiveis de acertos, somente apresentacao.
 * Renderiza HTML seguro para area de impressao existente do laboratorio.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabSettlementPrintV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const money=x=>Number.isSafeInteger(x)?
  (x<0?'-':'')+'R$ '+(Math.abs(x)/100).toFixed(2).replace('.',','):'—';
 const table=(heads,rows)=>'<table><thead><tr>'+heads.map(h=>'<th>'+esc(h)+'</th>').join('')+
  '</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+
  '</tr>').join('')+'</tbody></table>';
 function render(report,{detail='resumo'}={}){
  if(!report||!Array.isArray(report.entries)||!Array.isArray(report.groups)||
     !['resumo','detalhado','separado'].includes(detail))throw Error('Relatorio invalido.');
  const f=report.filters||{},t=report.totals;
  if(!t||!Number.isSafeInteger(t.totalCents))throw Error('Totais invalidos.');
  const header='<h1>HLGB EVOLUCAO · HISTORICO DE ACERTOS</h1>'+
   '<p>Relatorio demonstrativo · '+esc(detail)+' · Agrupamento: '+esc(f.groupBy||'faccao')+
   ' · Cliente: '+esc(f.clientId||'todos')+' · Faccao: '+esc(f.factionId||'todas')+
   ' · Situacao: '+esc(f.status||'todos')+'</p>'+
   '<p>Periodo: '+esc(f.from||'sem inicio')+' a '+esc(f.to||'sem fim')+
   ' · Base da data: '+esc(f.dateField||'nenhuma')+
   ' · Sem data excluidos: '+esc(report.excludedUndated||0)+'</p>'+
   '<h2>Totais</h2>'+table(['Acertos','Pecas','Total','Pago','Em aberto','Compensacoes liquidas'],
    [[t.count,t.pieces,money(t.totalCents),money(t.paidCents),money(t.openCents),
      money(t.compensationNetCents)]]);
  const groups=table(['Cliente ou faccao','Acertos','Pecas','Total','Pago','Em aberto','Compensacoes'],
   report.groups.map(g=>[g.name,g.count,g.pieces,money(g.totalCents),money(g.paidCents),
     money(g.openCents),money(g.compensationNetCents)]));
  const entries=table(['Acerto / Pedido','Cliente','Faccao','Modelo / Servico','Pecas','Total','Situacao','Pagamento'],
   report.entries.map(x=>[x.id+' / '+(x.orderId||'Avulso'),x.clientName,x.factionName,
    x.model+' / '+x.service,x.qty,money(x.amountCents),x.status,x.paidDate||'Sem data']));
  const details=detail!=='detalhado'?'':report.entries.map(x=>
   '<section style="break-inside:avoid-page"><h2>Acerto '+esc(x.id)+' · '+esc(x.factionName)+'</h2>'+
   '<p>Cliente: '+esc(x.clientName)+' · Pedido: '+esc(x.orderId||'Avulso')+
   ' · Modelo: '+esc(x.model)+' · Pecas: '+esc(x.qty)+
   ' · Total: '+esc(money(x.amountCents))+' · Situacao: '+esc(x.status)+'</p>'+
   '<p>Titulo: '+esc(x.financeId)+' · Pago em: '+esc(x.paidDate||'Nao informado')+
   ' · Fechamento: '+esc(x.batchId||'Sem lote')+
   ' · Referencia: '+esc(x.batchReference||'—')+'</p>'+
   '<h3>Alteracoes e devolucoes</h3>'+
   table(['Comando','Motivo','Valor antes','Valor depois'],x.history.map(h=>[
    h.commandId||'—',h.reason||'—',
    Number.isSafeInteger(h.beforeCents)?money(h.beforeCents):
     Number.isSafeInteger(h.before?.amountCents)?money(h.before.amountCents):'—',
    Number.isSafeInteger(h.afterCents)?money(h.afterCents):
     Number.isSafeInteger(h.after?.amountCents)?money(h.after.amountCents):'—'
   ]))+'<h3>Compensacoes separadas</h3>'+
   table(['ID','Diferenca','Situacao','Referencia','Motivo'],x.compensations.map(c=>[
    c.id,money(c.deltaCents),c.status,c.reference||'—',c.reason||'—'
   ]))+
   '<h3>Linha do tempo de auditoria</h3>'+
   table(['Revisão','Evento','Operador','Data registrada','Comando'],(x.timeline||[]).map(e=>[
    e.revision??'—',e.type,e.actor||'Não informado',e.recordedAt||'Não informada',e.commandId
   ]))+
   ((x.missingEventReferences||[]).length?
    '<p>Eventos locais sem correspondência na trilha global: '+
    esc(x.missingEventReferences.join(', '))+'</p>':'')+
   '</section>').join('');
  return header+'<h2>Resumo por pessoa</h2>'+groups+
   (detail==='resumo'?'':'<h2>Acertos individuais</h2>'+entries)+details+
   '<p class="print-note">DOCUMENTO FICTICIO DE TESTE. Nao substitui comprovante de pagamento, nota fiscal ou conciliacao bancaria. Compensacoes nao foram somadas de novo aos acertos originais.</p>';
 }
 return Object.freeze({version:'1.0.0-lab',render});
});
