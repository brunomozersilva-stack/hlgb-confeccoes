/* HLGB — importar pedidos de WhatsApp, imagem, PDF e Excel */
(function(){
'use strict';
const V='2026.10.02-assistant-order-import-v3';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function sizes(){try{return typeof hlgbSortedSizes==='function'?hlgbSortedSizes(db.sizes):(db.sizes||[])}catch(e){return ['P','M','G','GG']}}
function canWrite(){try{return typeof hlgbRecordCanWrite==='function'?!!hlgbRecordCanWrite('orders'):typeof hasAccess==='function'?!!hasAccess('pedidos'):false}catch(e){return false}}
function clientFromText(text){const n=norm(text);return arr('clients').filter(c=>c?.name&&n.includes(norm(c.name))).sort((a,b)=>String(b.name).length-String(a.name).length)[0]||null}
function productTokens(name){const generic=new Set(['camisola','camisa','calcinha','body','conjunto','short','doll','top','sutia','sutiã']);return norm(name).split(/\s+/).filter(t=>t.length>=3&&!generic.has(t))}
function productFromLine(line,current){const n=norm(line),c=arr('products').map(p=>({p,score:productTokens(p.name||'').filter(t=>n.includes(t)).length,exact:n.includes(norm(p.name||''))})).filter(x=>x.exact||x.score>0).sort((a,b)=>(b.exact-a.exact)||b.score-a.score||String(b.p.name).length-String(a.p.name).length);return c[0]?.p||current||null}
function colorAliases(c){const n=norm(c),out=[n];if(n==='preto')out.push('preta');if(n==='branco')out.push('branca');if(n==='vermelho')out.push('vermelha');if(n==='amarelo')out.push('amarela');return out}
function colorFromLine(line,current){const n=norm(line),colors=(db.colors||[]).slice().sort((a,b)=>String(b).length-String(a).length);return colors.find(c=>colorAliases(c).some(a=>n.includes(a)))||current||''}
function dateFromText(text){let m=String(text||'').match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);if(m)return m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');m=String(text||'').match(/\b(\d{4})-(\d{2})-(\d{2})\b/);return m?m[0]:''}
function reEsc(s){return String(s).replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')}
function parseMatrixTable(lines){
 const out=[];
 for(let i=0;i<lines.length;i++){
  const cells=lines[i].split(/\t|;|\|/).map(x=>x.trim());if(cells.length<3)continue;
  const upper=cells.map(x=>String(x).toUpperCase()),header=upper.map(x=>sizes().includes(x)?x:null);
  if(!header.some(Boolean))continue;
  const ns=cells.map(norm),prodIdx=ns.findIndex(x=>/produto|modelo/.test(x)),colorIdx=ns.findIndex(x=>/cor/.test(x));
  for(let j=i+1;j<lines.length;j++){
   const vals=lines[j].split(/\t|;|\|/).map(x=>x.trim());if(vals.length<3)break;
   const p=productFromLine(vals[prodIdx>=0?prodIdx:0]||lines[j],null);if(!p)continue;
   const color=colorIdx>=0?(vals[colorIdx]||''):colorFromLine(lines[j],'');
   header.forEach((sz,k)=>{if(!sz)return;const qty=q(String(vals[k]||'').replace(',','.'));if(qty>0)out.push({productId:p.id,color,size:sz,qty})});
  }
 }
 return out;
}
function sizePairs(segment,ss){
 const out=[];
 for(const sz of ss){
  const z=reEsc(sz);
  const m=segment.match(new RegExp('(?:^|[\\s,;])'+z+'\\s*[:=x-]?\\s*(\\d{1,6})(?=[\\s,;./]|$)','i'))||
          segment.match(new RegExp('(?:^|[\\s,;])(\\d{1,6})\\s*(?:x|-)?\\s*'+z+'(?=[\\s,;./]|$)','i'));
  if(m&&q(m[1])>0)out.push({size:sz,qty:q(m[1])});
 }
 return out;
}
function sequentialPairs(segment,ss){
 const clean=String(segment||'').replace(/\b\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?\b/g,' ');
 const nums=[...clean.matchAll(/(?:^|\s)(\d{1,6})(?=\s|$)/g)].map(m=>q(m[1])).filter(v=>v>0);
 if(nums.length!==ss.length)return [];
 return ss.map((size,i)=>({size,qty:nums[i]}));
}
function parseFreeText(text){
 const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean),table=parseMatrixTable(lines);if(table.length)return table;
 const out=[];let p=null,color='';const ss=sizes().map(s=>String(s).toUpperCase());
 const colors=(db.colors||[]).map(String).filter(Boolean).sort((a,b)=>b.length-a.length);
 for(const line of lines){
  p=productFromLine(line,p);if(!p)continue;
  const low=norm(line),found=colors.map(c=>{const aliases=colorAliases(c);let i=-1;for(const a of aliases){const z=low.indexOf(a);if(z>=0&&(i<0||z<i))i=z}return {c,i}}).filter(x=>x.i>=0).sort((a,b)=>a.i-b.i);
  if(found.length){
   found.forEach((x,idx)=>{
    const start=x.i,end=idx+1<found.length?found[idx+1].i:line.length,segment=line.slice(start,end);
    let pairs=sizePairs(segment,ss);if(!pairs.length)pairs=sequentialPairs(segment,ss);
    pairs.forEach(z=>out.push({productId:p.id,color:x.c,size:z.size,qty:z.qty}));
   });
   color=found[found.length-1].c;
  }else{
   color=colorFromLine(line,color);
   let pairs=sizePairs(line,ss);if(!pairs.length)pairs=sequentialPairs(line,ss);
   pairs.forEach(z=>out.push({productId:p.id,color,size:z.size,qty:z.qty}));
  }
 }
 return out;
}
function dedupeGrade(g){const m=new Map();for(const x of g){const k=sid(x.productId)+'|'+sid(x.color)+'|'+sid(x.size),a=m.get(k)||{...x,qty:0};a.qty+=q(x.qty);m.set(k,a)}return [...m.values()]}
function draftFromText(text){const client=clientFromText(text),grade=dedupeGrade(parseFreeText(text)),date=dateFromText(text),warnings=[];if(!client)warnings.push('Cliente não informado. Escolha o cliente abaixo.');if(!grade.length)warnings.push('Nenhuma quantidade de grade reconhecida.');return {clientId:client?.id||'',clientName:client?.name||'',date,grade,warnings,sourceText:String(text||'')}}
function matrixHtml(d){
 const ss=sizes(),groups={};for(const g of d.grade){const p=arr('products').find(x=>sid(x.id)===sid(g.productId)),k=sid(g.productId)+'|'+(g.color||'-');if(!groups[k])groups[k]={product:p?.name||'Produto',color:g.color||'-',qty:{}};groups[k].qty[g.size]=(groups[k].qty[g.size]||0)+q(g.qty)}
 return '<div style="overflow:auto"><table><tr><th>Produto</th><th>Cor</th>'+ss.map(s=>'<th>'+escSafe(s)+'</th>').join('')+'<th>Total</th></tr>'+Object.values(groups).map(r=>'<tr><td>'+escSafe(r.product)+'</td><td>'+escSafe(r.color)+'</td>'+ss.map(s=>'<td>'+q(r.qty[s])+'</td>').join('')+'<td><b>'+ss.reduce((a,s)=>a+q(r.qty[s]),0)+'</b></td></tr>').join('')+'</table></div>';
}
function clientSelectHtml(d){const opts=arr('clients').slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR')).map(c=>'<option value="'+escSafe(c.id)+'" '+(sid(c.id)===sid(d.clientId)?'selected':'')+'>'+escSafe(c.name||'-')+'</option>').join('');return '<div class="field" style="max-width:420px;margin:8px 0"><label>Cliente</label><select id="hlgbImportClient"><option value="">Selecione o cliente</option>'+opts+'</select></div>'}
function showDraft(d){window.__hlgbImportedOrderDraft=d;const box=document.getElementById('hlgbImportPreview');if(!box)return;const total=d.grade.reduce((a,x)=>a+q(x.qty),0);box.innerHTML='<h3>Prévia do pedido</h3>'+clientSelectHtml(d)+(d.date?'<div><b>Entrega:</b> '+escSafe(d.date)+'</div>':'')+'<div style="margin-top:10px">'+matrixHtml(d)+'</div><div class="sub"><b>Total:</b> '+total.toLocaleString('pt-BR')+' peças</div>'+(d.warnings.length?'<div class="panel" style="background:#fff3cd">'+d.warnings.map(escSafe).join('<br>')+'</div>':'')+(d.grade.length?'<button type="button" class="primary" style="margin-top:12px" onclick="hlgbImportOpenOfficialOrder()">✅ Conferi — abrir pedido oficial</button>':'')}
async function loadScript(src,globalName){if(window[globalName])return window[globalName];await new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('Não foi possível carregar o leitor de arquivo.'));document.head.appendChild(s)});return window[globalName]}
async function fileText(file){
 const name=(file?.name||'').toLowerCase(),type=file?.type||'';
 if(type.startsWith('image/')){const T=await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js','Tesseract');const box=document.getElementById('hlgbImportStatus');if(box)box.textContent='Lendo a foto…';const r=await T.recognize(file,'por');return r?.data?.text||''}
 if(name.endsWith('.pdf')||type==='application/pdf'){
  const pdfjs=await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','pdfjsLib');pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;let text='';for(let i=1;i<=pdf.numPages;i++){const pg=await pdf.getPage(i),ct=await pg.getTextContent();text+=ct.items.map(x=>x.str).join('\t')+'\n'}return text;
 }
 if(/\.xlsx?$/.test(name)){const X=await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','XLSX'),wb=X.read(await file.arrayBuffer(),{type:'array'});return wb.SheetNames.map(n=>X.utils.sheet_to_csv(wb.Sheets[n],{FS:'\t'})).join('\n')}
 return await file.text();
}
async function analyze(){const ta=document.getElementById('hlgbImportText'),file=document.getElementById('hlgbImportFile')?.files?.[0],status=document.getElementById('hlgbImportStatus');let text=ta?.value||'';try{if(file)text=(text?'\n':'')+await fileText(file);if(ta)ta.value=text;if(status)status.textContent='';showDraft(draftFromText(text))}catch(e){if(status)status.textContent=String(e?.message||e)}}
function openImporter(){openModal('📥 Importar pedido / grade','<div class="sub">Cole uma conversa do WhatsApp ou escolha uma foto, PDF, Excel, CSV ou TXT. O Assistente monta uma <b>prévia</b>; nada é lançado sem sua conferência.</div><div class="field"><label>Conversa / texto</label><textarea id="hlgbImportText" rows="9"></textarea></div><div class="field"><label>Ou importar arquivo</label><input id="hlgbImportFile" type="file" accept="image/*,.pdf,.xlsx,.xls,.csv,.txt"></div><div id="hlgbImportStatus" class="sub"></div><button type="button" class="primary" onclick="hlgbImportAnalyze()">🔎 Montar prévia</button><div id="hlgbImportPreview"></div><button type="button" class="secondary modalSave">Fechar</button>',()=>closeModal())}
function openOfficial(){
 const d=window.__hlgbImportedOrderDraft;if(!d?.grade?.length)return alert('Não há grade para lançar.');const selectedClient=document.getElementById('hlgbImportClient')?.value||d.clientId;if(!selectedClient)return alert('Escolha o cliente deste pedido.');d.clientId=selectedClient;d.clientName=arr('clients').find(c=>sid(c.id)===sid(selectedClient))?.name||d.clientName;if(!canWrite())return alert('Seu usuário não possui permissão para criar pedidos.');if(typeof newOrder!=='function')return alert('Novo pedido oficial não está disponível.');
 closeModal();newOrder();setTimeout(()=>{const client=document.getElementById('mclient');if(client&&d.clientId){client.value=sid(d.clientId);client.dispatchEvent(new Event('change',{bubbles:true}))}const date=document.getElementById('mdate');if(date&&d.date)date.value=d.date;const box=document.getElementById('orderMatrixBox');if(box&&typeof orderMatrixProductBlock==='function'){const groups={};for(const g of d.grade){const k=sid(g.productId);if(!groups[k])groups[k]=[];groups[k].push(g)}box.innerHTML=Object.entries(groups).map(([pid,grade])=>orderMatrixProductBlock({productId:+pid,grade})).join('')}try{updateOrderMatrixTotal?.()}catch(e){}alert('Prévia importada para o pedido oficial. Confira cliente, data, grade e valores antes de clicar em Salvar pedido.')},100);
}
function decorateAssistant(){const input=document.getElementById('hlgbAssistantInput');if(!input||document.getElementById('hlgbAssistantImportBtn'))return;const b=document.createElement('button');b.id='hlgbAssistantImportBtn';b.type='button';b.className='secondary';b.textContent='📥 Importar WhatsApp / arquivo';b.onclick=openImporter;(document.getElementById('hlgbAssistantVoiceControls')||input.parentElement)?.insertAdjacentElement('afterend',b)}
const oldOpen=window.openHlgbAssistant;if(typeof oldOpen==='function'&&!oldOpen.__hlgbImportV1){const w=function(){const r=oldOpen.apply(this,arguments);setTimeout(decorateAssistant,100);return r};w.__hlgbImportV1=true;window.openHlgbAssistant=w}
setTimeout(decorateAssistant,1800);
window.hlgbImportAnalyze=analyze;window.hlgbImportOpenOfficialOrder=openOfficial;window.hlgbAssistantOrderImport={draftFromText,parseFreeText,parseMatrixTable,sequentialPairs,colorFromLine,dedupeGrade,fileText,openImporter,openOfficial};window.HLGB_ASSISTANT_ORDER_IMPORT_GUARD=V;
})();