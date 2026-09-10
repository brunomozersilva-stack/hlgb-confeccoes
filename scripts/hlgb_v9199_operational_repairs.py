from pathlib import Path
import re, subprocess, tempfile

p=Path('index.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9199_START -->'
END='<!-- HLGB_V9199_END -->'
if START in s and END in s:
    a=s.index(START); b=s.index(END,a)+len(END); s=s[:a]+s[b:]

# Título e logo-base: a versão final também é reforçada no boot pós-login.
s=re.sub(r'(<title>HLGB Confecções — Sistema de Gestão )v91\.\d+( Multiusuário</title>)',r'\1v91.99\2',s,count=1)
s=re.sub(r'(<div class="logo">HLGB <b>CONFECÇÕES</b> <small[^>]*>)v91\.\d+(</small>)',r'\1v91.99\2',s,count=1)

# Uma rotina histórica v91.73 mantinha um MutationObserver forçando v91.90 no logo.
s=s.replace("new MutationObserver(()=>{if(logo.textContent!=='v91.90')logo.textContent='v91.90'}).observe(logo,{childList:true,characterData:true,subtree:true})","/* v91.99: não forçar versão histórica no logo */")

# O pedido continua com o controle de separação em paralelo, mas o texto não pode dizer que Corte depende dele.
s=s.replace('Pedido salvo. Agora confirme a compra necessária e a separação do material; depois ele será liberado automaticamente para o Corte.','Pedido salvo e liberado imediatamente para o Corte. A compra e a separação de material continuam em paralelo e não bloqueiam os cortadores.')

addon=r'''<!-- HLGB_V9199_START -->
<style id="hlgb-v9199-style">
.hlgb9199-grade{overflow:auto;margin:10px 0 16px}.hlgb9199-grade table{min-width:420px}.hlgb9199-actions{display:flex;gap:6px;flex-wrap:wrap}.hlgb9199-note{padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:#fff8fb;margin:8px 0;font-size:12px}
</style>
<script id="hlgb-v9199-script">
(function(){
'use strict';
const n9199=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const q9199=v=>Math.max(0,+v||0);
const clone9199=o=>{try{return structuredClone(o)}catch(e){return JSON.parse(JSON.stringify(o))}};
const esc9199=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
const fmt9199=v=>(+v||0).toLocaleString('pt-BR',{maximumFractionDigits:3});
function setVersion9199(){try{let x=document.querySelector('#appShell .logo small');if(x)x.textContent='v91.99'}catch(e){}try{document.title='HLGB Confecções — Sistema de Gestão v91.99 Multiusuário'}catch(e){}}
function arr9199(name){db[name]=Array.isArray(db[name])?db[name]:[];return db[name]}
function upsert9199(module,row){let a=arr9199(module),i=a.findIndex(x=>String(x.id)===String(row.id));if(i>=0)a[i]=clone9199(row);else a.push(clone9199(row));return row}

// ---------------------------------------------------------------------------
// 1. Pedido entra no Corte imediatamente. Separação de material é paralela.
// ---------------------------------------------------------------------------
function terminalCut9199(c){let s=n9199(c?.status);return !!(c&&(c.done===true||c.fulfilledAt||['finalizado','cancelado','concluido','concluído'].includes(s)||s.includes('atendido por producao')))}
function orderProductIds9199(o){let ids=[...new Set((o?.grade||[]).map(x=>String(x.productId||'')).filter(Boolean))];if(!ids.length&&o?.productId!=null)ids=[String(o.productId)];return ids}
function orderFulfilled9199(o){let ids=orderProductIds9199(o);return !!(ids.length&&ids.every(pid=>o?.fulfillmentByProduct?.[pid]?.completed===true))}
function orderNeedsCut9199(o){
  if(!o||o.invoiceReady||o.noteReady)return false;
  let s=n9199(o.status);
  if(s.includes('cancel')||s.includes('aguardando nota')||s.includes('nota emitida')||s.includes('mercadoria pronta')||s.includes('pedido finalizado')||s.includes('pedido em producao')||s==='producao'||s==='produção'||s.includes('corte finalizado'))return false;
  if(orderFulfilled9199(o))return false;
  // Se já há um corte terminal que representa o pedido inteiro, não recrie outro.
  let qty=typeof qtyOfOrder==='function'?q9199(qtyOfOrder(o)):q9199(o.qty||o.totalQty);
  let terminal=arr9199('cuts').filter(c=>String(c.orderId)===String(o.id)&&terminalCut9199(c));
  if(terminal.some(c=>q9199(c.pieces)>=qty&&qty>0))return false;
  return true;
}
function activeCuts9199(o){return arr9199('cuts').filter(c=>String(c.orderId)===String(o.id)&&!terminalCut9199(c))}
function makeOrderCut9199(o){
  let qty=typeof qtyOfOrder==='function'?q9199(qtyOfOrder(o)):q9199(o.qty||o.totalQty),id=Number(o.id)+1;
  if(!Number.isFinite(id)||arr9199('cuts').some(c=>String(c.id)===String(id)&&String(c.orderId)!==String(o.id)))id=Date.now()+Math.floor(Math.random()*1000000);
  return {id,orderId:o.id,client:o.client||'',op:'PED-'+o.id,productId:o.productId?+o.productId:null,product:String(o.items||'Pedido'),fabric:'',color:'',size:'',layers:0,meters:0,pieces:qty,productionLocationId:null,cutterId:null,cutType:'',status:'Planejado',date:o.date||(typeof isoDate==='function'?isoDate(new Date()):new Date().toISOString().slice(0,10)),plannedCutDate:o.plannedCutDate||'',autoOrderCutV9199:true,materialSeparationParallel:true,createdAt:new Date().toISOString()};
}
window.pedidosQuePrecisamDeCorte=function(){return arr9199('orders').filter(orderNeedsCut9199)};
window.obterCorteDoPedido=function(o){
  let active=activeCuts9199(o);
  if(active.length){
    // Não cria nada se já existe qualquer corte operacional para este pedido.
    let c=active.find(x=>x.autoOrderCutV9199)||active[0];
    if(c.autoOrderCutV9199){c.client=o.client||c.client||'';c.product=String(o.items||c.product||'Pedido');c.pieces=typeof qtyOfOrder==='function'?q9199(qtyOfOrder(o)):q9199(o.qty||o.totalQty)}
    return c;
  }
  if(!orderNeedsCut9199(o))return arr9199('cuts').find(c=>String(c.orderId)===String(o.id))||null;
  let c=makeOrderCut9199(o);arr9199('cuts').push(c);return c;
};
window.syncOrdersToCuts=function(){
  let changed=false;
  arr9199('orders').forEach(o=>{
    if(!orderNeedsCut9199(o))return;
    let active=activeCuts9199(o);
    if(active.length){
      let auto=active.find(x=>x.autoOrderCutV9199);
      if(auto){let qty=typeof qtyOfOrder==='function'?q9199(qtyOfOrder(o)):q9199(o.qty||o.totalQty),prod=String(o.items||'Pedido');if(auto.pieces!==qty||auto.client!==(o.client||'')||auto.product!==prod){auto.pieces=qty;auto.client=o.client||'';auto.product=prod;auto.updatedAt=new Date().toISOString();changed=true}}
      return;
    }
    arr9199('cuts').push(makeOrderCut9199(o));changed=true;
  });
  return changed;
};
const oldSave9199=window.save;
if(typeof oldSave9199==='function')window.save=function(){try{window.syncOrdersToCuts()}catch(e){console.warn('v91.99 sync pedido→corte',e)}return oldSave9199.apply(this,arguments)};

// ---------------------------------------------------------------------------
// 2. Gravação confirmada da facção (incluindo PIX).
// ---------------------------------------------------------------------------
async function saveRow9199(module,row){
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  if(!window.cloudAccessToken&&typeof cloudAccessToken!=='undefined'&&!cloudAccessToken)throw new Error('A sessão com a nuvem não está pronta.');
  if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('O gravador por registro ainda não carregou.');
  let out=await window.hlgbRecordSaveWithRetry(module,String(row.id),clone9199(row),false);
  if(!out||out.applied===false)throw new Error('A nuvem não confirmou a gravação de '+module+'.');
  return clone9199(out.data||row);
}
function facMasterRender9199(){try{window.renderFactionMasters?.()}catch(e){}try{window.renderProductionLocations?.()}catch(e){}try{window.renderFactions?.()}catch(e){}}
function factionPayload9199(base){
  let serviceTypeIds=typeof collectFactionServices==='function'?collectFactionServices():[],machineIds=typeof collectFactionMachines==='function'?collectFactionMachines():[];
  return {...clone9199(base||{}),name:(document.getElementById('mfname')?.value||'').trim(),address:(document.getElementById('mfaddress')?.value||'').trim(),phone:(document.getElementById('mfphone')?.value||'').trim(),pix:(document.getElementById('mfpix')?.value||'').trim(),serviceTypeIds,machineIds,serviceType:typeof selectedCatalogNames==='function'?selectedCatalogNames(serviceTypeIds,db.serviceTypes):'',machines:typeof selectedCatalogNames==='function'?selectedCatalogNames(machineIds,db.machines):'',productionLocationId:document.getElementById('mflocation')?.value?+document.getElementById('mflocation').value:null,active:base?.active!==false,updatedAt:new Date().toISOString()};
}
window.newFactionMaster=function(){
  openModal('Nova facção',factionMasterForm()+'<button type="button" class="primary modalSave">☁️ Salvar facção</button>',async()=>{
    let base={id:Date.now()+Math.floor(Math.random()*1000),active:true,createdAt:new Date().toISOString()},next=factionPayload9199(base);if(!next.name){alert('Informe o nome da facção.');return false}
    let btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='☁️ Confirmando…'}
    try{let saved=await saveRow9199('factionMasters',next);upsert9199('factionMasters',saved);try{localSaveOnly()}catch(e){}closeModal();facMasterRender9199();alert('Facção cadastrada e confirmada na nuvem.');return true}catch(e){if(btn){btn.disabled=false;btn.textContent='☁️ Salvar facção'}alert('Não foi possível confirmar a facção na nuvem. Nada deve ser considerado salvo. '+String(e?.message||e));return false}
  });
};
window.editFactionMaster=function(id){
  let f=arr9199('factionMasters').find(x=>String(x.id)===String(id));if(!f)return;
  openModal('Editar facção',factionMasterForm(f)+'<button type="button" class="primary modalSave">☁️ Salvar alterações</button>',async()=>{
    let next=factionPayload9199(f);if(!next.name){alert('Informe o nome da facção.');return false}
    let btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='☁️ Confirmando…'}
    try{let saved=await saveRow9199('factionMasters',next);upsert9199('factionMasters',saved);try{localSaveOnly()}catch(e){}closeModal();facMasterRender9199();alert('Facção atualizada e confirmada na nuvem.');return true}catch(e){if(btn){btn.disabled=false;btn.textContent='☁️ Salvar alterações'}alert('A alteração não foi confirmada na nuvem e não será dada como concluída. '+String(e?.message||e));return false}
  });
};

// ---------------------------------------------------------------------------
// 3. Hub Financeiro: gravação por registro + recuperação de carga.
// ---------------------------------------------------------------------------
window.newHubFinanceEntry=function(flow){
  if(typeof hlgb916EnsureData==='function')hlgb916EnsureData();
  openModal('Nova '+String(flow||'').toLowerCase()+' prevista',hlgb916HubForm({flow})+'<button type="button" class="primary modalSave">☁️ Salvar lançamento</button>',async()=>{
    let d=hlgb916ReadHubForm(flow);if(!d)return false;
    let next={id:Date.now()+Math.floor(Math.random()*9999),...d,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    let btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='☁️ Confirmando…'}
    try{let saved=await saveRow9199('hubFinanceEntries',next);upsert9199('hubFinanceEntries',saved);try{localSaveOnly()}catch(e){}closeModal();try{renderHubFinance()}catch(e){}alert('Lançamento confirmado na nuvem.');return true}catch(e){if(btn){btn.disabled=false;btn.textContent='☁️ Salvar lançamento'}alert('O lançamento não foi confirmado na nuvem. '+String(e?.message||e));return false}
  });
  setTimeout(()=>{try{hlgb916ToggleHubChequeDate()}catch(e){}},20);
};
async function loadModuleDirect9199(module){
  if(typeof cloudRequest!=='function')return false;
  let rows=await cloudRequest('hlgb_records?select=entity_id,data,revision,updated_at,deleted_at&module=eq.'+encodeURIComponent(module)+'&order=updated_at.asc&limit=2000',{method:'GET'});
  if(!Array.isArray(rows))return false;
  let remote=new Map(rows.map(r=>[String(r.entity_id),r])),local=arr9199(module),out=[];
  rows.forEach(r=>{if(!r.deleted_at&&r.data&&typeof r.data==='object')out.push(clone9199(r.data))});
  // Preserva somente itens locais que nem sequer existem no servidor; podem ser pendências antigas ainda não enviadas.
  local.forEach(x=>{if(x?.id!=null&&!remote.has(String(x.id)))out.push(clone9199(x))});
  db[module]=out;try{localSaveOnly()}catch(e){};return true;
}
async function recoverRecordLoad9199(){
  if(!cloudAccessToken)return false;
  let full=typeof hlgbRecordReady!=='undefined'&&hlgbRecordReady;
  if(!full&&typeof hlgbLoadNormalizedCore==='function'){
    for(let i=0;i<2&&!full;i++){
      try{await new Promise(r=>setTimeout(r,i?700:180));full=!!(await hlgbLoadNormalizedCore({preserveLocal:true}));if(typeof hlgbRecordReady!=='undefined'&&full)hlgbRecordReady=true}catch(e){console.warn('v91.99 nova tentativa de carga',e)}
    }
  }
  let hub=false,fac=false;
  try{hub=await loadModuleDirect9199('hubFinanceEntries')}catch(e){console.warn('v91.99 hub load',e)}
  try{fac=await loadModuleDirect9199('factionMasters')}catch(e){console.warn('v91.99 facções load',e)}
  try{if(hub&&document.querySelector('.page.active')?.id==='hubFinance')renderHubFinance()}catch(e){}
  try{if(fac)facMasterRender9199()}catch(e){}
  if(full){try{setCloudStatus('⚡ Online · dados carregados','ok');setTimeout(()=>setCloudStatus('⚡ Online · multiusuário','ok'),1000)}catch(e){}}
  else if(hub||fac){try{setCloudStatus('⚠️ Nuvem parcial · dados críticos recuperados')}catch(e){}}
  return full||hub||fac;
}
window.hlgbRecoverRecordLoad9199=recoverRecordLoad9199;

// ---------------------------------------------------------------------------
// 4. Checklist: grade + aviamento por cor + quantidade de rolos.
// ---------------------------------------------------------------------------
function product9199(id){return arr9199('products').find(x=>String(x.id)===String(id))||null}
function order9199(id){return arr9199('orders').find(x=>String(x.id)===String(id))||null}
function materialMaster9199(m){let x=m?.materialId?arr9199('materials').find(a=>String(a.id)===String(m.materialId)):null;if(!x&&m?.name)x=arr9199('materials').find(a=>n9199(a.name)===n9199(m.name));return x||null}
function sourceGrade9199(c){
  let pid=String(c?.productId||''),cut=arr9199('cuts').find(x=>String(x.id)===String(c?.cutId)),a=[];
  if(Array.isArray(c?.grade)&&c.grade.length)a=c.grade;else if(Array.isArray(cut?.actualCutGrade)&&cut.actualCutGrade.length)a=cut.actualCutGrade;else if(Array.isArray(cut?.originalGrade)&&cut.originalGrade.length)a=cut.originalGrade;else a=order9199(c?.orderId)?.grade||[];
  if(pid)a=a.filter(x=>String(x.productId||pid)===pid);
  return a.map(x=>({productId:x.productId||c?.productId||null,color:String(x.color||''),size:String(x.size||''),qty:q9199(x.qty),noGrade:!!x.noGrade})).filter(x=>x.qty>0);
}
function scaledGrade9199(c){let g=sourceGrade9199(c),target=Math.floor(q9199(c?.qty)),total=Math.floor(g.reduce((a,x)=>a+q9199(x.qty),0));if(!g.length||!target||!total||target===total)return {rows:g,estimated:false};let calc=g.map((x,i)=>{let raw=q9199(x.qty)*target/total,b=Math.floor(raw);return {...x,qty:b,_f:raw-b,_i:i}}),left=target-calc.reduce((a,x)=>a+x.qty,0);calc.slice().sort((a,b)=>b._f-a._f||a._i-b._i).slice(0,left).forEach(x=>calc[x._i].qty++);return {rows:calc.map(({_f,_i,...x})=>x).filter(x=>x.qty>0),estimated:true}}
function gradeHtml9199(c){let g=scaledGrade9199(c);if(!g.rows.length)return '<div class="empty" style="padding:10px">Sem grade detalhada.</div>';if(g.rows.every(x=>x.noGrade||(!x.color&&!x.size)))return '<div class="hlgb9199-note">Produto lançado sem grade detalhada. Total: <b>'+fmt9199(g.rows.reduce((a,x)=>a+x.qty,0))+' peças</b>.</div>';return (g.estimated?'<div class="hlgb9199-note">⚠️ Envio parcial: grade distribuída proporcionalmente ao corte/pedido.</div>':'')+'<div class="hlgb9199-grade"><table><tr><th>Cor</th><th>Tamanho</th><th>Quantidade</th></tr>'+g.rows.map(x=>'<tr><td>'+esc9199(x.color||'-')+'</td><td>'+esc9199(x.size||'-')+'</td><td><b>'+fmt9199(x.qty)+'</b></td></tr>').join('')+'</table></div>'}
function need9199(pieces,m){try{return typeof materialNeedForPieces==='function'?q9199(materialNeedForPieces(pieces,m)):(n9199(m.calcMode)==='yield'?q9199(pieces)/q9199(m.qty):q9199(pieces)*q9199(m.qty))}catch(e){return 0}}
function rolls9199(m,need){let master=materialMaster9199(m),conv=0;if(!master)return null;let pm=n9199(master.purchaseMode),pu=n9199(master.purchaseUnit),pn=n9199(master.packageName);if((pm.includes('rolo')||pu.includes('rolo'))&&q9199(master.purchaseConversion)>0)conv=q9199(master.purchaseConversion);else if(pn.includes('rolo')&&q9199(master.packageAvg)>0)conv=q9199(master.packageAvg);if(!conv)return null;return {count:Math.ceil(need/conv-1e-9),conv}}
function checklistMaterials9199(c){
  let p=product9199(c?.productId),g=scaledGrade9199(c),byColor={};g.rows.forEach(x=>{let color=x.color||'Sem cor';byColor[color]=(byColor[color]||0)+q9199(x.qty)});if(!Object.keys(byColor).length)byColor.Total=q9199(c?.qty);
  let old=new Map((c?.materials||[]).map(x=>[[x.materialId||'',x.name||'',x.color||''].join('|'),!!x.checked])),out=[];
  (p?.materials||[]).forEach((m,i)=>{let master=materialMaster9199(m),avi=n9199(m.cat||master?.cat).includes('aviamento'),parts=avi?Object.entries(byColor):[['Total',q9199(c?.qty)]];parts.forEach(([color,pieces])=>{let need=need9199(pieces,m),ri=rolls9199(m,need),key=[m.materialId||master?.id||'',m.name||master?.name||'',avi?color:''].join('|');out.push({id:i+1,materialId:m.materialId||master?.id||null,name:m.name||master?.name||'Material',cat:m.cat||master?.cat||'',unit:m.unit||master?.unit||'',color:avi?color:'',pieces:q9199(pieces),qty:need,rolls:ri?.count??null,rollConversion:ri?.conv||0,key9199:key,checked:old.get(key)??false})})});return out;
}
function hydrateChecklist9199(c){if(c)c.materials=checklistMaterials9199(c);return c}
const oldCreateChecklist9199=window.hlgb916CreateMaterialChecklist;
if(typeof oldCreateChecklist9199==='function')window.hlgb916CreateMaterialChecklist=function(){let c=oldCreateChecklist9199.apply(this,arguments);hydrateChecklist9199(c);return c};
window.openMaterialChecklist=function(id){
  let c=arr9199('materialChecklists').find(x=>String(x.id)===String(id));if(!c)return;hydrateChecklist9199(c);
  let rows=(c.materials||[]).map((m,i)=>'<tr><td><input type="checkbox" class="destinationMaterialCheck" data-i="'+i+'" '+(m.checked?'checked':'')+'></td><td><b>'+esc9199(m.name)+'</b></td><td>'+esc9199(m.cat||'-')+'</td><td>'+esc9199(m.color||'Total')+'</td><td>'+fmt9199(m.qty)+'</td><td>'+esc9199(m.unit||'')+'</td><td>'+(m.rolls!=null?'<b>'+m.rolls+' rolo'+(m.rolls===1?'':'s')+'</b><div class="sub">'+fmt9199(m.rollConversion)+' '+esc9199(m.unit||'')+'/rolo</div>':'-')+'</td></tr>').join('');
  openModal('Checklist da facção','<div class="grid"><div class="field"><label>Destino</label><input value="'+esc9199(c.destinationName||'')+'" disabled></div><div class="field"><label>Modelo</label><input value="'+esc9199(c.productName||'')+'" disabled></div><div class="field"><label>Peças</label><input value="'+fmt9199(c.qty)+'" disabled></div></div><h3>📐 Grade do produto</h3>'+gradeHtml9199(c)+'<div class="toolbar"><button type="button" class="secondary" onclick="document.querySelectorAll(\'.destinationMaterialCheck\').forEach(x=>x.checked=true)">Marcar todos</button><button type="button" class="secondary" onclick="printMaterialChecklist('+Number(c.id)+')">🖨️ Imprimir folha</button></div><div style="overflow:auto"><table><tr><th>OK</th><th>Material</th><th>Categoria</th><th>Cor</th><th>Quantidade</th><th>Unidade</th><th>Rolos</th></tr>'+ (rows||'<tr><td colspan="7">Sem materiais cadastrados na ficha técnica.</td></tr>')+'</table></div><div class="grid"><div class="field"><label>Conferido por</label><input id="checkReceivedBy" value="'+esc9199(c.receivedBy||'')+'"></div><div class="field"><label>Data</label><input id="checkReceivedAt" type="date" value="'+(c.receivedAt||(typeof isoDate==='function'?isoDate(new Date()):new Date().toISOString().slice(0,10)))+'"></div><div class="field"><label>Observação</label><input id="checkNote" value="'+esc9199(c.note||'')+'"></div></div><button type="button" class="primary modalSave">☁️ Salvar conferência</button>',async()=>{
    let next=clone9199(c);(next.materials||[]).forEach((m,i)=>m.checked=!!document.querySelector('.destinationMaterialCheck[data-i="'+i+'"]')?.checked);next.receivedBy=document.getElementById('checkReceivedBy')?.value||'';next.receivedAt=document.getElementById('checkReceivedAt')?.value||'';next.note=document.getElementById('checkNote')?.value||'';next.status=(next.materials||[]).length&&next.materials.every(m=>m.checked)?'Conferido':((next.materials||[]).length?'Pendente':'Conferido');next.updatedAt=new Date().toISOString();let btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='☁️ Confirmando…'}try{let saved=await saveRow9199('materialChecklists',next);upsert9199('materialChecklists',saved);try{localSaveOnly()}catch(e){}closeModal();try{window.renderFactionChecklists9198?.()}catch(e){}alert('Checklist confirmado na nuvem.');return true}catch(e){if(btn){btn.disabled=false;btn.textContent='☁️ Salvar conferência'}alert('O checklist não foi confirmado na nuvem. '+String(e?.message||e));return false}
  });
};
window.printMaterialChecklist=function(id){
  let c=arr9199('materialChecklists').find(x=>String(x.id)===String(id));if(!c)return;hydrateChecklist9199(c);let mats=(c.materials||[]).map(m=>'<tr><td>☐</td><td>'+esc9199(m.name)+'</td><td>'+esc9199(m.cat||'-')+'</td><td>'+esc9199(m.color||'Total')+'</td><td>'+fmt9199(m.qty)+'</td><td>'+esc9199(m.unit||'')+'</td><td>'+(m.rolls!=null?m.rolls+' rolo'+(m.rolls===1?'':'s'):'-')+'</td></tr>').join(''),w=window.open('','_blank');if(!w){alert('Permita pop-ups para imprimir.');return}w.document.write('<html><head><title>Checklist — '+esc9199(c.destinationName||'')+'</title><style>body{font-family:Arial;padding:26px;color:#222}table{width:100%;border-collapse:collapse;margin:10px 0 18px}th,td{border:1px solid #aaa;padding:7px;font-size:12px;text-align:left}h1{font-size:21px}h2{font-size:16px}</style></head><body><h1>HLGB Confecções — Checklist da facção</h1><p><b>Facção:</b> '+esc9199(c.destinationName||'-')+'<br><b>Modelo:</b> '+esc9199(c.productName||'-')+'<br><b>Quantidade:</b> '+fmt9199(c.qty)+' peças</p><h2>Grade do produto</h2>'+gradeHtml9199(c)+'<h2>Matéria-prima / aviamentos</h2><table><tr><th>OK</th><th>Material</th><th>Categoria</th><th>Cor</th><th>Quantidade</th><th>Unidade</th><th>Rolos</th></tr>'+(mats||'<tr><td colspan="7">Sem materiais cadastrados.</td></tr>')+'</table><p>Conferido por: __________________________ Data: ____/____/________</p><p>Observação: ______________________________________________________________</p><script>window.onload=()=>window.print();<\/script></body></html>');w.document.close();
};

// ---------------------------------------------------------------------------
// 5. Entrega de facções: botão Registrar falta dentro do renderer oficial.
// ---------------------------------------------------------------------------
window.renderFactionDelivery935=function(){
  try{if(typeof ensureFactionPanel935==='function')ensureFactionPanel935()}catch(e){}let el=document.getElementById('factionDeliveryTable935');if(!el)return;
  let a=arr9199('factions').filter(f=>q9199(f.sent)>0).slice().sort((x,y)=>{let xb=q9199(x.sent)-q9199(x.done)-q9199(x.defects)-q9199(x.waste),yb=q9199(y.sent)-q9199(y.done)-q9199(y.defects)-q9199(y.waste);return (xb>0?0:1)-(yb>0?0:1)||String(y.sentAt||y.date||'').localeCompare(String(x.sentAt||x.date||''))});
  el.innerHTML=a.length?table(['Facção','Pedido','Modelo','Enviado','Já entregue','Faltas/defeitos','Saldo','Última entrega','Pagamento','Situação','Ação'],a.map(f=>{let o=arr9199('orders').find(x=>String(x.id)===String(f.orderId)),sent=q9199(f.sent),done=q9199(f.done),loss=q9199(f.defects)+q9199(f.waste),bal=Math.max(0,sent-done-loss),hist=Array.isArray(f.deliveryHistory)?f.deliveryHistory:[],last=hist[hist.length-1],status=bal>0?'<span class="badge warn">Em produção</span>':'<span class="badge ok">Finalizado</span>',name=typeof productName935==='function'?productName935(f):(product9199(f.productId)?.name||f.description||'-'),actions=bal>0?'<div class="hlgb9199-actions"><button type="button" class="primary" onclick="registerFactionDelivery935('+Number(f.id)+')">📦 Registrar entrega</button><button type="button" class="secondary" onclick="hlgbRegisterFactionMissing9197('+Number(f.id)+')">⚠️ Registrar falta</button></div>':'<span class="sub">Entrega concluída</span>';return [esc9199(f.name||'-'),o?'#'+esc9199(typeof displayOrderNumber==='function'?displayOrderNumber(o):o.id):esc9199(f.op||'-'),'<b>'+esc9199(name)+'</b>',fmt9199(sent),fmt9199(done),fmt9199(loss),fmt9199(bal),last?.date?(typeof fmtDate==='function'?fmtDate(last.date):last.date):(f.lastDeliveryAt?(typeof fmtDate==='function'?fmtDate(f.lastDeliveryAt):f.lastDeliveryAt):'-'),last?.paymentWeek?esc9199(last.paymentWeek):'-',status,actions]})):'<div class="empty">Nenhum envio de facção encontrado.</div>';
};

// Garante que a Separação continue mostrando a grade (o painel v91.98 já faz a montagem detalhada).
const oldRenderSeparation9199=window.renderSeparation;
if(typeof oldRenderSeparation9199==='function')window.renderSeparation=function(){let r=oldRenderSeparation9199.apply(this,arguments);setTimeout(()=>{try{window.separationGradePanel9198?.()}catch(e){}},0);return r};

async function boot9199(){
  setVersion9199();
  // Só depois do login: evita reintroduzir as rotinas pesadas do pré-login.
  try{await recoverRecordLoad9199()}catch(e){console.warn('v91.99 recuperação pós-login',e)}
  let changed=false;try{changed=window.syncOrdersToCuts()}catch(e){console.warn(e)}
  if(changed){try{localSaveOnly();if(typeof hlgbQueueNormalizedSync==='function')hlgbQueueNormalizedSync(120);else if(typeof persistDb==='function')persistDb()}catch(e){console.warn('v91.99 persistência corte',e)}}
  try{window.renderFactionDelivery935()}catch(e){}
  try{window.renderFactionChecklists9198?.()}catch(e){}
  try{if(document.querySelector('.page.active')?.id==='cortes')window.renderCuts?.()}catch(e){}
  setVersion9199();
}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot9199,900),0)}catch(e){}
setTimeout(setVersion9199,2200);
console.log('HLGB v91.99: corte imediato, salvamento confirmado de facções/Hub, recuperação de carga, checklist e faltas.');
})();
</script>
<!-- HLGB_V9199_END -->'''

if '</body>' not in s: raise SystemExit('Fechamento </body> não encontrado')
s=s.replace('</body>',addon+'\n</body>',1)

for marker in ['HLGB_V9199_START','window.pedidosQuePrecisamDeCorte','materialSeparationParallel','window.editFactionMaster','hubFinanceEntries','hlgbRecoverRecordLoad9199','Grade do produto','Registrar falta','function doLogin()','HLGB_SUPABASE_URL','</html>']:
    if marker not in s: raise SystemExit('Marcador obrigatório ausente: '+marker)
if len(s)<1_000_000: raise SystemExit('index.html ficou pequeno demais')

scripts=re.findall(r'<script[^>]*>(.*?)</script>',s,flags=re.S|re.I)
with tempfile.TemporaryDirectory() as td:
    for i,js in enumerate(scripts):
        fp=Path(td)/f's{i}.js';fp.write_text(js,encoding='utf-8')
        r=subprocess.run(['node','--check',str(fp)],capture_output=True,text=True)
        if r.returncode: raise SystemExit(f'JS inválido no bloco {i}: {r.stderr}')

p.write_text(s,encoding='utf-8')
print('HLGB v91.99 aplicado:',len(s),'bytes; JS blocks:',len(scripts))
