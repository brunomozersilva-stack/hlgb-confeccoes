/* HLGB v93.37 — ponte central de login tardio + profiler passivo de intervalos.
   Carregado primeiro no boot estável para que módulos release não percam o login
   quando a sessão já foi restaurada antes de seus scripts serem executados. */
(function(){
'use strict';

/* ------------------------------------------------------------------
   Ponte central de hlgbAfterLogin.
   Mantém o registro original, mas garante que cada callback rode uma única vez
   quando o app já estiver aberto. Não grava dados, não limpa filas e não força
   sincronização por conta própria.
   ------------------------------------------------------------------ */
(function installLateLoginBridge9337(){
  if(window.HLGB_LATE_LOGIN_BRIDGE_9337)return;
  const V='93.37', pending=new Set();
  let base=null,wrapped=null,poll=null;
  const ready=()=>{
    try{
      const app=document.getElementById('appShell');
      if(!app)return false;
      if(app.querySelector?.('.page.active'))return true;
      const s=getComputedStyle(app);
      return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'&&app.getClientRects().length>0;
    }catch(e){return false}
  };
  function once(cb){
    let done=false;
    const fn=function(){
      if(done)return;
      done=true;fn.__hlgbDone=true;pending.delete(fn);
      return cb.apply(this,arguments);
    };
    fn.__hlgbDone=false;return fn;
  }
  function flush(){
    if(!ready())return false;
    for(const fn of [...pending]){
      if(fn.__hlgbDone){pending.delete(fn);continue}
      const delay=Math.max(0,Number(fn.__hlgbDelay)||0);
      setTimeout(()=>{try{fn()}catch(e){console.warn('[HLGB v93.37] callback tardio',e)}},delay);
    }
    return true;
  }
  function install(){
    const cur=window.hlgbAfterLogin;
    if(typeof cur!=='function')return false;
    if(cur.__hlgbLateBridge9337)return true;
    base=cur;
    wrapped=function(cb,delay){
      if(typeof cb!=='function')return base.apply(this,arguments);
      const fn=once(cb);fn.__hlgbDelay=delay;
      pending.add(fn);
      let out;
      try{out=base.call(this,fn,delay)}catch(e){console.warn('[HLGB v93.37] registro afterLogin legado',e)}
      if(ready())setTimeout(()=>{try{fn()}catch(e){console.warn('[HLGB v93.37] callback imediato',e)}},Math.max(0,Number(delay)||0));
      return out;
    };
    wrapped.__hlgbLateBridge9337=true;
    wrapped.__hlgbBase=base;
    window.hlgbAfterLogin=wrapped;
    return true;
  }
  function stamp(){
    try{
      const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;
      if(cur<93.37)window.HLGB_RELEASE_VERSION=V;
      const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V;
    }catch(e){}
  }
  function maintain(){install();stamp();flush()}
  window.HLGB_LATE_LOGIN_BRIDGE_9337=V;
  window.hlgbLateLoginBridge9337={version:V,ready,install,flush,pending:()=>pending.size};
  maintain();
  let tries=0;poll=setInterval(()=>{tries++;maintain();if(tries>=120){clearInterval(poll);poll=null}},250);
  window.addEventListener?.('pageshow',maintain);
  window.addEventListener?.('focus',maintain);
  window.addEventListener?.('online',maintain);
  document.addEventListener?.('visibilitychange',()=>{if(!document.hidden)maintain()});
})();

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
console.info('[HLGB] Runtime profiler v'+V+' + ponte de login tardio v93.37 ativos');
})();
