const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('release-auditor-autocorrect-v9448.js','utf8');
let html='',attributes={};
const card={id:'hlgbAuditorAutoCorrect9448Card',setAttribute(k,v){attributes[k]=v},set innerHTML(v){html=v},get innerHTML(){return html}};
const host={prepend(){}};
const document={querySelector:()=>null,getElementById:id=>id==='hlgbAuditorResult'?host:id==='hlgbAuditorAutoCorrect9448Card'?card:null,createElement:()=>card};
const win={addEventListener:()=>{},__HLGB_AUTH_READY:false};
const ctx={window:win,document,console,Date,Promise,Map,Set,Object,JSON,String,Number,structuredClone,
 localStorage:{setItem:()=>{}},setTimeout:()=>1,clearTimeout:()=>{},navigator:{userAgent:'test'}};
vm.createContext(ctx);vm.runInContext(source,ctx);
const summary={passes:0,stopReason:'Triagem rápida: 2 pendências WAL no IndexedDB ainda sem prova de conclusão',
 productionResidual:{after:{candidateCount:1,items:[{id:'prod-r-1',classification:'needs-code',detail:'Prova não encontrada'}]}},
 needsCode:[{id:'sync:indexeddb-wal',detail:'2 operações locais sem prova'},{id:'structure:save-responsibilities',detail:'responsabilidade duplicada'},{id:'structure:duplicate-scripts',detail:'scripts repetidos'}],
 businessBlocked:[],triage:{signal:{indexedDbWal:{status:'ok',count:2,items:[{module:'routePlans',id:'route-A',opId:'id-A'},{module:'production',id:'prod-B',opId:'id-B'}]}}},
 walProof:{attempted:true,removed:0},knownGaps:['A ↔ B não comprovado']};
assert.equal(win.hlgbAuditorAutoCorrect9448.render(summary),true);
for(const expected of ['routePlans','route-A','prod-B','id-A','id-B','responsabilidade duplicada','scripts repetidos','prod-r-1','2 operações locais sem prova','A ↔ B não comprovado'])assert(html.includes(expected),expected);
assert(!html.includes('Auditor NÃO concluiu'));
assert.equal(attributes['data-audit-completed'],'true');
summary.needsCode[0].detail='<script>alert("inject")</script>';
win.hlgbAuditorAutoCorrect9448.render(summary);
assert(!html.includes('<script>alert('),'must HTML-escape diagnostic strings');
summary.auditCompleted=false;summary.failure={message:'Erro de conexão'};
win.hlgbAuditorAutoCorrect9448.render(summary);
assert(html.includes('Auditor NÃO concluiu'));
assert(!html.includes('Detalhes das pendências'),'failed audit must not show stale findings');
console.log('PASS Auditor evidence panel: identifies WAL, code tasks, Production residual, escapes HTML and handles failures');
