/* HLGB Auditor v93.72 — entrega Safari + relatório diário centralizado */
(function(){
'use strict';
if(window.HLGB_AUDITOR_SAFARI_DOWNLOAD_9368)return;
window.HLGB_AUDITOR_SAFARI_DOWNLOAD_9368=true;
const HISTORY='hlgb_auditor_smart_history_v9360';
const CODE_REPORT_URL='https://raw.githubusercontent.com/brunomozersilva-stack/hlgb-confeccoes/auditor-nightly-data/latest.json';
let lastData=null,lastUrl='',lastName='',lastTestData=null,lastTestUrl='',lastTestName='',lastDailyData=null,lastDailyUrl='',lastDailyName='';
function safeData(data){try{return window.hlgbInternalAuditor?.redactDiagnostic?window.hlgbInternalAuditor.redactDiagnostic(data):data}catch(e){return data}}
function revoke(url){if(url){try{URL.revokeObjectURL(url)}catch(e){}}}
function clearProblemUrl(){revoke(lastUrl);lastUrl=''}
function clearTestUrl(){revoke(lastTestUrl);lastTestUrl=''}
function clearDailyUrl(){revoke(lastDailyUrl);lastDailyUrl=''}
function fileName(prefix){return prefix+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json'}
function prepareProblem(data){lastData=safeData(data);clearProblemUrl();const blob=new Blob([JSON.stringify(lastData,null,2)],{type:'application/json;charset=utf-8'});lastUrl=URL.createObjectURL(blob);lastName=fileName('HLGB-PROBLEMA');return {url:lastUrl,name:lastName}}
function prepareTest(data){lastTestData=safeData(data);clearTestUrl();const blob=new Blob([JSON.stringify(lastTestData,null,2)],{type:'application/json;charset=utf-8'});lastTestUrl=URL.createObjectURL(blob);lastTestName=fileName('HLGB-TESTE-SISTEMA');return {url:lastTestUrl,name:lastTestName}}
function prepareDaily(data){lastDailyData=safeData(data);clearDailyUrl();const blob=new Blob([JSON.stringify(lastDailyData,null,2)],{type:'application/json;charset=utf-8'});lastDailyUrl=URL.createObjectURL(blob);lastDailyName=fileName('HLGB-RELATORIO-DIARIO');return {url:lastDailyUrl,name:lastDailyName}}
function renderProblemReady(){const out=document.getElementById('hlgbAuditorResult');if(!out||!lastData)return false;const file=prepareProblem(lastData);out.innerHTML='<div class="panel"><b>✅ Problema registrado.</b><div class="sub">O diagnóstico está pronto. Clique abaixo para salvar o arquivo.</div><div style="margin-top:10px"><a id="hlgbSafariDownload9368" class="primary" role="button" download="'+file.name+'" href="'+file.url+'">⬇️ Baixar diagnóstico</a></div></div>';return true}
function renderTestReady(){const out=document.getElementById('hlgbAuditorResult');if(!out||!lastTestData)return false;const file=prepareTest(lastTestData),summary=lastTestData?.audit?.summary||{},pass=+summary.pass||0,warn=+summary.warn||0,fail=+summary.fail||0;out.innerHTML='<div class="panel"><b>✅ Teste concluído.</b><div class="sub">'+pass+' aprovados · '+warn+' atenções · '+fail+' falhas. O arquivo fica disponível até fechar/recarregar a página.</div><div style="margin-top:10px"><a id="hlgbSafariTestDownload9368" class="primary" role="button" download="'+file.name+'" href="'+file.url+'">⬇️ Baixar relatório do teste</a></div></div>';return true}
function renderDailyReady(){const out=document.getElementById('hlgbAuditorResult');if(!out||!lastDailyData)return false;const file=prepareDaily(lastDailyData),u=lastDailyData?.users?.summary||{},c=lastDailyData?.code?.summary||{},codeOk=lastDailyData?.codeAvailable===true;out.innerHTML='<div class="panel"><b>📅 Relatório diário pronto.</b><div class="sub">Usuários observados: '+(+u.profilesObserved||0)+'/'+(+u.profiles||0)+' · erros: '+(+u.errors||0)+' · lentidões: '+(+u.slowOperations||0)+'<br>Teste técnico: '+(codeOk?((+c.passed||0)+'/'+(+c.tests||0)+' aprovados'):'ainda indisponível')+'.</div><div style="margin-top:10px"><a id="hlgbSafariDailyDownload9368" class="primary" role="button" download="'+file.name+'" href="'+file.url+'">⬇️ Baixar relatório diário</a></div></div>';return true}
function runtimeSnapshot(){const out={};const sources={payrollRace:window.hlgbPayrollWalRace9346,payrollReliable:window.hlgbPayrollReliableSaveGuard9344,walAuthority:window.hlgbWalSingleAuthority9339,replay:window.hlgbConfirmedReplay9333,syncGuard:window.hlgbSyncGuard9306};for(const [k,v] of Object.entries(sources)){try{out[k]=typeof v?.status==='function'?v.status():{version:v?.version||v?.VERSION||''}}catch(e){out[k]={error:String(e?.message||e)}}}return out}
function pageName(){return document.querySelector('.page.active')?.id||''}
function saveHistory(row){try{const a=JSON.parse(localStorage.getItem(HISTORY)||'[]');const list=Array.isArray(a)?a:[];list.unshift(row);localStorage.setItem(HISTORY,JSON.stringify(list.slice(0,60)))}catch(e){}}
async function collectSupport(){try{return typeof window.hlgbAuditorBlackbox9299?.collect==='function'?await window.hlgbAuditorBlackbox9299.collect():null}catch(e){return {error:String(e?.message||e)}}}
async function buildProblem(){
 const smart=window.hlgbAuditorSmart;if(!smart)throw new Error('Auditor inteligente ainda não está pronto.');
 smart.push?.('problem-capture',{delivery:'manual-download'});
 let sync=null;try{sync=await window.hlgbInternalAuditor?.buildSyncDiagnostic?.()}catch(e){sync={error:String(e?.message||e)}}
 const metrics=smart.currentMetrics?.()||{},reg=smart.regression?.(metrics)||{findings:[]},ip=smart.intervalProfile?.()||{},support=await collectSupport();
 const analysis=smart.classifyProblem?.(sync,reg,ip,support)||{observed:[],probableCauses:[]};
 const timeline=typeof smart.eventsSnapshot==='function'?smart.eventsSnapshot():[];
 const data={kind:'hlgb_bug_capture',captureVersion:'93.72',createdAt:new Date().toISOString(),appVersion:String(window.HLGB_RELEASE_VERSION||''),page:pageName(),online:navigator.onLine,analysis,events:timeline,captureMeta:{timelineVersion:'93.72',windowMs:120000,eventCount:timeline.length},runtimeErrors:[...(window.hlgbInternalAuditor?.runtimeErrors||[])].slice(-40),runtime:runtimeSnapshot(),intervalProfile:ip,passivePerformance:{dom:smart.domStats||{},longTasks:[...(smart.longTasks||[])]},regression:reg,latestAudit:window.hlgbInternalAuditor?.latest?.()||null,sync,supportBlackbox:support};
 saveHistory({type:'problem',at:data.createdAt,page:data.page,result:'Problema registrado',regressions:(reg.findings||[]).length});
 return data;
}
async function buildTestReport(audit){
 const smart=window.hlgbAuditorSmart,metrics=smart?.currentMetrics?.()||{},reg=smart?.regression?.(metrics)||{findings:[]},ip=smart?.intervalProfile?.()||{};
 let sync=null;try{sync=await window.hlgbInternalAuditor?.buildSyncDiagnostic?.()}catch(e){sync={error:String(e?.message||e)}}
 let support=null;try{support=await collectSupport()}catch(e){support={error:String(e?.message||e)}}
 const analysis=smart?.classifyProblem?.(sync,reg,ip,support)||{observed:[],probableCauses:[]};
 return {kind:'hlgb_system_test_report',captureVersion:'93.72',createdAt:new Date().toISOString(),appVersion:String(window.HLGB_RELEASE_VERSION||''),page:pageName(),online:navigator.onLine,readOnly:true,audit:safeData(audit),analysis,metrics,regression:reg,runtimeErrors:[...(window.hlgbInternalAuditor?.runtimeErrors||[])].slice(-80),runtime:runtimeSnapshot(),intervalProfile:ip,passivePerformance:{dom:smart?.domStats||{},longTasks:[...(smart?.longTasks||[])]},sync,supportBlackbox:support};
}
async function fetchUserAudit(){
 if(typeof window.cloudRequest!=='function'&&typeof cloudRequest!=='function')throw new Error('Conexão privada do Auditor ainda não carregou.');
 try{if(typeof window.cloudEnsureFreshSession==='function')await window.cloudEnsureFreshSession(false);else if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false)}catch(e){}
 const call=typeof window.cloudRequest==='function'?window.cloudRequest:cloudRequest;
 const since=new Date(Date.now()-24*60*60*1000).toISOString();
 return await call('rpc/hlgb_auditor_report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_since:since})});
}
async function fetchCodeAudit(){
 const r=await fetch(CODE_REPORT_URL+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('Relatório técnico HTTP '+r.status);return await r.json();
}
async function buildDailyReport(){
 const generatedAt=new Date().toISOString();let users=null,code=null,userError='',codeError='';
 try{users=await fetchUserAudit()}catch(e){userError=String(e?.message||e)}
 try{code=await fetchCodeAudit()}catch(e){codeError=String(e?.message||e)}
 if(!users)throw new Error('Não foi possível ler o relatório privado dos usuários'+(userError?': '+userError:'')+'.');
 return safeData({schemaVersion:1,kind:'hlgb_daily_auditor_bundle',generatedAt,timezone:'America/Sao_Paulo',schedule:{userSnapshot:'17:55',technicalSuite:'18:00'},users,code,usersAvailable:true,codeAvailable:!!code,codeError:code?null:codeError||'Ainda não publicado',notes:['Relatório somente de leitura.','Ausência de observação de um perfil não significa aprovação: significa que não houve diagnóstico daquele perfil na janela.']});
}
function ensureDailyButton(){
 const actions=document.querySelector('.hlgb-auditor-actions');if(!actions||document.getElementById('hlgbDailyReport9368'))return false;
 const b=document.createElement('button');b.id='hlgbDailyReport9368';b.type='button';b.className='secondary';b.textContent='📅 Relatório diário';b.onclick=window.hlgbAuditorDailyReport9368;actions.appendChild(b);return true;
}
function installOpenHook(){
 const f=window.openHlgbAuditor;if(typeof f!=='function'||f.__hlgbDailyReport9368)return false;
 const w=function(){const out=f.apply(this,arguments);queueMicrotask(()=>ensureDailyButton());setTimeout(()=>ensureDailyButton(),80);return out};
 w.__original=f;w.__hlgbDailyReport9368=true;window.openHlgbAuditor=w;return true;
}
function install(){
 const smart=window.hlgbAuditorSmart;if(!smart)throw new Error('Auditor inteligente ainda não está pronto.');
 window.hlgbAuditorDailyReport9368=async function(){const out=document.getElementById('hlgbAuditorResult');if(out)out.innerHTML='<div class="panel"><b>Montando relatório diário…</b><div class="sub">Juntando usuários e bateria técnica das 18h.</div></div>';try{lastDailyData=await buildDailyReport();renderDailyReady();return lastDailyData}catch(e){if(out)out.innerHTML='<div class="panel"><b>Não foi possível montar o relatório diário.</b><div class="sub">'+String(e?.message||e)+'</div></div>';throw e}};
 if(!window.__hlgbSingleProblem9368){
  const wrappedProblem=async function(){const out=document.getElementById('hlgbAuditorResult');if(out)out.innerHTML='<div class="panel"><b>Preparando diagnóstico…</b><div class="sub">Aguarde alguns segundos.</div></div>';try{const data=await buildProblem();lastData=data;renderProblemReady();return data}catch(e){if(out)out.innerHTML='<div class="panel"><b>Não foi possível preparar o diagnóstico.</b><div class="sub">'+String(e?.message||e)+'</div></div>';throw e}};
  window.__hlgbSingleProblem9368=true;window.hlgbAuditorSmartProblem=wrappedProblem;smart.problem=wrappedProblem;
 }
 if(!window.__hlgbSingleTestDownload9368&&typeof window.hlgbAuditorSmartRun==='function'){
  const originalRun=window.hlgbAuditorSmartRun;
  const wrappedTest=async function(){
   const out=document.getElementById('hlgbAuditorResult');if(out)out.innerHTML='<div class="panel"><b>Executando auditoria completa…</b><div class="sub">Ao concluir, o botão para baixar o arquivo aparecerá aqui.</div></div>';
   const row=await originalRun.apply(this,arguments);
   if(!row)return row;
   try{lastTestData=await buildTestReport(row);renderTestReady()}catch(e){if(out)out.innerHTML='<div class="panel"><b>Teste concluído, mas não foi possível preparar o arquivo.</b><div class="sub">'+String(e?.message||e)+'</div></div>'}
   return row;
  };
  wrappedTest.__original=originalRun;wrappedTest.__hlgbSafariTestDownload9368=true;window.__hlgbSingleTestDownload9368=true;window.hlgbAuditorSmartRun=wrappedTest;
 }
 smart.safariDownload={version:'93.72',authority:'single-manual-download',getLast:()=>lastData,getName:()=>lastName,getLastTest:()=>lastTestData,getTestName:()=>lastTestName,getLastDaily:()=>lastDailyData,getDailyName:()=>lastDailyName,renderReady:renderProblemReady,renderTestReady,renderDailyReady,clear:()=>{lastData=null;lastName='';lastTestData=null;lastTestName='';lastDailyData=null;lastDailyName='';clearProblemUrl();clearTestUrl();clearDailyUrl()}};
 installOpenHook();ensureDailyButton();return true;
}
window.addEventListener('pagehide',()=>{clearProblemUrl();clearTestUrl();clearDailyUrl()},{once:true});
install();
console.info('[HLGB] Captura/entrega Safari v93.72 ativa com teste e relatório diário centralizado');
})();