-- Shared operational history, distinct trusted actor, revocation and area requirements.
set role checklist_lab_operator;
with s as (select checklist_lab.record_source('c1','o1','p1') src),
p as (select src,jsonb_build_object('responsible','Operador A','note','','lines',(select jsonb_agg(jsonb_build_object('key',l->>'key','actual',l->'required','checked',l->>'required' is not null,'note','')) from jsonb_array_elements(src->'lines') l)) payload from s)
select checklist_lab.save_record_checklist('c1','o1','p1',src->'revisions',0,'auth-1',payload) from p;
reset role;
set role checklist_lab_operator2;
do $test$
declare old jsonb; src jsonb; p jsonb; a jsonb; b bytea:=convert_to('%PDF-1.4 fixture','UTF8');
begin
 old:=checklist_lab.read_record_checklist('c1','o1','p1',1);
 if old->>'actor' is distinct from 'checklist_lab_operator' then raise exception 'first-actor';end if;
 src:=checklist_lab.record_source('c1','o1','p1');
 select jsonb_build_object('responsible','Operador B','note','','lines',(select jsonb_agg(jsonb_build_object('key',l->>'key','actual',l->'required','checked',l->>'required' is not null,'note','')) from jsonb_array_elements(src->'lines') l)) into p;
 a:=checklist_lab.save_record_checklist('c1','o1','p1',src->'revisions',1,'auth-2',p);
 if a->>'version' is distinct from '2' or checklist_lab.read_record_checklist('c1','o1','p1',2)->>'actor' is distinct from 'checklist_lab_operator2' then raise exception 'second-actor';end if;
 a:=checklist_lab.attach_record_file('c1','o1','p1',2,'folha.pdf','application/pdf',encode(sha256(b),'hex'),b);
 if a->>'actor' is distinct from 'checklist_lab_operator2' then raise exception 'attachment-actor';end if;
 begin update checklist_lab.user_access set active=true;raise exception 'access-table-writable';exception when insufficient_privilege then null;end;
end$test$;
reset role;
-- Revocation must stop access immediately even with same simulated gateway identity.
update checklist_lab.user_access set active=false where role_name='checklist_lab_operator2';
set role checklist_lab_operator2;
do $test$ begin
 if checklist_lab.authorized() then raise exception 'still-authorized';end if;
 begin perform checklist_lab.read_record_checklist('c1','o1','p1');raise exception 'revoked-read';exception when insufficient_privilege then null;end;
 begin perform checklist_lab.save_record_checklist('c1','o1','p1','{}',2,'revoked','{}');raise exception 'revoked-save';exception when insufficient_privilege then null;end;
 begin perform checklist_lab.list_record_attachments('c1','o1','p1',2);raise exception 'revoked-attachment';exception when insufficient_privilege then null;end;
 if (select count(*) from checklist_lab.record_history)<>0 then raise exception 'revoked-direct-read';end if;
end$test$;
reset role;
update checklist_lab.user_access set active=true,access='["corte","pedidos","produtos"]' where role_name='checklist_lab_operator2';
set role checklist_lab_operator2;
do $test$ begin
 if checklist_lab.authorized() then raise exception 'missing-area-accepted';end if;
 begin perform checklist_lab.list_record_checklists('c1','o1','p1');raise exception 'missing-area-read';exception when insufficient_privilege then null;end;
end$test$;
reset role;
delete from checklist_lab.record_attachments;
delete from checklist_lab.record_history;
select 'PASS shared history, trusted actor, revocation, area authorization and no direct privilege' as result;
