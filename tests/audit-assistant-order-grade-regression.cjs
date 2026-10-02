const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..');
const imp=fs.readFileSync(path.join(root,'release-assistant-order-import.js'),'utf8');
const ord=fs.readFileSync(path.join(root,'release-assistant-orders.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
assert(loader.includes("'release-assistant-order-import.js'"));
const context={console,setTimeout(fn){if(typeof fn==='function')fn();return 0},
 db:{sizes:['P','M','G','GG'],colors:['Preto','Branco','Rubi'],clients:[{id:'c1',name:'Quesia'}],products:[{id:'p1',name:'Camisola Liliane'}],orders:[]},
 window:{hlgbAssistantAsk(){}},document:{getElementById(){return null},querySelector(){return null}},
 hlgbRecordCanWrite:()=>true,hlgbSortedSizes:()=>['P','M','G','GG']};
vm.createContext(context);vm.runInContext(imp,context);vm.runInContext(ord,context);
const api=context.window.hlgbAssistantOrders;assert(api);
const a=api.prepareCreate('quero um pedido novo da Quesia Camisola Liliane Preto 20P, 20M, 20G, 20GG');
assert.equal(a.kind,'order-create-action');assert.equal(a.clientId,'c1');assert.equal(a.productId,'p1');
assert.equal(a.qty,80);assert.equal(a.grade.length,4);
assert.deepEqual(Array.from(a.grade.map(x=>x.size)),['P','M','G','GG']);
assert(a.text.includes('Preto'));assert(a.text.includes('total 80'));
console.log('PASS Assistant order grade: typed/falado 20P 20M 20G 20GG becomes official order preview.');
