const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-operational-polish-v2.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-operational-polish-v2.js'"));
const tomorrow=(()=>{const d=new Date();d.setDate(d.getDate()+1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})();
const context={console,setTimeout(){return 0},setInterval(){return 0},
 db:{sizes:['P','M','G','GG'],clients:[{id:'c1',name:'Click Sophia'}],products:[{id:'p1',name:'Camisola Liliane',price:12.9},{id:'p2',name:'Calcinha Liz',price:5}],orders:[{id:'o1',orderNumber:101,client:'Click Sophia',clientId:'c1',grade:[{productId:'p1',color:'Preto',size:'M',qty:50},{productId:'p1',color:'Preto',size:'G',qty:25}]}],cuts:[{id:'c1',orderId:'o1',productId:'p1',pieces:75,plannedCutDate:tomorrow,status:'Planejado'}],stock:[{id:1,item:'Camisola Liliane',cat:'Produto acabado',qty:10,unit:'un.',min:0}],materials:[],assets:[{id:1,name:'Máquina',qty:2,value:1000,status:'Em uso'}],factionMasters:[],factions:[],hubFinanceEntries:[]},
 window:{},document:{getElementById(){return null},querySelectorAll(){return []}},hlgbSortedSizes:()=>['P','M','G','GG'],money:v=>'R$ '+Number(v).toFixed(2),suggestedPrice:(cid,pid)=>pid==='p1'?12.9:5};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbOperationalPolish;assert(api);
const m=api.matrix(context.db.orders[0].grade);assert(m.includes('<th>M</th>'));assert(m.includes('<th>G</th>'));assert(m.includes('75'));
const cuts=api.cutsForRaw('quais cortes tem pra fazer amanhã');assert(cuts.text.includes('Camisola Liliane'));assert(cuts.text.includes('75 peças'));assert(cuts.text.includes('R$ 967.50'));assert(!cuts.text.includes('Preto'));assert(!cuts.text.includes('Tam M'));
const grade=api.gradeRequest('me manda a grade do pedido 101');assert(grade.text.includes('Gerar grade em PDF'));assert(!grade.text.includes('Preto'));
assert.equal(api.stockUnitValue(context.db.stock[0]),0,'finished stock without cost must not silently use sale price');
assert.equal(context.window.HLGB_OPERATIONAL_POLISH_GUARD,'2026.10.02-operational-polish-v2');
console.log('PASS operational polish v2: cutter-style matrix, concise cuts, grade PDF action and stock valuation guard.');
