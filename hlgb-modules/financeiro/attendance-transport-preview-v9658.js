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

 // Daily consolidated digital reports, not raw punch files. User confirms column mapping.
 function digitalTable(text,delimiter,allowed){
  if(allowed!==true)throw Error('permission');
  if(typeof text!=='string'||text.length>2000000||![';',',','\t'].includes(delimiter))throw Error('invalid-file');
  const rows=[];let row=[],field='',quoted=false,closed=false;
  const push=()=>{row.push(field);field='';closed=false};
  const end=()=>{push();if(row.some(x=>x.trim()!==''))rows.push(row);row=[];if(rows.length>20001)throw Error('too-many-rows')};
  const s=text.replace(/^\uFEFF/,'');
  for(let i=0;i<s.length;i++){const c=s[i];if(quoted){if(c==='"'){if(s[i+1]==='"'){field+='"';i++}else{quoted=false;closed=true}}else field+=c;continue}
   if(c===delimiter){push();continue}if(c==='\n'||c==='\r'){if(c==='\r'&&s[i+1]==='\n')i++;end();continue}
   if(closed)throw Error('invalid-quotes');if(c==='"'){if(field)throw Error('invalid-quotes');quoted=true}else field+=c;
  }
  if(quoted)throw Error('invalid-quotes');if(row.length||field||closed)end();
  const columns=rows.shift()?.map(x=>x.trim());
  if(!columns?.length||columns.length>100||columns.some(x=>!x||x.length>200)||new Set(columns).size!==columns.length)throw Error('invalid-header');
  return {columns,rows};
 }
 const reportDate=v=>{const s=String(v??'').trim(),m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/),d=m?m[3]+'-'+m[2]+'-'+m[1]:s;return dates(d)?d:null};
 const duration=v=>{const s=String(v??'').trim(),m=s.match(/^(\d{1,2}):([0-5]\d)$/),n=m?Number(m[1])*60+Number(m[2]):/^\d{1,4}$/.test(s)?Number(s):NaN;return Number.isSafeInteger(n)&&n>=0&&n<=1440?n:null};
 const normalize=v=>String(v??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,'_');
 function inspectDigital(table,mapping,employees,month,allowed,links=[]){
  const empty=state=>({state,rows:[],issues:[],duplicateCount:0,canWrite:false,official:false});
  if(allowed!==true)return empty('forbidden');
  if(!Array.isArray(table?.columns)||!Array.isArray(table.rows)||!Array.isArray(employees)||!Array.isArray(links)||!/^(\d{4})-(0[1-9]|1[0-2])$/.test(month))return empty('unavailable');
  const fields=['employee','date','scheduled','worked','status'],indexes=fields.map(k=>table.columns.indexOf(mapping?.[k]));
  if(indexes.some(i=>i<0)||new Set(indexes).size!==fields.length)return empty('invalid-mapping');
  const people=new Map(),external=new Map();
  for(const e of employees){if(!e||e.deletedAt||e.deleted_at||e.deleted===true||e._deleted===true)continue;const k=id(e.id);if(k)people.set(k,people.has(k)?null:e)}
  for(const l of links){const code=id(l?.code),pid=id(l?.employeeId);if(!code||!people.get(pid)||external.has(code)||people.has(code)&&code!==pid)return empty('invalid-links');external.set(code,pid)}
  const groups=new Map(),issues=[];let duplicateCount=0;
  table.rows.forEach((r,i)=>{
   const line=i+2,[rawCode,rawDate,rawScheduled,rawWorked,rawStatus]=indexes.map(k=>r[k]),code=id(String(rawCode??'').trim()),pid=external.get(code)||code,d=reportDate(rawDate),scheduled=duration(rawScheduled),worked=duration(rawWorked),status=normalize(rawStatus);
   if(r.length!==table.columns.length||!people.get(pid)||!d||d.slice(0,7)!==month||scheduled===null||worked===null||!states.has(status)){issues.push({line,reason:'linha-invalida-ou-sem-vinculo',code});return}
   if((['falta_justificada','falta_injustificada','ferias','afastamento','folga'].includes(status)&&worked!==0)||(status==='folga'&&scheduled!==0)||(['falta_justificada','falta_injustificada'].includes(status)&&scheduled===0)||(status==='trabalhado'&&worked===0)){issues.push({line,reason:'ocorrencia-inconsistente',code});return}
   const v={employeeId:pid,date:d,scheduledMinutes:scheduled,workedMinutes:worked,status},key=JSON.stringify([pid,d]),canonical=JSON.stringify(v),prev=groups.get(key);
   if(prev){if(prev.canonical===canonical){duplicateCount++;return}prev.conflict=true;issues.push({line,reason:'conflito-mesmo-funcionario-dia',code});return}
   groups.set(key,{v,canonical,conflict:false});
  });
  return {...empty('local-digital-preview'),month,rows:[...groups.values()].filter(x=>!x.conflict).map(x=>x.v).sort((a,b)=>a.employeeId.localeCompare(b.employeeId)||a.date.localeCompare(b.date)),issues,duplicateCount};
 }
 function salaryDigitalPreview(batch,person,opt,allowed){
  const empty=state=>({state,canWrite:false,officialNetCents:null});
  if(allowed!==true)return empty('forbidden');
  const pid=id(person?.id),salary=cents(String(person?.salary??'')),divisor=opt?.monthlyHours;
  if(batch?.state!=='local-digital-preview'||!pid||salary===null||salary<=0||!Number.isSafeInteger(divisor)||divisor<1||divisor>744)return empty('unavailable');
  const rows=batch.rows.filter(r=>r.employeeId===pid),byDate=new Set(rows.map(r=>r.date));
  if(!rows.length)return empty('missing-attendance');
  const counts={scheduled:0,worked:0,absenceUnjustified:0,absenceJustified:0,shortfall:0,extra:0,pending:0};
  for(const r of rows){
   counts.scheduled+=r.scheduledMinutes;counts.worked+=r.workedMinutes;
   if(r.status==='falta_injustificada')counts.absenceUnjustified+=r.scheduledMinutes;
   if(r.status==='falta_justificada')counts.absenceJustified+=r.scheduledMinutes;
   if(r.status==='trabalhado'){counts.shortfall+=Math.max(0,r.scheduledMinutes-r.workedMinutes);counts.extra+=Math.max(0,r.workedMinutes-r.scheduledMinutes)}
   if(r.status==='pendente')counts.pending++;
  }
  const [y,m]=batch.month.split('-').map(Number),missingDays=new Date(Date.UTC(y,m,0)).getUTCDate()-byDate.size;
  const approvedDeduction=opt?.approvedDeductionMinutes,approvedExtra=opt?.approvedExtraMinutes,extraPercent=opt?.extraPercent;
  const valid=Number.isSafeInteger(approvedDeduction)&&approvedDeduction>=0&&approvedDeduction<=counts.absenceUnjustified+counts.shortfall&&Number.isSafeInteger(approvedExtra)&&approvedExtra>=0&&approvedExtra<=counts.extra&&Number.isSafeInteger(extraPercent)&&extraPercent>=100&&extraPercent<=1000;
  const reviewed=valid&&opt.reviewed===true;
  const deductionCents=reviewed?Math.round(salary*approvedDeduction/(divisor*60)):null;
  const extraCents=reviewed?Math.round(salary*approvedExtra*extraPercent/(divisor*60*100)):null;
  return {...empty('local-salary-preview'),baseCents:salary,counts,missingDays,issues:batch.issues.length,reviewed,deductionCents,extraCents,indicativeGrossCents:reviewed?salary-deductionCents+extraCents:null,partial:missingDays>0||batch.issues.length>0||counts.pending>0};
 }

 // Batch review never mutates payroll and never treats unreviewed amounts as zero.
 function digitalSalaryRoster(batch,employees,allowed){
  const empty=state=>({state,rows:[],issues:[],canWrite:false});
  if(allowed!==true)return empty('forbidden');
  if(batch?.state!=='local-digital-preview'||!Array.isArray(batch.rows)||!Array.isArray(employees)||employees.length>10000)return empty('unavailable');
  const byId=new Map(),imported=new Set(batch.rows.map(r=>r.employeeId)),issues=[];
  for(const e of employees){if(!e||e.deletedAt||e.deleted_at||e.deleted===true||e._deleted===true)continue;const k=id(e.id);if(k)byId.set(k,byId.has(k)?null:e)}
  const rows=[];
  for(const [k,e] of byId){if(!e){issues.push('duplicate-employee:'+k);continue}if(e.active===false&&!imported.has(k))continue;
   const baseCents=cents(String(e.salary??'')),name=String(e.name||k).slice(0,160),company=String(e.companyName||'').slice(0,160);
   const days=batch.rows.filter(r=>r.employeeId===k),signature=JSON.stringify([k,name,company,baseCents,e.active!==false,e.hireDate||'',e.terminationDate||'',batch.month,days]);
   rows.push({employeeId:k,name,company,baseCents,imported:days.length>0,signature});
  }
  for(const k of imported)if(!byId.get(k))issues.push('imported-employee-unavailable:'+k);
  return {...empty('local-digital-roster'),issues,rows:rows.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||a.employeeId.localeCompare(b.employeeId))};
 }
 function digitalSalaryBatch(batch,employees,settings,allowed){
  const empty=state=>({state,rows:[],issues:[],selectedCount:0,reviewedCount:0,totals:null,officialNetCents:null,canWrite:false});
  if(allowed!==true)return empty('forbidden');
  if(!Array.isArray(settings)||!settings.length||settings.length>200)return empty('invalid-input');
  const source=digitalSalaryRoster(batch,employees,true);if(source.state!=='local-digital-roster')return empty(source.state);
  const current=new Map(source.rows.map(r=>[r.employeeId,r])),people=new Map(employees.filter(e=>e&&!e.deletedAt&&!e.deleted_at&&!e.deleted&&!e._deleted).map(e=>[id(e.id),e])),seen=new Set(),rows=[];
  let totals=null,reviewedCount=0;
  for(const s of settings){
   const k=id(s?.employeeId);if(!k||seen.has(k))return empty('invalid-input');seen.add(k);
   const e=current.get(k),row={employeeId:k,name:e?.name||k,company:e?.company||'',state:'review',reason:null,preview:null};
   if(!e||s.signature!==e.signature)row.reason='roster-or-report-changed';
   else if(!e.imported)row.reason='missing-attendance';
   else{
    const p=salaryDigitalPreview(batch,people.get(k),s,true);
    if(p.state!=='local-salary-preview')row.reason=p.state;
    else {row.preview=p;if(!p.reviewed)row.reason='parameters-unreviewed';else{
     row.state='observed';reviewedCount++;
     if(!totals)totals={baseCents:0,deductionCents:0,extraCents:0,indicativeGrossCents:0};
     for(const key of Object.keys(totals))totals[key]+=p[key];
    }}
   }
   rows.push(row);
  }
  if(totals&&Object.values(totals).some(n=>!Number.isSafeInteger(n)))return empty('invalid-input');
  return {...empty('local-digital-batch'),rows,issues:source.issues,selectedCount:settings.length,reviewedCount,totals,partial:reviewedCount!==settings.length||batch.issues.length>0||source.issues.length>0||rows.some(r=>r.preview?.partial)};
 }
 return {digitalSalaryRoster,digitalSalaryBatch,digitalTable,inspectDigital,salaryDigitalPreview,header,parse,inspect,preview,roster,coverageCandidate,batchPreview};
})());
