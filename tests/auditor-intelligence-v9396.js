const fs=require('fs'),vm=require('vm'),assert=require('assert');
const intelligence=fs.readFileSync('release-auditor-intelligence-v9396.js','utf8');
const trace=fs.readFileSync('release-auditor-call-trace-v9380.js','utf8');
const marker=fs.readFileSync('release-auditor-build-marker-v9396.js','utf8');
assert(intelligence.includes("HLGB-AUDITOR-INTELLIGENCE-93.96"),'build da inteligência ausente');
assert(trace.includes('release-auditor-intelligence-v9396.js'),'trace não carrega inteligência');
assert(trace.includes('release-auditor-build-marker-v9396.js'),'trace não carrega marcador');
assert(!trace.includes("s.src='./release-auditor-boot-analysis-v9381.js"),'trace ainda duplica Boot Analysis');
assert(marker.includes("HLGB_RUNTIME_BUILD_ID='2026-10-23-auditor-intelligence-1'"),'marcador inesperado');
const now=Date.now();
const store={
  hlgb_records_pending_v91:JSON.stringify({modules:{
    orders:[{id:'o1',__hlgb_pending_at:now-60_000,data:{id:'o1'}}],
    systemIssues:[
      {id:'old',__hlgb_pending_at:now-2*24*60*60*1000,data:{id:'old',status:'Aberto'}},
      {id:'new',__hlgb_pending_at:now-2*60_000,data:{id:'new',status:'Aberto'}}
    ]
  }}),
  hlgb_durable_wal_v1:JSON.stringify({entries:{'orders|o1':{module:'orders',id:'o1',__hlgb_pending_at:now-60_000,data:{id:'o1'}}}})
};
const localStorage={getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,setItem:(k,v)=>{store[k]=String(v)}};
const document={querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener:()=>{},body:{appendChild:()=>{}},documentElement:{appendChild:()=>{}},head:{appendChild:()=>{}}};
const ctx={console,Date,JSON,Math,Promise,Map,Set,URL:{},Blob:function(){},navigator:{onLine:true},location:{href:'https://example.test/app'},performance:{getEntriesByType:()=>[]},document,localStorage,setTimeout:()=>0,clearTimeout:()=>{},fetch:async()=>({ok:true,text:async()=>marker})};
ctx.window=ctx;
vm.createContext(ctx);vm.runInContext(intelligence,ctx,{filename:'release-auditor-intelligence-v9396.js'});
const api=ctx.hlgbAuditorIntelligence9396;assert(api,'API da inteligência não exposta');
const q=api.queueSnapshot();
assert.strictEqual(q.unique,3,'pendências únicas incorretas');
assert.strictEqual(q.businessActive,1,'negócio ativo incorreto');
assert.strictEqual(q.technicalRecent,1,'técnica recente incorreta');
assert.strictEqual(q.technicalHistorical,1,'técnica histórica incorreta');
const cmp=api.compareMetrics({metrics:{preAuthLoads:2,saveDepth:10,pendingUnique:1}},{metrics:{preAuthLoads:4,saveDepth:12,pendingUnique:3}});
assert.strictEqual(cmp.summary.improved,3,'comparação não reconheceu melhorias');
assert.strictEqual(cmp.summary.regressed,0,'comparação criou regressão falsa');
ctx.HLGB_RUNTIME_BUILD_ID='2026-10-23-auditor-intelligence-1';
api.sessionFreshness().then(f=>{assert.strictEqual(f.status,'fresh','build igual deveria estar fresh');ctx.HLGB_RUNTIME_BUILD_ID='old-build';return api.sessionFreshness()}).then(f=>{assert.strictEqual(f.status,'stale','build antigo deveria ser stale');console.log('AUDITOR_INTELLIGENCE_V9396_OK',JSON.stringify({queue:q,comparison:cmp.summary,freshness:f.status}))}).catch(e=>{console.error(e);process.exit(1)});
