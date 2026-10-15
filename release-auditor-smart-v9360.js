/* HLGB v93.60 — Auditor simplificado e passivo */
(function(){
'use strict';
if(window.HLGB_AUDITOR_SMART_9360)return;
window.HLGB_AUDITOR_SMART_9360=true;
const V='93.60',HISTORY='hlgb_auditor_smart_history_v9360',DAILY='hlgb_auditor_daily_v9360:';
let busy=false,events=[];
const now=()=>new Date().toISOString();
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function page(){return document.querySelector('.page.active')?.id||''}
function user(){try{const u=typeof currentUser==='function'?currentUser():null;return String(u?.name||u?.login||u?.id||'usuario')}catch(e){return 'usuario'}}
function today(){const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
function push(type,data={}){events.push({at:now(),ts:Date.now(),type,page:page(),...data});events=events.filter(x=>Date.now()-x.ts<=120000).slice(-240)}
function hist(){try{const x=JSON.parse(localStorage.getItem(HISTORY)||'[]');return Array.isArray(x)?x:[]}catch(e){return []}}
function saveHist(x){try{const a=hist();a.unshift(x);localStorage.setItem(HISTORY,JSON.stringify(a.slice(0,60)))}catch(e){}}
function status(){const h=hist().find(x=>x.type==='audit');if(!h)return '<b>Status:</b> ainda sem teste nesta versão.';const f=+h.fail||0,w=+h.warn||0,s=f?'Falha':w?'Atenção':'Tudo certo';return '<b>Status do sistema: '+esc(s)+'</b><div class="sub">Último teste: '+esc(String(h.at||'').replace('T',' ').slice(0,16))+' · '+(+h.pass||0)+' aprovados · '+w+' atenções · '+f+' falhas</div>'}
async function run(source='manual'){
 if(busy)return null;busy=true;push('audit-start',{source});
 try{
  let row;
  if(typeof window.hlgbAuditorRunVisualSweep==='function')row=await window.hlgbAuditorRunVisualSweep();
  else if(typeof window.hlgbInternalAuditor?.runVisualSweep==='function')row=await window.hlgbInternalAuditor.runVisualSweep(true);
  else throw new Error('Auditor interno não carregado.');
  const h={type:'audit',source,at:row?.completedAt||now(),result:row?.summary?.result||'Concluído',pass:+row?.summary?.pass||0,warn:+row?.summary?.warn||0,fail:+row?.summary?.fail||0,version:String(window.HLGB_RELEASE_VERSION||'')};
  saveHist(h);push('audit-finish',h);return row;
 }catch(e){push('audit-error',{source,message:String(e?.message||e)});throw e}finally{busy=false}
}
function runtime(){const o={};for(const [k,v] of Object.entries({payrollRace:window.hlgbPayrollWalRace9346,payrollReliable:window.hlgbPayrollReliableSaveGuard9344,walAuthority:window.hlgbWalSingleAuthority9339,replay:window.hlgbConfirmedReplay9333,syncGuard:window.hlgbSyncGuard9306})){try{o[k]=typeof v?.status==='function'?v.status():{version:v?.version||v?.VERSION||''}}catch(e){o[k]={error:String(e?.message||e)}}}return o}
async function problem(){
 push('problem-capture');let sync=null;try{sync=await window.hlgbInternalAuditor?.buildSyncDiagnostic?.()}catch(e){sync={error:String(e?.message||e)}}
 const data={kind:'hlgb_bug_capture',captureVersion:V,createdAt:now(),appVersion:String(window.HLGB_RELEASE_VERSION||''),page:page(),online:navigator.onLine,events:[...events],runtimeErrors:[...(window.hlgbInternalAuditor?.runtimeErrors||[])].slice(-40),runtime:runtime(),latestAudit:window.hlgbInternalAuditor?.latest?.()||null,sync};
 try{const safe=window.hlgbInternalAuditor?.redactDiagnostic?window.hlgbInternalAuditor.redactDiagnostic(data):data,blob=new Blob([JSON.stringify(safe,null,2)],{type:'application/json;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='HLGB-PROBLEMA-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800)}catch(e){}
 saveHist({type:'problem',at:now(),page:page(),result:'Problema registrado'});alert('Problema registrado. O pacote técnico foi preparado para análise.');return data;
}
function historyHtml(){const a=hist().slice(0,20);return a.length?a.map(x=>'<div class="panel" style="margin:7px 0"><b>'+esc(x.type==='problem'?'Problema registrado':'Auditoria completa')+'</b><div class="sub">'+esc(String(x.at||'').replace('T',' ').slice(0,16))+(x.type==='audit'?' · '+esc(x.result||'')+' · '+(+x.warn||0)+' atenções · '+(+x.fail||0)+' falhas':' · '+esc(x.page||''))+'</div></div>').join(''):'<div class="empty">Nenhum registro ainda.</div>'}
function toggleHistory(){const b=document.getElementById('hlgbSmartHistory');if(!b)return;b.style.display=b.style.display==='none'?'block':'none';b.innerHTML=historyHtml()}
function openSmart(){const body='<div class="sub">Auditoria automática e somente de leitura. Menos botões, mais diagnóstico por trás.</div><div class="panel" id="hlgbSmartStatus" style="margin-top:12px">'+status()+'</div><div class="hlgb-auditor-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0"><button class="primary" type="button" onclick="hlgbAuditorSmartRun()">🧪 Testar sistema</button><button class="secondary" type="button" onclick="hlgbAuditorSmartProblem()">🛠️ Registrar problema</button><button class="secondary" type="button" onclick="hlgbAuditorSmartHistory()">🕘 Histórico</button></div><div id="hlgbAuditorResult"></div><div id="hlgbSmartHistory" style="display:none"></div><button type="button" class="secondary modalSave">Fechar</button>';if(typeof openModal==='function')openModal('Auditor HLGB',body,()=>closeModal())}
async function daily(){try{const k=DAILY+user().toLowerCase(),d=today();if(localStorage.getItem(k)===d)return;localStorage.setItem(k,d);push('daily-scheduled');await new Promise(r=>setTimeout(r,1800));await run('first-access-daily')}catch(e){push('daily-error',{message:String(e?.message||e)})}}
function boot(){
 window.addEventListener('error',e=>push('js-error',{message:e?.message||'Erro JavaScript'}),true);
 window.addEventListener('unhandledrejection',e=>push('promise-error',{message:e?.reason?.message||String(e?.reason||'Promise rejeitada')}),true);
 document.addEventListener('click',e=>{const t=e.target?.closest?.('button,a,[role="button"]');if(t)push('ui-action',{text:String(t.textContent||'').trim().replace(/\s+/g,' ').slice(0,100),id:t.id||''})},true);
 window.openHlgbAuditor=openSmart;
 window.hlgbAuditorSmartRun=async()=>{const out=document.getElementById('hlgbAuditorResult');if(out)out.innerHTML='<div class="panel"><b>Executando auditoria completa…</b><div class="sub">Nenhum dado operacional será alterado.</div></div>';try{const row=await run('manual');if(out)out.innerHTML='<div class="panel">'+status()+'</div>';const s=document.getElementById('hlgbSmartStatus');if(s)s.innerHTML=status();return row}catch(e){if(out)out.innerHTML='<div class="panel"><b>Falha no teste.</b><div class="sub">'+esc(e?.message||e)+'</div></div>'}};
 window.hlgbAuditorSmartProblem=problem;window.hlgbAuditorSmartHistory=toggleHistory;window.hlgbAuditorSmart={version:V,run,problem,hist,push};
 try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(daily,1400),0);else setTimeout(daily,3000)}catch(e){setTimeout(daily,3000)}
 console.info('[HLGB] Auditor simplificado v'+V+' ativo');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
