const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=fs.readFileSync('release-interaction-lock-v9434.js','utf8');
const start=file.indexOf('function queue(name,fn,ctx,args){');
const end=file.indexOf('function observeModal(){',start);
assert(start>=0&&end>start,'queue and incoming renderer region exists');
let locked=true;
const received=[],window={hlgbRenderIncomingRecord:(m)=>received.push(m)},queues=new Map();
const state={blocked:0,flushed:0,lastBlocked:'',lastFlushAt:''};
const context={window,queues,state,Date,Map,Set,Array,Object,String,console,
 editing:()=>locked,relevant:name=>name==='hlgbRenderIncomingRecord',
 setLock:()=>{},snap:()=>({}),restore:()=>{},requestAnimationFrame:()=>{},
 clearTimeout:()=>{},setTimeout:()=>1,QUIET_MS:140,
 flushTimer:null,replaying:false};
vm.createContext(context);
vm.runInContext(file.slice(start,end),context);
assert.equal(context.wrapIncoming(),true,'incoming renderer wrapped');
window.hlgbRenderIncomingRecord('products');
window.hlgbRenderIncomingRecord('payroll');
window.hlgbRenderIncomingRecord('products');
assert.equal(state.blocked,3);
assert.equal(queues.size,2,'distinct modules must not replace each other');
assert.deepEqual([...queues.keys()],['hlgbRenderIncomingRecord::products','hlgbRenderIncomingRecord::payroll']);
locked=false;
context.flush();
assert.deepEqual(received,['products','payroll'],'both modules must be delivered after unlock');
assert.equal(queues.size,0);
assert.equal(state.flushed,2);
console.log('PASS incoming modules queued independently; repeat within same module coalesced; both flushed');
