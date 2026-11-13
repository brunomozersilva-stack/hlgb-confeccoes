'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const loader=fs.readFileSync('app-stable3.html','utf8');
const base=fs.readFileSync('app9240.html','utf8');
const extract=name=>{
 const re=new RegExp('const '+name+'=("(?:\\\\.|[^"\\\\])*");');
 const found=loader.match(re);assert(found,'router patch '+name+' must exist');
 return JSON.parse(found[1]);
};
const old=extract('dirtyOld'),patched=extract('dirtyNew');
assert(base.includes(old),'router replacement must match the ACTUAL app9240 scanDirty source');
assert(patched.includes("m==='production'&&window.hlgbProductionReconcile9439?.productionEquivalent?.(r,sr.data)===true"),'production must use the existing strict identity+business equivalence');
const sameLine=patched.split('\n').find(s=>s.includes('const same='));
assert(sameLine,'scanDirty equality line missing');
const run=vm.runInNewContext('(function(r,sr,m,window,eqBusiness990,norm955){'+sameLine+';return same})');
const equivalent=(a,b)=>['cutId','orderId','productId','cutProductKey','planned','done','stage','productionLocationId','factionId'].every(k=>String(a?.[k]??'')===String(b?.[k]??''));
const window={hlgbProductionReconcile9439:{productionEquivalent:equivalent}};
const norm=x=>JSON.stringify(x);
const eqBusiness=(a,b)=>norm(a)===norm(b);
const remote={id:'P1',cutId:'c',orderId:'o',productId:'p',cutProductKey:'c:p',planned:740,done:0,stage:'Aguardando atribuição',factionId:null,updatedAt:'2026-11-09T00:00:00Z'};
const local={...remote,assignmentSource:true,updatedAt:'2026-11-13T00:00:00Z'};
const same=(r,sr,m='production')=>run(r,sr,m,window,eqBusiness,norm);
assert.equal(same(local,{data:remote,deleted_at:null}),true,'technical-only change must not enqueue new Production WAL');
for(const edit of [{planned:741},{done:1},{factionId:'f2'},{cutProductKey:'c:another'},{orderId:'different'}]){
 assert.equal(same({...local,...edit},{data:remote,deleted_at:null}),false,'actual business change must enter WAL: '+Object.keys(edit)[0]);
}
assert.equal(same(local,{data:remote,deleted_at:null},'cuts'),false,'other modules must keep existing comparison');
assert.equal(same(local,{data:remote,deleted_at:'2026-11-12T00:00:00Z'}),false,'deleted remote record must not hide local write');
assert.equal(same(remote,{data:remote,deleted_at:null}),true,'strict identical records still pass');
const audit=fs.readFileSync('release-auditor-autocorrect-v9448.js','utf8');
assert(audit.includes('flagUnstableProduction9571(out);'));
console.log('PASS v95.71: router production scanDirty ignores technical-only echoes; real updates remain queued.');
