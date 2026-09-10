from pathlib import Path

src=Path('app9215.html')
out=Path('app9216.html')
s=src.read_text(encoding='utf-8')

addon=r'''<!-- HLGB_V9216_READY_ASSEMBLY_START -->
<style>
.hlgb9216-actions{display:flex;gap:6px;flex-wrap:wrap}.hlgb9216-actions button{white-space:nowrap}
#hlgbReadyPicker9216 table input[type="number"]{max-width:110px}
</style>
<script>
(function(){
'use strict';
const clone9216=x=>{try{return structuredClone(x)}catch(e){return JSON.parse(JSON.stringify(x))}};
const q9216=v=>Math.max(0,+v||0);
const norm9216=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const esc9216=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const today9216=()=>new Date().toISOString().slice(0,10);
function orderNo9216(o){try{return typeof displayOrderNumber==='function'?displayOrderNumber(o):(o?.orderNumber||o?.id||'-')}catch(e){return o?.orderNumber||o?.id||'-'}}
function product9216(pid){return (db.products||[]).find(p=>String(p.id)===String(pid))||null}
function openQueue9216(){return (db.noteQueue||[]).filter(x=>x&&x.status!=='Faturado'&&q9216(x.remainingQty??x.qty)>0)}
function queuedFor9216(orderId,pid){return openQueue9216().filter(x=>String(x.readyOrderId||'')===String(orderId)&&String(x.productId||'')===String(pid)).reduce((a,x)=>a+q9216(x.remainingQty??x.qty),0)}
function readyItems9216(){
  const out=[];
  (db.orders||[]).forEach(o=>{
    if(norm9216(o?.status)!=='aguardando nota'&&!o?.fulfillmentByProduct)return;
    const pids=[...new Set((o?.grade||[]).map(g=>String(g?.productId??'')).filter(Boolean))];
    pids.forEach(pid=>{
      const meta=o?.fulfillmentByProduct?.[String(pid)]||null;if(!meta?.completed)return;
      const grades=(o?.grade||[]).filter(g=>String(g?.productId??'')===String(pid));
      const qty=grades.reduce((a,g)=>a+q9216(g?.qty),0);if(!qty)return;
      const src=(db.orders||[]).find(x=>String(x.id)===String(meta.sourceOrderId||''))||o;
      let spi=src?.projectionItems?.[String(pid)]||src?.projectionItems?.[+pid]||null;
      if(!spi&&typeof projectionItemsForOrder==='function'){
        try{const it=(projectionItemsForOrder(src)||[]).find(i=>String(i.productId||i.key||'')===String(pid));if(it)spi=src?.projectionItems?.[String(it.key)]||{invoicedQty:q9216(it.invoicedQty)};}catch(e){}
      }
      const already=Math.min(qty,Math.max(q9216(meta.existingInvoicedQty),q9216(spi?.invoicedQty)));
      const queued=queuedFor9216(o.id,pid);
      const left=Math.max(0,qty-already-queued);
      const p=product9216(pid);
      let unit=q9216(grades.find(g=>q9216(g?.unitPrice)>0)?.unitPrice);
      if(!unit&&typeof suggestedPrice==='function'){try{unit=q9216(suggestedPrice(o.clientId,pid))}catch(e){}}
      if(!unit)unit=q9216(p?.clientPrices?.[String(o.clientId)]??p?.price);
      out.push({o,pid,meta,src,qty,already,queued,left,name:p?.name||meta.product||'Produto',unit});
    });
  });
  return out;
}
async function saveQueue9216(row){
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravador da nuvem indisponível');
  const r=await window.hlgbRecordSaveWithRetry('noteQueue',String(row.id),clone9216(row),false);
  if(!r||r.applied===false)throw new Error(r?.reason||'A nuvem não confirmou o item');
  db.noteQueue=Array.isArray(db.noteQueue)?db.noteQueue:[];
  const idx=db.noteQueue.findIndex(x=>String(x.id)===String(row.id));
  if(idx>=0)db.noteQueue[idx]=r.data||row;else db.noteQueue.push(r.data||row);
  try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){}
  return r.data||row;
}
function decorateReady9216(){
  document.querySelectorAll('#hlgbReadyNote9196Table .hlgb9196-ready').forEach(row=>{
    if(row.querySelector('.hlgb9216-add'))return;
    const old=row.querySelector('button[onclick*="hlgbOpenReadyProjection9196"]');if(!old)return;
    const m=String(old.getAttribute('onclick')||'').match(/hlgbOpenReadyProjection9196\(['\"]([^'\"]+)['\"],['\"]([^'\"]+)['\"]\)/);if(!m)return;
    const orderId=m[1],pid=m[2],item=readyItems9216().find(x=>String(x.o.id)===String(orderId)&&String(x.pid)===String(pid));
    const wrap=document.createElement('div');wrap.className='hlgb9216-actions';
    old.parentNode.insertBefore(wrap,old);wrap.appendChild(old);
    const b=document.createElement('button');b.type='button';b.className='primary hlgb9216-add';
    b.textContent=item&&item.left>0?'➕ Adicionar à montagem':(item&&item.queued>0?'✓ Já na montagem':'Sem saldo');
    b.disabled=!(item&&item.left>0);b.onclick=()=>window.hlgbAddReadyToAssembly9216(orderId,pid);
    wrap.insertBefore(b,old);
  });
}
async function addRows9216(items,amounts){
  const created=[];
  for(let i=0;i<items.length;i++){
    const x=items[i],amount=Math.min(x.left,q9216(amounts[i]));if(amount<=0)continue;
    const id='R-'+String(x.o.id)+'-'+String(x.pid)+'-'+String(Date.now()+i);
    const row={id,source:'Planejamento',origin:'Prontos para nota',readyOrderId:x.o.id,sourceOrderId:x.src.id,orderId:x.src.id,itemKey:String(x.pid),productId:x.pid,productName:x.name,clientId:x.o.clientId||null,clientName:x.o.client||'Sem cliente',qty:amount,remainingQty:amount,unitPrice:x.unit,deliveryDate:x.meta?.completedAt||today9216(),status:'Aguardando nota',createdAt:new Date().toISOString(),fromReadyNote:true};
    await saveQueue9216(row);created.push(row);
  }
  return created;
}
window.hlgbAddReadyToAssembly9216=async function(orderId,pid){
  const x=readyItems9216().find(z=>String(z.o.id)===String(orderId)&&String(z.pid)===String(pid));
  if(!x||x.left<=0){alert('Este produto não tem saldo disponível para adicionar à montagem.');return}
  openModal('Adicionar à montagem de notas',`<div class="panel" style="margin-top:0"><b>Pedido #${esc9216(orderNo9216(x.o))} — ${esc9216(x.o.client||'')}</b><div class="sub">${esc9216(x.name)} · saldo disponível: ${x.left.toLocaleString('pt-BR')} peça(s)</div></div><div class="grid"><div class="field"><label>Quantidade para esta montagem</label><input id="readyQty9216" type="number" min="1" max="${x.left}" step="1" value="${x.left}"></div><div class="field"><label>Valor por peça</label><input value="${x.unit.toFixed(2)}" disabled></div></div><button type="button" class="primary modalSave">Adicionar à montagem</button>`,async()=>{
    const amount=Math.min(x.left,q9216(document.getElementById('readyQty9216')?.value));if(amount<=0){alert('Informe uma quantidade válida.');return false}
    const btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='Salvando na nuvem…'}
    try{const created=await addRows9216([x],[amount]);closeModal();if(typeof window.hlgbRefreshNotes9215==='function')await window.hlgbRefreshNotes9215(false);else if(typeof window.renderNoteQueue9202==='function')window.renderNoteQueue9202();decorateReady9216();alert(created.length?'Produto adicionado à montagem. Agora marque-o na lista e clique em Criar nota agrupada.':'Nada foi adicionado.');return true}catch(e){if(btn){btn.disabled=false;btn.textContent='Adicionar à montagem'}alert('Não foi possível adicionar à montagem: '+String(e?.message||e));return false}
  });
};
window.hlgbOpenReadyPicker9216=function(){
  const items=readyItems9216().filter(x=>x.left>0);
  if(!items.length){alert('Não há produtos prontos com saldo livre para adicionar. Se já houver itens na montagem, marque as caixas deles antes de criar a nota.');return}
  const rows=items.map((x,i)=>`<tr><td><input class="readyPick9216" data-i="${i}" type="checkbox"></td><td><b>${esc9216(x.o.client||'-')}</b><div class="sub">Pedido #${esc9216(orderNo9216(x.o))}</div></td><td>${esc9216(x.name)}</td><td>${x.left.toLocaleString('pt-BR')}</td><td><input class="readyPickQty9216" data-i="${i}" type="number" min="0" max="${x.left}" step="1" value="${x.left}"></td><td>${x.unit.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td></tr>`).join('');
  openModal('Escolher produtos para a nota agrupada',`<div class="sub">Marque os produtos que quer juntar. Produtos de clientes diferentes não podem entrar na mesma nota.</div><div id="hlgbReadyPicker9216" style="overflow:auto;margin-top:10px"><table><thead><tr><th></th><th>Cliente / pedido</th><th>Produto</th><th>Disponível</th><th>Adicionar</th><th>Valor/peça</th></tr></thead><tbody>${rows}</tbody></table></div><button type="button" class="primary modalSave">Adicionar e montar a nota</button>`,async()=>{
    const chosen=[];const amounts=[];
    [...document.querySelectorAll('.readyPick9216:checked')].forEach(cb=>{const i=+cb.dataset.i;chosen.push(items[i]);amounts.push(q9216(document.querySelector(`.readyPickQty9216[data-i="${i}"]`)?.value))});
    if(!chosen.length){alert('Marque pelo menos um produto.');return false}
    const clients=new Set(chosen.map(x=>String(x.o.clientId||x.o.client||'')));if(clients.size>1){alert('Escolha produtos de um único cliente por vez.');return false}
    const btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='Salvando na nuvem…'}
    try{
      const created=await addRows9216(chosen,amounts);if(!created.length)throw new Error('Nenhuma quantidade válida foi informada');
      closeModal();if(typeof window.hlgbRefreshNotes9215==='function')await window.hlgbRefreshNotes9215(false);else if(typeof window.renderNoteQueue9202==='function')window.renderNoteQueue9202();
      setTimeout(()=>{created.forEach(r=>{const cb=[...document.querySelectorAll('.nqSelect9202')].find(x=>String(x.value)===String(r.id));if(cb)cb.checked=true});if(typeof oldGroup9216==='function')oldGroup9216()},80);
      return true;
    }catch(e){if(btn){btn.disabled=false;btn.textContent='Adicionar e montar a nota'}alert('Não foi possível preparar a nota: '+String(e?.message||e));return false}
  });
};
const oldGroup9216=typeof window.groupNote9202==='function'?window.groupNote9202:null;
if(oldGroup9216){
  window.groupNote9202=function(){
    const selected=document.querySelectorAll('.nqSelect9202:checked').length;
    if(selected)return oldGroup9216.apply(this,arguments);
    return window.hlgbOpenReadyPicker9216();
  };
}
const oldRefresh9216=window.hlgbRefreshNotes9215;
if(typeof oldRefresh9216==='function')window.hlgbRefreshNotes9215=async function(){const r=await oldRefresh9216.apply(this,arguments);setTimeout(decorateReady9216,20);return r};
const oldRenderQueue9216=window.renderNoteQueue9202;
if(typeof oldRenderQueue9216==='function')window.renderNoteQueue9202=function(){const r=oldRenderQueue9216.apply(this,arguments);const box=document.getElementById('noteQueue9202');if(box)box.querySelectorAll('.nq9202-src').forEach((el,i)=>{const rows=openQueue9216();const x=rows[i];if(x?.origin)el.textContent=x.origin});return r};
setTimeout(decorateReady9216,700);setTimeout(decorateReady9216,1800);
console.log('[HLGB] v92.16 produtos prontos podem ser atribuídos à montagem de notas');
})();
</script>
<!-- HLGB_V9216_READY_ASSEMBLY_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('<title>HLGB Confecções — Sistema de Gestão v92.15 Multiusuário</title>','<title>HLGB Confecções — Sistema de Gestão v92.16 Multiusuário</title>')
s=s.replace('Versão v92.15</b>','Versão v92.16</b>')
s=s.replace('<small style="font-size:10px;opacity:.8">v92.15</small>','<small style="font-size:10px;opacity:.8">v92.16</small>')
out.write_text(s,encoding='utf-8')

Path('abrir.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.16</title><script>(function(){window.location.replace('./app9216.html?v=92.16&fresh='+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>''',encoding='utf-8')
print('v92.16 preparada: produtos prontos podem entrar na montagem e Criar nota agrupada abre seletor quando necessário')
