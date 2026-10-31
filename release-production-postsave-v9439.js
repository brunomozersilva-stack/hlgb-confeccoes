/* HLGB v94.39 — gatilho pós-save da Produção.
   Não confirma nem remove nada por conta própria; apenas chama a reconciliação
   conservadora v94.39 após uma tentativa de gravação. */
(function(){
'use strict';
const V='94.39';
if(window.HLGB_PRODUCTION_POSTSAVE_9439===V){try{window.hlgbProductionPostSave9439?.activate?.()}catch(e){}return}
window.HLGB_PRODUCTION_POSTSAVE_9439=V;
const state={version:V,installs:0,calls:0,scheduled:0,lastAt:'',lastError:''};
const sid=v=>String(v??'');
const POINTERS=['__original','__hlgb955Original','__hlgb9307Original','__hlgb9320Original','__hlgbReliableOriginal','__hlgb9313Original','__hlgb9339Original'];
function chainHas(fn){const seen=new Set();let cur=fn,n=0;while(typeof cur==='function'&&!seen.has(cur)&&n++<100){if(cur.__hlgbProductionPostSave9439)return true;seen.add(cur);let next=null;for(const p of POINTERS){try{if(typeof cur[p]==='function'){next=cur[p];break}}catch(e){}}cur=next}return false}
function schedule(reason){state.scheduled++;state.lastAt=new Date().toISOString();[0,180,650].forEach(ms=>setTimeout(()=>{try{window.hlgbProductionReconcile9439?.reconcile?.(reason)}catch(e){}},ms))}
function install(){let fn=window.hlgbRecordSaveWithRetry;try{if(typeof hlgbRecordSaveWithRetry==='function')fn=hlgbRecordSaveWithRetry}catch(e){}if(typeof fn!=='function'||chainHas(fn))return false;const w=async function(module,id,data,deleted=false){if(sid(module)!=='production')return fn.apply(this,arguments);state.calls++;try{const out=await fn.apply(this,arguments);schedule(out?.applied===true?'post-save-applied':'post-save-unconfirmed');return out}catch(e){state.lastError=sid(e?.message||e);schedule('post-save-error');throw e}};w.__hlgbProductionPostSave9439=true;w.__original=fn;try{window.hlgbRecordSaveWithRetry=w}catch(e){}try{hlgbRecordSaveWithRetry=w}catch(e){}state.installs++;return true}
function activate(){if(window.__HLGB_AUTH_READY!==true)return false;[0,250,700,1400,2600,4500].forEach(ms=>setTimeout(install,ms));return true}
window.hlgbProductionPostSave9439={version:V,state,activate,install,status:()=>({...state,authReady:window.__HLGB_AUTH_READY===true})};
window.addEventListener('hlgb:authenticated',activate);
if(window.__HLGB_AUTH_READY===true)activate();
console.info('[HLGB] v'+V+' gatilho pós-save da Produção ativo');
})();
