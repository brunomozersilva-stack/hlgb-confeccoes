/* HLGB — Central de Erros e Melhorias
   Primeira etapa do Assistente HLGB: diagnóstico, sugestões e relatório para manutenção.
   Não altera dados operacionais durante a varredura. */
(function(){
'use strict';

const ISSUE_MODULE='systemIssues';
const SUGGESTION_MODULE='systemSuggestions';
const VERSION='2026.09.30-diagnostics-v1';
const MAX_AUTO_PER_SESSION=30;
let autoCount=0;
let savingDiagnostic=false;
let centerLoaded=false;
let scanFindings=[];

const sid=v=>String(v??'');
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
const now=()=>new Date().toISOString();
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
const id=prefix=>prefix+'-'+Date.now()+'-'+Math.floor(Math.random()*900000+100000);

function arr(name){try{return Array.isArray(db?.[name])?db[name]:[]}catch(e){return []}}
function currentName(){
  try{const u=typeof currentUser==='function'?currentUser():null;return String(u?.name||u?.login||cloudUser?.email||'Usuário')}catch(e){return 'Usuário'}
}
function currentPage(){try{return document.querySelector('.page.active')?.id||'desconhecida'}catch(e){return 'desconhecida'}}
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
function sanitize(value){
  let s=String(value??'');
  s=s.replace(/eyJ[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{12,}/g,'[TOKEN REMOVIDO]');
  s=s.replace(/((?:(?:access|refresh|service[_ -]?role|api)[_ -]?token|apikey|api[_ -]?key|senha|password)\s*[:=]\s*)[^\s,;}"']+/gi,'$1[REMOVIDO]');
  s=s.replace(/Bearer\s+[A-Za-z0-9._~-]+/gi,'Bearer [REMOVIDO]');
  return s.slice(0,12000);
}
function fingerprint(parts){
  const s=parts.map(x=>norm(sanitize(x))).join('|').slice(0,1000);
  let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return 'f'+(h>>>0).toString(16);
}
function registerModules(){
  try{
    for(const m of [ISSUE_MODULE,SUGGESTION_MODULE]){
      if(typeof HLGB_RECORD_MODULES!=='undefined'&&!HLGB_RECORD_MODULES.includes(m))HLGB_RECORD_MODULES.push(m);
      if(typeof HLGB_RECORD_WRITE_AREA!=='undefined')HLGB_RECORD_WRITE_AREA[m]='cadastros';
      if(typeof hlgbRecordSnapshots!=='undefined'&&!hlgbRecordSnapshots[m])hlgbRecordSnapshots[m]=new Map();
      if(typeof hlgbRecordLastSeen!=='undefined'&&hlgbRecordLastSeen[m]==null)hlgbRecordLastSeen[m]='';
      if(typeof db!=='undefined'&&!Array.isArray(db[m]))db[m]=[];
    }
  }catch(e){console.warn('[HLGB diagnóstico] módulos',e)}
}
async function loadDiagnosticModule(module){
  registerModules();
  if(typeof cloudRequest!=='function'||!cloudAccessToken)return false;
  try{
    const rows=await cloudRequest('hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at,updated_by&module=eq.'+encodeURIComponent(module)+'&order=updated_at.asc&limit=5000',{method:'GET'});
    if(!Array.isArray(rows))return false;
    if(typeof hlgbRecordSnapshotRows==='function')hlgbRecordSnapshotRows(module,rows);
    db[module]=rows.filter(r=>!r.deleted_at).map(r=>{
      try{return typeof hlgbRecordRowValue==='function'?hlgbRecordRowValue(r,module):clone(r.data)}catch(e){return clone(r.data)}
    }).filter(Boolean);
    try{localSaveOnly?.()}catch(e){}
    return true;
  }catch(e){console.warn('[HLGB diagnóstico] carga '+module,e);return false}
}
async function refreshCenterData(renderAfter=true){
  if(typeof cloudEnsureFreshSession==='function')try{await cloudEnsureFreshSession(false)}catch(e){}
  await loadDiagnosticModule(ISSUE_MODULE);
  await loadDiagnosticModule(SUGGESTION_MODULE);
  if(renderAfter)renderCenter();
}
async function saveDiagnostic(module,row){
  registerModules();
  if(!row?.id)throw new Error('Registro de diagnóstico sem ID.');
  if(typeof hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação por registro indisponível.');
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  savingDiagnostic=true;
  try{
    const out=await hlgbRecordSaveWithRetry(module,sid(row.id),clone(row),false);
    if(!out?.applied)throw new Error('O Supabase não confirmou o registro.');
    const data=clone(out.data||row);
    const list=Array.isArray(db[module])?db[module]:(db[module]=[]);
    const i=list.findIndex(x=>sid(x?.id)===sid(data.id));
    if(i>=0)list[i]=data;else list.push(data);
    try{localSaveOnly?.()}catch(e){}
    return data;
  }finally{savingDiagnostic=false}
}
async function deleteDiagnostic(module,row){
  if(!row?.id)return false;
  savingDiagnostic=true;
  try{
    const payload={...clone(row),__hlgb_explicit_delete:true,updatedAt:now()};
    const out=await hlgbRecordSaveWithRetry(module,sid(row.id),payload,true);
    if(!out?.applied)throw new Error('A exclusão não foi confirmada.');
    db[module]=(db[module]||[]).filter(x=>sid(x?.id)!==sid(row.id));
    try{localSaveOnly?.()}catch(e){}
    return true;
  }finally{savingDiagnostic=false}
}
function issueBase(extra={}){
  return {
    id:id('issue'),
    kind:'error',
    title:'Erro sem título',
    description:'',
    status:'Aberto',
    priority:'Média',
    sourceType:'manual',
    page:currentPage(),
    user:currentName(),
    browser:browserLabel(),
    appVersion:appVersion(),
    firstSeenAt:now(),
    lastSeenAt:now(),
    occurrences:1,
    fingerprint:'',
    technical:'',
    recordRefs:[],
    ...extra
  };
}
function suggestionBase(extra={}){
  return {
    id:id('suggestion'),
    kind:'suggestion',
    title:'Sugestão',
    description:'',
    status:'Pendente',
    priority:'Média',
    page:currentPage(),
    user:currentName(),
    appVersion:appVersion(),
    createdAt:now(),
    updatedAt:now(),
    ...extra
  };
}
async function upsertAutoIssue(extra){
  if(autoCount>=MAX_AUTO_PER_SESSION)return null;
  autoCount++;
  const fp=extra.fingerprint||fingerprint([extra.title,extra.technical,extra.page,extra.sourceType]);
  const open=arr(ISSUE_MODULE).find(x=>x?.fingerprint===fp&&x?.status!=='Resolvido');
  if(open){
    const next={...clone(open),lastSeenAt:now(),occurrences:(+open.occurrences||1)+1,technical:sanitize(extra.technical||open.technical||''),description:sanitize(extra.description||open.description||'')};
    return saveDiagnostic(ISSUE_MODULE,next);
  }
  return saveDiagnostic(ISSUE_MODULE,issueBase({...extra,fingerprint:fp,technical:sanitize(extra.technical||''),description:sanitize(extra.description||'')}));
}
function queueAutoIssue(extra){
  if(savingDiagnostic)return;
  Promise.resolve().then(()=>upsertAutoIssue(extra)).then(()=>{if(document.getElementById('hlgbDiagnosticsCenter')?.classList.contains('active'))renderCenter()}).catch(e=>console.warn('[HLGB diagnóstico] não foi possível registrar ocorrência',e));
}
function installErrorCapture(){
  if(window.__HLGB_DIAGNOSTICS_CAPTURED)return;
  window.__HLGB_DIAGNOSTICS_CAPTURED=true;
  window.addEventListener('error',ev=>{
    if(savingDiagnostic)return;
    const msg=sanitize(ev?.message||ev?.error?.message||'Erro JavaScript');
    if(!msg||/hlgb diagnóstico/i.test(msg))return;
    queueAutoIssue({
      title:'Erro JavaScript em '+currentPage(),
      description:'Erro capturado automaticamente durante o uso do sistema.',
      technical:msg+(ev?.filename?' | '+sanitize(ev.filename):'')+(ev?.lineno?' | linha '+ev.lineno:''),
      page:currentPage(),
      sourceType:'javascript',
      priority:'Alta'
    });
  });
  window.addEventListener('unhandledrejection',ev=>{
    if(savingDiagnostic)return;
    const reason=ev?.reason;
    const msg=sanitize(reason?.stack||reason?.message||reason||'Promise rejeitada');
    if(!msg||/hlgb diagnóstico/i.test(msg))return;
    queueAutoIssue({
      title:'Falha assíncrona em '+currentPage(),
      description:'Falha não tratada capturada automaticamente.',
      technical:msg,
      page:currentPage(),
      sourceType:'promise',
      priority:'Alta'
    });
  });
  try{
    const original=window.hlgbRecordSaveWithRetry;
    if(typeof original==='function'&&!original.__hlgbDiagnosticsWrapped){
      const wrapped=async function(module,id,data,deleted){
        try{return await original.apply(this,arguments)}
        catch(err){
          if(!savingDiagnostic&&module!==ISSUE_MODULE&&module!==SUGGESTION_MODULE){
            const code=String(err?.code||'');
            const paths=Array.isArray(err?.paths)?err.paths.map(String):[];
            const protectedConflict=['HLGB_SAME_FIELD_CONFLICT','HLGB_STALE_PENDING_BLOCK','HLGB_TOMBSTONE_BLOCK','HLGB_ORPHAN_AUTO_CUT_BLOCK'].includes(code);
            const title=protectedConflict?'Conflito protegido em '+module:'Falha ao salvar '+module;
            const description=protectedConflict
              ?'O sistema impediu que uma alteração local sobrescrevesse um dado mais novo ou incompatível da nuvem. O registro foi preservado para revisão.'
              :'O sistema tentou gravar um registro e a confirmação falhou.';
            queueAutoIssue({
              title,
              description,
              technical:sanitize(err?.stack||err?.message||err),
              page:currentPage(),
              sourceType:protectedConflict?'protected-conflict':'save',
              priority:protectedConflict?'Alta':'Crítica',
              recordRefs:[{module:String(module),id:String(id)}],
              // Conflitos protegidos iguais são agrupados por módulo/código/campos,
              // em vez de abrir um erro crítico separado para cada registro.
              fingerprint:protectedConflict
                ?fingerprint(['protected-conflict',module,code,paths.slice().sort().join('|')||String(err?.message||'').replace(/\d{6,}/g,'#')])
                :fingerprint(['save',module,id,err?.message])
            });
          }
          throw err;
        }
      };
      wrapped.__hlgbDiagnosticsWrapped=true;
      wrapped.__original=original;
      window.hlgbRecordSaveWithRetry=wrapped;
    }
  }catch(e){console.warn('[HLGB diagnóstico] captura de gravação',e)}
}
function statusBadge(s){
  const n=norm(s);
  const cls=n==='resolvido'||n==='concluida'?'ok':n==='em analise'||n==='em andamento'?'warn':'';
  return '<span class="badge '+cls+'">'+esc(s||'-')+'</span>';
}
function priorityBadge(p){
  const n=norm(p),cls=n==='critica'||n==='alta'?'warn':'';
  return '<span class="badge '+cls+'">'+esc(p||'-')+'</span>';
}
function injectStyles(){
  if(document.getElementById('hlgbDiagnosticsStyle'))return;
  const st=document.createElement('style');st.id='hlgbDiagnosticsStyle';
  st.textContent='.hlgb-dg-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.hlgb-dg-tabs button.active{font-weight:800;box-shadow:inset 0 -3px 0 #6f3f59}.hlgb-dg-row-title{font-weight:800}.hlgb-dg-meta{font-size:12px;color:#786b73;margin-top:4px}.hlgb-dg-actions{display:flex;gap:6px;flex-wrap:wrap}.hlgb-dg-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0}.hlgb-dg-summary .card{min-height:76px}.hlgb-dg-report{width:100%;min-height:320px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;white-space:pre-wrap}.hlgb-dg-scan{border-left:4px solid #d79b24;padding-left:12px}.hlgb-dg-check{transform:scale(1.15)}';
  document.head.appendChild(st);
}
function injectUI(){
  injectStyles();
  const nav=document.getElementById('nav');
  if(nav&&!document.getElementById('hlgbDiagnosticsNav')){
    const groups=[...nav.querySelectorAll('.nav-group')];
    const sys=groups.find(g=>/sistema/i.test(g.querySelector('.nav-group-title')?.textContent||''));
    const menu=sys?.querySelector('.nav-submenu');
    if(menu){
      const b=document.createElement('button');b.id='hlgbDiagnosticsNav';b.type='button';b.innerHTML='🩺 Central de erros e melhorias';b.onclick=()=>openCenter(b);menu.insertBefore(b,menu.firstChild);
    }else{
      const b=document.createElement('button');b.id='hlgbDiagnosticsNav';b.className='nav-home';b.type='button';b.innerHTML='🩺 <span>Erros e melhorias</span>';b.onclick=()=>openCenter(b);nav.appendChild(b);
    }
  }
  const main=document.querySelector('#appShell main');
  if(main&&!document.getElementById('hlgbDiagnosticsCenter')){
    const sec=document.createElement('section');sec.id='hlgbDiagnosticsCenter';sec.className='page';
    sec.innerHTML='<h1>🩺 Central de Erros e Melhorias</h1><div class="sub">Registre problemas e sugestões, rode verificações de leitura e prepare um relatório técnico para manutenção.</div><div class="hlgb-dg-summary" id="hlgbDgCards"></div><div class="hlgb-dg-tabs"><button id="hlgbDgTabErrors" class="primary" onclick="hlgbDiagnosticsShowTab(\'errors\')">Erros</button><button id="hlgbDgTabSuggestions" class="secondary" onclick="hlgbDiagnosticsShowTab(\'suggestions\')">Sugestões</button><button id="hlgbDgTabScan" class="secondary" onclick="hlgbDiagnosticsShowTab(\'scan\')">🔍 Varrer sistema</button><button id="hlgbDgTabReport" class="secondary" onclick="hlgbDiagnosticsShowTab(\'report\')">📋 Preparar para o ChatGPT</button></div><div id="hlgbDgBody"></div>';
    main.appendChild(sec);
  }
}
function openCenter(btn){
  if(typeof hasAccess==='function'&&!hasAccess('cadastros')){alert('Seu usuário não tem permissão para acessar esta área.');return}
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  const target=document.getElementById('hlgbDiagnosticsCenter');if(!target)return;
  target.classList.add('active');
  document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));
  if(btn){btn.classList.add('active');try{openParentNavGroup?.(btn)}catch(e){}}
  renderCenter();
  refreshCenterData(true).catch(()=>{});
  try{auditAction?.('Acessou tela','Central de Erros e Melhorias')}catch(e){}
}
window.openHlgbDiagnosticsCenter=openCenter;

let activeTab='errors';
window.hlgbDiagnosticsShowTab=function(tab){
  activeTab=tab||'errors';
  renderCenter();
  if(activeTab==='scan')renderScanTab();
  if(activeTab==='report')renderReportTab();
};
function updateTabButtons(){
  const map={errors:'hlgbDgTabErrors',suggestions:'hlgbDgTabSuggestions',scan:'hlgbDgTabScan',report:'hlgbDgTabReport'};
  Object.entries(map).forEach(([k,id])=>{const b=document.getElementById(id);if(!b)return;b.className=k===activeTab?'primary active':'secondary'});
}
function renderCards(){
  const issues=arr(ISSUE_MODULE),sugs=arr(SUGGESTION_MODULE);
  const open=issues.filter(x=>x.status!=='Resolvido').length,critical=issues.filter(x=>x.status!=='Resolvido'&&['Crítica','Alta'].includes(x.priority)).length,pending=sugs.filter(x=>!['Concluída','Recusada'].includes(x.status)).length;
  const cards=document.getElementById('hlgbDgCards');if(!cards)return;
  cards.innerHTML='<div class="card"><small>Erros abertos</small><strong>'+open+'</strong></div><div class="card"><small>Alta prioridade</small><strong>'+critical+'</strong></div><div class="card"><small>Sugestões pendentes</small><strong>'+pending+'</strong></div><div class="card"><small>Versão observada</small><strong style="font-size:16px">'+esc(appVersion())+'</strong></div>';
}
function issueRow(x){
  return ['<input class="hlgb-dg-check" type="checkbox" data-dg-select="issue" value="'+esc(x.id)+'" checked>', '<div class="hlgb-dg-row-title">'+esc(x.title||'Erro')+'</div><div class="hlgb-dg-meta">'+esc(x.page||'-')+' · '+esc(x.user||'-')+' · '+esc(x.browser||'-')+'</div>',priorityBadge(x.priority),statusBadge(x.status),esc(String(x.occurrences||1)),esc((x.lastSeenAt||x.firstSeenAt||'').replace('T',' ').slice(0,16)),'<div class="hlgb-dg-actions"><button class="secondary" onclick="hlgbDiagnosticsViewIssue(\''+esc(x.id)+'\')">Ver</button><button class="secondary" onclick="hlgbDiagnosticsSetIssueStatus(\''+esc(x.id)+'\',\'Em análise\')">Em análise</button><button class="primary" onclick="hlgbDiagnosticsSetIssueStatus(\''+esc(x.id)+'\',\'Resolvido\')">Resolver</button></div>'];
}
function renderErrors(){
  const body=document.getElementById('hlgbDgBody');if(!body)return;
  const list=arr(ISSUE_MODULE).slice().sort((a,b)=>String(b.lastSeenAt||b.firstSeenAt||'').localeCompare(String(a.lastSeenAt||a.firstSeenAt||'')));
  body.innerHTML='<div class="toolbar"><button class="primary" onclick="hlgbDiagnosticsNewIssue()">+ Relatar erro</button><button class="secondary" onclick="hlgbDiagnosticsRefresh()">🔄 Atualizar</button></div><div id="hlgbDgErrorTable">'+(list.length?table(['✓','Erro','Prioridade','Status','Ocorrências','Última ocorrência','Ações'],list.map(issueRow)):'<div class="empty">Nenhum erro registrado.</div>')+'</div>';
}
function suggestionRow(x){
  return ['<input class="hlgb-dg-check" type="checkbox" data-dg-select="suggestion" value="'+esc(x.id)+'" checked>','<div class="hlgb-dg-row-title">'+esc(x.title||'Sugestão')+'</div><div class="hlgb-dg-meta">'+esc(x.page||'-')+' · '+esc(x.user||'-')+'</div>',priorityBadge(x.priority),statusBadge(x.status),esc((x.updatedAt||x.createdAt||'').replace('T',' ').slice(0,16)),'<div class="hlgb-dg-actions"><button class="secondary" onclick="hlgbDiagnosticsViewSuggestion(\''+esc(x.id)+'\')">Ver</button><button class="secondary" onclick="hlgbDiagnosticsSetSuggestionStatus(\''+esc(x.id)+'\',\'Em andamento\')">Em andamento</button><button class="primary" onclick="hlgbDiagnosticsSetSuggestionStatus(\''+esc(x.id)+'\',\'Concluída\')">Concluir</button></div>'];
}
function renderSuggestions(){
  const body=document.getElementById('hlgbDgBody');if(!body)return;
  const list=arr(SUGGESTION_MODULE).slice().sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
  body.innerHTML='<div class="toolbar"><button class="primary" onclick="hlgbDiagnosticsNewSuggestion()">+ Anotar sugestão</button><button class="secondary" onclick="hlgbDiagnosticsRefresh()">🔄 Atualizar</button></div>'+(list.length?table(['✓','Sugestão','Prioridade','Status','Atualização','Ações'],list.map(suggestionRow)):'<div class="empty">Nenhuma sugestão registrada.</div>');
}
function renderCenter(){
  injectUI();updateTabButtons();renderCards();
  if(activeTab==='suggestions')renderSuggestions();
  else if(activeTab==='scan')renderScanTab();
  else if(activeTab==='report')renderReportTab();
  else renderErrors();
}
window.hlgbDiagnosticsRefresh=()=>refreshCenterData(true);

window.hlgbDiagnosticsNewIssue=function(){
  openModal('Relatar erro','<div class="grid"><div class="field"><label>Título</label><input id="dgIssueTitle" placeholder="Ex.: valor não atualizou"></div><div class="field"><label>Prioridade</label><select id="dgIssuePriority"><option>Baixa</option><option selected>Média</option><option>Alta</option><option>Crítica</option></select></div><div class="field" style="grid-column:1/-1"><label>O que aconteceu?</label><textarea id="dgIssueDescription" rows="5" placeholder="Explique o que você fez e o que apareceu de errado."></textarea></div><div class="field"><label>Tela</label><input id="dgIssuePage" value="'+esc(currentPage())+'"></div><div class="field"><label>Pedido/registro relacionado</label><input id="dgIssueRef" placeholder="Ex.: pedido #87"></div></div><button class="primary modalSave">☁️ Salvar erro</button>',async()=>{
    const title=String(document.getElementById('dgIssueTitle')?.value||'').trim(),description=String(document.getElementById('dgIssueDescription')?.value||'').trim();
    if(!title||!description)return alert('Informe o título e descreva o erro.');
    const ref=String(document.getElementById('dgIssueRef')?.value||'').trim();
    const row=issueBase({title:sanitize(title),description:sanitize(description),priority:document.getElementById('dgIssuePriority')?.value||'Média',page:String(document.getElementById('dgIssuePage')?.value||currentPage()),recordRefs:ref?[{label:sanitize(ref)}]:[],sourceType:'manual'});
    row.fingerprint=fingerprint(['manual',row.title,row.page,ref]);
    const b=document.querySelector('#modal .modalSave');if(b){b.disabled=true;b.textContent='☁️ Salvando…'}
    try{await saveDiagnostic(ISSUE_MODULE,row);closeModal();activeTab='errors';renderCenter()}catch(e){if(b){b.disabled=false;b.textContent='☁️ Salvar erro'}alert('Não foi possível salvar o erro na nuvem.\n\n'+String(e?.message||e))}
  });
};
window.hlgbDiagnosticsNewSuggestion=function(){
  openModal('Anotar sugestão','<div class="grid"><div class="field"><label>Título</label><input id="dgSugTitle" placeholder="Ex.: mostrar cliente maior"></div><div class="field"><label>Prioridade</label><select id="dgSugPriority"><option>Baixa</option><option selected>Média</option><option>Alta</option></select></div><div class="field" style="grid-column:1/-1"><label>Sugestão</label><textarea id="dgSugDescription" rows="5" placeholder="Escreva do seu jeito o que ficaria melhor no sistema."></textarea></div><div class="field"><label>Tela</label><input id="dgSugPage" value="'+esc(currentPage())+'"></div></div><button class="primary modalSave">☁️ Salvar sugestão</button>',async()=>{
    const title=String(document.getElementById('dgSugTitle')?.value||'').trim(),description=String(document.getElementById('dgSugDescription')?.value||'').trim();
    if(!title||!description)return alert('Informe o título e a sugestão.');
    const row=suggestionBase({title:sanitize(title),description:sanitize(description),priority:document.getElementById('dgSugPriority')?.value||'Média',page:String(document.getElementById('dgSugPage')?.value||currentPage())});
    const b=document.querySelector('#modal .modalSave');if(b){b.disabled=true;b.textContent='☁️ Salvando…'}
    try{await saveDiagnostic(SUGGESTION_MODULE,row);closeModal();activeTab='suggestions';renderCenter()}catch(e){if(b){b.disabled=false;b.textContent='☁️ Salvar sugestão'}alert('Não foi possível salvar a sugestão na nuvem.\n\n'+String(e?.message||e))}
  });
};
window.hlgbDiagnosticsSetIssueStatus=async function(rowId,status){
  const row=arr(ISSUE_MODULE).find(x=>sid(x.id)===sid(rowId));if(!row)return;
  try{await saveDiagnostic(ISSUE_MODULE,{...clone(row),status,updatedAt:now(),resolvedAt:status==='Resolvido'?now():row.resolvedAt||''});renderCenter()}catch(e){alert('Status não confirmado.\n\n'+String(e?.message||e))}
};
window.hlgbDiagnosticsSetSuggestionStatus=async function(rowId,status){
  const row=arr(SUGGESTION_MODULE).find(x=>sid(x.id)===sid(rowId));if(!row)return;
  try{await saveDiagnostic(SUGGESTION_MODULE,{...clone(row),status,updatedAt:now()});renderCenter()}catch(e){alert('Status não confirmado.\n\n'+String(e?.message||e))}
};
window.hlgbDiagnosticsViewIssue=function(rowId){
  const x=arr(ISSUE_MODULE).find(r=>sid(r.id)===sid(rowId));if(!x)return;
  openModal('Detalhes do erro','<div class="panel"><b>'+esc(x.title)+'</b><p>'+esc(x.description||'-')+'</p><div class="sub">Tela: '+esc(x.page||'-')+' · Usuário: '+esc(x.user||'-')+' · Navegador: '+esc(x.browser||'-')+' · Versão: '+esc(x.appVersion||'-')+'</div></div><div class="field"><label>Detalhe técnico</label><textarea rows="9" readonly>'+esc(sanitize(x.technical||'Sem detalhe técnico.'))+'</textarea></div><button class="secondary modalSave">Fechar</button>',()=>closeModal());
};
window.hlgbDiagnosticsViewSuggestion=function(rowId){
  const x=arr(SUGGESTION_MODULE).find(r=>sid(r.id)===sid(rowId));if(!x)return;
  openModal('Detalhes da sugestão','<div class="panel"><b>'+esc(x.title)+'</b><p>'+esc(x.description||'-')+'</p><div class="sub">Tela: '+esc(x.page||'-')+' · Sugerido por: '+esc(x.user||'-')+' · Versão: '+esc(x.appVersion||'-')+'</div></div><button class="secondary modalSave">Fechar</button>',()=>closeModal());
};

function duplicateIds(module){
  const seen=new Set(),dups=[];
  arr(module).forEach(x=>{const k=sid(x?.id||x?.__hlgbId);if(!k)return;if(seen.has(k))dups.push(k);else seen.add(k)});
  return [...new Set(dups)];
}
function scanSystem(){
  const out=[];
  const modules=['orders','cuts','production','capacityAssignments','finance','projectionInvoices','employees','terminations','factions','missingPieces'];
  modules.forEach(m=>{
    const d=duplicateIds(m);if(d.length)out.push({severity:'Crítica',code:'duplicate-id',title:'IDs duplicados em '+m,description:d.length+' ID(s) duplicado(s): '+d.slice(0,10).join(', '),page:'sistema',refs:d.map(id=>({module:m,id}))});
  });
  const orders=new Map(arr('orders').map(x=>[sid(x?.id),x])),products=new Set(arr('products').map(x=>sid(x?.id)));
  const distinctProductIds=(rows)=>{
    const set=new Set();
    (Array.isArray(rows)?rows:[]).forEach(x=>{const p=sid(x?.productId);if(p)set.add(p)});
    return [...set];
  };
  for(const c of arr('cuts')){
    const orderId=sid(c?.orderId),order=orderId?orders.get(orderId):null,cutProduct=sid(c?.productId);
    if(orderId&&!order){
      out.push({severity:'Alta',code:'cut-order-missing',title:'Corte sem pedido existente',description:'Corte '+sid(c.id)+' aponta para pedido '+orderId+' que não está ativo.',page:'corte',refs:[{module:'cuts',id:sid(c.id)},{module:'orders',id:orderId}]});
      continue; // evita duplicar o mesmo problema como produto ausente
    }
    if(cutProduct){
      if(!products.has(cutProduct))out.push({severity:'Alta',code:'cut-product-missing',title:'Corte com produto inexistente',description:'Corte '+sid(c.id)+' aponta para productId '+cutProduct+' que não está ativo.',page:'corte',refs:[{module:'cuts',id:sid(c.id)},{module:'products',id:cutProduct}]});
      continue;
    }
    const cutGradeIds=[...new Set([...distinctProductIds(c?.originalGrade),...distinctProductIds(c?.actualCutGrade)])];
    const orderGradeIds=distinctProductIds(order?.grade);
    const represented=cutGradeIds.length?cutGradeIds:orderGradeIds;
    if(represented.length>1){
      continue; // corte agregado: vários produtos, portanto não existe um único productId correto
    }
    if(!orderId){
      const confirmedHistoricalLegacyCut=
        sid(c?.id)==='1'&&
        String(c?.op||'').trim()==='OP-00126'&&
        Number(c?.pieces||0)===293&&
        Number(c?.layers||0)===20&&
        Number(c?.meters||0)===82&&
        String(c?.color||'').trim()==='Rubi'&&
        String(c?.fabric||'').trim()==='Tule';
      if(confirmedHistoricalLegacyCut)continue; // registro histórico confirmado no Supabase e em backups antigos
      out.push({severity:'Média',code:'cut-legacy-unlinked',title:'Corte legado sem vínculo de pedido/produto',description:'Corte '+sid(c.id)+' não possui orderId nem productId. Trate como histórico/manual se for intencional.',page:'corte',refs:[{module:'cuts',id:sid(c.id)}]});
      continue;
    }
    out.push({severity:'Alta',code:'cut-product-missing',title:'Corte sem produto válido',description:'Corte '+sid(c.id)+' está ligado a um único produto, mas está sem productId válido.',page:'corte',refs:[{module:'cuts',id:sid(c.id)},{module:'orders',id:orderId}]});
  }
  for(const p of arr('production')){
    if(p?.orderId!=null&&!orders.has(sid(p.orderId)))out.push({severity:'Alta',code:'production-order-missing',title:'Produção sem pedido existente',description:'Produção '+sid(p.id)+' aponta para pedido '+sid(p.orderId)+' que não está ativo.',page:'producao',refs:[{module:'production',id:sid(p.id)}]});
    if(p?.productId!=null&&!products.has(sid(p.productId)))out.push({severity:'Alta',code:'production-product-missing',title:'Produção com produto inexistente',description:'Produção '+sid(p.id)+' aponta para productId '+sid(p.productId)+' inexistente.',page:'producao',refs:[{module:'production',id:sid(p.id)}]});
  }
  const emp=new Map(arr('employees').map(x=>[sid(x?.id),x]));
  for(const t of arr('terminations')){
    if(t?.employeeId!=null&&!emp.has(sid(t.employeeId)))out.push({severity:'Média',code:'termination-employee-missing',title:'Rescisão sem funcionário ativo/arquivado correspondente',description:'Rescisão '+sid(t.id)+' aponta para employeeId '+sid(t.employeeId)+'.',page:'folhaPagamento',refs:[{module:'terminations',id:sid(t.id)}]});
  }
  for(const e of arr('employees')){
    if(e?.active===true&&e?.terminationDate)out.push({severity:'Alta',code:'active-with-termination',title:'Funcionário ativo com data de desligamento',description:(e.name||'Funcionário')+' está ativo e possui terminationDate '+e.terminationDate+'.',page:'funcionarios',refs:[{module:'employees',id:sid(e.id)}]});
    if(e?.active===false&&!e?.terminationDate)out.push({severity:'Média',code:'inactive-no-termination-date',title:'Funcionário inativo sem data de desligamento',description:(e.name||'Funcionário')+' está inativo sem terminationDate.',page:'funcionarios',refs:[{module:'employees',id:sid(e.id)}]});
  }
  const projections=new Set(arr('projectionInvoices').map(x=>sid(x?.id)));
  for(const f of arr('finance')){
    if(f?.projectionInvoiceId!=null&&!projections.has(sid(f.projectionInvoiceId)))out.push({severity:'Alta',code:'finance-projection-orphan',title:'Financeiro sem projeção correspondente',description:'Finance '+sid(f.id)+' aponta para projectionInvoiceId '+sid(f.projectionInvoiceId)+' inexistente.',page:'financeiro',refs:[{module:'finance',id:sid(f.id)}]});
  }
  const unique=new Map();
  out.forEach(x=>{const fp=fingerprint([x.code,x.title,JSON.stringify(x.refs||[])]);if(!unique.has(fp))unique.set(fp,{...x,fingerprint:fp})});
  return [...unique.values()];
}
async function saveScanFindings(){
  const findings=scanFindings.slice();if(!findings.length)return alert('A varredura não encontrou problemas para registrar.');
  let ok=0;
  for(const f of findings){
    try{await upsertAutoIssue({title:f.title,description:f.description,technical:'Encontrado pela varredura automática de leitura. Código: '+f.code,page:f.page,sourceType:'scan',priority:f.severity,recordRefs:f.refs||[],fingerprint:f.fingerprint});ok++}catch(e){console.warn('[HLGB diagnóstico] achado não salvo',e)}
  }
  alert(ok+' achado(s) registrado(s) na Central de Erros.');
  activeTab='errors';renderCenter();
}
window.hlgbDiagnosticsSaveScanFindings=saveScanFindings;
function renderScanTab(){
  const body=document.getElementById('hlgbDgBody');if(!body)return;
  scanFindings=scanSystem();
  body.innerHTML='<div class="panel hlgb-dg-scan"><h3 style="margin-top:0">Varredura somente de leitura</h3><div class="sub">Esta verificação não altera pedido, corte, produção, financeiro ou folha. Ela apenas procura inconsistências objetivas nos dados já carregados.</div><div class="toolbar" style="margin-top:10px"><button class="primary" onclick="hlgbDiagnosticsRunScan()">🔍 Varrer novamente</button>'+(scanFindings.length?'<button class="secondary" onclick="hlgbDiagnosticsSaveScanFindings()">Salvar achados na Central</button>':'')+'</div></div><div class="hlgb-dg-summary"><div class="card"><small>Problemas encontrados</small><strong>'+scanFindings.length+'</strong></div><div class="card"><small>Verificações executadas</small><strong>7</strong></div></div>'+(scanFindings.length?table(['Prioridade','Problema','Tela','Referências'],scanFindings.map(f=>[priorityBadge(f.severity),'<b>'+esc(f.title)+'</b><div class="sub">'+esc(f.description)+'</div>',esc(f.page),esc((f.refs||[]).map(r=>r.module+':'+r.id).join(', ')||'-')])):'<div class="panel"><b>✅ Nenhuma inconsistência dessas regras foi encontrada.</b><div class="sub">Isso não substitui os testes funcionais, mas reduz a procura manual por erros de integridade.</div></div>');
}
window.hlgbDiagnosticsRunScan=()=>renderScanTab();

function selected(type,id){
  const el=document.querySelector('[data-dg-select="'+type+'"][value="'+CSS.escape(String(id))+'"]');
  return !el||el.checked;
}
function makeReport(){
  const issues=arr(ISSUE_MODULE).filter(x=>x.status!=='Resolvido'&&selected('issue',x.id));
  const sugs=arr(SUGGESTION_MODULE).filter(x=>!['Concluída','Recusada'].includes(x.status)&&selected('suggestion',x.id));
  let out='HLGB CONFECÇÕES — RELATÓRIO PARA MANUTENÇÃO\n';
  out+='Gerado em: '+new Date().toLocaleString('pt-BR')+'\n';
  out+='Versão observada: '+appVersion()+'\n';
  out+='Navegador: '+browserLabel()+'\n\n';
  out+='ERROS ABERTOS ('+issues.length+')\n';
  issues.forEach((x,i)=>{
    out+='\n'+(i+1)+'. '+sanitize(x.title)+'\n';
    out+='Prioridade: '+sanitize(x.priority)+' | Status: '+sanitize(x.status)+' | Tela: '+sanitize(x.page)+'\n';
    out+='Relatado/capturado por: '+sanitize(x.user)+' | Ocorrências: '+String(x.occurrences||1)+'\n';
    out+='Descrição: '+sanitize(x.description||'-')+'\n';
    if(x.technical)out+='Detalhe técnico: '+sanitize(x.technical)+'\n';
    if(Array.isArray(x.recordRefs)&&x.recordRefs.length)out+='Referências: '+sanitize(x.recordRefs.map(r=>(r.module||r.label||'registro')+':'+(r.id||'')).join(', '))+'\n';
  });
  out+='\n\nSUGESTÕES PENDENTES ('+sugs.length+')\n';
  sugs.forEach((x,i)=>{
    out+='\n'+(i+1)+'. '+sanitize(x.title)+'\n';
    out+='Prioridade: '+sanitize(x.priority)+' | Status: '+sanitize(x.status)+' | Tela: '+sanitize(x.page)+'\n';
    out+='Sugerido por: '+sanitize(x.user)+'\n';
    out+='Descrição: '+sanitize(x.description||'-')+'\n';
  });
  out+='\n\nObservação: relatório sanitizado automaticamente; senhas, tokens e chaves detectáveis são removidos.';
  return out;
}
function renderReportTab(){
  const body=document.getElementById('hlgbDgBody');if(!body)return;
  const report=makeReport();
  body.innerHTML='<div class="panel"><h3 style="margin-top:0">Relatório pronto para enviar ao ChatGPT</h3><div class="sub">O texto inclui erros abertos e sugestões pendentes. Credenciais reconhecíveis são removidas automaticamente.</div><div class="toolbar" style="margin-top:10px"><button class="primary" onclick="hlgbDiagnosticsCopyReport()">📋 Copiar relatório</button><button class="secondary" onclick="hlgbDiagnosticsDownloadReport()">⬇️ Baixar .txt</button></div><textarea id="hlgbDgReportText" class="hlgb-dg-report" readonly>'+esc(report)+'</textarea></div>';
}
window.hlgbDiagnosticsCopyReport=async function(){
  const t=document.getElementById('hlgbDgReportText')?.value||makeReport();
  try{await navigator.clipboard.writeText(t);alert('Relatório copiado. Agora é só colar na conversa de manutenção.')}catch(e){const el=document.getElementById('hlgbDgReportText');if(el){el.select();document.execCommand('copy');alert('Relatório copiado.')}}
};
window.hlgbDiagnosticsDownloadReport=function(){
  const t=document.getElementById('hlgbDgReportText')?.value||makeReport(),blob=new Blob([t],{type:'text/plain;charset=utf-8'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='HLGB-RELATORIO-MANUTENCAO-'+new Date().toISOString().slice(0,10)+'.txt';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);
};

async function createSuggestionText(description,title='Sugestão pelo Assistente HLGB'){
  const desc=sanitize(String(description||'').trim());if(!desc)throw new Error('Sugestão vazia.');
  const row=suggestionBase({title:sanitize(title),description:desc,priority:'Média',page:currentPage(),sourceType:'assistant'});
  return saveDiagnostic(SUGGESTION_MODULE,row);
}
async function createIssueText(description,title='Erro relatado pelo Assistente HLGB'){
  const desc=sanitize(String(description||'').trim());if(!desc)throw new Error('Descrição do erro vazia.');
  const row=issueBase({title:sanitize(title),description:desc,priority:'Média',page:currentPage(),sourceType:'assistant'});
  row.fingerprint=fingerprint(['assistant',row.title,row.page,row.description]);
  return saveDiagnostic(ISSUE_MODULE,row);
}
window.hlgbDiagnosticsCenter={VERSION,sanitize,fingerprint,scanSystem,makeReport,refresh:refreshCenterData,modules:[ISSUE_MODULE,SUGGESTION_MODULE],createSuggestionText,createIssueText};

function boot(){
  if(centerLoaded)return;centerLoaded=true;
  registerModules();injectUI();installErrorCapture();
  try{
    if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(()=>refreshCenterData(false),500);setTimeout(()=>{injectUI();installErrorCapture()},1200)},0);
  }catch(e){}
  if(document.getElementById('appShell')?.style.display==='block')setTimeout(()=>refreshCenterData(false),400);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
console.info('[HLGB] Central de Erros e Melhorias '+VERSION+' carregada');
})();