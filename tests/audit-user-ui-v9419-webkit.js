const {webkit}=require('playwright');

(async()=>{
  const browser=await webkit.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));

  await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell')&&!!window.hlgbProductCatalog9419&&!!window.hlgbPayrollView9295&&!!window.hlgbNightUi?.cleanTopbar,null,{timeout:60000});

  await page.evaluate(()=>{
    window.__hlgbUi9419Trace=[];
    const snap=reason=>{try{window.__hlgbUi9419Trace.push({at:Date.now(),reason,active:[...document.querySelectorAll('#appShell .page.active')].map(x=>x.id),catalogActive:document.getElementById('productCatalog9419')?.classList.contains('active')||false,authReady:window.__HLGB_AUTH_READY===true,release:String(window.HLGB_RELEASE_VERSION||'')})}catch(e){}};
    window.__hlgbUi9419Snap=snap;
    const obs=new MutationObserver(rs=>{for(const r of rs){if(r.type==='attributes'&&r.attributeName==='class'&&r.target?.classList?.contains('page'))snap('class:'+String(r.target.id||''))}});
    obs.observe(document.getElementById('appShell'),{subtree:true,attributes:true,attributeFilter:['class']});
    window.__hlgbUi9419Observer=obs;snap('trace-start');
    document.documentElement.classList.add('hlgb-login-confirmed-9407');
    window.__HLGB_AUTH_READY=true;
    const login=document.getElementById('loginScreen');if(login)login.style.setProperty('display','none','important');
    const app=document.getElementById('appShell');if(app){app.style.setProperty('display','block','important');app.style.setProperty('visibility','visible','important');app.style.setProperty('opacity','1','important')}
    const root=document.documentElement;
    root.style.setProperty('--byh-photo','linear-gradient(135deg,#6b1d33,#d7a0b2)');
    root.style.setProperty('--byh-photo-visual-opacity','0.35');
    window.dispatchEvent(new Event('hlgb:authenticated'));
    window.hlgbNightUi.cleanTopbar();snap('after-auth');
  });

  await page.waitForFunction(()=>!!document.getElementById('hlgbTopbarHost9253')&&!!document.getElementById('hlgbTopbarActionsBtn9253'),null,{timeout:10000});
  await page.waitForTimeout(250);

  const shellVisual=await page.evaluate(()=>{
    const app=document.getElementById('appShell'),cloud=document.getElementById('cloudStatus'),header=document.querySelector('#appShell>header');
    const before=getComputedStyle(app,'::before'),cr=cloud?.getBoundingClientRect(),hr=header?.getBoundingClientRect();
    return {
      backgroundSize:before.backgroundSize,
      backgroundPosition:before.backgroundPosition,
      pseudoPosition:before.position,
      cloudText:String(cloud?.textContent||'').trim(),
      cloudWidth:cr?.width||0,
      cloudRight:cr?.right||0,
      headerRight:hr?.right||0,
      topbarHost:!!document.getElementById('hlgbTopbarHost9253'),
      topbarMenu:!!document.getElementById('hlgbTopbarActionsBtn9253')
    };
  });
  if(shellVisual.backgroundSize!=='cover'||shellVisual.pseudoPosition!=='fixed')throw new Error('Fundo não ocupa o shell inteiro: '+JSON.stringify(shellVisual));
  if(shellVisual.cloudWidth<=0||shellVisual.cloudWidth>110||!shellVisual.topbarHost||!shellVisual.topbarMenu)throw new Error('Status da nuvem ainda invade o topbar: '+JSON.stringify(shellVisual));
  if(shellVisual.cloudRight>shellVisual.headerRight+1)throw new Error('Status da nuvem saiu do cabeçalho: '+JSON.stringify(shellVisual));

  // Catálogo normal: usa somente o db.products em memória; nenhuma persistência é acionada.
  await page.evaluate(()=>{
    const d=window.eval('db');
    d.products=[
      {id:9419001,name:'Camisola Romantic',code:'ROM-01',category:'Camisolas',material:'Renda e microfibra',price:24.9,sizes:['P','M','G','GG'],colors:['Preto','Rubi']},
      {id:9419002,name:'Conjunto Cereja',code:'CER-02',category:'Conjuntos',material:'Renda',price:19.9,sizes:['M','G','GG'],colors:['Branco','Rubi']}
    ];
    window.hlgbProductCatalog9419.install();
    window.hlgbProductCatalog9419.render();
    const b=document.getElementById('hlgbProductCatalogNav9419');
    window.__hlgbUi9419Snap?.('catalog-before-open');
    window.hlgbProductCatalog9419.open(b);
    window.__hlgbUi9419Snap?.('catalog-after-open');
    [20,50,100,200,400,800,1200,2000,4000].forEach(ms=>setTimeout(()=>window.__hlgbUi9419Snap?.('catalog+'+ms),ms));
  });
  try{await page.waitForSelector('#productCatalog9419.active',{state:'visible',timeout:6000})}catch(e){const trace=await page.evaluate(()=>window.__hlgbUi9419Trace||[]);throw new Error('Catálogo perdeu active durante pós-login. TRACE='+JSON.stringify(trace.slice(-120))) }
  await page.waitForTimeout(1200);
  const catalogStillActive=await page.evaluate(()=>document.getElementById('productCatalog9419')?.classList.contains('active'));
  if(!catalogStillActive){const trace=await page.evaluate(()=>window.__hlgbUi9419Trace||[]);throw new Error('Catálogo abriu e depois perdeu active. TRACE='+JSON.stringify(trace.slice(-120)))}
  await page.waitForSelector('#hlgbCatGrid9419 .hlgb-cat9419-card',{state:'visible',timeout:10000});
  const catalog=await page.evaluate(()=>({
    nav:String(document.getElementById('hlgbProductCatalogNav9419')?.textContent||'').trim(),
    cards:document.querySelectorAll('#hlgbCatGrid9419 .hlgb-cat9419-card').length,
    text:String(document.getElementById('hlgbCatGrid9419')?.innerText||'')
  }));
  if(catalog.nav!=='Catálogo de produtos'||catalog.cards!==2||!/Camisola Romantic/.test(catalog.text)||!/Conjunto Cereja/.test(catalog.text))throw new Error('Catálogo normal incompleto: '+JSON.stringify(catalog));
  await page.screenshot({path:'/tmp/hlgb-v9419-catalogo-webkit.png',fullPage:true});

  // Folha: renderiza duas linhas em memória para validar a hierarquia visual dos controles.
  await page.evaluate(()=>{
    const d=window.eval('db');
    d.employees=[
      {id:9419101,name:'Funcionária Pendente',companyName:'HLGB',salary:1600,pix:'chave-pendente'},
      {id:9419102,name:'Funcionária Paga',companyName:'HLGB',salary:1700,pix:'chave-paga'}
    ];
    const month=document.getElementById('payrollMonth')?.value||new Date().toISOString().slice(0,7);
    d.payroll=[
      {id:9419201,employeeId:9419101,employeeName:'Funcionária Pendente',companyName:'HLGB',month,salary:1600,paid:false,pix:'chave-pendente'},
      {id:9419202,employeeId:9419102,employeeName:'Funcionária Paga',companyName:'HLGB',month,salary:1700,paid:true,pix:'chave-paga'}
    ];
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
    const folha=document.getElementById('folhaPagamento');if(folha)folha.classList.add('active');
    window.hlgbPayrollView9295.setStatus('all');
    window.hlgbPayrollView9295.render();
  });
  await page.waitForSelector('#payrollTable .hlgb-payroll-status-row',{state:'visible',timeout:10000});
  const payroll=await page.evaluate(()=>{
    const rows=[...document.querySelectorAll('#payrollTable .hlgb-payroll-status-row')];
    return {
      rows:rows.length,
      statusCells:document.querySelectorAll('#payrollTable .payroll-status-cell').length,
      payActions:[...document.querySelectorAll('#payrollTable .payroll-pay-action')].map(x=>String(x.textContent||'').trim()),
      toolGroups:document.querySelectorAll('#payrollTable .payroll-row-tools').length,
      toolButtons:[...document.querySelectorAll('#payrollTable .payroll-row-tools button')].map(x=>String(x.textContent||'').trim())
    };
  });
  if(payroll.rows!==2||payroll.statusCells!==2||payroll.toolGroups!==2||!payroll.payActions.some(x=>/Marcar pago/.test(x))||!payroll.payActions.some(x=>/Reabrir/.test(x))||!payroll.toolButtons.some(x=>/Editar/.test(x))||!payroll.toolButtons.some(x=>/Excluir/.test(x)))throw new Error('Folha visualmente desorganizada/incompleta: '+JSON.stringify(payroll));
  await page.screenshot({path:'/tmp/hlgb-v9419-folha-webkit.png',fullPage:true});

  const relevant=errors.filter(x=>/9419|catalog|payroll|topbar|cloud|background|produto|folha/i.test(x));
  if(relevant.length)throw new Error('pageerror relacionado ao v94.19: '+relevant.join(' | '));
  console.log('HLGB_USER_UI_WEBKIT_V9419_OK',JSON.stringify({shellVisual,catalog,payroll,trace:(await page.evaluate(()=>window.__hlgbUi9419Trace||[])).slice(-40)}));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
