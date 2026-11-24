const assert=require('node:assert/strict'),api=require('../hlgb-modules/financeiro/worker-registry-v9659.js');(async function test(api,ok){
 const u='12345678-1234-4234-8234-123456789abc',op='12345678-1234-4234-8234-123456789abd',op2='12345678-1234-4234-8234-123456789abe';
 const p={worker_id:u,operation_id:op,revision:1,name:'Pessoa teste',role_name:'Costura',sector:'Produção',start_date:'2026-11-01',active:true,planned_days:5,mode:'daily',relationship:'review-required',rate_cents:10000,transport_enabled:true,transport_cents:1200,benefits:[]};
 const x=api.profile(p);ok(x.benefits.includes('13th')&&x.benefits.includes('vacation-third'),'rights');ok(api.review(x,{friday:'2026-11-27',asOf:'2026-11-27',workedDays:4,commuteDays:3}).actualCents===43600,'independent commute');ok(api.review(x,{friday:'2026-11-27',asOf:'2026-11-27',workedDays:0,commuteDays:0}).actualCents===0,'zero');ok(api.review(x,{friday:'2026-11-27',asOf:'2026-11-27'}).requiresDays,'friday prompt');ok(api.review(x,{friday:'2026-11-27',asOf:'2026-11-27',closedDays:['2026-11-27']}).scheduledCandidate==='2026-11-26','closed friday');
 const f=api.forecast(x,{friday:'2026-11-27',asOf:'2026-11-27',workedDays:4,commuteDays:3},{authenticated:true,payrollAllowed:true,financeAllowed:true,rows:[]});ok(f.plannedCents===56000&&f.actualCents===43600&&f.differenceCents===-12400&&!f.canPublish,'forecast');
 const paid=api.forecast(x,{friday:'2026-11-27',asOf:'2026-11-27'},{authenticated:true,payrollAllowed:true,financeAllowed:true,rows:[{id:1,sourceType:'worker_week_forecast_v1',sourceId:u+':2026-11-27',status:'Realizado'}]});ok(paid.reconciliation==='already-paid-review','paid guard');
 for(const bad of [{...p,relationship:'registered'},{...p,rate_cents:-1},{...p,revision:0},{...p,worker_id:'bad'}]){let fail=false;try{api.profile(bad)}catch(_){fail=true}ok(fail,'invalid or canonical payroll')}
 const draft=api.draft(x,{operation_id:op2,revision:1,friday:'2026-11-27',as_of:'2026-11-27',worked_days:4,commute_days:3,note:'Conferido'});ok(draft.worker_revision===1&&draft.worked_days===4,'snapshot');let fail=false;try{api.draft(x,{operation_id:op2,revision:1,friday:'2026-11-27',as_of:'2026-11-26',worked_days:4,commute_days:3,note:''})}catch(_){fail=true}ok(fail,'future confirmation');
 const store=[];let inserts=0,lose=false;const t={allowed:()=>true,byOperation:async(k,id)=>store.find(z=>z.operation_id===id),latest:async()=>store.at(-1)||null,insert:async(k,row)=>{inserts++;store.push({...row});if(lose)throw Error('ack lost');return row}};
 ok((await api.save('profile',x,t)).confirmed,'save readback');ok((await api.save('profile',x,t)).confirmed&&inserts===1,'idempotent');ok((await api.save('profile',{...x,name:'Other'},t)).state==='operation-conflict','conflicting operation');ok((await api.save('profile',{...x,operation_id:op2,revision:3},t)).state==='revision-conflict','stale revision');lose=true;ok((await api.save('profile',{...x,operation_id:op2,revision:2},t)).confirmed&&inserts===2,'lost ack readback');ok((await api.save('profile',x,{...t,allowed:()=>false})).state==='permission-or-disabled','disabled');
 const empty={...t,byOperation:async()=>null,latest:async()=>null,insert:async()=>({applied:true})};ok(!(await api.save('profile',x,empty)).confirmed,'no proof');ok(!JSON.stringify(f).includes('proposal'),'no financial write');ok(p.benefits.length===0,'immutable');
 const unknown=api.profile({...p,planned_days:null});ok(api.review(unknown,{friday:'2026-11-27',asOf:'2026-11-27'}).plannedCents===null,'unknown plan remains unknown');
 const month=api.monthly({...p,mode:'monthly',rate_cents:180000},{competence:'2026-11',asOf:'2026-11-27',contractDate:'2026-12-04',commuteDays:20},{authenticated:true,payrollAllowed:true,financeAllowed:true,rows:[]});ok(month.observedGrossCents===204000&&!month.canPublish,'monthly');
 const old=api.reviewedWeek(x,null,'2026-11-27'),v={operation_id:op2,friday:'2026-11-27',as_of:'2026-11-27',worked_days:4,commute_days:3,note:''};ok(api.nextWeek(x,old,v).revision===1,'reviewed revision');const seen=api.reviewedWeek(x,{worker_id:u,week_friday:'2026-11-27',revision:2},'2026-11-27');ok(api.nextWeek(x,seen,v).revision===3,'existing version');
 let stale=false;try{api.nextWeek({...x,revision:2},seen,v)}catch(_){stale=true}ok(stale,'profile changed');
 let noReview=false;try{api.nextWeek(x,null,v)}catch(_){noReview=true}ok(noReview,'explicit review required');
 let partial=false;try{api.monthly({...p,mode:'monthly',start_date:'2026-11-02'},{competence:'2026-11',asOf:'2026-11-27',contractDate:'2026-12-04',commuteDays:20},{})}catch(_){partial=true}ok(partial,'partial month review');

 // Shared in-memory mock with an authoritative unique revision constraint, two independent transports.
 const shared=[{...x}],attempts=[];let released=0,release;
 const barrier=new Promise(resolve=>{release=resolve});
 const transport=(actor,wait=false)=>({allowed:()=>true,byOperation:async(kind,id)=>shared.find(z=>z.operation_id===id)||null,
 latest:async()=>{const snapshot={...shared.at(-1)};if(wait&&released<2){released++;if(released===2)release();await barrier}return snapshot},
 insert:async(kind,row)=>{attempts.push({actor,op:row.operation_id});if(shared.some(z=>z.operation_id===row.operation_id||z.worker_id===row.worker_id&&z.revision===row.revision))throw Error('unique constraint');shared.push({...row});return row}});
 const rA=api.profile({...x,revision:2,operation_id:op2,rate_cents:11000}),rB=api.profile({...x,revision:2,operation_id:'12345678-1234-4234-8234-123456789abf',rate_cents:12000});
 const race=await Promise.all([api.save('profile',rA,transport('A',true)),api.save('profile',rB,transport('B',true))]);
 ok(race.filter(r=>r.confirmed).length===1,'two clients cannot both confirm revision 2');
 ok(shared.length===2&&attempts.length===2,'shared unique revision constraint');
 const winner=race[0].confirmed?rA:rB,loser=race[0].confirmed?rB:rA;
 ok((await api.save('profile',winner,transport('B'))).confirmed&&shared.length===2,'same operation verified from independent session');
 ok((await api.save('profile',loser,transport('A'))).state==='revision-conflict','stale conflicting revision blocked');
 const r3=api.profile({...winner,revision:3,operation_id:'12345678-1234-4234-8234-123456789ac0',rate_cents:13000});
 let permitted=true;const revoke={...transport('A'),allowed:()=>permitted,insert:async(k,row)=>{shared.push({...row});permitted=false;throw Error('lost response and session')}};
 const unknownAck=await api.save('profile',r3,revoke);
 ok(!unknownAck.confirmed&&shared.length===3,'revoked client cannot claim confirmed write');
 ok((await api.save('profile',r3,transport('B'))).confirmed&&shared.length===3,'authorized readback proves same operation without duplicate');
 ok((await api.save('profile',{...r3,rate_cents:14000},transport('B'))).state==='operation-conflict','altered retry rejected');
})(api,(v,m)=>assert.ok(v,m)).then(()=>console.log('PASS worker registry, versioned save and weekly forecast')).catch(e=>{console.error(e);process.exit(1)});