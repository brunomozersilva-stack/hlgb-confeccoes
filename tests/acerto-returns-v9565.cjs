'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','release-acerto-returns-v9565.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-acerto-returns-v9565.js'"),'register isolated returns module in boot list');
const db={projectionInvoices:[{id:'n',client:'Click Sophia',value:1000,paid:200,remaining:800,
 paymentHistory:[{id:1,date:'2026-11-11',method:'PIX',value:200}],status:'Parcial'}],
 orders:[{id:'o',client:'Quesia',status:'Pedido finalizado',total:300,received:50,remaining:250,
 paymentHistory:[{value:50,method:'PIX'}],noteReady:true}],
 finance:[{id:'f',type:'Receber',projectionInvoiceId:'n',paid:200,remaining:800,value:1000,status:'Pendente'},
  {id:'fo',type:'Receber',orderId:'o',paid:50,remaining:250,value:300,status:'Pendente'}]};
let writes=[],failModule='',failNext=false;
const w={db,addEventListener(){},renderNotes9214(){},renderOrderNotes(){},orderRemaining(o){return o.total-o.received},
 openAcerto(){},hlgbRecordSaveWithRetry:async(module,id,row)=>{
  writes.push({module,id,data:JSON.parse(JSON.stringify(row))});
  if(module===failModule||failNext){failNext=false;return {applied:false,reason:'Erro simulado de gravação'};}
  return {applied:true,data:JSON.parse(JSON.stringify(row))};
 }};
const sandbox={console,setTimeout(){return 0},window:w,document:{},Date,Math};
vm.createContext(sandbox);vm.runInContext(src,sandbox);
const api=w.hlgbAcertoReturns9565;
assert(api&&api.version==='95.65');
const amounts=()=>api.moneyState(db.projectionInvoices[0],'projection');
(async()=>{
 const initial=JSON.stringify(db);
 let pending=['projectionInvoices::n'];
 w.hlgbWalIdbGuard9536={probe:async()=>true,ids:()=>pending,status:()=>({readFailed:false})};
 await assert.rejects(()=>api.saveAction('projection','n','return',{value:250,reason:'Pendente',date:'2026-11-12'}),/pendente/);
 assert.equal(JSON.stringify(db),initial,'local WAL prevents writes');
 assert.equal(writes.length,0,'no cloud write before WAL guard');
 pending=[];
 failNext=true;
 await assert.rejects(()=>api.saveAction('projection','n','return',{value:250,reason:'Peças devolvidas',date:'2026-11-12'}),/Erro simulado/);
 assert.equal(JSON.stringify(db),initial,'no local mutation if the cloud rejects a return');
 let out=await api.saveAction('projection','n','return',{value:250,reason:'5 peças devolvidas',date:'2026-11-12',detail:'Camisola'});
 assert.equal(out.ok,true);
 assert.equal(amounts().total,100000);assert.equal(amounts().cash,20000);
 assert.equal(amounts().credit,25000);assert.equal(amounts().remaining,55000);
 assert.equal(db.projectionInvoices[0].paymentHistory.length,1,'credit never faked as cash');
 assert.equal(db.finance[0].paid,200,'finance paid stays cash');
 assert.equal(db.finance[0].remaining,550,'finance balance includes the credit');
 assert.equal(db.finance[0].creditReturnsV9565,250);
 await assert.rejects(()=>api.saveAction('projection','n','return',{value:550.01,reason:'Excessiva'}),/ultrapassar/);
 await assert.rejects(()=>api.saveAction('projection','n','return',{value:5,reason:''}),/motivo/);
 await assert.rejects(()=>api.saveAction('projection','n','return',{value:5,date:'2026-02-31',reason:'Inválida'}),/data válida/);
 await api.saveAction('projection','n','note',{text:'Cliente fará Pix na sexta, confirmação pendente'});
 assert.equal(db.projectionInvoices[0].acertoNotesV9565.length,1);
 assert.equal(db.projectionInvoices[0].acertoNotesV9565[0].text,'Cliente fará Pix na sexta, confirmação pendente');
 assert.equal(amounts().remaining,55000,'memo cannot change balance');
 await api.saveAction('projection','n','payment',{value:150,method:'PIX',date:'2026-11-12'});
 assert.equal(amounts().cash,35000);assert.equal(amounts().credit,25000);assert.equal(amounts().remaining,40000);
 failModule='finance';
 const failure=await api.saveAction('projection','n','return',{value:100,reason:'Outra devolução',date:'2026-11-12'});
 assert.equal(failure.ok,true,'canonical note saved even when secondary finance write fails');
 assert.equal(failure.mirror.ok,false,'secondary finance failure must not be reported as success');
 assert.equal(amounts().credit,35000);assert.equal(amounts().remaining,30000);
 assert.equal(api.status().financePending.length,1);
 failModule='';await api.retryFinance('projection','n');
 assert.equal(api.status().financePending.length,0);assert.equal(db.finance[0].remaining,300);
 const entry=db.projectionInvoices[0].acertoReturnsV9565[0];
 await api.saveAction('projection','n','reversal',{entryId:entry.id,reason:'Cliente desistiu da devolução'});
 assert.equal(amounts().credit,10000);assert.equal(amounts().remaining,55000);
 assert(entry.reversedAt===undefined,'previous local clone must not be mutated');
 assert(db.projectionInvoices[0].acertoReturnsV9565[0].reversedAt,'reversal keeps original audit entry');
 await assert.rejects(()=>api.saveAction('projection','n','reversal',{entryId:entry.id,reason:'Duplicado'}),/já estornada/);
 await api.saveAction('order','o','return',{value:100,reason:'2 peças devolvidas',date:'2026-11-12'});
 assert.equal(api.moneyState(db.orders[0],'order').remaining,15000);
 assert.equal(db.orders[0].status,'Pedido finalizado','acerto cannot change production workflow stage');
 assert.equal(db.finance[1].remaining,150);
 assert.equal(w.orderRemaining(db.orders[0]),150,'legacy order remaining respects credits');
 assert.equal(w.openAcerto.__hlgbAcertoReturns9565,true,'old cheque form must be wrapped and preserved');
 assert.equal(w.openAcerto.__original instanceof Function,true);
 // Regression: historical paid/received scalar with no detailed history
 // must not disappear when the first detailed payment is registered.
 const legacy={id:'legacy-invoice',client:'Antigo',value:1000,paid:200,remaining:800,paymentHistory:[]};
 db.projectionInvoices.push(legacy);
 db.finance.push({id:'fl',projectionInvoiceId:'legacy-invoice',type:'Receber',paid:200,remaining:800});
 await api.saveAction('projection','legacy-invoice','payment',{value:100,date:'2026-11-12',method:'PIX'});
 const migrated=db.projectionInvoices.find(x=>x.id==='legacy-invoice');
 assert.equal(migrated.paid,300,'existing R$200 cash must survive first detailed R$100 payment');
 assert.equal(migrated.remaining,700);
 assert.equal(migrated.paymentHistory.length,2,'legacy baseline and new receipt, never double count');
 assert.equal(migrated.paymentHistory[0].importedBaselineV9565,true);
 assert.equal(migrated.paymentHistory[0].value,200);
 // Fallback to a finance mirror only when the canonical scalar is absent.
 db.projectionInvoices.push({id:'finance-only',value:500,remaining:450,paymentHistory:[]});
 db.finance.push({id:'ff',projectionInvoiceId:'finance-only',type:'Receber',paid:50,remaining:450});
 await api.saveAction('projection','finance-only','payment',{value:25,date:'2026-11-12',method:'PIX'});
 assert.equal(db.projectionInvoices.find(x=>x.id==='finance-only').paid,75);
 // Do not let financial settlements overwrite the manufacturing workflow.
 db.orders.push({id:'old-order',status:'Pedido finalizado',total:300,received:50,remaining:250,paymentHistory:[]});
 await api.saveAction('order','old-order','payment',{value:25,date:'2026-11-12',method:'PIX'});
 assert.equal(db.orders.find(x=>x.id==='old-order').received,75);
 assert.equal(db.orders.find(x=>x.id==='old-order').status,'Pedido finalizado');
 // Fail closed if the WAL guard failed to load (even if caller sees no pendingSync).
 delete w.hlgbWalIdbGuard9536;
 const writeCount=writes.length;
 await assert.rejects(()=>api.saveAction('projection','legacy-invoice','note',{text:'Sem proteção local não salvar'}),/Proteção de sincronização/);
 assert.equal(writes.length,writeCount,'missing WAL guard cannot reach cloud write');
 assert(writes.every(x=>x.module==='projectionInvoices'||x.module==='finance'||x.module==='orders'));
 console.log('PASS acerto v95.65: cloud-confirmed returns, notes, overpayment guard, audit reversals, finance retry and original order receipt preserved.');
})().catch(e=>{console.error(e);process.exitCode=1});

const note9847={id:'item-note',orderId:'order-1',value:150,paid:20,remaining:130,items:[{productId:'p1',productName:'Camisola',qty:10,unitPrice:10,value:100},{productId:'p2',productName:'Calcinha',qty:10,unitPrice:5,value:50}]};
const a9847=api.itemReturns9847(note9847);assert.equal(a9847.state,'preview');
const b9847=api.itemReturns9847(note9847,[{key:a9847.rows[0].key,qty:2},{key:a9847.rows[1].key,qty:3}]);assert.equal(b9847.amountCents,3500);assert.equal(b9847.balanceAfter,9500);assert.equal(b9847.cashCents,2000);assert.equal(b9847.canWrite,false);
assert.equal(api.itemReturns9847(note9847,[{key:a9847.rows[0].key,qty:11}]).state,'review');
const history9847={...note9847,remaining:95,acertoReturnsV9565:[{id:'r1',value:35,itemsV9847:b9847.picked}]};
assert.equal(api.itemReturns9847(history9847).rows[0].available,8);
assert.equal(api.itemReturns9847({...history9847,acertoReturnsV9565:[{id:'old',value:35}]}).reason,'legacy-return-unallocated');
assert.equal(api.itemReturns9847({...note9847,items:[...note9847.items,note9847.items[0]]}).state,'review');
assert.equal(api.itemReturns9847({...note9847,acertoReturnsV9565:[{...history9847.acertoReturnsV9565[0],reversedAt:'2026-11-27'}]}).rows[0].available,10);
assert.equal(api.itemReturns9847(note9847,a9847.rows.map(r=>({key:r.key,qty:r.qty}))).excessCents,2000);
console.log('PASS item return preview: historical prices, partial, reversed, excess and unidentified legacy');
// Legacy actions must never bypass the integrated item-return ledger when it is enabled later.
(async()=>{
 const fixture={id:'guard-items9849',orderId:'o',value:100,paid:0,remaining:90,status:'Parcial',items:[{productId:'p',qty:10,unitPrice:10,value:100}],acertoReturnsV9565:[{id:'item-return:guard',value:10,itemsV9847:[{key:'line',qty:1,unitCents:1000}]}]};
 db.projectionInvoices.push(fixture);
 await assert.rejects(()=>api.saveAction('projection',fixture.id,'reversal',{entryId:'item-return:guard',reason:'Teste'}),/estorno integrado/);
 await assert.rejects(()=>api.saveAction('projection',fixture.id,'return',{value:1,reason:'Teste'}),/revisão integrada/);
 await assert.rejects(()=>api.saveAction('projection',fixture.id,'edit',{date:'2026-11-26',reason:'Teste',items:[{qty:10,unitPrice:10}],value:100}),/revisão integrada/);
 assert.equal(db.projectionInvoices.find(n=>n.id===fixture.id).remaining,90);
})().catch(e=>{console.error(e);process.exitCode=1});