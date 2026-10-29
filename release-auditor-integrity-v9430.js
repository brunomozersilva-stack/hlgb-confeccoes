/* HLGB v94.30 — integridade operacional adicional do Auditor (somente leitura, sem botão novo) */
(function(){
'use strict';
if(window.HLGB_AUDITOR_INTEGRITY_9430)return;
window.HLGB_AUDITOR_INTEGRITY_9430=true;
const V='94.30',sid=v=>String(v??''),low=v=>sid(v).trim().toLowerCase();
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function arr(name){try{return Array.isArray(window.db?.[name])?window.db[name]:[]}catch(e){return[]}}
function idOf(x){return sid(x?.id??x?.__hlgbId)}
function isFreeProduction(p){
 const stage=low(p?.stage),done=Math.max(0,Number(p?.done)||0);
 const noAssignment=!sid(p?.factionId)&&!sid(p?.assignedAt)&&!sid(p?.sentToFactionAt)&&!sid(p?.materialChecklistId)&&!sid(p?.productionId)&&!p?.productionSent;
 const freeStage=!stage||stage==='aguardando atribuição'||stage==='consolidado'||stage==='totalmente atribuído';
 return noAssignment&&freeStage&&done===0&&!sid(p?.finishedAt)&&!sid(p?.productionCompletedAt);
}
function scriptDuplicates(){
 const map=new Map();
 for(const s of [...document.scripts]){const src=s.getAttribute('src')||'';if(!src)continue;let name='';try{name=(new URL(src,location.href).pathname.split('/').pop()||'').toLowerCase()}catch(e){name=src.split('?')[0].split('/').pop().toLowerCase()}if(!name)continue;if(!map.has(name))map.set(name,[]);map.get(name).push(src)}
 return [...map.entries()].filter(([,v])=>v.length>1).map(([name,sources])=>({name,count:sources.length,sources}));
}
function collect(){
 const production=arr('production'),factions=[...arr('factionMasters'),...arr('factions')],locations=[...arr('productionLocations'),...arr('locations')];
 const factionIds=new Set(factions.map(idOf).filter(Boolean)),locationIds=new Set(locations.map(idOf).filter(Boolean));
 const factionLocation=new Map(factions.map(f=>[idOf(f),sid(f?.productionLocationId??f?.locationId)]).filter(x=>x[0]));
 const stale=[],mismatch=[];
 for(const p of production){
  const loc=sid(p?.productionLocationId??p?.locationId),fid=sid(p?.factionId),free=isFreeProduction(p);
  if(free&&loc)stale.push({id:idOf(p),orderId:sid(p?.orderId),productId:sid(p?.productId),product:p?.productName||p?.product||'',stage:p?.stage||'',productionLocationId:loc});
  if(loc&&fid&&loc===fid)mismatch.push({id:idOf(p),orderId:sid(p?.orderId),product:p?.productName||p?.product||'',factionId:fid,productionLocationId:loc,expectedLocationId:factionLocation.get(fid)||'',reason:'productionLocationId_equals_factionId'});
  else if(loc&&factionIds.has(loc)&&!locationIds.has(loc))mismatch.push({id:idOf(p),orderId:sid(p?.orderId),product:p?.productName||p?.product||'',factionId:fid,productionLocationId:loc,expectedLocationId:factionLocation.get(fid)||'',reason:'productionLocationId_points_to_faction'});
 }
 const duplicates=scriptDuplicates();
 return {version:V,readOnly:true,checkedAt:new Date().toISOString(),production:{rows:production.length,ghostDestinationCount:stale.length,ghostDestinations:stale,locationMismatchCount:mismatch.length,locationMismatches:mismatch,serverGuardCompatible:stale.length===0&&mismatch.length===0},scripts:{duplicateNameCount:duplicates.length,duplicates},status:(stale.length||mismatch.length)?'fail':(duplicates.length?'warn':'pass')};
}
function persist(result){
 try{
  const last=window.HLGB_AUDITOR_SINGLE_ACTION_LAST||window.hlgbAuditorSingleAction9429?.last||null;
  if(last&&typeof last==='object'){
   last.integrityV9430=clone(result);
   if(last.daily&&typeof last.daily==='object')last.daily.integrityV9430=clone(result);
  }
  const latestKey='hlgb_auditor_daily_report_latest_v9427',raw=localStorage.getItem(latestKey);
  if(raw){const daily=JSON.parse(raw);daily.integrityV9430=clone(result);daily.version=V;daily.appVersion=V;localStorage.setItem(latestKey,JSON.stringify(daily));const date=daily.date||new Date().toISOString().slice(0,10);localStorage.setItem('hlgb_auditor_daily_report_v9427_'+date,JSON.stringify(daily))}
 }catch(e){console.warn('[HLGB v94.30] persist Auditor integrity',e)}
 return result;
}
function run(){const out=collect();persist(out);window.HLGB_AUDITOR_INTEGRITY_LAST_9430=out;return out}
window.hlgbAuditorIntegrity9430={version:V,collect:run,last:null};
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<94.30)window.HLGB_RELEASE_VERSION=V;window.HLGB_AUDITOR_RELEASE_VERSION=V}catch(e){}}
function bind(){
 stamp();
 document.addEventListener('click',e=>{const b=e.target?.closest?.('#hlgbAuditorUnifiedRun9429,#hlgbAuditorUnifiedRun9427');if(!b)return;[1200,4000,12000].forEach(ms=>setTimeout(()=>{try{window.hlgbAuditorIntegrity9430.last=run()}catch(err){console.warn('[HLGB v94.30] Auditor integrity',err)}},ms))},{capture:true});
 [800,3000].forEach(ms=>setTimeout(()=>{try{window.hlgbAuditorIntegrity9430.last=run()}catch(e){}},ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();