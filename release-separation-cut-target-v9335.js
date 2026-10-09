/* HLGB v93.35 — conclusão da Separação libera/salva somente o corte do pedido atual */
(function(){
'use strict';
const V='93.35';
if(window.HLGB_SEPARATION_CUT_TARGET_9335)return;
window.HLGB_SEPARATION_CUT_TARGET_9335=V;
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
let installs=0,runs=0,confirmed=0,pending=0,failed=0,lastOrderId='',lastCutId='',lastError='';
function data(){try{return typeof db!=='undefined'?db:window.db}catch(e){return window.db}}
function activeSeparationOrderId(){
 try{
  const st=window.hlgbSeparationDirect9321?.status?.();
  const a=Array.isArray(st?.busy)?st.busy:[];
  for(const raw of a){
   const s=sid(raw);
   if(!s)continue;
   if(s.startsWith('finish|'))return s.slice(7);
   const p=s.indexOf('|');
   if(p>0)return s.slice(0,p);
  }
 }catch(e){}
 return '';
}
function orderById(id){return (data()?.orders||[]).find(o=>sid(o?.id)===sid(id))||null}
function uniqueProductId(order){
 const ids=new Set();
 try{
  if(typeof projectionItemsForOrder==='function'){
   const rows=projectionItemsForOrder(order);
   if(Array.isArray(rows))for(const r of rows){const id=sid(r?.productId||r?.key).trim();if(id)ids.add(id)}
  }
 }catch(e){}
 if(!ids.size){
  for(const g of (Array.isArray(order?.grade)?order.grade:[])){
   const id=sid(g?.productId).trim();if(id)ids.add(id)
  }
 }
 return ids.size===1?[...ids][0]:'';
}
function recordId(module,row){
 const d=data(),arr=Array.isArray(d?.[module])?d[module]:[],i=arr.indexOf(row);
 try{if(typeof hlgbRecordId==='function'){const x=hlgbRecordId(module,row,i);if(x!=null&&sid(x))return sid(x)}}catch(e){}
 return sid(row?.__hlgbId||row?.id||'');
}
function saveLocal(){try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}}
function statusText(text,type=''){try{if(typeof setCloudStatus==='function')setCloudStatus(text,type);else window.setCloudStatus?.(text,type)}catch(e){}}
function scheduleRecovery(){try{window.hlgbSaveTransport9320?.retry?.()}catch(e){}try{setTimeout(()=>window.hlgbSyncRecovery9301?.fullSync?.('v9335-separation-cut',true),700)}catch(e){}}
async function confirmCut(cut){
 const id=recordId('cuts',cut);if(!id)throw new Error('Corte sem identificador para salvar.');
 lastCutId=id;
 if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação por registro indisponível para o corte.');
 const out=await window.hlgbRecordSaveWithRetry('cuts',id,clone(cut),false);
 if(out?.applied===true){
  const a=data()?.cuts||[],i=a.indexOf(cut);if(i>=0&&out.data)a[i]=out.data;
  saveLocal();confirmed++;lastError='';return true;
 }
 pending++;scheduleRecovery();return false;
}
function targeted(orderId){
 const o=orderById(orderId);if(!o)return 0;
 let c=null;
 try{if(typeof obterCorteDoPedido==='function')c=obterCorteDoPedido(o)}catch(e){lastError=sid(e?.message||e)}
 if(!c){
  const a=data()?.cuts||[];
  c=a.find(x=>sid(x?.orderId)===sid(o.id)&&sid(x?.status).toLowerCase()!=='finalizado')||null;
 }
 if(!c)return 0;
 const pid=uniqueProductId(o);
 if(pid&&!sid(c.productId).trim())c.productId=pid;
 saveLocal();runs++;lastOrderId=sid(orderId);
 Promise.resolve(confirmCut(c)).then(ok=>{
  if(ok)statusText('✅ Separação e corte deste pedido confirmados na nuvem','ok');
  else statusText('⚠️ Separação confirmada; corte protegido aguardando confirmação','warn');
 }).catch(err=>{
  failed++;pending++;lastError=sid(err?.message||err);scheduleRecovery();
  statusText('⚠️ Separação confirmada; corte protegido aguardando confirmação','warn');
  console.warn('[HLGB '+V+'] corte pós-separação pendente',err);
 });
 return 1;
}
function install(){
 const f=window.syncOrdersToCuts;
 if(typeof f!=='function')return false;
 if(f.__hlgb9335)return true;
 const w=function(){
  const oid=activeSeparationOrderId();
  if(oid)return targeted(oid);
  return f.apply(this,arguments);
 };
 w.__hlgb9335=true;w.__hlgb9335Original=f;window.syncOrdersToCuts=w;installs++;return true;
}
function stamp(){try{const cur=Number(window.HLGB_RELEASE_VERSION)||0;if(cur<93.35){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V}}catch(e){}}
function status(){return {version:V,installed:!!window.syncOrdersToCuts?.__hlgb9335,installs,runs,confirmed,pending,failed,lastOrderId,lastCutId,lastError}}
function boot(){install();stamp();let tries=0;const t=setInterval(()=>{tries++;install();if(tries>=50)clearInterval(t)},250);window.hlgbSeparationCutTarget9335={version:V,status,install}}
if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>setTimeout(boot,500),0);else setTimeout(boot,1200);
})();
