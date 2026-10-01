const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-assistant-invoice.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-assistant-invoice.js'"));
const context={console,setTimeout(fn){return 0},db:{
 clients:[{id:'c1',name:'Gisele'}],
 products:[{id:'p1',name:'Camisola Romantic'},{id:'p2',name:'Calcinha Liz'}],
 orders:[{id:'o1',client:'Gisele'},{id:'o2',client:'Gisele'}]
},window:{hlgbAssistantAsk(){}},document:{getElementById(){return null},querySelectorAll(){return []}},allProjectionRows:()=>[
 {order:{id:'o1',client:'Gisele'},item:{key:'p1',productId:'p1',name:'Camisola Romantic',qty:100,value:1500}},
 {order:{id:'o2',client:'Gisele'},item:{key:'p2',productId:'p2',name:'Calcinha Liz',qty:50,value:200}}
],projectionDeliverableQty:(o,i)=>i.qty,projectionCurrentClient9237:()=> 'Gisele',suggestedPrice:(cid,pid)=>pid==='p1'?17:4.5,money:v=>'R$ '+v.toFixed(2),alert(){},hlgbAfterLogin:null};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbAssistantInvoice;assert(api);
const a=api.parse('fazer nota da Gisele 30 peças Camisola Romantic e 20 Calcinha Liz');
assert.equal(a.kind,'invoice-action');assert.equal(a.items.length,2);assert.equal(a.items[0].qty,30);assert.equal(a.items[1].qty,20);
assert.equal(a.items[0].unit,17);assert.equal(a.items[1].unit,4.5);
assert.equal(a.totalQty,50);assert(Math.abs(a.total-(30*17+20*4.5))<0.001);
assert.equal(context.window.HLGB_ASSISTANT_INVOICE_GUARD,'2026.10.01-assistant-invoice-v1');
console.log('PASS Assistant invoice: voice/text note uses client-specific official prices and selected quantities.');