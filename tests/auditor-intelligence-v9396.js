const fs=require('fs'),vm=require('vm'),assert=require('assert');
const intelligence=fs.readFileSync('release-auditor-intelligence-v9396.js','utf8');
const trace=fs.readFileSync('release-auditor-call-trace-v9380.js','utf8');
const marker=fs.readFileSync('release-auditor-build-marker-v9396.js','utf8');
assert(intelligence.includes("HLGB-AUDITOR-INTELLIGENCE-93.98"),'build da inteligência ausente');
assert(trace.includes('release-auditor-intelligence-v9396.js'),'trace não carrega inteligência');
assert(trace.includes('release-auditor-build-marker-v9396.js'),'trace não carrega marcador');
assert(!trace.includes("s.src='./release-auditor-boot-analysis-v9381.js"),'trace ainda duplica Boot Analysis');
assert(marker.includes("HLGB_RUNTIME_BUILD_ID='2026-10-24-post-hotfix-auditor-2'"),'marcador inesperado');
const now=Date.now();
const store={
  hlgb_records_pending_v91:JSON.stringify({modules:{
    orders:[{id:'o1',__hlgb_pending_at:now-60_000,data:{id:'o1'}}],
    systemIssues:[
      {id:'old',__hlgb_pending_at:now-2*24*60*60*1000,data:{id:'old',status:'Aberto'}},
      {id:'new',__hlgb_pending_at:now-2*60_000,data:{id:'new',status:'Aberto'}}
    ]
  }}),
  hlgb_durable_wal_v1:JSON.stringify({entries:{'orders|o1':{module:'orders',id:'o1',__hlgb_pending_at:now-60_000,data:{id:'o1'}}}}),
  hlgb_projection_safety_backup:JSON.stringify({projectionInvoices:[{id:100,client:'Cliente',value:50}]})
};
const localStorage={getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,setItem:(k,v)=>{store[k]=String(v)}};
const document={querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener:()=>{},body:{appendChild:()=>{}},documentElement:{appendChild:()=>{}},head:{appendChild:()=>{}}};
const ctx={console,Date,JSON,Math,Promise,Map,Set,URL,Blob:function(){},navigator:{onLine:true},location:{href:'https://example.test/app'},performance:{getEntriesByType:()=>[]},document,localStorage,setTimeout:()=>0,clearTimeout:()=>{},fetch:async()=>({ok:true,text:async()=>marker})};
ctx.db={
 finance:[
   {id:101,projectionInvoiceId:100,value:50,status:'Pendente',clientName:'Cliente'},
   {id:201,projectionInvoiceId:200,value:25,status:'Pendente',clientName:'Sem histórico'}
 ],
 projectionInvoices:[],
 orders:[{id:1,client:'Cliente',projectionItems:{a:{invoiceIds:[100],deliveryHistory:[{invoiceId:100}]}}}]
};
ctx.window=ctx;
vm.createContext(ctx);vm.runInContext(intelligence,ctx,{filename:'release-auditor-intelligence-v9396.js'});
const api=ctx.hlgbAuditorIntelligence9396;assert(api,'API da inteligência não exposta');
const q=api.queueSnapshot();
assert.strictEqual(q.unique,3,'pendências únicas incorretas');
assert.strictEqual(q.businessActive,1,'negócio ativo incorreto');
assert.strictEqual(q.technicalRecent,1,'técnica recente incorreta');
assert.strictEqual(q.technicalHistorical,1,'técnica histórica incorreta');
const integrity=api.projectionIntegritySnapshot();
assert.strictEqual(integrity.count,2,'órfãos Financeiro→Projeção incorretos');
assert.strictEqual(integrity.recoverable,1,'recuperáveis incorretos');
assert.strictEqual(integrity.unresolved,1,'órfãos sem fonte incorretos');
assert.deepStrictEqual(Array.from(integrity.rows[0].recoverySources).sort(),['order-projection-history','projection-safety-backup'].sort(),'fontes de recuperação não identificadas');
function baseSave(){}
function grade(){return baseSave.apply(this,arguments)} grade.__hlgbGradeLinkV9243=true;grade.__original=baseSave;
function capacity(){return grade.apply(this,arguments)} capacity.__hlgbCapacityIntegrityV2=true;capacity.__original=grade;
function payrollFinal(){return capacity.apply(this,arguments)} payrollFinal.__hlgbPayrollWalRace9346=true;payrollFinal.__original=capacity;
let p=api.chainProfile(payrollFinal);
assert.strictEqual(p.depth,4,'profundidade da cadeia incorreta');
assert.strictEqual(p.duplicateResponsibilityCount,0,'cadeia legítima marcada como duplicada');
function payrollLegacy(){return payrollFinal.apply(this,arguments)} payrollLegacy.__hlgbPayrollMonthWal9334=true;payrollLegacy.__original=payrollFinal;
p=api.chainProfile(payrollLegacy);
assert.strictEqual(p.duplicateResponsibilityCount,1,'duplicação de responsabilidade da folha não detectada');
const cmp=api.compareMetrics(
 {metrics:{preAuthLoads:2,saveDepth:11,saveDuplicateResponsibilities:0,projectionOrphans:1,pendingUnique:1}},
 {metrics:{preAuthLoads:4,saveDepth:7,saveDuplicateResponsibilities:1,projectionOrphans:2,pendingUnique:3}}
);
assert.strictEqual(cmp.items.find(x=>x.key==='saveDepth').state,'info','profundidade bruta do save não deveria ser regressão automática');
assert.strictEqual(cmp.items.find(x=>x.key==='saveDuplicateResponsibilities').state,'improved','duplicação de responsabilidade não foi tratada como melhoria');
assert.strictEqual(cmp.items.find(x=>x.key==='projectionOrphans').state,'improved','redução de órfãos não foi tratada como melhoria');
assert.strictEqual(cmp.summary.regressed,0,'comparação criou regressão falsa');
ctx.HLGB_RUNTIME_BUILD_ID='2026-10-24-post-hotfix-auditor-2';
api.sessionFreshness().then(f=>{
 assert.strictEqual(f.status,'fresh','build igual deveria estar fresh');
 ctx.HLGB_RUNTIME_BUILD_ID='old-build';return api.sessionFreshness();
}).then(f=>{
 assert.strictEqual(f.status,'stale','build antigo deveria ser stale');
 console.log('AUDITOR_INTELLIGENCE_V9398_OK',JSON.stringify({queue:q,integrity,saveProfile:p.duplicateResponsibilities,comparison:cmp.summary,freshness:f.status}));
}).catch(e=>{console.error(e);process.exit(1)});
