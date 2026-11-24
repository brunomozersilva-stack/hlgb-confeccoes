'use strict';
module.exports=(function engine(){
 const unique=a=>[...new Set(a)].sort(),critical=new Set(['base-infraestrutura','sincronizacao-wal','financeiro-hub-notas','folha-pessoal','faccoes-acertos']);
 const validPath=p=>typeof p==='string'&&p.length>0&&p.length<300&&!p.startsWith('/')&&!p.split('/').some(x=>!x||x==='..'||x==='.')&&!/[\\\x00-\x1f]/.test(p);
 function manifest(loader){const x=loader.match(/const files=\[([\s\S]*?)\];\/\* A base/);if(!x)throw Error('loader-manifest-not-found');return [...x[1].matchAll(/'([^']+\.js)'/g)].map(m=>m[1])}
 function scan(src){
  if(typeof src!=='string')throw Error('invalid-source');
  // Lexical hints only: comment/string/template masking, no JS execution or AST claims.
  // Template interpolations and regex literals are not fully parsed; report uncertainty.
  const clean=src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g,m=>m.replace(/[^\n]/g,' '));
  const writes=[],reads=[],calls=[];
  for(const m of clean.matchAll(/\b(?:window|globalThis)\s*\.\s*([A-Za-z_$][\w$]*)/g)){
   const after=clean.slice(m.index+m[0].length).trimStart();
   if(/^=(?!=|>)/.test(after))writes.push(m[1]);else {reads.push(m[1]);if(/^(?:\?\.)?\s*\(/.test(after))calls.push(m[1]);}
  }
  const hazards=[];
  for(const [code,rx] of [['storage-clear',/\b(?:localStorage|sessionStorage)\s*\.\s*clear\s*\(/],['idb-delete',/\bindexedDB\s*\.\s*deleteDatabase\s*\(/],['dynamic-execution',/\b(?:eval|Function)\s*\(/],['timer-registration',/\bsetInterval\s*\(/],['event-registration',/\baddEventListener\s*\(/],['write-authority',/\b(?:hlgbRecordSaveWithRetry|cloudRequest|localSaveOnly|enqueue955)\s*\(/]]){
   if(rx.test(clean))hazards.push(code);
  }
  return {writes:unique(writes),reads:unique(reads),calls:unique(calls),hazards,limitations:['lexical-only','dynamic-globals-and-template-expressions-not-complete']};
 }
 function map(loader,ownership,sources){
  const actual=manifest(loader),owners=new Map(),findings=[],nodes=[],provider=new Map();
  if(!ownership||!Array.isArray(ownership.releaseScripts)||!ownership.ownership||typeof sources!=='object')throw Error('invalid-inventory');
  for(const [area,files] of Object.entries(ownership.ownership)){if(!Array.isArray(files))throw Error('invalid-area');for(const p of files){if(!validPath(p))throw Error('invalid-path');if(owners.has(p))findings.push({code:'multiple-owners',path:p});owners.set(p,area)}}
  if(actual.join('\n')!==ownership.releaseScripts.join('\n'))findings.push({code:'manifest-drift'});
  const seen=new Set();for(const p of actual){if(!validPath(p))throw Error('invalid-path');if(seen.has(p)){findings.push({code:'duplicate-script',path:p});continue}seen.add(p);if(!owners.has(p))findings.push({code:'missing-owner',path:p});
   const src=Object.hasOwn(sources,p)?sources[p]:null;if(typeof src!=='string'){findings.push({code:'missing-source',path:p});continue}
   const s=scan(src),n={path:p,area:owners.get(p)||null,order:nodes.length,...s};nodes.push(n);
   for(const sym of s.writes){const list=provider.get(sym)||[];list.push(p);provider.set(sym,list)}
  }
  const edges=[],ambiguous=[],unresolved=[];for(const n of nodes){for(const symbol of n.reads){const ps=provider.get(symbol)||[];if(!ps.length){unresolved.push({consumer:n.path,symbol});continue}
   const other=ps.filter(x=>x!==n.path);if(other.length>0)for(const p of other)edges.push({provider:p,consumer:n.path,symbol,certainty:ps.length===1?'lexical-candidate':'ambiguous-provider'});
  }}
  for(const [symbol,ps] of provider)if(ps.length>1)ambiguous.push({symbol,providers:ps});
  return {mode:'static-hints-only',nodes,edges,ambiguous,unresolved,findings,manifestCount:actual.length,areaCount:Object.keys(ownership.ownership).length,coverage:nodes.length===new Set(actual).size?'manifest-sources-read':'incomplete'};
 }
 function impact(graph,changes){
  if(!Array.isArray(changes)||changes.some(x=>!validPath(x?.path)||!['added','modified','deleted','renamed'].includes(x.status)))throw Error('invalid-change-list');
  const nodes=new Map(graph.nodes.map(n=>[n.path,n])),affected=new Set(),reasons=[],unknown=[];
  const roots=new Set(['app9240.html','app-stable3.html','index.html','hlgb-canonical-sw.js','hlgb-modules/ownership-v9600.json']);
  for(const c of changes){
   if(roots.has(c.path)){reasons.push('boot-or-monolith');continue}
   const n=nodes.get(c.path);if(!n){if(!/^(tests\/|\.github\/workflows\/|hlgb-modules\/engenharia\/)/.test(c.path)||c.status==='deleted'||c.status==='renamed')unknown.push(c.path);continue}
   affected.add(c.path);if(critical.has(n.area))reasons.push('critical-domain:'+n.area);if(c.status==='deleted'||c.status==='renamed')reasons.push('removed-or-renamed-provider');
   for(const h of n.hazards)if(['storage-clear','idb-delete','dynamic-execution','write-authority'].includes(h))reasons.push('review-existing-hazard:'+h);
  }
  let grew=true;while(grew){grew=false;for(const e of graph.edges)if(affected.has(e.provider)&&!affected.has(e.consumer)){affected.add(e.consumer);grew=true}}
  const areas=unique([...affected].map(p=>nodes.get(p)?.area).filter(Boolean));
  if(unknown.length)reasons.push('unmapped-change');if(graph.findings.length||graph.coverage!=='manifest-sources-read')reasons.push('inventory-gap');
  const risk=reasons.length?'high-review':areas.length?'targeted-review':'tooling-review';
  return {risk,reasons:unique(reasons),affected:unique([...affected]),areas,unknown:unique(unknown),requiredFullBeforeMerge:true,canAutoMerge:false,limitations:['risk is heuristic, not prediction certainty','static edges incomplete; tests cannot be waived']};
 }
 function learning(entries){
  if(!Array.isArray(entries))throw Error('invalid-cases');const seen=new Set(),accepted=[],rejected=[];
  for(const x of entries){const k=x?.id;if(typeof k!=='string'||!/^[A-Za-z0-9-]{1,100}$/.test(k)||seen.has(k)){rejected.push({id:null,reason:'invalid-or-duplicate'});continue}seen.add(k);
   const commit=s=>typeof s==='string'&&/^[a-f0-9]{40}$/.test(s),reference=s=>typeof s==='string'&&/^(tests\/)[A-Za-z0-9_./-]+\.(?:js|cjs|mjs)$/.test(s)&&validPath(s);
   if(x.status!=='confirmed'||!commit(x.beforeCommit)||!commit(x.afterCommit)||x.beforeCommit===x.afterCommit||!reference(x.regressionTest)||x.beforeResult!=='failure'||x.afterResult!=='success'||x.reviewed!==true){rejected.push({id:k,reason:'unproven-case'});continue}
   // Evidence contract, not verification of arbitrary claimed CI. Caller must independently verify.
   accepted.push({id:k,beforeCommit:x.beforeCommit,afterCommit:x.afterCommit,regressionTest:x.regressionTest,mode:'evidence-candidate'});
  }
  return {accepted,rejected,automaticRepair:false,independentVerificationRequired:true};
 }
 return {manifest,scan,map,impact,learning};
})();
