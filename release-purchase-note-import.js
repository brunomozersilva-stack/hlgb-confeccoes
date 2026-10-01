/* HLGB — importar nota de compra por foto/PDF/Excel e cadastrar materiais no fornecedor */
(function(){
'use strict';
const V='2026.10.01-purchase-note-import-v1';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function supplierByText(text){
 const n=norm(text);return arr('suppliers').filter(s=>s?.name&&n.includes(norm(s.name))).sort((a,b)=>String(b.name).length-String(a.name).length)[0]||null;
}
function parseDate(text,label){
 const re=label?new RegExp(label+'[^0-9]{0,12}(\\d{1,2})[\\/.-](\\d{1,2})[\\/.-](\\d{2,4})','i'):/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/;
 const m=String(text||'').match(re);if(!m)return '';let y=String(m[3]);if(y.length===2)y='20'+y;return y+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');
}
function parseNumber(v){const s=String(v??'').replace(/R\$|\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');return q(s)}
function parseItems(text){
 const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean),out=[];
 for(const line of lines){
  const cells=line.split(/\t|;|\|/).map(x=>x.trim()).filter(Boolean);
  if(cells.length>=3){
   const nums=cells.map(parseNumber),numericIdx=cells.map((x,i)=>/[0-9]/.test(x)?i:-1).filter(i=>i>=0);
   if(numericIdx.length>=2){
    const desc=cells.slice(0,numericIdx[0]).join(' ').trim()||cells[0],qty=parseNumber(cells[numericIdx[0]]),price=parseNumber(cells[numericIdx[numericIdx.length-1]]);
    const unit=cells.find(x=>/^(kg|quilo|m|metro|un|unidade|rolo|pct|pacote)$/i.test(x))||'UN';
    if(desc&&qty>0&&price>=0&&!/total|subtotal|vencimento|nota|fornecedor/i.test(desc))out.push({description:desc,qty,unit,price});
   }
   continue;
  }
  const m=line.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(kg|quilo|m|metro|un|unidade|rolo|pct|pacote)?\s+(?:R\$\s*)?(\d+(?:[.,]\d+)?)$/i);
  if(m&&!/total|subtotal/i.test(m[1]))out.push({description:m[1].trim(),qty:parseNumber(m[2]),unit:m[3]||'UN',price:parseNumber(m[4])});
 }
 const seen=new Set();return out.filter(x=>{const k=norm(x.description)+'|'+x.qty+'|'+x.price;if(seen.has(k))return false;seen.add(k);return true});
}
function draft(text){
 const supplier=supplierByText(text),items=parseItems(text);
 const note=(String(text||'').match(/(?:nota|nf|nº|numero|número)[^0-9]{0,10}([0-9]{2,20})/i)||[])[1]||'';
 return {supplierId:supplier?.id||'',supplierName:supplier?.name||'',number:note,date:parseDate(text,'(?:data|emissao|emissão)')||parseDate(text),due:parseDate(text,'(?:vencimento|vence)'),items,sourceText:String(text||'')};
}
async function loadScript(src,name){if(window[name])return window[name];await new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('Não foi possível carregar o leitor do arquivo.'));document.head.appendChild(s)});return window[name]}
async function readFile(file){
 const name=(file?.name||'').toLowerCase(),type=file?.type||'';
 if(type.startsWith('image/')){const T=await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js','Tesseract');const r=await T.recognize(file,'por');return r?.data?.text||''}
 if(name.endsWith('.pdf')||type==='application/pdf'){const P=await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','pdfjsLib');P.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';const pdf=await P.getDocument({data:await file.arrayBuffer()}).promise;let t='';for(let i=1;i<=pdf.numPages;i++){const pg=await pdf.getPage(i),ct=await pg.getTextContent();t+=ct.items.map(x=>x.str).join('\t')+'\n'}return t}
 if(/\.xlsx?$/.test(name)){const X=await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','XLSX'),wb=X.read(await file.arrayBuffer(),{type:'array'});return wb.SheetNames.map(n=>X.utils.sheet_to_csv(wb.Sheets[n],{FS:'\t'})).join('\n')}
 return await file.text();
}
function previewHtml(d){
 const rows=d.items.map((x,i)=>'<tr><td><input class="hlgbImpBuyDesc" data-i="'+i+'" value="'+escSafe(x.description)+'"></td><td><input class="hlgbImpBuyQty" data-i="'+i+'" type="number" min="0" step=".001" value="'+q(x.qty)+'"></td><td><input class="hlgbImpBuyUnit" data-i="'+i+'" value="'+escSafe(x.unit||'UN')+'"></td><td><input class="hlgbImpBuyPrice" data-i="'+i+'" type="number" min="0" step=".0001" value="'+q(x.price)+'"></td></tr>').join('');
 return '<div class="grid"><div class="field"><label>Fornecedor reconhecido</label><select id="hlgbImpBuySupplier"><option value="">Selecione</option>'+arr('suppliers').map(s=>'<option value="'+escSafe(s.id)+'" '+(sid(s.id)===sid(d.supplierId)?'selected':'')+'>'+escSafe(s.name)+'</option>').join('')+'</select></div><div class="field"><label>Número da nota</label><input id="hlgbImpBuyNumber" value="'+escSafe(d.number||'')+'"></div><div class="field"><label>Data</label><input id="hlgbImpBuyDate" type="date" value="'+escSafe(d.date||'')+'"></div><div class="field"><label>Vencimento</label><input id="hlgbImpBuyDue" type="date" value="'+escSafe(d.due||'')+'"></div></div><div style="overflow:auto"><table><thead><tr><th>Descrição</th><th>Qtd.</th><th>Unidade</th><th>Preço unit.</th></tr></thead><tbody>'+rows+'</tbody></table></div><div class="sub">Itens novos serão cadastrados nesse fornecedor quando você confirmar a importação.</div><button type="button" class="primary" onclick="hlgbPurchaseImportApply()">✅ Conferi — preencher nota oficial</button>';
}
async function analyze(){
 const f=document.getElementById('hlgbPurchaseImportFile')?.files?.[0],ta=document.getElementById('hlgbPurchaseImportText'),status=document.getElementById('hlgbPurchaseImportStatus');let text=ta?.value||'';
 try{if(f){if(status)status.textContent='Lendo arquivo…';text=(text?'\n':'')+await readFile(f)}if(ta)ta.value=text;const d=draft(text);window.__hlgbPurchaseImportDraft=d;document.getElementById('hlgbPurchaseImportPreview').innerHTML=previewHtml(d);if(status)status.textContent=d.items.length?'':'Não consegui identificar itens automaticamente; revise o texto/arquivo.'}catch(e){if(status)status.textContent=String(e?.message||e)}
}
function openImporter(){
 openModal('📥 Importar nota de compra','<div class="sub">Envie foto, PDF, Excel, CSV/TXT ou cole o conteúdo da nota. O sistema monta uma prévia e só depois preenche o lançamento oficial.</div><div class="field"><label>Arquivo</label><input id="hlgbPurchaseImportFile" type="file" accept="image/*,.pdf,.xlsx,.xls,.csv,.txt"></div><div class="field"><label>Texto extraído / colado</label><textarea id="hlgbPurchaseImportText" rows="7"></textarea></div><div id="hlgbPurchaseImportStatus" class="sub"></div><button type="button" class="secondary" onclick="hlgbPurchaseImportAnalyze()">🔎 Ler nota</button><div id="hlgbPurchaseImportPreview" style="margin-top:10px"></div><button type="button" class="secondary modalSave">Fechar</button>',()=>closeModal());
}
async function ensureSupplierProducts(s,items){
 s.products=Array.isArray(s.products)?s.products:[];
 let changed=false;
 for(const it of items){let p=s.products.find(x=>norm(x.name)===norm(it.description));if(!p){s.products.push({name:it.description,unit:it.unit||'UN',price:q(it.price),createdFromPurchaseImport:true,createdAt:new Date().toISOString()});changed=true}else{if(!p.unit&&it.unit)p.unit=it.unit;if(q(it.price)>0&&q(p.price)!==q(it.price)){p.price=q(it.price);changed=true}}}
 if(changed&&typeof hlgbRecordSaveWithRetry==='function'){const out=await hlgbRecordSaveWithRetry('suppliers',sid(s.id),{...s,updatedAt:new Date().toISOString()},false);if(!out?.applied)throw new Error('Não consegui cadastrar os itens no fornecedor.');Object.assign(s,out.data||s)}
}
async function apply(){
 const d=window.__hlgbPurchaseImportDraft;if(!d)return;
 const supplierId=document.getElementById('hlgbImpBuySupplier')?.value||'',s=arr('suppliers').find(x=>sid(x.id)===sid(supplierId));if(!s)return alert('Selecione o fornecedor.');
 const items=[...document.querySelectorAll('.hlgbImpBuyDesc')].map((e,i)=>({description:e.value.trim(),qty:q(document.querySelector('.hlgbImpBuyQty[data-i="'+i+'"]')?.value),unit:document.querySelector('.hlgbImpBuyUnit[data-i="'+i+'"]')?.value||'UN',price:q(document.querySelector('.hlgbImpBuyPrice[data-i="'+i+'"]')?.value)})).filter(x=>x.description&&x.qty>0);
 if(!items.length)return alert('Nenhum item válido para importar.');
 try{await ensureSupplierProducts(s,items)}catch(e){return alert(String(e?.message||e))}
 closeModal();
 if(typeof newPurchase!=='function')return alert('Tela oficial de nota de compra indisponível.');
 newPurchase();setTimeout(()=>{
  const sup=document.getElementById('purchaseSupplier');if(sup){sup.value=sid(s.id);sup.dispatchEvent(new Event('change',{bubbles:true}))}
  const num=document.getElementById('purchaseNumber');if(num)num.value=document.getElementById('hlgbImpBuyNumber')?.value||d.number||'';
  const date=document.getElementById('purchaseDate');if(date)date.value=d.date||date.value;
  const due=document.getElementById('purchaseDue');if(due)due.value=d.due||due.value;
  const body=document.getElementById('purchaseItemsBody');if(body){body.innerHTML='';items.forEach((it,i)=>{addPurchaseItemRow?.();const row=body.querySelectorAll('.purchaseItemRow')[i];if(!row)return;row.querySelector('.piDesc').value=it.description;row.querySelector('.piQty').value=it.qty;row.querySelector('.piUnit').value=it.unit;row.querySelector('.piPrice').value=it.price});updatePurchaseTotal?.()}
  alert('A nota foi preenchida. Confira fornecedor, itens, valores, vencimento e os dois conferentes antes de salvar.');
 },120);
}
function decorate(){
 const modal=document.getElementById('modal');if(!modal||document.getElementById('hlgbPurchaseImportBtn'))return;
 const heading=[...modal.querySelectorAll('h1,h2')].find(x=>/Lançar nota de compra|Editar nota de compra/i.test(x.textContent||''));if(!heading)return;
 const b=document.createElement('button');b.id='hlgbPurchaseImportBtn';b.type='button';b.className='secondary';b.textContent='📥 Importar foto / arquivo';b.style.margin='8px 0';b.onclick=openImporter;heading.insertAdjacentElement('afterend',b);
}
const oldNew=window.newPurchase;if(typeof oldNew==='function'&&!oldNew.__hlgbPurchaseImportV1){const w=function(){const r=oldNew.apply(this,arguments);setTimeout(decorate,50);return r};w.__hlgbPurchaseImportV1=true;window.newPurchase=w}
window.hlgbPurchaseImportAnalyze=analyze;window.hlgbPurchaseImportApply=apply;window.hlgbPurchaseNoteImport={draft,parseItems,readFile,ensureSupplierProducts,openImporter,apply};
setTimeout(decorate,1600);
window.HLGB_PURCHASE_NOTE_IMPORT_GUARD=V;
console.info('[HLGB] importação de nota de compra por foto/arquivo ativa');
})();