/* HLGB — grades e calculadora de materiais */
(function(){
'use strict';
const V='2026.10.01-material-tools-v4';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0);
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function product(id){return arr('products').find(p=>sid(p?.id)===sid(id))||null}
function material(id){return arr('materials').find(m=>sid(m?.id)===sid(id))||null}
function order(id){return arr('orders').find(o=>sid(o?.id)===sid(id))||null}
function sortedSizes(){
  try{if(typeof hlgbSortedSizes==='function')return hlgbSortedSizes(db.sizes)}catch(e){}
  return ['P','M','G','GG'];
}
function standardGradeHTML(o){
  try{if(typeof separationGradeMatrixHTML==='function')return separationGradeMatrixHTML(o)}catch(e){}
  const grade=Array.isArray(o?.grade)?o.grade:[];if(!grade.length)return '<div class="empty">Pedido sem grade cadastrada.</div>';
  const sizes=sortedSizes(),groups={};
  grade.forEach(it=>{const p=product(it.productId),name=p?.name||'-',color=it.color||'-',key=sid(it.productId||name)+'|'+color;if(!groups[key])groups[key]={product:name,color,qty:{}};groups[key].qty[it.size]=(groups[key].qty[it.size]||0)+q(it.qty)});
  const rows=Object.values(groups).map(g=>'<tr><td>'+escSafe(g.product)+'</td><td>'+escSafe(g.color)+'</td>'+sizes.map(s=>'<td>'+q(g.qty[s])+'</td>').join('')+'<td><b>'+sizes.reduce((a,s)=>a+q(g.qty[s]),0)+'</b></td></tr>').join('');
  const grand=grade.reduce((a,x)=>a+q(x.qty),0);
  return '<div style="overflow:auto"><table><thead><tr><th>Produto</th><th>Cor</th>'+sizes.map(s=>'<th>'+escSafe(s)+'</th>').join('')+'<th>Total</th></tr></thead><tbody>'+rows+'<tr><td colspan="'+(sizes.length+2)+'" style="text-align:right"><b>Total do pedido</b></td><td><b>'+grand+'</b></td></tr></tbody></table></div>';
}
function cutterSheetGradeForModel(o,productId){
  const grade=(Array.isArray(o?.grade)?o.grade:[]).filter(it=>sid(it?.productId)===sid(productId));
  if(!grade.length)return '<div class="empty">Este modelo não possui grade cadastrada.</div>';
  const sizes=sortedSizes(),p=product(productId),pname=p?.name||'-',groups={};
  grade.forEach(it=>{
    const color=it.color||'-',key=color;
    if(!groups[key])groups[key]={color,qty:{}};
    groups[key].qty[it.size]=(groups[key].qty[it.size]||0)+q(it.qty);
  });
  const heads=sizes.map(s=>'<th>'+escSafe(s)+'</th>').join('');
  const body=Object.values(groups).map(g=>{
    const total=sizes.reduce((a,s)=>a+q(g.qty[s]),0);
    return '<tr><td>'+escSafe(pname)+'</td><td>'+escSafe(g.color)+'</td>'+sizes.map(s=>'<td>'+q(g.qty[s])+'</td>').join('')+'<td><b>'+total+'</b></td></tr>';
  }).join('');
  const grand=grade.reduce((a,it)=>a+q(it.qty),0);
  return '<div class="hlgb-model-cutter-grade" style="overflow:auto;margin:10px 0 14px"><table><tr><th>Produto</th><th>Cor</th>'+heads+'<th>Total</th></tr>'+body+'<tr><td colspan="'+(sizes.length+2)+'" style="text-align:right"><b>Total do modelo</b></td><td><b>'+grand+'</b></td></tr></table></div>';
}
function decorateSeparationModelGrades(){
  const root=document.getElementById('separationTable'),sel=document.getElementById('separationOrder');if(!root||!sel?.value)return;
  const o=order(sel.value);if(!o)return;
  const productsByName=new Map();
  [...new Set((o.grade||[]).map(x=>sid(x.productId)).filter(Boolean))].forEach(pid=>{
    const p=product(pid);if(p?.name)productsByName.set(String(p.name).trim().toLowerCase(),pid);
  });
  root.querySelectorAll('.panel').forEach(panel=>{
    const h3=panel.querySelector('h3');if(!h3||panel.querySelector('.hlgb-model-cutter-grade-wrap'))return;
    const title=String(h3.childNodes?.[0]?.textContent||h3.textContent||'').trim().toLowerCase();
    let pid=productsByName.get(title);
    if(!pid){
      for(const [name,id] of productsByName.entries()){if(title===name||title.startsWith(name+' ')){pid=id;break}}
    }
    if(!pid)return;
    const wrap=document.createElement('div');wrap.className='hlgb-model-cutter-grade-wrap';
    wrap.innerHTML='<div style="font-weight:800;margin-top:10px">📋 Grade para separação / corte</div><div class="sub">Mesmo formato da Folha dos Cortadores.</div>'+cutterSheetGradeForModel(o,pid);
    h3.insertAdjacentElement('afterend',wrap);
  });
}
function ensureSeparationGradePanel(){
  const sel=document.getElementById('separationOrder'),box=document.getElementById('separationTable');if(!sel||!box||!sel.value)return;
  const o=order(sel.value);if(!o)return;
  let panel=document.getElementById('hlgbSeparationStandardGrade');
  if(!panel){panel=document.createElement('div');panel.id='hlgbSeparationStandardGrade';panel.className='panel';panel.style.cssText='background:#fff;margin:12px 0';box.insertAdjacentElement('afterbegin',panel)}
  panel.innerHTML='<h2>📋 Grade do pedido</h2><div class="sub">Padrão oficial da grade — igual à Folha dos Cortadores.</div>'+standardGradeHTML(o);
}
window.hlgbToggleSeparationGrade=function(id,btn){
  const o=order(id),row=btn?.closest?.('.separation-row');if(!o||!row)return;
  let box=row.nextElementSibling;if(box?.classList?.contains('hlgb-sep-grade')){box.remove();btn.textContent='📋 Ver grade';return}
  box=document.createElement('div');box.className='hlgb-sep-grade';box.style.cssText='padding:10px 14px 16px;border:1px solid #eadde5;border-top:0;border-radius:0 0 12px 12px;background:#fffafd';
  box.innerHTML='<b>Grade do pedido #'+escSafe(typeof displayOrderNumber==='function'?displayOrderNumber(o):o.id)+'</b>'+standardGradeHTML(o);
  row.insertAdjacentElement('afterend',box);btn.textContent='Ocultar grade';
};
function decorateSeparation(){
  const root=document.getElementById('separationList');if(!root)return;
  root.querySelectorAll('.separation-row').forEach(row=>{
    if(row.querySelector('.hlgbSepGradeBtn'))return;
    const open=[...row.querySelectorAll('button[onclick]')].find(b=>/selectSeparationOrder\(([^)]+)\)/.test(b.getAttribute('onclick')||''));if(!open)return;
    const m=(open.getAttribute('onclick')||'').match(/selectSeparationOrder\(([^)]+)\)/);if(!m)return;
    const btn=document.createElement('button');btn.type='button';btn.className='secondary hlgbSepGradeBtn';btn.textContent='📋 Ver grade';btn.onclick=()=>window.hlgbToggleSeparationGrade(m[1].replace(/['"]/g,''),btn);
    open.parentElement?.insertBefore(btn,open);
  });
}
function productGradePreview(p){
  const sizes=Array.isArray(p?.sizes)?p.sizes:[],colors=Array.isArray(p?.colors)?p.colors:[];
  if(!sizes.length&&!colors.length)return '<div class="empty">Produto sem grade cadastrada.</div>';
  const rows=(colors.length?colors:['Todas']).map(c=>'<tr><td>'+escSafe(p.name||'-')+'</td><td><b>'+escSafe(c)+'</b></td>'+sizes.map(()=>'<td>✓</td>').join('')+'<td>—</td></tr>').join('');
  return '<div class="sub">Mesmo padrão visual da Folha dos Cortadores. Aqui a ficha mostra combinações permitidas; as quantidades aparecem quando o produto entra em um pedido.</div><div style="overflow:auto;margin-top:8px"><table><thead><tr><th>Produto</th><th>Cor</th>'+sizes.map(s=>'<th>'+escSafe(s)+'</th>').join('')+'<th>Total</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
window.hlgbOpenProductGrade=function(id){const p=product(id);if(!p)return;openModal('Grade — '+(p.name||'Produto'),productGradePreview(p),()=>closeModal())};
function decorateProductTable(){
  const root=document.getElementById('productTable');if(!root)return;
  root.querySelectorAll('tbody tr').forEach(tr=>{
    if(tr.querySelector('.hlgbProductGradeBtn'))return;
    const edit=[...tr.querySelectorAll('button[onclick]')].find(b=>/editProduct\(([^)]+)\)/.test(b.getAttribute('onclick')||''));if(!edit)return;
    const m=(edit.getAttribute('onclick')||'').match(/editProduct\(([^)]+)\)/);if(!m)return;
    const btn=document.createElement('button');btn.type='button';btn.className='secondary hlgbProductGradeBtn';btn.textContent='📋 Grade';btn.onclick=()=>window.hlgbOpenProductGrade(m[1].replace(/['"]/g,''));
    edit.insertAdjacentElement('afterend',btn);
  });
}
function observeProducts(){
  const root=document.getElementById('productTable');if(!root||root.__hlgbGradeObserver)return;
  root.__hlgbGradeObserver=true;new MutationObserver(()=>decorateProductTable()).observe(root,{childList:true,subtree:true});
}
function needForPieces(pieces,m){const qty=q(m?.qty),loss=q(m?.loss);if(qty<=0)return 0;const base=(m?.calcMode||'consumption')==='yield'?q(pieces)/qty:q(pieces)*qty;return base*(1+loss/100)}
let autoSeq=0,manualSeq=0;const priceOverrides={};
function autoLine(){
  const host=document.getElementById('hlgbMatAutoLines');if(!host)return;
  const row=document.createElement('div');row.className='panel hlgbMatAutoLine';row.dataset.id=++autoSeq;row.style.margin='8px 0';
  row.innerHTML='<div class="toolbar" style="align-items:flex-end;flex-wrap:wrap"><div class="field" style="min-width:260px;flex:1"><label>Produto</label><select class="hlgbMatProduct"><option value="">Selecione</option>'+arr('products').slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR')).map(p=>'<option value="'+escSafe(p.id)+'">'+escSafe(p.name||'Produto')+'</option>').join('')+'</select></div><div class="hlgbMatGradeInputs" style="display:flex;gap:8px;flex-wrap:wrap"></div><button type="button" class="secondary hlgbMatRemove">Remover produto</button></div><div class="hlgbMatLineResult sub"></div>';
  host.appendChild(row);
  const sel=row.querySelector('.hlgbMatProduct'),grade=row.querySelector('.hlgbMatGradeInputs');
  sel.addEventListener('change',()=>{const p=product(sel.value);grade.innerHTML=(p?.sizes||['P','M','G','GG']).map(s=>'<div class="field" style="width:80px"><label>'+escSafe(s)+'</label><input class="hlgbMatSize" data-size="'+escSafe(s)+'" type="number" min="0" value="0"></div>').join('');grade.querySelectorAll('input').forEach(x=>x.addEventListener('input',renderCalc));renderCalc()});
  row.querySelector('.hlgbMatRemove').onclick=()=>{row.remove();renderCalc()};
}
function fillManualFromMaterial(row,id){
  const m=material(id);if(!m)return;
  const name=row.querySelector('.hlgbMmName'),unit=row.querySelector('.hlgbMmUnit'),price=row.querySelector('.hlgbMmPrice');
  if(name)name.value=m.name||'';if(unit)unit.value=m.unit||'';if(price)price.value=q(m.price||m.purchasePrice||0);
}
function manualLine(){
  const host=document.getElementById('hlgbMatManualLines');if(!host)return;
  const row=document.createElement('div');row.className='panel hlgbMatManualLine';row.dataset.id=++manualSeq;row.style.margin='8px 0';
  const opts=arr('materials').slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR')).map(m=>'<option value="'+escSafe(m.id)+'">'+escSafe(m.name||'Material')+' — '+escSafe(m.unit||'')+'</option>').join('');
  row.innerHTML='<div class="toolbar" style="align-items:flex-end;flex-wrap:wrap"><div class="field" style="min-width:240px"><label>Matéria-prima cadastrada</label><select class="hlgbMmCatalog"><option value="">Escolher do cadastro</option>'+opts+'</select></div><div class="field" style="min-width:180px"><label>Material</label><input class="hlgbMmName" placeholder="Ou digite manualmente"></div><div class="field" style="width:90px"><label>Un.</label><input class="hlgbMmUnit" value="m"></div><div class="field"><label>Cálculo</label><select class="hlgbMmMode"><option value="consumption">Consumo por peça</option><option value="yield">Rendimento</option></select></div><div class="field"><label>Consumo / rendimento</label><input class="hlgbMmQty" type="number" min="0" step="0.001"></div><div class="field"><label>Perda %</label><input class="hlgbMmLoss" type="number" min="0" step="0.1" value="0"></div><button type="button" class="secondary hlgbMatRemove">Remover material</button></div><div class="toolbar hlgbMmGrade" style="align-items:flex-end;flex-wrap:wrap;margin-top:6px">'+sortedSizes().map(s=>'<div class="field" style="width:80px"><label>'+escSafe(s)+'</label><input data-size="'+escSafe(s)+'" type="number" min="0" value="0"></div>').join('')+'</div><div class="hlgbMmResult sub"></div>';
  host.appendChild(row);
  row.querySelector('.hlgbMmCatalog').addEventListener('change',e=>{fillManualFromMaterial(row,e.target.value);renderCalc()});
  row.querySelectorAll('input,select').forEach(x=>x.addEventListener('input',renderCalc));
  row.querySelector('.hlgbMatRemove').onclick=()=>{row.remove();renderCalc()};
}
function autoData(){return [...document.querySelectorAll('.hlgbMatAutoLine')].map(row=>{const p=product(row.querySelector('.hlgbMatProduct')?.value),sizes={};row.querySelectorAll('.hlgbMatSize').forEach(x=>sizes[x.dataset.size]=q(x.value));const pieces=Object.values(sizes).reduce((a,v)=>a+v,0);return {product:p,sizes,pieces}}).filter(x=>x.product&&x.pieces>0)}
function autoResult(){
  const agg={};
  for(const line of autoData())for(const m of (line.product.materials||[])){
    const key=(m.materialId||String(m.name||'').toLowerCase())+'|'+(m.unit||''),catalog=material(m.materialId);
    const a=agg[key]||(agg[key]={key,name:m.name||catalog?.name||'Material',unit:m.unit||catalog?.unit||'',qty:0,products:[],unitPrice:q(m.price||catalog?.price||catalog?.purchasePrice||0)});
    const need=needForPieces(line.pieces,m);a.qty+=need;a.products.push(line.product.name+' '+line.pieces+' pç');
    if(!a.unitPrice)a.unitPrice=q(m.price||catalog?.price||catalog?.purchasePrice||0);
  }
  return Object.values(agg).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
function manualResult(){
  return [...document.querySelectorAll('.hlgbMatManualLine')].map(row=>{const pieces=[...row.querySelectorAll('.hlgbMmGrade input')].reduce((a,x)=>a+q(x.value),0),m={qty:q(row.querySelector('.hlgbMmQty')?.value),loss:q(row.querySelector('.hlgbMmLoss')?.value),calcMode:row.querySelector('.hlgbMmMode')?.value||'consumption'};return {name:row.querySelector('.hlgbMmName')?.value||'Material',unit:row.querySelector('.hlgbMmUnit')?.value||'',pieces,qty:needForPieces(pieces,m),unitPrice:q(row.querySelector('.hlgbMmPrice')?.value)}}).filter(x=>x.pieces>0&&x.qty>0);
}
function renderCalc(){
  document.querySelectorAll('.hlgbMatAutoLine').forEach(row=>{const p=product(row.querySelector('.hlgbMatProduct')?.value),pieces=[...row.querySelectorAll('.hlgbMatSize')].reduce((a,x)=>a+q(x.value),0),box=row.querySelector('.hlgbMatLineResult');if(box)box.textContent=p?(pieces.toLocaleString('pt-BR')+' peças na grade'):'Selecione um produto.'});
  document.querySelectorAll('.hlgbMatManualLine').forEach(row=>{const box=row.querySelector('.hlgbMmResult');if(box){const pieces=[...row.querySelectorAll('.hlgbMmGrade input')].reduce((a,x)=>a+q(x.value),0),m={qty:q(row.querySelector('.hlgbMmQty')?.value),loss:q(row.querySelector('.hlgbMmLoss')?.value),calcMode:row.querySelector('.hlgbMmMode')?.value||'consumption'};box.textContent=pieces?('Grade total: '+pieces+' peças · Necessidade: '+needForPieces(pieces,m).toLocaleString('pt-BR',{maximumFractionDigits:3})+' '+(row.querySelector('.hlgbMmUnit')?.value||'')):'Preencha a grade.'}});
  const a=autoResult(),m=manualResult(),box=document.getElementById('hlgbMaterialCalcResult');if(!box)return;
  const rows=[
    ...a.map(x=>({key:x.key,name:x.name,unit:x.unit,qty:x.qty,detail:x.products.join(' · '),unitPrice:priceOverrides[x.key]??x.unitPrice})),
    ...m.map((x,i)=>({key:'manual|'+i+'|'+String(x.name).toLowerCase()+'|'+x.unit,name:x.name,unit:x.unit,qty:x.qty,detail:'Manual · '+x.pieces+' peças',unitPrice:priceOverrides['manual|'+i+'|'+String(x.name).toLowerCase()+'|'+x.unit]??x.unitPrice}))
  ];
  const grand=rows.reduce((s,x)=>s+q(x.qty)*q(x.unitPrice),0);
  box.innerHTML=rows.length?'<div style="overflow:auto"><table><thead><tr><th>Material</th><th>Necessidade</th><th>Valor unitário</th><th>Total compra</th><th>Origem</th></tr></thead><tbody>'+rows.map(x=>'<tr><td><b>'+escSafe(x.name)+'</b></td><td>'+x.qty.toLocaleString('pt-BR',{maximumFractionDigits:3})+' '+escSafe(x.unit)+'</td><td><input class="hlgbMatSimPrice" data-key="'+escSafe(x.key)+'" type="number" min="0" step="0.01" value="'+q(x.unitPrice).toFixed(2)+'" style="width:110px"></td><td><b>'+((q(x.qty)*q(x.unitPrice)).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}))+'</b></td><td>'+escSafe(x.detail)+'</td></tr>').join('')+'<tr><td colspan="3" style="text-align:right"><b>Total estimado da compra</b></td><td colspan="2"><b>'+grand.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+'</b></td></tr></tbody></table></div>':'<div class="empty">Adicione produtos ou materiais e preencha a grade para calcular.</div>';
  box.querySelectorAll('.hlgbMatSimPrice').forEach(inp=>inp.addEventListener('input',()=>{priceOverrides[inp.dataset.key]=q(inp.value);renderCalc()}));
}
function ensureCalculator(){
  const sep=document.getElementById('separationList');const panel=sep?.closest?.('.panel');if(!panel||document.getElementById('hlgbMaterialCalculator'))return;
  const box=document.createElement('div');box.id='hlgbMaterialCalculator';box.className='panel';box.style.marginTop='14px';
  box.innerHTML='<h2>🧮 Calculadora de material</h2><div class="sub">Você pode colocar vários produtos no mesmo cálculo. Também pode informar ou alterar o valor unitário de cada matéria-prima para simular o custo total da compra.</div><div class="panel" style="background:#fff8fb;margin-top:12px"><h3 style="margin-top:0">Automático — produtos cadastrados</h3><div id="hlgbMatAutoLines"></div><button type="button" class="primary" style="margin-top:8px" onclick="hlgbMatAddAuto()">➕ Adicionar outro produto</button></div><div class="panel" style="margin-top:12px"><h3 style="margin-top:0">Manual — matéria-prima + grade</h3><div id="hlgbMatManualLines"></div><button type="button" class="secondary" style="margin-top:8px" onclick="hlgbMatAddManual()">➕ Adicionar outro material</button></div><h3>Resultado consolidado</h3><div id="hlgbMaterialCalcResult"></div>';
  panel.insertAdjacentElement('afterend',box);autoLine();manualLine();renderCalc();
}
window.hlgbMatAddAuto=()=>{autoLine();renderCalc()};window.hlgbMatAddManual=()=>{manualLine();renderCalc()};window.hlgbMaterialTools={standardGradeHTML,cutterSheetGradeForModel,decorateSeparationModelGrades,needForPieces,autoResult,manualResult,renderCalc,priceOverrides};
const oldSepList=window.renderSeparationList;if(typeof oldSepList==='function'&&!oldSepList.__hlgbMaterialToolsV2){const w=function(){const r=oldSepList.apply(this,arguments);setTimeout(decorateSeparation,0);setTimeout(ensureCalculator,0);return r};w.__hlgbMaterialToolsV2=true;w.__original=oldSepList;window.renderSeparationList=w}
const oldSep=window.renderSeparation;if(typeof oldSep==='function'&&!oldSep.__hlgbMaterialToolsV3){const w=function(){const r=oldSep.apply(this,arguments);setTimeout(()=>{decorateSeparationModelGrades();ensureSeparationGradePanel()},0);return r};w.__hlgbMaterialToolsV3=true;w.__original=oldSep;window.renderSeparation=w}
const oldProd=window.renderProducts;if(typeof oldProd==='function'&&!oldProd.__hlgbMaterialToolsV2){const w=function(){const r=oldProd.apply(this,arguments);setTimeout(()=>{decorateProductTable();observeProducts()},0);return r};w.__hlgbMaterialToolsV2=true;w.__original=oldProd;window.renderProducts=w}
function boot(){try{decorateSeparation();decorateProductTable();observeProducts();ensureCalculator();decorateSeparationModelGrades();ensureSeparationGradePanel()}catch(e){console.warn('[HLGB material tools]',e)}}try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,900),0)}catch(e){}setTimeout(boot,1600);
window.HLGB_MATERIAL_TOOLS_GUARD=V;
console.info('[HLGB] grades e calculadora de materiais v4 com simulação de custo ativas');
})();