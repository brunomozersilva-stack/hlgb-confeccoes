'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const core=require('../operacao-integrada-core.js');
const batch=require('../modulos/pagamento-lote-v1.js');
const observer=require('../modulos/observabilidade-v2.js');
let number=1;
function command(state,type,payload={},id){
 const result=core.apply(state,{type,payload,actor:'Controle LAB',
  commandId:id||'LOTE-TESTE-'+String(number++).padStart(4,'0'),
  expectedRevision:state.revision});
 return result;
}
function seed(){
 let s=core.initial();
 for(const qty of [8,6]){
  s=command(s,'order.add',{clientId:'CLI-0001',productId:'PRO-0001',
   grade:{P:qty,M:0,G:0,GG:0}}).state;
  const id=s.orders[s.orders.length-1].id;
  s=command(s,'cut.record',{orderId:id,size:'P',qty}).state;
  s=command(s,'faction.allocate',{orderId:id,factionId:'FAC-0001',qty}).state;
  s=command(s,'faction.return',{orderId:id,qty}).state;
 }
 const ids=s.finance.filter(x=>x.sourceId.startsWith('ACE-')).map(x=>x.id);
 return {s,ids};
}
test('quitação em lote: 2 acertos, total exato, uma transação, uma revisão e log único',()=>{
 const {s,ids}=seed(),snapshot=JSON.stringify(s),rev=s.revision;
 const input={financeIds:ids,reference:'LOTE-SEM-RISCO-001',
  reason:'Pagamento coletivo fictício'};
 const check=batch.preview(s,input);
 assert.equal(check.count,2);
 assert.equal(check.totalCents,14*550);
 assert.equal(check.realPayment,false);
 assert.equal(JSON.stringify(s),snapshot,'prévia não altera documento');
 const {state,result}=command(s,'finance.batch.pay',input,'LOTE-ACERTO-01');
 assert.match(result,/PAG-0001/);
 assert.equal(state.revision,rev+1,'uma revisão por lote');
 assert.equal(state.log.length,s.log.length+1,'um evento por lote');
 assert.equal(state.paymentBatches.length,1);
 assert.equal(state.paymentBatches[0].count,2);
 assert.equal(state.paymentBatches[0].totalCents,7700);
 assert.deepEqual(state.paymentBatches[0].items.map(x=>x.financeId),ids);
 assert.ok(state.settlements.every(x=>x.status==='pago'));
 assert.ok(ids.every(id=>state.finance.find(x=>x.id===id).status==='pago'));
 assert.equal(core.inspect(state).ok,true);
 assert.equal(core.totals(state).paymentBatches,1);
 assert.equal(core.totals(state).batchedPayablesCents,7700);
 const audit=observer.analyze(state);
 assert.equal(audit.summary.paymentBatches,1);
 assert.equal(audit.summary.batchedPayablesCents,7700);
 assert.equal(audit.paymentBatchHistory.length,1);
 assert.equal(audit.paymentBatchHistory[0].items.length,2);
 assert.equal(audit.history[0].type,'finance.batch.pay');
 assert.equal(audit.findings.length,0);
 assert.equal(JSON.stringify(s),snapshot,'snapshot antigo preservado integralmente');
});
test('fechamento inválido é 100% atômico, sem status pago e sem alteração de revisão',()=>{
 const {s,ids}=seed();
 const scenarios=[
  [{financeIds:[ids[0],ids[0]],reference:'REF-1',reason:'Duas vezes'},/repetidos/],
  [{financeIds:ids.concat('FIN-9999'),reference:'REF-2',reason:'Título inexistente'},/não localizado/],
  [{financeIds:[ids[0]],reference:'REF-3',reason:'Só um'},/2 e 50/],
  [{financeIds:ids,reference:'',reason:'Faltou referência'},/Referência/],
  [{financeIds:ids,reference:'REF-4',reason:' '},/Motivo obrigatório/],
  [{financeIds:ids.concat(s.finance.find(x=>x.kind==='receber').id),
    reference:'REF-5',reason:'Mistura receber'},/não está aberto e a pagar/]
 ];
 const old=JSON.stringify(s);
 for(const [payload,re] of scenarios){
  assert.throws(()=>command(s,'finance.batch.pay',payload),re);
  assert.equal(JSON.stringify(s),old);
 }
 const bad=JSON.parse(old);
 bad.finance.find(x=>x.id===ids[1]).amountCents+=1;
 const corrupted=JSON.stringify(bad);
 assert.throws(()=>command(bad,'finance.batch.pay',{financeIds:ids,
  reference:'REF-DIVERGE',reason:'Valor divergente'}),/diverge do título/);
 assert.equal(JSON.stringify(bad),corrupted,'nem documento já divergente é alterado');
});
test('a mesma referência, mesmo com minúsculas, não gera outra baixa',()=>{
 let {s,ids}=seed();
 const result=command(s,'finance.batch.pay',{financeIds:ids,
  reference:'Baixa-A-001',reason:'Um lote autorizado'});
 s=result.state;
 assert.equal(s.paymentBatches[0].reference,'BAIXA-A-001');
 const more=command(s,'settlement.add',{serviceType:'embalagem',factionId:'FAC-0002',
  productId:'PRO-0002',qty:100,unitCents:25,travetaCents:0,
  reason:'Embalagem lote dois'});
 s=more.state;
 const extra=command(s,'settlement.add',{serviceType:'embalagem',factionId:'FAC-0001',
  productId:'PRO-0003',qty:20,unitCents:35,travetaCents:0,
  reason:'Embalagem lote três'});
 s=extra.state;
 const open=s.finance.filter(x=>x.status==='aberto'&&x.kind==='pagar').map(x=>x.id);
 assert.equal(open.length,2);
 const snap=JSON.stringify(s);
 assert.throws(()=>command(s,'finance.batch.pay',{financeIds:open,
  reference:' baixa-a-001 ',reason:'Outro fechamento'}),/já utilizada/);
 assert.equal(JSON.stringify(s),snap);
 const closed=command(s,'finance.batch.pay',{financeIds:open,
  reference:'BAIXA-B-001',reason:'Segundo lote'}).state;
 assert.equal(closed.paymentBatches.length,2);
 assert.equal(core.inspect(closed).ok,true);
});
test('quitar compensação não modifica acerto pago original nem título antigo',()=>{
 let {s,ids}=seed();
 s=command(s,'finance.pay',{id:ids[0]}).state;
 const originalSettlement=JSON.stringify(s.settlements[0]);
 const originalPaidTitle=JSON.stringify(s.finance.find(x=>x.id===ids[0]));
 s=command(s,'settlement.compensate',{id:'ACE-0001',deltaCents:150,
  reference:'COMPENSACAO-LOTE',reason:'Ajuste posterior fictício'}).state;
 const compTitle=s.finance.find(x=>x.sourceId==='CMP-0001');
 const unclosedSettlement=s.finance.find(x=>x.id===ids[1]);
 const done=command(s,'finance.batch.pay',{
  financeIds:[compTitle.id,unclosedSettlement.id],reference:'LOTE-COMP',
  reason:'Acerto e diferença em lote'}).state;
 assert.equal(done.settlementCompensations[0].status,'pago');
 assert.equal(done.paymentBatches[0].items[0].sourceType,'compensacao');
 assert.equal(done.paymentBatches[0].totalCents,150+6*550);
 assert.equal(JSON.stringify(done.settlements[0]),originalSettlement);
 assert.equal(JSON.stringify(done.finance.find(x=>x.id===ids[0])),originalPaidTitle);
 assert.equal(core.inspect(done).ok,true);
});
test('mesmo comando, revisão antiga e título já pago impedem baixa duplicada',()=>{
 let {s,ids}=seed();
 const first=command(s,'finance.batch.pay',{financeIds:ids,
  reference:'BAIXA-IMUTAVEL',reason:'Pagamento comprovado no laboratório'},'LOTE-UNICO');
 s=first.state;
 const snapshot=JSON.stringify(s);
 assert.throws(()=>core.apply(s,{type:'finance.batch.pay',payload:{financeIds:ids,
  reference:'OUTRA',reason:'Repetir'},actor:'CI',commandId:'LOTE-UNICO',
  expectedRevision:s.revision}),/já registrado/);
 assert.throws(()=>core.apply(s,{type:'finance.batch.pay',payload:{financeIds:ids,
  reference:'OUTRA',reason:'Repetir'},actor:'CI',commandId:'LOTE-OUTRO',
  expectedRevision:s.revision-1}),/CONFLITO/);
 assert.throws(()=>command(s,'finance.batch.pay',{financeIds:ids,
  reference:'OUTRA',reason:'Repetir'}),/não está aberto/);
 assert.equal(JSON.stringify(s),snapshot);
});
test('o Auditor reconhece lote adulterado e nenhum lote pode esconder duplicação de baixa',()=>{
 const {s,ids}=seed();
 const done=command(s,'finance.batch.pay',{financeIds:ids,
  reference:'BAIXA-REGULAR',reason:'Conciliar fechamento do laboratório'}).state;
 const tampered=structuredClone(done),baseline=JSON.stringify(tampered);
 tampered.paymentBatches[0].items[0].amountCents-=1;
 assert.equal(core.inspect(tampered).ok,false);
 assert.match(core.inspect(tampered).problems.join(' '),/lote|pagamento/i);
 assert.ok(observer.analyze(tampered).findings.some(x=>x.code==='LOTE_VINCULO'));
 assert.equal(JSON.stringify(done),baseline,'auditoria não altera original');
 const duplicate=structuredClone(done);
 duplicate.paymentBatches.push({...duplicate.paymentBatches[0],id:'PAG-9999',reference:'NOVO-LOTE'});
 assert.equal(core.inspect(duplicate).ok,false);
 assert.match(core.inspect(duplicate).problems.join(' '),/duplicado|lote/);
 assert.ok(observer.analyze(duplicate).findings.some(x=>x.code==='LOTE_VINCULO'));
});
test('retrocompatibilidade: documentos sem paymentBatches mantêm pagamentos unitários',()=>{
 let s=core.initial();delete s.paymentBatches;
 const r=command(s,'finance.add',{kind:'pagar',description:'Título anterior',
  amountCents:1590});
 s=r.state;
 assert.equal(Array.isArray(s.paymentBatches),true);
 assert.equal(s.paymentBatches.length,0);
 const bill=s.finance.find(x=>x.description==='Título anterior');
 s=command(s,'finance.pay',{id:bill.id}).state;
 assert.equal(bill.status,'aberto','snapshot antigo não se altera');
 assert.equal(s.finance.find(x=>x.id===bill.id).status,'pago');
 assert.equal(core.inspect(s).ok,true);
});
test('módulo financeiro separado do UI sem rede, delete ou integração produtiva',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../modulos/pagamento-lote-v1.js'),'utf8');
 for(const re of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,
  /\blocalStorage\b/,/\bindexedDB\b/,/\bsupabase\b/i,/https?:\/\//,
  /\bdelete\b.*\bfrom\b/i])assert.equal(re.test(src),false,String(re));
 assert.equal(batch.version,'1.1.0');
});
