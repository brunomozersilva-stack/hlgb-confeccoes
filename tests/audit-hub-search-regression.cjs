const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const src=fs.readFileSync('release-hub-search.js','utf8');

const sample=[
 {id:1,date:'2026-09-01',flow:'Saída',description:'Messias tecidos',person:'Messias',category:'Matéria-prima',value:1000,status:'Previsto',acceptedMethods:['Pix']},
 {id:2,date:'2026-09-10',flow:'Saída',description:'Use Bojos',origin:'Use Bojos',category:'Aviamentos',value:500,status:'Realizado',acceptedMethods:['Pix','Cheque']},
 {id:3,date:'2026-08-28',flow:'Entrada',description:'Recebimento Gisele',origin:'Gisele',category:'Cliente',value:2000,status:'Realizado',method:'Pix'},
 {id:4,date:'2026-09-18',flow:'Entrada',description:'Recebimento Messias ajuste',origin:'Messias',category:'Outros',value:250,status:'Previsto',method:'Dinheiro'}
];
const document={
  getElementById(){return null},
  createElement(){return {id:'',className:'',innerHTML:'',appendChild(){}}},
};
const window={renderHubFinance(){return true}};
const context=vm.createContext({
  window,document,console,
  db:{hubFinanceEntries:sample},
  setTimeout(){return 1},
  clearTimeout(){},
  hlgbAfterLogin:null
});
vm.runInContext(src,context);

assert.equal(window.HLGB_HUB_SEARCH_GUARD,'v1');

let out=window.hlgbHubSearchFilterRows(sample,{query:'messias',start:'2026-09-01',end:'2026-09-30',flow:'',status:''});
assert.deepEqual(Array.from(out,x=>x.id),[4,1],'name search should match person/origin/description inside the chosen period');

out=window.hlgbHubSearchFilterRows(sample,{query:'',start:'2026-09-01',end:'2026-09-30',flow:'Saída',status:'Realizado'});
assert.deepEqual(Array.from(out,x=>x.id),[2],'flow and status filters should combine');

out=window.hlgbHubSearchFilterRows(sample,{query:'gisele',start:'2026-09-01',end:'2026-09-30',flow:'',status:''});
assert.equal(out.length,0,'period filter must exclude a matching name outside the selected dates');

const totals=window.hlgbHubSearchTotals(sample);
assert.equal(totals.count,4);
assert.equal(totals.entries,2250);
assert.equal(totals.exits,1500);
assert.equal(totals.balance,750);

console.log('PASS Hub search: name, custom period, status/type combination and totals.');
