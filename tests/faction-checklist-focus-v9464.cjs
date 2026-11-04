const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync('app9240.html','utf8');
const begin=app.indexOf('function renderFactionChecklists9198(){'),end=app.indexOf('window.renderFactionChecklists9198=renderFactionChecklists9198;',begin);
assert(begin>0&&end>begin,'Faction checklist canonical renderer present');
let input=null,list=null,builds=0;
const box={querySelector:s=>s==='#hlgbFactionChecklistRows9198'?list:null,
 set innerHTML(v){builds++;input={value:'',selectionStart:0,selectionEnd:0};list={innerHTML:''};this._html=v},
 get innerHTML(){return this._html}};
const doc={getElementById:id=>id==='factionChecklistTable9176'?box:id==='factionChecklistSearch9198'?input:null};
const db={materialChecklists:[{id:7,destinationType:'F',destinationName:'Roseli',productName:'Fio Briana',status:'Pendente',createdAt:'2026-11-03',qty:40,materials:[]}]};
const ctx={document:doc,db,showClosedChecklist9198:false,
 n9198:v=>String(v||'').toLowerCase(),checklistClosed9198:()=>false,
 checklistMaterialRows9198:()=>[],fmtDate:x=>x,fmtQty:x=>x,esc9198:x=>String(x),
 gradeCompact9198:()=>'',table:(_headers,rows)=>JSON.stringify(rows),String,Array,Number,Object,console};
vm.createContext(ctx);vm.runInContext(app.slice(begin,end),ctx);
ctx.renderFactionChecklists9198();
assert.equal(builds,1);
const originalInput=input;
input.value='Ros';input.selectionStart=3;input.selectionEnd=3;
ctx.renderFactionChecklists9198();
assert.equal(builds,1,'input must not be recreated during typing');
assert.equal(input,originalInput,'input must retain DOM identity');
assert.equal(input.selectionStart,3,'caret position must be preserved');
assert(list.innerHTML.includes('Roseli'),'matching checklist shown');
input.value='Vanessa';ctx.renderFactionChecklists9198();
assert(list.innerHTML.includes('Nenhum checklist encontrado'),'empty search has accurate explanation');
input.value='';ctx.renderFactionChecklists9198();
assert(list.innerHTML.includes('Roseli'),'clearing restores results');
console.log('PASS checklist search maintains input identity, caret, filtering and no-match state');
