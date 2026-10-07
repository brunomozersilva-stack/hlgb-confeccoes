/* HLGB v93.22 — ações críticas de salvar: Hub local-first + editor autoritativo */
(function(){
'use strict';
const V='93.22';
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const previousSave=window.hlgbHubSaveConfirmed;
let installs=0,saves=0,confirmed=0,pending=0,failed=0,lastError='',lastAt='';
function data(){try{return typeof db!=='undefined'?db:window.db}catch(e){return window.db}}
function hub(){const d=data();if(!d)return[];d.hubFinanceEntries=Array.isArray(d.hubFinanceEntries)?d.hubFinanceEntries:[];return d.hubFinanceEntries}
function idOf(row){const direct=row?.id??row?.__hlgbId;if(direct!=null&&sid(direct).trim())return sid(direct);try{if(typeof window.hlgbHubResolveRecordId==='function'){const x=window.hlgbHubResolveRecordId(row);if(x!=null&&sid(x).trim())return sid(x)}}catch(e){}try{const a=hub(),i=a.indexOf(row);if(i>=0&&typeof hlgbRecordId==='function'){const x=hlgbRecordId('hubFinanceEntries',row,i);if(x!=null&&sid(x).trim())return sid(x)}}catch(e){}return ''}
function upsert(row,id){const a=hub(),rid=sid(id||idOf(row));if(!rid)return false;const next=clone(row);if(next.id==null&&next.__hlgbId==null)next.__hlgbId=rid;const i=a.findIndex(x=>idOf(x)===rid);if(i>=0)a[i]=next;else a.push(next);return true}
function localSave(){try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}}
function status(text,type=''){try{if(typeof setCloudStatus==='function')setCloudStatus(text,type);else window.setCloudStatus?.(text,type)}catch(e){}}
function queue(id,payload){if(typeof window.hlgbHubQueuePending==='function')return window.hlgbHubQueuePending(id,clone(payload),false);return false}
function recovery(){try{window.hlgbSaveTransport9320?.retry?.()}catch(e){}try{setTimeout(()=>window.hlgbSyncRecovery9301?.fullSync?.('v9322-hub-save',true),500)}catch(e){}}
function clearPendingSpecific(id,payload){try{const key='hlgb_records_pending_v91',p=JSON.parse(localStorage.getItem(key)||'null');if(!p?.modules)return false;const a=Array.isArray(p.modules.hubFinanceEntries)?p.modules.hubFinanceEntries:[],keep=a.filter(op=>!(op&&sid(op.id)===sid(id)&&op.deleted!==true&&JSON.stringify(op.data)===JSON.stringify(payload)));if(keep.length===a.length)return false;if(keep.length)p.modules.hubFinanceEntries=keep;else delete p.modules.hubFinanceEntries;const any=Object.values(p.modules).some(x=>Array.isArray(x)&&x.length);if(any)localStorage.setItem(key,JSON.stringify(p));else localStorage.removeItem(key);return true}catch(e){return false}}
function cloudConfirm(id,payload){Promise.resolve().then(async()=>{try{if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação multiusuário indisponível.');const out=await window.hlgbRecordSaveWithRetry('hubFinanceEntries',sid(id),clone(payload),false);if(out?.applied===true&&!out?.deleted_at){upsert(out.data||payload,id);localSave();clearPendingSpecific(id,payload);confirmed++;lastError='';status('✅ Salvo na nuvem','ok');return}pending++;recovery();status('⚠️ Hub salvo no aparelho · aguardando confirmação da nuvem','warn')}catch(err){failed++;pending++;lastError=sid(err?.message||err);recovery();status('⚠️ Hub salvo no aparelho · aguardando confirmação da nuvem','warn');console.info('[HLGB '+V+'] Hub preservado localmente; nuvem pendente:',lastError)}})}
async function save(row,deleted=false){
 if(deleted){if(typeof previousSave==='function')return previousSave(row,true);const id=idOf(row);if(!id)throw new Error('Lançamento sem identificação.');if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação multiusuário indisponível.');return window.hlgbRecordSaveWithRetry('hubFinanceEntries',id,clone(row),true)}
 if(!row)throw new Error('Lançamento inválido.');const id=idOf(row);if(!id)throw new Error('Lançamento sem identificação.');const payload=clone(row);if(payload.id==null&&payload.__hlgbId==null)payload.__hlgbId=id;payload.updatedAt=payload.updatedAt||new Date().toISOString();if(!upsert(payload,id))throw new Error('Não foi possível atualizar o lançamento neste aparelho.');localSave();try{queue(id,payload)}catch(err){lastError=sid(err?.message||err);throw err}saves++;lastAt=new Date().toISOString();status('💾 Salvo no aparelho · confirmando na nuvem…','warn');cloudConfirm(id,payload);return {applied:true,localFirst:true,queued:true,pending:true,data:clone(payload),deleted_at:null}
}
function install(){
 window.hlgbHubSaveConfirmed=save;
 if(window.hlgbHubEditor9270?.open){window.editHubFinanceEntry=window.hlgbHubEditor9270.open;window.quickEditHub9185=id=>window.hlgbHubEditor9270.open(id,{quick:true})}
 installs++;
 try{const cur=Number(window.HLGB_RELEASE_VERSION)||0;if(cur<93.22){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V}}catch(e){}
 return true
}
function state(){return {version:V,installs,saves,confirmed,pending,failed,lastError,lastAt,saveAuthoritative:window.hlgbHubSaveConfirmed===save,editorAuthoritative:window.hlgbHubEditor9270?.open?window.editHubFinanceEntry===window.hlgbHubEditor9270.open:null}}
install();let tries=0;const timer=setInterval(()=>{tries++;if(window.hlgbHubSaveConfirmed!==save||window.hlgbHubEditor9270?.open&&window.editHubFinanceEntry!==window.hlgbHubEditor9270.open)install();if(tries>=50)clearInterval(timer)},250);
window.hlgbSaveActions9322={version:V,install,state,save};
console.info('[HLGB] v'+V+' ações de salvar ativas — Hub local-first e editor autoritativo');
})();
