-- Existing concurrent test cleans its rows; exercise two committed saves and independent reads.
set role checklist_lab_operator;
with s as (select checklist_lab.record_source('c1','o1','p1') src),
p as (select src,jsonb_build_object('responsible','Operador A','note','','lines',(select jsonb_agg(jsonb_build_object('key',l->>'key','actual',l->'required','checked',l->>'required' is not null,'note','')) from jsonb_array_elements(src->'lines') l)) payload from s)
select checklist_lab.save_record_checklist('c1','o1','p1',src->'revisions',0,'read-1',payload) from p;
reset role;
-- New transaction simulates another computer.
set role checklist_lab_operator;
do $test$
declare a jsonb; b jsonb; p jsonb; s jsonb;
begin
 a:=checklist_lab.read_record_checklist('c1','o1','p1',1);
 if a->'result'->>'requestId' is distinct from 'read-1' or a->'result'->>'responsible' is distinct from 'Operador A' then raise exception 'first-read';end if;
 if checklist_lab.read_record_checklist('c1','o1','p2',1) is not null then raise exception 'wrong-model-read';end if;
 s:=checklist_lab.record_source('c1','o1','p1');
 select jsonb_build_object('responsible','Operador B','note','segunda conferência','lines',(select jsonb_agg(jsonb_build_object('key',l->>'key','actual',l->'required','checked',l->>'required' is not null,'note','')) from jsonb_array_elements(s->'lines') l)) into p;
 b:=checklist_lab.save_record_checklist('c1','o1','p1',s->'revisions',1,'read-2',p);
 if b->>'version' is distinct from '2' then raise exception 'second-save';end if;
end$test$;
reset role;
set role checklist_lab_operator;
do $test$
declare latest jsonb; first jsonb; h jsonb;
begin
 latest:=checklist_lab.read_record_checklist('c1','o1','p1');
 first:=checklist_lab.read_record_checklist('c1','o1','p1',1);
 h:=checklist_lab.list_record_checklists('c1','o1','p1',null,1);
 if latest->'result'->>'version' is distinct from '2' or first->'result'->>'responsible' is distinct from 'Operador A' or h->0->>'version' is distinct from '2' or jsonb_array_length(h)<>1 then raise exception 'history-read';end if;
 if checklist_lab.list_record_checklists('c1','o1','p1',2,1)->0->>'version' is distinct from '1' then raise exception 'history-page';end if;
 if checklist_lab.list_record_checklists('c1','o1','p2') is distinct from '[]'::jsonb then raise exception 'wrong-model-list';end if;
end$test$;
reset role;
set role checklist_lab_denied;
do $test$ begin
 begin perform checklist_lab.read_record_checklist('c1','o1','p1');raise exception 'unauthorized-read';exception when insufficient_privilege then null;end;
 begin perform checklist_lab.list_record_checklists('c1','o1','p1');raise exception 'unauthorized-list';exception when insufficient_privilege then null;end;
end$test$;
reset role;
delete from checklist_lab.record_history;
select 'PASS independent committed readback, historical version, pagination, exact model, denied access' as result;
