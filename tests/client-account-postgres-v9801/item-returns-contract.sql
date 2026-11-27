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
