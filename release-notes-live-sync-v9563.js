/* HLGB v95.63 — notas Chrome -> Safari: leitura confirmada e exibição sem cache visual.
   Módulo isolado; não envia nem apaga WAL, não cria notas e não grava no servidor. */
(function(){
'use strict';
if(window.hlgbNotesLiveSync9563)return;
const V='95.63',MODULES=['projectionInvoices','finance','noteQueue'],PER_PAGE=250,MAX_PAGES=15;
const state={version:V,busy:false,checks:0,lastAt:'',lastReason:'',lastError:'',
 serverRows:0,applied:0,protected:0,newNotes:0,pendingVisual:false,unverified:false};
let inFlight=null,lastCheck=0,originalRenderer=null;
const sid=x=>String(x??''),esc=x=>sid(x).replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
const clone=x=>JSON.parse(JSON.stringify(x));
function data(){try{return typeof db!=='undefined'?db:window.db}catch(_){return window.db||null}}
function loggedIn(){try{return window.__HLGB_AUTH_READY===true&&!!cloudAccessToken}catch(_){return false}}
function request(path){const fn=typeof cloudRequest==='function'?cloudRequest:window.cloudRequest;
 if(typeof fn!=='function')throw Error('Leitura autenticada da nuvem indisponível');
 return fn(path,{method:'GET'});
}
function activePage(){return document.querySelector('.page.active')?.id||''}
function editing(){const a=document.activeElement;
 return !!document.querySelector('#modal.show')||!!(a&&a.matches?.('input,textarea,select,[contenteditable="true"]'))}
function pendingIds(){
 const out=new Set();const fn=window.hlgbRecordPendingIdentitySet9535;
 if(typeof fn==='function')try{for(const key of fn())out.add(sid(key))}catch(e){throw Error('Falha ao identificar operações pendentes: '+e.message)}
 const g=window.hlgbWalIdbGuard9536;
 try{for(const key of g?.ids?.()||[])out.add(sid(key))}catch(e){throw Error('Falha ao consultar identidades do IndexedDB: '+e.message)}
 return out;
}
async function guardWal(){
 const guard=window.hlgbWalIdbGuard9536;
 if(!guard?.probe||!guard?.ids)throw Error('Proteção do WAL do Safari não está pronta. Nenhuma nota local será substituída.');
 await guard.probe();
 if(guard.status?.().readFailed)throw Error('WAL do Safari não pôde ser lido. Atualização interrompida sem apagar nada.');
}
async function readModule(module){
 const all=[];
 for(let page=0;page<MAX_PAGES;page++){
  const query='hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at,updated_by'+
   '&module=eq.'+encodeURIComponent(module)+'&deleted_at=is.null'+
   '&order=updated_at.asc,entity_id.asc&limit='+PER_PAGE+'&offset='+(page*PER_PAGE);
  const rows=await request(query);
  if(!Array.isArray(rows))throw Error('Leitura incompleta de '+module+'; registros locais preservados.');
  all.push(...rows);
  if(rows.length<PER_PAGE)return all;
 }
 throw Error('Paginação de '+module+' excedeu o limite; não declarar sincronização completa.');
}
function idOf(x){return sid(x?.id??x?.__hlgbId)}
function same(a,b){const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'
 ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 try{return JSON.stringify(stable(a))===JSON.stringify(stable(b))}catch(_){return false}}
function applyRows(rows,protectedIds){
 const d=data();if(!d)throw Error('Dados locais ainda não preparados');
 let applied=0,protectedCount=0,newNotes=0;
 for(const row of rows){
  const module=sid(row?.module),id=sid(row?.entity_id);
  if(!MODULES.includes(module)||!id||row.deleted_at)continue;
  if(protectedIds.has(module+'::'+id)){protectedCount++;continue}
  if(!Array.isArray(d[module]))d[module]=[];
  const before=d[module].find(x=>idOf(x)===id),wasAbsent=!before;
  // Core handles revision/timestamp and guards; do not bypass a core rejection
  // for an existing local record (which could hold an unsaved edit).
  const apply=window.hlgbApplyRecordRow;
  const accepted=typeof apply==='function'&&apply(row)===true;
  let current=d[module].find(x=>idOf(x)===id);
  if(!accepted&&wasAbsent&&!current){
   // A preloaded snapshot can have the same revision while its list is still empty.
   const hydrated=clone(row.data||{});
   if(hydrated.id==null&&hydrated.__hlgbId==null)hydrated.__hlgbId=id;
   d[module].push(hydrated);current=hydrated;
  }
  if((accepted||(!before&&current))&&!same(before,current)){
   applied++;if(module==='projectionInvoices'&&wasAbsent)newNotes++;
  }
 }
 return {applied,protected:protectedCount,newNotes};
}
// Targeted note reads are not a complete database delta. Keep the all-module
// cursor unchanged, or unrelated orders/cuts can become invisible to later pulls.
function applyWithoutAdvancingCursor(rows,protectedIds){
 const hasGlobal=typeof hlgbRecordGlobalLastSeen!=='undefined';
 const globalBefore=hasGlobal?hlgbRecordGlobalLastSeen:null;
 const hasModules=typeof hlgbRecordLastSeen!=='undefined'&&hlgbRecordLastSeen;
 const seenBefore=hasModules?Object.fromEntries(MODULES.map(m=>[m,hlgbRecordLastSeen[m]])):null;
 try{return applyRows(rows,protectedIds)}
 finally{
  if(hasGlobal)hlgbRecordGlobalLastSeen=globalBefore;
  if(hasModules)for(const m of MODULES)hlgbRecordLastSeen[m]=seenBefore[m];
 }
}
function invoiceRows(){const d=data(),fn=window.hlgbCanonicalProjectionInvoices;
 try{const x=typeof fn==='function'?fn():d?.projectionInvoices;return Array.isArray(x)?x:[]}
 catch(_){return Array.isArray(d?.projectionInvoices)?d.projectionInvoices:[]}}
function repaint(){
 const invoices=invoiceRows();const fmtDate=s=>{const x=sid(s).slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(x)?x.slice(8,10)+'/'+x.slice(5,7)+'/'+x.slice(0,4):esc(x||'-')};
 const money=n=>(Number(n)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const rows=invoices.slice().sort((a,b)=>sid(b.createdAt||b.issueDate||b.date).localeCompare(sid(a.createdAt||a.issueDate||a.date)))
  .map(n=>'<tr><td>'+fmtDate(n.issueDate||n.date)+'</td><td>'+esc(n.client||n.clientName||'-')+
  '</td><td>'+esc((n.items||[]).map(x=>x.productName||x.description||'-').join(', '))+'</td><td>'+
  (n.items||[]).reduce((a,x)=>a+(Number(x.qty)||0),0).toLocaleString('pt-BR')+'</td><td>'+money(n.value)+
  '</td><td>'+fmtDate(n.dueDate||n.date)+'</td><td>'+esc(n.terms||'-')+'</td></tr>').join('');
 const html=invoices.length?'<div class="panel" style="margin-top:14px"><h3>Notas feitas pela Projeção</h3>'+
  '<div style="overflow-x:auto"><table><thead><tr><th>Emissão</th><th>Cliente</th><th>Produtos</th><th>Peças</th><th>Valor</th><th>Vencimento</th><th>Condição</th></tr></thead><tbody>'+
  rows+'</tbody></table></div></div>':'';
 let changed=0;
 for(const id of ['orderNotesTable','allOrderNotesTable']){
  const host=document.getElementById(id);if(!host)continue;
  let panel=host.querySelector('.v930ProjectionNotes');
  if(!panel&&invoices.length){panel=document.createElement('div');panel.className='v930ProjectionNotes';host.appendChild(panel)}
  if(panel&&panel.innerHTML!==html){panel.innerHTML=html;changed++}
 }
 return {invoices:invoices.length,updatedPanels:changed};
}
function patchRenderer(){
 const f=window.renderOrderNotes;if(typeof f!=='function'||f.__hlgbNotesLive9563)return false;
 const w=function(){const out=f.apply(this,arguments);repaint();decorate();return out};
 w.__hlgbNotesLive9563=true;w.__original=f;window.renderOrderNotes=w;originalRenderer=f;return true;
}
function decorate(){
 if(document.getElementById('hlgbNotesCheck9563'))return;
 const host=document.getElementById('allOrderNotesTable')||document.getElementById('orderNotesTable');
 if(!host?.parentElement)return;
 const bar=document.createElement('div');bar.id='hlgbNotesCheck9563';bar.className='toolbar';bar.style.cssText='margin:8px 0;align-items:center;flex-wrap:wrap';
 const btn=document.createElement('button');btn.type='button';btn.className='secondary';btn.textContent='☁️ Conferir notas na nuvem';
 const status=document.createElement('span');status.className='sub';status.id='hlgbNotesCheckStatus9563';status.setAttribute('aria-live','polite');
 btn.addEventListener('click',()=>refresh('botao',true));
 bar.append(btn,status);host.parentElement.insertBefore(bar,host);
}
function announce(message){
 const el=document.getElementById('hlgbNotesCheckStatus9563');
 if(el)el.textContent=message;
}
function redraw(){
 if(editing()){state.pendingVisual=true;return}
 state.pendingVisual=false;
 try{if(typeof window.renderOrderNotes==='function')window.renderOrderNotes()}catch(e){console.warn('[HLGB notas '+V+'] render',e)}
 const p=activePage();
 try{if(p==='projecao')window.renderProjection?.();
 else if(p==='financeiro'||p==='hubFinanceiro')window.renderFinance?.()}catch(e){console.warn('[HLGB notas '+V+'] tela',e)}
 repaint();
}
async function refresh(reason='manual',force=false){
 if(inFlight)return inFlight;
 if(!loggedIn()||document.visibilityState==='hidden'||navigator.onLine===false)return false;
 const now=Date.now();if(!force&&now-lastCheck<20000)return false;
 state.busy=true;state.lastReason=reason;state.lastError='';announce('Conferindo notas…');
 inFlight=(async()=>{
  // Read-only protection must succeed BEFORE any incoming row is applied.
  await guardWal();
  const before=pendingIds();
  const rows=[];
  for(const module of MODULES)rows.push(...await readModule(module));
  // Recheck after network wait so new edits performed during the request stay protected.
  await guardWal();const current=pendingIds();
  for(const x of before)current.add(x);
  const out=applyWithoutAdvancingCursor(rows,current);
  state.serverRows=rows.length;state.applied=out.applied;state.protected=out.protected;
  state.newNotes=out.newNotes;state.lastAt=new Date().toISOString();state.checks++;
  state.unverified=false;lastCheck=Date.now();
  if(out.applied)try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(_){}
  redraw();announce('Nuvem conferida · '+invoiceRows().length+' nota(s) · '+out.protected+' registro(s) protegido(s)');
  return {ok:true,...out,serverRows:rows.length};
 })().catch(e=>{
  state.lastError=sid(e?.message||e);state.unverified=true;
  announce('Não foi possível conferir: '+state.lastError);console.warn('[HLGB notas '+V+']',reason,e);
  return {ok:false,error:state.lastError};
 }).finally(()=>{state.busy=false;inFlight=null});
 return inFlight;
}
function boot(){
 patchRenderer();decorate();repaint();
 [400,1400,3500].forEach(ms=>setTimeout(()=>{patchRenderer();decorate()},ms));
}
window.hlgbNotesLiveSync9563={version:V,refresh,repaint,patchRenderer,decorate,status:()=>({...state}),readOnly:true};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('hlgb:authenticated',()=>setTimeout(()=>refresh('login',true),1100));
window.addEventListener('focus',()=>setTimeout(()=>refresh('focus',false),250));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>refresh('visivel',false),280)});
document.addEventListener('focusout',()=>{if(state.pendingVisual)setTimeout(()=>{if(!editing())redraw()},120)});
document.addEventListener('click',e=>{if(state.pendingVisual)setTimeout(()=>{if(!editing())redraw()},150);
 const btn=e.target?.closest?.('button');if(!btn)return;
 const t=sid(btn.textContent).toLowerCase();
 if(/notas|proje[cç][aã]o/.test(t))setTimeout(()=>refresh('abrir-notas',false),330);
},true);
setInterval(()=>{if(['projecao','notas','pedidos','financeiro'].includes(activePage()))refresh('visivel-notas',false)},45000);
console.info('[HLGB notas '+V+'] painel atualizado e leitura autenticada, WAL intacto');
})();