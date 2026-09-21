/* HLGB audit — cadastro de facções confirmado por registro na nuvem */
(function(){
'use strict';
const V='v1';
const sid=v=>String(v??'');
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
const list=()=>{db.factionMasters=Array.isArray(db.factionMasters)?db.factionMasters:[];return db.factionMasters};
function find(id){return list().find(x=>sid(x?.id??x?.__hlgbId)===sid(id))||null}
function catalogNames(ids,items){
 try{if(typeof selectedCatalogNames==='function')return selectedCatalogNames(ids,items)}catch(e){}
 const wanted=new Set((ids||[]).map(sid));
 return (items||[]).filter(x=>wanted.has(sid(x?.id))).map(x=>x?.name).filter(Boolean).join(', ');
}
function checked(cls){try{return [...document.querySelectorAll(cls+':checked')].map(x=>{const v=x.value;return /^-?\d+(?:\.\d+)?$/.test(String(v))?+v:v})}catch(e){return []}}
function readForm(base={}){
 const name=(document.getElementById('mfname')?.value||'').trim();if(!name)throw new Error('Informe o nome da facção.');
 const serviceTypeIds=checked('.mfServiceCheck'),machineIds=checked('.mfMachineCheck');
 const loc=document.getElementById('mflocation')?.value||'';
 return {...clone(base),
  name,
  address:(document.getElementById('mfaddress')?.value||'').trim(),
  phone:(document.getElementById('mfphone')?.value||'').trim(),
  pix:(document.getElementById('mfpix')?.value||'').trim(),
  serviceTypeIds,machineIds,
  serviceType:catalogNames(serviceTypeIds,db.serviceTypes||[]),
  machines:catalogNames(machineIds,db.machines||[]),
  productionLocationId:loc?(isNaN(+loc)?loc:+loc):null,
  active:base?.active!==false,
  updatedAt:new Date().toISOString()
 };
}
async function ready(){
 if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
 if(typeof hlgbRecordReady!=='undefined'&&!hlgbRecordReady){
  if(typeof hlgbEnsureRecordsOnlineAfterLogin!=='function'||!await hlgbEnsureRecordsOnlineAfterLogin())throw new Error('A nuvem não ficou disponível.');
 }
 if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação multiusuário indisponível.');
}
function replaceLocal(id,data,deleted=false){
 const a=list(),i=a.findIndex(x=>sid(x?.id??x?.__hlgbId)===sid(id));
 if(deleted){if(i>=0)a.splice(i,1);return}
 const v=clone(data);if(v&&v.id==null)v.id=isNaN(+id)?id:+id;
 if(i>=0)a[i]=v;else a.push(v);
}
async function saveConfirmed(row,deleted=false){
 if(!row||row.id==null)throw new Error('Cadastro de facção sem identificação.');
 await ready();
 const id=sid(row.id),payload=deleted?{...clone(row),__hlgb_explicit_delete:true}:clone(row);
 const out=await window.hlgbRecordSaveWithRetry('factionMasters',id,payload,!!deleted);
 if(!out||out.applied!==true)throw new Error('A nuvem não confirmou o cadastro da facção.');
 if(deleted&& !out.deleted_at)throw new Error('A nuvem respondeu sem confirmar a exclusão da facção.');
 if(!deleted&&out.deleted_at)throw new Error('Este cadastro já está excluído na nuvem.');
 replaceLocal(id,out.data||row,deleted);
 try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}
 return clone(out.data||row);
}
function buttonBusy(btn,on,label){
 if(!btn)return;if(on){btn.disabled=true;btn.dataset.oldText=btn.textContent||'';btn.textContent=label||'☁️ Salvando…'}
 else{btn.disabled=false;btn.textContent=btn.dataset.oldText||'💾 Salvar alterações';delete btn.dataset.oldText}
}
function rerender(){try{window.renderFactions?.()}catch(e){}}

window.newFactionMaster=function(){
 if(typeof openModal!=='function'||typeof factionMasterForm!=='function')return false;
 openModal('Nova facção',factionMasterForm({})+'<button type="button" class="primary modalSave">☁️ Salvar facção</button>',async()=>{
  const btn=document.querySelector('#modal .modalSave');buttonBusy(btn,true,'☁️ Salvando facção…');
  try{
   const row=readForm({id:Date.now()+Math.floor(Math.random()*1000),active:true,createdAt:new Date().toISOString()});
   await saveConfirmed(row,false);closeModal();rerender();try{setCloudStatus('✅ Facção salva na nuvem','ok')}catch(_){}
   return true;
  }catch(err){buttonBusy(btn,false);console.error('[HLGB faction master '+V+'] novo',err);alert(String(err?.message||err));return false}
 });
 return true;
};

window.editFactionMaster=function(id){
 const base=find(id);if(!base)return false;
 if(typeof openModal!=='function'||typeof factionMasterForm!=='function')return false;
 openModal('Editar facção',factionMasterForm(base)+'<button type="button" class="primary modalSave">☁️ Salvar alterações</button>',async()=>{
  const btn=document.querySelector('#modal .modalSave');buttonBusy(btn,true,'☁️ Confirmando na nuvem…');
  try{
   const next=readForm(base);const saved=await saveConfirmed(next,false);
   if((saved.pix??'')!==(next.pix??''))throw new Error('A nuvem respondeu sem confirmar a chave PIX informada.');
   closeModal();rerender();try{setCloudStatus('✅ Facção atualizada na nuvem','ok')}catch(_){}
   return true;
  }catch(err){buttonBusy(btn,false);console.error('[HLGB faction master '+V+'] editar',err);alert('A alteração não foi confirmada. O cadastro anterior foi preservado.\n\n'+String(err?.message||err));return false}
 });
 return true;
};

window.delFactionMaster=async function(id){
 const row=find(id);if(!row)return false;
 if(!confirm('Excluir esta facção do cadastro? Os lançamentos históricos serão preservados.'))return false;
 try{await saveConfirmed(row,true);rerender();return true}
 catch(err){console.error('[HLGB faction master '+V+'] excluir',err);alert('A exclusão não foi confirmada na nuvem. O cadastro foi mantido.');return false}
};

window.hlgbFactionMasterReadForm=readForm;
window.hlgbFactionMasterSaveConfirmed=saveConfirmed;
window.HLGB_FACTION_MASTER_INTEGRITY_GUARD=V;
console.info('[HLGB] cadastro de facções '+V+': PIX e alterações só fecham após confirmação da nuvem');
})();