/* HLGB v93.09 — Vales: confirmação individual no banco e sincronização confiável com a folha */
(function(){
'use strict';
if(window.hlgbAdvanceSync9309)return;
const V='93.09-advance-sync';
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const now=()=>new Date().toISOString();
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}return window.db||null}
function arr(n){const d=dbRef();return Array.isArray(d?.[n])?d[n]:[]}
function replaceLocal(module,id,data){const d=dbRef();if(!d)return;d[module]=Array.isArray(d[module])?d[module]:[];const i=d[module].findIndex(x=>sid(x?.id)===sid(id));if(i>=0)d[module][i]=clone(data);else d[module].push(clone(data))}
function saveLocal(){try{window.localSaveOnly?.()}catch(e){}}
function rerender(){try{window.renderEmployeeAdvances?.()}catch(e){}try{window.renderPayroll?.()}catch(e){}try{window.renderAdvancePaidMonthly930?.()}catch(e){}}
function status(msg,type){try{window.setCloudStatus?.(msg,type||'warn')}catch(e){}}
async function saveRecord(module,id,data,deleted=false){
  if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Sincronização multiusuário indisponível.');
  const out=await window.hlgbRecordSaveWithRetry(module,sid(id),clone(data),!!deleted);
  if(!out||out.applied!==true)throw new Error(out?.reason||'A nuvem não confirmou a alteração.');
  return out.data||data;
}

/* Cadastro de vale: mantém a validação original, mas força a confirmação individual do novo registro. */
function installAdd(){
  const base=window.addEmployeeAdvance;
  if(typeof base!=='function'||base.__hlgb9309)return false;
  const wrapped=function(){
    const before=new Set(arr('employeeAdvances').map(x=>sid(x?.id)));
    const out=base.apply(this,arguments);
    const created=arr('employeeAdvances').find(x=>!before.has(sid(x?.id)));
    if(created){
      const id=sid(created.id),snapshot=clone(created);snapshot.updatedAt=snapshot.updatedAt||now();
      status('☁️ Salvando vale no banco…','warn');
      Promise.resolve().then(async()=>{
        try{
          const confirmed=await saveRecord('employeeAdvances',id,snapshot,false);
          replaceLocal('employeeAdvances',id,confirmed);saveLocal();rerender();
          status('✅ Online · vale arquivado no banco','ok');
        }catch(e){
          status('⚠️ Vale preservado no aparelho · aguardando sincronização','warn');
          console.error('[HLGB '+V+'] falha ao confirmar novo vale',id,e);
        }
      });
    }
    return out;
  };
  wrapped.__hlgb9309=true;wrapped.__original=base;window.addEmployeeAdvance=wrapped;return true;
}

/* Pagamento de vale: não usa persistDb genérico. Salva o vale e a linha exata da folha por registro. */
async function markPaid(id){
  const d=dbRef();if(!d)return;
  const a=arr('employeeAdvances').find(x=>sid(x?.id)===sid(id));
  if(!a||a.status==='Pago')return;
  const emp=arr('employees').find(e=>sid(e?.id)===sid(a.employeeId));
  if(!emp){alert('Funcionário não encontrado.');return}
  const month=a.month||(typeof window.payrollCurrentMonth==='function'?window.payrollCurrentMonth():new Date().toISOString().slice(0,7));
  const existingPayroll=arr('payroll').find(r=>sid(r?.employeeId)===sid(emp.id)&&sid(r?.month)===sid(month));
  let r=null;
  try{r=typeof window.ensureEmployeePayrollForMonth==='function'?window.ensureEmployeePayrollForMonth(emp,month):existingPayroll}catch(e){r=existingPayroll}
  if(!r){alert('Não foi possível lançar este vale na folha, pois o funcionário já está desligado nessa competência.');return}
  const nextA=clone(a),nextR=clone(r),aid=sid(a.id),rid=sid(r.id);
  nextR.advanceIds=Array.isArray(nextR.advanceIds)?nextR.advanceIds:[];
  if(!nextR.advanceIds.map(sid).includes(aid)){
    nextR.advance=(Number(nextR.advance)||0)+(Number(a.value)||0);
    nextR.advanceIds.push(aid);
  }
  nextR.updatedAt=now();
  nextA.status='Pago';nextA.paidAt=(typeof window.isoDate==='function'?window.isoDate(new Date()):new Date().toISOString().slice(0,10));nextA.posted=true;nextA.payrollRowId=r.id;nextA.updatedAt=now();
  status('☁️ Confirmando vale e desconto da folha no banco…','warn');
  let advConfirmed=null,payrollConfirmed=null;
  try{
    advConfirmed=await saveRecord('employeeAdvances',aid,nextA,false);
    payrollConfirmed=await saveRecord('payroll',rid,nextR,false);
    replaceLocal('employeeAdvances',aid,advConfirmed);
    replaceLocal('payroll',rid,payrollConfirmed);
    saveLocal();rerender();
    status('✅ Online · vale pago e desconto da folha arquivados','ok');
  }catch(e){
    /* Os helpers de gravação mantêm WAL durável; preservamos a intenção local e mostramos que ainda não foi confirmada. */
    replaceLocal('employeeAdvances',aid,advConfirmed||nextA);
    replaceLocal('payroll',rid,payrollConfirmed||nextR);
    saveLocal();rerender();
    status('⚠️ Vale preservado · sincronização ainda pendente','warn');
    console.error('[HLGB '+V+'] vale/folha aguardando sincronização',aid,rid,e);
    alert('O vale foi preservado neste aparelho, mas a nuvem ainda não confirmou tudo. Não será perdido: o sistema continuará tentando sincronizar.');
  }
}
markPaid.__hlgb9309=true;

function install(){
  installAdd();
  if(typeof window.markEmployeeAdvancePaid==='function'&&!window.markEmployeeAdvancePaid.__hlgb9309)window.markEmployeeAdvancePaid=markPaid;
  window.hlgbAdvanceSync9309={version:V,saveRecord,markPaid};
  return true;
}
install();setTimeout(install,400);setTimeout(install,1400);setTimeout(install,3500);
window.hlgbAdvanceSync9309={version:V,saveRecord,markPaid};
console.info('[HLGB] '+V+' ativo — vales e folha com confirmação individual no banco');
})();
