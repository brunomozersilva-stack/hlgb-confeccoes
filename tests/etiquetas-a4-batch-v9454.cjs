const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const all=fs.readFileSync('release-operations-pack.js','utf8');
const start=all.indexOf('/* ---------- ETIQUETAS A4 v94.54'),end=all.indexOf('/* ---------- EMBALAGEM / MODELOS DE ETIQUETA',start);
assert(start>=0&&end>start,'v94.54 labels section must exist');
let printed='',prints=0;
const el={value:'large'},nodes=new Map([['opsLabelSize',el]]);
const document={
 getElementById:id=>nodes.get(id)||null,
 querySelectorAll:()=>[]
};
const ctx={window:{},document,console,Math,Number,String,Array,Object,Date,JSON,
 today:()=> '2026-11-03',
 escSafe:x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;'),
 printHtml:(_title,html)=>{prints++;printed=html},
 alert:msg=>{throw new Error(msg)},
 setTimeout:()=>1,clearTimeout:()=>{},q:v=>Number(v)||0};
vm.createContext(ctx);
vm.runInContext(all.slice(start,end),ctx);
const run=x=>vm.runInContext(x,ctx);
run("labelDraft9249=[{name:'Cortador',model:'Fio Briana',size:'P/M/G/GG',pieceQty:'560',volume:'5',date:'2026-11-03',qty:1}]");
let labels=ctx.window.HLGB_LABEL_BATCH_9454.expand();
assert.equal(labels.length,5,'five volumes must automatically create five labels');
assert.deepEqual(Array.from(labels,x=>x.displayVolume),['1 de 5','2 de 5','3 de 5','4 de 5','5 de 5']);
run("labelDraft9249.push({name:'Cortador',model:'Robe',size:'M',pieceQty:'180',volume:'',date:'2026-11-03',qty:2})");
run("labelDraft9249.push({name:'Cortador',model:'Cueca',size:'G',pieceQty:'300',volume:'',date:'2026-11-03',qty:3})");
let pages=ctx.window.HLGB_LABEL_BATCH_9454.getPages();
assert.equal(pages.per,10,'large mode must fit 10 labels per A4');
assert.equal(pages.labels.length,10);
assert.equal(pages.pages.length,1);
assert.deepEqual(Array.from(pages.labels,x=>x.model),['Fio Briana','Fio Briana','Fio Briana','Fio Briana','Fio Briana','Robe','Robe','Cueca','Cueca','Cueca']);
ctx.window.printLabels9249();
assert.equal(prints,1,'all models must print in one operation');
assert.equal((printed.match(/class="label"/g)||[]).length,10,'one page with 10 labels');
assert(printed.includes('VOLUME: 5 de 5'),'printed label must include volume ordinal');
run("labelDraft9249.push({name:'Cortador',model:'Calcinha',size:'G',pieceQty:'100',volume:'',date:'2026-11-03',qty:2})");
pages=ctx.window.HLGB_LABEL_BATCH_9454.getPages();
assert.deepEqual(Array.from(pages.pages,x=>x.length),[10,2],'additional labels continue onto next A4');
console.log('PASS etiquetas v94.54: 5 volumes numbered, 5+2+3=10 in one sheet, 12 across two sheets, one print');
