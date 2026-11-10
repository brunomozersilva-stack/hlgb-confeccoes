/* HLGB v95.14 — transferência segura e ajuste da mão de obra por facção.
 * Server authority: hlgb_faction_adjust_v9514 is a single atomic RPC.
 * NEVER clear/write WAL locally; abort when local unconfirmed work exists.
 */
(function(){
'use strict';
const V='95.14',RPC='hlgb_faction_adjust_v9514',WAL_DB='hlgb_durable_wal';
if(window.hlgbFactionAdjust9514?.version===V)return;
const sid=v=>String(v??''),qty=v=>Number(v),money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=v=>sid(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={busy:false,formFactionId:'',initialAction:'transfer',requestId:'',lastResult:null,lastError:'',lastConfirmedAt:'',lastProof:null};
function arr(name){try{return Array.isArray(window.db?.[name])?window.db[name]:[]}catch(_){try{return Array.isArray(db?.[name])?db[name]:[]}catch(__){return []}}}
function factionById(id){return arr('factions').find(f=>sid(f?.id)===sid(id))||null}
function targetMasters(){return arr('factionMasters').filter(x=>x?.active!==false&&sid(x?.name).trim())
  .slice().sort((a,b)=>sid(a.name).localeCompare(sid(b.name),'pt-BR'))}
function canUse(){return window.__HLGB_AUTH_READY===true&&navigator.onLine!==false&&typeof window.cloudRequest==='function'}
function openWalReadOnly(){
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined')return reject(new Error('Não é possível confirmar a WAL neste dispositivo.'));
  let req,aborted=false;
  try{req=indexedDB.open(WAL_DB)}catch(e){reject(e);return}
  req.onupgradeneeded=()=>{aborted=true;try{req.transaction.abort()}catch(_){}};
  req.onerror=()=>{if(aborted)resolve([]);else reject(req.error||new Error('Falha de leitura WAL'))};
  req.onsuccess=()=>{
   const database=req.result;
   if(!database.objectStoreNames.contains('entries')){database.close();reject(new Error('WAL IndexedDB incompleta; operação bloqueada'));return}
   const tx=database.transaction('entries','readonly'),get=tx.objectStore('entries').getAll();
   get.onsuccess=()=>resolve(Array.isArray(get.result)?get.result:null);
   get.onerror=()=>reject(get.error||new Error('Falha ao conferir operações pendentes'));
   tx.oncomplete=()=>database.close();
  };
 });
}
function pendingFor(id,op){
 const module=sid(op?.module),rowId=sid(op?.id);
 if(module==='factions'&&rowId===id)return true;
 if(module==='factionPayments'&&sid(op?.data?.factionServiceId)===id)return true;
 if(module==='materialChecklists'&&sid(op?.data?.factionId)===id)return true;
 return false;
}
async function assertNoLocalPending(id){
 let local;
 try{
  local=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||'null');
  if(local!==null&&(!local||typeof local!=='object'||Array.isArray(local)||!local.entries||typeof local.entries!=='object'||Array.isArray(local.entries)))
   throw new Error('WAL local incompleta');
 }catch(e){throw new Error('Não foi possível conferir a fila local. Nenhuma transferência foi enviada. '+sid(e?.message||e))}
 if(Object.values(local?.entries||{}).some(e=>pendingFor(id,e)))
  throw new Error('Esta facção tem alterações locais ainda não confirmadas. Sincronize antes de editar.');
 let pending;
 try{pending=JSON.parse(localStorage.getItem('hlgb_records_pending_v91')||'null')}
 catch(e){throw new Error('Fila normalizada ilegível; operação bloqueada sem apagar dados')}
 if(pending&&(typeof pending!=='object'||Array.isArray(pending)))throw new Error('Fila de sincronização inválida');
 for(const [module,entries] of Object.entries(pending?.modules||{})){
  if(!Array.isArray(entries))throw new Error('Lista de sincronização inválida para '+module);
  if(entries.some(e=>pendingFor(id,{module,id:e?.id,data:e?.data||e?.value||e?.record})))
   throw new Error('Esta facção possui uma alteração pendente na fila de sincronização.');
 }
 const rows=await openWalReadOnly();
 if(!Array.isArray(rows))throw new Error('WAL não pôde ser confirmada no IndexedDB');
 if(rows.some(e=>pendingFor(id,e)))throw new Error('Há uma operação pendente no IndexedDB relacionada a esta facção.');
 return true;
}
async function remoteRecord(module,id){
 const query='hlgb_records?select=module,entity_id,data,revision,deleted_at,updated_at'+
  '&module=eq.'+encodeURIComponent(module)+'&entity_id=eq.'+encodeURIComponent(sid(id))+'&limit=1';
 const out=await window.cloudRequest(query,{method:'GET'});
 if(!Array.isArray(out))throw new Error('A nuvem não confirmou a leitura de '+module);
 const row=out.find(x=>sid(x.module)===module&&sid(x.entity_id)===sid(id)&&!x.deleted_at);
 if(!row||!Number.isInteger(Number(row.revision))||Number(row.revision)<=0)
  throw new Error('A alocação não foi encontrada ou está inativa na nuvem');
 return row;
}
function remoteEqualsLocal(local,remote){
 if(!local)return false;
 for(const key of ['name','sent','done','returned','defects','waste','price','orderId','productId','productionId']){
  if(sid(local[key]??'')!==sid(remote?.data?.[key]??''))return false;
 }
 return true;
}
function show(){
 const f=factionById(state.formFactionId);if(!f)throw new Error('Alocação não encontrada no dispositivo');
 const options=targetMasters().filter(m=>sid(m.name).toLowerCase()!==sid(f.name).toLowerCase());
 const label=esc(f.description||f.op||f.name||'');
 const content='<div class="sub">Alocação '+esc(f.id)+' · '+label+' · '+esc(f.name)+
    ' · '+qty(f.sent||0).toLocaleString('pt-BR')+' peça(s) · mão de obra atual '+esc(money(f.price||0))+'</div>'+
  '<div class="field"><label>Ação</label><select id="hlgbFactionAction9514">'+
    '<option value="transfer" '+(state.initialAction==='transfer'?'selected':'')+'>Transferir peças para outra facção</option>'+
    '<option value="price" '+(state.initialAction==='price'?'selected':'')+'>Alterar valor final da mão de obra</option></select></div>'+
  '<div id="hlgbFactionTransferFields9514">'+
    '<div class="field"><label>Facção de destino</label><select id="hlgbFactionTarget9514"><option value="">Selecione a facção</option>'+
       options.map(m=>'<option value="'+esc(m.name)+'">'+esc(m.name)+'</option>').join('')+'</select></div>'+
    '<div class="field"><label>Quantidade a transferir</label><input type="number" id="hlgbFactionQuantity9514" min="1" step="1" max="'+esc(f.sent||0)+'" value="'+esc(f.sent||0)+'"></div>'+
    '<div class="sub">Transferência total: muda a facção responsável. Transferência parcial: divide a alocação mantendo a soma original. Entregas, pagamentos e checklists vinculados exigem revisão antes da transferência.</div>'+
  '</div>'+
  '<div id="hlgbFactionPriceFields9514" hidden>'+
    '<div class="field"><label>Novo valor final por peça (R$)</label>'+
      '<input type="number" id="hlgbFactionPrice9514" min="0" max="10000" step="0.01" value="'+esc(Number(f.price||0).toFixed(2))+'"></div>'+
    '<div class="sub">Pagamentos realizados e parcialmente pagos não são modificados. Apenas pagamentos totalmente em aberto e sem descontos especiais poderão ser recalculados.</div>'+
  '</div>'+
  '<div class="field"><label>Motivo da alteração (obrigatório)</label>'+
    '<textarea id="hlgbFactionReason9514" maxlength="280" rows="2" placeholder="Ex.: redistribuição de capacidade da produção"></textarea></div>'+
  '<div id="hlgbFactionPreview9514" class="panel" style="padding:10px;background:#fff8fb;border:1px solid #ecd4e1"></div>'+
  '<div id="hlgbFactionError9514" role="alert" style="color:#8c2b39;margin:8px 0"></div>'+
  '<button type="button" class="primary modalSave" id="hlgbFactionSubmit9514">☁️ Conferir e salvar na nuvem</button>';
 if(typeof window.openModal!=='function')throw new Error('A tela de edição ainda não terminou de carregar');
 window.openModal(state.initialAction==='price'?'Alterar preço por peça — facção':'Transferir peças para outra facção',content,()=>submit());
 setTimeout(()=>{
  document.getElementById('hlgbFactionAction9514')?.addEventListener('change',refreshForm);
  for(const key of ['hlgbFactionQuantity9514','hlgbFactionTarget9514','hlgbFactionPrice9514'])document.getElementById(key)?.addEventListener('input',refreshForm);
  refreshForm();
 },0);
}
function refreshForm(){
 const action=document.getElementById('hlgbFactionAction9514')?.value||'transfer';
 const transfer=document.getElementById('hlgbFactionTransferFields9514'),price=document.getElementById('hlgbFactionPriceFields9514');
 if(transfer){transfer.hidden=action!=='transfer';transfer.style.display=action==='transfer'?'':'none'}
 if(price){price.hidden=action!=='price';price.style.display=action==='price'?'':'none'}
 const f=factionById(state.formFactionId),output=document.getElementById('hlgbFactionPreview9514');if(!f||!output)return;
 if(action==='transfer'){
  const moved=qty(document.getElementById('hlgbFactionQuantity9514')?.value||0);
  output.textContent=Number.isInteger(moved)&&moved>0&&moved<=qty(f.sent)?
    'Origem: '+(qty(f.sent)-moved)+' peça(s). Destino: '+moved+' peça(s). Total mantido: '+qty(f.sent)+' peça(s).':
    'Informe uma quantidade inteira de 1 até '+f.sent+' peças.';
 }else{
  const priceValue=qty(document.getElementById('hlgbFactionPrice9514')?.value);
  output.textContent='Mão de obra atual: '+money(f.price||0)+' · Novo valor: '+(Number.isFinite(priceValue)?money(priceValue):'inválido')+
   '. Pagamentos já realizados serão preservados.';
 }
}
function makeArgs(f){
 const action=document.getElementById('hlgbFactionAction9514')?.value||'transfer';
 const reason=sid(document.getElementById('hlgbFactionReason9514')?.value).trim();
 if(reason.length<4||reason.length>280)throw new Error('Informe um motivo de 4 a 280 caracteres');
 const target=sid(document.getElementById('hlgbFactionTarget9514')?.value).trim();
 const q=qty(document.getElementById('hlgbFactionQuantity9514')?.value);
 const p=qty(document.getElementById('hlgbFactionPrice9514')?.value);
 if(action==='transfer'){
  if(!target)throw new Error('Selecione a facção de destino');
  if(!Number.isInteger(q)||q<=0||q>qty(f.sent))throw new Error('Quantidade de transferência inválida');
 }else if(action==='price'){
  if(!Number.isFinite(p)||p<0||p>10000||Math.abs(Math.round(p*100)-p*100)>1e-7)
   throw new Error('Informe um valor de mão de obra válido, com até duas casas decimais');
  if(p===qty(f.price))throw new Error('Informe um valor diferente do atual');
 }else throw new Error('Ação inválida');
 return {p_action:action,p_faction_id:sid(f.id),p_expected_revision:0,
   p_target_name:action==='transfer'?target:null,p_quantity:action==='transfer'?q:null,
   p_new_price:action==='price'?p:null,p_reason:reason,p_request_id:state.requestId};
}
async function submit(){
 if(state.busy)return false;
 const original=factionById(state.formFactionId);
 const btn=document.getElementById('hlgbFactionSubmit9514');
 const alertEl=document.getElementById('hlgbFactionError9514');
 if(!original)return false;
 let args;try{args=makeArgs(original)}catch(e){if(alertEl)alertEl.textContent=sid(e.message);return false}
 if(!canUse()){if(alertEl)alertEl.textContent='Sem sessão autenticada ou conexão. Nada foi salvo.';return false}
 const description=args.p_action==='transfer'?
  'Transferir '+args.p_quantity+' peça(s) de '+original.name+' para '+args.p_target_name:
  'Alterar mão de obra de '+original.name+' para '+money(args.p_new_price);
 if(typeof window.confirm==='function'&&!window.confirm(description+'?\n\nOs pagamentos já realizados serão preservados.'))return false;
 state.busy=true;state.lastError='';if(btn){btn.disabled=true;btn.textContent='☁️ Conferindo...'}
 try{
  await assertNoLocalPending(args.p_faction_id);
  if(typeof window.cloudEnsureFreshSession==='function')await window.cloudEnsureFreshSession(false);
  const current=await remoteRecord('factions',args.p_faction_id);
  if(!remoteEqualsLocal(original,current)){
   throw new Error('Os dados desta facção mudaram na nuvem. Reabra a tela para não sobrescrever uma alteração mais recente.');
  }
  args.p_expected_revision=Number(current.revision);
  if(!state.requestId)state.requestId=window.crypto?.randomUUID?.()||'';
  if(!state.requestId)throw new Error('Identificador seguro indisponível');
  args.p_request_id=state.requestId;
  if(btn)btn.textContent='☁️ Salvando com segurança...';
  const result=await window.cloudRequest('rpc/'+RPC,{method:'POST',
    headers:{Prefer:'return=representation'},body:JSON.stringify(args)});
  const out=Array.isArray(result)?result[0]:result;
  if(out?.applied!==true||sid(out.sourceId)!==args.p_faction_id)
   throw new Error('O servidor não confirmou a operação de facção');
  const confirmed=await remoteRecord('factions',args.p_faction_id);
  if(Number(confirmed.revision)<Number(out.sourceRevision)){
   throw new Error('A operação foi confirmada, mas a revisão nova ainda não apareceu na releitura; não repita sem conferir.');
  }
  const source=confirmed.data;
  if(args.p_action==='transfer'){
   if(args.p_quantity===qty(original.sent)){
    if(sid(source?.name).toLowerCase()!==args.p_target_name.toLowerCase())
      throw new Error('Transferência enviada, mas destino ainda não foi confirmado pela releitura');
   }else{
    if(qty(source.sent)!==qty(original.sent)-args.p_quantity)
      throw new Error('Origem ainda não confirmou a nova quantidade; verifique antes de repetir');
    await remoteRecord('factions',out.targetId);
  }
  }else if(qty(source?.price)!==args.p_new_price)
    throw new Error('Novo valor ainda não confirmado pela releitura; verifique antes de repetir');
  // Apply only the remotely read-back values to the live view; leave WAL intact.
  const local=arr('factions'),idx=local.findIndex(x=>sid(x?.id)===sid(args.p_faction_id));
  if(idx>=0)local[idx]=source;
  if(args.p_action==='transfer'&&out.createdDestination===true){
   const dest=await remoteRecord('factions',out.targetId);
   const at=local.findIndex(x=>sid(x?.id)===sid(out.targetId));
   if(at>=0)local[at]=dest.data;else local.push(dest.data);
  }
  try{window.localSaveOnly?.()}catch(_){}
  state.lastResult=out;state.lastProof={sourceId:args.p_faction_id,sourceRevision:confirmed.revision};
  state.lastConfirmedAt=new Date().toISOString();
  if(typeof window.closeModal==='function')window.closeModal();
  try{window.renderFactions?.()}catch(e){console.warn('[HLGB faction transfer] refresh view',e)}
  try{window.renderFactionPayments?.()}catch(_){}
  try{window.setCloudStatus?.('✅ Facção atualizada e confirmada na nuvem','ok')}catch(_){}
  if(typeof alert==='function')alert(args.p_action==='transfer'?
   '✅ Transferência confirmada na nuvem.\n\nOrigem: '+out.remainingSource+' peça(s).\nDestino: '+args.p_target_name+
   '\n\nO histórico foi preservado. Confira a localização da produção e os materiais enviados.':
   '✅ Mão de obra atualizada na nuvem.\n\nPagamentos em aberto atualizados: '+out.unpaidUpdated+
   '\nPagamentos pagos preservados: '+out.paidPreserved);
  return true;
 }catch(e){
  const raw=sid(e?.message||e);
  const blockedChecklist=/P0001|checklist de material vinculado|transfira os materiais com confer[eê]ncia/i.test(raw)&&/checklist|materiais/i.test(raw);
  state.lastError=blockedChecklist?
   'Transferência não realizada: existe um checklist de materiais ligado a esta facção. O servidor exige conferir e transferir o material junto com as peças. Abra “Checklist das facções” para conferir o envio. Não alteramos o destino nem apagamos o checklist.':
   raw.slice(0,450);
  if(alertEl)alertEl.textContent=state.lastError+
   ' Se a conexão caiu durante o envio, confira o histórico da facção antes de tentar novamente.';
  console.warn('[HLGB facções v'+V+'] operação não comprovada',e);
  return false;
 }finally{state.busy=false;if(btn&&btn.isConnected){btn.disabled=false;btn.textContent='☁️ Conferir e salvar na nuvem'}}
}
function open(id,action='transfer'){
 if(state.busy)return;
 const f=factionById(id);
 if(!f){alert('Alocação não encontrada. Atualize a lista de Facções.');return}
 state.formFactionId=sid(id);state.initialAction=action==='price'?'price':'transfer';state.requestId='';
 try{show()}catch(e){alert('Não foi possível abrir a transferência. '+sid(e.message))}
}
// Os botões ficam apenas na seção normal “Envios para facção”.
function install(){
 const table=document.getElementById('factionTable');
 table?.querySelectorAll('.hlgb-faction-adjust9514').forEach(b=>b.remove());
}
window.hlgbFactionAdjust9514={version:V,open,submit,install,status:()=>({busy:state.busy,lastResult:state.lastResult,
 lastError:state.lastError,lastConfirmedAt:state.lastConfirmedAt,lastProof:state.lastProof}),
 _test:{pendingFor,remoteEqualsLocal}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
try{window.hlgbAfterLogin?.(()=>setTimeout(install,700),0)}catch(_){}
setTimeout(install,1500);setTimeout(install,3800);
console.info('[HLGB] v'+V+' transferência e mão de obra transacional disponíveis');
})();