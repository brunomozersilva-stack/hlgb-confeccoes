const {webkit}=require('playwright');

(async()=>{
  const browser=await webkit.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e?.message||e)));
  await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell')&&typeof window.hlgbAdjustCutGrade9191==='function',null,{timeout:60000});
  await page.evaluate(()=>{
    document.documentElement.classList.add('hlgb-login-confirmed-9407');window.__HLGB_AUTH_READY=true;
    const login=document.getElementById('loginScreen');if(login)login.style.setProperty('display','none','important');
    const app=document.getElementById('appShell');if(app){app.style.setProperty('display','block','important');app.style.setProperty('visibility','visible','important');app.style.setProperty('opacity','1','important')}
    const d=window.eval('db');
    d.sizes=['P','M','G','GG'];
    d.products=[{id:9421101,name:'Cueca Fem Tabata'}];
    d.orders=[{id:9421001,client:'Click Sophia',grade:[
      {productId:9421101,color:'Preto',size:'P',qty:20},{productId:9421101,color:'Preto',size:'M',qty:40},{productId:9421101,color:'Preto',size:'G',qty:40},{productId:9421101,color:'Preto',size:'GG',qty:40},
      {productId:9421101,color:'Branco',size:'P',qty:10},{productId:9421101,color:'Branco',size:'M',qty:20},{productId:9421101,color:'Branco',size:'G',qty:20},{productId:9421101,color:'Branco',size:'GG',qty:20}
    ]}];
    d.cuts=[{id:9421201,orderId:9421001,productId:9421101,originalGrade:JSON.parse(JSON.stringify(d.orders[0].grade)),actualCutGrade:[
      {productId:9421101,color:'Preto',size:'P',qty:0},{productId:9421101,color:'Preto',size:'M',qty:48},{productId:9421101,color:'Preto',size:'G',qty:48},{productId:9421101,color:'Preto',size:'GG',qty:48},
      {productId:9421101,color:'Branco',size:'P',qty:0},{productId:9421101,color:'Branco',size:'M',qty:20},{productId:9421101,color:'Branco',size:'G',qty:20},{productId:9421101,color:'Branco',size:'GG',qty:20}
    ]}];
    window.hlgbAdjustCutGrade9191(9421201);
  });
  await page.waitForSelector('#modal.show .cut-grade-matrix9421',{state:'visible',timeout:10000});
  const visual=await page.evaluate(()=>{
    const table=document.querySelector('#modal .cut-grade-matrix9421');
    const headers=[...table.querySelectorAll('thead th')].map(x=>String(x.textContent||'').trim());
    const rows=[...table.querySelectorAll('tbody tr')].map(tr=>[...tr.children].map(td=>String(td.textContent||'').trim()));
    const inputs=[...table.querySelectorAll('input[type="number"]')].map(x=>x.value);
    const box=document.querySelector('#modal .modalbox')?.getBoundingClientRect();
    return {headers,rows,inputs,boxWidth:box?.width||0,tableWidth:table.getBoundingClientRect().width,scrollWidth:table.parentElement?.scrollWidth||0};
  });
  const expected=['Modelo','Cor','P','M','G','GG','Total previsto'];
  if(JSON.stringify(visual.headers)!==JSON.stringify(expected))throw new Error('Cabeçalho não segue a folha dos cortadores: '+JSON.stringify(visual));
  if(visual.rows.length!==2||!visual.rows.some(r=>r[1]==='Preto')||!visual.rows.some(r=>r[1]==='Branco'))throw new Error('Cores não estão em linhas: '+JSON.stringify(visual));
  if(visual.inputs.length!==8||!visual.inputs.includes('48'))throw new Error('Campos editáveis por tamanho não foram preservados: '+JSON.stringify(visual));
  if(visual.headers.includes('Tamanho'))throw new Error('Layout vertical antigo ainda ativo');
  await page.locator('#modal .modalbox').screenshot({path:'/tmp/hlgb-v9421-ajustar-grade-webkit.png'});
  const relevant=errors.filter(x=>/grade|cut|9191|9421/i.test(x));if(relevant.length)throw new Error('pageerror relacionado à grade: '+relevant.join(' | '));
  console.log('HLGB_CUT_GRADE_MATRIX_WEBKIT_V9421_OK',JSON.stringify(visual));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
