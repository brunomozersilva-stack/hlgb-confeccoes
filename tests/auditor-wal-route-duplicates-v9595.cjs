'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('release-auditor-autocorrect-v9448.js','utf8');
function make(){
 const writes=[],win={__HLGB_TEST__:true,__HLGB_AUTH_READY:false,addEventListener(){}};
 const context={window:win,document:{querySelector:()=>null},localStorage:{setItem(...args){writes.push(args)}},
  console,JSON,Map,Set,Object,Array,String,Number,Date,structuredClone,setTimeout(){}};
 vm.createContext(context);vm.runInContext(source,context);
 return {inspect:win.hlgbAuditorAutoCorrect9448.summarizeRouteDuplicates9595,writes};
}
function route(id,stops,overrides={}){
 return {module:'routePlans',id,opId:'op-'+id,deleted:false,data:{
  id,date:'2026-11-10',driver:'Bruno',status:'Pendente',notes:'',
  stops:stops.map((name,order)=>({order:order+1,name})),
  createdAt:'2026-11-10T12:00:00Z',updatedAt:'2026-11-10T12:00:01Z',...overrides}};
}
test('12 route WAL operations resolve to 2 logical contents and 10 extra local copies',()=>{
 const x=make(),six=['Graziano','Luana','Ge','Vanessa','Cris','Roseli'],seven=[...six,'Externo'];
 const entries=[route('r1',six),route('r2',six,{updatedAt:'later'}),
  ...Array.from({length:10},(_,i)=>route('r'+(i+3),seven,{createdAt:String(i)}))];
 const out=x.inspect(entries);
 assert.equal(out.status,'read-only');
 assert.equal(out.totalRouteOperations,12);
 assert.equal(out.distinctRouteContents,2);
 assert.equal(out.duplicateCopies,10);
 assert.equal(out.groups.length,2);
 assert.deepEqual(Array.from(out.groups.map(g=>g.count)),[10,2]);
 assert.match(out.warning,/não é ACK/);
 assert.equal(JSON.stringify(out).includes('Graziano'),false,'do not include business stops in evidence');
 assert.equal(x.writes.length,0);
});
test('real content changes are not incorrectly called duplicates',()=>{
 const x=make();
 const entries=[route('r1',['Graziano','Luana']),route('r2',['Graziano','Roseli']),route('r3',['Graziano','Luana'],{status:'Concluída'}),
  route('r4',['Graziano','Luana'],{notes:'nota nova'}),
  {...route('r5',['Graziano','Luana']),deleted:true},
  {module:'orders',id:'o1',data:{id:'o1'}}];
 const out=x.inspect(entries);
 assert.equal(out.totalRouteOperations,4);
 assert.equal(out.distinctRouteContents,4);
 assert.equal(out.duplicateCopies,0);
 assert.equal(out.groups.length,0);
 assert.equal(x.writes.length,0);
});
test('invalid or empty WAL input is safe and read-only',()=>{
 const x=make();
 assert.equal(x.inspect(null).duplicateCopies,0);
 assert.equal(x.inspect([{module:'routePlans',data:null}]).totalRouteOperations,0);
 assert.equal(x.writes.length,0);
});
