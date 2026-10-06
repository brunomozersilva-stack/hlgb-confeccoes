/* HLGB v92.96 — Folha: salvar edição/pagamento local primeiro, sincronizar em segundo plano */
(function(){
'use strict';
if(window.hlgbPayrollSaveStability9296)return;
const V='92.96';
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const now=()=>new Date().toISOString();
function dbr(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}try{return window.db||null}catch(e){return null}}
function arr(n){const d=dbr();return Array.isArray(d?.[n])?d[n]:[]}
function escs(v){try{return typeof window.esc==='function'?window.esc(v):sid(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}catch(e){return sid(v)}}
function moneySafe(v){try{return typeof window.money==='function'?window.money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+Number(v||0).toFixed(2).replace('.',',')}}
function calc(r,e){try{if(typeof window.payrollCalc==='function')return window.payrollCalc(r,e||{})}catch(e){}const salary=q(r?.salary||e?.salary),transport=0,benefit=q(r?.benefit),overtime=q(r?.overtime),bonus=q(r?.bonus),otherCredit=q(r?.otherCredit),absence=q(r?.absence),inss=0,union=q(r?.unionDiscount),advance=q(r?.advance),purchase=q(r?.purchase),otherDiscount=q(r?.otherDiscount),gross=salary+transport+benefit+overtime+bonus+otherCredit,discounts=absence+inss+union+advance+purchase+otherDiscount;return {salary,transport,benefit,overtime,bonus,otherCredit,absence,inss,union,advance,purchase,otherDiscount,gross,discounts,net:Math.max(0,gross-discounts)}}
function findRow(id){return arr('payroll').find(x=>sid(x?.id)===sid(id))||null}
function findEmployee(id){return arr('employees').find(x=>sid(x?.id)===sid(id))||null}
function saveLocal(){try{if(typeof window.localSaveOnly==='function')window.localSaveOnly();else if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){console.warn('[HLGB folha '+V+'] local',e)}}
function queueSync(){setTimeout(()=>{try{if(typeof window.persistDb==='function')window.persistDb();else if(typeof persistDb==='function')persistDb()}catch(e){console.warn('[HLGB folha '+V+'] persist',e)}},0)}
function redraw(){try{window.renderPayroll?.()}catch(e){console.warn('[HLGB folha '+V+'] render',e)}try{window.hlgbPayrollView9295?.render?.()}catch(e){}try{window.hlgbPayrollStability9293?.renderSummary?.()}catch(e){}}
function status(text,type='warn'){try{window.setCloudStatus?.(text,type)}catch(e){}}
function editPayrollRowLocal(id){
 const r=findRow(id);if(!r)return alert('Folha não encontrada. Atualize a página e tente novamente.');
 const e=findEmployee(r.employeeId)||{salary:r.salary||0},c=calc(r,e);
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
 <div class="sub">A alteração será salva neste aparelho na hora e sincronizada com a nuvem em segundo plano.</div>
 <button type="button" class="primary modalSave">Salvar alterações</button>`,()=>{
   const desired={...r,
    salary:+document.getElementById('prSalary')?.value||0,
    transportAbsenceDays:+document.getElementById('prTransportAbsenceDays')?.value||0,
    benefit:+document.getElementById('prBenefit')?.value||0,
    overtime:+document.getElementById('prOvertime')?.value||0,
    bonus:+document.getElementById('prBonus')?.value||0,
    otherCredit:+document.getElementById('prOtherCredit')?.value||0,
    absence:+document.getElementById('prAbsence')?.value||0,
    unionDiscount:+document.getElementById('prUnion')?.value||0,
    advance:+document.getElementById('prAdvance')?.value||0,
    purchase:+document.getElementById('prPurchase')?.value||0,
    otherDiscount:+document.getElementById('prOtherDiscount')?.value||0,
    pix:document.getElementById('prPix')?.value||'',
    discountInss:document.getElementById('prDiscountInss')?.value!=='no',
    updatedAt:now()
   };
   if(desired.paid){const cc=calc(desired,e);desired.paidValue=cc.net}
   Object.keys(r).forEach(k=>{if(!(k in desired))delete r[k]});Object.assign(r,desired);
   saveLocal();
   try{window.closeModal?.()}catch(e){}
   redraw();
   status('✅ Alteração da folha salva · sincronizando em segundo plano…','warn');
   queueSync();
   try{window.auditAction?.('Atualizou folha de pagamento',`${r.employeeName||'Funcionário'} — ${r.month||''}`)}catch(e){}
   return true;
 });
}
function togglePayrollPaidLocal(id){
 const r=findRow(id);if(!r)return alert('Folha não encontrada.');
 const e=findEmployee(r.employeeId)||{},c=calc(r,e);
 if(r.paid){if(!confirm(`Reabrir o pagamento de ${r.employeeName||'funcionário'} como PENDENTE?`))return false;r.paid=false;r.paidAt='';r.paidValue=0}
 else{if(!confirm(`Marcar ${r.employeeName||'funcionário'} como PAGO em ${moneySafe(c.net)}?`))return false;r.paid=true;r.paidAt=new Date().toISOString().slice(0,10);r.paidValue=c.net}
 r.updatedAt=now();saveLocal();redraw();status('✅ Status da folha salvo · sincronizando em segundo plano…','warn');queueSync();return true;
}
function install(){window.editPayrollRow=editPayrollRowLocal;window.togglePayrollPaid=togglePayrollPaidLocal;return true}
install();setTimeout(install,400);setTimeout(install,1600);
window.hlgbPayrollSaveStability9296={version:V,install,edit:editPayrollRowLocal,togglePaid:togglePayrollPaidLocal};
window.HLGB_PAYROLL_SAVE_STABILITY_9296=V;
console.info('[HLGB] Folha v'+V+' — edição e pagamento local-first');
})();
