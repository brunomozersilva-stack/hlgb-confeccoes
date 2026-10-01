/* HLGB — ajustes solicitados 2026-10-01
   1) preço específico do cliente -> fallback para preço padrão do produto
   2) projeção por produto não bloqueia quando existe preço padrão válido
   3) ações da ficha técnica em layout compacto
   4) nota finalizada cria/atualiza lançamento no Hub na data correta, sem duplicar */
(function(){
'use strict';
const V='2026.10.01-user-fixes-v1';
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function product(pid){return arr('products').find(p=>sid(p?.id)===sid(pid))||null}
function client(cid,name){
  return arr('clients').find(c=>(cid&&sid(c?.id)===sid(cid))||(name&&norm(c?.name)===norm(name)))||null;
}
function orderById(id){return arr('orders').find(o=>sid(o?.id)===sid(id))||null}
function specificClientPrice(pid,cid,cname){
  const c=client(cid,cname),p=product(pid);
  const cp=q(c?.prices?.[sid(pid)]);
  if(cp>0)return cp;
  const map=p?.clientPrices&&typeof p.clientPrices==='object'?p.clientPrices:{};
  const pv=q(map[sid(cid)]??map[cname]??map[norm(cname)]);
  return pv>0?pv:0;
}
function canonicalSalePrice(pid,cid,cname,order,item){
  const specific=specificClientPrice(pid,cid,cname);
  if(specific>0)return specific;
  // preço registrado no item/pedido é aceito como preço já resolvido do pedido
  const itemPrice=q(item?.unitPrice);
  if(itemPrice>0)return itemPrice;
  if(order&&Array.isArray(order.grade)){
    const rows=order.grade.filter(g=>sid(g?.productId)===sid(pid)&&q(g?.unitPrice)>0);
    if(rows.length){
      const qty=rows.reduce((s,x)=>s+q(x?.qty),0),total=rows.reduce((s,x)=>s+q(x?.qty)*q(x?.unitPrice),0);
      if(qty>0&&total>0)return total/qty;
      if(q(rows[0]?.unitPrice)>0)return q(rows[0].unitPrice);
    }
  }
  // regra principal solicitada: sem preço especial, usar o preço padrão do produto
  return q(product(pid)?.price);
}
window.hlgbResolveSalePrice=function(productId,clientId,clientName,order,item){
  return canonicalSalePrice(productId,clientId,clientName,order,item);
};

function patchProjectionItems(){
  const fn=window.projectionItemsForOrder;
  if(typeof fn!=='function'||fn.__hlgbPriceFallback20261001)return;
  const wrapped=function(order){
    const rows=fn.apply(this,arguments);
    if(!Array.isArray(rows))return rows;
    return rows.map(it=>{
      const pid=it?.productId||it?.key,price=canonicalSalePrice(pid,order?.clientId,it?.clientName||order?.client,order,it);
      if(price<=0||q(it?.unitPrice)>0)return it;
      return {...it,unitPrice:price,value:q(it?.qty)*price,hlgbPriceFallback:'product-default'};
    });
  };
  wrapped.__hlgbPriceFallback20261001=true;wrapped.__original=fn;window.projectionItemsForOrder=wrapped;
}
function patchProjectionValue(){
  const fn=window.projectionDeliverableValue;
  if(typeof fn!=='function'||fn.__hlgbPriceFallback20261001)return;
  const wrapped=function(order,item){
    const old=q(fn.apply(this,arguments));if(old>0)return old;
    const qty=typeof window.projectionDeliverableQty==='function'?q(window.projectionDeliverableQty(order,item)):q(item?.qty);
    const price=canonicalSalePrice(item?.productId||item?.key,order?.clientId,item?.clientName||order?.client,order,item);
    return qty>0&&price>0?qty*price:old;
  };
  wrapped.__hlgbPriceFallback20261001=true;wrapped.__original=fn;window.projectionDeliverableValue=wrapped;
}

function compactProductActions(){
  const tables=[...document.querySelectorAll('table')];
  for(const table of tables){
    const heads=[...table.querySelectorAll('thead th')];
    const actionIndex=heads.findIndex(h=>norm(h.textContent)==='acoes');
    const productIndex=heads.findIndex(h=>norm(h.textContent)==='produto');
    if(actionIndex<0||productIndex<0)continue;
    table.classList.add('hlgb-product-table-compact');
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const cell=tr.children?.[actionIndex];if(cell)cell.classList.add('hlgb-product-actions');
    });
  }
}
function injectCompactCss(){
  if(document.getElementById('hlgbProductCompactStyle'))return;
  const st=document.createElement('style');st.id='hlgbProductCompactStyle';
  st.textContent='.hlgb-product-table-compact td{vertical-align:top}.hlgb-product-table-compact .hlgb-product-actions{min-width:205px;display:grid!important;grid-template-columns:repeat(2,minmax(88px,1fr));gap:4px!important;align-content:start}.hlgb-product-table-compact .hlgb-product-actions button{margin:0!important;width:100%!important;min-height:32px!important;padding:5px 8px!important;white-space:normal}.hlgb-product-table-compact tbody tr{height:auto!important}';
  document.head.appendChild(st);
}

function visibleModal(){
  return [...document.querySelectorAll('.modalbox')].reverse().find(m=>{try{const s=getComputedStyle(m);return s.display!=='none'&&s.visibility!=='hidden'}catch(e){return true}})||null;
}
function fieldByLabel(modal,needle){
  const n=norm(needle);
  const fields=[...modal.querySelectorAll('.field,label')];
  for(const x of fields){
    const label=x.matches('label')?x:x.querySelector('label');
    if(label&&norm(label.textContent).includes(n)){
      if(x.matches('label'))return x.parentElement?.querySelector('input,select,textarea')||null;
      return x.querySelector('input,select,textarea')||null;
    }
  }
  return null;
}
function isInvoiceModal(modal){
  if(!modal)return false;
  const title=norm(modal.querySelector('h1,h2,h3,.modalTitle')?.textContent||modal.textContent.slice(0,180));
  return /(nota|fatur|finaliz)/.test(title)&&!!fieldByLabel(modal,'vencimento');
}
function injectPaymentChoice(modal){
  if(!isInvoiceModal(modal)||modal.querySelector('#hlgbInvoicePaymentMode'))return;
  const due=fieldByLabel(modal,'vencimento'),box=document.createElement('div');
  box.className='field hlgb-invoice-payment-mode';
  box.innerHTML='<label>Pagamento</label><select id="hlgbInvoicePaymentMode"><option value="prazo">A prazo</option><option value="ato">Pago no ato</option></select><div class="sub">A prazo: entra no Hub na data do vencimento. Pago no ato: entra como realizado na data do pagamento.</div>';
  const host=due?.closest('.field')||due?.parentElement;
  if(host)host.insertAdjacentElement('afterend',box);else modal.prepend(box);
}
const linkedInvoiceIds=new Set();
function invoiceIds(){return new Set(arr('projectionInvoices').map(x=>sid(x?.id)))}
function newestNewInvoice(before){
  const rows=arr('projectionInvoices').filter(x=>!before.has(sid(x?.id)));
  return rows.sort((a,b)=>sid(b?.createdAt||b?.updatedAt||'').localeCompare(sid(a?.createdAt||a?.updatedAt||'')))[0]||null;
}
async function syncInvoiceToHub(inv,mode){
  if(!inv||!inv.id||typeof window.hlgbHubSaveConfirmed!=='function')return false;
  const sourceId=sid(inv.id),existing=arr('hubFinanceEntries').find(e=>sid(e?.sourceType)==='projectionInvoice'&&sid(e?.sourceId)===sourceId);
  const today=new Date().toISOString().slice(0,10);
  const due=sid(inv?.dueDate||'').slice(0,10),issue=sid(inv?.issueDate||inv?.date||today).slice(0,10)||today;
  const paid=mode==='ato',date=paid?issue:due;
  if(!date)return false;
  const value=q(inv?.value),who=inv?.client||inv?.sourceClient||'Cliente';
  const base=existing||{};
  const row={
    ...base,
    id:existing?.id||('projectionInvoice:'+sourceId),
    flow:'Entrada',
    description:'Nota '+sourceId+' · '+who,
    person:who,
    category:base.category||'Vendas',
    value,
    date,
    status:paid?'Realizado':'Previsto',
    realizedAt:paid?issue:'',
    origin:'Nota',
    sourceType:'projectionInvoice',
    sourceId,
    note:'Lançamento automático da nota. '+(paid?'Pago no ato.':'A prazo.'),
    createdAt:base.createdAt||new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
  await window.hlgbHubSaveConfirmed(row,false);
  try{window.renderHubFinance?.()}catch(e){}
  return true;
}
function watchInvoiceSave(){
  document.addEventListener('click',function(e){
    const b=e.target?.closest?.('button');if(!b)return;
    const modal=b.closest('.modalbox');if(!modal||!isInvoiceModal(modal))return;
    if(!b.classList.contains('modalSave')&&!/(salvar|finalizar|confirmar)/.test(norm(b.textContent)))return;
    const before=invoiceIds(),mode=modal.querySelector('#hlgbInvoicePaymentMode')?.value||'prazo';
    [500,1200,2400].forEach(ms=>setTimeout(async()=>{
      const inv=newestNewInvoice(before),key=sid(inv?.id);if(!inv||!key||linkedInvoiceIds.has(key))return;
      linkedInvoiceIds.add(key);
      try{
        await syncInvoiceToHub(inv,mode);
      }catch(err){console.error('[HLGB '+V+'] nota -> hub',err);linkedInvoiceIds.delete(key)}
    },ms));
  },true);
}
function decorate(){
  injectCompactCss();compactProductActions();patchProjectionItems();patchProjectionValue();
  const m=visibleModal();if(m)injectPaymentChoice(m);
}
let t=null;const mo=new MutationObserver(()=>{clearTimeout(t);t=setTimeout(decorate,30)});
try{mo.observe(document.documentElement,{childList:true,subtree:true})}catch(e){}
watchInvoiceSave();
[0,200,800,1800].forEach(ms=>setTimeout(decorate,ms));
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>[200,800,1800].forEach(ms=>setTimeout(decorate,ms)),0)}catch(e){}
window.HLGB_USER_FIXES_20261001=V;
console.info('[HLGB] '+V+' carregado');
})();