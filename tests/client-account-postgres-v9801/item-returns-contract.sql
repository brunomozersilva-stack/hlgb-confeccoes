insert into records_lab.hlgb_records(module,entity_id,data,revision) values
('projectionInvoices','ret-n','{"id":"ret-n","clientId":"c","orderId":"o","issueDate":"2026-11-01","value":150,"paid":20,"remaining":130,"status":"Parcial","items":[{"productId":"p1","qty":10,"unitPrice":10,"value":100},{"productId":"p2","qty":10,"unitPrice":5,"value":50}],"paymentHistory":[{"id":"old","value":20}]}',1),
('finance','ret-f','{"id":"ret-f","clientId":"c","projectionInvoiceId":"ret-n","value":150,"paid":20,"remaining":130,"status":"Parcial"}',1),
('hubFinanceEntries','ret-h','{"id":"ret-h","clientId":"c","sourceType":"client_note_forecast_v9815","sourceId":"ret-f","projectionInvoiceId":"ret-n","clientForecastLinkV9815":{"titleId":"ret-f","clientId":"c"},"flow":"Entrada","status":"Previsto","value":130}',1);
set role records_lab_denied;
do $$begin
 begin perform records_lab.item_return('c','ret-n','ret-f','ret-h',1,1,1,'denied',current_date,'test','[]');raise exception 'expected permission';exception when insufficient_privilege then null;end;
end$$;
reset role;
set role records_lab_operator;
do $$declare a jsonb;b jsonb; before_hub bigint; sel jsonb:='[{"key":"[\"order-product\",\"o\",\"p1\"]","qty":2},{"key":"[\"order-product\",\"o\",\"p2\"]","qty":3}]';begin
 select count(*) into before_hub from records_lab.hlgb_records where module='hubFinanceEntries';
 a:=records_lab.item_return('c','ret-n','ret-f','ret-h',1,1,1,'ret1','2026-11-26','Devolução',sel);
 b:=records_lab.item_return('c','ret-n','ret-f','ret-h',1,1,1,'ret1','2026-11-26','Devolução',sel);
 if a is distinct from b or (a->>'amountCents')::int<>3500 or (a->>'remainingCents')::int<>9500 or (a->>'cashCents')::int<>2000 then raise exception 'first return';end if;
 begin perform records_lab.item_return('c','ret-n','ret-f','ret-h',1,1,1,'stale','2026-11-26','Devolução',sel);raise exception 'expected stale';exception when others then if sqlerrm<>'stale' then raise;end if;end;
 begin perform records_lab.item_return('c','ret-n','ret-f','ret-h',2,2,2,'qty','2026-11-26','Devolução','[{"key":"[\"order-product\",\"o\",\"p1\"]","qty":9}]');raise exception 'expected quantity';exception when others then if sqlerrm<>'return-quantity' then raise;end if;end;
 begin perform records_lab.item_return('c','ret-n','ret-f','ret-h',2,2,2,'excess','2026-11-26','Devolução','[{"key":"[\"order-product\",\"o\",\"p1\"]","qty":8},{"key":"[\"order-product\",\"o\",\"p2\"]","qty":7}]');raise exception 'expected excess';exception when others then if sqlerrm<>'excess-credit-review' then raise;end if;end;
 a:=records_lab.item_return('c','ret-n','ret-f','ret-h',2,2,2,'ret2','2026-11-26','Devolução','[{"key":"[\"order-product\",\"o\",\"p1\"]","qty":1}]');
 if (a->>'remainingCents')::int<>8500 or (select count(*) from records_lab.item_return_receipts)<>2 or (select count(*) from records_lab.hlgb_records where module='hubFinanceEntries')<>before_hub or (select records_lab.cents(data->'value') from records_lab.hlgb_records where entity_id='ret-h')<>8500 or (select records_lab.cents(data->'paid') from records_lab.hlgb_records where entity_id='ret-f')<>2000 then raise exception 'noncash atomicity';end if;
end$$;
reset role;
select 'PASS isolated item return: exact replay, revisions, quantities, historical prices, no cash entry';

set role records_lab_operator;
do $$declare a jsonb;b jsonb;begin
 a:=records_lab.reverse_item_return('c','ret-n','ret-f','ret-h',3,3,3,'undo1','2026-11-26','Estorno solicitado','item-return:ret1');
 b:=records_lab.reverse_item_return('c','ret-n','ret-f','ret-h',3,3,3,'undo1','2026-11-26','Estorno solicitado','item-return:ret1');
 if a is distinct from b or (a->>'remainingCents')::int<>12000 or (a->>'cashCents')::int<>2000 then raise exception 'reverse balance';end if;
 if (select jsonb_array_length(data->'acertoReturnsV9565') from records_lab.hlgb_records where entity_id='ret-n')<>2 or (select data->'acertoReturnsV9565'->0->>'reversalReference9849' from records_lab.hlgb_records where entity_id='ret-n')<>'undo1' then raise exception 'lost history';end if;
 begin perform records_lab.reverse_item_return('c','ret-n','ret-f','ret-h',4,4,4,'undo2','2026-11-26','Duplicado','item-return:ret1');raise exception 'expected duplicate';exception when others then if sqlerrm<>'already-reversed-or-unknown' then raise;end if;end;
 a:=records_lab.item_return('c','ret-n','ret-f','ret-h',4,4,4,'ret3','2026-11-26','Nova devolução','[{"key":"[\"order-product\",\"o\",\"p1\"]","qty":9},{"key":"[\"order-product\",\"o\",\"p2\"]","qty":6}]');
 if (a->>'remainingCents')::int<>0 or (select data->>'status' from records_lab.hlgb_records where entity_id='ret-h')<>'Encerrado' then raise exception 'full compensation';end if;
 a:=records_lab.reverse_item_return('c','ret-n','ret-f','ret-h',5,5,5,'undo3','2026-11-26','Reabrir nota','item-return:ret3');
 if (a->>'remainingCents')::int<>12000 or (select data->>'status' from records_lab.hlgb_records where entity_id='ret-h')<>'Previsto' then raise exception 'reopen forecast';end if;
end$$;
reset role;
-- Failure at the third write must roll back note and finance, not just forecast.
create function records_lab.fail_item_forecast9849() returns trigger language plpgsql as $$begin
 if new.entity_id='ret-h' then raise exception 'test-forecast-fault';end if;return new;
end$$;
create trigger test_item_forecast9849 before update on records_lab.hlgb_records for each row execute function records_lab.fail_item_forecast9849();
set role records_lab_operator;
do $$begin
 begin perform records_lab.item_return('c','ret-n','ret-f','ret-h',6,6,6,'fault-item','2026-11-26','Falha simulada','[{"key":"[\"order-product\",\"o\",\"p1\"]","qty":1}]');raise exception 'expected fault';exception when others then if sqlerrm<>'test-forecast-fault' then raise;end if;end;
 if (select count(*) from records_lab.hlgb_records where entity_id in ('ret-n','ret-f','ret-h') and revision=6)<>3 or exists(select 1 from records_lab.item_return_receipts where ref='fault-item') then raise exception 'partial write';end if;
end$$;
reset role;
drop trigger test_item_forecast9849 on records_lab.hlgb_records;
drop function records_lab.fail_item_forecast9849();
select 'PASS isolated reversal, reopen forecast, and rollback of three writes';
