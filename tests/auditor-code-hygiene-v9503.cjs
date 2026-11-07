'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'release-auditor-authority-map-v9374.js'),'utf8');
const shell=fs.readFileSync(path.join(root,'release-auditor-shell-v9382.js'),'utf8');
assert(shell.includes('id="hlgbHygieneBtn9503"'),'Auditor shell must show a code-hygiene action');
assert(shell.includes("'hlgbHygieneCacheClean9503'"),'Auditor shell must keep safe cache controls visible');
const expectedFiles=['release-record-integrity.js','release-sync-guard-v9306.js'];
const common=[
'function identicalBlockForReview9503(input) {',
' const answer = input && input.importantData ? input.importantData : [];',
' const calculated = answer.reduce(function (sum, value) { return sum + Number(value || 0); }, 0);',
' const sanitized = Math.max(0, Number.isFinite(calculated) ? calculated : 0);',
' const formatted = sanitized.toFixed(2) + " reais em registro antigo";',
' return {calculated:calculated, formatted:formatted, status:"review" };',
'}'
].join('\n');
const fetched={};
expectedFiles.forEach(file=>fetched[file]='window.hlgbSharedReview9503 = function(){};\n'+common+'\n');
const deleted=[];
const entries=[
  {url:'https://example.test/hlgb-confeccoes/release-old.js?fresh=1'},
  {url:'https://example.test/hlgb-confeccoes/release-old.css'},
  {url:'https://example.test/hlgb-confeccoes/important-record.json'},
  {url:'https://example.test/hlgb-confeccoes/app-stable3.html'},
  {url:'https://example.test/other-app/release-old.js'},
  {url:'https://elsewhere.test/hlgb-confeccoes/release-old.js'}
];
const store={
 async keys(){return entries.slice()},
 async delete(req){deleted.push(req.url);const i=entries.indexOf(req);if(i>=0){entries.splice(i,1);return true}return false}
};
const cache={
 async keys(){return ['shared-cache']},
 async open(name){assert.equal(name,'shared-cache');return store}
};
const events={};
const panel={
 id:'hlgbHygienePanel9503',style:{},innerHTML:'',remove(){},
 querySelector(selector){
  const id=selector.replace(/^#/,'');
  if(!events[id])events[id]={textContent:'',addEventListener(name,fn){this[name]=fn}};
  return events[id];
 }
};
const host={prepend(v){assert.equal(v,panel)}};
let cacheRemovalConfirm=false,confirmCalls=0,storageReads=0;
const ctx={
 console,URL,Date,Math,Promise,Map,Set,Number,String,JSON,Array,Object,RegExp,
 setTimeout(){return 1},clearTimeout(){},
 location:{href:'https://example.test/hlgb-confeccoes/app-stable3.html',origin:'https://example.test'},
 caches:cache,
 confirm(){confirmCalls++;return cacheRemovalConfirm},
 fetch:async url=>{
  const pathname=new URL(url,'https://example.test/hlgb-confeccoes/').pathname;
  const file=pathname.split('/').pop();
  return {ok:true,text:async()=>fetched[file]||'/* no duplicate content */'};
 },
 performance:{getEntriesByType(){return[]}},
 document:{
  querySelectorAll(selector){return selector==='script[src]'?[{src:'https://example.test/hlgb-confeccoes/release-old.js'},{src:'https://example.test/hlgb-confeccoes/release-old.js'}]:[]},
  getElementById(id){return id==='hlgbAuditorResult'?host:null},
  createElement(tag){assert.equal(tag,'div');return panel},
  addEventListener(){}
 },
 localStorage:{getItem(){storageReads++;throw Error('unexpected storage read')},setItem(){throw Error('local data changed')},removeItem(){throw Error('local data deleted')}},
 indexedDB:{deleteDatabase(){throw Error('IndexedDB touched')}}
};
ctx.window=ctx;
vm.createContext(ctx);
vm.runInContext(source,ctx,{filename:'release-auditor-authority-map-v9374.js'});
(async()=>{
 const api=ctx.hlgbAuditorAuthority9374;
 assert(api&&typeof api.hygiene==='function');
 const report=await api.hygiene();
 assert.equal(report.readOnly,true);
 assert(report.scriptDuplicateExecutions.some(x=>x.file==='release-old.js'),'detect duplicated script tags');
 assert(report.code.overlaps.some(x=>x.name==='hlgbSharedReview9503'),'detect same global function across files');
 assert(report.code.identicalBlocks.length>0,'detect identical source blocks');
 assert.equal(report.cache.eligible,2,'only owned JS/CSS resources are eligible');
 assert.equal(deleted.length,0,'scanning never removes any cache item');
 assert.equal(confirmCalls,0,'scanning must not open a confirmation dialog');
 assert.equal(storageReads,0,'scanning must not access local records');
 await events.hlgbHygieneCacheClean9503.click();
 assert.equal(deleted.length,0,'cancelled cleanup must preserve cache');
 cacheRemovalConfirm=true;
 await events.hlgbHygieneCacheClean9503.click();
 assert.equal(deleted.length,2,'only two safe resources may be deleted');
 assert(deleted.every(u=>u.includes('/hlgb-confeccoes/')&&/\.(js|css)(?:\?|$)/.test(u)));
 assert.equal(entries.length,4,'business and other app cache entries must be preserved');
 assert.equal(storageReads,0,'cleanup must not touch localStorage');
 assert.equal(events.hlgbHygieneStatus9503.textContent.includes('2 recurso(s)'),true);
 console.log('PASS Auditor Higiene v95.03: overlapping code, exact blocks, duplicate tags, safe opt-in CacheStorage cleanup and WAL-preserving constraints');
})().catch(e=>{console.error(e);process.exitCode=1});
