/* HLGB v93.18 — Hub master compatível e executável */
(function(){
'use strict';
const V='93.18';
const KEY='hlgb_hub_master_week_9258';
const sid=v=>String(v??'');
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
function parseIso(v){const m=sid(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3],12):null}
function weekRange(v){const d=parseIso(v)||new Date(),m=new Date(d);m.setHours(12,0,0,0);m.setDate(m.getDate()-((m.getDay()+6)%7));const s=new Date(m);s.setDate(s.getDate()+6);return {selected:iso(d),start:iso(m),end:iso(s),monday:m,sunday:s}}
function editing(){return !!window.HLGB_HUB_EDITING||!!document.getElementById('hlgbHubEditor9270')}
const legacyRender=typeof window.renderHubFinance==='function'?window.renderHubFinance:null;
function selectedDate(){const el=document.getElementById('hubFinanceWeek');let v=sid(el?.value);if(!/^\d{4}-\d{2}-\d{2}$/.test(v)){try{v=localStorage.getItem(KEY)||''}catch(e){}}if(!/^\d{4}-\d{2}-\d{2}$/.test(v))v=iso(new Date());if(el&&el.value!==v)el.value=v;try{localStorage.setItem(KEY,v)}catch(e){}return v}
function renderAll(){if(editing())return false;try{if(typeof legacyRender==='function'){legacyRender();return true}}catch(e){console.error('[HLGB Hub master '+V+'] render',e)}return false}
function setDate(v){const d=parseIso(v);if(!d)return false;const x=iso(d),el=document.getElementById('hubFinanceWeek');if(el)el.value=x;try{localStorage.setItem(KEY,x)}catch(e){}renderAll();return true}
function shiftWeek(delta){const r=weekRange(selectedDate()),d=parseIso(r.start);d.setDate(d.getDate()+7*Number(delta||0));return setDate(iso(d))}
function bind(){const el=document.getElementById('hubFinanceWeek');if(!el)return false;el.onchange=()=>setDate(el.value);window.changeHubFinanceWeek=shiftWeek;return true}
function selfTest(){const a=weekRange('2026-10-05'),b=weekRange('2026-10-12');return {ok:a.start==='2026-10-05'&&a.end==='2026-10-11'&&b.start==='2026-10-12'&&b.end==='2026-10-18'}}
setTimeout(()=>{bind();window.HLGB_HUB_9258_SELFTEST=selfTest()},300);
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(()=>{bind();renderAll()},150),0)}catch(e){}
window.hlgbHubMaster9258={version:V,selectedDate,setDate,shiftWeek,weekRange,renderAll,selfTest,editing,bind};
window.HLGB_HUB_MASTER_ACTIVE_9258=V;
console.info('[HLGB] Hub master v'+V+' ativo');
})();
