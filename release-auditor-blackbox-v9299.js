/* HLGB v92.99 — Auditor caixa-preta: transforma o debug máximo em pacote de suporte completo */
(function(){
'use strict';
if(window.hlgbAuditorBlackbox9299)return;
const V='92.99';
const sid=v=>String(v??'');
const now=()=>new Date().toISOString();
function dbr(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}try{return window.db||null}catch(e){return null}}
function arr(n){const d=dbr();return Array.isArray(d?.[n])?d[n]:[]}
function clone(v){try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}}
function redact(value,key=''){
 const k=sid(key).toLowerCase();
 if(/^(access_token|refresh_token|token|password|senha|secret|service_role|apikey|api_key|authorization|jwt|session)$/.test(k))return '[REMOVIDO]';
 if(typeof value==='string')return value.replace(/Bearer\s+[A-Za-z0-9._~-]+/gi,'Bearer [REMOVIDO]').replace(/eyJ[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{12,}/g,'[TOKEN REMOVIDO]');
 if(Array.isArray(value))return value.slice(0,500).map(v=>redact(v,''));
 if(value&&typeof value==='object'){const o={};for(const [kk,v] of Object.entries(value)){if(sid(kk).toLowerCase()==='email')continue;o[kk]=redact(v,kk)}return o}
 return value;
}
function recordId(module,row,index=0){const direct=row?.id??row?.__hlgbId;if(direct!=null&&sid(direct).trim())return sid(direct);try{if(typeof window.hlgbRecordId==='function')return sid(window.hlgbRecordId(module,row,index))}catch(e){}return ''}
function pendingUiCount(){try{for(const n of document.querySelectorAll('button,span,div')){const t=sid(n.textContent);if(!/altera[cç][aã]o.*aguardando/i.test(t))continue;const m=t.match(/(\d+)\s+altera/i);if(m)return Number(m[1])||0}}catch(e){}return null}
function attemptsOf(x){return Math.max(0,Number(x?.attempts??x?.tries??x?.retryCount??x?.retries??x?.attemptCount??x?.tentativas??0)||0)}
function errorOf(x){const v=x?.lastError??x?.last_error??x?.error??x?.syncError??x?.message??'';if(v&&typeof v==='object')return sid(v.message||JSON.stringify(v)).slice(0,1500);return sid(v).slice(0,1500)}
function queuedAtOf(x){return x?.queuedAt??x?.__hlgb_pending_at??x?.pendingAt??x?.createdAt??x?.updatedAt??x?.at??null}
function operationOf(x){return x?.deleted===true||x?.delete===true||x?.operation==='delete'||x?.op==='delete'||x?.type==='delete'?'exclusão':'salvamento'}
function localState(module,id){
 const list=arr(module);let row=null,index=-1;
 for(let i=0;i<list.length;i++){const rid=recordId(module,list[i],i);if(rid===id||sid(list[i]?.id)===id||sid(list[i]?.__hlgbId)===id){row=list[i];index=i;break}}
 let snap=null;try{snap=window.hlgbRecordSnapshots?.[module]?.get?.(id)||null}catch(e){}
 return {exists:!!row,index,localUpdatedAt:row?.updatedAt||row?.updated_at||null,cloudSnapshotExists:!!snap,cloudSnapshotDeleted:!!snap?.deleted_at,cloudSnapshotUpdatedAt:snap?.updated_at||snap?.updatedAt||null};
}
function analyzePending(sync){
 const map=new Map(),rawCounts={normalized:0,walLocalStorage:0,walIndexedDb:0};
 const add=(source,sourceModule,x)=>{
  const module=sid(x?.module||x?.__module||sourceModule||'desconhecido'),id=sid(x?.id??x?.entity_id??x?.entityId??x?.__hlgbId??''),operation=operationOf(x),key=module+'|'+id+'|'+operation;
  rawCounts[source]=(rawCounts[source]||0)+1;
  let r=map.get(key);if(!r){r={module,id,operation,sources:[],attempts:0,lastError:'',queuedAt:null,ageMinutes:null,conflict:false,retryLoop:false,localState:null,rawBySource:[]};map.set(key,r)}
  if(!r.sources.includes(source))r.sources.push(source);r.attempts=Math.max(r.attempts,attemptsOf(x));const err=errorOf(x);if(err)r.lastError=err;const at=queuedAtOf(x);if(at&&!r.queuedAt)r.queuedAt=at;r.rawBySource.push({source,data:redact(clone(x))});
 };
 for(const [m,ops] of Object.entries(sync?.normalizedPending?.modules||{}))for(const x of (Array.isArray(ops)?ops:[]))add('normalized',m,x);
 for(const x of (sync?.durableWalLocalStorage?.entries||[]))add('walLocalStorage','',x);
 for(const x of (sync?.durableWalIndexedDb?.entries||[]))add('walIndexedDb','',x);
 const items=[...map.values()];
 for(const r of items){r.localState=localState(r.module,r.id);const t=Date.parse(r.queuedAt||'');if(Number.isFinite(t))r.ageMinutes=Math.max(0,Math.round((Date.now()-t)/60000));r.conflict=/(mudou em outra m[aá]quina|conflit|evitar perda|newer|mais recente|stale|vers[aã]o)/i.test(r.lastError);r.retryLoop=r.attempts>=20}
 items.sort((a,b)=>Number(b.conflict)-Number(a.conflict)||b.attempts-a.attempts||(b.ageMinutes||0)-(a.ageMinutes||0));
 const byModule={};for(const r of items){const x=byModule[r.module]||(byModule[r.module]={unique:0,saves:0,deletes:0,conflicts:0,retryLoops:0,maxAttempts:0});x.unique++;r.operation==='exclusão'?x.deletes++:x.saves++;if(r.conflict)x.conflicts++;if(r.retryLoop)x.retryLoops++;x.maxAttempts=Math.max(x.maxAttempts,r.attempts)}
 return {uiCount:pendingUiCount(),rawCounts,uniqueCount:items.length,conflicts:items.filter(x=>x.conflict).length,retryLoops:items.filter(x=>x.retryLoop).length,deletes:items.filter(x=>x.operation==='exclusão').length,saves:items.filter(x=>x.operation==='salvamento').length,byModule,items};
}
function loadedScripts(){const rows=[...document.scripts].map((s,i)=>{let file='[inline]';try{file=s.src?new URL(s.src,location.href).pathname.split('/').pop():'[inline]'}catch(e){}return {index:i,file,async:!!s.async,defer:!!s.defer}}),count={};for(const x of rows)count[x.file]=(count[x.file]||0)+1;return {count:rows.length,duplicates:Object.entries(count).filter(([k,n])=>k!=='[inline]'&&n>1).map(([file,n])=>({file,count:n})),assistant:rows.filter(x=>/assistant/i.test(x.file)),payroll:rows.filter(x=>/payroll/i.test(x.file)),hub:rows.filter(x=>/hub/i.test(x.file))}}
async function storageHealth(){const out={online:navigator.onLine,persisted:null,estimate:null};try{if(navigator.storage?.persisted)out.persisted=await navigator.storage.persisted()}catch(e){out.persistedError=sid(e?.message||e)}try{if(navigator.storage?.estimate){const x=await navigator.storage.estimate();out.estimate={usage:Number(x?.usage||0),quota:Number(x?.quota||0),usagePct:x?.quota?Math.round((x.usage/x.quota)*10000)/100:null}}}catch(e){out.estimateError=sid(e?.message||e)}try{const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;if(c)out.connection={effectiveType:c.effectiveType||'',downlink:c.downlink||null,rtt:c.rtt||null,saveData:!!c.saveData}}catch(e){}try{out.serviceWorker={controlled:!!navigator.serviceWorker?.controller,scriptURL:navigator.serviceWorker?.controller?.scriptURL||'',state:navigator.serviceWorker?.controller?.state||''}}catch(e){}return out}
function systemIssues(){return arr('systemIssues').filter(x=>x?.status!=='Resolvido').slice().sort((a,b)=>sid(b?.lastSeenAt||b?.updatedAt||'').localeCompare(sid(a?.lastSeenAt||a?.updatedAt||''))).slice(0,120).map(x=>redact({id:x.id,title:x.title,page:x.page,status:x.status,priority:x.priority,firstSeenAt:x.firstSeenAt,lastSeenAt:x.lastSeenAt,updatedAt:x.updatedAt,count:x.count||x.occurrences||x.hits||null,message:x.message||x.detail||x.description||''}))}
function latestAudit(){const r=window.hlgbInternalAuditor?.latest?.()||null;if(!r)return null;const checks=Array.isArray(r.checks)?r.checks:[],problematic=checks.filter(x=>x?.ok===false||/falha|erro|aten[cç][aã]o|warn|fail/i.test(sid(x?.status||x?.result||x?.severity))).slice(0,150);return redact({id:r.id,appVersion:r.appVersion,startedAt:r.startedAt,completedAt:r.completedAt,summary:r.summary,problematicChecks:problematic,runtimeErrors:r.runtimeErrors||r.errors||[],visualSweep:r.visualSweep||[]})}
function subsystems(){const out={};try{out.hub=redact(window.hlgbCollectHubDiagnostics?.()||null)}catch(e){out.hub={error:sid(e?.message||e)}}try{out.payroll=redact(window.hlgbPayrollDiagnostics9293?.snapshot?.()||window.hlgbPayrollStability9293?.snapshot?.()||null)}catch(e){out.payroll={error:sid(e?.message||e)}}try{out.assistant=redact(window.hlgbAssistantCanonical9297?.diagnostic?.()||null)}catch(e){out.assistant={error:sid(e?.message||e)}}return out}
function extraFindings(p,sub,scripts){const out=[],add=(severity,code,detail)=>out.push({severity,code,detail});if(p.uiCount!=null&&p.uiCount!==p.uniqueCount)add('warn','pending-count-difference','Tela mostra '+p.uiCount+' e o cruzamento encontrou '+p.uniqueCount+' operação(ões) única(s).');if(p.conflicts)add('error','sync-conflicts',p.conflicts+' pendência(s) indicam conflito com registro mais novo.');if(p.retryLoops)add('error','sync-retry-loop',p.retryLoops+' pendência(s) estão em repetição de tentativas (20+).');for(const x of p.items.filter(x=>x.attempts>=1000).slice(0,20))add('error','sync-extreme-retries',x.module+' · '+x.id+' tem '+x.attempts+' tentativas. Último erro: '+(x.lastError||'-'));for(const x of p.items.filter(x=>x.ageMinutes>=1440).slice(0,20))add('warn','sync-stale',x.module+' · '+x.id+' está pendente há '+Math.round(x.ageMinutes/60)+'h.');for(const d of scripts.duplicates)add('warn','duplicate-script',d.file+' carregado '+d.count+' vezes.');if(sub.assistant&&sub.assistant.routerStable===false)add('error','assistant-router-unstable','Assistente não está no roteador canônico.');if(sub.payroll?.duplicatePayroll?.length)add('error','payroll-duplicates',sub.payroll.duplicatePayroll.length+' funcionário(s) com folha duplicada.');if(sub.payroll?.missingPayroll?.length)add('warn','payroll-missing',sub.payroll.missingPayroll.length+' funcionário(s) ativo(s) sem folha.');return out}
async function collect(){const base=await window.hlgbAuditorMaxDebug9292.collect(),pendingAnalysis=analyzePending(base.sync||{}),sub=subsystems(),scripts=loadedScripts(),storage=await storageHealth(),extras=extraFindings(pendingAnalysis,sub,scripts);return redact({...base,kind:'hlgb_support_blackbox_bundle',version:V,blackboxGeneratedAt:now(),pendingAnalysis,subsystems:sub,scripts,storage,latestAudit:latestAudit(),openSystemIssues:systemIssues(),findings:[...(base.findings||[]),...extras]})}
function download(data){const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='HLGB-CAIXA-PRETA-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{try{URL.revokeObjectURL(a.href)}catch(e){}a.remove()},1000)}
async function run(){const task=async()=>{const d=await collect();download(d);return d},d=window.hlgbSafetyGate9269?.auditReadOnly?await window.hlgbSafetyGate9269.auditReadOnly(task):await task(),p=d.pendingAnalysis||{},errors=(d.findings||[]).filter(x=>x.severity==='error').length,warns=(d.findings||[]).filter(x=>x.severity!=='error').length;alert('Caixa-preta gerada.\n\nPendências na tela: '+(p.uiCount??'-')+'\nOperações únicas: '+(p.uniqueCount||0)+'\nConflitos: '+(p.conflicts||0)+'\nLoops de tentativa: '+(p.retryLoops||0)+'\nErros técnicos: '+errors+'\nAtenções: '+warns+'\n\nEnvie o arquivo HLGB-CAIXA-PRETA para o ChatGPT.');return d}
function inject(){const result=document.getElementById('hlgbAuditorResult'),root=result?.parentElement,actions=root?.querySelector('.hlgb-auditor-actions');if(!actions)return false;let b=document.getElementById('hlgbAuditorBlackbox9299');if(!b){b=document.createElement('button');b.id='hlgbAuditorBlackbox9299';b.type='button';b.className='primary';actions.insertBefore(b,actions.firstChild)}b.textContent='📦 Caixa-preta completa (8s)';b.onclick=()=>run().catch(e=>alert('Falha ao gerar a caixa-preta.\n\n'+sid(e?.message||e)));return true}
function schedule(){setTimeout(inject,60);setTimeout(inject,250);setTimeout(inject,700)}
document.addEventListener('click',e=>{const b=e.target?.closest?.('button');if(!b)return;if(b.id==='hlgbAuditorNavBtn'||b.id==='hlgbAuditorOpenBtn'||/Auditor\s*\/\s*Testes/i.test(sid(b.textContent)))schedule()},true);setTimeout(inject,1400);setTimeout(inject,3200);
window.hlgbAuditorBlackbox9299={version:V,collect,run,analyzePending,loadedScripts,storageHealth,subsystems,inject};window.HLGB_AUDITOR_BLACKBOX_9299=V;console.info('[HLGB] Auditor caixa-preta v'+V+' ativo');
})();
