/* HLGB Auditor v93.74 — mapa de versões e autoridades, somente leitura. */
(function(){
'use strict';
if(window.HLGB_AUDITOR_AUTHORITY_9374)return;
const V='93.74',BUILD='HLGB-AUDITOR-AUTHORITY-93.74';
const sid=v=>String(v??'');
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const POINTERS=['__original','__hlgb955Original','__hlgb9306Original','__hlgb9320Original','__hlgbBase','__hlgbReliableOriginal','__hlgbWalOriginal','__wrapped','__base','original','wrapped','previous'];
const FAMILIES=[
 {id:'hub',label:'Hub Financeiro',re:/release-(hub-|finance-)/i,functions:['renderHubFinance','changeHubFinanceWeek','toggleHubFinanceEntry','editHubFinanceEntry','hlgbHubSaveConfirmed']},
 {id:'production',label:'Produção / Baixa',re:/release-(production-|separation-)/i,functions:['hlgbWriteoffSelected9385','hlgbWriteoffSelected9384','hlgbWriteoffSelected9378','applySeparationProgress938','markSeparation','syncFinalizedCutsToProduction']},
 {id:'sync',label:'Sincronização / WAL',re:/release-(save-|wal-|sync-|runtime-recovery)/i,functions:['hlgbRecordSaveWithRetry','cloudRequest','flush955']},
 {id:'projection',label:'Projeção',re:/release-projection-/i,functions:['renderProjection']},
 {id:'payroll',label:'RH / Folha',re:/release-payroll-/i,functions:['renderPayrollProvisions']},
 {id:'assistant',label:'Assistente',re:/release-assistant-/i,functions:['hlgbAssistantAsk']},
 {id:'auditor',label:'Auditor',re:/release-auditor-/i,functions:['openHlgbAuditor','hlgbAuditorRunFull','hlgbAuditorRunVisualSweep']}
];
const RESPONSIBILITIES=[
 {id:'hub-save',family:'hub',label:'Confirmação de salvamento do Hub',fn:'hlgbHubSaveConfirmed',files:['release-save-actions-v9322.js','release-hub-delivery-v9324.js'],authority:'não comprovada',supersedes:[]},
 {id:'writeoff',family:'production',label:'Baixa operacional',fn:'hlgbWriteoffSelected9385',files:['release-production-operations-v9378-preview.js','release-production-operations-v9380-preview-patch.js'],authority:'não comprovada nesta branch',supersedes:[]},
 {id:'record-save',family:'sync',label:'Persistência de registro',fn:'hlgbRecordSaveWithRetry',files:['release-save-transport-v9320.js','release-sync-guard-v9306.js','release-payroll-reliable-save-guard-v9344.js'],authority:'precisa de consolidação por responsabilidade',supersedes:[]}
];
function fileName(src){try{return decodeURIComponent(new URL(src,location.href).pathname.split('/').pop()||'')}catch(e){return sid(src).split(/[/?#]/).pop()||''}}
function loadedScriptInventory(){
 const occurrences=[];
 try{document.querySelectorAll('script[src]').forEach((s,index)=>{const file=fileName(s.src);if(file)occurrences.push({file,source:'dom',index,src:s.src})})}catch(e){}
 try{performance.getEntriesByType('resource').forEach((e,index)=>{const file=fileName(e.name);if(/\.js$/i.test(file))occurrences.push({file,source:'resource',index,startTime:Number(e.startTime||0),duration:Number(e.duration||0),src:e.name})})}catch(e){}
 const byFile=new Map();for(const row of occurrences){const cur=byFile.get(row.file)||{file:row.file,dom:0,resource:0,total:0};cur[row.source]=(cur[row.source]||0)+1;cur.total++;byFile.set(row.file,cur)}
 const counts=[...byFile.values()].sort((a,b)=>b.total-a.total||a.file.localeCompare(b.file));
 return {occurrences,counts,duplicates:counts.filter(x=>x.dom>1||x.resource>1),uniqueFiles:counts.map(x=>x.file).sort()};
}
function loadedScripts(){return loadedScriptInventory().uniqueFiles}
function filenameVersionHint(name){
 let m=sid(name).match(/(?:^|[-_])v(\d{4})(?:\D|$)/i);if(m){const n=m[1];return n.slice(0,2)+'.'+n.slice(2)}
 m=sid(name).match(/(?:^|[-_])v(\d+(?:\.\d+)?)/i);return m?m[1]:'';
}
function chain(fn){
 if(typeof fn!=='function')return {depth:0,cycle:false,truncated:false,nodes:[],edges:[]};
 const ids=new Map(),nodes=[],edges=[],queue=[{fn,depth:1}],expanded=new Set();let cycle=false,truncated=false,nextId=1,maxDepth=0;
 function idFor(f){if(!ids.has(f))ids.set(f,nextId++);return ids.get(f)}
 while(queue.length){const cur=queue.shift();if(typeof cur.fn!=='function')continue;const id=idFor(cur.fn);maxDepth=Math.max(maxDepth,cur.depth);if(expanded.has(cur.fn))continue;if(nodes.length>=80){truncated=true;break}expanded.add(cur.fn);
  const pointers=[];for(const p of POINTERS){let target=null;try{target=cur.fn[p]}catch(e){}if(typeof target!=='function')continue;const to=idFor(target);pointers.push(p);edges.push({from:id,to,via:p});if(expanded.has(target)||queue.some(x=>x.fn===target)){if(target===cur.fn||expanded.has(target))cycle=true}else queue.push({fn:target,depth:cur.depth+1})}
  nodes.push({id,name:cur.fn.name||'anon',depth:cur.depth,markers:Object.keys(cur.fn).filter(k=>/^__hlgb/i.test(k)&&typeof cur.fn[k]!=='function').slice(0,16),pointers});
 }
 return {depth:maxDepth,cycle,truncated,nodes,edges};
}
function fnInfo(name){const fn=window[name];return {name,exists:typeof fn==='function',chain:typeof fn==='function'?chain(fn):null}}
function runtimeVersionEvidence(){
 const rows=[];for(const k of Object.keys(window)){if(!/^HLGB_|^hlgb/i.test(k))continue;let v;try{v=window[k]}catch(e){continue}
  if(typeof v==='string'&&/\d{2}\.\d{1,3}|\d{4}/.test(v))rows.push({key:k,value:v,source:'runtime-marker'});
  else if(v&&typeof v==='object'&&typeof v.version==='string')rows.push({key:k,value:v.version,source:'runtime-object'});
 }
 return rows.slice(0,180);
}
function responsibilityState(id,inventory){
 const r=RESPONSIBILITIES.find(x=>x.id===id);if(!r)return null;const present=r.files.filter(f=>inventory.uniqueFiles.includes(f));
 return {...r,present,conflict:present.length>1&&!r.supersedes.length,status:present.length>1&&!r.supersedes.length?'warn':present.length?'info':'unknown'};
}
function familyScan(f,inventory){
 const files=inventory.uniqueFiles.filter(x=>f.re.test(x));
 const occurrences=inventory.occurrences.filter(x=>f.re.test(x.file));
 const functions=f.functions.map(fnInfo),cycles=functions.filter(x=>x.chain?.cycle),deep=functions.filter(x=>(x.chain?.depth||0)>12);
 const declared=RESPONSIBILITIES.filter(x=>x.family===f.id).map(x=>responsibilityState(x.id,inventory));
 const authorityConflicts=declared.filter(x=>x?.conflict);
 const status=cycles.length?'fail':deep.length||authorityConflicts.length?'warn':'pass';
 return {id:f.id,label:f.label,status,files,occurrenceCount:occurrences.length,filenameVersionHints:[...new Set(files.map(filenameVersionHint).filter(Boolean))],functions,cycles:cycles.map(x=>x.name),deep:deep.map(x=>({name:x.name,depth:x.chain.depth})),responsibilities:declared};
}
function scan(){
 const inventory=loadedScriptInventory(),families=FAMILIES.map(f=>familyScan(f,inventory));
 const fail=families.filter(x=>x.status==='fail').length,warn=families.filter(x=>x.status==='warn').length;
 const consolidationPlan=RESPONSIBILITIES.map(r=>responsibilityState(r.id,inventory)).filter(Boolean).map(r=>({id:r.id,label:r.label,authority:r.authority,present:r.present,conflict:r.conflict,supersedes:r.supersedes,recommendation:r.conflict?'Mapear instaladores e escolher autoridade antes de remover qualquer arquivo.':r.present.length?'Responsabilidade declarada; sem aposentadoria inferida.':'Não medido: arquivos declarados não observados.'}));
 return {kind:'hlgb_authority_map',version:V,build:BUILD,at:new Date().toISOString(),appVersion:sid(window.HLGB_RELEASE_VERSION||''),measurement:'runtime-current-session',scriptInventory:inventory,scriptsCount:inventory.uniqueFiles.length,scripts:inventory.uniqueFiles,families,runtimeVersions:runtimeVersionEvidence(),consolidationPlan,retirementPlan:[],summary:{fail,warn,pass:families.length-fail-warn,result:fail?'Falhou':warn?'Atenção':'Aprovado'}};
}
function fileStamp(){return new Date().toISOString().replace(/[:.]/g,'-')}
function download(report){
 try{
  const r=report||scan(),payload={exportedAt:new Date().toISOString(),source:'HLGB Auditor Arquitetura/Versões/Autoridades',report:r};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='hlgb-arquitetura-autoridades-'+fileStamp()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;
 }catch(e){console.warn('[HLGB] não foi possível baixar relatório de arquitetura',e);return false}
}
function panel(report){
 const old=document.getElementById('hlgbAuthorityMap9374');if(old)old.remove();
 const host=document.getElementById('hlgbAuditorResult');if(!host)return false;
 const el=document.createElement('div');el.id='hlgbAuthorityMap9374';el.className='panel';el.style.cssText='border:1px solid #c9bfd0;background:#fcf9ff;margin:10px 0';
 const rows=report.families.map(f=>{const icon=f.status==='fail'?'🔴':f.status==='warn'?'🟡':'✅';const issues=[];if(f.cycles.length)issues.push('ciclo em '+f.cycles.join(', '));if(f.deep.length)issues.push('wrapper profundo: '+f.deep.map(x=>x.name+'('+x.depth+')').join(', '));for(const r of f.responsibilities.filter(x=>x?.conflict))issues.push(r.label+': '+r.present.join(' + '));return '<div style="padding:8px 0;border-top:1px solid #eee"><b>'+icon+' '+esc(f.label)+'</b><div class="sub">Arquivos únicos: '+f.files.length+' · ocorrências observadas: '+f.occurrenceCount+'</div><div class="sub">Versão do nome é apenas pista: '+esc(f.filenameVersionHints.join(', ')||'sem pista')+'</div>'+(issues.length?'<div class="sub"><b>Conflito comprovável:</b> '+esc(issues.join(' | '))+'</div>':'')+'</div>'}).join('');
 const dup=report.scriptInventory.duplicates.length?'<div class="sub"><b>Scripts com multiplicidade:</b> '+esc(report.scriptInventory.duplicates.map(x=>x.file+' [DOM '+x.dom+', recurso '+x.resource+']').join(' | '))+'</div>':'<div class="sub">Nenhuma multiplicidade de script observada nesta sessão.</div>';
 el.innerHTML='<h3 style="margin-top:0">🧭 Arquitetura / Versões / Autoridades</h3><div class="sub">Somente leitura · '+V+' · versão do nome não define autoridade.</div><div style="margin:8px 0"><b>Resultado:</b> '+esc(report.summary.result)+' · '+report.summary.fail+' falha(s) · '+report.summary.warn+' atenção(ões)</div>'+dup+'<div style="margin:10px 0"><button id="hlgbAuthorityDownload9374" class="secondary" type="button">⬇️ Baixar relatório completo</button></div>'+rows+'<div class="sub" style="margin-top:8px">Nenhum arquivo é marcado para aposentadoria só por ter versão menor. Consolidação exige manifesto de responsabilidade + teste funcional.</div>';
 el.querySelector('#hlgbAuthorityDownload9374')?.addEventListener('click',()=>download(report));
 host.prepend(el);return true;
}
window.hlgbAuditorAuthorityScan9374=function(){const r=scan();panel(r);window.hlgbAuditorAuthority9374.last=r;return r};
function decorate(){const host=document.getElementById('hlgbAuditorResult');if(!host)return false;const actions=host.parentElement?.querySelector?.('.hlgb-auditor-actions')||document.querySelector('.hlgb-auditor-actions');if(!actions)return false;let b=document.getElementById('hlgbAuthorityBtn9374');if(!b){b=document.createElement('button');b.id='hlgbAuthorityBtn9374';b.type='button';b.className='secondary';b.textContent='🧭 Arquitetura / versões';b.onclick=()=>window.hlgbAuditorAuthorityScan9374();actions.appendChild(b)}b.hidden=false;b.removeAttribute('data-hlgb-auditor-hidden');b.style.display='';return true}
document.addEventListener?.('click',e=>{if(e.target?.closest?.('#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn'))[80,250,700,1500].forEach(ms=>setTimeout(decorate,ms))},true);
window.HLGB_AUDITOR_AUTHORITY_9374=BUILD;
window.hlgbAuditorAuthority9374={version:V,build:BUILD,scan,panel,decorate,download,last:null,chain,loadedScripts,loadedScriptInventory,filenameVersionHint,RESPONSIBILITIES,FAMILIES};
if(window.hlgbAuditorDeep9373)window.hlgbAuditorDeep9373.authorityScan=scan;
setTimeout(decorate,500);
console.info('[HLGB] Auditor mapa de autoridades v'+V+' ativo');
})();
