/* HLGB v95.20 — Facções: modelos encontrados facilmente e baixa de execução de travetada.
 * PUBLICAÇÃO NÃO AUTORIZADA SEM HOMOLOGAÇÃO: este módulo fica apenas em PR.
 * Baixa operacional NÃO é pagamento: histórico somente na alocação de facção (factions),
 * com revisão esperada no RPC canônico, leitura posterior e proteção WAL.
 */
(function(){
'use strict';
const V='95.20',WAL_NAME='hlgb_durable_wal';
if(window.hlgbFactionOperations9520?.version===V)return;
const sid=v=>String(v??''),int=v=>Number(v),fmt=v=>Number(v||0).toLocaleString('pt-BR'),cash=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=v=>sid(v).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const state={version:V,busy:false,activeId:'',requestId:'',lastError:'',lastConfirmed:null,lastReadAt:''};
let installed=false,wrapped=null;
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.db||{}}
function arr(m){const x=dbRef()[m];return Array.isArray(x)?x:[]}
function faction(id){return arr('factions').find(x=>sid(x?.id)===sid(id))||null}
function product(id){return arr('products').find(x=>sid(x?.id)===sid(id))||null}
function modelName(f){return sid(product(f.productId)?.name||f.description||f.product||f.op||'Modelo não informado')}
function requireReady(){
 if(window.__HLGB_AUTH_READY!==true||navigator.onLine===false||typeof window.cloudRequest!=='function')
  throw new Error('A operação exige login e conexão ativa com a nuvem.');
}
function hasPending(op,f,prod){
 if(!op||typeof op!=='object')return false;
 const mod=sid(op.module),id=sid(op.id);
 return (mod==='factions'&&id===sid(f.id))||
   (mod==='products'&&id===sid(prod?.id))||
   (mod==='production'&&sid(f.productionId)&&id===sid(f.productionId))||
   (mod==='factionPayments'&&sid(op.data?.factionServiceId)===sid(f.id));
}
function walIdbRead(){
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined')return reject(new Error('IndexedDB indisponível para conferir alterações pendentes'));
  let req,abort=false;
  try{req=indexedDB.open(WAL_NAME)}catch(e){reject(e);return}
  req.onupgradeneeded=()=>{abort=true;try{req.transaction.abort()}catch(_){}};
  req.onerror=()=>reject(new Error(abort?'WAL ainda não inicializada':'Não foi possível conferir WAL no IndexedDB'));
  req.onsuccess=()=>{
   const d=req.result;
   if(!d.objectStoreNames.contains('entries')){d.close();reject(new Error('Estrutura da WAL indisponível'));return}
   try{
    const tx=d.transaction('entries','readonly'),get=tx.objectStore('entries').getAll();
    get.onsuccess=()=>resolve(Array.isArray(get.result)?get.result:[]);
    get.onerror=()=>reject(new Error('Leitura WAL IndexedDB falhou'));
    tx.oncomplete=()=>d.close();
    tx.onerror=()=>reject(new Error('Transação WAL falhou'));
   }catch(e){try{d.close()}catch(_){}reject(e)}
  };
 });
}
async function assertNoPending(f,prod){
 let wal=null,normal=null;
 try{wal=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||'null')}catch(e){throw new Error('WAL local ilegível; baixa bloqueada')}
 if(wal!==null&&(!wal.entries||typeof wal.entries!=='object'))throw new Error('WAL local incompleta; baixa bloqueada');
 if(Object.values(wal?.entries||{}).some(x=>hasPending(x,f,prod)))throw new Error('Esta alocação tem gravação local pendente; sincronize primeiro.');
 try{normal=JSON.parse(localStorage.getItem('hlgb_records_pending_v91')||'null')}catch(e){throw new Error('Fila local ilegível; baixa bloqueada')}
 for(const [module,entries] of Object.entries(normal?.modules||{})){
  if(!Array.isArray(entries))throw new Error('Fila pendente inválida; baixa bloqueada');
  if(entries.some(x=>hasPending({module,id:x?.id,data:x?.data||x?.value},f,prod)))
   throw new Error('Há alteração pendente nesta facção ou neste modelo. Sincronize antes de dar baixa.');
 }
 const idb=await walIdbRead();
 if(idb.some(x=>hasPending(x,f,prod)))throw new Error('Há alteração pendente no IndexedDB desta facção ou modelo.');
}
async function remote(module,id){
 const path='hlgb_records?select=module,entity_id,revision,data,deleted_at,updated_at'+
  '&module=eq.'+encodeURIComponent(module)+'&entity_id=eq.'+encodeURIComponent(sid(id))+'&limit=1';
 const rows=await window.cloudRequest(path,{method:'GET'});
 if(!Array.isArray(rows))throw new Error('Consulta da nuvem não confirmada para '+module);
 const row=rows.find(x=>sid(x?.module)===module&&sid(x?.entity_id)===sid(id)&&!x.deleted_at);
 if(!row||!(Number(row.revision)>0))throw new Error('Registro não localizado na nuvem ou sem revisão');
 return row;
}
// A baixa confirmada não pode ficar com revisão antiga no cache: o sincronizador
// normalizaria a linha como uma edição local e poderia tentar salvar outra vez.
function syncConfirmedSnapshot9521(module,row){
 const id=sid(row?.entity_id),rev=Number(row?.revision);
 if(!id||!(rev>0)||!row?.data||row.deleted_at)throw new Error('Confirmação de nuvem incompleta: snapshot não atualizado');
 let snapshots=null,lastSeen=null;
 try{if(typeof hlgbRecordSnapshots!=='undefined')snapshots=hlgbRecordSnapshots}catch(_){}
 if(!snapshots)snapshots=window.hlgbRecordSnapshots||null;
 if(!snapshots||!(snapshots[module] instanceof Map))throw new Error('Cache de revisões do HLGB indisponível: reabra a tela antes de uma nova baixa');
 const map=snapshots[module],current=map.get(id);
 if(current&&Number(current.revision||0)>rev)throw new Error('Existe revisão local mais recente; não sobrescreva o cache');
 const safe=JSON.parse(JSON.stringify(row.data));
 map.set(id,{module,entity_id:id,data:safe,deleted_at:null,revision:rev,
  updated_at:sid(row.updated_at),updated_by:row.updated_by||null});
 try{
  if(typeof hlgbRecordLastSeen!=='undefined'&&
      sid(row.updated_at)>sid(hlgbRecordLastSeen[module]||''))hlgbRecordLastSeen[module]=sid(row.updated_at);
 }catch(_){}
 return true;
}
function sameOperationalFields(local,record){
 if(!local||!record?.data)return false;
 const keys=['name','sent','done','returned','defects','waste','price','orderId','productId','productionId','status'];
 return keys.every(k=>sid(local[k]??'')===sid(record.data[k]??''));
}
function histories(f){
 const events=f?.travetaBaixasV9520;
 if(events!==undefined&&!Array.isArray(events))throw new Error('Histórico de travetada inválido. Nenhuma baixa efetuada.');
 const list=events||[];let total=0;
 const uuids=new Set();
 for(const e of list){
  if(!(Number.isInteger(Number(e?.quantity))&&Number(e.quantity)>0)||!sid(e.requestId)||uuids.has(sid(e.requestId)))throw new Error('Histórico de travetada inconsistente');
  total+=Number(e.quantity);uuids.add(sid(e.requestId));
 }
 if(f?.travetaDonePiecesV9520!=null&&Number(f.travetaDonePiecesV9520)!==total)
  throw new Error('Total de travetada diverge do histórico. Baixa bloqueada até conferência.');
 return {list,total};
}
function capacity(f){
 const sent=Number(f?.sent||0),done=Number(f?.done||0),returned=Number(f?.returned||0);
 if(![sent,done,returned].every(v=>Number.isInteger(v)&&v>=0))throw new Error('Quantidades da facção inválidas');
 if(sent<=0||Math.max(done,returned)>sent)throw new Error('Quantidade recebida/enviada inconsistente; confira o serviço');
 return Math.min(sent,Math.max(done,returned));
}
function status(f){
 const prog=histories(f),limit=capacity(f),p=product(f.productId),points=int(p?.travetadas||0);
 return {factionId:sid(f.id),model:modelName(f),faction:sid(f.name),sent:int(f.sent),eligible:limit,
   done:prog.total,remaining:Math.max(0,limit-prog.total),pointsPerPiece:points,
   recordedPoints:prog.list.reduce((n,e)=>n+Number(e?.pointsTotal||0),0),entries:prog.list.length,
   source:'travetaBaixasV9520',meaning:'registro operacional, não pagamento'};
}
function ensurePanel(){
 // Operação fica como uma seção normal dos envios, depois dos relatórios,
 // sem duplicar a lista de facções no início da página.
 const page=document.getElementById('faccoes');
 if(!page)return null;
 let panel=document.getElementById('hlgbFactionOpsPanel9520');
 if(!panel){
  panel=document.createElement('section');panel.id='hlgbFactionOpsPanel9520';panel.className='panel';
  panel.style.cssText='margin:14px 0;padding:14px';
  panel.innerHTML='<h2 style="margin-top:0">Alterar envios já feitos</h2>'+
   '<div class="sub">Trocar a facção, ajustar o valor por peça ou registrar travetada. Os registros e pagamentos anteriores são preservados.</div>'+
   '<div class="field" style="margin-top:12px"><label>Localizar modelo, facção ou OP</label>'+
   '<input id="hlgbFactionOpsSearch9520" placeholder="Digite o nome do modelo ou a facção" autocomplete="off"></div>'+
   '<div id="hlgbFactionOpsRows9520" style="margin-top:10px"></div>'+
   '<div class="sub">v95.29 · ajustes confirmados pelo servidor. Transferências com materiais já vinculados exigem conferência antes da mudança.</div>';
  panel.querySelector('#hlgbFactionOpsSearch9520')?.addEventListener('input',renderRows);
  panel.addEventListener('click',e=>{
   const b=e.target?.closest?.('button[data-hlgb-faction-action]');if(!b)return;
   const id=b.getAttribute('data-id'),action=b.getAttribute('data-hlgb-faction-action');
   if(action==='transfer'||action==='price')openTransfer(id,action);
   if(action==='traveta')openTraveta(id);
  });
 }
 // Recoloca mesmo quando a página do Safari é reconstruída.
 if(panel.parentElement!==page||panel!==page.lastElementChild)page.appendChild(panel);
 return panel;
}
function renderRows(){
 const el=document.getElementById('hlgbFactionOpsRows9520');if(!el)return;
 const query=sid(document.getElementById('hlgbFactionOpsSearch9520')?.value).toLocaleLowerCase('pt-BR').trim();
 if(!query){el.innerHTML='<div class="sub">Digite um modelo para localizar o envio e escolher a alteração.</div>';return}
 const rows=arr('factions').filter(f=>[f.name,f.op,f.description,f.product,modelName(f)].some(v=>sid(v).toLocaleLowerCase('pt-BR').includes(query)))
  .slice().sort((a,b)=>sid(a.name).localeCompare(sid(b.name),'pt-BR')).slice(0,60);
 el.innerHTML=rows.length?'<div style="overflow-x:auto"><table><thead><tr><th>Modelo / OP</th><th>Facção</th><th>Peças</th><th>Preço atual</th><th>Ações</th></tr></thead><tbody>'+
 rows.map(f=>'<tr><td><b>'+esc(modelName(f))+'</b><div class="sub">'+esc(f.op||'-')+'</div></td>'+
   '<td>'+esc(f.name||'-')+'</td><td>'+fmt(f.sent)+'</td><td>'+cash(f.price)+'/peça</td>'+
   '<td><div class="toolbar" style="gap:5px;flex-wrap:wrap">'+
   '<button type="button" class="secondary" data-hlgb-faction-action="transfer" data-id="'+esc(f.id)+'">Trocar facção</button>'+
   '<button type="button" class="secondary" data-hlgb-faction-action="price" data-id="'+esc(f.id)+'">Alterar preço</button>'+
   '<button type="button" class="secondary" data-hlgb-faction-action="traveta" data-id="'+esc(f.id)+'">Travetada</button>'+
   '</div></td></tr>').join('')+'</tbody></table></div>':
   '<div class="empty">Nenhum envio encontrado para esta busca.</div>';
}
function openTransfer(id,action='transfer'){
 const f=faction(id);if(!f)return alert('Alocação não localizada.');
 const fn=window.hlgbFactionAdjust9514?.open;
 if(typeof fn!=='function')return alert('A proteção de alteração não carregou. Reabra o sistema antes de mudar a facção ou preço.');
 fn(id,action);
}
function openTraveta(id){
 if(state.busy)return;
 const f=faction(id);if(!f)return alert('Alocação não localizada.');
 let st;try{st=status(f)}catch(e){return alert('Não é possível conferir travetadas: '+sid(e.message))}
 if(!Number.isInteger(st.pointsPerPiece)||st.pointsPerPiece<=0)return alert('Cadastre primeiro a quantidade de travetadas por peça na ficha do produto "'+st.model+'".');
 if(st.remaining<=0)return alert('Não há quantidade elegível pendente de travetada nesta alocação. Confira o total produzido/retornado e o histórico existente.');
 state.activeId=sid(id);state.requestId='';
 const body='<div class="panel" style="background:#fff8fb"><b>'+esc(st.model)+'</b><div>'+esc(st.faction)+' · '+fmt(st.sent)+' enviadas · '+fmt(st.eligible)+' produzidas/retornadas</div>'+
  '<div class="sub">Sem considerar baixas anteriores à implantação desta função: '+fmt(st.done)+' peça(s) já registradas aqui.</div></div>'+
  '<div class="grid"><div class="field"><label>Peças travetadas agora</label><input id="hlgbTravetaQty9520" type="number" min="1" step="1" max="'+st.remaining+'" value="'+st.remaining+'"></div>'+
  '<div class="field"><label>Pontos de traveta por peça</label><input type="number" value="'+st.pointsPerPiece+'" disabled></div></div>'+
  '<div class="sub">Disponíveis para baixa nesta alocação: '+fmt(st.remaining)+' peça(s). Cada baixa registra a pessoa, data e os pontos correspondentes. Não é baixa financeira, não altera pagamento nem estoque.</div>'+
  '<div class="field"><label>Observação (opcional)</label><textarea id="hlgbTravetaNote9520" rows="2" maxlength="250" placeholder="Ex.: travetadas conferidas no lote de cuecas"></textarea></div>'+
  '<div id="hlgbTravetaError9520" role="alert" style="color:#9b2b43;margin:8px 0"></div>'+
  '<button type="button" class="primary modalSave" id="hlgbTravetaSubmit9520">☁️ Confirmar baixa da travetada</button>';
 if(typeof window.openModal!=='function')return alert('A janela do HLGB ainda não carregou.');
 window.openModal('✓ Baixa operacional de travetada',body,submitTraveta);
}
function showError(message){
 state.lastError=sid(message).slice(0,340);
 const el=document.getElementById('hlgbTravetaError9520');if(el)el.textContent=state.lastError;
}
async function submitTraveta(){
 if(state.busy)return false;
 const current=faction(state.activeId);
 if(!current)return showError('Modelo não encontrado; reabra a tela.'),false;
 const prod=product(current.productId);if(!prod)return showError('Produto do modelo não localizado; confira o cadastro.'),false;
 const requested=int(document.getElementById('hlgbTravetaQty9520')?.value);
 const note=sid(document.getElementById('hlgbTravetaNote9520')?.value).trim().slice(0,250);
 if(!Number.isInteger(requested)||requested<=0)return showError('Informe quantidade inteira maior que zero.'),false;
 try{
  const st=status(current);
  if(requested>st.remaining)throw new Error('Quantidade excede o saldo elegível ('+st.remaining+').');
  requireReady();
  state.busy=true;showError('');
  const btn=document.getElementById('hlgbTravetaSubmit9520');if(btn){btn.disabled=true;btn.textContent='☁️ Conferindo…'}
  await assertNoPending(current,prod);
  if(typeof window.cloudEnsureFreshSession==='function')await window.cloudEnsureFreshSession(false);
  const [remoteFac,remoteProd]=await Promise.all([remote('factions',current.id),remote('products',prod.id)]);
  if(!sameOperationalFields(current,remoteFac))throw new Error('A alocação mudou na nuvem. Reabra para evitar baixa sobre dados antigos.');
  if(int(remoteProd.data?.travetadas||0)!==int(prod.travetadas||0))throw new Error('A ficha técnica de travetada mudou na nuvem. Atualize antes de continuar.');
  const latest=status(remoteFac.data),h=histories(remoteFac.data);
  if(latest.done>latest.eligible)throw new Error('Histórico de travetada excedeu a capacidade; bloqueado.');
  if(!state.requestId)state.requestId=window.crypto?.randomUUID?.()||'';
  if(!state.requestId)throw new Error('Identificador seguro de baixa indisponível.');
  const matchingEvent=h.list.find(e=>sid(e.requestId)===state.requestId)||null;
  let isDuplicate=!!matchingEvent;
  if(isDuplicate&&Number(matchingEvent.quantity)!==requested)throw new Error('Esta baixa já foi registrada com outra quantidade. Confira o histórico.');
  if(!isDuplicate&&latest.remaining<requested)throw new Error('Saldo de travetada na nuvem insuficiente.');
  const event={requestId:state.requestId,quantity:requested,pointsPerPiece:latest.pointsPerPiece,
   pointsTotal:requested*latest.pointsPerPiece,by:sid(window.cloudUser?.email||''),at:new Date().toISOString(),note};
  if(!isDuplicate){
   // Repete verificação de quantidade na versão REMOTA; não altera nome, preço, pagamento ou entrega.
   const updated={...remoteFac.data,travetaBaixasV9520:[...h.list,event],travetaDonePiecesV9520:h.total+requested,
     travetaLastAtV9520:event.at,updatedAt:event.at};
   if(btn)btn.textContent='☁️ Salvando baixa…';
   const body={p_module:'factions',p_entity_id:sid(current.id),p_data:updated,
     p_expected_revision:int(remoteFac.revision),p_deleted:false};
   const response=await window.cloudRequest('rpc/hlgb_save_record',{method:'POST',
     headers:{Prefer:'return=representation'},body:JSON.stringify(body)});
   const saved=Array.isArray(response)?response[0]:response;
   if(saved?.applied!==true)throw new Error('Baixa não confirmada na revisão atual. Atualize e confira o histórico; não repita cegamente.');
  }
  const check=await remote('factions',current.id),hh=histories(check.data);
  const recorded=hh.list.find(e=>sid(e.requestId)===state.requestId);
  if(!recorded||Number(recorded.quantity)!==requested||
     Number(recorded.pointsPerPiece)!==latest.pointsPerPiece||
     Number(recorded.pointsTotal)!==requested*latest.pointsPerPiece||
     hh.total<(isDuplicate?h.total:h.total+requested))
   throw new Error('Nuvem não comprovou quantidade e pontos desta baixa. Confira o histórico antes de tentar novamente.');
  if(!sameOperationalFields(current,check))throw new Error('A baixa foi registrada, mas houve outra alteração da facção. Atualize a tela.');
  if(!isDuplicate&&Number(check.revision)<=Number(remoteFac.revision))
    throw new Error('Revisão não avançou após a baixa. Confira a operação.');
  syncConfirmedSnapshot9521('factions',check);
  const xs=arr('factions'),i=xs.findIndex(x=>sid(x.id)===sid(current.id));if(i>=0)xs[i]=check.data;
  try{window.localSaveOnly?.()}catch(_){}
  state.lastConfirmed={id:sid(current.id),requestId:state.requestId,quantity:requested,points:requested*latest.pointsPerPiece,revision:check.revision};
  state.lastReadAt=new Date().toISOString();state.requestId='';
  try{window.closeModal?.()}catch(_){}
  renderRows();
  try{window.renderFactions?.()}catch(_){}
  alert('✅ Baixa de travetada confirmada na nuvem: '+requested+' peça(s), '+(requested*latest.pointsPerPiece)+' pontos. Pagamentos não foram alterados.');
  return true;
 }catch(e){
  showError((e?.message||e)+' Se a conexão caiu após salvar, confira o histórico antes de tentar novamente.');
  console.warn('[HLGB v95.20] baixa de travetada não comprovada',e);
  return false;
 }finally{
  state.busy=false;const btn=document.getElementById('hlgbTravetaSubmit9520');
  if(btn){btn.disabled=false;btn.textContent='☁️ Confirmar baixa da travetada'}
 }
}
function install(){
 const old=window.renderFactions;
 if(typeof old==='function'&&!old.__hlgbFactionOps9520){
  const wrapper=function(){const r=old.apply(this,arguments);setTimeout(()=>{ensurePanel();renderRows()},0);return r};
  wrapper.__hlgbFactionOps9520=true;wrapper.__original=old;window.renderFactions=wrapper;wrapped=wrapper;
 }
 ensurePanel();renderRows();installed=true;
}
window.hlgbFactionOperations9520={version:V,install,render:renderRows,openTransfer,openTraveta,submitTraveta,
 status:id=>status(faction(id)),meta:()=>({...state,installed}),_test:{histories,capacity,hasPending,sameOperationalFields}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
try{window.hlgbAfterLogin?.(()=>setTimeout(install,400),0)}catch(_){}
setTimeout(install,1800);setTimeout(install,3500);
})();