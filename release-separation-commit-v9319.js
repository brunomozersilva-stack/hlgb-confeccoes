/* HLGB v93.27 — separação autoritativa com confirmação por registro */
(function(){
'use strict';
const V='93.27';
const sid=v=>String(v??'');
const num=v=>Math.max(0,Number(v)||0);
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const busy=new Set();
let saves=0,confirmed=0,pending=0,failed=0,targetedRetries=0,lastError='',lastAt='',lastResult=null;
function data(){try{return typeof db!=='undefined'?db:window.db}catch(e){return window.db}}
function selectedOrderId(id){const x=sid(id).trim();if(x)return x;try{return sid(document.getElementById('separationOrder')?.value).trim()}catch(e){return ''}}
function orderById(id){return (data()?.orders||[]).find(o=>sid(o?.id)===sid(id))||null}
function itemsFor(o){try{if(typeof projectionItemsForOrder==='function'){const a=projectionItemsForOrder(o);if(Array.isArray(a)&&a.length)return a}}catch(e){}const map=new Map();for(const g of (Array.isArray(o?.grade)?o.grade:[])){const pid=sid(g?.productId);if(!pid)continue;const r=map.get(pid)||{key:pid,productId:pid,name:'Produto',qty:0};r.qty+=num(g?.qty);map.set(pid,r)}return [...map.values()]}
function itemFor(o,pid){return itemsFor(o).find(x=>sid(x?.productId||x?.key)===sid(pid))||null}
function latestSep(orderId){return (data()?.separations||[]).filter(s=>sid(s?.orderId)===sid(orderId)).slice().sort((a,b)=>sid(b?.updatedAt||b?.at||b?.createdAt||b?.id).localeCompare(sid(a?.updatedAt||a?.at||a?.createdAt||a?.id)))[0]||null}
function ensureSep(order){let s=latestSep(order.id);if(s)return s;const d=data();d.separations=Array.isArray(d.separations)?d.separations:[];s={id:Date.now()+Math.floor(Math.random()*900000),orderId:order.id,done:false,at:null,partial:true,modelProgress:{},history:[]};d.separations.push(s);return s}
function recId(module,row){const d=data(),arr=Array.isArray(d?.[module])?d[module]:[],i=arr.indexOf(row);try{if(typeof hlgbRecordId==='function'){const x=hlgbRecordId(module,row,i);if(x!=null&&sid(x))return sid(x)}}catch(e){}return sid(row?.__hlgbId||row?.id||'')}
function progress(s,pid){const p=s?.modelProgress||{},id=sid(pid);if(Object.prototype.hasOwnProperty.call(p,id))return num(p[id]?.qty);for(const [k,v] of Object.entries(p))if(sid(k).split(':').pop()===id)return num(v?.qty);return 0}
function totals(o,s){const items=itemsFor(o);let total=0,done=0;for(const it of items){const q=num(it?.qty),d=Math.min(q,progress(s,it?.productId||it?.key));total+=q;done+=d}return {total,done,remaining:Math.max(0,total-done),complete:items.length>0&&done>=total}}
function pendingFor(module,id){try{const w=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||'null');if(Object.values(w?.entries||{}).some(x=>sid(x?.module)===sid(module)&&sid(x?.id)===sid(id)))return true}catch(e){}try{const p=JSON.parse(localStorage.getItem('hlgb_records_pending_v91')||'null'),a=p?.modules?.[module];if(Array.isArray(a)&&a.some(x=>sid(x?.id)===sid(id)))return true}catch(e){}return false}
function statusText(text,type=''){try{if(typeof setCloudStatus==='function')setCloudStatus(text,type);else window.setCloudStatus?.(text,type)}catch(e){}}
function saveLocal(){try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}}
function transient(err){return /demorou|timeout|abort|network|fetch|conex|temporar/i.test(sid(err?.message||err))&&!/jwt|token.*invalid|unauth|senha|password|permission|rls/i.test(sid(err?.message||err))}
function keepSession(err,wasVisible){if(!wasVisible||!transient(err))return false;try{const app=document.getElementById('appShell'),login=document.getElementById('loginScreen'),loader=document.getElementById('sessionLoader');if(app)app.style.display='block';if(login)login.style.display='none';if(loader)loader.style.display='none';return true}catch(e){return false}}
function timed(promise,ms,label){let timer;return Promise.race([Promise.resolve(promise),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label)),ms)})]).finally(()=>clearTimeout(timer))}
function setPartialButton(pid,state='idle'){
 try{const b=document.getElementById('sepBtn938_'+sid(pid));if(!b)return;delete b.dataset.hlgbSaving;b.disabled=false;if(state==='pending')b.textContent='Tentar confirmar';else if(/salvando|aguardando confirma|tentar confirmar/i.test(b.textContent||''))b.textContent='Baixar parcial'}catch(e){}
}
function redraw(orderId,pid,state='idle'){
 setTimeout(()=>{try{if(typeof fillSeparationOrders==='function')fillSeparationOrders();const sel=document.getElementById('separationOrder');if(sel&&sid(orderId))sel.value=sid(orderId);if(typeof renderSeparationList==='function')renderSeparationList();if(sel?.value&&typeof renderSeparation==='function')renderSeparation();setPartialButton(pid,state)}catch(e){console.warn('[HLGB '+V+'] redraw separação',e)}},60)
}
function scheduleRecovery(){try{window.hlgbSaveTransport9320?.retry?.()}catch(e){}try{setTimeout(()=>window.hlgbSyncRecovery9301?.fullSync?.('v9327-separation',true),700)}catch(e){}}
async function ensureCloudReady(){
 if(typeof navigator!=='undefined'&&navigator.onLine===false)throw new Error('Sem internet para confirmar a alteração.');
 try{const f=typeof cloudEnsureFreshSession==='function'?cloudEnsureFreshSession:window.cloudEnsureFreshSession;if(typeof f==='function')await timed(f(false),12000,'Tempo esgotado ao validar a sessão da nuvem.')}catch(e){throw new Error('Sessão da nuvem indisponível. '+sid(e?.message||e))}
 if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação por registro indisponível.');
 return true;
}
async function saveRecord(module,row){
 const id=recId(module,row);if(!id)throw new Error('Registro sem identificador para salvar.');
 await ensureCloudReady();
 const out=await timed(window.hlgbRecordSaveWithRetry(module,id,clone(row),false),22000,'A confirmação deste registro demorou demais.');
 return {id,out};
}
function replaceLocal(module,oldRow,newRow){const a=data()?.[module];if(!Array.isArray(a))return;const i=a.indexOf(oldRow);if(i>=0)a[i]=newRow||oldRow}
async function confirmExisting(module,row){
 targetedRetries++;
 const saved=await saveRecord(module,row);
 if(saved?.out?.applied!==true)return {pending:true,id:saved?.id,out:saved?.out};
 replaceLocal(module,row,saved.out.data||row);saveLocal();
 try{if(typeof window.hlgb955ReconcileServer==='function')await timed(window.hlgb955ReconcileServer(),7000,'Reconciliação local pendente.')}catch(e){}
 return {applied:true,id:saved.id,out:saved.out};
}
function applyOrderCompletion(o){o.materialPurchaseConfirmed=true;o.materialPurchaseConfirmedAt=o.materialPurchaseConfirmedAt||new Date().toISOString();o.materialSeparationCompletedAt=o.materialSeparationCompletedAt||new Date().toISOString();const st=sid(o.status).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(['separacao / compra de material','pedido criado','aguardando material','aguardando corte','pedido para corte'].includes(st))o.status='Aguardando corte'}
async function saveCompletedOrder(o,wasVisible){
 applyOrderCompletion(o);saveLocal();
 try{const os=await saveRecord('orders',o);if(os?.out?.applied){replaceLocal('orders',o,os.out.data||o);try{if(typeof syncOrdersToCuts==='function')syncOrdersToCuts()}catch(e){}return {applied:true}}pending++;scheduleRecovery();return {pending:true}}
 catch(err){lastError=sid(err?.message||err);pending++;keepSession(err,wasVisible);scheduleRecovery();return {pending:true,error:lastError}}
}
async function confirmPendingSeparation(o,s,pid,wasVisible){
 const rid=recId('separations',s);if(!rid||!pendingFor('separations',rid))return null;
 statusText('☁️ Confirmando a baixa pendente deste pedido…','warn');
 try{
  const r=await confirmExisting('separations',s);
  if(!r?.applied){pending++;lastResult={kind:'separation',id:rid,state:'pending'};statusText('⚠️ Baixa preservada · toque em “Tentar confirmar”','warn');redraw(o.id,pid,'pending');return {pending:true,retry:true}}
  confirmed++;lastError='';lastResult={kind:'separation',id:rid,state:'confirmed'};statusText('✅ Baixa pendente confirmada na nuvem','ok');redraw(o.id,pid,'idle');return {applied:true,separationConfirmed:true,recovered:true,complete:totals(o,s).complete}
 }catch(err){lastError=sid(err?.message||err);pending++;keepSession(err,wasVisible);scheduleRecovery();lastResult={kind:'separation',id:rid,state:'pending',error:lastError};statusText('⚠️ Baixa preservada · toque em “Tentar confirmar”','warn');redraw(o.id,pid,'pending');return {pending:true,retry:true,error:lastError}}
}
async function directApply(orderId,pid,finish=false){
 orderId=selectedOrderId(orderId);const key=orderId+'|'+sid(pid);if(busy.has(key)){statusText('☁️ Esta baixa já está sendo salva…','warn');return false}busy.add(key);saves++;lastAt=new Date().toISOString();const app=document.getElementById('appShell'),wasVisible=!!(app&&getComputedStyle(app).display!=='none');let state='idle';
 try{
  const o=orderById(orderId);if(!o)throw new Error('Pedido não encontrado.');const it=itemFor(o,pid);if(!it)throw new Error('Modelo não encontrado neste pedido.');const s=ensureSep(o);
  const existing=await confirmPendingSeparation(o,s,pid,wasVisible);if(existing){state=existing.pending?'pending':'idle';return existing}
  s.modelProgress=s.modelProgress||{};s.history=Array.isArray(s.history)?s.history:[];
  const pkey=sid(it.productId||it.key),cur=progress(s,pkey),total=num(it.qty);let add=finish?Math.max(0,total-cur):num(document.getElementById('sepQty938_'+pkey)?.value);if(add<=0)throw new Error('Informe a quantidade separada agora.');const next=Math.min(total,cur+add);if(next<=cur)return {applied:true,separationConfirmed:true,qty:cur,complete:totals(o,s).complete};
  s.modelProgress[pkey]={qty:next,total,updatedAt:new Date().toISOString()};s.history.push({at:new Date().toISOString(),productId:pkey,qty:next-cur,user:(typeof cloudUser!=='undefined'?cloudUser?.email:window.cloudUser?.email)||''});s.updatedAt=new Date().toISOString();const t=totals(o,s);s.done=t.complete;s.partial=!t.complete;s.at=t.complete?new Date().toISOString():null;saveLocal();
  const btn=document.getElementById('sepBtn938_'+pkey);if(btn){btn.disabled=true;btn.dataset.hlgbSaving='1';btn.textContent='☁️ Salvando…'}statusText('☁️ Salvando baixa na nuvem…');
  let saved;try{saved=await saveRecord('separations',s)}catch(err){lastError=sid(err?.message||err);pending++;state='pending';keepSession(err,wasVisible);statusText('⚠️ Baixa preservada · toque em “Tentar confirmar”','warn');scheduleRecovery();lastResult={kind:'separation',id:recId('separations',s),state:'pending',error:lastError};redraw(orderId,pkey,'pending');return {pending:true,retry:true,error:lastError}}
  if(!saved?.out?.applied){pending++;state='pending';statusText('⚠️ Baixa preservada · toque em “Tentar confirmar”','warn');scheduleRecovery();lastResult={kind:'separation',id:saved?.id,state:'pending'};redraw(orderId,pkey,'pending');return {pending:true,retry:true}}
  replaceLocal('separations',s,saved.out.data||s);saveLocal();
  if(t.complete){const os=await saveCompletedOrder(o,wasVisible);if(os?.pending){statusText('⚠️ Separação confirmada; pedido aguardando nuvem','warn');lastResult={kind:'separation',id:saved.id,state:'confirmed',orderPending:true};redraw(orderId,pkey,'idle');return {applied:true,separationConfirmed:true,orderPending:true}}}
  confirmed++;lastError='';lastResult={kind:'separation',id:saved.id,state:'confirmed'};statusText(t.complete?'✅ Separação concluída e confirmada na nuvem':'✅ Baixa parcial confirmada na nuvem','ok');redraw(orderId,pkey,'idle');return {applied:true,separationConfirmed:true,qty:next,complete:t.complete};
 }catch(err){failed++;lastError=sid(err?.message||err);keepSession(err,wasVisible);statusText('☁️ Não foi possível concluir esta baixa','bad');if(!/Informe a quantidade/.test(lastError))console.error('[HLGB '+V+'] baixa parcial',err);try{alert(lastError)}catch(e){}return false}
 finally{busy.delete(key);setPartialButton(pid,state)}
}
async function directMark(orderId){
 orderId=selectedOrderId(orderId);const key='finish|'+orderId;if(!orderId){statusText('☁️ Selecione um pedido para concluir a separação','bad');return false}if(busy.has(key)){statusText('☁️ A conclusão já está sendo salva…','warn');return false}busy.add(key);saves++;lastAt=new Date().toISOString();const app=document.getElementById('appShell'),wasVisible=!!(app&&getComputedStyle(app).display!=='none');let btn;
 try{
  const o=orderById(orderId);if(!o)throw new Error('Pedido não encontrado.');const s=ensureSep(o);s.modelProgress=s.modelProgress||{};s.history=Array.isArray(s.history)?s.history:[];
  const rid=recId('separations',s);if(rid&&pendingFor('separations',rid)){
   statusText('☁️ Confirmando a separação pendente deste pedido…','warn');
   try{const r=await confirmExisting('separations',s);if(!r?.applied){pending++;statusText('⚠️ Conclusão preservada · tente confirmar novamente','warn');return {pending:true,retry:true}}}catch(err){lastError=sid(err?.message||err);pending++;keepSession(err,wasVisible);scheduleRecovery();statusText('⚠️ Conclusão preservada · tente confirmar novamente','warn');return {pending:true,retry:true,error:lastError}}
  }
  const now=new Date().toISOString();let changed=false;for(const it of itemsFor(o)){const pid=sid(it.productId||it.key),total=num(it.qty),cur=progress(s,pid);if(total>cur){s.modelProgress[pid]={qty:total,total,updatedAt:now};s.history.push({at:now,productId:pid,qty:total-cur,user:(typeof cloudUser!=='undefined'?cloudUser?.email:window.cloudUser?.email)||''});changed=true}}
  const t=totals(o,s);if(!changed&&t.complete!==true)throw new Error('Não foi possível identificar os modelos para concluir.');s.done=true;s.partial=false;s.at=s.at||now;s.updatedAt=now;saveLocal();btn=document.querySelector?.('button[onclick*="markSeparation"]')||null;if(btn){btn.disabled=true;btn.dataset.hlgbOldText=btn.textContent||'';btn.textContent='☁️ Salvando conclusão…'}statusText('☁️ Salvando conclusão da separação…');
  let ss;try{ss=await saveRecord('separations',s)}catch(err){lastError=sid(err?.message||err);pending++;keepSession(err,wasVisible);statusText('⚠️ Conclusão preservada · tente confirmar novamente','warn');scheduleRecovery();return {pending:true,retry:true,error:lastError}}
  if(!ss?.out?.applied){pending++;statusText('⚠️ Conclusão preservada · tente confirmar novamente','warn');scheduleRecovery();return {pending:true,retry:true}}
  replaceLocal('separations',s,ss.out.data||s);saveLocal();const os=await saveCompletedOrder(o,wasVisible);if(os?.pending){statusText('⚠️ Separação concluída; pedido aguardando confirmação da nuvem','warn');redraw(orderId,'','idle');return {applied:true,separationConfirmed:true,orderPending:true}}
  confirmed++;lastError='';lastResult={kind:'separation',id:ss.id,state:'confirmed',complete:true};statusText('✅ Separação concluída e salva na nuvem','ok');redraw(orderId,'','idle');return {applied:true,separationConfirmed:true,complete:true}
 }catch(err){failed++;lastError=sid(err?.message||err);keepSession(err,wasVisible);statusText('☁️ Não foi possível concluir a separação','bad');console.error('[HLGB '+V+'] concluir separação',err);try{alert(lastError)}catch(e){}return false}
 finally{if(btn){btn.disabled=false;btn.textContent=btn.dataset.hlgbOldText||'Concluir e salvar';delete btn.dataset.hlgbOldText}busy.delete(key)}
}
function install(){
 directApply.__hlgbCanonicalSeparation=true;directApply.__hlgbCanonicalVersion=V;
 /* Compatibilidade: impede que o guard legado volte a envolver a função canônica.
    A prontidão/timeout/confirmação por registro agora vivem aqui, sem wrapper adicional. */
 directApply.__hlgb9312=true;directApply.__hlgb9312Mode='canonical-no-wrapper';
 directMark.__hlgbCanonicalSeparation=true;directMark.__hlgbCanonicalVersion=V;
 window.applySeparationProgress938=directApply;window.markSeparation=directMark;window.HLGB_SEPARATION_COMMIT_9319=V;
 try{const cur=Number(window.HLGB_RELEASE_VERSION)||0;if(cur<93.27){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V}}catch(e){}return true
}
function status(){return {version:V,installed:window.applySeparationProgress938===directApply&&window.markSeparation===directMark,mode:'canonical-targeted-confirmation',legacyGuardWrapped:false,legacyGuardCompatibilityMarker:window.applySeparationProgress938?.__hlgb9312Mode||'',saves,confirmed,pending,failed,targetedRetries,lastError,lastAt,lastResult,busy:[...busy]}}
install();let tries=0;const timer=setInterval(()=>{tries++;if(window.applySeparationProgress938!==directApply||window.markSeparation!==directMark)install();if(tries>=50)clearInterval(timer)},250);window.hlgbSeparationDirect9321={version:V,install,status,apply:directApply,mark:directMark};window.hlgbSeparationCommit9319=window.hlgbSeparationDirect9321;
console.info('[HLGB] v'+V+' separação canônica ativa — confirmação por registro sem depender da fila global');
})();
