'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('release-cutter-sheet-materials-v9523.js','utf8');
const router=fs.readFileSync('app-stable3.html','utf8');
const product1={id:1,name:'Short Doll Crystal',materials:[
 {name:'Romantic',unit:'kg',qty:6,loss:0,calcMode:'yield'},
 {name:'Renda 06',unit:'m',qty:.32,loss:0,calcMode:'consumption'},
 {name:'Laçarote G',unit:'un.',qty:2,loss:0,calcMode:'consumption'},
 {name:'Alça',unit:'un.',qty:1,loss:0,calcMode:'consumption'}
]};
const product2={id:2,name:'Short Doll Melanie',materials:[
 {name:'Romantic',unit:'kg',qty:8,calcMode:'yield'},
 {name:'Renda',unit:'kg',qty:.038,calcMode:'consumption'},
 {name:'Alça',unit:'un.',qty:1,calcMode:'consumption'},
 {name:'Laço',unit:'un.',qty:2,calcMode:'consumption'},
 {name:'Fita',unit:'m',qty:.4998,calcMode:'consumption'},
 {name:'Alpinia',unit:'m',qty:1,calcMode:'consumption'}
]};
function setup(){
 const db={products:[product1,product2,{id:3,name:'Modelo Sem Ficha'}],materials:[],
   orders:[{id:7,client:'Cliente <ABC>',grade:[{productId:1,color:'Preto',size:'P',qty:200}]}],
   cuts:[{id:8,orderId:7,productId:1,cutterId:9,plannedCutDate:'2026-11-10',
     originalGrade:[{productId:1,color:'Preto',size:'P',qty:192}]},
     {id:10,orderId:7,productId:2,originalGrade:[{productId:2,color:'Branco',size:'G',qty:172}]},
     {id:11,orderId:7,productId:3,originalGrade:[{productId:3,color:'Azul',size:'M',qty:12}]}],
   cutters:[{id:9,name:'Cortador Teste'}],factionPayments:[{id:45,paid:true}]};
 let writes=0,html='',legacy=0;
 const doc={getElementById(){return null},createElement(){throw Error('Unexpected DOM mutation')}};
 const ctx={db,document:doc,console,setTimeout(){return 0},alert(){},window:null,
   renderCuts(){},printCuttingSheet(){legacy++;return 'original'},
   open(){return {document:{open(){},write(v){html=v},close(){}},focus(){}}}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
 return {db,ctx,api:ctx.hlgbCutterSheetV9523,get writes(){return writes},get html(){return html},get legacy(){return legacy}};
}
test('router loads one optional module after cut grade adjustment; syntax valid',()=>{
 assert.equal((router.match(/release-cutter-sheet-materials-v9523\.js/g)||[]).length,1);
 assert.ok(router.indexOf("'release-cutter-sheet-materials-v9523.js'")>router.indexOf("'release-cut-model-grade-adjust.js'"));
 assert.doesNotThrow(()=>new vm.Script(source));
});
test('Crystal: updated grade 192 pieces, 32kg Romantic; not 200 pieces from original order',()=>{
 const s=setup(),c=s.db.cuts[0],g=s.api.gradeOf(s.db.orders[0],c);
 assert.equal(g.reduce((sum,x)=>sum+x.qty,0),192);
 const m=s.api.planMaterials(product1,192);
 assert.equal(m.length,4);assert.equal(m[0].calculated,32);
 assert.equal(m[1].calculated,61.44);assert.equal(m[2].calculated,384);
 const html=s.api.renderSheet(s.db.orders[0],c);
 assert.match(html,/32/);assert.doesNotMatch(html,/&lt;script/);
 assert.match(html,/Cliente &lt;ABC&gt;/);
});
test('Melanie: 172 pieces produce 21.5 kg Romantic and six raw materials',()=>{
 const s=setup(),m=s.api.planMaterials(product2,172);
 assert.equal(m.length,6);assert.equal(m[0].calculated,21.5);
 assert.ok(Math.abs(m[1].calculated-6.536)<1e-9);
 assert.ok(Math.abs(m[4].calculated-85.9656)<1e-8);
});
test('no technical sheet: material names, predicted weights and units remain blank',()=>{
 const s=setup(),html=s.api.renderSheet(s.db.orders[0],s.db.cuts[2]);
 assert.equal(s.api.planMaterials(s.db.products[2],12).length,0);
 assert.match(html,/Sem ficha técnica com materiais cadastrados/);
 assert.equal((html.match(/class="write"/g)||[]).length,18);
});
test('print is read-only, has weight / observation / signature fields and order-only print uses the new sheet',()=>{
 const s=setup(),before=JSON.stringify(s.db);
 assert.equal(s.ctx.printCuttingSheet(7,8),true);
 assert.match(s.html,/Folha de grade do cortador/i);
 assert.match(s.html,/Peso usado no corte/);
 assert.match(s.html,/Assinatura do cortador/i);
 assert.equal(s.ctx.printCuttingSheet(7),true);
 assert.match(s.html,/Folha de grade do cortador/i);
 assert.equal(s.legacy,0,'order-level printing must not fall back to the old sheet');
 assert.equal(JSON.stringify(s.db),before);
 assert.equal(s.db.factionPayments[0].paid,true);
});
test('finalized cut uses actual grade instead of planned grade',()=>{
 const s=setup(),c={...s.db.cuts[0],status:'Finalizado',actualCutGrade:[
  {productId:1,color:'Preto',size:'P',qty:100},
  {productId:1,color:'Azul',size:'M',qty:0}]};
 assert.equal(s.api.gradeOf(s.db.orders[0],c).reduce((sum,g)=>sum+g.qty,0),100);
 assert.equal(s.api.planMaterials(product1,100)[0].calculated,100/6);
});
