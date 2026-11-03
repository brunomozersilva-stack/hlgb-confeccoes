/* Diagnostic and recovery for the existing hlgb_records subscription. */
(function(){
'use strict';
window.HLGB_RUNTIME_APP_VERSION='94.52';
const state={status:'offline',subscriptions:0,reconnections:0,lastSent:null,lastConfirmed:null,lastReceived:null,lastApplied:null,lastCatchup:null};
const session=crypto.randomUUID();
const probes=[];
let comparison=null;
function probe(module,id,revision){
 let item=probes.find(x=>x.module===module&&x.id===String(id)&&x.revision===revision);
 if(!item){item={module,id:String(id),revision};probes.push(item);if(probes.length>32)probes.shift()}
 return item;
}
function testRow(module,data){return module==='clients'&&/^HLGB-SYNC-TEST-[a-f0-9-]+$/i.test(data?.name||'')}
let retry=null,attempt=0,joiningCursor='',generation=0;
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
function stop(){generation++;clearTimeout(retry);retry=null;state.status='offline'}
function retryConnection(){
 if(retry)return;
 retry=setTimeout(()=>{retry=null;if(cloudAccessToken&&cloudReady&&navigator.onLine)hlgbStartRealtime()},Math.min(15000,500*2**Math.min(attempt++,5)));
}
async function catchup(cursor,gen){
 if(!cursor||!Number.isFinite(Date.parse(cursor)))return;
 try{
  const bundle=await hlgbRecordLoadDirect(new Date(Date.parse(cursor)-1000).toISOString());
  if(gen!==generation)return;
  const modules=new Set();
  for(const row of bundle.rows||[])if(hlgbApplyRecordRow(row))modules.add(row.module);
  if(modules.size){localSaveOnly();for(const module of modules)hlgbRenderIncomingRecord(module)}
  state.lastCatchup={at:Date.now(),modules:[...modules]};
 }catch(e){if(gen===generation)state.lastCatchup={at:Date.now(),error:String(e?.message||e)}}
}
function connection(status){
 state.status=status;
 window.dispatchEvent(new Event('hlgb:propagation-status'));
 if(status==='JOINING')joiningCursor=hlgbRecordGlobalLastSeen;
 if(status==='SUBSCRIBED'){
  clearTimeout(retry);retry=null;attempt=0;
  state.subscriptions++;state.reconnections=state.subscriptions-1;
  void catchup(joiningCursor,generation);
 }else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status))retryConnection();
}
function sending(module,id,at){state.lastSent={module,id:String(id),at}}
function confirmed(module,id,row,sentAt){state.lastConfirmed={module,id:String(id),revision:row.revision,sentAt,at:Date.now(),serverAt:row.updated_at};
 if(testRow(module,row.data))Object.assign(probe(module,id,row.revision),{sentAt,confirmedAt:state.lastConfirmed.at,serverAt:row.updated_at});
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
   if(!rx||!tx.key||!tx.serverAt||!Number.isInteger(tx.revision)||![tx.sentAt,tx.confirmedAt,rx.receivedAt,rx.visualAt].every(Number.isFinite))continue;
   if(tx.confirmedAt<tx.sentAt||rx.visualAt<rx.receivedAt||rx.visualAt<tx.sentAt||Date.now()-rx.visualAt>900000)continue;
   return {sentAt:tx.sentAt,confirmedAt:tx.confirmedAt,receivedAt:rx.receivedAt,visualAt:rx.visualAt,
    revision:tx.revision,totalMs:rx.visualAt-tx.sentAt};
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
 // On a healthy channel, read only revisions since the local cursor. Joining already schedules this catch-up.
 if(before==='SUBSCRIBED'&&connected)await catchup(hlgbRecordGlobalLastSeen,generation);
 const paired=connected&&comparison?.forward&&comparison?.reverse&&Date.now()-comparison.at<900000;
 return {before,after:state.status,attempted:before!=='SUBSCRIBED',verified:!!paired,
  detail:!connected?'Listener sem conexão confirmada.':paired?'Propagação visual comprovada nas duas direções.':'Listener conectado. Entrega visual entre sessões ainda não comprovada.'};
}
async function evidence(digest){
 const records=probes.map(x=>({...x}));
 return {session,probes:await Promise.all(records.map(async({id,module,...rest})=>({...rest,key:await digest([module,id])})))};
}
window.hlgbPropagation={repair,stop,compare,evidence,connection,sending,confirmed,received,applied,renderAffected,status:()=>({...state,comparison,runtimeVersion:window.HLGB_RUNTIME_APP_VERSION,publishedVersion:window.HLGB_PUBLISHED_APP_VERSION||null})};
window.addEventListener('online',()=>{if(cloudReady&&cloudAccessToken)hlgbStartRealtime()});
window.addEventListener('hlgb:authenticated',()=>{if(cloudReady&&cloudAccessToken)hlgbStartRealtime()});
})();
