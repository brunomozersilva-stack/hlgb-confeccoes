'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const core=require('../operacao-integrada-core.js'),sheet=require('../modulos/folha-corte-multimodelo-v1.js');
const base=path.resolve(__dirname,'..');
const ui=fs.readFileSync(path.join(base,'operacao-integrada-ui.js'),'utf8');
const page=fs.readFileSync(path.join(base,'operacao-integrada.html'),'utf8');
const sizes=['PP','M','G2','XG'];
function grade(p={}){return Object.fromEntries(sizes.map(k=>[k,p[k]||0]));}
function fixture(){
 let state=core.initial(),n=0;
 const run=(type,payload)=>{const v=core.apply(state,{type,payload,expectedRevision:state.revision,
  commandId:'SHEET-COMMAND-'+(++n),actor:'Teste de impressão fictício'});state=v.state;return v.result;};
 const orderId=run('order.multi.create',{clientId:'CLI-0001',sizes,items:[
  {productId:'PRO-0001',colors:[{color:'Preto',grade:grade({PP:3,M:2})},{color:'Rubi',grade:grade({G2:5})}]},
  {productId:'PRO-0002',colors:[{color:'Branco',grade:grade({XG:7})}]}
 ]});
 const planId=run('multi.cut.plan',{orderId,itemId:'ITM-001',
  lines:[{color:'Preto',size:'PP',qty:2},{color:'Rubi',size:'G2',qty:3}],
  scheduledDate:'2026-11-22',priority:'alta',cutterOne:'Cortador A',cutterTwo:'Cortador B',spreader:'Infestador C'});
 return {orderId,planId,run,get state(){return state;}};
}
test('Folha A4 completa: pedido multimodelo, modelo e total exatos, cinco blocos e três assinaturas',()=>{
 const c=fixture(),before=JSON.stringify(c.state),p=sheet.preview(c.state,c.planId),html=sheet.render(c.state,c.planId);
 assert.equal(p.totalPieces,5);assert.equal(p.sizes.includes('G2'),true);
 assert.equal(p.materials.length,1);assert.equal(p.materials[0].name,'Malha (g)');
 assert.equal(p.materials[0].plannedGrams,600,'5 x 120 g da ficha técnica fictícia');
 assert.equal(p.totalPlannedGrams,600);assert.equal(p.stockWritten,false);
 for(const x of ['1. Grade por cor e tamanho','2. Matérias-primas','3. Pesagem','4. Aproveitamento','5. Resumo',
  'Assinatura do Cortador 1','Assinatura do Cortador 2','Assinatura do Infestador',
  'Rubi','PP','G2','Camisola Melina','DOCUMENTO FICTÍCIO'])assert.ok(html.includes(x),x);
 assert.equal((html.match(/class="mc-sheet"/g)||[]).length,1);
 assert.doesNotMatch(html,/Calcinha Tammy/,'modelo do segundo item não deve aparecer na folha do primeiro');
 assert.doesNotMatch(html,/Assinatura digital validada/);
 assert.equal(JSON.stringify(c.state),before,'Impressão não pode modificar o documento');
});
test('Material técnico por combinação: PP, G2, previsão multimatéria e falha fechada',()=>{
 const c=fixture(),s=c.state;
 s.materialRecipeRules=[
  {id:'RCP-X',active:true,productId:'PRO-0001',materialId:'MAT-0001',color:'*',size:'PP',gramsPerUnit:90},
  {id:'RCP-Y',active:true,productId:'PRO-0001',materialId:'MAT-0002',color:'Rubi',size:'G2',gramsPerUnit:35}
 ];
 const p=sheet.preview(s,c.planId);
 assert.equal(p.materials.find(x=>x.id==='MAT-0001').plannedGrams,2*90+3*120);
 assert.equal(p.materials.find(x=>x.id==='MAT-0002').plannedGrams,3*35);
 const bad=JSON.parse(JSON.stringify(s));bad.materialRecipeRules[1].materialId='MAT-DOES-NOT-EXIST';
 assert.throws(()=>sheet.preview(bad,c.planId),/ausente/,'Material apagado deve bloquear impressão');
 const altered=JSON.parse(JSON.stringify(s));altered.multiCutPlans[0].qty=100;
 assert.throws(()=>sheet.render(altered,c.planId),/diverge/);
});
test('Pesagem posterior guarda trilha sem reabrir grade e sem movimentar contas ou estoques',()=>{
 const c=fixture(),id=c.planId;
 assert.throws(()=>core.apply(c.state,{type:'multi.cut.weight.record',expectedRevision:c.state.revision,
  payload:{id,totalGrams:1000,usedGrams:700,wasteGrams:200,checker:'C',reason:'Teste'},
  commandId:'EARLY-WEIGHT',actor:'CI'}),/depois de concluir/);
 c.run('multi.cut.complete',{id,checkerOne:'Fiscal 1',checkerTwo:'Fiscal 2'});
 const before=c.state.multiCutPlans.find(x=>x.id===id),grade=JSON.stringify(before.lines);
 const unchanged={ledger:JSON.stringify(c.state.stockLedger),finance:JSON.stringify(c.state.finance),stocks:JSON.stringify(c.state.materials)};
 c.run('multi.cut.weight.record',{id,totalGrams:1200,usedGrams:900,wasteGrams:100,
  checker:'Fiscal 1',reason:'Pesagem inicial'});
 c.run('multi.cut.weight.record',{id,totalGrams:1200,usedGrams:920,wasteGrams:90,
  checker:'Fiscal 2',reason:'Recontagem'});
 const cut=c.state.multiCutPlans.find(x=>x.id===id);
 assert.equal(cut.status,'concluido');assert.equal(JSON.stringify(cut.lines),grade);
 assert.equal(cut.weightEvents.length,2);
 assert.equal(cut.weightEvents[0].usedGrams,900);assert.equal(cut.weightEvents[1].usedGrams,920);
 assert.equal(JSON.stringify(c.state.stockLedger),unchanged.ledger);
 assert.equal(JSON.stringify(c.state.finance),unchanged.finance);
 assert.equal(JSON.stringify(c.state.materials),unchanged.stocks);
 assert.match(sheet.render(c.state,id),/0,920 kg/);
 assert.match(sheet.render(c.state,id),/2 registro/);
 const snapshot=JSON.stringify(c.state);
 for(const [totalGrams,usedGrams,wasteGrams] of [[1200,1100,200],[0,0,0],[1200,920,90]]){
  assert.throws(()=>core.apply(c.state,{type:'multi.cut.weight.record',expectedRevision:c.state.revision,
   payload:{id,totalGrams,usedGrams,wasteGrams,checker:'F',reason:'Teste'},
   commandId:'REJECT-WEIGHT-'+totalGrams+'-'+usedGrams,actor:'CI'}));
  assert.equal(JSON.stringify(c.state),snapshot);
 }
 const tampered=JSON.parse(JSON.stringify(c.state));tampered.multiCutPlans[0].weightEvents[0].usedGrams=9999;
 assert.equal(core.inspect(tampered).ok,false,'Auditor identifica peso adulterado');
});
test('Impressão HTML escapa nomes e está conectada à tela de Corte mobile sem rede',()=>{
 const c=fixture(),s=c.state;
 s.clients[0].name='<img src=x onerror=alert(1)>';
 const html=sheet.render(s,c.planId);
 assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
 assert.ok(!html.includes('<img'));
 assert.doesNotThrow(()=>new vm.Script(ui));
 assert.match(ui,/function renderMultiCutSheet\(/);
 assert.match(ui,/data-print-multi/);
 assert.match(ui,/multi\.cut\.weight\.record/);
 assert.match(page,/folha-corte-multimodelo-v1\.js/);
 assert.match(page,/mc-sheet/);
});
