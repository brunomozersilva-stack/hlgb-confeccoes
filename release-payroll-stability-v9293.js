/* HLGB v92.93 — folha confiável: totais integrais, vales local-first e diagnóstico */
(function(){
'use strict';
if(window.hlgbPayrollStability9293)return;
const V='92.93',PENDING_KEY='hlgb_records_pending_v91';
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const now=()=>new Date().toISOString();
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}try{return window.db||null}catch(e){return null}}
function arr(n){const d=dbRef();return Array.isArray(d?.[n])?d[n]:[]}
function moneySafe(v){try{return typeof window.money==='function'?window.money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+Number(v||0).toFixed(2).replace('.',',')}}
function recordId(module,row,index=0){const direct=row?.id??row?.__hlgbId;if(direct!=null&&sid(direct).trim())return sid(direct);try{if(typeof window.hlgbRecordId==='function')return sid(window.hlgbRecordId(module,row,index))}catch(e){}return ''}
function employeeCompany(e){try{return typeof window.employeeCompanyName==='function'?window.employeeCompanyName(e):sid(e?.companyName||'Sem confecção')}catch(_){return sid(e?.companyName||'Sem confecção')}}
function selectedMonth(){return document.getElementById('payrollMonth')?.value||new Date().toISOString().slice(0,7)}
function calc(row,emp){
 try{if(typeof window.payrollCalc==='function')return window.payrollCalc(row,emp||{})}catch(e){}
 const salary=q(row?.salary||emp?.salary),benefit=q(row?.benefit),overtime=q(row?.overtime),bonus=q(row?.bonus),otherCredit=q(row?.otherCredit),absence=q(row?.absence),union=q(row?.unionDiscount),advance=q(row?.advance),purchase=q(row?.purchase),otherDiscount=q(row?.otherDiscount),transport=0,inss=0;
 const gross=salary+transport+benefit+overtime+bonus+otherCredit,discounts=absence+inss+union+advance+purchase+otherDiscount;
 return {salary,transport,benefit,overtime,bonus,otherCredit,absence,union,advance,purchase,otherDiscount,inss,gross,discounts,net:Math.max(0,gross-discounts)};
}
function eligibleActiveEmployees(month){
 const end=month+'-31';
 return arr('employees').filter(e=>e&&e.active!==false&&(!e.hireDate||sid(e.hireDate).slice(0,10)<=end));
}
function payrollSnapshot(month=selectedMonth()){
 const employees=arr('employees'),active=eligibleActiveEmployees(month),rows=arr('payroll').filter(r=>sid(r?.month)===month),byEmp=new Map(),duplicates=[];
 for(const r of rows){const k=sid(r?.employeeId);if(!byEmp.has(k))byEmp.set(k,[]);byEmp.get(k).push(r)}
 for(const [employeeId,list] of byEmp)if(employeeId&&list.length>1)duplicates.push({employeeId,count:list.length,ids:list.map((x,i)=>recordId('payroll',x,i))});
 const missing=active.filter(e=>!byEmp.has(sid(e.id))).map(e=>({id:sid(e.id),name:sid(e.name),company:employeeCompany(e),salary:q(e.salary)}));
 let base=0,gross=0,discounts=0,net=0,paid=0,inss=0,advancesInPayroll=0;
 for(const r of rows){const emp=employees.find(e=>sid(e?.id)===sid(r?.employeeId))||{},c=calc(r,emp);base+=q(c.salary);gross+=q(c.gross);discounts+=q(c.discounts);net+=q(c.net);inss+=q(c.inss);advancesInPayroll+=q(c.advance);if(r.paid)paid+=q(c.net)}
 const advances=arr('employeeAdvances'),pending=advances.filter(a=>a?.status!=='Pago'),paidAdv=advances.filter(a=>a?.status==='Pago');
 const orphanAdvances=advances.filter(a=>!employees.some(e=>sid(e?.id)===sid(a?.employeeId))).map(a=>({id:recordId('employeeAdvances',a),employeeId:sid(a?.employeeId),employeeName:sid(a?.employeeName),value:q(a?.value),month:sid(a?.month),status:sid(a?.status)}));
 const invalidSalaries=active.filter(e=>!Number.isFinite(Number(e?.salary))||q(e?.salary)<=0).map(e=>({id:sid(e.id),name:sid(e.name),salary:e?.salary}));
 const filterCompany=document.getElementById('payrollCompanyFilter')?.value||'',filterEmployee=(document.getElementById('payrollEmployeeFilter')?.value||'').trim();
 return {kind:'hlgb_payroll_diagnostic',version:V,generatedAt:now(),month,activeEmployees:active.length,payrollRows:rows.length,missingPayroll:missing,duplicatePayroll:duplicates,invalidSalaries,totals:{base,gross,discounts,net,paid,pending:Math.max(0,net-paid),inss,advancesInPayroll},advances:{count:advances.length,pendingCount:pending.length,pendingValue:pending.reduce((s,a)=>s+q(a.value),0),paidCount:paidAdv.length,paidValue:paidAdv.reduce((s,a)=>s+q(a.value),0),orphans:orphanAdvances},filters:{company:filterCompany,employee:filterEmployee,active:!!(filterCompany||filterEmployee)}};
}
function ensureSummaryNote(){
 const cards=document.getElementById('payrollSummaryCards');if(!cards)return null;
 let note=document.getElementById('hlgbPayrollSummaryNote9293');if(!note){note=document.createElement('div');note.id='hlgbPayrollSummaryNote9293';note.className='panel';note.style.marginTop='10px';cards.insertAdjacentElement('afterend',note)}return note;
}
function renderSummary(){
 const cards=document.getElementById('payrollSummaryCards');if(!cards)return false;const s=payrollSnapshot();
 cards.innerHTML=`<div class="card"><small>Funcionários na folha</small><strong>${s.payrollRows}</strong></div><div class="card"><small>Salários base</small><strong>${moneySafe(s.totals.base)}</strong></div><div class="card"><small>Folha bruta</small><strong>${moneySafe(s.totals.gross)}</strong></div><div class="card"><small>Descontos</small><strong>${moneySafe(s.totals.discounts)}</strong></div><div class="card"><small>Vales na folha</small><strong>${moneySafe(s.totals.advancesInPayroll)}</strong></div><div class="card"><small>Folha líquida</small><strong>${moneySafe(s.totals.net)}</strong></div><div class="card"><small>Pago</small><strong>${moneySafe(s.totals.paid)}</strong></div><div class="card"><small>Pendente</small><strong>${moneySafe(s.totals.pending)}</strong></div><div class="card"><small>INSS funcionários</small><strong>${moneySafe(s.totals.inss)}</strong></div>`;
 const note=ensureSummaryNote();if(note){const bits=[];if(s.missingPayroll.length)bits.push(`<b>⚠️ ${s.missingPayroll.length} funcionário(s) ativo(s) ainda sem folha em ${s.month}:</b> ${s.missingPayroll.slice(0,8).map(x=>x.name).join(', ')}${s.missingPayroll.length>8?'…':''}. Use “Gerar / atualizar folha do mês”.`);if(s.filters.active)bits.push(`<b>Filtro visual ativo.</b> Os cartões acima continuam mostrando a competência inteira; a lista abaixo está filtrada${s.filters.company?' por '+s.filters.company:''}${s.filters.employee?' por “'+s.filters.employee+'”':''}.`);if(s.duplicatePayroll.length)bits.push(`<b>⚠️ ${s.duplicatePayroll.length} funcionário(s) com folha duplicada nesta competência.</b>`);note.innerHTML=bits.length?bits.join('<br><br>'):'<span class="sub">Os cartões acima representam a competência inteira, independentemente dos filtros da lista.</span>';note.style.display=''}
 return true;
}
function readPending(){try{const p=JSON.parse(localStorage.getItem(PENDING_KEY)||'null');return p&&typeof p==='object'?p:{version:1,at:Date.now(),modules:{}}}catch(e){return {version:1,at:Date.now(),modules:{}}}}
function writePending(p){try{localStorage.setItem(PENDING_KEY,JSON.stringify(p));return true}catch(e){console.error('[HLGB Payroll '+V+'] fila pendente',e);return false}}
function queuePending(module,id,data,deleted){const p=readPending();p.modules=p.modules&&typeof p.modules==='object'?p.modules:{};const list=Array.isArray(p.modules[module])?p.modules[module]:[],op={id:sid(id),data:clone(data),deleted:!!deleted,__hlgb_pending_at:Date.now(),queuedAt:Date.now()};const i=list.findIndex(x=>sid(x?.id)===sid(id));if(i>=0)list[i]=op;else list.push(op);p.modules[module]=list;p.at=Date.now();return writePending(p)}
function clearPending(module,id,deleted){try{const p=readPending(),list=Array.isArray(p.modules?.[module])?p.modules[module]:[],keep=list.filter(x=>!(sid(x?.id)===sid(id)&&!!x?.deleted===!!deleted));if(keep.length===list.length)return false;if(keep.length)p.modules[module]=keep;else delete p.modules[module];const any=Object.values(p.modules||{}).some(x=>Array.isArray(x)&&x.length);if(any)writePending(p);else localStorage.removeItem(PENDING_KEY);return true}catch(e){return false}}
function replaceLocal(module,id,data){const d=dbRef();if(!d)return false;d[module]=Array.isArray(d[module])?d[module]:[];const i=d[module].findIndex((x,n)=>recordId(module,x,n)===sid(id)||sid(x?.id)===sid(id));if(i>=0)d[module][i]=clone(data);else d[module].push(clone(data));return true}
function removeLocal(module,id){const d=dbRef();if(!d)return false;d[module]=Array.isArray(d[module])?d[module]:[];const before=d[module].length;d[module]=d[module].filter((x,n)=>recordId(module,x,n)!==sid(id)&&sid(x?.id)!==sid(id));return d[module].length!==before}
function saveLocal(){try{window.localSaveOnly?.()}catch(e){}}
async function syncOne(module,id,data,deleted){try{if(typeof window.hlgbRecordSaveWithRetry!=='function')return false;const out=await window.hlgbRecordSaveWithRetry(module,sid(id),clone(data),!!deleted);if(out?.applied===true){clearPending(module,id,deleted);return true}}catch(e){console.info('[HLGB Payroll '+V+'] sincronização pendente',module,id,sid(e?.message||e))}return false}
function rerender(){try{window.renderEmployeeAdvances?.()}catch(e){}try{window.renderPayroll?.()}catch(e){}try{renderSummary()}catch(e){}}
async function deleteAdvance(id){
 const list=arr('employeeAdvances'),a=list.find((x,i)=>recordId('employeeAdvances',x,i)===sid(id)||sid(x?.id)===sid(id));if(!a){alert('Vale não encontrado. Atualize a Folha e tente novamente.');return false}
 const aid=recordId('employeeAdvances',a,list.indexOf(a));if(!aid){alert('Este vale não possui identificação segura para exclusão.');return false}
 const isPaid=a.status==='Pago';let payroll=null,nextPayroll=null,payrollId='';
 if(isPaid){
  payroll=arr('payroll').find(r=>sid(r?.id)===sid(a.payrollRowId)||(sid(r?.employeeId)===sid(a.employeeId)&&sid(r?.month)===sid(a.month)&&Array.isArray(r?.advanceIds)&&r.advanceIds.map(sid).includes(aid)));
  const msg=payroll?`Este vale está marcado como PAGO e já foi lançado como desconto na folha ${a.month||''}.\n\nExcluir também retirará ${moneySafe(a.value)} do campo “Vale / adiantamento” dessa folha. Use esta opção somente se o lançamento foi feito por engano.\n\nContinuar?`:'Este vale está marcado como PAGO, mas não encontrei a folha vinculada. Excluir o registro mesmo assim?';
  if(!confirm(msg))return false;
  if(payroll){payrollId=recordId('payroll',payroll,arr('payroll').indexOf(payroll));nextPayroll=clone(payroll);nextPayroll.advance=Math.max(0,q(nextPayroll.advance)-q(a.value));nextPayroll.advanceIds=Array.isArray(nextPayroll.advanceIds)?nextPayroll.advanceIds.filter(x=>sid(x)!==aid):[];nextPayroll.updatedAt=now();replaceLocal('payroll',payrollId,nextPayroll);queuePending('payroll',payrollId,nextPayroll,false)}
 }else if(!confirm(`Excluir este vale de ${a.employeeName||'funcionário'} no valor de ${moneySafe(a.value)}?`))return false;
 const tomb={...clone(a),__hlgb_explicit_delete:true,updatedAt:now()};removeLocal('employeeAdvances',aid);queuePending('employeeAdvances',aid,tomb,true);saveLocal();rerender();try{window.setCloudStatus?.('⚡ Vale removido no aparelho · sincronização pendente','warn')}catch(e){}
 setTimeout(async()=>{if(nextPayroll&&payrollId)await syncOne('payroll',payrollId,nextPayroll,false);const ok=await syncOne('employeeAdvances',aid,tomb,true);if(ok)try{window.setCloudStatus?.('⚡ Online · vale excluído','ok')}catch(e){}},0);
 return true;
}
function installDelete(){window.deleteEmployeeAdvance=deleteAdvance;return true}
function wrapRender(){const fn=window.renderPayroll;if(typeof fn!=='function'||fn.__hlgbPayroll9293)return false;const w=function(){const out=fn.apply(this,arguments);try{renderSummary()}catch(e){console.warn('[HLGB Payroll '+V+'] resumo',e)}return out};w.__hlgbPayroll9293=true;w.__original=fn;window.renderPayroll=w;return true}
function downloadDiagnostic(){const data=payrollSnapshot(),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='HLGB-DIAGNOSTICO-FOLHA-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{try{URL.revokeObjectURL(a.href)}catch(e){}a.remove()},900);return data}
function injectAuditor(){const result=document.getElementById('hlgbAuditorResult'),actions=result?.parentElement?.querySelector('.hlgb-auditor-actions');if(!actions||document.getElementById('hlgbPayrollDebug9293'))return false;const b=document.createElement('button');b.id='hlgbPayrollDebug9293';b.type='button';b.className='secondary';b.textContent='🧾 Diagnóstico da Folha';b.onclick=()=>{const d=downloadDiagnostic();alert(`Diagnóstico da Folha exportado.\n\nFolhas: ${d.payrollRows}\nAtivos sem folha: ${d.missingPayroll.length}\nDuplicidades: ${d.duplicatePayroll.length}\nVales: ${d.advances.count}`)};actions.appendChild(b);return true}
function boot(){installDelete();wrapRender();try{renderSummary()}catch(e){}injectAuditor()}
boot();setTimeout(boot,500);setTimeout(boot,1800);document.addEventListener('click',e=>{const b=e.target?.closest?.('button');if(!b)return;if(b.id==='hlgbAuditorNavBtn'||b.id==='hlgbAuditorOpenBtn'||/Auditor\s*\/\s*Testes/i.test(sid(b.textContent)))setTimeout(injectAuditor,120)},true);
window.hlgbPayrollDiagnostics9293={version:V,snapshot:payrollSnapshot,download:downloadDiagnostic};
window.hlgbPayrollStability9293={version:V,renderSummary,deleteAdvance,installDelete,wrapRender,snapshot:payrollSnapshot};
window.HLGB_PAYROLL_STABILITY_9293=V;
console.info('[HLGB] Folha v'+V+' ativa — totais integrais, exclusão de vale local-first e diagnóstico');
})();
