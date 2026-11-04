'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('release-auditor-autocorrect-v9448.js','utf8');
let html='',attributes={};
const card={setAttribute:(key,val)=>attributes[key]=val,set innerHTML(v){html=v},get innerHTML(){return html}};
const host={prepend(){}};
const doc={querySelector:()=>null,getElementById:id=>id==='hlgbAuditorResult'?host:id==='hlgbAuditorAutoCorrect9448Card'?card:null,createElement:()=>card};
const win={addEventListener:()=>{},__HLGB_AUTH_READY:false};
const ctx={window:win,document:doc,console,Date,Promise,Map,Set,Object,Array,JSON,String,Number,
 structuredClone,setTimeout:()=>1,clearTimeout:()=>{},localStorage:{setItem:()=>{}},navigator:{userAgent:'test'}};
vm.createContext(ctx);vm.runInContext(source,ctx);
const summary={passes:0,stopReason:'pendência não comprovada',needsCode:[{id:'sync:indexeddb-wal',detail:'1 WAL'}],
 businessBlocked:[],productionResidual:{after:{candidateCount:0}},knownGaps:[],
 triage:{signal:{indexedDbWal:{status:'ok',count:1,items:[{module:'routePlans',id:'route-1',opId:'id-A'}]}}},
 walProof:{mode:'read-only',attempted:true,status:'all-content-matched',matched:1,different:0,missing:0,unverified:0,removed:0,
 items:[{module:'routePlans',id:'route-1',opId:'id-A',status:'content-match'}]}};
assert.equal(win.hlgbAuditorAutoCorrect9448.render(summary),true);
for(const x of ['somente leitura','conteúdo igual: 1','cópias comprovadas removidas: 0','content-match','route-1','id-A'])assert(html.includes(x),x);
assert.equal(attributes['data-audit-completed'],'true');
summary.walProof.status='cloud-api-unavailable';summary.walProof.attempted=false;summary.walProof.items=[];
win.hlgbAuditorAutoCorrect9448.render(summary);
assert(html.includes('indisponível'));
assert(html.includes('não executada'));
summary.auditCompleted=false;summary.failure={message:'Consulta falhou'};
win.hlgbAuditorAutoCorrect9448.render(summary);
assert(html.includes('Auditor NÃO concluiu'));
assert(!html.includes('conteúdo igual'));
console.log('PASS v94.82: WAL proof shown accurately without claiming removed entries or verified failure as success');