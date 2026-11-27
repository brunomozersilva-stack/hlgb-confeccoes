#!/usr/bin/env bash
set -euo pipefail
dir=$(mktemp -d); trap 'rm -rf "$dir"' EXIT
run(){
 psql -X -v ON_ERROR_STOP=1 -Atq -c "set role records_lab_operator; select records_lab.item_return('c','ret-n','ret-f','ret-h',6,6,6,'$1','2026-11-26','Concorrência','[{\"key\":\"[\\\"order-product\\\",\\\"o\\\",\\\"p1\\\"]\",\"qty\":1}]');"
}
run concurrent-item >"$dir/a" & a=$!
run concurrent-item >"$dir/b" & b=$!
wait "$a"; wait "$b"
diff "$dir/a" "$dir/b"
if run competing-item >"$dir/c" 2>&1; then echo 'stale operation unexpectedly accepted'; exit 1; fi
grep -q stale "$dir/c"
psql -X -v ON_ERROR_STOP=1 -Atq -c "select count(*)=3 from records_lab.hlgb_records where entity_id in ('ret-n','ret-f','ret-h') and revision=7;" | grep -qx t
psql -X -v ON_ERROR_STOP=1 -Atq -c "select count(*)=1 from records_lab.item_return_receipts where ref='concurrent-item';" | grep -qx t
echo 'PASS concurrent item return and exact replay'
