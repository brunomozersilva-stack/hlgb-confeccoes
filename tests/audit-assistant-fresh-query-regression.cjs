const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-assistant-fresh-query.js'),'utf8');
const input={value:'qual pedido da Bianca'},out={innerHTML:'MESMA RESPOSTA',dataset:{}};
const store=new Map();
const window={
 db:{
  clients:[{name:'Bianca'},{name:'Gisele'}],products:[],cuts:[],production:[],
  orders:[
   {id:'o1',orderNumber:101,client:'Bianca',status:'Aguardando corte',grade:[]},
   {id:'o2',orderNumber:202,client:'Gisele',status:'Em produção',grade:[]}
  ]
 },
 hlgbAssistantAsk(){out.innerHTML='MESMA RESPOSTA'}
};
const context={console,window,
 setTimeout(fn){fn();return 0},setInterval(){return 1},
 sessionStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 document:{
  getElementById(id){return id==='hlgbAssistantInput'?input:id==='hlgbAssistantAnswer'?out:null},
  addEventListener(){}
 }
};
vm.createContext(context);vm.runInContext(src,context);
context.window.hlgbAssistantAsk();
assert(out.innerHTML.includes('Pedidos de Bianca'),'a pergunta atual deve usar o cliente Bianca');
input.value='qual pedido da Gisele';
context.window.hlgbAssistantAsk();
assert(out.innerHTML.includes('Pedidos de Gisele'),'a nova pergunta deve substituir o contexto visual anterior');
assert(!out.innerHTML.includes('Pedidos de Bianca'),'a resposta anterior não pode ser reutilizada');
assert.equal(context.window.HLGB_ASSISTANT_FRESH_QUERY_GUARD,'2026.10.05-assistant-precision-v2');
console.log('PASS Assistant precision v2: perguntas novas não reutilizam resposta visual anterior.');