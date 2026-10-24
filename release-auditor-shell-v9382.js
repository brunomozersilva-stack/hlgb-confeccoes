/* HLGB Auditor v93.82 — interface oficial única do Auditor. Somente leitura. */
(function(){
'use strict';
if(window.HLGB_AUDITOR_SHELL_9382)return;
const V='93.82';
const KEEP=new Set(['hlgbMultiuserOpen','hlgbMultiuserCapture','hlgbMultiuserDownload','hlgbSmartTest','hlgbSmartProblem','hlgbSmartHistoryBtn','hlgbAuthorityBtn9374','hlgbBootAnalysisBtn9381','hlgbBootDownload9381','hlgbAuthorityDownload9374','hlgbSafariDownload9368','hlgbAuditorIntelligenceBtn9396','hlgbAuditorIntelligenceDownload9396','hlgbAuditorBusinessBtn9401','hlgbAuditorBusinessDownload9401']);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let installed=false;
const LEGACY_HIDE=['#hlgbAuditorMaxDebug9292','#hlgbAuditorBlackbox9299','#hlgbAuditFull9315','#hlgbAuditCritical9315','#hlgbAuditDownloadFull9315','#hlgbAuditDownloadCritical9315','#hlgbAuditorHubDeep9315'];
const LEGACY_ACTION_FILTER='.hlgb-auditor-actions:has(#hlgbSmartTest) button:not(#hlgbMultiuserOpen):not(#hlgbSmartTest):not(#hlgbSmartProblem):not(#hlgbSmartHistoryBtn):not(#hlgbAuthorityBtn9374):not(#hlgbBootAnalysisBtn9381):not(#hlgbAuditorIntelligenceBtn9396):not(#hlgbAuditorBusinessBtn9401)';
function retireLegacyActionFilter(){const st=document.getElementById('hlgbAuditorLegacyHide9368');if(!st)return false;const css=LEGACY_HIDE.concat([LEGACY_ACTION_FILTER]).join(',')+'{display:none!important}';if(st.textContent!==css)st.textContent=css;return true}
function retireLegacyEntryCapture(){const h=window.__hlgbAuditorEntryCapture9368;if(typeof h!=='function')return false;try{document.removeEventListener('click',h,true)}catch(e){}try{delete window.__hlgbAuditorEntryCapture9368}catch(e){window.__hlgbAuditorEntryCapture9368=null}return true}
function bindIntelligence(){const b=document.getElementById('hlgbAuditorIntelligenceBtn9396');if(!b)return false;b.removeAttribute?.('onclick');b.onclick=()=>window.hlgbAuditorIntelligence9396?.run?.().catch?.(e=>console.warn('[HLGB Auditor 93.96] inteligência',e));b.hidden=false;b.removeAttribute?.('data-hlgb-auditor-hidden');b.style.setProperty?.('display','inline-block','important');b.style.setProperty?.('visibility','visible','important');return true}
function bindBusiness(){const b=document.getElementById('hlgbAuditorBusinessBtn9401');if(!b)return false;b.removeAttribute?.('onclick');b.onclick=()=>window.hlgbAuditorBusiness9401?.runAndRender?.().catch?.(e=>console.warn('[HLGB Auditor 94.01] expansão',e));b.hidden=false;b.removeAttribute?.('data-hlgb-auditor-hidden');b.style.setProperty?.('display','inline-block','important');b.style.setProperty?.('visibility','visible','important');return true}
function ensureStyle(){
 retireLegacyActionFilter();
 let st=document.getElementById('hlgbAuditorShellStyle9382');
 if(!st){st=document.createElement('style');st.id='hlgbAuditorShellStyle9382';(document.head||document.documentElement).appendChild(st)}
 st.textContent=['#hlgbMultiuserOpen','#hlgbMultiuserCapture','#hlgbMultiuserDownload','#hlgbSmartTest','#hlgbSmartProblem','#hlgbSmartHistoryBtn','#hlgbAuthorityBtn9374','#hlgbBootAnalysisBtn9381','#hlgbBootDownload9381','#hlgbAuthorityDownload9374','#hlgbSafariDownload9368','#hlgbAuditorIntelligenceBtn9396','#hlgbAuditorIntelligenceDownload9396','#hlgbAuditorBusinessBtn9401','#hlgbAuditorBusinessDownload9401'].map(x=>x+'{display:inline-block!important;visibility:visible!important}').join('');
}
function smartStatus(){
 try{
  const rows=window.hlgbAuditorSmart?.hist?.()||[];
  const h=rows.find(x=>x?.type==='audit');
  if(!h)return '<b>Status:</b> ainda sem teste nesta versão.';
  const fail=Number(h.fail||0),warn=Number(h.warn||0),label=fail?'Falha':warn?'Atenção':'Tudo certo';
  return '<b>Status do sistema: '+esc(label)+'</b><div class="sub">Último teste: '+esc(String(h.at||'').replace('T',' ').slice(0,16))+' · '+Number(h.pass||0)+' aprovados · '+warn+' atenções · '+fail+' falhas</div>';
 }catch(e){return '<b>Status:</b> diagnóstico disponível após executar o teste.'}
}

/* Comparação sob demanda: sem timers, requisições ou wrappers de salvamento. */
const MU_MODULES=['orders','cuts','production','hubFinanceEntries'];
const MU_KIND='hlgb_multiuser_snapshot', MU_SCHEMA=1;
let muReport=null,muUrl=null,muBusy=false,muGeneration=0;
function stable(value){if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';return JSON.stringify(value)}
async function digest(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(stable(value)));return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('')}
function muState(){
 const user=typeof currentUser==='function'?currentUser():null;
 return {user,db:typeof db!=='undefined'?db:null,snapshots:typeof hlgbRecordSnapshots!=='undefined'?hlgbRecordSnapshots:null,ready:typeof hlgbRecordReady!=='undefined'&&hlgbRecordReady===true};
}
async function captureMultiuser(){
 const state=muState(),id=state.user?.auth_id||state.user?.authId||state.user?.id;
 if(!window.__HLGB_AUTH_READY||!id||!state.ready)throw new Error('Entre com seu usuário e aguarde a sincronização ficar pronta.');
 const startedAt=new Date().toISOString(),raw={};
 // Copia todos os módulos antes de qualquer await: uma única fotografia local.
 for(const module of MU_MODULES){
  const map=state.snapshots?.[module],local=state.db?.[module];
  if(!map||typeof map.entries!=='function'||!Array.isArray(local)){raw[module]=null;continue}
  raw[module]=JSON.parse(JSON.stringify({snapshots:[...map.entries()],local}));
 }
 const profile=await digest(['profile',String(id)]),modules={};
 for(const module of MU_MODULES){
  if(!raw[module]){modules[module]={available:false,records:[]};continue}
  const local=new Map(),duplicates=[];
  for(const item of raw[module].local){const key=String(item.id??item.__hlgbId??'');if(!key)continue;if(local.has(key))duplicates.push(key);local.set(key,item)}
  const records=[];
  for(const [key,row] of raw[module].snapshots){
   const value=local.get(String(key));local.delete(String(key));
   records.push({key:await digest([module,String(key)]),revision:Number(row.revision)||0,deleted:!!row.deleted_at,remote:await digest(row.data),local:value?await digest(value):null});
  }
  for(const [key,value] of local)records.push({key:await digest([module,key]),revision:0,deleted:false,remote:null,local:await digest(value)});
  records.sort((a,b)=>a.key.localeCompare(b.key));
  modules[module]={available:true,duplicates:duplicates.length,records};
 }
 let queues=null;
 const auditor=window.hlgbInternalAuditor;
 if(auditor?.buildSyncDiagnostic){const sync=await auditor.buildSyncDiagnostic();if(sync?.durableWalIndexedDb?.available===true&&!sync.durableWalIndexedDb.error&&sync.summary)queues={...sync.summary}}
 if(String(muState().user?.auth_id||muState().user?.authId||muState().user?.id)!==String(id))throw new Error('O usuário mudou durante a coleta. Gere novamente.');
 return {kind:MU_KIND,schema:MU_SCHEMA,startedAt,completedAt:new Date().toISOString(),profile,appVersion:String(window.HLGB_RELEASE_VERSION||'desconhecida'),readOnly:true,queues,modules,limitations:['Fotografia local; não comprova entrega em tempo real, persistência após novo login, conflitos ou permissões no servidor.','Identificadores e conteúdo são resumidos por SHA-256; não inclui nomes, valores, senhas ou tokens.']};
}
function validateMultiuser(r){
 const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
 if(r?.kind!==MU_KIND||r.schema!==MU_SCHEMA||!hex(r.profile)||typeof r.appVersion!=='string'||r.appVersion.length>100||!r.modules)throw new Error('Arquivo não é um relatório multiusuário compatível.');
 const t=Date.parse(r.startedAt),end=Date.parse(r.completedAt),now=Date.now();
 if(!Number.isFinite(t)||!Number.isFinite(end)||end<t||end-t>60000||t>now+60000||now-t>15*60*1000)throw new Error('Relatório fora da janela de 15 minutos ou com horário inválido. Gere novamente.');
 for(const m of MU_MODULES){const v=r.modules[m];if(!v||typeof v.available!=='boolean'||!Array.isArray(v.records)||v.records.length>50000)throw new Error('Módulo inválido no relatório.');const seen=new Set();for(const x of v.records){if(!hex(x.key)||seen.has(x.key)||!Number.isInteger(x.revision)||x.revision<0||typeof x.deleted!=='boolean'||!(x.remote===null||hex(x.remote))||!(x.local===null||hex(x.local)))throw new Error('Registro inválido no relatório.');seen.add(x.key)}}
 return r;
}
function compareMultiuser(a,b){
 validateMultiuser(a);validateMultiuser(b);
 if(a.profile===b.profile)throw new Error('Os dois relatórios são do mesmo usuário. Importe o relatório do outro usuário.');
 if(Math.abs(Date.parse(a.startedAt)-Date.parse(b.startedAt))>120000)throw new Error('Colete os dois relatórios com no máximo 2 minutos de diferença.');
 const checks=[];
 checks.push({title:'Versão informada',status:a.appVersion==='desconhecida'||b.appVersion==='desconhecida'?'not_measured':a.appVersion===b.appVersion?'pass':'warn',detail:a.appVersion===b.appVersion?'Versões informadas iguais; isso não comprova que todos os scripts são idênticos.':'Versões diferentes: '+a.appVersion+' / '+b.appVersion});
 const q=[a.queues,b.queues],fields=['normalizedPending','walLocalStorage','walIndexedDb'];
 const measured=q.every(x=>x&&fields.every(k=>Number.isInteger(x[k])&&x[k]>=0));
 checks.push({title:'Filas na coleta',status:!measured?'not_measured':q.some(x=>fields.some(k=>x[k]>0))?'warn':'pass',detail:!measured?'Não foi possível medir todas as filas.':'Filas locais registradas; fila vazia sozinha não comprova sincronização.'});
 for(const m of MU_MODULES){const x=a.modules[m],y=b.modules[m];if(!x.available||!y.available){checks.push({title:m,status:'not_measured',detail:'Módulo não disponível nos dois perfis.'});continue}
  const right=new Map(y.records.map(r=>[r.key,r]));let shared=0,different=0,missing=0,localDiff=0;
  for(const r of x.records){const other=right.get(r.key);if(!other){missing++;continue}right.delete(r.key);shared++;if(r.remote!==other.remote||r.revision!==other.revision||r.deleted!==other.deleted)different++;if(r.local!==other.local)localDiff++}
  missing+=right.size;
  checks.push({title:m,status:!shared?'not_measured':different||missing||localDiff||x.duplicates||y.duplicates?'warn':'pass',detail:shared+' registros em comum; '+different+' divergências de revisão/conteúdo recebido; '+localDiff+' divergências locais; '+missing+' exclusivos. Diferenças podem decorrer do horário ou das permissões.',shared,different,localDiff,missing});
 }
 for(const title of ['Entrega automática nos dois sentidos','Persistência após novo login','Edição simultânea do mesmo registro','Permissões no servidor'])checks.push({title,status:'not_measured',detail:'Exige teste operacional com duas sessões autenticadas; esta comparação não executa gravações.'});
 return {kind:'hlgb_multiuser_comparison',status:'partial',checks};
}
function muMessage(text){const e=document.getElementById('hlgbMultiuserStatus');if(e)e.textContent=text}
async function muCapture(){if(muBusy)return;muBusy=true;const generation=muGeneration;muReport=null;const oldLink=document.getElementById('hlgbMultiuserDownload');oldLink?.removeAttribute('href');oldLink?.style.setProperty('display','none','important');muMessage('Coletando…');try{const report=await captureMultiuser();if(generation!==muGeneration)return;validateMultiuser(report);muReport=report;if(muUrl)URL.revokeObjectURL(muUrl);muUrl=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const link=document.getElementById('hlgbMultiuserDownload');if(link){link.href=muUrl;link.download='hlgb-multiusuario-'+Date.now()+'.json';link.hidden=false}muMessage('Relatório pronto. Baixe aqui e importe o arquivo do outro usuário para comparar.');}catch(e){if(generation===muGeneration)muMessage(e.message)}finally{muBusy=false}}
async function muImport(event){const generation=muGeneration;const previous=document.getElementById('hlgbMultiuserComparison');if(previous)previous.textContent='';try{const file=event.target.files?.[0];if(!file)return;if(file.size>20*1024*1024)throw new Error('Arquivo maior que 20 MB.');if(!muReport)throw new Error('Gere o relatório deste usuário primeiro.');const text=await file.text();if(generation!==muGeneration)return;const result=compareMultiuser(muReport,JSON.parse(text));const out=document.getElementById('hlgbMultiuserComparison');if(out)out.innerHTML='<b>Validação parcial — não aprova o funcionamento multiusuário completo.</b>'+result.checks.map(c=>'<p><b>'+esc(c.status==='pass'?'Conferido':c.status==='warn'?'Atenção':'Não medido')+' · '+esc(c.title)+'</b><br>'+esc(c.detail)+'</p>').join('');muMessage('Comparação concluída.');}catch(e){muMessage(e.message)}finally{event.target.value=''}}
function openMultiuser(){
 muGeneration++;muReport=null;if(muUrl){URL.revokeObjectURL(muUrl);muUrl=null}
 const out=document.getElementById('hlgbAuditorResult');if(!out)return;
 out.innerHTML='<div class="panel"><h3>Validação multiusuário</h3><p>Gere um relatório em cada usuário, com até 2 minutos de diferença e sem editar dados entre as coletas. Baixe o arquivo de um usuário e importe no outro. A comparação usa somente os dados já carregados.</p><button type="button" id="hlgbMultiuserCapture">Gerar relatório deste usuário</button> <a id="hlgbMultiuserDownload" role="button">Baixar relatório</a><p><label>Importar relatório do outro usuário <input id="hlgbMultiuserImport" type="file" accept=".json,application/json"></label></p><p id="hlgbMultiuserStatus" role="status" aria-live="polite">Aguardando coleta.</p><div id="hlgbMultiuserComparison"></div></div>';
 document.getElementById('hlgbMultiuserDownload').style.setProperty('display','none','important');
 document.getElementById('hlgbMultiuserCapture').onclick=async()=>{await muCapture();if(muReport)document.getElementById('hlgbMultiuserDownload')?.style.setProperty('display','inline-block','important')};
 document.getElementById('hlgbMultiuserImport').onchange=muImport;
}
window.hlgbAuditorMultiuser={schema:MU_SCHEMA,capture:captureMultiuser,compare:compareMultiuser,validate:validateMultiuser,open:openMultiuser};

function currentBody(){
 return '<div class="sub">Auditoria automática e somente de leitura. A interface atual usa um único ponto de entrada e mantém os diagnósticos profundos por trás.</div>'+
 '<div class="panel" id="hlgbSmartStatus" style="margin-top:12px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><div>'+smartStatus()+'</div><span class="badge ok">Auditor '+V+'</span></div></div>'+
 '<div class="hlgb-auditor-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">'+
 '<button id="hlgbMultiuserOpen" class="secondary" type="button" onclick="hlgbAuditorMultiuser.open()">👥 Validação multiusuário</button>'+
 '<button id="hlgbSmartTest" class="primary" type="button" onclick="hlgbAuditorSmartRun()">🧪 Testar sistema</button>'+
 '<button id="hlgbSmartProblem" class="secondary" type="button" onclick="hlgbAuditorSmartProblem()">🛠️ Registrar problema</button>'+
 '<button id="hlgbSmartHistoryBtn" class="secondary" type="button" onclick="hlgbAuditorSmartHistory()">🕘 Histórico</button>'+
 '<button id="hlgbAuthorityBtn9374" class="secondary" type="button" onclick="hlgbAuditorAuthorityScan9374()">🧭 Arquitetura / versões</button>'+
 '<button id="hlgbBootAnalysisBtn9381" class="secondary" type="button" onclick="hlgbAuditorBootAnalysis9381.last=hlgbAuditorBootAnalysis9381.render()">🚦 Boot / cargas</button>'+
 '<button id="hlgbAuditorIntelligenceBtn9396" class="secondary" type="button">🧠 Inteligência</button>'+
 '<button id="hlgbAuditorBusinessBtn9401" class="secondary" type="button">🧩 Expansão v94</button>'+
 '</div><div id="hlgbAuditorResult"></div><div id="hlgbSmartHistory" style="display:none"></div><button type="button" class="secondary modalSave">Fechar</button>';
}
function root(){const s=document.getElementById('hlgbSmartStatus');return s?.closest?.('[role="dialog"],.modal,.modal-content,.modalCard,.modal-card,.dialog')||s?.parentElement?.parentElement||s?.parentElement||null}
function normalize(){
 ensureStyle();
 const r=root();if(!r)return false;
 for(const el of r.querySelectorAll('button,a,[role="button"]')){
  const txt=String(el.textContent||'').trim(),code=String(el.getAttribute?.('onclick')||'');
  const close=el.classList?.contains('modalSave')||/fechar|close/i.test(txt)||/closeModal/.test(code);
  const keep=(KEEP.has(el.id)||close)&&!(el.id==='hlgbMultiuserDownload'&&!el.getAttribute('href'));
  el.hidden=!keep;
  if(keep){el.removeAttribute?.('data-hlgb-auditor-hidden');el.style.setProperty?.('display','inline-block','important');el.style.setProperty?.('visibility','visible','important')}else el.setAttribute?.('data-hlgb-auditor-hidden','1');
 }
 bindIntelligence();
 bindBusiness();
 return true;
}
function openCurrent(){
 if(typeof window.openModal!=='function')return;
 retireLegacyEntryCapture();
 ensureStyle();
 window.openModal('🧪 Auditor / Testador HLGB · v'+V,currentBody(),()=>window.closeModal?.());
 try{bindIntelligence()}catch(e){}
 try{bindBusiness()}catch(e){}
 try{window.hlgbAuditorAuthority9374?.decorate?.()}catch(e){}
 try{window.hlgbAuditorBootAnalysis9381?.decorate?.()}catch(e){}
 [0,30,120,350,700].forEach(ms=>setTimeout(normalize,ms));
}
function install(){
 retireLegacyEntryCapture();
 ensureStyle();
 if(typeof window.hlgbAuditorSmartRun!=='function'||typeof window.hlgbAuditorSmartProblem!=='function')return false;
 window.openHlgbAuditor=openCurrent;
 window.HLGB_AUDITOR_SHELL_AUTHORITY=V;
 const nav=document.getElementById('hlgbAuditorNavBtn');if(nav)nav.onclick=openCurrent;
 const open=document.getElementById('hlgbAuditorOpenBtn');if(open)open.onclick=openCurrent;
 installed=true;
 return true;
}
function scheduleInstall(){
 [0,100,300,700,1500,3000,6000,10000,15000,20000,30000].forEach(ms=>setTimeout(install,ms));
}
window.hlgbAuditorShell9382={version:V,open:openCurrent,install,normalize,get installed(){return installed}};
window.HLGB_AUDITOR_SHELL_9382=true;
scheduleInstall();
try{if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>{install();[100,500,1500].forEach(ms=>setTimeout(install,ms))},0)}catch(e){}
window.addEventListener?.('hlgb:authenticated',()=>{install();[100,500,1500].forEach(ms=>setTimeout(install,ms))});
window.addEventListener?.('pageshow',()=>install());
document.addEventListener('click',e=>{const b=e.target?.closest?.('#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn');if(!b)return;install();e.preventDefault();e.stopImmediatePropagation();openCurrent()},true);
console.info('[HLGB] Auditor shell oficial v'+V+' carregado');
})();