'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),
 vm=require('node:vm'),path=require('node:path');
const ROOT=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(ROOT,'release-faction-payee-settlement-v95104.js'),'utf8');
const consolidate=require('../release-faction-acerto-consolidated-v95102.js').consolidate;
const clone=x=>JSON.parse(JSON.stringify(x));
const ID='1794935162875130',FID='1793731913460',VAN='1788439866181',ROS='1788439191914';
function fixture(opts={}){
 const original={
  id:Number(ID),factionServiceId:Number(FID),source:'faction_delivery_v9223',
  factionName:'Vanessa',description:'Robe Gabrielle',productId:1788193625605,
  status:opts.status||'Pendente',value:492.9,quantity:159,unitPrice:3.1,
  pix:'PIX-VANESSA',paidAmount:opts.paidAmount||0,discountAmount:0,
  paymentHistory:[],paymentDate:'',paymentMethod:'',observation:'Entrega parcial de facção',
  deliveryId:Number(ID),noteQueueId:1794935163018271
 };
 const masters=[
  {id:Number(VAN),name:'Vanessa',active:true,pix:'PIX-VANESSA',factionRoleV9577:'faccao'},
  {id:Number(ROS),name:'Roseli',active:true,pix:'PIX-ROSELI',factionRoleV9577:opts.role||'faccao'}];
 const db={
  factionPayments:[clone(original)],factionMasters:clone(masters),
  factions:[{id:Number(FID),name:'Vanessa',description:'Robe Gabrielle',sent:180,done:159}],
  hubFinanceEntries:[]
 };
 const cloud={
  factionPayments:new Map([[ID,{module:'factionPayments',entity_id:ID,
     data:clone(original),revision:3,deleted_at:null}]]),
  factionMasters:new Map(masters.map(m=>[String(m.id),{module:'factionMasters',
    entity_id:String(m.id),data:clone(m),revision:1,deleted_at:null}]))
 };
 const writes=[],reads=[],log=[],hub=opts.hub||[];
 const window={
  db,__HLGB_AUTH_READY:true,__HLGB_PAYEE_SYNC_PATCH_95104:opts.loaderPatch!==false,
  cloudRequest:async(url)=>{
   reads.push(url);
   if(url.includes('module=eq.hubFinanceEntries'))return clone(hub);
   const mod=url.match(/module=eq\.([^&]+)/)?.[1],id=url.match(/entity_id=eq\.([^&]+)/)?.[1];
   return cloud[mod]?.has(id)?[clone(cloud[mod].get(id))]:[];
  },
  hlgbRecordSaveWithRetry:async(mod,id,next)=>{
   if(opts.rejectSave)return {applied:false};
   writes.push({module:mod,id,data:clone(next)});
   const r=cloud[mod].get(id);cloud[mod].set(id,{...r,data:clone(next),revision:r.revision+1});
   return {applied:true,data:clone(next)};
  },
  localSaveOnly:()=>log.push('local'),
  renderFactionPayments:()=>log.push('render'),
  hlgbFactionAcertoUnified95102:{render:()=>log.push('acerto')},
  addEventListener:()=>{}
 };
 const localStorage={getItem:k=>opts.wal&&k==='hlgb_durable_wal_v1'?
   JSON.stringify({entries:{pending:{module:'factionPayments',id:ID}}}):null};
 const indexedDB={open:()=>{
  const request={};
  Promise.resolve().then(()=>{
   request.result={objectStoreNames:{contains:()=>true},close(){},
    transaction:()=>{
     const tx={};
     tx.objectStore=()=>({getAll:()=>{
      const got={};Promise.resolve().then(()=>{
       got.result=opts.indexedPending?[{module:'factionPayments',id:ID}]:[];
       got.onsuccess?.();tx.oncomplete?.();
      });return got;
     }});
     return tx;
    }};
   request.onsuccess?.();
  });
  return request;
 }};
 const document={addEventListener(){},getElementById:()=>null};
 const context={window,localStorage,indexedDB,document,navigator:{onLine:true},
  setTimeout:fn=>{Promise.resolve().then(fn);return 1},console,alert:()=>{},
  Error,Number,Object,Array,Map,Promise,encodeURIComponent,Date,JSON};
 vm.createContext(context);
 vm.runInContext(source,context);
 return {api:window.hlgbFactionPayeeSettlement95104,window,db,cloud,writes,reads,log};
}
test('Robe Gabrielle 159 peças R$492,90: Vanessa -> Roseli, com origem e entrega preservadas',async()=>{
 const f=fixture(),beforeF=JSON.stringify(f.db.factions),original=f.db.factionPayments[0];
 const result=await f.api.changePayee(ID,ROS,'Robe Gabrielle repassado da Vanessa para Roseli');
 assert.equal(result.to,'Roseli');
 const p=f.db.factionPayments[0];
 assert.equal(p.factionName,'Roseli');assert.equal(p.factionMasterId,Number(ROS));
 assert.equal(p.pix,'PIX-ROSELI');assert.equal(p.status,'Pendente');
 assert.equal(p.quantity,159);assert.equal(p.value,492.9);
 assert.equal(p.factionServiceId,Number(FID));
 assert.equal(p.deliveryId,original.deliveryId);assert.equal(p.noteQueueId,original.noteQueueId);
 assert.equal(JSON.stringify(f.db.factions),beforeF);
 assert.equal(p.payeeTransferHistoryV95104[0].fromName,'Vanessa');
 assert.equal(p.payeeTransferHistoryV95104[0].toName,'Roseli');
 assert.equal(f.writes.length,1);
 assert.ok(f.writes.every(x=>x.module==='factionPayments'),'nenhuma gravação em outro módulo');
 const sums=consolidate({payments:f.db.factionPayments,masters:f.db.factionMasters,manualGroups:[]});
 assert.equal(sums.groups.length,1);assert.equal(sums.groups[0].factionName,'Roseli');
 assert.equal(sums.groups[0].totalCents,49290);
});
test('Já pago antes: anota data, forma e observação sem criar outra saída no Hub',async()=>{
 const f=fixture(),before=JSON.stringify(f.db.factions);
 const result=await f.api.markPreviouslyPaid(ID,'2026-11-14','PIX',
  'Foi pago anteriormente em um PIX de outro fechamento','Comprovante 123');
 assert.equal(result.reconciliation,'pendente_conciliacao_bancaria');
 const p=f.db.factionPayments[0];
 assert.equal(p.status,'Pago');assert.equal(p.paidAmount,492.9);
 assert.equal(p.paymentDate,'2026-11-14');assert.equal(p.paymentMethod,'PIX');
 assert.match(p.observation,/pago/i);
 assert.equal(p.paymentHistory[0].source,'hlgb-existing-payment-v95104');
 assert.equal(f.db.hubFinanceEntries.length,0);
 assert.equal(f.writes.length,1);assert.equal(f.writes[0].module,'factionPayments');
 assert.equal(JSON.stringify(f.db.factions),before);
 const total=consolidate({payments:f.db.factionPayments,masters:f.db.factionMasters,manualGroups:[]});
 assert.equal(total.groups.length,0,'pagamento anterior não volta ao acerto pendente');
 await assert.rejects(()=>f.api.markPreviouslyPaid(ID,'2026-11-14','PIX','Pagar novamente'),/pendente/i);
 assert.equal(f.writes.length,1,'dupla baixa bloqueada');
});
test('Pagamento com PIX anterior associado no Hub não é marcado silenciosamente',async()=>{
 const f=fixture({hub:[{entity_id:'hub1',deleted_at:null,data:{sourceId:ID,status:'Realizado'}}]});
 await assert.rejects(()=>f.api.markPreviouslyPaid(ID,'2026-11-14','PIX','Pagamento anterior associado'),/Hub/);
 assert.equal(f.writes.length,0);
});
test('Troca exige motivo, facção de costura e parcela integralmente pendente',async()=>{
 const f=fixture();
 await assert.rejects(()=>f.api.changePayee(ID,ROS,'oi'),/motivo/);
 const bad=fixture({role:'embaladeira'});
 await assert.rejects(()=>bad.api.changePayee(ID,ROS,'Transferido para outra pessoa'),/costura/);
 const partial=fixture({status:'Parcial',paidAmount:100});
 await assert.rejects(()=>partial.api.changePayee(ID,ROS,'Alterando alguém pago'),/pendente/);
 assert.equal(f.writes.length+bad.writes.length+partial.writes.length,0);
});
test('Rejeita versões locais antigas, WAL pendente e falta de proteção do carregador',async()=>{
 const stale=fixture();
 stale.cloud.factionPayments.get(ID).data.value=555.9;
 await assert.rejects(()=>stale.api.changePayee(ID,ROS,'Correção após o repasse da peça'),/mudou na nuvem/);
 const wal=fixture({wal:true});
 await assert.rejects(()=>wal.api.changePayee(ID,ROS,'Correção após o repasse da peça'),/pendente/);
 const noPatch=fixture({loaderPatch:false});
 await assert.rejects(()=>noPatch.api.changePayee(ID,ROS,'Correção após o repasse da peça'),/sincronização indisponível/);
 const idb=fixture({indexedPending:true});
 await assert.rejects(()=>idb.api.changePayee(ID,ROS,'Correção após o repasse da peça'),/IndexedDB/);
 assert.equal(stale.writes.length+wal.writes.length+noPatch.writes.length+idb.writes.length,0);
});
test('Sem ACK remoto, nenhum pagamento local muda e não há gravação no Hub',async()=>{
 const f=fixture({rejectSave:true}),before=JSON.stringify(f.db.factionPayments);
 await assert.rejects(()=>f.api.changePayee(ID,ROS,'Peça transferida para outra facção'),/servidor não confirmou/);
 assert.equal(JSON.stringify(f.db.factionPayments),before);
 assert.equal(f.writes.length,0);
});
test('Proteção do sync legado e ações visíveis no acerto mantidas no carregador',()=>{
 const loader=fs.readFileSync(path.join(ROOT,'app-stable3.html'),'utf8');
 const acerto=fs.readFileSync(path.join(ROOT,'release-faction-acerto-consolidated-v95102.js'),'utf8');
 const manual=fs.readFileSync(path.join(ROOT,'release-faction-manual-payment-v9566.js'),'utf8');
 const base=fs.readFileSync(path.join(ROOT,'app9240.html'),'utf8');
 assert.match(loader,/__HLGB_PAYEE_SYNC_PATCH_95104/);
 assert.match(loader,/release-faction-payee-settlement-v95104\.js/);
 assert.ok(base.includes('p.factionName=f.name||p.factionName;'),'âncora do loader precisa existir');
 assert.ok(base.includes('p.pix=master?.pix||p.pix||"";'),'PIX precisa conservar destinatário');
 assert.match(acerto,/data-payee104-id/);
 assert.match(acerto,/data-already-paid104-id/);
 assert.match(acerto,/data-manual-payee104-group/);
 assert.match(manual,/payeeTransferHistoryV95104/);
 assert.match(manual,/Para trocar a facção do acerto avulso/);
});
