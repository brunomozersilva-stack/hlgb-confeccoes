const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('release-separation-commit-v9319.js','utf8');
const loader=fs.readFileSync('app-stable3.html','utf8');
new vm.Script(src,{filename:'release-separation-commit-v9319.js'});
assert(src.includes("const V='93.19'"),'v93.19 separation guard missing');
assert(src.includes('waitSpecificProof'),'specific separation confirmation missing');
assert(src.includes("snapshots('separations')"),'cloud separation snapshot proof missing');
assert(src.includes('hydrateSeparation(proof)'),'confirmed cloud separation must restore local rollback');
assert(src.includes('ensureCompletionOrder'),'partial separation/order confirmation repair missing');
assert(src.includes('beginRenderBatch'),'separation renders must be coalesced');
assert(loader.includes("'release-separation-commit-v9319.js'"),'loader does not include v93.19');
assert(loader.indexOf('release-production-cut-reconcile-v9307.js')<loader.indexOf('release-separation-commit-v9319.js'),'v93.19 must load after v93.13 separation guard');

(async()=>{
  const counters={detail:0,list:0,select:0},alerts=[],statuses=[];
  const elements={
    sepQty938_p1:{value:'10'},
    separationOrder:{value:'o1'},
  };
  const sep={id:'sep1',orderId:'o1',modelProgress:{p1:{qty:20}},done:false,updatedAt:'2026-10-07T15:00:00.000Z'};
  const snapMap=new Map([['sep1',{data:JSON.parse(JSON.stringify(sep)),updated_at:'2026-10-07T15:00:00.000Z'}]]);
  const context={
    console,
    Date,
    Promise,
    setTimeout,
    clearTimeout,
    setInterval:()=>0,
    clearInterval:()=>{},
    db:{separations:[sep],orders:[]},
    hlgbRecordSnapshots:{separations:snapMap,orders:new Map()},
    localSaveOnly:()=>{},
    renderSeparation:()=>{counters.detail++},
    renderSeparationList:()=>{counters.list++},
    fillSeparationOrders:()=>{counters.select++},
    alert:m=>alerts.push(String(m)),
    setCloudStatus:(m,t)=>statuses.push({m:String(m),t:String(t||'')}),
    document:{
      getElementById:id=>elements[id]||null,
      querySelector:()=>null,
    },
    hlgbAfterLogin:cb=>cb(),
    applySeparationProgress938:async(orderId,pid)=>{
      // Reproduz o defeito legado: a separação chega à nuvem (20 -> 30),
      // a segunda etapa falha e a função antiga restaura o local para 20,
      // engolindo o erro e exibindo o alerta de rollback.
      snapMap.set('sep1',{data:{id:'sep1',orderId,modelProgress:{[pid]:{qty:30}},done:false,updatedAt:'2026-10-07T15:01:00.000Z'},updated_at:'2026-10-07T15:01:00.000Z'});
      context.db.separations[0]={id:'sep1',orderId,modelProgress:{[pid]:{qty:20}},done:false,updatedAt:'2026-10-07T15:00:00.000Z'};
      context.renderSeparation();context.renderSeparation();context.renderSeparation();
      context.renderSeparationList();context.renderSeparationList();context.renderSeparationList();context.renderSeparationList();
      context.fillSeparationOrders();context.fillSeparationOrders();context.fillSeparationOrders();context.fillSeparationOrders();
      context.alert('A baixa parcial não foi confirmada na nuvem. O valor anterior foi restaurado.');
      return false;
    },
  };
  context.window=context;
  vm.createContext(context);
  vm.runInContext(src,context,{filename:'release-separation-commit-v9319.js'});
  await new Promise(r=>setTimeout(r,560));
  assert(context.applySeparationProgress938.__hlgb9319,'v93.19 wrapper was not installed');
  const out=await context.applySeparationProgress938('o1','p1',false);
  await new Promise(r=>setTimeout(r,190));
  assert.equal(context.db.separations[0].modelProgress.p1.qty,30,'cloud-confirmed deduction was lost after local rollback');
  assert(out&&out.separationConfirmed===true,'specific deduction was not returned as confirmed');
  assert(!alerts.some(x=>/valor anterior foi restaurado/i.test(x)),'false rollback alert escaped after cloud confirmation');
  assert(statuses.some(x=>/baixa de material confirmada na nuvem/i.test(x.m)),'specific cloud confirmation status missing');
  assert(counters.detail<=1&&counters.list<=1&&counters.select<=1,'duplicate separation renders were not coalesced');
  console.log('PASS separation v93.19: specific cloud proof survives swallowed rollback and duplicate renders are coalesced.');
})().catch(e=>{console.error(e);process.exit(1)});
