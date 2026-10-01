/* HLGB — grades e calculadora de materiais */
(function(){
'use strict';
const V='2026.10.01-material-tools-v1';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0);
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function product(id){return arr('products').find(p=>sid(p?.id)===sid(id))||null}
function order(id){return arr('orders').find(o=>sid(o?.id)===sid(id))||null}
function gradeRows(grade){
  const rows=Array.isArray(grade)?grade.filter(x=>q(x?.qty)>0):[];
  const sizes=[...new Set(rows.map(x=>String(x.size||'').trim()).filter(Boolean))];
  const colors=[...new Set(rows.map(x=>String(x.color||'Sem cor').trim()||'Sem cor'))];
  return {rows,sizes,colors};
}
function gradeTable(grade){
  const g=gradeRows(grade);if(!g.rows.length)return '<div class="empty">Sem grade cadastrada.</div>';
  const body=g.colors.map(c=>'<tr><td><b>'+escSafe(c)+'</b></td>'+g.sizes.map(s=>'<td>'+g.rows.filter(x=>String(x.color||'Sem cor')===c&&String(x.size||'')===s).reduce((a,x)=>a+q(x.qty),0).toLocaleString('pt-BR')+'</td>').join('')+'<td><b>'+g.rows.filter(x=>String(x.color||'Sem cor')===c).reduce((a,x)=>a+q(x.qty),0).toLocaleString('pt-BR')+'</b></td></tr>').join('');
  return '<div style="overflow:auto"><table><thead><tr><th>Cor</th>'+g.sizes.map(s=>'<th>'+escSafe(s)+'</th>').join('')+'<th>Total</th></tr></thead><tbody>'+body+'</tbody></table></div>';
}
function orderProductGrade(o,productId){
  return (Array.isArray(o?.grade)?o.grade:[]).filter(x=>!productId||sid(x?.productId)===sid(productId));
}
window.hlgbToggleSeparationGrade=function(id,btn){
  const o=order(id),row=btn?.closest?.('.separation-row');if(!o||!row)return;
  let box=row.nextElementSibling;if(box?.classList?.contains('hlgb-sep-grade')){box.remove();btn.textContent='👕 Ver grade';return}
  box=document.createElement('div');box.className='hlgb-sep-grade';box.style.cssText='padding:10px 14px 16px;border:1px solid #eadde5;border-top:0;border-radius:0 0 12px 12px;background:#fffafd';
  box.innerHTML='<b>Grade do pedido #'+escSafe(typeof displayOrderNumber==='function'?displayOrderNumber(o):o.id)+'</b>'+gradeTable(o.grade);
  row.insertAdjacentElement('afterend',box);btn.textContent='Ocultar grade';
};
function decorateSeparation(){
  const root=document.getElementById('separationList');if(!root)return;
  root.querySelectorAll('.separation-row').forEach(row=>{
    if(row.querySelector('.hlgbSepGradeBtn'))return;
    const open=[...row.querySelectorAll('button[onclick]')].find(b=>/selectSeparationOrder\(([^)]+)\)/.test(b.getAttribute('onclick')||''));if(!open)return;
    const m=(open.getAttribute('onclick')||'').match(/selectSeparationOrder\(([^)]+)\)/);if(!m)return;
    const btn=document.createElement('button');btn.type='button';btn.className='secondary hlgbSepGradeBtn';btn.textContent='👕 Ver grade';btn.onclick=()=>window.hlgbToggleSeparationGrade(m[1].replace(/['"]/g,''),btn);
    open.parentElement?.insertBefore(btn,open);
  });
}
function productGradePreview(p){
  const sizes=Array.isArray(p?.sizes)?p.sizes:[],colors=Array.isArray(p?.colors)?p.colors:[];
  if(!sizes.length&&!colors.length)return '<div class="empty">Produto sem grade cadastrada.</div>';
  const rows=(colors.length?colors:['Todas']).map(c=>'<tr><td><b>'+escSafe(c)+'</b></td>'+sizes.map(()=>'<td>✓</td>').join('')+'</tr>').join('');
  return '<div class="sub">Tamanhos e cores permitidos na ficha do produto.</div><div style="overflow:auto;margin-top:8px"><table><thead><tr><th>Cor</th>'+sizes.map(s=>'<th>'+escSafe(s)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>';
}
window.hlgbOpenProductGrade=function(id){const p=product(id);if(!p)return;openModal('Grade — '+(p.name||'Produto'),productGradePreview(p),()=>closeModal())};
function decorateProductTable(){
  const root=document.getElementById('productTable');if(!root)return;
  root.querySelectorAll('tbody tr').forEach(tr=>{
    if(tr.querySelector('.hlgbProductGradeBtn'))return;
    const edit=[...tr.querySelectorAll('button[onclick]')].find(b=>/editProduct\(([^)]+)\)/.test(b.getAttribute('onclick')||''));if(!edit)return;
    const m=(edit.getAttribute('onclick')||'').match(/editProduct\(([^)]+)\)/);if(!m)return;
    const btn=document.createElement('button');btn.type='button';btn.className='secondary hlgbProductGradeBtn';btn.textContent='👕 Grade';btn.onclick=()=>window.hlgbOpenProductGrade(m[1].replace(/['"]/g,''));
    edit.parentElement?.insertBefore(btn,edit);
  });
}
function needForPieces(pieces,m){const qty=q(m?.qty),loss=q(m?.loss);if(qty<=0)return 0;const base=(m?.calcMode||'consumption')==='yield'?q(pieces)/qty:q(pieces)*qty;return base*(1+loss/100)}
let autoSeq=0,manualSeq=0;
function autoLine(){
  const host=document.getElementById('hlgbMatAutoLines');if(!host)return;
  const id=++autoSeq,row=document.createElement('div');row.className='panel hlgbMatAutoLine';row.dataset.id=id;row.style.margin='8px 0';
  row.innerHTML='<div class="toolbar" style="align-items:flex-end;flex-wrap:wrap"><div class="field" style="min-width:260px;flex:1"><label>Produto</label><select class="hlgbMatProduct"><option value="">Selecione</option>'+arr('products').slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR')).map(p=>'<option value="'+escSafe(p.id)+'">'+escSafe(p.name||'Produto')+'</option>').join('')+'</select></div><div class="hlgbMatGradeInputs" style="display:flex;gap:8px;flex-wrap:wrap"></div><button type="button" class="secondary hlgbMatRemove">Remover</button></div><div class="hlgbMatLineResult sub"></div>';
  host.appendChild(row);
  const sel=row.querySelector('.hlgbMatProduct'),grade=row.querySelector('.hlgbMatGradeInputs');
  sel.addEventListener('change',()=>{const p=product(sel.value);grade.innerHTML=(p?.sizes||['P','M','G','GG']).map(s=>'<div class="field" style="width:80px"><label>'+escSafe(s)+'</label><input class="hlgbMatSize" data-size="'+escSafe(s)+'" type="number" min="0" value="0"></div>').join('');grade.querySelectorAll('input').forEach(x=>x.addEventListener('input',renderCalc));renderCalc()});
  row.querySelector('.hlgbMatRemove').onclick=()=>{row.remove();renderCalc()};
}
function manualLine(){
  const host=document.getElementById('hlgbMatManualLines');if(!host)return;const id=++manualSeq,row=document.createElement('div');row.className='panel hlgbMatManualLine';row.dataset.id=id;row.style.margin='8px 0';
  row.innerHTML='<div class="toolbar" style="align-items:flex-end;flex-wrap:wrap"><div class="field" style="min-width:180px"><label>Material</label><input class="hlgbMmName" placeholder="Ex.: Renda"></div><div class="field" style="width:90px"><label>Un.</label><input class="hlgbMmUnit" value="m"></div><div class="field"><label>Cálculo</label><select class="hlgbMmMode"><option value="consumption">Consumo por peça</option><option value="yield">Rendimento</option></select></div><div class="field"><label>Consumo / rendimento</label><input class="hlgbMmQty" type="number" min="0" step="0.001"></div><div class="field"><label>Perda %</label><input class="hlgbMmLoss" type="number" min="0" step="0.1" value="0"></div><button type="button" class="secondary hlgbMatRemove">Remover</button></div><div class="toolbar hlgbMmGrade" style="align-items:flex-end;flex-wrap:wrap;margin-top:6px">'+['P','M','G','GG'].map(s=>'<div class="field" style="width:80px"><label>'+s+'</label><input data-size="'+s+'" type="number" min="0" value="0"></div>').join('')+'</div><div class="hlgbMmResult sub"></div>';
  host.appendChild(row);row.querySelectorAll('input,select').forEach(x=>x.addEventListener('input',renderCalc));row.querySelector('.hlgbMatRemove').onclick=()=>{row.remove();renderCalc()};
}
function autoData(){
  return [...document.querySelectorAll('.hlgbMatAutoLine')].map(row=>{const p=product(row.querySelector('.hlgbMatProduct')?.value),sizes={};row.querySelectorAll('.hlgbMatSize').forEach(x=>sizes[x.dataset.size]=q(x.value));const pieces=Object.values(sizes).reduce((a,v)=>a+v,0);return {product:p,sizes,pieces}}).filter(x=>x.product&&x.pieces>0);
}
function autoResult(){
  const agg={};for(const line of autoData())for(const m of (line.product.materials||[])){const key=(m.materialId||String(m.name||'').toLowerCase())+'|'+(m.unit||'');const a=agg[key]||(agg[key]={name:m.name||'Material',unit:m.unit||'',qty:0,products:[]});const need=needForPieces(line.pieces,m);a.qty+=need;a.products.push(line.product.name+' '+line.pieces+' pç')}
  return Object.values(agg).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
function manualResult(){
  return [...document.querySelectorAll('.hlgbMatManualLine')].map(row=>{const pieces=[...row.querySelectorAll('.hlgbMmGrade input')].reduce((a,x)=>a+q(x.value),0),m={qty:q(row.querySelector('.hlgbMmQty')?.value),loss:q(row.querySelector('.hlgbMmLoss')?.value),calcMode:row.querySelector('.hlgbMmMode')?.value||'consumption'};return {name:row.querySelector('.hlgbMmName')?.value||'Material',unit:row.querySelector('.hlgbMmUnit')?.value||'',pieces,qty:needForPieces(pieces,m)}}).filter(x=>x.pieces>0&&x.qty>0);
}
function renderCalc(){
  document.querySelectorAll('.hlgbMatAutoLine').forEach(row=>{const p=product(row.querySelector('.hlgbMatProduct')?.value),sizes=[...row.querySelectorAll('.hlgbMatSize')],pieces=sizes.reduce((a,x)=>a+q(x.value),0),box=row.querySelector('.hlgbMatLineResult');if(box)box.textContent=p?(pieces.toLocaleString('pt-BR')+' peças na grade'):'Selecione um produto.'});
  document.querySelectorAll('.hlgbMatManualLine').forEach(row=>{const r=manualResult().find(()=>true),box=row.querySelector('.hlgbMmResult');if(box){const pieces=[...row.querySelectorAll('.hlgbMmGrade input')].reduce((a,x)=>a+q(x.value),0),m={qty:q(row.querySelector('.hlgbMmQty')?.value),loss:q(row.querySelector('.hlgbMmLoss')?.value),calcMode:row.querySelector('.hlgbMmMode')?.value||'consumption'};box.textContent=pieces?('Grade total: '+pieces+' peças · Necessidade: '+needForPieces(pieces,m).toLocaleString('pt-BR',{maximumFractionDigits:3})+' '+(row.querySelector('.hlgbMmUnit')?.value||'')):'Preencha a grade.'}});
  const a=autoResult(),m=manualResult(),box=document.getElementById('hlgbMaterialCalcResult');if(!box)return;const rows=[...a.map(x=>({name:x.name,unit:x.unit,qty:x.qty,detail:x.products.join(' · ')})),...m.map(x=>({name:x.name,unit:x.unit,qty:x.qty,detail:'Manual · '+x.pieces+' peças'}))];box.innerHTML=rows.length?'<div style="overflow:auto"><table><thead><tr><th>Material</th><th>Necessidade</th><th>Origem</th></tr></thead><tbody>'+rows.map(x=>'<tr><td><b>'+escSafe(x.name)+'</b></td><td>'+x.qty.toLocaleString('pt-BR',{maximumFractionDigits:3})+' '+escSafe(x.unit)+'</td><td>'+escSafe(x.detail)+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty">Adicione produtos ou materiais e preencha a grade para calcular.</div>';
}
function ensureCalculator(){
  const sep=document.getElementById('separationList');const panel=sep?.closest?.('.panel');if(!panel||document.getElementById('hlgbMaterialCalculator'))return;
  const box=document.createElement('div');box.id='hlgbMaterialCalculator';box.className='panel';box.style.marginTop='14px';
  box.innerHTML='<h2>🧮 Calculadora de material</h2><div class="sub">Automático usa a ficha técnica dos produtos cadastrados. Manual permite informar material, consumo/rendimento e grade. Você pode somar vários produtos e materiais no mesmo cálculo.</div><div class="toolbar" style="margin-top:10px"><button type="button" class="primary" onclick="hlgbMatAddAuto()">+ Produto automático</button><button type="button" class="secondary" onclick="hlgbMatAddManual()">+ Material manual</button></div><h3>Produtos cadastrados</h3><div id="hlgbMatAutoLines"></div><h3>Materiais manuais</h3><div id="hlgbMatManualLines"></div><h3>Resultado consolidado</h3><div id="hlgbMaterialCalcResult"></div>';
  panel.insertAdjacentElement('afterend',box);renderCalc();
}
window.hlgbMatAddAuto=()=>{autoLine();renderCalc()};window.hlgbMatAddManual=()=>{manualLine();renderCalc()};window.hlgbMaterialTools={gradeTable,orderProductGrade,needForPieces,autoResult,manualResult,renderCalc};
const oldSep=window.renderSeparationList;if(typeof oldSep==='function'&&!oldSep.__hlgbMaterialToolsV1){const w=function(){const r=oldSep.apply(this,arguments);setTimeout(decorateSeparation,0);setTimeout(ensureCalculator,0);return r};w.__hlgbMaterialToolsV1=true;w.__original=oldSep;window.renderSeparationList=w}
const oldProd=window.renderProducts;if(typeof oldProd==='function'&&!oldProd.__hlgbMaterialToolsV1){const w=function(){const r=oldProd.apply(this,arguments);setTimeout(decorateProductTable,0);return r};w.__hlgbMaterialToolsV1=true;w.__original=oldProd;window.renderProducts=w}
function boot(){try{decorateSeparation();decorateProductTable();ensureCalculator()}catch(e){console.warn('[HLGB material tools]',e)}}try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,900),0)}catch(e){}setTimeout(boot,1600);
window.HLGB_MATERIAL_TOOLS_GUARD=V;
console.info('[HLGB] grades e calculadora de materiais ativas');
})();