/* HLGB v93.24 — entrega direta e verificada de novos lançamentos do Hub */
(function(){
'use strict';
const V='93.24',MODULE='hubFinanceEntries';
if(window.hlgbHubDelivery9324?.version===V)return;
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const previous=window.hlgbHubSaveConfirmed;
let installs=0,directAttempts=0,directConfirmed=0,fallbackExisting=0,failed=0,lastError='',lastId='',lastAt='';
function data(){try{return typeof db!=='undefined'?db:window.db}catch(e){return window.db}}
function rows(){const d=data();if(!d)return[];d[MODULE]=Array.isArray(d[MODULE])?d[MODULE]:[];return d[MODULE]}
function idOf(row){const v=row?.id??row?.__hlgbId;return v==null?'':sid(v)}
function upsert(row){const id=idOf(row);if(!id)return false;const a=rows(),next=clone(row),i=a.findIndex(x=>idOf(x)===id);if(i>=0)a[i]=next;else a.push(next);try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}return true}
function status(text,type=''){try{if(typeof setCloudStatus==='function')setCloudStatus(text,type);else window.setCloudStatus?.(text,type)}catch(e){}}
async function cloudRow(id){
 if(typeof cloudRequest!=='function'&&typeof window.cloudRequest!=='function')throw new Error('Transporte da nuvem indisponível.');
 const req=typeof cloudRequest==='function'?cloudRequest:window.cloudRequest;
 const out=await req(`hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at,updated_by&module=eq.${encodeURIComponent(MODULE)}&entity_id=eq.${encodeURIComponent(id)}&limit=1`,{method:'GET'});
 return Array.isArray(out)&&out.length?out[0]:null;
}
/* v94.83: a resposta local nao e ACK. Tudo que veio do botao Salvar exige RPC,
   revisao e releitura completa da linha; falha da fila local nao impede RPC autenticado. */
const SAVE_BUILD='94.83';
const trace={build:SAVE_BUILD,attempts:0,phase:'not-tested',outcome:'not-tested',lastAt:'',source:'',
  clickAt:'',rpcAt:'',ackAt:'',readbackAt:'',visibleAt:'',revision:null,errorCode:'',history:[]};
function signal(phase,detail={}){
 const at=new Date().toISOString();trace.phase=phase;trace.lastAt=at;
 if(phase==='click')trace.clickAt=at;
 if(phase==='rpc-send')trace.rpcAt=at;
 if(phase==='rpc-ack')trace.ackAt=at;
 if(phase==='remote-readback')trace.readbackAt=at;
 if(phase==='ui-updated')trace.visibleAt=at;
 if(detail.revision!==undefined)trace.revision=detail.revision;
 const row={at,phase,...detail};delete row.id;delete row.data;delete row.value;
 trace.history.push(row);if(trace.history.length>18)trace.history.shift();
}
function traceStatus(){return clone(trace)}
function canonical(v){
 if(Array.isArray(v))return v.map(canonical);
 if(v===null||typeof v!=='object')return v;
 const r={};for(const k of Object.keys(v).sort()){
  if(k==='updatedAt'||k==='updated_at'||k==='revision'||k==='baseUpdatedAt'||k==='clientVersion'||k==='opId'||k==='operationId'||k.startsWith('__hlgb'))continue;
  r[k]=canonical(v[k]);
 }
 return r;
}
function sameBusiness(a,b){try{return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}catch(e){return false}}
function revisionOf(s){const n=Number(s?.revision);return Number.isSafeInteger(n)&&n>=0?n:null}
function snapshotFor(id){
 try{const root=typeof hlgbRecordSnapshots!=='undefined'?hlgbRecordSnapshots:window.hlgbRecordSnapshots;
  return root?.[MODULE]?.get?.(sid(id))||null}catch(e){return null}
}
function checkPending(id){
 try{
  const p=JSON.parse(localStorage.getItem('hlgb_records_pending_v91')||'null');
  const q=Array.isArray(p?.modules?.[MODULE])?p.modules[MODULE]:[];
  if(q.some(x=>sid(x?.id)===sid(id)))throw new Error('Este lançamento tem uma edição pendente no aparelho. Sincronize antes de salvar outra versão.');
 }catch(e){if(/edição pendente no aparelho/.test(sid(e?.message)))throw e}
}
async function rawCreate(id,payload,expectedRevision=0){
 directAttempts++;lastId=sid(id);lastAt=new Date().toISOString();
 if(navigator?.onLine===false)throw new Error('Sem conexão. O lançamento ainda não foi salvo na nuvem.');
 if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
 const rpc=typeof hlgbRecordRpcSave==='function'?hlgbRecordRpcSave:window.hlgbRecordRpcSave;
 let out;
 signal('rpc-send',{revision:expectedRevision});
 if(typeof rpc==='function')out=await rpc(MODULE,sid(id),clone(payload),expectedRevision,false);
 else{
  const req=typeof cloudRequest==='function'?cloudRequest:window.cloudRequest;
  if(typeof req!=='function')throw new Error('RPC de gravação indisponível; nenhuma confirmação remota.');
  out=await req('rpc/hlgb_save_record',{method:'POST',headers:{Prefer:'return=representation'},
   body:JSON.stringify({p_module:MODULE,p_entity_id:sid(id),p_data:clone(payload),
    p_expected_revision:expectedRevision,p_deleted:false})});
 }
 if(Array.isArray(out))out=out[0];
 if(out?.applied!==true)throw new Error(out?.reason||out?.error||'Conflito ou gravação recusada pelo Supabase. Reabra os dados antes de tentar novamente.');
 const ackRevision=revisionOf(out);
 if(ackRevision===null||ackRevision<=expectedRevision)throw new Error('O servidor não confirmou uma revisão nova; não foi possível concluir o salvamento.');
 signal('rpc-ack',{revision:ackRevision});
 const verified=await cloudRow(id);
 if(!verified||verified.deleted_at||sid(verified.entity_id)!==sid(id)||sid(verified.module)!==MODULE)
  throw new Error('O servidor respondeu, mas o registro não foi encontrado na releitura.');
 const verifiedRevision=revisionOf(verified);
 if(verifiedRevision===null||verifiedRevision<ackRevision||!sameBusiness(verified.data,payload))
  throw new Error('A releitura da nuvem não confirmou todos os campos e a revisão. O formulário foi mantido.');
 signal('remote-readback',{revision:verifiedRevision});
 return {verified,data:clone(verified.data),revision:verifiedRevision,ackRevision};
}
function confirmLocal(id,data,verified){
 upsert(data);
 try{
  const root=typeof hlgbRecordSnapshots!=='undefined'?hlgbRecordSnapshots:window.hlgbRecordSnapshots;
  if(root){
   const m=root[MODULE]||new Map();
   m.set(sid(id),{data:clone(data),deleted_at:null,revision:revisionOf(verified),
    updated_at:verified.updated_at||new Date().toISOString(),updated_by:verified.updated_by||null});
   root[MODULE]=m;
  }
 }catch(e){}
 try{window.dispatchEvent?.(new CustomEvent('hlgb:hub-finance-changed',{detail:{source:'confirmed-save',module:MODULE}}))}catch(e){}
 signal('ui-updated',{revision:revisionOf(verified)});
}
function queueRecovery(){try{window.hlgbSaveTransport9320?.retry?.()}catch(e){}}
async function save(row,deleted=false,opts={}){
 if(deleted||!row){if(typeof previous==='function')return previous(row,deleted);throw new Error('Exclusão requer o salvamento protegido anterior.');}
 const id=idOf(row);if(!id)throw new Error('Lançamento sem identificação.');
 const payload=clone(row);payload.updatedAt=payload.updatedAt||new Date().toISOString();
 trace.attempts++;trace.source=sid(opts?.source||'hub-save');trace.outcome='in-progress';trace.errorCode='';
 signal('click',{source:trace.source});
 try{
  if(navigator?.onLine===false)throw new Error('Sem conexão. O lançamento não foi confirmado na nuvem. Mantenha a janela aberta.');
  checkPending(id);signal('remote-preflight');
  const existing=await cloudRow(id); // Falha de consulta NAO deve ser confundida com registro novo.
  let expected=0;
  if(existing){
   if(existing.deleted_at)throw new Error('Lançamento excluído na nuvem. Recarregue antes de editar.');
   const serverRev=revisionOf(existing);
   if(serverRev===null)throw new Error('Servidor não retornou revisão válida.');
   const snap=snapshotFor(id),snapRev=revisionOf(snap);
   if(snapRev!==null&&snapRev!==serverRev)throw new Error('Conflito: outra sessão alterou este lançamento. Recarregue antes de salvar.');
   if(opts?.original&&!sameBusiness(existing.data,opts.original)&&!sameBusiness(existing.data,payload))
    throw new Error('Conflito: o conteúdo foi alterado em outro computador. Recarregue antes de salvar.');
   if(sameBusiness(existing.data,payload)){
    // Retry idempotente após ACK perdido, ou campo de negócio inalterado.
    signal('remote-readback',{revision:serverRev});
    confirmLocal(id,existing.data,existing);
    trace.outcome='confirmed';directConfirmed++;lastError='';
    status('✅ Salvo na nuvem','ok');
    return {applied:true,remoteVerified:true,fromReadback:true,data:clone(existing.data),
      revision:serverRev,updated_at:existing.updated_at,deleted_at:null};
   }
   fallbackExisting++;expected=serverRev;
  }else if(opts?.original){
   throw new Error('O lançamento original não existe na nuvem. Não foi criada uma cópia com outro ID.');
  }
  const result=await rawCreate(id,payload,expected);
  confirmLocal(id,result.data,result.verified);
  directConfirmed++;lastError='';trace.outcome='confirmed';status('✅ Salvo na nuvem','ok');
  return {applied:true,remoteVerified:true,direct:true,data:clone(result.data),
   revision:result.revision,updated_at:result.verified.updated_at,deleted_at:null};
 }catch(err){
  failed++;lastError=sid(err?.message||err);trace.outcome='failed';trace.errorCode=
   /conflito/i.test(lastError)?'conflict':/conexão|network|fetch|timeout/i.test(lastError)?'network':'unverified';
  signal('failed',{stage:trace.phase,code:trace.errorCode});
  status('⚠️ Não confirmado na nuvem. Corrija a falha e tente novamente.','warn');
  throw err; // Nao altera db, nao cria fila, nao fecha modal.
 }
}
function install(){window.hlgbHubSaveConfirmed=save;window.HLGB_HUB_SAVE_AUTHORITY=V;save.__hlgbHubSaveAuthority=V;installs++;try{const cur=Number(window.HLGB_RELEASE_VERSION)||0;if(cur<93.24){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V;const b=document.querySelector('#loginScreen b');if(b&&/Versão/i.test(b.textContent||''))b.textContent='Versão v'+V}}catch(e){}return true}
function state(){return {version:V,installs,directAttempts,directConfirmed,fallbackExisting,failed,lastError,lastId,lastAt,authority:window.HLGB_HUB_SAVE_AUTHORITY,authoritative:window.hlgbHubSaveConfirmed===save,build:SAVE_BUILD,trace:traceStatus()}}
install();let n=0;const timer=setInterval(()=>{n++;if(window.hlgbHubSaveConfirmed!==save)install();if(n>=120)clearInterval(timer)},500);
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(install,150),0)}catch(e){}
window.hlgbHubSaveTrace9483={status:traceStatus};window.hlgbHubDelivery9324={version:V,build:SAVE_BUILD,install,state,save,cloudRow,rawCreate,traceStatus,sameBusiness};
console.info('[HLGB] v'+V+' entrega direta e verificada de novos lançamentos do Hub ativa');
})();
