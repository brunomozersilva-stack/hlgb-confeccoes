/* HLGB Evolução — Corte BOM multimatéria, SÓ LAB FICTÍCIO.
 * Planejar/validar é puro. A execução afeta SOMENTE o clone do core.apply.
 * Não se conecta a produção, não grava no banco e não possui APIs externas.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGBLabBomCutV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const sizes=['P','M','G','GG'],sum=x=>Object.values(x).reduce((a,b)=>a+b,0);
 const byId=(rows,id)=>rows.find(x=>x.id===id);
 const norm=x=>String(x??'').trim().toLocaleUpperCase('pt-BR');
 function title(x,label){
  const t=String(x??'').trim();
  if(!t||t.length>95)throw Error(label+' obrigatório (até 95 caracteres).');
  return t;
 }
 const integer=(x,label,min=0,max=1000000)=>{
  if(!Number.isSafeInteger(x)||x<min||x>max)
   throw Error(label+' deve ser inteiro entre '+min+' e '+max+'.');
  return x;
 };
 function preview(s,p,planner){
  if(!planner||typeof planner.preview!=='function')
   throw Error('Ficha técnica de materiais indisponível; nenhuma baixa autorizada.');
  const order=byId(s.orders,p.orderId);
  if(!order)throw Error('Pedido de corte não encontrado.');
  const product=byId(s.products,order.productId);
  if(!product)throw Error('Modelo do pedido não encontrado.');
  const size=String(p.size||'');
  if(!sizes.includes(size))throw Error('Tamanho inválido para o corte.');
  const color=String(p.color||'').trim();
  const colors=Array.isArray(order.colorGrades)?order.colorGrades:[];
  const variant=colors.find(x=>norm(x.color)===norm(color));
  if(!variant||!color)throw Error('Cadastre a cor na grade do pedido antes de cortar pelo BOM.');
  if(!sizes.every(z=>colors.reduce((n,c)=>n+c.grade[z],0)===order.grade[z]))
   throw Error('Grade de cores incompleta. Complete P/M/G/GG antes de cortar.');
  const qty=integer(p.qty,'Quantidade de peças',1,10000);
  const runs=s.bomCutRuns||[];
  const prior=runs.filter(x=>x.orderId===order.id);
  const bySize=Object.fromEntries(sizes.map(sz=>[
   sz,prior.filter(r=>r.size===sz).reduce((n,r)=>n+r.qty,0)]));
  if(sizes.some(sz=>order.cut[sz]!==bySize[sz]))
   throw Error('Pedido já possui corte na rotina anterior. Não misture dois tipos de baixa.');
  if((s.cutPlans||[]).some(x=>x.orderId===order.id&&x.status==='aberto'))
   throw Error('Existe folha de corte aberta para este pedido. Cancele ou conclua antes de escolher o novo modo.');
  const previously=prior.filter(x=>x.color===variant.color&&x.size===size)
   .reduce((n,x)=>n+x.qty,0);
  if(previously+qty>variant.grade[size])
   throw Error('Corte excede a grade desta cor e tamanho.');
  if(order.cut[size]+qty>order.grade[size])
   throw Error('Corte excede a grade total do pedido.');
  // Calcula um lote temporário sem tocar nas linhas do planejamento semanal.
  const hypothetical={...s,materialPlanLines:[
   {id:'BOM-QUOTE',productId:product.id,color:variant.color,size,qty,active:true}
  ]};
  const quote=planner.preview(hypothetical);
  if(!quote.detail.length)throw Error('Nenhum material definido na ficha técnica desta variação.');
  const scrap=p.scrapByMaterial||{};
  if(!scrap||typeof scrap!=='object'||Array.isArray(scrap))
   throw Error('Desperdício por material inválido.');
  const ids=new Set(quote.detail.map(x=>x.materialId));
  for(const [id,weight] of Object.entries(scrap)){
   integer(weight,'Desperdício de '+id);
   if(weight>0&&!ids.has(id))
    throw Error('Desperdício informado para material que não faz parte desta ficha: '+id);
  }
  const materials=quote.detail.map(d=>{
   const material=byId(s.materials,d.materialId);
   const scrapGrams=integer(scrap[d.materialId]??0,'Desperdício de '+material.name);
   const totalGrams=d.requiredGrams+scrapGrams;
   if(!Number.isSafeInteger(totalGrams)||totalGrams>1000000)
    throw Error('Peso total do material fora do limite permitido.');
   return {
    materialId:material.id,materialName:material.name,ruleId:d.ruleId,
    gramsPerUnit:d.gramsPerUnit,requiredGrams:d.requiredGrams,scrapGrams,
    totalGrams,availableGrams:material.stockGrams,
    afterGrams:material.stockGrams-totalGrams,
    theoreticalCostCents:Math.ceil(totalGrams*material.priceCentsKg/1000),
    priceCentsKg:material.priceCentsKg
   };
  });
  const subtotal=materials.reduce((n,x)=>n+x.totalGrams,0);
  if(!Number.isSafeInteger(subtotal)||subtotal<=0)
   throw Error('Consumo do lote inválido.');
  return {schema:'hlgb-lab-corte-bom-preview-v1',orderId:order.id,
   productId:product.id,productName:product.name,color:variant.color,size,qty,
   materials,materialCount:materials.length,totalGrams:subtotal,
   estimatedCostCents:materials.reduce((n,x)=>n+x.theoreticalCostCents,0),
   canExecute:materials.every(x=>x.afterGrams>=0),
   stockWritten:false,stocksBefore:materials.map(x=>({id:x.materialId,grams:x.availableGrams}))};
 }
 function execute(s,p,ctx,planner){
  const calc=preview(s,p,planner);
  if(!calc.canExecute)
   throw Error('Estoque insuficiente para os materiais: '+
    calc.materials.filter(x=>x.afterGrams<0).map(x=>
     x.materialName+' (faltam '+(-x.afterGrams)+' g)').join(', ')+
    '. Nenhum material foi baixado.');
  if(!['interno','externo'].includes(p.workMode))
   throw Error('Escolha corte interno ou externo.');
  const cutterOne=title(p.cutterOne,'Cortador 1'),cutterTwo=title(p.cutterTwo,'Cortador 2'),
   spreader=title(p.spreader,'Enfestador'),signatureOne=title(p.signatureOne,'Conferência 1'),
   signatureTwo=title(p.signatureTwo,'Conferência 2');
  if(norm(cutterOne)===norm(cutterTwo))
   throw Error('Os dois cortadores devem ser diferentes.');
  if(norm(signatureOne)!==norm(cutterOne)||norm(signatureTwo)!==norm(cutterTwo))
   throw Error('As conferências devem coincidir com os dois cortadores do lote.');
  const reason=title(p.reason,'Justificativa do lote');
  // Nenhuma mutação começa antes de validar TODOS os insumos e as conferências.
  const order=byId(s.orders,calc.orderId);
  const record={id:ctx.next(s,'BOM'),orderId:calc.orderId,productId:calc.productId,
   color:calc.color,size:calc.size,qty:calc.qty,workMode:p.workMode,
   cutterOne,cutterTwo,spreader,signatureOne,signatureTwo,reason,
   commandId:ctx.uid,completed:true,totalGrams:calc.totalGrams,
   estimatedCostCents:calc.estimatedCostCents,
   materials:calc.materials.map(({materialId,ruleId,gramsPerUnit,
    requiredGrams,scrapGrams,totalGrams,priceCentsKg,theoreticalCostCents})=>
    ({materialId,ruleId,gramsPerUnit,requiredGrams,scrapGrams,totalGrams,
     priceCentsKg,theoreticalCostCents}))};
  for(const c of calc.materials){
   const mat=byId(s.materials,c.materialId);
   mat.stockGrams-=c.totalGrams;
   s.stockLedger.push({id:ctx.next(s,'MOV'),materialId:c.materialId,
    deltaGrams:-c.totalGrams,usefulGrams:c.requiredGrams,
    scrapGrams:c.scrapGrams,bomCutId:record.id,sourceId:calc.orderId,
    type:'corte-bom',commandId:ctx.uid});
  }
  order.cut[calc.size]+=calc.qty;
  if(!Array.isArray(s.bomCutRuns))s.bomCutRuns=[];
  s.bomCutRuns.push(record);
  return record.id+' · '+calc.qty+' '+calc.color+' '+calc.size+
   ' · '+calc.materialCount+' materiais · '+calc.totalGrams+
   ' g baixados apenas no laboratório fictício';
 }
 function inspect(s){
  const issues=[],runs=s.bomCutRuns||[],ids=new Set();
  for(const run of runs){
   const order=byId(s.orders,run.orderId),product=byId(s.products,run.productId);
   const variant=(order?.colorGrades||[]).find(x=>x.color===run.color);
   const moves=s.stockLedger.filter(x=>x.bomCutId===run.id);
   const bad=!run.id||ids.has(run.id)||!order||!product||
    order.productId!==product.id||!variant||!sizes.includes(run.size)||
    !Number.isSafeInteger(run.qty)||run.qty<1||
    !Array.isArray(run.materials)||run.materials.length<1||
    !run.commandId||!s.log.some(x=>x.commandId===run.commandId&&x.type==='cut.bom.execute')||
    !run.completed||!run.reason||!run.signatureOne||!run.signatureTwo||
    norm(run.cutterOne)===norm(run.cutterTwo)||
    norm(run.cutterOne)!==norm(run.signatureOne)||
    norm(run.cutterTwo)!==norm(run.signatureTwo)||
    moves.length!==run.materials?.length;
   if(bad)issues.push(String(run.id)+': documento de corte BOM sem origem ou conferência válida');
   ids.add(run.id);
   const matIds=new Set();
   for(const component of run.materials||[]){
    const mov=moves.filter(x=>x.materialId===component.materialId);
    if(matIds.has(component.materialId)||!byId(s.materials,component.materialId)||
     !Number.isSafeInteger(component.gramsPerUnit)||component.gramsPerUnit<1||
     !Number.isSafeInteger(component.requiredGrams)||
     component.requiredGrams!==run.qty*component.gramsPerUnit||
     !Number.isSafeInteger(component.scrapGrams)||component.scrapGrams<0||
     component.totalGrams!==component.requiredGrams+component.scrapGrams||
     !Number.isSafeInteger(component.priceCentsKg)||component.priceCentsKg<1||
     component.theoreticalCostCents!==
      Math.ceil(component.totalGrams*component.priceCentsKg/1000)||
     mov.length!==1||mov[0].type!=='corte-bom'||
     mov[0].commandId!==run.commandId||mov[0].sourceId!==run.orderId||
     mov[0].deltaGrams!==-component.totalGrams||
     mov[0].usefulGrams!==component.requiredGrams||
     mov[0].scrapGrams!==component.scrapGrams)
     issues.push(String(run.id)+': material ou movimento repetido/divergente '+String(component.materialId));
    matIds.add(component.materialId);
   }
   if(run.totalGrams!==(run.materials||[]).reduce((n,x)=>n+x.totalGrams,0)||
    run.estimatedCostCents!==(run.materials||[]).reduce((n,x)=>n+x.theoreticalCostCents,0))
    issues.push(String(run.id)+': custo ou consumo total divergente dos componentes');
  }
  for(const order of s.orders){
   const orderRuns=runs.filter(r=>r.orderId===order.id);
   if(!orderRuns.length)continue;
   if(s.cutPlans.some(p=>p.orderId===order.id&&p.status==='concluido'))
    issues.push(order.id+': folha simples e corte BOM misturados no mesmo pedido');
   for(const size of sizes){
    const accounted=orderRuns.filter(r=>r.size===size).reduce((n,r)=>n+r.qty,0);
    if(accounted!==order.cut[size])
     issues.push(order.id+': corte contabilizado diferente das remessas BOM em '+size);
    for(const variant of order.colorGrades||[]){
     const used=orderRuns.filter(r=>r.size===size&&r.color===variant.color)
      .reduce((n,r)=>n+r.qty,0);
     if(used>variant.grade[size])
      issues.push(order.id+': cortes BOM superam limite '+variant.color+' '+size);
    }
   }
  }
  for(const mov of s.stockLedger.filter(x=>x.type==='corte-bom')){
   if(!runs.some(r=>r.id===mov.bomCutId&&r.orderId===mov.sourceId))
    issues.push(String(mov.id)+': movimento de BOM órfão ou não associado ao pedido');
  }
  return issues;
 }
 return Object.freeze({version:'1.0.0',preview,execute,inspect});
});
