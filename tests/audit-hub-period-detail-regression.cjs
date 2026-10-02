const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-hub-period-summary.js'),'utf8');
const context={console,setTimeout(){return 0},db:{hubFinanceEntries:[
 {date:'2026-09-10',flow:'Saída',status:'Realizado',category:'Gasto pessoal',person:'Criancas',description:'Bolo',value:500},
 {date:'2026-09-11',flow:'Saída',status:'Realizado',category:'Gasto pessoal',person:'Todos',description:'Mercado',value:300},
 {date:'2026-09-12',flow:'Saída',status:'Previsto',category:'Matéria-prima',description:'Renda X',value:200},
 {date:'2026-09-12',flow:'Entrada',status:'Realizado',category:'Vendas',description:'Bianca',value:1500}
]},window:{},document:{getElementById(){return null}},money:v=>'R$ '+Number(v).toFixed(2),hlgbAfterLogin:null};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbHubPeriodSummary;assert(api);
const range=api.monthRange('2026-09'),exp=api.expenseRows(range),sum=api.summarize(exp),cash=api.cashSummary(range);
assert.equal(sum.total,1000);assert.equal(cash.inReal,1500);assert.equal(cash.outReal,800);assert.equal(cash.realized,700);
const dg=api.detailGroups(exp,'Gasto pessoal');assert.equal(dg[0].label,'Criancas');assert.equal(dg[0].total,500);
assert.equal(context.window.HLGB_HUB_PERIOD_SUMMARY_GUARD,'2026.10.01-hub-period-summary-v2');
console.log('PASS hub detail: category drilldown and profit/deficit math work.');