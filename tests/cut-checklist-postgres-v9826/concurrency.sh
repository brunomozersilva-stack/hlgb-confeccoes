#!/usr/bin/env bash
set -euo pipefail
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
export CHECKLIST_RACE_MARKER="$tmp/locked"
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
insert into checklist_lab.cut_source select 'cut-race',order_id,product_id,1,lines from checklist_lab.cut_source where cut_id='cut-1';
insert into checklist_lab.official_separation values ('cut-race',40);
SQL
save_sql() {
  printf "select checklist_lab.save_checklist('cut-race','order-1','model-1',1,%s,'%s',(select payload from checklist_lab.checklist_history where cut_id='cut-1' and version=1));\n" "$1" "$2"
}
wait_marker() {
  for i in $(seq 1 100); do [[ -e "$CHECKLIST_RACE_MARKER" ]] && return 0; sleep 0.05; done
  echo "lock marker timeout" >&2; return 1
}
first_writer() {
  { printf 'begin; set role checklist_lab_operator;\n'; save_sql "$1" "$2"; printf '\\! touch "$CHECKLIST_RACE_MARKER"\nselect pg_sleep(2);\ncommit;\n'; } | psql -X -v ON_ERROR_STOP=1 -qAt
}
# First writer locks source; competing version cannot overwrite.
first_writer 0 race-a >"$tmp/a" 2>&1 & pid=$!
wait_marker
if { printf 'set role checklist_lab_operator;\n'; save_sql 0 race-b; } | psql -X -v ON_ERROR_STOP=1 -qAt >"$tmp/b" 2>&1; then
  echo "competing save unexpectedly succeeded"; exit 1
fi
wait "$pid"
grep -q 'version-conflict' "$tmp/b"
# Exact retry on a separate connection during an in-flight commit.
rm -f "$CHECKLIST_RACE_MARKER"
first_writer 1 race-replay >"$tmp/c" 2>&1 & pid=$!
wait_marker
{ printf 'set role checklist_lab_operator;\n'; save_sql 1 race-replay; } | psql -X -v ON_ERROR_STOP=1 -qAt >"$tmp/d"
wait "$pid"
grep '^{' "$tmp/c" >"$tmp/first.json"
grep '^{' "$tmp/d" >"$tmp/replay.json"
cmp "$tmp/first.json" "$tmp/replay.json"
# Source modification cannot interleave with checklist save; after commit stale source is rejected.
rm -f "$CHECKLIST_RACE_MARKER"
first_writer 2 race-source >"$tmp/e" 2>&1 & pid=$!
wait_marker
if psql -X -v ON_ERROR_STOP=1 -q -c "set lock_timeout='150ms'; update checklist_lab.cut_source set source_revision=2 where cut_id='cut-race';" >"$tmp/f" 2>&1; then
  echo "source unexpectedly changed while locked"; exit 1
fi
grep -q 'lock timeout' "$tmp/f"
wait "$pid"
psql -X -v ON_ERROR_STOP=1 -q -c "update checklist_lab.cut_source set source_revision=2 where cut_id='cut-race';"
if { printf 'set role checklist_lab_operator;\n'; save_sql 3 stale-after-source; } | psql -X -v ON_ERROR_STOP=1 -qAt >"$tmp/g" 2>&1; then
  echo "stale source accepted"; exit 1
fi
grep -q 'source-stale-or-identity' "$tmp/g"
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
do $$ begin
 if (select count(*) from checklist_lab.checklist_history where cut_id='cut-race')<>3 then raise exception 'duplicate-or-missing-version';end if;
 if (select progress from checklist_lab.official_separation where cut_id='cut-race')<>40 then raise exception 'official-separation-changed';end if;
end$$;
SQL
echo 'PASS two connections, exact retry, source lock, stale rejection, no official writeoff'
