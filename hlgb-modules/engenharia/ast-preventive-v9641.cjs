'use strict';
module.exports=function astEngine(parse){
 function scan(src){
  if(typeof src!=='string')throw Error('invalid-source');
  let ast;try{ast=parse(src,{ecmaVersion:'latest',sourceType:'script',locations:true,allowHashBang:true})}catch(e){try{ast=parse(src,{ecmaVersion:'latest',sourceType:'module',locations:true,allowHashBang:true})}catch(_){return {parsed:false,errorLine:e.loc?.line||null,reads:[],writes:[],scripts:[],listeners:[],timers:[],hazards:[]}}}
  const reads=[],writes=[],scripts=[],listeners=[],timers=[],hazards=[];
  const prop=n=>n?.type==='MemberExpression'?(n.computed?n.property?.type==='Literal'&&typeof n.property.value==='string'?n.property.value:null:n.property?.name):null;
  const name=n=>n?.type==='Identifier'?n.name:prop(n);
  const location=n=>n.loc?.start?.line||null;
  const glob=n=>n?.type==='MemberExpression'&&n.object?.type==='Identifier'&&['window','globalThis'].includes(n.object.name);
  const safe=s=>typeof s==='string'&&/^[A-Za-z_$][\w$]{0,150}$/.test(s);
  const path=s=>typeof s==='string'&&/^(?:\.\/)?(?:release-[\w.-]+|hlgb-modules\/[A-Za-z0-9_./-]+|hotfix[\w.-]+)\.js$/.test(s)&&!s.split('/').includes('..')?s.replace(/^\.\//,''):null;
  function visit(n,parent,depth){
   if(!n||typeof n.type!=='string')return;
   if(n.type==='MemberExpression'&&glob(n)&&safe(prop(n))){
    const written=parent?.type==='AssignmentExpression'&&parent.left===n;
    (written?writes:reads).push({symbol:prop(n),line:location(n),functionDepth:depth});
   }
   if(n.type==='Literal'&&path(n.value))scripts.push({path:path(n.value),line:location(n),kind:'literal-candidate'});
   if(n.type==='CallExpression'||n.type==='NewExpression'){
    const k=name(n.callee),first=n.arguments?.[0],line=location(n);
    if(k==='addEventListener')listeners.push({event:first?.type==='Literal'&&typeof first.value==='string'&&/^[a-zA-Z0-9:_-]{1,80}$/.test(first.value)?first.value:null,callback:first&&n.arguments[1]?.type==='Identifier'?n.arguments[1].name:null,line,functionDepth:depth});
    if(['setInterval','setTimeout'].includes(k))timers.push({kind:k,line,functionDepth:depth});
    if(['eval','Function','deleteDatabase','clear','hlgbRecordSaveWithRetry','cloudRequest','localSaveOnly','enqueue955'].includes(k))hazards.push({kind:k,line,functionDepth:depth});
   }
   const next=depth+(/^(?:FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(n.type)?1:0);
   for(const [key,val] of Object.entries(n)){if(['loc','start','end','range'].includes(key))continue;if(Array.isArray(val))for(const x of val)visit(x,n,next);else if(val&&typeof val==='object')visit(val,n,next)}
  }
  visit(ast,null,0);
  return {parsed:true,reads,writes,scripts,listeners,timers,hazards};
 }
 function audit(sources){
  const files=Object.entries(sources).map(([path,source])=>({path,...scan(source)})),known=new Set(files.map(x=>x.path)),refs=[],providers=new Map();
  for(const f of files){for(const x of f.scripts)refs.push({from:f.path,to:x.path,line:x.line,known:known.has(x.path),kind:x.kind});for(const x of f.writes){const p=providers.get(x.symbol)||new Set();p.add(f.path);providers.set(x.symbol,p)}}
  const duplicateProviders=[...providers].filter(([,v])=>v.size>1).map(([symbol,v])=>({symbol,files:[...v].sort()}));
  return {mode:'ast-static-candidates',files,refs,duplicateProviders,parseFailures:files.filter(f=>!f.parsed).map(f=>({path:f.path,line:f.errorLine})),limitations:['no runtime ordering or scope proof','literal references may be historical or conditional','function depth is not execution time','no production execution']};
 }
 return {scan,audit};
};
