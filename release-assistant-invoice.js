/* HLGB — Assistente cria nota de cliente usando o fluxo oficial */
(function(){
'use strict';
const V='2026.10.01-assistant-invoice-v1';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const moneySafe=v=>typeof money==='function'?money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function clientFromText(text){
 const n=norm(text),rows=arr('clients').filter(c=>c?.name&&n.includes(norm(c.name))).sort((a,b)=>String(b.name||'').length-String(a.name||'').length);
 return rows[0]||null;
}
function currentClient(order,item){
 try{if(typeof projectionCurrentClient9237==='function')return projectionCurrentClient9237(order,item)}catch(e){}
 return item?.clientName||order?.client||'';
}
function unitFor(clientId,item){
 let u=0;
 try{if(item?.productId&&clientId&&typeof suggestedPrice==='function')u=+suggestedPrice(clientId,item.productId)||0}catch(e){}
 if(!u)u=q(item?.qty)>0?q(item?.value)/q(item.qty):0;
 return u;
}
function invoiceableForClient(client){
 const out=[];
 if(!client||typeof allProjectionRows!=='function')return out;
 for(const row of allProjectionRows()){
  const order=row?.order,item=row?.item;if(!order||!item)continue;
  const qty=typeof projectionDeliverableQty==='function'?q(projectionDeliverableQty(order,item)):q(item.remainingQty??item.qty);
  if(qty<=0)continue;
  const assigned=currentClient(order,item);
  if(norm(assigned)!==norm(client.name))continue;
  out.push({order,item,key:sid(order.id)+'::'+sid(item.key),available:qty,product:item.name||arr('products').find(p=>sid(p.id)===sid(item.productId))?.name||'Produto',unit:unitFor(client.id,item)});
 }
 return out;
}
function escapedRegex(s){return String(s).replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')}
function requestedQty(raw,productName){
 const n=norm(raw),p=norm(productName),pp=escapedRegex(p).replace(/\\ /g,'\\s+');
 const m1=n.match(new RegExp('(?:^|\\s)(\\d{1,7})\\s*(?:pecas|peças|unidades|un)?\\s*'+pp,'i'));
 if(m1)return q(m1[1]);
 const m2=n.match(new RegExp(pp+'\\s*(?:-|:)?\\s*(\\d{1,7})\\s*(?:pecas|peças|unidades|un)?','i'));
 return m2?q(m2[1]):0;
}
function parse(raw){
 const s=String(raw||'').trim();
 if(!/(?:fazer|criar|emitir|finalizar|montar)\s+(?:uma\s+)?nota|nota\s+(?:para|da|do)\s+/i.test(s))return null;
 const client=clientFromText(s);if(!client)return {kind:'invoice-client-missing',title:'Cliente da nota',text:'Diga o nome do cliente. Ex.: <b>“fazer nota da Gisele”</b>.'};
 const rows=invoiceableForClient(client);if(!rows.length)return {kind:'invoice-empty',title:'Sem saldo para nota',text:'Não encontrei peças disponíveis na Projeção para <b>'+escSafe(client.name)+'</b>.'};
 let anyQty=false;
 const lines=rows.map(r=>{const asked=requestedQty(s,r.product);if(asked>0)anyQty=true;return {...r,qty:asked>0?Math.min(r.available,asked):r.available}});
 const selected=anyQty?lines.filter(x=>requestedQty(s,x.product)>0):lines;
 if(!selected.length)return {kind:'invoice-empty',title:'Produtos não encontrados',text:'Encontrei saldo para '+escSafe(client.name)+', mas os produtos/quantidades falados não bateram com a Projeção.'};
 const totalQty=selected.reduce((a,x)=>a+x.qty,0),total=selected.reduce((a,x)=>a+x.qty*x.unit,0);
 return {kind:'invoice-action',title:'Nota para '+client.name,clientId:sid(client.id),clientName:client.name,items:selected,totalQty,total,
 text:'Vou usar o <b>mesmo finalizador oficial de notas do sistema</b>, para dar baixa corretamente nas quantidades e usar o preço do produto para este cliente.<br><br>'+selected.map(x=>'• <b>'+escSafe(x.product)+'</b> · '+x.qty.toLocaleString('pt-BR')+' de '+x.available.toLocaleString('pt-BR')+' disponíveis · '+moneySafe(x.unit)+'/pç').join('<br>')+'<br><br><b>Total previsto: '+totalQty.toLocaleString('pt-BR')+' peças · '+moneySafe(total)+'</b><br><br>Ao confirmar, o Assistente abrirá a nota oficial já preenchida. Confira e toque em <b>Finalizar esta nota</b>. Depois ela continuará com as mesmas opções de impressão/PDF do sistema.'};
}
function projectionNavButton(){return [...document.querySelectorAll('nav button')].find(b=>/page\(['"]projecao['"]/.test(b.getAttribute('onclick')||''))||null}
function openOfficial(a){
 if(!a||a.kind!=='invoice-action')return false;
 if(typeof page!=='function'||typeof finalizeSelectedProjection!=='function')throw new Error('O finalizador oficial de notas não está disponível.');
 closeModal?.();
 page('projecao',projectionNavButton());
 setTimeout(()=>{
   try{
    renderProjection?.();
    const wanted=new Map(a.items.map(x=>[x.key,x]));
    document.querySelectorAll('.projectionSelect').forEach(cb=>{cb.checked=wanted.has(String(cb.value))});
    const selectedDom=[...document.querySelectorAll('.projectionSelect:checked')].map(cb=>String(cb.value));
    if(!selectedDom.length)throw new Error('Os itens não apareceram na Projeção. Atualize/sincronize e tente novamente.');
    finalizeSelectedProjection();
    setTimeout(()=>{
      const client=document.getElementById('projectionInvoiceClient');if(client){client.value=sid(a.clientId);try{client.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){}}
      try{updateProjectionInvoiceClientPrices?.()}catch(e){}
      selectedDom.forEach((key,i)=>{const req=wanted.get(key),inp=document.querySelector('.projectionInvoiceQty[data-index="'+i+'"]');if(inp&&req)inp.value=Math.min(req.qty,req.available)});
      try{recalcProjectionInvoiceModal?.()}catch(e){}
    },80);
   }catch(e){alert('Não foi possível preparar a nota oficial.\n\n'+String(e?.message||e))}
 },100);
 return true;
}
function enhance(){
 if(typeof window.hlgbAssistantAsk!=='function'||window.hlgbAssistantAsk.__hlgbInvoiceV1)return;
 const base=window.hlgbAssistantAsk;
 const w=function(){
  const input=document.getElementById('hlgbAssistantInput'),out=document.getElementById('hlgbAssistantAnswer'),a=parse(input?.value||'');
  if(!a)return base.apply(this,arguments);
  if(!out)return;
  let actions='';
  if(a.kind==='invoice-action'){
    window.__hlgbAssistantInvoicePending=a;
    actions='<div class="toolbar" style="margin-top:12px"><button type="button" class="primary" onclick="hlgbAssistantOpenInvoice()">🧾 Confirmar e abrir nota oficial</button></div>';
  }
  out.innerHTML='<h3 style="margin-top:0">'+escSafe(a.title)+'</h3>'+a.text+actions;
  out.dataset.pendingKind=a.kind||'';
 };
 w.__hlgbInvoiceV1=true;w.__original=base;window.hlgbAssistantAsk=w;
}
window.hlgbAssistantOpenInvoice=function(){const a=window.__hlgbAssistantInvoicePending;if(!a)return;try{openOfficial(a);try{auditAction?.('Assistente preparou nota oficial de cliente',a.clientName+' · '+a.totalQty+' peças')}catch(e){}}catch(e){alert(String(e?.message||e))}};
window.hlgbAssistantInvoice={parse,invoiceableForClient,requestedQty,openOfficial,unitFor,currentClient};
function boot(){enhance()}try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,700),0)}catch(e){}setTimeout(boot,1200);
window.HLGB_ASSISTANT_INVOICE_GUARD=V;
console.info('[HLGB] Assistente: nota oficial por voz/texto ativa');
})();