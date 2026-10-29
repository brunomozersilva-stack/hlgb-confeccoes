/* HLGB v94.26 — Auditor com uma única ação canônica, somente leitura */
(function(){
'use strict';
if(window.HLGB_AUDITOR_SINGLE_ACTION_9426)return;
const V='94.26';
const BUTTON_ID='hlgbAuditorUnifiedRun9426';
const LEGACY_IDS=[
 'hlgbMultiuserOpen','hlgbSmartTest','hlgbSmartProblem','hlgbSmartHistoryBtn','hlgbAuthorityBtn9374','hlgbBootAnalysisBtn9381',
 'hlgbAuditorIntelligenceBtn9396','hlgbAuditorBusinessBtn9401','hlgbDailyReport9368','hlgbAuditorMaxDebug9292','hlgbAuditorBlackbox9299',
 'hlgbAuditFull9315','hlgbAuditCritical9315','hlgbAuditDownloadFull9315','hlgbAuditDownloadCritical9315','hlgbAuditorHubDeep9315'
];
const TOOL_CONTAINERS=['hlgbBootTools9381'];
let running=false,lastRun=null;
const sid=v=>String(v??'');
function auditorRoot(){
 const status=document.getElementById('hlgbSmartStatus');
 return status?.closest?.('[role="dialog"],.modal,.modal-content,.modalCard,.modal-card,.dialog')||status?.parentElement?.parentElement||document.querySelector('.hlgb-auditor-actions')?.parentElement||null;
}
function actionHost(){return auditorRoot()?.querySelector?.('.hlgb-auditor-actions')||document.querySelector('.hlgb-auditor-actions')||null}
function ensureStyle(){
 let st=document.getElementById('hlgbAuditorSingleStyle9426');
 if(!st){st=document.createElement('style');st.id='hlgbAuditorSingleStyle9426';(document.head||document.documentElement).appendChild(st)}
 st.textContent=[
  '.hlgb-auditor-actions>button:not(#'+BUTTON_ID+'){display:none!important;visibility:hidden!important}',
  ...LEGACY_IDS.map(id=>'#'+id+'{display:none!important;visibility:hidden!important}'),
  ...TOOL_CONTAINERS.map(id=>'#'+id+'{display:none!important;visibility:hidden!important}'),
  '#'+BUTTON_ID+'{display:inline-block!important;visibility:visible!important}'
 ].join('');
}
function retireLegacy(){
 for(const id of LEGACY_IDS){const el=document.getElementById(id);if(el&&el.id!==BUTTON_ID)el.remove()}
 for(const id of TOOL_CONTAINERS){const el=document.getElementById(id);if(el)el.remove()}
 try{window.hlgbAuditorHubReliability9315?.stopMaintenance?.()}catch(e){}
}
function visible(el){try{const s=getComputedStyle(el),r=el.getBoundingClientRect();return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}catch(e){return !el.hidden}}
function validate(){
 const host=actionHost(),buttons=host?[...host.querySelectorAll('button')].filter(visible):[],legacyVisible=LEGACY_IDS.filter(id=>{const el=document.getElementById(id);return !!el&&visible(el)}),ids=buttons.map(x=>x.id||sid(x.textContent).trim());
 const shellAuthority=window.HLGB_AUDITOR_SHELL_AUTHORITY==='93.82'&&window.openHlgbAuditor===window.hlgbAuditorShell9382?.open;
 const result={version:V,ok:!!host&&buttons.length===1&&buttons[0]?.id===BUTTON_ID&&legacyVisible.length===0&&shellAuthority,count:buttons.length,ids,legacyVisible,shellAuthority,at:new Date().toISOString()};
 window.HLGB_AUDITOR_SINGLE_ACTION_TEST=result;
 if(!result.ok)console.error('[HLGB Auditor '+V+'] teste de ação única falhou',result);
 return result;
}
function statusOf(x){const s=sid(x?.status||x?.summary?.result||x?.result).toLowerCase();if(/fail|falh|error|erro/.test(s))return 'fail';if(/warn|aten|partial|parcial/.test(s))return 'warn';if(/pass|ok|success|certo|aprov/.test(s))return 'pass';return 'info'}
async function collectDeep(){
 const out={at:new Date().toISOString(),readOnly:true};
 try{out.authority=window.hlgbAuditorAuthority9374?.scan?.()||null}catch(e){out.authority={status:'error',error:sid(e?.message||e)}}
 try{out.boot=window.hlgbAuditorBootAnalysis9381?.analyze?.()||null}catch(e){out.boot={status:'error',error:sid(e?.message||e)}}
 try{out.intelligence=await window.hlgbAuditorIntelligence9396?.collect?.({saveBaseline:false})||null}catch(e){out.intelligence={status:'error',error:sid(e?.message||e)}}
 try{
  const business=window.hlgbAuditorBusiness9401;
  if(typeof business?.collect==='function')out.business=await business.collect({readOnly:true});
  else if(typeof business?.analyze==='function')out.business=await business.analyze();
  else out.business=null;
 }catch(e){out.business={status:'error',error:sid(e?.message||e)}}
 return out;
}
function renderUnifiedMeta(deep){
 const host=document.getElementById('hlgbAuditorResult');if(!host)return;
 document.getElementById('hlgbAuditorUnifiedMeta9426')?.remove();
 const box=document.createElement('div');box.id='hlgbAuditorUnifiedMeta9426';box.className='panel';box.style.cssText='margin:10px 0;border:1px solid #d8d0dc;background:#fbf9fc';
 const items=[['Arquitetura',deep?.authority],['Boot / cargas',deep?.boot],['Inteligência',deep?.intelligence],['Expansão',deep?.business]].filter(x=>x[1]);
 const rows=items.map(([name,data])=>{const st=statusOf(data),icon=st==='fail'?'🔴':st==='warn'?'🟡':st==='pass'?'✅':'⚪';return '<div class="sub">'+icon+' <b>'+name+'</b> · '+(st==='info'?'coletado':st)+'</div>'}).join('');
 box.innerHTML='<h3 style="margin-top:0">Auditoria única · v'+V+'</h3><div class="sub">As verificações complementares foram coletadas em modo somente leitura, sem criar botões separados.</div>'+rows;
 host.prepend(box);
}
async function runUnified(){
 if(running)return false;running=true;
 const btn=document.getElementById(BUTTON_ID),old=btn?.textContent||'🧪 Auditar sistema';if(btn){btn.disabled=true;btn.textContent='🧪 Auditando…'}
 try{
  let main=null;
  if(typeof window.hlgbAuditorSmartRun==='function')main=await Promise.resolve(window.hlgbAuditorSmartRun());
  else if(typeof window.hlgbAuditorRunFull==='function')main=await Promise.resolve(window.hlgbAuditorRunFull());
  else throw new Error('Rotina principal do Auditor não está disponível.');
  const deep=await collectDeep();lastRun={version:V,at:new Date().toISOString(),main,deep,ui:validate()};window.HLGB_AUDITOR_SINGLE_ACTION_LAST=lastRun;renderUnifiedMeta(deep);return lastRun;
 }catch(e){console.error('[HLGB Auditor '+V+'] auditoria única',e);const host=document.getElementById('hlgbAuditorResult');if(host)host.insertAdjacentHTML('afterbegin','<div class="panel bad"><b>Falha ao executar a auditoria única.</b><div class="sub">'+sid(e?.message||e).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))+'</div></div>');return false}
 finally{running=false;if(btn){btn.disabled=false;btn.textContent=old}scheduleCanonicalize()}
}
function canonicalize(){
 ensureStyle();retireLegacy();const host=actionHost();if(!host)return false;
 [...host.querySelectorAll('button')].forEach(b=>{if(b.id!==BUTTON_ID)b.remove()});
 let btn=document.getElementById(BUTTON_ID);if(!btn){btn=document.createElement('button');btn.id=BUTTON_ID;btn.type='button';btn.className='primary';host.prepend(btn)}
 btn.textContent=running?'🧪 Auditando…':'🧪 Auditar sistema';btn.disabled=running;btn.onclick=runUnified;btn.hidden=false;btn.style.removeProperty('display');btn.style.removeProperty('visibility');
 validate();return true;
}
function scheduleCanonicalize(){[0,60,180,420,900,1800,3500,7000].forEach(ms=>setTimeout(canonicalize,ms))}
function patchOpenModal(){
 const f=window.openModal;if(typeof f!=='function'||f.__hlgbAuditorSingle9426)return false;
 const w=function(title){const r=f.apply(this,arguments);if(/auditor|testador hlgb/i.test(sid(title)))scheduleCanonicalize();return r};w.__hlgbAuditorSingle9426=true;w.__original=f;window.openModal=w;return true;
}
function stamp(){try{if((Number(window.HLGB_RELEASE_VERSION)||0)<94.26)window.HLGB_RELEASE_VERSION='94.26'}catch(e){}window.HLGB_AUDITOR_RELEASE_VERSION=V}
function install(){ensureStyle();patchOpenModal();retireLegacy();if(actionHost())canonicalize();stamp();return true}
function boot(){install();[100,350,900,1800,3500,7000,12000].forEach(ms=>setTimeout(()=>{install();if(actionHost())validate()},ms))}
window.HLGB_AUDITOR_SINGLE_ACTION_9426=V;
window.hlgbAuditorSingleAction9426={version:V,install,canonicalize,validate,run:runUnified,collectDeep,get last(){return lastRun}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
try{if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>setTimeout(boot,200),0)}catch(e){}
window.addEventListener?.('pageshow',()=>setTimeout(install,50));
console.info('[HLGB] Auditor v'+V+' com uma única ação canônica ativo');
})();
