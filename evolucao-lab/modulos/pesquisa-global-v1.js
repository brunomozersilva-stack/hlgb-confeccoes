/* Pesquisa global HLGB — índice local, somente leitura, sem conteúdo de anexos. */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGBLabGlobalSearchV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
 const arr=(s,k)=>Array.isArray(s[k])?s[k]:[];
 const sum=x=>Object.values(x||{}).reduce((n,v)=>n+(Number.isSafeInteger(v)?v:0),0);
 const money=n=>Number.isSafeInteger(n)?(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—';
 const labels={produtos:'Produtos',pedidos:'Pedidos',corte:'Cortes',faccoes:'Facções',acertos:'Acertos',hub:'Financeiro',compras:'Compras',estoque:'Estoque',cadastros:'Cadastros',folha:'Folha',impressora3d:'Impressora 3D',central:'Ocorrências',nucleo:'Histórico'};
 function build(s){
  const rows=[],keys=new Set();
  const maps={};for(const k of ['products','orders','clients','factions','materials','suppliers','settlements','finance','purchaseOrders','purchaseRequests','paymentBatches','factionAssignments','settlementCompensations'])maps[k]=new Map(arr(s,k).map(x=>[x.id,x]));
  const get=(k,id)=>maps[k]?.get(id),name=(k,id)=>get(k,id)?.name||'';
  const orderInfo=id=>{const o=get('orders',id);return o?[o.id,name('products',o.productId),get('products',o.productId)?.sku,name('clients',o.clientId)]:[id]};
  const productInfo=id=>[name('products',id),get('products',id)?.sku,id];
  const materialInfo=id=>[name('materials',id),id];
  const orderOf=x=>x.orderId||get('settlements',x.settlementId)?.orderId||null;
  const sourceInfo=id=>{const a=get('settlements',id),c=get('settlementCompensations',id),o=get('orders',id),p=get('purchaseOrders',id);
   if(a)return [a.id,...orderInfo(a.orderId),...productInfo(a.productId),name('factions',a.factionId)];
   if(c)return [c.id,...sourceInfo(c.settlementId),c.reference];
   if(o)return orderInfo(id);
   if(p)return [p.id,...materialInfo(p.materialId),name('suppliers',p.supplierId)];
   return [id];
  };
  const add=(type,module,id,title,status,detail,terms=[],orderId=null)=>{
   if(typeof id!=='string'||!id)return;
   const key=type+'|'+id;if(keys.has(key))return;keys.add(key);
   const text=[id,title,status,detail,labels[module],...terms].filter(x=>typeof x==='string'||typeof x==='number').map(String).join(' ');
   rows.push({key,type,module,id,title:String(title||id),status:String(status||'Cadastro'),detail:String(detail||''),orderId:orderId||null,haystack:norm(text),titleKey:norm(title),idKey:norm(id),skuKey:type==='produto'?norm(terms[0]):''});
  };
  for(const p of arr(s,'products'))add('produto','produtos',p.id,p.name,'Cadastro',p.sku+' · '+name('materials',p.materialId),[p.sku,...materialInfo(p.materialId)]);
  const assignmentsFor=new Map();for(const a of arr(s,'factionAssignments')){const list=assignmentsFor.get(a.orderId)||[];list.push(a);assignmentsFor.set(a.orderId,list)}
  const cutsFor=new Map();for(const x of arr(s,'cutPlans')){const list=cutsFor.get(x.orderId)||[];list.push(x.id);cutsFor.set(x.orderId,list)}
  for(const o of arr(s,'orders')){
   const ordered=sum(o.grade),cut=sum(o.cut),sent=Number(o.allocated)||0,ret=Number(o.returned)||0,sep=Number(o.separated)||0,ship=Number(o.shipped)||0;
   const stage=ship>=ordered&&ordered>0?'Expedido':ship>0?'Expedição parcial':sep>0?'Separação':ret>0?'Retorno / acerto':sent>0?'Na facção':cut>=ordered&&ordered>0?'Corte concluído':cut>0?'Corte parcial':'Aguardando corte';
   const detail=ordered+' pedidas · '+cut+' cortadas · '+Math.max(0,sent-ret)+' na facção · '+ret+' retornadas · '+sep+' separadas · '+ship+' expedidas';
   add('pedido','pedidos',o.id,name('products',o.productId),stage,detail,[...orderInfo(o.id),...(cutsFor.get(o.id)||[]),...(assignmentsFor.get(o.id)||[]).map(a=>name('factions',a.factionId))],o.id);
   if(cut>0)add('corte-resumo','corte',o.id,'Corte · '+name('products',o.productId),cut>=ordered?'Concluído':'Parcial',cut+' de '+ordered+' peças cortadas · '+stage,[...orderInfo(o.id),'finalizado cortado corte'],o.id);
  }
  for(const x of arr(s,'cutPlans'))add('folha','corte',x.id,'Folha · '+name('products',get('orders',x.orderId)?.productId),x.status,sum(x.grade)+' peças · '+x.orderId,[...orderInfo(x.orderId),x.cutterOne,x.cutterTwo,x.spreader,x.workMode],x.orderId);
  for(const x of arr(s,'bomCutRuns'))add('corte-bom','corte',x.id,'Corte BOM · '+name('products',get('orders',x.orderId)?.productId),'Concluído',x.qty+' peças · '+x.color+' '+x.size,[...orderInfo(x.orderId),x.commandId,'finalizado'],x.orderId);
  for(const x of arr(s,'factions'))add('faccao','faccoes',x.id,x.name,'Cadastro',money(x.unitCents)+' / peça',[x.traveta?'faz travetada':'não faz travetada']);
  for(const x of arr(s,'factionAssignments'))add('envio','faccoes',x.id,name('factions',x.factionId)+' · '+name('products',get('orders',x.orderId)?.productId),x.qtySent===x.qtyReturned?'Retornado':'Pendente',x.qtySent+' enviadas · '+x.qtyReturned+' retornadas · '+(x.qtySent-x.qtyReturned)+' pendentes',[...orderInfo(x.orderId),x.factionId],x.orderId);
  for(const x of [...arr(s,'factionTransfers'),...arr(s,'factionPartialTransfers')])add('transferencia','faccoes',x.id,'Transferência de facção','Histórico',name('factions',x.fromFactionId)+' → '+name('factions',x.toFactionId)+' · '+x.qty+' peças',[...orderInfo(x.orderId),x.reason],x.orderId);
  for(const x of arr(s,'settlements'))add('acerto','acertos',x.id,name('factions',x.factionId)+' · '+(name('products',x.productId)||name('products',get('orders',x.orderId)?.productId)),x.status,x.qty+' peças · '+money(x.amountCents)+' · '+(x.serviceType||'costura'),[...orderInfo(x.orderId),...productInfo(x.productId),x.reason,x.serviceType,...(x.rateHistory||[]).flatMap(h=>[h.fromFactionName,h.toFactionName,h.reason])],x.orderId);
  for(const x of arr(s,'settlementCompensations'))add('compensacao','acertos',x.id,'Compensação · '+name('factions',x.factionId),x.status,money(x.deltaCents)+' · '+x.reference,[...sourceInfo(x.settlementId),x.reason],orderOf(x));
  for(const x of arr(s,'finance'))add('titulo','hub',x.id,x.description,x.status,money(x.amountCents)+' · '+x.kind,[...sourceInfo(x.sourceId),x.kind],get('orders',x.sourceId)?.id||orderOf(get('settlements',x.sourceId)||get('settlementCompensations',x.sourceId)||{})||null);
  for(const x of arr(s,'paymentBatches'))add('fechamento','hub',x.id,'Fechamento · '+(x.factionNameSnapshot||x.reference),x.status,money(x.totalCents)+' · '+x.count+' títulos',[x.reference,x.reason,...(x.items||[]).flatMap(i=>[i.financeId,...sourceInfo(i.sourceId)])]);
  for(const x of arr(s,'paymentReceipts'))add('comprovante','hub',x.id,x.fileName,'Versão '+x.version,money(x.amountCents)+' · '+x.targetId,[x.targetId,...(x.financeIds||[]),x.reason]);
  for(const x of arr(s,'purchaseRequests'))add('requisicao','compras',x.id,'Requisição · '+name('materials',x.materialId),x.status,x.qtyGrams+' g',[...materialInfo(x.materialId),x.purchaseId,x.requester,x.reason]);
  for(const x of arr(s,'purchaseOrders'))add('compra','compras',x.id,'Compra · '+name('materials',x.materialId),x.cancelled?'Cancelada':x.returnId?'Devolvida':x.received?'Recebida':'Pendente',x.qtyGrams+' g · '+name('suppliers',x.supplierId),[...materialInfo(x.materialId),x.purchaseRequestId,x.returnId]);
  for(const x of arr(s,'purchaseReturns'))add('devolucao','compras',x.id,'Devolução · '+name('materials',x.materialId),x.status,x.qtyGrams+' g · '+money(x.amountCents),[x.purchaseId,x.requestId,x.reference,x.reason]);
  for(const x of arr(s,'materials'))add('material','estoque',x.id,x.name,'Estoque',x.stockGrams+' g',[x.id]);
  for(const x of arr(s,'stockLedger'))add('movimento','estoque',x.id,'Movimento · '+name('materials',x.materialId),x.type,x.deltaGrams+' g · '+x.sourceId,[...sourceInfo(x.sourceId),x.commandId,x.note]);
  for(const [k,type,module] of [['clients','cliente','cadastros'],['suppliers','fornecedor','cadastros'],['employees','funcionario','folha'],['prints','impressao','impressora3d']])for(const x of arr(s,k))add(type,module,x.id,x.name,'Cadastro','',[]);
  for(const x of arr(s,'errors'))add('ocorrencia','central',x.id,x.message,x.status,x.module||'Ocorrência',[x.severity,x.reason]);
  for(const x of arr(s,'log'))add('evento','nucleo',x.commandId,x.type,'Histórico','Revisão '+x.revision+' · '+x.description,[x.actor]);
  return rows;
 }
 function search(index,query='',options={}){
  const q=norm(query).slice(0,150),tokens=q.split(' ').filter(Boolean);
  const module=options.module||'todos',limit=Math.max(1,Math.min(50,Number(options.limit)||20)),page=Math.max(1,Math.floor(Number(options.page)||1));
  const matches=[];
  for(const row of index){
   if(module!=='todos'&&row.module!==module)continue;
   if(tokens.length&&!tokens.every(t=>row.haystack.includes(t)))continue;
   const score=(row.idKey===q?1000:0)+(q&&row.skuKey===q?900:0)+(row.titleKey===q?200:0)+(row.titleKey.startsWith(q)?100:0)+(row.haystack.includes(q)?30:0)+(row.type==='produto'?15:row.type==='pedido'?8:0);
   matches.push({row,score});
  }
  matches.sort((a,b)=>b.score-a.score||a.row.id.localeCompare(b.row.id,'pt-BR',{numeric:true})||a.row.type.localeCompare(b.row.type));
  const counts={};for(const {row} of matches)counts[row.module]=(counts[row.module]||0)+1;
  return {total:matches.length,page,limit,counts,items:matches.slice((page-1)*limit,page*limit).map(({row})=>{const {haystack,titleKey,idKey,skuKey,...safe}=row;return safe})};
 }
 return Object.freeze({version:'1.0.0',build,search,labels,normalize:norm});
});
