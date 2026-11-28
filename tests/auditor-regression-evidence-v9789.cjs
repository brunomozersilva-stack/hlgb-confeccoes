'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync('release-internal-auditor.js','utf8'),a=s.indexOf('function compareAuditRegression9789('),b=s.indexOf('function auditRegression9789(',a);assert.ok(a>=0&&b>a);
const ctx={};vm.createContext(ctx);vm.runInContext(s.slice(a,b),ctx);
const check=(code,status,page='')=>({code,status,page,category:'Módulos',detail:'SECRET-EXAMPLE'});
const base={kind:'system_audit',readOnly:true,id:'a',completedAt:'2026-11-25T10:00:00Z',auditorVersion:'1',appVersion:'a',user:'PERSONAL-EXAMPLE',browser:'Safari',mode:'full',activePage:'corte',viewport:{width:1000,height:800,devicePixelRatio:2},checks:[check('fn:a','pass'),check('fn:b','fail'),check('fn:c','warn'),check('fn:d','fail'),check('fn:f','pass'),check('fn:f','pass')]};
const current={...base,id:'b',completedAt:'2026-11-26T10:00:00Z',appVersion:'b',checks:[check('fn:a','fail'),check('fn:b','pass'),check('fn:c','warn'),check('fn:e','pass'),check('fn:f','pass')]};
const before=JSON.stringify({base,current}),r=ctx.compareAuditRegression9789(current,[base]);
assert.equal(r.state,'local-comparison');for(const k of ['regressed','improved','persistent','missing','newCheck','ambiguous'])assert.equal(r.counts[k],1);assert.equal(r.canRepair,false);assert.equal(r.rootCauseConfirmed,false);assert.ok(!JSON.stringify(r).includes('SECRET-EXAMPLE'));assert.ok(!JSON.stringify(r).includes('PERSONAL-EXAMPLE'));
assert.equal(ctx.compareAuditRegression9789({...current,browser:'Chrome'},[base]).state,'no-comparable-baseline');
assert.equal(ctx.compareAuditRegression9789({...current,auditorVersion:'2'},[base]).state,'no-comparable-baseline');
assert.equal(ctx.compareAuditRegression9789(current,[base,{...base,id:'c'}]).state,'ambiguous-baseline');assert.equal(JSON.stringify({base,current}),before);
console.log('PASS audit regression comparison, absent checks, context match, no private detail or mutation');

const earlier={...base,id:'z',completedAt:'2026-11-24T10:00:00Z',checks:[check('fn:a','fail'),check('fn:c','warn')]};
const multi=ctx.compareAuditRegression9789(current,[base,earlier]);assert.equal(multi.recurrence.returned,1);assert.equal(multi.recurrence.persistent,1);assert.equal(multi.recurrence.rows.find(x=>x.code==='fn:a').returnedAfterPass,true);assert.equal(multi.recurrence.rows.find(x=>x.code==='fn:c').consecutiveNonPass,3);
const missing={...earlier,checks:[]};assert.equal(ctx.compareAuditRegression9789(current,[base,missing]).recurrence.returned,0);
assert.equal(ctx.compareAuditRegression9789(current,[base,earlier,{...earlier,id:'duplicate-time'}]).recurrence.returned,0);
assert.ok(!JSON.stringify(multi.recurrence).includes('PERSONAL-EXAMPLE'));assert.ok(!JSON.stringify(multi.recurrence).includes('SECRET-EXAMPLE'));
