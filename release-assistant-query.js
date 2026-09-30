/* HLGB — Assistente inteligente v1 (somente consulta)
   Busca dados do sistema em linguagem natural. Nenhuma ação de escrita é executada nesta fase. */
(function(){
'use strict';
const V='2026.09.30-assistant-query-v1';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
const escSafe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const moneySafe=v=>typeof money==='function'?money(v):'R$ '+Number(v||0).toFixed(2).replace('.',',');
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function today(){return new Date().toISOString().slice(0,10)}
function addDays(iso,n){const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
function monday(iso){const d=new Date(iso+'T12:00:00'),day=d.getDay()||7;d.setDate(d.getDate()-day+1);return d.toISOString().slice(0,10)}
function fmt(v){try{return typeof fmtDate==='function'?fmtDate(v):v}catch(e){return v}}
function orderNo(o){try{return typeof displayOrderNumber==='function'?displayOrderNumber(o):(o?.orderNumber||o?.number||o?.id||'-')}catch(e){return o?.id||'-'}}
function productName(id){return arr('products').find(p=>sid(p?.id)===sid(id))?.name||''}
function locationForProduction(p){
  try{if(typeof productionDestinationName==='function')return productionDestinationName(p)||'Sem local'}catch(e){}
  const lid=p?.productionLocationId||p?.locationId;
  return arr('productionLocations').find(x=>sid(x?.id)===sid(lid))?.name||p?.locationName||'Sem local';
}
function orderProducts(o){
  const names=[];
  const grade=Array.isArray(o?.grade)?o.grade:[];
  grade.forEach(g=>{const n=productName(g.productId)||g.product||g.name;if(n&&!names.includes(n))names.push(n)});
  if(!names.length&&Array.isArray(o?.items))o.items.forEach(i=>{const n=productName(i.productId)||i.product||i.name;if(n&&!names.includes(n))names.push(n)});
  return names;
}
function orderQty(o){
  try{if(typeof qtyOfOrder==='function')return q(qtyOfOrder(o))}catch(e){}
  const src=Array.isArray(o?.grade)?o.grade:Array.isArray(o?.items)?o.items:[];
  return src.reduce((a,x)=>a+q(x?.qty),0);
}
function orderValue(o){return q(o?.total||o?.value)}
function findOrderByNumber(n){
  const s=sid(n);
  return arr('orders').find(o=>sid(orderNo(o))===s||sid(o?.id)===s)||null;
}
function orderSnapshot(o){
  if(!o)return null;
  const cuts=arr('cuts').filter(x=>sid(x?.orderId)===sid(o.id)&&!x?.deletedAt);
  const prod=arr('production').filter(x=>sid(x?.orderId)===sid(o.id)&&!x?.deletedAt);
  const miss=arr('missingPieces').filter(x=>sid(x?.orderId)===sid(o.id)&&String(x?.status||'')!=='Resolvido');
  const locations=[...new Set(prod.map(locationForProduction).filter(Boolean))];
  const pnames=orderProducts(o);
  return {
    id:o.id,number:orderNo(o),client:o.client||'-',status:o.status||'-',priority:o.priority||'Padrão',
    date:o.date||o.deliveryDate||'',qty:orderQty(o),value:orderValue(o),products:pnames,
    cuts:cuts.length,production:prod.length,locations,missing:miss.reduce((a,x)=>a+q(x?.remainingQty||x?.originalQty),0)
  };
}
function answerOrder(n){
  const s=orderSnapshot(findOrderByNumber(n));
  if(!s)return {title:'Pedido não encontrado',text:'Não encontrei o pedido #'+sid(n)+' entre os pedidos ativos.',kind:'empty'};
  const lines=[
    '<b>Pedido #'+escSafe(s.number)+' — '+escSafe(s.client)+'</b>',
    'Status: <b>'+escSafe(s.status)+'</b> · Prioridade: <b>'+escSafe(s.priority)+'</b>',
    'Quantidade: <b>'+s.qty.toLocaleString('pt-BR')+' peças</b> · Valor: <b>'+moneySafe(s.value)+'</b>',
    s.date?'Entrega cadastrada: <b>'+escSafe(fmt(s.date))+'</b>':'Entrega: <b>sem data cadastrada</b>',
    s.products.length?'Produtos: '+s.products.map(escSafe).join(', '):'Produtos: sem identificação resumida',
    'Cortes vinculados: '+s.cuts+' · Registros de produção: '+s.production,
    'Local atual: <b>'+escSafe(s.locations.join(' · ')||'Sem local definido')+'</b>',
    s.missing>0?'⚠️ Faltantes em aberto: <b>'+s.missing.toLocaleString('pt-BR')+' peças</b>':'Faltantes em aberto: 0'
  ];
  return {title:'Pedido #'+s.number,text:lines.join('<br>'),kind:'order',data:s};
}
function projectionRows(){
  try{
    if(typeof allProjectionRows==='function')return allProjectionRows().map(({order,item})=>({
      order,item,date:String(item?.date||'').slice(0,10),
      qty:typeof projectionDeliverableQty==='function'?q(projectionDeliverableQty(order,item)):q(item?.qty),
      value:typeof projectionDeliverableValue==='function'?q(projectionDeliverableValue(order,item)):q(item?.value),
      client:item?.clientName||order?.client||'Sem cliente',product:item?.name||productName(item?.productId)||'Produto'
    })).filter(x=>x.date&&x.qty>0);
  }catch(e){}
  return [];
}
function answerDeliveries(scope){
  const t=today(),m=monday(t),endWeek=addDays(m,6);
  let label='no período',rows=projectionRows();
  if(scope==='today'){rows=rows.filter(x=>x.date===t);label='hoje'}
  else if(scope==='tomorrow'){const d=addDays(t,1);rows=rows.filter(x=>x.date===d);label='amanhã'}
  else if(scope==='week'){rows=rows.filter(x=>x.date>=m&&x.date<=endWeek);label='esta semana'}
  else if(scope==='late'){rows=rows.filter(x=>x.date<t);label='atrasadas'}
  rows.sort((a,b)=>a.date.localeCompare(b.date)||String(a.client).localeCompare(String(b.client),'pt-BR'));
  const qty=rows.reduce((a,x)=>a+x.qty,0),value=rows.reduce((a,x)=>a+x.value,0),clients=[...new Set(rows.map(x=>x.client))];
  if(!rows.length)return {title:'Entregas '+label,text:'Não encontrei entregas '+label+'.',kind:'empty'};
  const top=rows.slice(0,12).map(x=>'• '+escSafe(fmt(x.date))+' · <b>'+escSafe(x.client)+'</b> · '+escSafe(x.product)+' · '+x.qty.toLocaleString('pt-BR')+' peças · '+moneySafe(x.value)).join('<br>');
  return {title:'Entregas '+label,text:'<b>'+qty.toLocaleString('pt-BR')+' peças</b> · <b>'+moneySafe(value)+'</b> · '+clients.length+' cliente(s)<br><br>'+top+(rows.length>12?'<br>… e mais '+(rows.length-12)+' item(ns).':''),kind:'deliveries',data:rows};
}
function answerClient(term){
  const n=norm(term);
  const clients=arr('clients').filter(c=>norm(c?.name).includes(n));
  const orders=arr('orders').filter(o=>norm(o?.client).includes(n));
  if(!clients.length&&!orders.length)return null;
  const names=[...new Set([...clients.map(c=>c.name),...orders.map(o=>o.client)].filter(Boolean))];
  const rows=orders.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,10);
  return {title:'Cliente: '+(names[0]||term),text:'Pedidos encontrados: <b>'+orders.length+'</b><br>'+rows.map(o=>'• #'+escSafe(orderNo(o))+' · '+escSafe(o.status||'-')+' · '+orderQty(o).toLocaleString('pt-BR')+' peças · '+moneySafe(orderValue(o))+(o.date?' · '+escSafe(fmt(o.date)):'')).join('<br>'),kind:'client'};
}
function answerProduct(term){
  const n=norm(term);
  const products=arr('products').filter(p=>norm([p?.name,p?.code,p?.category].join(' ')).includes(n)).slice(0,10);
  if(!products.length)return null;
  return {title:'Produtos encontrados',text:products.map(p=>'• <b>'+escSafe(p.name||'Produto')+'</b>'+(p.code?' · Ref. '+escSafe(p.code):'')+(p.price!=null?' · '+moneySafe(p.price):'')).join('<br>'),kind:'product'};
}
function answerProblems(){
  const issues=arr('systemIssues').filter(x=>x?.status!=='Resolvido');
  if(!issues.length)return {title:'Central de erros',text:'Não há erros abertos registrados na Central.',kind:'issues'};
  const high=issues.filter(x=>['Crítica','Alta'].includes(x.priority));
  return {title:'Central de erros',text:'Erros abertos: <b>'+issues.length+'</b> · Alta prioridade: <b>'+high.length+'</b><br><br>'+issues.slice(0,10).map(x=>'• '+escSafe(x.priority||'Média')+' · <b>'+escSafe(x.title||'Erro')+'</b> · '+escSafe(x.page||'-')).join('<br>'),kind:'issues'};
}
function detectWriteIntent(qry){
  return /\b(dar baixa|baixa|marcar.*pag|pagar|mudar status|alterar status|cancelar|excluir|apagar|finalizar|entregar|registrar entrega|trocar prioridade|colocar.*urgente|salvar|editar)\b/i.test(qry);
}
function query(raw){
  const original=String(raw||'').trim(),n=norm(original);
  if(!n)return {title:'Assistente HLGB',text:'Digite o que você quer localizar no sistema.',kind:'help'};
  if(detectWriteIntent(n))return {title:'Ação protegida',text:'Eu entendi que você quer <b>alterar dados</b>. Nesta primeira fase o Assistente está liberado somente para consulta. A próxima etapa vai preparar a ação, mostrar antes/depois e pedir confirmação antes de gravar.',kind:'protected'};
  let m=n.match(/pedido\s*#?\s*(\d+)/);
  if(m)return answerOrder(m[1]);
  if(/(entrega|entregar|sair|saida|projecao).*(amanha)/.test(n)||/amanha.*(entrega|sair|saida)/.test(n))return answerDeliveries('tomorrow');
  if(/(entrega|entregar|sair|saida|projecao).*(hoje)/.test(n)||/hoje.*(entrega|sair|saida)/.test(n))return answerDeliveries('today');
  if(/(entrega|entregar|sair|saida|projecao).*(semana)/.test(n)||/semana.*(entrega|sair|saida)/.test(n))return answerDeliveries('week');
  if(/atrasad/.test(n))return answerDeliveries('late');
  if(/\b(erros?|problemas?|falhas?)\b/.test(n))return answerProblems();

  // Busca literal de cliente/produto usando a frase inteira e, depois, palavras relevantes.
  const stop=new Set(['onde','esta','estao','quero','achar','buscar','procure','mostre','mostrar','cliente','produto','modelo','qual','tem','do','da','de','para','com','por','um','uma']);
  const terms=[original,...original.split(/\s+/).filter(w=>w.length>=3&&!stop.has(norm(w))).sort((a,b)=>b.length-a.length)];
  for(const t of terms){const c=answerClient(t);if(c)return c}
  for(const t of terms){const p=answerProduct(t);if(p)return p}
  return {title:'Não encontrei com segurança',text:'Tente escrever, por exemplo: <b>“onde está o pedido 63?”</b>, <b>“o que entrega amanhã?”</b>, <b>“entregas desta semana”</b> ou digite o nome de um cliente/produto.',kind:'help'};
}
function injectStyles(){
  if(document.getElementById('hlgbAssistantStyle'))return;
  const st=document.createElement('style');st.id='hlgbAssistantStyle';
  st.textContent='.hlgb-assistant-btn{margin-left:6px}.hlgb-assistant-box{display:grid;gap:12px}.hlgb-assistant-input{display:flex;gap:8px;align-items:center}.hlgb-assistant-input input{flex:1;min-width:180px}.hlgb-assistant-answer{background:#fffafd;border:1px solid #eadde5;border-radius:14px;padding:14px;line-height:1.55}.hlgb-assistant-examples{display:flex;gap:6px;flex-wrap:wrap}.hlgb-assistant-examples button{font-size:12px}';
  document.head.appendChild(st);
}
function injectButton(){
  injectStyles();
  if(document.getElementById('hlgbAssistantBtn'))return;
  const header=document.querySelector('#appShell header > div:last-child');
  if(!header)return;
  const b=document.createElement('button');b.id='hlgbAssistantBtn';b.type='button';b.className='hlgb-assistant-btn';b.textContent='🤖 Assistente';b.onclick=openAssistant;
  const logout=[...header.querySelectorAll('button')].find(x=>norm(x.textContent)==='sair');
  if(logout)header.insertBefore(b,logout);else header.appendChild(b);
}
function openAssistant(){
  openModal('🤖 Assistente HLGB','<div class="hlgb-assistant-box"><div class="sub">Pergunte sobre pedidos, clientes, produtos, entregas e erros registrados. Nesta fase ele não altera dados.</div><div class="hlgb-assistant-input"><input id="hlgbAssistantInput" placeholder="Ex.: onde está o pedido 63?" onkeydown="if(event.key===\'Enter\')hlgbAssistantAsk()"><button type="button" class="primary" onclick="hlgbAssistantAsk()">Perguntar</button></div><div class="hlgb-assistant-examples"><button type="button" class="secondary" onclick="hlgbAssistantExample(\'O que entrega hoje?\')">Entregas de hoje</button><button type="button" class="secondary" onclick="hlgbAssistantExample(\'O que entrega amanhã?\')">Entregas de amanhã</button><button type="button" class="secondary" onclick="hlgbAssistantExample(\'Quais erros estão abertos?\')">Erros abertos</button></div><div id="hlgbAssistantAnswer" class="hlgb-assistant-answer">Digite uma pergunta para começar.</div><button type="button" class="secondary modalSave">Fechar</button></div>',()=>closeModal());
  setTimeout(()=>document.getElementById('hlgbAssistantInput')?.focus(),0);
}
window.openHlgbAssistant=openAssistant;
window.hlgbAssistantAsk=function(){
  const input=document.getElementById('hlgbAssistantInput'),out=document.getElementById('hlgbAssistantAnswer');
  if(!input||!out)return;
  const a=query(input.value);
  out.innerHTML='<h3 style="margin-top:0">'+escSafe(a.title)+'</h3>'+a.text;
  try{auditAction?.('Consultou Assistente HLGB',String(input.value||'').slice(0,160))}catch(e){}
};
window.hlgbAssistantExample=function(s){const i=document.getElementById('hlgbAssistantInput');if(i)i.value=s;window.hlgbAssistantAsk()};
window.hlgbAssistant={query,answerOrder,answerDeliveries,answerProblems,orderSnapshot,detectWriteIntent,version:V};
function boot(){injectButton();try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(injectButton,300),0)}catch(e){}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
console.info('[HLGB] Assistente HLGB consulta v1 carregado');
})();