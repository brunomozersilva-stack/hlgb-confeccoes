const {webkit,chromium}=require('playwright');
const kind=process.env.HLGB_BROWSER||'webkit',engine=kind==='chromium'?chromium:webkit;
(async()=>{
 const browser=await engine.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[],requests=[];
 await page.addInitScript(()=>{
  window.__hlgbDynamicScriptTrace9439=[];
  const watch=node=>{try{if(node?.tagName==='SCRIPT'){const src=String(node.src||node.getAttribute?.('src')||'');if(/9339\.js/i.test(src))window.__hlgbDynamicScriptTrace9439.push({src,stack:String(new Error().stack||'').slice(0,2000)})}}catch(e){}};
  const ap=Node.prototype.appendChild,ib=Node.prototype.insertBefore;
  Node.prototype.appendChild=function(node){watch(node);return ap.apply(this,arguments)};
  Node.prototype.insertBefore=function(node){watch(node);return ib.apply(this,arguments)};
 });
 page.on('pageerror',e=>errors.push(String(e.message||e)));
 page.on('request',r=>{try{requests.push(new URL(r.url()).pathname.split('/').pop())}catch(e){}});
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_SINGLE_UI_RECLAIM_9434A==='94.34a'&&typeof window.hlgbAuditorSingleAction9429?.run==='function',null,{timeout:60000});
 const pre=await page.evaluate(()=>({reconcile:window.HLGB_PRODUCTION_RECONCILE_9439||null,post:window.HLGB_PRODUCTION_POSTSAVE_9439||null,finalizer:window.HLGB_AUDITOR_FINALIZE_9439||null}));
 if(pre.reconcile||pre.post||pre.finalizer)throw new Error('v94.39 carregou antes do login '+JSON.stringify(pre));
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'));const l=document.getElementById('loginScreen');if(l)l.style.setProperty('display','none','important');const a=document.getElementById('appShell');if(a){a.style.setProperty('display','block','important');a.style.setProperty('visibility','visible','important')}});
 await page.waitForFunction(()=>window.HLGB_PRODUCTION_RECONCILE_9439==='94.39'&&window.HLGB_PRODUCTION_POSTSAVE_9439==='94.39'&&window.HLGB_AUDITOR_FINALIZE_9439==='94.39',null,{timeout:20000});
 await page.waitForTimeout(900);

 const production=await page.evaluate(async()=>{
  const id='test-production-9439',now=new Date(),old=new Date(now.getTime()-120000).toISOString();
  const desired={id,op:'PED-TEST-9439',date:'2026-10-31',done:0,size:'',color:'',cutId:'cut-9439',stage:'Aguardando atribuição',client:'Click Sophia',orderId:'order-9439',planned:740,product:'Tanga Katerine',factionId:null,productId:'prod-9439',updatedAt:old,assignedAt:'',cutProductKey:'cut-9439:prod-9439',sentToFactionAt:'',assignmentSource:true,cutEffectiveQtyV9240:true,cutEffectiveQtyV9246:true,cutQuantityLinkedV9246:true,productionLocationId:null};
  const base={...desired};
  const serverData={...desired};delete serverData.productionLocationId;delete serverData.updatedAt;
  localStorage.setItem('hlgb_records_pending_v91',JSON.stringify({modules:{production:[{id,data:desired,createdAt:old,baseData:base,baseUpdatedAt:old}]}}));
  const wal={key:'production|'+id,opId:'op-test-9439',module:'production',id,data:desired,deleted:false,createdAt:old,updatedAt:old,attempts:22,lastAttemptAt:old,lastError:'Supabase não confirmou a alteração.',state:'pending',baseData:base,baseUpdatedAt:old};
  localStorage.setItem('hlgb_durable_wal_v1',JSON.stringify({version:1,entries:{[wal.key]:wal}}));
  await new Promise(resolve=>{const r=indexedDB.open('hlgb_durable_wal');r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('entries'))d.createObjectStore('entries',{keyPath:'key'})};r.onsuccess=()=>{const d=r.result,tx=d.transaction('entries','readwrite');tx.objectStore('entries').put(wal);tx.oncomplete=()=>{d.close();resolve()};tx.onerror=()=>{d.close();resolve()}};r.onerror=()=>resolve()});
  const realCloud=window.cloudRequest;window.cloudRequest=async path=>{if(String(path).includes('entity_id=eq.'+encodeURIComponent(id)))return [{module:'production',entity_id:id,data:serverData,deleted_at:null,revision:9,updated_at:new Date().toISOString(),updated_by:'test'}];return realCloud?realCloud(path,{method:'GET'}):[]};
  const semantic=window.hlgbProductionReconcile9439.productionEquivalent(desired,serverData);
  const result=await window.hlgbProductionReconcile9439.reconcile('browser-test');
  await new Promise(r=>setTimeout(r,120));
  const pending=JSON.parse(localStorage.getItem('hlgb_records_pending_v91')||'{"modules":{}}'),walAfter=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||'{"entries":{}}');
  const idbLeft=await new Promise(resolve=>{const r=indexedDB.open('hlgb_durable_wal');r.onsuccess=()=>{const d=r.result;if(!d.objectStoreNames.contains('entries')){d.close();resolve(false);return}const tx=d.transaction('entries','readonly'),g=tx.objectStore('entries').get('production|'+id);g.onsuccess=()=>{const v=!!g.result;d.close();resolve(v)};g.onerror=()=>{d.close();resolve(false)}};r.onerror=()=>resolve(false)});
  return {semantic,result,pendingLeft:(pending.modules?.production||[]).some(x=>String(x.id)===id),walLeft:!!walAfter.entries?.['production|'+id],idbLeft,status:window.hlgbProductionReconcile9439.status()};
 });
 if(!production.semantic)throw new Error('null e campo ausente ainda não são equivalentes na Produção '+JSON.stringify(production));
 if(production.pendingLeft||production.walLeft||production.idbLeft)throw new Error('fila confirmada não foi reconciliada nas três fontes '+JSON.stringify(production));
 if(!(production.status.confirmed>=1))throw new Error('nenhuma prova remota foi registrada '+JSON.stringify(production));

 const postSave=await page.evaluate(async()=>{
  let calls=0;const api=window.hlgbProductionReconcile9439,real=api.reconcile;api.reconcile=async reason=>{calls++;return {reason}};
  window.hlgbRecordSaveWithRetry=async()=>({applied:false,reason:'teste'});window.hlgbProductionPostSave9439.install();await window.hlgbRecordSaveWithRetry('production','post-9439',{id:'post-9439'},false);await new Promise(r=>setTimeout(r,260));api.reconcile=real;return {calls,status:window.hlgbProductionPostSave9439.status()};
 });
 if(postSave.calls<1)throw new Error('pós-save não chamou reconciliação rápida '+JSON.stringify(postSave));

 const finalizer=await page.evaluate(()=>{
  window.HLGB_RELEASE_VERSION='94.39';
  const now=new Date(),future=new Date(now.getTime()+32*24*3600000),baseline=new Date(now.getTime()-1);
  localStorage.setItem('hlgb_auditor_reliable_rounds_v9438',JSON.stringify([{roundId:'future',at:future.toISOString()}]));
  localStorage.setItem('hlgb_auditor_learning_history_v9429',JSON.stringify([{at:future.toISOString(),appVersion:'93.50'}]));
  const report={kind:'hlgb_auditor_daily_report',version:'94.29',appVersion:'94.29',date:'2026-10-31',createdAt:now.toISOString(),metrics:{at:now.toISOString()},regression:{baseline:{at:baseline.toISOString(),version:'94.38'},findings:[{x:1}]},latestAudit:{startedAt:future.toISOString(),completedAt:future.toISOString(),appVersion:'93.50'}};
  const fixed=window.hlgbAuditorFinalize9439.finalizeDaily(report);window.hlgbAuditorFinalize9439.pruneFutureHistory();
  return {fixed,rounds:JSON.parse(localStorage.getItem('hlgb_auditor_reliable_rounds_v9438')||'[]'),history:JSON.parse(localStorage.getItem('hlgb_auditor_learning_history_v9429')||'[]'),status:window.hlgbAuditorFinalize9439.status()};
 });
 if(finalizer.fixed.appVersion!=='94.39'||finalizer.fixed.version!=='94.39')throw new Error('relatório ainda baixa com versão antiga '+JSON.stringify(finalizer.fixed));
 if(finalizer.fixed.regression?.baseline!==null||finalizer.fixed.regression?.reason!=='baseline-same-round')throw new Error('baseline da mesma rodada ainda foi aceito '+JSON.stringify(finalizer.fixed.regression));
 if(finalizer.fixed.latestAudit!==null||!finalizer.fixed.latestAuditRejected)throw new Error('auditoria futura ainda participou do relatório '+JSON.stringify(finalizer.fixed.latestAudit));
 if(finalizer.rounds.length||finalizer.history.length)throw new Error('histórico futuro não foi podado '+JSON.stringify({rounds:finalizer.rounds,history:finalizer.history}));

 const raw9339=requests.filter(x=>x==='release-wal-single-authority-v9339.js').length,trace=await page.evaluate(()=>window.__hlgbDynamicScriptTrace9439||[]);
 if(raw9339>1)throw new Error('v9339 ainda foi requisitado mais de uma vez '+JSON.stringify({raw9339,trace}));
 if(trace.length)throw new Error('Safari/loader ainda injetou v9339 dinamicamente '+JSON.stringify(trace));
 const gate=await page.evaluate(()=>window.hlgbLoginConfirmGate9407?.status?.());
 if(!gate?.productionReconcileLoaded||!gate?.productionPostSaveLoaded||!gate?.auditorFinalizerLoaded)throw new Error('gate não confirmou v94.39 '+JSON.stringify(gate));
 const visible=await page.evaluate(()=>{const vis=e=>{if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};const h=document.querySelector('.hlgb-auditor-actions');return h?[...h.querySelectorAll(':scope>button')].filter(vis).map(x=>x.id):[]});
 if(visible.length!==1||visible[0]!=='hlgbAuditorUnifiedRun9434A')throw new Error('Auditor deixou de ter um botão '+JSON.stringify(visible));
 if(errors.some(x=>/9439|production-reconcile|auditor-finalize/i.test(x)))throw new Error('pageerror v94.39 '+errors.join(' | '));
 console.log('PRODUCTION_AUDITOR_V9439_'+kind.toUpperCase()+'_OK',JSON.stringify({production,postSave,finalizer:{appVersion:finalizer.fixed.appVersion,baselineReason:finalizer.fixed.regression.reason,futureRejected:!!finalizer.fixed.latestAuditRejected},raw9339,gate,visible}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
