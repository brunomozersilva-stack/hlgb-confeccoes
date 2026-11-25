'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('app9240.html','utf8');
const begin=html.indexOf('function gradeSignature9691('),end=html.indexOf('\nfunction enhanceGradeButtons9191',begin);
assert(begin>=0&&end>begin);
const source=html.slice(begin,end);
const clone=v=>JSON.parse(JSON.stringify(v)), stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const eq=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const colors=['Preto','Branco','Rubi','Frozen','Fantastico','Teos'],sizes=['P','M','G','GG'],planned=[[20,60,40,20],[10,30,20,10],[30,90,60,30],[10,30,20,10],[10,30,20,10],[10,30,20,10]],real=[[20,60,40,20],[10,30,20,10],[3,9,6,3],[2,6,4,2],[6,18,12,6],[10,30,20,10]];
const grade=colors.flatMap((color,i)=>sizes.map((size,j)=>({productId:'p',color,size,qty:planned[i][j]})));
async function run(mode){
 const original={id:'c',orderId:'o',status:'Planejado',pieces:630,productId:'p',autoOrderCutV9203:true,untouched:'keep'};
 const order={id:'o',grade:clone(grade)}, db={cuts:[clone(original)],orders:[order],products:[{id:'p',name:'Short Doll Yza'}],sizes};
 let remote={module:'cuts',entity_id:'c',revision:1,deleted_at:null,data:clone(original)},writes=0,readCount=0,saved=0,closed=0,alerts=[],pending=false,saveCb,btn={isConnected:true,disabled:false,textContent:''},inputs=new Map();
 grade.forEach((x,i)=>inputs.set('adj9191_'+i,{value:String(real[Math.floor(i/4)][i%4])}));inputs.set('adjNote9191',{value:'Faltou material'});
 const snap={cuts:new Map([['c',{revision:1,deleted_at:null,data:clone(original)}]])};
 const sandbox={window:{hlgbWalIdbGuard9536:{probe:async()=>{},ids:()=>pending?['cuts::c']:[],status:()=>({readFailed:false})}},db,console:{error(){}},clone9191:clone,orderFor9191:()=>order,cutOriginalGrade:(c,o)=>c.plannedGradeBeforeAdjustmentV9243?.length?c.plannedGradeBeforeAdjustmentV9243:c.originalGrade?.length?c.originalGrade:o.grade,esc9191:String,hlgbSortedSizes:a=>a,cloudEnsureFreshSession:async()=>{},hlgbRecordReady:true,cloudAccessToken:'fixture',hlgbRecordCanWrite:()=>true,hlgbRecordSnapshots:snap,hlgbRecordDataEqual:eq,cloudRequest:async(path)=>{if(path.includes('module=eq.orders'))return [{module:'orders',entity_id:'o',deleted_at:null,revision:1,data:clone(order)}];readCount++;if(mode==='lost-read'&&readCount===2)throw Error('offline');return [clone(remote)]},hlgbRecordSaveWithRetry:async(module,id,next)=>{writes++;assert.equal(module,'cuts');assert.equal(id,'c');assert.equal(db.cuts[0].pieces,630,'no local mutation before ACK');assert.equal(next.pieces,357);assert.equal(next.originalGrade.reduce((n,x)=>n+x.qty,0),630);assert.equal(next.untouched,'keep');if(mode==='reject')return {applied:false,reason:'rejected'};remote={...remote,revision:2,data:clone(next)};if(mode==='lost-ack')throw Error('network');return {applied:true,data:clone(next),revision:2}},openModal:(t,b,cb)=>{saveCb=cb},document:{getElementById:id=>inputs.get(id),querySelector:()=>btn},alert:m=>alerts.push(m),localSaveOnly:()=>saved++,closeModal:()=>{closed++;btn.isConnected=false},isFinal9191:()=>false,renderCuts(){},renderDailyCuts(){},renderCutters(){},renderProduction(){}};
 vm.createContext(sandbox);vm.runInContext(source,sandbox);
 sandbox.window.hlgbAdjustCutGrade9191('c');assert(eq(db.cuts[0],original),'opening must not mutate legacy cut');
 if(mode==='pending')pending=true;
 if(mode==='stale'){remote.revision=2;remote.data.pieces=500;}
 const result=await saveCb();
 if(['ok','lost-ack'].includes(mode)){assert.equal(result,true);assert.equal(db.cuts[0].pieces,357);assert.equal(writes,1);assert.equal(saved,1);assert.equal(closed,1)}
 else if(mode==='lost-read'){assert.equal(result,false);assert.equal(db.cuts[0].pieces,630);assert.equal(closed,0);assert.equal(await saveCb(),true);assert.equal(writes,1,'reconcile without another POST');assert.equal(db.cuts[0].pieces,357)}
 else {assert.equal(result,false);assert(eq(db.cuts[0],original));assert.equal(closed,0);assert(alerts.length);assert.equal(writes,mode==='reject'?1:0);if(mode==='reject'){assert.equal(await saveCb(),false);assert.equal(writes,1,'no blind resend')}}
 assert(eq(order.grade,grade),'pedido intacto');console.log('PASS grade save '+mode);
}
(async()=>{for(const m of ['ok','lost-ack','lost-read','reject','pending','stale'])await run(m)})().catch(e=>{console.error(e);process.exit(1)});
