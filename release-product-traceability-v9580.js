/* HLGB v95.80 — rastreabilidade e checklist universal de produtos.
   Timeline usa registros operacionais existentes (nunca inventa pagamentos ou
   tratativas anteriores). Novos eventos de checklist são imutáveis e
   confirmados no registro de produto na nuvem. Independente da destinação. */
(function(){
'use strict';
const V='95.80',PAGES={history:'productHistory9580',checklist:'productChecklist9580'};
if(window.hlgbProductTraceability9580)return;
const sid=x=>String(x??''),num=x=>Math.max(0,Number(x)||0),stamp=()=>new Date().toISOString();
const esc=x=>sid(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const money=x=>Number(x||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const clone=x=>JSON.parse(JSON.stringify(x));
const arr=k=>{try{const db=typeof window.db==='object'?window.db:{};return Array.isArray(db?.[k])?db[k]:[]}catch(_){return []}};
const one=(module,id)=>arr(module).find(x=>sid(x?.id)===sid(id))||null;
const auth=()=>window.__HLGB_AUTH_READY===true;
const LIMIT=1000;
const state={historyProduct:'',checkProduct:'',checkRound:'',lastError:'',lastSave:'',working:false,historyRenders:0,checkRenders:0};
const STEPS=[
 {id:'ficha',label:'Ficha técnica conferida'},
 {id:'materiais',label:'Materiais separados e conferidos'},
 {id:'corte',label:'Corte executado e grade conferida'},
 {id:'envio',label:'Enviado para produção / facção'},
 {id:'producao',label:'Produção concluída'},
 {id:'recebimento',label:'Recebimento e quantidade conferidos'},
 {id:'embalagem',label:'Embalagem conferida'},
 {id:'entrega',label:'Pronto para entrega'}
];
function productId(x){return sid(x?.productId||x?.product_id||'')}
function gradeFor(c){
 const a=Array.isArray(c?.actualCutGrade)&&c.actualCutGrade.length?c.actualCutGrade:
  Array.isArray(c?.cutGrade)&&c.cutGrade.length?c.cutGrade:
  Array.isArray(c?.originalGrade)?c.originalGrade:[];
 return a.map(g=>{const size=sid(g?.size||g?.sizeName||g?.tam||g?.label),color=sid(g?.color||g?.colorName||'');
  return [color,size].filter(Boolean).join(' ')+' '+num(g?.qty||g?.quantity||g?.pieces)+' pç';}).filter(s=>!s.startsWith(' 0')).join(' · ');
}
function asEvent(kind,source,record,date,label,details={},orderId=''){
 return {eventId:source+':'+sid(record?.id),kind,source,sourceId:sid(record?.id),date:sid(date||record?.createdAt||record?.date||''),
  orderId:sid(orderId||record?.orderId||''),label,details};
}
function normalizeDate(v){const s=sid(v);return /^\d{4}-\d\d-\d\d/.test(s)?s:''}
function timeline(productId,options={}){
 const pid=sid(productId),filterOrder=sid(options.orderId||''),result=[],seen=new Set();
 if(!pid)return [];
 const add=(e)=>{const k=e.eventId;if(seen.has(k))return;seen.add(k);if(filterOrder&&e.orderId!==filterOrder)return;result.push(e)};
 const orders=arr('orders').filter(o=>Array.isArray(o.grade)?o.grade.some(g=>sid(g.productId)===pid):
  Array.isArray(o.items)&&o.items.some(g=>sid(g.productId)===pid));
 for(const o of orders){
  const items=[...(Array.isArray(o.grade)?o.grade:[]),...(Array.isArray(o.items)?o.items:[])].filter(x=>sid(x.productId)===pid);
  const qty=items.reduce((sum,x)=>sum+num(x.qty||x.quantity||x.pieces),0);
  add(asEvent('pedido','orders',o,o.date||o.createdAt,'Pedido registrado',{
   client:sid(o.client||''),quantity:qty,orderNumber:sid(o.orderNumber||o.number||o.id),
   grade:items.map(x=>[x.color,x.size,num(x.qty||x.quantity)].filter(Boolean).join(' / ')).join(' · ')
  }));
 }
 for(const c of arr('cuts').filter(x=>productId(x)===pid&&!x.hiddenByModelSplitV1)){
  const cutter=one('cutters',c.cutterId),grade=gradeFor(c);
  const people=[cutter?.name,c.cutterName,c.cutter2Name,c.infestadorName].filter(Boolean).map(sid);
  const date=c.finishedAt||c.date||c.createdAt||'';
  add(asEvent('corte','cuts',c,date,'Corte '+sid(c.status||'registrado'),{
   cutId:sid(c.id),quantity:num(c.pieces||c.done),grade,
   cutters:[...new Set(people)],cutStatus:sid(c.status),weight:c.cutWeightV9579||null,
   weightHistoryCount:(c.cutWeightEventsV9579||[]).length
  }));
  for(const w of (Array.isArray(c.cutWeightEventsV9579)?c.cutWeightEventsV9579:[])){
   add({eventId:'cut-weight:'+sid(w.id),kind:'pesagem',source:'cuts',sourceId:sid(c.id),
    date:sid(w.at),orderId:sid(c.orderId||''),label:'Peso do corte registrado',
    details:{before:w.before||null,after:w.after||null,cutterId:sid(w.cutterId||c.cutterId)}});
  }
 }
 for(const p of arr('production').filter(x=>productId(x)===pid)){
  const place=one('productionLocations',p.productionLocationId);
  add(asEvent('producao','production',p,p.assignedAt||p.date||p.createdAt,'Produção / etapa '+sid(p.stage||'registrada'),{
   location:sid(place?.name||p.productionLocationName||''),quantityPlanned:num(p.planned),
   quantityProduced:num(p.done),color:sid(p.color),size:sid(p.size),cutId:sid(p.cutId),
   destinationType:p.factionId?'Facção':place?.name?'Unidade de produção':'Não informada'}));
 }
 for(const f of arr('factions').filter(x=>productId(x)===pid)){
  const qty=num(f.sent||f.quantity),unit=num(f.payableUnitPrice??f.price),gross=num(f.baseUnitPrice??f.price);
  add(asEvent('faccao','factions',f,f.sentAt||f.date||f.createdAt,'Enviado à facção / prestador',{
   person:sid(f.name||f.factionName),quantitySent:qty,quantityDone:num(f.done),
   quantityReturned:num(f.returned),pricePerPiece:unit,grossPricePerPiece:gross,
   estimatedCost:qty*unit,amountIsEstimate:true,travetaDiscountUnit:num(f.travetaDeductionUnit),
   finishedAt:sid(f.finishedAt),productionId:sid(f.productionId),status:sid(f.status),
   receivedBy:sid(f.receivedBy||'')
  }));
 }
 for(const p of arr('factionPayments').filter(x=>productId(x)===pid)){
  add(asEvent('pagamento','factionPayments',p,p.paymentDate||p.date||p.createdAt,'Pagamento / lançamento de facção',{
   person:sid(p.factionName||p.name),quantity:num(p.quantity||p.pieces),
   amountBilled:num(p.value||p.total),amountPaid:num(p.paidAmount),
   paymentDate:sid(p.paymentDate),status:sid(p.status),
   unitPrice:num(p.unitPrice||p.price),travetaDiscount:num(p.travetaDiscountTotalV9577||p.discountAmount),
   receiptPdfAttached:!!p.receiptPdfV9566,sourceKind:sid(p.manualKindV9566||'facção')
  }));
 }
 for(const c of arr('materialChecklists').filter(x=>productId(x)===pid)){
  add(asEvent('checklist-material','materialChecklists',c,c.receivedAt||c.createdAt,'Checklist de materiais / destino',{
   destination:sid(c.destinationName),destinationType:sid(c.destinationType),receivedBy:sid(c.receivedBy),
   quantity:num(c.qty),grade:gradeFor({actualCutGrade:c.gradeV9198}),
   status:sid(c.status),receivedAt:sid(c.receivedAt)
  }));
 }
 const product=one('products',pid),rounds=Array.isArray(product?.productChecklistsV9580)?product.productChecklistsV9580:[];
 for(const round of rounds){
  for(const event of round.events||[]){
   add({eventId:'checklist:'+sid(event.id),kind:'checklist-produto',source:'products',sourceId:pid,
    date:sid(event.at),orderId:sid(round.orderId),label:sid(event.label||event.kind),
    details:{roundId:round.id,roundName:round.name,actor:sid(event.actor),checked:event.checked,
     stepId:sid(event.stepId),note:sid(event.note)}});
  }
 }
 return result.sort((a,b)=>normalizeDate(b.date).localeCompare(normalizeDate(a.date))||
  b.date.localeCompare(a.date)||a.eventId.localeCompare(b.eventId)).slice(0,LIMIT);
}
function roundState(round){
 const result={};for(const s of STEPS)result[s.id]=false;
 for(const e of round?.events||[])if(e.kind==='step'&&Object.prototype.hasOwnProperty.call(result,e.stepId))result[e.stepId]=e.checked===true;
 return result;
}
function roundsFor(pid){const p=one('products',pid);return Array.isArray(p?.productChecklistsV9580)?p.productChecklistsV9580:[]}
function validatedName(name){const s=sid(name).trim();if(!s||s.length>140)throw Error('Informe uma identificação do lote (até 140 caracteres).');return s}
function inputActor(actor){const s=sid(actor).trim();if(!s||s.length>100)throw Error('Informe o responsável pela alteração (até 100 caracteres).');return s}
async function ensureWritable(pid){
 if(!auth())throw Error('Entre no HLGB para marcar o checklist.');
 const guard=window.hlgbWalIdbGuard9536;
 if(typeof guard?.probe!=='function'||typeof guard?.ids!=='function')throw Error('Proteção local de sincronização indisponível. Não apagar dados.');
 await guard.probe();
 if(guard.status?.()?.readFailed)throw Error('Não foi possível consultar a fila WAL do navegador.');
 const ids=new Set([...(guard.ids()||[]),...(window.hlgbRecordPendingIdentitySet9535?.()||[])].map(sid));
 if(ids.has('products::'+pid)||ids.has('products|'+pid))throw Error('Há alteração pendente para este produto neste computador.');
 if(typeof window.cloudEnsureFreshSession==='function')await window.cloudEnsureFreshSession(false);
 if(typeof window.hlgbRecordSaveWithRetry!=='function'||typeof window.cloudRequest!=='function')
  throw Error('Gravação e confirmação da nuvem não estão disponíveis.');
}
async function remoteProduct(pid){
 const rows=await window.cloudRequest('hlgb_records?select=module,entity_id,data,deleted_at&module=eq.products&entity_id=eq.'+
  encodeURIComponent(pid)+'&limit=1',{method:'GET'});
 return Array.isArray(rows)&&rows[0]&&!rows[0].deleted_at&&sid(rows[0].entity_id)===pid?rows[0].data:null;
}
async function mutate(pid,task){
 if(state.working)throw Error('Outro salvamento do checklist já está em andamento.');
 const p=one('products',pid);if(!p)throw Error('Produto não encontrado.');
 state.working=true;state.lastError='';
 try{
  await ensureWritable(pid);
  // The canonical record's current version is read back before changing, not
  // merged with stale local summaries; an outstanding WAL write blocks changes.
  const latest=await remoteProduct(pid);if(!latest)throw Error('Produto não encontrado na nuvem. Nenhum checklist foi salvo.');
  const next=clone(latest),rounds=Array.isArray(next.productChecklistsV9580)?next.productChecklistsV9580:[];
  const event=task(rounds);
  if(!event?.id)throw Error('Evento inválido. Nada foi salvo.');
  next.productChecklistsV9580=rounds;
  next.updatedAt=stamp();
  const out=await window.hlgbRecordSaveWithRetry('products',pid,next,false);
  if(!out?.applied)throw Error(out?.reason||'A nuvem não confirmou o checklist.');
  const verified=await remoteProduct(pid);
  if(!verified)throw Error('Não foi possível reler o checklist após o envio. Não reenviar sem conferir.');
  const events=(verified.productChecklistsV9580||[]).flatMap(r=>[...(r.events||[]),...(r.id===event.id?[{id:r.id}]:[])]);
  if(!events.some(x=>sid(x.id)===sid(event.id)))
   throw Error('O evento do checklist não apareceu na releitura remota. Confira antes de reenviar.');
  const db=window.db||{},products=Array.isArray(db.products)?db.products:[];
  const idx=products.findIndex(x=>sid(x?.id)===pid);if(idx>=0)products[idx]=verified;
  try{window.localSaveOnly?.()}catch(_){}
  state.lastSave=stamp();return {ok:true,event,product:verified};
 }catch(e){state.lastError=sid(e?.message||e);throw e}
 finally{state.working=false}
}
const makeId=prefix=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,11);
async function createRound(pid,input={}){
 const name=validatedName(input.name),actor=inputActor(input.actor),orderId=sid(input.orderId||'');
 const linkedOrder=orderId?one('orders',orderId):null;
 if(orderId&&(!linkedOrder||!linkedOrder.grade?.some(g=>sid(g.productId)===sid(pid))))
  throw Error('O pedido escolhido não contém este produto.');
 return mutate(sid(pid),rounds=>{
  const now=stamp(),id=makeId('product-round');
  const round={id,name,orderId,createdAt:now,createdBy:actor,events:[{id:makeId('product-event'),kind:'created',
    label:'Checklist do lote criado',actor,at:now,note:''}]};
  rounds.push(round);return {id,kind:'round'};
 });
}
async function toggleStep(pid,roundId,stepId,checked,input={}){
 const actor=inputActor(input.actor),step=STEPS.find(x=>x.id===sid(stepId));
 if(!step||typeof checked!=='boolean')throw Error('Etapa ou estado inválido.');
 const note=sid(input.note).trim();if(note.length>500)throw Error('Observação com até 500 caracteres.');
 return mutate(sid(pid),rounds=>{
  const round=rounds.find(x=>sid(x.id)===sid(roundId));if(!round)throw Error('Lote do checklist não encontrado.');
  const before=roundState(round)[step.id],event={id:makeId('product-event'),kind:'step',stepId:step.id,
   label:step.label,checked,previous:before,actor,note,at:stamp()};
  if(before===checked)throw Error('Esta etapa já está '+(checked?'marcada':'desmarcada')+'.');
  if(!Array.isArray(round.events))round.events=[];
  round.events.push(event);return event;
 });
}
function selectProducts(current){
 return arr('products').filter(x=>x&&x.id!=null&&x.active!==false).slice()
  .sort((a,b)=>sid(a.name).localeCompare(sid(b.name),'pt-BR'))
  .map(x=>'<option value="'+esc(x.id)+'"'+(sid(x.id)===sid(current)?' selected':'')+'>'+
    esc(x.name||x.code||x.id)+'</option>').join('');
}
function productPicker(current,id){
 return '<div class="field"><label>Modelo</label><select id="'+id+'">'+selectProducts(current)+'</select></div>';
}
function detail(d){
 const lines=[];
 const add=(label,value)=>{if(value!=null&&value!==''&&value!==false)lines.push(esc(label)+': '+esc(value))};
 for(const k of ['client','orderNumber','person','destination','location','sourceKind','status','cutStatus','receivedBy','finishedAt','paymentDate'])
  add(({orderNumber:'Pedido',client:'Cliente',person:'Facção/Prestador',destination:'Destino',location:'Produção',sourceKind:'Serviço',cutStatus:'Status do corte',receivedBy:'Recebido por',finishedAt:'Finalizado em',paymentDate:'Pagamento em'})[k]||k,d[k]);
 for(const [key,label] of [['quantity','Quantidade'],['quantitySent','Peças enviadas'],['quantityDone','Peças feitas'],
  ['quantityReturned','Peças devolvidas'],['quantityPlanned','Peças previstas'],['quantityProduced','Peças produzidas']])
  if(d[key]!=null)add(label,num(d[key])+' pç');
 if(d.grade)add('Grade',d.grade);
 if(Array.isArray(d.cutters)&&d.cutters.length)add('Cortadores',d.cutters.join(', '));
 if(d.pricePerPiece!=null)add('Preço da facção/pç',money(d.pricePerPiece));
 if(d.estimatedCost!=null)add('Valor previsto da alocação (não é pagamento)',money(d.estimatedCost));
 if(d.amountBilled!=null)add('Valor do lançamento',money(d.amountBilled));
 if(d.amountPaid!=null)add('Valor pago registrado',money(d.amountPaid));
 if(d.travetaDiscount)add('Travetada abatida',money(d.travetaDiscount));
 if(d.actor)add('Responsável',d.actor);
 if(d.roundName)add('Lote',d.roundName);
 if(d.stepId)add('Etapa',d.stepId);
 if(d.checked!=null)add('Situação',d.checked?'Marcado':'Desmarcado');
 if(d.note)add('Observação',d.note);
 if(d.weight?.totalKg!=null)add('Peso total',num(d.weight.totalKg)+' kg');
 if(d.after?.totalKg!=null)add('Peso medido',num(d.after.totalKg)+' kg');
 return lines.join(' · ');
}
function renderHistory(){
 const host=document.getElementById(PAGES.history+'Host');if(!host)return false;
 if(!state.historyProduct)state.historyProduct=sid(arr('products').find(p=>p?.id!=null)?.id||'');
 const events=timeline(state.historyProduct);
 const name=one('products',state.historyProduct)?.name||'';
 host.innerHTML='<div class="panel"><h2 style="margin-top:0">📚 Histórico completo de produtos</h2>'+
 '<p class="sub">Eventos reunidos por ID de produto das etapas de pedido, corte, produção, facção, pagamentos e checklists. Valor previsto é separado de valor efetivamente pago.</p>'+
 productPicker(state.historyProduct,'ptr80-product')+
 '<div class="sub">'+events.length+' evento(s) associados ao produto selecionado. Dados não registrados originalmente não podem ser reconstruídos.</div>'+
 (events.length?'<div style="overflow-x:auto"><table><thead><tr><th>Data</th><th>Etapa</th><th>Pedido</th><th>Detalhes registrados</th></tr></thead><tbody>'+
 events.map(e=>'<tr><td>'+esc(e.date||'-')+'</td><td>'+esc(e.label)+'</td><td>'+esc(e.orderId||'-')+'</td>'+
 '<td>'+detail(e.details)+'</td></tr>').join('')+'</tbody></table></div>':
 '<div class="empty">Não há eventos vinculados a este produto nos registros carregados.</div>')+
 '<p class="sub">Atenção: esta linha do tempo é reconstruída das informações operacionais atuais e dos novos eventos de checklist. Não substitui o histórico de revisões anteriores do banco.</p></div>';
 host.querySelector('#ptr80-product')?.addEventListener('change',e=>{state.historyProduct=e.target.value;renderHistory()});
 state.historyRenders++;return {count:events.length,productId:state.historyProduct,name};
}
function orderOptions(pid){
 const orders=arr('orders').filter(o=>Array.isArray(o.grade)&&o.grade.some(g=>sid(g.productId)===sid(pid)));
 return '<option value="">Checklist geral / lote sem pedido</option>'+orders.map(o=>'<option value="'+esc(o.id)+'">Pedido '+esc(o.orderNumber||o.id)+' · '+esc(o.client)+'</option>').join('');
}
function renderChecklist(){
 const host=document.getElementById(PAGES.checklist+'Host');if(!host)return false;
 if(!state.checkProduct)state.checkProduct=sid(arr('products').find(p=>p?.id!=null)?.id||'');
 const rounds=roundsFor(state.checkProduct);
 if(!state.checkRound||!rounds.some(x=>sid(x.id)===sid(state.checkRound)))
  state.checkRound=sid(rounds.at(-1)?.id||'');
 const round=rounds.find(x=>sid(x.id)===sid(state.checkRound)),status=roundState(round);
 const done=STEPS.filter(x=>status[x.id]).length;
 const rows=round?STEPS.map(step=>
  '<label style="display:flex;align-items:flex-start;gap:9px;padding:8px;border-bottom:1px solid #ddd">'+
  '<input type="checkbox" data-ptr80-step="'+step.id+'"'+(status[step.id]?' checked':'')+
  '><span>'+esc(step.label)+'</span></label>').join(''):'<div class="empty">Crie uma rodada para começar o checklist deste modelo.</div>';
 const history=round?.events?.slice(-15).reverse().map(e=>'<div class="sub">'+esc(e.at)+' · '+esc(e.actor)+
  ' · '+esc(e.label)+(e.kind==='step'?' · '+(e.checked?'Marcado':'Desmarcado'):'')+
  (e.note?' · '+esc(e.note):'')+'</div>').join('')||'Nenhuma alteração registrada.';
 host.innerHTML='<div class="panel"><h2 style="margin-top:0">✅ Checklist de produtos</h2>'+
 '<p class="sub">Por modelo e por lote ou pedido. Funciona para produção interna, facção, embalagem ou outro destino, com responsável e evento de cada marcação.</p>'+
 productPicker(state.checkProduct,'ptr80-check-product')+
 '<div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin:10px 0">'+
 '<div class="field"><label>Rodada / lote</label><select id="ptr80-round"><option value="">Selecione</option>'+
 rounds.map(r=>'<option value="'+esc(r.id)+'"'+(sid(r.id)===state.checkRound?' selected':'')+'>'+esc(r.name)+' ('+esc(r.orderId||'Geral')+')</option>').join('')+'</select></div>'+
 '<div class="field"><label>Responsável por esta alteração</label><input id="ptr80-actor" maxlength="100" placeholder="Nome de quem conferiu"></div>'+
 '</div><details class="panel" style="padding:10px;margin:10px 0"><summary><b>+ Criar checklist para novo lote</b></summary>'+
 '<div class="grid"><div class="field"><label>Nome do lote</label><input id="ptr80-new-name" maxlength="140" placeholder="Ex.: Pedido de 500 peças"></div>'+
 '<div class="field"><label>Associar a um pedido (opcional)</label><select id="ptr80-new-order">'+orderOptions(state.checkProduct)+'</select></div></div>'+
 '<button id="ptr80-new" type="button" class="secondary">☁️ Criar rodada na nuvem</button></details>'+
 (round?'<h3>'+esc(round.name)+' · '+done+'/'+STEPS.length+' etapas concluídas</h3>':'')+
 '<div id="ptr80-steps">'+rows+'</div>'+
 '<div class="field"><label>Observação da alteração (opcional)</label><input id="ptr80-note" maxlength="500" placeholder="Ex.: 30 peças conferidas novamente"></div>'+
 '<div id="ptr80-feedback" class="sub" role="status"></div>'+
 '<details style="margin-top:10px"><summary><b>📚 Histórico de alterações deste checklist</b></summary>'+history+'</details></div>';
 const get=id=>host.querySelector('#'+id)?.value||'';
 const feedback=host.querySelector('#ptr80-feedback');
 host.querySelector('#ptr80-check-product')?.addEventListener('change',e=>{state.checkProduct=e.target.value;state.checkRound='';renderChecklist()});
 host.querySelector('#ptr80-round')?.addEventListener('change',e=>{state.checkRound=e.target.value;renderChecklist()});
 host.querySelector('#ptr80-new')?.addEventListener('click',async e=>{
  e.target.disabled=true;if(feedback)feedback.textContent='Criando rodada na nuvem…';
  try{const result=await createRound(state.checkProduct,{name:get('ptr80-new-name'),orderId:get('ptr80-new-order'),actor:get('ptr80-actor')});
   state.checkRound=sid(result.event.id);renderChecklist()}
  catch(err){if(feedback)feedback.textContent='⚠ '+sid(err?.message||err);e.target.disabled=false}
 });
 host.querySelectorAll('[data-ptr80-step]').forEach(input=>input.addEventListener('change',async e=>{
  const checked=e.target.checked;e.target.disabled=true;if(feedback)feedback.textContent='Confirmando etapa no servidor…';
  try{await toggleStep(state.checkProduct,state.checkRound,e.target.dataset.ptr80Step,checked,
    {actor:get('ptr80-actor'),note:get('ptr80-note')});renderChecklist()}
  catch(err){e.target.checked=!checked;e.target.disabled=false;if(feedback)feedback.textContent='⚠ '+sid(err?.message||err)}
 }));
 state.checkRenders++;return {count:rounds.length,roundId:state.checkRound,done};
}
function activate(page,button){
 document.querySelectorAll('#appShell .page').forEach(x=>x.classList.remove('active'));
 const section=document.getElementById(PAGES[page]);if(!section)return false;
 section.classList.add('active');
 document.querySelectorAll('#nav button').forEach(x=>x.classList.remove('active'));
 button?.classList.add('active');
 try{window.openParentNavGroup?.(button)}catch(_){}
 if(page==='history')renderHistory();else renderChecklist();return true;
}
function install(){
 const main=document.querySelector('#appShell main')||document.querySelector('main'),nav=document.getElementById('nav');
 if(!main||!nav)return false;
 for(const [kind,label] of [['history','Histórico de produtos'],['checklist','Checklist de produtos']]){
  if(!document.getElementById(PAGES[kind])){
   const section=document.createElement('section');section.className='page';section.id=PAGES[kind];
   section.innerHTML='<h1>'+label+'</h1><div id="'+PAGES[kind]+'Host"></div>';main.appendChild(section);
  }
 }
 if(!document.getElementById('productTraceNav9580')){
  const group=document.createElement('div');group.className='nav-group';group.id='productTraceNav9580';
  group.innerHTML='<button type="button" class="nav-group-title" onclick="toggleNavGroup(this)">📦 <span>Rastreamento de produtos</span><b>⌄</b></button>'+
   '<div class="nav-submenu"><button id="ptr80-historyNav">📚 Histórico de produtos</button>'+
   '<button id="ptr80-checkNav">✅ Checklist de produtos</button></div>';
  const system=[...nav.querySelectorAll('.nav-group')].find(x=>/sistema/i.test(x.querySelector('.nav-group-title')?.textContent||''));
  if(system)nav.insertBefore(group,system);else nav.appendChild(group);
  group.querySelector('#ptr80-historyNav').addEventListener('click',e=>activate('history',e.currentTarget));
  group.querySelector('#ptr80-checkNav').addEventListener('click',e=>activate('checklist',e.currentTarget));
 }
 return true;
}
window.hlgbProductTraceability9580={version:V,STEPS,timeline,roundState,roundsFor,createRound,toggleStep,
 remoteProduct,renderHistory,renderChecklist,install,status:()=>({...state})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
[500,1600,3300].forEach(ms=>setTimeout(install,ms));
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(install,500));
console.info('[HLGB] v'+V+' timeline de produção e checklist universal com eventos imutáveis');
})();