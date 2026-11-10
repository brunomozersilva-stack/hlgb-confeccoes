/* HLGB v95.22 — atualizacao segura de materiais de envios ja criados.
 * Original continua imutavel ate usuario confirmar e RPC responder com readback.
 * As baixas/conferencias ja feitas nunca sao redefinidas automaticamente.
 */
(function(){
'use strict';
if(window.hlgbFactionMaterialRefresh9522)return;
const V='95.32',M='materialChecklists',WAL_DB='hlgb_durable_wal';
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
function gradeRowsForChecklist(c,pieces){
 const target=Math.floor(Number(pieces)),data=dbRef(),pid=sid(c?.productId);
 let rows=[];
 // Usa a mesma grade impressa no cabeçalho do checklist (com corte real prioritário).
 try{
  if(typeof window.hlgbFactionChecklistGrade?.sourceGrade==='function'){
   rows=window.hlgbFactionChecklistGrade.sourceGrade(c)||[];
  }
 }catch(e){console.warn('[HLGB materiais '+V+'] grade oficial',e)}
 if(!rows.length){
  const cut=rowsFor(data,'cuts').find(x=>sid(x?.id)===sid(c?.cutId));
  const order=rowsFor(data,'orders').find(x=>sid(x?.id)===sid(c?.orderId));
  const raw=[c?.gradeV9198,c?.grade,cut?.actualCutGrade,cut?.originalGrade,order?.grade]
   .find(x=>Array.isArray(x)&&x.length)||[];
  rows=raw.filter(x=>!pid||sid(x?.productId||pid)===pid)
   .map(x=>({color:sid(x.color),qty:Number(x.qty)}))
   .filter(x=>Number.isFinite(x.qty)&&x.qty>0);
 }
 if(!rows.length)return [{color:'Total',qty:target}];
 rows=rows.map(x=>({color:sid(x.color||'Total').trim()||'Total',qty:Number(x.qty)}))
  .filter(x=>Number.isFinite(x.qty)&&x.qty>0);
 if(!rows.length)return [{color:'Total',qty:target}];
 const sum=rows.reduce((total,x)=>total+x.qty,0);
 if(sum<=0)return [{color:'Total',qty:target}];
 if(Math.round(sum)!==target){
  const scaled=rows.map((x,i)=>{
   const raw=x.qty*target/sum,qty=Math.floor(raw);
   return {...x,qty,remainder:raw-qty,index:i};
  });
  const left=target-scaled.reduce((total,x)=>total+x.qty,0);
  for(const x of scaled.slice().sort((x,y)=>y.remainder-x.remainder||x.index-y.index).slice(0,left))
   scaled[x.index].qty++;
  rows=scaled.filter(x=>x.qty>0).map(x=>({color:x.color,qty:x.qty}));
 }
 return rows;
}
function rowsFor(data,module){return Array.isArray(data?.[module])?data[module]:[]}
function rollDetails(master,need){
 if(!master)return {rolls:null,rollConversion:0,rollLabel:''};
 let conv=0;
 const unit=norm(master.purchaseUnit),mode=norm(master.purchaseMode),name=norm(master.packageName);
 if((unit.includes('rolo')||mode.includes('rolo'))&&Number(master.purchaseConversion)>0)
  conv=Number(master.purchaseConversion);
 else if(name.includes('rolo')&&Number(master.packageAvg)>0)
  conv=Number(master.packageAvg);
 if(!conv||!Number.isFinite(conv))return {rolls:null,rollConversion:0,rollLabel:''};
 return {rolls:Math.ceil(need/conv-1e-9),rollConversion:conv,rollLabel:'rolo'};
}
function buildMaterials(productRow,pieces,destinationType='F',checklist=null){
 if(!productRow||!Array.isArray(productRow.materials))return null;
 const amount=Number(pieces);
 if(!Number.isInteger(amount)||amount<=0)throw new Error('Quantidade de peças inválida para o envio.');
 const grade=gradeRowsForChecklist({...checklist,productId:checklist?.productId||productRow.id},amount);
 const byColor=new Map();
 for(const row of grade){const color=row.color||'Total';byColor.set(color,(byColor.get(color)||0)+Number(row.qty))}
 if([...byColor.values()].reduce((sum,n)=>sum+n,0)!==amount)
  throw new Error('A grade não corresponde à quantidade do checklist; confira o corte antes de gerar os materiais.');
 const out=[],keyMap=new Map();
 for(const [index,m] of productRow.materials.entries()){
  const master=rows('materials').find(x=>sid(x?.id)===sid(m?.materialId))||
   rows('materials').find(x=>norm(x?.name)===norm(m?.name))||null;
  const visible=destinationType==='F'?(master?.showFactionChecklist??m?.showFactionChecklist)!==false:
   (master?.showProductionChecklist??m?.showProductionChecklist)!==false;
  if(!visible)continue;
  const per=Number(m?.qty),loss=Number(m?.loss||0);
  if(!Number.isFinite(per)||per<0||!Number.isFinite(loss)||loss<0)
   throw new Error('Ficha técnica com consumo ou perda inválido. Corrija o produto.');
  const mode=sid(m?.calcMode||'consumption');
  if(mode!=='consumption'&&mode!=='yield')throw new Error('Modo de cálculo de material desconhecido.');
  const name=sid(m?.name||master?.name).trim(),unit=sid(m?.unit||master?.unit).trim(),
   cat=sid(m?.cat||master?.cat).trim();
  if(!name||!unit)throw new Error('Material com nome ou unidade ausente na ficha.');
  const aviamento=norm(cat).includes('aviamento');
  const splits=aviamento?[...byColor.entries()]:[['Total',amount]];
  for(const [color,count] of splits){
   const raw=per<=0?0:(mode==='yield'?count/per:count*per)*(1+loss/100);
   if(!Number.isFinite(raw)||raw<0)throw new Error('Resultado de consumo inválido.');
   const need=Number(raw.toFixed(6)),materialId=m?.materialId??master?.id??null;
   const key=sid(materialId)+'|'+norm(name)+'|'+norm(unit)+'|'+(aviamento?norm(color):'');
   const entry=keyMap.get(key);
   if(entry){entry.qty=Number((entry.qty+need).toFixed(6));entry.rolls=rollDetails(master,entry.qty).rolls;continue}
   const ri=rollDetails(master,need);
   const row={id:index+1,materialId,name,baseName:name,cat,unit,
    color:aviamento&&color!=='Total'?color:'',pieces:count,qty:need,
    perPiece:per,loss,checked:false,calcMode:mode,source:'product_technical_sheet_v9530',
    rolls:ri.rolls,rollConversion:ri.rollConversion,rollLabel:ri.rollLabel,
    key9199:[materialId||'',name,aviamento&&color!=='Total'?color:''].join('|')};
   row.key9198=row.key9199;
   keyMap.set(key,row);out.push(row);
  }
 }
 return out;
}
function compare(oldRows,newRows){
 const old=Array.isArray(oldRows)?oldRows:[],next=Array.isArray(newRows)?newRows:[];
 const signature=list=>list.map(m=>({key:materialKey(m),name:norm(m.name),unit:norm(m.unit),qty:Number((Number(m.qty)||0).toFixed(6))})).sort((a,b)=>a.key.localeCompare(b.key));
 // Checklists antigos nao continham materialId. Comparacao por nome/unidade evita falsos alertas.
 const comparable=list=>{
  const grouped=new Map();
  for(const m of list){
   const name=norm(m.name),unit=norm(m.unit),key=name+'|'+unit;
   const qty=Number(m.qty||0);
   // Linhas auxiliares com consumo zero não mudam o material efetivamente enviado.
   if(!Number.isFinite(qty)||Math.abs(qty)<1e-9)continue;
   grouped.set(key,{name,unit,qty:(grouped.get(key)?.qty||0)+qty});
  }
  // Aviamentos antigos podem estar divididos por cor; comparar o total agregado
  // evita marcar um checklist conferido como desatualizado quando o consumo e igual.
  return [...grouped.values()].map(m=>({...m,qty:Number(m.qty.toFixed(6))}))
   .sort((a,b)=>a.name.localeCompare(b.name)||a.unit.localeCompare(b.unit));
 };
 const structure=list=>list.map(m=>({
   key:norm(m.name)+'|'+norm(m.unit)+'|'+norm(m.color||'Total'),
   qty:Number((Number(m.qty)||0).toFixed(6))
  })).sort((a,b)=>a.key.localeCompare(b.key)||a.qty-b.qty);
 const detailDifferent=JSON.stringify(structure(old))!==JSON.stringify(structure(next));
 return {different:JSON.stringify(comparable(old))!==JSON.stringify(comparable(next)),
  detailDifferent,oldCount:old.length,newCount:next.length,
  oldSignature:signature(old),newSignature:signature(next)};
}
function analyze(c){
 const p=product(c?.productId);
 if(!c||!p||!Array.isArray(p.materials))return {status:'unavailable',reason:'A ficha técnica do modelo ainda não está carregada.'};
 let material;
 try{material=buildMaterials(p,c.qty,c.destinationType,c)}catch(e){return {status:'error',reason:String(e.message||e)}}
 const diff=compare(c.materials,material);
 const anyChecked=(c.materials||[]).some(m=>m.checked===true);
 const alreadyReceived=!!sid(c.receivedAt).trim()||!!sid(c.receivedBy).trim()||sid(c.status)==='Conferido';
 const locked=anyChecked||alreadyReceived;
 // O wrapper antigo da tela podia criar as linhas por cor só em memória,
 // enquanto o Supabase continuava com as 3 linhas somadas. Exigir prova
 // persistente antes de declarar uma ficha antiga como já separada.
 const unconfirmedLegacy=sid(c.materialsSourceV9522)==='product_technical_sheet'&&
   !sid(c.materialsSourceV9532)&&material.some(m=>!!sid(m.color));
 const detailNeeded=diff.detailDifferent||unconfirmedLegacy;
 return {...diff,detailDifferent:detailNeeded,materials:material,product:p,
    status:diff.different?'stale':detailNeeded?'detail-needed':'current',
    locked,lockedReason:locked?'Há item conferido ou recebimento registrado; não é seguro substituir automaticamente.':'',
    productName:p.name||c.productName};
}
function htmlRows(materials){
 return '<div style="overflow-x:auto"><table><thead><tr><th>Material</th><th>Categoria</th><th>Cor</th><th>Quantidade</th><th>Unidade</th><th>Rolos</th></tr></thead><tbody>'+
 (materials||[]).map(m=>'<tr><td>'+esc(m.name)+'</td><td>'+esc(m.cat||'-')+'</td><td>'+esc(m.color||'Total')+'</td>'+
 '<td>'+fmt(m.qty)+'</td><td>'+esc(m.unit)+'</td><td>'+(m.rolls==null?'-':fmt(m.rolls))+'</td></tr>').join('')+
 '</tbody></table></div>';
}
function ensurePanel(){
 const targets=[
  {table:'destinationChecklistTable',panel:'hlgbMaterialRevisions9522',factionOnly:false},
  {table:'factionChecklistTable9176',panel:'hlgbFactionMaterialRevisions9522',factionOnly:true}
 ];
 for(const target of targets){
  const table=document.getElementById(target.table);
  if(!table)continue;
  let panel=document.getElementById(target.panel);
  if(!panel){
   panel=document.createElement('section');panel.id=target.panel;
   panel.className='panel';panel.style.cssText='margin:10px 0;border:1px solid #e9dce4;background:#fffafd';
   table.insertAdjacentElement('afterend',panel);
  }
  const stale=rows(M).filter(c=>!target.factionOnly||c.destinationType==='F')
    .map(c=>({c,check:analyze(c)})).filter(x=>['stale','detail-needed'].includes(x.check.status));
  const unavailable=rows(M).filter(c=>!target.factionOnly||c.destinationType==='F')
    .filter(c=>analyze(c).status==='unavailable').length;
  // A divergência fica abaixo da lista normal de envios; não ocupa o topo.
  if(panel.previousElementSibling!==table)table.insertAdjacentElement('afterend',panel);
  const wasOpen=panel.querySelector('details')?.open||false;
  panel.innerHTML='<details class="hlgbMaterialReviewDetails9529"><summary style="cursor:pointer;font-weight:600">'+
   'Revisar materiais dos envios · '+stale.length+' pendência(s) de material/cor'+
   (unavailable?' · '+unavailable+' ficha(s) indisponível(is)':'')+'</summary>'+
   '<div class="sub" style="margin:9px 0">As quantidades do envio original e a ficha atual são comparadas antes de qualquer alteração. Recebimentos já lançados não serão substituídos.</div>'+
   (stale.length?stale.map(({c,check})=>
    '<div style="padding:8px 0;border-bottom:1px solid #e5e5e5"><b>'+esc(check.productName)+'</b> · '+esc(c.destinationName||'Destino')+
    ' · '+fmt(c.qty)+' peças · '+check.oldCount+' linha(s) no envio / '+check.newCount+' na ficha'+
    (check.locked?'<div class="sub">Revisão manual · '+(c.receivedAt?'Recebimento em '+esc(c.receivedAt):'Conferência já iniciada')+'</div>':'')+
    '<button type="button" class="secondary" data-material-revision9522="'+esc(c.id)+'">Comparar materiais</button></div>'
   ).join(''):'<div class="sub">Nenhuma divergência detectada nas fichas carregadas.</div>')+
   (unavailable?'<div class="sub">⚠️ '+unavailable+' ficha(s) não carregada(s). Não confirmar sem os dados.</div>':'')+
   '</details>';
  const details=panel.querySelector('details');if(details)details.open=wasOpen;
  panel.onclick=e=>{const btn=e.target?.closest?.('[data-material-revision9522]');if(btn)openReview(btn.getAttribute('data-material-revision9522'))};
 }
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
 if(!c||!['stale','detail-needed'].includes(local.status))return false;
 if(local.locked)throw new Error('O envio já tem conferência/recebimento. É necessária conciliação manual; nenhuma baixa foi alterada.');
 if(window.__HLGB_AUTH_READY!==true||navigator.onLine===false||typeof cloudRequest!=='function')
  throw new Error('Faça login e conecte-se à nuvem antes de atualizar.');
 state.busy=true;state.lastError='';
 try{
  await assertNoPending(c);
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  const [remoteCheck,remoteProd]=await Promise.all([getRemote(M,id),getRemote('products',c.productId)]);
  const check=remoteCheck.data,prod=remoteProd.data;
  const protectedKeys=['productId','orderId','productionId','cutId','destinationType','destinationId','destinationName','status'];
  if(protectedKeys.some(k=>sid(check[k]??'')!==sid(c[k]??''))||Number(check.qty)!==Number(c.qty))
   throw new Error('O envio mudou na nuvem. Reabra a página antes de prosseguir.');
  if((check.materials||[]).some(m=>m.checked)||sid(check.status)==='Conferido'||check.receivedAt||check.receivedBy)
   throw new Error('A conferência deste envio já foi iniciada. Não é possível substituir os materiais automaticamente.');
  const latest=buildMaterials(prod,check.qty,check.destinationType,check);
  const stillDifferent=compare(check.materials,latest);
  // Se a pessoa só pediu separar por cor, proibir mudança no consumo total.
  if(local.status==='detail-needed'&&stillDifferent.different)
   throw new Error('O consumo total no servidor mudou. Faça a conferência antes de alterar por cor.');
  if(!stillDifferent.different&&!stillDifferent.detailDifferent){
   // Se o servidor gravou mas a resposta HTTP se perdeu, apenas reconciliar o cache.
   // Nunca enviar um segundo POST para a mesma revisao de materiais.
   syncSnapshot(M,remoteCheck);
   const current=lookup(id);if(current)Object.assign(current,clone(check));
   try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}
   ensurePanel();window.renderDestinationChecklists?.();window.renderFactionChecklists9198?.();window.renderFactionChecklists9198?.();
   return {alreadyCurrent:true,count:latest.length,revision:remoteCheck.revision};
  }
  if(JSON.stringify((local.product.materials||[]).map(x=>[x.materialId,x.name,x.qty,x.unit,x.loss,x.calcMode]))!==
     JSON.stringify((prod.materials||[]).map(x=>[x.materialId,x.name,x.qty,x.unit,x.loss,x.calcMode])))
   throw new Error('A ficha técnica foi alterada em outra sessão. Atualize o navegador antes de confirmar.');
  // Impede que o checklist use uma ficha alterada por outra pessoa durante a conferência.
  const productAtCommit=await getRemote('products',c.productId);
  if(Number(productAtCommit.revision)!==Number(remoteProd.revision)||
     JSON.stringify(productAtCommit.data?.materials||[])!==JSON.stringify(prod.materials||[]))
   throw new Error('Ficha técnica alterada na nuvem durante a conferência. Reabra para calcular os materiais atuais.');
  const payload={...check,materials:latest,materialsSourceV9532:'per_color_confirmed',
   materialSheetRevisionV9522:Number(remoteProd.revision),
   materialsRefreshedAtV9522:new Date().toISOString(),materialsSourceV9522:'product_technical_sheet',
   materialsRevisionReasonV9522:'Conferência explícita após atualização da ficha técnica'};
  const out=await cloudRequest('rpc/hlgb_save_record',{method:'POST',headers:{Prefer:'return=representation'},
   body:JSON.stringify({p_module:M,p_entity_id:sid(id),p_data:payload,p_expected_revision:Number(remoteCheck.revision),p_deleted:false})});
  const applied=Array.isArray(out)?out[0]:out;
  if(applied?.applied!==true)throw new Error('Conflito de revisão. Nenhum material local foi substituído.');
  const confirmed=await getRemote(M,id),proof=compare(confirmed.data.materials,latest);
  if(proof.different||proof.detailDifferent||Number(confirmed.revision)<=Number(remoteCheck.revision)||
   sid(confirmed.data.materialsSourceV9522)!=='product_technical_sheet'||
   sid(confirmed.data.materialsSourceV9532)!=='per_color_confirmed')
    throw new Error('O servidor ainda não confirmou os materiais. Confira antes de repetir.');
  syncSnapshot(M,confirmed);
  const dbRow=lookup(id);
  if(dbRow)Object.assign(dbRow,clone(confirmed.data));
  try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){console.warn('[HLGB v95.22] cache local',e)}
  state.lastSuccess={id:sid(id),count:latest.length,revision:confirmed.revision,at:new Date().toISOString()};
  ensurePanel();window.renderDestinationChecklists?.();window.renderFactionChecklists9198?.();
  return state.lastSuccess;
 }catch(e){state.lastError=sid(e?.message||e);throw e}
 finally{state.busy=false}
}
function comparisonRows(oldItems,newItems){
 const group=list=>{
  const x=new Map();
  for(const item of Array.isArray(list)?list:[]){
   const key=norm(item.name)+'|'+norm(item.unit);
   const prior=x.get(key)||{name:sid(item.name),unit:sid(item.unit),qty:0};
   prior.qty+=Number(item.qty)||0;x.set(key,prior);
  }
  return x;
 };
 const old=group(oldItems),fresh=group(newItems),keys=[...new Set([...old.keys(),...fresh.keys()])];
 return keys.sort((a,b)=>a.localeCompare(b,'pt-BR')).map(key=>{
  const a=old.get(key),b=fresh.get(key),diff=(b?.qty||0)-(a?.qty||0);
  return {name:b?.name||a?.name||'',unit:b?.unit||a?.unit||'',
   original:a?a.qty:null,updated:b?b.qty:null,difference:diff,
   change:!a?'Novo na ficha':!b?'Somente no envio':Math.abs(diff)<0.000001?'Sem alteração':'Quantidade alterada'};
 });
}
function comparisonTable(current,review){
 const items=comparisonRows(current?.materials,review?.materials);
 return '<div style="overflow-x:auto"><table><thead><tr><th>Matéria-prima</th><th>Un.</th><th>No envio original</th><th>Ficha atual</th><th>Diferença</th><th>Situação</th></tr></thead><tbody>'+
 items.map(m=>'<tr><td>'+esc(m.name)+'</td><td>'+esc(m.unit)+'</td>'+
  '<td>'+(m.original==null?'—':fmt(m.original))+'</td>'+
  '<td>'+(m.updated==null?'—':fmt(m.updated))+'</td>'+
  '<td>'+fmt(m.difference)+'</td><td>'+esc(m.change)+'</td></tr>').join('')+
 '</tbody></table></div>';
}
function printComparison(c,review){
 const pop=window.open('','_blank');
 if(!pop)throw new Error('O Safari bloqueou a impressão. Autorize a janela de impressão.');
 const html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'+
  '<title>Conferência complementar de materiais</title>'+
  '<style>body{font:12px Arial,sans-serif;padding:22px;color:#222}table{width:100%;border-collapse:collapse}th,td{border:1px solid #777;padding:7px;text-align:left}th{background:#eee}@media print{button{display:none}}</style></head><body>'+
  '<h2>HLGB — conferência complementar (sem alteração de estoque)</h2>'+
  '<p><b>'+esc(review.productName)+'</b> · '+esc(c.destinationName)+' · '+fmt(c.qty)+' peças'+
  ' · recebimento: '+esc(c.receivedAt||'não registrado')+'</p>'+
  '<h3>Materiais separados por cor</h3>'+htmlRows(review.materials)+
  '<h3>Totais originais e atuais</h3>'+comparisonTable(c,review)+
  '<p>Este relatório compara o registro original e a ficha atual. Não comprova uma transferência física de materiais.</p>'+
  '<p>Conferido por: ______________________ Data: ____/____/______</p>'+
  '<button onclick="window.print()">Imprimir</button></body></html>';
 pop.document.open();pop.document.write(html);pop.document.close();pop.focus();
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
  (locked?'<p><b>Conferência manual necessária:</b> o envio já tem '+(c.receivedAt?'recebimento registrado em '+esc(c.receivedAt):'conferência iniciada')+'. O material original será preservado; confira fisicamente as diferenças.</p>':
   '<p>Os novos materiais serão calculados com o rendimento, consumo e perda atuais. A alteração somente será gravada após confirmação na nuvem.</p>')+
  '</div><h3>Materiais por cor na ficha atual</h3>'+htmlRows(review.materials)+
  '<h3>Comparativo dos totais</h3>'+comparisonTable(c,review)+
  '<p class="sub">Nenhuma baixa de material, pagamento, estoque ou entrega é realizada por esta atualização.</p>'+
  '<p id="hlgbMaterialRefreshError9522" role="alert" style="color:#a33"></p>'+
  (locked?'':'<button type="button" class="primary" id="hlgbMaterialRefreshConfirm9522">'+
    (review.status==='detail-needed'?'☁️ Salvar separação por cor na nuvem':'☁️ Atualizar checklist deste envio')+'</button>')+
  ' <button type="button" class="secondary" id="hlgbMaterialPrintReview9529">Imprimir conferência</button>'+
  ' <button type="button" class="secondary" onclick="closeModal()">Fechar</button>';
 if(typeof openModal!=='function')return alert('Janela do HLGB não está disponível.');
 openModal('📦 Materiais atualizados — conferência do envio',html,()=>{});
 setTimeout(()=>{
  const printButton=document.getElementById('hlgbMaterialPrintReview9529');
  if(printButton)printButton.onclick=()=>{try{printComparison(c,review)}catch(e){alert(sid(e.message||e))}};
  const button=document.getElementById('hlgbMaterialRefreshConfirm9522');
  if(button)button.onclick=async()=>{
   button.disabled=true;button.textContent='☁️ Conferindo e salvando…';
   try{
    const result=await reloadAndSave(id);
    closeModal();alert(result?.alreadyCurrent?'Materiais já estão atualizados.':
      '✅ Checklist separado por cor e confirmado na nuvem: '+result.count+' linha(s). Confira antes de separar.');
    window.__hlgbMaterialOriginalOpen9522?.(id);
   }catch(e){
    const el=document.getElementById('hlgbMaterialRefreshError9522');
    if(el)el.textContent=sid(e.message||e)+' Nenhum material foi alterado localmente sem confirmação.';
   }finally{button.disabled=false;button.textContent=review.status==='detail-needed'?'☁️ Salvar separação por cor na nuvem':'☁️ Atualizar checklist deste envio'}
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
 const oldFactionRender=window.renderFactionChecklists9198;
 if(typeof oldFactionRender==='function'&&!oldFactionRender.__hlgbMaterialRevision9522){
  const wrapped=function(){const r=oldFactionRender.apply(this,arguments);setTimeout(ensurePanel,0);return r};
  wrapped.__hlgbMaterialRevision9522=true;wrapped.__original=oldFactionRender;
  window.renderFactionChecklists9198=wrapped;
 }
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
   try{record.materials=buildMaterials(p,record.qty,record.destinationType,record);
    record.materialsSourceV9522='product_technical_sheet';}
   catch(e){console.warn('[HLGB v95.22] ficha nova indisponível',e)}
  }
  return record;
 };
 // Atualiza o aviso ao voltar à aba dos envios após editar fichas ou sincronizar outra sessão.
 try{window.addEventListener('focus',()=>setTimeout(ensurePanel,120))}catch(e){}
 try{document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(ensurePanel,120)})}catch(e){}
 state.installed=true;setTimeout(ensurePanel,100);
}
window.hlgbFactionMaterialRefresh9522={version:V,state,install,analyze,buildMaterials,compare,openReview,reloadAndSave,ensurePanel,
 test:{materialKey,isRelevantPending,comparisonRows,comparisonTable,gradeRowsForChecklist,rollDetails}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
try{window.hlgbAfterLogin?.(()=>setTimeout(install,200),0)}catch(e){}
setTimeout(install,1500);
})();