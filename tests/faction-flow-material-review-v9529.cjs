'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const factionOps=fs.readFileSync('release-faction-operations-v9520.js','utf8');
const factionAdjust=fs.readFileSync('release-faction-safe-adjust-v9514.js','utf8');
const materials=fs.readFileSync('release-faction-material-refresh-v9522.js','utf8');
const script=parseSource=>new vm.Script(parseSource);
function context(){
 let lastModal=null,changed=0;const f={id:7,description:'Cueca Boxer Tule',name:'Graziano',op:'PED-7',sent:480,price:1.2,productId:15};
 const p={id:15,name:'Camisola Ana Melia',materials:[
  {materialId:1,name:'Elástico',unit:'m',qty:1,calcMode:'consumption'},
  {materialId:2,name:'Laço',unit:'un.',qty:2,calcMode:'consumption'}
 ]};
 const c={id:19,productId:15,productionId:21,destinationType:'F',destinationName:'Vanessa',qty:350,
  receivedAt:'2026-11-10',receivedBy:'',status:'Pendente',
  materials:[{name:'Elástico',unit:'m',qty:300,checked:false},{name:'Renda antiga',unit:'m',qty:50,checked:false}]};
 const db={factions:[f],products:[p],materials:[],factionMasters:[{id:22,name:'Roseli'}],
  materialChecklists:[c]};
 const doc={readyState:'loading',addEventListener(){},getElementById(){return null}};
 const window={db,__HLGB_AUTH_READY:true,addEventListener(){},hlgbAfterLogin(){},
   openModal(title,html,onSubmit){lastModal={title,html,onSubmit}},
   renderFactions(){},renderDestinationChecklists(){},closeModal(){}};
 const ctx={window,db,document:doc,navigator:{onLine:true},console:{info(){},warn(){},error(){}},
  setTimeout(){},indexedDB:undefined,localStorage:{getItem(){return null}},
  alert(){},openModal:window.openModal,cloudRequest(){changed++;throw Error('Unexpected cloud write')},
  get lastModal(){return lastModal}};
 ctx.globalThis=ctx;vm.createContext(ctx);
 return {ctx,db,window,document:doc,get lastModal(){return lastModal},get writes(){return changed}};
}
test('Actions are collapsed and visible near the top of Envios para facção',()=>{
 for(const s of [factionOps,factionAdjust,materials])assert.doesNotThrow(()=>script(s));
 assert.match(factionOps,/anchor\.insertAdjacentElement\('beforebegin',panel\)/);
 assert.match(factionOps,/hlgbFactionOpsDetails9531/);
 assert.match(factionOps,/factionChecklistPanel9176/);
 assert.match(factionOps,/data-hlgb-faction-action="price"/);
 assert.match(factionOps,/data-hlgb-faction-action="transfer"/);
 assert.match(factionOps,/if\(!query\)/);
 assert.doesNotMatch(factionOps,/page\.insertBefore\(panel,page\.firstElementChild\)/);
});
test('Price button opens the price mode directly with correct input and no automatic write',()=>{
 const f=context();
 vm.runInContext(factionAdjust,f.ctx);
 f.window.hlgbFactionAdjust9514.open('7','price');
 const m=f.lastModal;
 assert.match(m.title,/Alterar preço por peça/);
 assert.match(m.html,/value="price" selected/);
 assert.match(m.html,/id="hlgbFactionPriceFields9514"/);
 assert.match(m.html,/id="hlgbFactionTransferFields9514" hidden/);
 assert.equal(f.writes,0);
});
test('Transfer action remains explicit, with no automatic bypass of checklist protection',()=>{
 const f=context();vm.runInContext(factionAdjust,f.ctx);
 f.window.hlgbFactionAdjust9514.open('7','transfer');
 assert.match(f.lastModal.html,/value="transfer" selected/);
 assert.match(factionAdjust,/assertNoLocalPending/);
 assert.match(factionAdjust,/rpc\/'\+RPC/);
 assert.match(factionAdjust,/Transferência não realizada: existe um checklist/);
});
test('Ana Melia receivedAt locks automatic overwrite even with no checked items',()=>{
 const f=context();vm.runInContext(materials,f.ctx);
 const a=f.window.hlgbFactionMaterialRefresh9522.analyze(f.db.materialChecklists[0]);
 assert.equal(a.status,'stale');assert.equal(a.locked,true);
 assert.equal(a.newCount,2);
 const before=JSON.stringify(f.db);
 f.window.hlgbFactionMaterialRefresh9522.openReview(19);
 assert.match(f.lastModal.html,/Comparativo dos totais/);
 assert.match(f.lastModal.html,/Recebimento registrado|recebimento registrado/);
 assert.match(f.lastModal.html,/Renda antiga/);
 assert.match(f.lastModal.html,/Imprimir conferência/);
 assert.doesNotMatch(f.lastModal.html,/id="hlgbMaterialRefreshConfirm9522"/);
 assert.equal(JSON.stringify(f.db),before);
});
test('Comparison preserves old and new values, marks extra lines, escapes names',()=>{
 const f=context();vm.runInContext(materials,f.ctx);
 const t=f.window.hlgbFactionMaterialRefresh9522.test;
 const rows=t.comparisonRows(f.db.materialChecklists[0].materials,[{name:'Elástico',unit:'m',qty:350},{name:'Laço',unit:'un.',qty:700}]);
 assert.equal(rows.length,3);
 assert.ok(rows.some(x=>x.change==='Somente no envio'));
 assert.ok(rows.some(x=>x.change==='Novo na ficha'));
 assert.ok(rows.some(x=>x.change==='Quantidade alterada'));
 const html=t.comparisonTable({materials:[{name:'<script>x</script>',unit:'m',qty:1}]},{materials:[]});
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(!html.includes('<script>'));
});
