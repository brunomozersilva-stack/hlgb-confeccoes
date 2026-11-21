'use strict';
/* Smoke real em Chromium/WebKit do HTML autônomo GERADO.
 * A versão autônoma usa scripts embutidos; nenhuma API ou banco de produção.
 */
const assert=require('node:assert/strict');
const http=require('node:http');
const {chromium,webkit}=require('playwright');
const {build}=require('../build-operacao-autonoma.cjs');
const type=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
async function main(){
 const output=build();
 assert.ok(output.scripts.length>=40);
 const server=http.createServer((req,res)=>{
  if(req.url!=='/'){res.writeHead(404);res.end();return}
  res.writeHead(200,{'content-type':'text/html; charset=utf-8',
   'cache-control':'no-store',
   // Somente nesse servidor temporário de TESTE; scripts são embutidos no arquivo.
   'content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'"});
  res.end(output.html);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await type.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',req=>{if(!req.url().startsWith('http://127.0.0.1:'))external.push(req.url())});
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.waitForFunction(()=>!!window.HLGBLabSettlementHistoryFiltersV2&&
   !!window.HLGBLabSettlementPrintV1&&!!window.HLGBLabCutCapacityV1,
   null,{timeout:18000});
  await page.waitForFunction(()=>document.querySelector('#top-revision')?.textContent.includes('Revisão local'),
   null,{timeout:18000});
  assert.equal(await page.locator('[data-module]').count(),20);
  for(const id of ['acertos','pedidos','corte']){
   await page.locator('[data-module="'+id+'"]').click();
   await page.waitForFunction(id=>document.querySelector('[data-module="'+id+'"]')?.getAttribute('aria-current')==='page',id);
   const body=await page.locator('#module-content').innerText();
   assert.doesNotMatch(body,/Não foi possível exibir esta área/);
   if(id==='acertos'){
    assert.equal(await page.locator('#sett-hist-query').count(),1);
    await page.locator('#sett-hist-query').click();
    assert.match(await page.locator('#sett-hist-filter-result').innerText(),/acertos/);
   }
   if(id==='corte')assert.equal(await page.locator('#cut-capacity-run').count(),1);
  }
  assert.deepEqual(errors,[],'JavaScript sem erros durante navegação');
  assert.deepEqual(external,[],'Nenhuma conexão externa');
  console.log('PASS HTML autônomo '+process.env.HLGB_BROWSER+
   ': '+output.scripts.length+' módulos, 20 áreas, Acertos e Corte em 390px');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(err=>{console.error(err);process.exitCode=1;});
