'use strict';
const assert=require('node:assert/strict'),api=require('../hlgb-modules/financeiro/payroll-preview-adapter-v9634.js');
const employees=[{id:'a',hireDate:'2026-01-01',active:true},{id:'b',hireDate:'2026-11-15',active:true},{id:'c',hireDate:'2025-01-01',terminationDate:'2026-11-02',active:false},{id:'d',hireDate:'2025-01-01',terminationDate:'2026-10-30',active:false},{id:'e',hireDate:'2026-12-01',active:true},{id:'f',active:false}];
const payroll=[{id:'p1',employeeId:'a',month:'2026-11',paid:false},{id:'p2',employeeId:'c',month:'2026-11',paid:false},{id:'p3',employeeId:'d',month:'2026-11',paid:false}];
const pending={state:'observed',ids:['payroll::p2']},before=JSON.stringify({employees,payroll,pending});
const c=api.coverage(employees,payroll,'2026-11',pending);
assert.equal(c.expectedCount,3);assert.equal(c.missingCount,1);assert.equal(c.reviewCount,1);assert.equal(c.unexpectedCount,1);assert.equal(c.complete,false);
const v=api.inspect({authenticated:true,payrollAllowed:true,db:{employees,payroll},pendingEvidence:pending,payrollCalc:()=>({net:100})},{competence:'2026-11',asOf:'2026-12-01'});
assert.equal(v.observedEmployeeCount,1);assert.equal(v.localOpenCents,10000);assert.ok(v.issues.includes('employee-outside-competence'));assert.equal(v.officialAmountCents,null);assert.equal(v.canPublish,false);assert.equal(JSON.stringify({employees,payroll,pending}),before);
assert.equal(api.coverage(employees,payroll,'2026-11',{state:'incomplete',ids:[]}).complete,false);
console.log('PASS payroll month roster coverage and pending exclusion');

const more=api.inspect({authenticated:true,payrollAllowed:true,db:{employees:[{id:'old',hireDate:'2025-01-01',terminationDate:'2026-11-15',active:false},{id:'future',hireDate:'2026-12-01'},{id:'bad',hireDate:'2026-02-30'},{id:'unknown'}],payroll:[{id:'o',employeeId:'old',month:'2026-11',paid:false},{id:'f',employeeId:'future',month:'2026-11',paid:true,paidAt:'2026-11-03',paidValue:9999},{id:'b',employeeId:'bad',month:'2026-11',paid:false},{id:'u',employeeId:'unknown',month:'2026-11',paid:false}]},pendingEvidence:{state:'observed',ids:[]},payrollCalc:()=>({net:100})},{competence:'2026-11',asOf:'2026-12-01'});
assert.equal(more.localOpenCents,20000);assert.equal(more.localPaidCents,0);assert.equal(more.observedEmployeeCount,2);assert.ok(more.issues.includes('invalid-employment-dates'));assert.ok(more.issues.includes('employment-period-unconfirmed'));assert.equal(more.coverage.complete,false);assert.equal(more.officialAmountCents,null);
