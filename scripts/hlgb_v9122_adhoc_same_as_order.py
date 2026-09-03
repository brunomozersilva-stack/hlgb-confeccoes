from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

marker='<!-- HLGB v91.22 PEDIDO AVULSO -->'
if marker in s:
    print('v91.22 already applied')
    raise SystemExit(0)

addon=r'''
<!-- HLGB v91.22 PEDIDO AVULSO -->
<script>
// v91.22 — Pedido avulso com a mesma lógica do pedido normal e grade opcional.
(function(){
  function escAttr(v){return String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  function productById(id){return (db.products||[]).find(p=>+p.id===+id)||null}
  function clientPrice(productId){
    let clientId=+document.getElementById('mclient')?.value||0,unit=0;
    if(clientId&&productId){try{unit=+suggestedPrice(clientId,+productId)||0}catch(e){}}
    if(!unit)unit=+productById(productId)?.price||0;
    return unit;
  }
  function productOptions(selected=''){
    return (db.products||[]).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR')).map(p=>`<option value="${p.id}" ${+p.id===+selected?'selected':''}>${esc(p.code?`${p.code} — ${p.name}`:p.name)}</option>`).join('');
  }
  window.hlgb922AdHocLine=function(line={}){
    let unit=line.price!=null?+line.price:(line.productId?clientPrice(line.productId):0);
    return `<div class="adHocLine" style="display:grid;grid-template-columns:minmax(260px,1.5fr) 130px 145px 95px;gap:10px;align-items:end;margin:8px 0;padding:10px;border:1px solid var(--line);border-radius:10px;background:#fff">
      <div class="field"><label>Produto / modelo</label><select class="adHocProduct" onchange="hlgb922AdHocProductChanged(this)"><option value="">Selecione</option>${productOptions(line.productId)}</select></div>
      <div class="field"><label>Quantidade</label><input class="adHocQty" type="number" min="1" step="1" value="${+line.qty||0}" oninput="hlgb922RecalcAdHoc()"></div>
      <div class="field"><label>Valor por peça</label><input class="adHocPrice" type="number" min="0" step=".01" value="${unit.toFixed(2)}" readonly></div>
      <button type="button" class="danger" onclick="this.closest('.adHocLine').remove();hlgb922RecalcAdHoc()">Excluir</button>
    </div>`;
  };
  window.addAdHocOrderLine=function(line={}){
    let box=document.getElementById('adHocLines');if(box)box.insertAdjacentHTML('beforeend',hlgb922AdHocLine(line));
    hlgb922RecalcAdHoc();
  };
  window.hlgb922AdHocProductChanged=function(sel){
    let row=sel.closest('.adHocLine'),price=row?.querySelector('.adHocPrice');
    if(price)price.value=clientPrice(+sel.value||0).toFixed(2);
    hlgb922RecalcAdHoc();
  };
  window.hlgb922ClientChanged=function(){
    document.querySelectorAll('.adHocLine').forEach(row=>{
      let pid=+row.querySelector('.adHocProduct')?.value||0,price=row.querySelector('.adHocPrice');
      if(price)price.value=clientPrice(pid).toFixed(2);
    });
    try{updateOrderMatrixTotal()}catch(e){}
    hlgb922RecalcAdHoc();
  };
  window.hlgb922ReadAdHocLines=function(){
    return [...document.querySelectorAll('.adHocLine')].map(r=>{
      let productId=+r.querySelector('.adHocProduct')?.value||0,qty=Math.max(0,+r.querySelector('.adHocQty')?.value||0);
      return {productId,qty,price:clientPrice(productId),product:productById(productId)};
    }).filter(x=>x.productId&&x.qty>0);
  };
  window.hlgb922RecalcAdHoc=function(){
    let lines=hlgb922ReadAdHocLines(),q=lines.reduce((a,x)=>a+x.qty,0),v=lines.reduce((a,x)=>a+x.qty*x.price,0),el=document.getElementById('adHocPreview');
    if(el)el.innerHTML=`<b>${q.toLocaleString('pt-BR')} peças</b> · <b>${money(v)}</b>`;
  };
  window.hlgb922ToggleAdHocGrade=function(){
    let use=(document.getElementById('adHocGradeMode')?.value||'no')==='yes';
    let simple=document.getElementById('adHocNoGradeBox'),grade=document.getElementById('adHocGradeBox');
    if(simple)simple.style.display=use?'none':'block';
    if(grade)grade.style.display=use?'block':'none';
    if(use){try{updateOrderMatrixTotal()}catch(e){}}else hlgb922RecalcAdHoc();
  };

  function saveNewAdHoc(){
    let c=(db.clients||[]).find(x=>+x.id===+(document.getElementById('mclient')?.value||0));
    if(!c){alert('Selecione o cliente.');return}
    let useGrade=(document.getElementById('adHocGradeMode')?.value||'no')==='yes';
    let grade=[],lines=[];
    if(useGrade){
      grade=typeof collectGradeItems==='function'?collectGradeItems():[];
      if(!grade.length){alert('Digite pelo menos uma quantidade na grade.');return}
      let grouped={};grade.forEach(it=>{let k=+it.productId||0;if(!grouped[k])grouped[k]={productId:k,qty:0,product:productById(k)};grouped[k].qty+=+it.qty||0});
      lines=Object.values(grouped).map(x=>({...x,price:clientPrice(x.productId)}));
    }else{
      lines=hlgb922ReadAdHocLines();
      if(!lines.length){alert('Adicione pelo menos um produto com quantidade.');return}
      // Mantém uma estrutura interna mínima por produto para Projeção, Cortes, Faltas e relatórios funcionarem normalmente, sem exigir P/M/G/cor.
      grade=lines.map(x=>({productId:x.productId,color:'',size:'',qty:x.qty,unitPrice:x.price,noGrade:true}));
    }
    let orderNumber=+document.getElementById('mordernumber')?.value||nextAvailableOrderNumber();
    if((db.orders||[]).some(x=>String(x.orderNumber)===String(orderNumber))){alert('Esse número de pedido já existe. Escolha outro número.');return}
    let orderId=Date.now(),qty=grade.reduce((a,x)=>a+(+x.qty||0),0),total=grade.reduce((a,x)=>a+(clientPrice(x.productId)*(+x.qty||0)),0);
    let summary=useGrade
      ? grade.map(it=>`${it.qty} ${productById(it.productId)?.name||''} ${it.color||''}${it.size?` Tam ${it.size}`:''}`.trim()).join(' | ')
      : lines.map(x=>`${x.qty} ${x.product?.name||'Produto'}`).join(' | ');
    let o={id:orderId,orderNumber,client:c.name,clientId:c.id,date:document.getElementById('mdate')?.value||isoDate(new Date()),projectionDeliveryDate:'',projectionPlannedAt:'',total,status:document.getElementById('mstatus')?.value||'Aguardando corte',priority:document.getElementById('mpriority')?.value||'Padrão',items:summary,qty,totalQty:qty,grade,isAdHoc:true,noGrade:!useGrade};
    db.orders=Array.isArray(db.orders)?db.orders:[];db.orders.push(o);
    if(!db.config)db.config={};db.config.nextOrderNumber=Math.max(+db.config.nextOrderNumber||1,orderNumber+1);
    db.cuts=Array.isArray(db.cuts)?db.cuts:[];
    let cutRows=useGrade?grade:lines.map(x=>({productId:x.productId,qty:x.qty,color:'',size:''}));
    cutRows.forEach((it,i)=>{
      let prod=productById(it.productId);
      db.cuts.push({id:orderId+i+1,orderId,op:'PED-'+orderId+(cutRows.length>1?'-'+(i+1):''),productId:+it.productId||null,product:prod?.name||'',fabric:prod?.material||'',color:it.color||'',size:it.size||'',layers:0,meters:0,pieces:+(it.qty??it.qty)||0,productionLocationId:null,cutterId:null,cutType:'',status:'Planejado',date:isoDate(new Date()),isAdHoc:true,noGrade:!useGrade});
    });
    closeModal();save();
    try{renderOrders();renderCuts();renderProjection()}catch(e){}
    alert('Pedido avulso salvo. Ele seguirá o mesmo fluxo de um pedido normal.');
  }

  window.newAdHocOrder=function(){
    let today=isoDate(new Date());
    openModal('Pedido avulso',`
      <div class="sub">Funciona como um pedido normal: cliente, entrega, status, prioridade, corte, produção, projeção e nota. A única diferença é que a grade pode ser opcional.</div>
      <div class="grid" style="margin-top:12px">
        <div class="field"><label>Nº do pedido</label><input id="mordernumber" type="number" min="1" value="${nextAvailableOrderNumber()}"><div class="sub">Pode alterar manualmente.</div></div>
        <div class="field"><label>Cliente</label><select id="mclient" onchange="hlgb922ClientChanged()"><option value="">Selecione</option>${clientOptions()}</select></div>
        <div class="field"><label>Data de entrega</label><input id="mdate" type="date" value="${today}"></div>
        <div class="field"><label>Status</label><select id="mstatus"><option value="Aguardando corte">Aguardando corte</option><option value="Pedido para corte">Pedido para corte</option><option value="Pedido em produção">Pedido em produção</option><option value="Pedido finalizado">Pedido finalizado</option></select></div>
        <div class="field"><label>Prioridade</label><select id="mpriority"><option>Padrão</option><option>Urgente</option><option>Urgentíssimo</option></select></div>
        <div class="field"><label>Como lançar as quantidades?</label><select id="adHocGradeMode" onchange="hlgb922ToggleAdHocGrade()"><option value="no" selected>Sem grade — quantidade total por produto</option><option value="yes">Com grade completa — igual pedido normal</option></select></div>
      </div>
      <div id="adHocNoGradeBox" class="panel">
        <div class="toolbar" style="justify-content:space-between;align-items:center"><div><h3 style="margin:0">Produtos sem grade</h3><div class="sub">Informe apenas o modelo e a quantidade total. O preço segue a precificação do cliente.</div></div><button type="button" class="secondary" onclick="addAdHocOrderLine()">+ Adicionar produto</button></div>
        <div id="adHocLines">${hlgb922AdHocLine()}</div><div id="adHocPreview" class="order-grand-total"></div>
      </div>
      <div id="adHocGradeBox" class="panel" style="display:none">
        <h3>Grade rápida do pedido</h3><div class="sub">Mesmo preenchimento do pedido normal, com cor e tamanho.</div>
        <div id="orderMatrixBox">${orderMatrixProductBlock()}</div>
        <button type="button" class="secondary" onclick="addOrderMatrixProduct()">+ Adicionar outro produto</button>
        <div id="gradeTotal" class="order-grand-total"></div><div class="total">Valor estimado: <span id="orderTotal">R$ 0,00</span></div>
      </div>
      <button type="button" class="primary modalSave">💾 Salvar pedido avulso</button>`,saveNewAdHoc);
    setTimeout(()=>hlgb922RecalcAdHoc(),20);
  };

  function editNoGradeAdHoc(o){
    let grouped={};(o.grade||[]).forEach(it=>{let k=+it.productId||0;if(!k)return;if(!grouped[k])grouped[k]={productId:k,qty:0};grouped[k].qty+=+it.qty||0});
    let lines=Object.values(grouped);if(!lines.length&&o.productId)lines=[{productId:+o.productId,qty:+o.qty||0}];
    openModal('Editar pedido avulso',`
      <div class="sub">Mesmo cadastro do pedido normal, sem obrigar grade de cor/tamanho.</div>
      <div class="grid">
        <div class="field"><label>Nº do pedido</label><input id="mordernumber" type="number" min="1" value="${escAttr(displayOrderNumber(o))}"></div>
        <div class="field"><label>Cliente</label><select id="mclient" onchange="hlgb922ClientChanged()"><option value="">Selecione</option>${(db.clients||[]).map(c=>`<option value="${c.id}" ${+c.id===+o.clientId||c.name===o.client?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Data de entrega</label><input id="mdate" type="date" value="${o.date||''}"></div>
        <div class="field"><label>Status</label><select id="mstatus">${['Aguardando corte','Pedido para corte','Corte finalizado','Pedido em produção','Pedido finalizado'].map(x=>`<option ${x===o.status?'selected':''}>${x}</option>`).join('')}</select></div>
        <div class="field"><label>Prioridade</label><select id="mpriority">${['Padrão','Urgente','Urgentíssimo'].map(x=>`<option ${x===(o.priority||'Padrão')?'selected':''}>${x}</option>`).join('')}</select></div>
      </div>
      <div class="panel"><div class="toolbar" style="justify-content:space-between;align-items:center"><h3 style="margin:0">Produtos sem grade</h3><button type="button" class="secondary" onclick="addAdHocOrderLine()">+ Adicionar produto</button></div><div id="adHocLines">${(lines.length?lines:[{}]).map(hlgb922AdHocLine).join('')}</div><div id="adHocPreview" class="order-grand-total"></div></div>
      <button type="button" class="primary modalSave">💾 Salvar alterações</button>`,()=>{
        let c=(db.clients||[]).find(x=>+x.id===+(document.getElementById('mclient')?.value||0));if(!c){alert('Selecione o cliente.');return}
        let nl=hlgb922ReadAdHocLines();if(!nl.length){alert('Adicione pelo menos um produto com quantidade.');return}
        let orderNumber=+document.getElementById('mordernumber')?.value||+o.orderNumber||nextAvailableOrderNumber();
        if((db.orders||[]).some(x=>+x.id!==+o.id&&String(x.orderNumber)===String(orderNumber))){alert('Esse número de pedido já existe. Escolha outro número.');return}
        let grade=nl.map(x=>({productId:x.productId,color:'',size:'',qty:x.qty,unitPrice:x.price,noGrade:true})),qty=nl.reduce((a,x)=>a+x.qty,0),total=nl.reduce((a,x)=>a+x.qty*x.price,0);
        Object.assign(o,{orderNumber,client:c.name,clientId:c.id,date:document.getElementById('mdate')?.value||o.date,total,status:document.getElementById('mstatus')?.value||o.status,priority:document.getElementById('mpriority')?.value||'Padrão',grade,qty,totalQty:qty,items:nl.map(x=>`${x.qty} ${x.product?.name||'Produto'}`).join(' | '),isAdHoc:true,noGrade:true});
        // Atualiza somente cortes ainda não finalizados, preservando histórico do que já foi cortado.
        let linked=(db.cuts||[]).filter(cut=>+cut.orderId===+o.id),hasFinished=linked.some(cut=>String(cut.status||'').toLowerCase()==='finalizado');
        if(!hasFinished){
          db.cuts=(db.cuts||[]).filter(cut=>+cut.orderId!==+o.id);
          nl.forEach((x,i)=>{let prod=x.product;db.cuts.push({id:Date.now()+i+1,orderId:o.id,op:'PED-'+o.id+(nl.length>1?'-'+(i+1):''),productId:x.productId,product:prod?.name||'',fabric:prod?.material||'',color:'',size:'',layers:0,meters:0,pieces:x.qty,productionLocationId:null,cutterId:null,cutType:'',status:'Planejado',date:isoDate(new Date()),isAdHoc:true,noGrade:true})});
        }
        closeModal();save();try{renderOrders();renderCuts();renderProjection()}catch(e){}
      });
    setTimeout(()=>{hlgb922ClientChanged();hlgb922RecalcAdHoc()},20);
  }

  const originalEditOrder=window.editOrder;
  window.editOrder=function(id){
    let o=(db.orders||[]).find(x=>+x.id===+id);
    if(o&&o.isAdHoc&&o.noGrade)return editNoGradeAdHoc(o);
    return originalEditOrder(id);
  };
})();
</script>
'''

if '</body>' not in s:
    raise SystemExit('body closing tag not found')
s=s.replace('</body>',addon+'\n</body>',1)
for old,new in [
    ('v91.21 Multiusuário','v91.22 Multiusuário'),
    ('Versão v91.21','Versão v91.22'),
    ('>v91.21</small>','>v91.22</small>')
]:
    s=s.replace(old,new)
p.write_text(s,encoding='utf-8')
print('patched HLGB v91.22 pedido avulso')
