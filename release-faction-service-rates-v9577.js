/* HLGB v95.77 — tabela central de embalagem e travetada.
 * Usa o registro existente factionSettings/traveta; não altera pagamentos antigos. */
(function(){
'use strict';
if(window.hlgbFactionRates9577)return;
const VERSION='95.77',ID='traveta';
const sid=x=>String(x??''),q=x=>Number(sid(x).replace(',','.'));
const esc=x=>sid(x).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
const dbRef=()=>{try{return typeof db!=='undefined'?db:window.db}catch(_){return window.db||{}}};
const setting=()=>{const db=dbRef();return (Array.isArray(db?.factionSettings)?db.factionSettings:[]).find(x=>sid(x?.id)===ID)||null};
const state={lastError:'',lastSaved:'',saving:false};
function category(product){
 const s=sid(product?.name||product?.productName||product).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/calcinha|fio dental/.test(s))return 'calcinha';
 if(/doll/.test(s))return 'doll';
 if(/camisola/.test(s))return 'camisola';
 return 'outros';
}
function rates(){
 const p=setting()||{};
 const pick=(name,defaultValue)=>{const val=p[name];return val!=null&&Number.isFinite(Number(val))&&Number(val)>=0?Number(val):defaultValue};
 return {
  embalagem:{camisola:pick('packCamisolaV9577',.25),doll:pick('packDollV9577',.25),calcinha:pick('packCalcinhaV9577',.15)},
  travetaUnit:p.travetaUnitValue!=null&&q(p.travetaUnitValue)>=0?q(p.travetaUnitValue):null,
  updatedAt:sid(p.updatedAt),stored:!!setting()};
}
function embalagem(product){
 const type=category(product);return rates().embalagem[type]??null;
}
function traveta(master){
 if(master?.travetaDeductionUnit!=null&&Number.isFinite(Number(master.travetaDeductionUnit))&&Number(master.travetaDeductionUnit)>=0)
  return Number(master.travetaDeductionUnit);
 return rates().travetaUnit;
}
async function save(input){
 if(state.saving)throw Error('Já existe atualização em andamento.');
 const fields=['packCamisolaV9577','packDollV9577','packCalcinhaV9577','travetaUnitValue'],parsed={};
 for(const key of fields){
  const raw=sid(input?.[key]).trim(),n=q(raw);
  if(raw===''||!Number.isFinite(n)||n<0||n>1000)throw Error('Informe um preço não negativo para '+key+'.');
  parsed[key]=Math.round(n*100)/100;
 }
 if(window.__HLGB_AUTH_READY!==true)throw Error('Entre no HLGB para salvar preços.');
 const guard=window.hlgbWalIdbGuard9536;
 if(typeof guard?.probe!=='function'||typeof guard?.ids!=='function')throw Error('Proteção de sincronização indisponível.');
 await guard.probe();
 if(guard.status?.()?.readFailed)throw Error('WAL local não pôde ser lida.');
 if([...guard.ids(),...window.hlgbRecordPendingIdentitySet9535?.()||[]].map(sid).some(x=>x==='factionSettings::'+ID||x==='factionSettings|'+ID))
  throw Error('A tabela de preços tem alteração pendente neste computador.');
 state.saving=true;state.lastError='';
 try{
  if(typeof window.cloudEnsureFreshSession==='function')await window.cloudEnsureFreshSession(false);
  const save=window.hlgbRecordSaveWithRetry;
  if(typeof save!=='function')throw Error('Nuvem indisponível.');
  const next={...(setting()||{id:ID}),...parsed,updatedAt:new Date().toISOString()};
  const result=await save('factionSettings',ID,next,false);
  if(!result||result.applied!==true)throw Error(result?.reason||'A nuvem não confirmou a tabela.');
  const db=dbRef();if(!Array.isArray(db.factionSettings))db.factionSettings=[];
  const i=db.factionSettings.findIndex(x=>sid(x.id)===ID);
  if(i>=0)db.factionSettings[i]=result.data||next;else db.factionSettings.push(result.data||next);
  try{window.localSaveOnly?.()}catch(_){}
  state.lastSaved=new Date().toISOString();return rates();
 }catch(e){state.lastError=sid(e?.message||e);throw e}
 finally{state.saving=false}
}
function open(){
 if(typeof window.openModal!=='function')return false;
 const r=rates(),tr=r.travetaUnit;
 const html='<div id="factionRates9577" class="panel" style="padding:12px">'+
 '<p class="sub">Tabela sugerida para embalagem. A travetada usa o valor cadastrado neste servidor, sem modificar lançamentos anteriores.</p>'+
 '<div class="grid">'+
 [['packCamisolaV9577','Embalagem camisola (R$/peça)',r.embalagem.camisola],
  ['packDollV9577','Embalagem doll (R$/peça)',r.embalagem.doll],
  ['packCalcinhaV9577','Embalagem calcinha (R$/peça)',r.embalagem.calcinha],
  ['travetaUnitValue','Travetada (R$/peça)',tr]].map(([key,title,value])=>
  '<div class="field"><label>'+esc(title)+'</label><input id="fRate-'+key+'" type="number" min="0" step="0.01" value="'+(value==null?'':Number(value).toFixed(2))+'"></div>').join('')+
 '</div><p class="sub">Caso um tipo de produto não seja reconhecido, o valor deve ser informado manualmente.</p>'+
 '<div id="fRate-message" role="status"></div><button type="button" class="primary modalSave">☁️ Salvar tabela de serviços</button></div>';
 window.openModal('Preços de embalagem e travetada',html,async()=>{
  const host=document.getElementById('factionRates9577'),feedback=host?.querySelector('#fRate-message'),btn=host?.querySelector('.modalSave');
  if(btn)btn.disabled=true;if(feedback)feedback.textContent='Salvando na nuvem…';
  try{
   const input={};for(const key of ['packCamisolaV9577','packDollV9577','packCalcinhaV9577','travetaUnitValue'])
    input[key]=host.querySelector('#fRate-'+key)?.value;
   await save(input);
   window.closeModal?.();window.setCloudStatus?.('Tabela de embalagem e travetada salva na nuvem.','ok');
   return true;
  }catch(e){if(feedback)feedback.textContent='⚠ '+sid(e?.message||e);if(btn)btn.disabled=false;return false}
 });
 return true;
}
window.hlgbFactionRates9577={version:VERSION,category,embalagem,traveta,rates,save,open,status:()=>({...state})};
console.info('[HLGB] v'+VERSION+' tabela de embalagem/travetada centralizada');
})();