'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('release-weekly-material-planner-v9583.js','utf8');
const boot=fs.readFileSync('app-stable3.html','utf8');
assert(boot.includes("'release-weekly-material-planner-v9583.js'"),'plugin must be boot-loaded');
new vm.Script(src);
const materials=[
 {id:'m1',name:'Romantic',cat:'Tecido',unit:'kg',price:40,purchaseUnit:'rolo',purchaseMode:'kg',purchaseConversion:10,allowFractionalPurchase:true},
 {id:'m2',name:'Fita 005',cat:'Aviamento',unit:'m',price:.20,purchaseUnit:'rolo',purchaseMode:'rolo',purchaseConversion:100,purchasePrice:20,allowFractionalPurchase:false},
 {id:'m3',name:'Alça',cat:'Aviamento',unit:'un.',price:.5,purchaseUnit:'pacote',purchaseMode:'pacote',purchaseConversion:50,purchasePrice:25,allowFractionalPurchase:false},
 {id:'m4',name:'Sem valor',cat:'Aviamento',unit:'m',price:0}
];
const products=[
 {id:'p1',name:'Camisola',materials:[
  {materialId:'m1',name:'Romantic',unit:'kg',qty:20,calcMode:'yield',loss:10},
  {materialId:'m2',name:'Fita 005',unit:'m',qty:2,calcMode:'consumption',loss:0}]},
 {id:'p2',name:'Doll',materials:[
  {materialId:'m1',name:'Romantic',unit:'kg',qty:.1,calcMode:'consumption',loss:0},
  {materialId:'m2',name:'Fita 005',unit:'m',qty:2,calcMode:'consumption',loss:0},
  {materialId:'m3',name:'Alça',unit:'un.',qty:1,calcMode:'consumption',loss:0},
  {materialId:'m4',name:'Sem valor',unit:'m',qty:0,calcMode:'consumption',loss:0}]},
 {id:'p3',name:'Produto sem ficha',materials:[]}
];
const db={products,materials,stock:[
 {id:1,item:'Romantic',qty:2,unit:'kg'},
 {id:2,item:'Fita 005',qty:30,unit:'m'},
 {id:3,item:'Produto acabado',qty:200,unit:'un.'}],
 suppliers:[{id:'sup1',name:'Fornecedor Único',products:[{name:'Fita 005',unit:'m',price:.18}]}],
 purchases:[{id:'purchase-existing',total:5300}]};
const dbOriginal=JSON.stringify(db);
const storage=new Map();
const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
const window={addEventListener(){}};
const ctx={window,db,localStorage,document:{readyState:'loading',addEventListener(){}},Date,Math,JSON,Set,Map,
 console,setTimeout(){},Intl};
vm.createContext(ctx);vm.runInContext(src,ctx);
const api=window.hlgbWeeklyMaterialPlanner9583;
assert.equal(api.version,'95.83');
assert.equal(api.monday('2026-11-13'),'2026-11-09');
assert.equal(api.weekEnd('2026-11-09'),'2026-11-15');
const plan=api.calculate([{productId:'p1',pieces:100},{productId:'p2',pieces:40}]);
assert.equal(plan.models.length,2);assert.equal(plan.totalPieces,140);
assert.equal(plan.consolidated.length,3,'invalid qty is flagged, not silently counted');
const romantic=plan.consolidated.find(x=>x.name==='Romantic');
const fita=plan.consolidated.find(x=>x.name==='Fita 005');
const alca=plan.consolidated.find(x=>x.name==='Alça');
assert(Math.abs(romantic.needed-9.5)<.00001,'yield 100/20 + loss10% =5.5, plus 40*.1=4');
assert.equal(romantic.stock.amount,2);
assert.equal(romantic.missing,7.5);
assert.equal(romantic.purchase.unit,'kg','fractional purchase mode must honor base kg despite roll catalogue');
assert.equal(romantic.purchase.amount,7.5);
assert.equal(romantic.purchase.cost,300);
assert.equal(fita.needed,280);
assert.equal(fita.stock.amount,30);
assert.equal(fita.missing,250);
assert.equal(fita.purchase.unit,'rolo');
assert.equal(fita.purchase.amount,3,'3 whole rolls when conversion=100 and open deficit=250m');
assert.equal(fita.purchase.cost,60);
assert.equal(fita.supplier,'Fornecedor Único');
assert.equal(alca.needed,40);
assert.equal(alca.stock.known,false,'unlisted stock is unknown, not zero');
assert.equal(alca.stock.amount,null);
assert.equal(alca.purchase.amount,1);
assert.equal(alca.purchase.cost,25);
assert.equal(alca.estimatedOnly,true);
assert.equal(plan.totalKnown,385,'sum of 300 + 60 + 25');
assert.equal(plan.unknownCost,0,'invalid BOM line excluded but flagged');
assert(plan.hasUnknowns,'unknown stock and invalid BOM must prevent claiming final budget');
assert(plan.warnings.some(x=>/Ficha incompleta: Sem valor/i.test(x)),'invalid line must be reported by actual warning format');
assert.equal(plan.models[0].baseCostKnown,260);
assert.equal(plan.models[1].baseCostKnown,196);
assert.equal(plan.models[1].missingUnitPrices,0);
const stockRoll=api.stockFor({materialId:'roll',name:'Sanduíche',unit:'m',catalog:{purchaseUnit:'rolo',purchaseConversion:50}},
 [{item:'Sanduíche',qty:3,unit:'rolos'}]);
assert(stockRoll.known);assert.equal(stockRoll.amount,150,'matching stock in rolls must convert to meters');
const mismatched=api.stockFor({materialId:'x',name:'Fita',unit:'m',catalog:{}},[{item:'Fita',qty:2,unit:'kg'}]);
assert.equal(mismatched.known,false,'do not subtract incompatible units');
assert.equal(mismatched.amount,null);
const noConvert=api.buyTerms({unit:'m',catalog:{purchaseUnit:'rolo',allowFractionalPurchase:false,price:2}},120);
assert.equal(noConvert.amount,null);assert.equal(noConvert.cost,null,'unknown package conversion cannot invent rolls or prices');
const closedEvenIfModeBase=api.buyTerms({unit:'kg',catalog:{purchaseUnit:'rolo',purchaseMode:'kg',purchaseConversion:10,
 allowFractionalPurchase:false,price:40}},12);
assert.equal(closedEvenIfModeBase.amount,2,'closed rolls override base purchaseMode when fractional prohibited');
assert.equal(closedEvenIfModeBase.unit,'rolo');
assert.equal(closedEvenIfModeBase.cost,800);
const missingPrice=api.buyTerms({unit:'m',catalog:{purchaseUnit:'rolo',purchaseConversion:100}},150);
assert.equal(missingPrice.amount,2);
assert.equal(missingPrice.cost,null);
const noSheet=api.calculate([{productId:'p3',pieces:40}]);
assert.equal(noSheet.models.length,1);assert.equal(noSheet.consolidated.length,0);
assert(noSheet.warnings.some(x=>/sem ficha/i.test(x)));
const unknownPrice=api.calculate([{productId:'p2',pieces:40}],{
 products:[{id:'p2',name:'Doll',materials:[{name:'Sem preço',unit:'m',qty:1,calcMode:'consumption',price:0}]}],
 materials:[],stock:[],suppliers:[]});
assert.equal(unknownPrice.unknownCost,1);assert.equal(unknownPrice.totalKnown,0);
assert(unknownPrice.warnings.some(x=>/Sem preço válido/i.test(x)));
const csv=api.csvFor(plan,'comprar'),modelCsv=api.csvFor(plan,'modelos');
assert(csv.includes('Material')&&csv.includes('Romantic')&&csv.includes('Estoque'));
assert(modelCsv.includes('Camisola')&&modelCsv.includes('Custo bruto'));
assert(csv.startsWith('\ufeff'),'UTF-8 BOM for Excel');
const dangerous=api.calculate([{productId:'evil',pieces:1}],{
 products:[{id:'evil',name:'Teste',materials:[{name:'=HYPERLINK("x")',qty:1,unit:'un.',calcMode:'consumption',price:1}]}],
 materials:[],stock:[],suppliers:[]});
assert(api.csvFor(dangerous).includes("'=HYPERLINK"),'CSV formula injection must be neutralized');
assert.equal(JSON.stringify(db),dbOriginal,'planning must never modify products, stock or purchases');
const repeated=api.calculate([{productId:'p1',pieces:40},{productId:'p1',pieces:60}]);
assert.equal(repeated.models.length,1);assert.equal(repeated.totalPieces,100);
assert.match(src,/purchaseTable/,'planner installed inside purchases');
assert.match(src,/Material para comprar/);
assert.match(src,/Material para separar por modelo/);
console.log('PASS v95.83: multi-model yield/consumption/loss, validated stock, kg/roll/package conversion, cost, model detail, incomplete data, CSV and read-only');
