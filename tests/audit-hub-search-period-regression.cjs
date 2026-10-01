const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..');
const searchSrc=fs.readFileSync(path.join(root,'release-hub-search.js'),'utf8');
const periodSrc=fs.readFileSync(path.join(root,'release-hub-period-summary.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
assert(loader.includes("'release-hub-period-summary.js'"));
const context={console,setTimeout(){return 0},db:{hubFinanceEntries:[
{id:'1',flow:'Saída',date:'2026-10-05',category:'Matéria-prima',description:'Renda',value:100,status:'Realizado'},
{id:'2',flow:'Saída',date:'2026-10-20',category:'Funcionários',description:'Folha',value:200,status:'Previsto'},
{id:'3',flow:'Entrada',date:'2026-10-20',category:'Vendas',description:'Cliente',value:500,status:'Realizado'}
]},window:{renderHubFinance(){return true}},document:{getElementById(){return null}},money:v=>'R$ '+v,fmtDate:v=>v};
vm.createContext(context);vm.runInContext(searchSrc,context);vm.runInContext(periodSrc,context);
const filtered=context.window.hlgbHubSearchFilterRows(context.db.hubFinanceEntries,{query:'renda',start:'',end:'',flow:'',status:'',showAll:false});
assert.equal(filtered.length,1);
const api=context.window.hlgbHubPeriodSummary,range=api.monthRange('2026-10'),expenses=api.expenseRows(range),sum=api.summarize(expenses);
assert.equal(expenses.length,2,'monthly summary must include only expenses');
assert.equal(sum.total,300);assert.equal(sum.realized,100);assert.equal(sum.pending,200);assert.equal(sum.categories.length,2);
console.log('PASS Hub search/period: filtered search and monthly category summary.');