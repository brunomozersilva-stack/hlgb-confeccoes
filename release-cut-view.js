(function(){'use strict';
function arr(n){try{return Array.isArray(db&&db[n])?db[n]:[]}catch(e){return[]}}
function num(v){v=Number(v);return isFinite(v)?Math.max(0,v):0}
function ord(id){return arr('orders').find(function(o){return String(o&&o.id)===String(id)})||null}
function expected(c){var o=ord(c&&c.orderId);if(!o||!Array.isArray(o.grade))return 0;return o.grade.filter(function(g){return String(g&&g.productId||'')===String(c&&c.productId||'')}).reduce(function(s,g){return s+num(g&&g.qty)},0)}
function hasFinishedCoverage(c){
  var need=expected(c);
  if(need<=0)return false;
  return arr('cuts').some(function(x){return x&&String(x.id)!==String(c.id)&&String(x.orderId)===String(c.orderId)&&String(x.productId||'')===String(c.productId||'')&&String(x.status||'').toLowerCase()==='finalizado'&&num(x.pieces)>=need});
}
function parentOrderTombstoned(c){
  try{
    if(!c||c.orderId==null||ord(c.orderId))return false;
    var snap=hlgbRecordSnapshots&&hlgbRecordSnapshots.orders;
    var row=snap&&typeof snap.get==='function'?snap.get(String(c.orderId)):null;
    return !!(row&&row.deleted_at);
  }catch(e){return false}
}
function obsolete(c){
  return !!(c&&String(c.status||'').toLowerCase()==='planejado'&&(hasFinishedCoverage(c)||parentOrderTombstoned(c)));
}
function clean(){try{var cuts=arr('cuts'),keep=cuts.filter(function(c){return !obsolete(c)});if(keep.length===cuts.length)return false;db.cuts=keep;try{if(typeof renderCuts==='function')renderCuts()}catch(e){}try{if(typeof renderProjection==='function')renderProjection()}catch(e){}return true}catch(e){return false}}

/* v5: este módulo carrega cedo e protege apenas trabalho de boot que não deve
   executar antes da interface autenticada ficar visível. Não interfere em leitura
   de registros, save, WAL, Supabase nem nas regras de negócio. */
var cutGateInstalls=0,hiddenRenderGateInstalls=0;
function nextCutOriginal(f){return f&&(
  f.__original||f.__hlgb9307Original||f.__hlgb9306Original||null
)}
function cutGatePresent(fn){var seen=new Set(),f=fn,n=0;while(typeof f==='function'&&n++<48&&!seen.has(f)){seen.add(f);if(f.__hlgb9306EarlyBoot===true&&f.__hlgb9306EarlyKind==='cut-sync')return true;f=nextCutOriginal(f)}return false}
function installCutAuthGate(){
  var f=window.syncFinalizedCutsToProduction;
  if(typeof f!=='function'||cutGatePresent(f))return false;
  var gated=function(){
    if(window.__HLGB_AUTH_READY!==true){window.__HLGB_PREAUTH_CUT_BLOCKED_9397=(Number(window.__HLGB_PREAUTH_CUT_BLOCKED_9397)||0)+1;return false}
    return f.apply(this,arguments);
  };
  gated.__hlgb9306EarlyBoot=true;
  gated.__hlgb9306EarlyKind='cut-sync';
  gated.__hlgbCutViewAuthGate9397=true;
  gated.__original=f;
  window.syncFinalizedCutsToProduction=gated;
  cutGateInstalls++;
  return true;
}

function appVisible(){
  try{var a=document.getElementById('appShell');if(!a)return false;var s=getComputedStyle(a);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'&&a.getClientRects().length>0}catch(e){return false}
}
function sessionRestoringHidden(){
  try{
    var boot=typeof cloudBootstrapping!=='undefined'?cloudBootstrapping:window.cloudBootstrapping;
    var token=typeof cloudAccessToken!=='undefined'?cloudAccessToken:window.cloudAccessToken;
    var user=typeof cloudUser!=='undefined'?cloudUser:window.cloudUser;
    return window.__HLGB_AUTH_READY!==true&&boot===true&&!!token&&!!(user&&(user.id||user.email))&&!appVisible();
  }catch(e){return false}
}
function hiddenRenderGatePresent(fn){var seen=new Set(),f=fn,n=0;while(typeof f==='function'&&n++<48&&!seen.has(f)){seen.add(f);if(f.__hlgb9398HiddenBootRender===true)return true;f=f.__original||null}return false}
function installHiddenRestoreRenderGate(){
  var f=window.renderAll;
  if(typeof f!=='function'||hiddenRenderGatePresent(f))return false;
  var gated=function(){
    if(sessionRestoringHidden()){
      window.__HLGB_HIDDEN_BOOT_RENDER_BLOCKED_9398=(Number(window.__HLGB_HIDDEN_BOOT_RENDER_BLOCKED_9398)||0)+1;
      return false;
    }
    return f.apply(this,arguments);
  };
  gated.__hlgb9398HiddenBootRender=true;
  gated.__original=f;
  window.renderAll=gated;
  hiddenRenderGateInstalls++;
  return true;
}

var incoming=window.hlgbRenderIncomingRecord;if(typeof incoming==='function'){window.hlgbRenderIncomingRecord=function(module){var r=incoming.apply(this,arguments);if(module==='cuts'||module==='orders')setTimeout(clean,0);return r}}
[0,25,75,150,300,600,1000,1800].forEach(function(ms){setTimeout(installCutAuthGate,ms)});
/* O atraso garante que o Call Trace do Auditor fique por baixo desta trava. Assim,
   uma renderização realmente bloqueada não é registrada como render oculto executado. */
[2600,4000,6000,9000].forEach(function(ms){setTimeout(installHiddenRestoreRenderGate,ms)});
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(function(){installCutAuthGate();installHiddenRestoreRenderGate();setTimeout(clean,800);setTimeout(clean,2600);setTimeout(clean,5200)},0)}catch(e){}
window.hlgbCutViewGuard={version:'v5',installCutAuthGate:installCutAuthGate,installHiddenRestoreRenderGate:installHiddenRestoreRenderGate,status:function(){return {version:'v5',cutGateInstalls:cutGateInstalls,blockedPreAuthCutSync:Number(window.__HLGB_PREAUTH_CUT_BLOCKED_9397)||0,guarded:cutGatePresent(window.syncFinalizedCutsToProduction),hiddenRenderGateInstalls:hiddenRenderGateInstalls,hiddenBootRendersBlocked:Number(window.__HLGB_HIDDEN_BOOT_RENDER_BLOCKED_9398)||0,hiddenRenderGuarded:hiddenRenderGatePresent(window.renderAll)}}};
window.HLGB_CUT_VIEW_GUARD='v5';
})();