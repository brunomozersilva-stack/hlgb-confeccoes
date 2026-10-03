/* HLGB — Assistente: consultas amplas do sistema + registro de ações */
(function(){
'use strict';
const V='2026.10.01-assistant-system-wide-v5';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const moneySafe=v=>typeof money==='function'?money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function words(s){const stop=new Set(['qual','quais','quem','mais','barato','barata','preco','preço','valor','materia','matéria','prima','compra','compras','media','média','semana','semanal','cliente','pedido','pedidos','tem','do','da','de','para','por','no','na','um','uma']);return norm(s).split(/\s+/).filter(x=>x.length>=3&&!stop.has(x))}
function materialSupplier(raw){
 const ws=words(raw);if(!ws.length)return null;
 const rows=[];
 for(const s of arr('suppliers'))for(const p of (s.products||[])){
  const hay=norm(p.name||'');if(!ws.some(w=>hay.includes(w)))continue;
  const price=q(p.price);if(price>0)rows.push({supplier:s.name||'Fornecedor',product:p.name||'Material',unit:p.unit||'',price});
 }
 if(!rows.length)return null;rows.sort((a,b)=>a.price-b.price||a.supplier.localeCompare(b.supplier,'pt-BR'));
 return {kind:'system-info',title:'Comparação de fornecedores',text:rows.slice(0,12).map((x,i)=>(i===0?'✅ ':'• ')+'<b>'+escSafe(x.supplier)+'</b> · '+escSafe(x.product)+' · '+moneySafe(x.price)+(x.unit?' / '+escSafe(x.unit):'')).join('<br>')+'<br><br><span class="sub">Comparação baseada nos preços cadastrados atualmente nos fornecedores.</span>'};
}
function weekKey(iso){
 const d=new Date(String(iso||'').slice(0,10)+'T12:00:00');if(Number.isNaN(d.getTime()))return '';
 const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return d.toISOString().slice(0,10);
}
function purchaseWeekly(raw){
 if(!/(compra|compras).*(media|média|semana|semanal)|(media|média).*(compra|compras)/i.test(raw))return null;
 const groups={};for(const p of arr('purchases')){const k=weekKey(p.date||p.issueDate||p.createdAt);if(!k)continue;groups[k]=(groups[k]||0)+q(p.total||p.value)}
 const vals=Object.entries(groups).sort((a,b)=>a[0].localeCompare(b[0]));if(!vals.length)return {kind:'system-info',title:'Compras por semana',text:'Não encontrei notas de compra com data para calcular a média.'};
 const total=vals.reduce((a,x)=>a+x[1],0),avg=total/vals.length,last=vals.slice(-8).reverse();
 return {kind:'system-info',title:'Média de compras por semana',text:'Média: <b>'+moneySafe(avg)+'</b> por semana · '+vals.length+' semana(s) com compras · total analisado '+moneySafe(total)+'<br><br>'+last.map(x=>'• Semana de '+escSafe(x[0])+' · <b>'+moneySafe(x[1])+'</b>').join('<br>')};
}
function moduleLabel(name,row){
 if(name==='orders')return 'Pedido #'+(row.orderNumber||row.id)+' · '+(row.client||'-');
 if(name==='clients')return 'Cliente · '+(row.name||'-');
 if(name==='products')return 'Produto · '+(row.name||'-');
 if(name==='materials')return 'Matéria-prima · '+(row.name||'-');
 if(name==='suppliers')return 'Fornecedor · '+(row.name||'-');
 if(name==='purchases')return 'Compra · '+(row.supplierName||'-')+' · '+moneySafe(row.total||0);
 if(name==='employees')return 'Funcionário · '+(row.name||'-');
 if(name==='cuts')return 'Corte · '+(row.product||row.op||row.id);
 if(name==='production')return 'Produção · '+(row.product||row.description||row.id);
 return name+' · '+(row.name||row.title||row.id||'-');
}

function findNamedClient(raw){
 const n=norm(raw);return arr('clients').filter(c=>c?.name&&n.includes(norm(c.name))).sort((a,b)=>String(b.name).length-String(a.name).length)[0]||null;
}
function deliveryRows(){
 const out=[];
 try{
  if(typeof allProjectionRows==='function'){
   for(const z of allProjectionRows()){
    const order=z?.order,item=z?.item;if(!order||!item)continue;
    const qty=typeof projectionDeliverableQty==='function'?q(projectionDeliverableQty(order,item)):q(item?.qty);
    if(qty<=0)continue;
    out.push({order,item,date:String(item?.date||order?.date||'').slice(0,10),qty,value:typeof projectionDeliverableValue==='function'?q(projectionDeliverableValue(order,item)):q(item?.value),client:item?.clientName||order?.client||'Sem cliente',product:item?.name||arr('products').find(p=>sid(p?.id)===sid(item?.productId))?.name||'Produto'});
   }
  }
 }catch(e){}
 if(out.length)return out;
 for(const order of arr('orders'))for(const item of (order?.projectionItems||[])){
  const qty=q(item?.remainingQty??item?.qty);if(qty<=0)continue;
  out.push({order,item,date:String(item?.date||order?.date||'').slice(0,10),qty,value:q(item?.value),client:item?.clientName||order?.client||'Sem cliente',product:item?.name||arr('products').find(p=>sid(p?.id)===sid(item?.productId))?.name||'Produto'});
 }
 return out;
}
function clientDeliveries(raw){
 const n=norm(raw);if(!/(entrega|entregas|entregar|sair|saida|projecao)/.test(n))return null;
 const client=findNamedClient(raw);if(!client)return null;
 const rows=deliveryRows().filter(x=>norm(x.client)===norm(client.name));
 if(!rows.length)return {kind:'system-info',title:'Entregas — '+client.name,text:'Não encontrei entregas disponíveis para <b>'+escSafe(client.name)+'</b> na Projeção.'};
 rows.sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999'))||String(a.product).localeCompare(String(b.product),'pt-BR'));
 const qty=rows.reduce((a,x)=>a+x.qty,0),value=rows.reduce((a,x)=>a+x.value,0);
 return {kind:'system-info',title:'Entregas — '+client.name,text:'<b>'+qty.toLocaleString('pt-BR')+' peças</b> · '+moneySafe(value)+'<br><br>'+rows.slice(0,20).map(x=>'• '+(x.date?escSafe(x.date)+' · ':'')+'<b>'+escSafe(x.product)+'</b> · '+x.qty.toLocaleString('pt-BR')+' peças').join('<br>')+(rows.length>20?'<br>… e mais '+(rows.length-20)+' item(ns).':'')};
}
function cutterTotals(raw){
 const n=norm(raw);if(!/(cortador|cortadores|cortou|cortaram|corte por cortador|producao do corte)/.test(n))return null;
 const groups={};
 for(const c of arr('cuts')){
  if(!c||String(c.status||'').toLowerCase()!=='finalizado')continue;
  const ct=arr('cutters').find(x=>sid(x?.id)===sid(c.cutterId)),name=ct?.name||c.cutterName||'Sem cortador';
  const g=groups[name]||(groups[name]={name,pieces:0,cuts:0});g.pieces+=q(c.pieces);g.cuts++;
 }
 const rows=Object.values(groups).sort((a,b)=>b.pieces-a.pieces||a.name.localeCompare(b.name,'pt-BR'));
 if(!rows.length)return {kind:'system-info',title:'Produção dos cortadores',text:'Ainda não encontrei cortes finalizados vinculados a cortadores.'};
 return {kind:'system-info',title:'Produção dos cortadores',text:rows.map(x=>'• <b>'+escSafe(x.name)+'</b> · '+x.pieces.toLocaleString('pt-BR')+' peças · '+x.cuts+' corte(s)').join('<br>')+'<br><br><span class="sub">Somente cortes finalizados vinculados ao cortador. Não mistura pedidos, compras ou matéria-prima.</span>'};
}

function fuzzyClient(raw){
 const n=norm(raw),all=arr('clients').filter(x=>x?.name);
 let exact=all.filter(x=>n.includes(norm(x.name))).sort((a,b)=>String(b.name).length-String(a.name).length)[0];
 if(exact)return exact;
 const ws=n.split(/\s+/).filter(x=>x.length>=3);
 return all.map(x=>({x,score:ws.some(w=>norm(x.name).includes(w)||w.includes(norm(x.name)))?1:0})).filter(z=>z.score).map(z=>z.x)[0]||null;
}
function fuzzyProduct(raw){
 const n=norm(raw),all=arr('products').filter(x=>x?.name);
 let exact=all.filter(x=>n.includes(norm(x.name))).sort((a,b)=>String(b.name).length-String(a.name).length)[0];
 if(exact)return exact;
 const ws=words(raw);
 return all.map(p=>({p,score:ws.filter(w=>norm(p.name).includes(w)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||String(b.p.name).length-String(a.p.name).length)[0]?.p||null;
}
function gradeMatrix(rows,productName){
 const ss=(typeof hlgbSortedSizes==='function'?hlgbSortedSizes(db.sizes):['P','M','G','GG']).map(String),groups={};
 for(const g of rows||[]){const color=g.color||'-';groups[color]=groups[color]||{};groups[color][g.size]=(groups[color][g.size]||0)+q(g.qty)}
 if(!Object.keys(groups).length)return '';
 return '<div style="overflow:auto"><table><thead><tr><th>Produto</th><th>Cor</th>'+ss.map(s=>'<th>'+escSafe(s)+'</th>').join('')+'<th>Total</th></tr></thead><tbody>'+Object.entries(groups).map(([color,map])=>'<tr><td><b>'+escSafe(productName)+'</b></td><td>'+escSafe(color)+'</td>'+ss.map(s=>'<td>'+q(map[s])+'</td>').join('')+'<td><b>'+ss.reduce((a,s)=>a+q(map[s]),0)+'</b></td></tr>').join('')+'</tbody></table></div>';
}
function clientProductGrade(raw){
 const n=norm(raw);if(!/(grade|tamanho|\b(?:p|m|g|gg)\b)/.test(n))return null;
 const client=fuzzyClient(raw),product=fuzzyProduct(raw);if(!client)return null;
 const clientOrders=arr('orders').filter(o=>norm(o?.client)===norm(client.name)&&!['cancelado','cancelada'].includes(norm(o?.status)));
 if(!product){
  const ids=[...new Set(clientOrders.flatMap(o=>(o.grade||[]).map(g=>sid(g.productId))).filter(Boolean))],names=ids.map(id=>arr('products').find(p=>sid(p.id)===id)?.name).filter(Boolean);
  return {kind:'system-info',title:'Grade — '+client.name,text:names.length?'Não identifiquei com segurança o produto citado. Para <b>'+escSafe(client.name)+'</b>, encontrei estes produtos em pedidos: '+names.slice(0,12).map(x=>'<b>'+escSafe(x)+'</b>').join(', ')+'.':'Não encontrei produtos em pedidos de <b>'+escSafe(client.name)+'</b>.'};
 }
 const matches=clientOrders.map(o=>({o,rows:(o.grade||[]).filter(g=>sid(g.productId)===sid(product.id)&&q(g.qty)>0)})).filter(x=>x.rows.length);
 if(!matches.length){
  const ids=[...new Set(clientOrders.flatMap(o=>(o.grade||[]).map(g=>sid(g.productId))).filter(Boolean))],other=ids.map(id=>arr('products').find(p=>sid(p.id)===id)?.name).filter(Boolean);
  return {kind:'system-info',title:'Grade — '+product.name+' / '+client.name,text:'Não encontrei <b>'+escSafe(product.name)+'</b> em nenhum pedido de <b>'+escSafe(client.name)+'</b>.'+(other.length?'<br><br>Outros produtos que aparecem para '+escSafe(client.name)+': '+other.slice(0,10).map(x=>'<b>'+escSafe(x)+'</b>').join(', ')+'.':'')};
 }
 const blocks=matches.slice(0,8).map(({o,rows})=>'<div class="panel" style="margin:8px 0;background:#fff"><b>Pedido #'+escSafe(o.orderNumber||o.id)+'</b> · '+escSafe(o.status||'-')+gradeMatrix(rows,product.name)+'</div>').join('');
 return {kind:'system-info',title:'Grade — '+product.name+' / '+client.name,text:blocks+(matches.length>8?'<div class="sub">Há mais '+(matches.length-8)+' pedido(s) com este produto.</div>':'')};
}
function weekBounds(){
 const d=new Date(),day=(d.getDay()+6)%7,start=new Date(d);start.setHours(0,0,0,0);start.setDate(d.getDate()-day);const end=new Date(start);end.setDate(start.getDate()+6);end.setHours(23,59,59,999);
 const iso=x=>x.toISOString().slice(0,10);return {start:iso(start),end:iso(end)};
}
function localIsoToday(){
 const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function addLocalDays(iso,n){const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function cutDate(c){return String(c?.plannedCutDate||c?.cutDate||c?.scheduledDate||c?.date||c?.createdAt||'').slice(0,10)}
function cutProduct(c){
 const p=arr('products').find(x=>sid(x?.id)===sid(c?.productId));if(p?.name)return p.name;
 if(c?.product)return c.product;if(c?.description)return c.description;
 const o=arr('orders').find(x=>sid(x?.id)===sid(c?.orderId)),g=(o?.grade||[]).find(x=>sid(x?.productId)===sid(c?.productId));
 return arr('products').find(x=>sid(x?.id)===sid(g?.productId))?.name||'Produto';
}
function cutPlan(raw){
 const n=norm(raw);if(!/(\bcorte\b|\bcortes\b|\bcortar\b|\bcortando\b)/.test(n)||/(cortador|cortadores|cortou|cortaram)/.test(n))return null;
 const today=localIsoToday(),tomorrow=addLocalDays(today,1),w=weekBounds();
 let mode='pending',label='Cortes pendentes';
 if(/hoje/.test(n)){mode='today';label='Cortes para hoje'}
 else if(/amanha/.test(n)){mode='tomorrow';label='Cortes para amanhã'}
 else if(/atrasad|vencid/.test(n)){mode='late';label='Cortes atrasados'}
 else if(/semana/.test(n)){mode='week';label='Cortes desta semana'}
 const active=arr('cuts').filter(c=>{
   const st=norm(c?.status);return c&&!st.includes('finalizado')&&!st.includes('concluido')&&!st.includes('cancelado');
 });
 let rows=active.filter(c=>{
   const d=cutDate(c);
   if(mode==='today')return d===today;
   if(mode==='tomorrow')return d===tomorrow;
   if(mode==='late')return !!d&&d<today;
   if(mode==='week')return !!d&&d>=w.start&&d<=w.end;
   return true;
 });
 rows.sort((a,b)=>{
   const oa=arr('orders').find(o=>sid(o?.id)===sid(a?.orderId)),ob=arr('orders').find(o=>sid(o?.id)===sid(b?.orderId));
   const pa=norm(oa?.priority),pb=norm(ob?.priority),rank=x=>x.includes('urgentissimo')?0:x.includes('urgente')?1:2;
   return rank(pa)-rank(pb)||String(cutDate(a)||'9999').localeCompare(String(cutDate(b)||'9999'));
 });
 if(!rows.length){
   const undated=active.filter(c=>!cutDate(c)).length;
   return {kind:'system-info',title:label,text:'Não encontrei cortes '+(mode==='today'?'programados para hoje':mode==='tomorrow'?'programados para amanhã':mode==='late'?'atrasados':mode==='week'?'programados nesta semana':'pendentes')+'.'+(undated?'<br><br><span class="sub">Há '+undated+' corte(s) pendente(s) sem data programada.</span>':'')};
 }
 const total=rows.reduce((a,c)=>a+q(c?.pieces),0);
 const text=rows.slice(0,30).map(c=>{
   const o=arr('orders').find(x=>sid(x?.id)===sid(c?.orderId)),ct=arr('cutters').find(x=>sid(x?.id)===sid(c?.cutterId));
   return '• '+(cutDate(c)?escSafe(cutDate(c))+' · ':'')+'<b>'+escSafe(cutProduct(c))+'</b> · '+q(c?.pieces).toLocaleString('pt-BR')+' pç'+(o?' · pedido #'+escSafe(o.orderNumber||o.id)+' · '+escSafe(o.client||'-'):'')+(o?.priority?' · '+escSafe(o.priority):'')+(ct?.name?' · cortador '+escSafe(ct.name):'');
 }).join('<br>');
 return {kind:'system-info',title:label,text:'<b>'+rows.length+' corte(s) · '+total.toLocaleString('pt-BR')+' peças</b><br><br>'+text+(rows.length>30?'<br>… e mais '+(rows.length-30)+' corte(s).':'')};
}
function cutterWeeklyPlan(raw){
 const n=norm(raw);if(!/(cortador|cortadores)/.test(n)||!/(semana|semanal|tem que cortar|precisa cortar|planejado|programado)/.test(n))return null;
 const w=weekBounds(),groups={};
 for(const c of arr('cuts')){
  if(!c||String(c.status||'').toLowerCase()==='finalizado')continue;
  const date=String(c.plannedCutDate||c.date||'').slice(0,10);if(!date||date<w.start||date>w.end)continue;
  const ct=arr('cutters').find(x=>sid(x?.id)===sid(c.cutterId));if(!ct)continue;
  const type=norm(ct.type||ct.kind||c.cutType||'');if(n.includes('intern')&&type&& !type.includes('intern'))continue;
  const g=groups[ct.name]||(groups[ct.name]={name:ct.name,pieces:0,cuts:0});g.pieces+=q(c.pieces);g.cuts++;
 }
 const rows=Object.values(groups).sort((a,b)=>b.pieces-a.pieces);
 if(!rows.length)return {kind:'system-info',title:'Cortes programados desta semana',text:'Não encontrei cortes programados para '+(n.includes('intern')?'cortadores internos':'cortadores')+' entre <b>'+w.start+'</b> e <b>'+w.end+'</b>.'};
 const total=rows.reduce((a,x)=>a+x.pieces,0);
 return {kind:'system-info',title:'Cortes programados desta semana',text:'Total: <b>'+total.toLocaleString('pt-BR')+' peças</b> entre '+w.start+' e '+w.end+'.<br><br>'+rows.map(x=>'• <b>'+escSafe(x.name)+'</b> · '+x.pieces.toLocaleString('pt-BR')+' peças · '+x.cuts+' corte(s)').join('<br>')};
}

function orderProductRows(order){
 const out=[],seen=new Set();
 for(const g of (order?.grade||[])){
  if(!g?.productId||q(g.qty)<=0)continue;
  const k=sid(g.productId)+'|'+sid(g.color)+'|'+sid(g.size),p=arr('products').find(x=>sid(x?.id)===sid(g.productId));
  out.push({productId:g.productId,product:p?.name||g.productName||'Produto',qty:q(g.qty),color:g.color||'',size:g.size||'',key:k});
 }
 if(out.length)return out;
 for(const it of (order?.itemsList||order?.products||order?.orderItems||[])){
  const pid=it?.productId||it?.id;if(!pid)continue;const p=arr('products').find(x=>sid(x?.id)===sid(pid));
  out.push({productId:pid,product:it?.name||p?.name||'Produto',qty:q(it?.qty||it?.quantity),color:it?.color||'',size:it?.size||''});
 }
 if(!out.length&&order?.productId){
  const p=arr('products').find(x=>sid(x?.id)===sid(order.productId));
  out.push({productId:order.productId,product:p?.name||order.product||order.items||'Produto',qty:q(order.qty||order.totalQty),color:order.color||'',size:order.size||''});
 }
 return out;
}
function clientOrderedMerchandise(raw){
 const n=norm(raw);
 if(!/(mercadoria|mercadorias|produto|produtos|modelo|modelos|o que|quais).*(pedido|pedidos|pediu|comprou)|(?:pedido|pedidos).*(mercadoria|mercadorias|produto|produtos|modelo|modelos)/.test(n))return null;
 const client=fuzzyClient(raw);if(!client)return null;
 const orders=arr('orders').filter(o=>norm(o?.client)===norm(client.name)&&!['cancelado','cancelada'].includes(norm(o?.status)));
 if(!orders.length)return {kind:'system-info',title:'Mercadorias pedidas — '+client.name,text:'Não encontrei pedidos cadastrados para <b>'+escSafe(client.name)+'</b>.'};
 const groups={};
 for(const o of orders)for(const r of orderProductRows(o)){
  const k=sid(r.productId)||norm(r.product),g=groups[k]||(groups[k]={product:r.product,qty:0,orders:new Set()});g.qty+=q(r.qty);g.orders.add(sid(o.orderNumber||o.id));
 }
 const rows=Object.values(groups).sort((a,b)=>b.qty-a.qty||a.product.localeCompare(b.product,'pt-BR'));
 if(!rows.length)return {kind:'system-info',title:'Mercadorias pedidas — '+client.name,text:'Encontrei pedido(s) de <b>'+escSafe(client.name)+'</b>, mas não encontrei os produtos detalhados nesses registros.'};
 return {kind:'system-info',title:'Mercadorias pedidas — '+client.name,text:rows.map(x=>'• <b>'+escSafe(x.product)+'</b> · '+x.qty.toLocaleString('pt-BR')+' peças · pedido(s) '+[...x.orders].map(n=>'#'+escSafe(n)).join(', ')).join('<br>')+'<br><br><span class="sub">Resposta limitada aos pedidos de '+escSafe(client.name)+'. Não inclui compras, fornecedores ou matéria-prima.</span>'};
}
function globalSearch(raw){
 const ws=words(raw);if(!ws.length)return null;
 const modules=['orders','clients','products','materials','suppliers','purchases','employees','cuts','production','factions','hubFinanceEntries','missingPieces'];
 const hits=[];
 for(const m of modules)for(const row of arr(m)){
  let hay='';try{hay=norm(JSON.stringify(row))}catch(e){continue}
  const score=ws.filter(w=>hay.includes(w)).length;if(score)hits.push({module:m,row,score});
 }
 hits.sort((a,b)=>b.score-a.score);
 if(!hits.length)return null;
 return {kind:'system-info',title:'Busca no sistema',text:hits.slice(0,15).map(h=>'• <b>'+escSafe(moduleLabel(h.module,h.row))+'</b>').join('<br>')+(hits.length>15?'<br>… e mais '+(hits.length-15)+' resultado(s).':'')};
}
function parse(raw){
 const n=norm(raw);
 const gr=clientProductGrade(raw);if(gr)return gr;
 const merch=clientOrderedMerchandise(raw);if(merch)return merch;
 const cp=cutPlan(raw);if(cp)return cp;
 const wp=cutterWeeklyPlan(raw);if(wp)return wp;
 const d=clientDeliveries(raw);if(d)return d;
 const ct=cutterTotals(raw);if(ct)return ct;
 if(/(mais barato|mais barata|menor preco|menor preço|comparar fornecedor|fornecedor mais)/.test(n))return materialSupplier(raw);
 const p=purchaseWeekly(raw);if(p)return p;
 if(/(procure|buscar|busca|encontre|onde|qual|quais|quem|quanto|quantos|mostrar|mostre|liste|lista|tem)/.test(n))return globalSearch(raw);
 return null;
}
function render(a){const out=document.getElementById('hlgbAssistantAnswer');if(!out||!a)return;out.innerHTML='<h3 style="margin-top:0">'+escSafe(a.title)+'</h3>'+a.text}
function install(){
 const old=window.hlgbAssistantAsk;if(typeof old!=='function'||old.__hlgbSystemWideV1)return;
 const w=function(){const raw=document.getElementById('hlgbAssistantInput')?.value||'',a=parse(raw);if(a){render(a);return}return old.apply(this,arguments)};
 w.__hlgbSystemWideV1=true;w.__original=old;window.hlgbAssistantAsk=w;
}
window.hlgbAssistantActions=window.hlgbAssistantActions||{};
window.hlgbRegisterAssistantAction=function(name,fn,canRun){if(name&&typeof fn==='function')window.hlgbAssistantActions[name]={fn,canRun:typeof canRun==='function'?canRun:()=>true}};
window.hlgbAssistantSystemWide={parse,materialSupplier,purchaseWeekly,clientDeliveries,cutterTotals,clientProductGrade,clientOrderedMerchandise,orderProductRows,cutPlan,cutterWeeklyPlan,gradeMatrix,deliveryRows,findNamedClient,globalSearch,weekKey,actions:window.hlgbAssistantActions};
setTimeout(install,2400);setInterval(()=>{if(window.HLGB_ASSISTANT_FINAL_V9250)return;if(typeof window.hlgbAssistantAsk==='function'&&!window.hlgbAssistantAsk.__hlgbSystemWideV1)install()},3500);
window.HLGB_ASSISTANT_SYSTEM_WIDE_GUARD=V;
})();