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
  assert.match(await root.innerText(),/Dossiê dos documentos originais/);
  for(const doc of ['COR-EXEMPLO-01','ENV-EXEMPLO-01','RET-EXEMPLO-01',
   'ACE-EXEMPLO-01','PAG-EXEMPLO-01','REC-EXEMPLO-01'])
   assert.match(await root.innerText(),new RegExp(doc));
  assert.match(await root.innerText(),/Fila de conferência antes de qualquer migração/);
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
  for(const part of ['DOCUMENTO_ORIGINAL','MAPA_MODELO','PENDENCIA','RET-EXEMPLO-01'])
   assert.match(report,new RegExp(part));
  assert.equal(await page.locator('#top-revision').innerText(),before,'exportar nao movimenta dados');
  await root.locator('#preflight-json-tools summary').click();
  await root.locator('#preflight-json-input').fill('{"legacy":');
  await root.locator('[data-preflight-import="json"]').click();
  assert.match(await page.locator('#flash').innerText(),/Prévia recusada/);
  assert.equal(await page.locator('#top-revision').innerText(),before,'JSON inválido não grava');
  const demo={legacy:{id:'LEG-FICTICIO',clientId:'CLI-TESTE',
    grade:[{productId:'MODELO-FICTICIO',color:'Preto',size:'P',qty:10}]},
   prepared:{id:'PDM-FICTICIO',clientId:'CLI-TESTE',sizes:['P'],
    items:[{id:'ITM-001',productId:'MODELO-FICTICIO',qty:10,priceCents:1000,
     amountCents:10000,colors:[{color:'Preto',grade:{P:10}}]}],
    totals:{pieces:10,amountCents:10000}},
   evidence:{orderId:'LEG-FICTICIO',cuts:[],allocations:[],settlements:[],finance:[]}};
  await root.locator('#preflight-json-input').fill(JSON.stringify(demo));
  await root.locator('[data-preflight-import="json"]').click();
  assert.match(await root.innerText(),/Minha prévia fictícia/);
  assert.match(await root.innerText(),/10 peças/);
  assert.equal(await root.locator('[data-preflight-example="personalizado"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#top-revision').innerText(),before,'JSON fictício não altera documento');
  await root.locator('#preflight-json-tools summary').click();
  await root.locator('[data-preflight-clear]').click();
  assert.equal(await root.locator('[data-preflight-example="personalizado"]').count(),0);
  assert.match(await root.innerText(),/150 peças/);
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
