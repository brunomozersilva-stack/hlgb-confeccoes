/* Folha por competência e importação assistida, apenas laboratório fictício. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabPayrollOrdersV1=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const sizes=['P','M','G','GG'],by=(a,id)=>(a||[]).find(x=>x.id===id),sum=a=>a.reduce((n,x)=>n+x,0),text=x=>{if(typeof x!=='string'||!x.trim()||x.trim().length>95)throw Error('Identificação e motivo obrigatórios.');return x.trim();};
 const matches=(a,b)=>!!a&&!!b&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&a[k]===b[k]);
 const month=m=>typeof m==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(m),validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
 function amounts(e){const a={salaryCents:e.salaryCents,passageCents:e.passageCents,extrasCents:e.extrasCents,discountCents:e.discountCents};
 if(Object.values(a).some(v=>!Number.isSafeInteger(v)||v<0||v>10000000)||a.salaryCents<100||a.discountCents>a.salaryCents+a.extrasCents)throw Error('Valores individuais inconsistentes.');
 const net=a.salaryCents+a.extrasCents-a.discountCents,cash=net+a.passageCents;if(cash<=0)throw Error('Desembolso deve ser positivo.');
 // Provisões apenas ilustrativas, sem encargos ou cálculos de legislação.
 return {...a,netCents:net,cashCents:cash,thirteenthEstimateCents:Math.round(a.salaryCents/12),vacationEstimateCents:Math.round(a.salaryCents/9)};}
 function payrollPreview(s,p){if(!month(p.period)||!validDay(p.dueDate))throw Error('Competência ou vencimento inválido.');
 const all=s.payrollPeriods||[],target=p.employeeId==='todos'?s.employees.filter(e=>!all.some(x=>x.employeeId===e.id&&x.period===p.period)):[by(s.employees,p.employeeId)];
 if(!target.length||target.some(e=>!e))throw Error('Nenhum funcionário elegível.');
 const rows=target.map(e=>{if(all.some(x=>x.employeeId===e.id&&x.period===p.period))throw Error('Folha já existe nesta competência: '+e.name);return {employeeId:e.id,employeeName:e.name,amounts:amounts(e)};});
 const signature=JSON.stringify([p.period,p.dueDate,rows]);return {period:p.period,dueDate:p.dueDate,rows,signature,totalCents:sum(rows.map(x=>x.amounts.cashCents))};}
 function payrollCreate(s,p,ctx){const q=payrollPreview(s,p);if(p.signature!==q.signature)throw Error('Prévia mudou: confira os valores novamente.');
 const reason=text(p.reason),rows=s.payrollPeriods||(s.payrollPeriods=[]);for(const row of q.rows){const id=ctx.next(s,'FOL'),financeId=ctx.next(s,'FIN');
 rows.push({id,financeId,period:q.period,dueDate:q.dueDate,...row,status:'aberto',commandId:ctx.uid,reason,history:[]});
 s.finance.push({id:financeId,sourceId:id,kind:'pagar',category:'Folha',description:'Folha '+q.period+' · '+row.employeeName,amountCents:row.amounts.cashCents,dueDate:q.dueDate,status:'aberto'});}
 return q.rows.length+' funcionário(s) · folha '+q.period+' · '+q.totalCents+' centavos';}
 function payrollRevise(s,p,ctx){const x=by(s.payrollPeriods,p.id),emp=x&&by(s.employees,x.employeeId),bill=x&&by(s.finance,x.financeId);
 if(!x||!emp||!bill||x.status!=='aberto'||bill.status!=='aberto'||bill.reconciliation)throw Error('Somente folha aberta e não conciliada pode ser revisada.');
 const revised=amounts(emp),reason=text(p.reason);if(matches(revised,x.amounts))throw Error('Nenhuma alteração nos valores individuais.');
 x.history.push({commandId:ctx.uid,before:x.amounts,after:revised,reason});x.amounts=revised;bill.amountCents=revised.cashCents;return x.id+' · revisão da folha · '+reason;}
 function payrollPaid(s,bill){const x=by(s.payrollPeriods,bill.sourceId);if(!x)return;if(x.financeId!==bill.id||x.status!=='aberto'||x.amounts.cashCents!==bill.amountCents)throw Error('Folha e pagamento divergentes.');x.status='pago';x.paidDate=bill.paidDate;}
 function payrollReport(s,period){if(!month(period))throw Error('Competência inválida.');
 const rows=(s.payrollPeriods||[]).filter(x=>x.period===period).slice().sort((a,b)=>a.employeeName.localeCompare(b.employeeName,'pt-BR'));
 return {period,rows,cashCents:sum(rows.map(x=>x.amounts.cashCents)),passageCents:sum(rows.map(x=>x.amounts.passageCents)),netCents:sum(rows.map(x=>x.amounts.netCents)),paidCents:sum(rows.filter(x=>x.status==='pago').map(x=>x.amounts.cashCents)),openCents:sum(rows.filter(x=>x.status==='aberto').map(x=>x.amounts.cashCents)),provisionsCents:sum(rows.map(x=>x.amounts.thirteenthEstimateCents+x.amounts.vacationEstimateCents))};}
 function parseImport(raw){if(typeof raw!=='string'||raw.length>30000)throw Error('Arquivo acima do limite de texto.');const lines=raw.trim().split(/\r?\n/),columns='referencia;cliente_id;sku;P;M;G;GG';if(lines.shift()?.trim()!==columns)throw Error('Cabeçalho deve ser: '+columns);
 if(!lines.length||lines.length>50)throw Error('Informe de 1 a 50 linhas.');
 return lines.map((line,i)=>{const cells=line.split(';').map(x=>x.trim());if(cells.length!==7||cells.some(x=>!x)||!cells.slice(3).every(x=>/^\d{1,5}$/.test(x)))throw Error('Linha '+(i+2)+' inválida.');
 const [reference,clientId,sku,...q]=cells;if(!/^[A-Za-z0-9_.-]{1,60}$/.test(reference))throw Error('Referência inválida na linha '+(i+2));
 const grade=Object.fromEntries(sizes.map((sz,j)=>[sz,Number(q[j])]));const qty=sum(Object.values(grade));
 if(qty<1||qty>30000)throw Error('Grade inválida na linha '+(i+2));return {reference:reference.toUpperCase(),clientId,sku:sku.toUpperCase(),grade,qty};});}
 function importPreview(s,raw){const seen=new Set((s.orderImports||[]).flatMap(x=>x.items.map(y=>y.reference))),rows=parseImport(raw).map(x=>{if(seen.has(x.reference))throw Error('Referência de importação já utilizada: '+x.reference);seen.add(x.reference);
 const client=by(s.clients,x.clientId),product=s.products.find(p=>p.sku===x.sku);
 if(!client||!product)throw Error('Cliente/SKU não localizado para '+x.reference);
 const totalCents=x.qty*product.priceCents;if(!Number.isSafeInteger(totalCents)||totalCents<=0)throw Error('Preço inválido.');
 return {...x,productId:product.id,productName:product.name,clientName:client.name,priceCents:product.priceCents,totalCents};});
 return {rows,totalCents:sum(rows.map(x=>x.totalCents)),pieces:sum(rows.map(x=>x.qty)),signature:JSON.stringify(rows)};}
 function importOrders(s,p,ctx){const q=importPreview(s,p.raw);if(p.signature!==q.signature)throw Error('Prévia de pedidos mudou, confira novamente.');
 const reason=text(p.reason),id=ctx.next(s,'IMPORD'),items=[];for(const x of q.rows){const orderId=ctx.createOrder(s,{clientId:x.clientId,productId:x.productId,grade:x.grade});items.push({...x,orderId});}
 (s.orderImports||(s.orderImports=[])).push({id,commandId:ctx.uid,reason,items,totalCents:q.totalCents});return id+' · '+items.length+' pedidos · '+q.pieces+' peças';}
 function inspect(s){const issues=[],events=new Map(s.log.map(x=>[x.commandId,x])),keys=new Set(),refs=new Set(),orderIds=new Set();
 for(const x of s.payrollPeriods||[]){const key=x.employeeId+'|'+x.period,bills=s.finance.filter(t=>t.sourceId===x.id);try{
 if(keys.has(key)||!month(x.period)||!validDay(x.dueDate)||!by(s.employees,x.employeeId)||!matches(amounts(x.amounts),x.amounts)||events.get(x.commandId)?.type!=='payroll.period.create'||bills.length!==1||bills[0].id!==x.financeId||bills[0].kind!=='pagar'||bills[0].amountCents!==x.amounts.cashCents||bills[0].status!==x.status||bills[0].dueDate!==x.dueDate||x.status==='pago'&&(!validDay(x.paidDate)||bills[0].paidDate!==x.paidDate))throw Error('Folha/título divergente.');
 for(const h of x.history||[])if(events.get(h.commandId)?.type!=='payroll.period.revise'||!matches(amounts(h.before),h.before)||!matches(amounts(h.after),h.after))throw Error('Histórico de folha inválido.');
 }catch(e){issues.push(x.id+': '+e.message);}keys.add(key);}
 for(const im of s.orderImports||[]){if(events.get(im.commandId)?.type!=='order.import.batch'||!Array.isArray(im.items)||im.totalCents!==sum((im.items||[]).map(x=>x.totalCents)))issues.push(im.id+': importação sem prova');
 for(const x of im.items||[]){const o=by(s.orders,x.orderId);if(refs.has(x.reference)||orderIds.has(x.orderId)||!o||o.productId!==x.productId||o.clientId!==x.clientId||x.qty!==sum(Object.values(x.grade))||x.qty*x.priceCents!==x.totalCents)issues.push(im.id+': vínculo importado inválido');refs.add(x.reference);orderIds.add(x.orderId);}}
 return issues;}
 return {amounts,payrollPreview,payrollCreate,payrollRevise,payrollPaid,payrollReport,parseImport,importPreview,importOrders,inspect};
});
