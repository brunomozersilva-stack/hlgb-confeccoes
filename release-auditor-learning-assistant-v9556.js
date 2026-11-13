/* HLGB v95.56 — Assistente de diagnóstico: aprendizado local e pacote técnico.
 * Módulo opcional, somente leitura para dados da empresa: nunca executa reparos.
 * "Aprendizado" aqui é histórico determinístico de recorrências e evidências;
 * NÃO é um modelo de IA generativa nem edita código automaticamente.
 */
(function(){
'use strict';
const VERSION='95.56';
if(window.HLGB_AUDITOR_LEARNING_ASSISTANT_9556===VERSION)return;
window.HLGB_AUDITOR_LEARNING_ASSISTANT_9556=VERSION;
const CASES_KEY='hlgb_auditor_diagnostic_cases_v9556';
const DISABLED_KEY='hlgb_auditor_diagnostic_assistant_disabled_v9556';
const REPORT_KEY='hlgb_auditor_autocorrect_latest_report_v9448';
const PANEL_ID='hlgbAuditorLearningPanel9556';
const LIMIT=120;
const str=x=>String(x??'');
const iso=()=>new Date().toISOString();
const json=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v??f}catch(_){return f}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}};
const disabled=()=>{try{return localStorage.getItem(DISABLED_KEY)==='1'}catch(_){return false}};
const auth=()=>window.__HLGB_AUTH_READY===true;
const esc=x=>str(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SPECS={
 wal:{title:'WAL durável sem confirmação',priority:'alta',investigate:['IndexedDB WAL por opId','ACK remoto e revisão','Integridade do conteúdo antes de concluir'],tests:['tests/wal-replay-idb-confirmation-v9469.cjs','tests/production-idb-transaction-v9484.cjs'],rule:'Nunca excluir operação sem prova remota por opId e conteúdo.'},
 production:{title:'Produção: gravação ou reconciliação',priority:'alta',investigate:['Identidade do opId e revisão','RPC/ACK e releitura remota','Operações novas no mesmo registro'],tests:['tests/production-residual-opid-race-v9484.cjs','tests/production-wal-opid-stability-v9484.cjs'],rule:'Preservar edições novas e não confundir confirmação antiga com operação atual.'},
 finance:{title:'Financeiro sem projeção ativa',priority:'revisão humana',investigate:['Histórico da projeção e exclusões','Comprovantes e vínculo original','Conciliação financeira por pessoa autorizada'],tests:['tests/auditor-finance-link-v9481.cjs'],rule:'Não criar, excluir, restaurar ou alterar lançamentos financeiros automaticamente.'},
 script:{title:'Carregamento duplicado de script',priority:'média',investigate:['Loader dinâmico e script[src]','Network e Resource Timing','Guarda de inicialização única'],tests:['tests/auditor-structural-evidence-v9471.cjs'],rule:'Confirmar duplicidade real antes de alterar o loader.'},
 sync:{title:'Sincronização entre navegadores',priority:'alta',investigate:['Assinatura Realtime e reconexão','Revisão remota e atualização da tela','Prova A→B e B→A com duas sessões reais'],tests:['tests/realtime-generation-v9466.cjs','tests/realtime-revision-guard-v9465.cjs'],rule:'Testes simulados não comprovam atualização real sem refresh.'},
 save:{title:'Falha de salvamento',priority:'alta',investigate:['Clique e solicitação de gravação','RPC/ACK, revisão e leitura posterior','Atualização da tela e erro de rede'],tests:['tests/hub-save-ack-v9483.cjs'],rule:'Não declarar salvo sem confirmação do servidor e releitura.'},
 general:{title:'Falha técnica sem receita confirmada',priority:'investigar',investigate:['Mensagem e etapa exatas da falha','Código e teste que reproduz o erro','Prova antes/depois em navegador real'],tests:['scripts/run-nightly-audit.mjs'],rule:'Gerar hipótese; nunca executar uma correção desconhecida automaticamente.'}
};
function kind(x){
 const s=[x?.code,x?.action,x?.classification,x?.title,x?.detail,x?.id].map(str).join(' ').toLowerCase().slice(0,700);
 if(/finance-projection-orphan|financeiro sem projeção|projectioninvoiceid/.test(s))return 'finance';
 if(/indexeddb-wal|indexeddb.*pending|wal durável|wal duravel|review-indexeddb-pending/.test(s))return 'wal';
 if(/duplicate-scripts|script.*duplicad|review-script-loader/.test(s))return 'script';
 if(/production-reconcile|falha ao salvar production|reconcili.*produç|reconcili.*produc/.test(s))return 'production';
 if(/realtime|sincronizaç|sincronizac|cross.device|cross.browser/.test(s))return 'sync';
 if(/save|salva|grava|rpc|ack/.test(s))return 'save';
 return 'general';
}
function identity(x,k){
 const r=Array.isArray(x?.refs)?x.refs[0]:null;
 const id=str(r?.id||x?.recordId||x?.id||'');
 if(k==='finance'&&id){const m=id.match(/\d{6,}/);if(m)return m[0]}
 if(k==='production'&&id){const m=id.match(/\d{6,}/);if(m)return m[0]}
 // Record IDs and user-entered text must never become raw local fingerprints.
 const raw=str(x?.code||x?.action||x?.title||k).toLowerCase().replace(/\b\d{3,}\b/g,'#').slice(0,140);
 let h=2166136261;
 for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619)}
 return 'type-'+(h>>>0).toString(16);
}
function unresolvedChecks(report){
 const c=report?.finalAudit?.checks||[];
 return Array.isArray(c)?c.filter(x=>['warn','fail','error'].includes(str(x?.status).toLowerCase())):[];
}
function findings(report){
 const run=report?.run||{};
 const sources=[run.needsCode,run.stillFailing,run.unverified,run.blocked,unresolvedChecks(report)];
 const seen=new Set(),groups=new Map();
 for(const source of sources){
  if(!Array.isArray(source))continue;
  for(const x of source.slice(0,120)){
   if(!x||typeof x!=='object')continue;
   const k=kind(x),fingerprint=k==='general'?k+':'+identity(x,k):k;
   const unique=fingerprint+'|'+identity(x,k);
   if(seen.has(unique))continue;
   seen.add(unique);
   const prev=groups.get(fingerprint)||{fingerprint,kind:k,title:SPECS[k].title,affected:0};
   prev.affected++;groups.set(fingerprint,prev);
  }
 }
 return [...groups.values()].slice(0,LIMIT);
}
function readCases(){
 const v=json(CASES_KEY,{lastRunId:'',cases:[]});
 return v&&typeof v==='object'&&!Array.isArray(v)?{lastRunId:str(v.lastRunId),cases:Array.isArray(v.cases)?v.cases.slice(-LIMIT):[]}:{lastRunId:'',cases:[]};
}
function currentReport(){
 try{const api=window.hlgbAuditorAutoCorrect9448;const r=api?.exportReport?.();if(r?.run?.runId)return r}catch(_){}
 const r=json(REPORT_KEY,null);return r?.run?.runId?r:null;
}
const state={lastError:'',lastProcessedAt:'',lastRunId:'',current:[],observedCases:0,lastWriteOk:null};
function collect(report){
 if(!auth()||disabled())return {ok:false,reason:!auth()?'not-authenticated':'disabled'};
 const r=report||currentReport();if(!r?.run?.runId)return {ok:false,reason:'no-audit-report'};
 const id=str(r.run.runId),s=readCases();
 state.current=findings(r);state.lastRunId=id;
 if(s.lastRunId===id)return {ok:true,repeatedRun:true,observations:s.cases.length,findings:state.current.length};
 const now=iso(),byKey=new Map(s.cases.filter(x=>x?.fingerprint).map(x=>[x.fingerprint,x]));
 for(const f of state.current){
  const previous=byKey.get(f.fingerprint)||{fingerprint:f.fingerprint,kind:f.kind,title:f.title,firstSeenAt:now,observedRuns:0,recurrences:0};
  byKey.set(f.fingerprint,{...previous,lastSeenAt:now,lastRunId:id,observedRuns:(+previous.observedRuns||0)+1,recurrences:(+previous.recurrences||0)+(previous.observedRuns?1:0),lastAffected:f.affected});
 }
 const cases=[...byKey.values()].sort((a,b)=>str(b.lastSeenAt).localeCompare(str(a.lastSeenAt))).slice(0,LIMIT);
 const ok=save(CASES_KEY,{version:VERSION,lastRunId:id,cases});
 state.lastWriteOk=ok;state.lastProcessedAt=now;state.observedCases=cases.length;
 return {ok,runId:id,findings:state.current.length,observations:cases.length};
}
function sidSafeShared(x){return str(x).slice(0,180)}
function pack(){
 const r=currentReport(),c=readCases(),shared=window.hlgbLearningCloud9573?.snapshot?.()||null;
 const f=r?.run?.runId===state.lastRunId?state.current:findings(r||{});
 const cases=c.cases.filter(x=>f.some(y=>y.fingerprint===x.fingerprint));
 const coverage=r?.operationalCoverage||{};
 return {kind:'hlgb_auditor_diagnostic_learning_pack',version:VERSION,createdAt:iso(),readOnly:true,disabled:disabled(),
  sourceRunId:str(r?.run?.runId||''),appVersion:str(r?.appVersion||''),browserFamily:/safari/i.test(navigator.userAgent||'')?'Safari':/chrome/i.test(navigator.userAgent||'')?'Chrome':'Outro',
  runSummary:{result:str(r?.run?.stopReason||''),correctedReported:+r?.run?.fixed||0,auditCompleted:r?.auditCompleted!==false&&r?.run?.executionFailed!==true},
  coverage:{checks:coverage.checks||{},liveCrossDeviceProof:coverage.liveCrossDeviceProof===true,visualJumpProof:coverage.visualJumpProof===true},
  diagnoses:f.map(x=>({kind:x.kind,title:x.title,affectedInReport:x.affected,priority:SPECS[x.kind].priority,
   observedRuns:cases.find(y=>y.fingerprint===x.fingerprint)?.observedRuns||0,
   recurrences:cases.find(y=>y.fingerprint===x.fingerprint)?.recurrences||0,
   investigate:SPECS[x.kind].investigate,tests:SPECS[x.kind].tests,safetyRule:SPECS[x.kind].rule})),
  historicalCases:c.cases.length,serverCases:shared?.cases?.length||0,serverEvents:shared?.events||0,
  serverLearningConfirmed:shared?.verifiedServer===true,serverLearningError:sidSafeShared(shared?.error),
  rules:['Sem reparos automáticos neste módulo','Eventos técnicos compartilhados somente após confirmação no servidor; não gravar dados de negócio nem WAL','Histórico local continua como contingência quando estiver offline','Diagnóstico não constitui prova de correção sem reteste']};
}
function download(){
 if(!auth())return false;
 try{const data=pack(),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='hlgb-assistente-diagnostico-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);return true;
 }catch(e){state.lastError=str(e?.message||e);return false}
}
function setDisabled(v){try{localStorage.setItem(DISABLED_KEY,v?'1':'0')}catch(_){return false}if(!v)collect();render();return true}
function render(){
 if(!auth())return false;
 const host=document.getElementById('hlgbAuditorResult');if(!host)return false;
 let panel=document.getElementById(PANEL_ID);
 if(!panel){panel=document.createElement('div');panel.id=PANEL_ID;panel.className='panel';host.appendChild(panel)}
 const off=disabled(),cases=readCases().cases,observed=state.current.length,shared=window.hlgbLearningCloud9573?.snapshot?.()||{};
 panel.innerHTML='<b>🧠 Assistente de diagnóstico v'+VERSION+'</b><div class="sub">Módulo independente · histórico local e memória compartilhada · sem alterar dados de negócio</div>'+
  (off?'<p class="sub">Desativado. Nenhuma nova ocorrência será aprendida.</p>':
  '<p class="sub">'+esc(observed)+' tipo(s) de problema na última auditoria consultada · '+esc(cases.length)+' tipo(s) no histórico.</p>'+
  '<p class="sub">Sugere investigação e testes; não desenvolve nem aplica correções sozinho.</p>')+
  '<p class="sub">☁️ '+(shared.verifiedServer?'Servidor confirmado: '+(shared.cases?.length||0)+' assunto(s) conhecidos, '+(shared.events||0)+' eventos.':'Servidor ainda sem confirmação de leitura; histórico local preservado.')+'</p>'+
  '<div style="margin-top:8px"><button type="button" class="secondary" id="hlgbLearningExport9556">⬇️ Pacote técnico para correção</button> '+
  '<button type="button" class="secondary" id="hlgbLearningToggle9556">'+(off?'Ativar assistente':'Desativar assistente')+'</button></div>';
 panel.querySelector('#hlgbLearningExport9556')?.addEventListener('click',()=>{if(!off)collect();download()});
 panel.querySelector('#hlgbLearningToggle9556')?.addEventListener('click',()=>setDisabled(!off));
 return true;
}
function poll(){try{if(auth()&&!disabled()&&!document.hidden)collect();render()}catch(e){state.lastError=str(e?.message||e)}}
function activate(){if(!auth())return false;poll();return true}
window.hlgbAuditorLearningAssistant9556={version:VERSION,collect,pack,findings,render,download,disable:()=>setDisabled(true),enable:()=>setDisabled(false),history:()=>readCases().cases,status:()=>({...state,disabled:disabled(),authReady:auth(),historyCount:readCases().cases.length})};
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(activate,1000));
window.addEventListener?.('hlgb:auditor:open',()=>setTimeout(poll,250));
if(!window.__HLGB_TEST__){setInterval(poll,60000);if(auth())setTimeout(activate,7000)}
})();