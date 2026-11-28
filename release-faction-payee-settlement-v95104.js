/* HLGB v95.104 — destino do acerto e registro de pagamento já efetuado.
 * Em pagamento normal, grava somente a linha de factionPayments com ACK e
 * releitura na nuvem. Nunca cria um segundo lançamento no Hub Financeiro.
 * A alocação de produção (factions) e a entrega original permanecem intactas.
 */
(function(root){
'use strict';
if(!root||root.hlgbFactionPayeeSettlement95104)return;
const V='95.104',WAL_DB='hlgb_durable_wal',state={busy:false,lastError:'',lastResult:null};
const sid=v=>String(v??'').trim(),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
const esc=v=>sid(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>(Number(n)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const cents=v=>Math.round((Number(v)||0)*100);
function dbRef(){try{return typeof db!=='undefined'&&db?db:root.db||{}}catch(_){return root.db||{}}}
function arr(k){const x=dbRef()[k];return Array.isArray(x)?x:[]}
function payment(id){return arr('factionPayments').find(x=>sid(x?.id)===sid(id))||null}
function master(id){return arr('factionMasters').find(x=>sid(x?.id)===sid(id))||null}
function statusPaid(row){return norm(row?.status)==='pago'}
function active(row){return row&&!row.manual&&!row.manualCanceledV9590&&['pendente','parcial','pago'].includes(norm(row.status))}
function canWrite(){
 if(root.__HLGB_AUTH_READY!==true||typeof root.cloudRequest!=='function'||typeof root.hlgbRecordSaveWithRetry!=='function')
  throw Error('Sessão autenticada ou gravação confirmada indisponível. Nenhum lançamento alterado.');
 if(typeof navigator!=='undefined'&&navigator.onLine===false)throw Error('Sem internet. Nenhum lançamento alterado.');
}
function walMatch(entry,id){
 const parts=sid(entry?.key).split(/\||::/),m=sid(entry?.module||parts[0]),key=sid(entry?.id||entry?.entity_id||parts[1]);
 const fid=sid(payment(id)?.factionServiceId);
 return (m==='factionPayments'&&key===sid(id))||
  (m==='factions'&&!!fid&&(key===fid||sid(entry?.data?.id)===fid));
}
function indexedWal(){
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined')return reject(Error('Não é possível conferir a fila IndexedDB.'));
  let request,aborted=false;
  try{request=indexedDB.open(WAL_DB)}catch(e){reject(e);return}
  request.onupgradeneeded=()=>{aborted=true;try{request.transaction.abort()}catch(_){}};
  request.onerror=()=>aborted?resolve([]):reject(request.error||Error('Erro de leitura da fila durável'));
  request.onsuccess=()=>{
   const base=request.result;
   if(!base.objectStoreNames.contains('entries')){base.close();reject(Error('Fila durável incompleta'));return}
   const tx=base.transaction('entries','readonly'),get=tx.objectStore('entries').getAll();
   get.onsuccess=()=>resolve(get.result);
   get.onerror=()=>reject(get.error||Error('Erro de leitura dos lançamentos pendentes'));
   tx.oncomplete=()=>base.close();
  };
 });
}
async function cleanWal(id){
 if(typeof localStorage==='undefined')throw Error('Fila local indisponível neste navegador.');
 let durable,legacy;
 try{
  durable=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||'null');
  legacy=JSON.parse(localStorage.getItem('hlgb_records_pending_v91')||'null');
 }catch(_){throw Error('Fila local ilegível. Não sobrescrever pagamentos.')}
 if(durable&&(!durable.entries||typeof durable.entries!=='object'||Array.isArray(durable.entries)))
  throw Error('Fila WAL incompleta. Nenhuma alteração enviada.');
 if(Object.entries(durable?.entries||{}).some(([key,e])=>walMatch({...e,key:e?.key||key},id)))
  throw Error('Pagamento com alteração local ainda pendente; sincronize antes.');
 if(legacy?.modules&&Object.entries(legacy.modules).some(([module,entries])=>{
  if(!Array.isArray(entries))throw Error('Fila de sincronização inválida.');
  return entries.some(e=>walMatch({module,id:e.id,data:e.data||e.value||e.record},id));
 }))throw Error('Pagamento ainda não sincronizado neste computador.');
 const rows=await indexedWal();
 if(!Array.isArray(rows))throw Error('IndexedDB não confirmou a leitura da WAL.');
 if(rows.some(e=>walMatch(e,id)))throw Error('Pagamento aguardando sincronização no IndexedDB.');
}
async function remote(module,id){
 const rows=await root.cloudRequest('hlgb_records?select=module,entity_id,data,revision,deleted_at,updated_at'+
  '&module=eq.'+encodeURIComponent(module)+'&entity_id=eq.'+encodeURIComponent(sid(id))+'&limit=1',{method:'GET'});
 if(!Array.isArray(rows))throw Error('A leitura da nuvem não foi confirmada.');
 const r=rows.find(x=>sid(x.module)===module&&sid(x.entity_id)===sid(id)&&!x.deleted_at);
 if(!r||!Number.isInteger(Number(r.revision))||Number(r.revision)<1)
  throw Error('Registro inexistente, excluído ou não confirmado na nuvem.');
 return r;
}
function compare(current,cloud){
 const fields=['id','status','paidAmount','discountAmount','value','quantity','factionName',
  'factionMasterId','factionServiceId','manualGroupId','description','paymentDate','paymentMethod','source','deliveryId','serviceModeV9577','noteQueueId'];
 return fields.every(f=>sid(current?.[f])===sid(cloud?.[f]));
}
async function verifyPayment(id){
 canWrite();await cleanWal(id);
 const local=payment(id);
 if(!active(local))throw Error('Somente pagamentos normais identificados podem ser corrigidos aqui.');
 const row=await remote('factionPayments',id);
 if(!compare(local,row.data))throw Error('O pagamento mudou na nuvem. Recarregue a página antes de alterar.');
 return row;
}
// Same delivery limit as the normal Acertos guard, with the current server rows.
async function verifyDeliveryBalance9739(p){
 const fid=sid(p.factionServiceId),local=arr('factions').find(f=>sid(f.id)===fid);
 const explicit=!p.manual&&(!p.serviceModeV9577||p.serviceModeV9577==='faccao')&&(/^faction_delivery(?:_|$)/.test(norm(p.source))||!!sid(p.deliveryId));
 if(!explicit&&local?.paymentByDeliveryV9135!==true)return;
 if(!fid||typeof root.hlgbFactionPaymentOverAccounted!=='function')throw Error('Proteção de entrega indisponível; não registre a baixa.');
 if(!local||root.hlgbFactionPaymentOverAccounted(local))throw Error('Saldo de entregas local inconsistente; confira os pagamentos antes da baixa.');
 const fr=await remote('factions',fid),f=fr.data;
 if(!f||sid(f.id)!==fid||sid(f.done)!==sid(local.done)||sid(f.sent)!==sid(local.sent))
  throw Error('Saldo da entrega mudou na nuvem. Atualize antes da baixa.');
 const records=await root.cloudRequest('hlgb_records?select=module,entity_id,data,revision,deleted_at&module=eq.factionPayments&data->>factionServiceId=eq.'+encodeURIComponent(fid)+'&deleted_at=is.null&limit=500',{method:'GET'});
 if(!Array.isArray(records)||records.length>=500)throw Error('Não foi possível conferir todos os pagamentos desta entrega.');
 const rows=[],ids=new Set();
 for(const r of records){
  const x=r?.data,id=sid(r?.entity_id);
  if(!id||ids.has(id)||r.module!=='factionPayments'||r.deleted_at||sid(x?.id)!==id||sid(x?.factionServiceId)!==fid||!Number.isInteger(Number(r.revision))||Number(r.revision)<1)throw Error('Vínculos de pagamento inconsistentes na nuvem.');
  ids.add(id);rows.push(x);
 }
 const own=rows.find(x=>sid(x.id)===sid(p.id));
 if(!own||!compare(own,p)||root.hlgbFactionPaymentOverAccounted(f,rows))
  throw Error('Saldo de entregas ou pagamento duplicado na nuvem. Confira antes da baixa.');
}
async function hubCheck(paymentId){
 const rows=await root.cloudRequest('hlgb_records?select=entity_id,data,deleted_at'+
  '&module=eq.hubFinanceEntries&limit=2000',{method:'GET'});
 if(!Array.isArray(rows)||rows.length>=2000)
  throw Error('Não foi possível conferir integralmente o Hub; baixa bloqueada.');
 return rows.filter(x=>!x.deleted_at&&[
  x.data?.sourceId,x.data?.sourcePaymentId,x.data?.factionPaymentId,
  x.data?.originalPaymentId,...(Array.isArray(x.data?.paymentIds)?x.data.paymentIds:[])
 ].some(id=>sid(id)===sid(paymentId)));
}
async function readMaster(id,role){
 const row=await remote('factionMasters',id),m=row.data;
 const local=master(id);
 if(!local||norm(local.name)!==norm(m.name)||m.active===false)
  throw Error('Cadastro da facção de destino mudou ou está inativo. Atualize a tela.');
 const expectedRole=sid(role||'faccao');
 const r=sid(m.factionRoleV9577||'faccao');
 if(expectedRole==='faccao'&&r!=='faccao')
  throw Error('O destino deve ser uma facção de costura cadastrada.');
 return m;
}
function memoText(current,addition){
 const base=sid(current),suffix=sid(addition);
 return (base?base+'\n':'')+suffix;
}
async function saveAndRead(id,next,checks){
 const out=await root.hlgbRecordSaveWithRetry('factionPayments',sid(id),JSON.parse(JSON.stringify(next)),false);
 if(out?.applied!==true)throw Error('O servidor não confirmou a gravação; atualize e confira.');
 let proof;
 try{proof=await remote('factionPayments',id)}
 catch(e){throw Error('A gravação pode ter sido recebida, mas a releitura falhou. NÃO repita antes de conferir na nuvem. '+sid(e?.message))}
 if(!checks(proof.data))throw Error('A alteração não foi comprovada na releitura. NÃO repita antes de conferir na nuvem.');
 const all=arr('factionPayments'),i=all.findIndex(x=>sid(x?.id)===sid(id));
 if(i>=0)all[i]=JSON.parse(JSON.stringify(proof.data));
 try{root.localSaveOnly?.()}catch(e){console.warn('[HLGB '+V+'] cópia local',e)}
 return proof.data;
}
async function changePayee(id,targetId,note){
 if(state.busy)throw Error('Outra alteração está em andamento.');
 state.busy=true;state.lastError='';
 try{
  if(root.__HLGB_PAYEE_SYNC_PATCH_95104!==true)
   throw Error('Proteção da rotina antiga de sincronização indisponível. Troca de facção bloqueada.');
  const reason=sid(note);
  if(reason.length<6||reason.length>700)throw Error('Informe o motivo da troca de facção (6 a 700 caracteres).');
  const old=await verifyPayment(id),p=old.data;
  if(norm(p.status)!=='pendente'||cents(p.paidAmount)!==0||
     (Array.isArray(p.paymentHistory)&&p.paymentHistory.length))
   throw Error('Só é permitido trocar o destinatário de um pagamento integralmente pendente.');
  if((await hubCheck(id)).length)throw Error('Há saída vinculada no Hub. Concilie o financeiro antes de trocar o recebedor.');
  const from=sid(p.factionName),to=await readMaster(targetId,'faccao');
  if(norm(from)===norm(to.name))throw Error('A facção de destino deve ser diferente da atual.');
  const now=new Date().toISOString();
  const history=Array.isArray(p.payeeTransferHistoryV95104)?p.payeeTransferHistoryV95104.slice():[];
  const event={id:'payee-change-'+sid(id)+'-'+sid(old.revision+1),at:now,
   fromName:from,toName:sid(to.name),fromMasterId:sid(p.factionMasterId)||null,
   toMasterId:sid(targetId),reason};
  if(history.some(x=>sid(x.id)===event.id))throw Error('Esta transferência já foi registrada. Atualize a tela.');
  const next={...p,factionName:sid(to.name),factionMasterId:to.id,
    pix:sid(to.pix||''),payeeTransferV95104:{toName:sid(to.name),toMasterId:sid(targetId),
       toPix:sid(to.pix||''),fromName:history[0]?.fromName||from,updatedAt:now},
    payeeTransferHistoryV95104:[...history,event],updatedAt:now};
  const saved=await saveAndRead(id,next,v=>
   sid(v.factionName)===sid(to.name)&&sid(v.factionMasterId)===sid(targetId)&&
   cents(v.value)===cents(p.value)&&sid(v.status)==='Pendente'&&
   Array.isArray(v.payeeTransferHistoryV95104)&&
   v.payeeTransferHistoryV95104.some(e=>sid(e.id)===event.id));
  state.lastResult={kind:'transfer',paymentId:sid(id),from,to:sid(to.name),total:Number(saved.value)};
  refresh();return state.lastResult;
 }catch(e){state.lastError=sid(e?.message||e);throw e}
 finally{state.busy=false}
}
async function markPreviouslyPaid(id,date,method,note,reference=''){
 if(state.busy)throw Error('Outra alteração está em andamento.');
 state.busy=true;state.lastError='';
 try{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(sid(date))||date>new Date().toISOString().slice(0,10))
   throw Error('Informe a data real do pagamento, sem data futura.');
  if(!sid(method))throw Error('Informe a forma de pagamento anterior.');
  const observation=sid(note);
  if(observation.length<6||observation.length>700)
   throw Error('Explique onde e por que essa peça já foi paga (6 a 700 caracteres).');
  if(sid(reference).length>120)throw Error('Referência do pagamento muito longa.');
  const old=await verifyPayment(id),p=old.data;
  if(norm(p.status)!=='pendente'||cents(p.paidAmount)!==0)
   throw Error('Somente pagamento integralmente pendente e sem baixa anterior pode ser marcado.');
  if(Array.isArray(p.paymentHistory)&&p.paymentHistory.length)
   throw Error('Já existe histórico de pagamento. Concilie antes de registrar novamente.');
  if((await hubCheck(id)).length)
   throw Error('Já existe uma saída vinculada a este pagamento no Hub. Concilie a saída anterior antes.');
  await verifyDeliveryBalance9739(p);
  const netCents=cents(p.value)-cents(p.discountAmount);
  if(netCents<=0||netCents>cents(p.value))
   throw Error('Valor líquido incoerente; confira abatimentos antes de marcar como pago.');
  const at=new Date().toISOString();
  const event={id:'already-paid-'+sid(id),date,paid:netCents/100,discount:0,method,
    observation:'Já pago anteriormente: '+observation,reference:sid(reference),
    source:'hlgb-existing-payment-v95104',at};
  const reconciliation={status:'pendente_conciliacao_bancaria',source:'ja_pago_fora_do_fluxo',
    amount:netCents/100,date,method,reference:sid(reference),note:observation,at};
  const next={...p,status:'Pago',paidAmount:netCents/100,
   paymentDate:date,paymentMethod:sid(method),
   paymentHistory:[event],previouslyPaidV95104:reconciliation,
   observation:memoText(p.observation,'Já pago em '+date+' via '+sid(method)+
    '. '+observation+(reference?' · Ref.: '+sid(reference):'')),updatedAt:at};
  const saved=await saveAndRead(id,next,v=>
   norm(v.status)==='pago'&&cents(v.paidAmount)===netCents&&
   v.previouslyPaidV95104?.status==='pendente_conciliacao_bancaria'&&
   Array.isArray(v.paymentHistory)&&v.paymentHistory.some(e=>sid(e.id)===event.id));
  state.lastResult={kind:'already-paid',paymentId:sid(id),value:Number(saved.paidAmount),
   reconciliation:'pendente_conciliacao_bancaria'};
  refresh();return state.lastResult;
 }catch(e){state.lastError=sid(e?.message||e);throw e}
 finally{state.busy=false}
}
// Commercial single-record correction. No multi-record settlement and no
// three-way merge retry. A concurrent payment must win/lose by revision.
const canonical9901=v=>Array.isArray(v)?v.map(canonical9901):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical9901(v[k])])):v;
const equal9901=(a,b)=>JSON.stringify(canonical9901(a))===JSON.stringify(canonical9901(b));
const actor9901=()=>{try{return sid(typeof cloudUser!=='undefined'?cloudUser?.id:typeof currentUser==='function'?currentUser()?.id:root.currentUser?.()?.id)}catch(_){return ''}};
function adjustmentAvailable9901(){
 try{return root.__HLGB_AUTH_READY===true&&!!actor9901()&&root.__HLGB_PAYEE_SYNC_PATCH_95104===true&&typeof root.hlgbRecordRpcSave==='function'&&typeof root.hlgbApplyRecordRow==='function'&&typeof root.hlgbRecordCanWrite==='function'&&root.hlgbRecordCanWrite('factionPayments')===true&&typeof canOpenPage==='function'&&canOpenPage('pagamentosFaccoes')===true&&canOpenPage('faccoes')===true&&typeof root.hlgbFactionAcertoUnified95102?.normalAdjustmentPreview==='function'&&typeof root.hlgbFactionAcertoUnified95102?.currentData==='function'}catch(_){return false}
}
async function adjustNormal9901(groupKey,id,input,expected){
 if(state.busy)throw Error('Outra alteração está em andamento.');
 state.busy=true;state.lastError='';
 const actor=actor9901(),ensure=()=>{if(!adjustmentAvailable9901()||actor9901()!==actor)throw Error('Sessão ou autorização alterada. Reabra o acerto.');if(root.hlgbWalConfirmedReplay9333?.state?.busy||root.hlgbWalSingleAuthority9339?.status?.()?.scanBusy)throw Error('Sincronização em andamento. Confira antes de alterar.')};
 let sent=false;
 try{
  ensure();canWrite();
  const api=root.hlgbFactionAcertoUnified95102,initial=api.normalAdjustmentPreview(api.currentData(),groupKey,id,input,true);
  if(initial.state!=='preview-only'||!equal9901(initial,expected))throw Error('Acerto mudou. Calcule novamente antes de salvar.');
  await cleanWal(id);ensure();
  const old=await remote('factionPayments',id),local=payment(id),v=old.data;
  if(!active(local)||!equal9901(v,local)||v.manual||v.previouslyPaidV95104||v.payeeTransferV95104||v.lastGroupSettlementId||v.weeklySettlementV9883)throw Error('Registro ou histórico divergente. Atualize a consulta.');
  const service=await remote('factions',initial.factionServiceId),localService=arr('factions').find(x=>sid(x.id)===initial.factionServiceId);
  if(!equal9901(service.data,localService))throw Error('Entrega mudou na nuvem. Atualize a consulta.');
  const owner=await readMaster(v.factionMasterId,'faccao');
  if(!sid(owner.id)||norm(owner.name)!==norm(v.factionName))throw Error('Identidade da facção mudou.');
  await verifyDeliveryBalance9739(v);
  if((await hubCheck(id)).length)throw Error('Há lançamento vinculado no Hub. Concilie antes de corrigir.');
  const prior=v.settlementAdjustmentV9879,history=v.settlementAdjustmentHistoryV9901??[];
  if(!Array.isArray(history)||history.length>=100||prior&&(!history.length||!equal9901(history[history.length-1],prior))||!prior&&history.length)throw Error('Histórico de correção a conferir.');
  const fresh=api.normalAdjustmentPreview(api.currentData(),groupKey,id,input,true);
  if(!equal9901(initial,fresh))throw Error('Acerto mudou durante a consulta.');
  await cleanWal(id);ensure();
  if(!equal9901(payment(id),v))throw Error('Registro local alterado durante a consulta.');
  const before=await remote('factionPayments',id);
  if(before.revision!==old.revision||!equal9901(before.data,v))throw Error('Revisão mudou. Calcule novamente.');
  const reference=typeof root.crypto?.randomUUID==='function'?root.crypto.randomUUID():'';
  if(!reference)throw Error('Referência segura indisponível.');
  const adjustment={reference,deliveredQuantity:initial.deliveredQuantity,payableQuantity:initial.payableQuantity,deliveryDate:initial.deliveryDate,previousPayableQuantity:initial.previousPayableQuantity,previousUnitCents:initial.previousUnitCents,unitCents:initial.proposedUnitCents,previousCents:initial.previousCents,totalCents:initial.proposedCents,reason:initial.reason,actor};
  const next={...v,unitPrice:initial.proposedUnitCents/100,value:initial.proposedCents/100,settlementAdjustmentV9879:adjustment,settlementAdjustmentHistoryV9901:[...history,adjustment],updatedAt:new Date().toISOString()};
  // CAS against the confirmed server revision, not the generic auto-merge path.
  ensure();sent=true;
  const ack=await root.hlgbRecordRpcSave('factionPayments',sid(id),next,Number(old.revision),false);
  if(ack?.applied!==true||sid(ack.module)!=='factionPayments'||sid(ack.entity_id)!==sid(id)||Number(ack.revision)!==Number(old.revision)+1||ack.deleted_at||!equal9901(ack.data,next))throw Error('Servidor não confirmou exatamente a revisão.');
  const read=await remote('factionPayments',id),sourceAfter=await remote('factions',initial.factionServiceId);
  if(Number(read.revision)!==Number(ack.revision)||!equal9901(read.data,next)||sourceAfter.revision!==service.revision||!equal9901(sourceAfter.data,service.data))throw Error('Registro ou entrega mudou durante a confirmação.');
  await cleanWal(id);ensure();
  if(!equal9901(payment(id),v)&&!equal9901(payment(id),read.data))throw Error('Há alteração local concorrente.');
  root.hlgbApplyRecordRow(read);
  if(!equal9901(payment(id),read.data))throw Error('Cópia local ainda não confirmou o registro remoto.');
  try{root.localSaveOnly?.()}catch(_){}
  state.lastResult={kind:'normal-adjustment',paymentId:sid(id),reference,physicalQuantity:initial.deliveredQuantity,payableQuantity:initial.payableQuantity,total:next.value};
  refresh();return state.lastResult;
 }catch(e){state.lastError=sid(e?.message||e);if(sent)throw Error('Correção sem confirmação integral nesta sessão. NÃO repita antes de atualizar e conferir o registro: '+state.lastError);throw e}
 finally{state.busy=false}
}
function openModalSafe(title,html){
 if(typeof root.openModal!=='function')throw Error('Janela do HLGB indisponível.');
 root.openModal(title,html,()=>false);
}
function choices(row){
 const role=sid(row?.serviceModeV9577||'faccao');
 return arr('factionMasters').filter(x=>x?.active!==false&&sid(x.name)&&
    (role!=='faccao'||sid(x.factionRoleV9577||'faccao')==='faccao')&&
    norm(x.name)!==norm(row.factionName))
   .sort((a,b)=>sid(a.name).localeCompare(sid(b.name),'pt-BR'));
}
function openTransfer(id){
 const p=payment(id);
 if(!active(p)||norm(p.status)!=='pendente')throw Error('Abra um pagamento pendente para trocar a facção.');
 const list=choices(p);
 if(!list.length)throw Error('Não existe outra facção cadastrada disponível.');
 const html='<section id="hlgb-payee-v95104" class="panel" style="padding:12px">'+
  '<p><b>'+esc(p.description||'Serviço')+'</b> · '+esc(p.quantity)+' peças · '+money(p.value)+'</p>'+
  '<p>Recebedor atual: <b>'+esc(p.factionName)+'</b></p>'+
  '<div class="field"><label>Quem deve receber este acerto?</label><select id="payee104-target">'+
   '<option value="">Selecione a facção</option>'+
   list.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.name)+'</option>').join('')+'</select></div>'+
  '<div class="field"><label>Motivo da transferência (obrigatório)</label>'+
   '<textarea id="payee104-note" rows="3" maxlength="700" placeholder="Ex.: Robe Gabrielle foi transferido da Vanessa para a Roseli."></textarea></div>'+
  '<p class="sub">Troca somente quem recebe este pagamento pendente. O envio de produção original, a entrega, o valor e o histórico permanecem. Nenhum pagamento será criado.</p>'+
  '<div id="payee104-feedback" role="status" class="sub"></div>'+
  '<button type="button" class="primary" id="payee104-submit">☁️ Salvar nova facção</button></section>';
 openModalSafe('Trocar facção do acerto',html);
 const b=document.getElementById('payee104-submit');
 b?.addEventListener('click',async()=>{
  const feedback=document.getElementById('payee104-feedback'),to=document.getElementById('payee104-target')?.value,
   reason=document.getElementById('payee104-note')?.value;
  if(b)b.disabled=true;
  if(feedback)feedback.textContent='Conferindo a nuvem antes de salvar…';
  try{const done=await changePayee(id,to,reason);
   if(feedback)feedback.textContent='✓ Destino confirmado na nuvem: '+done.to+'.';
   root.closeModal?.();
  }catch(e){if(feedback)feedback.textContent='⚠ '+sid(e.message||e);if(b)b.disabled=false}
 });
}
function openPriorPaid(id){
 const p=payment(id);
 if(!active(p)||norm(p.status)!=='pendente')throw Error('Este pagamento não está integralmente pendente.');
 const html='<section id="hlgb-paid-v95104" class="panel" style="padding:12px">'+
  '<p><b>'+esc(p.factionName)+'</b> · '+esc(p.description||'Serviço')+' · saldo '+money(Number(p.value)-Number(p.paidAmount||0)-Number(p.discountAmount||0))+'</p>'+
  '<div class="grid">'+
   '<div class="field"><label>Data em que já foi pago</label><input id="paid104-date" type="date"></div>'+
   '<div class="field"><label>Forma usada</label><select id="paid104-method"><option value="">Selecione</option>'+
    '<option>PIX</option><option>Transferência</option><option>Dinheiro</option><option>Cheque</option><option>Outro</option></select></div></div>'+
  '<div class="field"><label>Observação obrigatória</label><textarea id="paid104-note" rows="3" maxlength="700" placeholder="Ex.: pago no Pix anterior, não incluir no próximo acerto"></textarea></div>'+
  '<div class="field"><label>Identificação do comprovante / lançamento no banco (opcional)</label><input id="paid104-ref" maxlength="120" placeholder="Ex.: comprovante de 12/11"></div>'+
  '<p class="sub"><b>Não cria saída financeira:</b> marca este serviço como já pago e o retira do saldo pendente. O vínculo com o banco fica sinalizado como pendente de conciliação; nunca registra um segundo Pix ou pagamento no Hub.</p>'+
  '<div id="paid104-feedback" role="status" class="sub"></div>'+
  '<button id="paid104-submit" type="button" class="primary">☁️ Confirmar pagamento anterior</button></section>';
 openModalSafe('Marcar peça já paga',html);
 const b=document.getElementById('paid104-submit');
 b?.addEventListener('click',async()=>{
  const f=document.getElementById('paid104-feedback'),date=document.getElementById('paid104-date')?.value,
   method=document.getElementById('paid104-method')?.value,note=document.getElementById('paid104-note')?.value,
   ref=document.getElementById('paid104-ref')?.value;
  if(typeof root.confirm==='function'&&!root.confirm('Confirma que o valor já saiu do banco anteriormente? Não será criada nova saída financeira.'))return;
  if(b)b.disabled=true;if(f)f.textContent='Conferindo pagamentos anteriores e a nuvem…';
  try{await markPreviouslyPaid(id,date,method,note,ref);
   if(f)f.textContent='✓ Pagamento anterior confirmado; conciliação bancária sinalizada.';
   root.closeModal?.();
  }catch(e){if(f)f.textContent='⚠ '+sid(e.message||e);if(b)b.disabled=false}
 });
}
function refresh(){
 try{root.renderFactionPayments?.()}catch(e){console.warn('[HLGB '+V+'] render',e)}
 try{root.hlgbFactionAcertoUnified95102?.render?.()}catch(e){console.warn('[HLGB '+V+'] acerto',e)}
 setTimeout(decorate,30);
}
function decorate(){
 const host=document.getElementById('factionPaymentTable');
 if(!host)return false;
 host.querySelectorAll('button[onclick*="editFactionPayment("]').forEach(edit=>{
  const onclick=sid(edit.getAttribute('onclick')),match=onclick.match(/editFactionPayment\((\d+)\)/);
  if(!match)return;
  const p=payment(match[1]),tr=edit.closest('tr'),cell=edit.parentElement;
  if(!p||!tr||!cell||p.manual)return;
  if(norm(p.status)==='pendente'&&!cell.querySelector('[data-payee104-id="'+esc(match[1])+'"]')){
   const transfer=document.createElement('button');transfer.type='button';transfer.className='secondary';
   transfer.textContent='↔ Trocar facção do acerto';transfer.setAttribute('data-payee104-id',match[1]);cell.appendChild(transfer);
   const paid=document.createElement('button');paid.type='button';paid.className='secondary';
   paid.textContent='✓ Já estava pago';paid.setAttribute('data-already-paid104-id',match[1]);cell.appendChild(paid);
  }
  if(p.previouslyPaidV95104&&!cell.querySelector('[data-reconcile104]')){
   const tip=document.createElement('span');tip.className='sub';tip.setAttribute('data-reconcile104','1');
   tip.textContent='Pago anteriormente · conciliação bancária pendente';cell.appendChild(tip);
  }
  if(p.payeeTransferV95104&&!cell.querySelector('[data-payee-history104]')){
   const tip=document.createElement('span');tip.className='sub';tip.setAttribute('data-payee-history104','1');
   tip.textContent='Original: '+sid(p.payeeTransferV95104.fromName);cell.appendChild(tip);
  }
 });
 return true;
}
function delegate(e){
 const b=e.target?.closest?.('[data-payee104-id], [data-already-paid104-id], [data-manual-payee104-group]');
 if(!b)return;
 e.preventDefault();e.stopPropagation();
 try{
  if(b.hasAttribute('data-payee104-id'))openTransfer(b.getAttribute('data-payee104-id'));
  else if(b.hasAttribute('data-already-paid104-id'))openPriorPaid(b.getAttribute('data-already-paid104-id'));
  else {
   const group=b.getAttribute('data-manual-payee104-group');
   if(typeof root.hlgbFactionManual9566?.openForm!=='function')throw Error('Editor de facções avulsas indisponível.');
   root.hlgbFactionManual9566.openForm(group);
  }
 }catch(err){alert('Não foi possível abrir a ação: '+sid(err?.message||err))}
}
function protectLegacyActions(){
 for(const name of ['reopenFactionPayment','deleteFactionPayment','editFactionPayment','saveFactionPaymentAndPay']){
  const previous=root[name];if(typeof previous!=='function'||previous.__hlgbPayeeGuard95104)continue;
  const wrapped=function(id){
   const p=payment(id);
   if(p&&(p.settlementAdjustmentV9879||(['reopenFactionPayment','deleteFactionPayment'].includes(name)&&(p.previouslyPaidV95104||p.payeeTransferV95104)))){
    alert('Este pagamento contém histórico protegido. Para editar a remuneração, use o editor do acerto consolidado. Para reabrir ou excluir, confira o histórico antes de qualquer alteração.');
    return false;
   }
   return previous.apply(this,arguments);
  };
  wrapped.__hlgbPayeeGuard95104=true;wrapped.__original=previous;root[name]=wrapped;
 }
}
function install(){
 if(typeof document==='undefined')return false;
 protectLegacyActions();
 if(!document.__hlgbPayeeClick95104){document.addEventListener('click',delegate);document.__hlgbPayeeClick95104=true}
 const old=root.renderFactionPayments;
 if(typeof old==='function'&&!old.__hlgbPayeeDecorate95104){
  const wrapper=function(){const out=old.apply(this,arguments);setTimeout(decorate,0);return out};
  wrapper.__hlgbPayeeDecorate95104=true;wrapper.__original=old;root.renderFactionPayments=wrapper;
 }
 setTimeout(decorate,0);return true;
}
root.hlgbFactionPayeeSettlement95104={version:V,changePayee,markPreviouslyPaid,openTransfer,openPriorPaid,
 install,decorate,adjustNormal9901,adjustmentAvailable9901,status:()=>({...state}),_test:{active,compare,hubCheck}};
if(typeof document!=='undefined'){
 install();
 try{root.hlgbAfterLogin?.(()=>setTimeout(install,350),0)}catch(_){}
 root.addEventListener?.('hlgb:authenticated',()=>setTimeout(install,250));
}
console.info('[HLGB] v'+V+' troca de recebedor + já pago com comprovacao sem segunda saida no Hub');
})(typeof window!=='undefined'?window:null);
