/* HLGB v93.45 — estabilização finita da folha mensal.
   Evita WAL técnico quando a linha consolidada difere da nuvem apenas em updatedAt.
   Durante os primeiros 5 minutos após o boot, normaliza somente o timestamp local confirmado
   e pede a poda estrita do WAL mensal redundante. Não toca alterações reais nem conflitos.
   Patch 2026-10-24: a interceptação de hlgb955ReliableSave foi delegada para a autoridade
   final v93.56, evitando duas camadas com a mesma responsabilidade. */
(function(){
'use strict';
const V='93.45',SETTLE_MS=300000,TICK_MS=2000;
if(window.HLGB_PAYROLL_RELIABLE_SAVE_GUARD_9344===V)return;
window.HLGB_PAYROLL_RELIABLE_SAVE_GUARD_9344=V;
const sid=v=>String(v??'');
function payrollMonth(v){return !!(v&&v.sourceType==='payroll_month'&&sid(v.sourceId||'').trim())}
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(!v||typeof v!=='object')return v;const o={};for(const k of Object.keys(v).sort()){if(k==='updatedAt')continue;o[k]=canonical(v[k])}return o}
function sameMeaning(a,b){try{return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}catch(e){return false}}
function nextOriginal(f){return f?.__original||f?.__hlgb9306Original||f?.__originalGradeLink||f?.__hlgb9313Original||f?.__hlgb9312Original||f?.__hlgb9320Original||f?.__hlgbRecordIntegrityOriginal||f?.__hlgb955Original||f?.__hlgb9339Original||null}
function chainHasMarker(fn,marker){let f=fn,n=0,seen=new Set();while(typeof f==='function'&&n++<64&&!seen.has(f)){seen.add(f);if(f?.[marker])return true;f=nextOriginal(f)}return false}
function snapshot(id){try{return window.hlgbRecordSnapshots?.hubFinanceEntries?.get?.(sid(id))||null}catch(e){return null}}
function localRows(){try{if(typeof db!=='undefined'&&db){db.hubFinanceEntries=Array.isArray(db.hubFinanceEntries)?db.hubFinanceEntries:[];return db.hubFinanceEntries}}catch(e){}try{window.db.hubFinanceEntries=Array.isArray(window.db?.hubFinanceEntries)?window.db.hubFinanceEntries:[];return window.db.hubFinanceEntries}catch(e){return []}}
function localSave(){try{window.localSaveOnly?.();return true}catch(e){try{localSaveOnly?.();return true}catch(_){return false}}}
function normalizeMonthlyTimestamps(){
 let changed=0;
 for(const row of localRows()){
  if(!payrollMonth(row))continue;
  const id=sid(row?.id??row?.__hlgbId);if(!id)continue;
  const s=snapshot(id);
  if(!s||s.deleted_at||!s.data||!sameMeaning(row,s.data))continue;
  const wanted=sid(s.data.updatedAt||'');
  if(sid(row.updatedAt||'')===wanted)continue;
  row.updatedAt=s.data.updatedAt||'';changed++;
 }
 if(changed)localSave();
 return changed;
}
/* Compatibilidade: mantém a API antiga sem criar wrapper duplicado. */
function install(){return chainHasMarker(window.hlgb955ReliableSave,'__hlgbPayrollWalRace9346')}
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<93.45){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}}
let settleTimer=null,settleBusy=false,settleStartedAt='',settleDeadline=0,settleTicks=0,normalizedTimestamps=0,prunedWal=0,settleDone=false,lastSettleError='';
async function settleTick(){
 if(settleBusy||settleDone)return false;
 settleBusy=true;lastSettleError='';
 try{
  settleTicks++;stamp();
  normalizedTimestamps+=normalizeMonthlyTimestamps();
  try{const out=await window.hlgbPayrollMonthWal9334?.prune?.();prunedWal+=Number(out?.removed)||0}catch(e){lastSettleError=sid(e?.message||e)}
  return true;
 }catch(e){lastSettleError=sid(e?.message||e);return false}
 finally{
  settleBusy=false;
  if(settleDeadline&&Date.now()>=settleDeadline){settleDone=true;if(settleTimer){clearInterval(settleTimer);settleTimer=null}}
 }
}
function startSettlement(){
 if(settleTimer||settleDone)return false;
 settleStartedAt=new Date().toISOString();settleDeadline=Date.now()+SETTLE_MS;
 settleTick().catch(()=>{});
 settleTimer=setInterval(()=>settleTick().catch(()=>{}),TICK_MS);
 return true;
}
function loadFinalGuard(){
 try{
  if(window.hlgbPayrollWalRace9346?.install){window.hlgbPayrollWalRace9346.install();return true}
  if(document.querySelector('script[data-hlgb-payroll-wal-race="9346"]'))return true;
  const s=document.createElement('script');s.src='./release-payroll-wal-race-v9346.js?fresh='+Date.now();s.async=false;s.dataset.hlgbPayrollWalRace='9346';s.onload=()=>window.hlgbPayrollWalRace9346?.install?.();s.onerror=()=>console.warn('[HLGB] v93.56 não carregou a autoridade final da folha');(document.head||document.documentElement).appendChild(s);return true;
 }catch(e){return false}
}
function maintain(){stamp();startSettlement()}
window.hlgbPayrollReliableSaveGuard9344={version:V,install,startSettlement,settle:()=>settleTick(),loadFinalGuard,status:()=>({version:V,reliableSaveDelegated:true,finalGuardInstalled:chainHasMarker(window.hlgb955ReliableSave,'__hlgbPayrollWalRace9346'),settleStartedAt,settleDeadline:settleDeadline?new Date(settleDeadline).toISOString():'',settleTicks,normalizedTimestamps,prunedWal,settleDone,settleBusy,lastSettleError,finalGuard:window.hlgbPayrollWalRace9346?.status?.()||null})};
[0,250,800,1800,3500,6000].forEach(ms=>setTimeout(maintain,ms));
/* Fallback tardio: no app normal v93.56 já é carregado pelo parser logo depois deste arquivo.
   Só injeta dinamicamente se a autoridade realmente não apareceu. */
setTimeout(()=>{if(!chainHasMarker(window.hlgb955ReliableSave,'__hlgbPayrollWalRace9346'))loadFinalGuard()},8000);
window.addEventListener('focus',()=>{stamp();if(!chainHasMarker(window.hlgb955ReliableSave,'__hlgbPayrollWalRace9346'))loadFinalGuard()});window.addEventListener('online',()=>{stamp();if(!chainHasMarker(window.hlgb955ReliableSave,'__hlgbPayrollWalRace9346'))loadFinalGuard()});
console.info('[HLGB] v'+V+' estabilização mensal ativa · reliable save delegado para v93.56');
})();