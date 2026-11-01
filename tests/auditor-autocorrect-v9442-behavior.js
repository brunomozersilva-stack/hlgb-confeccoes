const vm=require('vm'),fs=require('fs'),assert=require('assert/strict');
const src=fs.readFileSync('release-auditor-autocorrect-v9442.js','utf8');
function harness(ready){
 const nodes=new Map();
 const document={body:{},documentElement:{appendChild(){}},head:{appendChild(){}},querySelector(){return null},getElementById:id=>nodes.get(id)||null,createElement(){return {className:'',innerHTML:'',addEventListener(){},setAttribute(){},appendChild(){},prepend(){},remove(){}}}};
 const window={__HLGB_AUTH_READY:true,HLGB_RELEASE_VERSION:'94.41',addEventListener(){}};
 if(ready){
  window.hlgbAckReconcile9436={version:'94.36',install(){return true}};
  window.hlgbProductionReconcile9439={version:'94.39',patch:'94.42-safe-proof',reconcile(){return true},candidates(){return []}};
  window.hlgbAuditorRapid9437={version:'94.37',heal(){return true}};
  window.hlgbAuditorFinalize9439={version:'94.39',install(){return true}};
  window.hlgbLoginConfirmGate9407={prepareAuditorRepairs9442:async()=>({ok:true,ready:true,missing:[],dependencies:[{id:'ack-reconcile',ready:true},{id:'production-reconcile',ready:true},{id:'rapid-heal',ready:true},{id:'auditor-finalizer',ready:true}]})};
  window.HLGB_AUDITOR_AUTOCORRECT_9441='94.41';
  window.hlgbAuditorAutoCorrect9441={run:async()=>({version:'94.41',runId:'base',passes:3,stopReason:'Limite de 3 rodadas',fixed:0,corrected:[],stillFailing:[{code:'x'}],blocked:[],unverified:[],rounds:[{round:1},{round:2},{round:3}],report:{version:'94.41',run:{version:'94.41'}}}),downloadReport(){}};
 }
 const ctx={window,document,navigator:{},console,structuredClone:global.structuredClone,setTimeout,clearTimeout,Date,JSON,Math};Object.assign(window,ctx);ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(src,ctx);return window;
}
(async()=>{
 let w=harness(false),out=await w.hlgbAuditorAutoCorrect9442.run({render:false});assert.equal(out.passes,0);assert.match(out.stopReason,/não iniciada/i);assert(out.unverified.length>=1);assert(w.hlgbAuditorAutoCorrect9442.status().preparation.missing.length===4);
 w=harness(true);out=await w.hlgbAuditorAutoCorrect9442.run({render:false});assert.equal(out.version,'94.42');assert.equal(out.passes,3);assert.equal(out.rounds.length,3);assert.equal(out.report.version,'94.42');assert.equal(out.dependencyPreparation.ready,true);assert.equal(out.dependencyPreparation.missing.length,0);
 console.log('AUDITOR_AUTOCORRECT_V9442_BEHAVIOR_OK');
})().catch(e=>{console.error(e);process.exit(1)});
