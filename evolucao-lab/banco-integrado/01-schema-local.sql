-- Apenas PostgreSQL descartável da homologação local. Não executar no Supabase.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$ BEGIN
 IF current_database() <> 'hlgb_integrado_lab' THEN RAISE EXCEPTION 'Banco proibido: somente hlgb_integrado_lab'; END IF;
END $guard$;
CREATE SCHEMA hlgb_integrado_lab;
REVOKE ALL ON SCHEMA hlgb_integrado_lab FROM PUBLIC;
CREATE TABLE hlgb_integrado_lab.environment (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 marker text NOT NULL CHECK(marker='HLGB-EVOLUCAO-FICTICIO-LOCAL-V1')
);
INSERT INTO hlgb_integrado_lab.environment(marker) VALUES ('HLGB-EVOLUCAO-FICTICIO-LOCAL-V1');
CREATE TABLE hlgb_integrado_lab.documents (
 id text PRIMARY KEY CHECK(id='operacao-ficticia'),
 revision bigint NOT NULL CHECK(revision BETWEEN 1 AND 100000000),
 state jsonb NOT NULL CHECK(jsonb_typeof(state)='object' AND state->>'schema'='hlgb-evolucao-operacao-ficticia-v1'),
 CHECK ((state->>'revision')::bigint=revision)
);
CREATE TABLE hlgb_integrado_lab.commands (
 command_id text PRIMARY KEY CHECK(length(command_id) BETWEEN 8 AND 95),
 document_id text NOT NULL REFERENCES hlgb_integrado_lab.documents(id),
 actor text NOT NULL CHECK(length(actor) BETWEEN 1 AND 95),
 fingerprint text NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
 kind text NOT NULL,
 expected_revision bigint NOT NULL CHECK(expected_revision>=1),
 revision bigint NOT NULL CHECK(revision=expected_revision+1),
 result text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(document_id,revision),
 UNIQUE(command_id,document_id,revision)
);
CREATE TABLE hlgb_integrado_lab.events (
 command_id text PRIMARY KEY,
 document_id text NOT NULL,
 revision bigint NOT NULL,
 event jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(command_id,document_id,revision) REFERENCES hlgb_integrado_lab.commands(command_id,document_id,revision),
 UNIQUE(document_id,revision),
 CHECK(event->>'commandId'=command_id AND (event->>'revision')::bigint=revision)
);
CREATE TABLE hlgb_integrado_lab.cancellations (
 command_id text PRIMARY KEY CHECK(length(command_id) BETWEEN 8 AND 95),
 actor text NOT NULL,
 fingerprint text NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
DO $rls$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['environment','documents','commands','events','cancellations'] LOOP
  EXECUTE format('ALTER TABLE hlgb_integrado_lab.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE hlgb_integrado_lab.%I FORCE ROW LEVEL SECURITY',t);
 END LOOP;
END $rls$;
REVOKE ALL ON ALL TABLES IN SCHEMA hlgb_integrado_lab FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA hlgb_integrado_lab REVOKE ALL ON TABLES FROM PUBLIC;
-- O serviço local de CI é privilegiado; nenhuma política de acesso empresarial é aprovada aqui.
COMMIT;
