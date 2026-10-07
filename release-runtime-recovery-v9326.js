/* HLGB v93.26 — recuperação WAL sem tempestade + Hub com vencimentos fixos no topo */
(function(){
'use strict';
const V='93.26',WAL_KEY='hlgb_durable_wal_v1';
if(window.hlgbRuntimeRecovery9326?.version===V)return;

const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
let flushBusy=false,lastFlushAt=0,lastError='',confirmed=0,sent=0,blocked=0,layoutRuns=0,layoutMoves=0;
let layoutQueued=false,layoutBusy=false,hubObserver=null,observedHub=null;
const retryAfter=new Map();

function readJson(key,fallback=null){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch(e){return fallback}}
function walEntries(){
 const wal=readJson(WAL_KEY,null),raw=wal?.entries;
 if(!raw)return[];
 const list=Array.isArray(raw)?raw:Object.values(raw);
 return list.filter(x=>x&&x.module&&x.id!=null).map(x=>clone(x));
}
function getFn(name){try{const f=window[name];return typeof f==='function'?f:null}catch(e){return null}}
async function timed(value,ms,label){let t;try{return await Promise.race([Promise.resolve(value),new Promise((_,rej)=>{t=setTimeout(()=>rej(new Error(label||'Tempo esgotado')),ms)})])}finally{clearTimeout(t)}}
function status(text,type=''){try{getFn('setCloudStatus')?.(text,type)}catch(e){}}
function normalize(v){
 if(Array.isArray(v))return v.map(normalize);
 if(!v||typeof v!=='object')return v;
 const out={};
 for(const k of Object.keys(v).sort()){
  if(k==='updatedAt'||k==='updated_at'||k==='revision'||k.startsWith('__'))continue;
  out[k]=normalize(v[k]);
 }
 return out;
}
function sameData(a,b){try{return JSON.stringify(normalize(a))===JSON.stringify(normalize(b))}catch(e){return false}}
function ts(v){const n=Date.parse(v||'');return Number.isFinite(n)?n:0}
function localStamp(entry){return ts(entry?.data?.updatedAt||entry?.data?.updated_at||entry?.updatedAt||entry?.createdAt)}
function cloudStamp(row){return ts(row?.data?.updatedAt||row?.data?.updated_at||row?.updated_at)}
async function cloudRow(module,id){
 const req=getFn('cloudRequest');if(!req)throw new Error('Consulta da nuvem indisponível.');
 const q=`hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at,updated_by&module=eq.${encodeURIComponent(module)}&entity_id=eq.${encodeURIComponent(sid(id))}&limit=1`;
 const out=await timed(req(q,{method:'GET'}),12000,'A nuvem demorou para conferir a alteração.');
 return Array.isArray(out)&&out.length?out[0]:null;
}
async function reconcile(){
 const fn=getFn('hlgb955ReconcileServer');if(!fn)return false;
 try{await timed(fn(),12000,'A reconciliação local demorou demais.');return true}catch(e){lastError=sid(e?.message||e);return false}
}
async function processWalEntry(entry){
 const module=sid(entry.module),id=sid(entry.id),deleted=!!entry.deleted,data=clone(entry.data||{}),key=module+'|'+id;
 if(!module||!id)return {ok:false,reason:'invalid'};
 const before=await cloudRow(module,id);
 if(deleted){
  if(!before||before.deleted_at){confirmed++;await reconcile();return {ok:true,confirmed:true,noSend:true}}
  if(localStamp(entry)&&cloudStamp(before)>localStamp(entry)){blocked++;retryAfter.set(key,Date.now()+60000);return {ok:false,blocked:true,reason:'cloud-newer'}}
 }else{
  if(before&&!before.deleted_at&&sameData(before.data,data)){confirmed++;await reconcile();return {ok:true,confirmed:true,noSend:true}}
  if(before?.deleted_at){blocked++;retryAfter.set(key,Date.now()+60000);return {ok:false,blocked:true,reason:'cloud-deleted'}}
  const lt=localStamp(entry),ct=cloudStamp(before);
  if(before&&ct&&(!lt||ct>lt)){blocked++;retryAfter.set(key,Date.now()+60000);return {ok:false,blocked:true,reason:'cloud-newer'}}
 }
 const save=getFn('hlgbRecordSaveWithRetry');if(!save)throw new Error('Gravação por registro indisponível.');
 sent++;
 const out=await timed(save(module,id,data,deleted),18000,'A gravação protegida demorou demais.');
 if(out?.applied===false)throw new Error('A nuvem recusou a alteração protegida.');
 const after=await cloudRow(module,id);
 const ok=deleted?(!after||!!after.deleted_at):!!(after&&!after.deleted_at&&sameData(after.data,data));
 if(!ok)throw new Error('A nuvem respondeu, mas não confirmou esta alteração.');
 confirmed++;lastError='';retryAfter.delete(key);await reconcile();return {ok:true,confirmed:true};
}
async function safeFlush(){
 const now=Date.now();
 if(flushBusy)return false;
 if(now-lastFlushAt<1200)return false;
 flushBusy=true;lastFlushAt=now;
 try{
  const all=walEntries();if(!all.length){lastError='';return true}
  const eligible=all.filter(e=>(retryAfter.get(sid(e.module)+'|'+sid(e.id))||0)<=now);
  if(!eligible.length)return false;
  /* Um registro por passagem: evita o loop que chegou a milhões de tentativas. */
  const entry=eligible.sort((a,b)=>ts(a.createdAt)-ts(b.createdAt))[0];
  status(`☁️ Recuperando 1 de ${all.length} alteração(ões) protegida(s)…`,'warn');
  try{const result=await processWalEntry(entry);if(result?.ok)status('✅ Alteração protegida confirmada na nuvem','ok');return !!result?.ok}
  catch(e){lastError=sid(e?.message||e);retryAfter.set(sid(entry.module)+'|'+sid(entry.id),Date.now()+15000);console.warn('[HLGB '+V+'] WAL preservada após falha',e);status('⚠️ Alteração preservada · nova tentativa será feita com intervalo','warn');return false}
 }finally{flushBusy=false}
}
function installSafeFlush(){window.hlgb955FlushSilent=safeFlush;window.hlgbSafeWalFlush9326=safeFlush}

function text(v){return sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim()}
function panelFor(el){if(!el)return null;return el.classList?.contains('panel')?el:el.closest?.('.panel')||null}
function headingText(panel){return text([...panel.querySelectorAll('h1,h2,h3,h4')].map(x=>x.textContent||'').join(' | '))}
function findPanel(page,selector,phrases,exclude=[]){
 const exact=page.querySelector(selector),ep=panelFor(exact);if(ep&&!exclude.includes(ep))return ep;
 const panels=[...page.querySelectorAll('.panel')].filter(p=>!exclude.includes(p)&&!p.closest('#hlgbHubTop9326'));
 let best=null,bestScore=0;
 for(const p of panels){const h=headingText(p),body=text(p.textContent||'').slice(0,1200);let score=0;for(const phrase of phrases){const q=text(phrase);if(h.includes(q))score+=5;else if(body.includes(q))score+=1}if(score>bestScore){best=p;bestScore=score}}
 return bestScore>=2?best:null;
}
function ensureLayoutCss(){
 if(document.getElementById('hlgbHubTop9326Css'))return;
 const s=document.createElement('style');s.id='hlgbHubTop9326Css';s.textContent=`
#hubFinanceiro{overflow-anchor:none!important}
#hlgbHubTop9326{display:flex;flex-direction:column;gap:12px;margin:10px 0 16px;min-height:1px}
#hlgbHubTop9326>.panel{margin:0!important;order:0}
#hlgbHubTop9326>.hlgb9326-week{order:1}
#hlgbHubTop9326>.hlgb9326-due{order:2}
#hlgbHubTop9326>.hlgb9326-planned{order:3}
#hlgbHubTop9326>.hlgb9326-due h2:first-child,#hlgbHubTop9326>.hlgb9326-planned h2:first-child{margin-top:0}
@media(max-width:760px){#hlgbHubTop9326{gap:9px;margin-top:8px}}
`;document.head.appendChild(s)
}
function directSubtitle(page){return [...page.children].find(x=>x.classList?.contains('sub'))||null}
function ensureTop(page){
 let top=page.querySelector('#hlgbHubTop9326');if(top)return top;
 top=document.createElement('div');top.id='hlgbHubTop9326';top.setAttribute('data-hlgb','v93.26-top');
 const sub=directSubtitle(page),h1=[...page.children].find(x=>x.tagName==='H1'),anchor=sub||h1;
 if(anchor)anchor.insertAdjacentElement('afterend',top);else page.insertBefore(top,page.firstChild);
 return top;
}
function organizeHub(){
 const page=document.getElementById('hubFinanceiro');if(!page||layoutBusy)return false;
 layoutBusy=true;layoutQueued=false;
 try{
  ensureLayoutCss();const top=ensureTop(page);let moves=0;
  const week=findPanel(page,'#hubFinanceWeek',['semana','periodo semanal']);
  const due=findPanel(page,'#hubDue9166',['entradas e saidas por vencimento','por vencimento','vencimentos','a vencer'],week?[week]:[]);
  const excludes=[week,due].filter(Boolean);
  const planned=findPanel(page,'#hubFinanceEntriesTable',['entradas e saidas previstas','lancamentos previstos','entradas previstas','saidas previstas'],excludes);
  const ordered=[[week,'hlgb9326-week'],[due,'hlgb9326-due'],[planned,'hlgb9326-planned']];
  for(const [p,cls] of ordered){if(!p||p===top||top.contains(p))continue;p.classList.add(cls);top.appendChild(p);moves++}
  for(const [p,cls] of ordered){if(p&&p.parentElement===top){p.classList.add(cls);top.appendChild(p)}}
  layoutRuns++;layoutMoves+=moves;return !!(due||planned)
 }finally{layoutBusy=false;observeHub(page)}
}
function scheduleLayout(){
 if(layoutQueued)return;layoutQueued=true;
 const run=()=>{layoutQueued=false;organizeHub()};
 if(typeof queueMicrotask==='function')queueMicrotask(run);else Promise.resolve().then(run)
}
function observeHub(page){
 if(typeof MutationObserver!=='function'||!page)return;
 if(hubObserver&&observedHub===page)return;
 try{hubObserver?.disconnect()}catch(e){}
 observedHub=page;hubObserver=new MutationObserver(()=>{if(!layoutBusy)scheduleLayout()});
 hubObserver.observe(page,{childList:true,subtree:true})
}
function wrapRender(){
 const cur=window.renderHubFinance;if(typeof cur!=='function'||cur.__hlgb9326)return;
 const base=cur;function wrapped(){const out=base.apply(this,arguments);scheduleLayout();return out}wrapped.__hlgb9326=true;wrapped.__hlgbBase=base;window.renderHubFinance=wrapped;
 const master=window.hlgbHubMaster9258;if(master&&typeof master.renderAll==='function'&&!master.renderAll.__hlgb9326){const m=master.renderAll;const w=function(){const out=m.apply(this,arguments);scheduleLayout();return out};w.__hlgb9326=true;master.renderAll=w}
}
function stamp(){try{const cur=Number(window.HLGB_RELEASE_VERSION)||0;if(cur<93.26){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V;const b=document.querySelector('#loginScreen b');if(b&&/Versão/i.test(b.textContent||''))b.textContent='Versão v'+V}}catch(e){}}
function install(){installSafeFlush();wrapRender();stamp();scheduleLayout();return true}
function state(){return {version:V,wal:walEntries().length,flushBusy,lastFlushAt,lastError,confirmed,sent,blocked,layoutRuns,layoutMoves,topPresent:!!document.getElementById('hlgbHubTop9326'),authoritativeFlush:window.hlgb955FlushSilent===safeFlush}}
install();
try{if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>{install();safeFlush().catch(()=>{})},0)}catch(e){}
window.addEventListener?.('pageshow',()=>{install();safeFlush().catch(()=>{})});
window.addEventListener?.('online',()=>safeFlush().catch(()=>{}));
window.hlgbRuntimeRecovery9326={version:V,install,state,safeFlush,processWalEntry,organizeHub,scheduleLayout};
console.info('[HLGB] v'+V+' recuperação WAL com intervalo + Hub por vencimento fixo no topo ativos');
})();
