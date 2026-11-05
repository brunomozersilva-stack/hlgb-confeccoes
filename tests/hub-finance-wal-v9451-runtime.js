const fs=require('fs'),vm=require('vm');
const code=fs.readFileSync('release-payroll-wal-race-v9346.js','utf8');
const store=new Map();
const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const baseData={date:'2026-09-04',flow:'Saída',note:'Folha consolidada de 37 funcionário(s).',value:70984.68,status:'Realizado',category:'Funcionários',sourceId:'2026-09',createdAt:'2026-10-02T11:59:25.974Z',updatedAt:'2026-11-01T21:48:10.391Z',realizedAt:'2026-09-04',sourceType:'payroll_month',description:'Folha de pagamento — 2026-09',subcategory:'Folha de pagamento',acceptedMethods:['Pix']};
let outerCalls=0;
async function oldInner(){return {applied:true}}
oldInner.__hlgbPayrollWalRace9346=true;
async function outer955(){outerCalls++;return oldInner.apply(this,arguments)}
outer955.__hlgb955Wrapped=true;outer955.__original=oldInner;
const snapshots={hubFinanceEntries:new Map([['payroll-month-2026-09',{data:{...baseData},revision:10,updated_at:'2026-11-02T13:24:13.464Z'}]])};
const ctx={console,structuredClone:global.structuredClone,localStorage,indexedDB:undefined,navigator:{onLine:true},document:{querySelector:()=>null,addEventListener:()=>{},visibilityState:'visible'},setTimeout:()=>0,clearTimeout:()=>{},queueMicrotask,Promise,Date,Map,Set,JSON,Number,String,Math,encodeURIComponent,window:{HLGB_RELEASE_VERSION:'94.50',hlgbRecordSnapshots:snapshots,hlgbRecordSaveWithRetry:outer955,addEventListener:()=>{},cloudRequest:async()=>[{module:'hubFinanceEntries',entity_id:'payroll-month-2026-09',revision:12,updated_at:'2026-11-02T17:50:00.000Z',deleted_at:null,data:{...baseData}}]}};
ctx.window.window=ctx.window;ctx.window.document=ctx.document;ctx.window.navigator=ctx.navigator;ctx.window.localStorage=localStorage;ctx.window.indexedDB=undefined;ctx.window.setTimeout=ctx.setTimeout;ctx.window.queueMicrotask=queueMicrotask;
vm.createContext(ctx);vm.runInContext(code,ctx);
const t=ctx.window.hlgbHubFinanceWal9451._test;
const server={module:'hubFinanceEntries',entity_id:'payroll-month-2026-09',revision:12,updated_at:'2026-11-02T17:50:00.000Z',deleted_at:null,data:{...baseData}};
const op=data=>({module:'hubFinanceEntries',id:'payroll-month-2026-09',deleted:false,data,baseData:{...baseData},baseUpdatedAt:'2026-11-02T13:24:13.464Z',opId:'0fcb0a0a-e857-45be-bf91-2994d5437fb1'});
const cases=[];
cases.push(['equal',t.operationProof(server,op({...baseData})).ok===true]);
cases.push(['updatedAt-only',t.operationProof(server,op({...baseData,updatedAt:'2099-01-01T00:00:00Z'})).ok===true]);
cases.push(['value-block',t.operationProof(server,op({...baseData,value:70984.69})).reason==='business-difference']);
for(const field of ['status','date','category','sourceId'])cases.push([field+'-block',t.operationProof(server,op({...baseData,[field]:String(baseData[field])+'-X'})).reason==='business-difference']);
cases.push(['no-server-proof',t.operationProof(null,op(baseData)).reason==='no-server-proof']);
Promise.resolve(ctx.window.hlgbRecordSaveWithRetry('hubFinanceEntries','payroll-month-2026-09',{...baseData,updatedAt:'2099-01-01'},false)).then(r=>{
 cases.push(['top-guard-installed',ctx.window.hlgbRecordSaveWithRetry.__hlgbPayrollWalRace9346===true]);
 cases.push(['outer-not-called-on-noop',outerCalls===0]);
 cases.push(['noop-applied',r&&r.applied===true&&r.hlgbNoop===true]);
 const bad=cases.filter(x=>!x[1]);if(bad.length){console.error('FAIL',bad);process.exit(1)}
 console.log('PASS hub finance WAL v94.51',Object.fromEntries(cases));
});
