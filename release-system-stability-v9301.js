/* HLGB v93.03 — estabilização estrutural: impede reempilhamento tardio de roteadores */
(function(){
'use strict';
if(window.hlgbSystemStability9301){try{window.hlgbSystemStability9301.apply?.()}catch(e){}return;}
const V='93.03';
const DIAGNOSTIC_TECH_MODULES=new Set(['systemIssues','systemSuggestions']);
function diagnosticModules(){
 try{return typeof HLGB_RECORD_MODULES!=='undefined'&&Array.isArray(HLGB_RECORD_MODULES)?HLGB_RECORD_MODULES:null}catch(e){return null}
}
function isolateDiagnosticModules(){
 const mods=diagnosticModules();if(!mods)return false;
 for(const m of DIAGNOSTIC_TECH_MODULES){let i;while((i=mods.indexOf(m))>=0)mods.splice(i,1)}
 if(mods.__hlgbDiagnosticIsolation9301)return true;
 const rawPush=mods.push;
 try{
  Object.defineProperty(mods,'push',{configurable:true,writable:true,value:function(...items){return rawPush.apply(this,items.filter(x=>!DIAGNOSTIC_TECH_MODULES.has(String(x))))}});
  Object.defineProperty(mods,'__hlgbDiagnosticIsolation9301',{configurable:true,value:true});
 }catch(e){
  mods.push=function(...items){return rawPush.apply(this,items.filter(x=>!DIAGNOSTIC_TECH_MODULES.has(String(x))))};
  mods.__hlgbDiagnosticIsolation9301=true;
 }
 return true;
}
function sameDiagnosticSnapshot(module,id,data,deleted=false){
 try{
  if(!DIAGNOSTIC_TECH_MODULES.has(String(module||'')))return false;
  const snap=hlgbRecordSnapshots?.[module]?.get?.(String(id??''));if(!snap)return false;
  if(deleted===true)return !!snap.deleted_at;
  if(snap.deleted_at)return false;
  if(typeof hlgbRecordDataEqual==='function')return hlgbRecordDataEqual(data,snap.data);
  return JSON.stringify(data)===JSON.stringify(snap.data);
 }catch(e){return false}
}
async function cleanConfirmedDiagnosticQueues(){
 let normalized=0,wal=0;
 try{
  const key='hlgb_records_pending_v91',raw=localStorage.getItem(key);
  if(raw){const p=JSON.parse(raw),modules=p?.modules||{};let changed=false;
   for(const m of DIAGNOSTIC_TECH_MODULES){const ops=Array.isArray(modules[m])?modules[m]:[];if(!ops.length)continue;
    const keep=ops.filter(op=>{const same=sameDiagnosticSnapshot(m,op?.id??op?.entity_id,op?.data,op?.deleted===true);if(same){normalized++;changed=true;return false}return true});
    if(keep.length)modules[m]=keep;else delete modules[m];
   }
   if(changed){p.modules=modules;if(Object.keys(modules).length)localStorage.setItem(key,JSON.stringify(p));else localStorage.removeItem(key)}
  }
 }catch(e){console.warn('[HLGB '+V+'] limpeza de fila técnica da Central',e)}
 try{
  const key='hlgb_durable_wal_v1',raw=localStorage.getItem(key);
  if(raw){const w=JSON.parse(raw),entries=w?.entries||{};let changed=false;
   for(const [k,e] of Object.entries(entries)){
    if(!sameDiagnosticSnapshot(e?.module,e?.id??e?.entity_id,e?.data,e?.deleted===true))continue;
    if(typeof idbDel955!=='function')continue;
    await idbDel955(k);delete entries[k];wal++;changed=true;
   }
   if(changed){w.entries=entries;localStorage.setItem(key,JSON.stringify(w))}
  }
 }catch(e){console.warn('[HLGB '+V+'] limpeza de WAL técnica da Central',e)}
 try{if(typeof update955==='function')update955()}catch(e){}
 return {normalized,wal};
}
function markOne(fn){
 if(typeof fn!=='function')return false;
 ['__v9256','__hlgbPage9256','__hlgbStablePageV1','__hlgbStablePageV2','__hlgbStablePageV3'].forEach(k=>{try{fn[k]=true}catch(e){}});
 return true;
}
function pageDepth(){
 let fn=window.page,depth=0;const seen=new Set();
 while(typeof fn==='function'&&!seen.has(fn)&&depth<60){seen.add(fn);fn=fn.__original;depth++}
 return depth;
}
function markPage(){
 let fn=window.page;if(typeof fn!=='function')return false;
 const seen=new Set();let depth=0;
 while(typeof fn==='function'&&!seen.has(fn)&&depth<60){seen.add(fn);markOne(fn);fn=fn.__original;depth++}
 window.HLGB_PAGE_ROUTER_STABLE=V;
 window.HLGB_PAGE_ROUTER_DEPTH_MARKED=depth;
 return true;
}
function assistantDiagnostic(){
 try{return window.hlgbAssistantCanonical9297?.diagnostic?.()||null}catch(e){return null}
}
function stabilizeAssistant(){
 try{
  window.HLGB_ASSISTANT_FINAL_V9250=true;
  const c=window.hlgbAssistantCanonical9297;
  if(c?.install){c.install();window.HLGB_ASSISTANT_ROUTER_STABLE=V;return true}
 }catch(e){console.warn('[HLGB '+V+'] Assistente canônico',e)}
 return false;
}
function lockHub(){
 try{
  if(window.hlgbHubMaster9258)window.HLGB_HUB_MASTER_9258=window.hlgbHubMaster9258;
  else if(!window.HLGB_HUB_MASTER_9258)window.HLGB_HUB_MASTER_9258={active:true,version:'92.84+'};
  return true;
 }catch(e){return false}
}
function health(){
 const pd=pageDepth(),ad=assistantDiagnostic();
 return {version:V,pageDepth:pd,pageStable:!!window.HLGB_PAGE_ROUTER_STABLE,assistantStable:ad?ad.routerStable===true:!!window.HLGB_ASSISTANT_ROUTER_STABLE,assistantChainDepth:ad?.routerChainDepth??null,hubLocked:!!window.HLGB_HUB_MASTER_9258,diagnosticIsolation:!!diagnosticModules()?.__hlgbDiagnosticIsolation9301};
}
function needsRepair(){
 const p=window.page;
 if(typeof p==='function'&&(!p.__v9256||!p.__hlgbStablePageV3))return true;
 const ad=assistantDiagnostic();
 if(window.hlgbAssistantCanonical9297&&ad?.routerStable===false)return true;
 if(!window.HLGB_HUB_MASTER_9258)return true;
 if(!diagnosticModules()?.__hlgbDiagnosticIsolation9301)return true;
 return false;
}
function apply(){markPage();stabilizeAssistant();lockHub();isolateDiagnosticModules();Promise.resolve(cleanConfirmedDiagnosticQueues()).catch(()=>{});return health()}
apply();[120,700,1800,4200,9500,12500].forEach(ms=>setTimeout(apply,ms));
const healthTimer=setInterval(()=>{try{if(document.visibilityState==='visible'&&needsRepair())apply()}catch(e){}},15000);
window.addEventListener('pageshow',()=>setTimeout(apply,50));
window.addEventListener('focus',()=>setTimeout(apply,80));
window.hlgbSystemStability9301={version:V,apply,markPage,stabilizeAssistant,lockHub,health,needsRepair,isolateDiagnosticModules,cleanConfirmedDiagnosticQueues,healthTimer};
window.HLGB_SYSTEM_STABILITY_9301=V;
console.info('[HLGB] v'+V+' estabilização estrutural ativa');
})();
