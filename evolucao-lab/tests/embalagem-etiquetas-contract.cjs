'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const core=require('../operacao-integrada-core.js'),pack=require('../modulos/embalagem-etiquetas-v1.js');
const root=path.resolve(__dirname,'..');
function setup(){
 let state=core.initial(),n=0;
 const run=(type,payload)=>{const result=core.apply(state,{type,payload,
   commandId:'PACK-LAB-'+(++n),expectedRevision:state.revision,actor:'Conferência fictícia'});
  state=result.state;
  assert.equal(core.inspect(state).ok,true,'integridade após '+type);
  return result.result;};
 return {run,get s(){return state}};
}
function template(productId='PRO-0001',sku='SKU-001'){
 return {clientId:'CLI-0001',productId,sku,cnpj:'12.345.678/0001-95',
  productUrl:'https://example.com/peca',fileName:'Etiqueta Ficticia.pdf',
  fieldsNote:'Nome, SKU e tamanho'};
}
function assignment(packerId='FUN-0001'){
 return {packerId,clientId:'CLI-0001',productId:'PRO-0001',
  size:'G2',color:'Rubi',qty:50,labelQty:50,date:'2026-11-20',
  notes:'Teste parcial sem baixa real'};
}
test('Etiqueta padrão por cliente e específica por modelo sem atribuição ao cliente errado',()=>{
 const c=setup();
 c.run('label.template.add',template('','PADRAO'));
 c.run('label.template.add',template('PRO-0001','SKU-ESPECIFICO'));
 const spec=pack.activeTemplate(c.s,'CLI-0001','PRO-0001');
 assert.equal(spec.sku,'SKU-ESPECIFICO');
 assert.equal(pack.activeTemplate(c.s,'CLI-0001','PRO-0002').sku,'PADRAO');
 assert.equal(pack.activeTemplate(c.s,'CLI-0002','PRO-0001'),null);
 assert.throws(()=>core.apply(c.s,{type:'label.template.add',payload:template('PRO-0001'),
  commandId:'NO-DUP',expectedRevision:c.s.revision,actor:'QA'}),/Já existe/);
 c.run('label.template.archive',{id:'ETM-0002',reason:'Não usar mais esta versão'});
 assert.equal(pack.activeTemplate(c.s,'CLI-0001','PRO-0001').sku,'PADRAO');
 assert.equal(c.s.labelTemplatesLab[1].active,false);
 assert.equal(c.s.labelTemplatesLab[1].history.at(-1).type,'archived');
});
test('Atribuição parcial mantém 20 de 50, etiqueta original e histórico após editar modelo',()=>{
 const c=setup();
 c.run('label.template.add',template());
 c.run('packer.assign',assignment());
 c.run('packer.progress',{id:'EBA-0001',doneQty:20,reason:'Conferidas 20 peças',correction:false});
 const afterPartial=pack.dashboard(c.s);
 assert.equal(afterPartial.total,50);assert.equal(afterPartial.done,20);
 assert.equal(afterPartial.pending,30);assert.equal(afterPartial.partial,1);
 assert.equal(c.s.packerAssignmentsLab[0].status,'parcial');
 assert.equal(c.s.packerAssignmentsLab[0].labelSnapshot.version,1);
 assert.equal(c.s.packerAssignmentsLab[0].labelSnapshot.sku,'SKU-001');
 c.run('label.template.edit',{...template('PRO-0001','SKU-002'),id:'ETM-0001',reason:'Mudou referência da etiqueta'});
 assert.equal(c.s.packerAssignmentsLab[0].labelSnapshot.sku,'SKU-001');
 assert.equal(c.s.packerAssignmentsLab[0].labelSnapshot.version,1);
 c.run('packer.progress',{id:'EBA-0001',doneQty:50,reason:'Conferência final',correction:false});
 assert.equal(pack.dashboard(c.s).pending,0);
 assert.equal(c.s.packerAssignmentsLab[0].status,'concluido');
 assert.equal(c.s.packerAssignmentsLab[0].history.length,3);
 assert.equal(c.s.packerAssignmentsLab[0].labelSnapshot.sku,'SKU-001');
 assert.equal(c.s.stockLedger.length,0);
 assert.equal(c.s.settlements.length,0);assert.equal(c.s.finance.length,0);
 assert.equal(c.s.packagingLots?.length||0,0,'Nova fila não interfere na embalagem antiga');
});
test('Correção para menos requer aprovação explícita; duplicidades e valores acima do lote são rejeitados',()=>{
 const c=setup();
 c.run('packer.assign',assignment());
 const before=JSON.stringify(c.s);
 assert.throws(()=>core.apply(c.s,{type:'packer.assign',payload:assignment(),
  commandId:'DUP-ASSIGN',expectedRevision:c.s.revision,actor:'QA'}),/semelhante/);
 assert.equal(JSON.stringify(c.s),before);
 assert.throws(()=>core.apply(c.s,{type:'packer.progress',
  payload:{id:'EBA-0001',doneQty:51,reason:'Incorreto'},
  commandId:'OVER',expectedRevision:c.s.revision,actor:'QA'}),/inválido/);
 c.run('packer.progress',{id:'EBA-0001',doneQty:30,reason:'Primeira conferência'});
 assert.throws(()=>core.apply(c.s,{type:'packer.progress',
  payload:{id:'EBA-0001',doneQty:20,reason:'Troca de conferência'},
  commandId:'CORRECTION-BLOCKED',expectedRevision:c.s.revision,actor:'QA'}),/Correção/);
 c.run('packer.progress',{id:'EBA-0001',doneQty:20,reason:'Erro de contagem documentado',correction:true});
 assert.equal(c.s.packerAssignmentsLab[0].doneQty,20);
 assert.equal(c.s.packerAssignmentsLab[0].history.at(-1).type,'corrected');
 assert.throws(()=>core.apply(c.s,{type:'packer.cancel',
  payload:{id:'EBA-0001',reason:'Cancelamento tardio'},
  commandId:'CANCEL-BLOCKED',expectedRevision:c.s.revision,actor:'QA'}),/sem peças prontas/);
});
test('Reatribuição permite corrigir pessoa, etiqueta e quantidade sem perder o antes',()=>{
 const c=setup();
 c.run('label.template.add',template());
 c.run('packer.assign',assignment());
 c.run('packer.revise',{...assignment('FUN-0002'),id:'EBA-0001',qty:60,labelQty:60,
  reason:'Redistribuição para outra pessoa'});
 const row=c.s.packerAssignmentsLab[0];
 assert.equal(row.packerId,'FUN-0002');
 assert.equal(row.qty,60);assert.equal(row.labelQty,60);
 assert.equal(row.history[1].before.packerId,'FUN-0001');
 assert.equal(pack.dashboard(c.s).byPacker[0].name,'Bianca Modelo');
 c.run('packer.progress',{id:row.id,doneQty:40,reason:'Conferência de 40'});
 assert.throws(()=>core.apply(c.s,{type:'packer.revise',
  payload:{...assignment('FUN-0001'),id:row.id,qty:20,labelQty:20,reason:'Valor incorreto'},
  commandId:'BELOW-DONE',expectedRevision:c.s.revision,actor:'QA'}),/inferior/);
});
test('Tarefa parcialmente pronta não troca cliente/modelo/variação nem perde versão da etiqueta',()=>{
 const c=setup();
 c.run('label.template.add',template());
 c.run('packer.assign',assignment());
 c.run('packer.progress',{id:'EBA-0001',doneQty:20,reason:'Conferência parcial'});
 c.run('label.template.edit',{...template('PRO-0001','SKU-NOVO'),id:'ETM-0001',reason:'Nova impressão'});
 const invalid=[{...assignment(),id:'EBA-0001',productId:'PRO-0002',reason:'Mudar produto'},
  {...assignment(),id:'EBA-0001',clientId:'CLI-0002',reason:'Mudar cliente'},
  {...assignment(),id:'EBA-0001',size:'P',reason:'Mudar tamanho'},
  {...assignment(),id:'EBA-0001',color:'Preto',reason:'Mudar cor'}];
 for(const p of invalid)assert.throws(()=>core.apply(c.s,{type:'packer.revise',payload:p,
   commandId:'INVALID-MOVE-'+p.reason,expectedRevision:c.s.revision,actor:'QA'}),/Peças já concluídas/);
 assert.throws(()=>core.apply(c.s,{type:'label.template.edit',payload:{
   ...template('PRO-0002','SKU-MUDADO'),id:'ETM-0001',reason:'Troca indevida'},
   commandId:'TEMPLATE-IDENTITY',expectedRevision:c.s.revision,actor:'QA'}),/identidade da etiqueta/);
 c.run('packer.revise',{...assignment('FUN-0002'),id:'EBA-0001',
   qty:60,labelQty:60,reason:'Redistribuição de trabalho aberto'});
 const row=c.s.packerAssignmentsLab[0];
 assert.equal(row.packerId,'FUN-0002');
 assert.equal(row.labelSnapshot.version,1,'Revisar quantidade não deve trocar etiqueta');
 assert.equal(row.labelSnapshot.sku,'SKU-001');
 assert.equal(row.history.at(-1).labelBefore.version,1);
 assert.equal(core.inspect(c.s).ok,true);
});
test('Auditor rejeita alteração fora de comando, cliente trocado e etiqueta adulterada',()=>{
 const c=setup();c.run('label.template.add',template());c.run('packer.assign',assignment());
 for(const mutate of [
  x=>{x.packerAssignmentsLab[0].doneQty=999;},
  x=>{x.packerAssignmentsLab[0].packerId='FUN-0002';},
  x=>{x.packerAssignmentsLab[0].labelSnapshot.sku='TROCA INDEVIDA';},
  x=>{x.labelTemplatesLab[0].sku='ADULTERADA';}
 ]){
  const bad=JSON.parse(JSON.stringify(c.s));mutate(bad);
  assert.equal(core.inspect(bad).ok,false,'Falha deve ser visível ao Auditor');
 }
});
test('UI mostra fila, etiquetas personalizadas, histórico e isolamento dos módulos',()=>{
 const ui=fs.readFileSync(path.join(root,'operacao-integrada-ui.js'),'utf8'),
  page=fs.readFileSync(path.join(root,'operacao-integrada.html'),'utf8');
 assert.doesNotThrow(()=>new vm.Script(ui));
 assert.match(page,/embalagem-etiquetas-v1\.js/);
 assert.match(ui,/function packerAssignmentsPanel/);
 assert.match(ui,/function labelTemplatesPanel/);
 assert.match(ui,/case 'separacao':return packagingPanel\(s\)\+packerAssignmentsPanel\(s\)/);
 assert.match(ui,/label\.template\.add/);assert.match(ui,/label\.template\.edit/);
 assert.match(ui,/packer\.progress/);
 assert.match(ui,/data-packer-edit/);
 assert.match(ui,/Sem etiqueta vinculada/);
 const js=fs.readFileSync(path.join(root,'modulos/embalagem-etiquetas-v1.js'),'utf8');
 assert.doesNotThrow(()=>new vm.Script(js));
 for(const forbidden of [/\bfetch\s*\(/,/\bWebSocket\b/,/\bsupabase\.co\b/i,/\bXMLHttpRequest\b/])
  assert.equal(forbidden.test(js),false,'Sem rede na função fictícia');
});
