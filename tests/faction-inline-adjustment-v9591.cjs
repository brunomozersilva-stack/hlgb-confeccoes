'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('release-faction-manual-payment-v9566.js','utf8'),clone=x=>JSON.parse(JSON.stringify(x));
const db={
 factionMasters:[{id:1,name:'Roseli',active:true,factionRoleV9577:'faccao'}],
 factions:[],products:[{id:101,name:'Camisola teste',factionCost:4}],
 factionPayments:[],hubFinanceEntries:[]
};
const cloud={factionPayments:[],hubFinanceEntries:[]},writes=[];let pending=[];
const host={db,__HLGB_AUTH_READY:true,addEventListener(){},renderFactionPayments(){},renderHubFinance(){},
 hlgbWalIdbGuard9536:{probe:async()=>true,status:()=>({readFailed:false}),ids:()=>pending},
 hlgbRecordSaveWithRetry:async(module,id,data)=>{
  writes.push({module,id,copy:clone(data)});
  const cloudItems=cloud[module],i=cloudItems.findIndex(x=>String(x.id)===String(id));
  if(i<0)cloudItems.push(clone(data));else cloudItems[i]=clone(data);
  return {applied:true,data:clone(data)};
 },
 cloudRequest:async path=>{
  const p=new URL('https://hlgb.local/'+path).searchParams,
    module=(p.get('module')||'').replace(/^eq\./,''),
    id=(p.get('entity_id')||'').replace(/^eq\./,''),
    result=cloud[module].find(x=>String(x.id)===String(id));
  return result?[{entity_id:id,deleted_at:null,data:clone(result)}]:[];
 },
 localSaveOnly(){}
};
const ctx={window:host,document:{addEventListener(){},getElementById(){return null}},
  console,Date,Math,JSON,URL,Intl,Blob,Uint8Array,btoa,atob,setTimeout(){}};
vm.createContext(ctx);vm.runInContext(source,ctx);
const api=host.hlgbFactionManual9566;
const line={id:'line-1',kind:'product',productId:101,quantity:10,unitPrice:4,travetaDiscountUnit:0};
const input={factionName:'Roseli',serviceMode:'faccao',date:'2026-11-13',status:'Pendente',method:'Pix',
 note:'Pagamento semana',lines:[line]};
const adjust=(id,kind,amount,reason)=>({id,kind,amount,reason});
(async()=>{
 assert.equal(api.validateDirectInputV9591([adjust('1','abater',5,'Adiantamento da semana')]).length,1);
 assert.throws(()=>api.validateDirectInputV9591([adjust('1','abater',3,'oi')]),/motivo/);
 assert.throws(()=>api.validateDirectInputV9591([adjust('1','abater',0,'Valor zerado por engano')]),/valor maior/);
 assert.throws(()=>api.validateDirectInputV9591([adjust('1','outra',3,'Tipo inválido no formulário')]),/Escolha/);
 const bad={...input,directAdjustmentsV9591:[adjust('minus','abater',40,'Desconto maior que o serviço')]};
 await assert.rejects(()=>api.persistDraft(bad,null),/total líquido/i,'cannot save zero net');
 assert.equal(writes.length,0,'invalid net must not write anything');
 const good={...input,directAdjustmentsV9591:[
  adjust('minus','abater',5,'Adiantamento da semana'),
  adjust('plus','acrescentar',2,'Complemento por serviço extra')]};
 const created=await api.persistDraft(good,null);
 assert.equal(created.total,37);
 const group=created.groupId;
 assert.equal(api.receiptGroups().find(x=>x.id===group).total,37);
 assert.equal(db.factionPayments[0].value,40,'base service remains unchanged');
 assert.equal(db.factionPayments[0].manualDirectAdjustmentsV9591.length,2);
 assert.equal(db.hubFinanceEntries.length,0,'pending adjustment must not post payment');
 const before=writes.length;
 await assert.rejects(()=>api.saveGroupEdits(group,{...input,directAdjustmentsV9591:[
  adjust('again','abater',38,'Desconto excessivo no fechamento')]},null),/crédito|valor restante/);
 assert.equal(writes.length,before,'invalid edit must not modify records');
 pending=['factionPayments::line-1'];
 await assert.rejects(()=>api.saveGroupEdits(group,{...input,directAdjustmentsV9591:[
  adjust('late','acrescentar',1,'Valor adicional autorizado')]},null),/pendente/);
 assert.equal(writes.length,before,'WAL must block saving a fresh adjustment');
 pending=[];
 const edited=await api.saveGroupEdits(group,{...input,directAdjustmentsV9591:[
  adjust('late','acrescentar',1,'Valor adicional autorizado')]},null);
 assert.equal(edited.total,38);
 assert.equal(api.receiptGroups().find(x=>x.id===group).total,38);
 assert.equal(db.factionPayments[0].manualDirectAdjustmentsV9591.length,3);
 assert.equal(cloud.factionPayments[0].manualDirectAdjustmentsV9591.length,3,'remote save is confirmed');
 const pdf=Buffer.from(await api.buildSummaryPdfV9590(group).arrayBuffer());
 assert(pdf.toString('utf8',0,5)==='%PDF-');
 assert(pdf.toString('latin1').includes('AJUSTES DIRETOS NESTE PAGAMENTO'));
 assert(pdf.toString('latin1').includes('Adiantamento da semana'));
 assert(pdf.toString('latin1').includes('Complemento por servi'));
 assert.equal(db.hubFinanceEntries.length,0,'pdf and edit must not pay automatically');
 const paid=await api.markGroupPaid(group,'2026-11-13','Pix',null);
 assert.equal(paid.total,38);
 assert.equal(db.hubFinanceEntries.length,1);
 assert.equal(db.hubFinanceEntries[0].value,38,'Hub uses actual net');
 assert.equal(db.factionPayments[0].paidAmount,38);
 assert.equal(db.factionPayments[0].value,40,'original piece total preserved');
 await assert.rejects(()=>api.saveGroupEdits(group,{...input,directAdjustmentsV9591:[
   adjust('after-pay','abater',1,'Ajuste após pago')]},null),/Apenas lançamentos pendentes/);
 console.log('PASS v95.91: inline abatement/addition, mandatory reason, negative net protection, WAL, PDF and exact Hub payout.');
})().catch(err=>{console.error(err);process.exitCode=1});
