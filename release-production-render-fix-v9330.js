/* HLGB v93.30 — correção isolada da renderização de Produção */
(function(){
'use strict';
const V='93.30';
if(window.HLGB_PRODUCTION_RENDER_FIX_9330)return;
window.HLGB_PRODUCTION_RENDER_FIX_9330=V;
function fixedRenderProduction(){
  db.production=Array.isArray(db.production)?db.production:[];
  const f=document.getElementById('prodFilter')?.value||'';
  const arr=db.production.filter(p=>{
    try{return !(typeof hlgbProductionDone9196==='function'&&hlgbProductionDone9196(p))&&(!f||p.stage===f)}
    catch(e){return !f||p.stage===f}
  });
  const el=document.getElementById('productionTable');
  if(!el)return;
  const rows=arr.map(p=>{
    const ord=typeof getOrderByProduction==='function'?getOrderByProduction(p):null;
    return [
      esc(p.op||'-'),
      esc(p.client||ord?.client||'-'),
      esc(ord&&typeof orderProductSummary==='function'?orderProductSummary(ord):(p.product||'-')),
      (+p.planned||0).toLocaleString('pt-BR'),
      (+p.done||0).toLocaleString('pt-BR'),
      Math.max(0,(+p.planned||0)-(+p.done||0)).toLocaleString('pt-BR'),
      esc(typeof productionDestinationName==='function'?productionDestinationName(p):'-'),
      p.sentToFactionAt&&typeof fmtDate==='function'?fmtDate(p.sentToFactionAt):'-',
      p.factionDueDate&&typeof fmtDate==='function'?fmtDate(p.factionDueDate):'-',
      typeof priorityBadge==='function'?priorityBadge(ord?.priority||'Padrão'):esc(ord?.priority||'Padrão'),
      `<span class="badge">${esc(p.stage||'Aguardando produção')}</span>`,
      `${ord?`<button type="button" class="secondary" onclick="viewOrderDetails(${ord.id})">Ver pedido</button> `:''}<button type="button" class="secondary" onclick="openProductionDestination(${p.id})">Definir local</button> ${typeof window.splitProduction==='function'?`<button type="button" class="secondary" onclick="splitProduction(${p.id})">↔ Dividir produção</button> `:''}<button type="button" class="secondary" onclick="advanceProd(${p.id})">+ produção</button>`
    ];
  });
  el.innerHTML=rows.length
    ? table(['OP','Cliente','Produto','Planejado','Produzido','Falta','Local de produção','Enviado em','Previsão entrega','Prioridade','Etapa','Ações'],rows)
    : '<div class="empty">Nenhum corte finalizado aguardando produção.</div>';
}
function install(){
  if(typeof window.renderProduction!=='function')return false;
  if(window.renderProduction.__hlgb9330)return true;
  fixedRenderProduction.__hlgb9330=true;
  fixedRenderProduction.__original=window.renderProduction;
  window.renderProduction=fixedRenderProduction;
  return true;
}
function stamp(){try{const cur=Number(window.HLGB_RELEASE_VERSION)||0;if(cur<93.30){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V}}catch(e){}}
function loadVisualLauncher(){
  try{
    if(window.HLGB_VISUAL_TEST_LAUNCHER_9331||document.getElementById('hlgbVisualLauncherScript9331'))return;
    const s=document.createElement('script');
    s.id='hlgbVisualLauncherScript9331';
    s.async=true;
    s.src='./release-visual-test-launcher-v9331.js?fresh='+Date.now();
    document.head.appendChild(s);
  }catch(e){console.warn('[HLGB] lançador do teste visual',e)}
}
function boot(){install();stamp();loadVisualLauncher();let n=0,t=setInterval(()=>{n++;install();if(n>=20)clearInterval(t)},250);window.hlgbProductionRenderFix9330={version:V,install}}
if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>setTimeout(boot,50),0);else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
console.info('[HLGB] v'+V+' correção de renderização da Produção ativa');
})();