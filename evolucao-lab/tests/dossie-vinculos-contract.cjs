'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const {buildDossier}=require('../migracao/dossie-vinculos-v1.cjs');
function sample(){
 const old={id:'LEGADO-150',clientId:'CLI-FICTICIO',grade:[
  {productId:'MOD-A',color:'Preto',size:'P',qty:40},
  {productId:'MOD-A',color:'Preto',size:'M',qty:60},
  {productId:'MOD-B',color:'Rubi',size:'P',qty:20},
  {productId:'MOD-B',color:'Rubi',size:'M',qty:30}
 ]};
 const prepared={id:'PDM-150',clientId:'CLI-FICTICIO',sizes:['P','M'],
  items:[{id:'ITM-001',productId:'MOD-A',qty:100,priceCents:2000,amountCents:200000,
   colors:[{color:'Preto',grade:{P:40,M:60}}]},
   {id:'ITM-002',productId:'MOD-B',qty:50,priceCents:1000,amountCents:50000,
   colors:[{color:'Rubi',grade:{P:20,M:30}}]}],
  totals:{pieces:150,amountCents:250000}};
 const ev={orderId:old.id,
  cuts:[{id:'COR-A',orderId:old.id,productId:'MOD-A',qty:60,status:'concluido'}],
  allocations:[{id:'ENV-A',orderId:old.id,productId:'MOD-A',qty:40,status:'enviado',
   cutId:'COR-A',factionId:'FAC-X'},
   {id:'RET-A',orderId:old.id,productId:'MOD-A',qty:30,status:'retornado',
    sourceAllocationId:'ENV-A',factionId:'FAC-X'}],
  settlements:[{id:'ACE-A',orderId:old.id,productId:'MOD-A',qty:30,amountCents:6000,
   status:'aberto',returnId:'RET-A'}],
  finance:[{id:'FIN-FAC-A',sourceId:'ACE-A',orderId:old.id,kind:'pagar',
   amountCents:6000,status:'aberto'},
   {id:'FIN-CLI-A',sourceId:old.id,orderId:old.id,kind:'receber',
    amountCents:250000,status:'aberto'}]};
 return {old,prepared,ev};
}
test('dossiê conserva os IDs dos seis documentos em cadeia, por modelo',()=>{
 const {old,prepared,ev}=sample(),snapshot=JSON.stringify([old,prepared,ev]);
 const r=buildDossier(old,prepared,ev);
 assert.equal(r.sourceOrderId,'LEGADO-150');
 assert.equal(r.targetOrderId,'PDM-150');
 assert.equal(r.modelMap.length,2);
 assert.deepEqual(r.modelMap.map(x=>x.targetItemId),['ITM-001','ITM-002']);
 assert.equal(r.records.length,6);
 assert.equal(r.counters.identified,6);
 assert.equal(r.counters.missing,0);
 const byId=id=>r.records.find(x=>x.id===id);
 for(const id of ['COR-A','ENV-A','RET-A','ACE-A','FIN-FAC-A','FIN-CLI-A'])
  assert.ok(byId(id),'preservar '+id);
 assert.equal(byId('ENV-A').parentId,'COR-A');
 assert.equal(byId('RET-A').parentId,'ENV-A');
 assert.equal(byId('ACE-A').parentId,'RET-A');
 assert.equal(byId('FIN-FAC-A').parentId,'ACE-A');
 assert.equal(byId('FIN-CLI-A').parentId,old.id);
 assert.equal(byId('FIN-FAC-A').targetItemId,'ITM-001');
 assert.equal(byId('FIN-CLI-A').targetItemId,null);
 assert.equal(r.grade.gradeEquivalent,true);
 assert.equal(r.canExecute,false);assert.equal(r.canWrite,false);assert.equal(r.canPay,false);
 assert.equal(r.canChangeStock,false);assert.equal(r.canCreateTitle,false);
 assert.equal(r.preparedChanges,0);
 assert.equal(JSON.stringify([old,prepared,ev]),snapshot);
});
test('pagamento antigo e dupla emissão aparecem na fila; nenhum registro é recriado',()=>{
 const {old,prepared,ev}=sample();
 ev.finance.push({id:'FIN-FAC-B',sourceId:'ACE-A',orderId:old.id,
  kind:'pagar',amountCents:6000,status:'pago'});
 const r=buildDossier(old,prepared,ev);
 assert.equal(r.records.filter(x=>x.stage==='financeiro').length,3);
 assert.equal(r.counters.alreadyPaid,1);
 assert.equal(r.records.filter(x=>x.id==='FIN-FAC-B')[0].proposedNewId,null);
 assert.ok(r.reviewQueue.some(x=>x.code==='ACERTO_TITULO_INCONSISTENTE'));
 assert.ok(r.reviewQueue.some(x=>x.code==='TITULO_PAGO'));
 assert.equal(r.canPay,false);
});
test('ausência de prova não cria vínculos presumidos',()=>{
 const {old,prepared,ev}=sample();
 delete ev.allocations[0].cutId;delete ev.allocations[1].sourceAllocationId;
 delete ev.settlements[0].returnId;
 const r=buildDossier(old,prepared,ev);
 assert.equal(r.counters.missing,3);
 assert.ok(r.records.some(x=>x.id==='ACE-A'&&x.link==='exige_conferencia'));
 assert.ok(r.reviewQueue.filter(x=>x.code==='VINCULO_SEM_PROVA').length>=3);
 assert.equal(r.canExecute,false);
});
test('referência de corte de outro modelo não é convertida em identificação',()=>{
 const {old,prepared,ev}=sample();
 ev.cuts.push({id:'COR-B',orderId:old.id,productId:'MOD-B',
  qty:10,status:'concluido'});
 ev.allocations[0].cutId='COR-B';
 const r=buildDossier(old,prepared,ev);
 assert.ok(r.records.some(x=>x.id==='ENV-A'&&x.link==='exige_conferencia'));
 assert.ok(r.reviewQueue.some(x=>x.code==='ENVIO_CORTE_INVALIDO'));
});
test('modelo ausente em preparação é marcado sem fabricar item de destino',()=>{
 const {old,prepared,ev}=sample();
 prepared.items.pop();prepared.totals.pieces=100;
 prepared.totals.amountCents=200000;
 const r=buildDossier(old,prepared,ev);
 const missing=r.modelMap.find(x=>x.productId==='MOD-B');
 assert.equal(missing.status,'modelo_sem_correspondencia');
 assert.equal(missing.targetItemId,null);
 assert.ok(r.grade.diffs.some(x=>x.productId==='MOD-B'));
 assert.equal(r.isCommercialMigrationApproved,false);
});
test('dossiê reproduz o mesmo resultado e não acessa rede, banco ou gravações',()=>{
 const {old,prepared,ev}=sample();
 const a=buildDossier(old,prepared,ev),b=buildDossier(old,prepared,ev);
 assert.deepEqual(a,b);
 assert.equal(a.reviewQueue.at(-1).owner,'Homologação');
 const code=fs.readFileSync(path.join(__dirname,'../migracao/dossie-vinculos-v1.cjs'),'utf8');
 assert.doesNotMatch(code,/\bfetch\s*\(|\bindexedDB\b|\blocalStorage\b|\bXMLHttpRequest\b|\bWebSocket\b|supabase\.from|api\.apply\s*\(/);
 assert.match(code,/canExecute:false/);
});
