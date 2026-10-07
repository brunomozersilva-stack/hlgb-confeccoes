/* HLGB v93.17 — semana única e autoritativa no Hub Financeiro */
(function(){
'use strict';
const V='93.17';
const KEY='hlgb_hub_master_week_9258';
const sid=v=>String(v??'');
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function parseIso(v){const m=sid(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3],12):null}
function weekRange(v){const d=parseIso(v)||new Date(),m=new Date(d);m.setHours(12,0,0,0);m.setDate(m.getDate()-((m.getDay()+6)%7));const s=new Date(m);s.setDate(s.getDate()+6);return {selected:iso(d),start:iso(m),end:iso(s)}}
function isoWeekFromDate(v){const d=parseIso(v)||new Date();const x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()+3-((x.getDay()+6)%7));const y=x.getFullYear(),w1=new Date(y,0,4,12),wk=1+Math.round(((x-w1)/86400000-3+((w1.getDay()+6)%7))/7);return y+'-W'+String(wk).padStart(2,'0')}
function dateFromIsoWeek(v){const m=sid(v).match(/^(\d{4})-W(\d{2})$/);if(!m)return null;const y=+m[1],w=+m[2],jan4=new Date(y,0,4,12),day=jan4.getDay()||7,mon=new Date(jan4);mon.setDate(jan4.getDate()-day+1+(w-1)*7);return iso(mon)}
function editing(){return !!window.HLGB_HUB_EDITING||!!document.getElementById('hlgbHubEditor9270')}
function getCanonical(){
 const main=document.getElementById('hubFinanceWeek');
 let v=sid(main?.value);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v)){try{v=localStorage.getItem(KEY)||''}catch(e){}}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v))v=iso(new Date());
 return v;
}
let syncing=false, renderQueued=false;
function publish(v,source){
 if(syncing)return false;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(sid(v)))return false;
 syncing=true;
 try{
   const canonical=sid(v);
   try{localStorage.setItem(KEY,canonical)}catch(e){}
   const main=document.getElementById('hubFinanceWeek');if(main&&main.value!==canonical)main.value=canonical;
   const week=document.getElementById('hlgbHubPeriodWeek');const iw=isoWeekFromDate(canonical);if(week&&week.value!==iw)week.value=iw;
   const mode=document.getElementById('hlgbHubPeriodMode');if(mode&&source==='period-week'&&mode.value!=='week')mode.value='week';
   if(window.hlgbHubMaster9258?.setDate){try{window.hlgbHubMaster9258.setDate(canonical)}catch(e){}}
   if(!editing()){
     try{window.hlgbHubPeriodSummary?.render?.()}catch(e){}
     if(window.hlgbHubMaster9258?.renderAll){try{window.hlgbHubMaster9258.renderAll()}catch(e){}}
   }
   return true;
 }finally{syncing=false}
}
function bind(){
 const page=document.getElementById('hubFinanceiro');if(!page)return false;
 const main=document.getElementById('hubFinanceWeek');
 if(main&&!main.dataset.hlgbUnified9317){
   main.dataset.hlgbUnified9317='1';
   main.addEventListener('change',()=>publish(main.value,'main-week'),true);
 }
 const week=document.getElementById('hlgbHubPeriodWeek');
 if(week&&!week.dataset.hlgbUnified9317){
   week.dataset.hlgbUnified9317='1';
   week.addEventListener('change',()=>{const d=dateFromIsoWeek(week.value);if(d)publish(d,'period-week')},true);
 }
 const canonical=getCanonical(),iw=isoWeekFromDate(canonical);
 if(main&&main.value!==canonical)main.value=canonical;
 if(week&&week.value!==iw)week.value=iw;
 return true;
}
function schedule(){if(renderQueued)return;renderQueued=true;setTimeout(()=>{renderQueued=false;bind()},40)}
const oldChange=window.changeHubFinanceWeek;
window.changeHubFinanceWeek=function(delta){
 const base=weekRange(getCanonical()),d=parseIso(base.start);d.setDate(d.getDate()+7*Number(delta||0));const next=iso(d);publish(next,'shift');return next;
};
window.changeHubFinanceWeek.__original=oldChange;
const oldMode=window.hlgbHubPeriodModeChange;
window.hlgbHubPeriodModeChange=function(){const out=typeof oldMode==='function'?oldMode.apply(this,arguments):undefined;setTimeout(bind,0);return out};
const oldPeriodRender=window.hlgbHubPeriodRender;
window.hlgbHubPeriodRender=function(){
 const mode=document.getElementById('hlgbHubPeriodMode')?.value;
 if(mode==='week'){
   const week=document.getElementById('hlgbHubPeriodWeek');const d=dateFromIsoWeek(week?.value);if(d)publish(d,'period-week');
 }
 return typeof oldPeriodRender==='function'?oldPeriodRender.apply(this,arguments):undefined;
};
const oldMasterRender=window.hlgbHubMaster9258?.renderAll;
if(typeof oldMasterRender==='function'&&!oldMasterRender.__hlgb9317){
 const w=function(){const canonical=getCanonical();const out=oldMasterRender.apply(this,arguments);setTimeout(()=>{const main=document.getElementById('hubFinanceWeek');if(main&&main.value!==canonical)main.value=canonical;const week=document.getElementById('hlgbHubPeriodWeek');if(week)week.value=isoWeekFromDate(canonical)},0);return out};
 w.__hlgb9317=true;w.__original=oldMasterRender;window.hlgbHubMaster9258.renderAll=w;
}
function selfTest(){const f=[];const a=weekRange('2026-10-07');if(a.start!=='2026-10-05'||a.end!=='2026-10-11')f.push('range');if(dateFromIsoWeek('2026-W41')!=='2026-10-05')f.push('week->date');if(isoWeekFromDate('2026-10-07')!=='2026-W41')f.push('date->week');return {ok:!f.length,failures:f}}
setInterval(()=>{if(document.getElementById('hubFinanceiro'))schedule()},1200);
window.addEventListener('pageshow',schedule);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()});
setTimeout(()=>{bind();window.HLGB_HUB_WEEK_9317_SELFTEST=selfTest()},900);
window.hlgbHubWeek9317={version:V,bind,publish,getCanonical,weekRange,isoWeekFromDate,dateFromIsoWeek,selfTest};
window.HLGB_HUB_WEEK_UNIFIED_9317=V;
console.info('[HLGB] Hub semana única v'+V+' ativa');
})();
