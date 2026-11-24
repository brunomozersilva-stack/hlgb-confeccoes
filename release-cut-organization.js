/* HLGB — organização e busca da aba Corte */
(function(){
'use strict';
const V='2026.10.01-cut-organization-v1';
const sid=v=>String(v??''),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function cutByRow(tr){const b=[...tr.querySelectorAll('button[onclick]')].find(x=>/editCut\(([^)]+)\)/.test(x.getAttribute('onclick')||''));const m=(b?.getAttribute('onclick')||'').match(/editCut\(([^)]+)\)/);return m?arr('cuts').find(c=>sid(c?.id)===sid(m[1].replace(/['"]/g,''))):null}
function orderById(id){return arr('orders').find(o=>sid(o?.id)===sid(id))||null}
function cutterById(id){return arr('cutters').find(c=>sid(c?.id)===sid(id))||null}
function ensureToolbar(){
  const root=document.getElementById('cutTable'),panel=root?.closest?.('.panel');if(!root||!panel||document.getElementById('hlgbCutFilters'))return;
  const bar=document.createElement('div');bar.id='hlgbCutFilters';bar.className='toolbar';bar.style.cssText='align-items:flex-end;flex-wrap:wrap;margin:10px 0';
  bar.innerHTML='<div class="field" style="min-width:260px;flex:1"><label>Buscar corte</label><input id="hlgbCutSearch" placeholder="Pedido, cliente, produto ou cortador" oninput="hlgbCutApplyFilters()"></div><div class="field"><label>Urgência</label><select id="hlgbCutPriority" onchange="hlgbCutApplyFilters()"><option value="">Todas</option><option>Padrão</option><option>Urgente</option><option>Urgentíssimo</option></select></div><div class="field"><label>Cortador</label><select id="hlgbCutCutter" onchange="hlgbCutApplyFilters()"><option value="">Todos</option></select></div><div class="field"><label>Data do corte</label><input id="hlgbCutDate" type="date" onchange="hlgbCutApplyFilters()"></div><button type="button" class="secondary" onclick="hlgbCutClearFilters()">Limpar</button><button type="button" class="secondary" onclick="hlgbCutToggleExtra()">Seções adicionais</button><div id="hlgbCutFilterCount" class="sub" style="align-self:center"></div>';
  root.insertAdjacentElement('beforebegin',bar);
}
function syncCutters(){
  const sel=document.getElementById('hlgbCutCutter');if(!sel)return;const cur=sel.value;
  sel.innerHTML='<option value="">Todos</option>'+arr('cutters').filter(c=>c.active!==false).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR')).map(c=>'<option value="'+sid(c.id)+'">'+String(c.name||'Cortador').replace(/</g,'&lt;')+'</option>').join('');
  if([...sel.options].some(o=>o.value===cur))sel.value=cur;
}
function decorateRows(){
  const root=document.getElementById('cutTable');if(!root)return;
  root.querySelectorAll('tbody tr').forEach(tr=>{
    const c=cutByRow(tr);if(!c)return;const o=orderById(c.orderId),ct=cutterById(c.cutterId);
    tr.dataset.hlgbSearch=norm([o?.client,c.product,ct?.name,c.op,o?.priority,c.date,c.plannedCutDate].join(' '));tr.dataset.hlgbPriority=String(o?.priority||'Padrão');tr.dataset.hlgbCutter=sid(c.cutterId||'');tr.dataset.hlgbDate=String(c.plannedCutDate||c.date||'').slice(0,10);
    if(!tr.querySelector('.hlgbCutMeta')){
      const cell=tr.children?.[2];if(cell){const meta=document.createElement('div');meta.className='sub hlgbCutMeta';meta.style.marginTop='4px';meta.textContent='📅 '+(tr.dataset.hlgbDate||'Sem data')+' · ✂️ '+(ct?.name||'Sem cortador');cell.appendChild(meta)}
    }
    if(/urgentissimo|urgentíssimo/i.test(o?.priority||''))tr.style.outline='2px solid rgba(180,35,24,.22)';
  });
}
function apply(){
  ensureToolbar();syncCutters();decorateRows();
  const root=document.getElementById('cutTable');if(!root)return;
  const q=norm(document.getElementById('hlgbCutSearch')?.value||''),priority=document.getElementById('hlgbCutPriority')?.value||'',cutter=document.getElementById('hlgbCutCutter')?.value||'',date=document.getElementById('hlgbCutDate')?.value||'';
  let shown=0,total=0;root.querySelectorAll('tbody tr').forEach(tr=>{total++;const cut=cutByRow(tr),st=norm(cut?.status||'');
    // Filtro não pode reabrir corte-pai desmembrado nem modelo já finalizado.
    const completed=!!cut&&(st==='finalizado'||st.includes('desmembrado')||
      cut.modelSplitParentV1===true||cut.hiddenByModelSplitV1===true);
    const ok=!completed&&(!q||String(tr.dataset.hlgbSearch||'').includes(q))&&
      (!priority||tr.dataset.hlgbPriority===priority)&&(!cutter||tr.dataset.hlgbCutter===cutter)&&
      (!date||tr.dataset.hlgbDate===date);tr.style.display=ok?'':'none';if(ok)shown++});
  const count=document.getElementById('hlgbCutFilterCount');if(count)count.textContent=shown+' de '+total+' corte(s)';
}

/* v96.43: read-only bridge to material separation, without moving legacy controls. */
const cutSeparationWorkspace9643=(function core(){
 const id=v=>(typeof v==='number'&&Number.isSafeInteger(v)&&v>0||typeof v==='string'&&v.trim()&&v.length<=120)?String(v).trim():'';
 const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 const int=v=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?v:typeof v==='string'&&/^\d+$/.test(v)&&Number.isSafeInteger(Number(v))?Number(v):null;
 const live=x=>x&&!x.deletedAt&&!x.deleted_at&&x.deleted!==true&&x._deleted!==true;
 function inspect(db,allowed,canonicalPairs){
  if(allowed!==true)return {state:'forbidden',rows:[],issues:[]};
  if(!db||!['orders','products','separations','cuts','production','operationalWriteoffs'].every(k=>Array.isArray(db[k])))return {state:'unavailable',rows:[],issues:['missing-source']};
  if(!(canonicalPairs instanceof Set))return {state:'unavailable',rows:[],issues:['writeoff-authority-unavailable']};
  const rows=[],issues=[],orders=new Map(),products=new Map();
  for(const [arr,map] of [[db.orders,orders],[db.products,products]])for(const o of arr.filter(live)){const k=id(o.id);if(k)map.set(k,map.has(k)?null:o)}
  for(const [oid,o] of orders){
   if(!o){issues.push('duplicate-order');continue}
   const st=norm(o.status);
   if(o.workflowSourceOrderId||o.invoiceReady||o.noteReady||/finalizad|cancelad|entregue|mercadoria pronta|nota emitida|em producao|^producao$/.test(st)||norm(o.cutStatus).includes('finalizado'))continue;
   if(!/separacao|aguardando material|aguardando corte|pedido criado|pedido para corte|^corte$|^planejado$|^aberto$/.test(st)){issues.push('unmapped-order-status');continue}
   const grade=Array.isArray(o.grade)?o.grade:[],groups=new Map();let bad=false;
   for(const g of grade){const pid=id(g?.productId),q=int(g?.qty);if(!pid||!products.get(pid)||q===null||!norm(g.color)||!norm(g.size)){bad=true;continue}if(q===0)continue;const row=groups.get(pid)||{pid,qty:0,grade:[]};row.qty+=q;row.grade.push({color:String(g.color),size:String(g.size),qty:q});groups.set(pid,row)}
   if(bad||!groups.size){issues.push('grade-review');continue}
   const seps=db.separations.filter(s=>live(s)&&id(s.orderId)===oid),s=seps.length===1?seps[0]:null;
   for(const g of groups.values()){
    const p=products.get(g.pid),issuesFor=[],matches=db.cuts.filter(c=>live(c)&&id(c.orderId)===oid&&(id(c.productId)===g.pid||!id(c.productId)));
    const production=db.production.some(c=>live(c)&&id(c.orderId)===oid&&(!id(c.productId)||id(c.productId)===g.pid));
    const writeoffs=db.operationalWriteoffs.some(w=>live(w)&&((id(w.orderId)===oid&&(!id(w.productId)||id(w.productId)===g.pid))||[...(Array.isArray(w.orderProductRefs)?w.orderProductRefs:[]),...(Array.isArray(w.sourceRefs)?w.sourceRefs:[])].some(x=>typeof x==='object'&&x&&id(x.orderId)===oid&&(!id(x.productId)||id(x.productId)===g.pid))));
    if(production||writeoffs||canonicalPairs.has(oid+'|'+g.pid)||canonicalPairs.has(oid+'|*')||matches.some(c=>norm(c.status).includes('finalizado')))continue;
    if(matches.some(c=>!id(c.productId)||c.modelSplitParentV1||c.hiddenByModelSplitV1||(groups.size>1&&(id(c.id)===oid||Number(c.pieces)>=Array.from(groups.values()).reduce((sum,x)=>sum+x.qty,0)||new Set([...(c.originalGrade||[]),...(c.actualCutGrade||[])].map(x=>id(x?.productId)).filter(Boolean)).size>1)))||matches.length>1)issuesFor.push('ambiguous-cut');
    const entries=Object.entries(s?.modelProgress||{}).filter(([k])=>k===g.pid||k.split(':').pop()===g.pid);
    let separated=null;if(seps.length>1)issuesFor.push('multiple-separations');else if(entries.length>1)issuesFor.push('ambiguous-progress');else if(entries.length===1){const q=int(entries[0][1]?.qty);if(q!==null&&q<=g.qty)separated=q;else issuesFor.push('invalid-progress')}else if(s?.done)issuesFor.push('legacy-done-without-model-proof');else if(!s||s.done===false)separated=0;
    const materials=[];for(const m of Array.isArray(p.materials)?p.materials:[]){const q=Number(m.qty),loss=Number(m.loss||0),unit=String(m.unit||'');if(!m.name||!Number.isFinite(q)||q<=0||!Number.isFinite(loss)||loss<0||!unit||!['yield','consumption'].includes(m.calcMode||'consumption')){issuesFor.push('material-review');continue}const amount=(m.calcMode==='yield'?g.qty/q:g.qty*q)*(1+loss/100);if(!Number.isFinite(amount)){issuesFor.push('material-review');continue}materials.push({name:String(m.name),unit,amount})}
    if(!materials.length)issuesFor.push('no-materials');
    rows.push({orderId:oid,productId:g.pid,productName:String(p.name||'Modelo'),orderNumber:String(o.orderNumber||o.id),ordered:g.qty,grade:g.grade,separatedObserved:separated,materials,issues:issuesFor,cutId:matches.length===1&&issuesFor.indexOf('ambiguous-cut')<0?id(matches[0].id):null,confirmation:'not-verified',canWrite:false});
   }
  }
  return {state:'local-observation',rows,issues};
 }
 return {inspect};
})();
function separationAllowed9643(){try{return window.__HLGB_AUTH_READY===true&&typeof canOpenPage==='function'&&canOpenPage('corte')&&canOpenPage('pedidos')&&canOpenPage('materiais')&&canOpenPage('produtos')}catch(_){return false}}
function inspectWorkspace9643(){
 const authority=window.hlgbWriteoffIntegrity9391;if(typeof authority?.pairIndex!=='function')return {state:'unavailable',rows:[],issues:['writeoff-authority-unavailable']};
 const pairs=authority.pairIndex();return cutSeparationWorkspace9643.inspect(typeof db!=='undefined'?db:window.db,separationAllowed9643(),pairs);
}
function renderSeparationWorkspace9643(){
 const root=document.getElementById('corte'),table=document.getElementById('cutTable');if(!root||!table)return;
 let host=document.getElementById('hlgbCutSeparation9643');
 if(!separationAllowed9643()){host?.remove();return}
 if(!root.classList.contains('active')){host?.remove();return}
 if(!host){host=document.createElement('section');host.id='hlgbCutSeparation9643';host.className='panel';table.closest('.panel')?.insertAdjacentElement('beforebegin',host)}
 const el=(tag,text,parent=host)=>{const x=document.createElement(tag);x.textContent=text;parent.appendChild(x);return x};
 const previousQuery=host.querySelector('input[type=search]')?.value||'';
 host.replaceChildren();el('h2','Materiais e separação por modelo');el('p','Consulta dos pedidos e do progresso local. Conferência e baixa continuam na rotina existente.');
 let result;try{result=inspectWorkspace9643()}catch(_){result={state:'unavailable',rows:[],issues:[]}}
 if(result.state!=='local-observation'){el('p','Dados necessários ainda não disponíveis.');return}
 const field=el('input','');field.type='search';field.value=previousQuery;field.placeholder='Buscar pedido ou modelo';field.setAttribute('aria-label','Buscar pedido ou modelo em separação');
 const list=el('div','');const fmt=x=>Number(x).toLocaleString('pt-BR',{maximumFractionDigits:3});
 function draw(){
  list.replaceChildren();const q=norm(field.value);const visible=result.rows.filter(x=>!q||norm(x.orderNumber+' '+x.productName).includes(q));
  el('p',visible.length+' modelo(s) observados.',list);
  for(const row of visible.slice(0,100)){const card=el('article','',list);card.className='panel';el('h3','Pedido #'+row.orderNumber+' · '+row.productName,card);el('p',row.ordered+' peças pedidas · Separadas (local): '+(row.separatedObserved===null?'Revisar histórico':row.separatedObserved),card);
   const detail=el('details','',card);el('summary','Checklist de material — consulta',detail);
   for(const m of row.materials)el('p',m.name+' · '+fmt(m.amount)+' '+m.unit+' necessários (estimativa)',detail);
   if(row.issues.length)el('p','Revisão necessária: '+row.issues.join(', '),detail);
   const actions=el('div','',card);actions.className='toolbar';
   const sep=el('button','Abrir separação do pedido',actions);sep.type='button';sep.className='secondary';sep.onclick=()=>{if(!separationAllowed9643())return;try{if(typeof page==='function'&&typeof selectSeparationOrder==='function'){page('pedidos',null);selectSeparationOrder(row.orderId)}}catch(_){alert('Separação indisponível. Abra pelo menu de Pedidos.')}};
   const print=el('button','Folha de corte do modelo',actions);print.type='button';print.className='secondary';print.disabled=!row.cutId;print.onclick=()=>{if(!separationAllowed9643()||!row.cutId)return;const fresh=inspectWorkspace9643().rows.find(x=>x.orderId===row.orderId&&x.productId===row.productId&&x.cutId===row.cutId);if(!fresh||typeof window.printCuttingSheet!=='function'){alert('Corte precisa de revisão antes de imprimir.');return}window.printCuttingSheet(row.orderId,row.cutId)};
   if(!row.cutId)el('p','Folha individual disponível quando houver corte identificado; impressão antiga permanece em Pedidos.',card);
  }
  if(visible.length>100)el('p','Mostrando 100 resultados; refine a busca para consultar os demais.',list);
 }
 field.addEventListener('input',draw);draw();
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
window.hlgbCutApplyFilters=apply;window.hlgbCutClearFilters=clearFilters;window.hlgbCutToggleExtra=toggleExtra;window.hlgbCutOrganization={apply,secondaryPanels};
const old=window.renderCuts;if(typeof old==='function'&&!old.__hlgbOrgV1){const w=function(){const r=old.apply(this,arguments);setTimeout(()=>{apply();applyExtraState();renderSeparationWorkspace9643()},0);return r};w.__hlgbOrgV1=true;w.__original=old;window.renderCuts=w}
function boot(){try{apply();applyExtraState();renderSeparationWorkspace9643()}catch(e){console.warn('[HLGB corte organização]',e)}}try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,1000),0)}catch(e){}setTimeout(boot,1700);
window.HLGB_CUT_ORGANIZATION_GUARD=V;
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(renderSeparationWorkspace9643,0));
window.addEventListener?.('hlgb:logout',()=>document.getElementById('hlgbCutSeparation9643')?.remove());
console.info('[HLGB] organização da aba Corte ativa');
})();