from pathlib import Path
import re

path=Path('index.html')
s=path.read_text(encoding='utf-8')

if 'v91.15 Multiusuário' in s:
    print('v91.15 already applied')
    raise SystemExit(0)


def rep(old,new,label):
    global s
    n=s.count(old)
    if n<1:
        raise SystemExit(f'{label}: anchor not found')
    s=s.replace(old,new,1)
    print(label)


def sub(pattern,repl,label,flags=re.S):
    global s
    s2,n=re.subn(pattern,repl,s,count=1,flags=flags)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 match, got {n}')
    s=s2
    print(label)

# -----------------------------------------------------------------------------
# 1) HUB FINANCEIRO: menu + página vazia + permissão própria
# -----------------------------------------------------------------------------
rep(
'''    <button onclick="page('financeiro',this)">Financeiro geral</button>
    <button onclick="page('folhaPagamento',this)">Folha de pagamento</button>''',
'''    <button onclick="page('financeiro',this)">Financeiro geral</button>
    <button onclick="page('hubFinanceiro',this)">Hub Financeiro</button>
    <button onclick="page('folhaPagamento',this)">Folha de pagamento</button>''',
'hub menu')

rep(
'''<section id="config" class="page"><h1>Configurações</h1>''',
'''<section id="hubFinanceiro" class="page">
<h1>Hub Financeiro</h1>
<div class="sub">Área financeira independente, reservada para a próxima etapa de configuração.</div>
<div class="panel"><div class="empty">Hub Financeiro criado. Nenhuma função foi adicionada ainda.</div></div>
</section>

<section id="config" class="page"><h1>Configurações</h1>''',
'hub page')

rep('financeiro:"financeiro",folhaPagamento:"folhaPagamento"',
    'financeiro:"financeiro",hubFinanceiro:"hubFinanceiro",folhaPagamento:"folhaPagamento"',
    'hub access map')
rep('["financeiro","Financeiro"],["folhaPagamento","Folha de pagamento"]',
    '["financeiro","Financeiro"],["hubFinanceiro","Hub Financeiro"],["folhaPagamento","Folha de pagamento"]',
    'hub access option')

# -----------------------------------------------------------------------------
# 2) RELATÓRIO DE VENDA POR PRODUTO
# -----------------------------------------------------------------------------
sub(
 r'<section id="relatorios" class="page"><h1>Relatórios</h1>.*?</section>',
 r'''<section id="relatorios" class="page">
<h1>Relatórios</h1>
<div class="sub">Resumo operacional para tomada de decisão.</div>
<div class="cards" id="reportCards"></div>
<div class="panel"><h2>Indicadores</h2><div id="reportBody"></div></div>
<div class="panel">
  <h2>📦 Venda por produto</h2>
  <div class="sub">Quantidade e valor vendido por produto no período escolhido.</div>
  <div class="toolbar" style="align-items:flex-end;flex-wrap:wrap;margin-top:12px">
    <button type="button" class="secondary" onclick="setProductSalesReportPeriod('week')">Esta semana</button>
    <button type="button" class="secondary" onclick="setProductSalesReportPeriod('month')">Este mês</button>
    <button type="button" class="secondary" onclick="setProductSalesReportPeriod('year')">Este ano</button>
    <div class="field"><label>De</label><input id="productSalesStart" type="date" onchange="renderProductSalesReport()"></div>
    <div class="field"><label>Até</label><input id="productSalesEnd" type="date" onchange="renderProductSalesReport()"></div>
  </div>
  <div class="cards" id="productSalesCards"></div>
  <div id="productSalesReport"></div>
</div>
</section>''',
 'reports page')

new_reports=r'''function productSalesOrderDate(o){
  let d=o?.orderDate||o?.createdDate||(o?.createdAt?String(o.createdAt).slice(0,10):"")||o?.date||"";
  return String(d||"").slice(0,10);
}
function productSalesUnitPrice(o,productId,item={}){
  let direct=+(item.unitPrice??item.price??0)||0;
  if(direct>0)return direct;
  if(+o?.productId===+productId && (+o?.unitPrice||0)>0)return +o.unitPrice||0;
  try{let p=+suggestedPrice(o?.clientId||0,productId)||0;if(p>0)return p}catch(e){}
  return +(db.products||[]).find(p=>+p.id===+productId)?.price||0;
}
function productSalesLines(o){
  let raw=[];
  if(Array.isArray(o?.grade)&&o.grade.length)raw=o.grade;
  else if(Array.isArray(o?.lines)&&o.lines.length)raw=o.lines;
  let grouped={};
  raw.forEach(it=>{
    let pid=+(it.productId||o.productId)||0,qty=+(it.qty??it.quantity??0)||0;
    if(!pid||qty<=0)return;
    let product=(db.products||[]).find(p=>+p.id===pid);
    let unit=productSalesUnitPrice(o,pid,it);
    let key=String(pid);
    if(!grouped[key])grouped[key]={productId:pid,name:product?.name||it.productName||it.name||"Produto",qty:0,value:0};
    grouped[key].qty+=qty;
    grouped[key].value+=qty*unit;
  });
  let lines=Object.values(grouped);
  if(!lines.length && o?.productId){
    let pid=+o.productId,qty=+(o.qty??o.totalQty??0)||0;
    if(qty<=0){try{qty=+qtyOfOrder(o)||0}catch(e){}}
    let product=(db.products||[]).find(p=>+p.id===pid);
    let unit=productSalesUnitPrice(o,pid,o);
    if(qty>0)lines=[{productId:pid,name:product?.name||o.items||"Produto",qty,value:qty*unit}];
  }
  if(lines.length===1 && (+o?.total||0)>0){
    lines[0].value=+o.total||0;
  }
  return lines;
}
function setProductSalesReportPeriod(mode){
  let now=new Date();now.setHours(12,0,0,0);let start=new Date(now),end=new Date(now);
  if(mode==="week"){
    let day=(now.getDay()+6)%7;start.setDate(now.getDate()-day);end=new Date(start);end.setDate(start.getDate()+6);
  }else if(mode==="year"){
    start=new Date(now.getFullYear(),0,1,12);end=new Date(now.getFullYear(),11,31,12);
  }else{
    start=new Date(now.getFullYear(),now.getMonth(),1,12);end=new Date(now.getFullYear(),now.getMonth()+1,0,12);
  }
  let a=document.getElementById("productSalesStart"),b=document.getElementById("productSalesEnd");
  if(a)a.value=isoDate(start);if(b)b.value=isoDate(end);renderProductSalesReport();
}
function renderProductSalesReport(){
  let a=document.getElementById("productSalesStart"),b=document.getElementById("productSalesEnd");
  if(!a||!b)return;
  if(!a.value||!b.value){setProductSalesReportPeriod("month");return}
  let start=a.value,end=b.value,map={};
  (db.orders||[]).filter(o=>!o.deletedAt&&!o.cancelledAt).forEach(o=>{
    let d=productSalesOrderDate(o);if(!d||(start&&d<start)||(end&&d>end))return;
    productSalesLines(o).forEach(line=>{
      let key=String(line.productId||line.name);
      if(!map[key])map[key]={name:line.name||"Produto",qty:0,value:0,orders:new Set()};
      map[key].qty+=+line.qty||0;map[key].value+=+line.value||0;map[key].orders.add(String(o.id));
    });
  });
  let rows=Object.values(map).sort((x,y)=>y.value-x.value||y.qty-x.qty);
  let totalQty=rows.reduce((s,r)=>s+r.qty,0),totalValue=rows.reduce((s,r)=>s+r.value,0),totalOrders=new Set();
  (db.orders||[]).filter(o=>{let d=productSalesOrderDate(o);return d&&(!start||d>=start)&&(!end||d<=end)&&!o.deletedAt&&!o.cancelledAt}).forEach(o=>totalOrders.add(String(o.id)));
  let cards=document.getElementById("productSalesCards");
  if(cards)cards.innerHTML=`<div class="card"><small>Produtos vendidos</small><strong>${rows.length}</strong></div><div class="card"><small>Peças vendidas</small><strong>${totalQty.toLocaleString("pt-BR")}</strong></div><div class="card"><small>Valor vendido</small><strong>${money(totalValue)}</strong></div><div class="card"><small>Pedidos no período</small><strong>${totalOrders.size}</strong></div>`;
  let el=document.getElementById("productSalesReport");
  if(el)el.innerHTML=rows.length?table(["Produto","Pedidos","Quantidade vendida","Valor vendido","Preço médio"],rows.map(r=>[
    esc(r.name),r.orders.size,r.qty.toLocaleString("pt-BR"),money(r.value),money(r.qty?r.value/r.qty:0)
  ])):'<div class="empty">Nenhuma venda de produto encontrada neste período.</div>';
}
function renderReports(){
  let revenue=(db.orders||[]).reduce((a,o)=>a+(+o.total||0),0),late=(db.orders||[]).filter(o=>o.date<new Date().toISOString().slice(0,10)&&o.status!=="Pedido finalizado").length;
  if(reportCards)reportCards.innerHTML=`<div class="card"><small>Valor dos pedidos</small><strong>${money(revenue)}</strong></div><div class="card"><small>Produtos cadastrados</small><strong>${(db.products||[]).length}</strong></div><div class="card"><small>OPs abertas</small><strong>${(db.production||[]).filter(p=>p.stage!=="Pronto").length}</strong></div><div class="card"><small>Pedidos atrasados</small><strong>${late}</strong></div>`;
  if(reportBody)reportBody.innerHTML=`<div class="kpi"><span class="dot"></span><div><b>Produção total planejada:</b> ${(db.production||[]).reduce((a,p)=>a+(+p.planned||0),0)} peças<br><b>Produção realizada:</b> ${(db.production||[]).reduce((a,p)=>a+(+p.done||0),0)} peças<br><b>Saldo de estoque:</b> ${(db.stock||[]).reduce((a,x)=>a+(+x.qty||0),0).toLocaleString("pt-BR")} unidades/medidas registradas.</div></div>`;
  renderProductSalesReport();
}
'''
sub(r'function renderReports\(\)\{.*?\}\n\nconst accessOptions=',new_reports+'\nconst accessOptions=','reports logic')

# -----------------------------------------------------------------------------
# 3) USUÁRIOS ONLINE: não mostrar "Ativar online" para vínculo já existente
# -----------------------------------------------------------------------------
rep('function userOnlineReady(u){return !!(String(u?.user||u?.email||"").includes("@"));}',
    'function userOnlineReady(u){return !!(u?.onlineReady||String(u?.authId||"").trim()||String(u?.user||u?.email||"").includes("@"));}',
    'online user detection')
rep('const loginHtml=online?`<b>${esc(u.user||u.email||"-")}</b>',
    'const loginHtml=online?`<b>${esc(u.user||u.email||"Acesso online vinculado")}</b>',
    'online user label')
sub(r'  const actions=u\.role==="admin"\?"-":.*?;\n  return \[',
'''  const actions=u.role==="admin"?"-":`${online?'<span class="badge ok">🌐 Online</span> ':`<button type="button" class="primary" onclick="activateLegacyUserOnline('${String(u.id).replace(/'/g,"\\'")}')">🌐 Ativar online</button> `}<button type="button" class="secondary" onclick="editUser('${String(u.id).replace(/'/g,"\\'")}')">✏️ Editar usuário</button> ${online?`<button type="button" class="secondary" onclick="resetSecondaryUserPassword('${String(u.id).replace(/'/g,"\\'")}')">🔑 Redefinir senha</button> `:""}<button type="button" class="${u.active===false?'secondary':'danger'}" onclick="toggleUser('${String(u.id).replace(/'/g,"\\'")}')">${u.active===false?'Ativar':'Desativar'}</button>`;
  return [''',
'online user actions')

# -----------------------------------------------------------------------------
# 4) ENVIO PARA FACÇÕES: modelos disponíveis depois do corte/produção
# -----------------------------------------------------------------------------
rep(
'''<div class="panel"><h2>Envios para facção</h2>
<div class="toolbar"><button class="primary" onclick="newFaction()">+ Lançar envio</button></div>
<div class="cards" id="factionProductionCards"></div>''',
'''<div class="panel"><h2>Modelos disponíveis para envio</h2>
<div class="sub">Modelos liberados pelo corte/produção que ainda possuem quantidade disponível para enviar a uma facção.</div>
<div id="factionAvailableModels" style="margin-top:12px"></div></div>
<div class="panel"><h2>Envios para facção</h2>
<div class="toolbar"><button class="primary" onclick="newFaction()">+ Lançar envio manual</button></div>
<div class="cards" id="factionProductionCards"></div>''',
'faction available panel')

faction_helpers=r'''function factionAvailableModels(){
  let out=[],seenOrders=new Set();
  let factions=Array.isArray(db.factions)?db.factions:[];
  let productions=Array.isArray(db.production)?db.production:[];
  let orders=Array.isArray(db.orders)?db.orders:[];
  productions.forEach(p=>{
    let o=orders.find(x=>+x.id===+p.orderId),product=(db.products||[]).find(x=>+x.id===+p.productId);
    let planned=+p.planned||0;if(planned<=0&&o){try{planned=+qtyOfOrder(o)||0}catch(e){}}
    let already=factions.filter(f=>+f.productionId===+p.id).reduce((s,f)=>s+(+f.sent||0),0);
    let remaining=Math.max(0,planned-already);
    let stage=String(p.stage||"");
    if(remaining<=0||(/^(Pronto|Finalizado)$/i.test(stage)&&(+p.done||0)>=planned))return;
    let model=product?.name||p.product||(o?orderProductSummary(o):"")||"Modelo";
    out.push({key:`p:${p.id}`,productionId:p.id,orderId:o?.id||p.orderId||null,productId:p.productId||o?.productId||null,op:p.op||"",model,remaining,dueDate:o?.date||p.factionDueDate||"",stage:stage||"Aguardando produção",client:o?.client||p.client||"-"});
    if(o)seenOrders.add(+o.id);
  });
  orders.forEach(o=>{
    if(seenOrders.has(+o.id)||o.deletedAt||o.cancelledAt)return;
    let cuts=(db.cuts||[]).filter(c=>+c.orderId===+o.id);
    let released=cuts.some(c=>/final|pronto|conclu/i.test(String(c.status||"")));
    if(!released)return;
    let planned=0;try{planned=+qtyOfOrder(o)||0}catch(e){}
    let already=factions.filter(f=>+f.orderId===+o.id).reduce((s,f)=>s+(+f.sent||0),0),remaining=Math.max(0,planned-already);
    if(remaining<=0)return;
    out.push({key:`o:${o.id}`,productionId:null,orderId:o.id,productId:o.productId||null,op:cuts[0]?.op||"",model:orderProductSummary(o)||o.items||"Modelo",remaining,dueDate:o.date||"",stage:"Corte finalizado",client:o.client||"-"});
  });
  return out.sort((a,b)=>String(a.dueDate||"9999-12-31").localeCompare(String(b.dueDate||"9999-12-31"))||String(a.model).localeCompare(String(b.model),'pt-BR'));
}
function renderFactionAvailableModels(){
  let el=document.getElementById("factionAvailableModels");if(!el)return;
  let rows=factionAvailableModels();
  el.innerHTML=rows.length?table(["Pedido","Cliente","Modelo","Etapa","Disponível","Previsão","Ação"],rows.map(r=>[
    r.orderId?`#${esc(typeof displayOrderNumber==='function'?displayOrderNumber((db.orders||[]).find(o=>+o.id===+r.orderId)||{id:r.orderId}):r.orderId)}`:"-",
    esc(r.client||"-"),`<b>${esc(r.model)}</b>`,esc(r.stage||"-"),r.remaining.toLocaleString("pt-BR"),r.dueDate?fmtDate(r.dueDate):"-",
    `<button type="button" class="primary" onclick='openFactionAvailableModel(${JSON.stringify(r.key)})'>Enviar para facção</button>`
  ])):'<div class="empty">Nenhum modelo liberado para envio no momento.</div>';
}
function openFactionAvailableModel(key){
  let r=factionAvailableModels().find(x=>String(x.key)===String(key));if(!r){alert("Este modelo já não está disponível para envio.");renderFactionAvailableModels();return}
  newFaction({productionId:r.productionId,orderId:r.orderId,productId:r.productId,op:r.op,description:r.model,sent:r.remaining,dueDate:r.dueDate});
}
'''
rep('function factionForm(f={}){',faction_helpers+'\nfunction factionForm(f={}){','faction helpers')
sub(r'(function factionForm\(f=\{\}\)\{\n return `<div class="grid">)',r'''\1
   <input id="mfproductionid" type="hidden" value="${f.productionId??""}">
   <input id="mforderid" type="hidden" value="${f.orderId??""}">
   <input id="mfproductid" type="hidden" value="${f.productId??""}">''','faction hidden links')
rep('<div class="field"><label>Modelo</label><input id="mfdesc" placeholder="Ex.: Robe Alice"',
    '<div class="field"><label>Modelo</label><input id="mfdesc" list="factionAvailableModelList" placeholder="Ex.: Robe Alice"',
    'faction model datalist input')
# Add datalist right before closing form grid (anchored by status field area)
rep('''   <div class="field"><label>Status do serviço</label><select id="mfstatus">''',
'''   <datalist id="factionAvailableModelList">${factionAvailableModels().map(r=>`<option value="${esc(r.model)}">`).join("")}</datalist>
   <div class="field"><label>Status do serviço</label><select id="mfstatus">''',
'faction model datalist')
rep(''' Object.assign(f,{
   name:document.getElementById("mname")?.value||"",''',
''' Object.assign(f,{
   productionId:document.getElementById("mfproductionid")?.value?+document.getElementById("mfproductionid").value:null,
   orderId:document.getElementById("mforderid")?.value?+document.getElementById("mforderid").value:null,
   productId:document.getElementById("mfproductid")?.value?+document.getElementById("mfproductid").value:null,
   name:document.getElementById("mname")?.value||"",''',
'faction save links')
sub(r'function newFaction\(\)\{.*?\n\}\nfunction editFaction',r'''function newFaction(prefill=null){
 let seed=prefill&&typeof prefill==="object"?prefill:{};
 let f={id:Date.now(),date:isoDate(new Date()),sentAt:isoDate(new Date()),status:"Enviado",...seed};
 openModal("Novo envio para facção",factionForm(f)+`<button type="button" class="primary modalSave">💾 Salvar envio</button>`,()=>{
   saveFactionServiceFromForm(f);
   if(!f.name){alert("Selecione a facção.");return}
   if(!f.description){alert("Informe ou selecione o modelo.");return}
   db.factions.push(f);
   syncFactionPayments();
   closeModal();save();renderFactions();
 });
}
function editFaction''','faction new linked send')
rep(' let fc=document.getElementById("factionProductionCards");\n',
    ' let fc=document.getElementById("factionProductionCards");\n renderFactionAvailableModels();\n',
    'faction render available')

# -----------------------------------------------------------------------------
# 5) INVENTÁRIO: máquinas vinculadas a locais e pessoas já cadastradas
# -----------------------------------------------------------------------------
sub(r'<section id="inventarioBens" class="page">.*?</section>',r'''<section id="inventarioBens" class="page"><h1>Inventário de bens</h1><div class="sub">Controle máquinas, móveis, equipamentos, ferramentas e demais bens da confecção.</div>
<div id="assetCards" class="cards"></div>
<div class="panel"><h2>🏭 Maquinário por local</h2><div class="sub">Quantidade e valor das máquinas alocadas em cada local de produção.</div><div id="assetLocationSummary"></div></div>
<div class="panel"><div class="toolbar" style="align-items:flex-end;flex-wrap:wrap"><button class="primary" onclick="newAsset()">+ Cadastrar bem</button><div class="field"><label>Buscar</label><input id="assetSearch" placeholder="Máquina, patrimônio, local..." oninput="renderAssets()"></div><div class="field"><label>Categoria</label><select id="assetCategoryFilter" onchange="renderAssets()"><option value="">Todas</option><option>Máquina</option><option>Móvel</option><option>Equipamento</option><option>Eletrônico</option><option>Ferramenta</option><option>Outro</option></select></div></div><div id="assetTable"></div></div></section>''','asset page')

asset_logic=r'''// ---------- Inventário de bens ----------
function assetLocationOptions(a={}){
 let locs=(db.productionLocations||[]).filter(x=>x.active!==false),selected=+a.productionLocationId||0;
 let html='<option value="">Selecione o local</option>'+locs.map(l=>`<option value="${l.id}" ${+l.id===selected?'selected':''}>${esc(l.name)}</option>`).join('');
 if(!selected&&a.location&& !locs.some(l=>String(l.name)===String(a.location)))html+=`<option value="legacy" selected>${esc(a.location)} (cadastro antigo)</option>`;
 return html;
}
function assetResponsibleOptions(a={}){
 let selectedType=String(a.responsibleType||""),selectedId=String(a.responsibleId||"");
 let opts=['<option value="">Sem responsável específico</option>'];
 (db.employees||[]).filter(e=>e.active!==false).forEach(e=>opts.push(`<option value="employee:${e.id}" ${selectedType==='employee'&&selectedId===String(e.id)?'selected':''}>👤 ${esc(e.name)}</option>`));
 (db.factionMasters||[]).forEach(f=>opts.push(`<option value="faction:${f.id}" ${selectedType==='faction'&&selectedId===String(f.id)?'selected':''}>🏭 ${esc(f.name)}</option>`));
 if(a.responsibleName && !selectedId)opts.push(`<option value="legacy" selected>${esc(a.responsibleName)} (cadastro antigo)</option>`);
 return opts.join('');
}
function assetForm(a={}){return `<div class="grid"><div class="field"><label>Bem / descrição</label><input id="assetName" value="${esc(a.name||"")}"></div><div class="field"><label>Categoria</label><select id="assetCategory">${["Máquina","Móvel","Equipamento","Eletrônico","Ferramenta","Outro"].map(x=>`<option ${x===(a.category||"Máquina")?"selected":""}>${x}</option>`).join("")}</select></div><div class="field"><label>Marca / modelo</label><input id="assetModel" value="${esc(a.model||"")}"></div><div class="field"><label>Nº patrimônio / série</label><input id="assetSerial" value="${esc(a.serial||"")}"></div><div class="field"><label>Quantidade</label><input id="assetQty" type="number" min="0" step="1" value="${a.qty??1}"></div><div class="field"><label>Local de produção</label><select id="assetLocation">${assetLocationOptions(a)}</select></div><div class="field"><label>Pessoa / responsável</label><select id="assetResponsible">${assetResponsibleOptions(a)}</select></div><div class="field"><label>Data de aquisição</label><input id="assetDate" type="date" value="${a.purchaseDate||""}"></div><div class="field"><label>Valor de aquisição</label><input id="assetValue" type="number" min="0" step="0.01" value="${a.value??0}"></div><div class="field"><label>Estado</label><select id="assetStatus">${["Em uso","Reserva","Manutenção","Baixado"].map(x=>`<option ${x===(a.status||"Em uso")?"selected":""}>${x}</option>`).join("")}</select></div><div class="field" style="grid-column:1/-1"><label>Observação</label><textarea id="assetNote">${esc(a.note||"")}</textarea></div></div>`}
function readAssetForm(){
 let locSel=document.getElementById("assetLocation"),locId=locSel?.value||"",loc=(db.productionLocations||[]).find(x=>String(x.id)===String(locId));
 let respRaw=document.getElementById("assetResponsible")?.value||"",responsibleType="",responsibleId=null,responsibleName="";
 if(respRaw&&respRaw!=="legacy"){
   let [type,id]=respRaw.split(':');responsibleType=type;responsibleId=id;
   if(type==='employee')responsibleName=(db.employees||[]).find(x=>String(x.id)===String(id))?.name||"";
   if(type==='faction')responsibleName=(db.factionMasters||[]).find(x=>String(x.id)===String(id))?.name||"";
 }
 return {name:document.getElementById("assetName")?.value.trim()||"",category:document.getElementById("assetCategory")?.value||"Outro",model:document.getElementById("assetModel")?.value||"",serial:document.getElementById("assetSerial")?.value||"",qty:Math.max(0,+document.getElementById("assetQty")?.value||0),productionLocationId:loc?loc.id:null,location:loc?.name||(locId==='legacy'?String(locSel?.selectedOptions?.[0]?.textContent||'').replace(' (cadastro antigo)',''):""),responsibleType,responsibleId,responsibleName,purchaseDate:document.getElementById("assetDate")?.value||"",value:+document.getElementById("assetValue")?.value||0,status:document.getElementById("assetStatus")?.value||"Em uso",note:document.getElementById("assetNote")?.value||""}
}
function newAsset(){ensureV8946Data();openModal("Cadastrar bem",assetForm()+`<button class="primary modalSave">Salvar bem</button>`,()=>{let d=readAssetForm();if(!d.name){alert("Informe o bem.");return}db.assets.push({id:Date.now(),...d});closeModal();try{persistDb()}catch(e){}renderAssets()})}
function editAsset(id){let a=(db.assets||[]).find(x=>+x.id===+id);if(!a)return;openModal("Editar bem",assetForm(a)+`<button class="primary modalSave">Salvar alterações</button>`,()=>{Object.assign(a,readAssetForm());closeModal();try{persistDb()}catch(e){}renderAssets()})}
function deleteAsset(id){if(!confirm("Excluir este bem do inventário?"))return;db.assets=(db.assets||[]).filter(x=>+x.id!==+id);try{persistDb()}catch(e){}renderAssets()}
function renderAssets(){
 ensureV8946Data();let q=(document.getElementById("assetSearch")?.value||"").toLowerCase(),cat=document.getElementById("assetCategoryFilter")?.value||"",arr=db.assets.filter(a=>(!cat||a.category===cat)&&(!q||`${a.name} ${a.model} ${a.serial} ${a.location} ${a.responsibleName||''}`.toLowerCase().includes(q))),totalValue=arr.reduce((s,a)=>s+(+a.value||0)*(+a.qty||0),0),machineValue=arr.filter(a=>a.category==='Máquina').reduce((s,a)=>s+(+a.value||0)*(+a.qty||0),0),cards=document.getElementById("assetCards");
 if(cards)cards.innerHTML=`<div class="card"><small>Bens cadastrados</small><strong>${arr.length}</strong></div><div class="card"><small>Quantidade total</small><strong>${arr.reduce((s,a)=>s+(+a.qty||0),0)}</strong></div><div class="card"><small>Valor de aquisição</small><strong>${money(totalValue)}</strong></div><div class="card"><small>Valor em maquinário</small><strong>${money(machineValue)}</strong></div>`;
 let group={};
 (db.assets||[]).filter(a=>a.category==='Máquina'&&a.status!=='Baixado').forEach(a=>{let loc=a.location||'Sem local definido';if(!group[loc])group[loc]={qty:0,value:0,items:0};group[loc].qty+=+a.qty||0;group[loc].value+=(+a.value||0)*(+a.qty||0);group[loc].items++});
 let sum=document.getElementById('assetLocationSummary');if(sum){let rows=Object.entries(group).sort((a,b)=>b[1].value-a[1].value);sum.innerHTML=rows.length?table(['Local','Cadastros de máquinas','Quantidade','Valor do maquinário'],rows.map(([loc,d])=>[esc(loc),d.items,d.qty.toLocaleString('pt-BR'),money(d.value)])):'<div class="empty">Nenhuma máquina alocada em local de produção.</div>'}
 let tbl=document.getElementById("assetTable");if(tbl)tbl.innerHTML=arr.length?table(["Bem","Categoria","Marca/modelo","Patrimônio/série","Qtd.","Local","Responsável","Aquisição","Valor","Estado","Ações"],arr.map(a=>[esc(a.name),esc(a.category),esc(a.model||"-"),esc(a.serial||"-"),a.qty,esc(a.location||"-"),esc(a.responsibleName||"-"),a.purchaseDate?fmtDate(a.purchaseDate):"-",money((+a.value||0)*(+a.qty||0)),`<span class="badge">${esc(a.status||"-")}</span>`,`<button class="secondary" onclick="editAsset(${a.id})">Editar</button> <button class="danger" onclick="deleteAsset(${a.id})">Excluir</button>`])):'<div class="empty">Nenhum bem cadastrado.</div>';
}

'''
sub(r'// ---------- Inventário de bens ----------.*?// ---------- Estoque pronto para venda / segunda escolha ----------',asset_logic+'// ---------- Estoque pronto para venda / segunda escolha ----------','asset logic')

# -----------------------------------------------------------------------------
# 6) VALES: próxima folha automática + limite salvo e disponível por funcionário
# -----------------------------------------------------------------------------
rep('''<div class="sub">Lançamento centralizado: você não precisa entrar no cadastro de cada funcionário. Quando marcar como pago, o valor entra automaticamente como desconto na folha da competência escolhida.</div>''',
'''<div class="sub">Lançamento centralizado: o sistema atribui automaticamente o vale à próxima folha de pagamento e mostra quanto ainda pode ser liberado para o funcionário.</div>''','advance help')
rep('<div class="field"><label>Data do pedido</label><input id="advanceDate" type="date"></div>',
    '<div class="field"><label>Data do pedido</label><input id="advanceDate" type="date" onchange="updateAdvanceTargetMonth()"></div>',
    'advance date auto month')
rep('<div class="field"><label>Descontar na folha de</label><input id="advanceMonth" type="month"></div>',
    '<div class="field"><label>Próxima folha de pagamento</label><input id="advanceMonth" type="month" readonly style="background:#f7f7f8;font-weight:700"><div class="sub">Preenchido automaticamente pela data do pedido.</div></div>',
    'advance readonly month')
rep('''    <div class="field"><label>Limite interno configurável (% do salário)</label><input id="advanceLimitPct" type="number" min="0" max="100" step="0.1" onchange="saveAdvanceLimitPct()"></div>
    <div class="sub" style="max-width:620px">O sistema usa este percentual como regra interna de conferência. Não presume que exista um percentual legal único para todo tipo de adiantamento.</div>''',
'''    <div class="field"><label>Limite fixo do vale (% do salário)</label><input id="advanceLimitPct" type="number" min="0" max="100" step="0.1" oninput="updateAdvanceEmployeeLimitPreview()"></div>
    <button type="button" class="primary" onclick="saveAdvanceLimitPct()">Salvar limite</button>
    <div class="sub" style="max-width:620px">O percentual fica salvo como regra interna. Ao selecionar o funcionário, o sistema calcula o valor máximo e quanto ainda está disponível.</div>''',
    'advance limit save')
rep('<div id="advanceSummaryCards" class="cards"></div>',
    '<div id="advanceEmployeeLimitPreview" class="panel" style="margin-top:10px"></div><div id="advanceSummaryCards" class="cards"></div>',
    'advance employee preview')

advance_helpers=r'''function saveAdvanceLimitPct(){
  ensureV8946Data();
  db.config.advanceLimitPct=Math.max(0,Math.min(100,+document.getElementById("advanceLimitPct")?.value||0));
  try{persistDb()}catch(e){}
  updateAdvanceEmployeeLimitPreview();renderEmployeeAdvances();
  alert("Limite de vale salvo.");
}
function advanceNextPayrollMonth(dateValue){
  let d=dateValue?new Date(String(dateValue)+"T12:00:00"):new Date();
  if(Number.isNaN(d.getTime()))d=new Date();
  d=new Date(d.getFullYear(),d.getMonth()+1,1,12);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function updateAdvanceTargetMonth(){
  let date=document.getElementById("advanceDate")?.value||isoDate(new Date()),month=document.getElementById("advanceMonth");
  if(month)month.value=advanceNextPayrollMonth(date);updateAdvanceEmployeeLimitPreview();
}
function advanceCommittedForEmployee(employeeId,month){
  return (db.employeeAdvances||[]).filter(a=>+a.employeeId===+employeeId&&String(a.month||"")===String(month||"")).reduce((s,a)=>s+(+a.value||0),0);
}
function updateAdvanceEmployeeLimitPreview(){
  let box=document.getElementById("advanceEmployeeLimitPreview");if(!box)return;
  let emp=(db.employees||[]).find(e=>String(e.id)===String(document.getElementById("advanceEmployee")?.value));
  if(!emp){box.innerHTML='<div class="sub">Selecione um funcionário para ver salário, limite e valor disponível para vale.</div>';return}
  let month=document.getElementById("advanceMonth")?.value||advanceNextPayrollMonth(document.getElementById("advanceDate")?.value),pct=+document.getElementById("advanceLimitPct")?.value||+db.config.advanceLimitPct||0,salary=+emp.salary||0,limit=salary*pct/100,used=advanceCommittedForEmployee(emp.id,month),available=Math.max(0,limit-used);
  box.innerHTML=`<div class="cards" style="margin:0"><div class="card"><small>Funcionário</small><strong style="font-size:18px">${esc(emp.name||'-')}</strong></div><div class="card"><small>Salário atual</small><strong>${money(salary)}</strong></div><div class="card"><small>Limite ${pct.toFixed(1).replace('.',',')}%</small><strong>${money(limit)}</strong></div><div class="card"><small>Já comprometido para ${esc(month)}</small><strong>${money(used)}</strong></div><div class="card"><small>Ainda pode receber</small><strong>${money(available)}</strong></div></div>`;
}
'''
sub(r'function saveAdvanceLimitPct\(\)\{.*?\n\}\nfunction fillAdvanceEmployees\(\)\{',advance_helpers+'function fillAdvanceEmployees(){','advance helpers')
rep('''  closeModal();
  fillAdvanceEmployees();
}''','''  closeModal();
  fillAdvanceEmployees();
  updateAdvanceEmployeeLimitPreview();
}''','advance picker preview')
sub(r'function addEmployeeAdvance\(\)\{.*?\n\}\nfunction deleteEmployeeAdvance',r'''function addEmployeeAdvance(){
  ensureV8946Data();
  let emp=(db.employees||[]).find(e=>String(e.id)===String(document.getElementById("advanceEmployee")?.value));
  let value=+document.getElementById("advanceValue")?.value||0;
  if(!emp){alert("Selecione o funcionário.");return}
  if(value<=0){alert("Informe o valor do vale.");return}
  let date=document.getElementById("advanceDate")?.value||isoDate(new Date()),month=advanceNextPayrollMonth(date);
  let monthEl=document.getElementById("advanceMonth");if(monthEl)monthEl.value=month;
  let pct=+db.config.advanceLimitPct||0,salary=+emp.salary||0,limit=salary*pct/100,used=advanceCommittedForEmployee(emp.id,month),available=Math.max(0,limit-used);
  if(pct>0 && value>available+0.009){alert(`O limite disponível para ${emp.name} na folha ${month} é ${money(available)}.\n\nSalário: ${money(salary)}\nLimite: ${pct.toFixed(1).replace('.',',')}% = ${money(limit)}\nJá comprometido: ${money(used)}`);return}
  db.employeeAdvances.push({id:Date.now()+Math.floor(Math.random()*10000),employeeId:emp.id,employeeName:emp.name,value,date,month,status:"Pendente",paidAt:"",posted:false});
  try{persistDb()}catch(e){}
  document.getElementById("advanceValue").value="";
  renderEmployeeAdvances();
}
function deleteEmployeeAdvance''','advance add validation')
rep('let month=document.getElementById("advanceMonth");if(month&&!month.value)month.value=payrollCurrentMonth();',
    'let month=document.getElementById("advanceMonth");if(month&&!month.value)month.value=advanceNextPayrollMonth(date?.value||isoDate(new Date()));',
    'advance render next month')
rep('let pct=document.getElementById("advanceLimitPct");if(pct)pct.value=+db.config.advanceLimitPct||0;',
    'let pct=document.getElementById("advanceLimitPct");if(pct&&document.activeElement!==pct)pct.value=+db.config.advanceLimitPct||0;updateAdvanceEmployeeLimitPreview();',
    'advance render preview')

# -----------------------------------------------------------------------------
# Version bump + assertions
# -----------------------------------------------------------------------------
s=s.replace('v91.14','v91.15')
s=s.replace('Versão v91.14','Versão v91.15')

checks=[
 'Hub Financeiro criado',
 'function renderProductSalesReport()',
 'function factionAvailableModels()',
 'id="assetLocationSummary"',
 'function updateAdvanceEmployeeLimitPreview()',
 'v91.15 Multiusuário'
]
for c in checks:
    if c not in s: raise SystemExit(f'missing expected marker: {c}')

path.write_text(s,encoding='utf-8')
print('HLGB v91.15 accumulated updates applied')
