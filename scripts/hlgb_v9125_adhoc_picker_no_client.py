from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

if 'v91.25 Multiusuário' in s:
    print('v91.25 already applied')
    raise SystemExit(0)

# 1) Pedido avulso pode ser salvo sem cliente.
old='''<div class="field"><label>Cliente</label><select id="mclient" onchange="hlgb922ClientChanged()"><option value="">Selecione</option>${clientOptions()}</select></div>'''
new='''<div class="field"><label>Cliente (opcional)</label><select id="mclient" onchange="hlgb922ClientChanged()"><option value="">Sem cliente</option>${clientOptions()}</select><div class="sub">Pode deixar sem cliente e definir depois, se precisar.</div></div>'''
if old not in s:
    raise SystemExit('new ad hoc client field target not found')
s=s.replace(old,new,1)

old='''<div class="field"><label>Cliente</label><select id="mclient" onchange="hlgb922ClientChanged()"><option value="">Selecione</option>${(db.clients||[]).map(c=>`<option value="${c.id}" ${+c.id===+o.clientId||c.name===o.client?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>'''
new='''<div class="field"><label>Cliente (opcional)</label><select id="mclient" onchange="hlgb922ClientChanged()"><option value="">Sem cliente</option>${(db.clients||[]).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR')).map(c=>`<option value="${c.id}" ${+c.id===+o.clientId||c.name===o.client?'selected':''}>${esc(c.name)}</option>`).join('')}</select><div class="sub">Pode manter sem cliente e definir depois.</div></div>'''
if old not in s:
    raise SystemExit('edit ad hoc client field target not found')
s=s.replace(old,new,1)

old="""    let c=(db.clients||[]).find(x=>+x.id===+(document.getElementById('mclient')?.value||0));\n    if(!c){alert('Selecione o cliente.');return}"""
new="""    let c=(db.clients||[]).find(x=>+x.id===+(document.getElementById('mclient')?.value||0));"""
if old not in s:
    raise SystemExit('new ad hoc client validation target not found')
s=s.replace(old,new,1)

old="""    let o={id:orderId,orderNumber,client:c.name,clientId:c.id,date:document.getElementById('mdate')?.value||isoDate(new Date()),projectionDeliveryDate:'',projectionPlannedAt:'',total,status:document.getElementById('mstatus')?.value||'Aguardando corte',priority:document.getElementById('mpriority')?.value||'Padrão',items:summary,qty,totalQty:qty,grade,isAdHoc:true,noGrade:!useGrade};"""
new="""    let o={id:orderId,orderNumber,client:c?.name||'Sem cliente',clientId:c?.id||null,date:document.getElementById('mdate')?.value||isoDate(new Date()),projectionDeliveryDate:'',projectionPlannedAt:'',total,status:document.getElementById('mstatus')?.value||'Aguardando corte',priority:document.getElementById('mpriority')?.value||'Padrão',items:summary,qty,totalQty:qty,grade,isAdHoc:true,noGrade:!useGrade};"""
if old not in s:
    raise SystemExit('new ad hoc order object target not found')
s=s.replace(old,new,1)

old="""        let c=(db.clients||[]).find(x=>+x.id===+(document.getElementById('mclient')?.value||0));if(!c){alert('Selecione o cliente.');return}"""
new="""        let c=(db.clients||[]).find(x=>+x.id===+(document.getElementById('mclient')?.value||0));"""
if old not in s:
    raise SystemExit('edit ad hoc client validation target not found')
s=s.replace(old,new,1)

old="""        Object.assign(o,{orderNumber,client:c.name,clientId:c.id,date:document.getElementById('mdate')?.value||o.date,total,status:document.getElementById('mstatus')?.value||o.status,priority:document.getElementById('mpriority')?.value||'Padrão',grade,qty,totalQty:qty,items:nl.map(x=>`${x.qty} ${x.product?.name||'Produto'}`).join(' | '),isAdHoc:true,noGrade:true});"""
new="""        Object.assign(o,{orderNumber,client:c?.name||'Sem cliente',clientId:c?.id||null,date:document.getElementById('mdate')?.value||o.date,total,status:document.getElementById('mstatus')?.value||o.status,priority:document.getElementById('mpriority')?.value||'Padrão',grade,qty,totalQty:qty,items:nl.map(x=>`${x.qty} ${x.product?.name||'Produto'}`).join(' | '),isAdHoc:true,noGrade:true});"""
if old not in s:
    raise SystemExit('edit ad hoc order object target not found')
s=s.replace(old,new,1)

# 2) Melhor seletor de produto no modo sem grade: busca igual ao pedido normal,
#    resultados em ordem alfabética, categoria e faixa de preço.
addon=r'''
<!-- HLGB v91.25 PEDIDO AVULSO PICKER -->
<script>
(function(){
  function esc925(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
  function products925(){return (db.products||[]).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR',{sensitivity:'base'}))}
  function cats925(){return [...new Set(products925().map(p=>String(p.category||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'))}
  function selectedProduct925(line){return (db.products||[]).find(p=>+p.id===+(line?.productId||0))||null}
  function unit925(line){
    if(line?.price!=null)return +line.price||0;
    let pid=+line?.productId||0,clientId=+document.getElementById('mclient')?.value||0,u=0;
    if(pid&&clientId){try{u=+suggestedPrice(clientId,pid)||0}catch(e){}}
    if(!u)u=+(db.products||[]).find(p=>+p.id===pid)?.price||0;
    return u;
  }
  window.hlgb925FilterAdHocProducts=function(source){
    let row=source?.closest?.('.adHocLine');if(!row)return;
    let q=(row.querySelector('.adHocProductSearch')?.value||'').trim().toLowerCase();
    let cat=row.querySelector('.adHocProductCat')?.value||'';
    let minRaw=row.querySelector('.adHocProductMin')?.value||'',maxRaw=row.querySelector('.adHocProductMax')?.value||'';
    let min=minRaw!==''?+minRaw:null,max=maxRaw!==''?+maxRaw:null;
    let matches=products925().filter(p=>{
      let hay=`${p.name||''} ${p.code||''} ${p.category||''}`.toLowerCase();
      if(q&&!hay.includes(q))return false;
      if(cat&&String(p.category||'')!==cat)return false;
      let price=+p.price||0;
      if(min!=null&&price<min)return false;
      if(max!=null&&price>max)return false;
      return true;
    }).slice(0,80);
    let box=row.querySelector('.adHocProductResults'),count=row.querySelector('.adHocProductCount');
    if(count)count.textContent=`${matches.length} produto(s) encontrado(s)${matches.length===80?' — refine a busca para ver mais':''}`;
    if(!box)return;
    box.innerHTML=matches.length?matches.map(p=>`<button type="button" class="secondary" style="display:flex;justify-content:space-between;gap:8px;text-align:left;padding:8px 10px" onclick="hlgb925SelectAdHocProduct(this,${+p.id})"><span><strong>${esc925(p.name||'Produto')}</strong><small style="display:block;color:var(--muted)">${esc925(p.code||'Sem referência')} · ${esc925(p.category||'Sem categoria')}</small></span><strong style="white-space:nowrap">${typeof money==='function'?money(+p.price||0):(+p.price||0).toFixed(2)}</strong></button>`).join(''):'<div class="empty" style="padding:12px">Nenhum produto encontrado.</div>';
    box.style.display='grid';
  };
  window.hlgb925SelectAdHocProduct=function(btn,id){
    let row=btn?.closest?.('.adHocLine');if(!row)return;
    let sel=row.querySelector('.adHocProduct');if(sel)sel.value=String(id);
    let p=(db.products||[]).find(x=>+x.id===+id),label=row.querySelector('.adHocSelectedProduct');
    if(label)label.innerHTML=p?`<strong>${esc925(p.name)}</strong> <span class="sub">· ${esc925(p.code||'Sem referência')} · ${esc925(p.category||'Sem categoria')}</span>`:'<strong>Selecione um produto</strong>';
    let box=row.querySelector('.adHocProductResults');if(box){box.innerHTML='';box.style.display='none'}
    let search=row.querySelector('.adHocProductSearch');if(search)search.value='';
    let count=row.querySelector('.adHocProductCount');if(count)count.textContent='Produto selecionado. Digite para trocar.';
    if(typeof hlgb922AdHocProductChanged==='function'&&sel)hlgb922AdHocProductChanged(sel);
  };
  window.hlgb925ClearAdHocProductFilter=function(btn){
    let row=btn?.closest?.('.adHocLine');if(!row)return;
    ['.adHocProductSearch','.adHocProductMin','.adHocProductMax'].forEach(s=>{let el=row.querySelector(s);if(el)el.value='' });
    let cat=row.querySelector('.adHocProductCat');if(cat)cat.value='';
    hlgb925FilterAdHocProducts(row.querySelector('.adHocProductSearch')||row);
  };

  window.hlgb922AdHocLine=function(line={}){
    let selected=selectedProduct925(line),unit=unit925(line);
    let options=products925().map(p=>`<option value="${+p.id}" ${+p.id===+line.productId?'selected':''}>${esc925(p.code?`${p.code} — ${p.name}`:p.name)}</option>`).join('');
    return `<div class="adHocLine" style="display:grid;grid-template-columns:minmax(360px,1.8fr) 120px 145px 95px;gap:10px;align-items:end;margin:8px 0;padding:12px;border:1px solid var(--line);border-radius:12px;background:#fff">
      <div>
        <div class="selectedOrderProduct adHocSelectedProduct" style="padding:9px 11px;border:1px solid #eadde4;border-radius:10px;background:#fff8fb;margin-bottom:8px">${selected?`<strong>${esc925(selected.name)}</strong> <span class="sub">· ${esc925(selected.code||'Sem referência')} · ${esc925(selected.category||'Sem categoria')}</span>`:'<strong>Selecione um produto</strong>'}</div>
        <select class="adHocProduct" style="display:none" onchange="hlgb922AdHocProductChanged(this)"><option value="">Selecione</option>${options}</select>
        <div class="grid" style="grid-template-columns:1.7fr 1fr .7fr .7fr;gap:7px">
          <div class="field"><label>Buscar produto</label><input class="adHocProductSearch" placeholder="Digite nome ou referência..." onfocus="hlgb925FilterAdHocProducts(this)" oninput="hlgb925FilterAdHocProducts(this)"></div>
          <div class="field"><label>Categoria</label><select class="adHocProductCat" onchange="hlgb925FilterAdHocProducts(this)"><option value="">Todas</option>${cats925().map(c=>`<option>${esc925(c)}</option>`).join('')}</select></div>
          <div class="field"><label>Preço mín.</label><input class="adHocProductMin" type="number" step=".01" min="0" placeholder="0,00" oninput="hlgb925FilterAdHocProducts(this)"></div>
          <div class="field"><label>Preço máx.</label><input class="adHocProductMax" type="number" step=".01" min="0" placeholder="Sem limite" oninput="hlgb925FilterAdHocProducts(this)"></div>
        </div>
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin:5px 0 7px;flex-wrap:wrap"><span class="sub adHocProductCount">Clique na busca para ver os produtos em ordem alfabética.</span><button type="button" class="secondary" style="padding:6px 9px" onclick="hlgb925ClearAdHocProductFilter(this)">Limpar filtros</button></div>
        <div class="adHocProductResults" style="display:none;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px;max-height:220px;overflow:auto;border:1px solid #eee;border-radius:10px;padding:6px;background:#fafafa"></div>
      </div>
      <div class="field"><label>Quantidade</label><input class="adHocQty" type="number" min="1" step="1" value="${+line.qty||0}" oninput="hlgb922RecalcAdHoc()"></div>
      <div class="field"><label>Valor por peça</label><input class="adHocPrice" type="number" min="0" step=".01" value="${unit.toFixed(2)}" readonly></div>
      <button type="button" class="danger" onclick="this.closest('.adHocLine').remove();hlgb922RecalcAdHoc()">Excluir</button>
    </div>`;
  };
})();
</script>
'''

if '</body>' not in s:
    raise SystemExit('body close not found')
s=s.replace('</body>',addon+'\n</body>',1)

s=s.replace('v91.24 Multiusuário','v91.25 Multiusuário')
s=s.replace('Versão v91.24','Versão v91.25')
s=s.replace('>v91.24</small>','>v91.25</small>')

p.write_text(s,encoding='utf-8')
print('patched HLGB v91.25 ad hoc picker + optional client')
