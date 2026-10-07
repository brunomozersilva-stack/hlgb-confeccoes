const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('release-separation-commit-v9319.js','utf8');
const loader=fs.readFileSync('app-stable3.html','utf8');
new vm.Script(src,{filename:'release-separation-commit-v9319.js'});
assert(src.includes("const V='93.21'"),'v93.21 direct separation controller missing');
assert(src.includes('__hlgbCanonicalSeparation'),'canonical separation marker missing');
assert(src.includes("saveRecord('separations',s)"),'partial separation must save separations directly');
assert(src.includes("if(t.complete){o.materialPurchaseConfirmed=true"),'orders must only advance when separation is complete');
assert(src.includes('keepSession(err,wasVisible)'),'transient save failure must preserve visible session');
assert(src.includes("pendingFor('separations',rid)"),'duplicate click must be blocked while exact separation is pending');
assert(!src.includes('oldApply943')&&!src.includes('oldApply944')&&!src.includes('oldApplySep9159'),'legacy partial-save wrapper chain must not exist in final controller');
assert(loader.includes("'release-separation-commit-v9319.js'"),'canonical loader must include authoritative separation controller');

(async()=>{
  const statuses=[],alerts=[];let saveCalls=[];
  const elements={
    appShell:{style:{display:'block'}},loginScreen:{style:{display:'none'}},sessionLoader:{style:{display:'none'}},
    sepQty938_p1:{value:'10'},sepBtn938_p1:{disabled:false,textContent:'Baixar parcial'},separationOrder:{value:'o1'}
  };
  const db={orders:[{id:'o1',status:'Separação / compra de material',grade:[{productId:'p1',qty:50},{productId:'p2',qty:50}]}],separations:[]};
  const storage={};
  const context={console,Date,Promise,Map,structuredClone,JSON,Math,setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},
    db,cloudUser:{email:'operador@hlgb.local'},
    localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>{storage[k]=v}},
    document:{getElementById:id=>elements[id]||null},
    getComputedStyle:el=>({display:el?.style?.display||'block'}),
    localSaveOnly:()=>{},fillSeparationOrders:()=>{},renderSeparationList:()=>{},renderSeparation:()=>{},
    setCloudStatus:(m,t)=>statuses.push([String(m),String(t||'')]),alert:m=>alerts.push(String(m)),
    hlgbRecordId:(m,row)=>String(row.id),
    hlgbRecordSaveWithRetry:async(m,id,payload)=>{saveCalls.push([m,id,JSON.parse(JSON.stringify(payload))]);return {applied:true,data:payload}},
    syncOrdersToCuts:()=>{}
  };
  context.window=context;
  vm.createContext(context);vm.runInContext(src,context,{filename:'release-separation-commit-v9319.js'});
  assert(context.applySeparationProgress938.__hlgbCanonicalSeparation,'direct controller was not installed');
  let r=await context.applySeparationProgress938('o1','p1',false);
  assert(r&&r.applied===true&&!r.complete,'partial save did not return success');
  assert.equal(db.separations[0].modelProgress.p1.qty,10,'partial quantity not kept locally');
  assert.equal(saveCalls.filter(x=>x[0]==='separations').length,1,'partial save must write exactly one separation record');
  assert.equal(saveCalls.filter(x=>x[0]==='orders').length,0,'partial save must not write order before all models complete');
  elements.sepQty938_p1.value='40';r=await context.applySeparationProgress938('o1','p1',false);
  assert(r&&r.complete===false,'one completed model must not complete multi-model order');
  assert.equal(saveCalls.filter(x=>x[0]==='orders').length,0,'order advanced before every model was separated');
  elements.sepQty938_p2={value:'50'};elements.sepBtn938_p2={disabled:false,textContent:'Baixar parcial'};
  r=await context.applySeparationProgress938('o1','p2',false);
  assert(r&&r.complete===true,'final model did not complete separation');
  assert.equal(saveCalls.filter(x=>x[0]==='orders').length,1,'completed separation must write order exactly once');
  assert.equal(db.orders[0].status,'Aguardando corte','completed separation did not release order');
  console.log('PASS separation v93.21: one direct controller saves partial model once, advances order only at 100%, and legacy wrapper chain is absent.');
})().catch(e=>{console.error(e);process.exit(1)});
