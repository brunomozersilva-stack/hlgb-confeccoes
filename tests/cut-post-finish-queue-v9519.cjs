'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');
const source=fs.readFileSync('release-cut-model-split.js','utf8');
new vm.Script(source,{filename:'release-cut-model-split.js'});
function setup(bothDone=false){
 let saveCalls=0,preview=null,materialInput=null,compositionInput=null;
 let panel=null;
 const orders=[{id:100,client:'Cliente teste',grade:[
  {productId:10,color:'Chocolate',size:'P',qty:30},
  {productId:10,color:'Preto',size:'M',qty:20},
  {productId:11,color:'Branco',size:'G',qty:40}
 ]}];
 const cuts=[
  {id:1,orderId:100,productId:10,product:'Modelo A',status:'Finalizado',modelSplitChildV1:true,pieces:20,actualCutGrade:[{productId:10,color:'Preto',size:'M',qty:20},{productId:10,color:'Chocolate',size:'P',qty:0}],originalGrade:[{productId:10,color:'Chocolate',size:'P',qty:30},{productId:10,color:'Preto',size:'M',qty:20}]},
  {id:2,orderId:100,productId:11,product:'Modelo B',status:bothDone?'Finalizado':'Planejado',modelSplitChildV1:true,pieces:40,originalGrade:[{productId:11,color:'Branco',size:'G',qty:40}],actualCutGrade:[{productId:11,color:'Branco',size:'G',qty:40}]}
 ];
 const db={orders,cuts,products:[{id:10,name:'Modelo A',materials:[{name:'Elástico',qty:2,unit:'m'}]},{id:11,name:'Modelo B'}],cutters:[],production:[]};
 const root={querySelectorAll(){return []},insertAdjacentElement(_where,el){panel=el}};
 const document={getElementById(id){if(id==='cutTable')return root;if(id==='hlgbCutSplitPanel')return panel;return null},createElement(){return {id:'',className:'',style:{},innerHTML:''}},addEventListener(){},querySelector(){return null}};
 function orderMaterialBreakdownByProduct(o){
  materialInput=JSON.parse(JSON.stringify(o.grade));
  return [{productId:10,materials:{elastic:{name:'Elástico',unit:'m',qty:o.grade.filter(x=>x.productId===10).reduce((a,x)=>a+x.qty*2,0),byColor:Object.fromEntries(o.grade.filter(x=>x.productId===10&&x.qty>0).map(x=>[x.color,x.qty*2]))}}}];
 }
 const c={console,db,document,window:null,Date,Map,Set,JSON,Array,Object,String,Number,Math,Promise,
  orderMaterialBreakdownByProduct,compositionTableForProduct(o){compositionInput=JSON.parse(JSON.stringify(o.grade));return '<div>Composição teste</div>'},
  openModal(title,body){preview={title,body}},closeModal(){},setTimeout(){return 0},setInterval(){return 0},
  addEventListener(){},alert(){throw Error('Unexpected alert')},localSaveOnly(){saveCalls++},
  renderCuts(){},renderDailyCuts(){},renderProduction(){},renderOrders(){}
 };
 c.window=c;vm.createContext(c);vm.runInContext(source,c);
 return {c,db,get panel(){return panel},get preview(){return preview},get materialInput(){return materialInput},get compositionInput(){return compositionInput},get saveCalls(){return saveCalls}};
}
test('oculta modelo finalizado sem apagar registro e exibe apenas pendente',()=>{
 const t=setup();t.c.hlgbCutModelSplit.renderSplitPanel();
 assert.match(t.panel.innerHTML,/Modelo B/);
 assert.doesNotMatch(t.panel.innerHTML,/<b>Modelo A<\/b>/);
 assert.match(t.panel.innerHTML,/Mostrar 1 finalizado/);
 assert.equal(t.db.cuts.length,2);
 t.c.hlgbToggleCutCompleted9519();
 assert.match(t.panel.innerHTML,/<b>Modelo A<\/b>/);
 assert.match(t.panel.innerHTML,/Conferir materiais da grade cortada/);
 assert.match(t.panel.innerHTML,/Ver grade realmente cortada/);
 assert.equal(t.saveCalls,0,'rendering must not mutate records');
});
test('pedido totalmente cortado desaparece da fila e permanece recuperável',()=>{
 const t=setup(true);t.c.hlgbCutModelSplit.renderSplitPanel();
 assert.match(t.panel.innerHTML,/Nenhum modelo aguardando corte/);
 assert.doesNotMatch(t.panel.innerHTML,/<b>Modelo A<\/b>/);
 t.c.hlgbToggleCutCompleted9519();
 assert.match(t.panel.innerHTML,/<b>Modelo A<\/b>/);
 assert.match(t.panel.innerHTML,/<b>Modelo B<\/b>/);
 assert.equal(t.db.orders[0].grade[0].color,'Chocolate');
 assert.equal(t.db.cuts.length,2);
});
test('confere materiais somente pela grade cortada: chocolate zerado não gera material',()=>{
 const t=setup();const ret=t.c.hlgbPostCutMaterialsPreview9519(1);
 assert.equal(ret.readOnly,true);assert.equal(ret.pieces,20);
 assert.equal(t.materialInput.length,1);
 assert.equal(t.materialInput[0].color,'Preto');
 assert.equal(t.materialInput[0].qty,20);
 assert.equal(t.compositionInput[0].color,'Preto');
 assert.match(t.preview.body,/Elástico/);
 assert.match(t.preview.body,/40/);
 assert.doesNotMatch(t.preview.body,/Chocolate/);
 assert.equal(t.saveCalls,0);
 assert.equal(t.db.cuts[0].actualCutGrade[1].color,'Chocolate','preview must not change original cut record');
});
