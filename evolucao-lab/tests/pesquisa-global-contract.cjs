'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../operacao-integrada-core.js'),search=require('../modulos/pesquisa-global-v1.js');
let n=0;
const op=(s,type,payload={})=>core.apply(s,{type,payload,actor:'Teste fictício',
 expectedRevision:s.revision,commandId:'BUSCA-T-'+(++n)}).state;
function seed(){let s=core.initial();s=op(s,'order.add',{clientId:'CLI-0001',productId:'PRO-0001',grade:{P:10,M:0,G:0,GG:0}});
 s=op(s,'cut.record',{orderId:'PED-0001',size:'P',qty:10});
 s=op(s,'faction.allocate',{orderId:'PED-0001',factionId:'FAC-0001',qty:10});
 s=op(s,'faction.return',{orderId:'PED-0001',qty:10});
 s=op(s,'order.separate',{orderId:'PED-0001',qty:10});
 s=op(s,'order.ship',{orderId:'PED-0001',qty:10});
 s=op(s,'finance.pay',{id:'FIN-0002'});
 s=op(s,'order.add',{clientId:'CLI-0002',productId:'PRO-0002',grade:{P:5,M:0,G:0,GG:0}});
 return s;}
const query=(s,q,opts)=>search.search(search.build(s),q,opts);
test('modelo exato e SKU têm relevância e acentos não interferem',()=>{
 const s=seed();assert.equal(query(s,'DEMO-MELINA').items[0].id,'PRO-0001');
 assert.equal(query(s,'CAMISÓLA MELINA').items[0].id,'PRO-0001');
 assert.equal(query(s,'PED-0001').items[0].id,'PED-0001');
});
test('corte concluído permanece localizável depois de expedição e pagamento',()=>{
 const s=seed(),r=query(s,'melina',{module:'corte'});
 assert.equal(r.items.length,1);assert.equal(r.items[0].status,'Concluído');
 assert.match(r.items[0].detail,/10 de 10 peças cortadas/);
 const p=query(s,'melina',{module:'pedidos'}).items[0];
 assert.equal(p.status,'Expedido');assert.match(p.detail,/10 expedidas/);
});
test('filtro restringe módulo, termo e pedido correto',()=>{
 const s=seed();const r=query(s,'tammy',{module:'pedidos'});
 assert.equal(r.total,1);assert.equal(r.items[0].id,'PED-0002');
 assert.equal(r.items[0].status,'Aguardando corte');
 assert.equal(query(s,'tammy',{module:'corte'}).total,0);
 assert.equal(query(s,'melina inexistente').total,0);
});
test('facção, acerto e título são encontrados pelo modelo e pelo pedido',()=>{
 const s=seed();
 assert.ok(query(s,'melina',{module:'faccoes'}).items.some(x=>x.type==='envio'&&x.orderId==='PED-0001'));
 assert.equal(query(s,'melina',{module:'acertos'}).items[0].id,'ACE-0001');
 assert.ok(query(s,'melina',{module:'hub'}).items.some(x=>x.id==='FIN-0002'&&x.status==='pago'));
});
test('pesquisa não modifica estado e reflete versão atual após alteração',()=>{
 const s=seed(),before=JSON.stringify(s);
 query(s,'melina');query(s,'tammy');assert.equal(JSON.stringify(s),before);
 const x=op(s,'cut.record',{orderId:'PED-0002',size:'P',qty:5});
 assert.equal(query(s,'tammy',{module:'corte'}).total,0);
 assert.equal(query(x,'tammy',{module:'corte'}).total,1);
});
test('paginação limita resultados sem omitir ou repetir registros',()=>{
 const s=seed(),idx=search.build(s),a=search.search(idx,'',{limit:5,page:1}),b=search.search(idx,'',{limit:5,page:2});
 assert.equal(a.items.length,5);assert.equal(b.items.length,5);assert.equal(a.total,idx.length);
 assert.equal(new Set([...a.items,...b.items].map(x=>x.key)).size,10);
});
test('metadados de comprovante pesquisáveis sem indexar o binário',()=>{
 const s=seed();s.paymentReceipts=[{id:'CPV-0001',fileName:'teste.pdf',targetId:'FIN-0002',
 financeIds:['FIN-0002'],amountCents:5500,version:1,reason:'Exercício',contentBase64:'SEGREDOBINARIO'}];
 const idx=search.build(s);
 assert.equal(query(s,'teste.pdf').items[0].id,'CPV-0001');
 assert.equal(query(s,'SEGREDOBINARIO').total,0);
 assert.equal(JSON.stringify(idx).includes('SEGREDOBINARIO'),false);
});
test('documento antigo sem coleções opcionais continua pesquisável',()=>{
 const s=core.initial();delete s.paymentReceipts;delete s.factionAssignments;delete s.bomCutRuns;
 assert.equal(query(s,'melina').items[0].id,'PRO-0001');
});
test('20 mil resultados são paginados com IDs exatos e sem perda de registros',()=>{
 const s=core.initial();s.products=Array.from({length:20000},(_,i)=>({id:'PRO-'+(i+1),sku:'SKU-'+(i+1),name:'Modelo teste '+(i+1),materialId:'MAT-0001'}));
 const idx=search.build(s),r=search.search(idx,'modelo teste',{module:'produtos',limit:50,page:400});
 assert.equal(r.total,20000);assert.equal(r.items.length,50);
 assert.equal(search.search(idx,'SKU-19999').items[0].id,'PRO-19999');
});
