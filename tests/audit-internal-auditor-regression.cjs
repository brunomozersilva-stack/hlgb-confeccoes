const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'release-internal-auditor.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
assert(loader.includes("'release-internal-auditor.js'"),'loader must include internal auditor');

const ids=['appShell','nav','dashboard','pedidos','corte','producao','projecao','faltas','hubFinanceiro','config'];
const nodes=Object.fromEntries(ids.map(id=>[id,{id}]));
const activePage={id:'projecao',querySelectorAll(){return []}};
let pendingWrites=0;
const context={
  console,
  db:{
    orders:[{id:'o1',client:'Gisele'}],
    employees:[{id:'e1',name:'Ex',active:false,terminationDate:'2026-09-17'}],
    systemIssues:[],
    systemAuditRuns:[]
  },
  window:{
    innerWidth:1000,innerHeight:800,devicePixelRatio:1,
    HLGB_RELEASE_VERSION:'92.47',
    hlgbDiagnosticsCenter:{scanSystem(){return []}},
    hlgbAssistant:{},
    hlgbProjectionTeam:{},
    HLGB_TERMINATION_PROVISION_GUARD:'ok',
    HLGB_HUB_PERSONAL_INTEGRITY_GUARD:'ok',
    renderOrders(){},renderProjection(){},renderHubFinance(){},renderPayrollProvisions(){},
    abateMissingPiece(){},toggleHubFinanceEntry(){},editOrder(){},hlgbRecordSaveWithRetry(){}
  },
  navigator:{userAgent:'Mozilla/5.0 Safari/605.1.15'},
  document:{
    readyState:'loading',
    addEventListener(){},
    getElementById(id){return nodes[id]||null},
    querySelector(sel){
      if(sel==='.page.active')return activePage;
      return null;
    },
    querySelectorAll(sel){
      if(sel==='[id]')return ids.map(id=>({id}));
      if(sel==='.modal,.modalbox')return [];
      return [];
    },
    documentElement:{scrollWidth:1000,clientWidth:1000}
  },
  setTimeout(){return 0},
  cloudAccessToken:'present',
  hlgbRecordReady:true,
  hlgbRecordPendingRead:()=>({modules:{}}),
  HLGB_RECORD_MODULES:[],
  HLGB_RECORD_WRITE_AREA:{},
  hlgbRecordSnapshots:{},
  hlgbRecordLastSeen:{},
  currentUser:()=>({name:'Teste'}),
  renderOrders(){},renderProjection(){},renderHubFinance(){},renderPayrollProvisions(){},
  abateMissingPiece(){},toggleHubFinanceEntry(){},editOrder(){},hlgbRecordSaveWithRetry(){pendingWrites++}
};
vm.createContext(context);
vm.runInContext(src,context);
const api=context.window.hlgbInternalAuditor;
assert(api,'internal auditor API must load');
assert.equal(api.module,'systemAuditRuns');
api.loadRuns(); // registerModule runs before any cloud fetch; no business write is performed.
assert(context.HLGB_RECORD_MODULES.includes('systemAuditRuns'),'audit module must register');
assert.equal(context.HLGB_RECORD_WRITE_AREA.systemAuditRuns,'cadastros');

const before=JSON.stringify(context.db.orders);
const run=api.buildRun('full');
assert.equal(run.readOnly,true,'audit must identify itself as read-only');
assert.equal(run.browser,'Safari','Safari must be identified');
assert.equal(run.activePage,'projecao');
assert.equal(run.summary.fail,0,'clean mocked system must have no failing checks');
assert(run.summary.pass>0,'audit must run passing checks');
assert.equal(JSON.stringify(context.db.orders),before,'read-only audit must not mutate business orders');
assert.equal(pendingWrites,0,'buildRun must not execute record writes');

const report=api.report(run);
assert(report.includes('AUDITORIA INTERNA'),'report must identify internal audit');
assert(report.includes('somente leitura'),'report must document read-only mode');

context.window.hlgbDiagnosticsCenter.scanSystem=()=>[{severity:'Alta',code:'x',title:'Falha de integridade',description:'teste',refs:[]}];
const bad=api.buildRun('full');
assert(bad.summary.fail>0,'high integrity finding must fail the audit');
assert(bad.checks.some(x=>x.title==='Falha de integridade'&&x.status==='fail'));

(async()=>{
  const same={id:'audit-same',kind:'system_audit',startedAt:'2026-09-30T18:00:00Z',completedAt:'2026-09-30T18:00:01Z',summary:{result:'Aprovado',pass:1,warn:0,fail:0},checks:[]};
  context.hlgbRecordSaveWithRetry=async()=>{const e=new Error('same field conflict');e.code='HLGB_SAME_FIELD_CONFLICT';throw e};
  context.cloudEnsureFreshSession=async()=>true;
  context.cloudRequest=async()=>[{module:'systemAuditRuns',entity_id:'audit-same',data:JSON.parse(JSON.stringify(same)),deleted_at:null,revision:1,updated_at:'2026-09-30T18:00:02Z',updated_by:'u1'}];
  const saved=await api.saveRun(same);
  assert.equal(saved.id,'audit-same','identical remote audit must be accepted as idempotent confirmation');
  assert(context.db.systemAuditRuns.some(x=>x.id==='audit-same'),'idempotent audit must remain available locally');
  console.log('PASS internal auditor: read-only checks, Safari detection, module registration, integrity failures and idempotent save conflict.');
})().catch(e=>{console.error(e);process.exit(1)});
