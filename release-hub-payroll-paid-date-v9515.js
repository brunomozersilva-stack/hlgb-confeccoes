/* HLGB v95.15 — visão do Hub por data efetiva do pagamento da Folha.
   Somente leitura: NUNCA grava lançamentos, pagamentos, WAL ou histórico.
   O consolidado mensal legado fica preservado no banco, mas não é somado duas vezes. */
(function(){
'use strict';
const V='95.15';
if(window.hlgbHubPayrollPaidDate9515?.version===V)return;
const sid=v=>String(v??'');
const dateOk=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(new Date(s+'T12:00:00').getTime());
const monthOk=s=>/^\d{4}-(0[1-9]|1[0-2])$/.test(s);
const amountCents=v=>Math.round(Number(v)*100);
function currentDb(){try{return typeof db!=='undefined'?db:window.db}catch(_){return window.db||{}}}
function rows(hubRows, payrollRows){
 const base=Array.isArray(hubRows)?hubRows:[];
 const payroll=Array.isArray(payrollRows)?payrollRows:[];
 const groups=new Map(),blocked=new Set(),months=new Set(),seen=new Set();
 for(const r of payroll){
  if(!r||r.paid!==true)continue;
  const month=sid(r.month),date=sid(r.paidAt).slice(0,10),id=sid(r.id);
  if(!monthOk(month))continue;
  months.add(month);
  if(!id||seen.has(id)){blocked.add(month);continue}
  seen.add(id);
  // Nenhuma estimativa de valor ou data: registros incompletos não substituem o original.
  const cents=amountCents(r.paidValue);
  if(!dateOk(date)||!Number.isSafeInteger(cents)||cents<=0){blocked.add(month);continue}
  const key=month+'|'+date;
  const g=groups.get(key)||{month,date,cents:0,count:0};
  g.cents+=cents;g.count++;groups.set(key,g);
 }
 for(const month of blocked)months.delete(month);
 // Quando ainda não há prova da data/valor, manter o consolidado antigo em vez de inventar.
 const output=base.filter(e=>{
  if(!e)return false;
  const type=sid(e.sourceType),month=sid(e.sourceId);
  if(type==='payroll_month'&&months.has(month))return false;
  if(type==='payroll'&&months.has(sid(e.description).split('— ').pop()))return false;
  return true;
 });
 for(const g of groups.values()){
  if(!months.has(g.month))continue;
  const n=Number(g.month.replace('-',''))*100000000+Number(g.date.replace(/-/g,''));
  output.push({
   id:-n,flow:'Saída',description:'Folha paga em '+g.date+' — competência '+g.month,
   value:g.cents/100,date:g.date,category:'Funcionários',subcategory:'Folha de pagamento',
   person:'',origin:'',status:'Realizado',acceptedMethods:['Pix'],realizedAt:g.date,
   sourceType:'payroll_paid_date_view',sourceId:g.month,paidCount:g.count,
   __hlgbPayrollByPaidAt9515:true
  });
 }
 return output;
}
function effectiveRows(){const d=currentDb();return rows(d?.hubFinanceEntries,d?.payroll)}
function weekEntries(range){
 const start=sid(range?.start),end=sid(range?.end);
 if(!dateOk(start)||!dateOk(end))return [];
 return effectiveRows().filter(e=>{const d=sid(e?.date).slice(0,10);return d>=start&&d<=end});
}
let observing=null,observed=null;
function markReadOnly(){
 if(typeof document==='undefined')return;
 const el=document.getElementById('hubFinanceEntriesTable');if(!el)return;
 for(const tr of el.querySelectorAll('tr')){
  if(!sid(tr.textContent).includes('Folha paga em '))continue;
  const cell=tr.lastElementChild;
  if(cell?.querySelector('button'))cell.textContent='Consulta — altere na Folha';
 }
}
function observe(){
 if(typeof document==='undefined'||typeof MutationObserver!=='function')return;
 const el=document.getElementById('hubFinanceEntriesTable');if(!el||el===observed)return;
 observing?.disconnect();observed=el;
 observing=new MutationObserver(markReadOnly);
 observing.observe(el,{childList:true,subtree:true});markReadOnly();
}
function install(){
 if(typeof window.hlgb916HubWeekEntries==='function'&&window.hlgb916HubWeekEntries!==weekEntries)
  window.hlgb916HubWeekEntries=weekEntries;
 // A rotina antiga grava a soma de todo o mês na data de um pagamento anterior.
 // Evita que a reconciliação automática mova dinheiro retroativamente entre semanas.
 if(typeof window.hlgb9163SyncAllPayrollMonths==='function'&&!window.hlgb9163SyncAllPayrollMonths.__byPaidDate9515){
  const stop=async()=>({skipped:true,reason:'Leitura por paidAt; sem alteração financeira automática'});
  stop.__byPaidDate9515=true;
  window.hlgb9163SyncAllPayrollMonths=stop;
 }
 observe();
}
window.hlgbHubPayrollPaidDate9515={
 version:V,rows,effectiveRows,weekEntries,install,
 status:()=>({version:V,mode:'read-only-paidAt',automaticMonthlyResyncDisabled:!!window.hlgb9163SyncAllPayrollMonths?.__byPaidDate9515})
};
install();
if(typeof document!=='undefined'){
 document.addEventListener('DOMContentLoaded',install,{once:true});
 if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>{install();markReadOnly()},0);
 // Apenas religa o observador quando a tela do Hub é recriada; nenhuma escrita.
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')install()});
}
})();
