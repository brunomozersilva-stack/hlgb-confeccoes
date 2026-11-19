'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const core=require('../operacao-integrada-core.js'),routes=require('../modulos/rotas-utilidades-v1.js');
const root=path.resolve(__dirname,'..'),ui=fs.readFileSync(path.join(root,'operacao-integrada-ui.js'),'utf8'),
page=fs.readFileSync(path.join(root,'operacao-integrada.html'),'utf8');
function fixture(){
 let s=core.initial(),index=0;
 const run=(type,payload)=>{const result=core.apply(s,{type,payload,actor:'QA rotas fictícias',
  commandId:'ROUTE-QA-'+(++index),expectedRevision:s.revision});
  s=result.state;assert.ok(core.inspect(s).ok,'integridade de '+type);return result.result;};
 return {run,get s(){return s}};
}
function stop(factionId='FAC-0001'){
 return {type:'faccao',locationId:factionId,
  carry:['Pedido DEMO-123 · Camisola Melina · 40 peças'],
  pickup:['Robe fictício · 10 peças'],notes:'Conferir no balcão'};
}
function plan(){return {date:'2026-11-22',driver:'Pessoa fictícia A',status:'planejada',
 notes:'Ordem definida antes da saída',stops:[stop(),
  {type:'confeccao',locationId:'HLGB-LAB',carry:['Fichas fictícias'],
   pickup:['Pacotes fictícios'],notes:'Recepção'}]};}
test('Rotas LEVAR/BUSCAR: múltiplas paradas, ordem estável e reedição auditável',()=>{
 const ctx=fixture(),id=ctx.run('route.plan',plan()).split(' · ')[0];
 assert.equal(id,'ROT-0001');
 let row=ctx.s.routePlans[0];
 assert.deepEqual(row.stops.map(x=>x.order),[1,2]);
 assert.equal(row.stops[0].name,'Oficina Exemplo A');
 assert.equal(row.stops[1].name,'HLGB Confecções — laboratório');
 assert.equal(row.stops[0].carry.length,1);assert.equal(row.stops[0].pickup.length,1);
 assert.equal(ctx.s.stockLedger.length,0);assert.equal(ctx.s.finance.length,0);
 const old=JSON.stringify(row.stops),revision=ctx.s.revision;
 const revisionInput={...plan(),id,reason:'Reorganização fictícia de entregas',
  stops:[{...stop('FAC-0002'),carry:['Novo pacote']},stop('FAC-0001')]};
 ctx.run('route.revise',revisionInput);
 row=ctx.s.routePlans[0];
 assert.equal(row.stops[0].locationId,'FAC-0002');
 assert.equal(row.stops[1].locationId,'FAC-0001');
 assert.deepEqual(row.stops.map(x=>x.order),[1,2]);
 assert.equal(row.history.length,2);
 assert.equal(JSON.stringify(row.history[1].before.stops),old);
 assert.ok(row.history[1].revision>revision);
 assert.equal(ctx.s.stockLedger.length,0);assert.equal(ctx.s.finance.length,0);
 ctx.run('route.cancel',{id,reason:'Visita cancelada no laboratório'});
 assert.equal(ctx.s.routePlans[0].status,'cancelada');
 assert.equal(ctx.s.routePlans[0].history.length,3);
 assert.equal(ctx.s.routePlans[0].stops.length,2);
 assert.throws(()=>core.apply(ctx.s,{type:'route.revise',payload:revisionInput,
  commandId:'ROUTE-REOPEN',expectedRevision:ctx.s.revision,actor:'QA'}),/cancelada/);
});
test('Nunca escolher primeira facção automaticamente e não aceitar paradas inválidas',()=>{
 const ctx=fixture(),initial=JSON.stringify(ctx.s),p=plan();
 const invalid=[
  {...p,stops:[{...stop(),locationId:''}]},
  {...p,stops:[{...stop(),locationId:'FAC-INEXISTENTE'}]},
  {...p,stops:[{...stop(),carry:[],pickup:[]}]},
  {...p,stops:[{...stop(),carry:['Duplicado','duplicado']}]},
  {...p,stops:[{...stop(),type:'confeccao',locationId:'FAC-0001'}]},
  {...p,stops:[]},
  {...p,date:'2026-02-30'},
  {...p,driver:' '},
  {...p,status:'estado_invalido'}
 ];
 for(let i=0;i<invalid.length;i++){
  assert.throws(()=>core.apply(ctx.s,{type:'route.plan',payload:invalid[i],commandId:'BAD-'+i,
   expectedRevision:ctx.s.revision,actor:'QA'}));
  assert.equal(JSON.stringify(ctx.s),initial,'erro não pode alterar o documento');
 }
 assert.match(ui,/Escolha a facção ou confecção — obrigatório/);
 assert.match(ui,/data-route-loc/);
 assert.match(ui,/if\(!raw\)throw Error/);
});
test('Auditor detecta modificação de rota sem origem, preserva IDs exclusivos e bloqueia repetição',()=>{
 const ctx=fixture(),id=ctx.run('route.plan',plan()).split(' · ')[0];
 const bad=JSON.parse(JSON.stringify(ctx.s));bad.routePlans[0].lastCommandId='FALSO';
 assert.equal(core.inspect(bad).ok,false);
 const altered=JSON.parse(JSON.stringify(ctx.s));altered.routePlans[0].stops[0].locationId='FAC-INVENTADA';
 assert.equal(core.inspect(altered).ok,false);
 assert.throws(()=>core.apply(ctx.s,{type:'route.plan',payload:plan(),commandId:'ROUTE-QA-1',
  expectedRevision:ctx.s.revision,actor:'QA'}),/Comando já registrado/);
 assert.equal(routes.rows(ctx.s)[0].id,id);
});
test('Utilidades tem seu próprio módulo, tela, impressão e permanece sem acesso à rede',()=>{
 assert.doesNotThrow(()=>new vm.Script(ui));
 assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(root,'modulos/rotas-utilidades-v1.js'),'utf8')));
 assert.match(page,/rotas-utilidades-v1\.js/);
 assert.match(ui,/case 'utilidades':return routePanel/);
 assert.match(ui,/renderRouteSheet/);
 assert.match(ui,/mc-route-page/);
 assert.match(ui,/data-print-route/);
 assert.match(ui,/route\.plan/);
 assert.match(ui,/route\.revise/);
 assert.match(ui,/route\.cancel/);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'modulos/rotas-utilidades-v1.js'),'utf8'),
  /\bfetch\s*\(|\bWebSocket\b|\bXMLHttpRequest\b|\bsupabase\b/i);
});

test('Rota com histórico preserva integridade depois de JSONB e não perde verificação de alterações',()=>{
 const ctx=fixture(),id=ctx.run('route.plan',plan()).split(' · ')[0];
 ctx.run('route.revise',{...plan(),id,reason:'Revisão por conferência',
  stops:[stop('FAC-0002'),stop('FAC-0001')]});
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?
  Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const after=stable(JSON.parse(JSON.stringify(ctx.s)));
 assert.equal(core.inspect(after).ok,true);
 const tampered=structuredClone(after);tampered.routePlans[0].stops[0].carry.push('Peças adicionadas por fora');
 assert.equal(core.inspect(tampered).ok,false);
});
