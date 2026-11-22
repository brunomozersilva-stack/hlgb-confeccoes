'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const {buildBatch}=require('../migracao/dossie-lote-v1.cjs');
function order(n=1){
 const suffix=String(n).padStart(3,'0'),id='LEGADO-'+suffix;
 return {legacy:{id,clientId:'CLI-'+suffix,
  grade:[{productId:'MOD-A',color:'Preto',size:'P',qty:20}]},
  prepared:{id:'PDM-'+suffix,clientId:'CLI-'+suffix,sizes:['P'],
   items:[{id:'ITM-001',productId:'MOD-A',qty:20,priceCents:1000,amountCents:20000,
    colors:[{color:'Preto',grade:{P:20}}]}],totals:{pieces:20,amountCents:20000}},
  evidence:{orderId:id,cuts:[{id:'COR-'+suffix,orderId:id,productId:'MOD-A',qty:12,status:'concluido'}],
   allocations:[{id:'ENV-'+suffix,orderId:id,productId:'MOD-A',qty:10,status:'enviado',
    cutId:'COR-'+suffix,factionId:'FAC-X'},
    {id:'RET-'+suffix,orderId:id,productId:'MOD-A',qty:7,status:'retornado',
     sourceAllocationId:'ENV-'+suffix,factionId:'FAC-X'}],
   settlements:[{id:'ACE-'+suffix,orderId:id,productId:'MOD-A',qty:7,
    amountCents:1400,returnId:'RET-'+suffix,status:'aberto'}],
   finance:[{id:'FIN-'+suffix,sourceId:'ACE-'+suffix,kind:'pagar',amountCents:1400,status:'aberto'}]
  }};
}
test('dois pedidos diferentes mantêm IDs e totais sem importar nem pagar',()=>{
 const batch=[order(1),order(2)],before=JSON.stringify(batch);
 const result=buildBatch(batch);
 assert.equal(result.orders.length,2);
 assert.equal(result.totals.sourcePieces,40);
 assert.equal(result.totals.targetPieces,40);
 assert.equal(result.totals.documents,10);
 assert.equal(result.totals.missingReferences,0);
 assert.deepEqual(result.conflicts,[]);
 assert.equal(result.canWrite,false);assert.equal(result.canPay,false);
 assert.equal(result.canChangeStock,false);
 assert.equal(result.preparedChanges,0);
 assert.equal(JSON.stringify(batch),before);
});
test('o mesmo documento financeiro em dois pedidos dispara conflito sem fusão automática',()=>{
 const a=order(1),b=order(2);
 b.evidence.finance[0].id=a.evidence.finance[0].id;
 const result=buildBatch([a,b]);
 assert.equal(result.conflicts.length,1);
 assert.equal(result.conflicts[0].stage,'financeiro');
 assert.equal(result.conflicts[0].firstOrderId,a.legacy.id);
 assert.equal(result.conflicts[0].secondOrderId,b.legacy.id);
 assert.equal(result.conflicts[0].canMerge,false);
 assert.ok(result.reviewQueue.some(x=>x.code==='DOCUMENTO_EM_DOIS_PEDIDOS'));
 assert.equal(result.importable,false);
});
test('IDs de pedido legado e de preparo duplicados são recusados mesmo com grafia distinta',()=>{
 const a=order(1),b=order(2);
 b.legacy.id='LEGADO-001';
 b.evidence.orderId=b.legacy.id;
 for(const key of ['cuts','allocations','settlements'])for(const doc of b.evidence[key])doc.orderId=b.legacy.id;
 assert.throws(()=>buildBatch([a,b]),/origem usado duas vezes/);
 const c=order(3),d=order(4);
 d.prepared.id=c.prepared.id.toLowerCase();
 assert.throws(()=>buildBatch([c,d]),/destino usado duas vezes/);
});
test('grade divergente, faltas de vínculo e título pago constam no resumo sem liberar merge',()=>{
 const a=order(1);
 a.prepared.items[0].colors[0].grade.P=18;
 a.prepared.items[0].qty=18;
 a.prepared.items[0].amountCents=18000;
 a.prepared.totals.pieces=18;
 a.prepared.totals.amountCents=18000;
 delete a.evidence.allocations[0].cutId;
 a.evidence.finance[0].status='pago';
 const result=buildBatch([a]);
 assert.equal(result.totals.gradeDivergences,1);
 assert.equal(result.totals.paidDocuments,1);
 assert.equal(result.totals.missingReferences,1);
 assert.ok(result.reviewQueue.some(x=>x.code==='GRADE_DIVERGENTE'));
 assert.ok(result.reviewQueue.some(x=>x.code==='VINCULOS_INCOMPLETOS'));
 assert.equal(result.approvedForProduction,false);
});
test('lote não aceita entrada incompleta nem mais de 100 pedidos',()=>{
 assert.throws(()=>buildBatch([]),/1 a 100/);
 assert.throws(()=>buildBatch([{legacy:{}}]),/incompleto/);
 assert.throws(()=>buildBatch(Array.from({length:101},(_,i)=>order(i+1))),/1 a 100/);
});
test('mesma entrada produz mesmo relatório, sem IO e sem comandos',()=>{
 const source=[order(1),order(2)],a=buildBatch(source),b=buildBatch(source);
 assert.deepEqual(a,b);
 const code=fs.readFileSync(path.join(__dirname,'../migracao/dossie-lote-v1.cjs'),'utf8');
 assert.doesNotMatch(code,/\bfetch\s*\(|\bindexedDB\b|\blocalStorage\b|\bXMLHttpRequest\b|\bWebSocket\b|supabase\.from/);
 assert.match(code,/canWrite:false/);
});
