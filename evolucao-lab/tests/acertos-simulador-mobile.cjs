'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const uri=pathToFileURL(path.resolve(__dirname,'../acertos-simulador.html')).href;
const outDir=process.env.HLGB_SCREENSHOT_DIR||'/tmp';
async function validate(browser,width){
 const page=await browser.newPage({viewport:{width,height:830},deviceScaleFactor:1});
 const errors=[],remote=[];
 page.on('pageerror',e=>errors.push(String(e.message||e)));
 page.on('request',r=>{if(/^https?:/i.test(r.url()))remote.push(r.url())});
 try{
  await page.goto(uri,{waitUntil:'load'});
  assert.equal(await page.locator('#view-faccao').isVisible(),true);
  assert.match(await page.locator('#total').innerText(),/25,00/);
  assert.match(await page.locator('#gross').innerText(),/34,00/);
  assert.match(await page.locator('#remaining').innerText(),/3,00/);
  assert.match(await page.locator('#group-result').innerText(),/Nenhum dado foi salvo/);
  assert.equal(await page.getByRole('button',{name:'Salvar pagamento (bloqueado)'}).isDisabled(),true);
  await page.locator('#apply').fill('3,01');
  assert.match(await page.locator('#group-result').innerText(),/Compensação superior ao saldo/);
  assert.equal((await page.locator('#total').innerText()).trim(),'—');
  await page.locator('#apply').fill('3,00');
  assert.match(await page.locator('#total').innerText(),/25,00/);
  await page.locator('#motivo').fill('x');
  assert.match(await page.locator('#group-result').innerText(),/motivo/);
  await page.locator('#motivo').fill('Conferência de material');
  await page.locator('#abatimento').fill('0');
  await page.locator('#acrescimo').fill('0');
  await page.locator('#apply').fill('0');
  assert.match(await page.locator('#total').innerText(),/29,00/);
  await page.locator('#abatimento').fill('2,00');
  await page.locator('#acrescimo').fill('1,00');
  await page.locator('#apply').fill('3,00');
  assert.match(await page.locator('#total').innerText(),/25,00/);
  await page.locator('#tab-nota').click();
  assert.equal(await page.locator('#view-nota').isVisible(),true);
  assert.equal(await page.locator('#view-faccao').isVisible(),false);
  assert.match(await page.locator('#invoice-status').innerText(),/Parcial/);
  assert.match(await page.locator('#invoice-remaining').innerText(),/30,00/);
  assert.match(await page.locator('#invoice-before').innerText(),/40,00/);
  assert.equal(await page.getByRole('button',{name:'Registrar recebimento (bloqueado)'}).isDisabled(),true);
  await page.locator('#inv-next').fill('60,00');
  assert.match(await page.locator('#invoice-result').innerText(),/excede o saldo/);
  await page.locator('#inv-reversed').selectOption('yes');
  assert.match(await page.locator('#invoice-remaining').innerText(),/0,00/);
  assert.match(await page.locator('#invoice-status').innerText(),/Pago/);
  await page.locator('#inv-reversed').selectOption('no');
  await page.locator('#inv-credit').fill('0');
  assert.match(await page.locator('#invoice-status').innerText(),/Pago/);
  await page.locator('#inv-next').fill('20,00');
  assert.match(await page.locator('#invoice-remaining').innerText(),/40,00/);
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(dimensions.scroll<=dimensions.width+2,'rolagem horizontal na página '+width+': '+JSON.stringify(dimensions));
  assert.deepEqual(remote,[],'simulador não pode fazer acesso remoto');
  assert.deepEqual(errors,[],'erros JS');
  if(width===375){
   fs.mkdirSync(outDir,{recursive:true});
   await page.screenshot({path:path.join(outDir,'acertos-simulador-'+engine.name()+'-375.png'),fullPage:true});
  }
  console.log('PASS simulador '+engine.name()+' '+width+'px: acerto, parcelas, compensações e isolamento');
 }finally{await page.close()}
}
(async()=>{
 const browser=await engine.launch({headless:true});
 try{for(const w of [320,375,390,768,1280])await validate(browser,w)}
 finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
