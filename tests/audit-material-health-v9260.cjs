const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-material-health-v9260.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-material-health-v9260.js'"),'loader deve carregar a saúde de matéria-prima');
assert(loader.indexOf("'release-material-health-v9260.js'")<loader.indexOf("'release-ui-stability.js'"),'guard visual deve continuar por último');
const db={
 purchases:[
  {id:'a',total:100,status:'Pendente',dueDate:'2026-10-09',supplierName:'A'},
  {id:'b',total:200,status:'Pendente',dueDate:'2026-11-10',supplierName:'B'},
  {id:'c',total:300,status:'Pendente',dueDate:'',date:'2026-09-01',supplierName:'C'},
  {id:'d',total:400,status:'Pago',dueDate:'2026-10-20',supplierName:'D'},
  {id:'e',total:500,paidAmount:125,status:'Pendente',dueDate:'2026-10-25',supplierName:'E'}
 ],
 hubFinanceEntries:[
  {id:'m1',flow:'Saída',category:'Matéria-prima',status:'Previsto',date:'2026-10-09',value:1000},
  {id:'m2',flow:'Saída',category:'Matéria-prima',status:'Realizado',date:'2026-10-09',value:900},
  {id:'m3',flow:'Saída',category:'Matéria-prima',status:'Previsto',date:'2026-11-09',value:700},
  {id:'auto-a',flow:'Saída',category:'Matéria-prima',status:'Previsto',date:'2026-10-09',value:100,sourceType:'purchase_auto',sourceId:'a'}
 ]
};
const context={console,db,setTimeout(){return 0},setInterval(){return 0},window:{HLGB_RELEASE_VERSION:'92.59'},document:{getElementById(){return null},querySelector(){return null}}};context.window.window=context.window;vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbMaterialHealth9260;assert(api,'API de saúde de matéria-prima deve existir');
assert.equal(api.outstanding(db.purchases[0]),100);
assert.equal(api.outstanding(db.purchases[3]),0,'nota paga não pode permanecer aberta');
assert.equal(api.outstanding(db.purchases[4]),375,'pagamento parcial deve reduzir saldo');
assert.equal(api.due(db.purchases[2]),'','nota sem vencimento não pode usar data da compra como vencimento');
assert.equal(api.openNotes().reduce((s,x)=>s+x.remain,0),975,'notas abertas devem usar saldos reais');
assert.equal(api.manualMaterialRows().length,2,'manual previsto deve entrar; realizado e automático vinculado devem ficar fora');
assert.equal(api.manualMaterialRows().reduce((s,x)=>s+x.value,0),1700,'manual aberto deve compor a saúde financeira');
assert.equal(api.isAutoPurchaseEntry(db.hubFinanceEntries[3]),true,'lançamento automático ligado à compra não pode duplicar a nota');
console.log('PASS v92.61: total aberto combina notas e manual legado sem duplicar lançamentos automáticos vinculados.');