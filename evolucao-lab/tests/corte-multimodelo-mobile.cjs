'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const browserType=process.env.HLGB_BROWSER==='webkit'?webkit:chromium,root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const rel=req.url==='/'?'operacao-integrada.html':String(req.url).replace(/^\/+/, '');
 if(rel.includes('..')||!/^[a-zA-Z0-9._/-]+$/.test(rel)){res.writeHead(400);res.end();return}
 const pathname=path.join(root,rel);
 if(!pathname.startsWith(root+path.sep)||!fs.existsSync(pathname)){res.writeHead(404);res.end();return}
 res.writeHead(200,{'content-type':pathname.endsWith('.html')?'text/html;charset=utf-8':'text/javascript;charset=utf-8',
  'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'self' data: blob:; object-src 'none'",
  'cache-control':'no-store'});
 res.end(fs.readFileSync(pathname));
});
async function revision(page){
 return Number((await page.locator('#top-revision').innerText()).match(/Revisão local (\d+)/)?.[1]||0);
}
async function commit(page,form){
 const before=await revision(page);
 await form.locator('button[type=submit]').click();
 await page.waitForFunction(n=>Number(document.querySelector('#top-revision')?.textContent.match(/Revisão local (\d+)/)?.[1]||0)===n+1,before,{timeout:10000});
 assert.match(await page.locator('#flash').innerText(),/Salvo e confirmado por releitura local/);
}
async function visit(page,mod){
 await page.locator('[data-module="'+mod+'"]').click();
 await page.waitForFunction(m=>document.querySelector('[data-module="'+m+'"]')?.getAttribute('aria-current')==='page',mod);
}
async function run(browser,width,url){
 const ctx=await browser.newContext({viewport:{width,height:850}});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 page.on('dialog',d=>d.accept());
 try{
  await page.goto(url);await page.waitForFunction(()=>document.querySelector('#top-revision')?.textContent.includes('Revisão local 1'));
  await visit(page,'pedidos');
  const newOrder=page.locator('#multi-order-form');
  await newOrder.locator('[data-add-multi-model]').click();
  await newOrder.locator('#multi-new-size').fill('G2');
  await newOrder.locator('[data-add-multi-size]').click();
  const first=newOrder.locator('[data-multi-model]').nth(0),second=newOrder.locator('[data-multi-model]').nth(1);
  await first.locator('[name="size_PP"]').fill('3');
  await second.locator('[name="productId"]').selectOption('PRO-0002');
  await second.locator('[name="color"]').fill('Branco');
  await second.locator('[name="size_XG"]').fill('4');
  await second.locator('[name="size_M"]').fill('0');
  assert.match(await page.locator('#multi-order-preview').innerText(),/2 modelo/);
  await commit(page,newOrder);
  assert.match(await page.locator('#module-content').innerText(),/PDM-0001/);
  await visit(page,'corte');
  const creators=page.locator('form[data-command="multi.cut.plan"]');
  assert.equal(await creators.count(),2,'dois modelos com formulário de corte independente');
  await creators.nth(0).locator('xpath=ancestor::details').locator('summary').click();
  await creators.nth(0).locator('[data-mcut-color="Preto"][data-mcut-size="PP"]').fill('2');
  await commit(page,creators.nth(0));
  assert.match(await page.locator('#module-content').innerText(),/PCM-0001/);
  const nextCreators=page.locator('form[data-command="multi.cut.plan"]');
  await nextCreators.nth(1).locator('xpath=ancestor::details').locator('summary').click();
  await nextCreators.nth(1).locator('[data-mcut-color="Branco"][data-mcut-size="XG"]').fill('4');
  await commit(page,nextCreators.nth(1));
  assert.match(await page.locator('#module-content').innerText(),/PCM-0002/);
  const rev=page.locator('form[data-command="multi.cut.revise"]').first();
  await rev.locator('xpath=ancestor::details').locator('summary').click();
  await rev.locator('[data-mcut-color="Preto"][data-mcut-size="PP"]').fill('1');
  await commit(page,rev);
  await page.locator('form[data-command="multi.cut.cancel"] [name="id"]').selectOption('PCM-0002');
  await commit(page,page.locator('form[data-command="multi.cut.cancel"]'));
  assert.match(await page.locator('#module-content').innerText(),/cancelado/);
  await page.locator('form[data-command="multi.cut.complete"] [name="id"]').selectOption('PCM-0001');
  await commit(page,page.locator('form[data-command="multi.cut.complete"]'));
  assert.match(await page.locator('#module-content').innerText(),/concluido/);
  const snapshot=await revision(page);
  await page.reload();
  await page.waitForFunction(n=>Number(document.querySelector('#top-revision')?.textContent.match(/Revisão local (\d+)/)?.[1]||0)===n,snapshot);
  await visit(page,'corte');
  assert.match(await page.locator('#module-content').innerText(),/PCM-0001/);
  assert.match(await page.locator('#module-content').innerText(),/PCM-0002/);
  assert.equal(errors.length,0,'sem exceções no navegador: '+errors.join('; '));
  console.log('OK corte multimodelo: '+browserType.name()+' '+width+'px · pedido, dois modelos, revisão, cancelamento, conclusão e releitura.');
 }finally{await ctx.close();}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/',browser=await browserType.launch({headless:true});
 try{for(const width of [390,1180])await run(browser,width,url);}
 finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
