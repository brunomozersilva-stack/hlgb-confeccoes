const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-assistant-invoice.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-assistant-invoice.js'"));
const context={console,setTimeout(fn){return 0},db:{
 clients:[{id:'c1',name:'Bianca'}],
 products:[
  {id:'p1',name:'Camisola Liliane'},
  {id:'p2',name:'Body Ritinha'},
  {id:'p3',name:'Calcinha Ariana'}
 ],
 orders:[{id:'o1',client:'Bianca'},{id:'o2',client:'Bianca'},{id:'o3',client:'Bianca'}],
 projectionInvoices:[]
},window:{hlgbAssistantAsk(){},open(){return null}},document:{getElementById(){return null},querySelectorAll(){return []}},
allProjectionRows:()=>[
 {order:{id:'o1',client:'Bianca'},item:{key:'p1',productId:'p1',name:'Camisola Liliane',qty:500,value:5000}},
 {order:{id:'o2',client:'Bianca'},item:{key:'p2',productId:'p2',name:'Body Ritinha',qty:400,value:4000}},
 {order:{id:'o3',client:'Bianca'},item:{key:'p3',productId:'p3',name:'Calcinha Ariana',qty:200,value:2000}}
],
projectionDeliverableQty:(o,i)=>i.qty,
projectionCurrentClient9237:()=> 'Bianca',
suggestedPrice:(cid,pid)=>({p1:12.5,p2:18,p3:5.5})[pid]||0,
money:v=>'R$ '+Number(v).toFixed(2),alert(){},hlgbAfterLogin:null};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbAssistantInvoice;assert(api);
const a=api.parse('Preciso que faça uma nota de 330 camisas Liliane pra cliente Bianca 264 Body Ritinha e de 93 calcinha ariana por favor');
assert.equal(a.kind,'invoice-action');
assert.equal(a.items.length,3);
const byName=Object.fromEntries(a.items.map(x=>[x.product,x]));
assert.equal(byName['Camisola Liliane'].qty,330,'speech plural/variation "camisas Liliane" must match Camisola Liliane');
assert.equal(byName['Body Ritinha'].qty,264);
assert.equal(byName['Calcinha Ariana'].qty,93);
assert.equal(byName['Camisola Liliane'].unit,12.5);
assert.equal(byName['Body Ritinha'].unit,18);
assert.equal(byName['Calcinha Ariana'].unit,5.5);
assert.equal(a.totalQty,687);
assert(Math.abs(a.total-(330*12.5+264*18+93*5.5))<0.001);
assert.equal(context.window.HLGB_ASSISTANT_INVOICE_GUARD,'2026.10.01-assistant-invoice-v2');
console.log('PASS Assistant invoice v2: natural voice wording maps Bianca + three products + client-specific prices correctly.');