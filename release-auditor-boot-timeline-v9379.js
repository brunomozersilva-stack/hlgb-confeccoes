/* HLGB Auditor v93.79 — linha do tempo passiva do boot, sem alterar fluxo da aplicação. */
(function(){
'use strict';
if(window.HLGB_AUDITOR_BOOT_TIMELINE_9379)return;
const V='93.79',MAX=700,installedWall=Date.now(),installedMono=(()=>{try{return performance.now()}catch(e){return 0}})();
let routerStart=null;try{routerStart=JSON.parse(sessionStorage.getItem('hlgb_boot_router_start_v9379')||'null')}catch(e){}
const startedWall=Number(routerStart?.wall)||installedWall;
const session='boot-'+startedWall.toString(36)+'-'+Math.random().toString(36).slice(2,8);
const events=[];let seq=0,resourceObserver=null,authMarked=false;
const mono=()=>{try{return performance.now()}catch(e){return Date.now()-installedWall}};
const clean=v=>{if(v==null||typeof v==='string'||typeof v==='number'||typeof v==='boolean')return v;try{return JSON.parse(JSON.stringify(v))}catch(e){return String(v)}};
function mark(type,data={}){const row={seq:++seq,session,type:String(type||'event'),monoMs:+mono().toFixed(2),wallAt:new Date().toISOString(),data:clean(data)};events.push(row);if(events.length>MAX)events.splice(0,events.length-MAX);return row}
function resources(){return events.filter(x=>x.type==='resource')}
function snapshot(){return {kind:'hlgb_boot_timeline',version:V,session,startedWall,installedWall,installedMono,generatedAt:new Date().toISOString(),eventCount:events.length,events:events.slice(),resourceCount:resources().length,authReady:window.__HLGB_AUTH_READY===true,appVersion:String(window.HLGB_RELEASE_VERSION||''),coverage:{routerStartKnown:!!routerStart,preInstrumentationGapMs:Math.max(0,installedWall-startedWall),preInstrumentationMeasured:false}}}
window.HLGB_AUDITOR_BOOT_TIMELINE_9379=V;
window.hlgbBootTimeline9379={version:V,session,mark,snapshot,events,resources};
if(routerStart){mark('router:start',{wall:routerStart.wall,href:String(routerStart.href||''),preInstrumentationGapMs:Math.max(0,installedWall-startedWall),note:'intervalo anterior à instalação é conhecido pelo relógio, mas não instrumentado'})}else mark('measurement:unavailable',{feature:'router-start-stamp'});
mark('timeline:installed',{href:String(location.href||''),installedWall});
try{
 if(typeof PerformanceObserver==='function'){
  resourceObserver=new PerformanceObserver(list=>{for(const e of list.getEntries()){if(e.entryType!=='resource')continue;mark('resource',{name:String(e.name||''),initiatorType:String(e.initiatorType||''),startTime:+Number(e.startTime||0).toFixed(2),duration:+Number(e.duration||0).toFixed(2),transferSize:Number(e.transferSize||0)})}});
  resourceObserver.observe({type:'resource',buffered:true});
 }else mark('measurement:unavailable',{feature:'PerformanceObserver:resource'});
}catch(e){mark('measurement:unavailable',{feature:'PerformanceObserver:resource',error:String(e?.message||e)})}
function authProbe(){if(authMarked)return;if(window.__HLGB_AUTH_READY===true){authMarked=true;mark('auth:ready',{source:'__HLGB_AUTH_READY'})}}
window.addEventListener?.('hlgb:authenticated',()=>{authProbe();mark('auth:event',{ready:window.__HLGB_AUTH_READY===true})},{passive:true});
[0,25,75,150,300,600,1000,1800,3000,5000,8000].forEach(ms=>setTimeout(authProbe,ms));
window.addEventListener?.('DOMContentLoaded',()=>mark('document:domcontentloaded'),{once:true,passive:true});
window.addEventListener?.('load',()=>mark('window:load'),{once:true,passive:true});
console.info('[HLGB] linha do tempo passiva do boot v'+V+' ativa');
})();
