'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),path=require('node:path'),{Client}=require('pg');
const {chromium,webkit}=require('playwright');
const {startServer,commit,mustBeIsolated,getRecord,getCommand}=require('../sync-persistente/server.cjs');
const browserType=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const DB='hlgb_sync_persist_lab';
const expectedEnv=process.env.PGDATABASE===DB&&process.env.PGHOST==='127.0.0.1';
if(!expectedEnv)throw Error('NUNCA executar teste fora do banco descartável localhost.');
const screenshotDir=process.env.HLGB_SCREENSHOT_DIR||'/tmp/hlgb-sync-db-test';
let browser,admin,server,base;
async function query(sql,params=[]){return admin.query(sql,params)}
async function fresh(){
 await query('TRUNCATE sync_lab.events,sync_lab.commands RESTART IDENTITY');
 await query('UPDATE sync_lab.records SET amount_cents=10000,revision=1 WHERE id=$1',['HUB-DEMO-001']);
}
const money=async page=>(await page.locator('#server-amount').innerText()).trim();
async function login(page,actor='A'){
 await page.goto(base,{waitUntil:'load'});
 await page.locator('#role').selectOption(actor);
 await page.locator('#pin').fill(actor==='A'?'demo-session-a':'demo-session-b');
 await page.locator('#login-form button[type=submit]').click();
 await page.locator('#lab').waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('#seen-rev').textContent.trim()!=='—');
}
async function newSession(actor,width=390){
 const ctx=await browser.newContext({viewport:{width,height:850},acceptDownloads:true});
 const page=await ctx.newPage();await login(page,actor);return {ctx,page};
}
async function waitStatus(page,fragment){await page.locator('#operation-status').getByText(fragment,{exact:false}).waitFor()}
const submit=async(page,value)=>{
 await page.locator('#draft').fill(value);
 await page.locator('#save').click();
 await page.waitForFunction(()=>document.querySelector('#save').disabled===false||
  document.querySelector('#wal-status').textContent!=='Vazio');
};
const record=async()=>getRecord();
test.before(async()=>{
 mustBeIsolated();
 admin=new Client({host:'127.0.0.1',port:Number(process.env.PGPORT),user:process.env.PGUSER,
  password:process.env.PGPASSWORD,database:DB});
 await admin.connect();
 assert.equal((await query('SELECT current_database() AS name')).rows[0].name,DB);
 browser=await browserType.launch({headless:true});
});
test.beforeEach(async()=>{await fresh();server=await startServer();base=server.url});
test.afterEach(async()=>{if(server)await server.close();server=null});
test.after(async()=>{if(browser)await browser.close();if(admin)await admin.end()});
test('PostgreSQL privado: tabelas reais apenas no banco descartável, sem GRANT público',async()=>{
 const tables=(await query("SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class JOIN pg_namespace n ON n.oid=relnamespace WHERE n.nspname='sync_lab' AND relkind='r' ORDER BY relname")).rows;
 assert.equal(tables.length,3);
 assert(tables.every(t=>t.relrowsecurity&&t.relforcerowsecurity));
 const publicGrant=(await query("SELECT has_schema_privilege('public','sync_lab','USAGE') AS public_usage")).rows[0];
 assert.equal(publicGrant.public_usage,false);
 assert.equal((await record()).record.amountCents,10000);
});
test('duas sessões separadas: conflito otimista preserva rascunho e permite revisão',async()=>{
 const a=await newSession('A',390),b=await newSession('B',390);
 try{
  assert.equal((await b.page.locator('#seen-rev').innerText()).trim(),'1');
  await submit(a.page,'120,00');
  await waitStatus(a.page,'Salvo e confirmado por releitura');
  assert.equal((await record()).events.length,1);
  await submit(b.page,'150,00');
  await waitStatus(b.page,'CONFLITO');
  assert.equal((await b.page.locator('#draft').inputValue()).trim(),'150,00');
  assert.equal((await record()).record.amountCents,12000);
  await b.page.locator('#review').click();
  await waitStatus(b.page,'Rascunho');
  assert.equal((await b.page.locator('#seen-rev').innerText()).trim(),'2');
  assert.equal((await b.page.locator('#draft').inputValue()).trim(),'150,00');
  await b.page.locator('#refresh').click();
  await waitStatus(b.page,'Atualização bloqueada');
  await submit(b.page,'150,00');await waitStatus(b.page,'Salvo e confirmado por releitura');
  assert.equal((await record()).record.amountCents,15000);
  assert.equal((await record()).events.length,2);
  assert.equal((await a.page.locator('#seen-rev').innerText()).trim(),'2');
  await a.page.locator('#refresh').click();
  await waitStatus(a.page,'Leitura atualizada');
  assert.equal((await a.page.locator('#seen-rev').innerText()).trim(),'3');
  assert.equal((await a.page.locator('#seen-amount').innerText()).trim(),'R$ 150,00');
  const result=await query('SELECT count(*)::int AS n, count(DISTINCT command_id)::int AS distinct_commands FROM sync_lab.events');
  assert.deepEqual(result.rows[0],{n:2,distinct_commands:2});
 }finally{await a.ctx.close();await b.ctx.close()}
});
test('ACK perdido com commit confirmado persiste na IndexedDB após recarregar o navegador',async()=>{
 const a=await newSession('A',375);
 try{
  await a.page.locator('#lostack').check();
  await submit(a.page,'125,00');
  await waitStatus(a.page,'ACK perdido');
  assert.equal((await record()).record.amountCents,12500);
  assert.equal((await record()).events.length,1);
  const pendingBefore=(await a.page.locator('#wal-status').innerText()).trim();
  assert.match(pendingBefore,/TX-DEMO-/);
  await a.page.reload();await a.page.locator('#lab').waitFor({state:'visible'});
  await waitStatus(a.page,'WAL recuperado');
  assert.equal((await a.page.locator('#wal-status').innerText()).trim(),pendingBefore);
  assert.equal((await record()).events.length,1);
  await a.page.locator('#reconcile').click();
  await waitStatus(a.page,'Salvo e confirmado por releitura');
  assert.equal((await a.page.locator('#wal-status').innerText()).trim(),'Vazio');
  assert.equal((await record()).events.length,1);
  assert.equal((await a.page.locator('#seen-rev').innerText()).trim(),'2');
 }finally{await a.ctx.close()}
});
test('perda de rede deixa WAL persistente e exige reenvio MANUAL com mesmo ID',async()=>{
 const a=await newSession('A',320);
 try{
  await a.page.route('**/api/commands',route=>route.abort('failed'));
  await submit(a.page,'130,00');await waitStatus(a.page,'Resposta indisponível');
  assert.equal((await record()).events.length,0);
  const original=(await a.page.locator('#wal-status').innerText()).match(/TX-DEMO-[a-z0-9-]+/)[0];
  await a.page.reload();await a.page.locator('#lab').waitFor({state:'visible'});
  await waitStatus(a.page,'WAL recuperado');
  assert.match((await a.page.locator('#wal-status').innerText()),new RegExp(original));
  await a.page.unroute('**/api/commands');
  await a.page.locator('#reconcile').click();
  await waitStatus(a.page,'ID não encontrado');
  assert.equal((await record()).events.length,0);
  await a.page.locator('#retry').click();
  await waitStatus(a.page,'Salvo e confirmado por releitura');
  const data=await record();
  assert.equal(data.events.length,1);
  assert.equal(data.events[0].commandId,original);
  assert.equal(data.record.amountCents,13000);
 }finally{await a.ctx.close()}
});
test('servidor reinicia no MESMO localhost:porta e registro persiste; WAL preserva ID',async()=>{
 const a=await newSession('A',375);
 try{
  await a.page.locator('#lostack').check();
  await submit(a.page,'145,00');
  await waitStatus(a.page,'ACK perdido');
  const oldId=(await a.page.locator('#wal-status').innerText()).match(/TX-DEMO-[a-z0-9-]+/)[0];
  const port=Number(new URL(base).port);
  await server.close();
  server=await startServer(port);
  assert.equal(server.url,base);
  const persisted=await record();
  assert.equal(persisted.record.amountCents,14500);
  assert.equal(persisted.events.length,1);
  assert.equal((await getCommand(oldId)).status,'readback_confirmed');
  await a.page.reload();await a.page.locator('#login').waitFor({state:'visible'});
  await a.page.locator('#login-form button[type=submit]').click();
  await a.page.locator('#lab').waitFor({state:'visible'});
  await waitStatus(a.page,'Comando recuperado do IndexedDB');
  assert.match((await a.page.locator('#wal-status').innerText()),new RegExp(oldId));
  await a.page.locator('#reconcile').click();
  await waitStatus(a.page,'Salvo e confirmado por releitura');
  assert.equal((await record()).events.length,1);
  assert.equal((await a.page.locator('#wal-status').innerText()).trim(),'Vazio');
  fs.mkdirSync(screenshotDir,{recursive:true});
  await a.page.screenshot({path:path.join(screenshotDir,'sync-postgres-'+browserType.name()+'.png'),fullPage:true});
  fs.writeFileSync(path.join(screenshotDir,'sync-postgres-'+browserType.name()+'.json'),JSON.stringify({
   schema:'hlgb-sync-postgres-evidence-v1',browser:browserType.name(),database:DB,
   fictitious:true,productionApproved:false,events:persisted.events,restartConfirmed:true,
   walRecoveryConfirmed:true},null,2));
 }finally{await a.ctx.close()}
});
test('concorrência PostgreSQL entre comandos reais: apenas 1 gravação e replay idempotente',async()=>{
 const sessionA={commandId:'TX-DEMO-parallel-a-12345',recordId:'HUB-DEMO-001',expectedRevision:1,amountCents:12000};
 const sessionB={commandId:'TX-DEMO-parallel-b-12345',recordId:'HUB-DEMO-001',expectedRevision:1,amountCents:15000};
 const [ra,rb]=await Promise.all([commit(sessionA,'A'),commit(sessionB,'B')]);
 assert.deepEqual([ra.status,rb.status].sort(),['committed','conflict']);
 assert.equal((await record()).events.length,1);
 const winning=ra.status==='committed'?sessionA:sessionB;
 const actor=ra.status==='committed'?'A':'B';
 assert.equal((await commit(winning,actor)).status,'already_committed');
 assert.equal((await getCommand(winning.commandId)).status,'readback_confirmed');
 assert.equal((await record()).events.length,1);
 assert.equal((await commit({...winning,amountCents:16000},actor)).status,'rejected');
 assert.equal((await record()).events.length,1);
});
test('bloqueia Host indevido, Origem de escrita ausente e login errado',async()=>{
 const result=await fetch(base+'/api/health');assert.equal(result.status,200);
 assert.equal((await result.json()).database,DB);
 const guest=await fetch(base+'/api/state');assert.equal(guest.status,401);
 const bad=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({actor:'A',pin:'demo-session-a'})});
 assert.equal(bad.status,403);
 const headers={origin:base,'x-hlgb-lab-request':'1','content-type':'application/json'};
 const invalid=await fetch(base+'/api/login',{method:'POST',headers,
  body:JSON.stringify({actor:'A',pin:'incorrecto'})});
 assert.equal(invalid.status,401);
 const hostBad=await fetch(base+'/api/health',{headers:{host:'malicioso.example'}});
 assert.equal(hostBad.status,403);
 assert.equal((await record()).events.length,0);
});
