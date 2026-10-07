/* HLGB v93.25 — Hub operacional no topo + layout estável sem salto tardio */
(function(){
'use strict';
const V='93.25';
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
let installs=0,creates=0,toggles=0,localFirst=0,lastError='',lastAt='';
let observer=null,observedPage=null,organizing=false,organizeQueued=false;
function data(){try{return typeof db!=='undefined'?db:window.db}catch(e){return window.db}}
function hub(){const d=data();if(!d)return[];d.hubFinanceEntries=Array.isArray(d.hubFinanceEntries)?d.hubFinanceEntries:[];return d.hubFinanceEntries}
function idOf(row){const v=row?.id??row?.__hlgbId;return v==null?'':sid(v)}
function upsert(row){const a=hub(),id=idOf(row);if(!id)return false;const next=clone(row),i=a.findIndex(x=>idOf(x)===id);if(i>=0)a[i]=next;else a.push(next);try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}return true}
function status(text,type=''){try{if(typeof setCloudStatus==='function')setCloudStatus(text,type);else window.setCloudStatus?.(text,type)}catch(e){}}
function recover(){try{window.hlgbSaveTransport9320?.retry?.()}catch(e){}try{window.hlgb955FlushSilent?.()}catch(e){}try{setTimeout(()=>window.hlgbSyncRecovery9301?.fullSync?.('hub-primary-9325',true),350)}catch(e){}}
async function saveLocalFirst(row){
 if(!row||!idOf(row))throw new Error('Lançamento sem identificação.');
 if(typeof window.hlgbHubSaveConfirmed==='function'){
  const out=await window.hlgbHubSaveConfirmed(clone(row),false);
  if(out?.applied===true||out?.localFirst===true){localFirst++;lastAt=new Date().toISOString();return out}
 }
 if(!upsert(row))throw new Error('Não foi possível salvar o lançamento neste aparelho.');
 try{window.hlgbHubQueuePending?.(idOf(row),clone(row),false)}catch(e){lastError=sid(e?.message||e);throw e}
 localFirst++;lastAt=new Date().toISOString();status('💾 Salvo no aparelho · confirmando na nuvem…','warn');
 Promise.resolve().then(async()=>{try{if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação multiusuário indisponível.');const out=await window.hlgbRecordSaveWithRetry('hubFinanceEntries',idOf(row),clone(row),false);if(out?.applied===true){upsert(out.data||row);status('✅ Salvo na nuvem','ok');lastError='';return}throw new Error('A nuvem ainda não confirmou o lançamento.')}catch(err){lastError=sid(err?.message||err);recover();status('⚠️ Salvo no aparelho · aguardando confirmação da nuvem','warn')}});
 return {applied:true,localFirst:true,pending:true,data:clone(row)}
}
function refresh(date){
 try{const el=document.getElementById('hubFinanceWeek');if(el&&date)el.value=sid(date).slice(0,10)}catch(e){}
 try{if(date&&window.hlgbHubMaster9258?.setDate)window.hlgbHubMaster9258.setDate(sid(date).slice(0,10));else window.renderHubFinance?.()}catch(e){try{window.renderHubFinance?.()}catch(_){}}
 try{window.renderHubDue9185?.()}catch(e){}
 try{window.hlgbHubPeriodSummary?.render?.()}catch(e){}
 scheduleOrganize();
}
function makeId(){return Date.now()*1000+Math.floor(Math.random()*900+100)}
function newEntry(flow){
 const kind=flow==='Entrada'?'Entrada':'Saída';
 try{if(typeof window.hlgb916EnsureData==='function')window.hlgb916EnsureData();else if(typeof hlgb916EnsureData==='function')hlgb916EnsureData()}catch(e){}
 const formFn=window.hlgb916HubForm||((typeof hlgb916HubForm==='function')?hlgb916HubForm:null),readFn=window.hlgb916ReadHubForm||((typeof hlgb916ReadHubForm==='function')?hlgb916ReadHubForm:null),toggleDate=window.hlgb916ToggleHubChequeDate||((typeof hlgb916ToggleHubChequeDate==='function')?hlgb916ToggleHubChequeDate:null);
 if(typeof openModal!=='function'||typeof formFn!=='function'||typeof readFn!=='function'){alert('O formulário do Hub não terminou de carregar. Atualize a página e tente novamente.');return false}
 openModal(`Nova ${kind.toLowerCase()} prevista`,formFn({flow:kind})+`<button type="button" class="primary modalSave">Salvar lançamento</button>`,async()=>{
  const d=readFn(kind);if(!d)return false;
  const row={id:makeId(),...d,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  const btn=document.querySelector('#modal .modalSave'),old=btn?.textContent||'Salvar lançamento';if(btn){btn.disabled=true;btn.textContent='💾 Salvando…'}
  try{const out=await saveLocalFirst(row);creates++;if(typeof closeModal==='function')closeModal();refresh(row.date);status(out?.pending?'💾 Salvo · nuvem confirmando…':'✅ Salvo na nuvem',out?.pending?'warn':'ok');recover();return true}catch(err){lastError=sid(err?.message||err);console.error('[HLGB Hub '+V+'] nova entrada/saída',err);if(btn){btn.disabled=false;btn.textContent=old}alert('Não consegui salvar nem proteger este lançamento localmente. A janela ficou aberta para você não perder o que digitou.');return false}
 });
 setTimeout(()=>{try{toggleDate?.()}catch(e){}},20);return true
}
async function toggleEntry(id){
 const e=hub().find(x=>idOf(x)===sid(id));if(!e)return false;
 const next={...clone(e),status:e.status==='Realizado'?'Previsto':'Realizado',updatedAt:new Date().toISOString()};next.realizedAt=next.status==='Realizado'?(e.realizedAt||new Date().toISOString().slice(0,10)):'';
 try{const out=await saveLocalFirst(next);toggles++;refresh(next.date);recover();return out}catch(err){lastError=sid(err?.message||err);console.error('[HLGB Hub '+V+'] status',err);alert('Não consegui salvar esta mudança. O lançamento original foi mantido.');return false}
}
function quickEdit(id){
 if(window.hlgbHubEditor9270?.open)return window.hlgbHubEditor9270.open(id,{quick:true});
 if(typeof window.editHubFinanceEntry==='function'&&window.editHubFinanceEntry!==quickEdit)return window.editHubFinanceEntry(id);
 alert('O editor do Hub ainda não terminou de carregar.');return false
}
function ensureCss(){if(document.getElementById('hlgbHubPrimary9323Css'))return;const s=document.createElement('style');s.id='hlgbHubPrimary9323Css';s.textContent=`
#hubFinanceiro{overflow-anchor:none}
#hlgbHubPrimary9323{margin-top:10px;padding:14px;border:2px solid #eadde4;border-radius:16px;background:#fffafd;display:flex;flex-direction:column;gap:10px}
#hlgbHubPrimary9323>.hlgb-hub-primary-head{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;flex-wrap:wrap;margin:0 2px;order:0}
#hlgbHubPrimary9323>.hlgb-hub-primary-head h2{margin:0;color:#5f354d}
#hlgbHubPrimary9323>.hlgb-hub-primary-head .sub{max-width:760px}
#hlgbHubPrimary9323>.panel{margin-top:0}
#hlgbHubPrimary9323 .hlgb-hub-week-panel9325{order:1}
#hlgbHubPrimary9323 #hubDue9166{order:2}
#hlgbHubPrimary9323 .hlgb-hub-entry-panel9323{order:3}
#hlgbHubSummary9323{margin-top:15px;padding:12px 14px;border:1px solid #eadde4;border-radius:15px;background:#fff}
#hlgbHubSummary9323>h2{margin:0 0 8px}
#hlgbHubSummary9323 #hubFinanceCards{margin-top:8px}
#hlgbHubSecondaryLabel9323{margin:22px 0 4px;padding-top:14px;border-top:2px solid #eadde4;color:#5f354d}
@media(max-width:760px){#hlgbHubPrimary9323{padding:9px}#hlgbHubSummary9323{padding:9px}}
`;document.head.appendChild(s)}
function directSubtitle(page){return [...page.children].find(x=>x.classList?.contains('sub'))||null}
function setPrimaryTitle(primary){const h=primary?.querySelector('.hlgb-hub-primary-head h2');if(h&&h.textContent!=='📌 Entradas e saídas por vencimento')h.textContent='📌 Entradas e saídas por vencimento'}
function connectObserver(page){
 if(typeof MutationObserver!=='function'||!page)return;
 if(observer&&observedPage===page)return;
 try{observer?.disconnect()}catch(e){}
 observer=new MutationObserver(()=>scheduleOrganize());observedPage=page;
 observer.observe(page,{childList:true,subtree:true});
}
function organize(){
 const page=document.getElementById('hubFinanceiro');if(!page||organizing)return !!page;
 organizing=true;organizeQueued=false;
 try{
  if(observer&&observedPage===page)observer.disconnect();
  ensureCss();
  let primary=document.getElementById('hlgbHubPrimary9323');
  if(!primary){
   primary=document.createElement('div');primary.id='hlgbHubPrimary9323';
   primary.innerHTML='<div class="hlgb-hub-primary-head"><div><h2>📌 Entradas e saídas por vencimento</h2><div class="sub">Vencimentos, entradas e saídas previstas ficam primeiro. O restante do financeiro fica organizado abaixo.</div></div></div>';
   const sub=directSubtitle(page),h1=page.querySelector(':scope > h1');(sub||h1)?.insertAdjacentElement('afterend',primary);if(!primary.parentElement)page.insertBefore(primary,page.firstChild)
  }
  setPrimaryTitle(primary);
  const controls=document.getElementById('hubFinanceWeek')?.closest('.panel');
  if(controls){controls.classList.add('hlgb-hub-week-panel9325');if(controls.parentElement!==primary)primary.appendChild(controls)}
  const due=document.getElementById('hubDue9166');if(due&&due.parentElement!==primary)primary.appendChild(due);
  const entries=document.getElementById('hubFinanceEntriesTable')?.closest('.panel');
  if(entries){entries.classList.add('hlgb-hub-entry-panel9323');const h=entries.querySelector('h2');if(h&&h.textContent!=='Entradas e saídas previstas')h.textContent='Entradas e saídas previstas';if(entries.parentElement!==primary)primary.appendChild(entries)}
  let summary=document.getElementById('hlgbHubSummary9323');if(!summary){summary=document.createElement('div');summary.id='hlgbHubSummary9323';summary.innerHTML='<h2>Resumo da semana</h2>'}
  if(primary.nextElementSibling!==summary)primary.insertAdjacentElement('afterend',summary);
  const cards=document.getElementById('hubFinanceCards'),alertBox=document.getElementById('hubFinanceLiquidityAlert');if(cards&&cards.parentElement!==summary)summary.appendChild(cards);if(alertBox&&alertBox.parentElement!==summary)summary.appendChild(alertBox);
  let label=document.getElementById('hlgbHubSecondaryLabel9323');if(!label){label=document.createElement('h2');label.id='hlgbHubSecondaryLabel9323';label.textContent='Indicadores e análises complementares'}
  if(summary.nextElementSibling!==label)summary.insertAdjacentElement('afterend',label);
  return true
 }finally{
  organizing=false;
  connectObserver(page);
 }
}
function scheduleOrganize(){
 if(organizeQueued)return;organizeQueued=true;
 const run=()=>{organizeQueued=false;organize()};
 if(typeof queueMicrotask==='function')queueMicrotask(run);else Promise.resolve().then(run);
}
function install(){
 window.newHubFinanceEntry=newEntry;
 window.quickEditHub9185=quickEdit;
 window.toggleHubQuick9185=toggleEntry;
 window.toggleHubFinanceEntry=toggleEntry;
 if(window.hlgbHubEditor9270?.open)window.editHubFinanceEntry=window.hlgbHubEditor9270.open;
 installs++;organize();connectObserver(document.getElementById('hubFinanceiro'));
 try{const cur=Number(window.HLGB_RELEASE_VERSION)||0;if(cur<93.25){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V;const b=document.querySelector('#loginScreen b');if(b&&/Versão/i.test(b.textContent||''))b.textContent='Versão v'+V}}catch(e){}
 return true
}
function state(){return {version:V,installs,creates,toggles,localFirst,lastError,lastAt,newEntryAuthoritative:window.newHubFinanceEntry===newEntry,quickEditAuthoritative:window.quickEditHub9185===quickEdit,toggleAuthoritative:window.toggleHubFinanceEntry===toggleEntry,organized:!!document.getElementById('hlgbHubPrimary9323'),observer:!!observer}}
install();
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>scheduleOrganize(),0)}catch(e){}
window.addEventListener('pageshow',scheduleOrganize);window.addEventListener('focus',scheduleOrganize);
window.hlgbHubPrimary9323={version:V,install,state,saveLocalFirst,newEntry,toggleEntry,quickEdit,organize,scheduleOrganize};
console.info('[HLGB] v'+V+' Hub operacional ativo — vencimentos no topo e layout estabilizado sem reorganização tardia');
})();
