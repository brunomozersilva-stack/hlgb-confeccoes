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

 let authorized=true;calls.length=0;const first=api.read({...d,auth:()=>authorized,rows:k=>{calls.push(k);authorized=false;return []}},'faccao');ok(first.state==='forbidden'&&calls.join(',')==='factionPayments','no group read after revocation');
 for(const kind of ['faccao','cliente','funcionario']){authorized=true;const r=api.read({...d,auth:()=>authorized,inspect:()=>{authorized=false;return {state:'local-observation',rows:[{sensitive:true}]}}},kind);ok(r.state==='forbidden'&&r.rows.length===0,'discard inspected data after revocation '+kind)}

 const row={kind:'cliente',ownerId:'C1',name:'=HYPERLINK("bad")',date:'2026-11-23',dateBasis:'issue',id:'note:1',status:'Em aberto',totalCents:10000,paidCents:5000,creditCents:0,balanceCents:5000,lines:['1'],document:false};
 const report={state:'local-observation',rows:[row],total:1,totals:row,issues:[]};
 const csv=api.csv(report,'cliente');ok(csv.includes("'=HYPERLINK")&&csv.includes('50,00')&&csv.includes('TOTAL OBSERVADO'),'CSV safe and totals');
 for(const x of [{...report,total:2},{...report,state:'forbidden'},{...report,rows:[{...row,kind:'faccao'}]}]){let bad=false;try{api.csv(x,'cliente')}catch(_){bad=true}ok(bad,'reject incomplete or wrong scope export')}
})(api,(v,m)=>assert.ok(v,m));console.log('PASS scope isolation and adapter failure handling');