/* HLGB — Assistente inteligente v1 (somente consulta)
   Busca dados do sistema em linguagem natural. Nenhuma ação de escrita é executada nesta fase. */
(function(){
'use strict';
const V='2026.10.01-assistant-all-users-v2';
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
function latestAudit(){
  try{
    const direct=window.hlgbInternalAuditor?.latest?.();
    if(direct)return direct;
  }catch(e){}
  return arr('systemAuditRuns').slice().sort((a,b)=>String(b?.completedAt||b?.startedAt||'').localeCompare(String(a?.completedAt||a?.startedAt||'')))[0]||null;
}
function answerLatestAudit(){
  const r=latestAudit();
  if(!r)return {title:'Auditoria interna',text:'Ainda não existe auditoria interna salva. Você pode pedir <b>“rodar auditoria do sistema”</b>.',kind:'audit-empty'};
  const s=r.summary||{},result=s.result||'-',icon=result==='Aprovado'?'✅':result==='Atenção'?'🟡':'🔴';
  const bad=(r.checks||[]).filter(x=>x?.status!=='pass').slice(0,8);
  return {title:'Última auditoria interna',text:icon+' <b>'+escSafe(result)+'</b> · '+q(s.pass)+' passou · '+q(s.warn)+' atenção · '+q(s.fail)+' falha(s)<br>Executada: '+escSafe(String(r.completedAt||r.startedAt||'').replace('T',' ').slice(0,19))+' · '+escSafe(r.browser||'-')+' · tela '+escSafe(r.activePage||'-')+(bad.length?'<br><br>'+bad.map(x=>'• '+(x.status==='fail'?'🔴':'🟡')+' <b>'+escSafe(x.title||'Verificação')+'</b> · '+escSafe(x.detail||'')).join('<br>'):'<br><br>Nenhum ponto de atenção registrado.'),kind:'audit-result',data:r};
}
function prepareAuditAction(){
  return {title:'Executar auditoria interna',text:'Vou executar uma conferência <b>somente de leitura</b>: funções essenciais, estrutura das telas, tela atual, sincronização, integridade dos dados e erros registrados.<br><br><b>Não cria pedido, não dá baixa e não altera produção ou financeiro.</b>',kind:'audit-action'};
}
function openMissingForOrder(number){
  const o=findOrderByNumber(number);
  if(!o)return {title:'Pedido não encontrado',text:'Não encontrei o pedido #'+sid(number)+' entre os pedidos ativos.',kind:'empty'};
  const rows=arr('missingPieces').filter(x=>sid(x?.orderId)===sid(o.id)&&q(x?.remainingQty)>0&&String(x?.status||'')!=='Resolvido');
  if(!rows.length)return {title:'Sem faltantes em aberto',text:'O pedido #'+escSafe(orderNo(o))+' não possui faltantes em aberto para dar baixa.',kind:'empty'};
  const total=rows.reduce((a,x)=>a+q(x.remainingQty),0);
  return {
    title:'Baixa de faltantes · pedido #'+orderNo(o),
    text:'Encontrei <b>'+rows.length+' ocorrência(s)</b>, somando <b>'+total.toLocaleString('pt-BR')+' peça(s)</b> em aberto.<br><br>'+rows.map((x,i)=>'• '+escSafe(x.product||'Produto')+' · '+q(x.remainingQty).toLocaleString('pt-BR')+' peça(s) · '+escSafe(x.status||'Em aberto')).join('<br>')+'<br><br>Nenhuma baixa será feita agora. Escolha a ocorrência e o sistema abrirá a tela oficial de confirmação.',
    kind:'missing-action',
    orderNumber:orderNo(o),
    actions:rows.map(x=>({id:sid(x.id),label:(x.product||'Produto')+' · '+q(x.remainingQty)+' peça(s)',qty:q(x.remainingQty),product:x.product||'Produto'}))
  };
}
function runOfficialMissingAction(id){
  const row=arr('missingPieces').find(x=>sid(x?.id)===sid(id)&&q(x?.remainingQty)>0&&String(x?.status||'')!=='Resolvido');
  if(!row)throw new Error('Este faltante não está mais em aberto. Atualize a consulta.');
  if(typeof window.abateMissingPiece!=='function'&&typeof abateMissingPiece!=='function')throw new Error('A função oficial de baixa não está disponível.');
  const fn=typeof window.abateMissingPiece==='function'?window.abateMissingPiece:abateMissingPiece;
  fn(row.id);
  return true;
}
function hubEntryLabel(e){
  return String(e?.description||e?.desc||e?.person||e?.origin||e?.category||'Lançamento').trim()||'Lançamento';
}
function hubEntryIsConfig(e){
  return !!(e?.kind&&String(e.kind).startsWith('hub_settings'))||String(e?.flow||'')==='Config'||String(e?.status||'')==='Configuração';
}
function hubEntryDone(e){
  const st=norm(e?.status);
  return st==='realizado'||st==='pago'||st==='concluido'||st==='concluida';
}
function findHubEntries(term){
  const n=norm(term),idMatch=String(term||'').match(/(?:lancamento|lançamento|id)\s*#?\s*([\w:-]+)/i);
  let rows=arr('hubFinanceEntries').filter(e=>e&&!hubEntryIsConfig(e));
  if(idMatch)rows=rows.filter(e=>sid(e?.id)===sid(idMatch[1]));
  else if(n)rows=rows.filter(e=>norm([e?.description,e?.desc,e?.person,e?.origin,e?.category,e?.subcategory,e?.note,e?.id].join(' ')).includes(n));
  return rows.slice().sort((a,b)=>String(b?.date||'').localeCompare(String(a?.date||''))).slice(0,12);
}
function prepareHubRealizedAction(term){
  const rows=findHubEntries(term);
  if(!rows.length)return {title:'Lançamento não encontrado',text:'Não encontrei lançamento no Hub correspondente a <b>'+escSafe(term||'-')+'</b>. Tente usar parte da descrição, nome da pessoa ou o ID do lançamento.',kind:'empty'};
  const pending=rows.filter(e=>!hubEntryDone(e));
  if(!pending.length)return {title:'Lançamento já realizado',text:'Os lançamentos encontrados já estão marcados como realizados. Nenhuma alteração é necessária.',kind:'empty'};
  return {
    title:'Marcar no Hub como realizado',
    text:'Encontrei '+pending.length+' lançamento(s) ainda previsto(s). Confira antes de confirmar:<br><br>'+pending.map(e=>'• <b>'+escSafe(hubEntryLabel(e))+'</b> · '+moneySafe(q(e?.value))+(e?.date?' · '+escSafe(fmt(e.date)):'')+' · '+escSafe(e?.status||'Previsto')).join('<br>'),
    kind:'hub-realized-action',
    actions:pending.map(e=>({id:sid(e.id),label:hubEntryLabel(e),value:q(e.value),date:e.date||'',status:e.status||'Previsto'}))
  };
}
async function runOfficialHubRealizedAction(id){
  const row=arr('hubFinanceEntries').find(e=>sid(e?.id)===sid(id)&&!hubEntryIsConfig(e));
  if(!row)throw new Error('Este lançamento não está mais disponível no Hub.');
  if(hubEntryDone(row))return {changed:false,alreadyDone:true,row};
  if(typeof window.toggleHubFinanceEntry!=='function'&&typeof toggleHubFinanceEntry!=='function')throw new Error('A função oficial do Hub não está disponível.');
  const fn=typeof window.toggleHubFinanceEntry==='function'?window.toggleHubFinanceEntry:toggleHubFinanceEntry;
  await fn(row.id);
  return {changed:true,alreadyDone:false,row};
}
function canonicalPriority(v){
  const n=norm(v);
  if(n==='urgentissimo'||n==='urgentissima'||n==='urgentíssim o')return 'Urgentíssimo';
  if(n.includes('urgentissim'))return 'Urgentíssimo';
  if(n==='urgente')return 'Urgente';
  if(n==='padrao'||n==='padrão'||n==='normal')return 'Padrão';
  return '';
}
function prepareOrderPriorityAction(number,targetRaw){
  const o=findOrderByNumber(number);
  if(!o)return {title:'Pedido não encontrado',text:'Não encontrei o pedido #'+sid(number)+'.',kind:'empty'};
  const target=canonicalPriority(targetRaw);
  if(!target)return {title:'Prioridade inválida',text:'Use Padrão, Urgente ou Urgentíssimo.',kind:'empty'};
  const current=o.priority||'Padrão';
  if(current===target)return {title:'Prioridade já aplicada',text:'O pedido #'+escSafe(orderNo(o))+' já está como <b>'+escSafe(target)+'</b>.',kind:'empty'};
  return {
    title:'Alterar prioridade do pedido #'+orderNo(o),
    text:'Pedido: <b>#'+escSafe(orderNo(o))+' · '+escSafe(o.client||'-')+'</b><br>Antes: <b>'+escSafe(current)+'</b><br>Depois: <b>'+escSafe(target)+'</b><br><br>Ao confirmar, o Assistente abrirá o editor oficial do pedido já com essa prioridade selecionada. A alteração só será gravada quando você clicar em <b>Salvar alterações</b>.',
    kind:'priority-action',
    orderId:sid(o.id),orderNumber:orderNo(o),current,target
  };
}
function runOfficialPriorityAction(orderId,targetRaw){
  const o=arr('orders').find(x=>sid(x?.id)===sid(orderId));
  if(!o)throw new Error('O pedido não está mais disponível.');
  const target=canonicalPriority(targetRaw);
  if(!target)throw new Error('Prioridade inválida.');
  if(typeof window.editOrder!=='function'&&typeof editOrder!=='function')throw new Error('O editor oficial do pedido não está disponível.');
  const fn=typeof window.editOrder==='function'?window.editOrder:editOrder;
  fn(o.id);
  setTimeout(()=>{
    const el=document.getElementById('mpriority');
    if(el){
      el.value=target;
      try{el.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){}
      try{el.focus()}catch(e){}
    }
  },0);
  return {opened:true,orderId:sid(o.id),target};
}
const ORDER_STATUSES=['Aguardando corte','Pedido para corte','Corte finalizado','Pedido em produção','Aguardando nota','Pedido finalizado'];
function canonicalOrderStatus(v){
  const n=norm(v);
  const aliases={
    'aguardando corte':'Aguardando corte',
    'pedido para corte':'Pedido para corte',
    'para corte':'Pedido para corte',
    'corte finalizado':'Corte finalizado',
    'cortado':'Corte finalizado',
    'pedido em producao':'Pedido em produção',
    'em producao':'Pedido em produção',
    'producao':'Pedido em produção',
    'aguardando nota':'Aguardando nota',
    'pronto para nota':'Aguardando nota',
    'pedido finalizado':'Pedido finalizado',
    'finalizado':'Pedido finalizado'
  };
  return aliases[n]||'';
}
function prepareOrderStatusAction(number,targetRaw){
  const o=findOrderByNumber(number);
  if(!o)return {title:'Pedido não encontrado',text:'Não encontrei o pedido #'+sid(number)+'.',kind:'empty'};
  const target=canonicalOrderStatus(targetRaw);
  if(!target)return {title:'Status não reconhecido',text:'Use um dos status do editor oficial: '+ORDER_STATUSES.map(escSafe).join(', ')+'.',kind:'empty'};
  const current=o.status||'-';
  if(current===target)return {title:'Status já aplicado',text:'O pedido #'+escSafe(orderNo(o))+' já está como <b>'+escSafe(target)+'</b>.',kind:'empty'};
  return {
    title:'Alterar status do pedido #'+orderNo(o),
    text:'Pedido: <b>#'+escSafe(orderNo(o))+' · '+escSafe(o.client||'-')+'</b><br>Antes: <b>'+escSafe(current)+'</b><br>Depois: <b>'+escSafe(target)+'</b><br><br>Ao confirmar, o Assistente abrirá o editor oficial com esse status selecionado. A alteração só será gravada quando você clicar em <b>Salvar alterações</b>.',
    kind:'status-action',orderId:sid(o.id),orderNumber:orderNo(o),current,target
  };
}
function runOfficialStatusAction(orderId,targetRaw){
  const o=arr('orders').find(x=>sid(x?.id)===sid(orderId));
  if(!o)throw new Error('O pedido não está mais disponível.');
  const target=canonicalOrderStatus(targetRaw);
  if(!target)throw new Error('Status inválido.');
  if(typeof window.editOrder!=='function'&&typeof editOrder!=='function')throw new Error('O editor oficial do pedido não está disponível.');
  const fn=typeof window.editOrder==='function'?window.editOrder:editOrder;
  fn(o.id);
  setTimeout(()=>{
    const el=document.getElementById('mstatus');
    if(el){
      el.value=target;
      try{el.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){}
      try{el.focus()}catch(e){}
    }
  },0);
  return {opened:true,orderId:sid(o.id),target};
}
function detectWriteIntent(qry){
  return /\b(dar baixa|baixa|marcar.*pag|pagar|mudar status|alterar status|cancelar|excluir|apagar|finalizar|entregar|registrar entrega|trocar prioridade|colocar.*urgente|salvar|editar)\b/i.test(qry);
}
function query(raw){
  const original=String(raw||'').trim(),n=norm(original);
  if(!n)return {title:'Assistente HLGB',text:'Digite o que você quer localizar no sistema.',kind:'help'};
  const sug=original.match(/^(?:anotar|registrar|salvar)?\s*sugest[aã]o\s*[:\-]?\s*(.+)$/i);
  if(sug&&sug[1]?.trim())return {title:'Anotar sugestão',text:'Posso registrar esta sugestão na Central:<br><br><b>'+escSafe(sug[1].trim())+'</b>',kind:'suggestion-intent',description:sug[1].trim()};
  const err=original.match(/^(?:anotar|registrar|relatar)?\s*(?:erro|problema|falha)\s*[:\-]?\s*(.+)$/i);
  if(err&&err[1]?.trim())return {title:'Relatar erro',text:'Posso registrar este erro na Central:<br><br><b>'+escSafe(err[1].trim())+'</b>',kind:'issue-intent',description:err[1].trim()};
  const baixa=n.match(/(?:dar\s+baixa|baixar|abater|recuperar)(?:\s+(?:no|nos|do|dos|em))?\s*(?:faltante|faltantes|falta|faltas|peca faltante|pecas faltantes)?[^0-9]*(?:pedido\s*)?#?\s*(\d+)/i);
  if(baixa)return openMissingForOrder(baixa[1]);
  const hubDone=original.match(/(?:marcar|colocar|dar\s+baixa\s+em)\s+(.+?)\s+(?:como\s+)?(?:pago|paga|realizado|realizada)(?:\s+no\s+hub)?\s*$/i);
  if(hubDone&&hubDone[1]?.trim())return prepareHubRealizedAction(hubDone[1].trim());
  const pri=n.match(/(?:mudar|alterar|trocar|colocar|marcar)?\s*(?:a\s+)?(?:prioridade|urgencia)?\s*(?:do\s+)?pedido\s*#?\s*(\d+)\s*(?:para|como)?\s*(padrao|padrão|normal|urgente|urgentissimo|urgentíssima|urgentissimo|urgentíssimo)/i)
    ||n.match(/(?:colocar|marcar)\s+(?:o\s+)?pedido\s*#?\s*(\d+)\s+(?:como\s+)?(urgente|urgentissimo|urgentíssimo|padrao|padrão|normal)/i);
  if(pri)return prepareOrderPriorityAction(pri[1],pri[2]);
  const st=original.match(/(?:mudar|alterar|trocar|colocar|marcar)\s+(?:o\s+)?status\s+(?:do\s+)?pedido\s*#?\s*(\d+)\s+(?:para|como)\s+(.+)$/i)
    ||original.match(/(?:mudar|alterar|trocar|colocar|marcar)\s+(?:o\s+)?pedido\s*#?\s*(\d+)\s+(?:para|como)\s+(aguardando corte|pedido para corte|corte finalizado|cortado|pedido em produção|pedido em producao|em produção|em producao|aguardando nota|pronto para nota|pedido finalizado|finalizado)$/i);
  if(st)return prepareOrderStatusAction(st[1],st[2]);
  if(detectWriteIntent(n))return {title:'Ação protegida',text:'Eu entendi que você quer <b>alterar dados</b>. Este comando ainda não foi liberado para execução automática. As ações são liberadas uma por uma, sempre com prévia e confirmação.',kind:'protected'};
  let m=n.match(/pedido\s*#?\s*(\d+)/);
  if(m)return answerOrder(m[1]);
  if(/(entrega|entregar|sair|saida|projecao).*(amanha)/.test(n)||/amanha.*(entrega|sair|saida)/.test(n))return answerDeliveries('tomorrow');
  if(/(entrega|entregar|sair|saida|projecao).*(hoje)/.test(n)||/hoje.*(entrega|sair|saida)/.test(n))return answerDeliveries('today');
  if(/(entrega|entregar|sair|saida|projecao).*(semana)/.test(n)||/semana.*(entrega|sair|saida)/.test(n))return answerDeliveries('week');
  if(/atrasad/.test(n))return answerDeliveries('late');
  if(/(?:ultima|última|resultado|ver|mostrar|consultar).*(?:auditoria|teste do sistema)|(?:auditoria).*(?:ultima|última|resultado|mais recente)/.test(n))return answerLatestAudit();
  if(/(?:rodar|executar|fazer|iniciar).*(?:auditoria|teste do sistema)|(?:testar|auditar|varrer)\s+(?:o\s+)?sistema/.test(n))return prepareAuditAction();
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
  st.textContent='.hlgb-assistant-btn{margin-left:6px}.hlgb-assistant-floating{position:fixed;right:18px;bottom:18px;z-index:9997;border-radius:999px;padding:11px 16px;box-shadow:0 4px 18px #0002}.hlgb-assistant-box{display:grid;gap:12px}.hlgb-assistant-input{display:flex;gap:8px;align-items:center}.hlgb-assistant-input input{flex:1;min-width:180px}.hlgb-assistant-answer{background:#fffafd;border:1px solid #eadde5;border-radius:14px;padding:14px;line-height:1.55}.hlgb-assistant-examples{display:flex;gap:6px;flex-wrap:wrap}.hlgb-assistant-examples button{font-size:12px}';
  document.head.appendChild(st);
}
function injectButton(){
  injectStyles();
  const headerBtn=document.getElementById('hlgbAssistantBtn');
  if(headerBtn)headerBtn.remove();
  if(document.getElementById('hlgbAssistantNavBtn')||document.getElementById('hlgbAssistantFloatingBtn'))return;
  const groups=[...document.querySelectorAll('#nav .nav-group')];
  const sys=groups.find(g=>norm(g.querySelector('.nav-group-title span')?.textContent||'')==='sistema');
  const menu=sys?.querySelector('.nav-submenu');
  if(menu){
    const b=document.createElement('button');b.id='hlgbAssistantNavBtn';b.type='button';b.textContent='🤖 Assistente HLGB';b.onclick=openAssistant;
    menu.insertBefore(b,menu.firstChild);
    return;
  }
  const b=document.createElement('button');
  b.id='hlgbAssistantFloatingBtn';b.type='button';b.className='primary hlgb-assistant-floating';b.textContent='🤖 Assistente HLGB';b.onclick=openAssistant;
  (document.body||document.documentElement).appendChild(b);
}
function openAssistant(){
  openModal('🤖 Assistente HLGB','<div class="hlgb-assistant-box"><div class="sub">Pergunte sobre pedidos, clientes, produtos, entregas e erros. Ações liberadas sempre mostram uma prévia e pedem confirmação.</div><div class="hlgb-assistant-input"><input id="hlgbAssistantInput" placeholder="Ex.: onde está o pedido 63?" onkeydown="if(event.key===\'Enter\')hlgbAssistantAsk()"><button type="button" class="primary" onclick="hlgbAssistantAsk()">Perguntar</button></div><div class="hlgb-assistant-examples"><button type="button" class="secondary" onclick="hlgbAssistantExample(\'O que entrega hoje?\')">Entregas de hoje</button><button type="button" class="secondary" onclick="hlgbAssistantExample(\'O que entrega amanhã?\')">Entregas de amanhã</button><button type="button" class="secondary" onclick="hlgbAssistantExample(\'Quais erros estão abertos?\')">Erros abertos</button></div><div id="hlgbAssistantAnswer" class="hlgb-assistant-answer">Digite uma pergunta para começar.</div><button type="button" class="secondary modalSave">Fechar</button></div>',()=>closeModal());
  setTimeout(()=>document.getElementById('hlgbAssistantInput')?.focus(),0);
}
window.openHlgbAssistant=openAssistant;
window.hlgbAssistantAsk=function(){
  const input=document.getElementById('hlgbAssistantInput'),out=document.getElementById('hlgbAssistantAnswer');
  if(!input||!out)return;
  const a=query(input.value);
  let actions='';
  if(a.kind==='suggestion-intent')actions='<div class="toolbar" style="margin-top:12px"><button class="primary" onclick="hlgbAssistantConfirmNote(\'suggestion\')">☁️ Confirmar sugestão</button></div>';
  if(a.kind==='issue-intent')actions='<div class="toolbar" style="margin-top:12px"><button class="primary" onclick="hlgbAssistantConfirmNote(\'issue\')">☁️ Confirmar erro</button></div>';
  if(a.kind==='missing-action'&&Array.isArray(a.actions)){
    actions='<div class="toolbar" style="margin-top:12px">'+a.actions.map(x=>'<button type="button" class="primary" onclick="hlgbAssistantOpenMissing(\''+escSafe(x.id)+'\')">✅ '+escSafe(x.label)+'</button>').join('')+'</div>';
  }
  if(a.kind==='hub-realized-action'&&Array.isArray(a.actions)){
    actions='<div class="toolbar" style="margin-top:12px">'+a.actions.map(x=>'<button type="button" class="primary" onclick="hlgbAssistantConfirmHubRealized(\''+escSafe(x.id)+'\')">💰 '+escSafe(x.label)+' · '+moneySafe(x.value)+'</button>').join('')+'</div>';
  }
  if(a.kind==='priority-action'){
    actions='<div class="toolbar" style="margin-top:12px"><button type="button" class="primary" onclick="hlgbAssistantOpenPriority(\''+escSafe(a.orderId)+'\',\''+escSafe(a.target)+'\')">⚡ Confirmar e abrir pedido</button></div>';
  }
  if(a.kind==='status-action'){
    actions='<div class="toolbar" style="margin-top:12px"><button type="button" class="primary" onclick="hlgbAssistantOpenStatus(\''+escSafe(a.orderId)+'\',\''+escSafe(a.target)+'\')">🔄 Confirmar e abrir pedido</button></div>';
  }
  if(a.kind==='audit-action'){
    actions='<div class="toolbar" style="margin-top:12px"><button type="button" class="primary" onclick="hlgbAssistantRunAudit()">🧪 Confirmar auditoria</button></div>';
  }
  out.dataset.pendingKind=a.kind||'';out.dataset.pendingText=a.description||'';
  out.innerHTML='<h3 style="margin-top:0">'+escSafe(a.title)+'</h3>'+a.text+actions;
  try{auditAction?.('Consultou Assistente HLGB',String(input.value||'').slice(0,160))}catch(e){}
};
window.hlgbAssistantConfirmNote=async function(type){
  const out=document.getElementById('hlgbAssistantAnswer'),text=String(out?.dataset?.pendingText||'').trim();
  if(!out||!text)return;
  const api=window.hlgbDiagnosticsCenter;
  try{
    out.innerHTML='<b>☁️ Salvando na Central…</b>';
    if(type==='suggestion'&&typeof api?.createSuggestionText==='function')await api.createSuggestionText(text);
    else if(type==='issue'&&typeof api?.createIssueText==='function')await api.createIssueText(text);
    else throw new Error('A Central de Erros e Melhorias não está disponível.');
    out.innerHTML='<b>✅ '+(type==='suggestion'?'Sugestão':'Erro')+' registrado na Central.</b><br>'+escSafe(text);
    try{await api?.refresh?.(false)}catch(e){}
  }catch(e){
    out.innerHTML='<b>Não foi possível confirmar o registro.</b><br>'+escSafe(String(e?.message||e));
  }
};
window.hlgbAssistantExample=function(s){const i=document.getElementById('hlgbAssistantInput');if(i)i.value=s;window.hlgbAssistantAsk()};
window.hlgbAssistantOpenMissing=function(id){
  const row=arr('missingPieces').find(x=>sid(x?.id)===sid(id));
  if(!row||q(row.remainingQty)<=0||String(row.status||'')==='Resolvido')return alert('Este faltante já não está disponível para baixa.');
  const label=(row.product||'Produto')+' · '+q(row.remainingQty)+' peça(s)';
  if(!confirm('Abrir a baixa oficial para:\n\n'+label+'?\n\nAinda será necessário confirmar quantidade, data e observação na tela de baixa.'))return;
  try{
    closeModal();
    runOfficialMissingAction(id);
    try{auditAction?.('Assistente abriu baixa oficial de faltante',String(id))}catch(e){}
  }catch(e){alert('Não foi possível abrir a baixa oficial.\n\n'+String(e?.message||e))}
};
window.hlgbAssistantConfirmHubRealized=async function(id){
  const row=arr('hubFinanceEntries').find(e=>sid(e?.id)===sid(id)&&!hubEntryIsConfig(e));
  if(!row)return alert('Este lançamento não está mais disponível.');
  if(hubEntryDone(row))return alert('Este lançamento já está realizado. Nenhuma alteração foi feita.');
  const msg='Marcar como REALIZADO?\n\n'+hubEntryLabel(row)+'\n'+moneySafe(q(row.value))+(row.date?'\nData: '+fmt(row.date):'')+'\n\nEsta alteração será gravada usando a função oficial do Hub.';
  if(!confirm(msg))return;
  try{
    const out=document.getElementById('hlgbAssistantAnswer');
    if(out)out.innerHTML='<b>☁️ Confirmando no Hub…</b>';
    await runOfficialHubRealizedAction(id);
    try{auditAction?.('Assistente marcou lançamento do Hub como realizado',String(id))}catch(e){}
    if(out)out.innerHTML='<b>✅ Lançamento enviado para confirmação no Hub.</b><br>'+escSafe(hubEntryLabel(row))+' · '+moneySafe(q(row.value));
  }catch(e){alert('Não foi possível confirmar a alteração no Hub.\n\n'+String(e?.message||e))}
};
window.hlgbAssistantOpenPriority=function(orderId,target){
  const o=arr('orders').find(x=>sid(x?.id)===sid(orderId));
  if(!o)return alert('O pedido não está mais disponível.');
  const desired=canonicalPriority(target),current=o.priority||'Padrão';
  if(!desired)return alert('Prioridade inválida.');
  if(current===desired)return alert('O pedido já está com essa prioridade.');
  if(!confirm('Abrir o pedido #'+orderNo(o)+' para alterar a prioridade?\n\n'+current+' → '+desired+'\n\nA alteração ainda NÃO será salva automaticamente. Confira e clique em Salvar alterações no editor oficial.'))return;
  try{
    closeModal();
    runOfficialPriorityAction(orderId,desired);
    try{auditAction?.('Assistente abriu alteração de prioridade',String(orderId)+' '+current+' -> '+desired)}catch(e){}
  }catch(e){alert('Não foi possível abrir o editor oficial.\n\n'+String(e?.message||e))}
};
window.hlgbAssistantOpenStatus=function(orderId,target){
  const o=arr('orders').find(x=>sid(x?.id)===sid(orderId));
  if(!o)return alert('O pedido não está mais disponível.');
  const desired=canonicalOrderStatus(target),current=o.status||'-';
  if(!desired)return alert('Status inválido.');
  if(current===desired)return alert('O pedido já está com esse status.');
  if(!confirm('Abrir o pedido #'+orderNo(o)+' para alterar o status?\n\n'+current+' → '+desired+'\n\nA alteração ainda NÃO será salva automaticamente. Confira e clique em Salvar alterações no editor oficial.'))return;
  try{
    closeModal();
    runOfficialStatusAction(orderId,desired);
    try{auditAction?.('Assistente abriu alteração de status',String(orderId)+' '+current+' -> '+desired)}catch(e){}
  }catch(e){alert('Não foi possível abrir o editor oficial.\n\n'+String(e?.message||e))}
};
window.hlgbAssistantRunAudit=async function(){
  const out=document.getElementById('hlgbAssistantAnswer');
  const auditor=window.hlgbInternalAuditor;
  if(!auditor?.run){if(out)out.innerHTML='<b>Auditor interno não está disponível.</b>';return}
  if(!confirm('Executar auditoria interna somente de leitura agora?\n\nNenhum pedido, produção ou financeiro será alterado.'))return;
  try{
    if(out)out.innerHTML='<b>🧪 Executando auditoria interna…</b>';
    const run=await auditor.run('full',true),sum=run?.summary||{};
    if(out)out.innerHTML='<h3 style="margin-top:0">Auditoria concluída</h3><b>'+escSafe(sum.result||'-')+'</b> · '+q(sum.pass)+' passou · '+q(sum.warn)+' atenção · '+q(sum.fail)+' falha(s)<br><br>O resultado foi salvo para consulta posterior.';
    try{auditAction?.('Assistente executou Auditor HLGB',String(sum.result||'-'))}catch(e){}
  }catch(e){if(out)out.innerHTML='<b>Não foi possível concluir a auditoria.</b><br>'+escSafe(String(e?.message||e))}
};
window.hlgbAssistant={query,answerOrder,answerDeliveries,answerProblems,answerLatestAudit,prepareAuditAction,orderSnapshot,openMissingForOrder,runOfficialMissingAction,prepareHubRealizedAction,runOfficialHubRealizedAction,findHubEntries,prepareOrderPriorityAction,runOfficialPriorityAction,canonicalPriority,prepareOrderStatusAction,runOfficialStatusAction,canonicalOrderStatus,detectWriteIntent,version:V};
function boot(){injectButton();try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(injectButton,300),0)}catch(e){}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
console.info('[HLGB] Assistente HLGB consulta v1 carregado');
})();