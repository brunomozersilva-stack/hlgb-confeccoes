/* HLGB audit — limite semanal autoritativo por registro */
(function(){
'use strict';
const V='normalized-confirmed-v2';
const sid=v=>String(v??'');
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
function rows(){db.weeklyPurchaseLimits=Array.isArray(db.weeklyPurchaseLimits)?db.weeklyPurchaseLimits:[];return db.weeklyPurchaseLimits}
function sync(){
 try{
  db.config=(db.config&&typeof db.config==='object')?db.config:{};
  const a=rows().filter(x=>x&&x.id!=null);
  db.config.weeklyPurchaseLimitRules=a.map(x=>clone(x));
  const today=(typeof isoDate==='function'?isoDate(new Date()):new Date().toISOString().slice(0,10));
  let current=0;
  try{if(typeof weeklyPurchaseLimitForDate==='function')current=+weeklyPurchaseLimitForDate(today)||0}catch(e){}
  if(!current){
   const indefinite=a.filter(x=>String(x.mode||'')==='indefinite').sort((x,y)=>String(y.createdAt||'').localeCompare(String(x.createdAt||'')))[0];
   current=+indefinite?.value||0;
  }
  db.config.weeklyPurchaseLimit=current;
  return db.config.weeklyPurchaseLimitRules;
 }catch(e){return []}
}
async function ready(){
 if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
 if(typeof hlgbRecordReady!=='undefined'&&!hlgbRecordReady){
  if(typeof hlgbEnsureRecordsOnlineAfterLogin!=='function'||!await hlgbEnsureRecordsOnlineAfterLogin())throw new Error('A nuvem não ficou disponível.');
 }
 if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação multiusuário indisponível.');
}
function upsertLocal(row){
 const a=rows(),i=a.findIndex(x=>sid(x?.id)===sid(row?.id)),v=clone(row);
 if(i>=0)a[i]=v;else a.push(v);
 sync();try{localSaveOnly?.()}catch(e){}
 return v;
}
function removeLocal(id){
 db.weeklyPurchaseLimits=rows().filter(x=>sid(x?.id)!==sid(id));sync();try{localSaveOnly?.()}catch(e){}
}
async function saveConfirmed(row,deleted=false){
 if(!row||row.id==null)throw new Error('Regra de limite sem identificação.');
 await ready();
 const payload=deleted?{...clone(row),__hlgb_explicit_delete:true}:clone(row);
 const out=await window.hlgbRecordSaveWithRetry('weeklyPurchaseLimits',sid(row.id),payload,!!deleted);
 if(!out||out.applied!==true)throw new Error('A nuvem não confirmou a regra de limite.');
 if(deleted){
  if(!out.deleted_at)throw new Error('A nuvem respondeu sem confirmar a exclusão da regra.');
  removeLocal(row.id);
 }else{
  if(out.deleted_at)throw new Error('Esta regra já está excluída na nuvem.');
  upsertLocal(out.data||row);
 }
 return out;
}
function weekRange(value){
 try{if(typeof weekRangeFromISO==='function')return weekRangeFromISO(value)}catch(e){}
 const text=String(value||new Date().toISOString().slice(0,10)).slice(0,10),d=new Date(text+'T12:00:00'),day=d.getDay(),diff=day===0?-6:1-day,m=new Date(d),s=new Date(d);m.setDate(d.getDate()+diff);s.setDate(m.getDate()+6);
 const fmt=x=>x.toISOString().slice(0,10);return {start:fmt(m),end:fmt(s)};
}
function fmt(v){try{return typeof fmtDate==='function'?fmtDate(v):v}catch(e){return v}}
function buildRuleFromFinance(){
 const value=+document.getElementById('financeWeeklyPurchaseLimit')?.value||0;
 if(value<=0)throw new Error('Informe um limite semanal maior que zero.');
 const mode=document.getElementById('financeLimitMode')?.value||'indefinite';
 let start='',end='',label='';
 if(mode==='currentWeek'){
  const r=weekRange(new Date().toISOString().slice(0,10));start=r.start;end=r.end;label='Somente esta semana ('+fmt(start)+' a '+fmt(end)+')';
 }else if(mode==='specificWeek'){
  const d=document.getElementById('financeLimitWeekDate')?.value||'';if(!d)throw new Error('Escolha uma data da semana específica.');
  const r=weekRange(d);start=r.start;end=r.end;label='Semana '+fmt(start)+' a '+fmt(end);
 }else if(mode==='period'){
  start=document.getElementById('financeLimitStart')?.value||'';end=document.getElementById('financeLimitEnd')?.value||'';
  if(!start||!end)throw new Error('Informe o início e o fim do período.');
  if(end<start)throw new Error('A data final não pode ser anterior à data inicial.');
  label='Período '+fmt(start)+' a '+fmt(end);
 }else label='Sem prazo / até eu mudar';
 return {id:'limit-'+Date.now()+'-'+Math.floor(Math.random()*10000),value:Number(value.toFixed(2)),mode,start,end,label,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
}
function rerender(){
 sync();
 try{window.renderFinanceWeeklyLimit?.()}catch(e){}
 try{window.renderWeeklyPurchases?.()}catch(e){}
 try{window.renderFinance?.()}catch(e){}
 try{window.renderPurchases?.()}catch(e){}
}
window.ensureWeeklyPurchaseLimitRules=sync;
window.saveFinanceWeeklyPurchaseLimit=async function(){
 let row;
 try{row=buildRuleFromFinance()}catch(e){alert(String(e.message||e));return false}
 const btn=document.querySelector?.('button[onclick="saveFinanceWeeklyPurchaseLimit()"]');
 if(btn){btn.disabled=true;btn.dataset.oldText=btn.textContent||'';btn.textContent='☁️ Salvando limite…'}
 try{
  await saveConfirmed(row,false);rerender();try{setCloudStatus('✅ Limite semanal salvo na nuvem','ok')}catch(e){};alert('Regra de limite semanal salva.');return true;
 }catch(e){
  console.error('[HLGB limits '+V+'] salvar',e);alert('O limite não foi confirmado na nuvem. O valor anterior foi preservado.\n\n'+String(e?.message||e));return false;
 }finally{if(btn){btn.disabled=false;btn.textContent=btn.dataset.oldText||'Salvar regra';delete btn.dataset.oldText}}
};
window.deleteFinanceWeeklyLimitRule=async function(id){
 const row=rows().find(x=>sid(x?.id)===sid(id));if(!row)return false;
 if(!confirm('Excluir esta regra de limite?'))return false;
 try{await saveConfirmed(row,true);rerender();return true}
 catch(e){console.error('[HLGB limits '+V+'] excluir',e);alert('A exclusão da regra não foi confirmada. Ela foi mantida.');return false}
};
let quickTimer=null,quickSeq=0;
window.saveWeeklyPurchaseLimit=function(){
 clearTimeout(quickTimer);
 const input=document.getElementById('weeklyPurchaseLimit'),value=+input?.value||0;
 if(value<=0)return;
 const seq=++quickSeq;
 quickTimer=setTimeout(async()=>{
  if(seq!==quickSeq)return;
  const existing=rows().filter(x=>String(x.mode||'')==='indefinite'&&x.quickLegacy===true).sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')))[0];
  const row=existing?{...clone(existing),value:Number(value.toFixed(2)),updatedAt:new Date().toISOString()}:{id:'limit-quick-'+Date.now(),value:Number(value.toFixed(2)),mode:'indefinite',start:'',end:'',label:'Sem prazo / até eu mudar',quickLegacy:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  try{await saveConfirmed(row,false);rerender();try{setCloudStatus('✅ Limite semanal salvo','ok')}catch(e){}}
  catch(e){console.error('[HLGB limits '+V+'] quick',e);sync();rerender();alert('O limite semanal não foi confirmado na nuvem. O valor anterior foi restaurado.')}
 },650);
};
try{sync()}catch(e){}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(sync,500);setTimeout(sync,1800)},0)}catch(e){}
setTimeout(sync,1000);
window.hlgbWeeklyLimitSaveConfirmed=saveConfirmed;
window.HLGB_LIMITS_MODULE=V;
try{if(!window.HLGB_CUT_VIEW_GUARD){const s=document.createElement('script');s.src='./release-cut-view.js?fresh='+Date.now();document.head.appendChild(s)}}catch(e){}
console.info('[HLGB] limites '+V+': regras gravadas por registro com confirmação da nuvem');
})();