'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium,webkit}=require('playwright');
(async()=>{const browser=await (process.env.HLGB_BROWSER==='webkit'?webkit:chromium).launch();try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());
  const html=fs.readFileSync('app9240.html','utf8'),at=html.indexOf('<section id="folhaPagamento" class="page">'),end=html.indexOf('</section>',at);assert(at>=0&&end>at);await page.setContent(html.slice(at,end+10).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  await page.evaluate(()=>{document.querySelector('#folhaPagamento').classList.add('active');window.__HLGB_AUTH_READY=false;window.__allow=true;window.canOpenPage=()=>window.__allow;window.cloudUser={id:'fixture-user'};window.db={hubFinanceEntries:[]};window.__calls=[];window.__profiles=[];window.__weeks=[];let seq=0;Object.defineProperty(window.crypto,'randomUUID',{configurable:true,value:()=>('12345678-1234-4234-8234-'+String(++seq).padStart(12,'0'))});window.cloudRequest=async(path,opt)=>{window.__calls.push(opt.method);const [table,query='']=path.split('?'),week=table.includes('_week_'),list=week?window.__weeks:window.__profiles;if(opt.method==='POST'){const row=JSON.parse(opt.body);if(list.some(x=>x.operation_id===row.operation_id))throw Error('duplicate operation');list.push({...row,created_at:'2026-11-23T00:00:00Z'});return [row]}const q=new URLSearchParams(query);if(window.__hideReadback&&q.has('operation_id'))return [];let rows=list.slice();for(const k of ['worker_id','week_friday','operation_id'])if(q.has(k))rows=rows.filter(x=>String(x[k])===q.get(k).slice(3));rows.sort((a,b)=>b.revision-a.revision);if(table.includes('_current_')){const seen=new Set();rows=rows.filter(x=>!seen.has(x.worker_id)&&seen.add(x.worker_id));}return rows.slice(Number(q.get('offset')||0),Number(q.get('offset')||0)+Number(q.get('limit')||100));};});
  for(const path of ['payroll-fifth-day-v9632.js','payroll-calendar-transport-workers-v9645.js','hub-personnel-forecast-reconcile-v9650.js','worker-registry-v9659.js','worker-registry-view-v9659.js'])await page.addScriptTag({path:'hlgb-modules/financeiro/'+path});
  await page.waitForTimeout(850);assert.equal(await page.locator('#hlgbWorkers9659').count(),0);
  await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'))});let box=page.locator('#hlgbWorkers9659');await box.getByText('Persistência desabilitada:',{exact:false}).waitFor();await box.getByRole('button',{name:'Salvar revisão do cadastro'}).click();assert.equal(await page.evaluate(()=>__calls.length),0);
  await page.evaluate(()=>{window.HLGB_WORKER_REGISTRY_ENABLED_9659=true;window.dispatchEvent(new Event('hlgb:authenticated'))});box=page.locator('#hlgbWorkers9659');await box.getByLabel('Nome',{exact:true}).fill('Pessoa fictícia');await box.getByLabel('Função',{exact:true}).fill('Costura');await box.getByLabel('Setor',{exact:true}).fill('Produção');await box.getByLabel('Início',{exact:true}).fill('2024-12-01');await box.getByLabel('Valor base em reais',{exact:true}).fill('100');await box.getByLabel('Passagem',{exact:true}).selectOption('yes');await box.getByLabel('Passagem por dia em reais',{exact:true}).fill('12');
  await box.getByRole('button',{name:'Salvar revisão do cadastro'}).click();await box.getByText('Cadastro confirmado por releitura · revisão 1',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>__profiles.length),1);
  await box.getByLabel('Sexta-feira de referência').fill('2025-01-03');await box.getByRole('button',{name:'Carregar revisão da semana'}).click();await box.getByText('Revisão carregada: 0.',{exact:false}).waitFor();await box.getByLabel('Dias efetivamente trabalhados').fill('4');await box.getByLabel('Dias com deslocamento',{exact:true}).fill('3');await box.getByRole('button',{name:'Calcular e conferir semana'}).click();await box.getByText('Efetivo informado:',{exact:false}).waitFor();await box.getByRole('button',{name:'Salvar conferência semanal'}).click();await box.getByText('Conferência semanal confirmada por releitura',{exact:false}).waitFor();assert.equal(await page.evaluate(()=>__weeks.length),1);
  await box.getByRole('button',{name:'Listar cadastros'}).click();await box.getByRole('button',{name:'Pessoa fictícia · Costura · Ativo'}).waitFor();await box.getByRole('button',{name:'Histórico do cadastro e semanas'}).click();await box.getByText('Últimas 50 revisões semanais (não somar versões)',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>db.hubFinanceEntries.length),0);
  // Force a missing ACK/readback after an actual mock insert. The same operation must remain pending.
  await page.evaluate(()=>window.__hideReadback=true);
  await box.getByLabel('Valor base em reais',{exact:true}).fill('110');
  await box.getByRole('button',{name:'Salvar revisão do cadastro'}).click();
  await box.getByText('Cadastro não confirmado:',{exact:false}).waitFor();assert.equal(await page.evaluate(()=>__profiles.length),2);
  const callsBefore=await page.evaluate(()=>__calls.length);
  page.once('dialog',dialog=>dialog.dismiss());
  await box.getByRole('button',{name:'Reabrir cadastro'}).click();
  assert.equal(await page.evaluate(()=>__calls.length),callsBefore);
  await page.evaluate(()=>window.__hideReadback=false);
  await box.getByRole('button',{name:'Salvar revisão do cadastro'}).click();
  await box.getByText('Cadastro confirmado por releitura · revisão 2',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>__profiles.length),2);
  await box.getByLabel('Sexta-feira de referência').fill('2025-01-03');
  await box.getByRole('button',{name:'Carregar revisão da semana'}).click();
  await box.getByText('Revisão carregada: 1.',{exact:false}).waitFor();
  await box.getByLabel('Dias efetivamente trabalhados').fill('5');
  await page.evaluate(()=>window.__hideReadback=true);
  await box.getByRole('button',{name:'Salvar conferência semanal'}).click();
  await box.getByText('Conferência não confirmada:',{exact:false}).waitFor();
  assert.equal(await page.evaluate(()=>__weeks.length),2);
  const priorCalls=await page.evaluate(()=>__calls.length);
  await box.getByRole('button',{name:'Salvar revisão do cadastro'}).click();
  await box.getByText('Há conferência semanal não confirmada.',{exact:false}).waitFor();
  assert.equal(await page.evaluate(()=>__calls.length),priorCalls);
  await page.evaluate(()=>window.__hideReadback=false);
  await box.getByRole('button',{name:'Salvar conferência semanal'}).click();
  await box.getByText('Conferência semanal confirmada por releitura',{exact:false}).waitFor();
  assert.equal(await page.evaluate(()=>__weeks.length),2);
  // Identity changes without an explicit logout event must discard the old panel.
  await page.evaluate(()=>{window.cloudUser={id:'other-fixture-user'};document.body.click()});
  await page.locator('#hlgbWorkers9659[data-actor="other-fixture-user"]').waitFor();
  assert.equal(await box.getByLabel('Nome',{exact:true}).inputValue(),'');assert.equal(await box.getByText('Pessoa fictícia · Costura · Ativo',{exact:true}).count(),0);
  await page.evaluate(()=>{window.__HLGB_AUTH_READY=false;window.dispatchEvent(new Event('hlgb:logout'))});assert.equal(await page.locator('#hlgbWorkers9659').count(),0);assert.deepEqual(errors,[]);await page.close();console.log('PASS fixture worker registry',width);
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
