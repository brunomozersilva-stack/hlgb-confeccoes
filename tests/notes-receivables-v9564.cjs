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
