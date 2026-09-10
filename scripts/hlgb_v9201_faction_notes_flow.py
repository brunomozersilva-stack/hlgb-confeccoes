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
const clone=x=>{try{return structuredClone(x)}catch(e){return JSON.parse(JSON.stringify(x))}};
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
function qtyDone(f){return +f.done||+f.returned||0}
function queuedQty(f){return +f.sentToNotesQty||0}
function pendingQty(f){return Math.max(0,qtyDone(f)-queuedQty(f))}
function ensureClient(f){let c=(db.clients||[]).find(x=>String(x.id)===String(f.clientId));if(c)return c;let o=(db.orders||[]).find(x=>String(x.id)===String(f.orderId));if(o){c=(db.clients||[]).find(x=>String(x.id)===String(o.clientId));if(c)return c;c=(db.clients||[]).find(x=>String(x.name||'').toLowerCase()===String(o.client||'').toLowerCase());if(c)return c}return (db.clients||[]).find(x=>String(x.name||'').toLowerCase()===String(f.client||'').toLowerCase())||null}
async function saveRow9201(module,row){
  if(typeof cloudEnsureFreshSession==='function'){try{await cloudEnsureFreshSession(false)}catch(e){}}
  if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravador da nuvem indisponível');
  let out=await window.hlgbRecordSaveWithRetry(module,String(row.id),clone(row),false);
  if(!out||out.applied===false)throw new Error(out?.reason||('Nuvem não confirmou '+module));
  return out.data||row;
}
function local9201(){try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}}
window.sendFactionDeliveryToNotes9201=function(id){
 const f=(db.factions||[]).find(x=>String(x.id)===String(id));if(!f)return;
 const q=pendingQty(f);if(q<=0){alert('Não há peças novas desta facção para enviar ao sistema de Notas.');return}
 const client=ensureClient(f);if(!client){alert('Defina um cliente para esta entrega antes de enviar para Notas.');return}
 const product=(db.products||[]).find(x=>String(x.id)===String(f.productId));
 const productName=product?.name||f.description||'Produto';
 const price=+((product?.clientPrices||{})[String(client.id)]??product?.price??0)||0;
 openModal('Enviar para Notas',`<div class="cards"><div class="card"><small>Facção</small><strong>${esc(f.name||'')}</strong></div><div class="card"><small>Produto</small><strong>${esc(productName)}</strong></div><div class="card"><small>Peças disponíveis</small><strong>${q.toLocaleString('pt-BR')}</strong></div></div><div class="grid" style="margin-top:12px"><div class="field"><label>Cliente</label><input value="${esc(client.name)}" disabled></div><div class="field"><label>Quantidade para a fila de Notas</label><input id="fnQty9201" type="number" min="1" max="${q}" value="${q}"></div><div class="field"><label>Valor por peça sugerido</label><input id="fnPrice9201" type="number" min="0" step="0.01" value="${price.toFixed(2)}"></div><div class="field"><label>Data da entrega</label><input id="fnDate9201" type="date" value="${f.lastDeliveryAt||f.deliveryDate||new Date().toISOString().slice(0,10)}"></div></div><div class="sub">Esta ação apenas coloca as peças na fila da Central de Notas. A nota será criada depois, junto com outros produtos do mesmo cliente se você quiser.</div><button type="button" class="primary modalSave">Enviar para Notas</button>`,async()=>{
   const amount=Math.max(0,Math.min(q,+document.getElementById('fnQty9201')?.value||0));if(!amount){alert('Informe a quantidade.');return false}
   const unit=+document.getElementById('fnPrice9201')?.value||0;
   const date=document.getElementById('fnDate9201')?.value||new Date().toISOString().slice(0,10);
   db.noteQueue=Array.isArray(db.noteQueue)?db.noteQueue:[];
   const qid='F-'+String(f.id)+'-'+String(Date.now());
   const row={id:qid,source:'Facção',sourceFactionId:f.id,orderId:f.orderId||null,productId:f.productId||null,productName,clientId:client.id,clientName:client.name,qty:amount,remainingQty:amount,unitPrice:unit,deliveryDate:date,status:'Aguardando nota',createdAt:new Date().toISOString()};
   db.noteQueue.push(row);f.sentToNotesQty=queuedQty(f)+amount;f.sentToNotesAt=new Date().toISOString();
   local9201();
   let btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='Confirmando na nuvem…'}
   try{await saveRow9201('noteQueue',row);await saveRow9201('factions',f);closeModal();try{window.renderNoteQueue9202?.()}catch(e){};alert('Entrega enviada para a fila de Notas.');return true}catch(e){if(btn){btn.disabled=false;btn.textContent='Enviar para Notas'}alert('Não foi possível confirmar o envio na nuvem: '+String(e?.message||e));return false}
 });
}
function decorate(){
 const rows=document.querySelectorAll('button[onclick*="registerFactionDelivery935"]');
 rows.forEach(btn=>{const m=String(btn.getAttribute('onclick')||'').match(/registerFactionDelivery935\(([^)]+)\)/);if(!m)return;const id=String(m[1]).replace(/[\"']/g,'').trim();const f=(db.factions||[]).find(x=>String(x.id)===id);if(!f||pendingQty(f)<=0)return;const td=btn.parentElement;if(!td||td.querySelector('.toNotes9201'))return;const b=document.createElement('button');b.className='secondary toNotes9201';b.type='button';b.textContent='🧾 Enviar para Notas';b.onclick=()=>window.sendFactionDeliveryToNotes9201(id);td.appendChild(document.createTextNode(' '));td.appendChild(b)});
}
const mo=new MutationObserver(decorate);mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(decorate,600);setTimeout(decorate,1800);
console.log('[HLGB] v92.01 facção -> fila de notas carregado');
})();
</script>
<!-- HLGB_V9201_END -->'''
pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('v92.00','v92.01')
p.write_text(s,encoding='utf-8')
print('v92.01 aplicada',len(s))
