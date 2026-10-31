const {webkit,chromium}=require('playwright');
const kind=process.env.HLGB_BROWSER||'webkit';
const engine=kind==='chromium'?chromium:webkit;
(async()=>{
 const browser=await engine.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[],requests=[];
 await page.addInitScript(()=>{
  window.__hlgbDynamicScriptTrace9438=[];
  const watch=node=>{try{if(node?.tagName==='SCRIPT'){const src=String(node.src||node.getAttribute?.('src')||'');if(/(?:9369|9339|9332)\.js/i.test(src))window.__hlgbDynamicScriptTrace9438.push({src,stack:String(new Error().stack||'').slice(0,2400)})}}catch(e){}};
  const ap=Node.prototype.appendChild,ib=Node.prototype.insertBefore;
  Node.prototype.appendChild=function(node){watch(node);return ap.apply(this,arguments)};
  Node.prototype.insertBefore=function(node){watch(node);return ib.apply(this,arguments)};
 });
 page.on('pageerror',e=>errors.push(String(e.message||e)));
 page.on('request',r=>{try{requests.push(new URL(r.url()).pathname.split('/').pop())}catch(e){}});
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_SINGLE_UI_RECLAIM_9434A==='94.34a'&&typeof window.hlgbAuditorSingleAction9429?.run==='function',null,{timeout:60000});
 const pre=await page.evaluate(()=>({prod:window.HLGB_PRODUCTION_SAVE_CONFIRM_9438||null,reliability:window.HLGB_AUDITOR_RELIABILITY_9438||null,reports:window.HLGB_REPORTS_STABILITY_9438||null}));
 if(pre.prod||pre.reliability||pre.reports)throw new Error('v94.38 carregou antes da autenticação '+JSON.stringify(pre));
 await page.evaluate(()=>{
  window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'));
  const l=document.getElementById('loginScreen');if(l)l.style.setProperty('display','none','important');
  const a=document.getElementById('appShell');if(a){a.style.setProperty('display','block','important');a.style.setProperty('visibility','visible','important')}
 });
 await page.waitForFunction(()=>window.HLGB_PRODUCTION_SAVE_CONFIRM_9438==='94.38'&&window.HLGB_AUDITOR_RELIABILITY_9438==='94.38'&&window.HLGB_REPORTS_STABILITY_9438==='94.38',null,{timeout:20000});
 await page.waitForTimeout(1200);

 const lostAck=await page.evaluate(async()=>{
  const id='1793299026551',desired={id,model:'Camisola Trancada',qty:10,status:'Em produção',updatedAt:new Date().toISOString()};
  const old=new Date(Date.now()-8*60*1000).toISOString(),last=new Date(Date.now()-30*1000).toISOString();
  localStorage.setItem('hlgb_records_pending_v91',JSON.stringify({modules:{production:[{id,data:desired,createdAt:old,lastAttemptAt:last,lastError:'Timeout aguardando confirmação'}]}}));
  localStorage.setItem('hlgb_durable_wal_v1',JSON.stringify({version:1,entries:{['production|'+id]:{key:'production|'+id,opId:'test-op-9438',module:'production',id,data:desired,deleted:false,createdAt:old,updatedAt:last,attempts:17,lastAttemptAt:last,lastError:'Timeout aguardando confirmação',state:'pending'}}}));
  let reconcileCalls=0,cloudGets=0;
  window.cloudRequest=async(path,opts)=>{cloudGets++;if(!String(path).includes('hlgb_records?'))throw new Error('consulta inesperada '+path);return [{module:'production',entity_id:id,data:{...desired,updatedAt:'server-meta'},deleted_at:null,revision:3,updated_at:new Date().toISOString(),updated_by:'test'}]};
  window.hlgb955ReconcileServer=async()=>{reconcileCalls++;return true};
  window.hlgbRecordSaveWithRetry=async()=>{throw new Error('ACK HTTP perdido após commit')};
  window.hlgbProductionSaveConfirm9438.install();
  const out=await window.hlgbRecordSaveWithRetry('production',id,desired,false);
  await new Promise(r=>setTimeout(r,550));
  const q=window.hlgbAuditorReliability9438.queueDetails().find(x=>x.module==='production'&&x.id===id);
  const wal=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||'{}');
  return {out,q,reconcileCalls,cloudGets,walStillPresent:!!wal?.entries?.['production|'+id],proofs:window.hlgbProductionSaveConfirm9438.proofs().filter(x=>x.id===id).slice(-3),prodState:window.hlgbProductionSaveConfirm9438.status(),walReplay:window.hlgbWalConfirmedReplay9333?.state||null};
 });
 if(lostAck.out?.applied!==true||lostAck.out?.verifiedBy!=='v94.38')throw new Error('ACK perdido não foi recuperado por prova no servidor '+JSON.stringify(lostAck));
 if(lostAck.cloudGets<1||lostAck.reconcileCalls<1)throw new Error('confirmação não consultou servidor/delegou reconciliação '+JSON.stringify(lostAck));
 if(!lostAck.walStillPresent)throw new Error('teste detectou remoção direta da WAL antes da autoridade de reconciliação '+JSON.stringify(lostAck));
 if(!lostAck.q?.retryLoop||!(lostAck.q.ageMs>0)||lostAck.q.attempts!==17||lostAck.q.cloudVerified!==true)throw new Error('Auditor não explicou retry/idade/prova corretamente '+JSON.stringify(lostAck.q));
 if(lostAck.walReplay&&lostAck.walReplay.scheduler!=='bridge')throw new Error('replay WAL ainda tem autoridade concorrente '+JSON.stringify(lostAck.walReplay));
 if(lostAck.walReplay&&(!lostAck.walReplay.intervalSuppressed||!lostAck.walReplay.eventsSuppressed))throw new Error('timer/eventos duplicados do replay não foram suprimidos '+JSON.stringify(lostAck.walReplay));

 const reliability=await page.evaluate(()=>{
  window.HLGB_RELEASE_VERSION='94.38';
  const now=new Date(),prev=new Date(now.getTime()-1);
  const report={kind:'hlgb_auditor_daily_report',version:'94.29',date:now.toISOString().slice(0,10),health:{duplicateScripts:0,projectionOrphansUnresolved:0},intelligence:{metrics:{saveDuplicateResponsibilities:0,preAuthLoads:0},previous:{at:prev.toISOString()},current:{at:now.toISOString()},comparison:{available:true,improved:2,regressed:2}}};
  const last={at:now.toISOString(),main:{summary:{pass:76,warn:3,fail:0},operational:{summary:{pass:12,warn:0,fail:2}}}};
  const patched=window.hlgbAuditorReliability9438.patchReport(report,last,'browser-v9438');
  const retry=patched.pendingEvidence.find(x=>x.id==='1793299026551');
  const feedbackKey='retry:production|1793299026551';
  const feedback=window.hlgbAuditorReliability9438.feedback(feedbackKey,'continua');
  const feedbackRows=JSON.parse(localStorage.getItem('hlgb_auditor_feedback_v9438')||'[]');
  let currentMetrics=null;try{currentMetrics=window.hlgbAuditorIntelligence9396?.currentMetrics?.()||null}catch(e){}
  return {appVersion:patched.appVersion,auditorVersion:patched.auditorVersion,roundId:patched.roundId,breakdown:patched.resultBreakdown,retry,oldComparison:patched.intelligence.comparison,reliable:patched.reliableComparison,healthy:patched.healthyReference,feedback,feedbackStored:feedbackRows.some(x=>x.problemKey===feedbackKey&&x.value==='continua'),confidence:patched.confidence,currentMetrics};
 });
 if(reliability.appVersion!=='94.38'||!reliability.roundId)throw new Error('identidade da rodada/app inconsistente '+JSON.stringify(reliability));
 if(reliability.breakdown?.checks?.pass!==76||reliability.breakdown?.checks?.warn!==3||reliability.breakdown?.operations?.fail!==2)throw new Error('resultado Falhou não foi separado '+JSON.stringify(reliability.breakdown));
 if(reliability.oldComparison?.available!==false||reliability.oldComparison?.reason!=='baseline-too-close')throw new Error('baseline de 1ms ainda foi aceito '+JSON.stringify(reliability.oldComparison));
 if(reliability.healthy?.validated!==false)throw new Error('baseline saudável não deveria ser atualizado com pendência/falha '+JSON.stringify(reliability.healthy));
 if(!reliability.feedback||!reliability.feedbackStored)throw new Error('feedback por problema não foi persistido '+JSON.stringify(reliability));

 const reports=await page.evaluate(async()=>{
  const btn=[...document.querySelectorAll('#appShell button,aside button,nav button')].find(x=>/relat/i.test(String(x.textContent||'')));
  if(btn)btn.click();await new Promise(r=>setTimeout(r,350));
  let root=document.querySelector('#appShell .page.active,.page.active');
  if(!root){root=document.createElement('section');root.id='reports-test-v9438';root.className='page active';document.getElementById('appShell')?.appendChild(root)}
  root.style.height='320px';root.style.overflow='auto';
  const filler=document.createElement('div');filler.style.height='1200px';
  const input=document.createElement('input');input.id='hlgbReportDateTest9438';input.type='date';input.value='2026-10-31';input.style.marginTop='700px';filler.appendChild(input);root.appendChild(filler);
  root.scrollTop=437;input.focus({preventScroll:true});
  window.renderReports=function(){root.scrollTop=0;const old=document.getElementById('hlgbReportDateTest9438');if(old){const n=old.cloneNode(true);n.value='2026-01-01';old.replaceWith(n)}return true};
  window.hlgbReportsStability9438.install();
  const before=root.scrollTop;window.renderReports();await new Promise(r=>setTimeout(r,140));
  const after=root.scrollTop,active=document.activeElement;
  return {before,after,focusId:active?.id||'',value:document.getElementById('hlgbReportDateTest9438')?.value||'',status:window.hlgbReportsStability9438.status()};
 });
 if(Math.abs(reports.after-reports.before)>12||reports.focusId!=='hlgbReportDateTest9438'||reports.value!=='2026-10-31')throw new Error('Relatórios não preservou posição/foco/filtro '+JSON.stringify(reports));

 const dup={};for(const f of ['release-auditor-production-v9369.js','release-wal-replay-bridge-v9332.js','release-wal-single-authority-v9339.js'])dup[f]=requests.filter(x=>x===f).length;
 const duplicated=Object.entries(dup).filter(([,n])=>n>1);
 const trace=await page.evaluate(()=>window.__hlgbDynamicScriptTrace9438||[]);
 if(duplicated.length)throw new Error('scripts ainda carregados mais de uma vez '+JSON.stringify({dup,trace}));
 const saveDup=Number(reliability.currentMetrics?.saveChain?.duplicateResponsibilities??reliability.currentMetrics?.saveDuplicateResponsibilities??0);
 if(saveDup>0)throw new Error('responsabilidade de save ainda duplicada '+JSON.stringify({saveDup,saveChain:reliability.currentMetrics?.saveChain||null}));
 const gate=await page.evaluate(()=>window.hlgbLoginConfirmGate9407?.status?.());
 if(!gate?.productionConfirmLoaded||!gate?.auditorReliabilityLoaded||!gate?.reportsStabilityLoaded)throw new Error('gate pós-login não confirmou v94.38 '+JSON.stringify(gate));
 if(errors.some(x=>/9438|production-save-confirm|auditor-reliability|reports-stability/i.test(x)))throw new Error('pageerror v94.38 '+errors.join(' | '));
 console.log('PRODUCTION_SAVE_AUDITOR_V9438_'+kind.toUpperCase()+'_OK',JSON.stringify({lostAck:{verifiedBy:lostAck.out.verifiedBy,reconcileCalls:lostAck.reconcileCalls,retryLoop:lostAck.q.retryLoop,ageMs:lostAck.q.ageMs},reliability:{roundId:reliability.roundId,breakdown:reliability.breakdown,oldComparison:reliability.oldComparison,saveChain:reliability.currentMetrics?.saveChain||null},reports,dup,trace,gate}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
