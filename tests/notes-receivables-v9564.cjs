'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.resolve(__dirname,'../release-notes-receivables-v9564.js'),'utf8');
const loader=fs.readFileSync(path.resolve(__dirname,'../app-stable3.html'),'utf8');
assert(loader.includes("'release-notes-receivables-v9564.js'"),'entry must load the dashboard');
const db={
 projectionInvoices:[
  {id:'a',client:'Cliente A',clientId:1,value:100,paid:100,remaining:0,dueDate:'2026-11-11',status:'Pago'},
  {id:'b',client:'Cliente A',clientId:1,value:200,paid:999,remaining:180,paymentHistory:[{value:20}],items:[{orderId:'oLinked'}],dueDate:'2026-11-13',status:'Pendente'},
  {id:'c',client:'Cliente B',clientId:2,value:300,paid:0,remaining:300,dueDate:'2026-11-10',status:'Pendente'},
  {id:'d',client:'Cliente B',clientId:2,value:400,paid:0,remaining:400,dueDate:'2026-11-12',status:'Pendente'},
  {id:'e',client:'Cliente B',clientId:2,value:500,paid:0,remaining:500,dueDate:'',status:'Pendente'},
  {id:'credit',client:'Cliente C',clientId:3,value:75,paid:0,remaining:0,dueDate:'2026-11-10',acertoReturnsV9565:[{value:75,reason:'Devolução'}],status:'Compensado por devolução'},
  {id:'shadow',migratedToNoteQueueV9223:true,client:'Sombras',value:9000,dueDate:'2026-11-10'},
  {id:'cancel',client:'Cancelada',value:9000,status:'Cancelado'}
 ],
 finance:[{id:'f1',projectionInvoiceId:'b',paid:20}],
 orders:[{id:'o1',client:'Cliente C',clientId:3,noteReady:true,orderNumber:50,total:600,dueDate:'2026-11-19',paymentHistory:[]},
         {id:'o2',client:'Cliente A',status:'Pedido finalizado',total:700,dueDate:'2026-11-11'},
         {id:'oLinked',client:'Cliente A',noteReady:true,total:800,dueDate:'2026-11-12'}],
 invoices:[],noteQueue:[]
};
const before=JSON.stringify(db);
const sandbox={window:{db,addEventListener(){},hlgbCanonicalProjectionInvoices:()=>db.projectionInvoices.filter(x=>!x.migratedToNoteQueueV9223)},
 document:{readyState:'complete',getElementById(){return null},addEventListener(){}},
 setTimeout(){return 0},console,Date};
vm.createContext(sandbox);vm.runInContext(code,sandbox,{filename:'release-notes-receivables-v9564.js'});
const api=sandbox.window.hlgbNotesReceivables9564;
assert(api&&api.readOnly&&api.version==='95.64');
const notes=api.allNotes(),now='2026-11-12';
assert.equal(notes.length,7,'six real invoices plus one note-ready order, avoiding duplicated order');
assert(!notes.some(x=>x.id==='shadow'||x.id==='cancel'||x.id==='o2'||x.id==='oLinked'),'exclude shadows, canceled notes, ordinary orders and orders already billed through projection');
const b=notes.find(x=>x.id==='b');
assert.equal(b.paid,2000,'payment history must win over stale paid field');
assert.equal(b.balance,18000);
const t=api.calculate(notes,now);
assert.deepEqual([...t.open],[5,198000]);
assert.deepEqual([...t.paid],[1,10000]);
assert.deepEqual([...t.compensated],[1,7500]);
assert.deepEqual([...t.credits],[1,7500]);
assert.deepEqual([...t.overdue],[1,30000]);
assert.deepEqual([...t.today],[1,40000]);
assert.deepEqual([...t.next7],[3,118000]);
assert.deepEqual([...t.unknown],[1,50000]);
assert.deepEqual([...t.received],[2,12000]);
assert.equal(api.category(notes.find(x=>x.id==='c'),now),'overdue');
assert.equal(api.category(notes.find(x=>x.id==='d'),now),'today');
assert.equal(api.category(notes.find(x=>x.id==='e'),now),'unknown');
assert.equal(api.category(notes.find(x=>x.id==='a'),now),'paid','settled old note cannot be overdue');
assert.equal(api.category(notes.find(x=>x.id==='credit'),now),'compensated','a credit-only note is NOT a cash payment');
assert.equal(notes.filter(x=>api.matchTab(x,'paid',now)).length,1,'cash-only paid tab');
assert.equal(notes.filter(x=>api.matchTab(x,'compensated',now)).length,1,'credit-only note goes to compensated tab');
assert.equal(notes.filter(x=>api.matchTab(x,'upcoming',now)).length,3);
api.state.client='id:1';
assert.equal(api.filterAll(notes).length,2,'client filter');
api.state.min='150';api.state.max='250';
assert.equal(api.filterAll(notes).length,1,'value range filter');
assert.equal(api.filterAll(notes)[0].id,'b');
api.state.basis='balance';api.state.min='190';
assert.equal(api.filterAll(notes).length,0,'balance range filter');
api.state.basis='total';api.state.min='';api.state.max='';
api.state.search='CLIENTE A';
assert.equal(api.filterAll(notes).length,2,'accent insensitive search');
api.state.search='a cliente';assert.equal(api.filterAll(notes).length,2,'search terms in any order');
api.state.search='b cliente';assert.equal(api.filterAll(notes).length,1,'record ID can be searched with client');
api.state.search='';api.state.client='';
api.state.tab='paid';
assert.equal(api.exportRows().length,1,'paid export follows active tab');
assert.equal(JSON.stringify(db),before,'no business data or history modified');
assert.equal(typeof sandbox.window.hlgbRecordSaveWithRetry,'undefined','no save dependency');
// Initial cloud renderer must not be wrapped repeatedly by scheduled installers.
const initial=function(){return true};initial.__hlgbNotesLive9563=true;
sandbox.window.renderOrderNotes=initial;
api.install();
const first=sandbox.window.renderOrderNotes;
assert.equal(first.__hlgbNotesLive9563,true,'cloud sync marker preserved');
api.install();api.install();
assert.equal(sandbox.window.renderOrderNotes,first,'idempotent renderer install');
assert.equal(JSON.stringify(db),before,'install does not change data');
console.log('PASS notas v95.64: tabs and totals, partials, dates, value filters, no duplicate sums or wrapper loops');

const settled=notes.find(n=>n.id==='a');
assert.equal(api.settledForArchive9710(settled),true);
assert.equal(api.settledForArchive9710(b),false);
assert.equal(api.settledForArchive9710(notes.find(n=>n.id==='credit')),false);
assert.equal(api.settledForArchive9710(api.projectionView({id:'unknown',value:100,remaining:0})),false,'remaining alone does not prove payment');
assert.equal(api.settledForArchive9710(api.projectionView({id:'zero',value:0,paid:0})),false);
assert.equal(api.archiveAllowed9710(settled,null),false,'unavailable pending inventory blocks archive');
assert.equal(api.archiveAllowed9710(settled,new Set(['projectionInvoices::a'])),false);
assert.equal(api.archiveAllowed9710(settled,new Set()),true);
db.finance.push({id:'fa',projectionInvoiceId:'a',paid:100});
assert.equal(api.archiveAllowed9710(settled,new Set(['finance::fa'])),false);
db.finance.pop();
db.clients=[{id:1,name:'Cliente A'},{id:2,name:'Cliente B'}];
const byName={...settled,id:'old',clientKey:'name:cliente a'};
assert.equal(api.clientNotes9710(1,[...notes,byName]).rows.length,3);
db.clients.push({id:4,name:'Clíente A'});
const ambiguous=api.clientNotes9710(1,[...notes,byName]);
assert.equal(ambiguous.rows.length,2);assert.equal(ambiguous.ambiguous,1);
assert.equal(api.clientNotes9710(999,notes).available,false);
assert.equal(api.openClientNotes9710(1),false,'no session or note permission');
delete db.clients;
assert.equal(JSON.stringify(db),before);
console.log('PASS paid-note classification, pending WAL, ambiguous clients and read-only history');

(function accountPreview(){const rows=[{type:'projection',clientKey:'id:1',id:'x',key:'projection:x',number:'1',total:10000,paid:0,credit:0,balance:10000,issued:'2026-11-01'},{type:'projection',clientKey:'id:1',id:'y',key:'projection:y',number:'2',total:20000,paid:5000,credit:0,balance:15000,paymentEvidence:true,issued:'2026-11-11'}],input={clientKey:'id:1',openingCents:0,paymentCents:12000,date:'2026-11-21'},before=JSON.stringify(rows),p=(changes={},data=rows,allowed=true)=>api.clientAccountPreview9759(data,{...input,...changes},allowed);const a=p();assert.equal(a.before,25000);assert.equal(a.after,13000);assert.equal(a.allocations[0].amount,10000);assert.equal(a.allocations[1].amount,2000);assert.equal(a.weightedDays,220000/12000);assert.equal(p({openingCents:-5000,independentOpening:true,reason:'crédito anterior'}).after,8000);assert.equal(p({openingCents:5000,independentOpening:true,reason:'saldo externo',paymentCents:32000}).unallocatedPayment,2000);assert.equal(p({openingCents:5000}).state,'blocked');assert.equal(p({noteKeys:['projection:y']}).allocations[0].amount,12000);assert.equal(p({noteKeys:['projection:y','projection:y']}).state,'blocked');assert.equal(p({},[rows[0],rows[0]]).state,'blocked');assert.equal(p({},[{...rows[0],mismatch:true}]).state,'blocked');assert.equal(p({},rows,false).state,'blocked');assert.equal(p({},[{...rows[0],clientKey:'id:2'}]).state,'blocked');assert.equal(JSON.stringify(rows),before);})();

const itemNote9847=api.projectionView({id:'test-items',client:'Cliente Teste',value:150,paid:0,remaining:150,items:[{productId:'p1',productName:'Camisola Rubi',qty:10},{productId:'p2',productName:'Calcinha',qty:5}]});assert.equal(itemNote9847.pieces,15);assert.equal(itemNote9847.models.length,2);api.state.search='rubi cliente';assert.equal(api.filterAll([itemNote9847]).length,1);api.state.search='';assert.equal(api.projectionView({id:'unknown-items',items:[{qty:3}]}).pieces,null);
(function residualComposition(){const p=api.clientAccountPreview9759([{type:'projection',clientKey:'id:1',id:'x',key:'projection:x',number:'1',total:7000,paid:0,credit:0,balance:7000,issued:'2026-11-01'}],{clientKey:'id:1',openingCents:2000,paymentCents:10000,date:'2026-11-26',reason:'Saldo independente',independentOpening:true},true);assert.equal(p.allocatedCents,7000);assert.equal(p.residualCents,3000);assert.equal(p.independentAfterCents,-1000);assert.equal(p.notesAfterCents,0);assert.equal(p.after,-1000);})();
