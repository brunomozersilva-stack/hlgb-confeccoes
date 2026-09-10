from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9201_START -->'; END='<!-- HLGB_V9201_END -->'
if START in s and END in s:
    a=s.index(START); b=s.index(END,a)+len(END); s=s[:a]+s[b:]
addon=r'''<!-- HLGB_V9201_START -->
<style>
#noteQueue9201{margin:14px 0}.nq9201-head{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap}.nq9201-source{font-size:11px;opacity:.7}.nq9201-client{font-weight:700}.nq9201-summary{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0}
</style>
<script>
(function(){
'use strict';
const clone=x=>{try{return structuredClone(x)}catch(e){return JSON.parse(JSON.stringify(x))}};
const escq=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const q=v=>Math.max(0,+v||0), today=()=>new Date().toISOString().slice(0,10);
const moneyq=v=>{try{return (+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+(+v||0).toFixed(2)}};
function arr(n){db[n]=Array.isArray(db[n])?db[n]:[];return db[n]}
async function saveRow(module,row){
  if(typeof cloudEnsureFreshSession==='function'){try{await cloudEnsureFreshSession(false)}catch(e){}}
  if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravador da nuvem indisponível');
  const out=await window.hlgbRecordSaveWithRetry(module,String(row.id),clone(row),false);
  if(!out||out.applied===false)throw new Error(out?.reason||('Nuvem não confirmou '+module));
  return out.data||row;
}
function local(){try{if(typeof localSaveOnly==='function')localSaveOnly();else localStorage.setItem('hlgb_db',JSON.stringify(db))}catch(e){}}
function productName(pid){return (arr('products').find(p=>String(p.id)===String(pid))||{}).name||'Produto'}
function clientForOrder(o){let c=arr('clients').find(x=>String(x.id)===String(o?.clientId));return {id:c?.id||o?.clientId||null,name:c?.name||o?.client||'Sem cliente'}}
function unitPrice(clientId,productId,fallback){
  try{if(typeof suggestedPrice==='function'){let v=+suggestedPrice(clientId,productId)||0;if(v)return v}}catch(e){}
  try{if(typeof salePrice940==='function'){let v=+salePrice940(productId,clientId)||0;if(v)return v}}catch(e){}
  return +fallback||0;
}
function alreadyInvoicedSource(key){return arr('projectionInvoices').some(inv=>(inv.items||[]).some(i=>String(i.sourceKey||'')===String(key)))}
function projectionCandidates(){
  let out=[];
  arr('orders').forEach(o=>{
    if(typeof projectionItemsForOrder!=='function')return;
    let ci=clientForOrder(o);
    let items=[];try{items=projectionItemsForOrder(o)||[]}catch(e){return}
    items.forEach(it=>{
      let total=q(it.qty), invoiced=q(it.invoicedQty), remaining=it.remainingQty!=null?q(it.remainingQty):Math.max(0,total-invoiced);
      if(remaining<=0)return;
      let key='projection:'+o.id+':'+String(it.key);
      if(alreadyInvoicedSource(key))return;
      let fallback=total>0?q(it.value)/total:0;
      out.push({source:'Planejamento',sourceKey:key,orderId:o.id,itemKey:it.key,productId:it.productId||null,productName:it.name||productName(it.productId),clientId:ci.id,clientName:ci.name,qty:remaining,unitPrice:unitPrice(ci.id,it.productId,fallback),date:it.date||o.date||today(),ctx:{o,it}})
    })
  });
  return out;
}
function factionCandidates(){
  let out=[];
  arr('factions').forEach(f=>{
    let o=arr('orders').find(x=>String(x.id)===String(f.orderId));let ci=clientForOrder(o||f);
    (f.deliveryHistory||[]).forEach(h=>{
      if(q(h.qty)<=0)return;let key='faction:'+f.id+':'+String(h.id||h.date+'-'+h.qty);
      if(h.projectionInvoiceId||h.noteInvoiceId||alreadyInvoicedSource(key))return;
      out.push({source:'Facção',sourceKey:key,factionId:f.id,deliveryId:h.id||null,orderId:f.orderId||null,productId:f.productId||null,productName:productName(f.productId)||f.description||'Produto',clientId:ci.id,clientName:ci.name,qty:q(h.qty),unitPrice:unitPrice(ci.id,f.productId,0),date:h.date||f.lastDeliveryAt||today(),ctx:{f,h}})
    })
  });
  return out;
}
function candidates(){
  let a=[...projectionCandidates(),...factionCandidates()],seen=new Set();
  return a.filter(x=>{if(seen.has(x.sourceKey))return false;seen.add(x.sourceKey);return true})
}
function ensurePanel(){
  const anchor=document.getElementById('projectionNotes9200')||document.getElementById('orderNotesTable')||document.getElementById('allOrderNotesTable');if(!anchor)return false;
  let box=document.getElementById('noteQueue9201');if(!box){box=document.createElement('div');box.id='noteQueue9201';box.className='panel';anchor.parentElement.insertBefore(box,anchor)}return true;
}
function selected(){let all=candidates(),keys=[...document.querySelectorAll('.nqSelect9201:checked')].map(x=>x.value);return all.filter(x=>keys.includes(x.sourceKey))}
function render(){
  if(!ensurePanel())return;let list=candidates(),box=document.getElementById('noteQueue9201');
  let byClient={};list.forEach(x=>{let k=String(x.clientId||x.clientName);(byClient[k]=byClient[k]||[]).push(x)});
  let rows=list.map(x=>`<tr><td><input class="nqSelect9201" type="checkbox" value="${escq(x.sourceKey)}"></td><td><span class="nq9201-client">${escq(x.clientName)}</span></td><td>${escq(x.productName)}</td><td>${q(x.qty).toLocaleString('pt-BR')}</td><td>${moneyq(x.unitPrice)}</td><td>${moneyq(q(x.qty)*q(x.unitPrice))}</td><td>${escq(x.date)}</td><td><span class="nq9201-source">${escq(x.source)}</span></td></tr>`).join('');
  box.innerHTML=`<div class="nq9201-head"><div><h3 style="margin:0">Fila para montar notas</h3><div class="sub">Selecione produtos do mesmo cliente e monte uma única nota conforme for entregando.</div></div><button type="button" class="primary" onclick="window.createGroupedNote9201()">Criar nota com selecionados</button></div><div class="nq9201-summary"><span><b>${list.length}</b> item(ns) disponíveis</span><span><b>${Object.keys(byClient).length}</b> cliente(s)</span></div>${rows?`<div style="overflow:auto"><table><thead><tr><th></th><th>Cliente</th><th>Produto</th><th>Peças</th><th>Valor/peça</th><th>Total</th><th>Data</th><th>Origem</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty">Nenhum item aguardando nota.</div>'}`;
}
window.createGroupedNote9201=async function(){
  let sel=selected();if(!sel.length){alert('Selecione pelo menos um produto.');return}
  let ck=new Set(sel.map(x=>String(x.clientId||x.clientName)));if(ck.size!==1){alert('Para montar uma nota, selecione somente itens do mesmo cliente.');return}
  let clientId=sel[0].clientId,clientName=sel[0].clientName;
  let defaultDue=today();
  let detail=sel.map((x,i)=>`<tr><td>${escq(x.productName)}</td><td><input class="nqQty9201" data-i="${i}" type="number" min="0" max="${x.qty}" value="${x.qty}" step="1"></td><td><input class="nqUnit9201" data-i="${i}" type="number" min="0" step=".01" value="${q(x.unitPrice).toFixed(2)}"></td></tr>`).join('');
  openModal('Montar nota — '+escq(clientName),`<div class="grid"><div class="field"><label>Data da nota</label><input id="nqDate9201" type="date" value="${today()}"></div><div class="field"><label>Vencimento</label><input id="nqDue9201" type="date" value="${defaultDue}"></div><div class="field"><label>Condição</label><select id="nqTerms9201"><option>À vista</option><option>7 dias</option><option>14 dias</option><option>21 dias</option><option>28 dias</option><option>30 dias</option><option>Cheque</option><option>Personalizado</option></select></div></div><div style="overflow:auto;margin-top:12px"><table><thead><tr><th>Produto</th><th>Qtd. nesta nota</th><th>Valor/peça</th></tr></thead><tbody>${detail}</tbody></table></div><button type="button" class="primary modalSave">Salvar nota</button>`,async()=>{
    let items=[],total=0,totalQty=0;
    sel.forEach((x,i)=>{let qty=Math.min(q(x.qty),q(document.querySelector(`.nqQty9201[data-i="${i}"]`)?.value)),unit=q(document.querySelector(`.nqUnit9201[data-i="${i}"]`)?.value);if(qty>0){items.push({...x,qty,unitPrice:unit,value:qty*unit});total+=qty*unit;totalQty+=qty}});
    if(!items.length){alert('Informe quantidade em pelo menos um item.');return false}
    let id=Date.now()+Math.floor(Math.random()*1000),issue=document.getElementById('nqDate9201')?.value||today(),due=document.getElementById('nqDue9201')?.value||issue,terms=document.getElementById('nqTerms9201')?.value||'À vista';
    let inv={id,client:clientName,clientId,items:items.map(x=>({orderId:x.orderId||null,itemKey:x.itemKey||null,productName:x.productName,productId:x.productId||null,deliveredAt:issue,qty:x.qty,unitPrice:x.unitPrice,value:x.value,source:x.source,sourceKey:x.sourceKey})),date:issue,issueDate:issue,dueDate:due,value:+total.toFixed(2),terms,status:'Pendente',paid:0,remaining:+total.toFixed(2),paymentHistory:[],createdAt:new Date().toISOString(),noteQueueV9201:true};
    let fin={id:id+1,type:'Receber',desc:`Nota — ${clientName} — ${items.map(x=>x.productName).join(', ')}`,value:inv.value,status:'Pendente',paid:0,remaining:inv.value,date:due,dueDate:due,issueDate:issue,paymentTerms:terms,clientId,clientName,projectionInvoiceId:id,createdAt:new Date().toISOString()};
    arr('projectionInvoices').push(inv);arr('finance').push(fin);
    let touchedOrders=new Map(),touchedFactions=new Map();
    items.forEach(x=>{
      if(x.source==='Planejamento'&&x.ctx?.o&&x.ctx?.it){let o=x.ctx.o,it=x.ctx.it;o.projectionItems=o.projectionItems||{};let sv=o.projectionItems[it.key]||{},prev=sv.invoicedQty!=null?q(sv.invoicedQty):0,newQty=Math.min(q(it.qty),prev+x.qty);o.projectionItems[it.key]={...sv,date:it.date,invoicedQty:newQty,invoiced:newQty>=q(it.qty),invoiceIds:[...new Set([...(sv.invoiceIds||[]),id])],deliveryHistory:[...(sv.deliveryHistory||[]),{invoiceId:id,date:issue,qty:x.qty}]};touchedOrders.set(String(o.id),o)}
      if(x.source==='Facção'&&x.ctx?.f&&x.ctx?.h){x.ctx.h.projectionInvoiceId=id;x.ctx.h.noteInvoiceId=id;touchedFactions.set(String(x.ctx.f.id),x.ctx.f)}
    });
    local();
    let btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='Confirmando na nuvem…'}
    try{await saveRow('projectionInvoices',inv);await saveRow('finance',fin);for(const o of touchedOrders.values())await saveRow('orders',o);for(const f of touchedFactions.values())await saveRow('factions',f);closeModal();render();try{window.renderNotes9200?.()}catch(e){};try{renderFinance()}catch(e){};alert(`Nota criada: ${totalQty.toLocaleString('pt-BR')} peça(s) — ${moneyq(total)}.`);return true}catch(e){if(btn){btn.disabled=false;btn.textContent='Salvar nota'}alert('Não foi possível confirmar a nota na nuvem: '+String(e?.message||e));return false}
  });
}
window.renderNoteQueue9201=render;
const obs=new MutationObserver(()=>{if(document.getElementById('projectionNotes9200')||document.getElementById('orderNotesTable'))render()});obs.observe(document.documentElement,{subtree:true,childList:true});
setTimeout(render,700);setTimeout(render,1800);
console.log('[HLGB] v92.01 fila de notas carregada');
})();
</script>
<!-- HLGB_V9201_END -->'''
pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('v92.00','v92.01')
p.write_text(s,encoding='utf-8')
print('v92.01 aplicada',len(s))
