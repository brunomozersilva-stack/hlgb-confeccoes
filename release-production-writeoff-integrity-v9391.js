/* HLGB v93.91 — autoridade única de integridade da baixa operacional */
(function(){
'use strict';
const V='93.91';
if(window.hlgbWriteoffIntegrity9391)return;
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const arr=n=>{try{return Array.isArray(window.db?.[n])?window.db[n]:[]}catch(_){return[]}};
const core=()=>window.hlgbOperationalVisibility9385||window.hlgbOperationalVisibility9384||null;
const finalApi=()=>window.hlgbOperationalVisibility9386||null;
const order=id=>arr('orders').find(x=>sid(x.id)===sid(id))||null;
const cut=id=>arr('cuts').find(x=>sid(x.id)===sid(id))||null;
const production=id=>arr('production').find(x=>sid(x.id)===sid(id))||null;
const product=id=>arr('products').find(x=>sid(x.id)===sid(id))||null;
function gradeRows(raw){return Array.isArray(raw)?raw.filter(r=>r&&typeof r==='object'):[]}
function orderQty(orderId,productId){const o=order(orderId);if(!o)return 0;return gradeRows(o.grade).reduce((s,r)=>sid(r.productId)===sid(productId)?s+q(r.qty??r.quantity??r.value):s,0)}
function pairKey(x){return sid(x?.orderId)+'|'+sid(x?.productId||'*')}
function addPair(map,orderId,productId){const o=sid(orderId),p=sid(productId||'*')||'*';if(o)map.set(o+'|'+p,{orderId:o,productId:p})}
function sourcePair(r,defaultProduct){const type=sid(r?.type),id=sid(r?.id);let src=null;if(type==='cut')src=cut(id);else if(type==='production')src=production(id);else if(type==='order')src=order(id);return{orderId:sid(r?.orderId||src?.orderId||(type==='order'?id:'')),productId:sid(r?.productId||src?.productId||defaultProduct||'')}}
function pairsFrom(w){const map=new Map();for(const x of Array.isArray(w?.orderProductRefs)?w.orderProductRefs:[])addPair(map,x?.orderId,x?.productId||w?.productId);for(const r of Array.isArray(w?.sourceRefs)?w.sourceRefs:[]){const x=sourcePair(r,w?.productId);addPair(map,x.orderId,x.productId||w?.productId||'*')}if(!map.size){try{for(const x of finalApi()?.writeoffPairs?.(w)||[])addPair(map,x.orderId,x.productId)}catch(_){}}return[...map.values()]}
function pairIndex(){const s=new Set();for(const w of arr('operationalWriteoffs'))for(const x of pairsFrom(w))s.add(pairKey(x));return s}
function pairDone(x,index){const s=index||pairIndex();return s.has(pairKey(x))||s.has(sid(x?.orderId)+'|*')}
function modelPairs(m){return pairsFrom({sourceType:'model',sourceRefs:m?.sourceRefs,orderProductRefs:m?.orderProductRefs,productId:m?.productId,clientName:m?.clientName,quantity:m?.qty})}
function splitChildFor(pair){
 return arr('cuts').find(c=>c?.modelSplitChildV1===true&&sid(c.orderId)===sid(pair.orderId)&&sid(c.productId)===sid(pair.productId))||null;
}
function pairEligible(pair){
 const child=splitChildFor(pair);
 // Modelo de pedido desmembrado só fica disponível para baixa após finalizar o corte.
 return !child||sid(child.status).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()==='finalizado';
}
function quantityForPair(pair){
 const child=splitChildFor(pair);
 if(child){
  const grade=Array.isArray(child.actualCutGrade)&&child.actualCutGrade.length?child.actualCutGrade:null;
  if(grade)return grade.filter(g=>!g.productId||sid(g.productId)===sid(pair.productId)).reduce((sum,g)=>sum+q(g.qty),0);
  return q(child.pieces);
 }
 return orderQty(pair.orderId,pair.productId);
}
function pendingModels(){
 const c=core(),base=typeof c?.writeoffModels==='function'?c.writeoffModels():[],done=pairIndex(),out=[],seen=new Set();
 for(const m of base){
  const pairs=modelPairs(m);
  // Nunca misturar a baixa de dois pedidos que tenham o mesmo modelo/cliente.
  for(const pair of pairs){
   const key=pairKey(pair);
   if(seen.has(key)||pairDone(pair,done)||!pairEligible(pair))continue;
   seen.add(key);
   const count=quantityForPair(pair);
   if(count<=0)continue;
   const child=splitChildFor(pair),o=order(pair.orderId);
   out.push({...m,id:'modelo-pedido-'+key,qty:count,productId:pair.productId,
    productName:product(pair.productId)?.name||m.productName||'Modelo',
    clientName:o?.client||m.clientName||'',status:child?.status||m.status,
    sourceRefs:refsForPair(m,pair),orderProductRefs:[pair]});
  }
 }
 return out;
}
function refsForPair(m,pair){const refs=[];for(const r of Array.isArray(m?.sourceRefs)?m.sourceRefs:[]){const x=sourcePair(r,m?.productId);if(sid(x.orderId)===sid(pair.orderId)&&(!x.productId||x.productId===sid(pair.productId)))refs.push({...r,productId:r?.productId||pair.productId})}return refs}
function stableId(pair){const raw=sid(pair?.orderId)+'\u001f'+sid(pair?.productId||'*');let encoded='';try{encoded=btoa(unescape(encodeURIComponent(raw))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}catch(_){encoded=raw.replace(/[^a-zA-Z0-9_-]+/g,'_')}return'baixa-op-v1-'+encoded}
function recordCoversPair(row,pair){return pairsFrom(row).some(x=>sid(x.orderId)===sid(pair.orderId)&&(sid(x.productId)===sid(pair.productId)||sid(x.productId)==='*'))}
function upsertLocal(row){const a=arr('operationalWriteoffs'),i=a.findIndex(x=>sid(x.id)===sid(row?.id));if(i>=0)a[i]=row;else a.push(row)}
function touchesPair(op,pair){
 if(!op||typeof op!=='object')return false;
 const mod=sid(op.module),id=sid(op.id||op.entity_id),
  data=op.data||op.value||op.record||{},child=splitChildFor(pair);
 if(mod==='orders'&&id===sid(pair.orderId))return true;
 if(mod==='cuts'&&child&&id===sid(child.id))return true;
 if(mod==='production'&&sid(data.orderId)===sid(pair.orderId)&&sid(data.productId)===sid(pair.productId))return true;
 if(mod==='operationalWriteoffs'&&(id===stableId(pair)||recordCoversPair(data,pair)))return true;
 return false;
}
function idbPending(){
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined')return reject(new Error('IndexedDB indisponível para conferir baixas pendentes.'));
  let req,aborted=false;
  try{req=indexedDB.open('hlgb_durable_wal')}catch(e){reject(e);return}
  req.onupgradeneeded=()=>{aborted=true;try{req.transaction.abort()}catch(_){}};
  req.onerror=()=>reject(new Error(aborted?'WAL não inicializada':'Falha ao ler a WAL de baixas.'));
  req.onsuccess=()=>{
   const handle=req.result;
   if(!handle.objectStoreNames.contains('entries')){handle.close();reject(new Error('Estrutura da WAL não reconhecida.'));return}
   try{
    const tx=handle.transaction('entries','readonly'),query=tx.objectStore('entries').getAll();
    query.onsuccess=()=>resolve(Array.isArray(query.result)?query.result:[]);
    query.onerror=()=>reject(new Error('Leitura IndexedDB falhou'));
    tx.oncomplete=()=>handle.close();
    tx.onerror=()=>reject(new Error('Transação WAL falhou'));
   }catch(e){try{handle.close()}catch(_){}reject(e)}
  };
 });
}
async function assertNoPendingPair(pair){
 let wal,normal;
 try{wal=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||'null')}
 catch(_){throw new Error('WAL local ilegível: baixa bloqueada para proteger alterações.')}
 if(wal!==null&&(!wal.entries||typeof wal.entries!=='object'))throw new Error('WAL local incompleta: baixa bloqueada.');
 if(Object.values(wal?.entries||{}).some(op=>touchesPair(op,pair)))
  throw new Error('Existem alterações pendentes deste pedido/modelo no navegador. Não foi feita baixa.');
 try{normal=JSON.parse(localStorage.getItem('hlgb_records_pending_v91')||'null')}
 catch(_){throw new Error('Fila normalizada ilegível: baixa bloqueada.')}
 for(const [module,entries] of Object.entries(normal?.modules||{})){
  if(!Array.isArray(entries))throw new Error('Fila normalizada inválida: baixa bloqueada.');
  if(entries.some(x=>touchesPair({module,id:x.id,data:x.data||x.value||x.record},pair)))
   throw new Error('Há uma gravação local pendente deste pedido/modelo. A baixa foi bloqueada.');
 }
 const idb=await idbPending();
 if(idb.some(op=>touchesPair(op,pair)))throw new Error('IndexedDB contém alterações pendentes deste pedido/modelo. Não foi feita baixa.');
}
async function remoteWriteoffRecords(){
 if(typeof window.cloudRequest!=='function')throw new Error('Consulta autenticada indisponível.');
 const data=await window.cloudRequest('hlgb_records?select=module,entity_id,data,revision,deleted_at&module=eq.operationalWriteoffs&deleted_at=is.null&limit=500',{method:'GET'});
 if(!Array.isArray(data)||data.length>=500)throw new Error('Não foi possível conferir todas as baixas ativas na nuvem.');
 return data.filter(r=>!r.deleted_at&&sid(r.module)==='operationalWriteoffs');
}
async function officialSave(row,pair){
 if(window.__HLGB_AUTH_READY!==true||navigator.onLine===false)
  throw new Error('É necessário estar autenticado e online para dar baixa.');
 if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação oficial indisponível.');
 await assertNoPendingPair(pair);
 if(typeof window.cloudEnsureFreshSession==='function')await window.cloudEnsureFreshSession(false);
 const before=await remoteWriteoffRecords();
 const already=before.find(rec=>recordCoversPair(rec.data,pair));
 if(already){upsertLocal(already.data);return already.data}
 const out=await window.hlgbRecordSaveWithRetry('operationalWriteoffs',sid(row.id),row,false);
 if(out?.applied!==true)throw new Error(out?.reason||'A nuvem não confirmou a baixa.');
 const after=await window.cloudRequest('hlgb_records?select=module,entity_id,data,revision,deleted_at&module=eq.operationalWriteoffs&entity_id=eq.'+encodeURIComponent(sid(row.id))+'&limit=1',{method:'GET'});
 const receipt=Array.isArray(after)?after.find(rec=>sid(rec.entity_id)===sid(row.id)&&!rec.deleted_at):null;
 if(!receipt||!recordCoversPair(receipt.data,pair)||Number(receipt.revision)<1)
  throw new Error('Baixa enviada, mas ainda sem prova de leitura na nuvem. Não repita a operação; atualize a conferência.');
 upsertLocal(receipt.data);return receipt.data;
}
function userLabel(){try{const u=typeof window.currentUser==='function'?window.currentUser():null;return sid(u?.name||u?.login||window.cloudUser?.email||window.currentUser?.email||'Usuário HLGB')}catch(_){return'Usuário HLGB'}}
function historyMeta(){const counts=new Map();for(const w of arr('operationalWriteoffs'))for(const p of pairsFrom(w))counts.set(pairKey(p),(counts.get(pairKey(p))||0)+1);return{counts,duplicates:[...counts].filter(([,n])=>n>1).length}}
function render(){const h=document.getElementById('darBaixa9378Host');if(!h)return;const rows=pendingModels().map(m=>'<tr><td><input class="hlgb9391-writeoff" type="checkbox" value="'+esc(m.id)+'"></td><td><b>'+esc(m.productName)+'</b><div class="sub">'+esc(m.clientName)+' · '+(m.orderProductRefs||[]).map(x=>'Pedido #'+esc(order(x.orderId)?.orderNumber||x.orderId)).join(' · ')+'</div></td><td>'+q(m.qty)+'</td><td>'+esc(m.status||'')+'</td><td>'+((m.orderProductRefs||[]).length||0)+' pedido/modelo pendente(s)</td></tr>').join('');const meta=historyMeta();const hist=arr('operationalWriteoffs').slice().sort((a,b)=>sid(b.createdAt).localeCompare(sid(a.createdAt))).slice(0,100).map(x=>{const dup=pairsFrom(x).some(p=>(meta.counts.get(pairKey(p))||0)>1);return'<tr><td>'+esc(x.date||'')+'</td><td>'+esc(x.productName||'')+(dup?' <span title="Registro antigo repetido">⚠️</span>':'')+'</td><td>'+q(x.quantity)+'</td><td>'+esc(x.reason||'')+'</td><td>'+esc(x.user||'')+'</td></tr>'}).join('');h.innerHTML='<div class="panel"><div class="toolbar"><button class="primary" onclick="hlgbWriteoffSelected9385()">✅ Dar baixa nos selecionados</button></div><div class="sub">Baixa operacional por pedido + modelo (não é baixa de estoque nem pagamento). A quantidade vem da grade efetivamente cortada; modelos com corte ainda planejado ficam fora da lista.</div><div style="overflow:auto"><table><thead><tr><th></th><th>Modelo / cliente</th><th>Qtd.</th><th>Status</th><th>Pendência</th></tr></thead><tbody>'+(rows||'<tr><td colspan="5" class="empty">Nenhuma pendência operacional.</td></tr>')+'</tbody></table></div></div><div class="panel"><h3>Histórico de baixas</h3>'+(meta.duplicates?'<div class="sub">⚠️ Há '+meta.duplicates+' pedido/modelo com registro antigo repetido. Eles foram preservados e não serão reenviados.</div>':'')+'<table><thead><tr><th>Data</th><th>Modelo</th><th>Qtd.</th><th>Motivo</th><th>Usuário</th></tr></thead><tbody>'+(hist||'<tr><td colspan="5" class="empty">Nenhuma baixa registrada.</td></tr>')+'</tbody></table></div>'}
async function writeoffSelected(){const ids=[...document.querySelectorAll('.hlgb9391-writeoff:checked')].map(x=>x.value),sel=pendingModels().filter(x=>ids.includes(sid(x.id)));if(!sel.length)return alert('Selecione pelo menos um modelo pendente.');if(typeof window.openModal!=='function')return alert('Janela de baixa indisponível.');window.openModal('Dar baixa em '+sel.length+' modelo(s)','<div class="field"><label>Motivo</label><select id="w9391reason"><option>Já pago</option><option>Produção antiga</option><option>Regularização do período sem sistema</option><option>Outro</option></select></div><div class="field"><label>Observação</label><textarea id="w9391note"></textarea></div><div class="sub">A baixa operacional retira somente este pedido/modelo das pendências de produção, corte e projeção. Não altera estoque de matéria-prima, faturamento nem pagamentos. Confirme apenas se esse modelo deve sair das pendências.</div><button class="primary modalSave">☁️ Confirmar baixa do modelo</button>',async()=>{try{const reason=document.getElementById('w9391reason')?.value||'Outro',note=document.getElementById('w9391note')?.value||'';for(const m of sel){const pairs=modelPairs(m),pending=pairs.filter(x=>!pairDone(x)&&pairEligible(x));if(!pairs.length)throw new Error('Não foi possível identificar o pedido + modelo de '+sid(m.productName||'um item')+'. A baixa foi interrompida sem criar registro ambíguo.');for(const pair of pending){if(pairDone(pair))continue;const qty=quantityForPair(pair),now=new Date().toISOString();if(qty<=0)throw new Error('Quantidade efetiva do corte inválida. Nenhuma baixa foi enviada.');const row={id:stableId(pair),sourceType:'model',sourceId:sid(m.id),sourceRefs:refsForPair(m,pair),orderProductRefs:[pair],productId:pair.productId,productName:m.productName||product(pair.productId)?.name||'',clientName:m.clientName||'',quantity:qty,reason,note,user:userLabel(),date:now.slice(0,10),createdAt:now,writeoffVersion:V,writeoffKey:pairKey(pair)};await officialSave(row,pair)}}window.closeModal?.();render();try{window.hlgbOperationalVisibility9386?.refresh?.()}catch(e){console.warn('[HLGB baixa] atualização visual',e)}}catch(e){console.error('[HLGB v93.91] baixa',e);render();alert(e.message||e)}})}
function showWriteoffForSplit(cutId){
 const c=cut(cutId);
 if(!c||!c.modelSplitChildV1||!pairEligible({orderId:sid(c.orderId),productId:sid(c.productId)})){
  alert('Este modelo ainda não possui corte finalizado para dar baixa.');return false;
 }
 const pair={orderId:sid(c.orderId),productId:sid(c.productId)};
 const nav=document.getElementById('hlgbDarBaixaNav9378');
 if(nav)nav.click();
 else{
  document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));
  document.getElementById('darBaixa9378')?.classList.add('active');
 }
 render();
 const m=pendingModels().find(x=>(x.orderProductRefs||[]).some(ref=>pairKey(ref)===pairKey(pair)));
 if(!m){alert('Este modelo já pode ter baixa confirmada ou os registros ainda não estão carregados. Confira o histórico da baixa.');return false}
 const cb=[...document.querySelectorAll('.hlgb9391-writeoff')].find(x=>sid(x.value)===sid(m.id));
 if(!cb){alert('Não foi possível localizar a baixa deste modelo nesta tela.');return false}
 cb.checked=true;try{cb.scrollIntoView({block:'center',behavior:'smooth'})}catch(_){}
 return true;
}
window.hlgbShowWriteoffForSplit=showWriteoffForSplit;
function install(){window.hlgbWriteoffSelected9385=writeoffSelected;window.hlgbWriteoffSelected9384=writeoffSelected;window.hlgbWriteoffSelected9378=writeoffSelected;window.hlgbRenderWriteoffs9385=render;window.HLGB_OPERATIONAL_WRITEOFF_AUTHORITY='93.91';const d=document.getElementById('hlgbDarBaixaNav9378');if(d)d.onclick=()=>{document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.getElementById('darBaixa9378')?.classList.add('active');render()};if(document.getElementById('darBaixa9378')?.classList.contains('active'))render()}
function diagnostics(){const meta=historyMeta();return{version:V,authority:window.HLGB_OPERATIONAL_WRITEOFF_AUTHORITY,writeoffs:arr('operationalWriteoffs').length,duplicatePairs:meta.duplicates,pendingModels:pendingModels().length}}
window.hlgbWriteoffIntegrity9391={version:V,pairsFrom,pairIndex,pendingModels,stableId,recordCoversPair,render,install,diagnostics,showWriteoffForSplit,_test:{splitChildFor,pairEligible,quantityForPair,modelPairs,touchesPair}};
install();
/* O módulo legado v93.79 cria o botão de baixa em boot tardio (900/1900 ms).
   Reinstalamos apenas o handler da própria baixa depois desses dois pontos; sem loop, observer ou render amplo. */
try{if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>{install();setTimeout(install,1200)},0)}catch(_){}
setTimeout(install,2200);
console.info('[HLGB] v'+V+' autoridade de integridade da baixa ativa');
})();
