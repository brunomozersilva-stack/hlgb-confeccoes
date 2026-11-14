'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('release-faction-manual-payment-v9566.js','utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
function mkRow(id,price=3){
 return {
  id,manual:true,source:'faction_manual_payment_v1',manualGroupId:'g1',
  manualKindV9566:'product',serviceModeV9577:'faccao',factionMasterId:10,
  factionName:'Roseli',status:'Pendente',productId:20,
  description:'Camisola Liliane',manualProductNameV9589:'',manualProductCategoryV9589:'',
  travetaPointsPerPieceV9592:null,quantity:10,unitPrice:price,
  value:10*price,grossValueV9577:10*price,travetaDiscountUnitV9577:0,
  travetaDiscountTotalV9577:0,discountAmount:0,paidAmount:0,paymentDate:'',
  scheduledPaymentDate:'2026-11-14',paymentMethod:'Pix',
  observation:'Pagamento avulso de facção',manualLineNoteV9566:'',
  priceOriginV9566:'manual',paymentHistory:[],manualEditHistoryV9588:[],
  createdAt:'2026-11-14T14:00:00Z',updatedAt:'2026-11-14T15:00:00Z'
 };
}
function fixture(settings={}){
 const db={
  factionPayments:[mkRow('line-1'),mkRow('line-2',4)],
  products:[{id:20,name:'Camisola Liliane',factionCost:3}],
  factionMasters:[{id:10,name:'Roseli',factionRoleV9577:'faccao',active:true}],
  factions:[],hubFinanceEntries:[]
 };
 const cloud=clone(db.factionPayments),writes=[];
 let staleRemain=0,oldReadback=null;
 const host={
  db,__HLGB_AUTH_READY:true,addEventListener(){},renderFactionPayments(){},
  hlgbWalIdbGuard9536:{probe:async()=>true,status:()=>({readFailed:false}),ids:()=>[]},
  hlgbRecordSaveWithRetry:async(module,id,record)=>{
   writes.push({module,id,record:clone(record)});
   const before=cloud.find(x=>x.id===id);
   oldReadback=before?clone(before):null;
   let persisted=clone(record);
   if(settings.ackTimestampNormalization)persisted.updatedAt='2026-11-14T16:00:01.000Z';
   if(settings.corruptAck)persisted.value+=1;
   const i=cloud.findIndex(x=>x.id===id);
   if(i>=0)cloud[i]=clone(persisted);else cloud.push(clone(persisted));
   staleRemain=settings.staleReads||0;
   return {applied:true,data:clone(persisted)};
  },
  cloudRequest:async path=>{
   const q=new URL('https://hlgb.invalid/'+path).searchParams;
   const module=q.get('module')?.replace(/^eq\./,'');
   const id=q.get('entity_id')?.replace(/^eq\./,'');
   const record=module==='factionPayments'?cloud.find(x=>x.id===id):null;
   if(record&&staleRemain>0&&id===writes[writes.length-1]?.id){
    staleRemain--;
    return [{data:clone(oldReadback),deleted_at:null,entity_id:id}];
   }
   return record?[{data:clone(record),deleted_at:null,entity_id:id}]:[];
  },
  localSaveOnly(){}
 };
 const doc={getElementById(){return null},addEventListener(){}};
 const ctx={window:host,document:doc,console,Date,Math,JSON,URL,Intl,
  Blob,Uint8Array,btoa,atob,setTimeout:cb=>queueMicrotask(cb)};
 vm.runInNewContext(src,ctx);
 const api=host.hlgbFactionManual9566;
 const edit={
  serviceMode:'faccao',factionName:'Roseli',status:'Pendente',
  date:'2026-11-14',method:'Pix',note:'Pagamento avulso de facção',
  lines:[
   {id:'line-1',kind:'product',productId:20,quantity:10,unitPrice:3,
    travetaDiscountUnit:0,priceOrigin:'manual'},
   {id:'line-2',kind:'product',productId:20,quantity:10,unitPrice:4,
    travetaDiscountUnit:0,priceOrigin:'manual'}
  ]
 };
 return {api,db,cloud,writes,edit};
}
test('sem alterações, não regrava nenhuma linha nem cria revisões',async()=>{
 const t=fixture();
 const before=JSON.stringify(t.db.factionPayments);
 const result=await t.api.saveGroupEdits('g1',t.edit,null);
 assert.equal(result.lines,0,'no-change must be a true no-op');
 assert.equal(t.writes.length,0,'do not write unchanged financial rows');
 assert.equal(JSON.stringify(t.db.factionPayments),before);
});
test('ACK normaliza updatedAt: dados financeiros iguais são confirmados, sem alarme falso',async()=>{
 const t=fixture({ackTimestampNormalization:true});
 const input=clone(t.edit);input.lines[0].quantity=12;
 const result=await t.api.saveGroupEdits('g1',input,null);
 assert.equal(result.total,76);
 assert.equal(result.lines,1,'only edited line is written');
 assert.deepEqual(t.writes.map(x=>x.id),['line-1']);
 assert.equal(t.cloud.find(x=>x.id==='line-1').value,36);
 assert.equal(t.api.editEvidenceStatusV95101().confirmed,1);
 assert.equal(t.api.editEvidenceStatusV95101().unverified,0);
 assert.equal(t.db.hubFinanceEntries.length,0);
});
test('releitura antiga duas vezes: aguarda confirmação sem repetir POST',async()=>{
 const t=fixture({staleReads:2});
 const input=clone(t.edit);input.lines[0].quantity=11;
 const result=await t.api.saveGroupEdits('g1',input,null);
 assert.equal(result.lines,1);
 assert.equal(t.writes.length,1);
 assert.equal(t.api.editEvidenceStatusV95101().delayed,1);
 assert.equal(t.api.editEvidenceStatusV95101().last.attempts,3);
});
test('ACK com negócio divergente: conflito real, não continua regravando outras linhas',async()=>{
 const t=fixture({corruptAck:true});
 const input=clone(t.edit);input.lines[0].quantity=11;
 await assert.rejects(()=>t.api.saveGroupEdits('g1',input,null),/valores diferentes|outra edição/);
 assert.equal(t.writes.length,1);
 assert.equal(t.api.editEvidenceStatusV95101().conflicts,1);
 assert.equal(t.writes[0].id,'line-1');
 assert.equal(t.cloud.find(x=>x.id==='line-2').value,40,'second line is preserved');
});
test('ACK sem releitura conclusiva: bloqueia nova escrita automática e informa estado incerto',async()=>{
 const t=fixture({staleReads:20});
 const input=clone(t.edit);input.lines[0].quantity=11;
 await assert.rejects(()=>t.api.saveGroupEdits('g1',input,null),
  /recebeu 1 alteração|Não repita o salvamento|não coincidiram/);
 assert.equal(t.writes.length,1,'no automatic second POST on uncertain evidence');
 assert.equal(t.api.editEvidenceStatusV95101().unverified,1);
 assert.equal(t.db.factionPayments.find(x=>x.id==='line-1').quantity,11,
  'acknowledged local value preserved, no rollback');
});
