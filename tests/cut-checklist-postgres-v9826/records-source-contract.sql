-- Parity cases: unlinked valid BOM entry, fallback from catalog, accents, zero-grade row, final mismatch.
begin;
update checklist_lab.source_records set data=jsonb_set(data,'{materials}',(data->'materials')||'[{"name":"Alça sem vínculo","qty":2,"unit":"un."},{"materialId":"m2","qty":10,"calcMode":"yield"},{"materialId":"m1","name":"Papiro","qty":0.1,"unit":"m","color":"PRÉTO"}]'::jsonb),revision=revision+1 where module='products' and entity_id='p1';
update checklist_lab.source_records set data=jsonb_set(data,'{actualCutGrade}',(data->'actualCutGrade')||'[{"productId":"p1","color":"Azul","size":"P","qty":0}]'::jsonb),revision=revision+1 where module='cuts' and entity_id='c1';
set role checklist_lab_operator;
do $test$ declare s jsonb; begin
 s:=checklist_lab.record_source('c1','o1','p1');
 if jsonb_array_length(s->'grade')<>3 or not exists(select 1 from jsonb_array_elements(s->'lines') l where l->>'name'='Alça sem vínculo' and l->>'color'='Branco' and (l->>'required')::numeric=120) or not exists(select 1 from jsonb_array_elements(s->'lines') l where l->>'name'='Tule' and l->>'color'='Branco' and (l->>'required')::numeric=6) or not exists(select 1 from jsonb_array_elements(s->'lines') l where l->>'name'='Papiro' and l->>'color'='Preto' and (l->>'required')::numeric=12) then raise exception 'parity';end if;
end$test$;
reset role;
update checklist_lab.source_records set data=jsonb_set(jsonb_set(data,'{status}',to_jsonb('Finalizado'::text)),'{pieces}','299'::jsonb) where module='cuts' and entity_id='c1';
set role checklist_lab_operator;
do $test$ begin
 begin perform checklist_lab.record_source('c1','o1','p1');raise exception 'final-mismatch-accepted';exception when others then if sqlerrm<>'invalid-final-grade' then raise;end if;end;
end$test$;
reset role;
rollback;

set role checklist_lab_operator;
do $$ declare s jsonb; begin
 s:=checklist_lab.record_source('c1','o1','p1');
 if s->'revisions'->>'cut'<>'5' or s->'revisions'->'materials'->>'m1'<>'8' or jsonb_array_length(s->'lines')<>9 then raise exception 'source-revisions-or-line-count';end if;
 if not exists(select 1 from jsonb_array_elements(s->'lines') l where l->>'name'='Papiro' and l->>'color'='Preto' and (l->>'required')::numeric=9.6) or not exists(select 1 from jsonb_array_elements(s->'lines') l where l->>'name'='Papiro' and l->>'color'='Branco' and (l->>'required')::numeric=4.8) or not exists(select 1 from jsonb_array_elements(s->'lines') l where l->>'name'='Papiro' and l->>'color'='Rubi' and (l->>'required')::numeric=9.6) then raise exception 'per-color';end if;
 if (select count(*) from jsonb_array_elements(s->'lines') l where l->>'required' is null)<>6 then raise exception 'unknown-must-stay-unknown';end if;
 begin perform checklist_lab.record_source('c1','o1','p2');raise exception 'wrong-model-accepted';exception when others then if sqlerrm<>'source-identity' then raise;end if;end;
 begin update checklist_lab.source_records set revision=99;raise exception 'source-write-allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
update checklist_lab.source_records set revision=11,data=jsonb_set(data,'{name}',to_jsonb('Papiro novo'::text)) where module='materials' and entity_id='m1';
set role checklist_lab_operator;
do $$ declare s jsonb; begin
 s:=checklist_lab.record_source('c1','o1','p1');
 if s->'revisions'->'materials'->>'m1'<>'11' or exists(select 1 from jsonb_array_elements(s->'lines') l where l->>'required' is not null) then raise exception 'material-revision';end if;
end$$;
reset role;
-- A fixed material color missing from the grade must not disappear silently.
update checklist_lab.source_records set revision=12,data=jsonb_set(data,'{materials,0,color}',to_jsonb('Azul'::text)) where module='products' and entity_id='p1';
set role checklist_lab_operator;
do $$ declare s jsonb; begin
 s:=checklist_lab.record_source('c1','o1','p1');
 if not exists(select 1 from jsonb_array_elements(s->'lines') l where l->>'name'='Papiro' and l->>'color'='Azul' and l->>'required' is null and l->>'pieces'='0') then raise exception 'fixed-color-omitted';end if;
end$$;
reset role;
update checklist_lab.source_records set deleted_at=clock_timestamp() where module='products' and entity_id='p1';
set role checklist_lab_operator;
do $$ begin
 begin perform checklist_lab.record_source('c1','o1','p1');raise exception 'deleted-source-accepted';exception when others then if sqlerrm<>'source-identity' then raise;end if;end;
end$$;
reset role;
set role checklist_lab_denied;
do $$ begin
 begin perform checklist_lab.record_source('c1','o1','p1');raise exception 'unauthorized-source';exception when insufficient_privilege then null;end;
end$$;
reset role;
select 'PASS authoritative record snapshot, per-color needs, linked revisions, unknown and deleted source protection' as result;
