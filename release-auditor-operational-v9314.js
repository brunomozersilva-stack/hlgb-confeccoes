/* HLGB v93.14 — auditor operacional: persistência, fila e travamentos reais */
(function(){
'use strict';
const V='93.14';
if(window.hlgbOperationalAuditor9314?.version===V)return;
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const now=()=>new Date().toISOString();
function read(k,f=null){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(e){return f}}
function pendingCounts(){
 const p=read('hlgb_records_pending_v91',null),w=read('hlgb_durable_wal_v1',null);
 const records=Object.values(p?.modules||{}).reduce((n,x)=>n+(Array.isArray(x)?x.length:0),0);
 const wal=w?.entries&&typeof w.entries==='object'?Object.keys(w.entries).length:0;
 return {records,wal,total:records+wal};
}
function visible(el){try{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}catch(e){return false}}
function savingControls(){
 const out=[];
 for(const el of document.querySelectorAll('button,[role="button"],.badge,#cloudStatus')){
  const t=sid(el.textContent).replace(/\s+/g,' ').trim();
  if(visible(el)&&/(salvando|aguardando confirma|confirmando|sincronizando)/i.test(t))out.push({id:el.id||'',text:t.slice(0,140),disabled:!!el.disabled});
 }
 return out.slice(0,20);
}
function wrapperDepth(fn){
 let n=0,f=fn,seen=new Set();
 while(typeof f==='function'&&n<20&&!seen.has(f)){
  seen.add(f);n++;
  f=f.__hlgb9313Original||f.__hlgb9312Original||f.__original||f.__hlgbRecordIntegrityOriginal||null;
 }
 return n;
}
function check(code,status,title,detail,meta={}){return {code,category:'Operacional',status,title,detail,severity:status==='fail'?'error':status==='warn'?'warn':'info',...meta}}
function run(){
 const checks=[],p=pendingCounts(),save=window.hlgbSaveIntegrity9312?.status?.()||{},sync=window.hlgbSyncRecovery9301?.status?.()||{},saving=savingControls();
 const online=typeof navigator==='undefined'||navigator.onLine!==false;
 const token=!!window.cloudAccessToken;
 const ready=!!window.hlgbRecordReady;
 checks.push(check('operational:online',online?'pass':'fail','Conexão do navegador',online?'Online':'Navegador está offline.'));
 checks.push(check('operational:session',token?'pass':'fail','Sessão da nuvem',token?'Token de sessão presente.':'Sem sessão/token da nuvem.'));
 checks.push(check('operational:record-layer',ready?'pass':'fail','Camada multiusuário',ready?'Pronta':'Ainda não ficou pronta para gravação por registro.'));
 checks.push(check('operational:pending',p.total===0?'pass':p.total<=2?'warn':'fail','Pendências de sincronização',p.total===0?'Nenhuma pendência.':`${p.total} pendência(s): ${p.records} por registro + ${p.wal} WAL.`,{pending:p}));
 const busy=!!save.confirmBusy||!!sync.busy;
 checks.push(check('operational:delivery',p.total===0?'pass':busy?'warn':'fail','Envio das pendências',p.total===0?'Nada para enviar.':busy?'Há confirmação/sincronização em andamento.':'Há pendências, mas nenhuma confirmação aparece ativa.',{saveStatus:save,syncStatus:sync}));
 checks.push(check('operational:saving-ui',saving.length===0?'pass':'fail','Controles presos em estado de salvamento',saving.length?`${saving.length} controle(s) visível(is) em Salvando/Aguardando confirmação: `+saving.map(x=>x.text).join(' | '):'Nenhum controle preso em estado intermediário.',{savingControls:saving}));
 const sep=window.applySeparationProgress938;
 checks.push(check('operational:separation-guard',sep?.__hlgb9313?'pass':'fail','Proteção da Separação de Pedidos',sep?.__hlgb9313?'v93.13 ativa.':'A proteção v93.13 não está instalada.'));
 const persistDepth=wrapperDepth(window.persistDb),sepDepth=wrapperDepth(sep),hubDepth=wrapperDepth(window.renderHubFinance);
 checks.push(check('operational:wrapper-depth',Math.max(persistDepth,sepDepth,hubDepth)<=6?'pass':'warn','Camadas de wrappers',`persistDb=${persistDepth}, separação=${sepDepth}, Hub=${hubDepth}.`,{persistDepth,sepDepth,hubDepth}));
 const errors=(window.hlgbDiagnosticsCenter?.errors||[]).length||0;
 checks.push(check('operational:runtime-errors',errors===0?'pass':'warn','Erros registrados nesta sessão',errors?`${errors} erro(s) no centro de diagnóstico.`:'Nenhum erro registrado pelo centro nesta sessão.'));
 const fail=checks.filter(x=>x.status==='fail').length,warn=checks.filter(x=>x.status==='warn').length,pass=checks.filter(x=>x.status==='pass').length;
 return {kind:'hlgb_operational_audit',version:V,at:now(),appVersion:sid(window.HLGB_RELEASE_VERSION||''),summary:{pass,warn,fail,result:fail?'Falhou':warn?'Atenção':'Aprovado'},checks,saveStatus:save,syncStatus:sync,pending:p};
}
function html(r){
 const bad=r.checks.filter(x=>x.status!=='pass');
 return '<div class="panel" style="margin-top:10px"><h3 style="margin-top:0">🩺 Saúde operacional</h3><div class="sub">Confere salvamento, fila, confirmação, sessão e travamentos — sem alterar dados.</div><div class="cards" style="margin-top:8px"><div class="card"><small>Passou</small><strong>'+r.summary.pass+'</strong></div><div class="card"><small>Atenções</small><strong>'+r.summary.warn+'</strong></div><div class="card"><small>Falhas</small><strong>'+r.summary.fail+'</strong></div></div>'+(bad.length?bad.map(x=>'<div style="padding:7px 0;border-bottom:1px solid #eee"><b>'+(x.status==='fail'?'🔴':'🟡')+' '+x.title+'</b><div class="sub">'+x.detail+'</div></div>').join(''):'<div style="margin-top:8px"><b>✅ Fluxo operacional sem sinal de travamento agora.</b></div>')+'</div>';
}
function appendResult(r){const box=document.getElementById('hlgbAuditorResult');if(box)box.insertAdjacentHTML('beforeend',html(r));return r}
function wrap(name){
 const f=window[name];if(typeof f!=='function'||f.__hlgbOperational9314)return false;
 const w=async function(){const out=await f.apply(this,arguments);try{appendResult(run())}catch(e){console.warn('[HLGB '+V+'] auditor operacional',e)}return out};
 w.__hlgbOperational9314=true;w.__original=f;window[name]=w;return true;
}
function install(){wrap('hlgbAuditorRunFull');wrap('hlgbAuditorRunVisualSweep');return true}
function boot(){install();setTimeout(install,800);setInterval(install,2500);window.hlgbOperationalAuditor9314={version:V,run,install,pending:pendingCounts,savingControls};console.info('[HLGB] v'+V+' auditor operacional ativo')}
if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>setTimeout(boot,500),0);else setTimeout(boot,1200);
})();
