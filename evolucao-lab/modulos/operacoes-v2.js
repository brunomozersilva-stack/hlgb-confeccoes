/* Operações complementares fictícias: corte, embalagem, pedidos assistidos, notas. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabOperationsV2=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const sizes=['P','M','G','GG'],by=(a,id)=>(a||[]).find(x=>x.id===id),clone=x=>JSON.parse(JSON.stringify(x)),sum=a=>a.reduce((n,x)=>n+x,0);
 const num=(v,min,max)=>{if(!Number.isSafeInteger(v)||v<min||v>max)throw Error('Quantidade ou valor inválido.');return v;};
 const text=v=>{if(typeof v!=='string'||!v.trim()||v.trim().length>95)throw Error('Identificação e justificativa obrigatórias (até 95 caracteres).');return v.trim();};
 const ref=v=>{const x=text(v).toUpperCase();if(!/^[A-Z0-9_.-]+$/.test(x))throw Error('Referência inválida.');return x;};
 const grade=g=>!!g&&Object.keys(g).length===4&&sizes.every(k=>Number.isSafeInteger(g[k])&&g[k]>=0);
 const count=g=>sum(sizes.map(k=>g[k]));
 const equalGrade=(a,b)=>grade(a)&&grade(b)&&sizes.every(k=>a[k]===b[k]);
 const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 function split(s,p,ctx){
 const parent=by(s.cutPlans,p.id),o=parent&&by(s.orders,parent.orderId),product=o&&by(s.products,o.productId);
 if(!parent||!o||!product||parent.status!=='aberto'||!grade(p.grade)||count(p.grade)<1||count(p.grade)>=count(parent.grade)||sizes.some(k=>p.grade[k]>parent.grade[k]))throw Error('Divida somente folha aberta, em duas grades positivas dentro do saldo.');
 const before=clone(parent.grade),part=clone(p.grade),remaining=Object.fromEntries(sizes.map(k=>[k,before[k]-part[k]])),reason=text(p.reason),child={...clone(parent),id:ctx.next(s,'COR'),grade:part,theoreticalGrams:count(part)*product.gramsPerUnit,createdCommandId:ctx.uid,splitFrom:parent.id};
 parent.grade=remaining;parent.theoreticalGrams=count(remaining)*product.gramsPerUnit;s.cutPlans.push(child);
 (s.cutSplits||(s.cutSplits=[])).push({id:ctx.next(s,'DVC'),parentId:parent.id,childId:child.id,orderId:o.id,before,remaining,moved:part,reason,commandId:ctx.uid});
 return parent.id+' → '+child.id+' · '+count(part)+' peças · '+reason;}
 function packagingSummary(s,orderId){
 const o=by(s.orders,orderId);if(!o)throw Error('Pedido não localizado.');
 const lots=(s.packagingLots||[]).filter(x=>x.orderId===orderId),baseline=lots[0]?.baselineSeparated??o.separated;
 const sent=sum(lots.filter(x=>x.status!=='cancelado').map(x=>x.qty)),done=sum(lots.filter(x=>x.status==='concluido').map(x=>x.qty));
 return {orderId,baseline,sent,done,waiting:sent-done,available:o.returned-baseline-sent,tracked:lots.length>0,canSeparate:baseline+done-o.separated};}
 function packagingAssign(s,p,ctx,svc){
 const o=by(s.orders,p.orderId),qty=num(p.qty,1,10000);if(!o)throw Error('Pedido não localizado.');
 const a=packagingSummary(s,o.id);if(qty>a.available)throw Error('Quantidade excede peças retornadas ainda não destinadas à embalagem.');
 const q=svc.quote(s,{factionId:p.factionId,productId:o.productId,serviceType:'embalagem',qty,priceMode:p.priceMode,unitCents:p.unitCents});
 const lot={id:ctx.next(s,'EMB'),orderId:o.id,productId:o.productId,factionId:p.factionId,qty,baselineSeparated:a.baseline,unitCents:q.gross,quotedCents:q.amount,status:'aberto',reason:text(p.reason),commandId:ctx.uid};
 (s.packagingLots||(s.packagingLots=[])).push(lot);return lot.id+' · '+qty+' peças · '+q.amount+' centavos previstos';}
 function packagingFinish(s,p,ctx,svc){
 const lot=by(s.packagingLots,p.id);if(!lot||lot.status!=='aberto')throw Error('Lote de embalagem indisponível ou já concluído.');
 if(num(p.qty,1,10000)!==lot.qty)throw Error('Conferência deve corresponder à quantidade enviada. Para lotes menores, cancele e divida antes de concluir.');
 const reason=text(p.reason),id=svc.create(s,{factionId:lot.factionId,productId:lot.productId,serviceType:'embalagem',qty:lot.qty,priceMode:'manual',unitCents:lot.unitCents,reason},ctx);
 const entry=by(s.settlements,id);entry.packagingLotId=lot.id;
 lot.status='concluido';lot.settlementId=id;lot.completedCommandId=ctx.uid;lot.completionReason=reason;
 return lot.id+' · acerto '+id+' · '+lot.quotedCents+' centavos';}
 function packagingCancel(s,p,ctx){const x=by(s.packagingLots,p.id);if(!x||x.status!=='aberto')throw Error('Somente embalagem aberta pode ser cancelada.');x.cancelReason=text(p.reason);x.status='cancelado';x.cancelledCommandId=ctx.uid;return x.id+' · cancelado sem acerto';}
 function guardSeparation(s,o,qty){const q=packagingSummary(s,o.id);if(q.tracked&&qty>q.canSeparate)throw Error('Separação excede peças com embalagem concluída.');}
 function assistantPreview(s,p,imports){
 const client=by(s.clients,p.clientId),product=by(s.products,p.productId);if(!client||!product||!grade(p.grade))throw Error('Escolha cliente, produto e grade.');
 const raw='referencia;cliente_id;sku;P;M;G;GG\n'+[ref(p.reference),client.id,product.sku,...sizes.map(x=>p.grade[x])].join(';');
 return {...imports.importPreview(s,raw),raw};}
 function assistantCreate(s,p,ctx,imports){const q=assistantPreview(s,p,imports);if(q.signature!==p.signature)throw Error('Prévia de pedido mudou.');return imports.importOrders(s,{raw:q.raw,signature:q.signature,reason:p.reason},ctx);}
 function invoicePreview(s,p){
 const vendor=by(s.suppliers,p.supplierId),reference=ref(p.reference);if(!vendor||!day(p.issueDate))throw Error('Fornecedor ou data inválidos.');
 if((s.purchaseInvoices||[]).some(x=>x.supplierId===vendor.id&&x.reference===reference))throw Error('Nota já importada para este fornecedor.');
 if(typeof p.raw!=='string'||p.raw.length>18000)throw Error('Texto de nota inválido.');
 const lines=p.raw.trim().split(/\r?\n/);if(lines.shift()?.trim()!=='material_id;gramas;centavos_por_kg'||lines.length<1||lines.length>40)throw Error('Use cabeçalho material_id;gramas;centavos_por_kg e 1 a 40 linhas.');
 const seen=new Set(),items=lines.map((l,i)=>{
 const c=l.split(';').map(x=>x.trim());if(c.length!==3||!c.slice(1).every(x=>/^\d+$/.test(x))||seen.has(c[0]))throw Error('Linha '+(i+2)+' inválida ou material duplicado.');
 const mat=by(s.materials,c[0]);if(!mat)throw Error('Material não localizado: '+c[0]);seen.add(mat.id);
 const qtyGrams=num(Number(c[1]),1,1000000),priceCentsKg=num(Number(c[2]),1,1000000),amountCents=Math.ceil(qtyGrams*priceCentsKg/1000);
 return {materialId:mat.id,materialName:mat.name,qtyGrams,priceCentsKg,amountCents};});
 const totalCents=sum(items.map(x=>x.amountCents));if(totalCents!==num(p.declaredCents,1,1000000000))throw Error('Total da nota diverge da soma dos itens. Não importar.');
 const signature=JSON.stringify([vendor.id,reference,p.issueDate,totalCents,items]);return {supplierId:vendor.id,supplierName:vendor.name,reference,issueDate:p.issueDate,items,totalCents,signature};}
 function invoiceCreate(s,p,ctx){const q=invoicePreview(s,p);if(q.signature!==p.signature)throw Error('Prévia de nota mudou.');const a=text(p.checkerOne),b=text(p.checkerTwo),reason=text(p.reason);if(a.toLocaleLowerCase('pt-BR')===b.toLocaleLowerCase('pt-BR'))throw Error('Conferentes precisam ser diferentes.');
 const id=ctx.next(s,'NCP'),items=q.items.map(x=>{const purchaseId=ctx.next(s,'COM');s.purchaseOrders.push({id:purchaseId,materialId:x.materialId,supplierId:q.supplierId,qtyGrams:x.qtyGrams,priceCentsKg:x.priceCentsKg,checkerOne:a,checkerTwo:b,received:false,invoiceId:id});return {...x,purchaseId};});
 (s.purchaseInvoices||(s.purchaseInvoices=[])).push({id,supplierId:q.supplierId,reference:q.reference,issueDate:q.issueDate,items,totalCents:q.totalCents,reason,commandId:ctx.uid});return id+' · '+items.length+' compras aguardando recebimento';}
 function invoiceAttach(s,p,ctx,pdf){
 const invoice=by(s.purchaseInvoices,p.id);if(!invoice||p.fictitious!==true)throw Error('Escolha nota e confirme PDF fictício.');
 const name=text(p.fileName);if(!/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,90}\.pdf$/i.test(name))throw Error('Nome de PDF inválido.');
 const f=pdf.decodePdf(p.contentBase64),rows=s.invoicePdfs||(s.invoicePdfs=[]),old=rows.filter(x=>x.invoiceId===invoice.id).at(-1);
 if(rows.length>=30||sum(rows.map(x=>x.size))+f.size>2*1024*1024||rows.some(x=>x.contentBase64===p.contentBase64))throw Error('Limite de PDFs ou conteúdo já existente.');
 if((p.previousId||null)!==(old?.id||null))throw Error('Versão da nota mudou.');
 const x={id:ctx.next(s,'PNF'),invoiceId:invoice.id,fileName:name,contentBase64:p.contentBase64,size:f.size,checksum:f.checksum,previousId:old?.id||null,reason:text(p.reason),commandId:ctx.uid,fictitious:true};rows.push(x);return x.id+' · '+invoice.id;}
 function pdfMetadata(s){const latest=new Map((s.invoicePdfs||[]).map(x=>[x.invoiceId,x.id]));return (s.invoicePdfs||[]).map(({contentBase64,...x})=>({...x,current:latest.get(x.invoiceId)===x.id}));}
 function inspect(s,pdf){
 const issues=[],events=new Map(s.log.map(x=>[x.commandId,x])),check=(id,cmd,type)=>{if(events.get(cmd)?.type!==type)issues.push(id+': evento ausente ou divergente');};
 const childIds=new Set();for(const x of s.cutSplits||[]){check(x.id,x.commandId,'cut.plan.split');const a=by(s.cutPlans,x.parentId),b=by(s.cutPlans,x.childId);
 if(!a||!b||a.orderId!==x.orderId||b.orderId!==x.orderId||b.splitFrom!==a.id||b.createdCommandId!==x.commandId||childIds.has(x.childId)||!grade(x.before)||!grade(x.remaining)||!grade(x.moved)||!sizes.every(k=>x.before[k]===x.remaining[k]+x.moved[k])||count(x.remaining)<1||count(x.moved)<1)issues.push(x.id+': divisão de grade inválida');childIds.add(x.childId);}
 for(const p of s.cutPlans)if(p.splitFrom&&!childIds.has(p.id))issues.push(p.id+': divisão sem histórico');
 const lots=s.packagingLots||[],seen=new Set();for(const l of lots){check(l.id,l.commandId,'packaging.assign');const o=by(s.orders,l.orderId),f=by(s.factions,l.factionId),a=by(s.settlements,l.settlementId);
 if(seen.has(l.id)||!o||!f||o.productId!==l.productId||!Number.isSafeInteger(l.qty)||l.qty<=0||!Number.isSafeInteger(l.unitCents)||l.unitCents<=0||l.quotedCents!==l.qty*l.unitCents||!['aberto','concluido','cancelado'].includes(l.status)||!Number.isSafeInteger(l.baselineSeparated)||l.baselineSeparated<0)issues.push(l.id+': lote inválido');seen.add(l.id);
 if(l.status==='concluido'){check(l.id,l.completedCommandId,'packaging.complete');if(!a||a.packagingLotId!==l.id||a.orderId!==null||a.factionId!==l.factionId||a.qty!==l.qty||a.amountCents!==l.quotedCents||a.serviceType!=='embalagem')issues.push(l.id+': acerto de embalagem divergente');}
 else if(l.settlementId||s.settlements.some(x=>x.packagingLotId===l.id))issues.push(l.id+': acerto sem conclusão');
 if(l.status==='cancelado')check(l.id,l.cancelledCommandId,'packaging.cancel');}
 for(const o of s.orders){const q=packagingSummary(s,o.id);if(q.tracked&&(q.available<0||q.canSeparate<0||lots.filter(l=>l.orderId===o.id).some(l=>l.baselineSeparated!==q.baseline)))issues.push(o.id+': embalagens ou separação excedem saldo');}
 for(const x of s.settlements)if(x.packagingLotId&&!lots.some(l=>l.id===x.packagingLotId&&l.settlementId===x.id&&l.status==='concluido'))issues.push(x.id+': acerto de embalagem órfão');
 const keys=new Set(),poIds=new Set();for(const x of s.purchaseInvoices||[]){check(x.id,x.commandId,'purchase.invoice.import');const k=x.supplierId+'|'+x.reference;
 if(keys.has(k)||!by(s.suppliers,x.supplierId)||!day(x.issueDate)||!x.items?.length||x.totalCents!==sum((x.items||[]).map(i=>i.amountCents)))issues.push(x.id+': nota inválida');keys.add(k);
 for(const i of x.items||[]){const p=by(s.purchaseOrders,i.purchaseId);if(poIds.has(i.purchaseId)||!p||p.invoiceId!==x.id||p.supplierId!==x.supplierId||p.materialId!==i.materialId||p.qtyGrams!==i.qtyGrams||p.priceCentsKg!==i.priceCentsKg||i.amountCents!==Math.ceil(i.qtyGrams*i.priceCentsKg/1000))issues.push(x.id+': item de nota divergente');poIds.add(i.purchaseId);}}
 for(const p of s.purchaseOrders)if(p.invoiceId&&!poIds.has(p.id))issues.push(p.id+': compra sem nota');
 const latest=new Map();for(const x of s.invoicePdfs||[]){check(x.id,x.commandId,'purchase.invoice.pdf');try{const f=pdf.decodePdf(x.contentBase64);if(!by(s.purchaseInvoices,x.invoiceId)||f.size!==x.size||f.checksum!==x.checksum||x.previousId!==(latest.get(x.invoiceId)||null)||x.fictitious!==true)throw Error('PDF divergente');}catch(e){issues.push(x.id+': PDF inválido');}latest.set(x.invoiceId,x.id);}
 return issues;}
 return {split,packagingSummary,packagingAssign,packagingFinish,packagingCancel,guardSeparation,assistantPreview,assistantCreate,invoicePreview,invoiceCreate,invoiceAttach,pdfMetadata,inspect};
});
