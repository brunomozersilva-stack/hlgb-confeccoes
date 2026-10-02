/* HLGB v92.49 — pacote operacional: revenda, utilidades, rotas, etiquetas, embalagem e regularização */
(function(){
'use strict';
const V='92.49-ops';
window.HLGB_RELEASE_VERSION='92.49';
const sid=v=>String(v??''), q=v=>Math.max(0,Number(v)||0);
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const moneySafe=v=>{try{return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+Number(v||0).toFixed(2)}};
const clone=v=>{try{return structuredClone(v)}catch(e){return JSON.parse(JSON.stringify(v))}};
const today=()=>new Date().toISOString().slice(0,10);
const arr=n=>{try{db[n]=Array.isArray(db[n])?db[n]:[];return db[n]}catch(e){return []}};
function upsertLocal(module,row){const a=arr(module),i=a.findIndex(x=>sid(x?.id)===sid(row?.id));if(i>=0)a[i]=clone(row);else a.push(clone(row));try{localSaveOnly()}catch(e){}}
async function saveRow(module,row,deleted=false){
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('A gravação multiusuário não está disponível.');
  const r=await window.hlgbRecordSaveWithRetry(module,sid(row.id),clone(row),!!deleted);
  if(!r||r.applied!==true)throw new Error(r?.reason||'A nuvem não confirmou a alteração.');
  if(deleted){const a=arr(module),i=a.findIndex(x=>sid(x?.id)===sid(row.id));if(i>=0)a.splice(i,1);try{localSaveOnly()}catch(e){};return true}
  const confirmed=r.data||row;upsertLocal(module,confirmed);return confirmed;
}
function activate(id,btn,render){
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  const p=document.getElementById(id);if(!p)return false;p.classList.add('active');
  document.querySelectorAll('#nav button').forEach(x=>x.classList.remove('active'));if(btn){btn.classList.add('active');try{openParentNavGroup(btn)}catch(e){}}
  try{render?.()}catch(e){console.warn('[HLGB '+V+'] render '+id,e)}
  return true;
}
function ensureStyle(){
 if(document.getElementById('hlgbOpsStyle9249'))return;
 const st=document.createElement('style');st.id='hlgbOpsStyle9249';
 st.textContent='.ops-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}.ops-card{border:1px solid var(--line);border-radius:12px;padding:14px;background:#fff}.ops-actions{display:flex;gap:7px;flex-wrap:wrap}.ops-table{overflow:auto}.ops-route-stop{border:1px solid var(--line);border-radius:12px;padding:12px;margin:10px 0;background:#fff}.ops-muted{color:var(--muted);font-size:12px}.ops-label-grid{display:grid;gap:3mm}.ops-label{border:.3mm solid #444;box-sizing:border-box;padding:3mm;display:flex;flex-direction:column;justify-content:center;overflow:hidden;background:#fff;color:#111}.ops-label b{font-size:12px}.ops-label span{font-size:11px;line-height:1.25}.ops-float-assistant{position:fixed!important;right:16px!important;bottom:16px!important;z-index:9998!important;box-shadow:0 8px 24px #0003!important;font-weight:800!important}.ops-pack-status{white-space:nowrap}@media(max-width:700px){.ops-float-assistant{right:10px!important;bottom:10px!important;padding:13px!important}.ops-float-assistant .ops-long{display:none}.ops-grid{grid-template-columns:1fr}}@media print{body>*:not(#hlgbPrintRoot9249){display:none!important}#hlgbPrintRoot9249{display:block!important}.ops-label{break-inside:avoid;page-break-inside:avoid}}';
 document.head.appendChild(st);
}
function ensurePages(){
 const main=document.querySelector('#appShell main')||document.querySelector('main');if(!main)return;
 const pages=[
  ['utilidades9249','Utilidades','Rotas, etiquetas e ferramentas rápidas.'],
  ['rotas9249','Rotas de busca e entrega','Monte a rota do dia e imprima a folha geral + checklists por local.'],
  ['etiquetas9249','Etiquetas A4','Crie várias etiquetas para pessoas/modelos na mesma impressão.'],
  ['embalagem9249','Embalagem','Atribua modelo, cliente e quantidade para cada embaladeira.'],
  ['etiquetasEmb9249','Etiquetas de embalagem','Associe o modelo de etiqueta correto a cada cliente + produto.'],
  ['regularizacao9249','Regularização histórica','Atualize notas/entregas antigas sem atribuir cortador quando o corte já aconteceu.']
 ];
 pages.forEach(([id,t,sub])=>{if(document.getElementById(id))return;const s=document.createElement('section');s.id=id;s.className='page';s.innerHTML='<h1>'+t+'</h1><div class="sub">'+sub+'</div><div id="'+id+'Host" style="margin-top:14px"></div>';main.appendChild(s)});
}
function ensureNav(){
 const nav=document.getElementById('nav');if(!nav)return;
 if(!document.getElementById('opsUtilNav9249')){
   const g=document.createElement('div');g.className='nav-group';g.id='opsUtilNav9249';
   g.innerHTML='<button type="button" class="nav-group-title" onclick="toggleNavGroup(this)">🧰 <span>Utilidades</span><b>⌄</b></button><div class="nav-submenu"><button id="opsUtilHome9249">Visão geral</button><button id="opsRouteNav9249">Rotas de busca e entrega</button><button id="opsLabelNav9249">Etiquetas A4</button><button id="opsPackLabelNav9249">Etiquetas de embalagem</button><button id="opsHistNav9249">Regularização histórica</button></div>';
   const sys=[...nav.querySelectorAll('.nav-group')].find(x=>x.querySelector('.nav-group-title span')?.textContent==='Sistema');if(sys)nav.insertBefore(g,sys);else nav.appendChild(g);
   g.querySelector('#opsUtilHome9249').onclick=function(){activate('utilidades9249',this,renderUtilities)};
   g.querySelector('#opsRouteNav9249').onclick=function(){activate('rotas9249',this,renderRoutes)};
   g.querySelector('#opsLabelNav9249').onclick=function(){activate('etiquetas9249',this,renderLabels)};
   g.querySelector('#opsPackLabelNav9249').onclick=function(){activate('etiquetasEmb9249',this,renderLabelTemplates)};
   g.querySelector('#opsHistNav9249').onclick=function(){activate('regularizacao9249',this,renderHistorical)};
 }
 if(!document.getElementById('opsPackagingNav9249')){
   const prod=[...nav.querySelectorAll('.nav-group')].find(x=>x.querySelector('.nav-group-title span')?.textContent==='Produção');
   const sub=prod?.querySelector('.nav-submenu');if(sub){const b=document.createElement('button');b.id='opsPackagingNav9249';b.textContent='📦 Embalagem';b.onclick=function(){activate('embalagem9249',b,renderPackaging)};sub.appendChild(b)}
 }
}

/* ---------- REVENDA ---------- */
function resaleCatalog(){const out=[];arr('suppliers').forEach(s=>(s.resaleProducts||[]).forEach(p=>out.push({s,p})));return out}
function renderResaleEnhanced(){
 try{window.hlgbRenderResale9224?.()}catch(e){}
 const box=document.getElementById('resalePanel9224');if(!box)return;
 const head=box.querySelector('.toolbar');if(head&&!document.getElementById('opsResaleGroup9249')){
   const b=document.createElement('button');b.id='opsResaleGroup9249';b.className='primary';b.textContent='🧺 Venda agrupada';b.onclick=openGroupedResale;head.appendChild(b);
 }
 box.querySelectorAll('tbody tr').forEach(tr=>{
   const tds=tr.querySelectorAll('td');if(tds.length<8||tr.querySelector('.ops-delete-resale'))return;
   const name=tds[1]?.querySelector('b')?.textContent?.trim(),sup=tds[0]?.textContent?.trim();if(!name||!sup)return;
   const hit=resaleCatalog().find(x=>sid(x.s?.name).trim()===sup&&sid(x.p?.name).trim()===name);if(!hit)return;
   const b=document.createElement('button');b.type='button';b.className='danger ops-delete-resale';b.textContent='Excluir';b.onclick=()=>deleteResale(hit.s.id,hit.p.id);tds[7].append(' ',b);
 });
}
async function deleteResale(sid0,pid){
 const s=arr('suppliers').find(x=>sid(x.id)===sid(sid0));if(!s)return;
 const p=(s.resaleProducts||[]).find(x=>sid(x.id)===sid(pid));if(!p)return;
 const used=arr('noteQueue').some(x=>sid(x.resaleProductId)===sid(pid))||arr('projectionInvoices').some(inv=>(inv.items||[]).some(i=>sid(i.resaleProductId)===sid(pid)));
 if(used&&!confirm('Este produto já possui histórico de venda. Excluir do catálogo? O histórico das notas será preservado.'))return;
 if(!used&&!confirm('Excluir '+(p.name||'este produto')+' da revenda?'))return;
 const next=clone(s);next.resaleProducts=(next.resaleProducts||[]).filter(x=>sid(x.id)!==sid(pid));next.updatedAt=new Date().toISOString();
 try{await saveRow('suppliers',next);renderResaleEnhanced()}catch(e){alert('Não foi possível excluir: '+(e?.message||e))}
}
function openGroupedResale(){
 const cat=resaleCatalog().filter(x=>x.p?.active!==false);if(!cat.length){alert('Cadastre produtos de revenda primeiro.');return}
 const clients=arr('clients').slice().sort((a,b)=>sid(a.name).localeCompare(sid(b.name),'pt-BR'));
 const cOpts=clients.map(c=>'<option value="'+escSafe(c.id)+'">'+escSafe(c.name||'Cliente')+'</option>').join('');
 const rows=cat.map((x,i)=>'<tr><td><input class="ops-rg-use" data-i="'+i+'" type="checkbox"></td><td>'+escSafe(x.s.name||'')+'</td><td><b>'+escSafe(x.p.name||'')+'</b></td><td><input class="ops-rg-qty" data-i="'+i+'" type="number" min="0" step="1" value="0" style="width:80px"></td><td><input class="ops-rg-price" data-i="'+i+'" type="number" min="0" step=".01" value="'+q(x.p.salePrice).toFixed(2)+'" style="width:100px"></td></tr>').join('');
 openModal('Venda agrupada de mercadorias de terceiros','<div class="grid"><div class="field"><label>Cliente</label><select id="opsRgClient9249">'+cOpts+'</select></div><div class="field"><label>Data</label><input id="opsRgDate9249" type="date" value="'+today()+'"></div></div><div class="ops-table"><table><thead><tr><th></th><th>Fornecedor</th><th>Produto</th><th>Qtd.</th><th>Preço/peça</th></tr></thead><tbody>'+rows+'</tbody></table></div><div class="sub">Os itens entram juntos na Montagem de Notas e podem ser faturados na mesma nota que produtos da própria confecção, desde que sejam do mesmo cliente.</div><button class="primary modalSave">Enviar itens para Montagem de Notas</button>',async()=>{
  const c=clients.find(x=>sid(x.id)===sid(document.getElementById('opsRgClient9249')?.value)),date=document.getElementById('opsRgDate9249')?.value||today();if(!c)return alert('Escolha o cliente.');
  const chosen=[];document.querySelectorAll('.ops-rg-use:checked').forEach(cb=>{const i=+cb.dataset.i,x=cat[i],qty=Math.floor(q(document.querySelector('.ops-rg-qty[data-i="'+i+'"]')?.value)),price=q(document.querySelector('.ops-rg-price[data-i="'+i+'"]')?.value);if(x&&qty>0)chosen.push({x,qty,price})});
  if(!chosen.length)return alert('Marque pelo menos um produto e informe a quantidade.');
  const btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='Salvando…'}
  try{
    for(const z of chosen){const id='resale-'+Date.now()+'-'+Math.floor(Math.random()*900000);await saveRow('noteQueue',{id,clientId:c.id,clientName:c.name,productId:null,productName:z.x.p.name,resaleProductId:z.x.p.id,supplierId:z.x.s.id,supplierName:z.x.s.name,qty:z.qty,remainingQty:z.qty,unitPrice:z.price,unitCost:q(z.x.p.costPrice),deliveryDate:date,source:'Revenda',sourceType:'resale',status:'Aguardando',createdAt:new Date().toISOString()})}
    closeModal();try{window.renderNoteQueue9202?.()}catch(e){};renderResaleEnhanced();alert(chosen.length+' produto(s) enviados para a mesma montagem de nota de '+c.name+'.');
  }catch(e){if(btn){btn.disabled=false;btn.textContent='Enviar itens para Montagem de Notas'}alert('Falha ao salvar: '+(e?.message||e))}
 });
}
function installResaleFix(){
 const old=window.newResaleProduct9224;if(typeof old!=='function'||old.__ops9249)return;
 const w=function(){
   const suppliers=arr('suppliers');if(!suppliers.length){alert('Cadastre primeiro o fornecedor usando + Novo fornecedor.');return}
   const opts=suppliers.map(s=>'<option value="'+escSafe(s.id)+'">'+escSafe(s.name||'Fornecedor')+'</option>').join('');
   openModal('Cadastrar produto para revenda','<div class="grid"><div class="field"><label>Fornecedor</label><select id="opsResSupplier">'+opts+'</select></div><div class="field"><label>Produto</label><input id="opsResName"></div><div class="field"><label>Unidade</label><input id="opsResUnit" value="peça"></div><div class="field"><label>Custo por peça</label><input id="opsResCost" type="number" min="0" step=".01"></div><div class="field"><label>Preço de venda</label><input id="opsResSale" type="number" min="0" step=".01"></div></div><button class="primary modalSave">Salvar produto</button>',async()=>{
     const s=suppliers.find(x=>sid(x.id)===sid(document.getElementById('opsResSupplier')?.value)),name=document.getElementById('opsResName')?.value?.trim()||'';if(!s||!name)return alert('Informe fornecedor e produto.');
     const next=clone(s);next.resaleProducts=Array.isArray(next.resaleProducts)?next.resaleProducts:[];next.resaleProducts.push({id:'res-'+Date.now()+'-'+Math.floor(Math.random()*9999),name,unit:document.getElementById('opsResUnit')?.value?.trim()||'peça',costPrice:q(document.getElementById('opsResCost')?.value),salePrice:q(document.getElementById('opsResSale')?.value),active:true,createdAt:new Date().toISOString()});
     const btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='Salvando…'}
     try{const confirmed=await saveRow('suppliers',next);upsertLocal('suppliers',confirmed);closeModal();setTimeout(renderResaleEnhanced,80)}catch(e){if(btn){btn.disabled=false;btn.textContent='Salvar produto'}alert('Não foi possível salvar: '+(e?.message||e))}
   });
 };
 w.__ops9249=true;w.__original=old;window.newResaleProduct9224=w;
 const rr=window.hlgbRenderResale9224;if(typeof rr==='function'&&!rr.__ops9249){window.hlgbRenderResale9224=function(){const r=rr.apply(this,arguments);setTimeout(renderResaleEnhanced,0);return r};window.hlgbRenderResale9224.__ops9249=true}
}

/* ---------- UTILIDADES ---------- */
function renderUtilities(){
 const h=document.getElementById('utilidades9249Host');if(!h)return;
 h.innerHTML='<div class="ops-grid"><div class="ops-card"><h3>🗺️ Rotas</h3><div class="ops-muted">Planeje o que levar e buscar em cada facção/confecção.</div><button class="primary" onclick="hlgbOpsOpen9249(\'rotas\')">Abrir</button></div><div class="ops-card"><h3>🏷️ Etiquetas A4</h3><div class="ops-muted">Várias pessoas/modelos na mesma impressão, sem quebrar etiquetas.</div><button class="primary" onclick="hlgbOpsOpen9249(\'etiquetas\')">Abrir</button></div><div class="ops-card"><h3>📦 Etiquetas de embalagem</h3><div class="ops-muted">Cliente + modelo + arquivo/modelo de impressão.</div><button class="primary" onclick="hlgbOpsOpen9249(\'etiquetasEmb\')">Abrir</button></div><div class="ops-card"><h3>🧾 Regularização histórica</h3><div class="ops-muted">Conferência e baixa segura de períodos que ficaram atrasados.</div><button class="primary" onclick="hlgbOpsOpen9249(\'regularizacao\')">Abrir</button></div></div>';
}
window.hlgbOpsOpen9249=function(k){const m={rotas:['rotas9249',renderRoutes],etiquetas:['etiquetas9249',renderLabels],etiquetasEmb:['etiquetasEmb9249',renderLabelTemplates],regularizacao:['regularizacao9249',renderHistorical]};const x=m[k];if(x)activate(x[0],null,x[1])};

/* ---------- ROTAS ---------- */
function routeLocations(){
 const out=[];arr('factionMasters').forEach(x=>out.push({type:'Facção',id:x.id,name:x.name||'Facção',address:x.address||'',phone:x.phone||''}));
 arr('productionLocations').forEach(x=>out.push({type:'Confecção',id:x.id,name:x.name||'Confecção',address:x.address||'',phone:x.phone||''}));
 return out;
}
function renderRoutes(){
 const h=document.getElementById('rotas9249Host');if(!h)return;const a=arr('routePlans').slice().sort((x,y)=>sid(y.date).localeCompare(sid(x.date)));
 const rows=a.map(r=>'<tr><td>'+escSafe(r.date||'')+'</td><td><b>'+escSafe(r.driver||'-')+'</b></td><td>'+((r.stops||[]).length)+'</td><td>'+escSafe(r.status||'Planejada')+'</td><td><button class="primary" onclick="editRoute9249(\''+escSafe(r.id)+'\')">Abrir</button> <button class="secondary" onclick="printRoute9249(\''+escSafe(r.id)+'\')">🖨️ Imprimir</button> <button class="danger" onclick="deleteRoute9249(\''+escSafe(r.id)+'\')">Excluir</button></td></tr>').join('');
 h.innerHTML='<div class="toolbar"><button class="primary" onclick="newRoute9249()">+ Nova rota</button></div><div class="ops-table">'+(rows?'<table><thead><tr><th>Data</th><th>Responsável</th><th>Paradas</th><th>Status</th><th>Ações</th></tr></thead><tbody>'+rows+'</tbody></table>':'<div class="empty">Nenhuma rota criada.</div>')+'</div>';
}
function routeStopHtml(stop,i){
 const locs=routeLocations(),opts=locs.map((x,j)=>'<option value="'+j+'" '+(sid(stop?.locationId)===sid(x.id)&&sid(stop?.type)===sid(x.type)?'selected':'')+'>'+escSafe(x.type+' — '+x.name)+'</option>').join('');
 return '<div class="ops-route-stop" data-i="'+i+'"><div class="grid"><div class="field"><label>Local</label><select class="ops-route-loc">'+opts+'</select></div><div class="field"><label>Observações</label><input class="ops-route-note" value="'+escSafe(stop?.notes||'')+'"></div></div><div class="grid"><div class="field"><label>LEVAR — um item por linha</label><textarea class="ops-route-carry" rows="5">'+escSafe((stop?.carry||[]).join('\n'))+'</textarea></div><div class="field"><label>BUSCAR — um item por linha</label><textarea class="ops-route-pickup" rows="5">'+escSafe((stop?.pickup||[]).join('\n'))+'</textarea></div></div><button type="button" class="danger" onclick="this.closest(\'.ops-route-stop\').remove()">Remover parada</button></div>';
}
function openRouteEditor(r){
 window.__opsRouteStops9249=clone(r?.stops||[]);
 const body='<div class="grid"><div class="field"><label>Data</label><input id="opsRouteDate" type="date" value="'+escSafe(r?.date||today())+'"></div><div class="field"><label>Responsável / motorista</label><input id="opsRouteDriver" value="'+escSafe(r?.driver||'')+'"></div><div class="field"><label>Status</label><select id="opsRouteStatus"><option>Planejada</option><option>Em rota</option><option>Concluída</option></select></div></div><div class="field"><label>Anotações gerais</label><textarea id="opsRouteGeneral" rows="3">'+escSafe(r?.notes||'')+'</textarea></div><div id="opsRouteStops">'+(r?.stops||[]).map(routeStopHtml).join('')+'</div><button type="button" class="secondary" onclick="addRouteStop9249()">+ Adicionar parada</button><button class="primary modalSave">Salvar rota</button>';
 openModal(r?'Editar rota':'Nova rota',body,async()=>{
   const stops=[];document.querySelectorAll('#opsRouteStops .ops-route-stop').forEach((el,i)=>{const loc=routeLocations()[+el.querySelector('.ops-route-loc')?.value];if(!loc)return;const lines=v=>sid(v).split(/\n+/).map(x=>x.trim()).filter(Boolean);stops.push({order:i+1,type:loc.type,locationId:loc.id,name:loc.name,address:loc.address,phone:loc.phone,carry:lines(el.querySelector('.ops-route-carry')?.value),pickup:lines(el.querySelector('.ops-route-pickup')?.value),notes:el.querySelector('.ops-route-note')?.value?.trim()||''})});
   if(!stops.length)return alert('Adicione pelo menos uma parada.');
   const row={...(r||{}),id:r?.id||('route-'+Date.now()),date:document.getElementById('opsRouteDate')?.value||today(),driver:document.getElementById('opsRouteDriver')?.value?.trim()||'',status:document.getElementById('opsRouteStatus')?.value||'Planejada',notes:document.getElementById('opsRouteGeneral')?.value?.trim()||'',stops,updatedAt:new Date().toISOString(),createdAt:r?.createdAt||new Date().toISOString()};
   try{await saveRow('routePlans',row);closeModal();renderRoutes()}catch(e){alert('Não foi possível salvar a rota: '+(e?.message||e))}
 });
 const st=document.getElementById('opsRouteStatus');if(st&&r?.status)st.value=r.status;
}
window.newRoute9249=()=>openRouteEditor(null);
window.editRoute9249=id=>{const r=arr('routePlans').find(x=>sid(x.id)===sid(id));if(r)openRouteEditor(r)};
window.addRouteStop9249=function(){const host=document.getElementById('opsRouteStops');if(host)host.insertAdjacentHTML('beforeend',routeStopHtml({},host.children.length))};
window.deleteRoute9249=async function(id){const r=arr('routePlans').find(x=>sid(x.id)===sid(id));if(!r||!confirm('Excluir esta rota?'))return;try{await saveRow('routePlans',r,true);renderRoutes()}catch(e){alert('Não foi possível excluir: '+(e?.message||e))}};
function printHtml(title,html,css){
 const w=window.open('','_blank');if(!w){alert('Permita pop-ups para imprimir.');return}
 w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+escSafe(title)+'</title><style>@page{size:A4;margin:10mm}body{font-family:Arial,sans-serif;color:#111;font-size:12px}h1,h2,h3{margin:0 0 8px}.box{border:1px solid #222;padding:10px;margin:8px 0;break-inside:avoid}.check{font-size:14px;line-height:1.7}.page{page-break-after:always}.page:last-child{page-break-after:auto}table{border-collapse:collapse;width:100%}th,td{border:1px solid #777;padding:5px;text-align:left}'+(css||'')+'</style></head><body>'+html+'<script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>');w.document.close();
}
window.printRoute9249=function(id){
 const r=arr('routePlans').find(x=>sid(x.id)===sid(id));if(!r)return;
 const summary='<div class="page"><h1>HLGB CONFECÇÕES — ROTA DE BUSCA E ENTREGA</h1><p><b>Data:</b> '+escSafe(r.date||'')+' &nbsp; <b>Responsável:</b> '+escSafe(r.driver||'')+'</p><p><b>Anotações:</b> '+escSafe(r.notes||'-')+'</p><table><thead><tr><th>#</th><th>Local</th><th>Tipo</th><th>Levar</th><th>Buscar</th><th>OK</th></tr></thead><tbody>'+(r.stops||[]).map((s,i)=>'<tr><td>'+(i+1)+'</td><td><b>'+escSafe(s.name)+'</b><br>'+escSafe(s.address||'')+'</td><td>'+escSafe(s.type)+'</td><td>'+escSafe((s.carry||[]).join(' • '))+'</td><td>'+escSafe((s.pickup||[]).join(' • '))+'</td><td>☐</td></tr>').join('')+'</tbody></table></div>';
 const pages=(r.stops||[]).map((s,i)=>'<div class="page"><h2>CHECKLIST '+(i+1)+' — '+escSafe(s.type)+' · '+escSafe(s.name)+'</h2><p>'+escSafe(s.address||'')+(s.phone?' · '+escSafe(s.phone):'')+'</p><div class="box"><h3>LEVAR</h3><div class="check">'+((s.carry||[]).length?(s.carry||[]).map(x=>'☐ '+escSafe(x)).join('<br>'):'☐ Nada informado')+'</div></div><div class="box"><h3>BUSCAR</h3><div class="check">'+((s.pickup||[]).length?(s.pickup||[]).map(x=>'☐ '+escSafe(x)).join('<br>'):'☐ Nada informado')+'</div></div><div class="box"><h3>OBSERVAÇÕES</h3><p>'+escSafe(s.notes||'')+'</p><br><br><p>Conferido por: _______________________ &nbsp; Horário: ________</p></div></div>').join('');
 printHtml('Rota '+(r.date||''),summary+pages);
};

/* ---------- ETIQUETAS A4 ---------- */
let labelDraft9249=[];
function labelSize(mode){return mode==='large'?{w:92,h:52,cols:2,rows:5}:mode==='medium'?{w:62,h:40,cols:3,rows:6}:{w:62,h:34,cols:3,rows:7}}
function renderLabels(){
 const h=document.getElementById('etiquetas9249Host');if(!h)return;
 h.innerHTML='<div class="toolbar"><button class="primary" onclick="addLabelRow9249()">+ Adicionar etiqueta/modelo</button><div class="field"><label>Tamanho</label><select id="opsLabelSize" onchange="renderLabelDraft9249()"><option value="small">Pequena</option><option value="medium">Média</option><option value="large">Grande</option></select></div><button class="secondary" onclick="printLabels9249()">🖨️ Imprimir</button></div><div id="opsLabelRows"></div><div id="opsLabelSummary" class="sub" style="margin:10px 0"></div><div id="opsLabelPreview"></div>';
 if(!labelDraft9249.length)labelDraft9249=[{name:'',model:'',volume:'',date:today(),qty:1}];renderLabelDraft9249();
}
window.addLabelRow9249=function(){labelDraft9249.push({name:'',model:'',volume:'',date:today(),qty:1});renderLabelDraft9249()};
window.removeLabelRow9249=function(i){labelDraft9249.splice(i,1);if(!labelDraft9249.length)labelDraft9249.push({name:'',model:'',volume:'',date:today(),qty:1});renderLabelDraft9249()};
function syncLabelsFromDom(){document.querySelectorAll('.ops-label-row').forEach((r,i)=>{if(!labelDraft9249[i])return;labelDraft9249[i]={name:r.querySelector('.ln')?.value||'',model:r.querySelector('.lm')?.value||'',volume:r.querySelector('.lv')?.value||'',date:r.querySelector('.ld')?.value||today(),qty:Math.max(1,Math.floor(q(r.querySelector('.lq')?.value)||1))}})}
window.renderLabelDraft9249=function(){
 syncLabelsFromDom();const rows=document.getElementById('opsLabelRows'),preview=document.getElementById('opsLabelPreview');if(!rows||!preview)return;
 rows.innerHTML=labelDraft9249.map((x,i)=>'<div class="ops-card ops-label-row" style="margin-bottom:8px"><div class="grid"><div class="field"><label>Nome / Pessoa / Local</label><input class="ln" value="'+escSafe(x.name)+'" oninput="syncLabelDraft9249()"></div><div class="field"><label>Modelo</label><input class="lm" value="'+escSafe(x.model)+'" oninput="syncLabelDraft9249()"></div><div class="field"><label>Volume</label><input class="lv" value="'+escSafe(x.volume)+'" oninput="syncLabelDraft9249()"></div><div class="field"><label>Data</label><input class="ld" type="date" value="'+escSafe(x.date)+'" oninput="syncLabelDraft9249()"></div><div class="field"><label>Quantidade de etiquetas</label><input class="lq" type="number" min="1" value="'+x.qty+'" oninput="syncLabelDraft9249()"></div></div><button class="danger" onclick="removeLabelRow9249('+i+')">Remover</button></div>').join('');
 const mode=document.getElementById('opsLabelSize')?.value||'small',sz=labelSize(mode),labels=[];labelDraft9249.forEach(x=>{for(let n=0;n<x.qty;n++)labels.push(x)});
 document.getElementById('opsLabelSummary').textContent=labels.length+' etiqueta(s) · '+Math.ceil(labels.length/(sz.cols*sz.rows))+' folha(s) A4 · '+sz.cols+' colunas';
 preview.innerHTML='<div class="ops-label-grid" style="grid-template-columns:repeat('+sz.cols+','+sz.w+'mm)">'+labels.slice(0,sz.cols*sz.rows).map(x=>'<div class="ops-label" style="width:'+sz.w+'mm;height:'+sz.h+'mm"><b>'+escSafe(x.name||'NOME')+'</b><span>MODELO: '+escSafe(x.model||'-')+'</span><span>VOLUME: '+escSafe(x.volume||'-')+'</span><span>DATA: '+escSafe(x.date||'-')+'</span></div>').join('')+'</div>';
}
window.syncLabelDraft9249=function(){syncLabelsFromDom();clearTimeout(window.__opsLabelTimer9249);window.__opsLabelTimer9249=setTimeout(()=>{const mode=document.getElementById('opsLabelSize')?.value||'small',sz=labelSize(mode),labels=[];labelDraft9249.forEach(x=>{for(let n=0;n<x.qty;n++)labels.push(x)});const sm=document.getElementById('opsLabelSummary');if(sm)sm.textContent=labels.length+' etiqueta(s) · '+Math.ceil(labels.length/(sz.cols*sz.rows))+' folha(s) A4 · '+sz.cols+' colunas'},100)};
window.printLabels9249=function(){
 syncLabelsFromDom();const mode=document.getElementById('opsLabelSize')?.value||'small',sz=labelSize(mode),per=sz.cols*sz.rows,labels=[];labelDraft9249.forEach(x=>{for(let n=0;n<x.qty;n++)labels.push(x)});if(!labels.length)return;
 const pages=[];for(let i=0;i<labels.length;i+=per){const part=labels.slice(i,i+per);pages.push('<div class="page labelpage" style="display:grid;grid-template-columns:repeat('+sz.cols+','+sz.w+'mm);grid-auto-rows:'+sz.h+'mm;gap:3mm;align-content:start">'+part.map(x=>'<div class="label" style="width:'+sz.w+'mm;height:'+sz.h+'mm"><b>'+escSafe(x.name||'')+'</b><div>MODELO: '+escSafe(x.model||'-')+'</div><div>VOLUME: '+escSafe(x.volume||'-')+'</div><div>DATA: '+escSafe(x.date||'-')+'</div></div>').join('')+'</div>')}
 printHtml('Etiquetas A4',pages.join(''),'.label{border:.3mm solid #111;box-sizing:border-box;padding:3mm;display:flex;flex-direction:column;justify-content:center;overflow:hidden}.label b{font-size:13px;margin-bottom:2mm}.label div{font-size:11px;line-height:1.35}.labelpage{page-break-after:always}.labelpage:last-child{page-break-after:auto}');
};

/* ---------- EMBALAGEM / MODELOS DE ETIQUETA ---------- */
function templateKey(c,p){return sid(c)+'|'+sid(p)}
function labelTemplateFor(c,p){return arr('labelTemplates').find(x=>sid(x.clientId)===sid(c)&&sid(x.productId)===sid(p)&&x.active!==false)||null}
function renderLabelTemplates(){
 const h=document.getElementById('etiquetasEmb9249Host');if(!h)return;const rows=arr('labelTemplates').slice().sort((a,b)=>sid(a.clientName).localeCompare(sid(b.clientName),'pt-BR')).map(x=>'<tr><td>'+escSafe(x.clientName||'-')+'</td><td>'+escSafe(x.productName||'-')+'</td><td>'+escSafe(x.fileName||x.templateUrl||'Não vinculado')+'</td><td><button class="primary" onclick="editLabelTemplate9249(\''+escSafe(x.id)+'\')">Editar</button> <button class="danger" onclick="deleteLabelTemplate9249(\''+escSafe(x.id)+'\')">Excluir</button></td></tr>').join('');
 h.innerHTML='<div class="toolbar"><button class="primary" onclick="editLabelTemplate9249()">+ Vincular etiqueta cliente/modelo</button></div><div class="sub" style="margin:8px 0">Na segunda-feira, com o modelo da impressora e os PDFs/imagens reais, a saída de impressão poderá ser ajustada para o driver/tamanho exato. Por enquanto o sistema já mantém a associação correta cliente + modelo.</div><div class="ops-table">'+(rows?'<table><thead><tr><th>Cliente</th><th>Modelo</th><th>Arquivo / referência</th><th>Ações</th></tr></thead><tbody>'+rows+'</tbody></table>':'<div class="empty">Nenhuma etiqueta de embalagem vinculada.</div>')+'</div>';
}
window.editLabelTemplate9249=function(id){
 const cur=id?arr('labelTemplates').find(x=>sid(x.id)===sid(id)):null,clients=arr('clients').slice().sort((a,b)=>sid(a.name).localeCompare(sid(b.name),'pt-BR')),products=arr('products').slice().sort((a,b)=>sid(a.name).localeCompare(sid(b.name),'pt-BR'));
 const co=clients.map(x=>'<option value="'+escSafe(x.id)+'">'+escSafe(x.name||'')+'</option>').join(''),po=products.map(x=>'<option value="'+escSafe(x.id)+'">'+escSafe(x.name||'')+'</option>').join('');
 openModal(cur?'Editar etiqueta de embalagem':'Vincular etiqueta','<div class="grid"><div class="field"><label>Cliente</label><select id="opsTplClient">'+co+'</select></div><div class="field"><label>Modelo</label><select id="opsTplProduct">'+po+'</select></div><div class="field"><label>Nome do arquivo / referência</label><input id="opsTplFile" value="'+escSafe(cur?.fileName||'')+'" placeholder="Ex.: Quésia - Romantic.pdf"></div><div class="field"><label>Link/URL do arquivo (opcional)</label><input id="opsTplUrl" value="'+escSafe(cur?.templateUrl||'')+'" placeholder="https://..."></div></div><button class="primary modalSave">Salvar vínculo</button>',async()=>{
   const c=clients.find(x=>sid(x.id)===sid(document.getElementById('opsTplClient')?.value)),p=products.find(x=>sid(x.id)===sid(document.getElementById('opsTplProduct')?.value));if(!c||!p)return alert('Escolha cliente e modelo.');
   const existing=arr('labelTemplates').find(x=>sid(x.clientId)===sid(c.id)&&sid(x.productId)===sid(p.id)&&sid(x.id)!==sid(cur?.id));if(existing&&!confirm('Já existe um vínculo para este cliente/modelo. Deseja criar outro mesmo assim?'))return;
   const row={...(cur||{}),id:cur?.id||('labeltpl-'+Date.now()),clientId:c.id,clientName:c.name,productId:p.id,productName:p.name,fileName:document.getElementById('opsTplFile')?.value?.trim()||'',templateUrl:document.getElementById('opsTplUrl')?.value?.trim()||'',active:true,updatedAt:new Date().toISOString(),createdAt:cur?.createdAt||new Date().toISOString()};
   try{await saveRow('labelTemplates',row);closeModal();renderLabelTemplates();renderPackaging()}catch(e){alert('Não foi possível salvar: '+(e?.message||e))}
 });
 if(cur){document.getElementById('opsTplClient').value=sid(cur.clientId);document.getElementById('opsTplProduct').value=sid(cur.productId)}
};
window.deleteLabelTemplate9249=async function(id){const x=arr('labelTemplates').find(r=>sid(r.id)===sid(id));if(!x||!confirm('Excluir este vínculo de etiqueta?'))return;try{await saveRow('labelTemplates',x,true);renderLabelTemplates()}catch(e){alert('Falha ao excluir: '+(e?.message||e))}};
function renderPackaging(){
 const h=document.getElementById('embalagem9249Host');if(!h)return;const rows=arr('packagingAssignments').slice().sort((a,b)=>sid(b.date).localeCompare(sid(a.date))).map(x=>{const tpl=labelTemplateFor(x.clientId,x.productId);return '<tr><td>'+escSafe(x.date||'')+'</td><td><b>'+escSafe(x.packerName||'-')+'</b></td><td>'+escSafe(x.clientName||'-')+'</td><td>'+escSafe(x.productName||'-')+'</td><td>'+q(x.qty).toLocaleString('pt-BR')+'</td><td>'+q(x.doneQty).toLocaleString('pt-BR')+'</td><td class="ops-pack-status">'+(tpl?'✅ '+escSafe(tpl.fileName||'Etiqueta vinculada'):'⚠️ Sem etiqueta')+'</td><td><button class="primary" onclick="editPackaging9249(\''+escSafe(x.id)+'\')">Editar</button> '+(tpl?.templateUrl?'<button class="secondary" onclick="window.open(\''+escSafe(tpl.templateUrl)+'\',\'_blank\')">🖨️ Abrir etiqueta</button>':'')+'</td></tr>'}).join('');
 h.innerHTML='<div class="toolbar"><button class="primary" onclick="editPackaging9249()">+ Atribuir para embaladeira</button></div><div class="ops-table">'+(rows?'<table><thead><tr><th>Data</th><th>Embaladeira</th><th>Cliente</th><th>Modelo</th><th>Qtd.</th><th>Pronto</th><th>Etiqueta</th><th>Ações</th></tr></thead><tbody>'+rows+'</tbody></table>':'<div class="empty">Nenhuma atribuição de embalagem.</div>')+'</div>';
}
window.editPackaging9249=function(id){
 const cur=id?arr('packagingAssignments').find(x=>sid(x.id)===sid(id)):null,emps=arr('employees').filter(x=>x.active!==false),clients=arr('clients'),products=arr('products');
 const eo=emps.map(x=>'<option value="'+escSafe(x.id)+'">'+escSafe(x.name||'Funcionário')+'</option>').join(''),co=clients.map(x=>'<option value="'+escSafe(x.id)+'">'+escSafe(x.name||'Cliente')+'</option>').join(''),po=products.map(x=>'<option value="'+escSafe(x.id)+'">'+escSafe(x.name||'Produto')+'</option>').join('');
 openModal(cur?'Editar embalagem':'Atribuir para embaladeira','<div class="grid"><div class="field"><label>Data</label><input id="opsPackDate" type="date" value="'+escSafe(cur?.date||today())+'"></div><div class="field"><label>Embaladeira</label><select id="opsPackEmp">'+eo+'</select></div><div class="field"><label>Cliente</label><select id="opsPackClient">'+co+'</select></div><div class="field"><label>Modelo</label><select id="opsPackProduct">'+po+'</select></div><div class="field"><label>Quantidade enviada</label><input id="opsPackQty" type="number" min="0" value="'+q(cur?.qty)+'"></div><div class="field"><label>Quantidade pronta</label><input id="opsPackDone" type="number" min="0" value="'+q(cur?.doneQty)+'"></div></div><div class="field"><label>Observações</label><textarea id="opsPackNotes">'+escSafe(cur?.notes||'')+'</textarea></div><button class="primary modalSave">Salvar atribuição</button>',async()=>{
   const e=emps.find(x=>sid(x.id)===sid(document.getElementById('opsPackEmp')?.value)),c=clients.find(x=>sid(x.id)===sid(document.getElementById('opsPackClient')?.value)),p=products.find(x=>sid(x.id)===sid(document.getElementById('opsPackProduct')?.value));if(!e||!c||!p)return alert('Escolha embaladeira, cliente e modelo.');
   const qty=Math.floor(q(document.getElementById('opsPackQty')?.value)),done=Math.floor(q(document.getElementById('opsPackDone')?.value));if(done>qty)return alert('Quantidade pronta não pode ser maior que a quantidade enviada.');
   const row={...(cur||{}),id:cur?.id||('pack-'+Date.now()),date:document.getElementById('opsPackDate')?.value||today(),packerId:e.id,packerName:e.name,clientId:c.id,clientName:c.name,productId:p.id,productName:p.name,qty,doneQty:done,notes:document.getElementById('opsPackNotes')?.value?.trim()||'',status:done>=qty&&qty>0?'Concluído':done>0?'Parcial':'Aguardando',updatedAt:new Date().toISOString(),createdAt:cur?.createdAt||new Date().toISOString()};
   try{await saveRow('packagingAssignments',row);closeModal();renderPackaging()}catch(err){alert('Não foi possível salvar: '+(err?.message||err))}
 });
 if(cur){document.getElementById('opsPackEmp').value=sid(cur.packerId);document.getElementById('opsPackClient').value=sid(cur.clientId);document.getElementById('opsPackProduct').value=sid(cur.productId)}
};

/* ---------- REGULARIZAÇÃO HISTÓRICA ---------- */
let histDraft9249=[];
function parseHistLine(line){
 const p=line.split(/[;\t]/).map(x=>x.trim());if(p.length<3)return null;
 return {client:p[0]||'',product:p[1]||'',qty:Math.floor(q(p[2])),date:p[3]||today(),value:q(String(p[4]||'').replace(',','.')),orderNo:p[5]||'',status:'Prévia'};
}

function histNorm9249(v){return sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim()}
function histDate9249(text){
 let m=sid(text).match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/);if(m){let y=m[3];if(y.length===2)y='20'+y;return y+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0')}
 m=sid(text).match(/\b(\d{4})-(\d{2})-(\d{2})\b/);return m?m[0]:today();
}
function histOrder9249(text){return (sid(text).match(/(?:pedido|ped\.?|ordem)[^0-9]{0,8}#?\s*(\d{1,20})/i)||[])[1]||''}
function histClient9249(text){
 const n=histNorm9249(text);return arr('clients').filter(c=>c?.name&&n.includes(histNorm9249(c.name))).sort((a,b)=>sid(b.name).length-sid(a.name).length)[0]||null;
}
function histMoney9249(v){
 const x=sid(v).replace(/R\$/gi,'').replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
 return Math.max(0,Number(x)||0);
}
function histCatalogProduct9249(name){
 const raw=sid(name).trim(),n=histNorm9249(raw);if(!n)return null;
 const ps=arr('products');
 let exact=ps.find(x=>histNorm9249(x?.name)===n);if(exact)return exact;
 exact=ps.find(x=>n.includes(histNorm9249(x?.name))||histNorm9249(x?.name).includes(n));if(exact)return exact;
 const toks=n.split(/\s+/).filter(x=>x.length>=3),ranked=ps.map(p=>{
   const pn=histNorm9249(p?.name),pt=pn.split(/\s+/).filter(x=>x.length>=3),score=toks.filter(t=>pt.some(z=>z===t||z.includes(t)||t.includes(z))).length;
   return {p,score};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||sid(b.p?.name).length-sid(a.p?.name).length);
 return ranked[0]?.p||null;
}
function histClientExact9249(name){
 const n=histNorm9249(name);if(!n)return null;
 const cs=arr('clients');return cs.find(x=>histNorm9249(x?.name)===n)||cs.find(x=>histNorm9249(x?.name).includes(n)||n.includes(histNorm9249(x?.name)))||null;
}
function histNoteBlocks9249(text){
 const t=sid(text).replace(/\u00a0/g,' ').replace(/\r/g,'\n');
 const re=/HLGB\s+Confec(?:c|ç)[oõ]es/ig,matches=[...t.matchAll(re)],blocks=[];
 if(!matches.length)return [t];
 for(let i=0;i<matches.length;i++){const a=matches[i].index,b=i+1<matches.length?matches[i+1].index:t.length;blocks.push(t.slice(a,b))}
 return blocks;
}
function histRowsFromText9249(text){
 const out=[],seen=new Set(),blocks=histNoteBlocks9249(text);
 for(const block of blocks){
   const clientRaw=(block.match(/Nome\s+Cliente\s+([\s\S]*?)(?=\s+Prazo\s+de\s+Vencimento)/i)||[])[1]?.trim()||'';
   const client=histClientExact9249(clientRaw);
   const date=(block.match(/Data\s+de\s+Entrega\s+(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i)||[])[1]||'';
   const orderNo=(block.match(/Numero\s+De\s+Nota\s+#?\s*(\d{1,20})/i)||[])[1]||'';
   const isoDate=histDate9249(date);
   let body=block;
   const h=body.search(/Descri[cç][aã]o\s+Produto\s+Quantidade\s+Produto\s+Valor\s+Unitario\s+Total\s+Volume/i);
   if(h>=0)body=body.slice(h);
   const vt=body.search(/Valor\s+Total/i);if(vt>=0)body=body.slice(0,vt);
   const rowRe=/([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\s./_-]*?)\s+(\d{1,7})\s+R\$\s*([\d.]+,\d{2})\s+R\$\s*([\d.]+,\d{2})/g;
   let m;
   while((m=rowRe.exec(body))){
     let productRaw=sid(m[1]).replace(/Descri[cç][aã]o\s+Produto[\s\S]*$/i,'').trim();
     productRaw=productRaw.replace(/^(?:Volume\s+)?/i,'').trim();
     if(!productRaw||/valor\s+total|prazo|data\s+de|numero\s+de\s+nota|nome\s+cliente/i.test(productRaw))continue;
     const qty=Math.floor(q(m[2])),unit=histMoney9249(m[3]),total=histMoney9249(m[4]);if(!qty)continue;
     const p=histCatalogProduct9249(productRaw);
     const key=[orderNo,clientRaw,productRaw,qty,total].join('|');if(seen.has(key))continue;seen.add(key);
     out.push({
       client:client?.name||clientRaw,
       clientId:client?.id||'',
       clientMatched:!!client,
       product:p?.name||productRaw,
       productRaw,
       productId:p?.id||'',
       productMatched:!!p,
       qty,
       date:isoDate,
       value:total,
       unitPrice:unit,
       orderNo,
       status:'Prévia PDF'
     });
   }
 }
 if(out.length)return out;
 // fallback para PDFs/listas sem o layout de notas HLGB
 const client=histClient9249(text),date=histDate9249(text),orderNo=histOrder9249(text),lines=sid(text).split(/\r?\n/).map(x=>x.trim()).filter(Boolean),products=arr('products').slice().sort((a,b)=>sid(b.name).length-sid(a.name).length);
 for(const line of lines){
   const nl=histNorm9249(line),p=products.find(x=>x?.name&&nl.includes(histNorm9249(x.name)));if(!p)continue;
   const nums=(line.match(/\b\d{1,6}\b/g)||[]).map(Number).filter(x=>x>0&&x<1000000);if(!nums.length)continue;
   const key=sid(p.id)+'|'+nums[0]+'|'+line;if(seen.has(key))continue;seen.add(key);
   out.push({client:client?.name||'',clientId:client?.id||'',clientMatched:!!client,product:p.name,productRaw:p.name,productId:p.id,productMatched:true,qty:nums[0],date,value:0,unitPrice:0,orderNo,status:'Prévia PDF'});
 }
 return out;
}
async function histReadFileText9249(file){
 if(!file)return '';
 if(window.hlgbAssistantOrderImport&&typeof window.hlgbAssistantOrderImport.fileText==='function')return await window.hlgbAssistantOrderImport.fileText(file);
 if(window.hlgbPurchaseNoteImport&&typeof window.hlgbPurchaseNoteImport.readFile==='function')return await window.hlgbPurchaseNoteImport.readFile(file);
 const name=sid(file.name).toLowerCase(),type=sid(file.type);
 if(name.endsWith('.pdf')||type==='application/pdf'){
   const load=async(src,name)=>{if(window[name])return window[name];await new Promise((res,rej)=>{const sc=document.createElement('script');sc.src=src;sc.onload=res;sc.onerror=()=>rej(new Error('Não foi possível carregar o leitor de PDF.'));document.head.appendChild(sc)});return window[name]};
   const P=await load('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','pdfjsLib');P.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
   const pdf=await P.getDocument({data:await file.arrayBuffer()}).promise;let t='';for(let i=1;i<=pdf.numPages;i++){const pg=await pdf.getPage(i),ct=await pg.getTextContent();t+=ct.items.map(x=>x.str).join('\t')+'\n'}return t;
 }
 return await file.text();
}
window.readHistoricalFile9249=async function(){
 const f=document.getElementById('opsHistFile9249')?.files?.[0],status=document.getElementById('opsHistFileStatus9249'),ta=document.getElementById('opsHistPaste');if(!f)return alert('Escolha um PDF ou arquivo primeiro.');
 try{
   if(status)status.textContent='Lendo arquivo…';
   const text=await histReadFileText9249(f);if(ta)ta.value=text;
   histDraft9249=histRowsFromText9249(text);
   if(status){const notes=new Set(histDraft9249.map(x=>x.orderNo).filter(Boolean));const bad=histDraft9249.filter(x=>!x.clientMatched||!x.productMatched).length;status.textContent=histDraft9249.length?('Arquivo lido: '+histDraft9249.length+' item(ns) em '+notes.size+' nota(s) reconhecida(s).'+(bad?' '+bad+' item(ns) precisam de conferência de cliente/produto.':' Tudo reconhecido; confira a prévia abaixo.')):'Arquivo lido, mas não consegui reconhecer os itens automaticamente. Você pode revisar o texto extraído e usar Gerar prévia.';}
   renderHistPreview();
 }catch(e){if(status)status.textContent='Não foi possível ler o arquivo: '+sid(e?.message||e)}
};
function renderHistorical(){
 const h=document.getElementById('regularizacao9249Host');if(!h)return;
 h.innerHTML='<div class="panel"><h3>Importar notas/entregas para conferência</h3><div class="sub">Você pode colar a lista ou importar PDF/foto/TXT/CSV. O sistema extrai o conteúdo e monta uma prévia; nada é alterado até você confirmar.</div><div class="field"><label>Arquivo</label><input id="opsHistFile9249" type="file" accept=".pdf,image/*,.txt,.csv,application/pdf"></div><div class="toolbar"><button class="secondary" onclick="readHistoricalFile9249()">📥 Ler PDF / arquivo</button></div><div class="field"><label>Texto/lista extraída</label><textarea id="opsHistPaste" rows="8" style="width:100%" placeholder="Quézia; Camisola Romantic; 100; 2026-09-15; 1290; 87"></textarea></div><div id="opsHistFileStatus9249" class="sub"></div><div class="toolbar"><button class="secondary" onclick="previewHistorical9249()">Gerar prévia</button><button class="primary" onclick="applyHistorical9249()">Confirmar regularização</button></div></div><div id="opsHistPreview"></div>';
 renderHistPreview();
}
window.previewHistorical9249=function(){histDraft9249=sid(document.getElementById('opsHistPaste')?.value).split(/\n+/).map(parseHistLine).filter(x=>x&&x.qty>0);renderHistPreview()};
function findClientByName(n){const k=sid(n).toLowerCase();return arr('clients').find(x=>sid(x.name).toLowerCase()===k)||arr('clients').find(x=>sid(x.name).toLowerCase().includes(k)||k.includes(sid(x.name).toLowerCase()))}
function findProductByName(n){const k=sid(n).toLowerCase();return arr('products').find(x=>sid(x.name).toLowerCase()===k)||arr('products').find(x=>sid(x.name).toLowerCase().includes(k)||k.includes(sid(x.name).toLowerCase()))}
function renderHistPreview(){
 const box=document.getElementById('opsHistPreview');if(!box)return;
 const rows=histDraft9249.map((x,i)=>{const c=findClientByName(x.client),p=findProductByName(x.product),ok=!!(c&&p);return '<tr><td>'+(i+1)+'</td><td>'+escSafe(x.client)+(c?' ✅':' ⚠️')+'</td><td>'+escSafe(x.product)+(p?' ✅':' ⚠️')+'</td><td>'+x.qty+'</td><td>'+escSafe(x.date)+'</td><td>'+moneySafe(x.value)+'</td><td>'+(ok?'Pronto para confirmar':'Corrija cliente/produto')+'</td></tr>'}).join('');
 box.innerHTML=rows?'<div class="panel"><h3>Prévia — nenhuma alteração feita ainda</h3><div class="ops-table"><table><thead><tr><th>#</th><th>Cliente</th><th>Produto</th><th>Qtd.</th><th>Data</th><th>Valor</th><th>Pedido</th><th>Conferência</th></tr></thead><tbody>'+rows+'</tbody></table></div><div class="sub">Ao confirmar, o item entra na Montagem de Notas como entrega histórica. O corte histórico não recebe cortador automaticamente.</div></div>':'';
}

function displayOrderNo9249(o){try{return typeof displayOrderNumber==='function'?sid(displayOrderNumber(o)):sid(o?.orderNumber||o?.number||o?.id)}catch(e){return sid(o?.orderNumber||o?.number||o?.id)}}
async function reconcileHistoricalOrder9249(x,c,p){
 if(!x.orderNo)return {linked:false};
 const o=arr('orders').find(z=>displayOrderNo9249(z)===sid(x.orderNo)||sid(z.id)===sid(x.orderNo));
 if(!o)throw new Error('Pedido '+x.orderNo+' não encontrado para '+c.name+'.');
 if(sid(o.clientId)!==sid(c.id)&&sid(o.client).toLowerCase()!==sid(c.name).toLowerCase())throw new Error('O pedido '+x.orderNo+' não pertence ao cliente '+c.name+'.');
 let cut=arr('cuts').find(z=>sid(z.orderId)===sid(o.id)&&sid(z.productId)===sid(p.id)&&z.historical===true);
 if(!cut){
   cut={id:Date.now()+Math.floor(Math.random()*900000),orderId:o.id,productId:p.id,client:c.name,product:p.name,pieces:x.qty,status:'Finalizado',finishedAt:x.date,finishedAtTime:new Date().toISOString(),historical:true,noCutterAssignment:true,cutterId:null,cutterName:'',cutAdjustmentNote:'Regularização histórica sem atribuição de cortador'};
   cut=await saveRow('cuts',cut);
 }
 let prod=arr('production').find(z=>sid(z.cutId)===sid(cut.id)&&sid(z.productId)===sid(p.id));
 if(!prod){
   prod={id:Date.now()+Math.floor(Math.random()*900000),cutId:cut.id,orderId:o.id,productId:p.id,op:'HIST-'+displayOrderNo9249(o),product:p.name,client:c.name,planned:x.qty,done:x.qty,stage:'Finalizado',finishedAt:x.date,productionCompletedAt:x.date,historical:true,noCutterAssignment:true,date:x.date};
   prod=await saveRow('production',prod);
 }else if(q(prod.done)<x.qty||q(prod.planned)<x.qty){
   const next={...clone(prod),planned:Math.max(q(prod.planned),x.qty),done:Math.max(q(prod.done),x.qty),stage:'Finalizado',finishedAt:prod.finishedAt||x.date,productionCompletedAt:prod.productionCompletedAt||x.date,historical:true,noCutterAssignment:true};
   prod=await saveRow('production',next);
 }
 const nextOrder={...clone(o),status:'Nota emitida',updatedAt:new Date().toISOString(),historicalRegularizedAt:new Date().toISOString()};
 await saveRow('orders',nextOrder);
 return {linked:true,orderId:o.id,cutId:cut.id,productionId:prod.id};
}
window.applyHistorical9249=async function(){
 if(!histDraft9249.length)return alert('Gere a prévia primeiro.');
 const bad=histDraft9249.filter(x=>!findClientByName(x.client)||!findProductByName(x.product));if(bad.length)return alert('Há linhas com cliente ou produto não encontrado. Corrija antes de confirmar.');
 if(!confirm('Confirmar '+histDraft9249.length+' item(ns) históricos? Eles entrarão na Montagem de Notas sem atribuir cortador.'))return;
 try{
  for(const x of histDraft9249){const c=findClientByName(x.client),p=findProductByName(x.product),unit=x.qty>0?x.value/x.qty:0,id='hist-'+Date.now()+'-'+Math.floor(Math.random()*900000);const linked=await reconcileHistoricalOrder9249(x,c,p);const row={id,clientId:c.id,clientName:c.name,productId:p.id,productName:p.name,orderId:linked.orderId||null,qty:x.qty,remainingQty:x.qty,unitPrice:unit,deliveryDate:x.date,source:'Regularização histórica',sourceType:'historical',status:'Aguardando',historical:true,noCutterAssignment:true,createdAt:new Date().toISOString()};await saveRow('noteQueue',row);await saveRow('historicalImports',{id:'histlog-'+id,clientId:c.id,clientName:c.name,productId:p.id,productName:p.name,orderNo:x.orderNo||'',orderId:linked.orderId||null,cutId:linked.cutId||null,productionId:linked.productionId||null,qty:x.qty,date:x.date,value:x.value,noteQueueId:id,noCutterAssignment:true,createdAt:new Date().toISOString()})}
  histDraft9249=[];document.getElementById('opsHistPaste').value='';renderHistPreview();try{window.renderNoteQueue9202?.()}catch(e){};alert('Regularização lançada. Os itens estão na Montagem de Notas para você conferir/faturar.');
 }catch(e){alert('A regularização parou porque uma gravação não foi confirmada: '+(e?.message||e))}
};

/* ---------- ASSISTENTE / MOBILE ---------- */
function enhanceAssistant(){
 const b=document.getElementById('hlgbAssistantFloatingBtn');if(b){b.classList.add('ops-float-assistant');b.innerHTML='🤖 <span class="ops-long">Assistente HLGB</span>'}
 if(!document.getElementById('opsAssistantShortcut9249')&&document.getElementById('dashboard')){
   const d=document.createElement('button');d.id='opsAssistantShortcut9249';d.type='button';d.className='primary';d.textContent='🤖 Abrir Assistente HLGB';d.onclick=()=>window.openHlgbAssistant?.();document.getElementById('dashboard').insertBefore(d,document.getElementById('dashboard').children[2]||null);
 }
}
function installAssistantGrade(){
 const old=window.hlgbAssistantAsk;if(typeof old!=='function'||old.__opsGrade9249)return;
 const w=function(){
  const input=document.getElementById('hlgbAssistantInput'),out=document.getElementById('hlgbAssistantAnswer'),raw=sid(input?.value),n=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/\bgrade\b|\bcontagem\b|\bpecas\b/.test(n)){
    const sizes=['PP','P','M','G','GG','XG','EXG'],vals=[];sizes.forEach(s=>{const re=new RegExp('(?:^|\\s)'+s+'\\s*[:=\\-]?\\s*(\\d+)','i'),m=raw.match(re);if(m)vals.push([s,+m[1]])});
    if(vals.length){const total=vals.reduce((a,x)=>a+x[1],0);if(out)out.innerHTML='<h3 style="margin-top:0">Grade conferida</h3>'+vals.map(x=>'<b>'+x[0]+'</b>: '+x[1].toLocaleString('pt-BR')).join(' · ')+'<br><br><b>Total: '+total.toLocaleString('pt-BR')+' peças</b><div class="sub" style="margin-top:8px">Você pode continuar a frase com cliente/modelo para usar essa contagem no fluxo da nota.</div>';return}
  }
  return old.apply(this,arguments);
 };w.__opsGrade9249=true;w.__original=old;window.hlgbAssistantAsk=w;
}

/* ---------- DIAGNÓSTICO AUTOMÁTICO ---------- */
function scheduleAudit(){
 const KEY='hlgb_ops_last_auto_audit_9249',last=Number(localStorage.getItem(KEY)||0),due=12*60*60*1000;if(Date.now()-last<due)return;
 setTimeout(async()=>{try{if(window.hlgbInternalAuditor&&typeof window.hlgbInternalAuditor.run==='function'){const run=await window.hlgbInternalAuditor.run('full');if(run&&typeof window.hlgbInternalAuditor.saveRun==='function')await window.hlgbInternalAuditor.saveRun(run);localStorage.setItem(KEY,String(Date.now()))}else if(typeof window.hlgbAuditorRunFull==='function'){await window.hlgbAuditorRunFull();localStorage.setItem(KEY,String(Date.now()))}}catch(e){console.warn('[HLGB '+V+'] auditoria automática',e)}},4000);
}

/* ---------- BOOT ---------- */
function refreshIncoming(module){
 if(['routePlans'].includes(module)&&document.querySelector('#rotas9249.page.active'))renderRoutes();
 if(['labelTemplates'].includes(module)){if(document.querySelector('#etiquetasEmb9249.page.active'))renderLabelTemplates();if(document.querySelector('#embalagem9249.page.active'))renderPackaging()}
 if(['packagingAssignments'].includes(module)&&document.querySelector('#embalagem9249.page.active'))renderPackaging();
 if(module==='suppliers'&&document.querySelector('#revenda9235.page.active'))setTimeout(renderResaleEnhanced,60);
}
function boot(){
 try{const v=document.querySelector('#appShell .logo small');if(v)v.textContent='v92.49';const lb=document.querySelector('#loginScreen b');if(lb&&/Versão/i.test(lb.textContent||''))lb.textContent='Versão v92.49';document.title='HLGB Confecções — Sistema de Gestão v92.49 Multiusuário'}catch(e){}
 ensureStyle();ensurePages();ensureNav();installResaleFix();enhanceAssistant();installAssistantGrade();scheduleAudit();
 if(document.querySelector('#revenda9235.page.active'))renderResaleEnhanced();
}
const incoming=window.hlgbRenderIncomingRecord;if(typeof incoming==='function'&&!incoming.__ops9249){window.hlgbRenderIncomingRecord=function(module){const r=incoming.apply(this,arguments);setTimeout(()=>refreshIncoming(module),80);return r};window.hlgbRenderIncomingRecord.__ops9249=true}
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(boot,450);setTimeout(boot,1800)},0);else setTimeout(boot,1000);
setTimeout(boot,2500);
window.HLGB_OPERATIONS_PACK=V;
console.info('[HLGB] pacote operacional '+V+' carregado');
})();