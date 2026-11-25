'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('release-payroll-month-wal-v9334.js','utf8');
async function scenario(mode){
 const callbacks=[],scripts=[],timers=[];let called=0,writes=0,clock=100000;
 const window={HLGB_RELEASE_VERSION:'94.51',__HLGB_AUTH_READY:mode!=='unauth'};
 const document={readyState:'loading',addEventListener:(name,f)=>{assert.equal(name,'DOMContentLoaded');callbacks.push(f)},querySelector:()=>null,createElement:()=>({dataset:{}}),head:{appendChild:s=>scripts.push(s)}};
 const ctx={window,document,console,Date:class extends Date{static now(){return clock}},setTimeout:(f)=>{timers.push(f);return 1},localStorage:{getItem(){throw Error('legacy prune may not read local queue')},setItem(){writes++},removeItem(){writes++}},indexedDB:{open(){throw Error('legacy prune may not open IDB')}}};
 if(mode!=='missing')window.hlgbHubFinanceWal9451={status:()=>({reconcileBusy:mode==='busy'}),reconcile:async(reason)=>{called++;assert.equal(reason,'legacy-payroll-month-prune');if(mode==='reject')throw Error('offline');return {results:[{id:'old',ok:true,removed:{total:2,blocked:''}},{id:'new',ok:false,removed:{total:1,blocked:'operation-changed'}}]}}};
 vm.createContext(ctx);vm.runInContext(src,ctx);const api=window.hlgbPayrollMonthWal9334;
 assert.equal(scripts.length,0);assert.equal(callbacks.length,1);
 api.loadReliableGuard();assert.equal(callbacks.length,1);assert.equal(scripts.length,0);
 document.readyState='interactive';
 if(mode!=='fallback')window.HLGB_PAYROLL_RELIABLE_SAVE_GUARD_9344='93.45';
 callbacks[0]();api.loadReliableGuard();assert.equal(scripts.length,mode==='fallback'?1:0);
 if(mode==='fallback'){scripts[0].onerror();api.loadReliableGuard();assert.equal(scripts.length,1)}
 const out=await api.prune();assert.equal(writes,0);assert.equal(called,['unauth','missing','busy'].includes(mode)?0:1);
 assert.equal(out.removed,['normal','fallback'].includes(mode)?2:0);
 if(mode==='normal'){assert.equal((await api.prune()).reason,'cooldown');assert.equal(called,1);clock+=31000;assert.equal((await api.prune()).removed,2);assert.equal(called,2)}
 console.log('PASS payroll '+mode)
}
(async()=>{for(const mode of ['normal','unauth','missing','busy','reject','fallback'])await scenario(mode)})().catch(e=>{console.error(e);process.exit(1)});
