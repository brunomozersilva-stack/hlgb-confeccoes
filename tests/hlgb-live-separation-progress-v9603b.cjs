'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'release-separation-commit-v9319.js'),'utf8');
const pure=fs.readFileSync(path.join(root,'hlgb-modules/producao/separacao-progresso-v9603b.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'hlgb-modules/ownership-v9600.json'),'utf8'));
const copy=x=>JSON.parse(JSON.stringify(x));
const blob=bytes=>crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
function setup(core=false){
 const w={};
 const fakeDoc={querySelector:()=>null,getElementById:()=>null};
 const context={window:w,db:{orders:[],separations:[]},
  document:fakeDoc,projectionItemsForOrder:o=>o?.__projectionItems,
  console:{info(){},warn(){},error(){}},setInterval:()=>1,clearInterval(){},setTimeout:()=>1,
  alert(){throw Error('unexpected alert')},
  Date,Math,Number,String,Object,JSON,Set,Map,Promise,structuredClone,localStorage:{getItem:()=>null}};
 vm.createContext(context);
 if(core)vm.runInContext(pure,context);
 // Instrument the checked-in source only inside the in-memory VM; never modify the ERP.
 const probe=src.replace('function pendingFor(module,id){',
  'window.__SEPARATION_READONLY_TEST__={progress,totals,itemsFor};\nfunction pendingFor(module,id){');
 assert.notEqual(probe,src,'required test hook must be present');
 vm.runInContext(probe,context);
 return {window:w,context,read:w.__SEPARATION_READONLY_TEST__};
}
const orders=[
 {id:'ord1',grade:[{productId:'p1',qty:10},{productId:'p1',qty:2},{productId:'p2',qty:7},{productId:'',qty:90}]},
 {id:'ord2',grade:[{productId:1,qty:'15'},{productId:2,qty:0},{productId:1,qty:-5},{productId:'3',qty:'NaN'}]},
 {id:'ord3',grade:[]},{id:'ord4'},
 {id:'ord5',__projectionItems:[{productId:'p1',qty:20},{key:'p2',qty:8}]},
 {id:'ord6',__projectionItems:[{productId:'p1',qty:0},{productId:'p2',qty:-10},{productId:'p3',qty:3}]}
];
const separations=[
 {},{modelProgress:{}},
 {modelProgress:{p1:{qty:4},p2:{qty:8}}},
 {modelProgress:{'first:p1':{qty:5},'other:p2':{qty:'4'}}},
 {modelProgress:{'old:p1':{qty:6},p1:{qty:2},p2:{qty:0}}},
 {modelProgress:{1:{qty:'17'},2:{qty:'-1'}}},
 {modelProgress:{p1:{qty:50},p2:{qty:200}}},
 {modelProgress:{p1:{qty:'no'},p2:{qty:'-7'}}},
 {modelProgress:{'p1:abc':{qty:5},'prefix:p2':{qty:1}}},
 {modelProgress:null}
];
test('separação original permanece idêntica fora de três linhas de delegação',()=>{
 const changes=[
  "const separationProgressCore9603b=window.HLGB_SEPARATION_PROGRESS_9603B||null;\n",
  "\n if(separationProgressCore9603b?.progress)return separationProgressCore9603b.progress(s,pid);",
  "\n if(separationProgressCore9603b?.totalsForItems)return separationProgressCore9603b.totalsForItems(items,s);"
 ];
 let original=src;
 for(const line of changes){assert.ok(original.includes(line));original=original.replace(line,'');}
 assert.equal(blob(Buffer.from(original)),manifest.extractionChanges['release-separation-commit-v9319.js'].before);
 assert.ok(src.includes("window.applySeparationProgress938=directApply;window.markSeparation=directMark"));
 assert.ok(src.includes("const out=await timed(window.hlgbRecordSaveWithRetry"));
 assert.ok(src.includes("if(!saved?.out?.applied)"));
});
test('módulo é puro, mantém fallback anterior e não toca dados nem WAL',()=>{
 for(const forbidden of ['cloudRequest','indexedDB','localStorage','document.','window.open','hlgbRecordSaveWithRetry','fetch(','setTimeout('])
  assert.ok(!pure.includes(forbidden),'módulo só pode calcular: '+forbidden);
 assert.match(pure,/function progress\(s,pid\)/);
 assert.match(pure,/function totalsForItems\(items,s\)/);
 const a=setup(false),b=setup(true);
 assert.equal(a.window.HLGB_SEPARATION_PROGRESS_9603B,undefined);
 assert.ok(b.window.HLGB_SEPARATION_PROGRESS_9603B);
 for(const name of ['applySeparationProgress938','markSeparation']){
  assert.equal(typeof a.window[name],'function');
  assert.equal(typeof b.window[name],'function');
 }
 assert.equal(b.window.hlgbSeparationDirect9321.status().installed,true);
});
test('todas as projeções e 60 combinações de separação geram totais idênticos',()=>{
 const a=setup(false),b=setup(true);
 let cases=0;
 for(const o of orders){
  for(const s of separations){
   const before=copy({o,s});
   const left=a.read.totals(o,s),right=b.read.totals(o,s);
   assert.equal(JSON.stringify(right),JSON.stringify(left),
    'mismatch order='+o.id+' progress='+JSON.stringify(s.modelProgress));
   assert.deepEqual(copy({o,s}),before,'read-only totals must not mutate input');
   assert.ok(Object.hasOwn(left,'total')&&Object.hasOwn(left,'done')&&Object.hasOwn(left,'remaining')&&Object.hasOwn(left,'complete'));
   cases++;
  }
 }
 assert.equal(cases,60);
});
test('ids simples/legados com prefixo, quantidades negativas e inválidas conservam resultado',()=>{
 const a=setup(false),b=setup(true);
 const ids=['p1','p2','p3','1',1,'2',2,'missing',null,'',undefined,'first:p1'];
 let n=0;
 for(const sep of separations)for(const pid of ids){
  const left=a.read.progress(sep,pid),right=b.read.progress(sep,pid);
  assert.equal(right,left,'progress mismatched: '+JSON.stringify(sep)+' -> '+String(pid));
  n++;
 }
 assert.equal(n,120);
});
test('sem duplicar scripts: ordem comercial e aprovação explícita de apenas dois núcleos',()=>{
 const loader=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
 const start=loader.indexOf('const moduleGroups='),end=loader.indexOf(';const files=moduleGroups.flatMap(group=>group.files)',start);
 assert.ok(start>=0&&end>start);
 const files=JSON.parse(loader.slice(start+'const moduleGroups='.length,end)).flatMap(g=>g.files);
 const addons=manifest.approvedNewScripts;
 assert.equal(files.length,158);assert.equal(addons.length,2);
 assert.deepEqual(files.filter(x=>!addons.includes(x)),manifest.preExtractionScripts);
 assert.equal(manifest.preExtractionScripts.length,156);
 assert.deepEqual(files,manifest.releaseScripts);
 assert.equal(new Set(files).size,158);
 assert.equal(files.indexOf('hlgb-modules/producao/separacao-progresso-v9603b.js')+1,files.indexOf('release-separation-commit-v9319.js'));
});
