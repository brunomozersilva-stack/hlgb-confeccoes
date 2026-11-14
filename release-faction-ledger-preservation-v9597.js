/* HLGB v95.97 — proteção de integridade para envios e pagamentos de facções.
 * Nunca excluir registros como efeito colateral de render ou carga parcial.
 * Conferência visual lê somente Supabase; não escreve WAL, banco nem cache local. */
(function(){
'use strict';
if(window.hlgbFactionLedgerPreservation9597)return;
const V='95.97',PANEL='hlgbFactionCloudEvidence9597';
const state={version:V,automaticCleanupBlocked:false,periodFixed:false,checks:0,cloudPayments:null,cloudFactions:null,localPayments:null,localFactions:null,checkedAt:'',lastError:'',lastStatus:'not-checked'};
const sid=v=>String(v??''),esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
function localDb(){try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.db||{}}
function localRows(module){const items=localDb()?.[module];return Array.isArray(items)?items:[]}
function eligible(){return window.__HLGB_AUTH_READY===true&&typeof window.cloudRequest==='function'}
function guardLegacyCleanup(){
 const previous=window.cleanupOrphanOrderRecords;
 if(typeof previous!=='function')return false;
 if(previous.__hlgbGuard9597){state.automaticCleanupBlocked=true;return true}
 function protectedCleanup(){
  // A lista local pode estar parcial; nem ausência de pedido nem ausência de produção
  // nesta tela autoriza apagar lançamentos, pagamentos, cortes ou dados financeiros.
  return {total:0,removed:{},blocked:true,reason:'Orphan cleanup must not run during rendering; review remote identity and tombstone separately.'};
 }
 protectedCleanup.__hlgbGuard9597=true;protectedCleanup.__original=previous;
 window.cleanupOrphanOrderRecords=protectedCleanup;
 state.automaticCleanupBlocked=true;
 return true;
}
function fixPaymentPeriod(){
 const previous=window.factionPaymentInPeriod;
 if(typeof previous!=='function')return false;
 if(previous.__hlgbPeriod9597){state.periodFixed=true;return true}
 function safePeriod(row,start,end){
  const base=sid(row?.serviceFinishedAt||row?.paymentDate).slice(0,10);
  const fallback=!base?sid(row?.scheduledPaymentDate||'').slice(0,10):'';
  if(!fallback)return previous.apply(this,arguments);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(fallback))return previous.apply(this,arguments);
  return (!start||fallback>=start)&&(!end||fallback<=end);
 }
 safePeriod.__hlgbPeriod9597=true;safePeriod.__original=previous;
 window.factionPaymentInPeriod=safePeriod;
 state.periodFixed=true;
 return true;
}
function guardPaymentRendering(){
 const original=window.renderFactionPayments;
 if(typeof original!=='function')return false;
 if(original.__hlgbReadonlyRender9597)return true;
 function guardedRender(){
  // A tela deve apenas apresentar registros; sincronização derivada só deve
  // acontecer em ações explícitas, nunca em render após carga parcial.
  const previousSync=window.syncFactionPayments;
  let suppressed=false;
  if(typeof previousSync==='function'){
   window.syncFactionPayments=function(){return false};
   suppressed=true;
  }
  try{return original.apply(this,arguments)}
  finally{if(suppressed)window.syncFactionPayments=previousSync}
 }
 guardedRender.__hlgbReadonlyRender9597=true;
 guardedRender.__original=original;
 window.renderFactionPayments=guardedRender;
 return true;
}
function guardGeneralSync(){
 const original=window.syncAllData;
 if(typeof original!=='function')return false;
 if(original.__hlgbNoImplicitPayment9597)return true;
 function safeSync(){
  // "Atualizar/sincronizar" não é uma autorização para criar um novo pagamento.
  // A rotina legada pode ter a lista local incompleta e gerar ID duplicado.
  const previousSync=window.syncFactionPayments;
  let suppressed=false;
  if(typeof previousSync==='function'){window.syncFactionPayments=function(){return false};suppressed=true}
  try{return original.apply(this,arguments)}
  finally{if(suppressed)window.syncFactionPayments=previousSync}
 }
 safeSync.__hlgbNoImplicitPayment9597=true;
 safeSync.__original=original;
 window.syncAllData=safeSync;
 return true;
}
function summaryByGroup(rows){
 const groups=new Map();
 for(const r of rows){
  if(!r?.data||r.deleted_at)continue;
  const d=r.data,groupId=sid(d.manualGroupId||r.entity_id),key=d.manual===true?'manual:'+groupId:'payment:'+sid(r.entity_id);
  let g=groups.get(key);
  if(!g){g={name:sid(d.factionName||'Facção'),groupId,date:sid(d.scheduledPaymentDate||d.paymentDate||d.createdAt).slice(0,10),paid:0,pending:0,cancelled:0,totalCents:0,lines:0};groups.set(key,g)}
  g.lines++;
  if(d.manualCanceledV9590===true||sid(d.status).toLowerCase()==='cancelado')g.cancelled++;
  else {g.totalCents+=Math.round((Number(d.value)||0)*100);if(d.status==='Pago')g.paid++;else g.pending++}
 }
 return [...groups.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.name.localeCompare(b.name,'pt-BR'));
}
function renderProof(payments,factions){
 const host=document.getElementById(PANEL);
 const body=host?.querySelector('[data-remote-proof]'),label=host?.querySelector('[data-proof-label]');
 const activePayments=payments.filter(x=>!x.deleted_at&&x.data),activeFactions=factions.filter(x=>!x.deleted_at&&x.data);
 const localPaymentIds=new Set(localRows('factionPayments').map(x=>sid(x?.id))),localFactionIds=new Set(localRows('factions').map(x=>sid(x?.id)));
 const missingPayments=activePayments.filter(x=>!localPaymentIds.has(sid(x.entity_id))).length;
 const missingFactions=activeFactions.filter(x=>!localFactionIds.has(sid(x.entity_id))).length;
 state.cloudPayments=activePayments.length;state.cloudFactions=activeFactions.length;state.localPayments=localPaymentIds.size;state.localFactions=localFactionIds.size;
 state.lastStatus=missingPayments||missingFactions?'local-incomplete':'verified-readable';state.lastError='';state.checkedAt=new Date().toISOString();
 if(label)label.textContent='Nuvem: '+activePayments.length+' pagamentos e '+activeFactions.length+' envios · nesta sessão: '+localPaymentIds.size+' pagamentos e '+localFactionIds.size+' envios · sem aparecer localmente: '+missingPayments+' pagamentos e '+missingFactions+' envios.';
 const groups=summaryByGroup(activePayments),money=n=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 if(body)body.innerHTML='<details open><summary><b>Pagamentos confirmados na nuvem ('+groups.length+' grupos, somente leitura)</b></summary><div style="overflow:auto;max-height:330px"><table><thead><tr><th>Facção</th><th>Data</th><th>Linhas</th><th>Pagas</th><th>Pendentes</th><th>Valor ativo</th></tr></thead><tbody>'+
  groups.map(g=>'<tr><td>'+esc(g.name)+'</td><td>'+esc(g.date)+'</td><td>'+g.lines+'</td><td>'+g.paid+'</td><td>'+g.pending+'</td><td>'+money(g.totalCents)+'</td></tr>').join('')+
  '</tbody></table></div></details>'+
  '<p class="sub">Esta conferência NÃO restaura nem reenvia registros. Se houver diferença com a lista da tela, os dados devem ser conciliados por ID e revisão, preservando a WAL do Safari.</p>';
}
async function readCloud(){
 if(!eligible())throw Error('Faça login antes de conferir os lançamentos.');
 if(window.navigator?.onLine===false)throw Error('Sem internet: dados locais preservados, comparação não executada.');
 if(typeof window.cloudEnsureFreshSession==='function'&&await window.cloudEnsureFreshSession(false)===false)
  throw Error('A sessão da nuvem não foi confirmada.');
 async function get(module){
  const path='hlgb_records?select=entity_id,data,deleted_at,revision,updated_at&module=eq.'+encodeURIComponent(module)+'&order=updated_at.desc&limit=1000';
  const rows=await window.cloudRequest(path,{method:'GET'});
  if(!Array.isArray(rows))throw Error('A nuvem não confirmou '+module+'; não considerar a lista vazia.');
  return rows;
 }
 const [payments,factions]=await Promise.all([get('factionPayments'),get('factions')]);
 if(!eligible())throw Error('A sessão terminou durante a comparação.');
 state.checks++;
 renderProof(payments,factions);
 return status();
}
function status(){return {...state}}
function panel(){
 if(!eligible())return false;
 const page=document.getElementById('pagamentosFaccoes');if(!page)return false;
 let host=document.getElementById(PANEL);
 if(host)return true;
 host=document.createElement('section');host.id=PANEL;host.className='panel';
 host.style.margin='12px 0';
 host.innerHTML='<h3>Conferência segura de pagamentos e envios</h3>'+
  '<p class="sub">Se os lançamentos sumiram da lista, confira se continuam registrados na nuvem. Esta consulta não altera nada.</p>'+
  '<button type="button" class="secondary" data-proof-refresh>Conferir lançamentos diretamente na nuvem (somente leitura)</button>'+
  '<p class="sub" data-proof-label role="status">Aguardando conferência; dados locais não são prova de perda na nuvem.</p>'+
  '<div data-remote-proof></div>';
 page.insertBefore(host,page.firstChild);
 host.querySelector('[data-proof-refresh]')?.addEventListener('click',async()=>{
  const btn=host.querySelector('[data-proof-refresh]'),label=host.querySelector('[data-proof-label]');
  if(btn.disabled)return;btn.disabled=true;if(label)label.textContent='Consultando a nuvem sem salvar ou excluir…';
  try{await readCloud()}catch(e){state.lastError=sid(e?.message||e);state.lastStatus='unverified';if(label)label.textContent='Conferência não concluída: '+state.lastError+' (não significa que os dados tenham sido apagados).'}
  finally{btn.disabled=false}
 });
 return true;
}
function attach(){
 guardLegacyCleanup();fixPaymentPeriod();guardPaymentRendering();guardGeneralSync();
 panel();
}
window.hlgbFactionLedgerPreservation9597={version:V,status,readCloud,guardLegacyCleanup,fixPaymentPeriod,guardPaymentRendering,guardGeneralSync,summaryByGroup};
attach();
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(attach,50));
window.addEventListener?.('pageshow',()=>setTimeout(attach,100));
if(document.readyState==='loading')document.addEventListener?.('DOMContentLoaded',()=>setTimeout(attach,50),{once:true});
setTimeout(attach,1500);
})();
