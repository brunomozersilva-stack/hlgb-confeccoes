-- Dados exclusivamente sintéticos para banco descartável hlgb_evolucao_lab.
DO $guard$ BEGIN
 IF current_database()<>'hlgb_evolucao_lab' THEN RAISE EXCEPTION 'Fixture bloqueada fora de hlgb_evolucao_lab'; END IF;
END $guard$;
TRUNCATE TABLE evolucao_lab.audit_events,evolucao_lab.commands,evolucao_lab.receipts,
 evolucao_lab.hub_entries,evolucao_lab.applications,evolucao_lab.corrections,
 evolucao_lab.adjustments,evolucao_lab.lines,evolucao_lab.groups CASCADE;
INSERT INTO evolucao_lab.groups(id,faction_id,status,revision) VALUES
('AC-099','FAC-DEMO','Pago',7),
('AC-098','FAC-DEMO','Pago',2),
('AC-101','FAC-DEMO','Pendente',3),
('AC-102','FAC-DEMO','Pendente',2),
('AC-OTHER','FAC-OUTRA','Pendente',1);
INSERT INTO evolucao_lab.lines(id,group_id,amount_cents,paid_cents,status) VALUES
('L-OLD','AC-099',5000,5000,'Pago'),
('L-PREV','AC-098',2000,2000,'Pago'),
('L-1','AC-101',2500,0,'Pendente'),
('L-2','AC-101',400,0,'Pendente'),
('L-3','AC-102',1000,0,'Pendente'),
('L-4','AC-OTHER',1000,0,'Pendente');
INSERT INTO evolucao_lab.adjustments(id,group_id,kind,amount_cents,reason)
 VALUES('AJ-1','AC-101','abater',100,'Conferência demonstrativa');
INSERT INTO evolucao_lab.corrections(id,source_group_id,kind,amount_cents)
 VALUES('CORR-099','AC-099','a_mais',500);
INSERT INTO evolucao_lab.applications(id,correction_id,source_group_id,target_group_id,amount_cents,kind)
 VALUES('APP-PREV','CORR-099','AC-099','AC-098',200,'a_mais');
INSERT INTO evolucao_lab.receipts(id,group_id,name,mime,size_bytes)
 VALUES('PDF-OLD','AC-099','comprovante-antigo.pdf','application/pdf',1024);
INSERT INTO evolucao_lab.hub_entries(id,source_group_id,amount_cents,status,paid_on,method)
 VALUES('HUB-AC-099','AC-099',5000,'Realizado','2026-11-09','PIX');
