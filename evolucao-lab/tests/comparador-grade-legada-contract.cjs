'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),
 path=require('node:path');
const compare=require('../migracao/comparador-grade-legada.cjs').compare;
function sample(){
 const legacy={id:'ordem-legada-87',clientId:'CLI-0001',grade:[
  {productId:'PRO-A',color:'Preto',size:'P',qty:40},
  {productId:'PRO-A',color:'Preto',size:'M',qty:60},
  {productId:'PRO-B',color:'Rubi',size:'P',qty:20},
  {productId:'PRO-B',color:'Rubi',size:'M',qty:30}]};
 const prepared={id:'PDM-0001',clientId:'CLI-0001',sizes:['P','M'],items:[
  {id:'ITM-001',productId:'PRO-A',colors:[{color:'Preto',grade:{P:40,M:60}}]},
  {id:'ITM-002',productId:'PRO-B',colors:[{color:'Rubi',grade:{P:20,M:30}}]}]};
 return {legacy,prepared};
}
test('150 peças, 2 modelos, 4 células: equivalência da grade não habilita migração comercial',()=>{
 const {legacy,prepared}=sample(),before=JSON.stringify([legacy,prepared]);
 const r=compare(legacy,prepared);
 assert.equal(r.source.pieces,150);assert.equal(r.target.pieces,150);
 assert.equal(r.source.lines,4);assert.equal(r.target.lines,4);
 assert.equal(r.gradeEquivalent,true);assert.equal(r.sameClient,true);
 assert.deepEqual(r.diffs,[]);
 assert.equal(r.readyForCommercialMigration,false);
 assert.equal(r.canWrite,false);assert.equal(r.canCreateFinancialTitle,false);
 assert.equal(r.canCreateStockMovement,false);
 assert.equal(JSON.stringify([legacy,prepared]),before);
});
test('diferença de 20 peças num tamanho não é compensada por outro modelo',()=>{
 const {legacy,prepared}=sample();
 prepared.items[0].colors[0].grade.M=40;
 const r=compare(legacy,prepared);
 assert.equal(r.source.pieces,150);assert.equal(r.target.pieces,130);
 assert.equal(r.gradeEquivalent,false);assert.equal(r.reviewRequired,true);
 assert.equal(r.diffs.length,1);
 assert.deepEqual([r.diffs[0].productId,r.diffs[0].color,r.diffs[0].size,
  r.diffs[0].legacyQty,r.diffs[0].preparedQty,r.diffs[0].delta],
  ['PRO-A','Preto','M',60,40,-20]);
});
test('sem identidade do cliente, não aprovar mesmo com grade idêntica',()=>{
 const {legacy,prepared}=sample();delete legacy.clientId;
 const r=compare(legacy,prepared);
 assert.equal(r.gradeEquivalent,true);
 assert.equal(r.clientComparable,false);
 assert.equal(r.sameClient,false);
 assert.equal(r.reviewRequired,true);
 assert.match(r.warnings.join(' '),/Cliente sem identidade/);
});
test('duplicidade, modelo repetido e entrada sem produto são bloqueadas',()=>{
 const {legacy,prepared}=sample();
 const doubled=JSON.parse(JSON.stringify(legacy));
 doubled.grade.push({...doubled.grade[0],color:'PRETO'});
 assert.throws(()=>compare(doubled,prepared),/duplicada/);
 const repeated=JSON.parse(JSON.stringify(prepared));
 repeated.items[1].productId='PRO-A';
 assert.throws(()=>compare(legacy,repeated),/dois itens/);
 const invalid=JSON.parse(JSON.stringify(legacy));invalid.grade[0].productId='';
 assert.throws(()=>compare(invalid,prepared),/ausente\/inválido/);
});
test('capitalização simples é reconhecida sem misturar cores distintas ou salvar',()=>{
 const {legacy,prepared}=sample();
 prepared.items[1].colors[0].color='rubi ';
 assert.equal(compare(legacy,prepared).gradeEquivalent,true);
 prepared.items[1].colors[0].color='Rubro';
 const r=compare(legacy,prepared);
 assert.equal(r.gradeEquivalent,false);
 assert.equal(r.diffs.length,4>0?2:0);
 assert.ok(r.diffs.some(x=>x.reason==='ausente_no_preparo'));
 assert.ok(r.diffs.some(x=>x.reason==='incluido_no_preparo'));
});
test('comparador é puro, sem acesso a servidor e sem qualquer escritor',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../migracao/comparador-grade-legada.cjs'),'utf8');
 assert.doesNotMatch(src,/\bfetch\s*\(|\bindexedDB\b|\blocalStorage\b|\bXMLHttpRequest\b|\bWebSocket\b|supabase\.from/);
 assert.match(src,/readyForCommercialMigration:false/);
 assert.match(src,/canWrite:false/);
});
