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
function obsolete(c){return !!(c&&String(c.status||'').toLowerCase()==='planejado'&&hasFinishedCoverage(c))}
function clean(){try{var cuts=arr('cuts'),keep=cuts.filter(function(c){return !obsolete(c)});if(keep.length===cuts.length)return false;db.cuts=keep;try{if(typeof renderCuts==='function')renderCuts()}catch(e){}try{if(typeof renderProjection==='function')renderProjection()}catch(e){}return true}catch(e){return false}}
var incoming=window.hlgbRenderIncomingRecord;if(typeof incoming==='function'){window.hlgbRenderIncomingRecord=function(module){var r=incoming.apply(this,arguments);if(module==='cuts'||module==='orders')setTimeout(clean,0);return r}}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(function(){setTimeout(clean,800);setTimeout(clean,2600);setTimeout(clean,5200)},0)}catch(e){}
window.HLGB_CUT_VIEW_GUARD='v2';
})();
