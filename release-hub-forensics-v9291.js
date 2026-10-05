/* HLGB v92.92 — Forense leve do Hub/Auditor: erros, travamentos, DOM, sync e linha do tempo */
(function(){
'use strict';
const V='92.92';
const MAX_EVENTS=300, MAX_ERRORS=80, MAX_LONG=80;
const events=[], errors=[], longTasks=[];
let lastBeat=Date.now(), lastLag=0, maxLag=0, mutationTotal=0, mutationBurst=0, mutationFlush=null, hubObserver=null;
const sid=v=>String(v??'');
const now=()=>new Date().toISOString();
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}try{return window.db||null}catch(e){return null}}
function push(list,item,max){list.push(item);if(list.length>max)list.splice(0,list.length-max)}
function event(type,detail){push(events,{at:now(),type,...(detail||{})},MAX_EVENTS)}
function safeMessage(v){return sid(v?.message||v||'').slice(0,1200)}
function safeStack(v){return sid(v?.stack||'').slice(0,3500)}
function recordError(type,message,stack,file,line,col){push(errors,{at:now(),type,message:safeMessage(message),stack:safeStack(stack),file:sid(file||'').slice(0,300),line:Number(line||0),col:Number(col||0)},MAX_ERRORS)}
window.addEventListener('error',e=>recordError('error',e?.message,e?.error,e?.filename,e?.lineno,e?.colno),true);
window.addEventListener('unhandledrejection',e=>recordError('unhandledrejection',e?.reason,e?.reason),true);
window.addEventListener('hlgb:hub-debug',e=>event('hub-debug',e?.detail||{}));
document.addEventListener('hlgb:hub-finance-changed',e=>event('hub-finance-changed',{source:sid(e?.detail?.source||''),id:sid(e?.detail?.id||'')}));
window.addEventListener('hlgb:hub-sync-warning',e=>event('hub-sync-warning',{id:sid(e?.detail?.id||''),deleted:!!e?.detail?.deleted,error:safeMessage(e?.detail?.error)}));
window.addEventListener('online',()=>event('network',{online:true}));
window.addEventListener('offline',()=>event('network',{online:false}));
document.addEventListener('visibilitychange',()=>event('visibility',{state:document.visibilityState}));
window.addEventListener('pageshow',e=>event('pageshow',{persisted:!!e?.persisted}));
function isHubVisible(){const p=document.getElementById('hubFinanceiro');return !!p&&(p.classList.contains('active')||p.offsetParent!==null)}
function startMutationObserver(){
 const hub=document.getElementById('hubFinanceiro');
 if(!hub||hubObserver)return false;
 try{
   hubObserver=new MutationObserver(list=>{
     const n=list.length;mutationTotal+=n;mutationBurst+=n;
     clearTimeout(mutationFlush);
     mutationFlush=setTimeout(()=>{if(mutationBurst>20)event('hub-mutation-burst',{mutations:mutationBurst});mutationBurst=0},350);
   });
   hubObserver.observe(hub,{childList:true,subtree:true});return true;
 }catch(e){return false}
}
function stopMutationObserver(){try{hubObserver?.disconnect()}catch(e){}hubObserver=null}
setInterval(()=>{
 const n=Date.now(),lag=Math.max(0,n-lastBeat-2000);lastBeat=n;lastLag=lag;maxLag=Math.max(maxLag,lag);
 if(lag>350)event('event-loop-lag',{lagMs:lag,hubVisible:isHubVisible()});
 if(isHubVisible())startMutationObserver();else stopMutationObserver();
},2000);
try{
 if(typeof PerformanceObserver==='function'&&PerformanceObserver.supportedEntryTypes?.includes?.('longtask')){
   const po=new PerformanceObserver(list=>{for(const x of list.getEntries()){const row={at:now(),startTime:+x.startTime.toFixed(1),durationMs:+x.duration.toFixed(1),name:sid(x.name)};push(longTasks,row,MAX_LONG);if(x.duration>=100)event('longtask',row)}});
   po.observe({type:'longtask',buffered:true});
 }
}catch(e){}
function storageInfo(){
 const out={totalBytes:0,keys:[]};
 try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i),v=localStorage.getItem(k)||'',bytes=(k.length+v.length)*2;out.totalBytes+=bytes;out.keys.push({key:k,bytes})}}catch(e){out.error=safeMessage(e)}
 out.keys.sort((a,b)=>b.bytes-a.bytes);out.keys=out.keys.slice(0,40);return out
}
function readJson(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch(e){return null}}
function pendingInfo(){
 const src=readJson('hlgb_records_pending_v91'),modules={},items=[];let count=0,oldest=null;
 for(const [module,ops] of Object.entries(src?.modules||{})){
   const a=Array.isArray(ops)?ops:[];modules[module]=a.length;count+=a.length;
   for(const op of a){const ts=Number(op?.__hlgb_pending_at||op?.queuedAt||0);if(ts&&(!oldest||ts<oldest))oldest=ts;items.push({module,id:sid(op?.id||''),deleted:!!op?.deleted,ageMs:ts?Date.now()-ts:null})}
 }
 return {count,modules,oldestAt:oldest?new Date(oldest).toISOString():null,oldestAgeMs:oldest?Date.now()-oldest:null,items:items.slice(0,120)}
}
function walInfo(){
 const src=readJson('hlgb_durable_wal_v1'),byModule={};let count=0;
 for(const e of Object.values(src?.entries||{})){const m=sid(e?.module||'desconhecido');byModule[m]=(byModule[m]||0)+1;count++}
 return {count,byModule}
}
function domInfo(){
 const hub=document.getElementById('hubFinanceiro'),allIds={},dups=[];
 for(const el of document.querySelectorAll('[id]')){if(!el.id)continue;allIds[el.id]=(allIds[el.id]||0)+1}
 for(const [id,n] of Object.entries(allIds))if(n>1)dups.push({id,count:n});
 const r=hub?.getBoundingClientRect?.();
 const fixed=[];
 try{for(const el of document.querySelectorAll('body *')){const st=getComputedStyle(el);if((st.position==='fixed'||st.position==='sticky')&&st.display!=='none'&&st.visibility!=='hidden'){const z=parseInt(st.zIndex,10);if((Number.isFinite(z)&&z>=1000)||st.position==='fixed')fixed.push({id:el.id||'',tag:el.tagName,className:sid(el.className).slice(0,120),position:st.position,zIndex:st.zIndex})}if(fixed.length>=50)break}}catch(e){}
 return {
   documentNodes:document.getElementsByTagName('*').length,
   documentScrollHeight:document.documentElement?.scrollHeight||0,
   hubPresent:!!hub,hubVisible:isHubVisible(),hubHeight:r?Math.round(r.height):0,hubScrollHeight:hub?.scrollHeight||0,
   hubNodes:hub?hub.getElementsByTagName('*').length:0,
   hubPanels:hub?hub.querySelectorAll('.panel').length:0,
   hubCards:hub?hub.querySelectorAll('.card').length:0,
   hubControls:hub?hub.querySelectorAll('button,input,select,textarea,a').length:0,
   duplicateIds:dups.slice(0,80),fixedLayers:fixed,
   editorOpen:!!document.getElementById('hlgbHubEditor9270'),modalOpen:!![...document.querySelectorAll('#modal,.modal,.modalbox')].find(x=>{try{return getComputedStyle(x).display!=='none'&&x.getBoundingClientRect().width>0}catch(e){return false}})
 }
}
function dbInfo(){
 const d=dbRef()||{},names=['hubFinanceEntries','factionPayments','purchases','supplierDebts','supplierDebtTransactions','finance','employees','orders','factions'];const counts={};
 for(const n of names)counts[n]=Array.isArray(d[n])?d[n].length:0;
 const hub=Array.isArray(d.hubFinanceEntries)?d.hubFinanceEntries:[];let newest='';for(const x of hub){const t=sid(x?.updatedAt||x?.updated_at||x?.createdAt||'');if(t>newest)newest=t}
 return {counts,hubNewestAt:newest}
}
function scriptInfo(){return [...document.scripts].map((s,i)=>({index:i,src:s.src||'[inline]'})).filter(x=>/hlgb|release-|app9240/i.test(x.src)).slice(-180)}
function resourceInfo(){
 try{return performance.getEntriesByType('resource').filter(x=>/\.js(?:\?|$)|app9240/i.test(x.name)).map(x=>({name:x.name.split('/').pop(),durationMs:+x.duration.toFixed(1),transferSize:Number(x.transferSize||0),decodedBodySize:Number(x.decodedBodySize||0)})).sort((a,b)=>b.durationMs-a.durationMs).slice(0,40)}catch(e){return []}
}
function versions(){return {
 app:sid(window.HLGB_RELEASE_VERSION||document.querySelector('#appShell .logo small')?.textContent||''),
 master:sid(window.hlgbHubMaster9258?.version||window.HLGB_HUB_MASTER_ACTIVE_9258||''),
 integrity:sid(window.HLGB_HUB_INTEGRITY_GUARD||''),editor:sid(window.hlgbHubEditor9270?.version||''),guard:sid(window.hlgbHubEditor9267?.version||''),live:sid(window.hlgbHubLiveRefresh9289?.version||''),financeLocations:sid(window.HLGB_FINANCE_LOCATIONS_GUARD||''),auditor:sid(window.hlgbInternalAuditor?.VERSION||'')
}}
function redFlags(dom,pending,storage){
 const out=[];const add=(code,severity,detail)=>out.push({code,severity,detail});
 if(dom.hubHeight>5000)add('hub-height','warn','Hub com '+dom.hubHeight+'px de altura.');
 if(dom.hubControls>300)add('hub-controls','warn','Hub com '+dom.hubControls+' controles no DOM.');
 if(dom.hubPanels>50)add('hub-panels','warn','Hub com '+dom.hubPanels+' painéis no DOM.');
 if(dom.documentNodes>3000)add('dom-size','warn','Documento com '+dom.documentNodes+' nós.');
 if(dom.duplicateIds.length)add('duplicate-ids','warn',dom.duplicateIds.length+' IDs duplicados.');
 if(pending.count)add('pending-sync','warn',pending.count+' pendência(s) de sincronização.');
 if((pending.oldestAgeMs||0)>86400000)add('old-pending','warn','Pendência mais antiga acima de 24h.');
 if(storage.totalBytes>4*1024*1024)add('storage-size','warn','localStorage acima de 4 MB.');
 if(maxLag>1000)add('main-thread-lag','error','Maior atraso observado da thread principal: '+maxLag+'ms.');
 if(longTasks.some(x=>x.durationMs>500))add('long-task','error','Há tarefa longa acima de 500ms.');
 if(errors.length)add('runtime-errors','warn',errors.length+' erro(s) JavaScript capturado(s) nesta sessão.');
 return out
}
function snapshot(){
 const dom=domInfo(),pending=pendingInfo(),storage=storageInfo();
 return {
   kind:'hlgb_hub_forensics',forensicVersion:V,generatedAt:now(),readOnly:true,credentialsIncluded:false,
   browser:{userAgent:navigator.userAgent,platform:navigator.platform,online:navigator.onLine,language:navigator.language,visibility:document.visibilityState,viewport:{width:innerWidth,height:innerHeight,devicePixelRatio:devicePixelRatio||1}},
   page:{active:document.querySelector('.page.active')?.id||'',url:location.origin+location.pathname},
   versions:versions(),dom,db:dbInfo(),sync:{pending,wal:walInfo()},storage,
   performance:{eventLoopLastLagMs:lastLag,eventLoopMaxLagMs:maxLag,longTasks:longTasks.slice(-50),resources:resourceInfo(),hubMutationCallbacks:mutationTotal},
   errors:errors.slice(-50),timeline:events.slice(-220),scripts:scriptInfo(),redFlags:redFlags(dom,pending,storage)
 }
}
function download(){
 const data=snapshot(),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),a=document.createElement('a');
 a.href=URL.createObjectURL(blob);a.download='HLGB-DIAGNOSTICO-HUB-PROFUNDO-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(a);a.click();
 setTimeout(()=>{try{URL.revokeObjectURL(a.href)}catch(e){}a.remove()},1000);
 event('forensics-download',{redFlags:data.redFlags.length,errors:data.errors.length,pending:data.sync.pending.count});return data
}
function injectAuditorButton(){
 const result=document.getElementById('hlgbAuditorResult');if(!result)return false;
 const root=result.parentElement;if(!root||root.querySelector('#hlgbHubForensicsBtn9291'))return !!root;
 const actions=root.querySelector('.hlgb-auditor-actions');if(!actions)return false;
 const b=document.createElement('button');b.id='hlgbHubForensicsBtn9291';b.type='button';b.className='primary';b.textContent='🔬 Diagnóstico profundo do Hub';
 b.onclick=()=>{try{const d=download(),r=d.redFlags||[];alert('Diagnóstico profundo do Hub exportado.\n\nAlertas técnicos: '+r.length+'\nErros JS capturados: '+d.errors.length+'\nPendências: '+d.sync.pending.count+'\nMaior atraso da tela: '+d.performance.eventLoopMaxLagMs+' ms\n\nO arquivo não inclui senhas nem tokens.')}catch(e){alert('Não foi possível gerar o diagnóstico profundo.\n\n'+safeMessage(e))}};
 actions.insertBefore(b,actions.firstChild);return true
}
function scheduleAuditorInject(){setTimeout(injectAuditorButton,40);setTimeout(injectAuditorButton,220);setTimeout(injectAuditorButton,700)}
setTimeout(injectAuditorButton,1200);setTimeout(injectAuditorButton,3000);
document.addEventListener('click',e=>{
 const b=e.target?.closest?.('button');if(!b)return;
 if(b.id==='hlgbAuditorNavBtn'||b.id==='hlgbAuditorOpenBtn'||/Auditor\s*\/\s*Testes/i.test(sid(b.textContent)))scheduleAuditorInject();
 if(b.matches('.he-save9286'))event('hub-editor-save-click',{entries:dbInfo().counts.hubFinanceEntries||0});
 const modal=b.closest?.('#modal,.modal,.modalbox');if(modal?.querySelector?.('#hlgb916HubForm')&&(b.classList.contains('modalSave')||/salvar/i.test(sid(b.textContent))))event('hub-new-save-click',{entries:dbInfo().counts.hubFinanceEntries||0});
},true);
window.hlgbHubForensics9291={version:V,snapshot,download,event,errors,timeline:events,longTasks,injectAuditorButton,scheduleAuditorInject};
window.hlgbCollectHubDiagnostics=snapshot;
window.hlgbDownloadHubDiagnostics=download;
event('forensics-ready',{version:V});
console.info('[HLGB] Forense Hub v'+V+' ativo — diagnóstico profundo sem observer global contínuo');
})();
