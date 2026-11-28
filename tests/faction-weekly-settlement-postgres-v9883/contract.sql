set role fa_lab_operator;
select fa_lab.adjust('p1','adjust-before-week',3,2,90,250,'Conferência manual');
do $body$
declare items jsonb:='[{"id":"a1","revision":1,"amountCents":2000},{"id":"a2","revision":1,"amountCents":1000},{"id":"p1","revision":4,"amountCents":22500},{"id":"p2","revision":1,"amountCents":10000}]'; snapshot jsonb; res jsonb;
begin
 select jsonb_agg(to_jsonb(x) order by module,id) into snapshot from fa_lab.records x;
 begin perform fa_lab.weekly_settle('m1','2026-11-23','fault','2026-11-27','PIX',items,35500);raise exception 'expected failure';exception when others then if sqlerrm<>'fixture-hub-fault' then raise;end if;end;
 if snapshot is distinct from (select jsonb_agg(to_jsonb(x) order by module,id) from fa_lab.records x) or exists(select 1 from fa_lab.weekly_receipts) then raise exception 'rollback failed';end if;
 begin perform fa_lab.weekly_settle('m1','2026-11-23','omitted','2026-11-27','PIX',items-0,33500);raise exception 'expected failure';exception when others then if sqlerrm<>'scope-or-value-changed' then raise;end if;end;
 begin perform fa_lab.weekly_settle('m1','2026-11-23','wrong','2026-11-27','PIX',items,35501);raise exception 'expected failure';exception when others then if sqlerrm<>'scope-or-value-changed' then raise;end if;end;
 res:=fa_lab.weekly_settle('m1','2026-11-23','ok','2026-11-27','PIX',items,35500);
 if res is distinct from fa_lab.weekly_settle('m1','2026-11-23','ok','2026-11-27','PIX',items,35500) then raise exception 'replay';end if;
 if (res->>'paidCount')::int<>4 or (select count(*) from fa_lab.records where module='hubFinanceEntries')<>1 or (select (data->>'value')::numeric from fa_lab.records where module='hubFinanceEntries')<>355 or (select count(*) from fa_lab.weekly_receipts)<>1 then raise exception 'single hub';end if;
 if (select count(*) from fa_lab.records where module='factionPayments' and id=any(array['a1','a2','p1','p2']) and data->>'status'='Pago' and (data->>'paidAmount')::numeric=(data->>'value')::numeric and data->'paymentHistory'->0->>'groupSettlementId'='ok')<>4 then raise exception 'payment rows';end if;
 if (select jsonb_agg(to_jsonb(x) order by module,id) from fa_lab.records x where module<>'hubFinanceEntries' and id<>all(array['a1','a2','p1','p2'])) is distinct from (select jsonb_agg(x order by x->>'module',x->>'id') from jsonb_array_elements(snapshot) x where x->>'id'<>all(array['a1','a2','p1','p2'])) then raise exception 'unrelated changes';end if;
 if (select (data->>'quantity')::int from fa_lab.records where id='p1')<>100 then raise exception 'physical qty';end if;
 begin perform fa_lab.weekly_settle('m1','2026-11-23','again','2026-11-27','PIX',items,35500);raise exception 'expected failure';exception when others then if sqlerrm<>'scope-or-value-changed' then raise;end if;end;
 begin perform fa_lab.weekly_settle('m1','2026-11-23','ok','2026-11-27','Dinheiro',items,35500);raise exception 'expected failure';exception when others then if sqlerrm<>'reference-conflict' then raise;end if;end;
end$body$;
reset role;
select 'PASS one weekly Hub, four payments, adjusted remuneration, exact replay, rollback and exclusion of unregistered/other-week deliveries';
