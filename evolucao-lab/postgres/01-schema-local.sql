-- HLGB Evolução: SOMENTE banco descartável de integração.
-- Deliberadamente NÃO é uma migration Supabase e NÃO deve ser executada no projeto HLGB.
\set ON_ERROR_STOP on
DO $guard$ BEGIN
 IF current_database() <> 'hlgb_evolucao_lab' THEN
  RAISE EXCEPTION 'ABORTADO: este SQL exige o banco local descartável hlgb_evolucao_lab (atual: %)', current_database();
 END IF;
END $guard$;

CREATE SCHEMA evolucao_lab;
REVOKE ALL ON SCHEMA evolucao_lab FROM PUBLIC;

CREATE TABLE evolucao_lab.groups(
 id text PRIMARY KEY, faction_id text NOT NULL, status text NOT NULL CHECK (status IN ('Pendente','Pago')),
 revision integer NOT NULL CHECK (revision > 0));
CREATE TABLE evolucao_lab.lines(
 id text PRIMARY KEY, group_id text NOT NULL REFERENCES evolucao_lab.groups(id),
 amount_cents bigint NOT NULL CHECK (amount_cents>=0), paid_cents bigint NOT NULL DEFAULT 0 CHECK (paid_cents>=0),
 status text NOT NULL CHECK (status IN ('Pendente','Pago')));
CREATE TABLE evolucao_lab.adjustments(
 id text PRIMARY KEY, group_id text NOT NULL REFERENCES evolucao_lab.groups(id),
 kind text NOT NULL CHECK(kind IN ('abater','acrescentar')),
 amount_cents bigint NOT NULL CHECK(amount_cents>0), reason text NOT NULL CHECK(length(trim(reason))>=5));
CREATE TABLE evolucao_lab.corrections(
 id text PRIMARY KEY, source_group_id text NOT NULL REFERENCES evolucao_lab.groups(id),
 kind text NOT NULL CHECK(kind IN ('a_mais','a_menos')), amount_cents bigint NOT NULL CHECK(amount_cents>0));
CREATE TABLE evolucao_lab.applications(
 id text PRIMARY KEY, correction_id text NOT NULL REFERENCES evolucao_lab.corrections(id),
 source_group_id text NOT NULL REFERENCES evolucao_lab.groups(id),
 target_group_id text NOT NULL REFERENCES evolucao_lab.groups(id),
 amount_cents bigint NOT NULL CHECK(amount_cents>0), kind text NOT NULL CHECK(kind IN ('a_mais','a_menos')),
 UNIQUE(correction_id,target_group_id));
CREATE TABLE evolucao_lab.receipts(
 id text PRIMARY KEY, group_id text NOT NULL REFERENCES evolucao_lab.groups(id),
 name text NOT NULL CHECK(name ~* '\.pdf$'), mime text NOT NULL CHECK(mime='application/pdf'),
 size_bytes bigint NOT NULL CHECK(size_bytes>0 AND size_bytes<=10485760));
CREATE TABLE evolucao_lab.hub_entries(
 id text PRIMARY KEY, source_group_id text NOT NULL UNIQUE REFERENCES evolucao_lab.groups(id),
 amount_cents bigint NOT NULL CHECK(amount_cents>0),
 status text NOT NULL CHECK(status='Realizado'), paid_on date NOT NULL, method text NOT NULL);
CREATE TABLE evolucao_lab.commands(
 command_id text PRIMARY KEY, request jsonb NOT NULL, result jsonb NOT NULL);
CREATE TABLE evolucao_lab.audit_events(
 id text PRIMARY KEY, command_id text NOT NULL UNIQUE REFERENCES evolucao_lab.commands(command_id),
 kind text NOT NULL, group_id text NOT NULL REFERENCES evolucao_lab.groups(id),
 actor text NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());

DO $policies$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['groups','lines','adjustments','corrections','applications','receipts','hub_entries','commands','audit_events'] LOOP
  EXECUTE format('ALTER TABLE evolucao_lab.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE evolucao_lab.%I FORCE ROW LEVEL SECURITY',t);
 END LOOP;
END $policies$;
REVOKE ALL ON ALL TABLES IN SCHEMA evolucao_lab FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA evolucao_lab REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA evolucao_lab REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- PRIVADO: security invoker, zero GRANT para anon/authenticated/public.
-- Toda execução da função é um único statement transacional Postgres.
CREATE OR REPLACE FUNCTION evolucao_lab.compensate(
 p_command text,p_actor text,p_target text,p_expected integer,
 p_source text,p_source_expected integer,p_correction text,p_amount bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE
 v_req jsonb; v_previous record; v_source evolucao_lab.groups%ROWTYPE; v_target evolucao_lab.groups%ROWTYPE;
 v_corr evolucao_lab.corrections%ROWTYPE; v_used bigint; v_balance bigint;
 v_event text; v_result jsonb; v_id text;
BEGIN
 IF p_command !~ '^[A-Za-z0-9_-]{3,90}$' OR p_actor !~ '^[A-Za-z0-9_-]{3,90}$' THEN
  RETURN jsonb_build_object('status','rejected','reason','Identificadores inválidos');
 END IF;
 v_req=jsonb_build_object('kind','compensate','actor',p_actor,'target',p_target,'expected',p_expected,
   'source',p_source,'source_expected',p_source_expected,'correction',p_correction,'amount',p_amount);
 PERFORM pg_advisory_xact_lock(hashtextextended(p_command,7));
 SELECT request,result INTO v_previous FROM evolucao_lab.commands WHERE command_id=p_command;
 IF FOUND THEN
  IF v_previous.request=v_req THEN RETURN v_previous.result || jsonb_build_object('status','already_committed'); END IF;
  RETURN jsonb_build_object('status','rejected','reason','Mesmo comando com conteúdo diferente');
 END IF;
 IF p_source=p_target THEN RETURN jsonb_build_object('status','rejected','reason','Origem e destino iguais'); END IF;
 -- Ordem determinística de travamento reduz risco de deadlock entre operações concorrentes.
 PERFORM id FROM evolucao_lab.groups WHERE id IN (p_source,p_target) ORDER BY id FOR UPDATE;
 SELECT * INTO v_source FROM evolucao_lab.groups WHERE id=p_source;
 SELECT * INTO v_target FROM evolucao_lab.groups WHERE id=p_target;
 IF v_source.id IS NULL OR v_target.id IS NULL THEN RETURN jsonb_build_object('status','rejected','reason','Grupo inexistente'); END IF;
 IF p_source_expected<>v_source.revision OR p_expected<>v_target.revision THEN
  RETURN jsonb_build_object('status','conflict','reason','Revisão diferente da esperada');
 END IF;
 IF v_source.status<>'Pago' OR v_target.status<>'Pendente' OR v_source.faction_id<>v_target.faction_id THEN
  RETURN jsonb_build_object('status','rejected','reason','Origem paga, destino pendente e facção igual obrigatórios');
 END IF;
 SELECT * INTO v_corr FROM evolucao_lab.corrections WHERE id=p_correction AND source_group_id=p_source FOR UPDATE;
 IF v_corr.id IS NULL OR p_amount IS NULL OR p_amount<=0 THEN
  RETURN jsonb_build_object('status','rejected','reason','Correção ou valor inválido');
 END IF;
 IF EXISTS(SELECT 1 FROM evolucao_lab.applications WHERE correction_id=p_correction AND target_group_id=p_target) THEN
  RETURN jsonb_build_object('status','rejected','reason','Compensação para esse destino já existe');
 END IF;
 SELECT coalesce(sum(amount_cents),0) INTO v_used FROM evolucao_lab.applications WHERE correction_id=p_correction;
 IF v_used+p_amount>v_corr.amount_cents THEN RETURN jsonb_build_object('status','rejected','reason','Saldo insuficiente'); END IF;
 SELECT
   coalesce((SELECT sum(amount_cents) FROM evolucao_lab.lines WHERE group_id=p_target),0)
  +coalesce((SELECT sum(CASE WHEN kind='abater' THEN -amount_cents ELSE amount_cents END) FROM evolucao_lab.adjustments WHERE group_id=p_target),0)
  +coalesce((SELECT sum(CASE WHEN kind='a_mais' THEN -amount_cents ELSE amount_cents END) FROM evolucao_lab.applications WHERE target_group_id=p_target),0)
 INTO v_balance;
 IF v_corr.kind='a_mais' AND p_amount>=v_balance THEN
  RETURN jsonb_build_object('status','rejected','reason','Compensação zeraria o acerto');
 END IF;
 v_id='APP-'||p_command;
 INSERT INTO evolucao_lab.applications(id,correction_id,source_group_id,target_group_id,amount_cents,kind)
 VALUES(v_id,p_correction,p_source,p_target,p_amount,v_corr.kind);
 UPDATE evolucao_lab.groups SET revision=revision+1 WHERE id IN(p_source,p_target);
 v_event='EVT-'||p_command;
 v_result=jsonb_build_object('status','readback_confirmed','commandId',p_command,'eventId',v_event,'revision',v_target.revision+1);
 INSERT INTO evolucao_lab.commands(command_id,request,result) VALUES(p_command,v_req,v_result);
 INSERT INTO evolucao_lab.audit_events(id,command_id,kind,group_id,actor)
 VALUES(v_event,p_command,'compensate',p_target,p_actor);
 RETURN v_result;
END $fn$;

CREATE OR REPLACE FUNCTION evolucao_lab.pay(
 p_command text,p_actor text,p_target text,p_expected integer,
 p_paid_on date,p_method text,p_receipt_id text DEFAULT NULL,
 p_receipt_name text DEFAULT NULL,p_receipt_size bigint DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE
 v_req jsonb; v_previous record; v_target evolucao_lab.groups%ROWTYPE;
 v_total bigint; v_gross bigint; v_difference bigint; v_line record; v_line_amount bigint;
 v_number integer:=0; v_event text; v_result jsonb;
BEGIN
 IF p_command !~ '^[A-Za-z0-9_-]{3,90}$' OR p_actor !~ '^[A-Za-z0-9_-]{3,90}$' THEN
  RETURN jsonb_build_object('status','rejected','reason','Identificadores inválidos');
 END IF;
 v_req=jsonb_build_object('kind','pay','actor',p_actor,'target',p_target,'expected',p_expected,
 'date',p_paid_on,'method',p_method,'receipt',p_receipt_id,'name',p_receipt_name,'size',p_receipt_size);
 PERFORM pg_advisory_xact_lock(hashtextextended(p_command,7));
 SELECT request,result INTO v_previous FROM evolucao_lab.commands WHERE command_id=p_command;
 IF FOUND THEN
  IF v_previous.request=v_req THEN RETURN v_previous.result || jsonb_build_object('status','already_committed'); END IF;
  RETURN jsonb_build_object('status','rejected','reason','Mesmo ID com outro conteúdo');
 END IF;
 SELECT * INTO v_target FROM evolucao_lab.groups WHERE id=p_target FOR UPDATE;
 IF v_target.id IS NULL THEN RETURN jsonb_build_object('status','rejected','reason','Grupo inexistente'); END IF;
 IF v_target.revision<>p_expected THEN RETURN jsonb_build_object('status','conflict','reason','Revisão alterada'); END IF;
 IF v_target.status<>'Pendente' OR EXISTS(SELECT 1 FROM evolucao_lab.hub_entries WHERE source_group_id=p_target) THEN
  RETURN jsonb_build_object('status','rejected','reason','Pago ou Hub já existente');
 END IF;
 IF p_paid_on IS NULL OR p_method NOT IN('PIX','Transferência','Dinheiro') THEN
  RETURN jsonb_build_object('status','rejected','reason','Data ou método inválido');
 END IF;
 IF (p_receipt_id IS NULL AND (p_receipt_name IS NOT NULL OR p_receipt_size IS NOT NULL))
 OR (p_receipt_id IS NOT NULL AND (p_receipt_id !~ '^[A-Za-z0-9_-]{3,90}$'
  OR p_receipt_name !~* '\.pdf$' OR p_receipt_size IS NULL OR p_receipt_size<=0 OR p_receipt_size>10485760)) THEN
  RETURN jsonb_build_object('status','rejected','reason','Metadados de PDF inválidos');
 END IF;
 SELECT coalesce(sum(amount_cents),0),count(*) INTO v_gross,v_number FROM evolucao_lab.lines WHERE group_id=p_target;
 IF v_number=0 THEN RETURN jsonb_build_object('status','rejected','reason','Grupo sem itens'); END IF;
 SELECT v_gross
 +coalesce((SELECT sum(CASE WHEN kind='abater' THEN -amount_cents ELSE amount_cents END) FROM evolucao_lab.adjustments WHERE group_id=p_target),0)
 +coalesce((SELECT sum(CASE WHEN kind='a_mais' THEN -amount_cents ELSE amount_cents END) FROM evolucao_lab.applications WHERE target_group_id=p_target),0)
 INTO v_total;
 IF v_total<=0 OR v_total>100000000 THEN RETURN jsonb_build_object('status','rejected','reason','Saldo inválido'); END IF;
 -- Única transação SQL: linhas, comprovante, Hub, revisão, comando e evento.
 v_difference=v_total-v_gross;
 v_number=0;
 FOR v_line IN SELECT id,amount_cents FROM evolucao_lab.lines WHERE group_id=p_target ORDER BY id FOR UPDATE LOOP
  v_line_amount=v_line.amount_cents;
  IF v_difference>0 AND v_number=0 THEN
   v_line_amount=v_line_amount+v_difference;v_difference=0;
  ELSIF v_difference<0 THEN
   v_line_amount=v_line_amount-least(v_line_amount,-v_difference);
   v_difference=v_difference+(v_line.amount_cents-v_line_amount);
  END IF;
  UPDATE evolucao_lab.lines SET paid_cents=v_line_amount,status='Pago' WHERE id=v_line.id;
  v_number=v_number+1;
 END LOOP;
 IF v_difference<>0 THEN RAISE EXCEPTION 'Rateio não conciliado'; END IF;
 IF p_receipt_id IS NOT NULL THEN
  INSERT INTO evolucao_lab.receipts(id,group_id,name,mime,size_bytes)
  VALUES(p_receipt_id,p_target,p_receipt_name,'application/pdf',p_receipt_size);
 END IF;
 INSERT INTO evolucao_lab.hub_entries(id,source_group_id,amount_cents,status,paid_on,method)
 VALUES('HUB-'||p_target,p_target,v_total,'Realizado',p_paid_on,p_method);
 UPDATE evolucao_lab.groups SET status='Pago',revision=revision+1 WHERE id=p_target;
 v_event='EVT-'||p_command;
 v_result=jsonb_build_object('status','readback_confirmed','commandId',p_command,'eventId',v_event,'revision',v_target.revision+1,'paidCents',v_total);
 INSERT INTO evolucao_lab.commands(command_id,request,result) VALUES(p_command,v_req,v_result);
 INSERT INTO evolucao_lab.audit_events(id,command_id,kind,group_id,actor)
 VALUES(v_event,p_command,'pay',p_target,p_actor);
 RETURN v_result;
END $fn$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA evolucao_lab FROM PUBLIC;
COMMENT ON SCHEMA evolucao_lab IS 'Laboratório descartável apenas para CI. Não integrar ao HLGB.';
