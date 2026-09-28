/* HLGB v92.47: baixa de provisoes quando a rescisao ja encerrou o vinculo */
(function(){
'use strict';
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
function arr(name){try{return Array.isArray(db?.[name])?db[name]:[]}catch(e){return []}}
function provisionHistory(e){return Array.isArray(e?.provisionPaidHistory)?e.provisionPaidHistory:[]}
function provisionPaid(e,end){
  const year=String(end||'').slice(0,4);
  return provisionHistory(e)
    .filter(x=>(!year||String(x?.date||'').slice(0,4)===year)&&(!end||String(x?.date||'')<=end))
    .reduce((a,x)=>{const v=q(x?.value);if(x?.type==='13º')a.thirteenth+=v;else if(x?.type==='Férias'||x?.type==='1/3 de férias')a.vacation+=v;else a.extra+=v;a.total+=v;return a},{thirteenth:0,vacation:0,extra:0,total:0});
}
function formerForEmployee(id){return arr('formerEmployees').find(f=>sid(f?.employeeId)===sid(id)||sid(f?.employeeSnapshot?.id)===sid(id))||null}
function terminationForEmployee(e){
  const former=formerForEmployee(e?.id);
  const tid=sid(e?.terminationId||former?.employeeSnapshot?.terminationId||'');
  let t=tid?arr('terminations').find(x=>sid(x?.id)===tid):null;
  if(!t)t=arr('terminations').filter(x=>sid(x?.employeeId)===sid(e?.id)).sort((a,b)=>String(b?.date||'').localeCompare(String(a?.date||'')))[0]||null;
  return {termination:t,former};
}
function terminationSettlement(e,end){
  const linked=terminationForEmployee(e),t=linked.termination,f=linked.former;
  const date=String(e?.terminationDate||f?.terminationDate||t?.date||'');
  const terminated=e?.active===false||!!e?.terminationId||!!f||!!t;
  if(!terminated||!date|| (end&&date>end))return null;
  return {date,termination:t,former:f};
}
function renderTerminationAwareProvisions(){
  if(typeof ensurePayrollData==='function')ensurePayrollData();
  const startEl=document.getElementById('payrollProvisionStart'),endEl=document.getElementById('payrollProvisionEnd');
  if(!startEl||!endEl)return;
  if(typeof fillPayrollProvisionFilters==='function')fillPayrollProvisionFilters();
  if(!startEl.value||!endEl.value){const now=new Date(),y=now.getFullYear(),m=now.getMonth()+1;startEl.value=`${y}-01-01`;endEl.value=`${y}-${String(m).padStart(2,'0')}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`}
  const start=startEl.value,end=endEl.value,label=document.getElementById('payrollProvisionPeriodLabel');
  if(end<start){if(label)label.textContent='A data final não pode ser anterior à inicial.';return}
  const companyFilter=document.getElementById('payrollProvisionCompany')?.value||'',empId=document.getElementById('payrollProvisionEmployee')?.value||'';
  const months=typeof provisionMonthKeys==='function'?provisionMonthKeys(start,end):[];
  let all=[...arr('employees'),...arr('formerEmployees').map(x=>x?.employeeSnapshot||x).filter(Boolean)],seen=new Set();
  all=all.filter(e=>e&&e.id!=null&&!seen.has(sid(e.id))&&seen.add(sid(e.id)));
  if(companyFilter)all=all.filter(e=>String(employeeCompanyName(e)||'')===companyFilter);
  if(empId)all=all.filter(e=>sid(e.id)===sid(empId));
  const rows=[];
  all.forEach(e=>{
    let mcount=0,baseSum=0;
    months.forEach(key=>{const [y,m]=key.split('-').map(Number);if(employeeWorkedAtLeast15DaysInMonth(e,y,m)){mcount++;baseSum+=q(salaryForEmployeeAtDate(e,`${key}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`))}});
    if(!mcount)return;
    const gross13=baseSum/12,grossVac=baseSum/12*4/3,fgts=baseSum*.08,grossExtra=baseSum*q(db?.config?.payrollExtraChargesPct)/100,p=provisionPaid(e,end);
    let rem13=Math.max(0,gross13-p.thirteenth),remVac=Math.max(0,grossVac-p.vacation),remFgts=fgts,remExtra=Math.max(0,grossExtra-p.extra);
    const settlement=terminationSettlement(e,end),beforeSettlement=rem13+remVac+remFgts+remExtra,settledByTermination=settlement?beforeSettlement:0;
    if(settlement){rem13=0;remVac=0;remFgts=0;remExtra=0}
    const remaining=rem13+remVac+remFgts+remExtra;
    rows.push({e,mcount,baseSum,gross13,grossVac,fgts,grossExtra,p,rem13,remVac,remFgts,remExtra,remaining,settlement,settledByTermination});
  });
  const gross13=rows.reduce((a,r)=>a+r.gross13,0),grossVac=rows.reduce((a,r)=>a+r.grossVac,0),fgts=rows.reduce((a,r)=>a+r.fgts,0),extra=rows.reduce((a,r)=>a+r.grossExtra,0),paid=rows.reduce((a,r)=>a+r.p.total,0),terminationSettled=rows.reduce((a,r)=>a+r.settledByTermination,0),remaining=rows.reduce((a,r)=>a+r.remaining,0);
  if(label)label.textContent=`Período aplicado: ${fmtDate(start)} até ${fmtDate(end)} · valores antecipados e rescisões registradas são abatidos automaticamente.`;
  const cards=document.getElementById('payrollProvisionCards');
  if(cards)cards.innerHTML=`<div class="card"><small>13º provisionado</small><strong>${money(gross13)}</strong></div><div class="card"><small>Férias + 1/3</small><strong>${money(grossVac)}</strong></div><div class="card"><small>FGTS + outros</small><strong>${money(fgts+extra)}</strong></div><div class="card"><small>Já antecipado</small><strong>${money(paid)}</strong></div><div class="card"><small>Baixado em rescisões</small><strong>${money(terminationSettled)}</strong></div><div class="card"><small>Total ainda a pagar</small><strong>${money(remaining)}</strong></div>`;
  const tbl=document.getElementById('payrollProvisionTable');
  if(tbl)tbl.innerHTML=rows.length?table(['Funcionário','Confecção','Meses','13º previsto','13º antecipado','13º restante','Férias + 1/3 previstas','Férias antecipadas','Férias restantes','FGTS previsto','FGTS restante','Outros restantes','Baixa por rescisão','Total ainda a pagar'],rows.map(r=>[esc(r.e.name||'-'),esc(employeeCompanyName(r.e)),r.mcount,money(r.gross13),money(r.p.thirteenth),money(r.rem13),money(r.grossVac),money(r.p.vacation),money(r.remVac),money(r.fgts),money(r.remFgts),money(r.remExtra),r.settlement?`<span class="badge ok">${money(r.settledByTermination)} · ${fmtDate(r.settlement.date)}</span>`:'-',`<strong>${money(r.remaining)}</strong>`])):'<div class="empty">Nenhum funcionário encontrado.</div>';
  const hist=document.getElementById('payrollProvisionAdvanceHistory'),h=[];
  all.forEach(e=>provisionHistory(e).forEach(x=>{if((!end||x.date<=end)&&(!String(end).slice(0,4)||String(x.date).slice(0,4)===String(end).slice(0,4)))h.push({e,x})}));
  if(hist)hist.innerHTML=h.length?'<h3>Valores já antecipados</h3>'+table(['Data','Funcionário','Tipo','Valor','Observação','Ação'],h.sort((a,b)=>String(b.x.date).localeCompare(String(a.x.date))).map(({e,x})=>[fmtDate(x.date),esc(e.name),esc(x.type),money(x.value),esc(x.note||'-'),`<button class="danger" onclick="deleteProvisionAdvance9161('${e.id}','${x.id}')">Excluir</button>`])):'';
  return rows;
}
window.renderPayrollProvisions=renderTerminationAwareProvisions;
window.hlgbPayrollTerminationProvision={terminationSettlement,renderTerminationAwareProvisions};
window.HLGB_PAYROLL_TERMINATION_PROVISION_GUARD='v1';
console.info('[HLGB] provisoes: baixas por rescisao ativas');
})();
