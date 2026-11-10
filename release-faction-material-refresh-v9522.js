/* HLGB v95.22 — atualizacao segura de materiais de envios ja criados.
 * Original continua imutavel ate usuario confirmar e RPC responder com readback.
 * As baixas/conferencias ja feitas nunca sao redefinidas automaticamente.
 */
(function(){
'use strict';
if(window.hlgbFactionMaterialRefresh9522)return;
const V='95.22',M='materialChecklists',WAL_DB='hlgb_durable_wal';
const state={version:V,lastError:'',lastSuccess:null,busy:false,installed:false,guardedPrints:0};
const sid=v=>String(v??''),qty=v=>Number(v)||0,
 esc=v=>sid(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-BR');
const clone=v=>JSON.parse(JSON.stringify(v));
const fmt=v=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:4});
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.db||{}}
function rows(module){const r=dbRef()[module];return Array.isArray(r)?r:[]}
function lookup(id){return rows(M).find(x=>sid(x?.id)===sid(id))||null}
function product(id){return rows('products').find(x=>sid(x?.id)===sid(id))||null}
function materialKey(m){const id=sid(m?.materialId);return id?'id:'+id:'name:'+norm(m?.name)+'|'+norm(m?.unit)}
function buildMaterials(productRow,pieces){
 if(!productRow||!Array.isArray(productRow.materials))return null;
 const amount=Number(pieces);
 if(!Number.isFinite(amount)||amount<=0)throw new Error('Quantidade de peças inválida para o envio.');
 const byKey=new Map();
 for(const m of productRow.materials){
  const per=Number(m?.qty),loss=Number(m?.loss||0);
  if(!Number.isFinite(per)||per<0||!Number.isFinite(loss)||loss<0)throw new Error('Ficha técnica com consumo ou perda inválido. Corrija o produto.');
  const mode=sid(m?.calcMode||'consumption');
  if(mode!=='consumption'&&mode!=='yield')throw new Error('Modo de cálculo de material desconhecido.');
  if(per<=0)continue;
  const name=sid(m?.name).trim(),unit=sid(m?.unit).trim();
  if(!name||!unit)throw new Error('Material com nome ou unidade ausente na ficha.');
  const need=(mode==='yield'?amount/per:amount*per)*(1+loss/100);
  if(!Number.isFinite(need)||need<0)throw new Error('Resultado de consumo inválido.');
  const k=materialKey(m),cur=byKey.get(k);
  if(cur&&norm(cur.unit)!==norm(unit))throw new Error('Mesmo material cadastrado com unidades diferentes.');
  if(cur){cur.qty+=need;continue}
  byKey.set(k,{id:byKey.size+1,materialId:m.materialId??null,name,unit,qty:need,
    checked:false,calcMode:mode,source:'product_technical_sheet_v9522'});
 }
 return [...byKey.values()];
}
function compare(oldRows,newRows){
 const old=Array.isArray(oldRows)?oldRows:[],next=Array.isArray(newRows)?newRows:[];
 const signature=list=>list.map(m=>({key:materialKey(m),name:norm(m.name),unit:norm(m.unit),qty:Number((Number(m.qty)||0).toFixed(6))})).sort((a,b)=>a.key.localeCompare(b.key));
 // Checklists antigos nao continham materialId. Comparacao por nome/unidade evita falsos alertas.
 const comparable=list=>list.map(m=>({name:norm(m.name),unit:norm(m.unit),qty:Number((Number(m.qty)||0).toFixed(6))})).sort((a,b)=>a.name.localeCompare(b.name)||a.unit.localeCompare(b.unit));
 return {different:JSON.stringify(comparable(old))!==JSON.stringify(comparable(next)),
  oldCount:old.length,newCount:next.length,
  oldSignature:signature(old),newSignature:signature(next)};
}
function analyze(c){
 const p=product(c?.productId);
 if(!c||!p||!Array.isArray(p.materials))return {status:'unavailable',reason:'A ficha técnica do modelo ainda não está carregada.'};
 let material;
 try{material=buildMaterials(p,c.qty)}catch(e){return {status:'error',reason:String(e.message||e)}}
 const diff=compare(c.materials,material);
 const anyChecked=(c.materials||[]).some(m=>m.checked===true);
 const alreadyReceived=!!sid(c.receivedAt).trim()||!!sid(c.receivedBy).trim()||sid(c.status)==='Conferido';
 const locked=anyChecked||alreadyReceived;
 return {...diff,materials:material,product:p,status:diff.different?'stale':'current',
    locked,lockedReason:locked?'Há item conferido ou recebimento registrado; não é seguro substituir automaticamente.':'',
    productName:p.name||c.productName};
}
function htmlRows(materials){
 return '<table><thead><tr><th>Matéria-prima</th><th>Quantidade</th><th>Unidade</th></tr></thead><tbody>'+
 (materials||[]).map(m=>'<tr><td>'+esc(m.name)+'</td><td>'+fmt(m.qty)+'</td><td>'+esc(m.unit)+'</td></tr>').join('')+
 '</tbody></table>';
}
function ensurePanel(){
 const target=document.getElementById('destinationChecklistTable');
 if(!target)return;
 let panel=document.getElementById('hlgbMaterialRevisions9522');
 if(!panel){
  panel=document.createElement('section');panel.id='hlgbMaterialRevisions9522';
  panel.className='panel';panel.style.cssText='margin:10px 0;border:1px solid #e9dce4;background:#fffafd';
  target.insertAdjacentElement('beforebegin',panel);
 }
 const stale=rows(M).map(c=>({c,check:analyze(c)})).filter(x=>x.check.status==='stale');
 panel.innerHTML='<h3 style="margin:0 0 6px">📦 Materiais dos envios × ficha técnica atual</h3>'+
  '<div class="sub">Os envios anteriores à atualização da ficha não são substituídos silenciosamente. Confira antes de separar ou imprimir.</div>'+
  (stale.length?stale.map(({c,check})=>
   '<div style="padding:9px 0;border-bottom:1px solid #ecdfe6"><b>'+esc(check.productName)+'</b> · '+esc(c.destinationName||'Destino')+
   ' · '+fmt(c.qty)+' peça(s) · <b>'+check.oldCount+' material(is) no envio / '+check.newCount+' na ficha</b>'+
   (check.locked?'<div class="sub">⚠️ Conferência existente: revisão manual obrigatória</div>':'')+
   ' <button type="button" class="secondary" data-material-revision9522="'+esc(c.id)+'">Conferir materiais atualizados</button></div>'
  ).join(''):'<div class="sub" style="margin-top:7px">Nenhuma divergência detectada nas fichas carregadas.</div>');
 panel.onclick=e=>{const btn=e.target?.closest?.('[data-material-revision9522]');if(btn)openReview(btn.getAttribute('data-material-revision9522'))};
}
async function getRemote(module,id){
 if(typeof cloudRequest!=='function')throw new Error('A conexão com a nuvem não está disponível.');
 const uri='hlgb_records?select=module,entity_id,revision,updated_at,updated_by,data,deleted_at&module=eq.'+
  encodeURIComponent(module)+'&entity_id=eq.'+encodeURIComponent(sid(id))+'&limit=1';
 const resp=await cloudRequest(uri,{method:'GET'});
 if(!Array.isArray(resp))throw new Error('A nuvem não confirmou a leitura.');
 const rec=resp.find(x=>sid(x.module)===module&&sid(x.entity_id)===sid(id)&&!x.deleted_at);
 if(!rec||!(Number(rec.revision)>0))throw new Error('Registro não encontrado ou sem revisão na nuvem.');
 return rec;
}
function isRelevantPending(op,c){
 const module=sid(op?.module),id=sid(op?.id);
 return (module===M&&id===sid(c.id))||
        (module==='products'&&id===sid(c.productId))||
        (module==='production'&&sid(c.productionId)&&id===sid(c.productionId));
}
async function assertNoPending(c){
 let raw;
 try{raw=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||'null')}catch(e){throw new Error('WAL local ilegível.')}
 if(raw&&!raw.entries)throw new Error('WAL local incompleta.');
 if(Object.values(raw?.entries||{}).some(op=>isRelevantPending(op,c)))throw new Error('Alteração pendente para este envio no armazenamento local.');
 let queue;
 try{queue=JSON.parse(localStorage.getItem('hlgb_records_pending_v91')||'null')}catch(e){throw new Error('Fila de sincronização ilegível.')}
 for(const [module,entries] of Object.entries(queue?.modules||{})){
  if(!Array.isArray(entries))throw new Error('Fila local inválida.');
  if(entries.some(op=>isRelevantPending({...op,module},c)))throw new Error('Sincronização pendente neste envio ou produto.');
 }
 if(typeof indexedDB==='undefined')throw new Error('IndexedDB indisponível para conferir pendências.');
 await new Promise((resolve,reject)=>{
  let req,created=false;
  try{req=indexedDB.open(WAL_DB)}catch(e){reject(new Error('WAL IndexedDB indisponível.'));return}
  req.onupgradeneeded=()=>{created=true;try{req.transaction.abort()}catch(_){}};
  req.onerror=()=>reject(new Error(created?'Diário local não inicializado.':'Falha ao conferir WAL IndexedDB.'));
  req.onsuccess=()=>{
   const database=req.result;
   if(!database.objectStoreNames.contains('entries')){database.close();reject(new Error('Estrutura WAL não localizada.'));return}
   let settled=false;
   const rejectOnce=e=>{if(!settled){settled=true;try{database.close()}catch(_){}reject(e)}};
   try{
    const tx=database.transaction('entries','readonly'),cursor=tx.objectStore('entries').openCursor();
    cursor.onsuccess=()=>{const p=cursor.result;if(p){if(isRelevantPending(p.value,c))return rejectOnce(new Error('Há alteração pendente neste envio no IndexedDB.'));p.continue()}};
    cursor.onerror=()=>rejectOnce(new Error('Não foi possível ler as pendências no IndexedDB.'));
    tx.onerror=()=>rejectOnce(new Error('Leitura do IndexedDB interrompida.'));
    tx.oncomplete=()=>{if(!settled){settled=true;database.close();resolve()}};
   }catch(e){rejectOnce(e)}
  };
 });
}
function syncSnapshot(module,rec){
 const id=sid(rec.entity_id),revision=Number(rec.revision);
 let map=null,lastSeen=null;
 try{if(typeof hlgbRecordSnapshots!=='undefined')map=hlgbRecordSnapshots?.[module]}catch(e){}
 if(!(map instanceof Map))map=window.hlgbRecordSnapshots?.[module];
 if(!(map instanceof Map))throw new Error('Cache de revisão do sistema não disponível. Reabra a tela.');
 const current=map.get(id);
 if(current&&Number(current.revision||0)>revision)throw new Error('Há revisão local mais recente.');
 map.set(id,{module,entity_id:id,data:clone(rec.data),revision,deleted_at:null,updated_at:sid(rec.updated_at),updated_by:rec.updated_by??null});
 try{if(typeof hlgbRecordLastSeen!=='undefined'&&sid(rec.updated_at)>sid(hlgbRecordLastSeen[module]||''))hlgbRecordLastSeen[module]=sid(rec.updated_at)}catch(e){}
}
async function reloadAndSave(id){
 if(state.busy)return false;
 const c=lookup(id),local=analyze(c);
 if(!c||local.status!=='stale')return false;
 if(local.locked)throw new Error('O envio já tem conferência/recebimento. É necessária conciliação manual; nenhuma baixa foi alterada.');
 if(window.__HLGB_AUTH_READY!==true||navigator.onLine===false||typeof cloudRequest!=='function')
  throw new Error('Faça login e conecte-se à nuvem antes de atualizar.');
 state.busy=true;state.lastError='';
 try{
  await assertNoPending(c);
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  const [remoteCheck,remoteProd]=await Promise.all([getRemote(M,id),getRemote('products',c.productId)]);
  const check=remoteCheck.data,prod=remoteProd.data;
  if(sid(check.productId)!==sid(c.productId)||Number(check.qty)!==Number(c.qty)||
   sid(check.destinationName)!==sid(c.destinationName)||sid(check.status)!==sid(c.status))
   throw new Error('O envio mudou na nuvem. Reabra a página antes de prosseguir.');
  if((check.materials||[]).some(m=>m.checked)||sid(check.status)==='Conferido'||check.receivedAt||check.receivedBy)
   throw new Error('A conferência deste envio já foi iniciada. Não é possível substituir os materiais automaticamente.');
  const latest=buildMaterials(prod,check.qty);
  const stillDifferent=compare(check.materials,latest);
  if(!stillDifferent.different)return {alreadyCurrent:true,count:latest.length};
  if(!compare(prod.materials,local.product.materials).different&&Number(remoteProd.revision)>0){
    // A comparação acima é apenas uma pista; nao confundir revisao remota com cache local.
  }
  if(JSON.stringify((local.product.materials||[]).map(x=>[x.materialId,x.name,x.qty,x.unit,x.loss,x.calcMode]))!==
     JSON.stringify((prod.materials||[]).map(x=>[x.materialId,x.name,x.qty,x.unit,x.loss,x.calcMode])))
   throw new Error('A ficha técnica foi alterada em outra sessão. Atualize o navegador antes de confirmar.');
  const payload={...check,materials:latest,materialSheetRevisionV9522:Number(remoteProd.revision),
   materialsRefreshedAtV9522:new Date().toISOString(),materialsSourceV9522:'product_technical_sheet',
   materialsRevisionReasonV9522:'Conferência explícita após atualização da ficha técnica'};
  const out=await cloudRequest('rpc/hlgb_save_record',{method:'POST',headers:{Prefer:'return=representation'},
   body:JSON.stringify({p_module:M,p_entity_id:sid(id),p_data:payload,p_expected_revision:Number(remoteCheck.revision),p_deleted:false})});
  const applied=Array.isArray(out)?out[0]:out;
  if(applied?.applied!==true)throw new Error('Conflito de revisão. Nenhum material local foi substituído.');
  const confirmed=await getRemote(M,id),proof=compare(confirmed.data.materials,latest);
  if(proof.different||Number(confirmed.revision)<=Number(remoteCheck.revision)||
   sid(confirmed.data.materialsSourceV9522)!=='product_technical_sheet')
    throw new Error('O servidor ainda não confirmou os materiais. Confira antes de repetir.');
  syncSnapshot(M,confirmed);
  const dbRow=lookup(id);
  if(dbRow)Object.assign(dbRow,clone(confirmed.data));
  try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){console.warn('[HLGB v95.22] cache local',e)}
  state.lastSuccess={id:sid(id),count:latest.length,revision:confirmed.revision,at:new Date().toISOString()};
  ensurePanel();window.renderDestinationChecklists?.();
  return state.lastSuccess;
 }catch(e){state.lastError=sid(e?.message||e);throw e}
 finally{state.busy=false}
}
function openReview(id){
 const c=lookup(id);if(!c)return alert('Checklist não localizado.');
 const review=analyze(c);
 if(review.status==='error'||review.status==='unavailable')return alert(review.reason);
 if(review.status==='current')return window.__hlgbMaterialOriginalOpen9522?.(id);
 const locked=review.locked;
 const html='<div class="panel" style="background:#fff8fb"><b>'+esc(review.productName)+'</b><div>'+
  esc(c.destinationName)+' · '+fmt(c.qty)+' peça(s)</div>'+
  '<p>'+review.oldCount+' materiais registrados no envio; ficha atual possui <b>'+review.newCount+' materiais</b>.</p>'+
  (locked?'<p style="color:#a33"><b>Conferência já iniciada:</b> revisão manual obrigatória; nada será substituído.</p>':
   '<p>Os novos materiais serão calculados com o rendimento, consumo e perda atuais. A alteração somente será gravada após confirmação na nuvem.</p>')+
  '</div><h3>Materiais na ficha atual</h3>'+htmlRows(review.materials)+
  '<p class="sub">Nenhuma baixa de material, pagamento, estoque ou entrega é realizada por esta atualização.</p>'+
  '<p id="hlgbMaterialRefreshError9522" role="alert" style="color:#a33"></p>'+
  (locked?'':'<button type="button" class="primary" id="hlgbMaterialRefreshConfirm9522">☁️ Atualizar checklist deste envio</button>')+
  ' <button type="button" class="secondary" onclick="closeModal()">Fechar</button>';
 if(typeof openModal!=='function')return alert('Janela do HLGB não está disponível.');
 openModal('📦 Materiais atualizados — conferência do envio',html,()=>{});
 setTimeout(()=>{
  const button=document.getElementById('hlgbMaterialRefreshConfirm9522');
  if(button)button.onclick=async()=>{
   button.disabled=true;button.textContent='☁️ Conferindo e salvando…';
   try{
    const result=await reloadAndSave(id);
    closeModal();alert(result?.alreadyCurrent?'Materiais já estão atualizados.':
      '✅ Checklist atualizado na nuvem: '+result.count+' material(is). Confira antes de separar.');
    window.__hlgbMaterialOriginalOpen9522?.(id);
   }catch(e){
    const el=document.getElementById('hlgbMaterialRefreshError9522');
    if(el)el.textContent=sid(e.message||e)+' Nenhum material foi alterado localmente sem confirmação.';
   }finally{button.disabled=false;button.textContent='☁️ Atualizar checklist deste envio'}
  };
 },40);
}
function install(){
 if(state.installed)return;
 if(typeof window.renderDestinationChecklists!=='function'||typeof window.openMaterialChecklist!=='function')return;
 const previousRender=window.renderDestinationChecklists;
 window.renderDestinationChecklists=function(){const res=previousRender.apply(this,arguments);setTimeout(ensurePanel,0);return res};
 const previousOpen=window.openMaterialChecklist;
 window.__hlgbMaterialOriginalOpen9522=previousOpen;
 window.openMaterialChecklist=function(id){return openReview(id)};
 const oldPrint=window.printMaterialChecklist;
 if(typeof oldPrint==='function')window.printMaterialChecklist=function(id){
  const item=lookup(id),c=item?analyze(item):null;
  if(c?.status==='stale'){
   state.guardedPrints++;
   alert('Este checklist está desatualizado em relação à ficha técnica. Confira os materiais antes de imprimir.');
   return openReview(id);
  }
  return oldPrint.apply(this,arguments);
 };
 const oldCreate=window.hlgb916CreateMaterialChecklist;
 if(typeof oldCreate==='function')window.hlgb916CreateMaterialChecklist=function(prod,dest,unit,service){
  const record=oldCreate.apply(this,arguments),p=product(record.productId);
  if(p&&Array.isArray(p.materials)){
   try{record.materials=buildMaterials(p,record.qty);
    record.materialsSourceV9522='product_technical_sheet';}
   catch(e){console.warn('[HLGB v95.22] ficha nova indisponível',e)}
  }
  return record;
 };
 state.installed=true;setTimeout(ensurePanel,100);
}
window.hlgbFactionMaterialRefresh9522={version:V,state,install,analyze,buildMaterials,compare,openReview,reloadAndSave,ensurePanel,
 test:{materialKey,isRelevantPending}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
try{window.hlgbAfterLogin?.(()=>setTimeout(install,200),0)}catch(e){}
setTimeout(install,1500);
})();