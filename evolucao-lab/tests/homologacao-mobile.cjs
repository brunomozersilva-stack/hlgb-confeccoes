'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium,webkit}=require('playwright');
const browserType=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const fileUrl=pathToFileURL(path.resolve(__dirname,'../homologacao-modulos.html')).href;
const screenshots=process.env.HLGB_SCREENSHOT_DIR||'/tmp';
const reportFileName='HLGB-HOMOLOGACAO-EVOLUCAO';
async function validate(browser,width){
 const page=await browser.newPage({viewport:{width,height:850},acceptDownloads:true});
 const errors=[],network=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(/^https?:/i.test(r.url()))network.push(r.url())});
 try{
  await page.goto(fileUrl,{waitUntil:'load'});
  assert.equal((await page.locator('#metric-total').innerText()).trim(),'76');
  assert.equal((await page.locator('#metric-demos').innerText()).trim(),'47');
  assert.equal(await page.locator('#module-nav .module').count(),20);
  assert.equal(await page.locator('#cases .case').count(),76);
  await page.locator('#module-nav button').filter({hasText:'Acertos e pagamentos avulsos'}).click();
  assert.equal(await page.locator('#cases .case').count(),10);
  await page.locator('#scope').selectOption('demo');
  assert.equal(await page.locator('#cases .case').count(),7);
  await page.locator('#scope').selectOption('all');
  await page.locator('#search').fill('comprovantes');
  assert((await page.locator('#cases .case').count())>=1);
  await page.locator('#search').fill('');
  const guide=page.locator('#cases .case').filter({hasText:'PAR-035'});
  await guide.getByRole('button',{name:'Ver roteiro e critérios'}).click();
  assert.match(await guide.locator('.details').innerText(),/Roteiro de teste/);
  assert.equal(await guide.locator('.steps li').count(),3);
  assert.match(await guide.locator('.details').innerText(),/Critérios de preservação/);
  const demoLink=guide.locator('.details a');
  assert.match(await demoLink.getAttribute('href'),/central-operacional-2.html/);
  const note=guide.locator('textarea');
  await note.fill('Prévia funcionando com dados fictícios, confirmar banco depois.');
  // Exportar sem clicar em salvar deve guardar o valor digitado, sem perder a sessão.
  await note.blur();
  await guide.locator('select.status-select').selectOption('passed');
  assert.equal((await page.locator('#metric-reviewed').innerText()).trim(),'1');
  const missing=page.locator('#cases .case').filter({hasText:'PAR-041'});
  await missing.locator('select.status-select').selectOption('missing');
  assert.equal((await page.locator('#metric-issues').innerText()).trim(),'1');
  const forbidden=await missing.locator('select.status-select option[value="passed"]').count();
  assert.equal(forbidden,0,'não pode aprovar demo que não existe');
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
  assert(download.suggestedFilename().startsWith(reportFileName));
  const report=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(report.schema,'hlgb-homologacao-relatorio-v1');
  assert.equal(report.productionApproval,false);
  assert.equal(report.counts.inventory,76);
  assert.equal(report.counts.evaluated,2);
  assert.equal(report.counts.issues,1);
  const saved=report.results.find(x=>x.caseId==='PAR-035');
  assert.equal(saved.status,'passed');
  assert.match(saved.notes,/banco depois/);
  const other=report.results.find(x=>x.caseId==='PAR-041');
  assert.equal(other.status,'missing');
  // O usuário confirma explicitamente a limpeza; nenhuma avaliação é apagada automaticamente.
  page.once('dialog',d=>d.accept());
  await page.locator('#clear').click();
  assert.equal((await page.locator('#metric-reviewed').innerText()).trim(),'0');
  await page.locator('#import-file').setInputFiles({name:'homologacao.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(report))});
  await page.waitForFunction(()=>document.querySelector('#metric-reviewed').textContent==='2');
  assert.equal((await page.locator('#metric-issues').innerText()).trim(),'1');
  await page.locator('#result-filter').selectOption('failed');
  assert.equal(await page.locator('#cases .case').count(),0);
  await page.locator('#result-filter').selectOption('missing');
  assert.equal(await page.locator('#cases .case').count(),1);
  await page.locator('#result-filter').selectOption('all');
  await page.locator('#show-issues').click();
  assert.equal(await page.locator('#cases .case').count(),1);
  await page.locator('#show-issues').click();
  assert.equal(await page.locator('#cases .case').count(),10);
  const dims=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(dims.scroll<=dims.width+2,'overflow '+width+' '+JSON.stringify(dims));
  assert.deepEqual(errors,[],'JS errors');
  assert.deepEqual(network,[],'No remote network');
  if(width===375){
    fs.mkdirSync(screenshots,{recursive:true});
    await page.locator('#module-nav button').first().click();
    await page.screenshot({path:path.join(screenshots,'homologacao-'+browserType.name()+'-375.png'),fullPage:true});
  }
  console.log('PASS homologação '+browserType.name()+' '+width+'px · 76 funcs, módulos, roteiro, falha, exportar/importar');
 }finally{await page.close()}
}
(async()=>{const browser=await browserType.launch({headless:true});try{for(const w of [320,375,390,768,1280])await validate(browser,w)}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
