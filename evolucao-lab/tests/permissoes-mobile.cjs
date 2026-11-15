'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium,webkit}=require('playwright');
const browser=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const location=pathToFileURL(path.resolve(__dirname,'../permissoes/permissoes-mobile.html')).href;
const shots=process.env.HLGB_SCREENSHOT_DIR||'/tmp';
async function validate(instance,width){
 const page=await instance.newPage({viewport:{width,height:820},deviceScaleFactor:1});
 const errors=[],remote=[];
 page.on('pageerror',err=>errors.push(err.message||String(err)));
 page.on('request',req=>{if(/^https?:/i.test(req.url()))remote.push(req.url())});
 try{
  await page.goto(location,{waitUntil:'load'});
  assert.match(await page.locator('#role-summary').textContent(),/Financeiro/);
  assert.equal(await page.locator('#operations .item').count(),4);
  assert.equal(await page.locator('#operations button:not([disabled])').count(),3);
  await page.locator('#operations button:not([disabled])').first().click();
  assert.match(await page.locator('#action-result').textContent(),/banco real não foi acessado/);
  const roles=[['viewer',1],['operation',1],['finOther',2],['inactive',0],['anon',0],['finB',3]];
  for(const [role,count] of roles){
   await page.locator('#role').selectOption(role);
   assert.equal(await page.locator('#operations button:not([disabled])').count(),count,role);
  }
  await page.locator('#role').selectOption('finOther');
  assert.match(await page.locator('#role-summary').textContent(),/Empresa B/);
  assert.equal(await page.locator('#operations .item').first().locator('button').isDisabled(),true);
  await page.locator('#role').selectOption('finA');
  const dimensions=await page.evaluate(()=>({inner:window.innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(dimensions.scroll<=dimensions.inner+2,JSON.stringify(dimensions));
  assert.deepEqual(errors,[],'erros JS');
  assert.deepEqual(remote,[],'requisições remotas');
  const storage=await page.evaluate(()=>{try{return localStorage.length+sessionStorage.length}catch{return 0}});
  assert.equal(storage,0,'nenhum estado persistente');
  if(width===375){
   fs.mkdirSync(shots,{recursive:true});
   await page.screenshot({path:path.join(shots,'permissoes-mobile-'+browser.name()+'-375.png'),fullPage:true});
  }
  console.log('PASS perfis '+browser.name()+' '+width+'px: 7 perfis, bloqueios, mobile, offline');
 }finally{await page.close()}
}
(async()=>{const instance=await browser.launch({headless:true});try{for(const w of [320,375,390,768,1280])await validate(instance,w)}finally{await instance.close()}})().catch(e=>{console.error(e);process.exitCode=1});
