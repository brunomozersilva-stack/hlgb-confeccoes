'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/tests/cut-faction-traveta-v9521-fixture.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
   const id='1794489164896',numbers=[460,280,520,540,840,480,410,350];
   const names=['Body Ritinha','Camisola Leticia','Camisola Marcia','Fio Bianca','Fio Emily','Fio Jamile','Short Doll Yza','Tanga Nora'];
   const grade=names.map((_,i)=>({productId:i+1,color:'Preto',size:'P',qty:numbers[i]}));
   window.db.orders=[{id,orderNumber:49,client:'Click Sophia',grade:grade.map(x=>({...x}))}];
   window.db.products=names.map((name,i)=>({id:i+1,name}));
   const mk=(i,n)=>({id:n,orderId:id,productId:i+1,product:names[i],
    status:'Planejado',modelSplitChildV1:true,pieces:numbers[i],
    originalGrade:[{...grade[i]}],actualCutGrade:[{...grade[i]}]});
   window.db.cuts=[{id:'parent',orderId:id,status:'Desmembrado por modelo',modelSplitParentV1:true},
    ...names.map((_,i)=>mk(i,'cut-'+i)),
    mk(5,'duplicate-jamile'),mk(6,'duplicate-yza')];
   window.__alerts=[];
   window.alert=msg=>window.__alerts.push(String(msg));
   document.getElementById('cutTable').innerHTML='<table><tbody>'+
    '<tr id="legacy49"><td>PED-'+id+'</td><td>Click Sophia</td><td>Grade antiga do pedido</td></tr>'+
    '<tr id="unrelated"><td>PED-777</td><td>Outro cliente</td><td>Outro corte</td></tr>'+
    '</tbody></table>';
   window.hlgbCutModelSplit.renderSplitPanel();
  });
  assert.equal(await page.locator('#legacy49').evaluate(el=>el.style.display),'none',
   'must hide the old aggregate by first-column order ID');
  assert.notEqual(await page.locator('#unrelated').evaluate(el=>el.style.display),'none',
   'unrelated legacy orders stay visible');
  const panel=await page.locator('#hlgbCutSplitPanel').innerText();
  for(const name of ['Body Ritinha','Camisola Leticia','Camisola Marcia','Fio Bianca',
   'Fio Emily','Fio Jamile','Short Doll Yza','Tanga Nora'])assert(panel.includes(name));
  assert.match(panel,/8 modelo\\(s\\) para cortar/);
  assert.match(panel,/Cortes duplicados encontrados:.*Fio Jamile.*Short Doll Yza/s);
  assert.equal(await page.locator('#hlgbCutSplitPanel .hlgbAdjustSplitGradeBtn').count(),10);
  const before=await page.evaluate(()=>JSON.stringify(window.db));
  await page.evaluate(()=>window.hlgbFinishSplitCut('cut-5'));
  const after=await page.evaluate(()=>({db:JSON.stringify(window.db),alerts:window.__alerts,writes:window.__writes}));
  assert.equal(after.db,before,'duplicate protection must never alter company records');
  assert.equal(after.writes,0);
  assert(after.alerts.some(s=>/duplicados/i.test(s)),'duplicate finalize must be blocked');
  assert.deepEqual(errors,[]);
  console.log('PASS '+engine.name()+': Click Sophia #49 legacy aggregate hidden, 8 unique models, 2 duplicate warnings, no writes');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
