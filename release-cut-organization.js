/* HLGB — organização e busca da aba Corte */
(function(){
'use strict';
const V='2026.10.01-cut-organization-v1';
const sid=v=>String(v??''),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function cutIdentity9709(row){
 const explicit=sid(row?.dataset?.hlgbCutModelId||'');if(explicit)return explicit;
 const buttons=Array.from(row?.querySelectorAll?.('button[onclick]')||[]);
 for(const b of buttons){const m=sid(b.getAttribute('onclick')).match(/(?:^|\b)editCut\(\s*(['"]?)([^'")\s]+)\1\s*\)/);if(m)return m[2]}
 return '';
}
function cutIndex9709(){
 const index=n=>{const map=new Map();for(const x of arr(n)){if(!x||x.id==null)continue;const id=sid(x.id);map.set(id,map.has(id)?null:x)}return map};
 return {cuts:index('cuts'),orders:index('orders'),cutters:index('cutters'),products:index('products'),materials:index('materials')};
}
function cutMeta9709(c,idx){
 const o=idx.orders.get(sid(c.orderId)),ct=idx.cutters.get(sid(c.cutterId)),p=idx.products.get(sid(c.productId));
 const materialNames=(Array.isArray(p?.materials)?p.materials:[]).map(m=>[m?.name,m?.materialName,idx.materials.get(sid(m?.materialId||m?.id))?.name].filter(Boolean).join(' '));
 return {search:norm([c.id,c.orderId,'Pedido '+sid(o?.orderNumber||o?.number||c.orderId),o?.orderNumber,o?.number,o?.client,o?.clientName,c.product,p?.name,p?.code,p?.sku,p?.reference,ct?.name,c.op,o?.priority,c.date,c.plannedCutDate,...materialNames].filter(v=>v!=null).join(' ')),priority:sid(o?.priority||'Padrão'),cutter:sid(c.cutterId||''),date:sid(c.plannedCutDate||c.date||'').slice(0,10),cutterName:ct?.name||'Sem cortador',completed:norm(c.status)==='finalizado'||norm(c.status).includes('desmembrado')||c.modelSplitParentV1===true||c.hiddenByModelSplitV1===true};
}
function matchesCut9709(meta,filters){
 return (!filters.q||filters.q.split(/\s+/).every(t=>meta.search.includes(t)))&&
 (!filters.priority||meta.priority===filters.priority)&&(!filters.cutter||meta.cutter===filters.cutter)&&(!filters.date||meta.date===filters.date);
}
let filterEvidence9709={observed:false,legacyRows:null,modelRows:null,shown:null,unresolved:null};
function ensureToolbar(){
  const root=document.getElementById('cutTable'),panel=root?.closest?.('.panel');if(!root||!panel)return;
  const existing=document.getElementById('hlgbCutFilters'),split=document.getElementById('hlgbCutSplitPanel');
  if(existing){if(split&&existing.nextElementSibling!==split)split.insertAdjacentElement('beforebegin',existing);return;}
  const bar=document.createElement('div');bar.id='hlgbCutFilters';bar.className='toolbar';bar.style.cssText='align-items:flex-end;flex-wrap:wrap;margin:10px 0';
  bar.innerHTML='<div class="field" style="min-width:260px;flex:1"><label>Buscar corte</label><input id="hlgbCutSearch" placeholder="Pedido, cliente, produto ou cortador" oninput="hlgbCutApplyFilters()"></div><div class="field"><label>Urgência</label><select id="hlgbCutPriority" onchange="hlgbCutApplyFilters()"><option value="">Todas</option><option>Padrão</option><option>Urgente</option><option>Urgentíssimo</option></select></div><div class="field"><label>Cortador</label><select id="hlgbCutCutter" onchange="hlgbCutApplyFilters()"><option value="">Todos</option></select></div><div class="field"><label>Data do corte</label><input id="hlgbCutDate" type="date" onchange="hlgbCutApplyFilters()"></div><button type="button" class="secondary" onclick="hlgbCutClearFilters()">Limpar</button><button type="button" class="secondary" onclick="hlgbCutToggleExtra()">Seções adicionais</button><div id="hlgbCutFilterCount" class="sub" style="align-self:center"></div>';
  (document.getElementById('hlgbCutSplitPanel')||root).insertAdjacentElement('beforebegin',bar);
}
function syncCutters(){
  const sel=document.getElementById('hlgbCutCutter');if(!sel)return;const cur=sel.value;
  sel.innerHTML='<option value="">Todos</option>'+arr('cutters').filter(c=>c.active!==false).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR')).map(c=>'<option value="'+sid(c.id)+'">'+String(c.name||'Cortador').replace(/</g,'&lt;')+'</option>').join('');
  if([...sel.options].some(o=>o.value===cur))sel.value=cur;
}
function setFilterVisible9709(row,visible){
 // Only restore visibility owned by this filter. Never unhide a split aggregate.
 if(!visible){if(row.dataset.hlgbCutFilterHidden!=='1'){row.dataset.hlgbCutFilterPrevious=row.style.display||'';row.dataset.hlgbCutFilterHidden='1'}row.style.display='none'}
 else if(row.dataset.hlgbCutFilterHidden==='1'){row.style.display=row.dataset.hlgbCutFilterPrevious||'';delete row.dataset.hlgbCutFilterHidden;delete row.dataset.hlgbCutFilterPrevious}
}
function apply(){
 ensureToolbar();syncCutters();
 const root=document.getElementById('cutTable'),panel=document.getElementById('hlgbCutSplitPanel');if(!root)return;
 const filters={q:norm(document.getElementById('hlgbCutSearch')?.value||'').replace(/#/g,'').trim(),priority:document.getElementById('hlgbCutPriority')?.value||'',cutter:document.getElementById('hlgbCutCutter')?.value||'',date:document.getElementById('hlgbCutDate')?.value||''};
 const active=!!(filters.q||filters.priority||filters.cutter||filters.date),idx=cutIndex9709(),stats={legacyRows:0,modelRows:0,shown:0,unresolved:0};
 const run=(row,model)=>{
  const id=cutIdentity9709(row),cut=idx.cuts.get(id);
  if(!id||!cut){if(id)stats.unresolved++;return} // headings, placeholders and unresolved identities remain untouched
  if(!model&&row.dataset.hlgbSplitAggregateHidden==='1'){delete row.dataset.hlgbCutFilterHidden;delete row.dataset.hlgbCutFilterPrevious;row.style.display='none';return}
  const meta=cutMeta9709(cut,idx);stats[model?'modelRows':'legacyRows']++;
  const completed=meta.completed;
  const visible=(model||!completed)&&matchesCut9709(meta,filters);
  setFilterVisible9709(row,visible);if(visible&&row.style.display!=='none')stats.shown++;
  if(!model&&!row.querySelector('.hlgbCutMeta')){
   const cell=row.children?.[2];if(cell){const el=document.createElement('div');el.className='sub hlgbCutMeta';el.textContent='📅 '+(meta.date||'Sem data')+' · ✂️ '+meta.cutterName;cell.appendChild(el)}
  }
 };
 root.querySelectorAll('tbody tr').forEach(row=>run(row,false));
 panel?.querySelectorAll('[data-hlgb-cut-model-id]').forEach(row=>run(row,true));
 panel?.querySelectorAll('[data-hlgb-cut-order-group]').forEach(group=>{const rows=Array.from(group.querySelectorAll('[data-hlgb-cut-model-id]'));setFilterVisible9709(group,!active||!rows.length||rows.some(row=>row.style.display!=='none'))});
 filterEvidence9709={...stats,observed:true,at:new Date().toISOString()};
 const count=document.getElementById('hlgbCutFilterCount');if(count)count.textContent=stats.shown+' de '+(stats.legacyRows+stats.modelRows)+' corte(s)'+(stats.unresolved?' · '+stats.unresolved+' identidade(s) não verificadas':'');
}

/* v96.43: read-only bridge to material separation, without moving legacy controls. */
const cutSeparationWorkspace9643=window.HLGB_CUT_SEPARATION_CORE_9647?.workspace;
function separationAllowed9643(){try{return window.__HLGB_AUTH_READY===true&&typeof canOpenPage==='function'&&canOpenPage('corte')&&canOpenPage('pedidos')&&canOpenPage('materiais')&&canOpenPage('produtos')}catch(_){return false}}
function inspectWorkspace9643(){
 if(!cutSeparationWorkspace9643||!cutChecklist9644)return {state:'unavailable',rows:[],issues:['separation-core-unavailable']};
 const authority=window.hlgbWriteoffIntegrity9391;if(typeof authority?.pairIndex!=='function')return {state:'unavailable',rows:[],issues:['writeoff-authority-unavailable']};
 const pairs=authority.pairIndex();return cutSeparationWorkspace9643.inspect(typeof db!=='undefined'?db:window.db,separationAllowed9643(),pairs);
}

/* v96.44: editable local draft; no storage, remote calls or canonical confirmations. */
const cutChecklist9644=window.HLGB_CUT_SEPARATION_CORE_9647?.checklist;
const cutDrafts9644=new Map();let cutDraftOwner9644='';
function draftOwner9644(){
 if(!separationAllowed9643())return '';
 try{const u=typeof currentUser==='function'?currentUser():null;return u&&u.active!==false?String(u.id||u.email||u.user||'').trim():''}catch(_){return ''}
}
function clearCutDrafts9644(){cutDrafts9644.clear();cutDraftOwner9644=''}
function bindDraftOwner9644(){const owner=draftOwner9644();if(owner!==cutDraftOwner9644){clearCutDrafts9644();cutDraftOwner9644=owner}return owner}
function addChecklistDraft9644(card,row,el){
 const owner=bindDraftOwner9644();if(!owner)return;
 const key=JSON.stringify([row.orderId,row.productId]),sig=cutChecklist9644.signature(row);
 let entry=cutDrafts9644.get(key);
 const editor=el('details','',card);el('summary','Preencher checklist e anexos (rascunho)',editor);
 const info=el('p','Rascunho apenas nesta sessão. Não confirma a separação e não envia documentos à nuvem.',editor);
 info.setAttribute('role','status');
 function valid(){if(!editor.isConnected||bindDraftOwner9644()!==owner)return false;try{return inspectWorkspace9643().rows.some(x=>x.orderId===row.orderId&&x.productId===row.productId&&cutChecklist9644.signature(x)===sig)}catch(_){return false}}
 function getEntry(){if(!valid())return null;let e=cutDrafts9644.get(key);if(e&&e.draft.signature!==sig)return null;if(!e){if(cutDrafts9644.size>=10)return null;e={draft:cutChecklist9644.initial(row),files:[],open:true};cutDrafts9644.set(key,e)}return e}
 if(entry&&entry.draft.signature!==sig){
  el('p','Pedido, grade, materiais ou progresso mudou. Revise o rascunho antes de preencher novamente.',editor);
  const reset=el('button','Descartar rascunho desatualizado',editor);reset.type='button';reset.className='secondary';reset.onclick=()=>{if(!valid())return;if(confirm('Descartar somente o rascunho local e seus anexos?')){cutDrafts9644.delete(key);renderSeparationWorkspace9643()}};return;
 }
 if(entry?.open)editor.open=true;
 function field(label,value,max,onchange,parent=editor){const wrap=el('label','',parent);wrap.style.cssText='display:block;margin:8px 0';el('span',label,wrap);const input=el('input','',wrap);input.type='text';input.value=value||'';input.maxLength=max;input.style.cssText='display:block;width:100%;box-sizing:border-box;min-width:0';input.addEventListener('input',()=>{const e=getEntry();if(e)onchange(e,input.value);else info.textContent='Rascunho não atualizado: sessão ou dados mudaram, ou limite local atingido.'});return input}
 editor.addEventListener('toggle',()=>{const e=cutDrafts9644.get(key);if(e&&valid())e.open=editor.open});
 const draft=entry?.draft||cutChecklist9644.initial(row);
 field('Quem separou',draft.responsible,120,(e,v)=>e.draft.responsible=v);
 row.materials.forEach((m,i)=>{const box=el('div','',editor);box.className='panel';el('strong',m.name+' · necessidade estimada: '+Number(m.amount).toLocaleString('pt-BR',{maximumFractionDigits:3})+' '+m.unit,box);
 const qty=field('Quantidade fisicamente separada ('+m.unit+')',draft.lines[i]?.actual,14,(e,v)=>e.draft.lines[i].actual=v,box);qty.inputMode='decimal';
 field('Observação / motivo da falta',draft.lines[i]?.note,250,(e,v)=>e.draft.lines[i].note=v,box)});
 field('Observações da conferência',draft.note,500,(e,v)=>e.draft.note=v);
 const review=el('button','Conferir rascunho e faltas',editor);review.type='button';review.className='secondary';
 const results=el('div','',editor);results.setAttribute('aria-live','polite');
 review.onclick=()=>{const e=getEntry();results.replaceChildren();if(!e){el('p','Revise a sessão ou o pedido antes de continuar.',results);return}const result=cutChecklist9644.review(row,e.draft);el('p',result.state==='incomplete'?'Preenchimento incompleto.':result.state==='shortage-observed'?'Há materiais faltantes ou parcialmente separados.':'Quantidades informadas suficientes para a estimativa; ainda sem confirmação.',results);for(const l of result.lines)el('p',l.name+': '+(l.shortage===null?'Não conferido':'Falta estimada '+l.shortage.toLocaleString('pt-BR',{maximumFractionDigits:6})+' '+l.unit),results);};
 const label=el('label','Selecionar foto ou PDF da folha (até 5 MB por arquivo; máximo 3)',editor);label.style.display='block';
 const picker=el('input','',label);picker.type='file';picker.accept='application/pdf,image/jpeg,image/png,image/webp';picker.style.maxWidth='100%';
 const files=el('div','',editor);
 function paint(){files.replaceChildren();const e=cutDrafts9644.get(key);for(const f of e?.files||[]){const line=el('p',f.info.name+' · '+Math.ceil(f.info.size/1024)+' KB · somente selecionado',files);const remove=el('button','Remover seleção',line);remove.type='button';remove.className='secondary';remove.onclick=()=>{if(!valid())return;e.files=e.files.filter(x=>x!==f);paint()}}}
 picker.addEventListener('change',async()=>{const file=picker.files?.[0];picker.value='';if(!file)return;const e=getEntry();if(!e||e.files.length>=3||file.size>cutChecklist9644.maxBytes){info.textContent='Arquivo não selecionado: limite ou sessão inválida.';return}try{const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());const meta=cutChecklist9644.fileInfo(file.name,file.size,bytes);if(!valid()||cutDrafts9644.get(key)!==e)return;if(!meta){info.textContent='Formato inválido. Selecione PDF, JPEG, PNG ou WebP.';return}if(e.files.length>=3||e.files.some(x=>x.info.name===meta.name&&x.info.size===meta.size&&x.file.lastModified===file.lastModified)){info.textContent='Limite de arquivos ou seleção repetida.';return}e.files.push({file,info:meta});info.textContent='Arquivo selecionado apenas nesta sessão. Ainda não enviado.';paint()}catch(_){info.textContent='Não foi possível ler o arquivo.'}});
 paint();

 const exportBtn=el('button','Exportar checklist e documentos (ZIP)',editor);exportBtn.type='button';exportBtn.className='secondary';
 let exporting=false;
 exportBtn.onclick=async()=>{
  if(exporting)return;const e=getEntry();if(!e){info.textContent='Revise a sessão e o pedido.';return}
  if(!window.HLGBCutDossier9661||!window.crypto?.subtle){info.textContent='Exportação segura indisponível neste navegador.';return}
  const draft=JSON.parse(JSON.stringify(e.draft)),selected=e.files.slice();exporting=true;exportBtn.disabled=true;
  const unchanged=()=>valid()&&cutDrafts9644.get(key)===e&&JSON.stringify(e.draft)===JSON.stringify(draft)&&e.files.length===selected.length&&e.files.every((x,i)=>x===selected[i]);
  try{
   const documents=[];for(const f of selected){if(!unchanged())throw Error('stale');documents.push({name:f.info.name,bytes:new Uint8Array(await f.file.arrayBuffer())})}
   const digest=async bytes=>Array.from(new Uint8Array(await window.crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
   const pack=await window.HLGBCutDossier9661.build(row,draft,documents,cutChecklist9644,digest);
   if(!unchanged())throw Error('stale');
   const url=URL.createObjectURL(new Blob([pack.bytes],{type:'application/zip'}));const link=document.createElement('a');link.href=url;link.download='corte-'+row.orderId.replace(/[^a-z0-9_-]/gi,'_')+'-modelo-'+row.productId.replace(/[^a-z0-9_-]/gi,'_')+'.zip';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
   info.textContent='Arquivo local solicitado ao navegador. Não confirma salvamento na nuvem, separação ou baixa de estoque.';
  }catch(_){if(valid())info.textContent='Não foi possível exportar: confira todos os materiais, responsável, documentos e alterações do pedido.'}finally{exporting=false;exportBtn.disabled=false}
 };

}

let materialsEvidence9711={observed:false,inline:null,fallback:null,ambiguous:null};
function removeInlineMaterials9711(root){root?.querySelectorAll?.('[data-hlgb-inline-materials9711]').forEach(x=>x.remove())}
function materialCard9711(parent,row,inline=false){
 const el=(tag,text,host=parent)=>{const x=document.createElement(tag);x.textContent=text;host.appendChild(x);return x};
 const fmt=x=>Number(x).toLocaleString('pt-BR',{maximumFractionDigits:3});
 const card=el('article','',parent);card.className='panel';el('h3','Pedido #'+row.orderNumber+' · '+row.productName,card);el('p',row.ordered+' peças pedidas · Separadas (local): '+(row.separatedObserved===null?'Revisar histórico':row.separatedObserved),card);
   const detail=el('details','',card);el('summary','Checklist de material — consulta',detail);
   for(const m of row.materials)el('p',m.name+' · '+fmt(m.amount)+' '+m.unit+' necessários (estimativa)',detail);
   if(row.issues.length)el('p','Revisão necessária: '+row.issues.join(', '),detail);
   const actions=el('div','',card);actions.className='toolbar';
   const sep=el('button','Abrir separação do pedido',actions);sep.type='button';sep.className='secondary';sep.onclick=()=>{if(!separationAllowed9643())return;try{if(typeof page==='function'&&typeof selectSeparationOrder==='function'){page('pedidos',null);selectSeparationOrder(row.orderId)}}catch(_){alert('Separação indisponível. Abra pelo menu de Pedidos.')}};
   const print=el('button','Folha de corte do modelo',actions);print.type='button';print.className='secondary';print.disabled=!row.cutId;print.onclick=()=>{if(!separationAllowed9643()||!row.cutId)return;const fresh=inspectWorkspace9643().rows.find(x=>x.orderId===row.orderId&&x.productId===row.productId&&x.cutId===row.cutId);if(!fresh||typeof window.printCuttingSheet!=='function'){alert('Corte precisa de revisão antes de imprimir.');return}window.printCuttingSheet(row.orderId,row.cutId)};
   if(!row.cutId)el('p','Folha individual disponível quando houver corte identificado; impressão antiga permanece em Pedidos.',card);
   addChecklistDraft9644(card,row,el);
 if(inline){card.className='hlgb-inline-material-card9711';card.style.cssText='min-width:0;padding:8px 0';}
 return card;
}
function renderSeparationWorkspace9643(){
 const root=document.getElementById('corte'),table=document.getElementById('cutTable');if(!root||!table)return;
 let host=document.getElementById('hlgbCutSeparation9643');
 if(!separationAllowed9643()){clearCutDrafts9644();removeInlineMaterials9711(root);host?.remove();materialsEvidence9711={observed:false,inline:null,fallback:null,ambiguous:null};return}
 bindDraftOwner9644();
 if(!root.classList.contains('active')){removeInlineMaterials9711(root);host?.remove();return}
 const focused=document.activeElement;
 if(focused?.matches?.('input,textarea,select')&&(host?.contains(focused)||focused.closest?.('[data-hlgb-inline-materials9711]')))return;
 if(!host){host=document.createElement('section');host.id='hlgbCutSeparation9643';host.className='panel';table.closest('.panel')?.insertAdjacentElement('beforebegin',host)}
 const el=(tag,text,parent=host)=>{const x=document.createElement(tag);x.textContent=text;parent.appendChild(x);return x};
 const previousQuery=host.querySelector('input[type=search]')?.value||'';
 let result;try{result=inspectWorkspace9643()}catch(_){result={state:'unavailable',rows:[],issues:[]}}
 if(result.state!=='local-observation'){removeInlineMaterials9711(root);host.replaceChildren();host.hidden=false;el('h2','Materiais e separação por modelo');el('p','Dados necessários ainda não disponíveis.');materialsEvidence9711={observed:false,inline:null,fallback:null,ambiguous:null};return}
 const targets=new Map(),idx=cutIndex9709();
 for(const card of Array.from(root.querySelectorAll('[data-hlgb-cut-model-id]'))){
  const id=cutIdentity9709(card);if(!id)continue;targets.set(id,targets.has(id)?null:card)
 }
 // Legacy rows can also host material details when the exact model and cut are established.
 for(const tr of Array.from(table.querySelectorAll('tbody tr'))){
  if(tr.dataset.hlgbSplitAggregateHidden==='1')continue;
  const id=cutIdentity9709(tr);if(!id||targets.has(id))continue;
  const cut=idx.cuts.get(id);if(!cut||!cut.productId||cutMeta9709(cut,idx).completed)continue;
  targets.set(id,tr.lastElementChild||null);
 }
 const attached=new Set(),fallback=[];let ambiguous=0;
 for(const row of result.rows){
  const id=sid(row.cutId),cut=idx.cuts.get(id),target=targets.get(id);
  if(!id||!cut||!target||sid(cut.orderId)!==sid(row.orderId)||sid(cut.productId)!==sid(row.productId)||attached.has(target)){
   fallback.push(row);if(id&&!target)ambiguous++;continue
  }
  attached.add(target);
  let detail=target.querySelector(':scope > [data-hlgb-inline-materials9711]');
  const sig=cutChecklist9644.signature(row);
  if(detail&&detail.__hlgbMaterialSignature9711===sig)continue;
  const wasOpen=detail?.open===true;
  detail?.remove();detail=document.createElement('details');detail.dataset.hlgbInlineMaterials9711='1';detail.__hlgbMaterialSignature9711=sig;detail.open=wasOpen;detail.style.cssText='margin-top:8px;min-width:0;max-width:100%';
  const summary=document.createElement('summary');summary.textContent='📦 Separação de materiais · '+row.materials.length+' item(ns)';detail.appendChild(summary);target.appendChild(detail);
  materialCard9711(detail,row,true);
 }
 for(const d of Array.from(root.querySelectorAll('[data-hlgb-inline-materials9711]')))if(!attached.has(d.parentElement))d.remove();
 host.replaceChildren();host.hidden=fallback.length===0;
 if(fallback.length){
  el('h2','Materiais e separação por modelo');el('p','Modelos ainda sem ficha de corte vinculada. Conferência e baixa continuam na rotina existente.');
  const field=el('input','');field.type='search';field.value=previousQuery;field.placeholder='Buscar pedido ou modelo';field.setAttribute('aria-label','Buscar pedido ou modelo em separação');
  const list=el('div','');
  function draw(){
   list.replaceChildren();const q=norm(field.value),visible=fallback.filter(x=>!q||norm(x.orderNumber+' '+x.productName).includes(q));
   el('p',visible.length+' modelo(s) observados.',list);
   for(const row of visible.slice(0,100))materialCard9711(list,row);
   if(visible.length>100)el('p','Mostrando 100 resultados; refine a busca para consultar os demais.',list);
  }
  field.addEventListener('input',draw);draw();
 }
 materialsEvidence9711={observed:true,inline:attached.size,fallback:fallback.length,ambiguous,at:new Date().toISOString()};
}

function clearFilters(){['hlgbCutSearch','hlgbCutPriority','hlgbCutCutter','hlgbCutDate'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});apply()}
function secondaryPanels(){
  const page=document.getElementById('corte');if(!page)return [];
  return [...page.querySelectorAll(':scope > .panel')].filter(p=>{const h=norm(p.querySelector('h2')?.textContent||'');return h.includes('cortes prontos')||h.includes('atribuicao de corte')||h.includes('distribuicao dos cortes')||h.includes('mercadoria sem nota')||h.includes('relatorio de necessidade')});
}
function applyExtraState(){
  let open=false;try{open=localStorage.getItem('hlgb_cut_extra_open_v1')==='1'}catch(e){}
  secondaryPanels().forEach(p=>{if(!p.dataset.hlgbCutOriginalDisplay)p.dataset.hlgbCutOriginalDisplay=p.style.display||'';p.style.display=open?p.dataset.hlgbCutOriginalDisplay:'none'});
}
function toggleExtra(){let open=false;try{open=localStorage.getItem('hlgb_cut_extra_open_v1')==='1';localStorage.setItem('hlgb_cut_extra_open_v1',open?'0':'1')}catch(e){}applyExtraState()}
window.hlgbCutApplyFilters=apply;window.hlgbCutClearFilters=clearFilters;window.hlgbCutToggleExtra=toggleExtra;window.hlgbCutOrganization={apply,secondaryPanels,cutIdentity9709,cutMeta9709,cutIndex9709,matchesCut9709,status:()=>({...filterEvidence9709}),renderMaterials:renderSeparationWorkspace9643,materialsStatus9711:()=>({...materialsEvidence9711})};
const old=window.renderCuts;if(typeof old==='function'&&!old.__hlgbOrgV1){const w=function(){const r=old.apply(this,arguments);setTimeout(()=>{apply();applyExtraState();renderSeparationWorkspace9643()},0);return r};w.__hlgbOrgV1=true;w.__original=old;window.renderCuts=w}
function boot(){try{apply();applyExtraState();renderSeparationWorkspace9643()}catch(e){console.warn('[HLGB corte organização]',e)}}try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,1000),0)}catch(e){}setTimeout(boot,1700);
window.HLGB_CUT_ORGANIZATION_GUARD=V;
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(renderSeparationWorkspace9643,0));
window.addEventListener?.('hlgb:logout',()=>{filterEvidence9709={observed:false,legacyRows:null,modelRows:null,shown:null,unresolved:null};clearCutDrafts9644();removeInlineMaterials9711(document.getElementById('corte'));materialsEvidence9711={observed:false,inline:null,fallback:null,ambiguous:null};document.getElementById('hlgbCutSeparation9643')?.remove()});
console.info('[HLGB] organização da aba Corte ativa');
})();