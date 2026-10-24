const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1365,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.hlgbBusinessExpansion9400?.version==='94.00'&&window.hlgbAuditorBusiness9401?.version==='94.01'&&!!document.getElementById('printer3dNav9400')&&!!document.getElementById('communicationsNav9400'),null,{timeout:60000});
 const api=await page.evaluate(async()=>{
   const c=window.hlgbBusinessExpansion9400.calc3d({printHours:2,filamentGrams:100,filamentPriceKg:120,machineHourRate:1.25,cleaningQty:2,cleaningUnitCost:1,accessories:[{name:'corrente',qty:1,unitCost:3}],multiplier:2});
   const synthetic=window.hlgbAuditorBusiness9401.validateSnapshot({
    printer3dProducts:[{id:'p1',name:'Teste',printHours:1,filamentGrams:10}],
    printer3dSales:[{id:'s1',productId:'ausente',qty:2,unitPrice:10,total:15}],
    orders:[{id:'o1'}],
    orderCommunicationPolicies:[{id:'pol1',orderId:'ausente',enabled:true,email:'',stages:['etapa_invalida']}],
    orderCommunicationOutbox:[{id:'m1',orderId:'o1',stage:'pedido',status:'enviado'}],
    whatsappAccessGrants:[{id:'g1',type:'order',subjectId:'o1',mode:'write',active:true,previewCode:'123456'},{id:'g2',type:'order',subjectId:'o1',mode:'read',active:true,previewCode:'123456'}],
    factionMasters:[{id:'f1',name:'Facção teste'}],
    factionWhatsappProfiles:[{id:'fp1',factionId:'f1',mode:'read-only',enabled:true,lookupCode:'654321'},{id:'fp2',factionId:'f1',mode:'write',enabled:true,lookupCode:'654321'}]
   });
   const live=await window.hlgbAuditorBusiness9401.run();
   return {c,cut:window.hlgbBusinessExpansion9400.deriveOrderStage({status:'Em corte'}),prod:window.hlgbBusinessExpansion9400.deriveOrderStage({status:'Em produção'}),done:window.hlgbBusinessExpansion9400.deriveOrderStage({status:'Entregue'}),build:window.HLGB_BUSINESS_EXPANSION_V9400,syntheticCodes:synthetic.issues.map(x=>x.code),live:{status:live.summary.status,sourceViolations:live.source.violations,saveBusinessNodes:live.saveBusinessNodes,runtime:live.runtime}};
 });
 if(Math.abs(api.c.base-19.5)>.001||Math.abs(api.c.price-39)>.001||api.cut!=='corte'||api.prod!=='producao'||api.done!=='entregue')throw new Error('cálculo/etapas v94.00 inválidos '+JSON.stringify(api));
 for(const code of ['3d-orphan-sale','3d-sale-total-mismatch','email-policy-orphan-order','email-enabled-without-address','email-invalid-stage','email-status-unsafe','whatsapp-non-read-scope','whatsapp-duplicate-preview-code','faction-duplicate-lookup-code','faction-non-read-profile'])if(!api.syntheticCodes.includes(code))throw new Error('Auditor v94.01 não detectou '+code+' '+JSON.stringify(api.syntheticCodes));
 if(api.live.sourceViolations.length||api.live.saveBusinessNodes.length)throw new Error('isolamento v94.00 falhou '+JSON.stringify(api.live));
 await page.evaluate(()=>{const l=document.getElementById('loginScreen');if(l)l.style.setProperty('display','none','important');const a=document.getElementById('appShell');if(a)a.style.setProperty('display','block','important')});
 await page.click('#printer3dNav9400 .nav-group-title');
 await page.click('#p3ProductsNav9400');
 await page.waitForSelector('#printer3dProducts9400.active',{state:'visible',timeout:10000});
 await page.evaluate(()=>window.new3dProduct9400());
 await page.waitForSelector('#p3Name9400',{state:'visible',timeout:10000});
 await page.fill('#p3Name9400','Teste 3D');await page.fill('#p3Hours9400','2');await page.fill('#p3Grams9400','100');await page.fill('#p3Kg9400','120');await page.fill('#p3Rate9400','1.25');await page.fill('#p3CleanQty9400','2');await page.fill('#p3CleanUnit9400','1');await page.fill('#p3Mult9400','2');await page.fill('#p3Acc9400','Corrente | 1 | 3');await page.click('button:text("Calcular agora")');
 const preview=await page.locator('#p3Preview9400').innerText();if(!/R\$\s*19,50/.test(preview)||!/R\$\s*39,00/.test(preview))throw new Error('preview 3D incorreto: '+preview);
 await page.evaluate(()=>{try{closeModal()}catch(e){const m=document.getElementById('modal');if(m)m.style.display='none'}});
 await page.click('#communicationsNav9400 .nav-group-title');await page.click('#orderCommsNav9400');await page.waitForSelector('#communications9400.active',{state:'visible'});
 const comm=await page.locator('#communications9400').innerText();if(!/Entrega externa ainda não ligada/i.test(comm))throw new Error('limite de e-mail não está explícito');
 await page.click('#waAccessNav9400');await page.waitForSelector('#whatsappAccess9400.active',{state:'visible'});const wa=await page.locator('#whatsappAccess9400').innerText();if(!/servidor/i.test(wa)||!/escopo/i.test(wa))throw new Error('limite de segurança WhatsApp ausente');
 await page.click('#faLookupNav9400');await page.waitForSelector('#factionLookup9400.active',{state:'visible'});
 await page.screenshot({path:'/tmp/hlgb-business-v9400-webkit.png',fullPage:true});
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'))});
 await page.waitForFunction(()=>typeof window.openHlgbAuditor==='function',null,{timeout:30000});
 await page.evaluate(()=>window.openHlgbAuditor());
 await page.waitForSelector('#hlgbSmartStatus',{state:'visible',timeout:10000});
 await page.evaluate(()=>window.hlgbAuditorBusiness9401.ensureButton());
 await page.waitForSelector('#hlgbAuditorBusinessBtn9401',{state:'visible',timeout:10000});
 await page.click('#hlgbAuditorBusinessBtn9401');
 await page.waitForFunction(()=>/Expansão v94/.test(document.getElementById('hlgbAuditorResult')?.innerText||''),null,{timeout:15000});
 const auditText=await page.locator('#hlgbAuditorResult').innerText();if(!/Somente leitura/i.test(auditText)||!/WhatsApp/i.test(auditText)||!/E-mail/i.test(auditText))throw new Error('painel Auditor v94.01 incompleto: '+auditText);
 await page.screenshot({path:'/tmp/hlgb-auditor-business-v9401-webkit.png',fullPage:true});
 if(errors.some(x=>/9400|9401|business|printer3d|whatsapp/i.test(x)))throw new Error('pageerror v94: '+errors.join(' | '));
 console.log('BUSINESS_EXPANSION_V9401_WEBKIT_OK',JSON.stringify({base:api.c.base,price:api.c.price,build:api.build,preview,syntheticCodes:api.syntheticCodes,live:api.live}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
