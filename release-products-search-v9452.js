/* HLGB Produtos/Ficha tecnica — filtro visual seguro, nao altera registros. */
(function(){
'use strict';
if(window.HLGB_PRODUCTS_SEARCH_20261103)return;
window.HLGB_PRODUCTS_SEARCH_20261103=true;
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const root=()=>document.getElementById('produtos');
function input(){
 const p=root();if(!p)return null;
 return [...p.querySelectorAll('input')].find(el=>{
  const label=(el.closest('.field')||el.parentElement)?.querySelector('label')?.textContent||'';
  return /buscar pe[cç]a por nome|buscar produto por nome/.test(norm(label))||/buscar pe[cç]a por nome/.test(norm(el.placeholder));
 })||null;
}
function table(){
 const p=root();if(!p)return null;
 return [...p.querySelectorAll('table')].find(t=>{
  const h=[...t.querySelectorAll('thead th')].map(x=>norm(x.textContent));
  return h.includes('produto')&&h.includes('codigo')&&h.includes('acoes');
 })||null;
}
function filter(){
 const el=input(),t=table();if(!el||!t)return false;
 const q=norm(el.value);let total=0,shown=0;
 for(const tr of t.querySelectorAll('tbody tr')){
  const cells=tr.querySelectorAll('td');if(cells.length<2)continue;
  const ok=!q||norm(cells[1].textContent).includes(q);
  tr.classList.toggle('hlgb-product-search-hidden',!ok);
  total++;if(ok)shown++;
 }
 let counter=document.getElementById('hlgbProductSearchCount20261103');
 if(!counter){counter=document.createElement('small');counter.id='hlgbProductSearchCount20261103';counter.style.cssText='display:block;margin-top:4px;color:var(--muted,#666)';el.insertAdjacentElement('afterend',counter)}
 counter.textContent=q?shown+' de '+total+' produto(s) visiveis para “'+el.value.trim()+'”':'';
 return true;
}
let timer=0;
function schedule(){if(timer)return;timer=setTimeout(()=>{timer=0;filter()},0)}
document.addEventListener('input',e=>{if(e.target===input())schedule()},true);
document.addEventListener('change',e=>{if(e.target===input())schedule()},true);
function install(){
 const p=root();if(!p){setTimeout(install,600);return}
 if(p.__hlgbProductSearchObserver)return;
 p.__hlgbProductSearchObserver=true;
 new MutationObserver(records=>{
  if(records.some(r=>r.type==='childList'&&[...r.addedNodes].some(n=>n.nodeType===1&&n.id!=='hlgbProductSearchCount20261103')))schedule();
 }).observe(p,{childList:true,subtree:true});
 schedule();
}
const style=document.createElement('style');style.textContent='#produtos tr.hlgb-product-search-hidden{display:none!important}';document.head.appendChild(style);
install();
window.hlgbProductSearch20261103={filter,install};
})();