/* Serviços, papéis e preços fictícios; somente regras locais. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabServicesV1=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const roles=['costura','embalagem','travetada'],categories=['camisola','doll','calcinha','outros'];
 const defaults={camisola:25,doll:25,calcinha:15,outros:null,pointCents:null};
 const n=(v,min,max)=>{if(!Number.isSafeInteger(v)||v<min||v>max)throw Error('Valor ou quantidade inválida.');return v;};
 const text=(v,label)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>95)throw Error(label+' obrigatório, até 95 caracteres.');return v.trim();};
 const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const by=(a,id)=>a.find(x=>x.id===id);
 const cat=p=>p?.serviceCategory||(/calcinha|fio dental/.test(norm(p?.name))?'calcinha':/doll/.test(norm(p?.name))?'doll':/camisola/.test(norm(p?.name))?'camisola':'outros');
 const rates=s=>s.serviceRates||defaults;
 const allows=(f,service)=>!!f&&(!f.serviceRole||f.serviceRole===service);
 function profile(s,p,uid){const f=by(s.factions,p.factionId);if(!f||!roles.includes(p.serviceRole))throw Error('Prestador ou atividade inválida.');
 if(p.serviceRole!=='embalagem'&&(s.packagingLots||[]).some(x=>x.factionId===f.id&&x.status==='aberto'))throw Error('Prestador possui embalagem pendente. Conclua ou cancele antes de mudar papel.');
 if(p.serviceRole!=='costura'&&(s.factionAssignments||[]).some(x=>x.factionId===f.id&&x.qtySent>x.qtyReturned))throw Error('Prestador possui costura pendente; conclua antes de mudar papel.');
 const reason=text(p.reason,'Motivo');const old=f.serviceRole||'não classificado';f.serviceRole=p.serviceRole;f.serviceProfileCommandId=uid;return f.id+' · '+old+' → '+p.serviceRole+' · '+reason;}
 function setRates(s,p,uid){const next={};for(const k of ['camisola','doll','calcinha','outros','pointCents'])next[k]=n(p[k],0,100000);next.commandId=uid;next.reason=text(p.reason,'Motivo');s.serviceRates=next;return 'Tabela de serviços · '+next.reason;}
 function points(s,p,uid){const model=by(s.products,p.productId);if(!model||!categories.includes(p.category))throw Error('Modelo ou categoria inválida.');
 const reason=text(p.reason,'Motivo');model.travetaPoints=n(p.points,0,100);model.serviceCategory=p.category;model.servicePointsCommandId=uid;return model.id+' · '+model.travetaPoints+' pontos · '+reason;}
 function quote(s,p){const f=by(s.factions,p.factionId);if(!f||!roles.includes(p.serviceType)||f.serviceRole!==p.serviceType)throw Error('Escolha prestador cadastrado na atividade correspondente.');
 if(!['auto','manual'].includes(p.priceMode))throw Error('Modo de preço inválido.');
 const service=p.serviceType,product=by(s.products,p.productId),manual=service==='embalagem'&&!product&&p.productId==='manual';
 if(!product&&!manual)throw Error('Modelo cadastrado obrigatório, exceto embalagem avulsa.');
 const category=manual?p.manualCategory:cat(product);if(!categories.includes(category))throw Error('Categoria inválida.');
 const model=manual?text(p.manualName,'Nome do modelo avulso'):product.name;
 const qty=n(p.qty,1,100000);const x=rates(s);let gross,discount=0,pointRate=null,pointCount=null,origin;
 if(service==='travetada'){
  pointCount=product.travetaPoints;if(!Number.isSafeInteger(pointCount)||pointCount<1||pointCount>100)throw Error('Cadastre os pontos por peça na ficha técnica.');
  pointRate=p.priceMode==='manual'?n(p.unitCents,1,100000):x.pointCents;
  if(!Number.isSafeInteger(pointRate)||pointRate<=0)throw Error('Cadastre tarifa por ponto ou informe valor manual.');
  gross=n(pointCount*pointRate,1,100000);origin=p.priceMode==='manual'?'manual_por_ponto':'tabela_por_ponto';
 }else{
  const suggestion=service==='embalagem'?x[category]:f.productRates?.[product.id]??f.unitCents;
  gross=p.priceMode==='manual'?n(p.unitCents,1,100000):suggestion;
  if(!Number.isSafeInteger(gross)||gross<=0)throw Error('Preço não cadastrado; informe um valor manual.');
  origin=p.priceMode==='manual'?'manual_por_peca':service==='embalagem'?'tabela_categoria':'cadastro_costura';
  if(service==='costura'&&!f.traveta){
   pointCount=product.travetaPoints;if(!Number.isSafeInteger(pointCount)||pointCount<0||pointCount>100)throw Error('Defina os pontos de travetada na ficha, inclusive zero.');
   pointRate=x.pointCents;if(pointCount>0&&(!Number.isSafeInteger(pointRate)||pointRate<0))throw Error('Cadastre tarifa por ponto.');
   discount=pointCount*(pointRate||0);
  }
 }
 if(discount>=gross)throw Error('Desconto não pode zerar o preço da peça.');
 const amount=qty*(gross-discount);if(!Number.isSafeInteger(amount)||amount>100000000)throw Error('Total acima do limite.');
 return {service,productId:product?.id||null,model,category,qty,gross,discount,pointRate,pointCount,origin,amount};
 }
 function create(s,p,ctx){const q=quote(s,p),reason=text(p.reason,'Justificativa'),id=ctx.next(s,'ACE'),fin=ctx.next(s,'FIN');
 const obj={id,orderId:null,factionId:p.factionId,productId:q.productId,kind:'avulso',serviceType:q.service,qty:q.qty,listUnitCents:q.gross,travetaCents:q.discount,unitCents:q.gross-q.discount,adjustmentCents:0,amountCents:q.amount,description:reason,status:'aberto',serviceQuote:{...q,commandId:ctx.uid}};
 s.settlements.push(obj);s.finance.push({id:fin,kind:'pagar',sourceId:id,description:'Serviço '+q.service+' · '+id,amountCents:q.amount,status:'aberto'});return id;}
 function groupPreview(s,p){
 const f=by(s.factions,p.factionId),reference=text(p.reference,'Referência').toUpperCase();
 if(!f||!roles.includes(f.serviceRole))throw Error('Classifique o prestador antes de montar o acerto.');
 if(!/^[A-Z0-9_.-]{1,60}$/.test(reference))throw Error('Referência deve conter letras, números, ponto, hífen ou sublinhado.');
 if((s.serviceEntryGroups||[]).some(x=>x.factionId===f.id&&x.reference===reference))throw Error('Referência já registrada para este prestador.');
 if(!Array.isArray(p.lines)||p.lines.length<2||p.lines.length>20)throw Error('Informe de 2 a 20 linhas de serviço.');
 const rows=p.lines.map((line,i)=>{
 if(!line||typeof line!=='object'||Array.isArray(line)||Object.keys(line).some(k=>!['productId','manualName','manualCategory','qty','priceMode','unitCents'].includes(k)))throw Error('Linha '+(i+1)+' inválida.');
 try{return quote(s,{...line,factionId:f.id,serviceType:f.serviceRole});}catch(e){throw Error('Linha '+(i+1)+': '+e.message);}
 });
 const total=rows.reduce((a,x)=>a+x.amount,0);if(!Number.isSafeInteger(total)||total>100000000)throw Error('Total do grupo excede limite.');
 const signature=JSON.stringify([f.id,reference,rows]);return {factionId:f.id,factionName:f.name,reference,rows,total,signature};
 }
 function createGroup(s,p,ctx){
 const q=groupPreview(s,p);if(q.signature!==p.signature||q.total!==p.expectedTotalCents)throw Error('Prévia alterada: confira o valor novamente.');
 const reason=text(p.reason,'Justificativa'),id=ctx.next(s,'GRS'),items=[];
 for(let i=0;i<p.lines.length;i++){const aid=create(s,{...p.lines[i],factionId:q.factionId,serviceType:q.rows[i].service,reason},ctx),a=by(s.settlements,aid),bill=s.finance.find(x=>x.sourceId===aid);a.serviceEntryGroupId=id;items.push({settlementId:aid,financeId:bill.id,amountCents:q.rows[i].amount});}
 (s.serviceEntryGroups||(s.serviceEntryGroups=[])).push({id,reference:q.reference,factionId:q.factionId,factionName:q.factionName,items,totalCents:q.total,reason,commandId:ctx.uid});
 return id+' · '+items.length+' linhas · '+q.total+' centavos · aguardando pagamento';
 }
 function inspect(s){const problems=[],events=new Map(s.log.map(x=>[x.commandId,x]));const check=(record,id,type)=>{if(!events.has(id)||events.get(id).type!==type)problems.push(record+': configuração sem prova');};
 if(s.serviceRates){const a=s.serviceRates;try{for(const k of Object.keys(defaults))n(a[k],0,100000);}catch(e){problems.push('Tabela de serviços inválida');}check('Tabela',a.commandId,'service.rates.set');}
 for(const f of s.factions)if(f.serviceRole){if(!roles.includes(f.serviceRole))problems.push(f.id+': papel inválido');check(f.id,f.serviceProfileCommandId,'service.profile.set');}
 for(const p of s.products)if(p.servicePointsCommandId){if(!categories.includes(p.serviceCategory)||!Number.isSafeInteger(p.travetaPoints)||p.travetaPoints<0||p.travetaPoints>100)problems.push(p.id+': pontos inválidos');check(p.id,p.servicePointsCommandId,'service.points.set');}
 for(const a of s.settlements)if(a.serviceQuote){const q=a.serviceQuote;check(a.id,q.commandId,a.packagingLotId?'packaging.complete':a.serviceEntryGroupId?'settlement.service.group':'settlement.service.add');if(q.service!==a.serviceType||q.productId!==a.productId||q.gross-q.discount<=0||q.amount!==q.qty*(q.gross-q.discount)||q.service==='travetada'&&q.gross!==q.pointCount*q.pointRate||q.service==='costura'&&q.discount!==(q.pointCount||0)*(q.pointRate||0))problems.push(a.id+': cálculo original divergente');}
 const refs=new Set(),members=new Set(),groupIds=new Set();
 for(const g of s.serviceEntryGroups||[]){
 check(g.id,g.commandId,'settlement.service.group');const key=g.factionId+'|'+g.reference;
 if(groupIds.has(g.id)||refs.has(key)||!by(s.factions,g.factionId)||!Array.isArray(g.items)||g.items.length<2||g.items.length>20||g.totalCents!==g.items.reduce((n,x)=>n+x.amountCents,0))problems.push(g.id+': grupo de serviços inválido');
 refs.add(key);groupIds.add(g.id);
 for(const i of g.items||[]){const a=by(s.settlements,i.settlementId),f=by(s.finance,i.financeId);
 if(members.has(i.settlementId)||!a||!f||a.serviceEntryGroupId!==g.id||a.factionId!==g.factionId||f.sourceId!==a.id||a.serviceQuote?.commandId!==g.commandId||a.serviceQuote?.amount!==i.amountCents)problems.push(g.id+': linha sem vínculo original');members.add(i.settlementId);}
 }
 for(const a of s.settlements)if(a.serviceEntryGroupId&&!members.has(a.id))problems.push(a.id+': linha sem grupo de serviços');
 return problems;}
 return {roles,categories,defaults,rates,cat,allows,profile,setRates,points,quote,create,groupPreview,createGroup,inspect};
});
