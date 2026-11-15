'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Client}=require('pg');
const connection=String(process.env.HLGB_AUTH_LAB_URL||'');
if(!/^postgres(?:ql)?:\/\/postgres:/.test(connection)||!connection.endsWith('/hlgb_permissoes_lab'))
 throw Error('Execução bloqueada: é necessário o PostgreSQL descartável hlgb_permissoes_lab.');
const conn={host:'127.0.0.1',port:5432,database:'hlgb_permissoes_lab'};
const users={
 finA:['hlab_fin_a','ci_ficticio_fin_a'],
 finB:['hlab_fin_b','ci_ficticio_fin_b'],
 finOther:['hlab_fin_other','ci_ficticio_fin_other'],
 finInactive:['hlab_fin_inactive','ci_ficticio_inactive'],
 operation:['hlab_operation_a','ci_ficticio_operation'],
 viewer:['hlab_viewer_a','ci_ficticio_viewer'],
 anon:['hlab_anon','ci_ficticio_anon']
};
const reset=fs.readFileSync(path.resolve(__dirname,'../permissoes/02-reset-fixtures.sql'),'utf8');
let admin;
async function use(role,fn){
 const client=new Client({...conn,user:users[role][0],password:users[role][1]});
 await client.connect();
 try{return await fn(client)}finally{await client.end()}
}
async function one(client,sql,params=[]){return (await client.query(sql,params)).rows[0]}
async function preview(c,group='AC-TESTE-A'){
 return (await one(c,'SELECT evolucao_access_lab.preview_group($1) AS answer',[group])).answer
}
async function stage(c,id='REC-DEMO-1',filename='recibo-ficticio.pdf',sha='a'.repeat(64),size=2024,mime='application/pdf'){
 return (await one(c,'SELECT evolucao_access_lab.stage_receipt($1,$2,$3,$4,$5) AS answer',[id,filename,sha,size,mime])).answer
}
async function pay(c,id='CMD-PAG-1',group='AC-TESTE-A',rev=3,upload=null){
 return (await one(c,'SELECT evolucao_access_lab.pay_group($1,$2,$3,$4,$5) AS answer',[id,group,rev,'PIX',upload])).answer
}
test.before(async()=>{
 admin=new Client({connectionString:connection});
 await admin.connect();
 assert.equal((await one(admin,'SELECT current_database() AS db')).db,'hlgb_permissoes_lab');
});
test.beforeEach(async()=>{await admin.query(reset)});
test.after(async()=>{if(admin)await admin.end()});
test('acesso direto negado e RLS habilitado em sete tabelas',async()=>{
 const q=await admin.query("SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='evolucao_access_lab' AND relkind='r'");
 assert.equal(q.rows.length,7);
 assert(q.rows.every(x=>x.relrowsecurity&&x.relforcerowsecurity));
 const policies=await one(admin,"SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='evolucao_access_lab'");
 assert.equal(policies.n,0);
 const grants=await one(admin,"SELECT has_table_privilege('hlab_fin_a','evolucao_access_lab.groups','SELECT') AS select_allowed,has_table_privilege('hlab_fin_a','evolucao_access_lab.groups','UPDATE') AS update_allowed,has_function_privilege('hlab_viewer_a','evolucao_access_lab.pay_group(text,text,integer,text,text)','EXECUTE') AS viewer_exec");
 assert.equal(grants.select_allowed,false);assert.equal(grants.update_allowed,false);assert.equal(grants.viewer_exec,false);
 await use('finA',async c=>{await assert.rejects(c.query('SELECT * FROM evolucao_access_lab.groups'),/permission denied/)});
});
test('identidade do login, consulta de sua própria empresa e ocultação de outra',async()=>{
 await use('finA',async c=>{
  const own=await preview(c);assert.equal(own.status,'ok');assert.equal(own.revision,3);
  assert.equal((await preview(c,'AC-TESTE-B')).status,'denied');
 });
 await use('finOther',async c=>{
  assert.equal((await preview(c,'AC-TESTE-B')).status,'ok');
  assert.equal((await preview(c)).status,'denied');
  assert.equal((await pay(c,'CMD-OUTRO')).status,'denied');
 });
 const after=await one(admin,"SELECT status,revision FROM evolucao_access_lab.groups WHERE id='AC-TESTE-A'");
 assert.deepEqual(after,{status:'Pendente',revision:3});
});
test('consulta e operação têm leitura limitada, mas não podem executar pagamento',async()=>{
 for(const role of ['viewer','operation']){
  await use(role,async c=>{
   assert.equal((await preview(c)).status,'ok');
   await assert.rejects(pay(c,'CMD-VIS-'+role),/permission denied/);
   await assert.rejects(stage(c,'REC-'+role),/permission denied/);
  });
 }
 const total=await one(admin,'SELECT count(*)::int AS n FROM evolucao_access_lab.hub_entries');
 assert.equal(total.n,0);
});
test('anônimo não lê nem paga; financeiro inativo continua bloqueado',async()=>{
 await use('anon',async c=>{
  await assert.rejects(preview(c),/permission denied/);
  await assert.rejects(pay(c,'CMD-ANON'),/permission denied/);
 });
 await use('finInactive',async c=>{
  assert.equal((await preview(c)).status,'denied');
  assert.equal((await stage(c,'REC-INACTIVE')).status,'denied');
  assert.equal((await pay(c,'CMD-INACTIVE')).status,'denied');
 });
});
test('não confiar em user metadata/JWT fictício fornecido pelo cliente',async()=>{
 await use('finOther',async c=>{
  await c.query("SELECT set_config('request.jwt.claim.sub','hlab_fin_a',false)");
  await c.query("SELECT set_config('request.jwt.claim.role','financeiro',false)");
  assert.equal((await preview(c,'AC-TESTE-A')).status,'denied');
  assert.equal((await pay(c,'CMD-SPOOF')).status,'denied');
 });
});
test('PDF fictício: metadados validados e repetição idempotente',async()=>{
 await use('finA',async c=>{
  assert.equal((await stage(c)).status,'staged');
  assert.equal((await stage(c)).status,'already_staged');
  assert.equal((await stage(c,'REC-DEMO-1','recibo-novo.pdf')).status,'rejected');
  assert.equal((await stage(c,'REC-BAD','arquivo.txt')).status,'rejected');
  assert.equal((await stage(c,'REC-BAD2','recibo.pdf','abcd')).status,'rejected');
  assert.equal((await stage(c,'REC-BAD3','recibo.pdf','b'.repeat(64),10485761)).status,'rejected');
 });
 const count=await one(admin,'SELECT count(*)::int AS n FROM evolucao_access_lab.upload_metadata');
 assert.equal(count.n,1);
});
test('pagamento autorizado confirma linhas, Hub, metadados e histórico sem duplicar',async()=>{
 await use('finA',async c=>{
  assert.equal((await stage(c)).status,'staged');
  const first=await pay(c,'CMD-COM-PDF','AC-TESTE-A',3,'REC-DEMO-1');
  assert.equal(first.status,'readback_confirmed');assert.equal(Number(first.amountCents),2500);
  assert.equal((await pay(c,'CMD-COM-PDF','AC-TESTE-A',3,'REC-DEMO-1')).status,'already_committed');
  assert.equal((await pay(c,'CMD-DUPLICADO','AC-TESTE-A',4)).status,'rejected');
  assert.equal((await preview(c)).state,'Pago');
 });
 const paid=await one(admin,"SELECT sum(paid_cents)::int AS cents,bool_and(status='Pago') AS paid FROM evolucao_access_lab.lines WHERE group_id='AC-TESTE-A'");
 assert.equal(paid.cents,2500);assert.equal(paid.paid,true);
 const hub=await one(admin,"SELECT count(*)::int AS n,sum(amount_cents)::int AS cents FROM evolucao_access_lab.hub_entries WHERE group_id='AC-TESTE-A'");
 assert.equal(hub.n,1);assert.equal(hub.cents,2500);
 const receipt=await one(admin,"SELECT state,group_id FROM evolucao_access_lab.upload_metadata WHERE id='REC-DEMO-1'");
 assert.deepEqual(receipt,{state:'attached',group_id:'AC-TESTE-A'});
 const audit=await one(admin,'SELECT count(*)::int AS n FROM evolucao_access_lab.audit_events');
 assert.equal(audit.n,1);
});
test('somente quem preparou o anexo pode vinculá-lo; empresa diferente é bloqueada',async()=>{
 await use('finB',async c=>{assert.equal((await stage(c,'REC-B')).status,'staged')});
 await use('finA',async c=>{
  assert.equal((await pay(c,'CMD-ANEXO-OUTRO','AC-TESTE-A',3,'REC-B')).status,'rejected');
 });
 await use('finOther',async c=>{assert.equal((await stage(c,'REC-OUTRA')).status,'staged')});
 await use('finA',async c=>{
  assert.equal((await pay(c,'CMD-ANEXO-EMPRESA','AC-TESTE-A',3,'REC-OUTRA')).status,'rejected');
 });
 const group=await one(admin,"SELECT status FROM evolucao_access_lab.groups WHERE id='AC-TESTE-A'");
 assert.equal(group.status,'Pendente');
 const total=await one(admin,'SELECT count(*)::int AS n FROM evolucao_access_lab.hub_entries');assert.equal(total.n,0);
});
test('falha após atualizar linhas cancela tudo, preservando anexo pendente',async()=>{
 await use('finA',async c=>{assert.equal((await stage(c)).status,'staged')});
 await admin.query("INSERT INTO evolucao_access_lab.hub_entries(id,group_id,amount_cents,method,state) VALUES ('HUB-AC-TESTE-A','AC-TESTE-EXTRA',1000,'PIX','Realizado')");
 await use('finA',async c=>{
  await assert.rejects(pay(c,'CMD-FALHA','AC-TESTE-A',3,'REC-DEMO-1'),/duplicate key/);
 });
 const group=await one(admin,"SELECT status,revision FROM evolucao_access_lab.groups WHERE id='AC-TESTE-A'");
 assert.deepEqual(group,{status:'Pendente',revision:3});
 const lines=await one(admin,"SELECT sum(paid_cents)::int AS cents FROM evolucao_access_lab.lines WHERE group_id='AC-TESTE-A'");
 assert.equal(lines.cents,0);
 const staged=await one(admin,"SELECT state,group_id FROM evolucao_access_lab.upload_metadata WHERE id='REC-DEMO-1'");
 assert.deepEqual(staged,{state:'staged',group_id:null});
 const cmd=await one(admin,"SELECT count(*)::int AS n FROM evolucao_access_lab.commands WHERE id='CMD-FALHA'");
 assert.equal(cmd.n,0);
});
test('dois financeiros na mesma empresa não conseguem pagar duas vezes',async()=>{
 const [a,b]=await Promise.all([
  use('finA',c=>pay(c,'CMD-RACE-A')),
  use('finB',c=>pay(c,'CMD-RACE-B'))
 ]);
 assert.deepEqual([a.status,b.status].sort(),['conflict','readback_confirmed'].sort());
 const q=await one(admin,"SELECT count(*)::int AS n FROM evolucao_access_lab.hub_entries WHERE group_id='AC-TESTE-A'");
 assert.equal(q.n,1);
});
test('operação confirmada sem resposta pode ser reconciliada por ID',async()=>{
 await use('finA',async c=>{assert.equal((await pay(c,'CMD-ACK')).status,'readback_confirmed')});
 const saved=await one(admin,"SELECT response,actor_login FROM evolucao_access_lab.commands WHERE id='CMD-ACK'");
 assert.equal(saved.actor_login,'hlab_fin_a');assert.equal(saved.response.status,'readback_confirmed');
 await use('finA',async c=>{assert.equal((await pay(c,'CMD-ACK')).status,'already_committed')});
 await use('finB',async c=>{assert.equal((await pay(c,'CMD-ACK')).status,'rejected')});
 const q=await one(admin,'SELECT count(*)::int AS n FROM evolucao_access_lab.hub_entries');assert.equal(q.n,1);
});
test('desativação do funcionário impede novas operações inclusive em conexão aberta',async()=>{
 await use('finA',async c=>{
  assert.equal((await preview(c)).status,'ok');
  await admin.query("UPDATE evolucao_access_lab.memberships SET active=false WHERE db_login='hlab_fin_a'");
  assert.equal((await preview(c)).status,'denied');
  assert.equal((await pay(c,'CMD-AFTER-REVOCATION')).status,'denied');
  assert.equal((await stage(c,'REC-REVOKED')).status,'denied');
 });
});
