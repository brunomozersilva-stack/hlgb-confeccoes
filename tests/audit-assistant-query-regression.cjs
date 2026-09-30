const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'release-assistant-query.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
assert(loader.includes("'release-assistant-query.js'"),'loader must include assistant');

let openedMissing=null,hubToggled=null;
const context={
  console,
  db:{
    clients:[{id:'c1',name:'Gisele'}],
    products:[{id:'p1',name:'Camisola Romantic',code:'CR01',price:15}],
    orders:[{id:'o1',orderNumber:63,client:'Gisele',status:'Em produção',priority:'Urgente',date:'2026-09-30',total:1500,grade:[{productId:'p1',qty:100}]}],
    cuts:[{id:'cut1',orderId:'o1',productId:'p1'}],
    production:[{id:'prod1',orderId:'o1',productId:'p1',planned:100,done:60,productionLocationId:'loc1'}],
    productionLocations:[{id:'loc1',name:'Facção Teste'}],
    missingPieces:[{id:'m1',orderId:'o1',product:'Camisola Romantic',remainingQty:5,status:'Em aberto'}],
    systemIssues:[{id:'e1',title:'Erro de teste',status:'Aberto',priority:'Alta',page:'projecao'}],
    hubFinanceEntries:[
      {id:'h1',flow:'Saída',description:'Rescisão Arisergio',category:'Funcionários',subcategory:'Rescisão',person:'Arisergio Inacio Luiz',date:'2026-09-30',value:1582.02,status:'Previsto'},
      {id:'h2',flow:'Saída',description:'Conta já paga',category:'Outros',date:'2026-09-29',value:100,status:'Realizado'}
    ]
  },
  window:{
    abateMissingPiece(id){openedMissing=id},
    async toggleHubFinanceEntry(id){hubToggled=id}
  },
  document:{readyState:'loading',addEventListener(){},getElementById(){return null},querySelector(){return null}},
  setTimeout(){return 0},
  openModal(){},closeModal(){},
  displayOrderNumber:o=>o.orderNumber,
  qtyOfOrder:o=>o.grade.reduce((a,x)=>a+(+x.qty||0),0),
  productionDestinationName:p=>'Facção Teste',
  allProjectionRows:()=>[{order:{id:'o1',client:'Gisele'},item:{date:'2026-09-30',qty:100,value:1500,name:'Camisola Romantic',clientName:'Gisele'}}],
  projectionDeliverableQty:(o,i)=>i.qty,
  projectionDeliverableValue:(o,i)=>i.value,
  money:v=>'R$ '+Number(v).toFixed(2),
  fmtDate:v=>v
};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbAssistant;
assert(api,'assistant API must load');

(async()=>{

const order=api.query('onde está o pedido 63?');
assert.equal(order.kind,'order','must understand order lookup');
assert(order.text.includes('Gisele'),'order answer must contain client');
assert(order.text.includes('Facção Teste'),'order answer must contain current production location');
assert(order.text.includes('5 peças'),'order answer must contain missing quantity');

const issues=api.query('quais erros estão abertos?');
assert.equal(issues.kind,'issues');
assert(issues.text.includes('Erro de teste'),'must answer from diagnostics center');

const missingAction=api.query('dar baixa nos faltantes do pedido 63');
assert.equal(missingAction.kind,'missing-action','missing-piece write intent must become a protected action proposal');
assert.equal(missingAction.actions.length,1,'must offer the one open missing occurrence');
assert.equal(missingAction.actions[0].id,'m1');
assert.equal(openedMissing,null,'query must never execute the write action');
api.runOfficialMissingAction('m1');
assert.equal(openedMissing,'m1','confirmed execution helper must delegate to the official missing-piece function');

const hubAction=api.query('marcar Rescisão Arisergio como realizado');
assert.equal(hubAction.kind,'hub-realized-action','Hub realization intent must create a confirmation proposal');
assert.equal(hubAction.actions.length,1);
assert.equal(hubAction.actions[0].id,'h1');
assert.equal(hubToggled,null,'query must not toggle Hub automatically');
await api.runOfficialHubRealizedAction('h1');
assert.equal(hubToggled,'h1','confirmed Hub helper must delegate to official toggle function');

const already=api.prepareHubRealizedAction('Conta já paga');
assert.equal(already.kind,'empty','already realized entry must not be offered for toggling');

const blocked=api.query('mudar status do pedido 63');
assert.equal(blocked.kind,'protected','unreleased write intents must remain protected');

const suggestion=api.query('anotar sugestão: deixar o cliente maior na projeção');
assert.equal(suggestion.kind,'suggestion-intent','assistant must recognize suggestion registration intent');
assert(suggestion.description.includes('cliente maior'),'suggestion text must be preserved');

const issue=api.query('relatar erro: botão de salvar não funcionou');
assert.equal(issue.kind,'issue-intent','assistant must recognize error registration intent');

const product=api.query('Camisola Romantic');
assert.equal(product.kind,'product','must locate product by natural text');
assert(product.text.includes('CR01'));

console.log('PASS assistant query: lookup, diagnostics, safe operational actions and protected unreleased writes.');
})().catch(e=>{console.error(e);process.exit(1)});
