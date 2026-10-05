/* HLGB v92.92 — profiler passivo de intervalos dos módulos release */
(function(){
'use strict';
if(window.hlgbRuntimeProfiler9292)return;
const V='92.92';
const originalSetInterval=window.setInterval.bind(window),originalClearInterval=window.clearInterval.bind(window);
const rows=new Map(),history=[];const MAX_HISTORY=180;
const nowIso=()=>new Date().toISOString();
const perfNow=()=>{try{return performance.now()}catch(e){return Date.now()}};
const sid=v=>String(v??'');
function cleanStack(){try{return sid(new Error().stack).split('\n').slice(2,10).join('\n').slice(0,2600)}catch(e){return ''}}
function pushHistory(row){history.push(row);if(history.length>MAX_HISTORY)history.splice(0,history.length-MAX_HISTORY)}
window.setInterval=function(callback,delay){
 const args=Array.prototype.slice.call(arguments,2),ms=Math.max(0,Number(delay)||0),createdAt=nowIso(),stack=cleanStack();
 if(typeof callback!=='function'){
   const id=originalSetInterval.apply(window,[callback,delay].concat(args));
   rows.set(id,{id:String(id),delayMs:ms,createdAt,stack,kind:'string',fires:0,totalDurationMs:0,maxDurationMs:0,lastDurationMs:0,lastFireAt:'',clearedAt:''});return id;
 }
 let id;
 const rec={id:'',delayMs:ms,createdAt,stack,kind:'function',fires:0,totalDurationMs:0,maxDurationMs:0,lastDurationMs:0,lastFireAt:'',clearedAt:'',slowFires:0,callbackPreview:sid(callback).replace(/\s+/g,' ').slice(0,260)};
 const wrapped=function(){
   const t0=perfNow();rec.fires++;rec.lastFireAt=nowIso();
   try{return callback.apply(this,arguments)}finally{
     const d=Math.max(0,perfNow()-t0);rec.lastDurationMs=+d.toFixed(2);rec.totalDurationMs=+(rec.totalDurationMs+d).toFixed(2);rec.maxDurationMs=Math.max(rec.maxDurationMs,rec.lastDurationMs);if(d>=80)rec.slowFires++;
   }
 };
 id=originalSetInterval.apply(window,[wrapped,delay].concat(args));rec.id=String(id);rows.set(id,rec);return id;
};
window.clearInterval=function(id){const rec=rows.get(id);if(rec&&!rec.clearedAt){rec.clearedAt=nowIso();pushHistory({...rec})}rows.delete(id);return originalClearInterval(id)};
function snapshot(){
 const active=[...rows.values()].map(x=>({...x,avgDurationMs:x.fires?+(x.totalDurationMs/x.fires).toFixed(2):0}));
 active.sort((a,b)=>b.maxDurationMs-a.maxDurationMs||a.delayMs-b.delayMs);
 const suspect=active.filter(x=>x.maxDurationMs>=60||x.slowFires>0||x.delayMs<=5000).slice(0,80);
 return {kind:'hlgb_runtime_interval_profile',version:V,generatedAt:nowIso(),activeCount:active.length,active:active.slice(0,140),suspect,cleared:history.slice(-80)};
}
window.hlgbRuntimeProfiler9292={version:V,snapshot,active:()=>[...rows.values()],history,originalSetInterval,originalClearInterval};
console.info('[HLGB] Runtime profiler v'+V+' ativo — intervalos release rastreados sem alterar cadência');
})();
