'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const core=require('../operacao-integrada-core.js'),batch=require('../modulos/pagamento-lote-v1.js'),
 obs=require('../modulos/observabilidade-v2.js');
let serial=0;
const exec=(s,type,payload={})=>core.apply(s,{type,payload,
 actor:'CI fictício de fechamento',expectedRevision:s.revision,
 commandId:'FAC-TEST-'+String(++serial).padStart(5,'0')}).state;
function add(s,factionId,qty,serviceType='costura'){
 return exec(s,'settlement.add',{serviceType,factionId,productId:'PRO-0001',
  qty,unitCents:100,travetaCents:0,reason:'Trabalho fictício para conferência'});
}
const input=(g,reference='FECHA-FAC-001')=>({factionId:g.factionId,
 financeIds:[...g.financeIds],reference,reason:'Consolidação fictícia após conferência'});
function seed(){let s=core.initial();s=add(s,'FAC-0001',8);s=add(s,'FAC-0001',6);return s}
test('agrupamento automático por facção tem total, composição e só uma referência',()=>{
 const s=seed(),prev=JSON.stringify(s),g=batch.groups(s);
 assert.equal(g.length,1);assert.equal(g[0].count,2);
 assert.equal(g[0].totalCents,1400);assert.equal(g[0].factionId,'FAC-0001');
 const p=input(g[0]);assert.equal(batch.previewFaction(s,p).realPayment,false);
 assert.equal(JSON.stringify(s),prev,'prévia readonly');
 const closed=exec(s,'finance.faction.close',p);
 const b=closed.paymentBatches[0];
 assert.equal(b.id,'PAG-0001');assert.equal(b.scope,'faccao');
 assert.equal(b.factionId,'FAC-0001');assert.equal(b.totalCents,1400);
 assert.equal(b.count,2);assert.equal(closed.revision,s.revision+1);
 assert.equal(closed.log.at(-1).type,'finance.faction.close');
 assert.deepEqual(closed.settlements.map(x=>x.status),['pago','pago']);
 assert.deepEqual(closed.finance.filter(x=>x.kind==='pagar').map(x=>x.status),['pago','pago']);
 assert.equal(closed.settlements[0].qty,s.settlements[0].qty);
 assert.equal(closed.settlements[1].amountCents,s.settlements[1].amountCents);
 assert.equal(core.inspect(closed).ok,true);
 assert.deepEqual(obs.analyze(closed).findings,[]);
 assert.equal(JSON.stringify(s),prev,'origem pré-fechamento não alterada');
});
test('nunca mistura facções e não quita pessoa errada',()=>{
 let s=seed();s=add(s,'FAC-0002',3);s=add(s,'FAC-0002',9);
 const g=batch.groups(s);assert.equal(g.length,2);
 const first=g.find(x=>x.factionId==='FAC-0001'),other=g.find(x=>x.factionId==='FAC-0002');
 assert.equal(first.totalCents,1400);assert.equal(other.totalCents,1200);
 const closed=exec(s,'finance.faction.close',input(first));
 assert.equal(closed.paymentBatches[0].items.every(x=>x.factionId==='FAC-0001'),true);
 assert.equal(closed.settlements.filter(x=>x.factionId==='FAC-0002').every(x=>x.status==='aberto'),true);
 assert.equal(batch.groups(closed)[0].factionId,'FAC-0002');
});
test('lista incompleta ou com título de outra pessoa sempre bloqueia',()=>{
 let s=seed();s=add(s,'FAC-0002',2);const g=batch.groups(s)[0];
 const stale=JSON.stringify(s);
 for(const p of [
  {...input(g),financeIds:[g.financeIds[0]]},
  {...input(g),financeIds:[g.financeIds[0],g.financeIds[0]]},
  {...input(g),financeIds:g.financeIds.concat(s.finance.at(-1).id)},
  {...input(g),financeIds:g.financeIds.concat('FIN-99999')}
 ]){
  assert.throws(()=>exec(s,'finance.faction.close',p),/lista da facção|incompleta/);
  assert.equal(JSON.stringify(s),stale);
 }
});
test('novo acerto após abrir a prévia exige atualizar antes do fechamento',()=>{
 const original=seed(),selected=input(batch.groups(original)[0]);
 const changed=add(original,'FAC-0001',5);
 const snapshot=JSON.stringify(changed);
 assert.throws(()=>exec(changed,'finance.faction.close',selected),/incompleta/);
 assert.equal(JSON.stringify(changed),snapshot);
 const final=exec(changed,'finance.faction.close',input(batch.groups(changed)[0]));
 assert.equal(final.paymentBatches[0].count,3);
});
test('baixa repetida e referência já utilizada são recusadas sem mexer em nada',()=>{
 const s=seed(),done=exec(s,'finance.faction.close',input(batch.groups(s)[0]));
 const snap=JSON.stringify(done);
 assert.throws(()=>exec(done,'finance.faction.close',input(batch.groups(s)[0])),/2 e 50/);
 assert.equal(JSON.stringify(done),snap);
 let second=add(done,'FAC-0001',2);second=add(second,'FAC-0001',3);
 assert.throws(()=>exec(second,'finance.faction.close',input(batch.groups(second)[0])),/já utilizada/);
 assert.equal(core.inspect(second).ok,true);
});
test('um acerto individual continua disponível na baixa tradicional',()=>{
 let s=core.initial();s=add(s,'FAC-0001',6);
 assert.equal(batch.groups(s).length,0);
 const title=s.finance.find(x=>x.kind==='pagar');
 s=exec(s,'finance.pay',{id:title.id});
 assert.equal(s.settlements[0].status,'pago');
 assert.equal(s.paymentBatches.length,0);
});
test('lote manual antigo continua disponível e com múltiplos prestadores',()=>{
 let s=seed();s=add(s,'FAC-0002',2);
 const ids=s.finance.filter(x=>x.kind==='pagar').map(x=>x.id);
 s=exec(s,'finance.batch.pay',{financeIds:[ids[0],ids[2]],
  reference:'MANUAL-LOTE',reason:'Conferido um a um'});
 assert.equal(s.paymentBatches[0].scope,undefined);
 assert.equal(s.settlements[1].status,'aberto');
 assert.equal(core.inspect(s).ok,true);
});
test('título divergente de um acerto bloqueia o grupo inteiro',()=>{
 const s=seed(),bad=structuredClone(s);
 bad.finance.find(x=>x.sourceId===bad.settlements[1].id).amountCents+=10;
 const info=batch.groups(bad);
 assert.equal(info[0].ready,false);
 assert.match(info[0].error,/divergentes/);
 const original=JSON.stringify(bad);
 assert.throws(()=>exec(bad,'finance.faction.close',input(batch.groups(s)[0])),/divergentes/);
 assert.equal(JSON.stringify(bad),original);
});
test('auditor detecta mistura de prestadores em lote falsificado',()=>{
 const s=seed(),closed=exec(s,'finance.faction.close',input(batch.groups(s)[0]));
 const t=structuredClone(closed);t.paymentBatches[0].items[1].factionId='FAC-0002';
 assert.equal(core.inspect(t).ok,false);
 assert.ok(obs.analyze(t).findings.some(f=>f.code==='LOTE_VINCULO'));
});
test('revisão antiga bloqueia reenvio mesmo com um comando novo',()=>{
 const s=seed(),selected=input(batch.groups(s)[0]);
 assert.throws(()=>core.apply(s,{type:'finance.faction.close',payload:selected,
  actor:'CI',commandId:'OLD-REV',expectedRevision:s.revision-1}),/CONFLITO/);
 assert.equal(s.paymentBatches.length,0);
});
test('compensação positiva entra no mesmo fechamento sem alterar acerto original pago',()=>{
 let s=seed(),first=s.finance.find(x=>x.sourceId==='ACE-0001');
 s=exec(s,'finance.pay',{id:first.id});
 const original=JSON.stringify(s.settlements.find(x=>x.id==='ACE-0001')),
  originalBill=JSON.stringify(s.finance.find(x=>x.id===first.id));
 s=exec(s,'settlement.compensate',{id:'ACE-0001',deltaCents:150,
  reference:'COMP-ADICIONAL',reason:'Diferença de serviço fictício'});
 const g=batch.groups(s)[0];
 assert.equal(g.count,2);
 assert.equal(g.totalCents,750,'6 peças R$ 6,00 + diferença R$ 1,50');
 const closed=exec(s,'finance.faction.close',input(g,'FECHA-COMP-001'));
 assert.equal(closed.paymentBatches[0].items.some(i=>i.sourceType==='compensacao'),true);
 assert.equal(closed.settlementCompensations[0].status,'pago');
 assert.equal(closed.settlements[1].status,'pago');
 assert.equal(JSON.stringify(closed.settlements.find(x=>x.id==='ACE-0001')),original);
 assert.equal(JSON.stringify(closed.finance.find(x=>x.id===first.id)),originalBill);
 assert.equal(core.inspect(closed).ok,true);
 assert.deepEqual(obs.analyze(closed).findings,[]);
});
test('módulo isolado sem rede e sem tocar arquivos atuais',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../modulos/pagamento-lote-v1.js'),'utf8'),
 ui=fs.readFileSync(path.join(__dirname,'../operacao-integrada-ui.js'),'utf8'),
 coreJs=fs.readFileSync(path.join(__dirname,'../operacao-integrada-core.js'),'utf8');
 assert.match(js,/executeFaction/);assert.match(ui,/finance\.faction\.close/);
 assert.match(coreJs,/finance\.faction\.close/);
 for(const bad of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,
  /\blocalStorage\b/,/\bindexedDB\b/,/supabase/i,/https?:\/\//])
  assert.equal(bad.test(js),false);
});
