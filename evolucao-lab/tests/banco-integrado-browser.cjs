'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{chromium,webkit}=require('playwright'),{start}=require('../banco-integrado/servidor.cjs'),db=require('../banco-integrado/persistencia.cjs');
test('interface completa em duas sessões, conflito, WAL e confirmação independente',async()=>{
 const server=await start(),url='http://127.0.0.1:'+server.address().port;const browser=await (process.env.HLGB_BROWSER==='webkit'?webkit:chromium).launch();
 try{
 const A=await browser.newContext(),B=await browser.newContext(),a=await A.newPage(),b=await B.newPage();
 async function login(page,actor){await page.goto(url);await page.locator('[name=actor]').selectOption(actor);await page.locator('[name=pin]').fill('demo-integrado-'+actor.toLowerCase());await page.locator('button').click();await page.locator('#remote-check').waitFor();}
 await login(a,'A');await login(b,'B');
 for(const page of [a,b])await page.locator('[data-module=pedidos]').click();
 const form=page=>page.locator('form[data-command="order.add"]');
 await form(a).locator('button[type=submit]').click();await a.waitForFunction(()=>document.querySelector('#top-revision').textContent.includes('Revisão servidor 2'));
 await form(b).locator('button[type=submit]').click();await b.waitForFunction(()=>document.body.innerText.includes('Servidor: conflict'));
 assert.equal((await db.state()).orders.length,1);
 // O rascunho permanece até a revisão manual. Releitura não repete o lançamento.
 await b.locator('#remote-check').click();await b.waitForFunction(()=>document.body.innerText.includes('not_found'));
 b.once('dialog',d=>d.accept());await b.locator('#remote-discard').click();await b.waitForFunction(()=>document.querySelector('#top-revision').textContent.includes('Revisão servidor 2'));
 await b.locator('[data-module=pedidos]').click();
 await b.route('**/api/commands',async route=>{if(route.request().method()==='POST'){await route.fetch();await route.abort();}else await route.continue();});
 await form(b).locator('button[type=submit]').click();await b.waitForFunction(()=>document.body.innerText.includes('Comando pendente'));
 await b.unroute('**/api/commands');await b.reload();await b.locator('#remote-check').waitFor();await b.locator('#remote-check').click();await b.waitForFunction(()=>document.querySelector('#top-revision').textContent.includes('Revisão servidor 3'));
 assert.equal((await db.state()).orders.length,2);
 await a.locator('#remote-check').click();await a.waitForFunction(()=>document.querySelector('#top-revision').textContent.includes('Revisão servidor 3'));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
