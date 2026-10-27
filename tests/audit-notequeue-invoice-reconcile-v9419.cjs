'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),src=fs.readFileSync('release-note-integrity.js','utf8');
const a=src.indexOf("function queueInvoiceAnalysis("),b=src.indexOf("async function reconcileQueueInvoices9419",a);assert(a>=0&&b>a,'analisador fila↔nota não encontrado');
const fn=src.slice(a,b),ctx={sid:v=>String(v??''),q:v=>Math.max(0,Number(v)||0),norm:v=>String(v??'').trim().toLowerCase()};vm.createContext(ctx);vm.runInContext(fn+';this.analyze=queueInvoiceAnalysis',ctx);
const queue=[
 {id:'q1',clientName:'Dell',productName:'Camisola Comun',qty:108,remainingQty:108,status:'Aguardando nota'},
 {id:'q2',clientName:'Dell',productName:'Conjunto Cereja',qty:48,remainingQty:48,status:'Aguardando nota'},
 {id:'q3',clientName:'Dell',productName:'Conjunto Gigi',qty:372,remainingQty:0,status:'Faturado',lastInvoiceId:'inv1'},
 {id:'q4',productName:'Parcial',qty:100,remainingQty:100,status:'Aguardando nota'},
 {id:'q5',productName:'Cancelado',qty:10,remainingQty:10,status:'Cancelado'}
];
const invoices=[{id:'inv1',issueDate:'2026-10-26',items:[{sourceQueueId:'q1',qty:108},{sourceQueueId:'q2',qty:48},{sourceQueueId:'q3',qty:372},{sourceQueueId:'q4',qty:30},{sourceQueueId:'q5',qty:10}]}];
const out=ctx.analyze(queue,invoices);assert.deepStrictEqual([...out.map(x=>x.id)],['q1','q2','q4']);const q1=out.find(x=>x.id==='q1'),q4=out.find(x=>x.id==='q4');assert.strictEqual(q1.expectedRemaining,0);assert.strictEqual(q1.expectedStatus,'Faturado');assert.strictEqual(q4.expectedRemaining,70);assert.strictEqual(q4.expectedStatus,'Parcial');assert(!out.some(x=>x.id==='q3'),'linha já correta não deve salvar de novo');assert(!out.some(x=>x.id==='q5'),'cancelado deve ser preservado');
console.log('OK fila↔nota v94.19: Dell faturado, parcial calculado, correto/cancelado preservados.');
