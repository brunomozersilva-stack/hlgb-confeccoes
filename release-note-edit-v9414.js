/* HLGB v94.14 — edição pós-emissão, itens extras e fechamento da nota */
(function(){
'use strict';
const V='94.14';
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function data(){return window.db||{}}
function arr(name){const d=data();d[name]=Array.isArray(d[name])?d[name]:[];return d[name]}
function invoice(id){try{return window.hlgbNoteInvoiceById9411?.(id)||arr('projectionInvoices').find(x=>sid(x?.id)===sid(id))||null}catch(e){return null}}
function noteNumber(inv){return sid(inv?.externalNoteNumber||inv?.noteNumber||inv?.id||'')}
function isClosed(inv){return inv?.documentClosed===true||inv?.noteClosed===true}
function upsert(module,row){const a=arr(module),id=sid(row?.id);const i=a.findIndex(x=>sid(x?.id)===id);const next=clone(row);if(i>=0)a[i]=next;else a.push(next);try{window.localSaveOnly?.()}catch(e){}return next}
async function saveRecord(module,row){
 if(!row?.id)throw new Error('Registro sem identificação.');
 if(typeof window.cloudEnsureFreshSession==='function')await window.cloudEnsureFreshSession(false);
 if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação multiusuário indisponível.');
 const out=await window.hlgbRecordSaveWithRetry(module,sid(row.id),clone(row),false);
 if(!out?.applied)throw new Error(out?.reason||('A nuvem não confirmou '+module+'.'));
 return upsert(module,out.data||row);
}
function financeRows(id){return arr('finance').filter(x=>sid(x?.projectionInvoiceId)===sid(id))}
function financeForTotal(row,total){
 const paid=q(row?.paid),remaining=Math.max(0,total-paid);
 const status=remaining<=0?'Pago':(paid>0?'Parcial':'Pendente');
 return {...clone(row),value:+total.toFixed(2),remaining:+remaining.toFixed(2),status,updatedAt:new Date().toISOString(),noteTotalAdjustedV9414:true};
}
function refresh(){
 try{window.renderNotes9214?.()}catch(e){}try{window.renderNotes9200?.()}catch(e){}try{window.renderOrderNotes?.()}catch(e){}
 try{window.renderFinance?.()}catch(e){}try{window.renderHubFinance?.()}catch(e){}
}
function editorRow(item,index){
 const qty=q(item?.qty)||1,unit=q(item?.unitPrice),desc=sid(item?.productName||item?.description||'');
 return '<tr class="hlgb-note-edit-row9414" data-index="'+index+'"><td><input class="hlgb-note-edit-desc9414" value="'+esc(desc)+'" placeholder="Produto"></td><td><input class="hlgb-note-edit-qty9414" type="number" min="1" step="1" value="'+qty+'"></td><td><input class="hlgb-note-edit-unit9414" type="number" min="0" step="0.01" value="'+unit+'"></td><td class="hlgb-note-edit-total9414">'+money(qty*unit)+'</td><td><button type="button" class="danger hlgb-note-edit-remove9414">×</button></td></tr>';
}
function bindRows(){
 document.querySelectorAll('.hlgb-note-edit-row9414').forEach(tr=>{
  tr.querySelectorAll('input').forEach(inp=>{if(inp.dataset.bound9414)return;inp.dataset.bound9414='1';inp.addEventListener('input',recalc)});
  const del=tr.querySelector('.hlgb-note-edit-remove9414');if(del&&!del.dataset.bound9414){del.dataset.bound9414='1';del.onclick=()=>{if(document.querySelectorAll('.hlgb-note-edit-row9414').length<=1)return alert('A nota precisa ter pelo menos um item.');tr.remove();recalc()}}
 });
}
function recalc(){let sum=0;document.querySelectorAll('.hlgb-note-edit-row9414').forEach(tr=>{const qty=Math.floor(q(tr.querySelector('.hlgb-note-edit-qty9414')?.value)),unit=q(tr.querySelector('.hlgb-note-edit-unit9414')?.value),v=qty*unit;sum+=v;const cell=tr.querySelector('.hlgb-note-edit-total9414');if(cell)cell.textContent=money(v)});const el=document.getElementById('hlgbNoteEditGrand9414');if(el)el.textContent=money(sum);return +sum.toFixed(2)}
function addRow(){const tbody=document.getElementById('hlgbNoteEditItems9414');if(!tbody)return;tbody.insertAdjacentHTML('beforeend',editorRow({qty:1,unitPrice:0},-1));bindRows();recalc()}
function collectItems(inv){
 const original=Array.isArray(inv?.items)?inv.items:[],out=[];
 document.querySelectorAll('.hlgb-note-edit-row9414').forEach(tr=>{
  const idx=Number(tr.dataset.index),desc=sid(tr.querySelector('.hlgb-note-edit-desc9414')?.value).trim(),qty=Math.floor(q(tr.querySelector('.hlgb-note-edit-qty9414')?.value)),unitPrice=q(tr.querySelector('.hlgb-note-edit-unit9414')?.value);
  if(!desc||qty<=0)return;
  const base=idx>=0&&original[idx]?clone(original[idx]):{};
  out.push({...base,productName:desc,description:desc,qty,unitPrice:+unitPrice.toFixed(2),value:+(qty*unitPrice).toFixed(2),...(idx<0?{sourceType:'note_adjustment',noteOnly:true,addedAfterIssue:true,addedAt:new Date().toISOString()}:{} )});
 });
 return out;
}
async function saveEdit(id){
 const inv=invoice(id);if(!inv)return alert('Nota não encontrada.');if(isClosed(inv))return alert('Esta nota está fechada e não pode mais ser alterada.');
 const items=collectItems(inv);if(!items.length)return alert('A nota precisa ter pelo menos um produto.');
 const total=+items.reduce((s,i)=>s+q(i.value),0).toFixed(2);if(total<=0)return alert('O total da nota precisa ser maior que zero.');
 const originalInv=clone(inv),fin=financeRows(id).map(clone),nextInv={...clone(inv),items,value:total,remaining:Math.max(0,total-q(inv.paid)),editedAfterIssue:true,lastEditedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
 const nextFin=fin.map(r=>financeForTotal(r,total));let invSaved=false,savedFin=0;
 const btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='Salvando na nuvem…'}
 try{
  await saveRecord('projectionInvoices',nextInv);invSaved=true;
  for(const row of nextFin){await saveRecord('finance',row);savedFin++}
  refresh();try{window.closeModal?.()}catch(e){};setTimeout(()=>window.hlgbViewNote9411?.(id),120);return true;
 }catch(err){
  console.error('[HLGB '+V+'] edição de nota',err);
  let rollbackFailed=false;
  for(let i=savedFin-1;i>=0;i--){try{await saveRecord('finance',fin[i])}catch(e){rollbackFailed=true;console.error('[HLGB '+V+'] rollback financeiro',e)}}
  if(invSaved){try{await saveRecord('projectionInvoices',originalInv)}catch(e){rollbackFailed=true;console.error('[HLGB '+V+'] rollback nota',e)}}
  if(btn){btn.disabled=false;btn.textContent='Salvar alterações'}
  alert('Não foi possível concluir a alteração da nota.'+(rollbackFailed?' Parte da reversão precisa ser conferida no diagnóstico.':' Nenhuma alteração parcial foi mantida.')+'\n\n'+sid(err?.message||err));return false;
 }
}
function openEditor(id){
 const inv=invoice(id);if(!inv)return alert('Nota não encontrada.');if(isClosed(inv))return alert('Esta nota está fechada e não pode mais ser alterada.');
 const items=Array.isArray(inv.items)?inv.items:[];
 const rows=(items.length?items:[{qty:1,unitPrice:0}]).map((x,i)=>editorRow(x,items.length?i:-1)).join('');
 if(typeof window.openModal!=='function')return alert('A janela de edição ainda não terminou de carregar.');
 window.openModal('Editar nota #'+noteNumber(inv),'<div class="panel" style="margin-top:0;background:#fff8fb"><b>Alterar somente a nota</b><div class="sub">Você pode ajustar os itens existentes ou incluir produtos extras. Isso não altera pedido, corte, produção ou estoque.</div></div><div style="overflow:auto;margin-top:12px"><table><thead><tr><th>Produto / descrição</th><th>Qtd.</th><th>Valor unit.</th><th>Total</th><th></th></tr></thead><tbody id="hlgbNoteEditItems9414">'+rows+'</tbody></table></div><div class="toolbar" style="margin-top:10px"><button type="button" class="secondary" id="hlgbNoteEditAdd9414">＋ Adicionar produto</button></div><div style="text-align:right;font-size:20px;font-weight:800;margin:15px 0">Total: <span id="hlgbNoteEditGrand9414">'+money(inv.value)+'</span></div><button type="button" class="primary modalSave">Salvar alterações</button>',()=>saveEdit(id));
 setTimeout(()=>{bindRows();recalc();const add=document.getElementById('hlgbNoteEditAdd9414');if(add)add.onclick=addRow},20);
}
async function closeNote(id){
 const inv=invoice(id);if(!inv)return alert('Nota não encontrada.');if(isClosed(inv))return true;
 if(!confirm('Fechar esta nota?\n\nDepois de fechada ela não poderá mais ser alterada. O financeiro continua com o status próprio dele.'))return false;
 const next={...clone(inv),documentClosed:true,documentClosedAt:new Date().toISOString(),documentClosedV9414:true,updatedAt:new Date().toISOString()};
 try{await saveRecord('projectionInvoices',next);refresh();try{window.closeModal?.()}catch(e){};setTimeout(()=>window.hlgbViewNote9411?.(id),120);return true}catch(err){alert('Não foi possível fechar a nota.\n\n'+sid(err?.message||err));return false}
}
window.hlgbEditNote9414=openEditor;
window.hlgbCloseNote9414=closeNote;
function injectViewActions(id){
 const inv=invoice(id),modal=document.getElementById('modal');if(!inv||!modal)return false;
 const bars=[...modal.querySelectorAll('.toolbar')],bar=bars[bars.length-1]||modal;
 if(bar.querySelector?.('.hlgb-note-edit-actions9414'))return true;
 const wrap=document.createElement('span');wrap.className='hlgb-note-edit-actions9414';wrap.style.display='contents';
 if(isClosed(inv)){
  const badge=document.createElement('span');badge.className='badge ok';badge.textContent='🔒 Nota fechada';badge.style.alignSelf='center';wrap.appendChild(badge);
 }else{
  const edit=document.createElement('button');edit.type='button';edit.className='secondary';edit.textContent='✏️ Editar nota';edit.onclick=()=>openEditor(id);wrap.appendChild(edit);
  const close=document.createElement('button');close.type='button';close.className='secondary';close.textContent='🔒 Fechar nota';close.onclick=()=>closeNote(id);wrap.appendChild(close);
 }
 bar.appendChild(wrap);return true;
}
let lastBase=null;
function install(){
 const f=window.hlgbViewNote9411;if(typeof f!=='function')return false;if(f.__hlgbNoteEdit9414)return true;
 lastBase=f;const w=function(id){const out=f.apply(this,arguments);setTimeout(()=>injectViewActions(id),30);return out};w.__hlgbNoteEdit9414=true;w.__base=f;window.hlgbViewNote9411=w;window.HLGB_NOTE_EDIT_AUTHORITY=V;return true;
}
[100,400,900,1700,2800,4200,5600].forEach(ms=>setTimeout(install,ms));
try{if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>[300,1200,3600].forEach(ms=>setTimeout(install,ms)),0)}catch(e){}
window.hlgbNoteEdit9414={version:V,install,openEditor,closeNote,saveEdit,isClosed,financeRows};
console.info('[HLGB] v'+V+' notas: edição pós-emissão, item extra e fechamento ativo');
})();