/* HLGB v92.89 — Hub: lançamento aparece imediatamente na sessão atual */
(function(){
'use strict';
const V='92.89';
const sid=v=>String(v??'');
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}try{return window.db||null}catch(e){return null}}
function hub(){const d=dbRef();if(!d)return [];d.hubFinanceEntries=Array.isArray(d.hubFinanceEntries)?d.hubFinanceEntries:[];return d.hubFinanceEntries}
function idOf(row){const direct=row?.id??row?.__hlgbId;if(direct!=null&&sid(direct).trim())return sid(direct);return ''}
function upsert(row,fallbackId){
 if(!row)return false;const a=hub(),id=idOf(row)||sid(fallbackId);if(!id)return false;const v=clone(row);if(v.id==null&&v.__hlgbId==null)v.__hlgbId=id;const i=a.findIndex(x=>idOf(x)===id);if(i>=0)a[i]=v;else a.push(v);try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}return true
}
function remove(id){const a=hub(),i=a.findIndex(x=>idOf(x)===sid(id));if(i>=0){a.splice(i,1);try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}return true}return false}
function sig(){try{return hub().map((x,i)=>[idOf(x)||i,sid(x?.updatedAt),sid(x?.date),sid(x?.flow),sid(x?.description),Number(x?.value||0),sid(x?.status)].join('|')).sort().join(';;')}catch(e){return ''}}
function hubVisible(){const p=document.getElementById('hubFinanceiro');return !!p&&(p.classList.contains('active')||p.style.display==='block')}
let renderPending=false;
function renderNow(){
 if(renderPending)return false;if(window.HLGB_HUB_EDITING||document.getElementById('hlgbHubEditor9270'))return false;renderPending=true;
 const run=()=>{renderPending=false;try{if(window.hlgbHubMaster9258?.renderAll)window.hlgbHubMaster9258.renderAll();else if(typeof window.renderHubFinance==='function')window.renderHubFinance()}catch(e){console.warn('[HLGB Hub Live '+V+'] render',e)}};
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(run);else setTimeout(run,0);return true
}
function watchCurrentSave(){
 if(!hubVisible())return;const before=sig(),started=Date.now();let last=before;
 const tick=()=>{const cur=sig();if(cur!==last){last=cur;renderNow();return}if(Date.now()-started<15000)setTimeout(tick,80)};setTimeout(tick,0)
}
function installRecordHook(){
 const fn=window.hlgbRecordSaveWithRetry;if(typeof fn!=='function'||fn.__hlgbHubLive9289)return;
 const w=async function(module,id,data,deleted){
  const out=await fn.apply(this,arguments);
  if(module==='hubFinanceEntries'&&out?.applied===true){
   if(deleted===true||out?.deleted_at)remove(id);else upsert(out?.data||data,id);
   setTimeout(renderNow,0);setTimeout(renderNow,90)
  }
  return out
 };
 w.__hlgbHubLive9289=true;w.__original=fn;window.hlgbRecordSaveWithRetry=w
}
document.addEventListener('click',e=>{
 const b=e.target?.closest?.('button');if(!b||!hubVisible())return;
 if(b.closest('#modal')&&(b.classList.contains('modalSave')||/salvar/i.test(sid(b.textContent))))watchCurrentSave()
},true);
installRecordHook();setTimeout(installRecordHook,250);setTimeout(installRecordHook,1200);
window.hlgbHubLiveRefresh9289={version:V,renderNow,upsert,watchCurrentSave};
console.info('[HLGB] Hub Live v'+V+': atualização imediata após lançamento ativa');
})();
