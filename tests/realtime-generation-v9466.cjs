const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync('app9240.html','utf8');
const stopStart=app.indexOf('function hlgbStopRealtime(){'),stopEnd=app.indexOf('function hlgbRealtimeSetAuth(){',stopStart);
const start=app.indexOf('hlgbStartRealtime=function(){'),end=app.indexOf('// Grava local imediatamente e agenda',start);
assert(stopStart>=0&&stopEnd>stopStart&&start>=0&&end>start,'Realtime lifecycle sections found');
const channels=[],removed=[],updates=[],states=[];
const sdk={createClient:()=>({
 realtime:{setAuth:()=>{}},
 channel:name=>{const c={name,handlers:[],on(event,cfg,fn){this.handlers.push({event,cfg,fn});return this},subscribe(fn){this.notify=fn;channels.push(this);return this}};return c},
 removeChannel:ch=>{removed.push(ch.name);return Promise.resolve()}
})};
const ctx={window:{supabase:sdk},cloudReady:true,cloudRowId:'row',cloudAccessToken:'token',
 HLGB_SUPABASE_URL:'https://example.invalid',HLGB_SUPABASE_KEY:'example',hlgbRealtimeClient:null,hlgbRealtimeChannel:null,
 hlgbRealtimeState:'offline',hlgbRealtimeApplyTimer:0,cloudDirty:false,
 hlgbRecordPendingRead:()=>null,hlgbHandleRecordRealtime:p=>updates.push(p),hlgbHandleRealtimeDataChange:()=>{},
 setCloudStatus:x=>states.push(x),clearTimeout:()=>{},console,Number,String,Promise,Date,Object};
vm.createContext(ctx);
vm.runInContext(app.slice(stopStart,stopEnd)+'\n'+app.slice(start,end),ctx);
assert.equal(ctx.hlgbStartRealtime(),true);
assert.equal(channels.length,1);
const first=channels[0];
first.notify('SUBSCRIBED');assert.equal(ctx.hlgbRealtimeState,'SUBSCRIBED');
assert.equal(ctx.hlgbStartRealtime(),true);
assert.equal(channels.length,2);
const second=channels[1];
assert.notEqual(first.name,second.name,'generation channels need unique names');
assert.equal(removed.length,1,'old channel removal started');
first.notify('CHANNEL_ERROR');assert.equal(ctx.hlgbRealtimeState,'offline','stale status must be ignored');
second.notify('SUBSCRIBED');assert.equal(ctx.hlgbRealtimeState,'SUBSCRIBED');
const oldEvents=first.handlers.find(h=>h.cfg?.table==='hlgb_records');
const newEvents=second.handlers.find(h=>h.cfg?.table==='hlgb_records');
oldEvents.fn({eventType:'UPDATE'});assert.equal(updates.length,0,'old event must be ignored');
newEvents.fn({eventType:'UPDATE'});assert.equal(updates.length,1);
ctx.hlgbStopRealtime();second.notify('CHANNEL_ERROR');
assert.equal(ctx.hlgbRealtimeState,'offline','logout stop invalidates callbacks');
newEvents.fn({eventType:'UPDATE'});assert.equal(updates.length,1);
console.log('PASS Realtime restart/login/logout: new generation alone may report status or apply events');
