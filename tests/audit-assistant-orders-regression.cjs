const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-assistant-orders.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-assistant-orders.js'"));
let openedNew=0,openedEdit=null;
const context={
 console,setTimeout(fn){if(typeof fn==='function')fn();return 0},
 db:{clients:[{id:'c1',name:'Gisele'}],products:[{id:'p1',name:'Camisola Romantic'}],orders:[{id:'o1',orderNumber:87,client:'Gisele',clientId:'c1',date:'2026-10-10',priority:'Padrão'}]},
 window:{hlgbAssistantAsk(){},newOrder(){openedNew++},editOrder(id){openedEdit=id}},
 document:{getElementById(){return null},querySelector(){return null}},
 hlgbRecordCanWrite:()=>true,
 displayOrderNumber:o=>o.orderNumber
};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbAssistantOrders;
assert(api,'assistant order API must load');
let a=api.parse('criar pedido para Gisele 120 peças Camisola Romantic urgente entrega 15/10/2026');
assert.equal(a.kind,'order-create-action');
assert.equal(a.clientId,'c1');assert.equal(a.productId,'p1');assert.equal(a.qty,120);assert.equal(a.priority,'Urgente');assert.equal(a.date,'2026-10-15');
api.openCreate(a);assert.equal(openedNew,1,'must delegate creation to official newOrder form');
a=api.parse('editar pedido 87 para urgente');
assert.equal(a.kind,'order-edit-action');assert.equal(a.orderId,'o1');assert.equal(a.priority,'Urgente');
api.openEdit(a);assert.equal(openedEdit,'o1','must delegate edit to official editor');
context.hlgbRecordCanWrite=()=>false;
const denied=api.prepareCreate('criar pedido');assert.equal(denied.kind,'order-permission');
console.log('PASS Assistant orders: create/edit intents respect permission and open official forms only.');