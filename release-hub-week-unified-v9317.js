/* HLGB v93.18 — semana única e autoritativa no Hub Financeiro */
(function(){
'use strict';
const V='93.18';
const KEY='hlgb_hub_master_week_9258';
const sid=v=>String(v??'');
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function parseIso(v){const m=sid(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3],12):null}
function weekRange(v){const d=parseIso(v)||new Date(),m=new Date(d);m.setHours(12,0,0,0);m.setDate(m.getDate()-((m.getDay()+6)%7));const s=new Date(m);s.setDate(s.getDate()+6);return {selected:iso(d),start:iso(m),end:iso(s)}}
function isoWeekFromDate(v){const d=parseIso(v)||new Date(),x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()+3-((x.getDay()+6)%7));const y=x.getFullYear(),w1=new Date(y,0,4,12),wk=1+Math.round(((x-w1)/86400000-3+((w1.getDay()+6)%7))/7);return y+'-W'+String(wk).padStart(2,'0')}
function dateFromIsoWeek(v){const m=sid(v).match(/^(\d{4})-W(\d{2})$/);if(!m)return null;const y=+m[1],w=+m[2],jan4=new Date(y,0,4,12),day=jan4.getDay()||7,mon=new Date(jan4);mon.setDate(jan4.getDate()-day+1+(w-1)*7);return iso(mon)}
function editing(){return !!window.HLGB_HUB_EDITING||!!document.getElementById('hlgbHubEditor9270')}
function getCanonical(){const main=document.getElementById('hubFinanceWeek');let v=sid(main?.value);if(!/^\d{4}-\d{2}-\d{2}$/.test(v)){try{v=localStorage.getItem(KEY)||''}catch(e){}}if(!/^\d{4}-\d{2}-\d{2}$/.test(v))v=iso(new Date());return v}
let syncing=false;
function renderMain(){if(editing())return false;try{if(window.hlgbHubMaster9258?.renderAll)return !!window.hlgbHubMaster9258.renderAll()}catch(e){console.error('[HLGB semana '+V+'] master render',e)}try{if(typeof window.renderHubFinance==='function'){window.renderHubFinance();return true}}catch(e){console.error('[HLGB semana '+V+'] fallback render',e)}return false}
function publish(v,source){if(syncing)return false;if(!/^\d{4}-\d{2}-\d{2}$/.test(sid(v)))return false;syncing=true;try{const canonical=sid(v);try{localStorage.setItem(KEY,canonical)}catch(e){}const main=document.getElementById('hubFinanceWeek');if(main&&main.value!==canonical)main.value=canonical;const iw=isoWeekFromDate(canonical),week=document.getElementById('hlgbHubPeriodWeek');if(week&&week.value!==iw)week.value=iw;const mode=document.getElementById('hlgbHubPeriodMode');if(mode&&source==='period-week'&&mode.value!=='week')mode.value='week';let rendered=false;if(window.hlgbHubMaster9258?.setDate){try{rendered=window.hlgbHubMaster9258.setDate(canonical)!==false}catch(e){console.error('[HLGB semana '+V+'] master setDate',e)}}if(!rendered)rendered=renderMain();try{window.hlgbHubPeriodSummary?.render?.()}catch(e){console.error('[HLGB semana '+V+'] period render',e)}return rendered}finally{syncing=false}}
function shift(delta){const base=weekRange(getCanonical()),d=parseIso(base.start);d.setDate(d.getDate()+7*Number(delta||0));const next=iso(d);publish(next,'shift');return next}
function bind(){const page=document.getElementById('hubFinanceiro');if(!page)return false;const main=document.getElementById('hubFinanceWeek');if(main){main.dataset.hlgbUnified9318='1';main.onchange=()=>publish(main.value,'main-week')}const week=document.getElementById('hlgbHubPeriodWeek');if(week){week.dataset.hlgbUnified9318='1';week.onchange=()=>{const d=dateFromIsoWeek(week.value);if(d)publish(d,'period-week')}}const canonical=getCanonical(),iw=isoWeekFromDate(canonical);if(main&&main.value!==canonical)main.value=canonical;if(week&&week.value!==iw)week.value=iw;window.changeHubFinanceWeek=shift;return true}
const oldMode=window.hlgbHubPeriodModeChange;window.hlgbHubPeriodModeChange=function(){const out=typeof oldMode==='function'?oldMode.apply(this,arguments):undefined;setTimeout(bind,0);return out};
const oldPeriodRender=window.hlgbHubPeriodRender;window.hlgbHubPeriodRender=function(){const mode=document.getElementById('hlgbHubPeriodMode')?.value;if(mode==='week'){const w=document.getElementById('hlgbHubPeriodWeek'),d=dateFromIsoWeek(w?.value);if(d)publish(d,'period-week');return}return typeof oldPeriodRender==='function'?oldPeriodRender.apply(this,arguments):undefined};
function selfTest(){const f=[],a=weekRange('2026-10-07');if(a.start!=='2026-10-05'||a.end!=='2026-10-11')f.push('range');if(dateFromIsoWeek('2026-W41')!=='2026-10-05')f.push('week->date');if(isoWeekFromDate('2026-10-07')!=='2026-W41')f.push('date->week');return {ok:!f.length,failures:f}}
setTimeout(()=>{bind();window.HLGB_HUB_WEEK_9318_SELFTEST=selfTest()},500);setInterval(()=>{if(document.getElementById('hubFinanceiro'))bind()},2500);window.addEventListener('pageshow',()=>setTimeout(bind,50));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(bind,50)});
window.hlgbHubWeek9317={version:V,bind,publish,getCanonical,weekRange,isoWeekFromDate,dateFromIsoWeek,selfTest,renderMain,shift};
window.HLGB_HUB_WEEK_UNIFIED_9317=V;
console.info('[HLGB] Hub semana única v'+V+' ativa');
})();
