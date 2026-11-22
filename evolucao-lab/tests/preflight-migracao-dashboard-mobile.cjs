'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),
 path=require('node:path'),{chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),browserType=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const html=fs.readFileSync(path.join(root,'operacao-integrada.html'),'utf8');
const scripts=[...html.matchAll(/<script\s+src="\.\/([^"]+)"\s*><\/script>/g)].map(x=>x[1]);
const files=new Set(['operacao-integrada.html',...scripts]);
const server=http.createServer((req,res)=>{
 const id=req.url==='/'?'operacao-integrada.html':req.url.slice(1);
 if(!files.has(id)){res.writeHead(404);res.end();return;}
 try{
  const b=fs.readFileSync(path.join(root,id));
  res.writeHead(200,{'content-type':id.endsWith('.html')?'text/html;charset=utf-8':'text/javascript;charset=utf-8',
   'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'self' data: blob:; object-src 'none'",
   'cache-control':'no-store'});
  res.end(b);
 }catch(error){res.writeHead(404);res.end();}
});
async function run(browser,url,width){
 const ctx=await browser.newContext({viewport:{width,height:820},acceptDownloads:true}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(url);
  await page.waitForFunction(()=>document.querySelector('#top-revision')?.textContent.includes('Revisão local 1'));
  await page.locator('[data-module="auditor"]').click();
  const root=page.locator('#migration-preflight-root');
  assert.equal(await root.count(),1,'prévia dentro do Auditor existente');
  const before=await page.locator('#top-revision').innerText();
  assert.match(await root.innerText(),/MIGRAÇÃO BLOQUEADA/);
  assert.match(await root.innerText(),/150 peças/);
  assert.match(await root.innerText(),/Cadeia completa fictícia/);
  for(const [scenario,text] of [
   ['duplicado','FINANCEIRO DIVERGENTE'],
   ['divergente','GRADE OU CLIENTE DIVERGENTE'],
   ['semprovas','COLECAO NAO CONFERIDA'],
   ['documentado','MIGRAÇÃO BLOQUEADA']]){
   await root.locator('[data-preflight-example="'+scenario+'"]').click();
   assert.equal(await root.locator('[data-preflight-example="'+scenario+'"]').getAttribute('aria-pressed'),'true');
   assert.match(await root.innerText(),new RegExp(text));
   assert.equal(await page.locator('#top-revision').innerText(),before,'consulta não grava');
  }
  await root.locator('[data-preflight-example="divergente"]').click();
  const saved=page.waitForEvent('download');
  await root.locator('[data-preflight-export="csv"]').click();
  const csv=await saved;
  assert.match(csv.suggestedFilename(),/^HLGB-PRE-MIGRACAO-FICTICIA-divergente\.csv$/);
  const report=fs.readFileSync(await csv.path(),'utf8');
  assert.match(report,/MIGRACAO_BLOQUEADA/);
  assert.match(report,/DIFERENCA_GRADE/);
  assert.match(report,/GRADE_OU_CLIENTE_DIVERGENTE/);
  assert.equal(await page.locator('#top-revision').innerText(),before,'exportar nao movimenta dados');
  await page.locator('[data-module="pedidos"]').click();
  await page.locator('[data-module="auditor"]').click();
  assert.match(await page.locator('#migration-preflight-root').innerText(),/MIGRAÇÃO BLOQUEADA/);
  assert.deepEqual(errors,[]);
  console.log('PASS pré-migração fictícia no Auditor, '+width+'px, '+browserType.name());
 }finally{await ctx.close();}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await browserType.launch();
 try{
  for(const width of [390,1280])
   await run(browser,'http://127.0.0.1:'+server.address().port+'/',width);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
