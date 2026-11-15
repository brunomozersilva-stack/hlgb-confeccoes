-- Apenas hlgb_permissoes_lab, banco PostgreSQL descartável do CI.
\set ON_ERROR_STOP on
DO $guard$ BEGIN
 IF current_database() <> 'hlgb_permissoes_lab' THEN
  RAISE EXCEPTION 'BLOQUEADO: somente banco de teste descartável hlgb_permissoes_lab';
 END IF;
END $guard$;

-- Autorização de releitura baseada no login PostgreSQL da sessão, nunca em ID do navegador.
CREATE FUNCTION evolucao_access_lab.command_status(p_command text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE v_actor evolucao_access_lab.memberships%ROWTYPE;
 v_cmd evolucao_access_lab.commands%ROWTYPE;
BEGIN
 SELECT * INTO v_actor FROM evolucao_access_lab.memberships
 WHERE db_login=session_user AND active=true AND job='financeiro';
 IF v_actor.db_login IS NULL THEN RETURN jsonb_build_object('status','denied'); END IF;
 SELECT * INTO v_cmd FROM evolucao_access_lab.commands WHERE id=p_command AND actor_login=session_user;
 IF v_cmd.id IS NULL THEN RETURN jsonb_build_object('status','not_found'); END IF;
 IF v_cmd.request->>'org' IS DISTINCT FROM v_actor.org_id THEN RETURN jsonb_build_object('status','denied'); END IF;
 IF NOT EXISTS (SELECT 1 FROM evolucao_access_lab.audit_events WHERE command_id=p_command) THEN
   RETURN jsonb_build_object('status','uncertain');
 END IF;
 RETURN v_cmd.response;
END $fn$;

-- Metadados de recibo só para financeiro ativo da empresa; staged só para o criador.
CREATE FUNCTION evolucao_access_lab.receipt_info(p_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE v_actor evolucao_access_lab.memberships%ROWTYPE;
 v_rec evolucao_access_lab.upload_metadata%ROWTYPE;
BEGIN
 SELECT * INTO v_actor FROM evolucao_access_lab.memberships
 WHERE db_login=session_user AND active=true AND job='financeiro';
 IF v_actor.db_login IS NULL THEN RETURN jsonb_build_object('status','denied'); END IF;
 SELECT * INTO v_rec FROM evolucao_access_lab.upload_metadata
 WHERE id=p_id AND org_id=v_actor.org_id;
 IF v_rec.id IS NULL OR (v_rec.state='staged' AND v_rec.created_by<>session_user) THEN
  RETURN jsonb_build_object('status','denied');
 END IF;
 RETURN jsonb_build_object('status','ok','id',v_rec.id,'sha256',v_rec.sha256,
  'size',v_rec.size_bytes,'state',v_rec.state,'filename',v_rec.filename);
END $fn$;

REVOKE ALL ON FUNCTION evolucao_access_lab.command_status(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION evolucao_access_lab.receipt_info(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION evolucao_access_lab.command_status(text) TO
 hlab_fin_a,hlab_fin_b,hlab_fin_other,hlab_fin_inactive;
GRANT EXECUTE ON FUNCTION evolucao_access_lab.receipt_info(text) TO
 hlab_fin_a,hlab_fin_b,hlab_fin_other,hlab_fin_inactive;
