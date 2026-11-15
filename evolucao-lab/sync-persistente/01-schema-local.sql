-- HLGB Evolução: sandbox de sincronização. NUNCA executar no banco da confecção.
\set ON_ERROR_STOP on
DO $guard$ BEGIN
 IF current_database() <> 'hlgb_sync_persist_lab' THEN
   RAISE EXCEPTION 'ABORTADO: banco inválido. Somente hlgb_sync_persist_lab descartável';
 END IF;
END $guard$;
CREATE SCHEMA sync_lab;
REVOKE ALL ON SCHEMA sync_lab FROM PUBLIC;
CREATE TABLE sync_lab.records (
 id text PRIMARY KEY,
 amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 100 AND 1000000),
 revision bigint NOT NULL CHECK(revision>0),
 description text NOT NULL
);
CREATE TABLE sync_lab.commands(
 command_id text PRIMARY KEY,
 fingerprint text NOT NULL,
 request jsonb NOT NULL,
 result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sync_lab.events (
 event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 command_id text NOT NULL UNIQUE REFERENCES sync_lab.commands(command_id),
 record_id text NOT NULL REFERENCES sync_lab.records(id),
 actor text NOT NULL,
 before_cents bigint NOT NULL,
 after_cents bigint NOT NULL,
 revision bigint NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON ALL TABLES IN SCHEMA sync_lab FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA sync_lab REVOKE ALL ON TABLES FROM PUBLIC;
ALTER TABLE sync_lab.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_lab.records FORCE ROW LEVEL SECURITY;
ALTER TABLE sync_lab.commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_lab.commands FORCE ROW LEVEL SECURITY;
ALTER TABLE sync_lab.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_lab.events FORCE ROW LEVEL SECURITY;
-- PostgreSQL superuser somente nos jobs CI descartáveis, nao é politica de acesso real.
INSERT INTO sync_lab.records(id,amount_cents,revision,description)
VALUES ('HUB-DEMO-001',10000,1,'Lançamento fictício de materiais');
