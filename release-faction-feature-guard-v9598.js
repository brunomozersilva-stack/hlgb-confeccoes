/* HLGB v95.98 — mantém as funções financeiras de facções visíveis após atualizações.
 * Somente DOM: nenhuma consulta, salvamento, exclusão ou replay de WAL automático. */
(function(){
'use strict';
if(window.hlgbFactionFeatureGuard9598)return;
const PAGE='pagamentosFaccoes', BAR='hlgbFactionTools9598', LIST='fm66-receipts';
const status={checks:0,ready:false,panelVisible:false,lastError:''};
const api=()=>window.hlgbFactionManual9566;
const root=()=>document.getElementById(PAGE);
const byId=id=>document.getElementById(id);
function createBar(page){
 let bar=byId(BAR);
 if(bar)return bar;
 bar=document.createElement('div');
 bar.id=BAR;bar.className='panel';
 bar.style.cssText='margin:12px 0;padding:12px;border:1px solid #d7c9e7';
 const heading=document.createElement('strong');
 heading.textContent='Pagamentos avulsos — edição, comprovantes e acertos';
 const actions=document.createElement('div');
 actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:10px 0';
 const newButton=document.createElement('button');
 newButton.type='button';newButton.className='primary';
 newButton.textContent='＋ Novo pagamento avulso';
 newButton.addEventListener('click',()=>{
  const feature=api();
  if(!feature||typeof feature.openForm!=='function'){report('Módulo não carregado. Use Reativar ferramentas sem apagar os dados.');return}
  try{feature.openForm()}catch(e){report(String(e?.message||e))}
 });
 const details=document.createElement('button');
 details.type='button';details.className='secondary';
 details.textContent='Ver/editar pagamentos, comprovantes e abatimentos';
 details.addEventListener('click',()=>{
  check();
  const panel=byId(LIST);
  if(panel){panel.scrollIntoView?.({block:'start'});return}
  report('Painel detalhado indisponível. Não refaça pagamentos; confira os lançamentos na nuvem.');
 });
 const reload=document.createElement('button');
 reload.type='button';reload.className='secondary';reload.id='hlgbFactionReload9598';
 reload.textContent='Reativar ferramentas de pagamento';
 reload.addEventListener('click',()=>{
  if(api()){check();return}
  reload.disabled=true;report('Recarregando apenas o módulo de pagamentos. Nenhum lançamento será alterado.');
  const script=document.createElement('script');
  script.src='./release-faction-manual-payment-v9566.js?recover='+Date.now();
  script.onload=()=>{reload.disabled=false;check()};
  script.onerror=()=>{reload.disabled=false;report('Não foi possível carregar o módulo. Preserve os dados locais e consulte o diagnóstico de abertura.')};
  document.head.appendChild(script);
 });
 const info=document.createElement('div');
 info.id='hlgbFactionToolsStatus9598';info.className='sub';
 info.setAttribute('role','status');
 actions.append(newButton,details,reload);
 bar.append(heading,actions,info);
 page.insertBefore(bar,page.firstChild);
 return bar;
}
function report(message){
 status.lastError=message;
 const node=byId('hlgbFactionToolsStatus9598');
 if(node)node.textContent=message;
}
let busy=false;
function check(){
 if(busy)return false;
 const page=root();if(!page)return false;
 busy=true;
 try{
  const bar=createBar(page);
  if(bar.parentElement!==page)page.insertBefore(bar,page.firstChild);
  const feature=api(),reload=byId('hlgbFactionReload9598');
  if(!feature||typeof feature.renderReceipts!=='function'||typeof feature.openForm!=='function'){
   status.ready=false;status.panelVisible=false;
   if(reload)reload.style.display='';
   report('⚠ Ferramentas avançadas não carregaram: edição, comprovante, PDF e acertos não estão disponíveis nesta sessão. Não recrie lançamentos.');
   return false;
  }
  // Reutiliza o módulo v95.66/v95.88–v95.92. Nunca recria nem modifica pagamento.
  feature.install?.();
  feature.renderReceipts();
  const panel=byId(LIST);
  if(panel&&page.contains(panel)){
   // A lista estava depois da tabela antiga: colocá-la imediatamente sob o cabeçalho.
   if(bar.nextElementSibling!==panel)page.insertBefore(panel,bar.nextSibling);
  }
  status.checks++;
  status.ready=true;status.panelVisible=!!panel&&page.contains(panel);
  if(reload)reload.style.display='none';
  const cloud=window.hlgbFactionLedgerPreservation9597?.status?.();
  if(cloud&&cloud.cloudPayments>cloud.localPayments){
   report('⚠ A nuvem possui mais registros que esta sessão ('+cloud.cloudPayments+' na nuvem / '+cloud.localPayments+' locais). Não refaça pagamentos. Faça a conferência segura antes de editar.');
  }else if(status.panelVisible){
   report('Ferramentas carregadas. Edição de pendentes, comprovantes PDF, ajustes e compensações aparecem na lista abaixo, conforme a situação do lançamento.');
  }else report('⚠ Módulo carregado, mas a lista não foi montada. Confira a tela e não refaça pagamentos.');
  return status.panelVisible;
 }catch(e){
  status.ready=false;status.panelVisible=false;
  report('⚠ Falha ao apresentar ferramentas: '+String(e?.message||e)+'. Nenhum pagamento foi alterado.');
  return false;
 }finally{busy=false}
}
function schedule(){
 [0,500,1600,3500].forEach(ms=>setTimeout(check,ms));
}
window.hlgbFactionFeatureGuard9598={version:'95.98',check,status:()=>({...status})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
try{window.hlgbAfterLogin?.(()=>setTimeout(check,350),0)}catch(_){}
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(check,400));
window.addEventListener?.('pageshow',()=>setTimeout(check,200));
document.addEventListener('click',e=>{
 const element=e.target?.closest?.('a,button,[data-page],[onclick]');
 if(!element)return;
 const hint=String(element.textContent||'')+' '+String(element.getAttribute?.('onclick')||'')+' '+String(element.dataset?.page||'');
 if(/pagamentosFaccoes|pagamentos de fac|pagamento avulso/i.test(hint))setTimeout(check,150);
});
})();