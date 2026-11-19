'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const core=require('../operacao-integrada-core.js'),flow=require('../modulos/fluxo-multimodelo-v1.js');
const root=path.resolve(__dirname,'..');
const lines=(...items)=>items.map(([color,size,qty])=>({color,size,qty}));
function fixture(){
 let s=core.initial(),n=0;
 const run=(type,payload,commandId)=>{
  const result=core.apply(s,{type,payload,commandId:commandId||'MULTI-FLOW-'+(++n),expectedRevision:s.revision,actor:'QA fictício'});
  s=result.state;assert.equal(core.inspect(s).ok,true,type+' deve manter integridade');
  return result.result;
 };
 const order=run('order.multi.create',{clientId:'CLI-0001',sizes:['P','M','G2'],items:[
  {productId:'PRO-0001',colors:[{color:'Rubi',grade:{P:60,M:60,G2:0}}]},
  {productId:'PRO-0002',colors:[{color:'Branco',grade:{P:0,M:0,G2:10}}]}]});
 const plan=run('multi.cut.plan',{orderId:order,itemId:'ITM-001',lines:lines(['Rubi','P',40],['Rubi','M',40]),
  scheduledDate:'2026-11-22',priority:'normal',cutterOne:'A',cutterTwo:'B',spreader:'C'});
 return {run,order,plan,get s(){return s}};
}
function finishAndAllocate(c){
 c.run('multi.cut.complete',{id:c.plan,checkerOne:'C1',checkerTwo:'C2'});
 return c.run('multi.flow.allocate',{cutId:c.plan,factionId:'FAC-0001',unitCents:550,
  lines:lines(['Rubi','P',40],['Rubi','M',40]),reason:'Envio fictício a primeira facção'}).split(' · ')[0];
}
test('Pedido de dois modelos: 120 → cortar 80 → separar 50 preserva saldos por cor e tamanho',()=>{
 const c=fixture(),lot=finishAndAllocate(c);
 c.run('multi.flow.return',{id:lot,lines:lines(['Rubi','P',30]),reason:'Primeiro retorno parcial'});
 c.run('multi.flow.transfer',{id:lot,factionId:'FAC-0002',unitCents:600,
  reason:'Trocar somente 50 peças ainda pendentes'});
 c.run('multi.flow.return',{id:lot,lines:lines(['Rubi','M',20]),reason:'Segundo retorno parcial'});
 c.run('multi.flow.separate',{orderId:c.order,itemId:'ITM-001',
  lines:lines(['Rubi','P',30],['Rubi','M',20]),reason:'Separar 50 em duas variações'});
 const r=flow.orderBalance(c.s,c.order,'ITM-001');
 assert.equal(r.reduce((n,x)=>n+x.ordered,0),120);
 assert.equal(r.reduce((n,x)=>n+x.cut,0),80);
 assert.equal(r.reduce((n,x)=>n+x.toCut,0),40);
 assert.equal(r.reduce((n,x)=>n+x.separated,0),50);
 assert.equal(r.reduce((n,x)=>n+x.cutToSeparate,0),30);
 assert.equal(r.reduce((n,x)=>n+x.inFaction,0),30);
 assert.equal(r.find(x=>x.size==='P').cutToSeparate,10);
 assert.equal(r.find(x=>x.size==='M').cutToSeparate,20);
 const unrelated=flow.orderBalance(c.s,c.order,'ITM-002');
 assert.equal(unrelated.reduce((n,x)=>n+x.ordered,0),10);
 assert.equal(unrelated.reduce((n,x)=>n+x.cut+x.separated,0),0);
 assert.equal(c.s.finance.length,0);assert.equal(c.s.stockLedger.length,0);
 assert.equal(c.s.settlements.length,0);
 c.run('multi.flow.ship',{orderId:c.order,itemId:'ITM-001',
  lines:lines(['Rubi','P',20]),reason:'Expedição fictícia parcial'});
 assert.equal(flow.orderBalance(c.s,c.order,'ITM-001').reduce((n,x)=>n+x.shipped,0),20);
});
test('Trocar facção depois de retorno conserva valor histórico e agrupa sem pagar',()=>{
 const c=fixture(),lot=finishAndAllocate(c);
 c.run('multi.flow.return',{id:lot,lines:lines(['Rubi','P',30]),reason:'30 da facção origem'});
 c.run('multi.flow.transfer',{id:lot,factionId:'FAC-0002',unitCents:600,reason:'50 pendentes transferidas'});
 c.run('multi.flow.return',{id:lot,lines:lines(['Rubi','M',20]),reason:'20 na nova facção'});
 const groups=flow.acertos(c.s);
 assert.equal(groups.length,2);
 const a=groups.find(x=>x.factionId==='FAC-0001'),b=groups.find(x=>x.factionId==='FAC-0002');
 assert.equal(a.totalCents,16500);assert.equal(b.totalCents,12000);
 assert.equal(a.items[0].unitCents,550);assert.equal(b.items[0].unitCents,600);
 assert.equal(a.items[0].id,'MFR-0001');assert.equal(b.items[0].id,'MFR-0002');
 assert.equal(a.items[0].review,null);
 c.run('multi.flow.review',{id:'MFR-0001',reviewer:'Fiscal QA',reason:'Conferência documental'});
 assert.equal(flow.acertos(c.s).find(x=>x.factionId==='FAC-0001').reviewedCents,16500);
 assert.equal(flow.acertos(c.s).find(x=>x.factionId==='FAC-0002').pendingCents,12000);
 assert.equal(c.s.finance.length,0,'Conferência não gera título nem pagamento');
 assert.equal(c.s.paymentBatches.length,0);
});
test('Corte em aberto e saldo repetido não geram facção nem movimentos',()=>{
 const c=fixture(),origin=JSON.stringify(c.s);
 assert.throws(()=>core.apply(c.s,{type:'multi.flow.allocate',payload:{
  cutId:c.plan,factionId:'FAC-0001',unitCents:500,reason:'Sem concluir',
  lines:lines(['Rubi','P',1])},commandId:'INVALID-OPEN',expectedRevision:c.s.revision,actor:'QA'}),/CONCLUÍDO/);
 assert.equal(JSON.stringify(c.s),origin);
 const lot=finishAndAllocate(c),state=JSON.stringify(c.s);
 for(const payload of [
  {cutId:c.plan,factionId:'FAC-0001',unitCents:500,reason:'Duplicação',lines:lines(['Rubi','P',1])},
  {cutId:c.plan,factionId:'FAC-0002',unitCents:500,reason:'Excesso',lines:lines(['Rubi','M',999])}
 ]){
  assert.throws(()=>core.apply(c.s,{type:'multi.flow.allocate',payload,
   commandId:'OVER-'+payload.reason,expectedRevision:c.s.revision,actor:'QA'}),/saldo/i);
  assert.equal(JSON.stringify(c.s),state);
 }
 assert.equal(lot,'MFL-0001');
});
test('Rejeita retorno, separação e despacho acima do permitido sem mutação',()=>{
 const c=fixture(),lot=finishAndAllocate(c),snapshot=JSON.stringify(c.s);
 for(const [type,payload] of [
  ['multi.flow.return',{id:lot,lines:lines(['Rubi','M',41]),reason:'Acima do lote'}],
  ['multi.flow.separate',{orderId:c.order,itemId:'ITM-001',lines:lines(['Rubi','P',1]),reason:'Sem retorno'}],
  ['multi.flow.ship',{orderId:c.order,itemId:'ITM-001',lines:lines(['Rubi','P',1]),reason:'Sem separação'}]
 ]){
  assert.throws(()=>core.apply(c.s,{type,payload,commandId:'BLOCK-'+type,
    expectedRevision:c.s.revision,actor:'QA'}),/saldo/i);
  assert.equal(JSON.stringify(c.s),snapshot);
 }
 c.run('multi.flow.return',{id:lot,lines:lines(['Rubi','P',30]),reason:'Retorno fictício'});
 c.run('multi.flow.separate',{orderId:c.order,itemId:'ITM-001',
  lines:lines(['Rubi','P',20]),reason:'Parcial'});
 assert.throws(()=>core.apply(c.s,{type:'multi.flow.ship',
  payload:{orderId:c.order,itemId:'ITM-001',lines:lines(['Rubi','P',21]),reason:'Excedente'},
  commandId:'EXCESS-SHIP',expectedRevision:c.s.revision,actor:'QA'}),/saldo/i);
});
test('Auditoria preserva valores após round-trip JSONB e rejeita alteração real de quantidade',()=>{
 const c=fixture(),lot=finishAndAllocate(c);
 c.run('multi.flow.return',{id:lot,lines:lines(['Rubi','P',30]),reason:'Retorno parcial'});
 c.run('multi.flow.transfer',{id:lot,factionId:'FAC-0002',unitCents:600,reason:'Transferência pendente'});
 c.run('multi.flow.return',{id:lot,lines:lines(['Rubi','M',20]),reason:'Segundo retorno'});
 c.run('multi.flow.review',{id:'MFR-0001',reviewer:'Conferente QA',reason:'Valor conferido'});
 const canonical=x=>Array.isArray(x)?x.map(canonical):
  x&&typeof x==='object'?Object.fromEntries(Object.entries(x)
   .sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):x;
 const roundTrip=canonical(JSON.parse(JSON.stringify(c.s)));
 assert.equal(core.inspect(roundTrip).ok,true,
  'JSONB pode reordenar chaves sem alterar os dados; auditor não pode rejeitar');
 const altered=structuredClone(roundTrip);
 altered.multiFlowLots[0].returns[0].amountCents+=100;
 assert.equal(core.inspect(altered).ok,false,
  'Apenas mudanças de conteúdo ou origem real devem bloquear');
 assert.equal(roundTrip.finance.length,0);
 assert.equal(roundTrip.stockLedger.length,0);
});
test('Auditor detecta adulteração de retorno, facção e grade preservando núcleo antigo',()=>{
 const c=fixture(),lot=finishAndAllocate(c);
 c.run('multi.flow.return',{id:lot,lines:lines(['Rubi','P',30]),reason:'Retorno inicial'});
 for(const mutate of [
  s=>{s.multiFlowLots[0].lines[0].qty+=1},
  s=>{s.multiFlowLots[0].returns[0].factionId='FAC-0002'},
  s=>{s.multiFlowLots[0].returns[0].amountCents=1},
  s=>{s.multiFlowLots[0].factionId='FAC-0002'},
  s=>{s.multiFlowLots[0].returns[0].commandId='INEXISTENTE'}
 ]){
  const bad=JSON.parse(JSON.stringify(c.s));mutate(bad);
  assert.equal(core.inspect(bad).ok,false,'Auditor precisa detectar origem adulterada');
 }
 assert.equal(c.s.orders.length,0);
 assert.equal(c.s.cutPlans.length,0);
 assert.equal(c.s.finance.length,0);
});
test('Auditor de fluxo detecta exclusão de registros mantendo o log e não aceita acerto fantasma',()=>{
 const c=fixture(),lot=finishAndAllocate(c);
 c.run('multi.flow.return',{id:lot,lines:lines(['Rubi','P',30]),reason:'Retorno para conferência'});
 c.run('multi.flow.review',{id:'MFR-0001',reviewer:'Fiscal QA',reason:'Valor revisado'});
 const check=mutate=>{
  const copy=JSON.parse(JSON.stringify(c.s));mutate(copy);
  const audit=core.inspect(copy);
  assert.equal(audit.ok,false,JSON.stringify(audit.problems));
  assert.match(audit.problems.join(' '),/evento multimodelo sem registro|sem prova|saldo impossível/i);
 };
 check(s=>{s.multiFlowLots[0].returns=[]});
 check(s=>{s.multiFlowLots=[]});
 check(s=>{s.multiFlowLots[0].returns[0].review=null});
 assert.equal(core.inspect(c.s).ok,true);
 assert.equal(c.s.finance.length,0);
});
test('Auditoria detecta adulteração de motivo em transferência, preço e conferência',()=>{
 const c=fixture(),lot=finishAndAllocate(c);
 c.run('multi.flow.return',{id:lot,lines:lines(['Rubi','P',20]),reason:'20 peças originais'});
 c.run('multi.flow.transfer',{id:lot,factionId:'FAC-0002',unitCents:600,
  reason:'Transferência com justificativa'});
 c.run('multi.flow.rate',{id:lot,unitCents:625,reason:'Renegociação documentada'});
 c.run('multi.flow.return',{id:lot,lines:lines(['Rubi','M',10]),reason:'Retorno final parcial'});
 c.run('multi.flow.review',{id:'MFR-0001',reviewer:'Fiscal QA',reason:'Acerto conferido'});
 for(const mutate of [
  s=>{s.multiFlowLots[0].changes[0].reason='Motivo diferente'},
  s=>{s.multiFlowLots[0].changes[1].toUnitCents=999},
  s=>{s.multiFlowLots[0].returns[0].review.reason='Conferência forjada'},
  s=>{s.multiFlowLots[0].returns[0].review.reviewer='Pessoa alterada'}
 ]){
  const copy=JSON.parse(JSON.stringify(c.s));mutate(copy);
  assert.equal(core.inspect(copy).ok,false);
 }
 assert.equal(core.inspect(c.s).ok,true);
 assert.equal(flow.acertos(c.s).find(x=>x.factionId==='FAC-0001').totalCents,11000);
 assert.equal(flow.acertos(c.s).find(x=>x.factionId==='FAC-0002').totalCents,6250);
});
test('Fila de trabalho apresenta apenas etapas possíveis por variação e abre o módulo correto',()=>{
 const c=fixture(),view=require('../modulos/fluxo-multimodelo-ui-v1.js');
 let pending=view.queue(c.s,flow);
 assert.equal(pending.filter(x=>x.stage==='Corte pendente').reduce((n,x)=>n+x.qty,0),130);
 assert.equal(pending.filter(x=>x.to==='faccoes').length,0,'Sem corte concluído não libera facção');
 finishAndAllocate(c);
 pending=view.queue(c.s,flow);
 assert.equal(pending.filter(x=>x.stage==='Corte pendente').reduce((n,x)=>n+x.qty,0),50);
 assert.equal(pending.filter(x=>x.stage==='Corte concluído para enviar à facção').length,0,
  'Lote já alocado não pode ser enviado de novo');
 c.run('multi.flow.return',{id:'MFL-0001',lines:lines(['Rubi','P',30]),reason:'Retorno para separação'});
 pending=view.queue(c.s,flow);
 assert.equal(pending.filter(x=>x.stage==='Retorno disponível para separar').reduce((n,x)=>n+x.qty,0),30);
 assert.equal(pending.filter(x=>x.stage==='Acerto fictício a conferir').length,1);
 const html=view.queuePanel(c.s,flow);
 assert.match(html,/data-goto="separacao"/);
 assert.match(html,/data-goto="acertos"/);
 assert.match(html,/data-mf-focus="MFR-0001"/);
 assert.match(view.acertoPanel(c.s,flow),/data-mf-record="MFR-0001"/);
 assert.match(html,/MFR-0001/);
 assert.doesNotMatch(html,/Aberto no servidor|Aprovado para produção/);
});
test('Interface multimodelo independente mantém formulários antigos e não usa rede',()=>{
 const ui=fs.readFileSync(path.join(root,'operacao-integrada-ui.js'),'utf8'),
  html=fs.readFileSync(path.join(root,'operacao-integrada.html'),'utf8'),
  lib=fs.readFileSync(path.join(root,'modulos/fluxo-multimodelo-v1.js'),'utf8'),
  view=fs.readFileSync(path.join(root,'modulos/fluxo-multimodelo-ui-v1.js'),'utf8');
 for(const js of [ui,lib,view])assert.doesNotThrow(()=>new vm.Script(js));
 for(const path of ['fluxo-multimodelo-v1.js','fluxo-multimodelo-ui-v1.js'])assert.ok(html.includes(path));
 assert.match(ui,/multiFlowLabPart\(s,'balance'\)/);
 assert.match(ui,/multiFlowLabPart\(s,'faction'\)/);
 assert.match(ui,/multiFlowLabPart\(s,'separacao'\)/);
 assert.match(ui,/multiFlowLabPart\(s,'acerto'\)/);
 assert.match(ui,/multiFlowLabPart\(s,'fila'\)/);
 assert.match(ui,/target\.dataset\.mfFocused='true'/);
 assert.match(ui,/order\.separate/);
 assert.match(ui,/faction\.return/);
 assert.match(ui,/multi\.flow\.allocate/);
 for(const bad of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/])
  assert.equal(bad.test(lib+view),false,'Sem acesso a rede');
});
