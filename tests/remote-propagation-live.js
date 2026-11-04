// Use two authenticated storage states for disposable sessions entitled to edit Clients.
const {chromium}=require('playwright');
const fs=require('node:fs');
const {randomUUID}=require('node:crypto');
const assert=require('node:assert/strict');

async function openSession(browser,storageState){
 const fixture=!!process.env.HLGB_FIXTURE_KEY;
 const context=await browser.newContext(fixture?{}:{storageState});
 if(fixture){
  assert.equal(new URL(process.env.HLGB_TEST_URL).hostname,'127.0.0.1');
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname.endsWith('/app9240.html')&&u.hostname==='127.0.0.1'){
    const html=fs.readFileSync('app9240.html','utf8').replaceAll('https://huhrgvijgsshqlsnqeuz.supabase.co','http://127.0.0.1:54321')
      .replace(/const HLGB_SUPABASE_KEY="[^"]+"/,'const HLGB_SUPABASE_KEY='+JSON.stringify(process.env.HLGB_FIXTURE_KEY));
    return route.fulfill({contentType:'text/html',body:html});
   }
   if(u.hostname==='cdn.jsdelivr.net'&&u.pathname.includes('/@supabase/supabase-js@2'))
    return route.fulfill({contentType:'application/javascript',path:'node_modules/@supabase/supabase-js/dist/umd/supabase.js'});
   return u.hostname==='127.0.0.1'?route.continue():route.abort();
  });
 }
 const tab=await context.newPage();
 await tab.goto(process.env.HLGB_TEST_URL,{waitUntil:'domcontentloaded'});
 if(fixture){
  const email=storageState+'@example.test',password=randomUUID();
  const signup=await fetch('http://127.0.0.1:54321/auth/v1/signup',{method:'POST',
   headers:{apikey:process.env.HLGB_FIXTURE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  assert.ok(signup.ok,'Falha ao criar identidade de teste: '+signup.status);
  await tab.locator('#loginUser').fill(email);await tab.locator('#loginPass').fill(password);await tab.locator('#loginPass').press('Enter');
 }
 await tab.waitForFunction(()=>window.__HLGB_RESTORED_SESSION_READY||window.__HLGB_AUTH_READY===true);
 await tab.evaluate(()=>{if(window.__HLGB_RESTORED_SESSION_READY)window.__HLGB_RESTORED_SESSION_ENTER()});
 await tab.waitForFunction(()=>window.hlgbPropagation?.status().status==='SUBSCRIBED'&&hlgbRecordReady);
 await tab.evaluate(()=>page('clientes'));
 await tab.waitForSelector('#clientes.page.active #clientTable');
 return tab;
}
async function edit(sender,receiver,id,name){
 await sender.evaluate(id=>id==null?newClient():editClient(id),id);
 await sender.locator('#mname').fill(name);
 await sender.locator('#modal .modalSave').click();
 // All remaining observations on the receiver are read-only. No navigation or focus.
 await receiver.getByRole('cell',{name,exact:true}).waitFor({timeout:15000});
 const key=await sender.evaluate(name=>db.clients.find(c=>c.name===name)?.id,name);
 await sender.waitForFunction(id=>hlgbPropagation.status().lastConfirmed?.id===String(id),key);
 const capture=tab=>tab.evaluate(()=>hlgbPropagation.evidence(parts=>parts.join('/')));
 await receiver.waitForFunction(name=>Array.from(document.querySelectorAll("#clientTable td")).some(e=>e.textContent===name),name);
 const [a,b]=await Promise.all([capture(sender),capture(receiver)]);
 const result=await sender.evaluate(([a,b])=>hlgbPropagation.compare(a,b)?.forward,[a,b]);
 assert.ok(result,'Prova incompleta: '+JSON.stringify({a,b}));
 console.log(JSON.stringify({direction:id==null?'A → B':'B → A',...result}));
 return key;
}
(async()=>{
 const {HLGB_TEST_URL:url,HLGB_SESSION_A:a,HLGB_SESSION_B:b}=process.env;
 assert.ok(url&&(process.env.HLGB_FIXTURE_KEY||(a&&b&&a!==b)),'Configure HLGB_TEST_URL, HLGB_SESSION_A e HLGB_SESSION_B com sessões de teste distintas');
 const names=['HLGB-SYNC-TEST-'+randomUUID(),'HLGB-SYNC-TEST-'+randomUUID()];
 const browser=await chromium.launch();let sender,id;
 try{
  const [A,B]=await Promise.all([openSession(browser,a||'a'),openSession(browser,b||'b')]);sender=A;
  id=await edit(A,B,null,names[0]);await edit(B,A,id,names[1]);
 }finally{
  try{
   if(sender&&id==null)id=await sender.evaluate(names=>db.clients.find(c=>names.includes(c.name))?.id,names);
   if(id!=null)await sender.evaluate(async ({id,names})=>{
    const row=db.clients.find(c=>c.id===id);
    if(!names.includes(row?.name))throw Error('Registro de teste não identificado');
    const result=await hlgbRecordSaveWithRetry('clients',id,{...row,__hlgb_explicit_delete:true},true);
    if(!result?.applied)throw Error('Exclusão de teste não confirmada');
   },{id,names});
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
