'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const html=fs.readFileSync(path.join(__dirname,'../folha-homologacao.html'));
const screenshotDir=process.env.HLGB_SCREENSHOT_DIR||'/tmp/hlgb-folha';
const clean=str=>String(str).replace(/\s/g,'');
function server(){
 return http.createServer((req,res)=>{
  if(req.url!=='/'||req.method!=='GET'){res.writeHead(404);res.end('not found');return}
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'none'; object-src 'none'","cache-control":"no-store"});
  res.end(html);
 });
}
async function wait(page,text){
 try{await page.waitForFunction(t=>document.querySelector('#save-status')?.textContent.includes(t),text,{timeout:10000})}
 catch(e){throw Error('Expected '+text+', instead '+JSON.stringify(await page.locator('#save-status').innerText())+'; '+e.message)}
}
async function press(page,id,employee){
 const container=page.viewportSize().width<=710?'#employee-cards':'#employee-rows';
 await page.locator(container+' button[data-employee="'+employee+'"]').click();
}
async function change(page,field,value){await page.locator('#'+field).fill(value)}
async function save(page,description){
 await page.locator('#save').click();
 await wait(page,description||'Salvo e confirmado por releitura');
}
async function run(browser,width,base){
 const context=await browser.newContext({viewport:{width,height:850},acceptDownloads:true});
 const p=await context.newPage(),errors=[],unexpected=[];
 p.on('pageerror',e=>errors.push(String(e.message)));
 p.on('request',r=>{if(!r.url().startsWith(base))unexpected.push(r.url())});
 try{
  await p.goto(base);
  await wait(p,'Dados fictícios carregados');
  assert.equal((await p.locator('#metric-people').innerText()).trim(),'5');
  assert.match(clean(await p.locator('#metric-net').innerText()),/10\.280,00/);
  assert.match(clean(await p.locator('#metric-passage').innerText()),/550,00/);
  assert.match(clean(await p.locator('#metric-cost').innerText()),/12\.793,88/);
  assert.equal(await p.locator('#employee-rows tr').count(),5);
  await p.locator('#order').selectOption('sector');
  const first=await p.locator('#employee-rows tr').first().innerText();
  assert.match(first,/Daniela Modelo/);
  await p.locator('#search').fill('bianca');
  assert.equal(await p.locator('#employee-rows tr').count(),1);
  await p.locator('#search').fill('');
  await p.locator('#sector-filter').selectOption('Externa');
  assert.equal(await p.locator('#employee-rows tr').count(),2);
  await p.locator('#sector-filter').selectOption('all');
  await p.locator('#order').selectOption('alpha');
  await press(p,width,'FIC-002');
  assert.equal(await p.locator('#passage').inputValue(),'80,00');
  await change(p,'passage','140,00');
  assert.match(clean(await p.locator('#preview-passage').innerText()),/140,00/);
  await save(p);
  assert.match(clean(await p.locator('#metric-passage').innerText()),/610,00/);
  assert.match(clean(await p.locator('#metric-cost').innerText()),/12\.853,88/);
  assert.equal((await p.locator('#revision-label').innerText()).includes('2'),true);
  assert.match(await p.locator('#audit').innerText(),/Bianca Teste/);
  const savedOrder=await p.locator('#employee-rows tr').first().innerText();
  assert.match(savedOrder,/Ana Exemplo/);

  await p.reload();
  await wait(p,'Dados fictícios carregados');
  assert.match(clean(await p.locator('#metric-passage').innerText()),/610,00/);
  assert.equal(await p.locator('#employee-rows tr').count(),5);
  await press(p,width,'FIC-002');
  assert.equal(await p.locator('#passage').inputValue(),'140,00','IndexedDB must survive reload');

  // Duas abas reais do mesmo perfil de navegador, com IndexedDB compartilhado.
  const second=await context.newPage();
  await second.goto(base);
  await wait(second,'Dados fictícios carregados');
  await press(second,width,'FIC-001');
  await change(second,'salary','2.100,00');
  await save(second);
  assert.equal((await second.locator('#revision-label').innerText()).includes('3'),true);
  await change(p,'passage','160,00');
  await save(p,'Conflito detectado');
  assert.equal(await p.locator('#passage').inputValue(),'160,00','rascunho preservado');
  assert.equal(await p.locator('#review').isEnabled(),true);
  assert.equal(await p.locator('#save').isDisabled(),true);
  await p.locator('#review').click();
  await wait(p,'Base atualizada');
  assert.equal(await p.locator('#passage').inputValue(),'160,00');
  await save(p);
  assert.match(clean(await p.locator('#metric-passage').innerText()),/630,00/);

  await press(p,width,'FIC-003');
  assert.equal(await p.locator('#passage').inputValue(),'150,00');
  await change(p,'passage','170,00');
  await p.locator('#failure').selectOption('lost-readback');
  await save(p,'gravação pode ter ocorrido');
  assert.equal(await p.locator('#save').isDisabled(),true);
  assert.equal(await p.locator('#reconcile').isEnabled(),true);
  await p.locator('#reconcile').click();
  await wait(p,'Salvo e confirmado por releitura');
  assert.match(clean(await p.locator('#metric-passage').innerText()),/650,00/);
  assert.match(clean(await p.locator('#metric-net').innerText()),/10\.380,00/);
  assert.match(clean(await p.locator('#metric-cost').innerText()),/13\.013,32/);

  await press(p,width,'FIC-004');
  await change(p,'passage','-5,00');
  await save(p,'Informe um valor em reais');
  assert.equal((await p.locator('#revision-label').innerText()).includes('5'),true);
  await change(p,'passage','0,00');

  const [downJson]=await Promise.all([p.waitForEvent('download'),p.locator('#export-json').click()]);
  assert.equal(downJson.suggestedFilename(),'HLGB-EVOLUCAO-FOLHA-FICTICIA.json');
  const report=JSON.parse(fs.readFileSync(await downJson.path(),'utf8'));
  assert.equal(report.schema,'hlgb-evolucao-folha-demo-report-v1');
  assert.equal(report.productionApproval,false);
  assert.equal(report.environment,'browser-indexeddb-only');
  assert.equal(report.data.revision,5);
  assert.equal(report.data.history.length,4);
  assert.equal(new Set(report.data.history.map(x=>x.commandId)).size,4);
  assert.equal(report.data.employees.find(e=>e.id==='FIC-002').passage,16000);
  assert.equal(report.data.employees.find(e=>e.id==='FIC-003').passage,17000);
  assert.equal(report.totals.net,1038000);
  assert.equal(report.totals.passage,65000);
  assert.equal(report.totals.cost,1301332);
  assert(Object.values(report.checks).every(Boolean));
  const [downCsv]=await Promise.all([p.waitForEvent('download'),p.locator('#export-csv').click()]);
  assert.match(downCsv.suggestedFilename(),/FOLHA-FICTICIA\.csv/);
  const csv=fs.readFileSync(await downCsv.path(),'utf8');
  assert.match(csv,/Bianca Teste/);assert.match(csv,/FIC-002/);assert.match(csv,/16000/);

  p.once('dialog',d=>d.accept());
  await p.locator('#reset').click();
  await wait(p,'Exemplo restaurado');
  assert.match(clean(await p.locator('#metric-passage').innerText()),/550,00/);
  assert.equal((await p.locator('#revision-label').innerText()).includes('6'),true);
  const bounds=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  if(bounds.scroll>bounds.width+2){
   const offenders=await p.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>{
    const b=el.getBoundingClientRect(),st=getComputedStyle(el);
    return b.width>1&&b.right>innerWidth+2&&st.display!=='none'&&st.visibility!=='hidden';
   }).slice(0,20).map(el=>({tag:el.tagName,id:el.id,cls:el.className,
     text:(el.textContent||'').trim().slice(0,90),
     right:Math.round(el.getBoundingClientRect().right),width:Math.round(el.getBoundingClientRect().width)})));
   const overflowDetails=await p.evaluate(()=>{
    const x0=window.scrollX;
    window.scrollTo(999,0);
    const x1=window.scrollX;
    window.scrollTo(0,0);
    const root=document.documentElement,body=document.body;
    const candidates=[...document.querySelectorAll('*')].filter(el=>{
      const style=getComputedStyle(el);
      return (el.scrollWidth>el.clientWidth+3)&&style.display!=='none'&&el.clientWidth>0;
    }).slice(0,15).map(el=>({tag:el.tagName,id:el.id,cls:el.className,
      cw:el.clientWidth,sw:el.scrollWidth,scroll:getComputedStyle(el).overflowX}));
    return {root:{client:root.clientWidth,scroll:root.scrollWidth,overflow:getComputedStyle(root).overflowX},
      body:{client:body.clientWidth,scroll:body.scrollWidth},x0,x1,candidates};
   });
   throw Error('horizontal overflow '+width+': '+JSON.stringify(bounds)+' OFFENDERS '+JSON.stringify(offenders)+' DETAILS '+JSON.stringify(overflowDetails));
  }
  assert.deepEqual(errors,[],'No browser script failures');
  assert.deepEqual(unexpected,[],'No unexpected network activity');
  if(width===375){fs.mkdirSync(screenshotDir,{recursive:true});await p.screenshot({path:path.join(screenshotDir,'folha-homologacao-'+engine.name()+'-'+width+'.png'),fullPage:true})}
  await second.close();
  console.log('PASS folha '+engine.name()+' '+width+'px: passagem, custos, IndexedDB, 2 abas, conflito, auditoria, exportação');
 }finally{await context.close()}
}
(async()=>{
 const s=server();await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+s.address().port+'/';
 const browser=await engine.launch({headless:true});
 try{for(const w of [320,375,390,768,1280])await run(browser,w,url)}
 finally{await browser.close();await new Promise(resolve=>s.close(resolve))}
})().catch(err=>{console.error(err);process.exitCode=1});
