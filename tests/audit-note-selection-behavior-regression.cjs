const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('app9240.html','utf8');
const start=html.indexOf('function renderQueue(){',html.indexOf('function selectedQueue()'));
const source=html.slice(start,html.indexOf('\nwindow.groupNote9202=',start));
let rows=[{id:'test-100',clientName:'TESTE',productName:'PECA',qty:3,unitPrice:10}];
let writes=0,controls=[],markup='';
const box={
  get innerHTML(){return markup},
  set innerHTML(value){writes++;markup=value;controls=[...value.matchAll(/class="nqSelect9202" type="checkbox" value="([^"]+)"/g)].map(m=>({value:m[1],checked:false}));},
  querySelector(){return markup?{}:null},
  querySelectorAll(selector){return selector.endsWith(':checked')?controls.filter(c=>c.checked):controls}
};
const selection=new Set();
const ctx=vm.createContext({ensurePanel:()=>true,openRows:()=>rows,document:{getElementById:()=>box},window:{hlgbSelectedNotes9235:selection},q:x=>Math.max(0,Number(x)||0),esc2:String,money2:String});
vm.runInContext(source+';this.render=renderQueue;',ctx);
ctx.render();
controls[0].checked=true;
const focusedControl=controls[0];
for(let i=0;i<30;i++)ctx.render();
assert.equal(writes,1,'observer must not replace unchanged live controls');
assert.equal(controls[0],focusedControl,'focus target survives unrelated updates');
assert.equal(controls[0].checked,true,'click selection survives observer refresh');
rows[0].qty=2;
ctx.render();
assert.equal(writes,2,'real remote quantity change updates the table');
assert.equal(controls[0].checked,true,'selection survives real data update');
controls[0].checked=false;
rows[0].qty=1;
ctx.render();
assert.equal(controls[0].checked,false,'deselection survives data update');
selection.add('test-100');
rows=[];
ctx.render();
assert.equal(controls.length,0,'removed queue records are not resurrected');
rows=[{id:'other',qty:1,unitPrice:10}];
ctx.render();
assert.equal(controls[0].checked,false,'stale selection cannot select another record');
console.log('PASS note queue selection and observer stability');

// Exercise the actual async cloud-refresh wrapper, including changes made
// while its network request is pending and rows no longer available remotely.
(async()=>{
 const begin=html.indexOf('const prevRefresh9236=');
 const refreshSource=html.slice(begin,html.indexOf('\nfunction stamp9236',begin));
 let finishLoad, rendered;
 let checked=[{value:'test-100'},{value:'removed'}];
 const refreshContext=vm.createContext({
  window:{hlgbRefreshNotes9215:async()=>true},
  document:{querySelectorAll:()=>checked},
  loadCloudQueue9236:()=>new Promise(resolve=>{finishLoad=resolve}),
  renderFresh9236:ids=>{rendered=Array.from(ids)},console
 });
 vm.runInContext(refreshSource,refreshContext);
 const pending=refreshContext.window.hlgbRefreshNotes9215();
 await new Promise(setImmediate);
 finishLoad([{id:'test-100'}]);await pending;
 assert.deepEqual(rendered,['test-100'],'refresh preserves only selected active records');
 const pendingDeselect=refreshContext.window.hlgbRefreshNotes9215();
 await new Promise(setImmediate);checked=[];
 finishLoad([{id:'test-100'}]);await pendingDeselect;
 assert.deepEqual(rendered,[],'refresh respects deselection during the request');
 console.log('PASS authoritative refresh selection');
})().catch(error=>{console.error(error);process.exitCode=1});
