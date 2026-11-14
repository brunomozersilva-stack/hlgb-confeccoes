'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('release-faction-ledger-preservation-v9597.js','utf8');
const router=fs.readFileSync('app-stable3.html','utf8');
function fixture({auth=true,payments=[],factions=[]}={}){
 const writes=[],calls=[],d={factionPayments:[],factions:[],orders:[]};
 const win={__HLGB_AUTH_READY:auth,db:d,addEventListener(){},navigator:{onLine:true}};
 win.cleanupOrphanOrderRecords=function(){writes.push('cleanup-write');d.factionPayments.length=0;return {total:1}};
 win.syncFactionPayments=function(){writes.push('implicit-payment-write');return true};
 win.factionPaymentInPeriod=function(row,start,end){
  const date=String(row?.serviceFinishedAt||row?.paymentDate||'').slice(0,10);
  return date?(!start||date>=start)&&(!end||date<=end):!start&&!end;
 };
 win.renderFactionPayments=function(){return win.syncFactionPayments()};
 win.syncAllData=function(){writes.push('general-sync');win.syncFactionPayments();return true};
 win.cloudEnsureFreshSession=async()=>true;
 win.cloudRequest=async(path,options)=>{
  calls.push({path,method:options.method});
  if(options.method!=='GET')throw Error('remote write forbidden');
  if(path.includes('module=eq.factionPayments'))return payments;
  if(path.includes('module=eq.factions'))return factions;
  throw Error('unexpected endpoint');
 };
 const doc={readyState:'loading',getElementById(){return null},addEventListener(){}};
 const ctx={window:win,document:doc,console,Date,JSON,Map,Set,Promise,Number,String,Array,Object,
  db:d,setTimeout(){return 1}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 return {win,d,writes,calls,api:win.hlgbFactionLedgerPreservation9597};
}
test('boot loads integrity guard exactly once and before other optional modules',()=>{
 const loader=router.match(/const files=\[(.*?)\];/s)?.[1]||'';
 const name="'release-faction-ledger-preservation-v9597.js'";
 assert.equal(loader.split(name).length-1,1);
 assert(loader.trim().startsWith(name),'guard must run before any other optional module');
});
test('inline emergency protection also works when optional JS fails to load',()=>{
 const match=router.match(/const hlgbInlineSafety9597=("(?:\\.|[^"\\])*");const inj=/);
 assert(match,'inline fallback must run before optional script fetches');
 const tag=JSON.parse(match[1]);
 assert.match(tag,/^<script>/);
 const js=tag.slice('<script>'.length,-'</script>'.length);
 let writes=0;
 const win={cleanupOrphanOrderRecords(){writes++;return {total:1}},
  syncFactionPayments(){writes++;return true},
  renderFactionPayments(){return win.syncFactionPayments()},
  syncAllData(){return win.syncFactionPayments()}};
 vm.runInNewContext(js,{window:win});
 assert.equal(win.__HLGB_AUTOCLEANUP_BLOCKED_9597,true);
 assert.equal(win.cleanupOrphanOrderRecords().blocked,true);
 win.renderFactionPayments();win.syncAllData();
 assert.equal(writes,0);
 win.syncFactionPayments();
 assert.equal(writes,1,'explicit derived payment action not disabled permanently');
});
test('render or automatic orphan cleanup cannot delete or persist facção records',()=>{
 const x=fixture();
 x.d.factionPayments.push({id:'p1',manualGroupId:'group1'});
 x.d.factions.push({id:'f1',orderId:'missing-while-loading'});
 const cleanup=x.win.cleanupOrphanOrderRecords();
 assert.equal(cleanup.blocked,true);
 assert.equal(cleanup.total,0);
 assert.equal(x.d.factionPayments.length,1);
 assert.equal(x.d.factions.length,1);
 x.win.renderFactionPayments();
 assert.deepEqual(x.writes,[]);
 x.win.syncFactionPayments();
 assert.deepEqual(x.writes,['implicit-payment-write'],'explicit operation retains original path');
 x.api.guardLegacyCleanup();x.api.guardPaymentRendering();
 x.win.renderFactionPayments();
 assert.deepEqual(x.writes,['implicit-payment-write'],'guards are idempotent');
});
test('general sync cannot synthesize faction payments from incomplete local data',()=>{
 const x=fixture();
 const out=x.win.syncAllData(false);
 assert.equal(out,true);
 assert.deepEqual(x.writes,['general-sync']);
 x.api.guardGeneralSync();
 x.win.syncAllData(true);
 assert.deepEqual(x.writes,['general-sync','general-sync']);
 x.win.syncFactionPayments();
 assert.deepEqual(x.writes,['general-sync','general-sync','implicit-payment-write']);
});
test('manually scheduled pending payments remain visible under week or month filter',()=>{
 const x=fixture(),row={manual:true,status:'Pendente',scheduledPaymentDate:'2026-11-13'};
 assert.equal(x.win.factionPaymentInPeriod(row,'2026-11-09','2026-11-15'),true);
 assert.equal(x.win.factionPaymentInPeriod(row,'2026-11-01','2026-11-30'),true);
 assert.equal(x.win.factionPaymentInPeriod(row,'2026-12-01','2026-12-31'),false);
 assert.equal(x.win.factionPaymentInPeriod(row,'',''),true);
 assert.equal(x.win.factionPaymentInPeriod({...row,paymentDate:'2026-11-12'},'2026-11-13','2026-11-13'),false,'payment date precedence retained');
 assert.deepEqual(x.writes,[]);
});
test('cloud comparison is read only and can show missing local records',async()=>{
 const payments=Array.from({length:30},(_,i)=>({module:'factionPayments',entity_id:'p'+i,
  data:{id:'p'+i,manual:true,manualGroupId:'group'+Math.floor(i/3),factionName:'Facção '+(i%3),
  status:i<10?'Pago':'Pendente',scheduledPaymentDate:'2026-11-13',value:9.99},deleted_at:null}));
 const factions=Array.from({length:24},(_,i)=>({module:'factions',entity_id:'f'+i,data:{id:'f'+i},deleted_at:null}));
 const x=fixture({payments,factions});
 const result=await x.api.readCloud();
 assert.equal(result.cloudPayments,30);
 assert.equal(result.cloudFactions,24);
 assert.equal(result.localPayments,0);
 assert.equal(result.localFactions,0);
 assert.equal(result.lastStatus,'local-incomplete');
 assert.equal(x.calls.length,2);
 assert(x.calls.every(c=>c.method==='GET'));
 assert.deepEqual(x.writes,[]);
 assert.equal(x.d.factionPayments.length,0,'comparison must never invent restored payments');
});
test('unauthenticated comparison fails closed without fetch or mutation',async()=>{
 const x=fixture({auth:false});
 await assert.rejects(x.api.readCloud(),/login/i);
 assert.equal(x.calls.length,0);
 assert.deepEqual(x.writes,[]);
});
test('group summary is a projection, not a new payment or mutation',()=>{
 const x=fixture(),rows=[{entity_id:'a',deleted_at:null,data:{manual:true,manualGroupId:'g',factionName:'Roseli',status:'Pendente',value:3.5}},
 {entity_id:'b',deleted_at:null,data:{manual:true,manualGroupId:'g',factionName:'Roseli',status:'Pago',value:5.5}},
 {entity_id:'c',deleted_at:'2026-10-24',data:{manual:true,manualGroupId:'g',factionName:'Roseli',status:'Pago',value:999}}];
 const out=x.api.summaryByGroup(rows);
 assert.equal(out.length,1);
 assert.equal(out[0].lines,2);
 assert.equal(out[0].totalCents,900);
 assert.equal(out[0].pending,1);assert.equal(out[0].paid,1);
 assert.equal(x.writes.length,0);
});
