const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-assistant-invoice-fresh.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-assistant-invoice-fresh.js'"));
let baseCalls=0;
const input={value:'Preciso que faça uma nota pra cliente Bianca'};
const answer={innerHTML:'OLD',dataset:{}};
const context={console,setTimeout(fn){fn();return 0},setInterval(){return 1},window:{
 hlgbAssistantAsk(){baseCalls++},
 hlgbAssistantInvoice:{parseV3:()=>({kind:'invoice-empty',title:'Produtos não reconhecidos',text:'Informe produtos e quantidades.'})}
},document:{getElementById(id){return id==='hlgbAssistantInput'?input:id==='hlgbAssistantAnswer'?answer:null}},auditAction(){}};
vm.createContext(context);vm.runInContext(src,context);
context.window.hlgbAssistantAsk();
assert.equal(baseCalls,0,'invoice intent must not fall back to old assistant response');
assert(answer.innerHTML.includes('Produtos não reconhecidos'));
assert.equal(context.window.__hlgbAssistantInvoicePending,null);
assert.equal(context.window.HLGB_ASSISTANT_INVOICE_FRESH_GUARD,'2026.10.01-assistant-invoice-fresh-v1');
console.log('PASS fresh invoice: every request uses current input and never reuses old selections.');