-- Synthetic contract only. No production RPC or migration.
create table records_lab.item_return_receipts(ref text primary key, request jsonb not null, result jsonb not null);
grant select,insert on records_lab.item_return_receipts to records_lab_operator;
create function records_lab.item_return(p_client text,p_note text,p_title text,p_forecast text,p_nr bigint,p_tr bigint,p_hr bigint,p_ref text,p_day date,p_reason text,p_items jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare n records_lab.hlgb_records%rowtype; t records_lab.hlgb_records%rowtype; h records_lab.hlgb_records%rowtype; prev records_lab.item_return_receipts%rowtype;
 req jsonb; ans jsonb; event jsonb; item jsonb; x jsonb; old jsonb; k text; pid text; oid text; lid text; qty bigint; unit bigint; val bigint; total bigint; paid bigint; credit bigint:=0; due bigint; amount bigint:=0; returned bigint; orig bigint:=0; used jsonb:='{}'; catalog jsonb:='{}'; chosen jsonb:='[]'; seen jsonb:='{}'; hist bigint; sum_event bigint; next_status text; a record; nn jsonb; nt jsonb; nh jsonb;
begin
 if current_user<>'records_lab_operator' then raise exception 'permission' using errcode='42501';end if;
 if coalesce(p_ref,'') !~ '^[a-zA-Z0-9_-]{1,100}$' or p_day is null or p_day>current_date or length(trim(coalesce(p_reason,''))) not between 1 and 180 or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 500 then raise exception 'input';end if;
 -- Fixture serialization also protects uniqueness of the linked title/forecast.
 lock table records_lab.hlgb_records in share row exclusive mode;
 req:=jsonb_build_array(p_client,p_note,p_title,p_forecast,p_nr,p_tr,p_hr,p_day,p_reason,p_items);
 select * into prev from records_lab.item_return_receipts where ref=p_ref;
 if found then if prev.request is distinct from req then raise exception 'reference-conflict';end if;return prev.result;end if;
 select * into n from records_lab.hlgb_records where module='projectionInvoices' and entity_id=p_note and deleted_at is null for update;
 select * into t from records_lab.hlgb_records where module='finance' and entity_id=p_title and deleted_at is null for update;
 select * into h from records_lab.hlgb_records where module='hubFinanceEntries' and entity_id=p_forecast and deleted_at is null for update;
 if n.entity_id is null or t.entity_id is null or h.entity_id is null or n.revision is distinct from p_nr or t.revision is distinct from p_tr or h.revision is distinct from p_hr then raise exception 'stale';end if;
 if not exists(select 1 from records_lab.hlgb_records where module='clients' and entity_id=p_client and deleted_at is null) or n.data->>'clientId' is distinct from p_client or t.data->>'clientId' is distinct from p_client or h.data->>'clientId' is distinct from p_client or n.data->>'id' is distinct from p_note or t.data->>'id' is distinct from p_title or h.data->>'id' is distinct from p_forecast or t.data->>'projectionInvoiceId' is distinct from p_note or t.data->>'status' is distinct from n.data->>'status' or h.data->>'sourceId' is distinct from p_title or h.data->>'sourceType' is distinct from 'client_note_forecast_v9815' or h.data->>'projectionInvoiceId' is distinct from p_note or h.data->'clientForecastLinkV9815'->>'titleId' is distinct from p_title or h.data->'clientForecastLinkV9815'->>'clientId' is distinct from p_client or h.data->>'flow' is distinct from 'Entrada' or h.data->>'status' is distinct from 'Previsto' or coalesce(n.data->>'status','') not in ('Pendente','Parcial') or n.data->>'migratedToNoteQueueV9223'='true' then raise exception 'identity';end if;
 if (select count(*) from records_lab.hlgb_records where module='finance' and deleted_at is null and data->>'projectionInvoiceId'=p_note)<>1 or (select count(*) from records_lab.hlgb_records where module='hubFinanceEntries' and deleted_at is null and data->>'sourceId'=p_title and data->>'sourceType' in ('client_note_forecast_v9815','lab-title-forecast'))<>1 then raise exception 'link-count';end if;
 if n.data->>'issueDate' is null or (n.data->>'issueDate')::date>p_day or jsonb_typeof(n.data->'items') is distinct from 'array' or jsonb_array_length(n.data->'items') not between 1 and 500 then raise exception 'items';end if;
 total:=records_lab.cents(n.data->'value');paid:=records_lab.cents(n.data->'paid');due:=records_lab.cents(n.data->'remaining');
 for item in select value from jsonb_array_elements(n.data->'items') loop
  pid:=coalesce(nullif(item->>'productId',''),item->>'itemKey','');oid:=coalesce(nullif(item->>'orderId',''),n.data->>'orderId','');lid:=coalesce(nullif(item->>'lineId',''),item->>'id','');
  if pid='' or (oid='' and lid='') or item->>'source'='faction_delivery_v9140' or coalesce(item->>'qty','') !~ '^[1-9][0-9]{0,7}$' then raise exception 'item-identity';end if;
  k:=case when lid<>'' then '["line",'||to_json(lid)::text||']' else '["order-product",'||to_json(oid)::text||','||to_json(pid)::text||']' end;
  qty:=(item->>'qty')::bigint;unit:=records_lab.cents(item->'unitPrice');val:=records_lab.cents(item->'value');
  if catalog ? k or qty>10000000 or unit<=0 or val<>qty*unit then raise exception 'item-price';end if;
  orig:=orig+val;catalog:=catalog||jsonb_build_object(k,jsonb_build_object('qty',qty,'unitCents',unit,'productId',pid,'orderId',oid,'lineId',lid));
 end loop;
 if orig<>total then raise exception 'note-total';end if;
 if jsonb_typeof(coalesce(n.data->'paymentHistory','[]')) is distinct from 'array' or jsonb_typeof(coalesce(n.data->'acertoReturnsV9565','[]')) is distinct from 'array' then raise exception 'history';end if;
 if exists(select 1 from jsonb_array_elements(coalesce(n.data->'paymentHistory','[]')) e group by e->>'id' having count(*)>1 or coalesce(e->>'id','')='') or exists(select 1 from jsonb_array_elements(coalesce(n.data->'acertoReturnsV9565','[]')) e group by e->>'id' having count(*)>1 or coalesce(e->>'id','')='') then raise exception 'history';end if;
 select coalesce(sum(records_lab.cents(e->'value')),0) into hist from jsonb_array_elements(coalesce(n.data->'paymentHistory','[]')) e;
 for old in select value from jsonb_array_elements(coalesce(n.data->'acertoReturnsV9565','[]')) loop
  if old->>'id'='item-return:'||p_ref then raise exception 'history-reference';end if;
  if coalesce(old->>'reversedAt','')<>'' then continue;end if;
  if jsonb_typeof(old->'itemsV9847') is distinct from 'array' or jsonb_array_length(old->'itemsV9847')=0 then raise exception 'legacy-return';end if;
  sum_event:=0;seen:='{}';
  for x in select value from jsonb_array_elements(old->'itemsV9847') loop
   k:=x->>'key';item:=catalog->k;
   if item is null or seen ? k or coalesce(x->>'qty','') !~ '^[1-9][0-9]{0,7}$' or (x-'key'-'qty') is distinct from (item-'qty') then raise exception 'return-history';end if;
   qty:=(x->>'qty')::bigint;returned:=coalesce((used->>k)::bigint,0)+qty;
   if returned>(item->>'qty')::bigint then raise exception 'return-quantity';end if;
   used:=used||jsonb_build_object(k,returned);seen:=seen||jsonb_build_object(k,true);sum_event:=sum_event+qty*(item->>'unitCents')::bigint;
  end loop;
  if sum_event<>records_lab.cents(old->'value') then raise exception 'return-history';end if;credit:=credit+sum_event;
 end loop;
 if hist<>paid or total-paid-credit<>due or due<=0 or records_lab.cents(t.data->'value')<>total or records_lab.cents(t.data->'paid')<>paid or records_lab.cents(t.data->'remaining')<>due or records_lab.cents(coalesce(t.data->'creditReturnsV9565','0'))<>credit or records_lab.cents(h.data->'value')<>due then raise exception 'balance';end if;
 seen:='{}';
 for x in select value from jsonb_array_elements(p_items) loop
  k:=x->>'key';item:=catalog->k;
  if item is null or seen ? k or coalesce(x->>'qty','') !~ '^[1-9][0-9]{0,7}$' then raise exception 'selection';end if;
  qty:=(x->>'qty')::bigint;
  if qty+coalesce((used->>k)::bigint,0)>(item->>'qty')::bigint then raise exception 'return-quantity';end if;
  amount:=amount+qty*(item->>'unitCents')::bigint;seen:=seen||jsonb_build_object(k,true);
  chosen:=chosen||jsonb_build_array((item-'qty')||jsonb_build_object('key',k,'qty',qty));
 end loop;
 if amount<=0 or amount>due then raise exception 'excess-credit-review';end if;
 next_status:=case when due=amount then 'Compensado por devolução' else 'Parcial' end;
 event:=jsonb_build_object('id','item-return:'||p_ref,'value',amount::numeric/100,'date',p_day,'reason',trim(p_reason),'type','devolucao','itemsV9847',chosen,'actorId',current_user,'createdAt',clock_timestamp());
 nn:=n.data||jsonb_build_object('acertoReturnsV9565',coalesce(n.data->'acertoReturnsV9565','[]')||jsonb_build_array(event),'acertoCreditTotalV9565',(credit+amount)::numeric/100,'remaining',(due-amount)::numeric/100,'status',next_status);
 nt:=t.data||jsonb_build_object('creditReturnsV9565',(credit+amount)::numeric/100,'remaining',(due-amount)::numeric/100,'status',next_status);
 nh:=h.data||jsonb_build_object('value',(due-amount)::numeric/100,'status',case when due=amount then 'Encerrado' else 'Previsto' end);
 select * into a from records_lab.hlgb_save_record(n.module,n.entity_id,nn,n.revision,false);if a.applied is distinct from true or a.revision<>n.revision+1 or a.data is distinct from nn then raise exception 'note-ack';end if;
 select * into a from records_lab.hlgb_save_record(t.module,t.entity_id,nt,t.revision,false);if a.applied is distinct from true or a.revision<>t.revision+1 or a.data is distinct from nt then raise exception 'title-ack';end if;
 select * into a from records_lab.hlgb_save_record(h.module,h.entity_id,nh,h.revision,false);if a.applied is distinct from true or a.revision<>h.revision+1 or a.data is distinct from nh then raise exception 'forecast-ack';end if;
 ans:=jsonb_build_object('ref',p_ref,'noteId',p_note,'titleId',p_title,'forecastId',p_forecast,'amountCents',amount,'remainingCents',due-amount,'cashCents',paid,'items',chosen,'noteRevision',n.revision+1,'titleRevision',t.revision+1,'forecastRevision',h.revision+1);
 insert into records_lab.item_return_receipts values(p_ref,req,ans);return ans;
end$$;
revoke all on function records_lab.item_return(text,text,text,text,bigint,bigint,bigint,text,date,text,jsonb) from public;
grant execute on function records_lab.item_return(text,text,text,text,bigint,bigint,bigint,text,date,text,jsonb) to records_lab_operator;
