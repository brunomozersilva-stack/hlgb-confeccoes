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
  let shown=0,total=0;root.querySelectorAll('tbody tr').forEach(tr=>{total++;const ok=(!q||String(tr.dataset.hlgbSearch||'').includes(q))&&(!priority||tr.dataset.hlgbPriority===priority)&&(!cutter||tr.dataset.hlgbCutter===cutter)&&(!date||tr.dataset.hlgbDate===date);tr.style.display=ok?'':'none';if(ok)shown++});
  const count=document.getElementById('hlgbCutFilterCount');if(count)count.textContent=shown+' de '+total+' corte(s)';
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
const old=window.renderCuts;if(typeof old==='function'&&!old.__hlgbOrgV1){const w=function(){const r=old.apply(this,arguments);setTimeout(()=>{apply();applyExtraState()},0);return r};w.__hlgbOrgV1=true;w.__original=old;window.renderCuts=w}
function boot(){try{apply();applyExtraState()}catch(e){console.warn('[HLGB corte organização]',e)}}try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,1000),0)}catch(e){}setTimeout(boot,1700);
window.HLGB_CUT_ORGANIZATION_GUARD=V;
console.info('[HLGB] organização da aba Corte ativa');
})();