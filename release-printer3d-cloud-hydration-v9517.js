/* HLGB v95.17 — restauro seguro dos dados da Impressora 3D.
   Leitura autenticada e restrita aos 3 módulos; nunca cria, altera ou exclui dados na nuvem/WAL.
   Salva somente o cache local após conferir o retorno e respeitar alterações pendentes. */
(function(){
'use strict';
if(window.hlgbPrinter3dCloud9517)return;
const V='95.17',MODULES=['printer3dProducts','printer3dSales','printer3dSettings'],SECTIONS=['printer3dHome9400','printer3dProducts9400','printer3dSales9400','printer3dCatalog9400'];
const state={version:V,status:'not-tested',verified:false,loading:false,lastAt:'',lastError:'',lastReason:'',remoteCounts:{},localCounts:{},missing:[],settingsMismatch:false,preservedPending:0,extraLocal:0,attempts:0};
const sid=v=>String(v??''),copy=v=>{try{return structuredClone(v)}catch(_){return JSON.parse(JSON.stringify(v))}};
let inflight=null,lastGood=0,started=false;
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.db||null}
function snapsRef(){try{if(typeof hlgbRecordSnapshots!=='undefined'&&hlgbRecordSnapshots)return hlgbRecordSnapshots}catch(_){}return window.hlgbRecordSnapshots||null}
function visible3d(){const id=document.querySelector('.page.active')?.id||'';return SECTIONS.includes(id)}
function pendingLocal(){
 const found=new Set();
 try{const p=JSON.parse(localStorage.getItem('hlgb_records_pending_v91')||'null');for(const m of MODULES)for(const op of p?.modules?.[m]||[])if(op&&op.deleted!==true)found.add(m+'|'+sid(op.id))}catch(e){}
 try{const w=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||'null');for(const op of Object.values(w?.entries||{}))if(op&&MODULES.includes(op.module)&&op.deleted!==true)found.add(op.module+'|'+sid(op.id))}catch(e){}
 return found;
}
async function pendingIdb(){
 const out=new Set();
 if(typeof indexedDB==='undefined')return {ids:out,verified:false};
 return await new Promise(resolve=>{
  let done=false;const finish=v=>{if(!done){done=true;resolve(v)}};
  let request;
  try{request=indexedDB.open('hlgb_durable_wal')}catch(e){finish({ids:out,verified:false});return}
  request.onupgradeneeded=()=>{try{request.transaction?.abort()}catch(_){}finish({ids:out,verified:true})};
  request.onerror=()=>finish({ids:out,verified:false});
  request.onsuccess=()=>{
   const database=request.result;
   try{
    if(!database.objectStoreNames.contains('entries')){database.close();finish({ids:out,verified:true});return}
    const tx=database.transaction('entries','readonly'),req=tx.objectStore('entries').openCursor();
    req.onsuccess=()=>{const c=req.result;if(!c)return;const e=c.value;if(e&&MODULES.includes(e.module)&&e.deleted!==true)out.add(e.module+'|'+sid(e.id));c.continue()};
    tx.oncomplete=()=>{database.close();finish({ids:out,verified:true})};
    tx.onerror=()=>{database.close();finish({ids:out,verified:false})};
    tx.onabort=()=>{database.close();finish({ids:out,verified:false})};
   }catch(e){try{database.close()}catch(_){}finish({ids:out,verified:false})}
  };
 });
}
function status(){
 const d=dbRef()||{},localCounts={},missing=[];
 for(const m of MODULES){
  localCounts[m]=Array.isArray(d[m])?d[m].length:0;
  for(const id of state.remoteCounts[m]?.ids||[])if(!(d[m]||[]).some(x=>sid(x?.id)===sid(id)))missing.push(m+'|'+sid(id));
 }
 const snapshot=Object.fromEntries(MODULES.map(m=>[m,{cloud:state.remoteCounts[m]?.count??null,local:localCounts[m]}]));
 return {...state,remoteCounts:snapshot,localCounts,missing,recordsVerified:state.verified&&missing.length===0&&!state.settingsMismatch};
}
function label(s){
 if(s.loading)return 'Consultando produtos e custos 3D na nuvem…';
 if(s.status==='pass')return 'Nuvem conferida: '+(s.remoteCounts.printer3dProducts?.count||0)+' produto(s), '+(s.remoteCounts.printer3dSales?.count||0)+' venda(s). Filamento R$ '+(s.filamentPriceKg??0).toLocaleString('pt-BR',{minimumFractionDigits:2})+'/kg.';
 if(s.status==='fail')return 'Atenção: os cadastros 3D da nuvem ainda não coincidem com esta tela. Não sobrescreva os valores.';
 if(s.status==='warn')return 'Atenção: a recuperação dos dados 3D ainda não foi comprovada. '+(s.lastError||'Confira o acesso à nuvem.');
 return 'Conferindo cadastros da Impressora 3D…';
}
function decorate(){
 for(const pid of SECTIONS){
  const page=document.getElementById(pid);if(!page)continue;
  const host=document.getElementById(pid+'Host');if(!host)continue;
  let bar=document.getElementById(pid+'Cloud9517');
  if(!bar){bar=document.createElement('div');bar.id=pid+'Cloud9517';bar.style.cssText='padding:10px 12px;margin:10px 0;border:1px solid #e9dce4;border-radius:9px;background:#fff8fb;font-size:13px;color:#503443';bar.innerHTML='<span data-hlgb-3d-status></span> <button type="button" data-hlgb-3d-reload style="margin-left:8px;font-size:12px">Recarregar da nuvem</button>';host.parentNode.insertBefore(bar,host);
   bar.querySelector('[data-hlgb-3d-reload]').addEventListener('click',()=>refresh('manual',true).catch(()=>{}));
  }
  const line=bar.querySelector('[data-hlgb-3d-status]');if(line)line.textContent=label(state);
 }
}
function redraw(){
 const active=document.querySelector('.page.active');
 if(!active||!SECTIONS.includes(active.id))return;
 if(document.querySelector('#modal.show')||document.activeElement?.closest?.('#'+active.id+' input,#'+active.id+' textarea,#'+active.id+' select'))return;
 const f={printer3dHome9400:'render3dHome',printer3dProducts9400:'render3dProducts',printer3dSales9400:'render3dSales',printer3dCatalog9400:'render3dCatalog'}[active.id];
 try{window.hlgbBusinessExpansion9400?.[f]?.()}catch(e){console.warn('[HLGB '+V+'] render',e)}
}
function mergeRows(rows,pending,idbVerified){
 const d=dbRef(),snapshots=snapsRef();
 if(!d||!snapshots)throw Error('Banco local ou mapa de snapshots ainda não inicializado.');
 const byModule=Object.fromEntries(MODULES.map(m=>[m,[]]));
 for(const row of rows){if(!MODULES.includes(sid(row?.module)))continue;if(row?.deleted_at||!row?.data||row?.entity_id==null)continue;byModule[row.module].push(row)}
 let preserved=0,extras=0,changed=false;
 const nextCounts={},nextMissing=[];
 for(const m of MODULES){
  const remote=byModule[m],existing=Array.isArray(d[m])?d[m]:[];
  const map=new Map(existing.filter(x=>x&&x.id!=null).map(x=>[sid(x.id),x]));
  const cloudIds=new Set();
  const snapshotsMap=snapshots[m] instanceof Map?snapshots[m]:new Map();
  for(const r of remote){
   const id=sid(r.entity_id),key=m+'|'+id,old=map.get(id),prev=snapshotsMap.get(id);
   cloudIds.add(id);
   const newerLocal=prev&&Number(prev.revision||0)>Number(r.revision||0);
   const keep=!!old&&(pending.has(key)||(newerLocal)||(!idbVerified&&JSON.stringify(old)!==JSON.stringify(r.data)));
   if(keep){preserved++;if(newerLocal)continue}
   if(!keep)map.set(id,copy({...r.data,id:r.data.id??id}));
   if(!newerLocal)snapshotsMap.set(id,{module:m,entity_id:id,data:copy(r.data),deleted_at:null,revision:Number(r.revision||0),updated_at:sid(r.updated_at),updated_by:r.updated_by??null});
  }
  snapshots[m]=snapshotsMap;
  for(const id of map.keys())if(!cloudIds.has(id))extras++;
  const merged=[...map.values()];
  if(JSON.stringify(existing)!==JSON.stringify(merged)){d[m]=merged;changed=true}
  nextCounts[m]={count:remote.length,ids:[...cloudIds]};
  for(const id of cloudIds)if(!merged.some(x=>sid(x?.id)===id))nextMissing.push(m+'|'+id);
 }
 if(changed){try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){console.warn('[HLGB '+V+'] cache local não persistido',e)}}
 return {counts:nextCounts,missing:nextMissing,preserved,extras,changed};
}
async function refresh(reason='manual',force=false){
 if(inflight)return inflight;
 if(!force&&state.verified&&Date.now()-lastGood<30000)return status();
 inflight=(async()=>{
  state.loading=true;state.lastReason=reason;state.attempts++;decorate();
  try{
   if(typeof cloudRequest!=='function')throw Error('Conexão autenticada ainda não carregada.');
   if(typeof cloudEnsureFreshSession==='function'){
    const ok=await cloudEnsureFreshSession(false);if(ok===false)throw Error('Sessão da nuvem indisponível.');
   }
   if(typeof cloudAccessToken==='undefined'||!cloudAccessToken)throw Error('Aguardando login da nuvem.');
   // Leitura somente dos três módulos. Nenhum RPC de escrita nem gravação de registros.
   const path='hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at,updated_by&module=in.(printer3dProducts,printer3dSales,printer3dSettings)&deleted_at=is.null&order=updated_at.asc&limit=200';
   const rows=await cloudRequest(path,{method:'GET'});
   if(!Array.isArray(rows))throw Error('A nuvem não retornou uma lista válida de registros 3D.');
   if(rows.length>=200)throw Error('Limite de leitura 3D atingido; não é seguro assumir que o retorno está completo.');
   const pending=pendingLocal(),wal=await pendingIdb();state.idbPendingKeys=[...wal.ids];for(const id of wal.ids)pending.add(id);
   const out=mergeRows(rows,pending,wal.verified);
   state.remoteCounts=out.counts;state.missing=out.missing;state.preservedPending=out.preserved;state.extraLocal=out.extras;
   const d=dbRef(),settingsRemote=rows.find(r=>r.module==='printer3dSettings'&&sid(r.entity_id)==='settings-main')?.data||null;
   const settingsLocal=(d?.printer3dSettings||[]).find(x=>sid(x?.id)==='settings-main')||null;
   state.settingsMismatch=!!settingsRemote&&!!settingsLocal&&!pending.has('printer3dSettings|settings-main')&&Number(settingsRemote.filamentPriceKg||0)!==Number(settingsLocal.filamentPriceKg||0);
   state.filamentPriceKg=settingsRemote?.filamentPriceKg??null;
   state.verified=true;state.lastAt=new Date().toISOString();lastGood=Date.now();state.lastError='';
   state.status=out.missing.length||state.settingsMismatch?'fail':!rows.length||!wal.verified||out.preserved?'warn':'pass';
   if(!rows.length)state.lastError='Nenhum registro retornou para este usuário; confirme permissão antes de cadastrar novamente.';
   if(!wal.verified)state.lastError='WAL IndexedDB não pôde ser conferido. Registros locais existentes foram preservados.';
   if(out.preserved)state.lastError='Há alteração local 3D pendente ou revisão mais recente, mantida sem sobrescrever a nuvem.';
   redraw();return status();
  }catch(e){state.lastError=sid(e?.message||e);state.status='warn';state.verified=false;console.warn('[HLGB '+V+'] leitura 3D',e);return status()}
  finally{state.loading=false;decorate()}
 })().finally(()=>{inflight=null});
 return inflight;
}
function captureUnverifiedSaves(event){
 const el=event.target?.closest?.('#printer3dHome9400Host button[onclick*="save3dSettings9400"],#printer3dProducts9400Host button[onclick*="new3dProduct9400"],#printer3dProducts9400Host button[onclick*="edit3dProduct9400"],#printer3dSales9400Host button[onclick*="new3dSale9400"]');
 if(!el||state.verified&&state.status!=='fail')return;
 event.preventDefault();event.stopImmediatePropagation();
 alert('Os registros da Impressora 3D ainda não foram confirmados na nuvem. Aguarde a recuperação ou clique em Recarregar da nuvem. Nenhum dado foi sobrescrito.');
}
function install(){
 if(started)return;started=true;decorate();
 document.addEventListener('click',captureUnverifiedSaves,true);
 const start=()=>setTimeout(()=>{refresh('login',true).catch(()=>{})},600);
 if(typeof hlgbAfterLogin==='function')try{hlgbAfterLogin(start,0)}catch(_){}
 window.addEventListener('hlgb:authenticated',start);
 window.addEventListener('focus',()=>{if(visible3d()&&Date.now()-lastGood>45000)refresh('focus').catch(()=>{})});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&visible3d()&&Date.now()-lastGood>45000)refresh('visible').catch(()=>{})});
 [400,1700,4500].forEach(ms=>setTimeout(()=>{decorate();if(!state.verified&&!state.loading)refresh('settle-'+ms).catch(()=>{})},ms));
}
window.hlgbPrinter3dCloud9517={state,status,refresh,decorate,mergeRows,pendingLocal};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();