'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../operacao-integrada-core.js'),mod=require('../modulos/pagamento-lote-v1.js'),
 observer=require('../modulos/observabilidade-v2.js');
let i=0;
const op=(s,type,payload={})=>core.apply(s,{type,payload,actor:'Teste fictício',
 expectedRevision:s.revision,commandId:'CPV-T-'+(++i)}).state;
const add=s=>op(s,'settlement.add',{serviceType:'embalagem',factionId:'FAC-0001',
 productId:'PRO-0001',qty:10,unitCents:25,travetaCents:0,reason:'Exercício'});
const paid=()=>op(add(core.initial()),'finance.pay',{id:'FIN-0001'});
const pdf=n=>Buffer.from('%PDF-1.4\n% EXERCICIO SEM DADOS REAIS '+n+'\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n','ascii').toString('base64');
const attach=(s,p={})=>op(s,'finance.receipt.attach',{targetId:'FIN-0001',fileName:'teste.pdf',
 contentBase64:pdf(1),reason:'Conferência fictícia',fictitious:true,previousId:null,...p});
test('anexo em título quitado mantém valores e quitação originais',()=>{
 const s=paid(),before=JSON.stringify(s),x=attach(s);
 assert.deepEqual(x.finance,s.finance);assert.deepEqual(x.settlements,s.settlements);
 assert.equal(x.paymentReceipts.length,1);assert.equal(x.paymentReceipts[0].id,'CPV-0001');
 assert.equal(x.paymentReceipts[0].amountCents,250);assert.equal(x.paymentReceipts[0].version,1);
 assert.equal(x.paymentReceipts[0].previousId,null);assert.equal(core.inspect(x).ok,true);
 assert.deepEqual(observer.analyze(x).findings,[]);assert.equal(JSON.stringify(s),before);
 assert.equal(mod.decodePdf(x.paymentReceipts[0].contentBase64).size,x.paymentReceipts[0].size);
});
test('substituição mantém todos os bytes e metadados anteriores',()=>{
 const x=attach(paid()),old=structuredClone(x.paymentReceipts[0]),
 y=attach(x,{previousId:old.id,contentBase64:pdf(2),reason:'Versão corrigida'});
 assert.deepEqual(y.paymentReceipts[0],old);assert.equal(y.paymentReceipts[1].version,2);
 assert.equal(y.paymentReceipts[1].previousId,old.id);assert.equal(core.inspect(y).ok,true);
 assert.equal(mod.receiptMetadata(y)[0].current,false);assert.equal(mod.receiptMetadata(y)[1].current,true);
 assert.equal('contentBase64' in mod.receiptMetadata(y)[0],false);
 assert.equal('contentBase64' in observer.analyze(y).paymentReceiptHistory[0],false);
 assert.throws(()=>attach(y,{previousId:old.id,contentBase64:pdf(3)}),/mudou/);
});
test('PDF idêntico não entra novamente, inclusive em outro pagamento',()=>{
 let s=attach(paid());s=add(s);s=op(s,'finance.pay',{id:'FIN-0002'});
 const snap=JSON.stringify(s);
 assert.throws(()=>attach(s,{targetId:'FIN-0002'}),/idêntico/);
 assert.throws(()=>attach(s,{previousId:'CPV-0001'}),/idêntico/);
 assert.equal(JSON.stringify(s),snap);
});
test('lote consolida um só comprovante para todos seus títulos',()=>{
 let s=add(add(core.initial()));
 s=op(s,'finance.faction.close',{factionId:'FAC-0001',financeIds:['FIN-0001','FIN-0002'],
 reference:'PAG-TESTE',reason:'Conferido'});
 assert.equal(mod.receiptTargets(s).length,1);
 assert.throws(()=>attach(s),/pertence a um fechamento/);
 const x=attach(s,{targetId:'PAG-0001'});
 assert.equal(x.paymentReceipts[0].kind,'lote');
 assert.deepEqual(x.paymentReceipts[0].financeIds,['FIN-0001','FIN-0002']);
 assert.equal(x.paymentReceipts[0].amountCents,500);
 assert.deepEqual(x.paymentBatches,s.paymentBatches);
 assert.equal(core.inspect(x).ok,true);assert.deepEqual(observer.analyze(x).findings,[]);
});
test('título aberto, a receber ou inexistente não aceita comprovante de quitação',()=>{
 const s=add(core.initial());
 assert.throws(()=>attach(s),/já quitado/);
 assert.throws(()=>attach(paid(),{targetId:'FIN-9999'}),/já quitado/);
 let r=op(core.initial(),'finance.add',{description:'Recebimento fictício',kind:'receber',amountCents:200});
 r=op(r,'finance.pay',{id:'FIN-0001'});assert.throws(()=>attach(r),/já quitado/);
});
test('arquivo não PDF, nome inseguro, dados não declarados fictícios e tamanho recusados',()=>{
 const s=paid(),snap=JSON.stringify(s);
 for(const p of [{fictitious:false},{fileName:'../dados.pdf'},{fileName:'arquivo.html'},
 {reason:''},{contentBase64:'not-a-pdf'},{contentBase64:Buffer.from('texto puro').toString('base64')},
 {contentBase64:Buffer.from('%PDF-1.4\n'+'x'.repeat(262144)+'\n%%EOF').toString('base64')}]){
  assert.throws(()=>attach(s,p));assert.equal(JSON.stringify(s),snap);
 }
});
test('auditoria detecta exclusão, adulteração de vínculo, conteúdo ou versão',()=>{
 const s=attach(paid());
 for(const mutate of [x=>x.paymentReceipts.pop(),x=>x.paymentReceipts[0].amountCents++,
 x=>x.paymentReceipts[0].contentBase64=pdf(2),x=>x.paymentReceipts[0].version=3,
 x=>x.paymentReceipts[0].checksum='00000000']){
  const x=structuredClone(s);mutate(x);assert.equal(core.inspect(x).ok,false);
 }
 const bad=structuredClone(s);bad.paymentReceipts[0].targetId='FIN-9999';
 assert.ok(observer.analyze(bad).findings.some(f=>f.code==='COMPROVANTE_VINCULO'));
});
test('comando atrasado ou repetido não grava novo documento',()=>{
 const s=paid(),x=attach(s),snap=JSON.stringify(x);
 for(const cmd of [{expectedRevision:s.revision,commandId:'CPV-ATRASADO'},
 {expectedRevision:x.revision,commandId:x.log.at(-1).commandId}]){
  assert.throws(()=>core.apply(x,{type:'finance.receipt.attach',payload:{},actor:'Teste',...cmd}));
  assert.equal(JSON.stringify(x),snap);
 }
});
test('registro legado sem comprovantes continua utilizável sem reset',()=>{
 const s=paid();delete s.paymentReceipts;assert.equal(core.inspect(s).ok,true);
 assert.equal(attach(s).paymentReceipts.length,1);
});
