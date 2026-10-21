const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1180,height:760}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
 body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f6f8;margin:0;padding:28px;color:#1f2937}
 #appShell{display:block}.panel{background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;max-width:900px;margin:auto;box-shadow:0 6px 20px rgba(0,0,0,.06)}
 h2{margin:0 0 8px}.sub{color:#6b7280;margin-bottom:18px}.ok{background:#ecfdf5;border:1px solid #a7f3d0;padding:10px 12px;border-radius:10px;margin-bottom:14px}
 table{border-collapse:collapse;width:100%}th,td{text-align:left;border-bottom:1px solid #e5e7eb;padding:11px}th{font-size:12px;text-transform:uppercase;color:#6b7280}
 </style></head><body><div id="appShell"><div class="panel"><h2>Validação de baixa por pedido + modelo</h2><div class="sub">Itens com baixa confirmada não devem reaparecer em Cortes.</div><div class="ok" id="status">Aguardando filtro…</div><table><thead><tr><th>Corte</th><th>Produto</th><th>Situação</th></tr></thead><tbody id="cutRows"></tbody></table></div></div></body></html>`);
 await page.evaluate(()=>{
  window.db={
   products:[{id:'babyP',name:'Baby Doll Bicolor'},{id:'nakaP',name:'Tanga Nakamura'},{id:'doneP',name:'Modelo baixado'},{id:'openP',name:'Modelo em aberto'}],
   clients:[],production:[],factions:[],finance:[],
   orders:[{id:'babyO',grade:[{productId:'babyP',qty:180}]},{id:'nakaO',grade:[{productId:'nakaP',qty:420}]},{id:'mixedO',grade:[{productId:'doneP',qty:10},{productId:'openP',qty:20}]}],
   cuts:[
    {id:'babyC1',orderId:'babyO',productId:'babyP',productName:'Baby Doll Bicolor'},
    {id:'nakaC1',orderId:'nakaO',productId:'nakaP',productName:'Tanga Nakamura'},
    {id:'mixedDone',orderId:'mixedO',productId:'doneP',productName:'Modelo baixado'},
    {id:'mixedOpen',orderId:'mixedO',productId:'openP',productName:'Modelo em aberto'}
   ],
   operationalWriteoffs:[
    {id:'w-baby',quantity:180,orderProductRefs:[{orderId:'babyO',productId:'babyP'}]},
    {id:'w-naka',quantity:1390,orderProductRefs:[{orderId:'nakaO',productId:'nakaP'}]},
    {id:'w-done',quantity:999,orderProductRefs:[{orderId:'mixedO',productId:'doneP'}]}
   ]
  };
  window.__HLGB_AUTH_READY=true;
  window.HLGB_OPERATIONAL_WRITEOFF_AUTHORITY='93.91';
  window.hlgbWriteoffIntegrity9391={pairIndex:()=>new Set(['babyO|babyP','nakaO|nakaP','mixedO|doneP'])};
  const canonical=()=>{};window.__canonicalWriteoff=canonical;window.hlgbWriteoffSelected9385=canonical;window.hlgbWriteoffSelected9384=canonical;window.hlgbWriteoffSelected9378=canonical;
  window.renderProjection=()=>{};window.renderProduction=()=>{};window.renderProductionHub=()=>{};window.renderOrderNotes=()=>{};window.renderFactions=()=>{};window.hlgbAfterLogin=()=>{};
  window.renderCuts=()=>{
   const rows=document.getElementById('cutRows');rows.innerHTML='';
   for(const c of window.db.cuts){const tr=document.createElement('tr');tr.innerHTML='<td>'+c.id+'</td><td>'+c.productName+'</td><td>Visível</td>';rows.appendChild(tr)}
   document.getElementById('status').textContent='Visíveis após a baixa: '+window.db.cuts.map(x=>x.productName).join(', ');
  };
 });
 await page.addScriptTag({url:'http://127.0.0.1:4173/release-production-operations-v9386-finalize.js'});
 await page.waitForFunction(()=>!!window.hlgbOperationalVisibility9386&&document.getElementById('cutRows').children.length>0,null,{timeout:10000});
 const out=await page.evaluate(()=>({
  text:document.body.textContent||'',
  rows:[...document.querySelectorAll('#cutRows tr')].map(x=>x.textContent),
  totalCuts:window.db.cuts.length,
  canonicalProtected:window.hlgbWriteoffSelected9385===window.__canonicalWriteoff,
  diagnostics:window.hlgbOperationalVisibility9386.diagnostics()
 }));
 if(/Baby Doll Bicolor/.test(out.text))throw new Error('Baby Doll Bicolor reapareceu em Cortes');
 if(/Tanga Nakamura/.test(out.text))throw new Error('Tanga Nakamura reapareceu em Cortes');
 if(/Modelo baixado/.test(out.text))throw new Error('modelo baixado de pedido misto reapareceu');
 if(!/Modelo em aberto/.test(out.text))throw new Error('modelo ainda aberto foi ocultado');
 if(out.totalCuts!==4)throw new Error('filtro alterou permanentemente os cortes '+out.totalCuts);
 if(!out.canonicalProtected)throw new Error('autoridade 93.91 do botão de baixa foi substituída');
 if(out.diagnostics.hiddenCuts!==3)throw new Error('hiddenCuts inesperado '+JSON.stringify(out.diagnostics));
 if(errors.length)throw new Error('pageerror: '+errors.join(' | '));
 await page.screenshot({path:'/tmp/hlgb-writeoff-visibility-webkit.png',fullPage:true});
 console.log('WRITEOFF_VISIBILITY_AUTHORITY_V9393_WEBKIT_OK',JSON.stringify(out));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
