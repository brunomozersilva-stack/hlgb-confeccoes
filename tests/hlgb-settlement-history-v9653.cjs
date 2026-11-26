const assert=require('node:assert/strict'),api=require('../hlgb-modules/financeiro/settlement-history-v9653.js');(function test(api,ok){
 const p={id:'p1',manual:true,manualGroupId:'g',factionMasterId:'F1',factionName:'Roseli',value:100,paidAmount:90,status:'Pago',paymentDate:'2026-11-20'},p2={...p,id:'p2',value:50,paidAmount:50},g={id:'g',factionName:'Roseli',date:'2026-11-20',status:'Pago',total:140,rows:[p,p2],receipt:{base64:'private'}},n={key:'projection:1',id:'1',clientKey:'id:C1',client:'João',issued:'2026-11-20',total:10000,paid:5000,credit:1000,balance:4000},payroll={id:'s1',employeeId:'E1',employeeName:'Ana',month:'2026-11',paid:true,paidAt:'2026-11-20',paidValue:2000};
 const c={authenticated:true,factionsAllowed:true,clientsAllowed:true,employeesAllowed:true,payments:[p,p2],manualGroups:[g],notes:[n],payroll:[payroll]},f=(x={},q={})=>api.inspect({...c,...x},q),before=JSON.stringify(c);
 ok(f().total===3,'three sources');ok(f().rows.find(r=>r.kind==='faccao').totalCents===14000,'group net once');ok(f().rows.find(r=>r.kind==='faccao').lines.length===2,'line trace');ok(!JSON.stringify(f()).includes('base64'),'no document bytes');ok(f().rows.find(r=>r.kind==='cliente').balanceCents===4000,'credit');ok(f().rows.find(r=>r.kind==='funcionario').paidCents===200000,'paid payroll');ok(f({authenticated:false}).state==='forbidden','permission');ok(f({employeesAllowed:false}).rows.every(x=>x.kind!=='funcionario'),'redaction');ok(f({manualGroups:[]}).total===2,'missing group');ok(f({payments:[p,p2,p]}).total===2,'duplicate line');ok(f({manualGroups:[{...g,total:150}]}).total===2,'paid mismatch');ok(f({notes:[{...n,clientKey:'name:joao'}]}).total===2,'unlinked name');ok(f({notes:[{...n,mismatch:true}]}).total===2,'note mismatch');ok(f({payroll:[payroll,{...payroll,id:'s2'}]}).total===2,'duplicate competence');ok(f({}, {query:'joao'}).total===1,'accent');ok(f({}, {kind:'faccao',ownerId:'F1'}).total===1,'identity');ok(f({}, {from:'2026-11-21'}).total===0,'date');ok(!f().canWrite&&!f().officialTotals,'read only');ok(JSON.stringify(c)===before,'immutable');

 const enriched={...p,description:'Camisola Rubi',quantity:10,unitPrice:10,manualLineNoteV9566:'Conferido',travetaDiscountTotalV9577:10},enrichedGroup={...g,rows:[enriched,p2],nominal:150};
 const e=f({payments:[enriched,p2],manualGroups:[enrichedGroup]});
 ok(e.rows.find(r=>r.kind==='faccao').details[0].description==='Camisola Rubi','service detail');
 ok(e.rows.find(r=>r.kind==='faccao').details[0].quantity===10&&e.rows.find(r=>r.kind==='faccao').details[0].travetaCents===1000,'quantity and traveta');
 ok(e.rows.find(r=>r.kind==='faccao').netOfAdjustments===true&&e.rows.find(r=>r.kind==='faccao').creditCents===0,'net adjustment not double-counted');
 ok(f({payments:[enriched,{...p2,paidAmount:49}],manualGroups:[enrichedGroup]}).total===2,'reject stale group payment');
 ok(f({}, {kind:'cliente'}).rows[0].dateBasis==='issue'&&f({}, {kind:'funcionario'}).rows[0].dateBasis==='payment','date basis explicit');
 ok(f({}, {status:'open'}).total===1&&f({}, {status:'paid'}).total===2,'status filter');
 ok(f({}, {kind:'cliente',status:'paid'}).totals.balanceCents===null,'empty not zero');
 ok(f({}, {from:'2026-02-30'}).state==='invalid-filter'&&f({}, {from:'2026-11-30',to:'2026-11-01'}).state==='invalid-filter','invalid dates');
 ok(e.totals.count===3&&e.totals.paidCents===219000&&e.totals.balanceCents===4000,'aggregate totals independent pagination');
 ok(f({}, {limit:1}).totals.count===3&&f({}, {limit:1}).rows.length===1,'whole filtered total');
 ok(f({}, {kind:'cliente'}).owners[0].ownerId==='C1'&&f({}, {kind:'cliente'}).ownerGroups.length===1,'owner summary');
 ok(f({payments:[enriched,p2],manualGroups:[enrichedGroup]}, {query:'camisola'}).total===1,'search model');
 ok(f({notes:[{...n,paid:9000,credit:1000,balance:0}]},{status:'compensated'}).total===1,'compensated notes');
 ok(f({payroll:[{...payroll,_deleted:true}]}).total===2,'deleted payroll excluded');
 ok(f({payroll:[{...payroll,paidValue:2000.001}]}).total===2,'fractional cents excluded');
 ok(f({}, {limit:1,export:true}).rows.length===3,'export includes all filtered rows');ok(f({}, {kind:'cliente',export:true}).rows.length===1,'export preserves scope');

 const normal={id:'normal',factionMasterId:'F1',factionName:'Roseli',value:100,paidAmount:70,discountAmount:10,status:'Parcial',scheduledPaymentDate:'2026-11-25',travetaDiscountTotalV9577:5};
 const partial=f({payments:[normal],manualGroups:[]},{kind:'faccao'}),nr=partial.rows[0];
 ok(nr.balanceCents===2000&&nr.creditCents===1000&&nr.paidCents===7000,'partial settlement discount is credit not cash');
 ok(nr.details[0].discountCents===1000&&nr.details[0].travetaCents===500,'separate discount from traveta already in price');
 ok(partial.totals.balanceCents===2000&&nr.dateBasis==='scheduled','partial balance and date basis');
 const closed={...normal,paidAmount:90,status:'Pago',paymentDate:'2026-11-26'};
 ok(f({payments:[closed],manualGroups:[]},{kind:'faccao',status:'compensated'}).rows[0].balanceCents===0,'paid with discount is closed');
 for(const bad of [{...closed,paidAmount:70},{...closed,discountAmount:20},{...closed,discountAmount:'invalid'},{...closed,paymentDate:''},{...normal,status:'Pendente'},{...normal,paidAmount:90}]){const review=f({payments:[bad],manualGroups:[]},{kind:'faccao',status:'review'});ok(review.total===1&&review.rows[0].balanceCents===null&&review.totals.reviewCount===1&&review.totals.paidCents===null,'inconsistent settlement kept for review but excluded from totals')}
 ok(f({payments:[{...normal,paidAmount:0,discountAmount:undefined,status:'Pendente'}],manualGroups:[]},{kind:'faccao'}).rows[0].balanceCents===10000,'legacy absent discount is zero');
 const note={...n,paid:5000,credit:1000,balance:4000,number:'NF 100'},record={id:'1',clientId:'C1',paymentHistory:[{id:'a',date:'2026-11-21',value:30,method:'PIX'},{id:'b',date:'2026-11-22',value:20,method:'Abatimento matéria-prima',tradeSettlementId:'trade-1'}],acertoReturnsV9565:[{id:'r1',date:'2026-11-23',value:10,reason:'Devolução'},{id:'r2',date:'2026-11-22',value:5,reversedAt:'2026-11-23T12:00:00Z'}]},ctx={authenticated:true,clientsAllowed:true,notes:[note],noteSources:[{key:note.key,record}]},eventBefore=JSON.stringify(ctx);
 const events=api.noteEvents(ctx);ok(events.eventTotal===4&&events.totals.paymentRecordedCents===3000&&events.totals.materialOffsetCents===2000,'receipt and trade separate');
 ok(events.totals.activeReturnCents===1000&&events.totals.reversedReturnReferenceCents===500,'reversed return separate not credit');
 ok(api.noteEvents(ctx,{from:'2026-11-22',to:'2026-11-22'}).eventTotal===2,'actual event date not invoice date');
 ok(api.noteEvents(ctx,{eventType:'payment-recorded'}).eventTotal===1,'event type filter');
 ok(api.noteEvents(ctx,{query:'nf 100',ownerId:'C1',limit:1}).eventTotal===4,'filter note and owner, totals before page');
 ok(api.noteEvents(ctx,{export:true,limit:1}).events.length===4,'complete export');
 ok(api.noteEvents({...ctx,clientsAllowed:false}).state==='forbidden','event permission');
 ok(api.noteEvents({...ctx,noteSources:[]}).eventTotal===0,'missing original note');
 ok(api.noteEvents({...ctx,noteSources:[...ctx.noteSources,...ctx.noteSources]}).eventTotal===0,'ambiguous source');
 ok(api.noteEvents({...ctx,noteSources:[{key:note.key,record:{...record,paymentHistory:[]}}]}).eventTotal===0,'scalar balance not dated history');
 ok(api.noteEvents({...ctx,noteSources:[{key:note.key,record:{...record,paymentHistory:[...record.paymentHistory,record.paymentHistory[0]]}}]}).eventTotal===0,'duplicate payment event');
 ok(api.noteEvents({...ctx,noteSources:[{key:note.key,record:{...record,acertoReturnsV9565:[{...record.acertoReturnsV9565[0],reversedAt:'2026-11-01'}]}}]}).eventTotal===0,'invalid return reversal');
 ok(api.noteEvents(ctx,{from:'2026-11-30'}).totals.paymentRecordedCents===null,'no event not zero');
 ok(api.noteEvents({...ctx,noteSources:[{key:note.key,record:{...record,clientId:'other'}}]}).eventTotal===0,'source owner mismatch');
 ok(api.noteEvents({...ctx,noteSources:[{key:note.key,record:{...record,id:'other'}}]}).eventTotal===0,'source identity mismatch');
 ok(JSON.stringify(ctx)===eventBefore,'events immutable');
 const normalEvent={id:'f1',factionMasterId:'F1',factionName:'Roseli',description:'Camisola',value:100,paidAmount:70,discountAmount:10,status:'Parcial',scheduledPaymentDate:'2026-11-30',paymentHistory:[{id:'a',date:'2026-11-21',paid:30,discount:0},{id:'b',date:'2026-11-24',paid:40,discount:10}]};
 const fc={authenticated:true,factionsAllowed:true,payments:[normalEvent]},fb=JSON.stringify(fc);
 const fe=api.factionEvents(fc);ok(fe.eventTotal===3&&fe.totals.factionPaidCents===7000&&fe.totals.factionDiscountCents===1000,'separate cash and discount');
 ok(api.factionEvents(fc,{from:'2026-11-24',to:'2026-11-24'}).totals.factionPaidCents===4000,'actual event date');
 ok(api.factionEvents(fc,{eventType:'faction-discount'}).eventTotal===1,'discount filter');
 ok(api.factionEvents(fc,{from:'2026-11-30'}).eventTotal===0,'no invented scheduled event');
 for(const bad of [{...normalEvent,paymentHistory:[]},{...normalEvent,paymentHistory:[...normalEvent.paymentHistory,normalEvent.paymentHistory[0]]},{...normalEvent,paidAmount:90},{...normalEvent,manual:true},{...normalEvent,factionMasterId:''}]){const x=api.factionEvents({...fc,payments:[bad]});ok(x.eventTotal===0&&x.issues.length,'missing or inconsistent evidence excluded')}
 ok(api.factionEvents({...fc,payments:[normalEvent,normalEvent]}).eventTotal===0,'duplicate payment ID');
 ok(api.factionEvents({...fc,factionsAllowed:false}).state==='forbidden'&&JSON.stringify(fc)===fb,'scope and immutability');
 const gid='group-test',hId=(()=>{let n=0;for(const ch of gid)n=(n*31+ch.charCodeAt(0))%9999999999999;return 300000000000000+n})();
 const m=(id,amount,value)=>({id,manual:true,manualGroupId:gid,factionMasterId:'F1',factionName:'Roseli',status:'Pago',value,paidAmount:amount,discountAmount:5,paymentDate:'2026-11-25',paymentMethod:'Pix',paymentHistory:[{id:'manual-paid-'+gid,date:'2026-11-25',amount,method:'Pix',source:'manual-payment-v9588'}]});
 const ma=m('m1',20,30),mb=m('m2',40,40),mg={id:gid,status:'Pago',dateEvidence:'consistent',paidDate:'2026-11-25',total:60,rows:[ma,mb]},hub={id:hId,sourceId:gid,sourceType:'faction_manual_payment',flow:'Saída',status:'Realizado',value:60,date:'2026-11-25',paymentMethod:'Pix',person:'Roseli'};
 const ac={...fc,payments:[normalEvent,ma,mb],manualHubAllowed:true,manualGroups:[mg],manualHub:[hub]},acBefore=JSON.stringify(ac);
 const av=api.factionEvents(ac);ok(av.eventTotal===4&&av.totals.factionPaidCents===13000&&av.totals.factionDiscountCents===1000,'one group outflow, do not count traveta twice');
 ok(api.factionEvents(ac,{from:'2026-11-25',to:'2026-11-25'}).totals.factionPaidCents===6000,'actual manual date');
 for(const bad of [{manualHubAllowed:false},{manualHub:[]},{manualHub:[hub,hub]},{manualHub:[{...hub,value:70}]},{manualHub:[{...hub,person:'Vanessa'}]},{manualHub:[{...hub,id:1}]},{manualGroups:[mg,mg]},{manualGroups:[{...mg,dateEvidence:'review'}]},{payments:[normalEvent,ma,{...mb,paymentHistory:[]}]}]){const r=api.factionEvents({...ac,...bad});ok(r.eventTotal===3&&r.totals.factionPaidCents===7000&&r.issues.some(x=>x.includes('avulso-sem-prova')),'unproven manual group excluded')}
 ok(JSON.stringify(ac)===acBefore,'manual evidence read-only');
})(api,(v,m)=>assert.ok(v,m));console.log('PASS settlement history');