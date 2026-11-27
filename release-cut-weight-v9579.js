/* HLGB v95.79 — peso do corte depois da finalização.
 * Registro histórico append-only no mesmo cutId, sem reabrir etapa ou recalcular grade.
 * Gravação autenticada via save oficial e releitura remota com WAL protegido. */
(function(){
'use strict';
if(window.hlgbCutWeight9579)return;
const V='95.79',busy=new Set(),state={lastError:'',lastSuccess:'',attempts:0,confirmed:0};
const sid=x=>String(x??''),num=x=>Number(sid(x).replace(',','.')),money=x=>Number(x||0).toLocaleString('pt-BR',{maximumFractionDigits:3});
const esc=x=>sid(x).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
const dbRef=()=>{try{return typeof db!=='undefined'?db:window.db}catch(_){return window.db||{}}};
const cut=id=>{const rows=(dbRef()?.cuts||[]).filter(x=>x&&!x.deletedAt&&!x.deleted_at&&x.deleted!==true&&x._deleted!==true&&sid(x.id)===sid(id));return rows.length===1?rows[0]:null};
const eligible=c=>!!c&&!c.modelSplitParentV1&&!c.hiddenByModelSplitV1&&!/cancel|desmembrado/.test(sid(c.status).toLowerCase());
// A gravação, confirmação remota, histórico e proteção WAL ficam neste arquivo
// comercial. Só a validação pura pode usar o módulo independente, com fallback.
const weightCore=window.HLGB_CUT_WEIGHT_CORE_9623||null;
function validateLegacy(input){
 const total=num(input?.totalKg),used=num(input?.usedKg||0),waste=num(input?.wasteKg||0),note=sid(input?.note).trim();
 if(!Number.isFinite(total)||total<=0||total>20000)throw Error('Informe o peso total do corte em kg (maior que zero).');
 for(const [name,value] of [['usado',used],['refugo',waste]])if(!Number.isFinite(value)||value<0||value>20000)throw Error('Peso '+name+' inválido.');
 if(used>total+.001||waste>total+.001)throw Error('Peso usado/refugo não pode ser maior que o peso total.');
 if(note.length>300)throw Error('Observação com até 300 caracteres.');
 return {totalKg:+total.toFixed(3),usedKg:+used.toFixed(3),wasteKg:+waste.toFixed(3),note};
}
function validate(input){
 if(typeof weightCore?.validate==='function'){
  try{return weightCore.validate(input)}catch(_){return validateLegacy(input)}
 }
 return validateLegacy(input);
}

async function safe(id){
 if(window.__HLGB_AUTH_READY!==true)throw Error('Entre no HLGB para salvar o peso.');
 const g=window.hlgbWalIdbGuard9536;
 if(typeof g?.probe!=='function'||typeof g?.ids!=='function')throw Error('Proteção da sincronização local indisponível. Recarregue sem apagar dados.');
 await g.probe();if(g.status?.()?.readFailed)throw Error('Não foi possível conferir WAL deste navegador.');
 const ids=new Set([...g.ids(),...(window.hlgbRecordPendingIdentitySet9535?.()||[])].map(sid));
 if(ids.has('cuts::'+id)||ids.has('cuts|'+id))throw Error('Este corte possui atualização pendente. Confira a sincronização antes de alterar.');
 if(typeof window.cloudEnsureFreshSession==='function')await window.cloudEnsureFreshSession(false);
}
async function remote(id){
 if(typeof window.cloudRequest!=='function')throw Error('Não há como comprovar a releitura do corte no servidor.');
 const rows=await window.cloudRequest('hlgb_records?select=entity_id,data,deleted_at&module=eq.cuts&entity_id=eq.'+encodeURIComponent(sid(id))+'&limit=1',{method:'GET'});
 return Array.isArray(rows)&&rows[0]&&!rows[0].deleted_at?rows[0].data:null;
}
async function save(id,input){
 if(busy.has(sid(id)))throw Error('Gravação de peso em andamento.');
 busy.add(sid(id));state.attempts++;state.lastError='';
 try{
  const c=cut(id);if(!c)throw Error('Corte não encontrado. Nada foi alterado.');
  const payload=validate(input);await safe(sid(id));
  const now=new Date().toISOString(),eventId='cutweight-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
  const previous=c.cutWeightV9579||null,history=Array.isArray(c.cutWeightEventsV9579)?c.cutWeightEventsV9579:[];
  const event={id:eventId,at:now,kind:'cut_weight_recorded',before:previous,after:payload,cutStatusAtTime:sid(c.status),
   cutterId:c.cutterId??null};
  const next={...JSON.parse(JSON.stringify(c)),cutWeightV9579:payload,cutWeightEventsV9579:[...history,event],updatedAt:now};
  if(typeof window.hlgbRecordSaveWithRetry!=='function')throw Error('Transporte do servidor não disponível.');
  const out=await window.hlgbRecordSaveWithRetry('cuts',sid(id),next,false);
  if(!out||out.applied!==true)throw Error(out?.reason||'A nuvem não confirmou o peso.');
  const verified=await remote(id);
  if(!verified||!(verified.cutWeightEventsV9579||[]).some(x=>x.id===eventId)||
    JSON.stringify(verified.cutWeightV9579)!==JSON.stringify(payload))
   throw Error('A nuvem não comprovou o peso gravado. Confira antes de reenviar.');
  if(sid(verified.status)!==sid(c.status)||sid(verified.finishedAt)!==sid(c.finishedAt))
   throw Error('O status de corte mudou durante o salvamento; consulte o histórico antes de reenviar.');
  const rows=dbRef().cuts,i=rows.findIndex(x=>sid(x.id)===sid(id));if(i>=0)rows[i]=verified;
  try{window.localSaveOnly?.()}catch(_){}
  state.confirmed++;state.lastSuccess='Peso do corte registrado e confirmado no servidor.';
  try{window.renderCuts?.();window.renderCutterHistory9250?.()}catch(_){}
  return {ok:true,cut:verified,event};
 }catch(e){state.lastError=sid(e?.message||e);throw e}finally{busy.delete(sid(id))}
}
function show(id){
 const c=cut(id);if(!eligible(c))return false;
 if(typeof window.openModal!=='function')return false;
 const w=c.cutWeightV9579||{},h=Array.isArray(c.cutWeightEventsV9579)?c.cutWeightEventsV9579:[];
 const entries=h.slice(-12).reverse().map(e=>'<div class="sub">'+esc(e.at)+' · total '+money(e.after?.totalKg)+' kg · usado '+money(e.after?.usedKg)+' kg · refugo '+money(e.after?.wasteKg)+' kg · '+esc(e.after?.note||'')+'</div>').join('');
 const html='<div id="cutWeight9579" class="panel" style="padding:12px"><p class="sub">O peso pode ser registrado mesmo se o corte já estiver finalizado. A etapa e a grade permanecem como estão.</p>'+
 '<div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px">'+
 '<div class="field"><label>Peso total do corte (kg)</label><input type="number" min="0.001" step="0.001" id="cw79-total" value="'+esc(w.totalKg??'')+'"></div>'+
 '<div class="field"><label>Peso utilizado (kg)</label><input type="number" min="0" step="0.001" id="cw79-used" value="'+esc(w.usedKg??'')+'"></div>'+
 '<div class="field"><label>Peso refugo / lixo (kg)</label><input type="number" min="0" step="0.001" id="cw79-waste" value="'+esc(w.wasteKg??'')+'"></div></div>'+
 '<div class="field"><label>Observação</label><input id="cw79-note" maxlength="300" placeholder="Rolo, conferência, diferença ou observação" value="'+esc(w.note||'')+'"></div>'+
 '<h4>Histórico de pesagens</h4>'+(entries||'<div class="sub">Nenhuma pesagem cadastrada.</div>')+
 '<div id="cw79-feedback" role="status" class="sub"></div><button type="button" class="primary modalSave">☁️ Salvar peso do corte</button></div>';
 window.openModal('⚖️ Peso do corte · '+esc(c.product||c.productId||c.id),html,async()=>{
  const host=document.getElementById('cutWeight9579'),feedback=host?.querySelector('#cw79-feedback'),btn=host?.querySelector('.modalSave');
  if(btn)btn.disabled=true;if(feedback)feedback.textContent='Confirmando a pesagem na nuvem…';
  try{
   await save(id,{totalKg:host.querySelector('#cw79-total')?.value,usedKg:host.querySelector('#cw79-used')?.value,
    wasteKg:host.querySelector('#cw79-waste')?.value,note:host.querySelector('#cw79-note')?.value});
   window.closeModal?.();return true;
  }catch(e){if(feedback)feedback.textContent='⚠ '+sid(e?.message||e);if(btn)btn.disabled=false;return false}
 });
 return true;
}
function rowId(tr){
 for(const b of tr.querySelectorAll('button[onclick]')){
  const raw=b.getAttribute('onclick')||'',m=raw.match(/(?:hlgbEditCut9189|editCut|finishCut)\(([^)]+)\)/);
  if(m)return m[1].replace(/['"]/g,'').trim();
 }
 return sid(tr.dataset.cutId||'');
}
function decorateRow(row,key,model=false){
 const c=cut(key),buttons=Array.from(row?.querySelectorAll?.('.hlgbCutWeight9579')||[]);
 if(!eligible(c)||row.dataset.hlgbSplitAggregateHidden==='1'||(model&&c.modelSplitChildV1!==true)){buttons.forEach(b=>b.remove());return false}
 if(model&&typeof window.hlgbCutModelSplit?.competingModelCuts==='function'&&window.hlgbCutModelSplit.competingModelCuts(c).length>1){buttons.forEach(b=>b.remove());return false}
 const host=model?(Array.from(row.querySelectorAll('.toolbar')).filter(n=>!n.closest('details')).at(-1)||row):Array.from(row.children).filter(n=>!n.hasAttribute('data-hlgb-cut-summary9761')).at(-1);
 if(!host)return false;
 let button=buttons.find(b=>b.dataset.cutWeightId===sid(key));
 for(const b of buttons)if(b!==button)b.remove();
 if(!button){button=document.createElement('button');button.type='button';button.className='secondary hlgbCutWeight9579';button.dataset.cutWeightId=sid(key);host.appendChild(button)}
 if(button.parentElement!==host)host.appendChild(button);
 button.textContent='⚖️ Peso do corte';button.title=c.cutWeightV9579?'Consultar ou atualizar pesagem registrada':'Registrar peso total, utilizado e refugo';
 button.onclick=()=>{
  const fresh=cut(key);
  if(!row.isConnected||!eligible(fresh)||(model&&(row.dataset.hlgbCutModelId!==sid(key)||fresh.modelSplitChildV1!==true))||(!model&&rowId(row)!==sid(key))){alert('Corte mudou. Atualize a lista.');return}
  if(window.__HLGB_AUTH_READY!==true||typeof canOpenPage!=='function'||canOpenPage('corte')!==true){alert('Entre com permissão de Corte para registrar peso.');return}
  if(model&&typeof window.hlgbCutModelSplit?.competingModelCuts==='function'&&window.hlgbCutModelSplit.competingModelCuts(fresh).length>1){alert('Corte duplicado: confira antes de pesar.');return}
  show(key);
 };
 return true;
}
function decorate(){
 for(const id of ['cutTable','dailyCutsTable']){
  const root=document.getElementById(id);if(!root)continue;
  root.querySelectorAll('tbody tr').forEach(tr=>{const key=rowId(tr);if(key)decorateRow(tr,key)});
 }
 document.querySelectorAll('#hlgbCutSplitPanel [data-hlgb-cut-model-id]').forEach(row=>decorateRow(row,row.dataset.hlgbCutModelId,true));
}
function wrapper(name){
 const fn=window[name];if(typeof fn!=='function'||fn.__hlgbWeight9579)return;
 const w=function(){const result=fn.apply(this,arguments);setTimeout(decorate,0);return result};
 w.__original=fn;w.__hlgbWeight9579=true;window[name]=w;
}
function install(){wrapper('renderCuts');wrapper('renderDailyCuts');decorate()}
window.hlgbCutWeight9579={version:V,cut,validate,save,remote,show,decorate,decorateRow,install,status:()=>({...state})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
[500,1600].forEach(ms=>setTimeout(install,ms));
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(install,450));
console.info('[HLGB] v'+V+' pesagem de corte após finalização com histórico');
})();