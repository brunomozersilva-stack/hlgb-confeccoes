const assert=require('node:assert/strict'),api=require('../hlgb-modules/financeiro/settlement-history-view-v9654.js');(function tests(api,ok){
 const calls=[],d={auth:()=>true,can:()=>true,rows:k=>{calls.push(k);return []},manualGroups:()=>{calls.push('groups');return []},notes:()=>{calls.push('notes');return []},inspect:(ctx,f)=>({ctx,f,state:'local-observation'})};
 ok(api.read(d,'faccao').ctx.factionsAllowed&&calls.join(',')==='factionPayments,groups','faction scope');
 calls.length=0;ok(api.read(d,'cliente').ctx.clientsAllowed&&calls.join(',')==='notes','client scope');
 calls.length=0;ok(api.read(d,'funcionario').ctx.employeesAllowed&&calls.join(',')==='payroll','employee scope');
 calls.length=0;ok(api.read({...d,auth:()=>false},'faccao').state==='forbidden'&&calls.length===0,'no source before auth');
 ok(api.read({...d,can:p=>p!=='financeiro'},'cliente').state==='forbidden'&&calls.length===0,'financial restriction');
 ok(api.read(d,'unknown').state==='forbidden','unknown scope');
 ok(api.read({...d,manualGroups:()=>{throw Error('fail')}},'faccao').state==='unavailable','failure');
 let n=0;ok(api.read({...d,auth:()=>++n===1},'cliente').state==='forbidden','revoked while reading');
 ok(api.read(d,'faccao',{kind:'funcionario'}).f.kind==='faccao','forced scope');
})(api,(v,m)=>assert.ok(v,m));console.log('PASS scope isolation and adapter failure handling');