'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),legacy=path.resolve(root,'..');
const audit=JSON.parse(fs.readFileSync(path.join(root,'auditoria-paridade-critica-v3.json'),'utf8'));
const source=fs.readFileSync(path.join(root,'operacao-integrada-core.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'operacao-integrada-ui.js'),'utf8');
test('porta de preservação não permite declarar sistema novo aprovado sem paridade',()=>{
 assert.equal(audit.approvedForProduction,false);
 assert.equal(audit.preliminary76Approved,0);
 assert.equal(audit.items.length,19);
 assert.equal(new Set(audit.items.map(x=>x.id)).size,19);
 assert.equal(audit.items.filter(x=>x.status==='gap_confirmado').length,14);
 assert.equal(audit.items.filter(x=>x.status==='parcial_nao_homologado').length,2);
 assert.equal(audit.items.filter(x=>x.status==='nao_verificado').length,3);
 for(const item of audit.items){
  assert.equal(item.approved,false,item.name+' não possui prova completa');
  for(const required of ['paridade_visual','paridade_comportamental','integridade_dados','webkit_chromium_mobile','rollback','aceite_explicito'])
   assert.ok(item.requires.includes(required),item.id+' requer '+required);
 }
});
test('fontes antigas permanecem na main como referência e novo não é equivalente',()=>{
 for(const file of ['release-operations-pack.js','release-cutter-sheet-materials-v9523.js','release-cut-model-grade-adjust.js','release-cutter-planner.js','release-cut-weight-v9579.js','release-cut-material-usage.js'])
 assert.ok(fs.existsSync(path.join(legacy,file)),file+' deve seguir no inventário');
 assert.match(source,/const clone=x=>JSON\.parse\(JSON\.stringify\(x\)\),sizes=\['P','M','G','GG'\]/);
 assert.match(source,/function createOrder\(s,p\)\{/);
 assert.match(source,/productId:product\.id,grade:clone\(g\)/);
 assert.match(ui,/case 'pedidos':return importOrdersPanel\(s\)\+panel\('Grade por cor e tamanho no próprio Pedido'/);
 assert.match(ui,/form\('order.add','Novo pedido fictício'/,'Modo antigo sem cor deve continuar disponível');
 assert.match(ui,/function colorMatrixCreateForm\(/,'Matriz por cor/tamanho retornou a Pedidos no laboratório');
 assert.match(ui,/function orderColorGradePanel\(/,'Correção de cores está em Pedidos');
 assert.match(ui,/case 'faccoes':/);
 assert.ok(ui.includes("form('order.color.grade.set'"),'Rotina anterior de cor deve continuar em Facções');
 assert.ok(!ui.includes("case 'utilidades':"),'Utilidades não foi integrada');
 assert.ok(!source.includes("case 'route.create'"),'Rotas não estão no núcleo');
 assert.match(fs.readFileSync(path.join(legacy,'release-operations-pack.js'),'utf8'),/function renderUtilities\(/);
 assert.match(fs.readFileSync(path.join(legacy,'release-cutter-sheet-materials-v9523.js'),'utf8'),/function renderOrderSheets\(/);
});
