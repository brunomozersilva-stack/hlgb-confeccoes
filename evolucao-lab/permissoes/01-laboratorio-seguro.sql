-- LABORATÓRIO DESCARTÁVEL. NÃO EXECUTAR NO SUPABASE HLGB.
\set ON_ERROR_STOP on
DO $guard$
BEGIN
 IF current_database() <> 'hlgb_permissoes_lab' THEN
   RAISE EXCEPTION 'BLOQUEADO: só é permitido o banco descartável hlgb_permissoes_lab (atual: %)', current_database();
 END IF;
END
$guard$;

-- Logins locais de CI com senhas fictícias. NÃO são logins reais do HLGB.
CREATE ROLE hlab_fin_a LOGIN NOINHERIT PASSWORD 'ci_ficticio_fin_a';
CREATE ROLE hlab_fin_b LOGIN NOINHERIT PASSWORD 'ci_ficticio_fin_b';
CREATE ROLE hlab_fin_other LOGIN NOINHERIT PASSWORD 'ci_ficticio_fin_other';
CREATE ROLE hlab_fin_inactive LOGIN NOINHERIT PASSWORD 'ci_ficticio_inactive';
CREATE ROLE hlab_operation_a LOGIN NOINHERIT PASSWORD 'ci_ficticio_operation';
CREATE ROLE hlab_viewer_a LOGIN NOINHERIT PASSWORD 'ci_ficticio_viewer';
CREATE ROLE hlab_anon LOGIN NOINHERIT PASSWORD 'ci_ficticio_anon';

CREATE SCHEMA evolucao_access_lab;
REVOKE ALL ON SCHEMA evolucao_access_lab FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;

CREATE TABLE evolucao_access_lab.memberships(
 db_login text PRIMARY KEY,
 org_id text NOT NULL,
 job text NOT NULL CHECK(job IN ('financeiro','operacao','consulta')),
 active boolean NOT NULL
);
CREATE TABLE evolucao_access_lab.groups(
 id text PRIMARY KEY, org_id text NOT NULL,
 status text NOT NULL CHECK(status IN ('Pendente','Pago')),
 revision integer NOT NULL CHECK(revision > 0)
);
CREATE TABLE evolucao_access_lab.lines(
 id text PRIMARY KEY,
 group_id text NOT NULL REFERENCES evolucao_access_lab.groups(id),
 amount_cents bigint NOT NULL CHECK(amount_cents>=0),
 paid_cents bigint NOT NULL DEFAULT 0 CHECK(paid_cents>=0),
 status text NOT NULL CHECK(status IN ('Pendente','Pago'))
);
CREATE TABLE evolucao_access_lab.upload_metadata(
 id text PRIMARY KEY, org_id text NOT NULL,
 created_by text NOT NULL,
 filename text NOT NULL, sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 mime text NOT NULL CHECK(mime='application/pdf'),
 size_bytes bigint NOT NULL CHECK(size_bytes>0 AND size_bytes<=10485760),
 state text NOT NULL CHECK(state IN ('staged','attached')),
 group_id text REFERENCES evolucao_access_lab.groups(id)
);
CREATE TABLE evolucao_access_lab.hub_entries(
 id text PRIMARY KEY, group_id text NOT NULL UNIQUE REFERENCES evolucao_access_lab.groups(id),
 amount_cents bigint NOT NULL CHECK(amount_cents>0),
 method text NOT NULL CHECK(method IN ('PIX','Transferência','Dinheiro')),
 state text NOT NULL CHECK(state='Realizado')
);
CREATE TABLE evolucao_access_lab.commands(
 id text PRIMARY KEY, actor_login text NOT NULL,
 request jsonb NOT NULL, response jsonb NOT NULL
);
CREATE TABLE evolucao_access_lab.audit_events(
 id text PRIMARY KEY, command_id text NOT NULL UNIQUE REFERENCES evolucao_access_lab.commands(id),
 actor_login text NOT NULL, group_id text NOT NULL REFERENCES evolucao_access_lab.groups(id),
 description text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Defesa adicional: sem políticas e sem GRANT direto de acesso às tabelas.
DO $rls$ DECLARE tab text;
BEGIN
 FOREACH tab IN ARRAY ARRAY['memberships','groups','lines','upload_metadata','hub_entries','commands','audit_events']
 LOOP
   EXECUTE format('ALTER TABLE evolucao_access_lab.%I ENABLE ROW LEVEL SECURITY',tab);
   EXECUTE format('ALTER TABLE evolucao_access_lab.%I FORCE ROW LEVEL SECURITY',tab);
 END LOOP;
END $rls$;
REVOKE ALL ON ALL TABLES IN SCHEMA evolucao_access_lab FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA evolucao_access_lab REVOKE ALL ON TABLES FROM PUBLIC;

-- Leitura com verificação de empresa: identidades são logins reais do CONTÊINER DESCARTÁVEL.
-- NÃO é um modelo para colar no Supabase; o HLGB precisa usar identidade de JWT validada pelo servidor.
CREATE FUNCTION evolucao_access_lab.preview_group(p_group text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE v_member evolucao_access_lab.memberships%ROWTYPE; v_group evolucao_access_lab.groups%ROWTYPE;
BEGIN
 SELECT * INTO v_member FROM evolucao_access_lab.memberships
 WHERE db_login=session_user AND active=true;
 IF v_member.db_login IS NULL THEN RETURN jsonb_build_object('status','denied'); END IF;
 SELECT * INTO v_group FROM evolucao_access_lab.groups
 WHERE id=p_group AND org_id=v_member.org_id;
 IF v_group.id IS NULL THEN RETURN jsonb_build_object('status','denied'); END IF;
 RETURN jsonb_build_object('status','ok','groupId',v_group.id,'revision',v_group.revision,'state',v_group.status);
END $fn$;

-- Simula APENAS metadados de um upload; não recebe, lê ou armazena bytes de PDF.
CREATE FUNCTION evolucao_access_lab.stage_receipt(
 p_id text,p_filename text,p_sha256 text,p_size bigint,p_mime text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE v_member evolucao_access_lab.memberships%ROWTYPE; v_old evolucao_access_lab.upload_metadata%ROWTYPE;
BEGIN
 SELECT * INTO v_member FROM evolucao_access_lab.memberships
 WHERE db_login=session_user AND active=true AND job='financeiro';
 IF v_member.db_login IS NULL THEN RETURN jsonb_build_object('status','denied'); END IF;
 IF p_id IS NULL OR p_id !~ '^[A-Za-z0-9_-]{3,90}$'
  OR p_filename IS NULL OR length(p_filename)>110 OR p_filename !~* '\.pdf$'
  OR position('/' in p_filename)>0 OR position(chr(92) in p_filename)>0
  OR p_sha256 IS NULL OR p_sha256 !~ '^[0-9a-f]{64}$'
  OR p_size IS NULL OR p_size<=0 OR p_size>10485760 OR p_mime IS DISTINCT FROM 'application/pdf'
 THEN RETURN jsonb_build_object('status','rejected','reason','metadados_invalidos'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id, 2026));
 SELECT * INTO v_old FROM evolucao_access_lab.upload_metadata WHERE id=p_id FOR UPDATE;
 IF v_old.id IS NOT NULL THEN
  IF v_old.org_id=v_member.org_id AND v_old.created_by=session_user AND v_old.state='staged'
   AND v_old.filename=p_filename AND v_old.sha256=p_sha256 AND v_old.size_bytes=p_size
  THEN RETURN jsonb_build_object('status','already_staged','uploadId',p_id); END IF;
  RETURN jsonb_build_object('status','rejected','reason','upload_id_ja_utilizado');
 END IF;
 INSERT INTO evolucao_access_lab.upload_metadata
 (id,org_id,created_by,filename,sha256,mime,size_bytes,state)
 VALUES(p_id,v_member.org_id,session_user,p_filename,p_sha256,p_mime,p_size,'staged');
 RETURN jsonb_build_object('status','staged','uploadId',p_id);
END $fn$;

-- Segurança: função PRIVADA com grants restritos, validação de session_user e empresa.
-- SECURITY DEFINER exige revisão de segurança ANTES de qualquer adaptação ao Supabase.
CREATE FUNCTION evolucao_access_lab.pay_group(
 p_command text,p_group text,p_expected integer,p_method text,p_upload text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE
 v_member evolucao_access_lab.memberships%ROWTYPE;
 v_group evolucao_access_lab.groups%ROWTYPE;
 v_old evolucao_access_lab.commands%ROWTYPE;
 v_upload evolucao_access_lab.upload_metadata%ROWTYPE;
 v_req jsonb; v_sum bigint; v_result jsonb; v_num bigint;
BEGIN
 -- Primeiro verificar autenticação e papel, antes de revelar a existência do ID solicitado.
 SELECT * INTO v_member FROM evolucao_access_lab.memberships
 WHERE db_login=session_user AND active=true AND job='financeiro';
 IF v_member.db_login IS NULL THEN RETURN jsonb_build_object('status','denied'); END IF;
 IF p_command IS NULL OR p_command !~ '^[A-Za-z0-9_-]{3,90}$' THEN
  RETURN jsonb_build_object('status','rejected','reason','comando_invalido'); END IF;
 IF p_group IS NULL OR p_expected IS NULL OR p_expected<1
 OR p_method IS NULL OR p_method NOT IN('PIX','Transferência','Dinheiro') THEN
  RETURN jsonb_build_object('status','rejected','reason','parametros_invalidos'); END IF;
 v_req=jsonb_build_object('actor',session_user,'org',v_member.org_id,'group',p_group,
 'revision',p_expected,'method',p_method,'upload',p_upload);
 PERFORM pg_advisory_xact_lock(hashtextextended(p_command, 2026));
 SELECT * INTO v_old FROM evolucao_access_lab.commands WHERE id=p_command;
 IF v_old.id IS NOT NULL THEN
  IF v_old.request=v_req THEN RETURN v_old.response||jsonb_build_object('status','already_committed'); END IF;
  RETURN jsonb_build_object('status','rejected','reason','id_utilizado_com_outro_conteudo');
 END IF;
 SELECT * INTO v_group FROM evolucao_access_lab.groups
 WHERE id=p_group AND org_id=v_member.org_id FOR UPDATE;
 IF v_group.id IS NULL THEN RETURN jsonb_build_object('status','denied'); END IF;
 IF v_group.revision<>p_expected THEN
  RETURN jsonb_build_object('status','conflict','reason','revisao_obsoleta'); END IF;
 IF v_group.status<>'Pendente' OR EXISTS(SELECT 1 FROM evolucao_access_lab.hub_entries WHERE group_id=p_group) THEN
  RETURN jsonb_build_object('status','rejected','reason','ja_pago'); END IF;
 SELECT count(*),coalesce(sum(amount_cents),0) INTO v_num,v_sum
 FROM evolucao_access_lab.lines WHERE group_id=p_group;
 IF v_num=0 OR v_sum<=0 OR v_sum>100000000 THEN
  RETURN jsonb_build_object('status','rejected','reason','sem_saldo_valido'); END IF;
 IF p_upload IS NOT NULL THEN
  SELECT * INTO v_upload FROM evolucao_access_lab.upload_metadata WHERE id=p_upload FOR UPDATE;
  IF v_upload.id IS NULL OR v_upload.org_id<>v_member.org_id
    OR v_upload.created_by<>session_user OR v_upload.state<>'staged' THEN
   RETURN jsonb_build_object('status','rejected','reason','anexo_nao_autorizado'); END IF;
 END IF;
 -- Todas as alterações são atômicas no mesmo statement SQL.
 UPDATE evolucao_access_lab.lines SET status='Pago',paid_cents=amount_cents WHERE group_id=p_group;
 UPDATE evolucao_access_lab.groups SET status='Pago',revision=revision+1 WHERE id=p_group;
 INSERT INTO evolucao_access_lab.hub_entries(id,group_id,amount_cents,method,state)
 VALUES('HUB-'||p_group,p_group,v_sum,p_method,'Realizado');
 IF p_upload IS NOT NULL THEN
  UPDATE evolucao_access_lab.upload_metadata SET state='attached',group_id=p_group WHERE id=p_upload;
 END IF;
 v_result=jsonb_build_object('status','readback_confirmed','commandId',p_command,'revision',p_expected+1,'amountCents',v_sum);
 INSERT INTO evolucao_access_lab.commands(id,actor_login,request,response)
 VALUES(p_command,session_user,v_req,v_result);
 INSERT INTO evolucao_access_lab.audit_events(id,command_id,actor_login,group_id,description)
 VALUES('EVT-'||p_command,p_command,session_user,p_group,'Pagamento de demonstração');
 RETURN v_result;
END $fn$;

-- Evitar EXECUTE herdado de PUBLIC (padrão PostgreSQL para funções).
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA evolucao_access_lab FROM PUBLIC;
GRANT USAGE ON SCHEMA evolucao_access_lab TO
 hlab_fin_a,hlab_fin_b,hlab_fin_other,hlab_fin_inactive,hlab_operation_a,hlab_viewer_a,hlab_anon;
GRANT EXECUTE ON FUNCTION evolucao_access_lab.preview_group(text)
 TO hlab_fin_a,hlab_fin_b,hlab_fin_other,hlab_fin_inactive,hlab_operation_a,hlab_viewer_a;
GRANT EXECUTE ON FUNCTION evolucao_access_lab.stage_receipt(text,text,text,bigint,text)
 TO hlab_fin_a,hlab_fin_b,hlab_fin_other,hlab_fin_inactive;
GRANT EXECUTE ON FUNCTION evolucao_access_lab.pay_group(text,text,integer,text,text)
 TO hlab_fin_a,hlab_fin_b,hlab_fin_other,hlab_fin_inactive;
-- Não concedemos SELECT, INSERT, UPDATE nem DELETE diretamente a nenhum desses logins.

INSERT INTO evolucao_access_lab.memberships(db_login,org_id,job,active) VALUES
 ('hlab_fin_a','EMPRESA-FICTICIA-A','financeiro',true),
 ('hlab_fin_b','EMPRESA-FICTICIA-A','financeiro',true),
 ('hlab_fin_other','EMPRESA-FICTICIA-B','financeiro',true),
 ('hlab_fin_inactive','EMPRESA-FICTICIA-A','financeiro',false),
 ('hlab_operation_a','EMPRESA-FICTICIA-A','operacao',true),
 ('hlab_viewer_a','EMPRESA-FICTICIA-A','consulta',true);
INSERT INTO evolucao_access_lab.groups(id,org_id,status,revision) VALUES
 ('AC-TESTE-A','EMPRESA-FICTICIA-A','Pendente',3),
 ('AC-TESTE-B','EMPRESA-FICTICIA-B','Pendente',2),
 ('AC-TESTE-EXTRA','EMPRESA-FICTICIA-A','Pendente',1);
INSERT INTO evolucao_access_lab.lines(id,group_id,amount_cents,status) VALUES
 ('A-LINHA-1','AC-TESTE-A',2100,'Pendente'),
 ('A-LINHA-2','AC-TESTE-A',400,'Pendente'),
 ('B-LINHA-1','AC-TESTE-B',900,'Pendente'),
 ('A-LINHA-3','AC-TESTE-EXTRA',1000,'Pendente');
