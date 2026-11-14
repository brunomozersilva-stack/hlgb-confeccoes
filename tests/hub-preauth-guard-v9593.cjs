'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const src=fs.readFileSync('release-hub-tombstone-online.js','utf8');
const events={},calls=[],timers=[],writes=[],storage=new Map();
const row={id:'confirmed-delete-9593',value:25,description:'Old tombstone'};
const db={hubFinanceEntries:[{...row}],orders:[{id:'unrelated'}]};
const screen={hidden:false,getAttribute:()=>null},window={
 __HLGB_AUTH_READY:false,
 addEventListener(name,fn){events[name]=fn},
 getComputedStyle:()=>({display:visible?'block':'none',visibility:'visible'}),
 renderHubFinance(){calls.push('finance')},
 renderHubWeekly(){calls.push('weekly')},
 renderHubDue9185(){calls.push('due')},
 hlgbHubPeriodSummary:{render(){calls.push('period')}},
};
let visible=false;
const context={window,db,console,document:{getElementById:id=>id==='appShell'?screen:null},
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{writes.push(k);storage.set(k,String(v))},
 removeItem:k=>storage.delete(k)},setTimeout(fn,delay){timers.push({fn,delay});return timers.length},
 hlgbRecordSnapshots:{hubFinanceEntries:new Map([[row.id,{data:{...row},deleted_at:'2026-11-14T00:00:00Z'}]])},
 hlgbRecordId:(_module,x)=>x.id,localSaveOnly(){calls.push('persist-local')},Date,JSON,Array,Map,Object};
window.localStorage=context.localStorage;window.db=db;window.hlgbRecordSnapshots=context.hlgbRecordSnapshots;
vm.createContext(context);vm.runInContext(src,context);
assert.equal(typeof window.hlgbHubBootRefresh9593.flush,'function');
assert.equal(typeof events['hlgb:authenticated'],'function');
const result=window.hlgbHubReconcileTombstones9410();
assert.equal(result.removed,1,'confirmed tombstone may still be pruned as before');
assert.equal(db.hubFinanceEntries.length,0);
assert.equal(db.orders.length,1);
assert.equal(calls.filter(x=>x!=='persist-local').length,0,
 'hub does not repaint before authentication');
assert.equal(window.hlgbHubBootRefresh9593.status().deferred,true);
window.__HLGB_AUTH_READY=true;
assert.equal(window.hlgbHubBootRefresh9593.flush(),false,'still hidden: defer rendering');
assert.equal(calls.filter(x=>x!=='persist-local').length,0);
visible=true;
assert.equal(window.hlgbHubBootRefresh9593.flush(),true,'render after visible login');
assert.deepEqual(calls.filter(x=>x!=='persist-local'),
 ['finance','weekly','due','period']);
assert.equal(window.hlgbHubBootRefresh9593.status().deferred,false);
assert.equal(window.hlgbHubBootRefresh9593.flush(),false,'second flush is idempotent');
assert.equal(calls.filter(x=>x==='finance').length,1);
assert(!writes.includes('hlgb_durable_wal_v1'),'no WAL deletion');
console.log('PASS v95.93: confirmed Hub tombstones still reconciled; render deferred until auth and visible shell, exactly once.');
