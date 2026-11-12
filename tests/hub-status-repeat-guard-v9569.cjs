'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','release-hub-primary-v9323.js'),'utf8');
const clock={ms:Date.parse('2026-11-12T23:10:25Z')};
class ClockDate extends Date {static now(){return clock.ms}}
const entries=[{id:'elaine-fixture',description:'Exemplo',status:'Previsto',date:'2026-11-09',realizedAt:''},
 {id:'messias-fixture',description:'Outro exemplo',status:'Previsto',date:'2026-11-09',realizedAt:''}];
const db={hubFinanceEntries:entries};
const remote=new Map(entries.map(x=>[x.id,{...x}]));
const calls=[],deferred=[],alerts=[],notices=[];
const delivery={
 save(row,deleted,opts){
  calls.push({id:row.id,to:row.status,deleted,source:opts.source,original:opts.original?.status});
  return new Promise((resolve,reject)=>deferred.push({row,resolve,reject}));
 }
};
const window={db,hlgbHubDelivery9324:delivery,addEventListener(){},
 hlgbHubMaster9258:{setDate(){}},renderHubFinance(){}};
const document={getElementById(){return null},addEventListener(){}};
const sandbox={window,document,db,console,Date:ClockDate,Map,Set,Math,JSON,Number,Promise,
 setTimeout(){},queueMicrotask,alert(msg){alerts.push(msg)},setCloudStatus(msg){notices.push(msg)},
 localSaveOnly(){},renderHubFinance(){},renderHubDue9185(){},MutationObserver:undefined};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'release-hub-primary-v9323.js'});
const toggle=window.toggleHubFinanceEntry;
assert.equal(typeof toggle,'function');
assert.equal(typeof window.hlgbHubPrimary9323.statusGuard,'function');
async function confirmNext(){
 const next=deferred.shift();
 assert(next,'expected RPC');
 remote.set(next.row.id,{...next.row});
 const i=db.hubFinanceEntries.findIndex(x=>x.id===next.row.id);
 if(i>=0)db.hubFinanceEntries[i]={...next.row};
 next.resolve({applied:true,remoteVerified:true,revision:2,data:{...next.row}});
 await Promise.resolve();
}
(async()=>{
 const first=toggle('elaine-fixture');
 assert.equal(calls.length,1,'first click submits one RPC');
 assert.equal(await toggle('elaine-fixture'),false,'second click during save is suppressed');
 assert.equal(calls.length,1,'in-flight repeat must never write');
 await confirmNext();
 assert.equal((await first).remoteVerified,true);
 assert.equal(remote.get('elaine-fixture').status,'Realizado');
 clock.ms+=2200; // repro: two writes about 2 seconds apart had reverted Realizado to Previsto
 assert.equal(await toggle('elaine-fixture'),false,'rapid second activation after ACK cannot reverse status');
 assert.equal(calls.length,1,'repeat after ACK must not send an inverse RPC');
 assert.equal(remote.get('elaine-fixture').status,'Realizado');
 assert.equal(window.hlgbHubPrimary9323.statusGuard().repeatBlocked,2);
 assert(notices.some(x=>x.includes('confirmado na nuvem')),'user gets visible explanation');
 // Independent record still works while first is in cooldown.
 const other=toggle('messias-fixture');
 assert.equal(calls.length,2);
 await confirmNext();await other;
 assert.equal(remote.get('messias-fixture').status,'Realizado');
 // A deliberate reversal is possible after the safety interval, never permanently locked.
 clock.ms+=8100;
 const undo=toggle('elaine-fixture');
 assert.equal(calls.length,3);
 assert.equal(calls[2].to,'Previsto');
 await confirmNext();await undo;
 assert.equal(remote.get('elaine-fixture').status,'Previsto');
 assert.equal(alerts.length,0);
 assert.equal(deferred.length,0);
 assert.equal(window.hlgbHubPrimary9323.statusGuard().inFlight,0);
 assert(source.includes('STATUS_REPEAT_GUARD_MS=8000'));
 assert(!source.includes('localStorage.removeItem'));
 console.log('PASS Hub status guard: one RPC per click, in-flight guard, post-ACK cooldown, independent records, explicit undo and no WAL mutation.');
})().catch(e=>{console.error(e);process.exitCode=1});
