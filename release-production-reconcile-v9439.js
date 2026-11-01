/* HLGB v94.39 — reconciliação conservadora de Produção confirmada.
   Pós-login. Consulta o Supabase por ID antes de qualquer poda.
   Remove somente cópias locais/WAL cuja operação esteja comprovadamente satisfeita
   pelo servidor, preservando qualquer edição de negócio mais nova.
   Patch de segurança v94.42: comparação integral de campos de negócio, revisão remota
   obrigatória antes de mutação e falha explícita quando IndexedDB não puder ser lido. */
(function(){
'use strict';
const V='94.39',PATCH='94.42-safe-proof',PENDING_KEY='hlgb_records_pending_v91',WAL_KEY='hlgb_durable_wal_v1',DB_NAME='hlgb_durable_wal',STORE='entries',PROOF_KEY='hlgb_production_save_proofs_v9439';
if(window.HLGB_PRODUCTION_RECONCILE_9439===V&&window.hlgbProductionReconcile9439?.patch===PATCH){try{window.hlgbProductionReconcile9439?.activate?.('reload')}catch(e){}return}
window.HLGB_PRODUCTION_RECONCILE_9439=V;
const state={version:V,patch:PATCH,active:false,busy:false,runs:0,checked:0,confirmed:0,prunedNormalized:0,prunedWal:0,prunedIdb:0,skippedNewer:0,verificationErrors:0,lastAt:'',lastError:'',lastResult:null};
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const META=new Set(['updatedAt','updated_at','revision','__hlgb_pending_at','createdAt','lastAttemptAt','lastError','state','clientVersion','baseUpdatedAt','opId','operationId','key']);
const OPTIONAL_NULLISH=new Set(['productionLocationId','factionId','assignedAt','sentToFactionAt','color','size']);
function canonical(v){
 if(Array.isArray(v))return v.map(canonical);
 if(!v||typeof v!=='object')return v;
 const o={};for(const k of Object.keys(v).sort()){if(META.has(k)||/^__hlgb/i.test(k)||/^__storage/i.test(k))continue;const x=v[k];if(OPTIONAL_NULLISH.has(k)&&(x===undefined||x===null||x==='')){o[k]=null;continue}o[k]=canonical(x)}return o;
}
function canonicalProduction(v){const o=canonical(v||{});for(const k of OPTIONAL_NULLISH){if(!(k in o)||o[k]===undefined||o[k]==='')o[k]=null}return o}
function sameJson(a,b){try{return JSON.stringify(a)===JSON.stringify(b)}catch(e){return false}}
function prodIdentity(d){d=d||{};const cut=sid(d.cutId),order=sid(d.orderId),product=sid(d.productId),key=sid(d.cutProductKey);if(!cut||!order||!product||!key)return null;return {cut,order,product,key}}
function productionEquivalent(a,b){
 if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
 const ia=prodIdentity(a),ib=prodIdentity(b);if(!ia||!ib||!sameJson(ia,ib))return false;
 return sameJson(canonicalProduction(a),canonicalProduction(b));
}
function parseMs(v){if(!v)return NaN;if(typeof v==='number')return v;const n=Date.parse(String(v));return Number.isFinite(n)?n:NaN}
function serverProof(server,expectedId,deleted=false){
 if(!server||typeof server!=='object')return {ok:false,reason:'no-server-proof'};
 if(sid(server.module)!=='production'||(expectedId&&sid(server.entity_id)!==sid(expectedId)))return {ok:false,reason:'server-identity-mismatch'};
 const rev=Number(server.revision);if(!Number.isInteger(rev)||rev<=0)return {ok:false,reason:'server-revision-missing'};
 if(!Number.isFinite(parseMs(server.updated_at)))return {ok:false,reason:'server-updated-at-missing'};
 if(deleted===true)return server.deleted_at?{ok:true,reason:'server-delete-confirmed'}:{ok:false,reason:'delete-not-confirmed'};
 if(server.deleted_at)return {ok:false,reason:'server-deleted'};
 if(!server.data||typeof server.data!=='object')return {ok:false,reason:'no-server-data'};
 return {ok:true,reason:'server-identity-revision-confirmed'};
}
function staleOperationSatisfied(server,desired,base,baseUpdatedAt,expectedId='',deleted=false){
 const structural=serverProof(server,expectedId,deleted);if(!structural.ok)return structural;if(deleted===true)return structural;
 if(!desired)return {ok:false,reason:'no-desired-data'};
 if(productionEquivalent(server.data,desired))return {ok:true,reason:'server-semantic-match'};
 if(base&&productionEquivalent(desired,base)){
  const remoteAt=parseMs(server.updated_at),baseAt=parseMs(baseUpdatedAt);
  if(Number.isFinite(remoteAt)&&Number.isFinite(baseAt)&&remoteAt>=baseAt)return {ok:true,reason:'server-newer-than-unchanged-pending'};
 }
 return {ok:false,reason:'business-difference'};
}
function readJson(k,f){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(e){return f}}
function writeJson(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){state.lastError=sid(e?.message||e);return false}}
function authReady(){return window.__HLGB_AUTH_READY===true}
async function timed(p,ms,label){let t;try{return await Promise.race([Promise.resolve(p),new Promise((_,rej)=>{t=setTimeout(()=>rej(new Error(label)),ms)})])}finally{clearTimeout(t)}}
async function cloudRow(id){if(typeof window.cloudRequest!=='function')throw new Error('cloudRequest indisponível');const q='hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at,updated_by&module=eq.production&entity_id=eq.'+encodeURIComponent(sid(id))+'&limit=1';const rows=await timed(window.cloudRequest(q,{method:'GET'}),12000,'Timeout confirmando Produção');return Array.isArray(rows)&&rows.length?rows[0]:null}
function idbAll(){return new Promise((resolve,reject)=>{if(typeof indexedDB==='undefined'){reject(new Error('IndexedDB indisponível para verificar a fila WAL'));return}let r;try{r=indexedDB.open(DB_NAME)}catch(e){reject(new Error('Falha abrindo IndexedDB: '+sid(e?.message||e)));return}let created=false;r.onupgradeneeded=()=>{created=true;try{r.transaction.abort()}catch(_){}};r.onerror=()=>{if(created){resolve([]);return}reject(new Error('Falha lendo IndexedDB da WAL'))};r.onsuccess=()=>{const d=r.result;try{if(!d.objectStoreNames.contains(STORE)){d.close();resolve([]);return}const tx=d.transaction(STORE,'readonly'),g=tx.objectStore(STORE).getAll();g.onsuccess=()=>{const out=Array.isArray(g.result)?g.result:[];d.close();resolve(out)};g.onerror=()=>{d.close();reject(new Error('Falha relendo entradas IndexedDB da WAL'))}}catch(e){try{d.close()}catch(_){}reject(new Error('Falha verificando IndexedDB: '+sid(e?.message||e)))}}})}
function idbDeleteExact(key,opId){return new Promise(resolve=>{if(typeof indexedDB==='undefined'){resolve(false);return}let r;try{r=indexedDB.open(DB_NAME)}catch(e){resolve(false);return}r.onupgradeneeded=()=>{try{r.transaction.abort()}catch(_){};resolve(false)};r.onerror=()=>resolve(false);r.onsuccess=()=>{const d=r.result;try{if(!d.objectStoreNames.contains(STORE)){d.close();resolve(false);return}const tx=d.transaction(STORE,'readwrite'),s=tx.objectStore(STORE),g=s.get(key);let removed=false;g.onsuccess=()=>{const cur=g.result;if(cur&&sid(cur.opId)===sid(opId)){s.delete(key);removed=true}};tx.oncomplete=()=>{d.close();resolve(removed)};tx.onerror=tx.onabort=()=>{d.close();resolve(false)}}catch(e){try{d.close()}catch(_){}resolve(false)}}})}
async function candidates(){
 const map=new Map(),p=readJson(PENDING_KEY,{modules:{}}),w=readJson(WAL_KEY,{entries:{}}),idb=await idbAll();
 const ensure=id=>{id=sid(id);if(!map.has(id))map.set(id,{id,normalized:[],walLocal:[],walIdb:[]});return map.get(id)};
 for(const op of (p?.modules?.production||[])){if(op?.id==null)continue;ensure(op.id).normalized.push(clone(op))}
 for(const [key,e] of Object.entries(w?.entries||{})){if(sid(e?.module)!=='production'||e?.id==null)continue;ensure(e.id).walLocal.push({...clone(e),key:sid(key)})}
 for(const e of idb){if(sid(e?.module)!=='production'||e?.id==null)continue;ensure(e.id).walIdb.push(clone(e))}
 return [...map.values()];
}
function chooseOperation(c){const all=[...c.walLocal,...c.walIdb,...c.normalized];all.sort((a,b)=>(parseMs(b.updatedAt||b.createdAt)||0)-(parseMs(a.updatedAt||a.createdAt)||0));return all[0]||null}
function normalizedSatisfied(op,server,id){return staleOperationSatisfied(server,op?.data,op?.baseData,op?.baseUpdatedAt,id,op?.deleted===true)}
function removeNormalizedConfirmed(id,server){const p=readJson(PENDING_KEY,null);if(!p?.modules)return 0;const a=Array.isArray(p.modules.production)?p.modules.production:[];let removed=0;const keep=[];for(const op of a){if(sid(op?.id)!==sid(id)){keep.push(op);continue}const proof=normalizedSatisfied(op,server,id);if(proof.ok){removed++;continue}keep.push(op)}if(!removed)return 0;if(keep.length)p.modules.production=keep;else delete p.modules.production;const any=Object.values(p.modules).some(x=>Array.isArray(x)&&x.length);if(any)writeJson(PENDING_KEY,p);else localStorage.removeItem(PENDING_KEY);state.prunedNormalized+=removed;return removed}
async function removeWalConfirmed(c,server){let removed=0;const w=readJson(WAL_KEY,{entries:{}});for(const e of c.walLocal){const proof=staleOperationSatisfied(server,e.data,e.baseData,e.baseUpdatedAt,c.id,e.deleted===true);if(!proof.ok)continue;const cur=w?.entries?.[e.key];if(cur&&sid(cur.opId)===sid(e.opId)){delete w.entries[e.key];removed++;state.prunedWal++}}
 if(removed){if(Object.keys(w.entries||{}).length)writeJson(WAL_KEY,w);else localStorage.removeItem(WAL_KEY)}
 const seen=new Set();for(const e of c.walIdb){const key=sid(e.key||('production|'+sid(e.id)));if(seen.has(key+'|'+sid(e.opId)))continue;seen.add(key+'|'+sid(e.opId));const proof=staleOperationSatisfied(server,e.data,e.baseData,e.baseUpdatedAt,c.id,e.deleted===true);if(!proof.ok)continue;if(await idbDeleteExact(key,e.opId)){state.prunedIdb++;removed++}}
 return removed;
}
function updateSnapshot(server){try{const all=window.hlgbRecordSnapshots||(typeof hlgbRecordSnapshots!=='undefined'?hlgbRecordSnapshots:null);if(!all)return false;let m=all.production;if(!(m instanceof Map)){m=new Map();all.production=m}m.set(sid(server.entity_id),{data:clone(server.data),deleted_at:server.deleted_at||null,revision:+server.revision||0,updated_at:server.updated_at||'',updated_by:server.updated_by||null});return true}catch(e){return false}}
function normalizeLocal(c,server,desired,base,deleted=false){try{const d=window.db||(typeof db!=='undefined'?db:null),a=Array.isArray(d?.production)?d.production:[],i=a.findIndex(x=>sid(x?.id)===sid(c.id));if(deleted===true){if(i<0)return true;const local=a[i];if(productionEquivalent(local,desired)||productionEquivalent(local,base)){a.splice(i,1);try{if(typeof localSaveOnly==='function')localSaveOnly();else window.localSaveOnly?.()}catch(_){}return true}state.skippedNewer++;return false}if(i<0)return true;const local=a[i];if(productionEquivalent(local,desired)||productionEquivalent(local,base)){a[i]=clone(server.data);try{if(typeof localSaveOnly==='function')localSaveOnly();else window.localSaveOnly?.()}catch(_){}return true}if(productionEquivalent(local,server.data))return true;state.skippedNewer++;return false}catch(e){return false}}
function saveProof(row){try{let a=readJson(PROOF_KEY,[]);if(!Array.isArray(a))a=[];a.push(row);writeJson(PROOF_KEY,a.slice(-160))}catch(e){}}
async function reconcileOne(c,reason){
 const op=chooseOperation(c);if(!op)return {id:c.id,ok:false,reason:'sem-operacao'};const server=await cloudRow(c.id);state.checked++;
 const proof=staleOperationSatisfied(server,op.data,op.baseData,op.baseUpdatedAt,c.id,op.deleted===true);const row={kind:'production-reconcile-proof',version:V,patch:PATCH,at:new Date().toISOString(),id:c.id,reason,confirmed:proof.ok,proofReason:proof.reason,serverRevision:+server?.revision||0,serverUpdatedAt:server?.updated_at||'',walLocal:c.walLocal.length,walIdb:c.walIdb.length,normalized:c.normalized.length};saveProof(row);if(!proof.ok){state.verificationErrors++;return {id:c.id,ok:false,reason:proof.reason}}
 const localSafe=normalizeLocal(c,server,op.data,op.baseData,op.deleted===true);if(!localSafe){state.verificationErrors++;return {id:c.id,ok:false,reason:'local-newer-preserved',serverRevision:+server.revision||0}}
 if(op.deleted!==true)updateSnapshot(server);const n=removeNormalizedConfirmed(c.id,server),w=await removeWalConfirmed(c,server);try{if(typeof hlgbRecordPendingStore==='function')hlgbRecordPendingStore();else window.hlgbRecordPendingStore?.()}catch(_){}state.confirmed++;
 const all=[...c.walLocal,...c.walIdb,...c.normalized],operationIds=[...new Set(all.filter(e=>staleOperationSatisfied(server,e.data,e.baseData,e.baseUpdatedAt,c.id,e.deleted===true).ok).map(e=>sid(e.opId||e.operationId)).filter(Boolean))];
 return {id:c.id,ok:true,proof:proof.reason,normalizedRemoved:n,walRemoved:w,serverRevision:+server.revision||0,operationIds,patch:PATCH};
}
async function reconcile(reason='manual'){
 if(state.busy||!authReady()||navigator.onLine===false)return false;state.busy=true;state.runs++;state.lastAt=new Date().toISOString();const results=[];
 try{const list=await candidates();for(const c of list){try{results.push(await reconcileOne(c,reason))}catch(e){results.push({id:c.id,ok:false,error:sid(e?.message||e)});state.lastError=sid(e?.message||e)}}state.lastResult={at:new Date().toISOString(),reason,results,patch:PATCH};return state.lastResult}
 catch(e){state.lastError=sid(e?.message||e);state.verificationErrors++;throw e}
 finally{state.busy=false}
}
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<94.39){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}}
function activate(reason='authenticated'){if(!authReady())return false;state.active=true;stamp();[0,120,500,1600].forEach(ms=>setTimeout(()=>reconcile(reason).catch(()=>{}),ms));return true}
window.hlgbProductionReconcile9439={version:V,patch:PATCH,state,activate,reconcile,candidates,productionEquivalent,staleOperationSatisfied,serverProof,status:()=>({...state,authReady:authReady()})};
window.addEventListener('hlgb:authenticated',()=>activate('authenticated-event'));
window.addEventListener('online',()=>{if(authReady())setTimeout(()=>reconcile('online').catch(()=>{}),80)});
window.addEventListener('focus',()=>{if(authReady())setTimeout(()=>reconcile('focus').catch(()=>{}),150)});
if(authReady())activate('loaded-after-auth');
console.info('[HLGB] v'+V+' reconciliação conservadora de Produção ativa · patch '+PATCH);
})();
