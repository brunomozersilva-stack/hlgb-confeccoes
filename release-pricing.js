/* HLGB stable module: preço correto na entrega de facção */
(function(){
'use strict';
const q=v=>Math.max(0,Number(v)||0);
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
function rows(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function faction(id){return rows('factions').find(x=>String(x?.id)===String(id))||null}
function orderFor(f){return rows('orders').find(x=>String(x?.id)===String(f?.orderId))||null}
function productFor(f){return rows('products').find(x=>String(x?.id)===String(f?.productId))||null}
function clientFor(id){return rows('clients').find(x=>String(x?.id)===String(id))||null}
function priceFor(f,clientId){
  if(!f)return 0;const o=orderFor(f),pid=String(f.productId||''),cid=String(clientId||o?.clientId||'');
  if(o&&Array.isArray(o.grade)){
    const g=o.grade.filter(x=>String(x?.productId||'')===pid&&q(x?.unitPrice)>0);
    if(g.length){const qty=g.reduce((s,x)=>s+q(x.qty),0),total=g.reduce((s,x)=>s+q(x.qty)*q(x.unitPrice),0);if(qty>0)return total/qty;return q(g[0].unitPrice)}
  }
  const c=clientFor(cid),cp=q(c?.prices?.[pid]);if(cp>0)return cp;
  const p=productFor(f),pp=p?.clientPrices||{};const pv=q(pp[cid]??pp[o?.client||f.client||'']);if(pv>0)return pv;
  return q(p?.price);
}
function modal(){return document.querySelector('#modal .modalbox')||[...document.querySelectorAll('.modalbox')].reverse().find(x=>{try{return getComputedStyle(x).display!=='none'}catch(e){return true}})||null}
function priceInput(m){return [...(m?.querySelectorAll('.field')||[])].find(x=>norm(x.querySelector('label')?.textContent).includes('valor de venda por peca'))?.querySelector('input')||null}
function apply(id,clientId){const f=faction(id),m=modal();if(!f||!m)return false;m.dataset.hlgbFactionId=String(id);const input=priceInput(m);if(!input)return false;const cid=clientId||m.querySelector('#fdClient940')?.value||orderFor(f)?.clientId||'',p=priceFor(f,cid);input.value=p.toFixed(2);input.dataset.hlgbExactFaction=String(id);let help=input.parentElement?.querySelector('.hlgb-price-help');if(!help){help=document.createElement('div');help.className='sub hlgb-price-help';input.parentElement?.appendChild(help)}if(help)help.textContent=p>0?'Preço vinculado ao produto/pedido correto.':'Preço não cadastrado para este produto/cliente — informe antes de confirmar.';return true}
const original=window.registerFactionDelivery935;
if(typeof original==='function')window.registerFactionDelivery935=function(id){const r=original.apply(this,arguments);[0,30,120,300].forEach(ms=>setTimeout(()=>apply(id),ms));return r};
window.updateFactionSale940=function(){const m=modal(),id=m?.dataset?.hlgbFactionId,cid=m?.querySelector('#fdClient940')?.value||'';if(id)apply(id,cid)};
document.addEventListener('click',function(e){const b=e.target?.closest?.('button');if(!b||(!b.classList.contains('modalSave')&&!norm(b.textContent).includes('confirmar entrega integrada')))return;const m=b.closest('.modalbox'),id=m?.dataset?.hlgbFactionId;if(!id)return;apply(id,m.querySelector('#fdClient940')?.value||'');const mode=m.querySelector('#fdMode940')?.value||'expected',input=priceInput(m);if(mode!=='stock'&&q(input?.value)<=0){e.preventDefault();e.stopImmediatePropagation();alert('Este produto não tem preço de venda cadastrado para o cliente. Informe o valor correto antes de confirmar a entrega.');input?.focus()}},true);
window.hlgbFactionPriceFor=priceFor;
window.HLGB_PRICING_MODULE='exact-faction-v2';console.info('[HLGB] preço da entrega preso ao ID exato da facção');
})();