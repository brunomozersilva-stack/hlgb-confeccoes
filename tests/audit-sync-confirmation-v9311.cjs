const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const source=fs.readFileSync('release-sync-recovery-v9301.js','utf8');
assert.match(source,/HLGB v93\.11/,'v93.11 deve estar ativa');
assert.doesNotMatch(source,/localStorage\.removeItem\(PENDING_KEY\)/,'recovery não pode apagar pending por idade');
assert.doesNotMatch(source,/localStorage\.removeItem\(WAL_KEY\)/,'recovery não pode apagar WAL por idade');
assert.match(source,/hlgb955FlushSilent/,'recovery deve reenviar a WAL durável');

async function scenario(confirm){
  const storage=new Map();
  storage.set('hlgb_durable_wal_v1',JSON.stringify({entries:{'cuts|1':{
    key:'cuts|1',module:'cuts',id:'1',data:{status:'Finalizado'},
    createdAt:'2026-10-06T10:00:00Z',attempts:0,state:'pending'
  }}}));
  const loadCalls=[];
  let flushCalls=0;

  const sandbox={
    window:null,console,
    setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,
    navigator:{onLine:true},
    document:{
      visibilityState:'visible',activeElement:null,
      getElementById:id=>id==='appShell'?{}:null,
      querySelector:()=>null,addEventListener:()=>{}
    },
    getComputedStyle:()=>({display:'block'}),
    localStorage:{
      getItem:k=>storage.has(k)?storage.get(k):null,
      setItem:(k,v)=>storage.set(k,String(v)),
      removeItem:k=>storage.delete(k)
    },
    structuredClone:v=>JSON.parse(JSON.stringify(v)),
    cloudAccessToken:'token',cloudEnsureFreshSession:async()=>true,
    hlgbRecordReady:false,hlgbNormalizedReady:false,
    hlgbRecordLoadBundle:async opts=>{loadCalls.push({...opts});return {rows:[]}},
    hlgbRecordPendingStore:()=>{},hlgbNormalizedSyncNow:async()=>true,
    hlgb955FlushSilent:async()=>{
      flushCalls++;
      if(confirm)storage.set('hlgb_durable_wal_v1',JSON.stringify({entries:{}}));
      return confirm;
    },
    hlgbRealtimeState:'SUBSCRIBED',hlgbStartRealtime:()=>true,
    localSaveOnly:()=>{},setCloudStatus:()=>{},
    hlgbRecordLastSeen:{},hlgbRecordGlobalLastSeen:'2026-10-06T10:00:00Z',hlgbRecordLastPullAt:0,
    HLGB_RELEASE_VERSION:'93.10',addEventListener:()=>{}
  };
  sandbox.window=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox);

  const ok=await sandbox.hlgbSyncRecovery9301.fullSync(confirm?'confirmed':'unconfirmed',true);
  const wal=JSON.parse(storage.get('hlgb_durable_wal_v1')||'{"entries":{}}');
  return {ok,loadCalls,flushCalls,wal};
}

(async()=>{
  const confirmed=await scenario(true);
  assert.equal(confirmed.ok,true,'confirmação deve concluir a sincronização');
  assert.equal(confirmed.flushCalls,1,'WAL deve ser reenviada');
  assert.equal(confirmed.loadCalls[0]?.preserveLocal,true,'primeira carga deve preservar o navegador');
  assert.equal(confirmed.loadCalls[1]?.preserveLocal,false,'só após confirmação pode convergir para a nuvem');
  assert.equal(Object.keys(confirmed.wal.entries||{}).length,0,'WAL confirmada pode sair da fila');

  const unconfirmed=await scenario(false);
  assert.equal(unconfirmed.ok,false,'sem confirmação a sincronização não pode declarar sucesso');
  assert.equal(unconfirmed.flushCalls,1,'WAL deve ter tentativa de reenvio');
  assert.ok(unconfirmed.loadCalls.every(x=>x.preserveLocal===true),'sem confirmação nunca deve sobrescrever o navegador pela nuvem');
  assert.equal(Object.keys(unconfirmed.wal.entries||{}).length,1,'WAL não confirmada deve continuar protegida');

  console.log('OK v93.11: WAL só sai após confirmação; pendência não confirmada permanece protegida.');
})().catch(err=>{console.error(err);process.exit(1)});
