'use strict';
const fs=require('fs'),assert=require('assert'),s=fs.readFileSync('release-auditor-blackbox-v9299.js','utf8');
assert(s.includes('function noteInvoiceMismatches()'),'Auditor deve consultar a integridade fila↔nota');assert(s.includes("'notequeue-invoice-mismatch'"),'Auditor deve registrar finding da divergência');assert(s.includes('noteQueueInvoiceMismatches:redact(noteInvoiceMismatches())'),'caixa-preta deve exportar o detalhe sanitizado');console.log('OK Auditor v94.19: divergência fila↔nota entrou na caixa-preta.');
