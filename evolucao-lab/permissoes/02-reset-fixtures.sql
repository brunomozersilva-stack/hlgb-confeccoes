-- Reset de dados fictícios. Só executa no banco descartável.
DO $guard$ BEGIN IF current_database()<>'hlgb_permissoes_lab' THEN RAISE EXCEPTION 'Banco de dados não permitido'; END IF; END $guard$;
TRUNCATE evolucao_access_lab.audit_events,evolucao_access_lab.commands,evolucao_access_lab.hub_entries,
 evolucao_access_lab.upload_metadata,evolucao_access_lab.lines,evolucao_access_lab.groups,evolucao_access_lab.memberships CASCADE;
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
