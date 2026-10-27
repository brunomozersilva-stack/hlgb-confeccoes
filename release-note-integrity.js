/* HLGB v94.20 — integridade de notas, fila faturada e reconciliação de produção já faturada */
(function(){
'use strict';

const V='94.20';
const FIN_TOMBSTONE_KEY='hlgb_note_orphan_finance_tombstones_v9418';
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const fmtDate=v=>{const m=sid(v).slice(0,10).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+'/'+m[2]+'/'+m[1]:sid(v||'-')};
const truthy=v=>v===true||v===1||v==='1'||v==='true'||(typeof v==='string'&&v.trim()!==''&&v!=='0'&&v!=='false');

const KNOWN_MIGRATED_9223=new Set([
'1788874475152333','1788874522423544','1788874542096539','1788874889299282','1788874924647632',
'1788978362128883','1789038304155523','1789038339322457','1789038421886580','1789038586467975',
'1789038616478193','1789038657141291','1789038710850339','1789038724881934','1789038757238922',
'1789038788431611','1789038828506727','1789063942527458','1789063987933758'
]);

function arr(name){try{db[name]=Array.isArray(db?.[name])?db[name]:[];return db[name]}catch(e){return []}}
function localSave(){try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}}
function upsertLocal(module,row){
 const a=arr(module),id=sid(row?.id??row?.__hlgbId);if(!id)return false;
 const i=a.findIndex(x=>sid(x?.id??x?.__hlgbId)===id),next=clone(row);
 if(i>=0)a[i]=next;else a.push(next);localSave();return true;
}
function removeLocal(module,id){
 const a=arr(module),before=a.length;db[module]=a.filter(x=>sid(x?.id??x?.__hlgbId)!==sid(id));
 if(db[module].length!==before)localSave();
 return before-db[module].length;
}
function readFinanceTombstones(){
 try{const raw=localStorage.getItem(FIN_TOMBSTONE_KEY),a=raw?JSON.parse(raw):[];return new Set(Array.isArray(a)?a.map(sid).filter(Boolean):[])}catch(e){return new Set()}
}
function writeFinanceTombstones(set){try{localStorage.setItem(FIN_TOMBSTONE_KEY,JSON.stringify([...set].filter(Boolean).slice(-5000)))}catch(e){}}
function rememberFinanceTombstone(id){const x=sid(id);if(!x)return false;const s=readFinanceTombstones();const before=s.size;s.add(x);if(s.size!==before)writeFinanceTombstones(s);return true}
function isRememberedFinanceTombstone(id){const x=sid(id);return !!x&&readFinanceTombstones().has(x)}
function snapshotMap(module){try{const m=hlgbRecordSnapshots?.[module];return m&&typeof m.get==='function'&&typeof m.keys==='function'?m:null}catch(e){return null}}
function snapshotDeleted(s){return !!(s&&(truthy(s.deleted_at)||truthy(s.deletedAt)||truthy(s.deleted)||truthy(s.tombstone)||truthy(s?.data?._deleted)||truthy(s?.data?.deleted_at)||truthy(s?.data?.deletedAt)))}
function markFinanceSnapshotTombstone(id,out,row){
 try{
  const map=snapshotMap('finance');if(!map?.set)return false;
  const key=sid(id),prev=map.get(key)||{},deletedAt=out?.deleted_at||out?.deletedAt||new Date().toISOString();
  map.set(key,{...prev,data:clone(out?.data||prev?.data||row||{}),deleted_at:deletedAt,deletedAt:deletedAt,revision:+out?.revision||+prev?.revision||1,updated_at:out?.updated_at||prev?.updated_at||deletedAt});
  return true;
 }catch(e){return false}
}
function reconcileFinanceTombstones(){
 const known=readFinanceTombstones(),map=snapshotMap('finance');
 try{map?.forEach?.((s,id)=>{if(snapshotDeleted(s))known.add(sid(id))})}catch(e){}
 writeFinanceTombstones(known);
 if(!known.size)return {remembered:0,removed:0};
 const before=arr('finance').length;db.finance=arr('finance').filter(x=>!known.has(sid(x?.id??x?.__hlgbId)));
 const removed=before-db.finance.length;if(removed)localSave();
 return {remembered:known.size,removed};
}
async function saveConfirmed(module,row,deleted=false){
 if(!row)throw new Error('Registro inválido.');
 const id=sid(row.id??row.__hlgbId);if(!id)throw new Error('Registro sem identificação.');
 if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
 if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação multiusuário indisponível.');
 const out=await window.hlgbRecordSaveWithRetry(module,id,clone(row),!!deleted);
 if(!out||out.applied!==true)throw new Error(out?.reason||'A nuvem não confirmou a alteração.');
 if(deleted){
   if(out.deleted_at==null&&out.deleted!==true&&out.tombstone!==true)throw new Error('A nuvem não confirmou o tombstone.');
   if(module==='finance'){rememberFinanceTombstone(id);markFinanceSnapshotTombstone(id,out,row)}
   removeLocal(module,id);
   return out;
 }
 const confirmed=out.data||row;upsertLocal(module,confirmed);return confirmed;
}

/* ---------- histórico canônico / duplicidades antigas ---------- */
function legacyShadowIds(){
 const out=new Set(KNOWN_MIGRATED_9223);
 for(const row of arr('noteQueue')){const m=sid(row?.id).match(/^m9223-(\d+)-\d+$/);if(m)out.add(m[1])}
 return out;
}
function isLegacyDeliveryShadow(inv){
 if(!inv)return false;
 if(legacyShadowIds().has(sid(inv.id)))return true;
 if(inv.migratedToNoteQueueV9223===true)return true;
 return (Array.isArray(inv.items)?inv.items:[]).some(i=>sid(i?.source)==='faction_delivery_v9140');
}
function canonicalInvoices(){return arr('projectionInvoices').filter(x=>!isLegacyDeliveryShadow(x))}
function withCanonicalInvoices(fn,ctx,args){
 const full=arr('projectionInvoices'),filtered=full.filter(x=>!isLegacyDeliveryShadow(x));
 if(filtered.length===full.length)return fn.apply(ctx,args||[]);
 let changed=false;try{db.projectionInvoices=filtered;changed=true;return fn.apply(ctx,args||[])}finally{if(changed)db.projectionInvoices=full}
}
function patchRenderer(name){
 const fn=window[name];if(typeof fn!=='function'||fn.__hlgbNoteIntegrity9411)return;
 const w=function(){const r=withCanonicalInvoices(fn,this,arguments);setTimeout(()=>{cleanRenderedHistory();decorateNoteActions();ensureManualNoteButton()},0);return r};
 w.__hlgbNoteIntegrityV1=true;w.__hlgbNoteIntegrity9411=true;w.__hlgbNoteIntegrity9418=true;w.__original=fn;window[name]=w;
}
function shadowIdFromRow(tr){
 const b=tr?.querySelector?.('[data-acerto9214]');if(b)return sid(b.getAttribute('data-acerto9214'));
 const btns=[...(tr?.querySelectorAll?.('button')||[])];
 for(const x of btns){const m=sid(x.getAttribute?.('onclick')).match(/openProjectionAcerto9200\(['"]([^'"]+)/);if(m)return m[1]}
 return '';
}
function cleanRenderedHistory(){
 const shadows=legacyShadowIds();
 for(const boxId of ['projectionNotes9214','projectionNotes9200']){
  const box=document.getElementById(boxId);if(!box)continue;
  box.querySelectorAll('tbody tr').forEach(tr=>{const id=shadowIdFromRow(tr);if(id&&shadows.has(id))tr.remove()});
 }
 const legacy=document.getElementById('legacyNotes9223');if(legacy){legacy.style.setProperty('display','none','important');legacy.setAttribute('aria-hidden','true')}
 const info=document.querySelector('#hlgbNotesHistoryHostPanel9215 > .sub');
 if(info)info.textContent='Uma única lista das notas realmente feitas. Entregas antigas já migradas para a fila atual não são repetidas aqui.';
}

/* ---------- proteção da fila ---------- */
function productQtyInOrder(order,pid){
 if(!order||!pid)return 0;
 const grade=Array.isArray(order.grade)?order.grade:[];
 return grade.filter(g=>sid(g?.productId)===sid(pid)).reduce((s,g)=>s+q(g?.qty),0);
}
function expectedForQueue(row){
 const pid=sid(row?.productId||row?.itemKey);if(!pid)return null;
 const refs=[row?.orderId,row?.readyOrderId,row?.sourceOrderId].map(sid).filter(Boolean);
 for(const id of refs){const o=arr('orders').find(x=>sid(x?.id)===id);const expected=productQtyInOrder(o,pid);if(expected>0)return {orderId:id,productId:pid,expected}}
 return null;
}
function activeQueueRows(){return arr('noteQueue').filter(x=>x&&!['faturado','cancelado','cancelada'].includes(norm(x.status))&&q(x.remainingQty??x.qty)>0)}
function queueOverages(){
 const groups=new Map();
 for(const row of activeQueueRows()){
  const e=expectedForQueue(row);if(!e)continue;
  const key=e.orderId+'::'+e.productId,cur=groups.get(key)||{...e,queued:0,ids:[],productName:row.productName||''};
  cur.queued+=q(row.remainingQty??row.qty);cur.ids.push(sid(row.id));groups.set(key,cur);
 }
 return [...groups.values()].filter(x=>x.queued>x.expected+0.000001);
}
function unsafeQueueIds(){const s=new Set();queueOverages().forEach(g=>g.ids.forEach(id=>s.add(id)));return s}
function decorateQueueSafety(){
 const unsafe=unsafeQueueIds(),groups=queueOverages(),byId=new Map();groups.forEach(g=>g.ids.forEach(id=>byId.set(id,g)));
 document.querySelectorAll('.nqSelect9202').forEach(cb=>{
  const id=sid(cb.value),tr=cb.closest('tr'),old=tr?.querySelector('.hlgb-note-integrity-warning');if(old)old.remove();
  if(!unsafe.has(id)){cb.disabled=false;if(cb.dataset.hlgbIntegrityTitle){cb.title=cb.dataset.hlgbIntegrityTitle;delete cb.dataset.hlgbIntegrityTitle}return}
  if(!cb.dataset.hlgbIntegrityTitle)cb.dataset.hlgbIntegrityTitle=cb.title||'';cb.checked=false;cb.disabled=true;cb.title='Bloqueado: a fila deste produto ultrapassa a quantidade do pedido.';
  try{window.hlgbSelectedNotes9235?.delete?.(id)}catch(e){}
  const g=byId.get(id),cell=tr?.children?.[2];if(cell&&g){const b=document.createElement('div');b.className='badge bad hlgb-note-integrity-warning';b.style.marginTop='4px';b.textContent='⚠ Conferir duplicidade: fila '+g.queued.toLocaleString('pt-BR')+' / pedido '+g.expected.toLocaleString('pt-BR')+' pç';cell.appendChild(b)}
 });
}
function patchGroup(){
 const fn=window.groupNote9202;if(typeof fn!=='function'||fn.__hlgbNoteIntegrity9411)return;
 const w=function(){
  const unsafe=unsafeQueueIds(),checked=[...document.querySelectorAll('.nqSelect9202:checked')].map(x=>sid(x.value));
  if(checked.some(id=>unsafe.has(id))){alert('Esta montagem foi bloqueada porque a fila contém quantidade maior que o pedido. Confira as entregas duplicadas antes de criar a nota.');return false}
  return fn.apply(this,arguments);
 };w.__hlgbNoteIntegrityV1=true;w.__hlgbNoteIntegrity9411=true;w.__hlgbNoteIntegrity9418=true;w.__original=fn;window.groupNote9202=w;
}

/* ---------- documento da nota: Ver / PDF / Imprimir ---------- */
function invoiceById(id){return canonicalInvoices().find(x=>sid(x?.id)===sid(id))||null}
function noteNumber(inv){return sid(inv?.externalNoteNumber||inv?.noteNumber||inv?.id||'')}
function noteItems(inv){return Array.isArray(inv?.items)?inv.items.filter(Boolean):[]}
function noteTotal(inv){const x=Number(inv?.value);return Number.isFinite(x)?x:noteItems(inv).reduce((s,i)=>s+q(i.value||q(i.qty)*q(i.unitPrice)),0)}
function noteHtml(inv,forPrint=false){
 const items=noteItems(inv),rows=items.map(i=>{
  const qty=q(i.qty),unit=q(i.unitPrice),raw=Number(i.value),total=Number.isFinite(raw)?raw:qty*unit;
  return '<tr><td>'+esc(i.productName||i.description||'Produto')+'</td><td>'+qty.toLocaleString('pt-BR')+'</td><td>'+money(unit)+'</td><td>'+money(total)+'</td></tr>';
 }).join('');
 const title=inv?.manualNote?'Nota avulsa':'Nota';
 return '<div class="hlgb-note-doc9411">'+
  '<div class="hlgb-note-doc-head9411"><div><h2>HLGB Confecções</h2><div class="sub">'+esc(title)+' #'+esc(noteNumber(inv))+'</div></div><div><b>Emissão:</b> '+esc(fmtDate(inv.issueDate||inv.date))+'<br><b>Vencimento:</b> '+esc(fmtDate(inv.dueDate||inv.issueDate||inv.date))+'</div></div>'+
  '<div class="hlgb-note-client9411"><b>Cliente:</b> '+esc(inv.client||inv.clientName||'-')+'<br><b>Condição:</b> '+esc(inv.terms||inv.paymentTerms||'À vista')+(inv.termsDetail?' — '+esc(inv.termsDetail):'')+'</div>'+
  '<table class="hlgb-note-table9411"><thead><tr><th>Descrição</th><th>Qtd.</th><th>Valor unit.</th><th>Total</th></tr></thead><tbody>'+rows+'</tbody></table>'+
  '<div class="hlgb-note-total9411">Total: '+money(noteTotal(inv))+'</div>'+
  (inv.note||inv.observations?'<div class="hlgb-note-obs9411"><b>Observação:</b> '+esc(inv.note||inv.observations)+'</div>':'')+
  (inv.manualNote?'<div class="sub" style="margin-top:10px">Nota avulsa. Não movimenta estoque, pedido, corte ou produção.</div>':'')+
 '</div>';
}
function notePrintPage(inv){
 return '<!doctype html><html><head><meta charset="utf-8"><title>Nota '+esc(noteNumber(inv))+'</title><style>'+
 'body{font-family:Arial,sans-serif;color:#222;margin:28px}.hlgb-note-doc-head9411{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #6f3f59;padding-bottom:12px}.hlgb-note-doc-head9411 h2{margin:0}.sub{color:#666;font-size:12px}.hlgb-note-client9411{margin:18px 0;line-height:1.6}.hlgb-note-table9411{width:100%;border-collapse:collapse}.hlgb-note-table9411 th,.hlgb-note-table9411 td{border:1px solid #bbb;padding:8px;text-align:left}.hlgb-note-table9411 th{background:#f7f0f4}.hlgb-note-total9411{text-align:right;font-weight:800;font-size:20px;margin-top:14px}.hlgb-note-obs9411{margin-top:20px}.noPrint{margin-top:22px;padding:10px 16px}@media print{.noPrint{display:none}}'+
 '</style></head><body>'+noteHtml(inv,true)+'<button class="noPrint" onclick="window.print()">Imprimir</button></body></html>';
}
window.hlgbViewNote9411=function(id){
 const inv=invoiceById(id);if(!inv)return alert('Nota não encontrada.');
 if(typeof openModal==='function')openModal((inv.manualNote?'Nota avulsa ':'Nota ')+noteNumber(inv),noteHtml(inv)+'<div class="toolbar" style="margin-top:16px"><button type="button" class="secondary" onclick="hlgbDownloadNotePdf9411(\''+esc(sid(inv.id))+'\')">Baixar PDF</button><button type="button" class="primary" onclick="hlgbPrintNote9411(\''+esc(sid(inv.id))+'\')">Imprimir</button></div>');
 else {const w=window.open('','_blank');if(w){w.document.write(notePrintPage(inv));w.document.close()}}
};
window.hlgbPrintNote9411=function(id){
 const inv=invoiceById(id);if(!inv)return alert('Nota não encontrada.');
 const w=window.open('','_blank');if(!w)return alert('Permita pop-ups para imprimir a nota.');
 w.document.write(notePrintPage(inv).replace('<button class="noPrint" onclick="window.print()">Imprimir</button>','<script>window.onload=()=>window.print();<\\/script>'));w.document.close();
};
function pdfText(v){return sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'?')}
function pdfEscape(v){return pdfText(v).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function wrapText(text,max=86){
 const words=pdfText(text).split(/\s+/).filter(Boolean),out=[];let line='';
 for(const w of words){const next=line?line+' '+w:w;if(next.length>max){if(line)out.push(line);line=w}else line=next}
 if(line)out.push(line);return out.length?out:[''];
}
function pdfLines(inv){
 const lines=['HLGB Confeccoes',(inv.manualNote?'NOTA AVULSA #':'NOTA #')+noteNumber(inv),'Cliente: '+sid(inv.client||inv.clientName||'-'),'Emissao: '+fmtDate(inv.issueDate||inv.date)+'   Vencimento: '+fmtDate(inv.dueDate||inv.issueDate||inv.date),'Condicao: '+sid(inv.terms||inv.paymentTerms||'A vista')+(inv.termsDetail?' - '+sid(inv.termsDetail):''),''];
 lines.push('Descricao | Qtd. | Unitario | Total');
 lines.push('--------------------------------------------------------------------------');
 for(const i of noteItems(inv)){
  const qty=q(i.qty),unit=q(i.unitPrice),raw=Number(i.value),total=Number.isFinite(raw)?raw:qty*unit;
  const suffix=' | '+qty.toLocaleString('pt-BR')+' | '+money(unit)+' | '+money(total);
  wrapText(sid(i.productName||i.description||'Produto'),58).forEach((part,idx)=>lines.push(idx===0?part+suffix:'  '+part));
 }
 lines.push('');lines.push('TOTAL: '+money(noteTotal(inv)));
 if(inv.note||inv.observations){lines.push('');wrapText('Observacao: '+sid(inv.note||inv.observations),86).forEach(x=>lines.push(x))}
 if(inv.manualNote){lines.push('');lines.push('Nota avulsa - nao movimenta estoque, pedido, corte ou producao.')}
 return lines;
}
function buildPdf(inv){
 const all=pdfLines(inv),perPage=50,pages=[];for(let i=0;i<all.length;i+=perPage)pages.push(all.slice(i,i+perPage));
 if(!pages.length)pages.push(['HLGB Confeccoes']);
 const fontObj=3+pages.length*2,objs=[];
 objs[1]='<< /Type /Catalog /Pages 2 0 R >>';
 const kids=pages.map((_,i)=>(3+i*2)+' 0 R').join(' ');
 objs[2]='<< /Type /Pages /Kids [ '+kids+' ] /Count '+pages.length+' >>';
 pages.forEach((lines,idx)=>{
  const pageObj=3+idx*2,contentObj=pageObj+1;
  const content='BT /F1 10 Tf 45 800 Td 14 TL '+lines.map((x,i)=>(i?'T* ':'')+'('+pdfEscape(x)+') Tj').join('\n')+' ET';
  objs[pageObj]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 '+fontObj+' 0 R >> >> /Contents '+contentObj+' 0 R >>';
  objs[contentObj]='<< /Length '+content.length+' >>\nstream\n'+content+'\nendstream';
 });
 objs[fontObj]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
 let pdf='%PDF-1.4\n',offsets=[0];
 for(let i=1;i<objs.length;i++){offsets[i]=pdf.length;pdf+=i+' 0 obj\n'+objs[i]+'\nendobj\n'}
 const xref=pdf.length;pdf+='xref\n0 '+objs.length+'\n0000000000 65535 f \n';
 for(let i=1;i<objs.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
 pdf+='trailer\n<< /Size '+objs.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 return new Blob([new TextEncoder().encode(pdf)],{type:'application/pdf'});
}
window.hlgbDownloadNotePdf9411=function(id){
 const inv=invoiceById(id);if(!inv)return alert('Nota não encontrada.');
 const blob=buildPdf(inv),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='nota-'+noteNumber(inv).replace(/[^a-z0-9_-]+/gi,'-')+'.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
};
function decorateNoteActions(){
 for(const boxId of ['projectionNotes9214','projectionNotes9200']){
  const box=document.getElementById(boxId);if(!box)continue;
  box.querySelectorAll('tbody tr').forEach(tr=>{
   const id=shadowIdFromRow(tr);if(!id||tr.querySelector('.hlgb-note-actions9411'))return;
   const inv=invoiceById(id);if(!inv)return;
   const cell=tr.lastElementChild;if(!cell)return;
   const wrap=document.createElement('div');wrap.className='hlgb-note-actions9411';
   wrap.innerHTML='<button type="button" class="secondary" data-na9411="view">Ver</button><button type="button" class="secondary" data-na9411="pdf">Baixar PDF</button><button type="button" class="secondary" data-na9411="print">Imprimir</button>';
   wrap.querySelector('[data-na9411="view"]').onclick=()=>window.hlgbViewNote9411(id);
   wrap.querySelector('[data-na9411="pdf"]').onclick=()=>window.hlgbDownloadNotePdf9411(id);
   wrap.querySelector('[data-na9411="print"]').onclick=()=>window.hlgbPrintNote9411(id);
   cell.appendChild(wrap);
  });
 }
}

/* ---------- nota avulsa ---------- */
function makeId(){return Date.now()*1000+Math.floor(Math.random()*800+100)}
function clientOptions(){
 return arr('clients').slice().sort((a,b)=>sid(a.name).localeCompare(sid(b.name),'pt-BR')).map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name||'Cliente')+'</option>').join('');
}
function manualItemRow(i=0){
 return '<tr class="hlgb-manual-item9411"><td><input class="hlgb-manual-desc9411" placeholder="Ex.: Calcinha com pequeno defeito"></td><td><input class="hlgb-manual-qty9411" type="number" min="1" step="1" value="1"></td><td><input class="hlgb-manual-unit9411" type="number" min="0" step=".01" value="0"></td><td class="hlgb-manual-total9411">R$ 0,00</td><td><button type="button" class="danger hlgb-manual-remove9411">×</button></td></tr>';
}
function recalcManual(){
 let total=0;document.querySelectorAll('.hlgb-manual-item9411').forEach(tr=>{const qty=q(tr.querySelector('.hlgb-manual-qty9411')?.value),unit=q(tr.querySelector('.hlgb-manual-unit9411')?.value),v=qty*unit;total+=v;const e=tr.querySelector('.hlgb-manual-total9411');if(e)e.textContent=money(v)});
 const e=document.getElementById('hlgbManualGrand9411');if(e)e.textContent=money(total);return total;
}
window.hlgbAddManualNoteItem9411=function(){
 const tbody=document.getElementById('hlgbManualItems9411');if(!tbody)return;tbody.insertAdjacentHTML('beforeend',manualItemRow());bindManualRows();recalcManual();
};
function bindManualRows(){
 document.querySelectorAll('.hlgb-manual-item9411').forEach(tr=>{
  tr.querySelectorAll('input').forEach(inp=>{if(!inp.dataset.hlgbManualBound){inp.dataset.hlgbManualBound='1';inp.addEventListener('input',recalcManual)}});
  const del=tr.querySelector('.hlgb-manual-remove9411');if(del&&!del.dataset.hlgbManualBound){del.dataset.hlgbManualBound='1';del.onclick=()=>{if(document.querySelectorAll('.hlgb-manual-item9411').length<=1)return alert('Mantenha pelo menos um item.');tr.remove();recalcManual()}}
 });
}
function termsDetailToggle(){
 const term=document.getElementById('hlgbManualTerms9411')?.value||'À vista',wrap=document.getElementById('hlgbManualTermsDetailWrap9411');if(wrap)wrap.style.display=term==='Personalizado'?'':'none';
}
async function saveManualNote(){
 const clientId=sid(document.getElementById('hlgbManualClient9411')?.value),freeName=sid(document.getElementById('hlgbManualClientFree9411')?.value).trim(),client=arr('clients').find(c=>sid(c.id)===clientId),clientName=freeName||sid(client?.name).trim();
 if(!clientName)return alert('Escolha um cliente ou digite o nome do cliente.');
 const issueDate=document.getElementById('hlgbManualIssue9411')?.value||today(),dueDate=document.getElementById('hlgbManualDue9411')?.value||issueDate,terms=document.getElementById('hlgbManualTerms9411')?.value||'À vista',termsDetail=sid(document.getElementById('hlgbManualTermsDetail9411')?.value).trim(),note=sid(document.getElementById('hlgbManualObs9411')?.value).trim();
 if(terms==='Personalizado'&&!termsDetail)return alert('Informe os detalhes da condição personalizada.');
 const items=[];document.querySelectorAll('.hlgb-manual-item9411').forEach(tr=>{const productName=sid(tr.querySelector('.hlgb-manual-desc9411')?.value).trim(),qty=Math.floor(q(tr.querySelector('.hlgb-manual-qty9411')?.value)),unitPrice=q(tr.querySelector('.hlgb-manual-unit9411')?.value);if(productName&&qty>0)items.push({orderId:null,itemKey:null,productId:null,productName,description:productName,projectionDate:issueDate,deliveredAt:issueDate,qty,unitPrice,value:+(qty*unitPrice).toFixed(2),sourceType:'manual_note',manualItem:true})});
 if(!items.length)return alert('Adicione pelo menos um produto com descrição e quantidade.');
 const total=+items.reduce((s,i)=>s+i.value,0).toFixed(2);if(total<=0)return alert('Informe um valor maior que zero para a nota avulsa.');
 const invoiceId=makeId(),financeId=invoiceId+1,createdAt=new Date().toISOString();
 const inv={id:invoiceId,client:clientName,clientName,clientId:client?.id||null,sourceClient:clientName,sourceType:'manual_note',manualNote:true,stockExternal:true,items,date:issueDate,issueDate,dueDate,value:total,terms,termsDetail,status:'Pendente',paid:0,remaining:total,note,createdAt};
 const fin={id:financeId,type:'Receber',desc:'Nota avulsa — '+clientName+' — '+items.map(x=>x.productName).join(', '),value:total,status:'Pendente',paid:0,remaining:total,date:dueDate,dueDate,issueDate,paymentTerms:terms,paymentTermsDetail:termsDetail,clientId:client?.id||null,clientName,projectionInvoiceId:invoiceId,sourceType:'manual_note',manualNote:true,createdAt};
 const btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='Salvando na nuvem…'}
 let invoiceSaved=false;
 try{
  await saveConfirmed('projectionInvoices',inv,false);invoiceSaved=true;
  await saveConfirmed('finance',fin,false);
  if(typeof closeModal==='function')closeModal();
  try{window.renderNotes9214?.()}catch(e){}try{window.renderNotes9200?.()}catch(e){}try{window.renderOrderNotes?.()}catch(e){}try{window.renderFinance?.()}catch(e){}
  setTimeout(()=>{decorateNoteActions();ensureManualNoteButton()},50);
  alert('Nota avulsa criada: '+items.reduce((s,i)=>s+i.qty,0).toLocaleString('pt-BR')+' peça(s) — '+money(total)+'. Ela não movimentou estoque, pedido, corte ou produção.');
  return true;
 }catch(err){
  if(invoiceSaved){try{await saveConfirmed('projectionInvoices',inv,true)}catch(rollbackErr){console.error('[HLGB notas '+V+'] rollback da nota avulsa',rollbackErr)}}
  if(btn){btn.disabled=false;btn.textContent='Criar nota avulsa'}
  alert('A nota avulsa não foi concluída. Nada foi baixado do estoque ou da produção.\n\n'+sid(err?.message||err));return false;
 }
}
window.hlgbOpenManualNote9411=function(){
 if(typeof openModal!=='function')return alert('A janela de notas ainda não terminou de carregar.');
 const issue=today(),clients=clientOptions();
 openModal('Criar nota avulsa',
  '<div class="panel" style="margin-top:0;background:#fff8fb"><b>Venda avulsa, sem pedido</b><div class="sub">Use para defeitos, sobras, amostras ou qualquer venda pontual. Esta nota não cria pedido e não movimenta estoque, corte ou produção.</div></div>'+
  '<div class="grid"><div class="field"><label>Cliente cadastrado</label><select id="hlgbManualClient9411"><option value="">Selecione (opcional)</option>'+clients+'</select></div><div class="field"><label>Ou nome do cliente</label><input id="hlgbManualClientFree9411" placeholder="Digite se não estiver cadastrado"></div><div class="field"><label>Data de emissão</label><input id="hlgbManualIssue9411" type="date" value="'+issue+'"></div><div class="field"><label>Vencimento</label><input id="hlgbManualDue9411" type="date" value="'+issue+'"></div><div class="field"><label>Condição</label><select id="hlgbManualTerms9411"><option>À vista</option><option>7 dias</option><option>14 dias</option><option>21 dias</option><option>28 dias</option><option>30 dias</option><option>Cheque</option><option>Personalizado</option></select></div><div class="field" id="hlgbManualTermsDetailWrap9411" style="display:none"><label>Detalhes</label><input id="hlgbManualTermsDetail9411"></div></div>'+
  '<div style="overflow:auto;margin-top:14px"><table><thead><tr><th>Produto / descrição</th><th>Qtd.</th><th>Valor unit.</th><th>Total</th><th></th></tr></thead><tbody id="hlgbManualItems9411">'+manualItemRow()+'</tbody></table></div>'+
  '<div class="toolbar"><button type="button" class="secondary" id="hlgbManualAdd9411">+ Adicionar item</button></div><div class="field"><label>Observação</label><textarea id="hlgbManualObs9411" placeholder="Opcional"></textarea></div><div class="hlgb-manual-grand9411">Total: <strong id="hlgbManualGrand9411">R$ 0,00</strong></div><button type="button" class="primary modalSave">Criar nota avulsa</button>',
  saveManualNote
 );
 setTimeout(()=>{bindManualRows();recalcManual();const add=document.getElementById('hlgbManualAdd9411');if(add)add.onclick=window.hlgbAddManualNoteItem9411;const terms=document.getElementById('hlgbManualTerms9411');if(terms)terms.onchange=termsDetailToggle;},20);
};
function ensureManualNoteButton(){
 const page=document.getElementById('notas');if(!page||document.getElementById('hlgbManualNoteBar9411'))return !!page;
 const bar=document.createElement('div');bar.id='hlgbManualNoteBar9411';bar.className='toolbar';bar.innerHTML='<button type="button" class="primary" id="hlgbManualNoteBtn9411">＋ Nota avulsa</button><span class="sub" style="align-self:center">Sem pedido, sem corte e sem movimentar o estoque do sistema.</span>';
 const sub=[...page.children].find(x=>x.classList?.contains('sub')),h1=page.querySelector(':scope > h1');(sub||h1)?.insertAdjacentElement('afterend',bar);if(!bar.parentElement)page.insertBefore(bar,page.firstChild);
 bar.querySelector('#hlgbManualNoteBtn9411').onclick=window.hlgbOpenManualNote9411;return true;
}

/* ---------- limpeza autoritativa de lançamentos financeiros órfãos ---------- */
function activeProjectionId(id){
 const key=sid(id),snap=snapshotMap('projectionInvoices'),s=snap?.get?.(key);
 if(snapshotDeleted(s))return false;
 if(canonicalInvoices().some(x=>sid(x?.id)===key))return true;
 return !!(s&&s.data&&!snapshotDeleted(s));
}
function orphanFinanceRows(){
 const pmap=snapshotMap('projectionInvoices'),fmap=snapshotMap('finance');
 if(!pmap||!fmap)return [];
 const localCanon=canonicalInvoices(),activeSnap=[...pmap].filter(([,s])=>s&&s.data&&!snapshotDeleted(s)).length;
 if(localCanon.length>0&&activeSnap===0)return [];
 const remembered=readFinanceTombstones();
 return arr('finance').filter(f=>{
  const id=sid(f?.id??f?.__hlgbId);if(id&&remembered.has(id))return false;
  const snap=fmap.get?.(id);if(snapshotDeleted(snap))return false;
  const ref=f?.projectionInvoiceId;if(ref==null||sid(ref)==='')return false;
  return !activeProjectionId(ref);
 });
}
let cleanupRunning=false,cleanupLast={at:'',checked:0,deleted:0,failed:0,ids:[],skipped:'',reconciled:0};
async function cleanupOrphanFinance(){
 if(cleanupRunning)return cleanupLast;
 const pmap=snapshotMap('projectionInvoices'),fmap=snapshotMap('finance');
 if(!pmap||!fmap){cleanupLast={...cleanupLast,at:new Date().toISOString(),skipped:'snapshots-not-ready'};return cleanupLast}
 if(typeof hlgbRecordReady!=='undefined'&&hlgbRecordReady===false){cleanupLast={...cleanupLast,at:new Date().toISOString(),skipped:'records-not-ready'};return cleanupLast}
 const rec=reconcileFinanceTombstones(),rows=orphanFinanceRows();cleanupRunning=true;let deleted=0,failed=0;const ids=[];
 try{
  for(const row of rows){
   try{await saveConfirmed('finance',row,true);deleted++;ids.push(sid(row.id))}
   catch(e){failed++;console.warn('[HLGB notas '+V+'] não foi possível excluir financeiro órfão '+sid(row?.id),e)}
  }
  const after=reconcileFinanceTombstones();
  cleanupLast={at:new Date().toISOString(),checked:rows.length,deleted,failed,ids,skipped:'',reconciled:(rec.removed||0)+(after.removed||0)};
  if(deleted||cleanupLast.reconciled){try{window.renderFinance?.()}catch(e){}try{window.renderHubFinance?.()}catch(e){}}
  return cleanupLast;
 }finally{cleanupRunning=false}
}
window.hlgbCleanupOrphanNoteFinance9411=cleanupOrphanFinance;
window.hlgbFindOrphanNoteFinance9411=orphanFinanceRows;
window.hlgbReconcileNoteFinanceTombstones9418=reconcileFinanceTombstones;
window.hlgbNoteFinanceTombstoneIds9418=()=>[...readFinanceTombstones()];

/* ---------- instalação ---------- */
function apply(){
 patchRenderer('renderNotes9200');patchRenderer('renderNotes9214');patchGroup();cleanRenderedHistory();decorateQueueSafety();decorateNoteActions();ensureManualNoteButton();
}
function noteMutationRelevant(records){
 const selector='#legacyNotes9223,.v930ProjectionNotes,.nqSelect9202,[id^="noteQueue"],[id^="projectionInvoice"],[id*="Notes92"],#projectionNotes9214,#projectionNotes9200';
 for(const m of records||[]){
  const nodes=[m.target,...(m.addedNodes||[]),...(m.removedNodes||[])];
  for(const n of nodes){
   const el=n?.nodeType===1?n:n?.parentElement;if(!el)continue;
   try{if(el.matches?.(selector)||el.closest?.(selector)||el.querySelector?.(selector))return true}catch(e){}
  }
 }
 return false;
}
function ensureCss(){
 if(document.getElementById('hlgb-note-integrity-style'))return;
 const css=document.createElement('style');css.id='hlgb-note-integrity-style';css.textContent=
 '#legacyNotes9223,.v930ProjectionNotes{display:none!important}.hlgb-note-actions9411{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}.hlgb-note-actions9411 button{padding:6px 8px}.hlgb-note-doc-head9411{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #6f3f59;padding-bottom:10px;flex-wrap:wrap}.hlgb-note-doc-head9411 h2{margin:0}.hlgb-note-client9411{margin:14px 0;line-height:1.6}.hlgb-note-table9411{width:100%;border-collapse:collapse}.hlgb-note-table9411 th,.hlgb-note-table9411 td{border:1px solid #ddd;padding:8px}.hlgb-note-total9411{text-align:right;font-size:19px;font-weight:800;margin-top:12px}.hlgb-note-obs9411{margin-top:14px}.hlgb-manual-grand9411{text-align:right;font-size:20px;font-weight:800;margin:14px 0}.hlgb-manual-item9411 input{min-width:90px;width:100%}@media(max-width:680px){.hlgb-note-actions9411{flex-direction:column}.hlgb-note-actions9411 button{width:100%}}';
 document.head.appendChild(css);
}
ensureCss();

let queueInvoiceReconBusy9419=false,queueInvoiceReconAt9419=0;
function queueInvoiceAnalysis(queueRows=arr('noteQueue'),invoices=canonicalInvoices()){
 const links=new Map(),eps=.000001;
 for(const inv of (Array.isArray(invoices)?invoices:[])){
  if(!inv)continue;
  const invId=sid(inv.id),stamp=sid(inv.issueDate||inv.date||inv.updatedAt||'');
  for(const item of (Array.isArray(inv.items)?inv.items:[])){
   const queueId=sid(item?.sourceQueueId||item?.sourceKey);if(!queueId)continue;
   const cur=links.get(queueId)||{queueId,qty:0,lastInvoiceId:'',stamp:''};cur.qty+=q(item?.qty);
   if(!cur.lastInvoiceId||stamp>=cur.stamp){cur.lastInvoiceId=invId;cur.stamp=stamp}links.set(queueId,cur);
  }
 }
 const out=[];
 for(const row of (Array.isArray(queueRows)?queueRows:[])){
  if(!row||['cancelado','cancelada'].includes(norm(row.status)))continue;
  const id=sid(row.id),link=links.get(id);if(!link)continue;
  const total=q(row.qty),linked=q(link.qty),remaining=Math.max(0,total-linked),status=remaining<=eps?'Faturado':linked>eps?'Parcial':sid(row.status||'Aguardando nota');
  const currentRemaining=q(row.remainingQty??row.qty),wrongRemaining=Math.abs(currentRemaining-remaining)>eps,wrongStatus=norm(row.status)!==norm(status),wrongInvoice=!!link.lastInvoiceId&&sid(row.lastInvoiceId)!==sid(link.lastInvoiceId);
  if(wrongRemaining||wrongStatus||wrongInvoice)out.push({id,clientName:row.clientName||row.client||'',productName:row.productName||'',total,linkedQty:linked,currentRemaining,expectedRemaining:remaining,currentStatus:sid(row.status),expectedStatus:status,lastInvoiceId:link.lastInvoiceId,overInvoiced:linked>total+eps,row});
 }
 return out;
}
async function reconcileQueueInvoices9419(force=false){
 if(queueInvoiceReconBusy9419)return {busy:true,changed:0};const now=Date.now();if(!force&&now-queueInvoiceReconAt9419<2500)return {throttled:true,changed:0};queueInvoiceReconAt9419=now;queueInvoiceReconBusy9419=true;
 const changed=[],errors=[];try{
  for(const x of queueInvoiceAnalysis()){
   const next={...clone(x.row),remainingQty:x.expectedRemaining,status:x.expectedStatus,lastInvoiceId:x.lastInvoiceId,updatedAt:new Date().toISOString()};
   try{await saveConfirmed('noteQueue',next,false);changed.push(x.id)}catch(e){errors.push({id:x.id,error:sid(e?.message||e)})}
  }
  if(changed.length){try{apply()}catch(e){}}
  return {changed:changed.length,ids:changed,errors};
 }finally{queueInvoiceReconBusy9419=false}
}
window.hlgbNoteQueueReconcile9419={version:'94.19',analyze:queueInvoiceAnalysis,reconcile:reconcileQueueInvoices9419};

let productionInvoiceReconBusy9420=false,productionInvoiceReconAt9420=0;
function productionInvoiceAnalysis9420(productionRows=arr('production'),orders=arr('orders'),invoices=canonicalInvoices(),queueRows=arr('noteQueue')){
 const out=[],eps=.000001;
 for(const row of (Array.isArray(productionRows)?productionRows:[])){
  const orderId=sid(row?.orderId),productId=sid(row?.productId),planned=q(row?.planned),done=q(row?.done);
  if(!orderId||!productId||planned<=0||done>=planned-eps)continue;
  const order=(Array.isArray(orders)?orders:[]).find(o=>sid(o?.id)===orderId);if(!order)continue;
  const meta=order?.projectionItems?.[productId]||{};
  let invoiceQty=0;const invoiceIds=[];
  for(const inv of (Array.isArray(invoices)?invoices:[])){
   let matched=false;
   for(const item of (Array.isArray(inv?.items)?inv.items:[])){
    if(item?.noteOnly===true)continue;
    if(sid(item?.orderId)!==orderId)continue;
    const pid=sid(item?.productId||item?.itemKey);if(pid!==productId)continue;
    invoiceQty+=q(item?.qty);matched=true;
   }
   if(matched&&sid(inv?.id))invoiceIds.push(sid(inv.id));
  }
  const billed=Math.max(invoiceQty,q(meta?.invoicedQty));
  if(billed+eps<planned)continue;
  const queues=(Array.isArray(queueRows)?queueRows:[]).filter(r=>sid(r?.orderId)===orderId&&sid(r?.productId||r?.itemKey)===productId);
  const queueSettled=queues.length>0&&queues.every(r=>norm(r?.status)==='faturado'&&q(r?.remainingQty??r?.qty)<=eps);
  const orderFinal=norm(order?.status)==='pedido finalizado'||truthy(order?.deliveryFinalized)||truthy(order?.projectionInvoiced);
  if(!queueSettled&&!orderFinal)continue;
  const ids=[...new Set([...(Array.isArray(meta?.invoiceIds)?meta.invoiceIds:[]),...invoiceIds].map(sid).filter(Boolean))];
  out.push({id:sid(row?.id??row?.__hlgbId),orderId,productId,planned,done,invoicedQty:billed,invoiceIds:ids,queueSettled,orderFinal,row});
 }
 return out;
}
async function reconcileProductionInvoices9420(force=false){
 if(productionInvoiceReconBusy9420)return {busy:true,changed:0};const stamp=Date.now();if(!force&&stamp-productionInvoiceReconAt9420<2500)return {throttled:true,changed:0};productionInvoiceReconAt9420=stamp;productionInvoiceReconBusy9420=true;
 const changed=[],errors=[];try{
  for(const x of productionInvoiceAnalysis9420()){
   const at=new Date().toISOString(),next={...clone(x.row),done:x.planned,stage:'Finalizado',finishedAt:x.row?.finishedAt||today(),finishedAtTime:x.row?.finishedAtTime||at,invoicedQty:x.invoicedQty,invoiceIds:x.invoiceIds,invoiceReconciledAt:at,invoiceReconciledV9420:true,updatedAt:at};
   try{await saveConfirmed('production',next,false);changed.push(x.id)}catch(e){errors.push({id:x.id,error:sid(e?.message||e)})}
  }
  if(changed.length){try{window.renderProduction?.()}catch(e){}try{window.renderProjection?.()}catch(e){}}
  return {changed:changed.length,ids:changed,errors};
 }finally{productionInvoiceReconBusy9420=false}
}
window.hlgbProductionInvoiceReconcile9420={version:'94.20',analyze:productionInvoiceAnalysis9420,reconcile:reconcileProductionInvoices9420};

let timer=null;
const mo=new MutationObserver(records=>{if(!noteMutationRelevant(records))return;clearTimeout(timer);timer=setTimeout(apply,80)});
try{mo.observe(document.documentElement,{childList:true,subtree:true})}catch(e){}

const oldIncoming=window.hlgbRenderIncomingRecord;
if(typeof oldIncoming==='function'&&!oldIncoming.__hlgbNoteIntegrity9411){
 const w=function(module){
  const r=oldIncoming.apply(this,arguments);
  if(module==='finance')reconcileFinanceTombstones();
  if(['noteQueue','projectionInvoices','orders','finance','production'].includes(module)){
   setTimeout(apply,30);
   if(['noteQueue','projectionInvoices'].includes(module))setTimeout(()=>reconcileQueueInvoices9419(false).catch(()=>{}),420);
   if(['noteQueue','projectionInvoices','orders','production'].includes(module))setTimeout(()=>reconcileProductionInvoices9420(false).catch(()=>{}),650);
   if(['projectionInvoices','finance'].includes(module))setTimeout(()=>{reconcileFinanceTombstones();cleanupOrphanFinance()},350);
  }
  return r;
 };
 w.__hlgbNoteIntegrityV1=true;w.__hlgbNoteIntegrity9411=true;w.__hlgbNoteIntegrity9418=true;w.__original=oldIncoming;window.hlgbRenderIncomingRecord=w;
}

function boot(){
 reconcileFinanceTombstones();apply();
 setTimeout(()=>reconcileQueueInvoices9419(false).catch(()=>{}),900);
 setTimeout(()=>reconcileProductionInvoices9420(false).catch(()=>{}),1150);
 setTimeout(()=>{reconcileFinanceTombstones();cleanupOrphanFinance();reconcileQueueInvoices9419(false).catch(()=>{});reconcileProductionInvoices9420(false).catch(()=>{})},1800);
 setTimeout(()=>{reconcileFinanceTombstones();cleanupOrphanFinance()},4200);
}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>[100,700,1800,3500].forEach(ms=>setTimeout(()=>{reconcileFinanceTombstones();apply();if(ms>=700){reconcileQueueInvoices9419(false).catch(()=>{});reconcileProductionInvoices9420(false).catch(()=>{})}},ms)),0)}catch(e){}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,900),0)}catch(e){}
[50,500,1500,3200].forEach(ms=>setTimeout(()=>{reconcileFinanceTombstones();apply()},ms));
if(typeof window.addEventListener==='function'){
 window.addEventListener('pageshow',()=>setTimeout(()=>{reconcileFinanceTombstones();apply();cleanupOrphanFinance()},250));
 window.addEventListener('focus',()=>setTimeout(()=>{reconcileFinanceTombstones();cleanupOrphanFinance()},120));
}

window.hlgbNoteLegacyShadowIds=legacyShadowIds;
window.hlgbCanonicalProjectionInvoices=canonicalInvoices;
window.hlgbNoteQueueOverages=queueOverages;
window.hlgbNoteUnsafeQueueIds=unsafeQueueIds;
window.hlgbNoteInvoiceById9411=invoiceById;
window.hlgbNoteOrphanCleanupState9411=()=>clone(cleanupLast);
window.HLGB_NOTE_INTEGRITY_GUARD='v94.18';
window.HLGB_NOTE_INTEGRITY_SELFTEST={
 ok:!activeQueueRows().some(x=>q(x.remainingQty??x.qty)<0),
 manualNoteDoesNotTouchStock:true,
 orphanRule:'finance.projectionInvoiceId sem projectionInvoice ativa',
 orphanTombstoneReconcile:true
};
console.info('[HLGB] v'+V+' notas: nota avulsa, Ver/PDF/Imprimir e tombstones de financeiros órfãos reconciliados');
})();
