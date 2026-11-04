/* Diagnostic and recovery for the existing hlgb_records subscription. */
(function(){
'use strict';

const state={status:'offline',subscriptions:0,reconnections:0,lastSent:null,lastConfirmed:null,lastReceived:null,lastApplied:null,lastCatchup:null};
const session=crypto.randomUUID();
const probes=[];
const saveClicks=new Map();
document.addEventListener('click',event=>{
 if(!event.target?.closest?.('#modal .modalSave'))return;
 const name=document.querySelector('#modal #mname')?.value;
 if(!testRow('clients',{name}))return;
 saveClicks.set(name,Date.now());
 if(saveClicks.size>32)saveClicks.delete(saveClicks.keys().next().value);
},true);
let comparison=null;
function probe(module,id,revision){
 let item=probes.find(x=>x.module===module&&x.id===String(id)&&x.revision===revision);
 if(!item){item={module,id:String(id),revision};probes.push(item);if(probes.length>32)probes.shift()}
 return item;
}
function testRow(module,data){return module==='clients'&&/^HLGB-SYNC-TEST-[a-f0-9-]+$/i.test(data?.name||'')}
const targets={
 clientes:['renderClients','clients'],produtos:['renderProducts','products','colors','sizes'],
 pedidos:['renderOrders','orders','clients','products'],producao:['renderProduction','production','orders','cuts','factions'],
 corte:['renderCuts','cuts','orders'],cadMaquinas:['renderFactions','machines','factions'],
 cadLocaisProducao:['renderFactions','productionLocations'],cadTiposServico:['renderFactions','serviceTypes'],
 faccoes:['renderFactions','factions','productionLocations','production'],cadFaccoes:['renderFactions','factions','factionMasters'],
 estoque:['renderStock','stock','products','materials'],materiais:['renderMaterials','materials','materialLots'],
 projecao:['renderProjection','projectionInvoices','orders','production'],separacao:['renderSeparation','separations','orders','cuts'],
 capacidadeProducao:['renderCapacityPlanning','capacityAssignments','production','orders','goals'],
 hubFinanceiro:['renderHubFinance','hubFinanceEntries','finance'],financeiro:['renderFinance','finance','purchases'],
 folhaPagamento:['renderPayroll','payroll','employees','employeeAdvances'],fornecedores:['renderSuppliers','suppliers'],
 dashboard:['renderDash','orders','production','cuts','finance','hubFinanceEntries','stock','products'],
 pagamentosFaccoes:['renderFactionPayments','factionPayments','factions','production'],
 cortadores:['renderCutters','cutters','cuts','cutterPieceTypes'],exFuncionarios:['renderFormerEmployees','formerEmployees','terminations'],
 faltas:['renderMissingPieces','missingPieces'],devolucoesDefeitos:['renderDefectReturns','defectReturns'],
 inventarioBens:['renderAssets','assets'],lixeiraPedidos:['renderOrderTrash','orderTrash'],metas:['renderGoals','goals'],
 cadastros:['renderCatalogs','colors','sizes','serviceTypes'],pecasProntas:['renderFinishedPieces','finishedPieces'],
 relatorios:['renderReports','orders','production','finance','factionPayments','purchases','hubFinanceEntries'],
 funcionarios:['renderEmployees','employees'],compras:['renderPurchases','purchases'],notas:['renderOrderNotes','noteQueue','orders']
};
function renderAffected(module,page){
 const target=targets[page];
 if(!target||!target.slice(1).includes(module)||typeof window[target[0]]!=='function')return false;
 window[target[0]]();return true;
}
function connection(status){
 if(status==='SUBSCRIBED'&&state.status!==status)state.reconnections=state.subscriptions++;
 state.status=status;
 window.dispatchEvent(new Event('hlgb:propagation-status'));
}
function sending(module,id,at){state.lastSent={module,id:String(id),at}}
function confirmed(module,id,row,sentAt){state.lastConfirmed={module,id:String(id),revision:row.revision,sentAt,at:Date.now(),serverAt:row.updated_at};
 if(testRow(module,row.data))Object.assign(probe(module,id,row.revision),{saveAt:saveClicks.get(row.data.name),sentAt,confirmedAt:state.lastConfirmed.at,serverAt:row.updated_at});
}
function received(row,payload){
 const at=Date.now(),committed=Date.parse(payload?.commit_timestamp);
 state.lastReceived={module:row.module,id:String(row.entity_id),revision:row.revision,at,serverAt:payload?.commit_timestamp||null,
  serverToReceiverMs:Number.isFinite(committed)?at-committed:null,
  otherUser:row.updated_by&&cloudUser?.id?String(row.updated_by)!==String(cloudUser.id):null};
 if(testRow(row.module,row.data))Object.assign(probe(row.module,row.entity_id,row.revision),{receivedAt:at,serverAt:row.updated_at});
}
function applied(row){state.lastApplied={module:row.module,id:String(row.entity_id),revision:row.revision,at:Date.now()};
 if(!testRow(row.module,row.data))return;
 const item=probe(row.module,row.entity_id,row.revision);
 const table=document.getElementById('clientTable');
 if(!table||!table.closest('.page.active'))return;
 const observer=new MutationObserver(check);
 const timeout=setTimeout(()=>observer.disconnect(),15000);
 function check(){
  if(!table.closest('.page.active')||!table.getClientRects().length)return;
  if(!Array.from(table.querySelectorAll('td:first-child')).some(td=>td.textContent===row.data.name))return;
  item.visualAt=Date.now();observer.disconnect();clearTimeout(timeout);
 }
 observer.observe(table,{childList:true,subtree:true});check();
}
function compare(a,b){
 if(!a?.session||!b?.session||a.session===b.session||!Array.isArray(a.probes)||!Array.isArray(b.probes))return null;
 function direction(from,to){
  for(const tx of from.probes.slice(-32).reverse()){
   const rx=to.probes.slice(-32).find(r=>r.key===tx.key&&r.revision===tx.revision&&r.serverAt===tx.serverAt);
   if(!rx||!tx.key||!tx.serverAt||!Number.isInteger(tx.revision)||![tx.saveAt,tx.sentAt,tx.confirmedAt,rx.receivedAt,rx.visualAt].every(Number.isFinite))continue;
   if(tx.sentAt<tx.saveAt||tx.confirmedAt<tx.sentAt||rx.visualAt<rx.receivedAt||rx.visualAt<tx.sentAt||Date.now()-rx.visualAt>900000)continue;
   return {saveAt:tx.saveAt,sentAt:tx.sentAt,confirmedAt:tx.confirmedAt,receivedAt:rx.receivedAt,visualAt:rx.visualAt,
    revision:tx.revision,totalMs:rx.visualAt-tx.saveAt};
  }
  return null;
 }
 comparison={at:Date.now(),forward:direction(a,b),reverse:direction(b,a)};
 return comparison;
}
async function repair(){
 const before=state.status;
 if(!cloudReady||!cloudAccessToken||!navigator.onLine)return {before,after:state.status,attempted:false,detail:'Sessão ou rede indisponível. Recebimento não verificado.'};
 if(before!=='SUBSCRIBED'){
  await new Promise(resolve=>{
   function finish(){clearTimeout(timer);window.removeEventListener('hlgb:propagation-status',changed);resolve()}
   function changed(){if(state.status==='SUBSCRIBED')finish()}
   const timer=setTimeout(finish,6000);
   window.addEventListener('hlgb:propagation-status',changed);
   hlgbStartRealtime();changed();
  });
 }
 const connected=state.status==='SUBSCRIBED';
 const paired=connected&&comparison?.forward&&comparison?.reverse&&Date.now()-comparison.at<900000;
 return {before,after:state.status,attempted:before!=='SUBSCRIBED',verified:!!paired,
  detail:!connected?'Listener sem conexão confirmada.':paired?'Propagação visual comprovada nas duas direções.':'Listener conectado. Entrega visual entre sessões ainda não comprovada.'};
}
async function evidence(digest){
 const records=probes.map(x=>({...x}));
 return {session,probes:await Promise.all(records.map(async({id,module,...rest})=>({...rest,key:await digest([module,id])})))};
}
window.hlgbPropagation={repair,compare,evidence,connection,sending,confirmed,received,applied,renderAffected,status:()=>({...state,comparison,runtimeVersion:window.HLGB_RUNTIME_APP_VERSION,publishedVersion:window.HLGB_PUBLISHED_APP_VERSION||null})};
})();
