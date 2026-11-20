/* HLGB Evolução: pedido multimodelo em PREPARO fictício.
 * Não cria título, não movimenta produção nem converte registros reais.
 * Persistência apenas no documento isolado, com histórico/revisão transacional.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabMultiOrdersV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x));
 // PostgreSQL JSONB não preserva a ordem das chaves. Comparar valores, nunca posição das propriedades.
 const canonical=x=>JSON.stringify(x,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?
  Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
 const sum=x=>Object.values(x).reduce((n,v)=>n+v,0);
 function fail(text){throw Error(text);}
 function normalized(raw,max,label){
  if(typeof raw!=='string')fail(label+' inválido.');
  const value=raw.trim().replace(/\s+/g,' ');
  if(!value||value.length>max||!/^[\p{L}\p{N} .-]+$/u.test(value))fail(label+' inválido.');
  return value;
 }
 function sizesOf(raw){
  if(!Array.isArray(raw)||raw.length<1||raw.length>16)fail('Use de 1 a 16 tamanhos.');
  const sizes=[],seen=new Set();
  for(const x of raw){
   const size=normalized(x,12,'Tamanho'),key=size.toLocaleLowerCase('pt-BR');
   if(seen.has(key))fail('Tamanho duplicado: '+size);
   seen.add(key);sizes.push(size);
  }
  return sizes;
 }
 function prepare(s,p,snapshots=null){
  if(!s||!Array.isArray(s.clients)||!Array.isArray(s.products))fail('Catálogo indisponível.');
  if(!s.clients.some(x=>x.id===p?.clientId))fail('Cliente não encontrado.');
  const sizes=sizesOf(p.sizes);
  if(!Array.isArray(p.items)||p.items.length<1||p.items.length>20)fail('Cadastre de 1 a 20 modelos.');
  const items=[],bySize=Object.fromEntries(sizes.map(x=>[x,0]));
  let pieces=0,amountCents=0,colorCount=0;
  for(const [idx,item] of p.items.entries()){
   const product=s.products.find(x=>x.id===item?.productId);
   if(!product)fail('Modelo não encontrado: item '+(idx+1));
   if(!Array.isArray(item.colors)||item.colors.length<1||item.colors.length>30)fail('Informe de 1 a 30 cores por modelo.');
   const snap=snapshots?.[idx],priceCents=snap?snap.priceCents:product.priceCents;
   if(!Number.isSafeInteger(priceCents)||priceCents<0)fail('Preço fictício inválido no item '+(idx+1));
   const colors=[],seen=new Set(),sizesForItem=Object.fromEntries(sizes.map(x=>[x,0]));
   for(const row of item.colors){
    const color=normalized(row?.color,40,'Cor'),key=color.toLocaleLowerCase('pt-BR');
    if(color.length<2||seen.has(key))fail('Cor repetida ou curta em '+product.name+': '+color);
    seen.add(key);
    if(!row.grade||Array.isArray(row.grade)||Object.keys(row.grade).length!==sizes.length||sizes.some(x=>!Object.hasOwn(row.grade,x)))fail('Grade incompleta: '+color);
    const grade={};let count=0;
    for(const size of sizes){
     const qty=row.grade[size];
     if(!Number.isSafeInteger(qty)||qty<0||qty>10000)fail('Quantidade inválida em '+color+'/'+size);
     grade[size]=qty;count+=qty;bySize[size]+=qty;sizesForItem[size]+=qty;
    }
    if(count===0)fail('Linha zerada não pode ser salva: '+color);
    pieces+=count;colorCount++;
    colors.push({color,grade,pieces:count});
   }
   const qty=sum(sizesForItem),value=qty*priceCents;
   if(!Number.isSafeInteger(value))fail('Subtotal inseguro do modelo.');
   amountCents+=value;
   items.push({id:'ITM-'+String(idx+1).padStart(3,'0'),productId:product.id,
    sku:product.sku,name:product.name,priceCents,qty,amountCents:value,bySize:sizesForItem,colors});
  }
  if(pieces<1||pieces>100000||!Number.isSafeInteger(amountCents)||amountCents<0||sum(bySize)!==pieces)fail('Somatório inválido do pedido.');
  return {clientId:p.clientId,sizes,items,
   totals:{pieces,amountCents,bySize,models:items.length,colors:colorCount}};
 }
 function ensure(s){if(s.multiOrders===undefined)s.multiOrders=[];if(!Array.isArray(s.multiOrders))fail('Coleção de pedidos multimodelo ilegível.');}
 function create(s,p,next){
  ensure(s);
  const data=prepare(s,p),id=next(s,'PDM');
  s.multiOrders.push({id,...data,phase:'preparacao_nao_integrada',
   financeLinked:false,stockLinked:false,productionLinked:false,createdRevision:s.revision+1});
  return id;
 }
 function revise(s,p,{uid}){
  ensure(s);
  const order=s.multiOrders.find(x=>x.id===p.id);
  if(!order)fail('Pedido multimodelo não encontrado.');
  if(!p.reason||typeof p.reason!=='string'||!p.reason.trim()||p.reason.trim().length>240)
   fail('Justificativa de alteração obrigatória (até 240 caracteres).');
  const previous=clone({clientId:order.clientId,sizes:order.sizes,items:order.items,totals:order.totals});
  const before=canonical(previous);
  if(!Array.isArray(p.items)||p.items.length!==order.items.length||p.clientId&&p.clientId!==order.clientId)
   fail('Esta edição preserva cliente e identidade dos modelos existentes.');
  const payload={clientId:order.clientId,sizes:clone(order.sizes),items:order.items.map((item,index)=>{
   const proposed=p.items[index];
   if(!proposed||proposed.id!==item.id||proposed.productId!==item.productId||
      !Array.isArray(proposed.colors)||proposed.colors.length!==item.colors.length)
    fail('Modelo/cor não pode ser excluído ou trocado nesta edição de grade.');
   const colors=item.colors.map((row,i)=>{
    const candidate=proposed.colors[i];
    if(!candidate||candidate.color!==row.color)fail('A edição deve preservar a identidade das cores.');
    return {color:row.color,grade:clone(candidate.grade)};
   });
   return {productId:item.productId,colors};
  })};
  const next=prepare(s,payload,order.items);
  for(let i=0;i<next.items.length;i++){
   next.items[i].id=order.items[i].id;
   next.items[i].sku=order.items[i].sku;
   next.items[i].name=order.items[i].name;
  }
  if(canonical(next)===before)fail('A grade do pedido não sofreu alteração.');
  const reserved=new Map();
  for(const plan of s.multiCutPlans||[]){
   if(plan.orderId!==order.id||plan.status==='cancelado')continue;
   for(const line of plan.lines){
    const key=plan.itemId+'\u0000'+line.color+'\u0000'+line.size;
    reserved.set(key,(reserved.get(key)||0)+line.qty);
   }
  }
  for(const item of next.items)for(const row of item.colors)
   for(const [size,qty] of Object.entries(row.grade)){
    const reservedQty=reserved.get(item.id+'\u0000'+row.color+'\u0000'+size)||0;
    if(qty<reservedQty)fail('Não é possível reduzir '+item.id+' / '+row.color+' / '+size+
     ' abaixo de '+reservedQty+' peça(s) já programadas ou cortadas.');
   }
  const history={commandId:uid,revision:s.revision+1,reason:p.reason.trim(),
   before:previous,after:clone(next)};
  history.immutableFingerprint=canonical(history);
  order.items=next.items;order.totals=next.totals;
  if(!Array.isArray(order.revisions))order.revisions=[];
  order.revisions.push(history);
  return order.id;
 }
 function inspect(s){
  if(s.multiOrders===undefined)return [];
  if(!Array.isArray(s.multiOrders))return ['Coleção multimodelo inválida'];
  const failures=[],ids=new Set();
  for(const entry of s.multiOrders){
   try{
    if(!entry||typeof entry.id!=='string'||ids.has(entry.id))fail('ID duplicado/ausente');
    ids.add(entry.id);
    if(entry.phase!=='preparacao_nao_integrada'||entry.financeLinked!==false||entry.stockLinked!==false||entry.productionLinked!==false)fail('Vínculo comercial não autorizado');
    if(!Number.isSafeInteger(entry.createdRevision)||entry.createdRevision<2||entry.createdRevision>s.revision)fail('Revisão inválida');
    const proof=(s.log||[]).filter(e=>e.type==='order.multi.create'&&e.revision===entry.createdRevision&&e.description===entry.id);
    if(proof.length!==1)fail('Pedido sem evento de criação correspondente na trilha global');
    if(entry.revisions!==undefined){
     if(!Array.isArray(entry.revisions)||entry.revisions.length>200)fail('Histórico de edição do pedido inválido');
     let latestRevision=entry.createdRevision,previousSnapshot=null;
     for(const rev of entry.revisions){
      if(!rev||!Number.isSafeInteger(rev.revision)||rev.revision<=latestRevision||rev.revision>s.revision||
         typeof rev.commandId!=='string'||typeof rev.reason!=='string'||!rev.reason.trim()||
         rev.immutableFingerprint!==canonical({commandId:rev.commandId,revision:rev.revision,
          reason:rev.reason,before:rev.before,after:rev.after}))
       fail('Histórico de edição adulterado ou fora de ordem');
      if((s.log||[]).filter(e=>e.type==='order.multi.revise'&&e.revision===rev.revision&&e.commandId===rev.commandId&&e.description===entry.id).length!==1)
       fail('Edição do pedido sem evento correspondente no log');
      if(previousSnapshot&&canonical(rev.before)!==canonical(previousSnapshot))
       fail('Histórico de edição desconexo');
      previousSnapshot=rev.after;latestRevision=rev.revision;
     }
     if(previousSnapshot&&canonical(previousSnapshot)!==canonical({clientId:entry.clientId,sizes:entry.sizes,items:entry.items,totals:entry.totals}))
      fail('Grade foi alterada fora da edição auditada');
    }
    const payload={clientId:entry.clientId,sizes:entry.sizes,items:entry.items.map(i=>({productId:i.productId,colors:i.colors.map(c=>({color:c.color,grade:clone(c.grade)}))}))};
    const ref=prepare(s,payload,entry.items);
    if(canonical(ref.items)!==canonical(entry.items)||canonical(ref.totals)!==canonical(entry.totals)||canonical(ref.sizes)!==canonical(entry.sizes))fail('Dados, preços históricos ou totais divergentes');
   }catch(error){failures.push((entry?.id||'Sem ID')+': '+error.message);}
  }
  for(const event of s.log||[])if(event.type==='order.multi.create'&&!ids.has(event.description))
   failures.push('Pedido multimodelo removido, porém ainda presente na trilha: '+event.commandId+' / '+event.description);
  return failures;
 }
 return Object.freeze({version:'1.1.0-lab',prepare,ensure,create,revise,inspect,sizesOf});
});
