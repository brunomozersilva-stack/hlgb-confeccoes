/* HLGB Auditor v93.99 — autoridade final da interface e captura confiável no Safari. Somente diagnóstico. */
(function(){
'use strict';
if(window.HLGB_AUDITOR_HARDENING_9399)return;
const V='93.99';
let busy=false,lastResult='idle',lastError='',lastUrl='',observer=null,removedLegacy=0,intelligenceWrapped=false;
const sid=v=>String(v??'');
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function root(){const s=document.getElementById('hlgbSmartStatus');return s?.closest?.('[role="dialog"],.modal,.modal-content,.modalCard,.modal-card,.dialog')||s?.parentElement?.parentElement||s?.parentElement||null}
function clearUrl(){if(lastUrl){try{URL.revokeObjectURL(lastUrl)}catch(e){}lastUrl=''}}
function retireLegacyVisual(){
 let n=0;
 for(const id of ['hlgbVisualControls9331','hlgbVisualRun9331','hlgbVisualStop9331','hlgbVisualStatus9331']){
  const el=document.getElementById(id);if(!el)continue;
  try{el.remove();n++}catch(e){try{el.hidden=true;el.style.setProperty('display','none','important');n++}catch(_){}}
 }
 removedLegacy+=n;return n;
}
function ensureShellAuthority(){
 const shell=window.hlgbAuditorShell9382;
 if(!shell||typeof shell.open!=='function')return false;
 try{shell.install?.()}catch(e){}
 try{window.openHlgbAuditor=shell.open;window.HLGB_AUDITOR_SHELL_AUTHORITY='93.82'}catch(e){return false}
 const nav=document.getElementById('hlgbAuditorNavBtn');if(nav)nav.onclick=shell.open;
 const open=document.getElementById('hlgbAuditorOpenBtn');if(open)open.onclick=shell.open;
 return window.openHlgbAuditor===shell.open;
}
function problemFunctionHealth(){
 const fn=window.hlgbAuditorSmartProblem;const seen=new Set();let cur=fn,depth=0,has9370=false;
 while(typeof cur==='function'&&!seen.has(cur)&&depth<24){seen.add(cur);depth++;if(cur.__hlgb9370)has9370=true;cur=typeof cur.__original==='function'?cur.__original:null}
 return {available:typeof fn==='function',depth,hasRuntimeTimeline:has9370,safariAuthority:window.__hlgbSingleProblem9368===true&&typeof window.hlgbAuditorSmart?.safariDownload?.renderReady==='function'};
}
function captureHealth(){
 const f=problemFunctionHealth(),r=root(),legacy=!!document.getElementById('hlgbVisualControls9331')||!!document.getElementById('hlgbVisualRun9331'),shell=!!window.hlgbAuditorShell9382&&window.openHlgbAuditor===window.hlgbAuditorShell9382?.open;
 const link=!!r?.querySelector?.('#hlgbSafariDownload9368,#hlgbProblemDownload9399');
 return {version:V,shellAuthority:shell,problemAvailable:f.available,problemDepth:f.depth,runtimeTimeline:f.hasRuntimeTimeline,safariAuthority:f.safariAuthority,legacyVisualPresent:legacy,manualDownloadVisible:link,busy,lastResult,lastError,removedLegacy};
}
function panel(html){const out=document.getElementById('hlgbAuditorResult');if(out)out.innerHTML='<div class="panel">'+html+'</div>';return out}
function fallbackDownload(data){
 const out=document.getElementById('hlgbAuditorResult');if(!out||!data)return false;
 let safe=data;try{safe=window.hlgbInternalAuditor?.redactDiagnostic?window.hlgbInternalAuditor.redactDiagnostic(data):data}catch(e){}
 clearUrl();const blob=new Blob([JSON.stringify(safe,null,2)],{type:'application/json;charset=utf-8'});lastUrl=URL.createObjectURL(blob);const name='HLGB-PROBLEMA-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
 out.innerHTML='<div class="panel"><b>✅ Problema registrado.</b><div class="sub">O diagnóstico ficou pronto. No Safari, use o botão abaixo para salvar.</div><div style="margin-top:10px"><a id="hlgbProblemDownload9399" class="primary" role="button" download="'+name+'" href="'+lastUrl+'">⬇️ Baixar diagnóstico</a></div></div>';
 return true;
}
async function captureProblem(){
 if(busy)return null;busy=true;lastResult='running';lastError='';retireLegacyVisual();ensureShellAuthority();panel('<b>Preparando diagnóstico…</b><div class="sub">Coletando os dados do problema sem alterar o sistema.</div>');
 try{
  const fn=window.hlgbAuditorSmartProblem;if(typeof fn!=='function')throw new Error('Captura de problema ainda não ficou pronta.');
  const data=await fn();
  let ready=!!document.querySelector('#hlgbSafariDownload9368,#hlgbProblemDownload9399');
  if(!ready){try{ready=window.hlgbAuditorSmart?.safariDownload?.renderReady?.()===true}catch(e){}}
  if(!ready)ready=fallbackDownload(data);
  if(!ready)throw new Error('O diagnóstico foi coletado, mas o Safari não recebeu o link para salvar.');
  lastResult='ready';return data;
 }catch(e){lastResult='error';lastError=sid(e?.message||e);panel('<b>Não foi possível registrar o problema.</b><div class="sub">'+esc(lastError)+'</div>');throw e}
 finally{busy=false}
}
function bindProblemCapture(){
 if(window.__hlgbAuditorProblemCapture9399)return true;
 const handler=e=>{const b=e.target?.closest?.('#hlgbSmartProblem');if(!b)return;e.preventDefault();e.stopImmediatePropagation();captureProblem().catch(()=>{})};
 document.addEventListener('click',handler,true);window.__hlgbAuditorProblemCapture9399=handler;return true;
}
function decorateIntelligence(report){
 try{const host=document.getElementById('hlgbAuditorIntelligencePanel9396');if(!host)return;document.getElementById('hlgbProblemHealth9399')?.remove();const h=report?.current?.problemCapture||captureHealth(),el=document.createElement('div');el.id='hlgbProblemHealth9399';el.style.marginTop='8px';el.innerHTML='<b>'+(h.shellAuthority&&h.problemAvailable&&!h.legacyVisualPresent?'✅':'🔴')+' Captura de problema:</b> '+(h.problemAvailable?'disponível':'indisponível')+' · Safari '+(h.safariAuthority?'pronto':'sem autoridade')+' · controle legado '+(h.legacyVisualPresent?'presente':'retirado');host.appendChild(el)}catch(e){}
}
function augmentReport(report){
 if(!report||typeof report!=='object')return report;report.hardeningVersion=V;report.current=report.current||{};report.current.problemCapture=captureHealth();report.recommendations=Array.isArray(report.recommendations)?report.recommendations:[];
 const h=report.current.problemCapture;if(!h.shellAuthority||!h.problemAvailable||h.legacyVisualPresent)report.recommendations.unshift({priority:'high',code:'auditor-problem-capture',detail:'A captura de problema ou a autoridade visual do Auditor não está íntegra nesta sessão.'});return report;
}
function wrapIntelligence(){
 const api=window.hlgbAuditorIntelligence9396;if(!api||api.__hlgb9399)return false;
 const originalRun=api.run?.bind(api),originalCollect=api.collect?.bind(api);
 if(originalCollect)api.collect=async function(){return augmentReport(await originalCollect(...arguments))};
 if(originalRun)api.run=async function(){const r=augmentReport(await originalRun(...arguments));try{api.render?.(r)}catch(e){}decorateIntelligence(r);return r};
 api.captureHealth=captureHealth;api.__hlgb9399=true;intelligenceWrapped=true;return true;
}
function installObserver(){
 if(observer||typeof MutationObserver!=='function')return;
 observer=new MutationObserver(list=>{let relevant=false;for(const m of list){for(const n of m.addedNodes||[]){if(n?.nodeType!==1)continue;if(n.id==='hlgbVisualControls9331'||n.id==='hlgbVisualRun9331'||n.querySelector?.('#hlgbVisualControls9331,#hlgbVisualRun9331,#hlgbSmartStatus')){relevant=true;break}}if(relevant)break}if(relevant){retireLegacyVisual();ensureShellAuthority();wrapIntelligence()}});
 try{observer.observe(document.documentElement||document.body,{childList:true,subtree:true})}catch(e){}
}
function install(){bindProblemCapture();retireLegacyVisual();ensureShellAuthority();wrapIntelligence();installObserver();return captureHealth()}
window.HLGB_AUDITOR_HARDENING_9399=V;window.hlgbAuditorHardening9399={version:V,install,captureProblem,captureHealth,retireLegacyVisual,ensureShellAuthority,wrapIntelligence};
[0,100,300,700,1500,3000,6000,10000,20000,40000,60000].forEach(ms=>setTimeout(install,ms));
try{if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>{install();[100,500,1500].forEach(ms=>setTimeout(install,ms))},0)}catch(e){}
window.addEventListener?.('hlgb:authenticated',()=>{install();[100,500,1500].forEach(ms=>setTimeout(install,ms))});
window.addEventListener?.('pageshow',install);
document.addEventListener('click',e=>{if(e.target?.closest?.('#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn,#hlgbAuditorIntelligenceBtn9396')){ensureShellAuthority();retireLegacyVisual();wrapIntelligence()}},true);
install();
console.info('[HLGB] Auditor hardening v'+V+' ativo · captura Safari + autoridade visual');
})();