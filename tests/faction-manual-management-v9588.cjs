'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('release-faction-manual-payment-v9566.js','utf8');
assert(src.includes('fm88-pay-modal')&&src.includes('fm88-edit')&&src.includes('fm88-filter-name'));
assert(src.includes('remotelySame(next,remote)'),'paid status must have server readback');
assert(src.includes("sourceType:'faction_manual_payment'"),'hub group must be linked with single source ID');
const deep=x=>JSON.parse(JSON.stringify(x));
const row=(group,id,value=30,receipt=null)=>({
 id,manual:true,source:'faction_manual_payment_v1',manualGroupId:group,
 manualKindV9566:'product',serviceModeV9577:'faccao',factionMasterId:10,
 factionName:'Roseli',productId:20,description:'Camisola Liliane',
 quantity:10,unitPrice:value/10,value,status:'Pendente',paidAmount:0,paymentDate:'',
 scheduledPaymentDate:'2026-11-13',paymentMethod:'',paymentHistory:[],
 updatedAt:'2026-11-13T15:00:00Z',createdAt:'2026-11-13T14:00:00Z',
 ...(receipt?{receiptPdfV9566:receipt}:{})
});
const pdf={name:'comprovante-original.pdf',base64:'JVBERi0=',size:5};
const db={
 factionMasters:[{id:10,name:'Roseli',active:true,factionRoleV9577:'faccao'}],
 factions:[],products:[{id:20,name:'Camisola Liliane',factionCost:3}],
 factionPayments:[row('group-edit','A-1',30,pdf),row('group-edit','A-2',40),
                  row('group-partial','B-1',10),row('group-partial','B-2',15),
                  row('group-wal','C-1',20)],
 hubFinanceEntries:[],
};
const server={factionPayments:deep(db.factionPayments),hubFinanceEntries:[]};
const writes=[];let failId='',pending=[],failHub=false;
const w={db,__HLGB_AUTH_READY:true,addEventListener(){},renderFactionPayments(){},
 hlgbWalIdbGuard9536:{probe:async()=>true,ids:()=>pending,status:()=>({readFailed:false})},
 hlgbRecordSaveWithRetry:async(m,id,record)=>{
  if(failId===String(id)||failHub&&m==='hubFinanceEntries')return {applied:false,reason:'Simulated ACK failure'};
  writes.push({m,id:String(id),status:record.status,value:record.value});
  const arr=server[m]||(server[m]=[]),i=arr.findIndex(x=>String(x.id)===String(id));
  if(i>=0)arr[i]=deep(record);else arr.push(deep(record));
  return {applied:true,data:deep(record)};
 },
 cloudRequest:async(path)=>{
  const q=new URL('https://example.local/'+path).searchParams,
  m=(q.get('module')||'').replace(/^eq\./,''),id=(q.get('entity_id')||'').replace(/^eq\./,'');
  const record=server[m]?.find(x=>String(x.id)===id);
  return record?[{entity_id:id,data:deep(record),deleted_at:null}]:[];
 },
 localSaveOnly(){},};
const ctx={window:w,document:{addEventListener(){},getElementById(){return null}},
 console,Date,Math,Intl,URL,JSON,Uint8Array,Blob,btoa,atob,setTimeout(){return 0}};
vm.createContext(ctx);vm.runInContext(src,ctx);
const api=w.hlgbFactionManual9566;
assert(api&&api.markGroupPaid&&api.saveGroupEdits&&api.openPayModal);
const edit={serviceMode:'faccao',factionName:'Roseli',status:'Pendente',
 date:'2026-11-14',method:'Pix',note:'Serviço corrigido',
 lines:[{id:'A-1',kind:'product',productId:20,quantity:10,unitPrice:3.3,travetaDiscountUnit:0},
        {id:'A-2',kind:'product',productId:20,quantity:10,unitPrice:4.1,travetaDiscountUnit:.1}]};
(async()=>{
 const changed=await api.saveGroupEdits('group-edit',edit,null);
 assert.equal(changed.total,73);assert.equal(changed.lines,2);
 assert.equal(db.factionPayments.find(x=>x.id==='A-1').receiptPdfV9566.name,pdf.name,'keep PDF');
 assert.equal(db.hubFinanceEntries.length,0,'pending edit never creates financial payment');
 assert.deepEqual(db.factionPayments.filter(x=>x.manualGroupId==='group-edit').map(x=>x.id),['A-1','A-2']);
 assert.equal(api.receiptGroups().find(x=>x.id==='group-edit').status,'Pendente');
 await assert.rejects(()=>api.saveGroupEdits('group-edit',
  {...edit,lines:[edit.lines[0]]},null),/remover uma linha/);
 pending=['factionPayments::A-1'];
 const before=writes.length;
 await assert.rejects(()=>api.markGroupPaid('group-edit','2026-11-13','Pix',null),/pendente/);
 assert.equal(writes.length,before,'WAL guard blocks all writes');
 pending=[];
 // A stale remote version must fail preflight instead of overwriting it.
 const stale=server.factionPayments.find(x=>x.id==='A-2');
 stale.updatedAt='2026-11-13T15:10:00Z';
 await assert.rejects(()=>api.markGroupPaid('group-edit','2026-11-13','Pix',null),/Outra sessão/);
 assert.equal(db.hubFinanceEntries.length,0);
 stale.updatedAt=db.factionPayments.find(x=>x.id==='A-2').updatedAt;
 await assert.rejects(()=>api.markGroupPaid('group-edit','2999-11-14','Pix',null),/data real/,'future date blocked if current day 13');
 const paid=await api.markGroupPaid('group-edit','2026-11-13','Pix',null);
 assert.equal(paid.total,73);assert.equal(paid.hubConfirmed,true);
 assert.equal(db.hubFinanceEntries.length,1,'one Hub entry per group');
 assert.equal(db.hubFinanceEntries[0].value,73);
 assert.equal(db.factionPayments.find(x=>x.id==='A-1').status,'Pago');
 assert.equal(db.factionPayments.find(x=>x.id==='A-2').paidAmount,40);
 assert.equal(db.factionPayments.find(x=>x.id==='A-1').receiptPdfV9566.name,pdf.name);
 assert.equal(api.receiptGroups().find(x=>x.id==='group-edit').status,'Pago');
 const count=writes.length;
 await assert.rejects(()=>api.markGroupPaid('group-edit','2026-11-13','Pix',null),/já consta como pago/);
 assert.equal(writes.length,count,'cannot pay twice');
 await assert.rejects(()=>api.saveGroupEdits('group-edit',edit,null),/já pagos/,'paid value protection');
 // If first line succeeds but second fails after Hub, partial status must be
 // visible and retry must reuse same hub financial ID without extra transfer.
 failId='B-2';
 await assert.rejects(()=>api.markGroupPaid('group-partial','2026-11-13','Pix',null),/Hub confirmado/);
 assert.equal(db.hubFinanceEntries.length,2,'Hub posted with deterministic ID');
 assert.equal(api.receiptGroups().find(x=>x.id==='group-partial').status,'Revisar');
 failId='';
 const resumed=await api.markGroupPaid('group-partial','2026-11-13','Pix',null);
 assert.equal(resumed.paid,true);
 assert.equal(db.hubFinanceEntries.length,2,'retry cannot create a second Hub entry');
 assert.equal(server.hubFinanceEntries.length,2,'one server Hub per group');
 assert.equal(api.receiptGroups().find(x=>x.id==='group-partial').status,'Pago');
 // Hub failure precedes paid statuses.
 failHub=true;
 await assert.rejects(()=>api.markGroupPaid('group-wal','2026-11-13','Pix',null),/Hub Financeiro|Simulated/);
 assert.equal(db.factionPayments.find(x=>x.id==='C-1').status,'Pendente');
 assert.equal(db.hubFinanceEntries.length,2);
 failHub=false;
 const final=await api.markGroupPaid('group-wal','2026-11-13','Dinheiro',null);
 assert.equal(final.total,20);
 assert.equal(db.hubFinanceEntries.length,3);
 console.log('PASS faction manual v95.88: edits, same IDs, PDF preservation, WAL/stale blocks, one Hub per payment, readbacks, partial retry and paid protection.');
})().catch(e=>{console.error(e);process.exitCode=1});
