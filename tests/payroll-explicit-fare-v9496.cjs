'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const s=fs.readFileSync('release-payroll-save-stability-v9296.js','utf8');
assert.match(s,/const V='94\.96'/);
assert.match(s,/if\(manual===null\|\|!c\|\|typeof c!=='object'\)return c;/);
assert.doesNotMatch(s,/manual===null\|\|employee\?\.hasTransport===false/);
assert.match(s,/const gross=\(Number\(c\.gross\)\|\|0\)\+manual-previous;/);
assert.match(s,/net:Math\.max\(0,gross-discounts\)/);
assert.match(s,/amount\.disabled=info\.status==='missing-payroll'\|\|info\.status==='paid';/);
assert.match(s,/if\(row\.paid\)throw new Error/);
assert.doesNotMatch(s,/if\(employee\.hasTransport===false\)throw/);
assert.match(s,/const saved=await saveConfirmed\(base,desired,verify\)/);
console.log('PASS: explicit monthly credit, no bulk mutation, paid guard and cloud ACK kept');

// Pure ordering contracts: no payroll or registry mutation.
const vm=require('node:vm');const start=s.indexOf('function employeeRegistryOrder('),end=s.indexOf('function employeeRegistryAllowed(');assert.ok(start>=0&&end>start);const order=vm.runInNewContext(s.slice(start,end)+';employeeRegistryOrder',{sid:v=>String(v??'')});
const people=[{id:'3',name:'Álvaro',hireDate:'2021-03-01'},{id:'1',name:'Bruna',hireDate:'2024-06-01'},{id:'2',name:'Ana',hireDate:'2020-02-29'},{id:'4',name:'Ana',hireDate:''},{id:'5',name:'Carla',hireDate:'2025-02-30'}],before=JSON.stringify(people);const ids=(q,k)=>Array.from(order(people,q,k),x=>x.id).join(',');assert.equal(ids('alva','name-asc'),'3');assert.equal(ids('ana','name-asc'),'2,4');assert.equal(ids('','name-asc'),'3,2,4,1,5');assert.equal(ids('','tenure-desc'),'2,3,1,4,5');assert.equal(ids('','tenure-asc'),'1,3,2,4,5');assert.equal(JSON.stringify(people),before);console.log('PASS employee search and tenure ordering');
