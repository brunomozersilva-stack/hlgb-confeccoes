const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-assistant-system-wide.js'),'utf8');
const context={console,setTimeout(){return 0},setInterval(){return 0},db:{
 clients:[{id:'c1',name:'Kesy'}],products:[{id:'p1',name:'Camisola Liliane'},{id:'p2',name:'Camisola Trancada'}],
 orders:[{id:'o1',orderNumber:56,client:'Kesy',status:'Aguardando corte',grade:[{productId:'p1',color:'Preto',size:'P',qty:30},{productId:'p1',color:'Preto',size:'M',qty:60},{productId:'p1',color:'Preto',size:'G',qty:60},{productId:'p1',color:'Preto',size:'GG',qty:30}]}],
 cutters:[{id:'ct1',name:'João',type:'Interno'}],cuts:[{id:'c1',status:'Planejado',cutterId:'ct1',pieces:180,plannedCutDate:new Date().toISOString().slice(0,10)}],
 suppliers:[],purchases:[]
},window:{hlgbAssistantAsk(){}},document:{getElementById(){return null}},money:v=>'R$ '+Number(v).toFixed(2),hlgbSortedSizes:()=>['P','M','G','GG']};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbAssistantSystemWide;assert(api);
const g=api.parse('qual a grade da Camisola Liliane da Kesy');assert(g.title.includes('Camisola Liliane'));assert(g.text.includes('Pedido #56'));assert(g.text.includes('<th>P</th>'));assert(!g.text.includes('Camisola Trancada'));
const miss=api.parse('qual a grade da Camisola Trancada da Kesy');assert(miss.text.includes('Não encontrei'));
const wp=api.parse('quanto os cortadores internos tem que cortar essa semana');assert(wp.title.includes('Cortes programados'));assert(wp.text.includes('João'));assert(!wp.text.includes('Pedido #56'));
console.log('PASS Assistant precision: grade and weekly cutter questions use dedicated scoped answers.');