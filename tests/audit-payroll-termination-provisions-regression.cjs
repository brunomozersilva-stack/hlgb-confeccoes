const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync(path.join(__dirname,'..','release-payroll-termination-provisions.js'),'utf8');
function el(value=''){return {value,innerHTML:'',textContent:'',parentElement:null}}
const els={
  payrollProvisionStart:el('2026-01-01'),
  payrollProvisionEnd:el('2026-09-30'),
  payrollProvisionCompany:el(''),
  payrollProvisionEmployee:el(''),
  payrollProvisionPeriodLabel:el(),
  payrollProvisionCards:el(),
  payrollProvisionTable:el(),
  payrollProvisionAdvanceHistory:el()
};
const context={
  console,
  window:{},
  document:{getElementById:id=>els[id]||null},
  db:{
    config:{payrollExtraChargesPct:0},
    employees:[
      {id:1,name:'Ativa',active:true,hireDate:'2026-01-01',salary:1200,companyName:'A'},
      {id:2,name:'Arisergio Inacio Luiz',active:false,hireDate:'2026-07-07',salary:2000,companyName:'A',terminationId:200,terminationDate:'2026-08-28'},
      {id:3,name:'Vitoria Pinheiro de Assis',active:false,hireDate:'2025-07-09',salary:2090,companyName:'B',terminationId:300,terminationDate:'2026-09-17',provisionPaidHistory:[{id:'term13-300',type:'13º',value:1567.5,date:'2026-09-17'}]}
    ],
    formerEmployees:[],
    terminations:[
      {id:200,employeeId:2,date:'2026-08-28'},
      {id:300,employeeId:3,date:'2026-09-17',paid:true}
    ]
  },
  ensurePayrollData(){},
  fillPayrollProvisionFilters(){},
  provisionMonthKeys(start,end){
    const out=[];let [y,m]=start.slice(0,7).split('-').map(Number),[ey,em]=end.slice(0,7).split('-').map(Number);
    while(y<ey||(y===ey&&m<=em)){out.push(`${y}-${String(m).padStart(2,'0')}`);if(++m===13){m=1;y++}}
    return out;
  },
  employeeWorkedAtLeast15DaysInMonth(e,y,m){
    const start=`${y}-${String(m).padStart(2,'0')}-01`,end=`${y}-${String(m).padStart(2,'0')}-31`;
    if(e.hireDate&&e.hireDate>end)return false;
    if(e.terminationDate&&e.terminationDate<start)return false;
    return true;
  },
  salaryForEmployeeAtDate(e){return e.salary},
  employeeCompanyName:e=>e.companyName||'',
  fmtDate:s=>s,
  money:n=>`R$ ${Number(n).toFixed(2)}`,
  esc:s=>String(s),
  table:(headers,rows)=>JSON.stringify({headers,rows}),
  deleteProvisionAdvance9161(){}
};
context.window=context;
vm.createContext(context);
vm.runInContext(code,context);

let rows=context.renderPayrollProvisions();
const active=rows.find(r=>r.e.id===1),ari=rows.find(r=>r.e.id===2),vit=rows.find(r=>r.e.id===3);
assert(active.remaining>0,'funcionario ativo deve continuar provisionado');
assert.strictEqual(ari.remaining,0,'Ari deve zerar saldo apos rescisao');
assert(ari.settledByTermination>0,'Ari deve registrar baixa calculada por rescisao');
assert.strictEqual(vit.remaining,0,'Vitoria deve zerar saldo apos rescisao');
assert(vit.settledByTermination>=0,'Vitoria deve suportar 13o ja baixado sem saldo negativo');
assert(els.payrollProvisionCards.innerHTML.includes('Baixado em rescisões'),'cartao de baixa por rescisao deve aparecer');
assert(els.payrollProvisionTable.innerHTML.includes('Baixa por rescisão'),'coluna de baixa por rescisao deve aparecer');

els.payrollProvisionEnd.value='2026-08-01';
rows=context.renderPayrollProvisions();
assert(rows.find(r=>r.e.id===2).remaining>0,'antes da data de rescisao o historico nao pode ser zerado');

console.log('PASS audit-payroll-termination-provisions-regression');
