/* HLGB Evolução — interface modular do percurso multimodelo fictício.
 * Apenas HTML; envia comandos ao núcleo isolado e não tem acesso a rede/estoque.
 */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabMultiFlowUiV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=x=>(x/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const sum=(a,k)=>a.reduce((n,x)=>n+x[k],0);
 const table=(headers,rows)=>'<div class="table-wrap"><table><thead><tr>'+headers.map(x=>'<th>'+esc(x)+'</th>').join('')+
  '</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+
  '</tbody></table></div>';
 const panel=(title,body)=>'<section class="panel"><h2>'+esc(title)+'</h2>'+body+'</section>';
 const input=(name,label,value,required=true,type='text')=>
  '<div class="field"><label>'+esc(label)+'<input class="input" type="'+type+'" name="'+esc(name)+'" value="'+esc(value)+
  '" '+(required?'required':'')+'></label></div>';
 const hidden=(name,value)=>'<input type="hidden" name="'+esc(name)+'" value="'+esc(value)+'">';
 const options=(list,selected='')=>list.map(([v,name])=>'<option value="'+esc(v)+'"'+(v===selected?' selected':'')+'>'+esc(name)+'</option>').join('');
 const select=(name,label,list,selected='')=>'<div class="field"><label>'+esc(label)+'<select name="'+esc(name)+'" class="input" required>'+
  options([['','Selecione explicitamente...'],...list],selected)+'</select></label></div>';
 const command=(type,fields,grade,label)=>'<form data-command="'+esc(type)+'"><div class="fields">'+fields+'</div>'+
  (grade||'')+'<button class="btn primary" type="submit">'+esc(label)+'</button></form>';
 const cutRows=x=>x.lines.map(y=>({...y,remaining:y.qty}));
 const key=x=>x.color+'|'+x.size;
 function grade(lines,limits){
  const availability=new Map(limits.map(x=>[key(x),x.remaining]));
  return '<div class="fields">'+lines.map(line=>{
   const max=availability.get(key(line))||0;
   return max>0?'<div class="field"><label>'+esc(line.color)+' / '+esc(line.size)+
    ' · saldo '+max+'<input class="input" data-mf-qty data-mf-color="'+esc(line.color)+
    '" data-mf-size="'+esc(line.size)+'" type="number" min="0" max="'+max+'" value="0" step="1"></label></div>':'';
  }).join('')+'</div>';
 }
 function readLines(form){
  const lines=[];
  for(const el of form.querySelectorAll('[data-mf-qty]')){
   const raw=String(el.value).trim();
   if(!/^(0|[1-9]\d*)$/.test(raw))throw Error('Quantidade inválida em '+el.dataset.mfColor+' / '+el.dataset.mfSize);
   const qty=Number(raw);
   if(!Number.isSafeInteger(qty)||qty>Number(el.max))throw Error('Quantidade maior que o saldo da variação.');
   if(qty)lines.push({color:el.dataset.mfColor,size:el.dataset.mfSize,qty});
  }
  if(!lines.length)throw Error('Escolha pelo menos uma variação com quantidade positiva.');
  return lines;
 }
 function balances(s,flow){
  return (s.multiOrders||[]).flatMap(o=>o.items.flatMap(item=>
   flow.orderBalance(s,o.id,item.id).filter(r=>r.ordered>0).map(r=>({
    ...r,orderId:o.id,itemId:item.id,model:item.name
   }))));
 }
 function balancePanel(s,flow){
  const rows=balances(s,flow);
  const count=k=>sum(rows,k);
  const stats=[['Pedidas',count('ordered')],['Cortadas',count('cut')],['A cortar',count('toCut')],
   ['Cortadas a separar',count('cutToSeparate')],['Retornadas disponíveis',count('availableToSeparate')],
   ['Separadas',count('separated')],['Expedidas',count('shipped')]];
  return panel('Multimodelo · saldo por cor e tamanho',
   '<p>Peças cortadas a separar incluem as que ainda estão na facção. As disponíveis para separação são somente as retornadas. Tudo nesta visão é fictício.</p>'+
   '<div class="metrics">'+stats.map(([name,n])=>'<div class="metric"><span>'+esc(name)+
    '</span><strong>'+n+'</strong></div>').join('')+'</div>'+
   table(['Pedido/modelo','Cor','Tamanho','Pedido','Cortado','A cortar','Na facção','Retornado','Cortadas a separar','Disp. separar','Separado','Expedido'],
    rows.map(r=>[r.orderId+' / '+r.model,r.color,r.size,r.ordered,r.cut,r.toCut,r.inFaction,
     r.returned,r.cutToSeparate,r.availableToSeparate,r.separated,r.shipped])));
 }
 function factionPanel(s,flow){
  const factions=s.factions.map(f=>[f.id,f.name]);
  const plans=(s.multiCutPlans||[]).filter(x=>x.status==='concluido');
  const lots=s.multiFlowLots||[];
  const creates=plans.map(p=>{
   const available=p.lines.map(line=>({...line,remaining:line.qty-
    lots.filter(l=>l.cutId===p.id).reduce((n,l)=>n+sum(l.lines.filter(x=>key(x)===key(line)),'qty'),0)}));
   if(!available.some(x=>x.remaining>0))return '';
   return '<details class="panel" data-mf-record="'+esc(p.orderId+'|'+p.itemId)+'"><summary>Corte '+esc(p.id)+' · '+esc(p.orderId)+'/'+esc(p.itemId)+'</summary>'+
    command('multi.flow.allocate',hidden('cutId',p.id)+select('factionId','Facção de destino',factions)+
     input('unitCents','Mão de obra por peça (R$)','5,50')+
     input('reason','Justificativa','Envio fictício por cor e tamanho'),
     grade(p.lines,available),'Enviar peças concluídas')+'</details>';
  }).join('');
  const existing=lots.map(l=>{
   const remaining=l.lines.map(line=>({...line,remaining:line.qty-
    (l.returns||[]).reduce((n,r)=>n+sum(r.lines.filter(x=>key(x)===key(line)),'qty'),0)}));
   const pending=remaining.reduce((n,x)=>n+x.remaining,0);
   const prev=l.returns.map(r=>[r.id,r.factionId,r.qty,money(r.amountCents),r.review?'Conferido':'A conferir']);
   return '<details class="panel"><summary>'+esc(l.id)+' · '+esc(l.orderId)+'/'+esc(l.itemId)+
    ' · Facção '+esc(l.factionId)+' · '+pending+' pendentes</summary>'+
    '<p>Origem '+esc(l.cutId)+' · '+l.qty+' peças · preço atual '+money(l.unitCents)+
    ' por peça. Transferências e preços anteriores permanecem no histórico.</p>'+
    (pending?command('multi.flow.return',hidden('id',l.id)+input('reason','Conferência','Retorno fictício parcial'),
     grade(l.lines,remaining),'Registrar retorno e acerto fictício')+
     command('multi.flow.transfer',hidden('id',l.id)+select('factionId','Nova facção do SALDO PENDENTE',factions)+
     input('unitCents','Nova mão de obra por peça (R$)',(l.unitCents/100).toFixed(2).replace('.',','))+
     input('reason','Motivo da transferência','Mudança do saldo pendente'),
     '', 'Transferir somente as peças pendentes')+
     command('multi.flow.rate',hidden('id',l.id)+
     input('unitCents','Novo valor por peça (R$)',(l.unitCents/100).toFixed(2).replace('.',','))+
     input('reason','Motivo da mão de obra','Revisão do valor futuro'),'','Revisar mão de obra futura'):'<p>Lote sem pendências.</p>')+
    table(['Retorno','Facção na devolução','Peças','Acerto fictício','Estado'],prev)+'</details>';
  }).join('');
  return panel('Facções multimodelo · envio e retorno por grade',
   '<p>Somente cortes concluídos podem ser enviados. Retornos com valor congelado nunca criam conta a pagar no Hub.</p>'+
   (creates||'<p>Sem cortes concluídos com saldo livre.</p>')+
   '<h3>Envios e retornos</h3>'+(existing||'<p>Sem envios multimodelo ainda.</p>'));
 }
 function separationPanel(s,flow){
  const blocks=(s.multiOrders||[]).flatMap(o=>o.items.map(item=>{
   const rows=flow.orderBalance(s,o.id,item.id);
   const forms=[];
   for(const [type,field,label] of [['multi.flow.separate','availableToSeparate','Separar peças retornadas'],
     ['multi.flow.ship','toShip','Expedir peças separadas']]){
    const available=rows.map(x=>({...x,remaining:x[field]}));
    if(!available.some(x=>x.remaining>0))continue;
    forms.push(command(type,hidden('orderId',o.id)+hidden('itemId',item.id)+
     input('reason','Conferência',type==='multi.flow.separate'?'Separação fictícia':'Expedição fictícia'),
     grade(rows,available),label));
   }
   return forms.length?'<details class="panel" data-mf-record="'+esc(o.id+'|'+item.id)+'" open><summary>'+esc(o.id)+' · '+esc(item.name)+'</summary>'+
    forms.join('')+'</details>':'';
  })).join('');
  return panel('Separação multimodelo · baixa parcial na grade',
   '<p>A separação só utiliza peças retornadas; a expedição usa somente peças separadas. Estas operações não alteram o programa comercial.</p>'+
   (blocks||'<p>Aguardando retornos de facções multimodelo.</p>')+
   table(['Movimento','Pedido/item','Peças','Variações'],
    [...(s.multiFlowSeparations||[]),...(s.multiFlowShipments||[])].map(x=>[x.id,x.orderId+'/'+x.itemId,
     x.qty,x.lines.map(r=>r.color+' '+r.size+': '+r.qty).join(' · ')])));
 }
 function acertoPanel(s,flow){
  const groups=flow.acertos(s),pending=groups.flatMap(g=>g.items.filter(r=>!r.reviewed));
  return panel('Acertos multimodelo · conferência sem pagamento',
   '<p>Cada retorno preserva facção, valor unitário e quantidade da data. Os valores são agrupados apenas para conferência fictícia; não há título no Hub.</p>'+
   table(['Facção','Itens','Valor simulado','A conferir','Conferido'],
    groups.map(g=>[g.name,g.items.length,money(g.totalCents),money(g.pendingCents),money(g.reviewedCents)]))+
   table(['Retorno','Facção','Pedido/modelo','Peças','Valor','Situação'],
    groups.flatMap(g=>g.items.map(r=>[r.id,g.name,r.orderId+'/'+r.itemId,r.qty,money(r.amountCents),
     r.reviewed?'Conferido':'Pendente'])))+
   pending.map(r=>'<div class="panel" data-mf-record="'+esc(r.id)+'"><b>'+esc(r.id)+'</b> · '+esc(r.orderId)+'/'+esc(r.itemId)+
    ' · '+money(r.amountCents)+' · aguardando conferência</div>').join('')+
   (pending.length?command('multi.flow.review',
    select('id','Acerto fictício',pending.map(r=>[r.id,r.id+' · '+money(r.amountCents)]))+
    input('reviewer','Conferente','Conferente fictício A')+input('reason','Motivo','Valores e peças conferidos'),
    '','Registrar conferência (não pagamento)'):'<p>Sem acertos fictícios aguardando conferência.</p>'));
 }
 function queue(s,flow){
  const queue=[];
  for(const o of s.multiOrders||[])for(const item of o.items||[]){
   for(const x of flow.orderBalance(s,o.id,item.id)){
    if(!x.ordered)continue;
    const ref=o.id+' / '+item.name+' / '+x.color+' / '+x.size,focus=o.id+'|'+item.id;
    if(x.toCut>0)queue.push({stage:'Corte pendente',ref,qty:x.toCut,to:'corte',focus});
    if(x.toAllocate>0)queue.push({stage:'Corte concluído para enviar à facção',ref,
     qty:x.toAllocate,to:'faccoes',focus});
    if(x.availableToSeparate>0)queue.push({stage:'Retorno disponível para separar',ref,
     qty:x.availableToSeparate,to:'separacao',focus});
    if(x.toShip>0)queue.push({stage:'Separado e disponível para expedir',ref,qty:x.toShip,to:'separacao',focus});
   }
  }
  for(const group of flow.acertos(s))for(const r of group.items.filter(x=>!x.reviewed))
   queue.push({stage:'Acerto fictício a conferir',ref:r.id+' / '+group.name,qty:r.qty,to:'acertos',focus:r.id});
  return queue;
 }
 function queuePanel(s,flow){
  const todo=queue(s,flow),ordered=['Corte pendente','Corte concluído para enviar à facção',
   'Retorno disponível para separar','Separado e disponível para expedir','Acerto fictício a conferir'];
  const sorted=todo.slice().sort((a,b)=>ordered.indexOf(a.stage)-ordered.indexOf(b.stage)||a.ref.localeCompare(b.ref,'pt-BR'));
  const rows=sorted.slice(0,120).map(x=>'<tr><td>'+esc(x.stage)+'</td><td>'+esc(x.ref)+'</td><td>'+
   x.qty+'</td><td><button type="button" class="btn" data-goto="'+esc(x.to)+'" data-mf-focus="'+esc(x.focus)+'">Abrir '+esc(x.to)+'</button></td></tr>').join('');
  return panel('Fila de trabalho por setor · multimodelo fictício',
   '<p>Mostra somente pendências calculadas a partir das grades e comandos deste exercício. Não possui prazo de entrega ou confirmação em outro computador; <b>não é uma fila real de produção</b>.</p>'+
   '<div class="metrics"><div class="metric"><span>Tarefas com saldo</span><strong>'+todo.length+'</strong></div>'+
   '<div class="metric"><span>Acertos por conferir</span><strong>'+
   todo.filter(x=>x.stage==='Acerto fictício a conferir').length+'</strong></div></div>'+
   (rows?'<div class="table-wrap"><table><thead><tr><th>Próxima etapa</th><th>Registro exato</th><th>Peças</th><th>Abrir módulo</th></tr></thead><tbody>'+
    rows+'</tbody></table></div>'+(todo.length>120?'<p>Lista parcial de 120 itens. Consulte o módulo para ver o restante.</p>':''):
    '<p>Sem pendências de operação multimodelo neste laboratório.</p>'));
 }
 return Object.freeze({balancePanel,factionPanel,separationPanel,acertoPanel,queue,queuePanel,readLines});
});
