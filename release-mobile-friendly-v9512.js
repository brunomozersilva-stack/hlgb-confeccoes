/* HLGB v95.12 — primeira camada de navegação mobile.
 * Só altera layout e navegação; nenhuma alteração em dados, salvamento ou Supabase.
 */
(function(){
'use strict';
const V='95.12',STYLE_ID='hlgbMobileFriendly9512Style';
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
  #appShell #nav{display:block!important;position:fixed!important;left:0!important;top:0!important;bottom:0!important;width:min(86vw,320px)!important;max-height:100dvh!important;overflow:auto!important;z-index:12004!important;box-sizing:border-box!important;background:#fff!important;box-shadow:0 8px 30px #0002!important;transform:translateX(-105%);visibility:hidden!important;pointer-events:none!important;transition:transform .2s ease!important;padding-bottom:calc(22px + env(safe-area-inset-bottom))!important}
  body.hlgb-mobile-nav-open9512 #appShell #nav{transform:translateX(0);visibility:visible!important;pointer-events:auto!important}
  body.hlgb-mobile-nav-open9512{overflow:hidden!important}
  #hlgbMobileBackdrop9512{display:none;position:fixed;inset:0;background:#1410198a;z-index:12003}
  body.hlgb-mobile-nav-open9512 #hlgbMobileBackdrop9512{display:block}
  #hlgbMobileNav9250{grid-template-columns:repeat(5,minmax(0,1fr))!important;z-index:12002!important}
  #hlgbMobileNav9250 button{min-width:0!important;min-height:50px!important;padding:5px 2px!important;font-size:11px!important;line-height:1.3!important;touch-action:manipulation}
  #hlgbMobileNavClose9512{display:block;position:sticky;top:0;width:100%;min-height:46px;background:#f4edf1;border:0;text-align:left;padding:9px 14px;font-size:16px;font-weight:700;z-index:2}
  #hlgbMobileMenu9512[aria-expanded="true"]{background:#f3dbe5!important}
}
@media (min-width:701px){
 #hlgbMobileBackdrop9512,#hlgbMobileNavClose9512,#hlgbMobileMenu9512{display:none!important}
}
@media (prefers-reduced-motion:reduce){#appShell #nav{transition:none!important}}
`;
function style(){
 if(document.getElementById(STYLE_ID))return;
 const st=document.createElement('style');st.id=STYLE_ID;st.textContent=css;
 (document.head||document.documentElement).appendChild(st);
}
function close(){
 document.body.classList.remove('hlgb-mobile-nav-open9512');
 document.getElementById('hlgbMobileMenu9512')?.setAttribute('aria-expanded','false');
}
function toggle(){
 if(!window.matchMedia?.('(max-width:700px)').matches)return;
 const open=!document.body.classList.contains('hlgb-mobile-nav-open9512');
 document.body.classList.toggle('hlgb-mobile-nav-open9512',open);
 document.getElementById('hlgbMobileMenu9512')?.setAttribute('aria-expanded',String(open));
 if(open)document.getElementById('hlgbMobileNavClose9512')?.focus();
}
function install(){
 style();
 if(!document.body)return;
 let b=document.getElementById('hlgbMobileBackdrop9512');
 if(!b){b=document.createElement('div');b.id='hlgbMobileBackdrop9512';
   b.addEventListener('click',close);document.body.appendChild(b)}
 const nav=document.getElementById('nav');
 if(nav&&!document.getElementById('hlgbMobileNavClose9512')){
  const btn=document.createElement('button');btn.id='hlgbMobileNavClose9512';btn.type='button';
  btn.textContent='✕ Fechar menu';btn.setAttribute('aria-label','Fechar menu');
  btn.addEventListener('click',close);nav.insertBefore(btn,nav.firstChild);
 }
 const bottom=document.getElementById('hlgbMobileNav9250');
 if(bottom&&!document.getElementById('hlgbMobileMenu9512')){
  const btn=document.createElement('button');btn.id='hlgbMobileMenu9512';
  btn.type='button';btn.innerHTML='☰<br>Menu';btn.setAttribute('aria-label','Abrir menu completo');
  btn.setAttribute('aria-controls','nav');btn.setAttribute('aria-expanded','false');
  btn.addEventListener('click',toggle);bottom.appendChild(btn)
 }
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
document.addEventListener('click',e=>{
 const selected=e.target?.closest?.('#nav button[onclick],#nav a[href]');
 if(!selected)return;
 const fn=selected.getAttribute('onclick')||'';
 if(selected.tagName==='A'||/\bpage\s*\(|\bopenHlgb\w+\s*\(/.test(fn))
  setTimeout(close,0);
},true);
window.addEventListener?.('resize',()=>{if(window.innerWidth>700)close()});
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(install,100));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,800);setTimeout(install,2600);setTimeout(install,6000);
window.hlgbMobileFriendly9512={version:V,install,open:toggle,close};
console.info('[HLGB] v'+V+' base mobile instalada sem alterar dados');
})();