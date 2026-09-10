from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9201_START -->'
END='<!-- HLGB_V9201_END -->'
if START in s and END in s:
    a=s.index(START); b=s.index(END,a)+len(END); s=s[:a]+s[b:]
addon=r'''<!-- HLGB_V9201_START -->
<script>
(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
function qtyDone(f){return +f.done||+f.returned||0}
function noteQty(f){return +f.sentToNotesQty||0}
function pendingQty(f){return Math.max(0,qtyDone(f)-noteQty(f))}
function ensureClient(f){let c=(db.clients||[]).find(x=>String(x.id)===String(f.clientId));if(c)return c;return (db.clients||[]).find(x=>String(x.name||'').toLowerCase()===String(f.client||'').toLowerCase())||null}
window.sendFactionDeliveryToNotes9201=function(id){
 const f=(db.factions||[]).find(x=>String(x.id)===String(id));if(!f)return;
 const q=pendingQty(f);if(q<=0){alert('Não há peças novas desta facção para enviar ao sistema de Notas.');return}
 const client=ensureClient(f);if(!client){alert('Defina um cliente para esta entrega antes de enviar para Notas.');return}
 const product=(db.products||[]).find(x=>String(x.id)===String(f.productId));
 const productName=product?.name||f.description||'Produto';
 const price=+((product?.clientPrices||{})[String(client.id)]??product?.price??0)||0;
 openModal('Enviar para Notas',`<div class="cards"><div class="card"><small>Facção</small><strong>${esc(f.name||'')}</strong></div><div class="card"><small>Produto</small><strong>${esc(productName)}</strong></div><div class="card"><small>Peças disponíveis</small><strong>${q.toLocaleString('pt-BR')}</strong></div></div><div class="grid" style="margin-top:12px"><div class="field"><label>Cliente</label><input value="${esc(client.name)}" disabled></div><div class="field"><label>Quantidade nesta nota</label><input id="fnQty9201" type="number" min="1" max="${q}" value="${q}"></div><div class="field"><label>Valor por peça</label><input id="fnPrice9201" type="number" min="0" step="0.01" value="${price.toFixed(2)}"></div><div class="field"><label>Data da entrega</label><input id="fnDate9201" type="date" value="${f.lastDeliveryAt||f.deliveryDate||new Date().toISOString().slice(0,10)}"></div></div><div class="sub">Isso não quita a facção e não marca a nota como paga. Apenas manda as peças prontas para a Central de Notas.</div><button type="button" class="primary modalSave">Enviar para Notas</button>`,()=>{
   const amount=Math.max(0,Math.min(q,+document.getElementById('fnQty9201')?.value||0));if(!amount){alert('Informe a quantidade.');return}
   const unit=+document.getElementById('fnPrice9201')?.value||0;
   const date=document.getElementById('fnDate9201')?.value||new Date().toISOString().slice(0,10);
   db.projectionInvoices=db.projectionInvoices||[];
   const idn=Date.now();
   db.projectionInvoices.push({id:idn,client:client.name,clientId:client.id,sourceClient:f.client||client.name,items:[{orderId:f.orderId||null,itemKey:'faction-'+f.id,productName,productId:f.productId||null,projectionDate:f.deliveryDate||date,deliveredAt:date,qty:amount,unitPrice:unit,value:amount*unit,sourceFactionId:f.id}],date,issueDate:date,dueDate:date,value:amount*unit,terms:'À vista',termsDetail:'',status:'Pendente',source:'factionDelivery'});
   f.sentToNotesQty=noteQty(f)+amount;f.sentToNotesAt=new Date().toISOString();
   try{if(typeof save==='function')save()}catch(e){}
   closeModal();
   try{if(typeof window.renderNotes9200==='function')window.renderNotes9200()}catch(e){}
   alert('Entrega enviada para o sistema de Notas.');
 });
}
function decorate(){
 const rows=document.querySelectorAll('button[onclick*="registerFactionDelivery935"]');
 rows.forEach(btn=>{const m=String(btn.getAttribute('onclick')||'').match(/registerFactionDelivery935\(([^)]+)\)/);if(!m)return;const id=String(m[1]).replace(/[\"']/g,'').trim();const f=(db.factions||[]).find(x=>String(x.id)===id);if(!f||pendingQty(f)<=0)return;const td=btn.parentElement;if(!td||td.querySelector('.toNotes9201'))return;const b=document.createElement('button');b.className='secondary toNotes9201';b.type='button';b.textContent='🧾 Enviar para Notas';b.onclick=()=>window.sendFactionDeliveryToNotes9201(id);td.appendChild(document.createTextNode(' '));td.appendChild(b)});
}
const mo=new MutationObserver(decorate);mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(decorate,600);setTimeout(decorate,1800);
console.log('[HLGB] v92.01 fluxo facção -> notas carregado');
})();
</script>
<!-- HLGB_V9201_END -->'''
pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('v92.00','v92.01')
p.write_text(s,encoding='utf-8')
print('v92.01 aplicada',len(s))
