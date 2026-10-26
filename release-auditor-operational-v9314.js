/* HLGB v94.16 — auditor operacional consolidado com paridade multiusuário e autoridades atuais */
(function(){
'use strict';
const V='94.16';
if(window.hlgbOperationalAuditor9314?.version===V)return;
const sid=v=>String(v??''),now=()=>new Date().toISOString();
let maintainTimer=null,lastAudit=null;
function read(k,f=null){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(e){return f}}
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}return window.db||null}
function arr(n){const d=dbRef();return Array.isArray(d?.[n])?d[n]:[]}
function recordId(row){return sid(row?.id??row?.__hlgbId??row?.entity_id??row?.entityId??'')}
function versionAtLeast(v,min){const a=sid(v).replace(/^v/i,'').split('.').map(x=>Number(x)||0),b=sid(min).replace(/^v/i,'').split('.').map(x=>Number(x)||0),n=Math.max(a.length,b.length);for(let i=0;i<n;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false}return true}
function snapshotMap(module){try{const root=typeof hlgbRecordSnapshots!=='undefined'?hlgbRecordSnapshots:window.hlgbRecordSnapshots;const m=root?.[module];return m&&typeof m.forEach==='function'&&typeof m.get==='function'?m:null}catch(e){return null}}
function pendingCounts(){
 const p=read('hlgb_records_pending_v91',null),w=read('hlgb_durable_wal_v1',null),keys=new Set(),normalizedKeys=new Set(),walKeys=new Set();
 let records=0,wal=0;
 for(const [module,ops] of Object.entries(p?.modules||{}))for(const op of (Array.isArray(ops)?ops:[])){records++;const key=sid(module)+'|'+sid(op?.id);if(key!=='|'){normalizedKeys.add(key);keys.add(key)}}
 for(const e of Object.values(w?.entries||{})){if(!e)continue;wal++;const key=sid(e?.module)+'|'+sid(e?.id);if(key!=='|'){walKeys.add(key);keys.add(key)}}
 let duplicatedAcrossQueues=0;for(const key of normalizedKeys)if(walKeys.has(key))duplicatedAcrossQueues++;
 return {records,wal,totalCopies:records+wal,unique:keys.size,duplicatedAcrossQueues};
}
function pendingIds(module){const out=new Set(),p=read('hlgb_records_pending_v91',null),w=read('hlgb_durable_wal_v1',null);for(const op of (p?.modules?.[module]||[])){const id=sid(op?.id);if(id)out.add(id)}for(const e of Object.values(w?.entries||{})){if(sid(e?.module)!==module)continue;const id=sid(e?.id);if(id)out.add(id)}return out}
function orderParity(){
 const snap=snapshotMap('orders'),local=arr('orders'),pending=pendingIds('orders'),localMap=new Map();
 for(const row of local){const id=recordId(row);if(id)localMap.set(id,row)}
 if(!snap)return {available:false,localActive:localMap.size,cloudActive:null,missingLocal:[],extraLocal:[],extraUnconfirmed:[],pending:[...pending]};
 const cloudMap=new Map();
 snap.forEach((s,key)=>{if(!s||s.deleted_at)return;const data=s.data||{},id=sid(key||data.id||data.__hlgbId);if(id)cloudMap.set(id,data)});
 const missingLocal=[];for(const [id,data] of cloudMap)if(!localMap.has(id))missingLocal.push({id,orderNumber:data?.orderNumber??data?.number??'',client:data?.client||data?.clientName||'',updatedAt:data?.updatedAt||''});
 const extraLocal=[];for(const [id,data] of localMap)if(!cloudMap.has(id))extraLocal.push({id,orderNumber:data?.orderNumber??data?.number??'',client:data?.client||data?.clientName||'',pending:pending.has(id)});
 return {available:true,localActive:localMap.size,cloudActive:cloudMap.size,missingLocal,extraLocal,extraUnconfirmed:extraLocal.filter(x=>!x.pending),pending:[...pending]};
}
function visible(el){try{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}catch(e){return false}}
function savingControls(){const out=[];for(const el of document.querySelectorAll('button,[role="button"],.badge,#cloudStatus')){const t=sid(el.textContent).replace(/\s+/g,' ').trim();if(visible(el)&&/(salvando|aguardando confirma|confirmando|sincronizando)/i.test(t))out.push({id:el.id||'',text:t.slice(0,140),disabled:!!el.disabled})}return out.slice(0,20)}
function wrapperDepth(fn){let n=0,f=fn,seen=new Set();while(typeof f==='function'&&n<20&&!seen.has(f)){seen.add(f);n++;f=f.__hlgb9313Original||f.__hlgb9312Original||f.__hlgb9320Original||f.__original||f.__hlgbRecordIntegrityOriginal||null}return n}
function check(code,status,title,detail,meta={}){return {code,category:'Operacional',status,title,detail,severity:status==='fail'?'error':status==='warn'?'warn':'info',...meta}}
function openSessionIssues(){try{return arr('systemIssues').filter(x=>String(x?.status||'').toLowerCase()!=='resolvido'&&['runtime','save','sync'].includes(String(x?.sourceType||'').toLowerCase()))}catch(e){return []}}
function summarize(checks){const fail=checks.filter(x=>x.status==='fail').length,warn=checks.filter(x=>x.status==='warn').length,pass=checks.filter(x=>x.status==='pass').length;return {pass,warn,fail,result:fail?'Falhou':warn?'Atenção':'Aprovado'}}
function run(extraChecks=[]){
 const checks=[],p=pendingCounts(),save=window.hlgbSaveIntegrity9312?.status?.()||{},sync=window.hlgbSyncRecovery9301?.status?.()||{},saving=savingControls(),parity=orderParity();
 const online=typeof navigator==='undefined'||navigator.onLine!==false;
 const recordReady=sync.recordReady===true;
 const sessionReady=!!window.cloudAccessToken||(recordReady&&sync.realtime==='SUBSCRIBED');
 const busy=!!save.confirmBusy||!!save.recoveryBusy||!!sync.busy;
 checks.push(check('operational:online',online?'pass':'fail','Conexão do navegador',online?'Online':'Navegador está offline.'));
 checks.push(check('operational:session',sessionReady?'pass':'fail','Sessão da nuvem',sessionReady?'Sessão/camada autenticada confirmada pelo runtime.':'Não há evidência de sessão ativa no runtime.',{tokenPresent:!!window.cloudAccessToken,realtime:sync.realtime||'',recordReady}));
 checks.push(check('operational:record-layer',recordReady?'pass':busy?'warn':'fail','Camada multiusuário',recordReady?'hlgbRecordReady confirmado pelo sincronizador.':busy?'A camada ainda está inicializando/sincronizando.':'hlgbRecordReady não está ativo; outra conta pode enxergar uma fotografia antiga dos dados.',{syncRecordReady:recordReady,saveFunction:typeof window.hlgbRecordSaveWithRetry==='function',busy}));
 const realtimeReadyMismatch=sync.realtime==='SUBSCRIBED'&&!recordReady;
 checks.push(check('operational:realtime-ready-consistency',realtimeReadyMismatch?'fail':'pass','Realtime × registros normalizados',realtimeReadyMismatch?'Realtime informa SUBSCRIBED, mas hlgbRecordReady=false. Conexão aparente não garante que os dados atuais foram carregados.':'Estado do Realtime é compatível com a prontidão dos registros.',{realtime:sync.realtime||'',recordReady}));
 const syncVersion=sid(window.hlgbSyncRecovery9301?.version||sync.version||''),catchupOk=versionAtLeast(syncVersion,'93.48')&&typeof window.hlgbSyncRecovery9301?.ordersPageCatchup==='function';
 checks.push(check('operational:multiuser-catchup',catchupOk?'pass':'fail','Recuperação multiusuário de Pedidos',catchupOk?'Autoridade '+syncVersion+' com confirmação ao abrir Pedidos está ativa.':'A recuperação v93.48+ com ordersPageCatchup não foi confirmada.',{syncVersion,ordersPageCatchup:typeof window.hlgbSyncRecovery9301?.ordersPageCatchup==='function',authority:window.HLGB_SYNC_AUTHORITY||''}));
 const verifyAt=Number(sync?.ioPolicy?.lastCloudVerify||0),verifyAge=verifyAt?Date.now()-verifyAt:null,verifyLimit=5*60*1000,verifyStatus=!sessionReady?'warn':!verifyAt?(busy?'warn':'fail'):verifyAge>15*60*1000?'fail':verifyAge>verifyLimit?'warn':'pass';
 checks.push(check('operational:cloud-verify-age',verifyStatus,'Última confirmação da nuvem',!verifyAt?'Ainda não há confirmação de leitura da nuvem nesta sessão.':'Última confirmação há '+Math.round(verifyAge/1000)+'s'+(verifyAge>verifyLimit?'; acima do esperado para o modo multiusuário.':'.'),{lastCloudVerify:verifyAt?new Date(verifyAt).toISOString():'',ageMs:verifyAge,realtime:sync.realtime||''}));
 if(!parity.available){checks.push(check('operational:orders-parity','warn','Pedidos local × snapshot da nuvem','Snapshot de orders ainda não está disponível para comparação; o Auditor não pode afirmar que esta tela está atualizada.',{parity}))}
 else if(parity.missingLocal.length){checks.push(check('operational:orders-parity','fail','Pedidos presentes na nuvem e ausentes neste navegador',parity.missingLocal.length+' pedido(s) existem no snapshot da nuvem, mas não estão na memória local: '+parity.missingLocal.slice(0,8).map(x=>'#'+(x.orderNumber||'?')+' ['+x.id+'] '+(x.client||'')).join(' | '),{parity}))}
 else checks.push(check('operational:orders-parity','pass','Pedidos local × snapshot da nuvem','Nenhum pedido ativo do snapshot da nuvem está faltando na memória local. Local: '+parity.localActive+' · nuvem: '+parity.cloudActive+'.',{parity}));
 if(parity.available&&parity.extraUnconfirmed.length)checks.push(check('operational:orders-extra-local','warn','Pedidos locais sem confirmação no snapshot',parity.extraUnconfirmed.length+' pedido(s) aparecem localmente sem snapshot ativo e sem fila pendente: '+parity.extraUnconfirmed.slice(0,8).map(x=>'#'+(x.orderNumber||'?')+' ['+x.id+']').join(' | '),{parity}));
 else checks.push(check('operational:orders-extra-local','pass','Pedidos locais sem confirmação no snapshot',parity.available?'Nenhum pedido local sem confirmação fora das filas.':'Não avaliado até o snapshot ficar disponível.',{parityAvailable:parity.available}));
 const pendingStatus=p.unique===0?'pass':busy?'warn':p.unique<=2?'warn':'fail';
 checks.push(check('operational:pending',pendingStatus,'Pendências de sincronização',p.unique===0?'Nenhuma pendência.':`${p.unique} operação(ões) única(s) pendente(s). Cópias nas filas: ${p.totalCopies} (${p.records} normalizada + ${p.wal} WAL); ${p.duplicatedAcrossQueues} registro(s) aparece(m) nas duas filas${busy?'; envio/recuperação em andamento.':'.'}`,{pending:p,busy}));
 checks.push(check('operational:delivery',p.unique===0?'pass':busy?'warn':'fail','Envio das pendências',p.unique===0?'Nada para enviar.':busy?'Há confirmação/sincronização em andamento.':'Há pendências, mas nenhuma confirmação aparece ativa.',{saveStatus:save,syncStatus:sync,pending:p}));
 const savingStatus=saving.length===0?'pass':busy?'warn':'fail';
 checks.push(check('operational:saving-ui',savingStatus,'Estado de salvamento visível',saving.length?(busy?`${saving.length} controle(s) em estado intermediário enquanto a sincronização está ativa.`:`${saving.length} controle(s) visível(is) em Salvando/Aguardando confirmação sem envio ativo: `+saving.map(x=>x.text).join(' | ')):'Nenhum controle preso em estado intermediário.',{savingControls:saving,busy}));
 const sep=window.applySeparationProgress938,canonical=!!sep?.__hlgbCanonicalSeparation&&sid(sep?.__hlgbCanonicalVersion)==='93.27',legacyGuard=!!sep?.__hlgb9313||save.separationGuard===true,sepReady=canonical||legacyGuard;
 checks.push(check('operational:separation-guard',sepReady?'pass':'fail','Proteção da Separação de Pedidos',canonical?'Separação canônica v93.27 com confirmação por registro ativa.':legacyGuard?'Proteção legada de confirmação/timeout ativa.':'A proteção de confirmação da Separação não foi encontrada.',{canonical,functionGuard:!!sep?.__hlgb9313,statusGuard:save.separationGuard===true,canonicalMode:sep?.__hlgb9312Mode||'',canonicalVersion:sep?.__hlgbCanonicalVersion||''}));
 const persistDepth=wrapperDepth(window.persistDb),sepDepth=wrapperDepth(sep),hubDepth=wrapperDepth(window.renderHubFinance);
 checks.push(check('operational:wrapper-depth',Math.max(persistDepth,sepDepth,hubDepth)<=6?'pass':'warn','Camadas de wrappers',`persistDb=${persistDepth}, separação=${sepDepth}, Hub=${hubDepth}.`,{persistDepth,sepDepth,hubDepth}));
 const transport=window.hlgbSaveTransport9320?.status?.()||{};
 checks.push(check('operational:cloud-transport',transport.installed===true?'pass':'warn','Transporte da nuvem',transport.installed===true?'Transporte com timeout está ativo.':'A proteção do transporte de nuvem não foi confirmada neste runtime.',{transport}));
 const noteVersion=sid(window.HLGB_NOTE_DOCUMENT_AUTHORITY||window.hlgbNoteDocument9412?.version||''),noteFns=typeof window.hlgbDownloadNotePdf9411==='function'&&typeof window.hlgbPrintNote9411==='function',noteOk=noteFns&&versionAtLeast(noteVersion,'94.15');
 checks.push(check('operational:note-document',noteOk?'pass':'warn','Documento/PDF das notas',noteOk?'Autoridade '+noteVersion+' com PDF e impressão ativa.':'Não foi possível confirmar a autoridade v94.15+ de documento/PDF das notas.',{noteVersion,downloadPdf:typeof window.hlgbDownloadNotePdf9411==='function',print:typeof window.hlgbPrintNote9411==='function'}));
 const currentIssues=openSessionIssues();
 checks.push(check('operational:runtime-errors',currentIssues.length?'warn':'pass','Ocorrências operacionais abertas',currentIssues.length?`${currentIssues.length} ocorrência(s) aberta(s) de runtime/save/sync na Central; revisar data e versão antes de atribuir ao estado atual.`:'Nenhuma ocorrência operacional aberta encontrada na Central.',{count:currentIssues.length}));
 checks.push(...extraChecks);
 const summary=summarize(checks),out={kind:'hlgb_operational_audit',version:V,at:now(),appVersion:sid(window.HLGB_RELEASE_VERSION||''),summary,checks,saveStatus:save,syncStatus:sync,pending:p,ordersParity:parity};
 lastAudit=out;window.__HLGB_LAST_OPERATIONAL_AUDIT=out;return out;
}
function esc(v){return sid(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function html(r){const bad=r.checks.filter(x=>x.status!=='pass');return '<div class="panel" data-hlgb-operational-audit="'+V+'" style="margin-top:10px"><h3 style="margin-top:0">🩺 Saúde operacional</h3><div class="sub">Confere multiusuário, salvamento, fila, confirmação, autoridades e travamentos — sem alterar dados.</div><div class="cards" style="margin-top:8px"><div class="card"><small>Passou</small><strong>'+r.summary.pass+'</strong></div><div class="card"><small>Atenções</small><strong>'+r.summary.warn+'</strong></div><div class="card"><small>Falhas</small><strong>'+r.summary.fail+'</strong></div></div>'+(bad.length?bad.map(x=>'<div style="padding:7px 0;border-bottom:1px solid #eee"><b>'+(x.status==='fail'?'🔴':'🟡')+' '+esc(x.title)+'</b><div class="sub">'+esc(x.detail)+'</div></div>').join(''):'<div style="margin-top:8px"><b>✅ Fluxo operacional e multiusuário sem divergência detectada agora.</b></div>')+'</div>'}
function consolidatedHtml(out,r){const baseFail=+out?.summary?.fail||0,baseWarn=+out?.summary?.warn||0,totalFail=baseFail+r.summary.fail,totalWarn=baseWarn+r.summary.warn,result=totalFail?'Falhou':totalWarn?'Atenção':'Aprovado';return '<div class="panel" data-hlgb-audit-consolidated="'+V+'" style="margin-top:10px"><h3 style="margin-top:0">Resultado consolidado: '+(result==='Falhou'?'🔴 Falhou':result==='Atenção'?'🟡 Atenção':'✅ Aprovado')+'</h3><div class="sub">Resultado geral + verificações operacionais/multiusuário. Falhas operacionais não são mascaradas por testes apenas estruturais.</div></div>'}
function mergeSummary(out,r){if(!out||typeof out!=='object')return out;out.operational=r;const base=out.summary&&typeof out.summary==='object'?out.summary:(out.summary={});base.operationalFail=r.summary.fail;base.operationalWarn=r.summary.warn;base.operationalPass=r.summary.pass;if(r.summary.fail>0)base.result='Falhou';else if(r.summary.warn>0&&base.result==='Aprovado')base.result='Atenção';return out}
function replaceResult(out,r){const box=document.getElementById('hlgbAuditorResult');if(!box)return r;box.querySelectorAll?.('[data-hlgb-operational-audit],[data-hlgb-audit-consolidated]').forEach(x=>x.remove());box.insertAdjacentHTML('afterbegin',consolidatedHtml(out,r));box.insertAdjacentHTML('beforeend',html(r));return r}
function visualCheck(out,name){if(!/VisualSweep/i.test(name))return [];const pages=Array.isArray(out?.visualSweep)?out.visualSweep:[];if(pages.length){out.visualValidation={status:'tested',pagesChecked:pages.length};return []}out.visualValidation={status:'not_tested',pagesChecked:0};return [check('operational:visual-sweep-not-run','warn','Varredura visual não executada','Nenhuma página foi testada nesta varredura visual; pagesChecked=0 é NÃO TESTADO, não aprovação.',{pagesChecked:0,tested:false})]}
function wrap(name){const f=window[name];if(typeof f!=='function'||f.__hlgbOperational9314)return false;const w=async function(){const out=await f.apply(this,arguments);try{const op=run(visualCheck(out,name));mergeSummary(out,op);replaceResult(out,op)}catch(e){console.warn('[HLGB '+V+'] auditor operacional',e)}return out};w.__hlgbOperational9314=true;w.__original=f;window[name]=w;return true}
function stopMaintenance(){if(maintainTimer){clearInterval(maintainTimer);maintainTimer=null}}
function install(){const a=wrap('hlgbAuditorRunFull'),b=wrap('hlgbAuditorRunVisualSweep');if(window.HLGB_AUDITOR_SMART_9360)stopMaintenance();return a||b||true}
function boot(){install();setTimeout(install,800);maintainTimer=setInterval(install,2500);window.hlgbOperationalAuditor9314={version:V,run,install,pending:pendingCounts,savingControls,orderParity,last:()=>lastAudit,stopMaintenance};console.info('[HLGB] v'+V+' auditor operacional multiusuário ativo')}
if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>setTimeout(boot,500),0);else setTimeout(boot,1200);
})();
