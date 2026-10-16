/* HLGB v93.78 — Embalagem, Dar baixa e Mapa de Produção Semanal */
(function(){
'use strict';
const V='93.78';
if(window.hlgbProductionOps9378)return;
const sid=v=>String(v??''), q=v=>Math.max(0,Number(v)||0), clone=v=>{try{return structuredClone(v)}catch(e){return JSON.parse(JSON.stringify(v))}};
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const arr=n=>{try{db[n]=Array.isArray(db[n])?db[n]:[];return db[n]}catch(e){return []}};
const isoDate=d=>{const x=d instanceof Date?d:new Date(d||Date.now());return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
const now=()=>new Date().toISOString(), today=()=>isoDate(new Date());
const uid=p=>p+'-'+Date.now()+'-'+Math.floor(Math.random()*900000);
function userName(){return sid(window.currentUser?.email||window.cloudCurrentUser?.email||window.hlgbCurrentUser?.email||window.HLGB_USER_EMAIL||'Usuário HLGB')}
function upsertLocal(module,row){const a=arr(module),i=a.findIndex(x=>sid(x?.id)===sid(row?.id));if(i>=0)a[i]=clone(row);else a.push(clone(row));try{localSaveOnly?.()}catch(e){}}
async function saveRow(module,row){
 if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
 if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação oficial indisponível.');
 const out=await window.hlgbRecordSaveWithRetry(module,sid(row.id),clone(row),false);
 if(!out?.applied)throw new Error(out?.reason||('A nuvem não confirmou '+module+'.'));
 const saved=out.data||row;upsertLocal(module,saved);return saved;
}
function activate(id,btn,render){
 document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
 const p=document.getElementById(id);if(!p)return;p.classList.add('active');
 document.querySelectorAll('#nav button').forEach(x=>x.classList.remove('active'));
 if(btn){btn.classList.add('active');try{openParentNavGroup(btn)}catch(e){}}
 render?.();
}
function product(id){return arr('products').find(x=>sid(x.id)===sid(id))||null}
function client(id){return arr('clients').find(x=>sid(x.id)===sid(id))||null}
function order(id){return arr('orders').find(x=>sid(x.id)===sid(id))||null}
function cutter(id){return arr('cutters').find(x=>sid(x.id)===sid(id))||null}
function locationById(id){return arr('productionLocations').find(x=>sid(x.id)===sid(id))||arr('factions').find(x=>sid(x.id)===sid(id))||null}
function orderClient(o){return client(o?.clientId)?.name||o?.clientName||o?.client||'-'}
function productName(x){return product(x?.productId)?.name||x?.productName||x?.product||'Modelo'}
function qtyOf(x){return q(x?.pieces||x?.done||x?.plannedPieces||x?.planned||x?.qty||x?.quantity)}
function sourceDate(x){return sid(x?.finishedAt||x?.date||x?.createdAt).slice(0,10)}
function writeoffKey(type,id){return type+'|'+sid(id)}
function writeoffSet(){return new Set(arr('operationalWriteoffs').map(x=>writeoffKey(x.sourceType,x.sourceId)))}
function isWrittenOff(type,id){return writeoffSet().has(writeoffKey(type,id))}
function gradeRows(raw){
 const out=[];
 const push=(color,size,qty)=>{qty=q(qty);if(qty>0)out.push({color:sid(color||'').trim(),size:sid(size||'').trim(),qty})};
 if(Array.isArray(raw)){
   raw.forEach(r=>{
     if(!r)return;
     if(Array.isArray(r.sizes))r.sizes.forEach(s=>push(r.color||r.name,s.size||s.name,s.qty||s.quantity));
     else if(r.grade&&typeof r.grade==='object'&&!Array.isArray(r.grade))Object.entries(r.grade).forEach(([s,v])=>push(r.color||r.name,s,v));
     else push(r.color,r.size||r.tamanho,r.qty||r.quantity||r.value);
   });
 } else if(raw&&typeof raw==='object'){
   Object.entries(raw).forEach(([k,v])=>{
     if(v&&typeof v==='object'&&!Array.isArray(v))Object.entries(v).forEach(([s,n])=>push(k,s,n));
     else push('',k,v);
   });
 }
 return out;
}
function gradeForCut(cut){
 let rows=gradeRows(cut?.colorGrade||cut?.gradeByColor||cut?.matrix||cut?.grade);
 if(rows.length)return rows;
 const o=order(cut?.orderId),candidates=[];
 (o?.items||o?.grade||[]).forEach(g=>{
   if(cut?.productId&&sid(g?.productId)!==sid(cut.productId))return;
   candidates.push(...gradeRows(g?.colorGrade||g?.matrix||g?.grade||g?.sizes||g));
 });
 return candidates;
}
function gradeText(rows){
 if(!rows?.length)return '-';
 const by=new Map();
 rows.forEach(r=>{const k=r.color||'Sem cor';if(!by.has(k))by.set(k,[]);by.get(k).push(r)});
 return [...by].map(([c,rs])=>'<div><b>'+esc(c)+'</b>: '+rs.map(r=>esc(r.size||'-')+' '+q(r.qty)).join(' · ')+'</div>').join('');
}
function productionForCut(cut){
 return arr('production').find(p=>sid(p.cutId)===sid(cut.id))||arr('production').find(p=>sid(p.orderId)===sid(cut.orderId)&&sid(p.productId)===sid(cut.productId))||null;
}
function lotRows(){
 return arr('cuts').filter(c=>!isWrittenOff('cut',c.id)).map(c=>{
   const p=productionForCut(c),o=order(c.orderId),rows=gradeForCut(c);
   return {type:'cut',id:sid(c.id),cut:c,production:p,order:o,productId:c.productId,productName:productName(c),clientName:orderClient(o),qty:qtyOf(c),grade:rows,priority:c.priority||o?.priority||'Padrão',due:c.dueDate||o?.deliveryDate||o?.deadline||'',status:p?.status||c.status||'-',cutterName:cutter(c.cutterId)?.name||c.cutterName||'-',locationName:locationById(p?.locationId||p?.productionLocationId||c.locationId)?.name||p?.locationName||c.locationName||'-',date:sourceDate(c),origin:'Corte #'+sid(c.id)+(p?' / Produção #'+sid(p.id):'')};
 }).filter(x=>x.qty>0);
}
function packAssignmentForLot(lot){return arr('packagingAssignments').find(a=>sid(a.sourceCutId)===sid(lot.id))}
function ensureStyle(){
 if(document.getElementById('hlgbProdOps9378Style'))return;
 const s=document.createElement('style');s.id='hlgbProdOps9378Style';
 s.textContent='.hlgb9378-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}.hlgb9378-card{border:1px solid var(--line);border-radius:12px;padding:12px;background:#fff}.hlgb9378-table{overflow:auto}.hlgb9378-grade{font-size:12px;line-height:1.5;min-width:210px}.hlgb9378-print-only{display:none}@media print{.hlgb9378-no-print{display:none!important}.hlgb9378-print-only{display:block!important}}';
 document.head.appendChild(s);
}
function ensurePages(){
 const main=document.querySelector('#appShell main')||document.querySelector('main');if(!main)return;
 if(!document.getElementById('darBaixa9378')){const p=document.createElement('section');p.id='darBaixa9378';p.className='page';p.innerHTML='<h1>✅ Dar baixa</h1><div class="sub">Regularização operacional sem criar corte, nota, pagamento ou movimento financeiro.</div><div id="darBaixa9378Host"></div>';main.appendChild(p)}
 if(!document.getElementById('mapaSemanal9378')){const p=document.createElement('section');p.id='mapaSemanal9378';p.className='page';p.innerHTML='<h1>🗓️ Mapa de Produção Semanal</h1><div class="sub">Visão consolidada de cortadores, confecções/facções e administração.</div><div id="mapaSemanal9378Host"></div>';main.appendChild(p)}
}
function ensureNav(){
 const nav=document.getElementById('nav');if(!nav)return;
 const prod=[...nav.querySelectorAll('.nav-group')].find(x=>/Produção/i.test(x.querySelector('.nav-group-title span')?.textContent||'')),sub=prod?.querySelector('.nav-submenu');
 if(sub&&!document.getElementById('hlgbDarBaixaNav9378')){const b=document.createElement('button');b.id='hlgbDarBaixaNav9378';b.textContent='✅ Dar baixa';b.onclick=function(){activate('darBaixa9378',b,renderWriteoffs)};sub.appendChild(b)}
 if(sub&&!document.getElementById('hlgbMapaSemanalNav9378')){const b=document.createElement('button');b.id='hlgbMapaSemanalNav9378';b.textContent='🗓️ Mapa semanal';b.onclick=function(){activate('mapaSemanal9378',b,renderWeeklyMap)};sub.appendChild(b)}
}
function packers(){return arr('employees').filter(e=>e.active!==false).sort((a,b)=>sid(a.name).localeCompare(sid(b.name),'pt-BR'))}
async function assignLot(lotId){
 const lot=lotRows().find(x=>sid(x.id)===sid(lotId));if(!lot)return alert('Lote não encontrado.');
 const existing=packAssignmentForLot(lot),emps=packers(),opts=emps.map(e=>'<option value="'+esc(e.id)+'">'+esc(e.name||'Funcionário')+'</option>').join('');
 openModal(existing?'Editar conferência de embalagem':'Atribuir lote para embalagem',
 '<div class="panel"><b>'+esc(lot.productName)+'</b> · '+esc(lot.clientName)+'<br><span class="sub">'+esc(lot.origin)+' · Total recebido: '+lot.qty+'</span><div class="hlgb9378-grade">'+gradeText(lot.grade)+'</div></div>'+
 '<div class="grid"><div class="field"><label>Embaladeira</label><select id="p9378emp">'+opts+'</select></div><div class="field"><label>Embaladas</label><input id="p9378done" type="number" min="0" value="'+q(existing?.doneQty)+'"></div><div class="field"><label>Avarias</label><input id="p9378damage" type="number" min="0" value="'+q(existing?.damagedQty)+'"></div></div>'+
 '<div class="field"><label>Observação / diferenças</label><textarea id="p9378note">'+esc(existing?.notes||'')+'</textarea></div>'+
 '<label><input id="p9378complete" type="checkbox" '+(existing?.concluded?'checked':'')+'> Conferência concluída</label><br><br><button class="primary modalSave">Salvar conferência</button>',
 async()=>{
  const e=emps.find(x=>sid(x.id)===sid(document.getElementById('p9378emp')?.value));if(!e)return alert('Escolha a embaladeira.');
  const done=Math.floor(q(document.getElementById('p9378done')?.value)),damaged=Math.floor(q(document.getElementById('p9378damage')?.value));
  if(done+damaged>lot.qty)return alert('Embaladas + avarias não pode superar o total recebido.');
  const row={...(existing||{}),id:existing?.id||uid('pack'),sourceCutId:lot.id,sourceProductionId:lot.production?.id||'',origin:lot.origin,date:existing?.date||today(),packerId:e.id,packerName:e.name,clientId:lot.order?.clientId||'',clientName:lot.clientName,productId:lot.productId,productName:lot.productName,qty:lot.qty,receivedQty:lot.qty,gradeSnapshot:clone(lot.grade),doneQty:done,damagedQty:damaged,missingQty:Math.max(0,lot.qty-done-damaged),concluded:!!document.getElementById('p9378complete')?.checked,notes:document.getElementById('p9378note')?.value||'',updatedAt:now(),createdAt:existing?.createdAt||now()};
  try{await saveRow('packagingAssignments',row);closeModal();renderPackaging9378()}catch(err){alert(err.message||err)}
 });
 setTimeout(()=>{if(existing){const e=document.getElementById('p9378emp');if(e)e.value=sid(existing.packerId)}},0);
}
function renderPackaging9378(){
 const host=document.getElementById('embalagem9249Host');if(!host)return;
 const lots=lotRows(),as=arr('packagingAssignments');
 const rows=lots.map(l=>{
  const a=packAssignmentForLot(l),done=q(a?.doneQty),dam=q(a?.damagedQty),missing=Math.max(0,l.qty-done-dam);
  return '<tr><td><b>'+esc(l.productName)+'</b><div class="sub">'+esc(l.clientName)+'</div></td><td>'+esc(l.origin)+'</td><td>'+l.qty+'</td><td class="hlgb9378-grade">'+gradeText(l.grade)+'</td><td>'+esc(a?.packerName||'Não atribuída')+'</td><td>'+done+'</td><td>'+missing+'</td><td>'+dam+'</td><td>'+(a?.concluded?'✅ Concluída':'⏳ Em conferência')+'</td><td><button class="primary" onclick="hlgbAssignPackaging9378(\''+esc(l.id)+'\')">'+(a?'Conferir':'Atribuir')+'</button></td></tr>';
 }).join('');
 host.innerHTML='<div class="panel"><h2>📦 Embalagem por lote</h2><div class="sub">Os dados abaixo vêm automaticamente de Corte/Produção. A grade e a origem ficam congeladas na atribuição para preservar a conferência.</div><div class="hlgb9378-table"><table><thead><tr><th>Modelo / cliente</th><th>Origem</th><th>Recebido</th><th>Grade cor + tamanho</th><th>Embaladeira</th><th>Embalado</th><th>Falta</th><th>Avarias</th><th>Conferência</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan="10" class="empty">Nenhum lote disponível.</td></tr>')+'</tbody></table></div></div>'+
 '<div class="panel"><h3>Histórico de conferências</h3><div class="sub">'+as.length+' atribuição(ões) registrada(s).</div></div>';
}
function writeoffCandidates(){
 const out=[];
 lotRows().forEach(l=>out.push({sourceType:'cut',sourceId:l.id,productId:l.productId,productName:l.productName,clientName:l.clientName,qty:l.qty,status:l.status,origin:l.origin}));
 arr('production').forEach(p=>{if(isWrittenOff('production',p.id))return;const o=order(p.orderId);out.push({sourceType:'production',sourceId:sid(p.id),productId:p.productId,productName:productName(p),clientName:orderClient(o),qty:qtyOf(p),status:p.status||'-',origin:'Produção #'+sid(p.id)})});
 const seen=new Set();return out.filter(x=>x.qty>0&&!seen.has(writeoffKey(x.sourceType,x.sourceId))&&seen.add(writeoffKey(x.sourceType,x.sourceId)));
}
function reasonOptions(){return ['Já pago','Produção antiga','Regularização do período sem sistema','Outro'].map(x=>'<option>'+x+'</option>').join('')}
async function commitWriteoffs(items,reason,note){
 if(!items.length)return;
 for(const x of items){
  await saveRow('operationalWriteoffs',{id:uid('baixa'),sourceType:x.sourceType,sourceId:x.sourceId,productId:x.productId,productName:x.productName,clientName:x.clientName,quantity:x.qty,reason,note:note||'',user:userName(),date:today(),createdAt:now()});
 }
}
async function writeoffSelected(){
 const ids=[...document.querySelectorAll('.hlgb9378-writeoff:checked')].map(x=>x.value),c=writeoffCandidates().filter(x=>ids.includes(writeoffKey(x.sourceType,x.sourceId)));
 if(!c.length)return alert('Selecione pelo menos um item.');
 openModal('Dar baixa em '+c.length+' item(ns)','<div class="field"><label>Motivo</label><select id="w9378reason">'+reasonOptions()+'</select></div><div class="field"><label>Observação</label><textarea id="w9378note"></textarea></div><div class="sub">Esta ação não cria nota, pagamento, corte nem lançamento financeiro. O histórico é preservado.</div><button class="primary modalSave">Confirmar baixa</button>',async()=>{
  try{await commitWriteoffs(c,document.getElementById('w9378reason')?.value||'Outro',document.getElementById('w9378note')?.value||'');closeModal();renderWriteoffs();renderWeeklyMap();renderPackaging9378()}catch(e){alert(e.message||e)}
 });
}
function renderWriteoffs(){
 const h=document.getElementById('darBaixa9378Host');if(!h)return;const c=writeoffCandidates(),history=arr('operationalWriteoffs').slice().sort((a,b)=>sid(b.createdAt).localeCompare(sid(a.createdAt)));
 const rows=c.map(x=>'<tr><td><input class="hlgb9378-writeoff" type="checkbox" value="'+esc(writeoffKey(x.sourceType,x.sourceId))+'"></td><td><b>'+esc(x.productName)+'</b><div class="sub">'+esc(x.clientName)+'</div></td><td>'+x.qty+'</td><td>'+esc(x.status)+'</td><td>'+esc(x.origin)+'</td></tr>').join('');
 const hist=history.slice(0,100).map(x=>'<tr><td>'+esc(x.date)+'</td><td>'+esc(x.productName)+'</td><td>'+q(x.quantity)+'</td><td>'+esc(x.reason)+'</td><td>'+esc(x.user)+'</td></tr>').join('');
 h.innerHTML='<div class="panel"><div class="toolbar"><button class="primary" onclick="hlgbWriteoffSelected9378()">✅ Dar baixa nos selecionados</button></div><div class="sub">Baixa individual: marque 1. Baixa em lote: marque vários.</div><div class="hlgb9378-table"><table><thead><tr><th></th><th>Modelo / cliente</th><th>Qtd.</th><th>Status atual</th><th>Origem</th></tr></thead><tbody>'+(rows||'<tr><td colspan="5" class="empty">Nenhuma pendência operacional.</td></tr>')+'</tbody></table></div></div><div class="panel"><h3>Histórico de baixas</h3><div class="hlgb9378-table"><table><thead><tr><th>Data</th><th>Modelo</th><th>Qtd.</th><th>Motivo</th><th>Usuário</th></tr></thead><tbody>'+(hist||'<tr><td colspan="5" class="empty">Nenhuma baixa registrada.</td></tr>')+'</tbody></table></div></div>';
}
function weekBounds(base){
 const d=base?new Date(base+'T12:00:00'):new Date(),day=(d.getDay()+6)%7,start=new Date(d);start.setDate(d.getDate()-day);const end=new Date(start);end.setDate(start.getDate()+6);return {s:isoDate(start),e:isoDate(end)};
}
function weeklyRows(){
 const base=document.getElementById('hlgb9378Week')?.value||today(),{s,e}=weekBounds(base);
 return lotRows().filter(x=>{const d=x.due||x.date;return !d||(d>=s&&d<=e)}).map(x=>({...x,weekStart:s,weekEnd:e}));
}
function renderWeeklyMap(){
 const h=document.getElementById('mapaSemanal9378Host');if(!h)return;
 if(!document.getElementById('hlgb9378Week'))h.innerHTML='<div class="panel hlgb9378-no-print"><div class="toolbar"><div class="field"><label>Semana</label><input id="hlgb9378Week" type="date" value="'+today()+'"></div><button class="secondary" onclick="hlgbRenderWeeklyMap9378()">Atualizar</button><button class="primary" onclick="hlgbPrintWeekly9378(\'admin\')">🖨️ Administração</button><button class="secondary" onclick="hlgbChoosePrint9378(\'cutter\')">🖨️ Cortadores</button><button class="secondary" onclick="hlgbChoosePrint9378(\'location\')">🖨️ Confecções / facções</button></div></div><div id="hlgb9378WeeklyTable"></div>';
 const rows=weeklyRows(),box=document.getElementById('hlgb9378WeeklyTable');if(!box)return;
 const total=rows.reduce((a,x)=>a+x.qty,0);
 const tr=rows.map(x=>'<tr><td><b>'+esc(x.productName)+'</b></td><td>'+esc(x.clientName)+'</td><td>'+x.qty+'</td><td class="hlgb9378-grade">'+gradeText(x.grade)+'</td><td>'+esc(x.priority)+'</td><td>'+esc(x.due||'-')+'</td><td>'+esc(x.status)+'</td><td>'+esc(x.cutterName)+'</td><td>'+esc(x.locationName)+'</td><td>'+esc(x.origin)+'</td></tr>').join('');
 box.innerHTML='<div class="cards"><div class="card"><small>Semana</small><strong style="font-size:16px">'+esc(rows[0]?.weekStart||weekBounds(today()).s)+' a '+esc(rows[0]?.weekEnd||weekBounds(today()).e)+'</strong></div><div class="card"><small>Modelos/lotes</small><strong>'+rows.length+'</strong></div><div class="card"><small>Total geral — administração</small><strong>'+total+'</strong></div></div><div class="panel hlgb9378-table"><table><thead><tr><th>Modelo</th><th>Cliente</th><th>Qtd.</th><th>Grade / cor</th><th>Prioridade</th><th>Prazo</th><th>Status</th><th>Cortador</th><th>Local</th><th>Origem</th></tr></thead><tbody>'+(tr||'<tr><td colspan="10" class="empty">Sem itens nesta semana.</td></tr>')+'</tbody></table></div>';
}
function choosePrint(type){
 const rows=weeklyRows(),vals=[...new Set(rows.map(x=>type==='cutter'?x.cutterName:x.locationName).filter(x=>x&&x!=='-'))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 if(!vals.length)return alert('Nenhum responsável/local disponível nesta semana.');
 openModal(type==='cutter'?'Imprimir para cortador':'Imprimir para confecção/facção','<div class="field"><label>Escolha</label><select id="print9378">'+vals.map(x=>'<option>'+esc(x)+'</option>').join('')+'</select></div><button class="primary modalSave">Abrir impressão</button>',()=>{const v=document.getElementById('print9378')?.value;closeModal();printWeekly(type,v)});
}
function printWeekly(type,value){
 let rows=weeklyRows();if(type==='cutter')rows=rows.filter(x=>x.cutterName===value);if(type==='location')rows=rows.filter(x=>x.locationName===value);
 const admin=type==='admin',title=admin?'Mapa de Produção Semanal — Administração':type==='cutter'?'Mapa do Cortador — '+value:'Mapa da Confecção/Facção — '+value;
 const cols=admin?['Modelo','Cliente','Qtd.','Grade / cor','Prioridade','Prazo','Status','Cortador','Local']:type==='cutter'?['Modelo','Cliente','Qtd.','Grade / cor','Prioridade','Prazo']:['Modelo','Cliente','Qtd.','Grade / cor','Prioridade','Prazo','Status'];
 const body=rows.map(x=>'<tr>'+(
   admin?[x.productName,x.clientName,x.qty,gradeText(x.grade),x.priority,x.due||'-',x.status,x.cutterName,x.locationName]:
   type==='cutter'?[x.productName,x.clientName,x.qty,gradeText(x.grade),x.priority,x.due||'-']:
   [x.productName,x.clientName,x.qty,gradeText(x.grade),x.priority,x.due||'-',x.status]
 ).map(v=>'<td>'+(/<div|<b>/.test(sid(v))?sid(v):esc(v))+'</td>').join('')+'</tr>').join('');
 const total=rows.reduce((a,x)=>a+x.qty,0),w=window.open('','_blank');if(!w)return alert('O navegador bloqueou a janela de impressão.');
 w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+esc(title)+'</title><style>body{font-family:Arial;padding:24px;color:#222}h1{font-size:22px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:7px;font-size:11px;vertical-align:top}th{background:#eee}.grade{font-size:10px}</style></head><body><h1>'+esc(title)+'</h1><p>Semana '+esc(rows[0]?.weekStart||weekBounds(today()).s)+' a '+esc(rows[0]?.weekEnd||weekBounds(today()).e)+'</p>'+(admin?'<p><b>Total geral: '+total+' peças</b></p>':'')+'<table><thead><tr>'+cols.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>');w.document.close();
}
function installPackagingOverride(){
 const old=window.renderPackaging;if(typeof old==='function'&&!old.__hlgb9378){const w=function(){const r=old.apply(this,arguments);setTimeout(renderPackaging9378,0);return r};w.__hlgb9378=true;w.__original=old;window.renderPackaging=w}
}
function boot(){ensureStyle();ensurePages();ensureNav();installPackagingOverride();setTimeout(renderPackaging9378,80)}
window.hlgbAssignPackaging9378=assignLot;
window.hlgbWriteoffSelected9378=writeoffSelected;
window.hlgbRenderWeeklyMap9378=renderWeeklyMap;
window.hlgbChoosePrint9378=choosePrint;
window.hlgbPrintWeekly9378=printWeekly;
window.hlgbProductionOps9378={version:V,lotRows,weeklyRows,isWrittenOff,renderPackaging:renderPackaging9378,renderWriteoffs,renderWeeklyMap};
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,900),0)}catch(e){}
setTimeout(boot,1900);setInterval(()=>{ensureNav();installPackagingOverride()},5000);
console.info('[HLGB] v'+V+' Embalagem + Dar baixa + Mapa Semanal ativos');
})();