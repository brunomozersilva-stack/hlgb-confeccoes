const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const core=fs.readFileSync('release-ack-reconcile-v9436.js','utf8');
const gate=fs.readFileSync('release-login-confirm-gate-v9407.js','utf8');
assert.ok(gate.includes("hlgb:authenticated"),'loader deve depender do evento de autenticação');
assert.ok(gate.includes("window.__HLGB_AUTH_READY!==true"),'loader deve exigir autoridade explícita de login');
assert.ok(!core.includes("addEventListener('pageshow'"),'ACK não pode instalar por pageshow');
assert.ok(!core.includes("addEventListener('focus'"),'ACK não pode instalar por focus');
assert.ok(!core.includes('HLGB_RELEASE_VERSION='),'ACK não pode mudar a versão visual/base');
assert.ok(core.includes("if(window.__HLGB_AUTH_READY!==true)return false"),'install deve ter gate duro de autenticação');

const listeners={};
const storage=new Map();
const localStorage={
 getItem:k=>storage.has(k)?storage.get(k):null,
 setItem:(k,v)=>storage.set(k,String(v)),
 removeItem:k=>storage.delete(k)
};
let originalCalls=0,localSaves=0,pendingRecomputes=0;
const original=async(module,id,data,deleted)=>{originalCalls++;return {applied:true,data:{...data,updatedAt:'server-tech'},revision:7,updated_at:'2026-10-30T14:00:00Z'}};
const window={
 __HLGB_AUTH_READY:false,
 hlgbRecordSaveWithRetry:original,
 db:{production:[{id:'1',qty:3,updatedAt:'local-tech'}]},
 hlgbRecordSnapshots:{production:new Map([['1',{data:{id:'1',qty:3,updatedAt:'old-tech'},revision:6}]])},
 localSaveOnly(){localSaves++},
 hlgbRecordPendingStore(){pendingRecomputes++},
 addEventListener(name,fn){(listeners[name]||(listeners[name]=[])).push(fn)},
 dispatch(name){for(const fn of listeners[name]||[])fn()},
 hlgbInteractionLock9434:{status:()=>({locked:false})}
};
window.window=window;
const immediate=fn=>{fn();return 1};
const context={window,localStorage,console,Date,JSON,Object,Array,Map,Set,String,Number,Math,Promise,Error,structuredClone:global.structuredClone,setTimeout:immediate,clearTimeout(){}};
vm.createContext(context);vm.runInContext(core,context);
assert.strictEqual(window.hlgbRecordSaveWithRetry,original,'não pode envolver save antes do login');
assert.strictEqual(window.hlgbAckReconcile9436.status().activated,false,'não pode ativar antes do login');

window.__HLGB_AUTH_READY=true;window.dispatch('hlgb:authenticated');
assert.notStrictEqual(window.hlgbRecordSaveWithRetry,original,'deve envolver save depois do login');
storage.set('hlgb_records_pending_v91',JSON.stringify({modules:{production:[{id:'1',deleted:false,data:{id:'1',qty:3,updatedAt:'pending-tech'}}]}}));
(async()=>{
 await window.hlgbRecordSaveWithRetry('production','1',{id:'1',qty:3,updatedAt:'sent-tech'},false);
 assert.strictEqual(originalCalls,1);
 const after=JSON.parse(storage.get('hlgb_ack_reconcile_v9436_state'));
 assert.strictEqual(after.applied,1,'ACK aplicado deve ser reconciliado');
 assert.strictEqual(after.pendingCleared,1,'pendência tecnicamente diferente deve ser removida após ACK real');
 assert.strictEqual(storage.get('hlgb_records_pending_v91'),undefined,'fila deve desaparecer quando não restar operação');
 assert.ok(localSaves>0&&pendingRecomputes>0,'estado local deve ser persistido/recalculado');

 window.db.production[0]={id:'1',qty:4,updatedAt:'newer-business-edit'};
 storage.set('hlgb_records_pending_v91',JSON.stringify({modules:{production:[{id:'1',deleted:false,data:{id:'1',qty:3}}]}}));
 await window.hlgbRecordSaveWithRetry('production','1',{id:'1',qty:3},false);
 const pending=JSON.parse(storage.get('hlgb_records_pending_v91'));
 assert.strictEqual(pending.modules.production.length,1,'edição de negócio mais nova não pode ser apagada');
 assert.strictEqual(window.db.production[0].qty,4,'edição mais nova não pode ser sobrescrita');
 assert.ok(window.hlgbAckReconcile9436.status().skippedNewer>=1,'proteção deve registrar skip de edição mais nova');
 console.log('ack reconcile post-auth v94.36: OK');
})().catch(err=>{console.error(err);process.exitCode=1});
