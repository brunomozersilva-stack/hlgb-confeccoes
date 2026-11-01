/* HLGB v94.45 — análise do boot/cargas/renders com duplicidade pós-login por chamador real. */
(function(){
'use strict';
if(window.HLGB_AUDITOR_BOOT_ANALYSIS_9381)return;
const V='94.45',sid=v=>String(v??'');
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
const INTERNAL_CALLER_FRAMES=[/release-auditor-call-trace-v9380/i,/release-record-integrity\.js/i,/release-auditor-boot-analysis-v9381\.js/i];
function stackFrames(stack){return sid(stack).split('\n').map(x=>x.trim()).filter(x=>x&&!/^Error\b/i.test(x))}
function topFrame(stack){
 const frames=stackFrames(stack),external=frames.find(x=>!INTERNAL_CALLER_FRAMES.some(re=>re.test(x)));
 return external||frames.find(x=>!/release-auditor-call-trace-v9380/i.test(x))||frames[0]||'';
}
function safeEarlyBoot(){
 try{
  const x=window.hlgbSyncGuard9306?.status?.()?.earlyBoot||{},cut=window.hlgbCutViewGuard?.status?.()||{};
  const cutBlocked=Math.max(Number(x.blockedPreAuthCutSync||0),Number(cut.blockedPreAuthCutSync||window.__HLGB_PREAUTH_CUT_BLOCKED_9397||0));
  return {installs:Number(x.installs||0)+Number(cut.cutGateInstalls||0),blockedPreAuthLoads:Number(x.blockedPreAuthLoads||0),blockedPreAuthCutSync:cutBlocked,loadCoreGuarded:!!x.loadCoreGuarded,loadBundleGuarded:!!x.loadBundleGuarded,cutSyncGuarded:!!(x.cutSyncGuarded||cut.guarded),sessionRestoreLoadsAllowed:x.sessionRestoreLoadsAllowed!==false,lastInstall:sid(x.lastInstall||'')};
 }catch(e){return {installs:0,blockedPreAuthLoads:0,blockedPreAuthCutSync:Number(window.__HLGB_PREAUTH_CUT_BLOCKED_9397||0),loadCoreGuarded:false,loadBundleGuarded:false,cutSyncGuarded:false,sessionRestoreLoadsAllowed:true,lastInstall:''}}
}
function analyze(){
 const timeline=window.hlgbBootTimeline9379?.snapshot?.()||null,trace=window.hlgbAuditorCallTrace9380?.snapshot?.()||null;
 if(!timeline||!trace)return {kind:'hlgb_boot_analysis',version:V,status:'unavailable',reason:'Linha do tempo ou rastreamento de chamadas indisponível.',timeline:!!timeline,trace:!!trace};
 const starts=(trace.events||[]).filter(e=>/:start$/.test(e.type)),returns=(trace.events||[]).filter(e=>/:return$/.test(e.type));
 const calls=[];for(const s of starts){const r=returns.find(x=>x.name===s.name&&x.seq>s.seq);calls.push({name:s.name,kind:s.type.split(':')[0],atMs:s.monoMs,authReady:s.authReady,sessionRestoring:!!s.sessionRestoring,activePage:s.activePage,appVisible:s.appVisible,blockedByEarlyGate:!!(s.data?.blockedByEarlyGate||r?.data?.blockedByEarlyGate),caller:topFrame(s.data?.stack),syncDurationMs:Number(r?.data?.syncDurationMs||0)})}
 const loads=calls.filter(x=>x.kind==='load'||x.kind==='boot'),renders=calls.filter(x=>x.kind==='render');
 const group=list=>{const m=new Map();for(const x of list){const k=x.name;const a=m.get(k)||{name:k,count:0,preAuth:0,restoring:0,unsafePreAuth:0,hidden:0,blocked:0,totalSyncMs:0,maxSyncMs:0,callers:new Set()};a.count++;if(!x.authReady)a.preAuth++;if(!x.authReady&&x.sessionRestoring)a.restoring++;if(!x.authReady&&!x.sessionRestoring)a.unsafePreAuth++;if(!x.appVisible&&!x.blockedByEarlyGate)a.hidden++;if(x.blockedByEarlyGate)a.blocked++;a.totalSyncMs+=x.syncDurationMs;a.maxSyncMs=Math.max(a.maxSyncMs,x.syncDurationMs);if(x.caller)a.callers.add(x.caller);m.set(k,a)}return [...m.values()].map(x=>({...x,totalSyncMs:+x.totalSyncMs.toFixed(2),maxSyncMs:+x.maxSyncMs.toFixed(2),callers:[...x.callers].slice(0,6)})).sort((a,b)=>b.totalSyncMs-a.totalSyncMs||b.count-a.count)};
 const duplicateGroups=(()=>{
  const m=new Map(),eligible=loads.filter(x=>x.authReady&&!x.sessionRestoring&&x.caller);
  for(const x of eligible){const k=x.name+'\n'+x.caller,a=m.get(k)||{name:x.name,caller:x.caller,count:0,totalSyncMs:0,maxSyncMs:0,firstAtMs:x.atMs,lastAtMs:x.atMs};a.count++;a.totalSyncMs+=x.syncDurationMs;a.maxSyncMs=Math.max(a.maxSyncMs,x.syncDurationMs);a.firstAtMs=Math.min(a.firstAtMs,x.atMs);a.lastAtMs=Math.max(a.lastAtMs,x.atMs);m.set(k,a)}
  return [...m.values()].filter(x=>x.count>=2).map(x=>({...x,totalSyncMs:+x.totalSyncMs.toFixed(2),maxSyncMs:+x.maxSyncMs.toFixed(2)})).sort((a,b)=>b.count-a.count||b.totalSyncMs-a.totalSyncMs);
 })();
 const loadGroups=group(loads),renderGroups=group(renders),unsafePreAuth=loads.filter(x=>!x.authReady&&!x.sessionRestoring),restoringLoads=loads.filter(x=>!x.authReady&&x.sessionRestoring),hiddenRenders=renders.filter(x=>!x.appVisible&&!x.blockedByEarlyGate),blockedCutCalls=renders.filter(x=>x.blockedByEarlyGate),slow=calls.filter(x=>x.syncDurationMs>=80),protectedEarly=safeEarlyBoot();
 const preGap=Number(timeline.coverage?.preInstrumentationGapMs||0),measured=timeline.coverage?.preInstrumentationMeasured!==false;
 let status='pass';const reasons=[],notes=[];
 if(preGap>0&&!measured){status='warn';reasons.push('Existe trecho inicial conhecido, mas não instrumentado ('+preGap+' ms).')}
 if(unsafePreAuth.length){status='fail';reasons.push(unsafePreAuth.length+' carga(s) ocorreram sem autenticação nem restauração de sessão validada.')}
 if(restoringLoads.length)notes.push(restoringLoads.length+' carga(s) ocorreram durante restauração autenticada da sessão; são necessárias para abrir os dados antes de exibir o sistema e não contam como duplicidade pós-login.')
 if(hiddenRenders.length){if(status==='pass')status='warn';reasons.push(hiddenRenders.length+' renderização(ões) executaram com o aplicativo oculto.')}
 if(blockedCutCalls.length)notes.push(blockedCutCalls.length+' tentativa(s) de corte→produção foram bloqueadas com segurança antes da interface autenticada.')
 if(duplicateGroups.length){if(status==='pass')status='warn';reasons.push(duplicateGroups.length+' grupo(s) de carga pós-login repetiram a mesma função pelo mesmo chamador; revisar retry/paginação desse chamador.')}
 if(slow.length){if(status==='pass')status='warn';reasons.push(slow.length+' chamada(s) síncrona(s) >=80 ms.')}
 const normalizedRaw=calls.slice(-120).map(x=>({...x,observedAuthReady:x.authReady,observedAppVisible:x.appVisible,authReady:x.authReady||x.sessionRestoring,appVisible:x.appVisible||x.blockedByEarlyGate}));
 return {kind:'hlgb_boot_analysis',version:V,status,reasons,notes,timeline:{session:timeline.session,startedWall:timeline.startedWall,installedWall:timeline.installedWall,coverage:timeline.coverage,authReady:timeline.authReady,resourceCount:timeline.resourceCount},trace:{wrapped:trace.wrapped,eventCount:trace.eventCount},protectedEarly,summary:{calls:calls.length,loads:loads.length,renders:renders.length,preAuthLoads:unsafePreAuth.length,sessionRestoreLoads:restoringLoads.length,hiddenRenders:hiddenRenders.length,blockedPreAuthLoads:protectedEarly.blockedPreAuthLoads,blockedPreAuthCutSync:Math.max(protectedEarly.blockedPreAuthCutSync,blockedCutCalls.length),duplicateLoadGroups:duplicateGroups.length,slowSyncCalls:slow.length},duplicateGroups,loads:loadGroups,renders:renderGroups,slow:calls.filter(x=>x.syncDurationMs>=80).slice(0,30),unsafePreAuthCalls:unsafePreAuth.slice(0,30),sessionRestoreCalls:restoringLoads.slice(0,30),blockedCalls:blockedCutCalls.slice(0,30),rawCalls:normalizedRaw}
}
function fileStamp(){return new Date().toISOString().replace(/[:.]/g,'-')}
function download(report){
 try{
  const r=report||analyze(),payload={exportedAt:new Date().toISOString(),source:'HLGB Auditor Boot/Cargas',report:r};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='hlgb-boot-cargas-'+sid(r?.timeline?.session||'sessao')+'-'+fileStamp()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;
 }catch(e){console.warn('[HLGB] não foi possível baixar relatório de boot/cargas',e);return false}
}
function render(){
 const report=analyze(),host=document.getElementById('hlgbAuditorResult');if(!host)return report;
 document.getElementById('hlgbBootAnalysis9381')?.remove();
 const el=document.createElement('div');el.id='hlgbBootAnalysis9381';el.className='panel';el.style.cssText='border:1px solid #c9bfd0;background:#fbfcff;margin:10px 0';
 if(report.status==='unavailable'){el.innerHTML='<h3 style="margin-top:0">🚦 Boot / cargas / renders</h3><div class="sub">⚪ Não medido: '+esc(report.reason)+'</div>';host.prepend(el);return report}
 const icon=report.status==='fail'?'🔴':report.status==='warn'?'🟡':'✅';
 const loadRows=(report.loads||[]).slice(0,10).map(x=>'<div style="padding:6px 0;border-top:1px solid #eee"><b>'+esc(x.name)+'</b> · '+x.count+' chamada(s) · '+x.totalSyncMs+' ms sync<div class="sub">pré-login inseguro: '+x.unsafePreAuth+' · restauração autenticada: '+x.restoring+' · app oculto: '+x.hidden+' · pico: '+x.maxSyncMs+' ms</div><div class="sub">origens reais: '+esc((x.callers||[]).join(' | ')||'não identificada')+'</div></div>').join('');
 const duplicateRows=(report.duplicateGroups||[]).slice(0,10).map(x=>'<div style="padding:6px 0;border-top:1px solid #eee"><b>'+esc(x.name)+'</b> · '+x.count+' chamada(s) pós-login pelo mesmo chamador<div class="sub">origem real: '+esc(x.caller)+' · pico: '+x.maxSyncMs+' ms</div></div>').join('');
 const renderRows=(report.renders||[]).slice(0,10).map(x=>'<div style="padding:6px 0;border-top:1px solid #eee"><b>'+esc(x.name)+'</b> · '+x.count+' chamada(s) · executadas ocultas: '+x.hidden+' · bloqueadas: '+x.blocked+' · '+x.totalSyncMs+' ms sync<div class="sub">origem: '+esc(x.callers[0]||'não identificada')+'</div></div>').join('');
 const protectedText=(report.summary.blockedPreAuthLoads||report.summary.blockedPreAuthCutSync)?'<div class="sub" style="margin-top:6px">🛡️ Bloqueadas com segurança: '+report.summary.blockedPreAuthLoads+' carga(s) · '+report.summary.blockedPreAuthCutSync+' corte→produção.</div>':'';
 el.innerHTML='<h3 style="margin-top:0">'+icon+' Boot / cargas / renders</h3><div class="sub">v'+V+' · sessão '+esc(report.timeline.session)+'</div><div style="margin:8px 0"><b>Resumo:</b> '+report.summary.loads+' cargas · '+report.summary.renders+' renders · '+report.summary.preAuthLoads+' cargas inseguras · '+report.summary.sessionRestoreLoads+' cargas de restauração autenticada · '+report.summary.duplicateLoadGroups+' grupo(s) repetido(s) pós-login · '+report.summary.hiddenRenders+' renders ocultos executados</div>'+protectedText+(report.reasons||[]).map(x=>'<div class="sub">• '+esc(x)+'</div>').join('')+(report.notes||[]).map(x=>'<div class="sub">ℹ️ '+esc(x)+'</div>').join('')+'<div style="margin:10px 0"><button id="hlgbBootDownload9381" class="secondary" type="button">⬇️ Baixar relatório completo</button></div>'+(duplicateRows?'<h4>Duplicidades pós-login pelo mesmo chamador</h4>'+duplicateRows:'')+'<h4>Cargas por origem</h4>'+loadRows+'<h4>Renderizações</h4>'+renderRows;
 el.querySelector('#hlgbBootDownload9381')?.addEventListener('click',()=>download(report));
 host.prepend(el);return report;
}
function decorate(){
 const actions=document.querySelector('.hlgb-auditor-actions');if(!actions)return false;
 let tools=document.getElementById('hlgbBootTools9381');if(!tools){tools=document.createElement('div');tools.id='hlgbBootTools9381';tools.style.cssText='margin-top:8px';actions.insertAdjacentElement('afterend',tools)}
 let b=document.getElementById('hlgbBootAnalysisBtn9381');if(!b){b=document.createElement('button');b.id='hlgbBootAnalysisBtn9381';b.type='button';b.className='secondary';b.textContent='🚦 Boot / cargas';b.onclick=()=>{window.hlgbAuditorBootAnalysis9381.last=render()};tools.appendChild(b)}
 tools.hidden=false;tools.removeAttribute('data-hlgb-auditor-hidden');b.hidden=false;b.removeAttribute('data-hlgb-auditor-hidden');return true;
}
function expose(){if(window.hlgbAuditorDeep9373)window.hlgbAuditorDeep9373.bootAnalysis=analyze;if(window.hlgbAuditorAuthority9374)window.hlgbAuditorAuthority9374.bootAnalysis=analyze;decorate()}
function loadCurrentShell(){
 if(window.HLGB_AUDITOR_SHELL_9382||document.querySelector('script[data-hlgb-auditor-shell="9382"]'))return;
 const s=document.createElement('script');s.src='./release-auditor-shell-v9382.js?fresh='+Date.now();s.async=false;s.dataset.hlgbAuditorShell='9382';s.onerror=()=>console.warn('[HLGB] shell do Auditor v93.82 não carregou');(document.head||document.documentElement).appendChild(s);
}
document.addEventListener?.('click',e=>{if(e.target?.closest?.('#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn'))[100,300,800,1500].forEach(ms=>setTimeout(()=>{decorate();if(ms===800)render()},ms))},true);
window.HLGB_AUDITOR_BOOT_ANALYSIS_9381=V;window.hlgbAuditorBootAnalysis9381={version:V,analyze,render,decorate,download,last:null};
[0,300,900,1800,3500].forEach(ms=>setTimeout(expose,ms));
loadCurrentShell();
console.info('[HLGB] análise de boot/cargas/renders v'+V+' ativa · restauração separada de duplicidade pós-login por chamador real');
})();
