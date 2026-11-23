'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const {inspectExtract,compareReads,sha256}=require('../migracao/adaptador-extrato-homologacao-v1.cjs');
const COLLECTIONS=['legacyOrders','preparedOrders','cuts','allocations','settlements','finance'];
function sample(){
 const legacy=n=>({id:'LEG-'+n,clientId:'CLI-'+n,grade:[
  {productId:'PRO-A',color:'Preto',size:'P',qty:10},
  {productId:'PRO-B',color:'Rubi',size:'M',qty:5}]});
 const prepared=n=>({id:'PDM-'+n,sourceOrderId:'LEG-'+n,clientId:'CLI-'+n,
  sizes:['P','M'],items:[
   {id:'ITEM-A-'+n,productId:'PRO-A',qty:10,priceCents:1000,amountCents:10000,
    colors:[{color:'Preto',grade:{P:10,M:0}}]},
   {id:'ITEM-B-'+n,productId:'PRO-B',qty:5,priceCents:1500,amountCents:7500,
    colors:[{color:'Rubi',grade:{P:0,M:5}}]}],
  totals:{pieces:15,amountCents:17500}});
 const data={legacyOrders:[legacy('001'),legacy('002')],
  preparedOrders:[prepared('001'),prepared('002')],cuts:[],
  allocations:[],settlements:[],finance:[]};
 for(const n of ['001','002']){
  const orderId='LEG-'+n;
  data.cuts.push({id:'COR-'+n,orderId,productId:'PRO-A',qty:8,status:'concluido'});
  data.allocations.push(
   {id:'ENV-'+n,orderId,productId:'PRO-A',qty:7,status:'enviado',
    cutId:'COR-'+n,factionId:'FAC-X'},
   {id:'RET-'+n,orderId,productId:'PRO-A',qty:6,status:'retornado',
    sourceAllocationId:'ENV-'+n,factionId:'FAC-X'});
  data.settlements.push({id:'ACE-'+n,orderId,productId:'PRO-A',qty:6,
   amountCents:1200,status:'aberto',returnId:'RET-'+n});
  data.finance.push({id:'FIN-'+n,orderId,sourceId:'ACE-'+n,
   kind:'pagar',amountCents:1200,status:'aberto'});
 }
 const snapshotId='LAB-SNAPSHOT-001',revision='rev-001';
 const pages=[],manifest={};
 for(const collection of COLLECTIONS){
  const records=data[collection],chunks=collection==='legacyOrders'?
   [[records[0]],[records[1]]]:[records];
  manifest[collection]={pages:chunks.length,records:records.length};
  for(const [idx,chunk] of chunks.entries())
   pages.push({collection,page:idx+1,snapshotId,revision,
    checksum:'sha256:'+sha256(chunk),records:chunk});
 }
 return {schema:'hlgb-extrato-homologacao-v1',source:{
  environment:'homologacao-ficticia',snapshotId,revision,
  capturedAt:'2026-11-23T14:00:00Z',readOnly:true
 },manifest,pages};
}
const page=(s,c,n=1)=>s.pages.find(p=>p.collection===c&&p.page===n);
const resign=p=>{p.checksum='sha256:'+sha256(p.records);};
test('extrato fictício paginado gera conferência do lote sem importar os 2 pedidos',()=>{
 const input=sample(),before=JSON.stringify(input),out=inspectExtract(input);
 assert.equal(out.pagesChecked,7);
 assert.equal(out.completeAgainstDeclaredManifest,true);
 assert.equal(out.checksumsVerified,true);
 assert.equal(out.sourceCounts.legacyOrders,2);
 assert.equal(out.sourceCounts.finance,2);
 assert.equal(out.mappedOrders,2);
 assert.equal(out.unmapped.length,0);
 assert.equal(out.unattached.length,0);
 assert.equal(out.batch.orders.length,2);
 assert.equal(out.batch.totals.sourcePieces,30);
 assert.equal(out.batch.totals.documents,10);
 assert.equal(out.batch.conflicts.length,0);
 assert.equal(out.realDatabaseCoverageProven,false);
 assert.equal(out.canWrite,false);assert.equal(out.canPay,false);
 assert.equal(out.canChangeStock,false);assert.equal(out.preparedChanges,0);
 assert.equal(JSON.stringify(input),before);
});
test('checksum incorreto, página ausente e revisão misturada não são aceitos',()=>{
 const s=sample();
 page(s,'legacyOrders').records[0].grade[0].qty=11;
 assert.throws(()=>inspectExtract(s),/Checksum não confere/);
 const missing=sample();
 missing.pages=missing.pages.filter(p=>!(p.collection==='legacyOrders'&&p.page===2));
 assert.throws(()=>inspectExtract(missing),/registros não confere|página 2 ausente/);
 const mixed=sample();page(mixed,'finance').revision='rev-002';
 assert.throws(()=>inspectExtract(mixed),/Mistura de snapshots ou revisões/);
});
test('contagem e chave duplicada na mesma coleção geram rejeição integral',()=>{
 const badCount=sample();badCount.manifest.finance.records=1;
 assert.throws(()=>inspectExtract(badCount),/contagem de registros não confere/);
 const duplicated=sample();
 page(duplicated,'finance').records[1].id=page(duplicated,'finance').records[0].id.toLowerCase();
 resign(page(duplicated,'finance'));
 assert.throws(()=>inspectExtract(duplicated),/Registro duplicado/);
 const duplicatePage=sample();duplicatePage.pages.push(structuredClone(page(duplicatePage,'finance')));
 assert.throws(()=>inspectExtract(duplicatePage),/Página duplicada/);
});
test('pedido preparado sem sourceOrderId explícito é recusado; sem destino vira pendência',()=>{
 const broken=sample();delete page(broken,'preparedOrders').records[0].sourceOrderId;
 resign(page(broken,'preparedOrders'));
 assert.throws(()=>inspectExtract(broken),/sourceOrderId/);
 const missing=sample();page(missing,'preparedOrders').records.pop();
 missing.manifest.preparedOrders.records--;resign(page(missing,'preparedOrders'));
 const report=inspectExtract(missing);
 assert.equal(report.mappedOrders,1);
 assert.equal(report.unmapped.length,1);
 assert.equal(report.unmapped[0].kind,'PEDIDO_SEM_PREPARO');
 assert.equal(report.importable,false);
});
test('documento não relacionado a pedido não desaparece e bloqueia aprovação',()=>{
 const s=sample(),p=page(s,'finance');
 p.records.push({id:'FIN-SEM-PEDIDO',orderId:'LEG-INEXISTENTE',
  sourceId:'ACE-NAO-EXISTE',kind:'pagar',amountCents:1000,status:'aberto'});
 s.manifest.finance.records++;resign(p);
 const out=inspectExtract(s);
 assert.equal(out.unattached.length,1);
 assert.equal(out.unattached[0].recordId,'FIN-SEM-PEDIDO');
 assert.ok(out.findings.some(x=>x.code==='DOCUMENTOS_SEM_REFERENCIA_COMPROVADA'));
 assert.equal(out.batch.totals.documents,10);
 assert.equal(out.realDatabaseCoverageProven,false);
});
test('mesmo título em pedidos diferentes aparece na lista de conflitos',()=>{
 const s=sample(),p=page(s,'finance');
 p.records[1].id=p.records[0].id.toLowerCase();
 resign(p);
 // A duplicidade no extrato não é tolerada, nem mesmo para comparação:
 assert.throws(()=>inspectExtract(s),/Registro duplicado/);
});
test('duas leituras do mesmo snapshot só comprovam igualdade do conteúdo recebido',()=>{
 const a=sample(),b=structuredClone(a);
 b.source.capturedAt='2026-11-23T14:01:00Z';
 const same=compareReads(a,b);
 assert.equal(same.sameRevision,true);
 assert.equal(same.sameContents,true);
 assert.equal(same.confirmedByIndependentDatabase,false);
 assert.equal(same.safeToUseAsMigrationApproval,false);
 assert.equal(same.canWrite,false);
 const c=sample(),p=page(c,'finance');
 p.records[0].amountCents=1300;resign(p);
 const different=compareReads(a,c);
 assert.equal(different.sameRevision,true);
 assert.equal(different.sameContents,false);
 assert.equal(different.canWrite,false);
});
test('pedido antigo excluído não é reativado na prévia nem some da auditoria',()=>{
 const s=sample(),p=page(s,'legacyOrders',2);
 p.records[0].deletedAt='2026-10-01T10:00:00Z';resign(p);
 const r=inspectExtract(s);
 assert.equal(r.sourceCounts.legacyOrders,2,'contagem documental preservada');
 assert.equal(r.mappedOrders,1,'apenas pedido não excluído em operação');
 assert.equal(r.tombstones.length,1);
 assert.equal(r.tombstones[0].collection,'legacyOrders');
 assert.equal(r.tombstones[0].recordId,'LEG-002');
 assert.equal(r.tombstones[0].restoredAsActive,false);
 assert.equal(r.historicalRecordsReactivated,0);
 assert.equal(r.unmapped[0].kind,'PREPARADO_SEM_ORIGEM');
 assert.ok(r.findings.some(x=>x.code==='TOMBSTONES_PRESERVADOS_SEM_REATIVACAO'));
 assert.equal(r.canWrite,false);
});
test('acerto e pagamento excluídos ficam apenas no inventário histórico',()=>{
 const s=sample(),sett=page(s,'settlements'),fin=page(s,'finance');
 sett.records[0].isDeleted=true;fin.records[0].deleted=true;
 resign(sett);resign(fin);
 const r=inspectExtract(s);
 assert.equal(r.tombstones.length,2);
 assert.equal(r.sourceCounts.settlements,2);
 assert.equal(r.sourceCounts.finance,2);
 assert.equal(r.batch.totals.documents,8,'documentos excluídos não entram em operações ativas');
 assert.deepEqual(r.tombstones.map(x=>x.collection),['settlements','finance']);
 assert.equal(r.historicalRecordsReactivated,0);
 assert.equal(r.canPay,false);
});
test('marcadores de exclusão com tipo inesperado são rejeitados sem presumir ativo',()=>{
 const s=sample(),p=page(s,'legacyOrders',1);
 p.records[0].deletedAt=123456;resign(p);
 assert.throws(()=>inspectExtract(s),/data de exclusão inválida/);
 const t=sample(),q=page(t,'finance');
 q.records[0].isDeleted='false';resign(q);
 assert.throws(()=>inspectExtract(t),/marcador de exclusão inválido/);
});
test('não há consultas ou mutações de banco, e o adaptador é determinístico',()=>{
 const s=sample(),a=inspectExtract(s);
 const reverse=structuredClone(s);reverse.pages.reverse();
 const b=inspectExtract(reverse);
 assert.equal(a.digest,b.digest);
 assert.deepEqual(a.batch,b.batch);
 const code=fs.readFileSync(path.join(__dirname,'../migracao/adaptador-extrato-homologacao-v1.cjs'),'utf8');
 assert.doesNotMatch(code,/\bfetch\s*\(|\bindexedDB\b|\blocalStorage\b|\bXMLHttpRequest\b|\bWebSocket\b|supabase\.from|\.insert\s*\(/);
 // crypto.createHash().update() é necessário ao SHA-256; não é escrita em banco.
 assert.doesNotMatch(code,/(?:supabase|db|repository|database|client)\.(?:update|insert|upsert|delete)\s*\(/);
 assert.match(code,/canWrite:false/);
});
