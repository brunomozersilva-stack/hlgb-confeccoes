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
    const payload={clientId:entry.clientId,sizes:entry.sizes,items:entry.items.map(i=>({productId:i.productId,colors:i.colors.map(c=>({color:c.color,grade:clone(c.grade)}))}))};
    const ref=prepare(s,payload,entry.items);
    if(JSON.stringify(ref.items)!==JSON.stringify(entry.items)||JSON.stringify(ref.totals)!==JSON.stringify(entry.totals)||JSON.stringify(ref.sizes)!==JSON.stringify(entry.sizes))fail('Dados, preços históricos ou totais divergentes');
   }catch(error){failures.push((entry?.id||'Sem ID')+': '+error.message);}
  }
  for(const event of s.log||[])if(event.type==='order.multi.create'&&!ids.has(event.description))
   failures.push('Pedido multimodelo removido, porém ainda presente na trilha: '+event.commandId+' / '+event.description);
  return failures;
 }
 return Object.freeze({version:'1.0.0',prepare,ensure,create,inspect,sizesOf});
});
