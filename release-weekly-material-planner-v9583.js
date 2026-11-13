/* HLGB v95.83 — Planejamento semanal de materiais para compra.
 * Somente leitura dos cadastros existentes: produtos/fichas técnicas, materiais,
 * estoque e fornecedores. Não cria notas, não baixa estoque nem altera a WAL.
 * Rascunho de seleção guardado apenas neste navegador; exportação CSV/impressão.
 */
(function(){
'use strict';
if(window.hlgbWeeklyMaterialPlanner9583)return;
const V='95.83',DRAFT='hlgb-weekly-material-planner-draft-v9583';
const sid=v=>String(v??''),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const esc=v=>sid(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const numeric=v=>{if(v===null||v===undefined||sid(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const pos=v=>{const n=numeric(v);return n!==null&&n>0?n:null};
const nonneg=v=>{const n=numeric(v);return n!==null&&n>=0?n:null};
const decimal=(v,max=4)=>Number.isFinite(v)?Number(v.toFixed(max)).toLocaleString('pt-BR',{maximumFractionDigits:max}):'—';
const money=v=>v==null||!Number.isFinite(v)?'A conferir':v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dbRef=()=>{try{return typeof db!=='undefined'&&db&&typeof db==='object'?db:window.db||{}}catch(_){return window.db||{}}};
const rows=name=>{const a=dbRef()[name];return Array.isArray(a)?a:[]};
const materialById=id=>rows('materials').find(m=>sid(m?.id)===sid(id))||null;
const productById=id=>rows('products').find(p=>sid(p?.id)===sid(id))||null;
const localDate=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
function monday(value){
 const d=value instanceof Date?new Date(value):typeof value==='string'&&/^\d{4}-\d\d-\d\d$/.test(value)?
 new Date(+value.slice(0,4),+value.slice(5,7)-1,+value.slice(8,10)):new Date();
 if(!Number.isFinite(d.valueOf()))return monday(new Date());
 d.setHours(12,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return localDate(d);
}
function weekEnd(start){
 const d=new Date(+start.slice(0,4),+start.slice(5,7)-1,+start.slice(8,10));
 d.setDate(d.getDate()+6);return localDate(d);
}
const state={week:monday(new Date()),selected:[],view:'comprar',renderCount:0,lastError:'',sourceUpdated:'',draftStored:false};
function readDraft(){
 try{
  const data=JSON.parse(localStorage.getItem(DRAFT)||'null');
  if(data&&Array.isArray(data.selected)){
   state.week=/^\d{4}-\d\d-\d\d$/.test(sid(data.week))?monday(data.week):state.week;
   state.selected=data.selected.filter(x=>x&&sid(x.productId)&&Number.isInteger(+x.pieces)&&+x.pieces>0)
    .map(x=>({productId:sid(x.productId),pieces:Math.min(10000000,+x.pieces)}));
  }
 }catch(e){state.lastError='Não foi possível recuperar o rascunho local: '+sid(e.message||e)}
}
function saveDraft(){
 try{localStorage.setItem(DRAFT,JSON.stringify({week:state.week,selected:state.selected}));state.draftStored=true}
 catch(e){state.draftStored=false;state.lastError='Não foi possível salvar o rascunho neste navegador.'}
}
function catalogUnit(m,c){return sid(m?.unit||c?.unit||'').trim()}
function keyFor(m,c,name,unit){return (c?.id!=null?'id:'+sid(c.id):'nome:'+norm(name))+'|un:'+norm(unit)+'|cor:'+norm(m?.color||'')}
function supplyMatches(item,stocks){
 const byId=stocks.filter(s=>s?.materialId!=null&&sid(s.materialId)===sid(item.materialId));
 const byName=stocks.filter(s=>norm(s?.item||s?.name)===norm(item.name)&&(!item.color||!s.color||norm(s.color)===norm(item.color)));
 return byId.length?byId:byName;
}
function stockFor(item,stocks){
 const candidates=supplyMatches(item,stocks),matched=candidates.length;
 if(!matched)return {known:false,amount:null,note:'Sem estoque cadastrado'};
 let total=0,failed=false,notes=[];
 for(const s of candidates){
  const n=nonneg(s.qty??s.quantity??s.balance);
  const unit=norm(s.unit||item.unit);
  if(n===null){failed=true;notes.push('Quantidade de estoque inválida');continue}
  if(unit===norm(item.unit)){total+=n;continue}
  const pack=norm(item.catalog?.purchaseUnit),conversion=pos(item.catalog?.purchaseConversion)||pos(item.catalog?.packageAvg);
  if(conversion&&pack&&(unit===pack||unit===pack+'s'||unit.replace(/s$/,'')===pack.replace(/s$/,''))){
   total+=n*conversion;continue;
  }
  failed=true;notes.push('Estoque em unidade incompatível: '+sid(s.unit));
 }
 return {known:!failed,amount:!failed?total:null,note:failed?[...new Set(notes)].join('; '):'Conferido no cadastro'};
}
function buyTerms(item,required){
 const c=item.catalog||{},m=item.fallback||{},unit=item.unit;
 const conversion=pos(c.purchaseConversion)||pos(c.packageAvg);
 const packUnit=sid(c.purchaseUnit||c.purchaseMode||unit).trim()||unit;
 const mode=norm(c.purchaseMode);
 const fractional=c.allowFractionalPurchase===true||sid(c.allowFractionalPurchase).toLowerCase()==='true';
 const basePrice=pos(c.price)||pos(m.price);
 const packPrice=pos(c.purchasePrice);
 const buyBase=(mode===norm(unit)&&(fractional||norm(packUnit)===norm(unit)))||(!mode&&norm(packUnit)===norm(unit));
 const warnings=[];
 if(required<=1e-9)return {need:0,amount:0,unit:buyBase?unit:packUnit,cost:0,pricing:'sem compra',conversion,basePrice,packPrice,warnings};
 let amount=null,buyUnit=packUnit,covered=null;
 if(buyBase){
  buyUnit=unit;amount=fractional?required:Math.ceil(required-1e-9);
  covered=amount;
 }else if(conversion){
  amount=fractional?Number((required/conversion).toFixed(4)):Math.ceil(required/conversion-1e-9);
  // Always round fractional purchases UP by a minimal precision increment;
  // never suggest less material than required.
  if(fractional&&amount*conversion+1e-9<required)amount=Math.ceil(required/conversion*10000)/10000;
  covered=amount*conversion;
 }else if(norm(packUnit)===norm(unit)){
  buyUnit=unit;amount=fractional?required:Math.ceil(required-1e-9);covered=amount;
 }else warnings.push('Conversão para '+packUnit+' não cadastrada');
 let cost=null,pricing='';
 if(amount!==null){
  if(buyBase||norm(buyUnit)===norm(unit)){
   if(basePrice){cost=amount*basePrice;pricing='preço por '+unit}
   else if(packPrice&&conversion&&norm(buyUnit)===norm(packUnit)){
    cost=amount/conversion*packPrice;pricing='preço convertido de '+packUnit;
   }
  }else if(packPrice){cost=amount*packPrice;pricing='preço da embalagem'}
  else if(basePrice){cost=covered*basePrice;pricing='preço por '+unit+' convertido'}
  if(cost===null)warnings.push('Sem preço válido no cadastro');
 }else warnings.push('Valor de compra não pode ser fechado sem conversão');
 if(!c.id)warnings.push('Material sem vínculo com cadastro de matérias-primas');
 return {need:required,amount,unit:buyUnit,cost,pricing,conversion,basePrice,packPrice,warnings,covered};
}
function supplierFor(item,suppliers){
 const cat=item.catalog||{},byId=cat.supplierId;
 if(byId!=null){const s=suppliers.find(x=>sid(x.id)===sid(byId));if(s)return sid(s.name)}
 const exact=suppliers.filter(s=>Array.isArray(s.products)&&s.products.some(p=>norm(p?.name)===norm(item.name)));
 return exact.length===1?sid(exact[0].name):'';
}
function calculate(selection=state.selected,data=dbRef()){
 const products=Array.isArray(data.products)?data.products:[],materials=Array.isArray(data.materials)?data.materials:[],
 stocks=Array.isArray(data.stock)?data.stock:[],suppliers=Array.isArray(data.suppliers)?data.suppliers:[];
 const materialMap=new Map(),models=[],warnings=[],selected=new Map();
 for(const s of selection){
  const id=sid(s?.productId),pieces=Number(s?.pieces);
  if(!id||!Number.isInteger(pieces)||pieces<=0||pieces>10000000){warnings.push('Seleção com quantidade inválida');continue}
  selected.set(id,(selected.get(id)||0)+pieces);
 }
 for(const [id,pieces] of selected){
  const p=products.find(x=>sid(x.id)===id);
  if(!p){warnings.push('Produto '+id+' não encontrado');continue}
  const model={productId:id,name:sid(p.name||p.code||id),pieces,materials:[],warnings:[],baseCostKnown:0,missingUnitPrices:0};
  const components=Array.isArray(p.materials)?p.materials:[];
  if(!components.length)model.warnings.push('Modelo sem ficha técnica de materiais');
  for(const m of components){
   const c=materials.find(x=>sid(x.id)===sid(m?.materialId))||null;
   const name=sid(m?.name||c?.name).trim(),unit=catalogUnit(m,c),per=pos(m?.qty),loss=nonneg(m?.loss??0);
   const mode=sid(m?.calcMode||'consumption'),validMode=mode==='yield'||mode==='consumption';
   if(!name||!unit||per===null||!validMode||loss===null){
    model.warnings.push('Ficha incompleta: '+(name||'material sem nome')+
      ' · quantidade, unidade, rendimento ou perda inválida');continue;
   }
   const needed=(mode==='yield'?pieces/per:pieces*per)*(1+loss/100);
   if(!Number.isFinite(needed)||needed<=0){
    model.warnings.push('Consumo inválido para '+name);continue;
   }
   const key=keyFor(m,c,name,unit),value={key,materialId:c?.id??m.materialId??null,
    name,unit,color:sid(m.color||''),category:sid(m.cat||c?.cat||''),catalog:c,fallback:m};
   let t=materialMap.get(key);
   if(!t){t={...value,needed:0,models:[]};materialMap.set(key,t)}
   t.needed+=needed;
   t.models.push({productId:id,model:model.name,pieces,needed,mode,per,loss});
   const unitPrice=pos(c?.price)||pos(m?.price),estimatedCost=unitPrice==null?null:needed*unitPrice;
   if(estimatedCost===null)model.missingUnitPrices++;else model.baseCostKnown+=estimatedCost;
   model.materials.push({...value,needed,mode,per,loss,unitPrice,estimatedCost,rule:mode==='yield'?
    decimal(per)+' peças por '+unit:decimal(per)+' '+unit+' por peça'});
   if(!c)model.warnings.push('Material '+name+' não encontrado no cadastro: preço/embalagem a conferir');
  }
  warnings.push(...model.warnings.map(x=>model.name+': '+x));
  models.push(model);
 }
 let totalKnown=0,unknownCost=0,unverifiedStock=0,allNeed=0,wholePrice=false;
 const consolidated=[...materialMap.values()].map(item=>{
  const stock=stockFor(item,stocks);
  if(!stock.known)unverifiedStock++;
  const missing=stock.known?Math.max(0,item.needed-stock.amount):item.needed;
  const purchase=buyTerms(item,missing);
  const supplier=supplierFor(item,suppliers);
  if(purchase.cost!==null)totalKnown+=purchase.cost;
  else if(missing>1e-9)unknownCost++;
  allNeed+=item.needed;
  if(!stock.known&&missing>0)wholePrice=true;
  warnings.push(...purchase.warnings.map(x=>item.name+': '+x));
  return {...item,needed:item.needed,stock,purchase,missing,supplier,
   estimatedOnly:!stock.known,priceMissing:purchase.cost===null&&missing>0};
 }).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||a.unit.localeCompare(b.unit,'pt-BR'));
 return {models,consolidated,totalPieces:models.reduce((n,m)=>n+m.pieces,0),
  totalKnown,unknownCost,unverifiedStock,hasUnknowns:unknownCost>0||unverifiedStock>0||warnings.length>0,
  warnings:[...new Set(warnings)],stockComplete:unverifiedStock===0,allNeed,
  pricedMaterials:consolidated.filter(m=>m.purchase.cost!==null&&m.missing>0).length,
  planHasSelection:models.length>0,estimateIsCeiling:wholePrice};
}
function csvCell(v){
 let s=sid(v);if(/^[\s]*[=+@-]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
function csvFor(plan,view='comprar'){
 const lines=[['Semana de',state.week,'até',weekEnd(state.week)],[],
  ['Origem','Planejamento de materiais — simulação; não gera compra nem dá baixa'],[]];
 if(view==='modelos'){
  lines.push(['Modelo','Peças','Matéria-prima','Cor','Unidade','Necessário','Regra','Perda %','Preço base R$','Custo bruto R$']);
  for(const m of plan.models)for(const r of m.materials)lines.push([
   m.name,m.pieces,r.name,r.color,r.unit,decimal(r.needed,5),r.rule,r.loss,
   r.unitPrice==null?'Preço a conferir':r.unitPrice.toFixed(3).replace('.',','),
   r.estimatedCost==null?'Custo a conferir':r.estimatedCost.toFixed(2).replace('.',',')]);
 }else{
  lines.push(['Material','Cor','Unidade','Necessário','Estoque conferido','Falta estimada','Unidade de compra','Comprar',
   'Custo previsto R$','Fornecedor','Situação']);
  for(const r of plan.consolidated)lines.push([
   r.name,r.color,r.unit,decimal(r.needed,5),r.stock.known?decimal(r.stock.amount,5):'A conferir',
   decimal(r.missing,5),r.purchase.unit,r.purchase.amount==null?'Conversão a conferir':decimal(r.purchase.amount,4),
   r.purchase.cost===null?'Preço a conferir':r.purchase.cost.toFixed(2).replace('.',','),
   r.supplier,r.estimatedOnly?'Estoque não cadastrado':r.purchase.warnings.join(' / ')]);
  lines.push([],['Custo conhecido (PARCIAL quando há alertas)',plan.totalKnown.toFixed(2).replace('.',',')]);
 }
 if(plan.warnings.length)lines.push([],['Pendências de cadastro'],...plan.warnings.map(w=>[w]));
 return '\uFEFF'+lines.map(r=>r.map(csvCell).join(';')).join('\r\n');
}
function downloadCsv(view){
 const plan=calculate();if(!plan.planHasSelection){alert('Adicione pelo menos um modelo antes de exportar.');return false}
 const blob=new Blob([csvFor(plan,view)],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='HLGB-'+(view==='modelos'?'materiais-por-modelo':'compra-consolidada')+'-'+state.week+'.csv';
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);return true;
}
function summaryHtml(plan){
 return '<div class="cards" style="margin:12px 0">'+
  '<div class="card"><small>Modelos</small><strong>'+plan.models.length+'</strong></div>'+
  '<div class="card"><small>Total de peças</small><strong>'+decimal(plan.totalPieces,0)+'</strong></div>'+
  '<div class="card"><small>Materiais distintos</small><strong>'+plan.consolidated.length+'</strong></div>'+
  '<div class="card"><small>Compra estimada'+(plan.hasUnknowns?' (parcial)':'')+'</small><strong>'+money(plan.totalKnown)+'</strong></div></div>'+
  (plan.hasUnknowns?'<p class="sub" style="color:#8c5620"><b>⚠ Orçamento parcial:</b> '+
   plan.unknownCost+' material(is) sem custo calculável; '+plan.unverifiedStock+
   ' sem estoque conferido. A quantidade a comprar desses materiais considera o total necessário, sujeito à conferência física. '+
   'O valor mostrado não é cotação final nem limite máximo garantido.</p>':'<p class="sub">Previsão baseada nos preços e no estoque cadastrados; confira antes de emitir pedidos de compra.</p>');
}
function consolidatedHtml(plan){
 if(!plan.consolidated.length)return '<div class="empty">Selecione modelos com fichas técnicas válidas.</div>';
 const head='<tr><th>Material</th><th>Necessário</th><th>Estoque cadastrado</th><th>Comprar</th><th>Custo da compra</th></tr>';
 const rs=plan.consolidated.map(r=>{
  const buy=r.purchase.amount==null?'Conferir conversão':decimal(r.purchase.amount,4)+' '+esc(r.purchase.unit);
  const extra=r.purchase.covered>r.missing+1e-9?' · embalagem cobre '+decimal(r.purchase.covered,4)+' '+esc(r.unit):'';
  return '<tr><td><b>'+esc(r.name)+'</b>'+(r.color?' · '+esc(r.color):'')+
    '<div class="sub">'+esc(r.category)+(r.supplier?' · '+esc(r.supplier):'')+'</div></td>'+
    '<td>'+decimal(r.needed,4)+' '+esc(r.unit)+'</td>'+
    '<td>'+(r.stock.known?decimal(r.stock.amount,4)+' '+esc(r.unit):'<b>Não informado</b>')+'</td>'+
    '<td><b>'+buy+'</b><div class="sub">Falta '+decimal(r.missing,4)+' '+esc(r.unit)+extra+'</div></td>'+
    '<td>'+money(r.purchase.cost)+
    (r.purchase.warnings.length?'<div class="sub">⚠ '+esc(r.purchase.warnings.join('; '))+'</div>':'')+
    (r.estimatedOnly?'<div class="sub">* Sujeito à conferência de estoque</div>':'')+'</td></tr>';
 }).join('');
 return '<div style="overflow-x:auto"><table><thead>'+head+'</thead><tbody>'+rs+'</tbody></table></div>'+
 '<div class="sub">Para compras em embalagem fechada, a quantidade é arredondada para rolo/pacote inteiro. '+
 'Se a compra fracionada estiver liberada no cadastro, o cálculo respeita essa configuração.</div>';
}
function modelsHtml(plan){
 if(!plan.models.length)return '<div class="empty">Selecione modelos para detalhar consumo.</div>';
 return plan.models.map(m=>'<details class="panel" open style="padding:10px;margin:10px 0">'+
  '<summary><b>'+esc(m.name)+'</b> · '+decimal(m.pieces,0)+' peças · '+m.materials.length+' materiais'+
   ' · custo bruto de materiais '+money(m.baseCostKnown)+(m.missingUnitPrices?' (parcial)':'')+'</summary>'+
  (m.materials.length?'<div style="overflow-x:auto"><table><thead><tr><th>Material</th><th>Regra da ficha</th><th>Perda</th><th>Necessário</th><th>Preço base</th><th>Custo material</th></tr></thead><tbody>'+
   m.materials.map(x=>'<tr><td>'+esc(x.name)+(x.color?' · '+esc(x.color):'')+'</td><td>'+esc(x.rule)+'</td>'+
    '<td>'+decimal(x.loss,2)+'%</td><td><b>'+decimal(x.needed,4)+' '+esc(x.unit)+'</b></td>'+ 
    '<td>'+money(x.unitPrice)+'</td><td>'+money(x.estimatedCost)+'</td></tr>').join('')+
   '</tbody></table><div class="sub">Custo bruto antes do abatimento de estoque; não é a parcela de compra deste modelo.</div></div>':'<p class="sub">Ficha sem material válido; revisar o cadastro.</p>')+
  (m.warnings.length?'<p class="sub" style="color:#8c5620">⚠ '+esc(m.warnings.join('; '))+'</p>':'')+'</details>').join('');
}
function render(){
 const host=document.getElementById('hlgbWeeklyPlanner9583');if(!host)return false;
 const options=rows('products').filter(x=>x&&x.id!=null&&x.active!==false).slice().sort((a,b)=>sid(a.name).localeCompare(sid(b.name),'pt-BR'));
 const models=state.selected.map((x,i)=>{
  const p=productById(x.productId),label=p?.name||'Produto não encontrado';
  return '<div class="grid" style="display:grid;grid-template-columns:minmax(180px,3fr) minmax(90px,1fr) auto;align-items:end;gap:8px;margin:6px 0" data-plan-row="'+i+'">'+
   '<div class="field"><label>Modelo '+(i+1)+'</label><select data-plan-id="'+i+'">'+
   '<option value="">Selecione o modelo</option>'+
   options.map(o=>'<option value="'+esc(o.id)+'"'+(sid(o.id)===sid(x.productId)?' selected':'')+'>'+esc(o.name||o.code||o.id)+'</option>').join('')+
   (!p?'<option selected value="'+esc(x.productId)+'">⚠ '+esc(label)+'</option>':'')+'</select></div>'+
   '<div class="field"><label>Peças</label><input data-plan-qty="'+i+'" type="number" min="1" max="10000000" step="1" value="'+esc(x.pieces)+'"></div>'+
   '<button type="button" class="secondary" data-plan-remove="'+i+'" title="Remover modelo">Remover</button></div>';
 }).join('');
 const plan=calculate();
 host.innerHTML='<h2>🛒 Planejamento de materiais para compra da semana</h2>'+
  '<p class="sub">Selecione quantos modelos precisar. A lista consolida tecidos, rendas e aviamentos repetidos e aplica consumo/rendimento e perdas da ficha técnica.</p>'+
  '<div class="grid" style="display:grid;grid-template-columns:minmax(180px,1fr) minmax(180px,2fr);gap:10px">'+
   '<div class="field"><label>Semana (segunda-feira)</label><input id="hlgbPlanWeek9583" type="date" value="'+esc(state.week)+'"></div>'+
   '<div class="field"><label>Período</label><div>'+esc(state.week)+' a '+esc(weekEnd(state.week))+'</div></div></div>'+
  '<div id="hlgbPlanRows9583">'+models+'</div>'+
  '<div class="toolbar" style="display:flex;flex-wrap:wrap;gap:8px;margin:9px 0">'+
   '<button type="button" class="primary" data-plan-add="1">+ Adicionar modelo</button>'+
   '<button type="button" class="secondary" data-plan-clear="1">Limpar seleção</button></div>'+
  '<div class="sub">Rascunho das quantidades salvo somente neste navegador. Não cria nota, não altera estoque e não grava uma compra.</div>'+
  summaryHtml(plan)+
  '<div class="toolbar" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0">'+
   '<button type="button" class="'+(state.view==='comprar'?'primary':'secondary')+'" data-plan-view="comprar">Material para comprar · consolidado</button>'+
   '<button type="button" class="'+(state.view==='modelos'?'primary':'secondary')+'" data-plan-view="modelos">Material para separar por modelo</button>'+
   '<button type="button" class="secondary" data-plan-csv="1">Baixar CSV</button>'+
   '<button type="button" class="secondary" data-plan-print="1">Imprimir</button></div>'+
  '<div id="hlgbPlanResults9583">'+(state.view==='modelos'?modelsHtml(plan):consolidatedHtml(plan))+'</div>'+
  (plan.warnings.length?'<details style="margin-top:12px"><summary>⚠ Conferências necessárias ('+plan.warnings.length+')</summary>'+
   '<ul>'+plan.warnings.slice(0,120).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></details>':'')+
  '<p class="sub">Origem: fichas técnicas e cadastro de materiais/estoque do HLGB no navegador. '+
  'Sem ficha, conversão, preço ou estoque, a ferramenta informa a pendência em vez de inventar um valor.</p>';
 host.dataset.rendered=V;state.renderCount++;return plan;
}
function mutateAndRender(fn){fn();saveDraft();render()}
function bind(){
 const h=document.getElementById('hlgbWeeklyPlanner9583');if(!h||h.dataset.events==='1')return;
 h.dataset.events='1';
 h.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='hlgbPlanWeek9583'){mutateAndRender(()=>state.week=monday(t.value));return}
  if(t.matches('[data-plan-id]')){
   const index=+t.dataset.planId;mutateAndRender(()=>{if(state.selected[index])state.selected[index].productId=sid(t.value)});return;
  }
  if(t.matches('[data-plan-qty]')){
   const index=+t.dataset.planQty,n=Number(t.value);
   if(!Number.isInteger(n)||n<=0||n>10000000){alert('Informe quantidade inteira entre 1 e 10.000.000 peças.');render();return}
   mutateAndRender(()=>{if(state.selected[index])state.selected[index].pieces=n});return;
  }
 });
 h.addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t)return;
  if(t.hasAttribute('data-plan-add')){mutateAndRender(()=>state.selected.push({productId:'',pieces:100}));return}
  if(t.hasAttribute('data-plan-remove')){
   const index=+t.dataset.planRemove;mutateAndRender(()=>state.selected.splice(index,1));return;
  }
  if(t.hasAttribute('data-plan-clear')){
   if(state.selected.length&&!confirm('Limpar a seleção de modelos desta semana?'))return;
   mutateAndRender(()=>state.selected=[]);return;
  }
  if(t.hasAttribute('data-plan-view')){state.view=t.dataset.planView;render();return}
  if(t.hasAttribute('data-plan-csv')){downloadCsv(state.view);return}
  if(t.hasAttribute('data-plan-print')){window.print();return}
 });
}
function install(){
 const target=document.getElementById('purchaseTable');
 const parent=target?.closest?.('.page')||document.getElementById('purchases')||document.getElementById('compras');
 if(!parent)return false;
 if(!document.getElementById('hlgbWeeklyPlanner9583')){
  const el=document.createElement('section');el.id='hlgbWeeklyPlanner9583';el.className='panel';
  el.style.cssText='padding:15px;margin:10px 0 20px';
  // Colocar no topo de Compras, sem modificar a lista existente de notas.
  parent.insertBefore(el,parent.firstChild);
 }
 if(!document.getElementById('hlgbPlannerPrint9583')){
  const style=document.createElement('style');style.id='hlgbPlannerPrint9583';
  style.textContent='@media print { body *{visibility:hidden!important} #hlgbWeeklyPlanner9583,#hlgbWeeklyPlanner9583 *{visibility:visible!important} #hlgbWeeklyPlanner9583{position:absolute!important;left:0!important;top:0!important;width:100%!important;box-shadow:none!important;border:0!important;background:#fff!important;color:#000!important} #hlgbWeeklyPlanner9583 button,#hlgbWeeklyPlanner9583 input,#hlgbWeeklyPlanner9583 select{display:none!important} #hlgbWeeklyPlanner9583 details{display:block!important} #hlgbWeeklyPlanner9583 table{width:100%;border-collapse:collapse} #hlgbWeeklyPlanner9583 td,#hlgbWeeklyPlanner9583 th{border:1px solid #ccc;padding:5px} }';
  document.head?.appendChild(style);
 }
 const host=document.getElementById('hlgbWeeklyPlanner9583');
 if(host.dataset.rendered!==V)render();
 bind();
 return true;
}
function hook(){
 const old=window.renderPurchases;
 if(typeof old==='function'&&!old.__hlgbPlanner9583){
  window.renderPurchases=function(){const r=old.apply(this,arguments);setTimeout(install,0);return r};
  window.renderPurchases.__hlgbPlanner9583=true;
 }
}
readDraft();
window.hlgbWeeklyMaterialPlanner9583={version:V,monday,weekEnd,calculate,stockFor,buyTerms,csvFor,render,install,
 state,selected:()=>state.selected.map(x=>({...x})),setSelection:next=>{state.selected=next.map(x=>({...x}));saveDraft();return render()},
 status:()=>({version:V,selected:state.selected.length,week:state.week,renderCount:state.renderCount,readonly:true,draftStored:state.draftStored})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{hook();install()},{once:true});
else{hook();install()}
[1200,4000].forEach(ms=>setTimeout(()=>{hook();install()},ms));
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(()=>{hook();install()},500));
console.info('[HLGB] v'+V+' planejamento de materiais semanal somente leitura ativo');
})();