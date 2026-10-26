/* HLGB v93.49 — autoridade única do replay WAL + poda somente após confirmação da nuvem.
   Remove WAL apenas quando o mesmo opId ainda está presente e o registro remoto já
   corresponde aos dados locais. Preserva alterações reais, conflitos e substituições.
   v93.49: produção recriada com novo ID pode confirmar WAL antigo somente quando a
   identidade e todos os campos operacionais críticos forem equivalentes. */
(function(){
'use strict';
const V='93.49', DELEGATE_MIN_MS=15000, SCAN_MIN_MS=12000;
const WAL_KEY='hlgb_durable_wal_v1', DB_NAME='hlgb_durable_wal', STORE='entries';
if(window.HLGB_WAL_SINGLE_AUTHORITY_9339){try{window.hlgbWalSingleAuthority9339?.install?.();window.hlgbWalSingleAuthority9339?.pruneConfirmed?.(true)}catch(e){}return}
window.HLGB_WAL_SINGLE_AUTHORITY_9339=V;
let original=null,installed=false,calls=0,lastAt='',lastResult=null,reinstalls=0,lastDelegatedAt=0,throttled=0;
let confirmedPruned=0,equivalentProductionPruned=0,lastConfirmedPruneAt='',scanBusy=false,lastScanAt=0,lastScanResult=null;
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<93.49){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}}
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(!v||typeof v!=='object')return v;const out={};for(const k of Object.keys(v).sort()){if(k==='updatedAt'||k==='updated_at'||k==='revision'||k.startsWith('__'))continue;out[k]=canonical(v[k])}return out}
function sameMeaning(a,b){try{return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}catch(e){return false}}
function sameScalar(a,b){return JSON.stringify(a??null)===JSON.stringify(b??null)}
function productionIdentity(data){const d=data||{},key=sid(d.cutProductKey),cut=sid(d.cutId),order=sid(d.orderId),product=sid(d.productId);if(!key||!cut||!order||!product)return null;return {key,cut,order,product}}
function sameProductionReplacement(remote,pending){
 const a=productionIdentity(remote),b=productionIdentity(pending);if(!a||!b)return false;
 if(a.key!==b.key||a.cut!==b.cut||a.order!==b.order||a.product!==b.product)return false;
 const critical=['op','product','client','color','size','planned','done','stage','productionLocationId','factionId','date','assignmentSource'];
 return critical.every(k=>sameScalar(remote?.[k],pending?.[k]));
}
function readWal(){try{const w=JSON.parse(localStorage.getItem(WAL_KEY)||'null');return w&&typeof w==='object'?w:null}catch(e){return null}}
function writeWal(w){try{const entries=w?.entries&&typeof w.entries==='object'?w.entries:{};w.entries=entries;if(Object.keys(entries).length)localStorage.setItem(WAL_KEY,JSON.stringify(w));else localStorage.removeItem(WAL_KEY);return true}catch(e){return false}}
function loggedIn(){try{const l=document.getElementById('loginScreen'),a=document.getElementById('appShell');if(!a)return false;if(l&&getComputedStyle(l).display!=='none')return false;return true}catch(e){return false}}
function idbDeleteSame(key,opId){return new Promise(resolve=>{if(typeof indexedDB==='undefined'){resolve(false);return}let r;try{r=indexedDB.open(DB_NAME)}catch(e){resolve(false);return}r.onupgradeneeded=()=>{try{r.transaction.abort()}catch(e){};resolve(false)};r.onerror=()=>resolve(false);r.onsuccess=()=>{const d=r.result;try{if(!d.objectStoreNames.contains(STORE)){d.close();resolve(false);return}const tx=d.transaction(STORE,'readwrite'),s=tx.objectStore(STORE),g=s.get(key);g.onsuccess=()=>{const cur=g.result;if(cur&&sid(cur.opId)===sid(opId))s.delete(key)};tx.oncomplete=()=>{d.close();resolve(true)};tx.onerror=tx.onabort=()=>{d.close();resolve(false)}}catch(e){try{d.close()}catch(_){}resolve(false)}}})}
async function confirmRemove(key,opId){const w=readWal();const cur=w?.entries?.[key];if(!cur||sid(cur.opId)!==sid(opId))return false;delete w.entries[key];if(!writeWal(w))return false;await idbDeleteSame(key,opId);return true}
async function cloudRows(query){const req=window.cloudRequest;if(typeof req!=='function')throw new Error('Consulta da nuvem indisponível');return await Promise.race([Promise.resolve(req(query,{method:'GET'})),new Promise((_,rej)=>setTimeout(()=>rej(new Error('Timeout conferindo WAL na nuvem')),12000))])}
async function cloudRow(module,id){const q=`hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at&module=eq.${encodeURIComponent(sid(module))}&entity_id=eq.${encodeURIComponent(sid(id))}&limit=1`;const out=await cloudRows(q);return Array.isArray(out)&&out.length?out[0]:null}
async function equivalentProductionRow(op){
 if(sid(op?.module)!=='production'||op?.deleted===true)return null;
 const identity=productionIdentity(op?.data);if(!identity)return null;
 const q=`hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at&module=eq.production&deleted_at=is.null&data->>cutProductKey=eq.${encodeURIComponent(identity.key)}&limit=8`;
 const out=await cloudRows(q);if(!Array.isArray(out))return null;
 return out.find(row=>sid(row?.entity_id)!==sid(op?.id)&&!row?.deleted_at&&sameProductionReplacement(row?.data,op?.data))||null;
}
async function pruneConfirmed(force=false,max=8){
 if(scanBusy||navigator.onLine===false||!loggedIn())return {removed:0,skipped:true};
 const now=Date.now();if(!force&&now-lastScanAt<SCAN_MIN_MS)return {removed:0,throttled:true};
 const w=readWal();const items=Object.entries(w?.entries||{}).slice(0,Math.max(1,max));
 if(!items.length){lastScanAt=now;lastConfirmedPruneAt=new Date().toISOString();lastScanResult={removed:0,checked:0};return lastScanResult}
 scanBusy=true;lastScanAt=now;const removed=[],equivalent=[],kept=[],errors=[];
 try{
  for(const [key,op] of items){
   if(!op?.module||op?.id==null){kept.push(key);continue}
   try{
    const row=await cloudRow(op.module,op.id);
    let same=op.deleted===true?(!row||!!row.deleted_at):!!(row&&!row.deleted_at&&sameMeaning(row.data,op.data));
    let replacement=null;
    if(!same&&!row&&sid(op.module)==='production'&&op.deleted!==true){replacement=await equivalentProductionRow(op);same=!!replacement}
    if(same&&await confirmRemove(key,op.opId)){removed.push(key);if(replacement){equivalent.push({key,replacementId:sid(replacement.entity_id)});equivalentProductionPruned++}}else kept.push(key);
   }catch(e){errors.push({key,error:sid(e?.message||e)});kept.push(key)}
  }
  confirmedPruned+=removed.length;lastConfirmedPruneAt=new Date().toISOString();lastScanResult={removed:removed.length,keys:removed,equivalent,checked:items.length,kept,errors};
  if(removed.length)console.info('[HLGB] v'+V+' removeu WAL somente após confirmação remota',lastScanResult);
  return clone(lastScanResult);
 }finally{scanBusy=false}
}
async function prunePayroll(){return pruneConfirmed(true,8)}
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
      await pruneConfirmed(false,8);
      if(replay.state?.busy){lastResult='replay-busy';return false}
      const now=Date.now();
      if(now-lastDelegatedAt<DELEGATE_MIN_MS){throttled++;lastResult='throttled';return false}
      lastDelegatedAt=now;
      const out=await replay.run('legacy-flush-delegated',true);
      const details=clone(replay.state?.lastResult||null);
      lastResult={ok:out===true,details};
      return out;
    }catch(e){lastResult={ok:false,error:sid(e?.message||e)};return false}
  };
  wrapped.__hlgb9339=true;wrapped.__hlgb9339Original=original;
  window.hlgb955FlushSilent=wrapped;installed=true;stamp();return true;
}
function maintain(){install();stamp()}
window.hlgbWalSingleAuthority9339={version:V,status:()=>({installed,calls,lastAt,lastResult,reinstalls,lastDelegatedAt,throttled,delegateMinMs:DELEGATE_MIN_MS,replayVersion:window.hlgbWalConfirmedReplay9333?.version||'',replayBusy:!!window.hlgbWalConfirmedReplay9333?.state?.busy,confirmedPruned,equivalentProductionPruned,lastConfirmedPruneAt,scanBusy,lastScanAt,lastScanResult}),install,maintain,pruneConfirmed,prunePayroll,sameProductionReplacement};
[100,400,900,1800,3500,6000,9000,12000,16000,20000].forEach(ms=>setTimeout(maintain,ms));
setTimeout(()=>pruneConfirmed(true,8).then(()=>window.hlgbWalConfirmedReplay9333?.run?.('v9349-after-confirmed-prune',true)).catch(()=>{}),1200);
setTimeout(()=>pruneConfirmed(true,8).then(()=>window.hlgbWalConfirmedReplay9333?.run?.('v9349-late-confirmed-prune',true)).catch(()=>{}),15000);
let tries=0;const t=setInterval(()=>{tries++;maintain();if(tries>=40)clearInterval(t)},500);
window.addEventListener('online',()=>{maintain();pruneConfirmed(true,8).catch(()=>{})});
window.addEventListener('focus',()=>{maintain();pruneConfirmed(false,8).catch(()=>{})});
console.info('[HLGB] v'+V+' autoridade única do WAL ativa com confirmação remota antes da poda');
})();