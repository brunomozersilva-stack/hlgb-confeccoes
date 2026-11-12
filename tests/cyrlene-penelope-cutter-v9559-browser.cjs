'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
(async()=>{
 const name=process.env.HLGB_BROWSER||'chromium';
 const browser=await ({chromium,webkit})[name].launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.setContent('<!doctype html><html><body><div id="cutTable"><table><tbody></tbody></table></div></body></html>');
  await page.evaluate(()=>{
   const cyId='1788193732999',penId='1788444804759';
   const cyGrade=['Preto','Branco','Rubi','Pantera','Romance'].flatMap(color=>
    ['P','M','G','GG'].map(size=>({productId:cyId,color,size,qty:51})));
   const penCounts=[[40,40,20,20],[20,40,20,20],[30,40,30,20]];
   const penGrade=['Preto','Rubi','Branco'].flatMap((color,i)=>
    ['P','M','G','GG'].map((size,j)=>({productId:penId,color,size,qty:penCounts[i][j]})));
   window.db={
    products:[{id:cyId,name:'Camisola Cyrlene',materials:[]},
      {id:'another-model',name:'Camisola Outra',materials:[]},
      {id:penId,name:'Fio Duplo Penelope',materials:[{name:'Tule',qty:.5,unit:'m',calcMode:'consumption'}]}],
    materials:[],cutters:[{id:'w',name:'Wallace'}],
    orders:[
     {id:'1793016171651',orderNumber:3,client:'Click Sophia',grade:[...cyGrade,{productId:'another-model',color:'Preto',size:'P',qty:40}]},
     {id:'1794426295127',orderNumber:46,client:'Click Sophia',grade:penGrade}
    ],
    cuts:[
     {id:'1793034494813143',orderId:'1793016171651',productId:cyId,modelSplitChildV1:true,
      product:'Camisola Cyrlene',status:'Planejado',cutterId:'w',pieces:1020,cutType:'Interno',originalGrade:cyGrade.map(x=>({...x}))},
     {id:'1793034494000000',orderId:'1793016171651',productId:'another-model',modelSplitChildV1:true,
      product:'Camisola Outra',status:'Finalizado',pieces:40,originalGrade:[{productId:'another-model',color:'Preto',size:'P',qty:40}]},
     {id:'1794426295128',orderId:'1794426295127',productId:penId,
      product:'Fio Duplo Penelope',status:'Planejado',pieces:340,originalGrade:[]}
    ]
   };
   window.renderCuts=()=>{};
   window.hlgbAfterLogin=()=>{};
   window.__HLGB_AUTH_READY=false;
   window.localSaveOnly=()=>{};
   window.closeModal=()=>document.getElementById('hlgbTestModal')?.remove();
   window.openModal=(title,html,callback)=>{
    document.getElementById('hlgbTestModal')?.remove();
    const el=document.createElement('div');el.id='hlgbTestModal';el.innerHTML=html;document.body.appendChild(el);
    el.querySelector('.modalSave').onclick=callback;
   };
   window.hlgbRecordSaveWithRetry=async (module,id,row)=>{
    if(module!=='cuts'||id!=='1793034494813143')throw Error('Unexpected business write');
    return {applied:true,data:row};
   };
   window.HLGB_STAGE_FLOW_INTEGRITY_GUARD=true;
   window.HLGB_AUDITOR_SINGLE_ACTION_9429=true;
   window.HLGB_GOALS_STABILITY_9430=true;
   window.HLGB_AUDITOR_INTEGRITY_9430=true;
   window.HLGB_PRINTER3D_PERSISTENCE_9431=true;
   window.HLGB_ASSISTANT_IMAGE_SAFETY_9432=true;
  });
  await page.addScriptTag({path:'release-cut-model-split.js'});
  await page.addScriptTag({path:'release-cut-model-grade-adjust.js'});
  await page.addScriptTag({path:'release-cutter-sheet-materials-v9523.js'});
  await page.evaluate(()=>window.hlgbCutModelSplit.renderSplitPanel());
  const btn=page.locator('#hlgbCutSplitPanel .hlgbAdjustSplitGradeBtn');
  assert.equal(await btn.count(),1,'Camisola Cyrlene should offer a direct grade edit');
  assert.match(await btn.first().locator('xpath=..').innerText(),/Ajustar grade/);
  const orderBefore=await page.evaluate(()=>JSON.stringify(window.db.orders[0]));
  await btn.click();
  assert.equal(await page.locator('#hlgbTestModal input[id^="hlgbAdjCell_"]').count(),20);
  await page.locator('#hlgbAdjCell_0').fill('60');
  await page.locator('#hlgbAdjCell_1').fill('42');
  await page.locator('#hlgbTestModal .modalSave').click();
  await page.waitForFunction(()=>window.db.cuts[0].cutGradeAdjustedAt);
  const saved=await page.evaluate(()=>({
   pieces:window.db.cuts[0].pieces,total:window.db.cuts[0].originalGrade.reduce((a,g)=>a+g.qty,0),
   originalOrder:JSON.stringify(window.db.orders[0])
  }));
  assert.equal(saved.total,1020);
  assert.equal(saved.pieces,1020);
  assert.equal(saved.originalOrder,orderBefore,'original pedido must not change');
  // Simulate Safari popup restrictions; a functional same-page preview is required.
  await page.evaluate(()=>{window.open=()=>null});
  const dbBeforePrint=await page.evaluate(()=>JSON.stringify(window.db));
  assert.equal(await page.evaluate(()=>window.printCuttingSheet('1794426295127','1794426295128')),true);
  const overlay=page.locator('#hlgbCutterSheetPreview9523');
  await overlay.waitFor({state:'visible'});
  const frame=page.frameLocator('#hlgbCutterSheetPreview9523 iframe');
  await frame.locator('body').waitFor();
  const html=await frame.locator('body').innerText();
  for(const text of ['Fio Duplo Penelope','340','Preto','Rubi','Branco','Tipo do corte','Interno','Externo','Tule'])
   assert(html.includes(text),'Missing printed field: '+text);
  assert.equal(await page.evaluate(()=>JSON.stringify(window.db)),dbBeforePrint,'printing must be read only');
  await overlay.locator('[data-sheet-action="close"]').click();
  assert.equal(await overlay.count(),0);
  console.log('PASS '+name+': Cyrlene #3 grade edit and Penelope #46 popup-blocked print, local data preserved');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
