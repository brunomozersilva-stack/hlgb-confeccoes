/* HLGB v95.73 — Memória técnica compartilhada Auditor+Bot.
   Usa o módulo já autorizado systemAuditRuns com IDs prefixados learnv9573-.
   Nenhuma alteração em vendas, financeiro, produção ou WAL; erros de rede
   conservam eventos técnicos na caixa de saída local para reenvio futuro.
   Não executa reparos. Registros de fix mantêm prova separada de código integrado. */
(function(){
'use strict';
const V='95.73',PREFIX='learnv9573-',MODULE='systemAuditRuns',OUTBOX='hlgb_shared_learning_outbox_v9573',DISABLED='hlgb_shared_learning_off_v9573',MAX=150;
if(window.hlgbLearningCloud9573?.version===V)return;
const sid=x=>String(x??''),now=()=>new Date().toISOString(),auth=()=>window.__HLGB_AUTH_READY===true;
const esc=x=>sid(x).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
const json=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')||f}catch(_){return f}};
const disabled=()=>{try{return localStorage.getItem(DISABLED)==='1'}catch(_){return false}};
const safe=x=>sid(x).toLowerCase().replace(/[^a-z0-9:_-]/g,'-').slice(0,90);
const hash=(s,seed)=>{let h=seed>>>0;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),16777619)>>>0}return h.toString(16).padStart(8,'0')};
const idFrom=s=>PREFIX+hash(s,2166136261)+'-'+hash(s,0x9e3779b9);
const state={version:V,remote:[],githubFixes:[],githubLoaded:false,githubLoading:false,githubError:'',lastFetch:'',lastPush:'',lastError:'',lastReadback:'',outboxCount:0,reading:false,publishing:false,lastResult:''};
const knownFixes=[
 {ref:'PR #223',category:'hub-status',status:'code_merged',text:'Proteção contra acionamentos repetidos no status do Hub',commit:'87d6ee28'},
 {ref:'PR #224',category:'auditor-dates',status:'verified_fix',text:'Datas futuras deixam de contar como erros atuais no Auditor',commit:'87bbef52'},
 {ref:'PR #225',category:'production-wal',status:'code_merged',text:'WAL de Produção ignora diferenças apenas técnicas',commit:'7938c780'}
];
function prCategory(title){
 const x=sid(title).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/auditor|monitor|aprend|bot|inteligenc/.test(x))return 'auditor';
 if(/hub|finance|pagamento|acerto|nota|receb|fatura/.test(x))return 'finance';
 if(/wal|sincron|safari|chrome|cloud|realtime/.test(x))return 'sync';
 if(/produc|corte|facc|travet|grade|material/.test(x))return 'production';
 if(/pedido|cliente/.test(x))return 'orders';
 return 'general';
}
// O próprio GitHub guarda todos os PRs integrados, independentemente da máquina.
// Ler o histórico público não cria eventos empresariais nem expõe títulos com dados de clientes.
async function loadGithubFixes(){
 if(state.githubLoaded||state.githubLoading||typeof fetch!=='function')return {ok:state.githubLoaded,count:state.githubFixes.length};
 state.githubLoading=true;
 try{
  const out=[];
  for(let page=1;page<=5;page++){
   const url='https://api.github.com/repos/brunomozersilva-stack/hlgb-confeccoes/pulls?state=closed&sort=updated&direction=desc&per_page=100&page='+page;
   const res=await fetch(url,{headers:{Accept:'application/vnd.github+json'}});
   if(!res.ok)throw Error('GitHub HTTP '+res.status);
   const list=await res.json();if(!Array.isArray(list))throw Error('Histórico de PR não confirmado');
   for(const pr of list){
    if(!pr?.merged_at||!Number.isInteger(pr.number))continue;
    const ref='PR #'+pr.number,category=prCategory(pr.title||'');
    out.push({reference:ref,status:'code_merged',category,description:'Alteração de '+category+' integrada no código',
     mergedAt:sid(pr.merged_at),commit:sid(pr.merge_commit_sha).slice(0,12)});
   }
   if(list.length<100)break;
  }
  const seen=new Set();state.githubFixes=out.filter(x=>{if(seen.has(x.reference))return false;seen.add(x.reference);return true}).slice(0,500);
  state.githubLoaded=true;state.githubError='';return {ok:true,count:state.githubFixes.length};
 }catch(e){state.githubError=sid(e?.message||e).slice(0,150);return {ok:false,error:state.githubError}}
 finally{state.githubLoading=false}
}
function event(source,category,kind,seed,evidence={},reference=''){
 const key=[source,category,kind,seed].map(sid).join('|');
 return {id:idFrom(key),kind:'technical_learning_event',version:V,source:safe(source),category:safe(category),
  eventKind:safe(kind),fingerprint:safe(category),reference:sid(reference).slice(0,80),evidence,occurredAt:now()};
}
function queueRead(){const a=json(OUTBOX,[]);return Array.isArray(a)?a.filter(x=>x&&sid(x.id).startsWith(PREFIX)).slice(-MAX):[]}
function queueWrite(a){try{localStorage.setItem(OUTBOX,JSON.stringify(a.slice(-MAX)));state.outboxCount=a.length;return true}catch(e){state.lastError='Não foi possível armazenar evidência técnica: '+sid(e?.message||e);return false}}
function enqueue(e){if(!e||!sid(e.id).startsWith(PREFIX))return false;const q=queueRead();if(q.some(x=>x.id===e.id)||state.remote.some(x=>x.id===e.id))return false;return queueWrite([...q,e])}
function collect(){
 if(!auth()||disabled())return 0;
 let added=0;
 const audit=window.hlgbAuditorLearningAssistant9556,pack=audit?.pack?.(),report=window.hlgbAuditorAutoCorrect9448?.exportReport?.();
 if(pack?.sourceRunId&&pack?.disabled!==true){
  for(const d of (pack.diagnoses||[]).slice(0,35)){
   const cat=safe(d.kind||'general');
   if(enqueue(event('auditor',cat,'observed',pack.sourceRunId+'|'+cat,{run:safe(pack.sourceRunId).slice(0,60),affected:Math.min(100,Number(d.affectedInReport)||0)})))added++;
  }
 }
 const run=report?.run||{};
 const unresolved=new Set([...(run.unverified||[]),...(run.stillFailing||[])].filter(x=>sid(x?.id)).map(x=>sid(x.id)));
 for(const correction of (run.corrected||[]).slice(0,25)){
  const c=correction||{},proof=sid(c.verification||c.proof);
  if(!/remote-proof-and-queue-readback|server-semantic-match/i.test(proof)||unresolved.has(sid(c.id)))continue;
  const cat=safe(c.module||'general'),source=sid(run.runId||pack?.sourceRunId);
  if(enqueue(event('auditor',cat,'verified_fix',source+'|'+safe(c.action),{method:safe(c.action),proof:safe(proof)})))added++;
 }
 const hub=window.hlgbHubLearning9568;
 for(const sample of (hub?.history?.()?.timeline||[]).slice(-40)){
  const cat=safe(sample.category||'unknown'),key=[cat,sid(sample.at),safe(sample.source),safe(sample.traceOutcome)].join('|');
  if(!sample.at||cat==='not-tested')continue;
  if(enqueue(event('bot',cat,'observed',key,{
   outcome:safe(sample.traceOutcome),click:sample.clickObserved===true,ack:sample.hasAck===true,readback:sample.hasReadback===true})))added++;
 }
 for(const f of knownFixes){
  if(enqueue(event('fix',f.category,f.status,f.ref,{text:f.text,commit:f.commit},f.ref)))added++;
 }
 return added;
}
function request(path,opts={method:'GET'}){
 if(!auth()||typeof window.cloudRequest!=='function')throw Error('Conexão autenticada à nuvem indisponível.');
 return window.cloudRequest(path,opts);
}
const query='hlgb_records?select=entity_id,data,revision,deleted_at&module=eq.'+MODULE+'&entity_id=like.'+PREFIX+'*&order=updated_at.desc&limit=500';
function normalizeRow(r){const d=r?.data;if(r?.deleted_at||d?.kind!=='technical_learning_event'||!sid(r?.entity_id).startsWith(PREFIX))return null;
 return {...d,id:sid(r.entity_id),revision:+r.revision||0};}
async function refresh(){
 if(!auth()||disabled()||state.reading)return {ok:false,reason:'disabled-or-unavailable'};
 state.reading=true;
 try{const rows=await request(query);if(!Array.isArray(rows))throw Error('Lista de aprendizagem não confirmada.');
  state.remote=rows.map(normalizeRow).filter(Boolean);state.lastFetch=now();state.lastError='';
  return {ok:true,count:state.remote.length};
 }catch(e){state.lastError='Leitura da memória compartilhada: '+sid(e?.message||e);return {ok:false,error:state.lastError}}
 finally{state.reading=false}
}
async function exact(id){
 const rows=await request('hlgb_records?select=module,entity_id,data,revision,deleted_at&module=eq.'+MODULE+'&entity_id=eq.'+encodeURIComponent(sid(id))+'&limit=1');
 return Array.isArray(rows)?normalizeRow(rows[0]):null;
}
async function publishOne(e){
 const existed=await exact(e.id);if(existed)return true;
 let out=await request('rpc/hlgb_save_record',{method:'POST',headers:{Prefer:'return=representation'},
  body:JSON.stringify({p_module:MODULE,p_entity_id:e.id,p_data:e,p_expected_revision:0,p_deleted:false})});
 if(Array.isArray(out))out=out[0];
 // Confirma a existência mesmo em conflito de criação simultânea; não apaga operações.
 const check=await exact(e.id);
 if(!check||check.kind!=='technical_learning_event'||check.source!==e.source||check.eventKind!==e.eventKind)
  throw Error('Memória técnica sem confirmação remota.');
 if(out?.applied!==true&&check?.id!==e.id)throw Error(out?.reason||'Gravação técnica não confirmada.');
 state.lastReadback=now();return true;
}
async function publish(){
 if(!auth()||disabled()||state.publishing||navigator.onLine===false)return {ok:false,reason:'offline-or-inactive'};
 state.publishing=true;
 let sent=0;
 try{
  const list=queueRead();
  for(const e of list.slice(0,10)){
   try{if(await publishOne(e)){const current=queueRead();queueWrite(current.filter(x=>x.id!==e.id));sent++;}}
   catch(err){state.lastError='Publicação técnica: '+sid(err?.message||err);break;}
  }
  if(sent){state.lastPush=now();await refresh();}
  return {ok:!state.lastError,sent,pending:queueRead().length,error:state.lastError};
 }finally{state.publishing=false}
}
function snapshot(){
 const map=new Map();
 for(const e of state.remote){
  const k=safe(e.category),c=map.get(k)||{category:k,events:0,observed:0,fixes:[],lastAt:''};
  c.events++;if(e.eventKind==='observed')c.observed++;
  if(['verified_fix','code_merged'].includes(e.eventKind)&&!c.fixes.some(x=>x.reference===e.reference))
   c.fixes.push({reference:e.reference,status:e.eventKind,description:sid(e.evidence?.text||e.evidence?.method).slice(0,160)});
  c.lastAt=[c.lastAt,sid(e.occurredAt)].sort().slice(-1)[0];map.set(k,c);
 }
 for(const f of state.githubFixes){
  const k=safe(f.category),c=map.get(k)||{category:k,events:0,observed:0,fixes:[],lastAt:''};
  if(!c.fixes.some(x=>x.reference===f.reference))c.fixes.push({reference:f.reference,status:'code_merged',description:f.description});
  c.lastAt=[c.lastAt,sid(f.mergedAt)].sort().slice(-1)[0];map.set(k,c);
 }
 return {cases:[...map.values()],events:state.remote.length,githubFixes:state.githubFixes.length,githubLoaded:state.githubLoaded,
  githubError:state.githubError,localPending:queueRead().length,verifiedServer:!!state.lastFetch,readAt:state.lastFetch,error:state.lastError};
}
function render(){
 if(!auth())return false;
 const host=document.getElementById('hlgbAuditorResult');if(!host)return false;
 let div=document.getElementById('hlgbCloudLearning9573');
 if(!div){div=document.createElement('section');div.className='panel';div.id='hlgbCloudLearning9573';host.appendChild(div)}
 const d=snapshot(),fixes=d.cases.flatMap(x=>x.fixes.map(f=>({...f,category:x.category}))).slice(0,9);
 div.innerHTML='<h3>☁️ Memória compartilhada do Auditor e do bot</h3>'+
  '<div class="sub">Servidor HLGB · '+(d.verifiedServer?'Leitura autenticada confirmada':'Ainda sem confirmação de leitura')+' · '+d.events+' evento(s) · '+d.cases.length+' assunto(s)'+
  (d.githubLoaded?' · '+d.githubFixes+' PRs integrados consultados no GitHub':' · histórico GitHub ainda não consultado')+
  (d.localPending?' · '+d.localPending+' evento(s) técnico(s) aguardando envio':'')+'</div>'+
  (fixes.length?'<ul>'+fixes.map(x=>'<li>'+esc(x.reference)+' · '+esc(x.description)+' · '+(x.status==='verified_fix'?'correção comprovada':'código integrado; reteste real ainda necessário')+'</li>').join('')+'</ul>':'<div class="sub">Nenhuma correção compartilhada carregada ainda.</div>')+
  (d.error?'<div class="sub" style="color:#934">⚠ '+esc(d.error)+'</div>':'')+
  '<p class="sub">Eventos técnicos não contêm valores nem dados de clientes. Aprender não significa corrigir automaticamente.</p>';
 return true;
}
async function tick(){
 if(!auth()||disabled()||state.publishing||state.reading)return;
 if(!state.githubLoaded&&!state.githubLoading)loadGithubFixes().then(render).catch(()=>{});
 try{collect()}catch(e){state.lastError='Coleta técnica local: '+sid(e?.message||e)}
 try{await publish()}catch(e){state.lastError='Envio técnico: '+sid(e?.message||e)}
 // Pull new corrections from OTHER computers even if this browser has no
 // pending writes. A one-time fetch would not provide server-side learning.
 const age=Date.now()-Date.parse(state.lastFetch||'');
 if(!state.lastFetch||!Number.isFinite(age)||age>=60000){
  try{await refresh()}catch(e){state.lastError='Leitura técnica: '+sid(e?.message||e)}
 }
 render();
}
const api={version:V,collect,enqueue,refresh,publish,publishOne,loadGithubFixes,snapshot,render,tick,status:()=>({...state,remoteCount:state.remote.length,outboxCount:queueRead().length,disabled:disabled()}),
 disable:()=>{localStorage.setItem(DISABLED,'1');return true},enable:()=>{localStorage.removeItem(DISABLED);setTimeout(tick,100);return true}};
window.hlgbLearningCloud9573=api;
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(tick,1500));
window.addEventListener?.('hlgb:auditor:open',()=>setTimeout(tick,500));
window.addEventListener?.('hlgb:hub-save-ui-proof',()=>setTimeout(tick,600));
if(!window.__HLGB_TEST__){setInterval(()=>{if(!document.hidden)tick()},60000);if(auth())setTimeout(tick,2000)}
console.info('[HLGB] v'+V+' memória compartilhada de ocorrências e correções, sem tocar na WAL');
})();
