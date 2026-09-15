/* HLGB v92.43 — campo de nova data do restante editável no Safari */
(function(){
'use strict';
const V='92.43';
function brFromIso(v){
  const s=String(v||'').trim();
  const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m?`${m[3]}/${m[2]}/${m[1]}`:s;
}
function isoFromAny(v){
  const s=String(v||'').trim();
  let m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m)return validIso(s)?s:'';
  m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if(!m)return '';
  const iso=`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  return validIso(iso)?iso:'';
}
function validIso(s){
  const m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return false;
  const y=+m[1],mo=+m[2],d=+m[3];const dt=new Date(y,mo-1,d);
  return dt.getFullYear()===y&&dt.getMonth()===mo-1&&dt.getDate()===d;
}
function maskDate(input){
  let d=String(input.value||'').replace(/\D/g,'').slice(0,8);
  if(d.length>4)d=d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4);
  else if(d.length>2)d=d.slice(0,2)+'/'+d.slice(2);
  input.value=d;
}
function enhanceRemainingDateModal(){
  const input=document.getElementById('projectionRemainingNewDate');
  if(!input||input.dataset.hlgb9243==='1')return;
  input.dataset.hlgb9243='1';
  const initial=input.value;
  input.type='text';
  input.value=brFromIso(initial);
  input.placeholder='DD/MM/AAAA';
  input.inputMode='numeric';
  input.autocomplete='off';
  input.maxLength=10;
  input.style.fontSize='16px';
  input.style.fontWeight='700';
  input.addEventListener('input',()=>maskDate(input));
  input.addEventListener('focus',()=>{try{input.select()}catch(e){}});
  const field=input.closest('.field');
  if(field&&!field.querySelector('.hlgb9243-help')){
    const h=document.createElement('div');h.className='sub hlgb9243-help';h.style.marginTop='5px';h.textContent='Digite a data no formato DD/MM/AAAA. Ex.: 18/09/2026';field.appendChild(h);
  }
  const modal=input.closest('.modalbox')||document;
  const save=[...modal.querySelectorAll('button')].find(b=>b.classList.contains('modalSave')||/Salvar nova data do restante/i.test(b.textContent||''));
  if(save&&!save.dataset.hlgb9243){
    save.dataset.hlgb9243='1';
    save.addEventListener('click',function(e){
      const iso=isoFromAny(input.value);
      if(!iso){
        e.preventDefault();e.stopImmediatePropagation();
        alert('Informe uma data válida no formato DD/MM/AAAA.');
        input.focus();return;
      }
      input.value=iso;
      /* O manipulador original lê o valor logo depois e salva no pedido/projeção. */
    },true);
  }
}
const old=window.changeProjectionRemainingDate;
if(typeof old==='function'){
  window.changeProjectionRemainingDate=function(){
    const r=old.apply(this,arguments);
    setTimeout(enhanceRemainingDateModal,0);
    setTimeout(enhanceRemainingDateModal,80);
    return r;
  };
}
function stamp(){
  try{document.title='HLGB Confecções — Sistema de Gestão v'+V+' Multiusuário'}catch(e){}
  try{const e=document.querySelector('#appShell .logo small');if(e)e.textContent='v'+V}catch(e){}
}
function boot(){stamp();enhanceRemainingDateModal()}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(stamp,100);setTimeout(stamp,1000)},0)}catch(e){}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
setTimeout(stamp,500);setTimeout(stamp,2000);
console.info('[HLGB] hotfix v'+V+' ativo — nova data do restante aceita digitação DD/MM/AAAA');
})();