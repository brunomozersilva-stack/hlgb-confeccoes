'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const schedule=require('../modulos/sugestao-programacao-corte-v1.js');
const plan=(id,qty,date='2026-11-20',team=['Alice','Bia','Cleo'],priority='normal',status='aberto')=>({
 id,orderId:'PDM-1',itemId:'ITM-1',scheduledDate:date,priority,status,
 cutterOne:team[0],cutterTwo:team[1],spreader:team[2],qty,
 lines:[{color:'Preto',size:'G2',qty}]
});
const s=(...plans)=>({revision:4,multiCutPlans:plans,finance:[],stockLedger:[],log:[]});
const args={dailyCapacityPieces:100,workingDays:[1,2,3,4,5],horizonDays:10};
test('sugere deslocamento de folha por conflito sem alterar dados',()=>{
 const state=s(plan('A',70),plan('B',40,'2026-11-20',['Alice','Eva','Fabi']));
 const before=JSON.stringify(state),r=schedule.propose(state,args);
 assert.equal(r.proposals.length,2);assert.equal(r.blocked.length,0);
 assert.equal(r.proposals[0].suggestedDate,'2026-11-20');
 assert.equal(r.proposals[1].suggestedDate,'2026-11-23');
 assert.equal(r.changed,1);assert.equal(r.noAutomaticChanges,true);
 assert.equal(r.canApproveProduction,false);assert.equal(JSON.stringify(state),before);
});
test('duas equipes separadas podem trabalhar no mesmo dia respeitando teto',()=>{
 const r=schedule.propose(s(plan('A',40),plan('B',50,'2026-11-20',['Dora','Eva','Fabi'])),args);
 assert.deepEqual(r.proposals.map(p=>p.suggestedDate),['2026-11-20','2026-11-20']);
});
test('prioridade urgente precede normal na mesma data',()=>{
 const r=schedule.propose(s(plan('A',70),plan('B',50,'2026-11-20',['Dora','Eva','Fabi'],'urgente')),args);
 assert.deepEqual(r.proposals.map(x=>x.id),['B','A']);
 assert.equal(r.proposals[1].suggestedDate,'2026-11-23');
});
test('folha maior que capacidade nao e dividida silenciosamente',()=>{
 const r=schedule.propose(s(plan('A',120)),args);
 assert.equal(r.proposals.length,0);assert.equal(r.blocked[0].reason,'folha_maior_que_capacidade_diaria');
});
test('nao presume calendario e nao usa data fora de horizonte',()=>{
 assert.throws(()=>schedule.propose(s(plan('A',30)),{dailyCapacityPieces:100}),/Selecione/);
 const r=schedule.propose(s(plan('A',30,'2026-11-21')),{
  dailyCapacityPieces:100,workingDays:[1,2,3,4,5],horizonDays:2});
 assert.equal(r.blocked[0].reason,'sem_encaixe_no_horizonte');
});
test('concluidos e cancelados nao sao reprogramados',()=>{
 const r=schedule.propose(s(plan('A',80,undefined,undefined,'normal','concluido'),
   plan('B',80,undefined,undefined,'normal','cancelado'),plan('C',20)),args);
 assert.deepEqual(r.proposals.map(x=>x.id),['C']);
});
test('recusa dia e capacidade invalidos',()=>{
 assert.throws(()=>schedule.propose(s(plan('A',20)),{dailyCapacityPieces:0,workingDays:[1]}),/Capacidade/);
 assert.throws(()=>schedule.propose(s(plan('A',20)),{dailyCapacityPieces:100,workingDays:[1,1]}),/Selecione/);
});
