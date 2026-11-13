'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=p=>fs.readFileSync(p,'utf8');
const boot=code('app-stable3.html');assert(boot.includes("'release-faction-service-rates-v9577.js'"));
const db={factionMasters:[{id:'a',name:'Maria',active:true,factionRoleV9577:'embaladeira',doesTraveta:false},
 {id:'b',name:'Roseli',active:true,doesTraveta:false,factionRoleV9577:'faccao'},
 {id:'c',name:'Graziano',active:true,doesTraveta:true,factionRoleV9577:'faccao'},
 {id:'d',name:'Tania',active:true,factionRoleV9577:'travetador',travetaDeductionUnit:.08}],
 factions:[{id:'hist',name:'Roseli'}],factionPayments:[],hubFinanceEntries:[],
 products:[{id:1,name:'Camisola Melina',factionCost:2.9},{id:2,name:'Doll Crystal',factionCost:2.7},
  {id:3,name:'Calcinha Ariana',factionCost:1.5},{id:4,name:'Modelo especial',factionCost:1.8}],
 factionSettings:[{id:'traveta',travetaUnitValue:.05}]};
let writes=[];
const w={db,__HLGB_TEST__:true,__HLGB_AUTH_READY:true,addEventListener(){},renderFactionPayments(){},
 hlgbWalIdbGuard9536:{probe:async()=>true,ids:()=>[],status:()=>({readFailed:false})},
 hlgbRecordSaveWithRetry:async(m,id,row)=>{writes.push({m,id,row});return {applied:true,data:JSON.parse(JSON.stringify(row))}}};
const d={getElementById:()=>null,addEventListener(){}},ctx={window:w,document:d,console,Date,Math,Intl,JSON,
 setTimeout(){},btoa,atob,Uint8Array,Blob};
vm.createContext(ctx);
for(const p of ['release-faction-service-rates-v9577.js','release-faction-manual-payment-v9566.js'])vm.runInContext(code(p),ctx);
const f=w.hlgbFactionManual9566,r=w.hlgbFactionRates9577;
assert.equal(f.version,'95.66');assert.equal(r.version,'95.77');
assert.equal(r.embalagem(db.products[0]),.25);
assert.equal(r.embalagem(db.products[1]),.25);
assert.equal(r.embalagem(db.products[2]),.15);
assert.equal(r.embalagem(db.products[3]),null,'unknown category is manual, not guessed');
assert.equal(r.traveta(db.factionMasters[1]),.05,'uses preexisting central traveta price');
assert.equal(f.searchFactions('maria','embalagem').length,1);
assert.equal(f.searchFactions('maria','faccao').length,0,'packer must not appear among regular factions');
assert.equal(f.searchFactions('roseli','embalagem').length,0);
assert.equal(f.searchFactions('tania','travetada').length,1,'travetadora must appear in its own payment activity');
assert.equal(f.searchFactions('tania','faccao').length,0,'travetador should not be mixed with sewing factions');
assert.equal(f.searchFactions('maria','travetada').length,0,'packer should not appear among travetadores');
const pack={serviceMode:'embalagem',factionName:'Maria',status:'Pago',date:'2026-11-13',method:'Pix',
 lines:[{id:'em1',kind:'embalagem',quantity:100,productId:3,unitPrice:.15,travetaDiscountUnit:0},
 {id:'em2',kind:'embalagem',quantity:40,productId:1,unitPrice:.25,travetaDiscountUnit:0}]};
const pr=f.validate(pack);assert.equal(pr.total,25);assert.equal(pr.lines[0].value,15);assert.equal(pr.lines[1].value,10);
assert.throws(()=>f.validate({...pack,factionName:'Roseli'}),/embaladeira/);
assert.throws(()=>f.validate({...pack,serviceMode:'faccao'}),/facção de costura/);
assert.throws(()=>f.validate({...pack,lines:[{...pack.lines[0],travetaDiscountUnit:.16}]}),/não pode ultrapassar/);
const manualPack={serviceMode:'embalagem',factionName:'Maria',status:'Pendente',date:'2026-11-13',method:'',
 lines:[{id:'pack-avulso',kind:'embalagem',productId:'',unregistered:true,
  manualProductName:'Camisola especial não cadastrada',manualProductCategory:'camisola',
  quantity:80,unitPrice:.25,travetaDiscountUnit:0}]};
const manualResult=f.validate(manualPack);
assert.equal(manualResult.total,20);
assert.equal(manualResult.lines[0].productId,null,'unregistered model must not be assigned a fake catalog ID');
assert.match(manualResult.lines[0].description,/Camisola especial/);
assert.equal(manualResult.lines[0].manualProductName,'Camisola especial não cadastrada');
assert.throws(()=>f.validate({...manualPack,lines:[{...manualPack.lines[0],manualProductName:''}]}),/informe o nome/);
assert.throws(()=>f.validate({...manualPack,lines:[{...manualPack.lines[0],unregistered:false}]}),/Modelo não cadastrado|modelo não cadastrado/);
assert.throws(()=>f.validate({...manualPack,lines:[{...manualPack.lines[0],unitPrice:0}]}),/maior que zero/);
const soloTraveta={serviceMode:'travetada',factionName:'Tania',status:'Pendente',date:'2026-11-13',
 method:'Pix',lines:[{id:'traveta-avulso',kind:'travetada',productId:'',quantity:300,unitPrice:.08,travetaDiscountUnit:0}]};
assert.equal(f.validate(soloTraveta).total,24);
assert.equal(f.validate(soloTraveta).lines[0].description,'Travetada');
assert.throws(()=>f.validate({...soloTraveta,factionName:'Roseli'}),/atividade principal Travetada/);
assert.throws(()=>f.validate({...soloTraveta,lines:[{...soloTraveta.lines[0],kind:'product'}]}),/Escolha um produto cadastrado|apenas serviços de travetada/);
assert.throws(()=>f.validate({...soloTraveta,lines:[{...soloTraveta.lines[0],travetaDiscountUnit:.01}]}),/não deve ter desconto/);
const service={...pack,serviceMode:'faccao',factionName:'Roseli',
 lines:[{id:'fac1',kind:'product',productId:1,quantity:100,unitPrice:2.9,travetaDiscountUnit:.05}]};
const parsed=f.validate(service);
assert.equal(parsed.total,285,'traveta subtracts 5 cents from each piece');
assert.equal(parsed.lines[0].grossValue,290);assert.equal(parsed.lines[0].travetaDiscountTotal,5);
(async()=>{
 const p=await f.persistDraft(service,null);
 assert.equal(p.total,285);assert.equal(db.factionPayments[0].discountAmount,5);
 assert.equal(db.factionPayments[0].travetaDiscountUnitV9577,.05);
 assert.equal(db.hubFinanceEntries[0].value,285,'Hub shows net payable, not gross');
 await r.save({packCamisolaV9577:.30,packDollV9577:.27,packCalcinhaV9577:.18,travetaUnitValue:.07});
 assert.equal(r.embalagem(db.products[0]),.30);
 assert.equal(r.traveta(db.factionMasters[1]),.07);
 assert.equal(writes.some(x=>x.m==='factionSettings'&&x.id==='traveta'),true);
 assert.equal(db.factionPayments[0].value,285,'changing rate cannot retroactively mutate past payment');
 assert.match(code('release-faction-master-integrity.js'),/mfDoesTravetaV9577/);
 assert.match(code('release-faction-traveta-payment-v9424.js'),/masterFor/);
 console.log('PASS v95.77: packer-only search, packaging rates, traveta deductions, Hub net totals, master flags and safe central settings');
})().catch(e=>{console.error(e);process.exitCode=1});
