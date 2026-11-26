const assert=require('node:assert/strict'),api=require('../hlgb-modules/financeiro/attendance-transport-preview-v9658.js'),transport=require('../hlgb-modules/financeiro/payroll-calendar-transport-workers-v9645.js');(function checks(api,transport,ok){
 const head=api.header.join(';'),data=[head,'001;2026-11-03;sim;trabalhado;sim;12,00;nao','001;2026-11-04;sim;falta_injustificada;nao;12,00;nao','001;2026-11-05;sim;falta_justificada;pendente;12,00;pendente','001;2026-11-09;sim;pendente;pendente;;nao'].join('\r\n'),people=[{id:'001',hasTransport:true},{id:'002',hasTransport:false}],opt={asOf:'2026-11-06',paidThrough:'2026-11-06',rateCents:1200};
 const b=api.inspect(data,people,'2026-11',true),p=api.preview(b,people[0],opt,transport);ok(b.rows.length===4,'rows');ok(p.counts.justified===1&&p.counts.unjustified===1,'distinct absence');ok(p.counts.pending===2,'pending');ok(p.transport.forecastCents===1200,'future coverage');ok(p.transport.possibleCreditCents===1200,'explicit no commute');ok(p.transport.nextAdvanceCandidateCents===null&&!p.canWrite,'not definitive');ok(p.missingDays===26,'missing days');ok(api.inspect(data+'\n001;2026-11-03;sim;trabalhado;sim;12,00;nao',people,'2026-11',true).duplicateCount===1,'duplicate');ok(api.inspect(data+'\n001;2026-11-03;sim;trabalhado;nao;12,00;nao',people,'2026-11',true).rows.length===3,'conflict excluded');ok(api.inspect(data+'\n1;2026-11-03;sim;trabalhado;sim;;nao',people,'2026-11',true).issues.length===1,'leading zeros');ok(api.inspect(data,[...people,people[0]],'2026-11',true).rows.length===0,'duplicate employee');ok(api.inspect(data,people,'2026-11',false).state==='forbidden','permission');ok(api.inspect(data,people,'2026-10',true).rows.length===0,'month');ok(api.inspect(head+'\n001;2026-11-31;sim;trabalhado;sim;;nao',people,'2026-11',true).issues.length===1,'bad date');ok(api.inspect(data.replace('12,00;nao','12,00;sim').replace('falta_injustificada;nao;12,00;nao','falta_injustificada;nao;12,00;sim'),people,'2026-11',true).rows.length===4,'prior adjustment');ok(api.preview(api.inspect(data.replace('falta_injustificada;nao;12,00;nao','falta_injustificada;nao;12,00;sim'),people,'2026-11',true),people[0],opt,transport).transport.possibleCreditCents===0,'no double credit');ok(api.preview(b,{...people[0],hasTransport:false},opt,transport).transport.forecastCents===0,'ineligible');ok(api.preview(b,{id:'001'},opt,transport).transport===null,'unknown eligibility');ok(api.parse('\uFEFF'+head+'\n"001";2026-11-03;sim;trabalhado;sim;;nao').length===1,'quoted BOM');let failed=false;try{api.parse('wrong')}catch(_){failed=true}ok(failed,'bad header');const before=JSON.stringify(b);api.preview(b,people[0],opt,transport);ok(JSON.stringify(b)===before,'immutable');

 const roster=api.roster(b,[{...people[0],name:'Ana',companyName:'A',pix:'secret'},{...people[1],name:'Bruna',companyName:'B'},{id:'003',name:'Clara',active:false}],true);
 ok(roster.rows.length===2&&roster.rows[0].imported&&!roster.rows[1].imported,'roster includes missing attendance');ok(!JSON.stringify(roster).includes('secret'),'no unrelated details');
 ok(api.roster(b,people,false).state==='forbidden','batch roster denied');
 const settings=roster.rows.map(x=>({employeeId:x.id,signature:x.signature,reviewed:true,rateCents:1200,paidThrough:'2026-11-06'})),enrichedPeople=[{...people[0],name:'Ana',companyName:'A',pix:'secret'},{...people[1],name:'Bruna',companyName:'B'}],bb=JSON.stringify(b),ep=JSON.stringify(enrichedPeople);
 const many=api.batchPreview(b,enrichedPeople,settings,opt.asOf,transport,true);
 ok(many.state==='local-batch-preview'&&many.reviewedCount===1&&many.selectedCount===2,'batch count');
 ok(many.observedForecastCents===1200&&many.observedCreditCents===1200&&many.totalsPartial,'batch totals separate');
 ok(many.rows[1].reason==='attendance-missing'&&many.rows[1].forecastCents===null,'missing not zero');
 ok(many.officialNetCents===null&&!many.canWrite,'no automatic discount');
 ok(api.batchPreview(b,enrichedPeople,[settings[1]],opt.asOf,transport,true).observedForecastCents===null,'all missing unknown');
 ok(api.batchPreview(b,enrichedPeople,[settings[0],settings[0]],opt.asOf,transport,true).state==='invalid-input','duplicate person parameters');
 ok(api.batchPreview(b,enrichedPeople,[{...settings[0],paidThrough:'2026-11-07'}],opt.asOf,transport,true).rows[0].reason==='coverage-in-future','future coverage not payment');
 ok(api.batchPreview(b,[{...enrichedPeople[0],hasTransport:false},enrichedPeople[1]],settings,opt.asOf,transport,true).rows[0].reason==='roster-changed','changed eligibility blocked');
 ok(api.batchPreview(b,enrichedPeople,[{...settings[0],reviewed:false}],opt.asOf,transport,true).rows[0].reason==='parameters-unreviewed','review required');
 ok(api.batchPreview(b,enrichedPeople,settings,opt.asOf,transport,false).state==='forbidden','batch denied');
 const candidate=api.coverageCandidate('2026-11','2026-11-06',{holidays:['2026-11-02']},transport);
 ok(candidate.candidate==='2026-11-09'&&candidate.salaryLimitCandidate==='2026-11-07'&&candidate.confirmed===null,'company fifth day separate from salary deadline');
 ok(api.coverageCandidate('2026-11','2026-11-06',{holidays:['2026-11-02'],companyClosed:['2026-11-06']},transport).candidate==='2026-11-10','company closure shifts candidate');
 ok(api.coverageCandidate('2026-13',opt.asOf,{},transport).state==='unavailable','bad month');
 ok(JSON.stringify(b)===bb&&JSON.stringify(enrichedPeople)===ep,'batch immutable');
})(api,transport,(v,m)=>assert.ok(v,m));console.log('PASS attendance and transport preview');

(function digitalAttendanceSalary(){
 const text=['Matricula;Data;Previsto;Trabalhado;Situacao','A01;03/11/2026;08:00;07:30;Trabalhado','A01;04/11/2026;480;0;Falta injustificada','A01;05/11/2026;480;0;Falta justificada','A01;06/11/2026;480;09:00;Trabalhado','A01;07/11/2026;0;0;Folga','A01;06/11/2026;480;09:00;Trabalhado'].join('\n');
 const mapping={employee:'Matricula',date:'Data',scheduled:'Previsto',worked:'Trabalhado',status:'Situacao'},people=[{id:'001',salary:2200}],links=[{code:'A01',employeeId:'001'}],table=api.digitalTable(text,';',true);
 const b=api.inspectDigital(table,mapping,people,'2026-11',true,links),before=JSON.stringify(b);
 assert.equal(b.rows.length,5);assert.equal(b.duplicateCount,1);assert.equal(b.issues.length,0);
 const v=api.salaryDigitalPreview(b,people[0],{monthlyHours:220,approvedDeductionMinutes:510,approvedExtraMinutes:60,extraPercent:150,reviewed:true},true);
 assert.equal(v.state,'local-salary-preview');assert.equal(v.counts.shortfall,30);assert.equal(v.counts.absenceUnjustified,480);assert.equal(v.counts.absenceJustified,480);assert.equal(v.counts.extra,60);
 assert.equal(v.deductionCents,8500);assert.equal(v.extraCents,1500);assert.equal(v.indicativeGrossCents,213000);assert.equal(v.officialNetCents,null);assert.equal(v.partial,true);assert.equal(v.canWrite,false);
 const invalid=api.salaryDigitalPreview(b,people[0],{monthlyHours:220,approvedDeductionMinutes:990,approvedExtraMinutes:60,extraPercent:150,reviewed:true},true);
 assert.equal(invalid.indicativeGrossCents,null);assert.equal(api.salaryDigitalPreview(b,people[0],{monthlyHours:220},true).deductionCents,null);
 assert.equal(api.inspectDigital(table,mapping,people,'2026-11',true).rows.length,0);
 assert.equal(api.inspectDigital(table,mapping,people,'2026-11',false,links).state,'forbidden');
 assert.equal(api.inspectDigital(table,{...mapping,date:'Matricula'},people,'2026-11',true,links).state,'invalid-mapping');
 const conflict=api.inspectDigital(api.digitalTable(text+'\nA01;03/11/2026;480;08:00;Trabalhado',';',true),mapping,people,'2026-11',true,links);
 assert.equal(conflict.rows.length,4);assert.equal(conflict.issues.length,1);
 assert.deepEqual(api.digitalTable('id,date\n"001",2026-11-03',',',true).rows,[['001','2026-11-03']]);
 assert.throws(()=>api.digitalTable('id;id\n001;002',';',true));assert.equal(JSON.stringify(b),before);
 console.log('PASS mapped digital attendance and reviewed salary preview');
})();


(function digitalSalaryCollective(){
 const people=[{id:'01',name:'Ana',salary:2200,companyName:'A'},{id:'02',name:'Bia',salary:3300,companyName:'A'},{id:'03',name:'Caio',salary:2000,companyName:'B'},{id:'04',active:false,salary:2000}];
 const text=['id;date;planned;worked;status','01;03/11/2026;480;450;trabalhado','02;03/11/2026;480;540;trabalhado'].join('\n');
 const batch=api.inspectDigital(api.digitalTable(text,';',true),{employee:'id',date:'date',scheduled:'planned',worked:'worked',status:'status'},people,'2026-11',true);
 const roster=api.digitalSalaryRoster(batch,people,true);assert.equal(roster.rows.length,3);assert.equal(roster.rows[2].imported,false);
 const settings=roster.rows.map(r=>({employeeId:r.employeeId,signature:r.signature,monthlyHours:220,approvedDeductionMinutes:r.employeeId==='01'?30:0,approvedExtraMinutes:r.employeeId==='02'?60:0,extraPercent:150,reviewed:true}));
 const before=JSON.stringify([batch,people,settings]),v=api.digitalSalaryBatch(batch,people,settings,true);
 assert.equal(v.reviewedCount,2);assert.equal(v.selectedCount,3);assert.equal(v.partial,true);assert.equal(v.canWrite,false);assert.equal(v.officialNetCents,null);
 assert.deepEqual(v.totals,{baseCents:550000,deductionCents:500,extraCents:2250,indicativeGrossCents:551750});
 assert.equal(v.rows[2].reason,'missing-attendance');assert.equal(api.digitalSalaryBatch(batch,people,[settings[2]],true).totals,null);
 assert.equal(api.digitalSalaryBatch(batch,people,[settings[0],settings[0]],true).state,'invalid-input');
 assert.equal(api.digitalSalaryBatch(batch,people,settings,false).state,'forbidden');
 assert.equal(api.digitalSalaryBatch(batch,[{...people[0],salary:2300},...people.slice(1)],settings,true).rows[0].reason,'roster-or-report-changed');
 assert.equal(api.digitalSalaryBatch({...batch,rows:batch.rows.map(r=>r.employeeId==='01'?{...r,workedMinutes:440}:r)},people,settings,true).rows[0].reason,'roster-or-report-changed');
 assert.equal(api.digitalSalaryBatch(batch,people,[{...settings[0],reviewed:false}],true).totals,null);
 assert.equal(JSON.stringify([batch,people,settings]),before);
 console.log('PASS collective payroll preview, incomplete coverage, stale evidence and no writes');
})();
