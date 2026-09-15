/* HLGB stable UI cleanup: não exibir saldos zerados nem painel legado de cortes */
(function(){
'use strict';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
const qtxt=v=>{let s=String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'');let n=Number(s);return Number.isFinite(n)?n:0};
function hideLegacyCuts(){
  let b=document.getElementById('hlgbHiddenCuts9239');
  if(b){b.style.setProperty('display','none','important');b.setAttribute('aria-hidden','true')}
}
function cleanReadyNotes(){
  const box=document.getElementById('hlgbReadyNote9196Table');if(!box)return;
  const rows=[...box.querySelectorAll('.hlgb9196-ready')];
  rows.forEach(row=>{
    let remove=false;
    const old=row.querySelector('button[onclick*="hlgbOpenReadyProjection9196"]');
    const m=String(old?.getAttribute('onclick')||'').match(/hlgbOpenReadyProjection9196\(['\"]([^'\"]+)['\"]/);
    if(m){const o=(db?.orders||[]).find(x=>String(x?.id)===String(m[1]));if(o?.readyNoteClosed===true)remove=true}
    const balanceCell=row.children?.[4];
    const balance=balanceCell?.querySelector('strong')?.textContent||'';
    if(balanceCell&&qtxt(balance)<=0)remove=true;
    if(remove)row.remove();
  });
  if(!box.querySelector('.hlgb9196-ready')&&!box.querySelector('.empty'))box.innerHTML='<div class="empty">Nenhum produto com saldo aguardando nota.</div>';
}
function patchHiddenRenderer(){
  const fn=window.renderHiddenCuts9239;if(typeof fn==='function'&&!fn.__hlgbHiddenDisabled){
    const w=function(){hideLegacyCuts();return false};w.__hlgbHiddenDisabled=true;w.__original=fn;window.renderHiddenCuts9239=w;
  }
}
function patchReadyRenderer(){
  const fn=window.renderReadyForNote9196;if(typeof fn==='function'&&!fn.__hlgbZeroClean){
    const w=function(){const r=fn.apply(this,arguments);setTimeout(cleanReadyNotes,0);return r};w.__hlgbZeroClean=true;w.__original=fn;window.renderReadyForNote9196=w;
  }
}
function apply(){hideLegacyCuts();cleanReadyNotes();patchHiddenRenderer();patchReadyRenderer()}
const css=document.createElement('style');css.id='hlgb-ui-cleanup-style';css.textContent='#hlgbHiddenCuts9239{display:none!important}';document.head.appendChild(css);
const mo=new MutationObserver(()=>setTimeout(apply,0));try{mo.observe(document.documentElement,{childList:true,subtree:true})}catch(e){}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{[100,700,1800,4000].forEach(ms=>setTimeout(apply,ms))},0)}catch(e){}
[50,500,1500,3500].forEach(ms=>setTimeout(apply,ms));
window.HLGB_UI_CLEANUP='v1';console.info('[HLGB] saldos zerados e painel legado de cortes ocultos na interface');
})();