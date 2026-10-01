/* HLGB — nota de compra com matérias-primas do fornecedor */
(function(){
'use strict';
const V='2026.10.01-purchase-supplier-materials-v1';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function supplier(){
 const id=document.getElementById('purchaseSupplier')?.value||'';
 return arr('suppliers').find(s=>sid(s?.id)===sid(id))||null;
}
function supplierProducts(s=supplier()){
 return Array.isArray(s?.products)?s.products.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR')):[];
}
function findGlobalMaterialByName(name){const n=norm(name);return arr('materials').find(m=>norm(m?.name)===n)||null}
function canWriteSuppliers(){try{return typeof hlgbRecordCanWrite==='function'?!!hlgbRecordCanWrite('suppliers'):typeof hasAccess==='function'?!!hasAccess('fornecedores'):true}catch(e){return false}}
async function saveRecord(module,row){
 if(typeof hlgbRecordSaveWithRetry==='function'){
  const out=await hlgbRecordSaveWithRetry(module,sid(row.id),row,false);
  if(!out?.applied)throw new Error('A nuvem não confirmou '+module+'.');
  const data=out.data||row,box=arr(module),i=box.findIndex(x=>sid(x?.id)===sid(row.id));if(i>=0)box[i]=data;else box.push(data);return data;
 }
 try{persistDb?.()}catch(e){}
 return row;
}
function optionHtml(selected){
 return '<option value="">Selecione a matéria-prima</option>'+supplierProducts().map((p,i)=>'<option value="'+i+'" '+(String(i)===String(selected)?'selected':'')+'>'+escSafe(p.name||'Material')+(p.unit?' · '+escSafe(p.unit):'')+(q(p.price)>0?' · R$ '+q(p.price).toFixed(4).replace('.',','):'')+'</option>').join('');
}
function decorateRow(tr){
 if(!tr||tr.dataset.supplierMaterialV1==='1')return;
 tr.dataset.supplierMaterialV1='1';
 const desc=tr.querySelector('.piDesc'),unit=tr.querySelector('.piUnit'),price=tr.querySelector('.piPrice'),cell=desc?.closest('td');
 if(!desc||!cell)return;
 const wrap=document.createElement('div');wrap.className='hlgbSupplierMatPicker';wrap.style.marginBottom='6px';
 wrap.innerHTML='<select class="hlgbSupplierMatSelect" style="width:100%">'+optionHtml('')+'</select>';
 cell.insertBefore(wrap,desc);
 const sel=wrap.querySelector('select');
 sel.onchange=()=>{
  const p=supplierProducts()[+sel.value];if(!p)return;
  desc.value=p.name||'';if(unit)unit.value=p.unit||unit.value||'UN';if(price&&q(p.price)>0)price.value=q(p.price);
  try{updatePurchaseTotal?.()}catch(e){}
 };
 const current=norm(desc.value||'');if(current){const idx=supplierProducts().findIndex(p=>norm(p.name)===current);if(idx>=0)sel.value=String(idx)}
}
function refreshRows(){
 document.querySelectorAll('.purchaseItemRow').forEach(tr=>{
  if(tr.dataset.supplierMaterialV1==='1'){
   const old=tr.querySelector('.hlgbSupplierMatSelect'),val=old?.value||'',html=optionHtml(val);
   if(old){old.innerHTML=html;const desc=tr.querySelector('.piDesc'),idx=supplierProducts().findIndex(p=>norm(p.name)===norm(desc?.value));if(idx>=0)old.value=String(idx)}
  }else decorateRow(tr);
 });
}
function injectPanel(){
 const detailed=document.getElementById('purchaseDetailedArea');if(!detailed||document.getElementById('hlgbSupplierMaterialPanel'))return;
 const panel=document.createElement('div');panel.id='hlgbSupplierMaterialPanel';panel.className='panel';panel.style.cssText='margin:10px 0;background:#fff8fb';
 panel.innerHTML='<div class="toolbar" style="justify-content:space-between;align-items:center"><div><h3 style="margin:0">Matérias-primas deste fornecedor</h3><div class="sub">Escolha acima em cada item. Se a matéria-prima ainda não existir para este fornecedor, cadastre aqui sem sair da nota.</div></div><button type="button" class="secondary" id="hlgbToggleNewSupplierMaterial">+ Cadastrar matéria-prima</button></div><div id="hlgbNewSupplierMaterial" style="display:none;margin-top:10px"><div class="grid"><div class="field"><label>Matéria-prima *</label><input id="hlgbNewSupMatName" placeholder="Ex.: Romantic"></div><div class="field"><label>Unidade</label><input id="hlgbNewSupMatUnit" placeholder="kg, m, un."></div><div class="field"><label>Preço neste fornecedor</label><input id="hlgbNewSupMatPrice" type="number" min="0" step="0.0001"></div></div><label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input id="hlgbAlsoGlobalMaterial" type="checkbox" checked> Cadastrar também na lista geral de matérias-primas se ainda não existir</label><button type="button" class="primary" id="hlgbSaveSupplierMaterial">Salvar matéria-prima neste fornecedor</button><div id="hlgbSupplierMaterialFeedback" class="sub" style="margin-top:6px"></div></div>';
 detailed.insertBefore(panel,detailed.querySelector('div[style*="overflow"]')||detailed.firstChild?.nextSibling||null);
 panel.querySelector('#hlgbToggleNewSupplierMaterial').onclick=()=>{const b=panel.querySelector('#hlgbNewSupplierMaterial');b.style.display=b.style.display==='none'?'block':'none'};
 panel.querySelector('#hlgbSaveSupplierMaterial').onclick=saveNewSupplierMaterial;
}
async function saveNewSupplierMaterial(){
 const s=supplier(),feedback=document.getElementById('hlgbSupplierMaterialFeedback');if(!s){alert('Selecione primeiro o fornecedor da nota.');return}
 if(!canWriteSuppliers()){alert('Seu usuário não possui permissão para alterar fornecedores.');return}
 const name=(document.getElementById('hlgbNewSupMatName')?.value||'').trim(),unit=(document.getElementById('hlgbNewSupMatUnit')?.value||'').trim()||'UN',price=q(document.getElementById('hlgbNewSupMatPrice')?.value);
 if(!name){alert('Informe o nome da matéria-prima.');return}
 s.products=Array.isArray(s.products)?s.products:[];
 let sp=s.products.find(x=>norm(x?.name)===norm(name));
 if(sp){sp.unit=unit||sp.unit;sp.price=price||sp.price||0}
 else{s.products.push({name,unit,price,createdFromPurchase:true,createdAt:new Date().toISOString()})}
 try{
  const savedS=await saveRecord('suppliers',{...s,updatedAt:new Date().toISOString()});Object.assign(s,savedS);
  if(document.getElementById('hlgbAlsoGlobalMaterial')?.checked){
   let m=findGlobalMaterialByName(name);
   if(!m){m={id:Date.now()+Math.floor(Math.random()*10000),name,cat:'Outro',unit,price,min:0,purchaseMode:unit,purchaseUnit:unit,purchasePrice:price,purchaseConversion:1,allowFractionalPurchase:true,createdFromPurchase:true,createdAt:new Date().toISOString()};await saveRecord('materials',m)}
  }
  if(feedback)feedback.innerHTML='✅ <b>'+escSafe(name)+'</b> cadastrado para '+escSafe(s.name||'fornecedor')+'.';
  refreshRows();
  const last=[...document.querySelectorAll('.purchaseItemRow')].at(-1);if(last){const desc=last.querySelector('.piDesc'),sel=last.querySelector('.hlgbSupplierMatSelect'),idx=supplierProducts().findIndex(p=>norm(p.name)===norm(name));if(sel&&idx>=0){sel.value=String(idx);sel.dispatchEvent(new Event('change',{bubbles:true}))}else if(desc)desc.value=name}
 }catch(e){if(feedback)feedback.textContent='Não foi possível salvar: '+String(e?.message||e)}
}
function installSupplierChange(){
 const el=document.getElementById('purchaseSupplier');if(!el||el.dataset.supplierMaterialsV1==='1')return;el.dataset.supplierMaterialsV1='1';
 el.addEventListener('change',()=>{refreshRows();const f=document.getElementById('hlgbSupplierMaterialFeedback');if(f)f.textContent=''});
}
function decoratePurchaseForm(){injectPanel();installSupplierChange();refreshRows()}
const oldAdd=window.addPurchaseItemRow;
if(typeof oldAdd==='function'&&!oldAdd.__hlgbSupplierMaterialsV1){const w=function(){const r=oldAdd.apply(this,arguments);setTimeout(refreshRows,0);return r};w.__hlgbSupplierMaterialsV1=true;window.addPurchaseItemRow=w}
const oldNew=window.newPurchase;
if(typeof oldNew==='function'&&!oldNew.__hlgbSupplierMaterialsV1){const w=function(){const r=oldNew.apply(this,arguments);setTimeout(decoratePurchaseForm,30);return r};w.__hlgbSupplierMaterialsV1=true;window.newPurchase=w}
const oldEdit=window.editPurchase;
if(typeof oldEdit==='function'&&!oldEdit.__hlgbSupplierMaterialsV1){const w=function(){const r=oldEdit.apply(this,arguments);setTimeout(decoratePurchaseForm,30);return r};w.__hlgbSupplierMaterialsV1=true;window.editPurchase=w}
window.hlgbPurchaseSupplierMaterials={supplierProducts,decoratePurchaseForm,saveNewSupplierMaterial,refreshRows};
setTimeout(decoratePurchaseForm,1600);
window.HLGB_PURCHASE_SUPPLIER_MATERIALS_GUARD=V;
console.info('[HLGB] matérias-primas do fornecedor integradas à nota de compra');
})();