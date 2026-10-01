/* HLGB — ficha técnica medida por corte */
(function(){
'use strict';
const V='2026.10.01-cut-material-usage-v1';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const moneySafe=v=>typeof money==='function'?money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function cut(id){return arr('cuts').find(c=>sid(c?.id)===sid(id))||null}
function product(id){return arr('products').find(p=>sid(p?.id)===sid(id))||null}
function material(id){return arr('materials').find(m=>sid(m?.id)===sid(id))||null}
function grams(weight,unit){const w=q(weight),u=norm(unit);return u==='kg'?w*1000:u==='g'||u==='grama'||u==='gramas'?w:0}
function materialKey(x){return sid(x?.materialId)||'name:'+norm(x?.name)}
function avgForProduct(productId){
 const groups=new Map();
 for(const c of arr('cuts')){
  if(!c||sid(c.productId)!==sid(productId)||!Array.isArray(c.materialUsage)||!c.materialUsage.length)continue;
  const pieces=q(c.pieces);if(pieces<=0)continue;
  for(const u of c.materialUsage){
   const g=grams(u.weight,u.unit);if(g<=0)continue;
   const key=materialKey(u),cur=groups.get(key)||{materialId:u.materialId||null,name:u.name||material(u.materialId)?.name||'Material',totalGrams:0,totalPieces:0,cuts:new Set()};
   cur.totalGrams+=g;cur.totalPieces+=pieces;cur.cuts.add(sid(c.id));groups.set(key,cur);
  }
 }
 return [...groups.values()].map(x=>{
  const avgGrams=x.totalPieces>0?x.totalGrams/x.totalPieces:0,m=material(x.materialId),price=q(m?.price),mu=norm(m?.unit),avgCost=mu==='kg'?price*(avgGrams/1000):mu==='g'?price*avgGrams:null;
  return {...x,cutCount:x.cuts.size,avgGramsPerPiece:avgGrams,avgKgPerPiece:avgGrams/1000,avgCostPerPiece:avgCost};
 }).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
function syncProductMeasuredSheet(productId){
 const p=product(productId);if(!p)return null;
 p.cutTechnicalSheet=avgForProduct(productId).map(x=>({materialId:x.materialId,name:x.name,avgGramsPerPiece:x.avgGramsPerPiece,avgKgPerPiece:x.avgKgPerPiece,avgCostPerPiece:x.avgCostPerPiece,cutCount:x.cutCount,updatedAt:new Date().toISOString(),source:'cut_material_usage'}));
 p.cutTechnicalSheetUpdatedAt=new Date().toISOString();
 return p;
}
function materialOptions(selected){
 return '<option value="">Outro / digitar</option>'+arr('materials').slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR')).map(m=>'<option value="'+escSafe(m.id)+'" '+(sid(selected)===sid(m.id)?'selected':'')+'>'+escSafe(m.name||'Material')+'</option>').join('');
}
function addLine(data={}){
 const host=document.getElementById('hlgbCutMaterialLines');if(!host)return;
 const row=document.createElement('div');row.className='panel hlgbCutMaterialLine';row.style.margin='8px 0';
 row.innerHTML='<div class="grid"><div class="field"><label>Matéria-prima</label><select class="hlgbCmuMaterial">'+materialOptions(data.materialId)+'</select></div><div class="field"><label>Nome</label><input class="hlgbCmuName" value="'+escSafe(data.name||material(data.materialId)?.name||'')+'" placeholder="Ex.: Renda"></div><div class="field"><label>Peso gasto</label><input class="hlgbCmuWeight" type="number" min="0" step="0.001" value="'+q(data.weight||0)+'"></div><div class="field"><label>Unidade</label><select class="hlgbCmuUnit"><option value="g" '+(data.unit!=='kg'?'selected':'')+'>gramas</option><option value="kg" '+(data.unit==='kg'?'selected':'')+'>kg</option></select></div><button type="button" class="secondary hlgbCmuRemove">Remover</button></div>';
 host.appendChild(row);
 const sel=row.querySelector('.hlgbCmuMaterial'),name=row.querySelector('.hlgbCmuName');
 sel.addEventListener('change',()=>{const m=material(sel.value);if(m)name.value=m.name||''});
 row.querySelector('.hlgbCmuRemove').onclick=()=>row.remove();
}
function collect(){
 return [...document.querySelectorAll('.hlgbCutMaterialLine')].map(row=>{
  const materialId=row.querySelector('.hlgbCmuMaterial')?.value||'',m=material(materialId),name=(row.querySelector('.hlgbCmuName')?.value||m?.name||'').trim(),weight=q(row.querySelector('.hlgbCmuWeight')?.value),unit=row.querySelector('.hlgbCmuUnit')?.value||'g';
  return {materialId:materialId?(Number.isFinite(+materialId)?+materialId:materialId):null,name,weight,unit};
 }).filter(x=>x.name&&x.weight>0);
}
async function saveRecord(module,row){
 if(typeof hlgbRecordSaveWithRetry==='function'){
  const out=await hlgbRecordSaveWithRetry(module,sid(row.id),row,false);if(!out?.applied)throw new Error('A nuvem não confirmou '+module+'.');return out.data||row;
 }
 if(typeof persistDb==='function'){persistDb();return row}
 throw new Error('Gravação oficial indisponível.');
}
function averagesHtml(productId){
 const rows=avgForProduct(productId);
 if(!rows.length)return '<div class="empty">Ainda não há medições de material para este produto.</div>';
 return '<div style="overflow:auto"><table><thead><tr><th>Material</th><th>Cortes medidos</th><th>Média por peça</th><th>Custo médio/pç</th></tr></thead><tbody>'+rows.map(x=>'<tr><td><b>'+escSafe(x.name)+'</b></td><td>'+x.cutCount+'</td><td>'+x.avgGramsPerPiece.toLocaleString('pt-BR',{maximumFractionDigits:3})+' g</td><td>'+(x.avgCostPerPiece==null?'—':moneySafe(x.avgCostPerPiece))+'</td></tr>').join('')+'</tbody></table></div>';
}
function openSheet(id){
 const c=cut(id);if(!c)return alert('Corte não encontrado.');
 const p=product(c.productId),usage=Array.isArray(c.materialUsage)?c.materialUsage:[];
 openModal('⚖️ Materiais gastos no corte','<div class="panel" style="margin-top:0;background:#fff8fb"><div><b>'+escSafe(p?.name||c.product||'Produto')+'</b> · '+q(c.pieces).toLocaleString('pt-BR')+' peças</div><div class="sub">Anote o peso realmente gasto em cada matéria-prima neste corte.</div></div><div id="hlgbCutMaterialLines"></div><button type="button" class="secondary" onclick="hlgbCutMaterialAddLine()">+ Adicionar material</button><h3 style="margin-top:16px">Média medida deste produto</h3><div id="hlgbCutMaterialAverage">'+averagesHtml(c.productId)+'</div><button type="button" class="primary modalSave" style="margin-top:14px">☁️ Salvar ficha do corte</button>',async()=>{
   const rows=collect();if(!rows.length){alert('Adicione pelo menos um material com peso.');return false}
   const next={...c,materialUsage:rows,materialUsageRecordedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
   try{
    const saved=await saveRecord('cuts',next);const i=db.cuts.findIndex(x=>sid(x.id)===sid(c.id));if(i>=0)db.cuts[i]=saved;
    const pp=syncProductMeasuredSheet(c.productId);if(pp){const savedP=await saveRecord('products',pp);const pi=db.products.findIndex(x=>sid(x.id)===sid(pp.id));if(pi>=0)db.products[pi]=savedP}
    try{localSaveOnly?.()}catch(e){}
    closeModal();try{renderCuts?.();renderProducts?.()}catch(e){};return true;
   }catch(e){alert('Não foi possível salvar a ficha de materiais.\n\n'+String(e?.message||e));return false}
 });
 setTimeout(()=>{if(usage.length)usage.forEach(addLine);else addLine()},0);
}
function idFromRow(tr){
 for(const b of tr.querySelectorAll('button[onclick]')){
  const s=b.getAttribute('onclick')||'';let m=s.match(/hlgbEditCut9189\(([^)]+)\)/)||s.match(/editCut\(([^)]+)\)/)||s.match(/finishCut\(([^)]+)\)/);if(m)return m[1].replace(/['"]/g,'');
 }
 return '';
}
function decorate(){
 for(const rootId of ['cutTable','dailyCutsTable']){
  const root=document.getElementById(rootId);if(!root)continue;
  root.querySelectorAll('tbody tr').forEach(tr=>{
   if(tr.querySelector('.hlgbCutMaterialBtn'))return;const id=idFromRow(tr);if(!id||!cut(id)?.productId)return;
   const cell=tr.lastElementChild;if(!cell)return;const b=document.createElement('button');b.type='button';b.className='secondary hlgbCutMaterialBtn';b.textContent='⚖️ Materiais';b.onclick=()=>openSheet(id);cell.appendChild(document.createTextNode(' '));cell.appendChild(b);
  });
 }
}
function openProductAverage(id){
 const p=product(id);if(!p)return;
 openModal('⚖️ Ficha técnica medida — '+(p.name||'Produto'),'<div class="sub">Média real baseada nos pesos lançados pelos cortadores. A média é ponderada pelas peças de cada corte.</div><div style="margin-top:10px">'+averagesHtml(id)+'</div><button type="button" class="secondary modalSave">Fechar</button>',()=>closeModal());
}
function decorateProducts(){
 const root=document.getElementById('productTable');if(!root)return;
 root.querySelectorAll('tbody tr').forEach(tr=>{
  if(tr.querySelector('.hlgbProductCutAverageBtn'))return;
  const edit=[...tr.querySelectorAll('button[onclick]')].find(b=>/editProduct\(([^)]+)\)/.test(b.getAttribute('onclick')||''));if(!edit)return;
  const m=(edit.getAttribute('onclick')||'').match(/editProduct\(([^)]+)\)/);if(!m)return;const id=m[1].replace(/['"]/g,'');
  const b=document.createElement('button');b.type='button';b.className='secondary hlgbProductCutAverageBtn';b.textContent='⚖️ Média de corte';b.onclick=()=>openProductAverage(id);edit.parentElement?.appendChild(b);
 });
}
window.hlgbCutMaterialAddLine=()=>addLine();
window.openHlgbCutMaterialSheet=openSheet;
window.hlgbCutMaterialUsage={grams,avgForProduct,syncProductMeasuredSheet,collect,averagesHtml,openSheet};
const oldCuts=window.renderCuts;if(typeof oldCuts==='function'&&!oldCuts.__hlgbMaterialUsageV1){const w=function(){const r=oldCuts.apply(this,arguments);setTimeout(decorate,0);return r};w.__hlgbMaterialUsageV1=true;w.__original=oldCuts;window.renderCuts=w}
const oldDaily=window.renderDailyCuts;if(typeof oldDaily==='function'&&!oldDaily.__hlgbMaterialUsageV1){const w=function(){const r=oldDaily.apply(this,arguments);setTimeout(decorate,0);return r};w.__hlgbMaterialUsageV1=true;w.__original=oldDaily;window.renderDailyCuts=w}
const oldProducts=window.renderProducts;if(typeof oldProducts==='function'&&!oldProducts.__hlgbMaterialUsageV1){const w=function(){const r=oldProducts.apply(this,arguments);setTimeout(decorateProducts,0);return r};w.__hlgbMaterialUsageV1=true;w.__original=oldProducts;window.renderProducts=w}
function boot(){try{decorate();decorateProducts()}catch(e){console.warn('[HLGB material por corte]',e)}}try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,900),0)}catch(e){}setTimeout(boot,1600);
window.HLGB_CUT_MATERIAL_USAGE_GUARD=V;
console.info('[HLGB] ficha técnica medida por corte ativa');
})();