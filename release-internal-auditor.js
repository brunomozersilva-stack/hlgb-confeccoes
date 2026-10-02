/* HLGB — Modo Auditor/Testador interno
   Auditoria de leitura: estrutura, visual atual, funções, sincronização e integridade.
   Não cria pedidos, não altera produção e não executa ações operacionais. */
(function(){
'use strict';

const AUDIT_MODULE='systemAuditRuns';
const VERSION='2026.10.02-internal-auditor-v3';
const PENDING_KEY='hlgb_records_pending_v91';
const WAL_KEY='hlgb_durable_wal_v1';
let auditRunsCache=[];
const runtimeErrors=[];
const MAX_RUNTIME_ERRORS=80;
function keepRuntimeError(type,message,stack=''){
  const row={at:new Date().toISOString(),type:String(type||'error'),message:String(message||'').slice(0,1200),stack:String(stack||'').slice(0,2500)};
  runtimeErrors.push(row);if(runtimeErrors.length>MAX_RUNTIME_ERRORS)runtimeErrors.splice(0,runtimeErrors.length-MAX_RUNTIME_ERRORS);
}
window.addEventListener('error',e=>{try{keepRuntimeError('error',e?.message||'Erro JavaScript',e?.error?.stack||'')}catch(_){ }},true);
window.addEventListener('unhandledrejection',e=>{try{keepRuntimeError('unhandledrejection',e?.reason?.message||String(e?.reason||'Promise rejeitada'),e?.reason?.stack||'')}catch(_){ }},true);
const REQUIRED_PAGES=['dashboard','pedidos','corte','producao','projecao','faltas','hubFinanceiro','config'];
const REQUIRED_FUNCTIONS=[
  'renderOrders','renderProjection','renderHubFinance','renderPayrollProvisions',
  'abateMissingPiece','toggleHubFinanceEntry','editOrder','hlgbRecordSaveWithRetry'
];
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const now=()=>new Date().toISOString();
const escSafe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
function redactDiagnostic(value,key=''){
  const k=String(key||'').toLowerCase();
  if(/^(access_token|refresh_token|token|password|senha|secret|service_role|apikey|api_key|authorization|jwt|session)$/.test(k))return '[REMOVIDO]';
  if(typeof value==='string'){
    let out=value;
    out=out.replace(/Bearer\s+[A-Za-z0-9._~-]+/gi,'Bearer [REMOVIDO]');
    out=out.replace(/eyJ[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{12,}/g,'[TOKEN REMOVIDO]');
    return out;
  }
  if(Array.isArray(value))return value.map(v=>redactDiagnostic(v,''));
  if(value&&typeof value==='object'){
    const o={};
    for(const [kk,v] of Object.entries(value)){
      if(String(kk).toLowerCase()==='email')continue;
      o[kk]=redactDiagnostic(v,kk);
    }
    return o;
  }
  return value;
}
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function userLabel(){
  try{const u=typeof currentUser==='function'?currentUser():null;return String(u?.name||u?.login||cloudUser?.email||'Usuário')}catch(e){return 'Usuário'}
}
function browserLabel(){
  const ua=String(navigator?.userAgent||'');
  if(/Safari/i.test(ua)&&!/Chrome|Chromium|CriOS/i.test(ua))return 'Safari';
  if(/Chrome|Chromium|CriOS/i.test(ua))return 'Chrome';
  if(/Firefox/i.test(ua))return 'Firefox';
  return ua.slice(0,120)||'Navegador não identificado';
}
function appVersion(){
  try{return String(window.HLGB_RELEASE_VERSION||document.querySelector('#appShell .logo small')?.textContent||'').replace(/^v/i,'')||'desconhecida'}catch(e){return 'desconhecida'}
}
function id(){return 'audit-'+Date.now()+'-'+Math.floor(Math.random()*900000+100000)}
function detachTechnicalModule(){
  try{
    if(typeof HLGB_RECORD_MODULES!=='undefined'&&Array.isArray(HLGB_RECORD_MODULES)){
      let i;while((i=HLGB_RECORD_MODULES.indexOf(AUDIT_MODULE))>=0)HLGB_RECORD_MODULES.splice(i,1);
    }
    if(typeof HLGB_RECORD_WRITE_AREA!=='undefined')delete HLGB_RECORD_WRITE_AREA[AUDIT_MODULE];
    if(typeof hlgbRecordSnapshots!=='undefined')delete hlgbRecordSnapshots[AUDIT_MODULE];
    if(typeof hlgbRecordLastSeen!=='undefined')delete hlgbRecordLastSeen[AUDIT_MODULE];
    if(typeof db!=='undefined'&&Object.prototype.hasOwnProperty.call(db,AUDIT_MODULE)){
      delete db[AUDIT_MODULE];
      try{localSaveOnly?.()}catch(e){}
    }
  }catch(e){console.warn('[HLGB Auditor] separação do módulo técnico',e)}
}
async function cleanupTechnicalPending(){
  try{
    const raw=localStorage.getItem(PENDING_KEY);
    if(raw){
      const p=JSON.parse(raw);
      if(p?.modules&&Object.prototype.hasOwnProperty.call(p.modules,AUDIT_MODULE)){
        delete p.modules[AUDIT_MODULE];
        if(Object.keys(p.modules).length)localStorage.setItem(PENDING_KEY,JSON.stringify(p));
        else localStorage.removeItem(PENDING_KEY);
      }
    }
  }catch(e){console.warn('[HLGB Auditor] limpeza da fila normalizada',e)}
  try{
    const raw=localStorage.getItem(WAL_KEY);
    if(raw){
      const w=JSON.parse(raw),entries=w?.entries||{};
      let changed=false;
      for(const [k,e] of Object.entries(entries)){
        if(e?.module===AUDIT_MODULE||String(k).startsWith(AUDIT_MODULE+'|')){delete entries[k];changed=true}
      }
      if(changed){w.entries=entries;localStorage.setItem(WAL_KEY,JSON.stringify(w))}
    }
  }catch(e){console.warn('[HLGB Auditor] limpeza do WAL técnico',e)}
  try{
    if(typeof indexedDB!=='undefined'){
      await new Promise(resolve=>{
        let req;
        try{req=indexedDB.open('hlgb_durable_wal')}catch(e){resolve();return}
        req.onupgradeneeded=()=>{try{req.transaction.abort()}catch(e){};resolve()};
        req.onerror=()=>resolve();
        req.onsuccess=()=>{
          const d=req.result;
          try{
            if(!d.objectStoreNames.contains('entries')){d.close();resolve();return}
            const tx=d.transaction('entries','readwrite'),store=tx.objectStore('entries'),cur=store.openCursor();
            cur.onsuccess=()=>{
              const c=cur.result;if(!c)return;
              const v=c.value;if(v?.module===AUDIT_MODULE||String(v?.key||c.key).startsWith(AUDIT_MODULE+'|'))c.delete();
              c.continue();
            };
            tx.oncomplete=()=>{d.close();resolve()};
            tx.onerror=()=>{d.close();resolve()};
            tx.onabort=()=>{d.close();resolve()};
          }catch(e){try{d.close()}catch(_){ }resolve()}
        };
      });
    }
  }catch(e){console.warn('[HLGB Auditor] limpeza IndexedDB técnica',e)}
}
function readJsonStorage(key){
  try{
    const raw=localStorage.getItem(key);
    if(!raw)return null;
    return JSON.parse(raw);
  }catch(e){return {__readError:String(e?.message||e)}}
}
function normalizedPendingDiagnostic(){
  const src=readJsonStorage(PENDING_KEY);
  if(!src)return {present:false,count:0,modules:{}};
  const modules={};let count=0;
  for(const [module,ops] of Object.entries(src?.modules||{})){
    if(module===AUDIT_MODULE)continue;
    const list=Array.isArray(ops)?ops:[];
    modules[module]=list.map(op=>redactDiagnostic(clone(op)));
    count+=list.length;
  }
  return {present:true,at:src?.at||null,count,modules};
}
function localWalDiagnostic(){
  const src=readJsonStorage(WAL_KEY);
  const entries=[];
  for(const [key,e] of Object.entries(src?.entries||{})){
    if(e?.module===AUDIT_MODULE||String(key).startsWith(AUDIT_MODULE+'|'))continue;
    entries.push(redactDiagnostic({...clone(e),__storageKey:key}));
  }
  return {present:!!src,count:entries.length,entries};
}
async function indexedDbWalDiagnostic(){
  if(typeof indexedDB==='undefined')return {available:false,count:0,entries:[]};
  return await new Promise(resolve=>{
    let req,settled=false;
    const done=v=>{if(settled)return;settled=true;resolve(v)};
    try{req=indexedDB.open('hlgb_durable_wal')}catch(e){done({available:false,count:0,entries:[],error:String(e?.message||e)});return}
    req.onupgradeneeded=()=>{try{req.transaction.abort()}catch(e){};done({available:true,count:0,entries:[],note:'Banco ainda não existente neste navegador.'})};
    req.onerror=()=>done({available:false,count:0,entries:[],error:String(req.error?.message||'Falha ao abrir IndexedDB')});
    req.onsuccess=()=>{
      const d=req.result;
      try{
        if(!d.objectStoreNames.contains('entries')){d.close();done({available:true,count:0,entries:[]});return}
        const tx=d.transaction('entries','readonly'),store=tx.objectStore('entries'),entries=[],cur=store.openCursor();
        cur.onsuccess=()=>{
          const c=cur.result;
          if(!c)return;
          const v=c.value||{};
          if(v?.module!==AUDIT_MODULE&&!String(v?.key||c.key).startsWith(AUDIT_MODULE+'|'))entries.push(redactDiagnostic({...clone(v),__storageKey:String(c.key)}));
          c.continue();
        };
        tx.oncomplete=()=>{d.close();done({available:true,count:entries.length,entries})};
        tx.onerror=()=>{const err=String(tx.error?.message||'Falha ao ler IndexedDB');d.close();done({available:true,count:entries.length,entries,error:err})};
        tx.onabort=()=>{d.close();done({available:true,count:entries.length,entries,error:'Leitura abortada'})};
      }catch(e){try{d.close()}catch(_){ }done({available:true,count:0,entries:[],error:String(e?.message||e)})}
    };
  });
}
async function buildSyncDiagnostic(){
  const normalized=normalizedPendingDiagnostic(),localWal=localWalDiagnostic(),indexedWal=await indexedDbWalDiagnostic();
  const modules={};
  const add=(source,list)=>{
    (list||[]).forEach(e=>{
      const m=String(e?.module||e?.__module||'desconhecido');
      const id=sid(e?.id??e?.entity_id??e?.entityId??e?.__hlgbId??'');
      if(!modules[m])modules[m]={normalized:0,walLocalStorage:0,walIndexedDb:0,ids:[]};
      modules[m][source]++;
      if(id&&!modules[m].ids.includes(id))modules[m].ids.push(id);
    });
  };
  for(const [m,ops] of Object.entries(normalized.modules||{})){
    if(!modules[m])modules[m]={normalized:0,walLocalStorage:0,walIndexedDb:0,ids:[]};
    modules[m].normalized+=(ops||[]).length;
    (ops||[]).forEach(e=>{const id=sid(e?.id??e?.entity_id??e?.entityId??'');if(id&&!modules[m].ids.includes(id))modules[m].ids.push(id)});
  }
  add('walLocalStorage',localWal.entries);
  add('walIndexedDb',indexedWal.entries);
  return redactDiagnostic({
    kind:'hlgb_sync_diagnostic',
    diagnosticVersion:'2026.09.30-sync-export-v1',
    generatedAt:now(),
    appVersion:appVersion(),
    browser:browserLabel(),
    activePage:document.querySelector('.page.active')?.id||'',
    readOnly:true,
    credentialsIncluded:false,
    summary:{
      normalizedPending:normalized.count,
      walLocalStorage:localWal.count,
      walIndexedDb:indexedWal.count
    },
    modules,
    normalizedPending:normalized,
    durableWalLocalStorage:localWal,
    durableWalIndexedDb:indexedWal
  });
}
async function downloadSyncDiagnostic(){
  const data=await buildSyncDiagnostic();
  const text=JSON.stringify(data,null,2);
  const blob=new Blob([text],{type:'application/json;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  a.download='HLGB-DIAGNOSTICO-SINCRONIZACAO-'+stamp+'.json';
  document.body.appendChild(a);a.click();
  setTimeout(()=>{try{URL.revokeObjectURL(a.href)}catch(e){};a.remove()},1000);
  return data;
}
function stripFactionDerived(v){
  const x=clone(v);if(x&&typeof x==='object'&&!Array.isArray(x))delete x.description;return x;
}
function stripOrderDerived(v){
  const x=clone(v);
  if(x?.projectionItems&&typeof x.projectionItems==='object'){
    for(const item of Object.values(x.projectionItems)){
      if(item&&typeof item==='object'&&!Array.isArray(item))delete item.noteQueuedQty;
    }
  }
  return x;
}
async function classifiedDerivedPending(){
  const pending=readJsonStorage(PENDING_KEY),out=[];
  if(!pending?.modules)return out;
  const localWal=localWalDiagnostic(),idbWal=await indexedDbWalDiagnostic(),walKeys=new Set();
  for(const e of [...(localWal.entries||[]),...(idbWal.entries||[])]){
    const m=String(e?.module||''),id=sid(e?.id??e?.entity_id??e?.entityId??'');
    if(m&&id)walKeys.add(m+'|'+id);
  }
  for(const [module,ops] of Object.entries(pending.modules)){
    for(const op of (Array.isArray(ops)?ops:[])){
      const id=sid(op?.id);if(!id||walKeys.has(module+'|'+id))continue;
      const snap=hlgbRecordSnapshots?.[module]?.get?.(id);
      if(!snap||snap.deleted_at||!snap.data||!op?.data)continue;
      if(stableJson(op.data)===stableJson(snap.data)){
        out.push({module,id,reason:'Já é idêntico ao snapshot da nuvem.'});continue;
      }
      if(module==='factions'&&stableJson(stripFactionDerived(op.data))===stableJson(stripFactionDerived(snap.data))){
        let canonical='';
        try{canonical=String(window.hlgbFactionCanonicalDescription?.(op.data)||'')}catch(e){}
        if(canonical&&String(op.data.description||'')===canonical){
          out.push({module,id,reason:'Somente descrição derivada do modelo difere do snapshot.'});
        }
        continue;
      }
      if(module==='orders'&&stableJson(stripOrderDerived(op.data))===stableJson(stripOrderDerived(snap.data))){
        out.push({module,id,reason:'Somente noteQueuedQty derivado difere do snapshot.'});
      }
    }
  }
  return out;
}
async function cleanClassifiedDerivedPending(){
  const classified=await classifiedDerivedPending();
  if(!classified.length)return {removed:0,items:[],remaining:normalizedPendingDiagnostic().count};
  const keys=new Set(classified.map(x=>x.module+'|'+x.id));
  const pending=readJsonStorage(PENDING_KEY);
  if(!pending?.modules)return {removed:0,items:[],remaining:0};
  let removed=0;
  for(const [module,ops] of Object.entries(pending.modules)){
    if(!Array.isArray(ops))continue;
    const keep=[];
    for(const op of ops){
      const id=sid(op?.id),key=module+'|'+id;
      if(!keys.has(key)){keep.push(op);continue}
      const snap=hlgbRecordSnapshots?.[module]?.get?.(id);
      if(!snap||snap.deleted_at||!snap.data){keep.push(op);continue}
      removed++;
      const list=Array.isArray(db?.[module])?db[module]:null;
      if(list){
        const ix=list.findIndex(x=>sid(x?.id??x?.__hlgbId)===id);
        if(ix>=0)list[ix]=clone(snap.data);
      }
    }
    if(keep.length)pending.modules[module]=keep;else delete pending.modules[module];
  }
  if(Object.keys(pending.modules).length)localStorage.setItem(PENDING_KEY,JSON.stringify(pending));
  else localStorage.removeItem(PENDING_KEY);
  try{localSaveOnly?.()}catch(e){}
  try{if(typeof update955==='function')update955()}catch(e){}
  return {removed,items:classified,remaining:normalizedPendingDiagnostic().count};
}

async function loadRuns(){
  detachTechnicalModule();
  await cleanupTechnicalPending();
  if(typeof cloudRequest!=='function'||!cloudAccessToken)return false;
  try{
    const rows=await cloudRequest('hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at,updated_by&module=eq.'+encodeURIComponent(AUDIT_MODULE)+'&order=updated_at.desc&limit=100',{method:'GET'});
    if(!Array.isArray(rows))return false;
    auditRunsCache=rows.filter(r=>!r.deleted_at).map(r=>clone(r.data)).filter(Boolean);
    return true;
  }catch(e){console.warn('[HLGB Auditor] carga',e);return false}
}
function stableJson(v){
  const walk=x=>{
    if(Array.isArray(x))return x.map(walk);
    if(x&&typeof x==='object'){
      const o={};Object.keys(x).sort().forEach(k=>o[k]=walk(x[k]));return o;
    }
    return x;
  };
  try{return JSON.stringify(walk(v))}catch(e){return JSON.stringify(v)}
}
async function exactAuditRow(id){
  if(typeof cloudRequest!=='function')return null;
  const rows=await cloudRequest('hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at,updated_by&module=eq.'+encodeURIComponent(AUDIT_MODULE)+'&entity_id=eq.'+encodeURIComponent(sid(id))+'&limit=1',{method:'GET'});
  return Array.isArray(rows)?(rows[0]||null):null;
}
function applySavedRun(out,row){
  const saved=clone(out?.data||row),i=auditRunsCache.findIndex(x=>sid(x?.id)===sid(saved.id));
  if(i>=0)auditRunsCache[i]=saved;else auditRunsCache.unshift(saved);
  auditRunsCache=auditRunsCache.slice(0,100);
  return saved;
}
async function saveRun(row){
  detachTechnicalModule();
  await cleanupTechnicalPending();
  if(typeof cloudRequest!=='function')throw new Error('A conexão com a nuvem não está disponível.');
  if(typeof cloudEnsureFreshSession==='function'){
    const ok=await cloudEnsureFreshSession(false);
    if(ok===false)throw new Error('Sessão da nuvem indisponível.');
  }
  let out=await cloudRequest('rpc/hlgb_save_record',{
    method:'POST',
    headers:{Prefer:'return=representation'},
    body:JSON.stringify({
      p_module:AUDIT_MODULE,
      p_entity_id:sid(row.id),
      p_data:clone(row),
      p_expected_revision:0,
      p_deleted:false
    })
  });
  if(Array.isArray(out))out=out[0];
  if(out?.applied===false){
    const remote=out?.data?out:await exactAuditRow(row.id);
    if(remote&&!remote.deleted_at&&stableJson(remote.data)===stableJson(row)){
      out={...remote,applied:true,hlgbAuditIdempotent:true};
    }else throw new Error('Conflito ao salvar o histórico técnico da auditoria.');
  }
  if(!out?.applied)throw new Error('O Supabase não confirmou a auditoria.');
  return applySavedRun(out,row);
}
function check(code,category,status,title,detail='',severity='info',meta={}){
  return {code,category,status,title,detail,severity,...meta};
}
function statusFor(ok,warn=false){return ok?'pass':warn?'warn':'fail'}
function functionExists(name){
  try{return typeof window?.[name]==='function'||typeof globalThis?.[name]==='function'}catch(e){return false}
}
function auditFunctions(){
  return REQUIRED_FUNCTIONS.map(name=>{
    const ok=functionExists(name);
    return check('fn:'+name,'Funções essenciais',statusFor(ok),ok?'Função disponível: '+name:'Função ausente: '+name,ok?'':'A interface pode abrir, mas a ação correspondente pode falhar.','error',{functionName:name});
  });
}
function auditModules(){
  const checks=[];
  checks.push(check('module:diagnostics','Módulos',statusFor(!!window.hlgbDiagnosticsCenter),'Central de Erros e Melhorias',window.hlgbDiagnosticsCenter?'Carregada':'Não carregada','error'));
  return checks;
}
function auditDomStructure(){
  const checks=[];
  const shell=document.getElementById('appShell'),nav=document.getElementById('nav');
  checks.push(check('dom:shell','Estrutura',statusFor(!!shell),'Estrutura principal do sistema',shell?'Encontrada':'#appShell não encontrado','error'));
  checks.push(check('dom:nav','Estrutura',statusFor(!!nav),'Menu principal',nav?'Encontrado':'#nav não encontrado','error'));
  REQUIRED_PAGES.forEach(pid=>{
    const el=document.getElementById(pid);
    checks.push(check('page:'+pid,'Telas',statusFor(!!el),pid,el?'Tela presente no DOM':'Tela ausente no DOM','error',{page:pid}));
  });
  const ids=[...document.querySelectorAll('[id]')].map(x=>x.id).filter(Boolean),counts={};
  ids.forEach(x=>counts[x]=(counts[x]||0)+1);
  const dup=Object.entries(counts).filter(([,n])=>n>1).map(([x,n])=>x+' ('+n+'x)');
  checks.push(check('dom:duplicate-ids','Estrutura',dup.length?'warn':'pass','IDs duplicados no DOM',dup.length?dup.slice(0,20).join(', '):'Nenhum ID duplicado encontrado.',dup.length?'warn':'info'));
  return checks;
}
function isVisible(el){
  try{
    if(!el)return false;
    const st=window.getComputedStyle?getComputedStyle(el):null;
    if(st&&(st.display==='none'||st.visibility==='hidden'||Number(st.opacity)===0))return false;
    const r=el.getBoundingClientRect?.();
    return !!r&&r.width>0&&r.height>0;
  }catch(e){return false}
}
function auditVisualCurrent(){
  const checks=[],active=document.querySelector('.page.active'),vw=Number(window.innerWidth||document.documentElement?.clientWidth||0),vh=Number(window.innerHeight||document.documentElement?.clientHeight||0);
  checks.push(check('visual:active-page','Visual',statusFor(!!active),'Tela ativa',active?'#'+active.id:'Nenhuma .page.active encontrada','error',{page:active?.id||''}));
  if(!active)return checks;
  const docW=Number(document.documentElement?.scrollWidth||0);
  const overflow=vw>0&&docW>vw+12;
  checks.push(check('visual:horizontal-overflow','Visual',overflow?'warn':'pass','Rolagem horizontal geral',overflow?'Documento '+docW+'px para viewport '+vw+'px.':'Sem overflow horizontal geral detectado.',overflow?'warn':'info',{page:active.id}));
  const panels=[...active.querySelectorAll('.panel')].filter(isVisible);
  const clipped=[];
  panels.forEach((el,i)=>{
    try{
      const r=el.getBoundingClientRect();
      if(vw&&r.right>vw+16)clipped.push('painel '+(i+1)+' ultrapassa '+Math.round(r.right-vw)+'px à direita');
      if(r.left<-16)clipped.push('painel '+(i+1)+' ultrapassa '+Math.round(Math.abs(r.left))+'px à esquerda');
    }catch(e){}
  });
  checks.push(check('visual:clipped-panels','Visual',clipped.length?'warn':'pass','Painéis fora da largura visível',clipped.length?clipped.slice(0,10).join('; '):'Nenhum painel visível ultrapassando a viewport.',clipped.length?'warn':'info',{page:active.id}));
  const visibleControls=[...active.querySelectorAll('button,input,select,textarea')].filter(isVisible);
  const tiny=visibleControls.filter(el=>{
    try{const r=el.getBoundingClientRect();return r.width<22||r.height<20}catch(e){return false}
  });
  checks.push(check('visual:tiny-controls','Visual',tiny.length?'warn':'pass','Controles muito pequenos',tiny.length?tiny.slice(0,10).map(x=>x.id||x.textContent?.trim()?.slice(0,30)||x.tagName).join(', '):'Nenhum controle visível abaixo do limite mínimo estrutural.',tiny.length?'warn':'info',{page:active.id}));
  const modal=[...document.querySelectorAll('.modal,.modalbox')].find(isVisible);
  if(modal){
    const r=modal.getBoundingClientRect?.(),bad=r&&vw&&vh&&(r.right>vw+12||r.bottom>vh+12||r.left<-12||r.top<-12);
    checks.push(check('visual:modal-fit','Visual',bad?'warn':'pass','Modal dentro da tela',bad?'Modal ultrapassa a área visível.':'Modal atual cabe na viewport.',bad?'warn':'info',{page:active.id}));
  }
  return checks;
}

function visualTargetPages(){
  return [...document.querySelectorAll('#appShell .page')].filter(el=>el?.id&&el.id!=='loginScreen').map(el=>el.id);
}
function visualMetricsForPage(el){
  const vw=Number(window.innerWidth||document.documentElement?.clientWidth||0),vh=Number(window.innerHeight||document.documentElement?.clientHeight||0);
  const rect=el.getBoundingClientRect();
  const controls=[...el.querySelectorAll('button,input,select,textarea,a')].filter(isVisible);
  const panels=[...el.querySelectorAll('.panel,.card,table,[role="dialog"]')].filter(isVisible);
  const clipped=[];
  for(const node of [...controls,...panels]){
    try{
      const r=node.getBoundingClientRect();
      if(r.right>vw+16||r.left<-16)clipped.push(node.id||node.textContent?.trim()?.slice(0,40)||node.tagName);
    }catch(_){}
  }
  const anchors=[...el.querySelectorAll('h1,h2,.panel,.card,table,button,input,select,textarea')].filter(isVisible).slice(0,45).map((node,i)=>{
    const r=node.getBoundingClientRect();return {k:node.id||node.getAttribute('name')||node.textContent?.trim()?.slice(0,32)||node.tagName+'#'+i,x:Math.round(r.x*10)/10,y:Math.round(r.y*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10};
  });
  return {
    width:Math.round(rect.width),height:Math.round(rect.height),
    scrollWidth:Math.round(el.scrollWidth||0),scrollHeight:Math.round(el.scrollHeight||0),
    viewport:{width:vw,height:vh},controls:controls.length,panels:panels.length,
    clipped:[...new Set(clipped)].slice(0,20),anchors
  };
}
function compareAnchorShift(a,b){
  const bm=new Map((b?.anchors||[]).map(x=>[x.k,x])),moved=[];
  for(const x of (a?.anchors||[])){
    const y=bm.get(x.k);if(!y)continue;
    const dx=Math.abs(x.x-y.x),dy=Math.abs(x.y-y.y),dw=Math.abs(x.w-y.w),dh=Math.abs(x.h-y.h);
    if(dx>2||dy>2||dw>2||dh>2)moved.push({element:x.k,dx:+dx.toFixed(1),dy:+dy.toFixed(1),dw:+dw.toFixed(1),dh:+dh.toFixed(1)});
  }
  return moved;
}
async function auditVisualSweep(){
  const prior=document.querySelector('#appShell .page.active'),priorId=prior?.id||'',priorScroll={x:window.scrollX||0,y:window.scrollY||0},priorFocus=document.activeElement;
  const pages=visualTargetPages(),results=[],started=Date.now();
  let observer=null,currentMutations=0;
  try{
    observer=new MutationObserver(list=>{currentMutations+=list.filter(m=>m.type==='childList'||m.type==='attributes').length});
    observer.observe(document.getElementById('appShell')||document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']});
    for(const pid of pages){
      const el=document.getElementById(pid);if(!el)continue;
      document.querySelectorAll('#appShell .page').forEach(x=>x.classList.remove('active'));el.classList.add('active');
      window.scrollTo(0,0);currentMutations=0;
      await new Promise(r=>setTimeout(r,180));
      const s1=visualMetricsForPage(el),m1=currentMutations;currentMutations=0;
      await new Promise(r=>setTimeout(r,260));
      const s2=visualMetricsForPage(el),m2=currentMutations;currentMutations=0;
      await new Promise(r=>setTimeout(r,260));
      const s3=visualMetricsForPage(el),m3=currentMutations;
      const shift=[...compareAnchorShift(s1,s2),...compareAnchorShift(s2,s3)];
      const maxShift=shift.reduce((m,x)=>Math.max(m,x.dx,x.dy,x.dw,x.dh),0);
      const overflow=s3.viewport.width>0&&s3.scrollWidth>s3.viewport.width+16;
      const unstable=maxShift>3||m2+m3>18;
      results.push({
        page:pid,status:unstable?'warn':(overflow||s3.clipped.length?'warn':'pass'),
        maxShiftPx:+maxShift.toFixed(1),layoutShiftElements:shift.slice(0,15),
        mutationsAfterSettle:m2+m3,initialMutations:m1,
        horizontalOverflow:overflow,clipped:s3.clipped,
        metrics:{width:s3.width,height:s3.height,scrollWidth:s3.scrollWidth,scrollHeight:s3.scrollHeight,controls:s3.controls,panels:s3.panels}
      });
    }
  }finally{
    try{observer?.disconnect()}catch(_){}
    document.querySelectorAll('#appShell .page').forEach(x=>x.classList.remove('active'));
    if(priorId&&document.getElementById(priorId))document.getElementById(priorId).classList.add('active');
    try{window.scrollTo(priorScroll.x,priorScroll.y)}catch(_){}
    try{if(priorFocus&&document.contains(priorFocus)&&typeof priorFocus.focus==='function')priorFocus.focus({preventScroll:true})}catch(_){}
  }
  const checks=results.map(r=>check('visual-sweep:'+r.page,'Varredura visual',r.status,r.page,
    (r.maxShiftPx>3?'Movimento detectado: '+r.maxShiftPx+'px. ':'')+
    (r.mutationsAfterSettle>18?'Muitas mutações após estabilizar: '+r.mutationsAfterSettle+'. ':'')+
    (r.horizontalOverflow?'Overflow horizontal. ':'')+
    (r.clipped.length?'Elementos fora da largura: '+r.clipped.slice(0,5).join(', ')+'. ':'')+
    ((!r.maxShiftPx&&!r.horizontalOverflow&&!r.clipped.length)?'Tela estável no teste interno.':''),
    r.status==='warn'?'warn':'info',{page:r.page,visualSweep:r}));
  return {pages:results,checks,durationMs:Date.now()-started,runtimeErrors:clone(runtimeErrors.slice(-30))};
}
async function runVisualSweep(save=true){
  const startedAt=now(),sweep=await auditVisualSweep();
  const baseChecks=[...auditFunctions(),...auditModules(),...auditDomStructure(),...auditSync(),...auditDataIntegrity(),...auditRuntimeErrors(),...sweep.checks];
  const recentRuntime=sweep.runtimeErrors||[];
  if(recentRuntime.length){
    baseChecks.push(check('runtime:captured','Erros JavaScript','warn','Erros JavaScript capturados nesta sessão',recentRuntime.slice(-10).map(x=>x.type+': '+x.message).join(' | '),'warn',{runtimeErrors:recentRuntime}));
  }else baseChecks.push(check('runtime:captured','Erros JavaScript','pass','Erros JavaScript capturados nesta sessão','Nenhum erro global capturado pelo Auditor.','info'));
  const row={id:id(),kind:'system_audit_visual_sweep',auditorVersion:VERSION,mode:'visual-sweep',readOnly:true,startedAt,completedAt:now(),appVersion:appVersion(),browser:browserLabel(),user:userLabel(),viewport:{width:Number(window.innerWidth||0),height:Number(window.innerHeight||0),devicePixelRatio:Number(window.devicePixelRatio||1)},activePage:document.querySelector('.page.active')?.id||'',summary:summarize(baseChecks),checks:baseChecks,visualSweep:sweep.pages,visualSweepDurationMs:sweep.durationMs,runtimeErrors:recentRuntime};
  if(save){try{return await saveRun(row)}catch(e){row.saveError=String(e?.message||e);return row}}
  return row;
}
async function downloadVisualDiagnostic(){
  const row=await runVisualSweep(true),sync=await buildSyncDiagnostic();
  const data=redactDiagnostic({kind:'hlgb_full_visual_diagnostic',diagnosticVersion:'2026.10.02-visual-v1',generatedAt:now(),appVersion:appVersion(),browser:browserLabel(),readOnly:true,credentialsIncluded:false,audit:row,sync});
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='HLGB-DIAGNOSTICO-VISUAL-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{try{URL.revokeObjectURL(a.href)}catch(_){ }a.remove()},1000);
  return data;
}

function auditSync(){
  const checks=[];
  const authenticated=!!(typeof cloudAccessToken!=='undefined'&&cloudAccessToken);
  checks.push(check('sync:authenticated','Sincronização',statusFor(authenticated),'Sessão autenticada',authenticated?'Sessão presente.':'Sem sessão autenticada detectada.','error'));
  const ready=!!(typeof hlgbRecordReady!=='undefined'&&hlgbRecordReady);
  checks.push(check('sync:records-ready','Sincronização',statusFor(ready,!ready&&authenticated),'Registros normalizados prontos',ready?'Prontos para sincronização.':'hlgbRecordReady não está ativo.',ready?'info':'warn'));
  const pending=(()=>{
    try{
      const p=typeof hlgbRecordPendingRead==='function'?hlgbRecordPendingRead():null;
      if(!p?.modules)return 0;
      return Object.entries(p.modules).reduce((n,[m,a])=>n+(m===AUDIT_MODULE?0:(Array.isArray(a)?a.length:0)),0);
    }catch(e){return 0}
  })();
  checks.push(check('sync:pending','Sincronização',pending?'warn':'pass','Pendências locais de sincronização',pending?pending+' registro(s) aguardando sincronização.':'Nenhuma pendência local detectada.',pending?'warn':'info'));
  return checks;
}
function auditDataIntegrity(){
  const checks=[];
  try{
    const findings=window.hlgbDiagnosticsCenter?.scanSystem?.()||[];
    if(!findings.length)checks.push(check('data:scan','Integridade dos dados','pass','Varredura de integridade','Nenhuma inconsistência das regras atuais foi encontrada.','info'));
    else findings.forEach((f,i)=>checks.push(check('data:'+String(f.code||i),'Integridade dos dados',f.severity==='Crítica'||f.severity==='Alta'?'fail':'warn',f.title||'Inconsistência',f.description||'',f.severity==='Crítica'||f.severity==='Alta'?'error':'warn',{refs:f.refs||[]})));
  }catch(e){
    checks.push(check('data:scan-error','Integridade dos dados','fail','Falha ao executar varredura',String(e?.message||e),'error'));
  }
  const ended=arr('employees').filter(e=>e?.active===false&&e?.terminationDate);
  checks.push(check('data:terminated-employees','RH','pass','Funcionários desligados identificados',ended.length+' registro(s) com active=false e data de desligamento.','info'));
  return checks;
}
function auditRuntimeErrors(){
  const open=arr('systemIssues').filter(x=>x?.status!=='Resolvido'),high=open.filter(x=>['Crítica','Alta'].includes(x?.priority));
  return [
    check('issues:open','Erros registrados',high.length?'warn':'pass','Erros abertos na Central',open.length+' aberto(s); '+high.length+' de alta prioridade.',high.length?'warn':'info'),
  ];
}
function summarize(checks){
  const fail=checks.filter(x=>x.status==='fail').length,warn=checks.filter(x=>x.status==='warn').length,pass=checks.filter(x=>x.status==='pass').length;
  return {total:checks.length,pass,warn,fail,result:fail?'Falhou':warn?'Atenção':'Aprovado'};
}
function buildRun(mode='full'){
  const startedAt=now(),checks=[];
  checks.push(...auditFunctions(),...auditModules(),...auditDomStructure(),...auditSync(),...auditDataIntegrity(),...auditRuntimeErrors());
  if(mode==='full'||mode==='visual')checks.push(...auditVisualCurrent());
  const summary=summarize(checks);
  return {
    id:id(),kind:'system_audit',auditorVersion:VERSION,mode,readOnly:true,
    startedAt,completedAt:now(),appVersion:appVersion(),browser:browserLabel(),user:userLabel(),
    viewport:{width:Number(window.innerWidth||0),height:Number(window.innerHeight||0),devicePixelRatio:Number(window.devicePixelRatio||1)},
    activePage:document.querySelector('.page.active')?.id||'',
    summary,checks
  };
}
async function run(mode='full',save=true){
  const row=buildRun(mode);
  if(save){
    try{return await saveRun(row)}
    catch(e){
      row.saveError=String(e?.message||e);
      console.error('[HLGB Auditor] auditoria executada, mas não salva',e);
      return row;
    }
  }
  return row;
}
function latest(){
  return auditRunsCache.slice().sort((a,b)=>String(b?.completedAt||b?.startedAt||'').localeCompare(String(a?.completedAt||a?.startedAt||'')))[0]||null;
}
function resultBadge(run){
  const r=run?.summary?.result||'-',cls=r==='Aprovado'?'ok':r==='Atenção'?'warn':'bad';
  return '<span class="badge '+cls+'">'+escSafe(r)+'</span>';
}
function renderRun(run){
  if(!run)return '<div class="empty">Nenhuma auditoria salva ainda.</div>';
  const s=run.summary||{};
  const bad=(run.checks||[]).filter(x=>x.status!=='pass');
  return '<div class="cards"><div class="card"><small>Resultado</small><strong>'+resultBadge(run)+'</strong></div><div class="card"><small>Passou</small><strong>'+q(s.pass)+'</strong></div><div class="card"><small>Atenções</small><strong>'+q(s.warn)+'</strong></div><div class="card"><small>Falhas</small><strong>'+q(s.fail)+'</strong></div></div>'+
    '<div class="sub" style="margin:10px 0">Executada em '+escSafe(String(run.completedAt||'').replace('T',' ').slice(0,19))+' · '+escSafe(run.browser||'-')+' · tela '+escSafe(run.activePage||'-')+' · somente leitura.</div>'+
    (bad.length?'<div class="panel"><h3 style="margin-top:0">Pontos encontrados</h3>'+bad.map(x=>'<div style="padding:8px 0;border-bottom:1px solid #eee"><b>'+escSafe(x.status==='fail'?'🔴':'🟡')+' '+escSafe(x.title)+'</b><div class="sub">'+escSafe(x.category)+' · '+escSafe(x.detail||'-')+'</div></div>').join('')+'</div>':'<div class="panel"><b>✅ Nenhuma falha ou atenção nas verificações atuais.</b></div>');
}
function report(run){
  if(!run)return 'Nenhuma auditoria disponível.';
  const s=run.summary||{};
  let out='HLGB CONFECÇÕES — AUDITORIA INTERNA\n';
  out+='ID: '+run.id+'\n';
  out+='Executada em: '+run.completedAt+'\n';
  out+='Versão: '+run.appVersion+'\n';
  out+='Navegador: '+run.browser+'\n';
  out+='Tela ativa: '+run.activePage+'\n';
  out+='Modo: somente leitura\n';
  out+='Resultado: '+s.result+' | passou '+q(s.pass)+' | atenção '+q(s.warn)+' | falhas '+q(s.fail)+'\n\n';
  (run.checks||[]).forEach(x=>{
    out+=(x.status==='pass'?'OK':x.status==='warn'?'ATENÇÃO':'FALHA')+' — '+x.category+' — '+x.title+'\n';
    if(x.detail)out+='  '+x.detail+'\n';
  });
  return out;
}
function inject(){
  if(document.getElementById('hlgbAuditorStyle')==null){
    const st=document.createElement('style');st.id='hlgbAuditorStyle';
    st.textContent='.hlgb-auditor-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.hlgb-auditor-history{max-height:260px;overflow:auto}.hlgb-auditor-history button{width:100%;text-align:left;margin:4px 0}';
    document.head.appendChild(st);
  }
  const center=document.getElementById('hlgbDiagnosticsCenter');
  if(center&&!document.getElementById('hlgbAuditorOpenBtn')){
    const tabs=center.querySelector('.hlgb-dg-tabs');
    const b=document.createElement('button');b.id='hlgbAuditorOpenBtn';b.type='button';b.className='secondary';b.textContent='🧪 Auditor interno';b.onclick=()=>openAuditor();
    tabs?.appendChild(b);
  }
  const nav=document.getElementById('nav');
  if(nav&&!document.getElementById('hlgbAuditorNavBtn')){
    const diag=document.getElementById('hlgbDiagnosticsNav');
    if(diag?.parentElement){
      const b=document.createElement('button');b.id='hlgbAuditorNavBtn';b.type='button';b.innerHTML='🧪 Auditor / Testes';b.onclick=()=>openAuditor();diag.insertAdjacentElement('afterend',b);
    }
  }
}
function historyHtml(){
  const runs=auditRunsCache.slice().sort((a,b)=>String(b?.completedAt||'').localeCompare(String(a?.completedAt||''))).slice(0,12);
  return runs.length?runs.map(x=>'<button type="button" class="secondary" onclick="hlgbAuditorShowRun(\''+escSafe(x.id)+'\')">'+resultBadge(x)+' '+escSafe(String(x.completedAt||'').replace('T',' ').slice(0,16))+' · '+escSafe(x.browser||'-')+' · '+escSafe(x.activePage||'-')+'</button>').join(''):'<div class="empty">Nenhuma auditoria salva.</div>';
}
function openAuditor(){
  inject();
  const last=latest();
  openModal('🧪 Auditor / Testador HLGB','<div class="sub">Executa conferência interna <b>somente de leitura</b>. Não cria pedidos, não dá baixa e não altera produção ou financeiro.</div><div class="hlgb-auditor-actions"><button type="button" class="primary" onclick="hlgbAuditorRunVisualSweep()">👁️ Teste visual completo</button><button type="button" class="secondary" onclick="hlgbAuditorRunFull()">🧪 Testar sistema</button><button type="button" class="secondary" onclick="hlgbAuditorRunVisual()">Tela atual</button><button type="button" class="secondary" onclick="hlgbAuditorExportVisual()">📦 Exportar diagnóstico visual</button><button type="button" class="secondary" onclick="hlgbAuditorCopyLatest()">📋 Copiar última auditoria</button><button type="button" class="secondary" onclick="hlgbAuditorExportSync()">Sincronização</button><button type="button" class="secondary" onclick="hlgbAuditorCleanDerivedSync()">🧹 Limpar falsos positivos confirmados</button></div><div id="hlgbAuditorResult">'+renderRun(last)+'</div><div class="panel"><h3 style="margin-top:0">Histórico</h3><div id="hlgbAuditorHistory" class="hlgb-auditor-history">'+historyHtml()+'</div></div><button type="button" class="secondary modalSave">Fechar</button>',()=>closeModal());
  loadRuns().then(()=>{const h=document.getElementById('hlgbAuditorHistory');if(h)h.innerHTML=historyHtml();const r=document.getElementById('hlgbAuditorResult');if(r)r.innerHTML=renderRun(latest())}).catch(()=>{});
}
window.openHlgbAuditor=openAuditor;
async function runUi(mode){
  const out=document.getElementById('hlgbAuditorResult');
  if(out)out.innerHTML='<div class="panel"><b>🧪 Executando auditoria interna…</b><div class="sub">Nenhum dado operacional será alterado.</div></div>';
  const row=await run(mode,true);
  if(out)out.innerHTML=renderRun(row)+(row.saveError?'<div class="panel"><span class="badge warn">Executou, mas não conseguiu salvar na nuvem</span><div class="sub">'+escSafe(row.saveError)+'</div></div>':'');
  const h=document.getElementById('hlgbAuditorHistory');if(h)h.innerHTML=historyHtml();
  try{auditAction?.('Executou Auditor HLGB',row.summary?.result+' · '+mode)}catch(e){}
  return row;
}
window.hlgbAuditorRunFull=()=>runUi('full');
window.hlgbAuditorRunVisual=()=>runUi('visual');
window.hlgbAuditorRunVisualSweep=async function(){const out=document.getElementById('hlgbAuditorResult');if(out)out.innerHTML='<div class="panel"><b>👁️ Testando todas as telas…</b><div class="sub">A tela pode alternar rapidamente durante o teste. Nenhum dado será alterado.</div></div>';const row=await runVisualSweep(true);if(out)out.innerHTML=renderRun(row)+(row.saveError?'<div class="panel"><span class="badge warn">Executou, mas não conseguiu salvar na nuvem</span><div class="sub">'+escSafe(row.saveError)+'</div></div>':'');const h=document.getElementById('hlgbAuditorHistory');if(h)h.innerHTML=historyHtml();return row;};
window.hlgbAuditorExportVisual=async function(){try{const data=await downloadVisualDiagnostic();alert('Diagnóstico visual exportado.\n\nTelas verificadas: '+q(data?.audit?.visualSweep?.length)+'\nAtenções: '+q(data?.audit?.summary?.warn)+'\nFalhas: '+q(data?.audit?.summary?.fail)+'\n\nO arquivo não inclui senhas nem tokens.');}catch(e){alert('Não foi possível exportar o diagnóstico visual.\n\n'+String(e?.message||e))}};
window.hlgbAuditorShowRun=function(runId){
  const row=auditRunsCache.find(x=>sid(x?.id)===sid(runId)),out=document.getElementById('hlgbAuditorResult');
  if(out)out.innerHTML=renderRun(row);
};
window.hlgbAuditorCopyLatest=async function(){
  const text=report(latest());
  try{await navigator.clipboard.writeText(text);alert('Última auditoria copiada.')}catch(e){alert(text)}
};
window.hlgbAuditorExportSync=async function(){
  try{
    const data=await downloadSyncDiagnostic();
    alert('Diagnóstico exportado.\n\nPendências normalizadas: '+q(data?.summary?.normalizedPending)+'\nWAL local: '+q(data?.summary?.walLocalStorage)+'\nIndexedDB: '+q(data?.summary?.walIndexedDb)+'\n\nO arquivo não inclui senhas nem tokens.');
  }catch(e){
    alert('Não foi possível exportar o diagnóstico de sincronização.\n\n'+String(e?.message||e));
  }
};
window.hlgbAuditorCleanDerivedSync=async function(){
  try{
    const items=await classifiedDerivedPending();
    if(!items.length)return alert('Nenhum falso positivo classificado com segurança foi encontrado.');
    const byModule=items.reduce((a,x)=>(a[x.module]=(a[x.module]||0)+1,a),{});
    const resumo=Object.entries(byModule).map(([m,n])=>m+': '+n).join('\n');
    if(!confirm('Foram identificadas '+items.length+' pendência(s) automáticas que diferem da nuvem somente em campos derivados.\n\n'+resumo+'\n\nNenhum WAL será apagado e nenhum dado da nuvem será alterado. Deseja limpar somente essas pendências locais?'))return;
    const out=await cleanClassifiedDerivedPending();
    alert('Limpeza concluída.\n\nRemovidas: '+out.removed+'\nPendências normalizadas restantes: '+out.remaining+'\n\nNenhum dado da nuvem foi alterado.');
    try{if(typeof window.hlgbAuditorRunFull==='function')await window.hlgbAuditorRunFull()}catch(e){}
  }catch(e){
    alert('Não foi possível concluir a limpeza segura.\n\n'+String(e?.message||e));
  }
};
window.hlgbInternalAuditor={VERSION,module:AUDIT_MODULE,buildRun,run,runVisualSweep,auditVisualSweep,downloadVisualDiagnostic,latest,report,auditFunctions,auditModules,auditDomStructure,auditVisualCurrent,auditSync,auditDataIntegrity,loadRuns,saveRun,stableJson,cleanupTechnicalPending,redactDiagnostic,normalizedPendingDiagnostic,localWalDiagnostic,indexedDbWalDiagnostic,buildSyncDiagnostic,downloadSyncDiagnostic,classifiedDerivedPending,cleanClassifiedDerivedPending,runtimeErrors};
function boot(){
  detachTechnicalModule();cleanupTechnicalPending();inject();
  try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(()=>{inject();loadRuns()},500)},0)}catch(e){}
  if(document.getElementById('appShell')?.style.display==='block')setTimeout(()=>loadRuns(),500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
console.info('[HLGB] Auditor/Testador interno '+VERSION+' carregado');
})();