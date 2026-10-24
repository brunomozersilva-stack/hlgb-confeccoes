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

/* v4: o módulo de Corte já carrega cedo. Ele instala somente a trava de corte→produção
   antes da autenticação; não interfere em leitura de registros, save, WAL ou Supabase.
   Usa o mesmo marker esperado pelo Sync Guard para não criar uma segunda camada depois. */
var cutGateInstalls=0;
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

var incoming=window.hlgbRenderIncomingRecord;if(typeof incoming==='function'){window.hlgbRenderIncomingRecord=function(module){var r=incoming.apply(this,arguments);if(module==='cuts'||module==='orders')setTimeout(clean,0);return r}}
[0,25,75,150,300,600,1000,1800].forEach(function(ms){setTimeout(installCutAuthGate,ms)});
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(function(){installCutAuthGate();setTimeout(clean,800);setTimeout(clean,2600);setTimeout(clean,5200)},0)}catch(e){}
window.hlgbCutViewGuard={version:'v4',installCutAuthGate:installCutAuthGate,status:function(){return {version:'v4',cutGateInstalls:cutGateInstalls,blockedPreAuthCutSync:Number(window.__HLGB_PREAUTH_CUT_BLOCKED_9397)||0,guarded:cutGatePresent(window.syncFinalizedCutsToProduction)}}};
window.HLGB_CUT_VIEW_GUARD='v4';
})();