'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'release-separation-cut-target-v9335.js'),'utf8');
const core=fs.readFileSync(path.join(root,'hlgb-modules/producao/corte-alvo-v9618.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'hlgb-modules/ownership-v9600.json'),'utf8'));
const copy=x=>JSON.parse(JSON.stringify(x));
function blob(bytes){
 const b=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
 return crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
}
function setup(withCore){
 const state={busy:[],projected:[]};
 const window={hlgbAfterLogin(){}};
 window.hlgbSeparationDirect9321={status:()=>({busy:state.busy})};
 const context={window,projectionItemsForOrder:()=>state.projected,console:{info(){},warn(){}},
  setTimeout(){throw Error('no timer should run')},setInterval(){throw Error('no polling should run')}};
 vm.createContext(context);
 if(withCore)vm.runInContext(core,context);
 const instrumented=source.replace('function recordId(module,row){',
  'window.__CUT_TARGET_READ_ONLY_TEST__={activeSeparationOrderId,uniqueProductId};\nfunction recordId(module,row){');
 assert.notEqual(instrumented,source,'probe insertion point must exist');
 vm.runInContext(instrumented,context);
 return {state,window,read:window.__CUT_TARGET_READ_ONLY_TEST__};
}
const busyCases=[
 [],['x|p'],['finish|order5'],['corte1|p','finish|a'],['|p'],['abc'],['finish|'],
 [false,0,null],[' x|p'],['abc|p'],['finish|order_02','other|x'],['p|a','p|b'],
 ['finish|o1','finish|o2'],['|'],['x|'],['finish|2026'],['|weird','q|p'],
 [null,undefined,{id:'cut'}]
];
const orders=[
 {},{id:'o1',grade:[]},{id:'o2',grade:[{productId:'p1'},{productId:'p1'}]},
 {id:'o3',grade:[{productId:'p1'},{productId:'p2'}]},
 {id:'o4',grade:[{productId:'  p1  '}]},{id:'o5',grade:[{productId:22}]},
 {id:'o6',grade:[{key:'p1'}]},{id:'o7',grade:[{productId:0}]},
 {id:'o8',grade:[{productId:false}]},{id:'o9',grade:[{productId:''}]},
 {id:'o10',grade:[{productId:'p1'},{productId:''}]},
 {id:'o11',grade:[{productId:11},{productId:'11'}]},
 {id:'o12',grade:[{productId:'p1'},{productId:null}]}
];
const projections=[
 [],null,{a:1},[{productId:'p1'}],[{key:'p1'}],[{productId:'p1'},{productId:'p1'}],
 [{productId:'p1'},{productId:'p2'}],[{productId:22}],[{productId:' '}],
 [{productId:'p1'},{productId:''}],[{productId:null}],[{}],[{productId:'0'}],
 [{key:'p1',productId:''}],[{key:'p1',productId:'p2'}]
];
test('apenas três inserções opcionais: controlador de Corte idêntico à main byte a byte',()=>{
 const fragments=[
  "/* v96.18: cálculo opcional sem acesso às gravações. O código anterior é o fallback. */\nconst cutTargetCore9618=window.HLGB_SEPARATION_CUT_TARGET_CORE_9618||null;\n",
  " if(cutTargetCore9618?.activeSeparationOrderId){try{return cutTargetCore9618.activeSeparationOrderId(window.hlgbSeparationDirect9321?.status?.())}catch(_e){}}\n",
  " if(cutTargetCore9618?.uniqueProductId){try{return cutTargetCore9618.uniqueProductId(order,typeof projectionItemsForOrder==='function'?projectionItemsForOrder(order):null)}catch(_e){}}\n"
 ];
 let old=source;
 for(const fragment of fragments){assert.ok(old.includes(fragment),'delegate not found');old=old.replace(fragment,'')}
 const changed=manifest.extractionChanges['release-separation-cut-target-v9335.js'];
 assert.equal(blob(old),changed.before,'reconstructed legacy must match base SHA');
 assert.equal(blob(source),changed.after,'changed SHA must be registered');
 for(const method of ['async function confirmCut(cut)','window.hlgbRecordSaveWithRetry','scheduleRecovery()','window.syncOrdersToCuts=w','const oid=activeSeparationOrderId()'])
  assert.ok(source.includes(method),'writing authority must remain identical: '+method);
});
test('núcleo do corte só calcula; fallback e callbacks antigos continuam disponíveis',()=>{
 for(const blocked of ['document.','cloudRequest','indexedDB','localStorage','fetch(','hlgbRecordSaveWithRetry','window.open','setTimeout('])
  assert.equal(core.includes(blocked),false,'núcleo não pode acessar '+blocked);
 const a=setup(false),b=setup(true);
 assert.equal(a.window.HLGB_SEPARATION_CUT_TARGET_CORE_9618,undefined);
 assert.ok(b.window.HLGB_SEPARATION_CUT_TARGET_CORE_9618);
 assert.equal(a.window.HLGB_SEPARATION_CUT_TARGET_9335,'93.35');
 assert.equal(b.window.HLGB_SEPARATION_CUT_TARGET_9335,'93.35');
});
test('18 estados de baixa parcial/conclusão preservam exatamente o pedido ativo',()=>{
 const a=setup(false),b=setup(true);
 for(const busy of busyCases){
  a.state.busy=b.state.busy=busy;
  assert.equal(b.read.activeSeparationOrderId(),a.read.activeSeparationOrderId(),
   'pedido ativo divergente: '+JSON.stringify(busy));
 }
 assert.equal(busyCases.length,18);
});
test('195 combinações de pedido e projeção preservam seleção única de modelo/corte',()=>{
 const a=setup(false),b=setup(true);
 let tested=0;
 for(const order of orders)for(const projected of projections){
  const original=copy({order,projected});
  a.state.projected=b.state.projected=projected;
  const expected=a.read.uniqueProductId(order),actual=b.read.uniqueProductId(order);
  assert.equal(actual,expected,'alvo diferente: '+JSON.stringify({order,projected}));
  assert.deepEqual(copy({order,projected}),original,'nenhum cálculo pode alterar pedido ou projeção');
  tested++;
 }
 assert.equal(tested,195);
});
test('160 scripts, 158 originais e dois núcleos puros; todos na ordem anterior',()=>{
 const html=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
 const found=html.match(/const files=\[([\s\S]*?)\];\/\* A base/);
 assert.ok(found);
 const files=[...found[1].matchAll(/'([^']+\.js)'/g)].map(x=>x[1]);
 const addon='hlgb-modules/producao/corte-alvo-v9618.js';
 assert.equal(files.length,160);
 assert.equal(manifest.preExtractionScripts.length,158);
 assert.equal(manifest.approvedNewScripts.length,2);
 assert.deepEqual(files.filter(x=>!manifest.approvedNewScripts.includes(x)),manifest.preExtractionScripts);
 assert.deepEqual(files,manifest.releaseScripts);
 assert.equal(new Set(files).size,files.length);
 assert.equal(files.indexOf(addon)+1,files.indexOf('release-separation-cut-target-v9335.js'));
 assert.equal(html.includes('const moduleGroups='),false,'never reactivate grouped loader');
});
test('núcleo ausente ou quebrado mantém seleção antiga sem exceção',()=>{
 const baseline=setup(false);
 const injected=source.replace('const cutTargetCore9618=window.HLGB_SEPARATION_CUT_TARGET_CORE_9618||null;',
  'const cutTargetCore9618={activeSeparationOrderId(){throw Error("unavailable")},uniqueProductId(){throw Error("unavailable")}};');
 assert.notEqual(injected,source);
 const state={busy:[],projected:[]};
 const w={hlgbAfterLogin(){},hlgbSeparationDirect9321:{status:()=>({busy:state.busy})}};
 const ctx={window:w,projectionItemsForOrder:()=>state.projected,console:{info(){},warn(){}},
  setTimeout(){throw Error('no timer should run')},setInterval(){throw Error('no polling should run')}};
 vm.createContext(ctx);
 vm.runInContext(injected.replace('function recordId(module,row){',
  'window.__CUT_TARGET_READ_ONLY_TEST__={activeSeparationOrderId,uniqueProductId};\nfunction recordId(module,row){'),ctx);
 const broken=w.__CUT_TARGET_READ_ONLY_TEST__;
 for(const busy of busyCases){baseline.state.busy=state.busy=busy;
  assert.equal(broken.activeSeparationOrderId(),baseline.read.activeSeparationOrderId());}
 for(const order of orders)for(const projected of projections){baseline.state.projected=state.projected=projected;
  assert.equal(broken.uniqueProductId(order),baseline.read.uniqueProductId(order));}
});
