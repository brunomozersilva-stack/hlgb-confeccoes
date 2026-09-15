/* HLGB stable module: preço correto na entrega de facção */
(function(){
'use strict';
const q=v=>Math.max(0,Number(v)||0);
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
function rows(name){try{return Array.isArray(db?.[name])?db[name]:[]}catch(e){return []}}
function faction(id){return rows('factions').find(x=>String(x?.id)===String(id))||null}
function orderFor(f){return rows('orders').find(x=>String(x?.id)===String(f?.orderId))||null}
function productFor(f){return rows('products').find(x=>String(x?.id)===String(f?.productId))||null}
function priceFor(f){
  const o=orderFor(f),pid=String(f?.productId||'');
  if(o&&Array.isArray(o.grade)){
    const g=o.grade.filter(x=>String(x?.productId||'')===pid&&q(x?.unitPrice)>0);
    if(g.length){
      const qty=g.reduce((s,x)=>s+q(x.qty),0);
      const total=g.reduce((s,x)=>s+q(x.qty)*q(x.unitPrice),0);
      if(qty>0)return total/qty;
      return q(g[0].unitPrice);
    }
  }
  const p=productFor(f),cid=String(o?.clientId||'');
  if(p?.clientPrices&&typeof p.clientPrices==='object'){
    const byId=q(p.clientPrices[cid]);if(byId>0)return byId;
    const byName=q(p.clientPrices[o?.client||f?.client||'']);if(byName>0)return byName;
  }
  return q(p?.price);
}
function visibleModal(){
  const all=[...document.querySelectorAll('.modalbox')];
  return all.reverse().find(x=>{try{return getComputedStyle(x).display!=='none'}catch(e){return true}})||document.querySelector('#modal .modalbox')||null;
}
function setCorrectPrice(id){
  const f=faction(id),price=priceFor(f);if(!f||price<=0)return false;
  const modal=visibleModal();if(!modal)return false;
  const field=[...modal.querySelectorAll('.field')].find(x=>norm(x.querySelector('label')?.textContent).includes('valor de venda por peca'));
  const input=field?.querySelector('input');if(!input)return false;
  modal.dataset.hlgbFactionId=String(id);
  input.dataset.hlgbOrderPrice=String(price);
  input.value=input.type==='number'?String(price):price.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  try{input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){}
  return true;
}
const original=window.registerFactionDelivery935;
if(typeof original==='function'){
  window.registerFactionDelivery935=function(id){
    const r=original.apply(this,arguments);
    setTimeout(()=>setCorrectPrice(id),0);
    setTimeout(()=>setCorrectPrice(id),80);
    setTimeout(()=>setCorrectPrice(id),250);
    return r;
  };
}
document.addEventListener('click',function(e){
  const b=e.target?.closest?.('button');if(!b)return;
  if(!b.classList.contains('modalSave')&&!norm(b.textContent).includes('confirmar entrega integrada'))return;
  const modal=b.closest('.modalbox');const id=modal?.dataset?.hlgbFactionId;if(id)setCorrectPrice(id);
},true);
window.HLGB_PRICING_MODULE='order-price-v1';
console.info('[HLGB] preço de entrega vinculado ao valor do pedido');
})();