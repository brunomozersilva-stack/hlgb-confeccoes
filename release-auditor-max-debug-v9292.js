/* HLGB v93.00 — extensão do Auditor: profiler, cadeias, soak do Hub e bundle único */
(function(){
'use strict';
const V='93.00';
const sid=v=>String(v??'');
const now=()=>new Date().toISOString();
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function fnMarkers(fn){
 if(typeof fn!=='function')return [];
 try{return Object.keys(fn).filter(k=>/^__/.test(k)).slice(0,30).map(k=>({name:k,value:typeof fn[k]==='function'?'[function]':sid(fn[k]).slice(0,160)}))}catch(e){return []}
}
function functionChain(name){
 const layers=[],seen=new Set();let fn=window[name],guard=0;
 while(typeof fn==='function'&&!seen.has(fn)&&guard++<24){
  seen.add(fn);let preview='';try{preview=Function.prototype.toString.call(fn).replace(/\s+/g,' ').slice(0,420)}catch(e){}
  layers.push({depth:layers.length,name:fn.name||'',markers:fnMarkers(fn),preview});
  fn=fn.__original||fn.__hlgbOriginal||null;
 }
 return {name,exists:layers.length>0,depth:layers.length,layers};
}
function chains(){return ['renderHubFinance','hlgbRecordSaveWithRetry','hlgbRenderIncomingRecord','editHubFinanceEntry','toggleHubFinanceEntry','deleteHubFinanceEntry','page','openModal'].map(functionChain)}
function visualPerformance(){
 const run=window.hlgbInternalAuditor?.latest?.()||null,list=Array.isArray(run?.visualSweep)?run.visualSweep:[];
 const pages=list.map(x=>({page:x.page,durationMs:Number(x.durationMs||0),maxShiftPx:Number(x.maxShiftPx||0),controls:Number(x.metrics?.controls||0),panels:Number(x.metrics?.panels||0),scrollHeight:Number(x.metrics?.scrollHeight||0)})).sort((a,b)=>b.durationMs-a.durationMs);
 return {runId:run?.id||'',appVersion:run?.appVersion||'',completedAt:run?.completedAt||'',slow:pages.filter(x=>x.durationMs>=2500),critical:pages.filter(x=>x.durationMs>=10000),top:pages.slice(0,20)};
}
function hubMetrics(){
 const h=document.getElementById('hubFinanceiro');if(!h)return {present:false};
 const r=h.getBoundingClientRect();return {present:true,active:h.classList.contains('active'),height:Math.round(r.height),scrollHeight:h.scrollHeight,nodes:h.getElementsByTagName('*').length,controls:h.querySelectorAll('button,input,select,textarea,a').length,panels:h.querySelectorAll('.panel').length,cards:h.querySelectorAll('.card').length,tables:h.querySelectorAll('table').length};
}
async function hubSoak(durationMs=8000){
 const hub=document.getElementById('hubFinanceiro');if(!hub)return {available:false,error:'hubFinanceiro não encontrado'};
 const pages=[...document.querySelectorAll('#appShell .page')],activeBefore=pages.filter(x=>x.classList.contains('active')),scroll={x:window.scrollX||0,y:window.scrollY||0};
 let mutationRecords=0,mutationCallbacks=0,maxBurst=0,lagMax=0,lagSamples=[],samples=[];const start=Date.now();
 const obs=new MutationObserver(list=>{mutationCallbacks++;mutationRecords+=list.length;maxBurst=Math.max(maxBurst,list.length)});
 try{
  obs.observe(hub,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']});
  if(!hub.classList.contains('active')){pages.forEach(x=>x.classList.remove('active'));hub.classList.add('active')}
  let expected=Date.now()+250,nextSample=0;
  while(Date.now()-start<durationMs){
   await wait(250);const n=Date.now(),lag=Math.max(0,n-expected);expected=n+250;lagMax=Math.max(lagMax,lag);if(lag>80)lagSamples.push({at:now(),lagMs:lag});
   if(n-start>=nextSample){samples.push({atMs:n-start,...hubMetrics()});nextSample+=1000}
  }
 }catch(e){return {available:true,error:sid(e?.message||e),durationMs:Date.now()-start,mutationRecords,mutationCallbacks,maxBurst,lagMaxMs:lagMax,lagSamples,samples}}
 finally{
  try{obs.disconnect()}catch(e){}
  pages.forEach(x=>x.classList.remove('active'));activeBefore.forEach(x=>x.classList.add('active'));
  try{window.scrollTo(scroll.x,scroll.y)}catch(e){}
 }
 return {available:true,durationMs:Date.now()-start,mutationRecords,mutationCallbacks,maxBurst,lagMaxMs:lagMax,lagSamples:lagSamples.slice(-40),samples};
}
function findings(parts){
 const out=[],add=(severity,code,detail)=>out.push({severity,code,detail});
 const f=parts.forensics||{};for(const x of f.redFlags||[])add(x.severity||'warn',x.code||'forensics',x.detail||'');
 for(const x of parts.visualPerformance?.critical||[])add('error','slow-page-critical',x.page+' levou '+x.durationMs+' ms no teste visual.');
 for(const x of parts.visualPerformance?.slow||[]){if((parts.visualPerformance?.critical||[]).some(y=>y.page===x.page))continue;add('warn','slow-page',x.page+' levou '+x.durationMs+' ms no teste visual.')}
 const suspect=parts.runtimeProfiler?.suspect||[];for(const x of suspect.slice(0,20)){if(x.maxDurationMs>=80)add('warn','slow-interval','Intervalo '+x.delayMs+' ms teve callback de até '+x.maxDurationMs+' ms.');}
 if((parts.soak?.lagMaxMs||0)>500)add('error','hub-soak-lag','Hub teve atraso máximo de '+parts.soak.lagMaxMs+' ms durante observação.');
 else if((parts.soak?.lagMaxMs||0)>150)add('warn','hub-soak-lag','Hub teve atraso máximo de '+parts.soak.lagMaxMs+' ms durante observação.');
 if((parts.soak?.mutationRecords||0)>250)add('warn','hub-soak-mutations','Hub recebeu '+parts.soak.mutationRecords+' mutações DOM em '+Math.round((parts.soak.durationMs||0)/1000)+'s.');
 if(parts.releaseVersion&&parts.forensics?.versions?.app&&sid(parts.releaseVersion)!==sid(parts.forensics.versions.app).replace(/^v/i,''))add('warn','version-mismatch','Versão do manifesto '+parts.releaseVersion+' difere da versão ativa '+parts.forensics.versions.app+'.');
 return out
}
async function collect(){
 const releaseVersion=sid(window.HLGB_RELEASE_VERSION||document.querySelector('#appShell .logo small')?.textContent||'').replace(/^v/i,'');
 const forensics=window.hlgbCollectHubDiagnostics?.()||null;
 const runtimeProfiler=window.hlgbRuntimeProfiler9292?.snapshot?.()||null;
 const visualPerf=visualPerformance();
 const sync=window.hlgbInternalAuditor?.buildSyncDiagnostic?await window.hlgbInternalAuditor.buildSyncDiagnostic():null;
 const soak=await hubSoak(8000);
 const data={kind:'hlgb_max_debug_bundle',version:V,generatedAt:now(),readOnly:true,credentialsIncluded:false,releaseVersion,activePage:document.querySelector('.page.active')?.id||'',forensics,runtimeProfiler,visualPerformance:visualPerf,sync,chains:chains(),soak};
 data.findings=findings(data);return data;
}
function downloadData(data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='HLGB-DEBUG-MAXIMO-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{try{URL.revokeObjectURL(a.href)}catch(e){}a.remove()},1200)}
async function runAndDownload(){
 const task=async()=>{const data=await collect();downloadData(data);return data};
 const data=window.hlgbSafetyGate9269?.auditReadOnly?await window.hlgbSafetyGate9269.auditReadOnly(task):await task();
 const errors=(data.findings||[]).filter(x=>x.severity==='error').length,warns=(data.findings||[]).filter(x=>x.severity!=='error').length;
 alert('Pacote máximo de debugging gerado.\n\nErros técnicos: '+errors+'\nAtenções: '+warns+'\nAtraso máximo no Hub: '+Math.round(data.soak?.lagMaxMs||0)+' ms\nMutações no Hub durante teste: '+(data.soak?.mutationRecords||0)+'\n\nO arquivo não inclui senhas nem tokens.');return data;
}
function inject(){
 const result=document.getElementById('hlgbAuditorResult'),root=result?.parentElement,actions=root?.querySelector('.hlgb-auditor-actions');if(!actions||root.querySelector('#hlgbAuditorMaxDebug9292'))return false;
 const b=document.createElement('button');b.id='hlgbAuditorMaxDebug9292';b.type='button';b.className='primary';b.textContent='🧬 Debug máximo (8s)';b.onclick=()=>runAndDownload().catch(e=>alert('Falha ao gerar pacote máximo.\n\n'+sid(e?.message||e)));actions.insertBefore(b,actions.firstChild);return true;
}
function scheduleInject(){setTimeout(inject,40);setTimeout(inject,220);setTimeout(inject,700)}
document.addEventListener('click',e=>{const b=e.target?.closest?.('button');if(!b)return;if(b.id==='hlgbAuditorNavBtn'||b.id==='hlgbAuditorOpenBtn'||/Auditor\s*\/\s*Testes/i.test(sid(b.textContent)))scheduleInject()},true);
setTimeout(inject,1400);setTimeout(inject,3200);
window.hlgbAuditorMaxDebug9292={version:V,collect,runAndDownload,hubSoak,chains,functionChain,visualPerformance,findings,inject};
console.info('[HLGB] Auditor Max Debug v'+V+' ativo — profiler + soak + cadeias + sync + forense');
})();
