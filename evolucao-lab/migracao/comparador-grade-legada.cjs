'use strict';
/* Comparação offline, read-only, entre um pedido comercial exportado e um
 * pedido multimodelo já preparado no laboratório. NÃO importa, converte,
 * atualiza, publica ou reconcilia financeiro. Não aceitar produção real
 * sem autenticação, backup, validação de preço e vínculo de documentos. */
const norm=x=>String(x??'').normalize('NFC').trim().toLocaleLowerCase('pt-BR');
const text=(x,label,max=160)=>{
 if(typeof x!=='string'||!x.trim()||x.length>max)throw Error(label+' ausente/inválido');
 return x.trim();
};
const qty=(x,context)=>{
 if(!Number.isSafeInteger(x)||x<0||x>1000000)
  throw Error('Quantidade inválida em '+context);
 return x;
};
const cell=(productId,color,size)=>[norm(productId),norm(color),norm(size)].join('\u0000');
function rowsFromLegacy(legacy){
 if(!legacy||!Array.isArray(legacy.grade))throw Error('Grade comercial ilegível');
 if(legacy.grade.length>10000)throw Error('Grade comercial acima do limite de revisão');
 const rows=new Map();
 for(const [index,g] of legacy.grade.entries()){
  const productId=text(g?.productId,'Modelo legado '+index),
   color=text(g?.color,'Cor legado '+index),size=text(g?.size,'Tamanho legado '+index,40);
  const value=qty(g?.qty,productId+' / '+color+' / '+size);
  const key=cell(productId,color,size);
  if(rows.has(key))throw Error('Grade comercial contém linha duplicada: '+productId+' / '+color+' / '+size);
  if(value>0)rows.set(key,{productId,color,size,qty:value,key});
 }
 return rows;
}
function rowsFromPrepared(prepared){
 if(!prepared||!Array.isArray(prepared.items)||!prepared.items.length||
  prepared.items.length>100||!Array.isArray(prepared.sizes))
  throw Error('Pedido multimodelo preparado ilegível');
 const rows=new Map(),ids=new Set(),products=new Set();
 for(const item of prepared.items){
  const itemId=text(item?.id,'ID do item'),pid=text(item?.productId,'Modelo preparado');
  if(ids.has(itemId))throw Error('ID de item duplicado: '+itemId);
  ids.add(itemId);
  if(products.has(norm(pid)))throw Error('Mesmo produto em dois itens: requer conciliação explícita '+pid);
  products.add(norm(pid));
  if(!Array.isArray(item.colors)||item.colors.length>1000)throw Error('Cores do modelo ilegíveis');
  for(const colorGrade of item.colors){
   const color=text(colorGrade?.color,'Cor preparada');
   if(!colorGrade.grade||Array.isArray(colorGrade.grade)||typeof colorGrade.grade!=='object')
    throw Error('Grade preparada ilegível: '+pid+' / '+color);
   for(const [size,raw] of Object.entries(colorGrade.grade)){
    text(size,'Tamanho preparado',40);
    if(!prepared.sizes.includes(size))throw Error('Tamanho fora da grade do pedido: '+size);
    const value=qty(raw,pid+' / '+color+' / '+size),key=cell(pid,color,size);
    if(rows.has(key))throw Error('Linha preparada duplicada: '+pid+' / '+color+' / '+size);
    if(value>0)rows.set(key,{itemId,productId:pid,color,size,qty:value,key});
   }
  }
 }
 if(rows.size>10000)throw Error('Grade preparada acima do limite de revisão');
 return rows;
}
function compare(legacy,prepared){
 // Ids diferentes não significam equivalência automática de documentos.
 const legacyId=text(legacy?.id,'ID do pedido comercial');
 const preparedId=text(prepared?.id,'ID do pedido preparado');
 const old=rowsFromLegacy(legacy),current=rowsFromPrepared(prepared);
 const diff=[];
 const keys=new Set([...old.keys(),...current.keys()]);
 let legacyTotal=0,preparedTotal=0;
 for(const row of old.values())legacyTotal+=row.qty;
 for(const row of current.values())preparedTotal+=row.qty;
 if(!Number.isSafeInteger(legacyTotal)||!Number.isSafeInteger(preparedTotal))
  throw Error('Total de pedido fora do limite numérico');
 for(const key of keys){
  const l=old.get(key),n=current.get(key),v=l||n;
  if(l?.qty===n?.qty)continue;
  diff.push({productId:v.productId,color:v.color,size:v.size,
   itemId:n?.itemId||null,legacyQty:l?.qty||0,preparedQty:n?.qty||0,
   delta:(n?.qty||0)-(l?.qty||0),
   reason:!l?'incluido_no_preparo':!n?'ausente_no_preparo':'quantidade_divergente'});
 }
 diff.sort((a,b)=>a.productId.localeCompare(b.productId,'pt-BR')||
  a.color.localeCompare(b.color,'pt-BR')||a.size.localeCompare(b.size,'pt-BR'));
 const oldClient=typeof legacy.clientId==='string'&&legacy.clientId.trim()?legacy.clientId.trim():null;
 const newClient=typeof prepared.clientId==='string'&&prepared.clientId.trim()?prepared.clientId.trim():null;
 const clientComparable=!!(oldClient&&newClient);
 const sameClient=clientComparable&&norm(oldClient)===norm(newClient);
 const gradeEquivalent=diff.length===0&&legacyTotal===preparedTotal;
 const warnings=[
  'Preço de venda, condição por cliente e títulos financeiros não conciliados',
  'Estoque, cortes executados, reservas, envios e acertos não conciliados',
  'Documentos e permissões comerciais não migrados nem validados em servidor'
 ];
 if(!clientComparable)warnings.unshift('Cliente sem identidade consistente nos dois formatos');
 else if(!sameClient)warnings.unshift('Cliente diferente entre origem e preparo');
 return Object.freeze({
  schema:'hlgb-grade-legada-comparacao-v1',
  source:{orderId:legacyId,lines:old.size,pieces:legacyTotal},
  target:{orderId:preparedId,lines:current.size,pieces:preparedTotal},
  clientComparable,sameClient,gradeEquivalent,
  reviewRequired:!gradeEquivalent||!sameClient,
  readyForCommercialMigration:false,
  canWrite:false,canCreateFinancialTitle:false,canCreateStockMovement:false,
  diffs:diff,warnings
 });
}
module.exports=Object.freeze({compare});
