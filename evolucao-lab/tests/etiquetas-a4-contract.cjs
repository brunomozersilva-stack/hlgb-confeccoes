'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const labels=require('../modulos/etiquetas-a4-v1.js');
const root=path.resolve(__dirname,'..'),ui=fs.readFileSync(path.join(root,'operacao-integrada-ui.js'),'utf8'),
 page=fs.readFileSync(path.join(root,'operacao-integrada.html'),'utf8');
const row=(model,volumes,copies=1)=>({name:'Confecção Teste',model,size:'M',pieceQty:120,
 volumes,copies,date:'2026-11-22'});
test('Etiquetas A4 combinam modelos e expandem volume 1 de N sem duplicar incorretamente',()=>{
 const input=[row('Melina',5),row('Tammy',0,7)];
 const copy=JSON.stringify(input);
 const r=labels.plan(input,'10');
 assert.equal(r.total,12);assert.equal(r.modelCount,2);assert.equal(r.per,10);
 assert.equal(r.pages.length,2);
 assert.equal(r.pages[0].labels.length,10);assert.equal(r.pages[1].labels.length,2);
 assert.equal(r.pages[1].emptyCells,8);
 assert.deepEqual(r.labels.slice(0,5).map(x=>x.displayVolume),['1 de 5','2 de 5','3 de 5','4 de 5','5 de 5']);
 assert.equal(r.labels.filter(x=>x.model==='Melina').length,5);
 assert.equal(r.labels.filter(x=>x.model==='Tammy').length,7);
 assert.equal(r.labels.filter(x=>x.displayVolume==='—').length,7);
 assert.equal(JSON.stringify(input),copy,'Planejamento jamais altera o formulário');
 assert.equal(r.stockWritten,false);assert.equal(r.sampleOnly,true);
 const html=labels.render(r);
 assert.equal((html.match(/class="mc-label-page"/g)||[]).length,2);
 assert.equal((html.match(/class="mc-label-card"/g)||[]).length,12);
 assert.equal((html.match(/class="mc-label-empty"/g)||[]).length,8);
 assert.match(html,/1 de 5/);assert.match(html,/5 de 5/);
});
test('10/18/21 por A4, número exato de folhas e última folha alinhada',()=>{
 for(const size of ['10','18','21']){
  const count=Number(size)*2+1,batch=labels.plan([row('Crystal',0,count)],size);
  assert.equal(batch.per,Number(size));
  assert.equal(batch.total,count);assert.equal(batch.pages.length,3);
  assert.equal(batch.pages[2].emptyCells,Number(size)-1);
  assert.equal((labels.render(batch).match(/class="mc-label-empty"/g)||[]).length,Number(size)-1);
  assert.equal(batch.spec.cols*batch.spec.rows,Number(size));
 }
});
test('Mantém compatibilidade: nome ou modelo basta e linha vazia não cria etiqueta',()=>{
 const data=[{...row('Melina',2),name:''},{...row('',0,3),name:'Endereço fictício'},
  {...row('',0),name:''}];
 const batch=labels.plan(data,'10');
 assert.equal(batch.total,5);
 assert.equal(batch.modelCount,2);
 assert.match(labels.render(batch),/Melina/);
 assert.match(labels.render(batch),/Endereço fictício/);
});
test('Não aceita impressão malformada, data impossível, quantidades inválidas ou HTML injetado',()=>{
 for(const invalid of [
  [{...row('',2),name:''}], [{...row('Melina',0),pieceQty:-1}],
  [{...row('Melina',0),volumes:1000}],
  [{...row('Melina',0),copies:0}],
  [{...row('Melina',0),date:'2026-02-30'}],
  [row('Melina',0,999),row('Tammy',0,999),row('Crystal',0,10)],
 ]){
  assert.throws(()=>labels.plan(invalid,'10'));
 }
 assert.throws(()=>labels.plan([row('Melina',1)],'11'));
 const html=labels.render(labels.plan([row('<img src=x onerror=alert(1)>',1)],'10'));
 assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);
 assert.throws(()=>labels.render({...labels.plan([row('Melina',1)],'10'),stockWritten:true}),/validado/);
});
test('Gerador puro no HTML com conferência, múltiplas linhas e impressão no laboratório',()=>{
 assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(root,'modulos/etiquetas-a4-v1.js'),'utf8')));
 assert.doesNotThrow(()=>new vm.Script(ui));
 assert.match(page,/etiquetas-a4-v1\.js/);
 assert.match(ui,/function labelPanel\(/);
 assert.match(ui,/data-label-row/);
 assert.match(ui,/label-preview/);
 assert.match(ui,/label-print/);
 assert.match(page,/mc-label-batch/);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'modulos/etiquetas-a4-v1.js'),'utf8'),
 /\bfetch\s*\(|\bWebSocket\b|\bXMLHttpRequest\b|\bsupabase\b/i);
});
