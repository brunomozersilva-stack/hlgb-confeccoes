/* HLGB Evolução — folha A4 do Corte multimodelo exclusivamente fictício.
 * Visualização pura: não escreve, não imprime automaticamente, não consome estoque.
 * Não atribuir assinatura física a nomes digitados no ensaio.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabMultiCutSheetV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const norm=x=>String(x??'').trim().toLocaleUpperCase('pt-BR');
 const qty=xs=>xs.reduce((n,x)=>n+x.qty,0);
 const sizeOrder=['PP','P','M','G','GG','XG','G1','G2','G3','G4'];
 const fmtGrams=x=>Number.isSafeInteger(x)?(x/1000).toFixed(3).replace('.',',')+' kg':'________ kg';
 const error=m=>{throw Error(m)};
 function read(s,id){
  const plan=(s.multiCutPlans||[]).find(x=>x.id===id);
  if(!plan)error('Folha multimodelo não encontrada neste documento fictício.');
  const order=(s.multiOrders||[]).find(x=>x.id===plan.orderId);
  const item=order?.items.find(x=>x.id===plan.itemId);
  const product=s.products.find(x=>x.id===plan.productId),client=s.clients.find(x=>x.id===order?.clientId);
  if(!order||!item||!product||item.productId!==product.id||!client)
   error('Folha e pedido multimodelo não conciliados. Não imprimir.');
  const sizes=[...new Set(plan.lines.map(x=>x.size))].sort((a,b)=>{
   const ai=sizeOrder.indexOf(a.toUpperCase()),bi=sizeOrder.indexOf(b.toUpperCase());
   return (ai<0?100:ai)-(bi<0?100:bi)||a.localeCompare(b,'pt-BR');
  });
  const colors=[...new Set(plan.lines.map(x=>x.color))];
  if(!plan.qty||qty(plan.lines)!==plan.qty)error('Quantidade impressa diverge da programação. Não imprimir.');
  return {plan,order,item,product,client,sizes,colors};
 }
 function materials(s,plan,product){
  const rules=(s.materialRecipeRules||[]).filter(r=>r.active&&r.productId===product.id);
  const ids=new Set([product.materialId,...rules.map(r=>r.materialId)]);
  const rows=[];
  for(const id of ids){
   const mat=s.materials.find(x=>x.id===id);
   if(!mat)error('Matéria-prima da ficha técnica ausente: '+id);
   let amount=0,origin=new Set();
   for(const line of plan.lines){
    let best=null,bestRank=-1;
    for(const rule of rules){
     if(rule.materialId!==id)continue;
     if(rule.color!=='*'&&norm(rule.color)!==norm(line.color))continue;
     if(rule.size!=='*'&&norm(rule.size)!==norm(line.size))continue;
     const rank=(rule.color==='*'?0:2)+(rule.size==='*'?0:1);
     if(rank>bestRank){best=rule;bestRank=rank;}
    }
    const per=best?best.gramsPerUnit:id===product.materialId?product.gramsPerUnit:0;
    if(!Number.isSafeInteger(per)||per<0||per>5000)error('Consumo técnico inválido para '+mat.name);
    amount+=per*line.qty;
    if(best)origin.add('Receita '+best.id);
    else if(per)origin.add('Ficha básica');
   }
   if(!Number.isSafeInteger(amount)||amount<0||amount>100000000)error('Previsão de material inválida.');
   if(amount)rows.push({id,name:mat.name,unit:'kg',plannedGrams:amount,origin:[...origin].join(' + ')});
  }
  return rows;
 }
 function preview(s,id){
  const {plan,order,item,product,client,sizes,colors}=read(s,id);
  const mats=materials(s,plan,product);
  const w=Array.isArray(plan.weightEvents)&&plan.weightEvents.length?plan.weightEvents.at(-1):null;
  const totalsBySize=Object.fromEntries(sizes.map(size=>[size,plan.lines.filter(x=>x.size===size).reduce((n,x)=>n+x.qty,0)]));
  return {plan,order,item,product,client,sizes,colors,materials:mats,weight:w,
   totalPieces:plan.qty,totalsBySize,
   totalPlannedGrams:mats.reduce((n,x)=>n+x.plannedGrams,0),
   sampleOnly:true,stockWritten:false,productionApproval:false};
 }
 function matrix(p){
  const {sizes,colors,plan,totalsBySize}=p;
  const heads=sizes.map(s=>'<th>'+esc(s)+'</th>').join('');
  const cells=colors.map(color=>{
   let total=0;
   const values=sizes.map(size=>{const n=plan.lines.filter(x=>x.color===color&&x.size===size).reduce((a,x)=>a+x.qty,0);total+=n;return '<td class="num">'+n+'</td>';}).join('');
   return '<tr><th>'+esc(color)+'</th>'+values+'<th class="num">'+total+'</th></tr>';
  }).join('');
  return '<table class="mc-matrix"><thead><tr><th>Cor</th>'+heads+'<th>Total</th></tr></thead><tbody>'+
   cells+'<tr class="mc-total"><th>Total</th>'+sizes.map(s=>'<th class="num">'+totalsBySize[s]+'</th>').join('')+
   '<th class="num">'+p.totalPieces+'</th></tr></tbody></table>';
 }
 function materialsTable(p){
  const rows=p.materials.length?p.materials:[{name:'Sem material previsto — conferência manual',origin:'',plannedGrams:null,unit:''}];
  return '<table><thead><tr><th>Matéria-prima</th><th>Un.</th><th>Critério</th><th>Previsto</th><th>Usado real</th><th>Diferença</th><th>Aprov. %</th><th>Observação</th></tr></thead><tbody>'+
   rows.map(m=>'<tr><td>'+esc(m.name)+'</td><td>'+esc(m.unit)+'</td><td>'+esc(m.origin)+'</td>'+
    '<td class="num">'+(m.plannedGrams==null?'—':fmtGrams(m.plannedGrams))+'</td><td class="write"></td><td class="write"></td><td class="write"></td><td class="write"></td></tr>').join('')+'</tbody></table>';
 }
 function weightTable(p){
  const w=p.weight;
  const rows=p.materials.length?p.materials:[{name:'Matéria-prima a conferir'}];
  return '<table><thead><tr><th>Material cortável</th><th>Total recebido</th><th>Usado</th><th>Lixo/retalho</th><th>Aproveitamento</th></tr></thead><tbody>'+
   rows.map(m=>'<tr><td>'+esc(m.name)+'</td><td class="write"></td><td class="write"></td><td class="write"></td><td class="write"></td></tr>').join('')+
   '<tr class="mc-total"><th>Total'+(w?' (último registro)':'')+'</th><td>'+fmtGrams(w?.totalGrams)+'</td><td>'+fmtGrams(w?.usedGrams)+'</td><td>'+fmtGrams(w?.wasteGrams)+'</td>'+
   '<td>'+(w?(100*w.usedGrams/w.totalGrams).toFixed(1).replace('.',',')+' %':'_____ %')+'</td></tr></tbody></table>';
 }
 function extrasTable(p){
  const headers=p.colors.slice(0,7),overflow=p.colors.slice(7);
  return '<table><thead><tr><th>Peça/modelo extra</th><th>Previsto principal</th><th>Obtido principal</th><th>Diferença</th>'+
   headers.map(x=>'<th>'+esc(x)+'</th>').join('')+(overflow.length?'<th>Outras</th>':'')+'<th>Total extras</th></tr></thead><tbody>'+
   '<tr><th>'+esc(p.product.name)+'</th><td class="num">'+p.totalPieces+'</td><td class="write"></td><td class="write"></td>'+
   headers.map(()=>'<td class="write"></td>').join('')+(overflow.length?'<td class="write"></td>':'')+'<td class="write"></td></tr>'+
   Array.from({length:3},()=>'<tr><td class="write"></td>'+Array.from({length:4+headers.length+(overflow.length?1:0)},()=>'<td class="write"></td>').join('')+'</tr>').join('')+
   '</tbody></table>'+(overflow.length?'<p class="mc-tiny">Outras cores: '+esc(overflow.join(', '))+'</p>':'');
 }
 function render(s,id){
  const p=preview(s,id);
  const status=p.plan.status==='concluido'?'CONCLUÍDO (ENSAIO)':p.plan.status==='cancelado'?'CANCELADO — NÃO UTILIZAR':'PROGRAMADO (ENSAIO)';
  const latest=p.weight,weightHistory=Array.isArray(p.plan.weightEvents)?p.plan.weightEvents.length:0;
  return '<article class="mc-sheet"><div class="mc-head"><div class="mc-brand"><b>HLGB</b><span>EVOLUÇÃO · LAB</span></div>'+
   '<div class="mc-title">FOLHA DO CORTADOR<br><small>MULTIMODELO · A4</small></div><div class="mc-no">'+esc(p.plan.id)+'</div></div>'+
   '<div class="mc-watermark">DOCUMENTO FICTÍCIO — NÃO UTILIZAR NA PRODUÇÃO</div>'+
   '<div class="mc-meta"><span><b>Pedido</b> '+esc(p.order.id)+'</span><span><b>Modelo</b> '+esc(p.product.name)+'</span><span><b>SKU</b> '+esc(p.product.sku)+'</span>'+
   '<span><b>Cliente</b> '+esc(p.client.name)+'</span><span><b>Peças</b> '+p.totalPieces+'</span><span><b>Data</b> '+esc(p.plan.scheduledDate)+'</span>'+
   '<span><b>Status</b> '+esc(status)+'</span><span><b>Prioridade</b> '+esc(p.plan.priority)+'</span><span><b>Tipo</b> ☐ Interno ☐ Externo</span></div>'+
   '<div class="mc-team"><div>Cortador 1: <b>'+esc(p.plan.cutterOne)+'</b></div><div>Cortador 2: <b>'+esc(p.plan.cutterTwo)+'</b></div>'+
   '<div>Infestador: <b>'+esc(p.plan.spreader)+'</b></div></div>'+
   '<h2>1. Grade por cor e tamanho — somente este modelo</h2>'+matrix(p)+
   '<h2>2. Matérias-primas e consumo previsto</h2><p class="mc-tiny">Previsão ilustrativa baseada na ficha técnica fictícia e nas receitas por variação, quando existentes. Não representa estoque baixado.</p>'+
   materialsTable(p)+
   '<h2>3. Pesagem e aproveitamento por matéria</h2>'+weightTable(p)+
   '<p class="mc-tiny">Peso histórico geral após conclusão: '+weightHistory+' registro(s). '+(latest?'Último conferido por '+esc(latest.checker)+'; motivo: '+esc(latest.reason)+'.':'Pesagem ainda não registrada.')+
   ' O peso do corte não reabre a grade nem baixa materiais.</p>'+
   '<h2>4. Aproveitamento e peças extras</h2><p class="mc-tiny">Anotar peças extras por cor. Não acrescentar automaticamente ao pedido nem às contas.</p>'+extrasTable(p)+
   '<h2>5. Resumo e conferência</h2><div class="mc-bottom"><div class="mc-check">'+
   ['Grade conferida','Matérias-primas conferidas','Peso e lixo conferidos','Peças extras anotadas','Totais reconciliados'].map(x=>'<p>☐ '+x+'</p>').join('')+
   '</div><div class="mc-note"><b>Observações / divergências</b><div class="mc-write-line"></div><div class="mc-write-line"></div><div class="mc-write-line"></div></div></div>'+
   '<div class="mc-sign"><div>Assinatura do Cortador 1</div><div>Assinatura do Cortador 2</div><div>Assinatura do Infestador</div></div>'+
   '<p class="mc-foot">Registro do laboratório; assinaturas são campos físicos em branco e não comprovam execução real. Folha '+esc(p.plan.id)+
   ' · Pedido '+esc(p.order.id)+' · Item '+esc(p.item.id)+' · revisão '+s.revision+'.</p></article>';
 }
 return Object.freeze({version:'1.0.0-lab-a4',preview,render});
});
