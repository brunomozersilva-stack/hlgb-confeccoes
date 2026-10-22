const fs=require('fs'),vm=require('vm'),assert=require('assert'),{webcrypto}=require('crypto');
const source=fs.readFileSync('release-auditor-shell-v9382.js','utf8');
function session(id){
 const style={setProperty(){}};const doc={getElementById(){return null},createElement(){return {style}},head:{appendChild(){}},addEventListener(){}};
 const record={id:'r1',qty:4};const snapshots={},db={};for(const m of ['orders','cuts','production','hubFinanceEntries']){db[m]=[{...record}];snapshots[m]=new Map([['r1',{data:{...record},revision:2}]])}
 const ctx={console,document:doc,crypto:webcrypto,TextEncoder,Uint8Array,URL,Blob,setTimeout(){},currentUser:()=>({id}),db,hlgbRecordSnapshots:snapshots,hlgbRecordReady:true,window:{__HLGB_AUTH_READY:true,HLGB_RELEASE_VERSION:'93.72',hlgbInternalAuditor:{buildSyncDiagnostic:async()=>({summary:{normalizedPending:0,walLocalStorage:0,walIndexedDb:0},durableWalIndexedDb:{available:true}})}}};vm.createContext(ctx);vm.runInContext(source,ctx);return ctx;
}
(async()=>{
 const a=session('user-a'),b=session('user-b'),api=a.window.hlgbAuditorMultiuser;
 const ar=await api.capture(),br=await b.window.hlgbAuditorMultiuser.capture();
 let result=api.compare(ar,br);assert.equal(result.status,'partial');assert.equal(result.checks.filter(c=>c.status==='not_measured').length,4);assert.equal(result.checks.find(c=>c.title==='orders').status,'pass');
 assert(!JSON.stringify(ar).includes('r1'));assert(!JSON.stringify(ar).includes('user-a'));
 assert.throws(()=>api.compare(ar,ar),/mesmo usuário/);
 const copy=x=>JSON.parse(JSON.stringify(x));let changed=copy(br);changed.modules.orders.records[0].revision++;assert.equal(api.compare(ar,changed).checks.find(c=>c.title==='orders').status,'warn');
 changed=copy(br);changed.modules.orders.records=[];assert.equal(api.compare(ar,changed).checks.find(c=>c.title==='orders').status,'not_measured');
 changed=copy(br);changed.startedAt='2001-01-01';assert.throws(()=>api.compare(ar,changed),/horário inválido/);
 changed=copy(br);changed.modules.orders.records[0].key='<script>';assert.throws(()=>api.compare(ar,changed),/Registro inválido/);
 changed=copy(br);changed.modules.orders.records.push(changed.modules.orders.records[0]);assert.throws(()=>api.compare(ar,changed),/Registro inválido/);
 changed=copy(br);changed.queues=null;assert.equal(api.compare(ar,changed).checks.find(c=>c.title==='Filas na coleta').status,'not_measured');
 changed=copy(br);changed.queues.walIndexedDb=1;assert.equal(api.compare(ar,changed).checks.find(c=>c.title==='Filas na coleta').status,'warn');
 a.hlgbRecordReady=false;await assert.rejects(()=>api.capture(),/sincronização/);
 console.log('MULTIUSER_VALIDATION_OK: perfis distintos, divergências, ausências, validade, formato, filas, autenticação e resultado parcial');
})().catch(e=>{console.error(e);process.exit(1)});
