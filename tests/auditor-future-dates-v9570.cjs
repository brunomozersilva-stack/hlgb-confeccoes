'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','release-auditor-autocorrect-v9447.js'),'utf8');
const names=['recentIssueTime9570','recentTechnicalIssues','historicalIssues'];
const parts=names.map(name=>{
 const re=new RegExp('^function '+name+'\\([^\\n]+$','m');
 const m=src.match(re);assert(m,'missing '+name);return m[0];
});
const logic=[
 'const RECENT_MS=15*60*1000;',
 'const issueAt=x=>Date.parse(x.lastSeenAt);',
 "const openIssue=x=>x.status==='Aberto';",
 "const technicalIssue=x=>/Falha ao salvar/.test(x.title);",
 'const allIssues=()=>[];',
 ...parts,
 '({recentTechnicalIssues,historicalIssues,recentIssueTime9570});'
].join('\n');
const api=vm.runInNewContext(logic);
const at=Date.parse('2026-11-12T23:30:22Z');
const rows=[
 {id:'actual',title:'Falha ao salvar production',status:'Aberto',lastSeenAt:'2026-11-12T23:25:00Z'},
 {id:'future',title:'Falha ao salvar production',status:'Aberto',lastSeenAt:'2026-12-13T10:58:27Z'},
 {id:'past',title:'Falha ao salvar production',status:'Aberto',lastSeenAt:'2026-11-01T00:00:00Z'},
 {id:'grace',title:'Falha ao salvar production',status:'Aberto',lastSeenAt:'2026-11-12T23:30:35Z'},
 {id:'nontechnical',title:'Anotação',status:'Aberto',lastSeenAt:'2026-11-12T23:25:00Z'}
];
const ids=a=>Array.from(a,x=>x.id);
assert.deepEqual(ids(api.recentTechnicalIssues(rows,at)),['actual','grace']);
assert.deepEqual(ids(api.historicalIssues(rows,at)),['future','past']);
assert.equal(api.recentIssueTime9570({lastSeenAt:'2026-12-13T10:58:27Z'},at),false);
assert.equal(api.recentIssueTime9570({lastSeenAt:'2026-11-12T23:30:35Z'},at),true);
assert(src.includes('seen<=at+30000'),'future upper bound must remain');
console.log('PASS Auditor v95.70: future timestamps excluded, recent real incidents retained, historical classification safe, clock skew <=30 sec accepted.');
