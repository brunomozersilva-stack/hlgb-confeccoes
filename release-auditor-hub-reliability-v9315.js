/* HLGB v93.15 — auditor coerente + exclusão robusta do Hub */
(function(){
'use strict';
const V='93.15',sid=v=>String(v??''),clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}},wait=ms=>new Promise(r=>setTimeout(r,ms));
function norm(v){return sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()}
function openIssues(){
 try{return (Array.isArray(db?.systemIssues)?db.systemIssues:[]).filter(x=>norm(x?.status)!=='resolvido')}catch(e){return []}
}
function seriousIssues(){return openIssues().filter(x=>['alta','critica'].includes(norm(x?.priority)))}
function auditorBox(){return document.getElementById('hlgbAuditorResult')}
function reconcileAuditorSummary(){
 const box=auditorBox();if(!box)return;
 const open=openIssues(),serious=seriousIssues();
 let banner=[...box.querySelectorAll('div')].find(el=>/nenhum problema relevante detectado/i.test(el.textContent||''));
 if(serious.length&&banner){
  banner.style.background='#fff6dc';banner.style.borderColor='#e3b342';
  const head=banner.querySelector('b,strong')||banner;
  if(head===banner)banner.innerHTML=`<b>⚠️ Atenção: ${serious.length} erro(s) de alta/crítica prioridade aberto(s) na Central</b><div class="sub">A auditoria atual não encontrou falha nova, mas existem ocorrências abertas que ainda precisam de revisão. Total aberto: ${open.length}.</div>`;
  else head.textContent=`⚠️ Atenção: ${serious.length} erro(s) de alta/crítica prioridade aberto(s) na Central`;
 }
 const resultCards=[...box.querySelectorAll('.card')];
 const result=resultCards.find(c=>/^resultado$/i.test(c.querySelector('small')?.textContent?.trim()||''));
 if(result&&serious.length){const s=result.querySelector('strong');if(s)s.textContent='Atenção'}
 let existing=document.getElementById('hlgbAuditIssueTruth9315');
 if(existing)existing.remove();
 const d=document.createElement('div');d.id='hlgbAuditIssueTruth9315';d.className='panel';d.style.marginTop='10px';
 d.innerHTML=`<h3 style="margin-top:0">📌 Central de erros</h3><div class="sub">${open.length?`${open.length} ocorrência(s) aberta(s); ${serious.length} de prioridade alta/crítica. Esses registros podem incluir ocorrências antigas e não significam que todas estejam acontecendo agora.`:'Nenhuma ocorrência aberta na Central.'}</div>`;
 box.appendChild(d);
}
function addAuditorButtons(){
 const box=auditorBox();if(!box)return false;
 const root=box.closest('.modal,.overlay,.panel')||box.parentElement;if(!root)return false;
 const buttons=[...root.querySelectorAll('button')];
 if(!root.querySelector('#hlgbAuditFull9315')){
  const anchor=buttons[0]||box;
  const b=document.createElement('button');b.id='hlgbAuditFull9315';b.type='button';b.className='primary';b.textContent='✅ Auditoria completa';
  b.onclick=async()=>{b.disabled=true;const old=b.textContent;b.textContent='⏳ Auditando…';try{if(typeof window.hlgbAuditorRunFull==='function')await window.hlgbAuditorRunFull();else throw new Error('Auditoria completa indisponível.');reconcileAuditorSummary()}catch(e){alert(String(e?.message||e))}finally{b.disabled=false;b.textContent=old}};
  anchor.parentElement?.insertBefore(b,anchor);
 }
 if(!root.querySelector('#hlgbAuditCritical9315')){
  const anchor=root.querySelector('#hlgbAuditFull9315');
  const b=document.createElement('button');b.id='hlgbAuditCritical9315';b.type='button';b.className='primary';b.textContent='🧪 Teste crítico local';
  b.onclick=async()=>{b.disabled=true;const old=b.textContent;b.textContent='⏳ Testando…';try{if(typeof window.hlgbAuditorRunFull==='function')await window.hlgbAuditorRunFull();const op=window.hlgbOperationalAuditor9314?.run?.();reconcileAuditorSummary();if(op?.summary?.fail)alert(`Teste crítico encontrou ${op.summary.fail} falha(s). Veja Saúde operacional.`)}catch(e){alert(String(e?.message||e))}finally{b.disabled=false;b.textContent=old}};
  anchor?.parentElement?.insertBefore(b,anchor.nextSibling);
 }
 reconcileAuditorSummary();return true;
}
async function cloudTombstone(id){
 try{
  const s=window.hlgbRecordSnapshots?.hubFinanceEntries?.get?.(sid(id));if(s?.deleted_at)return true;
 }catch(e){}
 if(typeof window.cloudRequest!=='function'||!window.cloudAccessToken)return false;
 try{
  const rows=await window.cloudRequest('hlgb_records?select=deleted_at,revision&module=eq.hubFinanceEntries&entity_id=eq.'+encodeURIComponent(sid(id))+'&limit=1',{method:'GET'});
  return !!(Array.isArray(rows)&&rows[0]?.deleted_at);
 }catch(e){return false}
}
async function robustDeleteHub(id){
 const list=Array.isArray(db?.hubFinanceEntries)?db.hubFinanceEntries:[],row=list.find(x=>sid(x?.id??x?.__hlgbId)===sid(id));
 if(!row)return false;if(!confirm('Excluir este lançamento do Hub Financeiro?'))return false;
 const payload={...clone(row),__hlgb_explicit_delete:true,updatedAt:new Date().toISOString()};
 try{
  if(typeof window.cloudEnsureFreshSession==='function')await window.cloudEnsureFreshSession(false);
  if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação multiusuário indisponível.');
  const out=await window.hlgbRecordSaveWithRetry('hubFinanceEntries',sid(id),payload,true);
  let confirmed=!!(out?.applied===true&&out?.deleted_at);
  if(!confirmed&&out?.applied===true){for(let i=0;i<3&&!confirmed;i++){await wait(350*(i+1));confirmed=await cloudTombstone(id)}}
  if(!confirmed)throw new Error('A nuvem não confirmou a exclusão do lançamento.');
  db.hubFinanceEntries=list.filter(x=>sid(x?.id??x?.__hlgbId)!==sid(id));
  try{localSaveOnly?.()}catch(e){};try{window.hlgbHubPurgeTombstones?.()}catch(e){};try{window.renderHubFinance?.()}catch(e){};try{setCloudStatus('✅ Lançamento excluído e confirmado na nuvem','ok')}catch(e){};
  return true;
 }catch(e){console.error('[HLGB v'+V+'] exclusão Hub',e);alert('A exclusão não foi confirmada na nuvem. O lançamento foi mantido.\n\n'+String(e?.message||e));try{window.renderHubFinance?.()}catch(_){}return false}
}
function installHubDelete(){
 const old=window.deleteHubFinanceEntry;if(typeof old!=='function'||old.__hlgb9315)return false;
 robustDeleteHub.__hlgb9315=true;robustDeleteHub.__original=old;window.deleteHubFinanceEntry=robustDeleteHub;return true;
}
function wrapAudit(name){const f=window[name];if(typeof f!=='function'||f.__hlgb9315)return;const w=async function(){const r=await f.apply(this,arguments);setTimeout(()=>{addAuditorButtons();reconcileAuditorSummary()},30);return r};w.__hlgb9315=true;w.__original=f;window[name]=w}
function install(){installHubDelete();wrapAudit('hlgbAuditorRunFull');wrapAudit('hlgbAuditorRunVisualSweep');addAuditorButtons()}
window.hlgbAuditorHubReliability9315={version:V,install,openIssues,seriousIssues,cloudTombstone,robustDeleteHub,reconcileAuditorSummary};
if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>{setTimeout(install,500);setInterval(install,2500)},0);else{setTimeout(install,1200);setInterval(install,2500)}
})();
