/* HLGB v93.24 — entrega direta e verificada de novos lançamentos do Hub */
(function(){
'use strict';
const V='93.24',MODULE='hubFinanceEntries';
if(window.hlgbHubDelivery9324?.version===V)return;
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const previous=window.hlgbHubSaveConfirmed;
let installs=0,directAttempts=0,directConfirmed=0,fallbackExisting=0,failed=0,lastError='',lastId='',lastAt='';
function data(){try{return typeof db!=='undefined'?db:window.db}catch(e){return window.db}}
function rows(){const d=data();if(!d)return[];d[MODULE]=Array.isArray(d[MODULE])?d[MODULE]:[];return d[MODULE]}
function idOf(row){const v=row?.id??row?.__hlgbId;return v==null?'':sid(v)}
function upsert(row){const id=idOf(row);if(!id)return false;const a=rows(),next=clone(row),i=a.findIndex(x=>idOf(x)===id);if(i>=0)a[i]=next;else a.push(next);try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}return true}
function status(text,type=''){try{if(typeof setCloudStatus==='function')setCloudStatus(text,type);else window.setCloudStatus?.(text,type)}catch(e){}}
async function cloudRow(id){
 if(typeof cloudRequest!=='function'&&typeof window.cloudRequest!=='function')throw new Error('Transporte da nuvem indisponível.');
 const req=typeof cloudRequest==='function'?cloudRequest:window.cloudRequest;
 const out=await req(`hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at,updated_by&module=eq.${encodeURIComponent(MODULE)}&entity_id=eq.${encodeURIComponent(id)}&limit=1`,{method:'GET'});
 return Array.isArray(out)&&out.length?out[0]:null;
}
async function rawCreate(id,payload){
 directAttempts++;lastId=sid(id);lastAt=new Date().toISOString();
 try{if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false)}catch(e){}
 let out;
 const rpc=(typeof hlgbRecordRpcSave==='function'?hlgbRecordRpcSave:window.hlgbRecordRpcSave);
 if(typeof rpc==='function')out=await rpc(MODULE,sid(id),clone(payload),0,false);
 else {
  const req=typeof cloudRequest==='function'?cloudRequest:window.cloudRequest;
  if(typeof req!=='function')throw new Error('RPC de gravação indisponível.');
  out=await req('rpc/hlgb_save_record',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_module:MODULE,p_entity_id:sid(id),p_data:clone(payload),p_expected_revision:0,p_deleted:false})});
  if(Array.isArray(out))out=out[0];
 }
 if(!out?.applied)throw new Error('O Supabase não confirmou o novo lançamento.');
 const verified=await cloudRow(id);
 if(!verified||verified.deleted_at)throw new Error('A gravação respondeu, mas o lançamento não apareceu na nuvem.');
 const saved=clone(verified.data||out.data||payload);upsert(saved);
 try{
  if(typeof hlgbRecordSnapshots!=='undefined'){
   const m=hlgbRecordSnapshots[MODULE]||new Map();m.set(sid(id),{data:clone(saved),deleted_at:verified.deleted_at||null,revision:+verified.revision||+out.revision||1,updated_at:verified.updated_at||out.updated_at||new Date().toISOString(),updated_by:verified.updated_by||out.updated_by||null});hlgbRecordSnapshots[MODULE]=m;
  }
  if(typeof hlgbRecordPendingStore==='function')hlgbRecordPendingStore();
 }catch(e){}
 try{await window.hlgb955ReconcileServer?.();await window.hlgb955FlushSilent?.()}catch(e){}
 directConfirmed++;lastError='';status('✅ Salvo na nuvem','ok');return {applied:true,direct:true,data:saved,revision:verified.revision,updated_at:verified.updated_at,deleted_at:null}
}
function queueRecovery(){try{window.hlgbSaveTransport9320?.retry?.()}catch(e){}try{setTimeout(()=>window.hlgbSyncRecovery9301?.fullSync?.('hub-delivery-9324',true),500)}catch(e){}}
async function save(row,deleted=false){
 if(deleted||!row){if(typeof previous==='function')return previous(row,deleted);throw new Error('Salvamento anterior do Hub indisponível.');}
 const id=idOf(row);if(!id)throw new Error('Lançamento sem identificação.');
 const payload=clone(row);payload.updatedAt=payload.updatedAt||new Date().toISOString();
 // Para registro que já existe na nuvem, mantém o fluxo normal com controle de revisão/conflito.
 let existing=null;try{existing=await cloudRow(id)}catch(e){lastError=sid(e?.message||e)}
 if(existing){fallbackExisting++;if(typeof previous==='function')return previous(payload,false);throw new Error('Salvamento anterior do Hub indisponível.');}
 // Registro novo: salva localmente primeiro, mas a confirmação usa o RPC base diretamente.
 if(!upsert(payload))throw new Error('Não foi possível proteger o lançamento neste aparelho.');
 status('💾 Salvo no aparelho · enviando para a nuvem…','warn');
 Promise.resolve().then(()=>rawCreate(id,payload)).catch(err=>{failed++;lastError=sid(err?.message||err);console.error('[HLGB Hub '+V+'] entrega direta',err);status('⚠️ Salvo no aparelho · aguardando confirmação da nuvem','warn');queueRecovery()});
 return {applied:true,localFirst:true,pending:true,directDelivery:true,data:clone(payload),deleted_at:null};
}
function install(){window.hlgbHubSaveConfirmed=save;installs++;try{const cur=Number(window.HLGB_RELEASE_VERSION)||0;if(cur<93.24){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V;const b=document.querySelector('#loginScreen b');if(b&&/Versão/i.test(b.textContent||''))b.textContent='Versão v'+V}}catch(e){}return true}
function state(){return {version:V,installs,directAttempts,directConfirmed,fallbackExisting,failed,lastError,lastId,lastAt,authoritative:window.hlgbHubSaveConfirmed===save}}
install();let n=0;const timer=setInterval(()=>{n++;if(window.hlgbHubSaveConfirmed!==save)install();if(n>=120)clearInterval(timer)},500);
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(install,150),0)}catch(e){}
window.hlgbHubDelivery9324={version:V,install,state,save,cloudRow,rawCreate};
console.info('[HLGB] v'+V+' entrega direta e verificada de novos lançamentos do Hub ativa');
})();
