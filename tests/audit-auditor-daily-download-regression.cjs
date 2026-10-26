'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const file='release-auditor-safari-download-v9368.js';
const src=fs.readFileSync(file,'utf8');
new vm.Script(src,{filename:file});

const required=[
  '⬇️ Baixar relatório do teste',
  '📅 Relatório diário',
  '⬇️ Baixar relatório diário',
  'hlgb_system_test_report',
  'hlgb_daily_auditor_bundle',
  'rpc/hlgb_auditor_report',
  'auditor-nightly-data/latest.json',
  "userCollection:'on-demand'",
  'userWindowHours:24',
  "technicalSuite:'18:00'",
  'window.hlgbAuditorSmartRun=wrappedTest'
];
for(const token of required)assert(src.includes(token),`Faltou contrato do Auditor: ${token}`);
assert(!/userSnapshot:'17:55'/.test(src),'O relatório diário não deve prometer coleta cron às 17:55');
assert(!/auto(?:matic)?Download/i.test(src),'O download não deve depender de disparo automático do Safari');
console.log('OK auditor daily/download regression');
