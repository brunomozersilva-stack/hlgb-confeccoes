set role records_lab_denied;
do $$begin
 begin perform records_lab.link_forecast('denied','c','n4','f4','h4',1,1,1,'doc','Motivo válido',true);raise exception 'permission expected';exception when insufficient_privilege then null;end;
end$$;
reset role;
set role records_lab_operator;
do $$
declare a jsonb; b jsonb; before_count bigint;
begin
 select count(*) into before_count from records_lab.receipts;
 begin perform records_lab.link_forecast('unconfirmed','c','n4','f4','h4',1,1,1,'doc','Motivo válido',false);raise exception 'confirmation expected';exception when others then if sqlerrm<>'link-input' then raise;end if;end;
 a:=records_lab.link_forecast('link4','c','n4','f4','h4',1,1,1,'doc','Origem conferida',true);
 b:=records_lab.link_forecast('link4','c','n4','f4','h4',1,1,1,'doc','Origem conferida',true);
 if a is distinct from b or (a->>'revision')::bigint<>2 or (select count(*) from records_lab.forecast_links)<>1 or (select count(*) from records_lab.receipts)<>before_count then raise exception 'link replay or cash changed';end if;
 begin perform records_lab.link_forecast('duplicate','c','n4','f4','h5',1,1,1,'doc','Origem conferida',true);raise exception 'duplicate expected';exception when others then if sqlerrm<>'link-exists' then raise;end if;end;
 if (select data->>'description' from records_lab.hlgb_records where entity_id='h4')<>'Previsão antiga' or (select data->>'value' from records_lab.hlgb_records where entity_id='h4')<>'100' then raise exception 'original forecast changed';end if;
 a:=records_lab.pay('c','linked-payment','2026-11-26','Pix',4000,'[{"noteId":"n4","titleId":"f4","noteRevision":1,"titleRevision":1}]');
 if (select records_lab.cents(data->'value') from records_lab.hlgb_records where entity_id='h4')<>6000 or (select data->'clientForecastLinkV9815'->>'reference' from records_lab.hlgb_records where entity_id='h4')<>'link4' or (select count(*) from records_lab.receipts)<>before_count+1 then raise exception 'linked partial failed';end if;
end$$;
reset role;
select 'PASS explicit forecast link, immutable identity, exact retry and subsequent partial receipt in lab';
