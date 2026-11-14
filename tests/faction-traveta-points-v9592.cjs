'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('release-faction-manual-payment-v9566.js','utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
const product={id:1788255326094,name:'Tanga Katerine',sku:'TK3',travetadas:0,factionCost:1.5,active:true,updatedAt:'2026-11-13T14:00:00Z'};
const db={
 products:[product],factions:[],factionSettings:[{id:'traveta',travetaUnitValue:.08}],
 factionMasters:[{id:1,name:'Tania',factionRoleV9577:'travetador',active:true,travetaDeductionUnit:.08},
 {id:2,name:'Roseli',factionRoleV9577:'faccao',active:true,doesTraveta:false,travetaDeductionUnit:.08},
 {id:3,name:'Cris',factionRoleV9577:'faccao',active:true,doesTraveta:true,travetaDeductionUnit:.08}],
 factionPayments:[],hubFinanceEntries:[]
};
const server={products:copy(db.products),factionPayments:[],hubFinanceEntries:[]},written=[];let pending=[],stale=false;
const w={
 db,__HLGB_AUTH_READY:true,addEventListener(){},renderFactionPayments(){},
 hlgbFactionRates9577:{traveta:master=>master?.travetaDeductionUnit??.08},
 hlgbWalIdbGuard9536:{probe:async()=>true,status:()=>({readFailed:false}),ids:()=>pending},
 hlgbRecordSaveWithRetry:async(module,id,record)=>{
   written.push({module,id:String(id),data:copy(record)});
   const list=server[module],i=list.findIndex(x=>String(x.id)===String(id));
   if(i>=0)list[i]=copy(record);else list.push(copy(record));
   return {applied:true,data:copy(record)};
 },
 cloudRequest:async path=>{
   const q=new URL('https://test.local/'+path).searchParams,module=(q.get('module')||'').replace(/^eq\./,''),
     id=(q.get('entity_id')||'').replace(/^eq\./,'');
   const row=server[module]?.find(x=>String(x.id)===id);
   return row?[{entity_id:id,data:copy(row),deleted_at:null}]:[];
 },
 localSaveOnly(){}
};
const ctx={window:w,document:{addEventListener(){},getElementById(){return null}},
  console,Date,Math,JSON,URL,Intl,Blob,Uint8Array,btoa,atob,setTimeout(){}};
vm.createContext(ctx);vm.runInContext(src,ctx);
const api=w.hlgbFactionManual9566;
const travetaInput=(points,confirm=false)=>({
 factionName:'Tania',serviceMode:'travetada',status:'Pendente',date:'2026-11-13',method:'',note:'Travetada Katerine',
 lines:[{id:'katerine-100',kind:'travetada',productId:product.id,quantity:100,
  pointsPerPieceV9592:points,confirmProductPointsV9592:confirm,unitPrice:.08,travetaDiscountUnit:0}]
});
(async()=>{
 assert.equal(api.pointsPerPieceV9592(product),0,'original fixture ficha 0 travetadas');
 assert.throws(()=>api.validate(travetaInput(3,false)),/Confirme a atualização/);
 assert.equal(written.length,0);
 assert.equal(api.validate(travetaInput(3,true)).total,24,'100 pieces × 3 points × R$ 0.08');
 assert.equal(api.validate(travetaInput(3,true)).lines[0].grossValue,24);
 assert.equal(api.validate(travetaInput(3,true)).lines[0].pointsPerPieceV9592,3);
 assert.equal(api.autoTravetaV9592({travetadas:3},db.factionMasters[1]).perPiece,.24);
 assert.equal(api.autoTravetaV9592({travetadas:3},db.factionMasters[1]).applies,true);
 assert.equal(api.autoTravetaV9592({travetadas:3},db.factionMasters[2]).applies,false);
 pending=['products::'+product.id];
 await assert.rejects(()=>api.persistDraft(travetaInput(3,true),null),/pendente/);
 assert.equal(written.length,0,'WAL blocks ficha and payment');
 pending=[];
 server.products[0].travetadas=2;
 await assert.rejects(()=>api.persistDraft(travetaInput(3,true),null),/mudou em outro computador/);
 assert.equal(written.length,0,'remote mismatch blocks overwrite');
 server.products[0].travetadas=0;
 const result=await api.persistDraft(travetaInput(3,true),null);
 assert.equal(result.total,24);
 assert.equal(db.products[0].travetadas,3);
 assert.equal(server.products[0].travetadas,3);
 assert.equal(server.products[0].factionCost,1.5);
 assert.equal(server.factionPayments.length,1);
 assert.equal(server.factionPayments[0].productId,product.id);
 assert.equal(server.factionPayments[0].quantity,100);
 assert.equal(server.factionPayments[0].travetaPointsPerPieceV9592,3);
 assert.equal(server.factionPayments[0].value,24);
 assert.deepEqual(written.map(x=>x.module),['products','factionPayments'],'save ficha before posting due payment');
 const sewInput={
  factionName:'Roseli',serviceMode:'faccao',status:'Pendente',date:'2026-11-13',method:'',
  lines:[{id:'sew-100',kind:'product',productId:product.id,quantity:100,unitPrice:1.5,travetaDiscountUnit:.24}]
 };
 assert.equal(api.validate(sewInput).total,126,'100 pieces of non-traveta sewing: 1.50-.24');
 assert.equal(api.validate({...sewInput,factionName:'Cris',lines:[{...sewInput.lines[0],travetaDiscountUnit:0}]}).total,150);
 assert.equal(api.validate(sewInput).lines[0].travetaDiscountTotal,24);
 assert.equal(server.products[0].travetadas,3,'sewing calculation is read only');
 const paid=await api.markGroupPaid(result.groupId,'2026-11-13','Pix',null);
 assert.equal(paid.total,24);
 assert.equal(server.hubFinanceEntries.find(x=>x.sourceId===result.groupId).value,24);
 const pdf=Buffer.from(await api.buildSummaryPdfV9590(result.groupId).arrayBuffer()).toString('latin1');
 assert(pdf.includes('3 travetadas por peça'));
 assert(pdf.includes('Total de travetadas: 300'));
 assert.equal(server.products[0].travetadas,3);
 console.log('PASS v95.92: Katerine fixture 0→3 confirms ficha, multiplies pieces×points×price, WAL/stale guards, Roseli -0.24 and exact Hub/PDF.');
})().catch(e=>{console.error(e);process.exitCode=1});
