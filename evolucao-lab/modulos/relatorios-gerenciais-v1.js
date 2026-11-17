/* Central gerencial: histórico registrado, sem inventar datas antigas. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabManagementV1=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const fields=['ordered','cut','allocated','returned','separated','shipped'];
 const sum=o=>Object.values(o||{}).reduce((a,b)=>a+b,0);
 const quantities=o=>o?{ordered:sum(o.grade),cut:sum(o.cut),allocated:o.allocated,returned:o.returned,separated:o.separated,shipped:o.shipped}:Object.fromEntries(fields.map(k=>[k,0]));
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const zero=()=>Object.fromEntries(fields.map(k=>[k,0]));
 const area=t=>({order:'pedidos',cut:'corte',faction:'faccoes',settlement:'acertos',finance:'hub',purchase:'compras',stock:'estoque',material:'estoque',pcp:'producao',payroll:'folha',print:'impressora3d',product:'produtos',error:'central',client:'cadastros',supplier:'cadastros'})[String(t).split('.')[0]]||'nucleo';
 function capture(before,after,recordedAt){
 if(recordedAt!==undefined&&(typeof recordedAt!=='string'||!Number.isFinite(Date.parse(recordedAt))||new Date(recordedAt).toISOString()!==recordedAt))throw Error('Data de registro inválida.');
 const previous=new Map(before.orders.map(o=>[o.id,o])),changes=[];
 for(const o of after.orders){const a=quantities(previous.get(o.id)),b=quantities(o),delta=Object.fromEntries(fields.map(k=>[k,b[k]-a[k]]));if(fields.some(k=>delta[k]!==0))changes.push({orderId:o.id,productId:o.productId,clientId:o.clientId,delta});}
 const oldMoves=new Set(before.stockLedger.map(m=>m.id));
 const moves=after.stockLedger.filter(m=>!oldMoves.has(m.id)).map(m=>({id:m.id,materialId:m.materialId,sourceId:m.sourceId,type:m.type,deltaGrams:m.deltaGrams}));
 return {recordedAt:recordedAt||null,changes,moves};
 }
 function report(s,{from='2026-11-01',to='2026-11-30',module='todos',query='',page=1,limit=50}={}){
 if(!date(from)||!date(to)||from>to)throw Error('Período inválido.');
 const days=new Map(),models=new Map(),materials=new Map(),activity=new Map(),totals=zero(),history=[],seen=new Set();
 let undated=0,withoutMetrics=0,datedEvents=0;
 for(const e of s.log||[]){
 if(seen.has(e.commandId))throw Error('Comando duplicado no histórico: '+e.commandId);seen.add(e.commandId);
 const day=typeof e.recordedAt==='string'?e.recordedAt.slice(0,10):null,has=date(day)&&Number.isFinite(Date.parse(e.recordedAt));
 if(!has)undated++;
 if(!Array.isArray(e.changes)||!Array.isArray(e.moves))withoutMetrics++;
 if(!has||day<from||day>to)continue;
 datedEvents++;const mod=area(e.type);activity.set(mod,(activity.get(mod)||0)+1);
 if(!days.has(day))days.set(day,{date:day,events:0,...zero()});const daily=days.get(day);daily.events++;
 for(const c of e.changes||[]){if(!models.has(c.productId))models.set(c.productId,{productId:c.productId,...zero()});const m=models.get(c.productId);for(const k of fields){const v=c.delta[k];if(!Number.isSafeInteger(v))throw Error('Movimento de peças inválido: '+e.commandId);totals[k]+=v;daily[k]+=v;m[k]+=v;}}
 for(const m of e.moves||[]){if(!Number.isSafeInteger(m.deltaGrams))throw Error('Movimento de estoque inválido: '+e.commandId);if(!materials.has(m.materialId))materials.set(m.materialId,{materialId:m.materialId,inGrams:0,outGrams:0});const row=materials.get(m.materialId);if(m.deltaGrams>0)row.inGrams+=m.deltaGrams;else row.outGrams-=m.deltaGrams;}
 }
 for(const e of s.log||[]){const day=typeof e.recordedAt==='string'?e.recordedAt.slice(0,10):null,has=date(day)&&Number.isFinite(Date.parse(e.recordedAt)),mod=area(e.type);
 if(has&&(day<from||day>to)||module!=='todos'&&module!==mod)continue;
 const h={revision:e.revision,commandId:e.commandId,type:e.type,module:mod,actor:e.actor,description:e.description,date:has?day:null,recordedAt:has?e.recordedAt:null,orderIds:(e.changes||[]).map(x=>x.orderId)};
 if(!norm([h.commandId,h.type,h.module,h.actor,h.description,...h.orderIds].join(' ')).includes(norm(query)))continue;
 history.push(h);}
 history.sort((a,b)=>b.revision-a.revision);limit=Math.min(100,Math.max(1,Math.floor(Number(limit)||50)));const pages=Math.max(1,Math.ceil(history.length/limit));page=Math.min(pages,Math.max(1,Math.floor(Number(page)||1)));
 const product=new Map((s.products||[]).map(x=>[x.id,x])),material=new Map((s.materials||[]).map(x=>[x.id,x]));
 return {from,to,totals,datedEvents,undated,withoutMetrics,days:[...days.values()].sort((a,b)=>a.date.localeCompare(b.date)),models:[...models.values()].map(x=>({...x,name:product.get(x.productId)?.name||x.productId})),materials:[...materials.values()].map(x=>({...x,name:material.get(x.materialId)?.name||x.materialId})),activity:[...activity].map(([module,count])=>({module,count})),history:history.slice((page-1)*limit,page*limit),historyAll:history,pages,page,historyCount:history.length};
 }
 function previousPeriod(from,to){if(!date(from)||!date(to)||from>to)throw Error('Período inválido.');const start=Date.parse(from+'T00:00:00Z'),end=Date.parse(to+'T00:00:00Z'),day=86400000,n=end-start+day;return {from:new Date(start-n).toISOString().slice(0,10),to:new Date(start-day).toISOString().slice(0,10)};}
 return {fields,date,capture,report,previousPeriod};
});
