/* HLGB v94.23 — fechamento dos diagnósticos: Auditor, facções, atribuição, WAL e projeção */
(function(){
'use strict';
const V='94.23', WAL_KEY='hlgb_durable_wal_v1', WAL_DB='hlgb_durable_wal', WAL_STORE='entries';
if(window.HLGB_DIAGNOSTIC_FACTION_STABILITY_9423===V)return;
window.HLGB_DIAGNOSTIC_FACTION_STABILITY_9423=V;
const sid=v=>String(v??''), q=v=>Math.max(0,Number(v)||0);
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const arr=n=>{try{return Array.isArray(window.db?.[n])?window.db[n]:[]}catch(_){return[]}};
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const state={version:V,auditorRepairs:0,factionSelectRepairs:0,assignmentRepairs:0,walPruned:0,projectionRuns:0,projectionCoalesced:0,lastWalPrune:'',lastInstall:''};

/* Auditor: o botão nunca pode depender da ordem de carregamento do Smart Auditor. */
function smartRunFallback(){
 if(window.hlgbAuditorSmart?.run)return window.hlgbAuditorSmart.run('manual');
 if(typeof window.hlgbAuditorRunVisualSweep==='function')return window.hlgbAuditorRunVisualSweep();
 if(typeof window.hlgbAuditorRunFull==='function')return window.hlgbAuditorRunFull();
 if(typeof window.hlgbInternalAuditor?.run==='function')return window.hlgbInternalAuditor.run('full',true);
 throw new Error('Auditor interno ainda não está pronto.');
}
function ensureAuditorBindings(){
 if(typeof window.hlgbAuditorSmartRun!=='function'){
   const bridge=async function(){try{return await smartRunFallback()}catch(e){console.error('[HLGB '+V+'] Auditor',e);const out=document.getElementById('hlgbAuditorResult');if(out)out.innerHTML='<div class="panel bad"><b>Falha no teste.</b><div class="sub">'+esc(e?.message||e)+'</div></div>';return null}};
   bridge.__hlgb9423Bridge=true;window.hlgbAuditorSmartRun=bridge;state.auditorRepairs++;
 }
 window.hlgbAuditorSmartDailyReport9423=async function(){
   if(typeof window.hlgbAuditorDailyReport9368==='function')return window.hlgbAuditorDailyReport9368();
   return smartRunFallback();
 };
 const test=document.getElementById('hlgbSmartTest');
 if(test&&test.getAttribute('onclick')!=='hlgbAuditorSmartRun()'){test.setAttribute('onclick','hlgbAuditorSmartRun()');state.auditorRepairs++}
 const daily=document.getElementById('hlgbDailyReport9368');
 if(daily){daily.setAttribute('onclick','hlgbAuditorSmartDailyReport9423()');daily.style.setProperty('display','inline-flex','important');state.auditorRepairs++}
 return true;
}

/* Facções: usa a autoridade canônica já existente, com fallback seguro. */
function factionNames(){
 try{const a=window.hlgbFactionNames9287?.();if(Array.isArray(a)&&a.length)return a.slice()}catch(_){}
 const out=[];
 for(const f of arr('factionMasters'))if(f&&f.active!==false&&sid(f.name).trim())out.push(sid(f.name).trim());
 for(const f of arr('factions'))if(f&&sid(f.name).trim())out.push(sid(f.name).trim());
 const seen=new Set();return out.filter(x=>{const k=norm(x);if(!k||seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
function repairFactionSelect(){
 const sel=document.getElementById('mname');if(!sel)return false;
 const names=factionNames();if(!names.length)return false;
 const keep=sid(sel.value),before=[...sel.options].map(o=>norm(o.textContent)).filter(Boolean).join('|'),after=names.map(norm).join('|');
 if(before===after)return false;
 sel.innerHTML=names.map(n=>'<option value="'+esc(n)+'">'+esc(n)+'</option>').join('');
 const match=names.find(n=>norm(n)===norm(keep));if(match)sel.value=match;
 state.factionSelectRepairs++;return true;
}

/* Atribuição: "Aguardando atribuição" é a autoridade do estado. Um ID antigo sem facção ativa não pode bloquear a nova atribuição. */
function isWaiting(p){return norm(p?.stage||p?.status)==='aguardando atribuicao'}
function activeFactionForProduction(p){
 return arr('factions').find(f=>sid(f?.productionId)===sid(p?.id)&&!/(finaliz|faturad|conclu)/.test(norm(f?.status||'')))||null;
}
function staleAssignment(p){return !!(p&&isWaiting(p)&&p.productionLocationId!=null&&sid(p.productionLocationId)&&!sid(p.factionId)&&!activeFactionForProduction(p))}
function reconcileLocalAssignments(){
 let n=0;for(const p of arr('production')){
   if(!staleAssignment(p))continue;
   if(!p.__hlgb9423StaleProductionLocationId)p.__hlgb9423StaleProductionLocationId=p.productionLocationId;
   p.productionLocationId=null;n++;
 }
 if(n){state.assignmentRepairs+=n;try{window.dispatchEvent(new CustomEvent('hlgb:assignment-consistency',{detail:{count:n,version:V}}))}catch(_){}}
 return n;
}
function productionDone(p){
 const s=norm(p?.stage||p?.status||'');
 if(/finaliz|faturad|conclu/.test(s))return true;
 const planned=q(p?.planned||p?.qty||p?.quantity),done=q(p?.done||p?.returned||p?.delivered);return planned>0&&done>=planned;
}
function withActiveProduction(fn,ctx,args){
 reconcileLocalAssignments();
 if(!window.db||!Array.isArray(window.db.production))return fn.apply(ctx,args);
 const old=window.db.production;window.db.production=old.filter(p=>!productionDone(p));
 try{return fn.apply(ctx,args)}finally{window.db.production=old}
}
function chainHas(fn,marker){let x=fn,n=0;const seen=new Set();while(typeof x==='function'&&!seen.has(x)&&n++<48){if(x[marker])return true;seen.add(x);x=x.__original||x.__hlgb9307Original||x.__hlgb9320Original||x.__hlgb955Original||x.__hlgbReliableOriginal}return false}
function wrapActiveRenderer(name){const old=window[name];if(typeof old!=='function'||chainHas(old,'__hlgb9423Active'))return false;const w=function(){return withActiveProduction(old,this,arguments)};w.__hlgb9423Active=true;w.__original=old;window[name]=w;return true}

/* Projeção: colapsa apenas rajadas de fundo; interação local continua imediata. */
let lastUserAt=0,lastProjectionAt=0,projectionTimer=null,projectionArgs=null,projectionCtx=null,projectionOriginal=null;
for(const ev of ['pointerdown','keydown','touchstart'])document.addEventListener(ev,()=>{lastUserAt=Date.now()},{capture:true,passive:true});
function installProjectionGovernor(){
 const old=window.renderProjection;if(typeof old!=='function'||chainHas(old,'__hlgb9423Projection'))return false;
 projectionOriginal=old;
 const w=function(){
   const now=Date.now(),local=now-lastUserAt<320||!!document.querySelector('#modal.show');
   if(local||now-lastProjectionAt>=300){if(projectionTimer){clearTimeout(projectionTimer);projectionTimer=null}lastProjectionAt=now;state.projectionRuns++;return old.apply(this,arguments)}
   projectionArgs=Array.from(arguments);projectionCtx=this;state.projectionCoalesced++;
   if(!projectionTimer)projectionTimer=setTimeout(()=>{projectionTimer=null;lastProjectionAt=Date.now();state.projectionRuns++;try{old.apply(projectionCtx,projectionArgs||[])}catch(e){console.error('[HLGB '+V+'] projeção',e)}},320);
   return undefined;
 };
 w.__hlgb9423Projection=true;w.__original=old;window.renderProjection=w;return true;
}

/* Checklist: acrescenta valor unitário e total usando o preço da própria facção/checklist. */
function checklistById(id){return arr('materialChecklists').find(x=>sid(x?.id)===sid(id))||null}
function factionForChecklist(c){return arr('factions').find(f=>sid(f?.id)===sid(c?.factionId)||sid(f?.productionId)===sid(c?.productionId)||(norm(f?.name)===norm(c?.destinationName)&&(!c?.productId||sid(f?.productId)===sid(c.productId))))||null}
function checklistPrice(c){const f=factionForChecklist(c);return q(c?.unitPrice||c?.price||f?.price||f?.unitPrice)}
function checklistValueHtml(c){const price=checklistPrice(c),total=price*q(c?.qty);return '<div class="panel hlgb9423ChecklistValue" style="margin:10px 0"><b>Facção:</b> '+esc(c?.destinationName||factionForChecklist(c)?.name||'-')+' &nbsp; <b>Valor unitário:</b> '+money(price)+' &nbsp; <b>Total:</b> '+money(total)+'</div>'}
function installChecklistValue(){
 const old=window.openMaterialChecklist;if(typeof old!=='function'||old.__hlgb9423Value)return false;
 const w=function(id){const out=old.apply(this,arguments);setTimeout(()=>{const c=checklistById(id),modal=document.getElementById('modal');if(!c||!modal||modal.querySelector('.hlgb9423ChecklistValue'))return;const host=modal.querySelector('.modal-content,.modalCard,.modal-card')||modal;host.insertAdjacentHTML('afterbegin',checklistValueHtml(c))},0);return out};
 w.__hlgb9423Value=true;w.__original=old;window.openMaterialChecklist=w;return true;
}

/* WAL: pai técnico de corte desmembrado não é alteração operacional e não pode ficar em retry infinito. */
function obsoleteSplit(op){const d=op?.data||op;return sid(op?.module||'cuts')==='cuts'&&d?.modelSplitParentV1===true&&d?.hiddenByModelSplitV1===true&&norm(d?.status)==='desmembrado por modelo'}
function readWal(){try{const w=JSON.parse(localStorage.getItem(WAL_KEY)||'null');return w&&typeof w==='object'?w:null}catch(_){return null}}
function pruneWalLocal(){const w=readWal();if(!w?.entries||typeof w.entries!=='object')return 0;let n=0;for(const [k,e] of Object.entries(w.entries)){if(obsoleteSplit(e)){delete w.entries[k];n++}}if(n){try{if(Object.keys(w.entries).length)localStorage.setItem(WAL_KEY,JSON.stringify(w));else localStorage.removeItem(WAL_KEY)}catch(_){}}return n}
function pruneWalIdb(){return new Promise(resolve=>{if(typeof indexedDB==='undefined')return resolve(0);let req;try{req=indexedDB.open(WAL_DB)}catch(_){return resolve(0)}req.onupgradeneeded=()=>{try{req.transaction.abort()}catch(_){};resolve(0)};req.onerror=()=>resolve(0);req.onsuccess=()=>{const dbi=req.result;try{if(!dbi.objectStoreNames.contains(WAL_STORE)){dbi.close();return resolve(0)}const tx=dbi.transaction(WAL_STORE,'readwrite'),store=tx.objectStore(WAL_STORE),get=store.getAll();let n=0;get.onsuccess=()=>{for(const e of Array.isArray(get.result)?get.result:[])if(obsoleteSplit(e)){store.delete(e.key);n++}};tx.oncomplete=()=>{dbi.close();resolve(n)};tx.onerror=tx.onabort=()=>{dbi.close();resolve(0)}}catch(_){try{dbi.close()}catch(__){}resolve(0)}}})}
async function pruneObsoleteSplitWal(){const n=pruneWalLocal()+await pruneWalIdb();if(n){state.walPruned+=n;state.lastWalPrune=new Date().toISOString();console.info('[HLGB '+V+'] WAL técnico desmembrado removido:',n)}return n}
function installWalGuard(){
 const old=window.hlgb955FlushSilent;if(typeof old!=='function'||chainHas(old,'__hlgb9423Wal'))return false;
 const w=async function(){await pruneObsoleteSplitWal();return old.apply(this,arguments)};w.__hlgb9423Wal=true;w.__original=old;window.hlgb955FlushSilent=w;return true;
}
function installDirtyGuard(){
 const old=window.scanDirty955;if(typeof old!=='function'||chainHas(old,'__hlgb9423Dirty'))return false;
 const w=async function(){const cuts=window.db?.cuts;if(!Array.isArray(cuts))return old.apply(this,arguments);window.db.cuts=cuts.filter(c=>!obsoleteSplit({module:'cuts',data:c}));try{return await old.apply(this,arguments)}finally{window.db.cuts=cuts;await pruneObsoleteSplitWal()}};
 w.__hlgb9423Dirty=true;w.__original=old;window.scanDirty955=w;return true;
}

function install(){
 state.lastInstall=new Date().toISOString();ensureAuditorBindings();repairFactionSelect();reconcileLocalAssignments();
 ['renderProduction','renderProductionHub','renderCutAssignmentQueue','productionHubRows'].forEach(wrapActiveRenderer);
 installProjectionGovernor();installChecklistValue();installWalGuard();installDirtyGuard();
 try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<94.23){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V}}catch(_){}
 return true;
}
function scheduleRepairs(){setTimeout(()=>{ensureAuditorBindings();repairFactionSelect();reconcileLocalAssignments()},0);setTimeout(()=>{ensureAuditorBindings();repairFactionSelect()},80)}
document.addEventListener('click',scheduleRepairs,true);
const modal=document.getElementById('modal');if(modal&&typeof MutationObserver==='function'){new MutationObserver(()=>{if(document.getElementById('mname')||document.getElementById('hlgbSmartTest'))scheduleRepairs()}).observe(modal,{childList:true,subtree:true})}
window.hlgbDiagnosticFactionStability9423={version:V,state,install,ensureAuditorBindings,factionNames,repairFactionSelect,reconcileLocalAssignments,staleAssignment,productionDone,pruneObsoleteSplitWal,obsoleteSplit,checklistPrice};
install();pruneObsoleteSplitWal().catch(()=>{});
let tries=0;const timer=setInterval(()=>{tries++;install();if(tries>=48)clearInterval(timer)},250);
try{if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>{setTimeout(()=>{install();pruneObsoleteSplitWal().catch(()=>{})},350)},0)}catch(_){}
window.addEventListener('online',()=>pruneObsoleteSplitWal().catch(()=>{}));
window.addEventListener('focus',()=>{install();pruneObsoleteSplitWal().catch(()=>{})});
console.info('[HLGB] fechamento de diagnósticos/facções v'+V+' ativo');
})();
