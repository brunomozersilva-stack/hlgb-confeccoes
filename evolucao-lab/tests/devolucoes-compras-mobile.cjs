'use strict';
/* Prévia de devolução em Chromium/WebKit, sem banco externo nem dinheiro real. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),
 assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const root=path.resolve(__dirname,'..');
const allow=/^(?:modulos\/[a-z0-9-]+\.js|operacao-integrada-(?:core|ui)\.js)$/;
const srv=http.createServer((req,res)=>{
 const rel=req.url==='/'?'operacao-integrada.html':decodeURIComponent(req.url||'').slice(1);
 if(rel!=='operacao-integrada.html'&&!allow.test(rel)){res.writeHead(404);res.end();return}
 try{
  const data=fs.readFileSync(path.join(root,rel));
  res.writeHead(200,{'content-type':rel.endsWith('.html')?'text/html;charset=utf-8':'text/javascript;charset=utf-8',
   'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; object-src 'none'",
   'cache-control':'no-store'});
  res.end(data);
 }catch(e){res.writeHead(404);res.end()}
});
const rev=async page=>Number((await page.locator('#top-revision').innerText()).match(/Revisão local (\d+)/)?.[1]||0);
async function setModule(page,key){await page.locator('[data-module="'+key+'"]').click()}
async function apply(page,type,payload){
 const form=page.locator('form[data-command="'+type+'"]');
 assert.equal(await form.count(),1,'formulário '+type);
 const before=await rev(page);
 for(const [name,value] of Object.entries(payload)){
  const field=form.locator('[name="'+name+'"]');
  if(await field.evaluate(el=>el.tagName==='SELECT'))await field.selectOption(String(value));
  else await field.fill(String(value));
 }
 await form.locator('button[type=submit]').click();
 await page.waitForFunction(expected=>{
  const txt=document.getElementById('top-revision')?.textContent||'';
  return Number(txt.match(/Revisão local (\d+)/)?.[1]||0)===expected+1
 },before,{timeout:10000}).catch(async e=>{throw Error(type+': '+await page.locator('#flash').innerText()+'; '+e.message)});
 assert.match(await page.locator('#flash').innerText(),/Salvo e confirmado por releitura/);
}
async function scenario(browser,url,width){
 const context=await browser.newContext({viewport:{width,height:850},acceptDownloads:true}),
 page=await context.newPage(),errors=[],external=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('request',r=>{if(!r.url().startsWith(url))external.push(r.url())});
 try{
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#top-revision')?.textContent.includes('Revisão local 1'));
  await setModule(page,'compras');
  await apply(page,'materials.plan.add',{productId:'PRO-0002',color:'Rubi',size:'P',qty:'200'});
  await apply(page,'purchase.request.create',{materialId:'MAT-0002',requester:'Compradora A',reason:'Reposição fictícia'});
  await apply(page,'purchase.request.approve',{id:'REQ-0001',approver:'Supervisora B',reason:'Conferida necessidade'});
  await apply(page,'purchase.request.issue',{id:'REQ-0001',supplierId:'FOR-0001',
   checkerOne:'Cortadora A',checkerTwo:'Cortador B',reason:'Compra fictícia autorizada'});
  await apply(page,'purchase.receive',{id:'COM-0001'});
  assert.match(await page.locator('#module-content').innerText(),/Recebida/);
  const choices=page.locator('form[data-command="purchase.return.full"] select[name="id"] option');
  assert.equal(await choices.count(),1);
  await apply(page,'purchase.return.full',{id:'COM-0001',reference:'DEV-MOBILE-001',
   returnedBy:'Almoxarife C',reviewedBy:'Supervisora B',
   reason:'Material recebido fora da qualidade demonstrativa'});
  const compras=await page.locator('#module-content').innerText();
  assert.match(compras,/Devolvida integralmente/);
  assert.match(compras,/DEV-0001/);
  assert.match(compras,/DEV-MOBILE-001/);
  assert.equal(await choices.count(),0,'impedir devolução repetida da mesma compra');
  await setModule(page,'estoque');
  const estoque=await page.locator('#module-content').innerText();
  assert.match(estoque,/devolucao_compra/);
  assert.match(estoque,/-1000g/);
  await setModule(page,'hub');
  const hub=await page.locator('#module-content').innerText();
  assert.match(hub,/FIN-0001/);assert.match(hub,/FIN-0002/);
  await setModule(page,'relatorios');
  assert.match(await page.locator('#module-content').innerText(),/Devoluções formais de compras recebidas/);
  await setModule(page,'auditor');
  assert.match(await page.locator('#module-content').innerText(),/Observabilidade 2\.0/);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#top-revision')?.textContent.includes('Revisão local 7'));
  await setModule(page,'compras');
  assert.match(await page.locator('#module-content').innerText(),/DEV-MOBILE-001/);
  assert.deepEqual(errors,[]);
  assert.deepEqual(external,[]);
  console.log(engine.name(),width,'devolução persistida e conciliada sem rede');
 }finally{await context.close()}
}
(async()=>{
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+srv.address().port+'/';
 const browser=await engine.launch({headless:true});
 try{for(const w of [390,1280])await scenario(browser,url,w)}
 finally{await browser.close();await new Promise(resolve=>srv.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
