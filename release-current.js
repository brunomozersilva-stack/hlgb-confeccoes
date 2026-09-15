/* HLGB RELEASE ATUAL v92.47 — correção consolidada sem cadeia de hotfixes */
(function(){
'use strict';
const V=window.HLGB_RELEASE_VERSION||'92.47';
window.HLGB_RELEASE_VERSION=V;
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const q=v=>Math.max(0,Number(v)||0);
function arr(name){try{return Array.isArray(db?.[name])?db[name]:[]}catch(e){return []}}
function getFaction(id){return arr('factions').find(f=>String(f?.id)===String(id))||null}
function getProductName(f){const p=arr('products').find(x=>String(x?.id)===String(f?.productId));return String(p?.name||f?.description||f?.product||'Produto')}
function getOrder(f){return arr('orders').find(o=>String(o?.id)===String(f?.orderId))||null}
function orderDisplay(o){try{return typeof displayOrderNumber==='function'?displayOrderNumber(o):(o?.orderNumber||o?.number||o?.id||'-')}catch(e){return o?.id||'-'}}
function fmtDateSafe(v){try{return typeof fmtDate==='function'?fmtDate(v):String(v||'-')}catch(e){return String(v||'-')}}
function stamp(){
  try{document.title='HLGB Confecções — Sistema de Gestão v'+V+' Multiusuário'}catch(e){}
  try{const el=document.querySelector('#appShell .logo small');if(el&&el.textContent!=='v'+V)el.textContent='v'+V}catch(e){}
  try{const b=document.querySelector('#loginScreen b');if(b&&/Versão/i.test(b.textContent||'')&&b.textContent!=='Versão v'+V)b.textContent='Versão v'+V}catch(e){}
}

/* 1) Registrar falta: usa sempre o ID real da facção da própria linha. */
const missingFn=window.hlgbRegisterFactionMissing9197;
function exactMissing(id){
  const f=getFaction(id);if(!f){alert('Não foi possível identificar este envio. Atualize a página e tente novamente.');return false}
  const fn=typeof missingFn==='function'?missingFn:window.hlgbRegisterFactionMissing9197;
  if(typeof fn!=='function'){alert('A função de registrar falta não carregou.');return false}
  return fn(String(f.id));
}
function idFromRow(tr){
  if(!tr)return null;
  const marked=tr.querySelector('[data-faction-id]');if(marked?.dataset?.factionId&&getFaction(marked.dataset.factionId))return marked.dataset.factionId;
  for(const b of tr.querySelectorAll('button[onclick]')){
    const s=String(b.getAttribute('onclick')||'');
    let m=s.match(/registerFactionDelivery935\((\d+)\)/);if(m&&getFaction(m[1]))return m[1];
    m=s.match(/editFaction\((\d+)\)/);if(m&&getFaction(m[1]))return m[1];
    m=s.match(/hlgbRegisterFactionMissing(?:9197|9198)\((\d+)\)/);if(m&&getFaction(m[1]))return m[1];
  }
  return null;
}
function repairMainFactionTable(){
  const root=document.getElementById('factionTable');if(!root)return;
  root.querySelectorAll('tbody tr').forEach(tr=>{
    const id=idFromRow(tr);if(!id)return;
    const buttons=[...tr.querySelectorAll('button')].filter(b=>norm(b.textContent).includes('registrar falta'));
    const correct=buttons.length===1&&buttons[0].classList.contains('hlgb-release-missing')&&String(buttons[0].dataset.factionId||'')===String(id);
    if(correct)return;
    buttons.forEach(b=>b.remove());
    const cell=tr.lastElementChild;if(!cell)return;
    const f=getFaction(id),b=document.createElement('button');
    b.type='button';b.className='secondary hlgb9197-faction-missing hlgb9198-faction-missing hlgb-release-missing';
    b.dataset.factionId=String(id);b.textContent='⚠️ Registrar falta';
    b.title='Registrar falta — '+getProductName(f)+' — '+String(f?.name||'facção');
    b.onclick=e=>{e.preventDefault();e.stopPropagation();exactMissing(id)};
    cell.insertBefore(b,cell.firstChild);cell.insertBefore(document.createTextNode(' '),b.nextSibling);
  });
}
function renderFactionDeliveryExact(){
  const el=document.getElementById('factionDeliveryTable935');if(!el)return;
  const list=arr('factions').filter(f=>q(f.sent)>0).slice().sort((a,b)=>{
    const ab=Math.max(0,q(a.sent)-q(a.done)-q(a.defects)-q(a.waste));
    const bb=Math.max(0,q(b.sent)-q(b.done)-q(b.defects)-q(b.waste));
    return (ab>0?0:1)-(bb>0?0:1)||String(b.sentAt||b.date||'').localeCompare(String(a.sentAt||a.date||''));
  });
  const rows=list.map(f=>{
    const o=getOrder(f),sent=q(f.sent),done=q(f.done),loss=q(f.defects)+q(f.waste),bal=Math.max(0,sent-done-loss),hist=Array.isArray(f.deliveryHistory)?f.deliveryHistory:[],last=hist[hist.length-1];
    const actions=bal>0?'<div><button type="button" class="primary" onclick="registerFactionDelivery935('+Number(f.id)+')">📦 Registrar entrega</button> <button type="button" class="secondary hlgb9198-delivery-missing hlgb-release-missing" data-faction-id="'+esc(f.id)+'">⚠️ Registrar falta</button></div>':'<span class="sub">Entrega concluída</span>';
    return [esc(f.name||'-'),'#'+esc(o?orderDisplay(o):(f.op||'-')),'<b>'+esc(getProductName(f))+'</b>',sent.toLocaleString('pt-BR'),done.toLocaleString('pt-BR'),loss.toLocaleString('pt-BR'),bal.toLocaleString('pt-BR'),last?.date?esc(fmtDateSafe(last.date)):(f.lastDeliveryAt?esc(fmtDateSafe(f.lastDeliveryAt)):'-'),esc(last?.paymentWeek||'-'),bal>0?'<span class="badge warn">Em produção</span>':'<span class="badge ok">Finalizado</span>',actions];
  });
  try{el.innerHTML=list.length?table(['Facção','Pedido','Modelo','Enviado','Já entregue','Faltas/defeitos','Saldo','Última entrega','Pagamento','Situação','Ação'],rows):'<div class="empty">Nenhum envio de facção encontrado.</div>'}catch(e){console.error('[HLGB '+V+'] entrega facção',e)}
  el.querySelectorAll('button[data-faction-id]').forEach(b=>{b.onclick=e=>{e.preventDefault();e.stopPropagation();exactMissing(b.dataset.factionId)}});
}
window.renderFactionDelivery935=renderFactionDeliveryExact;

/* 2) A grade NÃO aparece por fora no Checklist das facções. Fica só em Conferir/Imprimir. */
function removeChecklistGradeColumn(){
  const box=document.getElementById('factionChecklistTable9176');if(!box)return;
  box.querySelectorAll('table').forEach(tbl=>{
    const head=[...tbl.querySelectorAll('thead th')];let gi=head.findIndex(h=>norm(h.textContent)==='grade');
    if(gi<0){const first=tbl.querySelector('tr');if(first)gi=[...first.children].findIndex(h=>norm(h.textContent)==='grade')}
    if(gi<0)return;
    tbl.querySelectorAll('tr').forEach(r=>{const cells=[...r.children];if(cells[gi])cells[gi].remove()});
  });
}
const oldChecklist=window.renderFactionChecklists9198;
if(typeof oldChecklist==='function')window.renderFactionChecklists9198=function(){const r=oldChecklist.apply(this,arguments);removeChecklistGradeColumn();setTimeout(removeChecklistGradeColumn,0);setTimeout(removeChecklistGradeColumn,80);return r};

/* 3) Campo "Nova data do restante" editável no Safari em DD/MM/AAAA. */
function validIso(s){const m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return false;const y=+m[1],mo=+m[2],d=+m[3],dt=new Date(y,mo-1,d);return dt.getFullYear()===y&&dt.getMonth()===mo-1&&dt.getDate()===d}
function brFromIso(v){const m=String(v||'').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+'/'+m[2]+'/'+m[1]:String(v||'')}
function isoFromAny(v){let s=String(v||'').trim(),m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return validIso(s)?s:'';m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);if(!m)return '';const iso=m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');return validIso(iso)?iso:''}
function enhanceDateModal(){
  const input=document.getElementById('projectionRemainingNewDate');if(!input||input.dataset.releaseDate==='1')return;
  input.dataset.releaseDate='1';const initial=input.value;input.type='text';input.value=brFromIso(initial);input.placeholder='DD/MM/AAAA';input.inputMode='numeric';input.autocomplete='off';input.maxLength=10;
  input.addEventListener('input',()=>{let d=String(input.value||'').replace(/\D/g,'').slice(0,8);input.value=d.length>4?d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4):d.length>2?d.slice(0,2)+'/'+d.slice(2):d});
  const modal=input.closest('.modalbox')||document,save=[...modal.querySelectorAll('button')].find(b=>b.classList.contains('modalSave')||/Salvar nova data do restante/i.test(b.textContent||''));
  if(save&&!save.dataset.releaseDate){save.dataset.releaseDate='1';save.addEventListener('click',e=>{const iso=isoFromAny(input.value);if(!iso){e.preventDefault();e.stopImmediatePropagation();alert('Informe uma data válida no formato DD/MM/AAAA.');input.focus();return}input.value=iso},true)}
}
const oldDate=window.changeProjectionRemainingDate;
if(typeof oldDate==='function')window.changeProjectionRemainingDate=function(){const r=oldDate.apply(this,arguments);setTimeout(enhanceDateModal,0);setTimeout(enhanceDateModal,80);return r};

/* 4) Mantém a sessão visualmente estável no refresh. */
function normalizeAuth(){const loader=document.getElementById('sessionLoader'),login=document.getElementById('loginScreen'),app=document.getElementById('appShell');if(!loader||!login||!app)return;if(app.style.display==='block'){loader.style.display='none';login.style.display='none'}}
function repair(){stamp();normalizeAuth();removeChecklistGradeColumn();repairMainFactionTable();enhanceDateModal()}
const oldRenderFactions=window.renderFactions;
if(typeof oldRenderFactions==='function')window.renderFactions=function(){const r=oldRenderFactions.apply(this,arguments);setTimeout(()=>{repairMainFactionTable();removeChecklistGradeColumn();renderFactionDeliveryExact()},120);return r};

document.addEventListener('click',function(e){const b=e.target?.closest?.('button');if(!b||!norm(b.textContent).includes('registrar falta'))return;const root=b.closest('#factionTable,#factionDeliveryTable935');if(!root)return;const id=b.dataset.factionId||idFromRow(b.closest('tr'));if(!id)return;e.preventDefault();e.stopImmediatePropagation();exactMissing(id)},true);
let pending=false;const obs=new MutationObserver(()=>{if(pending)return;pending=true;setTimeout(()=>{pending=false;repair()},35)});
function boot(){repair();renderFactionDeliveryExact();try{obs.observe(document.body,{childList:true,subtree:true})}catch(e){};let n=0;const iv=setInterval(()=>{stamp();if(++n>=32)clearInterval(iv)},250)}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(()=>{repair();renderFactionDeliveryExact()},80);setTimeout(repair,500);setTimeout(repair,1400);setTimeout(repair,5200)},0)}catch(e){}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
console.info('[HLGB] RELEASE v'+V+' ativa — build consolidado');
})();