const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('release-notes.js','utf8');
let baseCalls=0,active=false;
const table={closest(sel){return sel==='.page'?{classList:{contains:c=>c==='active'&&active}}:null},querySelectorAll(){return[]},offsetParent:{}};
const document={
  getElementById(id){if(id==='appShell')return {};if(id==='projectionProductsTable')return table;return null},
  querySelector(sel){if(sel==='.page.active')return active?{contains:x=>x===table}:null;return null},
  querySelectorAll(){return[]},
  createElement(){return {dataset:{},style:{},remove(){}}},
  head:{appendChild(){}},readyState:'complete'
};
const ctx={window:null,document,console,setTimeout:fn=>0,clearTimeout(){},getComputedStyle(){return{display:'block',visibility:'visible',opacity:'1'}},db:{orders:[],noteQueue:[]},hlgbRecordSnapshots:{},renderProjection(){baseCalls++;return 'ok'}};
ctx.window=ctx;ctx.__HLGB_AUTH_READY=true;
vm.createContext(ctx);vm.runInContext(src,ctx);
assert.equal(ctx.HLGB_NOTE_QUEUE_RENDER_GUARD,'v7');
assert.equal(ctx.renderProjection(),false,'dashboard/fora da projeção não pode renderizar');
assert.equal(baseCalls,0,'render base não deve executar fora da página ativa');
active=true;
assert.equal(ctx.renderProjection(),'ok','projeção ativa deve continuar renderizando');
assert.equal(baseCalls,1);
ctx.__HLGB_AUTH_READY=false;
assert.equal(ctx.renderProjection(),false,'pré-login não deve renderizar');
assert.equal(baseCalls,1);
console.log('OK notes projection active guard v93.92');
