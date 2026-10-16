const { webkit } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req,res)=>{
  const p = req.url === '/' ? '/tests/auditor-v9370-fixture.html' : req.url.split('?')[0];
  const file = path.join(root, p.replace(/^\//,''));
  if(!file.startsWith(root) || !fs.existsSync(file)){res.statusCode=404;return res.end('not found')}
  res.setHeader('content-type', file.endsWith('.js')?'application/javascript':'text/html');
  res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(r=>server.listen(4174,'127.0.0.1',r));
  const browser = await webkit.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4174/');
  await page.click('#acao');
  const out = await page.evaluate(async()=>{
    const data = await window.hlgbAuditorSmartProblem();
    return {
      eventCount:data.events?.length||0,
      types:(data.events||[]).map(x=>x.type),
      captureMeta:data.captureMeta||null,
      hasSnapshot:typeof window.hlgbAuditorSmart?.eventsSnapshot==='function',
      rendered:window.__rendered===true
    };
  });
  if(out.eventCount < 2) throw new Error('Linha do tempo não foi anexada: '+JSON.stringify(out));
  if(!out.types.includes('ui-action')) throw new Error('Clique anterior não entrou no diagnóstico: '+JSON.stringify(out));
  if(!out.types.includes('problem-capture-start')) throw new Error('Início da captura não entrou no diagnóstico: '+JSON.stringify(out));
  if(!out.captureMeta || out.captureMeta.timelineVersion!=='93.70') throw new Error('Metadados v93.70 ausentes: '+JSON.stringify(out));
  if(!out.hasSnapshot || !out.rendered) throw new Error('Integração com Safari download incompleta: '+JSON.stringify(out));
  console.log('auditor v93.70 events WebKit OK', out);
  await browser.close();server.close();
})().catch(async e=>{console.error(e);server.close();process.exit(1)});
