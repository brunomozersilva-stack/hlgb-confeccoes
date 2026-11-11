/* HLGB v95.37 — leitura independente e segura dos pedidos confirmados na nuvem.
   Nunca apaga, envia, confirma WAL, nem substitui pedidos com alteracao local pendente. */
(function(){
'use strict';
if(window.hlgbOrdersCloudConfirm9537)return;
const VERSION='95.37',MIN_INTERVAL=8000,INTERVAL=20000,PER_PAGE=250,MAX_PAGES=40;
let inflight=null,lastCheck=0,latest={version:VERSION,ok:false,checkedAt:null,cloudOrders:null,added:0,updated:0,error:''};
function ready(){
 const shell=document.getElementById('appShell');
 const login=document.getElementById('loginScreen');
 if(!shell||!navigator.onLine)return false;
 if(login){try{if(getComputedStyle(login).display!=='none')return false}catch(e){}}
 return true;
}
function onOrders(){return document.querySelector('#appShell .page.active')?.id==='pedidos'}
function database(){try{return typeof db==='object'&&db?db:window.db}catch(e){return window.db}}
function state(){return {...latest,busy:!!inflight}}
function node(){
 let el=document.getElementById('hlgbOrdersCloudCheck9537');
 if(el)return el;
 const target=document.getElementById('orderFilterSummary');
 if(!target)return null;
 el=document.createElement('div');
 el.id='hlgbOrdersCloudCheck9537';
 el.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0;font-size:12px;';
 const btn=document.createElement('button');
 btn.id='hlgbOrdersCloudCheckButton9537';btn.type='button';btn.className='secondary';
 btn.textContent='☁️ Conferir pedidos na nuvem';
 btn.addEventListener('click',()=>check(true).catch(()=>{}));
 const status=document.createElement('span');
 status.id='hlgbOrdersCloudCheckStatus9537';
 status.setAttribute('aria-live','polite');
 el.append(btn,status);target.after(el);return el;
}
function display(){
 const el=node();if(!el)return;
 const btn=el.querySelector('button'),status=el.querySelector('span');
 if(btn)btn.disabled=!!inflight;
 if(status)status.textContent=inflight?'Consultando pedidos na nuvem…'
  :latest.error?'⚠️ Não foi possível conferir a nuvem: '+latest.error
  :latest.checkedAt?'Nuvem: '+latest.cloudOrders+' pedidos ativos conferidos · '+latest.added+' novo(s) recebido(s) · '+new Date(latest.checkedAt).toLocaleTimeString('pt-BR')
  :'Aguardando conferência da nuvem.';
}
function localPending(){
 const f=window.hlgbRecordPendingIdentitySet9535;
 if(typeof f!=='function')throw new Error('Proteção de pendências indisponível');
 const out=f();if(!(out instanceof Set))throw new Error('Identidades pendentes indisponíveis');
 return out;
}
function idOf(x){return String(x?.id??x?.__hlgbId??'')}
function canRedraw(){
 const a=document.activeElement;
 return !document.querySelector('#modal.show')&&!(a&&/^(INPUT|TEXTAREA|SELECT)$/i.test(a.tagName)&&a.closest?.('#appShell'));
}
function redraw(){
 if(!onOrders()||!canRedraw())return;
 try{if(typeof window.renderOrders==='function')window.renderOrders()}catch(e){console.warn('[HLGB v'+VERSION+'] renderOrders',e)}
}
async function check(force=false){
 if(inflight)return inflight;
 if(!ready()||!onOrders())return false;
 if(!force&&Date.now()-lastCheck<MIN_INTERVAL)return !!latest.ok;
 inflight=(async()=>{
  try{
   const guard=window.hlgbWalIdbGuard9536;
   if(!guard||typeof guard.probe!=='function')throw new Error('Proteção IndexedDB v95.36 não carregada');
   await guard.probe(); // read-only; falha bloqueia a mesclagem
   if(guard.status?.().readFailed)throw new Error('Diário local não pôde ser verificado');
   const pending=localPending();
   const cloud=window.cloudRequest;
   if(typeof cloud!=='function')throw new Error('Conexão autenticada indisponível');
   const data=database();
   if(!data||!Array.isArray(data.orders))throw new Error('Lista local de pedidos indisponível');
   const rows=[];
   let complete=false;
   for(let page=0;page<MAX_PAGES;page++){
    const path='hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at,updated_by'
      +'&module=eq.orders&deleted_at=is.null&order=updated_at.asc,entity_id.asc'
      +'&limit='+PER_PAGE+'&offset='+(page*PER_PAGE);
    const part=await cloud(path,{method:'GET'});
    if(!Array.isArray(part))throw new Error('Resposta inválida na leitura de pedidos');
    rows.push(...part);
    if(part.length<PER_PAGE){complete=true;break}
   }
   if(!complete)throw new Error('Lista de pedidos excedeu limite seguro de leitura');
   let added=0,updated=0,protectedCount=0;
   for(const row of rows){
    if(row?.module!=='orders'||row?.deleted_at||row?.entity_id==null||!row.data)continue;
    const id=String(row.entity_id);
    if(pending.has('orders::'+id)){protectedCount++;continue}
    const exists=data.orders.some(o=>idOf(o)===id);
    const apply=window.hlgbApplyRecordRow;
    let applied=false;
    if(typeof apply==='function')applied=!!apply(row);
    // Um snapshot pode ter a revisão correta e a lista local estar vazia.
    // Nesse caso, o guard de revisão recusa o eco; restaurar só o item
    // confirmado, sem substituir outro pedido ou mexer na fila.
    if(!data.orders.some(o=>idOf(o)===id)){
     const item=JSON.parse(JSON.stringify(row.data));
     if(!item||typeof item!=='object'||Array.isArray(item))continue;
     if(item.id==null&&!item.__hlgbId)item.__hlgbId=id;
     data.orders.push(item);added++;
    }else if(exists&&applied){updated++}
    else if(!exists&&applied){added++}
   }
   lastCheck=Date.now();
   latest={version:VERSION,ok:true,checkedAt:new Date().toISOString(),cloudOrders:rows.length,added,updated,protectedCount,error:''};
   redraw();display();
   return true;
  }catch(e){
   lastCheck=Date.now();
   latest={...latest,ok:false,checkedAt:new Date().toISOString(),error:String(e?.message||e).slice(0,150)};
   console.warn('[HLGB v'+VERSION+'] Pedido não confirmado na leitura direta',e);display();return false;
  }finally{inflight=null;display()}
 })();
 display();
 return inflight;
}
function schedule(){if(onOrders()&&ready())check(false).catch(()=>{})}
document.addEventListener('click',e=>{
 const t=e.target?.closest?.('[data-page],button,a');
 const p=String(t?.dataset?.page||t?.getAttribute?.('data-target')||'').toLowerCase();
 const label=String(t?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
 if(p==='pedidos'||label==='pedidos')setTimeout(schedule,350);
},true);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(schedule,300)},true);
window.addEventListener('focus',()=>setTimeout(schedule,300));
window.addEventListener('pageshow',()=>setTimeout(schedule,400));
setInterval(schedule,INTERVAL);
setTimeout(schedule,1100);
window.hlgbOrdersCloudConfirm9537={version:VERSION,check,status:state};
})();