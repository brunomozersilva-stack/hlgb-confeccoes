const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const src=fs.readFileSync('release-faction-traveta-payment-v9424.js','utf8');
const document={
  readyState:'complete',
  getElementById(){return null},
  querySelector(){return null},
  addEventListener(){},
  createElement(){return {style:{},dataset:{},addEventListener(){},querySelector(){return null}}}
};
const context={console,Date,Intl,document,db:{factions:[],materialChecklists:[]},alert(){},setTimeout(){return 0},clearTimeout(){}};
context.window=context;
vm.runInNewContext(src,context,{filename:'release-faction-traveta-payment-v9424.js'});
const api=context.hlgbFactionTraveta9424;
assert(api,'API v94.24 não foi exportada');

let x=api.validatePricing('10.00','sim','0.50');
assert.strictEqual(x.ok,true);assert.strictEqual(x.finalUnit,10);assert.strictEqual(x.deduction,0);
x=api.validatePricing('10.00','nao','0.50');
assert.strictEqual(x.ok,true);assert.strictEqual(x.finalUnit,9.5);assert.strictEqual(x.deduction,0.5);
assert.strictEqual(api.validatePricing('10','','0.50').code,'decision');
assert.strictEqual(api.validatePricing('10','nao','-0.50').code,'deduction');
assert.strictEqual(api.validatePricing('10','nao','10.01').code,'deduction_gt_base');

context.db.factions=[{id:1,name:'Facção A',productId:2,sent:100,price:9.5}];
let p=api.pricingForChecklist({id:20,factionId:1,productId:2,qty:100});
assert.strictEqual(p.final,9.5);assert.strictEqual(p.base,9.5);assert.strictEqual(p.doesTraveta,null);assert.strictEqual(p.total,950);

context.db.factions=[{id:2,name:'Facção B',productId:3,sent:100,price:9.5,payableUnitPrice:9.75,baseUnitPrice:10,doesTraveta:false,travetaDeductionUnit:0.5}];
p=api.pricingForChecklist({id:21,factionId:2,productId:3,qty:100});
assert.strictEqual(p.base,10);assert.strictEqual(p.final,9.5,'faction.price precisa ser a autoridade do pagamento');assert.strictEqual(p.deduction,0.5);assert.strictEqual(p.doesTraveta,false);assert.strictEqual(p.total,950);
const html=api.payHtml({id:21,factionId:2,productId:3,qty:100},false);
for(const label of ['Valor base/peça','Travetada:','Desconto travetada/peça','Valor final/peça','Quantidade:','Total a receber:'])assert(html.includes(label),label+' ausente do checklist');

context.db.products=[{id:3,name:'Tanga Katerine',travetadas:3}];
context.db.factionMasters=[{id:50,name:'Roseli',doesTraveta:false,travetaDeductionUnit:0.08}];
context.hlgbFactionRates9577={traveta:master=>master?.travetaDeductionUnit??.08};
const points=api.deductionForModelV9592({productId:3,factionMasterId:50},context.db.factionMasters[0]);
assert.strictEqual(points.points,3);
assert.strictEqual(points.rate,.08);
assert.strictEqual(points.unit,.24,'3 travetadas por peça × R$ 0,08 = R$ 0,24 de desconto');
assert.equal(api.deductionForModelV9592({productId:999},context.db.factionMasters[0]),null,
 'unknown model cannot silently invent a traveta count');

const master=context.db.factionMasters[0];
for(const bad of [undefined,null,'',false,true,' ',1.5,-1,101]){
 context.db.products=[{id:3,name:'Teste',travetadas:bad}];
 assert.equal(api.deductionForModelV9592({productId:3},master),null,'invalid points '+String(bad));
}
context.db.products=[{id:3,name:'Sem travetada',travetadas:0}];
assert.equal(api.deductionForModelV9592({productId:3},master).unit,0);
context.hlgbFactionRates9577={traveta:()=>null};
assert.equal(api.deductionForModelV9592({productId:3},master).unit,0);
context.db.products=[{id:3,travetadas:3}];
assert.equal(api.deductionForModelV9592({productId:3},master),null);
assert.equal(api.newDiscount9818(null,false,'0.08').code,'missing-sheet');
assert.equal(api.newDiscount9818(null,true,'0').unit,0);
assert.equal(api.newDiscount9818(null,true,'').code,'deduction');
assert.equal(api.newDiscount9818(null,true,'0.123').code,'deduction');
assert.equal(api.newDiscount9818({unit:.24},false,'0.08').unit,.24);
assert.equal(api.newDiscount9818({unit:0},false,'0.08').unit,0);
assert.equal(api.newDiscount9818({unit:.24},true,'0.20').origin,'manual');
context.db.products=[{id:3,travetadas:0},{id:3,travetadas:3}];
assert.equal(api.deductionForModelV9592({productId:3},master),null);
assert(src.includes('f.price=valid.finalUnit'),'valor final precisa alimentar faction.price');
assert(src.includes("storedBase!=null&&state.mode==='edit'"),'edição precisa restaurar valor base e evitar desconto duplo');
assert(!src.includes('new MutationObserver'),'v94.24 não pode usar observer amplo/recursivo');
assert(src.includes('__hlgb9424Traveta'),'wrapper de salvamento precisa ser idempotente');
assert(src.includes('hlgb9423ChecklistValue'),'painel antigo v94.23 precisa ser removido para não duplicar valores');
console.log('audit-faction-traveta-payment-v9424: ok');
