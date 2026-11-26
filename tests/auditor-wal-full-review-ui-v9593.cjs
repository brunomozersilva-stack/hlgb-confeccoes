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
  async verifyWalReadOnly9593(limit,onProgress,localEvidence){
   localEvidence([{module:'routePlans',id:'route-1',opId:'op-1',data:{id:'route-1',private:'DO_NOT_EXPORT'}}]);
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
 const api=win.hlgbAuditorAutoCorrect9448;
 assert.equal(api.walGuardEvidence9719().state,'unavailable');
 let scans=0;win.hlgbWalIdbGuard9536={status:()=>({probes:0,entryCount:0,indexedDbOnly:0}),ids:()=>new Set(['routePlans::PRIVATE_ID','orders::PRIVATE_ORDER']),probe:()=>{scans++;throw Error('must not scan')}};
 assert.equal(api.walGuardEvidence9719().entryCount,null);
 win.hlgbWalIdbGuard9536.status=()=>({probes:1,readFailed:true,entryCount:0});assert.equal(api.walGuardEvidence9719().state,'read-failed');assert.equal(api.walGuardEvidence9719().entryCount,null);
 win.hlgbWalIdbGuard9536.status=()=>({probes:2,localReadFailed:true,entryCount:2});assert.equal(api.walGuardEvidence9719().state,'local-read-failed');
 win.hlgbWalIdbGuard9536.status=()=>({probes:2,readFailed:false,entryCount:2,indexedDbOnly:2,loadBlocked:1,private:'DO_NOT_EXPORT'});
 const guard=api.walGuardEvidence9719();assert.equal(guard.pendingRouteIdentities,1);assert.equal(guard.indexedDbOnly,2);assert.equal(guard.remoteConfirmed,false);assert(!JSON.stringify(guard).includes('PRIVATE'));assert(!JSON.stringify(guard).includes('DO_NOT_EXPORT'));assert.equal(scans,0);
 win.__HLGB_AUTH_READY=false;assert.equal(api.walGuardEvidence9719().state,'not-authenticated');win.__HLGB_AUTH_READY=true;
 assert.equal(api.cutMaterialsEvidence9711().observed,false);
 win.hlgbCutOrganization={materialsStatus9711:()=>({observed:true,inline:2,fallback:1,ambiguous:1,private:'NO_EXPORT'})};
 assert.equal(api.separationDockEvidence9715().observed,false);win.hlgbCutOrganization.separationDockStatus9715=()=>({observed:true,moved:true,modelOpened:false,private:'NO_EXPORT'});const dock=api.separationDockEvidence9715();assert.equal(dock.moved,true);assert.equal(dock.modelOpened,false);assert.equal(dock.remoteConfirmed,false);assert(!JSON.stringify(dock).includes('NO_EXPORT'));
 const materials=api.cutMaterialsEvidence9711();assert.equal(materials.inline,2);assert.equal(materials.fallback,1);assert.equal(materials.remoteConfirmed,false);assert(!JSON.stringify(materials).includes('NO_EXPORT'));
 assert.equal(win.hlgbAuditorAutoCorrect9448.render(summary),true);
 assert(cardHtml.includes('hlgbWalReview9593'),'manual review is visible near safe export');
 assert(!button.disabled);
 await handlers.click();
 assert.equal(called,1);
 assert.equal(receivedMax,60,'explicit request checks all local operations up to safe bounded 60');
 assert.equal(button.disabled,false);
 assert.match(status.textContent,/Conferidas 22 de 22/);
 assert.match(status.textContent,/Removidas: 0/);
 assert(detailHtml.includes('route-1'));assert(detailHtml.includes('Pendências por módulo'));assert(detailHtml.includes('evidência parcial'));assert(!detailHtml.includes('DO_NOT_EXPORT'));
 assert(detailHtml.includes('hlgbWalReviewDownload9593'));
 assert.equal(win.hlgbAuditorAutoCorrect9448.state.lastWalReview9593.checked,22);
 assert.equal(writes.length,0,'manual comparison does not write localStorage');
 console.log('PASS v95.93: expanded WAL review button, progress, safe details and zero mutations.');
})().catch(e=>{console.error(e);process.exitCode=1});
