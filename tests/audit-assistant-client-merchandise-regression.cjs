const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-assistant-system-wide.js'),'utf8');
const context={console,setTimeout(){return 0},setInterval(){return 0},db:{
 clients:[{id:'c1',name:'Quesia'},{id:'c2',name:'Click Sophia'}],
 products:[{id:'p1',name:'Camisola Liliane'},{id:'p2',name:'Body Ritinha'}],
 orders:[
  {id:'o1',orderNumber:56,client:'Quesia',status:'Aberto',grade:[{productId:'p1',color:'Preto',size:'P',qty:100},{productId:'p1',color:'Preto',size:'M',qty:200}]},
  {id:'o2',orderNumber:92,client:'Click Sophia',status:'Aberto',grade:[{productId:'p2',color:'Rubi',size:'M',qty:500}]}
 ],
 purchases:[{id:'b1',supplierName:'Rafael',total:8385.30}],suppliers:[{id:'s1',name:'Rafael',products:[{name:'Romantic',price:29.9}]}]
},window:{hlgbAssistantAsk(){}},document:{getElementById(){return null}},money:v=>'R$ '+Number(v).toFixed(2),hlgbSortedSizes:()=>['P','M','G','GG']};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbAssistantSystemWide;assert(api);
const a=api.parse('qual mercadoria tinha pedido para Quesia');
assert(a.title.includes('Quesia'));assert(a.text.includes('Camisola Liliane'));assert(a.text.includes('300 peças'));
assert(!a.text.includes('Click Sophia'));assert(!a.text.includes('Rafael'));assert(!a.text.includes('Romantic'));
assert.equal(context.window.HLGB_ASSISTANT_SYSTEM_WIDE_GUARD,'2026.10.01-assistant-system-wide-v4');
console.log('PASS client merchandise query: answer is scoped to that client orders only.');