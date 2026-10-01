/* HLGB — baixa das provisões ao registrar rescisão
   Mantém o histórico provisionado até a saída, mas zera o saldo futuro após o desligamento. */
(function(){
'use strict';
const V='2026.10.01-termination-provisions-v2';
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const escSafe=v=>typeof esc==='function'?esc(v):String(v??'');
let sortMode='name-asc';
function paidFromHistory(e,end){
  const hist=Array.isArray(e?.provisionPaidHistory)?e.provisionPaidHistory:[];
  const endDate=String(end||'9999-12-31').slice(0,10);
  let thirteenth=0,vacation=0,extra=0;
  for(const x of hist){
    if(!x||String(x.date||'9999-12-31').slice(0,10)>endDate)continue;
    const t=String(x.type||'').trim(),v=q(x.value);
    if(t==='13º')thirteenth+=v;
    else if(t==='Férias'||t==='1/3 de férias')vacation+=v;
    else extra+=v;
  }
  return {thirteenth,vacation,extra,total:thirteenth+vacation+extra};
}
function paidBreakdown(e,end){
  let base={thirteenth:0,vacation:0,extra:0,total:0};
  try{if(typeof provisionPaid9161==='function')base=provisionPaid9161(e,end)||base}catch(_){}
  const hist=paidFromHistory(e,end);
  const thirteenth=Math.max(q(base.thirteenth),q(hist.thirteenth));
  const vacation=Math.max(q(base.vacation),q(hist.vacation));
  const extra=Math.max(q(base.extra),q(hist.extra));
  return {thirteenth,vacation,extra,total:thirteenth+vacation+extra};
}
function sortRows(rows){
  const out=rows.slice();
  if(sortMode==='value-desc')out.sort((a,b)=>b.remaining-a.remaining||String(a.e?.name||'').localeCompare(String(b.e?.name||''),'pt-BR'));
  else if(sortMode==='value-asc')out.sort((a,b)=>a.remaining-b.remaining||String(a.e?.name||'').localeCompare(String(b.e?.name||''),'pt-BR'));
  else if(sortMode==='name-desc')out.sort((a,b)=>String(b.e?.name||'').localeCompare(String(a.e?.name||''),'pt-BR'));
  else out.sort((a,b)=>String(a.e?.name||'').localeCompare(String(b.e?.name||''),'pt-BR'));
  return out;
}
function ensureSortControl(){
  const tbl=document.getElementById('payrollProvisionTable');if(!tbl)return;
  let wrap=document.getElementById('hlgbProvisionSortWrap');
  if(!wrap){
    wrap=document.createElement('div');wrap.id='hlgbProvisionSortWrap';wrap.className='toolbar';wrap.style.cssText='justify-content:flex-end;align-items:flex-end;margin:8px 0;flex-wrap:wrap';
    wrap.innerHTML='<div class="field"><label>Ordenar provisões</label><select id="hlgbProvisionSort"><option value="name-asc">Nome A–Z</option><option value="name-desc">Nome Z–A</option><option value="value-desc">Maior valor primeiro</option><option value="value-asc">Menor valor primeiro</option></select></div>';
    tbl.parentNode?.insertBefore(wrap,tbl);
    wrap.querySelector('#hlgbProvisionSort')?.addEventListener('change',e=>{sortMode=e.target.value||'name-asc';repair()});
  }
  const sel=document.getElementById('hlgbProvisionSort');if(sel&&sel.value!==sortMode)sel.value=sortMode;
}
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function termFor(e){
  const list=arr('terminations').filter(t=>sid(t?.employeeId)===sid(e?.id)&&t?.date);
  return list.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0]||null;
}
function settlementInfo(e,end){
  const t=termFor(e),date=String(e?.terminationDate||t?.date||'').slice(0,10);
  const settled=!!date&&date<=String(end||'9999-12-31')&&(e?.active===false||!!t);
  return {settled,date,termination:t};
}
function buildRows(start,end,company,empId){
  const months=typeof provisionMonthKeys==='function'?provisionMonthKeys(start,end):[];
  let all=[...arr('employees'),...arr('formerEmployees').map(x=>x?.employeeSnapshot||x).filter(Boolean)],seen=new Set();
  all=all.filter(e=>e&&e.id!=null&&!seen.has(sid(e.id))&&seen.add(sid(e.id)));
  if(company)all=all.filter(e=>(typeof employeeCompanyName==='function'?employeeCompanyName(e):String(e.companyName||''))===company);
  if(empId)all=all.filter(e=>sid(e.id)===sid(empId));
  const rows=[];
  all.forEach(e=>{
    let mcount=0,baseSum=0;
    months.forEach(key=>{
      const [y,m]=key.split('-').map(Number);
      if(typeof employeeWorkedAtLeast15DaysInMonth==='function'&&employeeWorkedAtLeast15DaysInMonth(e,y,m)){
        mcount++;
        const last=String(new Date(y,m,0).getDate()).padStart(2,'0');
        baseSum+=q(typeof salaryForEmployeeAtDate==='function'?salaryForEmployeeAtDate(e,key+'-'+last):e.salary);
      }
    });
    if(!mcount)return;
    const gross13=baseSum/12,grossVac=baseSum/12*4/3,fgts=baseSum*.08,grossExtra=baseSum*q(db?.config?.payrollExtraChargesPct)/100;
    const p=paidBreakdown(e,end);
    let rem13=Math.max(0,gross13-q(p.thirteenth)),remVac=Math.max(0,grossVac-q(p.vacation)),remExtra=Math.max(0,grossExtra-q(p.extra)),remaining=rem13+remVac+fgts+remExtra;
    const info=settlementInfo(e,end);
    let terminationSettlement=0;
    if(info.settled){
      terminationSettlement=remaining;
      rem13=0;remVac=0;remExtra=0;remaining=0;
    }
    rows.push({e,mcount,baseSum,gross13,grossVac,fgts,grossExtra,p,rem13,remVac,remExtra,remaining,terminationSettlement,settled:info.settled,terminationDate:info.date});
  });
  return rows;
}
function repair(){
  const startEl=document.getElementById('payrollProvisionStart'),endEl=document.getElementById('payrollProvisionEnd');
  if(!startEl?.value||!endEl?.value)return;
  const start=startEl.value,end=endEl.value;
  if(end<start)return;
  const company=document.getElementById('payrollProvisionCompany')?.value||'',empId=document.getElementById('payrollProvisionEmployee')?.value||'';
  ensureSortControl();
  const rows=sortRows(buildRows(start,end,company,empId));
  const gross13=rows.reduce((a,r)=>a+r.gross13,0),grossVac=rows.reduce((a,r)=>a+r.grossVac,0),fgts=rows.reduce((a,r)=>a+r.fgts,0),extra=rows.reduce((a,r)=>a+r.grossExtra,0),paid=rows.reduce((a,r)=>a+q(r.p?.total),0),settled=rows.reduce((a,r)=>a+r.terminationSettlement,0),remaining=rows.reduce((a,r)=>a+r.remaining,0);
  const cards=document.getElementById('payrollProvisionCards');
  if(cards)cards.innerHTML='<div class="card"><small>13º provisionado</small><strong>'+money(gross13)+'</strong></div><div class="card"><small>Férias + 1/3</small><strong>'+money(grossVac)+'</strong></div><div class="card"><small>FGTS + outros</small><strong>'+money(fgts+extra)+'</strong></div><div class="card"><small>Já antecipado</small><strong>'+money(paid)+'</strong></div><div class="card"><small>Baixado em rescisões</small><strong>'+money(settled)+'</strong></div><div class="card"><small>Total ainda a pagar</small><strong>'+money(remaining)+'</strong></div>';
  const tbl=document.getElementById('payrollProvisionTable');
  if(tbl)tbl.innerHTML=rows.length?table(
    ['Funcionário','Confecção','Meses','13º previsto','13º antecipado','13º restante','Férias + 1/3 previstas','Férias antecipadas','Férias restantes','FGTS','Outros restantes','Situação','Total ainda a pagar'],
    rows.map(r=>[
      escSafe(r.e.name||'-'),
      escSafe(typeof employeeCompanyName==='function'?employeeCompanyName(r.e):(r.e.companyName||'-')),
      r.mcount,
      money(r.gross13),money(q(r.p?.thirteenth)),money(r.rem13),
      money(r.grossVac),money(q(r.p?.vacation)),money(r.remVac),
      r.settled?'<span class="badge ok">Baixado na rescisão</span>':money(r.fgts),
      money(r.remExtra),
      r.settled?'<span class="badge ok">Rescisão '+escSafe(typeof fmtDate==='function'?fmtDate(r.terminationDate):r.terminationDate)+'</span>':'<span class="badge">Em aberto</span>',
      '<strong>'+money(r.remaining)+'</strong>'
    ])
  ):'<div class="empty">Nenhum funcionário encontrado.</div>';
  const label=document.getElementById('payrollProvisionPeriodLabel');
  if(label){
    const base='Período aplicado: '+(typeof fmtDate==='function'?fmtDate(start):start)+' até '+(typeof fmtDate==='function'?fmtDate(end):end)+'.';
    label.textContent=base+' Funcionários desligados não geram saldo após a rescisão; o histórico até a saída é preservado.';
  }
}
const old=window.renderPayrollProvisions;
if(typeof old==='function'&&!old.__hlgbTerminationProvisionV1){
  const wrapped=function(){
    const out=old.apply(this,arguments);
    try{repair()}catch(e){console.error('[HLGB provisões rescisão]',e)}
    setTimeout(()=>{try{repair()}catch(e){}},0);
    return out;
  };
  wrapped.__hlgbTerminationProvisionV1=true;
  wrapped.__original=old;
  window.renderPayrollProvisions=wrapped;
}
window.hlgbPayrollTerminationProvisions={settlementInfo,buildRows,repair,paidFromHistory,paidBreakdown,sortRows,setSort:v=>{sortMode=v||'name-asc';repair()}};
window.HLGB_TERMINATION_PROVISION_GUARD=V;
console.info('[HLGB] provisões após rescisão: baixa de saldo ativa');
})();