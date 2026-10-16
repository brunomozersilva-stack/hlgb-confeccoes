const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('release-sync-guard-v9306.js','utf8');

assert(src.includes("const AUTHORITY_MIN_MS=60000"),'guard deve limitar refresh próprio a 60s');
assert(src.includes('function primarySyncBusy()'),'guard deve consultar a autoridade principal');
assert(src.includes("typeof api.status!=='function'"),'consulta do sync recovery deve ser defensiva');
assert(src.includes('if(primarySyncBusy()){skippedPrimaryBusy++;return false}'),'refresh deve ceder enquanto sync principal estiver ocupado');
assert(src.includes("setInterval(()=>refreshAuthority('periodic',false).catch(()=>{}),AUTHORITY_MIN_MS)"),'polling periódico deve usar o intervalo limitado');
assert(!src.includes("setInterval(()=>refreshAuthority('periodic').catch(()=>{}),12000)"),'polling antigo de 12s não pode voltar');
assert(src.includes("window.addEventListener('focus',()=>scheduleAuthority('focus',2500,false))"),'focus deve ser espaçado');
assert(src.includes("window.addEventListener('online',()=>scheduleAuthority('online',3000,false))"),'online deve ser espaçado');
assert(src.includes("scheduleAuthority('visible',2500,false)"),'visibility deve ser espaçado');

// Proteções existentes não podem ser removidas pela correção de contenção.
for(const required of [
  "const WAL_KEY='hlgb_durable_wal_v1'",
  'function purgePending(ids,reason)',
  'function installSaveGuard()',
  'window.hlgbRecordSaveWithRetry=w',
  'window.hlgb955ReliableSave=w'
]) assert(src.includes(required),'proteção existente ausente: '+required);

console.log('sync-guard cloud contention: OK');
