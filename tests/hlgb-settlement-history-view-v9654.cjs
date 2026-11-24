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

 calls.length=0;const eventDeps={...d,noteSources:()=>{calls.push('sources');return []},inspectEvents:(ctx,f)=>({state:'local-events',ctx,f})};let e=api.read(eventDeps,'cliente',{eventMode:true});ok(e.state==='local-events'&&calls.join(',')==='notes,sources','client event source scoped');
 calls.length=0;e=api.read(eventDeps,'faccao',{eventMode:true});ok(e.state==='local-observation'&&calls.join(',')==='factionPayments,groups'&&!e.f.eventMode,'event source inaccessible outside client');
 calls.length=0;authorized=true;e=api.read({...eventDeps,auth:()=>authorized,notes:()=>{authorized=false;calls.push('notes');return []}},'cliente',{eventMode:true});ok(e.state==='forbidden'&&calls.join(',')==='notes','revocation before event source');
 const er={state:'local-events',eventTotal:1,events:[{kind:'cliente',name:'=unsafe',ownerId:'C1',noteNumber:'1',date:'2026-11-23',type:'material-offset',amountCents:2000,id:'event1'}],totals:{materialOffsetCents:2000},issues:[]};
 ok(api.eventCsv(er).includes("'=unsafe")&&api.eventCsv(er).includes('20,00'),'event CSV safe');
 let badEvent=false;try{api.eventCsv({...er,eventTotal:2})}catch(_){badEvent=true}ok(badEvent,'incomplete events export');

 const original={...row,id:'note:projection:1',details:[],status:'Em aberto'},origDeps={...d,inspect:()=>({state:'local-observation',rows:[original]})};let actionCalls=[];
 const acts={noteView:id=>actionCalls.push(id),factionPdf:id=>actionCalls.push(id)};
 ok(api.originalAction(origDeps,'cliente',original,'noteView',acts,()=>true).opened&&actionCalls.join(',')==='1','original note navigation');
 ok(!api.originalAction(origDeps,'cliente',{...original,totalCents:123},'noteView',acts,()=>true).opened&&actionCalls.length===1,'stale row blocked');
 ok(!api.originalAction(origDeps,'cliente',original,'factionPdf',acts,()=>true).opened&&actionCalls.length===1,'wrong scope blocked');
 ok(!api.originalAction({...origDeps,can:p=>p!=='financeiro'},'cliente',original,'noteView',acts,()=>true).opened&&actionCalls.length===1,'permission revoked');
 ok(!api.originalAction(origDeps,'cliente',original,'noteView',acts,()=>false).opened&&actionCalls.length===1,'session inactive');
})(api,(v,m)=>assert.ok(v,m));console.log('PASS scope isolation and adapter failure handling');