const fs=require('fs');
function ok(v,m){if(!v)throw new Error(m)}
const r=fs.readFileSync('release-auditor-repair-v9440.js','utf8');
const ui=fs.readFileSync('release-auditor-single-ui-reclaim-v9434a.js','utf8');
ok(r.includes("const V='94.40',MAX_PASSES=3"),'versão/limite ausente');
ok(r.includes('resolveVerifiedIssue')&&r.includes('currentTechnicalReproduced'),'fechamento conservador ausente');
ok(r.includes('hlgbProductionReconcile9439'),'reconciliação segura de Produção ausente');
ok(r.includes('finance-projection-orphan')&&r.includes('findOrphans'),'órfão Financeiro→Projeção não bloqueado');
ok(!/supabase\.from\s*\(/.test(r),'Auditor Reparador não pode gravar Supabase direto');
ok(!/hlgbRecordSaveWithRetry\s*\(/.test(r),'Auditor Reparador não pode salvar negócio');
ok(!/persistDb\s*\(|localSaveOnly\s*\(/.test(r),'Auditor Reparador não pode persistir negócio direto');
ok(!/removeItem\s*\(\s*['"]hlgb_(records_pending|durable_wal)/.test(r),'Auditor Reparador não pode apagar fila/WAL');
ok(ui.includes('Auditar e corrigir')&&ui.includes('release-auditor-repair-v9440.js'),'botão único não aciona reparador');
ok(ui.includes("window.__HLGB_AUTH_READY!==true"),'reparador precisa ser pós-auth');
console.log('AUDITOR_REPAIR_V9440_STATIC_OK');
