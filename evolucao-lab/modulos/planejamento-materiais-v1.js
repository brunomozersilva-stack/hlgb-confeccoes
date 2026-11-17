/* HLGB Evolução — paleta e planejamento de materiais V1, somente LAB FICTÍCIO.
 * Sem rede, IndexedDB próprio, baixas de estoque ou geração de contas. Um único
 * escritor transacional continua em operacao-integrada-core.js.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGBLabMaterialsPlannerV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const sizes=['P','M','G','GG'],all='*',baseColors=['Preto','Branco','Rubi'];
 const byId=(list,id)=>list.find(x=>x.id===id);
 const key=x=>String(x??'').trim().toLocaleUpperCase('pt-BR');
 const colorName=value=>{
  const c=String(value??'').trim().replace(/\s+/g,' ');
  if(c.length<2||c.length>40||!/^[\p{L}\p{N} .-]+$/u.test(c))
   throw Error('Nome de cor deve ter 2 a 40 caracteres e não pode conter símbolos.');
  return c;
 };
 const safe=(n,min,max,label)=>{
  if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(label+' inválido; informe inteiro entre '+min+' e '+max+'.');
  return n;
 };
 const reason=value=>{
  const r=String(value??'').trim();
  if(!r||r.length>95)throw Error('Justificativa obrigatória (até 95 caracteres).');
  return r;
 };
 const seed=()=>baseColors.map((name,i)=>({id:'CLR-'+String(i+1).padStart(4,'0'),
  name,origin:'paleta-ficticia',createdCommandId:null}));
 function ensure(s){
  if(!Array.isArray(s.colorCatalog)){
   s.colorCatalog=seed();
   s.ids.CLR=Math.max(s.ids.CLR||0,3);
  }
  if(!Array.isArray(s.materialRecipeRules))s.materialRecipeRules=[];
  if(!Array.isArray(s.materialPlanLines))s.materialPlanLines=[];
 }
 function palette(s){return Array.isArray(s.colorCatalog)?s.colorCatalog:seed()}
 function registerColor(s,p,ctx){
  ensure(s);const name=colorName(p.name);
  if(s.colorCatalog.some(x=>key(x.name)===key(name)))
   throw Error('Cor já cadastrada; selecione o cadastro existente.');
  const item={id:ctx.next(s,'CLR'),name,origin:'cadastro-lab',
   createdCommandId:ctx.uid};
  s.colorCatalog.push(item);
  return item.id+' · '+name;
 }
 function validateVariant(s,p){
  const product=byId(s.products,p.productId);
  if(!product)throw Error('Modelo da ficha técnica não localizado.');
  const material=byId(s.materials,p.materialId);
  if(!material)throw Error('Material da ficha técnica não localizado.');
  const color=String(p.color||all),size=String(p.size||all);
  if(color!==all&&!palette(s).some(x=>key(x.name)===key(color)))
   throw Error('Cor não está na paleta central. Cadastre-a primeiro.');
  if(size!==all&&!sizes.includes(size))throw Error('Tamanho inválido na receita.');
  const canonical=color===all?all:palette(s).find(x=>key(x.name)===key(color)).name;
  return {product,material,color:canonical,size};
 }
 function setRecipe(s,p,ctx){
  ensure(s);const v=validateVariant(s,p),grams=safe(p.gramsPerUnit,1,5000,'Consumo por peça'),
   why=reason(p.reason);
  const old=s.materialRecipeRules.find(x=>x.active&&x.productId===v.product.id&&
   x.materialId===v.material.id&&x.color===v.color&&x.size===v.size);
  // Histórico conservado: inativa a versão anterior, nunca a exclui.
  if(old){old.active=false;old.supersededCommandId=ctx.uid}
  const item={id:ctx.next(s,'RCP'),productId:v.product.id,
   materialId:v.material.id,color:v.color,size:v.size,gramsPerUnit:grams,
   reason:why,active:true,supersedes:old?.id||null,createdCommandId:ctx.uid};
  s.materialRecipeRules.push(item);
  return item.id+' · '+v.product.name+' · '+v.material.name+' · '+
   v.color+' '+v.size+' · '+grams+' g/peça (apenas previsão)';
 }
 function lineAdd(s,p,ctx){
  ensure(s);const product=byId(s.products,p.productId);
  if(!product)throw Error('Modelo para o planejamento não localizado.');
  const color=String(p.color||'');
  const registered=palette(s).find(x=>key(x.name)===key(color));
  if(!registered)throw Error('Selecione uma cor da paleta cadastrada.');
  if(!sizes.includes(p.size))throw Error('Selecione P, M, G ou GG.');
  const qty=safe(p.qty,1,10000,'Quantidade planejada');
  if(s.materialPlanLines.filter(x=>x.active).length>=100)
   throw Error('Limite de 100 linhas ativas; arquive linhas concluídas antes de continuar.');
  if(s.materialPlanLines.some(x=>x.active&&x.productId===product.id&&
   key(x.color)===key(registered.name)&&x.size===p.size))
   throw Error('Modelo/cor/tamanho já existe no planejamento. Arquive a linha para substituí-la.');
  const item={id:ctx.next(s,'PLN'),productId:product.id,color:registered.name,
   size:p.size,qty,active:true,createdCommandId:ctx.uid};
  s.materialPlanLines.push(item);
  return item.id+' · '+product.name+' · '+item.color+' '+item.size+' · '+qty+
   ' peças (sem baixar estoque)';
 }
 function lineCancel(s,p,ctx){
  ensure(s);const item=byId(s.materialPlanLines,p.id);
  if(!item||!item.active)throw Error('Linha inexistente ou já arquivada.');
  item.active=false;item.cancelReason=reason(p.reason);item.cancelCommandId=ctx.uid;
  return item.id+' · arquivada com histórico, sem excluir a linha';
 }
 function bestRule(rules,productId,materialId,color,size){
  let best=null,score=-1;
  for(const r of rules){
   if(!r.active||r.productId!==productId||r.materialId!==materialId)continue;
   if(r.color!==all&&key(r.color)!==key(color))continue;
   if(r.size!==all&&r.size!==size)continue;
   const rank=(r.color===all?0:2)+(r.size===all?0:1);
   if(rank>score){best=r;score=rank}
  }
  return best;
 }
 function preview(s){
  // Puro: mesmo em documentos anteriores, não executa migração nem cria linhas.
  const rules=(s.materialRecipeRules||[]).filter(x=>x.active),
   lines=(s.materialPlanLines||[]).filter(x=>x.active);
  const detail=[],group=new Map(),byProduct=new Map();
  for(const line of lines){
   const product=byId(s.products,line.productId);
   if(!product||!sizes.includes(line.size)||!Number.isSafeInteger(line.qty)||line.qty<1)
    throw Error('Linha de planejamento inconsistente; confira o ID '+String(line.id));
   const materialIds=new Set([product.materialId,...rules.filter(x=>x.productId===product.id)
    .map(x=>x.materialId)]);
   let lineGrams=0;
   for(const materialId of materialIds){
    const material=byId(s.materials,materialId);
    if(!material)throw Error('Material da receita não encontrado: '+materialId);
    const r=bestRule(rules,product.id,materialId,line.color,line.size);
    const perPiece=r?r.gramsPerUnit:materialId===product.materialId?product.gramsPerUnit:0;
    if(!Number.isSafeInteger(perPiece)||perPiece<0||perPiece>5000)
     throw Error('Consumo da ficha técnica inválido para '+product.id);
    if(!perPiece)continue;
    const grams=line.qty*perPiece;
    if(!Number.isSafeInteger(grams))throw Error('Previsão maior que limite seguro.');
    lineGrams+=grams;
    detail.push({lineId:line.id,productId:product.id,productName:product.name,
     sku:product.sku,color:line.color,size:line.size,qty:line.qty,
     materialId,materialName:material.name,gramsPerUnit:perPiece,
     requiredGrams:grams,ruleId:r?.id||'ficha-basica'});
    group.set(materialId,(group.get(materialId)||0)+grams);
   }
   const g=byProduct.get(product.id)||{productId:product.id,name:product.name,
    sku:product.sku,lines:0,pieces:0,requiredGrams:0};
   g.lines++;g.pieces+=line.qty;g.requiredGrams+=lineGrams;
   byProduct.set(product.id,g);
  }
  const materials=[...group].map(([id,requiredGrams])=>{
   const mat=byId(s.materials,id),availableGrams=mat.stockGrams,
    missingGrams=Math.max(0,requiredGrams-availableGrams),
    costCents=Math.ceil(requiredGrams*mat.priceCentsKg/1000),
    purchaseCents=Math.ceil(missingGrams*mat.priceCentsKg/1000);
   return {materialId:id,name:mat.name,requiredGrams,availableGrams,
    missingGrams,priceCentsKg:mat.priceCentsKg,costCents,purchaseCents,
    action:missingGrams?'compra_sugerida':'estoque_suficiente'};
  }).sort((a,b)=>b.missingGrams-a.missingGrams||a.name.localeCompare(b.name));
  return {schema:'hlgb-lab-planejamento-materiais-v1',version:'1.0.0',
   scope:'producao_nova_hipotetica',stockWritten:false,
   purchaseCreated:false,realData:false,lines:lines.length,
   pieces:lines.reduce((n,x)=>n+x.qty,0),
   requiredGrams:materials.reduce((n,x)=>n+x.requiredGrams,0),
   estimatedCostCents:materials.reduce((n,x)=>n+x.costCents,0),
   missingCostCents:materials.reduce((n,x)=>n+x.purchaseCents,0),
   products:[...byProduct.values()].sort((a,b)=>a.name.localeCompare(b.name)),
   materials,detail};
 }
 function inspect(s){
  const issues=[],catalog=palette(s),colors=new Set(),rules=s.materialRecipeRules||[],
   plans=s.materialPlanLines||[],ruleKeys=new Set(),activeLines=new Set();
  for(const c of catalog){
   const k=key(c.name);
   try{colorName(c.name)}catch{issues.push(String(c.id)+': nome de cor inválido')}
   if(colors.has(k))issues.push(String(c.id)+': cor repetida no catálogo');
   colors.add(k);
  }
  for(const r of rules){
   const k=[r.productId,r.materialId,key(r.color),r.size].join('|');
   if(r.active&&ruleKeys.has(k))issues.push(String(r.id)+': regra ativa duplicada');
   if(r.active)ruleKeys.add(k);
   if(!byId(s.products,r.productId)||!byId(s.materials,r.materialId)||
    r.color!==all&&!catalog.some(x=>key(x.name)===key(r.color))||
    r.size!==all&&!sizes.includes(r.size)||
    !Number.isSafeInteger(r.gramsPerUnit)||r.gramsPerUnit<1||r.gramsPerUnit>5000||
    typeof r.active!=='boolean'||!r.reason||
    !s.log.some(e=>e.commandId===r.createdCommandId&&e.type==='material.recipe.set'))
    issues.push(String(r.id)+': receita sem origem, produto, material ou consumo válido');
  }
  for(const x of plans){
   const k=[x.productId,key(x.color),x.size].join('|');
   if(x.active&&activeLines.has(k))issues.push(String(x.id)+': planejamento duplicado');
   if(x.active)activeLines.add(k);
   if(!byId(s.products,x.productId)||!catalog.some(c=>key(c.name)===key(x.color))||
    !sizes.includes(x.size)||!Number.isSafeInteger(x.qty)||x.qty<1||x.qty>10000||
    typeof x.active!=='boolean'||
    !s.log.some(e=>e.commandId===x.createdCommandId&&e.type==='materials.plan.add')||
    (!x.active&&!s.log.some(e=>e.commandId===x.cancelCommandId&&e.type==='materials.plan.archive')))
    issues.push(String(x.id)+': linha de planejamento sem origem ou valor válido');
  }
  return issues;
 }
 return Object.freeze({version:'1.0.0',seed,ensure,palette,registerColor,setRecipe,lineAdd,
  lineCancel,preview,inspect});
});
