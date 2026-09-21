/* HLGB audit — baixa/exclusão confiável do Hub Financeiro */
(function(){
'use strict';
const V='v1';
const sid=v=>String(v??'');
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
function hub(){try{db.hubFinanceEntries=Array.isArray(db.hubFinanceEntries)?db.hubFinanceEntries:[];return db.hubFinanceEntries}catch(e){return []}}
function findEntry(id){return hub().find(x=>sid(x?.id??x?.__hlgbId)===sid(id))||null}
function snap(id){try{return hlgbRecordSnapshots?.hubFinanceEntries?.get?.(sid(id))||null}catch(e){return null}}
function explicitRestore(v){return !!(v&&['true','1','yes'].includes(String(v.__hlgb_explicit_restore??'').toLowerCase()))}
function localId(row){return sid(row?.id??row?.__hlgbId)}
function purgeTombstones(){
 try{
  const m=hlgbRecordSnapshots?.hubFinanceEntries;if(!m||typeof m.get!=='function')return 0;
  const before=hub().length;
  db.hubFinanceEntries=hub().filter(row=>{const s=m.get(localId(row));return !(s?.deleted_at&&!explicitRestore(row))});
  const removed=before-db.hubFinanceEntries.length;
  if(removed&&typeof localSaveOnly==='function')localSaveOnly();
  return removed;
 }catch(e){console.warn('[HLGB hub integrity '+V+'] purge',e);return 0}
}
function prunePending(){
 try{
  if(typeof window.hlgbPrunePendingTombstones==='function')return window.hlgbPrunePendingTombstones();
  const key='hlgb_records_pending_v91',raw=localStorage.getItem(key);if(!raw)return {changed:false,removed:0};
  const p=JSON.parse(raw),ops=Array.isArray(p?.modules?.hubFinanceEntries)?p.modules.hubFinanceEntries:[],keep=[];let removed=0;
  for(const op of ops){
   const s=snap(op?.id),restore=explicitRestore(op?.data);
   if(op&&op.deleted!==true&&s?.deleted_at&&!restore){removed++;continue}
   if(op)keep.push(op);
  }
  if(removed){
   if(keep.length)p.modules.hubFinanceEntries=keep;else delete p.modules.hubFinanceEntries;
   const any=Object.values(p.modules||{}).some(a=>Array.isArray(a)&&a.length);
   if(any)localStorage.setItem(key,JSON.stringify(p));else localStorage.removeItem(key);
  }
  return {changed:removed>0,removed};
 }catch(e){console.warn('[HLGB hub integrity '+V+'] pending',e);return {changed:false,removed:0}}
}
function removeLocal(id){
 const a=hub(),i=a.findIndex(x=>localId(x)===sid(id));if(i>=0)a.splice(i,1);
}
function upsertLocal(row){
 const a=hub(),id=localId(row),i=a.findIndex(x=>localId(x)===id),v=clone(row);
 if(i>=0)a[i]=v;else a.push(v);
}
async function online(){
 if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
 if(typeof hlgbRecordReady!=='undefined'&&!hlgbRecordReady){
  if(typeof hlgbEnsureRecordsOnlineAfterLogin!=='function'||!await hlgbEnsureRecordsOnlineAfterLogin())throw new Error('A nuvem não ficou disponível.');
 }
 if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação multiusuário indisponível.');
}
async function saveEntry(row,deleted=false){
 if(!row||localId(row)==='')throw new Error('Lançamento sem identificação.');
 await online();
 const id=localId(row);
 const payload=deleted?{...clone(row),__hlgb_explicit_delete:true}:clone(row);
 const out=await window.hlgbRecordSaveWithRetry('hubFinanceEntries',id,payload,!!deleted);
 if(!out||out.applied!==true)throw new Error(out?.reason||'A nuvem não confirmou a alteração.');
 if(deleted){
  if(!out.deleted_at)throw new Error('A nuvem respondeu sem confirmar a exclusão.');
  removeLocal(id);
 }else{
  if(out.deleted_at)throw new Error('Este lançamento já está excluído na nuvem.');
  upsertLocal(out.data||row);
 }
 prunePending();purgeTombstones();
 try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}
 return out;
}
function refresh(){
 purgeTombstones();prunePending();
 try{
  if(typeof window.renderHubFinance==='function')window.renderHubFinance();
  else if(typeof window.hlgbRenderHubSearch9248==='function')window.hlgbRenderHubSearch9248();
 }catch(e){}
}
function disableDeleteButtons(id,disabled){
 try{
  const s=sid(id);
  for(const b of document.querySelectorAll('button[onclick*="deleteHubFinanceEntry"]')){
   const oc=String(b.getAttribute('onclick')||'');
   if(oc.includes(s)){b.disabled=!!disabled;if(disabled)b.dataset.hlgbDeleteBusy='1';else delete b.dataset.hlgbDeleteBusy}
  }
 }catch(e){}
}

window.deleteHubFinanceEntry=async function(id){
 const e=findEntry(id);
 if(!e){purgeTombstones();refresh();return false}
 if(!confirm('Excluir este lançamento do Hub Financeiro?'))return false;
 disableDeleteButtons(id,true);
 try{
  await saveEntry(e,true);
  try{setCloudStatus('⚡ Online · lançamento excluído da nuvem','ok')}catch(_){}
  refresh();
  return true;
 }catch(err){
  console.error('[HLGB hub integrity '+V+'] exclusão',err);
  // Se outra atualização já confirmou o tombstone, trate como sucesso em vez de assustar a pessoa.
  const s=snap(id);
  if(s?.deleted_at){
   removeLocal(id);prunePending();purgeTombstones();try{localSaveOnly()}catch(_){}
   refresh();return true;
  }
  alert('A exclusão não foi confirmada na nuvem. O lançamento foi mantido para não perder informação.\n\n'+String(err?.message||err));
  refresh();
  return false;
 }finally{disableDeleteButtons(id,false)}
};

window.toggleHubFinanceEntry=async function(id){
 const e=findEntry(id);if(!e)return false;
 const next={...clone(e),status:String(e.status)==='Realizado'?'Previsto':'Realizado',updatedAt:new Date().toISOString()};
 next.realizedAt=next.status==='Realizado'?(e.realizedAt||new Date().toISOString().slice(0,10)):'';
 try{await saveEntry(next,false);refresh();return true}
 catch(err){console.error('[HLGB hub integrity '+V+'] status',err);alert('A mudança de status não foi confirmada na nuvem. O lançamento anterior foi preservado.');refresh();return false}
};

window.editHubFinanceEntry=function(id){
 const e=findEntry(id);if(!e)return false;
 if(typeof openModal!=='function'||typeof hlgb916HubForm!=='function'||typeof hlgb916ReadHubForm!=='function')return false;
 openModal('Editar lançamento do Hub',hlgb916HubForm(e)+'<button type="button" class="primary modalSave">☁️ Salvar alterações</button>',async()=>{
  const d=hlgb916ReadHubForm(e.flow);if(!d)return false;
  const next={...clone(e),...d,updatedAt:new Date().toISOString()},btn=document.querySelector('#modal .modalSave');
  if(btn){btn.disabled=true;btn.textContent='☁️ Salvando…'}
  try{await saveEntry(next,false);closeModal();refresh();return true}
  catch(err){console.error('[HLGB hub integrity '+V+'] edição',err);if(btn){btn.disabled=false;btn.textContent='☁️ Salvar alterações'}alert('A alteração não foi confirmada na nuvem. O lançamento anterior foi preservado.');return false}
 });
 try{setTimeout(()=>window.hlgb916ToggleHubChequeDate?.(),20)}catch(e){}
 return true;
};

const oldRender=window.renderHubFinance;
if(typeof oldRender==='function'&&!oldRender.__hlgbHubIntegrityV1){
 const wrapped=function(){purgeTombstones();prunePending();return oldRender.apply(this,arguments)};
 wrapped.__hlgbHubIntegrityV1=true;wrapped.__original=oldRender;window.renderHubFinance=wrapped;
}
const oldIncoming=window.hlgbRenderIncomingRecord;
if(typeof oldIncoming==='function'&&!oldIncoming.__hlgbHubIntegrityV1){
 const wrapped=function(module){const out=oldIncoming.apply(this,arguments);if(module==='hubFinanceEntries'){purgeTombstones();prunePending()}return out};
 wrapped.__hlgbHubIntegrityV1=true;wrapped.__original=oldIncoming;window.hlgbRenderIncomingRecord=wrapped;
}

try{purgeTombstones();prunePending()}catch(e){}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(()=>{purgeTombstones();prunePending()},500);setTimeout(()=>{purgeTombstones();prunePending()},1800)},0)}catch(e){}
window.hlgbHubPurgeTombstones=purgeTombstones;
window.hlgbHubSaveConfirmed=saveEntry;
window.HLGB_HUB_INTEGRITY_GUARD=V;
console.info('[HLGB] Hub Financeiro '+V+': exclusão confirmada, IDs texto/número e tombstones protegidos');
})();