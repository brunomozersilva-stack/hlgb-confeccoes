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
 await save(page,'settlement.add',{serviceType:'costura',factionId:'FAC-0001',productId:'PRO-0001',
  qty:10,unitCents:'3,00',travetaCents:'0,50',reason:'Serviço avulso fictício'});
 const form=page.locator('form[data-command="settlement.revise"]');
 assert.equal(await form.locator('[name="unitCents"]').inputValue(),'3,00');
 await save(page,'settlement.revise',{id:'ACE-0001',factionId:'FAC-0002',
  unitCents:'4,00',travetaCents:'0,50',reason:'Corrigir pessoa e preço'});
 assert.match(await page.locator('#module-content').innerText(),/35,00/);
 assert.match(await page.locator('#module-content').innerText(),/Corrigir pessoa e preço/);
 await open(page,'pedidos');
 await save(page,'order.add',{clientId:'CLI-0001',productId:'PRO-0001',P:10,M:0,G:0,GG:0});
 await open(page,'corte');await save(page,'cut.record',{orderId:'PED-0001',size:'P',qty:10});
 await open(page,'faccoes');
 await save(page,'faction.allocate',{orderId:'PED-0001',factionId:'FAC-0001',qty:10});
 await save(page,'faction.return',{orderId:'PED-0001',qty:4});
 await save(page,'faction.assignment.rate.set',{assignmentId:'ALO-0001',unitCents:'7,00',
  travetaCents:'1,00',reason:'Novo acordo para seis peças'});
 await save(page,'faction.return',{orderId:'PED-0001',qty:6});
 await open(page,'acertos');
 const acertos=await page.locator('#module-content').innerText();
 assert.match(acertos,/22,00/);assert.match(acertos,/36,00/);
 const revision=await rev(page);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(value=>Number((document.querySelector('#top-revision')?.textContent||'').match(/Revisão local (\d+)/)?.[1])===value,revision);
 await open(page,'faccoes');
 assert.match(await page.locator('#module-content').innerText(),/Novo acordo para seis peças/);
 await open(page,'acertos');
 assert.match(await page.locator('#module-content').innerText(),/Corrigir pessoa e preço/);
 assert.deepEqual(errors,[]);
 assert.deepEqual(external,[]);
 console.log(engine.name(),width,'correções e acordo de envio preservados no IndexedDB');
 }finally{await ctx.close()}
}
(async()=>{
 await new Promise(done=>srv.listen(0,'127.0.0.1',done));
 const url='http://127.0.0.1:'+srv.address().port+'/';
 const browser=await engine.launch({headless:true});
 try{for(const width of [390,1280])await exercise(browser,url,width)}
 finally{await browser.close();await new Promise(done=>srv.close(done))}
})().catch(e=>{console.error(e);process.exitCode=1});
