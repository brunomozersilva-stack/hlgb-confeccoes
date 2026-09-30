/* HLGB — Modo Auditor/Testador interno
   Auditoria de leitura: estrutura, visual atual, funções, sincronização e integridade.
   Não cria pedidos, não altera produção e não executa ações operacionais. */
(function(){
'use strict';

const AUDIT_MODULE='systemAuditRuns';
const VERSION='2026.09.30-internal-auditor-v1';
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
function registerModule(){
  try{
    if(typeof HLGB_RECORD_MODULES!=='undefined'&&!HLGB_RECORD_MODULES.includes(AUDIT_MODULE))HLGB_RECORD_MODULES.push(AUDIT_MODULE);
    if(typeof HLGB_RECORD_WRITE_AREA!=='undefined')HLGB_RECORD_WRITE_AREA[AUDIT_MODULE]='cadastros';
    if(typeof hlgbRecordSnapshots!=='undefined'&&!hlgbRecordSnapshots[AUDIT_MODULE])hlgbRecordSnapshots[AUDIT_MODULE]=new Map();
    if(typeof hlgbRecordLastSeen!=='undefined'&&hlgbRecordLastSeen[AUDIT_MODULE]==null)hlgbRecordLastSeen[AUDIT_MODULE]='';
    if(typeof db!=='undefined'&&!Array.isArray(db[AUDIT_MODULE]))db[AUDIT_MODULE]=[];
  }catch(e){console.warn('[HLGB Auditor] módulo',e)}
}
async function loadRuns(){
  registerModule();
  if(typeof cloudRequest!=='function'||!cloudAccessToken)return false;
  try{
    const rows=await cloudRequest('hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at,updated_by&module=eq.'+encodeURIComponent(AUDIT_MODULE)+'&order=updated_at.desc&limit=100',{method:'GET'});
    if(!Array.isArray(rows))return false;
    if(typeof hlgbRecordSnapshotRows==='function')hlgbRecordSnapshotRows(AUDIT_MODULE,rows);
    db[AUDIT_MODULE]=rows.filter(r=>!r.deleted_at).map(r=>{
      try{return typeof hlgbRecordRowValue==='function'?hlgbRecordRowValue(r,AUDIT_MODULE):clone(r.data)}catch(e){return clone(r.data)}
    }).filter(Boolean);
    try{localSaveOnly?.()}catch(e){}
    return true;
  }catch(e){console.warn('[HLGB Auditor] carga',e);return false}
}
async function saveRun(row){
  registerModule();
  if(typeof hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação por registro indisponível.');
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  const out=await hlgbRecordSaveWithRetry(AUDIT_MODULE,sid(row.id),clone(row),false);
  if(!out?.applied)throw new Error('O Supabase não confirmou a auditoria.');
  const saved=clone(out.data||row),list=arr(AUDIT_MODULE),i=list.findIndex(x=>sid(x?.id)===sid(saved.id));
  if(i>=0)list[i]=saved;else list.unshift(saved);
  db[AUDIT_MODULE]=list;
  try{localSaveOnly?.()}catch(e){}
  return saved;
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
  checks.push(check('module:assistant','Módulos',statusFor(!!window.hlgbAssistant),'Assistente HLGB',window.hlgbAssistant?'Carregado':'Não carregado','error'));
  checks.push(check('module:projection-team','Módulos',statusFor(!!window.hlgbProjectionTeam),'Projeção — visão da equipe',window.hlgbProjectionTeam?'Carregada':'Não carregada','error'));
  checks.push(check('module:termination-provisions','Módulos',statusFor(!!window.HLGB_TERMINATION_PROVISION_GUARD),'Proteção de provisões após rescisão',window.HLGB_TERMINATION_PROVISION_GUARD||'Não carregada','error'));
  checks.push(check('module:hub-personal','Módulos',statusFor(!!window.HLGB_HUB_PERSONAL_INTEGRITY_GUARD),'Separação de rescisão e gasto pessoal',window.HLGB_HUB_PERSONAL_INTEGRITY_GUARD||'Não carregada','error'));
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
      return Object.values(p.modules).reduce((n,a)=>n+(Array.isArray(a)?a.length:0),0);
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
  return arr(AUDIT_MODULE).slice().sort((a,b)=>String(b?.completedAt||b?.startedAt||'').localeCompare(String(a?.completedAt||a?.startedAt||'')))[0]||null;
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
  const runs=arr(AUDIT_MODULE).slice().sort((a,b)=>String(b?.completedAt||'').localeCompare(String(a?.completedAt||''))).slice(0,12);
  return runs.length?runs.map(x=>'<button type="button" class="secondary" onclick="hlgbAuditorShowRun(\''+escSafe(x.id)+'\')">'+resultBadge(x)+' '+escSafe(String(x.completedAt||'').replace('T',' ').slice(0,16))+' · '+escSafe(x.browser||'-')+' · '+escSafe(x.activePage||'-')+'</button>').join(''):'<div class="empty">Nenhuma auditoria salva.</div>';
}
function openAuditor(){
  inject();
  const last=latest();
  openModal('🧪 Auditor / Testador HLGB','<div class="sub">Executa conferência interna <b>somente de leitura</b>. Não cria pedidos, não dá baixa e não altera produção ou financeiro.</div><div class="hlgb-auditor-actions"><button type="button" class="primary" onclick="hlgbAuditorRunFull()">🧪 Testar sistema</button><button type="button" class="secondary" onclick="hlgbAuditorRunVisual()">👁️ Conferir tela atual</button><button type="button" class="secondary" onclick="hlgbAuditorCopyLatest()">📋 Copiar última auditoria</button></div><div id="hlgbAuditorResult">'+renderRun(last)+'</div><div class="panel"><h3 style="margin-top:0">Histórico</h3><div id="hlgbAuditorHistory" class="hlgb-auditor-history">'+historyHtml()+'</div></div><button type="button" class="secondary modalSave">Fechar</button>',()=>closeModal());
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
window.hlgbAuditorShowRun=function(runId){
  const row=arr(AUDIT_MODULE).find(x=>sid(x?.id)===sid(runId)),out=document.getElementById('hlgbAuditorResult');
  if(out)out.innerHTML=renderRun(row);
};
window.hlgbAuditorCopyLatest=async function(){
  const text=report(latest());
  try{await navigator.clipboard.writeText(text);alert('Última auditoria copiada.')}catch(e){alert(text)}
};
window.hlgbInternalAuditor={VERSION,module:AUDIT_MODULE,buildRun,run,latest,report,auditFunctions,auditModules,auditDomStructure,auditVisualCurrent,auditSync,auditDataIntegrity,loadRuns};
function boot(){
  registerModule();inject();
  try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(()=>{inject();loadRuns()},500)},0)}catch(e){}
  if(document.getElementById('appShell')?.style.display==='block')setTimeout(()=>loadRuns(),500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
console.info('[HLGB] Auditor/Testador interno '+VERSION+' carregado');
})();