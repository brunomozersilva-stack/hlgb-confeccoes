'use strict';
(function(root,api){if(typeof module==='object'&&module.exports)module.exports=api;else root.HLGBAttendance9658=api;})(typeof globalThis==='object'?globalThis:this,(function attendanceCore(){
 const header=['funcionario_id','data','escalado','ocorrencia','deslocamento','passagem_antecipada','compensada'];
 const dates=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(Date.parse(s+'T00:00:00Z')).toISOString().slice(0,10)===s;
 const id=v=>typeof v==='number'&&Number.isSafeInteger(v)||typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v)?String(v):'';
 const cents=s=>typeof s==='string'&&/^\d{1,7}(?:[.,]\d{1,2})?$/.test(s)?Math.round(Number(s.replace(',','.'))*100):null;
 const states=new Set(['trabalhado','falta_justificada','falta_injustificada','ferias','afastamento','folga','pendente']);
 function parse(text){
  if(typeof text!=='string'||text.length>2000000)throw Error('limite-do-arquivo');
  const rows=[];let row=[],field='',quoted=false,closed=false;const push=()=>{row.push(field);field='';closed=false};const end=()=>{push();if(row.some(v=>v!==''))rows.push(row);row=[];if(rows.length>20001)throw Error('limite-de-linhas')};
  const s=text.replace(/^\uFEFF/,'');
  for(let i=0;i<s.length;i++){const c=s[i];if(quoted){if(c==='"'){if(s[i+1]==='"'){field+='"';i++}else{quoted=false;closed=true}}else field+=c;continue}
   if(c===';'){push();continue}if(c==='\n'||c==='\r'){if(c==='\r'&&s[i+1]==='\n')i++;end();continue}
   if(closed)throw Error('csv-aspas-invalidas');if(c==='"'){if(field)throw Error('csv-aspas-invalidas');quoted=true}else field+=c;
  }if(quoted)throw Error('csv-aspas-invalidas');if(row.length||field||closed)end();
  if(JSON.stringify(rows.shift())!==JSON.stringify(header))throw Error('cabecalho-invalido');
  return rows;
 }
 function inspect(text,employees,month,allowed){
  if(allowed!==true)return {state:'forbidden',rows:[],issues:[],canWrite:false};
  if(!Array.isArray(employees)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return {state:'unavailable',rows:[],issues:[],canWrite:false};
  const persons=new Map();for(const e of employees){if(!e||e.deletedAt||e.deleted_at||e.deleted===true||e._deleted===true)continue;const k=id(e.id);if(k)persons.set(k,persons.has(k)?null:e)}
  const raw=parse(text),groups=new Map(),issues=[];let duplicateCount=0;
  raw.forEach((r,i)=>{
   const line=i+2,[employeeId,date,scheduled,status,commute,advance,adjusted]=r,k=employeeId+'|'+date;
   if(r.length!==7||!persons.get(employeeId)||!dates(date)||date.slice(0,7)!==month||!['sim','nao'].includes(scheduled)||!states.has(status)||!['sim','nao','pendente'].includes(commute)||advance!==''&&cents(advance)===null||!['sim','nao','pendente'].includes(adjusted)){issues.push({line,reason:'linha-invalida-ou-sem-vinculo'});return}
   if(status==='pendente'&&commute!=='pendente'||status==='folga'&&scheduled==='sim'||scheduled==='nao'&&['falta_justificada','falta_injustificada'].includes(status)||adjusted==='sim'&&advance===''){issues.push({line,reason:'ocorrencia-inconsistente'});return}
   const v={employeeId,date,scheduled:scheduled==='sim',status,commute,advanceCents:advance===''?null:cents(advance),adjusted,sourceLine:line};
   const canonical=JSON.stringify({...v,sourceLine:0}),prev=groups.get(k);
   if(prev){if(prev.canonical===canonical){duplicateCount++;return}prev.conflict=true;issues.push({line,reason:'conflito-mesmo-funcionario-dia'});return}
   groups.set(k,{canonical,v,conflict:false});
  });
  const rows=[...groups.values()].filter(x=>!x.conflict).map(x=>x.v).sort((a,b)=>a.employeeId.localeCompare(b.employeeId)||a.date.localeCompare(b.date));
  return {state:'local-preview',month,rows,issues,duplicateCount,canWrite:false,official:false};
 }
 function preview(batch,person,opt,transport){
  if(batch?.state!=='local-preview'||!person||!id(person.id)||!dates(opt?.asOf)||!dates(opt?.paidThrough)||!Number.isSafeInteger(opt?.rateCents)||opt.rateCents<0||typeof transport?.transport!=='function')return {state:'unavailable',canWrite:false};
  const pid=id(person.id),rows=batch.rows.filter(x=>x.employeeId===pid),counts={scheduled:0,worked:0,justified:0,unjustified:0,vacation:0,leave:0,pending:0,commuted:0};
  for(const r of rows){if(r.scheduled)counts.scheduled++;if(r.status==='trabalhado')counts.worked++;if(r.status==='falta_justificada')counts.justified++;if(r.status==='falta_injustificada')counts.unjustified++;if(r.status==='ferias')counts.vacation++;if(r.status==='afastamento')counts.leave++;if(r.status==='pendente'||r.commute==='pendente'||r.adjusted==='pendente')counts.pending++;if(r.commute==='sim')counts.commuted++}
  const [y,m]=batch.month.split('-').map(Number),start=batch.month+'-01',end=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
  const missingDays=new Date(Date.UTC(y,m,0)).getUTCDate()-rows.length;
  const eligible=person.hasTransport===true?true:person.hasTransport===false?false:null;
  if(!rows.length||eligible===null)return {state:'local-preview',rows,counts,missingDays,transport:null,canWrite:false};
  // These "verified" flags inside the pure transport engine mean only normalized evidence rows;
  // all outer proof flags remain false, so it cannot return an approved adjustment.
  const t=transport.transport({employeeId:pid,start,end,asOf:opt.asOf,paidThrough:opt.paidThrough,eligible,rateCents:opt.rateCents,workDates:rows.filter(x=>x.scheduled||x.commute==='sim'||x.advanceCents!==null).map(x=>x.date),paidDays:rows.filter(x=>x.advanceCents!==null).map(x=>({date:x.date,amountCents:x.advanceCents,verified:true})),attendance:rows.filter(x=>x.date<=opt.asOf).map(x=>({date:x.date,status:x.commute==='sim'?'worked-commuted':x.commute==='nao'?'no-commute':'unknown',verified:true})),previousAdjustments:rows.filter(x=>x.adjusted!=='nao').map(x=>x.date),calendarVerified:false,attendanceVerified:false,coverageVerified:false,adjustmentPolicyVerified:false});
  return {state:'local-preview',rows,counts,missingDays,transport:{...t,officialPayrollCents:null,canPublish:false},canWrite:false};
 }

 function roster(batch,employees,allowed){
  const empty=state=>({state,rows:[],issues:[],canWrite:false});
  if(allowed!==true)return empty('forbidden');
  if(batch?.state!=='local-preview'||!Array.isArray(batch.rows)||!Array.isArray(employees)||employees.length>10000)return empty('unavailable');
  const index=new Map(),issues=[],imported=new Set(batch.rows.map(x=>x.employeeId));
  for(const e of employees){if(!e||e.deletedAt||e.deleted_at||e.deleted===true||e._deleted===true)continue;const k=id(e.id);if(k)index.set(k,index.has(k)?null:e)}
  const rows=[];
  for(const [k,e] of index){if(!e){issues.push('duplicate-employee:'+k);continue}if(e.active===false&&!imported.has(k))continue;
   const person={id:k,name:typeof e.name==='string'?e.name.trim().slice(0,160):k,company:typeof e.companyName==='string'?e.companyName.trim().slice(0,160):'',eligible:typeof e.hasTransport==='boolean'?e.hasTransport:null,imported:imported.has(k)};
   rows.push({...person,signature:JSON.stringify([person.id,person.name,person.company,person.eligible,e.active!==false,e.terminationDate||''])});
  }
  for(const k of imported)if(!index.get(k))issues.push('imported-employee-unavailable:'+k);
  return {state:'local-roster',rows:rows.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||a.id.localeCompare(b.id)),issues,canWrite:false};
 }
 function coverageCandidate(month,asOf,options,planning){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!dates(asOf)||typeof planning?.salaryDate!=='function')return {state:'unavailable',candidate:null,confirmed:null};
  try{const [y,m]=month.split('-').map(Number),prior=new Date(Date.UTC(y,m-2,1)).toISOString().slice(0,7),cal=planning.salaryDate({competence:prior,asOf,holidays:options?.holidays||[],companyClosed:options?.companyClosed||[],bankClosed:options?.bankClosed||[]});
   if(!dates(cal.companyFifthCandidate)||!cal.companyFifthCandidate.startsWith(month+'-'))return {state:'unavailable',candidate:null,confirmed:null};
   return {state:'calendar-candidate',candidate:cal.companyFifthCandidate,salaryLimitCandidate:cal.fifthDay,scheduledSalaryCandidate:cal.scheduledCandidate,confirmed:null,requiresConfirmation:true,canWrite:false}
  }catch(_){return {state:'unavailable',candidate:null,confirmed:null}}
 }
 function batchPreview(batch,employees,settings,asOf,planning,allowed){
  const empty=state=>({state,rows:[],issues:[],observedForecastCents:null,observedCreditCents:null,reviewedCount:0,canWrite:false});
  if(allowed!==true)return empty('forbidden');
  if(!Array.isArray(settings)||settings.length<1||settings.length>200||!dates(asOf))return empty('invalid-input');
  const source=roster(batch,employees,true);if(source.state!=='local-roster')return empty(source.state);
  const current=new Map(source.rows.map(x=>[x.id,x])),seen=new Set(),rows=[],issues=[...source.issues],total={forecast:null,credit:null};let reviewedCount=0;
  for(const r of settings){
   const k=id(r?.employeeId),e=current.get(k);if(!k||seen.has(k))return empty('invalid-input');seen.add(k);
   const row={employeeId:k,name:e?.name||k,company:e?.company||'',state:'review',reason:null,forecastCents:null,possibleCreditCents:null,firstUncoveredDate:null,counts:null,missingDays:null};
   if(!e||e.signature!==r.signature){row.reason='roster-changed';rows.push(row);continue}
   if(!e.imported){row.reason='attendance-missing';rows.push(row);continue}
   if(e.eligible===null){row.reason='eligibility-unknown';rows.push(row);continue}
   if(r.reviewed!==true||!dates(r.paidThrough)||!Number.isSafeInteger(r.rateCents)||r.rateCents<0||r.rateCents>1000000000){row.reason='parameters-unreviewed';rows.push(row);continue}
   if(r.paidThrough>asOf){row.reason='coverage-in-future';rows.push(row);continue}
   try{const x=preview(batch,{id:k,hasTransport:e.eligible},{asOf,paidThrough:r.paidThrough,rateCents:r.rateCents},planning);
    if(x.state!=='local-preview'||!x.transport){row.reason='preview-unavailable';rows.push(row);continue}
    const z=x.transport;row.counts=x.counts;row.missingDays=x.missingDays;row.firstUncoveredDate=z.firstUncoveredDate;row.forecastCents=z.forecastCents;row.possibleCreditCents=z.possibleCreditCents;row.state='observed';row.issues=z.issues;reviewedCount++;
    total.forecast=(total.forecast??0)+z.forecastCents;total.credit=(total.credit??0)+z.possibleCreditCents;
   }catch(_){row.reason='preview-unavailable'}
   rows.push(row)
  }
  if([total.forecast,total.credit].some(n=>n!==null&&!Number.isSafeInteger(n)))return empty('invalid-input');
  const totalsPartial=reviewedCount!==settings.length||batch.issues.length>0||rows.some(r=>r.missingDays>0||r.issues?.length||r.counts?.pending>0);
  return {state:'local-batch-preview',rows,issues,selectedCount:settings.length,reviewedCount,observedForecastCents:total.forecast,observedCreditCents:total.credit,totalsPartial,officialNetCents:null,canWrite:false};
 }
 return {header,parse,inspect,preview,roster,coverageCandidate,batchPreview};
})());
