/* HLGB v95.36 — protege operações que existem SOMENTE no IndexedDB do Safari.
   Probe apenas READONLY. Nunca reenvia, exclui, sobrescreve ou confirma operações. */
(function(){
'use strict';
if(window.hlgbWalIdbGuard9536)return;
const VERSION='95.36',NAME='hlgb_durable_wal',STORE='entries';
const state={version:VERSION,probes:0,installed:0,lastProbeAt:'',lastError:'',readFailed:false,
  indexedDbOnly:0,entryCount:0,protectedIncoming:0,loadBlocked:0,unsupported:false};
let ids=new Set(),rawKeys=new Set(),inflight=null;
const sid=v=>String(v==null?'':v);
function keyOf(entry){
 if(!entry||typeof entry!=='object')return null;
 let module=sid(entry.module),id=sid(entry.id||entry.entity_id);
 const key=sid(entry.key);
 if((!module||!id)&&key.includes('|')){
  const pos=key.indexOf('|');module=module||key.slice(0,pos);id=id||key.slice(pos+1);
 }
 return module&&id&&/^[A-Za-z][A-Za-z0-9]*$/.test(module)?module+'::'+id:null;
}
function scan(){
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined'){state.unsupported=true;resolve({ids:new Set(),keys:new Set(),count:0});return}
  let request,db=null,done=false,missing=false,watchdog;
  const finish=(error,value)=>{
   if(done)return;done=true;clearTimeout(watchdog);
   try{db?.close()}catch(_){}
   if(error)reject(error);else resolve(value);
  };
  watchdog=setTimeout(()=>finish(new Error('Leitura do IndexedDB excedeu 8 segundos')),8000);
  try{request=indexedDB.open(NAME)}
  catch(e){finish(e);return}
  request.onblocked=()=>finish(new Error('IndexedDB bloqueado por outra aba'));
  request.onupgradeneeded=()=>{
   missing=true;
   try{request.transaction.abort()}catch(_){}
   finish(null,{ids:new Set(),keys:new Set(),count:0});
  };
  request.onerror=()=>finish(missing?null:(request.error||new Error('Falha ao abrir IndexedDB')),
   missing?{ids:new Set(),keys:new Set(),count:0}:undefined);
  request.onsuccess=()=>{
   if(done){try{request.result.close()}catch(_){}return}
   db=request.result;
   if(!db.objectStoreNames.contains(STORE)){finish(null,{ids:new Set(),keys:new Set(),count:0});return}
   try{
    const tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE),found=new Set(),keys=new Set();
    let count=0,readError=null;
    const cursor=store.openCursor();
    cursor.onsuccess=()=>{
     const cur=cursor.result;
     if(!cur)return;
     count++;
     const identity=keyOf(cur.value);
     if(identity)found.add(identity);
     const k=sid(cur.value?.key||cur.key||'');
     if(k)keys.add(k);
     cur.continue();
    };
    cursor.onerror=()=>{readError=cursor.error||new Error('Falha ao ler diário IndexedDB')};
    tx.oncomplete=()=>{
     if(readError)finish(readError);
     else finish(null,{ids:found,keys,count});
    };
    tx.onabort=()=>finish(tx.error||readError||new Error('Transação de leitura abortada'));
    tx.onerror=()=>{readError=tx.error||readError||new Error('Erro da transação de leitura')};
   }catch(e){finish(e)}
  };
 });
}
async function probe(){
 if(inflight)return inflight;
 inflight=(async()=>{
  try{
   const result=await scan();
   ids=result.ids;rawKeys=result.keys;state.entryCount=result.count;
   state.readFailed=false;state.lastError='';state.probes++;
   state.lastProbeAt=new Date().toISOString();
   let localEntries={};
   try{localEntries=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||'null')?.entries||{}}catch(_){}
   state.indexedDbOnly=[...rawKeys].filter(k=>!Object.prototype.hasOwnProperty.call(localEntries,k)).length;
   return {count:state.entryCount,identities:ids.size,indexedDbOnly:state.indexedDbOnly};
  }catch(e){
   // Não transformar erro de leitura em "0 pendências". Mantenha o cache anterior.
   state.readFailed=true;state.lastError=sid(e?.message||e);
   throw e;
  }finally{inflight=null}
 })();
 return inflight;
}
function status(){return {...state,identities:ids.size}}
function install(){
 let installed=false;
 const read=window.hlgbRecordPendingIdentitySet9535;
 if(typeof read==='function'&&!read.__hlgbIdb9536){
  const wrapped=function(...args){
   const out=read.apply(this,args),result=out instanceof Set?new Set(out):new Set();
   for(const id of ids)result.add(id);
   return result;
  };
  wrapped.__hlgbIdb9536=true;wrapped.__original=read;
  window.hlgbRecordPendingIdentitySet9535=wrapped;
  installed=true;
 }
 const apply=window.hlgbApplyRecordRow;
 if(typeof apply==='function'&&!apply.__hlgbIdb9536){
  const wrapped=function(row,...rest){
   const key=sid(row?.module)+'::'+sid(row?.entity_id);
   // Tombstone remoto concorrente não pode destruir a única cópia local
   // ainda presente na WAL durável do Safari. Conciliação exige prova.
   if(row?.deleted_at&&ids.has(key)){
    state.protectedIncoming++;
    return false;
   }
   return apply.call(this,row,...rest);
  };
  wrapped.__hlgbIdb9536=true;wrapped.__original=apply;
  window.hlgbApplyRecordRow=wrapped;
  installed=true;
 }
 const load=window.hlgbRecordLoadBundle;
 if(typeof load==='function'&&!load.__hlgbIdb9536){
  const wrapped=async function(...args){
   try{await probe()}
   catch(e){
    state.loadBlocked++;
    throw new Error('Leitura de segurança das pendências do Safari falhou: '+sid(e?.message||e)+
      '. Dados locais preservados; tente novamente sem limpar o navegador.');
   }
   return load.apply(this,args);
  };
  wrapped.__hlgbIdb9536=true;wrapped.__original=load;
  window.hlgbRecordLoadBundle=wrapped;
  installed=true;
 }
 if(installed)state.installed++;
 return installed;
}
window.hlgbWalIdbGuard9536={
 version:VERSION,probe,status,ids:()=>new Set(ids),keys:()=>new Set(rawKeys),
 pendingCount:()=>rawKeys.size,install
};
install();
[0,90,450,1200].forEach(ms=>setTimeout(install,ms));
probe().catch(e=>console.warn('[HLGB '+VERSION+'] WAL do Safari não verificado',e));
window.addEventListener('focus',()=>probe().catch(()=>{}));
window.addEventListener('pageshow',()=>{install();probe().catch(()=>{})});
window.addEventListener('online',()=>probe().catch(()=>{}));
console.info('[HLGB] '+VERSION+' proteção IndexedDB read-only carregada');
})();