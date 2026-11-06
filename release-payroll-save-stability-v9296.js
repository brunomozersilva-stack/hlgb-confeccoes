/* HLGB v93.04 — Folha compartilhada: nuvem confirmada, sem folha paralela por usuário */
(function(){
'use strict';
const V='94.96';
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
/* v94.96: An explicit monthly fare has authority over the employee's
   automatic-transport eligibility flag, including when the flag is false.
   Empty override still uses the original eligibility/day/absence formula.
   Paid rows are not rewritten by this display-only calculation. */
function manualFare(row){
 if(!row||row.transportOverride===null||row.transportOverride===undefined||row.transportOverride==='')return null;
 const value=Number(row.transportOverride);
 return Number.isFinite(value)&&value>=0?Math.round(value*100)/100:null
}
function hasFareCalcMarker(fn){
 let seen=new Set(),current=fn;
 for(let i=0;i<40&&typeof current==='function'&&!seen.has(current);i++){
  if(current.__hlgbPayrollFare9489===true)return true;
  seen.add(current);current=current.__original
 }
 return false
}
function installFareCalculator(){
 const base=window.payrollCalc;
 if(typeof base!=='function'||hasFareCalcMarker(base))return false;
 const wrapped=function(row,employee){
  const c=base.apply(this,arguments);
  const manual=manualFare(row);
  if(manual===null||!c||typeof c!=='object')return c;
  const previous=Number(c.transport)||0;
  const gross=(Number(c.gross)||0)+manual-previous;
  const discounts=Number(c.discounts)||0;
  return {...c,transport:manual,gross,net:Math.max(0,gross-discounts)}
 };
 wrapped.__hlgbPayrollFare9489=true;
 wrapped.__original=base;
 window.payrollCalc=wrapped;
 return true
}
function ensureFareControls(){
 const page=document.getElementById('folhaPagamento'),
  fare=document.getElementById('payrollFareValue'),
  days=document.getElementById('payrollWorkDays');
 if(!page||!fare||!days)return false;
 let panel=document.getElementById('hlgbPayrollFare9489');
 if(!panel){
  panel=document.createElement('div');panel.id='hlgbPayrollFare9489';panel.className='panel';
  panel.innerHTML='<h2 style="margin:0 0 6px">🚌 Passagem / vale-transporte</h2>'+
   '<div class="sub" style="margin-bottom:10px">Defina o valor diário da passagem e os dias úteis do mês. Para ajustar apenas um funcionário por faltas, use Editar na linha dele.</div>'+
   '<div class="toolbar" id="hlgbPayrollFareFields9489" style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap"></div>';
  const first=page.querySelector('.panel');
  if(first)first.insertAdjacentElement('afterend',panel);else page.prepend(panel)
 }
 const host=panel.querySelector('#hlgbPayrollFareFields9489');
 if(!host)return false;
 for(const control of [fare,days]){
  const field=control.closest('.field');
  if(field&&field.parentElement!==host)host.appendChild(field)
 }
 const lab=fare.closest('.field')?.querySelector('label');
 if(lab)lab.textContent='Valor diário da passagem (R$)';
 return true
}
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
async function saveConfirmed(base,desired,verify){
 await ensureOnline();
 const id=sid(desired?.id||base?.id);if(!id)throw new Error('Registro da folha sem identificação.');
 const latest=cloudLatest(id)||base;
 const merged=cloudMerge(clone(base),clone(desired),clone(latest));
 status('☁️ Salvando folha compartilhada…','warn');
 const out=await saveFn()('payroll',id,clone(merged),false);
 if(!out||out.applied!==true)throw new Error('A nuvem não confirmou a alteração da folha.');
 const finalData=clone(out.data||merged);if(typeof verify==='function'&&!verify(finalData)){throw new Error('A nuvem respondeu, mas não confirmou o valor de passagem solicitado. Reabra o lançamento antes de tentar novamente.')}replaceLocal(id,finalData);saveLocal();redraw();status('✅ Folha salva e compartilhada','ok');return finalData;
}
function editPayrollRowShared(id){
 const r=findRow(id);if(!r)return alert('Folha não encontrada. Atualize a página e tente novamente.');
 const base=clone(r),e=findEmployee(r.employeeId)||{salary:r.salary||0},c=calc(r,e);
 if(typeof window.openModal!=='function')return alert('Não foi possível abrir a edição da folha.');
 window.openModal(`Folha — ${escs(r.employeeName||e.name||'Funcionário')}`,`
 <div class="grid">
  <div class="field"><label>Salário</label><input id="prSalary" type="number" step=".01" value="${c.salary}"></div>
  <div class="field"><label>Vale-transporte calculado</label><input value="${moneySafe(c.transport)}" disabled></div>
  <div class="field"><label>Passagem manual deste funcionário no mês (R$)</label><input id="prTransportOverride" type="number" min="0" step=".01" placeholder="${c.transport.toFixed(2)} (automático)" value="${manualFare(r)??''}"><small>Opcional. Ajuste para faltas; deixe vazio para calcular pelos dias úteis e faltas informadas.</small></div>
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
   const custom=document.getElementById('prTransportOverride')?.value?.trim()||'';
   if(custom!==''){
    const amount=Number(custom.replace(',','.'));
    if(!Number.isFinite(amount)||amount<0){
     alert('Informe um valor de passagem válido, maior ou igual a zero.');
     if(btn){btn.disabled=false;btn.textContent='Salvar alterações'}
     return false
    }
    desired.transportOverride=Math.round(amount*100)/100;
   }else desired.transportOverride=null;
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

/* v94.90: A specific monthly passage can be set from the employee page.
   It changes only one existing payroll record through the cloud-ACK path.
   It does not rewrite the employee, other months or paid amounts. */
function payrollMonth(){
 const v=document.getElementById('payrollMonth')?.value;
 return /^\d{4}-\d{2}$/.test(v||'')?v:new Date().toISOString().slice(0,7)
}
function employeePayrollRow(employeeId,month){
 return arr('payroll').find(r=>sid(r?.employeeId)===sid(employeeId)&&sid(r?.month)===sid(month))||null
}
function fareMonthInfo(employeeId,month){
 const emp=findEmployee(employeeId),row=employeePayrollRow(employeeId,month);
 if(!emp)return {status:'missing-employee',month};
 if(!row)return {status:'missing-payroll',month,name:emp.name};
 const manual=manualFare(row);
 return {status:row.paid?'paid':'ready',month,name:emp.name,
  manual,automatic:manual===null?q(calc(row,emp).transport):null,
  current:q(calc(row,emp).transport),hasTransport:emp.hasTransport!==false}
}
async function saveEmployeeFare(employeeId,month,value){
 const m=sid(month).trim(),id=sid(employeeId);
 if(!/^\d{4}-\d{2}$/.test(m))throw new Error('Selecione o mês da Folha.');
 const employee=findEmployee(id);
 if(!employee)throw new Error('Funcionário não encontrado. Atualize os cadastros.');
 const row=employeePayrollRow(id,m);
 if(!row)throw new Error('A Folha deste funcionário não está gerada para '+m+'. Gere a Folha do mês antes de ajustar a passagem.');
 if(row.paid)throw new Error('O pagamento já está marcado como PAGO. Reabra o pagamento na Folha antes de alterar a passagem, para não mudar valores pagos sem conferência.');
 const raw=sid(value).trim(),reset=raw==='';
 let amount=null;
 if(!reset){
  amount=Number(raw.replace(',','.'));
  if(!Number.isFinite(amount)||amount<0)throw new Error('Digite um valor de passagem válido, maior ou igual a zero.');
  amount=Math.round(amount*100)/100;
 }
 const base=clone(row),desired=clone(row);
 if(reset)desired.transportOverride=null;
 else desired.transportOverride=amount;
 desired.updatedAt=now();
 const verify=server=>reset?(server.transportOverride===undefined||server.transportOverride===null||server.transportOverride===''):manualFare(server)===amount;
 const saved=await saveConfirmed(base,desired,verify);
 if(!verify(saved))throw new Error('O valor não permaneceu no registro confirmado.');
 return {employeeId:id,month:m,manual:manualFare(saved),amount:q(calc(saved,employee).transport),recordId:sid(saved.id)}
}
function employeeFarePanel(id){
 const modal=document.getElementById('modal'),employee=findEmployee(id);
 if(!modal||!employee||modal.querySelector('#hlgbEmployeeFare9490'))return false;
 const anchor=modal.querySelector('.modalSave');
 if(!anchor)return false;
 const box=document.createElement('section');
 box.id='hlgbEmployeeFare9490';box.className='panel';
 box.style.cssText='margin:14px 0;padding:14px;border:1px solid #bcc9dc;border-radius:10px';
 box.innerHTML='<h3 style="margin:0 0 7px">🚌 Passagem deste funcionário</h3>'+
  '<div class="sub">Ajuste o valor total da passagem apenas nesta competência. Se houve faltas, informe o novo total. Salve a passagem no botão abaixo, separado do cadastro.</div>'+
  '<div class="grid" style="margin-top:10px">'+
  '<div class="field"><label>Mês da Folha</label><input id="hlgbFareMonth9490" type="month"></div>'+
  '<div class="field"><label>Passagem do funcionário neste mês (R$)</label><input id="hlgbFareAmount9490" type="number" min="0" step=".01" placeholder="Automático"></div></div>'+
  '<div id="hlgbFareHint9490" class="sub" role="status" style="margin:8px 0"></div>'+
  '<button id="hlgbFareSave9490" class="secondary" type="button">☁️ Salvar passagem deste mês</button>'+
  '<div id="hlgbFareResult9490" role="status" style="font-weight:600;margin-top:7px"></div>';
 anchor.insertAdjacentElement('beforebegin',box);
 const month=box.querySelector('#hlgbFareMonth9490'),amount=box.querySelector('#hlgbFareAmount9490');
 const hint=box.querySelector('#hlgbFareHint9490'),result=box.querySelector('#hlgbFareResult9490');
 const btn=box.querySelector('#hlgbFareSave9490');
 month.value=payrollMonth();
 function refresh(){
  const info=fareMonthInfo(id,month.value);
  amount.value=info.manual===null?'':sid(info.manual);amount.dataset.initialValue=amount.value;
  amount.disabled=info.status==='missing-payroll'||info.status==='paid';
  btn.disabled=amount.disabled;
  result.textContent='';
  hint.textContent=info.status==='missing-payroll'?
   'Folha ainda não gerada neste mês. Abra Folha e gere a competência primeiro.':
   info.status==='paid'?'Esta folha está PAGA. Reabra o pagamento para corrigir a passagem.':
   info.hasTransport===false?'Sem transporte automático no cadastro. Valor manual nesta competência entra no total da folha; deixe vazio para manter sem passagem. Atual: '+moneySafe(info.current)+'.':
   'Valor atual: '+moneySafe(info.current)+'. Deixe vazio para usar o cálculo automático de faltas e dias úteis.';
 }
 month.addEventListener('input',refresh);month.addEventListener('change',refresh);
 btn.addEventListener('click',async event=>{
  event.preventDefault();event.stopPropagation();
  btn.disabled=true;result.textContent='☁️ Confirmando a passagem na nuvem...';
  try{
   const proof=await saveEmployeeFare(id,month.value,amount.value);
   result.textContent='✅ Passagem '+moneySafe(proof.amount)+' confirmada na Folha '+proof.month+'.';
   result.style.color='#116a3a';
   refresh();
   result.textContent='✅ Passagem '+moneySafe(proof.amount)+' confirmada na Folha '+proof.month+'.';
  }catch(err){
   result.textContent='❌ '+sid(err?.message||err);
   result.style.color='#a11';
  }finally{
   btn.disabled=!!amount.disabled;
  }
 });
 refresh();
 return true
}
/* v94.92 — the legacy employee modal called save() and closed without
   any proof of a cloud ACK. Route its primary Save through remote readback.
   Never replace the local employee until remote identity/content is confirmed.
   The independent month-specific Passage button remains available. */
const employeeSaveState={attempts:0,confirmed:0,failed:0,partial:0,lastId:'',lastError:'',lastAt:''};
const employeeEditable=['name','productionLocationId','salary','hasTransport','benefitDefault','hireDate','pix','active'];
function employeeEqual(a,b){return JSON.stringify(a??null)===JSON.stringify(b??null)}
function employeeInputs(id){
 const original=findEmployee(id);if(!original)throw new Error('Funcionário não encontrado neste navegador.');
 const name=sid(document.getElementById('empName')?.value).trim();
 if(!name)throw new Error('Informe o nome do funcionário.');
 const salaryText=sid(document.getElementById('empSalary')?.value).trim();
 if(salaryText===''||!Number.isFinite(Number(salaryText))||Number(salaryText)<0)throw new Error('Salário inválido.');
 const locValue=sid(document.getElementById('empLocation')?.value).trim();
 const locId=locValue&&Number.isFinite(Number(locValue))?Number(locValue):null;
 const loc=arr('productionLocations').find(x=>sid(x?.id)===sid(locId));
 const out={
  name,productionLocationId:locId,companyName:loc?.name||original.companyName||'',
  salary:Number(salaryText),hasTransport:document.getElementById('empHasTransport')?.value!=='false',
  benefitDefault:Number(document.getElementById('empBenefit')?.value)||0,
  hireDate:sid(document.getElementById('empHire')?.value),
  pix:sid(document.getElementById('empPix')?.value),
  active:document.getElementById('empActive')?.value!=='false'
 };
 return out
}
async function fetchEmployeeCloud(id){
 const request=typeof window.cloudRequest==='function'?window.cloudRequest:null;
 if(!request)throw new Error('Consulta de confirmação no servidor indisponível. Cadastro não alterado.');
 const query='hlgb_records?select=module,entity_id,revision,data,deleted_at,updated_at&module=eq.employees&entity_id=eq.'+encodeURIComponent(sid(id))+'&limit=1';
 const rows=await request(query,{method:'GET'});
 const row=Array.isArray(rows)?rows[0]:null;
 if(!row||sid(row.module)!=='employees'||sid(row.entity_id)!==sid(id)||row.deleted_at||!Number.isInteger(+row.revision)||+row.revision<1||!row.data)throw new Error('Cadastro não encontrado ou não confirmado na nuvem.');
 return row
}
function employeeFareTouched(){
 const month=document.getElementById('hlgbFareMonth9490'),
  field=document.getElementById('hlgbFareAmount9490');
 return month&&field&&field.disabled!==true&&sid(field.value).trim()!==sid(field.dataset.initialValue??'').trim()
}
function employeeSaveMessage(message,bad=false){
 let el=document.getElementById('hlgbEmployeeSaveStatus9492');
 if(!el){
  const btn=document.querySelector('#modal .modalSave');
  if(!btn)return;
  el=document.createElement('div');el.id='hlgbEmployeeSaveStatus9492';
  el.setAttribute('role','status');
  el.style.cssText='margin:9px 0;font-weight:600;white-space:pre-wrap';
  btn.insertAdjacentElement('beforebegin',el)
 }
 el.textContent=message;el.style.color=bad?'#a11':'#116a3a'
}
async function saveEmployeeConfirmedFromModal(id,opened){
 const btn=document.querySelector('#modal .modalSave');
 if(!btn||btn.disabled||!document.getElementById('empName'))return false;
 employeeSaveState.attempts++;employeeSaveState.lastId=sid(id);employeeSaveState.lastAt=now();
 let employeeConfirmed=false;
 btn.disabled=true;btn.textContent='☁️ Confirmando cadastro na nuvem…';
 try{
  await ensureOnline();
  const fields=employeeInputs(id),remote=await fetchEmployeeCloud(id);
  const current=findEmployee(id);
  if(!current)throw new Error('Funcionário deixou de existir localmente.');
  // A locally edited but unacknowledged employee must not be silently replaced.
  for(const key of employeeEditable){
   if(!employeeEqual(opened?.[key],remote.data?.[key])){
    throw new Error('O cadastro local de '+(opened?.name||'funcionário')+' difere da nuvem ('+key+'). Não feche esta janela: preserve os valores e faça a conciliação.');
   }
  }
  const desired=clone(remote.data);
  for(const key of [...employeeEditable,'companyName'])desired[key]=fields[key];
  const changes=employeeEditable.filter(key=>!employeeEqual(remote.data?.[key],desired[key]));
  if(changes.includes('salary')){
   const previous=Number(remote.data.salary)||0,actual=Number(desired.salary)||0;
   const hist=Array.isArray(desired.salaryHistory)?clone(desired.salaryHistory):[];
   hist.push({id:'sal-'+Date.now()+'-'+Math.floor(Math.random()*10000),
    date:new Date().toISOString().slice(0,10),oldSalary:previous,newSalary:actual,
    percent:previous>0?(actual-previous)*100/previous:0,note:'Alteração feita pelo cadastro do funcionário'});
   desired.salaryHistory=hist
  }
  let verified=remote;
  if(changes.length||!employeeEqual(remote.data?.companyName,desired.companyName)){
   status('☁️ Salvando cadastro do funcionário…','warn');
   const result=await saveFn()('employees',sid(id),clone(desired),false);
   if(result?.applied!==true)throw new Error('Nuvem não confirmou a gravação do funcionário.');
   verified=await fetchEmployeeCloud(id);
   for(const key of [...employeeEditable,'companyName']){
    if(!employeeEqual(desired[key],verified.data[key]))throw new Error('A nuvem respondeu, mas o campo '+key+' ainda não foi confirmado. Não tente salvar novamente até conferir o registro.');
   }
  }
  Object.assign(current,clone(verified.data));
  if(opened&&typeof opened==='object')Object.assign(opened,clone(verified.data));
  saveLocal();employeeConfirmed=true;employeeSaveState.confirmed++;
  const month=document.getElementById('hlgbFareMonth9490');
  const amount=document.getElementById('hlgbFareAmount9490');
  if(employeeFareTouched()){
   btn.textContent='☁️ Confirmando passagem deste mês…';
   await saveEmployeeFare(id,month.value,amount.value);
  }
  try{window.renderEmployees?.();window.renderPayroll?.()}catch(e){}
  employeeSaveState.lastError='';
  employeeSaveMessage('✅ Cadastro e passagem confirmados na nuvem.');
  if(typeof window.closeModal==='function')window.closeModal();
  return true
 }catch(error){
  employeeSaveState.failed++;if(employeeConfirmed)employeeSaveState.partial++;
  employeeSaveState.lastError=sid(error?.message||error);
  employeeSaveMessage((employeeConfirmed?'⚠️ Cadastro confirmado; confira a passagem. ':'❌ Cadastro NÃO confirmado. ')+employeeSaveState.lastError,true);
  status('⚠️ Funcionário: salvamento não concluído','bad');
  console.error('[HLGB v94.92] employee save failed',error);
  return false
 }finally{btn.disabled=false;btn.textContent='Salvar alterações'}
}
function wrapEmployeeEditor(){
 const original=window.editEmployee;
 if(typeof original!=='function'||original.__hlgbFareEmployee9490)return false;
 const wrapped=function(id){
  const opened=clone(findEmployee(id));
  const out=original.apply(this,arguments);
  try{
   employeeFarePanel(id);
   if(opened&&typeof window.modalSave==='function'&&document.getElementById('empName')){
    window.modalSave=()=>saveEmployeeConfirmedFromModal(id,opened)
   }
  }catch(e){console.warn('[HLGB passagem/cadastro 94.92] formulário',e)}
  return out
 };
 wrapped.__hlgbFareEmployee9490=true;wrapped.__hlgbEmployeeConfirmed9492=true;
 wrapped.__original=original;
 window.editEmployee=wrapped;return true
}
function injectEmployeeFareButtons(){
 const table=document.getElementById('employeeTable');
 if(!table)return false;
 for(const btn of table.querySelectorAll('button[onclick*="editEmployee("]')){
  if(btn.parentElement?.querySelector('[data-hlgb-employee-fare-9490="'+btn.getAttribute('onclick')+'"]'))continue;
  const expr=btn.getAttribute('onclick')||'',match=expr.match(/editEmployee\((\d+)\)/);
  if(!match)continue;
  const extra=document.createElement('button');
  extra.type='button';extra.className='secondary';
  extra.textContent='🚌 Passagem';extra.dataset.hlgbEmployeeFare9490=expr;
  extra.setAttribute('data-hlgb-employee-fare-9490',expr);
  extra.addEventListener('click',()=>window.editEmployee(match[1]));
  btn.insertAdjacentElement('afterend',extra);
 }
 return true
}
function wrapEmployeeList(){
 const original=window.renderEmployees;
 if(typeof original!=='function'||original.__hlgbFareEmployeeList9490)return false;
 const wrapped=function(){
  const out=original.apply(this,arguments);
  try{injectEmployeeFareButtons()}catch(e){console.warn('[HLGB passagem 94.90] lista',e)}
  return out
 };
 wrapped.__hlgbFareEmployeeList9490=true;wrapped.__original=original;
 window.renderEmployees=wrapped;
 return true
}

function install(){
 installFareCalculator();ensureFareControls();
 wrapEmployeeEditor();wrapEmployeeList();injectEmployeeFareButtons();
 window.editPayrollRow=editPayrollRowShared;
 window.togglePayrollPaid=togglePayrollPaidShared;
 window.generatePayrollMonth=generatePayrollMonthShared;
 return true
}
install();setTimeout(install,400);setTimeout(install,1600);setTimeout(install,5000);
window.hlgbPayrollSaveStability9296={version:V,install,edit:editPayrollRowShared,togglePaid:togglePayrollPaidShared,generate:generatePayrollMonthShared,reconcileMonth,ensureFareControls,installFareCalculator,manualFare,saveEmployeeFare,fareMonthInfo,employeeFarePanel,injectEmployeeFareButtons,wrapEmployeeEditor,wrapEmployeeList,saveEmployeeConfirmedFromModal,employeeSaveState};
window.HLGB_PAYROLL_SAVE_STABILITY_9296=V;
console.info('[HLGB] Folha v'+V+' — compartilhada e confirmada na nuvem');
})();
