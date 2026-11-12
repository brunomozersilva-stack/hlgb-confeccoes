/* HLGB v95.41 — Painel do Monitor Horário no Auditor / Testes.
   Consulta SOMENTE a API pública do GitHub Actions, sem tokens.
   Não toca em Supabase, pedidos, filas WAL, armazenamento nem sincronização.
   O resumo é independente do artefato bruto da execução no GitHub.
*/
(function(){
'use strict';
if(window.hlgbHourlyHealthPanel9541)return;
const V='95.47',REPO='brunomozersilva-stack/hlgb-confeccoes';
const ROOT='https://api.github.com/repos/'+REPO;
const WORKFLOW='HLGB Hourly Health Monitor v95.38';
const MAX_AGE=5*60*1000;
let latest=null,fetchedAt=0,busy=null,error='';
const sid=x=>String(x==null?'':x);
const date=x=>{try{return x?new Date(x).toLocaleString('pt-BR'):'Não informado'}catch(_){return 'Não informado'}};
const runUrl=x=>Number.isSafeInteger(Number(x?.id))&&Number(x.id)>0?
 'https://github.com/'+REPO+'/actions/runs/'+Number(x.id):'https://github.com/'+REPO+'/actions';
function statusOf(run){
 if(!run)return {label:'Não verificado',className:'warn'};
 if(run.status!=='completed')return {label:'Em execução / na fila',className:'warn'};
 if(run.conclusion==='success')return {label:'Aprovado',className:'ok'};
 if(run.conclusion==='failure')return {label:'Falhou',className:'bad'};
 return {label:'Inconclusivo ('+sid(run.conclusion||run.status)+')',className:'warn'};
}
async function getJSON(path){
 const ctl=typeof AbortController==='function'?new AbortController():null;
 const timer=setTimeout(()=>ctl?.abort(),11000);
 try{
  const response=await fetch(ROOT+path,{
   method:'GET',mode:'cors',credentials:'omit',cache:'no-store',
   headers:{Accept:'application/vnd.github+json'},
   ...(ctl?{signal:ctl.signal}:{})
  });
  if(!response.ok)throw Error(response.status===403?'Limite temporário de consultas do GitHub (HTTP 403).':
   'GitHub não respondeu à consulta (HTTP '+response.status+').');
  return await response.json();
 }finally{clearTimeout(timer)}
}
function parse(head,all,scheduled){
 const sha=sid(head?.commit?.sha);
 if(!/^[a-f0-9]{40}$/.test(sha))throw Error('GitHub não informou o commit atual do sistema.');
 const runs=(Array.isArray(all?.workflow_runs)?all.workflow_runs:[])
  .filter(x=>x&&x.head_branch==='main');
 const scheduledRuns=(Array.isArray(scheduled?.workflow_runs)?scheduled.workflow_runs:[])
  .filter(x=>x&&x.head_branch==='main');
 const merged=[...runs,...scheduledRuns];
 const seen=new Set();
 const hourly=merged.filter(x=>x.name===WORKFLOW&&x.id&&(!seen.has(x.id)&&seen.add(x.id)))
  .sort((a,b)=>sid(b.created_at).localeCompare(sid(a.created_at))).slice(0,12);
 const monitor=hourly[0]||null;
 const current=runs.filter(x=>x.head_sha===sha);
 const completed=current.filter(x=>x.status==='completed');
 const failures=completed.filter(x=>x.conclusion==='failure'&&x.name!==WORKFLOW)
  .map(x=>({id:Number(x.id),name:sid(x.name).slice(0,120),url:runUrl(x)})).slice(0,18);
 const pending=current.filter(x=>x.status!=='completed');
 const deploy=merged.filter(x=>x.name==='pages build and deployment'&&x.conclusion==='success')
  .sort((a,b)=>sid(b.created_at).localeCompare(sid(a.created_at)))[0]||null;
 return {
  kind:'hlgb-hourly-health-dashboard',schemaVersion:1,version:V,
  source:'GitHub Actions (API pública, leitura)',
  repository:REPO,generatedAt:new Date().toISOString(),currentCommit:sha,
  lastHourlyRun:monitor?{
   id:Number(monitor.id),createdAt:sid(monitor.created_at),updatedAt:sid(monitor.updated_at),
   status:sid(monitor.status),conclusion:sid(monitor.conclusion),commit:sid(monitor.head_sha),
   link:runUrl(monitor),currentCommit:monitor.head_sha===sha
  }:null,
  history:hourly.map(x=>({id:Number(x.id),createdAt:sid(x.created_at),
   status:sid(x.status),conclusion:sid(x.conclusion),commit:sid(x.head_sha),link:runUrl(x)})),
  ci:{completed:completed.length,pending:pending.length,failed:failures.length,
   failingWorkflows:failures,scope:'Somente execuções encontradas para o commit atual'},
  publication:{
   checked:!!deploy,commit:sid(deploy?.head_sha),current:!!deploy&&deploy.head_sha===sha,
   link:deploy?runUrl(deploy):null,updatedAt:sid(deploy?.updated_at)
  },
  synchronization:{
   provedAcrossRealTwoSessions:false,
   description:'Os testes automatizados não comprovam que um pedido apareceu em outro navegador autenticado.'
  },
  limits:'Este resumo reúne o estado do GitHub Actions. O relatório bruto do bot é um artifact na execução do GitHub; pode exigir login para baixar.'
 };
}
async function collect(force){
 if(busy)return busy;
 if(!force&&latest&&Date.now()-fetchedAt<MAX_AGE)return latest;
 busy=(async()=>{
  try{
   // Somente duas chamadas de leitura, sob demanda ao abrir Auditor ou atualizar.
   const [head,all]=await Promise.all([
    getJSON('/branches/main'),
    getJSON('/actions/runs?branch=main&per_page=100')
   ]);
   const list=Array.isArray(all?.workflow_runs)?all.workflow_runs:[];
   const monitorExists=list.some(x=>x.name===WORKFLOW);
   // Fallback exclusivamente se muitas CI builds esconderam a execução horária.
   const scheduled=monitorExists?null:await getJSON('/actions/runs?branch=main&event=schedule&per_page=40');
   latest=parse(head,all,scheduled);
   fetchedAt=Date.now();error='';return latest;
  }catch(e){
   error=sid(e?.message||e).slice(0,180);
   if(latest)return latest;
   throw e;
  }finally{busy=null;paint()}
 })();
 paint();
 return busy;
}
function E(tag,cls,text){
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(text!=null)el.textContent=sid(text);
 return el;
}
function divLine(title,value){
 const line=E('div','hlgb-health-row');
 line.append(E('span','',title),E('strong','',value));
 return line;
}
function badge(label,cls){
 const el=E('span','badge '+cls,label);
 return el;
}
function createPanel(){
 const modal=document.getElementById('modalContent');
 if(!modal)return null;
 const actions=modal.querySelector('.hlgb-auditor-actions');
 if(!actions)return null;
 let panel=modal.querySelector('#hlgbHourlyHealthPanel9541');
 if(panel)return panel;
 panel=E('section','panel hlgb-health-panel');
 panel.id='hlgbHourlyHealthPanel9541';
 panel.setAttribute('aria-label','Monitor de Saúde do HLGB');
 const title=E('h3','','📊 Monitor de Saúde — verificações horárias');
 title.style.marginTop='0';
 const intro=E('div','sub','Resultados reais do GitHub Actions. Não executa correções nem altera dados.');
 const summary=E('div','hlgb-health-body');
 summary.id='hlgbHealthSummary9541';summary.setAttribute('aria-live','polite');
 const controls=E('div','hlgb-auditor-actions hlgb-health-download-controls');
 controls.id='hlgbHealthDownloadControls9544';
 const refresh=E('button','secondary','🔄 Atualizar agora');
 refresh.type='button';refresh.id='hlgbHealthRefresh9541';
 refresh.addEventListener('click',()=>refreshNow());
 const download=E('button','primary','⬇️ BAIXAR RELATÓRIO DO BOT (JSON)');
 download.type='button';download.id='hlgbHealthDownload9541';
 download.addEventListener('click',()=>saveJSON());
 const downloadTxt=E('button','secondary','⬇️ Baixar resumo (TXT)');
 downloadTxt.type='button';downloadTxt.id='hlgbHealthDownloadTxt9544';
 downloadTxt.addEventListener('click',()=>saveTXT());
 const copy=E('button','secondary','📋 Copiar resumo');
 copy.type='button';copy.id='hlgbHealthCopy9541';
 copy.addEventListener('click',()=>copySummary());
 controls.append(download,downloadTxt,refresh,copy);
 const note=E('div','sub','Os relatórios em JSON e TXT são baixados diretamente no computador, sem abrir outra página. O JSON reúne a última auditoria horária, testes, alertas, histórico e publicação.');
 panel.append(title,intro,controls,summary,note);
 actions.insertAdjacentElement('afterend',panel);
 return panel;
}

/* Link de download REAL e sempre visível no topo do modal.
 * Diferentemente de botões, <a download> expõe um arquivo diretamente ao
 * Safari e ao Chrome; fica FORA do grupo flex de ações do Auditor.
 */
function ensureVisibleDownloads9545(){
 const root=document.getElementById('modalContent');
 if(!root)return null;
 let box=root.querySelector('#hlgbHealthPinnedDownloads9545');
 if(box)return box;
 box=E('div');
 box.id='hlgbHealthPinnedDownloads9545';
 box.setAttribute('aria-label','Baixar relatórios do Monitor de Saúde');
 box.style.cssText='display:block!important;visibility:visible!important;opacity:1!important;'+
  'position:sticky;top:0;z-index:2000;background:#fff;border:2px solid #5b257d;'+
  'padding:12px;margin:12px 0;border-radius:10px;box-sizing:border-box;width:100%;';
 const intro=E('div','', 'RELATÓRIO DO BOT');
 intro.style.cssText='font-size:15px;font-weight:800;color:#3f155d;display:block!important;margin-bottom:8px;';
 const state=E('div','sub','Consultando os resultados do bot…');
 state.id='hlgbHealthPinnedStatus9547';
 state.style.cssText='font-size:13px;display:block!important;margin-bottom:8px;color:#5b257d';
 state.setAttribute('role','status');
 const link=E('a','', '⌛ CONSULTANDO RESULTADOS…');
 link.id='hlgbHealthPinnedJson9545';
 link.style.cssText='display:block!important;visibility:visible!important;opacity:1!important;'+
  'background:#5b257d!important;color:#fff!important;text-decoration:none!important;'+
  'font-size:15px!important;font-weight:800!important;line-height:1.4!important;'+
  'padding:12px!important;margin:5px 0!important;border-radius:8px!important;'+
  'white-space:normal!important;overflow-wrap:anywhere!important;cursor:pointer!important;';
 const txt=E('a','','⬇️ Baixar resumo em texto (TXT)');
 txt.id='hlgbHealthPinnedTxt9545';
 txt.style.cssText='display:block!important;color:#451a6e!important;text-decoration:underline!important;'+
  'font-size:14px!important;padding:7px 0!important;cursor:pointer!important;';
 box.append(intro,state,link,txt);
 const title=root.querySelector('h2');
 if(title)title.insertAdjacentElement('afterend',box);
 else root.prepend(box);
 return box;
}
function prepareVisibleDownloads9545(){
 const box=ensureVisibleDownloads9545();
 if(!box)return;
 const state=box.querySelector('#hlgbHealthPinnedStatus9547');
 const json=box.querySelector('#hlgbHealthPinnedJson9545');
 const txtLink=box.querySelector('#hlgbHealthPinnedTxt9545');
 const available=!!latest||!!error;
 // Quando a API ainda está em andamento NÃO criar um JSON "not_verified".
 // O link nativo é habilitado somente depois que os resultados chegam ou
 // uma falha de rede real foi confirmada.
 if(!available){
  if(state)state.textContent='Consultando o GitHub Actions… O arquivo ficará disponível após a resposta.';
  for(const link of [json,txtLink]){
   if(!link)continue;
   link.removeAttribute('href');link.removeAttribute('download');
   link.setAttribute('aria-disabled','true');
   link.style.pointerEvents='none';
  }
  if(json)json.textContent='⌛ CONSULTANDO RESULTADOS DO BOT…';
  if(txtLink)txtLink.textContent='Resumo TXT disponível após a consulta';
  box.__hlgbReportKey='loading';
  return;
 }
 const key=(latest?.generatedAt||'error')+'::'+error;
 if(box.__hlgbReportKey===key)return;
 const data=report()||{
  kind:'hlgb-hourly-health-access-diagnostic',version:V,
  generatedAt:new Date().toISOString(),repository:REPO,status:'not_verified',
  error:error||'A consulta ao GitHub falhou; não há resultados confirmados.',
  note:'Diagnóstico de falha, não um relatório aprovado; nenhuma prova de sincronização foi realizada.'
 };
 if(latest&&error)data.refreshError=error;
 const raw=JSON.stringify(data,null,2)+'\n';
 const summary=latest?humanSummary(latest)+'\n'+(error?'Aviso de atualização: '+error+'\n':''):
  'HLGB — Monitor de Saúde\nConsulta não verificada: '+error+'\n';
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 if(state)state.textContent=latest?
  'Resultados consultados em '+date(latest.generatedAt)+'. O download inclui os alertas encontrados.':
  'Falha na consulta: '+error+'. Baixe o diagnóstico para investigar.';
 if(json)json.textContent=latest?'⬇️ CLIQUE AQUI PARA BAIXAR O RELATÓRIO DO BOT (JSON)':
  '⬇️ BAIXAR DIAGNÓSTICO DA FALHA (JSON)';
 if(txtLink)txtLink.textContent=latest?'⬇️ Baixar resumo (TXT)':'⬇️ Baixar erro da consulta (TXT)';
 for(const entry of [
  {link:json,value:raw,mime:'application/json;charset=utf-8',ext:'json'},
  {link:txtLink,value:summary,mime:'text/plain;charset=utf-8',ext:'txt'}
 ]){
  const a=entry.link;
  if(!a)continue;
  const url=URL.createObjectURL(new Blob([entry.value],{type:entry.mime}));
  const old=box['__hlgbOldUrl'+entry.ext];
  box['__hlgbOldUrl'+entry.ext]=url;
  a.href=url;
  a.download='HLGB-MONITOR-SAUDE-'+stamp+'.'+entry.ext;
  a.removeAttribute('aria-disabled');
  a.style.pointerEvents='auto';
  if(old)setTimeout(()=>URL.revokeObjectURL(old),20000);
 }
 box.__hlgbReportKey=key;
}

function paint(){
 prepareVisibleDownloads9545();
 const panel=document.getElementById('hlgbHourlyHealthPanel9541');
 if(!panel)return;
 const result=panel.querySelector('#hlgbHealthSummary9541');
 const d=panel.querySelector('#hlgbHealthDownload9541'),c=panel.querySelector('#hlgbHealthCopy9541');
 const refresh=panel.querySelector('#hlgbHealthRefresh9541');
 if(refresh)refresh.disabled=!!busy;
 // O botão permanece disponível até quando a API falha: o usuário pode
 // baixar um diagnóstico da falha e enviá-lo ao suporte.
 if(d)d.disabled=!latest&&!error;
 const t=panel.querySelector('#hlgbHealthDownloadTxt9544');
 const top=document.getElementById('hlgbHealthDownloadTop9544');
 if(t)t.disabled=!latest&&!error;
 if(top)top.disabled=!latest&&!error;
 if(c)c.disabled=!latest;
 if(!result)return;
 result.replaceChildren();
 if(!latest){
  const text=busy?'Consultando os resultados da última hora no GitHub…':
   error?'Não foi possível consultar o GitHub: '+error:'Abra o monitor para consultar os resultados.';
  result.append(E('div','sub',text));return;
 }
 const l=latest.lastHourlyRun,s=statusOf(l);
 const row=E('div','hlgb-health-status');
 row.append(E('strong','','Última verificação horária: '),badge(s.label,s.className));
 if(l)row.append(E('span','sub',' · '+date(l.createdAt)));
 result.append(row);
 if(!l)result.append(E('div','sub','Nenhuma execução horária localizada na janela consultada.'));
 else if(!l.currentCommit)result.append(E('div','hlgb-health-warn',
  'A última execução do bot verificou um commit anterior; a versão atual ainda não foi auditada por ele.'));
 if(error)result.append(E('div','hlgb-health-warn','GitHub indisponível agora. Exibindo a última consulta: '+error));
 const ci=latest.ci,pub=latest.publication;
 const metrics=E('div','hlgb-health-metrics');
 metrics.append(
  divLine('Testes do commit atual com falha',String(ci.failed)+(ci.pending?' ('+ci.pending+' em andamento)':'')),
  divLine('Publicação no GitHub Pages',!pub.checked?'Não comprovada':pub.current?'Commit atual publicado':'Commit diferente / publicação pendente'),
  divLine('Sincronização Safari ↔ Chrome','Sem prova em duas sessões reais')
 );
 result.append(metrics);
 if(ci.failed>0){
  const list=E('div','hlgb-health-failures');
  list.append(E('strong','','⚠️ Falhas identificadas nos testes do commit atual:'));
  for(const f of ci.failingWorkflows.slice(0,10)){
   const item=E('div','hlgb-health-failure-item',f.name);
   list.append(item);
  }
  result.append(list);
 }else if(ci.completed===0){
  result.append(E('div','sub','Os testes do commit atual ainda não foram concluídos ou não foram encontrados.'));
 }else result.append(E('div','sub','Sem falhas entre '+ci.completed+' execuções concluídas e consultadas para o commit atual.'));
 if(latest.history.length){
  const hist=E('details','hlgb-health-history');
  hist.append(E('summary','','Histórico recente do monitor ('+latest.history.length+' execuções)'));
  for(const x of latest.history.slice(0,8)){
   const row=E('div','hlgb-health-history-item',date(x.createdAt)+' · '+statusOf(x).label);
   hist.append(row);
  }
  result.append(hist);
 }
 result.append(E('div','sub','Consulta realizada: '+date(latest.generatedAt)+
  '. O bot não verifica a entrega de pedidos entre dois usuários autenticados.'));
}
function humanSummary(data){
 if(!data)return 'Nenhum relatório carregado.';
 const l=data.lastHourlyRun,ci=data.ci,p=data.publication;
 const lines=['HLGB — MONITOR DE SAÚDE','Fonte: GitHub Actions público',
  'Consulta: '+date(data.generatedAt),'Commit atual: '+data.currentCommit,
  'Bot horário: '+statusOf(l).label+(l?' · '+date(l.createdAt):''),
  l&&!l.currentCommit?'Atenção: o último bot não verificou o commit atual.':'',
  'Testes do commit atual: '+ci.completed+' concluídos, '+ci.failed+' com falha, '+ci.pending+' em andamento',
  'Publicação: '+(!p.checked?'não comprovada':p.current?'mesmo commit do main':'não corresponde ao main'),
  'Safari ↔ Chrome reais: NÃO COMPROVADO'];
 for(const f of ci.failingWorkflows)lines.push('FALHA — '+f.name+' — '+f.url);
 if(l)lines.push('Execução do monitor: '+l.link);
 return lines.filter(Boolean).join('\n');
}
function report(){return latest?JSON.parse(JSON.stringify(latest)):null}
function downloadLocalFile(filename,content,type){
 // Sempre usa um blob local com atributo download; nunca navega a uma URL do GitHub.
 const blob=new Blob([content],{type});
 const url=URL.createObjectURL(blob),link=E('a');
 link.href=url;link.download=filename;
 document.body.appendChild(link);
 try{link.click()}finally{
  // No Safari o blob precisa sobreviver um pouco à ação de download.
  setTimeout(()=>{URL.revokeObjectURL(url);link.remove()},3000);
 }
 return true;
}
function saveTXT(){
 if(!latest&&!error)return false;
 const text=latest?humanSummary(latest):
 'HLGB — MONITOR DE SAÚDE\nConsulta ainda não verificada.\n'+
 (error?'Erro: '+error+'\n':'')+
 'Nenhuma informação de sincronização entre navegadores foi comprovada.';
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 return downloadLocalFile('HLGB-MONITOR-SAUDE-'+stamp+'.txt',text+'\n','text/plain;charset=utf-8');
}
function saveJSON(){
 if(!latest&&!error)return false;
 const data=report()||{
  kind:'hlgb-hourly-health-access-diagnostic',version:V,
  generatedAt:new Date().toISOString(),repository:REPO,
  status:'not_verified',error:error||'O bot ainda não retornou uma verificação nesta sessão.',
  noOperationalDataChanged:true,
  note:'A ausência de dados não significa que os testes passaram. Consulte o GitHub Actions.'
 };
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 return downloadLocalFile('HLGB-MONITOR-SAUDE-'+stamp+'.json',
  JSON.stringify(data,null,2)+'\n','application/json;charset=utf-8');
}
async function copySummary(){
 const summary=humanSummary(latest);
 try{await navigator.clipboard.writeText(summary);return true}
 catch(e){if(typeof window.prompt==='function')window.prompt('Copie o relatório abaixo:',summary);return false}
}
async function refreshNow(){
 try{await collect(true)}catch(e){paint()}
}
function onOpen(){
 const panel=createPanel();
 if(!panel)return false;
 prepareVisibleDownloads9545();
 paint();
 collect(false).catch(()=>paint());
 return true;
}
function addStyle(){
 if(document.getElementById('hlgbHourlyHealthStyle9541'))return;
 const st=E('style');st.id='hlgbHourlyHealthStyle9541';
 st.textContent='.hlgb-health-panel{margin:13px 0;padding:12px;border:1px solid #d9d7dd;border-radius:10px}'+
 '.hlgb-health-body{margin:10px 0;min-height:30px}.hlgb-health-status{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:8px 0}'+
 '.hlgb-health-metrics{display:grid;gap:6px;margin:10px 0}.hlgb-health-row{display:flex;justify-content:space-between;gap:16px;'+
 'border-bottom:1px solid #e5e2e7;padding:6px 0}.hlgb-health-row strong{text-align:right}'+
 '.hlgb-health-failures{margin:10px 0}.hlgb-health-failure-item,.hlgb-health-history-item{display:block;padding:5px 0;overflow-wrap:anywhere}'+
 '.hlgb-health-warn{padding:7px 0;color:#9b5c10}.hlgb-health-history{margin:10px 0}'+
 '.hlgb-health-download-controls{border:1px solid #ccb9dd;border-radius:8px;padding:8px;background:#f7f3fb}'+
 '.hlgb-health-download-controls button.primary{font-weight:700;background:#672b91;color:#fff;border:1px solid #672b91;min-height:42px}'+
 '@media(max-width:640px){.hlgb-health-row{flex-direction:column;gap:2px}.hlgb-health-row strong{text-align:left}}';
 document.head.appendChild(st);
}
const initialCreate=createPanel;
createPanel=function(){addStyle();return initialCreate()};
function openStandalone(){
 // O relatório fica acessível com UM clique no menu, sem precisar entrar
 // primeiro no Auditor Reparador e percorrer janelas longas.
 if(typeof window.openModal!=='function'){
  const msg='A janela do Monitor de Saúde não está disponível. Abra Auditor / Testes ou confira os relatórios no GitHub Actions.';
  if(typeof window.alert==='function')window.alert(msg);
  return false;
 }
 window.openModal('📊 Monitor de Saúde do HLGB',
  '<div class="sub">Bot de verificação horária. O relatório abaixo não altera pedidos nem pendências locais.</div>'+
  '<div class="hlgb-auditor-actions" id="hlgbMonitorStandaloneActions9543">'+
  '<button type="button" class="primary" id="hlgbHealthDownloadTop9544" onclick="window.hlgbHourlyHealthPanel9541.download()">⬇️ BAIXAR RELATÓRIO DO BOT (JSON)</button>'+
  '</div>'+
  '<button type="button" class="secondary modalSave">Fechar</button>',
  ()=>window.closeModal?.());
 return onOpen();
}
window.hlgbHourlyHealthPanel9541={
 version:V,onOpen,openStandalone,refresh:refreshNow,collect,report,download:saveJSON,downloadTXT:saveTXT,copySummary,humanSummary,visibleDownloads:prepareVisibleDownloads9545,
 status:()=>({busy:!!busy,lastFetchedAt:fetchedAt,error,latest:report()})
};
})();