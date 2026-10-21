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

assert.notStrictEqual(window.renderOrders,undefined,'renderOrders deve continuar disponível');
assert.strictEqual(window.save,originalSave,'a correção visual não pode embrulhar save()');
assert.strictEqual(window.hlgbRecordSaveWithRetry,originalRecordSave,'a correção visual não pode embrulhar hlgbRecordSaveWithRetry');
assert.ok(window.HLGB_UI_STABILITY_GUARD.includes('v7-screen-stability-20261021'),'versão v7 deve estar ativa');

// 1) Uma origem remota abre a janela anti-pulo.
window.cloudPullRemoteIfNewer();
assert.strictEqual(window.hlgbUiStabilityRemoteState().remote,true,'janela remota deve estar ativa');

// 2) O usuário clica em salvar depois dessa origem remota.
for(const fn of listeners.pointerdown||[])fn({type:'pointerdown'});
window.renderOrders();
assert.strictEqual(renderCount,1,'render local após clique deve acontecer imediatamente');
assert.ok(!window.hlgbUiStabilityPending().includes('renderOrders'),'render local não pode ficar na fila remota');

// 3) Um redraw realmente remoto, sem nova interação, continua agrupado.
window.cloudPullRemoteIfNewer();
window.renderOrders();
assert.strictEqual(renderCount,1,'redraw remoto deve continuar agrupado, sem executar imediatamente');
assert.ok(window.hlgbUiStabilityPending().includes('renderOrders'),'redraw remoto deve entrar na fila anti-pulo');

// 4) Se o usuário agir antes da fila remota rodar, a ação local deve vencer e cancelar o redraw atrasado.
for(const fn of listeners.pointerdown||[])fn({type:'pointerdown'});
window.renderOrders();
assert.strictEqual(renderCount,2,'novo render local deve executar imediatamente');
assert.ok(!window.hlgbUiStabilityPending().includes('renderOrders'),'fila remota antiga deve ser cancelada pela ação local');

console.log('UI_STABILITY_LOCAL_ORDER_RENDER_V7_OK',JSON.stringify({renderCount,pending:window.hlgbUiStabilityPending(),guard:window.HLGB_UI_STABILITY_GUARD}));
