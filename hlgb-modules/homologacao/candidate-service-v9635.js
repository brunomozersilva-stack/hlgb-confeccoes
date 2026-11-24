(function(root){'use strict';const sample=function sample(){
 return {orders:[{id:101,status:'Aberto',grade:[{productId:11,color:'Preto',size:'P',qty:100}]},{id:102,status:'Aberto',grade:[{productId:12,color:'Preto',size:'M',qty:80}]}],products:[{id:11,name:'Camisola fictícia',materials:[{materialId:10,qty:10,calcMode:'yield',unit:'kg'}]},{id:12,name:'Calcinha fictícia',materials:[{materialId:10,qty:12,calcMode:'yield',unit:'kg'}]}],materials:[{id:10,name:'Malha preta fictícia',cat:'Tecido',unit:'kg'}],cuts:[],production:[],operationalWriteoffs:[],hubFinanceEntries:[{id:1,flow:'Saída',category:'Matéria-prima',status:'Previsto',date:'2026-11-30',value:30000},{id:2,flow:'Entrada',category:'Vendas',status:'Previsto',date:'2026-11-30',value:12000},{id:3,flow:'Saída',category:'Funcionários',status:'Realizado',date:'2026-11-01',realizedAt:'2026-11-06',value:1800,sourceType:'payroll_month',sourceId:'2026-10'}],payroll:[{id:1,employeeId:1,month:'2026-10',paid:false,salary:2000,transport:150},{id:2,employeeId:2,month:'2026-10',paid:true,paidAt:'2026-11-06',paidValue:1800}],employees:[{id:1},{id:2}]};
};const service=function service(apis){
 const db=sample();
 const ctx={authenticated:true,financeAllowed:true,payrollAggregateAllowed:true,payrollAllowed:true,db,paidDateApi:apis.paidDate,payrollCalc:r=>({net:r.salary+r.transport})};
 // Deliberately no external context, credentials, localStorage, or real authorization claims.
 const before=JSON.stringify(db);
 return {
  cut:()=>apis.cut.discover(db,{pairIndex:()=>new Set()}),
  finance:()=>apis.finance.inspect(ctx,{asOf:'2026-11-23',targetDate:'2026-11-30',historyWeeks:8}),
  payroll:()=>apis.payroll.inspect(ctx,{competence:'2026-10',asOf:'2026-11-23',holidays:['2026-11-02'],bankClosed:[]}),
  remnants:(state)=>apis.remnants.preview(11,{state,eligible:state==='yes'?[{productId:12,materialId:10,minWidthMm:120,minLengthMm:150}]:[]},db.products),
  intact:()=>before===JSON.stringify(db)
 };
};if(typeof module==='object'&&module.exports)module.exports={sample,service};else root.HLGBCandidate9635={sample,service};})(typeof globalThis==='object'?globalThis:this);
