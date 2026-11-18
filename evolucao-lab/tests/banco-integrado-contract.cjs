'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),db=require('../banco-integrado/persistencia.cjs');
const A='Operador A fictício',B='Operador B fictício';
const cmd=(id,type,expectedRevision,payload)=>({commandId:'LAB-'+id,type,expectedRevision,payload});
test('banco integral: pedido, concorrência, corte, acerto, financeiro e releitura',async()=>{
 await db.initialize();let s=await db.state();assert.equal(s.revision,1);
 const order=cmd('order-0001','order.add',1,{clientId:'CLI-0001',productId:'PRO-0001',grade:{P:10,M:0,G:0,GG:0}});
 const results=await Promise.all([db.commit(order,A),db.commit(cmd('order-0002','order.add',1,order.payload),B)]);
 assert.equal(results.filter(x=>x.status==='committed').length,1);assert.equal(results.filter(x=>x.status==='conflict').length,1);
 s=await db.state();assert.equal(s.orders.length,1);assert.equal(s.finance.length,1);assert.equal(s.revision,2);
 const winner=results.find(x=>x.status==='committed'),won=winner.commandId===order.commandId?order:cmd('order-0002','order.add',1,order.payload),actor=winner.commandId===order.commandId?A:B;
 assert.equal((await db.commit(won,actor)).status,'already_committed');assert.equal((await db.commit(won,actor===A?B:A)).status,'rejected');
 assert.equal((await db.commit({...won,payload:{...won.payload,grade:{P:11,M:0,G:0,GG:0}}},actor)).status,'rejected');
 assert.equal((await db.readback(won.commandId)).status,'readback_confirmed');
 const id=s.orders[0].id;
 const cut=cmd('cut-0001','cut.record',2,{orderId:id,size:'P',qty:10});assert.equal((await db.commit(cut,A)).status,'committed');
 assert.equal((await db.commit(cmd('bad-cut-001','cut.record',3,{orderId:id,size:'P',qty:1}),B)).status,'rejected');
 assert.equal((await db.state()).revision,3);
 assert.equal((await db.commit(cmd('alloc-0001','faction.allocate',3,{orderId:id,factionId:'FAC-0001',qty:10}),B)).status,'committed');
 assert.equal((await db.commit(cmd('return-001','faction.return',4,{orderId:id,qty:10}),A)).status,'committed');
 s=await db.state();assert.equal(s.settlements.length,1);assert.equal(s.finance.length,2);assert.equal(s.stockLedger.length,1);
 const title=s.finance.find(x=>x.kind==='pagar'),pay=cmd('pay-0001','finance.pay',5,{id:title.id,paidDate:'2026-11-17'});
 assert.equal((await db.commit(pay,A)).status,'committed');assert.equal((await db.commit(pay,A)).status,'already_committed');
 assert.equal((await db.readback(pay.commandId)).status,'readback_confirmed');
 s=await db.state();assert.equal(s.finance.find(x=>x.id===title.id).status,'pago');assert.equal(s.revision,6);assert.equal(s.log.length,5);
 assert.equal((await db.readback('LAB-never-0001')).status,'not_found');assert.equal((await db.readback(won.commandId)).latestRevision,6);
});
test('guardião recusa banco remoto, fingerprint estável e ator não autorizado',()=>{assert.throws(()=>db.guard({PGDATABASE:'postgres',PGHOST:'127.0.0.1'}));const c=cmd('test-0001','order.add',1,{a:1,b:2});assert.equal(db.validate(c,A),db.validate({...c,payload:{b:2,a:1}},A));assert.throws(()=>db.validate(c,'Administrador'));});

test('cancelamento serializado impede commit atrasado com mesmo ID',async()=>{const s=await db.state(),c=cmd('cancel-0001','order.add',s.revision,{clientId:'CLI-0001',productId:'PRO-0001',grade:{P:1,M:0,G:0,GG:0}});assert.equal((await db.cancel(c,A)).status,'cancelled');assert.equal((await db.readback(c.commandId)).status,'cancelled');assert.equal((await db.commit(c,A)).status,'rejected');assert.equal((await db.state()).revision,s.revision);});

test('cadeia remota rejeita lacunas, revisões repetidas ou atores inesperados',()=>{const first={revision:2,commandId:'LAB-AAAA',actor:A,type:'order.add'},good={revision:2,revisionProof:first.commandId,log:[first]};assert.equal(db.verifyChain(good),true);assert.equal(db.verifyChain({...good,revision:3}),false);assert.equal(db.verifyChain({...good,log:[{...first,actor:'Admin'}]}),false);assert.equal(db.verifyChain({...good,revision:3,log:[first,{...first,revision:3}]}),false);});
test('consulta de revisão não muda o documento nem gera evento',async()=>{const before=await db.state();assert.equal(await db.revision(),before.revision);assert.deepEqual(await db.state(),before);});

test('prova autenticada rejeita conteúdo alterado e outro ator',async()=>{
 const s=await db.state(),e=s.log.find(x=>x.type==='order.add'),p={clientId:'CLI-0001',productId:'PRO-0001',grade:{P:10,M:0,G:0,GG:0}},request={commandId:e.commandId,type:e.type,expectedRevision:e.revision-1,payload:p};
 assert.equal((await db.readback(request.commandId,request,e.actor)).status,'readback_confirmed');
 assert.equal((await db.readback(request.commandId,{...request,payload:{...p,grade:{P:11,M:0,G:0,GG:0}}},e.actor)).status,'rejected');
 assert.equal((await db.readback(request.commandId,request,e.actor===A?B:A)).status,'rejected');
});
test('trilha verifica conteúdo de evento e não apenas revisão',()=>{
 const e={commandId:'LAB-AAAA',revision:2,actor:A,type:'order.add',description:'PED-0001'},current={log:[e]},row={command_id:e.commandId,revision:2,expected_revision:1,actor:A,kind:e.type,result:e.description,fingerprint:'a'.repeat(64),event:e};
 assert.equal(db.ledgerMatches(current,[row]),true);assert.equal(db.ledgerMatches(current,[]),false);assert.equal(db.ledgerMatches(current,[{...row,event:{...e,description:'Outro'}}]),false);
});
test('papel de serviço sem poderes de administrador, DDL ou exclusão de histórico',async()=>{
 const {Client}=require('pg'),c=new Client();await c.connect();try{
 const r=(await c.query("SELECT rolsuper,rolbypassrls,rolcreaterole,rolcreatedb FROM pg_roles WHERE rolname=current_user")).rows[0];assert.deepEqual(r,{rolsuper:false,rolbypassrls:false,rolcreaterole:false,rolcreatedb:false});
 const p=(await c.query("SELECT has_table_privilege(current_user,'hlgb_integrado_lab.events','DELETE') AS del,has_table_privilege(current_user,'hlgb_integrado_lab.commands','UPDATE') AS upd,has_schema_privilege(current_user,'hlgb_integrado_lab','CREATE') AS ddl")).rows[0];assert.deepEqual(p,{del:false,upd:false,ddl:false});
 await assert.rejects(()=>c.query("DELETE FROM hlgb_integrado_lab.events WHERE false"),/permission denied/);
 }finally{await c.end();}
});

const permissions=require('../banco-integrado/permissoes-lab.cjs');
test('política de escrita fictícia recusa novos comandos fora da lista e o financeiro para operador de produção',()=>{
 assert.equal(permissions.can(B,'order.add'),true);assert.equal(permissions.can(B,'faction.allocate'),true);
 for(const t of ['finance.pay','finance.add','finance.revise','payroll.period.create','payroll.update','settlement.service.group','finance.faction.close','unknown.new','demo.reset'])assert.equal(permissions.can(B,t),false,t);
 assert.equal(permissions.can(A,'finance.pay'),true);assert.equal(permissions.can('Inválido','order.add'),false);
 assert.deepEqual(new Set(permissions.publicProfile(B).allowedCommands).size,permissions.publicProfile(B).allowedCommands.length);
 assert.equal(permissions.publicProfile(B).readScope,'production_only_ficticio');
 assert.equal(permissions.publicProfile(A).readScope,'full_snapshot_ficticio');
});
test('autorização de servidor impede alteração financeira com revisão válida, sem criar evento nem título',async()=>{
 const before=await db.state(),forbidden=cmd('deny-finance-0001','finance.add',before.revision,{kind:'pagar',description:'NÃO INSERIR',amountCents:10000,category:'Aluguel'});
 const response=await db.commit(forbidden,B);assert.equal(response.status,'rejected');assert.match(response.message,/não permitido/);
 const after=await db.state();assert.deepEqual(after,before);
 assert.equal((await db.readback(forbidden.commandId,forbidden,B)).status,'rejected');
});

const localSeed=require('../banco-integrado/preparar-ci.cjs');
test('preparo de banco recusa execução fora de ambiente CI, em Supabase e com usuário runtime',()=>{
 const fixture={CI:'true',GITHUB_ACTIONS:'true',PGHOST:'127.0.0.1',PGDATABASE:'hlgb_integrado_lab',PGPORT:'5432',PGUSER:'postgres',PGPASSWORD:'somente_ci_ficticio_integrado'};
 assert.doesNotThrow(()=>localSeed.guard(fixture));
 for(const change of [{CI:'false'},{PGHOST:'db.example.com'},{PGDATABASE:'postgres'},{PGUSER:'hlgb_lab_runner'},{PGPASSWORD:'wrong'}])assert.throws(()=>localSeed.guard({...fixture,...change}),/proibida/);
 assert.match(localSeed.schema(),/CREATE SCHEMA hlgb_integrado_lab/);
 assert.doesNotMatch(localSeed.schema(),/^\\set /m);
});

const productionView=require('../banco-integrado/leitura-producao.cjs');
test('leitura de produção exclui salários, Folha, títulos, preços e trilha integral por lista positiva',async()=>{
 const full=await db.state();
 const source=structuredClone(full);
 // Injetar dados que jamais podem atravessar a fronteira de leitura.
 source.employees.push({id:'FUN-SECRET',name:'SEGREDO-FOLHA-X9',salaryCents:9999999});
 source.finance.push({id:'FIN-SECRET',kind:'pagar',description:'SEGREDO-FINANCEIRO-X9',amountCents:9999999});
 source.products[0].priceCents=9999999;
 source.factions[0].unitCents=9999999;
 source.log.push({commandId:'LAB-PRIVATE',description:'SEGREDO-AUDITORIA-X9'});
 const limited=productionView.project(source,B);
 assert.equal(limited.schema,'hlgb-evolucao-operacao-producao-ficticia-v1');
 assert.equal(limited.revision,full.revision);
 assert.deepEqual(Object.keys(limited).sort(),['schema','readScope','revision','clients','products','factions','orders','cutPlans','factionAssignments'].sort());
 assert.equal(Array.isArray(limited.factionAssignments),true);
 assert.equal(limited.factionAssignments.length,full.factionAssignments.length);
 for(const assignment of limited.factionAssignments)
  assert.deepEqual(Object.keys(assignment).sort(),['id','orderId','factionId','qtySent','qtyReturned'].sort(),
   'Envio expõe somente saldos e IDs operacionais de facções');
 assert.deepEqual(Object.keys(limited.products[0]).sort(),['id','sku','name'].sort());
 assert.deepEqual(Object.keys(limited.factions[0]).sort(),['id','name'].sort());
 assert.equal(limited.orders.length,full.orders.length);
 for(const term of ['SEGREDO-FOLHA-X9','SEGREDO-FINANCEIRO-X9','SEGREDO-AUDITORIA-X9','9999999','salaryCents','amountCents','paymentBatches'])
  assert.equal(JSON.stringify(limited).includes(term),false,'Não pode vazar '+term);
 assert.throws(()=>productionView.project(source,A),/autorização/);
 assert.throws(()=>productionView.project({...source,orders:null},B),/Lista operacional/);
});

test('operador de produção não cancela comandos financeiros nem consulta suas provas',async()=>{
 const before=await db.state();
 const forbidden=cmd('deny-cancel-fin-0001','finance.add',before.revision,{kind:'pagar',description:'somente laboratório',amountCents:1200,category:'Outros'});
 assert.equal((await db.cancel(forbidden,B)).status,'rejected');
 assert.equal((await db.readback(forbidden.commandId,forbidden,B)).status,'rejected');
 assert.equal((await db.readback(forbidden.commandId,forbidden,A)).status,'not_found');
 assert.deepEqual(await db.state(),before);
});

const identities=require('../banco-integrado/identidades-lab.cjs');
const C='Operador C fictício';
test('identidades fictícias distinguem funcionário e permissão antes da transação',async()=>{
 const employee=identities.authenticate('C','demo-integrado-c');
 assert.equal(employee.actor,C);assert.equal(employee.employeeId,'LAB-FUN-003');
 assert.equal(identities.authenticate('C','pin-invalido'),null);
 assert.equal(identities.authenticate('__proto__','demo-integrado-c'),null);
 assert.equal(identities.authenticate('C','x'.repeat(129)),null);
 assert.equal(permissions.can(C,'cut.record'),true);
 for(const type of ['order.add','finance.pay','faction.allocate','payroll.update','client.add','audit.review'])assert.equal(permissions.can(C,type),false,type);
 assert.equal(permissions.publicProfile(C).readScope,'production_cut_only_ficticio');
 assert.equal(permissions.publicProfile(C).employeeId,'LAB-FUN-003');
 assert.equal(db.validate(cmd('cutter-0001','cut.record',4,{orderId:'PED-0001',size:'P',qty:1}),C).length,64);
 const s=await db.state(),invalid=cmd('denied-cutter-order','order.add',s.revision,{clientId:'CLI-0001',productId:'PRO-0001',grade:{P:1,M:0,G:0,GG:0}});
 assert.equal((await db.commit(invalid,C)).status,'rejected');
 assert.equal((await db.cancel(invalid,C)).status,'rejected');
 assert.equal((await db.readback(invalid.commandId,invalid,C)).status,'rejected');
 assert.deepEqual(await db.state(),s);
});
test('visão de corte entrega apenas pedido, modelo e grade, sem clientes nem facções',async()=>{
 const before=await db.state();
 const v=productionView.project(before,C);
 assert.equal(v.readScope,'production_cut_only_ficticio');
 assert.deepEqual(Object.keys(v).sort(),['schema','readScope','revision','products','orders','cutPlans'].sort());
 if(v.orders.length)assert.deepEqual(Object.keys(v.orders[0]).sort(),['id','productId','grade','cut'].sort());
 for(const key of ['clients','factions','employees','finance','settlements','log'])assert.equal(Object.hasOwn(v,key),false);
});

test('desativação de funcionário no banco bloqueia gravações e registra trilha imutável',async()=>{
 const C='Operador C fictício',employeeId='LAB-FUN-003';
 assert.equal(await db.activeEmployee(employeeId,C),true);
 assert.equal((await db.deactivateEmployee(employeeId,C)).status,'denied');
 assert.equal((await db.deactivateEmployee('LAB-FUN-001',A)).status,'denied');
 const before=await db.state();
 assert.equal((await db.deactivateEmployee(employeeId,A)).status,'disabled');
 assert.equal((await db.deactivateEmployee(employeeId,A)).status,'already_disabled');
 assert.equal(await db.activeEmployee(employeeId,C),false);
 assert.equal(await db.activeEmployee('LAB-FUN-002',B),true);
 const forbidden=cmd('after-revoke-cut-0001','cut.record',before.revision,{orderId:before.orders[0].id,size:'P',qty:1});
 assert.equal((await db.commit(forbidden,C)).status,'rejected');
 assert.equal((await db.cancel(forbidden,C)).status,'rejected');
 assert.equal((await db.readback(forbidden.commandId,forbidden,C)).status,'rejected');
 assert.deepEqual(await db.state(),before);
 const {Client}=require('pg'),client=new Client();await client.connect();
 try{
  const events=(await client.query("SELECT target_employee_id,admin_actor,operation FROM hlgb_integrado_lab.lab_access_events WHERE target_employee_id=$1",[employeeId])).rows;
  assert.deepEqual(events,[{target_employee_id:employeeId,admin_actor:A,operation:'deactivate'}]);
  await assert.rejects(()=>client.query('DELETE FROM hlgb_integrado_lab.lab_access_events WHERE false'),/permission denied/);
 }finally{await client.end();}
});

test('rate limit persistente e auditoria dos PINs fictícios sem gravar senha',async()=>{
 // Executar por último: bloqueia novas tentativas do perfil B somente neste banco descartável.
 const code='B',validPin='demo-integrado-b';
 assert.equal((await db.authenticateDemo(code,validPin)).status,'ok');
 const failures=await Promise.all(Array.from({length:5},()=>db.authenticateDemo(code,'pin-errado-demonstrativo')));
 assert.equal(failures.filter(x=>x.status==='rejected').length,5,'A mesma conta sofre 5 falhas serializadas');
 assert.equal((await db.authenticateDemo(code,validPin)).status,'locked','Senha correta não ignora bloqueio');
 assert.equal((await db.authenticateDemo('A','demo-integrado-a')).status,'ok','Bloqueio de B não bloqueia A');
 assert.equal((await db.authenticateDemo('C','demo-integrado-c')).status,'inactive','Conta já desativada não reabre por senha');
 assert.equal((await db.authenticateDemo('desconhecido','invalido')).status,'rejected','Códigos desconhecidos ficam em uma única faixa');
 const events=await db.listLoginEvents(A);
 assert.equal(Array.isArray(events),true);
 assert.equal(events[0].code,'unknown');
 assert.equal(events.filter(x=>x.code==='B'&&x.outcome==='invalid').length,5);
 assert.equal(events.some(x=>x.code==='B'&&x.outcome==='locked'),true);
 assert.equal(events.some(x=>x.code==='C'&&x.outcome==='inactive'),true);
 const dump=JSON.stringify(events);
 assert.equal(dump.includes('demo-integrado'),false);
 assert.equal(dump.includes('pin-errado'),false);
 assert.equal(await db.listLoginEvents(B),null);
 const {Client}=require('pg'),c=new Client();await c.connect();
 try{
  const entry=(await c.query("SELECT code,failed_count,locked_until>clock_timestamp() AS locked FROM hlgb_integrado_lab.lab_login_attempts WHERE code='B'")).rows[0];
  assert.equal(entry.failed_count,5);assert.equal(entry.locked,true);
  await assert.rejects(()=>c.query('DELETE FROM hlgb_integrado_lab.lab_login_events WHERE false'),/permission denied/);
 }finally{await c.end();}
});

test('bloqueio de login é compartilhado por dois servidores locais no mesmo Postgres',async()=>{
 const {start}=require('../banco-integrado/servidor.cjs');
 const first=await start(),second=await start();
 const firstUrl='http://127.0.0.1:'+first.address().port,secondUrl='http://127.0.0.1:'+second.address().port;
 async function loginAttempt(base,code,pin){
  const page=await fetch(base+'/login',{redirect:'manual'});
  assert.equal(page.status,200);
  const cookie=page.headers.get('set-cookie')?.split(';')[0];
  const html=await page.text(),csrf=html.match(/name="csrf" value="([^"]+)"/)?.[1];
  assert.equal(typeof csrf,'string');
  const response=await fetch(base+'/login',{
   method:'POST',redirect:'manual',headers:{'content-type':'application/x-www-form-urlencoded',cookie},
   body:new URLSearchParams({actor:code,csrf,pin})
  });
  return response.status;
 }
 try{
  for(let i=0;i<5;i++)assert.equal(await loginAttempt(firstUrl,'A','pin-incorreto-'+i),401);
  assert.equal(await loginAttempt(secondUrl,'A','demo-integrado-a'),429,'O outro servidor deve respeitar o bloqueio persistido');
  const events=await db.listLoginEvents(A);
  assert.equal(events.filter(e=>e.code==='A'&&e.outcome==='invalid').length,5);
  assert.equal(events.some(e=>e.code==='A'&&e.outcome==='locked'),true);
 }finally{
  await new Promise(resolve=>first.close(resolve));
  await new Promise(resolve=>second.close(resolve));
 }
});
