const fs=require('fs'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..');
const current=fs.readFileSync(path.join(root,'release-current.js'),'utf8');
const notes=fs.readFileSync(path.join(root,'release-note-integrity.js'),'utf8');
const stability=fs.readFileSync(path.join(root,'release-ui-stability.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');

assert(current.includes('function releaseMutationRelevant(records)'),'release-current must filter mutation records');
assert(current.includes('if(!releaseMutationRelevant(records)||pending)return'),'release-current must ignore unrelated DOM mutations');
assert(current.includes('function repairDynamic()'),'global observer must use dynamic repair only, not full boot repair');
assert(current.includes("if(root.childNodes?.length)root.innerHTML=''"),'hidden cuts cleanup must be idempotent');

assert(notes.includes('function noteMutationRelevant(records)'),'note integrity must filter mutation records');
assert(notes.includes('if(!noteMutationRelevant(records))return'),'note observer must ignore unrelated DOM mutations');

assert(stability.includes("const V='v6-screen-stability-20261002'"),'UI stability guard v6 must remain active');
const list=(loader.match(/const files=\[(.*?)\];const inj=/s)||[])[1]||'';
assert(list.includes("'release-ui-stability.js','release-safari-resume-v9266.js'"),'Safari resume guard must load immediately after UI stability');
assert(list.trim().endsWith("'release-safari-resume-v9266.js'"),'Safari resume guard must be the last visual protection');

console.log('PASS global visual stability: scoped observers, UI stability and Safari resume guard load in safe order.');
