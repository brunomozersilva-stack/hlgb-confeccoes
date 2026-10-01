const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-assistant-invoice-v3.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-assistant-invoice-v3.js'"));
const context={console,setTimeout(){return 0},db:{clients:[{id:'c1',name:'Bianca'}],products:[{id:'p1',name:'Camisola Liliane'},{id:'p2',name:'Body Ritinha'},{id:'p3',name:'Calcinha Ariana'}]},window:{hlgbAssistantAsk(){},hlgbAssistantInvoice:{}},document:{getElementById(){return null}},allProjectionRows:()=>[
{order:{id:'o1',client:'Bianca'},item:{key:'a',productId:'p1',name:'Camisola Liliane',qty:200,value:2580}},
{order:{id:'o2',client:'Bianca'},item:{key:'b',productId:'p1',name:'Camisola Liliane',qty:340,value:4386}},
{order:{id:'o3',client:'Bianca'},item:{key:'c',productId:'p2',name:'Body Ritinha',qty:432,value:6436.8}},
{order:{id:'o4',client:'Bianca'},item:{key:'d',productId:'p2',name:'Body Ritinha',qty:270,value:4023}},
{order:{id:'o5',client:'Bianca'},item:{key:'e',productId:'p3',name:'Calcinha Ariana',qty:120,value:660}}
],projectionDeliverableQty:(o,i)=>i.qty,projectionCurrentClient9237:()=> 'Bianca',suggestedPrice:(cid,pid)=>({p1:12.9,p2:14.9,p3:5.5})[pid],money:v=>'R$ '+Number(v).toFixed(2),hlgbAfterLogin:null};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbAssistantInvoice;
const a=api.parseV3('Preciso que faça uma nota pro cliente Bianca de 330 camisas Liliane 264 Body Ritinha e 93 calcinha ariana');
assert.equal(a.kind,'invoice-action');assert.equal(a.summary.length,3);
const s=Object.fromEntries(a.summary.map(x=>[x.product,x]));
assert.equal(s['Camisola Liliane'].allocated,330);assert.equal(s['Body Ritinha'].allocated,264);assert.equal(s['Calcinha Ariana'].allocated,93);
assert.equal(a.totalQty,687);assert.equal(a.items.filter(x=>x.product==='Camisola Liliane').reduce((n,x)=>n+x.qty,0),330);
assert.equal(context.window.HLGB_ASSISTANT_INVOICE_V3_GUARD,'2026.10.01-assistant-invoice-v3');
console.log('PASS invoice v3: products are not duplicated and spoken requested qty is allocated once across balances.');