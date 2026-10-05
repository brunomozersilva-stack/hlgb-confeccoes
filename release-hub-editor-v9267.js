/* HLGB v92.67 — editor independente e confiável do Hub Financeiro */
(function(){
'use strict';
const V='92.67';
const sid=v=>String(v??'');
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return {...v}}};
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function hub(){try{return Array.isArray(window.db?.hubFinanceEntries)?window.db.hubFinanceEntries:[]}catch(e){return []}}
function rowId(x){return sid(x?.id??x?.__hlgbId)}
function findEntry(id){return hub().find(x=>rowId(x)===sid(id))||null}
function injectCss(){
 if(document.getElementById('hlgbHubEditor9267Css'))return;
 const s=document.createElement('style');s.id='hlgbHubEditor9267Css';s.textContent=`
 #hlgbHubEditor9267{position:fixed;inset:0;z-index:100000;background:rgba(33,20,29,.48);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(4px)}
 #hlgbHubEditor9267 .he-card{width:min(760px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:20px;box-shadow:0 24px 80px rgba(50,24,42,.28);border:1px solid #eadde5}
 #hlgbHubEditor9267 .he-head{padding:20px 22px 14px;background:linear-gradient(135deg,#6f3556,#9e5a7b);color:#fff;border-radius:20px 20px 0 0;display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
 #hlgbHubEditor9267 .he-head h2{margin:0;font-size:21px}.he-head small{opacity:.88}.he-close{border:0;background:rgba(255,255,255,.16);color:#fff;border-radius:10px;width:38px;height:38px;font-size:20px;cursor:pointer}
 #hlgbHubEditor9267 .he-body{padding:20px 22px}.he-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.he-field{display:flex;flex-direction:column;gap:6px}.he-field.full{grid-column:1/-1}.he-field label{font-size:12px;font-weight:700;color:#684657}.he-field input,.he-field select,.he-field textarea{width:100%;box-sizing:border-box;border:1px solid #d9ccd4;border-radius:11px;padding:11px 12px;font:inherit;background:#fff;color:#2e2028;outline:none}.he-field input:focus,.he-field select:focus,.he-field textarea:focus{border-color:#8d4c6b;box-shadow:0 0 0 3px rgba(141,76,107,.12)}
 #hlgbHubEditor9267 .he-methods{display:flex;gap:8px;flex-wrap:wrap}.he-method{display:flex;align-items:center;gap:6px;border:1px solid #e1d4db;border-radius:999px;padding:8px 10px;background:#fffafd}.he-method input{width:auto;margin:0}
 #hlgbHubEditor9267 .he-actions{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap;margin-top:20px;padding-top:16px;border-top:1px solid #eee3e9}.he-actions button{border:0;border-radius:11px;padding:10px 16px;font-weight:700;cursor:pointer}.he-cancel{background:#f3edf1;color:#5d4050}.he-save{background:#7d3f60;color:#fff}.he-save:disabled{opacity:.55;cursor:wait}
 #hlgbHubEditor9267 .he-note{font-size:12px;color:#7a6570;margin-top:10px}.he-error{display:none;margin-top:12px;padding:10px 12px;border-radius:10px;background:#fff1f1;color:#982f3f;border:1px solid #f1c5cc}
 @media(max-width:650px){#hlgbHubEditor9267{padding:8px;align-items:flex-end}#hlgbHubEditor9267 .he-card{max-height:96vh;border-radius:18px 18px 0 0}#hlgbHubEditor9267 .he-head{border-radius:18px 18px 0 0}.he-grid{grid-template-columns:1fr}.he-field.full{grid-column:auto}}
 `;document.head.appendChild(s);
}
function paymentHtml(e){
 const flow=sid(e.flow||'Saída');
 if(flow==='Entrada'){
  const cur=sid(e.method||'Pix'),opts=['Pix','Dinheiro','Cheque','Boleto','Transferência','Cartão','Outro'];
  return '<div class="he-field full" id="hePayment9267"><label>Forma de recebimento</label><select id="heMethod9267">'+opts.map(x=>'<option '+(cur===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></div>';
 }
 const cur=Array.isArray(e.acceptedMethods)&&e.acceptedMethods.length?e.acceptedMethods:['Pix'];
 return '<div class="he-field full" id="hePayment9267"><label>Formas aceitas para pagamento</label><div class="he-methods">'+['Pix','Dinheiro','Cheque','Boleto','Transferência'].map(x=>'<label class="he-method"><input type="checkbox" value="'+esc(x)+'" '+(cur.includes(x)?'checked':'')+'> '+esc(x)+'</label>').join('')+'</div></div>';
}
function overlayHtml(e){
 const party=sid(e.person||e.origin||e.supplier||e.client||'');
 return '<div id="hlgbHubEditor9267" role="dialog" aria-modal="true"><div class="he-card"><div class="he-head"><div><h2>✏️ Editar lançamento financeiro</h2><small>Altere os dados e salve; o lançamento original só é substituído após confirmação da nuvem.</small></div><button class="he-close" type="button" aria-label="Fechar">×</button></div><div class="he-body"><div class="he-grid">'+
  '<div class="he-field"><label>Tipo</label><select id="heFlow9267"><option '+(e.flow==='Entrada'?'selected':'')+'>Entrada</option><option '+(e.flow!=='Entrada'?'selected':'')+'>Saída</option></select></div>'+
  '<div class="he-field"><label>Data / vencimento</label><input id="heDate9267" type="date" value="'+esc(sid(e.date).slice(0,10))+'"></div>'+
  '<div class="he-field full"><label>Descrição</label><input id="heDescription9267" value="'+esc(e.description||'')+'" placeholder="Ex.: pagamento da facção, compra de tecido..."></div>'+
  '<div class="he-field"><label>Categoria</label><input id="heCategory9267" value="'+esc(e.category||'')+'" placeholder="Ex.: Facção, Compras, Folha"></div>'+
  '<div class="he-field"><label>Pessoa / origem</label><input id="heParty9267" value="'+esc(party)+'" placeholder="Cliente, fornecedor, funcionário ou facção"></div>'+
  '<div class="he-field"><label>Valor (R$)</label><input id="heValue9267" type="number" min="0" step="0.01" value="'+esc(Number(e.value||0))+'"></div>'+
  '<div class="he-field"><label>Status</label><select id="heStatus9267"><option value="Previsto" '+(e.status!=='Realizado'?'selected':'')+'>Previsto</option><option value="Realizado" '+(e.status==='Realizado'?'selected':'')+'>Realizado</option></select></div>'+
  paymentHtml(e)+
  '</div><div id="heError9267" class="he-error"></div><div class="he-note">ID do lançamento: '+esc(rowId(e))+' · Campos internos e vínculos de origem são preservados.</div><div class="he-actions"><button type="button" class="he-cancel">Cancelar</button><button type="button" class="he-save">☁️ Salvar alterações</button></div></div></div></div>';
}
function closeEditor(){document.getElementById('hlgbHubEditor9267')?.remove()}
function showError(msg){const e=document.getElementById('heError9267');if(e){e.textContent=msg;e.style.display='block'}}
function renderPayment(e){const old=document.getElementById('hePayment9267');if(!old)return;const tmp=document.createElement('div');tmp.innerHTML=paymentHtml({...e,flow:document.getElementById('heFlow9267')?.value||e.flow});old.replaceWith(tmp.firstElementChild)}
async function saveEdited(existing){
 const date=sid(document.getElementById('heDate9267')?.value),description=sid(document.getElementById('heDescription9267')?.value).trim(),category=sid(document.getElementById('heCategory9267')?.value).trim(),party=sid(document.getElementById('heParty9267')?.value).trim(),flow=sid(document.getElementById('heFlow9267')?.value),status=sid(document.getElementById('heStatus9267')?.value),value=Number(document.getElementById('heValue9267')?.value);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Informe uma data válida.');
 if(!description)throw new Error('Informe a descrição do lançamento.');
 if(!Number.isFinite(value)||value<0)throw new Error('Informe um valor válido.');
 const next={...clone(existing),flow,date,description,category,value,status,updatedAt:new Date().toISOString()};
 if('origin' in existing)next.origin=party;next.person=party;
 if(flow==='Entrada')next.method=sid(document.getElementById('heMethod9267')?.value||existing.method||'Pix');
 else{
  const checked=[...document.querySelectorAll('#hePayment9267 input[type="checkbox"]:checked')].map(x=>x.value);
  next.acceptedMethods=checked.length?checked:['Pix'];
 }
 if(status==='Realizado')next.realizedAt=existing.realizedAt||new Date().toISOString().slice(0,10);else next.realizedAt='';
 if(typeof window.hlgbHubSaveConfirmed==='function'){
  const out=await window.hlgbHubSaveConfirmed(next,false);if(!out||out.applied!==true)throw new Error(out?.reason||'A nuvem não confirmou a alteração.');
 }else if(typeof window.hlgbRecordSaveWithRetry==='function'){
  const out=await window.hlgbRecordSaveWithRetry('hubFinanceEntries',rowId(existing),next,false);if(!out||out.applied!==true)throw new Error(out?.reason||'A nuvem não confirmou a alteração.');
  const a=hub(),i=a.findIndex(x=>rowId(x)===rowId(existing));if(i>=0)a[i]=out.data||next;
 }else throw new Error('A função de gravação do Hub não está disponível.');
 try{window.hlgbHubMaster9258?.renderAll?.()}catch(e){}
 try{if(typeof window.renderHubFinance==='function')window.renderHubFinance()}catch(e){}
 return true;
}
function openEditor(id){
 const e=findEntry(id);if(!e){alert('Não encontrei esse lançamento no Hub. Atualize a página e tente novamente.');return false}
 injectCss();closeEditor();document.body.insertAdjacentHTML('beforeend',overlayHtml(e));
 const root=document.getElementById('hlgbHubEditor9267'),save=root.querySelector('.he-save');
 root.querySelector('.he-close').onclick=closeEditor;root.querySelector('.he-cancel').onclick=closeEditor;root.addEventListener('click',ev=>{if(ev.target===root)closeEditor()});
 root.querySelector('#heFlow9267').onchange=()=>renderPayment(e);
 save.onclick=async()=>{save.disabled=true;const old=save.textContent;save.textContent='☁️ Salvando…';try{await saveEdited(e);closeEditor()}catch(err){console.error('[HLGB Hub Editor '+V+']',err);showError(String(err?.message||err));save.disabled=false;save.textContent=old}};
 setTimeout(()=>root.querySelector('#heDescription9267')?.focus(),30);return true;
}
window.editHubFinanceEntry=openEditor;
window.quickEditHub9185=openEditor;
if(typeof window.toggleHubQuick9185!=='function')window.toggleHubQuick9185=id=>window.toggleHubFinanceEntry?.(id);
window.hlgbHubEditor9267={version:V,open:openEditor,close:closeEditor,find:findEntry};
console.info('[HLGB] Hub Editor v'+V+' ativo — edição desacoplada do formulário legado');
})();
