\set ON_ERROR_STOP on
set role authenticated;
select set_config('lab.uid','00000000-0000-4000-8000-000000000001',false);
select set_config('lab.write','yes',false);
do $$
declare p jsonb:='{"state":"yes","notes":"","eligible":[{"productId":"b","materialId":"m","minWidthMm":null,"minLengthMm":null,"size":"","color":"","notes":""}]}'; a record; bad jsonb;
begin
 select * into a from public.hlgb_lab_save_remnant_v9686('a',1,p);
 if a.applied is not true or a.revision<>2 or a.data->'price'<>'25'::jsonb or a.data->'fabricRemnantPolicyV9630'<>p then raise exception 'assert-success'; end if;
 if a.data-'fabricRemnantPolicyV9630' <> '{"id":"a","name":"Modelo A","price":25,"materials":[{"materialId":"m","qty":2}]}'::jsonb then raise exception 'assert-field-preservation'; end if;
 begin perform public.hlgb_lab_save_remnant_v9686('a',1,p);raise exception 'assert-stale'; exception when raise_exception then if sqlerrm<>'source-revision' then raise;end if;end;
 bad:=jsonb_set(p,'{eligible,0,productId}','"a"');
 begin perform public.hlgb_lab_save_remnant_v9686('b',1,bad);raise exception 'assert-cycle'; exception when raise_exception then if sqlerrm<>'cycle' then raise;end if;end;
 bad:=jsonb_set(p,'{eligible,0,materialId}','"missing"');
 begin perform public.hlgb_lab_save_remnant_v9686('c',1,bad);raise exception 'assert-material'; exception when raise_exception then if sqlerrm<>'material' then raise;end if;end;
 bad:=jsonb_set(p,'{eligible,0,minWidthMm}','-1');
 begin perform public.hlgb_lab_save_remnant_v9686('c',1,bad);raise exception 'assert-dimension'; exception when raise_exception then if sqlerrm<>'dimension' then raise;end if;end;
 perform set_config('lab.write','no',false);
 begin perform public.hlgb_lab_save_remnant_v9686('c',1,p);raise exception 'assert-permission'; exception when insufficient_privilege then null;end;
 if (select revision from public.hlgb_records where module='products' and entity_id='b')<>1 then raise exception 'assert-no-write'; end if;
end $$;
reset role;
do $$begin if has_function_privilege('anon','public.hlgb_lab_save_remnant_v9686(text,bigint,jsonb)','execute') then raise exception 'assert-anon';end if;end$$;
