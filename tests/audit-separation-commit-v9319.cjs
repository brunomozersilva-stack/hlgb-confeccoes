const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('release-separation-commit-v9319.js','utf8');
const loader=fs.readFileSync('app-stable3.html','utf8');
new vm.Script(src,{filename:'release-separation-commit-v9319.js'});
assert(src.includes("const V='93.22'"),'v93.22 separation controller missing');
assert(src.includes('__hlgbCanonicalSeparation'),'canonical separation marker missing');
assert(src.includes('selectedOrderId'),'Concluir e salvar must resolve selected order from UI');
assert(loader.includes("'release-separation-commit-v9319.js'"),'canonical loader must include separation controller');
(async()=>{
 const statuses=[];let saveCalls=[];
 const elements={appShell:{style:{display:'block'}},loginScreen:{style:{display:'none'}},sessionLoader:{style:{display:'none'}},separationOrder:{value:'o1'},sepQty938_p1:{value:'10'},sepBtn938_p1:{disabled:false,textContent:'Baixar parcial'}};
 const db={orders:[{id:'o1',status:'Separação / compra de material',grade:[{productId:'p1',qty:50},{productId:'p2',qty:50}]}],separations:[]},storage={};
 const context={console,Date,Promise,Map,structuredClone,JSON,Math,setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},db,cloudUser:{email:'operador@hlgb.local'},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v,removeItem:k=>delete storage[k]},document:{getElementById:id=>elements[id]||null,querySelector:()=>null},getComputedStyle:el=>({display:el?.style?.display||'block'}),localSaveOnly:()=>{},fillSeparationOrders:()=>{},renderSeparationList:()=>{},renderSeparation:()=>{},setCloudStatus:(m,t)=>statuses.push([m,t]),alert:()=>{},hlgbRecordId:(m,row)=>String(row.id),hlgbRecordSaveWithRetry:async(m,id,payload)=>{saveCalls.push([m,id,JSON.parse(JSON.stringify(payload))]);return {applied:true,data:payload}},syncOrdersToCuts:()=>{}};
 context.window=context;vm.createContext(context);vm.runInContext(src,context);
 let r=await context.applySeparationProgress938('o1','p1',false);assert(r?.applied===true&&!r.complete);assert.equal(saveCalls.filter(x=>x[0]==='separations').length,1);assert.equal(saveCalls.filter(x=>x[0]==='orders').length,0);
 saveCalls=[];r=await context.markSeparation();assert(r?.complete===true,'Concluir e salvar without explicit order id failed');assert.equal(db.separations[0].modelProgress.p1.qty,50);assert.equal(db.separations[0].modelProgress.p2.qty,50);assert.equal(saveCalls.filter(x=>x[0]==='separations').length,1,'completion must write separation once');assert.equal(saveCalls.filter(x=>x[0]==='orders').length,1,'completion must write order once');assert.equal(db.orders[0].status,'Aguardando corte');
 console.log('PASS separation v93.22: partial save and Concluir e salvar use selected order, one separation write and one final order write.');
})().catch(e=>{console.error(e);process.exit(1)});
