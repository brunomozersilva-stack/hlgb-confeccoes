const fs=require('fs');
const src=fs.readFileSync('release-auditor-business-v9401.js','utf8');
const app=fs.readFileSync('app-stable3.html','utf8');
function must(ok,msg){if(!ok)throw new Error(msg)}
must(src.includes("const V='94.01'"),'versão 94.01 ausente');
must(src.includes('readOnly:true'),'Auditor v94.01 precisa declarar somente leitura');
for(const code of ['3d-orphan-sale','3d-sale-total-mismatch','email-duplicate-policy','email-duplicate-outbox','email-status-unsafe','whatsapp-non-read-scope','whatsapp-duplicate-preview-code','faction-duplicate-lookup-code','business-in-save-chain'])must(src.includes(code),'checagem ausente: '+code);
for(const pat of ['hlgbRecordSaveWithRetry','hlgb955ReliableSave','persistDb','cloudRequest','setInterval','MutationObserver','beforeunload'])must(src.includes(pat),'isolamento não verifica '+pat);
must(!/new\s+MutationObserver\s*\(/.test(src),'Auditor v94.01 não deve adicionar MutationObserver');
must(!/setInterval\s*\(/.test(src),'Auditor v94.01 não deve adicionar polling permanente');
must(!/hlgbRecordSaveWithRetry\s*=/.test(src),'Auditor v94.01 não pode assumir autoridade de save');
must(app.includes("'release-auditor-business-v9401.js'"),'app-stable3 precisa carregar Auditor v94.01');
const count=(app.match(/release-auditor-business-v9401\.js/g)||[]).length;must(count===1,'Auditor v94.01 deve carregar uma vez; atual='+count);
console.log('AUDITOR_BUSINESS_V9401_STATIC_OK',JSON.stringify({count,readOnly:true,integrityChecks:9,noObserver:true,noInterval:true,noSaveAuthority:true}));
