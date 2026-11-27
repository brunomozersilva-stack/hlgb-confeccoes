\set ON_ERROR_STOP on
set role checklist_lab_operator;
do $$
declare p jsonb:='{"responsible":"Operador fictício","note":"Falta branco","lines":[{"key":"elastico:preto","actual":96,"checked":true,"note":""},{"key":"elastico:branco","actual":40,"checked":true,"note":"Falta 8"},{"key":"elastico:rubi","actual":96,"checked":true,"note":""},{"key":"tule:preto","actual":null,"checked":false,"note":"Sem consumo"}]}'; a jsonb; b jsonb;
begin
 a:=checklist_lab.save_checklist('cut-1','order-1','model-1',1,0,'req-1',p);
 if a->>'version'<>'1' or a->'lines'->1->>'shortage'<>'8' or a->'lines'->3->>'shortage' is not null then raise exception 'bad-save';end if;
 b:=checklist_lab.save_checklist('cut-1','order-1','model-1',1,0,'req-1',p);
 if a is distinct from b then raise exception 'bad-replay';end if;
 if (select count(*) from checklist_lab.checklist_history)<>1 then raise exception 'duplicate';end if;
 begin perform checklist_lab.save_checklist('cut-1','order-1','model-1',1,0,'req-2',p);raise exception 'accepted-stale';exception when others then if sqlerrm<>'version-conflict' then raise;end if;end;
 begin perform checklist_lab.save_checklist('cut-1','order-1','other-model',1,1,'req-3',p);raise exception 'accepted-wrong-model';exception when others then if sqlerrm<>'source-stale-or-identity' then raise;end if;end;
 begin perform checklist_lab.save_checklist('cut-1','order-1','model-1',1,1,'req-4',jsonb_set(p,'{lines,3,checked}','true'));raise exception 'accepted-unverified';exception when others then if sqlerrm<>'unverified-line' then raise;end if;end;
 begin perform checklist_lab.save_checklist('cut-1','order-1','model-1',1,1,'req-1',p);raise exception 'accepted-reused-request';exception when others then if sqlerrm<>'request-conflict' then raise;end if;end;
 b:=checklist_lab.save_checklist('cut-1','order-1','model-1',1,1,'req-5',jsonb_set(p,'{lines,1,actual}','48'));
 if b->>'version'<>'2' or b->'lines'->1->>'shortage'<>'0' then raise exception 'bad-revision';end if;
 if (select result from checklist_lab.checklist_history where version=1) is distinct from a then raise exception 'history-overwritten';end if;
end$$;
reset role;
update checklist_lab.cut_source set source_revision=2 where cut_id='cut-1';
set role checklist_lab_operator;
do $$ begin
 if (select count(*) from checklist_lab.checklist_history where cut_id='cut-1')<>2 then raise exception 'readback';end if;
 begin perform checklist_lab.save_checklist('cut-1','order-1','model-1',1,2,'stale-source','{}');raise exception 'accepted-old-source';exception when others then if sqlerrm<>'source-stale-or-identity' then raise;end if;end;
 begin delete from checklist_lab.checklist_history;raise exception 'allowed-delete';exception when insufficient_privilege then null;end;
end$$;
reset role;
set role checklist_lab_denied;
do $$ begin
 begin perform checklist_lab.save_checklist('cut-1','order-1','model-1',2,2,'denied','{}');raise exception 'allowed-write';exception when insufficient_privilege then null;end;
 begin perform count(*) from checklist_lab.checklist_history;raise exception 'allowed-read';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$ begin if (select progress from checklist_lab.official_separation where cut_id='cut-1')<>40 then raise exception 'official-separation-changed';end if;end$$;
select 'PASS versioned checklist by color, shortage, replay, readback, access denial and untouched separation' as result;
