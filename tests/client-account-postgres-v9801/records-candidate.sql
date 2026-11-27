-- Candidate integration on a SYNTHETIC schema. No production endpoint.
-- lab-title-forecast is an explicitly invented mapping; actual Hub mapping unverified.
create function records_lab.cents(v jsonb) returns bigint language plpgsql immutable set search_path='' as $$
declare n numeric;
begin
 if jsonb_typeof(v) is distinct from 'number' and (jsonb_typeof(v) is distinct from 'string' or (v#>>'{}') !~ '^[0-9]{1,10}(\.[0-9]{1,2})?$') then raise exception 'money-format';end if;
 n:=(v#>>'{}')::numeric*100;
 if n is null or n<0 or n>1000000000000 or n<>trunc(n) then raise exception 'money-format';end if;
 return n::bigint;
end$$;
create function records_lab.pay(p_client text,p_ref text,p_day date,p_method text,p_amount bigint,p_selected jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare n records_lab.hlgb_records%rowtype; t records_lab.hlgb_records%rowtype; h records_lab.hlgb_records%rowtype; prior records_lab.receipts%rowtype;
 sel jsonb; req jsonb; ans jsonb; event jsonb; next_n jsonb; next_t jsonb; next_h jsonb; ack record; allocations jsonb:='[]';
 available bigint; total bigint; paid bigint; credit bigint; hist bigint; remaining bigint; applied bigint; next_status text; k text; cnt integer; actor text:=current_user; ts timestamptz:=clock_timestamp();
begin
 if current_user<>'records_lab_operator' then raise exception 'permission' using errcode='42501';end if;
 if p_client is null or p_ref is null or p_ref !~ '^[a-zA-Z0-9_-]{1,100}$' or p_day is null or p_day>current_date or p_method is null or length(trim(p_method)) not between 1 and 80 or p_amount is null or p_amount not between 1 and 1000000000000 or jsonb_typeof(p_selected) is distinct from 'array' or jsonb_array_length(p_selected) not between 1 and 50 then raise exception 'input';end if;
 -- Coarse lab-only writer serialization. Not a production lock recommendation.
 lock table records_lab.hlgb_records in share row exclusive mode;
 req:=jsonb_build_object('client',p_client,'ref',p_ref,'day',p_day,'method',p_method,'amount',p_amount,'selected',p_selected);
 select * into prior from records_lab.receipts x where x.ref=p_ref;
 if found then if prior.request is distinct from req then raise exception 'reference-conflict';end if;return prior.result;end if;
 if not exists(select 1 from records_lab.hlgb_records x where x.module='clients' and x.entity_id=p_client and x.deleted_at is null and x.data->>'id'=p_client) then raise exception 'client';end if;
 for sel in select value from jsonb_array_elements(p_selected) loop
  if jsonb_typeof(sel) is distinct from 'object' or coalesce(sel->>'noteId','')='' or coalesce(sel->>'titleId','')='' or coalesce(sel->>'noteRevision','') !~ '^[1-9][0-9]{0,15}$' or coalesce(sel->>'titleRevision','') !~ '^[1-9][0-9]{0,15}$' then raise exception 'selection';end if;
 end loop;
 select count(distinct x->>'noteId') into cnt from jsonb_array_elements(p_selected) x;
 if cnt<>jsonb_array_length(p_selected) then raise exception 'duplicate-selection';end if;
 select count(*) into cnt from records_lab.hlgb_records x where x.module='projectionInvoices' and x.deleted_at is null and x.entity_id in(select e->>'noteId' from jsonb_array_elements(p_selected) e);
 if cnt<>jsonb_array_length(p_selected) then raise exception 'note-count';end if;
 remaining:=p_amount;
 for n in select x.* from records_lab.hlgb_records x where x.module='projectionInvoices' and x.deleted_at is null and x.entity_id in(select e->>'noteId' from jsonb_array_elements(p_selected) e) order by x.data->>'issueDate',x.entity_id for update loop
  select e into sel from jsonb_array_elements(p_selected) e where e->>'noteId'=n.entity_id;
  if n.data->>'id' is distinct from n.entity_id or n.data->>'clientId' is distinct from p_client or n.revision<>(sel->>'noteRevision')::bigint or coalesce(n.data->>'status','') not in ('Pendente','Parcial') or coalesce(n.data->>'issueDate','') !~ '^\d{4}-\d{2}-\d{2}$' or (n.data->>'issueDate')::date>p_day or n.data->>'migratedToNoteQueueV9223'='true' or jsonb_typeof(n.data->'items') is distinct from 'array' or exists(select 1 from jsonb_array_elements(n.data->'items') i where i->>'source'='faction_delivery_v9140') then raise exception 'note-identity-status';end if;
  select count(*) into cnt from records_lab.hlgb_records x where x.module='finance' and x.deleted_at is null and x.data->>'projectionInvoiceId'=n.entity_id;
  if cnt<>1 then raise exception 'title-count';end if;
  select * into t from records_lab.hlgb_records x where x.module='finance' and x.deleted_at is null and x.data->>'projectionInvoiceId'=n.entity_id for update;
  if t.entity_id is distinct from sel->>'titleId' or t.revision<>(sel->>'titleRevision')::bigint or t.data->>'id' is distinct from t.entity_id or t.data->>'clientId' is distinct from p_client or t.data->>'status' is distinct from n.data->>'status' then raise exception 'title-identity';end if;
  total:=records_lab.cents(n.data->'value');paid:=records_lab.cents(n.data->'paid');available:=records_lab.cents(n.data->'remaining');
  if jsonb_typeof(coalesce(n.data->'paymentHistory','[]')) is distinct from 'array' or jsonb_typeof(coalesce(n.data->'acertoReturnsV9565','[]')) is distinct from 'array' then raise exception 'history';end if;
  if exists(select 1 from jsonb_array_elements(coalesce(n.data->'paymentHistory','[]')) e where coalesce(e->>'id','')='' or e->>'globalPaymentReference9775'=p_ref or e->>'id'='global-receipt:'||p_ref||':'||n.entity_id) or exists(select 1 from jsonb_array_elements(coalesce(n.data->'paymentHistory','[]')) e group by e->>'id' having count(*)>1) or exists(select 1 from jsonb_array_elements(coalesce(n.data->'acertoReturnsV9565','[]')) e group by e->>'id' having count(*)>1 or coalesce(e->>'id','')='') then raise exception 'history-identity';end if;
  select coalesce(sum(records_lab.cents(e->'value')),0) into hist from jsonb_array_elements(coalesce(n.data->'paymentHistory','[]')) e;
  select coalesce(sum(records_lab.cents(e->'value')),0) into credit from jsonb_array_elements(coalesce(n.data->'acertoReturnsV9565','[]')) e where coalesce(e->>'reversedAt','')='';
  if paid<>hist or available<=0 or total-paid-credit<>available or records_lab.cents(t.data->'value')<>total or records_lab.cents(t.data->'paid')<>paid or records_lab.cents(t.data->'remaining')<>available or records_lab.cents(coalesce(t.data->'creditReturnsV9565','0'))<>credit then raise exception 'balance';end if;
  select count(*) into cnt from records_lab.hlgb_records x where x.module='hubFinanceEntries' and x.deleted_at is null and x.data->>'sourceType'='lab-title-forecast' and x.data->>'sourceId'=t.entity_id;
  if cnt<>1 then raise exception 'forecast-count';end if;
  select * into h from records_lab.hlgb_records x where x.module='hubFinanceEntries' and x.deleted_at is null and x.data->>'sourceType'='lab-title-forecast' and x.data->>'sourceId'=t.entity_id for update;
  if h.data->>'clientId' is distinct from p_client or h.data->>'flow' is distinct from 'Entrada' or h.data->>'status' is distinct from 'Previsto' or records_lab.cents(h.data->'value')<>available then raise exception 'forecast-balance';end if;
  applied:=least(remaining,available);if applied=0 then raise exception 'unused-selection';end if;
  next_status:=case when applied=available then 'Pago' else 'Parcial' end;
  event:=jsonb_build_object('id','global-receipt:'||p_ref||':'||n.entity_id,'value',applied::numeric/100,'method',p_method,'date',p_day,'globalPaymentReference9775',p_ref,'actorId',actor,'createdAt',ts);
  next_n:=n.data||jsonb_build_object('paymentHistory',coalesce(n.data->'paymentHistory','[]')||jsonb_build_array(event),'paid',(paid+applied)::numeric/100,'remaining',(available-applied)::numeric/100,'acertoCreditTotalV9565',credit::numeric/100,'status',next_status,'updatedAt',ts);
  next_t:=t.data||jsonb_build_object('paid',(paid+applied)::numeric/100,'remaining',(available-applied)::numeric/100,'creditReturnsV9565',credit::numeric/100,'status',next_status,'updatedAt',ts);
  next_h:=h.data||jsonb_build_object('value',(available-applied)::numeric/100,'status',case when applied=available then 'Encerrado' else 'Previsto' end,'updatedAt',ts);
  select * into ack from records_lab.hlgb_save_record(n.module,n.entity_id,next_n,n.revision,false);if ack.applied is distinct from true or ack.revision<>n.revision+1 or ack.data is distinct from next_n then raise exception 'note-ack';end if;
  select * into ack from records_lab.hlgb_save_record(t.module,t.entity_id,next_t,t.revision,false);if ack.applied is distinct from true or ack.revision<>t.revision+1 or ack.data is distinct from next_t then raise exception 'title-ack';end if;
  select * into ack from records_lab.hlgb_save_record(h.module,h.entity_id,next_h,h.revision,false);if ack.applied is distinct from true or ack.revision<>h.revision+1 or ack.data is distinct from next_h then raise exception 'forecast-ack';end if;
  allocations:=allocations||jsonb_build_array(jsonb_build_object('noteId',n.entity_id,'titleId',t.entity_id,'amountCents',applied,'remainingCents',available-applied));
  remaining:=remaining-applied;
 end loop;
 if remaining<>0 then raise exception 'unallocated-payment';end if;
 k:='receipt:'||p_ref;
 next_h:=jsonb_build_object('id',k,'sourceType','lab-global-receipt','sourceId',p_ref,'clientId',p_client,'status','Realizado','flow','Entrada','value',p_amount::numeric/100,'date',p_day,'realizedAt',p_day,'paymentMethod',p_method);
 select * into ack from records_lab.hlgb_save_record('hubFinanceEntries',k,next_h,0,false);if ack.applied is distinct from true or ack.revision<>1 or ack.data is distinct from next_h then raise exception 'hub-ack';end if;
 ans:=jsonb_build_object('reference',p_ref,'clientId',p_client,'amountCents',p_amount,'allocations',allocations,'hubId',k);
 insert into records_lab.receipts(ref,client_id,request,result,actor) values(p_ref,p_client,req,ans,actor);
 return ans;
end$$;
revoke all on function records_lab.pay(text,text,date,text,bigint,jsonb) from public;
grant execute on function records_lab.pay(text,text,date,text,bigint,jsonb) to records_lab_operator;
