'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const legacy=fs.readFileSync(path.join(root,'release-label-destination-v9310.js'),'utf8');
const core=fs.readFileSync(path.join(root,'hlgb-modules/utilidades/etiquetas-layout-v9602b.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
const samples=[
 {name:'Cortador & Cliente <A>',model:'Conjunto Rosa',size:'P/M/G',pieceQty:'560',volume:'1 de 5',date:'2026-11-18',destination:'Facção Roseli',includeDate:true,copies:2},
 {name:'Joana "Teste"',model:'Robe Gabrielle',size:'GG',pieceQty:'120',volume:'2 de 5',date:'',destination:"L'Equipe",includeDate:false,copies:9},
 {name:'',model:'Calcinha',size:'P',pieceQty:'10',volume:'3 de 5',date:'2026-11-19',destination:'',includeDate:false,copies:1}
];
function environment(withCore,rows=samples,mode='large'){
 let printed='',preview={innerHTML:''};
 const selectors={'.ln':'name','.lm':'model','.ls':'size','.lpq':'pieceQty','.lv':'volume','.ld':'date','.ldest9310':'destination','.lq':'copies'};
 const elements=rows.map(r=>({
  querySelector(selector){
   if(selector==='.grid')return null; // DOM already managed by legacy source; focus on pure rendering.
   if(selector==='.ldate9310')return {checked:r.includeDate};
   const key=selectors[selector];return key?{value:r[key]}:null;
  }
 }));
 const doc={
  getElementById:id=>id==='opsLabelPreview'?preview:id==='opsLabelSize'?{value:mode}:null,
  querySelectorAll:selector=>selector==='.ops-label-row'?elements:[],
  createElement(){throw Error('unexpected DOM creation')}
 };
 const window={open:()=>({document:{write(s){printed=s},close(){}},focus(){}})};
 const context={window,document:doc,console:{info(){},warn(){}},setInterval:()=>1,clearInterval:()=>{},alert:()=>{throw Error('printing blocked')},setTimeout:()=>1};
 vm.createContext(context);
 if(withCore)vm.runInContext(core,context);
 vm.runInContext(legacy,context);
 return {window,html:()=>preview.innerHTML,printed:()=>printed,
  api:window.hlgbLabelDestination9310,rows:copy(rows)};
}
test('a main mantém os 156 scripts comerciais na mesma ordem, com um core antes da etiqueta',()=>{
 const anchor='const moduleGroups=',start=loader.indexOf(anchor);
 const end=loader.indexOf(';const files=moduleGroups.flatMap(group=>group.files)',start);
 assert.ok(start>=0&&end>start);
 const groups=JSON.parse(loader.slice(start+anchor.length,end));
 const files=groups.flatMap(g=>g.files);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'hlgb-modules/ownership-v9600.json'),'utf8'));
 const addon='hlgb-modules/utilidades/etiquetas-layout-v9602b.js';
 assert.equal(files.length,manifest.releaseScripts.length);
 assert.equal(new Set(files).size,files.length);
 assert.deepEqual(files,manifest.releaseScripts);
 assert.deepEqual(files.filter(x=>!manifest.approvedNewScripts.includes(x)),manifest.preExtractionScripts);
 assert.equal(files.indexOf(addon)+1,files.indexOf('release-label-destination-v9310.js'));
});
test('módulo novo não usa DOM, banco, rede, impressora, WAL ou timer',()=>{
 for(const forbidden of ['document.','cloudRequest','indexedDB','localStorage','hlgbRecordSaveWithRetry','window.open','setInterval','fetch('])
  assert.equal(core.includes(forbidden),false,'cálculo puro não pode executar '+forbidden);
 assert.equal(core.includes('function labelSize(mode)'),true);
 assert.equal(core.includes("function labelBody(x,tag='span')"),true);
});
test('pequena/média/grande: prévia HTML e geometria idênticas ao fallback',()=>{
 for(const mode of ['small','medium','large','INVALID',null]){
  const before=environment(false,samples,mode),after=environment(true,samples,mode);
  assert.deepEqual(JSON.parse(JSON.stringify(after.api.collect())),JSON.parse(JSON.stringify(before.api.collect())));
  assert.equal(after.html(),before.html(),'prévia inicial diferente');
  const a=before.window.HLGB_LABEL_LAYOUT_9602B,b=after.window.HLGB_LABEL_LAYOUT_9602B;
  assert.equal(a,undefined);assert.ok(b);
  assert.equal(JSON.stringify(b.labelSize(mode)),JSON.stringify(b.labelSize(mode==='INVALID'?'small':mode)));
 }
});
test('impressão completa A4 é byte a byte idêntica com core ou fallback',()=>{
 const a=environment(false),b=environment(true),old=JSON.stringify(a.rows);
 a.window.printLabels9249();b.window.printLabels9249();
 assert.equal(b.printed(),a.printed(),'HTML da impressão deve manter todos os pixels e textos da saída original');
 assert.match(b.printed(),/DESTINO:/);
 assert.match(b.printed(),/Facção Roseli/);
 assert.match(b.printed(),/1 de 5/);
 assert.match(b.printed(),/class="page labelpage"/);
 assert.equal((b.printed().match(/class="page labelpage"/g)||[]).length,2,'12 etiquetas devem ocupar duas páginas de até 10');
 assert.equal(JSON.stringify(b.rows),old,'impressão não pode modificar registros locais');
});
test('escape HTML, opcional de data e nomes vazios mantêm a mesma saída',()=>{
 const old=environment(false),newMode=environment(true);
 const pure=newMode.window.HLGB_LABEL_LAYOUT_9602B;
 for(const row of [
  ...samples,{}, {name:"<script>alert(1)</script>",destination:'X & Y',includeDate:true,date:'2026-11-18'},
  {name:'Teste',model:'',size:'',pieceQty:'',volume:'',destination:'',includeDate:false}
 ]){
  for(const tag of ['span','div']){
   // Compare pure output against an independent capture of the unchanged function body
   const start=legacy.indexOf("function labelBody(x,tag='span'){"),end=legacy.indexOf('function renderPreview(){',start);
   const original=legacy.slice(start,end);
   const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
   const expected=new Function('esc','x','tag','const labelCore9602b=null;\n'+original+' return labelBody(x,tag);')(esc,row,tag);
   assert.equal(pure.labelBody(row,tag),expected);
  }
 }
 const sanitized=pure.labelBody(samples[0]);
 assert.match(sanitized,/&lt;A&gt;/);
 assert.ok(!sanitized.includes('<A>'));
 assert.doesNotMatch(pure.labelBody(samples[1]),/DATA:/);
});
