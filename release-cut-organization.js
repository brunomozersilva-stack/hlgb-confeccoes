/* HLGB — organização e busca da aba Corte */
(function(){
'use strict';
const V='2026.10.01-cut-organization-v1';
const sid=v=>String(v??''),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function cutIdentity9709(row){
 const explicit=sid(row?.dataset?.hlgbCutModelId||'');if(explicit)return explicit;
 const buttons=Array.from(row?.querySelectorAll?.('button[onclick]')||[]),ids=new Set();
 for(const b of buttons){const m=sid(b.getAttribute('onclick')).match(/^\s*(?:return\s+)?(?:editCut|hlgbEditCut9189|finishCut|viewCutGradeComparison)\(\s*(['"]?)([^'")\s]+)\1\s*\)\s*;?\s*$/);if(m)ids.add(m[2])}
 return ids.size===1?[...ids][0]:'';
}
function cutLive9819(x){return !!x&&x.deleted!==true&&x._deleted!==true&&!x.deletedAt&&!x.deleted_at}
function cutIndex9709(){
 const index=n=>{const map=new Map();for(const x of arr(n)){if(!cutLive9819(x)||x.id==null||!sid(x.id).trim())continue;const id=sid(x.id);map.set(id,map.has(id)?null:x)}return map};
 return {cuts:index('cuts'),orders:index('orders'),cutters:index('cutters'),products:index('products'),materials:index('materials')};
}
function cutMoney9712(c,p){
 // Use the same catalogue-based definition as legacy cutValue, not order total.
 const qty=Number(c.pieces),price=Number(p?.price);
 if(c.pieces==null||p?.price==null||String(p.price).trim()===''||!Number.isSafeInteger(qty)||qty<0||!Number.isFinite(price)||price<0)return null;
 const cents=Math.round(qty*price*100);return Number.isSafeInteger(cents)?cents:null;
}
function cutMeta9709(c,idx){
 const o=idx.orders.get(sid(c.orderId)),ct=idx.cutters.get(sid(c.cutterId)),p=idx.products.get(sid(c.productId));
 const materialNames=(Array.isArray(p?.materials)?p.materials:[]).map(m=>[m?.name,m?.materialName,idx.materials.get(sid(m?.materialId||m?.id))?.name].filter(Boolean).join(' '));
 return {orderNumber:sid(o?.orderNumber||o?.number||c.orderId||''),client:sid(o?.client||o?.clientName||c.client||''),model:sid(p?.name||c.product||''),valueCents:cutMoney9712(c,p),pieces:Number.isSafeInteger(Number(c.pieces))&&c.pieces!=null&&Number(c.pieces)>=0?Number(c.pieces):null,search:norm([c.id,c.orderId,'Pedido '+sid(o?.orderNumber||o?.number||c.orderId),o?.orderNumber,o?.number,o?.client,o?.clientName,c.product,p?.name,p?.code,p?.sku,p?.reference,ct?.name,c.op,c.status,o?.priority,c.date,c.plannedCutDate,...materialNames,...(Array.isArray(c.actualCutGrade)?c.actualCutGrade:[]).map(g=>idx.products.get(sid(g?.productId))?.name),...(Array.isArray(o?.grade)&&!c.productId?o.grade:[]).map(g=>idx.products.get(sid(g?.productId))?.name)].filter(v=>v!=null).join(' ')),priority:sid(o?.priority||'Padrão'),cutter:sid(c.cutterId||''),date:sid(c.plannedCutDate||c.date||'').slice(0,10),cutterName:ct?.name||'Sem cortador',completed:norm(c.status)==='finalizado'||norm(c.status).includes('desmembrado')||c.modelSplitParentV1===true||c.hiddenByModelSplitV1===true};
}
// These are required operational actions, independent of separation status.
function cutActionProof9820(c,idx){
 if(!cutLive9819(c)||!sid(c.id)||idx.cuts.get(sid(c.id))!==c||c.modelSplitParentV1||c.hiddenByModelSplitV1||/cancel|desmembrado/.test(norm(c.status)))return null;
 const order=idx.orders.get(sid(c.orderId));if(!order||!Array.isArray(order.grade))return null;
 const ids=[...new Set(order.grade.filter(g=>Number(g?.qty)>0).map(g=>sid(g?.productId)))];
 const pid=sid(c.productId)||(ids.length===1?ids[0]:'');
 const product=idx.products.get(pid);if(!pid||!product)return null;
 const ordered=order.grade.filter(g=>sid(g?.productId)===pid);
 if(!ordered.length)return null;
 const source=Array.isArray(c.actualCutGrade)&&c.actualCutGrade.length?c.actualCutGrade:Array.isArray(c.originalGrade)&&c.originalGrade.length?c.originalGrade:ordered;
 const grade=[],seen=new Set();let pieces=0;
 for(const g of source){
  const q=g?.qty,key=JSON.stringify([norm(g?.color),norm(g?.size)]);
  if(!g||g.productId!=null&&sid(g.productId)!==pid||g.orderId!=null&&sid(g.orderId)!==sid(c.orderId)||!norm(g.color)||!norm(g.size)||!(typeof q==='number'||typeof q==='string'&&/^\d+$/.test(q))||!Number.isSafeInteger(Number(q))||Number(q)<0||seen.has(key))return null;
  seen.add(key);if(Number(q)>0){grade.push({color:sid(g.color),size:sid(g.size),qty:Number(q)});pieces+=Number(q)}
 }
 if(!grade.length||!Number.isSafeInteger(pieces)||pieces<=0||norm(c.status)==='finalizado'&&pieces!==Number(c.pieces))return null;
 const materials=(Array.isArray(product.materials)?product.materials:[]).map(m=>{
  const cat=idx.materials.get(sid(m?.materialId)),name=sid(m?.name||cat?.name||'Material sem identificação'),unit=sid(m?.unit||cat?.unit||''),raw=m?.qty,loss=Number(m?.loss??0),q=Number(raw),mode=m?.calcMode||'consumption';
  const valid=(typeof raw==='number'||typeof raw==='string'&&/^\d+(\.\d+)?$/.test(raw))&&q>0&&Number.isFinite(q)&&Number.isFinite(loss)&&loss>=0&&!!unit&&['yield','consumption'].includes(mode);
  const amount=valid?(mode==='yield'?pieces/q:pieces*q)*(1+loss/100):null;
  const issues=[];
  if(!valid)issues.push(q===0&&raw!=null&&String(raw).trim()!==''?'Consumo zerado: informar quantidade na ficha técnica':'Consumo, perda ou unidade a conferir');
  if(m?.materialId!=null&&!cat)issues.push('Material vinculado não localizado ou duplicado no cadastro');
  if(m?.name&&cat?.name&&norm(m.name)!==norm(cat.name))issues.push('Vínculo divergente no cadastro: '+sid(cat.name));
  if(m?.unit&&cat?.unit&&norm(m.unit)!==norm(cat.unit))issues.push('Unidade divergente no cadastro: '+sid(cat.unit));
  const linkOK=!issues.some(x=>/vinculado|Vínculo|Unidade divergente/.test(x));
  const byColor=new Map();for(const g of grade)byColor.set(g.color,(byColor.get(g.color)||0)+g.qty);
  const conversion=((norm(cat?.purchaseUnit).includes('rolo')||norm(cat?.purchaseMode).includes('rolo'))?Number(cat?.purchaseConversion):norm(cat?.packageName).includes('rolo')?Number(cat?.packageAvg):0);
  const roll=n=>linkOK&&Number.isFinite(n)&&Number.isFinite(conversion)&&conversion>0?Math.ceil(n/conversion-1e-9):null;
  return {name,unit,issues,linkOK,amount:Number.isFinite(amount)?amount:null,category:sid(m?.category||m?.cat||cat?.category||cat?.cat||''),color:sid(m?.color||''),rolls:roll(amount??NaN),byColor:[...byColor].map(([color,count])=>{const a=valid?(mode==='yield'?count/q:count*q)*(1+loss/100):null;return {color,pieces:count,amount:Number.isFinite(a)?a:null,rolls:roll(a??NaN)}})};
 });
 return {cutId:sid(c.id),orderId:sid(order.id),productId:sid(product.id),orderNumber:sid(order.orderNumber||order.id),client:sid(order.client||order.clientName||''),model:sid(product.name||c.product),pieces,grade,materials,gradeSource:source===ordered?'pedido':source===c.actualCutGrade?'realizada':'corte',canWrite:false};
}
function requiredCutAllowed9820(){try{return window.__HLGB_AUTH_READY===true&&canOpenPage('corte')===true&&canOpenPage('pedidos')===true&&canOpenPage('produtos')===true}catch(_){return false}}
// Same compact grade/material columns used by the existing Facção checklist.
function cutChecklistMatrix9824(v){
 const sizes=[...new Set(v.grade.map(g=>g.size))],colors=[...new Set(v.grade.map(g=>g.color))];
 let sorted=[];try{if(typeof hlgbSortedSizes==='function')sorted=hlgbSortedSizes(db.sizes)||[]}catch(_){}
 const ss=[...new Set([...sorted.filter(x=>sizes.includes(x)),...sizes])];
 const esc=x=>sid(x).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 // Reuse the original renderer if all grade sizes are known to it; otherwise never omit a size.
 const api=window.hlgbFactionChecklistGrade;
 if(typeof api?.matrix==='function'&&sizes.every(x=>sorted.includes(x))){
  try{return api.matrix({productId:v.productId,qty:v.pieces,gradeV9198:v.grade.map(g=>({...g,productId:v.productId}))})}catch(_){}
 }
 const qty=(color,size)=>v.grade.filter(g=>g.color===color&&g.size===size).reduce((n,g)=>n+g.qty,0);
 return '<div class="hlgbChecklistMatrix" style="overflow:auto"><table><thead><tr><th>Cor</th>'+ss.map(x=>'<th>'+esc(x)+'</th>').join('')+'<th>Total</th></tr></thead><tbody>'+colors.map(color=>'<tr><td>'+esc(color)+'</td>'+ss.map(sz=>'<td>'+qty(color,sz)+'</td>').join('')+'<td>'+ss.reduce((n,sz)=>n+qty(color,sz),0)+'</td></tr>').join('')+'<tr><th>Total da grade</th>'+ss.map(sz=>'<th>'+colors.reduce((n,color)=>n+qty(color,sz),0)+'</th>').join('')+'<th>'+v.pieces+'</th></tr></tbody></table></div>';
}
function printCutChecklist9824(id){
 if(!openFullCutChecklist9820(id))return false;
 const host=document.getElementById('hlgbFullCutChecklist9820'),btn=host?.querySelector('[data-hlgb-print-checklist9824]');
 if(!btn)return false;btn.click();return true;
}
// Session-only cache; direct print remains compact.
const conferenceDrafts9828=new Map();let conferenceOwner9828='';
function conferenceIdentity9828(){
 let owner='';try{const u=typeof currentUser==='function'?currentUser():null;if(requiredCutAllowed9820()&&u?.active!==false)owner=sid(u?.id||u?.email||'').trim()}catch(_){}
 if(owner!==conferenceOwner9828){conferenceDrafts9828.clear();conferenceOwner9828=owner}return owner;
}
function openFullCutChecklist9820(id){
 const sessionOwner=conferenceIdentity9828();
 if(!requiredCutAllowed9820()){alert('Checklist indisponível: confira as permissões de Corte, Pedidos e Produtos.');return false}
 const idx=cutIndex9709(),v=cutActionProof9820(idx.cuts.get(sid(id)),idx);
 if(!v){alert('Não foi possível confirmar modelo e grade. Confira o corte antes de abrir o checklist.');return false}
 const old=document.getElementById('hlgbFullCutChecklist9820');old?.remove();
 const host=document.createElement('section');host.id='hlgbFullCutChecklist9820';host.setAttribute('role','dialog');host.setAttribute('aria-label','Checklist completo da peça');host.style.cssText='position:fixed;inset:10px;z-index:110001;background:white;color:#222;border:1px solid #bbb;border-radius:10px;padding:14px;overflow:auto;max-width:800px;margin:auto;box-shadow:0 0 0 100vmax rgba(0,0,0,.45)';
 const el=(tag,text,parent=host)=>{const x=document.createElement(tag);x.textContent=text;parent.appendChild(x);return x};
 el('h2','Checklist completo da peça');el('p','Pedido #'+v.orderNumber+' · '+v.client+' · '+v.model+' · '+v.pieces+' peças');el('p','Grade: '+v.gradeSource+' · Corte '+v.cutId);
 const close=el('button','Fechar checklist');close.type='button';close.onclick=()=>host.remove();
 const top=el('div','');top.className='toolbar';top.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:8px 0';
 top.appendChild(close);close.className='secondary';
 el('h3','Grade por cor e tamanho');const matrix=el('div','');matrix.innerHTML=cutChecklistMatrix9824(v);
 for(const table of matrix.querySelectorAll('table'))table.style.cssText='width:100%;border-collapse:collapse';
 el('h3','Matérias-primas e aviamentos da ficha técnica');
 el('p','Marcação de conferência somente nesta janela, sem baixa ou gravação. Quantidades estimadas para esta grade; confira fisicamente.');
 const fmt=n=>n===null?'A conferir':n.toLocaleString('pt-BR',{maximumFractionDigits:4});
 const mark=el('button','Marcar todos os materiais',host);mark.type='button';
 const grid=el('div','');grid.dataset.cutChecklistLines9823='1';grid.style.overflowX='auto';
 const table=el('table','',grid);table.style.cssText='width:100%;border-collapse:collapse';const head=el('tr','',el('thead','',table));
 for(const label of ['OK','Material','Categoria','Cor','Peças da cor','Quantidade por cor','Unidade','Rolos por cor'])el('th',label,head);
 const tbody=el('tbody','',table),conferenceRows=[];
 const warnings=v.materials.filter(m=>m.issues.length);
 if(warnings.length){const warning=el('div','');warning.setAttribute('role','note');warning.style.cssText='border:1px solid #a86a18;padding:8px;margin:8px 0';el('strong','Pendências da ficha técnica — conferir antes de separar',warning);for(const m of warnings)el('p',m.name+': '+m.issues.join('; '),warning);}
 el('p','Cada linha corresponde à quantidade necessária para a cor indicada. Rolos arredondados por cor, sem somar sobras de cores diferentes.');
 for(const m of v.materials){
  const splits=m.color?m.byColor.filter(x=>norm(x.color)===norm(m.color)):m.byColor;
  const lines=splits.length?splits:[{color:m.color||'A conferir',pieces:0,amount:null,rolls:null}];
  for(const color of lines){const row=el('tr','',tbody),cell=el('td','',row),check=el('input','',cell);check.type='checkbox';check.disabled=color.amount===null||!m.linkOK;check.setAttribute('aria-label',m.name+' '+color.color);
   el('td',m.name,row);el('td',m.category||'-',row);el('td',color.color,row);el('td',String(color.pieces||'A conferir'),row);el('td',fmt(color.amount)+(!m.linkOK&&color.amount!==null?' (estimativa; conferir vínculo)':''),row);el('td',m.unit||'-',row);el('td',color.rolls===null?'-':String(color.rolls),row);conferenceRows.push({row,m,color});
  }
 }
 for(const cell of host.querySelectorAll('th,td'))cell.style.cssText='border:1px solid #aaa;padding:5px;text-align:left;font-size:12px';
 mark.onclick=()=>{for(const cb of grid.querySelectorAll('input[type=checkbox]:not(:disabled)'))cb.checked=true};
 if(!v.materials.length)el('p','Nenhuma matéria-prima cadastrada. Confira a ficha técnica antes da separação.');
 // Optional detailed conference preserves the compact direct-print route.
 if(conferenceRows.length){
  const detailed=el('button','Conferir quantidades por cor',top);detailed.type='button';detailed.className='secondary';
  detailed.onclick=()=>{
   if(!requiredCutAllowed9820()||!host.isConnected||host.querySelector('[data-hlgb-color-conference9827]'))return;
   const panel=el('section','');panel.dataset.hlgbColorConference9827='1';grid.insertAdjacentElement('afterend',panel);
   const cacheKey=JSON.stringify([v.cutId,v.orderId,v.productId]),signature=JSON.stringify(v);
   const cached=sessionOwner&&conferenceIdentity9828()===sessionOwner?conferenceDrafts9828.get(cacheKey):null;
   const restored=cached?.signature===signature?cached:null;
   const status=el('p',restored?'Rascunho desta sessão recuperado.':cached?'Grade ou ficha técnica mudou. Os valores antigos não foram reaplicados.':'Rascunho somente nesta sessão; não salvo na nuvem.',panel);
   status.setAttribute('role','status');
   const fields=[],selected=restored?.files?.slice()||[];
   const current=()=>{
    if(!host.isConnected||!panel.isConnected||!sessionOwner||conferenceIdentity9828()!==sessionOwner)return false;
    const now=cutIndex9709(),fresh=cutActionProof9820(now.cuts.get(v.cutId),now);
    return JSON.stringify(fresh)===signature;
   };
   function capture(){
    if(!host.isConnected||!panel.isConnected||!sessionOwner||conferenceIdentity9828()!==sessionOwner)return;
    const now=cutIndex9709(),fresh=cutActionProof9820(now.cuts.get(v.cutId),now);
    if(JSON.stringify(fresh)!==signature){status.textContent='Grade ou ficha alterada. Reabra a conferência.';return}
    if(conferenceDrafts9828.size>=20&&!conferenceDrafts9828.has(cacheKey))conferenceDrafts9828.delete(conferenceDrafts9828.keys().next().value);
    conferenceDrafts9828.set(cacheKey,{signature,values:fields.map(x=>x.value),checks:conferenceRows.map(x=>!!x.row.querySelector('input[type=checkbox]')?.checked),files:selected.slice()});
    status.textContent='Rascunho mantido nesta sessão; não salvo na nuvem.';
   }
   el('h3','Conferência física por cor — rascunho',panel);el('p','Não salva na nuvem nem confirma baixa. Informe a quantidade realmente separada de cada cor.',panel);
   const field=(parent,label,max)=>{const wrap=el('label',label+' ',parent),input=el('input','',wrap);input.type='text';input.maxLength=max;input.setAttribute('aria-label',label);input.style.cssText='max-width:100%;box-sizing:border-box';fields.push(input);input.addEventListener('input',capture);return input};
   field(panel,'Responsável pela conferência',120);
   field(panel,'Observações gerais da conferência',500);
   const wrap=el('div','',panel);wrap.style.overflowX='auto';
   const tab=el('table','',wrap),hdr=el('tr','',el('thead','',tab));for(const name of ['Material','Cor','Necessário','Separado','Falta','Observação'])el('th',name,hdr);
   const body=el('tbody','',tab);
   for(const {m,color} of conferenceRows){
    const tr=el('tr','',body),verified=m.linkOK&&color.amount!==null;
    el('td',m.name,tr);el('td',color.color,tr);el('td',verified?fmt(color.amount)+' '+m.unit:'A conferir',tr);
    const amount=field(el('td','',tr),'Quantidade separada — '+m.name+' — '+color.color,16);amount.inputMode='decimal';amount.style.width='90px';
    const shortage=el('td','Não conferido',tr);
    field(el('td','',tr),'Observação — '+m.name+' — '+color.color,250);
    amount.addEventListener('input',()=>{
     const raw=amount.value.trim().replace(',','.');
     const number=/^\d{1,9}(?:\.\d{1,6})?$/.test(raw)?Number(raw):null;
     amount.setAttribute('aria-invalid',String(raw!==''&&number===null));
     shortage.textContent=number===null?'Não conferido':!verified?'A conferir':fmt(Math.max(0,color.amount-number))+' '+m.unit;
    });
   }
   for(const cell of panel.querySelectorAll('th,td'))cell.style.cssText='border:1px solid #aaa;padding:5px;text-align:left;font-size:12px';
   if(restored&&restored.values.length===fields.length&&restored.checks.length===conferenceRows.length){
    fields.forEach((input,i)=>{input.value=restored.values[i]});
    conferenceRows.forEach((x,i)=>{const cb=x.row.querySelector('input[type=checkbox]');if(cb&&!cb.disabled)cb.checked=restored.checks[i]===true});
    fields.forEach(input=>input.dispatchEvent(new Event('input')));
    status.textContent='Rascunho desta sessão recuperado.';
   }
   // Keep the photos/PDFs beside their actual per-color conference, not in a separate total-only form.
   const docs=el('section','',panel);docs.dataset.hlgbConferenceDocs9834='1';
   el('h3','Fotos e PDFs desta conferência',docs);
   el('p','Até 3 arquivos de 5 MB por conferência e 30 MB por sessão. Seleção mantida apenas nesta sessão; não enviada à nuvem.',docs);
   const label=el('label','Selecionar foto ou PDF da conferência',docs),picker=el('input','',label);
   picker.type='file';picker.accept='application/pdf,image/jpeg,image/png,image/webp';picker.style.maxWidth='100%';
   const message=el('p','',docs);message.setAttribute('role','status');
   const listing=el('div','',docs);
   function paintFiles(){
    listing.replaceChildren();
    for(const f of selected){
     const line=el('p',f.info.name+' · '+Math.ceil(f.info.size/1024)+' KB · somente selecionado',listing);
     const save=el('button','Baixar arquivo selecionado',line);save.type='button';save.className='secondary';
     save.onclick=()=>{if(!current())return;const url=URL.createObjectURL(f.file);const a=document.createElement('a');a.href=url;a.download=f.info.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000)};
     const remove=el('button','Remover arquivo selecionado',line);remove.type='button';remove.className='secondary';
     remove.onclick=()=>{if(!current())return;const at=selected.indexOf(f);if(at<0)return;selected.splice(at,1);capture();paintFiles()};
    }
   }
   let selecting=false;
   picker.addEventListener('change',async()=>{
    const file=picker.files?.[0];picker.value='';if(!file||selecting)return;
    if(!current()||selected.length>=3||!cutChecklist9644||file.size>cutChecklist9644.maxBytes){message.textContent='Arquivo não selecionado: limite ou sessão inválida.';return}
    selecting=true;picker.disabled=true;
    try{
     const bytes=new Uint8Array(await file.arrayBuffer()),meta=cutChecklist9644.fileInfo(file.name,file.size,bytes);
     if(!current())return;
     if(!meta){message.textContent='Formato inválido. Selecione PDF, JPEG, PNG ou WebP.';return}
     if(!window.crypto?.subtle){message.textContent='Verificação de arquivo indisponível neste navegador.';return}
     const sha=Array.from(new Uint8Array(await window.crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
     if(!current())return;
     if(selected.length>=3||selected.some(x=>x.sha===sha)){message.textContent='Limite de arquivos ou conteúdo repetido.';return}
     const total=[...conferenceDrafts9828.entries()].filter(([k])=>k!==cacheKey).reduce((n,[,d])=>n+(d.files||[]).reduce((a,x)=>a+x.info.size,0),0)+selected.reduce((n,x)=>n+x.info.size,0)+file.size;
     if(total>30*1024*1024){message.textContent='Limite de 30 MB de documentos nesta sessão atingido.';return}
     selected.push({file,info:meta,sha});capture();paintFiles();message.textContent='Arquivo selecionado apenas nesta sessão. Ainda não enviado.';
    }catch(_){if(current())message.textContent='Não foi possível verificar o arquivo.'}finally{selecting=false;picker.disabled=false}
   });
   paintFiles();
   // Optional isolated persistence adapter. No commercial loader installs it.
   // A missing adapter never disables the existing local conference or printing.
   if(window.HLGBCutChecklistPersistence9835?.mount&&sessionOwner){
    try{window.HLGBCutChecklistPersistence9835.mount({
     panel,source:v,current,owner:sessionOwner,
     fields:()=>({responsible:fields[0]?.value||'',note:fields[1]?.value||'',lines:conferenceRows.map(({row,m,color},i)=>({name:m.name,color:color.color,unit:m.unit,pieces:color.pieces,required:m.linkOK?color.amount:null,actual:fields[2+i*2]?.value||'',note:fields[3+i*2]?.value||'',checked:!!row.querySelector('input[type=checkbox]')?.checked}))}),
     documents:()=>selected.slice()
    })}catch(_){}
   }
   grid.addEventListener('change',capture);mark.addEventListener('click',capture);
   const discard=el('button','Descartar rascunho desta sessão',panel);discard.type='button';discard.className='secondary';
   discard.onclick=()=>{if(!host.isConnected||conferenceIdentity9828()!==sessionOwner||!confirm('Descartar somente os valores da conferência desta sessão?'))return;conferenceDrafts9828.delete(cacheKey);panel.remove();grid.removeEventListener('change',capture);mark.removeEventListener('click',capture);detailed.disabled=false;};
   detailed.disabled=true;
  };
 }
 const compose=el('div','');try{const order=idx.orders.get(v.orderId);if(typeof compositionTableForProduct==='function'){compose.innerHTML=compositionTableForProduct({...order,grade:v.grade.map(g=>({...g,productId:v.productId}))},v.productId,true)||''}}catch(_){el('p','Composição indisponível: confira a ficha técnica.',compose)}
 const print=el('button','Imprimir folha de pedido do corte');print.type='button';print.onclick=()=>printRequiredCut9820(v.cutId);
 const checklistPrint=el('button','Imprimir checklist de separação',top);checklistPrint.type='button';checklistPrint.className='primary';checklistPrint.dataset.hlgbPrintChecklist9824='1';top.insertBefore(checklistPrint,close);checklistPrint.onclick=()=>{
  if(!requiredCutAllowed9820()||!host.isConnected)return;
  if(host.querySelector('[data-hlgb-color-conference9827]')&&conferenceIdentity9828()!==sessionOwner){alert('Sessão alterada. Reabra o checklist.');host.remove();return}
  const freshIdx=cutIndex9709(),fresh=cutActionProof9820(freshIdx.cuts.get(v.cutId),freshIdx);if(JSON.stringify(fresh)!==JSON.stringify(v)){alert('A grade ou ficha mudou. Reabra o checklist.');return}
  const html=host.cloneNode(true);html.querySelectorAll('[data-hlgb-persistence9835],button,[data-hlgb-conference-docs9834] input,[data-hlgb-conference-docs9834] label,[data-hlgb-conference-docs9834] [role=status]').forEach(n=>n.remove());const original=[...host.querySelectorAll('input[type=checkbox]')];[...html.querySelectorAll('input[type=checkbox]')].forEach((n,i)=>{const text=document.createTextNode(original[i]?.checked?'☑ ':'☐ ');n.replaceWith(text)});const inputs=[...host.querySelectorAll('[data-hlgb-color-conference9827] input:not([type=file])')];[...html.querySelectorAll('[data-hlgb-color-conference9827] input')].forEach((n,i)=>{const input=inputs[i];n.replaceWith(document.createTextNode(input?.getAttribute('aria-invalid')==='true'?'Valor inválido':input?.value||'________________'))});html.removeAttribute('style');
  const page='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Checklist de separação</title><style>@page{size:A4;margin:10mm}body{font:12px Arial;color:#222}h2{font-size:19px}h3{font-size:14px}h2,h3{margin:8px 0}p{margin:4px 0}table{border-collapse:collapse;width:100%;margin:6px 0}td,th{border:1px solid #aaa;padding:4px}th{background:#eee}tr{break-inside:avoid}thead{display:table-header-group}</style><body><h1 style="font-size:20px;margin:0 0 8px">HLGB Confecções</h1>'+html.innerHTML+'<p>Responsável: _____________________ Data: ____/____/____</p><p>Faltas / observações: __________________________________________</p></body></html>';
  let popup;try{popup=window.open('','_blank')}catch(_){}
  if(popup){try{popup.document.open();popup.document.write(page);popup.document.close();popup.focus?.();popup.print?.();return}catch(_){try{popup.close()}catch(_){}}}
  if(typeof window.hlgbCutterSheetV9523?.previewOnPage9523==='function'){host.remove();window.hlgbCutterSheetV9523.previewOnPage9523(page)}else alert('Permita a abertura da janela para imprimir o checklist.');
 };
 const sep=el('button','Abrir separação e confirmar quantidades');sep.type='button';sep.onclick=()=>{
  if(!separationAllowed9643()||!host.isConnected){alert('Confira as permissões da separação.');return}
  let rows;try{rows=inspectWorkspace9643().rows.filter(x=>x.orderId===v.orderId&&x.productId===v.productId&&(!x.cutId||x.cutId===v.cutId))}catch(_){rows=[]}
  if(rows.length!==1){alert('A baixa deste modelo não está disponível para a situação atual do pedido. Confira o progresso existente; nenhuma baixa foi feita.');return}
  if(openModelSeparation9715(rows[0]))host.remove();else alert('Não foi possível abrir a separação original. Nenhuma baixa foi feita.');
 };
 const details=Array.from(document.querySelectorAll('[data-hlgb-inline-materials9711]')).find(x=>x.dataset.hlgbCutId9820===v.cutId);
 if(details){const draft=el('button','Abrir checklist de separação, faltas e anexos');draft.type='button';draft.onclick=()=>{if(!requiredCutAllowed9820()||!details.isConnected)return;host.remove();details.open=true;const editor=Array.from(details.querySelectorAll('details')).find(x=>x.querySelector('summary')?.textContent==='Preencher checklist e anexos (rascunho)');if(editor)editor.open=true;details.scrollIntoView?.({block:'nearest'})}}
 document.body.appendChild(host);return true;
}
function printRequiredCut9820(id){
 if(!requiredCutAllowed9820())return false;
 const idx=cutIndex9709(),v=cutActionProof9820(idx.cuts.get(sid(id)),idx);
 if(!v){alert('Folha indisponível: confira a identificação do corte.');return false}
 // The required action refers to the exact model, not the order-level
 // heuristic used by legacy print callers. Keep the complete existing sheet.
 const api=window.hlgbCutterSheetV9523;
 if(typeof api?.printSheet==='function'){
  const order=idx.orders.get(v.orderId),cut=idx.cuts.get(v.cutId);
  try{return api.printSheet(order,cut)}catch(e){alert('Não foi possível abrir a folha completa: '+sid(e?.message||e));return false}
 }
 if(typeof window.printCuttingSheet!=='function'){alert('Folha indisponível: recarregue a rotina de impressão.');return false}
 return window.printCuttingSheet(v.orderId,v.cutId);
}
function ensureRequiredCutActions9820(row,c,model){
 if(!row?.querySelectorAll||typeof document.createElement!=='function')return;
 const existing=Array.from(row.querySelectorAll('[data-hlgb-required-cut9820]')).filter(x=>x.hasAttribute?.('data-hlgb-required-cut9820'));
 if(!requiredCutAllowed9820()||!cutLive9819(c)||c.modelSplitParentV1||c.hiddenByModelSplitV1||/cancel|desmembrado|finalizado/.test(norm(c.status))){existing.forEach(x=>x.remove());return}
 const host=model?(Array.from(row.querySelectorAll('.toolbar')).find(n=>!n.closest('details'))||row):Array.from(row.children).filter(x=>!x.hasAttribute('data-hlgb-cut-summary9761')).at(-1);
 if(!host)return;
 let actions=existing[0];if(!actions){actions=document.createElement('div');actions.dataset.hlgbRequiredCut9820=sid(c.id);actions.className='toolbar';actions.style.cssText='display:flex;flex-wrap:wrap;gap:6px';host.appendChild(actions);
 const required=[];if(!row.querySelector('.hlgb-native-cut-checklist9823'))required.push(['Checklist completo da peça',openFullCutChecklist9820]);
 if(!row.querySelector('.hlgb-native-cut-checklist-print9824'))required.push(['Imprimir checklist',printCutChecklist9824]);
 if(!row.querySelector('.hlgb-native-cut-print9822,.hlgbSheetMaterials9523'))required.push(['Imprimir folha de pedido do corte',printRequiredCut9820]);
 for(const [label,fn] of required){const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=label;if(fn===printRequiredCut9820)button.dataset.hlgbPrintRequired9822='1';button.onclick=()=>{if(!row.isConnected||cutIdentity9709(row)!==sid(c.id))return;fn(c.id)};actions.appendChild(button)}
 }
 existing.slice(1).forEach(x=>x.remove());
}
function cutWorkVisible9799(meta,filters,invalid){return !meta.completed&&!invalid&&matchesCut9709(meta,filters)}
function matchesCut9709(meta,filters){
 return (!filters.q||filters.q.split(/\s+/).every(t=>meta.search.includes(t)))&&
 (!filters.priority||meta.priority===filters.priority)&&(!filters.cutter||meta.cutter===filters.cutter)&&(!filters.date||meta.date===filters.date)&&(!filters.client||norm(meta.client).includes(norm(filters.client)))&&(!filters.from||(meta.date&&meta.date>=filters.from))&&(!filters.to||(meta.date&&meta.date<=filters.to))&&
 (filters.min==null||(meta.valueCents!==null&&meta.valueCents>=filters.min))&&(filters.max==null||(meta.valueCents!==null&&meta.valueCents<=filters.max));
}
let filterEvidence9709={observed:false,legacyRows:null,modelRows:null,shown:null,unresolved:null};
const centsFilter9712=v=>{if(v==null||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)&&n>=0&&Number.isSafeInteger(Math.round(n*100))?Math.round(n*100):null};
// Compact read-only Corte Conjunto. Discovery never constitutes authorization to cut.
// Session-only comparison notebook; never represents a confirmed commercial cutting event.
const jointTrials9838=[];let jointTrialOwner9838='';
function jointAllowed9837(){try{return requiredCutAllowed9820()&&canOpenPage('materiais')===true}catch(_){return false}}
function jointSnapshot9837(){
 if(!jointAllowed9837()||typeof window.HLGBJointCutDiscovery9629?.discover!=='function')return null;
 try{return window.HLGBJointCutDiscovery9629.discover(db,window.hlgbWriteoffIntegrity9391)}catch(_){return null}
}
function openJointSimulation9837(){
 if(!jointAllowed9837())return false;
 const owner=conferenceIdentity9828();if(!owner)return false;
 if(jointTrialOwner9838!==owner){jointTrials9838.length=0;jointTrialOwner9838=owner}
 const snapshot=jointSnapshot9837();if(!snapshot||snapshot.state!=='discovery-only'){alert('Sugestões indisponíveis: confira os dados de pedidos, materiais e baixas.');return false}
 document.getElementById('hlgbJointSimulation9837')?.remove();
 const host=document.createElement('section');host.id='hlgbJointSimulation9837';host.setAttribute('role','dialog');host.setAttribute('aria-label','Simular corte conjunto');host.style.cssText='position:fixed;inset:12px;z-index:110002;background:white;color:#222;border:1px solid #bbb;border-radius:10px;padding:14px;overflow:auto;max-width:850px;max-height:86vh;margin:auto;box-shadow:0 0 0 100vmax rgba(0,0,0,.45);box-sizing:border-box';
 const el=(tag,text,parent=host)=>{const n=document.createElement(tag);n.textContent=text;parent.appendChild(n);return n};
 const button=(label,parent,fn)=>{const b=el('button',label,parent);b.type='button';b.className='secondary';b.onclick=fn;return b};
 el('h2','Simular corte conjunto');button('Fechar simulação',host,()=>host.remove());
 el('p','Escolha a matéria-prima e os modelos para comparar as grades. Quantidades pedidas, não saldo confirmado. Nenhum corte será reservado ou alterado.');
 if(snapshot.unlinkedActivity)el('p','Atenção: existem atividades sem vínculo; confira os registros antes de planejar.');
 const label=el('label','Matéria-prima compartilhada '),material=el('select','',label);material.setAttribute('aria-label','Matéria-prima compartilhada');material.style.maxWidth='100%';
 const groups=snapshot.groups;for(const g of groups){const o=el('option',g.materialName+' · '+g.orderedPieces+' peças pedidas',material);o.value=g.materialId}
 if(!groups.length){el('p','Nenhum grupo de pedidos compatível por matéria-prima encontrado.');document.body.appendChild(host);return true}
 const search=el('input','');search.type='search';search.placeholder='Buscar modelo, pedido ou cor';search.setAttribute('aria-label','Buscar modelos para corte conjunto');search.style.cssText='width:100%;margin:8px 0';
 const list=el('div','');list.style.cssText='max-height:235px;overflow:auto;border:1px solid #ddd;padding:6px';
 const result=el('section',''),status=el('p','');status.setAttribute('role','status');
 const chosen=new Set();let candidates=[],group=null;
 const orderMetadata=new Map([...cutIndex9709().orders].filter(([,o])=>o).map(([oid,o])=>[oid,{number:sid(o.orderNumber||o.number||oid),client:sid(o.client||o.clientName||'')}]));
 const orderMeta=oid=>orderMetadata.get(oid)||{number:oid,client:''};
 const selectedRows=()=>candidates.filter(x=>chosen.has(x.key));
 const sameSource=()=>{const fresh=jointSnapshot9837();if(!fresh||JSON.stringify(fresh)!==JSON.stringify(snapshot))return false;const now=cutIndex9709();return selectedRows().every(x=>{const a=now.orders.get(x.orderId),b=orderMeta(x.orderId);return !!a&&sid(a.orderNumber||a.number||a.id)===b.number&&sid(a.client||a.clientName||'')===b.client})};
 const printButtons=el('div','',host);printButtons.style.cssText='display:flex;flex-wrap:wrap;gap:6px;margin:8px 0';
 const printCombined=button('Imprimir folha conjunta',printButtons,()=>printPlan(false));
 const printIndividual=button('Imprimir folhas individuais',printButtons,()=>printPlan(true));
 const trial=el('details','',host);el('summary','Comparar aproveitamento e registrar simulação',trial);
 el('p','Caderno desta sessão: informe pesos medidos ou previstos, sem gravar estoque ou confirmar corte. Não é histórico comercial.',trial);
 const field=(label,max=60)=>{const wrap=el('label',label+' ',trial);wrap.style.cssText='display:block;margin:6px 0';const x=el('input','',wrap);x.type='text';x.maxLength=max;x.setAttribute('aria-label',label);x.style.maxWidth='100%';return x};
 const totalWeight=field('Peso total da combinação (kg)'),usedWeight=field('Peso aproveitado (kg)'),wasteWeight=field('Refugo / lixo (kg)'),actualPieces=field('Peças efetivamente cortadas'),lot=field('Lote de tecido'),width=field('Largura do tecido (cm)'),note=field('Observação da combinação',300);
 for(const x of [totalWeight,usedWeight,wasteWeight,actualPieces,width])x.inputMode='decimal';
 const modeLabel=el('label','Tipo de peso ',trial),mode=el('select','',modeLabel);
 for(const [value,title] of [['estimated','Estimado / simulação'],['measured','Medido, informado manualmente']]){const o=el('option',title,mode);o.value=value}
 const metrics=el('p','',trial);metrics.setAttribute('role','status');
 const history=el('div','',trial);
 const validOwner=()=>host.isConnected&&jointAllowed9837()&&conferenceIdentity9828()===owner&&jointTrialOwner9838===owner;
 const decimal=x=>/^\d{1,8}(?:[.,]\d{1,3})?$/.test(x.value.trim())?Number(x.value.trim().replace(',','.')):null;
 const fmt=n=>n.toLocaleString('pt-BR',{maximumFractionDigits:3});
 function evaluateTrial(){
  const rows=selectedRows(),total=decimal(totalWeight),used=decimal(usedWeight),waste=decimal(wasteWeight),qty=decimal(actualPieces),w=decimal(width);
  if(rows.length<2||total===null||total<=0||total>20000||used===null||waste===null||used>total||waste>total||used+waste>total+.000001||actualPieces.value.trim()&&(!Number.isSafeInteger(qty)||qty<0)||width.value.trim()&&(w===null||w<=0))return null;
  return {totalKg:total,usedKg:used,wasteKg:waste,remainderKg:Math.max(0,+(total-used-waste).toFixed(3)),usedPercent:+(100*used/total).toFixed(2),wastePercent:+(100*waste/total).toFixed(2),actualPieces:qty,piecesPerKg:mode.value==='measured'&&qty!==null?+(qty/total).toFixed(3):null,widthCm:w,lot:lot.value.trim(),note:note.value.trim(),kind:mode.value};
 }
 function updateTrial(){const x=evaluateTrial();metrics.textContent=x?'Aproveitamento '+fmt(x.usedPercent)+'% · Refugo '+fmt(x.wastePercent)+'% · Peso restante não classificado '+fmt(x.remainderKg)+' kg'+(x.piecesPerKg===null?'':' · '+fmt(x.piecesPerKg)+' peças/kg'):'Preencha pesos válidos: aproveitado + refugo não pode superar o total.';return x}
 for(const x of [totalWeight,usedWeight,wasteWeight,actualPieces,lot,width,note,mode])x.addEventListener('input',updateTrial);
 function showHistory(){
  history.replaceChildren();el('h4','Combinações registradas nesta sessão',history);
  for(const h of jointTrials9838.slice().reverse()){
   const item=el('article','',history);item.style.cssText='border:1px solid #ddd;padding:6px;margin:6px 0';
   el('strong',h.materialName+' · '+h.rows.length+' seleções · '+h.weight.kind+' · '+new Date(h.at).toLocaleString('pt-BR'),item);
   el('p',h.rows.map(x=>x.name+' / Pedido '+x.number+' / '+x.color).join(' · '),item);
   el('p','Peso total '+fmt(h.weight.totalKg)+' kg · aproveitamento '+fmt(h.weight.usedPercent)+'% · refugo '+fmt(h.weight.wastePercent)+'%',item);
   el('p','Lote: '+(h.weight.lot||'Não informado')+' · '+(h.weight.note||'Sem observação'),item);
  }
  if(!jointTrials9838.length)el('p','Nenhuma combinação registrada nesta sessão.',history);
 }
 button('Registrar combinação nesta sessão',trial,()=>{
  if(!validOwner())return;if(!sameSource()){metrics.textContent='Pedidos ou baixas alterados. Atualize as sugestões.';return}
  const weight=updateTrial();if(!weight)return;
  const rows=selectedRows().map(x=>({orderId:x.orderId,productId:x.productId,name:x.name,color:x.color,...orderMeta(x.orderId),grade:x.lines.map(l=>({size:l.size,qty:l.ordered}))}));
  const record={kind:'joint-cut-trial-not-confirmed',at:new Date().toISOString(),materialId:group.materialId,materialName:group.materialName,rows,weight};
  if(jointTrials9838.length>=30){metrics.textContent='Limite de 30 combinações nesta sessão. Exporte o caderno antes de sair.';return}
  jointTrials9838.push(record);showHistory();metrics.textContent='Combinação registrada somente nesta sessão. '+metrics.textContent;
 });
 button('Exportar histórico da sessão (JSON)',trial,()=>{
  if(!validOwner()||!jointTrials9838.length)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify({kind:'hlgb-joint-cut-session-notebook',confirmed:false,trials:jointTrials9838},null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='hlgb-corte-conjunto-simulacoes.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
 });
 showHistory();
 function printPlan(individual){
  if(!host.isConnected||!jointAllowed9837()||conferenceIdentity9828()!==owner)return;
  const rows=selectedRows();if(rows.length<2)return;
  if(!sameSource()){status.textContent='Pedidos ou baixas alterados. Atualize as sugestões antes de imprimir.';return}
  const page=document.createElement('main');
  const add=(tag,txt,p=page)=>el(tag,txt,p);
  const heading=individual?'Folhas individuais — separação':'Folha conjunta — planejamento';
  const sizeOrder=[...new Set(rows.flatMap(x=>x.lines.map(l=>l.size)))].sort((a,b)=>{const rank=['PP','P','M','G','GG','XG','XGG'];const ia=rank.indexOf(a),ib=rank.indexOf(b);return (ia<0?999:ia)-(ib<0?999:ib)||a.localeCompare(b)});
  const build=(section,items,title)=>{
   add('h1','HLGB Confecções',section);add('h2',title,section);
   add('p','SIMULAÇÃO — NÃO AUTORIZA CORTE. Quantidades pedidas; saldo e encaixe não verificados.',section);
   add('p','Material compartilhado: '+group.materialName,section);
   const table=add('table','',section);const head=add('tr','',add('thead','',table));for(const name of ['Modelo / pedido / cliente','Cor',...sizeOrder,'Total'])add('th',name,head);
   const body=add('tbody','',table),totals=sizeOrder.map(()=>0);
   for(const x of items){const tr=add('tr','',body),o=orderMeta(x.orderId);add('td',x.name+' / Pedido '+o.number+(o.client?' / '+o.client:''),tr);add('td',x.color,tr);const ns=sizeOrder.map(s=>x.lines.filter(l=>l.size===s).reduce((n,l)=>n+l.ordered,0));ns.forEach((n,i)=>{totals[i]+=n;add('td',String(n),tr)});add('td',String(ns.reduce((a,b)=>a+b,0)),tr)}
   const foot=add('tr','',body);add('th','Total pedido',foot);add('td','—',foot);for(const n of totals)add('td',String(n),foot);add('td',String(totals.reduce((a,b)=>a+b,0)),foot);
   if(!individual){
    for(const color of new Set(items.map(x=>x.color))){const same=items.filter(x=>x.color===color);if(same.length<2)continue;const common=sizeOrder.map(s=>Math.min(...same.map(x=>x.lines.filter(l=>l.size===s).reduce((n,l)=>n+l.ordered,0))));add('p','Grade comum aritmética — '+color+': '+sizeOrder.map((s,i)=>s+' '+common[i]).join(' · '),section);for(const x of same){const dif=sizeOrder.map((s,i)=>x.lines.filter(l=>l.size===s).reduce((n,l)=>n+l.ordered,0)-common[i]);add('p',x.name+' / Pedido '+orderMeta(x.orderId).number+' — fora da grade comum: '+sizeOrder.map((s,i)=>s+' '+dif[i]).join(' · '),section)}}
    add('p','Lote: __________ Largura: __________ Peso total (kg): ______ Peso utilizado (kg): ______ Sobras (kg): ______',section);
    add('p','Cortador 1: __________________ Cortador 2: __________________ Data: ____/____/____',section);
   }else{add('p','Quantidade separada: ______ Faltas: ______ Responsável: __________________',section);}
   add('p','Observações: __________________________________________________________',section);
  };
  if(individual){const byModel=new Map();for(const x of rows){const k=JSON.stringify([x.orderId,x.productId]);if(!byModel.has(k))byModel.set(k,[]);byModel.get(k).push(x)}for(const items of byModel.values())build(add('section',''),items,heading)}
  else build(add('section',''),rows,heading);
  const html='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>'+heading+'</title><style>@page{size:A4;margin:10mm}body{font:11px Arial;color:#222}h1{font-size:17px;margin:4px 0}h2{font-size:15px;margin:5px 0}p{margin:4px 0}table{border-collapse:collapse;width:100%;margin:6px 0}th,td{border:1px solid #aaa;padding:4px;text-align:left}thead{display:table-header-group}tr{break-inside:avoid}section+section{break-before:page;page-break-before:always}</style><body>'+page.innerHTML+'</body></html>';
  let popup;try{popup=window.open('','_blank')}catch(_){}
  if(popup){try{popup.document.open();popup.document.write(html);popup.document.close();popup.focus?.();popup.print?.();return}catch(_){try{popup.close()}catch(_){}}}
  if(typeof window.hlgbCutterSheetV9523?.previewOnPage9523==='function'){window.hlgbCutterSheetV9523.previewOnPage9523(html);const preview=document.getElementById('hlgbCutterSheetPreview9523');if(preview){preview.style.zIndex='110003';const b=preview.querySelector('[data-sheet-action="print"]');if(b){const print=b.onclick;b.onclick=()=>{if(!host.isConnected||conferenceIdentity9828()!==owner||!jointAllowed9837()||!sameSource()){preview.remove();status.textContent='Dados ou sessão alterados. Atualize as sugestões.';return}print?.call(b)}}}}else alert('Prévia de impressão indisponível.');
 }
 function modelKey(l){return JSON.stringify([l.orderId,l.productId,l.color])}
 function refresh(){
  if(!jointAllowed9837()){host.remove();return}
  group=groups.find(g=>g.materialId===material.value);const map=new Map();
  for(const l of group?.lines||[]){const k=modelKey(l);if(!map.has(k))map.set(k,{key:k,orderId:l.orderId,productId:l.productId,name:l.productName,color:l.color,lines:[]});map.get(k).lines.push(l)}
  candidates=[...map.values()];chosen.clear();paint();compare();
 }
 function paint(){
  list.replaceChildren();const q=norm(search.value);
  for(const x of candidates.filter(x=>norm([x.name,x.color,'pedido '+orderMeta(x.orderId).number,orderMeta(x.orderId).client].join(' ')).includes(q))){
   const line=el('label','',list);line.style.cssText='display:block;padding:6px;overflow-wrap:anywhere';
   const cb=el('input','',line);cb.type='checkbox';cb.checked=chosen.has(x.key);cb.onchange=()=>{if(cb.checked)chosen.add(x.key);else chosen.delete(x.key);compare()};
   el('span',' '+x.name+' · Pedido '+orderMeta(x.orderId).number+' · '+x.color+' · '+x.lines.reduce((n,l)=>n+l.ordered,0)+' peças',line);
  }
 }
 function compare(){
  result.replaceChildren();if(!jointAllowed9837()){host.remove();return}
  const rows=selectedRows();printCombined.disabled=printIndividual.disabled=rows.length<2;updateTrial();
  if(!rows.length){status.textContent='Selecione os modelos e cores que deseja testar.';return}
  const pieces=rows.reduce((n,x)=>n+x.lines.reduce((a,l)=>a+l.ordered,0),0);
  const colors=new Set(rows.map(x=>norm(x.color)));
  status.textContent=rows.length+' seleção(ões) · '+pieces+' peças pedidas';
  el('h3','Comparação de grades',result);
  if(colors.size>1)el('p','Cores diferentes: confirmar a cor física de cada tecido e fazer planos separados quando necessário.',result);
  const sizes=[...new Set(rows.flatMap(x=>x.lines.map(l=>l.size)))].sort((a,b)=>{const rank=['PP','P','M','G','GG','XG','XGG'];const ia=rank.indexOf(a),ib=rank.indexOf(b);return (ia<0?999:ia)-(ib<0?999:ib)||a.localeCompare(b)});
  const wrap=el('div','',result);wrap.style.overflowX='auto';const table=el('table','',wrap);table.style.cssText='width:100%;border-collapse:collapse';
  const header=el('tr','',el('thead','',table));for(const h of ['Modelo / pedido','Cor',...sizes,'Total'])el('th',h,header);
  const body=el('tbody','',table),totals=sizes.map(()=>0);const vectors=[];
  for(const x of rows){const tr=el('tr','',body);el('td',x.name+' / '+orderMeta(x.orderId).number,tr);el('td',x.color,tr);const ns=sizes.map(s=>x.lines.filter(l=>l.size===s).reduce((n,l)=>n+l.ordered,0));vectors.push(ns);ns.forEach((n,i)=>{totals[i]+=n;el('td',String(n),tr)});el('td',String(ns.reduce((a,b)=>a+b,0)),tr)}
  const footer=el('tr','',body);el('th','Total pedido',footer);el('td','—',footer);for(const n of totals)el('td',String(n),footer);el('td',String(pieces),footer);
  for(const cell of table.querySelectorAll('td,th'))cell.style.cssText='border:1px solid #aaa;padding:5px;font-size:12px;text-align:left';
  if(rows.length>1){
   const common=sizes.map((_,i)=>Math.min(...vectors.map(v=>v[i]))),equal=vectors.every(v=>JSON.stringify(v)===JSON.stringify(vectors[0]));
   el('p',equal?'As grades pedidas coincidem em todos os tamanhos.':'As grades são diferentes. Quantidade comum por tamanho (comparação aritmética): '+sizes.map((s,i)=>s+' '+common[i]).join(' · ')+'.',result);
   if(!equal){for(let i=0;i<rows.length;i++){const x=rows[i],rest=vectors[i].map((n,j)=>n-common[j]);el('p',x.name+' / '+orderMeta(x.orderId).number+' — quantidades fora da grade comum: '+sizes.map((s,j)=>s+' '+rest[j]).join(' · '),result)}}
  }
  el('p','Compatibilidade física depende de lote, largura, elasticidade, sentido e moldes. Não há cálculo de encaixe ou economia comprovado. Nenhuma grade foi alterada.',result);
 }
 material.onchange=refresh;search.oninput=paint;
 button('Limpar seleção',host,()=>{chosen.clear();paint();compare()});
 button('Atualizar sugestões',host,()=>{host.remove();openJointSimulation9837()});
 document.body.appendChild(host);refresh();return true;
}
function ensureJointButton9837(bar){
 if(!bar?.querySelector)return;let b=bar.querySelector('#hlgbJointSimulationButton9837');
 if(!jointAllowed9837()||typeof window.HLGBJointCutDiscovery9629?.discover!=='function'){b?.remove();document.getElementById('hlgbJointSimulation9837')?.remove();return}
 if(!b){b=document.createElement('button');b.id='hlgbJointSimulationButton9837';b.type='button';b.className='secondary';b.textContent='Simular corte conjunto';b.onclick=openJointSimulation9837;bar.appendChild(b)}
}

function ensureToolbar(){
  const root=document.getElementById('cutTable'),panel=root?.closest?.('.panel');if(!root||!panel)return;
  const existing=document.getElementById('hlgbCutFilters'),split=document.getElementById('hlgbCutSplitPanel');
  if(existing){if(split&&existing.nextElementSibling!==split)split.insertAdjacentElement('beforebegin',existing);ensureJointButton9837(existing);return;}
  const bar=document.createElement('div');bar.id='hlgbCutFilters';bar.className='toolbar';bar.style.cssText='align-items:flex-end;flex-wrap:wrap;margin:10px 0';
  bar.innerHTML='<div class="field" style="min-width:min(100%,260px);flex:1"><label>Buscar corte</label><input id="hlgbCutSearch" placeholder="Pedido, cliente, produto ou cortador" oninput="hlgbCutApplyFilters()"></div><div class="field"><label for="hlgbCutStatus9770">Exibir</label><select id="hlgbCutStatus9770" onchange="hlgbCutApplyFilters()"><option value="">Lista de trabalho</option><option value="completed">Finalizados — histórico completo</option></select></div><div class="field"><label>Urgência</label><select id="hlgbCutPriority" onchange="hlgbCutApplyFilters()"><option value="">Todas</option><option>Padrão</option><option>Urgente</option><option>Urgentíssimo</option></select></div><div class="field"><label>Cortador</label><select id="hlgbCutCutter" onchange="hlgbCutApplyFilters()"><option value="">Todos</option></select></div><div class="field"><label>Data do corte</label><input id="hlgbCutDate" type="date" onchange="hlgbCutApplyFilters()"></div><div class="field"><label for="hlgbCutClient9712">Cliente</label><input id="hlgbCutClient9712" oninput="hlgbCutApplyFilters()" placeholder="Nome do cliente"></div><div class="field"><label for="hlgbCutFrom9712">De</label><input id="hlgbCutFrom9712" type="date" onchange="hlgbCutApplyFilters()"></div><div class="field"><label for="hlgbCutTo9712">Até</label><input id="hlgbCutTo9712" type="date" onchange="hlgbCutApplyFilters()"></div><div class="field"><label for="hlgbCutMin9712">Valor catálogo mín. (R$)</label><input id="hlgbCutMin9712" type="number" min="0" step="0.01" oninput="hlgbCutApplyFilters()"></div><div class="field"><label for="hlgbCutMax9712">Valor catálogo máx. (R$)</label><input id="hlgbCutMax9712" type="number" min="0" step="0.01" oninput="hlgbCutApplyFilters()"></div><div class="field"><label for="hlgbCutSort9712">Ordenar</label><select id="hlgbCutSort9712" onchange="hlgbCutApplyFilters()"><option value="">Ordem original</option><option value="date">Data</option><option value="client">Cliente</option><option value="model">Modelo</option><option value="value">Maior valor catálogo</option></select></div><button type="button" class="secondary" onclick="hlgbCutClearFilters()">Limpar</button><button type="button" class="secondary" onclick="hlgbCutToggleExtra()">Seções adicionais</button><div id="hlgbCutFilterCount" class="sub" style="align-self:center"></div>';
  (document.getElementById('hlgbCutSplitPanel')||root).insertAdjacentElement('beforebegin',bar);ensureJointButton9837(bar);
}
function syncCutters(){
  const sel=document.getElementById('hlgbCutCutter');if(!sel)return;const cur=sel.value;
  const options='<option value="">Todos</option>'+arr('cutters').filter(c=>c.active!==false).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR')).map(c=>'<option value="'+sid(c.id)+'">'+String(c.name||'Cortador').replace(/</g,'&lt;')+'</option>').join('');
  if(sel.__hlgbCutOptions9712!==options){sel.innerHTML=options;sel.__hlgbCutOptions9712=options;if([...sel.options].some(o=>o.value===cur))sel.value=cur;}
}
function setFilterVisible9709(row,visible){
 // Only restore visibility owned by this filter. Never unhide a split aggregate.
 if(!visible){if(row.dataset.hlgbCutFilterHidden!=='1'){row.dataset.hlgbCutFilterPrevious=row.style.display||'';row.dataset.hlgbCutFilterHidden='1'}row.style.display='none'}
 else if(row.dataset.hlgbCutFilterHidden==='1'){row.style.display=row.dataset.hlgbCutFilterPrevious||'';delete row.dataset.hlgbCutFilterHidden;delete row.dataset.hlgbCutFilterPrevious}
}
// v97.22: the unified list owns visibility of the grade action, not saving.
function ensureGradeAction9722(row,cut,model){
 if(typeof document.createElement!=='function'||!row?.querySelectorAll||!cut)return;
 const id=sid(cut.id),status=norm(cut.status);
 if(!id||status==='finalizado'||status.includes('cancel')||status.includes('desmembrado')||cut.modelSplitParentV1===true||cut.hiddenByModelSplitV1===true)return;
 if(!model&&row.dataset.hlgbSplitAggregateHidden==='1')return;
 const split=cut.modelSplitChildV1===true;
 if(model&&!split)return; // a synthetic or unresolved card is not an editable child
 const handler=split?'hlgbOpenSplitGradeAdjust':'hlgbAdjustCutGrade9191';
 if(typeof window[handler]!=='function')return;
 const selector='.hlgb9191-grade-btn,.hlgbAdjustSplitGradeBtn,[data-hlgb-grade-action9722]';
 const buttons=Array.from(row.querySelectorAll(selector));
 // Existing canonical button keeps its original handler and placement.
 const canonical=buttons.find(b=>!b.hasAttribute('data-hlgb-grade-action9722')&&!b.closest('details'))||buttons.find(b=>!b.hasAttribute('data-hlgb-grade-action9722'));
 const duplicate=split&&typeof window.hlgbCutModelSplit?.competingModelCuts==='function'&&window.hlgbCutModelSplit.competingModelCuts(cut).length>1;
 const host=model?(row.querySelector('[data-hlgb-grade-group9711] > .toolbar')||Array.from(row.querySelectorAll('.toolbar')).find(n=>!n.closest('details'))||row):Array.from(row.children).filter(c=>!c.hasAttribute('data-hlgb-cut-summary9761')).at(-1);
 if(canonical){
  // Move an existing editor out of a collapsed details element, preserving its handler.
  if(canonical.closest('details')&&host&&!host.closest('details'))host.appendChild(canonical);
  buttons.filter(b=>b!==canonical&&b.hasAttribute('data-hlgb-grade-action9722')).forEach(b=>b.remove());return
 }
 let button=buttons.find(b=>b.hasAttribute('data-hlgb-grade-action9722'));
 if(!button){
  // Do not clone legacy controls. Use one visible button in the main actions area.
  if(!host)return;
  button=document.createElement('button');button.type='button';button.className='secondary '+(split?'hlgbAdjustSplitGradeBtn':'hlgb9191-grade-btn');button.dataset.hlgbGradeAction9722=id;button.textContent='Ajustar grade';host.appendChild(button);
 }
 button.disabled=!!duplicate;button.title=duplicate?'Corte duplicado: conferência necessária':'Registrar a quantidade realmente cortada';
 button.onclick=()=>{
  const matches=arr('cuts').filter(x=>sid(x?.id)===id),fresh=matches[0],state=norm(fresh?.status);
  if(matches.length!==1||cutIdentity9709(row)!==id||!row.isConnected||state==='finalizado'||state.includes('cancel')||state.includes('desmembrado')||fresh.modelSplitParentV1===true||fresh.hiddenByModelSplitV1===true||!!fresh.modelSplitChildV1!==split){alert('Corte mudou. Atualize a lista antes de ajustar a grade.');return}
  if(split&&typeof window.hlgbCutModelSplit?.competingModelCuts==='function'&&window.hlgbCutModelSplit.competingModelCuts(fresh).length>1){alert('Corte duplicado: conferência necessária.');return}
  if(typeof window[handler]!=='function'){alert('Editor de grade indisponível. Atualize a página.');return}
  window[handler](id);
 };
}

 // Completed cuts are a historical view of the actual records, independent of
 // whether today's order grade still contains every model in the original split.
 function completedCutHistory(cuts,idx){
  const live=cutLive9819;
  const counts=new Map(),rows=[],review=[];
  for(const c of cuts.filter(live)){const k=sid(c.id);if(k)counts.set(k,(counts.get(k)||0)+1)}
  for(const c of cuts.filter(live)){
   if(norm(c.status)!=='finalizado'||c.modelSplitParentV1===true||c.hiddenByModelSplitV1===true)continue;
   const key=sid(c.id);if(!key||counts.get(key)!==1){review.push({id:key,reason:'Identidade duplicada ou ausente'});continue}
   const meta=cutMeta9709(c,idx),raw=sid(c.finishedAt||''),day=raw.slice(0,10),date=/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day+'T00:00:00Z'))&&new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day?day:'';
   const grade=Array.isArray(c.actualCutGrade)?c.actualCutGrade:[],cells=[],seen=new Set(),modelIds=new Set();let sum=0,valid=grade.length>0;
   for(const g of grade){const pid=sid(g?.productId||c.productId),color=sid(g?.color),size=sid(g?.size),qty=g?.qty,k=JSON.stringify([sid(g?.orderId||c.orderId),pid,color,size]);
    if(!pid||!color||!size||!Number.isSafeInteger(qty)||qty<0||seen.has(k)){valid=false;continue}
    if(c.productId&&pid!==sid(c.productId)){valid=false;continue}
    seen.add(k);sum+=qty;if(qty){modelIds.add(pid);cells.push({model:idx.products.get(pid)?.name||pid,color,size,qty})}
   }
   valid=valid&&cells.length>0&&Number.isSafeInteger(sum)&&sum===meta.pieces;
   const models=[...modelIds].map(id=>idx.products.get(id)?.name||id);
   const hasOrder=!!idx.orders.get(sid(c.orderId)),hasProduct=!!idx.products.get(sid(c.productId));
   const reasons=[];if(!date)reasons.push('Data de conclusão não confirmada');if(!hasOrder)reasons.push('Pedido original não encontrado');if(!valid)reasons.push('Grade realizada a conferir');if(!hasProduct&&!models.length)reasons.push('Modelo não confirmado');
   const named=models.length>1?models.join(' + '):meta.model||models[0]||'Modelo não identificado';
   rows.push({id:key,meta:{...meta,model:named,date,search:norm([meta.search,named,raw,'finalizado'].join(' ')),valueCents:models.length>1?null:meta.valueCents},grade:valid?cells:[],reasons,weight:c.cutWeightV9579||null});
  }
  return {rows:rows.sort((a,b)=>(b.meta.date||'').localeCompare(a.meta.date||'')||a.id.localeCompare(b.id,'pt-BR',{numeric:true})),review};
 }
 let completedOffset=0,completedFilterSignature='';
 function historyPage9799(all,filters,invalid,offset){
  const rows=invalid?[]:all.rows.filter(r=>matchesCut9709(r.meta,filters));
  if(filters.sort)rows.sort((a,b)=>compareCut9712(a,b,filters.sort)||a.id.localeCompare(b.id));
  const pageOffset=Math.max(0,Math.min(Math.floor(Math.max(0,offset)/25)*25,Math.max(0,Math.floor((rows.length-1)/25)*25)));
  return {rows,pageOffset,signature:JSON.stringify([filters,invalid,pageOffset,all.rows.length,rows.length,all.review,rows.slice(pageOffset,pageOffset+25)])};
 }
 function renderCompletedHistory(root,panel,idx,filters,invalid){
  const parent=root.parentElement;if(!parent)return;
  const allowed=window.__HLGB_AUTH_READY===true&&typeof canOpenPage==='function'&&canOpenPage('corte')===true;
  let host=document.getElementById('hlgbCompletedHistory9770');
  const on=allowed&&document.getElementById('hlgbCutStatus9770')?.value==='completed';
  parent.classList.toggle('hlgb-cut-history-mode9770',on);
  if(!on){host?.remove();completedOffset=0;completedFilterSignature='';return}
  if(!document.getElementById('hlgbCompletedHistoryCss9770')){const css=document.createElement('style');css.id='hlgbCompletedHistoryCss9770';css.textContent='.hlgb-cut-history-mode9770>#cutTable,.hlgb-cut-history-mode9770>#hlgbCutSplitPanel{display:none!important}.hlgb-cut-history-mode9770>#hlgbCompletedHistory9770{display:block;order:0;min-width:0}.hlgb-completed-card9770{border:1px solid #ddd;border-radius:8px;padding:9px;margin:6px 0;overflow-wrap:anywhere}';document.head.appendChild(css)}
  if(!host){host=document.createElement('section');host.id='hlgbCompletedHistory9770';root.insertAdjacentElement('afterend',host)}
  const el=(tag,text,p=host)=>{const n=document.createElement(tag);n.textContent=text;p.appendChild(n);return n};
  const all=completedCutHistory(arr('cuts'),idx),signature=JSON.stringify(filters);
  if(signature!==completedFilterSignature){completedFilterSignature=signature;completedOffset=0}
  const page=historyPage9799(all,filters,invalid,completedOffset),rows=page.rows;completedOffset=page.pageOffset;
  const paintSignature=JSON.stringify([page.signature,typeof window.hlgbCutWeight9579?.show==='function']);
  const count=document.getElementById('hlgbCutFilterCount');if(count)count.textContent=rows.length+' cortes finalizados no filtro · '+all.rows.length+' identificados';
  // Same page and evidence: retain expanded grades, focused buttons and DOM nodes.
  if(host.__hlgbHistoryPaint9799===paintSignature)return;
  // A change elsewhere on this page must not close a grade that is unchanged.
  const expanded=new Map();
  for(const card of host.querySelectorAll('[data-completed-cut-id]')){
   const d=card.querySelector('details[data-hlgb-history-grade9819]');
   if(d?.open)expanded.set(card.dataset.completedCutId,d.dataset.hlgbHistoryGrade9819);
  }
  host.replaceChildren();host.__hlgbHistoryPaint9799=paintSignature;
  el('h3','Cortes finalizados — histórico');
  el('p',rows.length+' de '+all.rows.length+' cortes identificados · '+all.review.length+' registros com identidade a conferir. Datas dos filtros referem-se à conclusão; cobertura local, sem confirmação de nuvem.');
  if(invalid)el('p','Confira o período ou valor dos filtros.');
  for(const r of rows.slice(completedOffset,completedOffset+25)){
   const card=el('article','');card.className='hlgb-completed-card9770';card.dataset.completedCutId=r.id;
   el('strong',r.meta.model,card);el('p','Pedido #'+(r.meta.orderNumber||'—')+' · '+(r.meta.client||'Cliente não identificado')+' · '+(r.meta.pieces===null?'Quantidade a conferir':r.meta.pieces+' pç')+' · '+(r.meta.date||'Sem data de conclusão')+' · '+r.meta.cutterName,card);
   if(r.reasons.length)el('p',r.reasons.join(' · '),card);
   if(r.grade.length){const d=el('details','',card);d.dataset.hlgbHistoryGrade9819=JSON.stringify(r.grade);d.open=expanded.get(r.id)===d.dataset.hlgbHistoryGrade9819;el('summary','Ver grade realmente cortada',d);for(const g of r.grade)el('p',g.model+' · '+g.color+' '+g.size+': '+g.qty,d)}
   if(typeof window.hlgbCutWeight9579?.show==='function'){
    const b=el('button',r.weight?'Consultar / atualizar peso':'Registrar peso do corte',card);b.type='button';b.className='secondary';
    b.onclick=()=>{if(window.__HLGB_AUTH_READY!==true||canOpenPage('corte')!==true||!card.isConnected)return;const fresh=arr('cuts').filter(c=>sid(c?.id)===r.id&&!c.deleted&&!c.deletedAt&&!c.deleted_at&&!c._deleted);if(fresh.length!==1||norm(fresh[0].status)!=='finalizado'||fresh[0].modelSplitParentV1||fresh[0].hiddenByModelSplitV1){alert('Corte mudou. Atualize o histórico.');return}if(fresh[0].modelSplitChildV1&&window.hlgbCutModelSplit?.competingModelCuts?.(fresh[0])?.length>1){alert('Corte duplicado: confira antes de pesar.');return}window.hlgbCutWeight9579.show(r.id)};
   }
  }
  if(!rows.length)el('p','Nenhum corte finalizado corresponde aos filtros.');
  if(completedOffset>0){const b=el('button','Anterior');b.type='button';b.onclick=()=>{completedOffset-=25;apply()}}
  if(completedOffset+25<rows.length){const b=el('button','Mais cortes finalizados');b.type='button';b.onclick=()=>{completedOffset+=25;apply()}}
  if(all.review.length){const d=el('details','');el('summary','Identidades que exigem conferência',d);for(const r of all.review)el('p',(r.id||'Sem ID')+' · '+r.reason,d)}
 }
function apply(){
 ensureToolbar();syncCutters();
 const root=document.getElementById('cutTable'),panel=document.getElementById('hlgbCutSplitPanel');if(!root)return;
 const filters={q:norm(document.getElementById('hlgbCutSearch')?.value||'').replace(/#/g,'').trim(),priority:document.getElementById('hlgbCutPriority')?.value||'',cutter:document.getElementById('hlgbCutCutter')?.value||'',date:document.getElementById('hlgbCutDate')?.value||''};
 const val=id=>document.getElementById(id)?.value||'';
 Object.assign(filters,{client:val('hlgbCutClient9712'),from:val('hlgbCutFrom9712'),to:val('hlgbCutTo9712'),min:centsFilter9712(val('hlgbCutMin9712')),max:centsFilter9712(val('hlgbCutMax9712')),sort:val('hlgbCutSort9712')});
 const invalid=!!((filters.from&&filters.to&&filters.from>filters.to)||(filters.min!==null&&filters.max!==null&&filters.min>filters.max));
 const idx=cutIndex9709(),stats={legacyRows:0,modelRows:0,shown:0,unresolved:0,unknownValue:0,visiblePieces:0,visibleValueCents:0,visibleUnknownValue:0},entries=[];
 const run=(row,model)=>{
  const id=cutIdentity9709(row),cut=idx.cuts.get(id);
  if(!id||!cut){if(id)stats.unresolved++;return} // headings, placeholders and unresolved identities remain untouched
  if(!model&&row.dataset.hlgbSplitAggregateHidden==='1'){delete row.dataset.hlgbCutFilterHidden;delete row.dataset.hlgbCutFilterPrevious;row.style.display='none';return}
  const meta=cutMeta9709(cut,idx);
  ensureGradeAction9722(row,cut,model);
  ensureRequiredCutActions9820(row,cut,model);
  window.hlgbCutWeight9579?.decorateRow?.(row,id,model);
  const completed=meta.completed;
  const visible=cutWorkVisible9799(meta,filters,invalid);entries.push({row,meta,id});if(!completed){stats[model?'modelRows':'legacyRows']++;if(meta.valueCents===null)stats.unknownValue++;}
  setFilterVisible9709(row,visible);if(visible&&row.style.display!=='none'){stats.shown++;stats.visiblePieces+=meta.pieces||0;if(meta.valueCents===null)stats.visibleUnknownValue++;else stats.visibleValueCents+=meta.valueCents;}
  if(!model&&!row.querySelector('.hlgbCutMeta')){
   const cell=row.children?.[2];if(cell){const el=document.createElement('div');el.className='sub hlgbCutMeta';el.textContent='📅 '+(meta.date||'Sem data')+' · ✂️ '+meta.cutterName;cell.appendChild(el)}
  }
 };
 root.querySelectorAll('tbody tr').forEach(row=>run(row,false));
 panel?.querySelectorAll('[data-hlgb-cut-model-id]').forEach(row=>run(row,true));
 panel?.querySelectorAll('[data-hlgb-cut-order-group]').forEach(group=>{const rows=Array.from(group.querySelectorAll('[data-hlgb-cut-model-id]'));setFilterVisible9709(group,!rows.length||rows.some(row=>row.style.display!=='none'))});
 const layout=applyUnifiedLayout9712(root,panel,entries,filters.sort);
 filterEvidence9709={...stats,layout,observed:true,at:new Date().toISOString()};
 const count=document.getElementById('hlgbCutFilterCount');if(count)count.textContent=layout==='review-original'?'Identidades ou estrutura não verificadas — visualização original preservada. '+stats.shown+' linha(s) observadas.':invalid?'Confira os limites do período ou do valor.':stats.shown+' de '+(stats.legacyRows+stats.modelRows)+' corte(s) · '+stats.visiblePieces.toLocaleString('pt-BR')+' peças · '+(stats.visibleValueCents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+' (catálogo conhecido)'+(stats.visibleUnknownValue?' · '+stats.visibleUnknownValue+' sem valor':'')+(stats.unresolved?' · '+stats.unresolved+' identidade(s) não verificadas':'');
 renderCompletedHistory(root,panel,idx,filters,invalid);
}

/* v97.12: same visual sequence, original DOM nodes and save handlers untouched.
 * If structure or identity is uncertain, keep the original layout visible.
 */
function compareCut9712(a,b,sort){
 if(sort==='value')return (b.meta.valueCents??-1)-(a.meta.valueCents??-1);
 if(sort==='date')return (a.meta.date||'9999-12-31').localeCompare(b.meta.date||'9999-12-31');
 if(sort==='client'||sort==='model')return a.meta[sort].localeCompare(b.meta[sort],'pt-BR',{sensitivity:'base'});
 return 0;
}
// Compact projection keeps the exact original inputs, buttons and their handlers.
const expandedSchedule9761=new Set();
function resetCompact9761(parent){
 for(const n of parent.querySelectorAll('[data-hlgb-cut-summary9761]'))n.remove();
 for(const n of parent.querySelectorAll('[data-hlgb-cut-compact9761]')){n.removeAttribute('data-hlgb-cut-compact9761');n.removeAttribute('data-hlgb-cut-schedule9761')}
}
function compactCut9761(entry,isLegacy){
 const {row,meta,id}=entry;
 row.setAttribute('data-hlgb-cut-compact9761','1');
 let summary=row.querySelector(':scope > [data-hlgb-cut-summary9761]');
 if(!summary){summary=document.createElement(isLegacy?'td':'div');summary.dataset.hlgbCutSummary9761='1';summary.className='hlgb-cut-summary9761';row.appendChild(summary)}
 const signature=JSON.stringify([meta.model,meta.client,meta.orderNumber,meta.date,meta.cutterName,meta.pieces,meta.valueCents,meta.completed]);
 const schedule=row.querySelector('.cut-schedule-inline');
 if(summary.dataset.signature!==signature||!!summary.querySelector('button')!==!!schedule){
  summary.replaceChildren();summary.dataset.signature=signature;
  const info=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('div');
  title.textContent=meta.model||'Modelo não identificado';info.appendChild(title);
  detail.className='sub';detail.textContent='Pedido #'+(meta.orderNumber||'—')+' · '+(meta.client||'Cliente não identificado')+' · '+(meta.pieces==null?'Quantidade a conferir':meta.pieces.toLocaleString('pt-BR')+' peças')+' · '+(meta.date||'Sem data')+' · '+meta.cutterName;info.appendChild(detail);summary.appendChild(info);
  const values=document.createElement('div');values.className='sub';values.textContent=(meta.completed?'Finalizado':'A cortar')+' · '+(meta.valueCents===null?'Valor a conferir':(meta.valueCents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));summary.appendChild(values);
  if(schedule){const b=document.createElement('button');b.type='button';b.className='secondary';b.dataset.hlgbScheduleToggle9761='1';b.onclick=()=>{if(!row.isConnected)return;const expanded=row.dataset.hlgbCutSchedule9761==='open';if(expanded)expandedSchedule9761.delete(id);else expandedSchedule9761.add(id);update()};summary.appendChild(b)}
 }
 function update(){const focused=row.querySelector('.cut-schedule-inline')?.contains(document.activeElement),open=expandedSchedule9761.has(id)||focused;row.dataset.hlgbCutSchedule9761=open?'open':'closed';const b=summary.querySelector('[data-hlgb-schedule-toggle9761]');if(b){b.textContent=open?'Recolher programação':'Programação';b.setAttribute('aria-expanded',String(open))}}
 update();
}
function applyUnifiedLayout9712(root,panel,entries,sort){
 const parent=root?.parentElement;
 if(!parent?.classList||!panel||panel.parentElement!==parent||typeof document.createElement!=='function')return 'original';
 const reset=()=>{resetCompact9761(parent);parent.classList.remove('hlgb-cut-unified9712');for(const {row} of entries){row.style.removeProperty('order');row.classList?.remove('hlgb-cut-unified-row9712')}};
 const table=root.querySelector(':scope > table'),body=table?.tBodies?.[0],legacy=entries.filter(x=>body?.contains(x.row)),models=entries.filter(x=>panel.contains(x.row));
 const all=Array.from(body?.rows||[]).filter(r=>r.dataset.hlgbSplitAggregateHidden!=='1'&&!r.querySelector('th'));
 const modelNodes=Array.from(panel.querySelectorAll('[data-hlgb-cut-model-id]'));
 if((!table&&root.querySelector('tr'))||(table&&table.tBodies.length!==1)||legacy.length!==all.length||models.length!==modelNodes.length||new Set(entries.map(x=>x.id)).size!==entries.length){reset();return 'review-original'}
 let toggle=document.getElementById('hlgbCutLayout9712');
 if(!toggle){toggle=document.createElement('button');toggle.type='button';toggle.id='hlgbCutLayout9712';toggle.className='secondary';toggle.onclick=event=>{event?.preventDefault?.();toggle.dataset.original=toggle.dataset.original==='1'?'0':'1';apply()};document.getElementById('hlgbCutFilters')?.appendChild(toggle)}
 toggle.textContent=toggle.dataset.original==='1'?'Lista unificada':'Visualização original';
 if(toggle.dataset.original==='1'){reset();return 'original-requested'}
 if(!document.getElementById('hlgbCutUnifiedCss9712')){
  const style=document.createElement('style');style.id='hlgbCutUnifiedCss9712';style.textContent=
  '.hlgb-cut-unified9712{display:grid;grid-template-columns:minmax(0,1fr);gap:8px}.hlgb-cut-unified9712>#cutTable,.hlgb-cut-unified9712>#hlgbCutSplitPanel,.hlgb-cut-unified9712 #cutTable>table,.hlgb-cut-unified9712 #cutTable>table>tbody,.hlgb-cut-unified9712 [data-hlgb-cut-order-group]{display:contents}.hlgb-cut-unified9712 #cutTable>table>thead,.hlgb-cut-unified9712 #cutTable>table>tbody>tr:has(>th),.hlgb-cut-unified9712 [data-hlgb-cut-order-group]>h3{display:none}.hlgb-cut-unified9712>#hlgbCutFilters{order:-3}.hlgb-cut-unified9712>:not(#cutTable):not(#hlgbCutSplitPanel):not(#hlgbCutFilters){order:-4}.hlgb-cut-unified9712 #hlgbCutSplitPanel>.toolbar{order:-2}.hlgb-cut-unified9712 #hlgbCutSplitPanel>.toolbar h2{display:none}.hlgb-cut-unified9712 [data-hlgb-cut-order-group]>[role=alert]{order:-1}.hlgb-cut-unified9712 #cutTable tr.hlgb-cut-unified-row9712{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,145px),1fr));gap:8px;border:1px solid #ddd;border-radius:8px;padding:10px;min-width:0}.hlgb-cut-unified9712 tr.hlgb-cut-unified-row9712>td{white-space:normal;min-width:0;overflow-wrap:anywhere}.hlgb-cut-unified9712 tr.hlgb-cut-unified-row9712>td:before{content:attr(data-cut-label9712);display:block;font-size:11px;font-weight:600;color:#666}.hlgb-cut-unified9712 #cutTable>.empty{display:none}.hlgb-cut-unified9712 #hlgbCutSplitPanel>.empty{display:none} .hlgb-cut-unified9712 [data-hlgb-cut-compact9761]{border:1px solid #ddd;border-radius:8px;padding:8px!important;margin:0!important;min-width:0;box-sizing:border-box;background:#fff}.hlgb-cut-unified9712 .hlgb-cut-summary9761{display:flex!important;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;grid-column:1/-1;order:-1;border-bottom:1px solid #ddd;padding:5px 0 8px;min-width:0;overflow-wrap:anywhere}.hlgb-cut-unified9712 .hlgb-cut-summary9761>div:first-child{flex:1;min-width:min(100%,180px)}.hlgb-cut-unified9712 tr.hlgb-cut-unified-row9712>td.hlgb-cut-summary9761:before{display:none}.hlgb-cut-unified9712 [data-hlgb-cut-schedule9761=closed] .cut-schedule-inline:not(:focus-within){display:none!important}.hlgb-cut-unified9712 [data-hlgb-cut-model-id][data-hlgb-cut-compact9761]{display:flex;flex-direction:column;gap:6px}.hlgb-cut-unified9712 [data-hlgb-cut-compact9761] .toolbar{gap:6px;flex-wrap:wrap}.hlgb-cut-unified9712 [data-hlgb-cut-compact9761] input,.hlgb-cut-unified9712 [data-hlgb-cut-compact9761] select{max-width:100%;box-sizing:border-box}';
  document.head.appendChild(style)
 }
 const header=table?.tHead?.rows?.[0]||Array.from(body?.rows||[]).find(r=>r.querySelector('th'));
 const heads=Array.from(header?.cells||[]).map(h=>h.textContent.trim());
 for(const {row} of legacy){row.classList.add('hlgb-cut-unified-row9712');Array.from(row.children).filter(c=>!c.hasAttribute('data-hlgb-cut-summary9761')).forEach((cell,i)=>{cell.dataset.cutLabel9712=heads[i]||''})}
 for(const entry of legacy)compactCut9761(entry,true);for(const entry of models)compactCut9761(entry,false);
 const ordered=entries.slice().sort((a,b)=>compareCut9712(a,b,sort));
 ordered.forEach((x,i)=>{x.row.style.order=String(i+1)});
 parent.classList.add('hlgb-cut-unified9712');return 'unified';
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
/* v97.15 — move the single authoritative panel, never clone controls or write records. */
let separationDock9715=null,separationDockEvidence9715={observed:false,moved:false,modelOpened:false};
function restoreSeparationDock9715(){
 const d=separationDock9715;if(d){
  d.link?.remove();
  const orders=document.getElementById('pedidos');
  if(d.anchor?.isConnected&&d.anchor.parentNode===orders)orders.insertBefore(d.panel,d.anchor);
  else if(orders&&d.panel?.isConnected&&!orders.querySelector('#separationOrder,#separationList,#separationTable'))orders.appendChild(d.panel);
  else if(d.panel?.isConnected&&!orders){d.host.hidden=true;d.anchor?.remove();separationDockEvidence9715={observed:false,moved:false,modelOpened:false};return}
  d.anchor?.remove();d.host?.remove();separationDock9715=null;
 }
 separationDockEvidence9715={observed:false,moved:false,modelOpened:false};
}
function dockSeparation9715(){
 const actor=draftOwner9644(),cut=document.getElementById('corte'),orders=document.getElementById('pedidos');
 if(!actor||!cut||!orders){restoreSeparationDock9715();return null}
 if(separationDock9715&&separationDock9715.actor!==actor)restoreSeparationDock9715();
 const sel=document.getElementById('separationOrder'),list=document.getElementById('separationList'),table=document.getElementById('separationTable'),panel=sel?.closest?.('.panel');
 const canonical=window.hlgbSeparationDirect9321;
 let ready=false;try{ready=canonical?.status?.()?.installed===true&&typeof window.selectSeparationOrder==='function'&&typeof window.renderSeparation==='function'}catch(_){}
 if(!ready||!panel||!list||!table||['separationOrder','separationList','separationTable'].some(id=>document.querySelectorAll('[id="'+id+'"]').length!==1)||!panel.contains(list)||!panel.contains(table)||!panel.querySelector?.('button[onclick*="openMultiOrderPurchase"]')){
  restoreSeparationDock9715();return null;
 }
 if(separationDock9715){if(separationDock9715.panel===panel&&separationDock9715.host.isConnected&&separationDock9715.host.contains(panel)&&separationDock9715.anchor.isConnected&&separationDock9715.link?.isConnected){separationDock9715.host.hidden=false;return separationDock9715;}restoreSeparationDock9715()}
 if(panel.parentNode!==orders)return null;
 const anchor=document.createElement('span');anchor.hidden=true;anchor.dataset.hlgbSeparationOrigin9715='1';orders.insertBefore(anchor,panel);
 const host=document.createElement('details');host.id='hlgbSeparationOperation9715';host.className='panel';host.style.cssText='min-width:0;max-width:100%';
 const summary=document.createElement('summary');summary.textContent='Operação de separação e compra de materiais';host.appendChild(summary);
 const info=document.createElement('p');info.className='sub';info.textContent='Abra pela ficha do modelo ou consulte os pedidos pendentes. Confirmações e baixas usam a rotina original.';info.setAttribute('role','status');host.appendChild(info);
 const top=document.getElementById('cutSummaryCards');if(top?.parentNode===cut)cut.insertBefore(host,top.nextSibling);else cut.appendChild(host);
 host.appendChild(panel);
 // Only a navigation shortcut remains in Pedidos; do not clone operational controls.
 const link=document.createElement('button');link.type='button';link.className='secondary';link.id='hlgbSeparationGoToCut9774';link.textContent='Abrir separação de materiais no Corte';anchor.insertAdjacentElement('afterend',link);
 separationDock9715={actor,panel,host,anchor,info,link};
 link.onclick=()=>{
  const d=separationDock9715;if(!d||d.link!==link||draftOwner9644()!==d.actor||!d.host.isConnected||!d.host.contains(panel)||typeof page!=='function')return;
  try{page('corte',null);if(separationDock9715!==d||draftOwner9644()!==d.actor||!d.host.isConnected)return;d.host.open=true;d.host.scrollIntoView?.({block:'start',behavior:'auto'});d.host.querySelector('summary')?.focus?.()}catch(_){d.info.textContent='Abra a aba Corte para acessar a separação.'}
 };

 separationDockEvidence9715={observed:true,moved:true,modelOpened:false,at:new Date().toISOString()};return separationDock9715;
}
function openModelSeparation9715(row){
 if(!separationAllowed9643())return false;
 let exact;try{const matches=inspectWorkspace9643().rows.filter(x=>x.orderId===row.orderId&&x.productId===row.productId&&x.cutId===row.cutId);if(matches.length!==1||cutChecklist9644.signature(matches[0])!==cutChecklist9644.signature(row))return false;exact=matches[0]}catch(_){return false}
 const busy=window.hlgbSeparationDirect9321?.status?.()?.busy;
 if(Array.isArray(busy)&&busy.length){alert('Há uma separação sendo confirmada. Aguarde antes de trocar de modelo ou pedido.');return false}
 const dock=dockSeparation9715();
 if(!dock){if(typeof page==='function'&&typeof selectSeparationOrder==='function'){page('pedidos',null);selectSeparationOrder(exact.orderId);return true}return false}
 const sel=document.getElementById('separationOrder');if(!sel||!dock.panel.contains(sel))return false;
 // The original selector may not have been populated yet. Only refresh on explicit action.
 if(!Array.from(sel.options||[]).some(o=>sid(o.value)===sid(exact.orderId))&&typeof fillSeparationOrders==='function')fillSeparationOrders();
 if(!Array.from(sel.options||[]).some(o=>sid(o.value)===sid(exact.orderId))){dock.host.open=true;dock.info.textContent='Pedido não localizado na seleção original. Atualize os dados antes de confirmar.';return false}
 dock.host.open=true;const request=(dock.request||0)+1;dock.request=request;selectSeparationOrder(exact.orderId);
 const focus=()=>{
  if(dock!==separationDock9715||dock.request!==request||draftOwner9644()!==dock.actor||sid(sel.value)!==sid(exact.orderId))return false;
  const pending=window.hlgbSeparationDirect9321?.status?.()?.busy;
  if(Array.isArray(pending)&&pending.length)return false;
  const input=document.getElementById('sepQty938_'+sid(exact.productId));
  if(input&&dock.panel.contains(input)){input.scrollIntoView?.({block:'center',behavior:'auto'});input.focus?.();dock.info.textContent='Modelo selecionado: '+exact.productName+' · Pedido #'+exact.orderNumber+'. Confira a quantidade antes de confirmar.';separationDockEvidence9715={observed:true,moved:true,modelOpened:true,at:new Date().toISOString()};return true}
  else{dock.info.textContent='Pedido aberto. A baixa parcial deste modelo não está disponível nesta consulta; confira o progresso ou a conclusão.';separationDockEvidence9715={observed:true,moved:true,modelOpened:false,at:new Date().toISOString()}}
 };
 if(!focus())setTimeout(focus,150);return true;
}
function materialCard9711(parent,row,inline=false){
 const el=(tag,text,host=parent)=>{const x=document.createElement(tag);x.textContent=text;host.appendChild(x);return x};
 const fmt=x=>Number(x).toLocaleString('pt-BR',{maximumFractionDigits:3});
 const card=el('article','',parent);card.className='panel';el('h3','Pedido #'+row.orderNumber+' · '+row.productName,card);el('p',row.ordered+' peças pedidas · Separadas (local): '+(row.separatedObserved===null?'Revisar histórico':row.separatedObserved),card);
   const detail=el('details','',card);el('summary','Checklist de material — consulta',detail);
   for(const m of row.materials)el('p',m.name+' · '+fmt(m.amount)+' '+m.unit+' necessários (estimativa)',detail);
   if(row.issues.length)el('p','Revisão necessária: '+row.issues.join(', '),detail);
   const actions=el('div','',card);actions.className='toolbar';
   const sep=el('button','Abrir separação do pedido',actions);sep.type='button';sep.className='secondary';sep.onclick=()=>{if(!separationAllowed9643())return;try{if(!openModelSeparation9715(row))alert('Confira o vínculo e os dados atuais do modelo antes de abrir a separação.')}catch(_){alert('Separação indisponível. Confira a rotina original.')}};
   const print=el('button','Folha de corte do modelo',actions);print.type='button';print.className='secondary';print.disabled=!row.cutId;print.onclick=()=>{if(!separationAllowed9643()||!row.cutId)return;const fresh=inspectWorkspace9643().rows.find(x=>x.orderId===row.orderId&&x.productId===row.productId&&x.cutId===row.cutId);if(!fresh||typeof window.printCuttingSheet!=='function'){alert('Corte precisa de revisão antes de imprimir.');return}window.printCuttingSheet(row.orderId,row.cutId)};
   if(!row.cutId)el('p','Folha individual disponível quando houver corte identificado; impressão antiga permanece em Pedidos.',card);
   addChecklistDraft9644(card,row,el);
 if(inline){card.className='hlgb-inline-material-card9711';card.style.cssText='min-width:0;padding:8px 0';}
 return card;
}
function renderSeparationWorkspace9643(){
 dockSeparation9715();
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
 const targets=new Map(),splitIds=new Set(),idx=cutIndex9709(),owner=bindDraftOwner9644();
 for(const card of Array.from(root.querySelectorAll('[data-hlgb-cut-model-id]'))){
  const id=cutIdentity9709(card);if(!id)continue;splitIds.add(id);targets.set(id,targets.has(id)?null:card)
 }
 // Legacy rows can also host material details when the exact model and cut are established.
 for(const tr of Array.from(table.querySelectorAll('tbody tr'))){
  if(tr.dataset.hlgbSplitAggregateHidden==='1')continue;
  const id=cutIdentity9709(tr);if(!id||splitIds.has(id))continue;
  const cut=idx.cuts.get(id);if(!cut||!cut.productId||cutMeta9709(cut,idx).completed)continue;
  targets.set(id,targets.has(id)?null:Array.from(tr.children).filter(c=>!c.hasAttribute('data-hlgb-cut-summary9761')).at(-1)||null);
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
  if(detail&&detail.__hlgbMaterialSignature9711===sig&&detail.__hlgbMaterialOwner9711===owner)continue;
  const wasOpen=detail?.open===true;
  detail?.remove();detail=document.createElement('details');detail.dataset.hlgbInlineMaterials9711='1';detail.dataset.hlgbCutId9820=id;detail.__hlgbMaterialSignature9711=sig;detail.__hlgbMaterialOwner9711=owner;detail.open=wasOpen;detail.style.cssText='margin-top:8px;min-width:0;max-width:100%';
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

let materialsScheduled9711=false;
function scheduleMaterials9711(){if(materialsScheduled9711)return;materialsScheduled9711=true;setTimeout(()=>{materialsScheduled9711=false;try{renderSeparationWorkspace9643()}catch(e){console.warn('[HLGB materiais por corte]',e)}},0)}
function clearFilters(){['hlgbCutSearch','hlgbCutPriority','hlgbCutCutter','hlgbCutDate','hlgbCutClient9712','hlgbCutFrom9712','hlgbCutTo9712','hlgbCutMin9712','hlgbCutMax9712','hlgbCutSort9712'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});apply()}
// Read-only: only explicit complete model coverage hides an order.
function merchandiseEvidence9755(orders,invoices,pairs){
 const out=new Map();if(!Array.isArray(orders)||!Array.isArray(invoices)||!(pairs instanceof Set))return out;
 const live=x=>x&&!x.deletedAt&&!x.deleted_at&&x.deleted!==true&&!x._deleted&&!/cancelad|excluid|estornad|arquivad/.test(norm(x.status));
 const count=rows=>{const m=new Map();for(const x of rows.filter(live)){const id=sid(x.id);if(id)m.set(id,(m.get(id)||0)+1)}return m};
 const integer=v=>((typeof v==='number'||typeof v==='string'&&/^\d+$/.test(v))&&Number.isSafeInteger(Number(v))&&Number(v)>=0)?Number(v):null;
 const oc=count(orders),ic=count(invoices),billed=new Map(),uncertain=new Set(),orderModels=new Map();
 for(const inv of invoices.filter(live)){
  if(inv.manualNote===true||inv.noteOnly===true)continue;
  for(const row of Array.isArray(inv.items)?inv.items:[]){
   if(row?.noteOnly===true||['manual_note','note_adjustment'].includes(row?.sourceType))continue;
   const oid=sid(row?.orderId),pid=sid(row?.productId||row?.itemKey);
   if(!oid){if(sid(inv.orderId))uncertain.add(sid(inv.orderId));continue}
   const qty=integer(row?.qty),k=JSON.stringify([oid,pid]);
   if(!pid||!sid(inv.id)||ic.get(sid(inv.id))!==1||qty===null||qty===0||(row.productId!=null&&row.itemKey!=null&&sid(row.productId)!==sid(row.itemKey))){uncertain.add(oid);continue}
   const n=(billed.get(k)||0)+qty;if(!Number.isSafeInteger(n)){uncertain.add(oid);continue}billed.set(k,n);
   const models=orderModels.get(oid)||new Set();models.add(pid);orderModels.set(oid,models);
  }
 }
 for(const o of orders.filter(live)){
  const id=sid(o.id);if(!id||oc.get(id)!==1)continue;
  const grade=new Map(),seen=new Set();let valid=Array.isArray(o.grade)&&o.grade.length>0;
  for(const g of Array.isArray(o.grade)?o.grade:[]){
   const pid=sid(g?.productId),qty=integer(g?.qty),key=JSON.stringify([pid,sid(g?.color),sid(g?.size)]);
   if(!pid||!sid(g?.color)||!sid(g?.size)||qty===null||seen.has(key)){valid=false;continue}
   seen.add(key);if(qty>0){const n=(grade.get(pid)||0)+qty;if(!Number.isSafeInteger(n))valid=false;grade.set(pid,n)}
  }
  if(!valid||!grade.size||uncertain.has(id)||[...(orderModels.get(id)||[])].some(pid=>!grade.has(pid))){out.set(id,{hide:false,reason:'review',models:[],remainingPieces:null});continue}
  let all=true,partial=false,ambiguous=false,remainingPieces=0;const models=[];
  for(const [pid,qty] of grade){
   const amount=billed.get(JSON.stringify([id,pid]))||0,written=pairs.has(id+'|'+pid);
   if(amount>qty){ambiguous=true;all=false;models.push({productId:pid,ordered:qty,billed:amount,writtenOff:written,remaining:null});continue}
   const remaining=written?0:qty-amount;
   if(remaining>0)all=false;
   if(written||amount>0)partial=true;
   remainingPieces+=remaining;models.push({productId:pid,ordered:qty,billed:amount,writtenOff:written,remaining});
  }
  if(!Number.isSafeInteger(remainingPieces))ambiguous=true;
  out.set(id,{hide:all&&!ambiguous,reason:ambiguous?'review':all?'covered':partial?'partial':'open',models,remainingPieces:ambiguous?null:remainingPieces});
 }
 return out;
}
function organizeMerchandise9755(){
 const host=document.getElementById('openCutOrdersTable');if(!host)return;
 const restore=()=>{host.querySelectorAll('[data-hlgb-merch-detail9772]').forEach(n=>n.remove());Array.from(host.querySelectorAll('tbody tr')).forEach(row=>setFilterVisible9709(row,true));document.getElementById('hlgbMerchandiseEvidence9755')?.remove();const cards=document.getElementById('cutSummaryCards');const card=Array.from(cards?.querySelectorAll?.('.card')||[]).find(c=>norm(c.querySelector('small')?.textContent)==='mercadoria sem nota pronta');for(const node of [card?.querySelector('strong'),card?.querySelector('div')])if(node?.hasAttribute('data-hlgb-merch-original9755')){node.textContent=node.getAttribute('data-hlgb-merch-original9755');node.removeAttribute('data-hlgb-merch-original9755')}};
 if(window.__HLGB_AUTH_READY!==true||typeof canOpenPage!=='function'||!canOpenPage('corte')||typeof window.hlgbCanonicalProjectionInvoices!=='function'||typeof window.hlgbWriteoffIntegrity9391?.pairIndex!=='function'){restore();return}
 let evidence;try{const invoices=window.hlgbCanonicalProjectionInvoices(),pairs=window.hlgbWriteoffIntegrity9391.pairIndex();if(!Array.isArray(invoices)||!(pairs instanceof Set)){restore();return}evidence=merchandiseEvidence9755(arr('orders'),invoices,pairs)}catch(_){restore();return}
 // The actual legacy table puts its TH header in an implicit TBODY.
 const rows=Array.from(host.querySelectorAll('tbody tr')).filter(row=>!row.querySelector('th')),identified=[];
 for(const row of rows){
  const ids=new Set();for(const b of row.querySelectorAll('button[onclick]')){const m=sid(b.getAttribute('onclick')).match(/^\s*(?:editOpenMerchandise|deleteOpenMerchandise)\(\s*(['"]?)([^'")\s]+)\1\s*\)\s*;?\s*$/);if(m)ids.add(m[2])}
  identified.push({row,id:ids.size===1?[...ids][0]:''});
 }
 if(identified.some(x=>!x.id)||new Set(identified.map(x=>x.id)).size!==identified.length){restore();return}
 const idx=cutIndex9709(),products=idx.products;
 let hidden=0,qty=0,known=true,review=0,gross=0,grossKnown=true;
 for(const {row,id} of identified){
  row.querySelectorAll('[data-hlgb-merch-detail9772]').forEach(n=>n.remove());
  const e=evidence.get(id),hide=e?.hide===true;setFilterVisible9709(row,!hide);if(hide){hidden++;continue}
  if(e?.reason==='review'||!e){review++;known=false}
  else if(Number.isSafeInteger(e.remainingPieces))qty+=e.remainingPieces;else known=false;
  const order=idx.orders.get(id),amount=order?.total;
  if(amount==null||String(amount).trim()===''||!Number.isFinite(Number(amount))||Number(amount)<0)grossKnown=false;else gross+=Number(amount);
  const hostCell=row.lastElementChild;if(!hostCell)continue;
  const details=document.createElement('details');details.dataset.hlgbMerchDetail9772='1';
  const summary=document.createElement('summary');summary.textContent=e?.remainingPieces==null?'Conferir vínculo e saldo da nota':e.remainingPieces+' peças do pedido sem cobertura de nota/baixa';details.appendChild(summary);
  for(const m of e?.models||[]){const p=document.createElement('p');p.className='sub';p.textContent=(products.get(m.productId)?.name||m.productId)+' · pedido '+m.ordered+' pç · nota '+m.billed+' pç · '+(m.writtenOff?'baixa registrada':m.remaining===null?'divergência':'sem cobertura '+m.remaining+' pç');details.appendChild(p)}
  const note=document.createElement('p');note.className='sub';note.textContent='Saldo do pedido, não quantidade fisicamente pronta. Nenhuma baixa automática.';details.appendChild(note);hostCell.appendChild(details);
 }
 const cards=document.getElementById('cutSummaryCards');const card=Array.from(cards?.querySelectorAll?.('.card')||[]).find(c=>norm(c.querySelector('small')?.textContent)==='mercadoria sem nota pronta');
 if(card){const n=card.querySelector('strong'),v=card.querySelector('div');for(const node of [n,v])if(node&&!node.hasAttribute('data-hlgb-merch-original9755'))node.setAttribute('data-hlgb-merch-original9755',node.textContent);if(n)n.textContent=known?qty.toLocaleString('pt-BR')+' pç sem cobertura':qty.toLocaleString('pt-BR')+' pç identificadas + revisão';if(v)v.textContent=grossKnown?'Valor integral dos pedidos: '+gross.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+' · saldo em valor a conferir':'Valor a conferir'}
 let info=document.getElementById('hlgbMerchandiseEvidence9755');if(!info){info=document.createElement('p');info.id='hlgbMerchandiseEvidence9755';info.className='sub';host.insertAdjacentElement('afterend',info)}
 info.textContent=(identified.length-hidden)+' pedidos na lista · '+hidden+' com todos os modelos cobertos por nota ou baixa local · '+review+' para conferência. Pedidos parciais permanecem com saldo por modelo. Quantidades representam peças do pedido sem cobertura, não estoque pronto; valor não inferido. Nenhuma baixa foi realizada.';
}
function secondaryPanels(){
  const page=document.getElementById('corte');if(!page)return [];
  return [...page.querySelectorAll(':scope > .panel')].filter(p=>{const h=norm(p.querySelector('h2')?.textContent||'');return h.includes('cortes prontos')||h.includes('atribuicao de corte')||h.includes('distribuicao dos cortes')||h.includes('mercadoria sem nota')||h.includes('relatorio de necessidade')});
}
function applyExtraState(){
  let open=false;try{open=localStorage.getItem('hlgb_cut_extra_open_v1')==='1'}catch(e){}
  secondaryPanels().forEach(p=>{if(!p.dataset.hlgbCutOriginalDisplay)p.dataset.hlgbCutOriginalDisplay=p.style.display||'';p.style.display=open?p.dataset.hlgbCutOriginalDisplay:'none'});
}
function toggleExtra(){let open=false;try{open=localStorage.getItem('hlgb_cut_extra_open_v1')==='1';localStorage.setItem('hlgb_cut_extra_open_v1',open?'0':'1')}catch(e){}applyExtraState()}
window.hlgbCutApplyFilters=apply;window.hlgbCutClearFilters=clearFilters;window.hlgbCutToggleExtra=toggleExtra;window.hlgbCutOrganization={apply,cutActionProof9820,openFullCutChecklist9820,printCutChecklist9824,printRequiredCut9820,completedCutHistory,historyPage9799,cutWorkVisible9799,secondaryPanels,merchandiseEvidence9755,organizeMerchandise9755,cutIdentity9709,cutMeta9709,cutIndex9709,matchesCut9709,compareCut9712,status:()=>({...filterEvidence9709}),renderMaterials:renderSeparationWorkspace9643,scheduleMaterials:scheduleMaterials9711,materialsStatus9711:()=>({...materialsEvidence9711}),separationDockStatus9715:()=>({...separationDockEvidence9715}),dockSeparation9715,openModelSeparation9715};
const old=window.renderCuts;if(typeof old==='function'&&!old.__hlgbOrgV1){const w=function(){const r=old.apply(this,arguments);setTimeout(()=>{apply();applyExtraState();scheduleMaterials9711();organizeMerchandise9755()},0);return r};w.__hlgbOrgV1=true;w.__original=old;window.renderCuts=w}
function boot(){try{apply();applyExtraState();renderSeparationWorkspace9643();organizeMerchandise9755()}catch(e){console.warn('[HLGB corte organização]',e)}}try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,1000),0)}catch(e){}setTimeout(boot,1700);
window.HLGB_CUT_ORGANIZATION_GUARD=V;
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(renderSeparationWorkspace9643,0));
document.addEventListener?.('click',e=>{if(e.target?.closest?.('nav'))setTimeout(dockSeparation9715,0)},true);
window.addEventListener?.('hlgb:logout',()=>{document.getElementById('hlgbFullCutChecklist9820')?.remove();document.getElementById('hlgbJointSimulation9837')?.remove();document.getElementById('hlgbJointSimulationButton9837')?.remove();document.querySelectorAll('[data-hlgb-required-cut9820]').forEach(n=>n.remove());completedOffset=0;completedFilterSignature='';document.getElementById('hlgbCompletedHistory9770')?.remove();document.querySelectorAll('.hlgb-cut-history-mode9770').forEach(n=>n.classList.remove('hlgb-cut-history-mode9770'));restoreSeparationDock9715();filterEvidence9709={observed:false,legacyRows:null,modelRows:null,shown:null,unresolved:null};clearCutDrafts9644();conferenceDrafts9828.clear();conferenceOwner9828='';jointTrials9838.length=0;jointTrialOwner9838='';expandedSchedule9761.clear();removeInlineMaterials9711(document.getElementById('corte'));materialsEvidence9711={observed:false,inline:null,fallback:null,ambiguous:null};document.getElementById('hlgbCutSeparation9643')?.remove()});
console.info('[HLGB] organização da aba Corte ativa');
})();