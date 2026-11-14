'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const src=fs.readFileSync('release-faction-manual-payment-v9566.js','utf8');
const deep=x=>JSON.parse(JSON.stringify(x));
const row=(id,group,amount,status='Pendente',name='Roseli')=>({
 id,manual:true,source:'faction_manual_payment_v1',manualGroupId:group,
 manualKindV9566:'product',serviceModeV9577:'faccao',factionMasterId:1,
 factionName:name,productId:101,description:'Camisola teste',
 quantity:10,unitPrice:amount/10,value:amount,grossValueV9577:amount,travetaDiscountUnitV9577:0,
 travetaDiscountTotalV9577:0,discountAmount:0,
 status,paidAmount:status==='Pago'?amount:0,paymentDate:status==='Pago'?'2026-11-13':'',
 scheduledPaymentDate:'2026-11-13',paymentMethod:status==='Pago'?'Pix':'',
 paymentHistory:[],createdAt:'2026-11-13T10:00:00Z',updatedAt:'2026-11-13T14:00:00Z'
});
function hubId(group){let n=0;for(const ch of String(group))n=(n*31+ch.charCodeAt(0))%9999999999999;return 300000000000000+n}
const db={
 products:[{id:101,name:'Camisola teste',factionCost:4}],
 factionMasters:[{id:1,name:'Roseli',active:true},{id:2,name:'Vanessa',active:true}],
 factions:[],factionPayments:[row('src','source',100,'Pago'),
  row('p1','pending',40),row('p2','pending',35),row('p3','pending',5),
  row('solo','soloGroup',5),row('other','otherGroup',20,'Pendente','Vanessa')],
 hubFinanceEntries:[{id:hubId('source'),sourceId:'source',sourceType:'faction_manual_payment',
 status:'Realizado',value:100,date:'2026-11-13',paymentMethod:'Pix',flow:'Saída'}]
};
const server={factionPayments:deep(db.factionPayments),hubFinanceEntries:deep(db.hubFinanceEntries)};
let pending=[],failId='',writes=[];
const w={
 db,__HLGB_AUTH_READY:true,addEventListener(){},renderFactionPayments(){},
 hlgbWalIdbGuard9536:{probe:async()=>true,status:()=>({readFailed:false}),ids:()=>pending},
 hlgbRecordSaveWithRetry:async(module,id,data)=>{
  if(String(id)===failId)return {applied:false,reason:'Falha simulada'};
  writes.push({module,id:String(id)});
  const save=(items,record)=>{
   const i=items.findIndex(x=>String(x.id)===String(id));if(i>=0)items[i]=deep(record);else items.push(deep(record))
  };
  save(server[module],data);return {applied:true,data:deep(data)};
 },
 cloudRequest:async(path)=>{
  const q=new URL('https://test.local/'+path).searchParams,
   module=(q.get('module')||'').replace(/^eq\./,''),
   id=(q.get('entity_id')||'').replace(/^eq\./,''),
   rec=server[module]?.find(x=>String(x.id)===String(id));
  return rec?[{entity_id:id,deleted_at:null,data:deep(rec)}]:[];
 },
 localSaveOnly(){},
};
const ctx={window:w,document:{addEventListener(){},getElementById(){return null}},
 console,Date,Math,JSON,URL,Intl,Error,Number,Blob,Uint8Array,btoa,atob,setTimeout(){}};
vm.createContext(ctx);vm.runInContext(src,ctx);
const api=w.hlgbFactionManual9566;
assert(api.registerCorrectionV9590&&api.applyCorrectionV9590&&api.buildSummaryPdfV9590);
const edit={
 factionName:'Roseli',serviceMode:'faccao',status:'Pendente',date:'2026-11-13',method:'',note:'Editei valores e removi erro',
 lines:[{id:'p1',kind:'product',productId:101,quantity:10,unitPrice:4,travetaDiscountUnit:0},
  {id:'p2',kind:'product',productId:101,quantity:10,unitPrice:3.5,travetaDiscountUnit:0}]
};
(async()=>{
 await assert.rejects(()=>api.saveGroupEdits('pending',edit,null),/removido sem motivo/);
 assert.equal(writes.length,0,'no writes without cancellation reason');
 await assert.rejects(()=>api.saveGroupEdits('pending',edit,null,[{id:'p3',reason:'x'}]),/motivo/);
 assert.equal(writes.length,0);
 const out=await api.saveGroupEdits('pending',edit,null,[{id:'p3',reason:'Produto lançado por engano na lista'}]);
 assert.equal(out.canceled,1);
 assert.equal(api.receiptGroups().find(x=>x.id==='pending').total,75);
 const canceled=db.factionPayments.find(x=>x.id==='p3');
 assert.equal(canceled.status,'Cancelado');
 assert.equal(canceled.value,5,'retain original amount for audit');
 assert.equal(canceled.manualCanceledReasonV9590,'Produto lançado por engano na lista');
 assert.equal(server.factionPayments.find(x=>x.id==='p3').manualCanceledV9590,true,'confirmed remote');
 assert.equal(db.hubFinanceEntries.length,1,'pending edit never creates a Hub write');
 const beforePdf=writes.length;
 const pdf=api.buildSummaryPdfV9590('pending');
 assert(pdf instanceof Blob,'real PDF Blob');
 const raw=Buffer.from(await pdf.arrayBuffer());
 assert.equal(raw.toString('utf8',0,5),'%PDF-');
 assert(raw.toString('latin1').includes('ITENS CANCELADOS'));
 assert(raw.toString('latin1').includes('Produto lancado por engano')||
        raw.toString('latin1').includes('Produto lançado por engano'),'PDF embeds cancellation reason');
 assert(raw.toString('latin1').includes('xref'),'PDF must have object offsets/xref');
 assert.equal(writes.length,beforePdf,'PDF generation must remain read only');
 const cleanAll=await api.saveGroupEdits('soloGroup',{...edit,lines:[]},null,
  [{id:'solo',reason:'Pedido avulso inteiro cancelado'}]);
 assert.equal(cleanAll.canceled,1,'last row can cancel the entire pending group');
 assert.equal(api.receiptGroups().find(x=>x.id==='soloGroup').status,'Cancelado');
 assert.equal(api.receiptGroups().find(x=>x.id==='soloGroup').total,0);
 await assert.rejects(()=>api.markGroupPaid('soloGroup','2026-11-13','Pix',null),/inconsistente/);
 await assert.rejects(()=>api.registerCorrectionV9590('source','a_mais',4,'abc','invalid-note'),/motivo/);
 const credit=await api.registerCorrectionV9590('source','a_mais',15,'Pix enviado quinze reais a mais','credit-v9590');
 assert.equal(credit.amount,15);
 assert.equal(api.correctionRemainingV9590(credit),15);
 const count=writes.length;
 const duplicate=await api.registerCorrectionV9590('source','a_mais',15,'Pix enviado quinze reais a mais','credit-v9590');
 assert.equal(duplicate.id,credit.id);
 assert.equal(writes.length,count,'repeated correction ID cannot create another event');
 const under=await api.registerCorrectionV9590('source','a_menos',7,'Pix enviado sete reais abaixo do acerto','under-v9590');
 assert.equal(under.amount,7);
 assert.equal(db.hubFinanceEntries.find(x=>x.sourceId==='source').value,100,
  'original paid Hub is not rewritten');
 assert.equal(db.factionPayments.find(x=>x.id==='src').paidAmount,100);
 await assert.rejects(()=>api.applyCorrectionV9590('source',credit.id,'otherGroup',3),/mesma facção/);
 await assert.rejects(()=>api.applyCorrectionV9590('source',credit.id,'pending',16),/ultrapassa o saldo/);
 pending=['factionPayments::p1'];
 await assert.rejects(()=>api.applyCorrectionV9590('source',credit.id,'pending',10),/pendente/,'WAL blocks destination');
 pending=[];
 const applyCredit=await api.applyCorrectionV9590('source',credit.id,'pending',10);
 assert.equal(applyCredit.applied,10);
 assert.equal(api.receiptGroups().find(x=>x.id==='pending').total,65);
 assert.equal(api.correctionRemainingV9590(credit),5);
 const afterCredit=writes.length;
 await api.applyCorrectionV9590('source',credit.id,'pending',10);
 assert.equal(writes.length,afterCredit,'reapply same correction-to-target must be idempotent');
 await api.applyCorrectionV9590('source',under.id,'pending',7);
 assert.equal(api.receiptGroups().find(x=>x.id==='pending').total,72);
 assert.equal(api.correctionRemainingV9590(under),0);
 assert.equal(api.receiptGroups().find(x=>x.id==='source').adjustmentBalance,-5,
  'remaining overpayment credit must be visible');
 const pdfAfter=Buffer.from(await api.buildSummaryPdfV9590('pending').arrayBuffer());
 assert(pdfAfter.toString('latin1').includes('Crédito de pagamento anterior'));
 assert(pdfAfter.toString('latin1').includes('Diferença de pagamento anterior'));
 assert(pdfAfter.toString('latin1').includes('Pix enviado'));
 const paid=await api.markGroupPaid('pending','2026-11-13','Pix',null);
 assert.equal(paid.total,72,'cash payout nets credit and underpayment');
 assert.equal(server.hubFinanceEntries.find(x=>x.sourceId==='pending').value,72);
 assert.equal(db.factionPayments.find(x=>x.id==='p3').status,'Cancelado','canceled row stays canceled');
 assert.equal(db.factionPayments.filter(x=>x.manualGroupId==='pending'&&x.status==='Pago')
  .reduce((sum,x)=>sum+x.paidAmount,0),72);
 await assert.rejects(()=>api.saveGroupEdits('pending',edit,null),/Apenas lançamentos pendentes/);
 await assert.rejects(()=>api.markGroupPaid('pending','2026-11-13','Pix',null),/já consta como pago/);
 assert.equal(server.hubFinanceEntries.filter(x=>x.sourceId==='pending').length,1);
 console.log('PASS v95.90: soft cancellation/audit, all-cancel, PDF, over/underpayment credits, WAL, same-payee, idempotent compensation, net Hub payment.');
})().catch(e=>{console.error(e);process.exitCode=1});
