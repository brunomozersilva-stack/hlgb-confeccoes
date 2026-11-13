'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('release-acerto-returns-v9565.js','utf8');
const note=fs.readFileSync('release-notes-receivables-v9564.js','utf8');
const invoice={id:'n1',client:'Quesia',date:'2026-11-05',issueDate:'2026-11-05',dueDate:'2026-11-15',value:1000,paid:200,remaining:800,status:'Parcial',
 items:[{productId:'p1',productName:'Modelo A',qty:100,unitPrice:10,value:1000}],
 paymentHistory:[{id:'p0',value:200,date:'2026-11-05',method:'PIX'}]};
const db={projectionInvoices:[invoice],orders:[],finance:[{id:'f1',projectionInvoiceId:'n1',paid:200,value:1000,remaining:800,status:'Parcial'}]};
let saved=0,pending=false,fail=false;
const w={db,addEventListener(){},localSaveOnly(){},renderNotes9214(){},renderOrderNotes(){},
 hlgbWalIdbGuard9536:{probe:async()=>true,ids:()=>pending?['projectionInvoices::n1']:[],status:()=>({readFailed:false})},
 hlgbRecordSaveWithRetry:async(m,id,row)=>{if(fail)return {applied:false,reason:'nuvem falhou'};saved++;return {applied:true,data:JSON.parse(JSON.stringify(row))}}};
const ctx={window:w,console,Date,Math,setTimeout(){},document:{}};
vm.createContext(ctx);vm.runInContext(code,ctx);
const api=w.hlgbAcertoReturns9565;
const edit=(val,quantity=100,unit=10,reason='Conferência da nota')=>({date:'2026-11-06',dueDate:'2026-11-20',value:val,reason,items:[{qty:quantity,unitPrice:unit}]});
(async()=>{
 const initial=JSON.stringify(db);
 pending=true;
 await assert.rejects(()=>api.saveAction('projection','n1','edit',edit(1200,120)),/pendente/);
 assert.equal(JSON.stringify(db),initial,'pending local WAL must never be overwritten');
 pending=false;fail=true;
 await assert.rejects(()=>api.saveAction('projection','n1','edit',edit(1200,120)),/nuvem falhou/);
 assert.equal(JSON.stringify(db),initial,'unconfirmed edit must not mutate local state');
 fail=false;
 await assert.rejects(()=>api.saveAction('projection','n1','edit',edit(500,100,5)),/menor que o recebido|total precisa/);
 await assert.rejects(()=>api.saveAction('projection','n1','edit',edit(1200,120,10,'')),/motivo/);
 await assert.rejects(()=>api.saveAction('projection','n1','edit',{...edit(1200,120),date:'2026-02-31'}),/Data da nota/);
 await assert.rejects(()=>api.saveAction('projection','n1','edit',edit(1100,120)),/soma dos itens/);
 let out=await api.saveAction('projection','n1','edit',edit(1200,120));
 assert(out.ok);
 assert.equal(db.projectionInvoices[0].value,1200);
 assert.equal(db.projectionInvoices[0].remaining,1000);
 assert.equal(db.projectionInvoices[0].date,'2026-11-06');
 assert.equal(db.projectionInvoices[0].issueDate,'2026-11-06');
 assert.equal(db.projectionInvoices[0].dueDate,'2026-11-20');
 assert.equal(db.projectionInvoices[0].items[0].qty,120);
 assert.equal(db.projectionInvoices[0].items[0].unitPrice,10);
 assert.equal(db.projectionInvoices[0].items[0].value,1200);
 assert.equal(db.projectionInvoices[0].paymentHistory[0].value,200,'cash receipt must not change');
 assert.equal(db.finance[0].value,1200,'finance mirror must follow edited note value');
 assert.equal(db.finance[0].paid,200);
 assert.equal(db.finance[0].remaining,1000);
 const h=db.projectionInvoices[0].acertoEditHistoryV9572;
 assert.equal(h.length,1);assert.equal(h[0].before.value,1000);assert.equal(h[0].after.value,1200);
 assert.match(h[0].changes.join(' '),/Item 1/);
 const written=saved;
 await assert.rejects(()=>api.saveAction('projection','n1','edit',{...edit(1200,120),date:'2026-11-06'}),/Nenhuma alteração/);
 assert.equal(saved,written,'no-op cannot make remote writes');
 await assert.rejects(()=>api.saveAction('order','x','edit',edit(1200)),/não encontrado|exclusiva/);
 assert.match(code,/id="ar65-return-preview"/,'live abatimento preview must be in modal');
 assert.match(code,/data-ar72-qty/,'quantity edit inputs must be inside the same note');
 assert.match(note,/Histórico completo por cliente/);
 assert.match(note,/data-action="week"/);
 assert.match(note,/n\.balance>1\?'Acerto':'Abrir \/ editar'/);
 console.log('PASS v95.72: invoice edit safe cloud readback, audit before/after, mirror total, live credits, paid navigation and week filters');
})().catch(e=>{console.error(e);process.exitCode=1});
