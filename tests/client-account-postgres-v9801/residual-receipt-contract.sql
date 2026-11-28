-- Run at end of the isolated suite; independent fixture to avoid disturbing legacy tests.
insert into records_lab.hlgb_records(module,entity_id,data,revision) values
('clients','residual','{"id":"residual","name":"Cliente fictício residual"}',1),
('projectionInvoices','rn','{"id":"rn","clientId":"residual","value":70,"paid":0,"remaining":70,"status":"Pendente","issueDate":"2026-11-01","items":[],"paymentHistory":[]}',1),
('finance','rf','{"id":"rf","clientId":"residual","projectionInvoiceId":"rn","value":70,"paid":0,"remaining":70,"status":"Pendente"}',1),
('hubFinanceEntries','rprev','{"id":"rprev","sourceType":"lab-title-forecast","sourceId":"rf","clientId":"residual","flow":"Entrada","status":"Previsto","value":70}',1);
insert into records_lab.account_balances values('residual',1,2000);
set role records_lab_operator;
do $$
declare chosen jsonb:='[{"noteId":"rn","titleId":"rf","noteRevision":1,"titleRevision":1}]'; r jsonb; b jsonb; before_rows jsonb;
begin
 select jsonb_agg(to_jsonb(x) order by module,entity_id) into before_rows from records_lab.hlgb_records x;
 begin perform records_lab.pay_account('residual','residual-unreviewed','2026-11-26','Pix',10000,chosen,1,false);raise exception 'failure expected';exception when others then if sqlerrm<>'unallocated-payment' then raise;end if;end;
 if before_rows is distinct from (select jsonb_agg(to_jsonb(x) order by module,entity_id) from records_lab.hlgb_records x) then raise exception 'unreviewed rollback';end if;
 -- Existing fixture fault at final Hub insert: account and documents must roll back too.
 -- The reference 'fault' has no receipt because the legacy contract rolled it back.
 begin perform records_lab.pay_account('residual','fault','2026-11-26','Pix',10000,chosen,1,true);raise exception 'failure expected';exception when others then if sqlerrm<>'lab-hub-fault' then raise;end if;end;
 if before_rows is distinct from (select jsonb_agg(to_jsonb(x) order by module,entity_id) from records_lab.hlgb_records x) or (select independent_cents from records_lab.account_balances where client_id='residual')<>2000 then raise exception 'final Hub rollback';end if;
 r:=records_lab.pay_account('residual','residual-ok','2026-11-26','Pix',10000,chosen,1,true);
 b:=records_lab.pay_account('residual','residual-ok','2026-11-26','Pix',10000,chosen,1,true);
 if r is distinct from b or (r->>'residualCents')::bigint<>3000 or (r->>'independentAfterCents')::bigint<>-1000 or (r->>'allocatedCents')::bigint<>7000 then raise exception 'residual result';end if;
 if (select records_lab.cents(data->'value') from records_lab.hlgb_records where entity_id='receipt:residual-ok')<>10000 or (select data->>'status' from records_lab.hlgb_records where entity_id='rn')<>'Pago' or (select data->>'status' from records_lab.hlgb_records where entity_id='rprev')<>'Encerrado' or (select count(*) from records_lab.account_receipt_events where client_id='residual')<>1 then raise exception 'residual accounting';end if;
 begin perform records_lab.pay_account('residual','residual-stale','2026-11-26','Pix',500,'[]',1,true);raise exception 'failure expected';exception when others then if sqlerrm<>'account-revision' then raise;end if;end;
 r:=records_lab.pay_account('residual','residual-credit','2026-11-26','Pix',500,'[]',2,true);
 if (r->>'independentAfterCents')::bigint<>-1500 or (r->>'allocatedCents')::bigint<>0 or (select count(*) from records_lab.account_receipt_events where client_id='residual')<>2 then raise exception 'standalone credit';end if;
end$$;
reset role;
select 'PASS integrated synthetic residual, exact replay, independent credit and rollback';
