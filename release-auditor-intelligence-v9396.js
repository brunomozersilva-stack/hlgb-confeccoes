/* HLGB Auditor v93.96 — inteligência incremental, somente leitura.
   Compara rodadas, detecta sessão desatualizada e classifica filas técnicas/históricas. */
(function(){
'use strict';
if(window.HLGB_AUDITOR_INTELLIGENCE_9396)return;
const V='93.96',BUILD='HLGB-AUDITOR-INTELLIGENCE-93.96';
const BASELINE_KEY='hlgb_auditor_intelligence_baseline_v9396';
const PENDING_KEY='hlgb_records_pending_v91',WAL_KEY='hlgb_durable_wal_v1';
const BUILD_SCRIPT='./release-auditor-build-marker-v9396.js';
const POINTERS=['__original','__hlgb9307Original','__hlgb9320Original','__hlgb955Original','__hlgbReliableOriginal','__hlgb9312Original','__hlgb9313Original','__hlgb9306Original','__hlgb9339Original'];
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function readJson(k,f=null){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(e){return f}}
function writeJson(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function iso(){return new Date().toISOString()}
function ageMs(v){
 const c=[v?.__hlgb_pending_at,v?.at,v?.createdAt,v?.updatedAt,v?.updated_at,v?.data?.updatedAt,v?.data?.updated_at,v?.data?.lastSeenAt,v?.data?.firstSeenAt];
 for(const x of c){if(x==null||x==='')continue;const n=typeof x==='number'?x:Date.parse(String(x));if(Number.isFinite(n)&&n>0)return Math.max(0,Date.now()-n)}
 return null;
}
function queueSnapshot(){
 const p=readJson(PENDING_KEY,{}),w=readJson(WAL_KEY,{}),rows=[],keys=new Set();
 const add=(source,module,id,data,meta)=>{
  const key=sid(module)+'|'+sid(id);if(!module||!id)return;
  const age=ageMs(meta||data),technical=/^(systemIssues|systemAuditRuns)$/i.test(sid(module));
  const historical=age!==null&&age>24*60*60*1000;
  const recent=age!==null&&age<=15*60*1000;
  rows.push({source,module:sid(module),id:sid(id),ageMs:age,technical,historical,recent,status:sid(data?.status||meta?.status||'')});keys.add(key);
 };
 for(const [module,ops] of Object.entries(p?.modules||{}))for(const op of (Array.isArray(ops)?ops:[]))add('normalized',module,op?.id??op?.entity_id,op?.data,op);
 for(const [key,e] of Object.entries(w?.entries||{})){const id=e?.id??e?.entity_id??sid(key).split('|').slice(1).join('|');add('wal',e?.module||sid(key).split('|')[0],id,e?.data,e)}
 const byModule={};for(const r of rows){const x=byModule[r.module]||(byModule[r.module]={copies:0,unique:new Set(),technical:0,historical:0,recent:0,unknownAge:0});x.copies++;x.unique.add(r.id);if(r.technical)x.technical++;if(r.historical)x.historical++;if(r.recent)x.recent++;if(r.ageMs===null)x.unknownAge++}
 const modules={};for(const [m,x] of Object.entries(byModule))modules[m]={copies:x.copies,unique:x.unique.size,technical:x.technical,historical:x.historical,recent:x.recent,unknownAge:x.unknownAge};
 const technicalHistorical=new Set(rows.filter(r=>r.technical&&r.historical).map(r=>r.module+'|'+r.id));
 const businessActive=new Set(rows.filter(r=>!r.technical&&!r.historical).map(r=>r.module+'|'+r.id));
 const technicalRecent=new Set(rows.filter(r=>r.technical&&!r.historical).map(r=>r.module+'|'+r.id));
 return {copies:rows.length,unique:keys.size,businessActive:businessActive.size,technicalRecent:technicalRecent.size,technicalHistorical:technicalHistorical.size,modules,rows:rows.slice(0,180)};
}
function chainDepth(fn){
 if(typeof fn!=='function')return 0;let cur=fn,n=0;const seen=new Set();
 while(typeof cur==='function'&&!seen.has(cur)&&n<80){seen.add(cur);n++;let next=null;for(const p of POINTERS){try{if(typeof cur[p]==='function'){next=cur[p];break}}catch(e){}}cur=next}
 return n;
}
function duplicateScripts(){
 const dom=new Map(),res=new Map(),name=u=>{try{return decodeURIComponent(new URL(u,location.href).pathname.split('/').pop()||'')}catch(e){return sid(u).split(/[/?#]/).pop()||''}};
 try{document.querySelectorAll('script[src]').forEach(s=>{const f=name(s.src);if(f)dom.set(f,(dom.get(f)||0)+1)})}catch(e){}
 try{performance.getEntriesByType('resource').forEach(x=>{const f=name(x.name);if(/\.js$/i.test(f))res.set(f,(res.get(f)||0)+1)})}catch(e){}
 const all=new Set([...dom.keys(),...res.keys()]),rows=[];for(const f of all){const d=dom.get(f)||0,r=res.get(f)||0;if(d>1||r>1)rows.push({file:f,dom:d,resource:r})}
 return rows.sort((a,b)=>(b.dom+b.resource)-(a.dom+a.resource)||a.file.localeCompare(b.file));
}
function bootSnapshot(){
 try{const x=window.hlgbAuditorBootAnalysis9381?.analyze?.();if(!x||x.status==='unavailable')return null;return {status:x.status,preAuthLoads:+x.summary?.preAuthLoads||0,hiddenRenders:+x.summary?.hiddenRenders||0,loads:+x.summary?.loads||0,renders:+x.summary?.renders||0,reasons:clone(x.reasons||[]),topPreAuth:(x.rawCalls||[]).filter(r=>r.authReady===false&&(r.kind==='load'||r.kind==='boot')).slice(0,12),topHidden:(x.rawCalls||[]).filter(r=>r.appVisible===false&&r.kind==='render').slice(0,12)}}catch(e){return {error:sid(e?.message||e)}}
}
function authoritySnapshot(){
 try{
  const r=window.hlgbAuditorAuthority9374?.scan?.();if(!r)return null;
  const depths={};for(const f of r.families||[])for(const x of f.functions||[])depths[x.name]=+x.chain?.depth||0;
  const resp={};for(const x of r.consolidationPlan||[])resp[x.id]={authority:x.authority,conflict:!!x.conflict,authorityConfirmed:!!x.authorityConfirmed,present:clone(x.present||[])};
  return {summary:clone(r.summary||{}),duplicates:(r.scriptInventory?.duplicates||[]).length,duplicateFiles:clone(r.scriptInventory?.duplicates||[]),depths,responsibilities:resp};
 }catch(e){return {error:sid(e?.message||e)}}
}
async function fetchFresh(path){const sep=path.includes('?')?'&':'?';const r=await fetch(path+sep+'hlgb_audit_fresh='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return r.text()}
async function sessionFreshness(){
 const runtime=sid(window.HLGB_RUNTIME_BUILD_ID||'');
 try{
  const src=await fetchFresh(BUILD_SCRIPT),m=src.match(/HLGB_RUNTIME_BUILD_ID\s*=\s*['"]([^'"]+)['"]/),published=sid(m?.[1]||'');
  if(!published)return {status:'unknown',runtime,published:'',detail:'Marcador publicado não pôde ser identificado.'};
  if(!runtime)return {status:'stale',runtime:'',published,detail:'Esta sessão não carregou o marcador de build atual. Reabra o sistema antes de validar correções.'};
  return {status:runtime===published?'fresh':'stale',runtime,published,detail:runtime===published?'Sessão e arquivos publicados usam o mesmo build.':'A sessão está em '+runtime+', mas o site já publicou '+published+'. Reabra antes de interpretar falhas.'};
 }catch(e){return {status:'unknown',runtime,published:'',detail:'Não foi possível conferir o build publicado: '+sid(e?.message||e)}}
}
function currentMetrics(){
 const boot=bootSnapshot(),authority=authoritySnapshot(),queues=queueSnapshot(),dups=duplicateScripts();
 return {at:iso(),appVersion:sid(window.HLGB_RELEASE_VERSION||''),boot,authority,queues,duplicateScripts:dups,metrics:{preAuthLoads:+boot?.preAuthLoads||0,hiddenRenders:+boot?.hiddenRenders||0,loads:+boot?.loads||0,renders:+boot?.renders||0,scriptDuplicates:dups.length,saveDepth:chainDepth(window.hlgbRecordSaveWithRetry),projectionDepth:chainDepth(window.renderProjection),cutSyncDepth:chainDepth(window.syncFinalizedCutsToProduction),hubSaveDepth:chainDepth(window.hlgbHubSaveConfirmed),writeoffDepth:chainDepth(window.hlgbWriteoffSelected9385),pendingUnique:queues.unique,pendingBusiness:queues.businessActive,pendingTechnicalRecent:queues.technicalRecent,pendingTechnicalHistorical:queues.technicalHistorical}};
}
const LOWER_BETTER=new Set(['preAuthLoads','hiddenRenders','loads','renders','scriptDuplicates','saveDepth','projectionDepth','cutSyncDepth','hubSaveDepth','writeoffDepth','pendingUnique','pendingBusiness','pendingTechnicalRecent','pendingTechnicalHistorical']);
function compareMetrics(cur,prev){
 if(!prev?.metrics)return {available:false,items:[],summary:{improved:0,regressed:0,same:0}};
 const items=[];let improved=0,regressed=0,same=0;
 for(const [key,value] of Object.entries(cur.metrics||{})){
  const before=Number(prev.metrics?.[key]);const after=Number(value);if(!Number.isFinite(before)||!Number.isFinite(after))continue;
  const delta=after-before;let state='same';if(delta!==0){const lower=LOWER_BETTER.has(key);state=(lower?(after<before):(after>before))?'improved':'regressed'}
  if(state==='improved')improved++;else if(state==='regressed')regressed++;else same++;
  items.push({key,before,after,delta,state});
 }
 return {available:true,items,summary:{improved,regressed,same}};
}
async function collect(options={}){
 const current=currentMetrics(),previous=readJson(BASELINE_KEY,null),comparison=compareMetrics(current,previous),freshness=await sessionFreshness();
 const report={kind:'hlgb_auditor_intelligence',version:V,build:BUILD,at:iso(),readOnly:true,freshness,current,previous:previous?{at:previous.at,appVersion:previous.appVersion,metrics:previous.metrics}:null,comparison,recommendations:[]};
 if(freshness.status==='stale')report.recommendations.push({priority:'high',code:'stale-session',detail:'Reabra o sistema e rode novamente antes de concluir que uma correção falhou.'});
 if(current.queues.technicalHistorical>0)report.recommendations.push({priority:'medium',code:'historical-technical-queue',detail:current.queues.technicalHistorical+' registro(s) técnico(s) com mais de 24h aparecem nas filas; separar limpeza histórica de falha operacional atual.'});
 if(current.queues.businessActive>0)report.recommendations.push({priority:'high',code:'business-pending',detail:current.queues.businessActive+' operação(ões) de negócio continuam pendentes.'});
 if(current.duplicateScripts.length)report.recommendations.push({priority:'medium',code:'duplicate-script-load',detail:current.duplicateScripts.length+' script(s) carregado(s) mais de uma vez; diferenciar duplicidade de rede de duplicidade de execução.'});
 if(comparison.summary.regressed>0)report.recommendations.push({priority:'high',code:'regression',detail:comparison.summary.regressed+' métrica(s) pioraram em relação à rodada anterior.'});
 window.hlgbAuditorIntelligence9396.last=report;
 if(options.saveBaseline!==false&&freshness.status!=='stale')writeJson(BASELINE_KEY,{at:current.at,appVersion:current.appVersion,metrics:current.metrics});
 return report;
}
function label(k){return ({preAuthLoads:'Cargas pré-login',hiddenRenders:'Renders ocultos',loads:'Cargas',renders:'Renders',scriptDuplicates:'Scripts duplicados',saveDepth:'Profundidade do save',projectionDepth:'Profundidade da Projeção',cutSyncDepth:'Profundidade corte→produção',hubSaveDepth:'Profundidade Hub save',writeoffDepth:'Profundidade baixa',pendingUnique:'Pendências únicas',pendingBusiness:'Pendências de negócio',pendingTechnicalRecent:'Pendências técnicas recentes',pendingTechnicalHistorical:'Pendências técnicas históricas'})[k]||k}
function renderReport(r){
 const host=document.getElementById('hlgbAuditorResult');if(!host)return r;document.getElementById('hlgbAuditorIntelligencePanel9396')?.remove();
 const el=document.createElement('div');el.id='hlgbAuditorIntelligencePanel9396';el.className='panel';el.style.cssText='border:1px solid #b7c7d9;background:#f8fbff;margin:10px 0';
 const fresh=r.freshness.status==='fresh'?'✅':r.freshness.status==='stale'?'🔴':'🟡';
 const cmp=r.comparison.available?r.comparison.items.filter(x=>x.state!=='same').map(x=>'<div class="sub">'+(x.state==='improved'?'✅':'🔴')+' '+esc(label(x.key))+': '+x.before+' → '+x.after+'</div>').join(''):'<div class="sub">Primeira rodada desta inteligência; a próxima terá comparação automática.</div>';
 const q=r.current.queues;
 const dup=r.current.duplicateScripts.slice(0,8).map(x=>x.file+' (DOM '+x.dom+', rede '+x.resource+')').join(' | ');
 el.innerHTML='<h3 style="margin-top:0">🧠 Inteligência do Auditor</h3><div class="sub">Somente leitura · v'+V+'</div><div style="margin:8px 0"><b>'+fresh+' Build da sessão:</b> '+esc(r.freshness.detail)+'</div><div><b>Filas:</b> '+q.unique+' únicas · negócio '+q.businessActive+' · técnicas recentes '+q.technicalRecent+' · técnicas históricas '+q.technicalHistorical+'</div><div style="margin-top:8px"><b>Comparação com a rodada anterior</b>'+cmp+'</div>'+(dup?'<div class="sub" style="margin-top:8px"><b>Scripts repetidos:</b> '+esc(dup)+'</div>':'')+'<div style="margin-top:10px"><button id="hlgbAuditorIntelligenceDownload9396" class="secondary" type="button">⬇️ Baixar inteligência</button></div>';
 el.querySelector('#hlgbAuditorIntelligenceDownload9396')?.addEventListener('click',()=>download(r));host.prepend(el);return r;
}
function download(r){try{const data=r||window.hlgbAuditorIntelligence9396.last;if(!data)return false;const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='hlgb-auditor-inteligencia-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);return true}catch(e){return false}}
async function run(){const r=await collect();renderReport(r);return r}
function installUi(){const actions=document.querySelector('.hlgb-auditor-actions');if(!actions)return false;let b=document.getElementById('hlgbAuditorIntelligenceBtn9396');if(!b){b=document.createElement('button');b.id='hlgbAuditorIntelligenceBtn9396';b.className='secondary';b.type='button';b.textContent='🧠 Inteligência';b.onclick=()=>run().catch(e=>console.warn('[HLGB Auditor '+V+'] inteligência',e));actions.appendChild(b)}b.hidden=false;b.style.display='';return true}
function chainHas(fn,marker){let cur=fn,n=0;const seen=new Set();while(typeof cur==='function'&&!seen.has(cur)&&n++<48){if(cur[marker])return true;seen.add(cur);let next=null;for(const p of POINTERS){try{if(typeof cur[p]==='function'){next=cur[p];break}}catch(e){}}cur=next}return false}
function wrapProblem(){const f=window.hlgbAuditorSmartProblem;if(typeof f!=='function'||chainHas(f,'__hlgb9396'))return false;const w=async function(){const data=await f.apply(this,arguments);try{if(data&&typeof data==='object')data.intelligence=await collect({saveBaseline:false})}catch(e){if(data&&typeof data==='object')data.intelligence={error:sid(e?.message||e)}}return data};w.__hlgb9396=true;w.__original=f;window.hlgbAuditorSmartProblem=w;try{if(window.hlgbAuditorSmart)window.hlgbAuditorSmart.problem=w}catch(e){}return true}
function install(){installUi();wrapProblem();try{if(window.hlgbAuditorAuthority9374)window.hlgbAuditorAuthority9374.intelligence=collect}catch(e){}try{if(window.hlgbAuditorDeep9373)window.hlgbAuditorDeep9373.intelligence=collect}catch(e){}return true}
window.HLGB_AUDITOR_INTELLIGENCE_9396=BUILD;
window.hlgbAuditorIntelligence9396={version:V,build:BUILD,collect,run,render:renderReport,download,queueSnapshot,currentMetrics,compareMetrics,sessionFreshness,duplicateScripts,install,last:null};
[0,300,900,1800,3500,6500,10000].forEach(ms=>setTimeout(install,ms));
document.addEventListener?.('click',e=>{if(e.target?.closest?.('#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn'))[100,400,900].forEach(ms=>setTimeout(install,ms))},true);
console.info('[HLGB] Auditor inteligência v'+V+' ativa');
})();
