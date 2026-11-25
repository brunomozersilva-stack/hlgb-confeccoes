'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('release-wal-confirmed-replay-v9333.js','utf8'),clone=x=>JSON.parse(JSON.stringify(x));
const key='production|p',base={key,module:'production',id:'p',opId:'same-op',data:{id:'p',planned:8},baseData:{id:'p',planned:5},baseUpdatedAt:'2026-11-24',deleted:false,updatedAt:'2026-11-25'};
async function scenario(mode){
 let remote=clone(base),local=clone(base),reads=0,puts=0,deletes=0,calls=0;
 const change=()=>{remote.data.planned=99;local.data.planned=99;};
 const indexedDB={open(){const r={};queueMicrotask(()=>{r.result={objectStoreNames:{contains:()=>true},close(){},transaction(){const tx={};tx.objectStore=()=>({getAll(){const g={};queueMicrotask(()=>{reads++;if(mode==='before-send'&&reads===2)change();if(mode==='read-fail'&&reads===2){g.onerror?.();return}g.result=remote?[clone(remote)]:[];g.onsuccess?.()});return g},get(){const g={};queueMicrotask(()=>{g.result=remote?clone(remote):undefined;g.onsuccess?.()});return g},put(x){puts++;remote=clone(x)},delete(){deletes++;remote=null}});queueMicrotask(()=>queueMicrotask(()=>tx.oncomplete?.()));return tx}};r.onsuccess?.()});return r}};
 const w={hlgbWalReplayBridge9332:{},addEventListener(){},hlgbRecordSaveWithRetry:async(m,id,data)=>{calls++;assert.equal(data.planned,8);if(mode==='reject-newer'){change();return {applied:false,reason:'conflict'}}if(mode==='ack-newer'){change();return {applied:true}}if(mode==='base-change'){remote.baseData.planned=7;local.baseData.planned=7;return {applied:true}}if(mode==='synthetic')return {applied:true,hlgbTombstonePruned:true};return {applied:true}}};
 const ctx={window:w,indexedDB,localStorage:{getItem:()=>JSON.stringify({entries:local?{[key]:local}:{}}),setItem:(k,v)=>{local=JSON.parse(v).entries[key]||null}},navigator:{onLine:true},document:{readyState:'complete',getElementById:id=>id==='appShell'?{}:null,querySelector:()=>null},getComputedStyle:()=>({display:'block'}),console,structuredClone:clone,queueMicrotask,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1};
 vm.createContext(ctx);vm.runInContext(src,ctx);
 const api=w.hlgbWalConfirmedReplay9333,first=api.run('fixture',true),second=mode==='parallel'?api.run('parallel',true):Promise.resolve(false);
 const [ok,duplicate]=await Promise.all([first,second]);assert.equal(duplicate,false);assert.equal(puts,0,'replay must not rewrite durable payload as bookkeeping');
 if(mode==='parallel'||mode==='ok'){assert.equal(ok,true);assert.equal(remote,null);assert.equal(local,null);assert.equal(calls,1);assert.equal(deletes,1)}
 else{assert.equal(ok,false);assert(remote&&local);assert.equal(deletes,0);assert.equal(calls,['before-send','read-fail'].includes(mode)?0:1);if(['before-send','reject-newer','ack-newer'].includes(mode))assert.equal(remote.data.planned,99);if(mode==='base-change')assert.equal(remote.baseData.planned,7)}
 console.log('PASS replay '+mode);
}
(async()=>{for(const m of ['ok','parallel','before-send','read-fail','reject-newer','ack-newer','base-change','synthetic'])await scenario(m)})().catch(e=>{console.error(e);process.exit(1)});
