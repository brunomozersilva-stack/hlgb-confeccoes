'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','release-faction-manual-payment-v9566.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-faction-manual-payment-v9566.js'"),'plugin must load in app-stable3');
const db={factionMasters:[
 {id:10,name:'Roseli',active:true},{id:11,name:'Ge',active:true},{id:12,name:'Inativa',active:false}],
 factions:[{id:3,name:'Roseli'},{id:4,name:'Vanessa'}],
 productionLocations:[{id:101,name:'Interno de corte'}],
 factionPayments:[],hubFinanceEntries:[],
 products:[{id:20,name:'Camisola Liliane',code:'CL-21',factionCost:2.6,labor:3.4},
 {id:21,name:'Doll Melânia',sku:'DM99',factionCost:0}]};
let pending=[],writes=[],failId='',usedSave=false;
const window={db,addEventListener(){},renderFactionPayments(){return true},
 hlgbWalIdbGuard9536:{probe:async()=>true,ids:()=>pending,status:()=>({readFailed:false})},
 hlgbRecordSaveWithRetry:async(module,id,row)=>{
  writes.push({module,id});usedSave=true;
  if(id===failId)return {applied:false,reason:'Simulated cloud failure'};
  return {applied:true,data:JSON.parse(JSON.stringify(row))};
 }};
const document={addEventListener(){},getElementById(){return null}};
const context={window,document,console,Date,Math,Intl,setTimeout(){return 0},
 btoa,atob,Uint8Array,Blob,Error,Number,JSON};
vm.createContext(context);
vm.runInContext(src,context,{filename:'release-faction-manual-payment-v9566.js'});
const api=window.hlgbFactionManual9566;
assert(api&&api.version==='95.66');
assert.deepEqual(Array.from(api.factionDirectory().map(x=>x.name)),['Ge','Roseli','Vanessa']);
assert.equal(api.searchFactions('ROSELI')[0].source,'Cadastro','registered names win over assignment labels');
assert.equal(api.searchProducts('cl-21')[0].id,20,'search by code');
assert.equal(api.searchProducts('melania')[0].id,21,'accent-insensitive product search');
assert.equal(api.productPrice(db.products[0]),2.6,'factionCost is the suggestion, not labor');
assert.equal(api.productPrice(db.products[1]),null,'no registered price must remain manually editable');
assert.throws(()=>api.validate({factionName:'not registered',date:'2026-11-12',status:'Pendente',lines:[{id:'a',kind:'travetada',quantity:1,unitPrice:2}]}),/cadastrada/);
assert.throws(()=>api.validate({factionName:'Roseli',date:'2026-02-30',status:'Pendente',lines:[{id:'a',kind:'travetada',quantity:1,unitPrice:2}]}),/data válida/);
const binary=Buffer.from('%PDF-1.4\n1 0 obj\n<< >>\nendobj\n%%EOF');
const file={size:binary.length,name:'pagamento.pdf',arrayBuffer:async()=>binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.length)};
const input={factionName:'Roseli',date:'2026-11-12',status:'Pago',method:'Pix',note:'Acerto semanal',
 lines:[{id:'model-1',kind:'product',productId:20,quantity:10,unitPrice:3.2,priceOrigin:'manual'},
  {id:'traveta-1',kind:'travetada',productId:'',quantity:20,unitPrice:.20,priceOrigin:'manual',note:'Travetada de peças'}]};
const before=JSON.stringify(db.products);
(async()=>{
 const pdf=await api.readReceipt(file);
 assert(pdf.base64.startsWith('JVBERi0'),'PDF preserved as base64');
 assert.equal(pdf.size,binary.length);
 await assert.rejects(()=>api.readReceipt({size:MAX(),name:'grande.pdf'}),/750 KB/);
 function MAX(){return api.maxPdfBytes+1}
 const corrupted=Buffer.from('HELLO-NOT-PDF');
 await assert.rejects(()=>api.readReceipt({size:corrupted.length,name:'falso.pdf',arrayBuffer:async()=>corrupted.buffer.slice(corrupted.byteOffset,corrupted.byteOffset+corrupted.length)}),/PDF válido/);
 const parsed=api.validate(input);
 assert.equal(parsed.total,36,'manual unit price and traveta cost included');
 assert.equal(parsed.lines[1].description,'Travetada');
 assert.equal(parsed.lines[1].productId,null,'traveta can be a service, not a fake product');
 pending=['factionPayments::model-1'];
 await assert.rejects(()=>api.persistDraft(input,pdf),/pendente/,'WAL guard');
 assert.equal(db.factionPayments.length,0,'no writes while local WAL pending');
 pending=[];
 const first=await api.persistDraft(input,pdf);
 assert.equal(first.total,36);
 assert.equal(db.factionPayments.length,2);
 assert.equal(db.factionPayments[0].unitPrice,3.2,'manual editing must not overwrite product ficha');
 assert.equal(db.factionPayments[0].receiptPdfV9566.name,'pagamento.pdf');
 assert.equal(db.factionPayments[1].receiptPdfV9566,undefined,'large PDF stored only once');
 assert.equal(db.factionPayments[1].manualKindV9566,'travetada');
 assert.equal(db.hubFinanceEntries.length,1,'one Hub Financeiro payment for group, not one per line');
 assert.equal(db.hubFinanceEntries[0].value,36);
 assert.equal(db.hubFinanceEntries[0].sourceId,first.groupId);
 assert.equal(JSON.stringify(db.products),before,'ficha price remains unchanged');
 const second=await api.persistDraft(input,null);
 assert.equal(second.groupId,first.groupId,'retry stable group ID');
 assert.equal(db.factionPayments.length,2,'retry cannot duplicate lines');
 assert.equal(db.hubFinanceEntries.length,1,'retry cannot duplicate hub');
 assert.equal(api.receiptGroups().filter(x=>x.receipt).length,1);
 failId='traveta-1';
 await assert.rejects(()=>api.persistDraft(input,null),/1 linha\(s\)/,'partial save must report count');
 assert.equal(db.factionPayments.length,2);
 failId='';
 await api.persistDraft(input,null);
 assert.equal(db.factionPayments.length,2);
 assert.equal(db.hubFinanceEntries.length,1);
 assert.equal(usedSave,true);
 console.log('PASS faccao v95.66: all masters, code/SKU search, editable ficha rate, travetada, PDF validation, hub no duplicates and WAL-safe retries.');
})().catch(err=>{console.error(err);process.exitCode=1});
