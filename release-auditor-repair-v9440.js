/* HLGB v94.40 — Auditor Reparador: audita, corrige somente falhas técnicas comprovadamente seguras e retesta.
   Carregado sob demanda após autenticação. Não grava dados de negócio, não apaga WAL/pendências sem prova e não repara órfãos de negócio por suposição. */
(function(){
'use strict';
const V='94.40',MAX_PASSES=3,CARD_ID='hlgbAuditorRepair9440Card';
if(window.HLGB_AUDITOR_REPAIR_9440===V)return;
window.HLGB_AUDITOR_REPAIR_9440=V;
const state={version:V,running:false,runs:0,passes:0,technicalRepairs:0,diagnosticsResolved:0,blocked:0,lastAt:'',lastError:'',lastSummary:null};
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const ts=v=>{const n=Date.parse(String(v||''));return Number.isFinite(n)?n:NaN};
function authReady(){return window.__HLGB_AUTH_READY===true}
function issues(){try{const a=window.hlgbDiagnostics?.getIssues?.();return Array.isArray(a)?a:[]}catch(e){return []}}
function openIssue(x){return !/resolvid|closed|fechad/i.test(sid(x?.status))}
function issueAt(x){return ts(x?.lastSeen||x?.updatedAt||x?.updated_at||x?.createdAt||x?.firstSeen)}
function technicalIssue(x){const t=[x?.title,x?.detail,x?.source,x?.category].map(sid).join(' ');if(/erro javascript em runtime|financeiro sem projeção|finance-projection-orphan/i.test(t))return false;return /falha ao salvar|conflito protegido|sincron|\bsync\b|\bwal\b|\back\b|load failed|failed to fetch|network|timeout/i.test(t)}
function currentMetrics(out){
 try{const m=window.hlgbAuditorIntelligence9396?.currentMetrics?.()?.metrics;if(m)return m}catch(e){}
 return out?.daily?.intelligence?.metrics||out?.deep?.current?.metrics||out?.intelligence?.metrics||{};
}
function cleanTechnicalState(out){
 const m=currentMetrics(out),op=out?.daily?.operations||out?.operations||{};
 const pending=+(m.pendingUnique??op?.pending?.unique??0)||0;
 const dup=+(m.scriptDuplicates??0)||0;
 const saveDup=+(m.saveDuplicateResponsibilities??0)||0;
 const delivery=sid(op?.delivery?.status||'pass').toLowerCase(),saving=sid(op?.savingUi?.status||'pass').toLowerCase();
 return pending===0&&dup===0&&saveDup===0&&delivery!=='fail'&&saving!=='fail';
}
function findOrphans(root){
 const out=[],seen=new Set();
 function walk(v){if(!v||typeof v!=='object'||seen.has(v))return;seen.add(v);if(v.code==='data:finance-projection-orphan'||v.code==='finance-projection-orphan'){out.push({code:v.code,detail:sid(v.detail),refs:clone(v.refs||[])})}if(Array.isArray(v)){for(const x of v)walk(x)}else for(const x of Object.values(v))walk(x)}
 walk(root);const uniq=[];const keys=new Set();for(const x of out){const k=JSON.stringify(x.refs)||x.detail;if(!keys.has(k)){keys.add(k);uniq.push(x)}}return uniq;
}
function uiSnapshot(){const p=document.querySelector('#appShell .page.active,.page.active'),a=document.activeElement;return {page:p?.id||'',x:window.scrollX||0,y:window.scrollY||0,top:p?.scrollTop||0,left:p?.scrollLeft||0,focus:a&&a!==document.body?a:null}}
function restoreUi(s){if(!s)return;try{if(s.page){const target=document.getElementById(s.page);if(target){document.querySelectorAll('#appShell .page.active,.page.active').forEach(x=>x.classList.remove('active'));target.classList.add('active')}}}catch(e){}try{window.scrollTo(s.x,s.y)}catch(e){}try{const p=document.getElementById(s.page);if(p){p.scrollTop=s.top;p.scrollLeft=s.left}}catch(e){}try{if(s.focus?.isConnected)s.focus.focus({preventScroll:true})}catch(e){}}
async function callSafe(name,fn){try{const r=await fn();return {name,ok:r!==false,result:r}}catch(e){return {name,ok:false,error:sid(e?.message||e)}}}
async function healTechnical(){
 const rows=[];
 if(window.hlgbAckReconcile9436?.install)rows.push(await callSafe('ack-reconcile',()=>window.hlgbAckReconcile9436.install()));
 if(window.hlgbProductionReconcile9439?.reconcile)rows.push(await callSafe('production-reconcile',()=>window.hlgbProductionReconcile9439.reconcile('auditor-repair-v9440')));
 if(window.hlgbAuditorRapid9437?.heal)rows.push(await callSafe('rapid-heal',()=>window.hlgbAuditorRapid9437.heal()));
 if(window.hlgbAuditorFinalize9439?.install)rows.push(await callSafe('auditor-finalizer',()=>window.hlgbAuditorFinalize9439.install()));
 if(window.hlgbAuditorFinalize9439?.patchStored)rows.push(await callSafe('report-finalize',()=>window.hlgbAuditorFinalize9439.patchStored()));
 return rows;
}
function resolveStaleDiagnostics(startMs,out){
 if(!cleanTechnicalState(out)||typeof window.hlgbDiagnostics?.resolveIssue!=='function')return [];
 const resolved=[];
 for(const x of issues()){
  if(!openIssue(x)||!technicalIssue(x))continue;
  const at=issueAt(x);if(!Number.isFinite(at)||at>=startMs)continue;
  try{const r=window.hlgbDiagnostics.resolveIssue(x.id,true);if(r!==false)resolved.push({id:x.id,title:sid(x.title),lastSeen:x.lastSeen||x.updatedAt||''})}catch(e){}
 }
 return resolved;
}
function render(summary){
 const host=document.getElementById('hlgbAuditorResult');if(!host)return false;
 let c=document.getElementById(CARD_ID);if(!c){c=document.createElement('div');c.id=CARD_ID;c.className='panel';host.prepend(c)}
 const blocked=summary?.blocked?.length||0,fixed=summary?.fixed||0,passes=summary?.passes||0;
 c.style.cssText='margin:8px 0;border:1px solid #cdd7cf;background:#fbfffb';
 c.innerHTML='<b>🛠️ Auditor Reparador v94.40</b><div class="sub">'+passes+' rodada(s) · '+fixed+' reparo(s) seguro(s) concluído(s) · '+blocked+' item(ns) bloqueado(s) por exigir decisão de negócio.</div>'+(blocked?'<div class="sub" style="margin-top:6px">Os vínculos Financeiro→Projeção sem fonte histórica não foram alterados automaticamente.</div>':'');return true;
}
async function run(){
 if(state.running||!authReady())return false;
 const api=window.hlgbAuditorSingleAction9429;if(typeof api?.run!=='function')throw new Error('Auditor principal indisponível');
 state.running=true;state.runs++;state.lastAt=new Date().toISOString();const ui=uiSnapshot(),started=Date.now();let last=null,totalResolved=[],healRows=[],passes=0;
 try{
  for(let pass=1;pass<=MAX_PASSES;pass++){
   passes=pass;state.passes++;last=await api.run();
   const before=totalResolved.length;
   if(pass===1||!cleanTechnicalState(last)){const h=await healTechnical();healRows.push(...h);state.technicalRepairs+=h.filter(x=>x.ok).length}
   const r=resolveStaleDiagnostics(started,last);if(r.length){totalResolved.push(...r);state.diagnosticsResolved+=r.length}
   if(pass>=2&&r.length===0&&totalResolved.length===before)break;
  }
  last=await api.run();passes++;state.passes++;
  const blocked=findOrphans(last),summary={version:V,at:new Date().toISOString(),passes,fixed:healRows.filter(x=>x.ok).length+totalResolved.length,technical:healRows,resolvedDiagnostics:totalResolved,blocked,cleanTechnical:cleanTechnicalState(last),remainingOpenIssues:issues().filter(openIssue).length,result:last};
  state.blocked=blocked.length;state.lastSummary={...summary,result:undefined};render(summary);state.lastSummary=clone(state.lastSummary);return summary;
 }catch(e){state.lastError=sid(e?.message||e);throw e}
 finally{state.running=false;restoreUi(ui)}
}
window.hlgbAuditorRepair9440={version:V,state,run,healTechnical,cleanTechnicalState,findOrphans,status:()=>({...state,authReady:authReady(),openIssues:issues().filter(openIssue).length})};
console.info('[HLGB] v'+V+' Auditor Reparador pronto: auditar → reparar seguro → retestar');
})();
