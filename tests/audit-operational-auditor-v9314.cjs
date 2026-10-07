const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('release-auditor-operational-v9314.js','utf8');

function storage(seed={}){
 const m=new Map(Object.entries(seed));
 return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
}
function control(text,disabled=true){return {id:'saveBtn',textContent:text,disabled,getBoundingClientRect:()=>({width:120,height:32})}}
const saving=control('☁️ Salvando…');
const localStorage=storage({
 hlgb_records_pending_v91:JSON.stringify({modules:{separations:[{id:'s1'}],orders:[{id:'o1'}]}}),
 hlgb_durable_wal_v1:JSON.stringify({entries:{a:{module:'separations'},b:{module:'orders'},c:{module:'orders'}}})
});
const document={querySelectorAll(){return [saving]},getElementById(){return null}};
const window={
 cloudAccessToken:'token',hlgbRecordReady:true,HLGB_RELEASE_VERSION:'93.16',
 applySeparationProgress938:Object.assign(async()=>true,{__hlgb9313:true}),
 persistDb(){},renderHubFinance(){},addEventListener(){},
 hlgbSyncRecovery9301:{status:()=>({busy:false})},
 hlgbSaveIntegrity9312:{status:()=>({confirmBusy:false,recoveryBusy:false,separationGuard:true})}
};
const context={window,document,localStorage,navigator:{onLine:true},console:{info(){},warn(){}},getComputedStyle:()=>({display:'block',visibility:'visible'}),setTimeout(fn){fn();return 1},setInterval(){return 1},clearTimeout(){},db:{systemIssues:[]}};
vm.runInNewContext(src,context,{filename:'release-auditor-operational-v9314.js'});

assert(window.hlgbOperationalAuditor9314,'operational auditor must load');
let r=window.hlgbOperationalAuditor9314.run();
assert.equal(r.pending.total,5,'must count record + WAL pending work');
assert(r.checks.some(x=>x.code==='operational:pending'&&x.status==='fail'),'5 idle pending changes must be a failure');
assert(r.checks.some(x=>x.code==='operational:delivery'&&x.status==='fail'),'pending work with no active delivery must fail');
assert(r.checks.some(x=>x.code==='operational:saving-ui'&&x.status==='fail'),'visible Salvando state without delivery must be detected');
assert(r.checks.some(x=>x.code==='operational:separation-guard'&&x.status==='pass'),'separation guard must be recognized');

// Regression from real 2026-10-07 export: token/legacy flag may be absent while sync runtime is authenticated/ready and recovery is active.
window.cloudAccessToken='';window.hlgbRecordReady=false;
window.applySeparationProgress938=async()=>true;
window.hlgbSyncRecovery9301={status:()=>({busy:true,recordReady:true,realtime:'SUBSCRIBED'})};
window.hlgbSaveIntegrity9312={status:()=>({confirmBusy:false,recoveryBusy:true,separationGuard:true})};
r=window.hlgbOperationalAuditor9314.run();
assert(r.checks.some(x=>x.code==='operational:session'&&x.status==='pass'),'subscribed ready runtime must count as active cloud session evidence');
assert(r.checks.some(x=>x.code==='operational:record-layer'&&x.status==='pass'),'sync recordReady must satisfy record-layer readiness');
assert(r.checks.some(x=>x.code==='operational:separation-guard'&&x.status==='pass'),'saveStatus separationGuard must satisfy separation protection');
assert(r.checks.some(x=>x.code==='operational:saving-ui'&&x.status==='warn'),'visible saving state during active recovery must warn, not fail');
assert(r.checks.some(x=>x.code==='operational:pending'&&x.status==='warn'),'pending work during active recovery must warn, not fail');

localStorage.removeItem('hlgb_records_pending_v91');localStorage.removeItem('hlgb_durable_wal_v1');saving.textContent='Salvar';saving.disabled=false;
window.hlgbSyncRecovery9301={status:()=>({busy:false,recordReady:true,realtime:'SUBSCRIBED'})};
window.hlgbSaveIntegrity9312={status:()=>({confirmBusy:false,recoveryBusy:false,separationGuard:true})};
r=window.hlgbOperationalAuditor9314.run();
assert.equal(r.pending.total,0);
assert(r.checks.some(x=>x.code==='operational:pending'&&x.status==='pass'));
assert(r.checks.some(x=>x.code==='operational:saving-ui'&&x.status==='pass'));

console.log('PASS operational auditor v93.16: catches truly stuck saves, recognizes runtime-ready session/record/separation state, and treats active recovery as warning.');
