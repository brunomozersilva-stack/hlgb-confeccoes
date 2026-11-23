'use strict';
/* Executável OFFLINE para demonstrar e conferir extratos FICTÍCIOS.
 * Não tem conexão de banco, não cria arquivo, não recebe dados de produção,
 * não altera pedidos, estoque, financeiro, main ou homologação persistente.
 *
 * node evolucao-lab/migracao/conferir-extrato-ficticio-v1.cjs --summary
 * node evolucao-lab/migracao/conferir-extrato-ficticio-v1.cjs --json
 * node evolucao-lab/migracao/conferir-extrato-ficticio-v1.cjs --check exemplo.json
 * node evolucao-lab/migracao/conferir-extrato-ficticio-v1.cjs --compare a.json b.json
 */
const fs=require('node:fs');
const {inspectExtract,compareReads,sha256}=
 require('./adaptador-extrato-homologacao-v1.cjs');
const TYPES=['legacyOrders','preparedOrders','cuts','allocations','settlements','finance'];
function makeExample(){
 const first='LEG-TESTE-001',second='LEG-TESTE-002';
 const legacy=id=>({id,clientId:'CLI-FICTICIO',grade:[
  {productId:'PRO-CAMISOLA-FICTICIA',color:'Preto',size:'P',qty:20},
  {productId:'PRO-CALCINHA-FICTICIA',color:'Rubi',size:'M',qty:10}
 ]});
 const prepared=(id,suffix)=>({id:'PDM-TESTE-'+suffix,sourceOrderId:id,
  clientId:'CLI-FICTICIO',sizes:['P','M'],
  items:[
   {id:'ITM-A-'+suffix,productId:'PRO-CAMISOLA-FICTICIA',
    qty:20,priceCents:2500,amountCents:50000,
    colors:[{color:'Preto',grade:{P:20,M:0}}]},
   {id:'ITM-B-'+suffix,productId:'PRO-CALCINHA-FICTICIA',
    qty:10,priceCents:1200,amountCents:12000,
    colors:[{color:'Rubi',grade:{P:0,M:10}}]}],
  totals:{pieces:30,amountCents:62000}});
 const data={legacyOrders:[legacy(first),legacy(second)],
  preparedOrders:[prepared(first,'001'),prepared(second,'002')],
  cuts:[],allocations:[],settlements:[],finance:[]};
 for(const [orderId,suffix] of [[first,'001'],[second,'002']]){
  data.cuts.push({id:'COR-'+suffix,orderId,productId:'PRO-CAMISOLA-FICTICIA',
   qty:15,status:'concluido'});
  data.allocations.push({id:'ENV-'+suffix,orderId,
   productId:'PRO-CAMISOLA-FICTICIA',qty:12,status:'enviado',
   cutId:'COR-'+suffix,factionId:'FAC-FICTICIA'});
  data.allocations.push({id:'RET-'+suffix,orderId,
   productId:'PRO-CAMISOLA-FICTICIA',qty:10,status:'retornado',
   sourceAllocationId:'ENV-'+suffix,factionId:'FAC-FICTICIA'});
  data.settlements.push({id:'ACE-'+suffix,orderId,
   productId:'PRO-CAMISOLA-FICTICIA',qty:10,amountCents:2000,
   status:'aberto',returnId:'RET-'+suffix});
  data.finance.push({id:'PAG-'+suffix,orderId,sourceId:'ACE-'+suffix,
   kind:'pagar',amountCents:2000,status:'aberto'});
 }
 const snapshotId='SNAPSHOT-FICTICIO-001',revision='REV-FICTICIA-001';
 const manifest={},pages=[];
 for(const collection of TYPES){
  const records=data[collection];
  const chunks=collection==='legacyOrders'?
   [records.slice(0,1),records.slice(1)]:[records];
  manifest[collection]={pages:chunks.length,records:records.length};
  for(const [offset,values] of chunks.entries()){
   pages.push({snapshotId,revision,collection,page:offset+1,
    records:values,checksum:'sha256:'+sha256(values)});
  }
 }
 return {schema:'hlgb-extrato-homologacao-v1',source:{
  environment:'homologacao-ficticia',snapshotId,revision,readOnly:true,
  capturedAt:'2026-11-23T14:00:00Z'},manifest,pages};
}
function summary(result){
 return {
  schema:'hlgb-resumo-extrato-ficticio-v1',
  mode:'somente_leitura',reconciliação:'BLOQUEADA',
  sourceId:result.source.snapshotId,revision:result.source.revision,
  pagesChecked:result.pagesChecked,checksumsVerified:result.checksumsVerified,
  requestedCollections:result.documentCollections,
  counts:result.sourceCounts,pairedOrders:result.mappedOrders,
  unpairedOrders:result.unmapped.length,orphanDocuments:result.unattached.length,
  historicalTombstones:result.tombstones.length,reactivatedTombstones:result.historicalRecordsReactivated,
  repeatedDocumentIds:result.batch?.conflicts.length??null,
  sourcePieces:result.batch?.totals.sourcePieces??null,
  targetPieces:result.batch?.totals.targetPieces??null,
  findings:result.findings.map(x=>x.code),
  canWrite:false,canPay:false,canChangeStock:false,
  realDatabaseCoverageProven:false
 };
}
function readLocal(file){
 if(!file||file.startsWith('http:')||file.startsWith('https:'))
  throw Error('Só arquivos locais fictícios, nenhuma URL');
 const stats=fs.statSync(file);
 if(!stats.isFile()||stats.size>2*1024*1024||stats.size<10)
  throw Error('Arquivo fora dos limites de teste (10 bytes a 2 MiB)');
 const obj=JSON.parse(fs.readFileSync(file,'utf8'));
 if(obj?.source?.environment!=='homologacao-ficticia')
  throw Error('Nunca use arquivos reais da empresa nesta ferramenta de ensaio');
 return obj;
}
if(require.main===module){
 try{
  const [mode,a,b,...extra]=process.argv.slice(2);
  if(extra.length)throw Error('Argumentos excedentes');
  if(mode==='--json'&&!a)process.stdout.write(JSON.stringify(makeExample(),null,2)+'\n');
  else if(mode==='--summary'&&!a)
   process.stdout.write(JSON.stringify(summary(inspectExtract(makeExample())),null,2)+'\n');
  else if(mode==='--check'&&a&&!b)
   process.stdout.write(JSON.stringify(summary(inspectExtract(readLocal(a))),null,2)+'\n');
  else if(mode==='--compare'&&a&&b){
   const r=compareReads(readLocal(a),readLocal(b));
   process.stdout.write(JSON.stringify({
    schema:r.schema,sameRevision:r.sameRevision,sameContents:r.sameContents,
    firstDigest:r.firstDigest,secondDigest:r.secondDigest,
    approvedForProduction:false,canWrite:false},null,2)+'\n');
  }else throw Error('Use --summary, --json, --check <arquivo.json>, ou --compare <a.json> <b.json>');
 }catch(err){process.stderr.write('Prévia recusada: '+err.message+'\n');process.exitCode=1;}
}
module.exports=Object.freeze({makeExample,summary});
