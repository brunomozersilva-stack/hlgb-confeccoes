const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const src=fs.readFileSync('release-ui-stability.js','utf8');

let now=1000, seq=0;
const timers=new Map();
function setTimeoutMock(fn,ms){const id=++seq;timers.set(id,{fn,ms});return id}
function clearTimeoutMock(id){timers.delete(id)}
function flushTimers(limit=100){
  let n=0;
  while(timers.size&&n++<limit){
    const [id,t]=timers.entries().next().value;
    timers.delete(id);t.fn();
  }
  assert(n<limit,'timer loop did not settle');
}
const root={
  id:'producao',scrollTop:140,scrollLeft:12,
  querySelectorAll(){return []},
  querySelector(){return null}
};
let renders=0;
const document={
  activeElement:null,
  querySelector(sel){
    if(sel==='.page.active')return root;
    if(sel==='#modal.show')return null;
    return null;
  },
  getElementById(){return null},
  contains(){return true},
  addEventListener(){}
};
const window={
  scrollX:7,scrollY:320,
  scrollTo(x,y){this.scrollX=x;this.scrollY=y},
  addEventListener(){},
  renderProduction(){
    renders++;
    this.scrollY=0;
    root.scrollTop=0;
  },
  hlgbRenderIncomingRecord(){
    this.renderProduction();
    this.renderProduction();
    this.renderProduction();
    return true;
  }
};
const ctx=vm.createContext({
  window,document,console,
  Date:{now:()=>now},
  Array,Math,
  setTimeout:setTimeoutMock,clearTimeout:clearTimeoutMock,
  setInterval(){return 1},clearInterval(){},
  requestAnimationFrame(fn){fn()},
  cloudUserIsEditing(){return false},
  cloudRemoteUpdatePending:false
});
vm.runInContext(src,ctx);

assert.equal(window.HLGB_UI_STABILITY_GUARD,'v1');
window.hlgbRenderIncomingRecord('production');
assert.equal(renders,0,'remote burst should not redraw immediately');
assert.deepEqual(Array.from(window.hlgbUiStabilityPending()),['renderProduction']);
flushTimers();
assert.equal(renders,1,'three remote redraw requests must collapse to one');
assert.equal(window.scrollY,320,'window scroll position must be restored');
assert.equal(root.scrollTop,140,'active page scroll position must be restored');

now=5000;
window.renderProduction();
assert.equal(renders,2,'local/manual render must remain immediate');

root.id='financeiro';
window.hlgbUiStabilityMarkRemote();
window.renderProduction();
flushTimers();
assert.equal(renders,2,'remote redraw for a hidden page must be skipped');

console.log('PASS UI stability: remote redraw burst collapsed, hidden-page redraw skipped, manual redraw immediate, scroll preserved.');
