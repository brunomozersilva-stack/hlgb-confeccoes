/* HLGB Auditor v93.73 — produção Safari + diagnóstico profundo somente leitura */
(async function(){
'use strict';
if(window.HLGB_AUDITOR_PRODUCTION_9369||window.HLGB_AUDITOR_PRODUCTION_9369_LOADING)return;
window.HLGB_AUDITOR_PRODUCTION_9369_LOADING=true;
let before={recordSave:window.hlgbRecordSaveWithRetry,cloudRequest:window.cloudRequest,setInterval:window.setInterval,setTimeout:window.setTimeout};
function ready(){return !!window.hlgbInternalAuditor&&!!window.hlgbAuditorBlackbox9299&&!!window.hlgbOperationalAuditor9314}
async function waitReady(){const end=Date.now()+20000;while(!ready()&&Date.now()<end)await new Promise(r=>setTimeout(r,250));if(!ready())throw new Error('Módulos-base do Auditor ainda não ficaram prontos.');}
function load(file){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='./'+file+'?fresh='+Date.now();s.async=false;s.onload=()=>resolve();s.onerror=()=>reject(new Error('Falha ao carregar '+file));(document.head||document.documentElement).appendChild(s);});}
function installLegacyHideCss(){let st=document.getElementById('hlgbAuditorLegacyHide9368');if(!st){st=document.createElement('style');st.id='hlgbAuditorLegacyHide9368';(document.head||document.documentElement).appendChild(st)}st.textContent=['#hlgbAuditorMaxDebug9292','#hlgbAuditorBlackbox9299','#hlgbAuditFull9315','#hlgbAuditCritical9315','#hlgbAuditDownloadFull9315','#hlgbAuditDownloadCritical9315','#hlgbAuditorHubDeep9315','.hlgb-auditor-actions:has(#hlgbSmartTest) button:not(#hlgbSmartTest):not(#hlgbSmartProblem):not(#hlgbSmartHistoryBtn)'].join(',')+'{display:none!important}';}
function cleanSmartModal(){const status=document.getElementById('hlgbSmartStatus');if(!status)return;const root=status.closest('[role="dialog"],.modal,.modal-content,.modalCard,.modal-card,.dialog')||status.parentElement?.parentElement||status.parentElement;if(!root)return;const keep=new Set(['hlgbSmartTest','hlgbSmartProblem','hlgbSmartHistoryBtn','hlgbSafariDownload9368']);for(const el of root.querySelectorAll('button,a,[role="button"]')){const txt=String(el.textContent||'').trim();const close=el.classList?.contains('modalSave')||/fechar|close/i.test(txt)||/closeModal/.test(String(el.getAttribute('onclick')||''));if(keep.has(el.id)||close){el.hidden=false;continue}el.hidden=true;el.setAttribute('data-hlgb-auditor-hidden','1');}}
function postOpenCleanup(){cleanSmartModal();queueMicrotask(cleanSmartModal);requestAnimationFrame(()=>{cleanSmartModal();requestAnimationFrame(cleanSmartModal)});}
function installSingleEntry(){if(window.__hlgbAuditorEntryCapture9368)return;const handler=e=>{const b=e.target?.closest?.('#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn');if(!b)return;e.preventDefault();e.stopImmediatePropagation();if(typeof window.openHlgbAuditor==='function'){window.openHlgbAuditor();postOpenCleanup()}};document.addEventListener('click',handler,true);window.__hlgbAuditorEntryCapture9368=handler;}
function cloudRequestIsSafe(previous,current){
 if(previous===current)return true;
 if(typeof current!=='function')return false;
 if(current.__hlgb9320===true){
  if(previous==null)return typeof current.__hlgb9320Original==='function';
  return current.__hlgb9320Original===previous;
 }
 return false;
}

/* v93.73: aprende com falhas complexas sem tocar no boot, salvamento ou abertura do Auditor. */
const DEEP_VERSION='2026.10.20-deep-v1';
const DEEP_BUILD='HLGB-AUDITOR-DEEP-93.73';
const deepRecorded=new Set();
const sid=v=>String(v??'');
function hash(s){let h=2166136261>>>0;for(const ch of sid(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return ('00000000'+h.toString(16)).slice(-8)}
function currentProfileKey(){let u=null;try{u=typeof currentUser==='function'?currentUser():null}catch(e){}const raw=sid(u?.auth_id||u?.authId||u?.id||window.cloudUser?.id||window.cloudUser?.email||u?.login||u?.name||'unknown');return 'profile-'+hash(raw)}
function appVersion(){try{return sid(window.HLGB_RELEASE_VERSION||document.querySelector('#appShell .logo small')?.textContent||'').replace(/^v/i,'')||'desconhecida'}catch(e){return 'desconhecida'}}
function mkCheck(code,status,title,detail,severity='info',meta={}){return {code,category:'Diagnóstico profundo',status,title,detail,severity,...meta}}
function summary(checks){const fail=checks.filter(x=>x.status==='fail').length,warn=checks.filter(x=>x.status==='warn').length,pass=checks.filter(x=>x.status==='pass').length;return {total:checks.length,pass,warn,fail,result:fail?'Falhou':warn?'Atenção':'Aprovado'}}
function criticalSnapshot(){return {recordSave:window.hlgbRecordSaveWithRetry,cloudRequest:window.cloudRequest,setInterval:window.setInterval,setTimeout:window.setTimeout,openAuditor:window.openHlgbAuditor}}
function wrapperChain(fn){
 const pointers=['__original','__hlgb955Original','__hlgb9306Original','__hlgb9320Original','__hlgbBase','__hlgbReliableOriginal','__hlgbWalOriginal'];
 const seen=new Set(),nodes=[];let cur=fn,cycle=false,guard=0;
 while(typeof cur==='function'&&guard++<32){
  if(seen.has(cur)){cycle=true;break}seen.add(cur);
  const props=[];for(const p of pointers)if(typeof cur[p]==='function')props.push(p);
  nodes.push({name:cur.name||'anon',markers:Object.keys(cur).filter(k=>/^__hlgb/.test(k)&&typeof cur[k]!=='function').slice(0,12),pointers:props});
  let next=null;for(const p of pointers){if(typeof cur[p]==='function'){next=cur[p];break}}cur=next;
 }
 return {depth:nodes.length,cycle,truncated:guard>=32,nodes};
}
function resourceLoads(){
 try{
  const now=performance.now(),rows=performance.getEntriesByType('resource').filter(e=>now-Number(e.startTime||0)<=45000);
  const loadRows=rows.filter(e=>/hlgb_load_records_page|hlgb_load_bundle|\/hlgb_records(?:\?|$)/i.test(sid(e.name)));
  return {windowMs:45000,count:loadRows.length,items:loadRows.slice(-20).map(e=>({name:sid(e.name).replace(/[?#].*$/,''),startTime:Math.round(e.startTime||0),duration:Math.round(e.duration||0)}))};
 }catch(e){return {windowMs:45000,count:0,items:[],error:sid(e?.message||e)}}
}
function intervalHealth(){
 try{const s=window.hlgbRuntimeProfiler9292?.snapshot?.();if(!s)return null;const slow=(s.active||[]).filter(x=>Number(x.maxDurationMs||0)>=80||Number(x.slowFires||0)>0);const short=(s.active||[]).filter(x=>Number(x.delayMs||0)>0&&Number(x.delayMs||0)<=1000);return {activeCount:Number(s.activeCount||0),suspectCount:(s.suspect||[]).length,slowCount:slow.length,shortCount:short.length,slow:slow.slice(0,12)}}catch(e){return {error:sid(e?.message||e)}}
}
async function expectedProfiles(){if(typeof window.cloudRequest!=='function')return null;try{const out=await window.cloudRequest('rpc/hlgb_active_profile_count',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const raw=Array.isArray(out)?out[0]:out,n=Number(raw?.hlgb_active_profile_count??raw?.count??raw);return Number.isFinite(n)&&n>0?Math.floor(n):null}catch(e){return null}}
async function recentDeepRuns(){if(typeof window.cloudRequest!=='function')return [];try{const rows=await window.cloudRequest('hlgb_records?select=data,updated_at,deleted_at&module=eq.systemAuditRuns&deleted_at=is.null&order=updated_at.desc&limit=150',{method:'GET'});return (Array.isArray(rows)?rows:[]).map(x=>x?.data).filter(x=>x?.kind==='system_audit_deep'&&x?.deepVersion===DEEP_VERSION)}catch(e){return []}}
async function multiuserCheck(currentDraft){
 const [expected,rows]=await Promise.all([expectedProfiles(),recentDeepRuns()]);
 const all=[currentDraft,...rows],latest=new Map();
 for(const r of all){const k=sid(r?.profileKey);if(!k)continue;const old=latest.get(k);if(!old||sid(r?.completedAt)>sid(old?.completedAt))latest.set(k,r)}
 const vals=[...latest.values()],mismatch=vals.filter(x=>sid(x.deepBuild)!==DEEP_BUILD||sid(x.appVersion)!==sid(currentDraft.appVersion));
 if(mismatch.length)return mkCheck('deep:multiuser','fail','Perfis em versões diferentes',mismatch.length+' perfil(is) registrado(s) não coincide(m) com a versão atual.','error',{known:vals.length,expected,mismatched:mismatch.length});
 if(expected&&vals.length>=expected)return mkCheck('deep:multiuser','pass','Validação multiusuário',vals.length+' de '+expected+' perfis ativos registrados na mesma versão.','info',{known:vals.length,expected,mismatched:0});
 return mkCheck('deep:multiuser','warn','Validação multiusuário pendente',expected?vals.length+' de '+expected+' perfis ativos já passaram pelo diagnóstico profundo.':'Total de perfis ativos indisponível; validação não concluída.','warn',{known:vals.length,expected,mismatched:0});
}
async function deepChecks(startSnap){
 const checks=[],end=criticalSnapshot(),changed=Object.keys(startSnap).filter(k=>startSnap[k]!==end[k]);
 checks.push(mkCheck('deep:critical-stability',changed.length?'fail':'pass','Funções críticas durante o teste',changed.length?'Mudaram durante a auditoria: '+changed.join(', ')+'.':'Nenhuma função crítica mudou enquanto o Auditor executava.',changed.length?'error':'info',{changed}));
 const chains={recordSave:wrapperChain(window.hlgbRecordSaveWithRetry),cloudRequest:wrapperChain(window.cloudRequest)};
 const cycles=Object.entries(chains).filter(([,v])=>v.cycle),veryDeep=Object.entries(chains).filter(([,v])=>v.depth>12);
 checks.push(mkCheck('deep:wrapper-chain',cycles.length?'fail':veryDeep.length?'warn':'pass','Cadeias de wrappers',cycles.length?'Ciclo detectado em '+cycles.map(x=>x[0]).join(', ')+'.':veryDeep.length?'Cadeia muito profunda em '+veryDeep.map(x=>x[0]+' ('+x[1].depth+')').join(', ')+'.':'Sem ciclo e sem profundidade excessiva nas cadeias críticas.',cycles.length?'error':veryDeep.length?'warn':'info',{chains}));
 const loads=resourceLoads();
 checks.push(mkCheck('deep:boot-reads',loads.count>=6?'fail':loads.count>=3?'warn':'pass','Leituras amplas recentes',loads.count+' chamada(s) de carga ampla nos últimos '+Math.round(loads.windowMs/1000)+'s.',loads.count>=6?'error':loads.count>=3?'warn':'info',{loads}));
 const intervals=intervalHealth();
 if(intervals){const bad=Number(intervals.slowCount||0)>0,heavy=Number(intervals.shortCount||0)>25||Number(intervals.activeCount||0)>65;checks.push(mkCheck('deep:interval-health',bad?'fail':heavy?'warn':'pass','Timers e intervalos ativos',bad?intervals.slowCount+' timer(s) tiveram execução lenta.':heavy?'Carga alta de timers: '+intervals.activeCount+' ativos, '+intervals.shortCount+' até 1s.':'Perfil de timers sem execução lenta relevante.',bad?'error':heavy?'warn':'info',{intervals}))}
 const draft={profileKey:currentProfileKey(),deepBuild:DEEP_BUILD,appVersion:appVersion(),completedAt:new Date().toISOString()};
 checks.push(await multiuserCheck(draft));
 return checks;
}
function renderDeepPanel(deep){
 const host=document.getElementById('hlgbAuditorResult');if(!host||!deep)return;
 const old=document.getElementById('hlgbDeepAudit9373');if(old)old.remove();
 const bad=(deep.checks||[]).filter(x=>x.status!=='pass'),icon=deep.summary?.fail?'🔴':deep.summary?.warn?'🟡':'✅';
 const el=document.createElement('div');el.id='hlgbDeepAudit9373';el.className='panel';el.style.cssText='border:1px solid #d7c6d0;background:#fffafb;margin:10px 0';
 el.innerHTML='<h3 style="margin-top:0">'+icon+' Diagnóstico profundo do Auditor</h3><div class="sub">Somente leitura · '+DEEP_VERSION+'</div>'+(bad.length?bad.map(x=>'<div style="padding:6px 0"><b>'+String(x.status==='fail'?'🔴':'🟡')+' '+String(x.title||'')+'</b><div class="sub">'+String(x.detail||'')+'</div></div>').join(''):'<div style="margin-top:8px"><b>✅ Nenhuma anomalia profunda detectada neste teste.</b></div>');
 host.prepend(el);
}
async function runDeepAfter(baseRow,origin,startSnap){
 if(!baseRow)return null;
 const key=sid(baseRow.id)+'|'+origin;if(deepRecorded.has(key))return null;deepRecorded.add(key);
 const checks=await deepChecks(startSnap),row={id:'audit-deep-'+Date.now()+'-'+Math.floor(Math.random()*900000+100000),kind:'system_audit_deep',deepVersion:DEEP_VERSION,deepBuild:DEEP_BUILD,origin,readOnly:true,baseAuditId:baseRow.id||null,startedAt:new Date().toISOString(),completedAt:new Date().toISOString(),appVersion:appVersion(),browser:baseRow.browser||'',activePage:baseRow.activePage||'',profileKey:currentProfileKey(),summary:summary(checks),checks};
 try{await window.hlgbInternalAuditor?.saveRun?.(row)}catch(e){row.saveError=sid(e?.message||e)}
 renderDeepPanel(row);window.hlgbAuditorDeep9373.last=row;return row;
}
function wrapAuditAction(name,origin){const base=window[name];if(typeof base!=='function'||base.__hlgbDeep9373)return false;const w=async function(){const snap=criticalSnapshot(),row=await base.apply(this,arguments);try{await runDeepAfter(row,origin,snap)}catch(e){console.warn('[HLGB] diagnóstico profundo',e)}return row};w.__hlgbDeep9373=true;w.__original=base;window[name]=w;return true}
function installDeepAudit(){wrapAuditAction('hlgbAuditorRunFull','full');wrapAuditAction('hlgbAuditorRunVisual','visual');wrapAuditAction('hlgbAuditorRunVisualSweep','visual-sweep');return true}
window.hlgbAuditorDeep9373={version:'93.73',deepVersion:DEEP_VERSION,deepBuild:DEEP_BUILD,install:installDeepAudit,last:null,deepChecks,wrapperChain,resourceLoads,intervalHealth};

try{
 await waitReady();
 before={recordSave:window.hlgbRecordSaveWithRetry,cloudRequest:window.cloudRequest,setInterval:window.setInterval,setTimeout:window.setTimeout};
 if(!window.HLGB_RUNTIME_PERFORMANCE_9371)await load('release-runtime-performance-v9371.js');
 if(!window.HLGB_AUDITOR_SMART_9360)await load('release-auditor-smart-v9360.js');
 window.hlgbRuntimePerformance9371?.installClassifier?.();
 if(!window.HLGB_AUDITOR_SAFARI_DOWNLOAD_9368)await load('release-auditor-safari-download-v9368.js');
 if(!window.HLGB_AUDITOR_RUNTIME_FIX_9370)await load('release-auditor-runtime-fix-v9370.js');
 if(!window.HLGB_AUDITOR_RENDER_SIGNAL_9372)await load('release-auditor-render-signal-v9372.js');
 installLegacyHideCss();installSingleEntry();
 const safety={recordSave:before.recordSave===window.hlgbRecordSaveWithRetry,cloudRequest:cloudRequestIsSafe(before.cloudRequest,window.cloudRequest),setInterval:before.setInterval===window.setInterval,setTimeout:before.setTimeout===window.setTimeout};
 const changed=Object.entries(safety).filter(([,ok])=>!ok).map(([key])=>key);
 if(changed.length)throw new Error('Ativação interrompida: função crítica mudou ('+changed.join(', ')+').');
 if(window.hlgbAuditorSmart?.version!=='93.63')throw new Error('Versão inesperada do Auditor inteligente.');
 if(window.hlgbAuditorSmart?.safariDownload?.authority!=='single-manual-download')throw new Error('Entrega manual Safari não ficou ativa.');
 if(typeof window.hlgbAuditorSmart?.eventsSnapshot!=='function')throw new Error('Linha do tempo v93.70 não ficou ativa.');
 if(window.hlgbRuntimePerformance9371?.version!=='93.71')throw new Error('Correções runtime v93.71 não ficaram ativas.');
 if(window.hlgbAuditorSmart?.renderSignal9372?.version!=='93.72')throw new Error('Sinal de render v93.72 não ficou ativo.');
 installDeepAudit();
 [250,700,1500,3000].forEach(ms=>setTimeout(installDeepAudit,ms));
 window.HLGB_AUDITOR_PRODUCTION_9369=true;
 window.hlgbAuditorProduction9369={version:'93.73',active:true,safety,timeline:true,runtimeFix:true,renderSignal:true,deepDiagnostics:DEEP_VERSION,patch:'2026-10-20-deep-readonly'};
 console.info('[HLGB] Auditor de produção v93.73 ativo',safety);
}catch(e){window.HLGB_AUDITOR_PRODUCTION_9369=false;window.hlgbAuditorProduction9369={version:'93.73',active:false,error:String(e?.message||e),patch:'2026-10-20-deep-readonly'};console.error('[HLGB] Auditor de produção v93.73 não ativado',e);}finally{window.HLGB_AUDITOR_PRODUCTION_9369_LOADING=false;}
})();
