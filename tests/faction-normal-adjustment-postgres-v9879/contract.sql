set role fa_lab_denied;
do $body$begin
 begin perform fa_lab.adjust('p1','denied',3,2,90,250,'Conferência manual');raise exception 'expected denial';exception when insufficient_privilege then null;end;
end$body$;
reset role;
set role fa_lab_operator;
do $body$
declare original jsonb; result jsonb; again jsonb; other jsonb; current_row jsonb;
begin
 select jsonb_agg(to_jsonb(r) order by module,id) into original from fa_lab.records r;
 begin perform fa_lab.adjust('p1','fault',3,2,90,250,'Conferência manual');raise exception 'expected failure';exception when others then if sqlerrm<>'fixture-event-fault' then raise;end if;end;
 if original is distinct from (select jsonb_agg(to_jsonb(r) order by module,id) from fa_lab.records r) or exists(select 1 from fa_lab.events) then raise exception 'rollback failed';end if;
 begin perform fa_lab.adjust('p1','excess',3,2,101,250,'Conferência manual');raise exception 'expected failure';exception when others then if sqlerrm<>'quantity-range' then raise;end if;end;
 result:=fa_lab.adjust('p1','ok',3,2,90,250,'Conferência manual');
 again:=fa_lab.adjust('p1','ok',3,2,90,250,'Conferência manual');
 if result is distinct from again or (select count(*) from fa_lab.events)<>1 then raise exception 'replay failed';end if;
 select data into current_row from fa_lab.records where module='factionPayments' and id='p1';
 if (current_row->>'quantity')::numeric<>100 or (current_row->>'value')::numeric<>225 or current_row->>'noteQueueId'<>'n1' or (result->>'hubMovementCents')::bigint<>0 then raise exception 'correction result';end if;
 if exists(select 1 from fa_lab.records where module='hubFinanceEntries') then raise exception 'unexpected Hub';end if;
 begin perform fa_lab.adjust('p1','ok',3,2,80,250,'Conferência manual');raise exception 'expected failure';exception when others then if sqlerrm<>'reference-conflict' then raise;end if;end;
 begin perform fa_lab.adjust('p1','stale',3,2,80,250,'Conferência manual');raise exception 'expected failure';exception when others then if sqlerrm<>'payment-revision' then raise;end if;end;
 begin perform fa_lab.adjust('p1','stale-delivery',4,1,80,250,'Conferência manual');raise exception 'expected failure';exception when others then if sqlerrm<>'delivery-revision' then raise;end if;end;
 result:=fa_lab.adjust('p1','second',4,2,80,250,'Segunda conferência');
 if (result->'adjustment'->>'previousCents')::bigint<>22500 or (result->'adjustment'->>'totalCents')::bigint<>20000 or (select count(*) from fa_lab.events)<>2 then raise exception 'second edit history';end if;
 if (select jsonb_agg(to_jsonb(r) order by module,id) from fa_lab.records r where not(module='factionPayments' and id='p1')) is distinct from (select jsonb_agg(x order by x->>'module',x->>'id') from jsonb_array_elements(original) x where not(x->>'module'='factionPayments' and x->>'id'='p1')) then raise exception 'unrelated rows changed';end if;
end$body$;
reset role;
insert into fa_lab.records(module,id,data,revision) values('hubFinanceEntries','linked','{"sourceId":"p2","value":100}',1);
set role fa_lab_operator;
do $body$begin
 begin perform fa_lab.adjust('p2','linked',1,1,40,200,'Conferência manual');raise exception 'expected failure';exception when others then if sqlerrm<>'linked-hub' then raise;end if;end;
end$body$;
reset role;
select 'PASS adjustment: physical quantity and note preserved, no Hub, atomic rollback, idempotency, repeated edit and stale revisions';
