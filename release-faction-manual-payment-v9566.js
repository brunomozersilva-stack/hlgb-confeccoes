/* HLGB v95.66 — Pagamento avulso de facções, busca real, preço da ficha,
   travetada e comprovante PDF. Plugin isolado; não altera registros existentes. */
(function(){
'use strict';
if(window.hlgbFactionManual9566)return;
const V='95.66',MAX_PDF=750*1024,STATUS={idle:'idle',saving:'saving'};
const state={status:STATUS.idle,lastError:'',lastResult:null,opened:0},sid=x=>String(x??'');
const norm=x=>sid(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const esc=x=>sid(x).replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
const number=x=>Number(sid(x).replace(',','.')),money=n=>(Number(n)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const stamp=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const dbRef=()=>{try{return typeof db!=='undefined'&&db?db:window.db||{}}catch(_){return window.db||{}}};
const arr=name=>Array.isArray(dbRef()[name])?dbRef()[name]:[];
const makeId=prefix=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
let draft=null;
function factionDirectory(){
 const map=new Map(),add=(name,id,source)=>{
  const text=sid(name).trim(),key=norm(text);
  if(!text||!key)return;
  const existing=map.get(key);
  if(!existing||source==='Cadastro')map.set(key,{name:text,id:sid(id||''),source});
 };
 arr('factionMasters').filter(x=>x?.active!==false).forEach(f=>add(f.name,f.id,'Cadastro'));
 arr('factions').forEach(f=>add(f.name||f.factionName,f.factionMasterId||'','Produção'));
 arr('factionPayments').forEach(f=>add(f.factionName,'','Histórico'));
 return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
function productDirectory(){
 return arr('products').filter(p=>p&&p.id!=null&&p.active!==false)
  .slice().sort((a,b)=>sid(a.name||'').localeCompare(sid(b.name||''),'pt-BR'));
}
function productPrice(p){
 const n=Number(p?.factionCost);
 return Number.isFinite(n)&&n>0?+n.toFixed(2):null;
}
function searchRows(items,q,formatter,limit=35){
 const terms=norm(q).split(' ').filter(Boolean);
 return items.filter(x=>terms.every(t=>norm(formatter(x)).includes(t))).slice(0,limit);
}
function searchFactions(q){return searchRows(factionDirectory(),q,x=>x.name,60)}
function searchProducts(q){return searchRows(productDirectory(),q,x=>[x.name,x.code,x.sku,x.category,x.reference].join(' '),50)}
function grandTotal(lines){return +(lines.reduce((s,r)=>s+r.quantity*r.unitPrice,0)).toFixed(2)}
function validDate(text){const s=sid(text);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00');return !Number.isNaN(d.getTime())&&d.getFullYear()===+s.slice(0,4)&&d.getMonth()===+s.slice(5,7)-1&&d.getDate()===+s.slice(8,10)}
function validate(input){
 const choices=factionDirectory(),f=choices.find(x=>norm(x.name)===norm(input.factionName));
 if(!f)throw Error('Selecione uma facção cadastrada. Para uma nova, cadastre-a em Cadastros → Facções.');
 if(!validDate(input.date))throw Error('Informe uma data válida.');
 if(!['Pago','Pendente'].includes(input.status))throw Error('Selecione o status.');
 if(!Array.isArray(input.lines)||!input.lines.length)throw Error('Adicione pelo menos um produto ou serviço.');
 const details=input.lines.map((x,i)=>{
  const qty=number(x.quantity),unit=number(x.unitPrice),kind=sid(x.kind||'product');
  if(!Number.isInteger(qty)||qty<=0||qty>1000000)throw Error('Quantidade inválida na linha '+(i+1)+'.');
  if(!Number.isFinite(unit)||unit<=0||unit>1000000)throw Error('Informe valor unitário maior que zero na linha '+(i+1)+'.');
  const p=productDirectory().find(p=>sid(p.id)===sid(x.productId));
  if(kind==='product'&&!p)throw Error('Escolha um produto cadastrado na linha '+(i+1)+'.');
  if(!['product','travetada','service'].includes(kind))throw Error('Tipo de serviço inválido.');
  const description=kind==='product'?sid(p.name):kind==='travetada'?'Travetada'+(p?' — '+sid(p.name):''):sid(x.description).trim();
  if(!description)throw Error('Descreva o serviço na linha '+(i+1)+'.');
  return {id:sid(x.id),kind,productId:p?.id??null,productName:p?.name||'',
    description:description.slice(0,220),quantity:qty,unitPrice:+unit.toFixed(2),
    value:+(qty*unit).toFixed(2),note:sid(x.note).slice(0,700),priceOrigin:sid(x.priceOrigin)};
 });
 return {factionName:f.name,factionMasterId:f.id||null,date:input.date,status:input.status,
  method:sid(input.method).trim().slice(0,120),note:sid(input.note).trim().slice(0,1500),
  lines:details,total:grandTotal(details)};
}
function pdfIsValid(file,bytes){
 const b=new Uint8Array(bytes);
 return file&&file.size>0&&file.size<=MAX_PDF&&b.length>=5&&b[0]===37&&b[1]===80&&b[2]===68&&b[3]===70&&b[4]===45;
}
function bytesToBase64(bytes){
 let text='';const a=new Uint8Array(bytes);
 for(let i=0;i<a.length;i+=16384)text+=String.fromCharCode.apply(null,a.subarray(i,i+16384));
 return btoa(text);
}
async function readReceipt(file){
 if(!file)return null;
 if(file.size>MAX_PDF)throw Error('O PDF deve ter no máximo 750 KB para não comprometer a sincronização do HLGB.');
 const buffer=await file.arrayBuffer();
 if(!pdfIsValid(file,buffer))throw Error('Selecione um PDF válido (o arquivo precisa começar com %PDF-).');
 return {name:sid(file.name||'comprovante.pdf').replace(/[\\/]/g,'_').slice(0,150),
  mime:'application/pdf',size:file.size,base64:bytesToBase64(buffer),addedAt:new Date().toISOString()};
}
function pdfDownload(receipt){
 if(!receipt?.base64)throw Error('Comprovante indisponível neste registro.');
 const binary=atob(receipt.base64),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 const blob=new Blob([bytes],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=receipt.name||'comprovante.pdf';a.style.display='none';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),15000);
}
async function assertRecordNotPending(module,id){
 const guard=window.hlgbWalIdbGuard9536;
 if(guard?.probe){
  try{await guard.probe()}catch(e){throw Error('Não foi possível conferir a fila local: '+sid(e.message||e))}
  if(guard.status?.()?.readFailed)throw Error('A fila local não pôde ser lida. Salvar bloqueado para proteger os dados.');
 }
 const identities=new Set();
 try{
  for(const x of guard?.ids?.()||[])identities.add(sid(x));
  for(const x of window.hlgbRecordPendingIdentitySet9535?.()||[])identities.add(sid(x));
 }catch(e){throw Error('Erro ao consultar pendências: '+sid(e.message||e))}
 if(identities.has(module+'::'+sid(id))||identities.has(module+'|'+sid(id)))
  throw Error('Este pagamento ainda possui alteração local pendente. Não reenvie até sincronizar.');
}
async function saveRecord(module,record){
 if(!record?.id)throw Error('Lançamento sem ID.');
 const before=arr(module).find(x=>sid(x?.id)===sid(record.id));
 if(before&&module==='factionPayments'&&before.manualGroupId!==record.manualGroupId)
  throw Error('Existe outro registro com a mesma identificação. Gravação bloqueada.');
 await assertRecordNotPending(module,record.id);
 const save=window.hlgbRecordSaveWithRetry;
 if(typeof save!=='function')throw Error('Gravação confirmada na nuvem indisponível.');
 if(typeof window.cloudEnsureFreshSession==='function')await window.cloudEnsureFreshSession(false);
 const out=await save(module,sid(record.id),JSON.parse(JSON.stringify(record)),false);
 if(!out||out.applied!==true)throw Error(out?.reason||'A nuvem não confirmou a gravação.');
 const next=out.data||record,collection=arr(module),i=collection.findIndex(x=>sid(x?.id)===sid(record.id));
 if(i>=0)collection[i]=next;else collection.push(next);
 try{window.localSaveOnly?.()}catch(_){}
 return next;
}
function hubId(groupId){
 let n=0;for(const ch of sid(groupId))n=(n*31+ch.charCodeAt(0))%9999999999999;
 return 300000000000000+n;
}
async function persistDraft(input,receipt){
 if(state.status===STATUS.saving)throw Error('Salvamento em andamento.');
 state.status=STATUS.saving;state.lastError='';state.lastResult=null;
 let saved=0;
 try{
  const parsed=validate(input),date=parsed.date,paid=parsed.status==='Pago',
   id=draft?.groupId||makeId('faction-manual'),ts=new Date().toISOString();
  if(!draft)draft={groupId:id,createdAt:ts,receipt:null};
  if(receipt)draft.receipt=receipt;
  for(let i=0;i<parsed.lines.length;i++){
   const row=parsed.lines[i],existing=arr('factionPayments').find(x=>sid(x.id)===sid(row.id));
   const obj={...existing,id:row.id,source:'faction_manual_payment_v1',manual:true,
    manualGroupId:id,manualKindV9566:row.kind,factionMasterId:parsed.factionMasterId,
    status:parsed.status,factionName:parsed.factionName,productId:row.productId,
    description:row.description,quantity:row.quantity,unitPrice:row.unitPrice,
    value:row.value,paidAmount:paid?row.value:0,paymentDate:paid?date:'',
    scheduledPaymentDate:date,paymentMethod:parsed.method,
    paymentHistory:existing?.paymentHistory||[],discountAmount:0,
    observation:(row.note||parsed.note||'Pagamento avulso de facção'),manualLineNoteV9566:row.note,
    priceOriginV9566:row.priceOrigin,updatedAt:ts,createdAt:existing?.createdAt||draft.createdAt};
   if(i===0&&draft.receipt)obj.receiptPdfV9566=draft.receipt;
   else delete obj.receiptPdfV9566;
   await saveRecord('factionPayments',obj);saved++;
  }
  // One financial entry for a paid group, with a stable ID across retries.
  if(paid&&date>='2026-10-05'){
   const hub={id:hubId(id),flow:'Saída',
    description:'Pagamento avulso de facção — '+parsed.factionName,
    value:parsed.total,date,category:'Facções',subcategory:'Pagamento avulso',
    person:parsed.factionName,status:'Realizado',acceptedMethods:parsed.method?[parsed.method]:[],
    paymentMethod:parsed.method,realizedAt:date,
    note:(parsed.note?parsed.note+' · ':'')+parsed.lines.map(x=>x.description+' '+x.quantity+'x').join(', '),
    sourceType:'faction_manual_payment',sourceId:id,createdAt:draft.createdAt,updatedAt:ts};
   const previous=arr('hubFinanceEntries').find(x=>sid(x?.id)===sid(hub.id));
   if(previous&&sid(previous.sourceId)!==id)throw Error('Conflito de identificação do financeiro; registro anterior preservado.');
   await saveRecord('hubFinanceEntries',hub);
  }
  state.lastResult={groupId:id,total:parsed.total,lines:saved,paid,receipt:!!draft.receipt};
  return state.lastResult;
 }catch(e){state.lastError=(saved?'Foram confirmadas '+saved+' linha(s). Reabra o salvamento neste formulário para concluir sem duplicar. ':'')+sid(e?.message||e);throw Error(state.lastError)}
 finally{state.status=STATUS.idle}
}
function rowHtml(kind='product',id=makeId('fmpli')){
 const prod=kind==='product',trav=kind==='travetada',label=trav?'Travetada':prod?'Produto':'Serviço extra';
 return '<div class="fm66-line panel" data-id="'+esc(id)+'" data-kind="'+esc(kind)+'" style="margin:10px 0;padding:12px;border:1px solid #e2d4de">'+
  '<div style="display:flex;justify-content:space-between;align-items:center"><b>'+label+'</b><button type="button" class="secondary fm66-remove">Remover</button></div>'+
  '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin:10px 0">'+
  '<div class="field" style="grid-column:span 2"><label>'+(prod?'Buscar produto (nome, código ou SKU)':'Vincular produto (opcional)')+'</label>'+
   '<input class="fm66-search" autocomplete="off" placeholder="Digite para localizar um modelo" aria-label="Pesquisar produto" aria-autocomplete="list" role="combobox">'+
   '<input class="fm66-product-id" type="hidden"><div class="fm66-suggestions" role="listbox" style="display:none;max-height:195px;overflow:auto;border:1px solid #ddd;border-radius:7px;background:#fff"></div>'+
   '<div class="fm66-hint sub">'+(prod?'Selecione um produto da lista.':'Pode registrar o serviço mesmo sem vincular um modelo.')+'</div></div>'+
  (kind==='service'?'<div class="field"><label>Descrição do serviço</label><input class="fm66-desc" maxlength="220" placeholder="Retrabalho, extra..."></div>':'')+
  '<div class="field"><label>Qtd.</label><input type="number" min="1" step="1" class="fm66-qty" value="1"></div>'+
  '<div class="field"><label>Valor unit. (R$)</label><input type="number" min="0.01" step="0.01" class="fm66-unit" placeholder="Informe o valor"></div>'+
  '<div class="field"><label>Total</label><input class="fm66-total" value="R$ 0,00" disabled></div></div>'+
  '<div class="field"><label>Observação desta linha (opcional)</label><input class="fm66-line-note" maxlength="700" placeholder="Ex.: travetada de 300 peças"></div>'+
  '</div>';
}
function renderProductsFor(row,query){
 const host=row.querySelector('.fm66-suggestions'),rs=searchProducts(query);
 if(!host)return;
 host.style.display='block';
 host.innerHTML=rs.map(p=>'<button type="button" class="fm66-product-option" data-product-id="'+esc(p.id)+
  '" role="option" style="display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #eee;padding:8px;background:#fff;cursor:pointer">'+
  '<b>'+esc(p.name||'Produto')+'</b> <small>'+esc(p.code||p.sku||p.category||'')+'</small>'+
  '<span class="sub" style="display:block">'+(productPrice(p)!=null?'Facção cadastrada: '+money(productPrice(p)):'Sem preço de facção cadastrado')+'</span></button>').join('')+
  (!rs.length?'<div class="sub" style="padding:8px">Nenhum produto cadastrado encontrado para esta busca.</div>':'');
}
function lineFromDom(row){
 const id=row.dataset.id,kind=row.dataset.kind,productId=row.querySelector('.fm66-product-id')?.value||'',
  quantity=row.querySelector('.fm66-qty')?.value,
  unitPrice=row.querySelector('.fm66-unit')?.value;
 return {id,kind,productId,quantity,unitPrice,description:row.querySelector('.fm66-desc')?.value||'',
  note:row.querySelector('.fm66-line-note')?.value||'',priceOrigin:row.dataset.priceOrigin||''};
}
function recalc(){
 const root=document.getElementById('fm66-root');if(!root)return;
 let total=0;
 root.querySelectorAll('.fm66-line').forEach(row=>{
  const x=lineFromDom(row),qty=number(x.quantity),unit=number(x.unitPrice),sum=Number.isFinite(qty)&&Number.isFinite(unit)&&qty>0&&unit>=0?qty*unit:0;
  total+=sum;row.querySelector('.fm66-total').value=money(sum);
 });
 root.querySelector('#fm66-grand').textContent=money(total);
}
function addLine(kind='product'){
 const host=document.getElementById('fm66-lines');if(!host)return;
 host.insertAdjacentHTML('beforeend',rowHtml(kind));
 const row=host.lastElementChild;
 row.querySelector('.fm66-search').addEventListener('focus',()=>renderProductsFor(row,row.querySelector('.fm66-search').value));
 row.querySelector('.fm66-search').addEventListener('input',e=>{
  row.querySelector('.fm66-product-id').value='';
  row.querySelector('.fm66-hint').textContent='Selecione o produto listado para associar o valor de facção.';
  renderProductsFor(row,e.target.value);
 });
 row.querySelector('.fm66-suggestions').addEventListener('click',e=>{
  const option=e.target.closest('button[data-product-id]');if(!option)return;
  const p=productDirectory().find(x=>sid(x.id)===sid(option.dataset.productId));if(!p)return;
  row.querySelector('.fm66-product-id').value=sid(p.id);
  row.querySelector('.fm66-search').value=p.name||'';
  row.querySelector('.fm66-suggestions').style.display='none';
  const price=productPrice(p),unit=row.querySelector('.fm66-unit');
  row.dataset.priceOrigin=price!=null?'ficha-tecnica':'manual';
  if(price!=null){unit.value=price.toFixed(2);row.querySelector('.fm66-hint').textContent='Valor da facção preenchido pela ficha. Você pode alterá-lo.'}
  else{unit.value='';row.querySelector('.fm66-hint').textContent='Sem valor de facção cadastrado. Informe manualmente abaixo.'}
  recalc();
 });
 row.querySelector('.fm66-remove').addEventListener('click',()=>{row.remove();recalc()});
 row.querySelectorAll('.fm66-qty,.fm66-unit').forEach(inp=>inp.addEventListener('input',()=>{
  if(inp.classList.contains('fm66-unit'))row.dataset.priceOrigin='manual';
  recalc();
 }));
 recalc();
}
function renderFactionList(q){
 const host=document.getElementById('fm66-faction-suggestions');if(!host)return;
 const rows=searchFactions(q);
 host.style.display='block';
 host.innerHTML=rows.map(f=>'<button type="button" role="option" class="fm66-faction-option" data-faction="'+esc(f.name)+
  '" style="display:block;width:100%;text-align:left;background:white;border:0;border-bottom:1px solid #eee;padding:9px;cursor:pointer">'+
  '<b>'+esc(f.name)+'</b> <small>'+esc(f.source)+'</small></button>').join('')+
  (!rows.length?'<div class="sub" style="padding:8px">Nenhuma facção encontrada. Cadastre em Cadastros → Facções.</div>':'');
}
function formData(){
 const root=document.getElementById('fm66-root');if(!root)throw Error('Formulário não carregado.');
 const get=id=>root.querySelector('#'+id)?.value||'';
 return {factionName:get('fm66-faction'),date:get('fm66-date'),status:get('fm66-status'),
  method:get('fm66-method'),note:get('fm66-note'),lines:[...root.querySelectorAll('.fm66-line')].map(lineFromDom)};
}
function receiptSummary(){
 const host=document.getElementById('fm66-pdf-summary'),file=document.getElementById('fm66-pdf')?.files?.[0];if(!host)return;
 host.textContent=file?'Selecionado: '+file.name+' ('+Math.ceil(file.size/1024)+' KB). Será armazenado com o pagamento.':'PDF opcional, até 750 KB. Não altera o status automaticamente.';
}
function modalHtml(){
 const today=stamp();
 return '<div id="fm66-root" style="max-width:100%;overflow-x:hidden">'+
  '<div class="sub">Escolha uma facção do cadastro e selecione os produtos pelo nome/código. Cada valor sugerido pode ser editado.</div>'+
  '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:12px">'+
  '<div class="field"><label>Facção</label><input id="fm66-faction" role="combobox" aria-label="Buscar facção" autocomplete="off" aria-autocomplete="list" placeholder="Digite o nome da facção">'+
  '<div id="fm66-faction-suggestions" role="listbox" style="display:none;max-height:180px;overflow-y:auto;border:1px solid #ddd;border-radius:7px;background:white"></div></div>'+
  '<div class="field"><label>Data</label><input type="date" id="fm66-date" value="'+today+'"></div>'+
  '<div class="field"><label>Status</label><select id="fm66-status"><option>Pendente</option><option>Pago</option></select></div>'+
  '<div class="field"><label>Forma de pagamento</label><input id="fm66-method" placeholder="Pix, dinheiro, transferência"></div></div>'+
  '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin:16px 0 6px"><b>Produtos / serviços</b>'+
  '<div class="toolbar" style="display:flex;flex-wrap:wrap;gap:6px"><button class="secondary" id="fm66-add-product" type="button">+ Produto</button>'+
  '<button class="secondary" id="fm66-add-traveta" type="button">+ Travetada</button>'+
  '<button class="secondary" id="fm66-add-service" type="button">+ Outro serviço</button></div></div>'+
  '<div id="fm66-lines"></div>'+
  '<div class="field" style="margin-top:12px"><label>Observação geral</label><textarea id="fm66-note" rows="2" maxlength="1500" placeholder="Ex.: serviço extra ou acerto combinado"></textarea></div>'+
  '<div class="panel" style="margin-top:12px;padding:10px"><label for="fm66-pdf"><b>📎 Comprovante de pagamento (PDF)</b></label>'+
  '<input id="fm66-pdf" type="file" accept=".pdf,application/pdf">'+
  '<div id="fm66-pdf-summary" class="sub">PDF opcional, até 750 KB. Salvo com o lançamento e disponível depois para baixar.</div></div>'+
  '<div style="margin:12px 0;font-size:18px;font-weight:700">Total: <span id="fm66-grand">R$ 0,00</span></div>'+
  '<div id="fm66-feedback" role="status" class="sub"></div><button type="button" class="primary modalSave">☁️ Salvar pagamento avulso</button></div>';
}
function openForm(){
 if(typeof window.openModal!=='function'&&typeof openModal!=='function')return false;
 draft={groupId:makeId('faction-manual'),createdAt:new Date().toISOString(),receipt:null};state.opened++;
 const open=window.openModal||openModal;
 open('Pagamento avulso de facção',modalHtml(),async()=>{
  const btn=document.querySelector('#fm66-root .modalSave'),feedback=document.getElementById('fm66-feedback');
  if(btn){btn.disabled=true;btn.textContent='☁️ Salvando…'}
  if(feedback)feedback.textContent='Confirmando os registros na nuvem...';
  try{
   const input=formData(),file=document.getElementById('fm66-pdf')?.files?.[0],receipt=await readReceipt(file);
   await persistDraft(input,receipt);
   if(typeof window.closeModal==='function')window.closeModal();else if(typeof closeModal==='function')closeModal();
   try{window.renderFactionPayments?.()}catch(_){}
   try{window.renderHubFinance?.()}catch(_){}
   renderReceipts();
   return true;
  }catch(e){
   if(feedback)feedback.textContent='⚠ '+sid(e.message||e);
   if(btn){btn.disabled=false;btn.textContent='☁️ Salvar pagamento avulso'}
   return false;
  }
 });
 const faction=document.getElementById('fm66-faction');
 if(faction){
  faction.addEventListener('focus',()=>renderFactionList(faction.value));
  faction.addEventListener('input',()=>renderFactionList(faction.value));
  document.getElementById('fm66-faction-suggestions')?.addEventListener('click',e=>{
   const b=e.target.closest('button[data-faction]');if(!b)return;faction.value=b.dataset.faction;
   document.getElementById('fm66-faction-suggestions').style.display='none';
  });
 }
 document.getElementById('fm66-add-product')?.addEventListener('click',()=>addLine('product'));
 document.getElementById('fm66-add-traveta')?.addEventListener('click',()=>addLine('travetada'));
 document.getElementById('fm66-add-service')?.addEventListener('click',()=>addLine('service'));
 document.getElementById('fm66-pdf')?.addEventListener('change',receiptSummary);
 addLine('product');
 return true;
}
function receiptGroups(){
 const groups=new Map();
 for(const r of arr('factionPayments')){
  if(!r?.manualGroupId||!r?.manual)continue;
  const id=sid(r.manualGroupId),cur=groups.get(id)||{id,factionName:r.factionName,date:r.paymentDate||r.scheduledPaymentDate,
   status:r.status,receipt:null,total:0,items:0};
  cur.total+=Number(r.value)||0;cur.items++;
  if(r.receiptPdfV9566?.base64)cur.receipt=r.receiptPdfV9566;
  groups.set(id,cur);
 }
 return [...groups.values()].sort((a,b)=>sid(b.date).localeCompare(sid(a.date)));
}
function renderReceipts(){
 const anchor=document.getElementById('factionPaymentTable');
 if(!anchor)return false;
 let host=document.getElementById('fm66-receipts');
 if(!host){host=document.createElement('div');host.id='fm66-receipts';host.className='panel';
  host.style.cssText='margin-top:14px;padding:12px';anchor.insertAdjacentElement('afterend',host);}
 const groups=receiptGroups(),attached=groups.filter(x=>x.receipt);
 host.innerHTML='<h3 style="margin-top:0">📎 Comprovantes de pagamentos avulsos</h3>'+
  '<div class="sub">Os PDFs ficam vinculados ao lançamento e podem ser baixados novamente. Sem comprovante anexado não significa pagamento pendente.</div>'+
  (attached.length?'<div style="overflow:auto"><table><thead><tr><th>Facção</th><th>Data</th><th>Valor</th><th>Comprovante</th></tr></thead><tbody>'+
   attached.map(g=>'<tr><td>'+esc(g.factionName)+'</td><td>'+esc(g.date)+'</td><td>'+money(g.total)+'</td><td>'+
    '<button type="button" class="secondary fm66-download" data-group-id="'+esc(g.id)+'">'+esc(g.receipt.name)+'</button></td></tr>').join('')+'</tbody></table></div>':
   '<div class="empty">Nenhum PDF de pagamento avulso anexado ainda.</div>');
 host.querySelectorAll('.fm66-download').forEach(b=>b.addEventListener('click',()=>{
  const group=receiptGroups().find(x=>x.id===b.dataset.groupId);
  if(group?.receipt)pdfDownload(group.receipt);
 }));
 return true;
}
function hasWrapper(fn){let f=fn;const seen=new Set();while(typeof f==='function'&&!seen.has(f)){
 if(f.__fm66Wrapped)return true;seen.add(f);f=f.__original;
 }return false}
function install(){
 window.openHlgbFactionManualPayment=openForm;
 const old=window.renderFactionPayments;
 if(typeof old==='function'&&!hasWrapper(old)){
  const wrap=function(){const r=old.apply(this,arguments);setTimeout(renderReceipts,0);return r};
  wrap.__fm66Wrapped=true;wrap.__original=old;window.renderFactionPayments=wrap;
 }
 renderReceipts();
}
document.addEventListener('click',e=>{
 const button=e.target?.closest?.('#hlgbFactionManualPaymentBtn');if(!button)return;
 e.preventDefault();e.stopImmediatePropagation();openForm();
},true);
window.hlgbFactionManual9566={version:V,openForm,searchFactions,searchProducts,factionDirectory,productDirectory,
 productPrice,validate,grandTotal,readReceipt,pdfIsValid,persistDraft,receiptGroups,renderReceipts,download:pdfDownload,install,
 status:()=>({...state}),maxPdfBytes:MAX_PDF};
install();
[500,1700,3800].forEach(ms=>setTimeout(install,ms));
try{window.hlgbAfterLogin?.(()=>setTimeout(install,500),0)}catch(_){}
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(install,500));
console.info('[HLGB] v'+V+' pagamento avulso facções com cadastro, busca, travetada e PDF');
})();