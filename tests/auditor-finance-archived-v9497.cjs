'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('release-diagnostics-center.js','utf8');
const archivedId='999000001',financeId='999000002';
const finance={id:financeId,projectionInvoiceId:archivedId,status:'Pago',paid:100,value:100};
const prior={id:archivedId,status:'Pendente',value:100};
const snap={data:structuredClone(prior),deleted_at:'2026-10-24T11:44:11Z',revision:8};
const map=new Map([[archivedId,snap]]);
const db={
 orders:[],products:[],cuts:[],production:[],capacityAssignments:[],finance:[finance],
 projectionInvoices:[],employees:[],terminations:[],factions:[],missingPieces:[],
 systemIssues:[],systemSuggestions:[]
};
const ctx={
 console,db,hlgbRecordSnapshots:{projectionInvoices:map},
 window:{HLGB_RELEASE_VERSION:'94.97',addEventListener(){}},
 navigator:{userAgent:'test Safari'},
 document:{readyState:'loading',addEventListener(){},querySelector(){return null},getElementById(){return null}},
 setTimeout(){return 0},clearTimeout(){},alert(){},confirm(){return true},
 localStorage:{getItem(){return null},setItem(){throw Error('unexpected write')},removeItem(){throw Error('unexpected delete')}},
 CSS:{escape:String},Blob:function(){},URL:{createObjectURL(){return ''},revokeObjectURL(){}}
};
vm.createContext(ctx);vm.runInContext(src,ctx);
const scan=()=>ctx.window.hlgbDiagnosticsCenter.scanSystem();
function one(){const rows=scan().filter(x=>x.code==='finance-projection-orphan');assert.equal(rows.length,1);return rows[0]}
let f=one();
assert.equal(f.severity,'Alta','historical paid finance still requires human review');
assert.match(f.title,/nota excluída/i);
assert.match(f.description,/nota excluída em 2026-10-24T11:44:11Z/);
assert.match(f.description,/financeiro preservado/i);
assert.match(f.description,/Divergência histórica/);
assert(!f.description.includes('inexistente'),'historically deleted is not nonexistent');
assert.equal(f.refs.length,2,'retain precise finance+invoice references');
assert.equal(f.refs[0].id,financeId);
assert.equal(f.refs[1].id,archivedId);
assert.equal(ctx.db.finance[0].paid,100,'no financial mutation');
assert.equal(ctx.db.projectionInvoices.length,0,'do not restore invoice');
// If the tombstone was not loaded, do not invent remote certainty.
ctx.hlgbRecordSnapshots.projectionInvoices.clear();
f=one();assert.match(f.description,/não encontrada entre as projeções ativas/);
assert.match(f.description,/pode ter sido excluída/);
assert(!f.description.includes('nota excluída em'));
// A live invoice satisfies the reference; only genuine gaps are flagged.
ctx.db.projectionInvoices.push({id:archivedId});
assert.equal(scan().filter(x=>x.code==='finance-projection-orphan').length,0);
ctx.db.projectionInvoices.pop();
// An unrelated tombstone must not be treated as remote proof.
map.set(archivedId,{data:{id:'other'},deleted_at:'2026-10-24'});
f=one();assert(!f.description.includes('nota excluída em'));
console.log('PASS v94.97: tombstone is archived, not missing; real missing still blocked; no writes');