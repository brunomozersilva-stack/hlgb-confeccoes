'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-assistant-fresh-query.js'),'utf8');
const input={value:'qual pedido da Bianca'},out={innerHTML:'RESPOSTA ANTIGA',dataset:{}};
const store=new Map();
const db={
 clients:[{name:'Bianca'},{name:'Gisele'}],
 products:[{id:'p1',name:'Conjunto Gigi'},{id:'p2',name:'Calcinha Ariana'}],
 orders:[
  {id:'o1',orderNumber:101,client:'Bianca',status:'Em produção',grade:[{productId:'p1',qty:120}]},
  {id:'o2',orderNumber:202,client:'Gisele',status:'Aguardando corte',grade:[{productId:'p2',qty:80}]}
 ],cuts:[],production:[]
};
const context={
 console,
 setTimeout(){return 0},setInterval(){return 1},
 sessionStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 window:{db,hlgbAssistantAsk(){out.innerHTML='FALLBACK ANTIGO'}},
 document:{getElementById(id){return id==='hlgbAssistantInput'?input:id==='hlgbAssistantAnswer'?out:null},addEventListener(){}}
};
context.window.window=context.window;
vm.createContext(context);vm.runInContext(src,context);
context.window.hlgbAssistantAsk();
assert(out.innerHTML.includes('Pedidos de Bianca'),'primeira pergunta deve usar o cliente atual');
assert(out.innerHTML.includes('Pedido #101'),'primeira pergunta deve usar o pedido correto');
input.value='qual pedido da Gisele';
context.window.hlgbAssistantAsk();
assert(out.innerHTML.includes('Pedidos de Gisele'),'segunda pergunta deve recalcular o escopo');
assert(out.innerHTML.includes('Pedido #202'),'segunda pergunta deve usar o pedido atual');
assert(!out.innerHTML.includes('Pedidos de Bianca'),'resposta anterior não pode ser reaproveitada');
assert.equal(context.window.HLGB_ASSISTANT_FRESH_QUERY_GUARD,'2026.10.05-assistant-precision-v2');
assert.equal(context.window.hlgbAssistantPrecisionV2.version,'2026.10.05-assistant-precision-v2');
console.log('PASS Assistant precision: perguntas diferentes recalculam cliente e pedido sem reutilizar resposta antiga.');
