/* HLGB v93.04 — Folha compartilhada: nuvem confirmada, sem folha paralela por usuário */
(function(){
'use strict';
const V='93.04';
if(window.hlgbPayrollSaveStability9296?.version===V)return;
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const now=()=>new Date().toISOString();
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function dbr(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}try{return window.db||null}catch(e){return null}}
function arr(n){const d=dbr();return Array.isArray(d?.[n])?d[n]:[]}
function escs(v){try{return typeof window.esc==='function'?window.esc(v):sid(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}catch(e){return sid(v)}}
function moneySafe(v){try{return typeof window.money==='function'?window.money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+Number(v||0).toFixed(2).replace('.',',')}}
function calc(r,e){try{if(typeof window.payrollCalc==='function')return window.payrollCalc(r,e||{})}catch(e){}const salary=q(r?.salary||e?.salary),transport=0,benefit=q(r?.benefit),overtime=q(r?.overtime),bonus=q(r?.bonus),otherCredit=q(r?.otherCredit),absence=q(r?.absence),inss=0,union=q(r?.unionDiscount),advance=q(r?.advance),purchase=q(r?.purchase),otherDiscount=q(r?.otherDiscount),gross=salary+transport+benefit+overtime+bonus+otherCredit,discounts=absence+inss+union+advance+purchase+otherDiscount;return {salary,transport,benefit,overtime,bonus,otherCredit,absence,inss,union,advance,purchase,otherDiscount,gross,discounts,net:Math.max(0,gross-discounts)}}
function findRow(id){return arr('payroll').find(x=>sid(x?.id)===sid(id))||null}
function findEmployee(id){return arr('employees').find(x=>sid(x?.id)===sid(id))||null}
function saveLocal(){try{if(typeof window.localSaveOnly==='function')window.localSaveOnly();else if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){console.warn('[HLGB folha '+V+'] local',e)}}
function redraw(){try{window.renderPayroll?.()}catch(e){console.warn('[HLGB folha '+V+'] render',e)}try{window.hlgbPayrollView9295?.render?.()}catch(e){}try{window.hlgbPayrollStability9293?.renderSummary?.()}catch(e){}}
function status(text,type='warn'){try{window.setCloudStatus?.(text,type)}catch(e){}}
function saveFn(){try{if(typeof window.hlgbRecordSaveWithRetry==='function')return window.hlgbRecordSaveWithRetry}catch(e){}try{if(typeof hlgbRecordSaveWithRetry==='function')return hlgbRecordSaveWithRetry}catch(e){}return null}
function loadFn(){try{if(typeof window.hlgbLoadNormalizedCore==='function')return window.hlgbLoadNormalizedCore}catch(e){}try{if(typeof hlgbLoadNormalizedCore==='function')return hlgbLoadNormalizedCore}catch(e){}return null}
function ensureFn(){try{if(typeof window.hlgbEnsureRecordsOnlineAfterLogin==='function')return window.hlgbEnsureRecordsOnlineAfterLogin}catch(e){}try{if(typeof hlgbEnsureRecordsOnlineAfterLogin==='function')return hlgbEnsureRecordsOnlineAfterLogin}catch(e){}try{if(typeof window.hlgbEnsureRecordsOnlineAfterAuth==='function')return window.hlgbEnsureRecordsOnlineAfterAuth}catch(e){}return null}
function snaps(){try{if(typeof hlgbRecordSnapshots!=='undefined')return hlgbRecordSnapshots}catch(e){}try{return window.hlgbRecordSnapshots||null}catch(e){return null}}
function cloudLatest(id){try{return snaps()?.payroll?.get?.(sid(id))?.data||null}catch(e){return null}}
function cloudMerge(base,desired,latest){try{if(typeof window.cloudMergeThreeWay==='function')return window.cloudMergeThreeWay(base,desired,latest);if(typeof cloudMergeThreeWay==='function')return cloudMergeThreeWay(base,desired,latest)}catch(e){}return desired}
function replaceLocal(id,data){const d=dbr();if(!d)return false;d.payroll=Array.isArray(d.payroll)?d.payroll:[];const i=d.payroll.findIndex(x=>sid(x?.id)===sid(id));const v=clone(data);if(i>=0)d.payroll[i]=v;else d.payroll.push(v);return true}
async function ensureOnline(){
 if(!navigator.onLine)throw new Error('Sem conexão com a internet. A folha não foi alterada.');
 const ef=ensureFn();
 let ready=false;try{ready=typeof hlgbRecordReady!=='undefined'?!!hlgbRecordReady:!!window.hlgbRecordReady}catch(e){}
 if(!ready&&ef){const ok=await ef();if(!ok)throw new Error('Não foi possível carregar a folha compartilhada da nuvem.');}
 if(!saveFn())throw new Error('O salvamento compartilhado da folha não está disponível.');
 return true;
}
async function saveConfirmed(base,desired){
 await ensureOnline();
 const id=sid(desired?.id||base?.id);if(!id)throw new Error('Registro da folha sem identificação.');
 const latest=cloudLatest(id)||base;
 const merged=cloudMerge(clone(base),clone(desired),clone(latest));
 status('☁️ Salvando folha compartilhada…','warn');
 const out=await saveFn()('payroll',id,clone(merged),false);
 if(!out||out.applied!==true)throw new Error('A nuvem não confirmou a alteração da folha.');
 const finalData=clone(out.data||merged);replaceLocal(id,finalData);saveLocal();redraw();status('✅ Folha salva e compartilhada','ok');return finalData;
}
function editPayrollRowShared(id){
 const r=findRow(id);if(!r)return alert('Folha não encontrada. Atualize a página e tente novamente.');
 const base=clone(r),e=findEmployee(r.employeeId)||{salary:r.salary||0},c=calc(r,e);
 if(typeof window.openModal!=='function')return alert('Não foi possível abrir a edição da folha.');
 window.openModal(`Folha — ${escs(r.employeeName||e.name||'Funcionário')}`,`
 <div class="grid">
  <div class="field"><label>Salário</label><input id="prSalary" type="number" step=".01" value="${c.salary}"></div>
  <div class="field"><label>Vale-transporte calculado</label><input value="${moneySafe(c.transport)}" disabled></div>
  <div class="field"><label>Dias de falta para descontar do VT</label><input id="prTransportAbsenceDays" type="number" min="0" step="1" value="${+r.transportAbsenceDays||0}"></div>
  <div class="field"><label>Benefício / salário-família</label><input id="prBenefit" type="number" step=".01" value="${c.benefit}"></div>
  <div class="field"><label>Hora extra</label><input id="prOvertime" type="number" step=".01" value="${c.overtime}"></div>
  <div class="field"><label>Bônus</label><input id="prBonus" type="number" step=".01" value="${c.bonus}"></div>
  <div class="field"><label>Outros créditos (+)</label><input id="prOtherCredit" type="number" step=".01" value="${c.otherCredit||0}"></div>
  <div class="field"><label>Faltas / desconto</label><input id="prAbsence" type="number" step=".01" value="${c.absence}"></div>
  <div class="field"><label>Desconto sindical</label><input id="prUnion" type="number" step=".01" value="${c.union}"></div>
  <div class="field"><label>Vale / adiantamento</label><input id="prAdvance" type="number" step=".01" value="${c.advance}"></div>
  <div class="field"><label>Compra</label><input id="prPurchase" type="number" step=".01" value="${c.purchase}"></div>
  <div class="field"><label>Outros descontos (-)</label><input id="prOtherDiscount" type="number" step=".01" value="${c.otherDiscount||0}"></div>
  <div class="field"><label>Descontar INSS?</label><select id="prDiscountInss"><option value="yes" ${r.discountInss!==false?'selected':''}>Sim</option><option value="no" ${r.discountInss===false?'selected':''}>Não</option></select></div>
  <div class="field"><label>Chave PIX</label><input id="prPix" value="${escs(r.pix||e.pix||'')}"></div>
 </div>
 <div class="sub">A alteração só será considerada salva depois da confirmação da nuvem e ficará igual para todos os usuários.</div>
 <button type="button" class="primary modalSave">Salvar alterações</button>`,async()=>{
   const btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='☁️ Salvando…'}
   const desired={...clone(base),salary:+document.getElementById('prSalary')?.value||0,transportAbsenceDays:+document.getElementById('prTransportAbsenceDays')?.value||0,benefit:+document.getElementById('prBenefit')?.value||0,overtime:+document.getElementById('prOvertime')?.value||0,bonus:+document.getElementById('prBonus')?.value||0,otherCredit:+document.getElementById('prOtherCredit')?.value||0,absence:+document.getElementById('prAbsence')?.value||0,unionDiscount:+document.getElementById('prUnion')?.value||0,advance:+document.getElementById('prAdvance')?.value||0,purchase:+document.getElementById('prPurchase')?.value||0,otherDiscount:+document.getElementById('prOtherDiscount')?.value||0,pix:document.getElementById('prPix')?.value||'',discountInss:document.getElementById('prDiscountInss')?.value!=='no',updatedAt:now()};
   if(desired.paid){const cc=calc(desired,e);desired.paidValue=cc.net}
   try{const saved=await saveConfirmed(base,desired);try{window.closeModal?.()}catch(e){}try{window.auditAction?.('Atualizou folha de pagamento',`${saved.employeeName||'Funcionário'} — ${saved.month||''}`)}catch(e){}return true}
   catch(err){console.error('[HLGB folha '+V+'] edição',err);status('❌ Folha não confirmada na nuvem','bad');alert('A alteração NÃO foi aplicada porque a nuvem não confirmou.\n\n'+(err?.message||err));if(btn){btn.disabled=false;btn.textContent='Salvar alterações'}return false}
 });
}
async function togglePayrollPaidShared(id){
 const r=findRow(id);if(!r)return alert('Folha não encontrada.');const base=clone(r),e=findEmployee(r.employeeId)||{},c=calc(r,e),desired=clone(base);
 if(r.paid){if(!confirm(`Reabrir o pagamento de ${r.employeeName||'funcionário'} como PENDENTE?`))return false;desired.paid=false;desired.paidAt='';desired.paidValue=0}
 else{if(!confirm(`Marcar ${r.employeeName||'funcionário'} como PAGO em ${moneySafe(c.net)}?`))return false;desired.paid=true;desired.paidAt=new Date().toISOString().slice(0,10);desired.paidValue=c.net}
 desired.updatedAt=now();try{await saveConfirmed(base,desired);return true}catch(err){console.error('[HLGB folha '+V+'] pagamento',err);status('❌ Status não confirmado na nuvem','bad');alert('O status da folha NÃO foi alterado porque a nuvem não confirmou.\n\n'+(err?.message||err));return false}
}
function cloudMonthRows(month){const m=snaps()?.payroll;if(!m||typeof m.values!=='function')return [];const out=[];for(const s of m.values()){if(!s||s.deleted_at||!s.data)continue;if(sid(s.data.month)===sid(month))out.push(clone(s.data))}return out}
function reconcileMonth(month){
 const d=dbr();if(!d)return {cloud:0,removed:0};d.payroll=Array.isArray(d.payroll)?d.payroll:[];const cloud=cloudMonthRows(month),cloudIds=new Set(cloud.map(x=>sid(x.id))),cloudByEmp=new Map();cloud.forEach(x=>cloudByEmp.set(sid(x.employeeId),x));let removed=0;
 for(const cr of cloud)if(!d.payroll.some(x=>sid(x?.id)===sid(cr.id)))d.payroll.push(clone(cr));
 d.payroll=d.payroll.filter(r=>{if(sid(r?.month)!==sid(month))return true;const canonical=cloudByEmp.get(sid(r?.employeeId));if(canonical&&sid(r?.id)!==sid(canonical.id)&&!cloudIds.has(sid(r?.id))){removed++;return false}return true});
 saveLocal();return {cloud:cloud.length,removed};
}
async function generatePayrollMonthShared(){
 const btn=[...document.querySelectorAll('button')].find(b=>/Gerar\s*\/\s*atualizar folha do mês/i.test(b.textContent||''));if(btn)btn.disabled=true;
 try{
   await ensureOnline();const lf=loadFn();if(lf)await lf({preserveLocal:true});
   try{if(typeof window.ensurePayrollData==='function')window.ensurePayrollData();else if(typeof ensurePayrollData==='function')ensurePayrollData()}catch(e){}
   const month=document.getElementById('payrollMonth')?.value||(typeof window.payrollCurrentMonth==='function'?window.payrollCurrentMonth():new Date().toISOString().slice(0,7));
   const rec=reconcileMonth(month),d=dbr(),employees=arr('employees').filter(e=>e&&e.active!==false),created=[];
   for(const e of employees){if(arr('payroll').some(r=>sid(r?.month)===sid(month)&&sid(r?.employeeId)===sid(e?.id)))continue;let row=null;try{if(typeof window.ensureEmployeePayrollForMonth==='function')row=window.ensureEmployeePayrollForMonth(e,month);else if(typeof ensureEmployeePayrollForMonth==='function')row=ensureEmployeePayrollForMonth(e,month)}catch(err){throw new Error('Não foi possível montar a folha de '+(e.name||'funcionário')+'.')};if(!row)continue;const localId=sid(row.id);try{const saved=await saveConfirmed(clone(row),clone(row));created.push(saved)}catch(err){if(d&&Array.isArray(d.payroll))d.payroll=d.payroll.filter(x=>sid(x?.id)!==localId);saveLocal();throw err}}
   saveLocal();redraw();status(`✅ Folha ${month} compartilhada · ${arr('payroll').filter(r=>sid(r?.month)===sid(month)).length} funcionário(s)`,'ok');if(rec.removed)console.info('[HLGB folha '+V+'] duplicidades locais removidas',rec.removed);return true;
 }catch(err){console.error('[HLGB folha '+V+'] gerar',err);status('❌ Não foi possível confirmar a folha compartilhada','bad');alert('A folha não foi gerada novamente para evitar criar uma versão diferente por usuário.\n\n'+(err?.message||err));return false}
 finally{if(btn)btn.disabled=false}
}
function install(){window.editPayrollRow=editPayrollRowShared;window.togglePayrollPaid=togglePayrollPaidShared;window.generatePayrollMonth=generatePayrollMonthShared;return true}
install();setTimeout(install,400);setTimeout(install,1600);setTimeout(install,5000);
window.hlgbPayrollSaveStability9296={version:V,install,edit:editPayrollRowShared,togglePaid:togglePayrollPaidShared,generate:generatePayrollMonthShared,reconcileMonth};
window.HLGB_PAYROLL_SAVE_STABILITY_9296=V;
console.info('[HLGB] Folha v'+V+' — compartilhada e confirmada na nuvem');
})();
