'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const cut=fs.readFileSync('release-cut-model-split.js','utf8');
const factions=fs.readFileSync('release-faction-operations-v9520.js','utf8');
const router=fs.readFileSync('app-stable3.html','utf8');
const iCut=router.indexOf("'release-cut-model-split.js'"),iAdjust=router.indexOf("'release-faction-safe-adjust-v9514.js'"),iOps=router.indexOf("'release-faction-operations-v9520.js'");
test('both PRs load in the canonical router in safe order',()=>{
 assert.ok(iCut>0&&iAdjust>iCut&&iOps>iAdjust,'cut split -> safe faction adjustment -> operations must load in order');
 assert.ok(!router.includes("'release-cut-model-split.js','release-cut-model-split.js'"));
 assert.ok(!router.includes("'release-faction-operations-v9520.js','release-faction-operations-v9520.js'"));
});
function mock(){
 let saves=0,modal=null,actualGrade=null,openId=null;
 const elements={};
 elements.cutTable={querySelectorAll:()=>[],insertAdjacentElement(_where,el){elements[el.id]=el}};
 elements.factionTable={querySelectorAll:()=>[],insertAdjacentElement(_where,el){elements[el.id]=el}};
 elements.hlgbFactionOpsSearch9520={value:'',addEventListener(){}};
 elements.hlgbFactionOpsRows9520={innerHTML:''};
 const document={
  readyState:'loading',getElementById:id=>elements[id]||null,
  addEventListener(){},querySelector(){return null},
  createElement(tag){return {tagName:tag.toUpperCase(),id:'',className:'',style:{},innerHTML:'',addEventListener(){},querySelector:()=>elements.hlgbFactionOpsSearch9520}}
 };
 const orders=[{id:100,client:'Cliente',grade:[{productId:10,color:'Chocolate',size:'P',qty:30},{productId:10,color:'Preto',size:'M',qty:20},{productId:11,color:'Branco',size:'G',qty:15}]}];
 const cuts=[
  {id:1,orderId:100,productId:10,product:'Cueca',status:'Finalizado',modelSplitChildV1:true,pieces:20,actualCutGrade:[{productId:10,color:'Preto',size:'M',qty:20},{productId:10,color:'Chocolate',size:'P',qty:0}],originalGrade:orders[0].grade.filter(x=>x.productId===10)},
  {id:2,orderId:100,productId:11,product:'Conjunto',status:'Planejado',modelSplitChildV1:true,pieces:15,originalGrade:orders[0].grade.filter(x=>x.productId===11)}];
 const db={orders,cuts,products:[{id:10,name:'Cueca',travetadas:2},{id:11,name:'Conjunto'}],cutters:[],factions:[{id:301,orderId:100,productId:10,productionId:55,name:'Graziano',op:'OP-1001',sent:20,done:20,returned:0,price:1.5,status:'Em produção'}],production:[]};
 const ctx={console,window:null,document,db,Date,Set,Map,JSON,Math,Number,String,Array,Object,Promise,
  addEventListener(){},setTimeout(){return 0},clearTimeout(){},localSaveOnly(){saves++},
  openModal(title,body){modal={title,body}},closeModal(){},alert(msg){throw Error('Unexpected alert '+msg)},
  renderCuts(){},renderFactions(){},navigator:{onLine:true},
  orderMaterialBreakdownByProduct(o){actualGrade=JSON.parse(JSON.stringify(o.grade));return [{productId:10,materials:{elastic:{name:'Elástico',unit:'m',qty:40,byColor:{Preto:40}}}}]},
  compositionTableForProduct:()=>'<div>Composição correta</div>',
  hlgbFactionAdjust9514:{open(id){openId=String(id)}},__HLGB_AUTH_READY:false
 };
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(cut,ctx);vm.runInContext(factions,ctx);
 return {ctx,db,elements,get modal(){return modal},get saves(){return saves},get actualGrade(){return actualGrade},get openId(){return openId}};
}
test('finished model is hidden but material preview uses actual grade; faction tools remain accessible',()=>{
 const t=mock();
 t.ctx.hlgbCutModelSplit.renderSplitPanel();
 t.ctx.hlgbFactionOperations9520.install();
 // The current faction UI intentionally loads results only after a typed search.
 t.elements.hlgbFactionOpsSearch9520.value='Cueca';
 t.ctx.hlgbFactionOperations9520.render();
 assert.match(t.elements.hlgbCutSplitPanel.innerHTML,/Conjunto/);
 assert.doesNotMatch(t.elements.hlgbCutSplitPanel.innerHTML,/<b>Cueca<\/b>/);
 assert.match(t.elements.hlgbFactionOpsRows9520.innerHTML,/Graziano/);
 assert.match(t.elements.hlgbFactionOpsRows9520.innerHTML,/Cueca/);
 assert.match(t.elements.hlgbFactionOpsRows9520.innerHTML,/Trocar facção/);
 assert.match(t.elements.hlgbFactionOpsRows9520.innerHTML,/Alterar preço/);
 assert.match(t.elements.hlgbFactionOpsRows9520.innerHTML,/Travetada/);
 t.ctx.hlgbFactionOperations9520.openTransfer(301);
 assert.equal(t.openId,'301');
 const output=t.ctx.hlgbPostCutMaterialsPreview9519(1);
 assert.equal(output.readOnly,true);
 assert.equal(output.pieces,20);
 assert.deepEqual(t.actualGrade.map(x=>x.color),['Preto']);
 assert.match(t.modal.body,/Elástico/);
 assert.doesNotMatch(t.modal.body,/Chocolate/);
 t.ctx.hlgbToggleCutCompleted9519();
 assert.match(t.elements.hlgbCutSplitPanel.innerHTML,/<b>Cueca<\/b>/);
 assert.equal(t.saves,0,'no database writes when merely rendering/previewing');
 assert.equal(t.db.cuts.length,2);
 assert.equal(t.db.factions[0].name,'Graziano');
});
test('no standalone component changes faction price or payment when opening traveta',()=>{
 const t=mock();
 t.ctx.hlgbFactionOperations9520.openTraveta(301);
 assert.match(t.modal.title,/Baixa operacional/);
 assert.match(t.modal.body,/não altera pagamento/);
 assert.equal(t.db.factions[0].price,1.5);
 assert.equal(t.saves,0);
});
