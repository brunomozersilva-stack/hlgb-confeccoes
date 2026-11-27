#!/usr/bin/env bash
set -euo pipefail
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
# Fresh client b, seeded negative opening, one note. Same reference replay
# starts before the original transaction commits. No real data or credentials.
call="select ledger_lab.pay('b','parallel-receipt',1,'2026-11-26','PIX',30000,'[{\"noteId\":\"n3\",\"noteRevision\":1,\"titleRevision\":1}]',false);"
prefix="set role ledger_lab_operator;"
PGAPPNAME=ledger-first psql -XAt -v ON_ERROR_STOP=1 -c "$prefix begin; $call select pg_sleep(4); commit;" >"$tmp/first" 2>&1 &
first=$!
ready=0
for i in $(seq 1 50); do
 if [ "$(psql -XAtc "select count(*) from pg_stat_activity where application_name='ledger-first' and wait_event='PgSleep'")" = 1 ]; then ready=1; break; fi
 sleep .1
done
test "$ready" = 1
PGAPPNAME=ledger-replay PGOPTIONS='-c statement_timeout=15000' psql -XAt -v ON_ERROR_STOP=1 -c "$prefix $call" >"$tmp/replay" 2>&1 &
replay=$!
PGAPPNAME=ledger-conflict PGOPTIONS='-c statement_timeout=15000' psql -XAt -v ON_ERROR_STOP=1 -c "$prefix select ledger_lab.pay('b','parallel-other',1,'2026-11-26','PIX',20000,'[{\"noteId\":\"n3\",\"noteRevision\":1,\"titleRevision\":1}]',false);" >"$tmp/conflict" 2>&1 &
conflict=$!
wait "$first"
wait "$replay"
if wait "$conflict"; then cat "$tmp/conflict"; exit 1; fi
grep -q 'account-revision' "$tmp/conflict"
# Extract canonical JSON receipt from both sessions, excluding command tags.
grep '^{' "$tmp/first" >"$tmp/first.json"
grep '^{' "$tmp/replay" >"$tmp/replay.json"
cmp "$tmp/first.json" "$tmp/replay.json"
test "$(psql -XAtc "select count(*) from ledger_lab.receipts where client_id='b'")" = 1
test "$(psql -XAtc "select count(*) from ledger_lab.hub where client_id='b'")" = 1
test "$(psql -XAtc "select paid||':'||revision from ledger_lab.notes where id='n3'")" = '30000:2'
test "$(psql -XAtc "select paid||':'||revision from ledger_lab.titles where id='f3'")" = '30000:2'
test "$(psql -XAtc "select independent_cents||':'||revision from ledger_lab.accounts where client_id='b'")" = '-50000:2'
test "$(psql -XAtc "select remaining||':'||revision from ledger_lab.forecast where title_id='f3'")" = '20000:2'
echo 'PASS parallel receipt replay and competing revision; exactly one receipt, Hub movement and forecast reduction'
