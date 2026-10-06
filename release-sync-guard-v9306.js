/* HLGB v93.06 — guarda de convergência contra mutação automática de Produção */
(function(){
'use strict';
const V='93.06';
if(window.HLGB_SYNC_GUARD_9306)return;
window.HLGB_SYNC_GUARD_9306=V;
const PENDING_KEY='hlgb_records_pending_v91';
const WAL_KEY='hlgb_durable_wal_v1';
const LEGACY_KEY='hlgb_core_pending_v1';
const QUAR_KEY='hlgb_sync_quarantine_v9306';
const IDB='hlgb_durable_wal',STORE='entries';
let authority=new Map(),refreshing=false,guarded=0,lastRefresh='',lastRepair='',lastIds=[];
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const sid=v=>String(v??'');
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
function read(k,f=null){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(e){return f}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}return window.db||null}
function cloudReq(){try{if(typeof cloudRequest==='function')return cloudRequest}catch(e){}return window.cloudRequest}
function localSave(){try{const f=typeof localSaveOnly==='function'?localSaveOnly:window.localSaveOnly;if(typeof f==='function')f()}catch(e){}}
function recId(row,i){try{const f=typeof hlgbRecordId==='function'?hlgbRecordId:window.hlgbRecordId;if(typeof f==='function')return sid(f('production',row,i))}catch(e){}return sid(row?.id??row?.__hlgbId)}
function editing(){if(document.querySelector('#modal.show'))return true;const a=document.activeElement;return !!(a&&/^(INPUT|TEXTAREA|SELECT)$/i.test(a.tagName)&&a.closest?.('#appShell'))}
function linked(d){return !!(d&&(d.cutQuantityLinkedV9246===true||d.cutEffectiveQtyV9246===true||d.cutEffectiveQtyV9240===true||String(d.cutQuantityLinkedV9246).toLowerCase()==='true'||String(d.cutEffectiveQtyV9246).toLowerCase()==='true'||String(d.cutEffectiveQtyV9240).toLowerCase()==='true'))}
function explicitZero(d){return !!(d&&['true','1','yes'].includes(String(d.__hlgb_allow_planned_zero??'').toLowerCase()))}
function suspicious(id,d){const g=authority.get(sid(id));return !!(g&&g.data&&num(g.data.planned)>0&&num(d?.planned)===0&&linked(d)&&!explicitZero(d))}
function archive(kind,payload,reason){if(payload==null)return;let a=read(QUAR_KEY,[]);if(!Array.isArray(a))a=[];a.push({at:new Date().toISOString(),kind,reason,payload:clone(payload)});if(a.length>20)a=a.slice(-20);write(QUAR_KEY,a)}
function purgePending(ids,reason){
 const set=new Set([...ids].map(sid));let n=0;
 const p=read(PENDING_KEY,null);if(p?.modules&&Array.isArray(p.modules.production)){
   const removed=p.modules.production.filter(x=>set.has(sid(x?.id))&&suspicious(x?.id,x?.data));
   if(removed.length){archive('normalized-production',removed,reason);p.modules.production=p.modules.production.filter(x=>!removed.includes(x));n+=removed.length;if(!p.modules.production.length)delete p.modules.production;const any=Object.values(p.modules).some(x=>Array.isArray(x)&&x.length);try{if(any)localStorage.setItem(PENDING_KEY,JSON.stringify(p));else localStorage.removeItem(PENDING_KEY)}catch(e){}}
 }
 const w=read(WAL_KEY,null);if(w?.entries&&typeof w.entries==='object'){
   const removed={};for(const [k,e] of Object.entries(w.entries))if(set.has(sid(e?.id))&&e?.module==='production'&&suspicious(e.id,e.data)){removed[k]=e;delete w.entries[k];n++}
   if(Object.keys(removed).length){archive('wal-production',removed,reason);try{if(Object.keys(w.entries).length)localStorage.setItem(WAL_KEY,JSON.stringify(w));else localStorage.removeItem(WAL_KEY)}catch(e){}}
 }
 const c=read(LEGACY_KEY,null);if(c&&typeof c==='object'){
   let changed=false,removed=[];
   if(c.modules&&Array.isArray(c.modules.production)){const before=c.modules.production;c.modules.production=before.filter(x=>{const hit=set.has(sid(x?.id))&&suspicious(x?.id,x?.data||x);if(hit)removed.push(x);return !hit});if(c.modules.production.length!==before.length){changed=true;if(!c.modules.production.length)delete c.modules.production}}
   if(c.entries&&typeof c.entries==='object'){for(const [k,e] of Object.entries(c.entries))if((k.startsWith('production|')||e?.module==='production')&&set.has(sid(e?.id??k.split('|')[1]))&&suspicious(e?.id??k.split('|')[1],e?.data||e)){removed.push(e);delete c.entries[k];changed=true}}
   if(changed){archive('legacy-core-production',removed,reason);try{localStorage.setItem(LEGACY_KEY,JSON.stringify(c))}catch(e){}n+=removed.length}
 }
 return n;
}
function purgeIdb(ids,reason){
 if(!('indexedDB' in window)||!ids.size)return Promise.resolve(0);const set=new Set([...ids].map(sid));
 return new Promise(resolve=>{let req;try{req=indexedDB.open(IDB)}catch(e){resolve(0);return}req.onerror=()=>resolve(0);req.onupgradeneeded=()=>{};req.onsuccess=()=>{const x=req.result;if(!x.objectStoreNames.contains(STORE)){x.close();resolve(0);return}let tx;try{tx=x.transaction(STORE,'readwrite')}catch(e){x.close();resolve(0);return}const st=tx.objectStore(STORE),removed=[];const cur=st.openCursor();cur.onsuccess=()=>{const c=cur.result;if(!c)return;const e=c.value;if(e?.module==='production'&&set.has(sid(e.id))&&suspicious(e.id,e.data)){removed.push(clone(e));try{c.delete()}catch(_){}}c.continue()};tx.oncomplete=()=>{if(removed.length)archive('indexeddb-production',removed,reason);x.close();resolve(removed.length)};tx.onerror=()=>{x.close();resolve(removed.length)}}});
}
async function repair(reason='guard'){
 if(!authority.size)return 0;const d=dbRef();if(!d||!Array.isArray(d.production))return 0;const ids=new Set();let changed=0;
 for(let i=0;i<d.production.length;i++){const row=d.production[i],id=recId(row,i);if(suspicious(id,row)){const good=authority.get(id);d.production[i]=clone(good.data);ids.add(id);changed++}}
 if(ids.size){guarded+=changed;lastRepair=new Date().toISOString();lastIds=[...ids];purgePending(ids,reason);await purgeIdb(ids,reason);localSave();try{if(document.querySelector('#producao.page.active')&&typeof window.renderProduction==='function')window.renderProduction()}catch(e){};try{if(document.querySelector('#capacidadeProducao.page.active')&&typeof window.renderCapacityPlanning==='function')window.renderCapacityPlanning()}catch(e){}}
 return changed;
}
async function refreshAuthority(reason='periodic'){
 if(refreshing||!navigator.onLine||editing())return false;const f=cloudReq();if(typeof f!=='function')return false;refreshing=true;
 try{const rows=await f('hlgb_records?select=entity_id,data,revision,updated_at,deleted_at,updated_by&module=eq.production&deleted_at=is.null&limit=1000',{method:'GET'});if(!Array.isArray(rows))return false;const next=new Map();for(const r of rows){if(!r||r.entity_id==null||!r.data||typeof r.data!=='object')continue;next.set(sid(r.entity_id),{data:clone(r.data),revision:num(r.revision)||1,updated_at:r.updated_at||'',deleted_at:r.deleted_at||null,updated_by:r.updated_by||null})}if(next.size){authority=next;lastRefresh=new Date().toISOString();await repair('authority-'+reason);return true}return false}catch(e){console.warn('[HLGB sync guard '+V+'] autoridade',e);return false}finally{refreshing=false}}
function faux(id){const g=authority.get(sid(id));return g?{applied:true,hlgbNoop:true,data:clone(g.data),revision:g.revision,updated_at:g.updated_at,deleted_at:g.deleted_at,updated_by:g.updated_by}:null}
function installSaveGuard(){
 const f=window.hlgbRecordSaveWithRetry;if(typeof f==='function'&&!f.__hlgb9306){const w=async function(m,id,data,deleted=false){if(!deleted&&m==='production'&&suspicious(id,data)){await repair('save-block');return faux(id)}const out=await f.apply(this,arguments);if(m==='production'&&out?.applied===true&&out?.data&&num(out.data.planned)>0){authority.set(sid(id),{data:clone(out.data),revision:num(out.revision)||1,updated_at:out.updated_at||'',deleted_at:out.deleted_at||null,updated_by:out.updated_by||null})}return out};w.__hlgb9306=true;w.__hlgb9306Original=f;window.hlgbRecordSaveWithRetry=w}
 const r=window.hlgb955ReliableSave;if(typeof r==='function'&&!r.__hlgb9306){const w=async function(m,id,data,deleted=false){if(!deleted&&m==='production'&&suspicious(id,data)){await repair('reliable-save-block');return faux(id)}return r.apply(this,arguments)};w.__hlgb9306=true;w.__hlgb9306Original=r;window.hlgb955ReliableSave=w}
}
function status(){return {version:V,authority:authority.size,guarded,lastRefresh,lastRepair,lastIds,online:navigator.onLine}}
async function boot(){installSaveGuard();await refreshAuthority('boot');await repair('boot');let fast=0;const iv=setInterval(async()=>{installSaveGuard();await repair('settle');if(++fast>=40)clearInterval(iv)},300);setInterval(()=>{installSaveGuard();repair('watch').catch(()=>{})},1800);setInterval(()=>refreshAuthority('periodic').catch(()=>{}),12000);window.addEventListener('focus',()=>setTimeout(()=>refreshAuthority('focus'),100));window.addEventListener('online',()=>setTimeout(()=>refreshAuthority('online'),150));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(()=>refreshAuthority('visible'),100)});try{const n=Number(window.HLGB_RELEASE_VERSION)||0;if(n<93.06){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V}}catch(e){}window.hlgbSyncGuard9306={version:V,status,refreshAuthority,repair};console.info('[HLGB] v'+V+' guarda de convergência ativa');}
if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>setTimeout(boot,250),0);else setTimeout(boot,900);
})();
