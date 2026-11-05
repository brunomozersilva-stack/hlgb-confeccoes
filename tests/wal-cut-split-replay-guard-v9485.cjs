'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('release-wal-confirmed-replay-v9333.js','utf8');
const original={id:'cut-1',status:'Em corte',pieces:[{qty:15}]};
const split={id:'cut-1',status:'Desmembrado por modelo',hiddenByModelSplitV1:true,pieces:[{qty:15}]};
const store={entries:{
 'cuts|cut-1':{key:'cuts|cut-1',module:'cuts',id:'cut-1',opId:'old-op',data:original,deleted:false},
 'cuts|cut-2':{key:'cuts|cut-2',module:'cuts',id:'cut-2',opId:'other-op',data:{id:'cut-2',pieces:[{qty:20}]},deleted:false},
 'routePlans|route-1':{key:'routePlans|route-1',module:'routePlans',id:'route-1',opId:'route-op',data:{id:'route-1',stops:['A']},deleted:false}
}};
const local=new Map([['hlgb_durable_wal_v1',JSON.stringify(store)]]);
const calls=[],reads=[];
const window={hlgbWalReplayBridge9332:{},
 cloudRequest:async(q)=>{reads.push(q);if(q.includes('eq.cut-1'))return [{module:'cuts',entity_id:'cut-1',revision:2,data:split,deleted_at:null}];if(q.includes('eq.cut-2'))return [{module:'cuts',entity_id:'cut-2',revision:3,data:{id:'cut-2',pieces:[{qty:99}]},deleted_at:null}];return []},
 hlgbRecordSaveWithRetry:async(module,id,data,deleted)=>{calls.push({module,id});return {applied:true,revision:2}},
 addEventListener(){},hlgbAfterLogin(){}};
const elements={appShell:{},loginScreen:null};
const document={readyState:'loading',getElementById:id=>elements[id]||null,querySelector:()=>null,addEventListener(){},activeElement:null};
const ctx={window,document,navigator:{onLine:true},localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,String(v)),removeItem:k=>local.delete(k)},
 setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>1,clearInterval:()=>{},getComputedStyle:()=>({display:'block'}),
 indexedDB:undefined,console,Date,JSON,Object,Map,Set,Promise,Math,structuredClone,encodeURIComponent};
vm.createContext(ctx);vm.runInContext(src,ctx);
(async()=>{
 const ok=await window.hlgbWalConfirmedReplay9333.run('unit',true);
 assert.equal(ok,false,'Cut conflicts must remain pending');
 assert.equal(calls.length,1,'Only the unchanged other module should be attempted');
 assert.equal(calls[0].module,'routePlans');
 assert.equal(reads.length,2,'Cut proof should be read-only and per exact ID');
 const rest=JSON.parse(local.get('hlgb_durable_wal_v1')).entries;
 assert(rest['cuts|cut-1']&&rest['cuts|cut-2']);
 assert(!rest['routePlans|route-1']);
 assert.equal(rest['cuts|cut-1'].opId,'old-op');
 const results=window.hlgbWalConfirmedReplay9333.state.lastResult.results;
 assert(results.some(r=>r.reason==='cut-already-split-by-model'&&r.blocked));
 assert(results.some(r=>r.reason==='cut-remote-difference'&&r.blocked));
 assert(!calls.some(r=>r.module==='cuts'),'No conflicting Cut data may be sent');
 console.log('PASS v94.85: Cut WAL survives model-split and remote conflicts, while unrelated route replay is unchanged');
})().catch(e=>{console.error(e);process.exitCode=1});
