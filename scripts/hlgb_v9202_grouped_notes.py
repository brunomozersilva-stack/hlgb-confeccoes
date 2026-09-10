from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9202_START -->'; END='<!-- HLGB_V9202_END -->'
if START in s and END in s:
    a=s.index(START); b=s.index(END,a)+len(END); s=s[:a]+s[b:]
addon=r'''<!-- HLGB_V9202_START -->
<style>
#noteQueue9202{margin:14px 0}.nq9202-top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.nq9202-sub{font-size:12px;opacity:.75}.nq9202-src{font-size:11px;opacity:.7}.sendProjection9202{margin:8px 0}
</style>
<script>
(function(){
'use strict';
const clone=x=>{try{return structuredClone(x)}catch(e){return JSON.parse(JSON.stringify(x))}};
const q=v=>Math.max(0,+v||0), today=()=>new Date().toISOString().slice(0,10);
const esc2=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money2=v=>{try{return (+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+(+v||0).toFixed(2)}};
function arr(n){db[n]=Array.isArray(db[n])?db[n]:[];return db[n]}
function local(){try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}}
async function saveRow(module,row){
 if(typeof cloudEnsureFreshSession==='function'){try{await cloudEnsureFreshSession(false)}catch(e){}}
 if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravador da nuvem indisponível');
 let out=await window.hlgbRecordSaveWithRetry(module,String(row.id),clone(row),false);
 if(!out||out.applied===false)throw new Error(out?.reason||('Nuvem não confirmou '+module));return out.data||row;
}
async function loadQueue(){
 if(typeof cloudRequest!=='function')return false;
 try{let rows=await cloudRequest('hlgb_records?select=entity_id,data,deleted_at&module=eq.noteQueue&order=updated_at.asc&limit=2000',{method:'GET'});if(!Array.isArray(rows))return false;let remote=rows.filter(r=>!r.deleted_at&&r.data).map(r=>clone(r.data)),map=new Map(remote.map(x=>[String(x.id),x]));arr('noteQueue').forEach(x=>{if(x?.id!=null&&!map.has(String(x.id)))remote.push(x)});db.noteQueue=remote;local();return true}catch(e){console.warn('v92.02 fila notas',e);return false}
}
function clientForOrder(o){let c=arr('clients').find(x=>String(x.id)===String(o?.clientId));return {id:c?.id||o?.clientId||null,name:c?.name||o?.client||'Sem cliente'}}
function priceFor(cid,pid,fallback){try{if(typeof suggestedPrice==='function'){let v=+suggestedPrice(cid,pid)||0;if(v)return v}}catch(e){}let p=arr('products').find(x=>String(x.id)===String(pid));return +((p?.clientPrices||{})[String(cid)]??p?.price??fallback??0)||0}
function projectionCtx(){let keys=[...document.querySelectorAll('.projectionSelect:checked')].map(x=>x.value),out=[];keys.forEach(v=>{let [oid,key]=String(v).split('::'),o=arr('orders').find(x=>String(x.id)===String(oid));if(!o||typeof projectionItemsForOrder!=='function')return;let it=(projectionItemsForOrder(o)||[]).find(i=>String(i.key)===String(key));if(!it)return;let sv=o.projectionItems?.[it.key]||{},remaining=it.remainingQty!=null?q(it.remainingQty):Math.max(0,q(it.qty)-q(sv.invoicedQty)),queued=q(sv.noteQueuedQty),avail=Math.max(0,remaining-queued);if(avail>0)out.push({o,it,sv,avail})});return out}
window.sendProjectionToNotes9202=async function(){
 let sel=projectionCtx();if(!sel.length){alert('Selecione itens com quantidade disponível para enviar para Notas.');return}
 let clients=new Set(sel.map(x=>String(clientForOrder(x.o).id||clientForOrder(x.o).name)));if(clients.size>1){alert('Envie um cliente por vez para a fila de Notas.');return}
 let rows=sel.map((x,i)=>`<tr><td>${esc2(x.it.name||'Produto')}</td><td>${x.avail.toLocaleString('pt-BR')}</td><td><input class="pqQty9202" data-i="${i}" type="number" min="0" max="${x.avail}" value="${x.avail}"></td></tr>`).join('');
 openModal('Enviar Planejamento para Notas',`<div class="nq9202-sub">Escolha quanto de cada produto deve ficar disponível na Central de Notas. Isso ainda não cria a nota.</div><div style="overflow:auto;margin-top:10px"><table><thead><tr><th>Produto</th><th>Disponível</th><th>Enviar</th></tr></thead><tbody>${rows}</tbody></table></div><button type="button" class="primary modalSave">Enviar para Notas</button>`,async()=>{
   let created=[],orders=new Map();
   sel.forEach((x,i)=>{let amount=Math.min(x.avail,q(document.querySelector(`.pqQty9202[data-i="${i}"]`)?.value));if(!amount)return;let ci=clientForOrder(x.o),id='P-'+String(x.o.id)+'-'+String(x.it.key)+'-'+String(Date.now()+i),row={id,source:'Planejamento',orderId:x.o.id,itemKey:x.it.key,productId:x.it.productId||null,productName:x.it.name||'Produto',clientId:ci.id,clientName:ci.name,qty:amount,remainingQty:amount,unitPrice:priceFor(ci.id,x.it.productId,q(x.it.value)/(q(x.it.qty)||1)),deliveryDate:x.it.date||x.o.date||today(),status:'Aguardando nota',createdAt:new Date().toISOString()};arr('noteQueue').push(row);created.push(row);x.o.projectionItems=x.o.projectionItems||{};let sv=x.o.projectionItems[x.it.key]||{};x.o.projectionItems[x.it.key]={...sv,noteQueuedQty:q(sv.noteQueuedQty)+amount};orders.set(String(x.o.id),x.o)});
   if(!created.length){alert('Informe quantidade em pelo menos um item.');return false}local();let btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='Confirmando na nuvem…'}
   try{for(const row of created)await saveRow('noteQueue',row);for(const o of orders.values())await saveRow('orders',o);closeModal();renderQueue();alert('Itens enviados para a fila de Notas.');return true}catch(e){if(btn){btn.disabled=false;btn.textContent='Enviar para Notas'}alert('Não foi possível confirmar na nuvem: '+String(e?.message||e));return false}
 });
}
function decorateProjection(){
 let cb=document.querySelector('.projectionSelect');if(!cb)return;let panel=cb.closest('.panel')||cb.closest('section')||cb.parentElement;if(!panel)return;
 if(!panel.querySelector('.sendProjection9202')){let b=document.createElement('button');b.type='button';b.className='primary sendProjection9202';b.textContent='🧾 Enviar selecionados para Notas';b.onclick=()=>window.sendProjectionToNotes9202();panel.insertBefore(b,panel.firstChild)}
 panel.querySelectorAll('button').forEach(b=>{if(b.classList.contains('sendProjection9202'))return;let t=String(b.textContent||'').toLowerCase();if(t.includes('finalizar nota')||t.includes('finalizar esta nota'))b.style.display='none'});
}
function openRows(){return arr('noteQueue').filter(x=>x&&x.status!=='Faturado'&&q(x.remainingQty??x.qty)>0)}
function ensurePanel(){let anchor=document.getElementById('projectionNotes9200')||document.getElementById('orderNotesTable')||document.getElementById('allOrderNotesTable');if(!anchor)return false;let box=document.getElementById('noteQueue9202');if(!box){box=document.createElement('div');box.id='noteQueue9202';box.className='panel';anchor.parentElement.insertBefore(box,anchor)}return true}
function selectedQueue(){let keys=[...document.querySelectorAll('.nqSelect9202:checked')].map(x=>x.value);return openRows().filter(x=>keys.includes(String(x.id)))}
function renderQueue(){
 if(!ensurePanel())return;let list=openRows(),box=document.getElementById('noteQueue9202');let rows=list.map(x=>`<tr><td><input class="nqSelect9202" type="checkbox" value="${esc2(x.id)}"></td><td><b>${esc2(x.clientName||'Sem cliente')}</b></td><td>${esc2(x.productName||'Produto')}</td><td>${q(x.remainingQty??x.qty).toLocaleString('pt-BR')}</td><td>${money2(x.unitPrice)}</td><td>${money2(q(x.remainingQty??x.qty)*q(x.unitPrice))}</td><td>${esc2(x.deliveryDate||'')}</td><td><span class="nq9202-src">${esc2(x.source||'')}</span></td></tr>`).join('');
 box.innerHTML=`<div class="nq9202-top"><div><h3 style="margin:0">Itens aguardando nota</h3><div class="nq9202-sub">Agrupe vários produtos do mesmo cliente e gere uma única nota conforme a entrega.</div></div><button type="button" class="primary" onclick="window.groupNote9202()">Criar nota agrupada</button></div>${rows?`<div style="overflow:auto;margin-top:10px"><table><thead><tr><th></th><th>Cliente</th><th>Produto</th><th>Peças</th><th>Valor/peça</th><th>Total</th><th>Entrega</th><th>Origem</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty" style="margin-top:10px">Nenhum item aguardando nota.</div>'}`;
}
window.groupNote9202=function(){
 let sel=selectedQueue();if(!sel.length){alert('Selecione pelo menos um item.');return}let clients=new Set(sel.map(x=>String(x.clientId||x.clientName)));if(clients.size!==1){alert('Selecione somente itens do mesmo cliente para montar uma nota.');return}
 let clientId=sel[0].clientId,clientName=sel[0].clientName||'Cliente';let rows=sel.map((x,i)=>`<tr><td>${esc2(x.productName)}</td><td><input class="gQty9202" data-i="${i}" type="number" min="0" max="${q(x.remainingQty??x.qty)}" value="${q(x.remainingQty??x.qty)}"></td><td><input class="gUnit9202" data-i="${i}" type="number" min="0" step=".01" value="${q(x.unitPrice).toFixed(2)}"></td></tr>`).join('');
 openModal('Criar nota — '+esc2(clientName),`<div class="grid"><div class="field"><label>Data da nota</label><input id="gDate9202" type="date" value="${today()}"></div><div class="field"><label>Vencimento</label><input id="gDue9202" type="date" value="${today()}"></div><div class="field"><label>Condição</label><select id="gTerms9202"><option>À vista</option><option>7 dias</option><option>14 dias</option><option>21 dias</option><option>28 dias</option><option>30 dias</option><option>Cheque</option><option>Personalizado</option></select></div></div><div style="overflow:auto;margin-top:10px"><table><thead><tr><th>Produto</th><th>Qtd. nesta nota</th><th>Valor/peça</th></tr></thead><tbody>${rows}</tbody></table></div><button type="button" class="primary modalSave">Criar nota</button>`,async()=>{
   let chosen=[],total=0,totalQty=0;sel.forEach((x,i)=>{let max=q(x.remainingQty??x.qty),amount=Math.min(max,q(document.querySelector(`.gQty9202[data-i="${i}"]`)?.value)),unit=q(document.querySelector(`.gUnit9202[data-i="${i}"]`)?.value);if(amount>0){chosen.push({x,amount,unit,value:amount*unit});total+=amount*unit;totalQty+=amount}});if(!chosen.length){alert('Informe quantidade em pelo menos um item.');return false}
   let id=Date.now()+Math.floor(Math.random()*999),issue=document.getElementById('gDate9202')?.value||today(),due=document.getElementById('gDue9202')?.value||issue,terms=document.getElementById('gTerms9202')?.value||'À vista';let inv={id,client:clientName,clientId,items:chosen.map(c=>({orderId:c.x.orderId||null,itemKey:c.x.itemKey||null,productName:c.x.productName,productId:c.x.productId||null,deliveredAt:issue,qty:c.amount,unitPrice:c.unit,value:c.value,source:c.x.source,sourceQueueId:c.x.id,sourceKey:c.x.id})),date:issue,issueDate:issue,dueDate:due,value:+total.toFixed(2),terms,status:'Pendente',paid:0,remaining:+total.toFixed(2),paymentHistory:[],createdAt:new Date().toISOString(),groupedV9202:true};let fin={id:id+1,type:'Receber',desc:`Nota — ${clientName} — ${chosen.map(c=>c.x.productName).join(', ')}`,value:inv.value,status:'Pendente',paid:0,remaining:inv.value,date:due,dueDate:due,issueDate:issue,paymentTerms:terms,clientId,clientName,projectionInvoiceId:id,createdAt:new Date().toISOString()};arr('projectionInvoices').push(inv);arr('finance').push(fin);
   let orders=new Map();chosen.forEach(c=>{let x=c.x;x.remainingQty=Math.max(0,q(x.remainingQty??x.qty)-c.amount);x.status=x.remainingQty<=0?'Faturado':'Parcial';x.lastInvoiceId=id;x.updatedAt=new Date().toISOString();if(x.source==='Planejamento'&&x.orderId!=null){let o=arr('orders').find(z=>String(z.id)===String(x.orderId));if(o){o.projectionItems=o.projectionItems||{};let sv=o.projectionItems[x.itemKey]||{},prev=q(sv.invoicedQty);o.projectionItems[x.itemKey]={...sv,invoicedQty:prev+c.amount,invoiced:prev+c.amount>=q((typeof projectionItemsForOrder==='function'?(projectionItemsForOrder(o)||[]).find(i=>String(i.key)===String(x.itemKey))?.qty:0)||prev+c.amount),noteQueuedQty:Math.max(0,q(sv.noteQueuedQty)-c.amount),invoiceIds:[...new Set([...(sv.invoiceIds||[]),id])]};orders.set(String(o.id),o)}}});local();let btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='Confirmando na nuvem…'}
   try{await saveRow('projectionInvoices',inv);await saveRow('finance',fin);for(const c of chosen)await saveRow('noteQueue',c.x);for(const o of orders.values())await saveRow('orders',o);closeModal();renderQueue();try{window.renderNotes9200?.()}catch(e){};try{renderFinance()}catch(e){};alert(`Nota criada com ${totalQty.toLocaleString('pt-BR')} peça(s) — ${money2(total)}.`);return true}catch(e){if(btn){btn.disabled=false;btn.textContent='Criar nota'}alert('Não foi possível confirmar a nota na nuvem: '+String(e?.message||e));return false}
 });
}
window.renderNoteQueue9202=renderQueue;
const mo=new MutationObserver(()=>{decorateProjection();if(document.getElementById('projectionNotes9200')||document.getElementById('orderNotesTable'))renderQueue()});mo.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(async()=>{await loadQueue();decorateProjection();renderQueue()},700);setTimeout(()=>{decorateProjection();renderQueue()},1900);
console.log('[HLGB] v92.02 planejamento/fila/notas agrupadas carregado');
})();
</script>
<!-- HLGB_V9202_END -->'''
pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('v92.01','v92.02')
p.write_text(s,encoding='utf-8')
print('v92.02 aplicada',len(s))
