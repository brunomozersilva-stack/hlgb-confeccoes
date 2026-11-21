'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'release-separation-cut-target-v9335.js'),'utf8');
const core=fs.readFileSync(path.join(root,'hlgb-modules/producao/corte-alvo-v9605b.js'),'utf8');
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
test('única alteração no script antigo: 3 delegações opcionais reversíveis byte a byte',()=>{
 const fragments=[
  '\nconst cutTargetCore9605b=window.HLGB_SEPARATION_CUT_TARGET_CORE_9605B||null;',
  '\n if(cutTargetCore9605b?.activeSeparationOrderId){\n  let status;\n  try{status=window.hlgbSeparationDirect9321?.status?.()}catch(e){}\n  return cutTargetCore9605b.activeSeparationOrderId(status);\n }',
  "\n if(cutTargetCore9605b?.uniqueProductId){\n  let projected=null;\n  try{if(typeof projectionItemsForOrder==='function')projected=projectionItemsForOrder(order)}catch(e){}\n  return cutTargetCore9605b.uniqueProductId(order,projected);\n }"
 ];
 let old=source;
 for(const x of fragments){assert.ok(old.includes(x));old=old.replace(x,'');}
 const changed=manifest.extractionChanges['release-separation-cut-target-v9335.js'];
 assert.equal(blob(old),changed.before);
 assert.equal(blob(source),changed.after);
 for(const write of ['async function confirmCut(cut)','window.hlgbRecordSaveWithRetry','scheduleRecovery()','window.syncOrdersToCuts=w','const oid=activeSeparationOrderId()'])
  assert.ok(source.includes(write),'autoridade de gravação e alvo preservada: '+write);
});
test('núcleo do corte só calcula; fallback e callbacks antigos continuam disponíveis',()=>{
 for(const blocked of ['document.','cloudRequest','indexedDB','localStorage','fetch(','hlgbRecordSaveWithRetry','window.open','setTimeout('])
  assert.equal(core.includes(blocked),false,'núcleo não pode acessar '+blocked);
 const a=setup(false),b=setup(true);
 assert.equal(a.window.HLGB_SEPARATION_CUT_TARGET_CORE_9605B,undefined);
 assert.ok(b.window.HLGB_SEPARATION_CUT_TARGET_CORE_9605B);
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
test('159 scripts: 156 da main + 3 núcleos opcionais, sem mudar a ordem original',()=>{
 const html=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
 const start=html.indexOf('const moduleGroups='),end=html.indexOf(';const files=moduleGroups.flatMap(group=>group.files)',start);
 const groups=JSON.parse(html.slice(start+'const moduleGroups='.length,end));
 const files=groups.flatMap(g=>g.files),addons=manifest.approvedNewScripts;
 assert.equal(files.length,159);assert.equal(addons.length,3);
 assert.deepEqual(files.filter(x=>!addons.includes(x)),manifest.preExtractionScripts);
 assert.deepEqual(files,manifest.releaseScripts);
 assert.equal(new Set(files).size,files.length);
 assert.equal(files.indexOf('hlgb-modules/producao/corte-alvo-v9605b.js')+1,
  files.indexOf('release-separation-cut-target-v9335.js'));
});
