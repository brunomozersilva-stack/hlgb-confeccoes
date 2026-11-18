'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 http=require('node:http');
const {chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const root=path.resolve(__dirname,'..'),allowed=/^(?:modulos\/[a-z0-9-]+\.js|operacao-integrada-(?:core|ui)\.js)$/;
const srv=http.createServer((req,res)=>{
 const file=req.url==='/'?'operacao-integrada.html':decodeURIComponent(req.url||'').slice(1);
 if(file!=='operacao-integrada.html'&&!allowed.test(file)){res.writeHead(404);res.end();return}
 try{res.writeHead(200,{'content-type':file.endsWith('.html')?'text/html;charset=utf-8':'text/javascript;charset=utf-8',
  'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; object-src 'none'",
  'cache-control':'no-store'});
 res.end(fs.readFileSync(path.join(root,file)))}catch(e){res.writeHead(404);res.end()}
});
const rev=async page=>Number((await page.locator('#top-revision').innerText()).match(/Revisão local (\d+)/)?.[1]||0);
async function open(page,id){await page.locator('[data-module="'+id+'"]').click()}
async function save(page,type,fields){
 const form=page.locator('form[data-command="'+type+'"]'),before=await rev(page);
 assert.equal(await form.count(),1);
 for(const [name,val] of Object.entries(fields)){
  const field=form.locator('[name="'+name+'"]');
  if(await field.evaluate(el=>el.tagName==='SELECT'))await field.selectOption(String(val));
  else await field.fill(String(val));
 }
 await form.locator('button[type="submit"]').click();
 try{await page.waitForFunction(value=>
  Number((document.querySelector('#top-revision')?.textContent||'').match(/Revisão local (\d+)/)?.[1]||0)===value+1,
  before,{timeout:10000})}catch(e){throw Error(type+' falhou: '+await page.locator('#flash').innerText())}
 assert.match(await page.locator('#flash').innerText(),/Salvo e confirmado por releitura/);
}
async function exercise(browser,url,width){
 const ctx=await browser.newContext({viewport:{width,height:840},acceptDownloads:true});
 const page=await ctx.newPage(),errors=[],external=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('request',r=>{if(!r.url().startsWith(url))external.push(r.url())});
 try{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#top-revision')?.textContent.includes('Revisão local 1'));
 await open(page,'acertos');
 for(const qty of [10,20])await save(page,'settlement.add',{serviceType:'embalagem',
  factionId:'FAC-0001',productId:'PRO-0001',qty,unitCents:'0,25',travetaCents:'0,00',reason:'Exercício fictício'});
 await open(page,'hub');
 const close=page.locator('form[data-command="finance.faction.close"]');
 await close.locator('[name="reference"]').fill('PAG-PDF-TESTE');
 await close.locator('[name="reason"]').fill('Fechamento fictício');
 const before=await rev(page);
 page.once('dialog',dialog=>dialog.accept());
 await close.locator('button[type="submit"]').click();
 try{await page.waitForFunction(value=>Number((document.querySelector('#top-revision')?.textContent||'').match(/Revisão local (\d+)/)?.[1])===value+1,before,{timeout:10000});}
 catch(err){throw Error('Fechamento não gravou: '+await page.locator('#flash').innerText());}
 const makePdf=n=>Buffer.from('%PDF-1.4\n% EXERCICIO SEM DADOS REAIS '+n+'\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');
 async function attach(n){
  const form=page.locator('form[data-command="finance.receipt.attach"]'),r=await rev(page);
  assert.equal(await form.locator('[name="targetId"] option').count(),1);
  await form.locator('[name="targetId"]').selectOption('PAG-0001');
  await form.locator('[name="receiptFile"]').setInputFiles({name:'teste-'+n+'.pdf',mimeType:'application/pdf',buffer:makePdf(n)});
  await form.locator('[name="reason"]').fill('Comprovante de exemplo '+n);
  await form.locator('[name="fictitious"]').check();
  await form.locator('button[type="submit"]').click();
  try{await page.waitForFunction(value=>Number((document.querySelector('#top-revision')?.textContent||'').match(/Revisão local (\d+)/)?.[1])===value+1,r,{timeout:10000})}
  catch(e){throw Error('Anexo: '+await page.locator('#flash').innerText())}
 }
 await attach(1);await attach(2);
 const history=page.locator('#payment-receipt-history');
 assert.match(await history.innerText(),/Anterior/);assert.match(await history.innerText(),/Atual/);
 await page.locator('[data-filter-for="payment-receipt-history"]').fill('teste-1.pdf');
 assert.equal(await history.locator('tbody tr:visible').count(),1);
 const firstButton=history.locator('[data-receipt-download="CPV-0001"]');
 const dl=page.waitForEvent('download');await firstButton.click();const file=await dl;
 assert.equal(file.suggestedFilename(),'CPV-0001-FICTICIO-teste-1.pdf');
 assert.deepEqual(fs.readFileSync(await file.path()),makePdf(1));
 await open(page,'acertos');
 assert.equal(await page.locator('#settlement-table [data-receipt-download="CPV-0002"]').count(),2);
 const revision=await rev(page);await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(value=>Number((document.querySelector('#top-revision')?.textContent||'').match(/Revisão local (\d+)/)?.[1])===value,revision);
 await open(page,'hub');
 assert.match(await page.locator('#payment-receipt-history').innerText(),/teste-1.pdf/);
 assert.match(await page.locator('#payment-receipt-history').innerText(),/teste-2.pdf/);
 const jsonDl=page.waitForEvent('download');await page.locator('#export-json').click();
 const jsonFile=await jsonDl,report=JSON.parse(fs.readFileSync(await jsonFile.path(),'utf8'));
 assert.equal(report.receiptBinaryExported,false);
 assert.equal(report.data.paymentReceipts.length,2);
 assert.equal(JSON.stringify(report).includes('contentBase64'),false);
 assert.deepEqual(errors,[]);
 assert.deepEqual(external,[]);
 console.log(engine.name(),width,'comprovantes preservados, download e exportação sem conteúdo binário');
 }finally{await ctx.close()}
}
(async()=>{
 await new Promise(done=>srv.listen(0,'127.0.0.1',done));
 const url='http://127.0.0.1:'+srv.address().port+'/';
 const browser=await engine.launch({headless:true});
 try{for(const width of [390,1280])await exercise(browser,url,width)}
 finally{await browser.close();await new Promise(done=>srv.close(done))}
})().catch(e=>{console.error(e);process.exitCode=1});
