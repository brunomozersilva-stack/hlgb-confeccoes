/* HLGB Comercial — núcleo puro de provisões, preserva fórmulas legadas. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGB_PAYROLL_PROVISION_CORE_9649=api})(typeof window!=='undefined'?window:null,function(){
'use strict';
function create(deps={}){
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
function provisionHistory(e){return Array.isArray(e?.provisionPaidHistory)?e.provisionPaidHistory:[]}
function terminationHistory(e){return Array.isArray(e?.terminationPaidHistory)?e.terminationPaidHistory:[]}
function sameYear(a,b){return String(a||'').slice(0,4)===String(b||'').slice(0,4)}
function eligibleMonth(e,y,m){
 try{if(typeof deps.eligibleMonth==='function')return !!deps.eligibleMonth(e,y,m)}catch(_){ }
 if(!e?.hireDate)return false;const start=new Date(y,m-1,1,12),end=new Date(y,m,0,12),hire=new Date(e.hireDate+'T12:00:00'),term=e.terminationDate?new Date(e.terminationDate+'T12:00:00'):null,a=hire>start?hire:start,b=term&&term<end?term:end;return b>=a&&(Math.floor((b-a)/86400000)+1>=15)
}
function salaryAt(e,date){try{if(typeof deps.salaryAt==='function')return q(deps.salaryAt(e,date))}catch(_){}return q(e?.salary)}
function gross13Until(e,date){
 if(!e?.hireDate||!date)return 0;const y=+String(date).slice(0,4),target=+String(date).slice(5,7);let total=0;
 const copy={...e,terminationDate:e.terminationDate||date};
 for(let m=1;m<=target;m++){if(!eligibleMonth(copy,y,m))continue;const last=String(new Date(y,m,0).getDate()).padStart(2,'0');total+=salaryAt(e,`${y}-${String(m).padStart(2,'0')}-${last}`)/12}
 return Math.round(total*100)/100;
}
function paid13(e,date,excludeSourceId){
 return provisionHistory(e).filter(x=>x&&x.type==='13º'&&(!date||String(x.date||'')<=date)&&(!date||sameYear(x.date,date))&&(!excludeSourceId||sid(x.sourceId)!==sid(excludeSourceId))).reduce((s,x)=>s+q(x.value),0)
}
function remaining13(e,date,excludeSourceId){return Math.max(0,Math.round((gross13Until(e,date)-paid13(e,date,excludeSourceId))*100)/100)}
function provisionEventIndex(hist,id,sourceType,sourceId){return hist.findIndex(x=>sid(x?.id)===sid(id)||(sourceType&&sourceId&&sid(x?.sourceType)===sid(sourceType)&&sid(x?.sourceId)===sid(sourceId)))}
function upsertProvision(e,event){const next=clone(e)||{},h=provisionHistory(next).map(clone),i=provisionEventIndex(h,event.id,event.sourceType,event.sourceId);if(i>=0)h[i]={...h[i],...clone(event)};else h.push(clone(event));next.provisionPaidHistory=h;return next}
function removeProvisionSource(e,sourceType,sourceId){const next=clone(e)||{};next.provisionPaidHistory=provisionHistory(next).filter(x=>!(sid(x?.sourceType)===sid(sourceType)&&sid(x?.sourceId)===sid(sourceId)));return next}

return {provisionHistory,terminationHistory,sameYear,eligibleMonth,salaryAt,gross13Until,paid13,remaining13,provisionEventIndex,upsertProvision,removeProvisionSource};
}
return Object.freeze({create});
});
