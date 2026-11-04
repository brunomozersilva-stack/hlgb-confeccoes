const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('release-auditor-autocorrect-v9448.js','utf8');
const cases=[
 {name:'caught error object',diag:{error:'Permissão negada no Supabase',before:null,after:null},message:'Permissão negada no Supabase'},
 {name:'readiness false',diag:{before:{ready:false,error:'Consulta indisponível'},after:{ready:false,candidateCount:0}},message:'Consulta indisponível'},
 {name:'missing after',diag:{before:{ready:true,safeCopies:0},after:null},message:'não foi possível comprovar leitura'}
];
(async()=>{
 for(const test of cases){
  let called=0,html='',saved=null;
  const card={setAttribute(k,v){this[k]=v},set innerHTML(x){html=x},get innerHTML(){return html}};
  const host={prepend(){}};
  const document={querySelector:()=>null,getElementById:id=>id==='hlgbAuditorResult'?host:id==='hlgbAuditorAutoCorrect9448Card'?card:null,createElement:()=>card};
  const ctx={window:{__HLGB_AUTH_READY:true,HLGB_AUDITOR_AUTOCORRECT_9447:'94.47',HLGB_PRODUCTION_RESIDUAL_9448:'94.84',
   addEventListener:()=>{},hlgbAuditorAutoCorrect9447:{prepare:async()=>({ok:true}),run:async()=>{called++;return {passes:0,needsCode:[]}}},
   hlgbProductionResidual9448:{reconcileAndInspect:async()=>test.diag}},
   document,console,localStorage:{setItem:(k,v)=>{saved=JSON.parse(v)}},Date,Promise,Map,Set,Object,JSON,String,Number,
   structuredClone, setTimeout:()=>1,clearTimeout:()=>{},navigator:{userAgent:'test'}};
  vm.createContext(ctx);vm.runInContext(src,ctx);
  const out=await ctx.window.hlgbAuditorAutoCorrect9448.run({render:true});
  assert.equal(called,0,test.name+' must not continue to v94.47');
  assert.equal(out.auditCompleted,false);
  assert.equal(out.executionFailed,true);
  assert.equal(out.stillFailing,null);
  assert(out.failure.message.includes(test.message),test.name+' should show real reason');
  assert(html.includes('Auditor NÃO concluiu'));
  assert(!html.includes('Resíduos atuais: 0'));
  assert.equal(saved.auditCompleted,false);
 }
 console.log('PASS residual error object/incomplete before/after blocks false all-clear without executing repair chain');
})().catch(e=>{console.error(e);process.exitCode=1});
