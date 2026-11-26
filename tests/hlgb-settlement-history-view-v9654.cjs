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

 const factionDeps={...d,inspectFactionEvents:(ctx,f)=>({state:'local-events',ctx,f})};calls.length=0;const fr=api.read(factionDeps,'faccao',{eventMode:true});ok(fr.state==='local-events'&&calls.join(',')==='factionPayments,groups,hubFinanceEntries'&&fr.ctx.manualHubAllowed===true,'authorized group and hub sources');
 calls.length=0;const restricted=api.read({...factionDeps,can:p=>p!=='hubFinanceiro'},'faccao',{eventMode:true});ok(restricted.state==='local-events'&&calls.join(',')==='factionPayments'&&!restricted.ctx.manualHubAllowed,'no financial source without hub access');
 authorized=true;calls.length=0;const revoked=api.read({...factionDeps,can:p=>p!=='hubFinanceiro'||authorized,manualGroups:()=>{calls.push('groups');authorized=false;return []}},'faccao',{eventMode:true});ok(revoked.state==='forbidden'&&calls.join(',')==='factionPayments,groups','revocation blocks hub read');
 const fer={state:'local-events',eventTotal:1,events:[{kind:'faccao',name:'Roseli',ownerId:'F1',noteNumber:'Camisola',date:'2026-11-24',type:'faction-paid',amountCents:4000,id:'f-event'}],totals:{factionPaidCents:4000},issues:[]};ok(api.eventCsv(fer,'faccao').includes('40,00'),'faction CSV');ok(api.printable(fer,'faccao','detail',{eventMode:true}).includes('Abatimentos não são saída de caixa'),'faction PDF');let wrong=false;try{api.eventCsv(fer,'cliente')}catch(_){wrong=true}ok(wrong,'separate scopes');
 const fixtureRow={...row,kind:'faccao',id:'group:1',ownerId:'F1',name:'<script>alert(1)</script>',dateBasis:'payment',details:[{id:'1',description:'Calcinha Mayte',quantity:480,unitPriceCents:80,serviceCents:38400,paidCents:38400,travetaCents:0,note:'<img src=x onerror=alert(1)>'}],netOfAdjustments:true};
 const fixtureRow2={...fixtureRow,id:'group:2',totalCents:20000,paidCents:10000,creditCents:2000,balanceCents:8000};
 const report2={state:'local-observation',rows:[fixtureRow,fixtureRow2],total:2,issues:['review']};
 const detail=api.printable(report2,'faccao','detail',{from:'2026-11-23',to:'2026-11-23'});
 ok(detail.includes('Calcinha Mayte')&&detail.includes('480')&&detail.includes('38,40')===false&&detail.includes('384,00'),'detail values');
 ok(!detail.includes('<script>alert(1)</script>')&&!detail.includes('<img src=x')&&detail.includes('&lt;script&gt;'),'escape untrusted fields');
 const summary=api.printable(report2,'faccao','summary',{});ok(summary.includes('300,00')&&summary.includes('150,00')&&summary.includes('130,00')&&!summary.includes('Calcinha Mayte'),'summary groups without repeated details');
 ok(api.printable(er,'cliente','summary',{eventMode:true}).includes('Abatimentos não são entrada de caixa'),'event distinction');
 for(const [data,kind,mode,filter] of [[{...report2,total:3},'faccao','detail',{}],[report2,'cliente','summary',{}],[{...er,eventTotal:2},'cliente','summary',{eventMode:true}],[report2,'faccao','unknown',{}]]){let blocked=false;try{api.printable(data,kind,mode,filter)}catch(_){blocked=true}ok(blocked,'reject invalid or partial print')}
 const original={...row,id:'note:projection:1',details:[],status:'Em aberto'},origDeps={...d,inspect:()=>({state:'local-observation',rows:[original]})};let actionCalls=[];
 const acts={noteView:id=>actionCalls.push(id),factionPdf:id=>actionCalls.push(id)};
 ok(api.originalAction(origDeps,'cliente',original,'noteView',acts,()=>true).opened&&actionCalls.join(',')==='1','original note navigation');
 ok(!api.originalAction(origDeps,'cliente',{...original,totalCents:123},'noteView',acts,()=>true).opened&&actionCalls.length===1,'stale row blocked');
 ok(!api.originalAction(origDeps,'cliente',original,'factionPdf',acts,()=>true).opened&&actionCalls.length===1,'wrong scope blocked');
 ok(!api.originalAction({...origDeps,can:p=>p!=='financeiro'},'cliente',original,'noteView',acts,()=>true).opened&&actionCalls.length===1,'permission revoked');
 ok(!api.originalAction(origDeps,'cliente',original,'noteView',acts,()=>false).opened&&actionCalls.length===1,'session inactive');
})(api,(v,m)=>assert.ok(v,m));console.log('PASS scope isolation and adapter failure handling');