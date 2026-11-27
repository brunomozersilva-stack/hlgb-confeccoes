-- Tests rollback fixture changes so independent source tests remain deterministic.
begin;
set role checklist_lab_operator;
do $test$
declare src jsonb; payload jsonb; a jsonb; b jsonb; wrong jsonb;
begin
 src:=checklist_lab.record_source('c1','o1','p1');
 select jsonb_build_object('responsible','Operador teste','note','Falta Branco','lines',jsonb_agg(jsonb_build_object('key',l->>'key','actual',case when l->>'required' is null then null when l->>'color'='Branco' then 4 else (l->>'required')::numeric end,'checked',l->>'required' is not null,'note',''))) into payload from jsonb_array_elements(src->'lines') l;
 a:=checklist_lab.save_record_checklist('c1','o1','p1',src->'revisions',0,'source-save-1',payload);
 if a->>'version'<>'1' or not exists(select 1 from jsonb_array_elements(a->'lines') l where l->>'name'='Papiro' and l->>'color'='Branco' and (l->>'shortage')::numeric=.8) then raise exception 'bad-calculation';end if;
 b:=checklist_lab.save_record_checklist('c1','o1','p1',src->'revisions',0,'source-save-1',payload);
 if b is distinct from a or (select count(*) from checklist_lab.record_history)<>1 then raise exception 'bad-replay';end if;
 begin perform checklist_lab.save_record_checklist('c1','o1','p1',src->'revisions',0,'source-save-2',payload);raise exception 'accepted-old-version';exception when others then if sqlerrm<>'version-conflict' then raise;end if;end;
 wrong:=jsonb_set(payload,'{lines,0,key}',to_jsonb('wrong-line'::text));
 begin perform checklist_lab.save_record_checklist('c1','o1','p1',src->'revisions',1,'source-save-3',wrong);raise exception 'accepted-wrong-line';exception when others then if sqlerrm<>'line-invalid' then raise;end if;end;
 begin insert into checklist_lab.record_history select * from checklist_lab.record_history;raise exception 'direct-insert';exception when insufficient_privilege then null;end;
 begin update checklist_lab.record_history set payload='{}';raise exception 'direct-update';exception when insufficient_privilege then null;end;
end$test$;
reset role;
update checklist_lab.source_records set revision=revision+1 where module='materials' and entity_id='m1';
set role checklist_lab_operator;
do $test$
declare h checklist_lab.record_history%rowtype; fresh jsonb; a jsonb;
begin
 select * into h from checklist_lab.record_history where cut_id='c1' and version=1;
 begin perform checklist_lab.save_record_checklist('c1','o1','p1',h.source_snapshot->'revisions',1,'stale-material',h.payload);raise exception 'accepted-stale-material';exception when others then if sqlerrm<>'source-stale' then raise;end if;end;
 fresh:=checklist_lab.record_source('c1','o1','p1');
 a:=checklist_lab.save_record_checklist('c1','o1','p1',fresh->'revisions',1,'source-save-4',h.payload);
 if a->>'version'<>'2' or (select count(*) from checklist_lab.record_history)<>2 then raise exception 'bad-new-version';end if;
 if (select result from checklist_lab.record_history where version=1) is distinct from h.result then raise exception 'history-changed';end if;
end$test$;
reset role;
set role checklist_lab_denied;
do $test$ begin
 begin perform checklist_lab.save_record_checklist('c1','o1','p1','{}',0,'denied','{}');raise exception 'denied-write';exception when insufficient_privilege then null;end;
 begin perform count(*) from checklist_lab.record_history;raise exception 'denied-read';exception when insufficient_privilege then null;end;
end$test$;
reset role;
do $test$ begin if (select progress from checklist_lab.official_separation where cut_id='cut-1')<>40 then raise exception 'official-separation-changed';end if;end$test$;
rollback;
select 'PASS server-derived source, historical snapshot, per-color shortage, stale material, replay, ACL and no writeoff' as result;
