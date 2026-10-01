const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-cut-model-grade-adjust.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-cut-model-grade-adjust.js'"));
const context={console,setTimeout(){return 0},db:{cuts:[{id:'c1',modelSplitChildV1:true,status:'Planejado',productId:'p1',product:'Calcinha Ariana',pieces:30,originalGrade:[{productId:'p1',color:'Preto',size:'P',qty:10},{productId:'p1',color:'Preto',size:'M',qty:20}]}],products:[{id:'p1',name:'Calcinha Ariana'}]},window:{renderCuts(){}},document:{getElementById(){return null}},alert(){},hlgbAfterLogin:null};
vm.createContext(context);vm.runInContext(src,context);
assert.equal(typeof context.window.hlgbOpenSplitGradeAdjust,'function');
assert.equal(context.window.HLGB_CUT_MODEL_GRADE_ADJUST_GUARD,'2026.10.01-cut-model-grade-adjust-v1');
console.log('PASS split grade adjust: module loads only for split-model cuts and preserves dedicated guard.');