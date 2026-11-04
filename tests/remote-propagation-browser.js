// Offline receiver regression. Synthetic Postgres payloads exercise the application handler.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 try{
  const tab=await browser.newPage();
  await tab.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await tab.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded'});
  await tab.waitForFunction(()=>window.hlgbPropagation&&window.hlgbUiStabilityPending&&document.querySelector('#clientTable'));
  await tab.evaluate(()=>{
   document.querySelector('#appShell').style.setProperty('display','block','important');
   document.querySelector('#appShell').style.setProperty('visibility','visible','important');
   document.querySelector('#loginScreen').style.display='none';
   document.querySelectorAll('.page.active').forEach(el=>el.classList.remove('active'));
   document.querySelector('#clientes').classList.add('active');
   const panel=document.querySelector('#clientes');panel.style.cssText+=';display:block!important;height:400px;overflow:auto';
   const spacer=document.createElement('div');spacer.style.height='2500px';panel.appendChild(spacer);
   db.clients=[];hlgbRecordSnapshots.clients=new Map();renderClients();panel.scrollTop=150;
  });
  const scroll=await tab.evaluate(()=>document.querySelector('#clientes').scrollTop);
  assert.ok(scroll>0);
  const event=async(revision,name)=>tab.evaluate(async({revision,name})=>{
   await hlgbHandleRecordRealtime({eventType:'UPDATE',commit_timestamp:new Date().toISOString(),
    new:{module:'clients',entity_id:'191',revision,updated_at:new Date().toISOString(),data:{id:191,name}}});
  },{revision,name});
  await event(2,'HLGB-SYNC-TEST-a');await event(3,'HLGB-SYNC-TEST-b');await event(2,'stale');
  await tab.getByRole('cell',{name:'HLGB-SYNC-TEST-b',exact:true}).waitFor({timeout:10000});
  await tab.waitForFunction(async()=> (await hlgbPropagation.evidence(parts=>parts.join('/'))).probes.some(x=>x.revision===3&&x.visualAt));
  let state=await tab.evaluate(()=>({rev:hlgbRecordSnapshots.clients.get('191').revision,name:db.clients.find(c=>c.id===191).name,scroll:document.querySelector('#clientes').scrollTop}));
  assert.deepEqual(state,{rev:3,name:'HLGB-SYNC-TEST-b',scroll});
  await tab.evaluate(()=>{localStorage.setItem('hlgb_records_pending_v91',JSON.stringify({modules:{clients:[{id:191,data:{id:191,name:'draft'}}]}}));db.clients.find(c=>c.id===191).name='draft'});
  await event(4,'remote');assert.equal(await tab.evaluate(()=>db.clients.find(c=>c.id===191).name),'draft');
  console.log('PASS: latest revision visible without focus, scroll preserved, stale event ignored, pending draft preserved');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
