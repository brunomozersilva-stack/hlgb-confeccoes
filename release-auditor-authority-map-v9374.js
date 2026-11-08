/* HLGB Auditor v93.98 — mapa de versões e autoridades, somente leitura.
   Responsabilidade é mais importante que profundidade ou número de arquivos carregados. */
(function(){
'use strict';
if(window.HLGB_AUDITOR_AUTHORITY_9374)return;
const V='93.98',BUILD='HLGB-AUDITOR-AUTHORITY-93.98';
const sid=v=>String(v??'');
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const POINTERS=['__original','__hlgb955Original','__hlgb9306Original','__hlgb9320Original','__hlgbBase','__hlgbReliableOriginal','__hlgbWalOriginal','__wrapped','__base','original','wrapped','previous','__originalGradeLink','__hlgbRecordIntegrityOriginal'];
const FAMILIES=[
 {id:'hub',label:'Hub Financeiro',re:/release-(hub-|finance-)/i,functions:['renderHubFinance','changeHubFinanceWeek','toggleHubFinanceEntry','editHubFinanceEntry','hlgbHubSaveConfirmed']},
 {id:'production',label:'Produção / Baixa',re:/release-(production-|separation-)/i,functions:['hlgbWriteoffSelected9385','hlgbWriteoffSelected9384','hlgbWriteoffSelected9378','applySeparationProgress938','markSeparation','syncFinalizedCutsToProduction']},
 {id:'sync',label:'Sincronização / WAL',re:/release-(save-|wal-|sync-|runtime-recovery|payroll-(month-wal|snapshot-watch|reliable-save-guard|wal-race))/i,functions:['hlgbRecordSaveWithRetry','hlgb955ReliableSave','cloudRequest','flush955']},
 {id:'projection',label:'Projeção',re:/release-projection-/i,functions:['renderProjection']},
 {id:'payroll',label:'RH / Folha',re:/release-payroll-/i,functions:['renderPayrollProvisions']},
 {id:'assistant',label:'Assistente',re:/release-assistant-/i,functions:['hlgbAssistantAsk']},
 {id:'auditor',label:'Auditor',re:/release-auditor-/i,functions:['openHlgbAuditor','hlgbAuditorRunFull','hlgbAuditorRunVisualSweep']}
];
const RESPONSIBILITIES=[
 {id:'hub-save',family:'hub',label:'Confirmação de salvamento do Hub',fn:'hlgbHubSaveConfirmed',files:['release-save-actions-v9322.js','release-hub-delivery-v9324.js'],authority:'release-hub-delivery-v9324.js',authorityFile:'release-hub-delivery-v9324.js',runtimeKey:'HLGB_HUB_SAVE_AUTHORITY',runtimeValue:'93.24',supersedes:['release-save-actions-v9322.js']},
 {id:'writeoff',family:'production',label:'Baixa operacional',fn:'hlgbWriteoffSelected9385',files:['release-production-operations-v9378-preview.js','release-production-operations-v9380-preview-patch.js','release-production-operations-v9386-finalize.js','release-production-writeoff-integrity-v9391.js'],authority:'release-production-writeoff-integrity-v9391.js',authorityFile:'release-production-writeoff-integrity-v9391.js',runtimeKey:'HLGB_OPERATIONAL_WRITEOFF_AUTHORITY',runtimeValue:'93.91',supersedes:['release-production-operations-v9378-preview.js','release-production-operations-v9380-preview-patch.js','release-production-operations-v9386-finalize.js']},
 {id:'record-transport',family:'sync',label:'Transporte base de nuvem',fn:'cloudRequest',files:['release-save-transport-v9320.js'],authority:'release-save-transport-v9320.js',authorityFile:'release-save-transport-v9320.js',runtimeFunctions:['cloudRequest'],runtimeMarker:'__hlgb9320',supersedes:[]},
 {id:'production-save-guard',family:'sync',label:'Proteção de Produção no save',fn:'hlgbRecordSaveWithRetry',files:['release-sync-guard-v9306.js'],authority:'release-sync-guard-v9306.js',authorityFile:'release-sync-guard-v9306.js',runtimeKey:'HLGB_SYNC_GUARD_9306',runtimeValue:'93.06',runtimeFunctions:['hlgbRecordSaveWithRetry','hlgb955ReliableSave'],runtimeMarker:'__hlgb9306',supersedes:[]},
 {id:'payroll-save',family:'sync',label:'No-op técnico da folha mensal',fn:'hlgbRecordSaveWithRetry',files:['release-payroll-month-wal-v9334.js','release-payroll-snapshot-watch-v9354.js','release-payroll-reliable-save-guard-v9344.js','release-payroll-wal-race-v9346.js'],authority:'release-payroll-wal-race-v9346.js',authorityFile:'release-payroll-wal-race-v9346.js',runtimeKey:'HLGB_PAYROLL_WAL_RACE_9346',runtimeValue:'93.56',runtimeFunctions:['hlgbRecordSaveWithRetry','hlgb955ReliableSave'],runtimeMarker:'__hlgbPayrollWalRace9346',supersedes:['release-payroll-month-wal-v9334.js','release-payroll-snapshot-watch-v9354.js','release-payroll-reliable-save-guard-v9344.js']}
];
function fileName(src){try{return decodeURIComponent(new URL(src,location.href).pathname.split('/').pop()||'')}catch(e){return sid(src).split(/[/?#]/).pop()||''}}
function isAuditProbe(src){try{return new URL(src,location.href).searchParams.has('hlgb_audit_fresh')}catch(e){return /(?:[?&])hlgb_audit_fresh=/.test(sid(src))}}
function loadedScriptInventory(){
 const occurrences=[];
 try{document.querySelectorAll('script[src]').forEach((s,index)=>{const file=fileName(s.src);if(file)occurrences.push({file,source:'dom',index,src:s.src})})}catch(e){}
 try{performance.getEntriesByType('resource').forEach((e,index)=>{if(isAuditProbe(e.name))return;const file=fileName(e.name);if(/\.js$/i.test(file))occurrences.push({file,source:'resource',index,startTime:Number(e.startTime||0),duration:Number(e.duration||0),src:e.name})})}catch(e){}
 const byFile=new Map();for(const row of occurrences){const cur=byFile.get(row.file)||{file:row.file,dom:0,resource:0,total:0};cur[row.source]=(cur[row.source]||0)+1;cur.total++;byFile.set(row.file,cur)}
 const counts=[...byFile.values()].sort((a,b)=>b.total-a.total||a.file.localeCompare(b.file));
 return {occurrences,counts,duplicates:counts.filter(x=>x.dom>1||x.resource>1),uniqueFiles:counts.map(x=>x.file).sort()};
}
function loadedScripts(){return loadedScriptInventory().uniqueFiles}
function filenameVersionHint(name){let m=sid(name).match(/(?:^|[-_])v(\d{4})(?:\D|$)/i);if(m){const n=m[1];return n.slice(0,2)+'.'+n.slice(2)}m=sid(name).match(/(?:^|[-_])v(\d+(?:\.\d+)?)/i);return m?m[1]:''}
function chain(fn){
 if(typeof fn!=='function')return {depth:0,cycle:false,truncated:false,nodes:[],edges:[]};
 const ids=new Map(),nodes=[],edges=[],queue=[{fn,depth:1}],expanded=new Set();let cycle=false,truncated=false,nextId=1,maxDepth=0;
 const idFor=f=>{if(!ids.has(f))ids.set(f,nextId++);return ids.get(f)};
 while(queue.length){const cur=queue.shift();if(typeof cur.fn!=='function')continue;const id=idFor(cur.fn);maxDepth=Math.max(maxDepth,cur.depth);if(expanded.has(cur.fn))continue;if(nodes.length>=96){truncated=true;break}expanded.add(cur.fn);const pointers=[];for(const p of POINTERS){let target=null;try{target=cur.fn[p]}catch(e){}if(typeof target!=='function')continue;const to=idFor(target);pointers.push(p);edges.push({from:id,to,via:p});if(expanded.has(target))cycle=true;else if(!queue.some(x=>x.fn===target))queue.push({fn:target,depth:cur.depth+1})}nodes.push({id,name:cur.fn.name||'anon',depth:cur.depth,markers:Object.keys(cur.fn).filter(k=>/^__hlgb/i.test(k)&&typeof cur.fn[k]!=='function').slice(0,24),pointers})}
 return {depth:maxDepth,cycle,truncated,nodes,edges};
}
function fnInfo(name){const fn=window[name];return {name,exists:typeof fn==='function',chain:typeof fn==='function'?chain(fn):null}}
function runtimeVersionEvidence(){const rows=[];for(const k of Object.keys(window)){if(!/^HLGB_|^hlgb/i.test(k))continue;let v;try{v=window[k]}catch(e){continue}if(typeof v==='string'&&/\d{2}\.\d{1,3}|\d{4}/.test(v))rows.push({key:k,value:v,source:'runtime-marker'});else if(v&&typeof v==='object'&&typeof v.version==='string')rows.push({key:k,value:v.version,source:'runtime-object'})}return rows.slice(0,220)}
function responsibilityState(id,inventory){
 const r=RESPONSIBILITIES.find(x=>x.id===id);if(!r)return null;
 const present=r.files.filter(f=>inventory.uniqueFiles.includes(f)),authorityPresent=!r.authorityFile||present.includes(r.authorityFile);
 let runtimeConfirmed=!r.runtimeKey;if(r.runtimeKey){try{runtimeConfirmed=sid(window[r.runtimeKey])===sid(r.runtimeValue)}catch(e){runtimeConfirmed=false}}
 if(runtimeConfirmed&&r.runtimeMarker){const fns=(r.runtimeFunctions?.length?r.runtimeFunctions:[r.fn]).filter(Boolean);runtimeConfirmed=!!fns.length&&fns.every(name=>{try{return chain(window[name]).nodes.some(n=>n.markers.includes(r.runtimeMarker))}catch(e){return false}})}
 const supersededPresent=(r.supersedes||[]).filter(f=>present.includes(f)),authorityConfirmed=!!r.authorityFile&&authorityPresent&&runtimeConfirmed;
 // Camadas delegadas podem continuar carregadas para outras responsabilidades. Só existe conflito se a autoridade final não estiver confirmada.
 const conflict=present.length>1&&!authorityConfirmed;
 return {...r,present,authorityPresent,runtimeConfirmed,authorityConfirmed,supersededPresent,conflict,status:conflict?'warn':authorityConfirmed?'pass':present.length?'info':'unknown'};
}
function familyScan(f,inventory){
 const files=inventory.uniqueFiles.filter(x=>f.re.test(x)),occurrences=inventory.occurrences.filter(x=>f.re.test(x.file)),functions=f.functions.map(fnInfo),cycles=functions.filter(x=>x.chain?.cycle),deep=functions.filter(x=>(x.chain?.depth||0)>12),declared=RESPONSIBILITIES.filter(x=>x.family===f.id).map(x=>responsibilityState(x.id,inventory)),authorityConflicts=declared.filter(x=>x?.conflict);
 const status=cycles.length?'fail':authorityConflicts.length?'warn':'pass';
 return {id:f.id,label:f.label,status,files,occurrenceCount:occurrences.length,filenameVersionHints:[...new Set(files.map(filenameVersionHint).filter(Boolean))],functions,cycles:cycles.map(x=>x.name),deep:deep.map(x=>({name:x.name,depth:x.chain.depth})),responsibilities:declared};
}
function scan(){
 const inventory=loadedScriptInventory(),families=FAMILIES.map(f=>familyScan(f,inventory)),fail=families.filter(x=>x.status==='fail').length,warn=families.filter(x=>x.status==='warn').length;
 const consolidationPlan=RESPONSIBILITIES.map(r=>responsibilityState(r.id,inventory)).filter(Boolean).map(r=>({id:r.id,label:r.label,authority:r.authority,present:r.present,conflict:r.conflict,supersedes:r.supersedes,authorityConfirmed:r.authorityConfirmed,runtimeKey:r.runtimeKey||'',runtimeValue:r.runtimeValue||'',runtimeFunctions:r.runtimeFunctions||[],runtimeMarker:r.runtimeMarker||'',recommendation:r.conflict?'Autoridade final desta responsabilidade não foi confirmada; revisar instaladores.':r.authorityConfirmed&&r.supersededPresent.length?'Autoridade final confirmada; arquivos anteriores permanecem carregados apenas em responsabilidades delegadas.':r.authorityConfirmed?'Autoridade final confirmada.':r.present.length?'Responsabilidade observada, mas sem prova de autoridade final.':'Não medido nesta sessão.'}));
 return {kind:'hlgb_authority_map',version:V,build:BUILD,at:new Date().toISOString(),appVersion:sid(window.HLGB_RELEASE_VERSION||''),measurement:'runtime-current-session',scriptInventory:inventory,scriptsCount:inventory.uniqueFiles.length,scripts:inventory.uniqueFiles,families,runtimeVersions:runtimeVersionEvidence(),consolidationPlan,retirementPlan:[],summary:{fail,warn,pass:families.length-fail-warn,result:fail?'Falhou':warn?'Atenção':'Aprovado'}};
}
function fileStamp(){return new Date().toISOString().replace(/[:.]/g,'-')}
function download(report){try{const r=report||scan(),payload={exportedAt:new Date().toISOString(),source:'HLGB Auditor Arquitetura/Versões/Autoridades',report:r},blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hlgb-arquitetura-autoridades-'+fileStamp()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);return true}catch(e){console.warn('[HLGB] não foi possível baixar relatório de arquitetura',e);return false}}
function panel(report){
 const old=document.getElementById('hlgbAuthorityMap9374');if(old)old.remove();const host=document.getElementById('hlgbAuditorResult');if(!host)return false;
 const el=document.createElement('div');el.id='hlgbAuthorityMap9374';el.className='panel';el.style.cssText='border:1px solid #c9bfd0;background:#fcf9ff;margin:10px 0';
 const rows=report.families.map(f=>{const icon=f.status==='fail'?'🔴':f.status==='warn'?'🟡':'✅',issues=[];if(f.cycles.length)issues.push('ciclo em '+f.cycles.join(', '));if(f.deep.length)issues.push('cadeia extensa (informativa): '+f.deep.map(x=>x.name+'('+x.depth+')').join(', '));for(const r of f.responsibilities.filter(x=>x?.conflict))issues.push(r.label+': '+r.present.join(' + '));return '<div style="padding:8px 0;border-top:1px solid #eee"><b>'+icon+' '+esc(f.label)+'</b><div class="sub">Arquivos únicos: '+f.files.length+' · ocorrências observadas: '+f.occurrenceCount+'</div>'+(issues.length?'<div class="sub"><b>Conflito comprovável:</b> '+esc(issues.join(' | '))+'</div>':'')+'</div>'}).join('');
 const resp=report.consolidationPlan.map(r=>'<div class="sub">'+(r.conflict?'🟡':'✅')+' '+esc(r.label)+': '+esc(r.authority)+(r.supersedes.length?' · delegadas '+esc(r.supersedes.join(', ')):'')+'</div>').join('');
 const dup=report.scriptInventory.duplicates.length?'<div class="sub"><b>Scripts com multiplicidade:</b> '+esc(report.scriptInventory.duplicates.map(x=>x.file+' [DOM '+x.dom+', recurso '+x.resource+']').join(' | '))+'</div>':'<div class="sub">Nenhuma multiplicidade de script observada nesta sessão.</div>';
 el.innerHTML='<h3 style="margin-top:0">🧭 Arquitetura / Versões / Autoridades</h3><div class="sub">Somente leitura · '+V+' · arquivos diferentes podem coexistir quando têm responsabilidades diferentes.</div><div style="margin:8px 0"><b>Resultado:</b> '+esc(report.summary.result)+' · '+report.summary.fail+' falha(s) · '+report.summary.warn+' atenção(ões)</div>'+dup+'<div style="margin:8px 0"><b>Autoridades por responsabilidade</b>'+resp+'</div><div style="margin:10px 0"><button id="hlgbAuthorityDownload9374" class="secondary" type="button">⬇️ Baixar relatório completo</button> <button id="hlgbAuthorityHygieneBtn9504" class="secondary" type="button">🧹 Higiene do código</button></div>'+rows;
 el.querySelector('#hlgbAuthorityDownload9374')?.addEventListener('click',()=>download(report));
 el.querySelector('#hlgbAuthorityHygieneBtn9504')?.addEventListener('click',()=>hygieneRun9503().catch(err=>console.error('[HLGB hygiene] analysis failed',err)));
 host.prepend(el);return true;
}

/* v95.03: revisão de código sem executar scripts novamente nem alterar dados.
   CacheStorage: limpeza manual EXCLUSIVAMENTE de recursos JS/CSS deste aplicativo. */
const HYGIENE_SOURCES_9503=[
 'release-record-integrity.js','release-sync-guard-v9306.js',
 'release-save-transport-v9320.js','release-wal-single-authority-v9339.js',
 'release-wal-confirmed-replay-v9333.js','release-payroll-month-wal-v9334.js',
 'release-payroll-wal-race-v9346.js','release-payroll-save-stability-v9296.js',
 'release-hub-primary-v9323.js','release-hub-delivery-v9324.js',
 'release-auditor-autocorrect-v9447.js','release-auditor-autocorrect-v9448.js'
];
async function hygieneSources9503(){
 const result=[];
 for(let i=0;i<HYGIENE_SOURCES_9503.length;i+=4){
  const group=HYGIENE_SOURCES_9503.slice(i,i+4);
  const rows=await Promise.all(group.map(async file=>{
   const controller=typeof AbortController==='function'?new AbortController():null;
   const timer=controller?setTimeout(()=>controller.abort(),7000):null;
   try{
    const response=await fetch('./'+file+'?hlgb_audit_fresh='+Date.now(),{
     cache:'no-store',credentials:'same-origin',...(controller?{signal:controller.signal}:{})
    });
    if(!response.ok)throw new Error('HTTP '+response.status);
    const source=await response.text();
    if(source.length>180000)throw new Error('Arquivo excedeu limite de leitura');
    return {file,source};
   }catch(error){return {file,error:sid(error?.message||error).slice(0,160)}}
   finally{if(timer!==null)clearTimeout(timer)}
  }));
  result.push(...rows);
 }
 return result;
}
function hygieneCodeFindings9503(rows){
 const assignments=new Map(),blocks=new Map();
 for(const row of rows){
  if(typeof row.source!=='string')continue;
  const ls=row.source.split('\n');
  ls.forEach((line,index)=>{
   const match=line.match(/^\s*window\.([A-Za-z_$][\w$]*)\s*=/);
   if(match){
    const name=match[1],list=assignments.get(name)||[];
    list.push({file:row.file,line:index+1});assignments.set(name,list);
   }
  });
  const normalized=ls.map(x=>x.trim().replace(/\s+/g,' '));
  for(let i=0;i+5<normalized.length;i++){
   const six=normalized.slice(i,i+6);
   if(six.some(x=>!x||/^(?:\/\/|\/\*|\*|\*\/)/.test(x)))continue;
   const key=six.join('\n');
   if(key.length<175||key.length>1800)continue;
   const hits=blocks.get(key)||[];
   hits.push({file:row.file,line:i+1});blocks.set(key,hits);
  }
 }
 const overlaps=[...assignments].filter(([,hits])=>new Set(hits.map(h=>h.file)).size>1)
  .map(([name,hits])=>({name,files:[...new Set(hits.map(h=>h.file))],locations:hits}))
  .sort((a,b)=>b.files.length-a.files.length||a.name.localeCompare(b.name)).slice(0,50);
 const identicalBlocks=[...blocks.values()].filter(h=>new Set(h.map(x=>x.file)).size>1)
  .map(h=>({locations:h.slice(0,12)})).slice(0,30);
 return {overlaps,identicalBlocks,checked:rows.filter(x=>x.source).length,errors:rows.filter(x=>x.error).map(x=>({file:x.file,error:x.error}))};
}
async function hygieneCacheCandidates9503(){
 const out=[],scope=new URL('./',location.href);
 if(typeof caches==='undefined'||typeof caches.keys!=='function')return {supported:false,entries:out,error:''};
 try{
  for(const name of await caches.keys()){
   const cache=await caches.open(name);
   for(const request of await cache.keys()){
    let url;try{url=new URL(request.url)}catch(e){continue}
    if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname)||
       !/\.(?:js|css)$/i.test(url.pathname))continue;
    out.push({name,request,file:url.pathname.split('/').pop()});
   }
  }
  return {supported:true,entries:out,error:''};
 }catch(e){return {supported:true,entries:out,error:sid(e?.message||e)}}
}
async function hygieneCachePreview9503(){
 const result=await hygieneCacheCandidates9503();
 return {supported:result.supported,eligible:result.entries.length,
  files:result.entries.slice(0,30).map(x=>x.file),error:result.error,
  note:'Somente CacheStorage JS/CSS do HLGB; não inclui cache HTTP do Safari, WAL, IndexedDB, localStorage nem sessão.'};
}
let hygieneLast9503=null;
function hygieneRender9503(report){
 const host=document.getElementById('hlgbAuditorResult');if(!host)return false;
 document.getElementById('hlgbHygienePanel9503')?.remove();
 const panel=document.createElement('div');panel.id='hlgbHygienePanel9503';panel.className='panel';
 panel.style.cssText='margin:10px 0;border:1px solid #c9bfd0;padding:12px';
 const dup=report.scriptDuplicateExecutions.length;
 const overlap=report.code.overlaps.slice(0,12).map(x=>'<div class="sub">⚠️ '+esc(x.name)+' · '+esc(x.files.join(' / '))+'</div>').join('');
 const deep=report.deepChains.slice(0,12).map(x=>'<div class="sub">'+esc(x.fn)+' · '+x.depth+' camadas ('+esc(x.family)+')</div>').join('');
 const repeated=report.code.identicalBlocks.slice(0,8).map(x=>'<div class="sub">🔁 '+esc(x.locations.map(a=>a.file+':'+a.line).join(' / '))+'</div>').join('');
 panel.innerHTML='<h3 style="margin-top:0">🧹 Higiene do código · v95.03</h3>'+
  '<div class="sub">Diagnóstico somente leitura. Camadas e sobrescritas podem ser intencionais; nenhum código é removido automaticamente.</div>'+
  '<p><b>Scripts executados em duplicidade:</b> '+dup+' · <b>Funções atribuídas por arquivos diferentes:</b> '+report.code.overlaps.length+
  ' · <b>Blocos idênticos entre arquivos:</b> '+report.code.identicalBlocks.length+
  ' · <b>Fontes analisadas:</b> '+report.code.checked+'/'+HYGIENE_SOURCES_9503.length+'</p>'+
  (dup?'<div class="sub"><b>Scripts repetidos:</b> '+esc(report.scriptDuplicateExecutions.map(x=>x.file).join(', '))+'</div>':'')+
  (overlap?'<b>Possíveis funções sobrepostas (revisão humana):</b>'+overlap:'')+
  (deep?'<b>Encadeamento de funções / wrappers:</b>'+deep:'')+
  (repeated?'<b>Trechos idênticos entre arquivos (revisar antes de consolidar):</b>'+repeated:'')+
  (report.code.errors.length?'<div class="sub">Arquivos não verificados: '+esc(report.code.errors.map(x=>x.file).join(', '))+'</div>':'')+
  '<p><b>CacheStorage do HLGB:</b> '+(report.cache.supported?report.cache.eligible+' recurso(s) JS/CSS elegíveis':'indisponível')+
  (report.cache.error?' · '+esc(report.cache.error):'')+'</p>'+
  '<div class="sub">A limpeza de cache é manual e nunca remove dados de empresa. Não é limpeza geral de cache do navegador.</div>'+
  '<button type="button" class="secondary" id="hlgbHygieneCacheClean9503">🧹 Limpar somente cache JS/CSS</button> '+
  '<button type="button" class="secondary" id="hlgbHygieneDownload9503">⬇️ Baixar diagnóstico</button>'+
  '<div class="sub" id="hlgbHygieneStatus9503" role="status"></div>';
 host.prepend(panel);
 panel.querySelector('#hlgbHygieneCacheClean9503')?.addEventListener('click',async()=>{
  const status=panel.querySelector('#hlgbHygieneStatus9503');
  const preview=await hygieneCachePreview9503();
  if(preview.error){status.textContent='Não foi possível concluir a inspeção: '+preview.error;return}
  if(!preview.eligible){status.textContent='Nenhum recurso JS/CSS em CacheStorage para limpar. Dados preservados.';return}
  if(!window.confirm('Excluir '+preview.eligible+' cópia(s) de arquivos JS/CSS do CacheStorage deste HLGB? WAL, dados locais e sessão não serão tocados.'))return;
  const result=await hygieneCacheCandidates9503();
  if(result.error){status.textContent='Leitura incompleta; nada excluído: '+result.error;return}
  let removed=0,failed=0;
  for(const item of result.entries){
   try{const cache=await caches.open(item.name);if(await cache.delete(item.request))removed++;else failed++}
   catch(e){failed++}
  }
  status.textContent=removed+' recurso(s) de CacheStorage removido(s). '+failed+' falha(s). Não limpa cache HTTP nem dados locais. Não atualize uma aba com WAL pendente.';
 });
 panel.querySelector('#hlgbHygieneDownload9503')?.addEventListener('click',()=>{
  const json=JSON.stringify(report,null,2),blob=new Blob([json],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='HLGB-HIGIENE-CODIGO-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 return true;
}
async function hygieneRun9503(){
 const authority=scan(),sourceRows=await hygieneSources9503(),code=hygieneCodeFindings9503(sourceRows);
 const m=window.hlgbAuditorScriptMultiplicity9438?.snapshot?.();
 const duplicates=m?.executionDuplicates||authority.scriptInventory.counts.filter(x=>x.dom>1);
 const deep=[];
 for(const f of authority.families||[])for(const item of f.functions||[])
  if(item.chain?.depth>8||item.chain?.cycle)deep.push({family:f.label,fn:item.name,depth:item.chain.depth,cycle:item.chain.cycle});
 const report={kind:'hlgb_code_hygiene',version:'95.03',at:new Date().toISOString(),
  readOnly:true,code,scriptDuplicateExecutions:duplicates.map(x=>({file:x.file,dom:x.dom,resource:x.resource})),
  deepChains:deep,authorityConflicts:(authority.consolidationPlan||[]).filter(x=>x.conflict).map(x=>({id:x.id,present:x.present})),
  cache:await hygieneCachePreview9503()};
 hygieneLast9503=report;hygieneRender9503(report);return report;
}

window.hlgbAuditorAuthorityScan9374=function(){const r=scan();panel(r);window.hlgbAuditorAuthority9374.last=r;return r};
function decorate(){
 const host=document.getElementById('hlgbAuditorResult');if(!host)return false;
 const actions=host.parentElement?.querySelector?.('.hlgb-auditor-actions')||document.querySelector('.hlgb-auditor-actions');if(!actions)return false;
 let b=document.getElementById('hlgbAuthorityBtn9374');
 if(!b){b=document.createElement('button');b.id='hlgbAuthorityBtn9374';b.type='button';b.className='secondary';b.textContent='🧭 Arquitetura / versões';actions.appendChild(b)}
 b.onclick=()=>window.hlgbAuditorAuthorityScan9374();b.hidden=false;b.removeAttribute('data-hlgb-auditor-hidden');b.style.display='';
 // v95.04: the production loader includes this module but not the optional shell.
 let h=document.getElementById('hlgbHygieneBtn9503');
 if(!h){h=document.createElement('button');h.id='hlgbHygieneBtn9503';h.type='button';h.className='secondary';h.textContent='🧹 Higiene do código';actions.appendChild(h)}
 h.onclick=()=>hygieneRun9503().catch(err=>{console.error('[HLGB hygiene] analysis failed',err);const target=document.getElementById('hlgbAuditorResult');if(target){const p=document.createElement('p');p.textContent='Falha ao abrir Higiene do código: '+sid(err?.message||err);target.prepend(p)}});
 h.hidden=false;h.removeAttribute('data-hlgb-auditor-hidden');h.style.display='inline-block';h.style.visibility='visible';
 return true
}
document.addEventListener?.('click',e=>{if(e.target?.closest?.('#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn'))[80,250,700,1500].forEach(ms=>setTimeout(decorate,ms))},true);
window.HLGB_AUDITOR_AUTHORITY_9374=BUILD;
window.hlgbAuditorAuthority9374={version:V,build:BUILD,scan,panel,decorate,download,last:null,chain,loadedScripts,loadedScriptInventory,filenameVersionHint,RESPONSIBILITIES,FAMILIES,responsibilityState,hygiene:hygieneRun9503,hygieneCachePreview:hygieneCachePreview9503,hygieneCodeFindings:hygieneCodeFindings9503};
if(window.hlgbAuditorDeep9373)window.hlgbAuditorDeep9373.authorityScan=scan;
setTimeout(decorate,500);
console.info('[HLGB] Auditor mapa de autoridades v'+V+' ativo');
})();
