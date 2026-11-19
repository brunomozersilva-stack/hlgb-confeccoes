'use strict';
/* Teste LOCAL: duas abas compartilham IndexedDB; um outro contexto não compartilha.
 * Isso NÃO comprova sincronização Safari↔Chrome ou entrega no servidor. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright'),browserType=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const file=req.url==='/'?'operacao-integrada.html':String(req.url||'').replace(/^\/+/,'');
 if(!/^(?:operacao-integrada(?:\.html|-(?:ui|core)\.js)|modulos\/[a-z0-9-]+\.js)$/.test(file)){
  res.writeHead(404);res.end();return;
 }
 const full=path.join(root,file);
 try{
  const data=fs.readFileSync(full);
  res.writeHead(200,{'content-type':file.endsWith('.html')?'text/html;charset=utf-8':'text/javascript;charset=utf-8',
   'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'self' data: blob:; object-src 'none'",
   'cache-control':'no-store'});
  res.end(data);
 }catch(e){res.writeHead(404);res.end();}
});
const revision=async page=>Number((await page.locator('#top-revision').innerText()).match(/Revisão local (\d+)/)?.[1]||0);
const modulePage=async(page,id)=>{await page.locator('[data-module="'+id+'"]').click();
 await page.waitForFunction(x=>document.querySelector('[data-module="'+x+'"]')?.getAttribute('aria-current')==='page',id);};
const localDoc=page=>page.evaluate(()=>new Promise((resolve,reject)=>{
 const request=indexedDB.open('HLGB_EVOLUCAO_OPERACAO_INTEGRADA_FICTICIA_V1',2);
 request.onsuccess=()=>{const db=request.result,tx=db.transaction('documentos','readonly'),
  result=tx.objectStore('documentos').get('operacao-ficticia');
  result.onsuccess=()=>{resolve(result.result?.data||null);db.close();};
  result.onerror=()=>reject(result.error);
 };
 request.onerror=()=>reject(request.error);
}));
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/';
 const browser=await browserType.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:840},acceptDownloads:true});
 const isolated=await browser.newContext({viewport:{width:1280,height:840}});
 const a=await context.newPage(),b=await context.newPage(),c=await isolated.newPage(),errors=[],remote=[];
 for(const p of [a,b,c]){
  p.on('pageerror',e=>errors.push(e.message));
  p.on('request',r=>{if(!r.url().startsWith(url))remote.push(r.url())});
 }
 try{
  await Promise.all([a.goto(url),b.goto(url),c.goto(url)]);
  await Promise.all([a,b,c].map(p=>p.waitForFunction(()=>
   document.querySelector('#top-revision')?.textContent.includes('Revisão local 1'))));
  await modulePage(a,'pedidos');await modulePage(b,'pedidos');
  await b.locator('form[data-command="order.add"] [name="M"]').fill('8');
  const create=a.locator('form[data-command="order.multi.create"]');
  await create.locator('button[type=submit]').click();
  await a.waitForFunction(()=>document.querySelector('#top-revision')?.textContent.includes('Revisão local 2'));
  let s=await localDoc(a);
  assert.equal(s.multiOrders.length,1);
  assert.equal(s.multiOrders[0].id,'PDM-0001');
  assert.equal(s.finance.length,0);
  assert.equal(await revision(b),1,'Outra aba tem cópia obsoleta até atualizar');

  // B não pode substituir o documento 2 com sua revisão 1.
  await b.locator('form[data-command="order.add"] button[type=submit]').click();
  await b.waitForFunction(()=>document.querySelector('#flash')?.textContent.includes('CONFLITO'));
  assert.equal(await b.locator('form[data-command="order.add"] [name="M"]').inputValue(),'8',
   'Rascunho da funcionária continua legível após conflito');
  assert.equal(await revision(b),1,'Conflito não é confirmação local');
  s=await localDoc(b);
  assert.equal(s.revision,2);
  assert.equal(s.orders.length,0,'Operação concorrente não foi salva por engano');
  assert.equal(s.multiOrders.length,1,'Primeiro pedido permanece salvo uma única vez');

  // Releitura manual B vê o lançamento A, sem reproduzi-lo.
  await b.locator('#refresh').click();
  await b.waitForFunction(()=>document.querySelector('#top-revision')?.textContent.includes('Revisão local 2'));
  assert.match(await b.locator('#module-content').innerText(),/PDM-0001/);
  await b.locator('form[data-command="order.add"] [name="M"]').fill('8');
  await b.locator('form[data-command="order.add"] button[type=submit]').click();
  await b.waitForFunction(()=>document.querySelector('#top-revision')?.textContent.includes('Revisão local 3'));
  s=await localDoc(a);
  assert.equal(s.revision,3);
  assert.equal(s.orders.length,1);
  assert.equal(s.multiOrders.length,1);
  assert.equal(s.finance.filter(x=>x.sourceId===s.orders[0].id).length,1,
   'Pedido legado criou um título único; multimodelo não duplicou pagamento');

  // Aba A ainda em revisão 2 não pode alterar a revisão 3.
  await create.locator('button[type=submit]').click();
  await a.waitForFunction(()=>document.querySelector('#flash')?.textContent.includes('CONFLITO'));
  assert.equal(await revision(a),2);
  s=await localDoc(a);
  assert.equal(s.revision,3);
  assert.equal(s.multiOrders.length,1);

  // Navegador ou perfil isolado usa OUTRO IndexedDB: não alegar que chegou ao servidor.
  assert.equal(await revision(c),1);
  const separate=await localDoc(c);
  assert.equal(separate.multiOrders.length,0);
  assert.equal(separate.orders.length,0);
  await a.reload();await a.waitForFunction(()=>
   document.querySelector('#top-revision')?.textContent.includes('Revisão local 3'));
  assert.equal((await localDoc(a)).multiOrders.length,1,'Reabertura mantém lançamento no mesmo navegador');
  assert.deepEqual(errors,[]);
  assert.deepEqual(remote,[],'Interface estática não deve acessar servidor');
  console.log('PASS '+browserType.name()+' duas abas IndexedDB: conflito, releitura, replay único, isolamento entre navegadores');
 }finally{
  await context.close();await isolated.close();await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
