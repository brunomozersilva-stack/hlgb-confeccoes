/* HLGB Auditor v93.79 — linha do tempo passiva do boot, sem alterar fluxo da aplicação. */
(function(){
'use strict';
if(window.HLGB_AUDITOR_BOOT_TIMELINE_9379)return;
const V='93.79',MAX=700,startedWall=Date.now(),startedMono=(()=>{try{return performance.now()}catch(e){return 0}})();
const session='boot-'+startedWall.toString(36)+'-'+Math.random().toString(36).slice(2,8);
const events=[];let seq=0,resourceObserver=null;
const mono=()=>{try{return performance.now()}catch(e){return Date.now()-startedWall}};
const clean=v=>{if(v==null||typeof v==='string'||typeof v==='number'||typeof v==='boolean')return v;try{return JSON.parse(JSON.stringify(v))}catch(e){return String(v)}};
function mark(type,data={}){const row={seq:++seq,session,type:String(type||'event'),monoMs:+mono().toFixed(2),wallAt:new Date().toISOString(),data:clean(data)};events.push(row);if(events.length>MAX)events.splice(0,events.length-MAX);return row}
function resources(){return events.filter(x=>x.type==='resource')}
function snapshot(){return {kind:'hlgb_boot_timeline',version:V,session,startedWall,startedMono,generatedAt:new Date().toISOString(),eventCount:events.length,events:events.slice(),resourceCount:resources().length,authReady:window.__HLGB_AUTH_READY===true,appVersion:String(window.HLGB_RELEASE_VERSION||'')}}
window.HLGB_AUDITOR_BOOT_TIMELINE_9379=V;
window.hlgbBootTimeline9379={version:V,session,mark,snapshot,events,resources};
mark('router:timeline-installed',{href:String(location.href||'')});
try{
 if(typeof PerformanceObserver==='function'){
  resourceObserver=new PerformanceObserver(list=>{for(const e of list.getEntries()){if(e.entryType!=='resource')continue;mark('resource',{name:String(e.name||''),initiatorType:String(e.initiatorType||''),startTime:+Number(e.startTime||0).toFixed(2),duration:+Number(e.duration||0).toFixed(2),transferSize:Number(e.transferSize||0)})}});
  resourceObserver.observe({type:'resource',buffered:true});
 }else mark('measurement:unavailable',{feature:'PerformanceObserver:resource'});
}catch(e){mark('measurement:unavailable',{feature:'PerformanceObserver:resource',error:String(e?.message||e)})}
window.addEventListener?.('hlgb:authenticated',()=>mark('auth:event',{ready:window.__HLGB_AUTH_READY===true}),{passive:true});
window.addEventListener?.('load',()=>mark('window:load'),{once:true,passive:true});
console.info('[HLGB] linha do tempo passiva do boot v'+V+' ativa');
})();
