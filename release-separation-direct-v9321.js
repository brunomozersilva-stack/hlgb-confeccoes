/* HLGB v93.21 — controlador direto da baixa parcial por modelo */
(function(){
'use strict';
const V='93.21';
if(window.hlgbSeparationDirect9321?.version===V)return;
const sid=v=>String(v??'');
const num=v=>Math.max(0,Number(v)||0);
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const busy=new Set();
let saves=0,confirmed=0,pending=0,failed=0,lastError='',lastAt='';
function data(){try{return typeof db!=='undefined'?db:window.db}catch(e){return window.db}}
function orderById(id){return (data()?.orders||[]).find(o=>sid(o?.id)===sid(id))||null}
function itemsFor(o){try{if(typeof projectionItemsForOrder==='function'){const a=projectionItemsForOrder(o);if(Array.isArray(a)&&a.length)return a}}catch(e){}const map=new Map();for(const g of (Array.isArray(o?.grade)?o.grade:[])){const pid=sid(g?.productId);if(!pid)continue;const r=map.get(pid)||{key:pid,productId:pid,name:'Produto',qty:0};r.qty+=num(g?.qty);map.set(pid,r)}return [...map.values()]}
function itemFor(o,pid){return itemsFor(o).find(x=>sid(x?.productId||x?.key)===sid(pid))||null}
function sepRows(orderId){return (data()?.separations||[]).filter(s=>sid(s?.orderId)===sid(orderId))}
function latestSep(orderId){return sepRows(orderId).slice().sort((a,b)=>sid(b?.updatedAt||b?.at||b?.createdAt||b?.id).localeCompare(sid(a?.updatedAt||a?.at||a?.createdAt||a?.id)))[0]||null}
function ensureSep(order){let s=latestSep(order.id);if(s)return s;const d=data();d.separations=Array.isArray(d.separations)?d.separations:[];s={id:Date.now()+Math.floor(Math.random()*900000),orderId:order.id,done:false,at:null,partial:true,modelProgress:{},history:[]};d.separations.push(s);return s}
function recId(module,row){const d=data(),arr=Array.isArray(d?.[module])?d[module]:[],i=arr.indexOf(row);try{if(typeof hlgbRecordId==='function'){const x=hlgbRecordId(module,row,i);if(x!=null&&sid(x))return sid(x)}}catch(e){}return sid(row?.__hlgbId||row?.id||'')}
function progress(s,pid){const p=s?.modelProgress||{},id=sid(pid);if(Object.prototype.hasOwnProperty.call(p,id))return num(p[id]?.qty);for(const [k,v] of Object.entries(p))if(sid(k).split(':').pop()===id)return num(v?.qty);return 0}
function totals(o,s){const items=itemsFor(o);let total=0,done=0;for(const it of items){const q=num(it?.qty),d=Math.min(q,progress(s,it?.productId||it?.key));total+=q;done+=d}return {total,done,remaining:Math.max(0,total-done),complete:items.length>0&&done>=total}}
function pendingFor(module,id){try{const w=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||'null');const e=w?.entries||{};if(Object.values(e).some(x=>sid(x?.module)===sid(module)&&sid(x?.id)===sid(id)))return true}catch(e){}try{const p=JSON.parse(localStorage.getItem('hlgb_records_pending_v91')||'null');const a=p?.modules?.[module];if(Array.isArray(a)&&a.some(x=>sid(x?.id)===sid(id)))return true}catch(e){}return false}
function statusText(text,type=''){try{if(typeof setCloudStatus==='function')setCloudStatus(text,type);else window.setCloudStatus?.(text,type)}catch(e){}}
function saveLocal(){try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}}
function transient(err){return /demorou|timeout|abort|network|fetch|conex|temporar/i.test(sid(err?.message||err))&&!/jwt|token.*invalid|unauth|senha|password|permission|rls/i.test(sid(err?.message||err))}
function keepSession(err,wasVisible){if(!wasVisible||!transient(err))return;try{const app=document.getElementById('appShell'),login=document.getElementById('loginScreen'),loader=document.getElementById('sessionLoader');if(app)app.style.display='block';if(login)login.style.display='none';if(loader)loader.style.display='none'}catch(e){}}
function redraw(orderId){setTimeout(()=>{try{const sel=document.getElementById('separationOrder');if(typeof fillSeparationOrders==='function')fillSeparationOrders();if(sel&&sid(orderId)){const n=document.getElementById('separationOrder');if(n)n.value=sid(orderId)}if(typeof renderSeparationList==='function')renderSeparationList();if(document.getElementById('separationOrder')?.value&&typeof renderSeparation==='function')renderSeparation()}catch(e){console.warn('[HLGB '+V+'] redraw separação',e)}},40)}
function scheduleRecovery(){try{window.hlgbSaveTransport9320?.retry?.()}catch(e){}try{setTimeout(()=>window.hlgbSyncRecovery9301?.fullSync?.('v9321-separation',true),600)}catch(e){}}
async function saveRecord(module,row){const id=recId(module,row);if(!id)throw new Error('Registro sem identificador para salvar.');if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação por registro indisponível.');const out=await window.hlgbRecordSaveWithRetry(module,id,clone(row),false);return {id,out};}
async function directApply(orderId,pid,finish=false){
 const key=sid(orderId)+'|'+sid(pid);if(busy.has(key)){statusText('☁️ Esta baixa já está sendo salva…','warn');return false}busy.add(key);saves++;lastAt=new Date().toISOString();
 const app=document.getElementById('appShell'),wasVisible=!!(app&&getComputedStyle(app).display!=='none');let btn;
 try{
  const o=orderById(orderId);if(!o)throw new Error('Pedido não encontrado.');const it=itemFor(o,pid);if(!it)throw new Error('Modelo não encontrado neste pedido.');const s=ensureSep(o);s.modelProgress=s.modelProgress||{};s.history=Array.isArray(s.history)?s.history:[];const rid=recId('separations',s);if(rid&&pendingFor('separations',rid)){pending++;statusText('⚠️ Esta baixa ainda está aguardando confirmação da nuvem','warn');scheduleRecovery();redraw(orderId);return {pending:true}}
  const pkey=sid(it.productId||it.key),cur=progress(s,pkey),total=num(it.qty);let add=finish?Math.max(0,total-cur):num(document.getElementById('sepQty938_'+pkey)?.value);if(add<=0)throw new Error('Informe a quantidade separada agora.');const next=Math.min(total,cur+add);if(next<=cur)return true;
  s.modelProgress[pkey]={qty:next,total,updatedAt:new Date().toISOString()};s.history.push({at:new Date().toISOString(),productId:pkey,qty:next-cur,user:(typeof cloudUser!=='undefined'?cloudUser?.email:window.cloudUser?.email)||''});s.updatedAt=new Date().toISOString();const t=totals(o,s);s.done=t.complete;s.partial=!t.complete;s.at=t.complete?new Date().toISOString():null;saveLocal();
  btn=document.getElementById('sepBtn938_'+pkey);if(btn){btn.disabled=true;btn.textContent='☁️ Salvando…'}statusText('☁️ Salvando baixa parcial na nuvem…');
  let saved;try{saved=await saveRecord('separations',s)}catch(err){lastError=sid(err?.message||err);pending++;keepSession(err,wasVisible);statusText('⚠️ Baixa protegida · aguardando confirmação','warn');scheduleRecovery();redraw(orderId);return {pending:true,error:lastError}}
  if(!saved?.out?.applied){pending++;statusText('⚠️ Baixa protegida · aguardando confirmação','warn');scheduleRecovery();redraw(orderId);return {pending:true}}
  const sd=saved.out.data||s,arr=data().separations||[],ix=arr.indexOf(s);if(ix>=0)arr[ix]=sd;saveLocal();
  if(t.complete){
   o.materialPurchaseConfirmed=true;o.materialPurchaseConfirmedAt=o.materialPurchaseConfirmedAt||new Date().toISOString();o.materialSeparationCompletedAt=o.materialSeparationCompletedAt||new Date().toISOString();const st=sid(o.status).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(['separacao / compra de material','pedido criado','aguardando material','aguardando corte','pedido para corte'].includes(st))o.status='Aguardando corte';saveLocal();
   try{const os=await saveRecord('orders',o);if(os?.out?.applied){const oa=data().orders||[],oi=oa.indexOf(o);if(oi>=0)oa[oi]=os.out.data||o;try{if(typeof syncOrdersToCuts==='function')syncOrdersToCuts()}catch(e){}}else{pending++;scheduleRecovery()}}catch(err){lastError=sid(err?.message||err);pending++;keepSession(err,wasVisible);scheduleRecovery();statusText('⚠️ Separação salva; conclusão do pedido aguardando nuvem','warn');redraw(orderId);return {applied:true,separationConfirmed:true,orderPending:true}}
  }
  confirmed++;lastError='';statusText('✅ Baixa parcial confirmada na nuvem','ok');redraw(orderId);return {applied:true,separationConfirmed:true,qty:next,complete:t.complete};
 }catch(err){failed++;lastError=sid(err?.message||err);keepSession(err,wasVisible);statusText('☁️ Não foi possível concluir esta baixa','bad');if(!/Informe a quantidade/.test(lastError))console.error('[HLGB '+V+'] baixa parcial',err);try{alert(lastError)}catch(e){}return false}
 finally{if(btn){btn.disabled=false;if(/salvando/i.test(btn.textContent||''))btn.textContent='Baixar parcial'}busy.delete(key)}
}
async function directMark(orderId){const o=orderById(orderId);if(!o)return false;const s=ensureSep(o);for(const it of itemsFor(o)){const pid=sid(it.productId||it.key);if(progress(s,pid)<num(it.qty)){const r=await directApply(orderId,pid,true);if(r===false||r?.pending||r?.orderPending)return r}}return true}
function install(){directApply.__hlgb9321=true;directApply.__hlgb9319=true;directApply.__hlgb9312=true;directApply.__hlgbCanonicalSeparation=true;window.applySeparationProgress938=directApply;window.markSeparation=directMark;try{const cur=Number(window.HLGB_RELEASE_VERSION)||0;if(cur<93.21){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V}}catch(e){}return true}
function status(){return {version:V,installed:window.applySeparationProgress938===directApply,saves,confirmed,pending,failed,lastError,lastAt,busy:[...busy]}}
install();let tries=0;const timer=setInterval(()=>{tries++;if(window.applySeparationProgress938!==directApply)install();if(tries>=50)clearInterval(timer)},250);window.hlgbSeparationDirect9321={version:V,install,status,apply:directApply,mark:directMark};
console.info('[HLGB] v'+V+' baixa parcial direta ativa — sem cadeia de wrappers antigos');
})();
