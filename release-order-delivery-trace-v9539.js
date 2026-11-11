/* HLGB v95.39 — prova local, cloud e tela para diagnosticar Pedidos.
 * Todas as consultas sao GET autenticadas. NUNCA salva, apaga, confirma WAL
 * ou altera pedidos. Uma prova coletada em uma maquina NAO prova a outra.
 */
(function(){
'use strict';
if(window.hlgbOrderDeliveryTrace9539)return;
const VERSION='95.39',AUTO_INTERVAL=120000,AUTO_LIMIT=6,PER_PAGE=200,MAX_PAGES=4;
const FILTERS=['orderNumberFilter','orderSearch','orderStatusFilter','orderPriorityFilter','orderStartFilter','orderEndFilter'];
const HISTORY_MAX=24;
let inflight=null,lastAutomatic=0,last=null,history=[],pane=null;
const sid=x=>String(x==null?'':x);
const browser=(()=>{const ua=sid(navigator.userAgent);return /Edg\//.test(ua)?'edge':/Chrome\//.test(ua)?'chrome':/Safari\//.test(ua)?'safari':'other'})();
function isOrders(){return document.querySelector('#appShell .page.active')?.id==='pedidos'}
function loggedIn(){
 const login=document.getElementById('loginScreen');
 if(!document.getElementById('appShell')||!navigator.onLine)return false;
 if(login){try{if(getComputedStyle(login).display!=='none')return false}catch(e){}}
 return true;
}
function database(){try{return typeof db==='object'&&db?db:window.db}catch(e){return window.db}}
function idOf(x){return sid(x?.id??x?.__hlgbId)}
function orderNo(x){return sid(x?.orderNumber??x?.number??x?.id).trim()}
function stable(x){
 if(Array.isArray(x))return x.map(stable);
 if(!x||typeof x!=='object')return x;
 const y={};
 for(const k of Object.keys(x).sort())if(!k.startsWith('__hlgb'))y[k]=stable(x[k]);
 return y;
}
function same(a,b){try{return JSON.stringify(stable(a))===JSON.stringify(stable(b))}catch(e){return false}}
function filtersActive(){return FILTERS.some(k=>sid(document.getElementById(k)?.value).trim()!=='')}
function isRendered(number){
 if(!isOrders())return false;
 const trs=document.querySelectorAll('#ordersTable tr');
 for(const tr of trs){
  const val=sid(tr.querySelector?.('td')?.textContent).trim().replace(/^#\s*/,'');
  if(val&&val===sid(number))return true;
 }
 return false;
}
function pendingStatus(id){
 const guard=window.hlgbWalIdbGuard9536;
 if(guard?.status?.()?.readFailed)return 'não verificado';
 try{
  const set=window.hlgbRecordPendingIdentitySet9535?.();
  if(!(set instanceof Set))return 'não verificado';
  return set.has('orders::'+sid(id))?'sim':'não';
 }catch(e){return 'não verificado'}
}
function ensurePanel(){
 if(pane&&pane.isConnected)return pane;
 const target=document.getElementById('hlgbOrdersCloudCheck9537')||document.getElementById('orderFilterSummary');
 if(!target)return null;
 pane=document.createElement('section');
 pane.id='hlgbOrderDeliveryTrace9539';
 pane.setAttribute('aria-label','Diagnóstico de entrega dos pedidos');
 pane.style.cssText='margin:9px 0;padding:10px;border:1px solid #ccd3dd;border-radius:8px;font:12px/1.45 Arial,sans-serif;max-width:100%;';
 const header=document.createElement('div');
 header.style.cssText='font-weight:600;margin-bottom:6px;';
 header.textContent='🔎 Diagnóstico Safari ↔ Chrome · v'+VERSION;
 const actions=document.createElement('div');
 actions.style.cssText='display:flex;align-items:center;gap:7px;flex-wrap:wrap;';
 const input=document.createElement('input');
 input.id='hlgbOrderTraceNumber9539';input.type='text';input.inputMode='numeric';
 input.placeholder='Nº do pedido (ex.: 43)';
 input.style.cssText='max-width:195px;width:100%;padding:5px 8px;box-sizing:border-box;';
 const check=document.createElement('button');
 check.id='hlgbOrderTraceCheck9539';check.type='button';check.className='secondary';
 check.textContent='Verificar entrega';
 check.addEventListener('click',()=>verify(input.value.trim(),true).catch(()=>{}));
 const dl=document.createElement('button');
 dl.id='hlgbOrderTraceDownload9539';dl.type='button';dl.className='secondary';
 dl.textContent='Baixar diagnóstico';dl.addEventListener('click',download);
 const status=document.createElement('div');
 status.id='hlgbOrderTraceStatus9539';status.style.cssText='margin-top:8px;white-space:pre-line;';
 const note=document.createElement('div');
 note.style.cssText='margin-top:7px;color:#677386;';
 note.textContent='Execute nos dois navegadores. Cada diagnóstico comprova apenas o que esta sessão recebeu e exibiu.';
 actions.append(input,check,dl);pane.append(header,actions,status,note);target.after(pane);
 if(last)paint();
 return pane;
}
function paint(){
 const el=ensurePanel();if(!el)return;
 const target=el.querySelector('#hlgbOrderTraceStatus9539');
 const check=el.querySelector('#hlgbOrderTraceCheck9539');
 if(check)check.disabled=!!inflight;
 if(!target)return;
 if(inflight){target.textContent='Conferindo a nuvem e a tela deste navegador…';return}
 if(!last){target.textContent='Sem verificação nesta sessão.';return}
 if(last.error){target.textContent='⚠️ '+last.error;return}
 const rows=last.results||[];
 if(!rows.length){target.textContent='Nenhum pedido correspondente foi retornado pela nuvem. Verifique a sessão e o número digitado.';return}
 const lines=rows.map(x=>{
  const visual=x.visible?'SIM':x.filterActive?'OCULTO POR FILTRO':'NÃO';
  const local=x.localMatch?'CONFIRMADO':x.localPresent?'DIVERGENTE':'AUSENTE';
  return '#'+x.orderNumber+' · nuvem SIM · local '+local+' · tela '+visual+
    (x.pending==='sim'?' · ALTERAÇÃO LOCAL PENDENTE':'');
 });
 target.textContent=lines.join('\n')+
  '\nVerificado neste '+last.browser+' às '+new Date(last.checkedAt).toLocaleTimeString('pt-BR')+
  ' · Não confirma outro computador.';
}
async function loadRows(number){
 const cloud=window.cloudRequest;
 if(typeof cloud!=='function')throw Error('A leitura autenticada do Supabase não está disponível');
 const all=[];
 const wanted=sid(number).trim();
 const cap=wanted?MAX_PAGES:1;
 for(let page=0;page<cap;page++){
  const path='hlgb_records?select=module,entity_id,revision,updated_at,deleted_at,data'+
   '&module=eq.orders&deleted_at=is.null&order=updated_at.desc,entity_id.desc'+
   '&limit='+(wanted?PER_PAGE:AUTO_LIMIT)+'&offset='+(page*PER_PAGE);
  const rows=await cloud(path,{method:'GET'});
  if(!Array.isArray(rows))throw Error('A nuvem não retornou uma lista válida de pedidos');
  all.push(...rows);
  if(!wanted||rows.length<PER_PAGE)break;
 }
 return wanted?all.filter(r=>orderNo(r.data)===wanted):all;
}
async function verify(number='',manual=false){
 if(inflight)return inflight;
 if(!loggedIn()||!isOrders())return false;
 const desired=sid(number).replace(/[^0-9]/g,'').slice(0,12);
 if(!manual&&Date.now()-lastAutomatic<AUTO_INTERVAL)return true;
 inflight=(async()=>{
  try{
   const guard=window.hlgbWalIdbGuard9536;
   let guardError='';
   try{if(typeof guard?.probe==='function')await guard.probe();else guardError='proteção IndexedDB indisponível'}
   catch(e){guardError=sid(e?.message||e).slice(0,120)}
   const rows=await loadRows(desired);
   const local=database()?.orders;
   if(!Array.isArray(local))throw Error('A lista local de pedidos não foi carregada');
   const result=rows.filter(r=>r?.module==='orders'&&!r?.deleted_at&&r?.data&&r?.entity_id!=null)
    .map(r=>{
     const id=sid(r.entity_id),entry=local.find(x=>idOf(x)===id);
     const number=orderNo(r.data);
     return {id,orderNumber:number,cloudRevision:Number(r.revision)||0,
      cloudUpdatedAt:sid(r.updated_at),cloudPresent:true,
      localPresent:!!entry,localMatch:!!entry&&same(entry,r.data),
      visible:isRendered(number),filterActive:filtersActive(),pending:pendingStatus(id)};
    });
   last={version:VERSION,browser,checkedAt:new Date().toISOString(),
    selected:desired||null,guardError,
    appVersion:sid(window.hlgbSyncRecovery9301?.version||''),
    ordersCloudVersion:sid(window.hlgbOrdersCloudConfirm9537?.version||''),
    pendingCount:window.hlgbSyncRecovery9301?.pending?.()||null,
    results:result,error:''};
   history.unshift(last);history=history.slice(0,HISTORY_MAX);
   if(!manual)lastAutomatic=Date.now();
   paint();return last;
  }catch(e){
   last={version:VERSION,browser,checkedAt:new Date().toISOString(),selected:desired||null,
    error:sid(e?.message||e).slice(0,200),results:[]};
   history.unshift(last);history=history.slice(0,HISTORY_MAX);
   paint();return false;
  }finally{inflight=null;paint()}
 })();
 paint();return inflight;
}
function exportData(){return {kind:'hlgb-order-delivery-trace',version:VERSION,
 browser,generatedAt:new Date().toISOString(),
 note:'Comprova somente leitura e visibilidade nesta sessão. Não comprova outra máquina nem ACK de escrita do servidor.',
 history:history.slice()}}
function download(){
 const b=new Blob([JSON.stringify(exportData(),null,2)],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(b),link=document.createElement('a');
 link.href=url;link.download='HLGB-PEDIDOS-DIAGNOSTICO-'+browser+'-'+new Date().toISOString().slice(0,10)+'.json';
 document.body.appendChild(link);link.click();
 setTimeout(()=>{URL.revokeObjectURL(url);link.remove()},200);
}
function schedule(){
 if(isOrders()&&loggedIn()){ensurePanel();verify('',false).catch(()=>{})}
}
document.addEventListener('click',e=>{
 const t=e.target?.closest?.('[data-page],button,a');
 const page=sid(t?.dataset?.page||t?.getAttribute?.('data-target')).toLowerCase();
 const label=sid(t?.textContent).replace(/\s+/g,' ').trim().toLowerCase();
 if(page==='pedidos'||label==='pedidos')setTimeout(schedule,300);
},true);
window.addEventListener('pageshow',()=>setTimeout(schedule,600));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(schedule,450)});
setInterval(schedule,AUTO_INTERVAL);
setTimeout(schedule,1800);
window.hlgbOrderDeliveryTrace9539={version:VERSION,verify,report:exportData,status:()=>last,download};
})();