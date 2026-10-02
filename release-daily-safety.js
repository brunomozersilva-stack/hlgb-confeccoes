/* HLGB — Segurança diária: auditoria sistêmica + backup local + pacote para suporte */
(function(){
'use strict';
const V='2026.10.02-daily-safety-v1';
const DB_NAME='hlgb_daily_safety_backups_v1', STORE='backups', KEEP=14;
const KEY_LAST='hlgb_daily_safety_last_v1', KEY_PENDING='hlgb_daily_safety_pending_v1';
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){return JSON.parse(JSON.stringify(v))}};
const day=()=>new Date().toISOString().slice(0,10);
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function isAdmin(){
  try{
    const u=typeof currentUser==='function'?currentUser():null;
    const role=[u?.role,u?.name,u?.login].filter(Boolean).join(' ').toLowerCase();
    if(/administrador|propriet[aá]rio|admin/.test(role))return true;
    const shell=sid(document.querySelector('#appShell')?.textContent).slice(0,700).toLowerCase();
    return /administrador|propriet[aá]rio/.test(shell);
  }catch(e){return false}
}
function userBusy(){
  try{
    if(document.querySelector('#modal.show'))return true;
    const e=document.activeElement,t=sid(e?.tagName).toUpperCase();
    if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||e?.isContentEditable)return true;
    if(typeof cloudUserIsEditing==='function'&&cloudUserIsEditing())return true;
  }catch(e){}
  return false;
}
function openDb(){
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB_NAME,1);
    r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'date'})};
    r.onsuccess=()=>resolve(r.result);
    r.onerror=()=>reject(r.error||new Error('Falha ao abrir backup local'));
  });
}
function sanitizeData(){
  const src=clone(window.db||{}),out={},secret=/token|password|senha|secret|authorization|apikey|api_key|jwt|session/i;
  for(const [k,v] of Object.entries(src)){
    if(secret.test(k)||k==='systemAuditRuns')continue;
    out[k]=v;
  }
  return out;
}
async function listBackups(existingDb){
  let d=existingDb,own=false;
  if(!d){d=await openDb();own=true}
  const rows=await new Promise((resolve,reject)=>{
    const tx=d.transaction(STORE,'readonly'),r=tx.objectStore(STORE).getAll();
    r.onsuccess=()=>resolve((r.result||[]).sort((a,b)=>sid(b.date).localeCompare(sid(a.date))));
    r.onerror=()=>reject(r.error);
  });
  if(own)d.close();
  return rows;
}
async function createBackup(){
  if(typeof indexedDB==='undefined')throw new Error('IndexedDB indisponível neste navegador.');
  const d=await openDb(),row={
    date:day(),createdAt:new Date().toISOString(),
    appVersion:sid(window.HLGB_RELEASE_VERSION||''),
    browser:sid(navigator.userAgent||''),
    data:sanitizeData()
  };
  await new Promise((resolve,reject)=>{
    const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).put(row);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
  const all=await listBackups(d),old=all.slice(KEEP);
  if(old.length)await new Promise(resolve=>{
    const tx=d.transaction(STORE,'readwrite'),st=tx.objectStore(STORE);
    old.forEach(x=>st.delete(x.date));
    tx.oncomplete=resolve;tx.onerror=resolve;tx.onabort=resolve;
  });
  d.close();
  return row;
}
async function getTodayBackup(){
  const a=await listBackups();return a.find(x=>x.date===day())||null;
}
function downloadJson(name,data){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{try{URL.revokeObjectURL(a.href)}catch(e){}a.remove()},1000);
}
async function exportBackup(){
  const row=await getTodayBackup()||await createBackup();
  downloadJson('HLGB-BACKUP-'+row.date+'.json',{kind:'hlgb_backup',backupVersion:V,...row});
  return row;
}
async function runDailyAudit(){
  if(!window.hlgbInternalAuditor?.runVisualSweep)throw new Error('Auditor visual completo ainda não está disponível.');
  const audit=await window.hlgbInternalAuditor.runVisualSweep(true);
  const sync=window.hlgbInternalAuditor.buildSyncDiagnostic?await window.hlgbInternalAuditor.buildSyncDiagnostic():null;
  const backup=await getTodayBackup()||await createBackup();
  const summary={
    date:day(),completedAt:new Date().toISOString(),
    appVersion:sid(window.HLGB_RELEASE_VERSION||audit?.appVersion||''),
    browser:audit?.browser||'',
    auditId:audit?.id||null,
    result:audit?.summary?.result||'',
    pass:Number(audit?.summary?.pass||0),
    warn:Number(audit?.summary?.warn||0),
    fail:Number(audit?.summary?.fail||0),
    pagesChecked:Array.isArray(audit?.visualSweep)?audit.visualSweep.length:0,
    pendingSync:Number(sync?.summary?.normalizedPending||0),
    backupCreatedAt:backup?.createdAt||null
  };
  localStorage.setItem(KEY_LAST,JSON.stringify(summary));
  localStorage.removeItem(KEY_PENDING);
  renderStatus(summary);
  if(summary.fail>0||summary.warn>0)showAlert(summary);
  return {audit,sync,backupMeta:{date:backup.date,createdAt:backup.createdAt,appVersion:backup.appVersion},summary};
}
async function buildSupportPackage(){
  const audit=window.hlgbInternalAuditor?.latest?.()||null;
  const sync=window.hlgbInternalAuditor?.buildSyncDiagnostic?await window.hlgbInternalAuditor.buildSyncDiagnostic():null;
  const backup=await getTodayBackup()||await createBackup();
  const last=readLast();
  const pkg={
    kind:'hlgb_daily_support_package',
    packageVersion:V,
    generatedAt:new Date().toISOString(),
    appVersion:sid(window.HLGB_RELEASE_VERSION||''),
    dailySummary:last,
    audit,
    sync,
    backupMeta:{date:backup.date,createdAt:backup.createdAt,appVersion:backup.appVersion},
    instructions:'Enviar este arquivo ao ChatGPT para análise do HLGB. Não contém senha/token e não inclui o conteúdo completo do backup.'
  };
  downloadJson('HLGB-PACOTE-DIARIO-'+day()+'.json',pkg);
  return pkg;
}
function readLast(){try{return JSON.parse(localStorage.getItem(KEY_LAST)||'null')}catch(e){return null}}
function renderStatus(summary=readLast()){
  let box=document.getElementById('hlgbDailySafetyStatus');
  if(!box){
    const target=document.getElementById('config')||document.getElementById('dashboard');if(!target)return;
    box=document.createElement('div');box.id='hlgbDailySafetyStatus';box.className='panel';target.appendChild(box);
  }
  const ok=summary&&summary.date===day();
  box.innerHTML='<h3 style="margin-top:0">🛡️ Segurança diária HLGB</h3>'+
    (ok?'<div class="cards"><div class="card"><small>Última varredura</small><strong>'+escSafe(summary.date)+'</strong></div><div class="card"><small>Resultado</small><strong>'+escSafe(summary.result||'-')+'</strong></div><div class="card"><small>Telas verificadas</small><strong>'+Number(summary.pagesChecked||0)+'</strong></div><div class="card"><small>Atenções / Falhas</small><strong>'+Number(summary.warn||0)+' / '+Number(summary.fail||0)+'</strong></div></div>':'<div class="sub">A varredura diária ainda não foi concluída hoje.</div>')+
    '<div class="toolbar" style="margin-top:10px"><button class="primary" onclick="hlgbDailySafetyRunNow()">🛡️ Rodar varredura agora</button><button class="secondary" onclick="hlgbDailySafetyPackage()">📦 Baixar pacote diário</button><button class="secondary" onclick="hlgbDailySafetyBackup()">💾 Baixar backup de hoje</button></div>'+
    '<div class="sub">O backup automático fica guardado localmente neste navegador por até '+KEEP+' dias. O pacote diário contém diagnóstico e metadados do backup, sem senha ou token.</div>';
}
function showAlert(summary){
  if(document.getElementById('hlgbDailySafetyAlert'))return;
  const d=document.createElement('div');d.id='hlgbDailySafetyAlert';
  d.style.cssText='position:fixed;right:18px;top:78px;z-index:10001;max-width:390px;background:#fff4e5;border:1px solid #e0a43a;border-radius:12px;padding:14px;box-shadow:0 12px 30px #0003';
  d.innerHTML='<b>⚠️ HLGB encontrou '+(summary.fail?'falha(s)':'atenção(ões)')+' na varredura diária</b><div style="font-size:12px;margin:7px 0">Atenções: '+summary.warn+' · Falhas: '+summary.fail+' · Telas: '+summary.pagesChecked+'</div><button class="primary" onclick="hlgbDailySafetyPackage()">📦 Preparar arquivo para enviar ao ChatGPT</button> <button class="secondary" onclick="this.parentElement.remove()">Fechar</button>';
  document.body.appendChild(d);
}
async function ensureToday(){
  if(!isAdmin())return;
  try{if(!await getTodayBackup())await createBackup()}catch(e){console.warn('[HLGB Daily Safety] backup',e)}
  const last=readLast();if(last?.date===day())return renderStatus(last);
  localStorage.setItem(KEY_PENDING,day());
  scheduleWhenIdle();
}
let idleTimer=null,tries=0;
function scheduleWhenIdle(){
  if(idleTimer)clearTimeout(idleTimer);
  idleTimer=setTimeout(async()=>{
    if(!isAdmin())return;
    if(userBusy()&&tries<20){tries++;return scheduleWhenIdle()}
    tries=0;
    try{await runDailyAudit()}catch(e){console.warn('[HLGB Daily Safety] auditoria',e)}
  },5000);
}
window.hlgbDailySafetyRunNow=async function(){
  if(userBusy()&&!confirm('Há um campo/modal em uso. Rodar a varredura visual agora pode trocar de tela por alguns segundos. Continuar?'))return;
  try{await createBackup();await runDailyAudit();alert('Varredura diária concluída.')}catch(e){alert('Não foi possível concluir a varredura diária.\n\n'+sid(e?.message||e))}
};
window.hlgbDailySafetyPackage=async function(){try{await buildSupportPackage()}catch(e){alert('Não foi possível preparar o pacote diário.\n\n'+sid(e?.message||e))}};
window.hlgbDailySafetyBackup=async function(){try{await exportBackup()}catch(e){alert('Não foi possível baixar o backup.\n\n'+sid(e?.message||e))}};
window.hlgbDailySafety={VERSION:V,createBackup,getTodayBackup,listBackups,runDailyAudit,buildSupportPackage,ensureToday};
function boot(){renderStatus();setTimeout(ensureToday,2500)}
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,800),0);else setTimeout(boot,2500);
console.info('[HLGB] segurança diária '+V+' carregada');
})();