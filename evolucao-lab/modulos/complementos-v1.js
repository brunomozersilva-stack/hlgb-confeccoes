/* Complementos da homologação: materiais de facção, cotações e fotos fictícias. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabComplementsV1=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const by=(a,id)=>(a||[]).find(x=>x.id===id),num=(v,min,max)=>{if(!Number.isSafeInteger(v)||v<min||v>max)throw Error('Quantidade ou valor inválido.');return v;},txt=v=>{if(typeof v!=='string'||!v.trim()||v.trim().length>95)throw Error('Preencha identificação ou justificativa (até 95 caracteres).');return v.trim();};
 const date=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('Data inválida.');return v;};
 function scope(s,p,ctx){
 const product=by(s.products,p.productId),material=by(s.materials,p.materialId);if(!product||!material||!['incluir','excluir'].includes(p.action))throw Error('Escolha modelo, material e ação.');
 if(p.action==='incluir'&&product.materialId===material.id)throw Error('Material principal já consumido no corte. Não reenviar como aviamento.');
 const reason=txt(p.reason),rows=s.factionMaterialScopes||(s.factionMaterialScopes=[]),old=rows.filter(x=>x.productId===p.productId&&x.materialId===p.materialId&&x.active).at(-1);
 if(old)old.active=false;
 rows.push({id:ctx.next(s,'FMS'),productId:p.productId,materialId:p.materialId,include:p.action==='incluir',active:true,reason,commandId:ctx.uid});
 return product.id+' · '+material.id+' · '+p.action;}
 function materialPreview(s,assignmentId){
 const a=by(s.factionAssignments,assignmentId),o=a&&by(s.orders,a.orderId),p=o&&by(s.products,o.productId);
 if(!a||!o||!p||a.qtySent<=a.qtyReturned)throw Error('Escolha envio com peças aguardando retorno.');
 const pending=a.qtySent-a.qtyReturned,entries=(a.gradeLines||[]).filter(x=>x.sent>x.returned).map(x=>({color:x.color,size:x.size,qty:x.sent-x.returned}));
 const materialIds=(s.factionMaterialScopes||[]).filter(x=>x.active&&x.include&&x.productId===p.id).map(x=>x.materialId);
 if(!materialIds.length)throw Error('Marque na ficha os aviamentos destinados à facção. Não inclua o tecido consumido no corte.');
 const rules=(s.materialRecipeRules||[]).filter(x=>x.active&&x.productId===p.id&&materialIds.includes(x.materialId));
 if(!entries.length&&rules.some(x=>x.color!=='*'||x.size!=='*'))throw Error('Receita por variante exige grade real do envio.');
 const parts=entries.length?entries:[{color:'*',size:'*',qty:pending}];
 if(parts.reduce((n,x)=>n+x.qty,0)!==pending)throw Error('Grade não corresponde ao saldo do envio.');
 const rows=[];
 for(const materialId of materialIds){
 const material=by(s.materials,materialId);if(!material)throw Error('Material não localizado.');
 for(const part of parts){const eligible=rules.filter(x=>x.materialId===materialId&&(x.color==='*'||x.color===part.color)&&(x.size==='*'||x.size===part.size));
 eligible.sort((a,b)=>((b.color==='*'?0:2)+(b.size==='*'?0:1))-((a.color==='*'?0:2)+(a.size==='*'?0:1)));
 const rule=eligible[0];if(!rule)throw Error('Consumo não cadastrado para '+material.name+' · '+part.color+' '+part.size+'.');
 rows.push({materialId,materialName:material.name,color:part.color,size:part.size,qty:part.qty,ruleId:rule.id,gramsPerUnit:rule.gramsPerUnit,grams:part.qty*rule.gramsPerUnit});}}
 const materials=[...new Set(rows.map(x=>x.materialId))].map(id=>({materialId:id,name:by(s.materials,id).name,grams:rows.filter(x=>x.materialId===id).reduce((v,x)=>v+x.grams,0)}));
 const signature=JSON.stringify([a.id,a.factionId,p.id,pending,rows.map(x=>[x.materialId,x.color,x.size,x.qty,x.ruleId,x.gramsPerUnit]).sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)))]);
 return {assignmentId:a.id,orderId:o.id,factionId:a.factionId,productId:p.id,pending,rows,materials,signature,stockWritten:false};}
 function checklist(s,p,ctx){const q=materialPreview(s,p.assignmentId);if(p.signature!==q.signature)throw Error('Envio ou ficha mudou; revise os materiais antes de confirmar.');
 const all=s.factionMaterialChecklists||(s.factionMaterialChecklists=[]),old=all.filter(x=>x.assignmentId===q.assignmentId).at(-1);
 if(old?.signature===q.signature)throw Error('Checklist já registrado para esta composição.');
 const record={...q,id:ctx.next(s,'FMC'),previousId:old?.id||null,reason:txt(p.reason),commandId:ctx.uid};all.push(record);return record.id+' · '+q.pending+' peças · sem nova baixa de estoque';}
 function confirmMaterial(s,p,ctx){const list=s.factionMaterialChecklists||[],c=by(list,p.id);if(!c||list.filter(x=>x.assignmentId===c.assignmentId).at(-1)?.id!==c.id)throw Error('Checklist substituído ou ausente.');
 if(materialPreview(s,c.assignmentId).signature!==c.signature)throw Error('Checklist desatualizado; gere nova comparação.');
 const m=c.materials.find(x=>x.materialId===p.materialId);if(!m)throw Error('Material fora do checklist.');
 const actual=num(p.actualGrams,0,100000000),reason=txt(p.reason),history=s.factionMaterialChecks||(s.factionMaterialChecks=[]);
 history.push({id:ctx.next(s,'FCF'),checklistId:c.id,materialId:m.materialId,expectedGrams:m.grams,actualGrams:actual,differenceGrams:actual-m.grams,reason,commandId:ctx.uid});
 return c.id+' · '+m.name+' · previsto '+m.grams+'g / conferido '+actual+'g';}
 function quote(s,p,ctx){if(!by(s.suppliers,p.supplierId)||!by(s.materials,p.materialId))throw Error('Fornecedor ou material não localizado.');
 const qtyGrams=num(p.qtyGrams,1,100000000),priceCentsKg=num(p.priceCentsKg,1,1000000),freightCents=num(p.freightCents,0,100000000),validUntil=date(p.validUntil),quotedAt=date(p.quotedAt);
 if(validUntil<quotedAt)throw Error('Validade anterior à cotação.');
 const baseCents=Math.ceil(qtyGrams*priceCentsKg/1000),totalCents=baseCents+freightCents;
 if(!Number.isSafeInteger(totalCents)||totalCents>1000000000)throw Error('Cotação excede limite.');
 const q={id:ctx.next(s,'COT'),supplierId:p.supplierId,materialId:p.materialId,qtyGrams,priceCentsKg,freightCents,baseCents,totalCents,quotedAt,validUntil,reference:txt(p.reference),reason:txt(p.reason),commandId:ctx.uid};
 (s.supplierQuotes||(s.supplierQuotes=[])).push(q);return q.id+' · '+totalCents+' centavos';}
 function compare(s,{materialId,qtyGrams,asOf}){date(asOf);num(qtyGrams,1,100000000);if(!by(s.materials,materialId))throw Error('Material não localizado.');
 const rows=(s.supplierQuotes||[]).filter(x=>x.materialId===materialId&&x.qtyGrams===qtyGrams&&x.quotedAt<=asOf);
 const latest=new Map();for(const x of rows){const old=latest.get(x.supplierId);if(!old||x.quotedAt>=old.quotedAt)latest.set(x.supplierId,x);}
 const result=[...latest.values()].map(x=>({...x,supplierName:by(s.suppliers,x.supplierId)?.name||x.supplierId,valid:x.validUntil>=asOf})).sort((a,b)=>Number(b.valid)-Number(a.valid)||a.totalCents-b.totalCents||a.supplierId.localeCompare(b.supplierId));
 return {materialId,qtyGrams,asOf,rows:result,best:result.find(x=>x.valid)?.id||null,stockWritten:false,purchaseCreated:false};}
 function imageOK(v){
 if(typeof v!=='string'||v.length>174764||v.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(v)||!v.startsWith('/9j/'))return false;
 const abc='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',tail=v.slice(-8),bytes=[];
 for(let i=0;i<tail.length;i+=4){const a=abc.indexOf(tail[i]),b=abc.indexOf(tail[i+1]),c=abc.indexOf(tail[i+2]),d=abc.indexOf(tail[i+3]);bytes.push((a<<2)|(b>>4));if(c>=0)bytes.push(((b&15)<<4)|(c>>2));if(d>=0)bytes.push(((c&3)<<6)|d);}
 return v.length>=64&&bytes.at(-2)===255&&bytes.at(-1)===217;}
 function photo(s,p,ctx){const item=by(s.prints,p.productId);if(!item||p.fictitious!==true||!imageOK(p.contentBase64))throw Error('Selecione JPEG fictício válido, até 128 KiB.');
 const history=s.printPhotos||(s.printPhotos=[]),previous=history.filter(x=>x.productId===item.id).at(-1);
 if((p.previousId||null)!==(previous?.id||null))throw Error('Foto atual mudou. Confira antes de substituir.');
 if(history.length>=30||history.reduce((n,x)=>n+x.contentBase64.length,0)+p.contentBase64.length>1400000)throw Error('Limite de fotos fictícias atingido.');
 if(history.some(x=>x.contentBase64===p.contentBase64))throw Error('Imagem idêntica já registrada.');
 const record={id:ctx.next(s,'FOT'),productId:item.id,contentBase64:p.contentBase64,previousId:previous?.id||null,reason:txt(p.reason),commandId:ctx.uid};history.push(record);return record.id+' · '+item.id+' · foto fictícia';}
 function photoMetadata(s){const latest=new Map((s.printPhotos||[]).map(x=>[x.productId,x.id]));return (s.printPhotos||[]).map(({contentBase64,...x})=>({...x,current:latest.get(x.productId)===x.id}));}
 function inspect(s){const issues=[],events=new Map(s.log.map(x=>[x.commandId,x])),seen=new Set();const check=(x,type)=>{if(seen.has(x.id)||events.get(x.commandId)?.type!==type)issues.push(x.id+': identidade ou prova inválida');seen.add(x.id);};
 for(const x of s.factionMaterialScopes||[]){check(x,'faction.material.scope');if(!by(s.products,x.productId)||!by(s.materials,x.materialId)||typeof x.include!=='boolean')issues.push(x.id+': escopo inválido');}
 for(const x of s.factionMaterialChecklists||[]){check(x,'faction.material.checklist');if(!by(s.factionAssignments,x.assignmentId)||!x.rows?.length||x.rows.some(y=>!Number.isSafeInteger(y.grams)||y.grams!==y.qty*y.gramsPerUnit)||x.materials.some(m=>m.grams!==x.rows.filter(y=>y.materialId===m.materialId).reduce((n,y)=>n+y.grams,0)))issues.push(x.id+': checklist inválido');}
 for(const x of s.factionMaterialChecks||[]){check(x,'faction.material.confirm');const row=by(s.factionMaterialChecklists,x.checklistId)?.materials.find(y=>y.materialId===x.materialId);if(!row||row.grams!==x.expectedGrams||!Number.isSafeInteger(x.actualGrams)||x.actualGrams<0||x.actualGrams-x.expectedGrams!==x.differenceGrams)issues.push(x.id+': conferência divergente');}
 for(const q of s.supplierQuotes||[]){check(q,'supplier.quote.add');if(!by(s.suppliers,q.supplierId)||!by(s.materials,q.materialId)||!Number.isSafeInteger(q.totalCents)||q.baseCents!==Math.ceil(q.qtyGrams*q.priceCentsKg/1000)||q.totalCents!==q.baseCents+q.freightCents)issues.push(q.id+': cotação inválida');}
 const latest=new Map();for(const x of s.printPhotos||[]){check(x,'print.photo.attach');if(!by(s.prints,x.productId)||!imageOK(x.contentBase64)||x.previousId!==(latest.get(x.productId)||null))issues.push(x.id+': foto inválida');latest.set(x.productId,x.id);}
 return issues;}
 return {scope,materialPreview,checklist,confirmMaterial,quote,compare,photo,photoMetadata,imageOK,inspect};
});
