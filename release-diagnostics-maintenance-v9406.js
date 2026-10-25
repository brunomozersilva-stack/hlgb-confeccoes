/* ByHagatha v94.06 — leitura operacional da Central de Erros.
   Não altera dados, não cria autoridade de save e não marca erro como resolvido automaticamente.
   Separa ocorrências desta abertura do histórico e agrupa duplicidades visuais do mesmo problema/registro. */
(function(){
'use strict';
const V='94.06',SESSION_STARTED_AT=Date.now();
if(window.HLGB_DIAGNOSTICS_MAINTENANCE_9406===V)return;
window.HLGB_DIAGNOSTICS_MAINTENANCE_9406=V;
const sid=v=>String(v??'');
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
function data(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}return window.db||null}
function issues(){const d=data();return Array.isArray(d?.systemIssues)?d.systemIssues:[]}
function unresolved(x){return norm(x?.status)!=='resolvido'}
function seenMs(x){const n=Date.parse(String(x?.lastSeenAt||x?.firstSeenAt||''));return Number.isFinite(n)?n:0}
function currentSession(x){return unresolved(x)&&seenMs(x)>=SESSION_STARTED_AT-30000}
function refsKey(x){return (Array.isArray(x?.recordRefs)?x.recordRefs:[]).map(r=>sid(r?.module||r?.label)+':'+sid(r?.id)).sort().join('|')}
function logicalKey(x){return [norm(x?.sourceType),norm(x?.title),refsKey(x)].join('|')}
function pendingRefs(){
 const out=new Set();
 try{const p=JSON.parse(localStorage.getItem('hlgb_records_pending_v91')||'null');for(const [m,a] of Object.entries(p?.modules||{}))for(const op of (Array.isArray(a)?a:[]))if(op?.id!=null)out.add(sid(m)+':'+sid(op.id))}catch(e){}
 try{const w=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||'null');for(const op of Object.values(w?.entries||{}))if(op?.module&&op?.id!=null)out.add(sid(op.module)+':'+sid(op.id))}catch(e){}
 return out;
}
function hasPending(x,set){return (Array.isArray(x?.recordRefs)?x.recordRefs:[]).some(r=>r?.module&&r?.id!=null&&set.has(sid(r.module)+':'+sid(r.id)))}
function esc(v){return sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function style(){if(document.getElementById('hlgbDiagnosticsMaintenance9406Style'))return;const st=document.createElement('style');st.id='hlgbDiagnosticsMaintenance9406Style';st.textContent='.hlgb-dg-state9406{display:inline-flex;align-items:center;gap:5px;margin-top:5px;padding:3px 7px;border-radius:999px;font-size:10px;font-weight:800;background:#f1edf0;color:#725363}.hlgb-dg-state9406.current{background:#fff0cb;color:#7c5400}.hlgb-dg-state9406.new{background:#e8f6ee;color:#27643d}.hlgb-dg-state9406.pending{box-shadow:inset 0 0 0 1px #b27300}.hlgb-dg-history-card9406 small{display:block}.hlgb-dg-info9406{margin:8px 0 12px;padding:9px 11px;border-radius:10px;background:#fff8ed;border:1px solid #f0dfbe;font-size:12px;color:#665438}';(document.head||document.documentElement).appendChild(st)}
function formatLast(x){try{return new Date(x).toLocaleString('pt-BR')}catch(e){return sid(x)}}
function decorateRows(openIssues,pending){
 const groups=new Map();
 for(const x of openIssues){const k=logicalKey(x),a=groups.get(k)||[];a.push(x);groups.set(k,a)}
 for(const a of groups.values())a.sort((x,y)=>seenMs(y)-seenMs(x));
 const byId=new Map(openIssues.map(x=>[sid(x.id),x]));
 document.querySelectorAll('#hlgbDgErrorTable input[data-dg-select="issue"]').forEach(check=>{
  const x=byId.get(sid(check.value)),tr=check.closest('tr');if(!x||!tr)return;
  const group=groups.get(logicalKey(x))||[x],leader=group[0];
  if(sid(leader.id)!==sid(x.id)){tr.style.display='none';tr.dataset.hlgbGrouped9406='1';return}
  tr.style.display='';delete tr.dataset.hlgbGrouped9406;
  const cells=tr.querySelectorAll('td'),titleCell=cells[1],occCell=cells[4];
  if(occCell){const total=group.reduce((n,r)=>n+(Number(r?.occurrences)||1),0);occCell.textContent=String(total);if(group.length>1)occCell.title=group.length+' registros equivalentes agrupados visualmente'}
  if(!titleCell||titleCell.querySelector('.hlgb-dg-state9406'))return;
  const isCurrent=group.some(currentSession),total=group.reduce((n,r)=>n+(Number(r?.occurrences)||1),0),isPending=group.some(r=>hasPending(r,pending));
  let label='',cls='';
  if(isCurrent&&total<=1){label='Novo nesta abertura';cls='new'}
  else if(isCurrent){label='Continua ocorrendo · '+total+' ocorrências';cls='current'}
  else{label='Histórico · última '+formatLast(leader.lastSeenAt||leader.firstSeenAt||'');cls=''}
  if(isPending){label+=' · pendência local';cls+=' pending'}
  const badge=document.createElement('div');badge.className='hlgb-dg-state9406 '+cls.trim();badge.textContent=label;titleCell.appendChild(badge)
 })
}
function decorateCards(openIssues){
 const cards=document.getElementById('hlgbDgCards');if(!cards)return;
 const current=openIssues.filter(currentSession),high=current.filter(x=>['critica','alta'].includes(norm(x.priority))),history=openIssues.filter(x=>!currentSession(x));
 const all=cards.querySelectorAll('.card');
 if(all[0]){const s=all[0].querySelector('small'),b=all[0].querySelector('strong');if(s)s.textContent='Erros nesta abertura';if(b)b.textContent=String(current.length)}
 if(all[1]){const s=all[1].querySelector('small'),b=all[1].querySelector('strong');if(s)s.textContent='Alta prioridade nesta abertura';if(b)b.textContent=String(high.length)}
 let hc=cards.querySelector('.hlgb-dg-history-card9406');if(!hc){hc=document.createElement('div');hc.className='card hlgb-dg-history-card9406';cards.appendChild(hc)}hc.innerHTML='<small>Histórico ainda aberto</small><strong>'+history.length+'</strong>';
}
function decorateInfo(){const body=document.getElementById('hlgbDgBody');if(!body||document.getElementById('hlgbDgInfo9406'))return;const info=document.createElement('div');info.id='hlgbDgInfo9406';info.className='hlgb-dg-info9406';info.innerHTML='<b>Como esta Central conta agora:</b> os números principais mostram somente erros ocorridos nesta abertura do sistema. Erros antigos continuam guardados como histórico. Repetições equivalentes do mesmo problema/registro aparecem agrupadas, sem apagar nenhum registro.';body.insertBefore(info,body.firstChild)}
function renameResolve(){document.querySelectorAll('#hlgbDgErrorTable button').forEach(b=>{if(norm(b.textContent)==='resolver')b.textContent='Arquivar como resolvido'})}
function decorate(){
 const center=document.getElementById('hlgbDiagnosticsCenter');if(!center||!center.classList.contains('active'))return false;
 style();const openIssues=issues().filter(unresolved),pending=pendingRefs();decorateCards(openIssues);decorateRows(openIssues,pending);decorateInfo();renameResolve();return true
}
function installRefreshHook(){const f=window.hlgbDiagnosticsRefresh;if(typeof f!=='function'||f.__hlgbMaintenance9406)return false;const w=async function(){const out=await f.apply(this,arguments);setTimeout(decorate,0);setTimeout(decorate,150);return out};w.__hlgbMaintenance9406=true;w.__original=f;window.hlgbDiagnosticsRefresh=w;return true}
function install(){style();installRefreshHook();setTimeout(decorate,0);return true}
document.addEventListener('click',e=>{if(e.target?.closest?.('#hlgbDiagnosticsNav')||e.target?.closest?.('#hlgbDiagnosticsCenter button')){setTimeout(()=>{installRefreshHook();decorate()},80);setTimeout(decorate,500)}},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
[250,800,1800,3500].forEach(ms=>setTimeout(()=>{installRefreshHook();decorate()},ms));
const timer=setInterval(()=>{const c=document.getElementById('hlgbDiagnosticsCenter');if(c?.classList.contains('active'))decorate()},2500);
window.hlgbDiagnosticsMaintenance9406={version:V,sessionStartedAt:SESSION_STARTED_AT,decorate,installRefreshHook,logicalKey,currentSession,pendingRefs,status:()=>{const a=issues().filter(unresolved);return{version:V,current:a.filter(currentSession).length,history:a.filter(x=>!currentSession(x)).length,open:a.length}}};
console.info('[HLGB] Central de Erros v'+V+' — atual x histórico + agrupamento visual ativo');
})();