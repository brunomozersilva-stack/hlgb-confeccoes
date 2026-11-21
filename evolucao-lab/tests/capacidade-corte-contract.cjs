'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const engine=require('../modulos/capacidade-corte-v1.js');
const plan=(id,qty,date='2026-11-26',team=['Alice','Bia','Cleo'],status='aberto')=>({
 id,orderId:'PDM-1',itemId:'ITM-1',scheduledDate:date,priority:'normal',
 cutterOne:team[0],cutterTwo:team[1],spreader:team[2],status,qty,
 lines:[{color:'Preto',size:'G2',qty}]
});
const state=(...plans)=>({revision:9,multiCutPlans:plans,stockLedger:[],finance:[],log:[]});
test('nao infere capacidade e nao altera registros',()=>{
 const s=state(plan('A',70));const before=JSON.stringify(s),r=engine.evaluate(s);
 assert.equal(r.capacityConfirmed,false);assert.equal(r.days[0].capacityStatus,'nao_informada');
 assert.equal(r.canApproveSchedule,false);assert.equal(JSON.stringify(s),before);
 assert.equal(r.autoRescheduled,false);assert.equal(r.dataWritten,false);
});
test('sinaliza sobrecarga diaria mesmo com equipes distintas',()=>{
 const s=state(plan('A',70),plan('B',50,'2026-11-26',['Dora','Eva','Fabi']));
 const r=engine.evaluate(s,{dailyCapacityPieces:100});
 assert.equal(r.days[0].plannedPieces,120);assert.equal(r.days[0].excessPieces,20);
 assert.equal(r.overloadedDays,1);assert.equal(r.resourceConflicts.length,0);
 assert.equal(r.canApproveSchedule,false);
});
test('detecta recurso repetido em papeis diferentes no mesmo dia',()=>{
 const s=state(plan('A',35),plan('B',30,'2026-11-26',['Dora','Eva','ALICE']));
 const r=engine.evaluate(s,{dailyCapacityPieces:100});
 assert.equal(r.overloadedDays,0);assert.equal(r.resourceConflicts.length,1);
 assert.deepEqual(r.conflictingPlans,['A','B']);assert.equal(r.canApproveSchedule,false);
});
test('nao contabiliza cancelado ou concluido na carga futura',()=>{
 const s=state(plan('A',40),plan('B',200,'2026-11-26',['Alice','Bia','Cleo'],'cancelado'),
 plan('C',200,'2026-11-26',['Alice','Bia','Cleo'],'concluido'));
 const r=engine.evaluate(s,{dailyCapacityPieces:50});
 assert.equal(r.days[0].plannedPieces,40);assert.equal(r.resourceConflicts.length,0);
 assert.equal(r.canApproveSchedule,true);
});
test('preserva tamanhos extras e recusa duplicidades internas',()=>{
 const s=state(plan('A',20,'2026-11-26',['Alice','alice','Cleo']));
 assert.throws(()=>engine.evaluate(s,{dailyCapacityPieces:50}),/repetida/);
});
test('sem alterar estado em quantidade, dia ou capacidade invalidos',()=>{
 const s=state(plan('A',30)),before=JSON.stringify(s);
 assert.throws(()=>engine.evaluate(s,{dailyCapacityPieces:0}),/Capacidade/);
 const bad=state(plan('B',30,'2026-11-31'));
 assert.throws(()=>engine.evaluate(bad),/Data/);
 const badqty=state({...plan('B',30),qty:40});
 assert.throws(()=>engine.evaluate(badqty),/Quantidade/);
 assert.equal(JSON.stringify(s),before);
});

test('tela modular carrega motor, mostra capacidade e nao programa sozinha',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const base=path.resolve(__dirname,'..');
 const ui=fs.readFileSync(path.join(base,'operacao-integrada-ui.js'),'utf8');
 const html=fs.readFileSync(path.join(base,'operacao-integrada.html'),'utf8');
 assert.doesNotThrow(()=>new (require('node:vm').Script)(ui));
 assert.match(ui,/function cutCapacityPanel\(s\)/);
 assert.match(ui,/id="cut-capacity-run"/);
 assert.match(ui,/return flowQuickPanel\(s,'corte'\)\+multiCutPanel\(s\)\+cutCapacityPanel\(s\)/);
 assert.match(ui,/function flowQuickPanel\(s,area\)/);
 assert.match(html,/modulos\/capacidade-corte-v1\.js/);
});
