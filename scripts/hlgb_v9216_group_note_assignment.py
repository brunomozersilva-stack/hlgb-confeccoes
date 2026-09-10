from pathlib import Path

src=Path('app9215.html')
out=Path('app9216.html')
s=src.read_text(encoding='utf-8')

addon=r'''<!-- HLGB_V9216_GROUP_ASSIGN_START -->
<style>
#noteQueue9202 .hlgb9216-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
#noteQueue9202 .hlgb9216-summary{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0 10px}
#noteQueue9202 .hlgb9216-summary span{padding:5px 8px;border-radius:999px;background:#fff4f8;border:1px solid #ead6df;font-size:12px}
#noteQueue9202 .hlgb9216-source{font-size:11px;color:#786b73}
</style>
<script>
(function(){
'use strict';
const clone9216=x=>{try{return structuredClone(x)}catch(e){return JSON.parse(JSON.stringify(x))}};
const qty9216=v=>Math.max(0,+v||0);
const today9216=()=>new Date().toISOString().slice(0,10);
const esc9216=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money9216=v=>{try{return (+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+(+v||0).toFixed(2)}};
function arr9216(n){db[n]=Array.isArray(db[n])?db[n]:[];return db[n]}
function product9216(id){return arr9216('products').find(p=>String(p.id)===String(id))||null}
function client9216(o){let c=arr9216('clients').find(x=>String(x.id)===String(o?.clientId));return {id:c?.id||o?.clientId||null,name:c?.name||o?.client||'Sem cliente'}}
function orderQty9216(o,pid){return (o?.grade||[]).reduce((a,g)=>String(g?.productId??'')===String(pid)?a+qty9216(g?.qty):a,0)}
function unit9216(cid,pid,fallback){try{if(typeof suggestedPrice==='function'){let v=+suggestedPrice(cid,pid)||0;if(v>0)return v}}catch(e){}let p=product9216(pid);return +((p?.clientPrices||{})[String(cid)]??p?.price??fallback??0)||0}
function actualInvoiced9216(orderId,pid){let n=0;arr9216('projectionInvoices').forEach(inv=>(inv.items||[]).forEach(i=>{if(String(i.orderId??'')===String(orderId)&&String(i.productId??'')===String(pid))n+=qty9216(i.qty)}));return n}
function invoiceHasSource9216(key){return arr9216('projectionInvoices').some(inv=>(inv.items||[]).some(i=>String(i.sourceKey||i.sourceQueueId||'')===String(key)))}
function openQueue9216(){
 return arr9216('noteQueue').filter(x=>x&&x.status!=='Faturado'&&qty9216(x.remainingQty??x.qty)>0).map(x=>({
   key:'queue:'+String(x.id),kind:'queue',sourceKey:String(x.id),source:'Fila de Notas',ref:x,
   clientId:x.clientId||null,clientName:x.clientName||'Sem cliente',productId:x.productId||null,productName:x.productName||'Produto',
   available:qty9216(x.remainingQty??x.qty),unitPrice:qty9216(x.unitPrice),date:x.deliveryDate||today9216(),orderId:x.orderId||null,itemKey:x.itemKey||null
 }));
}
function readyOrders9216(){
 let out=[];
 arr9216('orders').forEach(o=>{
   const ci=client9216(o),ids=[...new Set((o?.grade||[]).map(g=>String(g?.productId??'')).filter(Boolean))];
   ids.forEach(pid=>{
     const meta=o?.fulfillmentByProduct?.[String(pid)]||o?.fulfillmentByProduct?.[+pid]||null;
     if(!meta?.completed)return;
     const total=orderQty9216(o,pid);if(total<=0)return;
     let pitem=null;try{if(typeof projectionItemsForOrder==='function')pitem=(projectionItemsForOrder(o)||[]).find(i=>String(i.productId??'')===String(pid))||null}catch(e){}
     const sv=(pitem&&o?.projectionItems?.[pitem.key])||o?.projectionItems?.[String(pid)]||{};
     const already=Math.max(qty9216(meta.existingInvoicedQty),qty9216(meta.invoicedQty),qty9216(sv.invoicedQty),actualInvoiced9216(o.id,pid));
     const left=Math.max(0,total-already);if(left<=0)return;
     const key='ready:'+String(o.id)+':'+String(pid);if(invoiceHasSource9216(key))return;
     out.push({key,kind:'ready',sourceKey:key,source:'Pronto para nota',ref:o,meta,pitem,clientId:ci.id,clientName:ci.name,productId:pid,productName:product9216(pid)?.name||meta.product||'Produto',available:left,unitPrice:unit9216(ci.id,pid,pitem?qty9216(pitem.value)/(qty9216(pitem.qty)||1):0),date:meta.completedAt||o.date||today9216(),orderId:o.id,itemKey:pitem?.key||String(pid)});
   });
 });
 return out;
}
function faction9216(){
 let out=[];
 arr9216('factions').forEach(f=>{
   const o=arr9216('orders').find(x=>String(x.id)===String(f.orderId));const ci=client9216(o||f);
   (f.deliveryHistory||[]).forEach((h,idx)=>{
     const total=qty9216(h.qty);if(total<=0)return;
     const did=String(h.id??(h.date||'')+'-'+idx),key='faction:'+String(f.id)+':'+did;
     let invoiced=qty9216(h.invoicedQty);
     if((h.projectionInvoiceId||h.noteInvoiceId)&&invoiced<=0)invoiced=total;
     if(invoiceHasSource9216(key)&&invoiced<=0)invoiced=total;
     const left=Math.max(0,total-invoiced);if(left<=0)return;
     out.push({key,kind:'faction',sourceKey:key,source:'Entrega facção',ref:f,delivery:h,clientId:ci.id,clientName:ci.name,productId:f.productId||null,productName:product9216(f.productId)?.name||f.description||'Produto',available:left,unitPrice:unit9216(ci.id,f.productId,0),date:h.date||f.lastDeliveryAt||today9216(),orderId:f.orderId||null,itemKey:null});
   });
 });
 return out;
}
function candidates9216(){
 const list=[...openQueue9216(),...readyOrders9216(),...faction9216()],seen=new Set();
 return list.filter(x=>{const k=String(x.kind)+':'+String(x.sourceKey);if(seen.has(k))return false;seen.add(k);return true});
}
function ensureBox9216(){
 let box=document.getElementById('noteQueue9202');
 if(!box){box=document.createElement('div');box.id='noteQueue9202';box.className='panel';const host=document.getElementById('hlgbNoteAssemblyHost9215');if(host){host.innerHTML='';host.appendChild(box)}}
 return box;
}
function selected9216(){let keys=[...document.querySelectorAll('.nqSelect9202:checked')].map(x=>x.value);return candidates9216().filter(x=>keys.includes(x.key))}
function render9216(){
 const box=ensureBox9216();if(!box)return;
 const list=candidates9216(),clients=new Set(list.map(x=>String(x.clientId||x.clientName)));
 const rows=list.map(x=>`<tr><td><input class="nqSelect9202" type="checkbox" value="${esc9216(x.key)}"></td><td><b>${esc9216(x.clientName)}</b></td><td>${esc9216(x.productName)}</td><td>${x.available.toLocaleString('pt-BR')}</td><td>${money9216(x.unitPrice)}</td><td>${money9216(x.available*x.unitPrice)}</td><td>${esc9216(x.date||'')}</td><td><span class="hlgb9216-source">${esc9216(x.source)}</span></td></tr>`).join('');
 box.innerHTML=`<div class="hlgb9216-head"><div><h3 style="margin:0">Itens disponíveis para montar nota</h3><div class="sub">Marque os produtos que quer colocar juntos. Para criar uma nota agrupada, os itens precisam ser do mesmo cliente.</div></div><button type="button" class="primary" onclick="window.groupNote9202()">Criar nota agrupada</button></div><div class="hlgb9216-summary"><span><b>${list.length}</b> item(ns) disponível(is)</span><span><b>${clients.size}</b> cliente(s)</span></div>${rows?`<div style="overflow:auto"><table><thead><tr><th></th><th>Cliente</th><th>Produto</th><th>Disponível</th><th>Valor/peça</th><th>Total</th><th>Data</th><th>Origem</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty">Nenhum produto está pronto/atribuído para uma nova nota neste momento.</div>'}`;
}
async function saveRow9216(module,row){
 if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
 if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravador da nuvem indisponível');
 const r=await window.hlgbRecordSaveWithRetry(module,String(row.id),clone9216(row),false);
 if(!r||r.applied===false)throw new Error(r?.reason||('A nuvem não confirmou '+module));
 return r.data||row;
}
window.groupNote9202=function(){
 const sel=selected9216();if(!sel.length){alert('Marque pelo menos um produto na lista antes de criar a nota agrupada.');return}
 const ck=new Set(sel.map(x=>String(x.clientId||x.clientName)));if(ck.size!==1){alert('Selecione somente produtos do mesmo cliente para criar uma nota agrupada.');return}
 const clientId=sel[0].clientId,clientName=sel[0].clientName||'Cliente';
 const detail=sel.map((x,i)=>`<tr><td>${esc9216(x.productName)}<small style="display:block;color:#786b73">${esc9216(x.source)}</small></td><td><input class="gQty9216" data-i="${i}" type="number" min="0" max="${x.available}" value="${x.available}"></td><td><input class="gUnit9216" data-i="${i}" type="number" min="0" step=".01" value="${qty9216(x.unitPrice).toFixed(2)}"></td></tr>`).join('');
 openModal('Criar nota agrupada — '+esc9216(clientName),`<div class="grid"><div class="field"><label>Data da nota</label><input id="gDate9216" type="date" value="${today9216()}"></div><div class="field"><label>Vencimento</label><input id="gDue9216" type="date" value="${today9216()}"></div><div class="field"><label>Condição</label><select id="gTerms9216"><option>À vista</option><option>7 dias</option><option>14 dias</option><option>21 dias</option><option>28 dias</option><option>30 dias</option><option>Cheque</option><option>Personalizado</option></select></div></div><div style="overflow:auto;margin-top:12px"><table><thead><tr><th>Produto</th><th>Qtd. nesta nota</th><th>Valor/peça</th></tr></thead><tbody>${detail}</tbody></table></div><button type="button" class="primary modalSave">Criar nota</button>`,async()=>{
   const chosen=[];let total=0,totalQty=0;
   sel.forEach((x,i)=>{const amount=Math.min(x.available,qty9216(document.querySelector(`.gQty9216[data-i="${i}"]`)?.value));const unit=qty9216(document.querySelector(`.gUnit9216[data-i="${i}"]`)?.value);if(amount>0){chosen.push({x,amount,unit,value:amount*unit});total+=amount*unit;totalQty+=amount}});
   if(!chosen.length){alert('Informe quantidade em pelo menos um produto.');return false}
   const id=Date.now()+Math.floor(Math.random()*900),issue=document.getElementById('gDate9216')?.value||today9216(),due=document.getElementById('gDue9216')?.value||issue,terms=document.getElementById('gTerms9216')?.value||'À vista';
   const inv={id,client:clientName,clientId,items:chosen.map(c=>({orderId:c.x.orderId||null,itemKey:c.x.itemKey||null,productName:c.x.productName,productId:c.x.productId||null,deliveredAt:issue,qty:c.amount,unitPrice:c.unit,value:c.value,source:c.x.source,sourceKey:c.x.sourceKey,sourceQueueId:c.x.kind==='queue'?c.x.sourceKey:null})),date:issue,issueDate:issue,dueDate:due,value:+total.toFixed(2),terms,status:'Pendente',paid:0,remaining:+total.toFixed(2),paymentHistory:[],createdAt:new Date().toISOString(),groupedV9216:true};
   const fin={id:id+1,type:'Receber',desc:`Nota — ${clientName} — ${chosen.map(c=>c.x.productName).join(', ')}`,value:inv.value,status:'Pendente',paid:0,remaining:inv.value,date:due,dueDate:due,issueDate:issue,paymentTerms:terms,clientId,clientName,projectionInvoiceId:id,createdAt:new Date().toISOString()};
   arr9216('projectionInvoices').push(inv);arr9216('finance').push(fin);
   const orders=new Map(),factions=new Map(),queues=[];
   chosen.forEach(c=>{const x=c.x;
     if(x.kind==='queue'){const r=x.ref;r.remainingQty=Math.max(0,qty9216(r.remainingQty??r.qty)-c.amount);r.status=r.remainingQty<=0?'Faturado':'Parcial';r.lastInvoiceId=id;r.updatedAt=new Date().toISOString();queues.push(r)}
     if(x.kind==='ready'){
       const o=x.ref;o.projectionItems=o.projectionItems||{};const k=x.pitem?.key||x.itemKey||String(x.productId);const sv=o.projectionItems[k]||{};o.projectionItems[k]={...sv,invoicedQty:qty9216(sv.invoicedQty)+c.amount,invoiceIds:[...new Set([...(sv.invoiceIds||[]),id])]};
       o.fulfillmentByProduct=o.fulfillmentByProduct||{};const mk=String(x.productId),m=o.fulfillmentByProduct[mk]||x.meta||{};o.fulfillmentByProduct[mk]={...m,existingInvoicedQty:qty9216(m.existingInvoicedQty)+c.amount,invoicedQty:qty9216(m.invoicedQty)+c.amount,lastInvoiceId:id};orders.set(String(o.id),o)
     }
     if(x.kind==='faction'){
       const f=x.ref,h=x.delivery;h.invoicedQty=qty9216(h.invoicedQty)+c.amount;h.invoiceIds=[...new Set([...(h.invoiceIds||[]),id])];if(h.invoicedQty>=qty9216(h.qty)){h.projectionInvoiceId=id;h.noteInvoiceId=id}factions.set(String(f.id),f)
     }
   });
   try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}
   const btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='Confirmando na nuvem…'}
   try{
     await saveRow9216('projectionInvoices',inv);await saveRow9216('finance',fin);
     for(const r of queues)await saveRow9216('noteQueue',r);for(const o of orders.values())await saveRow9216('orders',o);for(const f of factions.values())await saveRow9216('factions',f);
     closeModal();render9216();try{window.renderNotes9214?.()}catch(e){};try{window.renderNotes9200?.()}catch(e){};try{renderFinance()}catch(e){};alert(`Nota agrupada criada com ${totalQty.toLocaleString('pt-BR')} peça(s) — ${money9216(total)}.`);return true;
   }catch(e){if(btn){btn.disabled=false;btn.textContent='Criar nota'}alert('Não foi possível confirmar a nota na nuvem: '+String(e?.message||e));return false}
 });
};
window.renderNoteQueue9202=render9216;
window.hlgbRenderGroupAssignment9216=render9216;
const oldRefresh9216=window.hlgbRefreshNotes9215;
if(typeof oldRefresh9216==='function')window.hlgbRefreshNotes9215=async function(){const r=await oldRefresh9216.apply(this,arguments);try{render9216()}catch(e){console.warn('[HLGB 92.16] montagem',e)}return r};
const oldPage9216=window.page;
if(typeof oldPage9216==='function')window.page=function(id){const r=oldPage9216.apply(this,arguments);if(String(id)==='notas')setTimeout(render9216,120);return r};
setTimeout(()=>{if(document.querySelector('#notas.page.active'))render9216()},1200);
console.log('[HLGB] v92.16 seleção e criação de nota agrupada restauradas');
})();
</script>
<!-- HLGB_V9216_GROUP_ASSIGN_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('<title>HLGB Confecções — Sistema de Gestão v92.15 Multiusuário</title>','<title>HLGB Confecções — Sistema de Gestão v92.16 Multiusuário</title>')
s=s.replace('Versão v92.15</b>','Versão v92.16</b>')
s=s.replace('<small style="font-size:10px;opacity:.8">v92.15</small>','<small style="font-size:10px;opacity:.8">v92.16</small>')
out.write_text(s,encoding='utf-8')
Path('abrir.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.16</title><script>(function(){window.location.replace('./app9216.html?v=92.16&fresh='+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>''',encoding='utf-8')
print('v92.16 preparada: itens prontos/fila/facção podem ser atribuídos a nota agrupada')
