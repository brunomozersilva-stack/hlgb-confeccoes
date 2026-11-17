/* Hub analítico fictício, leitura do mesmo razão. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabFinanceV1=api;})(typeof window!=='undefined'?window:null,function factory(){
 const valid=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 const categories=['Vendas','Facções','Compras','Folha','Aluguel','Impostos','Transporte','Outras despesas','Outras receitas','Compensações','Devoluções'];
 const classify=(f,s)=>{if(!f.sourceId)return categories.includes(f.category)?f.category:(f.kind==='pagar'?'Outras despesas':'Outras receitas');for(const [k,c] of [['orders','Vendas'],['settlements','Facções'],['purchaseOrders','Compras'],['settlementCompensations','Compensações'],['purchaseReturns','Devoluções']])if((s[k]||[]).some(x=>x.id===f.sourceId))return c;return 'Vínculo não identificado';};
 const empty=()=>({receber:0,pagar:0,net:0,count:0});
 const add=(a,r)=>{a[r.kind]+=r.amountCents;a.net=a.receber-a.pagar;a.count++;if(![a.receber,a.pagar,a.net].every(Number.isSafeInteger))throw Error('Total excede limite seguro');};
 function report(s,{from='2026-11-01',to='2026-12-31',asOf='2026-11-17',category='todos'}={}){
 if(!valid(from)||!valid(to)||!valid(asOf)||from>to)throw Error('Período financeiro inválido.');
 const actual=empty(),forecast=empty(),undated=empty(),overdue=empty(),open=empty(),groups=new Map(),days=new Map(),rows=[],issues=[],seen=new Set();
 for(const f of s.finance||[]){
 if(!f.id||seen.has(f.id))throw Error('ID financeiro duplicado ou ausente.');seen.add(f.id);
 if(!['pagar','receber'].includes(f.kind)||!Number.isSafeInteger(f.amountCents)||f.amountCents<=0)throw Error('Título financeiro inválido: '+f.id);
 if(!['aberto','pago'].includes(f.status)){issues.push(f.id+' · situação excluída: '+f.status);continue;}
 const cat=classify(f,s);if(category!=='todos'&&cat!==category)continue;
 const d=f.status==='pago'?f.paidDate:f.dueDate,has=valid(d);
 const row={id:f.id,description:f.description,kind:f.kind,amountCents:f.amountCents,status:f.status,category:cat,date:has?d:null,reconciliation:f.status!=='pago'?'Não quitado':f.reconciliation?.amountCents===f.amountCents&&f.reconciliation?.reference?'Conferido manualmente':'Sem conferência'};
 if(f.status==='aberto'){add(open,row);if(has&&d<asOf)add(overdue,row);}
 if(!has){add(undated,row);rows.push(row);continue;}
 if(d<from||d>to)continue;
 rows.push(row);const key=f.status==='pago'?'actual':'forecast';add(key==='actual'?actual:forecast,row);
 if(!days.has(d))days.set(d,{date:d,actual:empty(),forecast:empty()});add(days.get(d)[key],row);
 if(!groups.has(cat))groups.set(cat,{category:cat,actual:empty(),forecast:empty()});add(groups.get(cat)[key],row);
 }
 const projectedNet=actual.net+forecast.net;if(!Number.isSafeInteger(projectedNet))throw Error('Projeção excede limite seguro.');
 return {actual,forecast,open,overdue,undated,projectedNet,categories:[...groups.values()],days:[...days.values()].sort((a,b)=>a.date.localeCompare(b.date)),rows:rows.sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||a.id.localeCompare(b.id)),issues};
 }return {valid,categories,classify,report};
});
