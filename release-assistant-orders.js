/* HLGB — Assistente: criação/edição protegida de pedidos */
(function(){
'use strict';
const V='2026.10.01-assistant-orders-v1';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
const sid=v=>String(v??'');
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function canWriteOrders(){
  try{if(typeof hlgbRecordCanWrite==='function')return !!hlgbRecordCanWrite('orders')}catch(e){}
  try{if(typeof hasAccess==='function')return !!hasAccess('pedidos')}catch(e){}
  return false;
}
function orderNo(o){try{return typeof displayOrderNumber==='function'?displayOrderNumber(o):(o?.orderNumber||o?.id)}catch(e){return o?.orderNumber||o?.id}}
function findOrder(n){const s=sid(n);return arr('orders').find(o=>sid(orderNo(o))===s||sid(o?.id)===s)||null}
function clientFromText(text){
  const n=norm(text),matches=arr('clients').filter(c=>c?.name&&n.includes(norm(c.name))).sort((a,b)=>String(b.name).length-String(a.name).length);
  return matches[0]||null;
}
function productFromText(text){
  const n=norm(text),matches=arr('products').filter(p=>p?.name&&n.includes(norm(p.name))).sort((a,b)=>String(b.name).length-String(a.name).length);
  return matches[0]||null;
}
function priorityFromText(text){
  const n=norm(text);if(n.includes('urgentissimo'))return 'Urgentíssimo';if(n.includes('urgente'))return 'Urgente';if(n.includes('padrao')||n.includes('normal'))return 'Padrão';return '';
}
function dateFromText(text){
  let m=String(text||'').match(/\b(\d{4})-(\d{2})-(\d{2})\b/);if(m)return m[0];
  m=String(text||'').match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);if(m)return m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');
  return '';
}
function qtyFromText(text){
  const m=String(text||'').match(/(?:\b|^)(\d{1,6})\s*(?:pecas|peças|unidades|un\b)/i);return m?Math.max(0,+m[1]||0):0;
}
function prepareCreate(raw){
  if(!canWriteOrders())return {kind:'order-permission',title:'Sem permissão para criar pedido',text:'Seu usuário não possui permissão de Pedidos. O Assistente não pode liberar uma ação que a sua conta não pode fazer manualmente.'};
  const client=clientFromText(raw),product=productFromText(raw),priority=priorityFromText(raw),date=dateFromText(raw),qty=qtyFromText(raw);
  const bits=[];if(client)bits.push('Cliente: <b>'+client.name+'</b>');if(product)bits.push('Produto: <b>'+product.name+'</b>');if(qty)bits.push('Quantidade mencionada: <b>'+qty+' peças</b>');if(date)bits.push('Entrega: <b>'+date+'</b>');if(priority)bits.push('Prioridade: <b>'+priority+'</b>');
  return {kind:'order-create-action',title:'Criar novo pedido',text:(bits.length?bits.join('<br>'):'Vou abrir o formulário oficial de Novo pedido.')+'<br><br><b>Nada será salvo automaticamente.</b> Confira a grade, valores e dados e clique em Salvar pedido somente depois da revisão.',clientId:client?.id||'',productId:product?.id||'',priority,date,qty};
}
function prepareEdit(number,raw){
  const o=findOrder(number);if(!o)return {kind:'empty',title:'Pedido não encontrado',text:'Não encontrei o pedido #'+sid(number)+'.'};
  if(!canWriteOrders())return {kind:'order-permission',title:'Sem permissão para alterar pedido',text:'Seu usuário pode consultar, mas não possui permissão de Pedidos para editar.'};
  const client=clientFromText(raw),priority=priorityFromText(raw),date=dateFromText(raw);
  const changes=[];if(client&&sid(client.id)!==sid(o.clientId))changes.push('Cliente: <b>'+String(o.client||'-')+'</b> → <b>'+client.name+'</b>');if(priority&&priority!==o.priority)changes.push('Prioridade: <b>'+(o.priority||'Padrão')+'</b> → <b>'+priority+'</b>');if(date&&date!==String(o.date||''))changes.push('Entrega: <b>'+(o.date||'-')+'</b> → <b>'+date+'</b>');
  return {kind:'order-edit-action',title:'Editar pedido #'+orderNo(o),text:(changes.length?changes.join('<br>'):'Vou abrir o editor oficial do pedido para você fazer a alteração.')+'<br><br><b>Nada será salvo automaticamente.</b> O Assistente apenas abre/preenche o editor; a gravação continua dependendo do botão Salvar alterações.',orderId:sid(o.id),clientId:client?.id||'',priority,date};
}
function prefillCreate(a){
  if(a.clientId){const e=document.getElementById('mclient');if(e){e.value=sid(a.clientId);try{e.dispatchEvent(new Event('change',{bubbles:true}))}catch(_){}}}
  if(a.date){const e=document.getElementById('mdate');if(e)e.value=a.date}
  if(a.priority){const e=document.getElementById('mpriority');if(e)e.value=a.priority}
  if(a.productId){
    const block=document.querySelector('.order-matrix-block'),sel=block?.querySelector('.matrixProduct'),p=arr('products').find(x=>sid(x.id)===sid(a.productId));
    if(sel&&p){
      sel.value=sid(p.id);
      try{if(typeof selectOrderProduct==='function'){const fake={closest:()=>block};selectOrderProduct(fake,p.id)}}catch(_){}
      const search=block.querySelector('.orderProdSearch');if(search){search.value=p.name||'';try{renderOrderProductPicker?.(search)}catch(_){}}
    }
  }
  try{updateOrderMatrixTotal?.()}catch(e){}
}
function prefillEdit(a){
  if(a.clientId){const e=document.getElementById('mclient');if(e){e.value=sid(a.clientId);try{e.dispatchEvent(new Event('change',{bubbles:true}))}catch(_){}}}
  if(a.date){const e=document.getElementById('mdate');if(e)e.value=a.date}
  if(a.priority){const e=document.getElementById('mpriority');if(e)e.value=a.priority}
  try{updateOrderMatrixTotal?.()}catch(e){}
}
function openCreate(a){
  if(!canWriteOrders())return alert('Seu usuário não possui permissão para criar pedidos.');
  if(typeof window.newOrder!=='function'&&typeof newOrder!=='function')return alert('A função oficial de Novo pedido não está disponível.');
  const fn=typeof window.newOrder==='function'?window.newOrder:newOrder;fn();setTimeout(()=>prefillCreate(a),60);return true;
}
function openEdit(a){
  if(!canWriteOrders())return alert('Seu usuário não possui permissão para editar pedidos.');
  const o=findOrder(a.orderId);if(!o)return alert('O pedido não está mais disponível.');
  if(typeof window.editOrder!=='function'&&typeof editOrder!=='function')return alert('O editor oficial de pedidos não está disponível.');
  const fn=typeof window.editOrder==='function'?window.editOrder:editOrder;fn(o.id);setTimeout(()=>prefillEdit(a),60);return true;
}
function parse(raw){
  const s=String(raw||'').trim(),n=norm(s);
  if(/\b(criar|novo|cadastrar|abrir)\b.*\bpedido\b|\bpedido\b.*\b(novo|criar|cadastrar)\b/i.test(s))return prepareCreate(s);
  const m=s.match(/\b(?:editar|alterar|mexer|ajustar|corrigir)\b.*?\bpedido\s*#?\s*(\d+)/i)||s.match(/\bpedido\s*#?\s*(\d+).*?\b(?:editar|alterar|ajustar|corrigir)\b/i);
  if(m)return prepareEdit(m[1],s);
  return null;
}
function enhanceAsk(){
  const old=window.hlgbAssistantAsk;if(typeof old!=='function'||old.__hlgbOrdersV1)return;
  const w=function(){
    const input=document.getElementById('hlgbAssistantInput'),out=document.getElementById('hlgbAssistantAnswer'),a=parse(input?.value||'');
    if(!a)return old.apply(this,arguments);
    if(!out)return;
    out.dataset.pendingKind=a.kind||'';out.dataset.pendingText='';
    let actions='';
    if(a.kind==='order-create-action'){window.__hlgbAssistantOrderPending=a;actions='<div class="toolbar" style="margin-top:12px"><button type="button" class="primary" onclick="hlgbAssistantOpenCreateOrder()">🧾 Confirmar e abrir Novo pedido</button></div>'}
    if(a.kind==='order-edit-action'){window.__hlgbAssistantOrderPending=a;actions='<div class="toolbar" style="margin-top:12px"><button type="button" class="primary" onclick="hlgbAssistantOpenEditOrder()">✏️ Confirmar e abrir pedido</button></div>'}
    out.innerHTML='<h3 style="margin-top:0">'+a.title+'</h3>'+a.text+actions;
    try{auditAction?.('Consultou Assistente HLGB',String(input?.value||'').slice(0,160))}catch(e){}
  };
  w.__hlgbOrdersV1=true;w.__original=old;window.hlgbAssistantAsk=w;
}
window.hlgbAssistantOpenCreateOrder=function(){const a=window.__hlgbAssistantOrderPending;if(!a||a.kind!=='order-create-action')return;openCreate(a)};
window.hlgbAssistantOpenEditOrder=function(){const a=window.__hlgbAssistantOrderPending;if(!a||a.kind!=='order-edit-action')return;openEdit(a)};
window.hlgbAssistantOrders={parse,prepareCreate,prepareEdit,openCreate,openEdit,canWriteOrders,clientFromText,productFromText,dateFromText,priorityFromText,qtyFromText};
function boot(){enhanceAsk()}try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,500),0)}catch(e){}setTimeout(boot,900);
window.HLGB_ASSISTANT_ORDERS_GUARD=V;
console.info('[HLGB] Assistente: criação/edição protegida de pedidos ativa');
})();