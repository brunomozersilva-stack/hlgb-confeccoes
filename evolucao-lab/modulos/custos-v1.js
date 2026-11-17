/* Custos e rateios gerenciais, exclusivamente fictícios. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabCostsV1=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const arr=(s,k)=>Array.isArray(s[k])?s[k]:[];
 const sum=(a,f)=>a.reduce((n,x)=>{const v=f(x),r=n+v;if(!Number.isSafeInteger(v)||!Number.isSafeInteger(r))throw Error('Valor fora do limite seguro');return r;},0);
 const qty=o=>sum(Object.values(o.grade),x=>x);
 const types=['corte','corte-planejado','corte-bom'];
 const cost=(grams,price)=>{if(!Number.isSafeInteger(grams)||grams<0||!Number.isSafeInteger(price)||price<=0||!Number.isSafeInteger(grams*price))throw Error('Peso ou preço inválido');return Math.ceil(grams*price/1000);};
 const eligible=f=>f?.kind==='pagar'&&!f.sourceId&&['Aluguel','Impostos','Transporte','Folha','Outras despesas'].includes(f.category)&&Number.isSafeInteger(f.amountCents)&&f.amountCents>0&&['aberto','pago'].includes(f.status);
 const allocations=s=>arr(s,'costAllocations');
 function capture(before,s,uid){const existing=new Set(arr(before,'stockLedger').map(x=>x.id));
 for(const m of arr(s,'stockLedger'))if(!existing.has(m.id)&&types.includes(m.type)){
 const mat=arr(s,'materials').find(x=>x.id===m.materialId);if(!mat||m.deltaGrams>=0)throw Error('Movimento de corte inválido.');
 const price=m.type==='corte-bom'?arr(s,'bomCutRuns').find(x=>x.id===m.bomCutId)?.materials?.find(x=>x.materialId===m.materialId)?.priceCentsKg:mat.priceCentsKg;
 m.costBasis={priceCentsKg:price,cents:cost(-m.deltaGrams,price),method:'referencia_no_corte',commandId:uid};
 }}
 function inspect(s){const problems=[],titles=new Map(arr(s,'finance').map(x=>[x.id,x])),orders=new Set(arr(s,'orders').map(x=>x.id)),events=new Map(arr(s,'log').map(e=>[e.commandId,e])),used=new Map(),seen=new Set();
 for(const a of allocations(s)){const f=titles.get(a.financeId),e=events.get(a.commandId);
 if(!eligible(f)||!orders.has(a.orderId)||!Number.isSafeInteger(a.amountCents)||a.amountCents<=0||!a.reason||seen.has(a.commandId)||e?.type!=='cost.allocate'||!String(e.description).startsWith(a.financeId+' · '+a.orderId+' · '+a.amountCents+' centavos'))problems.push('Rateio sem vínculo válido: '+a.commandId);
 seen.add(a.commandId);used.set(a.financeId,(used.get(a.financeId)||0)+a.amountCents);}
 for(const [id,n] of used)if(!Number.isSafeInteger(n)||n>(titles.get(id)?.amountCents||0))problems.push('Rateio excede título: '+id);
 for(const m of arr(s,'stockLedger'))if(m.costBasis){const b=m.costBasis;try{if(!types.includes(m.type)||m.deltaGrams>=0||b.method!=='referencia_no_corte'||b.commandId!==m.commandId||!events.has(b.commandId)||b.cents!==cost(-m.deltaGrams,b.priceCentsKg))throw Error('Inválido');}catch(e){problems.push('Base de custo divergente: '+m.id);}}
 return problems;}
 function allocate(s,p,uid){const f=arr(s,'finance').find(x=>x.id===p.financeId);if(!eligible(f))throw Error('Somente despesas manuais elegíveis; compras e acertos vinculados não podem ser duplicados.');
 if(!arr(s,'orders').some(x=>x.id===p.orderId))throw Error('Pedido não encontrado.');
 const used=sum(allocations(s).filter(x=>x.financeId===f.id),x=>x.amountCents);
 if(!Number.isSafeInteger(p.amountCents)||p.amountCents<=0||p.amountCents>f.amountCents-used)throw Error('Rateio excede saldo disponível do título.');
 if(!s.costAllocations)s.costAllocations=[];s.costAllocations.push({...p,commandId:uid});
 return f.id+' · '+p.orderId+' · '+p.amountCents+' centavos · '+p.reason;
 }
 function report(s){if(s?.schema!=='hlgb-evolucao-operacao-ficticia-v1')throw Error('Base fora do laboratório.');const issues=inspect(s);if(issues.length)throw Error(issues.join('; '));
 const models=new Map(),clients=new Map(),rows=[],materials=new Map(arr(s,'materials').map(x=>[x.id,x])),products=new Map(arr(s,'products').map(x=>[x.id,x])),settlements=arr(s,'settlements'),comps=arr(s,'settlementCompensations'),ledger=arr(s,'stockLedger'),finance=arr(s,'finance');
 const byProduct=id=>products.get(id)?.name||id;
 for(const o of arr(s,'orders')){
 const pieces=qty(o),p=products.get(o.productId),m=materials.get(p?.materialId),moves=ledger.filter(x=>x.sourceId===o.id&&types.includes(x.type));
 const direct=settlements.filter(x=>x.orderId===o.id),directIds=new Set(direct.map(x=>x.id)),corrections=comps.filter(x=>directIds.has(x.settlementId)),rateios=allocations(s).filter(x=>x.orderId===o.id);let referenceCents=0,unknownGrams=0,wasteGrams=0,unknownWasteGrams=0,materialDetails=[];
 for(const x of moves){const bom=x.type==='corte-bom'?arr(s,'bomCutRuns').find(b=>b.id===x.bomCutId)?.materials?.find(b=>b.materialId===x.materialId):null;const b=x.costBasis;const cents=b?.cents??bom?.theoreticalCostCents??null,price=b?.priceCentsKg??bom?.priceCentsKg??null;if(cents===null)unknownGrams+=-x.deltaGrams;else referenceCents+=cents;if(Number.isSafeInteger(x.scrapGrams))wasteGrams+=x.scrapGrams;else unknownWasteGrams+=-x.deltaGrams;materialDetails.push({id:x.id,materialId:x.materialId,grams:-x.deltaGrams,priceCentsKg:price,cents,source:b?'referencia_registrada':bom?'BOM_registrado':'sem_preco_historico'});}
 const revenue=pieces*o.priceCents;if(!Number.isSafeInteger(revenue))throw Error('Receita fora do limite');
 const labor=sum(direct,x=>x.amountCents)+sum(corrections,x=>x.deltaCents),overhead=sum(rateios,x=>x.amountCents),knownCost=referenceCents+labor+overhead;
 const ready=pieces>0&&o.shipped===pieces&&moves.length>0&&unknownGrams===0&&sum(direct.filter(x=>x.kind==='retorno'),x=>x.qty)===pieces;
 const difference=ready?revenue-knownCost:null;
 const theoreticalMaterial=p&&m&&Number.isSafeInteger(p.gramsPerUnit)&&p.gramsPerUnit>0?cost(p.gramsPerUnit,m.priceCentsKg):null;
 const data={id:o.id,productId:o.productId,model:byProduct(o.productId),clientId:o.clientId,client:arr(s,'clients').find(x=>x.id===o.clientId)?.name||o.clientId,pieces,shipped:o.shipped,revenue,referenceCents,unknownGrams,wasteGrams,unknownWasteGrams,labor,overhead,knownCost,theoreticalMaterial,difference,partialMarginPercent:difference!==null&&revenue>0?Math.round(difference*10000/revenue)/100:null,knownUnitReference:ready?Math.round(knownCost/pieces):null,materialDetails,settlementIds:direct.map(x=>x.id),compensationIds:corrections.map(x=>x.id),allocationCommands:rateios.map(x=>x.commandId),status:ready?'resultado_parcial_disponivel':'incompleto'};
 rows.push(data);
 for(const [map,id,label] of [[models,o.productId,data.model],[clients,o.clientId,data.client]]){const g=map.get(id)||{id,name:label,orders:0,pieces:0,revenue:0,knownCost:0,unknownGrams:0,complete:0,partialDifference:0};g.orders++;g.pieces+=pieces;g.revenue+=revenue;g.knownCost+=knownCost;g.unknownGrams+=unknownGrams;if(ready){g.complete++;g.partialDifference+=difference;}map.set(id,g);}
 }
 const manual=finance.filter(eligible).map(f=>{const used=sum(allocations(s).filter(x=>x.financeId===f.id),x=>x.amountCents);return {id:f.id,description:f.description,category:f.category,total:f.amountCents,allocated:used,remaining:f.amountCents-used};});
 const loose=settlements.filter(x=>!x.orderId).map(x=>({id:x.id,model:byProduct(x.productId),service:x.serviceType,amountCents:x.amountCents+sum(comps.filter(c=>c.settlementId===x.id),c=>c.deltaCents)}));
 return {schema:'hlgb-lab-custos-v1',revision:s.revision,productionApproval:false,rows,models:[...models.values()],clients:[...clients.values()],manual,loose,totals:{orders:rows.length,revenue:sum(rows,x=>x.revenue),knownCost:sum(rows,x=>x.knownCost),unknownGrams:sum(rows,x=>x.unknownGrams),eligibleOrders:rows.filter(x=>x.difference!==null).length,unallocated:sum(manual,x=>x.remaining),looseCost:sum(loose,x=>x.amountCents)}};
 }
 return {capture,allocate,inspect,report,eligible,cost};
});
