'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Client}=require('pg');
const url=process.env.HLGB_LAB_DATABASE_URL;
if(!/^postgres(?:ql)?:\/\/postgres:/.test(String(url||''))||!String(url).includes('/hlgb_evolucao_lab'))
 throw new Error('Banco não descartável: falta URL explícita hlgb_evolucao_lab com usuário postgres.');
const conf={connectionString:url};
const fixture=fs.readFileSync(path.join(__dirname,'../postgres/02-fixtures-local.sql'),'utf8');
let admin;
async function fresh(){await admin.query(fixture)}
async function query(sql,params=[]){return (await admin.query(sql,params)).rows[0]}
const comp=(id='CMD-C-001',target='AC-101',revision=3,sourceRev=7,amount=300)=>
 ['SELECT evolucao_lab.compensate($1,$2,$3,$4,$5,$6,$7,$8) AS result',
 [id,'FUNCIONARIO-DEMO',target,revision,'AC-099',sourceRev,'CORR-099',amount]];
const pay=(id='CMD-P-001',revision=4,receipt='PDF-NEW')=>
 ['SELECT evolucao_lab.pay($1,$2,$3,$4,$5::date,$6,$7,$8,$9) AS result',
 [id,'FUNCIONARIO-DEMO','AC-101',revision,'2026-11-14','PIX',receipt,
  receipt?'recibo-ficticio.pdf':null,receipt?2048:null]];
async function execute(pair,client=admin){return (await client.query(pair[0],pair[1])).rows[0].result}
test.before(async()=>{
 admin=new Client(conf);await admin.connect();
 const db=await query('SELECT current_database() AS name');
 assert.equal(db.name,'hlgb_evolucao_lab','Nunca executar em produção.');
 await admin.query("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='hlgb_lab_probe') THEN CREATE ROLE hlgb_lab_probe NOLOGIN; END IF; END $$");
});
test.beforeEach(fresh);
test.after(async()=>{if(admin)await admin.end()});
test('esquema privado, todas as tabelas com RLS habilitado e nenhum grant público',async()=>{
 const tables=await admin.query("SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='evolucao_lab' AND c.relkind='r'");
 assert.equal(tables.rows.length,9);
 for(const row of tables.rows){assert.equal(row.relrowsecurity,true,row.relname);assert.equal(row.relforcerowsecurity,true,row.relname)}
 const has=await query("SELECT has_schema_privilege('hlgb_lab_probe','evolucao_lab','USAGE') AS permitted");
 assert.equal(has.permitted,false);
 await admin.query('BEGIN');
 try{
   await admin.query('SET LOCAL ROLE hlgb_lab_probe');
   await assert.rejects(admin.query('SELECT * FROM evolucao_lab.groups'),/permission denied/);
 }finally{await admin.query('ROLLBACK')}
});
test('compensação conjunta tem origem, destino, histórico e saldo de centavos corretos',async()=>{
 const response=await execute(comp());
 assert.equal(response.status,'readback_confirmed');
 const a=await query("SELECT revision FROM evolucao_lab.groups WHERE id='AC-099'");
 const b=await query("SELECT revision FROM evolucao_lab.groups WHERE id='AC-101'");
 assert.equal(a.revision,8);assert.equal(b.revision,4);
 const count=await query("SELECT count(*)::int AS n,sum(amount_cents)::int AS cents FROM evolucao_lab.applications WHERE correction_id='CORR-099'");
 assert.equal(count.n,2);assert.equal(count.cents,500);
 const target=await query("SELECT sum(CASE WHEN kind='a_mais' THEN -amount_cents ELSE amount_cents END)::int AS delta FROM evolucao_lab.applications WHERE target_group_id='AC-101'");
 assert.equal(target.delta,-300);
 const ev=await query("SELECT count(*)::int AS n FROM evolucao_lab.audit_events");
 assert.equal(ev.n,1);
});
test('repetir mesmo comando não duplica, alterar o corpo do comando é rejeitado',async()=>{
 assert.equal((await execute(comp())).status,'readback_confirmed');
 assert.equal((await execute(comp())).status,'already_committed');
 assert.equal((await execute(comp('CMD-C-001','AC-101',3,7,200))).status,'rejected');
 const apps=await query("SELECT count(*)::int AS n FROM evolucao_lab.applications WHERE target_group_id='AC-101'");
 assert.equal(apps.n,1);
});
test('revisões desatualizadas não sobrescrevem transações já concluídas',async()=>{
 await execute(comp());
 const initial=await query("SELECT count(*)::int AS n FROM evolucao_lab.audit_events");
 assert.equal((await execute(comp('CMD-C-STALE','AC-101',3,7,100))).status,'conflict');
 assert.equal((await execute(comp('CMD-C-SOURCE','AC-102',2,7,100))).status,'conflict');
 const after=await query("SELECT count(*)::int AS n FROM evolucao_lab.audit_events");
 assert.equal(after.n,initial.n);
});
test('facções diferentes, quantidade maior que saldo e valor que zera o grupo são bloqueados',async()=>{
 assert.equal((await execute(comp('CMD-OTHER','AC-OTHER',1,7,100))).status,'rejected');
 assert.equal((await execute(comp('CMD-HIGH','AC-101',3,7,301))).status,'rejected');
 assert.equal((await execute(comp('CMD-ZERO','AC-101',3,7,2800))).status,'rejected');
 const count=await query("SELECT count(*)::int AS n FROM evolucao_lab.audit_events");
 assert.equal(count.n,0);
});
test('pagamento atômico gera duas linhas pagas, um Hub e comprovante novo, preservando antigo',async()=>{
 await execute(comp());
 const result=await execute(pay());
 assert.equal(result.status,'readback_confirmed');assert.equal(result.paidCents,2500);
 const group=await query("SELECT status,revision FROM evolucao_lab.groups WHERE id='AC-101'");
 assert.equal(group.status,'Pago');assert.equal(group.revision,5);
 const lines=await query("SELECT sum(paid_cents)::int AS amount,bool_and(status='Pago') AS all_paid FROM evolucao_lab.lines WHERE group_id='AC-101'");
 assert.equal(lines.amount,2500);assert.equal(lines.all_paid,true);
 const hub=await query("SELECT count(*)::int AS n,sum(amount_cents)::int AS total FROM evolucao_lab.hub_entries WHERE source_group_id='AC-101'");
 assert.equal(hub.n,1);assert.equal(hub.total,2500);
 const receipts=await query("SELECT count(*)::int AS n FROM evolucao_lab.receipts");
 assert.equal(receipts.n,2);
 assert.equal((await execute(pay())).status,'already_committed');
 assert.equal((await execute(pay('CMD-P-SECOND',5))).status,'rejected');
 const after=await query("SELECT count(*)::int AS n FROM evolucao_lab.hub_entries WHERE source_group_id='AC-101'");
 assert.equal(after.n,1);
});
test('uma exceção no PDF desfaz linhas, status e Hub no mesmo statement',async()=>{
 await execute(comp());
 await admin.query("INSERT INTO evolucao_lab.receipts(id,group_id,name,mime,size_bytes) VALUES ('PDF-USED','AC-099','anterior.pdf','application/pdf',1024)");
 await assert.rejects(execute(pay('CMD-P-FAIL',4,'PDF-USED')),/duplicate key/);
 const state=await query("SELECT status,revision FROM evolucao_lab.groups WHERE id='AC-101'");
 assert.equal(state.status,'Pendente');assert.equal(state.revision,4);
 const line=await query("SELECT sum(paid_cents)::int AS paid FROM evolucao_lab.lines WHERE group_id='AC-101'");
 assert.equal(line.paid,0);
 const hub=await query("SELECT count(*)::int AS n FROM evolucao_lab.hub_entries WHERE source_group_id='AC-101'");
 assert.equal(hub.n,0);
 const events=await query("SELECT count(*)::int AS n FROM evolucao_lab.audit_events");
 assert.equal(events.n,1,'somente compensação anterior');
});
test('ROLLBACK externo cancela tudo, inclusive evento de auditoria e recibo',async()=>{
 await execute(comp());
 await admin.query('BEGIN');
 const result=await execute(pay('CMD-P-ROLLBACK'));
 assert.equal(result.status,'readback_confirmed');
 await admin.query('ROLLBACK');
 const state=await query("SELECT status FROM evolucao_lab.groups WHERE id='AC-101'");
 assert.equal(state.status,'Pendente');
 const count=await query("SELECT count(*)::int AS n FROM evolucao_lab.commands WHERE command_id='CMD-P-ROLLBACK'");
 assert.equal(count.n,0);
 const hub=await query("SELECT count(*)::int AS n FROM evolucao_lab.hub_entries WHERE source_group_id='AC-101'");
 assert.equal(hub.n,0);
});
test('ACK perdido: consultar pelo ID prova commit, sem reenviar pagamento',async()=>{
 await execute(comp());
 await execute(pay('CMD-P-LOST'));
 const evidence=await query("SELECT c.result AS result,h.amount_cents AS amount FROM evolucao_lab.commands c JOIN evolucao_lab.audit_events e ON e.command_id=c.command_id JOIN evolucao_lab.hub_entries h ON h.source_group_id=e.group_id WHERE c.command_id=$1",['CMD-P-LOST']);
 assert.equal(evidence.result.status,'readback_confirmed');
 assert.equal(Number(evidence.amount),2500);
 assert.equal((await execute(pay('CMD-P-LOST'))).status,'already_committed');
});
test('duas conexões concorrentes não criam dois pagamentos para a mesma revisão',async()=>{
 const c1=new Client(conf),c2=new Client(conf);await Promise.all([c1.connect(),c2.connect()]);
 try{
 const [a,b]=await Promise.all([execute(pay('CMD-RACE-A',3,null),c1),execute(pay('CMD-RACE-B',3,null),c2)]);
 assert.deepEqual([a.status,b.status].sort(),['conflict','readback_confirmed'].sort());
 const count=await query("SELECT count(*)::int AS n FROM evolucao_lab.hub_entries WHERE source_group_id='AC-101'");
 assert.equal(count.n,1);
 const commands=await query("SELECT count(*)::int AS n FROM evolucao_lab.commands");
 assert.equal(commands.n,1);
 }finally{await Promise.all([c1.end(),c2.end()])}
});
test('duas sessões não podem gastar o mesmo crédito duas vezes em destinos diferentes',async()=>{
 const c1=new Client(conf),c2=new Client(conf);await Promise.all([c1.connect(),c2.connect()]);
 try{
 const [a,b]=await Promise.all([execute(comp('CMD-RACE-C1','AC-101',3,7,300),c1),execute(comp('CMD-RACE-C2','AC-102',2,7,300),c2)]);
 assert.deepEqual([a.status,b.status].sort(),['conflict','readback_confirmed'].sort());
 const amount=await query("SELECT sum(amount_cents)::int AS total FROM evolucao_lab.applications WHERE correction_id='CORR-099'");
 assert.equal(amount.total,500);
 const newApps=await query("SELECT count(*)::int AS n FROM evolucao_lab.applications WHERE id LIKE 'APP-CMD-RACE%'");
 assert.equal(newApps.n,1);
 }finally{await Promise.all([c1.end(),c2.end()])}
});
