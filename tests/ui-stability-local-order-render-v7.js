const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const source=fs.readFileSync('release-ui-stability.js','utf8');
const listeners={};
let renderCount=0;
let timerSeq=0;
const timers=new Map();
const originalSave=function saveSentinel(){};
const originalRecordSave=function recordSaveSentinel(){};
const activePage={id:'pedidos',scrollTop:0,scrollLeft:0,querySelectorAll:()=>[]};

const document={
  activeElement:null,
  head:{appendChild(){}},
  body:{appendChild(){}},
  querySelector(sel){if(sel==='.page.active')return activePage;if(sel==='#modal.show')return null;return null},
  getElementById(){return null},
  contains(){return false},
  createElement(){return {classList:{add(){},remove(){}},appendChild(){},set hidden(v){this._hidden=v},get hidden(){return this._hidden}}},
  addEventListener(type,fn){(listeners[type]||(listeners[type]=[])).push(fn)}
};

const window={
  renderOrders(){renderCount++},
  cloudPullRemoteIfNewer(){return true},
  save:originalSave,
  hlgbRecordSaveWithRetry:originalRecordSave,
  scrollX:0,scrollY:0,
  scrollTo(){},
  addEventListener(type,fn){(listeners['window:'+type]||(listeners['window:'+type]=[])).push(fn)}
};

const context={
  window,document,console,Date,Map,Set,Array,Object,String,Number,Math,JSON,Promise,
  MutationObserver:class{observe(){}disconnect(){}},
  requestAnimationFrame(fn){fn()},
  setTimeout(fn,ms){const id=++timerSeq;timers.set(id,{fn,ms});return id},
  clearTimeout(id){timers.delete(id)},
  setInterval(){return ++timerSeq},
  clearInterval(){}
};
context.global=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'release-ui-stability.js'});

assert.strictEqual(window.save,originalSave,'a correção visual não pode embrulhar save()');
assert.strictEqual(window.hlgbRecordSaveWithRetry,originalRecordSave,'a correção visual não pode embrulhar hlgbRecordSaveWithRetry');
assert.ok(window.HLGB_UI_STABILITY_GUARD.includes('v8-screen-stability-20261022'),'versão v8 deve estar ativa');

// 1) Sem ação local, redraw remoto continua agrupado.
window.cloudPullRemoteIfNewer();
window.renderOrders();
assert.strictEqual(renderCount,0,'redraw remoto deve continuar agrupado');
assert.ok(window.hlgbUiStabilityPending().includes('renderOrders'),'redraw remoto deve entrar na fila');

// 2) Reprodução real: clique em Salvar, depois chega o eco remoto do próprio save,
// e então syncAllData chama renderOrders. Esse render precisa ser local e imediato.
const saveTarget={closest(sel){return sel==='.modalSave'?this:null}};
for(const fn of listeners.click||[])fn({type:'click',target:saveTarget});
assert.ok(!window.hlgbUiStabilityPending().includes('renderOrders'),'clique em Salvar deve cancelar redraw remoto antigo');
window.cloudPullRemoteIfNewer(); // eco do próprio salvamento
window.renderOrders();
assert.strictEqual(renderCount,1,'render do próprio salvamento deve acontecer imediatamente mesmo após eco remoto');
assert.ok(!window.hlgbUiStabilityPending().includes('renderOrders'),'render do save não pode ficar na fila remota');
assert.strictEqual(window.hlgbUiStabilityRemoteState().localCommit,true,'janela de commit local deve estar ativa');

console.log('UI_STABILITY_LOCAL_ORDER_RENDER_V8_OK',JSON.stringify({renderCount,pending:window.hlgbUiStabilityPending(),state:window.hlgbUiStabilityRemoteState(),guard:window.HLGB_UI_STABILITY_GUARD}));
