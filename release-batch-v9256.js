/* HLGB v92.56 — pacote: Relatórios, Cadastro de Facções e envio do Assistente */
(function(){
'use strict';
const V='92.56';
const sid=v=>String(v??'');
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const q=v=>Math.max(0,Number(v)||0);
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const arr=n=>{try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}};
const money=v=>{try{return typeof window.money==='function'?window.money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+Number(v||0).toFixed(2).replace('.',',')}};
const fmt=v=>{try{return typeof window.fmtDate==='function'?window.fmtDate(v):sid(v)}catch(e){return sid(v)}};
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0').replace(/[^0-9.]/g,''))||0;if(cur>92.56)return;window.HLGB_RELEASE_VERSION=V;const x=document.querySelector('#appShell .logo small');if(x)x.textContent='v'+V;const b=document.querySelector('#loginScreen b');if(b&&/Versão/i.test(b.textContent||''))b.textContent='Versão v'+V}catch(e){}}

/* ================= RELATÓRIOS ================= */
function rowDate(x){return sid(x?.date||x?.createdAt||x?.invoiceDate||x?.paymentDate||x?.finishedAt||x?.sentAt||x?.updatedAt).slice(0,10)}
function inRange(x,s,e){const d=rowDate(x);return (!s||!d||d>=s)&&(!e||!d||d<=e)}
function groupSum(items,keyFn,valFn){
 const m={};for(const x of items){const k=sid(keyFn(x)||'Sem informação').trim()||'Sem informação';m[k]=(m[k]||0)+q(valFn(x))}
 return Object.entries(m).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);
}
function reportData9256(s,e){
 const orders=arr('orders').filter(x=>inRange(x,s,e)&&!['Cancelado'].includes(x.status));
 const products={};for(const o of orders)for(const g of (o.grade||[])){const p=arr('products').find(x=>sid(x.id)===sid(g.productId)),name=p?.name||g.product||'Produto';products[name]=(products[name]||0)+q(g.qty)}
 const productRows=Object.entries(products).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);
 const clients=groupSum(orders,x=>x.client||x.clientName||'Sem cliente',x=>x.total);
 const cuts=arr('cuts').filter(x=>inRange(x,s,e)),cutters=groupSum(cuts,x=>arr('cutters').find(c=>sid(c.id)===sid(x.cutterId))?.name||'Sem cortador',x=>x.pieces||x.done);
 const prod=arr('production').filter(x=>inRange(x,s,e)),locations=groupSum(prod,x=>arr('productionLocations').find(l=>sid(l.id)===sid(x.productionLocationId))?.name||arr('factionMasters').find(f=>sid(f.id)===sid(x.factionId))?.name||'Sem local',x=>x.done||x.planned);
 const fpay=arr('factionPayments').filter(x=>inRange({date:x.paymentDate||x.scheduledPaymentDate||x.createdAt},s,e)),factionBy=groupSum(fpay,x=>x.factionName||x.name||arr('factionMasters').find(f=>sid(f.id)===sid(x.factionMasterId))?.name||'Facção',x=>x.paidAmount||x.value||q(x.quantity)*q(x.unitPrice));
 const hub=arr('hubFinanceEntries').filter(x=>inRange(x,s,e)&&!sid(x.kind).startsWith('hub_settings')),ins=hub.filter(x=>x.flow==='Entrada'),outs=hub.filter(x=>x.flow==='Saída');
 const expenses=groupSum(outs,x=>x.category||'Outros',x=>x.value);
 const purchases=arr('purchases').filter(x=>inRange(x,s,e)),purchaseBy=groupSum(purchases,x=>x.supplier||x.supplierName||arr('suppliers').find(s=>sid(s.id)===sid(x.supplierId))?.name||'Fornecedor',x=>x.total);
 const invoices=arr('projectionInvoices').filter(x=>inRange(x,s,e));
 return {orders,productRows,clients,cuts,cutters,prod,locations,fpay,factionBy,hub,ins,outs,expenses,purchases,purchaseBy,invoices};
}
function bars9256(rows,formatter,maxItems=10){
 const list=rows.slice(0,maxItems),max=Math.max(1,...list.map(x=>q(x.value)));
 return list.length?list.map(x=>'<div style="display:grid;grid-template-columns:minmax(130px,220px) 1fr auto;gap:8px;align-items:center;margin:7px 0"><span>'+esc(x.label)+'</span><div style="height:14px;background:#eee;border-radius:999px;overflow:hidden"><div style="height:100%;width:'+Math.max(2,q(x.value)/max*100).toFixed(1)+'%;background:#8b4c6a"></div></div><b>'+esc(formatter(x.value))+'</b></div>').join(''):'<div class="empty">Sem dados neste período.</div>';
}
function pie9256(rows){
 const list=rows.slice(0,8),total=list.reduce((a,x)=>a+q(x.value),0);if(!total)return '<div class="empty">Sem despesas neste período.</div>';
 const colors=['#70405a','#9d5c7a','#c07a98','#d8a0b8','#826c91','#a8869b','#b6678d','#8a4868'];let acc=0,stops=[];
 list.forEach((x,i)=>{const a=acc/total*100;acc+=q(x.value);const b=acc/total*100;stops.push(colors[i%colors.length]+' '+a.toFixed(2)+'% '+b.toFixed(2)+'%')});
 return '<div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div style="width:180px;height:180px;border-radius:50%;background:conic-gradient('+stops.join(',')+')"></div><div style="min-width:220px;flex:1">'+list.map((x,i)=>'<div style="display:flex;justify-content:space-between;gap:12px;margin:5px 0"><span>'+esc(x.label)+'</span><b>'+money(x.value)+'</b></div>').join('')+'</div></div>';
}
function dailyFinance9256(rows,s,e){
 const m={};for(const x of rows){const d=rowDate(x);if(!d)continue;if(!m[d])m[d]={in:0,out:0};if(x.flow==='Entrada')m[d].in+=q(x.value);else if(x.flow==='Saída')m[d].out+=q(x.value)}
 const days=Object.keys(m).sort();if(!days.length)return '<div class="empty">Sem movimentação financeira neste período.</div>';
 const vals=days.flatMap(d=>[m[d].in,m[d].out]),max=Math.max(1,...vals),W=760,H=220,pad=28;
 const point=(v,i)=>{const x=days.length===1?W/2:pad+i*(W-2*pad)/(days.length-1),y=H-pad-(v/max)*(H-2*pad);return [x,y]};
 const inPts=days.map((d,i)=>point(m[d].in,i).join(',')).join(' '),outPts=days.map((d,i)=>point(m[d].out,i).join(',')).join(' ');
 return '<div style="overflow:auto"><svg viewBox="0 0 '+W+' '+H+'" style="width:100%;min-width:620px;height:240px;background:#fff;border:1px solid #eee;border-radius:12px"><polyline points="'+inPts+'" fill="none" stroke="#6f3f59" stroke-width="4"/><polyline points="'+outPts+'" fill="none" stroke="#b56f8f" stroke-width="4"/>'+days.map((d,i)=>{const [x,y1]=point(m[d].in,i),[,y2]=point(m[d].out,i);return '<circle cx="'+x+'" cy="'+y1+'" r="4" fill="#6f3f59"/><circle cx="'+x+'" cy="'+y2+'" r="4" fill="#b56f8f"/>'}).join('')+'</svg><div class="sub">Linha escura: entradas · linha clara: saídas</div></div>';
}
function ensureReports9256(){
 const page=document.getElementById('relatorios');if(!page)return;
 let box=document.getElementById('hlgbReports9256');
 if(!box){
   box=document.createElement('div');box.id='hlgbReports9256';box.className='panel';box.style.cssText='border:2px solid #d8bdca;background:#fff';
   box.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:end;flex-wrap:wrap"><div><h2 style="margin:0">📊 Central de Relatórios HLGB</h2><div class="sub">Cliente, produto, produção, corte, facções, financeiro e compras no mesmo período.</div></div><div class="toolbar" style="align-items:end;flex-wrap:wrap"><div class="field"><label>De</label><input id="hlgbRepStart9256" type="date"></div><div class="field"><label>Até</label><input id="hlgbRepEnd9256" type="date"></div><button type="button" class="primary" id="hlgbRepUpdate9256">Atualizar</button><button type="button" class="secondary" id="hlgbRepMonth9256">Este mês</button><button type="button" class="secondary" id="hlgbRepYear9256">Este ano</button></div></div><div id="hlgbRepCards9256" class="cards"></div><div id="hlgbRepBody9256"></div>';
   page.insertBefore(box,page.firstChild||null);
   const d=new Date(),iso=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
   document.getElementById('hlgbRepStart9256').value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01';
   document.getElementById('hlgbRepEnd9256').value=iso(d);
   document.getElementById('hlgbRepUpdate9256').onclick=renderReports9256;
   document.getElementById('hlgbRepMonth9256').onclick=()=>{const n=new Date();document.getElementById('hlgbRepStart9256').value=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-01';document.getElementById('hlgbRepEnd9256').value=iso(n);renderReports9256()};
   document.getElementById('hlgbRepYear9256').onclick=()=>{const n=new Date();document.getElementById('hlgbRepStart9256').value=n.getFullYear()+'-01-01';document.getElementById('hlgbRepEnd9256').value=iso(n);renderReports9256()};
 }
 const old=document.getElementById('hlgbReports9252');if(old)old.style.display='none';
 renderReports9256();
}
function renderReports9256(){
 const body=document.getElementById('hlgbRepBody9256'),cards=document.getElementById('hlgbRepCards9256');if(!body||!cards)return;
 const s=document.getElementById('hlgbRepStart9256')?.value||'',e=document.getElementById('hlgbRepEnd9256')?.value||'',d=reportData9256(s,e);
 const pieces=d.productRows.reduce((a,x)=>a+q(x.value),0),inV=d.ins.reduce((a,x)=>a+q(x.value),0),outV=d.outs.reduce((a,x)=>a+q(x.value),0),purch=d.purchases.reduce((a,x)=>a+q(x.total),0),fpay=d.fpay.reduce((a,x)=>a+q(x.paidAmount||x.value||q(x.quantity)*q(x.unitPrice)),0),cutPieces=d.cuts.reduce((a,x)=>a+q(x.pieces||x.done),0);
 cards.innerHTML='<div class="card"><small>Pedidos</small><strong>'+d.orders.length+'</strong><div class="sub">'+pieces.toLocaleString('pt-BR')+' peças</div></div><div class="card"><small>Entradas</small><strong>'+money(inV)+'</strong></div><div class="card"><small>Saídas</small><strong>'+money(outV)+'</strong></div><div class="card"><small>Saldo</small><strong>'+money(inV-outV)+'</strong></div><div class="card"><small>Compras</small><strong>'+money(purch)+'</strong></div><div class="card"><small>Pagamentos facções</small><strong>'+money(fpay)+'</strong></div><div class="card"><small>Peças cortadas</small><strong>'+cutPieces.toLocaleString('pt-BR')+'</strong></div>';
 body.innerHTML='<div class="grid" style="align-items:start"><div class="panel" style="background:#fff"><h3>Top clientes por valor de pedidos</h3>'+bars9256(d.clients,money,10)+'</div><div class="panel" style="background:#fff"><h3>Produtos mais pedidos</h3>'+bars9256(d.productRows,v=>q(v).toLocaleString('pt-BR')+' pç',10)+'</div></div><div class="grid" style="align-items:start"><div class="panel" style="background:#fff"><h3>Despesas por categoria — pie chart</h3>'+pie9256(d.expenses)+'</div><div class="panel" style="background:#fff"><h3>Financeiro por dia — gráfico de linhas</h3>'+dailyFinance9256(d.hub,s,e)+'</div></div><div class="grid" style="align-items:start"><div class="panel" style="background:#fff"><h3>Produção por local</h3>'+bars9256(d.locations,v=>q(v).toLocaleString('pt-BR')+' pç',10)+'</div><div class="panel" style="background:#fff"><h3>Produção por cortador</h3>'+bars9256(d.cutters,v=>q(v).toLocaleString('pt-BR')+' pç',10)+'</div></div><div class="grid" style="align-items:start"><div class="panel" style="background:#fff"><h3>Facções no período</h3>'+bars9256(d.factionBy,money,10)+'</div><div class="panel" style="background:#fff"><h3>Compras por fornecedor</h3>'+bars9256(d.purchaseBy,money,10)+'</div></div>';
}
window.hlgbRenderReports9256=renderReports9256;

/* ================= CADASTRO DE FACÇÕES ================= */
let factionLoading9256=false,lastFactionCloud9256=0;
async function loadFactionMasters9256(force=false){
 if(factionLoading9256)return;
 if(!force&&Date.now()-lastFactionCloud9256<15000){renderFactionMasters9256();return}
 factionLoading9256=true;
 try{
  if(typeof cloudRequest==='function'&&typeof cloudAccessToken!=='undefined'&&cloudAccessToken){
   const rows=await cloudRequest('hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at&module=eq.factionMasters&deleted_at=is.null&order=updated_at.asc&limit=500',{method:'GET'});
   if(Array.isArray(rows)){
    const local=new Map(arr('factionMasters').map(x=>[sid(x.id),x]));
    for(const r of rows){const id=sid(r.entity_id);if(!id)continue;local.set(id,r.data&&typeof r.data==='object'?JSON.parse(JSON.stringify(r.data)):r.data)}
    db.factionMasters=[...local.values()];lastFactionCloud9256=Date.now();try{localSaveOnly?.()}catch(e){}
   }
  }
 }catch(e){console.warn('[HLGB 9256] facções nuvem',e)}
 finally{factionLoading9256=false;renderFactionMasters9256()}
}
function catalogNames9256(ids,list){return (Array.isArray(ids)?ids:[]).map(id=>list.find(x=>sid(x.id)===sid(id))?.name).filter(Boolean).join(', ')}
function renderFactionMasters9256(){
 const el=document.getElementById('factionMasterTable');if(!el)return;
 const rows=arr('factionMasters').slice().sort((a,b)=>sid(a.name).localeCompare(sid(b.name),'pt-BR'));
 const out=rows.map(f=>{
  const l=arr('productionLocations').find(x=>sid(x.id)===sid(f.productionLocationId)),services=catalogNames9256(f.serviceTypeIds,arr('serviceTypes'))||f.serviceType||'-',machines=catalogNames9256(f.machineIds,arr('machines'))||f.machines||'-';
  return [esc(f.name||'-'),esc(f.address||'-'),esc(f.phone||'-'),esc(f.pix||'-'),esc(services),esc(machines),esc(l?.name||'-'),f.active===false?'<span class="badge">Inativa</span>':'<span class="badge ok">Ativa</span>','<button type="button" class="secondary hlgbEditFaction9256" data-id="'+esc(f.id)+'">Editar</button>'];
 });
 el.innerHTML=rows.length?(typeof table==='function'?table(['Facção','Endereço','Telefone','Chave PIX','Tipo de serviço','Máquinas','Local de produção','Status','Ações'],out):'<div>'+rows.map(x=>esc(x.name)).join('<br>')+'</div>'):'<div class="empty">Nenhuma facção visível. <button type="button" class="secondary" onclick="hlgbReloadFactionMasters9256()">Recarregar da nuvem</button></div>';
 el.querySelectorAll('.hlgbEditFaction9256').forEach(b=>b.onclick=()=>{const id=b.dataset.id;const f=arr('factionMasters').find(x=>sid(x.id)===sid(id));if(!f)return alert('Facção não encontrada.');try{window.editFactionMaster?.(f.id)}catch(e){alert('Não foi possível abrir esta facção.')}})
 let info=document.getElementById('hlgbFactionCount9256');if(!info){info=document.createElement('div');info.id='hlgbFactionCount9256';info.className='sub';el.insertAdjacentElement('beforebegin',info)}
 info.textContent=rows.length+' facção(ões) cadastrada(s) visível(is).';
}
window.hlgbReloadFactionMasters9256=()=>loadFactionMasters9256(true);
function ensureFactionPage9256(){
 const page=document.getElementById('cadFaccoes');if(!page)return;
 let bar=document.getElementById('hlgbFactionReload9256');if(!bar){bar=document.createElement('div');bar.id='hlgbFactionReload9256';bar.className='toolbar';bar.style.marginTop='10px';bar.innerHTML='<button type="button" class="secondary" onclick="hlgbReloadFactionMasters9256()">🔄 Recarregar facções cadastradas</button>';page.querySelector('.panel')?.insertAdjacentElement('beforebegin',bar)}
 renderFactionMasters9256();loadFactionMasters9256(false);
}

/* ================= ASSISTENTE — ENVIO ================= */
function answerBox9256(){return document.getElementById('hlgbAssistantAnswer')}
function voiceText9256(){return sid(document.getElementById('hlgbVoiceFullPreview9255')?.value||document.getElementById('hlgbAssistantInput')?.value).trim()}
function sendAssistant9256(){
 const text=voiceText9256(),input=document.getElementById('hlgbAssistantInput'),out=answerBox9256();if(!text)return alert('Não há texto para enviar.');
 if(!input)return alert('O campo do Assistente não está disponível.');
 input.value=text;try{input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){}
 if(out)out.innerHTML='<b>⏳ Enviando pergunta…</b>';
 try{
   if(typeof window.hlgbAssistantAsk!=='function')throw new Error('Função de pergunta não carregada.');
   window.hlgbAssistantAsk();
   setTimeout(()=>{const now=sid(out?.innerText||out?.textContent);if(out&&/Enviando pergunta/.test(now))out.innerHTML='<b>⚠️ A pergunta não recebeu resposta.</b><br><span class="sub">O texto foi enviado ao campo do Assistente, mas o processador não respondeu.</span>'},220);
 }catch(e){console.error('[HLGB 9256] envio assistente',e);if(out)out.innerHTML='<b>Não foi possível enviar a pergunta.</b><br>'+esc(e?.message||e)}
}
window.hlgbSendAssistant9256=sendAssistant9256;
function ensureAssistantSend9256(){
 const ta=document.getElementById('hlgbVoiceFullPreview9255');if(!ta)return;
 let b=document.getElementById('hlgbVoiceSend9255');
 if(b){b.disabled=!ta.value.trim();b.textContent='Enviar pergunta';b.onclick=sendAssistant9256}
 if(!document.getElementById('hlgbVoiceSendBackup9256')){
  const row=b?.parentElement;if(row){const x=document.createElement('button');x.type='button';x.id='hlgbVoiceSendBackup9256';x.className='primary';x.textContent='▶ Enviar pergunta';x.onclick=sendAssistant9256;row.appendChild(x)}
 }
 if(!ta.dataset.send9256){ta.dataset.send9256='1';ta.addEventListener('input',()=>{const a=document.getElementById('hlgbVoiceSend9255'),x=document.getElementById('hlgbVoiceSendBackup9256'),ok=!!ta.value.trim();if(a)a.disabled=!ok;if(x)x.disabled=!ok});ta.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();sendAssistant9256()}})}
}
document.addEventListener('click',e=>{const b=e.target?.closest?.('#hlgbVoiceSend9255,#hlgbVoiceSendBackup9256');if(!b)return;e.preventDefault();e.stopImmediatePropagation();sendAssistant9256()},true);

/* ================= ROTAS / CARGA ================= */
function installRoute9256(){
 const cur=window.page;if(typeof cur!=='function'||cur.__v9256)return;
 const base=cur,w=function(id,btn){const r=base.apply(this,arguments);if(id==='relatorios')setTimeout(ensureReports9256,10);if(id==='cadFaccoes')setTimeout(ensureFactionPage9256,10);return r};w.__v9256=true;w.__original=base;window.page=w;
}
function refresh9256(){
 stamp();installRoute9256();
 if(document.getElementById('relatorios')?.classList.contains('active'))ensureReports9256();
 if(document.getElementById('cadFaccoes')?.classList.contains('active'))ensureFactionPage9256();
 if(document.getElementById('hlgbAssistantInput'))ensureAssistantSend9256();
}
setTimeout(refresh9256,1000);setInterval(refresh9256,1500);
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(refresh9256,350),0)}catch(e){}
window.hlgbBatch9256={ensureReports:ensureReports9256,renderReports:renderReports9256,ensureFactionPage:ensureFactionPage9256,loadFactionMasters:loadFactionMasters9256,sendAssistant:sendAssistant9256};
window.HLGB_BATCH_9256=V;
console.info('[HLGB] v'+V+' pacote de correções ativo');
})();