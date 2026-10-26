/* HLGB v94.15 — busca de produto na edição da nota com preço específico do cliente */
(function(){
'use strict';
const V='94.15';
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function arr(name){try{return Array.isArray(window.db?.[name])?window.db[name]:[]}catch(e){return []}}
function noteNumber(inv){return sid(inv?.externalNoteNumber||inv?.noteNumber||inv?.id||'')}
function currentInvoice(){
 const modal=document.getElementById('modal');if(!modal)return null;
 const txt=sid(modal.textContent);
 return arr('projectionInvoices').find(inv=>txt.includes('Editar nota #'+noteNumber(inv)))||null;
}
function clientFor(inv){
 const cid=sid(inv?.clientId);
 if(cid){const byId=arr('clients').find(c=>sid(c?.id)===cid);if(byId)return byId}
 const name=norm(inv?.client||inv?.clientName);
 return arr('clients').find(c=>norm(c?.name||c?.client||c?.company)===name)||null;
}
function productName(p){return sid(p?.name||p?.product||p?.model||p?.description||('Produto '+sid(p?.id)))}
function productSearchText(p){return norm([p?.name,p?.product,p?.model,p?.description,p?.code,p?.sku,p?.reference,p?.ref,p?.id].filter(Boolean).join(' '))}
function priceFor(p,inv){
 const pid=sid(p?.id),client=clientFor(inv),cid=sid(inv?.clientId||client?.id),clientName=sid(inv?.client||inv?.clientName||client?.name);
 const cp=q(client?.prices?.[pid]);
 if(cp>0)return {value:cp,source:'client',label:'Preço do cliente '+(clientName||'da nota')};
 const pp=p?.clientPrices&&typeof p.clientPrices==='object'?p.clientPrices:{};
 const pv=q(pp[cid]??pp[clientName]??pp[client?.name]);
 if(pv>0)return {value:pv,source:'client',label:'Preço do cliente '+(clientName||'da nota')};
 const base=q(p?.price);
 if(base>0)return {value:base,source:'default',label:'Preço padrão'};
 return {value:0,source:'none',label:'Preço não cadastrado'};
}
function resultsFor(term){
 const t=norm(term);if(!t)return [];
 const words=t.split(' ').filter(Boolean);
 return arr('products').filter(p=>p&&p.active!==false&&words.every(w=>productSearchText(p).includes(w))).slice(0,30);
}
function renderResults(){
 const input=document.getElementById('hlgbNoteProductSearch9415'),box=document.getElementById('hlgbNoteProductResults9415');if(!input||!box)return;
 const inv=currentInvoice(),term=input.value,rows=resultsFor(term);
 if(!norm(term)){box.innerHTML='<div class="sub">Digite o nome, modelo, código ou SKU do produto.</div>';return}
 if(!rows.length){box.innerHTML='<div class="sub">Nenhum produto cadastrado encontrado. Você ainda pode usar “Adicionar produto livre”.</div>';return}
 box.innerHTML=rows.map(p=>{const pr=priceFor(p,inv);return '<button type="button" class="hlgb-note-product-result9415 secondary" data-product-id="'+esc(p.id)+'" style="display:flex;width:100%;justify-content:space-between;gap:12px;text-align:left;margin:4px 0;padding:9px 10px"><span><b>'+esc(productName(p))+'</b><small style="display:block;color:#777">'+esc([p.code,p.sku,p.model].filter(Boolean).join(' · '))+'</small></span><span style="text-align:right;white-space:nowrap"><b>'+esc(pr.value>0?money(pr.value):'Sem preço')+'</b><small style="display:block;color:#777">'+esc(pr.label)+'</small></span></button>'}).join('');
 box.querySelectorAll('.hlgb-note-product-result9415').forEach(btn=>btn.addEventListener('click',()=>addProduct(btn.dataset.productId)));
}
function addProduct(productId){
 const p=arr('products').find(x=>sid(x?.id)===sid(productId));if(!p)return;
 const inv=currentInvoice(),pr=priceFor(p,inv),add=document.getElementById('hlgbNoteEditAdd9414');if(!add)return alert('Botão de inclusão ainda não carregou.');
 const before=document.querySelectorAll('.hlgb-note-edit-row9414').length;add.click();
 setTimeout(()=>{
  const rows=[...document.querySelectorAll('.hlgb-note-edit-row9414')],tr=rows[rows.length-1];if(!tr||rows.length<=before)return;
  const desc=tr.querySelector('.hlgb-note-edit-desc9414'),qty=tr.querySelector('.hlgb-note-edit-qty9414'),unit=tr.querySelector('.hlgb-note-edit-unit9414');
  if(desc)desc.value=productName(p);if(qty)qty.value='1';if(unit)unit.value=pr.value>0?pr.value.toFixed(2):'0.00';
  tr.dataset.productId=sid(p.id);tr.dataset.priceSource9415=pr.source;
  [desc,qty,unit].filter(Boolean).forEach(el=>el.dispatchEvent(new Event('input',{bubbles:true})));
  const input=document.getElementById('hlgbNoteProductSearch9415'),box=document.getElementById('hlgbNoteProductResults9415');if(input)input.value='';if(box)box.innerHTML='<div class="sub">'+esc(productName(p))+' incluído · '+esc(pr.label)+(pr.value>0?' '+esc(money(pr.value)):' — informe o valor')+'</div>';
  unit?.focus?.();
 },0);
}
function ensureSearch(){
 const modal=document.getElementById('modal'),tbody=document.getElementById('hlgbNoteEditItems9414');if(!modal||!tbody)return false;
 if(document.getElementById('hlgbNoteProductSearch9415'))return true;
 const inv=currentInvoice();if(!inv)return false;
 const table=tbody.closest('table'),wrap=document.createElement('div');wrap.id='hlgbNoteProductSearchWrap9415';wrap.className='panel';wrap.style.cssText='margin:12px 0;background:#faf5f8;border:1px solid #eadbe3';
 const client=sid(inv.client||inv.clientName||clientFor(inv)?.name||'-');
 wrap.innerHTML='<b>🔎 Buscar produto cadastrado</b><div class="sub" style="margin:3px 0 8px">Cliente da nota: <b>'+esc(client)+'</b>. A busca usa primeiro a precificação específica desse cliente.</div><input id="hlgbNoteProductSearch9415" type="search" autocomplete="off" placeholder="Digite nome, modelo, código ou SKU" style="width:100%"><div id="hlgbNoteProductResults9415" style="max-height:240px;overflow:auto;margin-top:7px"><div class="sub">Digite para buscar.</div></div><div class="sub" style="margin-top:7px">Se o produto não estiver cadastrado, use o botão “Adicionar produto” abaixo e digite livremente.</div>';
 table.parentElement?.insertBefore(wrap,table);
 const input=wrap.querySelector('#hlgbNoteProductSearch9415');input?.addEventListener('input',renderResults);input?.addEventListener('keydown',e=>{if(e.key==='Escape'){input.value='';renderResults()}});
 return true;
}
const observer=new MutationObserver(()=>{try{ensureSearch()}catch(e){console.warn('[HLGB '+V+'] busca produto',e)}});
try{observer.observe(document.documentElement,{childList:true,subtree:true})}catch(e){}
[200,600,1200,2400,4200].forEach(ms=>setTimeout(()=>{try{ensureSearch()}catch(e){}},ms));
window.hlgbNoteProductSearch9415={version:V,ensureSearch,resultsFor,priceFor,addProduct,currentInvoice};
window.HLGB_NOTE_PRODUCT_SEARCH=V;
console.info('[HLGB] v'+V+' busca de produto na nota com preço específico do cliente ativa');
})();