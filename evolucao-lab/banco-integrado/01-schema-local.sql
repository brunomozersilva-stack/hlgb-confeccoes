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
 state jsonb NOT NULL CHECK((jsonb_typeof(state)='object' AND state->>'schema'='hlgb-evolucao-operacao-ficticia-v1') IS TRUE),
 CHECK (((state->>'revision')::bigint=revision) IS TRUE)
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
 CHECK((event->>'commandId'=command_id AND (event->>'revision')::bigint=revision) IS TRUE)
);
CREATE TABLE hlgb_integrado_lab.cancellations (
 command_id text PRIMARY KEY CHECK(length(command_id) BETWEEN 8 AND 95),
 actor text NOT NULL,
 fingerprint text NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
-- Contas exclusivamente fictícias para testes do PostgreSQL descartável.
CREATE TABLE hlgb_integrado_lab.lab_accounts (
 employee_id text PRIMARY KEY CHECK(employee_id ~ '^LAB-FUN-[0-9]{3}$'),
 actor text UNIQUE NOT NULL CHECK(length(actor) BETWEEN 1 AND 95),
 active boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO hlgb_integrado_lab.lab_accounts(employee_id,actor,active) VALUES
 ('LAB-FUN-001','Operador A fictício',true),
 ('LAB-FUN-002','Operador B fictício',true),
 ('LAB-FUN-003','Operador C fictício',true);
CREATE TABLE hlgb_integrado_lab.lab_access_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 admin_actor text NOT NULL,
 target_employee_id text NOT NULL REFERENCES hlgb_integrado_lab.lab_accounts(employee_id),
 operation text NOT NULL CHECK(operation='deactivate'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
DO $rls$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['environment','documents','commands','events','cancellations','lab_accounts','lab_access_events'] LOOP
  EXECUTE format('ALTER TABLE hlgb_integrado_lab.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE hlgb_integrado_lab.%I FORCE ROW LEVEL SECURITY',t);
 END LOOP;
END $rls$;
REVOKE ALL ON ALL TABLES IN SCHEMA hlgb_integrado_lab FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA hlgb_integrado_lab REVOKE ALL ON TABLES FROM PUBLIC;
-- Exclusivamente credenciais fictícias de CI. O serviço não é dono das tabelas.
CREATE ROLE hlgb_lab_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE hlgb_lab_runner LOGIN PASSWORD 'somente_ci_runtime_integrado' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS IN ROLE hlgb_lab_runtime;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA hlgb_integrado_lab TO hlgb_lab_runtime;
GRANT SELECT ON ALL TABLES IN SCHEMA hlgb_integrado_lab TO hlgb_lab_runtime;
GRANT INSERT ON hlgb_integrado_lab.documents,hlgb_integrado_lab.commands,hlgb_integrado_lab.events,hlgb_integrado_lab.cancellations TO hlgb_lab_runtime;
GRANT UPDATE(revision,state) ON hlgb_integrado_lab.documents TO hlgb_lab_runtime;
GRANT UPDATE(active,updated_at) ON hlgb_integrado_lab.lab_accounts TO hlgb_lab_runtime;
GRANT INSERT ON hlgb_integrado_lab.lab_access_events TO hlgb_lab_runtime;
GRANT USAGE ON SEQUENCE hlgb_integrado_lab.lab_access_events_id_seq TO hlgb_lab_runtime;
DO $pol$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['environment','documents','commands','events','cancellations','lab_accounts','lab_access_events'] LOOP
  EXECUTE format('CREATE POLICY runtime_read ON hlgb_integrado_lab.%I FOR SELECT TO hlgb_lab_runtime USING (true)',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['documents','commands','events','cancellations','lab_access_events'] LOOP
  EXECUTE format('CREATE POLICY runtime_insert ON hlgb_integrado_lab.%I FOR INSERT TO hlgb_lab_runtime WITH CHECK (true)',t);
 END LOOP;
END $pol$;
CREATE POLICY runtime_update ON hlgb_integrado_lab.documents FOR UPDATE TO hlgb_lab_runtime USING (id='operacao-ficticia') WITH CHECK (id='operacao-ficticia');
CREATE POLICY runtime_update_account ON hlgb_integrado_lab.lab_accounts FOR UPDATE TO hlgb_lab_runtime USING (employee_id IN ('LAB-FUN-002','LAB-FUN-003')) WITH CHECK (employee_id IN ('LAB-FUN-002','LAB-FUN-003') AND active=false);
-- Sem UPDATE/DELETE de comandos, eventos ou cancelamentos; sem privilégios de DDL.
-- Este papel de serviço de testes não representa autorização por funcionário empresarial.
COMMIT;
