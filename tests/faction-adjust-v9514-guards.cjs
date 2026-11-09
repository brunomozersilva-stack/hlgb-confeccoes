'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const sql=fs.readFileSync('migrations/hlgb_faction_safe_transfer_pricing_v9514.sql','utf8');
const ui=fs.readFileSync('release-faction-safe-adjust-v9514.js','utf8');
const router=fs.readFileSync('app-stable3.html','utf8');
const required=[
 /SECURITY INVOKER/i,/hlgb_pode_escrever_modulo\('factions'\)/,
 /hlgb_pode_ler_modulo\('materialChecklists'\)/,
 /FOR UPDATE;/,
 /v_src\.revision<>p_expected_revision/,
 /hlgb_save_record\('factions'/,
 /hlgb_save_record\(\s*'factionPayments'/,
 /transferHistoryV9514/,/pricingHistoryV9514/,
 /paymentHistory/,/paidAmount/,/r\.deleted_at IS NULL/,
 /transferência bloqueada|Transferência bloqueada/,
 /REVOKE ALL ON FUNCTION/,/GRANT EXECUTE ON FUNCTION/,
 /v_new_source_sent := v_sent-v_qty/,
 /v_prev_price/,/v_price/,/v_paid=0/
];
for(const re of required)assert(re.test(sql),'missing server safety condition: '+re);
assert(!/SECURITY DEFINER/i.test(sql.replace(/--.*$/gm,'')),'avoid privileged bypass');
assert(!/TRUNCATE|DROP TABLE|DELETE FROM\s+public\.hlgb_records/i.test(sql),'never truncate/delete production business records');
assert(ui.includes('assertNoLocalPending')&&ui.includes('openWalReadOnly')&&ui.includes("method:'GET'"));
assert(ui.includes("rpc/'+RPC")&&ui.includes("method:'POST'"));
assert(ui.includes("window.cloudEnsureFreshSession"));
assert(ui.includes('remoteRecord('));
assert(router.includes("'release-faction-safe-adjust-v9514.js'"),'mobile and desktop router must load the new feature');
console.log('PASS v95.14 static invariants: SQL atomic transaction, RLS/security, immutable paid rows, WAL fail-close and router');
