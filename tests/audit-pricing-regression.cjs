const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname,'..','release-pricing.js'),'utf8');
const context={
 console,setTimeout:()=>{},alert:()=>{},getComputedStyle:()=>({display:'block'}),
 document:{querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{},createElement:()=>({className:'',textContent:''})},
 db:{
  factions:[
   {id:'f-grade',orderId:'o-grade',productId:'p1'},
   {id:'f-client',orderId:'o-client',productId:'p2'},
   {id:'f-product-client',orderId:'o-product-client',productId:'p3'},
   {id:'f-default',orderId:'o-default',productId:'p4'},
   {id:'f-zero',orderId:'o-zero',productId:'p5'}
  ],
  orders:[
   {id:'o-grade',clientId:'c1',grade:[{productId:'p1',qty:2,unitPrice:10},{productId:'p1',qty:3,unitPrice:20},{productId:'other',qty:99,unitPrice:24.9}]},
   {id:'o-client',clientId:'c1',grade:[{productId:'other',qty:1,unitPrice:99}]},
   {id:'o-product-client',clientId:'c2',grade:[]},
   {id:'o-default',clientId:'c3',grade:[]},
   {id:'o-zero',clientId:'c4',grade:[{productId:'other',qty:1,unitPrice:24.9}]}
  ],
  clients:[{id:'c1',prices:{p2:15.5}},{id:'c2',prices:{}},{id:'c3',prices:{}},{id:'c4',prices:{}}],
  products:[
   {id:'p1',price:50},
   {id:'p2',price:60},
   {id:'p3',price:70,clientPrices:{c2:17.5}},
   {id:'p4',price:4.1},
   {id:'p5',price:0}
  ]
 },
 window:{}
};
context.window.db=context.db;
vm.createContext(context);vm.runInContext(src,context);
const p=context.window.hlgbFactionPriceFor;
assert.equal(typeof p,'function','price helper must be exported for regression');
assert.equal(p(context.db.factions[0]),16,'exact product rows in order grade must win and use weighted unit price');
assert.equal(p(context.db.factions[1]),15.5,'client product price must be fallback when exact grade price is absent');
assert.equal(p(context.db.factions[2]),17.5,'product clientPrices must be next fallback');
assert.equal(p(context.db.factions[3]),4.1,'product default must be last positive fallback');
assert.equal(p(context.db.factions[4]),0,'zero-priced exact product must remain zero and never borrow another product price');
assert.equal(context.window.HLGB_PRICING_MODULE,'exact-faction-v2');
console.log('PASS pricing: exact product price priority preserved; zero-price product cannot borrow another product price.');
