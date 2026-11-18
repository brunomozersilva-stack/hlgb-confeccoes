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
