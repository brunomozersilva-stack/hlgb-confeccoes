#!/usr/bin/env bash
set -euo pipefail
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
export CHECKLIST_RACE_MARKER="$tmp/locked"
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
insert into checklist_lab.source_records values
('cuts','c2','{"id":"c2","orderId":"o1","productId":"p1","status":"Planejado","pieces":300}',5,null),
('materials','unrelated','{"id":"unrelated","name":"Outro","unit":"m"}',1,null);
SQL
save_sql() {
cat <<SQL
with s as (select checklist_lab.record_source('$1','o1','p1') as src),
p as (select src,jsonb_build_object('responsible','Operador teste','note','','lines',(select jsonb_agg(jsonb_build_object('key',l->>'key','actual',l->'required','checked',l->>'required' is not null,'note','')) from jsonb_array_elements(src->'lines') l)) as payload from s)
select checklist_lab.save_record_checklist('$1','o1','p1',src->'revisions',$2,'$3',payload) from p;
SQL
}
wait_marker() {
 for i in $(seq 1 100); do [[ -e "$CHECKLIST_RACE_MARKER" ]] && return 0; sleep 0.05; done
 echo "lock marker timeout" >&2; return 1
}
first_writer() {
 { printf 'begin; set role checklist_lab_operator;\n'; save_sql c1 "$1" "$2"; printf '\\! touch "$CHECKLIST_RACE_MARKER"\nselect pg_sleep(2);\ncommit;\n'; } | psql -X -v ON_ERROR_STOP=1 -qAt
}
first_writer 0 race-a >"$tmp/a" 2>&1 & pid=$!
wait_marker
# Unrelated updates and independent cut with same shared material must remain available.
psql -X -v ON_ERROR_STOP=1 -q -c "set lock_timeout='250ms'; update checklist_lab.source_records set revision=2 where entity_id='unrelated';"
{ printf "set role checklist_lab_operator; set lock_timeout='250ms';\n"; save_sql c2 0 independent; } | psql -X -v ON_ERROR_STOP=1 -qAt >"$tmp/independent"
if psql -X -v ON_ERROR_STOP=1 -q -c "set lock_timeout='150ms'; update checklist_lab.source_records set revision=revision+1 where module='materials' and entity_id='m1';" >"$tmp/m" 2>&1; then echo 'linked material update escaped lock'; exit 1; fi
grep -q 'lock timeout' "$tmp/m"
if { printf 'set role checklist_lab_operator;\n'; save_sql c1 0 race-b; } | psql -X -v ON_ERROR_STOP=1 -qAt >"$tmp/b" 2>&1; then echo 'competing save accepted'; exit 1; fi
wait "$pid"
grep -q 'version-conflict' "$tmp/b"
rm -f "$CHECKLIST_RACE_MARKER"
first_writer 1 replay >"$tmp/c" 2>&1 & pid=$!
wait_marker
{ printf 'set role checklist_lab_operator;\n'; save_sql c1 1 replay; } | psql -X -v ON_ERROR_STOP=1 -qAt >"$tmp/d"
wait "$pid"
grep '^{' "$tmp/c" >"$tmp/first.json"
grep '^{' "$tmp/d" >"$tmp/replay.json"
cmp "$tmp/first.json" "$tmp/replay.json"
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
do $test$ begin
 if (select count(*) from checklist_lab.record_history where cut_id='c1')<>2 or (select count(*) from checklist_lab.record_history where cut_id='c2')<>1 then raise exception 'history-count';end if;
 if (select revision from checklist_lab.source_records where entity_id='unrelated')<>2 then raise exception 'unrelated-update';end if;
 if (select progress from checklist_lab.official_separation where cut_id='cut-1')<>40 then raise exception 'official-separation-changed';end if;
end$test$;
delete from checklist_lab.record_history;
delete from checklist_lab.source_records where entity_id in ('c2','unrelated');
SQL
echo 'PASS scoped source locks, independent cut, unrelated write, linked material lock, exact retry and no duplicate'
