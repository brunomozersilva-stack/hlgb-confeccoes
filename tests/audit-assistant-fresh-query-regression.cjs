const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-assistant-fresh-query.js'),'utf8');
const input={value:'qual pedido da Bianca'},out={innerHTML:'MESMA RESPOSTA',dataset:{}};
const context={console,setTimeout(fn){fn();return 0},setInterval(){return 1},window:{
 hlgbAssistantAsk(){out.innerHTML='MESMA RESPOSTA'},
 hlgbAssistantSystemWide:{parse:raw=>({title:'Busca atual',text:'Bianca atual'})},
 hlgbAssistant:{query:raw=>({title:'Fallback',text:'resultado'})}
},document:{getElementById(id){return id==='hlgbAssistantInput'?input:id==='hlgbAssistantAnswer'?out:null}}};
vm.createContext(context);vm.runInContext(src,context);
context.window.hlgbAssistantAsk();assert(out.innerHTML.includes('Busca atual'));
input.value='qual pedido da Gisele';context.window.hlgbAssistantAsk();assert(out.innerHTML.includes('Busca atual'));
assert.equal(context.window.HLGB_ASSISTANT_FRESH_QUERY_GUARD,'2026.10.01-assistant-fresh-query-v1');
console.log('PASS Assistant fresh query: changed questions do not reuse stale answer HTML.');