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
 for(const [qty,fac] of [[8,'FAC-0001'],[6,'FAC-0001'],[4,'FAC-0002']]){
  await save(page,'settlement.add',{serviceType:'embalagem',factionId:fac,productId:'PRO-0001',
   qty,unitCents:'1,00',travetaCents:'0,00',reason:'Conferência de serviço fictício'});
 }
 await open(page,'hub');
 const form=page.locator('form[data-command="finance.faction.close"]');
 assert.equal(await form.count(),1,'um fechamento consolidado para a facção com 2 acertos');
 assert.equal(await form.locator('[name="factionId"]').inputValue(),'FAC-0001');
 assert.equal(await form.locator('[name="financeIds"]').count(),2);
 assert.match(await page.locator('#module-content').innerText(),/14,00/);
 const old=await rev(page);
 await form.locator('[data-preview-faction]').click();
 assert.equal(await rev(page),old,'prévia não grava');
 assert.match(await page.locator('#flash').innerText(),/14,00/);
 await form.locator('[name="reference"]').fill('FECHA-A-01');
 await form.locator('[name="reason"]').fill('Conferência de dois acertos da mesma facção');
 await form.locator('button[type="submit"]').click();
 try{await page.waitForFunction(value=>
  Number((document.querySelector('#top-revision')?.textContent||'').match(/Revisão local (\d+)/)?.[1]||0)===value+1,
  old,{timeout:10000})}catch(e){throw Error('fechamento falhou: '+await page.locator('#flash').innerText())}
 assert.match(await page.locator('#flash').innerText(),/Salvo e confirmado por releitura/);
 const screen=await page.locator('#module-content').innerText();
 assert.match(screen,/PAG-0001/);assert.match(screen,/FECHA-A-01/);
 assert.equal(await page.locator('form[data-command="finance.faction.close"]').count(),0);
 await open(page,'acertos');
 const acertos=await page.locator('#module-content').innerText();
 assert.match(acertos,/pago/i);assert.match(acertos,/aberto/i);
 await open(page,'auditor');
 const auditor=await page.locator('#module-content').innerText();
 assert.match(auditor,/Observabilidade 2.0/);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#top-revision')?.textContent.includes('Revisão local 5'));
 await open(page,'hub');
 assert.match(await page.locator('#module-content').innerText(),/FECHA-A-01/);
 assert.deepEqual(errors,[]);
 assert.deepEqual(external,[]);
 console.log(engine.name(),width,'fechamento fictício persistiu no IndexedDB');
 }finally{await ctx.close()}
}
(async()=>{
 await new Promise(done=>srv.listen(0,'127.0.0.1',done));
 const url='http://127.0.0.1:'+srv.address().port+'/';
 const browser=await engine.launch({headless:true});
 try{for(const width of [390,1280])await exercise(browser,url,width)}
 finally{await browser.close();await new Promise(done=>srv.close(done))}
})().catch(e=>{console.error(e);process.exitCode=1});
