'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium,webkit}=require('playwright');
const type=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const pageUrl=pathToFileURL(path.resolve(__dirname,'../guardiao-preservacao.html')).href;
const screenshots=process.env.HLGB_SCREENSHOT_DIR||'/tmp/hlgb-guardiao';
const parity=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../paridade-funcional.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../homologacao-modulos.html'),'utf8').match(/const catalog=(\{[\s\S]*?\});\n\(function\(\)/)[1]);
async function validate(browser,width){
 const page=await browser.newPage({viewport:{width,height:800},acceptDownloads:true});
 const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(String(e.message||e)));
 page.on('request',r=>{if(/^https?:/i.test(r.url()))requests.push(r.url())});
 try{
  await page.goto(pageUrl,{waitUntil:'load'});
  assert.equal((await page.locator('#metric-functions').innerText()).trim(),'76');
  assert.equal((await page.locator('#metric-p0').innerText()).trim(),'30');
  assert.equal((await page.locator('#metric-scenarios').innerText()).trim(),'43');
  assert.equal((await page.locator('#metric-approved').innerText()).trim(),'0/76');
  assert.equal(await page.locator('#modules button').count(),20);
  assert.equal(await page.locator('#cases .item').count(),76);
  assert.match(await page.locator('.notice').innerText(),/BLOQUEADA/);
  await page.locator('#filter-risk').selectOption('P0');
  assert.equal(await page.locator('#cases .item').count(),30);
  await page.locator('#filter-risk').selectOption('all');
  await page.locator('#filter-demo').selectOption('with');
  assert.equal(await page.locator('#cases .item').count(),47);
  await page.locator('#filter-demo').selectOption('without');
  assert.equal(await page.locator('#cases .item').count(),29);
  await page.locator('#filter-demo').selectOption('all');
  await page.locator('#search').fill('PAR-045');
  assert.equal(await page.locator('#cases .item').count(),1);
  assert.match(await page.locator('#cases .item').innerText(),/Hub/);
  await page.locator('#search').fill('');
  await page.locator('#modules button').filter({hasText:'Acertos e pagamentos avulsos'}).click();
  assert.equal(await page.locator('#cases .item').count(),10);
  await page.locator('#cases .item').first().locator('summary').click();
  assert.match(await page.locator('#cases .item').first().innerText(),/Exigências de liberação/);
  await page.locator('#modules button').first().click();
  const baseline=parity.baseline.branch+'@'+parity.baseline.sha;
  const createReport=(invalid)=>({
   schema:'hlgb-homologacao-relatorio-v1',baseline,productionApproval:false,
   results:catalog.cases.map((c,i)=>({caseId:c.id,moduleId:c.moduleId,status:invalid?'passed':(c.demo?'passed':(i===0?'missing':'not_started')),
      notes:'Conferir funcionalmente em homologação, não liberar pelo protótipo.'}))
  });
  await page.locator('#import-file').setInputFiles({name:'invalido.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(createReport(true)))});
  await page.waitForFunction(()=>document.querySelector('#import-status').textContent.includes('rejeitada'));
  assert.match(await page.locator('#import-status').innerText(),/rejeitada/i);
  assert.equal((await page.locator('#metric-approved').innerText()).trim(),'0/76');
  await page.locator('#import-file').setInputFiles({name:'avaliacoes.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(createReport(false)))});
  await page.waitForFunction(()=>document.querySelector('#import-status').textContent.includes('Importadas'));
  assert.match(await page.locator('#import-status').innerText(),/Importadas 48 avaliações/);
  assert.match(await page.locator('#import-status').innerText(),/BLOQUEADA/);
  await page.locator('#filter-demo').selectOption('with');
  assert.equal(await page.locator('#cases .item').count(),47);
  assert.match(await page.locator('#cases .item').first().innerText(),/Sua avaliação da prévia importada: passed/);
  await page.locator('#filter-demo').selectOption('all');
  const [jsonDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#export-json').click()]);
  assert.match(jsonDownload.suggestedFilename(),/HLGB-GUARDIAO-PRESERVACAO\.json/);
  const report=JSON.parse(fs.readFileSync(await jsonDownload.path(),'utf8'));
  assert.equal(report.schema,'hlgb-evolucao-release-gate-report-v1');
  assert.equal(report.publicationBlocked,true);
  assert.equal(report.releaseApproved,false);
  assert.equal(report.authorizedByUser,false);
  assert.equal(report.counts.functions,76);
  assert.equal(report.counts.modules,19);
  assert.equal(report.counts.priorityP0,30);
  assert.equal(report.counts.scenarios,43);
  assert.equal(report.counts.scenarioP0,27);
  assert.equal(report.counts.partialDemos,47);
  assert.equal(report.counts.fullParityApproved,0);
  assert.equal(report.counts.roadmapTotal,266);
  assert.equal(report.counts.roadmapHomologated,0);
  assert.equal(report.counts.previewEvaluations,48);
  assert.equal(report.blockers.length,76);
  assert(report.blockers.every(x=>x.requiredGates.length===8));
  const [csvDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#export-csv').click()]);
  const csv=fs.readFileSync(await csvDownload.path(),'utf8');
  assert.match(csv,/PAR-045/);assert.match(csv,/BLOQUEADA/);assert.match(csv,/Corte/);
  await page.locator('#reset-import').click();
  assert.match(await page.locator('#import-status').innerText(),/BLOQUEADA/);
  assert.equal((await page.locator('#metric-approved').innerText()).trim(),'0/76');
  const dims=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(dims.scroll<=dims.width+2,JSON.stringify(dims)+' horizontal overflow');
  assert.deepEqual(errors,[],'sem erro JS');
  assert.deepEqual(requests,[],'sem rede');
  if(width===375){
   fs.mkdirSync(screenshots,{recursive:true});
   await page.screenshot({path:path.join(screenshots,'guardiao-'+type.name()+'-375.png'),fullPage:true});
  }
  console.log('PASS guardiao '+type.name()+' '+width+'px: 76, P0, 43 cenarios, filtros, importacao insegura bloqueada, exportacao, release negado');
 }finally{await page.close()}
}
(async()=>{const browser=await type.launch({headless:true});try{for(const w of [320,375,390,768,1280])await validate(browser,w)}finally{await browser.close()}})().catch(err=>{console.error(err);process.exitCode=1});
