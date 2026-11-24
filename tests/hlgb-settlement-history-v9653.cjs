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
})(api,(v,m)=>assert.ok(v,m));console.log('PASS settlement history');