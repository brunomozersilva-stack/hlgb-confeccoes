/* HLGB v92.41 — persistencia de limite semanal + fechamento contabilizado de faccao + corte oculto seguro */
(function(){
'use strict';
const V='92.41';
const clone=x=>{try{return structuredClone(x)}catch(e){try{return JSON.parse(JSON.stringify(x))}catch(_){return x}}};
const num=v=>Math.max(0,+v||0);
const norm=v=>String(v??'').trim().toLowerCase();
const arr=m=>{db[m]=Array.isArray(db[m])?db[m]:[];return db[m]};

function replaceLocal(module,id,row,deleted){
  const a=arr(module),i=a.findIndex(x=>String(x?.id)===String(id));
  if(deleted){if(i>=0)a.splice(i,1);return}
  if(i>=0)a[i]=clone(row);else a.push(clone(row));
}
async function online(){
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  if(typeof hlgbRecordReady!=='undefined'&&!hlgbRecordReady){
    if(typeof hlgbEnsureRecordsOnlineAfterLogin!=='function'||!await hlgbEnsureRecordsOnlineAfterLogin())throw new Error('A nuvem não está pronta.');
  }
  if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação multiusuário indisponível.');
}
async function saveCloud(module,row,deleted=false){
  await online();
  const id=String(row.id);
  let payload=clone(row);if(deleted)payload={...payload,__hlgb_explicit_delete:true};
  const out=await window.hlgbRecordSaveWithRetry(module,id,payload,deleted);
  if(!out||out.applied!==true)throw new Error('A nuvem não confirmou '+module+'.');
  replaceLocal(module,id,out.data||row,deleted);
  try{if(typeof localSaveOnly==='function')localSaveOnly();else if(typeof persistDb==='function')persistDb()}catch(e){}
  return clone(out.data||row);
}

/* ------------------------------------------------------------------
   Limite semanal: hlgb_records/weeklyPurchaseLimits e a fonte oficial.
   O codigo antigo gravava apenas db.config, por isso sumia ao atualizar.
   ------------------------------------------------------------------ */
function topLimitRules(){return arr('weeklyPurchaseLimits').filter(x=>x&&x.id!=null)}
function mirrorLimitRules(){
  db.config=(db.config&&typeof db.config==='object')?db.config:{};
  const cloud=topLimitRules();
  const legacy=Array.isArray(db.config.weeklyPurchaseLimitRules)?db.config.weeklyPurchaseLimitRules:[];
  const source=cloud.length?cloud:legacy;
  db.config.weeklyPurchaseLimitRules=source.map(clone);
  db.config.weeklyPurchaseLimitRulesMigrated=true;
  const today=(typeof isoDate==='function'?isoDate(new Date()):new Date().toISOString().slice(0,10));
  const valid=source.filter(r=>(!r.start||today>=r.start)&&(!r.end||today<=r.end));
  const spec={indefinite:0,period:1,specificWeek:2,currentWeek:2};
  valid.sort((a,b)=>(spec[b.mode]||0)-(spec[a.mode]||0)||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  db.config.weeklyPurchaseLimit=num(valid[0]?.value);
  return db.config.weeklyPurchaseLimitRules;
}
window.ensureWeeklyPurchaseLimitRules=function(){return mirrorLimitRules()};

function rangeFor(d){
  if(typeof weekRangeFromISO==='function')return weekRangeFromISO(d);
  const x=new Date(String(d)+'T12:00:00');let day=x.getDay();day=day===0?7:day;const m=new Date(x);m.setDate(x.getDate()-(day-1));const s=new Date(m);s.setDate(m.getDate()+6);
  const f=z=>z.toISOString().slice(0,10);return {start:f(m),end:f(s)};
}
function fmt(d){try{return typeof fmtDate==='function'?fmtDate(d):d}catch(e){return d}}
async function saveLimitRule(rule){
  const saved=await saveCloud('weeklyPurchaseLimits',rule,false);
  mirrorLimitRules();
  try{if(typeof persistDb==='function')persistDb()}catch(e){}
  try{if(typeof renderFinanceWeeklyLimit==='function')renderFinanceWeeklyLimit()}catch(e){}
  try{if(typeof renderWeeklyPurchases==='function')renderWeeklyPurchases()}catch(e){}
  try{if(typeof renderFinance==='function')renderFinance()}catch(e){}
  return saved;
}

window.saveFinanceWeeklyPurchaseLimit=async function(){
  const value=num(document.getElementById('financeWeeklyPurchaseLimit')?.value);
  if(value<=0){alert('Informe um limite semanal maior que zero.');return}
  const mode=document.getElementById('financeLimitMode')?.value||'indefinite';
  let start='',end='',label='';
  const today=(typeof isoDate==='function'?isoDate(new Date()):new Date().toISOString().slice(0,10));
  if(mode==='currentWeek'){
    const r=rangeFor(today);start=r.start;end=r.end;label=`Somente esta semana (${fmt(start)} a ${fmt(end)})`;
  }else if(mode==='specificWeek'){
    const d=document.getElementById('financeLimitWeekDate')?.value||'';if(!d){alert('Escolha uma data da semana específica.');return}
    const r=rangeFor(d);start=r.start;end=r.end;label=`Semana ${fmt(start)} a ${fmt(end)}`;
  }else if(mode==='period'){
    start=document.getElementById('financeLimitStart')?.value||'';end=document.getElementById('financeLimitEnd')?.value||'';
    if(!start||!end){alert('Informe o início e o fim do período.');return}if(end<start){alert('A data final não pode ser anterior à data inicial.');return}
    label=`Período ${fmt(start)} a ${fmt(end)}`;
  }else label='Sem prazo / até eu mudar';
  const rule={id:'limit-'+Date.now()+'-'+Math.floor(Math.random()*10000),value,mode,start,end,label,createdAt:new Date().toISOString(),savedInCloudV9241:true};
  const btn=document.querySelector('#financeWeeklyPurchaseLimit')?.closest('.toolbar')?.querySelector('button.primary');
  if(btn){btn.disabled=true;btn.textContent='☁️ Salvando limite…'}
  try{await saveLimitRule(rule);if(btn){btn.disabled=false;btn.textContent='💾 Salvar regra de limite'};alert('Regra de limite semanal salva na nuvem.')}
  catch(e){if(btn){btn.disabled=false;btn.textContent='💾 Salvar regra de limite'};console.error('[HLGB '+V+'] limite semanal',e);alert('O limite não foi salvo porque a nuvem não confirmou.\n\n'+String(e?.message||e))}
};

let simpleLimitTimer=null;
window.saveWeeklyPurchaseLimit=function(){
  clearTimeout(simpleLimitTimer);
  simpleLimitTimer=setTimeout(async()=>{
    const value=num(document.getElementById('weeklyPurchaseLimit')?.value);if(value<=0)return;
    let current=topLimitRules().filter(r=>norm(r.mode)==='indefinite').sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')))[0];
    const rule=current?{...clone(current),value,updatedAt:new Date().toISOString(),savedInCloudV9241:true}:{id:'limit-'+Date.now()+'-'+Math.floor(Math.random()*10000),value,mode:'indefinite',start:'',end:'',label:'Sem prazo / até eu mudar',createdAt:new Date().toISOString(),savedInCloudV9241:true};
    try{await saveLimitRule(rule);try{setCloudStatus('⚡ Online · limite semanal salvo','ok')}catch(e){}}
    catch(e){console.error('[HLGB '+V+'] limite rápido',e);try{setCloudStatus('☁️ Limite semanal não confirmado','bad')}catch(_){} }
  },650);
};

window.deleteFinanceWeeklyLimitRule=async function(id){
  if(!confirm('Excluir esta regra de limite?'))return;
  const row=topLimitRules().find(r=>String(r.id)===String(id))||(mirrorLimitRules().find(r=>String(r.id)===String(id))||{id});
  try{await saveCloud('weeklyPurchaseLimits',{...clone(row),id},true);mirrorLimitRules();try{renderFinanceWeeklyLimit()}catch(e){};try{renderWeeklyPurchases()}catch(e){};try{renderFinance()}catch(e){}}
  catch(e){console.error('[HLGB '+V+'] excluir limite',e);alert('A regra não foi excluída porque a nuvem não confirmou.')}
};

/* ------------------------------------------------------------------
   Cortes pendentes antigos/ocultos: finalizar com a mesma cadeia segura
   (corte -> pedido -> produção), não apenas trocar a aparência da linha.
   ------------------------------------------------------------------ */
async function finalizeHiddenCut(id,rowEl){
  const cur=arr('cuts').find(x=>String(x.id)===String(id));if(!cur)return;
  const status=rowEl?.querySelector('.h9239status')?.value||'Planejado';
  if(status!=='Finalizado')return null;
  const date=rowEl?.querySelector('.h9239date')?.value||'';if(!date){alert('Informe a data do corte para finalizar.');return false}
  const cid=rowEl?.querySelector('.h9239cutter')?.value||'';
  const order=arr('orders').find(o=>String(o.id)===String(cur.orderId));
  let grade=Array.isArray(cur.actualCutGrade)&&cur.actualCutGrade.length?clone(cur.actualCutGrade):Array.isArray(cur.originalGrade)&&cur.originalGrade.length?clone(cur.originalGrade):[];
  if(!grade.length&&order&&Array.isArray(order.grade)){
    const pid=String(cur.productId||'');grade=order.grade.filter(g=>!pid||String(g.productId||'')===pid).map(clone);
  }
  let next={...clone(cur),status:'Finalizado',finishedAt:date,finishedAtTime:new Date().toISOString(),plannedCutDate:date,cutterId:cid?(isNaN(+cid)?cid:+cid):null,updatedAt:new Date().toISOString(),cloudFinalizedV9241:true};
  if(grade.length){next.originalGrade=Array.isArray(next.originalGrade)&&next.originalGrade.length?next.originalGrade:clone(grade);next.actualCutGrade=clone(grade);next.pieces=grade.reduce((s,g)=>s+num(g.qty),0)}
  next=await saveCloud('cuts',next,false);
  if(order){
    const ord={...clone(order),status:'Corte finalizado',cutStatus:'Finalizado',updatedAt:new Date().toISOString(),cutConfirmedV9241:true};
    await saveCloud('orders',ord,false);
  }
  const groups=new Map();
  if(grade.length){grade.forEach(g=>{const k=String(g.productId||cur.productId||'geral'),x=groups.get(k)||{productId:g.productId||cur.productId||null,qty:0};x.qty+=num(g.qty);groups.set(k,x)})}
  else groups.set(String(cur.productId||'geral'),{productId:cur.productId||null,qty:num(next.pieces)});
  let seq=0;
  for(const part of groups.values()){
    if(part.qty<=0)continue;
    const existing=arr('production').find(p=>String(p.cutId)===String(next.id)&&(String(p.productId||'')===String(part.productId||'')||groups.size===1));if(existing)continue;
    const prod=arr('products').find(p=>String(p.id)===String(part.productId));
    const pr={id:Date.now()+Math.floor(Math.random()*900000)+seq++,cutId:next.id,orderId:next.orderId||null,productId:part.productId?+part.productId:null,op:next.op||('CORTE-'+next.id),product:prod?.name||next.product||order?.items||'Produto',client:next.client||order?.client||'',color:'',size:'',planned:part.qty,done:0,stage:'Aguardando atribuição',productionLocationId:null,factionId:null,date:date,assignmentSource:true,cutProductKey:`${next.id}:${part.productId||'geral'}`,createdByCutFinalizeV9241:true};
    await saveCloud('production',pr,false);
  }
  try{if(typeof persistDb==='function')persistDb()}catch(e){}
  try{renderCuts();renderDailyCuts();renderProduction();window.hlgbRenderCutterExcel9179?.()}catch(e){}
  try{setCloudStatus('⚡ Online · corte confirmado e enviado à produção','ok')}catch(e){}
  return true;
}
const oldHiddenSave=window.hlgbSaveHiddenCut9239;
if(typeof oldHiddenSave==='function')window.hlgbSaveHiddenCut9239=async function(id){
  const row=document.querySelector(`#hlgbHiddenCuts9239 [data-id="${String(id).replace(/"/g,'')}" ]`)||[...document.querySelectorAll('#hlgbHiddenCuts9239 [data-id]')].find(x=>String(x.dataset.id)===String(id));
  if(row?.querySelector('.h9239status')?.value==='Finalizado'){
    const b=row.querySelector('button');if(b){b.disabled=true;b.textContent='☁️ Confirmando…'}
    try{const ok=await finalizeHiddenCut(id,row);if(ok===false&&b){b.disabled=false;b.textContent='Salvar'}}catch(e){console.error('[HLGB '+V+'] corte oculto',e);if(b){b.disabled=false;b.textContent='Salvar'}alert('O corte não foi finalizado porque a nuvem não confirmou toda a sequência.\n\n'+String(e?.message||e))}
    return;
  }
  return oldHiddenSave.apply(this,arguments);
};

function stamp(){
  try{document.title='HLGB Confecções — Sistema de Gestão v'+V+' Multiusuário'}catch(e){}
  try{const e=document.querySelector('#appShell .logo small');if(e)e.textContent='v'+V}catch(e){}
}
function boot(){mirrorLimitRules();stamp();try{if(typeof renderFinanceWeeklyLimit==='function')renderFinanceWeeklyLimit()}catch(e){};try{if(typeof renderWeeklyPurchases==='function')renderWeeklyPurchases()}catch(e){}}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(boot,250);setTimeout(boot,1300);setTimeout(boot,3200)},0)}catch(e){}
setTimeout(boot,500);setTimeout(boot,2000);setTimeout(boot,4500);
console.info('[HLGB] hotfix v'+V+' ativo — limites persistentes, faltas contabilizadas e corte oculto seguro');
})();
