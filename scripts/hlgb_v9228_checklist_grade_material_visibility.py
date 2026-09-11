from pathlib import Path

src=Path('app9227.html')
out=Path('app9228.html')
s=src.read_text(encoding='utf-8')

addon=r'''<!-- HLGB_V9228_CHECKLIST_GRADE_MATERIAL_VISIBILITY_START -->
<style>
.hlgb9228-grade-wrap{overflow:auto;border:1px solid var(--line);border-radius:10px;margin:8px 0 10px;background:#fff}
.hlgb9228-grade-wrap table{min-width:520px;margin:0}
.hlgb9228-grade-note{padding:10px 12px;border:1px solid #eadde4;border-radius:9px;background:#fff8fb;margin:8px 0;color:#6b5560}
.hlgb9228-grade-editor{overflow:auto;max-height:52vh;border:1px solid var(--line);border-radius:10px}
.hlgb9228-grade-editor table{min-width:650px;margin:0}
.hlgb9228-grade-editor input[type=number]{width:78px;padding:7px;border:1px solid #d9ccd3;border-radius:7px;text-align:center}
.hlgb9228-grade-total{font-size:16px;font-weight:900;padding:10px 12px;border-radius:9px;background:#fff8fb;margin:10px 0}
.hlgb9228-settings-table{max-height:55vh;overflow:auto;border:1px solid var(--line);border-radius:10px}
.hlgb9228-settings-table table{min-width:700px;margin:0}
.hlgb9228-check-cell{text-align:center!important}
.hlgb9228-config-btn{white-space:nowrap}
</style>
<script>
(function(){
'use strict';
const arr9228=k=>Array.isArray(db?.[k])?db[k]:[];
const q9228=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const n9228=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const esc9228=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt9228=v=>q9228(v).toLocaleString('pt-BR',{maximumFractionDigits:3});
function clone9228(x){try{return structuredClone(x)}catch(e){return JSON.parse(JSON.stringify(x))}}
function upsert9228(module,row){db[module]=Array.isArray(db[module])?db[module]:[];const i=db[module].findIndex(x=>String(x.id)===String(row.id));if(i>=0)db[module][i]=clone9228(row);else db[module].push(clone9228(row));return row}
async function saveRow9228(module,row){
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('A conexão com a nuvem não está pronta.');
  const r=await window.hlgbRecordSaveWithRetry(module,String(row.id),clone9228(row),false);
  if(!r||r.applied===false)throw new Error(r?.reason||'A nuvem não confirmou a alteração.');
  return r.data||row;
}
function product9228(id){return arr9228('products').find(x=>String(x.id)===String(id))||null}
function order9228(id){return arr9228('orders').find(x=>String(x.id)===String(id))||null}
function cut9228(id){return arr9228('cuts').find(x=>String(x.id)===String(id))||null}
function normGrade9228(rows,c){
  const pid=String(c?.productId||'');
  let a=Array.isArray(rows)?rows:[];
  if(pid)a=a.filter(x=>String(x?.productId||pid)===pid);
  return a.map(x=>({productId:x?.productId||c?.productId||null,color:String(x?.color||''),size:String(x?.size||''),qty:q9228(x?.qty),noGrade:!!x?.noGrade})).filter(x=>x.qty>0);
}
function detailedGrade9228(rows){return (rows||[]).some(x=>!x.noGrade&&(String(x.color||'').trim()||String(x.size||'').trim()))}
function sourceGrade9228(c){
  const cut=cut9228(c?.cutId),order=order9228(c?.orderId);
  const candidates=[c?.grade9228,c?.grade,cut?.actualCutGrade,cut?.originalGrade,order?.grade,c?.gradeV9198].map(x=>normGrade9228(x,c));
  for(const g of candidates)if(g.length&&detailedGrade9228(g))return {rows:g,source:'detalhada'};
  for(const g of candidates)if(g.length)return {rows:g,source:'sem_grade'};
  return {rows:[],source:'vazia'};
}
function scaledGrade9228(c){
  const src=sourceGrade9228(c),g=src.rows,target=Math.floor(q9228(c?.qty)),total=Math.floor(g.reduce((a,x)=>a+q9228(x.qty),0));
  if(!g.length||!target||!total||target===total||!detailedGrade9228(g))return {rows:g,estimated:false,source:src.source};
  const calc=g.map((x,i)=>{const raw=q9228(x.qty)*target/total,b=Math.floor(raw);return {...x,qty:b,_f:raw-b,_i:i}});
  let left=target-calc.reduce((a,x)=>a+x.qty,0);
  calc.slice().sort((a,b)=>b._f-a._f||a._i-b._i).slice(0,Math.max(0,left)).forEach(x=>calc[x._i].qty++);
  return {rows:calc.map(({_f,_i,...x})=>x).filter(x=>x.qty>0),estimated:true,source:src.source};
}
function gradeHtml9228(c){
  const g=scaledGrade9228(c);
  if(!g.rows.length||!detailedGrade9228(g.rows))return '<div class="hlgb9228-grade-note">A grade exata deste envio ainda não foi informada. Clique em <b>Informar/editar grade do envio</b> para preencher cor, tamanho e quantidade antes da conferência.</div>';
  const total=g.rows.reduce((a,x)=>a+q9228(x.qty),0);
  return (g.estimated?'<div class="hlgb9228-grade-note">⚠️ Este envio é parcial; a grade abaixo foi distribuída proporcionalmente. Você pode editar para informar a grade exata enviada.</div>':'')+
    '<div class="hlgb9228-grade-wrap"><table><thead><tr><th>Cor</th><th>Tamanho</th><th>Quantidade</th></tr></thead><tbody>'+g.rows.map(x=>'<tr><td>'+esc9228(x.color||'-')+'</td><td>'+esc9228(x.size||'-')+'</td><td><b>'+fmt9228(x.qty)+'</b></td></tr>').join('')+'</tbody><tfoot><tr><td colspan="2"><b>Total da grade</b></td><td><b>'+fmt9228(total)+' pç</b></td></tr></tfoot></table></div>';
}
function materialMaster9228(m){
  let x=m?.materialId?arr9228('materials').find(a=>String(a.id)===String(m.materialId)):null;
  if(!x&&m?.name)x=arr9228('materials').find(a=>n9228(a.name)===n9228(m.name));
  return x||null;
}
function materialVisible9228(c,m){
  const master=materialMaster9228(m)||m||{};
  return String(c?.destinationType||'')==='F'?master.showFactionChecklist!==false:master.showProductionChecklist!==false;
}
function materialNeed9228(pieces,m){
  try{if(typeof materialNeedForPieces==='function')return q9228(materialNeedForPieces(pieces,m))}catch(e){}
  const base=n9228(m?.calcMode)==='yield'?(q9228(m?.qty)>0?q9228(pieces)/q9228(m.qty):0):q9228(pieces)*q9228(m?.qty);
  return base*(1+q9228(m?.loss)/100);
}
function rollInfo9228(m,need){
  const master=materialMaster9228(m);if(!master)return null;let conv=0;
  const pm=n9228(master.purchaseMode),pu=n9228(master.purchaseUnit),pn=n9228(master.packageName);
  if((pm.includes('rolo')||pu.includes('rolo'))&&q9228(master.purchaseConversion)>0)conv=q9228(master.purchaseConversion);
  else if(pn.includes('rolo')&&q9228(master.packageAvg)>0)conv=q9228(master.packageAvg);
  if(!conv)return null;return {count:Math.ceil(q9228(need)/conv-1e-9),conv};
}
function buildMaterials9228(c){
  const p=product9228(c?.productId),g=scaledGrade9228(c),byColor={};
  if(detailedGrade9228(g.rows))g.rows.forEach(x=>{const color=x.color||'Sem cor';byColor[color]=(byColor[color]||0)+q9228(x.qty)});
  if(!Object.keys(byColor).length)byColor.Total=q9228(c?.qty);
  const old=new Map((c?.materials||[]).map(x=>[[x.materialId||'',x.name||'',x.color||''].join('|'),!!x.checked]));
  const out=[];
  (p?.materials||[]).filter(m=>materialVisible9228(c,m)).forEach((m,i)=>{
    const master=materialMaster9228(m),cat=m.cat||master?.cat||'',avi=n9228(cat).includes('aviamento');
    const parts=avi&&detailedGrade9228(g.rows)?Object.entries(byColor):[['Total',q9228(c?.qty)]];
    parts.forEach(([color,pieces])=>{
      const need=materialNeed9228(pieces,m),ri=rollInfo9228(m,need),key=[m.materialId||master?.id||'',m.name||master?.name||'',avi?color:''].join('|');
      out.push({id:i+1,materialId:m.materialId||master?.id||null,name:m.name||master?.name||'Material',cat,unit:m.unit||master?.unit||'',color:avi?color:'',pieces:q9228(pieces),qty:need,rolls:ri?.count??null,rollConversion:ri?.conv||0,key9228:key,checked:old.get(key)??false});
    });
  });
  return out;
}
function destinationLabel9228(c){return String(c?.destinationType||'')==='F'?'facção':'confecção'}
function materialRowsHtml9228(c){
  c.materials=buildMaterials9228(c);
  return (c.materials||[]).map((m,i)=>'<tr><td><input type="checkbox" class="destinationMaterialCheck" data-i="'+i+'" '+(m.checked?'checked':'')+'></td><td><b>'+esc9228(m.name)+'</b></td><td>'+esc9228(m.cat||'-')+'</td><td>'+esc9228(m.color||'Total')+'</td><td>'+fmt9228(m.qty)+'</td><td>'+esc9228(m.unit||'')+'</td><td>'+(m.rolls!=null?'<b>'+fmt9228(m.rolls)+' rolo'+(m.rolls===1?'':'s')+'</b>'+(m.rollConversion?'<div class="sub">'+fmt9228(m.rollConversion)+' '+esc9228(m.unit||'')+'/rolo</div>':''):'-')+'</td></tr>').join('');
}
window.openChecklistGrade9228=function(id){
  const c=arr9228('materialChecklists').find(x=>String(x.id)===String(id));if(!c)return;
  const p=product9228(c.productId),current=sourceGrade9228(c).rows.filter(x=>detailedGrade9228([x]));
  let colors=[...(Array.isArray(p?.colors)?p.colors:[])].map(String).filter(Boolean),sizes=[...(Array.isArray(p?.sizes)?p.sizes:[])].map(String).filter(Boolean);
  current.forEach(x=>{if(x.color&&!colors.includes(x.color))colors.push(x.color);if(x.size&&!sizes.includes(x.size))sizes.push(x.size)});
  if(!colors.length)colors=[''];if(!sizes.length)sizes=[''];
  const qtyMap=new Map(current.map(x=>[[x.color||'',x.size||''].join('|'),q9228(x.qty)]));
  window.__hlgbGrade9228={id:String(id),colors,sizes,target:Math.floor(q9228(c.qty))};
  const head=sizes.map(s=>'<th>'+esc9228(s||'Qtd')+'</th>').join('');
  const body=colors.map((color,ci)=>'<tr><th>'+esc9228(color||'Sem cor')+'</th>'+sizes.map((size,si)=>'<td><input class="hlgb9228-grade-input" data-ci="'+ci+'" data-si="'+si+'" type="number" min="0" step="1" value="'+fmt9228(qtyMap.get([color||'',size||''].join('|'))||0)+'" oninput="hlgbGradeTotal9228()"></td>').join('')+'</tr>').join('');
  openModal('Grade do envio — '+(c.productName||'Produto'),'<div class="sub">Preencha exatamente a grade que está sendo enviada para '+esc9228(c.destinationName||'o destino')+'. O total precisa fechar <b>'+fmt9228(c.qty)+' peças</b>.</div><div class="hlgb9228-grade-editor"><table><thead><tr><th>Cor / Tamanho</th>'+head+'</tr></thead><tbody>'+body+'</tbody></table></div><div id="hlgb9228GradeTotal" class="hlgb9228-grade-total"></div><button type="button" class="primary modalSave">☁️ Salvar grade do envio</button>',async()=>{
    const st=window.__hlgbGrade9228||{},rows=[];let total=0;
    document.querySelectorAll('.hlgb9228-grade-input').forEach(inp=>{const qty=Math.max(0,Math.floor(q9228(inp.value)));if(!qty)return;const ci=+inp.dataset.ci,si=+inp.dataset.si;rows.push({productId:c.productId||null,color:st.colors?.[ci]||'',size:st.sizes?.[si]||'',qty,noGrade:false});total+=qty});
    if(total!==Math.floor(q9228(c.qty))){alert('A grade precisa totalizar '+fmt9228(c.qty)+' peças. Agora ela soma '+fmt9228(total)+' peças.');return false}
    const next=clone9228(c);next.grade9228=rows;next.gradeSource9228='checklist_envio';next.updatedAt=new Date().toISOString();
    let btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='☁️ Salvando grade…'}
    try{const saved=await saveRow9228('materialChecklists',next);upsert9228('materialChecklists',saved);try{localSaveOnly()}catch(e){}closeModal();setTimeout(()=>window.openMaterialChecklist(id),40);return true}catch(e){if(btn){btn.disabled=false;btn.textContent='☁️ Salvar grade do envio'}alert('Não foi possível salvar a grade na nuvem. '+String(e?.message||e));return false}
  });
  setTimeout(window.hlgbGradeTotal9228,20);
};
window.hlgbGradeTotal9228=function(){const target=q9228(window.__hlgbGrade9228?.target),total=[...document.querySelectorAll('.hlgb9228-grade-input')].reduce((a,x)=>a+Math.max(0,Math.floor(q9228(x.value))),0),el=document.getElementById('hlgb9228GradeTotal');if(el)el.innerHTML='Total informado: <b>'+fmt9228(total)+' pç</b> / '+fmt9228(target)+' pç'+(total===target?' ✅':' ⚠️')};
window.openChecklistMaterialSettings9228=function(){
  const mats=arr9228('materials').slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
  const rows=mats.map((m,i)=>'<tr><td><b>'+esc9228(m.name||'Material')+'</b><div class="sub">'+esc9228(m.cat||m.category||'')+'</div></td><td class="hlgb9228-check-cell"><input class="hlgb9228-mat-f" data-i="'+i+'" type="checkbox" '+(m.showFactionChecklist!==false?'checked':'')+'></td><td class="hlgb9228-check-cell"><input class="hlgb9228-mat-p" data-i="'+i+'" type="checkbox" '+(m.showProductionChecklist!==false?'checked':'')+'></td></tr>').join('');
  window.__hlgbMaterials9228=mats;
  openModal('Matérias-primas mostradas no checklist','<div class="sub">Escolha quais materiais devem aparecer para conferência quando o produto for enviado para <b>facção</b> ou para uma <b>confecção interna</b>. A configuração vale para todos os produtos que usam essa matéria-prima.</div><div class="toolbar" style="margin-top:10px"><button type="button" class="secondary" onclick="document.querySelectorAll(\'.hlgb9228-mat-f\').forEach(x=>x.checked=true)">Marcar todas — facção</button><button type="button" class="secondary" onclick="document.querySelectorAll(\'.hlgb9228-mat-p\').forEach(x=>x.checked=true)">Marcar todas — confecção</button></div><div class="hlgb9228-settings-table"><table><thead><tr><th>Matéria-prima</th><th>Mostrar na facção</th><th>Mostrar na confecção</th></tr></thead><tbody>'+(rows||'<tr><td colspan="3">Nenhuma matéria-prima cadastrada.</td></tr>')+'</tbody></table></div><button type="button" class="primary modalSave" style="margin-top:12px">☁️ Salvar configuração</button>',async()=>{
    const list=window.__hlgbMaterials9228||[],changed=[];
    list.forEach((m,i)=>{const f=!!document.querySelector('.hlgb9228-mat-f[data-i="'+i+'"]')?.checked,p=!!document.querySelector('.hlgb9228-mat-p[data-i="'+i+'"]')?.checked;if(m.showFactionChecklist!==f||m.showProductionChecklist!==p){const next=clone9228(m);next.showFactionChecklist=f;next.showProductionChecklist=p;next.updatedAt=new Date().toISOString();changed.push(next)}});
    let btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='☁️ Salvando configuração…'}
    try{for(const row of changed){const saved=await saveRow9228('materials',row);upsert9228('materials',saved)}arr9228('materialChecklists').forEach(c=>{c.materials=buildMaterials9228(c)});try{localSaveOnly()}catch(e){}closeModal();try{window.renderFactionChecklists9198?.()}catch(e){}try{window.renderDestinationChecklists?.()}catch(e){}setTimeout(ensureConfigButtons9228,40);alert('Configuração dos checklists salva na nuvem.');return true}catch(e){if(btn){btn.disabled=false;btn.textContent='☁️ Salvar configuração'}alert('Não foi possível salvar toda a configuração. '+String(e?.message||e));return false}
  });
};
window.openMaterialChecklist=function(id){
  const c=arr9228('materialChecklists').find(x=>String(x.id)===String(id));if(!c)return;
  const rows=materialRowsHtml9228(c),label=destinationLabel9228(c);
  openModal('Checklist da '+label,'<div class="grid"><div class="field"><label>Destino</label><input value="'+esc9228(c.destinationName||'')+'" disabled></div><div class="field"><label>Modelo</label><input value="'+esc9228(c.productName||'')+'" disabled></div><div class="field"><label>Peças</label><input value="'+fmt9228(c.qty)+'" disabled></div></div><h3 style="margin-top:14px">📐 Grade do produto enviado</h3>'+gradeHtml9228(c)+'<div class="toolbar"><button type="button" class="secondary" onclick="openChecklistGrade9228(\''+String(c.id).replace(/'/g,"\\'")+'\')">✏️ Informar/editar grade do envio</button><button type="button" class="secondary" onclick="openChecklistMaterialSettings9228()">⚙️ Matérias-primas do checklist</button><button type="button" class="secondary" onclick="document.querySelectorAll(\'.destinationMaterialCheck\').forEach(x=>x.checked=true)">Marcar todos</button><button type="button" class="secondary" onclick="printMaterialChecklist(\''+String(c.id).replace(/'/g,"\\'")+'\')">🖨️ Imprimir folha</button></div><div style="overflow:auto"><table><tr><th>OK</th><th>Material</th><th>Categoria</th><th>Cor</th><th>Quantidade</th><th>Unidade</th><th>Rolos</th></tr>'+(rows||'<tr><td colspan="7">Nenhum material habilitado para este tipo de destino.</td></tr>')+'</table></div><div class="grid"><div class="field"><label>Conferido por</label><input id="checkReceivedBy" value="'+esc9228(c.receivedBy||'')+'"></div><div class="field"><label>Data</label><input id="checkReceivedAt" type="date" value="'+(c.receivedAt||(typeof isoDate==='function'?isoDate(new Date()):new Date().toISOString().slice(0,10)))+'"></div><div class="field"><label>Observação</label><input id="checkNote" value="'+esc9228(c.note||'')+'"></div></div><button type="button" class="primary modalSave">☁️ Salvar conferência</button>',async()=>{
    const next=clone9228(c);next.materials=buildMaterials9228(c);next.materials.forEach((m,i)=>m.checked=!!document.querySelector('.destinationMaterialCheck[data-i="'+i+'"]')?.checked);next.receivedBy=document.getElementById('checkReceivedBy')?.value||'';next.receivedAt=document.getElementById('checkReceivedAt')?.value||'';next.note=document.getElementById('checkNote')?.value||'';next.status=next.materials.length?(next.materials.every(m=>m.checked)?'Conferido':'Pendente'):'Conferido';next.updatedAt=new Date().toISOString();
    let btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='☁️ Confirmando…'}
    try{const saved=await saveRow9228('materialChecklists',next);upsert9228('materialChecklists',saved);try{localSaveOnly()}catch(e){}closeModal();try{window.renderFactionChecklists9198?.()}catch(e){}try{window.renderDestinationChecklists?.()}catch(e){}alert('Checklist confirmado na nuvem.');return true}catch(e){if(btn){btn.disabled=false;btn.textContent='☁️ Salvar conferência'}alert('O checklist não foi confirmado na nuvem. '+String(e?.message||e));return false}
  });
};
window.printMaterialChecklist=function(id){
  const c=arr9228('materialChecklists').find(x=>String(x.id)===String(id));if(!c)return;c.materials=buildMaterials9228(c);
  const mats=(c.materials||[]).map(m=>'<tr><td>☐</td><td>'+esc9228(m.name)+'</td><td>'+esc9228(m.cat||'-')+'</td><td>'+esc9228(m.color||'Total')+'</td><td>'+fmt9228(m.qty)+'</td><td>'+esc9228(m.unit||'')+'</td><td>'+(m.rolls!=null?fmt9228(m.rolls)+' rolo'+(m.rolls===1?'':'s'):'-')+'</td></tr>').join('');
  const w=window.open('','_blank');if(!w){alert('Permita pop-ups para imprimir.');return}
  w.document.write('<html><head><title>Checklist — '+esc9228(c.destinationName||'')+'</title><style>body{font-family:Arial;padding:26px;color:#222}table{width:100%;border-collapse:collapse;margin:10px 0 18px}th,td{border:1px solid #aaa;padding:7px;font-size:12px;text-align:left}h1{font-size:21px}h2{font-size:16px}.note{padding:8px;border:1px solid #ccc;background:#fafafa}</style></head><body><h1>HLGB Confecções — Checklist da '+destinationLabel9228(c)+'</h1><p><b>Destino:</b> '+esc9228(c.destinationName||'-')+'<br><b>Modelo:</b> '+esc9228(c.productName||'-')+'<br><b>Quantidade:</b> '+fmt9228(c.qty)+' peças</p><h2>Grade do produto enviado</h2>'+gradeHtml9228(c)+'<h2>Matéria-prima / aviamentos</h2><table><tr><th>OK</th><th>Material</th><th>Categoria</th><th>Cor</th><th>Quantidade</th><th>Unidade</th><th>Rolos</th></tr>'+(mats||'<tr><td colspan="7">Nenhum material habilitado para este destino.</td></tr>')+'</table><p>Conferido por: __________________________ Data: ____/____/________</p><p>Observação: ______________________________________________________________</p><script>window.onload=()=>window.print();<\/script></body></html>');w.document.close();
};
function ensureConfigButtons9228(){
  const targets=['factionChecklistTable9176','destinationChecklistTable'];
  targets.forEach(id=>{const table=document.getElementById(id);if(!table)return;const panel=table.closest('.panel');if(!panel||panel.querySelector('.hlgb9228-config-btn'))return;const btn=document.createElement('button');btn.type='button';btn.className='secondary hlgb9228-config-btn';btn.textContent='⚙️ Matérias-primas do checklist';btn.onclick=window.openChecklistMaterialSettings9228;const top=panel.querySelector(':scope > .toolbar');if(top)top.appendChild(btn);else{btn.style.margin='0 0 10px';table.before(btn)}});
}
const oldFactions9228=window.renderFactions;if(typeof oldFactions9228==='function')window.renderFactions=function(){const r=oldFactions9228.apply(this,arguments);setTimeout(ensureConfigButtons9228,40);return r};
const oldDest9228=window.renderDestinationChecklists;if(typeof oldDest9228==='function')window.renderDestinationChecklists=function(){const r=oldDest9228.apply(this,arguments);setTimeout(ensureConfigButtons9228,40);return r};
function setVersion9228(){try{document.title='HLGB Confecções — Sistema de Gestão v92.28 Multiusuário'}catch(e){}const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v92.28';ensureConfigButtons9228()}
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(setVersion9228,250);setTimeout(setVersion9228,1400)},0);else{setTimeout(setVersion9228,700)}
console.log('[HLGB] v92.28 grade exata do envio no checklist e visibilidade de matérias-primas por facção/confecção');
})();
</script>
<!-- HLGB_V9228_CHECKLIST_GRADE_MATERIAL_VISIBILITY_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('HLGB Confecções — Sistema de Gestão v92.27 Multiusuário','HLGB Confecções — Sistema de Gestão v92.28 Multiusuário',1)
if 'HLGB_V9228_CHECKLIST_GRADE_MATERIAL_VISIBILITY_START' not in s: raise SystemExit('Marcador v92.28 ausente')
if 'openChecklistGrade9228' not in s or 'openChecklistMaterialSettings9228' not in s: raise SystemExit('Funções v92.28 ausentes')
out.write_text(s,encoding='utf-8')
Path('abrir.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.28</title><script>(function(){window.location.replace('./app9228.html?v=92.28&fresh='+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>''',encoding='utf-8')
print('v92.28 preparada: grade do envio e configuração de matérias-primas por destino')
