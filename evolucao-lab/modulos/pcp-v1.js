/* PCP local, filas disjuntas e estimativa conservadora, sem rede. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabPCPV1=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const stages=['corte','envio','costura','separacao','expedicao'];
 const labels={corte:'Corte',envio:'Envio para facção',costura:'Retorno de facção',separacao:'Separação',expedicao:'Expedição'};
 const defaults={corte:300,envio:400,costura:250,separacao:400,expedicao:400};
 const valid=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 const capacityOK=x=>x&&stages.every(k=>Number.isSafeInteger(x[k])&&x[k]>0&&x[k]<=100000);
 const priorityValue={urgente:0,alta:1,normal:2,baixa:3};
 const sum=x=>Object.values(x||{}).reduce((a,b)=>a+b,0);
 function workload(o){
 const q=[sum(o.grade),sum(o.cut),o.allocated,o.returned,o.separated,o.shipped];
 if(q.some(x=>!Number.isSafeInteger(x)||x<0)||q.some((x,i)=>i&&x>q[i-1]))throw Error('Fluxo inconsistente: '+o.id);
 return {ordered:q[0],shipped:q[5],remaining:q[0]-q[5],queue:Object.fromEntries(stages.map((k,i)=>[k,q[i]-q[i+1]])),work:Object.fromEntries(stages.map((k,i)=>[k,q[0]-q[i+1]]))};
 }
 function dateAfter(d,days){const x=new Date(d+'T00:00:00Z');x.setUTCDate(x.getUTCDate()+days);return x.toISOString().slice(0,10);}
 function report(s,{asOf='2026-11-17'}={}){
 if(!valid(asOf))throw Error('Data de planejamento inválida.');
 const cap=s.pcpCapacity||defaults;if(!capacityOK(cap))throw Error('Capacidade inválida.');
 const plans=[...(s.orders||[])].sort((a,b)=>(priorityValue[a.pcp?.priority||'normal']??2)-(priorityValue[b.pcp?.priority||'normal']??2)||(a.pcp?.dueDate||'9999').localeCompare(b.pcp?.dueDate||'9999')||a.id.localeCompare(b.id));
 const queue=Object.fromEntries(stages.map(k=>[k,0])),work={...queue},rows=[];let accumulated=0;
 for(const o of plans){const w=workload(o);for(const k of stages){queue[k]+=w.queue[k];work[k]+=w.work[k];}
 const duration=stages.reduce((n,k)=>n+Math.ceil(w.work[k]/cap[k]),0);
 const due=o.pcp?.dueDate||null;let estimated=null;
 if(w.remaining){accumulated+=duration;estimated=dateAfter(asOf,accumulated-1);}
 const status=!w.remaining?'Expedido':!due?'Sem prazo':due<asOf?'Atrasado':estimated>due?'Risco de atraso':'No prazo estimado';
 rows.push({id:o.id,model:s.products?.find(x=>x.id===o.productId)?.name||o.productId,client:s.clients?.find(x=>x.id===o.clientId)?.name||o.clientId,priority:o.pcp?.priority||'normal',due,estimated,status,days:duration,...w});
 }
 const loads=stages.map(k=>({stage:k,label:labels[k],queue:queue[k],required:work[k],capacity:cap[k],days:Math.ceil(work[k]/cap[k])}));
 const factions=(s.factions||[]).map(f=>{let sent=0,returned=0,orders=new Set();for(const a of s.factionAssignments||[])if(a.factionId===f.id){sent+=a.qtySent;returned+=a.qtyReturned;orders.add(a.orderId);}
 for(const o of s.orders||[])if(o.factionId===f.id&&!(s.factionAssignments||[]).some(a=>a.orderId===o.id)){sent+=o.allocated;returned+=o.returned;orders.add(o.id);}
 return {id:f.id,name:f.name,sent,returned,pending:sent-returned,orders:orders.size,returnPercent:sent?Math.round(returned*100/sent):null};});
 return {asOf,capacity:{...cap},rows,loads,factions,bottleneck:[...loads].sort((a,b)=>b.days-a.days)[0]?.days? [...loads].sort((a,b)=>b.days-a.days)[0].label:null,remaining:rows.reduce((n,r)=>n+r.remaining,0),late:rows.filter(r=>r.status==='Atrasado').length,risk:rows.filter(r=>r.status==='Risco de atraso').length};
 }
 function inspect(s){const problems=[];if(s.pcpCapacity&&!capacityOK(s.pcpCapacity))problems.push('PCP: capacidade inválida');for(const o of s.orders||[])if(o.pcp&&(!valid(o.pcp.dueDate)||!(o.pcp.priority in priorityValue)||!o.pcp.reason))problems.push(o.id+': planejamento inválido');return problems;}
 return {stages,labels,defaults,valid,capacityOK,workload,report,inspect};
});
