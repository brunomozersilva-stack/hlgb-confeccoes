const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const src=fs.readFileSync('release-ui-stability.js','utf8');

let now=1000, seq=0,editing=false,modalOpen=false;
const timers=new Map();
function setTimeoutMock(fn,ms){const id=++seq;timers.set(id,{fn,ms});return id}
function clearTimeoutMock(id){timers.delete(id)}
function runOneTimer(){
  const x=timers.entries().next().value;if(!x)return false;
  const [id,t]=x;timers.delete(id);t.fn();return true;
}
function flushTimers(limit=100){
  let n=0;
  while(timers.size&&n++<limit)runOneTimer();
  assert(n<limit,'timer loop did not settle');
}
const root={
  id:'producao',scrollTop:140,scrollLeft:12,
  querySelectorAll(){return []},
  querySelector(){return null}
};
let renders=0,capacityRenders=0;
const document={
  activeElement:null,
  querySelector(sel){
    if(sel==='.page.active')return root;
    if(sel==='#modal.show')return modalOpen?{}:null;
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
  renderCapacityPlanning(){
    capacityRenders++;
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
  cloudUserIsEditing(){return editing},
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
window.hlgbUiStabilityNoteInteraction();
window.renderProduction();
assert.equal(renders,2,'local/manual render must remain immediate');

root.id='financeiro';
window.hlgbUiStabilityMarkRemote();
window.renderProduction();
flushTimers();
assert.equal(renders,2,'remote redraw for a hidden page must be skipped');

now=12000;
root.id='capacidadeProducao';root.scrollTop=210;window.scrollY=410;
window.hlgbUiStabilityMarkRemote();
window.renderCapacityPlanning();
window.renderCapacityPlanning();
window.renderCapacityPlanning();
assert.equal(capacityRenders,0,'capacity remote burst must be held before redraw');
flushTimers();
assert.equal(capacityRenders,1,'capacity repeated redraws must collapse to one stable render');
assert.equal(window.scrollY,410,'capacity redraw must preserve window scroll');
assert.equal(root.scrollTop,210,'capacity redraw must preserve active page scroll');

// Remote redraws must wait while the user is editing or a modal is open, then flush once.
now=16000;root.id='producao';editing=true;window.hlgbUiStabilityMarkRemote();window.renderProduction();
assert.equal(renders,2,'editing must prevent immediate remote redraw');
assert(runOneTimer(),'queued edit timer must exist');
assert.equal(renders,2,'queued redraw must stay deferred while editing');
assert.deepEqual(Array.from(window.hlgbUiStabilityPending()),['renderProduction']);
editing=false;flushTimers();
assert.equal(renders,3,'deferred remote redraw must execute after editing ends');

now=20000;modalOpen=true;window.hlgbUiStabilityMarkRemote();window.renderProduction();
assert(runOneTimer(),'queued modal timer must exist');
assert.equal(renders,3,'open modal must keep remote redraw deferred');
modalOpen=false;flushTimers();
assert.equal(renders,4,'queued redraw must execute after modal closes');

console.log('PASS UI stability: bursts collapse, hidden redraws skip, manual redraws stay immediate, scroll survives and edit/modal deferral flushes safely.');
