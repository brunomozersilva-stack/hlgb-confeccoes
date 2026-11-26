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
assert.equal((html.match(/printCuttingSheet/g)||[]).length,1);
assert.match(html,/<td>8<\/td>/);
assert.match(gradeCtx.renderGrade(cut,{id:'o1'},true),/disabled title="Corte duplicado/);
assert.doesNotMatch(gradeCtx.renderGrade({...cut,status:'Finalizado'},{id:'o1'},false),/hlgbOpenSplitGradeAdjust/);
assert.match(split,/gradeMini\(c,o,ambiguous\)/);
console.log('PASS single grade group preserves view, print, adjustment and ambiguity guard');
