const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'release-internal-auditor.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
assert(loader.includes("'release-internal-auditor.js'"),'loader must include internal auditor');

const ids=['appShell','nav','dashboard','pedidos','corte','producao','projecao','faltas','hubFinanceiro','config'];
const nodes=Object.fromEntries(ids.map(id=>[id,{id}]));
const activePage={id:'projecao',querySelectorAll(){return []}};
let pendingWrites=0;
const ls=new Map();
ls.set('hlgb_records_pending_v91',JSON.stringify({modules:{systemAuditRuns:[{id:'old-audit'}],orders:[{id:'o-pending'}]}}));
ls.set('hlgb_durable_wal_v1',JSON.stringify({schema:1,entries:{
  'systemAuditRuns|old-audit':{key:'systemAuditRuns|old-audit',module:'systemAuditRuns',id:'old-audit'},
  'orders|o-pending':{key:'orders|o-pending',module:'orders',id:'o-pending'}
}}));
const context={
  console,
  db:{
    orders:[{id:'o1',client:'Gisele'}],
    employees:[{id:'e1',name:'Ex',active:false,terminationDate:'2026-09-17'}],
    systemIssues:[],
    systemAuditRuns:[{id:'stale-local-audit'}]
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
  localStorage:{
    getItem(k){return ls.has(k)?ls.get(k):null},
    setItem(k,v){ls.set(k,String(v))},
    removeItem(k){ls.delete(k)}
  },
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
api.loadRuns(); // detaches the technical module before any cloud fetch.
assert(!context.HLGB_RECORD_MODULES.includes('systemAuditRuns'),'audit history must stay outside the operational sync module list');
assert(!Object.prototype.hasOwnProperty.call(context.HLGB_RECORD_WRITE_AREA,'systemAuditRuns'),'audit history must not use the operational write-area map');
assert(!Object.prototype.hasOwnProperty.call(context.db,'systemAuditRuns'),'audit history must not bloat the business local database');

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
  await api.cleanupTechnicalPending();
  const pending=JSON.parse(ls.get('hlgb_records_pending_v91'));
  assert(!pending.modules.systemAuditRuns,'stale audit pending entries must be removed');
  assert.equal(pending.modules.orders.length,1,'operational pending entries must be preserved');
  const wal=JSON.parse(ls.get('hlgb_durable_wal_v1'));
  assert(!wal.entries['systemAuditRuns|old-audit'],'audit WAL entry must be removed');
  assert(wal.entries['orders|o-pending'],'operational WAL entry must be preserved');

  const first={id:'audit-new',kind:'system_audit',startedAt:'2026-09-30T18:00:00Z',completedAt:'2026-09-30T18:00:01Z',summary:{result:'Aprovado',pass:1,warn:0,fail:0},checks:[]};
  context.cloudEnsureFreshSession=async()=>true;
  context.cloudRequest=async(url,opts)=>{
    if(String(url).startsWith('rpc/hlgb_save_record')){
      const body=JSON.parse(opts.body);
      assert.equal(body.p_module,'systemAuditRuns');
      assert.equal(body.p_expected_revision,0);
      return [{applied:true,module:'systemAuditRuns',entity_id:first.id,data:JSON.parse(JSON.stringify(first)),deleted_at:null,revision:1,updated_at:'2026-09-30T18:00:02Z',updated_by:'u1'}];
    }
    return [];
  };
  const saved=await api.saveRun(first);
  assert.equal(saved.id,'audit-new','audit must save through the technical direct RPC path');
  assert.equal(api.latest().id,'audit-new','saved audit must stay in the dedicated in-memory history');
  assert.equal(pendingWrites,0,'audit save must bypass the operational durable write wrapper');

  const same={...first,id:'audit-same'};
  context.cloudRequest=async(url,opts)=>{
    if(String(url).startsWith('rpc/hlgb_save_record')){
      return [{applied:false,module:'systemAuditRuns',entity_id:'audit-same',data:JSON.parse(JSON.stringify(same)),deleted_at:null,revision:1,updated_at:'2026-09-30T18:00:03Z',updated_by:'u1'}];
    }
    return [];
  };
  const idem=await api.saveRun(same);
  assert.equal(idem.id,'audit-same','identical remote audit must be accepted idempotently without operational WAL');
  assert.equal(pendingWrites,0,'idempotent audit save must still bypass operational WAL');

  console.log('PASS internal auditor: read-only checks, dedicated cloud history, stale technical queue cleanup and operational queue preservation.');
})().catch(e=>{console.error(e);process.exit(1)});
