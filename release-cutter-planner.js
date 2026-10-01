/* HLGB — programação rápida dos cortadores */
(function(){
'use strict';
const V='2026.10.01-cutter-planner-v2';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),today=()=>new Date().toISOString().slice(0,10);
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function orderById(id){return arr('orders').find(o=>sid(o?.id)===sid(id))||null}
function productById(id){return arr('products').find(p=>sid(p?.id)===sid(id))||null}
function cutterById(id){return arr('cutters').find(c=>sid(c?.id)===sid(id))||null}
function displayNo(o){try{return typeof displayOrderNumber==='function'?displayOrderNumber(o):(o?.orderNumber||o?.id)}catch(e){return o?.id}}
function productName(c){
  const p=productById(c?.productId);if(p?.name)return p.name;
  const txt=String(c?.product||'');const m=txt.match(/(?:\d+\s+)?([^|]+?)(?:\s+Tam\s+|\s*$)/i);return (m?.[1]||txt||'Produto').trim();
}
function dedupeKey(c){
  const pid=sid(c?.productId||'');
  if(pid)return sid(c?.orderId)+'|'+pid;
  return sid(c?.orderId)+'|'+norm(productName(c));
}
function eligibleCuts(){
  const map=new Map();
  for(const c of arr('cuts')){
    if(!c||norm(c.status)==='finalizado')continue;
    const key=dedupeKey(c),prev=map.get(key);
    if(!prev){map.set(key,c);continue}
    const prevAssigned=!!prev.cutterId,curAssigned=!!c.cutterId;
    if(curAssigned&&!prevAssigned){map.set(key,c);continue}
    const pd=String(prev.plannedCutDate||prev.date||'9999-12-31'),cd=String(c.plannedCutDate||c.date||'9999-12-31');
    if(curAssigned===prevAssigned&&cd<pd)map.set(key,c);
  }
  return [...map.values()].map(c=>{const o=orderById(c.orderId);return {cut:c,order:o,productName:productName(c),orderNo:displayNo(o),client:o?.client||c.client||'-',priority:o?.priority||'Padrão',pieces:q(c.pieces),date:String(c.plannedCutDate||c.date||'').slice(0,10),cutterId:c.cutterId||''}}).sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999'))||String(a.productName).localeCompare(String(b.productName),'pt-BR'));
}
function matches(term){
  const n=norm(term);if(!n)return [];
  return eligibleCuts().filter(x=>norm([x.productName,x.client,x.orderNo,x.priority].join(' ')).includes(n)).slice(0,40);
}
function renderMatches(){
  const box=document.getElementById('hlgbCutterPlannerResults');if(!box)return;
  const term=document.getElementById('hlgbCutterPlannerSearch')?.value||'';
  if(!norm(term)){box.innerHTML='<div class="empty">Digite o nome do produto, cliente ou número do pedido para pesquisar.</div>';return}
  const rows=matches(term);
  box.innerHTML=rows.length?rows.map(x=>'<button type="button" class="secondary hlgbCutterPlanChoice" data-id="'+escSafe(x.cut.id)+'" style="text-align:left;width:100%;margin:4px 0;padding:10px 12px"><b>'+escSafe(x.productName)+'</b> · Pedido #'+escSafe(x.orderNo)+' · '+escSafe(x.client)+' · '+x.pieces.toLocaleString('pt-BR')+' pç · '+escSafe(x.priority)+(x.date?' · '+escSafe(x.date):'')+'</button>').join(''):'<div class="empty">Nenhum corte planejado encontrado para essa busca.</div>';
  box.querySelectorAll('.hlgbCutterPlanChoice').forEach(b=>b.onclick=()=>selectCut(b.dataset.id));
}
let selectedId='';
function selectCut(id){
  selectedId=sid(id);const x=eligibleCuts().find(r=>sid(r.cut.id)===selectedId);if(!x)return;
  const info=document.getElementById('hlgbCutterPlannerSelected');if(info)info.innerHTML='<b>'+escSafe(x.productName)+'</b> · Pedido #'+escSafe(x.orderNo)+' · '+escSafe(x.client)+' · '+x.pieces.toLocaleString('pt-BR')+' peças · '+escSafe(x.priority);
  const date=document.getElementById('hlgbCutterPlannerDate');if(date)date.value=x.date||today();
  const cutter=document.getElementById('hlgbCutterPlannerCutter');if(cutter&&x.cutterId)cutter.value=sid(x.cutterId);
}
async function save(){
  const x=eligibleCuts().find(r=>sid(r.cut.id)===selectedId);if(!x)throw new Error('Selecione um produto/corte.');
  const date=document.getElementById('hlgbCutterPlannerDate')?.value||'',cutterId=document.getElementById('hlgbCutterPlannerCutter')?.value||'';
  if(!date)throw new Error('Escolha a data do corte.');if(!cutterId)throw new Error('Escolha o cortador.');
  const dup=arr('cuts').find(c=>sid(c?.id)!==sid(x.cut.id)&&dedupeKey(c)===dedupeKey(x.cut)&&sid(c?.cutterId)===sid(cutterId)&&String(c?.plannedCutDate||c?.date||'').slice(0,10)===date&&norm(c?.status)!=='finalizado');
  if(dup)throw new Error('Já existe programação igual para este pedido/produto, cortador e data.');
  const next={...x.cut,plannedCutDate:date,date:x.cut.date||date,cutterId:Number.isFinite(+cutterId)&&String(+cutterId)===String(cutterId)?+cutterId:cutterId,updatedAt:new Date().toISOString()};
  if(typeof hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação oficial indisponível.');
  const out=await hlgbRecordSaveWithRetry('cuts',sid(next.id),next,false);if(!out?.applied)throw new Error('A nuvem não confirmou a programação.');
  const i=arr('cuts').findIndex(c=>sid(c?.id)===sid(next.id));if(i>=0)db.cuts[i]=out.data||next;
  try{localSaveOnly?.()}catch(e){}
  try{renderCuts?.();renderCutters?.();drawCutterChart?.()}catch(e){}
  const ok=document.getElementById('hlgbCutterPlannerFeedback');if(ok)ok.innerHTML='<span class="badge ok">Programado para '+escSafe(date)+' · '+escSafe(cutterById(cutterId)?.name||'Cortador')+'</span>';
  selectedId='';const s=document.getElementById('hlgbCutterPlannerSearch');if(s)s.value='';renderMatches();return true;
}
function ensurePanel(){
  const page=document.getElementById('cortadores');if(!page||document.getElementById('hlgbCutterPlanner'))return;
  const first=page.querySelector(':scope > .panel');const panel=document.createElement('div');panel.id='hlgbCutterPlanner';panel.className='panel';
  panel.innerHTML='<h2>🔎 Programar corte por produto</h2><div class="sub">Nada aparece antes da busca. Pesquise um produto, cliente ou pedido e escolha apenas o corte desejado.</div><div class="toolbar" style="align-items:flex-end;flex-wrap:wrap;margin-top:10px"><div class="field" style="min-width:260px;flex:1"><label>Produto / cliente / pedido</label><input id="hlgbCutterPlannerSearch" placeholder="Ex.: Camisola, Gisele ou pedido 87" oninput="hlgbCutterPlannerRender()"></div><div class="field"><label>Data do corte</label><input id="hlgbCutterPlannerDate" type="date" value="'+today()+'"></div><div class="field" style="min-width:200px"><label>Cortador</label><select id="hlgbCutterPlannerCutter"><option value="">Selecione</option>'+arr('cutters').filter(c=>c.active!==false).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR')).map(c=>'<option value="'+escSafe(c.id)+'">'+escSafe(c.name||'Cortador')+'</option>').join('')+'</select></div><button type="button" class="primary" onclick="hlgbCutterPlannerSave()">Salvar programação</button></div><div id="hlgbCutterPlannerSelected" class="sub" style="margin-top:8px">Nenhum produto selecionado.</div><div id="hlgbCutterPlannerFeedback" style="margin-top:6px"></div><div id="hlgbCutterPlannerResults" style="max-height:280px;overflow:auto;margin-top:10px"><div class="empty">Digite para pesquisar.</div></div>';
  if(first)page.insertBefore(panel,first);else page.appendChild(panel);
}
window.hlgbCutterPlannerRender=renderMatches;window.hlgbCutterPlannerSave=async()=>{try{return await save()}catch(e){alert(String(e?.message||e));return false}};
window.hlgbCutterPlanner={eligibleCuts,matches,selectCut,save,dedupeKey};
const old=window.renderCutters;if(typeof old==='function'&&!old.__hlgbPlannerV2){const w=function(){const r=old.apply(this,arguments);setTimeout(ensurePanel,0);return r};w.__hlgbPlannerV2=true;w.__original=old;window.renderCutters=w}
function boot(){try{ensurePanel()}catch(e){console.warn('[HLGB cutter planner]',e)}}try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,900),0)}catch(e){}setTimeout(boot,1600);
window.HLGB_CUTTER_PLANNER_GUARD=V;
console.info('[HLGB] programação rápida de cortadores v2 ativa');
})();