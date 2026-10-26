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
  'window.hlgbAuditorSmartRun=wrappedTest',
  'auditor_access_required',
  'usersAvailable:!!users',
  'usersErrorCode:userErrorCode||null',
  'partial:!users||!code',
  ' (parcial)',
  'acesso privado indisponível nesta sessão'
];
for(const token of required)assert(src.includes(token),`Faltou contrato do Auditor: ${token}`);
assert(!/userSnapshot:'17:55'/.test(src),'O relatório diário não deve prometer coleta cron às 17:55');
assert(!/auto(?:matic)?Download/i.test(src),'O download não deve depender de disparo automático do Safari');
assert(!src.includes("if(!users)throw new Error('Não foi possível ler o relatório privado dos usuários'"),'Falha do relatório privado não pode derrubar o relatório diário inteiro');
assert(src.includes('return null}};'),'Falha inesperada do botão diário não deve ser relançada como exceção assíncrona global');
console.log('OK auditor daily/download regression: download manual + relatório parcial seguro');
