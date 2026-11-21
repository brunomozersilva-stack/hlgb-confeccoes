const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-assistant-intent-router-v2.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-assistant-intent-router-v2.js'"));
const iso=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const context={console,setTimeout(){return 0},setInterval(){return 0},
 db:{products:[
  {id:'p1',name:'Camisola Liliane',price:12.9},
  {id:'p2',name:'Camisola Marcia',price:10},
  {id:'p3',name:'Robe Luana',price:20}
 ],clients:[{id:'cl1',name:'Quesia'}],
 orders:[
  {id:'o1',orderNumber:60,client:'Quesia',clientId:'cl1',date:iso(8),status:'Corte',grade:[{productId:'p1',color:'Preto',size:'P',qty:20},{productId:'p1',color:'Preto',size:'M',qty:20}]},
  {id:'o2',orderNumber:61,client:'Bianca',clientId:'cl2',date:iso(12),status:'Corte',grade:[{productId:'p1',color:'Rubi',size:'P',qty:30}]}
 ],cuts:[
  {id:'c1',orderId:'o1',plannedCutDate:iso(0),status:'Planejado',description:'10 Camisola Marcia Preto Tam P | 30 Camisola Marcia Preto Tam M | 15 Robe Luana Preto Tam P | 30 Robe Luana Preto Tam M'}
 ]},
 window:{hlgbAssistantAsk(){}},document:{getElementById(){return null}},money:v=>'R$ '+Number(v).toFixed(2),suggestedPrice:(cid,pid)=>({p1:12.9,p2:10,p3:20})[pid]};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbAssistantIntentRouter;assert(api);
const d=api.direct('qual e a proxima data de entrega de camisola liliane');
assert(d&&d.title.includes('Camisola Liliane'));assert(d.text.includes('Quesia'));assert(d.text.includes('40 peças'));assert(!d.text.includes('Corte -'));
const cuts=api.direct('quais sao os cortes para hoje?');
assert(cuts.title.includes('hoje'));assert(cuts.text.includes('Camisola Marcia'));assert(cuts.text.includes('40 peças'));assert(cuts.text.includes('Robe Luana'));assert(cuts.text.includes('45 peças'));assert(!cuts.text.includes('Tam P'));assert(!cuts.text.includes('Preto'));
assert.equal(context.window.HLGB_ASSISTANT_INTENT_ROUTER_GUARD,'2026.10.02-assistant-intent-router-v2');
console.log('PASS intent router v2: next delivery is scoped and cuts are aggregated without grade noise.');
