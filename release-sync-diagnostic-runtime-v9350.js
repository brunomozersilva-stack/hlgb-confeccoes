/* HLGB v93.50-chain1 — diagnóstico de runtime da sincronização/WAL.
   Somente leitura: acrescenta estado das proteções, autoridade WAL, comparação local/snapshot
   e topologia da cadeia de wrappers ao JSON exportado pelo Auditor. Não limpa filas nem altera dados operacionais. */
(function(){
'use strict';
const V='93.50-chain1';
if(window.HLGB_SYNC_DIAGNOSTIC_RUNTIME_9350===V)return;
window.HLGB_SYNC_DIAGNOSTIC_RUNTIME_9350=V;
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function canonical(v){
 if(Array.isArray(v))return v.map(canonical);
 if(!v||typeof v!=='object')return v;
 const o={};
 for(const k of Object.keys(v).sort()){
  if(k==='updatedAt'||k==='updated_at'||k==='revision'||k.startsWith('__'))continue;
  o[k]=canonical(v[k]);
 }
 return o;
}
function sameMeaning(a,b){try{return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}catch(e){return false}}
function safeStatus(fn){try{return clone(fn?.())||null}catch(e){return {error:sid(e?.message||e)}}}
function snapshot(module,id){try{return window.hlgbRecordSnapshots?.[module]?.get?.(sid(id))||null}catch(e){return null}}
const POINTERS=['__original','__hlgb9306Original','__originalGradeLink','__hlgb9313Original','__hlgb9312Original','__hlgb9320Original','__hlgbRecordIntegrityOriginal','__hlgb955Original','__hlgb9339Original','__hlgbBase','__base','original','base'];
const MARKERS=['__hlgbPayrollWalRace9346','__hlgbPayrollMonthWal9334','__hlgb9354','__hlgb9306','__hlgb955Wrapped','__hlgbRecordIntegrity','__hlgb9339','__hlgb955Generic'];
function functionSummary(fn,index){
 if(typeof fn!=='function')return null;
 let props=[];try{props=Object.getOwnPropertyNames(fn).filter(k=>k!=='length'&&k!=='name'&&k!=='prototype'&&k!=='arguments'&&k!=='caller').slice(0,50)}catch(e){}
 const markers={};for(const k of MARKERS)try{if(fn[k])markers[k]=true}catch(e){}
 const pointers={};
 for(const k of props){try{if(typeof fn[k]==='function'&&(POINTERS.includes(k)||/original|base/i.test(k)))pointers[k]=true}catch(e){}}
 let source='';try{source=Function.prototype.toString.call(fn).replace(/\s+/g,' ').slice(0,420)}catch(e){source='[unavailable]'}
 return {index,name:sid(fn.name||''),markers,pointers,properties:props,source};
}
function chainProbe(start){
 const nodes=[],seen=new Set();let fn=start,stop='not-function';
 for(let i=0;i<40&&typeof fn==='function'&&!seen.has(fn);i++){
  seen.add(fn);const node=functionSummary(fn,i);nodes.push(node);
  let next=null,pointer='';
  for(const k of POINTERS){try{if(typeof fn[k]==='function'){next=fn[k];pointer=k;break}}catch(e){}}
  if(!next){
   let props=[];try{props=Object.getOwnPropertyNames(fn)}catch(e){}
   for(const k of props){try{if(/original|base/i.test(k)&&typeof fn[k]==='function'){next=fn[k];pointer=k;break}}catch(e){}}
  }
  node.nextPointer=pointer;
  if(!next){stop='no-pointer';break}
  fn=next;stop='max-depth';
 }
 if(typeof fn==='function'&&seen.has(fn))stop='cycle';
 return {stop,depth:nodes.length,nodes};
}
function runtimeState(data){
 const entries=data?.durableWalLocalStorage?.entries||[];
 return {
  chainDiagnosticVersion:V,
  guards:{
   payrollReliable:safeStatus(window.hlgbPayrollReliableSaveGuard9344?.status),
   payrollRace:safeStatus(window.hlgbPayrollWalRace9346?.status),
   walAuthority:safeStatus(window.hlgbWalSingleAuthority9339?.status),
   replay:clone(window.hlgbWalConfirmedReplay9333?.state||null),
   payrollMonthVersion:sid(window.hlgbPayrollMonthWal9334?.version||''),
   markers:{
    recordPayrollRace:!!window.hlgbRecordSaveWithRetry?.__hlgbPayrollWalRace9346,
    recordCarries955:!!window.hlgbRecordSaveWithRetry?.__hlgb955Wrapped,
    reliablePayrollRace:!!window.hlgb955ReliableSave?.__hlgbPayrollWalRace9346,
    reliable9344:!!window.hlgb955ReliableSave?.__hlgbPayrollReliableSave9344,
    authorityOnFlush:!!window.hlgb955FlushSilent?.__hlgb9339
   },
   wrapperChains:{
    recordSave:chainProbe(window.hlgbRecordSaveWithRetry),
    reliableSave:chainProbe(window.hlgb955ReliableSave),
    genericSave:chainProbe(window.save)
   }
  },
  walAnalysis:entries.map(op=>{
   const s=snapshot(op?.module,op?.id);
   return {
    key:sid(op?.__storageKey||op?.key||''),module:sid(op?.module||''),id:sid(op?.id??''),
    attempts:Number(op?.attempts||0),state:sid(op?.state||''),createdAt:sid(op?.createdAt||''),lastAttemptAt:sid(op?.lastAttemptAt||''),
    snapshotPresent:!!s,snapshotDeleted:!!s?.deleted_at,
    sameBusinessAsSnapshot:!!(s&&!s.deleted_at&&s.data&&sameMeaning(op?.data,s.data)),sameBusinessAsBase:!!(op?.baseData&&sameMeaning(op?.data,op.baseData)),
    dataUpdatedAt:sid(op?.data?.updatedAt||''),snapshotDataUpdatedAt:sid(s?.data?.updatedAt||''),snapshotUpdatedAt:sid(s?.updated_at||''),baseUpdatedAt:sid(op?.baseUpdatedAt||'')
   };
  })
 };
}
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<93.50){window.HLGB_RELEASE_VERSION='93.50';const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v93.50'}}catch(e){}}
function patch(){
 const a=window.hlgbInternalAuditor;
 if(!a||typeof a.buildSyncDiagnostic!=='function')return false;
 if(a.buildSyncDiagnostic.__hlgb9350Chain1)return true;
 const base=a.buildSyncDiagnostic;
 const wrapped=async function(){const data=await base.apply(this,arguments);try{data.runtime=runtimeState(data)}catch(e){data.runtime={error:sid(e?.message||e)}}return data};
 wrapped.__hlgb9350=true;wrapped.__hlgb9350Chain1=true;wrapped.__original=base;
 a.buildSyncDiagnostic=wrapped;
 a.downloadSyncDiagnostic=async function(){
  const data=await wrapped();const text=JSON.stringify(data,null,2),blob=new Blob([text],{type:'application/json;charset=utf-8'}),link=document.createElement('a');
  link.href=URL.createObjectURL(blob);link.download='HLGB-DIAGNOSTICO-SINCRONIZACAO-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(link);link.click();
  setTimeout(()=>{try{URL.revokeObjectURL(link.href)}catch(e){}link.remove()},1000);return data;
 };
 window.hlgbAuditorExportSync=async function(){try{const data=await a.downloadSyncDiagnostic();alert('Diagnóstico exportado.\n\nPendências normalizadas: '+Number(data?.summary?.normalizedPending||0)+'\nWAL local: '+Number(data?.summary?.walLocalStorage||0)+'\nIndexedDB: '+Number(data?.summary?.walIndexedDb||0));return data}catch(e){alert('Não foi possível exportar o diagnóstico.\n\n'+sid(e?.message||e));throw e}};
 stamp();return true;
}
stamp();[0,100,350,900,1800,3500,7000].forEach(ms=>setTimeout(patch,ms));
window.addEventListener('focus',patch);window.addEventListener('pageshow',patch);
console.info('[HLGB] '+V+' diagnóstico de runtime da WAL + cadeia de wrappers ativo');
})();
