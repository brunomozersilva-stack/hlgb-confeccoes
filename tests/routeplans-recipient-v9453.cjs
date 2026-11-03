const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const text=fs.readFileSync('release-operations-pack.js','utf8');
const start=text.indexOf('const routeSync9453='),end=text.indexOf('function renderRoutes(){',start);
assert(start>0&&end>start,'route refresh implementation exists');
const src=text.slice(start,end);
let now=100000,reads=0,redraws=0;
const database={routePlans:[]},snapshots={routePlans:new Map()};
let remote=[{module:'routePlans',entity_id:'route-test',revision:1,updated_at:'2026-11-03T18:00:00Z',deleted_at:null,data:{id:'route-test',date:'2026-11-03',stops:[{name:'Roseli'}]}}];
const store={};
const ctx={window:{},db:database,cloudAccessToken:'test',cloudRequest:async()=>{reads++;return remote},
 hlgbRecordSnapshots:snapshots,localStorage:{getItem:k=>store[k]||null},
 document:{hidden:false,querySelector:s=>s==='#rotas9249.page.active'?{}:null,addEventListener:()=>{}},
 Date,JSON,Number,String,Object,Array,console,
 sid:v=>String(v??''),clone:v=>JSON.parse(JSON.stringify(v)),arr:n=>database[n],
 localSaveOnly:()=>{},renderRoutes:()=>{redraws++},setInterval:()=>1};
ctx.window.addEventListener=()=>{};ctx.window.cloudAccessToken='test';
vm.createContext(ctx);vm.runInContext(src,ctx);
(async()=>{
 assert.equal(await ctx.window.hlgbRouteSync9453.refresh(true),true);
 assert.equal(database.routePlans.length,1);assert.equal(database.routePlans[0].stops[0].name,'Roseli');
 assert.equal(redraws,1);
 assert.equal(await ctx.window.hlgbRouteSync9453.refresh(true),false);assert.equal(redraws,1,'identical revision must not redraw');
 remote=[{...remote[0],revision:2,updated_at:'2026-11-03T18:00:05Z',data:{id:'route-test',date:'2026-11-03',stops:[{name:'Roseli'},{name:'Cris'}]}}];
 assert.equal(await ctx.window.hlgbRouteSync9453.refresh(true),true);
 assert.equal(database.routePlans[0].stops.length,2);
 store.hlgb_records_pending_v91=JSON.stringify({modules:{routePlans:[{id:'route-test',deleted:false}]}});
 remote=[{...remote[0],revision:3,updated_at:'2026-11-03T18:00:06Z',data:{id:'route-test',stops:[]}}];
 assert.equal(await ctx.window.hlgbRouteSync9453.refresh(true),false);
 assert.equal(database.routePlans[0].stops.length,2,'pending local edit must be preserved');
 console.log('PASS routePlans recipient fallback: new route, revision, no redraw on equal revision, pending preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
