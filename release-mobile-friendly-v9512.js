/* HLGB v95.13 — corrigir menu mobile travado sem alterar dados.
 * Só altera layout e navegação; nenhuma alteração em dados, salvamento ou Supabase.
 */
(function(){
'use strict';
const V='95.13',STYLE_ID='hlgbMobileFriendly9512Style';
if(window.HLGB_MOBILE_FRIENDLY_9512===V)return;
window.HLGB_MOBILE_FRIENDLY_9512=V;
const css=String.raw`
@media (max-width:700px) {
  html,body{max-width:100%;overflow-x:clip}
  #appShell{min-width:0!important;max-width:100vw!important;box-sizing:border-box}
  #appShell main{width:100%!important;min-width:0!important;max-width:100vw!important;box-sizing:border-box!important;margin-left:0!important;margin-right:0!important;padding:12px 12px calc(102px + env(safe-area-inset-bottom))!important}
  #appShell .page{box-sizing:border-box;min-width:0!important;max-width:100%!important;overflow-wrap:break-word}
  #appShell .page h1{font-size:clamp(20px,6vw,28px)!important;line-height:1.2}
  #appShell .page :is(.panel,.card,.toolbar,.field){min-width:0;max-width:100%;box-sizing:border-box}
  #appShell .page :is(.toolbar,.actions){display:flex;flex-wrap:wrap;gap:8px}
  #appShell .page :is(.grid,.form-grid){grid-template-columns:minmax(0,1fr)!important}
  #appShell .page :is(input,select,textarea){font-size:16px!important;max-width:100%!important;box-sizing:border-box}
  #appShell .page button{min-height:42px;max-width:100%;touch-action:manipulation;white-space:normal}
  #appShell .page :is(table,.table){display:block;min-width:0!important;width:100%!important;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
  #appShell .page :is(table,.table) :is(th,td){white-space:normal;min-width:74px;vertical-align:top}
  #appShell .page #hlgbDgCards{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px!important}
  #appShell .page #hlgbDgCards .card{min-width:0!important;width:auto!important;padding:10px!important}
  #appShell .page #hlgbDgCards .card strong{font-size:23px;overflow-wrap:anywhere}
  #appShell .page #hlgbDgBody .hlgb-dg-actions{display:flex;flex-wrap:wrap;gap:6px}
  #appShell .page #hlgbDgBody .hlgb-dg-actions button{min-height:40px}
  /* Keep source nav available to existing permission-aware actions but outside layout.
     The mobile menu is an independent body-level sheet, immune to appShell stacking/clipping. */
  #appShell #nav{display:block!important;position:fixed!important;left:-110vw!important;top:0!important;bottom:0!important;width:280px!important;max-width:280px!important;transform:none!important;visibility:hidden!important;pointer-events:none!important;overflow:hidden!important}
  body.hlgb-mobile-nav-open9512 #appShell #nav{left:-110vw!important;transform:none!important;visibility:hidden!important;pointer-events:none!important}
  #hlgbMobileBackdrop9512,#hlgbMobileNavClose9512{display:none!important;pointer-events:none!important}
  #hlgbMobileNav9250{display:grid!important;position:fixed!important;left:8px!important;right:8px!important;bottom:calc(8px + env(safe-area-inset-bottom))!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;z-index:12002!important;background:#fffffff5;border:1px solid #eadde4;border-radius:16px;padding:5px;box-shadow:0 8px 24px #0003}
  #hlgbMobileNav9250 button{min-width:0!important;min-height:50px!important;padding:5px 2px!important;font-size:11px!important;line-height:1.3!important;touch-action:manipulation}
  #hlgbMobileMenu9512[aria-expanded="true"]{background:#f3dbe5!important}
  #hlgbMobileSheet9513{display:none;position:fixed!important;inset:0!important;z-index:2147483000!important;box-sizing:border-box!important;padding:calc(8px + env(safe-area-inset-top)) 8px calc(8px + env(safe-area-inset-bottom))!important;background:rgba(19,11,21,.62)!important;align-items:flex-end;justify-content:center;pointer-events:auto}
  body.hlgb-mobile-sheet-open9513 #hlgbMobileSheet9513{display:flex!important}
  body.hlgb-mobile-sheet-open9513{overflow:hidden!important}
  #hlgbMobileSheetPanel9513{display:flex;flex-direction:column;width:100%;max-width:560px;max-height:90dvh;min-height:140px;background:#fff;color:#30232c;border-radius:22px 22px 16px 16px;box-sizing:border-box;overflow:hidden;box-shadow:0 15px 55px #0006}
  #hlgbMobileSheetHeader9513{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;background:#f7eff4;flex:0 0 auto}
  #hlgbMobileSheetHeader9513 strong{font-size:19px}
  #hlgbMobileSheetClose9513{font-size:15px;min-height:44px;min-width:86px;padding:9px 12px;border-radius:12px;border:1px solid #a87991;background:#fff;color:#57293f;font-weight:700;touch-action:manipulation}
  #hlgbMobileSheetSearch9513{display:block;margin:12px 14px 4px;width:calc(100% - 28px);min-height:46px;border:1px solid #bca5b1;border-radius:12px;padding:9px 12px;box-sizing:border-box;font-size:16px}
  #hlgbMobileSheetLinks9513{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:8px 14px 20px}
  #hlgbMobileSheetLinks9513 .hlgb-mobile-section9513{font-size:12px;line-height:1.4;text-transform:uppercase;letter-spacing:.05em;color:#815e70;font-weight:700;margin:15px 0 6px}
  #hlgbMobileSheetLinks9513 .hlgb-mobile-link9513{display:block;width:100%;min-height:48px;text-align:left;background:#fff;color:#34232c;border:1px solid #eee0e7;border-radius:12px;margin:5px 0;padding:10px 12px;font-size:15px;font-weight:600;white-space:normal;overflow-wrap:anywhere;touch-action:manipulation}
  #hlgbMobileSheetLinks9513 .hlgb-mobile-link9513:active{background:#f2e3eb}
  #hlgbMobileSheetLinks9513 .hlgb-mobile-link9513[hidden],#hlgbMobileSheetLinks9513 .hlgb-mobile-section9513[hidden]{display:none!important}
  #hlgbMobileSheetLinks9513 .hlgb-mobile-message9513{padding:20px 8px;font-size:14px;color:#66535d}

}
@media (min-width:701px){
 #hlgbMobileSheet9513,#hlgbMobileMenu9512{display:none!important}
}
@media (prefers-reduced-motion:reduce){#hlgbMobileSheetPanel9513{transition:none!important}}

`;
function style(){
 if(document.getElementById(STYLE_ID))return;
 const st=document.createElement('style');st.id=STYLE_ID;st.textContent=css;
 (document.head||document.documentElement).appendChild(st);
}
function escText9513(v){return String(v??'').replace(/\s+/g,' ').trim()}
function close(){
 document.body?.classList.remove('hlgb-mobile-sheet-open9513','hlgb-mobile-nav-open9512');
 const menu=document.getElementById('hlgbMobileMenu9512');
 menu?.setAttribute('aria-expanded','false');
 const sheet=document.getElementById('hlgbMobileSheet9513');
 sheet?.setAttribute('aria-hidden','true');
}
function sourceLabel9513(btn){
 const text=escText9513(btn.getAttribute('aria-label')||btn.innerText||btn.textContent);
 return text.slice(0,100);
}
function isLink9513(node){
 if(!node||node.disabled||node.id==='hlgbMobileNavClose9512')return false;
 if(node.closest('.nav-group-title'))return false;
 if(node.getAttribute('aria-hidden')==='true'||node.hidden||node.style?.display==='none')return false;
 return node.matches('button,a')&&!!sourceLabel9513(node);
}
function renderLinks9513(){
 const root=document.getElementById('hlgbMobileSheetLinks9513');
 if(!root)return;
 root.replaceChildren();
 const nav=document.getElementById('nav');
 const sources=nav?[...nav.querySelectorAll('button,a')].filter(isLink9513):[];
 const groups=new Map(),sections=[];
 for(const source of sources){
  const grp=source.closest('.nav-group');
  const raw=grp?.querySelector('.nav-group-title')?.textContent||'Acesso rápido';
  const label=escText9513(raw).slice(0,90)||'Outras áreas';
  const key=grp||'root';
  if(!groups.has(key)){const section={name:label,items:[]};groups.set(key,section);sections.push(section)}
  groups.get(key).items.push({source,label:sourceLabel9513(source)});
 }
 for(const section of sections){
  const title=document.createElement('div');
  title.className='hlgb-mobile-section9513';title.textContent=section.name;root.appendChild(title);
  for(const item of section.items){
   const b=document.createElement('button');b.type='button';b.className='hlgb-mobile-link9513';
   b.textContent=item.label;b.setAttribute('data-hlgb-mobile-text9513',(section.name+' '+item.label).toLowerCase());
   b.addEventListener('click',()=>{
    close();
    try{item.source.click()}catch(e){console.warn('[HLGB mobile v95.13] menu action',e)}
   });
   root.appendChild(b);
  }
 }
 if(!sources.length){
  const warning=document.createElement('div');warning.className='hlgb-mobile-message9513';
  warning.textContent='O menu ainda não terminou de carregar. Feche e abra novamente depois do login.';
  root.appendChild(warning);
 }
}
function filterLinks9513(value){
 const root=document.getElementById('hlgbMobileSheetLinks9513');if(!root)return;
 const query=escText9513(value).toLocaleLowerCase('pt-BR');
 let segment=null,visible=0;
 for(const node of root.children){
  if(node.classList.contains('hlgb-mobile-section9513')){segment={header:node,count:0};node.hidden=false;continue}
  if(!node.classList.contains('hlgb-mobile-link9513'))continue;
  const match=!query||node.getAttribute('data-hlgb-mobile-text9513').includes(query);
  node.hidden=!match;if(match){visible++;if(segment)segment.count++}
 }
 for(const node of root.querySelectorAll('.hlgb-mobile-section9513')){
  let sibling=node.nextElementSibling,any=false;
  while(sibling&&!sibling.classList.contains('hlgb-mobile-section9513')){
   if(sibling.classList.contains('hlgb-mobile-link9513')&&!sibling.hidden){any=true;break}
   sibling=sibling.nextElementSibling;
  }
  node.hidden=!any;
 }
}
function open(){
 if(!window.matchMedia?.('(max-width:700px)').matches)return;
 install();
 renderLinks9513();
 const search=document.getElementById('hlgbMobileSheetSearch9513');
 if(search)search.value='';
 filterLinks9513('');
 document.body?.classList.remove('hlgb-mobile-nav-open9512');
 document.body?.classList.add('hlgb-mobile-sheet-open9513');
 document.getElementById('hlgbMobileMenu9512')?.setAttribute('aria-expanded','true');
 document.getElementById('hlgbMobileSheet9513')?.setAttribute('aria-hidden','false');
 document.getElementById('hlgbMobileSheetClose9513')?.focus({preventScroll:true});
}
function toggle(){
 if(document.body?.classList.contains('hlgb-mobile-sheet-open9513'))close();
 else open();
}
function install(){
 style();if(!document.body)return;
 // Remove only obsolete menu decoration, never a business record or pending WAL.
 document.getElementById('hlgbMobileBackdrop9512')?.remove();
 document.getElementById('hlgbMobileNavClose9512')?.remove();
 if(!document.getElementById('hlgbMobileSheet9513')){
  const sheet=document.createElement('div');sheet.id='hlgbMobileSheet9513';
  sheet.setAttribute('role','presentation');sheet.setAttribute('aria-hidden','true');
  sheet.innerHTML='<div id="hlgbMobileSheetPanel9513" role="dialog" aria-modal="true" aria-label="Menu do HLGB">'+
    '<div id="hlgbMobileSheetHeader9513"><strong>Menu do HLGB</strong>'+
    '<button type="button" id="hlgbMobileSheetClose9513" aria-label="Fechar menu">✕ Fechar</button></div>'+
    '<input id="hlgbMobileSheetSearch9513" type="search" autocomplete="off" placeholder="Buscar uma área..." aria-label="Buscar área do sistema">'+
    '<div id="hlgbMobileSheetLinks9513"></div></div>';
  sheet.addEventListener('click',e=>{if(e.target===sheet)close()});
  sheet.querySelector('#hlgbMobileSheetClose9513').addEventListener('click',close);
  sheet.querySelector('#hlgbMobileSheetSearch9513').addEventListener('input',e=>filterLinks9513(e.target.value));
  document.body.appendChild(sheet);
 }
 const bottom=document.getElementById('hlgbMobileNav9250');
 if(bottom&&!document.getElementById('hlgbMobileMenu9512')){
  const btn=document.createElement('button');btn.id='hlgbMobileMenu9512';btn.type='button';
  btn.innerHTML='☰<br>Menu';btn.setAttribute('aria-label','Abrir menu completo');
  btn.setAttribute('aria-controls','hlgbMobileSheetPanel9513');btn.setAttribute('aria-expanded','false');
  btn.addEventListener('click',toggle);bottom.appendChild(btn);
 }
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
window.addEventListener?.('resize',()=>{if(window.innerWidth>700)close()});
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(install,100));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,800);setTimeout(install,2600);setTimeout(install,6000);
window.hlgbMobileFriendly9512={version:V,install,open,close};
console.info('[HLGB] v'+V+' menu mobile independente do appShell; nenhuma operação de negócio alterada');
})();