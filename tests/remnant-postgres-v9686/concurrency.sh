#!/usr/bin/env bash
set -euo pipefail
# Reset only a synthetic record, then test C->B and B->C in separate sessions.
prefix="set role authenticated; select set_config('lab.uid','00000000-0000-4000-8000-000000000001',false); select set_config('lab.write','yes',false);"
p1='{"state":"yes","notes":"","eligible":[{"productId":"b","materialId":"m","minWidthMm":null,"minLengthMm":null,"size":"","color":"","notes":""}]}'
p2='{"state":"yes","notes":"","eligible":[{"productId":"c","materialId":"m","minWidthMm":null,"minLengthMm":null,"size":"","color":"","notes":""}]}'
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
psql -X -v ON_ERROR_STOP=1 -c "$prefix begin; select * from public.hlgb_lab_save_remnant_v9686('c',1,'$p1'); select pg_sleep(5); commit;" >"$tmp/first" 2>&1 &
pid=$!
held=0
for i in $(seq 1 30); do
  if [ "$(psql -XAtc "select count(*) from pg_locks where locktype='advisory' and classid=9686 and objid=1 and objsubid=2 and granted")" -gt 0 ]; then held=1; break; fi
  sleep 0.1
done
test "$held" = 1
if psql -X -v ON_ERROR_STOP=1 -c "$prefix select * from public.hlgb_lab_save_remnant_v9686('b',1,'$p2');" >"$tmp/second" 2>&1; then cat "$tmp/second"; exit 1; fi
grep -q 'catalog-busy' "$tmp/second"
# A legacy catalog edit must fail fast while an unrelated module can still save.
if psql -X -v ON_ERROR_STOP=1 -c "update public.hlgb_records set revision=revision+1 where module='products' and entity_id='b';" >"$tmp/legacy" 2>&1; then cat "$tmp/legacy"; exit 1; fi
grep -q 'catalog-busy' "$tmp/legacy"
PGOPTIONS='-c statement_timeout=1500' psql -X -v ON_ERROR_STOP=1 -c "update public.hlgb_records set revision=revision+1 where module='finance' and entity_id='f';"
test "$(psql -XAtc "select revision from public.hlgb_records where module='finance' and entity_id='f'")" = 2
wait "$pid"
if psql -X -v ON_ERROR_STOP=1 -c "$prefix select * from public.hlgb_lab_save_remnant_v9686('b',1,'$p2');" >"$tmp/second" 2>&1; then cat "$tmp/second"; exit 1; fi
grep -q 'cycle' "$tmp/second"
test "$(psql -XAtc "select revision from public.hlgb_records where module='products' and entity_id='b'")" = 1
echo 'PASS concurrent policy saves: catalog conflict, unrelated finance unaffected, cycle after commit'
