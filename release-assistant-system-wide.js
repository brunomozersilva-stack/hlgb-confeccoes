/* HLGB — Assistente: consultas amplas do sistema + registro de ações */
(function(){
'use strict';
const V='2026.10.01-assistant-system-wide-v2';
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
 try{
  if(typeof allProjectionRows==='function')return allProjectionRows().map(({order,item})=>({
   order,item,date:String(item?.date||'').slice(0,10),
   qty:typeof projectionDeliverableQty==='function'?q(projectionDeliverableQty(order,item)):q(item?.qty),
   value:typeof projectionDeliverableValue==='function'?q(projectionDeliverableValue(order,item)):q(item?.value),
   client:item?.clientName||order?.client||'Sem cliente',
   product:item?.name||arr('products').find(p=>sid(p?.id)===sid(item?.productId))?.name||'Produto'
  })).filter(x=>x.qty>0);
 }catch(e){return []}
 return [];
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
window.hlgbAssistantSystemWide={parse,materialSupplier,purchaseWeekly,clientDeliveries,cutterTotals,deliveryRows,findNamedClient,globalSearch,weekKey,actions:window.hlgbAssistantActions};
setTimeout(install,2400);setInterval(()=>{if(typeof window.hlgbAssistantAsk==='function'&&!window.hlgbAssistantAsk.__hlgbSystemWideV1)install()},3500);
window.HLGB_ASSISTANT_SYSTEM_WIDE_GUARD=V;
})();