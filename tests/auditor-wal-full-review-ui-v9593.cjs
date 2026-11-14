'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('release-auditor-autocorrect-v9448.js','utf8');
const handlers={},downloads=[],writes=[];
let cardHtml='',detailHtml='',called=0,receivedMax=null;
const status={textContent:''};
const button={disabled:false,addEventListener(evt,fn){handlers[evt]=fn}};
const details={set innerHTML(v){detailHtml=v},get innerHTML(){return detailHtml},querySelector(){return null}};
const card={setAttribute(){},set innerHTML(v){cardHtml=v},get innerHTML(){return cardHtml},
 querySelector(selector){
  if(selector==='#hlgbWalReview9593')return button;
  if(selector==='#hlgbWalReviewStatus9593')return status;
  if(selector==='#hlgbWalReviewDetail9593')return details;
  return null;
 }};
const report={kind:'hlgb_autocorrect_report',version:'94.48'};
const doc={querySelector:()=>null,getElementById:id=>id==='hlgbAuditorResult'?{prepend(){}}:
 id==='hlgbAuditorAutoCorrect9448Card'?card:null,createElement:()=>card};
const win={__HLGB_AUTH_READY:true,__HLGB_TEST__:true,HLGB_RELEASE_VERSION:'94.48',
 addEventListener(){},hlgbAuditorAutoCorrect9447:{
  async verifyWalReadOnly9593(limit,onProgress){
   called++;receivedMax=limit;onProgress({done:22,total:22});
   return {mode:'read-only',attempted:true,total:22,checked:22,matched:2,different:3,missing:17,unverified:0,
    removed:0,status:'not-confirmed',items:[{module:'routePlans',id:'route-1',opId:'op-1',status:'missing'}],errors:[]};
  }
 }};
const context={window:win,document:doc,console,Date,Promise,Map,Set,Object,Array,JSON,
 String,Number,structuredClone,URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},
 Blob,localStorage:{setItem(...args){writes.push(args)}},navigator:{userAgent:'Safari fake'},
 setTimeout(){return 1},clearTimeout(){}};
vm.createContext(context);vm.runInContext(source,context);
const summary={passes:1,stopReason:'verificar',needsCode:[{id:'sync:indexeddb-wal',detail:'22'}],businessBlocked:[],
 knownGaps:[],productionResidual:{after:{candidateCount:0}},
 triage:{signal:{indexedDbWal:{status:'ok',count:22,items:[{module:'routePlans',id:'route-1',opId:'op-1'}]}}},
 walProof:{mode:'read-only',attempted:true,checked:8,matched:0,different:3,missing:5,unverified:14,removed:0,
  status:'partially-unverified',items:[]}};
(async()=>{
 assert.equal(win.hlgbAuditorAutoCorrect9448.render(summary),true);
 assert(cardHtml.includes('hlgbWalReview9593'),'manual review is visible near safe export');
 assert(!button.disabled);
 await handlers.click();
 assert.equal(called,1);
 assert.equal(receivedMax,60,'explicit request checks all local operations up to safe bounded 60');
 assert.equal(button.disabled,false);
 assert.match(status.textContent,/Conferidas 22 de 22/);
 assert.match(status.textContent,/Removidas: 0/);
 assert(detailHtml.includes('route-1'));
 assert(detailHtml.includes('hlgbWalReviewDownload9593'));
 assert.equal(win.hlgbAuditorAutoCorrect9448.state.lastWalReview9593.checked,22);
 assert.equal(writes.length,0,'manual comparison does not write localStorage');
 console.log('PASS v95.93: expanded WAL review button, progress, safe details and zero mutations.');
})().catch(e=>{console.error(e);process.exitCode=1});
