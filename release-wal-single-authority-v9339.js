/* HLGB v93.42 — autoridade única do replay WAL.
   Evita concorrência com o flush legado, limita delegações e trata a WAL mensal
   redundante da folha mesmo quando ela é reidratada do IndexedDB depois do boot.
   Não apaga alterações reais, não cria registros e não ignora conflitos. */
(function(){
'use strict';
const V='93.42', DELEGATE_MIN_MS=15000;
const WAL_KEY='hlgb_durable_wal_v1', DB_NAME='hlgb_durable_wal', STORE='entries';
if(window.HLGB_WAL_SINGLE_AUTHORITY_9339){try{window.hlgbWalSingleAuthority9339?.install?.();window.hlgbWalSingleAuthority9339?.prunePayroll?.()}catch(e){}return}
window.HLGB_WAL_SINGLE_AUTHORITY_9339=V;
let original=null,installed=false,calls=0,lastAt='',lastResult=null,reinstalls=0,lastDelegatedAt=0,throttled=0,payrollPruned=0,lastPayrollPruneAt='';
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<93.42){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}}
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(!v||typeof v!=='object')return v;const out={};for(const k of Object.keys(v).sort()){if(k==='updatedAt')continue;out[k]=canonical(v[k])}return out}
function sameMeaning(a,b){try{return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}catch(e){return false}}
function payrollMonth(v){return !!(v&&v.sourceType==='payroll_month'&&sid(v.sourceId||'').trim())}
function readWal(){try{const w=JSON.parse(localStorage.getItem(WAL_KEY)||'null');return w&&typeof w==='object'?w:null}catch(e){return null}}
function writeWal(w){try{const entries=w?.entries&&typeof w.entries==='object'?w.entries:{};w.entries=entries;if(Object.keys(entries).length)localStorage.setItem(WAL_KEY,JSON.stringify(w));else localStorage.removeItem(WAL_KEY);return true}catch(e){return false}}
function idbDeleteSame(key,opId){return new Promise(resolve=>{if(typeof indexedDB==='undefined'){resolve(false);return}let r;try{r=indexedDB.open(DB_NAME)}catch(e){resolve(false);return}r.onupgradeneeded=()=>{try{r.transaction.abort()}catch(e){};resolve(false)};r.onerror=()=>resolve(false);r.onsuccess=()=>{const d=r.result;try{if(!d.objectStoreNames.contains(STORE)){d.close();resolve(false);return}const tx=d.transaction(STORE,'readwrite'),s=tx.objectStore(STORE),g=s.get(key);g.onsuccess=()=>{const cur=g.result;if(cur&&sid(cur.opId)===sid(opId))s.delete(key)};tx.oncomplete=()=>{d.close();resolve(true)};tx.onerror=tx.onabort=()=>{d.close();resolve(false)}}catch(e){try{d.close()}catch(_){}resolve(false)}}})}
async function prunePayroll(){
 const w=readWal();if(!w?.entries)return {removed:0};const removed=[];
 for(const [key,op] of Object.entries(w.entries)){
  if(op?.module!=='hubFinanceEntries'||!payrollMonth(op?.data)||!op?.baseData||!sameMeaning(op.data,op.baseData))continue;
  delete w.entries[key];removed.push({key,opId:op.opId});
 }
 if(!removed.length){lastPayrollPruneAt=new Date().toISOString();return {removed:0}}
 writeWal(w);for(const x of removed)await idbDeleteSame(x.key,x.opId);
 payrollPruned+=removed.length;lastPayrollPruneAt=new Date().toISOString();
 console.info('[HLGB] v'+V+' removeu WAL mensal redundante após reidratação',removed.map(x=>x.key));
 return {removed:removed.length,keys:removed.map(x=>x.key)};
}
function install(){
  const replay=window.hlgbWalConfirmedReplay9333;
  const legacy=window.hlgb955FlushSilent;
  if(!replay||typeof replay.run!=='function'||typeof legacy!=='function')return false;
  if(legacy.__hlgb9339){installed=true;return true}
  if(installed)reinstalls++;
  original=legacy;
  const wrapped=async function(){
    calls++;lastAt=new Date().toISOString();
    try{
      await prunePayroll();
      if(replay.state?.busy){lastResult='replay-busy';return false}
      const now=Date.now();
      if(now-lastDelegatedAt<DELEGATE_MIN_MS){throttled++;lastResult='throttled';return false}
      lastDelegatedAt=now;
      const out=await replay.run('legacy-flush-delegated',true);
      const details=clone(replay.state?.lastResult||null);
      lastResult={ok:out===true,details};
      return out;
    }catch(e){lastResult={ok:false,error:String(e?.message||e)};return false}
  };
  wrapped.__hlgb9339=true;wrapped.__hlgb9339Original=original;
  window.hlgb955FlushSilent=wrapped;installed=true;stamp();return true;
}
function maintain(){install();stamp()}
window.hlgbWalSingleAuthority9339={version:V,status:()=>({installed,calls,lastAt,lastResult,reinstalls,lastDelegatedAt,throttled,delegateMinMs:DELEGATE_MIN_MS,replayVersion:window.hlgbWalConfirmedReplay9333?.version||'',replayBusy:!!window.hlgbWalConfirmedReplay9333?.state?.busy,payrollPruned,lastPayrollPruneAt}),install,maintain,prunePayroll};
[100,400,900,1800,3500,6000,9000,12000,16000,20000].forEach(ms=>setTimeout(maintain,ms));
[1200,3500,7000,12000,20000].forEach(ms=>setTimeout(()=>prunePayroll().catch(()=>{}),ms));
let tries=0;const t=setInterval(()=>{tries++;maintain();if(tries>=40)clearInterval(t)},500);
window.addEventListener('online',()=>{maintain();prunePayroll().catch(()=>{})});
window.addEventListener('focus',()=>{maintain();prunePayroll().catch(()=>{})});
console.info('[HLGB] v'+V+' autoridade única do WAL ativa com throttle e poda mensal pós-reidratação');
})();