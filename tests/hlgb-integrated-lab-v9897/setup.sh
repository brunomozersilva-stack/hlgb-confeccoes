#!/usr/bin/env bash
# Only a fresh disposable PostgreSQL on localhost. Never run against an ERP DB.
set -euo pipefail
[[ "${HLGB_LAB_ONLY:-}" == 1 && "${PGHOST:-}" == 127.0.0.1 && "${PGDATABASE:-}" == hlgb_fixture && "${PGUSER:-}" == postgres && "${PGPORT:-}" == 5432 && "${PGPASSWORD:-}" == fixture_only ]] || { echo 'Configure exclusivamente o PostgreSQL descartável de testes.' >&2; exit 1; }
unset PGSERVICE PGSERVICEFILE PGOPTIONS PGHOSTADDR
[[ "$(psql -X -w -qAt -v ON_ERROR_STOP=1 -c "select count(*) from pg_namespace where nspname not in ('public','information_schema') and nspname not like 'pg_%'")" == 0 ]] || { echo 'Banco não está vazio; não foi alterado.' >&2; exit 1; }
[[ "$(psql -X -w -qAt -v ON_ERROR_STOP=1 -c "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v','m','f')")" == 0 ]] || { echo 'Banco não está vazio; não foi alterado.' >&2; exit 1; }
for f in tests/faction-normal-adjustment-postgres-v9879/{fixture,candidate}.sql tests/faction-weekly-settlement-postgres-v9883/{fixture,candidate,read}.sql tests/client-account-postgres-v9801/{records-fixture,records-candidate}.sql tests/cut-checklist-postgres-v9826/{fixture,candidate,records-auth,records-source,records-integrated,records-read,records-attachments}.sql tests/hlgb-integrated-lab-v9897/extra.sql; do
  psql -X -w -v ON_ERROR_STOP=1 -f "$f"
done
psql -X -w -v ON_ERROR_STOP=1 -c "create schema hlgb_integrated_fixture; create table hlgb_integrated_fixture.marker(id text primary key); insert into hlgb_integrated_fixture.marker values('synthetic-v9897');"
