'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const fs=require('node:fs/promises'),path=require('node:path');
const {Client}=require('pg'),{chromium,webkit}=require('playwright');
const {startServer,PIN_FIXTURES}=require('../integracao/server.cjs');
if(process.env.PGDATABASE!=='hlgb_permissoes_lab'||!String(process.env.HLGB_AUTH_LAB_URL||'').endsWith('/hlgb_permissoes_lab'))
 throw Error('A suíte não executa fora de hlgb_permissoes_lab');
const browserType=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const reset=fs.readFile(path.resolve(__dirname,'../permissoes/02-reset-fixtures.sql'),'utf8');
const headers=base=>({origin:base,'x-hlgb-demo-request':'1'});
const digest=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
function generatePdf(text='RECIBO DE TESTE FICTICIO'){
 const parts=[Buffer.from('%PDF-1.4\n','ascii')];
 const objects=[
 '<< /Type /Catalog /Pages 2 0 R >>',
 '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
 '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
 null,
 '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
 ];
 const stream='BT /F1 12 Tf 30 100 Td ('+text.replace(/[()\\]/g,'')+') Tj ET\n';
 objects[3]='<< /Length '+Buffer.byteLength(stream,'ascii')+' >>\nstream\n'+stream+'endstream';
 const offsets=[0];
 for(let i=0;i<objects.length;i++){
  offsets.push(parts.reduce((n,x)=>n+x.length,0));
  parts.push(Buffer.from((i+1)+' 0 obj\n'+objects[i]+'\nendobj\n','ascii'));
 }
 const xref=parts.reduce((n,x)=>n+x.length,0);
 const offsetsString=['0000000000 65535 f ','...'];
 const reference='xref\n0 '+(objects.length+1)+'\n'+['0000000000 65535 f ',
  ...offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n ')].join('\n')+
  '\ntrailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
 parts.push(Buffer.from(reference,'ascii'));
 return Buffer.concat(parts);
}
const file=generatePdf();
let browser,admin,app;
async function request(ctx,method,route,data,customOrigin){
 const options={headers:headers(customOrigin||app.url)};
 if(method==='POST')options.data=data;
 return ctx.request[method.toLowerCase()](app.url+route,options);
}
async function signIn(ctx,role){
 const response=await request(ctx,'POST','/api/login',{role,pin:PIN_FIXTURES[role].pin});
 assert.equal(response.status(),200);
 assert.equal((await response.json()).status,'ok');
 return ctx;
}
async function context(role='finA'){
 const ctx=await browser.newContext({viewport:{width:390,height:820}});
 if(role)await signIn(ctx,role);
 return ctx;
}
async function serverResult(ctx,method,route,body){
 const result=await request(ctx,method,route,body);
 return {http:result.status(),data:await result.json()};
}
async function upload(ctx,id='REC-PDF-001',buffer=file,name='comprovante-ficticio.pdf',mime='application/pdf'){
 return serverResult(ctx,'POST','/api/upload',{id,name,mime,base64:buffer.toString('base64')});
}
async function pay(ctx,commandId='CMD-PDF-001',groupId='AC-TESTE-A',revision=3,uploadId=null,extra={}){
 return serverResult(ctx,'POST','/api/pay',{commandId,groupId,revision,method:'PIX',uploadId,...extra});
}
async function row(sql,p=[]){return (await admin.query(sql,p)).rows[0]}
test.before(async()=>{
 admin=new Client({connectionString:process.env.HLGB_AUTH_LAB_URL});await admin.connect();
 assert.equal((await row('SELECT current_database() AS name')).name,'hlgb_permissoes_lab');
 browser=await browserType.launch({headless:true});
});
test.beforeEach(async()=>{await admin.query(await reset);app=await startServer()});
test.afterEach(async()=>{if(app)await app.close();app=null});
test.after(async()=>{if(browser)await browser.close();if(admin)await admin.end()});

test('login fictício e aplicação HTTPS de escopo apenas local, sem requisições externas',async()=>{
 const ctx=await browser.newContext({viewport:{width:375,height:800}}),page=await ctx.newPage();
 const remote=[],errors=[];
 page.on('request',r=>{if(!r.url().startsWith(app.url))remote.push(r.url())});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(app.url);
 await page.locator('#login').click();
 await page.waitForFunction(()=>document.querySelector('#session-status').textContent.includes('ok:'));
 await page.waitForFunction(()=>document.querySelector('#group-status').textContent.startsWith('ok:'));
 assert.match(await page.locator('#group-status').textContent(),/ok/);
 assert.match(await page.locator('#session-status').textContent(),/Financeiro/);
 assert.deepEqual(remote,[]);
 assert.deepEqual(errors,[]);
 const cookies=await ctx.cookies();
 const token=cookies.find(c=>c.name==='hlgb_evolucao_session');
 assert(token);assert.equal(token.httpOnly,true);assert.equal(token.sameSite,'Strict');
 const before=await request(ctx,'GET','/api/session');
 assert.equal((await before.json()).role,'finA');
 await page.locator('#logout').click();
 await page.waitForFunction(()=>document.querySelector('#session-status').textContent.includes('encerrada'));
 const after=await request(ctx,'GET','/api/session');
 assert.equal(after.status(),401);
 await ctx.close();
});
test('PDF sintético válido é realmente enviado, salvo e conferido pelo hash do servidor',async()=>{
 const ctx=await context();
 const response=await upload(ctx);
 assert.equal(response.http,200);
 assert.equal(response.data.status,'staged');
 assert.equal(response.data.sha256,digest(file));
 const stored=await fs.readFile(path.join(app.storage,'REC-PDF-001.pdf'));
 assert.deepEqual(stored,file);
 const got=await request(ctx,'GET','/api/receipts/REC-PDF-001');
 assert.equal(got.status(),200);assert.equal(got.headers()['content-type'],'application/pdf');
 assert.deepEqual(await got.body(),file);
 const paid=await pay(ctx,'CMD-PDF-001','AC-TESTE-A',3,'REC-PDF-001');
 assert.equal(paid.data.status,'readback_confirmed');assert.equal(paid.data.amountCents,2500);
 const cmd=await serverResult(ctx,'GET','/api/commands/CMD-PDF-001');
 assert.equal(cmd.data.status,'readback_confirmed');
 const table=await row("SELECT state,group_id,sha256,size_bytes FROM evolucao_access_lab.upload_metadata WHERE id='REC-PDF-001'");
 assert.equal(table.state,'attached');assert.equal(table.group_id,'AC-TESTE-A');
 assert.equal(table.sha256,digest(file));assert.equal(Number(table.size_bytes),file.length);
 const duplicate=await pay(ctx,'CMD-PDF-001','AC-TESTE-A',3,'REC-PDF-001');
 assert.equal(duplicate.data.status,'already_committed');
 const hub=await row("SELECT count(*)::int AS count FROM evolucao_access_lab.hub_entries WHERE group_id='AC-TESTE-A'");
 assert.equal(hub.count,1);
 await ctx.close();
});
test('interface mobile exercita login, escolha do arquivo e pagamento fictício',async()=>{
 const ctx=await browser.newContext({viewport:{width:375,height:820}}),page=await ctx.newPage();
 await page.goto(app.url);
 await page.locator('#login').click();
 await page.waitForFunction(()=>document.querySelector('#group-status').textContent.startsWith('ok:'));
 await page.locator('#file').setInputFiles({name:'comprovante-ficticio.pdf',mimeType:'application/pdf',buffer:file});
 await page.locator('#upload').click();
 await page.waitForFunction(()=>document.querySelector('#upload-status').textContent.includes('staged'));
 assert.equal(await page.locator('#receipt-reference').inputValue(),'REC-DEMO-001');
 await page.locator('#pay').click();
 await page.waitForFunction(()=>document.querySelector('#pay-status').textContent.includes('readback_confirmed'));
 await page.waitForFunction(()=>document.querySelector('#group-status').textContent.includes('Situação: Pago'));
 assert.match(await page.locator('#group-status').textContent(),/Pago/);
 const link=await page.locator('#receipt-link').getAttribute('href');
 assert.equal(link,'/api/receipts/REC-DEMO-001');
 const doc=await request(ctx,'GET',link);
 assert.deepEqual(await doc.body(),file);
 const stats=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
 assert(stats.scroll<=stats.width+2,'Rolagem horizontal: '+JSON.stringify(stats));
 if(process.env.HLGB_SCREENSHOT_DIR){
  await fs.mkdir(process.env.HLGB_SCREENSHOT_DIR,{recursive:true});
  await page.screenshot({path:path.join(process.env.HLGB_SCREENSHOT_DIR,'integracao-mobile-'+browserType.name()+'-375.png'),fullPage:true});
 }
 await ctx.close();
});
test('usuários sem sessão, revogados ou de setores sem permissão não pagam nem enviam',async()=>{
 const no=await context(null);
 const anon=await serverResult(no,'POST','/api/pay',{commandId:'CMD-TEST-ANON',groupId:'AC-TESTE-A',revision:3,method:'PIX'});
 assert.equal(anon.http,401);
 const wrong=await request(no,'POST','/api/login',{role:'finA',pin:'senha-errada'});
 assert.equal(wrong.status(),401);await no.close();
 for(const role of ['viewer','operation','inactive']){
  const ctx=await context(role);
  const u=await upload(ctx,'REC-NEG-'+role);
  assert.equal(u.data.status,'denied');
  assert.equal(u.http,403);
  const p=await pay(ctx,'CMD-DENY-'+role);
  assert.equal(p.http,403);
  await ctx.close();
 }
 const count=await row('SELECT count(*)::int AS n FROM evolucao_access_lab.hub_entries');assert.equal(count.n,0);
 const files=await fs.readdir(app.storage);assert.deepEqual(files,[]);
});
test('empresa diferente não acessa acerto, comprovante ou pagamento da outra',async()=>{
 const owner=await context('finA'),other=await context('other');
 assert.equal((await upload(owner)).data.status,'staged');
 const probe=await serverResult(other,'GET','/api/groups/AC-TESTE-A');
 assert.equal(probe.http,403);
 assert.equal((await pay(other,'CMD-CROSS','AC-TESTE-A')).http,403);
 assert.equal((await request(other,'GET','/api/receipts/REC-PDF-001')).status(),403);
 assert.equal((await request(other,'GET','/api/commands/CMD-NO-EXIST')).status(),404);
 await Promise.all([owner.close(),other.close()]);
});
test('controle de origem bloqueia POST malicioso de outro domínio',async()=>{
 const ctx=await context('finA');
 const r=await request(ctx,'POST','/api/pay',{commandId:'CMD-CSRF-1',groupId:'AC-TESTE-A',revision:3,method:'PIX'},'https://site-malicioso.invalid');
 assert.equal(r.status(),403);
 assert.equal((await r.json()).status,'denied');
 await ctx.close();
});
test('rejeitar bytes não-PDF, extensão falsa, digest alterado e tamanho excedido',async()=>{
 const ctx=await context();
 const bad=await upload(ctx,'REC-BAD-1',Buffer.from('isso nao e PDF'),'falso.pdf');
 assert.equal(bad.http,422);
 const wrongName=await upload(ctx,'REC-BAD-2',file,'arquivo.txt');
 assert.equal(wrongName.http,422);
 const wrongMime=await upload(ctx,'REC-BAD-3',file,'arquivo.pdf','text/plain');
 assert.equal(wrongMime.http,422);
 const tooLarge=Buffer.concat([Buffer.from('%PDF-1.4\n'),Buffer.alloc(524288,'a'),Buffer.from('\n%%EOF')]);
 const huge=await upload(ctx,'REC-BAD-4',tooLarge);
 assert.equal(huge.http,422);
 const count=await row('SELECT count(*)::int AS n FROM evolucao_access_lab.upload_metadata');
 assert.equal(count.n,0);
 assert.deepEqual(await fs.readdir(app.storage),[]);
 await ctx.close();
});
test('arquivo já armazenado não pode ser substituído pelo mesmo ID',async()=>{
 const ctx=await context();
 assert.equal((await upload(ctx)).data.status,'staged');
 assert.equal((await upload(ctx)).data.status,'already_staged');
 const changed=generatePdf('OUTRO ARQUIVO DE TESTE');
 const denied=await upload(ctx,'REC-PDF-001',changed);
 assert.equal(denied.http,409);
 const original=await fs.readFile(path.join(app.storage,'REC-PDF-001.pdf'));
 assert.deepEqual(original,file);
 await ctx.close();
});
test('anexo preparado por outro funcionário só pode ser ligado pelo responsável',async()=>{
 const a=await context('finA'),b=await context('finB');
 assert.equal((await upload(a)).data.status,'staged');
 assert.equal((await pay(b,'CMD-NOT-OWNER','AC-TESTE-A',3,'REC-PDF-001')).data.status,'rejected');
 assert.equal((await request(b,'GET','/api/receipts/REC-PDF-001')).status(),403);
 assert.equal((await pay(a,'CMD-OWNER','AC-TESTE-A',3,'REC-PDF-001')).data.status,'readback_confirmed');
 const sharedAfter=await request(b,'GET','/api/receipts/REC-PDF-001');
 assert.equal(sharedAfter.status(),200);
 await Promise.all([a.close(),b.close()]);
});
test('resposta perdida exige consulta do identificador; outro funcionário não acessa comando',async()=>{
 const a=await context('finA'),b=await context('finB');
 const response=await pay(a,'CMD-ACK-001','AC-TESTE-A',3,null,{simulateLostAck:true});
 assert.equal(response.http,202);assert.equal(response.data.status,'uncertain');
 const aProof=await serverResult(a,'GET','/api/commands/CMD-ACK-001');
 assert.equal(aProof.data.status,'readback_confirmed');
 const bProof=await serverResult(b,'GET','/api/commands/CMD-ACK-001');
 assert.equal(bProof.data.status,'not_found');
 const repeated=await pay(a,'CMD-ACK-001','AC-TESTE-A',3);
 assert.equal(repeated.data.status,'already_committed');
 const entries=await row('SELECT count(*)::int AS n FROM evolucao_access_lab.hub_entries');
 assert.equal(entries.n,1);
 await Promise.all([a.close(),b.close()]);
});
test('duas sessões reais no navegador não criam pagamentos duplicados',async()=>{
 const a=await context('finA'),b=await context('finB');
 const [x,y]=await Promise.all([pay(a,'CMD-CONCURRENT-A'),pay(b,'CMD-CONCURRENT-B')]);
 assert.deepEqual([x.data.status,y.data.status].sort(),['conflict','readback_confirmed'].sort());
 const count=await row("SELECT count(*)::int AS n FROM evolucao_access_lab.hub_entries WHERE group_id='AC-TESTE-A'");
 assert.equal(count.n,1);
 await Promise.all([a.close(),b.close()]);
});
test('o mesmo formulário não ultrapassa a tela em cinco tamanhos de celular e desktop',async()=>{
 for(const width of [320,375,390,768,1280]){
  const ctx=await browser.newContext({viewport:{width,height:820}}),page=await ctx.newPage();
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  await page.goto(app.url);
  assert.equal(await page.locator('h1').count(),1);
  const view=await page.evaluate(()=>({
   inner:innerWidth,scroll:document.documentElement.scrollWidth,
   offenders:[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,id:e.id,right:Math.round(e.getBoundingClientRect().right)})).filter(x=>x.right>innerWidth+2).slice(0,8)
  }));
  assert(view.scroll<=view.inner+2,'Largura '+width+' teve rolagem horizontal: '+JSON.stringify(view));
  await page.locator('#login').click();
  await page.waitForFunction(()=>document.querySelector('#session-status').textContent.startsWith('ok:'));
  assert.deepEqual(pageErrors,[]);
  await ctx.close();
 }
});
test('arquivo físico adulterado não passa na recuperação de integridade',async()=>{
 const ctx=await context();
 assert.equal((await upload(ctx)).data.status,'staged');
 await fs.writeFile(path.join(app.storage,'REC-PDF-001.pdf'),Buffer.from('%PDF-1.4\nConteudo adulterado\n%%EOF\n'));
 const got=await request(ctx,'GET','/api/receipts/REC-PDF-001');
 assert.equal(got.status(),409);
 assert.equal((await got.json()).status,'rejected');
 await ctx.close();
});
test('desativar funcionário impede operação apesar de sessão existente',async()=>{
 const ctx=await context('finA');
 const before=await serverResult(ctx,'GET','/api/groups/AC-TESTE-A');
 assert.equal(before.data.status,'ok');
 await admin.query("UPDATE evolucao_access_lab.memberships SET active=false WHERE db_login='hlab_fin_a'");
 const after=await serverResult(ctx,'GET','/api/groups/AC-TESTE-A');
 assert.equal(after.http,403);
 const p=await pay(ctx,'CMD-REVOKED');
 assert.equal(p.http,403);
 await ctx.close();
});
