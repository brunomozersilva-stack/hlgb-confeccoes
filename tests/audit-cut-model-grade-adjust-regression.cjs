const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-cut-model-grade-adjust.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-cut-model-grade-adjust.js'"));
const context={console,setTimeout(){return 0},db:{cuts:[{id:'c1',modelSplitChildV1:true,status:'Planejado',productId:'p1',product:'Calcinha Ariana',pieces:30,originalGrade:[{productId:'p1',color:'Preto',size:'P',qty:10},{productId:'p1',color:'Preto',size:'M',qty:20}]}],products:[{id:'p1',name:'Calcinha Ariana'}]},window:{renderCuts(){}},document:{getElementById(){return null}},alert(){},hlgbAfterLogin:null};
vm.createContext(context);vm.runInContext(src,context);
assert.equal(typeof context.window.hlgbOpenSplitGradeAdjust,'function');
assert.equal(context.window.HLGB_CUT_MODEL_GRADE_ADJUST_GUARD,'94.23-cut-model-grade-adjust');
console.log('PASS split grade adjust: module loads only for split-model cuts and preserves dedicated guard.');
// Grade script executes before canonical 3D script: no racing request.
const list=loader.match(/const files=\[([\s\S]*?)\];\/\* A base/)[1];
assert(list.indexOf("'release-cut-model-grade-adjust.js'")<list.indexOf("'release-printer3d-persistence-v9431.js'"));
for(const scenario of ['canonical','missing','failed']){
 const appended=[],callbacks=[],w={renderCuts(){}};
 const c={console:{warn(){}},setTimeout(){},db:{cuts:[],products:[]},window:w,document:{readyState:'loading',getElementById:()=>null,querySelector:()=>null,addEventListener:(name,fn)=>{assert.equal(name,'DOMContentLoaded');callbacks.push(fn)},createElement:()=>({dataset:{}}),head:{appendChild:s=>appended.push(s)}},alert(){}};
 vm.createContext(c);vm.runInContext(src,c);vm.runInContext(src,c);
 const p=()=>appended.filter(s=>s.src.includes('release-printer3d-persistence-v9431.js'));
 assert.equal(p().length,0,'no premature 3D injection');assert.equal(callbacks.length,1);
 if(scenario==='canonical')w.HLGB_PRINTER3D_PERSISTENCE_9431=true;
 callbacks[0]();callbacks[0]();
 assert.equal(p().length,scenario==='canonical'?0:1);
 if(scenario==='missing'){w.HLGB_PRINTER3D_PERSISTENCE_9431=true;p()[0].onload();assert.equal(w.__HLGB_PRINTER3D_FALLBACK_9694,'ready')}
 if(scenario==='failed'){p()[0].onerror();assert.equal(w.__HLGB_PRINTER3D_FALLBACK_9694,'failed')}
 assert.equal(typeof w.hlgbOpenSplitGradeAdjust,'function');
}
console.log('PASS 3D canonical boot avoids competing grade injection, one bounded legacy fallback');

// Execute the exact grade group renderer: read, print, edit and protection remain available.
const split=fs.readFileSync(path.join(__dirname,'..','release-cut-model-split.js'),'utf8');
const begin=split.indexOf('function gradeMini(c,o,ambiguous)'),end=split.indexOf('// v95.19',begin);
assert(begin>=0&&end>begin);
const cut={id:'c1',status:'Planejado',originalGrade:[{color:'Preto',size:'P',qty:10}],actualCutGrade:[{color:'Preto',size:'P',qty:8}]};
const gradeCtx={isFinal:c=>c.status==='Finalizado',q:Number,escSafe:String,printCuttingSheet(){}};
vm.createContext(gradeCtx);vm.runInContext(split.slice(begin,end)+';globalThis.renderGrade=gradeMini',gradeCtx);
const html=gradeCtx.renderGrade(cut,{id:'o1'},false);
assert.equal((html.match(/data-hlgb-grade-group9711/g)||[]).length,1);
assert.equal((html.match(/hlgbOpenSplitGradeAdjust/g)||[]).length,1);
assert.equal((html.match(/hlgbPrintSplitCut9822/g)||[]).length,1);
assert.match(html,/<div class="toolbar">[\s\S]*hlgbPrintSplitCut9822[\s\S]*<\/div><details>/,'print must be visible before the collapsed grade');
assert.match(html,/<td>8<\/td>/);
assert.match(gradeCtx.renderGrade(cut,{id:'o1'},true),/disabled title="Corte duplicado/);
assert.doesNotMatch(gradeCtx.renderGrade({...cut,status:'Finalizado'},{id:'o1'},false),/hlgbOpenSplitGradeAdjust/);
assert.match(split,/gradeMini\(c,o,ambiguous\)/);
console.log('PASS single grade group preserves view, print, adjustment and ambiguity guard');

// The split editor must preserve a pending draft and never invent ACK content.
async function splitGradeSave9723(mode){
 const clone=x=>JSON.parse(JSON.stringify(x)),cut={id:'c1',modelSplitChildV1:true,status:'Planejado',productId:'p1',pieces:30,originalGrade:[{productId:'p1',color:'Preto',size:'P',qty:10},{productId:'p1',color:'Preto',size:'M',qty:20}]};
 const db={cuts:[clone(cut)],products:[{id:'p1',name:'Modelo'}]},fields={hlgbAdjCell_0:{value:'6'},hlgbAdjCell_1:{value:'14'},hlgbAdjNote:{value:'Faltou material'}},btn={isConnected:true,disabled:false};
 let remote={module:'cuts',entity_id:'c1',revision:1,deleted_at:null,data:clone(cut)},reads=0,writes=0,save,closed=0,alerts=[];
 const w={__HLGB_AUTH_READY:true,renderCuts(){},hlgbWalIdbGuard9536:{probe:async()=>{},ids:()=>new Set(mode==='pending'?['cuts::c1']:[]),status:()=>({probes:1,entryCount:mode==='pending'?1:0,readFailed:mode==='wal-error',unsupported:mode==='unsupported',localReadFailed:false})},hlgbRecordPendingIdentitySet9535:()=>new Set(),cloudRequest:async(path,opts)=>{assert.equal(opts.method,'GET');reads++;if((mode==='lost-read'||mode==='lost-read-local-confirmed')&&reads===2)throw Error('offline');return [clone(remote)]}};
 const ctx={window:w,db,hlgbRecordSnapshots:{cuts:new Map([['c1',{revision:mode==='stale-snapshot'?2:1,data:clone(cut),deleted_at:null}]])},localStorage:{getItem:k=>mode==='bad-local'&&k==='hlgb_durable_wal_v1'?'{broken':null},console:{warn(){}},setTimeout(){},document:{getElementById:id=>fields[id]||null,querySelector:()=>btn},openModal:(title,html,fn)=>{save=fn},closeModal:()=>{closed++;btn.isConnected=false},renderCuts(){},localSaveOnly(){},alert:m=>alerts.push(m),hlgbRecordSaveWithRetry:async(module,id,next)=>{writes++;assert.equal(module,'cuts');assert.equal(id,'c1');assert.equal(db.cuts[0].pieces,30);if(mode==='reject')return {applied:true};remote={...remote,revision:2,data:clone(next)};if(mode==='timeout')throw Error('timeout');return {applied:true}}};
 vm.createContext(ctx);vm.runInContext(src,ctx);await w.hlgbOpenSplitGradeAdjust('c1');
 if(mode==='stale')remote.data.pieces=99;
 if(mode==='invalid')fields.hlgbAdjCell_0.value='1.5';
 const first=await save();
 if(['ok','timeout'].includes(mode)){assert.equal(first,true);assert.equal(writes,1);assert.equal(closed,1)}
 else if(mode==='lost-read'||mode==='lost-read-local-confirmed'){assert.equal(first,false);assert.equal(db.cuts[0].pieces,30);assert.equal(closed,0);if(mode==='lost-read-local-confirmed')db.cuts[0]=clone(remote.data);assert.equal(await save(),true);assert.equal(writes,1)}
 else {assert.equal(first,false);assert.equal(db.cuts[0].pieces,30);assert.equal(closed,0);assert.equal(writes,mode==='reject'?1:0);if(mode==='reject'){assert.equal(await save(),false);assert.equal(writes,1)}return}
 assert.equal(db.cuts[0].pieces,20);assert.equal(db.cuts[0].plannedGradeBeforeAdjustmentV9243.reduce((n,x)=>n+x.qty,0),30);assert.equal(db.cuts[0].actualCutGrade.reduce((n,x)=>n+x.qty,0),20);
}
(async()=>{for(const mode of ['ok','timeout','lost-read','lost-read-local-confirmed','reject','stale','invalid','pending','wal-error','unsupported','bad-local','stale-snapshot'])await splitGradeSave9723(mode);console.log('PASS split grade save proof, original planned grade and retry protection')})().catch(e=>{console.error(e);process.exitCode=1});
