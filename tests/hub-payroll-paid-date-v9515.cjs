/* node --test tests/hub-payroll-paid-date-v9515.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function load(){
 const context={window:{},db:{hubFinanceEntries:[],payroll:[]}};
 context.window.hlgb916HubWeekEntries=()=>[];
 context.window.hlgb9163SyncAllPayrollMonths=async()=>{throw Error('monthly legacy routine should be disabled')};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../release-hub-payroll-paid-date-v9515.js'),'utf8'),context);
 return context;
}
const old={id:'payroll-month-2026-11',sourceType:'payroll_month',sourceId:'2026-11',date:'2026-11-05',value:39637.93,status:'Realizado',category:'Funcionários',flow:'Saída'};
const paid=[
 {id:'1',month:'2026-11',paid:true,paidAt:'2026-11-05',paidValue:1876.24},
 {id:'2',month:'2026-11',paid:true,paidAt:'2026-11-06',paidValue:37761.69},
 {id:'3',month:'2026-11',paid:true,paidAt:'2026-11-09',paidValue:16324.43},
 {id:'4',month:'2026-11',paid:false,paidAt:'',paidValue:0},
];
function val(rows){return Math.round(rows.reduce((s,x)=>s+(Number(x.value)||0),0)*100)/100}
test('pagamento de 9/11 não muda valor pago entre 2 e 8/11',()=>{
 const c=load(),hub=[old,{id:88,date:'2026-11-06',flow:'Saída',value:100,category:'Transporte'}];
 c.db={hubFinanceEntries:hub,payroll:paid};
 const last=c.window.hlgb916HubWeekEntries({start:'2026-11-02',end:'2026-11-08'});
 const now=c.window.hlgb916HubWeekEntries({start:'2026-11-09',end:'2026-11-15'});
 assert.equal(val(last.filter(x=>x.category==='Funcionários')),39637.93);
 assert.equal(val(now.filter(x=>x.category==='Funcionários')),16324.43);
 assert.equal(val(last),39737.93);
 assert.equal(hub[0].value,39637.93); // no mutation
 assert.equal(hub.length,2);
 assert.equal(now.find(x=>x.sourceType==='payroll_paid_date_view').date,'2026-11-09');
});
test('sem pagamento em outra semana, não replica o consolidado',()=>{
 const c=load(),rows=c.window.hlgbHubPayrollPaidDate9515.rows([old],paid);
 assert.equal(rows.filter(x=>x.sourceType==='payroll_month').length,0);
 assert.equal(rows.filter(x=>x.sourceType==='payroll_paid_date_view').length,3);
 assert.equal(val(rows),55962.36);
});
test('sem data ou valor comprovado, preserva lançamento antigo e não inventa nova data',()=>{
 const c=load();
 for (const invalid of [{...paid[0],paidAt:''},{...paid[0],paidValue:null},{...paid[0],id:''}]){
  const r=c.window.hlgbHubPayrollPaidDate9515.rows([old],[invalid]);
  assert.equal(r.length,1);
  assert.equal(r[0].id,old.id);
 }
});
test('marcar como pago não grava no banco nem executa sincronização mensal antiga',async()=>{
 const c=load();
 let result=await c.window.hlgb9163SyncAllPayrollMonths();
 assert.equal(result.skipped,true);
 assert.equal(c.window.hlgbHubPayrollPaidDate9515.status().automaticMonthlyResyncDisabled,true);
});
test('pagamento de mês anterior feito hoje segue a data real',()=>{
 const c=load(),r=c.window.hlgbHubPayrollPaidDate9515.rows([],[
  {id:'out',month:'2026-10',paid:true,paidAt:'2026-11-09',paidValue:500}
 ]);
 assert.equal(r.length,1);
 assert.equal(r[0].date,'2026-11-09');
 assert.equal(r[0].sourceId,'2026-10');
});
